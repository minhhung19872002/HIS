using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IInsuranceXmlService
/// Handles insurance claim management, XML export, settlement, and BHYT workflows.
/// Gateway-dependent methods delegate to IBhxhGatewayClient (mock or real).
/// XML export pipeline: validate -> generate DTOs -> generate XML bytes -> XSD validate -> write files.
/// </summary>
public partial class InsuranceXmlService : IInsuranceXmlService
{
    private readonly HISDbContext _context;
    private readonly IBhxhGatewayClient _gatewayClient;
    private readonly XmlExportService _xmlExportService;
    private readonly XmlSchemaValidator _schemaValidator;
    private readonly BhxhGatewayOptions _gatewayOptions;
    private readonly ILogger<InsuranceXmlService> _logger;

    public InsuranceXmlService(
        HISDbContext context,
        IBhxhGatewayClient gatewayClient,
        XmlExportService xmlExportService,
        XmlSchemaValidator schemaValidator,
        IOptions<BhxhGatewayOptions> gatewayOptions,
        ILogger<InsuranceXmlService> logger)
    {
        _context = context;
        _gatewayClient = gatewayClient;
        _xmlExportService = xmlExportService;
        _schemaValidator = schemaValidator;
        _gatewayOptions = gatewayOptions.Value;
        _logger = logger;
    }


    public async Task<InsuranceCardVerificationDto> VerifyInsuranceCardAsync(string insuranceNumber, string patientName, DateTime dateOfBirth)
    {
        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = insuranceNumber,
                HoTen = patientName,
                NgaySinh = dateOfBirth,
                MaCsKcb = "" // Will use gateway options FacilityCode internally
            };

            var response = await _gatewayClient.VerifyCardAsync(request);

