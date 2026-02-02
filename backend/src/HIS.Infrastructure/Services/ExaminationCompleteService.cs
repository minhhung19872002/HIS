using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
// Use DTOs from IExaminationCompleteService (HIS.Application.Services namespace)
using ServiceDto = HIS.Application.Services.ServiceDto;
using RoomDto = HIS.Application.Services.RoomDto;
using MedicineDto = HIS.Application.Services.MedicineDto;
using DoctorDto = HIS.Application.Services.DoctorDto;
using WarehouseDto = HIS.Application.Services.WarehouseDto;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IExaminationCompleteService
/// Handles all examination/OPD workflows
/// </summary>
public class ExaminationCompleteService : IExaminationCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Patient> _patientRepo;
    private readonly IRepository<MedicalRecord> _medicalRecordRepo;
    private readonly IRepository<Examination> _examinationRepo;
    private readonly IRepository<Room> _roomRepo;
    private readonly IRepository<User> _userRepo;
    private readonly IUnitOfWork _unitOfWork;

    public ExaminationCompleteService(
        HISDbContext context,
        IRepository<Patient> patientRepo,
        IRepository<MedicalRecord> medicalRecordRepo,
        IRepository<Examination> examinationRepo,
        IRepository<Room> roomRepo,
        IRepository<User> userRepo,
        IUnitOfWork unitOfWork)
    {
        _context = context;
        _patientRepo = patientRepo;
        _medicalRecordRepo = medicalRecordRepo;
        _examinationRepo = examinationRepo;
        _roomRepo = roomRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
    }

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

        // TODO: Save photo to storage
        patient.PhotoPath = $"/photos/{patientId}/{Guid.NewGuid()}.jpg";
        await _patientRepo.UpdateAsync(patient);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    #endregion

    #region 2.3 Examination Functions

    public async Task<MedicalRecordFullDto> GetMedicalRecordFullAsync(Guid examinationId)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Include(e => e.Doctor)
            .Include(e => e.Room)
            .ThenInclude(r => r.Department)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        var patient = examination.MedicalRecord.Patient;

        return new MedicalRecordFullDto
        {
            Id = examination.MedicalRecordId,
            MedicalRecordCode = examination.MedicalRecord.MedicalRecordCode,
            Patient = new PatientInfoDto
            {
                Id = patient.Id,
                PatientCode = patient.PatientCode,
                FullName = patient.FullName,
                Gender = patient.Gender,
                DateOfBirth = patient.DateOfBirth,
                Age = CalculateAge(patient.DateOfBirth, patient.YearOfBirth),
                PhoneNumber = patient.PhoneNumber,
                Address = patient.Address,
                Occupation = patient.Occupation,
                PhotoUrl = patient.PhotoPath
            },
            VitalSigns = MapToVitalSignsFullDto(examination),
            Interview = new MedicalInterviewDto
            {
                ChiefComplaint = examination.ChiefComplaint,
                HistoryOfPresentIllness = examination.PresentIllness
            },
            PhysicalExam = new PhysicalExaminationDto
            {
                GeneralAppearance = examination.PhysicalExamination,
                OtherFindings = examination.SystemsReview
            },
            Diagnoses = new List<DiagnosisFullDto>
            {
                new DiagnosisFullDto
                {
                    IcdCode = examination.MainIcdCode ?? "",
                    IcdName = examination.MainDiagnosis ?? "",
                    IsPrimary = true
                }
            },
            Allergies = new List<AllergyDto>(),
            Contraindications = new List<ContraindicationDto>()
        };
    }

    public async Task<Application.DTOs.ExaminationDto> StartExaminationAsync(Guid examinationId, Guid doctorId)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Include(e => e.Room)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        examination.Status = 1; // In progress
        examination.StartTime = DateTime.Now;
        examination.DoctorId = doctorId;

        examination.MedicalRecord.Status = 1; // In progress

        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    public async Task<VitalSignsFullDto> UpdateVitalSignsAsync(Guid examinationId, VitalSignsFullDto dto)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new Exception("Examination not found");

        examination.Temperature = dto.Temperature;
        examination.Pulse = dto.Pulse;
        examination.BloodPressureSystolic = dto.SystolicBP;
        examination.BloodPressureDiastolic = dto.DiastolicBP;
        examination.RespiratoryRate = dto.RespiratoryRate;
        examination.Height = dto.Height;
        examination.Weight = dto.Weight;
        examination.SpO2 = dto.SpO2;

        if (dto.Weight.HasValue && dto.Height.HasValue && dto.Height > 0)
        {
            var heightInM = dto.Height.Value / 100;
            examination.BMI = dto.Weight.Value / (heightInM * heightInM);
        }

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        dto.BMI = examination.BMI;
        dto.BMIClassification = ClassifyBMI(examination.BMI);
        dto.BPClassification = await ClassifyBloodPressureAsync(dto.SystolicBP ?? 0, dto.DiastolicBP ?? 0);
        dto.MeasuredAt = DateTime.Now;

        return dto;
    }

    public async Task<VitalSignsFullDto?> GetVitalSignsAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return null;

        return MapToVitalSignsFullDto(examination);
    }

    public Task<BmiCalculationResult> CalculateBmiAsync(decimal weight, decimal height)
    {
        var heightInM = height / 100;
        var bmi = weight / (heightInM * heightInM);

        return Task.FromResult(new BmiCalculationResult
        {
            BMI = Math.Round(bmi, 1),
            Classification = ClassifyBMI(bmi),
            ColorCode = bmi < 18.5m ? "#faad14" : bmi < 25 ? "#52c41a" : bmi < 30 ? "#faad14" : "#f5222d"
        });
    }

    public Task<string> ClassifyBloodPressureAsync(int systolic, int diastolic)
    {
        string classification;
        if (systolic < 90 || diastolic < 60)
            classification = "Ha huyet ap";
        else if (systolic < 120 && diastolic < 80)
            classification = "Binh thuong";
        else if (systolic < 130 && diastolic < 80)
            classification = "Tang nhe";
        else if (systolic < 140 || diastolic < 90)
            classification = "Tang huyet ap do 1";
        else if (systolic < 180 || diastolic < 120)
            classification = "Tang huyet ap do 2";
        else
            classification = "Tang huyet ap khung hoang";

        return Task.FromResult(classification);
    }

    public async Task<MedicalInterviewDto> UpdateMedicalInterviewAsync(Guid examinationId, MedicalInterviewDto dto)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new Exception("Examination not found");

        examination.ChiefComplaint = dto.ChiefComplaint;
        examination.PresentIllness = dto.HistoryOfPresentIllness;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return dto;
    }

    public async Task<MedicalInterviewDto?> GetMedicalInterviewAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return null;

        return new MedicalInterviewDto
        {
            ChiefComplaint = examination.ChiefComplaint,
            HistoryOfPresentIllness = examination.PresentIllness
        };
    }

    public async Task<PhysicalExaminationDto> UpdatePhysicalExaminationAsync(Guid examinationId, PhysicalExaminationDto dto)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new Exception("Examination not found");

        examination.PhysicalExamination = dto.GeneralAppearance;
        examination.SystemsReview = dto.OtherFindings;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return dto;
    }

    public async Task<PhysicalExaminationDto?> GetPhysicalExaminationAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return null;

        return new PhysicalExaminationDto
        {
            GeneralAppearance = examination.PhysicalExamination,
            OtherFindings = examination.SystemsReview
        };
    }

    public async Task<List<ExaminationTemplateDto>> GetExaminationTemplatesAsync(Guid? departmentId = null, int? templateType = null)
    {
        var query = _context.ExaminationTemplates.Where(t => t.IsActive);

        if (departmentId.HasValue)
            query = query.Where(t => t.DepartmentId == departmentId || t.IsPublic);

        if (templateType.HasValue)
            query = query.Where(t => t.TemplateType == templateType);

        return await query
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.TemplateName)
            .Select(t => new ExaminationTemplateDto
            {
                Id = t.Id,
                TemplateName = t.TemplateName,
                TemplateCode = t.TemplateCode,
                TemplateType = t.TemplateType,
                DepartmentId = t.DepartmentId,
                IsPublic = t.IsPublic,
                Content = new PhysicalExaminationDto
                {
                    GeneralAppearance = t.PhysicalExamTemplate,
                    OtherFindings = t.SystemsReviewTemplate
                }
            })
            .ToListAsync();
    }

    public async Task<ExaminationTemplateDto> CreateExaminationTemplateAsync(ExaminationTemplateDto dto)
    {
        var template = new ExaminationTemplate
        {
            Id = Guid.NewGuid(),
            TemplateName = dto.TemplateName,
            TemplateCode = dto.TemplateCode,
            TemplateType = dto.TemplateType,
            DepartmentId = dto.DepartmentId,
            ChiefComplaintTemplate = dto.Content?.ChiefComplaint,
            PhysicalExamTemplate = dto.Content?.GeneralAppearance,
            SystemsReviewTemplate = dto.Content?.OtherFindings,
            IsPublic = dto.IsPublic,
            IsActive = true,
            SortOrder = 0
        };

        await _context.ExaminationTemplates.AddAsync(template);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = template.Id;
        return dto;
    }

    public async Task<ExaminationTemplateDto> UpdateExaminationTemplateAsync(Guid id, ExaminationTemplateDto dto)
    {
        var template = await _context.ExaminationTemplates.FindAsync(id);
        if (template == null) throw new Exception("Template not found");

        template.TemplateName = dto.TemplateName;
        template.TemplateCode = dto.TemplateCode;
        template.TemplateType = dto.TemplateType;
        template.DepartmentId = dto.DepartmentId;
        template.ChiefComplaintTemplate = dto.Content?.ChiefComplaint;
        template.PhysicalExamTemplate = dto.Content?.GeneralAppearance;
        template.SystemsReviewTemplate = dto.Content?.OtherFindings;
        template.IsPublic = dto.IsPublic;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<bool> DeleteExaminationTemplateAsync(Guid id)
    {
        var template = await _context.ExaminationTemplates.FindAsync(id);
        if (template == null) return false;

        template.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<PhysicalExaminationDto> ApplyExaminationTemplateAsync(Guid examinationId, Guid templateId)
    {
        var template = await _context.ExaminationTemplates.FindAsync(templateId);
        if (template == null) throw new Exception("Template not found");

        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new Exception("Examination not found");

        examination.ChiefComplaint = template.ChiefComplaintTemplate;
        examination.PhysicalExamination = template.PhysicalExamTemplate;
        examination.SystemsReview = template.SystemsReviewTemplate;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return new PhysicalExaminationDto
        {
            GeneralAppearance = examination.PhysicalExamination,
            OtherFindings = examination.SystemsReview
        };
    }

    public async Task<ExaminationTemplateDto> SaveAsExaminationTemplateAsync(Guid examinationId, string templateName)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new Exception("Examination not found");

        var template = new ExaminationTemplate
        {
            Id = Guid.NewGuid(),
            TemplateName = templateName,
            TemplateType = 1,
            DepartmentId = examination.DepartmentId,
            ChiefComplaintTemplate = examination.ChiefComplaint,
            PhysicalExamTemplate = examination.PhysicalExamination,
            SystemsReviewTemplate = examination.SystemsReview,
            IsPublic = false,
            IsActive = true
        };

        await _context.ExaminationTemplates.AddAsync(template);
        await _unitOfWork.SaveChangesAsync();

        return new ExaminationTemplateDto
        {
            Id = template.Id,
            TemplateName = templateName,
            Content = new PhysicalExaminationDto
            {
                GeneralAppearance = examination.PhysicalExamination,
                OtherFindings = examination.SystemsReview
            }
        };
    }

    public async Task<List<AllergyDto>> GetPatientAllergiesAsync(Guid patientId)
    {
        return await _context.Allergies
            .Where(a => a.PatientId == patientId && a.IsActive)
            .OrderByDescending(a => a.Severity)
            .ThenBy(a => a.AllergenName)
            .Select(a => new AllergyDto
            {
                Id = a.Id,
                PatientId = a.PatientId,
                AllergyType = a.AllergyType,
                AllergenName = a.AllergenName,
                AllergenCode = a.AllergenCode,
                Reaction = a.Reaction,
                Severity = a.Severity,
                Notes = a.Notes
            })
            .ToListAsync();
    }

    public async Task<AllergyDto> AddPatientAllergyAsync(Guid patientId, AllergyDto dto)
    {
        var allergy = new Allergy
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            AllergyType = dto.AllergyType,
            AllergenName = dto.AllergenName ?? "",
            AllergenCode = dto.AllergenCode,
            Reaction = dto.Reaction,
            Severity = dto.Severity,
            Notes = dto.Notes,
            IsActive = true
        };

        await _context.Allergies.AddAsync(allergy);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = allergy.Id;
        dto.PatientId = patientId;
        return dto;
    }

    public async Task<AllergyDto> UpdatePatientAllergyAsync(Guid id, AllergyDto dto)
    {
        var allergy = await _context.Allergies.FindAsync(id);
        if (allergy == null) throw new Exception("Allergy not found");

        allergy.AllergyType = dto.AllergyType;
        allergy.AllergenName = dto.AllergenName ?? "";
        allergy.AllergenCode = dto.AllergenCode;
        allergy.Reaction = dto.Reaction;
        allergy.Severity = dto.Severity;
        allergy.Notes = dto.Notes;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<bool> DeletePatientAllergyAsync(Guid id)
    {
        var allergy = await _context.Allergies.FindAsync(id);
        if (allergy == null) return false;

        allergy.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<ContraindicationDto>> GetPatientContraindicationsAsync(Guid patientId)
    {
        return await _context.Contraindications
            .Where(c => c.PatientId == patientId && c.IsActive)
            .OrderBy(c => c.ItemName)
            .Select(c => new ContraindicationDto
            {
                Id = c.Id,
                PatientId = c.PatientId,
                ContraindicationType = c.ContraindicationType,
                ItemName = c.ItemName,
                ItemCode = c.ItemCode,
                Reason = c.Reason,
                Notes = c.Notes
            })
            .ToListAsync();
    }

    public async Task<ContraindicationDto> AddPatientContraindicationAsync(Guid patientId, ContraindicationDto dto)
    {
        var contraindication = new Contraindication
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            ContraindicationType = dto.ContraindicationType,
            ItemName = dto.ItemName ?? "",
            ItemCode = dto.ItemCode,
            Reason = dto.Reason,
            Notes = dto.Notes,
            IsActive = true
        };

        await _context.Contraindications.AddAsync(contraindication);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = contraindication.Id;
        dto.PatientId = patientId;
        return dto;
    }

    public async Task<ContraindicationDto> UpdatePatientContraindicationAsync(Guid id, ContraindicationDto dto)
    {
        var contraindication = await _context.Contraindications.FindAsync(id);
        if (contraindication == null) throw new Exception("Contraindication not found");

        contraindication.ContraindicationType = dto.ContraindicationType;
        contraindication.ItemName = dto.ItemName ?? "";
        contraindication.ItemCode = dto.ItemCode;
        contraindication.Reason = dto.Reason;
        contraindication.Notes = dto.Notes;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<bool> DeletePatientContraindicationAsync(Guid id)
    {
        var contraindication = await _context.Contraindications.FindAsync(id);
        if (contraindication == null) return false;

        contraindication.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<Application.DTOs.MedicalHistoryDto>> GetPatientMedicalHistoryAsync(Guid patientId, int limit = 20)
    {
        var records = await _context.MedicalRecords
            .Where(m => m.PatientId == patientId)
            .OrderByDescending(m => m.AdmissionDate)
            .Take(limit)
            .ToListAsync();

        return records.Select(m => new Application.DTOs.MedicalHistoryDto
        {
            Id = m.Id,
            PatientId = m.PatientId,
            HistoryType = m.TreatmentType == 1 ? "Ngoai tru" : "Noi tru",
            Description = m.MainDiagnosis,
            OccurrenceDate = m.AdmissionDate,
            CreatedDate = m.CreatedAt
        }).ToList();
    }

    public async Task<MedicalRecordFullDto?> GetMedicalHistoryDetailAsync(Guid examinationId)
    {
        return await GetMedicalRecordFullAsync(examinationId);
    }

    public async Task<List<string>> GetHistoryImagingImagesAsync(Guid orderId)
    {
        return new List<string>();
    }

    public async Task<TreatmentSheetDto> CreateTreatmentSheetAsync(TreatmentSheetDto dto)
    {
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
        if (sheet == null) throw new Exception("Treatment sheet not found");

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
        if (record == null) throw new Exception("Consultation record not found");

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
        if (sheet == null) throw new Exception("Nursing care sheet not found");

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
            Notes = info.Notes
        };
    }

    #endregion

    #region 2.4 Diagnosis

    public async Task<List<DiagnosisFullDto>> GetDiagnosesAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return new List<DiagnosisFullDto>();

        var diagnoses = new List<DiagnosisFullDto>();

        if (!string.IsNullOrEmpty(examination.MainIcdCode))
        {
            diagnoses.Add(new DiagnosisFullDto
            {
                Id = Guid.NewGuid(),
                ExaminationId = examinationId,
                IcdCode = examination.MainIcdCode,
                IcdName = examination.MainDiagnosis ?? "",
                IsPrimary = true,
                DiagnosisType = 2
            });
        }

        return diagnoses;
    }

    public async Task<DiagnosisFullDto> AddDiagnosisAsync(Guid examinationId, DiagnosisFullDto dto)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new Exception("Examination not found");

        if (dto.IsPrimary)
        {
            examination.MainIcdCode = dto.IcdCode;
            examination.MainDiagnosis = dto.IcdName;
        }
        else
        {
            examination.SubIcdCodes = string.IsNullOrEmpty(examination.SubIcdCodes)
                ? dto.IcdCode
                : $"{examination.SubIcdCodes},{dto.IcdCode}";
            examination.SubDiagnosis = string.IsNullOrEmpty(examination.SubDiagnosis)
                ? dto.IcdName
                : $"{examination.SubDiagnosis}; {dto.IcdName}";
        }

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = Guid.NewGuid();
        dto.ExaminationId = examinationId;
        return dto;
    }

    public async Task<DiagnosisFullDto> UpdateDiagnosisAsync(Guid diagnosisId, DiagnosisFullDto dto)
    {
        dto.Id = diagnosisId;
        return dto;
    }

    public async Task<bool> DeleteDiagnosisAsync(Guid diagnosisId)
    {
        return true;
    }

    public async Task<List<DiagnosisFullDto>> UpdateDiagnosisListAsync(Guid examinationId, UpdateDiagnosisDto dto)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new Exception("Examination not found");

        examination.InitialDiagnosis = dto.PreliminaryDiagnosis;
        examination.MainIcdCode = dto.PrimaryIcdCode;
        examination.MainDiagnosis = dto.PrimaryDiagnosis;

        if (dto.SecondaryDiagnoses?.Any() == true)
        {
            examination.SubIcdCodes = string.Join(",", dto.SecondaryDiagnoses.Select(d => d.IcdCode));
            examination.SubDiagnosis = string.Join("; ", dto.SecondaryDiagnoses.Select(d => d.DiagnosisName));
        }

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return await GetDiagnosesAsync(examinationId);
    }

    public async Task<DiagnosisFullDto> SetPrimaryDiagnosisAsync(Guid diagnosisId)
    {
        return new DiagnosisFullDto { Id = diagnosisId, IsPrimary = true };
    }

    public async Task<List<IcdCodeFullDto>> SearchIcdCodesAsync(string keyword, int? icdType = null, int limit = 20)
    {
        var codes = await _context.IcdCodes
            .Where(i => i.Code.Contains(keyword) || i.NameVn.Contains(keyword) || i.NameEn.Contains(keyword))
            .Take(limit)
            .ToListAsync();

        return codes.Select(i => new IcdCodeFullDto
        {
            Code = i.Code,
            Name = i.NameVn,
            EnglishName = i.NameEn,
            IcdType = 1,
            ChapterCode = i.ChapterCode,
            ChapterName = i.ChapterName,
            IsActive = i.IsActive
        }).ToList();
    }

    public async Task<IcdCodeFullDto?> GetIcdByCodeAsync(string code)
    {
        var icd = await _context.IcdCodes.FirstOrDefaultAsync(i => i.Code == code);
        if (icd == null) return null;

        return new IcdCodeFullDto
        {
            Code = icd.Code,
            Name = icd.NameVn,
            EnglishName = icd.NameEn,
            IcdType = 1,
            IsActive = icd.IsActive
        };
    }

    public async Task<List<IcdCodeFullDto>> GetFrequentIcdCodesAsync(Guid? departmentId = null, int limit = 20)
    {
        // TODO: Track frequency
        return await SearchIcdCodesAsync("", null, limit);
    }

    public async Task<List<IcdCodeFullDto>> SuggestIcdCodesAsync(string symptoms)
    {
        return await SearchIcdCodesAsync(symptoms, null, 10);
    }

    public async Task<List<IcdCodeFullDto>> GetRecentIcdCodesAsync(Guid doctorId, int limit = 20)
    {
        return new List<IcdCodeFullDto>();
    }

    public async Task<List<IcdCodeFullDto>> SearchExternalCauseCodesAsync(string keyword)
    {
        return await SearchIcdCodesAsync(keyword, null, 20);
    }

    #endregion

    #region 2.5 Additional Examination

    public async Task<Application.DTOs.ExaminationDto> CreateAdditionalExaminationAsync(AdditionalExaminationDto dto)
    {
        var originalExam = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == dto.OriginalExaminationId);

        if (originalExam == null) throw new Exception("Original examination not found");

        var newRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == dto.NewRoomId);

        var newExam = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = originalExam.MedicalRecordId,
            ExaminationType = 2, // Additional
            DepartmentId = newRoom?.DepartmentId ?? originalExam.DepartmentId,
            RoomId = dto.NewRoomId,
            DoctorId = dto.NewDoctorId,
            ChiefComplaint = dto.Reason,
            Status = 0
        };

        await _examinationRepo.AddAsync(newExam);
        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(newExam);
    }

    public async Task<Application.DTOs.ExaminationDto> TransferRoomAsync(TransferRoomRequestDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId);

        if (examination == null) throw new Exception("Examination not found");

        var newRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == dto.NewRoomId);

        examination.RoomId = dto.NewRoomId;
        examination.DepartmentId = newRoom?.DepartmentId ?? examination.DepartmentId;
        if (dto.NewDoctorId.HasValue)
            examination.DoctorId = dto.NewDoctorId;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    public async Task<Application.DTOs.ExaminationDto> TransferPrimaryExaminationAsync(Guid examinationId, Guid newRoomId)
    {
        return await TransferRoomAsync(new TransferRoomRequestDto
        {
            ExaminationId = examinationId,
            NewRoomId = newRoomId
        });
    }

    public async Task<List<Application.DTOs.ExaminationDto>> GetAdditionalExaminationsAsync(Guid primaryExaminationId)
    {
        var primaryExam = await _examinationRepo.GetByIdAsync(primaryExaminationId);
        if (primaryExam == null) return new List<Application.DTOs.ExaminationDto>();

        var additionalExams = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Include(e => e.Room)
            .Where(e => e.MedicalRecordId == primaryExam.MedicalRecordId && e.ExaminationType == 2)
            .ToListAsync();

        return additionalExams.Select(MapToExaminationDto).ToList();
    }

    public async Task<bool> CancelAdditionalExaminationAsync(Guid examinationId, string reason)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return false;

        examination.Status = 5; // Cancelled
        examination.ConclusionNote = reason;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<Application.DTOs.ExaminationDto> CompleteAdditionalExaminationAsync(Guid examinationId)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        examination.Status = 4; // Completed
        examination.EndTime = DateTime.Now;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    #endregion

    #region 2.6 Service Orders

    public async Task<List<ServiceOrderFullDto>> GetServiceOrdersAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return new List<ServiceOrderFullDto>();

        var requests = await _context.ServiceRequests
            .Include(r => r.Service)
            .Include(r => r.Room)
            .Where(r => r.MedicalRecordId == examination.MedicalRecordId)
            .ToListAsync();

        return requests.Select(r => new ServiceOrderFullDto
        {
            Id = r.Id,
            ExaminationId = examinationId,
            OrderDate = r.RequestedDate ?? DateTime.Now,
            ServiceId = r.ServiceId ?? Guid.Empty,
            ServiceCode = r.Service?.ServiceCode ?? "",
            ServiceName = r.Service?.ServiceName ?? "",
            ServiceType = r.Service?.ServiceType ?? 0,
            Quantity = r.Quantity,
            UnitPrice = r.UnitPrice,
            TotalPrice = r.TotalPrice,
            RoomId = r.RoomId,
            RoomName = r.Room?.RoomName,
            Status = r.Status
        }).ToList();
    }

    public async Task<List<ServiceOrderFullDto>> CreateServiceOrdersAsync(CreateServiceOrderDto dto)
    {
        var examination = await _examinationRepo.GetByIdAsync(dto.ExaminationId);
        if (examination == null) throw new Exception("Examination not found");

        var results = new List<ServiceOrderFullDto>();

        foreach (var item in dto.Services)
        {
            var service = await _context.Services.FindAsync(item.ServiceId);
            if (service == null) continue;

            var request = new ServiceRequest
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = examination.MedicalRecordId,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = service.UnitPrice * item.Quantity,
                RoomId = item.RoomId,
                Status = 0,
                RequestedDate = DateTime.Now,
                Notes = item.Notes
            };

            await _context.ServiceRequests.AddAsync(request);

            results.Add(new ServiceOrderFullDto
            {
                Id = request.Id,
                ExaminationId = dto.ExaminationId,
                ServiceId = service.Id,
                ServiceCode = service.ServiceCode,
                ServiceName = service.ServiceName,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = request.TotalPrice,
                RoomId = item.RoomId,
                Status = 0
            });
        }

        await _unitOfWork.SaveChangesAsync();
        return results;
    }

    public async Task<ServiceOrderFullDto> UpdateServiceOrderAsync(Guid orderId, ServiceOrderFullDto dto)
    {
        var request = await _context.ServiceRequests.FindAsync(orderId);
        if (request == null) throw new Exception("Service order not found");

        request.Quantity = dto.Quantity;
        request.TotalPrice = dto.UnitPrice * dto.Quantity;
        request.RoomId = dto.RoomId;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = orderId;
        return dto;
    }

    public async Task<bool> CancelServiceOrderAsync(Guid orderId, string reason)
    {
        var request = await _context.ServiceRequests.FindAsync(orderId);
        if (request == null || request.Status != 0) return false;

        request.Status = 3; // Cancelled
        request.Notes = reason;

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<ServiceDto>> GetServicesAsync(int? serviceType = null, Guid? departmentId = null, string? keyword = null)
    {
        var query = _context.Services.Where(s => s.IsActive);

        if (serviceType.HasValue)
            query = query.Where(s => s.ServiceType == serviceType.Value);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(s => s.ServiceCode.Contains(keyword) || s.ServiceName.Contains(keyword));

        var services = await query.Take(100).ToListAsync();

        return services.Select(s => new ServiceDto
        {
            Id = s.Id,
            Code = s.ServiceCode,
            Name = s.ServiceName,
            ServiceType = s.ServiceType,
            UnitPrice = s.UnitPrice,
            InsurancePrice = s.InsurancePrice,
            IsActive = s.IsActive
        }).ToList();
    }

    public async Task<List<ServiceDto>> SearchServicesAsync(string keyword, int limit = 20)
    {
        return await GetServicesAsync(null, null, keyword);
    }

    public async Task<List<ServiceGroupTemplateDto>> GetServiceGroupTemplatesAsync(Guid? departmentId = null)
    {
        var query = _context.ServiceGroupTemplates
            .Include(t => t.Items)
            .ThenInclude(i => i.Service)
            .Where(t => t.IsActive);

        if (departmentId.HasValue)
            query = query.Where(t => t.DepartmentId == departmentId || t.IsPublic);

        return await query
            .OrderBy(t => t.TemplateName)
            .Select(t => new ServiceGroupTemplateDto
            {
                Id = t.Id,
                TemplateCode = t.TemplateCode,
                TemplateName = t.TemplateName,
                DepartmentId = t.DepartmentId,
                IsPublic = t.IsPublic,
                Services = t.Items.Select(i => new ServiceGroupTemplateItemDto
                {
                    ServiceId = i.ServiceId,
                    ServiceCode = i.Service.ServiceCode,
                    ServiceName = i.Service.ServiceName,
                    Quantity = i.Quantity,
                    Notes = i.Notes
                }).ToList()
            })
            .ToListAsync();
    }

    public async Task<ServiceGroupTemplateDto> CreateServiceGroupTemplateAsync(ServiceGroupTemplateDto dto)
    {
        var template = new ServiceGroupTemplate
        {
            Id = Guid.NewGuid(),
            TemplateCode = dto.TemplateCode ?? $"DV{DateTime.Now:yyyyMMddHHmmss}",
            TemplateName = dto.TemplateName,
            DepartmentId = dto.DepartmentId,
            IsPublic = dto.IsPublic,
            IsActive = true,
            Items = new List<ServiceGroupTemplateItem>()
        };

        if (dto.Services != null)
        {
            foreach (var item in dto.Services)
            {
                template.Items.Add(new ServiceGroupTemplateItem
                {
                    Id = Guid.NewGuid(),
                    ServiceGroupTemplateId = template.Id,
                    ServiceId = item.ServiceId,
                    Quantity = item.Quantity,
                    Notes = item.Notes
                });
            }
        }

        await _context.ServiceGroupTemplates.AddAsync(template);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = template.Id;
        return dto;
    }

    public async Task<ServiceGroupTemplateDto> UpdateServiceGroupTemplateAsync(Guid id, ServiceGroupTemplateDto dto)
    {
        var template = await _context.ServiceGroupTemplates
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null) throw new Exception("Template not found");

        template.TemplateCode = dto.TemplateCode;
        template.TemplateName = dto.TemplateName;
        template.DepartmentId = dto.DepartmentId;
        template.IsPublic = dto.IsPublic;

        // Remove old items
        _context.ServiceGroupTemplateItems.RemoveRange(template.Items);

        // Add new items
        if (dto.Services != null)
        {
            foreach (var item in dto.Services)
            {
                template.Items.Add(new ServiceGroupTemplateItem
                {
                    Id = Guid.NewGuid(),
                    ServiceGroupTemplateId = template.Id,
                    ServiceId = item.ServiceId,
                    Quantity = item.Quantity,
                    Notes = item.Notes
                });
            }
        }

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<bool> DeleteServiceGroupTemplateAsync(Guid id)
    {
        var template = await _context.ServiceGroupTemplates.FindAsync(id);
        if (template == null) return false;

        template.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<ServicePackageDto>> GetServicePackagesAsync()
    {
        return new List<ServicePackageDto>();
    }

    public async Task<List<ServiceOrderFullDto>> ApplyServicePackageAsync(Guid examinationId, Guid packageId)
    {
        return new List<ServiceOrderFullDto>();
    }

    public async Task<List<ServiceOrderWarningDto>> CheckDuplicateServicesAsync(Guid examinationId, List<Guid> serviceIds)
    {
        return new List<ServiceOrderWarningDto>();
    }

    public async Task<List<ServiceOrderWarningDto>> ValidateServiceOrdersAsync(Guid examinationId, List<Guid> serviceIds)
    {
        return new List<ServiceOrderWarningDto>();
    }

    public async Task<List<RoomDto>> GetServiceRoomsAsync(Guid serviceId)
    {
        var rooms = await _context.Rooms.Where(r => r.IsActive).Take(10).ToListAsync();

        return rooms.Select(r => new RoomDto
        {
            Id = r.Id,
            Code = r.RoomCode,
            Name = r.RoomName,
            DepartmentId = r.DepartmentId,
            RoomType = r.RoomType,
            IsActive = r.IsActive
        }).ToList();
    }

    public async Task<Guid?> AutoSelectOptimalRoomAsync(Guid serviceId)
    {
        var room = await _context.Rooms.FirstOrDefaultAsync(r => r.IsActive);
        return room?.Id;
    }

    public async Task<List<RoomDto>> CalculateOptimalPathAsync(List<Guid> serviceIds)
    {
        if (!serviceIds.Any()) return new List<RoomDto>();

        var result = new List<RoomDto>();

        // Get services and their available rooms
        foreach (var serviceId in serviceIds)
        {
            var service = await _context.Services.FindAsync(serviceId);
            if (service == null) continue;

            // Find room that can perform this service with least waiting
            var availableRooms = await _context.Rooms
                .Include(r => r.Department)
                .Where(r => r.IsActive && r.ServiceTypes != null && r.ServiceTypes.Contains(service.ServiceType.ToString()))
                .ToListAsync();

            if (!availableRooms.Any())
            {
                // Fall back to any active room of matching type
                availableRooms = await _context.Rooms
                    .Include(r => r.Department)
                    .Where(r => r.IsActive && r.RoomType == service.ServiceType)
                    .ToListAsync();
            }

            var optimalRoom = availableRooms.FirstOrDefault();
            if (optimalRoom != null && !result.Any(r => r.Id == optimalRoom.Id))
            {
                result.Add(new RoomDto
                {
                    Id = optimalRoom.Id,
                    Code = optimalRoom.RoomCode,
                    Name = optimalRoom.RoomName,
                    DepartmentId = optimalRoom.DepartmentId,
                    DepartmentName = optimalRoom.Department?.DepartmentName,
                    RoomType = optimalRoom.RoomType,
                    IsActive = optimalRoom.IsActive
                });
            }
        }

        return result;
    }

    public async Task<List<ServiceDto>> GetFrequentServicesAsync(Guid doctorId, int limit = 20)
    {
        return await GetServicesAsync(null, null, null);
    }

    public async Task<byte[]> PrintServiceOrderAsync(Guid orderId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintAllServiceOrdersAsync(Guid examinationId)
    {
        return Array.Empty<byte>();
    }

    #endregion

    #region 2.7 Prescriptions

    public async Task<List<PrescriptionFullDto>> GetPrescriptionsAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return new List<PrescriptionFullDto>();

        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details)
            .ThenInclude(i => i.Medicine)
            .Where(p => p.MedicalRecordId == examination.MedicalRecordId)
            .ToListAsync();

        return prescriptions.Select(MapToPrescriptionFullDto).ToList();
    }

    public async Task<PrescriptionFullDto?> GetPrescriptionByIdAsync(Guid id)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .ThenInclude(i => i.Medicine)
            .FirstOrDefaultAsync(p => p.Id == id);

        return prescription != null ? MapToPrescriptionFullDto(prescription) : null;
    }

    public async Task<PrescriptionFullDto> CreatePrescriptionAsync(Application.DTOs.Examination.CreatePrescriptionDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId);
        if (examination == null) throw new Exception("Examination not found");

        var prescription = new Prescription
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = examination.MedicalRecordId,
            ExaminationId = dto.ExaminationId, // Set ExaminationId
            DoctorId = examination.DoctorId ?? Guid.Empty, // Set DoctorId from examination
            DepartmentId = examination.DepartmentId,
            PrescriptionCode = $"DT{DateTime.Now:yyyyMMddHHmmss}",
            PrescriptionDate = DateTime.Now,
            PrescriptionType = dto.PrescriptionType,
            DiagnosisCode = dto.DiagnosisCode,
            DiagnosisName = dto.DiagnosisName,
            TotalDays = dto.TotalDays,
            Instructions = dto.Instructions,
            Status = 0, // Draft
            Details = new List<PrescriptionDetail>()
        };

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.MedicineId);
            if (medicine == null) continue;

            prescription.Details.Add(new PrescriptionDetail
            {
                Id = Guid.NewGuid(),
                PrescriptionId = prescription.Id,
                MedicineId = item.MedicineId,
                Quantity = item.Quantity,
                Unit = medicine.Unit ?? "Vien",
                Days = item.Days,
                Dosage = item.Dosage,
                Route = item.Route,
                Frequency = item.Frequency,
                UsageInstructions = item.UsageInstructions,
                UnitPrice = medicine.UnitPrice,
                TotalPrice = medicine.UnitPrice * item.Quantity
            });
        }

        prescription.TotalAmount = prescription.Details.Sum(i => i.TotalPrice);

        await _context.Prescriptions.AddAsync(prescription);
        await _unitOfWork.SaveChangesAsync();

        return MapToPrescriptionFullDto(prescription);
    }

    public async Task<PrescriptionFullDto> UpdatePrescriptionAsync(Guid id, Application.DTOs.Examination.CreatePrescriptionDto dto)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (prescription == null) throw new Exception("Prescription not found");

        // Remove old items
        _context.PrescriptionDetails.RemoveRange(prescription.Details);

        // Update prescription
        prescription.DiagnosisCode = dto.DiagnosisCode;
        prescription.DiagnosisName = dto.DiagnosisName;
        prescription.TotalDays = dto.TotalDays;
        prescription.Instructions = dto.Instructions;

        // Add new items
        prescription.Details = new List<PrescriptionDetail>();
        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.MedicineId);
            if (medicine == null) continue;

            prescription.Details.Add(new PrescriptionDetail
            {
                Id = Guid.NewGuid(),
                PrescriptionId = prescription.Id,
                MedicineId = item.MedicineId,
                Quantity = item.Quantity,
                Unit = medicine.Unit ?? "Vien",
                Days = item.Days,
                Dosage = item.Dosage,
                Route = item.Route,
                Frequency = item.Frequency,
                UsageInstructions = item.UsageInstructions,
                UnitPrice = medicine.UnitPrice,
                TotalPrice = medicine.UnitPrice * item.Quantity
            });
        }

        prescription.TotalAmount = prescription.Details.Sum(i => i.TotalPrice);

        await _unitOfWork.SaveChangesAsync();

        return MapToPrescriptionFullDto(prescription);
    }

    public async Task<bool> DeletePrescriptionAsync(Guid id)
    {
        var prescription = await _context.Prescriptions.FindAsync(id);
        if (prescription == null || prescription.Status != 0) return false;

        _context.Prescriptions.Remove(prescription);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<List<MedicineDto>> SearchMedicinesAsync(string keyword, Guid? warehouseId = null, int limit = 20)
    {
        var medicines = await _context.Medicines
            .Where(m => m.IsActive && (m.MedicineCode.Contains(keyword) || m.MedicineName.Contains(keyword) || m.ActiveIngredient.Contains(keyword)))
            .Take(limit)
            .ToListAsync();

        return medicines.Select(m => new MedicineDto
        {
            Id = m.Id,
            Code = m.MedicineCode,
            Name = m.MedicineName,
            ActiveIngredient = m.ActiveIngredient,
            Manufacturer = m.Manufacturer,
            Country = m.Country,
            Unit = m.Unit,
            UnitPrice = m.UnitPrice,
            InsurancePrice = m.InsurancePrice,
            IsActive = m.IsActive
        }).ToList();
    }

    public async Task<MedicineDto?> GetMedicineWithStockAsync(Guid medicineId, Guid? warehouseId = null)
    {
        var medicine = await _context.Medicines.FindAsync(medicineId);
        if (medicine == null) return null;

        // Get actual stock from inventory
        var stockQuery = _context.InventoryItems
            .Where(i => i.ItemId == medicineId && i.ItemType == "Medicine");

        if (warehouseId.HasValue)
            stockQuery = stockQuery.Where(i => i.WarehouseId == warehouseId.Value);
        else
        {
            // Get from dispensary warehouses
            var dispensaryIds = await _context.Warehouses
                .Where(w => w.IsActive && w.WarehouseType == 2)
                .Select(w => w.Id)
                .ToListAsync();
            stockQuery = stockQuery.Where(i => dispensaryIds.Contains(i.WarehouseId));
        }

        var totalStock = await stockQuery.SumAsync(i => (decimal?)i.Quantity) ?? 0;

        return new MedicineDto
        {
            Id = medicine.Id,
            Code = medicine.MedicineCode,
            Name = medicine.MedicineName,
            ActiveIngredient = medicine.ActiveIngredient,
            Manufacturer = medicine.Manufacturer,
            Country = medicine.Country,
            Unit = medicine.Unit,
            UnitPrice = medicine.UnitPrice,
            InsurancePrice = medicine.InsurancePrice,
            AvailableQuantity = totalStock,
            IsActive = medicine.IsActive
        };
    }

    public async Task<List<MedicineDto>> GetMedicinesByGroupAsync(Guid groupId)
    {
        // Assuming medicines have a GroupId property or using a lookup table
        var medicines = await _context.Medicines
            .Where(m => m.IsActive && m.MedicineGroupId == groupId)
            .Take(100)
            .ToListAsync();

        var result = new List<MedicineDto>();
        foreach (var m in medicines)
        {
            var dto = await GetMedicineWithStockAsync(m.Id);
            if (dto != null) result.Add(dto);
        }

        return result;
    }

    public async Task<List<DrugInteractionDto>> CheckDrugInteractionsAsync(List<Guid> medicineIds)
    {
        if (medicineIds.Count < 2) return new List<DrugInteractionDto>();

        var interactions = new List<DrugInteractionDto>();

        // Get all medicines
        var medicines = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToListAsync();

        // Check interactions between each pair
        for (int i = 0; i < medicineIds.Count - 1; i++)
        {
            for (int j = i + 1; j < medicineIds.Count; j++)
            {
                var interaction = await _context.DrugInteractions
                    .FirstOrDefaultAsync(d =>
                        (d.Medicine1Id == medicineIds[i] && d.Medicine2Id == medicineIds[j]) ||
                        (d.Medicine1Id == medicineIds[j] && d.Medicine2Id == medicineIds[i]));

                if (interaction != null)
                {
                    var med1 = medicines.FirstOrDefault(m => m.Id == medicineIds[i]);
                    var med2 = medicines.FirstOrDefault(m => m.Id == medicineIds[j]);

                    interactions.Add(new DrugInteractionDto
                    {
                        Medicine1Id = medicineIds[i],
                        Medicine1Name = med1?.MedicineName ?? "",
                        Medicine2Id = medicineIds[j],
                        Medicine2Name = med2?.MedicineName ?? "",
                        InteractionType = interaction.InteractionType,
                        Severity = interaction.Severity,
                        Description = interaction.Description,
                        Recommendation = interaction.Recommendation
                    });
                }
            }
        }

        return interactions;
    }

    public async Task<List<PrescriptionWarningDto>> CheckDrugAllergiesAsync(Guid patientId, List<Guid> medicineIds)
    {
        var warnings = new List<PrescriptionWarningDto>();

        // Get patient allergies
        var allergies = await _context.Allergies
            .Where(a => a.PatientId == patientId && a.IsActive && a.AllergyType == 1) // Drug allergy
            .ToListAsync();

        if (!allergies.Any()) return warnings;

        // Get medicines
        var medicines = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToListAsync();

        foreach (var medicine in medicines)
        {
            foreach (var allergy in allergies)
            {
                // Check if medicine matches allergy (by name or active ingredient)
                if ((allergy.AllergenCode != null && medicine.MedicineCode == allergy.AllergenCode) ||
                    (allergy.AllergenName != null &&
                     (medicine.MedicineName.Contains(allergy.AllergenName, StringComparison.OrdinalIgnoreCase) ||
                      (medicine.ActiveIngredient != null && medicine.ActiveIngredient.Contains(allergy.AllergenName, StringComparison.OrdinalIgnoreCase)))))
                {
                    warnings.Add(new PrescriptionWarningDto
                    {
                        MedicineId = medicine.Id,
                        MedicineName = medicine.MedicineName,
                        WarningType = "Allergy",
                        Severity = allergy.Severity,
                        Message = $"Benh nhan di ung voi {allergy.AllergenName}. Phan ung: {allergy.Reaction}",
                        Recommendation = "Can than khi ke don thuoc nay"
                    });
                }
            }
        }

        return warnings;
    }

    public async Task<List<PrescriptionWarningDto>> CheckContraindicationsAsync(Guid patientId, List<Guid> medicineIds)
    {
        var warnings = new List<PrescriptionWarningDto>();

        // Get patient contraindications
        var contraindications = await _context.Contraindications
            .Where(c => c.PatientId == patientId && c.IsActive && c.ContraindicationType == 1) // Drug contraindication
            .ToListAsync();

        if (!contraindications.Any()) return warnings;

        // Get medicines
        var medicines = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToListAsync();

        foreach (var medicine in medicines)
        {
            foreach (var ci in contraindications)
            {
                if ((ci.ItemCode != null && medicine.MedicineCode == ci.ItemCode) ||
                    (ci.ItemName != null && medicine.MedicineName.Contains(ci.ItemName, StringComparison.OrdinalIgnoreCase)))
                {
                    warnings.Add(new PrescriptionWarningDto
                    {
                        MedicineId = medicine.Id,
                        MedicineName = medicine.MedicineName,
                        WarningType = "Contraindication",
                        Severity = 2, // High
                        Message = $"Chong chi dinh: {ci.Reason}",
                        Recommendation = "Khong nen ke thuoc nay cho benh nhan"
                    });
                }
            }
        }

        return warnings;
    }

    public async Task<List<PrescriptionWarningDto>> CheckDuplicateMedicinesAsync(Guid patientId, List<Guid> medicineIds, DateTime date)
    {
        var warnings = new List<PrescriptionWarningDto>();

        // Get recent prescriptions (last 7 days)
        var recentPrescriptions = await _context.PrescriptionDetails
            .Include(d => d.Prescription)
            .ThenInclude(p => p.MedicalRecord)
            .Include(d => d.Medicine)
            .Where(d => d.Prescription.MedicalRecord.PatientId == patientId &&
                       d.Prescription.PrescriptionDate >= date.AddDays(-7) &&
                       medicineIds.Contains(d.MedicineId))
            .ToListAsync();

        foreach (var detail in recentPrescriptions)
        {
            warnings.Add(new PrescriptionWarningDto
            {
                MedicineId = detail.MedicineId,
                MedicineName = detail.Medicine?.MedicineName ?? "",
                WarningType = "Duplicate",
                Severity = 1, // Medium
                Message = $"Thuoc da duoc ke ngay {detail.Prescription.PrescriptionDate:dd/MM/yyyy}",
                Recommendation = "Kiem tra lai so luong va thoi gian dung"
            });
        }

        return warnings;
    }

    public async Task<List<PrescriptionWarningDto>> ValidateBhytPrescriptionAsync(Guid examinationId, Application.DTOs.Examination.CreatePrescriptionDto dto)
    {
        var warnings = new List<PrescriptionWarningDto>();

        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination?.MedicalRecord?.PatientType != 1) return warnings; // Not BHYT

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.MedicineId);
            if (medicine == null) continue;

            // Check if medicine is in BHYT list
            if (!medicine.IsBhytCovered)
            {
                warnings.Add(new PrescriptionWarningDto
                {
                    MedicineId = item.MedicineId,
                    MedicineName = medicine.MedicineName,
                    WarningType = "BHYT",
                    Severity = 2,
                    Message = "Thuoc khong nam trong danh muc BHYT",
                    Recommendation = "Benh nhan phai tu tra tien thuoc nay"
                });
            }

            // Check quantity limit
            if (item.Quantity > 30 && dto.PrescriptionType == 1) // Outpatient
            {
                warnings.Add(new PrescriptionWarningDto
                {
                    MedicineId = item.MedicineId,
                    MedicineName = medicine.MedicineName,
                    WarningType = "BHYT",
                    Severity = 1,
                    Message = "So luong vuot qua gioi han BHYT (30 ngay)",
                    Recommendation = "Giam so luong hoac giai trinh ly do"
                });
            }
        }

        return warnings;
    }

    public async Task<List<PrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid? departmentId = null)
    {
        var query = _context.PrescriptionTemplates
            .Include(t => t.Items)
            .ThenInclude(i => i.Medicine)
            .Where(t => t.IsActive);

        if (departmentId.HasValue)
            query = query.Where(t => t.DepartmentId == departmentId || t.IsPublic);

        return await query
            .OrderBy(t => t.TemplateName)
            .Select(t => new PrescriptionTemplateDto
            {
                Id = t.Id,
                TemplateCode = t.TemplateCode,
                TemplateName = t.TemplateName,
                DepartmentId = t.DepartmentId,
                DiagnosisCode = t.DiagnosisCode,
                DiagnosisName = t.DiagnosisName,
                IsPublic = t.IsPublic,
                TemplateItems = t.Items.Select(i => new PrescriptionTemplateItemDto
                {
                    MedicineId = i.MedicineId,
                    MedicineCode = i.Medicine.MedicineCode,
                    MedicineName = i.Medicine.MedicineName,
                    Quantity = i.Quantity,
                    Days = i.Days,
                    Dosage = i.Dosage,
                    Route = i.Route,
                    Frequency = i.Frequency,
                    UsageInstructions = i.UsageInstructions
                }).ToList()
            })
            .ToListAsync();
    }

    public async Task<PrescriptionTemplateDto> CreatePrescriptionTemplateAsync(PrescriptionTemplateDto dto)
    {
        var template = new PrescriptionTemplate
        {
            Id = Guid.NewGuid(),
            TemplateCode = dto.TemplateCode ?? $"DT{DateTime.Now:yyyyMMddHHmmss}",
            TemplateName = dto.TemplateName,
            DepartmentId = dto.DepartmentId,
            DiagnosisCode = dto.DiagnosisCode,
            DiagnosisName = dto.DiagnosisName,
            IsPublic = dto.IsPublic,
            IsActive = true,
            Items = new List<PrescriptionTemplateItem>()
        };

        if (dto.Items != null)
        {
            foreach (var item in dto.Items)
            {
                template.Items.Add(new PrescriptionTemplateItem
                {
                    Id = Guid.NewGuid(),
                    PrescriptionTemplateId = template.Id,
                    MedicineId = item.MedicineId,
                    Quantity = item.Quantity,
                    Days = item.Days,
                    Dosage = item.Dosage,
                    Route = item.Route,
                    Frequency = item.Frequency,
                    UsageInstructions = item.UsageInstructions
                });
            }
        }

        await _context.PrescriptionTemplates.AddAsync(template);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = template.Id;
        return dto;
    }

    public async Task<PrescriptionTemplateDto> UpdatePrescriptionTemplateAsync(Guid id, PrescriptionTemplateDto dto)
    {
        var template = await _context.PrescriptionTemplates
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null) throw new Exception("Template not found");

        template.TemplateCode = dto.TemplateCode;
        template.TemplateName = dto.TemplateName;
        template.DepartmentId = dto.DepartmentId;
        template.DiagnosisCode = dto.DiagnosisCode;
        template.DiagnosisName = dto.DiagnosisName;
        template.IsPublic = dto.IsPublic;

        // Remove old items
        _context.PrescriptionTemplateItems.RemoveRange(template.Items);

        // Add new items
        if (dto.Items != null)
        {
            foreach (var item in dto.Items)
            {
                template.Items.Add(new PrescriptionTemplateItem
                {
                    Id = Guid.NewGuid(),
                    PrescriptionTemplateId = template.Id,
                    MedicineId = item.MedicineId,
                    Quantity = item.Quantity,
                    Days = item.Days,
                    Dosage = item.Dosage,
                    Route = item.Route,
                    Frequency = item.Frequency,
                    UsageInstructions = item.UsageInstructions
                });
            }
        }

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<bool> DeletePrescriptionTemplateAsync(Guid id)
    {
        var template = await _context.PrescriptionTemplates.FindAsync(id);
        if (template == null) return false;

        template.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<PrescriptionFullDto> ApplyPrescriptionTemplateAsync(Guid examinationId, Guid templateId)
    {
        var template = await _context.PrescriptionTemplates
            .Include(t => t.Items)
            .ThenInclude(i => i.Medicine)
            .FirstOrDefaultAsync(t => t.Id == templateId);

        if (template == null) throw new Exception("Template not found");

        var createDto = new Application.DTOs.Examination.CreatePrescriptionDto
        {
            ExaminationId = examinationId,
            PrescriptionType = 1,
            DiagnosisCode = template.DiagnosisCode,
            DiagnosisName = template.DiagnosisName,
            Items = template.Items.Select(i => new Application.DTOs.Examination.CreatePrescriptionItemDto
            {
                MedicineId = i.MedicineId,
                Quantity = i.Quantity,
                Days = i.Days,
                Dosage = i.Dosage,
                Route = i.Route,
                Frequency = i.Frequency,
                UsageInstructions = i.UsageInstructions
            }).ToList()
        };

        return await CreatePrescriptionAsync(createDto);
    }

    public async Task<PrescriptionTemplateDto> SaveAsPrescriptionTemplateAsync(Guid prescriptionId, string templateName)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId);

        if (prescription == null) throw new Exception("Prescription not found");

        var dto = new PrescriptionTemplateDto
        {
            TemplateName = templateName,
            DiagnosisCode = prescription.DiagnosisCode,
            DiagnosisName = prescription.DiagnosisName,
            IsPublic = false,
            TemplateItems = prescription.Details.Select(d => new PrescriptionTemplateItemDto
            {
                MedicineId = d.MedicineId,
                Quantity = d.Quantity,
                Days = d.Days,
                Dosage = d.Dosage,
                Route = d.Route,
                Frequency = d.Frequency,
                UsageInstructions = d.UsageInstructions
            }).ToList()
        };

        return await CreatePrescriptionTemplateAsync(dto);
    }

    public async Task<List<InstructionLibraryDto>> GetInstructionLibraryAsync(string? category = null)
    {
        var query = _context.InstructionLibraries.Where(i => i.IsActive);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(i => i.Category == category);

        return await query
            .OrderBy(i => i.Category)
            .ThenBy(i => i.SortOrder)
            .ThenBy(i => i.Instruction)
            .Select(i => new InstructionLibraryDto
            {
                Id = i.Id,
                Category = i.Category,
                Code = i.Code,
                Instruction = i.Instruction,
                Description = i.Description,
                SortOrder = i.SortOrder
            })
            .ToListAsync();
    }

    public async Task<InstructionLibraryDto> AddInstructionAsync(InstructionLibraryDto dto)
    {
        var instruction = new InstructionLibrary
        {
            Id = Guid.NewGuid(),
            Category = dto.Category,
            Code = dto.Code ?? $"HD{DateTime.Now:yyyyMMddHHmmss}",
            Instruction = dto.Instruction,
            Description = dto.Description,
            SortOrder = dto.SortOrder,
            IsActive = true
        };

        await _context.InstructionLibraries.AddAsync(instruction);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = instruction.Id;
        return dto;
    }

    public async Task<bool> DeleteInstructionAsync(Guid id)
    {
        var instruction = await _context.InstructionLibraries.FindAsync(id);
        if (instruction == null) return false;

        instruction.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<MedicineDto>> GetFrequentMedicinesAsync(Guid doctorId, int limit = 20)
    {
        return await SearchMedicinesAsync("", null, limit);
    }

    public async Task<byte[]> PrintPrescriptionAsync(Guid prescriptionId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintExternalPrescriptionAsync(Guid prescriptionId)
    {
        return Array.Empty<byte>();
    }

    public async Task<PrescriptionFullDto> CopyPrescriptionFromHistoryAsync(Guid examinationId, Guid sourcePrescriptionId)
    {
        var source = await GetPrescriptionByIdAsync(sourcePrescriptionId);
        if (source == null) throw new Exception("Source prescription not found");

        source.Id = Guid.NewGuid();
        source.ExaminationId = examinationId;
        source.PrescriptionDate = DateTime.Now;

        return source;
    }

    public async Task<List<WarehouseDto>> GetDispensaryWarehousesAsync()
    {
        var warehouses = await _context.Warehouses
            .Where(w => w.IsActive && w.WarehouseType == 2) // Dispensary type
            .ToListAsync();

        return warehouses.Select(w => new WarehouseDto
        {
            Id = w.Id,
            Code = w.WarehouseCode,
            Name = w.WarehouseName,
            WarehouseType = w.WarehouseType,
            IsActive = w.IsActive
        }).ToList();
    }

    #endregion

    #region 2.8 Examination Conclusion

    public async Task<ExaminationConclusionDto?> GetConclusionAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null || !examination.ConclusionType.HasValue) return null;

        return new ExaminationConclusionDto
        {
            Id = Guid.NewGuid(),
            ExaminationId = examinationId,
            ConclusionType = examination.ConclusionType.Value,
            ConclusionNotes = examination.ConclusionNote,
            NextAppointmentDate = examination.FollowUpDate,
            ConcludedAt = examination.EndTime ?? DateTime.Now
        };
    }

    public async Task<ExaminationConclusionDto> CompleteExaminationAsync(Guid examinationId, CompleteExaminationDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        examination.ConclusionType = dto.ConclusionType;
        examination.ConclusionNote = dto.ConclusionNotes;
        examination.FollowUpDate = dto.NextAppointmentDate;
        examination.Status = 4; // Completed
        examination.EndTime = DateTime.Now;

        if (!string.IsNullOrEmpty(dto.FinalDiagnosisCode))
        {
            examination.MainIcdCode = dto.FinalDiagnosisCode;
            examination.MainDiagnosis = dto.FinalDiagnosisName;
        }

        // Update medical record
        examination.MedicalRecord.MainIcdCode = examination.MainIcdCode;
        examination.MedicalRecord.MainDiagnosis = examination.MainDiagnosis;
        examination.MedicalRecord.Status = 3; // Completed

        await _unitOfWork.SaveChangesAsync();

        return new ExaminationConclusionDto
        {
            Id = Guid.NewGuid(),
            ExaminationId = examinationId,
            ConclusionType = dto.ConclusionType,
            ConclusionNotes = dto.ConclusionNotes,
            NextAppointmentDate = dto.NextAppointmentDate,
            SickLeaveDays = dto.SickLeaveDays,
            ConcludedAt = DateTime.Now
        };
    }

    public async Task<ExaminationConclusionDto> UpdateConclusionAsync(Guid examinationId, CompleteExaminationDto dto)
    {
        return await CompleteExaminationAsync(examinationId, dto);
    }

    public async Task<Application.DTOs.ExaminationDto> RequestHospitalizationAsync(Guid examinationId, HospitalizationRequestDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        examination.ConclusionType = 3; // Hospitalization
        examination.ConclusionNote = dto.Reason;
        examination.Status = 4;
        examination.EndTime = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    public async Task<Application.DTOs.ExaminationDto> RequestTransferAsync(Guid examinationId, TransferRequestDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        examination.ConclusionType = 4; // Transfer
        examination.ConclusionNote = $"Chuyen vien: {dto.FacilityName}. Ly do: {dto.Reason}";
        examination.Status = 4;
        examination.EndTime = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    public async Task<AppointmentDto> CreateAppointmentAsync(Guid examinationId, CreateAppointmentDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            AppointmentCode = $"HK{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = examination.MedicalRecord.PatientId,
            AppointmentDate = dto.AppointmentDate,
            RoomId = dto.RoomId ?? examination.RoomId,
            DoctorId = dto.DoctorId,
            Notes = dto.Notes,
            Status = 1 // Scheduled
        };

        await _context.Appointments.AddAsync(appointment);

        // Update examination follow-up date
        examination.FollowUpDate = dto.AppointmentDate;

        await _unitOfWork.SaveChangesAsync();

        return new AppointmentDto
        {
            Id = appointment.Id,
            PatientId = appointment.PatientId,
            AppointmentDate = appointment.AppointmentDate,
            RoomId = appointment.RoomId,
            DoctorId = appointment.DoctorId,
            Notes = appointment.Notes,
            Status = appointment.Status
        };
    }

    public async Task<SickLeaveDto> CreateSickLeaveAsync(Guid examinationId, CreateSickLeaveDto dto)
    {
        return new SickLeaveDto
        {
            Id = Guid.NewGuid(),
            ExaminationId = examinationId,
            Days = dto.Days,
            FromDate = dto.FromDate,
            ToDate = dto.ToDate,
            Reason = dto.Reason,
            IssuedAt = DateTime.Now
        };
    }

    public async Task<byte[]> PrintSickLeaveAsync(Guid examinationId)
    {
        return Array.Empty<byte>();
    }

    public async Task<bool> LockExaminationAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return false;

        // TODO: Add lock flag
        return true;
    }

    public async Task<bool> UnlockExaminationAsync(Guid examinationId, string reason)
    {
        return true;
    }

    public async Task<ExaminationValidationResult> ValidateExaminationForCompletionAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null)
            return new ExaminationValidationResult { IsValid = false, Errors = new List<string> { "Examination not found" } };

        var errors = new List<string>();
        var warnings = new List<string>();

        if (string.IsNullOrEmpty(examination.MainIcdCode))
            errors.Add("Chua co chan doan chinh");

        if (!examination.ConclusionType.HasValue)
            errors.Add("Chua co ket luan");

        return new ExaminationValidationResult
        {
            IsValid = errors.Count == 0,
            Errors = errors,
            Warnings = warnings
        };
    }

    public async Task<bool> CancelExaminationAsync(Guid examinationId, string reason)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return false;

        examination.Status = 5; // Cancelled
        examination.ConclusionNote = reason;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<Application.DTOs.ExaminationDto> RevertCompletionAsync(Guid examinationId, string reason)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        examination.Status = 1; // Back to in progress
        examination.EndTime = null;
        examination.ConclusionType = null;

        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    #endregion

    #region 2.9 Management and Reports

    public async Task<PagedResultDto<Application.DTOs.ExaminationDto>> SearchExaminationsAsync(Application.DTOs.ExaminationSearchDto dto)
    {
        var query = _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Include(e => e.Room)
            .AsQueryable();

        if (!string.IsNullOrEmpty(dto.Keyword))
        {
            query = query.Where(e =>
                e.MedicalRecord.Patient.PatientCode.Contains(dto.Keyword) ||
                e.MedicalRecord.Patient.FullName.Contains(dto.Keyword) ||
                e.MedicalRecord.MedicalRecordCode.Contains(dto.Keyword));
        }

        if (dto.FromDate.HasValue)
            query = query.Where(e => e.MedicalRecord.AdmissionDate >= dto.FromDate.Value);

        if (dto.ToDate.HasValue)
            query = query.Where(e => e.MedicalRecord.AdmissionDate <= dto.ToDate.Value);

        if (dto.DepartmentId.HasValue)
            query = query.Where(e => e.DepartmentId == dto.DepartmentId.Value);

        if (dto.DoctorId.HasValue)
            query = query.Where(e => e.DoctorId == dto.DoctorId.Value);

        var total = await query.CountAsync();
        var page = dto.PageIndex ?? 1;
        var pageSize = dto.PageSize ?? 20;

        var items = await query
            .OrderByDescending(e => e.MedicalRecord.AdmissionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResultDto<Application.DTOs.ExaminationDto>
        {
            Items = items.Select(MapToExaminationDto).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ExaminationStatisticsDto> GetExaminationStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? roomId = null)
    {
        var query = _context.Examinations
            .Include(e => e.MedicalRecord)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate && e.MedicalRecord.AdmissionDate <= toDate);

        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        if (roomId.HasValue)
            query = query.Where(e => e.RoomId == roomId.Value);

        var examinations = await query.ToListAsync();

        return new ExaminationStatisticsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExaminations = examinations.Count,
            InsuranceExaminations = examinations.Count(e => e.MedicalRecord.PatientType == 1),
            FeeExaminations = examinations.Count(e => e.MedicalRecord.PatientType == 2),
            PendingCount = examinations.Count(e => e.Status == 0),
            InProgressCount = examinations.Count(e => e.Status == 1),
            WaitingResultCount = examinations.Count(e => e.Status == 2 || e.Status == 3),
            CompletedCount = examinations.Count(e => e.Status == 4)
        };
    }

    public async Task<List<ExaminationRegisterDto>> GetExaminationRegisterAsync(DateTime fromDate, DateTime toDate, Guid? roomId = null)
    {
        var query = _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Include(e => e.Doctor)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate && e.MedicalRecord.AdmissionDate <= toDate);

        if (roomId.HasValue)
            query = query.Where(e => e.RoomId == roomId.Value);

        var examinations = await query.OrderBy(e => e.MedicalRecord.AdmissionDate).ToListAsync();

        return examinations.Select((e, i) => new ExaminationRegisterDto
        {
            RowNumber = i + 1,
            ExaminationDate = e.MedicalRecord.AdmissionDate,
            PatientCode = e.MedicalRecord.Patient.PatientCode,
            PatientName = e.MedicalRecord.Patient.FullName,
            Age = CalculateAge(e.MedicalRecord.Patient.DateOfBirth, e.MedicalRecord.Patient.YearOfBirth),
            Gender = e.MedicalRecord.Patient.Gender == 1 ? "Nam" : e.MedicalRecord.Patient.Gender == 2 ? "Nữ" : "Khác",
            Address = e.MedicalRecord.Patient.Address,
            InsuranceNumber = e.MedicalRecord.InsuranceNumber,
            DiagnosisCode = e.MainIcdCode,
            DiagnosisName = e.MainDiagnosis,
            DoctorName = e.Doctor?.FullName
        }).ToList();
    }

    public async Task<byte[]> ExportExaminationRegisterToExcelAsync(DateTime fromDate, DateTime toDate, Guid? roomId = null)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> ExportExaminationStatisticsAsync(DateTime fromDate, DateTime toDate, string format = "excel")
    {
        return Array.Empty<byte>();
    }

    public async Task<List<DoctorExaminationStatDto>> GetDoctorStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var query = _context.Examinations
            .Include(e => e.MedicalRecord)
            .Include(e => e.Doctor)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate && e.MedicalRecord.AdmissionDate <= toDate && e.DoctorId.HasValue);

        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        var examinations = await query.ToListAsync();

        return examinations
            .GroupBy(e => e.DoctorId)
            .Select(g => new DoctorExaminationStatDto
            {
                DoctorId = g.Key ?? Guid.Empty,
                DoctorCode = g.First().Doctor?.UserCode ?? "",
                DoctorName = g.First().Doctor?.FullName ?? "",
                TotalExaminations = g.Count(),
                InsuranceExaminations = g.Count(e => e.MedicalRecord.PatientType == 1),
                FeeExaminations = g.Count(e => e.MedicalRecord.PatientType == 2),
                ServiceExaminations = g.Count(e => e.MedicalRecord.PatientType == 3),
                CompletedCount = g.Count(e => e.Status == 4),
                PendingCount = g.Count(e => e.Status < 4)
            })
            .OrderByDescending(d => d.TotalExaminations)
            .ToList();
    }

    public async Task<Dictionary<string, int>> GetDiagnosisStatisticsAsync(DateTime fromDate, DateTime toDate)
    {
        var examinations = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate &&
                       e.MedicalRecord.AdmissionDate <= toDate &&
                       !string.IsNullOrEmpty(e.MainIcdCode))
            .ToListAsync();

        return examinations
            .GroupBy(e => $"{e.MainIcdCode} - {e.MainDiagnosis}")
            .OrderByDescending(g => g.Count())
            .Take(50)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    public async Task<List<CommunicableDiseaseReportDto>> GetCommunicableDiseaseReportAsync(DateTime fromDate, DateTime toDate)
    {
        // Get examinations with ICD codes starting with A or B (infectious diseases)
        var examinations = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate &&
                       e.MedicalRecord.AdmissionDate <= toDate &&
                       !string.IsNullOrEmpty(e.MainIcdCode) &&
                       (e.MainIcdCode.StartsWith("A") || e.MainIcdCode.StartsWith("B")))
            .ToListAsync();

        return examinations.Select(e => new CommunicableDiseaseReportDto
        {
            ExaminationId = e.Id,
            PatientCode = e.MedicalRecord.Patient.PatientCode,
            PatientName = e.MedicalRecord.Patient.FullName,
            Age = CalculateAge(e.MedicalRecord.Patient.DateOfBirth, e.MedicalRecord.Patient.YearOfBirth),
            Gender = e.MedicalRecord.Patient.Gender == 1 ? "Nam" : e.MedicalRecord.Patient.Gender == 2 ? "Nữ" : "Khác",
            Address = e.MedicalRecord.Patient.Address,
            IcdCode = e.MainIcdCode ?? "",
            DiseaseName = e.MainDiagnosis ?? "",
            DiagnosisDate = e.MedicalRecord.AdmissionDate,
            Notes = e.ConclusionNote
        }).ToList();
    }

    public async Task<byte[]> PrintExaminationFormAsync(Guid examinationId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintOutpatientMedicalRecordAsync(Guid examinationId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintAppointmentSlipAsync(Guid appointmentId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintAdmissionFormAsync(Guid examinationId)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> PrintTransferFormAsync(Guid examinationId)
    {
        return Array.Empty<byte>();
    }

    #endregion

    #region 2.10 Additional Functions

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
            Gender = patient.Gender,
            DateOfBirth = patient.DateOfBirth,
            Age = CalculateAge(patient.DateOfBirth, patient.YearOfBirth),
            PhoneNumber = patient.PhoneNumber,
            Address = patient.Address,
            Occupation = patient.Occupation,
            PhotoUrl = patient.PhotoPath
        };
    }

    public async Task<List<RoomDto>> GetActiveExaminationRoomsAsync(Guid? departmentId = null)
    {
        var query = _context.Rooms
            .Include(r => r.Department)
            .Where(r => r.IsActive && r.RoomType == 1); // Examination rooms

        if (departmentId.HasValue)
            query = query.Where(r => r.DepartmentId == departmentId.Value);

        var rooms = await query.ToListAsync();

        return rooms.Select(r => new RoomDto
        {
            Id = r.Id,
            Code = r.RoomCode,
            Name = r.RoomName,
            DepartmentId = r.DepartmentId,
            DepartmentName = r.Department.DepartmentName,
            RoomType = r.RoomType,
            IsActive = r.IsActive
        }).ToList();
    }

    public async Task<List<DoctorDto>> GetOnDutyDoctorsAsync(Guid? departmentId = null)
    {
        var query = _context.Users
            .Include(u => u.Department)
            .Where(u => u.IsActive && u.UserType == 2); // Doctors

        if (departmentId.HasValue)
            query = query.Where(u => u.DepartmentId == departmentId.Value);

        var doctors = await query.ToListAsync();

        return doctors.Select(d => new DoctorDto
        {
            Id = d.Id,
            Code = d.UserCode,
            Name = d.FullName,
            Title = d.Title,
            Specialty = d.Specialty,
            DepartmentId = d.DepartmentId,
            DepartmentName = d.Department?.DepartmentName,
            IsOnDuty = true
        }).ToList();
    }

    public async Task<RoomExaminationConfigDto> GetRoomExaminationConfigAsync(Guid roomId)
    {
        var room = await _roomRepo.GetByIdAsync(roomId);

        return new RoomExaminationConfigDto
        {
            RoomId = roomId,
            MaxPatientsPerDay = room?.MaxPatients ?? 50,
            AverageExaminationMinutes = 15,
            AutoCallNext = true,
            RequireVitalSigns = true,
            RequireDiagnosis = true
        };
    }

    public async Task<RoomExaminationConfigDto> UpdateRoomExaminationConfigAsync(Guid roomId, RoomExaminationConfigDto config)
    {
        config.RoomId = roomId;
        return config;
    }

    public async Task<bool> SignExaminationAsync(Guid examinationId, string signature)
    {
        return true;
    }

    public async Task<SignatureVerificationResult> VerifyExaminationSignatureAsync(Guid examinationId)
    {
        return new SignatureVerificationResult { IsValid = false };
    }

    public async Task<bool> SendResultNotificationAsync(Guid examinationId, string channel)
    {
        return true;
    }

    public async Task<List<ExaminationActivityLogDto>> GetExaminationLogsAsync(Guid examinationId)
    {
        return await _context.ExaminationActivityLogs
            .Include(l => l.User)
            .Where(l => l.ExaminationId == examinationId)
            .OrderByDescending(l => l.ActionTime)
            .Select(l => new ExaminationActivityLogDto
            {
                Id = l.Id,
                ExaminationId = l.ExaminationId,
                ActionType = l.ActionType,
                ActionDescription = l.ActionDescription,
                OldValue = l.OldValue,
                NewValue = l.NewValue,
                ActionTime = l.ActionTime,
                UserId = l.UserId,
                UserName = l.User != null ? l.User.FullName : null,
                IpAddress = l.IpAddress
            })
            .ToListAsync();
    }

    #endregion

    #region Private Helper Methods

    private int CalculateAge(DateTime? dateOfBirth, int? yearOfBirth)
    {
        if (dateOfBirth.HasValue)
            return DateTime.Today.Year - dateOfBirth.Value.Year;
        if (yearOfBirth.HasValue)
            return DateTime.Today.Year - yearOfBirth.Value;
        return 0;
    }

    private string ClassifyBMI(decimal? bmi)
    {
        if (!bmi.HasValue) return "";
        if (bmi < 18.5m) return "Gay";
        if (bmi < 25) return "Binh thuong";
        if (bmi < 30) return "Thua can";
        if (bmi < 35) return "Beo phi do 1";
        if (bmi < 40) return "Beo phi do 2";
        return "Beo phi do 3";
    }

    private VitalSignsFullDto? MapToVitalSignsFullDto(Examination examination)
    {
        if (examination.Temperature == null && examination.Pulse == null) return null;

        return new VitalSignsFullDto
        {
            Weight = examination.Weight,
            Height = examination.Height,
            BMI = examination.BMI,
            BMIClassification = ClassifyBMI(examination.BMI),
            SystolicBP = examination.BloodPressureSystolic,
            DiastolicBP = examination.BloodPressureDiastolic,
            Pulse = examination.Pulse,
            Temperature = examination.Temperature,
            RespiratoryRate = examination.RespiratoryRate,
            SpO2 = (int?)examination.SpO2,
            MeasuredAt = examination.StartTime ?? DateTime.Now
        };
    }

    private RoomPatientListDto MapToRoomPatientListDto(Examination examination)
    {
        var patient = examination.MedicalRecord?.Patient;

        var gender = patient?.Gender ?? 0;
        var patientType = examination.MedicalRecord?.PatientType ?? 0;

        return new RoomPatientListDto
        {
            ExaminationId = examination.Id,
            PatientId = patient?.Id ?? Guid.Empty,
            PatientCode = patient?.PatientCode ?? "",
            PatientName = patient?.FullName ?? "",
            Gender = gender,
            GenderName = gender switch
            {
                1 => "Nam",
                2 => "Nữ",
                _ => "Không xác định"
            },
            Age = CalculateAge(patient?.DateOfBirth, patient?.YearOfBirth),
            PatientType = patientType,
            PatientTypeName = patientType switch
            {
                0 => "Viện phí",
                1 => "BHYT",
                2 => "Dịch vụ",
                3 => "Miễn phí",
                _ => "Khác"
            },
            InsuranceNumber = examination.MedicalRecord?.InsuranceNumber,
            IsInsuranceValid = true,
            QueueNumber = examination.QueueNumber,
            Status = examination.Status,
            StatusName = examination.Status switch
            {
                0 => "Chờ khám",
                1 => "Đang khám",
                2 => "Chờ CLS",
                3 => "Chờ kết luận",
                4 => "Hoàn thành",
                _ => ""
            },
            PreliminaryDiagnosis = examination.InitialDiagnosis
        };
    }

    private Application.DTOs.ExaminationDto MapToExaminationDto(Examination examination)
    {
        var patient = examination.MedicalRecord?.Patient;

        return new Application.DTOs.ExaminationDto
        {
            Id = examination.Id,
            MedicalRecordCode = examination.MedicalRecord?.MedicalRecordCode ?? "",
            PatientId = patient?.Id ?? Guid.Empty,
            PatientCode = patient?.PatientCode ?? "",
            PatientName = patient?.FullName ?? "",
            Gender = patient?.Gender == 1 ? "Nam" : "Nữ",
            DateOfBirth = patient?.DateOfBirth,
            Age = CalculateAge(patient?.DateOfBirth, patient?.YearOfBirth),
            PhoneNumber = patient?.PhoneNumber ?? "",
            Address = patient?.Address ?? "",
            ExaminationDate = examination.MedicalRecord?.AdmissionDate ?? DateTime.Now,
            DepartmentId = examination.DepartmentId,
            RoomId = examination.RoomId,
            RoomName = examination.Room?.RoomName ?? "",
            DoctorId = examination.DoctorId ?? Guid.Empty,
            ChiefComplaint = examination.ChiefComplaint ?? "",
            Diagnosis = examination.MainDiagnosis ?? "",
            IcdCode = examination.MainIcdCode ?? "",
            Status = examination.Status switch
            {
                0 => "Waiting",
                1 => "InProgress",
                2 => "WaitingLab",
                3 => "WaitingConclusion",
                4 => "Completed",
                _ => "Unknown"
            },
            QueueNumber = examination.QueueNumber,
            CreatedDate = examination.CreatedAt,
            PatientType = examination.MedicalRecord?.PatientType switch
            {
                1 => "BHYT",
                2 => "Vien phi",
                3 => "Dich vu",
                _ => ""
            },
            InsuranceNumber = examination.MedicalRecord?.InsuranceNumber ?? ""
        };
    }

    private PrescriptionFullDto MapToPrescriptionFullDto(Prescription prescription)
    {
        return new PrescriptionFullDto
        {
            Id = prescription.Id,
            ExaminationId = prescription.ExaminationId ?? Guid.Empty,
            PrescribedById = prescription.DoctorId,
            PrescribedByName = prescription.Doctor?.FullName,
            PrescriptionDate = prescription.PrescriptionDate,
            PrescriptionType = prescription.PrescriptionType,
            DiagnosisCode = prescription.DiagnosisCode,
            DiagnosisName = prescription.DiagnosisName,
            TotalDays = prescription.TotalDays,
            TotalAmount = prescription.TotalAmount,
            InsuranceAmount = prescription.InsuranceAmount,
            PatientAmount = prescription.PatientAmount,
            Instructions = prescription.Instructions,
            Status = prescription.Status,
            Items = prescription.Details?.Select(i => new PrescriptionItemFullDto
            {
                Id = i.Id,
                MedicineId = i.MedicineId,
                MedicineCode = i.Medicine?.MedicineCode ?? "",
                MedicineName = i.Medicine?.MedicineName ?? "",
                ActiveIngredient = i.Medicine?.ActiveIngredient,
                Quantity = i.Quantity,
                Unit = i.Unit,
                Days = i.Days,
                Dosage = i.Dosage,
                Route = i.Route,
                Frequency = i.Frequency,
                UsageInstructions = i.UsageInstructions,
                UnitPrice = i.UnitPrice,
                TotalPrice = i.TotalPrice
            }).ToList() ?? new List<PrescriptionItemFullDto>()
        };
    }

    #endregion

    #region Private Helper Methods

    private static string GetLabStatusName(int status) => status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đang lấy mẫu",
        2 => "Đang xét nghiệm",
        3 => "Có kết quả",
        _ => ""
    };

    private static string GetImagingStatusName(int status) => status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đang chụp",
        2 => "Chờ đọc kết quả",
        3 => "Có kết quả",
        _ => ""
    };

    #endregion
}
