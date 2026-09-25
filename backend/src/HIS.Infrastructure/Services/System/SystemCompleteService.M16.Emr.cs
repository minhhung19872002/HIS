using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K2 phien 3 (2026-05-30): tach Module 16 (HSBA & Thong ke, 12 chuc nang, ~1135 dong) khoi
// SystemCompleteService.cs god-file. ZERO runtime change — partial class.
// Ctor + DI fields o file goc SystemCompleteService.cs.
public partial class SystemCompleteService
{
    #region Module 16: HSBA & Thong ke - 12 chuc nang

    // 16.1 Luu tru ho so benh an
    public async Task<List<MedicalRecordArchiveDto>> GetMedicalRecordArchivesAsync(
        string keyword = null, int? year = null, string archiveStatus = null, Guid? departmentId = null)
    {
        try
        {
            var query = _context.MedicalRecordArchives.AsNoTracking()
                .Include(a => a.Patient)
                .Include(a => a.MedicalRecord)
                .Include(a => a.Department)
                .Include(a => a.ArchivedBy)
                .Where(a => !a.IsDeleted);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(a =>
                    a.ArchiveCode.Contains(keyword) ||
                    a.Patient.FullName.Contains(keyword) ||
                    a.Patient.PatientCode.Contains(keyword) ||
                    (a.Diagnosis != null && a.Diagnosis.Contains(keyword)));
            if (year.HasValue)
                query = query.Where(a => a.ArchiveYear == year.Value);
            if (!string.IsNullOrWhiteSpace(archiveStatus) && int.TryParse(archiveStatus, out var st))
                query = query.Where(a => a.Status == st);
            if (departmentId.HasValue)
                query = query.Where(a => a.DepartmentId == departmentId.Value);

            var statusNames = new Dictionary<int, string> { {0,"Chờ lưu"}, {1,"Đã lưu"}, {2,"Đang mượn"}, {3,"Đã hủy"} };
            return await query.OrderByDescending(a => a.CreatedAt)
                .Take(500)
                .Select(a => new MedicalRecordArchiveDto
                {
                    Id = a.Id,
                    ArchiveCode = a.ArchiveCode,
                    AdmissionCode = a.MedicalRecord.MedicalRecordCode,
                    PatientId = a.PatientId,
                    PatientCode = a.Patient.PatientCode,
                    PatientName = a.Patient.FullName,
                    AdmissionDate = a.AdmissionDate ?? a.MedicalRecord.AdmissionDate,
                    DischargeDate = a.DischargeDate ?? a.MedicalRecord.DischargeDate ?? DateTime.MinValue,
                    DepartmentName = a.Department != null ? a.Department.DepartmentName : "",
                    Diagnosis = a.Diagnosis ?? a.MedicalRecord.MainDiagnosis ?? "",
                    TreatmentResult = a.TreatmentResult ?? "",
                    StorageLocation = a.StorageLocation ?? "",
                    ShelfNumber = a.ShelfNumber ?? "",
                    Status = a.Status == 0 ? "Chờ lưu" : a.Status == 1 ? "Đã lưu" : a.Status == 2 ? "Đang mượn" : "Đã hủy",
                    ArchivedDate = a.ArchivedDate,
                    ArchivedBy = a.ArchivedBy != null ? a.ArchivedBy.FullName : ""
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalRecordArchivesAsync");
            return new List<MedicalRecordArchiveDto>();
        }
    }

    public async Task<MedicalRecordArchiveDto> GetMedicalRecordArchiveAsync(Guid archiveId)
    {
        try
        {
            var a = await _context.MedicalRecordArchives.AsNoTracking()
                .Include(x => x.Patient)
                .Include(x => x.MedicalRecord)
                .Include(x => x.Department)
                .Include(x => x.ArchivedBy)
                .FirstOrDefaultAsync(x => x.Id == archiveId && !x.IsDeleted);
            if (a == null) return null;

            return new MedicalRecordArchiveDto
            {
                Id = a.Id,
                ArchiveCode = a.ArchiveCode,
                AdmissionCode = a.MedicalRecord.MedicalRecordCode,
                PatientId = a.PatientId,
                PatientCode = a.Patient.PatientCode,
                PatientName = a.Patient.FullName,
                AdmissionDate = a.AdmissionDate ?? a.MedicalRecord.AdmissionDate,
                DischargeDate = a.DischargeDate ?? a.MedicalRecord.DischargeDate ?? DateTime.MinValue,
                DepartmentName = a.Department?.DepartmentName ?? "",
                Diagnosis = a.Diagnosis ?? a.MedicalRecord.MainDiagnosis ?? "",
                TreatmentResult = a.TreatmentResult ?? "",
                StorageLocation = a.StorageLocation ?? "",
                ShelfNumber = a.ShelfNumber ?? "",
                Status = a.Status == 0 ? "Chờ lưu" : a.Status == 1 ? "Đã lưu" : a.Status == 2 ? "Đang mượn" : "Đã hủy",
                ArchivedDate = a.ArchivedDate,
                ArchivedBy = a.ArchivedBy?.FullName ?? ""
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalRecordArchiveAsync");
            return null;
        }
    }

    public async Task<MedicalRecordArchiveDto> SaveMedicalRecordArchiveAsync(MedicalRecordArchiveDto dto)
    {
        try
        {
            MedicalRecordArchive entity;
            if (dto.Id == Guid.Empty)
            {
                // Create new archive from a medical record
                entity = new MedicalRecordArchive
                {
                    Id = Guid.NewGuid(),
                    // QA-R3: was LT-{date}-{Random} (duplicates) → shared sequential generator + unique index (mig 201).
                    ArchiveCode = (await RecordCodeGenerator.NextArchiveCodesAsync(_context))[0],
                    MedicalRecordId = dto.PatientId != Guid.Empty
                        ? (await _context.MedicalRecords.FirstOrDefaultAsync(m => m.PatientId == dto.PatientId))?.Id ?? Guid.Empty
                        : Guid.Empty,
                    PatientId = dto.PatientId,
                    Diagnosis = dto.Diagnosis,
                    TreatmentResult = dto.TreatmentResult,
                    StorageLocation = dto.StorageLocation,
                    ShelfNumber = dto.ShelfNumber,
                    Status = 0,
                    ArchiveYear = DateTime.Now.Year,
                    CreatedAt = DateTime.UtcNow
                };
                _context.MedicalRecordArchives.Add(entity);
            }
            else
            {
                entity = await _context.MedicalRecordArchives.FindAsync(dto.Id);
                if (entity == null) { dto.Id = Guid.NewGuid(); return dto; }

                entity.StorageLocation = dto.StorageLocation;
                entity.ShelfNumber = dto.ShelfNumber;
                entity.Diagnosis = dto.Diagnosis;
                entity.TreatmentResult = dto.TreatmentResult;
                if (dto.Status == "Đã lưu" && entity.Status == 0)
                {
                    entity.Status = 1;
                    entity.ArchivedDate = HIS.Core.Common.VnTime.NowVn; // business timestamp = VN local
                }
                entity.UpdatedAt = DateTime.UtcNow;
            }
            for (var attempt = 1; ; attempt++)
            {
                try { await _context.SaveChangesAsync(); break; }
                catch (DbUpdateException ex) when (dto.Id == Guid.Empty && NangCap23ServiceHelpers.IsUniqueViolation(ex)
                                                   && attempt < RecordCodeGenerator.MaxAttempts)
                {
                    entity.ArchiveCode = (await RecordCodeGenerator.NextArchiveCodesAsync(_context))[0];
                }
            }
            dto.Id = entity.Id;
            dto.ArchiveCode = entity.ArchiveCode;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveMedicalRecordArchiveAsync");
            if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
            return dto;
        }
    }

    public async Task<bool> UpdateArchiveLocationAsync(Guid archiveId, string location)
    {
        try
        {
            var archive = await _context.MedicalRecordArchives.FindAsync(archiveId);
            if (archive == null) return false;
            archive.StorageLocation = location;
            archive.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateArchiveLocationAsync");
            return false;
        }
    }

    // 16.2 Muon tra ho so
    public async Task<List<MedicalRecordBorrowRequestDto>> GetBorrowRequestsAsync(
        DateTime? fromDate = null, DateTime? toDate = null, string status = null, Guid? borrowerId = null)
    {
        try
        {
            var query = _context.MedicalRecordBorrowRequests.AsNoTracking()
                .Include(r => r.MedicalRecordArchive).ThenInclude(a => a.Patient)
                .Include(r => r.RequestedBy)
                .Where(r => !r.IsDeleted);

            if (fromDate.HasValue)
                query = query.Where(r => r.RequestDate >= fromDate.Value);
            if (toDate.HasValue)
                query = query.Where(r => r.RequestDate <= toDate.Value);
            if (!string.IsNullOrWhiteSpace(status) && int.TryParse(status, out var st))
                query = query.Where(r => r.Status == st);
            if (borrowerId.HasValue)
                query = query.Where(r => r.RequestedById == borrowerId.Value);

            var statusNames = new Dictionary<int, string> { {0,"Chờ duyệt"}, {1,"Đã duyệt"}, {2,"Từ chối"}, {3,"Đang mượn"}, {4,"Đã trả"} };
            return await query.OrderByDescending(r => r.RequestDate)
                .Take(500)
                .Select(r => new MedicalRecordBorrowRequestDto
                {
                    Id = r.Id,
                    RequestCode = r.RequestCode,
                    RecordId = r.MedicalRecordArchiveId,
                    ArchiveCode = r.MedicalRecordArchive.ArchiveCode,
                    PatientName = r.MedicalRecordArchive.Patient.FullName,
                    RequestDate = r.RequestDate,
                    RequestedById = r.RequestedById,
                    RequestedByName = r.RequestedBy.FullName,
                    Purpose = r.Purpose ?? "",
                    ExpectedReturnDate = r.ExpectedReturnDate,
                    Status = r.Status == 0 ? "Chờ duyệt" : r.Status == 1 ? "Đã duyệt" : r.Status == 2 ? "Từ chối" : r.Status == 3 ? "Đang mượn" : "Đã trả",
                    BorrowedDate = r.BorrowedDate,
                    ReturnedDate = r.ReturnedDate,
                    Note = r.Note ?? ""
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBorrowRequestsAsync");
            return new List<MedicalRecordBorrowRequestDto>();
        }
    }

    public async Task<MedicalRecordBorrowRequestDto> GetBorrowRequestAsync(Guid requestId)
    {
        try
        {
            var r = await _context.MedicalRecordBorrowRequests.AsNoTracking()
                .Include(x => x.MedicalRecordArchive).ThenInclude(a => a.Patient)
                .Include(x => x.RequestedBy)
                .FirstOrDefaultAsync(x => x.Id == requestId && !x.IsDeleted);
            if (r == null) return null;

            return new MedicalRecordBorrowRequestDto
            {
                Id = r.Id,
                RequestCode = r.RequestCode,
                RecordId = r.MedicalRecordArchiveId,
                ArchiveCode = r.MedicalRecordArchive.ArchiveCode,
                PatientName = r.MedicalRecordArchive.Patient.FullName,
                RequestDate = r.RequestDate,
                RequestedById = r.RequestedById,
                RequestedByName = r.RequestedBy.FullName,
                Purpose = r.Purpose ?? "",
                ExpectedReturnDate = r.ExpectedReturnDate,
                Status = r.Status == 0 ? "Chờ duyệt" : r.Status == 1 ? "Đã duyệt" : r.Status == 2 ? "Từ chối" : r.Status == 3 ? "Đang mượn" : "Đã trả",
                BorrowedDate = r.BorrowedDate,
                ReturnedDate = r.ReturnedDate,
                Note = r.Note ?? ""
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBorrowRequestAsync");
            return null;
        }
    }

    public async Task<MedicalRecordBorrowRequestDto> CreateBorrowRequestAsync(CreateBorrowRequestDto dto)
    {
        // QA-R11: RequestedById was Guid.Empty → FK_…_RequestedBy failed, the catch below returned
        // HTTP 200 with a random Id and Status "Error", nothing was saved. The code was
        // `MT-{server date}-{Random(1000,9999)}` (collisions, UTC date on prod). Now: the caller is the
        // requester, the code is the next number of the VN day, and failures surface as 4xx.
        var userIdStr = _httpCtx.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var requesterId) || requesterId == Guid.Empty)
            throw new UnauthorizedAccessException("Không xác định được người yêu cầu mượn.");
        var archiveRow = await _context.MedicalRecordArchives
            .FirstOrDefaultAsync(a => a.Id == dto.MedicalRecordArchiveId && !a.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ lưu trữ.");
        if (archiveRow.Status == 3)
            throw new InvalidOperationException("Hồ sơ lưu trữ đã hủy, không cho mượn được.");
        if (await _context.MedicalRecordBorrowRequests.AnyAsync(b =>
                b.MedicalRecordArchiveId == archiveRow.Id && !b.IsDeleted && (b.Status == 0 || b.Status == 1 || b.Status == 3)))
            throw new InvalidOperationException("Hồ sơ đang có phiếu mượn chưa trả, không tạo thêm phiếu được.");
        var codePrefix = $"MT-{HIS.Core.Common.VnTime.NowVn:yyyyMMdd}-";
        var sameDay = await _context.MedicalRecordBorrowRequests.IgnoreQueryFilters()
            .Where(b => b.RequestCode.StartsWith(codePrefix)).Select(b => b.RequestCode).ToListAsync();
        var requestCode = $"{codePrefix}{RecordCodeGenerator.NextNumber(sameDay, codePrefix):D4}";
        try
        {
            var archive = await _context.MedicalRecordArchives
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == dto.MedicalRecordArchiveId);
            if (archive == null)
                return new MedicalRecordBorrowRequestDto { Id = Guid.Empty };

            var entity = new MedicalRecordBorrowRequest
            {
                Id = Guid.NewGuid(),
                RequestCode = requestCode,
                MedicalRecordArchiveId = dto.MedicalRecordArchiveId,
                RequestedById = requesterId,
                RequestDate = HIS.Core.Common.VnTime.NowVn,
                Purpose = dto.Purpose,
                ExpectedReturnDate = dto.ExpectedReturnDate,
                Status = 0,
                Note = dto.Note,
                CreatedAt = DateTime.UtcNow
            };
            _context.MedicalRecordBorrowRequests.Add(entity);
            await _context.SaveChangesAsync();

            return new MedicalRecordBorrowRequestDto
            {
                Id = entity.Id,
                RequestCode = entity.RequestCode,
                RecordId = entity.MedicalRecordArchiveId,
                ArchiveCode = archive.ArchiveCode,
                PatientName = archive.Patient?.FullName ?? "",
                RequestDate = entity.RequestDate,
                RequestedById = entity.RequestedById,
                Purpose = entity.Purpose ?? "",
                ExpectedReturnDate = entity.ExpectedReturnDate,
                Status = "Chờ duyệt",
                Note = entity.Note ?? ""
            };
        }
        catch (Exception ex)
        {
            // QA-R11: was `return new … { Id = Guid.NewGuid(), Status = "Error" }` → HTTP 200 for a loan
            // that was never written. Let it fail visibly.
            _logger.LogError(ex, "Error in CreateBorrowRequestAsync");
            throw;
        }
    }

    private Guid? CurrentUserGuidM16()
    {
        var v = _httpCtx.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(v, out var g) && g != Guid.Empty ? g : null;
    }

    public async Task<bool> ApproveBorrowRequestAsync(Guid requestId)
    {
        try
        {
            var request = await _context.MedicalRecordBorrowRequests.FindAsync(requestId);
            if (request == null || request.Status != 0) return false;
            request.Status = 1;
            request.ApprovedDate = HIS.Core.Common.VnTime.NowVn;
            request.ApprovedById = CurrentUserGuidM16(); // QA-R11: approver was never recorded (always NULL)
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ApproveBorrowRequestAsync");
            return false;
        }
    }

    public async Task<bool> RejectBorrowRequestAsync(Guid requestId, string reason)
    {
        try
        {
            var request = await _context.MedicalRecordBorrowRequests.FindAsync(requestId);
            if (request == null || request.Status != 0) return false;
            request.Status = 2;
            request.RejectReason = reason;
            request.ApprovedDate = HIS.Core.Common.VnTime.NowVn;
            request.ApprovedById = CurrentUserGuidM16(); // QA-R11: approver was never recorded (always NULL)
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in RejectBorrowRequestAsync");
            return false;
        }
    }

    public async Task<bool> ProcessBorrowAsync(Guid requestId)
    {
        try
        {
            var request = await _context.MedicalRecordBorrowRequests
                .Include(r => r.MedicalRecordArchive)
                .FirstOrDefaultAsync(r => r.Id == requestId);
            if (request == null || request.Status != 1) return false;
            request.Status = 3;
            request.BorrowedDate = HIS.Core.Common.VnTime.NowVn;
            request.UpdatedAt = DateTime.UtcNow;
            // Update archive status to "Đang mượn"
            if (request.MedicalRecordArchive != null)
            {
                request.MedicalRecordArchive.Status = 2;
                request.MedicalRecordArchive.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ProcessBorrowAsync");
            return false;
        }
    }

    public async Task<bool> ReturnMedicalRecordAsync(Guid requestId, string note)
    {
        try
        {
            var request = await _context.MedicalRecordBorrowRequests
                .Include(r => r.MedicalRecordArchive)
                .FirstOrDefaultAsync(r => r.Id == requestId);
            if (request == null || request.Status != 3) return false;
            request.Status = 4;
            request.ReturnedDate = HIS.Core.Common.VnTime.NowVn;
            request.Note = string.IsNullOrWhiteSpace(note) ? request.Note : (request.Note + "\n" + note).Trim();
            request.UpdatedAt = DateTime.UtcNow;
            // Update archive status back to "Đã lưu"
            if (request.MedicalRecordArchive != null)
            {
                request.MedicalRecordArchive.Status = 1;
                request.MedicalRecordArchive.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ReturnMedicalRecordAsync");
            return false;
        }
    }

    // 16.3 Dashboard thong ke benh vien
    public async Task<HospitalDashboardDto> GetHospitalDashboardAsync(DateTime? date = null)
    {
        var reportDate = date ?? DateTime.Today;
        try
        {
            var todayStart = reportDate.Date;
            var todayEnd = todayStart.AddDays(1);
            // QA-R4: CreatedAt is UTC — comparing it with the VN day bounds shifted every count/sum by 7 hours
            // (16/09 showed 5 visits / 0đ while 31 visits / 565.000đ had been recorded). Business timestamps
            // (ReceiptDate, AdmissionDate, RequestDate, IssueDate) are VN wall clock and compare directly.
            var (todayStartUtc, todayEndUtc) = HIS.Core.Common.VnTime.DayRangeUtc(todayStart);

            var todayExams = await _context.Examinations
                .CountAsync(e => e.CreatedAt >= todayStartUtc && e.CreatedAt < todayEndUtc && e.Status != 5 && !e.IsDeleted);

            var todayAdmissions = await _context.Admissions
                .CountAsync(a => a.AdmissionDate >= todayStart && a.AdmissionDate < todayEnd && !a.IsDeleted);

            var currentInpatients = await _context.Admissions
                .CountAsync(a => a.Status == 0 && !a.IsDeleted); // 0 = Dang dieu tri

            var totalBeds = await _context.Beds.CountAsync(b => b.IsActive && !b.IsDeleted);
            // Occupied = beds holding an active assignment (same rule as the ward layout). Using the
            // inpatient count instead showed 0 free beds whenever patients outnumbered beds.
            var occupiedBeds = await _context.BedAssignments
                .Where(ba => ba.Status == 0 && !ba.IsDeleted && ba.Bed.IsActive && !ba.Bed.IsDeleted)
                .Select(ba => ba.BedId).Distinct().CountAsync();

            var todayDischarges = await _context.Discharges
                .CountAsync(d => d.DischargeDate >= todayStart && d.DischargeDate < todayEnd && !d.IsDeleted);

            // Surgeries = SurgeryRequests on their business date (was ServiceRequests RequestType 3 = TDCN by UTC CreatedAt).
            var todaySurgeries = await _context.SurgeryRequests
                .CountAsync(s => s.RequestDate >= todayStart && s.RequestDate < todayEnd && s.Status != 4 && !s.IsDeleted);

            // Emergency = QueueTickets with QueueType 3 (Emergency); IssueDate is VN local.
            var todayEmergencies = await _context.QueueTickets
                .CountAsync(q => q.QueueType == 3 && q.IssueDate >= todayStart && q.IssueDate < todayEnd && !q.IsDeleted);

            // Revenue = net cash on the business date (shared rule: collected receipts minus approved/paid refunds,
            // deposit refunds excluded — they pushed 15/09 to −2.334.800đ). Was UTC CreatedAt + deposit refunds.
            var todayRevenue = await _context.Receipts
                .Where(r => r.ReceiptDate >= todayStart && r.ReceiptDate < todayEnd && !r.IsDeleted)
                .Where(ReportPeriod.CashReceipt)
                .SumAsync(r => (decimal?)(r.ReceiptType == 3 ? -r.FinalAmount : r.FinalAmount)) ?? 0;

            // Service status breakdown - OPD examinations (4 = completed; 5 cancelled is neither)
            var serviceOpdDone = await _context.Examinations
                .CountAsync(e => e.CreatedAt >= todayStartUtc && e.CreatedAt < todayEndUtc && e.Status == 4 && !e.IsDeleted);
            var serviceOpdPending = await _context.Examinations
                .CountAsync(e => e.CreatedAt >= todayStartUtc && e.CreatedAt < todayEndUtc && e.Status < 4 && !e.IsDeleted);

            // Service status breakdown - Lab (RequestType=1)
            var serviceLabDone = await _context.ServiceRequestDetails
                .CountAsync(d => d.ServiceRequest.RequestDate >= todayStart && d.ServiceRequest.RequestDate < todayEnd
                    && d.ServiceRequest.RequestType == 1 && d.Status >= 2);
            var serviceLabPending = await _context.ServiceRequestDetails
                .CountAsync(d => d.ServiceRequest.RequestDate >= todayStart && d.ServiceRequest.RequestDate < todayEnd
                    && d.ServiceRequest.RequestType == 1 && d.Status < 2);

            // Service status breakdown - Radiology (RequestType=2)
            var serviceRadiologyDone = await _context.ServiceRequestDetails
                .CountAsync(d => d.ServiceRequest.RequestDate >= todayStart && d.ServiceRequest.RequestDate < todayEnd
                    && d.ServiceRequest.RequestType == 2 && d.Status >= 2);
            var serviceRadiologyPending = await _context.ServiceRequestDetails
                .CountAsync(d => d.ServiceRequest.RequestDate >= todayStart && d.ServiceRequest.RequestDate < todayEnd
                    && d.ServiceRequest.RequestType == 2 && d.Status < 2);

            // Service status breakdown - Surgery (SurgeryRequest Status: 3=Hoàn thành)
            var serviceSurgeryDone = await _context.SurgeryRequests
                .CountAsync(s => s.RequestDate >= todayStart && s.RequestDate < todayEnd && s.Status >= 3);
            var serviceSurgeryPending = await _context.SurgeryRequests
                .CountAsync(s => s.RequestDate >= todayStart && s.RequestDate < todayEnd && s.Status < 3);

            // Service status breakdown - Procedure (RequestType=3, TDCN)
            var serviceProcedureDone = await _context.ServiceRequests
                .CountAsync(sr => sr.RequestDate >= todayStart && sr.RequestDate < todayEnd
                    && sr.RequestType == 3 && sr.Status >= 2);
            var serviceProcedurePending = await _context.ServiceRequests
                .CountAsync(sr => sr.RequestDate >= todayStart && sr.RequestDate < todayEnd
                    && sr.RequestType == 3 && sr.Status < 2);

            // Service status breakdown - Prescription
            var servicePrescriptionDone = await _context.Prescriptions
                .CountAsync(p => p.PrescriptionDate >= todayStart && p.PrescriptionDate < todayEnd && p.IsDispensed);
            var servicePrescriptionPending = await _context.Prescriptions
                .CountAsync(p => p.PrescriptionDate >= todayStart && p.PrescriptionDate < todayEnd && !p.IsDispensed);

            // Revenue breakdown by patient type (via MedicalRecord.PatientType)
            var revenueBHYT = await _context.Receipts
                .Where(r => r.ReceiptDate >= todayStart && r.ReceiptDate < todayEnd && !r.IsDeleted
                    && r.MedicalRecord != null && r.MedicalRecord.PatientType == 1)
                .Where(ReportPeriod.CashReceipt)
                .SumAsync(r => (decimal?)(r.ReceiptType == 3 ? -r.FinalAmount : r.FinalAmount)) ?? 0;
            var revenueSelfPay = await _context.Receipts
                .Where(r => r.ReceiptDate >= todayStart && r.ReceiptDate < todayEnd && !r.IsDeleted
                    && (r.MedicalRecord == null || r.MedicalRecord.PatientType != 1))
                .Where(ReportPeriod.CashReceipt)
                .SumAsync(r => (decimal?)(r.ReceiptType == 3 ? -r.FinalAmount : r.FinalAmount)) ?? 0;

            // 7-day trends
            var trendStart = todayStart.AddDays(-6);
            var trendStartUtc = HIS.Core.Common.VnTime.DayRangeUtc(trendStart).FromUtc;
            var offsetHours = (todayStart - todayStartUtc).TotalHours;

            // #195: 3 query gom theo ngày cho cả tuần, thay vì 21 query (7 ngày × 3 chỉ số).
            // Examinations: UTC window, bucketed by VN day (CreatedAt + offset).
            var outpatientsByDay = (await _context.Examinations
                    .Where(e => e.CreatedAt >= trendStartUtc && e.CreatedAt < todayEndUtc && e.Status != 5 && !e.IsDeleted)
                    .GroupBy(e => e.CreatedAt.AddHours(offsetHours).Date)
                    .Select(g => new { Day = g.Key, Count = g.Count() })
                    .ToListAsync())
                .ToDictionary(x => x.Day, x => x.Count);

            var admissionsByDay = (await _context.Admissions
                    .Where(a => a.AdmissionDate >= trendStart && a.AdmissionDate < todayEnd && !a.IsDeleted)
                    .GroupBy(a => a.AdmissionDate.Date)
                    .Select(g => new { Day = g.Key, Count = g.Count() })
                    .ToListAsync())
                .ToDictionary(x => x.Day, x => x.Count);

            var revenueByDay = (await _context.Receipts
                    .Where(r => r.ReceiptDate >= trendStart && r.ReceiptDate < todayEnd && !r.IsDeleted)
                    .Where(ReportPeriod.CashReceipt)
                    .GroupBy(r => r.ReceiptDate.Date)
                    .Select(g => new { Day = g.Key, Total = g.Sum(r => (decimal?)(r.ReceiptType == 3 ? -r.FinalAmount : r.FinalAmount)) })
                    .ToListAsync())
                .ToDictionary(x => x.Day, x => x.Total ?? 0);

            var trends = new List<DashboardTrendDto>();
            for (var d = trendStart; d <= todayStart; d = d.AddDays(1))
            {
                trends.Add(new DashboardTrendDto
                {
                    Date = d,
                    Outpatients = outpatientsByDay.TryGetValue(d, out var dayOutpatients) ? dayOutpatients : 0,
                    Admissions = admissionsByDay.TryGetValue(d, out var dayAdmissions) ? dayAdmissions : 0,
                    Revenue = revenueByDay.TryGetValue(d, out var dayRevenue) ? dayRevenue : 0
                });
            }

            return new HospitalDashboardDto
            {
                ReportDate = reportDate,
                TodayOutpatients = todayExams,
                TodayAdmissions = todayAdmissions,
                CurrentInpatients = currentInpatients,
                AvailableBeds = Math.Max(0, totalBeds - occupiedBeds),
                TodayDischarges = todayDischarges,
                TodaySurgeries = todaySurgeries,
                TodayEmergencies = todayEmergencies,
                TodayRevenue = todayRevenue,
                Trends = trends,

                // Service status breakdown
                ServiceOpdDone = serviceOpdDone,
                ServiceOpdPending = serviceOpdPending,
                ServiceLabDone = serviceLabDone,
                ServiceLabPending = serviceLabPending,
                ServiceRadiologyDone = serviceRadiologyDone,
                ServiceRadiologyPending = serviceRadiologyPending,
                ServiceSurgeryDone = serviceSurgeryDone,
                ServiceSurgeryPending = serviceSurgeryPending,
                ServiceProcedureDone = serviceProcedureDone,
                ServiceProcedurePending = serviceProcedurePending,
                ServicePrescriptionDone = servicePrescriptionDone,
                ServicePrescriptionPending = servicePrescriptionPending,

                // Revenue breakdown
                RevenueBHYT = revenueBHYT,
                RevenueSelfPay = revenueSelfPay,
                RevenueOther = Math.Max(0, todayRevenue - revenueBHYT - revenueSelfPay)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetHospitalDashboardAsync");
            return new HospitalDashboardDto
            {
                ReportDate = reportDate,
                Trends = new List<DashboardTrendDto>()
            };
        }
    }

    public async Task<List<DepartmentStatisticsDto>> GetDepartmentStatisticsAsync(
        DateTime fromDate, DateTime toDate)
    {
        try
        {
            var from = fromDate.Date;
            var to = toDate.Date.AddDays(1);
            // QA-R4: Examinations.CreatedAt is UTC — VN day bounds via ReportPeriod.ToUtc (was a 7-hour shift).
            var fromUtc = ReportPeriod.ToUtc(from);
            var toUtc = ReportPeriod.ToUtc(to);

            var departments = await _context.Departments.AsNoTracking()
                .Where(d => d.IsActive && !d.IsDeleted)
                .OrderBy(d => d.DisplayOrder)
                .ToListAsync();

            // #195: 5 query gom theo khoa cho toàn bộ danh sách, thay vì 5 query/khoa.
            var deptIds = departments.Select(d => d.Id).ToList();

            var outpatientByDept = (await _context.Examinations
                    .Where(e => deptIds.Contains(e.DepartmentId) && e.CreatedAt >= fromUtc && e.CreatedAt < toUtc && e.Status != 5 && !e.IsDeleted)
                    .GroupBy(e => e.DepartmentId)
                    .Select(g => new { DeptId = g.Key, Count = g.Count() })
                    .ToListAsync())
                .ToDictionary(x => x.DeptId, x => x.Count);

            var admissionsByDept = (await _context.Admissions
                    .Where(a => deptIds.Contains(a.DepartmentId) && a.AdmissionDate >= from && a.AdmissionDate < to && !a.IsDeleted)
                    .GroupBy(a => a.DepartmentId)
                    .Select(g => new { DeptId = g.Key, Count = g.Count() })
                    .ToListAsync())
                .ToDictionary(x => x.DeptId, x => x.Count);

            var inpatientByDept = (await _context.Admissions
                    .Where(a => deptIds.Contains(a.DepartmentId) && a.Status == 0 && !a.IsDeleted)
                    .GroupBy(a => a.DepartmentId)
                    .Select(g => new { DeptId = g.Key, Count = g.Count() })
                    .ToListAsync())
                .ToDictionary(x => x.DeptId, x => x.Count);

            var dischargesByDept = (await _context.Discharges
                    .Where(d => deptIds.Contains(d.Admission.DepartmentId) && d.DischargeDate >= from && d.DischargeDate < to && !d.IsDeleted)
                    .GroupBy(d => d.Admission.DepartmentId)
                    .Select(g => new { DeptId = g.Key, Count = g.Count() })
                    .ToListAsync())
                .ToDictionary(x => x.DeptId, x => x.Count);

            // QA-R4: net cash on the BUSINESS date with the shared rule (deposit refunds excluded — Khoa Ngoại
            // showed −4.180.000đ for September). Was UTC CreatedAt and every refund slip subtracted.
            var revenueByDept = (await _context.Receipts
                    .Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId != null
                        && deptIds.Contains(r.MedicalRecord.DepartmentId.Value)
                        && r.ReceiptDate >= from && r.ReceiptDate < to && !r.IsDeleted)
                    .Where(ReportPeriod.CashReceipt)
                    .GroupBy(r => r.MedicalRecord!.DepartmentId!.Value)
                    .Select(g => new { DeptId = g.Key, Total = g.Sum(r => (decimal?)(r.ReceiptType == 3 ? -r.FinalAmount : r.FinalAmount)) })
                    .ToListAsync())
                .ToDictionary(x => x.DeptId, x => x.Total ?? 0);

            var result = new List<DepartmentStatisticsDto>();
            foreach (var dept in departments)
            {
                result.Add(new DepartmentStatisticsDto
                {
                    DepartmentId = dept.Id,
                    DepartmentName = dept.DepartmentName,
                    OutpatientCount = outpatientByDept.TryGetValue(dept.Id, out var outpatient) ? outpatient : 0,
                    InpatientCount = inpatientByDept.TryGetValue(dept.Id, out var inpatient) ? inpatient : 0,
                    AdmissionCount = admissionsByDept.TryGetValue(dept.Id, out var admissions) ? admissions : 0,
                    DischargeCount = dischargesByDept.TryGetValue(dept.Id, out var discharges) ? discharges : 0,
                    Revenue = revenueByDept.TryGetValue(dept.Id, out var revenue) ? revenue : 0
                });
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentStatisticsAsync");
            return new List<DepartmentStatisticsDto>();
        }
    }

    #endregion
}
