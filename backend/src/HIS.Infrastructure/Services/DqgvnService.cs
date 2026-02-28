using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.DQGVN;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// DQGVN - Cong du lieu y te quoc gia (Vietnam National Health Data Exchange)
/// Service implementation with real EF Core queries and HTTP submission.
/// When DQGVN gateway is not configured, operates in mock/offline mode (stores submissions locally).
/// </summary>
public class DqgvnService : IDqgvnService
{
    private readonly HISDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DqgvnService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public DqgvnService(
        HISDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<DqgvnService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    // ==================== Dashboard ====================

    public async Task<DqgvnDashboardDto> GetDashboardAsync()
    {
        try
        {
            var submissions = _context.DqgvnSubmissions.IgnoreQueryFilters()
                .Where(s => !s.IsDeleted);

            var totalCount = await submissions.CountAsync();
            var pendingCount = await submissions.CountAsync(s => s.Status == 0);
            var submittedCount = await submissions.CountAsync(s => s.Status == 1);
            var acceptedCount = await submissions.CountAsync(s => s.Status == 2);
            var rejectedCount = await submissions.CountAsync(s => s.Status == 3);
            var errorCount = await submissions.CountAsync(s => s.Status == 4);

            var acceptanceRate = (submittedCount + acceptedCount + rejectedCount) > 0
                ? (double)acceptedCount / (submittedCount + acceptedCount + rejectedCount) * 100.0
                : 0.0;

            // Group by submission type
            var byType = await submissions
                .GroupBy(s => s.SubmissionType)
                .Select(g => new DqgvnSubmissionSummary
                {
                    SubmissionType = (DqgvnSubmissionType)g.Key,
                    TypeName = GetSubmissionTypeName((DqgvnSubmissionType)g.Key),
                    Count = g.Count(),
                    AcceptedCount = g.Count(s => s.Status == 2)
                })
                .OrderBy(s => s.SubmissionType)
                .ToListAsync();

            // Last 7 days trend
            var sevenDaysAgo = DateTime.UtcNow.AddDays(-7).Date;
            var dailyData = await submissions
                .Where(s => s.CreatedAt >= sevenDaysAgo)
                .GroupBy(s => s.CreatedAt.Date)
                .Select(g => new DqgvnDailyCount
                {
                    Date = g.Key,
                    Count = g.Count(),
                    AcceptedCount = g.Count(s => s.Status == 2)
                })
                .OrderBy(d => d.Date)
                .ToListAsync();

            // Fill in missing days with zeros
            var last7Days = new List<DqgvnDailyCount>();
            for (int i = 6; i >= 0; i--)
            {
                var date = DateTime.UtcNow.AddDays(-i).Date;
                var existing = dailyData.FirstOrDefault(d => d.Date.Date == date);
                last7Days.Add(existing ?? new DqgvnDailyCount { Date = date, Count = 0, AcceptedCount = 0 });
            }

            return new DqgvnDashboardDto
            {
                TotalSubmissions = totalCount,
                PendingCount = pendingCount,
                SubmittedCount = submittedCount,
                AcceptedCount = acceptedCount,
                RejectedCount = rejectedCount,
                ErrorCount = errorCount,
                AcceptanceRate = Math.Round(acceptanceRate, 1),
                ByType = byType,
                Last7Days = last7Days
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning("DqgvnSubmissions table not yet created: {Message}", ex.Message);
            return new DqgvnDashboardDto();
        }
    }

    // ==================== Search Submissions ====================

    public async Task<DqgvnSubmissionPagedResult> SearchSubmissionsAsync(DqgvnSubmissionSearchDto search)
    {
        try
        {
            var query = _context.DqgvnSubmissions
                .Include(s => s.Patient)
                .AsNoTracking();

            if (search.SubmissionType.HasValue)
                query = query.Where(s => s.SubmissionType == (int)search.SubmissionType.Value);

            if (search.Status.HasValue)
                query = query.Where(s => s.Status == search.Status.Value);

            if (search.DateFrom.HasValue)
                query = query.Where(s => s.CreatedAt >= search.DateFrom.Value);

            if (search.DateTo.HasValue)
                query = query.Where(s => s.CreatedAt <= search.DateTo.Value.AddDays(1));

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var kw = search.Keyword.Trim().ToLower();
                query = query.Where(s =>
                    (s.Patient != null && s.Patient.FullName.ToLower().Contains(kw)) ||
                    (s.TransactionId != null && s.TransactionId.Contains(kw)) ||
                    (s.ErrorMessage != null && s.ErrorMessage.ToLower().Contains(kw)));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .Select(s => new DqgvnSubmissionDto
                {
                    Id = s.Id,
                    SubmissionType = (DqgvnSubmissionType)s.SubmissionType,
                    PatientId = s.PatientId,
                    PatientName = s.Patient != null ? s.Patient.FullName : null,
                    SourceEntityId = s.SourceEntityId,
                    RequestPayload = s.RequestPayload,
                    ResponsePayload = s.ResponsePayload,
                    Status = s.Status,
                    ErrorMessage = s.ErrorMessage,
                    TransactionId = s.TransactionId,
                    RetryCount = s.RetryCount,
                    CreatedAt = s.CreatedAt,
                    SubmittedAt = s.SubmittedAt,
                    ResponseAt = s.ResponseAt
                })
                .ToListAsync();

            return new DqgvnSubmissionPagedResult
            {
                Items = items,
                TotalCount = totalCount,
                PageIndex = search.PageIndex,
                PageSize = search.PageSize
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning("DqgvnSubmissions table not yet created: {Message}", ex.Message);
            return new DqgvnSubmissionPagedResult { PageIndex = search.PageIndex, PageSize = search.PageSize };
        }
    }

    // ==================== Get Single Submission ====================

    public async Task<DqgvnSubmissionDto?> GetSubmissionAsync(Guid submissionId)
    {
        try
        {
            var s = await _context.DqgvnSubmissions
                .Include(x => x.Patient)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == submissionId);

            if (s == null) return null;

            return new DqgvnSubmissionDto
            {
                Id = s.Id,
                SubmissionType = (DqgvnSubmissionType)s.SubmissionType,
                PatientId = s.PatientId,
                PatientName = s.Patient?.FullName,
                SourceEntityId = s.SourceEntityId,
                RequestPayload = s.RequestPayload,
                ResponsePayload = s.ResponsePayload,
                Status = s.Status,
                ErrorMessage = s.ErrorMessage,
                TransactionId = s.TransactionId,
                RetryCount = s.RetryCount,
                CreatedAt = s.CreatedAt,
                SubmittedAt = s.SubmittedAt,
                ResponseAt = s.ResponseAt
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning("DqgvnSubmissions table not yet created: {Message}", ex.Message);
            return null;
        }
    }

    // ==================== Submit Patient Demographics ====================

    public async Task<DqgvnSubmitResult> SubmitPatientAsync(Guid patientId, string userId)
    {
        var patient = await _context.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == patientId);

        if (patient == null)
            return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay benh nhan" };

        var config = GetConfig();

        // Build DQGVN patient demographics payload per Vietnamese standard
        var payload = new Dictionary<string, object?>
        {
            ["maCSKCB"] = config.FacilityCode,
            ["tenCSKCB"] = config.FacilityName,
            ["maBN"] = patient.PatientCode,
            ["hoTen"] = patient.FullName,
            ["ngaySinh"] = patient.DateOfBirth?.ToString("dd/MM/yyyy") ?? patient.YearOfBirth?.ToString(),
            ["gioiTinh"] = patient.Gender, // 1-Nam, 2-Nu, 3-Khac
            ["soCCCD"] = patient.IdentityNumber,
            ["soDienThoai"] = patient.PhoneNumber,
            ["email"] = patient.Email,
            ["diaChi"] = patient.Address,
            ["maXaPhuong"] = patient.WardCode,
            ["maQuanHuyen"] = patient.DistrictCode,
            ["maTinhTP"] = patient.ProvinceCode,
            ["maDanToc"] = patient.EthnicCode,
            ["tenDanToc"] = patient.EthnicName,
            ["maQuocTich"] = patient.NationalityCode,
            ["ngheNghiep"] = patient.Occupation,
            ["noiLamViec"] = patient.Workplace,
            ["soTheBHYT"] = patient.InsuranceNumber,
            ["ngayHetHanBHYT"] = patient.InsuranceExpireDate?.ToString("dd/MM/yyyy"),
            ["maCSKCBBanDau"] = patient.InsuranceFacilityCode,
            ["nguoiGiamHo"] = patient.GuardianName,
            ["sdtGiamHo"] = patient.GuardianPhone,
            ["quanHeGiamHo"] = patient.GuardianRelationship,
            ["tienSuBenh"] = patient.MedicalHistory,
            ["diUng"] = patient.AllergyHistory
        };

        var submission = await CreateSubmissionAsync(
            DqgvnSubmissionType.PatientDemographics,
            patientId,
            null,
            payload,
            userId);

        return await SendSubmissionAsync(submission, config);
    }

    // ==================== Submit Encounter (OPD/IPD) ====================

    public async Task<DqgvnSubmitResult> SubmitEncounterAsync(SubmitEncounterRequest request, string userId)
    {
        var patient = await _context.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.PatientId);

        if (patient == null)
            return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay benh nhan" };

        var config = GetConfig();
        Guid? sourceEntityId = null;

        var payload = new Dictionary<string, object?>
        {
            ["maCSKCB"] = config.FacilityCode,
            ["tenCSKCB"] = config.FacilityName,
            ["maBN"] = patient.PatientCode,
            ["hoTen"] = patient.FullName,
            ["ngaySinh"] = patient.DateOfBirth?.ToString("dd/MM/yyyy"),
            ["gioiTinh"] = patient.Gender,
            ["soCCCD"] = patient.IdentityNumber,
            ["soTheBHYT"] = patient.InsuranceNumber
        };

        // OPD encounter
        if (request.ExaminationId.HasValue)
        {
            sourceEntityId = request.ExaminationId.Value;
            var exam = await _context.Examinations
                .Include(e => e.Department)
                .Include(e => e.Room)
                .Include(e => e.Doctor)
                .Include(e => e.MedicalRecord)
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == request.ExaminationId.Value);

            if (exam == null)
                return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay luot kham" };

            payload["loaiKCB"] = 1; // Ngoai tru
            payload["maHoSo"] = exam.MedicalRecord?.MedicalRecordCode;
            payload["ngayVao"] = exam.StartTime?.ToString("dd/MM/yyyy HH:mm");
            payload["ngayRa"] = exam.EndTime?.ToString("dd/MM/yyyy HH:mm");
            payload["maKhoa"] = exam.Department?.DepartmentCode;
            payload["tenKhoa"] = exam.Department?.DepartmentName;
            payload["maPhong"] = exam.Room?.RoomCode;
            payload["tenPhong"] = exam.Room?.RoomName;
            payload["maBacSi"] = exam.Doctor?.Username;
            payload["tenBacSi"] = exam.Doctor?.FullName;
            payload["lyDoKham"] = exam.ChiefComplaint;
            payload["chanDoanVao"] = exam.InitialDiagnosis;
            payload["chanDoanRa"] = exam.MainDiagnosis;
            payload["maICD"] = exam.MainIcdCode;
            payload["chanDoanPhu"] = exam.SubDiagnosis;
            payload["maICDPhu"] = exam.SubIcdCodes;
            payload["huongXuTri"] = exam.ConclusionType; // 1-Cho ve, 2-Ke don, 3-Nhap vien, 4-Chuyen vien
            payload["ghiChuKetLuan"] = exam.ConclusionNote;
            payload["ngayTaiKham"] = exam.FollowUpDate?.ToString("dd/MM/yyyy");
            payload["doiTuong"] = exam.MedicalRecord?.PatientType; // 1-BHYT, 2-Vien phi, 3-Dich vu
            payload["tuyenKCB"] = exam.MedicalRecord?.InsuranceRightRoute;

            // Vital signs
            payload["nhietDo"] = exam.Temperature;
            payload["mach"] = exam.Pulse;
            payload["huyetApTamThu"] = exam.BloodPressureSystolic;
            payload["huyetApTamTruong"] = exam.BloodPressureDiastolic;
            payload["nhipTho"] = exam.RespiratoryRate;
            payload["chieuCao"] = exam.Height;
            payload["canNang"] = exam.Weight;
            payload["spO2"] = exam.SpO2;
        }

        // IPD encounter
        if (request.AdmissionId.HasValue)
        {
            sourceEntityId = request.AdmissionId.Value;
            var admission = await _context.Admissions
                .Include(a => a.Department)
                .Include(a => a.MedicalRecord)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == request.AdmissionId.Value);

            if (admission == null)
                return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay dot nhap vien" };

            payload["loaiKCB"] = 2; // Noi tru
            payload["maHoSo"] = admission.MedicalRecord?.MedicalRecordCode;
            payload["ngayVao"] = admission.AdmissionDate.ToString("dd/MM/yyyy HH:mm");
            payload["maKhoa"] = admission.Department?.DepartmentCode;
            payload["tenKhoa"] = admission.Department?.DepartmentName;
            payload["chanDoanVao"] = admission.MedicalRecord?.InitialDiagnosis;
            payload["chanDoanRa"] = admission.MedicalRecord?.MainDiagnosis;
            payload["maICD"] = admission.MedicalRecord?.MainIcdCode;
            payload["doiTuong"] = admission.MedicalRecord?.PatientType;
            payload["tuyenKCB"] = admission.MedicalRecord?.InsuranceRightRoute;

            // Check for discharge
            var discharge = await _context.Discharges
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.AdmissionId == request.AdmissionId.Value);

