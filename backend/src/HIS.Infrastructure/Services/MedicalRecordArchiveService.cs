using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class MedicalRecordArchiveService : IMedicalRecordArchiveService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<MedicalRecordArchiveService> _logger;

    public MedicalRecordArchiveService(HISDbContext context, IUnitOfWork unitOfWork, ILogger<MedicalRecordArchiveService> logger)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<PagedArchiveResult> SearchArchivesAsync(ArchiveSearchDto search)
    {
        var query = _context.MedicalRecordArchives
            .Include(a => a.MedicalRecord)
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.ArchivedBy)
            .Include(a => a.BorrowRequests)
            .Where(a => !a.IsDeleted)
            .AsQueryable();

        if (search.Status.HasValue)
            query = query.Where(a => a.Status == search.Status.Value);
        if (search.ArchiveYear.HasValue)
            query = query.Where(a => a.ArchiveYear == search.ArchiveYear.Value);
        if (search.DepartmentId.HasValue)
            query = query.Where(a => a.DepartmentId == search.DepartmentId.Value);
        if (!string.IsNullOrWhiteSpace(search.Keyword))
        {
            var kw = search.Keyword.Trim().ToLower();
            query = query.Where(a =>
                a.ArchiveCode.ToLower().Contains(kw) ||
                a.Patient.FullName.ToLower().Contains(kw) ||
                a.Patient.PatientCode.ToLower().Contains(kw) ||
                (a.Diagnosis != null && a.Diagnosis.ToLower().Contains(kw)));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.ArchivedDate ?? a.CreatedAt)
            .Skip((search.Page - 1) * search.PageSize)
            .Take(search.PageSize)
            .ToListAsync();

        return new PagedArchiveResult
        {
            TotalCount = total,
            Items = items.Select(MapToDto).ToList()
        };
    }

    public async Task<ArchiveDto> CreateArchiveAsync(CreateArchiveDto dto, Guid userId)
    {
        var record = await _context.MedicalRecords
            .Include(r => r.Patient)
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == dto.MedicalRecordId && !r.IsDeleted);

        if (record == null) throw new Exception("Không tìm thấy hồ sơ bệnh án");

        // Check existing archive
        var existing = await _context.MedicalRecordArchives
            .AnyAsync(a => a.MedicalRecordId == dto.MedicalRecordId && !a.IsDeleted);
        if (existing) throw new Exception("Hồ sơ đã được lưu trữ");

        var archive = new MedicalRecordArchive
        {
            Id = Guid.NewGuid(),
            ArchiveCode = $"LT{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}",
            MedicalRecordId = dto.MedicalRecordId,
            PatientId = record.PatientId,
            DepartmentId = record.DepartmentId,
            Diagnosis = null, // Populated from examination if available
            StorageLocation = dto.StorageLocation,
            ShelfNumber = dto.ShelfNumber,
            BoxNumber = dto.BoxNumber,
            Status = 1, // Đã lưu
            ArchivedDate = DateTime.UtcNow,
            ArchivedById = userId,
            ArchiveYear = DateTime.Now.Year,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        await _context.MedicalRecordArchives.AddAsync(archive);
        await _unitOfWork.SaveChangesAsync();

        return await GetArchiveByIdAsync(archive.Id);
    }

    public async Task<ArchiveDto> UpdateArchiveLocationAsync(Guid archiveId, UpdateArchiveLocationDto dto, Guid userId)
    {
        var archive = await _context.MedicalRecordArchives.FindAsync(archiveId);
        if (archive == null) throw new Exception("Không tìm thấy hồ sơ lưu trữ");

        archive.StorageLocation = dto.StorageLocation ?? archive.StorageLocation;
        archive.ShelfNumber = dto.ShelfNumber ?? archive.ShelfNumber;
        archive.BoxNumber = dto.BoxNumber ?? archive.BoxNumber;
        archive.UpdatedAt = DateTime.UtcNow;
        archive.UpdatedBy = userId.ToString();

        await _unitOfWork.SaveChangesAsync();
        return await GetArchiveByIdAsync(archive.Id);
    }

    public async Task<List<ArchiveDto>> AutoArchiveCompletedRecordsAsync(int inactiveDays, Guid userId)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-inactiveDays);

        // Tìm hồ sơ hoàn thành > N ngày chưa lưu trữ
        var records = await _context.MedicalRecords
            .Include(r => r.Patient)
            .Where(r => !r.IsDeleted && r.Status == 4) // Hoàn thành
            .Where(r => r.UpdatedAt < cutoffDate || (r.UpdatedAt == null && r.CreatedAt < cutoffDate))
            .Where(r => !_context.MedicalRecordArchives.Any(a => a.MedicalRecordId == r.Id && !a.IsDeleted))
            .Take(50)
            .ToListAsync();

        var archived = new List<ArchiveDto>();
        foreach (var record in records)
        {
            var archive = new MedicalRecordArchive
            {
                Id = Guid.NewGuid(),
                ArchiveCode = $"LT{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}",
                MedicalRecordId = record.Id,
                PatientId = record.PatientId,
                DepartmentId = record.DepartmentId,
                Diagnosis = null, // Populated from examination if available
                Status = 0, // Chờ lưu (auto-archive cần duyệt)
                ArchiveYear = DateTime.Now.Year,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId.ToString()
            };
            await _context.MedicalRecordArchives.AddAsync(archive);
        }

        if (records.Any())
        {
            await _unitOfWork.SaveChangesAsync();
            foreach (var record in records)
            {
                var dto = await GetArchiveByIdAsync(
                    await _context.MedicalRecordArchives
                        .Where(a => a.MedicalRecordId == record.Id && !a.IsDeleted)
                        .Select(a => a.Id)
                        .FirstAsync());
                archived.Add(dto);
            }
        }

        return archived;
    }

    public async Task<BorrowRequestDto> CreateBorrowRequestAsync(CreateArchiveBorrowDto dto, Guid userId)
    {
        var archive = await _context.MedicalRecordArchives.FindAsync(dto.MedicalRecordArchiveId);
        if (archive == null) throw new Exception("Không tìm thấy hồ sơ lưu trữ");
        if (archive.Status == 2) throw new Exception("Hồ sơ đang được mượn");

        var request = new MedicalRecordBorrowRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"PM{DateTime.Now:yyyyMMddHHmmss}",
            MedicalRecordArchiveId = dto.MedicalRecordArchiveId,
            RequestedById = userId,
            RequestDate = DateTime.UtcNow,
            Purpose = dto.Purpose,
            ExpectedReturnDate = dto.ExpectedReturnDate,
            Status = 0, // Chờ duyệt
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        await _context.MedicalRecordBorrowRequests.AddAsync(request);
        await _unitOfWork.SaveChangesAsync();

        return await GetBorrowRequestByIdAsync(request.Id);
    }

    public async Task<BorrowRequestDto> ApproveBorrowRequestAsync(Guid requestId, bool approve, string? rejectReason, Guid userId)
    {
        var request = await _context.MedicalRecordBorrowRequests.FindAsync(requestId);
        if (request == null) throw new Exception("Không tìm thấy phiếu mượn");

        request.Status = approve ? 1 : 2; // 1=Đã duyệt, 2=Từ chối
        request.ApprovedById = userId;
        request.ApprovedDate = DateTime.UtcNow;
        request.RejectReason = approve ? null : rejectReason;
        request.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return await GetBorrowRequestByIdAsync(request.Id);
    }

    public async Task<BorrowRequestDto> RecordBorrowAsync(Guid requestId, Guid userId)
    {
        var request = await _context.MedicalRecordBorrowRequests
            .Include(r => r.MedicalRecordArchive)
            .FirstOrDefaultAsync(r => r.Id == requestId);
        if (request == null) throw new Exception("Không tìm thấy phiếu mượn");
        if (request.Status != 1) throw new Exception("Phiếu mượn chưa được duyệt");

        request.Status = 3; // Đang mượn
        request.BorrowedDate = DateTime.UtcNow;
        request.MedicalRecordArchive.Status = 2; // Đang mượn
        request.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return await GetBorrowRequestByIdAsync(request.Id);
    }

    public async Task<BorrowRequestDto> RecordReturnAsync(Guid requestId, Guid userId)
    {
        var request = await _context.MedicalRecordBorrowRequests
            .Include(r => r.MedicalRecordArchive)
            .FirstOrDefaultAsync(r => r.Id == requestId);
        if (request == null) throw new Exception("Không tìm thấy phiếu mượn");
        if (request.Status != 3) throw new Exception("Phiếu mượn chưa được giao");

        request.Status = 4; // Đã trả
        request.ReturnedDate = DateTime.UtcNow;
        request.MedicalRecordArchive.Status = 1; // Đã lưu (trả về kho)
        request.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return await GetBorrowRequestByIdAsync(request.Id);
    }

    public async Task<List<BorrowRequestDto>> GetBorrowRequestsAsync(Guid? archiveId, int? status)
    {
        var query = _context.MedicalRecordBorrowRequests
            .Include(r => r.MedicalRecordArchive).ThenInclude(a => a.Patient)
            .Include(r => r.RequestedBy)
            .Include(r => r.ApprovedBy)
            .Where(r => !r.IsDeleted)
            .AsQueryable();

        if (archiveId.HasValue)
            query = query.Where(r => r.MedicalRecordArchiveId == archiveId.Value);
        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        var requests = await query.OrderByDescending(r => r.RequestDate).Take(100).ToListAsync();
        return requests.Select(MapToBorrowDto).ToList();
    }

    public async Task<List<BorrowRequestDto>> GetOverdueBorrowsAsync()
    {
        var today = DateTime.Today;
        var overdue = await _context.MedicalRecordBorrowRequests
            .Include(r => r.MedicalRecordArchive).ThenInclude(a => a.Patient)
            .Include(r => r.RequestedBy)
            .Where(r => !r.IsDeleted && r.Status == 3 && r.ExpectedReturnDate < today)
            .OrderBy(r => r.ExpectedReturnDate)
            .ToListAsync();

        return overdue.Select(MapToBorrowDto).ToList();
    }

    public async Task<ArchiveStatsDto> GetArchiveStatsAsync()
    {
        var today = DateTime.Today;
        var thisYear = DateTime.Now.Year;

        return new ArchiveStatsDto
        {
            TotalArchives = await _context.MedicalRecordArchives.CountAsync(a => !a.IsDeleted),
            PendingArchives = await _context.MedicalRecordArchives.CountAsync(a => !a.IsDeleted && a.Status == 0),
            ArchivedCount = await _context.MedicalRecordArchives.CountAsync(a => !a.IsDeleted && a.Status == 1),
            CurrentlyBorrowed = await _context.MedicalRecordArchives.CountAsync(a => !a.IsDeleted && a.Status == 2),
            OverdueBorrows = await _context.MedicalRecordBorrowRequests.CountAsync(r => !r.IsDeleted && r.Status == 3 && r.ExpectedReturnDate < today),
            PendingBorrowRequests = await _context.MedicalRecordBorrowRequests.CountAsync(r => !r.IsDeleted && r.Status == 0),
            ThisYearArchived = await _context.MedicalRecordArchives.CountAsync(a => !a.IsDeleted && a.ArchiveYear == thisYear)
        };
    }

    // === Storage & Digital Archive ===

    public async Task<StorageStatusDto> GetStorageStatusAsync()
    {
        try
        {
            var totalArchives = await _context.MedicalRecordArchives.CountAsync(a => !a.IsDeleted);
            // Estimate ~500KB per archive record on average
            var estimatedUsedBytes = (long)totalArchives * 512 * 1024;
            var totalLocalBytes = 500L * 1024 * 1024 * 1024; // 500 GB local capacity
            var totalCloudBytes = 2L * 1024 * 1024 * 1024 * 1024; // 2 TB cloud capacity

            return new StorageStatusDto
            {
                LocalUsagePercent = totalLocalBytes > 0 ? Math.Round((double)estimatedUsedBytes / totalLocalBytes * 100, 2) : 0,
                CloudUsagePercent = 0, // Cloud not yet configured
                SyncStatus = "idle",
                LastSyncDate = null,
                TotalLocalBytes = totalLocalBytes,
                UsedLocalBytes = estimatedUsedBytes,
                TotalCloudBytes = totalCloudBytes,
                UsedCloudBytes = 0
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting storage status");
            return new StorageStatusDto();
        }
    }

    public async Task<PagedArchiveResult> GetArchivedRecordsAsync(string? keyword, string? format, DateTime? fromDate, DateTime? toDate, int pageIndex, int pageSize)
    {
        var query = _context.MedicalRecordArchives
            .Include(a => a.MedicalRecord)
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.ArchivedBy)
            .Include(a => a.BorrowRequests)
            .Where(a => !a.IsDeleted && a.Status == 1) // Only archived (status=1)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLower();
            query = query.Where(a =>
                a.ArchiveCode.ToLower().Contains(kw) ||
                a.Patient.FullName.ToLower().Contains(kw) ||
                a.Patient.PatientCode.ToLower().Contains(kw) ||
                (a.MedicalRecord != null && a.MedicalRecord.MedicalRecordCode.ToLower().Contains(kw)) ||
                (a.Diagnosis != null && a.Diagnosis.ToLower().Contains(kw)));
        }

        if (fromDate.HasValue)
            query = query.Where(a => a.ArchivedDate >= fromDate.Value.Date);
        if (toDate.HasValue)
            query = query.Where(a => a.ArchivedDate < toDate.Value.Date.AddDays(1));

        // Format filter is informational only (archive entity does not store format);
        // we accept the parameter for API compatibility but don't filter on it.

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.ArchivedDate ?? a.CreatedAt)
            .Skip(pageIndex * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedArchiveResult
        {
            TotalCount = total,
            Items = items.Select(MapToDto).ToList()
        };
    }

    public async Task<ArchiveDto> GenerateArchiveAsync(GenerateArchiveDto dto, Guid userId)
    {
        // Find examination and its medical record
        var exam = await _context.Examinations
            .Include(e => e.MedicalRecord).ThenInclude(r => r!.Patient)
            .Include(e => e.MedicalRecord).ThenInclude(r => r!.Department)
            .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId);

        if (exam == null)
            throw new Exception("Không tìm thấy lượt khám");
        if (exam.MedicalRecord == null)
            throw new Exception("Không tìm thấy hồ sơ bệnh án cho lượt khám này");

        // Check if already archived
        var existing = await _context.MedicalRecordArchives
            .AnyAsync(a => a.MedicalRecordId == exam.MedicalRecordId && !a.IsDeleted);
        if (existing)
            throw new Exception("Hồ sơ bệnh án đã được lưu trữ trước đó");

        var record = exam.MedicalRecord;
        var archive = new MedicalRecordArchive
        {
            Id = Guid.NewGuid(),
            ArchiveCode = $"LT{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}",
            MedicalRecordId = record.Id,
            PatientId = record.PatientId,
            DepartmentId = record.DepartmentId,
            Diagnosis = exam.MainDiagnosis ?? record.MainDiagnosis,
            TreatmentResult = record.TreatmentResult?.ToString(),
            AdmissionDate = record.AdmissionDate,
            DischargeDate = record.DischargeDate,
            Status = 1, // Đã lưu
            ArchivedDate = DateTime.UtcNow,
            ArchivedById = userId,
            ArchiveYear = DateTime.Now.Year,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        await _context.MedicalRecordArchives.AddAsync(archive);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Generated {Format} archive {ArchiveCode} for examination {ExamId}",
            dto.Format, archive.ArchiveCode, dto.ExaminationId);

        return await GetArchiveByIdAsync(archive.Id);
    }

    public async Task<ArchivedRecordDataDto> DecodeArchiveAsync(Guid id)
    {
        var archive = await _context.MedicalRecordArchives
            .Include(a => a.MedicalRecord).ThenInclude(r => r!.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(r => r!.Department)
            .Include(a => a.MedicalRecord).ThenInclude(r => r!.Doctor)
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

        if (archive == null)
            throw new Exception("Không tìm thấy hồ sơ lưu trữ");

        var record = archive.MedicalRecord;
        var patient = archive.Patient ?? record?.Patient;

        // Build XML representation of the archived record
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<MedicalRecordArchive>");
        sb.AppendLine($"  <ArchiveCode>{archive.ArchiveCode}</ArchiveCode>");
        sb.AppendLine($"  <PatientName>{patient?.FullName}</PatientName>");
        sb.AppendLine($"  <PatientCode>{patient?.PatientCode}</PatientCode>");
        sb.AppendLine($"  <MedicalRecordCode>{record?.MedicalRecordCode}</MedicalRecordCode>");
        sb.AppendLine($"  <Diagnosis>{archive.Diagnosis}</Diagnosis>");
        sb.AppendLine($"  <AdmissionDate>{archive.AdmissionDate:yyyy-MM-dd}</AdmissionDate>");
        sb.AppendLine($"  <DischargeDate>{archive.DischargeDate:yyyy-MM-dd}</DischargeDate>");
        sb.AppendLine($"  <Department>{archive.Department?.DepartmentName}</Department>");
        sb.AppendLine($"  <ArchivedDate>{archive.ArchivedDate:yyyy-MM-dd}</ArchivedDate>");
        sb.AppendLine("</MedicalRecordArchive>");

        return new ArchivedRecordDataDto
        {
            Id = archive.Id,
            ArchiveCode = archive.ArchiveCode,
            PatientName = patient?.FullName,
            PatientCode = patient?.PatientCode,
            DateOfBirth = patient?.DateOfBirth,
            Gender = patient?.Gender == 1 ? "Nam" : patient?.Gender == 2 ? "Nữ" : "Khác",
            MedicalRecordCode = record?.MedicalRecordCode,
            Diagnosis = archive.Diagnosis,
            TreatmentResult = archive.TreatmentResult,
            AdmissionDate = archive.AdmissionDate,
            DischargeDate = archive.DischargeDate,
            DepartmentName = archive.Department?.DepartmentName ?? record?.Department?.DepartmentName,
            DoctorName = record?.Doctor?.FullName,
            Format = "XML",
            ArchivedDate = archive.ArchivedDate,
            RawContent = sb.ToString()
        };
    }

    public async Task<byte[]> DownloadArchiveAsync(Guid id)
    {
        var decoded = await DecodeArchiveAsync(id);
        return Encoding.UTF8.GetBytes(decoded.RawContent ?? string.Empty);
    }

    // === Helpers ===

    private async Task<ArchiveDto> GetArchiveByIdAsync(Guid id)
    {
        var a = await _context.MedicalRecordArchives
            .Include(a => a.MedicalRecord)
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.ArchivedBy)
            .Include(a => a.BorrowRequests)
            .FirstAsync(a => a.Id == id);
        return MapToDto(a);
    }

    private async Task<BorrowRequestDto> GetBorrowRequestByIdAsync(Guid id)
    {
        var r = await _context.MedicalRecordBorrowRequests
            .Include(r => r.MedicalRecordArchive).ThenInclude(a => a.Patient)
            .Include(r => r.RequestedBy)
            .Include(r => r.ApprovedBy)
            .FirstAsync(r => r.Id == id);
        return MapToBorrowDto(r);
    }

    private static ArchiveDto MapToDto(MedicalRecordArchive a)
    {
        var statusNames = new Dictionary<int, string>
        {
            { 0, "Chờ lưu" }, { 1, "Đã lưu" }, { 2, "Đang mượn" }, { 3, "Đã hủy" }
        };

        return new ArchiveDto
        {
            Id = a.Id,
            ArchiveCode = a.ArchiveCode,
            MedicalRecordId = a.MedicalRecordId,
            MedicalRecordCode = a.MedicalRecord?.MedicalRecordCode,
            PatientId = a.PatientId,
            PatientCode = a.Patient?.PatientCode,
            PatientName = a.Patient?.FullName,
            DepartmentId = a.DepartmentId,
            DepartmentName = a.Department?.DepartmentName,
            Diagnosis = a.Diagnosis,
            TreatmentResult = a.TreatmentResult,
            AdmissionDate = a.AdmissionDate,
            DischargeDate = a.DischargeDate,
            StorageLocation = a.StorageLocation,
            ShelfNumber = a.ShelfNumber,
            BoxNumber = a.BoxNumber,
            Status = a.Status,
            StatusName = statusNames.GetValueOrDefault(a.Status, "Không xác định"),
            ArchivedDate = a.ArchivedDate,
            ArchivedByName = a.ArchivedBy?.FullName,
            ArchiveYear = a.ArchiveYear,
            BorrowCount = a.BorrowRequests?.Count ?? 0
        };
    }

    private static BorrowRequestDto MapToBorrowDto(MedicalRecordBorrowRequest r)
    {
        var statusNames = new Dictionary<int, string>
        {
            { 0, "Chờ duyệt" }, { 1, "Đã duyệt" }, { 2, "Từ chối" }, { 3, "Đang mượn" }, { 4, "Đã trả" }
        };

        var isOverdue = r.Status == 3 && r.ExpectedReturnDate.HasValue && r.ExpectedReturnDate.Value < DateTime.Today;

        return new BorrowRequestDto
        {
            Id = r.Id,
            RequestCode = r.RequestCode,
            MedicalRecordArchiveId = r.MedicalRecordArchiveId,
            ArchiveCode = r.MedicalRecordArchive?.ArchiveCode,
            PatientName = r.MedicalRecordArchive?.Patient?.FullName,
            RequestedByName = r.RequestedBy?.FullName,
            RequestDate = r.RequestDate,
            Purpose = r.Purpose,
            ExpectedReturnDate = r.ExpectedReturnDate,
            Status = r.Status,
            StatusName = statusNames.GetValueOrDefault(r.Status, "Không xác định"),
            ApprovedByName = r.ApprovedBy?.FullName,
            ApprovedDate = r.ApprovedDate,
            RejectReason = r.RejectReason,
            BorrowedDate = r.BorrowedDate,
            ReturnedDate = r.ReturnedDate,
            Note = r.Note,
            IsOverdue = isOverdue,
            DaysOverdue = isOverdue ? (DateTime.Today - r.ExpectedReturnDate!.Value).Days : 0
        };
    }
}
