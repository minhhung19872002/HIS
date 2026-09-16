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

// K6 phien 2 (2026-05-30): tach 3.6 Treatment Information (~815 dong) khoi InpatientCompleteService.
public partial class InpatientCompleteService {
    #region 3.6 Treatment Information

    public async Task<TreatmentSheetDto> CreateTreatmentSheetAsync(CreateTreatmentSheetDto dto, Guid userId)
    {
        // QA-R4: an unknown / zero admission reached SaveChanges and died on the FK (500); a finished stay
        // accepted new daily orders; a sheet dated in the future or before admission was stored as-is.
        var admission = await _context.Admissions.AsNoTracking()
            .Where(a => a.Id == dto.AdmissionId && !a.IsDeleted)
            .Select(a => new { a.Status, a.AdmissionDate })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lượt nội trú.");
        await EnsureChartableAsync(dto.AdmissionId, admission.Status, "ghi tờ điều trị");
        EnsureStayDate(dto.TreatmentDate, admission.AdmissionDate, "Ngày điều trị");
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
        // QA-R4: an unknown id echoed the payload back with 200 (nothing saved, CreatedAt 0001-01-01).
        var dailyProgress = await _context.DailyProgresses.FindAsync(id)
            ?? throw new KeyNotFoundException("Không tìm thấy tờ điều trị.");
        {
            await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, dailyProgress.AdmissionId); // TT46
            var admissionDate = await _context.Admissions.AsNoTracking()
                .Where(a => a.Id == dailyProgress.AdmissionId).Select(a => a.AdmissionDate).FirstOrDefaultAsync();
            EnsureStayDate(dto.TreatmentDate, admissionDate, "Ngày điều trị");
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

    /// <summary>
    /// QA-R4: a clinical timestamp must fall inside the stay — not in the future and not before the
    /// admission day. Client ISO values with "Z" bind as Kind=Utc; business timestamps are VN local.
    /// </summary>
    private static void EnsureStayDate(DateTime value, DateTime admissionDate, string label)
    {
        if (value == default)
            throw new InvalidOperationException($"Chưa nhập {label.ToLowerInvariant()}.");
        var vn = value.Kind == DateTimeKind.Utc ? HIS.Core.Common.VnTime.UtcToVn(value) : value;
        var nowVn = HIS.Core.Common.VnTime.NowVn;
        if (vn > nowVn.AddMinutes(10))
            throw new InvalidOperationException($"{label} ({vn:HH:mm dd/MM/yyyy}) không được ở tương lai.");
        if (admissionDate != default && vn.Date < admissionDate.Date)
            throw new InvalidOperationException(
                $"{label} ({vn:dd/MM/yyyy}) không được trước ngày vào viện ({admissionDate:dd/MM/yyyy}).");
    }

    /// <summary>
    /// Charting on a stay that has ended: allowed for a short grace period, refused after it.
    ///
    /// Ward staff routinely finish the shift's entries (tờ điều trị, sinh hiệu, truyền dịch, biên bản hội chẩn)
    /// after the patient has already walked out, and v2 has no "reopen stay" button — so a hard block on any
    /// finished stay would simply lose that charting. The real abuse this guards against is writing to a stay
    /// closed weeks ago, which the window still refuses. The TT46 EMR lock that follows every caller remains the
    /// hard gate once the record is finalized.
    /// </summary>
    private const int PostDischargeChartingHours = 48;

    private async Task EnsureChartableAsync(Guid admissionId, int status, string what)
    {
        if (HIS.Core.Constants.AdmissionStatus.IsActive(status)) return;
        var endedAt = await _context.Set<Discharge>().AsNoTracking()
            .Where(d => d.AdmissionId == admissionId)
            .OrderByDescending(d => d.DischargeDate)
            .Select(d => (DateTime?)d.DischargeDate)
            .FirstOrDefaultAsync();
        if (endedAt.HasValue && HIS.Core.Common.VnTime.NowVn <= endedAt.Value.AddHours(PostDischargeChartingHours))
            return;
        throw new InvalidOperationException(
            $"Lượt nội trú đã kết thúc ({HIS.Core.Constants.AdmissionStatus.Label(status)}) quá {PostDischargeChartingHours} giờ, không {what} được.");
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

        // perf(#195): batch-load doctors instead of FindAsync per row (N+1); read-only print/report data
        var doctorIds = dailyProgresses.Select(dp => dp.DoctorId).Distinct().ToList();
        var doctorsMap = await _context.Users
            .Where(u => doctorIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        foreach (var dp in dailyProgresses)
        {
            doctorsMap.TryGetValue(dp.DoctorId, out var doctor);
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
        var admission = await _context.Admissions.AsNoTracking()
            .Where(a => a.Id == dto.AdmissionId && !a.IsDeleted)
            .Select(a => new { a.Status, a.AdmissionDate })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lượt nội trú.");
        // QA-R4: vitals were accepted on a finished stay (now: only inside the post-discharge charting window).
        await EnsureChartableAsync(dto.AdmissionId, admission.Status, "ghi sinh hiệu");
        await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, dto.AdmissionId); // TT46 — QA0915: was writable on a finalized EMR
        if (dto.Temperature == null && dto.Pulse == null && dto.RespiratoryRate == null
            && dto.SystolicBP == null && dto.DiastolicBP == null && dto.SpO2 == null
            && dto.Weight == null && dto.Height == null)
            throw new InvalidOperationException("Can nhap it nhat 1 chi so sinh hieu");
        ValidateVitalSigns(dto);
        EnsureStayDate(dto.RecordTime, admission.AdmissionDate, "Giờ đo sinh hiệu");

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
        if (entity == null) throw new KeyNotFoundException("Vital signs record not found");
        ValidateVitalSigns(dto); // QA-R4
        EnsureStayDate(dto.RecordTime, default, "Giờ đo sinh hiệu");
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
        var list = await query.OrderBy(v => v.RecordTime).ToBoundedListAsync("InpatientCompleteService.GetVitalSignsListAsync");
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

    /// <summary>
    /// QA-R4 (patient safety): temperature -5 °C, pulse 999, SpO2 150 %, BP 50/200 were stored and fed the
    /// NEWS2 / chart views. Physiological plausibility bounds only — abnormal values stay allowed.
    /// </summary>
    private static void ValidateVitalSigns(CreateVitalSignsDto dto)
    {
        static void Range(decimal? v, decimal min, decimal max, string name, string unit)
        {
            if (v.HasValue && (v.Value < min || v.Value > max))
                throw new InvalidOperationException($"{name} {v.Value:0.##}{unit} ngoài khoảng hợp lệ ({min:0.##}–{max:0.##}{unit}).");
        }
        Range(dto.Temperature, 30m, 45m, "Nhiệt độ", "°C");
        Range(dto.Pulse, 20, 300, "Mạch", " l/ph");
        Range(dto.RespiratoryRate, 4, 80, "Nhịp thở", " l/ph");
        Range(dto.SystolicBP, 40, 300, "Huyết áp tâm thu", " mmHg");
        Range(dto.DiastolicBP, 20, 200, "Huyết áp tâm trương", " mmHg");
        Range(dto.SpO2, 30m, 100m, "SpO2", "%");
        Range(dto.Weight, 0.3m, 500m, "Cân nặng", " kg");
        Range(dto.Height, 20m, 260m, "Chiều cao", " cm");
        if (dto.SystolicBP.HasValue && dto.DiastolicBP.HasValue && dto.SystolicBP.Value <= dto.DiastolicBP.Value)
            throw new InvalidOperationException(
                $"Huyết áp tâm thu ({dto.SystolicBP}) phải lớn hơn tâm trương ({dto.DiastolicBP}).");
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

    #endregion
}
