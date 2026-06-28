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

public partial class InsuranceXmlService
{

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

}
