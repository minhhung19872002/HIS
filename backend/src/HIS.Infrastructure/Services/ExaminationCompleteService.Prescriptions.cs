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

// K4 phien 1 (2026-05-30): tach Section 2.7 Prescriptions (~830 dong) khoi
// ExaminationCompleteService.cs god-file (4570 dong). ZERO runtime change — partial class.
public partial class ExaminationCompleteService
{
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

    public async Task<PrescriptionFullDto> CreatePrescriptionAsync(Application.DTOs.Examination.CreatePrescriptionDto dto, Guid prescribingUserId = default)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId);
        if (examination == null) throw new Exception("Examination not found");

        // Bác sĩ kê đơn = BS đã gán cho lượt khám, nếu chưa gán thì dùng user đang đăng nhập.
        // DoctorId là FK bắt buộc tới Users → KHÔNG được để Guid.Empty (gây FK conflict → 500).
        var doctorId = examination.DoctorId ?? (prescribingUserId != Guid.Empty ? prescribingUserId : (Guid?)null);
        if (doctorId == null || doctorId == Guid.Empty)
            throw new Exception("Chưa xác định bác sĩ kê đơn. Vui lòng phân công bác sĩ cho lượt khám trước khi kê đơn.");

        var prescription = new Prescription
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = examination.MedicalRecordId,
            ExaminationId = dto.ExaminationId, // Set ExaminationId
            DoctorId = doctorId.Value,
            DepartmentId = examination.DepartmentId,
            PrescriptionCode = $"DT{DateTime.Now:yyyyMMddHHmmss}",
            PrescriptionDate = DateTime.Now,
            PrescriptionType = dto.PrescriptionType,
            DiagnosisCode = dto.DiagnosisCode,
            DiagnosisName = dto.DiagnosisName,
            WarehouseId = dto.WarehouseId,
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
                WarehouseId = dto.WarehouseId,
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
        try
        {
            var rx = await _context.Prescriptions
                .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId);
            if (rx == null) return Array.Empty<byte>();

            var patient = rx.MedicalRecord.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">DON THUOC</div>");
            body.AppendLine($@"<div class=""form-number"">So: {Esc(rx.PrescriptionCode)}</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, rx.MedicalRecord.InsuranceNumber,
                rx.MedicalRecord.MedicalRecordCode, rx.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(rx.Diagnosis)} ({Esc(rx.IcdCode)})</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">So ngay:</span><span class=""field-value"">{rx.TotalDays} ngay</span></div>");

            body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Ten thuoc</th><th>Ham luong</th><th>DVT</th><th>SL</th><th>Cach dung</th></tr></thead><tbody>");
            int idx = 0;
            foreach (var detail in rx.Details)
            {
                idx++;
                var dosageText = new StringBuilder();
                if (!string.IsNullOrEmpty(detail.Usage)) dosageText.Append(detail.Usage);
                else
                {
                    if (detail.MorningDose.HasValue) dosageText.Append($"Sang: {detail.MorningDose} ");
                    if (detail.NoonDose.HasValue) dosageText.Append($"Trua: {detail.NoonDose} ");
                    if (detail.EveningDose.HasValue) dosageText.Append($"Chieu: {detail.EveningDose} ");
                    if (detail.NightDose.HasValue) dosageText.Append($"Toi: {detail.NightDose} ");
                    if (!string.IsNullOrEmpty(detail.Frequency)) dosageText.Append($"({detail.Frequency})");
                }
                if (!string.IsNullOrEmpty(detail.Route)) dosageText.Append($" - {detail.Route}");

                body.AppendLine($@"<tr><td class=""text-center"">{idx}</td><td>{Esc(detail.Medicine?.MedicineName)}</td><td>{Esc(detail.Medicine?.Concentration)}</td><td class=""text-center"">{Esc(detail.Unit ?? detail.Medicine?.Unit)}</td><td class=""text-center"">{detail.Quantity:#,##0}</td><td>{Esc(dosageText.ToString())}</td></tr>");
            }
            body.AppendLine("</tbody></table>");

            if (!string.IsNullOrEmpty(rx.Note))
                body.AppendLine($@"<div class=""field"" style=""margin-top:10px""><span class=""field-label"">Loi dan:</span><span class=""field-value"">{Esc(rx.Note)}</span></div>");
            if (rx.MedicalRecord.Patient.DateOfBirth.HasValue)
            {
                var followUp = rx.MedicalRecord.DischargeDate ?? DateTime.Now.AddDays(rx.TotalDays);
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Tai kham:</span><span class=""field-value"">{followUp:dd/MM/yyyy}</span></div>");
            }

            body.AppendLine(GetSignatureBlock(rx.Doctor?.FullName));

            var html = WrapHtmlPage("Don thuoc", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> PrintExternalPrescriptionAsync(Guid prescriptionId)
    {
        try
        {
            var rx = await _context.Prescriptions
                .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId);
            if (rx == null) return Array.Empty<byte>();

            var patient = rx.MedicalRecord.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">DON THUOC (MUA NGOAI)</div>");
            body.AppendLine($@"<div class=""form-number"">So: {Esc(rx.PrescriptionCode)}</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, rx.MedicalRecord.InsuranceNumber,
                rx.MedicalRecord.MedicalRecordCode, rx.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(rx.Diagnosis)} ({Esc(rx.IcdCode)})</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">So ngay:</span><span class=""field-value"">{rx.TotalDays} ngay</span></div>");

            body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Ten thuoc</th><th>Ham luong</th><th>DVT</th><th>SL</th><th>Cach dung</th></tr></thead><tbody>");
            int idx = 0;
            foreach (var detail in rx.Details)
            {
                idx++;
                var dosageText = new StringBuilder();
                if (!string.IsNullOrEmpty(detail.Usage)) dosageText.Append(detail.Usage);
                else
                {
                    if (detail.MorningDose.HasValue) dosageText.Append($"Sang: {detail.MorningDose} ");
                    if (detail.NoonDose.HasValue) dosageText.Append($"Trua: {detail.NoonDose} ");
                    if (detail.EveningDose.HasValue) dosageText.Append($"Chieu: {detail.EveningDose} ");
                    if (detail.NightDose.HasValue) dosageText.Append($"Toi: {detail.NightDose} ");
                    if (!string.IsNullOrEmpty(detail.Frequency)) dosageText.Append($"({detail.Frequency})");
                }
                if (!string.IsNullOrEmpty(detail.Route)) dosageText.Append($" - {detail.Route}");

                body.AppendLine($@"<tr><td class=""text-center"">{idx}</td><td>{Esc(detail.Medicine?.MedicineName)}</td><td>{Esc(detail.Medicine?.Concentration)}</td><td class=""text-center"">{Esc(detail.Unit ?? detail.Medicine?.Unit)}</td><td class=""text-center"">{detail.Quantity:#,##0}</td><td>{Esc(dosageText.ToString())}</td></tr>");
            }
            body.AppendLine("</tbody></table>");

            body.AppendLine(@"<div style=""margin-top:15px;padding:10px;border:1px dashed #999;font-style:italic"">Luu y: Don thuoc nay mua tai nha thuoc ben ngoai. Benh nhan tu chiu trach nhiem ve chat luong thuoc.</div>");

            if (!string.IsNullOrEmpty(rx.Note))
                body.AppendLine($@"<div class=""field"" style=""margin-top:10px""><span class=""field-label"">Loi dan:</span><span class=""field-value"">{Esc(rx.Note)}</span></div>");

            body.AppendLine(GetSignatureBlock(rx.Doctor?.FullName));

            var html = WrapHtmlPage("Don thuoc mua ngoai", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
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

    public async Task<List<ExamWarehouseDto>> GetDispensaryWarehousesAsync()
    {
        var warehouses = await _context.Warehouses
            .Where(w => w.IsActive && w.WarehouseType == 2) // Dispensary type
            .ToListAsync();

        return warehouses.Select(w => new ExamWarehouseDto
        {
            Id = w.Id,
            Code = w.WarehouseCode,
            Name = w.WarehouseName,
            WarehouseType = w.WarehouseType,
            IsActive = w.IsActive
        }).ToList();
    }

    #endregion
}
