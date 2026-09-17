using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

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
        private readonly bool _enabled;
        private readonly int _port;
        // QA-R10: cap on one (incomplete) MLLP frame per connection; exceeded → connection dropped.
        private readonly int _maxMessageBytes;
        // QA-R10: optional source allow-lists. Empty list + flag off = accept any source (old behaviour).
        private readonly HashSet<string> _allowedSourceIps;
        private readonly bool _requireKnownAnalyzerIp;
        private TcpListener _listener;

        /// <summary>Hl7MessageQueues.Status for inbound ORU messages that could not be tied to an analyzer.</summary>
        public const string UnroutedStatus = "unrouted";

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
            _enabled = configuration.GetValue<bool>("HL7:Enabled", true);
            _port = configuration.GetValue<int>("HL7:ReceiverPort", 2576);
            _maxMessageBytes = Math.Max(1024, configuration.GetValue<int>("HL7:MaxMessageBytes", 1024 * 1024));
            _requireKnownAnalyzerIp = configuration.GetValue<bool>("HL7:RequireKnownAnalyzerIp", false);

            // HL7:AllowedSourceIps accepts a JSON array or a comma/semicolon separated string (env var friendly).
            var ipSection = configuration.GetSection("HL7:AllowedSourceIps");
            var ipValues = ipSection.GetChildren().Select(c => c.Value).ToList();
            if (ipValues.Count == 0 && !string.IsNullOrWhiteSpace(ipSection.Value))
                ipValues = ipSection.Value.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries).Select(v => (string?)v).ToList();
            _allowedSourceIps = new HashSet<string>(
                ipValues.Where(v => !string.IsNullOrWhiteSpace(v)).Select(v => v!.Trim()),
                StringComparer.OrdinalIgnoreCase);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_enabled)
            {
                _logger.LogInformation("HL7 Receiver Service is disabled by configuration");
                return;
            }

            _logger.LogInformation("HL7 Receiver Service starting on port {Port}", _port);
            await WarnUnroutableAnalyzersAsync();

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
            var remoteIp = NormalizeIp((client.Client.RemoteEndPoint as IPEndPoint)?.Address);
            _logger.LogInformation("HL7 client connected from {Endpoint}", remoteEndpoint);

            try
            {
                if (!await IsSourceAllowedAsync(remoteIp))
                {
                    _logger.LogWarning("HL7 connection from {Endpoint} rejected — source IP is not in the allow-list", remoteEndpoint);
                    return;
                }

                using var stream = client.GetStream();
                var buffer = new byte[65536];
                // QA-R10: keep raw bytes until a whole MLLP frame (VT … FS CR) has arrived. Decoding each TCP
                // chunk separately corrupted any multi-byte UTF-8 character (Vietnamese names) split across reads.
                // Scanning bytes for FS is safe: 0x1C never occurs inside a multi-byte UTF-8 sequence.
                using var pending = new MemoryStream();

                while (client.Connected && !ct.IsCancellationRequested)
                {
                    var bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, ct);
                    if (bytesRead == 0) break;

                    pending.Write(buffer, 0, bytesRead);
                    var data = pending.GetBuffer();
                    var length = (int)pending.Length;
                    var start = 0;
                    int fsIndex;
                    while ((fsIndex = Array.IndexOf(data, FS, start, length - start)) >= 0)
                    {
                        var (bodyStart, bodyLength) = GetFrameBody(data, start, fsIndex);
                        start = fsIndex + 1;
                        if (start < length && data[start] == CR) start++;

                        if (bodyLength > _maxMessageBytes)
                        {
                            _logger.LogWarning("HL7 frame from {Endpoint} is {Size} bytes (limit {Limit}) — dropping connection",
                                remoteEndpoint, bodyLength, _maxMessageBytes);
                            return;
                        }
                        if (bodyLength == 0) continue;

                        var message = Encoding.UTF8.GetString(data, bodyStart, bodyLength);
                        var ack = await ProcessHL7MessageAsync(message, remoteEndpoint, remoteIp);

                        var ackBytes = Encoding.UTF8.GetBytes($"{(char)VT}{ack}{(char)FS}{(char)CR}");
                        await stream.WriteAsync(ackBytes, 0, ackBytes.Length, ct);
                    }

                    // Keep only the unfinished tail of the buffer.
                    var remaining = length - start;
                    if (remaining > _maxMessageBytes)
                    {
                        _logger.LogWarning("HL7 client {Endpoint} sent {Size} bytes without a frame end (limit {Limit}) — dropping connection",
                            remoteEndpoint, remaining, _maxMessageBytes);
                        return;
                    }
                    if (start > 0)
                    {
                        Buffer.BlockCopy(data, start, data, 0, remaining);
                        pending.SetLength(remaining);
                        pending.Position = remaining;
                    }
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

        /// <summary>
        /// Body of one MLLP frame ending at <paramref name="fsIndex"/>: starts after the first VT (bytes before it —
        /// e.g. the CR of the previous frame that arrived in a later read — are noise); without a VT, leading
        /// CR/LF are skipped.
        /// </summary>
        internal static (int Start, int Length) GetFrameBody(byte[] data, int start, int fsIndex)
        {
            var vtIndex = Array.IndexOf(data, VT, start, fsIndex - start);
            var bodyStart = vtIndex >= 0 ? vtIndex + 1 : start;
            if (vtIndex < 0)
                while (bodyStart < fsIndex && (data[bodyStart] == CR || data[bodyStart] == 0x0A)) bodyStart++;
            return (bodyStart, fsIndex - bodyStart);
        }

        internal static IPAddress? NormalizeIp(IPAddress? ip) =>
            ip != null && ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4() : ip;

        /// <summary>True when a configured address (IP or "localhost") denotes <paramref name="remote"/>.</summary>
        internal static bool IpMatches(string? configured, IPAddress? remote)
        {
            if (remote == null || string.IsNullOrWhiteSpace(configured)) return false;
            var value = configured.Trim();
            if (value.Equals("localhost", StringComparison.OrdinalIgnoreCase)) return IPAddress.IsLoopback(remote);
            return IPAddress.TryParse(value, out var ip) && NormalizeIp(ip)!.Equals(remote);
        }

        /// <summary>
        /// With 2+ active analyzers a message is routed by MSH-3/MSH-4 or source IP only (no "first analyzer"
        /// fallback) — warn at startup so a site upgrading from the old behaviour aligns codes/IPs.
        /// </summary>
        private async Task WarnUnroutableAnalyzersAsync()
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var lisService = scope.ServiceProvider.GetRequiredService<ILISCompleteService>();
                var active = await lisService.GetAnalyzersAsync(isActive: true);
                if (active.Count < 2) return;
                var noIp = active.Where(a => string.IsNullOrWhiteSpace(a.IpAddress)).Select(a => a.Code).ToList();
                if (noIp.Count > 0)
                    _logger.LogWarning(
                        "HL7: {Count} active analyzers; {NoIp} have no IP ({Codes}). Results are routed by MSH-3/MSH-4 = analyzer Code/Name/Model/Serial or by source IP — unmatched messages are parked as 'unrouted'.",
                        active.Count, noIp.Count, string.Join(", ", noIp.Take(10)));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "HL7: could not check analyzer routing configuration");
            }
        }

        private async Task<bool> IsSourceAllowedAsync(IPAddress? remoteIp)
        {
            if (_allowedSourceIps.Count > 0 && !_allowedSourceIps.Any(ip => IpMatches(ip, remoteIp)))
                return false;
            if (!_requireKnownAnalyzerIp) return true;

            using var scope = _serviceProvider.CreateScope();
            var lisService = scope.ServiceProvider.GetRequiredService<ILISCompleteService>();
            var analyzers = await lisService.GetAnalyzersAsync(isActive: true);
            return analyzers.Any(a => IpMatches(a.IpAddress, remoteIp));
        }

        /// <summary>
        /// QA-R10: pick the analyzer that SENT the message. Before, every result was booked on the first active
        /// analyzer (alphabetical), whatever device sent it.
        /// Order: MSH-3 / MSH-4 (full value or first component) = Code / Name / Model / SerialNumber;
        /// several hits → narrow by source IP; no hit → a single analyzer at the source IP;
        /// still nothing → the only active analyzer (legacy fallback, <c>IsFallback</c>) or an error.
        /// </summary>
        internal static (LabAnalyzerDto? Analyzer, string? Error, bool IsFallback) ResolveAnalyzer(
            IReadOnlyList<LabAnalyzerDto> active, string? sendingApp, string? sendingFacility, IPAddress? remoteIp)
        {
            if (active.Count == 0) return (null, "No active analyzer configured", false);

            static string? FirstComponent(string? v) => v?.Split('^')[0];
            var keys = new[] { sendingApp, FirstComponent(sendingApp), sendingFacility, FirstComponent(sendingFacility) }
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .Select(k => k!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            static bool Eq(string? a, string b) => !string.IsNullOrWhiteSpace(a) && a.Trim().Equals(b, StringComparison.OrdinalIgnoreCase);

            var matches = active
                .Where(a => keys.Any(k => Eq(a.Code, k) || Eq(a.Name, k) || Eq(a.Model, k) || Eq(a.SerialNumber, k)))
                .ToList();
            if (matches.Count > 1)
            {
                var byIp = matches.Where(a => IpMatches(a.IpAddress, remoteIp)).ToList();
                if (byIp.Count > 0) matches = byIp;
            }
            if (matches.Count == 1) return (matches[0], null, false);
            if (matches.Count > 1)
                return (null, $"MSH-3/MSH-4 '{sendingApp}'/'{sendingFacility}' matches {matches.Count} active analyzers - duplicate analyzer codes", false);

            var atIp = active.Where(a => IpMatches(a.IpAddress, remoteIp)).ToList();
            if (atIp.Count == 1) return (atIp[0], null, false);

            if (active.Count == 1) return (active[0], null, true);
            return (null, $"Unknown sender MSH-3/MSH-4 '{sendingApp}'/'{sendingFacility}' - no active analyzer matches", false);
        }

        private async Task<string> ProcessHL7MessageAsync(string rawMessage, string source, IPAddress? remoteIp)
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

                    var analyzers = await lisService.GetAnalyzersAsync(isActive: true);
                    var msh = parsed.GetSegment("MSH");
                    var sendingApp = msh?.GetField(3);
                    var sendingFacility = msh?.GetField(4);
                    var (analyzer, error, isFallback) = ResolveAnalyzer(analyzers, sendingApp, sendingFacility, remoteIp);

                    if (analyzer == null)
                    {
                        // Nothing stored the results in the inbox: an AA here would tell the analyzer to drop them.
                        _logger.LogWarning("HL7 ORU {ControlId} from {Source} rejected — {Error}", parsed.MessageControlId, source, error);
                        if (analyzers.Count > 0)
                            await StoreUnroutedAsync(scope.ServiceProvider, parsed, rawMessage, source, error!);
                        return GenerateACK(parsed, "AE", error!);
                    }
                    if (isFallback)
                        _logger.LogWarning("HL7 ORU from {Source}: MSH-3/MSH-4 '{App}'/'{Facility}' match no analyzer — booked on the only active analyzer {Code}",
                            source, sendingApp, sendingFacility, analyzer.Code);

                    if (_requireKnownAnalyzerIp && !string.IsNullOrWhiteSpace(analyzer.IpAddress) && !IpMatches(analyzer.IpAddress, remoteIp))
                    {
                        _logger.LogWarning("HL7 ORU from {Source} claims analyzer {Code} registered at {Ip} — rejected", source, analyzer.Code, analyzer.IpAddress);
                        return GenerateACK(parsed, "AR", $"Source address does not match analyzer {analyzer.Code}");
                    }

                    var result = await lisService.ProcessAnalyzerResultAsync(analyzer.Id, rawMessage);
                    _logger.LogInformation("Processed {Count} results for analyzer {Code}, matched: {Matched}",
                        result.ProcessedCount, analyzer.Code, result.MatchedCount);

                    // ProcessAnalyzerResultAsync swallows its own exceptions (nothing saved, Errors filled).
                    if (result.ProcessedCount == 0 && result.Errors.Count > 0)
                        return GenerateACK(parsed, "AE", string.Join("; ", result.Errors));
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

        /// <summary>
        /// Keep an ORU that no analyzer claims so it can be mapped by hand (LabRawResults needs an analyzer id,
        /// so it goes to the HL7 message queue as inbound / status "unrouted"). Failure here must not hide the NACK.
        /// </summary>
        private async Task StoreUnroutedAsync(IServiceProvider services, HL7Message parsed, string rawMessage, string source, string reason)
        {
            try
            {
                static string Cut(string? v, int max) => string.IsNullOrEmpty(v) ? string.Empty : (v.Length > max ? v[..max] : v);
                var db = services.GetRequiredService<HISDbContext>();
                db.Hl7MessageQueues.Add(new Hl7MessageQueue
                {
                    Id = Guid.NewGuid(),
                    Direction = "inbound",
                    SourceSystem = "LIS",
                    TargetSystem = "HIS",
                    MessageType = Cut(string.IsNullOrEmpty(parsed.MessageTrigger) ? parsed.MessageType : $"{parsed.MessageType}^{parsed.MessageTrigger}", 20),
                    MessageControlId = Cut(parsed.MessageControlId, 100),
                    Payload = rawMessage,
                    Status = UnroutedStatus,
                    RetryCount = 0,
                    MaxRetries = 0,
                    ErrorMessage = reason,
                    Endpoint = Cut(source, 500),
                    CreatedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not store unrouted HL7 message {ControlId} from {Source}", parsed.MessageControlId, source);
            }
        }

        /// <summary>MSA-3 is free text: strip HL7 delimiters so an error message cannot break the ACK.</summary>
        private static string SanitizeAckText(string text) =>
            new string(text.Select(c => c is '|' or '^' or '~' or '&' or '\\' or '\r' or '\n' ? ' ' : c).ToArray());

        private string GenerateACK(HL7Message original, string ackCode, string message)
        {
            message = SanitizeAckText(message ?? string.Empty);
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
            error = SanitizeAckText(error ?? string.Empty);

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