            return new InsuranceCardVerificationDto
            {
                MaThe = response.MaThe,
                HoTen = response.HoTen,
                NgaySinh = response.NgaySinh,
                GioiTinh = response.GioiTinh,
                DiaChi = response.DiaChi,
                GtTheTu = response.GtTheTu,
                GtTheDen = response.GtTheDen,
                MaDkbd = response.MaDkbd,
                TenDkbd = response.TenDkbd,
                MucHuong = response.MucHuong,
                DuDkKcb = response.DuDkKcb,
                LyDoKhongDuDk = response.LyDoKhongDuDk,
                MienCungCt = response.MienCungCt,
                MaLyDoMien = response.MaLyDoMien,
                NgayDu5Nam = response.NgayDu5Nam,
                IsTraTruoc = response.IsTraTruoc,
                MaKv = response.MaKv,
                LoaiThe = response.LoaiThe,
                VerificationTime = response.VerificationTime,
                VerificationToken = response.VerificationToken
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway verification failed for card {InsuranceNumber}. Returning fallback response.", insuranceNumber);

            // Graceful degradation: don't block patient registration on gateway failure (BHXH-05)
            return new InsuranceCardVerificationDto
            {
                MaThe = insuranceNumber,
                HoTen = patientName,
                NgaySinh = dateOfBirth,
                DuDkKcb = false,
                LyDoKhongDuDk = "Khong the ket noi cong BHXH. Vui long thu lai sau.",
                VerificationTime = DateTime.Now,
                VerificationToken = ""
            };
        }
    }

    public async Task<InsuranceHistoryDto> GetInsuranceHistoryAsync(string insuranceNumber, string? otp = null)
    {
        try
        {
            var request = new BhxhTreatmentHistoryRequest
            {
                MaThe = insuranceNumber,
                Otp = otp,
                FromDate = DateTime.Today.AddYears(-1),
                ToDate = DateTime.Today
            };

            var response = await _gatewayClient.GetTreatmentHistoryAsync(request);

            return new InsuranceHistoryDto
            {
                MaThe = response.MaThe,
                Visits = response.Visits.Select(v => new InsuranceVisitHistoryDto
                {
                    MaCsKcb = v.MaCsKcb,
                    TenCsKcb = v.TenCsKcb,
                    NgayKcb = v.NgayKcb,
                    MaLoaiKcb = v.MaLoaiKcb,
                    MaBenhChinh = v.MaBenhChinh,
                    TenBenhChinh = v.TenBenhChinh,
                    TienBhyt = v.TienBhyt
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway history lookup failed for card {InsuranceNumber}. Returning empty history.", insuranceNumber);

            return new InsuranceHistoryDto
            {
                MaThe = insuranceNumber,
                Visits = new List<InsuranceVisitHistoryDto>()
            };
        }
    }

    public async Task<bool> CheckInsuranceValidityAsync(string insuranceNumber, DateTime serviceDate)
    {
        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = insuranceNumber,
                HoTen = "",
                NgaySinh = DateTime.MinValue,
                MaCsKcb = ""
            };

            var response = await _gatewayClient.VerifyCardAsync(request);

            return response.DuDkKcb
                && response.GtTheTu <= serviceDate
                && response.GtTheDen >= serviceDate;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway validity check failed for card {InsuranceNumber}. Returning true to avoid blocking workflow.", insuranceNumber);
            // Graceful degradation: don't block workflow on gateway failure
            return true;
        }
    }

    public async Task<InsuranceBenefitDto> GetInsuranceBenefitsAsync(string insuranceNumber)
    {
        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = insuranceNumber,
                HoTen = "",
                NgaySinh = DateTime.MinValue,
                MaCsKcb = ""
            };

            var response = await _gatewayClient.VerifyCardAsync(request);

            var paymentRatio = int.TryParse(response.MucHuong, out var ratio) ? ratio : 80;

            return new InsuranceBenefitDto
            {
                InsuranceNumber = insuranceNumber,
                PaymentRatio = paymentRatio,
                HasCoPayExemption = response.MienCungCt,
                Is5YearsContinuous = response.NgayDu5Nam.HasValue && response.NgayDu5Nam.Value <= DateTime.Today,
                CoveredServices = new List<string>(),
                RemainingBudget = null
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway benefits lookup failed for card {InsuranceNumber}. Returning default benefits.", insuranceNumber);

            return new InsuranceBenefitDto
            {
                InsuranceNumber = insuranceNumber,
                PaymentRatio = 80,
                HasCoPayExemption = false,
                Is5YearsContinuous = false,
                CoveredServices = new List<string>(),
                RemainingBudget = null
            };
        }
    }

    public async Task<bool> CheckPrimaryRegistrationAsync(string insuranceNumber, string facilityCode)
    {
        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = insuranceNumber,
                HoTen = "",
                NgaySinh = DateTime.MinValue,
                MaCsKcb = facilityCode
            };

            var response = await _gatewayClient.VerifyCardAsync(request);

            return string.Equals(response.MaDkbd, facilityCode, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway primary registration check failed for card {InsuranceNumber}. Returning true.", insuranceNumber);
            return true;
        }
    }



    public async Task<InsuranceClaimSummaryDto> CreateInsuranceClaimAsync(Guid examinationId)
    {
        var exam = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (exam == null)
            throw new InvalidOperationException($"Examination {examinationId} not found");

        var patient = exam.MedicalRecord?.Patient;

        var claim = new InsuranceClaim
        {
            Id = Guid.NewGuid(),
            ClaimCode = CodeGenerator.Timestamp("BHYT"),
            PatientId = exam.MedicalRecord?.PatientId ?? Guid.Empty,
            ServiceDate = exam.StartTime ?? exam.CreatedAt,
            TreatmentType = 1, // Outpatient
            ClaimStatus = 0, // Pending
            CreatedAt = DateTime.UtcNow
        };

        _context.InsuranceClaims.Add(claim);
        await _context.SaveChangesAsync();

        return MapToClaimSummary(claim, patient);
    }

    public async Task<InsuranceClaimSummaryDto?> GetInsuranceClaimByMaLkAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims
            .Include(c => c.Patient)
            .FirstOrDefaultAsync(c => c.ClaimCode == maLk);

        return claim == null ? null : MapToClaimSummary(claim, claim.Patient);
    }

    public async Task<PagedResultDto<InsuranceClaimSummaryDto>> SearchInsuranceClaimsAsync(InsuranceClaimSearchDto dto)
    {
        var query = _context.InsuranceClaims
            .Include(c => c.Patient)
            .AsQueryable();

        if (!string.IsNullOrEmpty(dto.Keyword))
        {
            query = query.Where(c =>
                c.ClaimCode.Contains(dto.Keyword) ||
                c.Patient.FullName.Contains(dto.Keyword) ||
                (c.InsuranceNumber != null && c.InsuranceNumber.Contains(dto.Keyword)));
        }

        if (!string.IsNullOrEmpty(dto.MaLk))
            query = query.Where(c => c.ClaimCode == dto.MaLk);

        if (!string.IsNullOrEmpty(dto.InsuranceNumber))
            query = query.Where(c => c.InsuranceNumber == dto.InsuranceNumber);

        if (dto.Status.HasValue)
            query = query.Where(c => c.ClaimStatus == dto.Status.Value);

        if (dto.FromDate.HasValue)
            query = query.Where(c => c.ServiceDate >= dto.FromDate.Value);

        if (dto.ToDate.HasValue)
            query = query.Where(c => c.ServiceDate <= dto.ToDate.Value);

        if (dto.DepartmentId.HasValue)
            query = query.Where(c => c.DepartmentId == dto.DepartmentId.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((dto.PageNumber - 1) * dto.PageSize)
            .Take(dto.PageSize)
            .ToListAsync();

        return new PagedResultDto<InsuranceClaimSummaryDto>
        {
            Items = items.Select(c => MapToClaimSummary(c, c.Patient)).ToList(),
            TotalCount = totalCount,
            Page = dto.PageNumber,
            PageSize = dto.PageSize
        };
    }

    public async Task<InsuranceClaimSummaryDto> UpdateInsuranceClaimAsync(string maLk, UpdateInsuranceClaimDto dto)
    {
        var claim = await _context.InsuranceClaims
            .Include(c => c.Patient)
            .FirstOrDefaultAsync(c => c.ClaimCode == maLk);

        if (claim == null)
            throw new InvalidOperationException($"Claim {maLk} not found");

        if (!string.IsNullOrEmpty(dto.DiagnosisCode))
            claim.MainDiagnosisCode = dto.DiagnosisCode;
        if (!string.IsNullOrEmpty(dto.DiagnosisName))
            claim.MainDiagnosisName = dto.DiagnosisName;
        if (!string.IsNullOrEmpty(dto.Notes))
            claim.Note = dto.Notes;

        await _context.SaveChangesAsync();
        return MapToClaimSummary(claim, claim.Patient);
    }

    public async Task<bool> DeleteInsuranceClaimAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        if (claim == null) return false;
        claim.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> LockInsuranceClaimAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        if (claim == null) return false;
        claim.ClaimStatus = 1; // Locked/Approved
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UnlockInsuranceClaimAsync(string maLk, string reason)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        if (claim == null) return false;
        claim.ClaimStatus = 0; // Back to pending
        claim.Note = reason;
        await _context.SaveChangesAsync();
        return true;
    }


}
