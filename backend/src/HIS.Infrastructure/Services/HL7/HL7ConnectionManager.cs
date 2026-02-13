using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.HL7
{
    /// <summary>
    /// HL7 Connection Manager - Manages TCP connections for HL7 messaging
    /// Supports both Server mode (receive results) and Client mode (send worklists)
    /// </summary>
    public class HL7ConnectionManager : IDisposable
    {
        private readonly ILogger<HL7ConnectionManager> _logger;
        private readonly HL7Parser _parser;
        private readonly ConcurrentDictionary<Guid, HL7Connection> _connections;
        private readonly ConcurrentDictionary<Guid, TcpListener> _servers;
        private CancellationTokenSource _cts;

        // Events for external handlers
        public event EventHandler<HL7MessageReceivedEventArgs> MessageReceived;
        public event EventHandler<HL7ConnectionEventArgs> ConnectionStatusChanged;
        public event EventHandler<HL7ErrorEventArgs> ErrorOccurred;

        public HL7ConnectionManager(ILogger<HL7ConnectionManager> logger)
        {
            _logger = logger;
            _parser = new HL7Parser();
            _connections = new ConcurrentDictionary<Guid, HL7Connection>();
            _servers = new ConcurrentDictionary<Guid, TcpListener>();
            _cts = new CancellationTokenSource();
        }

        #region Server Mode (Receive Results)

        /// <summary>
        /// Start TCP server to receive HL7 messages from analyzers
        /// </summary>
        public async Task<bool> StartServerAsync(Guid analyzerId, string ipAddress, int port)
        {
            try
            {
                var endpoint = string.IsNullOrEmpty(ipAddress) || ipAddress == "0.0.0.0"
                    ? new IPEndPoint(IPAddress.Any, port)
                    : new IPEndPoint(IPAddress.Parse(ipAddress), port);

                var listener = new TcpListener(endpoint);
                listener.Start();

                if (!_servers.TryAdd(analyzerId, listener))
                {
                    listener.Stop();
                    throw new InvalidOperationException($"Server already exists for analyzer {analyzerId}");
                }

                _logger.LogInformation("HL7 Server started for analyzer {AnalyzerId} on {Endpoint}", analyzerId, endpoint);

                // Start accepting connections in background
                _ = AcceptConnectionsAsync(analyzerId, listener, _cts.Token);

                RaiseConnectionStatusChanged(analyzerId, HL7ConnectionStatus.Listening, $"Server listening on {endpoint}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start HL7 server for analyzer {AnalyzerId}", analyzerId);
                RaiseError(analyzerId, "StartServer", ex.Message);
                return false;
            }
        }

        private async Task AcceptConnectionsAsync(Guid analyzerId, TcpListener listener, CancellationToken ct)
        {
            try
            {
                while (!ct.IsCancellationRequested)
                {
                    var client = await listener.AcceptTcpClientAsync();
                    _logger.LogInformation("Client connected to analyzer {AnalyzerId} from {Endpoint}",
                        analyzerId, client.Client.RemoteEndPoint);

                    // Handle each client in a separate task
                    _ = HandleClientAsync(analyzerId, client, ct);
                }
            }
            catch (ObjectDisposedException)
            {
                // Server was stopped
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error accepting connections for analyzer {AnalyzerId}", analyzerId);
            }
        }

        private async Task HandleClientAsync(Guid analyzerId, TcpClient client, CancellationToken ct)
        {
            var connectionId = Guid.NewGuid();
            var connection = new HL7Connection
            {
                Id = connectionId,
                AnalyzerId = analyzerId,
                Client = client,
                ConnectedAt = DateTime.Now,
                Status = HL7ConnectionStatus.Connected
            };

            _connections.TryAdd(connectionId, connection);
            RaiseConnectionStatusChanged(analyzerId, HL7ConnectionStatus.Connected,
                $"Client connected: {client.Client.RemoteEndPoint}");

            try
            {
                var stream = client.GetStream();
                var buffer = new byte[8192];
                var messageBuffer = new StringBuilder();

                while (!ct.IsCancellationRequested && client.Connected)
                {
                    var bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, ct);
                    if (bytesRead == 0) break;

                    var data = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    messageBuffer.Append(data);

                    // Check for complete MLLP message (ends with 0x1C 0x0D)
                    var fullMessage = messageBuffer.ToString();
                    while (fullMessage.Contains("\x1C\x0D") || fullMessage.Contains("\x1C"))
                    {
                        var endIndex = fullMessage.IndexOf("\x1C\x0D");
                        if (endIndex == -1) endIndex = fullMessage.IndexOf("\x1C");
                        if (endIndex == -1) break;

                        var messageEnd = fullMessage.IndexOf("\x1C\x0D") >= 0 ? endIndex + 2 : endIndex + 1;
                        var rawMessage = fullMessage.Substring(0, messageEnd);
                        messageBuffer.Remove(0, messageEnd);
                        fullMessage = messageBuffer.ToString();

                        // Process the message
                        await ProcessReceivedMessageAsync(analyzerId, connectionId, rawMessage, stream);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling client for analyzer {AnalyzerId}", analyzerId);
                RaiseError(analyzerId, "HandleClient", ex.Message);
            }
            finally
            {
                connection.Status = HL7ConnectionStatus.Disconnected;
                connection.DisconnectedAt = DateTime.Now;
                _connections.TryRemove(connectionId, out _);
                client.Dispose();

                RaiseConnectionStatusChanged(analyzerId, HL7ConnectionStatus.Disconnected, "Client disconnected");
            }
        }

        private async Task ProcessReceivedMessageAsync(Guid analyzerId, Guid connectionId, string rawMessage, NetworkStream stream)
        {
            try
            {
                var message = _parser.Parse(rawMessage);
                _logger.LogInformation("Received HL7 message from analyzer {AnalyzerId}: {MessageType}^{Trigger}",
                    analyzerId, message.MessageType, message.MessageTrigger);

                // Raise event for external handling
                var eventArgs = new HL7MessageReceivedEventArgs
                {
                    AnalyzerId = analyzerId,
                    ConnectionId = connectionId,
                    RawMessage = rawMessage,
                    ParsedMessage = message,
                    ReceivedAt = DateTime.Now
                };

                // Parse results if ORU message
                if (message.MessageType == "ORU")
                {
                    eventArgs.LabResults = _parser.ParseORU(message);
                }

                MessageReceived?.Invoke(this, eventArgs);

                // Send ACK response
                var ackCode = eventArgs.ProcessingError == null ? "AA" : "AE";
                var ackMessage = _parser.BuildACK(message, ackCode, eventArgs.ProcessingError);
                var ackWithMLLP = _parser.WrapMLLP(ackMessage);

                var ackBytes = Encoding.UTF8.GetBytes(ackWithMLLP);
                await stream.WriteAsync(ackBytes, 0, ackBytes.Length);
                await stream.FlushAsync();

                _logger.LogInformation("Sent ACK ({AckCode}) for message {MessageControlId}", ackCode, message.MessageControlId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing received message from analyzer {AnalyzerId}", analyzerId);
                RaiseError(analyzerId, "ProcessMessage", ex.Message);

                // Try to send negative ACK
                try
                {
                    var nackMessage = $"MSH|^~\\&|||||||ACK||P|2.5\rMSA|AR||{ex.Message}\r";
                    var nackWithMLLP = _parser.WrapMLLP(nackMessage);
                    var nackBytes = Encoding.UTF8.GetBytes(nackWithMLLP);
                    await stream.WriteAsync(nackBytes, 0, nackBytes.Length);
                }
                catch { }
            }
        }

        /// <summary>
        /// Stop TCP server for analyzer
        /// </summary>
        public bool StopServer(Guid analyzerId)
        {
            if (_servers.TryRemove(analyzerId, out var listener))
            {
                listener.Stop();
                _logger.LogInformation("HL7 Server stopped for analyzer {AnalyzerId}", analyzerId);
                RaiseConnectionStatusChanged(analyzerId, HL7ConnectionStatus.Stopped, "Server stopped");
                return true;
            }
            return false;
        }

        #endregion

        #region Client Mode (Send Worklists)

        /// <summary>
        /// Connect to HL7 server (analyzer or LIS) as client
        /// </summary>
        public async Task<Guid> ConnectAsClientAsync(Guid analyzerId, string host, int port, int timeoutMs = 5000)
        {
            try
            {
                var client = new TcpClient();

                using var cts = new CancellationTokenSource(timeoutMs);
                await client.ConnectAsync(host, port).WaitAsync(cts.Token);

                var connectionId = Guid.NewGuid();
                var connection = new HL7Connection
                {
                    Id = connectionId,
                    AnalyzerId = analyzerId,
                    Client = client,
                    ConnectedAt = DateTime.Now,
                    Status = HL7ConnectionStatus.Connected,
                    Host = host,
                    Port = port
                };

                _connections.TryAdd(connectionId, connection);
                _logger.LogInformation("Connected to HL7 server {Host}:{Port} for analyzer {AnalyzerId}",
                    host, port, analyzerId);

                RaiseConnectionStatusChanged(analyzerId, HL7ConnectionStatus.Connected, $"Connected to {host}:{port}");

                // Start listening for responses
                _ = ListenForResponsesAsync(connection, _cts.Token);

                return connectionId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to HL7 server {Host}:{Port}", host, port);
                RaiseError(analyzerId, "Connect", ex.Message);
                throw;
            }
        }

        private async Task ListenForResponsesAsync(HL7Connection connection, CancellationToken ct)
        {
            try
            {
                var stream = connection.Client.GetStream();
                var buffer = new byte[8192];
                var messageBuffer = new StringBuilder();

                while (!ct.IsCancellationRequested && connection.Client.Connected)
                {
                    if (!stream.DataAvailable)
                    {
                        await Task.Delay(100, ct);
                        continue;
                    }

                    var bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, ct);
                    if (bytesRead == 0) break;

                    var data = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    messageBuffer.Append(data);

                    // Process complete messages
                    var fullMessage = messageBuffer.ToString();
                    while (fullMessage.Contains("\x1C"))
                    {
                        var endIndex = fullMessage.IndexOf("\x1C");
                        var messageEnd = fullMessage.Length > endIndex + 1 && fullMessage[endIndex + 1] == '\x0D'
                            ? endIndex + 2
                            : endIndex + 1;

                        var rawMessage = fullMessage.Substring(0, messageEnd);
                        messageBuffer.Remove(0, messageEnd);
                        fullMessage = messageBuffer.ToString();

                        // Process response
                        await ProcessResponseAsync(connection, rawMessage);
                    }
                }
            }
            catch (OperationCanceledException) { }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listening for responses from {Host}:{Port}",
                    connection.Host, connection.Port);
            }
        }

        private async Task ProcessResponseAsync(HL7Connection connection, string rawMessage)
        {
            try
            {
                var message = _parser.Parse(rawMessage);
                _logger.LogInformation("Received response from {Host}:{Port}: {MessageType}",
                    connection.Host, connection.Port, message.MessageType);

                // Store response for awaiting requests
                if (connection.PendingRequests.TryGetValue(message.MessageControlId, out var tcs))
                {
                    tcs.TrySetResult(message);
                    connection.PendingRequests.TryRemove(message.MessageControlId, out _);
                }

                // Also raise event for external handling
                MessageReceived?.Invoke(this, new HL7MessageReceivedEventArgs
                {
                    AnalyzerId = connection.AnalyzerId,
                    ConnectionId = connection.Id,
                    RawMessage = rawMessage,
                    ParsedMessage = message,
                    ReceivedAt = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing response");
            }
        }

        /// <summary>
        /// Send HL7 message and wait for ACK
        /// </summary>
        public async Task<HL7Message> SendMessageAsync(Guid connectionId, string message, int timeoutMs = 30000)
        {
            if (!_connections.TryGetValue(connectionId, out var connection))
                throw new InvalidOperationException($"Connection {connectionId} not found");

            if (!connection.Client.Connected)
                throw new InvalidOperationException("Connection is not active");

            try
            {
                var wrappedMessage = _parser.WrapMLLP(message);
                var parsedOutgoing = _parser.Parse(message);
                var messageControlId = parsedOutgoing.MessageControlId;

                // Setup response waiter
                var tcs = new TaskCompletionSource<HL7Message>();
                connection.PendingRequests.TryAdd(messageControlId, tcs);

                // Send message
                var stream = connection.Client.GetStream();
                var bytes = Encoding.UTF8.GetBytes(wrappedMessage);
                await stream.WriteAsync(bytes, 0, bytes.Length);
                await stream.FlushAsync();

                connection.LastMessageSentAt = DateTime.Now;
                _logger.LogInformation("Sent HL7 message {MessageControlId} to {Host}:{Port}",
                    messageControlId, connection.Host, connection.Port);

                // Wait for response with timeout
                using var cts = new CancellationTokenSource(timeoutMs);
                cts.Token.Register(() => tcs.TrySetCanceled());

                return await tcs.Task;
            }
            catch (TaskCanceledException)
            {
                throw new TimeoutException($"No response received within {timeoutMs}ms");
            }
        }

        /// <summary>
        /// Send worklist to analyzer
        /// </summary>
        public async Task<HL7Message> SendWorklistAsync(Guid connectionId, HL7WorklistRequest request)
        {
            var message = _parser.BuildORM(request);
            return await SendMessageAsync(connectionId, message);
        }

        /// <summary>
        /// Disconnect client connection
        /// </summary>
        public bool Disconnect(Guid connectionId)
        {
            if (_connections.TryRemove(connectionId, out var connection))
            {
                connection.Client?.Dispose();
                connection.Status = HL7ConnectionStatus.Disconnected;
                connection.DisconnectedAt = DateTime.Now;

                RaiseConnectionStatusChanged(connection.AnalyzerId, HL7ConnectionStatus.Disconnected, "Disconnected");
                return true;
            }
            return false;
        }

        #endregion

        #region Status & Utilities

        /// <summary>
        /// Get connection status for analyzer
        /// </summary>
        public HL7ConnectionStatusInfo GetConnectionStatus(Guid analyzerId)
        {
            var serverRunning = _servers.ContainsKey(analyzerId);
            var activeConnections = new List<HL7ConnectionInfo>();

            foreach (var conn in _connections.Values)
            {
                if (conn.AnalyzerId == analyzerId)
                {
                    activeConnections.Add(new HL7ConnectionInfo
                    {
                        ConnectionId = conn.Id,
                        Status = conn.Status,
                        Host = conn.Host,
                        Port = conn.Port,
                        ConnectedAt = conn.ConnectedAt,
                        LastMessageAt = conn.LastMessageReceivedAt ?? conn.LastMessageSentAt
                    });
                }
            }

            return new HL7ConnectionStatusInfo
            {
                AnalyzerId = analyzerId,
                ServerRunning = serverRunning,
                ActiveConnections = activeConnections,
                Status = serverRunning || activeConnections.Count > 0
                    ? HL7ConnectionStatus.Connected
                    : HL7ConnectionStatus.Disconnected
            };
        }

        /// <summary>
        /// Test connection to HL7 server
        /// </summary>
        public async Task<bool> TestConnectionAsync(string host, int port, int timeoutMs = 5000)
        {
            try
            {
                using var client = new TcpClient();
                using var cts = new CancellationTokenSource(timeoutMs);
                await client.ConnectAsync(host, port).WaitAsync(cts.Token);
                return true;
            }
            catch
            {
                return false;
            }
        }

        #endregion

        #region Event Helpers

        private void RaiseConnectionStatusChanged(Guid analyzerId, HL7ConnectionStatus status, string message)
        {
            ConnectionStatusChanged?.Invoke(this, new HL7ConnectionEventArgs
            {
                AnalyzerId = analyzerId,
                Status = status,
                Message = message,
                Timestamp = DateTime.Now
            });
        }

        private void RaiseError(Guid analyzerId, string operation, string errorMessage)
        {
            ErrorOccurred?.Invoke(this, new HL7ErrorEventArgs
            {
                AnalyzerId = analyzerId,
                Operation = operation,
                ErrorMessage = errorMessage,
                Timestamp = DateTime.Now
            });
        }

        #endregion

        public void Dispose()
        {
            _cts?.Cancel();

            foreach (var server in _servers.Values)
            {
                try { server.Stop(); } catch { }
            }
            _servers.Clear();

            foreach (var conn in _connections.Values)
            {
                try { conn.Client?.Dispose(); } catch { }
            }
            _connections.Clear();

            _cts?.Dispose();
        }
    }

    #region Supporting Classes

    public class HL7Connection
    {
        public Guid Id { get; set; }
        public Guid AnalyzerId { get; set; }
        public TcpClient Client { get; set; }
        public HL7ConnectionStatus Status { get; set; }
        public string Host { get; set; }
        public int Port { get; set; }
        public DateTime ConnectedAt { get; set; }
        public DateTime? DisconnectedAt { get; set; }
        public DateTime? LastMessageSentAt { get; set; }
        public DateTime? LastMessageReceivedAt { get; set; }
        public ConcurrentDictionary<string, TaskCompletionSource<HL7Message>> PendingRequests { get; }
            = new ConcurrentDictionary<string, TaskCompletionSource<HL7Message>>();
    }

    public enum HL7ConnectionStatus
    {
        Disconnected,
        Connecting,
        Connected,
        Listening,
        Error,
        Stopped
    }

    public class HL7MessageReceivedEventArgs : EventArgs
    {
        public Guid AnalyzerId { get; set; }
        public Guid ConnectionId { get; set; }
        public string RawMessage { get; set; }
        public HL7Message ParsedMessage { get; set; }
        public List<HL7LabResult> LabResults { get; set; }
        public DateTime ReceivedAt { get; set; }
        public string ProcessingError { get; set; }
    }

    public class HL7ConnectionEventArgs : EventArgs
    {
        public Guid AnalyzerId { get; set; }
        public HL7ConnectionStatus Status { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class HL7ErrorEventArgs : EventArgs
    {
        public Guid AnalyzerId { get; set; }
        public string Operation { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class HL7ConnectionStatusInfo
    {
        public Guid AnalyzerId { get; set; }
        public HL7ConnectionStatus Status { get; set; }
        public bool ServerRunning { get; set; }
        public List<HL7ConnectionInfo> ActiveConnections { get; set; }
    }

    public class HL7ConnectionInfo
    {
        public Guid ConnectionId { get; set; }
        public HL7ConnectionStatus Status { get; set; }
        public string Host { get; set; }
        public int Port { get; set; }
        public DateTime ConnectedAt { get; set; }
        public DateTime? LastMessageAt { get; set; }
    }

    #endregion
}
