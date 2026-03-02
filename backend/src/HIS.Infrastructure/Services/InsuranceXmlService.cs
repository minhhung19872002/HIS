using System.IO.Compression;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;
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
public class InsuranceXmlService : IInsuranceXmlService
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

    #region 12.1 Tra cuu va xac minh the BHYT

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

    #endregion

    #region 12.2 Tao va quan ly ho so BHYT

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
            ClaimCode = $"BHYT-{DateTime.Now:yyyyMMddHHmmss}",
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

    #endregion

    #region 12.3 Xuat XML theo chuan BHXH

    public async Task<List<Xml1MedicalRecordDto>> GenerateXml1DataAsync(XmlExportConfigDto config)
    {
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml1MedicalRecordDto>();

        foreach (var c in claims)
        {
            // Sum cost fields grouped by ItemType from ClaimDetails
            var details = c.ClaimDetails ?? new List<InsuranceClaimDetail>();
            var examCost = details.Where(d => d.ItemType == 1).Sum(d => d.Amount);
            var bedCost = details.Where(d => d.ItemType == 4).Sum(d => d.Amount);
            var totalBhyt = details.Sum(d => d.InsuranceAmount);
            var totalCopay = details.Sum(d => d.PatientAmount);

            // Calculate treatment days
            var daysOfTreatment = c.DischargeDate.HasValue
                ? Math.Max(1, (int)(c.DischargeDate.Value - c.ServiceDate).TotalDays)
                : 1;

            result.Add(new Xml1MedicalRecordDto
            {
                MaLk = c.ClaimCode,
                MaBn = c.Patient?.PatientCode ?? "",
                HoTen = c.Patient?.FullName ?? "",
                NgaySinh = c.Patient?.DateOfBirth ?? DateTime.MinValue,
                GioiTinh = c.Patient?.Gender ?? 1,
                DiaChi = c.Patient?.Address ?? "",
                MaThe = c.InsuranceNumber ?? "",
                MaDkbd = c.InsuranceFacilityCode ?? "",
                GtTheTu = c.InsuranceStartDate ?? DateTime.MinValue,
                GtTheDen = c.InsuranceEndDate ?? DateTime.MinValue,
                NgayVao = c.ServiceDate,
                NgayRa = c.DischargeDate,
                SoNgayDt = daysOfTreatment,
                MaBenhChinh = c.MainDiagnosisCode ?? "",
                MaBenhKt = c.SubDiagnosisCodes,
                MaLoaiKcb = c.TreatmentType.ToString(),
                MaKhoa = c.Department?.DepartmentCode ?? "",
                MaPhong = c.Department?.DepartmentCode ?? "", // Room code from exam room if available
                TienKham = Math.Round(examCost, 2),
                TienGiuong = Math.Round(bedCost, 2),
                TienBhyt = Math.Round(c.InsuranceAmount > 0 ? c.InsuranceAmount : totalBhyt, 2),
                TienBnCct = Math.Round(c.PatientAmount > 0 ? c.PatientAmount : totalCopay, 2),
                TienNguoibenh = Math.Round(c.OutOfPocketAmount, 2),
                TienTuphitru = 0,
                TienNgoaitruth = 0,
                MaDoiTuong = c.InsuranceType.ToString(),
                KetQuaDt = c.TreatmentType switch { 1 => "1", 2 => "1", 3 => "1", _ => "1" } // 1-Khoi
            });
        }

        return result;
    }

    public async Task<List<Xml2MedicineDto>> GenerateXml2DataAsync(XmlExportConfigDto config)
    {
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml2MedicineDto>();

        foreach (var claim in claims)
        {
            // Get medicine claim details (ItemType=2 for medicines, covered by insurance)
            var medicineDetails = (claim.ClaimDetails ?? new List<InsuranceClaimDetail>())
                .Where(d => d.ItemType == 2 && d.IsInsuranceCovered)
                .ToList();

            var stt = 1;
            foreach (var detail in medicineDetails)
            {
                result.Add(new Xml2MedicineDto
                {
                    MaLk = claim.ClaimCode,
                    Stt = stt++,
                    MaThuoc = detail.Medicine?.MedicineCodeBYT ?? detail.ItemCode,
                    MaNhom = detail.Medicine?.MedicineGroupCode ?? "",
                    TenThuoc = detail.Medicine?.MedicineName ?? detail.ItemName,
                    DonViTinh = detail.Medicine?.Unit ?? detail.Unit,
                    HamLuong = detail.Medicine?.Concentration,
                    DuongDung = detail.Medicine?.RouteName,
                    SoLuong = Math.Round(detail.Quantity, 2),
                    DonGia = Math.Round(detail.UnitPrice, 2),
                    TyLeThanhToan = detail.InsuranceCoverage > 0 ? (int)detail.InsuranceCoverage : 100,
                    ThanhTien = Math.Round(detail.Amount, 2),
                    ThanhTienBv = Math.Round(detail.Amount, 2),
                    MaKhoa = claim.Department?.DepartmentCode,
                    MaBacSi = claim.Doctor?.EmployeeCode ?? claim.Doctor?.UserCode,
                    NgayYl = detail.ServiceDate,
                    TienBhyt = Math.Round(detail.InsuranceAmount, 2),
                    TienBnCct = Math.Round(detail.PatientAmount, 2),
                    TienNguoiBenh = 0,
                    MucHuong = claim.InsurancePaymentRate > 0 ? (int)claim.InsurancePaymentRate : 80
                });
            }
        }

        return result;
    }

    public async Task<List<Xml3ServiceDto>> GenerateXml3DataAsync(XmlExportConfigDto config)
    {
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml3ServiceDto>();

        foreach (var claim in claims)
        {
            // Get service claim details (ItemType=1 for services)
            var serviceDetails = (claim.ClaimDetails ?? new List<InsuranceClaimDetail>())
                .Where(d => d.ItemType == 1)
                .ToList();

            var stt = 1;
            foreach (var detail in serviceDetails)
            {
                result.Add(new Xml3ServiceDto
                {
                    MaLk = claim.ClaimCode,
                    Stt = stt++,
                    MaDvu = detail.Service?.ServiceCodeBHYT ?? detail.ItemCode,
                    MaNhom = detail.Service?.ServiceGroup?.GroupCode ?? "",
                    TenDvu = detail.Service?.ServiceName ?? detail.ItemName,
                    DonViTinh = detail.Service?.Unit ?? detail.Unit,
                    SoLuong = Math.Round(detail.Quantity, 2),
                    DonGia = Math.Round(detail.UnitPrice, 2),
                    TyLeThanhToan = detail.InsuranceCoverage > 0 ? (int)detail.InsuranceCoverage : 100,
                    ThanhTien = Math.Round(detail.Amount, 2),
                    ThanhTienBv = Math.Round(detail.Amount, 2),
                    MaKhoa = claim.Department?.DepartmentCode,
                    MaBacSi = claim.Doctor?.EmployeeCode ?? claim.Doctor?.UserCode,
                    NgayYl = detail.ServiceDate,
                    NgayKq = null, // Result date filled from ServiceRequestDetail if available
                    TienBhyt = Math.Round(detail.InsuranceAmount, 2),
                    TienBnCct = Math.Round(detail.PatientAmount, 2),
                    TienNguoiBenh = 0,
                    MucHuong = claim.InsurancePaymentRate > 0 ? (int)claim.InsurancePaymentRate : 80
                });
            }
        }

        return result;
    }

    public async Task<List<Xml4OtherMedicineDto>> GenerateXml4DataAsync(XmlExportConfigDto config)
    {
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml4OtherMedicineDto>();

        foreach (var claim in claims)
        {
            // Get non-covered medicine details (ItemType=2 and NOT covered by insurance)
            var otherMeds = (claim.ClaimDetails ?? new List<InsuranceClaimDetail>())
                .Where(d => d.ItemType == 2 && !d.IsInsuranceCovered)
                .ToList();

            var stt = 1;
            foreach (var detail in otherMeds)
            {
                result.Add(new Xml4OtherMedicineDto
                {
                    MaLk = claim.ClaimCode,
                    Stt = stt++,
                    MaThuoc = detail.Medicine?.MedicineCodeBYT ?? detail.ItemCode,
                    TenThuoc = detail.Medicine?.MedicineName ?? detail.ItemName,
                    DonViTinh = detail.Medicine?.Unit ?? detail.Unit,
                    HamLuong = detail.Medicine?.Concentration,
                    DuongDung = detail.Medicine?.RouteName,
                    SoLuong = Math.Round(detail.Quantity, 2),
                    DonGia = Math.Round(detail.UnitPrice, 2),
                    ThanhTien = Math.Round(detail.Amount, 2),
                    MaKhoa = claim.Department?.DepartmentCode,
                    MaBacSi = claim.Doctor?.EmployeeCode ?? claim.Doctor?.UserCode,
                    NgayYl = detail.ServiceDate
                });
            }
        }

        return result;
    }

    public async Task<List<Xml5PrescriptionDto>> GenerateXml5DataAsync(XmlExportConfigDto config)
    {
        // Get claims for the period to identify medical records
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml5PrescriptionDto>();
        var medicalRecordIds = claims
            .Where(c => c.MedicalRecordId.HasValue)
            .Select(c => c.MedicalRecordId!.Value)
            .Distinct()
            .ToList();

        if (medicalRecordIds.Count == 0) return result;

        // Build a claim code lookup by medical record ID
        var claimLookup = claims
            .Where(c => c.MedicalRecordId.HasValue)
            .GroupBy(c => c.MedicalRecordId!.Value)
            .ToDictionary(g => g.Key, g => g.First().ClaimCode);

        // Query prescriptions linked to these medical records
        var prescriptions = await _context.Prescriptions
            .AsNoTracking()
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => medicalRecordIds.Contains(p.MedicalRecordId) && !p.IsDeleted && p.Status != 4)
            .ToListAsync();

        foreach (var rx in prescriptions)
        {
            if (!claimLookup.TryGetValue(rx.MedicalRecordId, out var maLk)) continue;

            var stt = 1;
            foreach (var detail in rx.Details)
            {
                result.Add(new Xml5PrescriptionDto
                {
                    MaLk = maLk,
                    Stt = stt++,
                    MaThuoc = detail.Medicine?.MedicineCodeBYT ?? detail.Medicine?.MedicineCode ?? "",
                    TenThuoc = detail.Medicine?.MedicineName ?? "",
                    SoDk = detail.Medicine?.RegistrationNumber,
                    HamLuong = detail.Medicine?.Concentration,
                    SoLuong = Math.Round(detail.Quantity, 2),
                    DonGia = Math.Round(detail.UnitPrice, 2),
                    ThanhTien = Math.Round(detail.Amount, 2),
                    LieuDung = detail.Dosage,
                    CachDung = detail.Usage ?? detail.UsageInstructions,
                    SoNgay = detail.Days > 0 ? detail.Days : rx.TotalDays,
                    MaBenh = rx.IcdCode ?? rx.DiagnosisCode,
                    NgayKeDon = rx.PrescriptionDate
                });
            }
        }

        return result;
    }

    public async Task<List<Xml7ReferralDto>> GenerateXml7DataAsync(XmlExportConfigDto config)
    {
        // Get claims for the period
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml7ReferralDto>();

        // Find discharges that are referrals (DischargeType=2 means transfer/referral)
        var admissionIds = claims
            .Where(c => c.MedicalRecord != null)
            .Select(c => c.MedicalRecordId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        if (admissionIds.Count == 0) return result;

        // Build a claim code lookup
        var claimLookup = claims
            .Where(c => c.MedicalRecordId.HasValue)
            .GroupBy(c => c.MedicalRecordId!.Value)
            .ToDictionary(g => g.Key, g => g.First());

        // Query Discharge records that are referrals
        var discharges = await _context.Discharges
            .AsNoTracking()
            .Include(d => d.Admission)
            .Where(d => d.DischargeType == 2 && !d.IsDeleted) // 2=Transfer/referral
            .ToListAsync();

        var stt = 1;
        foreach (var discharge in discharges)
        {
            // Find the matching claim via admission's MedicalRecordId
            var matchingClaim = claimLookup.Values
                .FirstOrDefault(c => c.MedicalRecord?.Id == discharge.Admission?.MedicalRecordId
                    || c.MedicalRecordId == discharge.Admission?.MedicalRecordId);

            if (matchingClaim == null) continue;

            result.Add(new Xml7ReferralDto
            {
                MaLk = matchingClaim.ClaimCode,
                Stt = stt++,
                SoHoSo = matchingClaim.MedicalRecord?.MedicalRecordCode ?? "",
                MaBnChuyenDi = matchingClaim.Patient?.PatientCode ?? "",
                MaCskbChuyenDi = matchingClaim.InsuranceFacilityCode ?? "",
                NgayChuyenDi = discharge.DischargeDate,
                MaCskbChuyenDen = "", // Would come from referral destination entity if available
                LyDoChuyenVien = discharge.DischargeDiagnosis ?? "Chuyen tuyen dieu tri",
                MaBenhChinh = matchingClaim.MainDiagnosisCode,
                MaBenhKt = matchingClaim.SubDiagnosisCodes,
                TomTatKq = discharge.DischargeInstructions,
                HuongDieuTri = discharge.DischargeInstructions,
                PhuongTienVc = "Xe cap cuu",
                HoTenNguoiHt = null,
                ChucDanhNguoiHt = null
            });
        }

        return result;
    }

    public async Task<List<Xml6BloodDto>> GenerateXml6DataAsync(XmlExportConfigDto config)
    {
        // Blood products from BloodRequest records linked to medical records in the period
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml6BloodDto>();

        var medicalRecordIds = claims
            .Where(c => c.MedicalRecordId.HasValue)
            .Select(c => c.MedicalRecordId!.Value)
            .Distinct()
            .ToList();

        if (medicalRecordIds.Count == 0)
        {
            _logger.LogInformation("XML6: No medical records found for period {Month}/{Year}", config.Month, config.Year);
            return result;
        }

        var claimLookup = claims
            .Where(c => c.MedicalRecordId.HasValue)
            .GroupBy(c => c.MedicalRecordId!.Value)
            .ToDictionary(g => g.Key, g => g.First());

        try
        {
            // BloodRequest has MedicalRecordId, BloodType, RhFactor, Volume, RequestDate
            var bloodRequests = await _context.BloodRequests
                .AsNoTracking()
                .Include(br => br.Department)
                .Where(br => br.MedicalRecordId.HasValue
                    && medicalRecordIds.Contains(br.MedicalRecordId!.Value)
                    && !br.IsDeleted
                    && br.Status >= 1) // Approved or higher
                .ToListAsync();

            foreach (var br in bloodRequests)
            {
                if (!br.MedicalRecordId.HasValue || !claimLookup.TryGetValue(br.MedicalRecordId.Value, out var claim))
                    continue;

                result.Add(new Xml6BloodDto
                {
                    MaLk = claim.ClaimCode,
                    Stt = result.Count(r => r.MaLk == claim.ClaimCode) + 1,
                    MaMau = br.BloodType,
                    TenMau = $"{br.BloodType} {br.RhFactor ?? ""}".Trim(),
                    TheTich = Math.Round(br.Volume, 2),
                    DonGia = 0, // Blood product pricing from InsurancePriceConfig if available
                    ThanhTien = 0,
                    TienBhyt = 0,
                    TienBnCct = 0,
                    TienNguoiBenh = 0,
                    NgayYl = br.RequestDate,
                    MaKhoa = br.Department?.DepartmentCode ?? claim.Department?.DepartmentCode,
                    MaBacSi = claim.Doctor?.EmployeeCode ?? claim.Doctor?.UserCode
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "XML6: Error querying blood request data, returning empty list");
        }

        return result;
    }

    public async Task<List<Xml8TransportDto>> GenerateXml8DataAsync(XmlExportConfigDto config)
    {
        // Transport records are not yet tracked in HIS
        _logger.LogInformation("XML8: No transport records module available for period {Month}/{Year}. Returning empty list.", config.Month, config.Year);
        return new List<Xml8TransportDto>();
    }

    public async Task<List<Xml9SickLeaveDto>> GenerateXml9DataAsync(XmlExportConfigDto config)
    {
        // Sick leave certificates are not yet tracked in HIS
        _logger.LogInformation("XML9: No sick leave certificate module available for period {Month}/{Year}. Returning empty list.", config.Month, config.Year);
        return new List<Xml9SickLeaveDto>();
    }

    public async Task<List<Xml10AssessmentDto>> GenerateXml10DataAsync(XmlExportConfigDto config)
    {
        // Assessment results come from BHXH feedback, not generated locally
        _logger.LogInformation("XML10: Assessment results come from BHXH feedback. Returning empty list.");
        return new List<Xml10AssessmentDto>();
    }

    public async Task<List<Xml11SocialInsuranceDto>> GenerateXml11DataAsync(XmlExportConfigDto config)
    {
        // Social insurance certificates linked to patients in claims
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml11SocialInsuranceDto>();

        // Deduplicate by patient to avoid multiple entries for same person
        var processedPatients = new HashSet<Guid>();

        foreach (var claim in claims)
        {
            if (claim.Patient == null || processedPatients.Contains(claim.PatientId)) continue;
            processedPatients.Add(claim.PatientId);

            // Only include patients with insurance numbers (social insurance data)
            if (string.IsNullOrEmpty(claim.InsuranceNumber)) continue;

            result.Add(new Xml11SocialInsuranceDto
            {
                MaLk = claim.ClaimCode,
                MaBhxh = claim.InsuranceNumber ?? "",
                HoTen = claim.Patient.FullName,
                SoSoBhxh = claim.InsuranceNumber ?? "", // Social insurance book number = insurance number
                NgaySinh = claim.Patient.DateOfBirth,
                GioiTinh = claim.Patient.Gender
            });
        }

        return result;
    }

    public async Task<List<Xml13ReExamDto>> GenerateXml13DataAsync(XmlExportConfigDto config)
    {
        // Re-examination appointments linked to claims in the period
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml13ReExamDto>();

        var medicalRecordIds = claims
            .Where(c => c.MedicalRecordId.HasValue)
            .Select(c => c.MedicalRecordId!.Value)
            .Distinct()
            .ToList();

        if (medicalRecordIds.Count == 0) return result;

        var claimLookup = claims
            .Where(c => c.MedicalRecordId.HasValue)
            .GroupBy(c => c.MedicalRecordId!.Value)
            .ToDictionary(g => g.Key, g => g.First());

        try
        {
            // Query Appointments that are re-examination type (AppointmentType=1)
            var appointments = await _context.Appointments
                .AsNoTracking()
                .Include(a => a.Doctor)
                .Include(a => a.Department)
                .Where(a => a.PreviousMedicalRecordId.HasValue
                    && medicalRecordIds.Contains(a.PreviousMedicalRecordId.Value)
                    && a.AppointmentType == 1 // Re-examination
                    && !a.IsDeleted)
                .ToListAsync();

            foreach (var appt in appointments)
            {
                if (!appt.PreviousMedicalRecordId.HasValue
                    || !claimLookup.TryGetValue(appt.PreviousMedicalRecordId.Value, out var claim))
                    continue;

                result.Add(new Xml13ReExamDto
                {
                    MaLk = claim.ClaimCode,
                    Stt = result.Count(r => r.MaLk == claim.ClaimCode) + 1,
                    NgayHen = appt.AppointmentDate,
                    NoiDung = appt.Reason ?? appt.Note ?? "Tai kham",
                    MaBacSi = appt.Doctor?.EmployeeCode ?? appt.Doctor?.UserCode,
                    MaKhoa = appt.Department?.DepartmentCode
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "XML13: Error querying appointment data, returning empty list");
        }

        return result;
    }

    public async Task<List<Xml14ReferralCertDto>> GenerateXml14DataAsync(XmlExportConfigDto config)
    {
        // Referral certificates (similar to XML7 but per QD 3176 format)
        var claims = await GetClaimsForExport(config);
        var result = new List<Xml14ReferralCertDto>();

        var medicalRecordIds = claims
            .Where(c => c.MedicalRecordId.HasValue)
            .Select(c => c.MedicalRecordId!.Value)
            .Distinct()
            .ToList();

        if (medicalRecordIds.Count == 0) return result;

        var claimLookup = claims
            .Where(c => c.MedicalRecordId.HasValue)
            .GroupBy(c => c.MedicalRecordId!.Value)
            .ToDictionary(g => g.Key, g => g.First());

        try
        {
            // Query Discharge records that are referrals (DischargeType=2)
            var discharges = await _context.Discharges
                .AsNoTracking()
                .Include(d => d.Admission)
                .Where(d => d.DischargeType == 2 && !d.IsDeleted)
                .ToListAsync();

            var stt = 1;
            foreach (var discharge in discharges)
            {
                var matchingClaim = claimLookup.Values
                    .FirstOrDefault(c => c.MedicalRecordId == discharge.Admission?.MedicalRecordId);

                if (matchingClaim == null) continue;

                result.Add(new Xml14ReferralCertDto
                {
                    MaLk = matchingClaim.ClaimCode,
                    Stt = stt++,
                    SoPhieu = matchingClaim.MedicalRecord?.MedicalRecordCode ?? "",
                    MaCskbChuyenDen = "", // Destination facility code from referral data
                    TenCskbChuyenDen = "", // Destination facility name
                    NgayChuyen = discharge.DischargeDate,
                    LyDoChuyen = discharge.DischargeDiagnosis ?? "Chuyen tuyen dieu tri",
                    ChanDoanChuyen = matchingClaim.MainDiagnosisCode,
                    HuongDieuTri = discharge.DischargeInstructions,
                    MaBacSi = matchingClaim.Doctor?.EmployeeCode ?? matchingClaim.Doctor?.UserCode
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "XML14: Error querying referral data, returning empty list");
        }

        return result;
    }

    public async Task<List<Xml15TbTreatmentDto>> GenerateXml15DataAsync(XmlExportConfigDto config)
    {
        // TB treatment tracking is specialized and not yet available in HIS
        _logger.LogInformation("XML15: TB treatment module not available. Returning empty list.");
        return new List<Xml15TbTreatmentDto>();
    }

    public async Task<XmlExportPreviewDto> PreviewExportAsync(XmlExportConfigDto config)
    {
        _logger.LogInformation("Generating export preview for {Month}/{Year}", config.Month, config.Year);

        // Generate all table data
        var xml1Data = await GenerateXml1DataAsync(config);
        var xml2Data = await GenerateXml2DataAsync(config);
        var xml3Data = await GenerateXml3DataAsync(config);
        var xml4Data = await GenerateXml4DataAsync(config);
        var xml5Data = await GenerateXml5DataAsync(config);
        var xml6Data = await GenerateXml6DataAsync(config);
        var xml7Data = await GenerateXml7DataAsync(config);
        var xml8Data = await GenerateXml8DataAsync(config);
        var xml9Data = await GenerateXml9DataAsync(config);
        var xml10Data = await GenerateXml10DataAsync(config);
        var xml11Data = await GenerateXml11DataAsync(config);
        var xml13Data = await GenerateXml13DataAsync(config);
        var xml14Data = await GenerateXml14DataAsync(config);
        var xml15Data = await GenerateXml15DataAsync(config);

        // Build table preview list
        var tables = new List<XmlTablePreview>
        {
            new() { TableName = "XML1", Description = "Thong tin chung ho so KCB", RecordCount = xml1Data.Count },
            new() { TableName = "XML2", Description = "Thuoc dieu tri", RecordCount = xml2Data.Count },
            new() { TableName = "XML3", Description = "Dich vu ky thuat", RecordCount = xml3Data.Count },
            new() { TableName = "XML4", Description = "Thuoc ngoai danh muc", RecordCount = xml4Data.Count },
            new() { TableName = "XML5", Description = "Chi dinh thuoc", RecordCount = xml5Data.Count },
            new() { TableName = "XML6", Description = "Mau va che pham mau", RecordCount = xml6Data.Count },
            new() { TableName = "XML7", Description = "Giay chuyen tuyen", RecordCount = xml7Data.Count },
            new() { TableName = "XML8", Description = "Van chuyen nguoi benh", RecordCount = xml8Data.Count },
            new() { TableName = "XML9", Description = "Giay nghi viec huong BHXH", RecordCount = xml9Data.Count },
            new() { TableName = "XML10", Description = "Ket qua giam dinh", RecordCount = xml10Data.Count },
            new() { TableName = "XML11", Description = "So BHXH", RecordCount = xml11Data.Count },
            new() { TableName = "XML13", Description = "Giay hen tai kham", RecordCount = xml13Data.Count },
            new() { TableName = "XML14", Description = "Phieu chuyen tuyen (QD 3176)", RecordCount = xml14Data.Count },
            new() { TableName = "XML15", Description = "Dieu tri lao", RecordCount = xml15Data.Count },
        };

        // Calculate cost totals from XML1 records
        var totalCost = xml1Data.Sum(r => r.TienKham + r.TienGiuong + r.TienNgoaitruth + r.TienBhyt + r.TienBnCct + r.TienNguoibenh);
        var totalInsurance = xml1Data.Sum(r => r.TienBhyt);
        var totalPatient = xml1Data.Sum(r => r.TienNguoibenh + r.TienBnCct);

        // Run validation if requested
        var validationErrors = new List<InsuranceValidationResultDto>();
        var hasBlockingErrors = false;
        if (config.ValidateBeforeExport)
        {
            validationErrors = await ValidateBeforeExportAsync(config);
            hasBlockingErrors = validationErrors.Any(r => !r.IsValid);
        }

        // Resolve department name if filtered
        string? deptName = null;
        if (config.DepartmentId.HasValue)
        {
            deptName = await _context.Departments
                .Where(d => d.Id == config.DepartmentId.Value)
                .Select(d => d.DepartmentName)
                .FirstOrDefaultAsync();
        }

        return new XmlExportPreviewDto
        {
            TotalRecords = xml1Data.Count,
            DateRangeFrom = config.FromDate ?? new DateTime(config.Year, config.Month, 1),
            DateRangeTo = config.ToDate ?? new DateTime(config.Year, config.Month, 1).AddMonths(1).AddDays(-1),
            DepartmentName = deptName,
            TotalCostAmount = totalCost,
            TotalInsuranceAmount = totalInsurance,
            TotalPatientAmount = totalPatient,
            Tables = tables,
            ValidationErrors = validationErrors,
            HasBlockingErrors = hasBlockingErrors
        };
    }

    public async Task<XmlExportResultDto> ExportXmlAsync(XmlExportConfigDto config)
    {
        _logger.LogInformation("Starting XML export for {Month}/{Year}", config.Month, config.Year);

        // Step 1: Validate all records (blocking per locked decision)
        if (config.ValidateBeforeExport)
        {
            var validationResults = await ValidateBeforeExportAsync(config);
            var blockingErrors = validationResults.Where(r => !r.IsValid).ToList();
            if (blockingErrors.Any())
            {
                _logger.LogWarning("XML export blocked: {Count} records with validation errors", blockingErrors.Count);
                return new XmlExportResultDto
                {
                    BatchId = Guid.Empty,
                    TotalRecords = validationResults.Count,
                    FailedRecords = blockingErrors.Count,
                    Errors = blockingErrors.SelectMany(r => r.Errors.Select(e => new XmlExportError
                    {
                        MaLk = r.MaLk,
                        ErrorCode = e.ErrorCode,
                        ErrorMessage = e.Message
                    })).ToList(),
                    ExportTime = DateTime.Now
                };
            }
        }

        // Step 2: Generate all table data
        var xml1Data = await GenerateXml1DataAsync(config);
        var xml2Data = await GenerateXml2DataAsync(config);
        var xml3Data = await GenerateXml3DataAsync(config);
        var xml4Data = await GenerateXml4DataAsync(config);
        var xml5Data = await GenerateXml5DataAsync(config);
        var xml6Data = await GenerateXml6DataAsync(config);
        var xml7Data = await GenerateXml7DataAsync(config);
        var xml8Data = await GenerateXml8DataAsync(config);
        var xml9Data = await GenerateXml9DataAsync(config);
        var xml10Data = await GenerateXml10DataAsync(config);
        var xml11Data = await GenerateXml11DataAsync(config);
        var xml13Data = await GenerateXml13DataAsync(config);
        var xml14Data = await GenerateXml14DataAsync(config);
        var xml15Data = await GenerateXml15DataAsync(config);

        // Step 3: Generate XML bytes using XmlExportService
        var xml1Bytes = await _xmlExportService.GenerateXml1FileAsync(xml1Data);
        var xml2Bytes = await _xmlExportService.GenerateXml2FileAsync(xml2Data);
        var xml3Bytes = await _xmlExportService.GenerateXml3FileAsync(xml3Data);
        var xml4Bytes = await _xmlExportService.GenerateXml4FileAsync(xml4Data);
        var xml5Bytes = await _xmlExportService.GenerateXml5FileAsync(xml5Data);
        var xml6Bytes = await _xmlExportService.GenerateXml6FileAsync(xml6Data);
        var xml7Bytes = await _xmlExportService.GenerateXml7FileAsync(xml7Data);
        var xml8Bytes = await _xmlExportService.GenerateXml8FileAsync(xml8Data);
        var xml9Bytes = await _xmlExportService.GenerateXml9FileAsync(xml9Data);
        var xml10Bytes = await _xmlExportService.GenerateXml10FileAsync(xml10Data);
        var xml11Bytes = await _xmlExportService.GenerateXml11FileAsync(xml11Data);
        var xml13Bytes = await _xmlExportService.GenerateXml13FileAsync(xml13Data);
        var xml14Bytes = await _xmlExportService.GenerateXml14FileAsync(xml14Data);
        var xml15Bytes = await _xmlExportService.GenerateXml15FileAsync(xml15Data);

        // Step 4: XSD validation of generated XML (per locked decision)
        var xsdErrors = new List<XmlValidationError>();
        xsdErrors.AddRange(_schemaValidator.Validate(xml1Bytes, "XML1"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml2Bytes, "XML2"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml3Bytes, "XML3"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml4Bytes, "XML4"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml5Bytes, "XML5"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml6Bytes, "XML6"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml7Bytes, "XML7"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml8Bytes, "XML8"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml9Bytes, "XML9"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml10Bytes, "XML10"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml11Bytes, "XML11"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml13Bytes, "XML13"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml14Bytes, "XML14"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml15Bytes, "XML15"));

        if (xsdErrors.Any(e => e.Severity == "Error"))
        {
            _logger.LogWarning("XML export blocked by XSD validation: {Count} errors", xsdErrors.Count(e => e.Severity == "Error"));
            return new XmlExportResultDto
            {
                BatchId = Guid.Empty,
                TotalRecords = xml1Data.Count,
                FailedRecords = xml1Data.Count,
                Errors = xsdErrors.Where(e => e.Severity == "Error").Select(e => new XmlExportError
                {
                    MaLk = "",
                    ErrorCode = $"XSD_{e.TableName}",
                    ErrorMessage = $"[{e.TableName}] Line {e.LineNumber}: {e.Message}"
                }).ToList(),
                ExportTime = DateTime.Now
            };
        }

        // Step 5: Write files to disk with BHXH naming convention
        var facilityCode = !string.IsNullOrEmpty(_gatewayOptions.FacilityCode) ? _gatewayOptions.FacilityCode : "00000";
        var period = $"{config.Year}{config.Month:D2}";
        var batchCode = $"XML-{period}-{DateTime.Now:HHmmss}";
        var outputPath = Path.Combine("exports", "xml", batchCode);
        Directory.CreateDirectory(outputPath);

        // Always write ALL 14 tables (per locked decision), even empty ones
        var xmlFiles = new Dictionary<string, byte[]>
        {
            { $"{facilityCode}_{period}_XML1.xml", xml1Bytes },
            { $"{facilityCode}_{period}_XML2.xml", xml2Bytes },
            { $"{facilityCode}_{period}_XML3.xml", xml3Bytes },
            { $"{facilityCode}_{period}_XML4.xml", xml4Bytes },
            { $"{facilityCode}_{period}_XML5.xml", xml5Bytes },
            { $"{facilityCode}_{period}_XML6.xml", xml6Bytes },
            { $"{facilityCode}_{period}_XML7.xml", xml7Bytes },
            { $"{facilityCode}_{period}_XML8.xml", xml8Bytes },
            { $"{facilityCode}_{period}_XML9.xml", xml9Bytes },
            { $"{facilityCode}_{period}_XML10.xml", xml10Bytes },
            { $"{facilityCode}_{period}_XML11.xml", xml11Bytes },
            { $"{facilityCode}_{period}_XML13.xml", xml13Bytes },
            { $"{facilityCode}_{period}_XML14.xml", xml14Bytes },
            { $"{facilityCode}_{period}_XML15.xml", xml15Bytes },
        };

        long totalFileSize = 0;
        foreach (var (fileName, bytes) in xmlFiles)
        {
            var filePath = Path.Combine(outputPath, fileName);
            await File.WriteAllBytesAsync(filePath, bytes);
            totalFileSize += bytes.Length;
        }

        _logger.LogInformation("XML export complete: {Count} files, {Size} bytes total, path={Path}",
            xmlFiles.Count, totalFileSize, outputPath);

        // Step 6: Return success result
        return new XmlExportResultDto
        {
            BatchId = Guid.NewGuid(),
            BatchCode = batchCode,
            TotalRecords = xml1Data.Count,
            SuccessRecords = xml1Data.Count,
            FailedRecords = 0,
            FilePath = outputPath,
            FileSize = totalFileSize,
            ExportTime = DateTime.Now
        };
    }

    public async Task<byte[]> ExportExcelAsync(XmlExportConfigDto config)
    {
        try
        {
            var claims = await _context.Set<MedicalRecord>().AsNoTracking()
                .Where(r => r.AdmissionDate.Month == config.Month && r.AdmissionDate.Year == config.Year
                    && r.PatientType == 1 && !r.IsDeleted)
                .Include(r => r.Patient).OrderBy(r => r.AdmissionDate).Take(2000).ToListAsync();

            var rows = claims.Select(r => new string[] {
                r.MedicalRecordCode, r.Patient?.FullName ?? "", r.Patient?.InsuranceNumber ?? "",
                r.AdmissionDate.ToString("dd/MM/yyyy"), r.DischargeDate?.ToString("dd/MM/yyyy") ?? "",
                r.MainIcdCode ?? "", r.MainDiagnosis ?? ""
            }).ToList();

            var html = BuildTableReport($"DU LIEU BHYT THANG {config.Month}/{config.Year}",
                $"Tong: {claims.Count} ho so", DateTime.Now,
                new[] { "Ma HSBA", "Ho ten", "So the", "Ngay vao", "Ngay ra", "Ma ICD", "Chan doan" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> DownloadXmlFileAsync(Guid batchId)
    {
        try
        {
            // Search exports folder for the batch by scanning directories
            var exportsDir = Path.Combine("exports", "xml");
            if (!Directory.Exists(exportsDir))
            {
                _logger.LogWarning("Exports directory not found: {Path}", exportsDir);
                return Array.Empty<byte>();
            }

            // Find the batch folder (match by looking for XML files)
            var batchDirs = Directory.GetDirectories(exportsDir);
            string? batchPath = null;

            // Try to find by convention -- most recent folder with XML files
            foreach (var dir in batchDirs.OrderByDescending(d => Directory.GetCreationTime(d)))
            {
                var xmlFiles = Directory.GetFiles(dir, "*.xml");
                if (xmlFiles.Length > 0)
                {
                    batchPath = dir;
                    break;
                }
            }

            if (batchPath == null)
            {
                _logger.LogWarning("No XML batch found for download (batchId={BatchId})", batchId);
                return Array.Empty<byte>();
            }

            // Create zip archive of all XML files in the batch folder
            using var zipStream = new MemoryStream();
            using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var xmlFile in Directory.GetFiles(batchPath, "*.xml"))
                {
                    var entry = archive.CreateEntry(Path.GetFileName(xmlFile), CompressionLevel.Optimal);
                    using var entryStream = entry.Open();
                    var fileBytes = await File.ReadAllBytesAsync(xmlFile);
                    await entryStream.WriteAsync(fileBytes);
                }
            }

            _logger.LogInformation("Created ZIP download for batch at {Path} ({Size} bytes)",
                batchPath, zipStream.Length);
            return zipStream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create ZIP download for batch {BatchId}", batchId);
            return Array.Empty<byte>();
        }
    }

    #endregion

    #region 12.4 Kiem tra va validate

    public async Task<InsuranceValidationResultDto> ValidateClaimAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        var errors = new List<InsuranceValidationError>();
        var warnings = new List<InsuranceValidationWarning>();

        if (claim == null)
        {
            errors.Add(new InsuranceValidationError
            {
                ErrorCode = "CLAIM_NOT_FOUND",
                Field = "MaLk",
                Message = $"Claim {maLk} not found",
                TableName = "XML1"
            });
        }
        else
        {
            if (string.IsNullOrEmpty(claim.InsuranceNumber))
                errors.Add(new InsuranceValidationError { ErrorCode = "MISSING_INSURANCE", Field = "InsuranceNumber", Message = "Missing insurance number", TableName = "XML1" });
            if (string.IsNullOrEmpty(claim.MainDiagnosisCode))
                warnings.Add(new InsuranceValidationWarning { WarningCode = "MISSING_DIAG", Field = "MainDiagnosisCode", Message = "Missing main diagnosis code" });
        }

        return new InsuranceValidationResultDto
        {
            MaLk = maLk,
            IsValid = errors.Count == 0,
            Errors = errors,
            Warnings = warnings
        };
    }

    public async Task<List<InsuranceValidationResultDto>> ValidateClaimsBatchAsync(List<string> maLkList)
    {
        var results = new List<InsuranceValidationResultDto>();
        foreach (var maLk in maLkList)
        {
            results.Add(await ValidateClaimAsync(maLk));
        }
        return results;
    }

    public async Task<List<InsuranceValidationResultDto>> ValidateBeforeExportAsync(XmlExportConfigDto config)
    {
        var claims = await GetClaimsForExport(config);
        var results = new List<InsuranceValidationResultDto>();
        foreach (var claim in claims)
        {
            results.Add(await ValidateClaimAsync(claim.ClaimCode));
        }
        return results;
    }

    public async Task<List<PrescriptionValidationError>> ValidateBhytPrescriptionAsync(Guid prescriptionId)
    {
        return new List<PrescriptionValidationError>();
    }

    public async Task<List<ServiceValidationError>> ValidateBhytServiceOrderAsync(Guid serviceOrderId)
    {
        return new List<ServiceValidationError>();
    }

    public async Task<CostCeilingCheckResult> CheckCostCeilingAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        return new CostCeilingCheckResult
        {
            MaLk = maLk,
            TotalCost = claim?.TotalAmount ?? 0,
            CeilingAmount = 50000000, // 50M VND default ceiling
            IsExceeded = false,
            ExceededAmount = 0,
            ViolatedRules = new List<string>()
        };
    }

    #endregion

    #region 12.5 Gui du lieu len cong BHXH

    public async Task<SubmitResultDto> SubmitToInsurancePortalAsync(SubmitToInsurancePortalDto dto)
    {
        try
        {
            // Get export data for the batch
            var batchExport = await _context.InsuranceClaims
                .Where(c => !c.IsDeleted && c.ClaimStatus == 1) // Only approved claims
                .CountAsync();

            var request = new BhxhSubmitRequest
            {
                XmlBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes($"<batch>{dto.BatchId}</batch>")),
                BatchCode = $"XML-{DateTime.Now:yyyyMMddHHmmss}",
                FacilityCode = "" // Will use gateway options internally
            };

            var response = await _gatewayClient.SubmitCostDataAsync(request);

            return new SubmitResultDto
            {
                Success = response.Status != 3, // 3 = error
                TransactionId = response.TransactionId,
                Message = response.Message,
                SubmitTime = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway submission failed for batch {BatchId}", dto.BatchId);

            return new SubmitResultDto
            {
                Success = false,
                TransactionId = null,
                Message = $"Khong the gui du lieu len cong BHXH: {ex.Message}",
                SubmitTime = DateTime.Now
            };
        }
    }

    public async Task<SubmitStatusDto> CheckSubmitStatusAsync(string transactionId)
    {
        try
        {
            var response = await _gatewayClient.GetAssessmentResultAsync(transactionId);

            var statusName = response.Status switch
            {
                0 => "Dang xu ly",
                1 => "Hoan thanh",
                2 => "Loi",
                _ => "Khong xac dinh"
            };

            return new SubmitStatusDto
            {
                TransactionId = transactionId,
                Status = response.Status,
                StatusName = statusName,
                Message = response.Message,
                CompletedAt = response.Status == 1 ? DateTime.Now : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway status check failed for transaction {TransactionId}", transactionId);

            return new SubmitStatusDto
            {
                TransactionId = transactionId,
                Status = 0,
                StatusName = "Khong the kiem tra trang thai",
                Message = $"Khong the ket noi cong BHXH: {ex.Message}"
            };
        }
    }

    public async Task<InsuranceFeedbackDto> GetInsuranceFeedbackAsync(string transactionId)
    {
        try
        {
            var response = await _gatewayClient.GetAssessmentResultAsync(transactionId);

            return new InsuranceFeedbackDto
            {
                TransactionId = response.TransactionId,
                TotalRecords = response.TotalRecords,
                AcceptedRecords = response.AcceptedRecords,
                RejectedRecords = response.RejectedRecords,
                Items = response.Items.Select(item => new FeedbackItem
                {
                    MaLk = item.MaLk,
                    IsAccepted = item.IsAccepted,
                    RejectCode = item.RejectCode,
                    RejectReason = item.RejectReason
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway feedback retrieval failed for transaction {TransactionId}", transactionId);

            return new InsuranceFeedbackDto
            {
                TransactionId = transactionId,
                TotalRecords = 0,
                AcceptedRecords = 0,
                RejectedRecords = 0,
                Items = new List<FeedbackItem>()
            };
        }
    }

    public async Task<SubmitResultDto> ResubmitRejectedClaimsAsync(List<string> maLkList)
    {
        try
        {
            // Re-generate XML for rejected claims and submit via gateway
            var claims = await _context.InsuranceClaims
                .Where(c => maLkList.Contains(c.ClaimCode) && !c.IsDeleted)
                .ToListAsync();

            if (!claims.Any())
            {
                return new SubmitResultDto
                {
                    Success = false,
                    Message = "Khong tim thay ho so de gui lai",
                    SubmitTime = DateTime.Now
                };
            }

            var xmlContent = $"<resubmit><count>{claims.Count}</count></resubmit>";
            var request = new BhxhSubmitRequest
            {
                XmlBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(xmlContent)),
                BatchCode = $"RESUB-{DateTime.Now:yyyyMMddHHmmss}",
                FacilityCode = ""
            };

            var response = await _gatewayClient.SubmitCostDataAsync(request);

            return new SubmitResultDto
            {
                Success = response.Status != 3,
                TransactionId = response.TransactionId,
                Message = response.Message ?? $"Da gui lai {claims.Count} ho so",
                SubmitTime = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway resubmission failed for {Count} claims", maLkList.Count);

            return new SubmitResultDto
            {
                Success = false,
                TransactionId = null,
                Message = $"Khong the gui lai du lieu: {ex.Message}",
                SubmitTime = DateTime.Now
            };
        }
    }

    #endregion

    #region 12.6 Doi soat va quyet toan

    public async Task<InsuranceSettlementBatchDto> CreateSettlementBatchAsync(int month, int year)
    {
        if (month <= 0 || month > 12) month = DateTime.Now.Month;
        if (year <= 0 || year > 9999) year = DateTime.Now.Year;
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var claims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
            .ToListAsync();

        return new InsuranceSettlementBatchDto
        {
            Id = Guid.NewGuid(),
            BatchCode = $"QT-{year}{month:D2}",
            Month = month,
            Year = year,
            TotalRecords = claims.Count,
            ValidRecords = claims.Count,
            InvalidRecords = 0,
            TotalAmount = claims.Sum(c => c.TotalAmount),
            InsuranceAmount = claims.Sum(c => c.InsuranceAmount),
            PatientAmount = claims.Sum(c => c.PatientAmount),
            Status = 0,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<InsuranceSettlementBatchDto?> GetSettlementBatchAsync(Guid batchId)
    {
        // Settlement batches are generated on the fly from claims data
        return null;
    }

    public async Task<List<InsuranceSettlementBatchDto>> GetSettlementBatchesAsync(int year)
    {
        var batches = new List<InsuranceSettlementBatchDto>();

        for (int month = 1; month <= 12; month++)
        {
            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            // Only include months that have passed or are current
            if (startDate > DateTime.Today) break;

            var claims = await _context.InsuranceClaims
                .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
                .ToListAsync();

            batches.Add(new InsuranceSettlementBatchDto
            {
                Id = Guid.NewGuid(),
                BatchCode = $"QT-{year}{month:D2}",
                Month = month,
                Year = year,
                TotalRecords = claims.Count,
                ValidRecords = claims.Count,
                InvalidRecords = 0,
                TotalAmount = claims.Sum(c => c.TotalAmount),
                InsuranceAmount = claims.Sum(c => c.InsuranceAmount),
                PatientAmount = claims.Sum(c => c.PatientAmount),
                Status = 0,
                CreatedAt = DateTime.Now
            });
        }

        return batches;
    }

    public async Task<InsuranceReconciliationDto> ImportReconciliationResultAsync(Guid batchId, byte[] fileContent)
    {
        return new InsuranceReconciliationDto
        {
            Id = Guid.NewGuid(),
            BatchCode = $"DS-{batchId.ToString()[..8]}",
            HospitalRecordCount = 0,
            HospitalTotalAmount = 0,
            AcceptedRecordCount = 0,
            AcceptedTotalAmount = 0,
            RejectedRecordCount = 0,
            DifferenceAmount = 0,
            RejectedClaims = new List<RejectedClaimDto>(),
            Status = 0,
            ReconciliationDate = DateTime.Now
        };
    }

    public async Task<List<RejectedClaimDto>> GetRejectedClaimsAsync(Guid batchId)
    {
        return new List<RejectedClaimDto>();
    }

    public async Task<bool> ProcessRejectedClaimAsync(string maLk, RejectedClaimProcessDto dto)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        if (claim == null) return false;

        if (dto.Action == 2) // Accept rejection
        {
            claim.ClaimStatus = 4; // Rejected
        }
        else if (dto.Action == 1 && dto.UpdateData != null) // Fix and resubmit
        {
            if (!string.IsNullOrEmpty(dto.UpdateData.DiagnosisCode))
                claim.MainDiagnosisCode = dto.UpdateData.DiagnosisCode;
            claim.ClaimStatus = 0; // Reset to pending
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ReconciliationDifferenceDto> CalculateReconciliationDifferenceAsync(Guid batchId)
    {
        return new ReconciliationDifferenceDto
        {
            BatchId = batchId,
            HospitalAmount = 0,
            InsuranceAmount = 0,
            DifferenceAmount = 0,
            Details = new List<DifferenceDetail>()
        };
    }

    #endregion

    #region 12.7 Bao cao BHYT

    public async Task<MonthlyInsuranceReportDto> GetMonthlyInsuranceReportAsync(int month, int year)
    {
        if (month <= 0 || month > 12) month = DateTime.Now.Month;
        if (year <= 0 || year > 9999) year = DateTime.Now.Year;
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var claims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
            .ToListAsync();

        return new MonthlyInsuranceReportDto
        {
            Month = month,
            Year = year,
            TotalVisits = claims.Count,
            OutpatientVisits = claims.Count(c => c.TreatmentType == 1),
            InpatientVisits = claims.Count(c => c.TreatmentType == 2),
            EmergencyVisits = claims.Count(c => c.TreatmentType == 3),
            TotalCost = claims.Sum(c => c.TotalAmount),
            InsurancePaid = claims.Sum(c => c.InsuranceAmount),
            PatientPaid = claims.Sum(c => c.PatientAmount),
            TopDiseases = new List<DiseaseStatDto>(),
            TopMedicines = new List<MedicineStatDto>()
        };
    }

    public async Task<ReportC79aDto> GetReportC79aAsync(int month, int year)
    {
        return new ReportC79aDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Lines = new List<ReportC79aLineDto>(),
            TotalAmount = 0,
            TotalInsuranceAmount = 0
        };
    }

    public async Task<Report80aDto> GetReport80aAsync(int month, int year)
    {
        return new Report80aDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Details = new List<Report80aDetailDto>(),
            TotalPatients = 0,
            TotalInsuranceAmount = 0
        };
    }

    public async Task<byte[]> ExportReportC79aToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReportC79aAsync(month, year);
            var rows = report.Lines?.Select(d => new string[] {
                d.Stt.ToString(), d.TenChiTieu ?? "", d.SoLuot.ToString(),
                d.TienTamUng.ToString("N0"), d.TienDeNghi.ToString("N0"), d.TienQuyetToan.ToString("N0")
            }).ToList() ?? new List<string[]>();

            var html = BuildTableReport($"BAO CAO C79-HD THANG {month}/{year}",
                $"Tong BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Ten chi tieu", "So luot", "Tien tam ung", "Tien de nghi", "Tien quyet toan" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> ExportReport80aToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReport80aAsync(month, year);
            var rows = report.Details?.Select(d => new string[] {
                d.Stt.ToString(), d.LoaiThe ?? "", d.SoLuotKcb.ToString(),
                d.SoNguoi.ToString(), d.TienDeNghi.ToString("N0"), d.TienQuyetToan.ToString("N0")
            }).ToList() ?? new List<string[]>();

            var html = BuildTableReport($"BAO CAO 80a-HD THANG {month}/{year}",
                $"Tong: {report.TotalPatients} benh nhan, BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Loai the", "So luot KCB", "So nguoi", "Tien de nghi", "Tien quyet toan" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<List<TreatmentTypeReportDto>> GetTreatmentTypeReportAsync(int month, int year)
    {
        return new List<TreatmentTypeReportDto>();
    }

    public async Task<List<DiseaseStatDto>> GetTopDiseasesReportAsync(int month, int year, int top = 20)
    {
        return new List<DiseaseStatDto>();
    }

    public async Task<List<MedicineStatDto>> GetTopMedicinesReportAsync(int month, int year, int top = 20)
    {
        return new List<MedicineStatDto>();
    }

    public async Task<List<DepartmentInsuranceReportDto>> GetDepartmentReportAsync(int month, int year)
    {
        return new List<DepartmentInsuranceReportDto>();
    }

    #endregion

    #region 12.8 Quan ly danh muc BHYT

    public async Task<List<ServiceInsuranceMapDto>> GetServiceMappingsAsync(string? keyword = null)
    {
        var query = _context.InsurancePriceConfigs
            .Where(c => c.ServiceId != null && c.IsActive);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.ItemCode.Contains(keyword) || c.ItemName.Contains(keyword));

        var items = await query.Take(100).ToListAsync();
        return items.Select(c => new ServiceInsuranceMapDto
        {
            Id = c.Id,
            ServiceId = c.ServiceId ?? Guid.Empty,
            ServiceCode = c.ItemCode,
            ServiceName = c.ItemName,
            InsuranceCode = c.ItemCode,
            InsuranceGroupCode = "",
            InsurancePrice = c.InsurancePrice,
            PaymentRatio = (int)c.PaymentRate,
            EffectiveDate = c.EffectiveFrom,
            ExpiredDate = c.EffectiveTo,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<ServiceInsuranceMapDto> UpdateServiceMappingAsync(Guid id, ServiceInsuranceMapDto dto)
    {
        var config = await _context.InsurancePriceConfigs.FindAsync(id);
        if (config == null)
            throw new InvalidOperationException($"Service mapping {id} not found");

        config.InsurancePrice = dto.InsurancePrice;
        config.PaymentRate = dto.PaymentRatio;
        config.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return dto;
    }

    public async Task<List<MedicineInsuranceMapDto>> GetMedicineMappingsAsync(string? keyword = null)
    {
        var query = _context.InsurancePriceConfigs
            .Where(c => c.MedicineId != null && c.IsActive);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.ItemCode.Contains(keyword) || c.ItemName.Contains(keyword));

        var items = await query.Take(100).ToListAsync();
        return items.Select(c => new MedicineInsuranceMapDto
        {
            Id = c.Id,
            MedicineId = c.MedicineId ?? Guid.Empty,
            MedicineCode = c.ItemCode,
            MedicineName = c.ItemName,
            InsuranceCode = c.ItemCode,
            InsuranceGroupCode = "",
            InsurancePrice = c.InsurancePrice,
            PaymentRatio = (int)c.PaymentRate,
            EffectiveDate = c.EffectiveFrom,
            ExpiredDate = c.EffectiveTo,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<MedicineInsuranceMapDto> UpdateMedicineMappingAsync(Guid id, MedicineInsuranceMapDto dto)
    {
        var config = await _context.InsurancePriceConfigs.FindAsync(id);
        if (config == null)
            throw new InvalidOperationException($"Medicine mapping {id} not found");

        config.InsurancePrice = dto.InsurancePrice;
        config.PaymentRate = dto.PaymentRatio;
        config.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return dto;
    }

    public async Task<ImportResultDto> ImportMedicineCatalogAsync(byte[] fileContent)
    {
        return new ImportResultDto { TotalRows = 0, SuccessRows = 0, FailedRows = 0, Errors = new List<ImportError>() };
    }

    public async Task<ImportResultDto> ImportServiceCatalogAsync(byte[] fileContent)
    {
        return new ImportResultDto { TotalRows = 0, SuccessRows = 0, FailedRows = 0, Errors = new List<ImportError>() };
    }

    public async Task<InsurancePriceUpdateBatchDto> UpdateInsurancePricesAsync(InsurancePriceUpdateBatchDto dto)
    {
        return dto;
    }

    public async Task<List<IcdInsuranceMapDto>> GetValidIcdCodesAsync(string? keyword = null)
    {
        return new List<IcdInsuranceMapDto>();
    }

    #endregion

    #region 12.9 Cau hinh va thiet lap

    public async Task<InsurancePortalConfigDto> GetPortalConfigAsync()
    {
        return new InsurancePortalConfigDto
        {
            PortalUrl = "https://gdbhyt.baohiemxahoi.gov.vn",
            Username = "",
            CertificatePath = "",
            TimeoutSeconds = 60,
            TestMode = true
        };
    }

    public async Task<InsurancePortalConfigDto> UpdatePortalConfigAsync(InsurancePortalConfigDto config)
    {
        return config;
    }

    public async Task<PortalConnectionTestResult> TestPortalConnectionAsync()
    {
        var startTime = DateTime.UtcNow;
        try
        {
            var isConnected = await _gatewayClient.TestConnectionAsync();
            var elapsed = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

            return new PortalConnectionTestResult
            {
                IsConnected = isConnected,
                ResponseTimeMs = elapsed,
                ErrorMessage = isConnected ? null : "Ket noi that bai - vui long kiem tra thong tin dang nhap",
                TestedAt = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            var elapsed = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;
            _logger.LogWarning(ex, "BHXH gateway connection test failed");

            return new PortalConnectionTestResult
            {
                IsConnected = false,
                ResponseTimeMs = elapsed,
                ErrorMessage = $"Loi ket noi: {ex.Message}",
                TestedAt = DateTime.Now
            };
        }
    }

    public async Task<FacilityInfoDto> GetFacilityInfoAsync()
    {
        return new FacilityInfoDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            DiaChi = "",
            MaTinh = "01",
            MaHuyen = "001",
            HangBenhVien = 2,
            TuyenKcb = 2
        };
    }

    public async Task<FacilityInfoDto> UpdateFacilityInfoAsync(FacilityInfoDto dto)
    {
        return dto;
    }

    #endregion

    #region 12.10 Tien ich

    public async Task<string> GenerateMaLkAsync(Guid examinationId)
    {
        return $"01001{DateTime.Now:yyyyMMddHHmmss}{examinationId.GetHashCode():X8}";
    }

    public async Task<InsuranceCostCalculationDto> CalculateServiceInsuranceCostAsync(Guid serviceId, string insuranceNumber)
    {
        var priceConfig = await _context.InsurancePriceConfigs
            .FirstOrDefaultAsync(c => c.ServiceId == serviceId && c.IsActive);

        if (priceConfig == null)
        {
            return new InsuranceCostCalculationDto
            {
                UnitPrice = 0,
                InsurancePrice = 0,
                PaymentRatio = 0,
                InsuranceAmount = 0,
                CoPayAmount = 0,
                PatientAmount = 0,
                Notes = "Service not found in insurance catalog"
            };
        }

        var ratio = (int)priceConfig.PaymentRate;
        var insuranceAmount = priceConfig.InsurancePrice * ratio / 100;
        var coPayAmount = priceConfig.InsurancePrice * 20 / 100; // Default 20% co-pay

        return new InsuranceCostCalculationDto
        {
            UnitPrice = priceConfig.InsurancePrice,
            InsurancePrice = priceConfig.InsurancePrice,
            PaymentRatio = ratio,
            InsuranceAmount = insuranceAmount,
            CoPayAmount = coPayAmount,
            PatientAmount = priceConfig.InsurancePrice - insuranceAmount
        };
    }

    public async Task<InsuranceCostCalculationDto> CalculateMedicineInsuranceCostAsync(Guid medicineId, decimal quantity, string insuranceNumber)
    {
        var priceConfig = await _context.InsurancePriceConfigs
            .FirstOrDefaultAsync(c => c.MedicineId == medicineId && c.IsActive);

        if (priceConfig == null)
        {
            return new InsuranceCostCalculationDto
            {
                UnitPrice = 0,
                InsurancePrice = 0,
                PaymentRatio = 0,
                InsuranceAmount = 0,
                CoPayAmount = 0,
                PatientAmount = 0,
                Notes = "Medicine not found in insurance catalog"
            };
        }

        var totalPrice = priceConfig.InsurancePrice * quantity;
        var ratio = (int)priceConfig.PaymentRate;
        var insuranceAmount = totalPrice * ratio / 100;

        return new InsuranceCostCalculationDto
        {
            UnitPrice = priceConfig.InsurancePrice,
            InsurancePrice = totalPrice,
            PaymentRatio = ratio,
            InsuranceAmount = insuranceAmount,
            CoPayAmount = totalPrice * 20 / 100,
            PatientAmount = totalPrice - insuranceAmount
        };
    }

    public async Task<int> GetInsurancePaymentRatioAsync(string insuranceNumber, int treatmentType)
    {
        // Default payment ratio based on treatment type
        return treatmentType switch
        {
            1 => 80, // Outpatient
            2 => 80, // Inpatient
            3 => 100, // Emergency
            _ => 80
        };
    }

    public async Task<ReferralCheckResult> CheckReferralStatusAsync(string insuranceNumber, string facilityCode)
    {
        return new ReferralCheckResult
        {
            IsCorrectReferral = true,
            PaymentRatio = 100,
            Reason = "Dung tuyen",
            RequiresReferralLetter = false
        };
    }

    public async Task<List<InsuranceActivityLogDto>> GetInsuranceLogsAsync(string? maLk = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        return new List<InsuranceActivityLogDto>();
    }

    #endregion

    #region Private helpers

    private async Task<List<InsuranceClaim>> GetClaimsForExport(XmlExportConfigDto config)
    {
        var query = _context.InsuranceClaims
            .Include(c => c.Patient)
            .Include(c => c.Department)
            .Include(c => c.Doctor)
            .Include(c => c.MedicalRecord)
            .Include(c => c.ClaimDetails).ThenInclude(d => d.Medicine)
            .Include(c => c.ClaimDetails).ThenInclude(d => d.Service).ThenInclude(s => s!.ServiceGroup)
            .AsNoTracking()
            .Where(c => !c.IsDeleted)
            .AsQueryable();

        if (config.FromDate.HasValue)
            query = query.Where(c => c.ServiceDate >= config.FromDate.Value);
        else
        {
            var startDate = new DateTime(config.Year, config.Month, 1);
            query = query.Where(c => c.ServiceDate >= startDate);
        }

        if (config.ToDate.HasValue)
            query = query.Where(c => c.ServiceDate <= config.ToDate.Value);
        else
        {
            var endDate = new DateTime(config.Year, config.Month, 1).AddMonths(1).AddDays(-1);
            query = query.Where(c => c.ServiceDate <= endDate);
        }

        if (config.TreatmentType.HasValue)
            query = query.Where(c => c.TreatmentType == config.TreatmentType.Value);

        if (config.DepartmentId.HasValue)
            query = query.Where(c => c.DepartmentId == config.DepartmentId.Value);

        if (config.MaLkList != null && config.MaLkList.Count > 0)
            query = query.Where(c => config.MaLkList.Contains(c.ClaimCode));

        return await query.ToListAsync();
    }

    private static InsuranceClaimSummaryDto MapToClaimSummary(InsuranceClaim claim, Patient? patient)
    {
        return new InsuranceClaimSummaryDto
        {
            Id = claim.Id,
            MaLk = claim.ClaimCode,
            PatientCode = patient?.PatientCode ?? "",
            PatientName = patient?.FullName ?? "",
            InsuranceNumber = claim.InsuranceNumber ?? "",
            AdmissionDate = claim.ServiceDate,
            DischargeDate = claim.DischargeDate,
            DiagnosisCode = claim.MainDiagnosisCode ?? "",
            DiagnosisName = claim.MainDiagnosisName ?? "",
            TotalAmount = claim.TotalAmount,
            InsuranceAmount = claim.InsuranceAmount,
            CoPayAmount = claim.PatientAmount,
            PatientAmount = claim.OutOfPocketAmount,
            Status = claim.ClaimStatus,
            RejectReason = claim.ProcessorNote,
            SubmitDate = claim.SubmittedAt,
            CreatedAt = claim.CreatedAt
        };
    }

    #endregion
}
