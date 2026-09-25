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

// K6 phien 3 (2026-05-30): tach 3.4 Prescriptions (~600 dong) khoi InpatientCompleteService.
public partial class InpatientCompleteService {
    #region 3.4 Prescriptions

    public async Task<List<object>> SearchMedicinesAsync(string keyword, Guid warehouseId)
    {
        var kw = keyword.ToLower();
        var medicines = await _context.Medicines
            .Where(m => m.IsActive && (m.MedicineName.ToLower().Contains(kw) || m.MedicineCode.ToLower().Contains(kw) || (m.ActiveIngredient != null && m.ActiveIngredient.ToLower().Contains(kw))))
            .Take(50)
            .Select(m => (object)new
            {
                m.Id,
                m.MedicineCode,
                m.MedicineName,
                m.ActiveIngredient,
                m.Concentration,
                m.Unit,
                m.UnitPrice,
                m.RouteName,
                m.DefaultDosage,
                m.DefaultUsage,
                m.IsAntibiotic,
                m.IsNarcotic,
                m.IsPsychotropic
            })
            .ToListAsync();
        return medicines;
    }

    public async Task<object> GetMedicineContraindicationsAsync(Guid medicineId, Guid admissionId)
    {
        var medicine = await _context.Medicines.FindAsync(medicineId);
        return new
        {
            MedicineId = medicineId,
            Contraindications = medicine?.Contraindications,
            SideEffects = medicine?.SideEffects,
            DrugInteractions = medicine?.DrugInteractions,
            Warning = medicine?.Warning
        };
    }

    public async Task<decimal> GetMedicineStockAsync(Guid medicineId, Guid warehouseId)
    {
        var stock = await _context.InventoryItems
            .Where(i => i.MedicineId == medicineId && i.WarehouseId == warehouseId)
            .SumAsync(i => i.Quantity);
        return stock;
    }

    public async Task<object> GetMedicineDetailsAsync(Guid medicineId)
    {
        var medicine = await _context.Medicines.FindAsync(medicineId);
        if (medicine == null)
            return new { MedicineId = medicineId, Error = "Not found" };

        return new
        {
            medicine.Id,
            medicine.MedicineCode,
            medicine.MedicineName,
            medicine.ActiveIngredient,
            medicine.Concentration,
            medicine.Unit,
            medicine.UnitPrice,
            medicine.InsurancePrice,
            medicine.RouteName,
            medicine.Manufacturer,
            medicine.ManufacturerCountry,
            medicine.DefaultDosage,
            medicine.DefaultUsage,
            medicine.Contraindications,
            medicine.SideEffects,
            medicine.DrugInteractions,
            medicine.IsAntibiotic,
            medicine.IsNarcotic,
            medicine.IsPsychotropic,
            medicine.IsInsuranceCovered,
            medicine.InsurancePaymentRate
        };
    }

    // F3.3: Guard deposit enforce-block — đọc từ SystemConfig, mặc định OFF
    // Keys: "Billing.DepositEnforceBlock" (Boolean "true"/"false"), "Billing.DepositMinThreshold" (Number, VND)
    private async Task CheckDepositEnforceBlockAsync(Guid patientId)
    {
        var enforceConfig = await _context.SystemConfigs.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ConfigKey == "Billing.DepositEnforceBlock" && c.IsActive && !c.IsDeleted);
        if (enforceConfig == null || !string.Equals(enforceConfig.ConfigValue, "true", StringComparison.OrdinalIgnoreCase))
            return; // cờ OFF hoặc chưa cấu hình → không chặn (mặc định OFF)

