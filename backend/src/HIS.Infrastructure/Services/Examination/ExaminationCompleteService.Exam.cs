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

// K4 phien 2 (2026-05-30): tach Section 2.3 Examination Functions (~862 dong) khoi
// ExaminationCompleteService.cs. ZERO runtime change — partial class.
public partial class ExaminationCompleteService
{
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

        // Sweep 2026-06-12: KeyNotFoundException → DomainExceptionFilter trả 404 (trước Exception thường → 500)
        if (examination == null) throw new KeyNotFoundException("Examination not found");

        // B1 (audit bảo mật 2026-06-06, siết edge 2026-06-09): CHẶN server-side bác sĩ CCHN KHÔNG hợp lệ —
        // hết hạn/đình chỉ/thu hồi HOẶC **chưa có CCHN** trong hệ thống (khớp NangCap18, không chỉ cảnh báo mềm).
        // (Trước chỉ chặn khi có license nhưng invalid; nay chặn cả no-CCHN. Seed CCHN cho nhân sự: mig 86.)
        var cert = await CheckDoctorCertificationAsync(doctorId);
        if (!cert.IsValid)
            throw new InvalidOperationException(
                $"Không thể bắt đầu khám: {cert.Message ?? "Chứng chỉ hành nghề không hợp lệ"}");

        examination.Status = 1; // In progress
        examination.StartTime = DateTime.Now;
        examination.DoctorId = doctorId;

        examination.MedicalRecord.Status = 1; // In progress

        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    public async Task<VitalSignsFullDto> UpdateVitalSignsAsync(Guid examinationId, VitalSignsFullDto dto)
    {
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, examinationId); // TT46
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

    #endregion
}
