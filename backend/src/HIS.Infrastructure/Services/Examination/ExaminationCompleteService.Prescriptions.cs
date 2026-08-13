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
            .ToBoundedListAsync("ExaminationCompleteService.GetPrescriptionsAsync");

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

    public async Task<PrescriptionFullDto> CreatePrescriptionAsync(Application.DTOs.Examination.CreateExaminationPrescriptionDto dto, Guid prescribingUserId = default)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId);
        if (examination == null) throw new Exception("Examination not found");
        if (examination.MedicalRecord?.EmrFinalizedAt != null)
            throw new InvalidOperationException(EmrLockGuard.LockedMessage); // TT46

        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Waiting)
            throw new InvalidOperationException("Bệnh nhân chưa bắt đầu khám. Vui lòng mở phòng khám trước khi kê đơn.");
        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Cancelled)
            throw new InvalidOperationException("Phiên khám đã hủy, không thể kê đơn.");

        // Bác sĩ kê đơn = BS đã gán cho lượt khám, nếu chưa gán thì dùng user đang đăng nhập.
        // DoctorId là FK bắt buộc tới Users → KHÔNG được để Guid.Empty (gây FK conflict → 500).
        var doctorId = examination.DoctorId;
        if (doctorId == null || doctorId == Guid.Empty)
            throw new Exception("Chưa xác định bác sĩ kê đơn. Vui lòng phân công bác sĩ cho lượt khám trước khi kê đơn.");

        var medicines = await LoadPrescriptionMedicinesAsync(dto);

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
            PaymentCategory = dto.PaymentCategory > 0 ? dto.PaymentCategory : examination.MedicalRecord.PatientType,
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
            var medicine = medicines[item.MedicineId];

            prescription.Details.Add(new PrescriptionDetail
            {
                Id = Guid.NewGuid(),
                PrescriptionId = prescription.Id,
                MedicineId = item.MedicineId,
                Medicine = medicine,
                WarehouseId = dto.WarehouseId,
                PatientType = item.PaymentType,
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

        // #185/#186: enforce dị-ứng + tương-tác thuốc TRƯỚC khi lưu (trước đây chỉ advisory, không chặn).
        await EnforcePrescriptionSafetyAsync(
            examination.MedicalRecord.PatientId,
            prescription.Details.Select(d => d.MedicineId).ToList(),
            dto.OverrideReason);
        if (!string.IsNullOrWhiteSpace(dto.OverrideReason))
            prescription.Instructions = $"{prescription.Instructions} [BS bỏ qua cảnh báo an toàn: {dto.OverrideReason}]".Trim();

        await _context.Prescriptions.AddAsync(prescription);
        await _unitOfWork.SaveChangesAsync();

        return MapToPrescriptionFullDto(prescription);
    }

    public async Task<PrescriptionFullDto> UpdatePrescriptionAsync(Guid id, Application.DTOs.Examination.CreateExaminationPrescriptionDto dto)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (prescription == null) throw new Exception("Prescription not found");
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, prescription.MedicalRecordId); // TT46
        if (prescription.Status != HIS.Core.Constants.PrescriptionStatus.PendingApproval)
            throw new InvalidOperationException("Chỉ đơn thuốc đang ở trạng thái nháp mới được phép chỉnh sửa.");

        var examination = await _context.Examinations.FirstOrDefaultAsync(e => e.Id == prescription.ExaminationId);
        if (examination == null)
            throw new KeyNotFoundException("Examination not found");
        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Waiting)
            throw new InvalidOperationException("Bệnh nhân chưa bắt đầu khám. Vui lòng mở phòng khám trước khi kê đơn.");
        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Cancelled)
            throw new InvalidOperationException("Phiên khám đã hủy, không thể kê đơn.");

        var medicines = await LoadPrescriptionMedicinesAsync(dto);

        // Remove old items
        _context.PrescriptionDetails.RemoveRange(prescription.Details);

        // Update prescription
        prescription.DiagnosisCode = dto.DiagnosisCode;
        prescription.DiagnosisName = dto.DiagnosisName;
        prescription.PrescriptionType = dto.PrescriptionType;
        prescription.PaymentCategory = dto.PaymentCategory > 0 ? dto.PaymentCategory : prescription.PaymentCategory;
        prescription.WarehouseId = dto.WarehouseId;
        prescription.TotalDays = dto.TotalDays;
        prescription.Instructions = dto.Instructions;

        // Add new items
        var replacementDetails = new List<PrescriptionDetail>();
        foreach (var item in dto.Items)
        {
            var medicine = medicines[item.MedicineId];

            replacementDetails.Add(new PrescriptionDetail
            {
                Id = Guid.NewGuid(),
                PrescriptionId = prescription.Id,
                MedicineId = item.MedicineId,
                Medicine = medicine,
                WarehouseId = dto.WarehouseId,
                PatientType = item.PaymentType,
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

        // The prescription is already tracked. Explicitly mark replacement rows as Added;
        // assigning a new navigation collection alone can make EF treat client-generated IDs as Modified.
        await _context.PrescriptionDetails.AddRangeAsync(replacementDetails);
        prescription.Details = replacementDetails;

        prescription.TotalAmount = prescription.Details.Sum(i => i.TotalPrice);

        // #185/#186: enforce dị-ứng + tương-tác khi CẬP NHẬT đơn
        var updPatientId = await _context.MedicalRecords
            .Where(m => m.Id == prescription.MedicalRecordId)
            .Select(m => m.PatientId)
            .FirstOrDefaultAsync();
        await EnforcePrescriptionSafetyAsync(
            updPatientId,
            prescription.Details.Select(d => d.MedicineId).ToList(),
            dto.OverrideReason);
        if (!string.IsNullOrWhiteSpace(dto.OverrideReason))
            prescription.Instructions = $"{prescription.Instructions} [BS bỏ qua cảnh báo an toàn: {dto.OverrideReason}]".Trim();

        await _unitOfWork.SaveChangesAsync();

        return MapToPrescriptionFullDto(prescription);
    }

    private async Task<Dictionary<Guid, Medicine>> LoadPrescriptionMedicinesAsync(
        Application.DTOs.Examination.CreateExaminationPrescriptionDto dto)
    {
        if (dto.Items.Count == 0)
            throw new InvalidOperationException("Đơn thuốc phải có ít nhất một thuốc.");
        if (dto.Items.Any(i => i.MedicineId == Guid.Empty || i.Quantity <= 0 || i.Days <= 0))
            throw new InvalidOperationException("Mỗi thuốc phải có mã hợp lệ, số lượng và số ngày dùng lớn hơn 0.");

        var medicineIds = dto.Items.Select(i => i.MedicineId).Distinct().ToList();
        var medicines = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id) && !m.IsDeleted)
            .ToDictionaryAsync(m => m.Id);
        var missingId = medicineIds.FirstOrDefault(id => !medicines.ContainsKey(id));
        if (missingId != Guid.Empty)
            throw new KeyNotFoundException($"Không tìm thấy thuốc {missingId}.");
        return medicines;
    }

    public async Task<bool> DeletePrescriptionAsync(Guid id)
    {
        var prescription = await _context.Prescriptions.FindAsync(id);
        if (prescription == null || prescription.Status != 0) return false;
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, prescription.MedicalRecordId); // TT46

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

    /// <summary>
    /// #185/#186: enforce an toàn kê đơn khi LƯU — chặn đơn nếu có cảnh báo NGHIÊM TRỌNG mà BS không nêu lý do bỏ qua.
    /// Tái dùng CheckDrugAllergiesAsync (#185) + CheckDrugInteractionsAsync (#186) đã có (advisory) → nâng thành enforce.
    /// Ngưỡng chặn: dị ứng Severity >= 2 (moderate/severe) · tương tác Severity >= 3 (severe/chống chỉ định).
    /// KB tương tác rỗng → không chặn tới khi seed (migration). Có OverrideReason → cho qua (caller ghi Instructions để audit).
    /// </summary>
    // #185/#186: delegate sang guard dùng chung (single-source outpatient + inpatient) — xem PrescriptionSafetyGuard.
    private Task EnforcePrescriptionSafetyAsync(Guid patientId, List<Guid> medicineIds, string? overrideReason)
        => PrescriptionSafetyGuard.EnsureSafeAsync(_context, patientId, medicineIds, overrideReason);

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

    public async Task<List<PrescriptionWarningDto>> ValidateBhytPrescriptionAsync(Guid examinationId, Application.DTOs.Examination.CreateExaminationPrescriptionDto dto)
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

    public async Task<List<ExaminationPrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid? departmentId = null)
    {
        var query = _context.PrescriptionTemplates
            .Include(t => t.Items)
            .ThenInclude(i => i.Medicine)
            .Where(t => t.IsActive);

        if (departmentId.HasValue)
            query = query.Where(t => t.DepartmentId == departmentId || t.IsPublic);

        return await query
            .OrderBy(t => t.TemplateName)
            .Select(t => new ExaminationPrescriptionTemplateDto
            {
                Id = t.Id,
                TemplateCode = t.TemplateCode,
                TemplateName = t.TemplateName,
                DepartmentId = t.DepartmentId,
                DiagnosisCode = t.DiagnosisCode,
                DiagnosisName = t.DiagnosisName,
                IsPublic = t.IsPublic,
                TemplateItems = t.Items.Select(i => new ExaminationPrescriptionTemplateItemDto
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
            .ToBoundedListAsync("ExaminationCompleteService.GetPrescriptionTemplatesAsync");
    }

    public async Task<ExaminationPrescriptionTemplateDto> CreatePrescriptionTemplateAsync(ExaminationPrescriptionTemplateDto dto)
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

    public async Task<ExaminationPrescriptionTemplateDto> UpdatePrescriptionTemplateAsync(Guid id, ExaminationPrescriptionTemplateDto dto)
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

        var createDto = new Application.DTOs.Examination.CreateExaminationPrescriptionDto
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

    public async Task<ExaminationPrescriptionTemplateDto> SaveAsPrescriptionTemplateAsync(Guid prescriptionId, string templateName)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId);

        if (prescription == null) throw new Exception("Prescription not found");

        var dto = new ExaminationPrescriptionTemplateDto
        {
            TemplateName = templateName,
            DiagnosisCode = prescription.DiagnosisCode,
            DiagnosisName = prescription.DiagnosisName,
            IsPublic = false,
            TemplateItems = prescription.Details.Select(d => new ExaminationPrescriptionTemplateItemDto
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

    #endregion
}
