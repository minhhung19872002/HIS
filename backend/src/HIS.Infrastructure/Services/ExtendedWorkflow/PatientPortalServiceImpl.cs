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

    // RIS là nơi duy nhất biết cách nói chuyện với Orthanc (cấu hình, xác thực, tìm study). Cổng bệnh
    // nhân mượn lại thay vì tự dựng một đường ống PACS thứ hai — hai đường ống thì sớm muộn cũng lệch.
    private readonly IRISCompleteService _ris;

    // QA-R11: portal bookings go through the real HIS booking pipeline (slot capacity, duplicate-day check,
    // queue number, reception worklist) instead of the parallel PortalAppointments table nobody processes.
    private readonly IAppointmentBookingService _booking;

    public PatientPortalServiceImpl(HISDbContext context, IRISCompleteService ris, IAppointmentBookingService booking)
    {
        _context = context;
        _ris = ris;
        _booking = booking;
    }

    public async Task<PortalAccountDto> GetAccountAsync(Guid accountId)
    {
        var e = await _context.PortalAccounts.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == accountId);
        return e == null ? null! : new PortalAccountDto { Id = e.Id, Email = e.Email, Phone = e.Phone, PatientId = e.PatientId, PatientName = e.Patient?.FullName ?? "", Status = e.Status, IsEmailVerified = e.IsEmailVerified, IsPhoneVerified = e.IsPhoneVerified };
    }

    public async Task<List<PortalAccountLookupDto>> SearchPortalAccountsAsync(string? keyword, int take)
    {
        take = take <= 0 ? 20 : Math.Min(take, 50);
        var query = _context.PortalAccounts.AsNoTracking().Where(a => !a.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            // Phone matches only on the digits a staff member already sees (suffix), never a full-number probe.
            query = query.Where(a => (a.Patient != null && (a.Patient.PatientCode.Contains(kw) || a.Patient.FullName.Contains(kw)))
                                     || (kw.Length <= 3 && a.Phone.EndsWith(kw)));
        }
        var rows = await query
            .OrderBy(a => a.Patient == null).ThenByDescending(a => a.LastLoginAt).ThenByDescending(a => a.CreatedAt)
            .Take(take)
            .Select(a => new
            {
                a.Id, a.PatientId, a.Phone, a.Status,
                PatientCode = a.Patient != null ? a.Patient.PatientCode : null,
                PatientName = a.Patient != null ? a.Patient.FullName : null,
            })
            .ToListAsync();
        return rows.Select(r => new PortalAccountLookupDto
        {
            Id = r.Id,
            PatientId = r.PatientId,
            PatientCode = r.PatientCode,
            PatientName = r.PatientName,
            MaskedPhone = MaskPhone(r.Phone),
            Status = r.Status ?? string.Empty,
        }).ToList();
    }

    private static string MaskPhone(string? phone)
    {
        var p = (phone ?? string.Empty).Trim();
        if (p.Length == 0) return string.Empty;
        return p.Length <= 3 ? new string('*', p.Length) : new string('*', p.Length - 3) + p[^3..];
    }

    public async Task<PortalAccountDto> RegisterAccountAsync(RegisterPortalAccountDto dto)
    {
        // R2: hash BCrypt (trước đây lưu plaintext — bảng 0 rows nên không cần backfill).
        // Username = email (fallback phone) để login bằng identifier.
        var username = !string.IsNullOrWhiteSpace(dto.Email) ? dto.Email.Trim() : dto.Phone?.Trim() ?? "";
        // QA-R11: the same e-mail/phone could be registered again (and with a 1-char password). Login picks
        // FirstOrDefault by username/email/phone, so a squatting duplicate could lock the real owner out.
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Cần email hoặc số điện thoại để đăng ký", nameof(dto.Email));
        if (string.IsNullOrEmpty(dto.Password) || dto.Password.Length < 8)
            throw new ArgumentException("Mật khẩu tối thiểu 8 ký tự", nameof(dto.Password));
        var email = dto.Email?.Trim() ?? "";
        var phone = dto.Phone?.Trim() ?? "";
        if (await _context.PortalAccounts.AnyAsync(a => !a.IsDeleted && (a.Username == username
                || (email != "" && (a.Email == email || a.Username == email))
                || (phone != "" && (a.Phone == phone || a.Username == phone)))))
            throw new InvalidOperationException("Email hoặc số điện thoại đã được dùng cho một tài khoản khác");
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
        var account = await _context.PortalAccounts.FindAsync(accountId);
        if (account == null) return false;
        // Anonymous endpoint + guessable verification (a birth date is ~36k values): cap attempts per
        // account and never re-point an account that is already linked to someone else.
        if (account.LockedUntil.HasValue && account.LockedUntil.Value > DateTime.UtcNow) return false;
        var patient = await _context.Patients.FirstOrDefaultAsync(x => x.PatientCode == patientCode);
        if (patient == null) { await RegisterFailedLinkAttemptAsync(account); return false; }
        if (account.PatientId.HasValue && account.PatientId.Value != patient.Id) return false;

        // R2: BẮT BUỘC verify — verificationData phải khớp SĐT / CCCD / ngày sinh (yyyy-MM-dd) của BN.
        // Trước đây không kiểm tra gì → ai có account đều link được bất kỳ patientCode (IDOR).
        var v = (verificationData ?? "").Trim();
        if (v.Length == 0) return false;
        var matches =
            (!string.IsNullOrWhiteSpace(patient.PhoneNumber) && string.Equals(patient.PhoneNumber.Trim(), v, StringComparison.Ordinal)) ||
            (!string.IsNullOrWhiteSpace(patient.IdentityNumber) && string.Equals(patient.IdentityNumber.Trim(), v, StringComparison.Ordinal)) ||
            (patient.DateOfBirth.HasValue && patient.DateOfBirth.Value.ToString("yyyy-MM-dd") == v);
        if (!matches) { await RegisterFailedLinkAttemptAsync(account); return false; }

        account.PatientId = patient.Id; account.Status = "Active";
        account.FailedLoginAttempts = 0; account.LockedUntil = null;
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task RegisterFailedLinkAttemptAsync(PortalAccount account)
    {
        account.FailedLoginAttempts++;
        if (account.FailedLoginAttempts >= 5)
        {
            account.LockedUntil = DateTime.UtcNow.AddMinutes(30);
            account.FailedLoginAttempts = 0;
        }
        await _context.SaveChangesAsync();
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
        // QA-R11: the portal listed only the legacy PortalAppointments table — bookings made at the counter or in
        // the patient app (HIS Appointments), and their cancellations, never showed up. HIS appointments first,
        // legacy portal rows (seed/demo history) appended.
        var hisQuery = _context.Appointments.AsNoTracking()
            .Include(a => a.Patient).Include(a => a.Department).Include(a => a.Doctor).Include(a => a.Room)
            .Where(a => !a.IsDeleted);
        // Demo fallback kept: empty patientId (staff token without a patient) lists the hospital's rows.
        if (patientId != Guid.Empty) hisQuery = hisQuery.Where(a => a.PatientId == patientId);
        if (!includeHistory) hisQuery = hisQuery.Where(a => a.AppointmentDate >= DateTime.Today);
        var his = await hisQuery.OrderBy(a => a.AppointmentDate).ThenBy(a => a.AppointmentTime).Take(30).ToListAsync();
        var result = his.Select(MapHisAppointment).ToList();
        try
        {
            var query = _context.PortalAppointments.Include(x => x.Department).AsQueryable();
            if (patientId != Guid.Empty) query = query.Where(x => x.PatientId == patientId);
            if (!includeHistory) query = query.Where(x => x.AppointmentDate >= DateTime.Today);
            var list = await query.OrderBy(x => x.AppointmentDate).Take(30).ToListAsync();
            result.AddRange(list.Select(e => new PortalAppointmentDto { Id = e.Id, AppointmentCode = e.BookingCode, PatientId = e.PatientId, DepartmentId = e.DepartmentId, DepartmentName = e.Department?.DepartmentName ?? "", AppointmentDate = e.AppointmentDate, AppointmentTime = e.SlotTime, Status = e.Status, ReasonForVisit = e.ChiefComplaint, CreatedAt = e.CreatedAt }));
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            // legacy table absent — HIS appointments are enough
        }
        return result;
    }

    public async Task<PortalAppointmentDto> GetAppointmentAsync(Guid id)
    {
        var a = await _context.Appointments.AsNoTracking()
            .Include(x => x.Patient).Include(x => x.Department).Include(x => x.Doctor).Include(x => x.Room)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (a != null) return MapHisAppointment(a);
        var e = await _context.PortalAppointments.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalAppointmentDto { Id = e.Id, AppointmentCode = e.BookingCode, PatientId = e.PatientId, DepartmentId = e.DepartmentId, DepartmentName = e.Department?.DepartmentName ?? "", AppointmentDate = e.AppointmentDate, AppointmentTime = e.SlotTime, Status = e.Status, ReasonForVisit = e.ChiefComplaint, CreatedAt = e.CreatedAt };
    }

    // HIS Appointment.Status: 0 chờ xác nhận · 1 đã xác nhận · 2 đã đến khám · 3 không đến · 4 đã hủy.
    private static PortalAppointmentDto MapHisAppointment(Appointment a) => new()
    {
        Id = a.Id,
        AppointmentCode = a.AppointmentCode ?? "",
        PatientId = a.PatientId,
        PatientName = a.Patient?.FullName ?? "",
        AppointmentDate = a.AppointmentDate,
        AppointmentTime = a.AppointmentTime ?? TimeSpan.Zero,
        Session = (a.AppointmentTime ?? TimeSpan.Zero).Hours < 12 ? "Morning" : "Afternoon",
        DepartmentId = a.DepartmentId ?? Guid.Empty,
        DepartmentName = a.Department?.DepartmentName ?? "",
        DoctorId = a.DoctorId,
        DoctorName = a.Doctor?.FullName ?? "",
        RoomNumber = a.Room?.RoomName ?? "",
        VisitType = a.AppointmentType == 1 ? "FollowUp" : a.AppointmentType == 3 ? "HealthCheck" : "New",
        ReasonForVisit = a.Reason ?? "",
        Status = a.Status switch { 0 => "Pending", 1 => "Confirmed", 2 => "CheckedIn", 3 => "NoShow", 4 => "Cancelled", _ => "Pending" },
        QueueNumber = a.QueueNumber,
        CreatedAt = a.CreatedAt,
    };

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
        // QA-R11: this inserted into PortalAppointments with BookingFee = NULL (column is NOT NULL → every portal
        // booking failed with 400 "Thiếu trường bắt buộc: BookingFee"), accepted PatientId = Guid.Empty for a staff
        // token, past dates and any department — and the row never reached reception. Book a real HIS appointment.
        if (patientId == Guid.Empty)
            throw new ArgumentException("Chưa chọn người bệnh để đặt lịch", nameof(patientId));
        var patient = await _context.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.Id == patientId && !p.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ người bệnh");
        if (dto.DepartmentId == Guid.Empty || !await _context.Departments.AnyAsync(d => d.Id == dto.DepartmentId && d.IsActive))
            throw new ArgumentException("Khoa khám không hợp lệ", nameof(dto.DepartmentId));
        var result = await _booking.BookAppointmentAsync(new OnlineBookingDto
        {
            PatientId = patient.Id,
            PatientName = patient.FullName,
            // Owner is fixed by PatientId; the phone only feeds the per-phone daily limit (placeholder when absent).
            PhoneNumber = string.IsNullOrWhiteSpace(patient.PhoneNumber) ? patient.PatientCode : patient.PhoneNumber!,
            AppointmentDate = dto.AppointmentDate.Date,
            AppointmentTime = dto.AppointmentTime == TimeSpan.Zero ? null : dto.AppointmentTime,
            DepartmentId = dto.DepartmentId,
            DoctorId = dto.DoctorId,
            AppointmentType = dto.VisitType switch { "FollowUp" => 1, "HealthCheck" => 3, _ => 2 },
            Reason = dto.ReasonForVisit,
            Notes = string.IsNullOrWhiteSpace(dto.Symptoms) ? null : dto.Symptoms,
            IsAuthenticatedCaller = true,
        });
        if (!result.Success)
            throw new InvalidOperationException(result.Message ?? "Không đặt được lịch hẹn");
        var id = await _context.Appointments.Where(a => a.AppointmentCode == result.AppointmentCode)
            .Select(a => a.Id).FirstAsync();
        return await GetAppointmentAsync(id);
    }

    public async Task<bool> CancelAppointmentAsync(Guid id, string reason)
    {
        var his = await _context.Appointments.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (his != null)
        {
            // Same rules as the counter / app cancel (Status >= 2 refused, queue ticket released).
            await _booking.CancelAppointmentAsync(his.AppointmentCode, new CancelBookingDto { PatientId = his.PatientId, Reason = reason });
            return true;
        }
        var e = await _context.PortalAppointments.FindAsync(id);
        if (e == null) return false;
        if (e.Status is "Cancelled" or "Completed" or "CheckedIn")
            throw new InvalidOperationException("Lịch hẹn đã hủy hoặc đã khám — không hủy được");
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
        // Ngày khám = giờ bắt đầu khám, chưa bắt đầu thì lấy lúc đăng ký — đúng như màn lịch sử khám
        // của HIS (GetPatientMedicalHistoryAsync). Trước đây lượt chưa bấm "bắt đầu khám" ra
        // DateTime.MinValue và người bệnh thấy ngày khám 01/01/0001.
        var exams = await _context.Examinations.Include(x => x.Room).ThenInclude(x => x!.Department).Include(x => x.Doctor).Include(x => x.MedicalRecord)
            .Where(x => x.MedicalRecord!.PatientId == patientId && !x.IsDeleted)
            .OrderByDescending(x => x.StartTime ?? x.CreatedAt)
            .Take(limit).ToListAsync();
        var icdNames = await LoadIcdNamesAsync(exams);
        return exams.Select(e => new VisitSummaryDto { VisitId = e.Id, VisitDate = e.StartTime ?? e.CreatedAt, Department = e.Room?.Department?.DepartmentName ?? "", DoctorName = e.Doctor?.FullName ?? "", Diagnosis = DescribeDiagnosis(e, icdNames) }).ToList();
    }

    /// <summary>
    /// Chẩn đoán hiển thị cho người bệnh. Bác sĩ chọn mã ICD mà chưa ghi tên chẩn đoán thì vẫn phải
    /// có gì đó để đọc — trước đây ô này trống trong khi màn khám của HIS hiện mã J00.
    /// </summary>
    private static string? DescribeDiagnosis(Examination exam, IReadOnlyDictionary<string, string> icdNames)
    {
        if (!string.IsNullOrWhiteSpace(exam.MainDiagnosis)) return exam.MainDiagnosis;
        var code = exam.MainIcdCode?.Trim();
        if (string.IsNullOrEmpty(code)) return null;
        return icdNames.TryGetValue(code, out var name) ? $"{code} - {name}" : code;
    }

    private async Task<IReadOnlyDictionary<string, string>> LoadIcdNamesAsync(IEnumerable<Examination> exams)
    {
        var codes = exams
            .Where(e => string.IsNullOrWhiteSpace(e.MainDiagnosis) && !string.IsNullOrWhiteSpace(e.MainIcdCode))
            .Select(e => e.MainIcdCode!.Trim())
            .Distinct()
            .ToList();
        if (codes.Count == 0) return new Dictionary<string, string>();

        var rows = await _context.IcdCodes.AsNoTracking()
            .Where(i => codes.Contains(i.Code) && !i.IsDeleted)
            .Select(i => new { i.Code, i.Name })
            .ToListAsync();
        return rows.GroupBy(r => r.Code).ToDictionary(g => g.Key, g => g.First().Name);
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
            VisitDate = exam.StartTime ?? exam.CreatedAt,
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

    public async Task<List<PortalLabResultDto>> GetLabResultsAsync(
        Guid patientId, DateTime? fromDate = null, DateTime? toDate = null, Guid? visitId = null,
        Guid? admissionId = null)
    {
        try
        {
            // #14b: KQ XN đọc từ ServiceRequestDetail (model 1) — bảng LabResults (model 2) chết
            // trong luồng thật nên BN trước đây không thấy KQ trên portal.
            var query = LabResultQuery();
            if (patientId != Guid.Empty) query = query.Where(d => d.ServiceRequest.MedicalRecord!.PatientId == patientId);
            if (fromDate.HasValue) query = query.Where(d => d.ResultDate >= fromDate);
            if (toDate.HasValue) query = query.Where(d => d.ResultDate <= toDate);
            // GAP 26: lọc theo lượt khám để trả lời được câu "kết quả của lần khám này".
            if (visitId.HasValue) query = query.Where(d => d.ServiceRequest.ExaminationId == visitId);
            // Nội trú (GAP 33): kết quả gắn với hồ sơ bệnh án của đợt nằm viện, không gắn lượt khám.
            var scope = await ResolveAdmissionScopeAsync(patientId, admissionId);
            if (scope is not null)
                query = query.Where(d => d.ServiceRequest.MedicalRecordId == scope.MedicalRecordId
                    && !(d.ServiceRequest.ExaminationId != null && d.ServiceRequest.RequestDate < scope.AdmittedAt));
            else if (admissionId.HasValue) return new List<PortalLabResultDto>();

            var list = await query.OrderByDescending(d => d.ResultDate).Take(30).ToListAsync();
            if (list.Count == 0) return new List<PortalLabResultDto>();

            // Chỉ số chi tiết KHÔNG nạp ở màn danh sách (30 phiếu × hàng chục chỉ số là quá nhiều),
            // nhưng cờ bất thường thì phải có: người bệnh cần thấy ngay phiếu nào đáng chú ý mà
            // không phải mở lần lượt từng cái.
            var ids = list.Select(d => d.Id).ToList();
            var abnormal = await _context.ServiceRequestDetailParameters
                .Where(p => ids.Contains(p.ServiceRequestDetailId)
                            && p.Flag != null && p.Flag != "" && p.Flag != "N")
                .Select(p => p.ServiceRequestDetailId)
                .Distinct()
                .ToListAsync();

            return list.Select(d => MapLabResult(d, abnormal.Contains(d.Id))).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<PortalLabResultDto>();
        }
    }

    public async Task<PortalLabResultDto> GetLabResultAsync(Guid id)
    {
        // #14b: đọc 1 KQ XN từ ServiceRequestDetail (model 1).
        var e = await LabResultQuery(requireResult: false).FirstOrDefaultAsync(d => d.Id == id);
        if (e == null) return null!;

        var parameters = await _context.ServiceRequestDetailParameters
            .Where(p => p.ServiceRequestDetailId == id)
            .OrderBy(p => p.SequenceNumber)
            .ToListAsync();

        var dto = MapLabResult(e, parameters.Any(p => IsAbnormalFlag(p.Flag)));
        dto.TestItems = parameters.Select(p => new LabTestItemDto
        {
            TestName = string.IsNullOrWhiteSpace(p.ParameterName) ? p.ParameterCode : p.ParameterName,
            Result = p.Value ?? "",
            Unit = p.Unit ?? "",
            NormalRange = FormatReferenceRange(p),
            Flag = DescribeFlag(p.Flag),
            Interpretation = "",
        }).ToList();

        // Không có chỉ số tách dòng (máy XN chưa nối, KTV gõ tay vào ô kết quả) thì vẫn phải cho
        // người bệnh xem được cái đã có, thay vì đưa ra một bảng rỗng.
        if (dto.TestItems.Count == 0 && !string.IsNullOrWhiteSpace(e.Result))
        {
            dto.TestItems.Add(new LabTestItemDto
            {
                TestName = e.Service?.ServiceName ?? "Kết quả",
                Result = e.Result!,
                Unit = "",
                NormalRange = "",
                Flag = "Normal",
                Interpretation = e.Conclusion ?? "",
            });
        }

        return dto;
    }

    public Task<bool> MarkLabResultViewedAsync(Guid id)
    {
        return Task.FromResult(true);
    }

    public async Task<List<PortalImagingResultDto>> GetImagingResultsAsync(
        Guid patientId, DateTime? fromDate = null, DateTime? toDate = null, Guid? visitId = null,
        Guid? admissionId = null)
    {
        var query = ImagingResultQuery();
        if (patientId != Guid.Empty) query = query.Where(x => x.RadiologyExam!.RadiologyRequest!.PatientId == patientId);
        if (fromDate.HasValue) query = query.Where(x => x.RadiologyExam!.ExamDate >= fromDate);
        if (toDate.HasValue) query = query.Where(x => x.RadiologyExam!.ExamDate <= toDate);
        if (visitId.HasValue) query = query.Where(x => x.RadiologyExam!.RadiologyRequest!.ExaminationId == visitId);

        var scope = await ResolveAdmissionScopeAsync(patientId, admissionId);
        if (scope is not null)
            query = query.Where(x => x.RadiologyExam!.RadiologyRequest!.MedicalRecordId == scope.MedicalRecordId
                && !(x.RadiologyExam!.RadiologyRequest!.ExaminationId != null
                     && x.RadiologyExam!.RadiologyRequest!.RequestDate < scope.AdmittedAt));
        else if (admissionId.HasValue) return new List<PortalImagingResultDto>();

        var list = await query.OrderByDescending(x => x.ReportDate).Take(30).ToListAsync();
        return list.Select(MapImagingResult).ToList();
    }

    public async Task<PortalImagingResultDto> GetImagingResultAsync(Guid id)
    {
        var e = await ImagingResultQuery().FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapImagingResult(e);
    }

    // ------------------------------------------------------- truy vấn và ánh xạ

    /// <summary>
    /// Phiếu XN đã có kết quả. <paramref name="requireResult"/> = false khi mở đúng một phiếu: người
    /// bệnh bấm vào từ danh sách nên phiếu chắc chắn hợp lệ, mà trả 404 cho phiếu đang chờ kết quả
    /// thì khó hiểu hơn là hiện "đang chờ".
    /// </summary>
    private IQueryable<ServiceRequestDetail> LabResultQuery(bool requireResult = true)
    {
        var query = _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.MedicalRecord)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.Doctor)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.Department)
            .Include(d => d.Service).ThenInclude(s => s.ServiceGroup)
            .Where(d => d.ServiceRequest.RequestType == 1 && d.Status != 3);

        return requireResult
            ? query.Where(d => d.Status == 2 || d.Result != null || d.ResultDate != null)
            : query;
    }

    private IQueryable<RadiologyReport> ImagingResultQuery() => _context.RadiologyReports
        .Include(x => x.Radiologist)
        .Include(x => x.RadiologyExam).ThenInclude(x => x!.Modality)
        .Include(x => x.RadiologyExam).ThenInclude(x => x!.DicomStudies)
        .Include(x => x.RadiologyExam).ThenInclude(x => x!.RadiologyRequest).ThenInclude(r => r!.Service)
        .Include(x => x.RadiologyExam).ThenInclude(x => x!.RadiologyRequest).ThenInclude(r => r!.RequestingDoctor)
        .AsQueryable();

    private static PortalLabResultDto MapLabResult(ServiceRequestDetail d, bool hasAbnormal)
    {
        var request = d.ServiceRequest;
        return new PortalLabResultDto
        {
            Id = d.Id,
            OrderCode = request?.RequestCode ?? "",
            OrderDate = request?.RequestDate ?? d.CreatedAt,
            ResultDate = d.ResultDate,
            OrderingDoctor = request?.Doctor?.FullName ?? "",
            Department = request?.Department?.DepartmentName ?? "",
            TestCategory = d.Service?.ServiceGroup?.GroupName ?? "",
            ServiceName = d.Service?.ServiceName ?? "",
            Status = DescribeResultStatus(d.Status),
            HasAbnormal = hasAbnormal,
            VisitId = request?.ExaminationId,
            TestItems = new List<LabTestItemDto>(),
            // Phiếu chưa có kết quả thì không có gì để in — để trống còn hơn đưa một đường dẫn 404.
            ReportUrl = d.Status == 2 ? $"/api/portal/lab-results/{d.Id}/report" : "",
        };
    }

    private static PortalImagingResultDto MapImagingResult(RadiologyReport e)
    {
        var exam = e.RadiologyExam;
        var request = exam?.RadiologyRequest;
        var study = exam?.DicomStudies?.OrderByDescending(s => s.StudyDate).FirstOrDefault();
        var imageCount = study?.NumberOfImages ?? 0;

        return new PortalImagingResultDto
        {
            Id = e.Id,
            OrderCode = request?.RequestCode ?? "",
            OrderDate = request?.RequestDate ?? e.CreatedAt,
            StudyDate = exam?.ExamDate,
            OrderingDoctor = request?.RequestingDoctor?.FullName ?? "",
            Department = "",
            Modality = exam?.Modality?.ModalityName ?? "",
            BodyPart = request?.BodyPart ?? "",
            StudyDescription = study?.StudyDescription ?? exam?.ExamName ?? request?.Service?.ServiceName ?? "",
            Findings = e.Findings ?? "",
            Impression = e.Impression ?? "",
            Recommendations = e.Recommendations ?? "",
            ReportingDoctor = e.Radiologist?.FullName ?? "",
            // Chỉ coi là xem được khi bác sĩ đã đọc xong. Ảnh thô chưa có kết luận đưa cho người bệnh
            // thì chỉ gây hoang mang.
            Status = e.Status >= 1 ? "Completed" : "Pending",
            HasImages = imageCount > 0 && !string.IsNullOrWhiteSpace(study?.StudyInstanceUID),
            ImageCount = imageCount,
            StudyInstanceUid = study?.StudyInstanceUID ?? "",
            ImageViewerUrl = imageCount > 0 ? $"/api/portal/imaging-results/{e.Id}/instances" : "",
            ThumbnailUrls = new List<string>(),
            VisitId = request?.ExaminationId,
        };
    }

    private static bool IsAbnormalFlag(string? flag) =>
        !string.IsNullOrWhiteSpace(flag) && !string.Equals(flag, "N", StringComparison.OrdinalIgnoreCase);

    /// <summary>Cờ LIS (H/L/HH/LL) → chữ mà người không làm xét nghiệm vẫn hiểu.</summary>
    private static string DescribeFlag(string? flag) => (flag ?? "").ToUpperInvariant() switch
    {
        "H" => "High",
        "L" => "Low",
        "HH" => "Critical",
        "LL" => "Critical",
        _ => "Normal",
    };

    private static string DescribeResultStatus(int status) => status switch
    {
        2 => "Completed",
        1 => "InProgress",
        _ => "Pending",
    };

    /// <summary>Ưu tiên chuỗi khoảng tham chiếu do LIS gửi; không có thì ghép từ min/max.</summary>
    private static string FormatReferenceRange(ServiceRequestDetailParameter p)
    {
        if (!string.IsNullOrWhiteSpace(p.ReferenceRange)) return p.ReferenceRange!;
        if (p.ReferenceMin.HasValue && p.ReferenceMax.HasValue) return $"{p.ReferenceMin} - {p.ReferenceMax}";
        if (p.ReferenceMin.HasValue) return $"≥ {p.ReferenceMin}";
        if (p.ReferenceMax.HasValue) return $"≤ {p.ReferenceMax}";
        return "";
    }
}