            if (discharge != null)
            {
                payload["ngayRa"] = discharge.DischargeDate.ToString("dd/MM/yyyy HH:mm");
                payload["ketQuaDieuTri"] = admission.MedicalRecord?.TreatmentResult;
                payload["tinhTrangRaVien"] = admission.MedicalRecord?.DischargeType;
            }
        }

        var submission = await CreateSubmissionAsync(
            DqgvnSubmissionType.EncounterReport,
            request.PatientId,
            sourceEntityId,
            payload,
            userId);

        return await SendSubmissionAsync(submission, config);
    }

    // ==================== Submit Lab Result ====================

    public async Task<DqgvnSubmitResult> SubmitLabResultAsync(SubmitLabResultRequest request, string userId)
    {
        var labRequest = await _context.LabRequests
            .Include(r => r.Patient)
            .Include(r => r.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.LabRequestId);

        if (labRequest == null)
            return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay phieu xet nghiem" };

        var config = GetConfig();

        // Get lab results joined with request items for test names
        var itemIds = labRequest.Items.Select(i => i.Id).ToList();
        var results = await _context.LabResults
            .Where(r => itemIds.Contains(r.LabRequestItemId))
            .AsNoTracking()
            .ToListAsync();

        // Map item ID to test code/name for result display
        var itemMap = labRequest.Items.ToDictionary(i => i.Id, i => new { i.TestCode, i.TestName });

        // Determine completion date from approved results
        var completedDate = results
            .Where(r => r.ApprovedAt.HasValue)
            .Select(r => r.ApprovedAt)
            .OrderByDescending(d => d)
            .FirstOrDefault();

        var payload = new Dictionary<string, object?>
        {
            ["maCSKCB"] = config.FacilityCode,
            ["maBN"] = labRequest.Patient?.PatientCode,
            ["hoTen"] = labRequest.Patient?.FullName,
            ["maPhieuXN"] = labRequest.RequestCode,
            ["ngayChiDinh"] = labRequest.RequestDate.ToString("dd/MM/yyyy HH:mm"),
            ["ngayCoKetQua"] = completedDate?.ToString("dd/MM/yyyy HH:mm"),
            ["trangThai"] = labRequest.Status, // 0=Cho, 1=LayMau, 2=DangXL, 3=DaCoKQ, 4=DaDuyet
            ["danhSachKetQua"] = results.Select(r =>
            {
                itemMap.TryGetValue(r.LabRequestItemId, out var item);
                return new Dictionary<string, object?>
                {
                    ["maXetNghiem"] = item?.TestCode ?? r.ParameterCode,
                    ["tenXetNghiem"] = item?.TestName ?? r.ParameterName,
                    ["ketQua"] = r.ResultValue ?? r.Result,
                    ["donVi"] = r.Unit,
                    ["giaTriThamChieu"] = r.ReferenceRange,
                    ["batThuong"] = r.IsAbnormal,
                    ["ghiChu"] = r.Notes
                };
            }).ToList()
        };

        var submission = await CreateSubmissionAsync(
            DqgvnSubmissionType.LabResult,
            labRequest.PatientId,
            request.LabRequestId,
            payload,
            userId);

        return await SendSubmissionAsync(submission, config);
    }

    // ==================== Retry Submission ====================

    public async Task<DqgvnSubmitResult> RetrySubmissionAsync(Guid submissionId, string userId)
    {
        try
        {
            var submission = await _context.DqgvnSubmissions
                .FirstOrDefaultAsync(s => s.Id == submissionId);

            if (submission == null)
                return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay ban ghi gui" };

            if (submission.Status == 2) // Already accepted
                return new DqgvnSubmitResult { Success = false, ErrorMessage = "Ban ghi da duoc tiep nhan" };

            submission.RetryCount++;
            submission.Status = 0; // Reset to pending
            submission.ErrorMessage = null;
            submission.UpdatedBy = userId;
            submission.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var config = GetConfig();
            return await SendSubmissionAsync(submission, config);
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning("DqgvnSubmissions table not yet created: {Message}", ex.Message);
            return new DqgvnSubmitResult { Success = false, ErrorMessage = "Database table not available" };
        }
    }

    // ==================== Batch Submit Pending ====================

    public async Task<int> SubmitPendingBatchAsync(string userId)
    {
        try
        {
            var config = GetConfig();
            if (!config.IsEnabled)
            {
                _logger.LogInformation("DQGVN is disabled, skipping batch submit");
                return 0;
            }

            var pendingSubmissions = await _context.DqgvnSubmissions
                .Where(s => s.Status == 0 && s.RetryCount < config.RetryCount)
                .OrderBy(s => s.CreatedAt)
                .Take(50) // Batch size limit
                .ToListAsync();

            int successCount = 0;
            foreach (var submission in pendingSubmissions)
            {
                var result = await SendSubmissionAsync(submission, config);
                if (result.Success) successCount++;
            }

            _logger.LogInformation("DQGVN batch submit: {Success}/{Total} successful", successCount, pendingSubmissions.Count);
            return successCount;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning("DqgvnSubmissions table not yet created: {Message}", ex.Message);
            return 0;
        }
    }

    // ==================== Config ====================

    public Task<DqgvnConfigDto> GetConfigAsync()
    {
        return Task.FromResult(GetConfig());
    }

    public async Task SaveConfigAsync(DqgvnConfigDto config, string userId)
    {
        // Store config values in SystemConfigs table (key-value store)
        var configEntries = new Dictionary<string, string>
        {
            ["DQGVN:ApiBaseUrl"] = config.ApiBaseUrl,
            ["DQGVN:FacilityCode"] = config.FacilityCode,
            ["DQGVN:FacilityName"] = config.FacilityName,
            ["DQGVN:ProvinceCode"] = config.ProvinceCode,
            ["DQGVN:DistrictCode"] = config.DistrictCode,
            ["DQGVN:ApiKey"] = config.ApiKey,
            ["DQGVN:SecretKey"] = config.SecretKey,
            ["DQGVN:IsEnabled"] = config.IsEnabled.ToString(),
            ["DQGVN:AutoSubmit"] = config.AutoSubmit.ToString(),
            ["DQGVN:RetryCount"] = config.RetryCount.ToString(),
            ["DQGVN:TimeoutSeconds"] = config.TimeoutSeconds.ToString()
        };

        foreach (var entry in configEntries)
        {
            var existing = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == entry.Key);

            if (existing != null)
            {
                existing.ConfigValue = entry.Value;
                existing.UpdatedBy = userId;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.SystemConfigs.Add(new SystemConfig
                {
                    Id = Guid.NewGuid(),
                    ConfigKey = entry.Key,
                    ConfigValue = entry.Value,
                    ConfigType = "String",
                    Description = $"DQGVN config: {entry.Key}",
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("DQGVN config updated by user {UserId}", userId);
    }

    // ==================== Private Helpers ====================

    private DqgvnConfigDto GetConfig()
    {
        var section = _configuration.GetSection("DQGVN");
        return new DqgvnConfigDto
        {
            ApiBaseUrl = section["ApiBaseUrl"] ?? string.Empty,
            FacilityCode = section["FacilityCode"] ?? string.Empty,
            FacilityName = section["FacilityName"] ?? string.Empty,
            ProvinceCode = section["ProvinceCode"] ?? string.Empty,
            DistrictCode = section["DistrictCode"] ?? string.Empty,
            ApiKey = section["ApiKey"] ?? string.Empty,
            SecretKey = section["SecretKey"] ?? string.Empty,
            IsEnabled = bool.TryParse(section["IsEnabled"], out var enabled) && enabled,
            AutoSubmit = bool.TryParse(section["AutoSubmit"], out var auto) && auto,
            RetryCount = int.TryParse(section["RetryCount"], out var retry) ? retry : 3,
            TimeoutSeconds = int.TryParse(section["TimeoutSeconds"], out var timeout) ? timeout : 30
        };
    }

    private async Task<DqgvnSubmission> CreateSubmissionAsync(
        DqgvnSubmissionType type,
        Guid? patientId,
        Guid? sourceEntityId,
        Dictionary<string, object?> payload,
        string userId)
    {
        var submission = new DqgvnSubmission
        {
            Id = Guid.NewGuid(),
            SubmissionType = (int)type,
            PatientId = patientId,
            SourceEntityId = sourceEntityId,
            RequestPayload = JsonSerializer.Serialize(payload, JsonOptions),
            Status = 0, // Pending
            RetryCount = 0,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.DqgvnSubmissions.Add(submission);
        await _context.SaveChangesAsync();

        _logger.LogInformation("DQGVN submission created: {Id}, Type: {Type}, Patient: {PatientId}",
            submission.Id, type, patientId);

        return submission;
    }

    private async Task<DqgvnSubmitResult> SendSubmissionAsync(DqgvnSubmission submission, DqgvnConfigDto config)
    {
        var result = new DqgvnSubmitResult { SubmissionId = submission.Id };

        // If DQGVN is not configured/enabled, operate in offline mode
        if (!config.IsEnabled || string.IsNullOrWhiteSpace(config.ApiBaseUrl))
        {
            _logger.LogInformation("DQGVN offline mode - submission {Id} stored locally", submission.Id);
            result.Success = true;
            result.TransactionId = $"LOCAL-{submission.Id:N}".Substring(0, 20);

            submission.Status = 1; // Submitted (locally)
            submission.TransactionId = result.TransactionId;
            submission.SubmittedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return result;
        }

        // Send to DQGVN gateway via HTTP
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(config.TimeoutSeconds);

            if (!string.IsNullOrWhiteSpace(config.ApiKey))
                client.DefaultRequestHeaders.Add("X-API-Key", config.ApiKey);

            var endpoint = GetSubmissionEndpoint(config.ApiBaseUrl, (DqgvnSubmissionType)submission.SubmissionType);
            var content = new StringContent(submission.RequestPayload ?? "{}", System.Text.Encoding.UTF8, "application/json");

            var response = await client.PostAsync(endpoint, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            submission.SubmittedAt = DateTime.UtcNow;
            submission.ResponsePayload = responseBody;
            submission.ResponseAt = DateTime.UtcNow;

            if (response.IsSuccessStatusCode)
            {
                // Try to parse transaction ID from response
                try
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    submission.TransactionId = doc.RootElement.TryGetProperty("transactionId", out var tid)
                        ? tid.GetString()
                        : doc.RootElement.TryGetProperty("maGiaoDich", out var mgd)
                            ? mgd.GetString()
                            : $"DQGVN-{DateTime.UtcNow:yyyyMMddHHmmss}";
                }
                catch
                {
                    submission.TransactionId = $"DQGVN-{DateTime.UtcNow:yyyyMMddHHmmss}";
                }

                submission.Status = 2; // Accepted
                result.Success = true;
                result.TransactionId = submission.TransactionId;
            }
            else
            {
                submission.Status = 4; // Error
                submission.ErrorMessage = $"HTTP {(int)response.StatusCode}: {responseBody.Substring(0, Math.Min(500, responseBody.Length))}";
                result.Success = false;
                result.ErrorMessage = submission.ErrorMessage;
            }

            await _context.SaveChangesAsync();
        }
        catch (TaskCanceledException)
        {
            submission.Status = 4;
            submission.ErrorMessage = "Request timeout";
            submission.ResponseAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            result.Success = false;
            result.ErrorMessage = "Request timeout";
        }
        catch (HttpRequestException ex)
        {
            submission.Status = 4;
            submission.ErrorMessage = $"Connection error: {ex.Message}";
            submission.ResponseAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            result.Success = false;
            result.ErrorMessage = submission.ErrorMessage;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DQGVN submission {Id} failed", submission.Id);

            submission.Status = 4;
            submission.ErrorMessage = $"Unexpected error: {ex.Message}";
            submission.ResponseAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            result.Success = false;
            result.ErrorMessage = submission.ErrorMessage;
        }

        return result;
    }

    private static string GetSubmissionEndpoint(string baseUrl, DqgvnSubmissionType type)
    {
        var path = type switch
        {
            DqgvnSubmissionType.PatientDemographics => "/api/v1/patient",
            DqgvnSubmissionType.EncounterReport => "/api/v1/encounter",
            DqgvnSubmissionType.LabResult => "/api/v1/lab-result",
            DqgvnSubmissionType.RadiologyResult => "/api/v1/radiology-result",
            DqgvnSubmissionType.PrescriptionReport => "/api/v1/prescription",
            DqgvnSubmissionType.DischargeReport => "/api/v1/discharge",
            DqgvnSubmissionType.DeathReport => "/api/v1/death-report",
            DqgvnSubmissionType.InfectiousDisease => "/api/v1/infectious-disease",
            DqgvnSubmissionType.BirthReport => "/api/v1/birth-report",
            DqgvnSubmissionType.VaccinationReport => "/api/v1/vaccination",
            _ => "/api/v1/submission"
        };
        return baseUrl.TrimEnd('/') + path;
    }

    private static string GetSubmissionTypeName(DqgvnSubmissionType type) => type switch
    {
        DqgvnSubmissionType.PatientDemographics => "Thong tin BN",
        DqgvnSubmissionType.EncounterReport => "Luot kham/dieu tri",
        DqgvnSubmissionType.LabResult => "Ket qua XN",
        DqgvnSubmissionType.RadiologyResult => "Ket qua CDHA",
        DqgvnSubmissionType.PrescriptionReport => "Don thuoc",
        DqgvnSubmissionType.DischargeReport => "Ra vien",
        DqgvnSubmissionType.DeathReport => "Tu vong",
        DqgvnSubmissionType.InfectiousDisease => "Benh truyen nhiem",
        DqgvnSubmissionType.BirthReport => "Sinh",
        DqgvnSubmissionType.VaccinationReport => "Tiem chung",
        _ => "Khac"
    };
}
