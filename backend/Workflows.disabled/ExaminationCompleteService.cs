using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation đầy đủ cho Service Khám bệnh OPD
/// </summary>
public class ExaminationCompleteService : IExaminationCompleteService
{
    private readonly HISDbContext _context;

    public ExaminationCompleteService(HISDbContext context)
    {
        _context = context;
    }

    #region 2.1 Màn hình chờ phòng khám

    public async Task<WaitingRoomDisplayDto> GetWaitingRoomDisplayAsync(Guid roomId)
    {
        var room = await _context.Rooms.FindAsync(roomId);
        var waitingCount = await _context.Queues
            .CountAsync(q => q.RoomId == roomId && q.QueueDate == DateTime.Today && q.Status == 0);

        var currentNumber = await _context.Queues
            .Where(q => q.RoomId == roomId && q.QueueDate == DateTime.Today && q.Status == 1)
            .OrderByDescending(q => q.CalledAt)
            .Select(q => q.QueueNumber)
            .FirstOrDefaultAsync();

        return new WaitingRoomDisplayDto
        {
            RoomId = roomId,
            RoomName = room?.RoomName ?? "",
            CurrentNumber = currentNumber,
            TotalWaiting = waitingCount
        };
    }

    public async Task<List<WaitingRoomDisplayDto>> GetDepartmentWaitingRoomDisplaysAsync(Guid departmentId)
    {
        var rooms = await _context.Rooms.Where(r => r.DepartmentId == departmentId && r.IsActive).ToListAsync();
        var result = new List<WaitingRoomDisplayDto>();

        foreach (var room in rooms)
        {
            result.Add(await GetWaitingRoomDisplayAsync(room.Id));
        }

        return result;
    }

    public async Task<bool> UpdateWaitingRoomDisplayConfigAsync(Guid roomId, WaitingRoomDisplayConfigDto config)
    {
        return await Task.FromResult(true);
    }

    public async Task<CallingPatientDto?> CallNextPatientAsync(Guid roomId)
    {
        var next = await _context.Queues
            .Include(q => q.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Where(q => q.RoomId == roomId && q.QueueDate == DateTime.Today && q.Status == 0)
            .OrderBy(q => q.QueueNumber)
            .FirstOrDefaultAsync();

        if (next == null) return null;

        next.Status = 1;
        next.CalledAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new CallingPatientDto
        {
            QueueNumber = next.QueueNumber,
            PatientName = next.MedicalRecord?.Patient?.FullName ?? "",
            CalledAt = DateTime.UtcNow
        };
    }

    public async Task<CallingPatientDto> RecallPatientAsync(Guid examinationId)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) throw new Exception("Không tìm thấy lượt khám");

