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
