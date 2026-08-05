using System.Net.Sockets;
using System.Text;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Outcome of a real HL7 v2 exchange.  <see cref="Success"/> is true only when the receiving
/// system returned an application accept (MSA-1 = AA/CA); it is never synthesized locally.
/// </summary>
public sealed record Hl7SendOutcome(
    bool Success,
    string? AckCode,
    string? AckText,
    string? RawAck,
    string? ErrorMessage);

/// <summary>
/// Minimal HL7 v2 Minimal Lower Layer Protocol client.  Frames the message with
/// VT (0x0B) &lt;payload&gt; FS (0x1C) CR (0x0D), waits for the acknowledgement frame and
/// reports the peer's MSA acknowledgement code verbatim.
/// </summary>
public static class Hl7MllpClient
{
    private const byte StartBlock = 0x0B;
    private const byte EndBlock = 0x1C;
    private const byte CarriageReturn = 0x0D;

    public static async Task<Hl7SendOutcome> SendAsync(
        string host,
        int port,
        string message,
        int timeoutSeconds = 30,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(host))
            return new(false, null, null, null, "HL7 server address is not configured");
        if (port is < 1 or > 65535)
            return new(false, null, null, null, "HL7 server port is not configured");
        if (string.IsNullOrWhiteSpace(message))
            return new(false, null, null, null, "HL7 message is empty");

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(timeoutSeconds, 1, 300)));

        try
        {
            using var tcp = new TcpClient();
            await tcp.ConnectAsync(host, port, timeout.Token);
            await using var stream = tcp.GetStream();

            var payload = Encoding.UTF8.GetBytes(message.Replace("\r\n", "\r").Replace("\n", "\r"));
            var frame = new byte[payload.Length + 3];
            frame[0] = StartBlock;
            payload.CopyTo(frame, 1);
            frame[^2] = EndBlock;
            frame[^1] = CarriageReturn;

            await stream.WriteAsync(frame, timeout.Token);
            await stream.FlushAsync(timeout.Token);

            var ack = await ReadFrameAsync(stream, timeout.Token);
            if (ack == null)
                return new(false, null, null, null, "HL7 peer closed the connection without an acknowledgement");

            var (code, text) = ParseAcknowledgement(ack);
            if (code == null)
                return new(false, null, null, ack, "HL7 acknowledgement did not contain an MSA segment");

            // AA = Application Accept, CA = Commit Accept.  Anything else is a real rejection.
            var accepted = code is "AA" or "CA";
            return new(accepted, code, text, ack,
                accepted ? null : $"HL7 peer rejected the message with {code}{(string.IsNullOrWhiteSpace(text) ? "" : $": {text}")}");
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new(false, null, null, null, $"HL7 send timed out after {timeoutSeconds} seconds");
        }
        catch (Exception ex)
        {
            return new(false, null, null, null, ex.GetBaseException().Message);
        }
    }

    /// <summary>Connects without sending, to verify a configured HL7 endpoint is reachable.</summary>
    public static async Task<Hl7SendOutcome> TestConnectionAsync(
        string host,
        int port,
        int timeoutSeconds = 10,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(host))
            return new(false, null, null, null, "HL7 server address is not configured");
        if (port is < 1 or > 65535)
            return new(false, null, null, null, "HL7 server port is not configured");

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(timeoutSeconds, 1, 120)));
        try
        {
            using var tcp = new TcpClient();
            await tcp.ConnectAsync(host, port, timeout.Token);
            return new(tcp.Connected, null, null, null, tcp.Connected ? null : "TCP connect failed");
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new(false, null, null, null, $"HL7 connect timed out after {timeoutSeconds} seconds");
        }
        catch (Exception ex)
        {
            return new(false, null, null, null, ex.GetBaseException().Message);
        }
    }

    private static async Task<string?> ReadFrameAsync(NetworkStream stream, CancellationToken cancellationToken)
    {
        var buffer = new byte[4096];
        using var received = new MemoryStream();
        var started = false;

        while (true)
        {
            var read = await stream.ReadAsync(buffer, cancellationToken);
            if (read == 0) return null;

            for (var i = 0; i < read; i++)
            {
                var current = buffer[i];
                if (!started)
                {
                    if (current == StartBlock) started = true;
                    continue;
                }
                if (current == EndBlock)
                    return Encoding.UTF8.GetString(received.ToArray());
                received.WriteByte(current);
            }

            // Guard against a peer that streams without ever closing the frame.
            if (received.Length > 1_048_576)
                return Encoding.UTF8.GetString(received.ToArray());
        }
    }

    /// <summary>Reads MSA-1 (acknowledgement code) and MSA-3 (text) from an ACK message.</summary>
    private static (string? Code, string? Text) ParseAcknowledgement(string ack)
    {
        foreach (var segment in ack.Split('\r', StringSplitOptions.RemoveEmptyEntries))
        {
            if (!segment.StartsWith("MSA", StringComparison.Ordinal)) continue;
            var fields = segment.Split('|');
            var code = fields.Length > 1 ? fields[1].Trim() : null;
            var text = fields.Length > 3 ? fields[3].Trim() : null;
            return (string.IsNullOrWhiteSpace(code) ? null : code.ToUpperInvariant(),
                string.IsNullOrWhiteSpace(text) ? null : text);
        }
        return (null, null);
    }
}
