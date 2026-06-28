using System.Text.Json;
using System.Text;
using HIS.Application.DTOs.NangCap23;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;
// ============================================================================
// Batch 1.1: National Prescription Gateway (donthuocquocgia.vn)
// ============================================================================

public class NationalPrescriptionGatewayService : INationalPrescriptionGatewayService
{
    private const string EntityLabel = "Submission đơn thuốc QG";
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly INationalPrescriptionGatewayClient _client;
    private readonly INangCap23ConfigStore _configStore;
    private readonly ILogger<NationalPrescriptionGatewayService> _logger;

    public NationalPrescriptionGatewayService(
        HISDbContext db, IConfiguration config,
        INationalPrescriptionGatewayClient client,
        INangCap23ConfigStore configStore,
        ILogger<NationalPrescriptionGatewayService> logger)
    {
        _db = db; _config = config; _client = client; _configStore = configStore; _logger = logger;
    }

    private static string StatusName(int s) => s switch
    {
        0 => "Nháp",
        1 => "Đã gửi",
        2 => "Cổng QG xác nhận",
        3 => "Bị từ chối",
        4 => "Đã hủy",
        _ => "Khác"
    };

    public async Task<List<NationalPrescriptionSubmissionDto>> SearchAsync(string? keyword, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.NationalPrescriptionSubmissions.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.SubmissionCode.Contains(k) || x.PatientIdNumber.Contains(k) || x.DoctorIdNumber.Contains(k));
        }
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.CreatedAt <= to.Value);

        var rows = await q.OrderByDescending(x => x.CreatedAt)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .ToListAsync();

        // Enrich with prescription code + patient name (via MedicalRecord)
        var rxIds = rows.Select(r => r.PrescriptionId).Distinct().ToList();
        var rxMap = await _db.Prescriptions.AsNoTracking()
            .Where(p => rxIds.Contains(p.Id))
            .Include(p => p.MedicalRecord)
            .Select(p => new { p.Id, p.PrescriptionCode, MrPatientId = p.MedicalRecord.PatientId })
            .ToListAsync();
        var patientIds = rxMap.Select(r => r.MrPatientId).Distinct().ToList();
        var patientMap = await _db.Patients.AsNoTracking()
            .Where(p => patientIds.Contains(p.Id))
            .Select(p => new { p.Id, p.FullName })
            .ToListAsync();

        return rows.Select(r =>
        {
            var rx = rxMap.FirstOrDefault(x => x.Id == r.PrescriptionId);
            var patient = rx == null ? null : patientMap.FirstOrDefault(p => p.Id == rx.MrPatientId);
            return new NationalPrescriptionSubmissionDto
            {
                Id = r.Id,
                PrescriptionId = r.PrescriptionId,
                SubmissionCode = r.SubmissionCode,
                FacilityCode = r.FacilityCode,
                DoctorIdNumber = r.DoctorIdNumber,
                DoctorLicenseNumber = r.DoctorLicenseNumber,
                PatientIdNumber = r.PatientIdNumber,
                PrescriptionType = r.PrescriptionType,
                Status = r.Status,
                StatusName = StatusName(r.Status),
                GatewayTransactionId = r.GatewayTransactionId,
                ErrorCode = r.ErrorCode,
                ErrorMessage = r.ErrorMessage,
                SubmittedAt = r.SubmittedAt,
                AcknowledgedAt = r.AcknowledgedAt,
                RetryCount = r.RetryCount,
                PrescriptionCode = rx?.PrescriptionCode,
                PatientName = patient?.FullName,
                CreatedAt = r.CreatedAt
            };
        }).ToList();
    }

    public async Task<NationalPrescriptionSubmissionDetailDto?> GetByIdAsync(Guid id)
    {
        var r = await _db.NationalPrescriptionSubmissions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var rx = await _db.Prescriptions.AsNoTracking().Where(p => p.Id == r.PrescriptionId)
            .Include(p => p.MedicalRecord)
            .Select(p => new { p.PrescriptionCode, MrPatientId = p.MedicalRecord.PatientId }).FirstOrDefaultAsync();
        var patientName = rx == null ? null : await _db.Patients.AsNoTracking().Where(p => p.Id == rx.MrPatientId).Select(p => p.FullName).FirstOrDefaultAsync();
        return new NationalPrescriptionSubmissionDetailDto
        {
            Id = r.Id,
            PrescriptionId = r.PrescriptionId,
            SubmissionCode = r.SubmissionCode,
            FacilityCode = r.FacilityCode,
            DoctorIdNumber = r.DoctorIdNumber,
            DoctorLicenseNumber = r.DoctorLicenseNumber,
            PatientIdNumber = r.PatientIdNumber,
            PrescriptionType = r.PrescriptionType,
            Status = r.Status,
            StatusName = StatusName(r.Status),
            GatewayTransactionId = r.GatewayTransactionId,
            ErrorCode = r.ErrorCode,
            ErrorMessage = r.ErrorMessage,
            SubmittedAt = r.SubmittedAt,
            AcknowledgedAt = r.AcknowledgedAt,
            RetryCount = r.RetryCount,
            PrescriptionCode = rx?.PrescriptionCode,
            PatientName = patientName,
            CreatedAt = r.CreatedAt,
            PayloadJson = r.PayloadJson,
            ResponseJson = r.ResponseJson
        };
    }

    public async Task<NationalPrescriptionSubmissionDto> SubmitAsync(SubmitNationalPrescriptionDto dto, string? userId)
    {
        return await SubmitAsync(dto, userId, CancellationToken.None);
    }

    public async Task<NationalPrescriptionSubmissionDto> SubmitAsync(SubmitNationalPrescriptionDto dto, string? userId, CancellationToken ct)
    {
        // Business validation — fail fast trước khi đụng DB
        if (dto.PrescriptionId == Guid.Empty)
            throw new ArgumentException("Thiếu PrescriptionId.", nameof(dto));
        if (string.IsNullOrWhiteSpace(dto.DoctorIdNumber))
            throw new ArgumentException("Thiếu CCCD bác sĩ kê đơn.", nameof(dto));
        if (string.IsNullOrWhiteSpace(dto.DoctorLicenseNumber))
            throw new ArgumentException("Thiếu mã chứng chỉ hành nghề.", nameof(dto));
        var allowedTypes = new[] { "Outpatient", "Narcotic", "Psychotropic", "Precursor" };
        if (!allowedTypes.Contains(dto.PrescriptionType))
            throw new ArgumentException($"PrescriptionType phải thuộc {string.Join("/", allowedTypes)}.", nameof(dto));

        // Service-level duplicate prevention — chặn race trước khi đụng DB unique index
        var existing = await _db.NationalPrescriptionSubmissions.AsNoTracking()
            .Where(x => x.PrescriptionId == dto.PrescriptionId && x.Status != 4)
            .Select(x => new { x.Id, x.Status, x.SubmissionCode })
            .FirstOrDefaultAsync(ct);
        if (existing != null)
            throw new InvalidOperationException(
                existing.Status == 2
                    ? $"Đơn thuốc đã được gửi cổng QG và xác nhận (mã giao dịch {existing.SubmissionCode}). Không thể gửi lại."
                    : $"Đơn thuốc đã có submission đang chờ xử lý (mã {existing.SubmissionCode}). Vui lòng dùng chức năng Retry/Cancel.");

        var rx = await _db.Prescriptions
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(p => p.Id == dto.PrescriptionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thuốc");
        if (!rx.Details.Any())
            throw new InvalidOperationException("Đơn thuốc trống — không thể gửi cổng QG.");
        var patient = rx.MedicalRecord?.Patient;

        var facilityCode = _config["NationalGateway:FacilityCode"] ?? "BV-DEMO-01";
        var code = $"DTQG-{DateTime.Now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";

        var payload = new
        {
            submissionCode = code,
            facilityCode,
            doctorIdNumber = dto.DoctorIdNumber,
            doctorLicense = dto.DoctorLicenseNumber,
            prescriptionType = dto.PrescriptionType,
            issuedAt = rx.PrescriptionDate.ToString("yyyy-MM-ddTHH:mm:ss"),
            patient = new
            {
                idNumber = patient?.IdentityNumber ?? "",
                fullName = patient?.FullName ?? "",
                gender = patient?.Gender,
                dob = patient?.DateOfBirth?.ToString("yyyy-MM-dd")
            },
            diagnosis = rx.Diagnosis,
            items = rx.Details.Select(d => new
            {
                medicineCode = d.Medicine?.MedicineCode,
                medicineName = d.Medicine?.MedicineName,
                quantity = d.Quantity,
                unit = d.Medicine?.Unit ?? d.Unit,
                dosage = d.Dosage,
                usage = d.Usage,
                durationDays = d.Days
            })
        };

        var entity = new NationalPrescriptionSubmission
        {
            Id = Guid.NewGuid(),
            PrescriptionId = dto.PrescriptionId,
            SubmissionCode = code,
            FacilityCode = facilityCode,
            DoctorIdNumber = dto.DoctorIdNumber,
            DoctorLicenseNumber = dto.DoctorLicenseNumber,
            PatientIdNumber = patient?.IdentityNumber ?? "",
            PrescriptionType = dto.PrescriptionType,
            PayloadJson = JsonSerializer.Serialize(payload),
            Status = 1, // Submitted — placeholder trước khi gọi gateway (2-phase save)
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            SubmittedAt = DateTime.UtcNow
        };

        // PHASE 1: Save row trước khi gọi gateway → user reload không tạo duplicate;
        // DB unique index (UX_NationalPrescriptionSubmissions_PrescriptionId_Active) chặn race.
        _db.NationalPrescriptionSubmissions.Add(entity);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException dux) when (NangCap23ServiceHelpers.IsUniqueViolation(dux))
        {
            throw new InvalidOperationException(
                "Đơn thuốc đã được submit bởi 1 request khác cùng lúc. Vui lòng xem lại danh sách.", dux);
        }

        // PHASE 2: Gọi gateway. Có thể block đến 90s (3 attempts × 30s timeout + backoff).
        // Khi user/Cloud Run cancel, CT throw — row đã save với Status=1, background retry sẽ pick up.
        GatewaySubmissionResult result;
        try
        {
            result = await _client.SubmitAsync(entity.PayloadJson, ct);
        }
        catch (OperationCanceledException)
        {
            // Row giữ Status=1 (Submitted) — không update. Retry background job hoặc user Retry sẽ xử lý.
            _logger.LogWarning("Prescription QG submit cancelled mid-flight: code={Code}", code);
            throw;
        }

        if (result.Acknowledged)
        {
            entity.Status = 2;
            entity.GatewayTransactionId = result.TransactionId;
            entity.AcknowledgedAt = DateTime.UtcNow;
            entity.ResponseJson = result.RawResponse;
            _logger.LogInformation("Prescription QG ack: code={Code} txn={Txn}", code, result.TransactionId);
        }
        else
        {
            // 4xx → Status=3 Rejected; network/timeout/circuit → giữ Status=1 Submitted để worker retry
            entity.Status = result.ErrorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN" ? 1 : 3;
            entity.ErrorCode = result.ErrorCode;
            entity.ErrorMessage = result.ErrorMessage;
            entity.ResponseJson = result.RawResponse;
            _logger.LogWarning("Prescription QG submit fail: code={Code} err={Err}", code, result.ErrorCode);
        }

        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        // High-New-5: nếu gateway đã ACK nhưng final SaveChanges fail (DB outage, disk full),
        // row in DB vẫn Status=1 (Phase 1) → user retry → gateway nhận lần 2 (duplicate trên cổng).
        // Log CRITICAL + capture transactionId để admin manual reconcile (idempotency key có hỗ trợ
        // dedupe trên cổng nếu cổng QG support, nhưng không bảo đảm).
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex) when (result.Acknowledged)
        {
            _logger.LogCritical(ex,
                "[NANGCAP23-ALERT] Gateway acknowledged prescription {Code} (txn={Txn}) but DB final save FAILED. "
                + "Manual reconcile required: check gateway transactionId vs DB row {EntityId}.",
                code, result.TransactionId, entity.Id);
            throw;
        }

        return new NationalPrescriptionSubmissionDto
        {
            Id = entity.Id,
            PrescriptionId = entity.PrescriptionId,
            SubmissionCode = entity.SubmissionCode,
            FacilityCode = entity.FacilityCode,
            DoctorIdNumber = entity.DoctorIdNumber,
            DoctorLicenseNumber = entity.DoctorLicenseNumber,
            PatientIdNumber = entity.PatientIdNumber,
            PrescriptionType = entity.PrescriptionType,
            Status = entity.Status,
            StatusName = StatusName(entity.Status),
            GatewayTransactionId = entity.GatewayTransactionId,
            SubmittedAt = entity.SubmittedAt,
            AcknowledgedAt = entity.AcknowledgedAt,
            RetryCount = entity.RetryCount,
            CreatedAt = entity.CreatedAt,
            PrescriptionCode = rx.PrescriptionCode,
            PatientName = patient?.FullName
        };
    }

    public async Task<NationalPrescriptionSubmissionDto?> RetryAsync(Guid id, string? userId)
    {
        var entity = await _db.NationalPrescriptionSubmissions.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        var maxRetries = _config.GetValue<int>("NationalGateway:RetryCount", 3);
        Nangcap23StateMachine.EnsureCanRetry(entity.Status, entity.RetryCount, maxRetries, EntityLabel);

        entity.RetryCount++;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        var result = await _client.SubmitAsync(entity.PayloadJson);
        if (result.Acknowledged)
        {
            entity.Status = 2;
            entity.AcknowledgedAt = DateTime.UtcNow;
            entity.GatewayTransactionId = result.TransactionId;
            entity.ResponseJson = result.RawResponse;
            entity.ErrorCode = null;
            entity.ErrorMessage = null;
        }
        else
        {
            entity.Status = result.ErrorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN" ? 1 : 3;
            entity.ErrorCode = result.ErrorCode;
            entity.ErrorMessage = result.ErrorMessage;
            entity.ResponseJson = result.RawResponse;
        }
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<NationalPrescriptionSubmissionDto?> CancelAsync(Guid id, string? userId)
    {
        var entity = await _db.NationalPrescriptionSubmissions.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        Nangcap23StateMachine.EnsureCanCancel(entity.Status, EntityLabel);
        entity.Status = 4;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<NationalGatewayConfigDto> GetConfigAsync()
    {
        // Đọc từ SystemConfig, fallback appsettings → môi trường bất kỳ đều có giá trị
        return new NationalGatewayConfigDto
        {
            NationalPrescriptionBaseUrl = await _configStore.GetOrFallbackAsync("NangCap23.NationalGateway.Prescription.BaseUrl", "https://donthuocquocgia.vn") ?? "https://donthuocquocgia.vn",
            NationalPharmacyBaseUrl = await _configStore.GetOrFallbackAsync("NangCap23.NationalGateway.Pharmacy.BaseUrl", "https://duocquocgia.com.vn") ?? "https://duocquocgia.com.vn",
            FacilityCode = await _configStore.GetOrFallbackAsync("NangCap23.NationalGateway.FacilityCode", "BV-DEMO-01") ?? "BV-DEMO-01",
            FacilityName = await _configStore.GetOrFallbackAsync("NangCap23.NationalGateway.FacilityName", "Bệnh viện Demo") ?? "Bệnh viện Demo",
            MockMode = await _configStore.GetBoolAsync("NangCap23.NationalGateway.MockMode", _config.GetValue<bool>("NationalGateway:MockMode", false)),
            AutoSubmit = await _configStore.GetBoolAsync("NangCap23.NationalGateway.AutoSubmit", false),
            RetryCount = await _configStore.GetIntAsync("NangCap23.NationalGateway.RetryCount", 3),
            TimeoutSeconds = await _configStore.GetIntAsync("NangCap23.NationalGateway.TimeoutSeconds", 30)
        };
    }

    public async Task<bool> SaveConfigAsync(NationalGatewayConfigDto config, string? userId)
    {
        // Whitelist + validation trước khi persist (chống SSRF qua admin endpoint).
        Nangcap23ConfigValidator.ValidateNationalGateway(config);
        var pairs = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["NangCap23.NationalGateway.Prescription.BaseUrl"] = config.NationalPrescriptionBaseUrl,
            ["NangCap23.NationalGateway.Pharmacy.BaseUrl"] = config.NationalPharmacyBaseUrl,
            ["NangCap23.NationalGateway.FacilityCode"] = config.FacilityCode,
            ["NangCap23.NationalGateway.FacilityName"] = config.FacilityName,
            ["NangCap23.NationalGateway.MockMode"] = config.MockMode.ToString(),
            ["NangCap23.NationalGateway.AutoSubmit"] = config.AutoSubmit.ToString(),
            ["NangCap23.NationalGateway.RetryCount"] = config.RetryCount.ToString(),
            ["NangCap23.NationalGateway.TimeoutSeconds"] = config.TimeoutSeconds.ToString(),
        };
        var n = await _configStore.SaveAsync(pairs, userId);
        _logger.LogInformation("NationalGateway config saved by {User}, {Count} keys upserted", userId ?? "?", n);
        return true;
    }

    public Task<bool> TestConnectionAsync() => _client.PingAsync();
}

