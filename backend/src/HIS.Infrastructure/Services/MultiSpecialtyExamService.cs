using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public class MultiSpecialtyExamService : IMultiSpecialtyExamService
{
    private readonly HISDbContext _db;
    private readonly ILogger<MultiSpecialtyExamService> _logger;

    public MultiSpecialtyExamService(HISDbContext db, ILogger<MultiSpecialtyExamService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// QA-R11: exams added here (reception "phòng khám thêm", OPD "khám CK khác") got NO queue ticket and a
    /// QueueNumber = max over ALL rooms today + 1. The patient never appeared on the room's call board / call-next,
    /// and the printed STT collided with the room's own sequence (two people holding "5" in one room). Issue a
    /// real ticket from the room's shared sequence (same allocator as reception and online booking).
    /// Caller holds the registration app lock.
    /// </summary>
    private async Task<int> IssueExamTicketAsync(Guid patientId, Guid medicalRecordId, Room room)
    {
        const int examQueue = AppointmentQueueAllocator.ExamQueueType;
        var number = await AppointmentQueueAllocator.NextNumberAsync(_db, room.Id, HIS.Core.Common.VnTime.TodayVn, examQueue);
        var prefix = await AppointmentQueueAllocator.GetPrefixAsync(_db, room.Id, examQueue);
        _db.QueueTickets.Add(new QueueTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = AppointmentQueueAllocator.FormatCode(prefix, number),
            QueueNumber = number,
            IssueDate = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local
            QueueType = examQueue,
            Status = HIS.Core.Constants.QueueTicketStatus.Waiting,
            PatientId = patientId,
            MedicalRecordId = medicalRecordId,
            RoomId = room.Id,
            BranchId = room.BranchId,
            Notes = "MultiSpecialty",
            CreatedAt = DateTime.UtcNow,
        });
        return number;
    }

    public async Task<MultiRoomRegistrationResultDto> RegisterMultipleRoomsAsync(
        MultiRoomRegistrationDto dto, Guid userId)
    {
        if (dto.RoomIds.Count == 0)
            throw new ArgumentException("Phải chọn ít nhất 1 phòng khám");

        if (dto.PatientType == 1 && dto.RoomIds.Count > 1)
            throw new InvalidOperationException(
                "Bệnh nhân BHYT không được đăng ký nhiều phòng cùng lúc. Chỉ áp dụng cho thu phí/dịch vụ.");

        // Unknown patient used to surface as an FK violation (HTTP 500).
        if (!await _db.Patients.AnyAsync(p => p.Id == dto.PatientId))
            throw new KeyNotFoundException("Không tìm thấy bệnh nhân");

        var roomIds = dto.RoomIds.Distinct().ToList();
        var roomsById = await _db.Rooms
            .Where(r => roomIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id);
        if (roomsById.Count != roomIds.Count)
            throw new ArgumentException("Một hoặc nhiều phòng không tồn tại");
        // Keep the caller's order: the first selected room is the primary exam (ExaminationType 1).
        // SQL returned rooms in arbitrary order, so a secondary room could become the primary.
        var rooms = roomIds.Select(id => roomsById[id]).ToList();

        // Serialize with reception/booking number allocation (same resource) until the tickets are committed.
        await using var tx = await SqlAppLock.BeginAsync(_db);
        await SqlAppLock.AcquireAsync(_db, "HIS.Reception.RegistrationCodes",
            "Các quầy khác đang cấp số, vui lòng thử lại.");

        // QA-R4 (R1 item 4 "khám đa phòng tạo hồ sơ thứ 2"): the reception wizard registers the primary
        // room first (RegisterFeePatient → one MedicalRecord) and then calls this for the extra rooms.
        // Creating a second record here split ONE visit into two records (two admissions, two bills, and
        // the duplicate-registration guard tripping on the wrong code — reproduced live). Attach the extra
        // exams to today's open outpatient record when there is one.
        var (todayFromUtc, todayToUtc) = HIS.Core.Common.VnTime.DayRangeVn(HIS.Core.Common.VnTime.TodayVn);
        var record = await _db.MedicalRecords.FirstOrDefaultAsync(m =>
            m.PatientId == dto.PatientId && m.Status < 3 && m.TreatmentType == 1 && !m.IsDeleted
            && m.AdmissionDate >= todayFromUtc && m.AdmissionDate < todayToUtc);
        var reuseRecord = record != null;

        if (record == null)
        {
            record = new MedicalRecord
            {
                Id = Guid.NewGuid(),
                MedicalRecordCode = $"HS{DateTime.Now:yyyyMMddHHmmssff}", // QA-R11: 2 submits in one second collided
                RoomId = rooms[0].Id, // QA-R11: was null — today's-admissions / change-room read the record's room
                PatientId = dto.PatientId,
                AdmissionDate = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local
                PatientType = dto.PatientType,
                TreatmentType = 1,
                InsuranceNumber = dto.InsuranceNumber,
                InitialDiagnosis = dto.InitialDiagnosis,
                Status = 0,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId.ToString()
            };
            _db.MedicalRecords.Add(record);
        }
        else
        {
            // Rooms already on this visit are skipped, so a double-submit does not queue the patient twice.
            var roomsOnVisit = await _db.Examinations
                .Where(e => e.MedicalRecordId == record.Id && !e.IsDeleted && e.Status != 5)
                .Select(e => e.RoomId)
                .ToListAsync();
            rooms = rooms.Where(r => !roomsOnVisit.Contains(r.Id)).ToList();
            if (rooms.Count == 0)
                throw new InvalidOperationException(
                    $"Bệnh nhân đã được đăng ký vào (các) phòng này trong lượt khám hôm nay (Mã: {record.MedicalRecordCode})");
        }

        var examinations = new List<Examination>();

        for (int i = 0; i < rooms.Count; i++)
        {
            var room = rooms[i];
            var exam = new Examination
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                // On an existing visit every room here is an additional exam; the primary already exists.
                ExaminationType = !reuseRecord && i == 0 ? 1 : 3,
                QueueNumber = await IssueExamTicketAsync(dto.PatientId, record.Id, room),
                DepartmentId = room.DepartmentId,
                RoomId = room.Id,
                Status = 0,
                ChiefComplaint = dto.ChiefComplaint,
                InitialDiagnosis = dto.InitialDiagnosis,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId.ToString()
            };
            examinations.Add(exam);
            _db.Examinations.Add(exam);
        }

        await _db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        return new MultiRoomRegistrationResultDto
        {
            MedicalRecordId = record.Id,
            MedicalRecordCode = record.MedicalRecordCode,
            Examinations = examinations.Select(e => new RegisteredExamDto
            {
                ExaminationId = e.Id,
                RoomId = e.RoomId,
                RoomName = rooms.First(r => r.Id == e.RoomId).RoomName,
                QueueNumber = e.QueueNumber,
                Status = e.Status
            }).ToList()
        };
    }

    public async Task<RegisteredExamDto> AddFollowUpSpecialtyAsync(
        AddFollowUpSpecialtyDto dto, Guid userId)
    {
        var parent = await _db.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == dto.ParentExaminationId)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên khám gốc");

        if (parent.Status == 5)
            throw new InvalidOperationException("Phiên khám gốc đã hủy — không thêm khám CK khác được.");
        // The BHYT summary bill is printed on the LAST exam of the chain, not necessarily the parent:
        // checking only parent.IsBillPrinted let a new exam join a chain whose bill was already printed.
        if (await _db.Examinations.AnyAsync(e => e.MedicalRecordId == parent.MedicalRecordId && e.IsBillPrinted))
            throw new InvalidOperationException(
                "Chuỗi khám của hồ sơ này đã in chi phí. Không thể thêm khám CK khác. Hãy hủy in chi phí trước.");

        var room = await _db.Rooms.FindAsync(dto.RoomId)
            ?? throw new KeyNotFoundException("Phòng khám không tồn tại");

        await using var tx = await SqlAppLock.BeginAsync(_db);
        await SqlAppLock.AcquireAsync(_db, "HIS.Reception.RegistrationCodes",
            "Các quầy khác đang cấp số, vui lòng thử lại.");
        var queueNumber = await IssueExamTicketAsync(parent.MedicalRecord.PatientId, parent.MedicalRecordId, room);

        var child = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = parent.MedicalRecordId,
            ParentExaminationId = parent.Id,
            ExaminationType = 2,
            QueueNumber = queueNumber,
            DepartmentId = room.DepartmentId,
            RoomId = room.Id,
            Status = 0,
            ChiefComplaint = dto.Reason,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        _db.Examinations.Add(child);
        await _db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        return new RegisteredExamDto
        {
            ExaminationId = child.Id,
            RoomId = child.RoomId,
            RoomName = room.RoomName,
            QueueNumber = child.QueueNumber,
            Status = child.Status
        };
    }

    public async Task<RegisteredExamDto> ChangeRoomBeforeExamAsync(
        ChangeRoomBeforeExamDto dto, Guid userId)
    {
        var exam = await _db.Examinations.FirstOrDefaultAsync(e => e.Id == dto.ExaminationId)
            ?? throw new KeyNotFoundException("Phiên khám không tồn tại");

        if (exam.Status != 0)
            throw new InvalidOperationException(
                "Chỉ được đổi phòng khi BN chưa vào phòng (status = Chờ khám). " +
                "Nếu đã vào phòng và có chỉ định thì phải làm quy trình ngược.");

        var room = await _db.Rooms.FindAsync(dto.NewRoomId)
            ?? throw new KeyNotFoundException("Phòng mới không tồn tại");

        // QA-R11: only the exam moved — the patient's queue ticket stayed on the OLD room's call list (called in a
        // room they no longer belong to, invisible on the new room's board) and, once the visit was cancelled, that
        // orphan ticket blocked re-registering the patient in the old room for the rest of the day. Move the open
        // ticket(s) and, for the primary exam, the record's room with it (same as reception change-room).
        var oldRoomId = exam.RoomId;
        var openTickets = await _db.QueueTickets
            .Where(t => t.MedicalRecordId == exam.MedicalRecordId && t.RoomId == oldRoomId && !t.IsDeleted
                        && t.Status < HIS.Core.Constants.QueueTicketStatus.Completed)
            .ToListAsync();
        foreach (var t in openTickets)
        {
            t.RoomId = room.Id;
            t.Status = HIS.Core.Constants.QueueTicketStatus.Waiting;
        }
        var record = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == exam.MedicalRecordId);
        if (record != null && record.RoomId == oldRoomId) record.RoomId = room.Id;

        exam.RoomId = room.Id;
        exam.DepartmentId = room.DepartmentId;
        exam.UpdatedAt = DateTime.UtcNow;
        exam.UpdatedBy = userId.ToString();
        if (!string.IsNullOrWhiteSpace(dto.Reason))
            exam.ChiefComplaint = $"{exam.ChiefComplaint} | Đổi phòng: {dto.Reason}";

        await _db.SaveChangesAsync();

        return new RegisteredExamDto
        {
            ExaminationId = exam.Id,
            RoomId = exam.RoomId,
            RoomName = room.RoomName,
            QueueNumber = exam.QueueNumber,
            Status = exam.Status
        };
    }

    public async Task<ExamCompletionStatusDto> GetCompletionStatusAsync(Guid examinationId)
    {
        var exam = await _db.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId)
            ?? throw new KeyNotFoundException("Phiên khám không tồn tại");

        // Chain = tất cả examinations cùng MedicalRecord (same day)
        // Cancelled exams (Status 5) are not part of the chain — they used to block the BHYT bill forever.
        var chain = await _db.Examinations
            .Where(e => e.MedicalRecordId == exam.MedicalRecordId && (e.Status != 5 || e.Id == exam.Id))
            .ToListAsync();

        var completedCount = chain.Count(e => e.Status == 4);

        // BHYT rule: chỉ phiên cuối cùng hoàn tất mới được in bảng kê tổng hợp.
        // "Phiên cuối" = phiên khám có Status=4 mà TẤT CẢ các phiên khác trong chain đều đã Status=4
        var allCompleted = chain.All(e => e.Status == 4);
        var patientType = exam.MedicalRecord?.PatientType ?? 2;
        var canPrint = exam.Status == 4
            && (patientType != 1 || allCompleted);
        string? blockReason = null;
        if (exam.Status != 4)
            blockReason = "Phiên khám chưa hoàn tất";
        else if (patientType == 1 && !allCompleted)
            blockReason = $"BHYT: còn {chain.Count - completedCount} phiên khám chưa hoàn tất trong chuỗi. Chỉ được in bảng kê ở phiên cuối cùng.";

        return new ExamCompletionStatusDto
        {
            ExaminationId = exam.Id,
            IsCompleted = exam.Status == 4,
            IsBillPrinted = exam.IsBillPrinted,
            CompletedAt = exam.Status == 4 ? exam.UpdatedAt ?? exam.CreatedAt : null,
            BillPrintedAt = exam.BillPrintedAt,
            CanPrintBill = canPrint && !exam.IsBillPrinted,
            BlockReason = blockReason,
            TotalExamsInChain = chain.Count,
            CompletedExamsInChain = completedCount
        };
    }

    public async Task<ExamCompletionStatusDto> PrintBillAsync(Guid examinationId, Guid userId)
    {
        var status = await GetCompletionStatusAsync(examinationId);
        if (!status.CanPrintBill)
            throw new InvalidOperationException(status.BlockReason ?? "Không thể in chi phí");

        var exam = await _db.Examinations.FirstAsync(e => e.Id == examinationId);
        exam.IsBillPrinted = true;
        exam.BillPrintedAt = HIS.Core.Common.VnTime.NowVn;
        exam.BillPrintedBy = userId;
        exam.UpdatedAt = DateTime.UtcNow;
        exam.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return await GetCompletionStatusAsync(examinationId);
    }

    public async Task<ExamCompletionStatusDto> CancelPrintBillAsync(Guid examinationId, Guid userId)
    {
        var exam = await _db.Examinations.FirstOrDefaultAsync(e => e.Id == examinationId)
            ?? throw new KeyNotFoundException("Phiên khám không tồn tại");
        if (!exam.IsBillPrinted)
            throw new InvalidOperationException("Phiên khám chưa in chi phí");
        exam.IsBillPrinted = false;
        exam.BillPrintedAt = null;
        exam.BillPrintedBy = null;
        exam.UpdatedAt = DateTime.UtcNow;
        exam.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} cancelled bill print for exam {ExamId}", userId, examinationId);
        return await GetCompletionStatusAsync(examinationId);
    }

    public async Task<ExamCompletionStatusDto> CancelCompletionAsync(Guid examinationId, Guid userId)
    {
        var exam = await _db.Examinations.FirstOrDefaultAsync(e => e.Id == examinationId)
            ?? throw new KeyNotFoundException("Phiên khám không tồn tại");
        if (exam.Status != 4)
            throw new InvalidOperationException("Phiên khám chưa hoàn tất");
        if (await _db.Examinations.AnyAsync(e => e.MedicalRecordId == exam.MedicalRecordId && e.IsBillPrinted))
            throw new InvalidOperationException("Phải hủy in chi phí (của chuỗi khám) trước khi hủy hoàn tất");

        exam.Status = 1;
        exam.UpdatedAt = DateTime.UtcNow;
        exam.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} cancelled completion for exam {ExamId}", userId, examinationId);
        return await GetCompletionStatusAsync(examinationId);
    }

    public async Task<bool> DeleteRegistrationAsync(DeleteRegistrationDto dto, Guid userId)
    {
        var exam = await _db.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId)
            ?? throw new KeyNotFoundException("Phiên khám không tồn tại");

        if (exam.Status != 0)
            throw new InvalidOperationException(
                "Chỉ xóa được khi BN chưa vào phòng khám. BN đã khám hoặc có chỉ định phải làm quy trình ngược.");

        // Check children (khám thêm CK khác) — không xóa nếu có phiên con
        var hasChildren = await _db.Examinations.AnyAsync(e => e.ParentExaminationId == exam.Id);
        if (hasChildren)
            throw new InvalidOperationException("Phiên khám có con (khám thêm CK khác). Xóa các phiên con trước.");

        exam.IsDeleted = true;
        exam.UpdatedAt = DateTime.UtcNow;
        exam.UpdatedBy = userId.ToString();

        // QA-R11: the room's waiting ticket survived the deletion — the patient was still called there, and the
        // live ticket blocked registering them in that room again today ("đã có số thứ tự … tại phòng này").
        var openTickets = await _db.QueueTickets
            .Where(t => t.MedicalRecordId == exam.MedicalRecordId && t.RoomId == exam.RoomId && !t.IsDeleted
                        && t.Status < HIS.Core.Constants.QueueTicketStatus.Completed)
            .ToListAsync();
        foreach (var t in openTickets) t.Status = HIS.Core.Constants.QueueTicketStatus.Skipped;

        // Nếu đây là phiên khám chính duy nhất → soft-delete cả MedicalRecord
        var siblingCount = await _db.Examinations
            .CountAsync(e => e.MedicalRecordId == exam.MedicalRecordId && !e.IsDeleted && e.Id != exam.Id);
        if (siblingCount == 0 && exam.MedicalRecord != null)
        {
            exam.MedicalRecord.IsDeleted = true;
            exam.MedicalRecord.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation(
            "User {UserId} deleted registration {ExamId}. Reason: {Reason}",
            userId, exam.Id, dto.Reason);
        return true;
    }
}
