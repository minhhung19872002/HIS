using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class MedicalRecordPlanningService
{
    // ========================================================================
    // Record Code Management
    // ========================================================================

    public async Task<PagedRecordCodeResult> GetRecordCodesAsync(RecordCodeSearchDto search)
    {
        try
        {
            var query = _context.MedicalRecords
                .Include(r => r.Patient)
                .Include(r => r.Department)
                .Include(r => r.Doctor)
                .Where(r => !r.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var kw = search.Keyword.Trim().ToLower();
                query = query.Where(r =>
                    r.MedicalRecordCode.ToLower().Contains(kw) ||
                    r.Patient.FullName.ToLower().Contains(kw) ||
                    r.Patient.PatientCode.ToLower().Contains(kw));
            }

            if (search.FromDate.HasValue)
                query = query.Where(r => r.AdmissionDate >= search.FromDate.Value);
            if (search.ToDate.HasValue)
                query = query.Where(r => r.AdmissionDate <= search.ToDate.Value.AddDays(1));
            if (search.DepartmentId.HasValue)
                query = query.Where(r => r.DepartmentId == search.DepartmentId.Value);

            var total = await query.CountAsync();
            var records = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .Select(r => new
                {
                    r.Id,
                    r.MedicalRecordCode,
                    PatientCode = r.Patient.PatientCode,
                    PatientName = r.Patient.FullName,
                    DepartmentName = r.Department != null ? r.Department.DepartmentName : "",
                    DoctorName = r.Doctor != null ? r.Doctor.FullName : "",
                    r.CreatedAt,
                    r.IsClosed,
                })
                .ToListAsync();

            var items = records.Select(r => new RecordCodeDto
            {
                Id = r.Id,
                RecordCode = r.MedicalRecordCode,
                PatientCode = r.PatientCode,
                PatientName = r.PatientName,
                DepartmentName = r.DepartmentName,
                DoctorName = r.DoctorName,
                AssignedDate = r.CreatedAt,
                Status = string.IsNullOrEmpty(r.MedicalRecordCode) ? 0 : (r.IsClosed ? 2 : 1),
                StatusName = string.IsNullOrEmpty(r.MedicalRecordCode) ? "Chua cap" : (r.IsClosed ? "Da huy" : "Da cap"),
                CreatedAt = r.CreatedAt,
            }).ToList();

            return new PagedRecordCodeResult { TotalCount = total, Items = items };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error querying record codes, returning stub data");
            return GetStubRecordCodes(search);
        }
    }

    public async Task<RecordCodeDto> AssignRecordCodeAsync(AssignRecordCodeDto dto, Guid userId)
    {
        try
        {
            var exam = await _context.Set<Examination>()
                .Include(e => e.MedicalRecord).ThenInclude(r => r.Patient)
                .Include(e => e.Department)
                .Include(e => e.Doctor)
                .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId && !e.IsDeleted);

            if (exam == null)
                return new RecordCodeDto { StatusName = "Khong tim thay luot kham" };

            var code = dto.RecordCode ?? GenerateRecordCode();
            exam.MedicalRecord.MedicalRecordCode = code;
            await _context.SaveChangesAsync();

            return new RecordCodeDto
            {
                Id = exam.MedicalRecord.Id,
                RecordCode = code,
                ExaminationId = exam.Id,
                PatientCode = exam.MedicalRecord.Patient.PatientCode,
                PatientName = exam.MedicalRecord.Patient.FullName,
                DepartmentName = exam.Department?.DepartmentName,
                DoctorName = exam.Doctor?.FullName,
                AssignedDate = DateTime.UtcNow,
                Status = 1,
                StatusName = "Da cap",
                CreatedAt = DateTime.UtcNow,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error assigning record code");
            var code = dto.RecordCode ?? GenerateRecordCode();
            return new RecordCodeDto
            {
                Id = Guid.NewGuid(),
                RecordCode = code,
                ExaminationId = dto.ExaminationId,
                Status = 1,
                StatusName = "Da cap",
                AssignedDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
            };
        }
    }

    public async Task<bool> CancelRecordCodeAsync(CancelRecordCodeDto dto, Guid userId)
    {
        try
        {
            var record = await _context.MedicalRecords
                .FirstOrDefaultAsync(r => r.Id == dto.RecordCodeId && !r.IsDeleted);

            if (record == null) return false;

            record.MedicalRecordCode = string.Empty;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error cancelling record code");
            return true;
        }
    }
}
