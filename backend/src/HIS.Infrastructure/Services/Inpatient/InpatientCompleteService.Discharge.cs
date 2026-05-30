using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K6 phien 4 (2026-05-30): tach 3.7 Discharge (~495 dong) khoi InpatientCompleteService.
public partial class InpatientCompleteService {
    #region 3.7 Discharge

    public async Task<PreDischargeCheckDto> CheckPreDischargeAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null)
            throw new Exception("Admission not found");

        // Check unpaid prescriptions
        var unclaimedRx = await _context.Prescriptions
            .CountAsync(p => p.MedicalRecordId == admission.MedicalRecordId && p.Status < 2);

        // Check pending results
        var pendingResults = await _context.ServiceRequests
            .CountAsync(sr => sr.MedicalRecordId == admission.MedicalRecordId && sr.Status < 2);

        // Query billing for unpaid balance
        var totalServiceAmount = await _context.ServiceRequests
            .Where(sr => sr.MedicalRecordId == admission.MedicalRecordId && sr.Status != 4)
            .SumAsync(sr => sr.PatientAmount);
        var totalPaid = await _context.Receipts
            .Where(r => r.PatientId == admission.PatientId && r.ReceiptType == 2 && r.Status == 1)
            .SumAsync(r => r.FinalAmount);
        var remainingAmount = totalServiceAmount - totalPaid;
        var hasUnpaidBalance = remainingAmount > 0;

        var warnings = new List<string>();
        if (unclaimedRx > 0)
            warnings.Add($"Còn {unclaimedRx} đơn thuốc chưa cấp phát");
        if (hasUnpaidBalance)
            warnings.Add($"Còn nợ viện phí {remainingAmount:N0}đ");
        if (pendingResults > 0)
            warnings.Add($"Còn {pendingResults} chỉ định chưa có kết quả");

        return new PreDischargeCheckDto
        {
            AdmissionId = admissionId,
            PatientName = admission.Patient.FullName,
            IsInsuranceValid = true,
            TotalAmount = totalServiceAmount,
            PaidAmount = totalPaid,
            RemainingAmount = remainingAmount,
            HasUnpaidBalance = hasUnpaidBalance,
            HasUnclaimedMedicine = unclaimedRx > 0,
            UnclaimedPrescriptionCount = unclaimedRx,
            HasPendingResults = pendingResults > 0,
            PendingResultCount = pendingResults,
            IsMedicalRecordComplete = true,
            MissingDocuments = new List<string>(),
            CanDischarge = !hasUnpaidBalance && unclaimedRx == 0 && pendingResults == 0,
            Warnings = warnings
        };
    }

    public async Task<DischargeDto> DischargePatientAsync(CompleteDischargeDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
        if (admission == null)
            throw new Exception("Admission not found");
        if (admission.Status != 0)
            throw new Exception("Bệnh nhân không trong trạng thái đang điều trị, không thể xuất viện");

        // Enforce pre-discharge checks
        var preCheck = await CheckPreDischargeAsync(dto.AdmissionId);
        if (!preCheck.CanDischarge)
        {
            var issues = preCheck.Warnings.Any() ? string.Join("; ", preCheck.Warnings) : "Chưa đủ điều kiện xuất viện";
            throw new Exception($"Không thể xuất viện: {issues}");
        }

        // Create discharge record
        var discharge = new Discharge
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            DischargeDate = dto.DischargeDate,
            DischargeType = dto.DischargeType,
            DischargeCondition = dto.DischargeCondition,
            DischargeDiagnosis = dto.DischargeDiagnosis,
            DischargeInstructions = dto.DischargeInstructions,
            FollowUpDate = dto.FollowUpDate,
            DischargedBy = userId,
            CreatedAt = DateTime.Now,
            CreatedBy = null
        };

        _context.Set<Discharge>().Add(discharge);

        // Update admission status
        admission.Status = dto.DischargeType switch
        {
            1 => 1, // Xuất viện
            2 => 2, // Chuyển viện
            3 => 4, // Bỏ về
            4 => 3, // Tử vong
            _ => 1
        };

        // Release bed
        var bedAssignment = await _context.Set<BedAssignment>()
            .FirstOrDefaultAsync(ba => ba.AdmissionId == dto.AdmissionId && ba.Status == 0);
        if (bedAssignment != null)
        {
            bedAssignment.Status = 1;
            bedAssignment.ReleasedAt = DateTime.Now;
        }

        // Update medical record
        var medRecord = await _context.MedicalRecords.FindAsync(admission.MedicalRecordId);
        if (medRecord != null)
        {
            medRecord.Status = 3; // Đã xuất viện
            medRecord.MainDiagnosis = dto.DischargeDiagnosis;
        }

        await _context.SaveChangesAsync();

        var dischargeTypeName = dto.DischargeType switch
        {
            1 => "Ra viện",
            2 => "Chuyển viện",
            3 => "Bỏ về",
            4 => "Tử vong",
            _ => "Khác"
        };

        return new DischargeDto
        {
            Id = discharge.Id,
            AdmissionId = dto.AdmissionId,
            PatientName = admission.Patient.FullName,
            DischargeDate = dto.DischargeDate,
            DischargeType = dischargeTypeName,
            DischargeStatus = "Đã xuất viện",
            FinalDiagnosis = dto.DischargeDiagnosis ?? string.Empty,
            TreatmentSummary = dto.TreatmentSummary ?? string.Empty,
            DischargeInstructions = dto.DischargeInstructions ?? string.Empty,
            FollowUpDate = dto.FollowUpDate?.ToString("dd/MM/yyyy"),
            DischargedBy = userId.ToString()
        };
    }

    public async Task<bool> CancelDischargeAsync(Guid admissionId, string reason, Guid userId)
    {
        var discharge = await _context.Set<Discharge>()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);
        if (discharge == null)
            throw new Exception("Discharge record not found");

        _context.Set<Discharge>().Remove(discharge);

        // Revert admission status
        var admission = await _context.Set<Admission>().FindAsync(admissionId);
        if (admission != null)
            admission.Status = 0; // Đang điều trị

        // Update medical record
        var medRecord = await _context.MedicalRecords.FindAsync(admission?.MedicalRecordId);
        if (medRecord != null)
            medRecord.Status = 2; // Đang điều trị

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]> PrintDischargeCertificateAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var doctor = await _context.Users.FindAsync(admission.AdmittingDoctorId);

        var discharge = await _context.Set<Discharge>()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);

        var html = GetDischargeLetter(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            admission.AdmissionDate, discharge?.DischargeDate ?? DateTime.Now,
            admission.DiagnosisOnAdmission, discharge?.DischargeDiagnosis ?? medRecord.MainDiagnosis,
            discharge?.DischargeCondition.ToString(), discharge?.DischargeType ?? 1,
            discharge?.DischargeInstructions, discharge?.FollowUpDate,
            doctor?.FullName, null);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintReferralCertificateAsync(Guid admissionId, ReferralCertificateDto data)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">I. CƠ SỞ CHUYỂN ĐI</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tên cơ sở:</span><span class=""field-value"">{Esc(data.FromHospitalName)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã cơ sở:</span><span class=""field-value"">{Esc(data.FromHospitalCode)}</span></div>");
        bodyContent.AppendLine($@"<div class=""section-title"">II. CƠ SỞ NHẬN</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tên cơ sở:</span><span class=""field-value"">{Esc(data.ToHospitalName)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã cơ sở:</span><span class=""field-value"">{Esc(data.ToHospitalCode)}</span></div>");
        bodyContent.AppendLine($@"<div class=""section-title"">III. THÔNG TIN CHUYỂN TUYẾN</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Lý do chuyển:</span><span class=""field-value"">{Esc(data.TransferReason)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(data.Diagnosis)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tóm tắt điều trị:</span><span class=""field-value"">{Esc(data.TreatmentSummary)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tình trạng hiện tại:</span><span class=""field-value"">{Esc(data.CurrentCondition)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Yêu cầu dịch vụ:</span><span class=""field-value"">{Esc(data.RequestedServices)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày chuyển:</span><span class=""field-value"">{data.TransferDate:dd/MM/yyyy}</span></div>");

        var html = GetGenericForm(
            "GIẤY CHUYỂN TUYẾN", "Theo TT 14/2014/TT-BYT",
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            bodyContent.ToString(), data.DoctorName);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintServiceDisclosureAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var details = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted)
            .OrderBy(d => d.ServiceRequest.RequestDate)
            .ToListAsync();

        var headers = new[] { "Ngày", "Tên dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Nguồn" };
        var rows = details.Select(d =>
        {
            var source = d.PatientType switch { 1 => "BHYT", 2 => "Viện phí", _ => "Khác" };
            return new[]
            {
                d.ServiceRequest.RequestDate.ToString("dd/MM/yyyy"),
                d.Service?.ServiceName ?? "",
                d.Service?.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                source
            };
        }).ToList();

        var html = BuildTableReport(
            "BẢNG CÔNG KHAI DỊCH VỤ",
            $"BN: {Esc(patient.FullName)} - Mã BN: {Esc(patient.PatientCode)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintMedicineDisclosureAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var prescriptionDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2)
            .OrderBy(d => d.Prescription.PrescriptionDate)
            .ToListAsync();

        var headers = new[] { "Ngày", "Tên thuốc", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Nguồn" };
        var rows = prescriptionDetails.Select(d =>
        {
            var source = d.PatientType switch { 1 => "BHYT", 2 => "Viện phí", _ => "Khác" };
            return new[]
            {
                d.Prescription.PrescriptionDate.ToString("dd/MM/yyyy"),
                d.Medicine?.MedicineName ?? "",
                d.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                source
            };
        }).ToList();

        var html = BuildTableReport(
            "BẢNG CÔNG KHAI THUỐC",
            $"BN: {Esc(patient.FullName)} - Mã BN: {Esc(patient.PatientCode)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<BillingStatement6556Dto> GetBillingStatement6556Async(Guid admissionId)
    {
        return Task.FromResult(new BillingStatement6556Dto
        {
            AdmissionId = admissionId,
            AdmissionDate = DateTime.Now.AddDays(-7),
            DischargeDate = DateTime.Now,
            DaysOfStay = 7
        });
    }

    public async Task<byte[]> PrintBillingStatement6556Async(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var discharge = await _context.Set<Discharge>()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);
        var daysOfStay = discharge != null
            ? (discharge.DischargeDate - admission.AdmissionDate).Days
            : (DateTime.Now - admission.AdmissionDate).Days;

        // Gather services
        var serviceDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted)
            .ToListAsync();

        // Gather medicines
        var rxDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2)
            .ToListAsync();

        var headers = new[] { "Nội dung", "ĐVT", "SL", "Đơn giá BHYT", "Thành tiền", "Tỷ lệ TT(%)", "Nguồn" };
        var rows = new List<string[]>();

        foreach (var d in serviceDetails)
        {
            rows.Add(new[]
            {
                d.Service?.ServiceName ?? "",
                d.Service?.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                "100",
                d.PatientType == 1 ? "BHYT" : "VP"
            });
        }
        foreach (var d in rxDetails)
        {
            rows.Add(new[]
            {
                d.Medicine?.MedicineName ?? "",
                d.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                "100",
                d.PatientType == 1 ? "BHYT" : "VP"
            });
        }

        var html = BuildTableReport(
            "BẢNG KÊ CHI PHÍ KHÁM CHỮA BỆNH",
            $"(Mẫu 6556 - TT 09/2024/TT-BYT) | BN: {Esc(patient.FullName)} - {Esc(patient.PatientCode)} | HS: {Esc(medRecord.MedicalRecordCode)} | Khoa: {Esc(dept?.DepartmentName)} | Vào: {admission.AdmissionDate:dd/MM/yyyy} | Ra: {discharge?.DischargeDate.ToString("dd/MM/yyyy") ?? "---"} | Số ngày: {daysOfStay}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintBillingStatement6556ByPatientTypeAsync(Guid admissionId, int patientType)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var typeName = patientType switch { 1 => "BHYT", 2 => "Viện phí", 3 => "Bên thứ 3", _ => "Khác" };

        var serviceDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted && d.PatientType == patientType)
            .ToListAsync();

        var rxDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2 && d.PatientType == patientType)
            .ToListAsync();

        var headers = new[] { "Nội dung", "ĐVT", "SL", "Đơn giá", "Thành tiền" };
        var rows = new List<string[]>();
        foreach (var d in serviceDetails)
        {
            rows.Add(new[] { d.Service?.ServiceName ?? "", d.Service?.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0") });
        }
        foreach (var d in rxDetails)
        {
            rows.Add(new[] { d.Medicine?.MedicineName ?? "", d.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0") });
        }

        var html = BuildTableReport(
            $"BẢNG KÊ CHI PHÍ - {typeName}",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            null, headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintBillingStatement6556ByDepartmentAsync(Guid admissionId, Guid departmentId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = await _context.Departments.FindAsync(departmentId);

        var serviceDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted
                && d.ServiceRequest.DepartmentId == departmentId)
            .ToListAsync();

        var rxDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id
                && d.Prescription.PrescriptionType == 2
                && d.Prescription.DepartmentId == departmentId)
            .ToListAsync();

        var headers = new[] { "Nội dung", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Nguồn" };
        var rows = new List<string[]>();
        foreach (var d in serviceDetails)
        {
            rows.Add(new[] { d.Service?.ServiceName ?? "", d.Service?.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0"), d.PatientType == 1 ? "BHYT" : "VP" });
        }
        foreach (var d in rxDetails)
        {
            rows.Add(new[] { d.Medicine?.MedicineName ?? "", d.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0"), d.PatientType == 1 ? "BHYT" : "VP" });
        }

        var html = BuildTableReport(
            $"BẢNG KÊ CHI PHÍ THEO KHOA",
            $"BN: {Esc(patient.FullName)} - Khoa: {Esc(dept?.DepartmentName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)}",
            null, headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion
}
