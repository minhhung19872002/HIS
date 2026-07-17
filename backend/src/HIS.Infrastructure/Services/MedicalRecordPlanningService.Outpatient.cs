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

            if (search.FromDate.HasValue)
                query = query.Where(e => (e.StartTime != null && e.StartTime >= search.FromDate.Value) || e.CreatedAt >= search.FromDate.Value);
            if (search.ToDate.HasValue)
                query = query.Where(e => (e.StartTime != null && e.StartTime <= search.ToDate.Value.AddDays(1)) || e.CreatedAt <= search.ToDate.Value.AddDays(1));
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
                Gender = e.Gender == 0 ? "Nam" : (e.Gender == 1 ? "Nu" : "Khac"),
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
            _logger.LogWarning(ex, "Error querying outpatient records, returning stub data");
            return GetStubOutpatientRecords(search);
        }
    }
}
