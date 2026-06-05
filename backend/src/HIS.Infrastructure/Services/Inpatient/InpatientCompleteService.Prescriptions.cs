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

    public async Task<InpatientPrescriptionDto> CreatePrescriptionAsync(CreateInpatientPrescriptionDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>().FindAsync(dto.AdmissionId);
        if (admission == null)
            throw new Exception("Admission not found");

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

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.MedicineId);
            if (medicine == null) continue;

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
                Quantity = item.Quantity,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                Status = 0
            });
        }

        prescription.TotalAmount = totalAmount;
        prescription.PatientAmount = totalAmount;
        _context.Prescriptions.Add(prescription);
        await _context.SaveChangesAsync();

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
            InsuranceAmount = 0,
            PatientPayAmount = totalAmount
        };
    }

    public async Task<InpatientPrescriptionDto> UpdatePrescriptionAsync(Guid id, CreateInpatientPrescriptionDto dto, Guid userId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (prescription == null)
            throw new Exception("Prescription not found");

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

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.MedicineId);
            if (medicine == null) continue;

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
                Quantity = item.Quantity,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                Status = 0
            });
        }

        prescription.TotalAmount = totalAmount;
        prescription.PatientAmount = totalAmount;
        await _context.SaveChangesAsync();

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
            InsuranceAmount = 0,
            PatientPayAmount = totalAmount
        };
    }

    public async Task DeletePrescriptionAsync(Guid id, Guid userId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (prescription != null)
        {
            _context.PrescriptionDetails.RemoveRange(prescription.Details);
            _context.Prescriptions.Remove(prescription);
            await _context.SaveChangesAsync();
        }
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
            Items = p.Details.Select(d => new InpatientMedicineItemDto
            {
                Id = d.Id,
                MedicineId = d.MedicineId,
                MedicineCode = d.Medicine?.MedicineCode ?? string.Empty,
                MedicineName = d.Medicine?.MedicineName ?? string.Empty,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
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
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
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
        return Task.FromResult(new EmergencyCabinetPrescriptionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            CabinetId = cabinetId,
            PrescriptionDate = DateTime.Now,
            Status = 0
        });
    }

    public async Task<List<object>> GetEmergencyCabinetsAsync(Guid departmentId)
    {
        // Query warehouses that are emergency cabinets: either WarehouseType=4 or IsCabinet=true.
        // Filter by DepartmentId when provided (only that department's cabinet).
        // Falls back to all active cabinets if no match for the department.
        var query = _context.Warehouses
            .Where(w => w.IsActive && (w.WarehouseType == 4 || w.IsCabinet));

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

    public Task SaveUsageTemplateAsync(Guid medicineId, string usage, Guid userId)
    {
        return Task.CompletedTask;
    }

    public Task<PrescriptionWarningDto> CheckPrescriptionWarningsAsync(Guid admissionId, List<CreateInpatientMedicineItemDto> items)
    {
        return Task.FromResult(new PrescriptionWarningDto
        {
            HasDuplicateToday = false,
            HasDrugInteraction = false,
            HasAntibioticDuplicate = false,
            ExceedsInsuranceCeiling = false,
            IsInsuranceExpiring = false,
            IsOutsideProtocol = false
        });
    }

    public Task<PrescriptionTemplateDto> CreatePrescriptionTemplateAsync(PrescriptionTemplateDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.CreatedBy = userId;
        return Task.FromResult(dto);
    }

    public Task<List<PrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid? departmentId, Guid? userId)
    {
        return Task.FromResult(new List<PrescriptionTemplateDto>());
    }

    public Task<InpatientPrescriptionDto> PrescribeByTemplateAsync(Guid admissionId, Guid templateId, Guid userId)
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
        return Task.FromResult(new MedicineOrderSummaryDto
        {
            Id = Guid.NewGuid(),
            SummaryDate = date,
            DepartmentId = departmentId,
            RoomId = roomId,
            WarehouseId = warehouseId,
            Status = 0
        });
    }

    public Task<List<MedicineOrderSummaryDto>> GetMedicineOrderSummariesAsync(Guid departmentId, DateTime fromDate, DateTime toDate)
    {
        return Task.FromResult(new List<MedicineOrderSummaryDto>());
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
