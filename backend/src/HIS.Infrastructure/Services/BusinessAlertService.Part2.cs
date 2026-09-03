using HIS.Application.DTOs.BusinessAlert;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class BusinessAlertService
{
    // Rule 11: Fall risk (age >65)
    private async Task<List<BusinessAlertDto>> CheckFallRiskAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
            if (patient == null || !patient.DateOfBirth.HasValue) return alerts;

            var age = (DateTime.UtcNow - patient.DateOfBirth.Value).Days / 365;
            var fallRiskAge = AlertInt("Inpatient:FallRiskAge", 65);
            var fallRiskCriticalAge = AlertInt("Inpatient:FallRiskCriticalAge", 80);
            if (age >= fallRiskAge)
            {
                alerts.Add(CreateAlert("IPD-11", "Inpatient", age >= fallRiskCriticalAge ? 1 : 2, "Inpatient",
                    "Nguy co nga",
                    $"BN {age} tuoi - nguy co nga cao. Can danh gia va ap dung bien phap phong nga.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-11 error"); }
        return alerts;
    }

    // Rule 12: Pressure ulcer risk (Braden scale proxy - immobile >3 days)
    private async Task<List<BusinessAlertDto>> CheckPressureUlcerRiskAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.Id == admissionId.Value);
            if (admission == null) return alerts;

            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
            var age = patient?.DateOfBirth.HasValue == true ? (DateTime.UtcNow - patient.DateOfBirth.Value).Days / 365 : 0;
            var daysAdmitted = (DateTime.UtcNow - admission.AdmissionDate).Days;

            // High risk if elderly + long stay
            if (age >= AlertInt("Inpatient:PressureUlcerAge", 70) && daysAdmitted >= AlertInt("Inpatient:PressureUlcerDays", 3))
            {
                alerts.Add(CreateAlert("IPD-12", "Inpatient", 2, "Inpatient",
                    "Nguy co loet ti de",
                    $"BN {age} tuoi, nam vien {daysAdmitted} ngay. Danh gia Braden Scale va thay doi tu the thuong xuyen.",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-12 error"); }
        return alerts;
    }

    // Rule 13: Malnutrition risk
    private async Task<List<BusinessAlertDto>> CheckMalnutritionRiskAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var screening = await _context.NutritionScreenings
                .Where(ns => ns.PatientId == patientId)
                .OrderByDescending(ns => ns.CreatedAt)
                .FirstOrDefaultAsync();

            if (screening != null && (screening.RiskLevel == "Medium" || screening.RiskLevel == "High"))
            {
                var isHigh = screening.RiskLevel == "High";
                alerts.Add(CreateAlert("IPD-13", "Inpatient", isHigh ? 1 : 2, "Inpatient",
                    "Nguy co suy dinh duong",
                    $"Ket qua sang loc dinh duong: nguy co {(isHigh ? "CAO" : "TRUNG BINH")}. Can hoi chan dinh duong.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-13 error"); }
        return alerts;
    }

    // Rule 14: HAI risk (hospital-acquired infection)
    private async Task<List<BusinessAlertDto>> CheckHaiRiskAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.Id == admissionId.Value);
            if (admission == null) return alerts;

            var daysAdmitted = (DateTime.UtcNow - admission.AdmissionDate).Days;
            var haiRiskDays = AlertInt("Inpatient:HaiRiskDays", 7);
            var haiRiskCriticalDays = AlertInt("Inpatient:HaiRiskCriticalDays", 14);
            if (daysAdmitted >= haiRiskDays)
            {
                alerts.Add(CreateAlert("IPD-14", "Inpatient", daysAdmitted >= haiRiskCriticalDays ? 2 : 3, "Inpatient",
                    "Nguy co nhiem khuan benh vien",
                    $"BN nam vien {daysAdmitted} ngay - nguy co NKBV tang. Kiem tra cac thiet bi xam lan (catheter, ong NKQ, CVP).",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-14 error"); }
        return alerts;
    }

    // Rule 15: Extended stay >21 days
    private async Task<List<BusinessAlertDto>> CheckExtendedStayAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.Id == admissionId.Value);
            if (admission == null) return alerts;

            var daysAdmitted = (DateTime.UtcNow - admission.AdmissionDate).Days;
            if (daysAdmitted > AlertInt("Inpatient:ExtendedStayDays", 21))
            {
                alerts.Add(CreateAlert("IPD-15", "Inpatient", 2, "Inpatient",
                    "Thoi gian nam vien dai",
                    $"BN da nam vien {daysAdmitted} ngay (>21 ngay). Can danh gia lai ke hoach dieu tri va xem xet xuat vien.",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-15 error"); }
        return alerts;
    }

    // Rule 16: Pending orders overdue >4 hours
    private async Task<List<BusinessAlertDto>> CheckPendingOrdersAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var pendingOverdueHours = AlertInt("Inpatient:PendingOrderOverdueHours", 4);
            var pendingCriticalHours = AlertInt("Inpatient:PendingOrderCriticalHours", 8);
            var pendingOrders = await _context.ServiceRequests
                .Include(sr => sr.MedicalRecord)
                .Where(sr => sr.MedicalRecord != null && sr.MedicalRecord.PatientId == patientId
                    && sr.Status == 0 // Pending
                    && sr.CreatedAt < DateTime.UtcNow.AddHours(-pendingOverdueHours))
                .Take(5)
                .ToListAsync();

            foreach (var order in pendingOrders)
            {
                var hoursOverdue = (DateTime.UtcNow - order.CreatedAt).TotalHours;
                alerts.Add(CreateAlert("IPD-16", "Inpatient", hoursOverdue > pendingCriticalHours ? 1 : 2, "Inpatient",
                    "Y lenh chua thuc hien",
                    $"Y lenh tao luc {order.CreatedAt:HH:mm dd/MM} chua duoc thuc hien ({hoursOverdue:F0} gio). Can xu ly ngay.",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-16 error"); }
        return alerts;
    }

    // Rule 17: Undispensed medication >2 hours
    private async Task<List<BusinessAlertDto>> CheckUndispensedMedicationAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var undispensedHours = AlertInt("Inpatient:UndispensedMedHours", 2);
            var undispensedCriticalHours = AlertInt("Inpatient:UndispensedMedCriticalHours", 4);
            var pendingRx = await _context.Prescriptions
                .Include(p => p.MedicalRecord)
                .Where(p => p.MedicalRecord != null && p.MedicalRecord.PatientId == patientId
                    && !p.IsDispensed
                    && p.Status < 2 // Not completed/cancelled
                    && p.CreatedAt < DateTime.UtcNow.AddHours(-undispensedHours))
                .Take(5)
                .ToListAsync();

            foreach (var rx in pendingRx)
            {
                var hoursOverdue = (DateTime.UtcNow - rx.CreatedAt).TotalHours;
                alerts.Add(CreateAlert("IPD-17", "Inpatient", hoursOverdue > undispensedCriticalHours ? 1 : 2, "Pharmacy",
                    "Thuoc chua phat",
                    $"Don thuoc tao luc {rx.CreatedAt:HH:mm dd/MM} chua duoc cap phat ({hoursOverdue:F0} gio).",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-17 error"); }
        return alerts;
    }

    // Rule 18: Critical patient without consultation (ICU >48h no consultation)
    private async Task<List<BusinessAlertDto>> CheckCriticalWithoutConsultationAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.Id == admissionId.Value);
            if (admission == null) return alerts;

            // Ở đây "số ngày" vừa là ngưỡng nằm-viện vừa là cửa sổ tra hội chẩn — CÙNG một khái niệm
            // "48h nguy kịch" nên cố ý dùng chung 1 config (override dịch cả hai cùng nhau), khác lookback-window độc lập.
            var criticalNoConsultDays = AlertInt("Inpatient:CriticalNoConsultDays", 2);
            var daysAdmitted = (DateTime.UtcNow - admission.AdmissionDate).Days;
            if (daysAdmitted < criticalNoConsultDays) return alerts;

            // Check if patient has had a consultation (ConsultationRecord -> Examination -> MedicalRecordId)
            var hasConsultation = await _context.ConsultationRecords
                .Include(cr => cr.Examination)
                .AnyAsync(cr => cr.Examination != null && cr.Examination.MedicalRecordId == admission.MedicalRecordId
                    && cr.CreatedAt >= DateTime.UtcNow.AddDays(-criticalNoConsultDays));

            if (!hasConsultation && daysAdmitted >= criticalNoConsultDays)
            {
                alerts.Add(CreateAlert("IPD-18", "Inpatient", 2, "Inpatient",
                    "BN nang chua hoi chan",
                    $"BN nam vien {daysAdmitted} ngay chua co hoi chan trong 48h qua. Can xem xet hoi chan.",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-18 error"); }
        return alerts;
    }

    // Rule 19: IV infusion ending <30 min
    private async Task<List<BusinessAlertDto>> CheckIvInfusionEndingAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // Check treatment sheets for active infusions (TreatmentSheet -> Examination -> MedicalRecord -> PatientId)
            var activeInfusions = await _context.TreatmentSheets
                .Include(ts => ts.Examination).ThenInclude(e => e.MedicalRecord)
                .Where(ts => ts.Examination != null && ts.Examination.MedicalRecord != null
                    && ts.Examination.MedicalRecord.PatientId == patientId
                    && ts.CreatedAt >= DateTime.UtcNow.AddDays(-1))
                .OrderByDescending(ts => ts.CreatedAt)
                .Take(5)
                .ToListAsync();

            // Check DoctorOrders for IV-related keywords
            foreach (var sheet in activeInfusions)
            {
                var content = (sheet.DoctorOrders ?? "").ToLower();
                if (content.Contains("truyen") || content.Contains("dich truyen") || content.Contains("iv"))
                {
                    var sheetAge = (DateTime.UtcNow - sheet.CreatedAt).TotalHours;
                    if (sheetAge >= 3.5 && sheetAge <= 6)
                    {
                        alerts.Add(CreateAlert("IPD-19", "Inpatient", 3, "Inpatient",
                            "Truyen dich sap het",
                            $"Y lenh truyen dich luc {sheet.CreatedAt:HH:mm} co the sap ket thuc. Kiem tra va thay chai dich.",
                            patientId, null, admissionId));
                    }
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-19 error"); }
        return alerts;
    }

    // Rule 20: Positive blood culture
    private async Task<List<BusinessAlertDto>> CheckPositiveBloodCultureAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // #14e: model 1 — SRD dịch vụ cấy máu có KQ dương tính 7 ngày gần nhất (model 2 LabResults đã gỡ)
            var positiveCultures = await _context.ServiceRequestDetails
                .Where(d => !d.IsDeleted && d.Status != 3
                    && d.ServiceRequest.MedicalRecord.PatientId == patientId
                    && d.Result != null
                    && (d.Service.ServiceName.Contains("cấy máu") || d.Service.ServiceName.Contains("cay mau")
                        || d.Service.ServiceName.Contains("blood culture") || d.Service.ServiceName.Contains("hemoculture"))
                    && (d.Result.Contains("dương") || d.Result.Contains("duong tinh") || d.Result.ToLower().Contains("positive"))
                    && d.CreatedAt >= DateTime.UtcNow.AddDays(-7))
                .OrderByDescending(d => d.CreatedAt)
                .Take(3)
                .Select(d => new { d.Service.ServiceName, d.Result })
                .ToListAsync();
            foreach (var c in positiveCultures)
            {
                alerts.Add(CreateAlert("IPD-20", "Inpatient", 1, "Lab",
                    "Cay mau duong tinh",
                    $"Ket qua cay mau DUONG TINH ({c.ServiceName}). {c.Result}. XU TRI NGAY.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-20 error"); }
        return alerts;
    }

    // Rule 21: NEWS2 score >= 5
    private async Task<List<BusinessAlertDto>> CheckNews2ScoreAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // Check the most recent examination for this patient (Examination -> MedicalRecord -> PatientId)
            var exam = await _context.Examinations
                .Include(e => e.MedicalRecord)
                .Where(e => e.MedicalRecord != null && e.MedicalRecord.PatientId == patientId)
                .OrderByDescending(e => e.CreatedAt)
                .FirstOrDefaultAsync();

            if (exam == null) return alerts;

            // Calculate NEWS2
            int total = 0;
            if (exam.Pulse.HasValue)
            {
                int hr = exam.Pulse.Value;
                total += hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3;
            }
            if (exam.BloodPressureSystolic.HasValue)
            {
                int sbp = exam.BloodPressureSystolic.Value;
                total += sbp <= 90 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : sbp <= 219 ? 0 : 3;
            }
            if (exam.Temperature.HasValue)
            {
                decimal temp = exam.Temperature.Value;
                total += temp <= 35.0m ? 3 : temp <= 36.0m ? 1 : temp <= 38.0m ? 0 : temp <= 39.0m ? 1 : 2;
            }
            if (exam.SpO2.HasValue)
            {
                decimal spo2 = exam.SpO2.Value;
                total += spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0;
            }

            var news2Alert = AlertInt("Inpatient:News2AlertScore", 5);
            var news2Critical = AlertInt("Inpatient:News2CriticalScore", 7);
            if (total >= news2Alert)
            {
                var riskLevel = total >= news2Critical ? "NGUY KICH" : "CAO";
                alerts.Add(CreateAlert("IPD-21", "Inpatient", total >= news2Critical ? 1 : 2, "Inpatient",
                    "Diem canh bao som NEWS2",
                    $"NEWS2 = {total} ({riskLevel}). " + (total >= news2Critical ? "GOI DOI CAP CUU NGAY. Theo doi lien tuc." : "BAO BAC SI NGAY. Theo doi moi 30 phut."),
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-21 error"); }
        return alerts;
    }

    // Rule 22: Discharge ready
    private async Task<List<BusinessAlertDto>> CheckDischargeReadyAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            // Check if discharge has been created but patient still in hospital
            var discharge = await _context.Discharges
                .Where(d => d.AdmissionId == admissionId.Value)
                .FirstOrDefaultAsync();

            if (discharge != null)
            {
                var daysPending = (DateTime.UtcNow - discharge.CreatedAt).Days;
                if (daysPending >= 1)
                {
                    alerts.Add(CreateAlert("IPD-22", "Inpatient", 3, "Inpatient",
                        "BN can xuat vien",
                        $"Lenh xuat vien da tao {daysPending} ngay truoc nhung chua hoan tat. Kiem tra thu tuc xuat vien.",
                        patientId, null, admissionId));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-22 error"); }
        return alerts;
    }

    // Rule 23: Bed capacity >85%
    private async Task<List<BusinessAlertDto>> CheckBedCapacityAsync()
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var departments = await _context.Departments
                .Where(d => d.IsActive)
                .ToListAsync();

            var bedCapacityWarnPct = AlertInt("Inpatient:BedCapacityWarnPct", 85);
            var bedCapacityCriticalPct = AlertInt("Inpatient:BedCapacityCriticalPct", 95);
            // #195: 1 query gom giường theo khoa thay vì 2 count/khoa.
            var bedDeptIds = departments.Select(d => d.Id).ToList();
            var bedCountsByDept = (await _context.Beds
                    .Where(b => b.Room != null && bedDeptIds.Contains(b.Room.DepartmentId) && b.IsActive)
                    .GroupBy(b => b.Room!.DepartmentId)
                    .Select(g => new
                    {
                        DeptId = g.Key,
                        Total = g.Count(),
                        Occupied = g.Count(b => b.Status == 1) // Status 1 = Occupied
                    })
                    .ToListAsync())
                .ToDictionary(x => x.DeptId, x => (x.Total, x.Occupied));

            foreach (var dept in departments)
            {
                if (!bedCountsByDept.TryGetValue(dept.Id, out var beds)) continue;

                var totalBeds = beds.Total;
                if (totalBeds == 0) continue;

                var occupiedBeds = beds.Occupied;

                var occupancyRate = (double)occupiedBeds / totalBeds * 100;
                if (occupancyRate > bedCapacityWarnPct)
                {
                    alerts.Add(CreateAlert("IPD-23", "Inpatient", occupancyRate > bedCapacityCriticalPct ? 1 : 2, "Inpatient",
                        "Giuong sap day",
                        $"Khoa {dept.DepartmentName}: {occupiedBeds}/{totalBeds} giuong ({occupancyRate:F0}%). " +
                        (occupancyRate > bedCapacityCriticalPct ? "GAN HET GIUONG - can dieu phoi." : "Can chuan bi ke hoach."),
                        null, null, null));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-23 error"); }
        return alerts;
    }

    // Rule 24: Insurance expiry during admission
    private async Task<List<BusinessAlertDto>> CheckInsuranceExpiryAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var insurance = await _context.InsuranceCards
                .Where(ic => ic.PatientId == patientId)
                .OrderByDescending(ic => ic.CreatedAt)
                .FirstOrDefaultAsync();

            if (insurance != null && insurance.EndDate.HasValue)
            {
                var daysUntilExpiry = (insurance.EndDate.Value - DateTime.UtcNow).Days;
                if (daysUntilExpiry <= AlertInt("Inpatient:InsuranceExpiryWarnDays", 7) && daysUntilExpiry >= 0)
                {
                    alerts.Add(CreateAlert("IPD-24", "Inpatient", 2, "Insurance",
                        "Bao hiem sap het han",
                        $"The BHYT het han sau {daysUntilExpiry} ngay ({insurance.EndDate.Value:dd/MM/yyyy}). Can thong bao BN gia han.",
                        patientId, null, null));
                }
                else if (daysUntilExpiry < 0)
                {
                    alerts.Add(CreateAlert("IPD-24", "Inpatient", 1, "Insurance",
                        "Bao hiem da het han",
                        $"The BHYT da het han ngay {insurance.EndDate.Value:dd/MM/yyyy}. BN can gia han hoac chuyen doi tuong thanh toan.",
                        patientId, null, null));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-24 error"); }
        return alerts;
    }

    // Rule 25: Pregnant patient radiation
    private async Task<List<BusinessAlertDto>> CheckPregnantRadiationAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
            if (patient == null || patient.Gender != 2 || !patient.DateOfBirth.HasValue) return alerts; // Female only

            var age = (DateTime.UtcNow - patient.DateOfBirth.Value).Days / 365;
            if (age >= 15 && age <= 49)
            {
                alerts.Add(CreateAlert("RAD-25", "Radiology", 1, "Radiology",
                    "Phu nu trong do tuoi mang thai",
                    $"BN nu {age} tuoi (15-49). Can xac nhan KHONG mang thai truoc khi chup X-quang/CT. Hoi ky kinh cuoi.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule RAD-25 error"); }
        return alerts;
    }

    // Rule 26: Contrast allergy
    private async Task<List<BusinessAlertDto>> CheckContrastAllergyAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var contrastAllergy = await _context.Allergies
                .Where(a => a.PatientId == patientId
                    && (a.AllergenName != null &&
                        (a.AllergenName.Contains("can quang") || a.AllergenName.Contains("contrast")
                         || a.AllergenName.Contains("iod") || a.AllergenName.Contains("gadolinium"))))
                .FirstOrDefaultAsync();

            if (contrastAllergy != null)
            {
                alerts.Add(CreateAlert("RAD-26", "Radiology", 1, "Radiology",
                    "Di ung thuoc can quang",
                    $"BN co tien su di ung thuoc can quang: {contrastAllergy.AllergenName}. Phan ung: {contrastAllergy.Reaction ?? "N/A"}. KHONG SU DUNG thuoc can quang hoac can tien me phong ngua.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule RAD-26 error"); }
        return alerts;
    }

    // Rule 27: Cumulative radiation dose
    private async Task<List<BusinessAlertDto>> CheckCumulativeRadiationAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // Count radiology exams in the last year (through RadiologyRequest.PatientId)
            var examCount = await _context.RadiologyExams
                .Include(re => re.RadiologyRequest)
                .Where(re => re.RadiologyRequest != null && re.RadiologyRequest.PatientId == patientId
                    && re.CreatedAt >= DateTime.UtcNow.AddYears(-1))
                .CountAsync();

            if (examCount >= 10) // Threshold: >10 radiology exams per year
            {
                alerts.Add(CreateAlert("RAD-27", "Radiology", examCount >= 20 ? 1 : 2, "Radiology",
                    "Lieu buc xa tich luy",
                    $"BN da co {examCount} lan chup CDHA trong 12 thang qua. Can danh gia lieu buc xa tich luy va can nhac phuong phap thay the (sieu am, MRI).",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule RAD-27 error"); }
        return alerts;
    }

    // Rule 28: Critical radiology finding
    private async Task<List<BusinessAlertDto>> CheckCriticalRadiologyFindingAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // RadiologyReport -> RadiologyExam -> RadiologyRequest -> PatientId
            // Check urgent requests (Priority >= 2) with completed reports
            var criticalReports = await _context.RadiologyReports
                .Include(rr => rr.RadiologyExam).ThenInclude(re => re.RadiologyRequest)
                .Where(rr => rr.RadiologyExam != null && rr.RadiologyExam.RadiologyRequest != null
                    && rr.RadiologyExam.RadiologyRequest.PatientId == patientId
                    && rr.RadiologyExam.RadiologyRequest.Priority >= 2 // Urgent or Emergency
                    && rr.CreatedAt >= DateTime.UtcNow.AddDays(-3))
                .Take(3)
                .ToListAsync();

            foreach (var report in criticalReports)
            {
                alerts.Add(CreateAlert("RAD-28", "Radiology", 1, "Radiology",
                    "Ket qua CDHA nguy hiem",
                    $"Ket qua CDHA khan: {report.Impression ?? "Phat hien bat thuong nghiem trong"}. Can xu tri ngay.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule RAD-28 error"); }
        return alerts;
    }

}
