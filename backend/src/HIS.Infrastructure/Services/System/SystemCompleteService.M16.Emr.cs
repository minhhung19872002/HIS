using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
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
                    ArchiveCode = $"LT-{DateTime.Now:yyyyMMdd}-{new Random().Next(1000, 9999)}",
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
                    entity.ArchivedDate = DateTime.UtcNow;
                }
                entity.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
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
                RequestCode = $"MT-{DateTime.Now:yyyyMMdd}-{new Random().Next(1000, 9999)}",
                MedicalRecordArchiveId = dto.MedicalRecordArchiveId,
                RequestedById = Guid.Empty,
                RequestDate = DateTime.UtcNow,
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
            _logger.LogError(ex, "Error in CreateBorrowRequestAsync");
            return new MedicalRecordBorrowRequestDto { Id = Guid.NewGuid(), Status = "Error" };
        }
    }

    public async Task<bool> ApproveBorrowRequestAsync(Guid requestId)
    {
        try
        {
            var request = await _context.MedicalRecordBorrowRequests.FindAsync(requestId);
            if (request == null || request.Status != 0) return false;
            request.Status = 1;
            request.ApprovedDate = DateTime.UtcNow;
            request.ApprovedById = (Guid?)null;
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
            request.ApprovedDate = DateTime.UtcNow;
            request.ApprovedById = (Guid?)null;
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
            request.BorrowedDate = DateTime.UtcNow;
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
            request.ReturnedDate = DateTime.UtcNow;
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

            var todayExams = await _context.Examinations
                .CountAsync(e => e.CreatedAt >= todayStart && e.CreatedAt < todayEnd);

            var todayAdmissions = await _context.Admissions
                .CountAsync(a => a.AdmissionDate >= todayStart && a.AdmissionDate < todayEnd);

            var currentInpatients = await _context.Admissions
                .CountAsync(a => a.Status == 0); // 0 = Dang dieu tri

            var totalBeds = await _context.Beds.CountAsync(b => b.IsActive);

            var todayDischarges = await _context.Discharges
                .CountAsync(d => d.DischargeDate >= todayStart && d.DischargeDate < todayEnd);

            var todaySurgeries = await _context.ServiceRequests
                .CountAsync(sr => sr.RequestType == 3 && sr.CreatedAt >= todayStart && sr.CreatedAt < todayEnd); // 3 = Surgery

            // Emergency = QueueTickets with QueueType 3 (Emergency)
            var todayEmergencies = await _context.QueueTickets
                .CountAsync(q => q.QueueType == 3 && q.CreatedAt >= todayStart && q.CreatedAt < todayEnd);

            var todayRevenue = await _context.Receipts
                .Where(r => r.CreatedAt >= todayStart && r.CreatedAt < todayEnd && r.Status == 1)
                .SumAsync(r => (decimal?)r.Amount) ?? 0;

            // Service status breakdown - OPD examinations
            var serviceOpdDone = await _context.Examinations
                .CountAsync(e => e.CreatedAt >= todayStart && e.CreatedAt < todayEnd && e.Status >= 3);
            var serviceOpdPending = await _context.Examinations
                .CountAsync(e => e.CreatedAt >= todayStart && e.CreatedAt < todayEnd && e.Status < 3);

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
                .Where(r => r.CreatedAt >= todayStart && r.CreatedAt < todayEnd && r.Status == 1
                    && r.MedicalRecord != null && r.MedicalRecord.PatientType == 1)
                .SumAsync(r => (decimal?)r.Amount) ?? 0;
            var revenueSelfPay = await _context.Receipts
                .Where(r => r.CreatedAt >= todayStart && r.CreatedAt < todayEnd && r.Status == 1
                    && (r.MedicalRecord == null || r.MedicalRecord.PatientType != 1))
                .SumAsync(r => (decimal?)r.Amount) ?? 0;

            // 7-day trends
            var trendStart = todayStart.AddDays(-6);
            var trends = new List<DashboardTrendDto>();
            for (var d = trendStart; d <= todayStart; d = d.AddDays(1))
            {
                var dEnd = d.AddDays(1);
                trends.Add(new DashboardTrendDto
                {
                    Date = d,
                    Outpatients = await _context.Examinations.CountAsync(e => e.CreatedAt >= d && e.CreatedAt < dEnd),
                    Admissions = await _context.Admissions.CountAsync(a => a.AdmissionDate >= d && a.AdmissionDate < dEnd),
                    Revenue = await _context.Receipts.Where(r => r.CreatedAt >= d && r.CreatedAt < dEnd && r.Status == 1).SumAsync(r => (decimal?)r.Amount) ?? 0
                });
            }

            return new HospitalDashboardDto
            {
                ReportDate = reportDate,
                TodayOutpatients = todayExams,
                TodayAdmissions = todayAdmissions,
                CurrentInpatients = currentInpatients,
                AvailableBeds = Math.Max(0, totalBeds - currentInpatients),
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

            var departments = await _context.Departments.AsNoTracking()
                .Where(d => d.IsActive)
                .OrderBy(d => d.DisplayOrder)
                .ToListAsync();

            var result = new List<DepartmentStatisticsDto>();
            foreach (var dept in departments)
            {
                var outpatient = await _context.Examinations
                    .CountAsync(e => e.DepartmentId == dept.Id && e.CreatedAt >= from && e.CreatedAt < to);
                var admissions = await _context.Admissions
                    .CountAsync(a => a.DepartmentId == dept.Id && a.AdmissionDate >= from && a.AdmissionDate < to);
                var inpatient = await _context.Admissions
                    .CountAsync(a => a.DepartmentId == dept.Id && a.Status == 0);
                var discharges = await _context.Discharges
                    .CountAsync(d => d.Admission.DepartmentId == dept.Id && d.DischargeDate >= from && d.DischargeDate < to);
                var revenue = await _context.Receipts
                    .Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == dept.Id && r.CreatedAt >= from && r.CreatedAt < to && r.Status == 1)
                    .SumAsync(r => (decimal?)r.Amount) ?? 0;

                result.Add(new DepartmentStatisticsDto
                {
                    DepartmentId = dept.Id,
                    DepartmentName = dept.DepartmentName,
                    OutpatientCount = outpatient,
                    InpatientCount = inpatient,
                    AdmissionCount = admissions,
                    DischargeCount = discharges,
                    Revenue = revenue
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

    // 16.4 Bao cao kham benh
    public async Task<List<ExaminationStatisticsDto>> GetExaminationStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? doctorId = null)
    {
        try
        {
            var query = _context.Examinations.AsNoTracking()
                .Include(e => e.Department)
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate);
            if (departmentId.HasValue)
                query = query.Where(e => e.DepartmentId == departmentId.Value);
            if (doctorId.HasValue)
                query = query.Where(e => e.DoctorId == doctorId.Value);

            var result = await query
                .GroupBy(e => new { e.DepartmentId, e.Department.DepartmentName, Date = e.CreatedAt.Date })
                .Select(g => new ExaminationStatisticsDto
                {
                    Date = g.Key.Date,
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalExaminations = g.Count(),
                    NewPatients = g.Count(e => e.ExaminationType == 1),
                    FollowUpPatients = g.Count(e => e.ExaminationType == 2 || e.ExaminationType == 3)
                })
                .OrderBy(x => x.Date).ThenBy(x => x.DepartmentName)
                .ToListAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExaminationStatisticsAsync");
            return new List<ExaminationStatisticsDto>();
        }
    }

    // 16.5 Bao cao nhap vien
    public async Task<List<AdmissionStatisticsDto>> GetAdmissionStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string admissionSource = null)
    {
        try
        {
            var query = _context.Admissions.AsNoTracking()
                .Include(a => a.Department)
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate);
            if (departmentId.HasValue)
                query = query.Where(a => a.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(admissionSource))
                query = query.Where(a => a.ReferralSource != null && a.ReferralSource.Contains(admissionSource));

            var result = await query
                .GroupBy(a => new { a.DepartmentId, a.Department.DepartmentName, Date = a.AdmissionDate.Date })
                .Select(g => new AdmissionStatisticsDto
                {
                    Date = g.Key.Date,
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalAdmissions = g.Count(),
                    EmergencyAdmissions = g.Count(a => a.AdmissionType == 1),
                    ElectiveAdmissions = g.Count(a => a.AdmissionType == 3)
                })
                .OrderBy(x => x.Date).ThenBy(x => x.DepartmentName)
                .ToListAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAdmissionStatisticsAsync");
            return new List<AdmissionStatisticsDto>();
        }
    }

    // 16.6 Bao cao xuat vien
    public async Task<List<DischargeStatisticsDto>> GetDischargeStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string dischargeType = null)
    {
        try
        {
            var query = _context.Discharges.AsNoTracking()
                .Include(d => d.Admission).ThenInclude(a => a.Department)
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate);
            if (departmentId.HasValue)
                query = query.Where(d => d.Admission.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(dischargeType) && int.TryParse(dischargeType, out var dt))
                query = query.Where(d => d.DischargeType == dt);

            var result = await query
                .GroupBy(d => new { d.Admission.DepartmentId, d.Admission.Department.DepartmentName, Date = d.DischargeDate.Date })
                .Select(g => new DischargeStatisticsDto
                {
                    Date = g.Key.Date,
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalDischarges = g.Count(),
                    RecoveredCount = g.Count(d => d.DischargeCondition == 1),
                    ImprovedCount = g.Count(d => d.DischargeCondition == 2),
                    DeathCount = g.Count(d => d.DischargeCondition == 5 || d.DischargeType == 4)
                })
                .OrderBy(x => x.Date).ThenBy(x => x.DepartmentName)
                .ToListAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDischargeStatisticsAsync");
            return new List<DischargeStatisticsDto>();
        }
    }

    // 16.7 Bao cao tu vong
    public async Task<List<MortalityStatisticsDto>> GetMortalityStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var deathDischarges = _context.Discharges.AsNoTracking()
                .Include(d => d.Admission).ThenInclude(a => a.Department)
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate)
                .Where(d => d.DischargeType == 4 || d.DischargeCondition == 5);
            if (departmentId.HasValue)
                deathDischarges = deathDischarges.Where(d => d.Admission.DepartmentId == departmentId.Value);

            var totalAdmissions = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .Where(a => !departmentId.HasValue || a.DepartmentId == departmentId.Value)
                .CountAsync();

            var result = await deathDischarges
                .GroupBy(d => new { d.Admission.DepartmentId, d.Admission.Department.DepartmentName })
                .Select(g => new MortalityStatisticsDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalDeaths = g.Count(),
                    DeathWithin24Hours = g.Count(d =>
                        EF.Functions.DateDiffHour(d.Admission.AdmissionDate, d.DischargeDate) <= 24),
                    DeathAfter24Hours = g.Count(d =>
                        EF.Functions.DateDiffHour(d.Admission.AdmissionDate, d.DischargeDate) > 24),
                    MortalityRate = 0
                })
                .OrderByDescending(x => x.TotalDeaths)
                .ToListAsync();

            foreach (var item in result)
            {
                if (totalAdmissions > 0)
                    item.MortalityRate = Math.Round((double)item.TotalDeaths / totalAdmissions * 100, 2);
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMortalityStatisticsAsync");
            return new List<MortalityStatisticsDto>();
        }
    }

    // 16.8 Bao cao benh theo ICD-10
    public async Task<List<DiseaseStatisticsDto>> GetDiseaseStatisticsAsync(
        DateTime fromDate, DateTime toDate, string icdChapter = null, Guid? departmentId = null)
    {
        try
        {
            var examQuery = _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .Where(e => e.MainIcdCode != null && e.MainIcdCode != "");
            if (departmentId.HasValue)
                examQuery = examQuery.Where(e => e.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(icdChapter))
                examQuery = examQuery.Where(e => e.MainIcdCode.StartsWith(icdChapter));

            var examStats = await examQuery
                .GroupBy(e => new { e.MainIcdCode, e.MainDiagnosis })
                .Select(g => new { g.Key.MainIcdCode, g.Key.MainDiagnosis, Count = g.Count() })
                .ToListAsync();

            var admissionQuery = _context.Admissions.AsNoTracking()
                .Include(a => a.MedicalRecord)
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .Where(a => a.MedicalRecord.MainIcdCode != null && a.MedicalRecord.MainIcdCode != "");
            if (departmentId.HasValue)
                admissionQuery = admissionQuery.Where(a => a.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(icdChapter))
                admissionQuery = admissionQuery.Where(a => a.MedicalRecord.MainIcdCode.StartsWith(icdChapter));

            var admissionStats = await admissionQuery
                .GroupBy(a => new { a.MedicalRecord.MainIcdCode, a.MedicalRecord.MainDiagnosis })
                .Select(g => new { g.Key.MainIcdCode, g.Key.MainDiagnosis, Count = g.Count() })
                .ToListAsync();

            var allIcds = examStats.Select(x => x.MainIcdCode)
                .Union(admissionStats.Select(x => x.MainIcdCode))
                .Distinct();

            var result = allIcds.Select(icd =>
            {
                var exam = examStats.FirstOrDefault(x => x.MainIcdCode == icd);
                var adm = admissionStats.FirstOrDefault(x => x.MainIcdCode == icd);
                var outpatient = exam?.Count ?? 0;
                var inpatient = adm?.Count ?? 0;
                return new DiseaseStatisticsDto
                {
                    IcdCode = icd,
                    IcdName = exam?.MainDiagnosis ?? adm?.MainDiagnosis ?? "",
                    TotalCases = outpatient + inpatient,
                    OutpatientCases = outpatient,
                    InpatientCases = inpatient
                };
            })
            .OrderByDescending(x => x.TotalCases)
            .ToList();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDiseaseStatisticsAsync");
            return new List<DiseaseStatisticsDto>();
        }
    }

    // 16.9 Bao cao hoat dong khoa
    public async Task<List<DepartmentActivityReportDto>> GetDepartmentActivityReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var deptQuery = _context.Departments.AsNoTracking()
                .Where(d => d.IsActive && !d.IsDeleted);
            if (departmentId.HasValue)
                deptQuery = deptQuery.Where(d => d.Id == departmentId.Value);

            var departments = await deptQuery.Select(d => new { d.Id, d.DepartmentName }).ToListAsync();

            var examCounts = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .GroupBy(e => e.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var admissionCounts = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .GroupBy(a => a.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var surgeryCounts = await _context.SurgeryRequests.AsNoTracking()
                .Include(s => s.MedicalRecord)
                .Where(s => s.CreatedAt >= fromDate && s.CreatedAt <= toDate)
                .Where(s => s.Status == 3)
                .Where(s => s.MedicalRecord != null && s.MedicalRecord.DepartmentId != null)
                .GroupBy(s => s.MedicalRecord.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            // #14b: model 1 ServiceRequests (RequestType=1 XN, loại hủy) thay LabRequests (model 2 chết)
            var labCounts = await _context.ServiceRequests.AsNoTracking()
                .Where(l => l.CreatedAt >= fromDate && l.CreatedAt <= toDate && l.RequestType == 1 && l.Status != 4)
                .GroupBy(l => (Guid?)l.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var revenueSums = await _context.Receipts.AsNoTracking()
                .Where(r => r.CreatedAt >= fromDate && r.CreatedAt <= toDate)
                .Include(r => r.MedicalRecord)
                .Where(r => r.MedicalRecord.DepartmentId != null)
                .GroupBy(r => r.MedicalRecord.DepartmentId)
                .Select(g => new { DeptId = g.Key, Sum = g.Sum(r => r.FinalAmount) })
                .ToListAsync();

            var result = departments.Select(d => new DepartmentActivityReportDto
            {
                DepartmentId = d.Id,
                DepartmentName = d.DepartmentName,
                OutpatientVisits = examCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                InpatientAdmissions = admissionCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                Surgeries = surgeryCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                LabTests = labCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                TotalRevenue = revenueSums.FirstOrDefault(x => x.DeptId == d.Id)?.Sum ?? 0
            })
            .OrderByDescending(x => x.OutpatientVisits + x.InpatientAdmissions)
            .ToList();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentActivityReportAsync");
            return new List<DepartmentActivityReportDto>();
        }
    }

    // 16.10 Bao cao cong suat giuong benh
    public async Task<List<BedOccupancyReportDto>> GetBedOccupancyReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var bedQuery = _context.Beds.AsNoTracking()
                .Include(b => b.Room).ThenInclude(r => r.Department)
                .Where(b => b.IsActive);
            if (departmentId.HasValue)
                bedQuery = bedQuery.Where(b => b.Room.Department.Id == departmentId.Value);

            var beds = await bedQuery.ToListAsync();
            var occupiedBedIds = await _context.Set<BedAssignment>().AsNoTracking()
                .Where(ba => ba.Status == 0)
                .Select(ba => ba.BedId)
                .Distinct()
                .ToListAsync();

            var result = beds
                .GroupBy(b => new { b.Room.Department.Id, b.Room.Department.DepartmentName })
                .Select(g =>
                {
                    var total = g.Count();
                    var occupied = g.Count(b => occupiedBedIds.Contains(b.Id));
                    return new BedOccupancyReportDto
                    {
                        DepartmentId = g.Key.Id,
                        DepartmentName = g.Key.DepartmentName,
                        TotalBeds = total,
                        OccupiedBeds = occupied,
                        AvailableBeds = total - occupied,
                        OccupancyRate = total > 0 ? Math.Round((double)occupied / total * 100, 1) : 0
                    };
                })
                .OrderByDescending(x => x.OccupancyRate)
                .ToList();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBedOccupancyReportAsync");
            return new List<BedOccupancyReportDto>();
        }
    }

    // 16.11 Bao cao A1-A2-A3 (BYT)
    public async Task<BYTReportDto> GetBYTReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var hospitalConfig = await _context.SystemConfigs.AsNoTracking()
                .Where(c => c.ConfigKey == "HospitalName" || c.ConfigKey == "HospitalCode")
                .ToListAsync();

            var totalOutpatients = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .CountAsync();

            var totalInpatients = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .CountAsync();

            var totalBeds = await _context.Beds.AsNoTracking()
                .Where(b => b.IsActive)
                .CountAsync();

            return new BYTReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                HospitalName = hospitalConfig.FirstOrDefault(c => c.ConfigKey == "HospitalName")?.ConfigValue ?? "BỆNH VIỆN ĐA KHOA",
                HospitalCode = hospitalConfig.FirstOrDefault(c => c.ConfigKey == "HospitalCode")?.ConfigValue ?? "",
                TotalOutpatients = totalOutpatients,
                TotalInpatients = totalInpatients,
                TotalBeds = totalBeds
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBYTReportAsync");
            return new BYTReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                HospitalName = string.Empty,
                HospitalCode = string.Empty,
                TotalOutpatients = 0,
                TotalInpatients = 0,
                TotalBeds = 0
            };
        }
    }

    // 16.12 KPI benh vien
    public async Task<List<HospitalKPIDto>> GetHospitalKPIsAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var totalExams = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate).CountAsync();
            var completedExams = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate && e.Status == 4).CountAsync();

            var totalAdmissions = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate).CountAsync();
            var discharges = await _context.Discharges.AsNoTracking()
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate).ToListAsync();
            var deaths = discharges.Count(d => d.DischargeType == 4 || d.DischargeCondition == 5);

            var totalBeds = await _context.Beds.AsNoTracking().Where(b => b.IsActive).CountAsync();
            var occupiedBeds = await _context.Set<BedAssignment>().AsNoTracking()
                .Where(ba => ba.Status == 0).Select(ba => ba.BedId).Distinct().CountAsync();

            var avgLos = totalAdmissions > 0
                ? await _context.Discharges.AsNoTracking()
                    .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate)
                    .Select(d => EF.Functions.DateDiffDay(d.Admission.AdmissionDate, d.DischargeDate))
                    .DefaultIfEmpty(0)
                    .AverageAsync()
                : 0;

            var kpis = new List<HospitalKPIDto>
            {
                new HospitalKPIDto
                {
                    KPIName = "Tỷ lệ hoàn thành khám",
                    KPICategory = "Khám bệnh",
                    TargetValue = 95,
                    ActualValue = totalExams > 0 ? Math.Round((decimal)completedExams / totalExams * 100, 1) : 0,
                    Unit = "%"
                },
                new HospitalKPIDto
                {
                    KPIName = "Công suất giường bệnh",
                    KPICategory = "Nội trú",
                    TargetValue = 85,
                    ActualValue = totalBeds > 0 ? Math.Round((decimal)occupiedBeds / totalBeds * 100, 1) : 0,
                    Unit = "%"
                },
                new HospitalKPIDto
                {
                    KPIName = "Số ngày điều trị trung bình",
                    KPICategory = "Nội trú",
                    TargetValue = 7,
                    ActualValue = Math.Round((decimal)avgLos, 1),
                    Unit = "ngày"
                },
                new HospitalKPIDto
                {
                    KPIName = "Tỷ lệ tử vong",
                    KPICategory = "Chất lượng",
                    TargetValue = 1,
                    ActualValue = totalAdmissions > 0 ? Math.Round((decimal)deaths / totalAdmissions * 100, 2) : 0,
                    Unit = "%"
                },
                new HospitalKPIDto
                {
                    KPIName = "Tổng lượt khám",
                    KPICategory = "Khám bệnh",
                    TargetValue = 1000,
                    ActualValue = totalExams,
                    Unit = "lượt"
                },
                new HospitalKPIDto
                {
                    KPIName = "Tổng lượt nhập viện",
                    KPICategory = "Nội trú",
                    TargetValue = 200,
                    ActualValue = totalAdmissions,
                    Unit = "lượt"
                }
            };

            foreach (var kpi in kpis)
            {
                kpi.Achievement = kpi.TargetValue > 0
                    ? Math.Round((double)(kpi.ActualValue / kpi.TargetValue * 100), 1)
                    : 0;
            }
            return kpis;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetHospitalKPIsAsync");
            return new List<HospitalKPIDto>();
        }
    }

    public async Task<byte[]> PrintStatisticsReportAsync(StatisticsReportRequest request)
    {
        try
        {
            string[] headers;
            var rows = new List<string[]>();
            var title = "BÁO CÁO THỐNG KÊ";

            switch (request.ReportType?.ToLower())
            {
                case "examination":
                    title = "BÁO CÁO KHÁM BỆNH";
                    headers = new[] { "Ngày", "Khoa", "Tổng khám", "Bệnh mới", "Tái khám" };
                    var exams = await GetExaminationStatisticsAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var e in exams)
                        rows.Add(new[] { e.Date.ToString("dd/MM/yyyy"), e.DepartmentName ?? "", e.TotalExaminations.ToString(), e.NewPatients.ToString(), e.FollowUpPatients.ToString() });
                    break;
                case "admission":
                    title = "BÁO CÁO NHẬP VIỆN";
                    headers = new[] { "Ngày", "Khoa", "Tổng nhập", "Cấp cứu", "Điều trị" };
                    var adms = await GetAdmissionStatisticsAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var a in adms)
                        rows.Add(new[] { a.Date.ToString("dd/MM/yyyy"), a.DepartmentName ?? "", a.TotalAdmissions.ToString(), a.EmergencyAdmissions.ToString(), a.ElectiveAdmissions.ToString() });
                    break;
                case "discharge":
                    title = "BÁO CÁO XUẤT VIỆN";
                    headers = new[] { "Ngày", "Khoa", "Tổng xuất", "Khỏi", "Đỡ", "Tử vong" };
                    var discs = await GetDischargeStatisticsAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var d in discs)
                        rows.Add(new[] { d.Date.ToString("dd/MM/yyyy"), d.DepartmentName ?? "", d.TotalDischarges.ToString(), d.RecoveredCount.ToString(), d.ImprovedCount.ToString(), d.DeathCount.ToString() });
                    break;
                case "bed":
                    title = "BÁO CÁO CÔNG SUẤT GIƯỜNG";
                    headers = new[] { "Khoa", "Tổng giường", "Đang dùng", "Còn trống", "Tỷ lệ (%)" };
                    var beds = await GetBedOccupancyReportAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var b in beds)
                        rows.Add(new[] { b.DepartmentName ?? "", b.TotalBeds.ToString(), b.OccupiedBeds.ToString(), b.AvailableBeds.ToString(), b.OccupancyRate.ToString("0.0") });
                    break;
                default:
                    title = "BÁO CÁO HOẠT ĐỘNG KHOA";
                    headers = new[] { "Khoa", "Ngoại trú", "Nội trú", "Phẫu thuật", "Xét nghiệm", "Doanh thu" };
                    var acts = await GetDepartmentActivityReportAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var a in acts)
                        rows.Add(new[] { a.DepartmentName ?? "", a.OutpatientVisits.ToString(), a.InpatientAdmissions.ToString(), a.Surgeries.ToString(), a.LabTests.ToString(), a.TotalRevenue.ToString("#,##0") });
                    break;
            }

            var subtitle = $"Từ {request.FromDate:dd/MM/yyyy} đến {request.ToDate:dd/MM/yyyy}";
            var html = PdfTemplateHelper.BuildTableReport(title, subtitle, DateTime.Now, headers, rows);
            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in PrintStatisticsReportAsync");
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> ExportStatisticsReportToExcelAsync(StatisticsReportRequest request)
    {
        // Export as HTML table that can be opened in Excel
        var bytes = await PrintStatisticsReportAsync(request);
        return bytes;
    }

    #endregion
}
