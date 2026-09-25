using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HIS.Application.DTOs.NangCap24;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace HIS.Infrastructure.Services;

public class Hl7QueueService : IHl7QueueService
{
    private readonly HISDbContext _db;
    private readonly ILogger<Hl7QueueService> _logger;
    private readonly ILISCompleteService _lis;

    /// <summary>Hl7MessageQueues.Status after an unrouted ORU was assigned to an analyzer and processed.</summary>
    public const string ProcessedStatus = "processed";
    private const string UnroutedStatus = "unrouted";
    private const string ProcessingStatus = "processing";

    public Hl7QueueService(HISDbContext db, ILogger<Hl7QueueService> logger, ILISCompleteService lis)
    {
        _db = db;
        _logger = logger;
        _lis = lis;
    }

    public async Task<Hl7MessageQueueDto> AssignAnalyzerAsync(Guid id, Guid analyzerId, Guid userId)
    {
        var msg = await _db.Hl7MessageQueues.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id)
            ?? throw new KeyNotFoundException("Bản tin HL7 không tồn tại");
        if (msg.Direction != "inbound" || msg.Status != UnroutedStatus)
            throw new InvalidOperationException("Chỉ gán máy XN cho bản tin nhận vào đang ở trạng thái \"Chưa gán máy XN\"");
        var analyzer = await _db.LabAnalyzers.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == analyzerId && !a.IsDeleted && a.IsActive)
            ?? throw new InvalidOperationException("Máy xét nghiệm không tồn tại hoặc đã ngừng hoạt động");

        // Atomic claim: a double click / second user must not book the same results twice.
        var claimed = await _db.Hl7MessageQueues
            .Where(m => m.Id == id && m.Status == UnroutedStatus)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.Status, ProcessingStatus));
        if (claimed == 0)
            throw new InvalidOperationException("Bản tin đang được người khác xử lý hoặc đã được gán");

        ProcessAnalyzerResultDto result;
        try
        {
            result = await _lis.ProcessAnalyzerResultAsync(analyzer.Id, msg.Payload);
        }
        catch
        {
            await ReleaseClaimAsync(id);
            throw;
        }
        var errors = result.Errors ?? new List<string>();
        if (result.ProcessedCount == 0 && errors.Count > 0)
        {
            await ReleaseClaimAsync(id);
            throw new InvalidOperationException("Không xử lý được bản tin: " + string.Join("; ", errors));
        }

        var entity = await _db.Hl7MessageQueues.FirstAsync(m => m.Id == id);
        entity.Status = ProcessedStatus;
        entity.RelatedRecordId = analyzer.Id;
        entity.AckedAt = DateTime.UtcNow;
        entity.AckMessage = $"Gán máy {analyzer.Code}: {result.ProcessedCount} kết quả, khớp {result.MatchedCount}, chưa khớp {result.UnmatchedCount}"
            + (errors.Count > 0 ? $" · Lỗi: {string.Join("; ", errors)}" : "");
        entity.ErrorMessage = null;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        _logger.LogInformation("HL7 message {Id} assigned to analyzer {Code} by {User}", id, analyzer.Code, userId);
        return MapToDto(entity);
    }

    private Task ReleaseClaimAsync(Guid id) => _db.Hl7MessageQueues
        .Where(m => m.Id == id && m.Status == ProcessingStatus)
        .ExecuteUpdateAsync(s => s.SetProperty(m => m.Status, UnroutedStatus));

    public async Task<Hl7MessageQueueDto> EnqueueAsync(string direction, string source, string target,
        string messageType, string controlId, string payload, string? endpoint, Guid? relatedRecordId)
    {
        var msg = new Hl7MessageQueue
        {
            Id = Guid.NewGuid(),
            Direction = direction,
            SourceSystem = source,
            TargetSystem = target,
            MessageType = messageType,
            MessageControlId = controlId,
            Payload = payload,
            Status = "pending",
            Endpoint = endpoint,
            RelatedRecordId = relatedRecordId,
            CreatedAt = DateTime.UtcNow
        };
        _db.Hl7MessageQueues.Add(msg);
        await _db.SaveChangesAsync();
        return MapToDto(msg);
    }

    public async Task<Hl7QueueSearchResultDto> SearchAsync(Hl7QueueSearchDto dto)
    {
        var q = _db.Hl7MessageQueues.AsQueryable();
        if (!string.IsNullOrWhiteSpace(dto.Status)) q = q.Where(m => m.Status == dto.Status);
        if (!string.IsNullOrWhiteSpace(dto.Direction)) q = q.Where(m => m.Direction == dto.Direction);
        if (!string.IsNullOrWhiteSpace(dto.SourceSystem)) q = q.Where(m => m.SourceSystem == dto.SourceSystem);
        if (!string.IsNullOrWhiteSpace(dto.MessageType)) q = q.Where(m => m.MessageType == dto.MessageType);
        if (dto.FromDate.HasValue) q = q.Where(m => m.CreatedAt >= dto.FromDate.Value);
        if (dto.ToDate.HasValue) q = q.Where(m => m.CreatedAt <= dto.ToDate.Value.AddDays(1));

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(m => m.CreatedAt)
            .Skip(Math.Max(0, dto.PageIndex - 1) * dto.PageSize).Take(dto.PageSize)
            .ToListAsync();

        var statusCounts = await _db.Hl7MessageQueues
            .GroupBy(m => m.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        return new Hl7QueueSearchResultDto
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = total,
            PendingCount = statusCounts.FirstOrDefault(s => s.Status == "pending")?.Count ?? 0,
            FailedCount = statusCounts.FirstOrDefault(s => s.Status == "failed")?.Count ?? 0,
            AckedCount = statusCounts.FirstOrDefault(s => s.Status == "acked")?.Count ?? 0
        };
    }

    public async Task<Hl7MessageQueueDto?> GetByIdAsync(Guid id)
    {
        var msg = await _db.Hl7MessageQueues.FirstOrDefaultAsync(m => m.Id == id);
        if (msg == null) return null;
        var dto = MapToDto(msg);
        dto.Payload = msg.Payload;       // include payload trong detail
        return dto;
    }

    public async Task<Hl7MessageQueueDto> RetryAsync(Guid id, Guid userId)
    {
        var msg = await _db.Hl7MessageQueues.FirstOrDefaultAsync(m => m.Id == id);
        if (msg == null) throw new KeyNotFoundException("Message không tồn tại");
        if (msg.Status == "acked") throw new InvalidOperationException("Message đã ACK, không cần retry");
        // QA-R10: inbound messages (e.g. unrouted analyzer ORU) are not ours to (re)send.
        if (msg.Direction == "inbound") throw new InvalidOperationException("Bản tin nhận vào không gửi lại được — cần gán máy xét nghiệm và xử lý thủ công");

        msg.Status = "retrying";
        msg.RetryCount++;
        msg.LastTryAt = DateTime.UtcNow;
        msg.UpdatedAt = DateTime.UtcNow;
        msg.UpdatedBy = userId.ToString();

        var outcome = await TryDeliverAsync(msg);
        ApplyOutcome(msg, outcome, DateTime.UtcNow);
        await _db.SaveChangesAsync();
        return MapToDto(msg);
    }

    /// <summary>
    /// QA-R11: record the REAL delivery result. "acked" only when the peer answered MSA AA/CA; a missing /
    /// unparsable endpoint fails at once with a clear message (retrying cannot fix configuration); network
    /// errors and peer rejections back off until MaxRetries.
    /// </summary>
    private static void ApplyOutcome(Hl7MessageQueue msg, Hl7SendOutcome outcome, DateTime now)
    {
        if (outcome.Success)
        {
            msg.Status = "acked";
            msg.AckedAt = now;
            msg.AckMessage = outcome.RawAck;
            msg.ErrorMessage = null;
            msg.NextRetryAt = null;
            return;
        }
        msg.ErrorMessage = outcome.ErrorMessage;
        if (outcome.AckCode == null && outcome.RawAck == null && IsConfigError(outcome))
        {
            msg.Status = "failed";
            msg.NextRetryAt = null;
        }
        else if (msg.RetryCount >= msg.MaxRetries)
        {
            msg.Status = "failed";
            msg.ErrorMessage = $"{outcome.ErrorMessage} — đã thử {msg.RetryCount}/{msg.MaxRetries} lần";
            msg.NextRetryAt = null;
        }
        else
        {
            msg.Status = "pending";
            msg.NextRetryAt = now.AddMinutes(Math.Pow(2, msg.RetryCount));
        }
    }

    private const string NotConfiguredPrefix = "Chưa cấu hình";
    private static bool IsConfigError(Hl7SendOutcome o) =>
        o.ErrorMessage != null && o.ErrorMessage.StartsWith(NotConfiguredPrefix, StringComparison.Ordinal);

    public async Task<Hl7RetryResultDto> RetryAllFailedAsync(Guid userId)
    {
        var failed = await _db.Hl7MessageQueues
            .Where(m => m.Status == "failed" || (m.Status == "pending" && m.NextRetryAt < DateTime.UtcNow))
            .Take(50).ToListAsync();

        int retried = 0, succeeded = 0, stillFailed = 0;
        foreach (var msg in failed)
        {
            retried++;
            msg.RetryCount++;
            msg.LastTryAt = DateTime.UtcNow;
            msg.UpdatedAt = DateTime.UtcNow;
            msg.UpdatedBy = userId.ToString();
            var outcome = await TryDeliverAsync(msg);
            ApplyOutcome(msg, outcome, DateTime.UtcNow);
            if (outcome.Success) succeeded++;
            else stillFailed++;
        }
        await _db.SaveChangesAsync();
        return new Hl7RetryResultDto { Retried = retried, SucceededImmediately = succeeded, StillFailed = stillFailed };
    }

    public async Task<int> ProcessPendingAsync()
    {
        var now = DateTime.UtcNow;
        var pending = await _db.Hl7MessageQueues
            .Where(m => m.Status == "pending" && m.Direction == "outbound" && (m.NextRetryAt == null || m.NextRetryAt <= now))
            .OrderBy(m => m.CreatedAt)
            .Take(20).ToListAsync();

        int processed = 0;
        foreach (var msg in pending)
        {
            msg.RetryCount++;
            msg.LastTryAt = now;
            if (msg.FirstTryAt == null) msg.FirstTryAt = now;
            var outcome = await TryDeliverAsync(msg);
            ApplyOutcome(msg, outcome, now);
            processed++;
        }
        if (processed > 0) await _db.SaveChangesAsync();
        return processed;
    }

    /// <summary>
    /// QA-R11: real MLLP send (was a random 80% "success" with a fabricated MSA|AA). Endpoint forms:
    /// "tcp://host:port", "mllp://host:port" or "host:port".
    /// </summary>
    private static async Task<Hl7SendOutcome> TryDeliverAsync(Hl7MessageQueue msg)
    {
        if (!TryParseEndpoint(msg.Endpoint, out var host, out var port))
            return new Hl7SendOutcome(false, null, null, null,
                $"{NotConfiguredPrefix} địa chỉ nhận HL7 (dạng tcp://host:port) cho bản tin này — không gửi được");
        return await Hl7MllpClient.SendAsync(host, port, msg.Payload, timeoutSeconds: 15);
    }

    internal static bool TryParseEndpoint(string? endpoint, out string host, out int port)
    {
        host = string.Empty;
        port = 0;
        if (string.IsNullOrWhiteSpace(endpoint)) return false;
        var value = endpoint.Trim();
        var schemeEnd = value.IndexOf("://", StringComparison.Ordinal);
        if (schemeEnd >= 0)
        {
            var scheme = value[..schemeEnd].ToLowerInvariant();
            if (scheme != "tcp" && scheme != "mllp") return false;
            value = value[(schemeEnd + 3)..];
        }
        value = value.TrimEnd('/');
        var colon = value.LastIndexOf(':');
        if (colon <= 0 || !int.TryParse(value[(colon + 1)..], out port) || port is < 1 or > 65535) return false;
        host = value[..colon];
        return !string.IsNullOrWhiteSpace(host);
    }

    private static Hl7MessageQueueDto MapToDto(Hl7MessageQueue m) => new()
    {
        Id = m.Id,
        Direction = m.Direction,
        SourceSystem = m.SourceSystem,
        TargetSystem = m.TargetSystem,
        MessageType = m.MessageType,
        MessageControlId = m.MessageControlId,
        Status = m.Status,
        RetryCount = m.RetryCount,
        MaxRetries = m.MaxRetries,
        ErrorMessage = m.ErrorMessage,
        FirstTryAt = m.FirstTryAt,
        LastTryAt = m.LastTryAt,
        NextRetryAt = m.NextRetryAt,
        AckedAt = m.AckedAt,
        Endpoint = m.Endpoint,
        CreatedAt = m.CreatedAt
    };
}
