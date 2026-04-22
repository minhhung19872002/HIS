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

    public async Task<MultiRoomRegistrationResultDto> RegisterMultipleRoomsAsync(
        MultiRoomRegistrationDto dto, Guid userId)
    {
        if (dto.RoomIds.Count == 0)
            throw new ArgumentException("Phải chọn ít nhất 1 phòng khám");

        if (dto.PatientType == 1 && dto.RoomIds.Count > 1)
            throw new InvalidOperationException(
                "Bệnh nhân BHYT không được đăng ký nhiều phòng cùng lúc. Chỉ áp dụng cho thu phí/dịch vụ.");

        var rooms = await _db.Rooms
            .Where(r => dto.RoomIds.Contains(r.Id))
            .ToListAsync();
        if (rooms.Count != dto.RoomIds.Count)
            throw new ArgumentException("Một hoặc nhiều phòng không tồn tại");

        var record = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = $"HS{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = dto.PatientId,
            AdmissionDate = DateTime.Now,
            PatientType = dto.PatientType,
            TreatmentType = 1,
            InsuranceNumber = dto.InsuranceNumber,
            InitialDiagnosis = dto.InitialDiagnosis,
            Status = 0,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        _db.MedicalRecords.Add(record);

        var examinations = new List<Examination>();
        var queueBase = await _db.Examinations
            .Where(e => e.CreatedAt.Date == DateTime.Today)
            .MaxAsync(e => (int?)e.QueueNumber) ?? 0;

        for (int i = 0; i < rooms.Count; i++)
        {
            var room = rooms[i];
            var exam = new Examination
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                ExaminationType = i == 0 ? 1 : 3,
                QueueNumber = queueBase + i + 1,
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

        if (parent.Status == 4 && parent.IsBillPrinted)
            throw new InvalidOperationException(
                "Phiên khám gốc đã in chi phí. Không thể thêm khám CK khác. Hãy hủy in chi phí trước.");

        var room = await _db.Rooms.FindAsync(dto.RoomId)
            ?? throw new KeyNotFoundException("Phòng khám không tồn tại");

        var queueBase = await _db.Examinations
            .Where(e => e.CreatedAt.Date == DateTime.Today)
            .MaxAsync(e => (int?)e.QueueNumber) ?? 0;

        var child = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = parent.MedicalRecordId,
            ParentExaminationId = parent.Id,
            ExaminationType = 2,
            QueueNumber = queueBase + 1,
            DepartmentId = room.DepartmentId,
            RoomId = room.Id,
            Status = 0,
            ChiefComplaint = dto.Reason,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        _db.Examinations.Add(child);
        await _db.SaveChangesAsync();

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
        var chain = await _db.Examinations
            .Where(e => e.MedicalRecordId == exam.MedicalRecordId)
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
        exam.BillPrintedAt = DateTime.UtcNow;
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
        if (exam.IsBillPrinted)
            throw new InvalidOperationException("Phải hủy in chi phí trước khi hủy hoàn tất");

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
