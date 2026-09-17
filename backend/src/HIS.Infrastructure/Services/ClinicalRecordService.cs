using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Clinical;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class ClinicalRecordService : IClinicalRecordService
{
    private readonly HISDbContext _context;

    public ClinicalRecordService(HISDbContext context)
    {
        _context = context;
    }

    // ========== Partograph ==========

    public async Task<List<PartographRecordDto>> GetPartographRecordsAsync(PartographSearchDto filter)
    {
        var query = _context.PartographRecords
            .Where(r => !r.IsDeleted)
            .AsQueryable();

        if (filter.AdmissionId.HasValue)
        {
            query = query.Where(r => r.AdmissionId == filter.AdmissionId.Value);
        }
        if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
        {
            query = query.Where(r => r.RecordTime >= from);
        }
        if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
        {
            query = query.Where(r => r.RecordTime <= to.AddDays(1));
        }

        return await query
            .OrderBy(r => r.RecordTime)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(r => new PartographRecordDto
            {
                Id = r.Id,
                AdmissionId = r.AdmissionId,
                PatientId = r.PatientId,
                PatientName = r.PatientName,
                RecordTime = r.RecordTime.ToString("yyyy-MM-ddTHH:mm:ss"),
                CervicalDilation = r.CervicalDilation,
                ContractionFrequency = r.ContractionFrequency,
                ContractionDuration = r.ContractionDuration,
                FetalHeartRate = r.FetalHeartRate,
                AmnioticFluid = r.AmnioticFluid,
                MouldingDegree = r.MouldingDegree,
                FetalPosition = r.FetalPosition,
                SystolicBP = r.SystolicBP,
                DiastolicBP = r.DiastolicBP,
                MaternalPulse = r.MaternalPulse,
                Temperature = r.Temperature,
                OxytocinDose = r.OxytocinDose,
                DrugGiven = r.DrugGiven,
                AlertLine = r.AlertLine,
                Notes = r.Notes,
                CreatedBy = r.CreatedBy,
                CreatedAt = r.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
            })
            .ToListAsync();
    }

    public async Task<PartographRecordDto> SavePartographRecordAsync(PartographSaveDto dto)
    {
        PartographRecord record;

        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            // Update existing
            record = await _context.PartographRecords.FindAsync(dto.Id.Value)
                ?? throw new KeyNotFoundException("Không tìm thấy biểu đồ chuyển dạ.");
            // TT46 (QA-R2): biểu đồ chuyển dạ là nội dung HSBA — trước đây ghi được vào hồ sơ đã khoá.
            await EnsurePartographParentEditableAsync(record.AdmissionId);

            record.RecordTime = dto.RecordTime;
            record.CervicalDilation = dto.CervicalDilation;
            record.ContractionFrequency = dto.ContractionFrequency;
            record.ContractionDuration = dto.ContractionDuration;
            record.FetalHeartRate = dto.FetalHeartRate;
            record.AmnioticFluid = dto.AmnioticFluid;
            record.MouldingDegree = dto.MouldingDegree;
            record.FetalPosition = dto.FetalPosition;
            record.SystolicBP = dto.SystolicBP;
            record.DiastolicBP = dto.DiastolicBP;
            record.MaternalPulse = dto.MaternalPulse;
            record.Temperature = dto.Temperature;
            record.OxytocinDose = dto.OxytocinDose;
            record.DrugGiven = dto.DrugGiven;
            record.AlertLine = dto.AlertLine;
            record.Notes = dto.Notes;
            record.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            // Create new
            await EnsurePartographParentEditableAsync(dto.AdmissionId); // TT46 + QA-R4 parent must exist
            // QA-R6 (patient safety): the patient comes from the admission / record, not from the body.
            var parentPatientId = await ResolvePartographPatientAsync(dto.AdmissionId);
            if (parentPatientId.HasValue)
            {
                if (dto.PatientId != Guid.Empty && dto.PatientId != parentPatientId.Value)
                    throw new InvalidOperationException("Bệnh nhân không khớp với lượt nội trú / hồ sơ của biểu đồ chuyển dạ.");
                dto.PatientId = parentPatientId.Value;
            }
            if (dto.PatientId == Guid.Empty || !await _context.Patients.AnyAsync(p => p.Id == dto.PatientId))
                throw new KeyNotFoundException("Không tìm thấy bệnh nhân của biểu đồ chuyển dạ.");
            record = new PartographRecord
            {
                Id = Guid.NewGuid(),
                AdmissionId = dto.AdmissionId,
                PatientId = dto.PatientId,
                PatientName = dto.PatientName ?? string.Empty,
                RecordTime = dto.RecordTime,
                CervicalDilation = dto.CervicalDilation,
                ContractionFrequency = dto.ContractionFrequency,
                ContractionDuration = dto.ContractionDuration,
                FetalHeartRate = dto.FetalHeartRate,
                AmnioticFluid = dto.AmnioticFluid,
                MouldingDegree = dto.MouldingDegree,
                FetalPosition = dto.FetalPosition,
                SystolicBP = dto.SystolicBP,
                DiastolicBP = dto.DiastolicBP,
                MaternalPulse = dto.MaternalPulse,
                Temperature = dto.Temperature,
                OxytocinDose = dto.OxytocinDose,
                DrugGiven = dto.DrugGiven,
                AlertLine = dto.AlertLine,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
            };
            _context.PartographRecords.Add(record);
        }

        await _context.SaveChangesAsync();

        return new PartographRecordDto
        {
            Id = record.Id,
            AdmissionId = record.AdmissionId,
            PatientId = record.PatientId,
            PatientName = record.PatientName,
            RecordTime = record.RecordTime.ToString("yyyy-MM-ddTHH:mm:ss"),
            CervicalDilation = record.CervicalDilation,
            ContractionFrequency = record.ContractionFrequency,
            ContractionDuration = record.ContractionDuration,
            FetalHeartRate = record.FetalHeartRate,
            AmnioticFluid = record.AmnioticFluid,
            MouldingDegree = record.MouldingDegree,
            FetalPosition = record.FetalPosition,
            SystolicBP = record.SystolicBP,
            DiastolicBP = record.DiastolicBP,
            MaternalPulse = record.MaternalPulse,
            Temperature = record.Temperature,
            OxytocinDose = record.OxytocinDose,
            DrugGiven = record.DrugGiven,
            AlertLine = record.AlertLine,
            Notes = record.Notes,
            CreatedBy = record.CreatedBy,
            CreatedAt = record.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
        };
    }

    public async Task<bool> DeletePartographRecordAsync(Guid id)
    {
        var record = await _context.PartographRecords.FindAsync(id);
        if (record == null) return false;
        await EnsurePartographParentEditableAsync(record.AdmissionId); // TT46

        record.IsDeleted = true;
        record.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // ========== Anesthesia ==========

    public async Task<List<AnesthesiaRecordDto>> GetAnesthesiaRecordsAsync(AnesthesiaSearchDto filter)
    {
        var query = _context.AnesthesiaRecords
            .Where(r => !r.IsDeleted)
            .AsQueryable();

        if (filter.SurgeryId.HasValue)
        {
            query = query.Where(r => r.SurgeryId == filter.SurgeryId.Value);
        }
        if (filter.PatientId.HasValue)
        {
            query = query.Where(r => r.PatientId == filter.PatientId.Value);
        }
        if (filter.Status.HasValue)
        {
            query = query.Where(r => r.Status == filter.Status.Value);
        }
        if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
        {
            query = query.Where(r => r.CreatedAt >= from);
        }
        if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
        {
            query = query.Where(r => r.CreatedAt <= to.AddDays(1));
        }

        var records = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        var recordIds = records.Select(r => r.Id).ToList();

        // Load child collections in bulk
        var monitors = await _context.AnesthesiaMonitors
            .Where(m => recordIds.Contains(m.AnesthesiaRecordId) && !m.IsDeleted)
            .OrderBy(m => m.MonitorTime)
            .ToListAsync();

        var drugs = await _context.AnesthesiaDrugs
            .Where(d => recordIds.Contains(d.AnesthesiaRecordId) && !d.IsDeleted)
            .OrderBy(d => d.GivenTime)
            .ToListAsync();

        var fluids = await _context.AnesthesiaFluids
            .Where(f => recordIds.Contains(f.AnesthesiaRecordId) && !f.IsDeleted)
            .OrderBy(f => f.StartTime)
            .ToListAsync();

        return records.Select(r => MapAnesthesiaDto(r,
            monitors.Where(m => m.AnesthesiaRecordId == r.Id).ToList(),
            drugs.Where(d => d.AnesthesiaRecordId == r.Id).ToList(),
            fluids.Where(f => f.AnesthesiaRecordId == r.Id).ToList()
        )).ToList();
    }

    public async Task<AnesthesiaRecordDto?> GetAnesthesiaByIdAsync(Guid id)
    {
        var record = await _context.AnesthesiaRecords
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (record == null) return null;

        var monitors = await _context.AnesthesiaMonitors
            .Where(m => m.AnesthesiaRecordId == id && !m.IsDeleted)
            .OrderBy(m => m.MonitorTime)
            .ToListAsync();

        var drugs = await _context.AnesthesiaDrugs
            .Where(d => d.AnesthesiaRecordId == id && !d.IsDeleted)
            .OrderBy(d => d.GivenTime)
            .ToListAsync();

        var fluids = await _context.AnesthesiaFluids
            .Where(f => f.AnesthesiaRecordId == id && !f.IsDeleted)
            .OrderBy(f => f.StartTime)
            .ToListAsync();

        return MapAnesthesiaDto(record, monitors, drugs, fluids);
    }

    public async Task<AnesthesiaRecordDto> SaveAnesthesiaRecordAsync(AnesthesiaSaveDto dto)
    {
        AnesthesiaRecord record;

        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            // Update existing record
            record = await _context.AnesthesiaRecords.FindAsync(dto.Id.Value)
                ?? throw new InvalidOperationException("Anesthesia record not found");
            await EnsureAnesthesiaEditableAsync(record.SurgeryId); // TT46

            record.AsaClass = dto.AsaClass;
            record.MallampatiScore = dto.MallampatiScore;
            record.Allergies = dto.Allergies;
            record.NpoStatus = dto.NpoStatus;
            record.AnesthesiaType = dto.AnesthesiaType;
            record.AirwayPlan = dto.AirwayPlan;
            record.PreOpAssessment = dto.PreOpAssessment;
            record.PsychologicalAssessment = dto.PsychologicalAssessment;
            record.RecoveryNotes = dto.RecoveryNotes;
            record.PostSurgeryPlan = dto.PostSurgeryPlan;
            record.Status = dto.Status;
            record.UpdatedAt = DateTime.UtcNow;

            // Replace child collections: soft-delete old, add new
            await ReplaceAnesthesiaChildrenAsync(record.Id, dto);
        }
        else
        {
            // Create new record
            // QA-R4: a zero / unknown SurgeryId or PatientId created an orphan record (200) that no surgery
            // or EMR screen could ever list.
            if (dto.SurgeryId == Guid.Empty || !await AnesthesiaParentExistsAsync(dto.SurgeryId))
                throw new KeyNotFoundException("Không tìm thấy ca mổ / hồ sơ bệnh án của phiếu gây mê.");
            // QA-R6 (patient safety): the patient was taken from the body — a record for surgery A was filed under
            // any other patient's EMR. The parent (record / surgery request / schedule / surgery) decides the patient.
            var parentPatientId = await ResolveAnesthesiaPatientAsync(dto.SurgeryId);
            if (parentPatientId.HasValue)
            {
                if (dto.PatientId != Guid.Empty && dto.PatientId != parentPatientId.Value)
                    throw new InvalidOperationException("Bệnh nhân không khớp với ca mổ / hồ sơ của phiếu gây mê.");
                dto.PatientId = parentPatientId.Value;
            }
            if (dto.PatientId == Guid.Empty || !await _context.Patients.AnyAsync(p => p.Id == dto.PatientId))
                throw new KeyNotFoundException("Không tìm thấy bệnh nhân của phiếu gây mê.");
            await EnsureAnesthesiaEditableAsync(dto.SurgeryId); // TT46
            record = new AnesthesiaRecord
            {
                Id = Guid.NewGuid(),
                SurgeryId = dto.SurgeryId,
                PatientId = dto.PatientId,
                PatientName = dto.PatientName ?? string.Empty,
                AsaClass = dto.AsaClass,
                MallampatiScore = dto.MallampatiScore,
                Allergies = dto.Allergies,
                NpoStatus = dto.NpoStatus,
                AnesthesiaType = dto.AnesthesiaType,
                AirwayPlan = dto.AirwayPlan,
                PreOpAssessment = dto.PreOpAssessment,
                PsychologicalAssessment = dto.PsychologicalAssessment,
                RecoveryNotes = dto.RecoveryNotes,
                PostSurgeryPlan = dto.PostSurgeryPlan,
                Status = dto.Status,
                CreatedAt = DateTime.UtcNow,
            };
            _context.AnesthesiaRecords.Add(record);
            await _context.SaveChangesAsync();

            // Add child collections
            await AddAnesthesiaChildrenAsync(record.Id, dto);
        }

        await _context.SaveChangesAsync();

        // Reload and return
        return (await GetAnesthesiaByIdAsync(record.Id))!;
    }

    public async Task<bool> DeleteAnesthesiaRecordAsync(Guid id)
    {
        var record = await _context.AnesthesiaRecords.FindAsync(id);
        if (record == null) return false;
        await EnsureAnesthesiaEditableAsync(record.SurgeryId); // TT46

        record.IsDeleted = true;
        record.UpdatedAt = DateTime.UtcNow;

        // Soft-delete children
        var monitors = await _context.AnesthesiaMonitors
            .Where(m => m.AnesthesiaRecordId == id && !m.IsDeleted)
            .ToListAsync();
        foreach (var m in monitors) { m.IsDeleted = true; m.UpdatedAt = DateTime.UtcNow; }

        var drugs = await _context.AnesthesiaDrugs
            .Where(d => d.AnesthesiaRecordId == id && !d.IsDeleted)
            .ToListAsync();
        foreach (var d in drugs) { d.IsDeleted = true; d.UpdatedAt = DateTime.UtcNow; }

        var fluids = await _context.AnesthesiaFluids
            .Where(f => f.AnesthesiaRecordId == id && !f.IsDeleted)
            .ToListAsync();
        foreach (var f in fluids) { f.IsDeleted = true; f.UpdatedAt = DateTime.UtcNow; }

        await _context.SaveChangesAsync();
        return true;
    }

    // ========== Private helpers ==========

    /// <summary>
    /// TT46 (QA-R2): anesthesia records only carry <c>SurgeryId</c>, which callers fill with a
    /// SurgeryRecord / SurgerySchedule / SurgeryRequest id — or, from EmrEditor, the MedicalRecordId
    /// itself. Resolve whichever it is to the owning medical record and apply the EMR lock.
    /// </summary>
    /// <summary>
    /// QA-R4: <c>PartographRecord.AdmissionId</c> holds an Admission id from the obstetric screens but the
    /// MedicalRecordId from EmrEditor (see EmrEditor.savePartograph). Resolve either, apply the TT46 lock,
    /// and refuse an id that is neither (previously an orphan row with a zero GUID was written).
    /// </summary>
    private async Task EnsurePartographParentEditableAsync(Guid admissionOrRecordId)
    {
        if (admissionOrRecordId == Guid.Empty)
            throw new KeyNotFoundException("Không tìm thấy lượt nội trú / hồ sơ bệnh án của biểu đồ chuyển dạ.");
        if (await _context.Admissions.AnyAsync(a => a.Id == admissionOrRecordId))
        {
            await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, admissionOrRecordId);
            return;
        }
        if (await _context.MedicalRecords.AnyAsync(m => m.Id == admissionOrRecordId))
        {
            await EmrLockGuard.EnsureEditableByRecordAsync(_context, admissionOrRecordId);
            return;
        }
        throw new KeyNotFoundException("Không tìm thấy lượt nội trú / hồ sơ bệnh án của biểu đồ chuyển dạ.");
    }

    /// <summary>QA-R6: patient of the partograph parent (admission or medical record).</summary>
    private async Task<Guid?> ResolvePartographPatientAsync(Guid admissionOrRecordId)
        => await _context.Admissions.Where(a => a.Id == admissionOrRecordId).Select(a => (Guid?)a.PatientId).FirstOrDefaultAsync()
           ?? await _context.MedicalRecords.Where(m => m.Id == admissionOrRecordId).Select(m => (Guid?)m.PatientId).FirstOrDefaultAsync();

    /// <summary>Patient of the anesthesia parent (same four parent kinds as AnesthesiaParentExistsAsync).</summary>
    private async Task<Guid?> ResolveAnesthesiaPatientAsync(Guid surgeryId)
        => await _context.MedicalRecords.Where(m => m.Id == surgeryId).Select(m => (Guid?)m.PatientId).FirstOrDefaultAsync()
           ?? await _context.SurgeryRequests.Where(r => r.Id == surgeryId).Select(r => (Guid?)r.PatientId).FirstOrDefaultAsync()
           ?? await _context.SurgerySchedules.Where(s => s.Id == surgeryId).Select(s => (Guid?)s.SurgeryRequest.PatientId).FirstOrDefaultAsync()
           ?? await _context.SurgeryRecords.Where(r => r.Id == surgeryId).Select(r => (Guid?)r.SurgerySchedule.SurgeryRequest.PatientId).FirstOrDefaultAsync();

    /// <summary>QA-R4: SurgeryId must be a MedicalRecord, SurgeryRecord, SurgerySchedule or SurgeryRequest id.</summary>
    private async Task<bool> AnesthesiaParentExistsAsync(Guid surgeryId)
        => await _context.MedicalRecords.AnyAsync(m => m.Id == surgeryId)
           || await _context.SurgeryRecords.AnyAsync(r => r.Id == surgeryId)
           || await _context.SurgerySchedules.AnyAsync(s => s.Id == surgeryId)
           || await _context.SurgeryRequests.AnyAsync(r => r.Id == surgeryId);

    private async Task EnsureAnesthesiaEditableAsync(Guid surgeryId)
    {
        if (surgeryId == Guid.Empty) return;

        if (await _context.MedicalRecords.AnyAsync(m => m.Id == surgeryId))
        {
            await EmrLockGuard.EnsureEditableByRecordAsync(_context, surgeryId);
            return;
        }

        var requestId = await _context.SurgeryRecords.Where(r => r.Id == surgeryId)
            .Join(_context.SurgerySchedules, r => r.SurgeryScheduleId, s => s.Id, (r, s) => (Guid?)s.SurgeryRequestId)
            .FirstOrDefaultAsync()
            ?? await _context.SurgerySchedules.Where(s => s.Id == surgeryId)
                .Select(s => (Guid?)s.SurgeryRequestId).FirstOrDefaultAsync()
            ?? surgeryId;

        var request = await _context.SurgeryRequests.AsNoTracking()
            .Where(r => r.Id == requestId)
            .Select(r => new { r.MedicalRecordId, r.ExaminationId })
            .FirstOrDefaultAsync();
        if (request == null) return;
        if (request.MedicalRecordId.HasValue)
            await EmrLockGuard.EnsureEditableByRecordAsync(_context, request.MedicalRecordId.Value);
        else if (request.ExaminationId.HasValue)
            await EmrLockGuard.EnsureEditableByExaminationAsync(_context, request.ExaminationId.Value);
    }

    private async Task ReplaceAnesthesiaChildrenAsync(Guid recordId, AnesthesiaSaveDto dto)
    {
        // Soft-delete existing children
        var oldMonitors = await _context.AnesthesiaMonitors
            .Where(m => m.AnesthesiaRecordId == recordId && !m.IsDeleted)
            .ToListAsync();
        foreach (var m in oldMonitors) { m.IsDeleted = true; m.UpdatedAt = DateTime.UtcNow; }

        var oldDrugs = await _context.AnesthesiaDrugs
            .Where(d => d.AnesthesiaRecordId == recordId && !d.IsDeleted)
            .ToListAsync();
        foreach (var d in oldDrugs) { d.IsDeleted = true; d.UpdatedAt = DateTime.UtcNow; }

        var oldFluids = await _context.AnesthesiaFluids
            .Where(f => f.AnesthesiaRecordId == recordId && !f.IsDeleted)
            .ToListAsync();
        foreach (var f in oldFluids) { f.IsDeleted = true; f.UpdatedAt = DateTime.UtcNow; }

        // Add new children
        await AddAnesthesiaChildrenAsync(recordId, dto);
    }

    private async Task AddAnesthesiaChildrenAsync(Guid recordId, AnesthesiaSaveDto dto)
    {
        // Monitors
        foreach (var m in dto.Monitors)
        {
            if (!DateTime.TryParse(m.MonitorTime, out var monitorTime))
                monitorTime = HIS.Core.Common.VnTime.NowVn; // business timestamp = VN local (parsed values are local too)

            _context.AnesthesiaMonitors.Add(new AnesthesiaMonitor
            {
                Id = Guid.NewGuid(),
                AnesthesiaRecordId = recordId,
                MonitorTime = monitorTime,
                SystolicBP = m.SystolicBP,
                DiastolicBP = m.DiastolicBP,
                HeartRate = m.HeartRate,
                SpO2 = m.SpO2,
                EtCO2 = m.EtCO2,
                Temperature = m.Temperature,
                Notes = m.Notes,
                CreatedAt = DateTime.UtcNow,
            });
        }

        // Drugs
        foreach (var d in dto.Drugs)
        {
            if (!DateTime.TryParse(d.GivenTime, out var givenTime))
                givenTime = HIS.Core.Common.VnTime.NowVn;

            _context.AnesthesiaDrugs.Add(new AnesthesiaDrug
            {
                Id = Guid.NewGuid(),
                AnesthesiaRecordId = recordId,
                GivenTime = givenTime,
                DrugName = d.DrugName,
                Dose = d.Dose,
                Route = d.Route,
                CreatedAt = DateTime.UtcNow,
            });
        }

        // Fluids
        foreach (var f in dto.Fluids)
        {
            DateTime? startTime = null;
            DateTime? endTime = null;
            if (!string.IsNullOrEmpty(f.StartTime) && DateTime.TryParse(f.StartTime, out var st))
                startTime = st;
            if (!string.IsNullOrEmpty(f.EndTime) && DateTime.TryParse(f.EndTime, out var et))
                endTime = et;

            _context.AnesthesiaFluids.Add(new AnesthesiaFluid
            {
                Id = Guid.NewGuid(),
                AnesthesiaRecordId = recordId,
                FluidType = f.FluidType,
                Volume = f.Volume,
                StartTime = startTime,
                EndTime = endTime,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _context.SaveChangesAsync();
    }

    private static AnesthesiaRecordDto MapAnesthesiaDto(
        AnesthesiaRecord r,
        List<AnesthesiaMonitor> monitors,
        List<AnesthesiaDrug> drugs,
        List<AnesthesiaFluid> fluids)
    {
        return new AnesthesiaRecordDto
        {
            Id = r.Id,
            SurgeryId = r.SurgeryId,
            PatientId = r.PatientId,
            PatientName = r.PatientName,
            AsaClass = r.AsaClass,
            MallampatiScore = r.MallampatiScore,
            Allergies = r.Allergies,
            NpoStatus = r.NpoStatus,
            AnesthesiaType = r.AnesthesiaType,
            AirwayPlan = r.AirwayPlan,
            PreOpAssessment = r.PreOpAssessment,
            PsychologicalAssessment = r.PsychologicalAssessment,
            RecoveryNotes = r.RecoveryNotes,
            PostSurgeryPlan = r.PostSurgeryPlan,
            Status = r.Status,
            CreatedBy = r.CreatedBy,
            CreatedAt = r.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
            Monitors = monitors.Select(m => new AnesthesiaMonitorDto
            {
                Id = m.Id,
                MonitorTime = m.MonitorTime.ToString("yyyy-MM-ddTHH:mm:ss"),
                SystolicBP = m.SystolicBP,
                DiastolicBP = m.DiastolicBP,
                HeartRate = m.HeartRate,
                SpO2 = m.SpO2,
                EtCO2 = m.EtCO2,
                Temperature = m.Temperature,
                Notes = m.Notes,
            }).ToList(),
            Drugs = drugs.Select(d => new AnesthesiaDrugDto
            {
                Id = d.Id,
                GivenTime = d.GivenTime.ToString("yyyy-MM-ddTHH:mm:ss"),
                DrugName = d.DrugName,
                Dose = d.Dose,
                Route = d.Route,
            }).ToList(),
            Fluids = fluids.Select(f => new AnesthesiaFluidDto
            {
                Id = f.Id,
                FluidType = f.FluidType,
                Volume = f.Volume,
                StartTime = f.StartTime?.ToString("yyyy-MM-ddTHH:mm:ss"),
                EndTime = f.EndTime?.ToString("yyyy-MM-ddTHH:mm:ss"),
            }).ToList(),
        };
    }
}
