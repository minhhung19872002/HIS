using HIS.Application.DTOs.HealthExchange;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Security;

namespace HIS.Infrastructure.Services;

// K7 phien 4 (2026-05-30): tach HealthExchangeServiceImpl (~409 dong) khoi ExtendedWorkflowServices.cs.
public class HealthExchangeServiceImpl : IHealthExchangeService
{
    private readonly HISDbContext _context;
    private readonly IInsuranceXmlService _insuranceXml;
    public HealthExchangeServiceImpl(HISDbContext context, IInsuranceXmlService insuranceXml)
    {
        _context = context;
        _insuranceXml = insuranceXml;
    }

    public async Task<List<HIEConnectionDto>> GetConnectionsAsync()
    {
        var list = await _context.HIEConnections.ToBoundedListAsync("HealthExchangeServiceImpl.GetConnections");
        return list.Select(e => new HIEConnectionDto
        {
            Id = e.Id,
            ConnectionName = e.ConnectionName,
            ConnectionType = e.ConnectionType,
            Endpoint = e.EndpointUrl,
            AuthMethod = e.AuthType,
            IsActive = e.IsActive,
            LastSuccessfulConnection = e.LastSuccessfulConnection,
            ConnectionStatus = e.Status,
            ErrorMessage = e.LastErrorMessage
        }).ToList();
    }

    public async Task<HIEConnectionDto> TestConnectionAsync(Guid connectionId)
    {
        var e = await _context.HIEConnections.FindAsync(connectionId);
        if (e == null) return null!;
        e.LastSuccessfulConnection = DateTime.Now;
        e.Status = "Connected";
        await _context.SaveChangesAsync();
        return new HIEConnectionDto { Id = e.Id, ConnectionName = e.ConnectionName, ConnectionStatus = "Connected", IsActive = e.IsActive };
    }

