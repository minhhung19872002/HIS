using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class MedicalRecordPlanningService
{
    // ========================================================================
    // Outpatient Records
    // ========================================================================

    public async Task<PagedOutpatientRecordResult> GetOutpatientRecordsAsync(OutpatientRecordSearchDto search)
    {
        try
        {
            var query = _context.Set<Examination>()
                .Include(e => e.MedicalRecord).ThenInclude(r => r.Patient)
                .Include(e => e.Department)
                .Include(e => e.Doctor)
                .Where(e => !e.IsDeleted && e.MedicalRecord.TreatmentType == 1) // Outpatient
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var kw = search.Keyword.Trim().ToLower();
                query = query.Where(e =>
                    e.MedicalRecord.Patient.FullName.ToLower().Contains(kw) ||
                    e.MedicalRecord.Patient.PatientCode.ToLower().Contains(kw) ||
                    e.MedicalRecord.MedicalRecordCode.ToLower().Contains(kw));
            }

            // QA-R2: lọc trên đúng ngày khám hiển thị (StartTime ?? CreatedAt). Điều kiện OR cũ để lọt
            // lượt khám có StartTime ngoài khoảng nhưng CreatedAt trong khoảng (và ngược lại).
            if (search.FromDate.HasValue)
            {
                var from = search.FromDate.Value.Date;
                query = query.Where(e => (e.StartTime ?? e.CreatedAt) >= from);
            }
            if (search.ToDate.HasValue)
            {
                var toExclusive = search.ToDate.Value.Date.AddDays(1);
                query = query.Where(e => (e.StartTime ?? e.CreatedAt) < toExclusive);
            }
            if (search.DepartmentId.HasValue)
                query = query.Where(e => e.DepartmentId == search.DepartmentId.Value);
            if (search.Status.HasValue)
                query = query.Where(e => e.Status == search.Status.Value);

            var total = await query.CountAsync();
            var records = await query
                .OrderByDescending(e => e.StartTime ?? e.CreatedAt)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .Select(e => new
                {
                    e.Id,
                    RecordCode = e.MedicalRecord.MedicalRecordCode,
                    PatientCode = e.MedicalRecord.Patient.PatientCode,
                    PatientName = e.MedicalRecord.Patient.FullName,
                    Gender = e.MedicalRecord.Patient.Gender,
                    DateOfBirth = e.MedicalRecord.Patient.DateOfBirth,
                    DepartmentName = e.Department.DepartmentName,
                    DoctorName = e.Doctor != null ? e.Doctor.FullName : "",
                    e.MainDiagnosis,
                    e.MainIcdCode,
                    ExaminationDate = e.StartTime ?? e.CreatedAt,
                    e.Status,
                    e.ConclusionType,
                    e.ConclusionNote,
                })
                .ToListAsync();

            var items = records.Select(e => new OutpatientRecordDto
            {
                Id = e.Id,
                RecordCode = e.RecordCode,
                PatientCode = e.PatientCode,
                PatientName = e.PatientName,
                // Patient.Gender: 1 Nam · 2 Nữ · 3 Khác (mã cũ đọc 0 = Nam, 1 = Nữ ⇒ đảo giới tính).
                Gender = e.Gender == 1 ? "Nam" : (e.Gender == 2 ? "Nu" : "Khac"),
                DateOfBirth = e.DateOfBirth,
                DepartmentName = e.DepartmentName,
                DoctorName = e.DoctorName,
                Diagnosis = e.MainDiagnosis,
                IcdCode = e.MainIcdCode,
                ExaminationDate = e.ExaminationDate,
                Status = e.Status,
                StatusName = GetExamStatusName(e.Status),
                ConclusionType = e.ConclusionType,
                ConclusionNote = e.ConclusionNote,
            }).ToList();

            return new PagedOutpatientRecordResult { TotalCount = total, Items = items };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error querying outpatient records");
            throw;
        }
    }
}
