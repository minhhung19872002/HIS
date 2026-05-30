using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K6 phien 6 (2026-05-30): tach NangCap18 Diagnosis Interruption + Medicine Rules + Service Compatibility (~187 dong) khoi InpatientCompleteService. File goc giu Helper Methods + ctor.
public partial class InpatientCompleteService {
    #region NangCap18 - Diagnosis Interruption, Medicine Rules, Service Compatibility

    public async Task<HIS.Application.DTOs.NangCap18.DiagnosisInterruptionDto> CreateDiagnosisInterruptionAsync(
        HIS.Application.DTOs.NangCap18.CreateDiagnosisInterruptionDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>().FindAsync(dto.AdmissionId);
        if (admission == null || admission.IsDeleted)
            throw new InvalidOperationException("Không tìm thấy đợt nhập viện");

        var entity = new DiagnosisInterruption
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            InterruptDate = dto.InterruptDate,
            Reason = dto.Reason,
            Notes = dto.Notes,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.Set<DiagnosisInterruption>().Add(entity);
        await _context.SaveChangesAsync();

        return new HIS.Application.DTOs.NangCap18.DiagnosisInterruptionDto
        {
            Id = entity.Id,
            AdmissionId = entity.AdmissionId,
            InterruptDate = entity.InterruptDate,
            ResumeDate = entity.ResumeDate,
            Reason = entity.Reason,
            Notes = entity.Notes,
            CreatedAt = entity.CreatedAt,
            CreatedBy = entity.CreatedBy
        };
    }

    public async Task<List<HIS.Application.DTOs.NangCap18.DiagnosisInterruptionDto>> GetDiagnosisInterruptionsAsync(Guid admissionId)
    {
        return await _context.Set<DiagnosisInterruption>()
            .Where(d => d.AdmissionId == admissionId && !d.IsDeleted)
            .OrderByDescending(d => d.InterruptDate)
            .Select(d => new HIS.Application.DTOs.NangCap18.DiagnosisInterruptionDto
            {
                Id = d.Id,
                AdmissionId = d.AdmissionId,
                InterruptDate = d.InterruptDate,
                ResumeDate = d.ResumeDate,
                Reason = d.Reason,
                Notes = d.Notes,
                CreatedAt = d.CreatedAt,
                CreatedBy = d.CreatedBy
            })
            .ToListAsync();
    }

    public async Task<HIS.Application.DTOs.NangCap18.CheckMedicineOrderRulesResultDto> CheckMedicineOrderRulesAsync(
        HIS.Application.DTOs.NangCap18.CheckMedicineOrderRulesDto dto)
    {
        var result = new HIS.Application.DTOs.NangCap18.CheckMedicineOrderRulesResultDto();

        var admission = await _context.Set<Admission>()
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId && !a.IsDeleted);
        if (admission == null)
        {
            result.HasBlocks = true;
            result.Warnings.Add(new HIS.Application.DTOs.NangCap18.MedicineOrderWarningDto
            {
                WarningType = "NotFound",
                Message = "Không tìm thấy đợt nhập viện",
                Severity = "Block"
            });
            return result;
        }

        var medicineIds = dto.Items.Select(i => i.MedicineId).Distinct().ToList();
        var medicines = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id) && !m.IsDeleted)
            .ToListAsync();

        // Get hospital formulary medicines (active, in-stock)
        var formularyIds = await _context.InventoryItems
            .Where(i => !i.IsDeleted && i.Quantity > 0)
            .Select(i => i.MedicineId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToListAsync();

        foreach (var item in dto.Items)
        {
            var medicine = medicines.FirstOrDefault(m => m.Id == item.MedicineId);
            var medicineName = medicine?.MedicineName ?? item.MedicineId.ToString();

            // Check 1: Not in hospital formulary
            if (!formularyIds.Contains(item.MedicineId))
            {
                result.Warnings.Add(new HIS.Application.DTOs.NangCap18.MedicineOrderWarningDto
                {
                    MedicineId = item.MedicineId,
                    MedicineName = medicineName,
                    WarningType = "NotInFormulary",
                    Message = $"Thuốc '{medicineName}' không có trong danh mục bệnh viện hoặc đã hết tồn kho",
                    Severity = "Warning"
                });
            }

            // Check 2: Quantity exceeds daily limit (>10 units per day as default threshold)
            if (item.Quantity > 10)
            {
                result.Warnings.Add(new HIS.Application.DTOs.NangCap18.MedicineOrderWarningDto
                {
                    MedicineId = item.MedicineId,
                    MedicineName = medicineName,
                    WarningType = "ExceedsDailyLimit",
                    Message = $"Thuốc '{medicineName}' số lượng {item.Quantity} vượt quá giới hạn kê đơn trong ngày",
                    Severity = "Warning"
                });
            }
        }

        result.HasWarnings = result.Warnings.Any();
        result.HasBlocks = result.Warnings.Any(w => w.Severity == "Block");
        return result;
    }

    public async Task<HIS.Application.DTOs.NangCap18.ServiceCompatibilityResultDto> CheckServiceOrderCompatibilityAsync(
        HIS.Application.DTOs.NangCap18.CheckServiceCompatibilityDto dto)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId && !a.IsDeleted);
        if (admission == null)
            return new HIS.Application.DTOs.NangCap18.ServiceCompatibilityResultDto
            {
                IsCompatible = false,
                Message = "Không tìm thấy đợt nhập viện"
            };

        var service = await _context.Services
            .FirstOrDefaultAsync(s => s.Id == dto.ServiceId && !s.IsDeleted);
        if (service == null)
            return new HIS.Application.DTOs.NangCap18.ServiceCompatibilityResultDto
            {
                IsCompatible = false,
                Message = "Không tìm thấy dịch vụ"
            };

        var diagnosisCode = admission.DiagnosisOnAdmission;
        var warnings = new List<string>();

        // Check if diagnosis exists
        if (string.IsNullOrEmpty(diagnosisCode))
        {
            warnings.Add("Chưa có chẩn đoán nhập viện, không thể kiểm tra tương thích");
        }

        // Check if examination was created with matching diagnosis
        var examinations = await _context.Examinations
            .Where(e => e.MedicalRecordId == admission.MedicalRecordId && !e.IsDeleted)
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        if (examinations != null && !string.IsNullOrEmpty(examinations.MainIcdCode))
        {
            // Verify the service is from a relevant service group (basic compatibility check)
            var serviceGroup = await _context.ServiceGroups
                .FirstOrDefaultAsync(sg => sg.Id == service.ServiceGroupId && !sg.IsDeleted);

            if (serviceGroup != null)
            {
                // Log the check for audit
                warnings.Add($"Dịch vụ '{service.ServiceName}' thuộc nhóm '{serviceGroup.GroupName}'");
            }
        }

        return new HIS.Application.DTOs.NangCap18.ServiceCompatibilityResultDto
        {
            IsCompatible = true,
            Message = warnings.Any() ? string.Join("; ", warnings) : "Dịch vụ tương thích với chẩn đoán",
            ServiceName = service.ServiceName,
            DiagnosisCode = diagnosisCode,
            Warnings = warnings
        };
    }

    #endregion
}
