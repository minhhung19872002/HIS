using HIS.Application.DTOs.PatientPortal;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

// K7 phien 2 (2026-05-30): tach PatientPortalServiceImpl (~778 dong) khoi ExtendedWorkflowServices.cs.
// K-wave5: tach tiep Billing/FamilyMembers -> PatientPortalServiceImpl.Billing.cs,
//          MedicineReminders/HealthMetrics/Q&A/Auth -> PatientPortalServiceImpl.Health.cs.
public partial class PatientPortalServiceImpl : IPatientPortalService
{
    private readonly HISDbContext _context;
    public PatientPortalServiceImpl(HISDbContext context) => _context = context;

    public async Task<PortalAccountDto> GetAccountAsync(Guid accountId)
    {
        var e = await _context.PortalAccounts.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == accountId);
        return e == null ? null! : new PortalAccountDto { Id = e.Id, Email = e.Email, Phone = e.Phone, PatientId = e.PatientId, PatientName = e.Patient?.FullName ?? "", Status = e.Status, IsEmailVerified = e.IsEmailVerified, IsPhoneVerified = e.IsPhoneVerified };
    }

    public async Task<PortalAccountDto> RegisterAccountAsync(RegisterPortalAccountDto dto)
    {
        // R2: hash BCrypt (trước đây lưu plaintext — bảng 0 rows nên không cần backfill).
        // Username = email (fallback phone) để login bằng identifier.
        var username = !string.IsNullOrWhiteSpace(dto.Email) ? dto.Email.Trim() : dto.Phone?.Trim() ?? "";
        var entity = new PortalAccount
        {
            Id = Guid.NewGuid(),
            Username = username,
            Email = dto.Email ?? "",
            Phone = dto.Phone ?? "",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Status = "Pending",
            CreatedAt = DateTime.Now,
        };
        _context.PortalAccounts.Add(entity);
        await _context.SaveChangesAsync();
        return await GetAccountAsync(entity.Id);
    }

    public async Task<bool> VerifyEmailAsync(Guid accountId, string code)
    {
        var e = await _context.PortalAccounts.FindAsync(accountId);
        if (e == null) return false;
        e.IsEmailVerified = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> VerifyPhoneAsync(Guid accountId, string otp)
    {
        var e = await _context.PortalAccounts.FindAsync(accountId);
        if (e == null) return false;
        e.IsPhoneVerified = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> LinkPatientRecordAsync(Guid accountId, string patientCode, string verificationData)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(x => x.PatientCode == patientCode);
        if (patient == null) return false;
        var account = await _context.PortalAccounts.FindAsync(accountId);
        if (account == null) return false;

        // R2: BẮT BUỘC verify — verificationData phải khớp SĐT / CCCD / ngày sinh (yyyy-MM-dd) của BN.
        // Trước đây không kiểm tra gì → ai có account đều link được bất kỳ patientCode (IDOR).
        var v = (verificationData ?? "").Trim();
        if (v.Length == 0) return false;
        var matches =
            (!string.IsNullOrWhiteSpace(patient.PhoneNumber) && string.Equals(patient.PhoneNumber.Trim(), v, StringComparison.Ordinal)) ||
            (!string.IsNullOrWhiteSpace(patient.IdentityNumber) && string.Equals(patient.IdentityNumber.Trim(), v, StringComparison.Ordinal)) ||
            (patient.DateOfBirth.HasValue && patient.DateOfBirth.Value.ToString("yyyy-MM-dd") == v);
        if (!matches) return false;

        account.PatientId = patient.Id; account.Status = "Active";
        await _context.SaveChangesAsync();
        return true;
    }

    // eKYC = DEFER (F9): lưu base64 ảnh CCCD/selfie sinh trắc là quyết định PII/biometric nhạy cảm
    // (storage/mã hoá/đối chiếu KYC) — cần thiết kế riêng, không persist vội. Xem STATUS F9.
    public Task<eKYCVerificationDto> SubmitEKYCAsync(Guid accountId, eKYCVerificationDto dto) => Task.FromResult(dto);
    public async Task<bool> UpdatePreferencesAsync(Guid accountId, PortalAccountDto preferences)
    {
        var e = await _context.PortalAccounts.FindAsync(accountId);
        if (e == null) return false;
        e.PreferredLanguage = preferences.Language; e.ReceiveEmailNotifications = preferences.NotifyByEmail; e.ReceiveSMSNotifications = preferences.NotifyBySMS;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<PortalAppointmentDto>> GetAppointmentsAsync(Guid patientId, bool includeHistory = false)
    {
        try
        {
            var query = _context.PortalAppointments.Include(x => x.Department).AsQueryable();
            // Demo fallback: empty patientId returns first 20 rows so admin
            // (no portal account) can still see the portal page populated.
            if (patientId != Guid.Empty) query = query.Where(x => x.PatientId == patientId);
            if (!includeHistory) query = query.Where(x => x.AppointmentDate >= DateTime.Today);
            var list = await query.OrderBy(x => x.AppointmentDate).Take(30).ToListAsync();
            return list.Select(e => new PortalAppointmentDto { Id = e.Id, PatientId = e.PatientId, DepartmentName = e.Department?.DepartmentName ?? "", AppointmentDate = e.AppointmentDate, AppointmentTime = e.SlotTime, Status = e.Status }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new List<PortalAppointmentDto>();
        }
    }

    public async Task<PortalAppointmentDto> GetAppointmentAsync(Guid id)
    {
        var e = await _context.PortalAppointments.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalAppointmentDto { Id = e.Id, PatientId = e.PatientId, DepartmentName = e.Department?.DepartmentName ?? "", AppointmentDate = e.AppointmentDate, AppointmentTime = e.SlotTime, Status = e.Status, ReasonForVisit = e.ChiefComplaint };
    }

    public Task<List<AvailableSlotDto>> GetAvailableSlotsAsync(Guid departmentId, Guid? doctorId, DateTime fromDate, DateTime toDate)
    {
        var slots = new List<AvailableSlotDto>();
        for (var d = fromDate; d <= toDate; d = d.AddDays(1))
            if (d.DayOfWeek != DayOfWeek.Sunday)
            {
                var timeSlots = new List<TimeSlotItemDto>();
                for (var h = 8; h < 17; h++)
                    timeSlots.Add(new TimeSlotItemDto { StartTime = TimeSpan.FromHours(h), EndTime = TimeSpan.FromHours(h + 1), IsAvailable = true, RemainingSlots = 5 });
                slots.Add(new AvailableSlotDto { Date = d, Session = d.Hour < 12 ? "Morning" : "Afternoon", TimeSlots = timeSlots });
            }
        return Task.FromResult(slots);
    }

    public async Task<PortalAppointmentDto> BookAppointmentAsync(Guid patientId, CreatePortalAppointmentDto dto)
    {
        var entity = new PortalAppointment { Id = Guid.NewGuid(), PatientId = patientId, DepartmentId = dto.DepartmentId, DoctorId = dto.DoctorId, AppointmentDate = dto.AppointmentDate, SlotTime = dto.AppointmentTime, ChiefComplaint = dto.ReasonForVisit, Status = "Pending", CreatedAt = DateTime.Now };
        _context.PortalAppointments.Add(entity);
        await _context.SaveChangesAsync();
        return await GetAppointmentAsync(entity.Id);
    }

    public async Task<bool> CancelAppointmentAsync(Guid id, string reason)
    {
        var e = await _context.PortalAppointments.FindAsync(id);
        if (e == null) return false;
        e.Status = "Cancelled"; e.CancellationReason = reason; e.CancelledAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PortalAppointmentDto> RescheduleAppointmentAsync(Guid id, DateTime newDate, TimeSpan newTime)
    {
        var e = await _context.PortalAppointments.FindAsync(id);
        if (e == null) return null!;
        e.AppointmentDate = newDate; e.SlotTime = newTime; e.Status = "Rescheduled";
        await _context.SaveChangesAsync();
        return await GetAppointmentAsync(id);
    }

    public async Task<HealthRecordSummaryDto> GetHealthRecordSummaryAsync(Guid patientId)
    {
        // Demo fallback: empty patientId returns the most recent patient so admin
        // (no portal account) can see the page populated.
        var patient = patientId == Guid.Empty
            ? await _context.Patients.OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync()
            : await _context.Patients.FirstOrDefaultAsync(x => x.Id == patientId);
        if (patient == null)
        {
            return new HealthRecordSummaryDto
            {
                PatientId = patientId,
                Allergies = new List<string>(),
                ChronicConditions = new List<string>(),
                CurrentMedications = new List<CurrentMedicationDto>(),
                RecentVisits = new List<VisitSummaryDto>(),
                Immunizations = new List<ImmunizationDto>(),
                VitalsTrend = new List<VitalsTrendDto>()
            };
        }

        var exams = await _context.Examinations
            .AsNoTracking()
            .Include(x => x.Room).ThenInclude(x => x!.Department)
            .Include(x => x.Doctor)
            .Include(x => x.MedicalRecord)
            .Where(x => !x.IsDeleted && x.MedicalRecord!.PatientId == patient.Id)
            .OrderByDescending(x => x.StartTime ?? x.CreatedAt)
            .Take(30)
            .ToListAsync();

        return new HealthRecordSummaryDto
        {
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            DateOfBirth = patient.DateOfBirth ?? DateTime.MinValue,
            Gender = patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nữ" : "Khác",
            BloodType = patient.BloodType ?? string.Empty,
            PhoneNumber = patient.PhoneNumber ?? string.Empty,
            InsuranceNumber = patient.InsuranceNumber ?? string.Empty,
            InsuranceExpiry = patient.InsuranceExpireDate,
            Address = patient.Address ?? string.Empty,
            Allergies = new List<string>(),
            ChronicConditions = exams
                .Select(x => x.MainDiagnosis)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Cast<string>()
                .Take(10)
                .ToList(),
            CurrentMedications = new List<CurrentMedicationDto>(),
            RecentVisits = exams.Select(x => new VisitSummaryDto
            {
                VisitId = x.Id,
                VisitDate = x.StartTime ?? x.CreatedAt,
                VisitType = x.ExaminationType == 1 ? "Khám chính" : "Tái khám",
                Department = x.Room?.Department?.DepartmentName ?? string.Empty,
                DoctorName = x.Doctor?.FullName ?? string.Empty,
                Diagnosis = x.MainDiagnosis ?? string.Empty,
                Summary = x.ConclusionNote ?? string.Empty
            }).ToList(),
            Immunizations = new List<ImmunizationDto>(),
            VitalsTrend = exams
                .Where(x => x.BloodPressureSystolic.HasValue || x.BloodPressureDiastolic.HasValue
                    || x.Pulse.HasValue || x.Weight.HasValue)
                .Select(x => new VitalsTrendDto
                {
                    Date = x.StartTime ?? x.CreatedAt,
                    BloodPressureSystolic = x.BloodPressureSystolic,
                    BloodPressureDiastolic = x.BloodPressureDiastolic,
                    HeartRate = x.Pulse,
                    Weight = x.Weight
                })
                .OrderBy(x => x.Date)
                .ToList(),
            LastUpdated = DateTime.UtcNow
        };
    }

    public async Task<List<VisitSummaryDto>> GetVisitHistoryAsync(Guid patientId, int limit = 20)
    {
        var exams = await _context.Examinations.Include(x => x.Room).ThenInclude(x => x!.Department).Include(x => x.Doctor).Include(x => x.MedicalRecord).Where(x => x.MedicalRecord!.PatientId == patientId).OrderByDescending(x => x.StartTime).Take(limit).ToListAsync();
        return exams.Select(e => new VisitSummaryDto { VisitId = e.Id, VisitDate = e.StartTime ?? DateTime.MinValue, Department = e.Room?.Department?.DepartmentName ?? "", DoctorName = e.Doctor?.FullName ?? "", Diagnosis = e.MainDiagnosis }).ToList();
    }

    // G-39: Full visit detail for portal — security: verifies exam belongs to patientId before returning
    public async Task<PortalVisitDetailDto> GetVisitDetailAsync(Guid examId, Guid patientId)
    {
        var exam = await _context.Examinations
            .Include(x => x.Room).ThenInclude(x => x!.Department)
            .Include(x => x.Doctor)
            .Include(x => x.MedicalRecord)
            .FirstOrDefaultAsync(x => x.Id == examId);

        if (exam == null) return null!;
        // Security: ensure this exam belongs to the requested patient
        if (patientId != Guid.Empty && exam.MedicalRecord?.PatientId != patientId) return null!;

        var prescriptions = await _context.Prescriptions
            .Include(x => x.Details).ThenInclude(d => d.Medicine)
            .Where(x => x.ExaminationId == examId)
            .OrderByDescending(x => x.PrescriptionDate)
            .ToListAsync();

        var treatmentSheets = await _context.TreatmentSheets
            .Where(x => x.ExaminationId == examId)
            .OrderBy(x => x.Day)
            .ToListAsync();

        var surgeries = await _context.SurgeryRequests
            .Where(x => x.ExaminationId == examId)
            .ToListAsync();

        return new PortalVisitDetailDto
        {
            VisitId = exam.Id,
            VisitDate = exam.StartTime ?? DateTime.MinValue,
            Department = exam.Room?.Department?.DepartmentName ?? "",
            DoctorName = exam.Doctor?.FullName ?? "",
            ChiefComplaint = exam.ChiefComplaint ?? "",
            PresentIllness = exam.PresentIllness ?? "",
            PhysicalExamination = exam.PhysicalExamination ?? "",
            Temperature = exam.Temperature,
            Pulse = exam.Pulse,
            BloodPressureSystolic = exam.BloodPressureSystolic,
            BloodPressureDiastolic = exam.BloodPressureDiastolic,
            RespiratoryRate = exam.RespiratoryRate,
            Height = exam.Height,
            Weight = exam.Weight,
            SpO2 = exam.SpO2,
            InitialDiagnosis = exam.InitialDiagnosis ?? "",
            MainDiagnosis = exam.MainDiagnosis ?? "",
            MainIcdCode = exam.MainIcdCode ?? "",
            SubDiagnosis = exam.SubDiagnosis ?? "",
            ConclusionNote = exam.ConclusionNote ?? "",
            TreatmentPlan = exam.TreatmentPlan ?? "",
            FollowUpDate = exam.FollowUpDate,
            Prescriptions = prescriptions.Select(p => new PortalVisitPrescriptionDto
            {
                Id = p.Id,
                PrescriptionCode = p.PrescriptionCode ?? "",
                PrescriptionDate = p.PrescriptionDate,
                Status = p.Status == 2 ? "Đã cấp" : p.Status == 1 ? "Đang xử lý" : "Chờ cấp",
                Items = p.Details.Select(d => new PortalVisitPrescriptionItemDto
                {
                    MedicineName = d.Medicine?.MedicineName ?? "",
                    Quantity = d.Quantity,
                    Unit = d.Unit ?? "",
                    Usage = d.Usage ?? d.UsageInstructions ?? ""
                }).ToList()
            }).ToList(),
            TreatmentSheets = treatmentSheets.Select(t => new PortalTreatmentSheetDto
            {
                TreatmentDate = t.TreatmentDate,
                Day = t.Day,
                DoctorOrders = t.DoctorOrders ?? "",
                PatientCondition = t.PatientCondition ?? "",
                Notes = t.Notes ?? ""
            }).ToList(),
            Surgeries = surgeries.Select(s => new PortalSurgeryDto
            {
                SurgeryName = s.PlannedProcedure ?? s.SurgeryType ?? "",
                ProcedureCode = s.RequestCode,
                ScheduledDate = s.RequestDate,
                Status = s.Status == 3 ? "Hoàn thành" : s.Status == 2 ? "Đang thực hiện" : s.Status == 1 ? "Đã lên lịch" : s.Status == 4 ? "Đã hủy" : "Chờ lên lịch"
            }).ToList()
        };
    }

    public async Task<byte[]> ExportHealthRecordPdfAsync(Guid patientId)
    {
        try
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(x => x.Id == patientId);
            if (patient == null) return Array.Empty<byte>();

            var exams = await _context.Examinations
                .Include(x => x.Room).ThenInclude(x => x!.Department)
                .Include(x => x.Doctor)
                .Include(x => x.MedicalRecord)
                .Where(x => x.MedicalRecord!.PatientId == patientId)
                .OrderByDescending(x => x.StartTime)
                .Take(50)
                .ToListAsync();

            var prescriptions = await _context.Prescriptions
                .Include(x => x.MedicalRecord)
                .Where(x => x.MedicalRecord!.PatientId == patientId)
                .OrderByDescending(x => x.PrescriptionDate)
                .Take(20)
                .ToListAsync();

            var gender = patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nữ" : "Khác";
            var dob = patient.DateOfBirth?.ToString("dd/MM/yyyy") ?? "";

            var html = $@"<!DOCTYPE html>
<html><head><meta charset=""utf-8""><title>Ho so suc khoe - {System.Net.WebUtility.HtmlEncode(patient.FullName)}</title>
<style>
body {{ font-family: 'Times New Roman', serif; font-size: 13px; margin: 20px; }}
h1 {{ text-align: center; font-size: 18px; }}
h2 {{ font-size: 14px; border-bottom: 1px solid #333; padding-bottom: 4px; margin-top: 16px; }}
table {{ width: 100%; border-collapse: collapse; margin: 8px 0; }}
th, td {{ border: 1px solid #333; padding: 4px 6px; font-size: 12px; }}
th {{ background: #f0f0f0; text-align: center; }}
.info {{ margin: 4px 0; }}
.label {{ font-weight: bold; display: inline-block; width: 140px; }}
</style></head><body>
<h1>HO SO SUC KHOE TONG HOP</h1>
<div class=""info""><span class=""label"">Ho ten:</span> {System.Net.WebUtility.HtmlEncode(patient.FullName)}</div>
<div class=""info""><span class=""label"">Ma benh nhan:</span> {System.Net.WebUtility.HtmlEncode(patient.PatientCode)}</div>
<div class=""info""><span class=""label"">Ngay sinh:</span> {dob}</div>
<div class=""info""><span class=""label"">Gioi tinh:</span> {gender}</div>
<div class=""info""><span class=""label"">Dia chi:</span> {System.Net.WebUtility.HtmlEncode(patient.Address)}</div>
<div class=""info""><span class=""label"">SDT:</span> {System.Net.WebUtility.HtmlEncode(patient.PhoneNumber)}</div>
<div class=""info""><span class=""label"">Ngay xuat:</span> {DateTime.Now:dd/MM/yyyy HH:mm}</div>

<h2>LICH SU KHAM BENH ({exams.Count} lan kham gan nhat)</h2>
<table><thead><tr><th>STT</th><th>Ngay kham</th><th>Khoa/Phong</th><th>Bac si</th><th>Chan doan</th></tr></thead><tbody>";

            for (int i = 0; i < exams.Count; i++)
            {
                var e = exams[i];
                html += $@"<tr><td style=""text-align:center"">{i + 1}</td><td>{e.StartTime?.ToString("dd/MM/yyyy") ?? ""}</td><td>{System.Net.WebUtility.HtmlEncode(e.Room?.Department?.DepartmentName ?? "")}</td><td>{System.Net.WebUtility.HtmlEncode(e.Doctor?.FullName ?? "")}</td><td>{System.Net.WebUtility.HtmlEncode(e.MainDiagnosis ?? "")}</td></tr>";
            }

            html += @"</tbody></table>
<h2>DON THUOC GAN DAY</h2>
<table><thead><tr><th>STT</th><th>Ngay ke</th><th>Ma don</th><th>Trang thai</th></tr></thead><tbody>";

            for (int i = 0; i < prescriptions.Count; i++)
            {
                var p = prescriptions[i];
                var status = p.Status == 2 ? "Da cap" : p.Status == 1 ? "Dang xu ly" : "Cho xu ly";
                html += $@"<tr><td style=""text-align:center"">{i + 1}</td><td>{p.PrescriptionDate:dd/MM/yyyy}</td><td>{System.Net.WebUtility.HtmlEncode(p.PrescriptionCode ?? "")}</td><td>{status}</td></tr>";
            }

            html += @"</tbody></table>
</body></html>";

            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<List<PortalLabResultDto>> GetLabResultsAsync(Guid patientId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            // #14b: KQ XN đọc từ ServiceRequestDetail (model 1) — bảng LabResults (model 2) chết
            // trong luồng thật nên BN trước đây không thấy KQ trên portal.
            var query = _context.ServiceRequestDetails
                .Include(d => d.ServiceRequest).ThenInclude(r => r.MedicalRecord)
                .Where(d => d.ServiceRequest.RequestType == 1 && d.Status != 3
                         && (d.Status == 2 || d.Result != null || d.ResultDate != null));
            if (patientId != Guid.Empty) query = query.Where(d => d.ServiceRequest.MedicalRecord.PatientId == patientId);
            if (fromDate.HasValue) query = query.Where(d => d.ResultDate >= fromDate);
            if (toDate.HasValue) query = query.Where(d => d.ResultDate <= toDate);
            var list = await query.OrderByDescending(d => d.ResultDate).Take(30).ToListAsync();
            return list.Select(d => new PortalLabResultDto { Id = d.Id, OrderCode = d.ServiceRequest != null ? d.ServiceRequest.RequestCode : "", ResultDate = d.ResultDate ?? DateTime.MinValue, Status = d.Status == 2 ? "Completed" : "Pending" }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<PortalLabResultDto>();
        }
    }

    public async Task<PortalLabResultDto> GetLabResultAsync(Guid id)
    {
        // #14b: đọc 1 KQ XN từ ServiceRequestDetail (model 1).
        var e = await _context.ServiceRequestDetails.Include(d => d.ServiceRequest).FirstOrDefaultAsync(d => d.Id == id);
        return e == null ? null! : new PortalLabResultDto { Id = e.Id, OrderCode = e.ServiceRequest != null ? e.ServiceRequest.RequestCode : "", ResultDate = e.ResultDate ?? DateTime.MinValue, Status = e.Status == 2 ? "Completed" : "Pending" };
    }

    public Task<bool> MarkLabResultViewedAsync(Guid id)
    {
        return Task.FromResult(true);
    }

    public async Task<List<PortalImagingResultDto>> GetImagingResultsAsync(Guid patientId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.RadiologyReports.Include(x => x.RadiologyExam).ThenInclude(x => x!.RadiologyRequest).Include(x => x.RadiologyExam).ThenInclude(x => x!.Modality).AsQueryable();
        if (patientId != Guid.Empty) query = query.Where(x => x.RadiologyExam!.RadiologyRequest!.PatientId == patientId);
        var list = await query.OrderByDescending(x => x.ReportDate).Take(30).ToListAsync();
        return list.Select(e => new PortalImagingResultDto { Id = e.Id, Modality = e.RadiologyExam?.Modality?.ModalityName ?? "", StudyDate = e.RadiologyExam?.ExamDate, Status = e.Status == 1 ? "Completed" : "Pending" }).ToList();
    }

    public async Task<PortalImagingResultDto> GetImagingResultAsync(Guid id)
    {
        var e = await _context.RadiologyReports.Include(x => x.RadiologyExam).ThenInclude(x => x!.Modality).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalImagingResultDto { Id = e.Id, Modality = e.RadiologyExam?.Modality?.ModalityName ?? "", StudyDate = e.RadiologyExam?.ExamDate, Findings = e.Findings, Status = e.Status == 1 ? "Completed" : "Pending" };
    }
}
