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

        if (examination == null) throw new KeyNotFoundException("Examination not found");

        // AUTHZ-3 (#369) — guard: kill-switch OFF by default (Auth:TreatmentRelationshipEnabled=false).
        if (_currentUser.UserGuid.HasValue)
            await _treatRel.EnsureCanAccessPatientAsync(
                _currentUser.UserGuid.Value, _currentUser.Roles, examination.MedicalRecord.PatientId);

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

        if (examination.Status == HIS.Core.Constants.ExaminationStatus.InProgress)
            return MapToExaminationDto(examination); // idempotent: double-click/retry không ghi đè BS, giờ bắt đầu
        if (examination.Status != HIS.Core.Constants.ExaminationStatus.Waiting)
            throw new InvalidOperationException(
                $"Không thể bắt đầu khám khi phiên đang ở trạng thái {HIS.Core.Constants.ExaminationStatus.GetName(examination.Status)}.");

        // B1 (audit bảo mật 2026-06-06, siết edge 2026-06-09): CHẶN server-side bác sĩ CCHN KHÔNG hợp lệ —
        // hết hạn/đình chỉ/thu hồi HOẶC **chưa có CCHN** trong hệ thống (khớp NangCap18, không chỉ cảnh báo mềm).
        // (Trước chỉ chặn khi có license nhưng invalid; nay chặn cả no-CCHN. Seed CCHN cho nhân sự: mig 86.)
        var cert = await CheckDoctorCertificationAsync(doctorId);
        if (!cert.IsValid)
            throw new InvalidOperationException(
                $"Không thể bắt đầu khám: {cert.Message ?? "Chứng chỉ hành nghề không hợp lệ"}");

        examination.Status = HIS.Core.Constants.ExaminationStatus.InProgress;
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
        if (examination == null) throw new KeyNotFoundException("Examination not found");

        ValidateVitalSigns(dto);

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

        // Entity is already tracked: no repo.UpdateAsync (it marks ALL columns modified, so parallel OPD saves overwrote each other).
        await _unitOfWork.SaveChangesAsync();

        dto.BMI = examination.BMI;
        dto.BMIClassification = ClassifyBMI(examination.BMI);
        // Unmeasured BP used to be classified as 0/0 → "Ha huyet ap" (hypotension).
        dto.BPClassification = dto.SystolicBP.HasValue && dto.DiastolicBP.HasValue
            ? await ClassifyBloodPressureAsync(dto.SystolicBP.Value, dto.DiastolicBP.Value)
            : null;
        dto.MeasuredAt = DateTime.Now;

        return dto;
    }

    /// <summary>
    /// Reject physically impossible vital signs (negative values, SpO2 &gt; 100 %, 80 °C...).
    /// These feed CDS/early-warning scores and the printed record, so garbage must not be stored.
    /// Bounds are deliberately wide (not clinical alert thresholds); 0 is tolerated as "not measured"
    /// because legacy rows and cleared inputs carry it.
    /// </summary>
    private static void ValidateVitalSigns(VitalSignsFullDto dto)
    {
        static void CheckRange(decimal? v, decimal max, string name)
        {
            if (v.HasValue && (v.Value < 0 || v.Value > max))
                throw new ArgumentException($"{name} không hợp lệ ({v.Value})", name);
        }

        CheckRange(dto.Pulse, 300, "Mạch");
        CheckRange(dto.SystolicBP, 300, "Huyết áp tâm thu");
        CheckRange(dto.DiastolicBP, 250, "Huyết áp tâm trương");
        CheckRange(dto.RespiratoryRate, 150, "Nhịp thở");
        CheckRange(dto.SpO2, 100, "SpO2");
        CheckRange(dto.Weight, 500, "Cân nặng");
        CheckRange(dto.Height, 300, "Chiều cao");
        if (dto.Temperature.HasValue && dto.Temperature.Value != 0
            && (dto.Temperature.Value < 25 || dto.Temperature.Value > 45))
            throw new ArgumentException($"Nhiệt độ không hợp lệ ({dto.Temperature.Value} °C)", "Nhiệt độ");
    }

    public async Task<VitalSignsFullDto?> GetVitalSignsAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return null;

        return MapToVitalSignsFullDto(examination);
    }

    public Task<BmiCalculationResult> CalculateBmiAsync(decimal weight, decimal height)
    {
        // Chiều cao 0 (vd query thiếu tham số → decimal mặc định 0) làm phép chia ném
        // DivideByZeroException → 500 "hệ thống gặp sự cố". Chặn tại service để MỌI caller
        // nhận lỗi nghiệp vụ rõ ràng, và để chỉ số lâm sàng không bao giờ tính từ số vô lý.
        if (weight <= 0)
            throw new ArgumentException("Cân nặng phải lớn hơn 0", nameof(weight));
        if (height <= 0)
            throw new ArgumentException("Chiều cao phải lớn hơn 0", nameof(height));

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
        // Highest category wins (either value qualifies). The old `||` chain classified 200/85 or 135/100 as
        // "độ 1", 250/100 as "độ 2", and any low diastolic (e.g. 200/55) as hypotension.
        string classification;
        if (systolic >= 180 || diastolic >= 120)
            classification = "Tang huyet ap khung hoang";
        else if (systolic >= 140 || diastolic >= 90)
            classification = "Tang huyet ap do 2";
        else if (systolic >= 130 || diastolic >= 80)
            classification = "Tang huyet ap do 1";
        else if (systolic < 90 || diastolic < 60)
            classification = "Ha huyet ap";
        else if (systolic >= 120)
            classification = "Tang nhe";
        else
            classification = "Binh thuong";

        return Task.FromResult(classification);
    }

    public async Task<MedicalInterviewDto> UpdateMedicalInterviewAsync(Guid examinationId, MedicalInterviewDto dto)
    {
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, examinationId); // TT46 — same as vital signs
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new KeyNotFoundException("Examination not found");

        // The OPD screen never sends ChiefComplaint (it is captured at reception); treating the
        // missing field as "clear it" wiped the reception reason on every 30s auto-save.
        if (dto.ChiefComplaint != null)
            examination.ChiefComplaint = dto.ChiefComplaint;
        // Blank must not erase recorded text (failed form load posts ''), same rule as the history fields.
        if (!string.IsNullOrWhiteSpace(dto.HistoryOfPresentIllness) || string.IsNullOrWhiteSpace(examination.PresentIllness))
            examination.PresentIllness = dto.HistoryOfPresentIllness;

        // Past/family/allergy history were echoed back as "saved" but never persisted, so the
        // doctor's allergy note vanished on reload. They are patient-level facts and the printed
        // medical record (Reports) + prescription context already read them from Patient.
        // MedicationHistory has no column yet.
        // PATIENT SAFETY: blank = "not sent". The OPD screen always posts every field, '' included, so a
        // form whose load failed (or a second room editing the same patient) would otherwise wipe the
        // patient-level allergy note. Clearing these shared facts is not possible from this endpoint.
        if (!string.IsNullOrWhiteSpace(dto.PastMedicalHistory) || !string.IsNullOrWhiteSpace(dto.FamilyHistory)
            || !string.IsNullOrWhiteSpace(dto.AllergyHistory))
        {
            var medicalRecordId = examination.MedicalRecordId;
            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => _context.MedicalRecords
                    .Any(m => m.Id == medicalRecordId && m.PatientId == p.Id));
            if (patient != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.PastMedicalHistory)) patient.MedicalHistory = dto.PastMedicalHistory;
                if (!string.IsNullOrWhiteSpace(dto.FamilyHistory)) patient.FamilyHistory = dto.FamilyHistory;
                if (!string.IsNullOrWhiteSpace(dto.AllergyHistory)) patient.AllergyHistory = dto.AllergyHistory;
            }
        }

        // Entity is already tracked: no repo.UpdateAsync (it marks ALL columns modified, so parallel OPD saves overwrote each other).
        await _unitOfWork.SaveChangesAsync();

        return dto;
    }

    public async Task<MedicalInterviewDto?> GetMedicalInterviewAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return null;

        var medicalRecordId = examination.MedicalRecordId;
        var patient = await _context.Patients.AsNoTracking()
            .Where(p => _context.MedicalRecords.Any(m => m.Id == medicalRecordId && m.PatientId == p.Id))
            .Select(p => new { p.MedicalHistory, p.FamilyHistory, p.AllergyHistory })
            .FirstOrDefaultAsync();

        return new MedicalInterviewDto
        {
            ChiefComplaint = examination.ChiefComplaint,
            HistoryOfPresentIllness = examination.PresentIllness,
            PastMedicalHistory = patient?.MedicalHistory,
            FamilyHistory = patient?.FamilyHistory,
            AllergyHistory = patient?.AllergyHistory,
        };
    }

    public async Task<PhysicalExaminationDto> UpdatePhysicalExaminationAsync(Guid examinationId, PhysicalExaminationDto dto)
    {
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, examinationId); // TT46 — same as vital signs
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new KeyNotFoundException("Examination not found");

        // The OPD screen sends only GeneralAppearance: a missing OtherFindings wiped "Khám bộ phận" on
        // every save, and a failed form load posted '' over recorded text. Blank never erases content.
        if (!string.IsNullOrWhiteSpace(dto.GeneralAppearance) || string.IsNullOrWhiteSpace(examination.PhysicalExamination))
            examination.PhysicalExamination = dto.GeneralAppearance;
        if (!string.IsNullOrWhiteSpace(dto.OtherFindings))
            examination.SystemsReview = dto.OtherFindings;

        // Entity is already tracked: no repo.UpdateAsync (it marks ALL columns modified, so parallel OPD saves overwrote each other).
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

    /// <summary>
    /// QA-R4: a blank template name was saved as an unnamed catalog row, and a zero-GUID department
    /// surfaced as an FK violation (HTTP 500). Returns the department id to store (null when not set).
    /// </summary>
    private async Task<Guid?> ValidateExaminationTemplateAsync(ExaminationTemplateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.TemplateName))
            throw new ArgumentException("Chưa nhập tên mẫu thăm khám", nameof(dto.TemplateName));
        if (!dto.DepartmentId.HasValue || dto.DepartmentId.Value == Guid.Empty) return null;
        if (!await _context.Departments.AnyAsync(d => d.Id == dto.DepartmentId.Value && !d.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy khoa");
        return dto.DepartmentId;
    }

    public async Task<ExaminationTemplateDto> CreateExaminationTemplateAsync(ExaminationTemplateDto dto)
    {
        var departmentId = await ValidateExaminationTemplateAsync(dto);
        var template = new ExaminationTemplate
        {
            Id = Guid.NewGuid(),
            TemplateName = dto.TemplateName.Trim(),
            TemplateCode = dto.TemplateCode,
            TemplateType = dto.TemplateType,
            DepartmentId = departmentId,
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
        if (template == null) throw new KeyNotFoundException("Template not found");
        var departmentId = await ValidateExaminationTemplateAsync(dto);

        template.TemplateName = dto.TemplateName.Trim();
        template.TemplateCode = dto.TemplateCode;
        template.TemplateType = dto.TemplateType;
        template.DepartmentId = departmentId;
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
        if (template == null) throw new KeyNotFoundException("Template not found");

        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new KeyNotFoundException("Examination not found");

        examination.ChiefComplaint = template.ChiefComplaintTemplate;
        examination.PhysicalExamination = template.PhysicalExamTemplate;
        examination.SystemsReview = template.SystemsReviewTemplate;

        // Entity is already tracked: no repo.UpdateAsync (it marks ALL columns modified, so parallel OPD saves overwrote each other).
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
        if (examination == null) throw new KeyNotFoundException("Examination not found");

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
                Notes = a.Notes,
                // PATIENT SAFETY: IsActive was never projected, so every allergy came back as
                // isActive=false and the OPD screen (filters isActive !== false) hid ALL allergies.
                IsActive = a.IsActive
            })
            .ToListAsync();
    }

    public async Task<AllergyDto> AddPatientAllergyAsync(Guid patientId, AllergyDto dto)
    {
        if (!await _context.Patients.AnyAsync(p => p.Id == patientId))
            throw new KeyNotFoundException("Patient not found");

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
        dto.IsActive = true;
        return dto;
    }

    public async Task<AllergyDto> UpdatePatientAllergyAsync(Guid id, AllergyDto dto)
    {
        var allergy = await _context.Allergies.FindAsync(id);
        if (allergy == null) throw new KeyNotFoundException("Allergy not found");

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
        // No FK on Contraindications.PatientId: an unknown id was stored as an orphan row with HTTP 200.
        if (!await _context.Patients.AnyAsync(p => p.Id == patientId))
            throw new KeyNotFoundException("Patient not found");

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
        if (contraindication == null) throw new KeyNotFoundException("Contraindication not found");

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