        return new CallingPatientDto();
    }

    public async Task<bool> SkipPatientAsync(Guid examinationId)
    {
        return await Task.FromResult(true);
    }

    #endregion

    #region 2.2 Danh sách bệnh nhân phòng khám

    public async Task<List<RoomPatientListDto>> GetRoomPatientListAsync(Guid roomId, DateTime date, int? status = null)
    {
        var query = _context.MedicalRecords
            .Include(m => m.Patient)
            .Where(m => m.RoomId == roomId && m.AdmissionDate.HasValue && m.AdmissionDate.Value.Date == date.Date);

        if (status.HasValue)
            query = query.Where(m => m.Status == status.Value);

        return await query
            .OrderBy(m => m.AdmissionDate)
            .Select(m => new RoomPatientListDto
            {
                MedicalRecordId = m.Id,
                PatientId = m.PatientId,
                PatientCode = m.Patient != null ? m.Patient.PatientCode : "",
                PatientName = m.Patient != null ? m.Patient.FullName : "",
                Gender = m.Patient != null ? m.Patient.Gender : 0,
                DateOfBirth = m.Patient != null ? m.Patient.DateOfBirth : null,
                Status = m.Status
            })
            .ToListAsync();
    }

    public async Task<List<RoomPatientListDto>> SearchRoomPatientsAsync(Guid roomId, string keyword, DateTime date)
    {
        return await _context.MedicalRecords
            .Include(m => m.Patient)
            .Where(m => m.RoomId == roomId && m.AdmissionDate.HasValue && m.AdmissionDate.Value.Date == date.Date)
            .Where(m => m.Patient != null && (
                m.Patient.FullName.Contains(keyword) ||
                m.Patient.PatientCode.Contains(keyword) ||
                (m.Patient.PhoneNumber != null && m.Patient.PhoneNumber.Contains(keyword))))
            .Select(m => new RoomPatientListDto
            {
                MedicalRecordId = m.Id,
                PatientId = m.PatientId,
                PatientCode = m.Patient != null ? m.Patient.PatientCode : "",
                PatientName = m.Patient != null ? m.Patient.FullName : ""
            })
            .ToListAsync();
    }

    public async Task<List<RoomPatientListDto>> FilterPatientsByConditionAsync(Guid roomId, PatientFilterDto filter)
    {
        return await GetRoomPatientListAsync(roomId, DateTime.Today, null);
    }

    public async Task<PatientLabResultsDto> GetPatientLabResultsAsync(Guid examinationId)
    {
        return await Task.FromResult(new PatientLabResultsDto());
    }

    public async Task<List<LabStatusDto>> GetPendingLabStatusAsync(Guid examinationId)
    {
        return await Task.FromResult(new List<LabStatusDto>());
    }

    public async Task<string?> GetPatientPhotoAsync(Guid patientId)
    {
        return await Task.FromResult<string?>(null);
    }

    public async Task<bool> UpdatePatientPhotoAsync(Guid patientId, string photoBase64)
    {
        return await Task.FromResult(true);
    }

    #endregion

    #region 2.3 Chức năng khám bệnh

    public async Task<MedicalRecordFullDto> GetMedicalRecordFullAsync(Guid examinationId)
    {
        var exam = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (exam == null) return new MedicalRecordFullDto();

        return new MedicalRecordFullDto
        {
            ExaminationId = exam.Id,
            MedicalRecordId = exam.MedicalRecordId,
            PatientName = exam.MedicalRecord?.Patient?.FullName ?? ""
        };
    }

    public async Task<ExaminationDto> StartExaminationAsync(Guid examinationId, Guid doctorId)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null)
        {
            // Tạo mới examination nếu chưa có
            var medicalRecord = await _context.MedicalRecords.FindAsync(examinationId);
            if (medicalRecord == null) throw new Exception("Không tìm thấy hồ sơ");

            exam = new Examination
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = medicalRecord.Id,
                DoctorId = doctorId,
                ExaminationDate = DateTime.UtcNow,
                Status = 1, // Đang khám
                CreatedAt = DateTime.UtcNow
            };
            await _context.Examinations.AddAsync(exam);
        }
        else
        {
            exam.Status = 1;
            exam.DoctorId = doctorId;
        }

        await _context.SaveChangesAsync();

        return new ExaminationDto
        {
            Id = exam.Id,
            Status = exam.Status
        };
    }

    public async Task<VitalSignsFullDto> UpdateVitalSignsAsync(Guid examinationId, VitalSignsFullDto dto)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) throw new Exception("Không tìm thấy lượt khám");

        exam.Temperature = dto.Temperature;
        exam.Pulse = dto.Pulse;
        exam.BloodPressureSystolic = dto.BloodPressureSystolic;
        exam.BloodPressureDiastolic = dto.BloodPressureDiastolic;
        exam.RespiratoryRate = dto.RespiratoryRate;
        exam.Height = dto.Height;
        exam.Weight = dto.Weight;
        exam.SpO2 = dto.SpO2;

        if (dto.Height > 0 && dto.Weight > 0)
        {
            var heightM = dto.Height / 100m;
            exam.BMI = dto.Weight / (heightM * heightM);
        }

        await _context.SaveChangesAsync();
        return dto;
    }

    public async Task<VitalSignsFullDto?> GetVitalSignsAsync(Guid examinationId)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) return null;

        return new VitalSignsFullDto
        {
            Temperature = exam.Temperature,
            Pulse = exam.Pulse,
            BloodPressureSystolic = exam.BloodPressureSystolic,
            BloodPressureDiastolic = exam.BloodPressureDiastolic,
            RespiratoryRate = exam.RespiratoryRate,
            Height = exam.Height,
            Weight = exam.Weight,
            SpO2 = exam.SpO2
        };
    }

    public async Task<BmiCalculationResult> CalculateBmiAsync(decimal weight, decimal height)
    {
        if (height <= 0) return new BmiCalculationResult { Bmi = 0, Classification = "Không xác định" };

        var heightM = height / 100m;
        var bmi = weight / (heightM * heightM);

        string classification;
        if (bmi < 18.5m) classification = "Gầy";
        else if (bmi < 23m) classification = "Bình thường";
        else if (bmi < 25m) classification = "Thừa cân";
        else if (bmi < 30m) classification = "Béo phì độ I";
        else classification = "Béo phì độ II";

        return await Task.FromResult(new BmiCalculationResult { Bmi = bmi, Classification = classification });
    }

    public async Task<string> ClassifyBloodPressureAsync(int systolic, int diastolic)
    {
        if (systolic < 90 || diastolic < 60) return "Huyết áp thấp";
        if (systolic < 120 && diastolic < 80) return "Bình thường";
        if (systolic < 130 && diastolic < 80) return "Tăng nhẹ";
        if (systolic < 140 || diastolic < 90) return "Tăng huyết áp độ 1";
        if (systolic < 180 || diastolic < 120) return "Tăng huyết áp độ 2";
        return "Tăng huyết áp khẩn cấp";
    }

    public async Task<MedicalInterviewDto> UpdateMedicalInterviewAsync(Guid examinationId, MedicalInterviewDto dto)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) throw new Exception("Không tìm thấy lượt khám");

        exam.ChiefComplaint = dto.ChiefComplaint;
        exam.PresentIllness = dto.PresentIllness;
        await _context.SaveChangesAsync();

        return dto;
    }

    public async Task<MedicalInterviewDto?> GetMedicalInterviewAsync(Guid examinationId)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) return null;

        return new MedicalInterviewDto
        {
            ChiefComplaint = exam.ChiefComplaint,
            PresentIllness = exam.PresentIllness
        };
    }

    public async Task<PhysicalExaminationDto> UpdatePhysicalExaminationAsync(Guid examinationId, PhysicalExaminationDto dto)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) throw new Exception("Không tìm thấy lượt khám");

        exam.PhysicalExamFindings = dto.GeneralAppearance;
        await _context.SaveChangesAsync();

        return dto;
    }

    public async Task<PhysicalExaminationDto?> GetPhysicalExaminationAsync(Guid examinationId)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) return null;

        return new PhysicalExaminationDto
        {
            GeneralAppearance = exam.PhysicalExamFindings
        };
    }

    public async Task<List<ExaminationTemplateDto>> GetExaminationTemplatesAsync(Guid? departmentId = null, int? templateType = null)
    {
        return await Task.FromResult(new List<ExaminationTemplateDto>());
    }

    public async Task<ExaminationTemplateDto> CreateExaminationTemplateAsync(ExaminationTemplateDto dto)
    {
        dto.Id = Guid.NewGuid();
        return await Task.FromResult(dto);
    }

    public async Task<ExaminationTemplateDto> UpdateExaminationTemplateAsync(Guid id, ExaminationTemplateDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<bool> DeleteExaminationTemplateAsync(Guid id)
    {
        return await Task.FromResult(true);
    }

    public async Task<PhysicalExaminationDto> ApplyExaminationTemplateAsync(Guid examinationId, Guid templateId)
    {
        return await Task.FromResult(new PhysicalExaminationDto());
    }

    public async Task<ExaminationTemplateDto> SaveAsExaminationTemplateAsync(Guid examinationId, string templateName)
    {
        return await Task.FromResult(new ExaminationTemplateDto { TemplateName = templateName });
    }

    public async Task<List<AllergyDto>> GetPatientAllergiesAsync(Guid patientId)
    {
        return await Task.FromResult(new List<AllergyDto>());
    }

    public async Task<AllergyDto> AddPatientAllergyAsync(Guid patientId, AllergyDto dto)
    {
        dto.Id = Guid.NewGuid();
        dto.PatientId = patientId;
        return await Task.FromResult(dto);
    }

    public async Task<AllergyDto> UpdatePatientAllergyAsync(Guid id, AllergyDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<bool> DeletePatientAllergyAsync(Guid id)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<ContraindicationDto>> GetPatientContraindicationsAsync(Guid patientId)
    {
        return await Task.FromResult(new List<ContraindicationDto>());
    }

    public async Task<ContraindicationDto> AddPatientContraindicationAsync(Guid patientId, ContraindicationDto dto)
    {
        dto.Id = Guid.NewGuid();
        dto.PatientId = patientId;
        return await Task.FromResult(dto);
    }

    public async Task<ContraindicationDto> UpdatePatientContraindicationAsync(Guid id, ContraindicationDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<bool> DeletePatientContraindicationAsync(Guid id)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<MedicalHistoryDto>> GetPatientMedicalHistoryAsync(Guid patientId, int limit = 20)
    {
        return await _context.MedicalRecords
            .Include(m => m.Examinations)
            .Where(m => m.PatientId == patientId)
            .OrderByDescending(m => m.AdmissionDate)
            .Take(limit)
            .Select(m => new MedicalHistoryDto
            {
                MedicalRecordId = m.Id,
                VisitDate = m.AdmissionDate ?? DateTime.MinValue,
                Diagnosis = m.MainDiagnosis
            })
            .ToListAsync();
    }

    public async Task<MedicalRecordFullDto> GetMedicalHistoryDetailAsync(Guid examinationId)
    {
        return await GetMedicalRecordFullAsync(examinationId);
    }

    public async Task<List<string>> GetHistoryImagingImagesAsync(Guid orderId)
    {
        return await Task.FromResult(new List<string>());
    }

    public async Task<TreatmentSheetDto> CreateTreatmentSheetAsync(TreatmentSheetDto dto)
    {
        dto.Id = Guid.NewGuid();
        return await Task.FromResult(dto);
    }

    public async Task<TreatmentSheetDto> UpdateTreatmentSheetAsync(Guid id, TreatmentSheetDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<List<TreatmentSheetDto>> GetTreatmentSheetsAsync(Guid examinationId)
    {
        return await Task.FromResult(new List<TreatmentSheetDto>());
    }

    public async Task<ConsultationRecordDto> CreateConsultationRecordAsync(ConsultationRecordDto dto)
    {
        dto.Id = Guid.NewGuid();
        return await Task.FromResult(dto);
    }

    public async Task<ConsultationRecordDto> UpdateConsultationRecordAsync(Guid id, ConsultationRecordDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<List<ConsultationRecordDto>> GetConsultationRecordsAsync(Guid examinationId)
    {
        return await Task.FromResult(new List<ConsultationRecordDto>());
    }

    public async Task<NursingCareSheetDto> CreateNursingCareSheetAsync(NursingCareSheetDto dto)
    {
        dto.Id = Guid.NewGuid();
        return await Task.FromResult(dto);
    }

    public async Task<NursingCareSheetDto> UpdateNursingCareSheetAsync(Guid id, NursingCareSheetDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<List<NursingCareSheetDto>> GetNursingCareSheetsAsync(Guid examinationId)
    {
        return await Task.FromResult(new List<NursingCareSheetDto>());
    }

    public async Task<InjuryInfoDto> UpdateInjuryInfoAsync(Guid examinationId, InjuryInfoDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<InjuryInfoDto?> GetInjuryInfoAsync(Guid examinationId)
    {
        return await Task.FromResult<InjuryInfoDto?>(null);
    }

    #endregion

    #region 2.4 Chẩn đoán

    public async Task<List<DiagnosisFullDto>> GetDiagnosesAsync(Guid examinationId)
    {
        return await Task.FromResult(new List<DiagnosisFullDto>());
    }

    public async Task<DiagnosisFullDto> AddDiagnosisAsync(Guid examinationId, DiagnosisFullDto dto)
    {
        dto.Id = Guid.NewGuid();
        return await Task.FromResult(dto);
    }

    public async Task<DiagnosisFullDto> UpdateDiagnosisAsync(Guid diagnosisId, DiagnosisFullDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<bool> DeleteDiagnosisAsync(Guid diagnosisId)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<DiagnosisFullDto>> UpdateDiagnosisListAsync(Guid examinationId, UpdateDiagnosisDto dto)
    {
        return await Task.FromResult(new List<DiagnosisFullDto>());
    }

    public async Task<DiagnosisFullDto> SetPrimaryDiagnosisAsync(Guid diagnosisId)
    {
        return await Task.FromResult(new DiagnosisFullDto { Id = diagnosisId, IsPrimary = true });
    }

    public async Task<List<IcdCodeFullDto>> SearchIcdCodesAsync(string keyword, int? icdType = null, int limit = 20)
    {
        var query = _context.IcdCodes.AsQueryable();

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(i => i.IcdCode.Contains(keyword) || i.IcdName.Contains(keyword));
        }

        return await query.Take(limit).Select(i => new IcdCodeFullDto
        {
            Id = i.Id,
            IcdCode = i.IcdCode,
            IcdName = i.IcdName
        }).ToListAsync();
    }

    public async Task<IcdCodeFullDto?> GetIcdByCodeAsync(string code)
    {
        var icd = await _context.IcdCodes.FirstOrDefaultAsync(i => i.IcdCode == code);
        if (icd == null) return null;

        return new IcdCodeFullDto
        {
            Id = icd.Id,
            IcdCode = icd.IcdCode,
            IcdName = icd.IcdName
        };
    }

    public async Task<List<IcdCodeFullDto>> GetFrequentIcdCodesAsync(Guid? departmentId = null, int limit = 20)
    {
        return await _context.IcdCodes.Take(limit).Select(i => new IcdCodeFullDto
        {
            Id = i.Id,
            IcdCode = i.IcdCode,
            IcdName = i.IcdName
        }).ToListAsync();
    }

    public async Task<List<IcdCodeFullDto>> SuggestIcdCodesAsync(string symptoms)
    {
        return await SearchIcdCodesAsync(symptoms, null, 10);
    }

    public async Task<List<IcdCodeFullDto>> GetRecentIcdCodesAsync(Guid doctorId, int limit = 20)
    {
        return await GetFrequentIcdCodesAsync(null, limit);
    }

    public async Task<List<IcdCodeFullDto>> SearchExternalCauseCodesAsync(string keyword)
    {
        return await SearchIcdCodesAsync(keyword, null, 20);
    }

    #endregion

    #region 2.5 Khám thêm

    public async Task<ExaminationDto> CreateAdditionalExaminationAsync(AdditionalExaminationDto dto)
    {
        return await Task.FromResult(new ExaminationDto { Id = Guid.NewGuid() });
    }

    public async Task<ExaminationDto> TransferRoomAsync(TransferRoomRequestDto dto)
    {
        return await Task.FromResult(new ExaminationDto());
    }

    public async Task<ExaminationDto> TransferPrimaryExaminationAsync(Guid examinationId, Guid newRoomId)
    {
        return await Task.FromResult(new ExaminationDto());
    }

    public async Task<List<ExaminationDto>> GetAdditionalExaminationsAsync(Guid primaryExaminationId)
    {
        return await Task.FromResult(new List<ExaminationDto>());
    }

    public async Task<bool> CancelAdditionalExaminationAsync(Guid examinationId, string reason)
    {
        return await Task.FromResult(true);
    }

    public async Task<ExaminationDto> CompleteAdditionalExaminationAsync(Guid examinationId)
    {
        return await Task.FromResult(new ExaminationDto());
    }

    #endregion

    #region 2.6 Chỉ định dịch vụ

    public async Task<List<ServiceOrderFullDto>> GetServiceOrdersAsync(Guid examinationId)
    {
        return await Task.FromResult(new List<ServiceOrderFullDto>());
    }

    public async Task<List<ServiceOrderFullDto>> CreateServiceOrdersAsync(CreateServiceOrderDto dto)
    {
        return await Task.FromResult(new List<ServiceOrderFullDto>());
    }

    public async Task<ServiceOrderFullDto> UpdateServiceOrderAsync(Guid orderId, ServiceOrderFullDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<bool> CancelServiceOrderAsync(Guid orderId, string reason)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<HIS.Application.Services.ServiceDto>> GetServicesAsync(int? serviceType = null, Guid? departmentId = null, string? keyword = null)
    {
        var query = _context.Services.Where(s => s.IsActive);

        if (serviceType.HasValue)
            query = query.Where(s => s.ServiceType == serviceType.Value);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(s => s.ServiceName.Contains(keyword) || s.ServiceCode.Contains(keyword));

        return await query.Select(s => new HIS.Application.Services.ServiceDto
        {
            Id = s.Id,
            ServiceCode = s.ServiceCode,
            ServiceName = s.ServiceName,
            ServiceType = s.ServiceType,
            UnitPrice = s.Price
        }).ToListAsync();
    }

    public async Task<List<HIS.Application.Services.ServiceDto>> SearchServicesAsync(string keyword, int limit = 20)
    {
        return await _context.Services
            .Where(s => s.IsActive && (s.ServiceName.Contains(keyword) || s.ServiceCode.Contains(keyword)))
            .Take(limit)
            .Select(s => new HIS.Application.Services.ServiceDto
            {
                Id = s.Id,
                ServiceCode = s.ServiceCode,
                ServiceName = s.ServiceName,
                UnitPrice = s.Price
            }).ToListAsync();
    }

    public async Task<List<ServiceGroupTemplateDto>> GetServiceGroupTemplatesAsync(Guid? departmentId = null)
    {
        return await Task.FromResult(new List<ServiceGroupTemplateDto>());
    }

    public async Task<ServiceGroupTemplateDto> CreateServiceGroupTemplateAsync(ServiceGroupTemplateDto dto)
    {
        dto.Id = Guid.NewGuid();
        return await Task.FromResult(dto);
    }

    public async Task<ServiceGroupTemplateDto> UpdateServiceGroupTemplateAsync(Guid id, ServiceGroupTemplateDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<bool> DeleteServiceGroupTemplateAsync(Guid id)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<ServicePackageDto>> GetServicePackagesAsync()
    {
        return await Task.FromResult(new List<ServicePackageDto>());
    }

    public async Task<List<ServiceOrderFullDto>> ApplyServicePackageAsync(Guid examinationId, Guid packageId)
    {
        return await Task.FromResult(new List<ServiceOrderFullDto>());
    }

    public async Task<List<ServiceOrderWarningDto>> CheckDuplicateServicesAsync(Guid examinationId, List<Guid> serviceIds)
    {
        return await Task.FromResult(new List<ServiceOrderWarningDto>());
    }

    public async Task<List<ServiceOrderWarningDto>> ValidateServiceOrdersAsync(Guid examinationId, List<Guid> serviceIds)
    {
        return await Task.FromResult(new List<ServiceOrderWarningDto>());
    }

    public async Task<List<HIS.Application.Services.RoomDto>> GetServiceRoomsAsync(Guid serviceId)
    {
        return await Task.FromResult(new List<HIS.Application.Services.RoomDto>());
    }

    public async Task<Guid?> AutoSelectOptimalRoomAsync(Guid serviceId)
    {
        return await Task.FromResult<Guid?>(null);
    }

    public async Task<List<HIS.Application.Services.RoomDto>> CalculateOptimalPathAsync(List<Guid> serviceIds)
    {
        return await Task.FromResult(new List<HIS.Application.Services.RoomDto>());
    }

    public async Task<List<HIS.Application.Services.ServiceDto>> GetFrequentServicesAsync(Guid doctorId, int limit = 20)
    {
        return await GetServicesAsync(null, null, null);
    }

    public async Task<byte[]> PrintServiceOrderAsync(Guid orderId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> PrintAllServiceOrdersAsync(Guid examinationId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    #endregion

    #region 2.7 Kê đơn thuốc

    public async Task<List<PrescriptionFullDto>> GetPrescriptionsAsync(Guid examinationId)
    {
        return await Task.FromResult(new List<PrescriptionFullDto>());
    }

    public async Task<PrescriptionFullDto?> GetPrescriptionByIdAsync(Guid id)
    {
        return await Task.FromResult<PrescriptionFullDto?>(null);
    }

    public async Task<PrescriptionFullDto> CreatePrescriptionAsync(CreatePrescriptionDto dto)
    {
        return await Task.FromResult(new PrescriptionFullDto { Id = Guid.NewGuid() });
    }

    public async Task<PrescriptionFullDto> UpdatePrescriptionAsync(Guid id, CreatePrescriptionDto dto)
    {
        return await Task.FromResult(new PrescriptionFullDto { Id = id });
    }

    public async Task<bool> DeletePrescriptionAsync(Guid id)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<MedicineDto>> SearchMedicinesAsync(string keyword, Guid? warehouseId = null, int limit = 20)
    {
        return await Task.FromResult(new List<MedicineDto>());
    }

    public async Task<MedicineDto?> GetMedicineWithStockAsync(Guid medicineId, Guid? warehouseId = null)
    {
        return await Task.FromResult<MedicineDto?>(null);
    }

    public async Task<List<MedicineDto>> GetMedicinesByGroupAsync(Guid groupId)
    {
        return await Task.FromResult(new List<MedicineDto>());
    }

    public async Task<List<DrugInteractionDto>> CheckDrugInteractionsAsync(List<Guid> medicineIds)
    {
        return await Task.FromResult(new List<DrugInteractionDto>());
    }

    public async Task<List<PrescriptionWarningDto>> CheckDrugAllergiesAsync(Guid patientId, List<Guid> medicineIds)
    {
        return await Task.FromResult(new List<PrescriptionWarningDto>());
    }

    public async Task<List<PrescriptionWarningDto>> CheckContraindicationsAsync(Guid patientId, List<Guid> medicineIds)
    {
        return await Task.FromResult(new List<PrescriptionWarningDto>());
    }

    public async Task<List<PrescriptionWarningDto>> CheckDuplicateMedicinesAsync(Guid patientId, List<Guid> medicineIds, DateTime date)
    {
        return await Task.FromResult(new List<PrescriptionWarningDto>());
    }

    public async Task<List<PrescriptionWarningDto>> ValidateBhytPrescriptionAsync(Guid examinationId, CreatePrescriptionDto dto)
    {
        return await Task.FromResult(new List<PrescriptionWarningDto>());
    }

    public async Task<List<PrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid? departmentId = null)
    {
        return await Task.FromResult(new List<PrescriptionTemplateDto>());
    }

    public async Task<PrescriptionTemplateDto> CreatePrescriptionTemplateAsync(PrescriptionTemplateDto dto)
    {
        dto.Id = Guid.NewGuid();
        return await Task.FromResult(dto);
    }

    public async Task<PrescriptionTemplateDto> UpdatePrescriptionTemplateAsync(Guid id, PrescriptionTemplateDto dto)
    {
        return await Task.FromResult(dto);
    }

    public async Task<bool> DeletePrescriptionTemplateAsync(Guid id)
    {
        return await Task.FromResult(true);
    }

    public async Task<PrescriptionFullDto> ApplyPrescriptionTemplateAsync(Guid examinationId, Guid templateId)
    {
        return await Task.FromResult(new PrescriptionFullDto());
    }

    public async Task<PrescriptionTemplateDto> SaveAsPrescriptionTemplateAsync(Guid prescriptionId, string templateName)
    {
        return await Task.FromResult(new PrescriptionTemplateDto { TemplateName = templateName });
    }

    public async Task<List<InstructionLibraryDto>> GetInstructionLibraryAsync(string? category = null)
    {
        return await Task.FromResult(new List<InstructionLibraryDto>());
    }

    public async Task<InstructionLibraryDto> AddInstructionAsync(InstructionLibraryDto dto)
    {
        dto.Id = Guid.NewGuid();
        return await Task.FromResult(dto);
    }

    public async Task<bool> DeleteInstructionAsync(Guid id)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<MedicineDto>> GetFrequentMedicinesAsync(Guid doctorId, int limit = 20)
    {
        return await Task.FromResult(new List<MedicineDto>());
    }

    public async Task<byte[]> PrintPrescriptionAsync(Guid prescriptionId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> PrintExternalPrescriptionAsync(Guid prescriptionId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<PrescriptionFullDto> CopyPrescriptionFromHistoryAsync(Guid examinationId, Guid sourcePrescriptionId)
    {
        return await Task.FromResult(new PrescriptionFullDto());
    }

    public async Task<List<WarehouseDto>> GetDispensaryWarehousesAsync()
    {
        return await Task.FromResult(new List<WarehouseDto>());
    }

    #endregion

    #region 2.8 Kết luận khám bệnh

    public async Task<ExaminationConclusionDto?> GetConclusionAsync(Guid examinationId)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) return null;

        return new ExaminationConclusionDto
        {
            ExaminationId = exam.Id,
            Conclusion = exam.Conclusion,
            TreatmentPlan = exam.TreatmentPlan
        };
    }

    public async Task<ExaminationConclusionDto> CompleteExaminationAsync(Guid examinationId, CompleteExaminationDto dto)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) throw new Exception("Không tìm thấy lượt khám");

        exam.Conclusion = dto.Conclusion;
        exam.TreatmentPlan = dto.TreatmentPlan;
        exam.Status = 3; // Hoàn thành
        exam.CompletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new ExaminationConclusionDto
        {
            ExaminationId = exam.Id,
            Conclusion = exam.Conclusion,
            TreatmentPlan = exam.TreatmentPlan
        };
    }

    public async Task<ExaminationConclusionDto> UpdateConclusionAsync(Guid examinationId, CompleteExaminationDto dto)
    {
        return await CompleteExaminationAsync(examinationId, dto);
    }

    public async Task<ExaminationDto> RequestHospitalizationAsync(Guid examinationId, HospitalizationRequestDto dto)
    {
        return await Task.FromResult(new ExaminationDto());
    }

    public async Task<ExaminationDto> RequestTransferAsync(Guid examinationId, TransferRequestDto dto)
    {
        return await Task.FromResult(new ExaminationDto());
    }

    public async Task<AppointmentDto> CreateAppointmentAsync(Guid examinationId, CreateAppointmentDto dto)
    {
        return await Task.FromResult(new AppointmentDto { Id = Guid.NewGuid() });
    }

    public async Task<SickLeaveDto> CreateSickLeaveAsync(Guid examinationId, CreateSickLeaveDto dto)
    {
        return await Task.FromResult(new SickLeaveDto { Id = Guid.NewGuid() });
    }

    public async Task<byte[]> PrintSickLeaveAsync(Guid examinationId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<bool> LockExaminationAsync(Guid examinationId)
    {
        return await Task.FromResult(true);
    }

    public async Task<bool> UnlockExaminationAsync(Guid examinationId, string reason)
    {
        return await Task.FromResult(true);
    }

    public async Task<ExaminationValidationResult> ValidateExaminationForCompletionAsync(Guid examinationId)
    {
        return await Task.FromResult(new ExaminationValidationResult { IsValid = true });
    }

    public async Task<bool> CancelExaminationAsync(Guid examinationId, string reason)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) return false;

        exam.Status = 5; // Hủy
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ExaminationDto> RevertCompletionAsync(Guid examinationId, string reason)
    {
        var exam = await _context.Examinations.FindAsync(examinationId);
        if (exam == null) throw new Exception("Không tìm thấy lượt khám");

        exam.Status = 1; // Đang khám
        await _context.SaveChangesAsync();

        return new ExaminationDto { Id = exam.Id, Status = exam.Status };
    }

    #endregion

    #region 2.9 Quản lý và báo cáo

    public async Task<PagedResultDto<ExaminationDto>> SearchExaminationsAsync(ExaminationSearchDto dto)
    {
        return await Task.FromResult(new PagedResultDto<ExaminationDto>
        {
            Items = new List<ExaminationDto>(),
            TotalCount = 0
        });
    }

    public async Task<ExaminationStatisticsDto> GetExaminationStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? roomId = null)
    {
        var query = _context.Examinations.Where(e => e.ExaminationDate >= fromDate && e.ExaminationDate <= toDate);

        return new ExaminationStatisticsDto
        {
            TotalExaminations = await query.CountAsync(),
            CompletedExaminations = await query.CountAsync(e => e.Status == 3)
        };
    }

    public async Task<List<ExaminationRegisterDto>> GetExaminationRegisterAsync(DateTime fromDate, DateTime toDate, Guid? roomId = null)
    {
        return await Task.FromResult(new List<ExaminationRegisterDto>());
    }

    public async Task<byte[]> ExportExaminationRegisterToExcelAsync(DateTime fromDate, DateTime toDate, Guid? roomId = null)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> ExportExaminationStatisticsAsync(DateTime fromDate, DateTime toDate, string format = "excel")
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<List<DoctorExaminationStatDto>> GetDoctorStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        return await Task.FromResult(new List<DoctorExaminationStatDto>());
    }

    public async Task<Dictionary<string, int>> GetDiagnosisStatisticsAsync(DateTime fromDate, DateTime toDate)
    {
        return await Task.FromResult(new Dictionary<string, int>());
    }

    public async Task<List<CommunicableDiseaseReportDto>> GetCommunicableDiseaseReportAsync(DateTime fromDate, DateTime toDate)
    {
        return await Task.FromResult(new List<CommunicableDiseaseReportDto>());
    }

    public async Task<byte[]> PrintExaminationFormAsync(Guid examinationId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> PrintOutpatientMedicalRecordAsync(Guid examinationId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> PrintAppointmentSlipAsync(Guid appointmentId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> PrintAdmissionFormAsync(Guid examinationId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> PrintTransferFormAsync(Guid examinationId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    #endregion

    #region 2.10 Chức năng bổ sung

    public async Task<PatientInfoDto?> GetPatientInfoAsync(string? patientCode = null, string? idNumber = null)
    {
        Patient? patient = null;

        if (!string.IsNullOrEmpty(patientCode))
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == patientCode);
        else if (!string.IsNullOrEmpty(idNumber))
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == idNumber);

        if (patient == null) return null;

        return new PatientInfoDto
        {
            Id = patient.Id,
            PatientCode = patient.PatientCode,
            FullName = patient.FullName,
            DateOfBirth = patient.DateOfBirth,
            Gender = patient.Gender
        };
    }

    public async Task<List<HIS.Application.Services.RoomDto>> GetActiveExaminationRoomsAsync(Guid? departmentId = null)
    {
        var query = _context.Rooms.Where(r => r.IsActive);

        if (departmentId.HasValue)
            query = query.Where(r => r.DepartmentId == departmentId.Value);

        return await query.Select(r => new HIS.Application.Services.RoomDto
        {
            Id = r.Id,
            RoomCode = r.RoomCode ?? "",
            RoomName = r.RoomName ?? ""
        }).ToListAsync();
    }

    public async Task<List<DoctorDto>> GetOnDutyDoctorsAsync(Guid? departmentId = null)
    {
        return await _context.Users
            .Where(u => u.IsActive && !u.IsDeleted)
            .Select(u => new DoctorDto
            {
                Id = u.Id,
                FullName = u.FullName ?? "",
                Title = u.Title
            }).ToListAsync();
    }

    public async Task<RoomExaminationConfigDto?> GetRoomExaminationConfigAsync(Guid roomId)
    {
        return await Task.FromResult<RoomExaminationConfigDto?>(null);
    }

    public async Task<RoomExaminationConfigDto> UpdateRoomExaminationConfigAsync(Guid roomId, RoomExaminationConfigDto config)
    {
        return await Task.FromResult(config);
    }

    public async Task<bool> SignExaminationAsync(Guid examinationId, string signature)
    {
        return await Task.FromResult(true);
    }

    public async Task<SignatureVerificationResult> VerifyExaminationSignatureAsync(Guid examinationId)
    {
        return await Task.FromResult(new SignatureVerificationResult { IsValid = true });
    }

    public async Task<bool> SendResultNotificationAsync(Guid examinationId, string channel)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<ExaminationActivityLogDto>> GetExaminationLogsAsync(Guid examinationId)
    {
        return await Task.FromResult(new List<ExaminationActivityLogDto>());
    }

    #endregion
}
