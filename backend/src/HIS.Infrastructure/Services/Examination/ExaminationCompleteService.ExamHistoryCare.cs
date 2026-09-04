using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using ServiceDto = HIS.Application.Services.ServiceDto;
using RoomDto = HIS.Application.Services.RoomDto;
using MedicineDto = HIS.Application.Services.MedicineDto;
using DoctorDto = HIS.Application.Services.DoctorDto;
using ExamWarehouseDto = HIS.Application.Services.ExamWarehouseDto;

namespace HIS.Infrastructure.Services;

// wave-8a (2026-07-17): tach khoi ExaminationCompleteService.Exam.cs (PURE VERBATIM, khong doi logic).
public partial class ExaminationCompleteService
{
    #region 2.3 Examination Functions — Medical History / Treatment Sheet / Consultation / Nursing Care / Injury Info
    public async Task<List<Application.DTOs.MedicalHistoryDto>> GetPatientMedicalHistoryAsync(Guid patientId, int limit = 20)
    {
        // Query Examinations table to get actual examination history with room, doctor, diagnosis
        var exams = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .Where(e => e.MedicalRecord.PatientId == patientId && !e.IsDeleted)
            .OrderByDescending(e => e.StartTime != null ? e.StartTime.Value : e.CreatedAt)
            .Take(limit)
            .Select(e => new
            {
                e.Id,
                PatientId = e.MedicalRecord.PatientId,
                ExamDate = e.StartTime != null ? e.StartTime.Value : e.CreatedAt,
                e.Status,
                e.ConclusionType,
                RoomName = e.Room != null ? e.Room.RoomName : null,
                DoctorName = e.Doctor != null ? e.Doctor.FullName : null,
                e.MainIcdCode,
                e.MainDiagnosis,
            })
            .ToListAsync();

        return exams.Select(e => new Application.DTOs.MedicalHistoryDto
        {
            Id = e.Id,
            PatientId = e.PatientId,
            ExaminationId = e.Id.ToString(),
            ExaminationDate = e.ExamDate.ToString("yyyy-MM-dd"),
            RoomName = e.RoomName ?? "",
            DoctorName = e.DoctorName ?? "",
            DiagnosisCode = e.MainIcdCode ?? "",
            DiagnosisName = e.MainDiagnosis ?? "",
            ConclusionType = e.ConclusionType,
            ConclusionTypeName = e.ConclusionType switch
            {
                1 => "Cho về",
                2 => "Kê đơn",
                3 => "Nhập viện",
                4 => "Chuyển viện",
                5 => "Hẹn khám lại",
                6 => "Tử vong",
                _ => e.Status >= 4 ? "Hoàn thành" : "Đang khám",
            },
            HistoryType = "Ngoại trú",
            OccurrenceDate = e.ExamDate,
            Description = e.MainDiagnosis,
            CreatedDate = e.ExamDate,
        }).ToList();
    }

    public async Task<MedicalRecordFullDto?> GetMedicalHistoryDetailAsync(Guid examinationId)
    {
        return await GetMedicalRecordFullAsync(examinationId);
    }

    public async Task<List<string>> GetHistoryImagingImagesAsync(Guid orderId)
    {
        // Walk: RadiologyRequest -> Exams -> DicomStudies -> preview URLs.
        // orderId may be either a RadiologyRequest.Id, RadiologyExam.Id, or
        // ServiceRequestDetail.Id pointing at a radiology service. Try each.
        var studyUids = await _context.DicomStudies
            .Where(s => s.RadiologyExam != null
                && (s.RadiologyExamId == orderId
                    || s.RadiologyExam.RadiologyRequestId == orderId))
            .Select(s => s.StudyInstanceUID)
            .Where(u => !string.IsNullOrEmpty(u))
            .Distinct()
            .ToListAsync();

        if (studyUids.Count == 0)
        {
            // Fallback: order may be a ServiceRequestDetail tied to the same patient/service;
            // find the matching radiology request by ServiceId + MedicalRecord linkage.
            var detail = await _context.ServiceRequestDetails
                .Include(d => d.ServiceRequest)
                .FirstOrDefaultAsync(d => d.Id == orderId);
            if (detail?.ServiceRequest != null)
            {
                studyUids = await _context.DicomStudies
                    .Where(s => s.RadiologyExam != null
                        && s.RadiologyExam.RadiologyRequest != null
                        && s.RadiologyExam.RadiologyRequest.MedicalRecordId == detail.ServiceRequest.MedicalRecordId
                        && s.RadiologyExam.RadiologyRequest.ServiceId == detail.ServiceId)
                    .Select(s => s.StudyInstanceUID)
                    .Where(u => !string.IsNullOrEmpty(u))
                    .Distinct()
                    .ToListAsync();
            }
        }

        if (studyUids.Count == 0) return new List<string>();

        // Return wado-uri style paths the frontend already proxies via
        // /api/RISComplete/pacs/studies/{studyInstanceUID}/preview-instances.
        // The viewer page builds preview URLs by appending /pacs/instances/{id}/preview.
        return studyUids
            .Select(uid => $"/api/RISComplete/pacs/studies/{uid}")
            .ToList();
    }