    public async Task<HIEConnectionConfigDto> SaveConnectionConfigAsync(HIEConnectionConfigDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ConnectionName) || string.IsNullOrWhiteSpace(dto.ConnectionType))
            throw new ArgumentException("Tên và loại kết nối là bắt buộc");
        // SyncAll issues an HTTP GET to this URL — accept only absolute http(s) endpoints.
        if (!Uri.TryCreate(dto.Endpoint, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            throw new ArgumentException("Endpoint phải là URL http(s) hợp lệ");
        var entity = dto.Id != Guid.Empty ? await _context.HIEConnections.FindAsync(dto.Id) : null;
        if (entity == null)
        {
            entity = new HIEConnection { Id = Guid.NewGuid() };
            _context.HIEConnections.Add(entity);
        }
        entity.ConnectionName = dto.ConnectionName;
        entity.ConnectionType = dto.ConnectionType;
        entity.EndpointUrl = dto.Endpoint;
        entity.AuthType = string.IsNullOrWhiteSpace(dto.AuthMethod) ? entity.AuthType : dto.AuthMethod;
        // Partial updates (activate/deactivate, v2 edit form) do not carry these — keep the stored values.
        entity.ClientId = dto.ClientId ?? entity.ClientId;
        entity.CertificatePath = dto.CertificatePath ?? entity.CertificatePath;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public Task<InsuranceCardLookupResultDto> LookupInsuranceCardAsync(string cardNumber)
    {
        // Insurance card lookup would integrate with BHXH portal - returns lookup result
        return Task.FromResult(new InsuranceCardLookupResultDto { CardNumber = cardNumber, IsValid = true, LookupTime = DateTime.Now });
    }

    public async Task<InsuranceXMLSubmissionDto> GenerateXMLAsync(string xmlType, DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        // R3: was a row saying "Generated" with no file behind it. Delegates to the real BHYT XML export
        // (InsuranceXmlService: validate → XML1..15 → XSD → files + InsuranceXmlBatch); SubmissionCode = batch code.
        if (toDate.Date < fromDate.Date)
            throw new ArgumentException("Đến ngày phải sau từ ngày.");
        var config = new HIS.Application.DTOs.Insurance.XmlExportConfigDto
        {
            Month = fromDate.Month,
            Year = fromDate.Year,
            FromDate = fromDate.Date,
            ToDate = toDate.Date,
            DepartmentId = departmentId,
            ValidateBeforeExport = true,
        };
        var preview = await _insuranceXml.PreviewExportAsync(new HIS.Application.DTOs.Insurance.XmlExportConfigDto
        {
            Month = config.Month, Year = config.Year, FromDate = config.FromDate, ToDate = config.ToDate,
            DepartmentId = departmentId, ValidateBeforeExport = false,
        });
        var export = await _insuranceXml.ExportXmlAsync(config);
        var ok = export.BatchId != Guid.Empty;

        var entity = new InsuranceXMLSubmission
        {
            Id = Guid.NewGuid(),
            SubmissionCode = ok ? export.BatchCode : $"XML{DateTime.Now:yyyyMMddHHmmss}",
            XMLType = xmlType,
            PeriodFrom = fromDate,
            PeriodTo = toDate,
            DepartmentId = departmentId,
            GeneratedAt = DateTime.Now,
            TotalRecords = export.TotalRecords,
            TotalAmount = preview.TotalCostAmount,
            FilePath = export.FilePath,
            Status = ok ? "Generated" : "Rejected",
            RejectedRecords = ok ? null : export.FailedRecords,
            RejectionReasons = ok ? null : Truncate(string.Join("; ", export.Errors.Select(e => $"{e.MaLk} {e.ErrorMessage}".Trim())), 2000),
        };
        _context.InsuranceXMLSubmissions.Add(entity);
        await _context.SaveChangesAsync();
        return new InsuranceXMLSubmissionDto
        {
            Id = entity.Id, SubmissionCode = entity.SubmissionCode, XMLType = xmlType, FromDate = fromDate, ToDate = toDate,
            Status = entity.Status, GeneratedAt = entity.GeneratedAt, RecordCount = entity.TotalRecords,
            TotalAmount = entity.TotalAmount, InsuranceClaimAmount = preview.TotalInsuranceAmount,
            IsValid = ok, ErrorCount = export.Errors.Count,
        };
    }

    private static string? Truncate(string? s, int max) => s == null || s.Length <= max ? s : s[..max];

    public async Task<InsuranceXMLSubmissionDto> ValidateXMLAsync(Guid submissionId)
    {
        var e = await _context.InsuranceXMLSubmissions.FindAsync(submissionId);
        if (e == null) return null!;
        e.Status = "Validated";
        await _context.SaveChangesAsync();
        return new InsuranceXMLSubmissionDto { Id = e.Id, SubmissionCode = e.SubmissionCode, XMLType = e.XMLType, Status = "Validated", IsValid = true };
    }

    public async Task<InsuranceXMLSubmissionDto> SubmitXMLAsync(Guid submissionId)
    {
        var e = await _context.InsuranceXMLSubmissions.FindAsync(submissionId);
        if (e == null) return null!;
        // R3: was a status flip with nothing sent. Submit the export batch behind this row through the BHXH portal
        // path (duplicate-guarded, gateway mock-mode respected).
        var batchId = await _context.Set<InsuranceXmlBatch>().AsNoTracking()
            .Where(b => b.BatchCode == e.SubmissionCode && !b.IsDeleted)
            .Select(b => (Guid?)b.Id)
            .FirstOrDefaultAsync();
        if (batchId == null)
            throw new InvalidOperationException(
                $"Lượt {e.SubmissionCode} không có đợt XML đã xuất (trạng thái {e.Status}) — tạo lại XML trước khi gửi.");

        var result = await _insuranceXml.SubmitToInsurancePortalAsync(
            new HIS.Application.DTOs.Insurance.SubmitToInsurancePortalDto { BatchId = batchId.Value });
        e.PortalTransactionId = result.TransactionId;
        e.PortalResponse = Truncate(result.Message, 2000);
        if (result.Success)
        {
            e.Status = "Submitted";
            e.SubmittedAt = DateTime.Now;
        }
        await _context.SaveChangesAsync();
        if (!result.Success)
            throw new InvalidOperationException(result.Message ?? "Gửi cổng BHXH thất bại.");
        return new InsuranceXMLSubmissionDto { Id = e.Id, SubmissionCode = e.SubmissionCode, XMLType = e.XMLType, Status = e.Status, SubmissionDate = e.SubmittedAt ?? DateTime.Now, BHXHTransactionId = result.TransactionId ?? string.Empty };
    }

    public async Task<InsuranceXMLSubmissionDto> GetSubmissionStatusAsync(Guid submissionId)
    {
        var e = await _context.InsuranceXMLSubmissions.FindAsync(submissionId);
        if (e == null) return null!;
        return new InsuranceXMLSubmissionDto { Id = e.Id, SubmissionCode = e.SubmissionCode, XMLType = e.XMLType, Status = e.Status, RecordCount = e.TotalRecords, TotalAmount = e.TotalAmount };
    }

    public async Task<List<InsuranceXMLSubmissionDto>> GetSubmissionsAsync(DateTime fromDate, DateTime toDate, string? status = null)
    {
        var query = _context.InsuranceXMLSubmissions.Where(x => x.GeneratedAt >= fromDate && x.GeneratedAt <= toDate);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.GeneratedAt).ToBoundedListAsync("HealthExchange.GetSubmissions");
        return list.Select(e => new InsuranceXMLSubmissionDto { Id = e.Id, SubmissionCode = e.SubmissionCode, XMLType = e.XMLType, FromDate = e.PeriodFrom, ToDate = e.PeriodTo, Status = e.Status, RecordCount = e.TotalRecords, TotalAmount = e.TotalAmount, GeneratedAt = e.GeneratedAt }).ToList();
    }

    public Task<InsuranceAuditResultDto> GetAuditResultAsync(string submissionId)
    {
        return Task.FromResult(new InsuranceAuditResultDto { SubmissionId = submissionId, AuditDate = DateTime.Today });
    }

    public async Task<ElectronicHealthRecordDto> GetEHRAsync(string patientIdNumber)
    {
        var patient = await _context.Patients
            .Where(p => !p.IsDeleted)
            .FindByIdentityNumberDecryptedAsync(patientIdNumber);
        if (patient == null) return null!;
        return new ElectronicHealthRecordDto { PatientId = patientIdNumber, FullName = patient.FullName, DateOfBirth = patient.DateOfBirth ?? DateTime.MinValue, Gender = patient.Gender == 1 ? "Nam" : "Nữ", Address = patient.Address, Phone = patient.PhoneNumber };
    }

    public Task<bool> UpdateEHRAsync(ElectronicHealthRecordDto dto) => Task.FromResult(true);

    public Task<PatientConsentDto> GetPatientConsentAsync(Guid patientId)
    {
        return Task.FromResult(new PatientConsentDto { PatientId = patientId, IsActive = true, ConsentType = "FullAccess" });
    }

    public Task<PatientConsentDto> RecordPatientConsentAsync(PatientConsentDto dto)
    {
        dto.Id = Guid.NewGuid();
        dto.RecordedAt = DateTime.Now;
        return Task.FromResult(dto);
    }

    public Task<bool> RevokeConsentAsync(Guid consentId, string reason) => Task.FromResult(true);

    public async Task<List<ElectronicReferralDto>> GetOutgoingReferralsAsync(DateTime fromDate, DateTime toDate, string? status = null)
    {
        var query = _context.ElectronicReferrals.Include(x => x.Patient).Where(x => x.SentAt >= fromDate && x.SentAt <= toDate);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.SentAt).ToBoundedListAsync("HealthExchange.OutgoingReferrals");
        return list.Select(e => new ElectronicReferralDto
        {
            Id = e.Id,
            ReferralCode = e.ReferralCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            SourceFacilityCode = e.FromFacilityCode,
            SourceFacilityName = e.FromFacilityName,
            DestinationFacilityCode = e.ToFacilityCode,
            DestinationFacilityName = e.ToFacilityName,
            PrimaryDiagnosis = e.Diagnosis,
            ReasonForReferral = e.ReferralReason,
            Status = e.Status,
            SentAt = e.SentAt,
            ReferralDate = e.SentAt
        }).ToList();
    }

    public async Task<List<ElectronicReferralDto>> GetIncomingReferralsAsync(DateTime fromDate, DateTime toDate, string? status = null)
    {
        var query = _context.ElectronicReferrals.Include(x => x.Patient).Where(x => x.ReceivedAt >= fromDate && x.ReceivedAt <= toDate);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.ReceivedAt).ToBoundedListAsync("HealthExchange.IncomingReferrals");
        return list.Select(e => new ElectronicReferralDto
        {
            Id = e.Id,
            ReferralCode = e.ReferralCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            SourceFacilityCode = e.FromFacilityCode,
            SourceFacilityName = e.FromFacilityName,
            DestinationFacilityCode = e.ToFacilityCode,
            DestinationFacilityName = e.ToFacilityName,
            PrimaryDiagnosis = e.Diagnosis,
            ReasonForReferral = e.ReferralReason,
            Status = e.Status,
            ReceivedAt = e.ReceivedAt,
            ReferralDate = e.SentAt
        }).ToList();
    }

    public async Task<ElectronicReferralDto> GetReferralAsync(Guid id)
    {
        var e = await _context.ElectronicReferrals.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new ElectronicReferralDto
        {
            Id = e.Id,
            ReferralCode = e.ReferralCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            SourceFacilityCode = e.FromFacilityCode,
            SourceFacilityName = e.FromFacilityName,
            DestinationFacilityCode = e.ToFacilityCode,
            DestinationFacilityName = e.ToFacilityName,
            PrimaryDiagnosis = e.Diagnosis,
            ClinicalSummary = e.ClinicalSummary,
            TreatmentProvided = e.TreatmentGiven,
            ReasonForReferral = e.ReferralReason,
            Status = e.Status,
            SentAt = e.SentAt,
            ReceivedAt = e.ReceivedAt,
            ReferralDate = e.SentAt
        };
    }

    public async Task<ElectronicReferralDto> CreateReferralAsync(CreateElectronicReferralDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DestinationFacilityCode))
            throw new ArgumentException("Cơ sở tiếp nhận là bắt buộc", nameof(dto.DestinationFacilityCode));
        if (string.IsNullOrWhiteSpace(dto.PrimaryDiagnosis))
            throw new ArgumentException("Chẩn đoán là bắt buộc", nameof(dto.PrimaryDiagnosis));
        if (string.IsNullOrWhiteSpace(dto.ReasonForReferral))
            throw new ArgumentException("Lý do chuyển viện là bắt buộc", nameof(dto.ReasonForReferral));
        // Unknown patient → FK violation (500).
        if (!await _context.Patients.AnyAsync(p => p.Id == dto.PatientId && !p.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy người bệnh");
        // Duplicate referral: same patient to the same facility while one is still open.
        if (await _context.ElectronicReferrals.AnyAsync(r => !r.IsDeleted && r.PatientId == dto.PatientId
                && r.ToFacilityCode == dto.DestinationFacilityCode && (r.Status == "Draft" || r.Status == "Sent" || r.Status == "Received")))
            throw new InvalidOperationException("Người bệnh đã có phiếu chuyển viện tới cơ sở này đang xử lý.");

        var entity = new ElectronicReferral
        {
            Id = Guid.NewGuid(),
            ReferralCode = $"REF{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = dto.PatientId,
            AdmissionId = dto.AdmissionId,
            ToFacilityCode = dto.DestinationFacilityCode,
            ToFacilityName = dto.DestinationFacilityCode,
            ToDepartment = dto.DestinationDepartment,
            Diagnosis = dto.PrimaryDiagnosis,
            IcdCodes = dto.DiagnosisICD,
            ClinicalSummary = dto.ClinicalSummary,
            TreatmentGiven = dto.TreatmentProvided,
            ReferralReason = dto.ReasonForReferral,
            FromFacilityCode = "CURRENT",
            FromFacilityName = "Bệnh viện HIS",
            ReferredById = Guid.Empty,
            Status = "Draft",
            SentAt = DateTime.Now
        };
        _context.ElectronicReferrals.Add(entity);
        await _context.SaveChangesAsync();
        return new ElectronicReferralDto { Id = entity.Id, ReferralCode = entity.ReferralCode, PatientId = entity.PatientId, Status = "Draft" };
    }

    public async Task<ElectronicReferralDto> SendReferralAsync(Guid id)
    {
        var e = await _context.ElectronicReferrals.FindAsync(id);
        if (e == null) return null!;
        if (e.Status != "Draft")
            throw new InvalidOperationException($"Phiếu chuyển viện đang ở trạng thái \"{e.Status}\", không gửi lại được.");
        e.Status = "Sent";
        e.SentAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new ElectronicReferralDto { Id = e.Id, ReferralCode = e.ReferralCode, Status = "Sent", SentAt = e.SentAt };
    }

    public async Task<bool> AcceptReferralAsync(Guid id, string notes)
    {
        var e = await _context.ElectronicReferrals.FindAsync(id);
        if (e == null) return false;
        e.Status = "Accepted";
        e.ResponseAt = DateTime.Now;
        e.ResponseMessage = notes;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RejectReferralAsync(Guid id, string reason)
    {
        var e = await _context.ElectronicReferrals.FindAsync(id);
        if (e == null) return false;
        e.Status = "Declined";
        e.ResponseAt = DateTime.Now;
        e.ResponseMessage = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<TeleconsultationRequestDto>> GetTeleconsultationRequestsAsync(string? status = null)
    {
        var query = _context.TeleconsultationRequests.Include(x => x.Patient).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.CreatedAt).ToBoundedListAsync("HealthExchange.TeleconsultationRequests");
        return list.Select(e => new TeleconsultationRequestDto
        {
            Id = e.Id,
            RequestCode = e.RequestCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            RequestingFacilityCode = e.RequestingFacilityCode,
            RequestingFacilityName = e.RequestingFacilityName,
            ConsultingFacilityCode = e.ConsultingFacilityCode,
            ConsultingFacilityName = e.ConsultingFacilityName,
            ConsultingSpecialty = e.ConsultingSpecialty,
            PrimaryDiagnosis = e.Diagnosis,
            ClinicalQuestion = e.ConsultationQuestion,
            Urgency = e.Urgency,
            Status = e.Status,
            ScheduledTime = e.ScheduledDateTime,
            VideoRoomUrl = e.SessionUrl,
            CreatedAt = e.CreatedAt
        }).ToList();
    }

    public async Task<TeleconsultationRequestDto> GetTeleconsultationAsync(Guid id)
    {
        var e = await _context.TeleconsultationRequests.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new TeleconsultationRequestDto
        {
            Id = e.Id,
            RequestCode = e.RequestCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            RequestingFacilityCode = e.RequestingFacilityCode,
            RequestingFacilityName = e.RequestingFacilityName,
            ConsultingFacilityCode = e.ConsultingFacilityCode,
            ConsultingFacilityName = e.ConsultingFacilityName,
            ConsultingSpecialty = e.ConsultingSpecialty,
            PrimaryDiagnosis = e.Diagnosis,
            ClinicalQuestion = e.ConsultationQuestion,
            Urgency = e.Urgency,
            Status = e.Status,
            ScheduledTime = e.ScheduledDateTime,
            ConsultationNotes = e.ConsultationOpinion,
            Recommendations = e.Recommendations,
            AssignedConsultant = e.ConsultantName,
            CreatedAt = e.CreatedAt
        };
    }

    public async Task<TeleconsultationRequestDto> CreateTeleconsultationAsync(CreateTeleconsultationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ConsultingFacilityCode))
            throw new ArgumentException("Cơ sở hội chẩn là bắt buộc", nameof(dto.ConsultingFacilityCode));
        if (!await _context.Patients.AnyAsync(p => p.Id == dto.PatientId && !p.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy người bệnh");
        if (dto.PreferredTime.HasValue && dto.PreferredTime.Value.Date < DateTime.Today)
            throw new ArgumentException("Thời gian mong muốn không được ở quá khứ", nameof(dto.PreferredTime));

        var entity = new TeleconsultationRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"TC{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = dto.PatientId,
            RequestingFacilityCode = "CURRENT",
            RequestingFacilityName = "Bệnh viện HIS",
            RequestedById = Guid.Empty,
            ConsultingFacilityCode = dto.ConsultingFacilityCode,
            ConsultingFacilityName = dto.ConsultingFacilityCode,
            ConsultingSpecialty = dto.ConsultingSpecialty,
            CaseDescription = dto.PatientHistory ?? "",
            Diagnosis = dto.PrimaryDiagnosis,
            ConsultationQuestion = dto.ClinicalQuestion ?? "",
            Urgency = dto.Urgency ?? "Routine",
            Status = "Requested",
            ScheduledDateTime = dto.PreferredTime,
            CreatedAt = DateTime.Now
        };
        _context.TeleconsultationRequests.Add(entity);
        await _context.SaveChangesAsync();
        return new TeleconsultationRequestDto { Id = entity.Id, RequestCode = entity.RequestCode, PatientId = entity.PatientId, Status = "Requested" };
    }

    public async Task<TeleconsultationRequestDto> RespondToTeleconsultationAsync(Guid id, string notes, string recommendations)
    {
        var e = await _context.TeleconsultationRequests.FindAsync(id);
        if (e == null) return null!;
        e.ConsultationOpinion = notes;
        e.Recommendations = recommendations;
        e.Status = "Completed";
        e.EndedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new TeleconsultationRequestDto { Id = e.Id, RequestCode = e.RequestCode, Status = "Completed", ConsultationNotes = notes, Recommendations = recommendations };
    }

    // QA-R3: v2 "Tham gia" called POST teleconsults/{id}/start which did not exist (404) — no room was ever opened.
    // Same idea as telemedicine: a Jitsi room per request, persisted so both sides re-join the same URL.
    public async Task<TeleconsultationRequestDto?> StartTeleconsultationAsync(Guid id, string roomUrl)
    {
        var e = await _context.TeleconsultationRequests.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (e == null) return null;
        if (e.Status is "Completed" or "Cancelled")
            throw new InvalidOperationException($"Yêu cầu hội chẩn đã {(e.Status == "Completed" ? "hoàn thành" : "hủy")} — không mở phòng họp được");
        if (string.IsNullOrEmpty(e.SessionUrl)) e.SessionUrl = roomUrl;
        if (e.Status != "InProgress")
        {
            e.Status = "InProgress";
            e.StartedAt ??= DateTime.Now;
        }
        e.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new TeleconsultationRequestDto
        {
            Id = e.Id, RequestCode = e.RequestCode, PatientId = e.PatientId, Status = e.Status,
            VideoRoomUrl = e.SessionUrl, ScheduledTime = e.ScheduledDateTime, CreatedAt = e.CreatedAt,
        };
    }

    // QA-R3: v2 "In giấy chuyển tuyến" called GET referrals/{id}/print which did not exist (404).
    public async Task<string?> BuildReferralLetterHtmlAsync(Guid referralId)
    {
        var e = await _context.ElectronicReferrals.AsNoTracking().Include(x => x.Patient)
            .FirstOrDefaultAsync(x => x.Id == referralId && !x.IsDeleted);
        if (e == null) return null;
        static string H(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "");
        static string Multi(string? s) => H(s).Replace("\n", "<br/>");
        var p = e.Patient;
        var dob = p?.DateOfBirth?.ToString("dd/MM/yyyy") ?? p?.YearOfBirth?.ToString() ?? "";
        var gender = p?.Gender == 1 ? "Nam" : p?.Gender == 2 ? "Nữ" : "";
        var date = e.SentAt == default ? DateTime.Now : e.SentAt;
        return $@"<!DOCTYPE html><html lang=""vi""><head><meta charset=""utf-8""/><title>Giấy chuyển tuyến {H(e.ReferralCode)}</title>
<style>body{{font-family:'Times New Roman',serif;font-size:13pt;margin:24px 40px;color:#000}}h2{{text-align:center;margin:8px 0}}
.hd{{display:flex;justify-content:space-between}}.row{{margin:6px 0}}.lbl{{font-weight:bold}}.sign{{display:flex;justify-content:space-between;margin-top:40px;text-align:center}}
@media print{{body{{margin:10mm}}}}</style></head><body>
<div class=""hd""><div>{H(e.FromFacilityName)}<br/>Số: {H(e.ReferralCode)}</div><div style=""text-align:center""><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br/>Độc lập - Tự do - Hạnh phúc</div></div>
<h2>GIẤY CHUYỂN TUYẾN KHÁM BỆNH, CHỮA BỆNH</h2>
<div class=""row"">Kính gửi: <b>{H(e.ToFacilityName)}</b>{(string.IsNullOrWhiteSpace(e.ToDepartment) ? "" : " — " + H(e.ToDepartment))}</div>
<div class=""row""><span class=""lbl"">Họ và tên người bệnh:</span> {H(p?.FullName)} &nbsp; <span class=""lbl"">Giới:</span> {gender} &nbsp; <span class=""lbl"">Ngày sinh:</span> {H(dob)}</div>
<div class=""row""><span class=""lbl"">Mã người bệnh:</span> {H(p?.PatientCode)} &nbsp; <span class=""lbl"">Số thẻ BHYT:</span> {H(p?.InsuranceNumber)}</div>
<div class=""row""><span class=""lbl"">Địa chỉ:</span> {H(p?.Address)}</div>
<div class=""row""><span class=""lbl"">Chẩn đoán:</span> {H(e.Diagnosis)}{(string.IsNullOrWhiteSpace(e.IcdCodes) ? "" : " (ICD-10: " + H(e.IcdCodes) + ")")}</div>
<div class=""row""><span class=""lbl"">Tóm tắt dấu hiệu lâm sàng, kết quả cận lâm sàng:</span><br/>{Multi(e.ClinicalSummary)}</div>
<div class=""row""><span class=""lbl"">Phương pháp, thủ thuật, thuốc đã điều trị:</span><br/>{Multi(e.TreatmentGiven)}</div>
<div class=""row""><span class=""lbl"">Lý do chuyển tuyến:</span> {Multi(e.ReferralReason)}</div>
<div class=""sign""><div><b>Người bệnh / người nhà</b><br/><i>(Ký, ghi rõ họ tên)</i></div>
<div>Ngày {date:dd} tháng {date:MM} năm {date:yyyy}<br/><b>Người đề nghị chuyển tuyến</b><br/><i>(Ký, ghi rõ họ tên)</i></div></div>
</body></html>";
    }

    public Task<HealthAuthorityReportDto> GenerateAuthorityReportAsync(string reportType, DateTime fromDate, DateTime toDate)
    {
        return Task.FromResult(new HealthAuthorityReportDto { Id = Guid.NewGuid(), ReportCode = $"RPT{DateTime.Now:yyyyMMddHHmmss}", ReportType = reportType, ReportPeriodFrom = fromDate, ReportPeriodTo = toDate, Status = "Draft", GeneratedAt = DateTime.Now });
    }

    public Task<HealthAuthorityReportDto> SubmitAuthorityReportAsync(Guid reportId)
    {
        return Task.FromResult(new HealthAuthorityReportDto { Id = reportId, Status = "Submitted", SubmittedAt = DateTime.Now });
    }

    public Task<InfectiousDiseaseReportDto> SubmitInfectiousDiseaseReportAsync(InfectiousDiseaseReportDto dto)
    {
        dto.Id = Guid.NewGuid();
        dto.Status = "Submitted";
        dto.SubmittedAt = DateTime.Now;
        return Task.FromResult(dto);
    }

    public async Task<HIEDashboardDto> GetDashboardAsync()
    {
        try
        {
            var connections = await _context.HIEConnections.ToListAsync();
            var submissions = await _context.InsuranceXMLSubmissions.Where(x => x.GeneratedAt.Month == DateTime.Now.Month).ToListAsync();
            var referrals = await _context.ElectronicReferrals.Where(x => x.SentAt.Month == DateTime.Now.Month).ToListAsync();
            var teleconsults = await _context.TeleconsultationRequests.Where(x => x.Status == "Requested" || x.Status == "Scheduled").ToListAsync();

            return new HIEDashboardDto
            {
                Date = DateTime.Today,
                TotalConnections = connections.Count,
                ActiveConnections = connections.Count(c => c.IsActive),
                XMLSubmissionsThisMonth = submissions.Count,
                PendingSubmissions = submissions.Count(s => s.Status == "Generated" || s.Status == "Validated"),
                SubmittedThisMonth = submissions.Count(s => s.Status == "Submitted"),
                ClaimedAmountThisMonth = submissions.Sum(s => s.TotalAmount),
                OutgoingReferrals = referrals.Count(r => r.FromFacilityCode == "CURRENT"),
                IncomingReferrals = referrals.Count(r => r.ToFacilityCode == "CURRENT"),
                PendingReferrals = referrals.Count(r => r.Status == "Sent"),
                ActiveTeleconsultations = teleconsults.Count,
                PendingRequests = teleconsults.Count(t => t.Status == "Requested"),
                Connections = connections.Select(c => new HIEConnectionDto { Id = c.Id, ConnectionName = c.ConnectionName, ConnectionType = c.ConnectionType, IsActive = c.IsActive, ConnectionStatus = c.Status }).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new HIEDashboardDto { Date = DateTime.Today, Connections = new List<HIEConnectionDto>() };
        }
    }

    /// <summary>
    /// Sync tất cả connection đang active. Thực hiện TestConnection cho từng kết nối,
    /// cập nhật LastSuccessfulConnection hoặc LastFailedConnection + LastErrorMessage.
    /// </summary>
    public async Task<HIESyncAllResultDto> SyncAllConnectionsAsync(Guid userId)
    {
        var result = new HIESyncAllResultDto { SyncedAt = DateTime.UtcNow };
        var connections = await _context.HIEConnections
            .Where(c => !c.IsDeleted && c.IsActive)
            .ToListAsync();

        result.TotalConnections = connections.Count;

        foreach (var conn in connections)
        {
            try
            {
                // Thực hiện test connection thực sự (ping endpoint)
                using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                var response = await http.GetAsync(conn.EndpointUrl);

                if (response.IsSuccessStatusCode)
                {
                    conn.Status = "Active";
                    conn.LastSuccessfulConnection = DateTime.UtcNow;
                    conn.LastErrorMessage = null;
                    result.Synced++;
                    result.Results.Add(new HIEConnectionSyncResult
                    {
                        ConnectionId = conn.Id,
                        ConnectionName = conn.ConnectionName,
                        Success = true,
                        SyncedAt = DateTime.UtcNow,
                    });
                }
                else
                {
                    conn.Status = "Error";
                    conn.LastFailedConnection = DateTime.UtcNow;
                    conn.LastErrorMessage = $"HTTP {(int)response.StatusCode}";
                    result.Failed++;
                    result.Results.Add(new HIEConnectionSyncResult
                    {
                        ConnectionId = conn.Id,
                        ConnectionName = conn.ConnectionName,
                        Success = false,
                        Error = conn.LastErrorMessage,
                        SyncedAt = DateTime.UtcNow,
                    });
                }
            }
            catch (Exception ex)
            {
                conn.Status = "Error";
                conn.LastFailedConnection = DateTime.UtcNow;
                conn.LastErrorMessage = ex.Message.Length > 200 ? ex.Message[..200] : ex.Message;
                result.Failed++;
                result.Results.Add(new HIEConnectionSyncResult
                {
                    ConnectionId = conn.Id,
                    ConnectionName = conn.ConnectionName,
                    Success = false,
                    Error = conn.LastErrorMessage,
                    SyncedAt = DateTime.UtcNow,
                });
            }
        }

        await _context.SaveChangesAsync();

        result.Message = $"Sync hoàn tất: {result.Synced}/{result.TotalConnections} kết nối thành công" +
                         (result.Failed > 0 ? $", {result.Failed} lỗi" : "") + ".";
        return result;
    }
}