        var thresholdConfig = await _context.SystemConfigs.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ConfigKey == "Billing.DepositMinThreshold" && c.IsActive && !c.IsDeleted);
        decimal threshold = 0;
        if (thresholdConfig != null && decimal.TryParse(thresholdConfig.ConfigValue, out var parsed))
            threshold = parsed;

        var totalRemaining = await _context.Deposits.AsNoTracking()
            .Where(d => d.PatientId == patientId && d.Status != 5 && !d.IsDeleted)
            .SumAsync(d => (decimal?)d.RemainingAmount) ?? 0m;

        if (totalRemaining < threshold)
            throw new InvalidOperationException(
                $"Số dư tạm ứng ({totalRemaining:N0} VNĐ) dưới ngưỡng tối thiểu ({threshold:N0} VNĐ). " +
                "Vui lòng yêu cầu bệnh nhân nộp thêm tạm ứng trước khi chỉ định.");
    }

    /// <summary>
    /// QA-R3: dose-range severity 3 (QUÁ LIỀU NẶNG) without OverrideReason → 400 (PrescriptionDoseGuard). Doses are read
    /// from the line note "n x k lần/ngày" the v2 modal sends, or the Morning/Noon/Afternoon/Evening fields.
    /// </summary>
    private Task EnforceInpatientDoseRangeAsync(Guid patientId, CreateInpatientPrescriptionDto dto)
        => PrescriptionDoseGuard.EnsureNoUnjustifiedSevereOverdoseAsync(_context, patientId,
            dto.Items.Select(i => HIS.Core.Common.DoseRangeChecker.ParseLine(
                i.MedicineId, i.Dosage, i.Note, null, i.Morning, i.Noon, i.Afternoon, i.Evening)).ToList(),
            dto.OverrideReason);

    public async Task<InpatientPrescriptionDto> CreatePrescriptionAsync(CreateInpatientPrescriptionDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>().FindAsync(dto.AdmissionId);
        if (admission == null)
            throw new KeyNotFoundException("Admission not found");
        // QA0915: no ward drug orders on a finished stay — they reached the dispensing queue after
        // discharge. The discharge take-home prescription (G-07 DrugOrderType 4) stays allowed.
        if (!HIS.Core.Constants.AdmissionStatus.IsActive(admission.Status) && dto.DrugOrderType != 4)
            throw new InvalidOperationException(
                $"Lượt nội trú đã kết thúc ({HIS.Core.Constants.AdmissionStatus.Label(admission.Status)}), không kê y lệnh thuốc được.");
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, admission.MedicalRecordId); // TT46
        await CheckDepositEnforceBlockAsync(admission.PatientId); // F3.3

        var doctor = await _context.Users.FindAsync(userId);
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);

        // Create prescription
        var prescription = new Prescription
        {
            Id = Guid.NewGuid(),
            PrescriptionCode = $"DT{DateTime.Now:yyyyMMddHHmmss}",
            PrescriptionDate = dto.PrescriptionDate,
            MedicalRecordId = admission.MedicalRecordId,
            DoctorId = userId,
            DepartmentId = admission.DepartmentId,
            WarehouseId = dto.WarehouseId,
            DiagnosisCode = dto.MainDiagnosisCode,
            DiagnosisName = dto.MainDiagnosis,
            PrescriptionType = 2, // Nội trú
            DrugOrderType = dto.DrugOrderType > 0 ? dto.DrugOrderType : 1, // G-07: default 1=Thường qui
            TotalDays = 1,
            Status = 0, // Chờ duyệt
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        var items = new List<InpatientMedicineItemDto>();
        decimal totalAmount = 0;

        // perf(#195): batch-load medicines instead of FindAsync per item (N+1)
        var createMedicineIds = dto.Items.Select(i => i.MedicineId).Distinct().ToList();
        var createMedicinesMap = await _context.Medicines
            .Where(m => createMedicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);

        foreach (var item in dto.Items)
        {
            if (!createMedicinesMap.TryGetValue(item.MedicineId, out var medicine)) continue;

            var amount = item.Quantity * medicine.UnitPrice;
            totalAmount += amount;

            var detail = new PrescriptionDetail
            {
                Id = Guid.NewGuid(),
                PrescriptionId = prescription.Id,
                MedicineId = item.MedicineId,
                WarehouseId = dto.WarehouseId,
                Quantity = item.Quantity,
                Unit = medicine.Unit,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                // Header PatientAmount was set but the lines stayed 0 — refunds/statements read the lines.
                PatientAmount = amount,
                Dosage = item.Dosage,
                UsageInstructions = item.UsageInstructions,
                PatientType = item.PaymentSource,
                Status = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };

            _context.PrescriptionDetails.Add(detail);

            items.Add(new InpatientMedicineItemDto
            {
                Id = detail.Id,
                MedicineId = item.MedicineId,
                MedicineCode = medicine.MedicineCode,
                MedicineName = medicine.MedicineName,
                Unit = medicine.Unit ?? string.Empty, // QA-R9: response returned "" / 0 although the line was stored right
                Quantity = item.Quantity,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                Dosage = item.Dosage,
                UsageInstructions = item.UsageInstructions,
                PaymentSource = item.PaymentSource,
                Status = 0
            });
        }

        // #185/#186: enforce dị-ứng + tương-tác trước khi lưu đơn nội trú
        await PrescriptionSafetyGuard.EnsureSafeAsync(
            _context, admission.PatientId,
            dto.Items.Select(i => i.MedicineId).ToList(),
            dto.OverrideReason);
        await EnforceInpatientDoseRangeAsync(admission.PatientId, dto); // QA-R3: severe overdose needs a reason
        // QA-R12: the take-home prescription is an outpatient prescription → separate N/H prescription rule
        // (ward orders are not). Lines carry no course length here, so only the mixing rule applies.
        var controlledWarnings = prescription.DrugOrderType == HIS.Core.Constants.DrugOrderType.Discharge
            ? await ControlledDrugRxGuard.CheckAsync(_context,
                dto.Items.Where(i => createMedicinesMap.ContainsKey(i.MedicineId)).Select(i => createMedicinesMap[i.MedicineId])
                    .Select(m => new HIS.Core.Common.ControlledDrugRxRule.Line(m.MedicineName, m.IsNarcotic, m.IsPsychotropic, m.IsPrecursor, null))
                    .ToList(),
                checkDays: false, dto.OverrideReason)
            : new List<string>();
        if (!string.IsNullOrWhiteSpace(dto.OverrideReason))
            prescription.Instructions = $"{prescription.Instructions} [BS bỏ qua cảnh báo an toàn: {dto.OverrideReason}]".Trim();

        prescription.TotalAmount = totalAmount;
        prescription.PatientAmount = totalAmount;
        _context.Prescriptions.Add(prescription);
        // QA-R11 (partial write): the BHYT re-split is a second save — commit it with the order or not at all.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await _context.SaveChangesAsync();
        // R3 BHYT: split at prescribing time (no-op for fee patients).
        if (await new BhytVisitPricing(_context).RecalculateAsync(prescription.MedicalRecordId) != null)
            await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        return new InpatientPrescriptionDto
        {
            Id = prescription.Id,
            AdmissionId = dto.AdmissionId,
            PrescriptionDate = dto.PrescriptionDate,
            PrescribingDoctorId = userId,
            PrescribingDoctorName = doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = dto.MainDiagnosisCode,
            MainDiagnosis = dto.MainDiagnosis,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse?.WarehouseName ?? string.Empty,
            DrugOrderType = prescription.DrugOrderType, // G-07
            Items = items,
            Status = 0,
            TotalAmount = totalAmount,
            InsuranceAmount = prescription.InsuranceAmount,
            PatientPayAmount = totalAmount - prescription.InsuranceAmount,
            Warnings = controlledWarnings,
        };
    }

    public async Task<InpatientPrescriptionDto> UpdatePrescriptionAsync(Guid id, CreateInpatientPrescriptionDto dto, Guid userId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (prescription == null)
            throw new KeyNotFoundException("Prescription not found");
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, prescription.MedicalRecordId); // TT46
        EnsureInpatientPrescriptionMutable(prescription, "sửa");

        prescription.PrescriptionDate = dto.PrescriptionDate;
        prescription.DiagnosisCode = dto.MainDiagnosisCode;
        prescription.DiagnosisName = dto.MainDiagnosis;
        prescription.WarehouseId = dto.WarehouseId;
        prescription.UpdatedAt = DateTime.Now;
        prescription.UpdatedBy = userId.ToString();

        // Remove old details
        _context.PrescriptionDetails.RemoveRange(prescription.Details);

        var items = new List<InpatientMedicineItemDto>();
        decimal totalAmount = 0;

        // perf(#195): batch-load medicines instead of FindAsync per item (N+1)
        var updateMedicineIds = dto.Items.Select(i => i.MedicineId).Distinct().ToList();
        var updateMedicinesMap = await _context.Medicines
            .Where(m => updateMedicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);

        foreach (var item in dto.Items)
        {
            if (!updateMedicinesMap.TryGetValue(item.MedicineId, out var medicine)) continue;

            var amount = item.Quantity * medicine.UnitPrice;
            totalAmount += amount;

            var detail = new PrescriptionDetail
            {
                Id = Guid.NewGuid(),
                PrescriptionId = id,
                MedicineId = item.MedicineId,
                WarehouseId = dto.WarehouseId,
                Quantity = item.Quantity,
                Unit = medicine.Unit,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                PatientAmount = amount,
                Dosage = item.Dosage,
                UsageInstructions = item.UsageInstructions,
                PatientType = item.PaymentSource,
                Status = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
            _context.PrescriptionDetails.Add(detail);

            items.Add(new InpatientMedicineItemDto
            {
                Id = detail.Id,
                MedicineId = item.MedicineId,
                MedicineCode = medicine.MedicineCode,
                MedicineName = medicine.MedicineName,
                Unit = medicine.Unit ?? string.Empty, // QA-R9: response returned "" / 0 although the line was stored right
                Quantity = item.Quantity,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                Dosage = item.Dosage,
                UsageInstructions = item.UsageInstructions,
                PaymentSource = item.PaymentSource,
                Status = 0
            });
        }

        // #185/#186: enforce dị-ứng + tương-tác khi cập nhật đơn nội trú
        var updPatientId = await _context.MedicalRecords
            .Where(m => m.Id == prescription.MedicalRecordId)
            .Select(m => m.PatientId).FirstOrDefaultAsync();
        await PrescriptionSafetyGuard.EnsureSafeAsync(
            _context, updPatientId,
            dto.Items.Select(i => i.MedicineId).ToList(),
            dto.OverrideReason);
        await EnforceInpatientDoseRangeAsync(updPatientId, dto); // QA-R3: severe overdose needs a reason
        var controlledWarnings = prescription.DrugOrderType == HIS.Core.Constants.DrugOrderType.Discharge // QA-R12
            ? await ControlledDrugRxGuard.CheckAsync(_context,
                dto.Items.Where(i => updateMedicinesMap.ContainsKey(i.MedicineId)).Select(i => updateMedicinesMap[i.MedicineId])
                    .Select(m => new HIS.Core.Common.ControlledDrugRxRule.Line(m.MedicineName, m.IsNarcotic, m.IsPsychotropic, m.IsPrecursor, null))
                    .ToList(),
                checkDays: false, dto.OverrideReason)
            : new List<string>();
        if (!string.IsNullOrWhiteSpace(dto.OverrideReason))
            prescription.Instructions = $"{prescription.Instructions} [BS bỏ qua cảnh báo an toàn: {dto.OverrideReason}]".Trim();

        prescription.TotalAmount = totalAmount;
        prescription.PatientAmount = totalAmount;
        prescription.InsuranceAmount = 0;
        await using var tx = await SqlAppLock.BeginAsync(_context); // QA-R11: lines + BHYT split in one transaction
        await _context.SaveChangesAsync();
        if (await new BhytVisitPricing(_context).RecalculateAsync(prescription.MedicalRecordId) != null) // R3 BHYT
            await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        var doctor = await _context.Users.FindAsync(userId);
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);

        return new InpatientPrescriptionDto
        {
            Id = id,
            AdmissionId = dto.AdmissionId,
            PrescriptionDate = dto.PrescriptionDate,
            PrescribingDoctorId = userId,
            PrescribingDoctorName = doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = dto.MainDiagnosisCode,
            MainDiagnosis = dto.MainDiagnosis,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse?.WarehouseName ?? string.Empty,
            Items = items,
            Status = prescription.Status,
            TotalAmount = totalAmount,
            InsuranceAmount = prescription.InsuranceAmount,
            PatientPayAmount = totalAmount - prescription.InsuranceAmount,
            Warnings = controlledWarnings,
        };
    }

    public async Task DeletePrescriptionAsync(Guid id, Guid userId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thuốc."); // QA-R4: was a silent 200
        {
            await EmrLockGuard.EnsureEditableByRecordAsync(_context, prescription.MedicalRecordId); // TT46
            EnsureInpatientPrescriptionMutable(prescription, "xóa");
            _context.PrescriptionDetails.RemoveRange(prescription.Details);
            _context.Prescriptions.Remove(prescription);
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// QA0915 (P0): update/delete used to work on ANY status — a dispensed ward order (drugs already
    /// out of the warehouse) could be rewritten to another drug/quantity or hard-deleted, leaving the
    /// export receipt without its prescription and the bill short. Only orders the pharmacy has not
    /// acted on (pending approval / draft) and nothing dispensed are mutable.
    /// </summary>
    private static void EnsureInpatientPrescriptionMutable(Prescription prescription, string action)
    {
        var status = prescription.Status;
        if (prescription.IsDispensed
            || (status != HIS.Core.Constants.PrescriptionStatus.PendingApproval
                && status != HIS.Core.Constants.PrescriptionStatus.Draft))
            throw new InvalidOperationException(
                $"Đơn thuốc đang ở trạng thái \"{HIS.Core.Constants.PrescriptionStatus.GetName(status)}\"{(prescription.IsDispensed ? " (đã cấp phát)" : "")} — không {action} được. "
                + "Dùng hoàn trả / đơn thay thế.");
    }

    public async Task<List<InpatientPrescriptionDto>> GetPrescriptionsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        var admission = await _context.Set<Admission>().FindAsync(admissionId);
        if (admission == null)
            return new List<InpatientPrescriptionDto>();

        var query = _context.Prescriptions
            .Include(p => p.Details)
                .ThenInclude(d => d.Medicine)
            .Include(p => p.Doctor)
            .Where(p => p.MedicalRecordId == admission.MedicalRecordId && p.PrescriptionType == 2);

        if (fromDate.HasValue)
            query = query.Where(p => p.PrescriptionDate >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(p => p.PrescriptionDate <= toDate.Value);

        var prescriptions = await query.OrderByDescending(p => p.PrescriptionDate).ToListAsync();

        return prescriptions.Select(p => new InpatientPrescriptionDto
        {
            Id = p.Id,
            AdmissionId = admissionId,
            PrescriptionDate = p.PrescriptionDate,
            PrescribingDoctorId = p.DoctorId,
            PrescribingDoctorName = p.Doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = p.DiagnosisCode,
            MainDiagnosis = p.DiagnosisName,
            WarehouseId = p.WarehouseId ?? Guid.Empty,
            DrugOrderType = p.DrugOrderType, // QA0915: list returned 0 while create returned the stored type (G-07)
            Items = p.Details.Select(d => new InpatientMedicineItemDto
            {
                Id = d.Id,
                MedicineId = d.MedicineId,
                MedicineCode = d.Medicine?.MedicineCode ?? string.Empty,
                MedicineName = d.Medicine?.MedicineName ?? string.Empty,
                Unit = d.Unit ?? d.Medicine?.Unit ?? string.Empty,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Dosage = d.Dosage,
                UsageInstructions = d.UsageInstructions,
                PaymentSource = d.PatientType,
                Status = d.Status
            }).ToList(),
            Status = p.Status,
            TotalAmount = p.TotalAmount,
            InsuranceAmount = p.InsuranceAmount,
            PatientPayAmount = p.PatientAmount
        }).ToList();
    }

    public async Task<InpatientPrescriptionDto?> GetPrescriptionByIdAsync(Guid id)
    {
        var p = await _context.Prescriptions
            .Include(pr => pr.Details)
                .ThenInclude(d => d.Medicine)
            .Include(pr => pr.Doctor)
            .FirstOrDefaultAsync(pr => pr.Id == id);
        if (p == null) return null;

        return new InpatientPrescriptionDto
        {
            Id = p.Id,
            PrescriptionDate = p.PrescriptionDate,
            PrescribingDoctorId = p.DoctorId,
            PrescribingDoctorName = p.Doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = p.DiagnosisCode,
            MainDiagnosis = p.DiagnosisName,
            WarehouseId = p.WarehouseId ?? Guid.Empty,
            Items = p.Details.Select(d => new InpatientMedicineItemDto
            {
                Id = d.Id,
                MedicineId = d.MedicineId,
                MedicineCode = d.Medicine?.MedicineCode ?? string.Empty,
                MedicineName = d.Medicine?.MedicineName ?? string.Empty,
                Unit = d.Unit ?? d.Medicine?.Unit ?? string.Empty,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Dosage = d.Dosage,
                UsageInstructions = d.UsageInstructions,
                PaymentSource = d.PatientType,
                Status = d.Status
            }).ToList(),
            Status = p.Status,
            TotalAmount = p.TotalAmount,
            InsuranceAmount = p.InsuranceAmount,
            PatientPayAmount = p.PatientAmount
        };
    }

    public Task<EmergencyCabinetPrescriptionDto> CreateEmergencyCabinetPrescriptionAsync(Guid admissionId, Guid cabinetId, List<CreateInpatientMedicineItemDto> items, Guid userId)
    {
        // QA-R11: returned a fake prescription with a random id (nothing saved, cabinet stock untouched) — refuse
        // honestly. The normal prescription path with the cabinet as warehouse is the real way (Gap: cabinet refill).
        throw new InvalidOperationException("Kê đơn từ tủ trực chưa hỗ trợ riêng — hãy kê đơn nội trú và chọn kho là tủ trực của khoa.");
    }

    public async Task<List<object>> GetEmergencyCabinetsAsync(Guid departmentId)
    {
        // Query warehouses that are emergency cabinets: HIS.Core WarehouseType 5 (ward cabinet) or IsCabinet=true.
        // QA-R3: was WarehouseType=4, which is the hospital pharmacy.
        // Filter by DepartmentId when provided (only that department's cabinet).
        // Falls back to all active cabinets if no match for the department.
        var query = _context.Warehouses
            .Where(w => w.IsActive && (w.WarehouseType == HIS.Core.Constants.WarehouseType.WardCabinet || w.IsCabinet));

        if (departmentId != Guid.Empty)
            query = query.Where(w => w.DepartmentId == departmentId || w.DepartmentId == null);

        var cabinets = await query
            .OrderBy(w => w.WarehouseName)
            .Select(w => (object)new
            {
                id = w.Id,
                code = w.WarehouseCode,
                name = w.WarehouseName,
                departmentId = w.DepartmentId,
                isCabinet = w.IsCabinet,
                warehouseType = w.WarehouseType
            })
            .ToListAsync();

        return cabinets;
    }

    public Task<InpatientPrescriptionDto> CreateTraditionalMedicinePrescriptionAsync(Guid admissionId, int numberOfDoses, List<CreateInpatientMedicineItemDto> items, Guid userId)
    {
        return Task.FromResult(new InpatientPrescriptionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            PrescriptionDate = DateTime.Now,
            PrescribingDoctorId = userId,
            Status = 0
        });
    }

    public Task<decimal> CalculateQuantityByDaysAsync(Guid medicineId, int days, string dosage)
    {
        // Default: 3 times per day
        return Task.FromResult((decimal)(days * 3));
    }

    public Task<string> GenerateUsageInstructionAsync(Guid medicineId, string dosage)
    {
        var instruction = $"U\u1ed1ng {dosage} vi\u00ean/l\u1ea7n, ng\u00e0y 3 l\u1ea7n (s\u00e1ng - tr\u01b0a - t\u1ed1i), sau \u0103n";
        return Task.FromResult(instruction);
    }

    public async Task SaveUsageTemplateAsync(Guid medicineId, string usage, Guid userId)
    {
        // QA-R11: was a no-op. The catalog already has Medicine.DefaultUsage (the usage text pre-filled when the
        // medicine is prescribed) — the "usage template" of a medicine is stored there.
        if (string.IsNullOrWhiteSpace(usage)) throw new ArgumentException("Chưa nhập cách dùng", nameof(usage));
        var medicine = await _context.Medicines.FirstOrDefaultAsync(m => m.Id == medicineId && !m.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy thuốc");
        medicine.DefaultUsage = usage.Trim();
        medicine.UpdatedAt = DateTime.UtcNow;
        medicine.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
    }

    public async Task<PrescriptionWarningDto> CheckPrescriptionWarningsAsync(Guid admissionId, List<CreateInpatientMedicineItemDto> items)
    {
        // QA-R12: always answered "no warnings" — a patient-safety trap for any page that trusted it. It now runs the
        // same allergy / severe-interaction check the save enforces (PrescriptionSafetyGuard) plus "already ordered
        // today on this stay". Checks this endpoint does not perform keep their flags false.
        var result = new PrescriptionWarningDto();
        var medicineIds = (items ?? new()).Select(i => i.MedicineId).Where(id => id != Guid.Empty).Distinct().ToList();
        if (medicineIds.Count == 0) return result;
        var admission = await _context.Set<Admission>().AsNoTracking()
            .Where(a => a.Id == admissionId)
            .Select(a => new { a.PatientId, a.MedicalRecordId })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Admission not found");

        var issues = await PrescriptionSafetyGuard.FindBlockingIssuesAsync(_context, admission.PatientId, medicineIds);
        result.GeneralWarnings.AddRange(issues);
        result.HasDrugInteraction = issues.Any(i => i.StartsWith("[Tương tác]", StringComparison.Ordinal));

        // Ward orders carry VN-local PrescriptionDate (same as the create path).
        var today = HIS.Core.Common.VnTime.TodayVn;
        var tomorrow = today.AddDays(1);
        var duplicates = await _context.PrescriptionDetails.AsNoTracking()
            .Where(d => medicineIds.Contains(d.MedicineId)
                        && d.Prescription.MedicalRecordId == admission.MedicalRecordId
                        && d.Prescription.PrescriptionDate >= today && d.Prescription.PrescriptionDate < tomorrow
                        && d.Prescription.Status != HIS.Core.Constants.PrescriptionStatus.Cancelled
                        && d.Prescription.DrugOrderType != HIS.Core.Constants.DrugOrderType.Return)
            .Select(d => d.Medicine.MedicineName)
            .Distinct()
            .ToListAsync();
        result.HasDuplicateToday = duplicates.Count > 0;
        result.DuplicateMedicines = duplicates;
        return result;
    }

    // QA-R8: the inpatient template endpoints were stubs (create echoed a random id, list was always empty).
    // They now read/write the same PrescriptionTemplates table as the OPD templates.
    public async Task<InpatientPrescriptionTemplateDto> CreatePrescriptionTemplateAsync(InpatientPrescriptionTemplateDto dto, Guid userId)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.TemplateName))
            throw new ArgumentException("Chưa nhập tên đơn thuốc mẫu", nameof(dto.TemplateName));
        var lines = (dto.Items ?? new()).Where(i => i.MedicineId != Guid.Empty).ToList();
        if (lines.Count == 0)
            throw new ArgumentException("Đơn thuốc mẫu chưa có thuốc", nameof(dto.Items));
        if (lines.Any(i => i.DefaultQuantity <= 0))
            throw new ArgumentException("Số lượng thuốc trong đơn mẫu phải lớn hơn 0", nameof(dto.Items));
        var medicineIds = lines.Select(i => i.MedicineId).Distinct().ToList();
        var activeCount = await _context.Medicines.CountAsync(m => medicineIds.Contains(m.Id) && m.IsActive);
        if (activeCount != medicineIds.Count)
            throw new ArgumentException("Đơn mẫu có thuốc không tồn tại hoặc đã ngừng sử dụng", nameof(dto.Items));

        var now = DateTime.Now;
        var template = new PrescriptionTemplate
        {
            Id = Guid.NewGuid(),
            TemplateCode = string.IsNullOrWhiteSpace(dto.TemplateCode)
                ? $"DTNT{HIS.Core.Common.VnTime.NowVn:yyyyMMddHHmmssfff}" : dto.TemplateCode.Trim(),
            TemplateName = dto.TemplateName.Trim(),
            PrescriptionType = 2, // Nội trú
            DepartmentId = dto.DepartmentId,
            Description = dto.Description,
            IsPublic = dto.IsShared,
            CreatedByUserId = userId == Guid.Empty ? null : userId,
            IsActive = true,
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };
        var order = 0;
        foreach (var line in lines)
        {
            template.Items.Add(new PrescriptionTemplateItem
            {
                Id = Guid.NewGuid(),
                PrescriptionTemplateId = template.Id,
                MedicineId = line.MedicineId,
                Quantity = line.DefaultQuantity,
                Days = 1,
                Dosage = line.DefaultDosage,
                UsageInstructions = line.DefaultUsage,
                SortOrder = order++,
                CreatedAt = now,
                CreatedBy = userId.ToString(),
            });
        }
        _context.PrescriptionTemplates.Add(template);
        await _context.SaveChangesAsync();

        return (await GetPrescriptionTemplatesCoreAsync(q => q.Where(t => t.Id == template.Id))).First();
    }

    public Task<List<InpatientPrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid? departmentId, Guid? userId)
    {
        // Same scope as OPD: no department → every active template; a department → its own + shared ones
        // (+ the caller's own templates).
        return GetPrescriptionTemplatesCoreAsync(q => departmentId.HasValue
            ? q.Where(t => t.DepartmentId == departmentId || t.IsPublic || (userId != null && t.CreatedByUserId == userId))
            : q);
    }

    // QA-R9: update / soft delete with the template scope rule (EnsureCanManageTemplate).
    public async Task<InpatientPrescriptionTemplateDto> UpdatePrescriptionTemplateAsync(Guid id, InpatientPrescriptionTemplateDto dto, Guid userId, bool isAdmin)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.TemplateName))
            throw new ArgumentException("Chưa nhập tên đơn thuốc mẫu", nameof(dto.TemplateName));
        var template = await _context.PrescriptionTemplates
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == id && t.IsActive)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thuốc mẫu");
        EnsureCanManageTemplate(template.CreatedByUserId, template.IsPublic, userId, isAdmin);

        // Empty item list = rename / re-describe only (keeps the medicines).
        var lines = (dto.Items ?? new()).Where(i => i.MedicineId != Guid.Empty).ToList();
        if (lines.Count > 0)
        {
            // OPD templates share the table and hold whole-course quantities (with Days) - the ward form cannot
            // rewrite those lines without corrupting them.
            if (template.PrescriptionType != 2)
                throw new InvalidOperationException("Đơn mẫu ngoại trú chỉ sửa thuốc ở màn khám bệnh (ở đây chỉ đổi tên / xóa).");
            if (lines.Any(i => i.DefaultQuantity <= 0))
                throw new ArgumentException("Số lượng thuốc trong đơn mẫu phải lớn hơn 0", nameof(dto.Items));
            var medicineIds = lines.Select(i => i.MedicineId).Distinct().ToList();
            var activeCount = await _context.Medicines.CountAsync(m => medicineIds.Contains(m.Id) && m.IsActive);
            if (activeCount != medicineIds.Count)
                throw new ArgumentException("Đơn mẫu có thuốc không tồn tại hoặc đã ngừng sử dụng", nameof(dto.Items));
        }

        var now = DateTime.Now;
        template.TemplateName = dto.TemplateName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.TemplateCode)) template.TemplateCode = dto.TemplateCode.Trim();
        template.Description = dto.Description;
        if (isAdmin) template.IsPublic = dto.IsShared; // sharing is an admin decision
        template.UpdatedAt = now;
        template.UpdatedBy = userId.ToString();
        if (lines.Count > 0)
        {
            _context.PrescriptionTemplateItems.RemoveRange(template.Items);
            var order = 0;
            foreach (var line in lines)
            {
                _context.PrescriptionTemplateItems.Add(new PrescriptionTemplateItem
                {
                    Id = Guid.NewGuid(),
                    PrescriptionTemplateId = template.Id,
                    MedicineId = line.MedicineId,
                    Quantity = line.DefaultQuantity,
                    Days = 1,
                    Dosage = line.DefaultDosage,
                    UsageInstructions = line.DefaultUsage,
                    SortOrder = order++,
                    CreatedAt = now,
                    CreatedBy = userId.ToString(),
                });
            }
        }
        await _context.SaveChangesAsync();
        return (await GetPrescriptionTemplatesCoreAsync(q => q.Where(t => t.Id == template.Id))).First();
    }

    public async Task DeletePrescriptionTemplateAsync(Guid id, Guid userId, bool isAdmin)
    {
        var template = await _context.PrescriptionTemplates.FirstOrDefaultAsync(t => t.Id == id && t.IsActive)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thuốc mẫu");
        EnsureCanManageTemplate(template.CreatedByUserId, template.IsPublic, userId, isAdmin);
        template.IsActive = false; // soft delete, same as the OPD template delete
        template.UpdatedAt = DateTime.Now;
        template.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
    }

    private async Task<List<InpatientPrescriptionTemplateDto>> GetPrescriptionTemplatesCoreAsync(
        Func<IQueryable<PrescriptionTemplate>, IQueryable<PrescriptionTemplate>> scope)
    {
        // Nameless rows (legacy OPD saves before the QA-R4 name check) are unusable in a picker.
        return await scope(_context.PrescriptionTemplates.AsNoTracking().Where(t => t.IsActive && t.TemplateName != ""))
            .OrderBy(t => t.SortOrder).ThenBy(t => t.TemplateName)
            .Select(t => new InpatientPrescriptionTemplateDto
            {
                Id = t.Id,
                TemplateCode = t.TemplateCode,
                TemplateName = t.TemplateName,
                Description = t.Description,
                DepartmentId = t.DepartmentId,
                CreatedBy = t.CreatedByUserId,
                CreatedByName = t.CreatedByUser != null ? t.CreatedByUser.FullName : null,
                IsShared = t.IsPublic,
                Items = t.Items.OrderBy(i => i.SortOrder).Select(i => new InpatientPrescriptionTemplateItemDto
                {
                    MedicineId = i.MedicineId,
                    MedicineCode = i.Medicine.MedicineCode,
                    MedicineName = i.Medicine.MedicineName,
                    DefaultQuantity = i.Quantity,
                    DefaultDosage = i.Dosage,
                    DefaultUsage = i.UsageInstructions,
                }).ToList(),
            })
            .Take(500)
            .ToListAsync();
    }

    public async Task<InpatientPrescriptionDto> PrescribeByTemplateAsync(Guid admissionId, Guid templateId, Guid userId,
        CreateInpatientPrescriptionDto? header = null)
    {
        // QA-R8: expands the template into lines and goes through CreatePrescriptionAsync — the same method the
        // manual ward prescription uses — so the stay-status/TT46 lock, deposit block, allergy/interaction guard,
        // dose guard, price and BHYT split all apply. The CCHN gate is on the controller action.
        if (admissionId == Guid.Empty || !await _context.Set<Admission>().AnyAsync(a => a.Id == admissionId && !a.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy lượt nhập viện");
        var template = templateId == Guid.Empty ? null : await _context.PrescriptionTemplates.AsNoTracking()
            .Include(t => t.Items).ThenInclude(i => i.Medicine)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.IsActive);
        if (template == null)
            throw new KeyNotFoundException("Không tìm thấy đơn thuốc mẫu");
        // Pre-push review: OPD templates share this table and store the quantity for the WHOLE course (Days),
        // so a one-click ward order from one would dispense and bill several days at once. Only ward templates
        // are prescribed directly; an OPD template is loaded into the form ("Nạp đơn mẫu") and edited there.
        if (template.PrescriptionType != 2)
            throw new InvalidOperationException(
                "Đơn mẫu này là mẫu ngoại trú (số lượng tính cho cả đợt) — dùng \"Nạp đơn mẫu\" để chỉnh số lượng rồi lưu.");
        var lines = template.Items.Where(i => !i.IsDeleted).OrderBy(i => i.SortOrder).ToList();
        if (lines.Count == 0)
            throw new InvalidOperationException("Đơn thuốc mẫu không có thuốc nào.");
        var inactive = lines.Where(i => i.Medicine == null || i.Medicine.IsDeleted || !i.Medicine.IsActive)
            .Select(i => i.Medicine?.MedicineName ?? i.MedicineId.ToString()).ToList();
        if (inactive.Count > 0)
            throw new InvalidOperationException($"Đơn mẫu có thuốc đã ngừng sử dụng: {string.Join(", ", inactive)} — sửa đơn mẫu trước khi kê.");
        if (lines.Any(i => i.Quantity <= 0))
            throw new InvalidOperationException("Đơn mẫu có dòng thuốc số lượng không hợp lệ (≤ 0).");

        header ??= new CreateInpatientPrescriptionDto();
        if (header.WarehouseId == Guid.Empty)
            throw new ArgumentException("Chọn kho thuốc trước khi kê theo mẫu", nameof(header.WarehouseId));
        if (!await _context.Warehouses.AnyAsync(w => w.Id == header.WarehouseId && w.IsActive))
            throw new ArgumentException("Kho thuốc không tồn tại hoặc đã ngừng hoạt động", nameof(header.WarehouseId));

        string? diagCode = header.MainDiagnosisCode, diagName = header.MainDiagnosis;
        if (string.IsNullOrWhiteSpace(diagCode))
        {
            var record = await GetInpatientDiagnosisAsync(admissionId);
            diagCode = !string.IsNullOrWhiteSpace(record.MainDiagnosisCode) ? record.MainDiagnosisCode : template.DiagnosisCode;
            diagName = !string.IsNullOrWhiteSpace(record.MainDiagnosisCode) ? record.MainDiagnosis : template.DiagnosisName;
        }

        var dto = new CreateInpatientPrescriptionDto
        {
            AdmissionId = admissionId,
            PrescriptionDate = header.PrescriptionDate == default ? HIS.Core.Common.VnTime.NowVn : header.PrescriptionDate,
            MainDiagnosisCode = diagCode,
            MainDiagnosis = diagName,
            WarehouseId = header.WarehouseId,
            DrugOrderType = header.DrugOrderType > 0 ? header.DrugOrderType : 1,
            OverrideReason = header.OverrideReason,
            Items = lines.Select(i => new CreateInpatientMedicineItemDto
            {
                MedicineId = i.MedicineId,
                Quantity = i.Quantity,
                Dosage = i.Dosage,
                UsageInstructions = string.Join(" · ", new[] { i.Route, i.Frequency, i.UsageInstructions }
                    .Where(s => !string.IsNullOrWhiteSpace(s))) is { Length: > 0 } usage ? usage : null,
                // The dose guard parses "n x k lần/ngày" from the note; the template frequency is the closest source.
                Note = i.Frequency,
                PaymentSource = 1,
            }).ToList(),
        };
        return await CreatePrescriptionAsync(dto, userId);
    }

    public Task<InpatientPrescriptionDto> CopyPreviousPrescriptionAsync(Guid admissionId, Guid sourcePrescriptionId, Guid userId)
    {
        return Task.FromResult(new InpatientPrescriptionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            PrescriptionDate = DateTime.Now,
            PrescribingDoctorId = userId,
            Status = 0
        });
    }

    public Task<MedicineOrderSummaryDto> CreateMedicineOrderSummaryAsync(Guid departmentId, DateTime date, Guid? roomId, Guid warehouseId, Guid userId)
    {
        // QA-R11: returned a random id with nothing saved. The ward's consolidated requisition ("phiếu lĩnh tổng hợp")
        // is created by the pharmacy screen /v2/inpatient-dispensing (InpatientDispensingService.BatchAsync: stock
        // deduction + one ExportReceipt per prescription under one XKN code). A second writer here would dispense twice.
        throw new InvalidOperationException("Lập phiếu lĩnh thuốc tổng hợp tại màn hình Phát thuốc nội trú (khoa dược).");
    }

    public async Task<List<MedicineOrderSummaryDto>> GetMedicineOrderSummariesAsync(Guid departmentId, DateTime fromDate, DateTime toDate)
    {
        // QA-R11: was always empty. Reads the real requisitions written by the inpatient-dispensing batch:
        // ExportType 2 receipts to this department, grouped by their shared XKN code.
        var from = HIS.Core.Common.VnTime.DayRangeVn(fromDate).From;
        var to = HIS.Core.Common.VnTime.DayRangeVn(toDate).To;
        var receipts = await _context.ExportReceipts.AsNoTracking()
            .Include(r => r.Warehouse)
            .Include(r => r.Details).ThenInclude(d => d.Medicine)
            .Where(r => !r.IsDeleted && r.ExportType == 2 && r.ToDepartmentId == departmentId && r.Status != 2
                && r.ReceiptCode.StartsWith("XKN") && r.ReceiptDate >= from && r.ReceiptDate < to)
            .OrderByDescending(r => r.ReceiptDate)
            .Take(2000)
            .ToListAsync();
        if (receipts.Count == 0) return new List<MedicineOrderSummaryDto>();

        var deptName = await _context.Departments.Where(d => d.Id == departmentId)
            .Select(d => d.DepartmentName).FirstOrDefaultAsync() ?? string.Empty;
        var recordIds = receipts.Where(r => r.MedicalRecordId != null).Select(r => r.MedicalRecordId!.Value).Distinct().ToList();
        var admissions = await _context.Admissions.AsNoTracking()
            .Where(a => recordIds.Contains(a.MedicalRecordId))
            .Select(a => new { a.Id, a.MedicalRecordId, a.Patient.PatientCode, a.Patient.FullName, a.AdmissionDate })
            .ToListAsync();
        var admissionByRecord = admissions.GroupBy(a => a.MedicalRecordId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.AdmissionDate).First());

        return receipts.GroupBy(r => r.ReceiptCode).Select(g =>
        {
            var first = g.OrderBy(r => r.CreatedAt).First();
            var lines = g.SelectMany(r => r.Details.Where(d => !d.IsDeleted && d.MedicineId != null)
                .Select(d => new { Receipt = r, Detail = d })).ToList();
            return new MedicineOrderSummaryDto
            {
                Id = first.Id, // the id /inpatient-dispensing/receipt/{id} prints
                SummaryDate = first.ReceiptDate,
                DepartmentId = departmentId,
                DepartmentName = deptName,
                WarehouseId = first.WarehouseId,
                WarehouseName = first.Warehouse?.WarehouseName ?? string.Empty,
                Status = 1, // the batch dispenses immediately
                Items = lines.GroupBy(x => x.Detail.MedicineId!.Value).Select(mg =>
                {
                    var med = mg.First().Detail.Medicine;
                    var perPatient = mg.Where(x => x.Receipt.MedicalRecordId != null)
                        .GroupBy(x => x.Receipt.MedicalRecordId!.Value)
                        .Select(pg =>
                        {
                            admissionByRecord.TryGetValue(pg.Key, out var adm);
                            return new MedicinePatientDetailDto
                            {
                                AdmissionId = adm?.Id ?? Guid.Empty,
                                PatientCode = adm?.PatientCode ?? string.Empty,
                                PatientName = adm?.FullName ?? string.Empty,
                                Quantity = pg.Sum(x => x.Detail.Quantity),
                            };
                        }).ToList();
                    var qty = mg.Sum(x => x.Detail.Quantity);
                    return new MedicineOrderSummaryItemDto
                    {
                        MedicineId = mg.Key,
                        MedicineCode = med?.MedicineCode ?? string.Empty,
                        MedicineName = med?.MedicineName ?? string.Empty,
                        Unit = mg.First().Detail.Unit ?? med?.Unit ?? string.Empty,
                        TotalQuantity = qty,
                        IssuedQuantity = qty,
                        PatientCount = perPatient.Count,
                        PatientDetails = perPatient,
                    };
                }).ToList(),
            };
        }).ToList();
    }

    public Task<SupplyOrderSummaryDto> CreateSupplyOrderSummaryAsync(Guid departmentId, DateTime date, Guid warehouseId, Guid userId)
    {
        return Task.FromResult(new SupplyOrderSummaryDto
        {
            Id = Guid.NewGuid(),
            SummaryDate = date,
            DepartmentId = departmentId,
            WarehouseId = warehouseId,
            Status = 0
        });
    }

    public async Task<byte[]> PrintMedicineOrderSummaryAsync(Guid summaryId)
    {
        // summaryId represents a department-level summary; query prescriptions for that department today
        var dept = await _context.Departments.FindAsync(summaryId);
        var deptName = dept?.DepartmentName ?? "";

        var today = DateTime.Today;
        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => p.DepartmentId == summaryId
                && p.PrescriptionDate >= today && p.PrescriptionDate < today.AddDays(1)
                && p.PrescriptionType == 2)
            .ToListAsync();

        // Aggregate medicine totals
        var items = prescriptions
            .SelectMany(p => p.Details)
            .GroupBy(d => new { d.MedicineId, Name = d.Medicine?.MedicineName ?? "", Unit = d.Medicine?.Unit ?? "" })
            .Select(g => new ReportItemRow
            {
                Name = g.Key.Name,
                Unit = g.Key.Unit,
                Quantity = g.Sum(x => x.Quantity),
                UnitPrice = g.First().UnitPrice,
                Amount = g.Sum(x => x.Amount)
            }).ToList();

        var html = BuildItemizedReport(
            "BẢNG TỔNG HỢP THUỐC", $"DT-{today:yyyyMMdd}", today,
            new[] { "Khoa", "Ngày" },
            new[] { deptName, today.ToString("dd/MM/yyyy") },
            items);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintMedicineVerificationAsync(Guid summaryId)
    {
        var dept = await _context.Departments.FindAsync(summaryId);
        var deptName = dept?.DepartmentName ?? "";
        var today = DateTime.Today;

        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Include(p => p.Doctor)
            .Where(p => p.DepartmentId == summaryId
                && p.PrescriptionDate >= today && p.PrescriptionDate < today.AddDays(1)
                && p.PrescriptionType == 2)
            .ToListAsync();

        var headers = new[] { "Tên thuốc", "ĐVT", "SL yêu cầu", "SL duyệt", "BS kê", "Ghi chú" };
        var rows = prescriptions
            .SelectMany(p => p.Details.Select(d => new { Detail = d, Doctor = p.Doctor }))
            .Select(x => new[]
            {
                x.Detail.Medicine?.MedicineName ?? "",
                x.Detail.Unit ?? "",
                x.Detail.Quantity.ToString("#,##0"),
                x.Detail.Quantity.ToString("#,##0"),
                x.Doctor?.FullName ?? "",
                ""
            }).ToList();

        var html = BuildTableReport(
            "PHIẾU DUYỆT THUỐC",
            $"Khoa: {Esc(deptName)} - Ngày: {today:dd/MM/yyyy}",
            today,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintPatientMedicineSlipAsync(Guid admissionId, DateTime date)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = await _context.Departments.FindAsync(admission.DepartmentId);

        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => p.MedicalRecordId == medRecord.Id
                && p.PrescriptionDate >= date.Date && p.PrescriptionDate < date.Date.AddDays(1)
                && p.PrescriptionType == 2)
            .ToListAsync();

        var items = prescriptions.SelectMany(p => p.Details).Select(d => new PrescriptionRow
        {
            MedicineName = d.Medicine?.MedicineName ?? "",
            Unit = d.Unit,
            Quantity = d.Quantity,
            Dosage = d.Dosage,
            Usage = d.UsageInstructions
        }).ToList();

        var doctor = prescriptions.FirstOrDefault()?.DoctorId != null
            ? await _context.Users.FindAsync(prescriptions.First().DoctorId)
            : null;

        var html = GetPrescription(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MainDiagnosis, medRecord.MainIcdCode,
            date, 1, items, null,
            doctor?.FullName, dept?.DepartmentName);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion
}
