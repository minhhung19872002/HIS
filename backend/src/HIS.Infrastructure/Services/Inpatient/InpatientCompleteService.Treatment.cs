using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K6 phien 2 (2026-05-30): tach 3.6 Treatment Information (~815 dong) khoi InpatientCompleteService.
public partial class InpatientCompleteService {
    #region 3.6 Treatment Information

    public async Task<TreatmentSheetDto> CreateTreatmentSheetAsync(CreateTreatmentSheetDto dto, Guid userId)
    {
        await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, dto.AdmissionId); // TT46

        var doctor = await _context.Users.FindAsync(userId);

        var dailyProgress = new DailyProgress
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            ProgressDate = dto.TreatmentDate,
            DoctorId = userId,
            SubjectiveFindings = dto.ProgressNotes,
            Plan = dto.TreatmentOrders,
            DietOrder = dto.DietOrders,
            ActivityOrder = dto.NursingOrders,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.DailyProgresses.Add(dailyProgress);
        await _context.SaveChangesAsync();

        return new TreatmentSheetDto
        {
            Id = dailyProgress.Id,
            AdmissionId = dto.AdmissionId,
            TreatmentDate = dto.TreatmentDate,
            DoctorId = userId,
            DoctorName = doctor?.FullName ?? string.Empty,
            ProgressNotes = dto.ProgressNotes,
            TreatmentOrders = dto.TreatmentOrders,
            NursingOrders = dto.NursingOrders,
            DietOrders = dto.DietOrders,
            CreatedAt = dailyProgress.CreatedAt
        };
    }

    public async Task<TreatmentSheetDto> UpdateTreatmentSheetAsync(Guid id, CreateTreatmentSheetDto dto, Guid userId)
    {
        var dailyProgress = await _context.DailyProgresses.FindAsync(id);
        if (dailyProgress != null)
        {
            await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, dailyProgress.AdmissionId); // TT46
            dailyProgress.SubjectiveFindings = dto.ProgressNotes;
            dailyProgress.Plan = dto.TreatmentOrders;
            dailyProgress.ActivityOrder = dto.NursingOrders;
            dailyProgress.DietOrder = dto.DietOrders;
            dailyProgress.ProgressDate = dto.TreatmentDate;
            dailyProgress.UpdatedAt = DateTime.Now;
            dailyProgress.UpdatedBy = userId.ToString();
            await _context.SaveChangesAsync();
        }

        var doctor = await _context.Users.FindAsync(userId);
        return new TreatmentSheetDto
        {
            Id = id,
            AdmissionId = dto.AdmissionId,
            TreatmentDate = dto.TreatmentDate,
            DoctorId = userId,
            DoctorName = doctor?.FullName ?? string.Empty,
            ProgressNotes = dto.ProgressNotes,
            TreatmentOrders = dto.TreatmentOrders,
            NursingOrders = dto.NursingOrders,
            DietOrders = dto.DietOrders,
            UpdatedAt = DateTime.Now
        };
    }

    public async Task DeleteTreatmentSheetAsync(Guid id, Guid userId)
    {
        var dailyProgress = await _context.DailyProgresses.FindAsync(id);
        if (dailyProgress != null)
        {
            await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, dailyProgress.AdmissionId); // TT46
            _context.DailyProgresses.Remove(dailyProgress);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<TreatmentSheetDto>> GetTreatmentSheetsAsync(TreatmentSheetSearchDto searchDto)
    {
        var query = _context.DailyProgresses.AsQueryable();

        if (searchDto.AdmissionId.HasValue)
            query = query.Where(dp => dp.AdmissionId == searchDto.AdmissionId.Value);
        if (searchDto.FromDate.HasValue)
            query = query.Where(dp => dp.ProgressDate >= searchDto.FromDate.Value);
        if (searchDto.ToDate.HasValue)
            query = query.Where(dp => dp.ProgressDate <= searchDto.ToDate.Value);
        if (searchDto.DoctorId.HasValue)
            query = query.Where(dp => dp.DoctorId == searchDto.DoctorId.Value);

        var results = await query
            .OrderByDescending(dp => dp.ProgressDate)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return results.Select(dp => new TreatmentSheetDto
        {
            Id = dp.Id,
            AdmissionId = dp.AdmissionId,
            TreatmentDate = dp.ProgressDate,
            DoctorId = dp.DoctorId,
            ProgressNotes = dp.SubjectiveFindings,
            TreatmentOrders = dp.Plan,
            NursingOrders = dp.ActivityOrder,
            DietOrders = dp.DietOrder,
            CreatedAt = dp.CreatedAt
        }).ToList();
    }

    public async Task<TreatmentSheetDto?> GetTreatmentSheetByIdAsync(Guid id)
    {
        var dp = await _context.DailyProgresses.FindAsync(id);
        if (dp == null) return null;

        var doctor = await _context.Users.FindAsync(dp.DoctorId);
        return new TreatmentSheetDto
        {
            Id = dp.Id,
            AdmissionId = dp.AdmissionId,
            TreatmentDate = dp.ProgressDate,
            DoctorId = dp.DoctorId,
            DoctorName = doctor?.FullName ?? string.Empty,
            ProgressNotes = dp.SubjectiveFindings,
            TreatmentOrders = dp.Plan,
            NursingOrders = dp.ActivityOrder,
            DietOrders = dp.DietOrder,
            CreatedAt = dp.CreatedAt
        };
    }

    public Task<TreatmentSheetTemplateDto> CreateTreatmentSheetTemplateAsync(TreatmentSheetTemplateDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.CreatedBy = userId;
        return Task.FromResult(dto);
    }

    public Task<List<TreatmentSheetTemplateDto>> GetTreatmentSheetTemplatesAsync(Guid? departmentId)
    {
        return Task.FromResult(new List<TreatmentSheetTemplateDto>());
    }

    public async Task<TreatmentSheetDto> CopyTreatmentSheetAsync(Guid sourceId, DateTime newDate, Guid userId)
    {
        var source = await _context.DailyProgresses.FindAsync(sourceId);
        var doctor = await _context.Users.FindAsync(userId);

        return new TreatmentSheetDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = source?.AdmissionId ?? Guid.Empty,
            TreatmentDate = newDate,
            DoctorId = userId,
            DoctorName = doctor?.FullName ?? string.Empty,
            ProgressNotes = source?.SubjectiveFindings,
            TreatmentOrders = source?.Plan,
            NursingOrders = source?.ActivityOrder,
            DietOrders = source?.DietOrder,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<byte[]> PrintTreatmentSheetAsync(Guid id)
    {
        var dp = await _context.DailyProgresses
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dp == null) return Array.Empty<byte>();

        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == dp.AdmissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var doctor = await _context.Users.FindAsync(dp.DoctorId);
        var dayNumber = (int)(dp.ProgressDate - admission.AdmissionDate).TotalDays + 1;

        var rows = new List<TreatmentSheetRow>
        {
            new TreatmentSheetRow
            {
                Date = dp.ProgressDate,
                DayNumber = dayNumber,
                Progress = dp.SubjectiveFindings,
                Orders = dp.Plan,
                DoctorName = doctor?.FullName
            }
        };

        var html = GetTreatmentSheet(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            medRecord.MainDiagnosis, medRecord.MainIcdCode,
            rows, doctor?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintCombinedTreatmentSheetsAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var dailyProgresses = await _context.DailyProgresses
            .Where(dp => dp.AdmissionId == admissionId
                && dp.ProgressDate >= fromDate && dp.ProgressDate <= toDate)
            .OrderBy(dp => dp.ProgressDate)
            .ToListAsync();

        var rows = new List<TreatmentSheetRow>();
        foreach (var dp in dailyProgresses)
        {
            var doctor = await _context.Users.FindAsync(dp.DoctorId);
            var dayNumber = (int)(dp.ProgressDate - admission.AdmissionDate).TotalDays + 1;
            rows.Add(new TreatmentSheetRow
            {
                Date = dp.ProgressDate,
                DayNumber = dayNumber,
                Progress = dp.SubjectiveFindings,
                Orders = dp.Plan,
                DoctorName = doctor?.FullName
            });
        }

        var html = GetTreatmentSheet(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            medRecord.MainDiagnosis, medRecord.MainIcdCode,
            rows, null);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<bool> DigitizeMedicalRecordCoverAsync(Guid admissionId, byte[] scannedImage, Guid userId)
    {
        return Task.FromResult(true);
    }

    public async Task<byte[]> PrintMedicalRecordCoverAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var doctor = await _context.Users.FindAsync(admission.AdmittingDoctorId);

        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày vào viện:</span><span class=""field-value"">{admission.AdmissionDate:HH:mm dd/MM/yyyy}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Loại nhập viện:</span><span class=""field-value"">{GetAdmissionTypeName(admission.AdmissionType)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Chẩn đoán vào viện:</span><span class=""field-value"">{Esc(admission.DiagnosisOnAdmission)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Chẩn đoán chính:</span><span class=""field-value"">{Esc(medRecord.MainDiagnosis)} {(string.IsNullOrEmpty(medRecord.MainIcdCode) ? "" : $"({Esc(medRecord.MainIcdCode)})")}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Bác sĩ điều trị:</span><span class=""field-value"">{Esc(doctor?.FullName)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Trạng thái:</span><span class=""field-value"">{GetAdmissionStatusName(admission.Status)}</span></div>");

        var html = GetGenericForm(
            "BÌA HỒ SƠ BỆNH ÁN", "MS. 01/BV",
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            bodyContent.ToString(), doctor?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    // Sinh hiệu nội trú lưu DB thật (audit luồng nghiệp vụ 2026-06-06 #3) — trước đây stub in-memory.
    public async Task<VitalSignsRecordDto> CreateVitalSignsAsync(CreateVitalSignsDto dto, Guid userId)
    {
        // Sweep prod 2026-06-12: body rỗng từng tạo row rác (AdmissionId=Guid.Empty, mọi chỉ số null).
        // Validate: admission phải tồn tại + có ít nhất 1 chỉ số sinh hiệu.
        if (dto.AdmissionId == Guid.Empty
            || !await _context.Admissions.AnyAsync(a => a.Id == dto.AdmissionId && !a.IsDeleted))
            throw new InvalidOperationException("AdmissionId khong hop le hoac khong ton tai");
        if (dto.Temperature == null && dto.Pulse == null && dto.RespiratoryRate == null
            && dto.SystolicBP == null && dto.DiastolicBP == null && dto.SpO2 == null
            && dto.Weight == null && dto.Height == null)
            throw new InvalidOperationException("Can nhap it nhat 1 chi so sinh hieu");

        var entity = new InpatientVitalSign
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            RecordTime = dto.RecordTime,
            Temperature = dto.Temperature,
            Pulse = dto.Pulse,
            RespiratoryRate = dto.RespiratoryRate,
            SystolicBP = dto.SystolicBP,
            DiastolicBP = dto.DiastolicBP,
            SpO2 = dto.SpO2,
            Weight = dto.Weight,
            Height = dto.Height,
            Notes = dto.Notes,
            RecordedBy = userId,
        };
        _context.InpatientVitalSigns.Add(entity);
        await _context.SaveChangesAsync();
        return MapVitalSign(entity);
    }

    public async Task<VitalSignsRecordDto> UpdateVitalSignsAsync(Guid id, CreateVitalSignsDto dto, Guid userId)
    {
        var entity = await _context.InpatientVitalSigns.FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted);
        if (entity == null) throw new Exception("Vital signs record not found");
        entity.RecordTime = dto.RecordTime;
        entity.Temperature = dto.Temperature;
        entity.Pulse = dto.Pulse;
        entity.RespiratoryRate = dto.RespiratoryRate;
        entity.SystolicBP = dto.SystolicBP;
        entity.DiastolicBP = dto.DiastolicBP;
        entity.SpO2 = dto.SpO2;
        entity.Weight = dto.Weight;
        entity.Height = dto.Height;
        entity.Notes = dto.Notes;
        entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return MapVitalSign(entity);
    }

    public async Task<List<VitalSignsRecordDto>> GetVitalSignsListAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.InpatientVitalSigns
            .Where(v => v.AdmissionId == admissionId && !v.IsDeleted);
        if (fromDate.HasValue) query = query.Where(v => v.RecordTime >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(v => v.RecordTime <= toDate.Value);
        var list = await query.OrderBy(v => v.RecordTime).ToListAsync();
        return list.Select(MapVitalSign).ToList();
    }

    public async Task<VitalSignsChartDto> GetVitalSignsChartAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        var list = await _context.InpatientVitalSigns
            .Where(v => v.AdmissionId == admissionId && !v.IsDeleted
                     && v.RecordTime >= fromDate && v.RecordTime <= toDate)
            .OrderBy(v => v.RecordTime)
            .ToListAsync();
        return new VitalSignsChartDto
        {
            AdmissionId = admissionId,
            FromDate = fromDate,
            ToDate = toDate,
            TemperatureData = list.Where(v => v.Temperature.HasValue)
                .Select(v => new VitalSignsPointDto { Time = v.RecordTime, Value = v.Temperature }).ToList(),
            PulseData = list.Where(v => v.Pulse.HasValue)
                .Select(v => new VitalSignsPointDto { Time = v.RecordTime, Value = v.Pulse }).ToList(),
            BPData = list.Where(v => v.SystolicBP.HasValue || v.DiastolicBP.HasValue)
                .Select(v => new VitalSignsPointDto { Time = v.RecordTime, Value = v.SystolicBP, Value2 = v.DiastolicBP }).ToList(),
            SpO2Data = list.Where(v => v.SpO2.HasValue)
                .Select(v => new VitalSignsPointDto { Time = v.RecordTime, Value = v.SpO2 }).ToList(),
        };
    }

    private static VitalSignsRecordDto MapVitalSign(InpatientVitalSign v) => new()
    {
        Id = v.Id,
        AdmissionId = v.AdmissionId,
        RecordTime = v.RecordTime,
        Temperature = v.Temperature,
        Pulse = v.Pulse,
        RespiratoryRate = v.RespiratoryRate,
        SystolicBP = v.SystolicBP,
        DiastolicBP = v.DiastolicBP,
        SpO2 = v.SpO2,
        Weight = v.Weight,
        Height = v.Height,
        Notes = v.Notes,
        RecordedBy = v.RecordedBy,
    };

    public async Task<byte[]> PrintVitalSignsAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        // Query vital signs from Examinations related to this medical record within date range
        var vitals = await _context.Examinations
            .Where(e => e.MedicalRecordId == medRecord.Id
                && e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
            .OrderBy(e => e.CreatedAt)
            .ToListAsync();

        var headers = new[] { "Thời gian", "Mạch", "Nhiệt độ", "HA", "Nhịp thở", "SpO2", "Cân nặng" };
        var rows = vitals.Select(v => new[]
        {
            v.CreatedAt.ToString("dd/MM HH:mm"),
            v.Pulse?.ToString() ?? "",
            v.Temperature?.ToString("0.0") ?? "",
            v.BloodPressureSystolic.HasValue ? $"{v.BloodPressureSystolic}/{v.BloodPressureDiastolic}" : "",
            v.RespiratoryRate?.ToString() ?? "",
            v.SpO2?.ToString() ?? "",
            v.Weight?.ToString("0.0") ?? ""
        }).ToList();

        var html = BuildTableReport(
            "BẢNG THEO DÕI CHỨC NĂNG SỐNG",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)} - Từ {fromDate:dd/MM/yyyy} đến {toDate:dd/MM/yyyy}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

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

        var rows = new List<NursingCareRow>();
        foreach (var sheet in sheets)
        {
            var nurse = sheet.NurseId.HasValue ? await _context.Users.FindAsync(sheet.NurseId.Value) : null;
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

    // #16 (2026-06-11): persist thật vào bảng InfusionRecords (mig 94) — trước đây echo-fake,
    // FE báo "Đã ghi nhận truyền dịch" nhưng KHÔNG lưu gì (patient-safety).
    public async Task<InfusionRecordDto> CreateInfusionRecordAsync(CreateInfusionRecordDto dto, Guid userId)
    {
        var entity = new InfusionRecord
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            FluidName = dto.FluidName,
            Volume = dto.Volume,
            DropRate = dto.DropRate,
            StartTime = dto.StartTime,
            Route = dto.Route,
            AdditionalMedication = dto.AdditionalMedication,
            StartedBy = userId,
            Status = 0, // Đang truyền
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
            IsDeleted = false,
        };
        _context.InfusionRecords.Add(entity);
        await _context.SaveChangesAsync();
        return await MapInfusionDtoAsync(entity);
    }

    public async Task<InfusionRecordDto> UpdateInfusionRecordAsync(Guid id, string observations, string? complications, Guid userId)
    {
        var entity = await _context.InfusionRecords.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new Exception("Không tìm thấy phiếu truyền dịch");
        entity.Observations = observations;
        entity.Complications = complications;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await MapInfusionDtoAsync(entity);
    }

    public async Task<InfusionRecordDto> CompleteInfusionAsync(Guid id, DateTime endTime, Guid userId)
    {
        var entity = await _context.InfusionRecords.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new Exception("Không tìm thấy phiếu truyền dịch");
        entity.EndTime = endTime;
        entity.DurationMinutes = (int)Math.Max(0, (endTime - entity.StartTime).TotalMinutes);
        entity.CompletedBy = userId;
        entity.Status = 1; // Hoàn thành
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await MapInfusionDtoAsync(entity);
    }

    private async Task<InfusionRecordDto> MapInfusionDtoAsync(InfusionRecord e)
    {
        var starter = await _context.Users.AsNoTracking()
            .Where(u => u.Id == e.StartedBy).Select(u => u.FullName).FirstOrDefaultAsync();
        return new InfusionRecordDto
        {
            Id = e.Id,
            AdmissionId = e.AdmissionId,
            FluidName = e.FluidName,
            Volume = e.Volume,
            DropRate = e.DropRate,
            StartTime = e.StartTime,
            EndTime = e.EndTime,
            DurationMinutes = e.DurationMinutes,
            Route = e.Route,
            AdditionalMedication = e.AdditionalMedication,
            StartedBy = e.StartedBy,
            StartedByName = starter ?? string.Empty,
            Observations = e.Observations,
            Complications = e.Complications,
            Status = e.Status,
        };
    }

    public Task<DateTime> CalculateInfusionEndTimeAsync(int volumeMl, int dropRate)
    {
        // Formula: duration (minutes) = volumeMl * 20 / dropRate
        // 20 drops = 1 ml (standard drip set)
        var durationMinutes = dropRate > 0 ? volumeMl * 20.0 / dropRate : 0;
        var endTime = DateTime.Now.AddMinutes(durationMinutes);
        return Task.FromResult(endTime);
    }

    public async Task<List<InfusionRecordDto>> GetInfusionRecordsAsync(Guid admissionId)
    {
        // #16: đọc thật từ bảng InfusionRecords (trước trả rỗng)
        var rows = await _context.InfusionRecords.AsNoTracking()
            .Where(x => x.AdmissionId == admissionId && !x.IsDeleted)
            .OrderByDescending(x => x.StartTime)
            .ToListAsync();
        var userIds = rows.Select(r => r.StartedBy).Distinct().ToList();
        var names = await _context.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);
        return rows.Select(e => new InfusionRecordDto
        {
            Id = e.Id,
            AdmissionId = e.AdmissionId,
            FluidName = e.FluidName,
            Volume = e.Volume,
            DropRate = e.DropRate,
            StartTime = e.StartTime,
            EndTime = e.EndTime,
            DurationMinutes = e.DurationMinutes,
            Route = e.Route,
            AdditionalMedication = e.AdditionalMedication,
            StartedBy = e.StartedBy,
            StartedByName = names.TryGetValue(e.StartedBy, out var n) ? n : string.Empty,
            Observations = e.Observations,
            Complications = e.Complications,
            Status = e.Status,
        }).ToList();
    }

    public async Task<byte[]> PrintInfusionRecordAsync(Guid id)
    {
        // #16: in từ dữ liệu thật bảng InfusionRecords (mig 94)
        var e = await _context.InfusionRecords.AsNoTracking()
            .Include(x => x.Admission).ThenInclude(a => a.Patient)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">THÔNG TIN TRUYỀN DỊCH</div>");
        if (e == null)
        {
            bodyContent.AppendLine($@"<p class=""text-italic"">Không tìm thấy phiếu truyền dịch {id}.</p>");
        }
        else
        {
            var starter = await _context.Users.AsNoTracking()
                .Where(u => u.Id == e.StartedBy).Select(u => u.FullName).FirstOrDefaultAsync();
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Bệnh nhân:</span><span class=""field-value"">{e.Admission?.Patient?.FullName} ({e.Admission?.Patient?.PatientCode})</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Dịch truyền:</span><span class=""field-value"">{e.FluidName}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Thể tích / tốc độ:</span><span class=""field-value"">{e.Volume} ml — {e.DropRate} giọt/phút</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Đường truyền:</span><span class=""field-value"">{e.Route ?? "—"}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Thuốc pha thêm:</span><span class=""field-value"">{e.AdditionalMedication ?? "—"}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Bắt đầu:</span><span class=""field-value"">{e.StartTime:dd/MM/yyyy HH:mm}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Kết thúc:</span><span class=""field-value"">{(e.EndTime.HasValue ? e.EndTime.Value.ToString("dd/MM/yyyy HH:mm") : "Đang truyền")}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Người thực hiện:</span><span class=""field-value"">{starter ?? "—"}</span></div>");
            if (!string.IsNullOrEmpty(e.Observations))
                bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Theo dõi:</span><span class=""field-value"">{e.Observations}</span></div>");
            if (!string.IsNullOrEmpty(e.Complications))
                bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Biến chứng:</span><span class=""field-value"">{e.Complications}</span></div>");
        }
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày in:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy HH:mm}</span></div>");

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">PHIẾU THEO DÕI TRUYỀN DỊCH</div>");
        body.AppendLine(bodyContent.ToString());
        body.AppendLine(GetSignatureBlock());

        var html = WrapHtmlPage("Phiếu theo dõi truyền dịch", body.ToString());
        return Encoding.UTF8.GetBytes(html);
    }

    public Task<BloodTransfusionDto> CreateBloodTransfusionAsync(CreateBloodTransfusionDto dto, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            BloodType = dto.BloodType,
            RhFactor = dto.RhFactor,
            BloodProductType = dto.BloodProductType,
            BagNumber = dto.BagNumber,
            Volume = dto.Volume,
            TransfusionStart = dto.TransfusionStart,
            DoctorOrderId = userId,
            ExecutedBy = userId,
            Status = 0 // Đang truyền
        });
    }

    public Task<BloodTransfusionDto> UpdateBloodTransfusionMonitoringAsync(Guid id, string preVitals, string duringVitals, string postVitals, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = id,
            PreTransfusionVitals = preVitals,
            DuringTransfusionVitals = duringVitals,
            PostTransfusionVitals = postVitals,
            ExecutedBy = userId,
            Status = 0 // Đang truyền
        });
    }

    public Task<BloodTransfusionDto> RecordTransfusionReactionAsync(Guid id, string reactionDetails, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = id,
            HasReaction = true,
            ReactionDetails = reactionDetails,
            ExecutedBy = userId,
            Status = 0
        });
    }

    public Task<BloodTransfusionDto> CompleteBloodTransfusionAsync(Guid id, DateTime endTime, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = id,
            TransfusionEnd = endTime,
            ExecutedBy = userId,
            Status = 2 // Hoàn thành
        });
    }

    public Task<List<BloodTransfusionDto>> GetBloodTransfusionsAsync(Guid admissionId)
    {
        return Task.FromResult(new List<BloodTransfusionDto>());
    }

    public async Task<byte[]> PrintBloodTransfusionAsync(Guid id)
    {
        // Blood transfusion records are in-memory DTOs; build generic form
        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">THÔNG TIN TRUYỀN MÁU</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã phiếu:</span><span class=""field-value"">{id}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày in:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy HH:mm}</span></div>");
        bodyContent.AppendLine($@"<p class=""text-italic"">Chi tiết truyền máu sẽ được cập nhật khi có bảng BloodTransfusions trong DB.</p>");

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">PHIẾU THEO DÕI TRUYỀN MÁU</div>");
        body.AppendLine(bodyContent.ToString());
        body.AppendLine(GetSignatureBlock());

        var html = WrapHtmlPage("Phiếu theo dõi truyền máu", body.ToString());
        return await Task.FromResult(Encoding.UTF8.GetBytes(html));
    }

    public Task<DrugReactionRecordDto> CreateDrugReactionRecordAsync(Guid admissionId, Guid? medicineId, string medicineName, int severity, string symptoms, string? treatment, Guid userId)
    {
        return Task.FromResult(new DrugReactionRecordDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            MedicineId = medicineId,
            MedicineName = medicineName,
            ReactionTime = DateTime.Now,
            Severity = severity,
            Symptoms = symptoms,
            Treatment = treatment,
            ReportedBy = userId
        });
    }

    public Task<List<DrugReactionRecordDto>> GetDrugReactionRecordsAsync(Guid admissionId)
    {
        return Task.FromResult(new List<DrugReactionRecordDto>());
    }

    public async Task<byte[]> PrintDrugReactionRecordAsync(Guid id)
    {
        // Drug reaction records are in-memory DTOs; build generic form
        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">BÁO CÁO PHẢN ỨNG THUỐC</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã báo cáo:</span><span class=""field-value"">{id}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày in:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy HH:mm}</span></div>");
        bodyContent.AppendLine($@"<p class=""text-italic"">Chi tiết phản ứng thuốc sẽ được cập nhật khi có bảng DrugReactions trong DB.</p>");

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">BÁO CÁO PHẢN ỨNG THUỐC BẤT LỢI (ADR)</div>");
        body.AppendLine(bodyContent.ToString());
        body.AppendLine(GetSignatureBlock());

        var html = WrapHtmlPage("Báo cáo phản ứng thuốc bất lợi", body.ToString());
        return await Task.FromResult(Encoding.UTF8.GetBytes(html));
    }

    public Task<InjuryRecordDto> CreateInjuryRecordAsync(Guid admissionId, InjuryRecordDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.AdmissionId = admissionId;
        return Task.FromResult(dto);
    }

    public Task<InjuryRecordDto?> GetInjuryRecordAsync(Guid admissionId)
    {
        return Task.FromResult<InjuryRecordDto?>(null);
    }

    public Task<NewbornRecordDto> CreateNewbornRecordAsync(Guid motherAdmissionId, NewbornRecordDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.MotherAdmissionId = motherAdmissionId;
        return Task.FromResult(dto);
    }

    public Task<List<NewbornRecordDto>> GetNewbornRecordsAsync(Guid motherAdmissionId)
    {
        return Task.FromResult(new List<NewbornRecordDto>());
    }

    #endregion
}
