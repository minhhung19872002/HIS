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

public class DicomAutoSendService : IDicomAutoSendService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<DicomAutoSendService> _logger;
    private readonly IDicomPacsGateway _pacsGateway;

    public DicomAutoSendService(
        HISDbContext db,
        IConfiguration config,
        IDicomPacsGateway pacsGateway,
        ILogger<DicomAutoSendService> logger)
    {
        _db = db;
        _config = config;
        _pacsGateway = pacsGateway;
        _logger = logger;
    }

    public async Task<List<DicomAutoSendRuleDto>> ListRulesAsync()
    {
        var rules = await _db.DicomAutoSendRules
            .Where(r => !r.IsDeleted)
            .OrderBy(r => r.Priority).ThenByDescending(r => r.CreatedAt)
            .ToListAsync();

        var serverIds = rules.Select(r => r.DestinationServerId).Distinct().ToList();
        var servers = await _db.RemotePacsServers
            .Where(s => serverIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Name);

        return rules.Select(r => MapRuleToDto(r, servers.GetValueOrDefault(r.DestinationServerId, "Unknown"))).ToList();
    }

    public async Task<DicomAutoSendRuleDto> CreateRuleAsync(DicomAutoSendRuleCreateDto dto, Guid userId)
    {
        ValidateRule(dto);
        var rule = new DicomAutoSendRule
        {
            Id = Guid.NewGuid(),
            RuleName = dto.RuleName,
            Modality = dto.Modality,
            SourceAeTitle = NormalizeFilter(dto.SourceAeTitle),
            DepartmentCode = NormalizeFilter(dto.DepartmentCode),
            DestinationServerId = dto.DestinationServerId,
            EncryptBeforeSend = dto.EncryptBeforeSend,
            TriggerType = dto.TriggerType,
            ScheduleCron = dto.ScheduleCron,
            Priority = dto.Priority,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        _db.DicomAutoSendRules.Add(rule);
        await _db.SaveChangesAsync();
        var serverName = await _db.RemotePacsServers
            .Where(s => s.Id == rule.DestinationServerId).Select(s => s.Name).FirstOrDefaultAsync() ?? "Unknown";
        return MapRuleToDto(rule, serverName);
    }

    public async Task<DicomAutoSendRuleDto> UpdateRuleAsync(Guid id, DicomAutoSendRuleCreateDto dto, Guid userId)
    {
        ValidateRule(dto);
        var rule = await _db.DicomAutoSendRules.FirstOrDefaultAsync(r => r.Id == id);
        if (rule == null) throw new KeyNotFoundException("Rule không tồn tại");
        rule.RuleName = dto.RuleName;
        rule.Modality = dto.Modality;
        rule.SourceAeTitle = NormalizeFilter(dto.SourceAeTitle);
        rule.DepartmentCode = NormalizeFilter(dto.DepartmentCode);
        rule.DestinationServerId = dto.DestinationServerId;
        rule.EncryptBeforeSend = dto.EncryptBeforeSend;
        rule.TriggerType = dto.TriggerType;
        rule.ScheduleCron = dto.ScheduleCron;
        rule.Priority = dto.Priority;
        rule.IsActive = dto.IsActive;
        rule.UpdatedAt = DateTime.UtcNow;
        rule.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        var serverName = await _db.RemotePacsServers
            .Where(s => s.Id == rule.DestinationServerId).Select(s => s.Name).FirstOrDefaultAsync() ?? "Unknown";
        return MapRuleToDto(rule, serverName);
    }

    public async Task DeleteRuleAsync(Guid id, Guid userId)
    {
        var rule = await _db.DicomAutoSendRules.FirstOrDefaultAsync(r => r.Id == id);
        if (rule == null) return;
        rule.IsDeleted = true;
        rule.UpdatedAt = DateTime.UtcNow;
        rule.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
    }

    public async Task<DicomTransmissionLogDto> SendStudyAsync(DicomSendRequestDto dto, Guid userId)
    {
        var server = await _db.RemotePacsServers
            .FirstOrDefaultAsync(s => s.Id == dto.DestinationServerId && s.IsActive && !s.IsDeleted);
        if (server == null) throw new KeyNotFoundException("Server đích không tồn tại hoặc đã ngưng hoạt động");

        var log = new DicomTransmissionLog
        {
            Id = Guid.NewGuid(),
            StudyInstanceUid = dto.StudyInstanceUid,
            DestinationServerId = dto.DestinationServerId,
            DestinationName = server.Name,
            TriggerType = "manual",
            WasEncrypted = server.UseTls,
            EncryptionAlgorithm = server.UseTls ? "DICOM-TLS" : null,
            Status = "sending",
            StartedAt = DateTime.UtcNow,
            TriggeredByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        var study = await _db.DicomStudies
            .Where(s => s.StudyInstanceUID == dto.StudyInstanceUid && !s.IsDeleted)
            .Select(s => new { s.Id, s.StudyInstanceUID })
            .FirstOrDefaultAsync();
        if (study == null) throw new KeyNotFoundException("Study không tồn tại trong RIS");
        log.DicomStudyId = study?.Id;
        _db.DicomTransmissionLogs.Add(log);
        await _db.SaveChangesAsync();

        try
        {
            if (dto.Encrypt && !server.UseTls)
                throw new InvalidOperationException(
                    "Yêu cầu truyền mã hóa nhưng PACS đích chưa bật DICOM TLS");

            var store = await _pacsGateway.SendStudyAsync(
                study.StudyInstanceUID,
                ToEndpoint(server));
            log.InstanceCount = store.InstanceCount;
            log.TotalBytes = store.TotalBytes;
            log.Status = store.Success ? "done" : "failed";
            log.ErrorMessage = store.ErrorMessage;
            log.CompletedAt = DateTime.UtcNow;
            log.DurationMs = (int)(log.CompletedAt!.Value - log.StartedAt).TotalMilliseconds;
        }
        catch (Exception ex)
        {
            log.Status = "failed";
            log.ErrorMessage = ex.GetBaseException().Message;
            log.CompletedAt = DateTime.UtcNow;
            log.DurationMs = (int)(log.CompletedAt.Value - log.StartedAt).TotalMilliseconds;
        }
        await _db.SaveChangesAsync();
        return MapTransmissionToDto(log, null);
    }

    public async Task<List<DicomTransmissionLogDto>> SearchTransmissionsAsync(
        DateTime? from, DateTime? to, string? status, int pageIndex, int pageSize)
    {
        var q = _db.DicomTransmissionLogs.AsQueryable();
        if (from.HasValue) q = q.Where(l => l.StartedAt >= from.Value);
        if (to.HasValue) q = q.Where(l => l.StartedAt <= to.Value.AddDays(1));
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(l => l.Status == status);

        var logs = await q
            .OrderByDescending(l => l.StartedAt)
            .Skip((pageIndex - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        var userIds = logs.Where(l => l.TriggeredByUserId.HasValue).Select(l => l.TriggeredByUserId!.Value).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);
        return logs.Select(l => MapTransmissionToDto(l, l.TriggeredByUserId.HasValue ? users.GetValueOrDefault(l.TriggeredByUserId.Value) : null)).ToList();
    }

    public async Task<DicomTransmissionStatsDto> GetStatsAsync(DateTime from, DateTime to)
    {
        var logs = await _db.DicomTransmissionLogs
            .Where(l => l.StartedAt >= from && l.StartedAt <= to.AddDays(1))
            .ToListAsync();
        return new DicomTransmissionStatsDto
        {
            FromDate = from,
            ToDate = to,
            TotalTransmissions = logs.Count,
            SuccessCount = logs.Count(l => l.Status == "done"),
            FailedCount = logs.Count(l => l.Status == "failed"),
            TotalBytesSent = logs.Where(l => l.Status == "done").Sum(l => l.TotalBytes),
            EncryptedCount = logs.Count(l => l.WasEncrypted),
            ByDestination = logs.GroupBy(l => l.DestinationName).Select(g => new DicomTransmissionDestStatDto
            {
                DestinationName = g.Key,
                Count = g.Count(),
                Bytes = g.Sum(l => l.TotalBytes)
            }).ToList(),
            ByDay = logs.GroupBy(l => l.StartedAt.Date).Select(g => new DicomTransmissionDailyDto
            {
                Date = g.Key,
                Count = g.Count(),
                Bytes = g.Sum(l => l.TotalBytes)
            }).OrderBy(d => d.Date).ToList()
        };
    }

    public async Task<int> TriggerAutoSendCheckAsync()
    {
        var rules = await _db.DicomAutoSendRules
            .Where(r => r.IsActive && r.TriggerType == "on_arrival" && !r.IsDeleted)
            .OrderBy(r => r.Priority).ToListAsync();

        int triggered = 0;
        foreach (var rule in rules)
        {
            var server = await _db.RemotePacsServers
                .FirstOrDefaultAsync(s => s.Id == rule.DestinationServerId && s.IsActive && !s.IsDeleted);
            if (server == null)
            {
                _logger.LogWarning("Skipping DICOM auto-send rule {RuleId}: destination is inactive", rule.Id);
                continue;
            }

            var filtersOnProvenance = !string.IsNullOrWhiteSpace(rule.SourceAeTitle) ||
                                      !string.IsNullOrWhiteSpace(rule.DepartmentCode);
            if (filtersOnProvenance)
                await ResolvePendingProvenanceAsync(rule.Modality);

            // Tìm studies match rule chưa được gửi rule này.  Study chưa xác định được nguồn thì
            // SourceAeTitle/DepartmentCode = NULL nên không khớp rule có lọc — fail-closed.
            var q = _db.DicomStudies.Where(s => !s.IsDeleted && s.Status != 3);
            if (!string.IsNullOrWhiteSpace(rule.Modality))
                q = q.Where(s => s.Modality == rule.Modality);
            if (!string.IsNullOrWhiteSpace(rule.SourceAeTitle))
                q = q.Where(s => s.SourceAeTitle == rule.SourceAeTitle);
            if (!string.IsNullOrWhiteSpace(rule.DepartmentCode))
                q = q.Where(s => s.DepartmentCode == rule.DepartmentCode);
            // Limit batch 10 cho test
            var studies = await q.OrderByDescending(s => s.CreatedAt).Take(10).ToListAsync();

            foreach (var s in studies)
            {
                var maxRetries = Math.Clamp(_config.GetValue<int>("PACS:AutoSend:MaxRetries", 5), 1, 20);
                var previousFailures = await _db.DicomTransmissionLogs
                    .Where(t => t.StudyInstanceUid == s.StudyInstanceUID &&
                                t.AutoSendRuleId == rule.Id && t.Status == "failed")
                    .OrderByDescending(t => t.CompletedAt)
                    .Select(t => new { t.NextRetryAt })
                    .ToListAsync();
                if (previousFailures.Count >= maxRetries) continue;
                if (previousFailures.FirstOrDefault()?.NextRetryAt is DateTime nextRetry && nextRetry > DateTime.UtcNow)
                    continue;

                var alreadySent = await _db.DicomTransmissionLogs.AnyAsync(t =>
                    t.StudyInstanceUid == s.StudyInstanceUID &&
                    t.AutoSendRuleId == rule.Id &&
                    (t.Status == "sending" || t.Status == "done"));
                if (alreadySent) continue;

                var log = new DicomTransmissionLog
                {
                    Id = Guid.NewGuid(),
                    DeduplicationKey = $"{rule.Id:N}:{s.StudyInstanceUID}",
                    StudyInstanceUid = s.StudyInstanceUID,
                    DicomStudyId = s.Id,
                    AutoSendRuleId = rule.Id,
                    DestinationServerId = rule.DestinationServerId,
                    DestinationName = server.Name,
                    TriggerType = "auto",
                    WasEncrypted = server.UseTls,
                    EncryptionAlgorithm = server.UseTls ? "DICOM-TLS" : null,
                    Status = "sending",
                    RetryCount = previousFailures.Count,
                    StartedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                _db.DicomTransmissionLogs.Add(log);
                try
                {
                    await _db.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    _db.Entry(log).State = EntityState.Detached;
                    var claimed = await _db.DicomTransmissionLogs.AnyAsync(t =>
                        t.DeduplicationKey == $"{rule.Id:N}:{s.StudyInstanceUID}");
                    if (claimed) continue;
                    throw;
                }

                try
                {
                    if (rule.EncryptBeforeSend && !server.UseTls)
                        throw new InvalidOperationException(
                            "Auto-send requires encrypted transport but destination DICOM TLS is disabled");
                    var store = await _pacsGateway.SendStudyAsync(s.StudyInstanceUID, ToEndpoint(server));
                    log.InstanceCount = store.InstanceCount;
                    log.TotalBytes = store.TotalBytes;
                    log.Status = store.Success ? "done" : "failed";
                    log.ErrorMessage = store.ErrorMessage;
                    if (store.StorageCommitmentStatus != null)
                    {
                        // Ghi lại bằng chứng cam kết lưu trữ để đối soát khi tra cứu.
                        var evidence = $"Storage Commitment {store.StorageCommitmentStatus}" +
                                       $" (tx {store.StorageCommitmentTransactionUid})";
                        log.ErrorMessage = string.IsNullOrWhiteSpace(log.ErrorMessage)
                            ? evidence
                            : $"{log.ErrorMessage} | {evidence}";
                    }
                    if (store.Success)
                    {
                        rule.LastTriggeredAt = DateTime.UtcNow;
                        rule.TimesTriggered++;
                        triggered++;
                    }
                }
                catch (Exception ex)
                {
                    log.Status = "failed";
                    log.ErrorMessage = ex.GetBaseException().Message;
                }
                if (log.Status == "failed")
                {
                    log.DeduplicationKey = null;
                    var baseDelaySeconds = Math.Clamp(
                        _config.GetValue<int>("PACS:AutoSend:RetryBaseSeconds", 30), 5, 3600);
                    var exponent = Math.Min(log.RetryCount, 8);
                    log.NextRetryAt = DateTime.UtcNow.AddSeconds(baseDelaySeconds * Math.Pow(2, exponent));
                }
                log.CompletedAt = DateTime.UtcNow;
                log.DurationMs = (int)(log.CompletedAt.Value - log.StartedAt).TotalMilliseconds;
                await _db.SaveChangesAsync();
            }
        }
        return triggered;
    }

    /// <summary>
    /// Fills in DICOM provenance for studies that have never been resolved, so provenance-filtered
    /// rules can evaluate them.  Bounded per pass; a study the archive cannot answer for keeps
    /// <c>SourceResolvedAt</c> null and stays excluded from filtered rules.
    /// </summary>
    private async Task ResolvePendingProvenanceAsync(string? modality)
    {
        var batchSize = Math.Clamp(_config.GetValue<int>("PACS:AutoSend:ProvenanceBatchSize", 25), 1, 200);
        var pending = _db.DicomStudies.Where(s =>
            !s.IsDeleted && s.Status != 3 && s.SourceResolvedAt == null &&
            s.StudyInstanceUID != null && s.StudyInstanceUID != "");
        if (!string.IsNullOrWhiteSpace(modality))
            pending = pending.Where(s => s.Modality == modality);

        var studies = await pending
            .OrderByDescending(s => s.CreatedAt)
            .Take(batchSize)
            .ToListAsync();
        if (studies.Count == 0) return;

        var examIds = studies.Select(s => s.RadiologyExamId).Distinct().ToList();
        var departmentByExam = await _db.RadiologyExams
            .Where(e => examIds.Contains(e.Id) && e.RoomId != null)
            .Join(_db.Rooms, e => e.RoomId, r => (Guid?)r.Id, (e, r) => new { e.Id, r.Department.DepartmentCode })
            .ToDictionaryAsync(x => x.Id, x => x.DepartmentCode);

        var resolved = 0;
        foreach (var study in studies)
        {
            var source = await _pacsGateway.GetStudySourceAsync(study.StudyInstanceUID);
            if (!source.Success)
            {
                _logger.LogWarning(
                    "Cannot resolve DICOM provenance for study {StudyInstanceUID}: {Error}",
                    study.StudyInstanceUID, source.ErrorMessage);
                continue;
            }

            study.SourceAeTitle = source.SourceAeTitle;
            study.SourceOrigin = source.Origin;
            study.SourceIpAddress = source.SourceIpAddress;
            study.StationName = source.StationName;
            study.DepartmentCode = departmentByExam.TryGetValue(study.RadiologyExamId, out var code) &&
                                   !string.IsNullOrWhiteSpace(code)
                ? code
                : source.InstitutionalDepartmentName;
            study.SourceResolvedAt = DateTime.UtcNow;
            resolved++;
        }

        if (resolved > 0) await _db.SaveChangesAsync();
    }

    /// <summary>Blank filter means "no filter"; a set filter is compared verbatim against the study.</summary>
    private static string? NormalizeFilter(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void ValidateRule(DicomAutoSendRuleCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RuleName))
            throw new ArgumentException("Tên rule không được để trống");
        if (!string.Equals(dto.TriggerType, "on_arrival", StringComparison.OrdinalIgnoreCase))
            throw new NotSupportedException(
                "Hiện chỉ hỗ trợ trigger on_arrival có worker thật; scheduled/manual rule chưa được phép cấu hình");
        if (!string.IsNullOrWhiteSpace(dto.SourceAeTitle) && dto.SourceAeTitle.Trim().Length > 16)
            throw new ArgumentException("Source AE Title tối đa 16 ký tự theo chuẩn DICOM");
        if (!string.IsNullOrWhiteSpace(dto.DepartmentCode) && dto.DepartmentCode.Trim().Length > 32)
            throw new ArgumentException("Mã khoa tối đa 32 ký tự");
        if (dto.Priority is < 1 or > 10)
            throw new ArgumentOutOfRangeException(nameof(dto.Priority), "Priority phải từ 1 đến 10");
    }

    private DicomEndpoint ToEndpoint(RemotePacsServer server) => new(
        server.Host,
        server.Port,
        server.AeTitle,
        string.IsNullOrWhiteSpace(server.CallingAeTitle)
            ? _config["PACS:CallingAETitle"] ?? "HIS_RIS"
            : server.CallingAeTitle,
        server.UseTls,
        server.UseStorageCommitment,
        server.TimeoutSeconds);

    private static DicomAutoSendRuleDto MapRuleToDto(DicomAutoSendRule r, string serverName) => new()
    {
        Id = r.Id,
        RuleName = r.RuleName,
        Modality = r.Modality,
        SourceAeTitle = r.SourceAeTitle,
        DepartmentCode = r.DepartmentCode,
        DestinationServerId = r.DestinationServerId,
        DestinationName = serverName,
        EncryptBeforeSend = r.EncryptBeforeSend,
        TriggerType = r.TriggerType,
        ScheduleCron = r.ScheduleCron,
        Priority = r.Priority,
        IsActive = r.IsActive,
        LastTriggeredAt = r.LastTriggeredAt,
        TimesTriggered = r.TimesTriggered
    };

    private static DicomTransmissionLogDto MapTransmissionToDto(DicomTransmissionLog l, string? userName) => new()
    {
        Id = l.Id,
        StudyInstanceUid = l.StudyInstanceUid,
        AutoSendRuleId = l.AutoSendRuleId,
        DestinationName = l.DestinationName,
        TriggerType = l.TriggerType,
        InstanceCount = l.InstanceCount,
        TotalBytes = l.TotalBytes,
        WasEncrypted = l.WasEncrypted,
        EncryptionAlgorithm = l.EncryptionAlgorithm,
        Status = l.Status,
        ErrorMessage = l.ErrorMessage,
        RetryCount = l.RetryCount,
        NextRetryAt = l.NextRetryAt,
        StartedAt = l.StartedAt,
        CompletedAt = l.CompletedAt,
        DurationMs = l.DurationMs,
        TriggeredByUserName = userName
    };
}
