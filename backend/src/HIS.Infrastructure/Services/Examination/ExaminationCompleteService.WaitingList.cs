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

// K4 phien 7 (2026-05-30): tach Section 2.1 Waiting Room Display + 2.2 Room Patient List (~324 dong)
// khoi ExaminationCompleteService.cs. ZERO runtime change — partial class.
public partial class ExaminationCompleteService
{
    #region 2.1 Waiting Room Display

    public async Task<WaitingRoomDisplayDto> GetWaitingRoomDisplayAsync(Guid roomId)
    {
        var room = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == roomId);

        var today = DateTime.Today;
        var examinations = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Where(e => e.RoomId == roomId && e.MedicalRecord.AdmissionDate.Date == today)
            .ToListAsync();

        var currentServing = examinations.FirstOrDefault(e => e.Status == 1);
        var callingList = examinations.Where(e => e.Status == 1).OrderBy(e => e.QueueNumber).ToList();
        var waitingList = examinations.Where(e => e.Status == 0).OrderBy(e => e.QueueNumber).ToList();

        return new WaitingRoomDisplayDto
        {
            RoomId = roomId,
            RoomCode = room?.RoomCode ?? "",
            RoomName = room?.RoomName ?? "",
            DepartmentName = room?.Department?.DepartmentName,
            CurrentNumber = currentServing?.QueueNumber,
            CurrentPatientName = currentServing?.MedicalRecord?.Patient?.FullName,
            CallingList = callingList.Take(5).Select(e => new CallingPatientDto
            {
                QueueNumber = e.QueueNumber,
                PatientName = e.MedicalRecord?.Patient?.FullName ?? "",
                CalledCount = 1,
                CalledAt = e.StartTime
            }).ToList(),
            WaitingList = waitingList.Take(20).Select(e => new WaitingPatientDto
            {
                ExaminationId = e.Id,
                QueueNumber = e.QueueNumber,
                PatientName = e.MedicalRecord?.Patient?.FullName ?? "",
                Priority = 0,
                IsInsurance = e.MedicalRecord?.PatientType == 1,
                Status = e.Status,
                WaitingMinutes = (int)(DateTime.Now - e.MedicalRecord.AdmissionDate).TotalMinutes
            }).ToList(),
            TotalWaiting = waitingList.Count,
            TotalWaitingResult = examinations.Count(e => e.Status == 2 || e.Status == 3),
            TotalCompleted = examinations.Count(e => e.Status == 4)
        };
    }

    public async Task<List<WaitingRoomDisplayDto>> GetDepartmentWaitingRoomDisplaysAsync(Guid departmentId)
    {
        var rooms = await _context.Rooms
            .Where(r => r.DepartmentId == departmentId && r.IsActive)
            .ToListAsync();

        var result = new List<WaitingRoomDisplayDto>();
        foreach (var room in rooms)
        {
            result.Add(await GetWaitingRoomDisplayAsync(room.Id));
        }
        return result;
    }

    public async Task<bool> UpdateWaitingRoomDisplayConfigAsync(Guid roomId, WaitingRoomDisplayConfigDto config)
    {
        var existing = await _context.WaitingRoomDisplayConfigs
            .FirstOrDefaultAsync(c => c.RoomId == roomId);

        if (existing == null)
        {
            existing = new WaitingRoomDisplayConfig
            {
                Id = Guid.NewGuid(),
                RoomId = roomId
            };
            await _context.WaitingRoomDisplayConfigs.AddAsync(existing);
        }

        existing.DisplayTitle = config.DisplayTitle;
        existing.DisplayRows = config.DisplayRows;
        existing.ShowPatientName = config.ShowPatientName;
        existing.ShowPatientCode = config.ShowPatientCode;
        existing.EnableVoiceCall = config.EnableVoiceCall;
        existing.CallIntervalSeconds = config.CallIntervalSeconds;
        existing.IsActive = true;

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<CallingPatientDto?> CallNextPatientAsync(Guid roomId)
    {
        var today = DateTime.Today;
        var nextPatient = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Where(e => e.RoomId == roomId && e.MedicalRecord.AdmissionDate.Date == today && e.Status == 0)
            .OrderBy(e => e.QueueNumber)
            .FirstOrDefaultAsync();

        if (nextPatient == null) return null;

        nextPatient.Status = 1; // Calling
        nextPatient.StartTime = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new CallingPatientDto
        {
            QueueNumber = nextPatient.QueueNumber,
            PatientName = nextPatient.MedicalRecord?.Patient?.FullName ?? "",
            CalledCount = 1,
            CalledAt = DateTime.Now
        };
    }

    public async Task<CallingPatientDto> RecallPatientAsync(Guid examinationId)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        return new CallingPatientDto
        {
            QueueNumber = examination.QueueNumber,
            PatientName = examination.MedicalRecord?.Patient?.FullName ?? "",
            CalledCount = 2,
            CalledAt = DateTime.Now
        };
    }

    public async Task<bool> SkipPatientAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return false;

        // Move to end of queue
        var maxQueue = await _context.Examinations
            .Where(e => e.RoomId == examination.RoomId && e.MedicalRecord.AdmissionDate.Date == DateTime.Today)
            .MaxAsync(e => (int?)e.QueueNumber) ?? 0;

        examination.QueueNumber = maxQueue + 1;
        examination.Status = 0; // Back to waiting
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    #endregion

    #region 2.2 Room Patient List

    public async Task<List<RoomPatientListDto>> GetRoomPatientListAsync(Guid roomId, DateTime date, int? status = null)
    {
        var query = _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Where(e => e.RoomId == roomId && e.MedicalRecord.AdmissionDate.Date == date.Date);

        if (status.HasValue)
            query = query.Where(e => e.Status == status.Value);

        var examinations = await query.OrderBy(e => e.QueueNumber).ToListAsync();

        return examinations.Select(e => MapToRoomPatientListDto(e)).ToList();
    }

    public async Task<List<RoomPatientListDto>> SearchRoomPatientsAsync(Guid roomId, string keyword, DateTime date)
    {
        var patients = await GetRoomPatientListAsync(roomId, date);

        return patients.Where(p =>
            p.PatientCode.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
            p.PatientName.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    public async Task<List<RoomPatientListDto>> FilterPatientsByConditionAsync(Guid roomId, PatientFilterDto filter)
    {
        var patients = await GetRoomPatientListAsync(roomId, DateTime.Today);

        if (filter.IsInsurance.HasValue)
            patients = patients.Where(p => (p.PatientType == 1) == filter.IsInsurance.Value).ToList();

        if (filter.IsPriority.HasValue)
            patients = patients.Where(p => p.IsPriority == filter.IsPriority.Value).ToList();

        if (filter.IsEmergency.HasValue)
            patients = patients.Where(p => p.IsEmergency == filter.IsEmergency.Value).ToList();

        if (filter.Status.HasValue)
            patients = patients.Where(p => p.Status == filter.Status.Value).ToList();

        return patients;
    }

    public async Task<PatientLabResultsDto> GetPatientLabResultsAsync(Guid examinationId)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        // Get lab results
        var labResults = await _context.LabResults
            .Include(r => r.LabRequestItem)
            .ThenInclude(i => i.LabRequest)
            .Where(r => r.LabRequestItem.LabRequest.MedicalRecordId == examination.MedicalRecordId)
            .OrderByDescending(r => r.ResultDate)
            .Select(r => new LabResultSummaryDto
            {
                Id = r.Id,
                TestCode = r.LabRequestItem.TestCode,
                TestName = r.LabRequestItem.TestName,
                ResultValue = r.ResultValue,
                Unit = r.Unit,
                ReferenceRange = r.ReferenceRange,
                IsAbnormal = r.IsAbnormal,
                ResultDate = r.ResultDate,
                Status = r.Status
            })
            .ToListAsync();

        // Get imaging results
        var imagingResults = await _context.RadiologyReports
            .Include(r => r.RadiologyExam)
            .ThenInclude(e => e.RadiologyRequest)
            .Include(r => r.RadiologyExam.Modality)
            .Where(r => r.RadiologyExam.RadiologyRequest.MedicalRecordId == examination.MedicalRecordId)
            .OrderByDescending(r => r.ReportDate)
            .Select(r => new ImagingResultSummaryDto
            {
                Id = r.Id,
                ExamCode = r.RadiologyExam.ExamCode,
                ExamName = r.RadiologyExam.ExamName,
                Modality = r.RadiologyExam.Modality.ModalityName,
                Findings = r.Findings,
                Conclusion = r.Impression ?? string.Empty,
                ResultDate = r.ReportDate,
                Status = r.Status
            })
            .ToListAsync();

        return new PatientLabResultsDto
        {
            PatientId = examination.MedicalRecord?.PatientId ?? Guid.Empty,
            ExaminationId = examinationId,
            LabResults = labResults,
            ImagingResults = imagingResults
        };
    }

    public async Task<List<LabStatusDto>> GetPendingLabStatusAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return new List<LabStatusDto>();

        // Get pending lab requests
        var labItems = await _context.LabRequestItems
            .Include(i => i.LabRequest)
            .Where(i => i.LabRequest.MedicalRecordId == examination.MedicalRecordId && i.Status < 3) // Not completed
            .ToListAsync();

        var labRequests = labItems.Select(i => new LabStatusDto
        {
            RequestId = i.LabRequestId,
            TestCode = i.TestCode,
            TestName = i.TestName,
            Status = i.Status,
            StatusName = GetLabStatusName(i.Status),
            RequestedAt = i.LabRequest?.RequestDate,
            EstimatedCompletionTime = i.LabRequest?.RequestDate.AddHours(2)
        }).ToList();

        // Get pending imaging requests
        var imagingItems = await _context.RadiologyExams
            .Include(e => e.RadiologyRequest)
            .Where(e => e.RadiologyRequest.MedicalRecordId == examination.MedicalRecordId && e.Status < 3)
            .ToListAsync();

        var imagingRequests = imagingItems.Select(e => new LabStatusDto
        {
            RequestId = e.RadiologyRequestId,
            TestCode = e.ExamCode,
            TestName = e.ExamName,
            Status = e.Status,
            StatusName = GetImagingStatusName(e.Status),
            RequestedAt = e.RadiologyRequest?.RequestDate,
            EstimatedCompletionTime = e.RadiologyRequest?.RequestDate.AddHours(1)
        }).ToList();

        return labRequests.Concat(imagingRequests).ToList();
    }

    public async Task<string?> GetPatientPhotoAsync(Guid patientId)
    {
        var patient = await _patientRepo.GetByIdAsync(patientId);
        return patient?.PhotoPath;
    }

    public async Task<bool> UpdatePatientPhotoAsync(Guid patientId, string photoBase64)
    {
        var patient = await _patientRepo.GetByIdAsync(patientId);
        if (patient == null) return false;

        // Save photo to local storage
        var photoDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "photos", patientId.ToString());
        Directory.CreateDirectory(photoDir);
        var fileName = $"{Guid.NewGuid()}.jpg";
        var filePath = Path.Combine(photoDir, fileName);
        var photoBytes = Convert.FromBase64String(photoBase64);
        await File.WriteAllBytesAsync(filePath, photoBytes);
        patient.PhotoPath = $"/photos/{patientId}/{fileName}";
        await _patientRepo.UpdateAsync(patient);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    #endregion
}
