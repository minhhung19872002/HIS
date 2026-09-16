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
        // QA-R4: InpatientConsultations has no FK — a zero / unknown admission created an orphan row (200).
        var admissionStatus = await _context.Admissions.AsNoTracking()
            .Where(a => a.Id == dto.AdmissionId && !a.IsDeleted)
            .Select(a => (int?)a.Status)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lượt nội trú.");
        await EnsureChartableAsync(dto.AdmissionId, admissionStatus, "mời hội chẩn");
        if (dto.ConsultationDate == default)
            throw new InvalidOperationException("Chưa nhập ngày hội chẩn.");
        await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, dto.AdmissionId); // TT46 — QA0915: was writable on a finalized EMR
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

        // #218/T3: hội chẩn ĐÃ ĐƯỢC LÃNH ĐẠO DUYỆT thì không sửa nội dung nữa.
        //
        // Hội chẩn loại 3 là hội chẩn thuốc dấu * — nhóm thuốc phải có lãnh đạo duyệt mới dùng được.
        // `ApproveConsultationAsync` ghi ApprovalStatus=2 kèm ApprovedBy/ApprovedAt, tức một người cụ
        // thể đứng tên chịu trách nhiệm cho kết luận và phương hướng điều trị của buổi hội chẩn.
        // Trước đây hai cửa dưới đây ghi đè được kết luận sau khi đã duyệt, mà chữ duyệt giữ nguyên —
        // lãnh đạo đứng tên cho một kết luận khác hẳn cái mình đã đọc.
        // Đo được ở evidence/cross/t3/t3_consultation_approved.json. Tìm ra bằng bộ dò
        // t3_verified_edit_sweep.py, không phải tình cờ.
        if (entity.ApprovedAt != null)
            throw new InvalidOperationException(
                $"Hội chẩn đã được duyệt lúc {entity.ApprovedAt:HH:mm dd/MM/yyyy} — không sửa nội dung "
                + "được nữa. Cần tu chỉnh thì phải thu hồi duyệt trước.");

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

        // #218/T3: hội chẩn ĐÃ ĐƯỢC LÃNH ĐẠO DUYỆT thì không sửa nội dung nữa.
        //
        // Hội chẩn loại 3 là hội chẩn thuốc dấu * — nhóm thuốc phải có lãnh đạo duyệt mới dùng được.
        // `ApproveConsultationAsync` ghi ApprovalStatus=2 kèm ApprovedBy/ApprovedAt, tức một người cụ
        // thể đứng tên chịu trách nhiệm cho kết luận và phương hướng điều trị của buổi hội chẩn.
        // Trước đây hai cửa dưới đây ghi đè được kết luận sau khi đã duyệt, mà chữ duyệt giữ nguyên —
        // lãnh đạo đứng tên cho một kết luận khác hẳn cái mình đã đọc.
        // Đo được ở evidence/cross/t3/t3_consultation_approved.json. Tìm ra bằng bộ dò
        // t3_verified_edit_sweep.py, không phải tình cờ.
        if (entity.ApprovedAt != null)
            throw new InvalidOperationException(
                $"Hội chẩn đã được duyệt lúc {entity.ApprovedAt:HH:mm dd/MM/yyyy} — không sửa nội dung "
                + "được nữa. Cần tu chỉnh thì phải thu hồi duyệt trước.");

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

    // QA0915 wave-2: the three methods below were in-memory stubs (NursingSection v2 said "saved",
    // nothing persisted, list always empty). Persisted to InpatientNursingCareSheets (per-admission,
    // per-shift); requires the proposed migration + DbSet (see QA report).
    public async Task<NursingCareSheetDto> CreateNursingCareSheetAsync(CreateNursingCareSheetDto dto, Guid userId)
    {
        var admission = await _context.Admissions.AsNoTracking().FirstOrDefaultAsync(a => a.Id == dto.AdmissionId)
            ?? throw new KeyNotFoundException("Admission not found");
        ValidateNursingCareSheet(dto);
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, admission.MedicalRecordId); // TT46

        var entity = new InpatientNursingCareSheet
        {
            Id = Guid.NewGuid(),
            AdmissionId = admission.Id,
            MedicalRecordId = admission.MedicalRecordId,
            NurseId = userId,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
        };
        ApplyNursingCareSheet(entity, dto);
        _context.Set<InpatientNursingCareSheet>().Add(entity);
        await _context.SaveChangesAsync();
        return (await MapNursingCareSheetsAsync(new List<InpatientNursingCareSheet> { entity }))[0];
    }

    public async Task<NursingCareSheetDto> UpdateNursingCareSheetAsync(Guid id, CreateNursingCareSheetDto dto, Guid userId)
    {
        var entity = await _context.Set<InpatientNursingCareSheet>().FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu chăm sóc");
        ValidateNursingCareSheet(dto);
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, entity.MedicalRecordId); // TT46
        ApplyNursingCareSheet(entity, dto); // AdmissionId / NurseId (author) are not re-assigned on edit
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return (await MapNursingCareSheetsAsync(new List<InpatientNursingCareSheet> { entity }))[0];
    }

    public async Task<List<NursingCareSheetDto>> GetNursingCareSheetsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        var q = _context.Set<InpatientNursingCareSheet>().AsNoTracking().Where(s => s.AdmissionId == admissionId);
        if (fromDate.HasValue) q = q.Where(s => s.CareDate >= fromDate.Value);
        if (toDate.HasValue) q = q.Where(s => s.CareDate <= toDate.Value);
        var rows = await q.OrderByDescending(s => s.CareDate).ThenByDescending(s => s.Shift).Take(500).ToListAsync();
        return await MapNursingCareSheetsAsync(rows);
    }

    private static void ValidateNursingCareSheet(CreateNursingCareSheetDto dto)
    {
        if (dto.CareDate == default)
            throw new InvalidOperationException("Chưa nhập ngày chăm sóc.");
        if (dto.Shift < 1 || dto.Shift > 3)
            throw new InvalidOperationException("Ca chăm sóc phải là 1 (sáng), 2 (chiều) hoặc 3 (đêm).");
        if (dto.CareLevel.HasValue && dto.CareLevel is < 1 or > 3)
            throw new InvalidOperationException("Cấp chăm sóc không hợp lệ.");
    }

    private static void ApplyNursingCareSheet(InpatientNursingCareSheet e, CreateNursingCareSheetDto dto)
    {
        e.CareDate = dto.CareDate;
        e.Shift = dto.Shift;
        e.PatientCondition = dto.PatientCondition;
        e.Consciousness = dto.Consciousness;
        e.HygieneActivities = dto.HygieneActivities;
        e.MedicationActivities = dto.MedicationActivities;
        e.NutritionActivities = dto.NutritionActivities;
        e.MovementActivities = dto.MovementActivities;
        e.SpecialMonitoring = dto.SpecialMonitoring;
        e.IssuesAndActions = dto.IssuesAndActions;
        e.Notes = dto.Notes;
        e.CareLevel = dto.CareLevel;
    }

    private async Task<List<NursingCareSheetDto>> MapNursingCareSheetsAsync(List<InpatientNursingCareSheet> rows)
    {
        var nurseIds = rows.Select(r => r.NurseId).Distinct().ToList();
        var names = nurseIds.Count == 0 ? new Dictionary<Guid, string>()
            : await _context.Users.AsNoTracking().Where(u => nurseIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);
        return rows.Select(r => new NursingCareSheetDto
        {
            Id = r.Id,
            AdmissionId = r.AdmissionId,
            CareDate = r.CareDate,
            NurseId = r.NurseId,
            NurseName = names.TryGetValue(r.NurseId, out var n) ? n : string.Empty,
            Shift = r.Shift,
            PatientCondition = r.PatientCondition,
            Consciousness = r.Consciousness,
            HygieneActivities = r.HygieneActivities,
            MedicationActivities = r.MedicationActivities,
            NutritionActivities = r.NutritionActivities,
            MovementActivities = r.MovementActivities,
            SpecialMonitoring = r.SpecialMonitoring,
            IssuesAndActions = r.IssuesAndActions,
            Notes = r.Notes,
            CareLevel = r.CareLevel,
            CreatedAt = r.CreatedAt,
        }).ToList();
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

        // QA0915 wave-2: include the per-shift inpatient sheets (InpatientNursingCareSheets) of this stay.
        var wardSheets = await GetNursingCareSheetsAsync(admissionId, fromDate, toDate);
        foreach (var s in wardSheets.OrderBy(s => s.CareDate).ThenBy(s => s.Shift))
        {
            rows.Add(new NursingCareRow
            {
                Date = s.CareDate,
                Shift = s.Shift,
                PatientCondition = string.Join("; ", new[] { s.PatientCondition, s.Consciousness }.Where(x => !string.IsNullOrWhiteSpace(x))),
                Interventions = string.Join("; ", new[] { s.HygieneActivities, s.MedicationActivities, s.NutritionActivities, s.MovementActivities, s.SpecialMonitoring }
                    .Where(x => !string.IsNullOrWhiteSpace(x))),
                PatientResponse = s.IssuesAndActions,
                NurseName = s.NurseName
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
