using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public class HivManagementService : IHivManagementService
{
    private readonly HISDbContext _context;

    public HivManagementService(HISDbContext context)
    {
        _context = context;
    }

    // ==================== HIV Patients ====================

    public async Task<List<HivPatientListDto>> SearchPatientsAsync(HivPatientSearchDto? filter = null)
    {
        var query = _context.HivPatients
            .Include(h => h.Patient)
            .Where(h => !h.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(h =>
                    h.HivCode.ToLower().Contains(kw) ||
                    (h.Patient != null && (h.Patient.FullName.ToLower().Contains(kw) || h.Patient.PatientCode.ToLower().Contains(kw))) ||
                    (h.CurrentARTRegimen != null && h.CurrentARTRegimen.ToLower().Contains(kw))
                );
            }
            if (filter.ARTStatus.HasValue)
                query = query.Where(h => h.ARTStatus == filter.ARTStatus.Value);
            if (filter.WHOStage.HasValue)
                query = query.Where(h => h.WHOStage == filter.WHOStage.Value);
            if (filter.IsVirallySuppressed.HasValue)
                query = query.Where(h => h.IsVirallySuppressed == filter.IsVirallySuppressed.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(h => h.DiagnosisDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(h => h.DiagnosisDate <= to.AddDays(1));
        }

        return await query
            .OrderByDescending(h => h.DiagnosisDate)
            .ThenBy(h => h.Id) // QA-R11: deterministic order for the 200-row cap
            .Take(200)
            .Select(h => new HivPatientListDto
            {
                Id = h.Id,
                PatientId = h.PatientId,
                HivCode = h.HivCode,
                PatientName = h.Patient != null ? h.Patient.FullName : null,
                PatientCode = h.Patient != null ? h.Patient.PatientCode : null,
                Gender = h.Patient != null ? h.Patient.Gender : null,
                DateOfBirth = h.Patient != null && h.Patient.DateOfBirth.HasValue ? h.Patient.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                DiagnosisDate = h.DiagnosisDate.ToString("yyyy-MM-dd"),
                DiagnosisType = h.DiagnosisType,
                CurrentARTRegimen = h.CurrentARTRegimen,
                ARTStatus = h.ARTStatus,
                WHOStage = h.WHOStage,
                LastCD4Count = h.LastCD4Count,
                LastCD4Date = h.LastCD4Date.HasValue ? h.LastCD4Date.Value.ToString("yyyy-MM-dd") : null,
                LastViralLoad = h.LastViralLoad,
                LastViralLoadDate = h.LastViralLoadDate.HasValue ? h.LastViralLoadDate.Value.ToString("yyyy-MM-dd") : null,
                IsVirallySuppressed = h.IsVirallySuppressed,
                NextAppointmentDate = h.NextAppointmentDate.HasValue ? h.NextAppointmentDate.Value.ToString("yyyy-MM-dd") : null,
                LinkedToMethadone = h.LinkedToMethadone,
            })
            .ToListAsync();
    }

    public async Task<HivPatientListDto?> GetPatientByIdAsync(Guid id)
    {
        var h = await _context.HivPatients
            .Include(x => x.Patient)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (h == null) return null;

        return new HivPatientListDto
        {
            Id = h.Id,
            PatientId = h.PatientId,
            HivCode = h.HivCode,
            PatientName = h.Patient?.FullName,
            PatientCode = h.Patient?.PatientCode,
            Gender = h.Patient?.Gender,
            DateOfBirth = h.Patient?.DateOfBirth?.ToString("yyyy-MM-dd"),
            DiagnosisDate = h.DiagnosisDate.ToString("yyyy-MM-dd"),
            DiagnosisType = h.DiagnosisType,
            CurrentARTRegimen = h.CurrentARTRegimen,
            ARTStatus = h.ARTStatus,
            WHOStage = h.WHOStage,
            LastCD4Count = h.LastCD4Count,
            LastCD4Date = h.LastCD4Date?.ToString("yyyy-MM-dd"),
            LastViralLoad = h.LastViralLoad,
            LastViralLoadDate = h.LastViralLoadDate?.ToString("yyyy-MM-dd"),
            IsVirallySuppressed = h.IsVirallySuppressed,
            NextAppointmentDate = h.NextAppointmentDate?.ToString("yyyy-MM-dd"),
            LinkedToMethadone = h.LinkedToMethadone,
        };
    }

    public async Task<HivPatientListDto> CreatePatientAsync(HivPatientCreateDto dto)
    {
        // QA-R2: unknown PatientId hit the FK and surfaced as a 500 with the SQL stack trace.
        if (!await _context.Patients.AnyAsync(p => p.Id == dto.PatientId && !p.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy bệnh nhân.");
        if (await _context.HivPatients.AnyAsync(h => h.PatientId == dto.PatientId && !h.IsDeleted))
            throw new InvalidOperationException("Bệnh nhân đã có hồ sơ quản lý HIV.");
        if (dto.WHOStage < 1 || dto.WHOStage > 4)
            throw new ArgumentException("Giai đoạn WHO phải từ 1 đến 4.");
        var hivCode = dto.HivCode;
        if (string.IsNullOrEmpty(hivCode))
        {
            var count = await _context.HivPatients.CountAsync() + 1;
            hivCode = $"HIV-{DateTime.UtcNow:yyyy}-{count:D5}";
        }

        var entity = new HivPatient
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            HivCode = hivCode,
            DiagnosisDate = DateTime.TryParse(dto.DiagnosisDate, out var dd) ? dd : DateTime.UtcNow,
            DiagnosisType = dto.DiagnosisType,
            ConfirmationDate = DateTime.TryParse(dto.ConfirmationDate, out var cd) ? cd : null,
            CurrentARTRegimen = dto.CurrentARTRegimen,
            ARTStartDate = DateTime.TryParse(dto.ARTStartDate, out var asd) ? asd : null,
            ARTStatus = dto.ARTStatus,
            WHOStage = dto.WHOStage,
            CoInfections = dto.CoInfections,
            ReferralSource = dto.ReferralSource,
            LinkedToMethadone = dto.LinkedToMethadone,
            MethadonePatientId = dto.MethadonePatientId,
        };

        _context.HivPatients.Add(entity);
        await _context.SaveChangesAsync();

        var patient = await _context.Patients.FindAsync(dto.PatientId);

        return new HivPatientListDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            HivCode = entity.HivCode,
            PatientName = patient?.FullName,
            PatientCode = patient?.PatientCode,
            Gender = patient?.Gender,
            DateOfBirth = patient?.DateOfBirth?.ToString("yyyy-MM-dd"),
            DiagnosisDate = entity.DiagnosisDate.ToString("yyyy-MM-dd"),
            DiagnosisType = entity.DiagnosisType,
            CurrentARTRegimen = entity.CurrentARTRegimen,
            ARTStatus = entity.ARTStatus,
            WHOStage = entity.WHOStage,
            LinkedToMethadone = entity.LinkedToMethadone,
        };
    }

    public async Task<HivPatientListDto> UpdatePatientAsync(Guid id, HivPatientUpdateDto dto)
    {
        var entity = await _context.HivPatients
            .Include(h => h.Patient)
            .FirstOrDefaultAsync(h => h.Id == id && !h.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ HIV.");
        // QA-R11: out-of-range codes were stored and then dropped out of every ART tab / stage chip.
        if (dto.ARTStatus is < 0 or > 5)
            throw new ArgumentException("Trạng thái ART không hợp lệ.", nameof(dto.ARTStatus));
        if (dto.WHOStage is < 1 or > 4)
            throw new ArgumentException("Giai đoạn WHO phải từ 1 đến 4.", nameof(dto.WHOStage));

        if (dto.CurrentARTRegimen != null) entity.CurrentARTRegimen = dto.CurrentARTRegimen;
        if (!string.IsNullOrEmpty(dto.ARTStartDate) && DateTime.TryParse(dto.ARTStartDate, out var asd))
            entity.ARTStartDate = asd;
        if (dto.ARTStatus.HasValue) entity.ARTStatus = dto.ARTStatus.Value;
        if (dto.WHOStage.HasValue) entity.WHOStage = dto.WHOStage.Value;
        if (dto.LastCD4Count.HasValue) entity.LastCD4Count = dto.LastCD4Count.Value;
        if (!string.IsNullOrEmpty(dto.LastCD4Date) && DateTime.TryParse(dto.LastCD4Date, out var lcd))
            entity.LastCD4Date = lcd;
        if (dto.LastViralLoad.HasValue) entity.LastViralLoad = dto.LastViralLoad.Value;
        if (!string.IsNullOrEmpty(dto.LastViralLoadDate) && DateTime.TryParse(dto.LastViralLoadDate, out var lvld))
            entity.LastViralLoadDate = lvld;
        if (dto.IsVirallySuppressed.HasValue) entity.IsVirallySuppressed = dto.IsVirallySuppressed.Value;
        if (dto.CoInfections != null) entity.CoInfections = dto.CoInfections;
        if (dto.LinkedToMethadone.HasValue) entity.LinkedToMethadone = dto.LinkedToMethadone.Value;
        if (dto.MethadonePatientId.HasValue) entity.MethadonePatientId = dto.MethadonePatientId.Value;
        if (!string.IsNullOrEmpty(dto.NextAppointmentDate) && DateTime.TryParse(dto.NextAppointmentDate, out var nad))
            entity.NextAppointmentDate = nad;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new HivPatientListDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            HivCode = entity.HivCode,
            PatientName = entity.Patient?.FullName,
            PatientCode = entity.Patient?.PatientCode,
            Gender = entity.Patient?.Gender,
            DateOfBirth = entity.Patient?.DateOfBirth?.ToString("yyyy-MM-dd"),
            DiagnosisDate = entity.DiagnosisDate.ToString("yyyy-MM-dd"),
            DiagnosisType = entity.DiagnosisType,
            CurrentARTRegimen = entity.CurrentARTRegimen,
            ARTStatus = entity.ARTStatus,
            WHOStage = entity.WHOStage,
            LastCD4Count = entity.LastCD4Count,
            LastCD4Date = entity.LastCD4Date?.ToString("yyyy-MM-dd"),
            LastViralLoad = entity.LastViralLoad,
            LastViralLoadDate = entity.LastViralLoadDate?.ToString("yyyy-MM-dd"),
            IsVirallySuppressed = entity.IsVirallySuppressed,
            NextAppointmentDate = entity.NextAppointmentDate?.ToString("yyyy-MM-dd"),
            LinkedToMethadone = entity.LinkedToMethadone,
        };
    }

    public async Task<HivPatientStatsDto> GetPatientStatsAsync()
    {
        var patients = await _context.HivPatients
            .Where(h => !h.IsDeleted)
            .ToListAsync();

        var onArt = patients.Count(p => p.ARTStatus == 1);
        var virallySuppressed = patients.Count(p => p.IsVirallySuppressed == true);
        // QA-R11: the rate divided ALL suppressed patients (incl. interrupted/transferred) by on-ART only (could exceed 100%).
        var suppressedOnArt = patients.Count(p => p.ARTStatus == 1 && p.IsVirallySuppressed == true);
        var todayVn = HIS.Core.Common.VnTime.TodayVn;
        var monthStartUtc = new DateTime(todayVn.Year, todayVn.Month, 1).AddHours(-7); // CreatedAt is UTC

        return new HivPatientStatsDto
        {
            TotalPatients = patients.Count,
            OnARTCount = onArt,
            PreARTCount = patients.Count(p => p.ARTStatus == 0),
            VirallySuppressedCount = virallySuppressed,
            LostToFollowUpCount = patients.Count(p => p.ARTStatus == 5),
            DeceasedCount = patients.Count(p => p.ARTStatus == 4),
            SuppressedRate = onArt > 0 ? Math.Round((double)suppressedOnArt / onArt * 100, 1) : 0,
            NewThisMonthCount = patients.Count(p => p.CreatedAt >= monthStartUtc),
            ByStatus = patients
                .GroupBy(p => p.ARTStatus)
                .Select(g => new HivPatientByStatusDto { ARTStatus = g.Key, Count = g.Count() })
                .ToList(),
            ByStage = patients
                .GroupBy(p => p.WHOStage)
                .Select(g => new HivPatientByStageDto { WHOStage = g.Key, Count = g.Count() })
                .ToList(),
        };
    }

    // ==================== Lab Results ====================

    public async Task<List<HivLabResultListDto>> SearchLabResultsAsync(HivLabResultSearchDto? filter = null)
    {
        var query = _context.HivLabResults
            .Include(r => r.HivPatient)
                .ThenInclude(h => h!.Patient)
            .Where(r => !r.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (filter.HivPatientId.HasValue)
                query = query.Where(r => r.HivPatientId == filter.HivPatientId.Value);
            if (!string.IsNullOrEmpty(filter.TestType))
                query = query.Where(r => r.TestType == filter.TestType);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(r => r.TestDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(r => r.TestDate <= to.AddDays(1));
        }

        return await query
            .OrderByDescending(r => r.TestDate)
            .Take(200)
            .Select(r => new HivLabResultListDto
            {
                Id = r.Id,
                HivPatientId = r.HivPatientId,
                PatientName = r.HivPatient != null && r.HivPatient.Patient != null ? r.HivPatient.Patient.FullName : null,
                HivCode = r.HivPatient != null ? r.HivPatient.HivCode : null,
                TestDate = r.TestDate.ToString("yyyy-MM-dd"),
                TestType = r.TestType,
                Result = r.Result,
                Unit = r.Unit,
                IsAbnormal = r.IsAbnormal,
                LabName = r.LabName,
                OrderedBy = r.OrderedBy,
            })
            .ToListAsync();
    }

    public async Task<HivLabResultListDto> CreateLabResultAsync(HivLabResultCreateDto dto)
    {
        if (!await _context.HivPatients.AnyAsync(h => h.Id == dto.HivPatientId && !h.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy hồ sơ HIV.");
        // CD4 / viral load cannot be negative (a "-50" CD4 would drive the suppression/alert logic).
        if (decimal.TryParse(dto.Result, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var numeric) && numeric < 0)
            throw new ArgumentException("Kết quả xét nghiệm không được âm.");
        var entity = new HivLabResult
        {
            Id = Guid.NewGuid(),
            HivPatientId = dto.HivPatientId,
            TestDate = DateTime.TryParse(dto.TestDate, out var td) ? td : DateTime.UtcNow,
            TestType = dto.TestType,
            Result = dto.Result,
            Unit = dto.Unit,
            IsAbnormal = dto.IsAbnormal,
            LabName = dto.LabName,
            OrderedBy = dto.OrderedBy,
        };

        _context.HivLabResults.Add(entity);

        // Update the HIV patient's last lab values if CD4 or ViralLoad
        // QA-R11: only when this test is not older than the stored one — back-entering an old result used to
        // overwrite the latest CD4/VL (and flip the suppression flag) with stale values.
        var hivPatient = await _context.HivPatients.FindAsync(dto.HivPatientId);
        var inv = System.Globalization.CultureInfo.InvariantCulture;
        if (hivPatient != null)
        {
            if (dto.TestType == "CD4" && int.TryParse(dto.Result, System.Globalization.NumberStyles.Integer, inv, out var cd4)
                && (!hivPatient.LastCD4Date.HasValue || entity.TestDate >= hivPatient.LastCD4Date.Value))
            {
                hivPatient.LastCD4Count = cd4;
                hivPatient.LastCD4Date = entity.TestDate;
            }
            else if (dto.TestType == "ViralLoad" && decimal.TryParse(dto.Result, System.Globalization.NumberStyles.Number, inv, out var vl)
                && (!hivPatient.LastViralLoadDate.HasValue || entity.TestDate >= hivPatient.LastViralLoadDate.Value))
            {
                hivPatient.LastViralLoad = vl;
                hivPatient.LastViralLoadDate = entity.TestDate;
                hivPatient.IsVirallySuppressed = vl < 200; // WHO threshold
            }
        }

        await _context.SaveChangesAsync();

        return new HivLabResultListDto
        {
            Id = entity.Id,
            HivPatientId = entity.HivPatientId,
            HivCode = hivPatient?.HivCode,
            TestDate = entity.TestDate.ToString("yyyy-MM-dd"),
            TestType = entity.TestType,
            Result = entity.Result,
            Unit = entity.Unit,
            IsAbnormal = entity.IsAbnormal,
            LabName = entity.LabName,
            OrderedBy = entity.OrderedBy,
        };
    }

    // ==================== PMTCT ====================

    public async Task<List<PmtctRecordListDto>> GetPmtctRecordsByPatientAsync(Guid hivPatientId)
    {
        return await _context.PmtctRecords
            .Include(p => p.HivPatient)
                .ThenInclude(h => h!.Patient)
            .Where(p => p.HivPatientId == hivPatientId && !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PmtctRecordListDto
            {
                Id = p.Id,
                HivPatientId = p.HivPatientId,
                PatientName = p.HivPatient != null && p.HivPatient.Patient != null ? p.HivPatient.Patient.FullName : null,
                HivCode = p.HivPatient != null ? p.HivPatient.HivCode : null,
                GestationalAgeAtDiagnosis = p.GestationalAgeAtDiagnosis,
                ARTDuringPregnancy = p.ARTDuringPregnancy,
                DeliveryDate = p.DeliveryDate.HasValue ? p.DeliveryDate.Value.ToString("yyyy-MM-dd") : null,
                DeliveryMode = p.DeliveryMode,
                InfantProphylaxis = p.InfantProphylaxis,
                InfantHivTestDate = p.InfantHivTestDate.HasValue ? p.InfantHivTestDate.Value.ToString("yyyy-MM-dd") : null,
                InfantHivTestResult = p.InfantHivTestResult,
                BreastfeedingStatus = p.BreastfeedingStatus,
            })
            .ToBoundedListAsync("HivManagement.GetPmtctRecordsByPatient");
    }

    public async Task<PmtctRecordListDto> CreatePmtctRecordAsync(PmtctRecordCreateDto dto)
    {
        if (!await _context.HivPatients.AnyAsync(h => h.Id == dto.HivPatientId && !h.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy hồ sơ HIV.");
        if (dto.GestationalAgeAtDiagnosis is < 0 or > 45)
            throw new ArgumentException("Tuổi thai không hợp lệ (0-45 tuần).");
        // QA-R11: a PMTCT (mother-to-child) record could be opened for a male patient.
        if (await _context.HivPatients.AnyAsync(h => h.Id == dto.HivPatientId && h.Patient != null && h.Patient.Gender == 1))
            throw new InvalidOperationException("Hồ sơ PMTCT chỉ áp dụng cho bệnh nhân nữ.");
        var entity = new PmtctRecord
        {
            Id = Guid.NewGuid(),
            HivPatientId = dto.HivPatientId,
            PregnancyId = dto.PregnancyId,
            GestationalAgeAtDiagnosis = dto.GestationalAgeAtDiagnosis,
            ARTDuringPregnancy = dto.ARTDuringPregnancy,
            DeliveryDate = DateTime.TryParse(dto.DeliveryDate, out var dd) ? dd : null,
            DeliveryMode = dto.DeliveryMode,
            InfantProphylaxis = dto.InfantProphylaxis,
            InfantHivTestDate = DateTime.TryParse(dto.InfantHivTestDate, out var ihtd) ? ihtd : null,
            InfantHivTestResult = dto.InfantHivTestResult,
            BreastfeedingStatus = dto.BreastfeedingStatus,
        };

        _context.PmtctRecords.Add(entity);
        await _context.SaveChangesAsync();

        var hivPatient = await _context.HivPatients
            .Include(h => h.Patient)
            .FirstOrDefaultAsync(h => h.Id == dto.HivPatientId);

        return new PmtctRecordListDto
        {
            Id = entity.Id,
            HivPatientId = entity.HivPatientId,
            PatientName = hivPatient?.Patient?.FullName,
            HivCode = hivPatient?.HivCode,
            GestationalAgeAtDiagnosis = entity.GestationalAgeAtDiagnosis,
            ARTDuringPregnancy = entity.ARTDuringPregnancy,
            DeliveryDate = entity.DeliveryDate?.ToString("yyyy-MM-dd"),
            DeliveryMode = entity.DeliveryMode,
            InfantProphylaxis = entity.InfantProphylaxis,
            InfantHivTestDate = entity.InfantHivTestDate?.ToString("yyyy-MM-dd"),
            InfantHivTestResult = entity.InfantHivTestResult,
            BreastfeedingStatus = entity.BreastfeedingStatus,
        };
    }

    public async Task<PmtctRecordListDto> UpdatePmtctRecordAsync(Guid id, PmtctRecordUpdateDto dto)
    {
        var entity = await _context.PmtctRecords
            .Include(p => p.HivPatient)
                .ThenInclude(h => h!.Patient)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ PMTCT.");

        if (dto.ARTDuringPregnancy.HasValue) entity.ARTDuringPregnancy = dto.ARTDuringPregnancy.Value;
        if (!string.IsNullOrEmpty(dto.DeliveryDate) && DateTime.TryParse(dto.DeliveryDate, out var dd))
            entity.DeliveryDate = dd;
        if (dto.DeliveryMode != null) entity.DeliveryMode = dto.DeliveryMode;
        if (dto.InfantProphylaxis.HasValue) entity.InfantProphylaxis = dto.InfantProphylaxis.Value;
        if (!string.IsNullOrEmpty(dto.InfantHivTestDate) && DateTime.TryParse(dto.InfantHivTestDate, out var ihtd))
            entity.InfantHivTestDate = ihtd;
        if (dto.InfantHivTestResult != null) entity.InfantHivTestResult = dto.InfantHivTestResult;
        if (dto.BreastfeedingStatus != null) entity.BreastfeedingStatus = dto.BreastfeedingStatus;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new PmtctRecordListDto
        {
            Id = entity.Id,
            HivPatientId = entity.HivPatientId,
            PatientName = entity.HivPatient?.Patient?.FullName,
            HivCode = entity.HivPatient?.HivCode,
            GestationalAgeAtDiagnosis = entity.GestationalAgeAtDiagnosis,
            ARTDuringPregnancy = entity.ARTDuringPregnancy,
            DeliveryDate = entity.DeliveryDate?.ToString("yyyy-MM-dd"),
            DeliveryMode = entity.DeliveryMode,
            InfantProphylaxis = entity.InfantProphylaxis,
            InfantHivTestDate = entity.InfantHivTestDate?.ToString("yyyy-MM-dd"),
            InfantHivTestResult = entity.InfantHivTestResult,
            BreastfeedingStatus = entity.BreastfeedingStatus,
        };
    }

    public async Task<PmtctStatsDto> GetPmtctStatsAsync()
    {
        var records = await _context.PmtctRecords
            .Where(p => !p.IsDeleted)
            .ToListAsync();

        var tested = records.Count(r => !string.IsNullOrEmpty(r.InfantHivTestResult));
        var positive = records.Count(r => r.InfantHivTestResult == "Positive");

        return new PmtctStatsDto
        {
            TotalPregnancies = records.Count,
            ARTDuringPregnancyCount = records.Count(r => r.ARTDuringPregnancy),
            InfantProphylaxisCount = records.Count(r => r.InfantProphylaxis),
            InfantTestedCount = tested,
            InfantPositiveCount = positive,
            TransmissionRate = tested > 0 ? Math.Round((double)positive / tested * 100, 1) : 0,
        };
    }
}
