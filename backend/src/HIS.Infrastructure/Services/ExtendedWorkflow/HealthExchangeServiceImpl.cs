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
    public HealthExchangeServiceImpl(HISDbContext context) => _context = context;

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
        var entity = dto.Id != Guid.Empty ? await _context.HIEConnections.FindAsync(dto.Id) : null;
        if (entity == null)
        {
            entity = new HIEConnection { Id = Guid.NewGuid() };
            _context.HIEConnections.Add(entity);
        }
        entity.ConnectionName = dto.ConnectionName;
        entity.ConnectionType = dto.ConnectionType;
        entity.EndpointUrl = dto.Endpoint;
        entity.AuthType = dto.AuthMethod;
        entity.ClientId = dto.ClientId;
        entity.CertificatePath = dto.CertificatePath;
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
        var entity = new InsuranceXMLSubmission
        {
            Id = Guid.NewGuid(),
            SubmissionCode = $"XML{DateTime.Now:yyyyMMddHHmmss}",
            XMLType = xmlType,
            PeriodFrom = fromDate,
            PeriodTo = toDate,
            DepartmentId = departmentId,
            GeneratedAt = DateTime.Now,
            Status = "Generated"
        };
        _context.InsuranceXMLSubmissions.Add(entity);
        await _context.SaveChangesAsync();
        return new InsuranceXMLSubmissionDto { Id = entity.Id, SubmissionCode = entity.SubmissionCode, XMLType = xmlType, FromDate = fromDate, ToDate = toDate, Status = "Generated", GeneratedAt = entity.GeneratedAt };
    }

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
        e.Status = "Submitted";
        e.SubmittedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new InsuranceXMLSubmissionDto { Id = e.Id, SubmissionCode = e.SubmissionCode, XMLType = e.XMLType, Status = "Submitted", SubmissionDate = e.SubmittedAt ?? DateTime.Now };
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
            ConsultationQuestion = dto.ClinicalQuestion,
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

