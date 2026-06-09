using HIS.Application.DTOs.PatientPortal;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

// K7 phien 2 (2026-05-30): tach PatientPortalServiceImpl (~778 dong) khoi ExtendedWorkflowServices.cs.
#region Flow 18: Patient Portal Service - Real Implementation
public class PatientPortalServiceImpl : IPatientPortalService
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
        var entity = new PortalAccount { Id = Guid.NewGuid(), Email = dto.Email, Phone = dto.Phone, PasswordHash = dto.Password, Status = "Pending", CreatedAt = DateTime.Now };
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
        if (patient == null) return new HealthRecordSummaryDto { PatientId = patientId, Allergies = new List<string>() };
        return new HealthRecordSummaryDto { PatientId = patient.Id, PatientName = patient.FullName, DateOfBirth = patient.DateOfBirth ?? DateTime.MinValue, Gender = patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nữ" : "Khác", Allergies = new List<string>() };
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

    public async Task<List<PortalPrescriptionDto>> GetPrescriptionsAsync(Guid patientId, bool activeOnly = true)
    {
        var query = _context.Prescriptions
            .Include(x => x.MedicalRecord).ThenInclude(m => m!.Patient)
            .Include(x => x.Doctor)
            .Include(x => x.Department)
            .AsQueryable();
        if (patientId != Guid.Empty) query = query.Where(x => x.MedicalRecord!.PatientId == patientId);
        var list = await query.OrderByDescending(x => x.PrescriptionDate).Take(30).ToListAsync();
        return list.Select(e => new PortalPrescriptionDto {
            Id = e.Id,
            PrescriptionCode = e.PrescriptionCode ?? "",
            PrescriptionDate = e.PrescriptionDate,
            VisitId = e.MedicalRecordId,
            PatientId = e.MedicalRecord?.PatientId,
            PatientCode = e.MedicalRecord?.Patient?.PatientCode ?? "",
            PatientName = e.MedicalRecord?.Patient?.FullName ?? "",
            Diagnosis = e.Diagnosis ?? "",
            DoctorName = e.Doctor?.FullName ?? "",
            DepartmentName = e.Department?.DepartmentName ?? "",
            Status = e.Status == 2 ? "FullyDispensed" : e.Status == 1 ? "Active" : "Pending",
            Items = new List<PrescriptionItemDto>()
        }).ToList();
    }

    public async Task<PortalPrescriptionDto> GetPrescriptionAsync(Guid id)
    {
        var e = await _context.Prescriptions.Include(x => x.Details).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalPrescriptionDto { Id = e.Id, PrescriptionDate = e.PrescriptionDate, Status = e.Status == 2 ? "FullyDispensed" : e.Status == 1 ? "Active" : "Pending" };
    }

    // F9: yêu cầu cấp lại đơn persist THẬT (trước chỉ trả DTO, không lưu).
    public async Task<RefillRequestDto> RequestRefillAsync(RefillRequestDto dto)
    {
        var entity = new RefillRequest
        {
            Id = Guid.NewGuid(),
            PrescriptionId = dto.PrescriptionId,
            DeliveryOption = string.IsNullOrWhiteSpace(dto.DeliveryOption) ? "Pickup" : dto.DeliveryOption,
            DeliveryAddress = dto.DeliveryAddress,
            DeliveryPhone = dto.DeliveryPhone,
            PreferredPharmacyId = dto.PreferredPharmacyId,
            Notes = dto.Notes,
            Status = "Pending",
            RequestedAt = DateTime.Now,
            CreatedAt = DateTime.Now,
        };
        _context.RefillRequests.Add(entity);
        await _context.SaveChangesAsync();
        dto.Id = entity.Id; dto.Status = entity.Status; dto.RequestedAt = entity.RequestedAt;
        return dto;
    }

    public async Task<List<PortalPrescriptionDto>> GetRefillHistoryAsync(Guid patientId)
    {
        var list = await (from r in _context.RefillRequests.Where(x => !x.IsDeleted)
                          join p in _context.Prescriptions on r.PrescriptionId equals p.Id
                          join mr in _context.MedicalRecords on p.MedicalRecordId equals mr.Id
                          where mr.PatientId == patientId
                          orderby r.RequestedAt descending
                          select new PortalPrescriptionDto { Id = p.Id, PrescriptionDate = r.RequestedAt, Status = r.Status })
                         .Take(50).ToListAsync();
        return list;
    }

    public async Task<List<PortalInvoiceDto>> GetInvoicesAsync(Guid patientId, bool unpaidOnly = false)
    {
        var query = _context.Receipts.AsQueryable();
        if (patientId != Guid.Empty) query = query.Where(x => x.PatientId == patientId);
        if (unpaidOnly) query = query.Where(x => x.Status != 1);
        var list = await query.OrderByDescending(x => x.ReceiptDate).Take(30).ToListAsync();
        return list.Select(e => new PortalInvoiceDto { Id = e.Id, InvoiceCode = e.ReceiptCode, InvoiceDate = e.ReceiptDate, TotalAmount = e.FinalAmount, PaymentStatus = e.Status == 1 ? "Paid" : "Unpaid" }).ToList();
    }

    public async Task<PortalInvoiceDto> GetInvoiceAsync(Guid id)
    {
        var e = await _context.Receipts.Include(x => x.Details).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalInvoiceDto { Id = e.Id, InvoiceCode = e.ReceiptCode, InvoiceDate = e.ReceiptDate, TotalAmount = e.FinalAmount, PaymentStatus = e.Status == 1 ? "Paid" : "Unpaid" };
    }

    public async Task<OnlinePaymentDto> InitiatePaymentAsync(Guid patientId, InitiatePaymentDto dto)
    {
        var invoiceId = dto.InvoiceIds?.FirstOrDefault() ?? Guid.Empty;
        var invoice = await _context.Receipts.FindAsync(invoiceId);
        var amount = invoice?.FinalAmount ?? 0;
        var entity = new OnlinePayment { Id = Guid.NewGuid(), PatientId = patientId, ReferenceId = invoiceId, PaymentType = "Invoice", Amount = amount, PaymentMethod = dto.PaymentMethod ?? "VNPay", Status = "Pending", TransactionCode = $"PAY-{DateTime.Now:yyyyMMddHHmmss}", CreatedAt = DateTime.Now };
        _context.OnlinePayments.Add(entity);
        await _context.SaveChangesAsync();
        return new OnlinePaymentDto { Id = entity.Id, Amount = entity.Amount, PaymentMethod = entity.PaymentMethod, Status = entity.Status };
    }

    public async Task<OnlinePaymentDto> GetPaymentStatusAsync(Guid paymentId)
    {
        var e = await _context.OnlinePayments.FindAsync(paymentId);
        return e == null ? null! : new OnlinePaymentDto { Id = e.Id, Amount = e.Amount, PaymentMethod = e.PaymentMethod, Status = e.Status, TransactionCode = e.TransactionCode };
    }

    public async Task<bool> ProcessPaymentCallbackAsync(string transactionCode, string gatewayResponse)
    {
        var e = await _context.OnlinePayments.FirstOrDefaultAsync(x => x.TransactionCode == transactionCode);
        if (e == null) return false;
        e.Status = gatewayResponse.Contains("success") ? "Completed" : "Failed"; e.GatewayResponse = gatewayResponse; e.PaidAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    // F9: phản hồi/đánh giá dịch vụ persist THẬT (trước chỉ trả DTO rỗng).
    public async Task<ServiceFeedbackDto> SubmitFeedbackAsync(Guid patientId, SubmitFeedbackDto dto)
    {
        var entity = new ServiceFeedback
        {
            Id = Guid.NewGuid(), PatientId = patientId, VisitId = dto.VisitId,
            OverallRating = dto.OverallRating, DoctorRating = dto.DoctorRating, StaffRating = dto.StaffRating,
            FacilityRating = dto.FacilityRating, WaitTimeRating = dto.WaitTimeRating,
            Comments = dto.Comments, WouldRecommend = dto.WouldRecommend,
            SubmittedAt = DateTime.Now, CreatedAt = DateTime.Now,
        };
        _context.ServiceFeedbacks.Add(entity);
        await _context.SaveChangesAsync();
        return new ServiceFeedbackDto
        {
            Id = entity.Id, VisitId = entity.VisitId, OverallRating = entity.OverallRating,
            DoctorRating = entity.DoctorRating, StaffRating = entity.StaffRating, FacilityRating = entity.FacilityRating,
            WaitTimeRating = entity.WaitTimeRating, Comments = entity.Comments, WouldRecommend = entity.WouldRecommend,
            SubmittedAt = entity.SubmittedAt,
        };
    }

    public async Task<List<PortalNotificationDto>> GetNotificationsAsync(Guid accountId, bool unreadOnly = false)
    {
        // Demo fallback: if accountId is empty or has no portal account, return latest 50 notifications.
        IQueryable<Notification> query;
        if (accountId == Guid.Empty)
        {
            query = _context.Notifications;
        }
        else
        {
            var account = await _context.PortalAccounts.FindAsync(accountId);
            query = account?.PatientId != null
                ? _context.Notifications.Where(x => x.TargetUserId == account.PatientId)
                : _context.Notifications;
        }
        if (unreadOnly) query = query.Where(x => !x.IsRead);
        var list = await query.OrderByDescending(x => x.CreatedAt).Take(50).ToListAsync();
        return list.Select(e => new PortalNotificationDto { Id = e.Id, Title = e.Title, Message = e.Content, IsRead = e.IsRead, CreatedAt = e.CreatedAt }).ToList();
    }

    public async Task<bool> MarkNotificationReadAsync(Guid id)
    {
        var e = await _context.Notifications.FindAsync(id);
        if (e == null) return false;
        e.IsRead = true; e.ReadAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> GetUnreadNotificationCountAsync(Guid accountId)
    {
        var account = await _context.PortalAccounts.FindAsync(accountId);
        if (account?.PatientId == null) return 0;
        return await _context.Notifications.CountAsync(x => x.TargetUserId == account.PatientId && !x.IsRead);
    }

    public async Task<PatientPortalDashboardDto> GetDashboardAsync(Guid patientId)
    {
        try
        {
            // Demo fallback: empty patientId aggregates across the whole hospital
            // so admin (no portal account) sees real numbers on the dashboard.
            var hasPatient = patientId != Guid.Empty;
            var upcomingAppointments = 0;
            try { upcomingAppointments = await _context.PortalAppointments.CountAsync(x => (!hasPatient || x.PatientId == patientId) && x.AppointmentDate >= DateTime.Today && x.Status != "Cancelled"); } catch (SqlException) { }
            var unpaidInvoices = 0;
            try { unpaidInvoices = await _context.Receipts.CountAsync(x => (!hasPatient || x.PatientId == patientId) && x.Status != 1); } catch (SqlException) { }
            var newLabResults = 0;
            // #14b: đếm KQ XN mới từ ServiceRequestDetail (model 1) thay LabResults (model 2 chết).
            try { newLabResults = await _context.ServiceRequestDetails.CountAsync(d => (!hasPatient || d.ServiceRequest.MedicalRecord.PatientId == patientId) && d.ServiceRequest.RequestType == 1 && d.Status == 2); } catch (SqlException) { }
            return new PatientPortalDashboardDto
            {
                PatientId = patientId,
                UpcomingAppointments = upcomingAppointments,
                UnpaidInvoices = unpaidInvoices,
                NewLabResults = newLabResults
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new PatientPortalDashboardDto { PatientId = patientId };
        }
    }

    // NangCap19: Family Members
    public async Task<List<FamilyMemberDto>> GetFamilyMembersAsync(Guid accountId)
    {
        try
        {
            // Demo fallback: empty accountId returns the first 20 rows so admin
            // (who has no portal account) can still see something on /patient-portal.
            var query = _context.FamilyMembers.Where(x => x.IsActive);
            if (accountId != Guid.Empty) query = query.Where(x => x.AccountId == accountId);
            var list = await query
                .OrderBy(x => x.FullName)
                .Take(20)
                .ToListAsync();
            return list.Select(e => new FamilyMemberDto
            {
                Id = e.Id, AccountId = e.AccountId, FullName = e.FullName, Relationship = e.Relationship,
                DateOfBirth = e.DateOfBirth ?? "", Gender = e.Gender ?? "", IdNumber = e.IdNumber ?? "",
                Phone = e.Phone ?? "", InsuranceNumber = e.InsuranceNumber ?? "",
                LinkedPatientId = e.LinkedPatientId, IsActive = e.IsActive, CreatedAt = e.CreatedAt
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<FamilyMemberDto>();
        }
    }

    public async Task<FamilyMemberDto> SaveFamilyMemberAsync(SaveFamilyMemberDto dto)
    {
        var entity = dto.Id.HasValue && dto.Id != Guid.Empty
            ? await _context.FamilyMembers.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new FamilyMember { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.FamilyMembers.Add(entity);
        }
        entity.AccountId = dto.AccountId;
        entity.FullName = dto.FullName;
        entity.Relationship = dto.Relationship;
        entity.DateOfBirth = dto.DateOfBirth;
        entity.Gender = dto.Gender;
        entity.IdNumber = dto.IdNumber;
        entity.Phone = dto.Phone;
        entity.InsuranceNumber = dto.InsuranceNumber;
        entity.LinkedPatientId = dto.LinkedPatientId;
        entity.IsActive = true;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new FamilyMemberDto
        {
            Id = entity.Id, AccountId = entity.AccountId, FullName = entity.FullName,
            Relationship = entity.Relationship, DateOfBirth = entity.DateOfBirth ?? "",
            Gender = entity.Gender ?? "", IdNumber = entity.IdNumber ?? "",
            Phone = entity.Phone ?? "", InsuranceNumber = entity.InsuranceNumber ?? "",
            LinkedPatientId = entity.LinkedPatientId, IsActive = entity.IsActive, CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteFamilyMemberAsync(Guid id)
    {
        var entity = await _context.FamilyMembers.FindAsync(id);
        if (entity == null) return false;
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    // NangCap19: Medicine Reminders
    public async Task<List<MedicineReminderDto>> GetMedicineRemindersAsync(Guid accountId, bool activeOnly = true)
    {
        try
        {
            IQueryable<MedicineReminder> query = _context.MedicineReminders;
            if (accountId != Guid.Empty) query = query.Where(x => x.AccountId == accountId);
            if (activeOnly) query = query.Where(x => x.IsActive);
            var list = await query.OrderBy(x => x.MedicineName).Take(30).ToListAsync();
            return list.Select(e => new MedicineReminderDto
            {
                Id = e.Id, AccountId = e.AccountId, MedicineName = e.MedicineName, Dosage = e.Dosage,
                Frequency = e.Frequency, Times = e.Times ?? "", Instructions = e.Instructions ?? "",
                StartDate = e.StartDate, EndDate = e.EndDate, IsActive = e.IsActive,
                PrescriptionId = e.PrescriptionId ?? "", Notes = e.Notes ?? "", CreatedAt = e.CreatedAt
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<MedicineReminderDto>();
        }
    }

    public async Task<MedicineReminderDto> SaveMedicineReminderAsync(SaveMedicineReminderDto dto)
    {
        var entity = dto.Id.HasValue && dto.Id != Guid.Empty
            ? await _context.MedicineReminders.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new MedicineReminder { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.MedicineReminders.Add(entity);
        }
        entity.AccountId = dto.AccountId;
        entity.MedicineName = dto.MedicineName;
        entity.Dosage = dto.Dosage;
        entity.Frequency = dto.Frequency;
        entity.Times = dto.Times;
        entity.Instructions = dto.Instructions;
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;
        entity.PrescriptionId = dto.PrescriptionId;
        entity.Notes = dto.Notes;
        entity.IsActive = true;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new MedicineReminderDto
        {
            Id = entity.Id, AccountId = entity.AccountId, MedicineName = entity.MedicineName,
            Dosage = entity.Dosage, Frequency = entity.Frequency, Times = entity.Times ?? "",
            Instructions = entity.Instructions ?? "", StartDate = entity.StartDate, EndDate = entity.EndDate,
            IsActive = entity.IsActive, PrescriptionId = entity.PrescriptionId ?? "",
            Notes = entity.Notes ?? "", CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteMedicineReminderAsync(Guid id)
    {
        var entity = await _context.MedicineReminders.FindAsync(id);
        if (entity == null) return false;
        _context.MedicineReminders.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleMedicineReminderAsync(Guid id)
    {
        var entity = await _context.MedicineReminders.FindAsync(id);
        if (entity == null) return false;
        entity.IsActive = !entity.IsActive;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    // NangCap19: Health Metrics
    public async Task<List<HealthMetricDto>> GetHealthMetricsAsync(Guid accountId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            IQueryable<HealthMetric> query = _context.HealthMetrics;
            if (accountId != Guid.Empty) query = query.Where(x => x.AccountId == accountId);
            if (fromDate.HasValue) query = query.Where(x => x.RecordedAt >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(x => x.RecordedAt <= toDate.Value);
            var list = await query.OrderByDescending(x => x.RecordedAt).Take(200).ToListAsync();
            return list.Select(e => new HealthMetricDto
            {
                Id = e.Id, AccountId = e.AccountId, RecordedAt = e.RecordedAt,
                BloodPressureSystolic = e.BloodPressureSystolic, BloodPressureDiastolic = e.BloodPressureDiastolic,
                HeartRate = e.HeartRate, Weight = e.Weight, Height = e.Height, BMI = e.BMI,
                BloodGlucose = e.BloodGlucose, Temperature = e.Temperature, SpO2 = e.SpO2,
                Notes = e.Notes ?? "", Source = e.Source, CreatedAt = e.CreatedAt
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<HealthMetricDto>();
        }
    }

    public async Task<HealthMetricDto> SaveHealthMetricAsync(SaveHealthMetricDto dto)
    {
        var entity = dto.Id.HasValue && dto.Id != Guid.Empty
            ? await _context.HealthMetrics.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new HealthMetric { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.HealthMetrics.Add(entity);
        }
        entity.AccountId = dto.AccountId;
        entity.RecordedAt = dto.RecordedAt;
        entity.BloodPressureSystolic = dto.BloodPressureSystolic;
        entity.BloodPressureDiastolic = dto.BloodPressureDiastolic;
        entity.HeartRate = dto.HeartRate;
        entity.Weight = dto.Weight;
        entity.Height = dto.Height;
        entity.BloodGlucose = dto.BloodGlucose;
        entity.Temperature = dto.Temperature;
        entity.SpO2 = dto.SpO2;
        entity.Notes = dto.Notes;
        entity.Source = dto.Source ?? "Manual";
        // Auto-calculate BMI
        if (entity.Weight.HasValue && entity.Height.HasValue && entity.Height > 0)
        {
            var heightM = entity.Height.Value / 100m;
            entity.BMI = Math.Round(entity.Weight.Value / (heightM * heightM), 1);
        }
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new HealthMetricDto
        {
            Id = entity.Id, AccountId = entity.AccountId, RecordedAt = entity.RecordedAt,
            BloodPressureSystolic = entity.BloodPressureSystolic, BloodPressureDiastolic = entity.BloodPressureDiastolic,
            HeartRate = entity.HeartRate, Weight = entity.Weight, Height = entity.Height, BMI = entity.BMI,
            BloodGlucose = entity.BloodGlucose, Temperature = entity.Temperature, SpO2 = entity.SpO2,
            Notes = entity.Notes ?? "", Source = entity.Source, CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteHealthMetricAsync(Guid id)
    {
        var entity = await _context.HealthMetrics.FindAsync(id);
        if (entity == null) return false;
        _context.HealthMetrics.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<HealthMetricTrendDto>> GetHealthMetricTrendsAsync(Guid accountId, int days = 30)
    {
        try
        {
            var fromDate = DateTime.Now.AddDays(-days);
            IQueryable<HealthMetric> q = _context.HealthMetrics.Where(x => x.RecordedAt >= fromDate);
            if (accountId != Guid.Empty) q = q.Where(x => x.AccountId == accountId);
            var metrics = await q
                .OrderBy(x => x.RecordedAt)
                .ToListAsync();

            var trends = new List<HealthMetricTrendDto>();

            // Blood Pressure Systolic
            var bpSys = metrics.Where(x => x.BloodPressureSystolic.HasValue).ToList();
            if (bpSys.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "BloodPressureSystolic",
                    DataPoints = bpSys.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.BloodPressureSystolic!.Value }).ToList(),
                    MinValue = bpSys.Min(x => x.BloodPressureSystolic), MaxValue = bpSys.Max(x => x.BloodPressureSystolic),
                    AvgValue = Math.Round(bpSys.Average(x => x.BloodPressureSystolic!.Value), 1), LatestValue = bpSys.Last().BloodPressureSystolic
                });
            }

            // Blood Pressure Diastolic
            var bpDia = metrics.Where(x => x.BloodPressureDiastolic.HasValue).ToList();
            if (bpDia.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "BloodPressureDiastolic",
                    DataPoints = bpDia.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.BloodPressureDiastolic!.Value }).ToList(),
                    MinValue = bpDia.Min(x => x.BloodPressureDiastolic), MaxValue = bpDia.Max(x => x.BloodPressureDiastolic),
                    AvgValue = Math.Round(bpDia.Average(x => x.BloodPressureDiastolic!.Value), 1), LatestValue = bpDia.Last().BloodPressureDiastolic
                });
            }

            // Heart Rate
            var hr = metrics.Where(x => x.HeartRate.HasValue).ToList();
            if (hr.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "HeartRate",
                    DataPoints = hr.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.HeartRate!.Value }).ToList(),
                    MinValue = hr.Min(x => x.HeartRate), MaxValue = hr.Max(x => x.HeartRate),
                    AvgValue = Math.Round(hr.Average(x => x.HeartRate!.Value), 1), LatestValue = hr.Last().HeartRate
                });
            }

            // Weight
            var wt = metrics.Where(x => x.Weight.HasValue).ToList();
            if (wt.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "Weight",
                    DataPoints = wt.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.Weight!.Value }).ToList(),
                    MinValue = wt.Min(x => x.Weight), MaxValue = wt.Max(x => x.Weight),
                    AvgValue = Math.Round(wt.Average(x => x.Weight!.Value), 1), LatestValue = wt.Last().Weight
                });
            }

            // Blood Glucose
            var bg = metrics.Where(x => x.BloodGlucose.HasValue).ToList();
            if (bg.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "BloodGlucose",
                    DataPoints = bg.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.BloodGlucose!.Value }).ToList(),
                    MinValue = bg.Min(x => x.BloodGlucose), MaxValue = bg.Max(x => x.BloodGlucose),
                    AvgValue = Math.Round(bg.Average(x => x.BloodGlucose!.Value), 1), LatestValue = bg.Last().BloodGlucose
                });
            }

            // SpO2
            var spo2 = metrics.Where(x => x.SpO2.HasValue).ToList();
            if (spo2.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "SpO2",
                    DataPoints = spo2.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.SpO2!.Value }).ToList(),
                    MinValue = spo2.Min(x => x.SpO2), MaxValue = spo2.Max(x => x.SpO2),
                    AvgValue = Math.Round(spo2.Average(x => x.SpO2!.Value), 1), LatestValue = spo2.Last().SpO2
                });
            }

            return trends;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<HealthMetricTrendDto>();
        }
    }

    // NangCap19: Patient Q&A
    public async Task<List<PatientQuestionDto>> GetPatientQuestionsAsync(Guid accountId, int? status = null)
    {
        try
        {
            IQueryable<PatientQuestion> query = _context.PatientQuestions;
            if (accountId != Guid.Empty) query = query.Where(x => x.AccountId == accountId);
            if (status.HasValue) query = query.Where(x => x.Status == status.Value);
            var list = await query.OrderByDescending(x => x.CreatedAt).Take(100).ToListAsync();
            return list.Select(MapQuestionToDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<PatientQuestionDto>();
        }
    }

    public async Task<PatientQuestionDto> CreatePatientQuestionAsync(CreatePatientQuestionDto dto)
    {
        var entity = new PatientQuestion
        {
            Id = Guid.NewGuid(),
            AccountId = dto.AccountId,
            Subject = dto.Subject,
            Content = dto.Content,
            Category = dto.Category,
            ImageUrls = dto.ImageUrls,
            IsPublic = dto.IsPublic,
            Status = 1,
            CreatedAt = DateTime.Now
        };
        _context.PatientQuestions.Add(entity);
        await _context.SaveChangesAsync();
        return MapQuestionToDto(entity);
    }

    public async Task<PatientQuestionDto> GetQuestionByIdAsync(Guid id)
    {
        var entity = await _context.PatientQuestions.FindAsync(id);
        return entity == null ? null! : MapQuestionToDto(entity);
    }

    public async Task<PatientQuestionDto> AnswerPatientQuestionAsync(Guid id, AnswerPatientQuestionDto dto)
    {
        var entity = await _context.PatientQuestions.FindAsync(id);
        if (entity == null) return null!;
        entity.AnsweredBy = dto.AnsweredBy;
        entity.AnsweredByName = dto.AnsweredByName;
        entity.Answer = dto.Answer;
        entity.AnsweredAt = DateTime.Now;
        entity.Status = 2; // Answered
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return MapQuestionToDto(entity);
    }

    private static PatientQuestionDto MapQuestionToDto(PatientQuestion e) => new()
    {
        Id = e.Id, AccountId = e.AccountId, Subject = e.Subject, Content = e.Content,
        Category = e.Category ?? "", ImageUrls = e.ImageUrls ?? "", Status = e.Status,
        StatusText = e.Status switch { 1 => "Chờ trả lời", 2 => "Đã trả lời", 3 => "Đã đóng", _ => "Không xác định" },
        AnsweredBy = e.AnsweredBy ?? "", AnsweredByName = e.AnsweredByName ?? "",
        Answer = e.Answer ?? "", AnsweredAt = e.AnsweredAt, IsPublic = e.IsPublic, CreatedAt = e.CreatedAt
    };
}
#endregion
