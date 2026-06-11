using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

// K3 phien 9 (2026-05-30): tach 3 region (Integration Log + Digital Signature + Statistics,
// ~418 dong) khoi RISCompleteService.cs. ZERO runtime change â€” partial class.
// File goc giu (~298 dong): using + ctor + 13 DI deps + PACS config + Private Helper Methods.
public partial class RISCompleteService
{
    #region Integration Log

    public async Task<IntegrationLogSearchResultDto> SearchIntegrationLogsAsync(SearchIntegrationLogDto searchDto)
    {
        var query = _context.Set<RadiologyIntegrationLog>().AsQueryable();

        if (searchDto.FromDate.HasValue)
            query = query.Where(l => l.SentAt >= searchDto.FromDate);
        if (searchDto.ToDate.HasValue)
            query = query.Where(l => l.SentAt <= searchDto.ToDate);
        if (!string.IsNullOrEmpty(searchDto.Direction))
            query = query.Where(l => l.Direction == searchDto.Direction);
        if (!string.IsNullOrEmpty(searchDto.MessageType))
            query = query.Where(l => l.MessageType == searchDto.MessageType);
        if (searchDto.Status.HasValue)
            query = query.Where(l => l.Status == searchDto.Status);
        if (!string.IsNullOrEmpty(searchDto.RequestCode))
            query = query.Where(l => l.RequestCode.Contains(searchDto.RequestCode));
        if (!string.IsNullOrEmpty(searchDto.PatientCode))
            query = query.Where(l => l.PatientCode.Contains(searchDto.PatientCode));

        var totalCount = await query.CountAsync();
        var logs = await query
            .OrderByDescending(l => l.SentAt)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return new IntegrationLogSearchResultDto
        {
            Items = logs.Select(l => new IntegrationLogDto
            {
                Id = l.Id,
                LogCode = l.LogCode,
                Direction = l.Direction,
                DirectionName = l.Direction == "HIS_TO_RIS" ? "HIS -> RIS" : "RIS -> HIS",
                MessageType = l.MessageType,
                MessageTypeName = GetMessageTypeName(l.MessageType),
                RadiologyRequestId = l.RadiologyRequestId,
                PatientCode = l.PatientCode,
                MedicalRecordCode = l.MedicalRecordCode,
                RequestCode = l.RequestCode,
                SentAt = l.SentAt,
                RequestPayload = l.RequestPayload,
                ResponsePayload = l.ResponsePayload,
                Status = l.Status,
                StatusName = GetLogStatusName(l.Status),
                ErrorMessage = l.ErrorMessage,
                RetryCount = l.RetryCount,
                LastRetryAt = l.LastRetryAt,
                SourceSystem = l.SourceSystem,
                TargetSystem = l.TargetSystem,
                TransactionId = l.TransactionId
            }).ToList(),
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / searchDto.PageSize),
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<IntegrationLogDto> GetIntegrationLogAsync(Guid logId)
    {
        var log = await _context.Set<RadiologyIntegrationLog>().FindAsync(logId);
        if (log == null) return null;

        return new IntegrationLogDto
        {
            Id = log.Id,
            LogCode = log.LogCode,
            Direction = log.Direction,
            MessageType = log.MessageType,
            RequestCode = log.RequestCode,
            SentAt = log.SentAt,
            RequestPayload = log.RequestPayload,
            ResponsePayload = log.ResponsePayload,
            Status = log.Status,
            ErrorMessage = log.ErrorMessage
        };
    }

    public async Task<IntegrationLogStatisticsDto> GetIntegrationLogStatisticsAsync(DateTime fromDate, DateTime toDate)
    {
        var logs = await _context.Set<RadiologyIntegrationLog>()
            .Where(l => l.SentAt >= fromDate && l.SentAt <= toDate)
            .ToListAsync();

        return new IntegrationLogStatisticsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalMessages = logs.Count,
            SuccessCount = logs.Count(l => l.Status == 1),
            FailedCount = logs.Count(l => l.Status == 2),
            PendingCount = logs.Count(l => l.Status == 0),
            SuccessRate = logs.Count > 0 ? (decimal)logs.Count(l => l.Status == 1) / logs.Count * 100 : 0,
            ByMessageType = logs.GroupBy(l => l.MessageType).Select(g => new IntegrationLogByTypeDto
            {
                MessageType = g.Key,
                TotalCount = g.Count(),
                SuccessCount = g.Count(l => l.Status == 1),
                FailedCount = g.Count(l => l.Status == 2)
            }).ToList(),
            ByDay = logs.GroupBy(l => l.SentAt.Date).Select(g => new IntegrationLogByDayDto
            {
                Date = g.Key,
                TotalCount = g.Count(),
                SuccessCount = g.Count(l => l.Status == 1),
                FailedCount = g.Count(l => l.Status == 2)
            }).OrderBy(d => d.Date).ToList()
        };
    }