    public async Task<TreatmentSheetDto> CreateTreatmentSheetAsync(TreatmentSheetDto dto)
    {
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, dto.ExaminationId); // TT46
        var sheet = new TreatmentSheet
        {
            Id = Guid.NewGuid(),
            ExaminationId = dto.ExaminationId,
            TreatmentDate = dto.TreatmentDate ?? DateTime.Now,
            Day = dto.Day,
            DoctorOrders = dto.DoctorOrders,
            DietOrders = dto.DietOrders,
            NursingCare = dto.NursingCare,
            PatientCondition = dto.PatientCondition,
            Notes = dto.Notes,
            DoctorId = dto.DoctorId,
            NurseId = dto.NurseId
        };

        await _context.TreatmentSheets.AddAsync(sheet);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = sheet.Id;
        return dto;
    }

    public async Task<TreatmentSheetDto> UpdateTreatmentSheetAsync(Guid id, TreatmentSheetDto dto)
    {
        var sheet = await _context.TreatmentSheets.FindAsync(id);
        if (sheet == null) throw new KeyNotFoundException("Treatment sheet not found");
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, sheet.ExaminationId); // TT46

        sheet.TreatmentDate = dto.TreatmentDate ?? sheet.TreatmentDate;
        sheet.Day = dto.Day;
        sheet.DoctorOrders = dto.DoctorOrders;
        sheet.DietOrders = dto.DietOrders;
        sheet.NursingCare = dto.NursingCare;
        sheet.PatientCondition = dto.PatientCondition;
        sheet.Notes = dto.Notes;
        sheet.DoctorId = dto.DoctorId;
        sheet.NurseId = dto.NurseId;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<List<TreatmentSheetDto>> GetTreatmentSheetsAsync(Guid examinationId)
    {
        return await _context.TreatmentSheets
            .Include(t => t.Doctor)
            .Include(t => t.Nurse)
            .Where(t => t.ExaminationId == examinationId)
            .OrderBy(t => t.Day)
            .ThenBy(t => t.TreatmentDate)
            .Select(t => new TreatmentSheetDto
            {
                Id = t.Id,
                ExaminationId = t.ExaminationId,
                TreatmentDate = t.TreatmentDate,
                Day = t.Day,
                DoctorOrders = t.DoctorOrders,
                DietOrders = t.DietOrders,
                NursingCare = t.NursingCare,
                PatientCondition = t.PatientCondition,
                Notes = t.Notes,
                DoctorId = t.DoctorId,
                DoctorName = t.Doctor != null ? t.Doctor.FullName : null,
                NurseId = t.NurseId,
                NurseName = t.Nurse != null ? t.Nurse.FullName : null
            })
            .ToListAsync();
    }

    public async Task<ConsultationRecordDto> CreateConsultationRecordAsync(ConsultationRecordDto dto)
    {
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, dto.ExaminationId); // TT46
        var record = new ConsultationRecord
        {
            Id = Guid.NewGuid(),
            ExaminationId = dto.ExaminationId,
            ConsultationDate = dto.ConsultationDate ?? DateTime.Now,
            ConsultationType = dto.ConsultationType,
            Reason = dto.Reason,
            Summary = dto.Summary,
            Conclusion = dto.Conclusion,
            TreatmentPlan = dto.TreatmentPlan,
            PresidedByUserId = dto.PresidedByUserId,
            SecretaryUserId = dto.SecretaryUserId,
            Participants = dto.Participants
        };

        await _context.ConsultationRecords.AddAsync(record);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = record.Id;
        return dto;
    }

    public async Task<ConsultationRecordDto> UpdateConsultationRecordAsync(Guid id, ConsultationRecordDto dto)
    {
        var record = await _context.ConsultationRecords.FindAsync(id);
        if (record == null) throw new KeyNotFoundException("Consultation record not found");
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, record.ExaminationId); // TT46

        record.ConsultationDate = dto.ConsultationDate ?? record.ConsultationDate;
        record.ConsultationType = dto.ConsultationType;
        record.Reason = dto.Reason;
        record.Summary = dto.Summary;
        record.Conclusion = dto.Conclusion;
        record.TreatmentPlan = dto.TreatmentPlan;
        record.PresidedByUserId = dto.PresidedByUserId;
        record.SecretaryUserId = dto.SecretaryUserId;
        record.Participants = dto.Participants;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<List<ConsultationRecordDto>> GetConsultationRecordsAsync(Guid examinationId)
    {
        return await _context.ConsultationRecords
            .Include(c => c.PresidedBy)
            .Include(c => c.Secretary)
            .Where(c => c.ExaminationId == examinationId)
            .OrderByDescending(c => c.ConsultationDate)
            .Select(c => new ConsultationRecordDto
            {
                Id = c.Id,
                ExaminationId = c.ExaminationId,
                ConsultationDate = c.ConsultationDate,
                ConsultationType = c.ConsultationType,
                Reason = c.Reason,
                Summary = c.Summary,
                Conclusion = c.Conclusion,
                TreatmentPlan = c.TreatmentPlan,
                PresidedByUserId = c.PresidedByUserId,
                PresidedByName = c.PresidedBy != null ? c.PresidedBy.FullName : null,
                SecretaryUserId = c.SecretaryUserId,
                SecretaryName = c.Secretary != null ? c.Secretary.FullName : null,
                Participants = c.Participants
            })
            .ToListAsync();
    }

    public async Task<NursingCareSheetDto> CreateNursingCareSheetAsync(NursingCareSheetDto dto)
    {
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, dto.ExaminationId); // TT46
        var sheet = new NursingCareSheet
        {
            Id = Guid.NewGuid(),
            ExaminationId = dto.ExaminationId,
            CareDate = dto.CareDate ?? DateTime.Now,
            CareTime = dto.CareTime,
            Temperature = dto.Temperature,
            Pulse = dto.Pulse,
            BloodPressureSystolic = dto.BloodPressureSystolic,
            BloodPressureDiastolic = dto.BloodPressureDiastolic,
            RespiratoryRate = dto.RespiratoryRate,
            SpO2 = dto.SpO2,
            NursingDiagnosis = dto.NursingDiagnosis,
            NursingInterventions = dto.NursingInterventions,
            Evaluation = dto.Evaluation,
            PatientResponse = dto.PatientResponse,
            Notes = dto.Notes,
            CareLevel = dto.CareLevel,
            NurseId = dto.NurseId
        };

        await _context.NursingCareSheets.AddAsync(sheet);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = sheet.Id;
        return dto;
    }

    public async Task<NursingCareSheetDto> UpdateNursingCareSheetAsync(Guid id, NursingCareSheetDto dto)
    {
        var sheet = await _context.NursingCareSheets.FindAsync(id);
        if (sheet == null) throw new KeyNotFoundException("Nursing care sheet not found");
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, sheet.ExaminationId); // TT46

        sheet.CareDate = dto.CareDate ?? sheet.CareDate;
        sheet.CareTime = dto.CareTime;
        sheet.Temperature = dto.Temperature;
        sheet.Pulse = dto.Pulse;
        sheet.BloodPressureSystolic = dto.BloodPressureSystolic;
        sheet.BloodPressureDiastolic = dto.BloodPressureDiastolic;
        sheet.RespiratoryRate = dto.RespiratoryRate;
        sheet.SpO2 = dto.SpO2;
        sheet.NursingDiagnosis = dto.NursingDiagnosis;
        sheet.NursingInterventions = dto.NursingInterventions;
        sheet.Evaluation = dto.Evaluation;
        sheet.PatientResponse = dto.PatientResponse;
        sheet.Notes = dto.Notes;
        sheet.CareLevel = dto.CareLevel;
        sheet.NurseId = dto.NurseId;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<List<NursingCareSheetDto>> GetNursingCareSheetsAsync(Guid examinationId)
    {
        return await _context.NursingCareSheets
            .Include(n => n.Nurse)
            .Where(n => n.ExaminationId == examinationId)
            .OrderByDescending(n => n.CareDate)
            .ThenByDescending(n => n.CareTime)
            .Select(n => new NursingCareSheetDto
            {
                Id = n.Id,
                ExaminationId = n.ExaminationId,
                CareDate = n.CareDate,
                CareTime = n.CareTime,
                Temperature = n.Temperature,
                Pulse = n.Pulse,
                BloodPressureSystolic = n.BloodPressureSystolic,
                BloodPressureDiastolic = n.BloodPressureDiastolic,
                RespiratoryRate = n.RespiratoryRate,
                SpO2 = n.SpO2,
                NursingDiagnosis = n.NursingDiagnosis,
                NursingInterventions = n.NursingInterventions,
                Evaluation = n.Evaluation,
                PatientResponse = n.PatientResponse,
                Notes = n.Notes,
                CareLevel = n.CareLevel,
                NurseId = n.NurseId,
                NurseName = n.Nurse != null ? n.Nurse.FullName : null
            })
            .ToListAsync();
    }

    public async Task<InjuryInfoDto> UpdateInjuryInfoAsync(Guid examinationId, InjuryInfoDto dto)
    {
        var existing = await _context.InjuryInfos.FirstOrDefaultAsync(i => i.ExaminationId == examinationId);

        if (existing == null)
        {
            existing = new InjuryInfo
            {
                Id = Guid.NewGuid(),
                ExaminationId = examinationId
            };
            await _context.InjuryInfos.AddAsync(existing);
        }

        existing.InjuryDate = dto.InjuryDate;
        existing.InjuryTime = dto.InjuryTime;
        existing.InjuryLocation = dto.InjuryLocation;
        existing.InjuryCause = dto.InjuryCause;
        existing.InjuryType = dto.InjuryType;
        existing.InjuryDescription = dto.InjuryDescription;
        existing.FirstAid = dto.FirstAid;
        existing.IsReportedToPolice = dto.IsReportedToPolice;
        existing.PoliceReportNumber = dto.PoliceReportNumber;
        existing.Notes = dto.Notes;
        existing.HelmetWorn = dto.HelmetWorn;
        existing.AlcoholLevel = dto.AlcoholLevel;
        existing.VehicleTypeSelf = dto.VehicleTypeSelf;
        existing.VehicleTypeCauser = dto.VehicleTypeCauser;
        existing.VehicleTypeVictim = dto.VehicleTypeVictim;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = existing.Id;
        dto.ExaminationId = examinationId;
        return dto;
    }

    public async Task<InjuryInfoDto?> GetInjuryInfoAsync(Guid examinationId)
    {
        var info = await _context.InjuryInfos.FirstOrDefaultAsync(i => i.ExaminationId == examinationId);
        if (info == null) return null;

        return new InjuryInfoDto
        {
            Id = info.Id,
            ExaminationId = info.ExaminationId,
            InjuryDate = info.InjuryDate,
            InjuryTime = info.InjuryTime,
            InjuryLocation = info.InjuryLocation,
            InjuryCause = info.InjuryCause,
            InjuryType = info.InjuryType,
            InjuryDescription = info.InjuryDescription,
            FirstAid = info.FirstAid,
            IsReportedToPolice = info.IsReportedToPolice,
            PoliceReportNumber = info.PoliceReportNumber,
            Notes = info.Notes,
            HelmetWorn = info.HelmetWorn,
            AlcoholLevel = info.AlcoholLevel,
            VehicleTypeSelf = info.VehicleTypeSelf,
            VehicleTypeCauser = info.VehicleTypeCauser,
            VehicleTypeVictim = info.VehicleTypeVictim
        };
    }

    #endregion
}
