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

    public Hl7QueueService(HISDbContext db, ILogger<Hl7QueueService> logger)
    {
        _db = db;
        _logger = logger;
    }

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
            .Skip((dto.PageIndex - 1) * dto.PageSize).Take(dto.PageSize)
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

        msg.Status = "retrying";
        msg.RetryCount++;
        msg.LastTryAt = DateTime.UtcNow;
        msg.UpdatedAt = DateTime.UtcNow;
        msg.UpdatedBy = userId.ToString();

        // Demo retry — production wire HL7 TCP/HTTP client
        var success = await TryDeliverAsync(msg);
        if (success)
        {
            msg.Status = "sent";
            msg.AckedAt = DateTime.UtcNow;
            msg.AckMessage = $"MSA|AA|{msg.MessageControlId}|Accepted";
        }
        else if (msg.RetryCount >= msg.MaxRetries)
        {
            msg.Status = "failed";
            msg.ErrorMessage = $"Max retries reached ({msg.MaxRetries})";
        }
        else
        {
            msg.Status = "pending";
            msg.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, msg.RetryCount));
        }
        await _db.SaveChangesAsync();
        return MapToDto(msg);
    }

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
            var success = await TryDeliverAsync(msg);
            if (success)
            {
                msg.Status = "sent";
                msg.AckedAt = DateTime.UtcNow;
                msg.AckMessage = $"MSA|AA|{msg.MessageControlId}|Accepted";
                succeeded++;
            }
            else
            {
                msg.Status = msg.RetryCount >= msg.MaxRetries ? "failed" : "pending";
                if (msg.Status == "pending")
                    msg.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, msg.RetryCount));
                stillFailed++;
            }
        }
        await _db.SaveChangesAsync();
        return new Hl7RetryResultDto { Retried = retried, SucceededImmediately = succeeded, StillFailed = stillFailed };
    }

    public async Task<int> ProcessPendingAsync()
    {
        var now = DateTime.UtcNow;
        var pending = await _db.Hl7MessageQueues
            .Where(m => m.Status == "pending" && (m.NextRetryAt == null || m.NextRetryAt <= now))
            .Take(20).ToListAsync();

        int processed = 0;
        foreach (var msg in pending)
        {
            msg.RetryCount++;
            msg.LastTryAt = now;
            if (msg.FirstTryAt == null) msg.FirstTryAt = now;
            var ok = await TryDeliverAsync(msg);
            if (ok)
            {
                msg.Status = "sent";
                msg.AckedAt = now;
                msg.AckMessage = $"MSA|AA|{msg.MessageControlId}|Accepted";
            }
            else if (msg.RetryCount >= msg.MaxRetries)
            {
                msg.Status = "failed";
                msg.ErrorMessage = "Max retries reached";
            }
            else
            {
                msg.NextRetryAt = now.AddMinutes(Math.Pow(2, msg.RetryCount));
            }
            processed++;
        }
        if (processed > 0) await _db.SaveChangesAsync();
        return processed;
    }

    private static async Task<bool> TryDeliverAsync(Hl7MessageQueue msg)
    {
        // Demo deliver — production: open TCP socket / HTTP POST to endpoint
        await Task.Delay(10);
        // Demo success rate: 80%
        return Random.Shared.Next(10) < 8;
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
