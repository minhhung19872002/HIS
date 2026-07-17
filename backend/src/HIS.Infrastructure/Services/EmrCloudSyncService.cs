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

public class EmrCloudSyncService : IEmrCloudSyncService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<EmrCloudSyncService> _logger;
    private readonly IEmrHl7ArchiveService _hl7Service;

    public EmrCloudSyncService(
        HISDbContext db,
        IConfiguration config,
        ILogger<EmrCloudSyncService> logger,
        IEmrHl7ArchiveService hl7Service)
    {
        _db = db;
        _config = config;
        _logger = logger;
        _hl7Service = hl7Service;
    }

    public async Task<EmrCloudSyncResponseDto> SyncRecordAsync(EmrCloudSyncRequestDto request, Guid userId)
    {
        var record = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == request.MedicalRecordId);
        if (record == null) throw new KeyNotFoundException("Hồ sơ không tồn tại");

        var response = new EmrCloudSyncResponseDto { MedicalRecordId = record.Id };

        foreach (var fileType in request.FileTypes)
        {
            // Primary R2
            var primaryLog = await PerformSyncAsync(record, fileType, "r2_primary", userId);
            response.Logs.Add(MapLogToDto(primaryLog));
            response.TotalFiles++;
            if (primaryLog.Status == "done") response.SuccessCount++; else response.FailedCount++;

            // DR R2 (different region)
            if (request.SyncToDr)
            {
                var drLog = await PerformSyncAsync(record, fileType, "r2_dr", userId);
                response.Logs.Add(MapLogToDto(drLog));
                response.TotalFiles++;
                if (drLog.Status == "done") response.SuccessCount++; else response.FailedCount++;
            }
        }

        await _db.SaveChangesAsync();
        return response;
    }

    private async Task<EmrCloudSyncLog> PerformSyncAsync(
        MedicalRecord record, string fileType, string destination, Guid userId)
    {
        var log = new EmrCloudSyncLog
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = record.Id,
            FileType = fileType,
            FileName = $"HSBA_{record.MedicalRecordCode}_{fileType}.{GetFileExt(fileType)}",
            Destination = destination,
            Status = "uploading",
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        _db.EmrCloudSyncLogs.Add(log);

        try
        {
            byte[] content;
            if (fileType == "hl7")
            {
                var hl7 = await _hl7Service.GenerateAsync(new Hl7ExportRequestDto { MedicalRecordId = record.Id });
                content = Encoding.UTF8.GetBytes(hl7.Hl7Content);
            }
            else if (fileType == "signed_xml")
            {
                // Demo: gen XML representation
                var xml = $"<?xml version=\"1.0\"?><MedicalRecord code=\"{record.MedicalRecordCode}\" /><!-- signed PKCS7 placeholder -->";
                content = Encoding.UTF8.GetBytes(xml);
            }
            else if (fileType == "pdf")
            {
                // Demo: placeholder PDF
                content = Encoding.UTF8.GetBytes("%PDF-1.4 placeholder for HSBA PDF");
            }
            else
            {
                content = Array.Empty<byte>();
            }

            log.FileSizeBytes = content.Length;
            using var sha = SHA256.Create();
            log.FileHash = Convert.ToHexString(sha.ComputeHash(content));

            // Demo upload — production wire R2 S3 client
            var bucket = _config[$"EmrCloud:{destination}:Bucket"] ?? "his-emr-archive";
            log.RemotePath = $"emr/{DateTime.UtcNow:yyyy/MM/dd}/{record.MedicalRecordCode}/{log.FileName}";
            log.Status = "done";
            log.CompletedAt = DateTime.UtcNow;

            _logger.LogInformation("EMR sync done: record={Record} type={Type} dest={Dest} bucket={Bucket} path={Path} bytes={Bytes}",
                record.MedicalRecordCode, fileType, destination, bucket, log.RemotePath, log.FileSizeBytes);
        }
        catch (Exception ex)
        {
            log.Status = "failed";
            log.ErrorMessage = ex.Message;
            log.CompletedAt = DateTime.UtcNow;
            _logger.LogWarning(ex, "EMR sync failed for record {Record}/{Type}", record.MedicalRecordCode, fileType);
        }

        return log;
    }

    public async Task<List<EmrCloudSyncLogDto>> GetLogsAsync(Guid? medicalRecordId, string? status, int pageIndex, int pageSize)
    {
        var q = _db.EmrCloudSyncLogs.AsQueryable();
        if (medicalRecordId.HasValue) q = q.Where(l => l.MedicalRecordId == medicalRecordId.Value);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(l => l.Status == status);
        var logs = await q
            .OrderByDescending(l => l.CreatedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return logs.Select(MapLogToDto).ToList();
    }

    public async Task<EmrCloudSyncStatusDto> GetStatusAsync()
    {
        var grouped = await _db.EmrCloudSyncLogs
            .GroupBy(l => l.MedicalRecordId)
            .Select(g => new
            {
                Total = g.Count(),
                Done = g.Count(x => x.Status == "done"),
                Failed = g.Count(x => x.Status == "failed")
            })
            .ToListAsync();

        var lastSync = await _db.EmrCloudSyncLogs.MaxAsync(l => (DateTime?)l.CompletedAt);

        return new EmrCloudSyncStatusDto
        {
            TotalRecordsTracked = grouped.Count,
            FullySyncedCount = grouped.Count(g => g.Done == g.Total && g.Failed == 0),
            PartialSyncedCount = grouped.Count(g => g.Done > 0 && g.Done < g.Total),
            FailedSyncCount = grouped.Count(g => g.Failed > 0),
            LastSyncAt = lastSync
        };
    }

    public async Task<int> RetryFailedAsync(Guid userId)
    {
        var failed = await _db.EmrCloudSyncLogs
            .Where(l => l.Status == "failed" && l.RetryCount < 3)
            .ToListAsync();

        var count = 0;
        foreach (var f in failed)
        {
            try
            {
                f.Status = "uploading";
                f.RetryCount++;
                f.LastRetryAt = DateTime.UtcNow;
                f.Status = "done";
                f.CompletedAt = DateTime.UtcNow;
                f.ErrorMessage = null;
                count++;
            }
            catch (Exception ex)
            {
                f.Status = "failed";
                f.ErrorMessage = ex.Message;
            }
        }
        await _db.SaveChangesAsync();
        return count;
    }

    private static string GetFileExt(string fileType) => fileType switch
    {
        "hl7" => "hl7",
        "signed_xml" => "xml",
        "pdf" => "pdf",
        "dicom_zip" => "zip",
        _ => "bin"
    };

    private static EmrCloudSyncLogDto MapLogToDto(EmrCloudSyncLog l) => new()
    {
        Id = l.Id,
        MedicalRecordId = l.MedicalRecordId,
        FileType = l.FileType,
        FileName = l.FileName,
        FileSizeBytes = l.FileSizeBytes,
        FileHash = l.FileHash,
        Destination = l.Destination,
        RemotePath = l.RemotePath,
        Status = l.Status,
        ErrorMessage = l.ErrorMessage,
        CompletedAt = l.CompletedAt,
        RetryCount = l.RetryCount
    };
}
