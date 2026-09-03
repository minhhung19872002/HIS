using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// wave-8a (2026-07-17): tach khoi InpatientCompleteService.Treatment.cs (PURE VERBATIM, khong doi logic).
public partial class InpatientCompleteService {
    #region 3.6 Treatment Information — Consultation & Nursing Care
    // #16: Hội chẩn nội trú — persist thật (trước đây stub in-memory, biên bản mất ngay sau khi tạo).
    public async Task<ConsultationDto> CreateConsultationAsync(CreateConsultationDto dto, Guid userId)
    {
        var now = DateTime.Now;
        var entity = new InpatientConsultation
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            ConsultationType = dto.ConsultationType,
            ConsultationDate = dto.ConsultationDate,
            ConsultationTime = dto.ConsultationTime,
            Location = dto.Location,
            ChairmanId = dto.ChairmanId,
            SecretaryId = dto.SecretaryId,
            Reason = dto.Reason,
            ClinicalFindings = dto.ClinicalFindings,
            Status = 0, // Chờ hội chẩn
            CreatedAt = now,
            CreatedBy = userId.ToString(),
            Members = (dto.MemberIds ?? new List<Guid>())
                .Where(mid => mid != Guid.Empty).Distinct()
                .Select(mid => new InpatientConsultationMember
                {
                    Id = Guid.NewGuid(), DoctorId = mid, CreatedAt = now, CreatedBy = userId.ToString()
                }).ToList()
        };
        _context.InpatientConsultations.Add(entity);
        await _context.SaveChangesAsync();
        return await LoadConsultationDtoAsync(entity.Id);
    }

    public async Task<ConsultationDto> UpdateConsultationAsync(Guid id, CreateConsultationDto dto, Guid userId)
    {
        var entity = await _context.InpatientConsultations.Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new InvalidOperationException("Không tìm thấy hội chẩn");

        var now = DateTime.Now;
        entity.ConsultationType = dto.ConsultationType;
        entity.ConsultationDate = dto.ConsultationDate;
        entity.ConsultationTime = dto.ConsultationTime;
        entity.Location = dto.Location;
        entity.ChairmanId = dto.ChairmanId;
        entity.SecretaryId = dto.SecretaryId;
        entity.Reason = dto.Reason;
        entity.ClinicalFindings = dto.ClinicalFindings;
        entity.UpdatedAt = now;
        entity.UpdatedBy = userId.ToString();

        // Đồng bộ lại danh sách thành viên (xóa cũ, thêm mới).
        _context.InpatientConsultationMembers.RemoveRange(entity.Members);
        foreach (var mid in (dto.MemberIds ?? new List<Guid>()).Where(m => m != Guid.Empty).Distinct())
        {
            _context.InpatientConsultationMembers.Add(new InpatientConsultationMember
            {
                Id = Guid.NewGuid(), ConsultationId = entity.Id, DoctorId = mid, CreatedAt = now, CreatedBy = userId.ToString()
            });
        }
        await _context.SaveChangesAsync();
        return await LoadConsultationDtoAsync(entity.Id);
    }

    public async Task<List<ConsultationDto>> GetConsultationsAsync(Guid? admissionId, Guid? departmentId, DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.InpatientConsultations.Include(c => c.Members).AsQueryable();
        if (admissionId.HasValue && admissionId.Value != Guid.Empty)
            query = query.Where(c => c.AdmissionId == admissionId.Value);
        if (departmentId.HasValue && departmentId.Value != Guid.Empty)
        {
            var admIds = _context.Admissions.Where(a => a.DepartmentId == departmentId.Value).Select(a => a.Id);
            query = query.Where(c => admIds.Contains(c.AdmissionId));
        }
        if (fromDate.HasValue) query = query.Where(c => c.ConsultationDate >= fromDate.Value.Date);
        if (toDate.HasValue) query = query.Where(c => c.ConsultationDate < toDate.Value.Date.AddDays(1));

        var list = await query.OrderByDescending(c => c.ConsultationDate).Take(200).ToListAsync();
        var users = await BuildConsultationUserLookupAsync(list);
        return list.Select(e => ToConsultationDto(e, users)).ToList();
    }

    public async Task<ConsultationDto> CompleteConsultationAsync(Guid id, string conclusion, string treatment, Guid userId)
    {
        var entity = await _context.InpatientConsultations.Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new InvalidOperationException("Không tìm thấy hội chẩn");

        entity.Conclusion = conclusion;
        entity.Treatment = treatment;
        entity.Status = 2; // Hoàn thành
        entity.UpdatedAt = DateTime.Now;
        entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await LoadConsultationDtoAsync(entity.Id);
    }

    // F1.4: Duyệt / từ chối hội chẩn thuốc dấu * (ConsultationType=3)
    public async Task<ConsultationDto> ApproveConsultationAsync(Guid id, int decision, string? note, Guid approverId)
    {
        if (decision != 2 && decision != 3)
            throw new ArgumentException("Decision phải là 2 (Duyệt) hoặc 3 (Từ chối)");

        var entity = await _context.InpatientConsultations.Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new InvalidOperationException("Không tìm thấy hội chẩn");

        if (entity.ConsultationType != 3)
            throw new InvalidOperationException("Chỉ hội chẩn thuốc dấu * (loại 3) mới cần duyệt lãnh đạo");

        entity.ApprovalStatus = decision;
        entity.ApprovedBy = approverId;
        entity.ApprovedAt = DateTime.Now;
        entity.ApprovalNote = note;
        entity.UpdatedAt = DateTime.Now;
        entity.UpdatedBy = approverId.ToString();
        await _context.SaveChangesAsync();
        return await LoadConsultationDtoAsync(entity.Id);
    }

    private async Task<ConsultationDto> LoadConsultationDtoAsync(Guid id)
    {
        var entity = await _context.InpatientConsultations.Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new InvalidOperationException("Không tìm thấy hội chẩn");
        var users = await BuildConsultationUserLookupAsync(new[] { entity });
        return ToConsultationDto(entity, users);
    }

    private async Task<Dictionary<Guid, User>> BuildConsultationUserLookupAsync(IEnumerable<InpatientConsultation> items)
    {
        var ids = items
            .SelectMany(c => new[] { c.ChairmanId, c.SecretaryId }
                .Concat(c.Members.Select(m => m.DoctorId))
                .Concat(c.ApprovedBy.HasValue ? new[] { c.ApprovedBy.Value } : Array.Empty<Guid>()))
            .Where(g => g != Guid.Empty).Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<Guid, User>();
        return await _context.Users.Where(u => ids.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u);
    }

    private static ConsultationDto ToConsultationDto(InpatientConsultation e, Dictionary<Guid, User> users)
    {
        users.TryGetValue(e.ChairmanId, out var chairman);
        users.TryGetValue(e.SecretaryId, out var secretary);
        User? approver = null;
        if (e.ApprovedBy.HasValue) users.TryGetValue(e.ApprovedBy.Value, out approver);
        return new ConsultationDto
        {
            Id = e.Id,
            AdmissionId = e.AdmissionId,
            ConsultationType = e.ConsultationType,
            ConsultationDate = e.ConsultationDate,
            ConsultationTime = e.ConsultationTime,
            Location = e.Location,
            ChairmanId = e.ChairmanId,
            ChairmanName = chairman?.FullName ?? "",
            SecretaryId = e.SecretaryId,
            SecretaryName = secretary?.FullName ?? "",
            Reason = e.Reason,
            ClinicalFindings = e.ClinicalFindings,
            LabResults = e.LabResults,
            ImageResults = e.ImageResults,
            Conclusion = e.Conclusion,
            Treatment = e.Treatment,
            Status = e.Status,
            // F1.4: approval fields
            ApprovalStatus = e.ApprovalStatus,
            ApprovedBy = e.ApprovedBy,
            ApprovedByName = approver?.FullName,
            ApprovedAt = e.ApprovedAt,
            ApprovalNote = e.ApprovalNote,
            Members = e.Members.Select(m =>
            {
                users.TryGetValue(m.DoctorId, out var doc);
                return new ConsultationMemberDto
                {
                    DoctorId = m.DoctorId,
                    DoctorName = doc?.FullName ?? "",
                    Opinion = m.Opinion
                };
            }).ToList()
        };
    }

    public async Task<byte[]> PrintConsultationAsync(Guid id)
    {
        // #16: in biên bản hội chẩn nội trú (đọc bảng InpatientConsultations qua Admission,
        // trước đây đọc nhầm ConsultationRecords (OPD) nên không bao giờ thấy hội chẩn nội trú).
        var record = await _context.InpatientConsultations.Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (record == null) return Array.Empty<byte>();

        var admission = await _context.Admissions
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .Include(a => a.Department)
            .FirstOrDefaultAsync(a => a.Id == record.AdmissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = admission.Department;

        var users = await BuildConsultationUserLookupAsync(new[] { record });
        users.TryGetValue(record.ChairmanId, out var chairman);
        users.TryGetValue(record.SecretaryId, out var secretary);
        var participants = string.Join(", ", record.Members
            .Select(m => users.TryGetValue(m.DoctorId, out var d) ? d.FullName : null)
            .Where(n => !string.IsNullOrWhiteSpace(n)));

        var html = GetConsultationMinutes(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord?.InsuranceNumber,
            medRecord?.MedicalRecordCode, dept?.DepartmentName,
            record.ConsultationDate, record.Reason, record.ClinicalFindings,
            record.Conclusion, record.Treatment, participants,
            chairman?.FullName, secretary?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<NursingCareSheetDto> CreateNursingCareSheetAsync(CreateNursingCareSheetDto dto, Guid userId)
    {
        return Task.FromResult(new NursingCareSheetDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            CareDate = dto.CareDate,
            NurseId = userId,
            Shift = dto.Shift,
            PatientCondition = dto.PatientCondition,
            Consciousness = dto.Consciousness,
            HygieneActivities = dto.HygieneActivities,
            MedicationActivities = dto.MedicationActivities,
            NutritionActivities = dto.NutritionActivities,
            MovementActivities = dto.MovementActivities,
            SpecialMonitoring = dto.SpecialMonitoring,
            IssuesAndActions = dto.IssuesAndActions,
            Notes = dto.Notes,
            CreatedAt = DateTime.Now
        });
    }

    public Task<NursingCareSheetDto> UpdateNursingCareSheetAsync(Guid id, CreateNursingCareSheetDto dto, Guid userId)
    {
        return Task.FromResult(new NursingCareSheetDto
        {
            Id = id,
            AdmissionId = dto.AdmissionId,
            CareDate = dto.CareDate,
            NurseId = userId,
            Shift = dto.Shift,
            PatientCondition = dto.PatientCondition,
            Consciousness = dto.Consciousness,
            HygieneActivities = dto.HygieneActivities,
            MedicationActivities = dto.MedicationActivities,
            NutritionActivities = dto.NutritionActivities,
            MovementActivities = dto.MovementActivities,
            SpecialMonitoring = dto.SpecialMonitoring,
            IssuesAndActions = dto.IssuesAndActions,
            Notes = dto.Notes,
            CreatedAt = DateTime.Now
        });
    }

    public Task<List<NursingCareSheetDto>> GetNursingCareSheetsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        return Task.FromResult(new List<NursingCareSheetDto>());
    }

    public async Task<byte[]> PrintNursingCareSheetAsync(Guid id)
    {
        var sheet = await _context.NursingCareSheets
            .Include(n => n.Examination).ThenInclude(e => e.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(n => n.Examination).ThenInclude(e => e.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(n => n.Id == id);
        if (sheet == null) return Array.Empty<byte>();

        var examination = sheet.Examination;
        var medRecord = examination.MedicalRecord;
        var patient = medRecord.Patient;
        var dept = medRecord.Department;
        var nurse = sheet.NurseId.HasValue ? await _context.Users.FindAsync(sheet.NurseId.Value) : null;

        var rows = new List<NursingCareRow>
        {
            new NursingCareRow
            {
                Date = sheet.CareDate,
                Shift = 0,
                PatientCondition = sheet.Notes,
                NursingDiagnosis = sheet.NursingDiagnosis,
                Interventions = sheet.NursingInterventions,
                PatientResponse = sheet.PatientResponse,
                NurseName = nurse?.FullName
            }
        };

        var html = GetNursingCareSheet(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            medRecord.MainDiagnosis, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintCombinedNursingCareSheetsAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var sheets = await _context.NursingCareSheets
            .Where(n => n.Examination.MedicalRecordId == medRecord.Id
                && n.CareDate >= fromDate && n.CareDate <= toDate)
            .OrderBy(n => n.CareDate).ThenBy(n => n.CareTime)
            .ToListAsync();

        // #195: nạp 1 lần điều dưỡng của cả phiếu thay vì 1 query/dòng chăm sóc.
        var nurseIds = sheets.Where(s => s.NurseId.HasValue).Select(s => s.NurseId!.Value).Distinct().ToList();
        var nursesById = nurseIds.Count == 0
            ? new Dictionary<Guid, User>()
            : await _context.Users.Where(u => nurseIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id);

        var rows = new List<NursingCareRow>();
        foreach (var sheet in sheets)
        {
            User nurse = null;
            if (sheet.NurseId.HasValue) nursesById.TryGetValue(sheet.NurseId.Value, out nurse);
            rows.Add(new NursingCareRow
            {
                Date = sheet.CareDate,
                Shift = 0,
                PatientCondition = sheet.Notes,
                NursingDiagnosis = sheet.NursingDiagnosis,
                Interventions = sheet.NursingInterventions,
                PatientResponse = sheet.PatientResponse,
                NurseName = nurse?.FullName
            });
        }

        var html = GetNursingCareSheet(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            medRecord.MainDiagnosis, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion
}
