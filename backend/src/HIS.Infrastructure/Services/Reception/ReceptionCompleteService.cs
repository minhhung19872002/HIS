using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Common;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Properties;
using iText.Barcodes;
using IxPageSize = iText.Kernel.Geom.PageSize;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IReceptionCompleteService — handles all reception/registration workflows.
///
/// K9 phien (2026-05-30): converted to partial class. ZERO runtime change — partial class.
/// </summary>
public partial class ReceptionCompleteService : IReceptionCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Patient> _patientRepo;
    private readonly IRepository<MedicalRecord> _medicalRecordRepo;
    private readonly IRepository<Examination> _examinationRepo;
    private readonly IRepository<QueueTicket> _queueTicketRepo;
    private readonly IRepository<QueueConfiguration> _queueConfigRepo;
    private readonly IRepository<Room> _roomRepo;
    private readonly IRepository<Department> _departmentRepo;
    private readonly IRepository<User> _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IBhxhGatewayClient _bhxhClient;
    private readonly BhxhGatewayOptions _bhxhOptions;
    private readonly IBhxhGatewaySettingsProvider? _bhxhSettings;
    private readonly ILogger<ReceptionCompleteService>? _receptionLogger;

    public ReceptionCompleteService(
        HISDbContext context,
        IRepository<Patient> patientRepo,
        IRepository<MedicalRecord> medicalRecordRepo,
        IRepository<Examination> examinationRepo,
        IRepository<QueueTicket> queueTicketRepo,
        IRepository<QueueConfiguration> queueConfigRepo,
        IRepository<Room> roomRepo,
        IRepository<Department> departmentRepo,
        IRepository<User> userRepo,
        IUnitOfWork unitOfWork,
        IBhxhGatewayClient bhxhClient,
        IOptions<BhxhGatewayOptions>? bhxhOptions = null,
        ILogger<ReceptionCompleteService>? logger = null,
        IBhxhGatewaySettingsProvider? bhxhSettings = null)
    {
        _bhxhOptions = bhxhOptions?.Value ?? new BhxhGatewayOptions();
        _bhxhSettings = bhxhSettings;
        _receptionLogger = logger;
        _context = context;
        _patientRepo = patientRepo;
        _medicalRecordRepo = medicalRecordRepo;
        _examinationRepo = examinationRepo;
        _queueTicketRepo = queueTicketRepo;
        _queueConfigRepo = queueConfigRepo;
        _roomRepo = roomRepo;
        _departmentRepo = departmentRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _bhxhClient = bhxhClient;
    }








    #region Private Helper Methods


    private async Task<(int Total, int Waiting, int InProgress, int WaitingResult, int Completed, int DoingLab, int InsuranceCount)> GetRoomStatsAsync(Guid roomId, DateTime date)
    {
        // Source of truth for "patients in room today" is MedicalRecord, not
        // Examination. A reception flow creates an MR and assigns it to a
        // room before any examination row exists; the OPD page later spawns
        // Examinations only when the doctor opens the encounter.
        // Status mapping aligns with MedicalRecord.Status:
        //   0=Waiting (chờ tiếp đón) | 1=InProgress (đang khám)
        //   2=WaitingResult (chờ kết quả CLS) | 3=Completed (hoàn thành)
        // AdmissionDate = VN local time (business timestamp convention).
        var (admFromUtc, admToUtc) = HIS.Core.Common.VnTime.DayRangeVn(date);
        var records = await _context.MedicalRecords
            .Where(m => m.RoomId == roomId && m.AdmissionDate >= admFromUtc && m.AdmissionDate < admToUtc)
            .Select(m => new { m.Status, m.PatientType })
            .ToListAsync();

        return (
            Total: records.Count,
            Waiting: records.Count(m => m.Status == 0),
            InProgress: records.Count(m => m.Status == 1),
            WaitingResult: records.Count(m => m.Status == 2),
            Completed: records.Count(m => m.Status == 3),
            DoingLab: records.Count(m => m.Status == 2),
            InsuranceCount: records.Count(m => m.PatientType == 1)
        );
    }

    private async Task<int> CalculateEstimatedWaitAsync(Guid roomId, int queueType)
    {
        // IssueDate = VN local time (business timestamp convention).
        var (ewFromUtc, ewToUtc) = HIS.Core.Common.VnTime.DayRangeVn(HIS.Core.Common.VnTime.TodayVn);

        // Get waiting tickets ahead (status 0=waiting), ordered by priority then queue number
        var waitingTickets = await _context.QueueTickets
            .Where(t => t.RoomId == roomId && t.QueueType == queueType && t.IssueDate >= ewFromUtc && t.IssueDate < ewToUtc && t.Status == 0)
            .ToListAsync();

        if (waitingTickets.Count == 0)
            return 0;

        // Calculate average service time from completed tickets today
        var completedToday = await _context.QueueTickets
            .Where(t => t.RoomId == roomId && t.QueueType == queueType && t.IssueDate >= ewFromUtc && t.IssueDate < ewToUtc
                && t.Status == 3 && t.CalledTime.HasValue && t.CompletedTime.HasValue)
            .Select(t => new { t.CalledTime, t.CompletedTime })
            .ToListAsync();

        double avgMinutesPerPatient;
        if (completedToday.Count >= 3)
        {
            // Use actual average from today's completed tickets
            avgMinutesPerPatient = completedToday
                .Average(t => (t.CompletedTime!.Value - t.CalledTime!.Value).TotalMinutes);
            // Clamp to reasonable range (2-30 min)
            avgMinutesPerPatient = Math.Clamp(avgMinutesPerPatient, 2, 30);
        }
        else
        {
            // Fall back to Service.EstimatedMinutes or default 5 min
            var room = await _context.Rooms
                .Include(r => r.Department)
                .FirstOrDefaultAsync(r => r.Id == roomId);

            if (room != null && queueType == 2) // Examination room
            {
                var avgServiceMinutes = await _context.Services
                    .Where(s => s.ServiceType == 1 && s.EstimatedMinutes > 0 && s.IsActive)
                    .AverageAsync(s => (double?)s.EstimatedMinutes);
                avgMinutesPerPatient = avgServiceMinutes ?? 5;
            }
            else
            {
                avgMinutesPerPatient = 5; // Default 5 min per patient
            }
        }

        // Count tickets ahead, weighting by priority (priority patients served faster)
        var normalCount = waitingTickets.Count(t => t.Priority == 0);
        var priorityCount = waitingTickets.Count(t => t.Priority == 1);
        var emergencyCount = waitingTickets.Count(t => t.Priority == 2);

        // Emergency and priority patients are served first, so they add less wait
        var effectiveCount = normalCount + (priorityCount * 0.7) + (emergencyCount * 0.3);

        return (int)Math.Ceiling(effectiveCount * avgMinutesPerPatient);
    }

    /// <summary>
    /// R3 đa cơ sở: chi nhánh của user thao tác (User.BranchId, fallback Department.BranchId).
    /// Best-effort — NULL = không gắn chi nhánh (behavior cũ), không chặn nghiệp vụ.
    /// </summary>
    private async Task<Guid?> GetUserBranchIdAsync(Guid userId)
    {
        return await _context.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.BranchId ?? (u.Department != null ? u.Department.BranchId : null))
            .FirstOrDefaultAsync();
    }

    /// <summary>
    /// Serializes patient/record/queue-number allocation across ALL registration counters (and app
    /// instances) with a SQL Server application lock held for the transaction.
    ///
    /// <para>Codes are allocated as max+1 (<see cref="GeneratePatientCodeAsync"/>,
    /// <see cref="GenerateMedicalRecordCodeAsync"/>, queue numbers): measured 5 of 6 parallel
    /// registrations failing with 409 on the unique index. The lock makes read-max → insert atomic
    /// without a schema change.</para>
    ///
    /// <para>The lock is taken LAZILY by <see cref="EnsureRegistrationLockAsync"/> at the first code
    /// allocation, so slow work done before it (BHXH card verification, CCCD lookup that decrypts the
    /// Patients table) never holds up other counters. No-op for non-relational providers (unit tests)
    /// or when the caller already runs inside its own transaction.</para>
    /// </summary>
    private async Task<T> WithRegistrationLockAsync<T>(Func<Task<T>> body)
    {
        if (_registrationScopeActive || !_context.Database.IsRelational() || _context.Database.CurrentTransaction != null)
            return await body();

        _registrationScopeActive = true;
        try
        {
            var result = await body();
            if (_registrationTx != null) await _registrationTx.CommitAsync();
            return result;
        }
        finally
        {
            if (_registrationTx != null) await _registrationTx.DisposeAsync(); // rolls back if not committed
            _registrationTx = null;
            _registrationScopeActive = false;
        }
    }

    private bool _registrationScopeActive;
    private Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? _registrationTx;

    /// <summary>
    /// One open outpatient visit per patient per VN day. Records from previous days that nobody closed
    /// do not block. Call again after <see cref="EnsureRegistrationLockAsync"/> so a double-submit racing
    /// past the first check is caught under the lock.
    /// </summary>
    private async Task EnsureNoActiveOutpatientRecordTodayAsync(Guid patientId)
    {
        var (fromUtc, toUtc) = HIS.Core.Common.VnTime.DayRangeVn(HIS.Core.Common.VnTime.TodayVn); // AdmissionDate = VN local
        var existing = await _context.MedicalRecords
            .Where(m => m.PatientId == patientId && m.Status < 3 && m.TreatmentType == 1 && !m.IsDeleted
                        && m.AdmissionDate >= fromUtc && m.AdmissionDate < toUtc)
            .Select(m => m.MedicalRecordCode)
            .FirstOrDefaultAsync();
        if (existing != null)
            throw new InvalidOperationException($"Bệnh nhân đã có hồ sơ khám đang hoạt động (Mã: {existing})");
    }

    /// <summary>Acquire the registration applock (once per registration) right before allocating a code.</summary>
    private async Task EnsureRegistrationLockAsync()
    {
        if (!_registrationScopeActive || _registrationTx != null) return;

        _registrationTx = await _context.Database.BeginTransactionAsync();
        try
        {
            await _context.Database.ExecuteSqlRawAsync(
                "DECLARE @r int; " +
                "EXEC @r = sp_getapplock @Resource = N'HIS.Reception.RegistrationCodes', @LockMode = N'Exclusive', " +
                "@LockOwner = N'Transaction', @LockTimeout = 10000; " +
                "IF @r < 0 THROW 50001, N'registration lock timeout', 1;");
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number == 50001)
        {
            // Surface a clear, retryable business message instead of the generic 500.
            throw new InvalidOperationException(
                "Các quầy tiếp đón khác đang cấp mã cùng lúc, hệ thống chưa cấp được số. Vui lòng bấm Đăng ký lại.");
        }
    }

    /// <summary>
    /// The patient found by CCCD / card number must be the person at the counter. Name compared
    /// accent- and case-insensitively; birth year tolerates ±1 because the v2 wizard derives it from age.
    /// </summary>
    private static void EnsureSamePerson(Patient existing, CreatePatientDto entered)
    {
        static string Norm(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return string.Empty;
            var d = s.Trim().Replace('Đ', 'D').Replace('đ', 'd').Normalize(System.Text.NormalizationForm.FormD);
            var sb = new System.Text.StringBuilder(d.Length);
            foreach (var ch in d)
                if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch) != System.Globalization.UnicodeCategory.NonSpacingMark)
                    sb.Append(char.ToUpperInvariant(ch));
            return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }

        var nameMismatch = !string.IsNullOrEmpty(Norm(entered.FullName))
                           && Norm(entered.FullName) != Norm(existing.FullName);
        var existingYear = existing.YearOfBirth ?? existing.DateOfBirth?.Year;
        var enteredYear = entered.YearOfBirth ?? entered.DateOfBirth?.Year;
        var yearMismatch = existingYear.HasValue && enteredYear.HasValue
                           && Math.Abs(existingYear.Value - enteredYear.Value) > 1;

        if (nameMismatch || yearMismatch)
            throw new InvalidOperationException(
                $"Số CCCD/thẻ đã thuộc bệnh nhân {existing.PatientCode} - {existing.FullName}"
                + (existingYear.HasValue ? $" (sinh {existingYear})" : "")
                + ", không khớp thông tin vừa nhập. Kiểm tra lại số giấy tờ, hoặc tìm và chọn đúng bệnh nhân cũ để đăng ký.");
    }

    private async Task<string> GeneratePatientCodeAsync()
    {
        await EnsureRegistrationLockAsync();
        var today = DateTime.Today;
        var prefix = $"BN{today:yyyyMMdd}";

        // Max NUMERIC suffix với prefix hôm nay. KHÔNG dùng string-max + TryParse một mã duy nhất:
        // mã demo seed BN{date}SEED### lớn hơn mọi mã số theo string order ('S' > digit) → TryParse
        // fail → luôn trả 0001 → trùng UNIQUE KEY từ BN thứ 2 trong ngày (bug bắt 2026-06-12).
        var todayCodes = await _context.Patients
            .IgnoreQueryFilters()
            .Where(p => p.PatientCode.StartsWith(prefix))
            .Select(p => p.PatientCode)
            .ToListAsync();

        var maxNumber = todayCodes
            .Select(c => int.TryParse(c.Substring(prefix.Length), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();

        return $"{prefix}{(maxNumber + 1):D4}";
    }

    private async Task<string> GenerateMedicalRecordCodeAsync()
    {
        await EnsureRegistrationLockAsync();
        var today = DateTime.Today;
        var prefix = $"MR{today:yyyyMMdd}";

        var maxCode = await _context.MedicalRecords
            .Where(m => m.MedicalRecordCode.StartsWith(prefix))
            .OrderByDescending(m => m.MedicalRecordCode)
            .Select(m => m.MedicalRecordCode)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (!string.IsNullOrEmpty(maxCode) && maxCode.Length > prefix.Length)
        {
            if (int.TryParse(maxCode.Substring(prefix.Length), out int currentNumber))
            {
                nextNumber = currentNumber + 1;
            }
        }

        return $"{prefix}{nextNumber:D4}";
    }

    private async Task<string> GenerateDepositReceiptNumberAsync()
    {
        // Deposits.ReceiptDate = VN local time (business timestamp convention).
        var todayVn = HIS.Core.Common.VnTime.TodayVn;
        var (depFromUtc, depToUtc) = HIS.Core.Common.VnTime.DayRangeVn(todayVn);
        var count = await _context.Deposits.CountAsync(d => d.ReceiptDate >= depFromUtc && d.ReceiptDate < depToUtc);
        return $"TU{todayVn:yyyyMMdd}{(count + 1):D4}";
    }

    private async Task<string> GeneratePaymentReceiptNumberAsync()
    {
        // Đếm trên Receipts — sổ phiếu thu chung. Bản cũ đếm trên bảng Payments riêng của tiếp đón
        // nên số biên lai chạy song song, trùng số với phiếu do quầy viện phí phát hành.
        var today = DateTime.Now.Date;
        var count = await _context.Receipts.CountAsync(r => r.ReceiptDate >= today && r.ReceiptDate < today.AddDays(1));
        var code = $"PT{today:yyyyMMdd}{(count + 1):D4}";

        // Hai quầy thu cùng lúc có thể ra cùng số thứ tự -> rơi về mã theo mốc thời gian
        // (đúng định dạng quầy viện phí đang dùng) để không tạo hai biên lai trùng số.
        if (await _context.Receipts.AnyAsync(r => r.ReceiptCode == code))
        {
            code = $"PT{DateTime.Now:yyyyMMddHHmmssfff}";
        }
        return code;
    }

    private QueueTicketDto MapToQueueTicketDto(QueueTicket ticket)
    {
        return new QueueTicketDto
        {
            Id = ticket.Id,
            TicketCode = ticket.TicketNumber,
            QueueNumber = ticket.QueueNumber,
            QueueDate = ticket.IssueDate,
            PatientId = ticket.PatientId,
            PatientCode = ticket.Patient?.PatientCode,
            PatientName = ticket.Patient?.FullName,
            RoomId = ticket.RoomId ?? Guid.Empty,
            RoomName = ticket.Room?.RoomName ?? "",
            QueueType = ticket.QueueType,
            Priority = ticket.Priority,
            // Migration 184: lễ tân cần nhìn thấy vé ưu tiên nào do người bệnh tự khai qua app mà
            // chưa đối chiếu được, để xác minh lúc gọi số.
            PriorityReason = ticket.PriorityReason,
            PriorityVerified = ticket.PriorityVerified,
            Status = ticket.Status,
            CalledCount = 1,
            CalledAt = ticket.CalledTime,
            CompletedAt = ticket.CompletedTime,
            CalledBy = ticket.CalledByUser?.FullName
        };
    }

    private async Task<DocumentHoldDto> MapToDocumentHoldDtoAsync(DocumentHold hold)
    {
        // QA-R4: mapped to the v2 screen's contract (int documentType/status + names + hold duration).
        var patient = await _context.Patients.AsNoTracking()
            .Where(p => p.Id == hold.PatientId)
            .Select(p => new { p.PatientCode, p.FullName })
            .FirstOrDefaultAsync();
        var recordCode = hold.MedicalRecordId.HasValue
            ? await _context.MedicalRecords.AsNoTracking()
                .Where(m => m.Id == hold.MedicalRecordId.Value)
                .Select(m => m.MedicalRecordCode)
                .FirstOrDefaultAsync()
            : null;
        var endOfHold = hold.ReturnDate ?? HIS.Core.Common.VnTime.NowVn;

        return new DocumentHoldDto
        {
            Id = hold.Id,
            PatientId = hold.PatientId,
            AdmissionId = hold.MedicalRecordId ?? Guid.Empty,
            MedicalRecordId = hold.MedicalRecordId,
            PatientCode = patient?.PatientCode ?? "",
            PatientName = patient?.FullName ?? "",
            MedicalRecordCode = recordCode,
            DocumentType = hold.DocumentType,
            DocumentTypeName = GetDocumentTypeName(hold.DocumentType),
            DocumentNumber = hold.DocumentNumber ?? "",
            DocumentDescription = hold.DocumentDescription ?? hold.Description,
            Quantity = hold.Quantity > 0 ? hold.Quantity : 1,
            Status = hold.Status,
            // 1 = đang giữ, 2 = đã trả — the numbering the existing rows use (see ReceptionCompleteService.PhotosDocs).
            StatusName = hold.Status switch { 1 => "Đang giữ", 2 => "Đã trả", 3 => "Thất lạc", _ => "Không xác định" },
            HoldDate = hold.HoldDate,
            HoldBy = hold.HoldBy ?? "",
            HoldNotes = hold.HoldNotes ?? hold.Notes,
            ReturnDate = hold.ReturnDate,
            ReturnBy = hold.ReturnBy,
            ReturnNotes = hold.ReturnNotes,
            ReturnToPersonName = hold.ReturnToPersonName,
            ReturnToPersonPhone = hold.ReturnToPersonPhone,
            ReturnToPersonRelation = hold.ReturnToPersonRelation,
            HoldDurationDays = Math.Max(0, (int)(endOfHold.Date - hold.HoldDate.Date).TotalDays),
            CreatedAt = hold.CreatedAt,
            CreatedBy = hold.CreatedBy
        };
    }

    /// <summary>
    /// Minimal identity sanity checks before a NEW patient record is created at reception.
    /// Without them the API accepted an empty name, a date of birth in the future and a birth year
    /// of 1800 — records that cannot be matched to a real person later.
    /// </summary>
    private static void ValidateNewPatient(CreatePatientDto p, bool checkFormats = true)
    {
        if (string.IsNullOrWhiteSpace(p.FullName))
            throw new ArgumentException("Chưa nhập họ tên bệnh nhân", nameof(p.FullName));

        var todayVn = HIS.Core.Common.VnTime.TodayVn;
        if (p.DateOfBirth.HasValue && p.DateOfBirth.Value.Date > todayVn)
            throw new ArgumentException("Ngày sinh không được ở tương lai", nameof(p.DateOfBirth));
        // QA-R6: 1800-01-01 / 0001-01-01 dates of birth were accepted (only YearOfBirth had a lower bound).
        if (p.DateOfBirth.HasValue && p.DateOfBirth.Value.Year < 1900)
            throw new ArgumentException($"Ngày sinh không hợp lệ ({p.DateOfBirth.Value:dd/MM/yyyy})", nameof(p.DateOfBirth));
        if (p.YearOfBirth.HasValue && (p.YearOfBirth.Value < 1900 || p.YearOfBirth.Value > todayVn.Year))
            throw new ArgumentException($"Năm sinh không hợp lệ ({p.YearOfBirth.Value})", nameof(p.YearOfBirth));
        if (p.Gender < 0 || p.Gender > 3)
            throw new ArgumentException($"Giới tính không hợp lệ ({p.Gender})", nameof(p.Gender));
        if (checkFormats) ValidatePatientFormats(p);
    }

    /// <summary>
    /// QA-R6: same format rules as the patient-master API (PatientService.ValidatePatientAsync) — reception
    /// created patients with CCCD "12345abc9012" and phone "12", which no later lookup can match. Only for a
    /// patient actually being CREATED: an existing patient re-registered with legacy values must not be blocked.
    /// </summary>
    private static void ValidatePatientFormats(CreatePatientDto p)
    {
        if (!string.IsNullOrWhiteSpace(p.PhoneNumber))
        {
            var digits = p.PhoneNumber.Count(char.IsDigit);
            if (digits < 9 || digits > 12)
                throw new ArgumentException("Số điện thoại không hợp lệ", nameof(p.PhoneNumber));
        }
        if (!string.IsNullOrWhiteSpace(p.IdentityNumber))
        {
            var cccd = p.IdentityNumber.Trim();
            if (!cccd.All(char.IsDigit) || (cccd.Length != 9 && cccd.Length != 12))
                throw new ArgumentException("CCCD/CMND phải gồm 9 hoặc 12 chữ số", nameof(p.IdentityNumber));
        }
    }

    private AdmissionDto MapToAdmissionDto(MedicalRecord record, Patient patient, Room? room, QueueTicketDto? ticket)
    {
        return new AdmissionDto
        {
            Id = record.Id,
            AdmissionCode = record.MedicalRecordCode,
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            DateOfBirth = patient.DateOfBirth,
            YearOfBirth = patient.YearOfBirth,
            Gender = patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nữ" : "Khác",
            Address = patient.Address ?? "",
            PhoneNumber = patient.PhoneNumber ?? "",
            IdentityNumber = patient.IdentityNumber ?? "",
            InsuranceNumber = record.InsuranceNumber ?? "",
            AdmissionDate = record.AdmissionDate,
            DepartmentId = room?.DepartmentId ?? Guid.Empty,
            DepartmentName = room?.Department?.DepartmentName ?? "",
            RoomId = room?.Id,
            RoomName = room?.RoomName ?? "",
            Status = record.Status == 0 ? "Waiting" : record.Status == 1 ? "InProgress" : "Completed",
            QueueNumber = ticket?.QueueNumber ?? 0,
            QueueCode = ticket?.TicketCode ?? "",
            Priority = ticket?.Priority ?? 0,
            IsEmergency = record.TreatmentType == 3,
            IsPriority = (ticket?.Priority ?? 0) > 0,
            CreatedDate = record.CreatedAt,
            // QA-R3: registration responses returned patientType/treatmentType 0 and no examinationId.
            PatientType = record.PatientType,
            TreatmentType = record.TreatmentType,
            ExaminationId = record.Examinations?
                .Where(e => !e.IsDeleted)
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => (Guid?)e.Id)
                .FirstOrDefault(),
        };
    }

    private string GetDocumentTypeName(int documentType)
    {
        return documentType switch
        {
            1 => "CCCD/CMND",
            2 => "Thẻ BHYT",
            3 => "Giấy giới thiệu",
            4 => "Giấy chuyển viện",
            _ => "Giấy tờ khác"
        };
    }

    #endregion
}
