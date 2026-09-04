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
using HIS.Infrastructure.Extensions;
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

        // AdmissionDate lưu DateTime.Now (local trên dev, UTC trên prod Cloud Run).
        // Dùng DayRangeUtc để tránh lệch bucket UTC trong khung 00h–07h sáng VN.
        var (admFromUtc, admToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
        var examinations = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Where(e => e.RoomId == roomId && e.MedicalRecord.AdmissionDate >= admFromUtc && e.MedicalRecord.AdmissionDate < admToUtc)
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
        var (admFromUtc, admToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
        var nextPatient = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Where(e => e.RoomId == roomId && e.MedicalRecord.AdmissionDate >= admFromUtc && e.MedicalRecord.AdmissionDate < admToUtc && e.Status == 0)
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

        if (examination == null) throw new KeyNotFoundException("Examination not found");

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
        var (skipFromUtc, skipToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
        var maxQueue = await _context.Examinations
            .Where(e => e.RoomId == examination.RoomId && e.MedicalRecord.AdmissionDate >= skipFromUtc && e.MedicalRecord.AdmissionDate < skipToUtc)
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
        // AdmissionDate ghi bằng DateTime.Now — dùng DayRangeUtc để so sargable.
        var (admFromUtc, admToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var query = _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Where(e => e.RoomId == roomId && e.MedicalRecord.AdmissionDate >= admFromUtc && e.MedicalRecord.AdmissionDate < admToUtc);

        if (status.HasValue)
            query = query.Where(e => e.Status == status.Value);

        var examinations = await query.OrderBy(e => e.QueueNumber).ToBoundedListAsync("Examination.GetRoomPatientList");

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

        if (examination == null) throw new KeyNotFoundException("Examination not found");

        // KQ Xét nghiệm — đọc từ ServiceRequestDetail (model 1, RequestType=1 XN), nơi
        // SampleReceive/LIS ghi KQ thật + nơi billing đọc. Bảng LabResults (model 2) thực tế
        // rỗng nên trước đây BS không bao giờ thấy KQ (audit luồng nghiệp vụ 2026-06-06 #1).
        var labResults = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == examination.MedicalRecordId
                     && d.ServiceRequest.RequestType == 1
                     && d.Status != 3
                     && (d.Status == 2 || d.Result != null || d.ResultDate != null))
            .OrderByDescending(d => d.ResultDate)
            .Select(d => new LabResultSummaryDto
            {
                Id = d.Id,
                OrderId = d.ServiceRequestId,
                TestCode = d.Service.ServiceCode,
                TestName = d.Service.ServiceName,
                ServiceCode = d.Service.ServiceCode,
                ServiceName = d.Service.ServiceName,
                ResultValue = d.Result,
                Unit = null,
                ReferenceRange = null,
                IsAbnormal = false,
                ResultDate = d.ResultDate,
                Status = d.Status
            })
            .ToListAsync();

        // R1 (conformance 2026-06-09): nạp chỉ số con per-parameter (Items) cho từng SRD lab.
        // Backward-compat: SRD legacy chưa có param con → Items rỗng, FE fallback hiển thị ResultValue (chuỗi).
        // Gom 1 query theo srdIds rồi group in-memory (tránh N+1).
        var srdIds = labResults.Select(r => r.Id).ToList();
        if (srdIds.Count > 0)
        {
            var paramRows = await _context.ServiceRequestDetailParameters
                .Where(p => srdIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted)
                .OrderBy(p => p.SequenceNumber)
                .ToListAsync();
            var byDetail = paramRows.GroupBy(p => p.ServiceRequestDetailId).ToDictionary(g => g.Key, g => g.ToList());
            foreach (var r in labResults)
            {
                if (!byDetail.TryGetValue(r.Id, out var ps)) continue;
                r.Items = ps.Select(p => new LabResultItemDto
                {
                    TestName = p.ParameterName,
                    Result = p.Value,
                    Unit = p.Unit,
                    ReferenceRange = p.ReferenceRange,
                    IsAbnormal = LabFlagEvaluator.IsAbnormal(p.Flag),
                    AbnormalType = LabFlagEvaluator.FlagToAbnormalType(p.Flag),
                    Flag = p.Flag,
                }).ToList();
            }
        }

        // KQ Chẩn đoán hình ảnh — gộp 2 nguồn: model 1 (ServiceRequestDetail RequestType=2)
        // + model 4 (RadiologyReports — nơi RIS tường trình), tránh BS bỏ sót tuỳ nguồn nhập.
        var imagingFromSr = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == examination.MedicalRecordId
                     && d.ServiceRequest.RequestType == 2
                     && d.Status != 3
                     && (d.Status == 2 || d.Result != null || d.ResultDescription != null || d.ResultDate != null))
            .OrderByDescending(d => d.ResultDate)
            .Select(d => new ImagingResultSummaryDto
            {
                Id = d.Id,
                OrderId = d.ServiceRequestId,
                ExamCode = d.Service.ServiceCode,
                ExamName = d.Service.ServiceName,
                ServiceCode = d.Service.ServiceCode,
                ServiceName = d.Service.ServiceName,
                Modality = null,
                Findings = d.ResultDescription ?? d.Result,
                Conclusion = d.Conclusion,
                ResultDate = d.ResultDate,
                Status = d.Status
            })
            .ToListAsync();

        var imagingFromRis = await _context.RadiologyReports
            .Include(r => r.RadiologyExam)
            .ThenInclude(e => e.RadiologyRequest)
            .Include(r => r.RadiologyExam.Modality)
            .Where(r => r.RadiologyExam.RadiologyRequest.MedicalRecordId == examination.MedicalRecordId)
            .OrderByDescending(r => r.ReportDate)
            .Select(r => new ImagingResultSummaryDto
            {
                Id = r.Id,
                OrderId = r.RadiologyExam.RadiologyRequestId,
                ExamCode = r.RadiologyExam.ExamCode,
                ExamName = r.RadiologyExam.ExamName,
                ServiceCode = r.RadiologyExam.ExamCode,
                ServiceName = r.RadiologyExam.ExamName,
                Modality = r.RadiologyExam.Modality.ModalityName,
                Findings = r.Findings,
                Conclusion = r.Impression ?? string.Empty,
                ResultDate = r.ReportDate,
                Status = r.Status
            })
            .ToListAsync();

        var imagingResults = imagingFromSr.Concat(imagingFromRis)
            .OrderByDescending(x => x.ResultDate)
            .ToList();

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

        // #14b (audit luồng nghiệp vụ): pending XN đọc từ ServiceRequestDetail (model 1) — nơi
        // order CLS thật được tạo. LabRequestItems (model 2) chỉ seed tạo → reader cũ luôn rỗng.
        // Status SRD: 0=Chờ, 1=Đang TH, 2=Có KQ, 3=Hủy → pending = Status < 2.
        var labDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == examination.MedicalRecordId
                     && d.ServiceRequest.RequestType == 1
                     && d.Status < 2)
            .ToListAsync();

        var labRequests = labDetails.Select(d => new LabStatusDto
        {
            RequestId = d.ServiceRequestId,
            TestCode = d.Service.ServiceCode,
            TestName = d.Service.ServiceName,
            Status = d.Status,
            StatusName = d.Status == 0 ? "Chờ thực hiện" : "Đang thực hiện",
            RequestedAt = d.ServiceRequest.RequestDate,
            EstimatedCompletionTime = d.ServiceRequest.RequestDate.AddHours(2)
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
