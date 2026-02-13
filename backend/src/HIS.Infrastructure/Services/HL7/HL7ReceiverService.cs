using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HIS.Application.Services;

namespace HIS.Infrastructure.Services.HL7
{
    /// <summary>
    /// Background service that listens for HL7 messages from analyzers via TCP/MLLP
    /// </summary>
    public class HL7ReceiverService : BackgroundService
    {
        private readonly ILogger<HL7ReceiverService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly HL7Parser _parser;
        private readonly int _port;
        private TcpListener _listener;

        // MLLP framing characters
        private const byte VT = 0x0B;  // Vertical Tab - Start of message
        private const byte FS = 0x1C;  // File Separator - End of message
        private const byte CR = 0x0D;  // Carriage Return

        public HL7ReceiverService(
            ILogger<HL7ReceiverService> logger,
            IServiceProvider serviceProvider,
            IConfiguration configuration)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _parser = new HL7Parser();
            _port = configuration.GetValue<int>("HL7:ReceiverPort", 2576);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("HL7 Receiver Service starting on port {Port}", _port);

            try
            {
                _listener = new TcpListener(IPAddress.Any, _port);
                _listener.Start();
                _logger.LogInformation("HL7 TCP Listener started on port {Port}", _port);

                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        var client = await _listener.AcceptTcpClientAsync(stoppingToken);
                        _ = HandleClientAsync(client, stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error accepting client connection");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start HL7 TCP Listener on port {Port}", _port);
            }
            finally
            {
                _listener?.Stop();
                _logger.LogInformation("HL7 Receiver Service stopped");
            }
        }

        private async Task HandleClientAsync(TcpClient client, CancellationToken ct)
        {
            var remoteEndpoint = client.Client.RemoteEndPoint?.ToString() ?? "unknown";
            _logger.LogInformation("HL7 client connected from {Endpoint}", remoteEndpoint);

            try
            {
                using var stream = client.GetStream();
                var buffer = new byte[65536];
                var messageBuffer = new StringBuilder();

                while (client.Connected && !ct.IsCancellationRequested)
                {
                    var bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, ct);
                    if (bytesRead == 0) break;

                    var data = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    messageBuffer.Append(data);

                    // Check for complete MLLP message (ends with FS CR)
                    var content = messageBuffer.ToString();
                    while (content.Contains((char)FS))
                    {
                        var endIndex = content.IndexOf((char)FS);
                        var message = content.Substring(0, endIndex);

                        // Remove VT if present at start
                        if (message.Length > 0 && message[0] == (char)VT)
                            message = message.Substring(1);

                        // Process the message
                        var ack = await ProcessHL7MessageAsync(message, remoteEndpoint);

                        // Send ACK
                        var ackBytes = Encoding.UTF8.GetBytes($"{(char)VT}{ack}{(char)FS}{(char)CR}");
                        await stream.WriteAsync(ackBytes, 0, ackBytes.Length, ct);

                        // Remove processed message from buffer
                        content = content.Substring(endIndex + 1);
                        if (content.Length > 0 && content[0] == (char)CR)
                            content = content.Substring(1);
                    }
                    messageBuffer.Clear();
                    messageBuffer.Append(content);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling HL7 client {Endpoint}", remoteEndpoint);
            }
            finally
            {
                client.Close();
                _logger.LogInformation("HL7 client disconnected: {Endpoint}", remoteEndpoint);
            }
        }

        private async Task<string> ProcessHL7MessageAsync(string rawMessage, string source)
        {
            _logger.LogInformation("Received HL7 message from {Source}, length: {Length}", source, rawMessage.Length);

            try
            {
                var parsed = _parser.Parse(rawMessage);
                _logger.LogInformation("Parsed HL7 message type: {Type}", parsed.MessageType);

                // Process ORU (Lab Results)
                if (parsed.MessageType == "ORU")
                {
                    var results = _parser.ParseORU(parsed);
                    _logger.LogInformation("Parsed {Count} lab results from ORU message", results.Count);

                    // Save to database using scoped service
                    using var scope = _serviceProvider.CreateScope();
                    var lisService = scope.ServiceProvider.GetRequiredService<ILISCompleteService>();

                    // Get first analyzer or use default
                    var analyzers = await lisService.GetAnalyzersAsync(isActive: true);
                    var analyzerId = analyzers.Count > 0 ? analyzers[0].Id : Guid.Empty;

                    if (analyzerId != Guid.Empty)
                    {
                        var result = await lisService.ProcessAnalyzerResultAsync(analyzerId, rawMessage);
                        _logger.LogInformation("Processed {Count} results, matched: {Matched}",
                            result.ProcessedCount, result.MatchedCount);
                    }
                }

                // Generate ACK
                return GenerateACK(parsed, "AA", "Message accepted");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing HL7 message");
                return GenerateNACK(rawMessage, ex.Message);
            }
        }

        private string GenerateACK(HL7Message original, string ackCode, string message)
        {
            var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
            var msgId = $"ACK{DateTime.Now.Ticks}";

            // Get sending application and facility from MSH segment
            var msh = original.GetSegment("MSH");
            var sendingApp = msh?.GetField(3) ?? "ANALYZER";
            var sendingFacility = msh?.GetField(4) ?? "LAB";

            return string.Join("\r",
                $"MSH|^~\\&|HIS|HOSPITAL|{sendingApp}|{sendingFacility}|{timestamp}||ACK^{original.MessageType}|{msgId}|P|2.5",
                $"MSA|{ackCode}|{original.MessageControlId}|{message}"
            );
        }

        private string GenerateNACK(string rawMessage, string error)
        {
            var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
            var msgId = $"NACK{DateTime.Now.Ticks}";

            return string.Join("\r",
                $"MSH|^~\\&|HIS|HOSPITAL|||{timestamp}||ACK|{msgId}|P|2.5",
                $"MSA|AE||{error}"
            );
        }

        public override void Dispose()
        {
            _listener?.Stop();
            base.Dispose();
        }
    }
}
