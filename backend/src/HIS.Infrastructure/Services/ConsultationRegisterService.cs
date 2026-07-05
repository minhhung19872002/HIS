using HIS.Application.Common;
using HIS.Application.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic sổ hội chẩn + trích biên bản (N1.20) — tách khỏi ConsultationRegisterController (#202 thin-controller).
/// Behavior-preserving: mọi query/Include/projection/response shape + chuỗi tiếng Việt giữ nguyên.
/// Return map về ServiceOutcome.
/// </summary>
public class ConsultationRegisterService : IConsultationRegisterService
{
    private readonly HISDbContext _db;
    public ConsultationRegisterService(HISDbContext db) { _db = db; }

    public async Task<ServiceOutcome> SearchAsync(
        DateTime? fromDate, DateTime? toDate,
        int? consultationType, string? keyword, Guid? departmentId)
    {
        var from = fromDate ?? DateTime.Today.AddDays(-30);
        var to = (toDate ?? DateTime.Today).AddDays(1);

        var q = _db.Set<Core.Entities.ConsultationRecord>()
            .Include(c => c.Examination).ThenInclude(e => e.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(c => c.Examination).ThenInclude(e => e.Department)
            .Include(c => c.PresidedBy)
            .Include(c => c.Secretary)
            .Where(c => c.ConsultationDate >= from && c.ConsultationDate < to);
        if (consultationType.HasValue) q = q.Where(c => c.ConsultationType == consultationType.Value);
        if (departmentId.HasValue) q = q.Where(c => c.Examination.DepartmentId == departmentId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(c =>
                c.Examination.MedicalRecord.Patient.FullName.Contains(kw)
                || c.Examination.MedicalRecord.Patient.PatientCode.Contains(kw)
                || (c.Reason != null && c.Reason.Contains(kw))
                || (c.Conclusion != null && c.Conclusion.Contains(kw)));
        }

        var list = await q.OrderByDescending(c => c.ConsultationDate).Take(500).ToListAsync();
        return ServiceOutcome.Ok(list.Select(c => new
        {
            c.Id,
            c.ConsultationDate,
            c.ConsultationType,
            ConsultationTypeName = c.ConsultationType switch
            {
                1 => "Hội chẩn khoa", 2 => "Hội chẩn liên khoa", 3 => "Hội chẩn bệnh viện", _ => "?",
            },
            c.Reason,
            c.Summary,
            c.Conclusion,
            c.TreatmentPlan,
            PresidedBy = c.PresidedBy != null ? c.PresidedBy.FullName : null,
            Secretary = c.Secretary != null ? c.Secretary.FullName : null,
            c.Participants,
            PatientCode = c.Examination.MedicalRecord.Patient.PatientCode,
            PatientName = c.Examination.MedicalRecord.Patient.FullName,
            DepartmentName = c.Examination.Department != null ? c.Examination.Department.DepartmentName : null,
            c.ExaminationId,
        }));
    }

    public async Task<ServiceOutcome> GetByIdAsync(Guid id)
    {
        var c = await _db.Set<Core.Entities.ConsultationRecord>()
            .Include(x => x.Examination).ThenInclude(e => e.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(x => x.Examination).ThenInclude(e => e.Department)
            .Include(x => x.PresidedBy)
            .Include(x => x.Secretary)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (c == null) return ServiceOutcome.NotFound();

        // Parse participants JSON (if present) — best-effort
        List<string>? participants = null;
        if (!string.IsNullOrWhiteSpace(c.Participants))
        {
            try
            {
                participants = System.Text.Json.JsonSerializer.Deserialize<List<string>>(c.Participants);
            }
            catch
            {
                participants = c.Participants.Split(new[] { ',', ';', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim()).ToList();
            }
        }

        return ServiceOutcome.Ok(new
        {
            c.Id, c.ConsultationDate, c.ConsultationType,
            ConsultationTypeName = c.ConsultationType switch
            {
                1 => "Hội chẩn khoa", 2 => "Hội chẩn liên khoa", 3 => "Hội chẩn bệnh viện", _ => "?",
            },
            c.Reason, c.Summary, c.Conclusion, c.TreatmentPlan,
            PresidedByUserId = c.PresidedByUserId,
            PresidedBy = c.PresidedBy != null ? c.PresidedBy.FullName : null,
            SecretaryUserId = c.SecretaryUserId,
            Secretary = c.Secretary != null ? c.Secretary.FullName : null,
            Participants = participants,
            Patient = new
            {
                Code = c.Examination.MedicalRecord.Patient.PatientCode,
                Name = c.Examination.MedicalRecord.Patient.FullName,
                Gender = c.Examination.MedicalRecord.Patient.Gender,
                DateOfBirth = c.Examination.MedicalRecord.Patient.DateOfBirth,
                Address = c.Examination.MedicalRecord.Patient.Address,
                InsuranceNumber = c.Examination.MedicalRecord.Patient.InsuranceNumber,
            },
            Examination = new
            {
                c.ExaminationId,
                MedicalRecordCode = c.Examination.MedicalRecord.MedicalRecordCode,
                DepartmentName = c.Examination.Department != null ? c.Examination.Department.DepartmentName : null,
                MainDiagnosis = c.Examination.MedicalRecord.MainDiagnosis,
                MainIcdCode = c.Examination.MedicalRecord.MainIcdCode,
            },
        });
    }
}