    public async Task<bool> RetryIntegrationAsync(Guid logId)
    {
        var log = await _context.Set<RadiologyIntegrationLog>().FindAsync(logId);
        if (log == null || log.Status != 2) return false;

        log.Status = 3; // Retrying
        log.RetryCount++;
        log.LastRetryAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        // In production, implement actual retry logic
        return true;
    }

    private string GetMessageTypeName(string messageType) => messageType switch
    {
        "ORDER" => "Chi dinh",
        "RESULT" => "Ket qua",
        "CANCEL" => "Huy",
        _ => messageType
    };

    private string GetLogStatusName(int status) => status switch
    {
        0 => "Cho xu ly",
        1 => "Thanh cong",
        2 => "Loi",
        3 => "Dang thu lai",
        _ => "Khong xac dinh"
    };

    #endregion

    #region Digital Signature - KÃ½ sá»‘

    public async Task<List<DigitalSignatureConfigDto>> GetSignatureConfigsAsync()
    {
        var configs = await _context.Set<RadiologyDigitalSignatureConfig>()
            .Where(c => c.IsActive)
            .ToListAsync();

        return configs.Select(c => new DigitalSignatureConfigDto
        {
            Id = c.Id,
            SignatureType = c.SignatureType,
            SignatureTypeName = GetSignatureTypeName(c.SignatureType),
            Name = c.Name,
            ProviderUrl = c.ProviderUrl,
            IsDefault = c.IsDefault,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<DigitalSignatureConfigDto> SaveSignatureConfigAsync(SaveDigitalSignatureConfigDto dto)
    {
        RadiologyDigitalSignatureConfig config;
        if (dto.Id.HasValue)
        {
            config = await _context.Set<RadiologyDigitalSignatureConfig>().FindAsync(dto.Id.Value);
            if (config == null) return null;
        }
        else
        {
            config = new RadiologyDigitalSignatureConfig { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyDigitalSignatureConfig>().AddAsync(config);
        }

        config.SignatureType = dto.SignatureType;
        config.Name = dto.Name;
        config.ProviderUrl = dto.ProviderUrl;
        config.ApiKey = dto.ApiKey;
        config.ApiSecret = dto.ApiSecret;
        config.CertificatePath = dto.CertificatePath;
        config.CertificatePassword = dto.CertificatePassword;
        config.IsDefault = dto.IsDefault;
        config.IsActive = dto.IsActive;
        config.ConfigJson = dto.ConfigJson;
        config.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new DigitalSignatureConfigDto
        {
            Id = config.Id,
            SignatureType = config.SignatureType,
            SignatureTypeName = GetSignatureTypeName(config.SignatureType),
            Name = config.Name,
            IsDefault = config.IsDefault,
            IsActive = config.IsActive
        };
    }

    public async Task<bool> DeleteSignatureConfigAsync(Guid configId)
    {
        var config = await _context.Set<RadiologyDigitalSignatureConfig>().FindAsync(configId);
        if (config == null) return false;
        config.IsActive = false;
        config.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<SignResultResponseDto> SignResultAsync(SignResultRequestDto request)
    {
        // First try to find RadiologyReport directly by ID
        var report = await _context.RadiologyReports.FindAsync(request.ReportId);

        // If not found, try to find through Request -> Exam -> Report chain
        // Frontend may pass RadiologyRequest ID instead of RadiologyReport ID
        if (report == null)
        {
            // Check if this is a RadiologyRequest ID
            var radiologyRequest = await _context.RadiologyRequests
                .Include(r => r.Exams)
                    .ThenInclude(e => e.Report)
                .FirstOrDefaultAsync(r => r.Id == request.ReportId);

            if (radiologyRequest != null)
            {
                // Find the first exam with a report
                var examWithReport = radiologyRequest.Exams
                    .FirstOrDefault(e => e.Report != null);

                if (examWithReport != null)
                {
                    report = examWithReport.Report;
                }
                else
                {
                    // No report exists, create one for the first exam
                    var firstExam = radiologyRequest.Exams.FirstOrDefault();
                    if (firstExam != null)
                    {
                        report = new RadiologyReport
                        {
                            Id = Guid.NewGuid(),
                            RadiologyExamId = firstExam.Id,
                            RadiologistId = GetCurrentUserIdOrAdmin(), // Admin user
                            Findings = "Ky so tu dong",
                            ReportDate = DateTime.Now,
                            Status = 1,
                            CreatedAt = DateTime.Now
                        };
                        await _context.RadiologyReports.AddAsync(report);
                    }
                }
            }
        }

        if (report == null)
        {
            return new SignResultResponseDto { Success = false, Message = "Khong tim thay ket qua CDHA. Vui long kiem tra lai." };
        }

        // Create signature history
        var signatureHistory = new RadiologySignatureHistory
        {
            Id = Guid.NewGuid(),
            RadiologyReportId = report.Id,
            SignedByUserId = GetCurrentUserIdOrAdmin(), // Current user
            SignatureType = request.SignatureType ?? "DIGITAL",
            SignedAt = DateTime.Now,
            Status = 1, // Signed
            TransactionId = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologySignatureHistory>().AddAsync(signatureHistory);
        report.Status = 2; // Approved
        report.ApprovedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new SignResultResponseDto
        {
            Success = true,
            Message = "Ky so thanh cong",
            SignedAt = signatureHistory.SignedAt,
            TransactionId = signatureHistory.TransactionId
        };
    }

    public async Task<bool> CancelSignedResultAsync(CancelSignedResultDto dto)
    {
        var report = await _context.RadiologyReports.FindAsync(dto.ReportId);
        if (report == null) return false;

        var latestSignature = await _context.Set<RadiologySignatureHistory>()
            .Where(s => s.RadiologyReportId == dto.ReportId && s.Status == 1)
            .OrderByDescending(s => s.SignedAt)
            .FirstOrDefaultAsync();

        if (latestSignature != null)
        {
            latestSignature.Status = 3; // Cancelled
            latestSignature.RejectReason = dto.Reason;
        }

        report.Status = 0; // Back to draft
        report.ApprovedAt = null;
        report.ApprovedBy = null;

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<SignatureHistoryDto>> GetSignatureHistoryAsync(Guid reportId)
    {
        var history = await _context.Set<RadiologySignatureHistory>()
            .Include(s => s.SignedByUser)
            .Include(s => s.RadiologyReport)
                .ThenInclude(r => r.RadiologyExam)
                    .ThenInclude(e => e.RadiologyRequest)
                        .ThenInclude(req => req.Patient)
            .Where(s => s.RadiologyReportId == reportId)
            .OrderByDescending(s => s.SignedAt)
            .ToListAsync();

        return history.Select(s => new SignatureHistoryDto
        {
            Id = s.Id,
            RadiologyReportId = s.RadiologyReportId,
            OrderCode = s.RadiologyReport?.RadiologyExam?.RadiologyRequest?.RequestCode ?? "",
            PatientName = s.RadiologyReport?.RadiologyExam?.RadiologyRequest?.Patient?.FullName ?? "",
            SignedByUserId = s.SignedByUserId,
            SignedByUserName = s.SignedByUser?.FullName ?? "",
            SignatureType = s.SignatureType,
            SignatureTypeName = GetSignatureTypeName(s.SignatureType),
            SignedAt = s.SignedAt,
            CertificateSerial = s.CertificateSerial,
            CertificateSubject = s.CertificateSubject,
            CertificateIssuer = s.CertificateIssuer,
            CertificateValidFrom = s.CertificateValidFrom,
            CertificateValidTo = s.CertificateValidTo,
            Status = s.Status,
            StatusName = GetSignatureStatusName(s.Status),
            SignedDocumentPath = s.SignedDocumentPath,
            TransactionId = s.TransactionId
        }).ToList();
    }

    public async Task<byte[]> PrintSignedResultAsync(Guid reportId)
    {
        // In production, generate PDF with digital signature
        return await Task.FromResult(new byte[0]);
    }

    private string GetSignatureTypeName(string signatureType) => signatureType switch
    {
        "NONE" => "Khong ky",
        "DIGITAL" => "Ky so USB Token",
        "EKYC" => "Ky dien tu",
        "SIGNSERVER" => "SignServer",
        "SMARTCA" => "Smart CA",
        _ => signatureType
    };

    private string GetSignatureStatusName(int status) => status switch
    {
        0 => "Cho ky",
        1 => "Da ky",
        2 => "Tu choi",
        3 => "Da huy",
        _ => "Khong xac dinh"
    };

    #endregion

    #region Statistics

    public async Task<ExamStatisticsByServiceTypeDto> GetExamStatisticsByServiceTypeAsync(DateTime fromDate, DateTime toDate)
    {
        var requests = await _context.RadiologyRequests
            .Include(r => r.Service)
            .Where(r => r.RequestDate >= fromDate && r.RequestDate <= toDate)
            .ToListAsync();

        var byServiceType = requests
            .GroupBy(r => r.Service?.ServiceType ?? 0)
            .Select(g => new ServiceTypeStatisticsDto
            {
                ServiceTypeCode = g.Key.ToString(),
                ServiceTypeName = GetServiceTypeName(g.Key),
                TotalExams = g.Count(),
                CompletedExams = g.Count(r => r.Status >= 3),
                PendingExams = g.Count(r => r.Status < 3),
                CancelledExams = g.Count(r => r.Status == 6),
                TotalRevenue = g.Sum(r => r.TotalAmount),
                InsuranceRevenue = g.Sum(r => r.InsuranceAmount),
                PatientRevenue = g.Sum(r => r.PatientAmount),
                Percentage = requests.Count > 0 ? (decimal)g.Count() / requests.Count * 100 : 0
            })
            .OrderByDescending(s => s.TotalExams)
            .ToList();

        return new ExamStatisticsByServiceTypeDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = requests.Count,
            ServiceTypes = byServiceType
        };
    }

    #endregion
}
