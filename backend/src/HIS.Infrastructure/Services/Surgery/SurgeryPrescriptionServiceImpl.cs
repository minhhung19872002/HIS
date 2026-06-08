using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using BloodBankDto = HIS.Application.Services.BloodBankDto;

namespace HIS.Infrastructure.Services.Surgery;

/// <summary>
/// K12 Step 4 (2026-05-30, Plan B): Implementation ISurgeryPrescriptionService.
/// Logic copy 1-1 từ SurgeryCompleteService cũ region 6.5 + 6.5.1 + 6.6 Blood + 6.6 Consent
/// (32 method, ~426 dong).
/// </summary>
public class SurgeryPrescriptionServiceImpl : ISurgeryPrescriptionService
{
    private readonly HISDbContext _context;

    public SurgeryPrescriptionServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    #region 6.5 Kê thuốc, vật tư trong PTTT

    // F1 (audit FLOW-FINAL 2026-06-06): persist thuốc/vật tư PTTT THẬT + tính tiền (cho viện phí) +
    // trừ kho FEFO. Trước đây toàn stub in-memory → mất dữ liệu, thất thu, không trừ kho.

    public async Task<SurgeryPrescriptionDto> GetPrescriptionAsync(Guid surgeryId)
    {
        var meds = await (from m in _context.SurgeryMedicineItems.Where(x => x.SurgeryId == surgeryId && !x.IsDeleted)
                          join med in _context.Medicines on m.MedicineId equals med.Id into mj
                          from med in mj.DefaultIfEmpty()
                          select new SurgeryMedicineDto
                          {
                              Id = m.Id, SurgeryId = m.SurgeryId, MedicineId = m.MedicineId,
                              MedicineCode = med != null ? med.MedicineCode : "", MedicineName = med != null ? med.MedicineName : "",
                              Unit = med != null ? (med.Unit ?? "") : "", Quantity = m.Quantity, UnitPrice = m.UnitPrice, Amount = m.Amount,
                              IsInPackage = m.IsInPackage, WarehouseId = m.WarehouseId ?? Guid.Empty, BatchNumber = m.BatchNumber,
                              PaymentObject = m.PaymentObject, Notes = m.UsageInstruction
                          }).ToListAsync();
        var supplies = await (from s in _context.SurgerySupplyItems.Where(x => x.SurgeryId == surgeryId && !x.IsDeleted)
                              join sup in _context.MedicalSupplies on s.SupplyId equals sup.Id into sj
                              from sup in sj.DefaultIfEmpty()
                              select new SurgerySupplyDto
                              {
                                  Id = s.Id, SurgeryId = s.SurgeryId, SupplyId = s.SupplyId,
                                  SupplyCode = sup != null ? sup.SupplyCode : "", SupplyName = sup != null ? sup.SupplyName : "",
                                  Unit = sup != null ? (sup.Unit ?? "") : "", Quantity = s.Quantity, UnitPrice = s.UnitPrice, Amount = s.Amount,
                                  IsInPackage = s.IsInPackage, WarehouseId = s.WarehouseId ?? Guid.Empty,
                                  PaymentObject = s.PaymentObject, Notes = s.Notes
                              }).ToListAsync();
        return new SurgeryPrescriptionDto { SurgeryId = surgeryId, Medicines = meds, Supplies = supplies };
    }

    /// <summary>Trừ kho FEFO best-effort (vật tư PTTT đã dùng trong mổ → trừ những gì có, không chặn).</summary>
    private async Task<(bool deducted, string? batch)> DeductStockFefoAsync(Guid warehouseId, Guid? medicineId, Guid? supplyId, decimal qty)
    {
        if (warehouseId == Guid.Empty || qty <= 0) return (false, null);
        var batches = await _context.InventoryItems
            .Where(i => i.WarehouseId == warehouseId
                && ((medicineId != null && i.MedicineId == medicineId) || (supplyId != null && i.SupplyId == supplyId))
                && (i.Quantity - i.ReservedQuantity) > 0 && i.ExpiryDate >= DateTime.Today && !i.IsLocked && !i.IsDeleted)
            .OrderBy(i => i.ExpiryDate).ToListAsync();
        var remaining = qty; string? firstBatch = null;
        foreach (var b in batches)
        {
            if (remaining <= 0) break;
            var take = Math.Min(b.Quantity - b.ReservedQuantity, remaining);
            if (take <= 0) continue;
            b.Quantity -= take; remaining -= take;
            firstBatch ??= b.BatchNumber;
        }
        return (remaining <= 0, firstBatch);
    }

    public async Task<SurgeryMedicineDto> AddMedicineAsync(AddSurgeryMedicineDto dto, Guid userId)
    {
        var med = await _context.Medicines.FirstOrDefaultAsync(m => m.Id == dto.MedicineId)
            ?? throw new Exception("Không tìm thấy thuốc");
        var unitPrice = (dto.PaymentObject == 1 && med.InsurancePrice > 0) ? med.InsurancePrice : med.UnitPrice;
        var (deducted, batch) = await DeductStockFefoAsync(dto.WarehouseId, dto.MedicineId, null, dto.Quantity);
        var entity = new SurgeryMedicineItem
        {
            Id = Guid.NewGuid(), SurgeryId = dto.SurgeryId, MedicineId = dto.MedicineId,
            Quantity = dto.Quantity, UnitPrice = unitPrice, Amount = unitPrice * dto.Quantity,
            PaymentObject = dto.PaymentObject == 0 ? 2 : dto.PaymentObject,
            WarehouseId = dto.WarehouseId == Guid.Empty ? null : dto.WarehouseId,
            BatchNumber = string.IsNullOrEmpty(dto.BatchNumber) ? batch : dto.BatchNumber,
            IsInPackage = dto.IsInPackage, UsageInstruction = dto.UsageInstruction,
            IsStockDeducted = deducted, CreatedBy = userId.ToString(),
        };
        _context.SurgeryMedicineItems.Add(entity);
        await _context.SaveChangesAsync();
        return new SurgeryMedicineDto
        {
            Id = entity.Id, SurgeryId = entity.SurgeryId, MedicineId = entity.MedicineId,
            MedicineCode = med.MedicineCode, MedicineName = med.MedicineName, Unit = med.Unit ?? "",
            Quantity = entity.Quantity, UnitPrice = entity.UnitPrice, Amount = entity.Amount,
            IsInPackage = entity.IsInPackage, WarehouseId = entity.WarehouseId ?? Guid.Empty,
            BatchNumber = entity.BatchNumber, PaymentObject = entity.PaymentObject, Notes = entity.UsageInstruction
        };
    }

    public async Task<SurgerySupplyDto> AddSupplyAsync(AddSurgerySupplyDto dto, Guid userId)
    {
        var sup = await _context.MedicalSupplies.FirstOrDefaultAsync(s => s.Id == dto.SupplyId)
            ?? throw new Exception("Không tìm thấy vật tư");
        var unitPrice = (dto.PaymentObject == 1 && sup.InsurancePrice > 0) ? sup.InsurancePrice : sup.UnitPrice;
        var (deducted, batch) = await DeductStockFefoAsync(dto.WarehouseId, null, dto.SupplyId, dto.Quantity);
        var entity = new SurgerySupplyItem
        {
            Id = Guid.NewGuid(), SurgeryId = dto.SurgeryId, SupplyId = dto.SupplyId,
            Quantity = dto.Quantity, UnitPrice = unitPrice, Amount = unitPrice * dto.Quantity,
            PaymentObject = dto.PaymentObject == 0 ? 2 : dto.PaymentObject,
            WarehouseId = dto.WarehouseId == Guid.Empty ? null : dto.WarehouseId,
            BatchNumber = batch,
            IsInPackage = dto.IsInPackage, Notes = dto.Notes,
            IsStockDeducted = deducted, CreatedBy = userId.ToString(),
        };
        _context.SurgerySupplyItems.Add(entity);
        await _context.SaveChangesAsync();
        return new SurgerySupplyDto
        {
            Id = entity.Id, SurgeryId = entity.SurgeryId, SupplyId = entity.SupplyId,
            SupplyCode = sup.SupplyCode, SupplyName = sup.SupplyName, Unit = sup.Unit ?? "",
            Quantity = entity.Quantity, UnitPrice = entity.UnitPrice, Amount = entity.Amount,
            IsInPackage = entity.IsInPackage, WarehouseId = entity.WarehouseId ?? Guid.Empty,
            PaymentObject = entity.PaymentObject, Notes = entity.Notes
        };
    }

    public async Task<SurgeryMedicineDto> UpdateMedicineAsync(Guid medicineItemId, AddSurgeryMedicineDto dto, Guid userId)
    {
        var entity = await _context.SurgeryMedicineItems.FirstOrDefaultAsync(m => m.Id == medicineItemId && !m.IsDeleted);
        if (entity == null) throw new Exception("Không tìm thấy dòng thuốc PTTT");
        entity.Quantity = dto.Quantity;
        entity.Amount = entity.UnitPrice * dto.Quantity;
        entity.PaymentObject = dto.PaymentObject == 0 ? entity.PaymentObject : dto.PaymentObject;
        entity.UsageInstruction = dto.UsageInstruction;
        entity.UpdatedAt = DateTime.UtcNow; entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return new SurgeryMedicineDto { Id = entity.Id, SurgeryId = entity.SurgeryId, MedicineId = entity.MedicineId, Quantity = entity.Quantity, UnitPrice = entity.UnitPrice, Amount = entity.Amount, PaymentObject = entity.PaymentObject };
    }

    public async Task<SurgerySupplyDto> UpdateSupplyAsync(Guid supplyItemId, AddSurgerySupplyDto dto, Guid userId)
    {
        var entity = await _context.SurgerySupplyItems.FirstOrDefaultAsync(s => s.Id == supplyItemId && !s.IsDeleted);
        if (entity == null) throw new Exception("Không tìm thấy dòng vật tư PTTT");
        entity.Quantity = dto.Quantity;
        entity.Amount = entity.UnitPrice * dto.Quantity;
        entity.PaymentObject = dto.PaymentObject == 0 ? entity.PaymentObject : dto.PaymentObject;
        entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow; entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return new SurgerySupplyDto { Id = entity.Id, SurgeryId = entity.SurgeryId, SupplyId = entity.SupplyId, Quantity = entity.Quantity, UnitPrice = entity.UnitPrice, Amount = entity.Amount, PaymentObject = entity.PaymentObject };
    }

    public async Task<bool> RemoveMedicineAsync(Guid medicineItemId, Guid userId)
    {
        var entity = await _context.SurgeryMedicineItems.FirstOrDefaultAsync(m => m.Id == medicineItemId && !m.IsDeleted);
        if (entity == null) return false;
        entity.IsDeleted = true; entity.UpdatedAt = DateTime.UtcNow; entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveSupplyAsync(Guid supplyItemId, Guid userId)
    {
        var entity = await _context.SurgerySupplyItems.FirstOrDefaultAsync(s => s.Id == supplyItemId && !s.IsDeleted);
        if (entity == null) return false;
        entity.IsDeleted = true; entity.UpdatedAt = DateTime.UtcNow; entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<SurgeryPrescriptionDto> ApplyPackageAsync(Guid surgeryId, Guid packageId, Guid userId)
    {
        return GetPrescriptionAsync(surgeryId);
    }

    public Task<List<SurgeryMedicineDto>> AddFromEmergencyCabinetAsync(Guid surgeryId, Guid cabinetId, List<AddSurgeryMedicineDto> medicines, Guid userId)
    {
        return Task.FromResult(new List<SurgeryMedicineDto>());
    }

    public Task<List<MedicineDetailDto>> SearchMedicinesAsync(string keyword, Guid warehouseId)
    {
        return Task.FromResult(new List<MedicineDetailDto>
        {
            new() { Id = Guid.NewGuid(), Code = "TH001", Name = "Paracetamol 500mg", Unit = "Viên", UnitPrice = 500, StockQuantity = 1000 },
            new() { Id = Guid.NewGuid(), Code = "TH002", Name = "Cefazolin 1g", Unit = "Lọ", UnitPrice = 25000, StockQuantity = 200 }
        });
    }

    public Task<List<MedicineWarningDto>> CheckMedicineWarningsAsync(Guid surgeryId, Guid medicineId)
    {
        return Task.FromResult(new List<MedicineWarningDto>());
    }

    public Task<string?> GetContraindicationsAsync(Guid medicineId)
    {
        return Task.FromResult<string?>("Không có chống chỉ định đặc biệt");
    }

    public Task<decimal> GetMedicineStockAsync(Guid medicineId, Guid warehouseId)
    {
        return Task.FromResult(100m);
    }

    public Task<MedicineDetailDto?> GetMedicineDetailAsync(Guid medicineId, Guid warehouseId)
    {
        return Task.FromResult<MedicineDetailDto?>(new MedicineDetailDto
        {
            Id = medicineId,
            Code = "TH001",
            Name = "Paracetamol 500mg",
            Unit = "Viên",
            UnitPrice = 500,
            StockQuantity = 1000
        });
    }

    #endregion

    #region 6.5.1 Mẫu đơn thuốc

    public Task<List<SurgeryPrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid userId, Guid? surgeryServiceId)
    {
        return Task.FromResult(new List<SurgeryPrescriptionTemplateDto>
        {
            new() { Id = Guid.NewGuid(), Code = "MAU001", Name = "Mẫu thuốc cắt ruột thừa", IsShared = true },
            new() { Id = Guid.NewGuid(), Code = "MAU002", Name = "Mẫu thuốc sau mổ tim", IsShared = true }
        });
    }

    public Task<SurgeryPrescriptionTemplateDto> SavePrescriptionTemplateAsync(SurgeryPrescriptionTemplateDto dto, Guid userId)
    {
        dto.Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id;
        dto.CreatedBy = userId;
        return Task.FromResult(dto);
    }

    public Task<bool> DeletePrescriptionTemplateAsync(Guid templateId, Guid userId)
    {
        return Task.FromResult(true);
    }

    public Task<SurgeryPrescriptionTemplateDto> SharePrescriptionTemplateAsync(Guid templateId, Guid userId)
    {
        return Task.FromResult(new SurgeryPrescriptionTemplateDto { Id = templateId, IsShared = true });
    }

    public Task<SurgeryPrescriptionDto> ApplyPrescriptionTemplateAsync(Guid surgeryId, Guid templateId, Guid userId)
    {
        return GetPrescriptionAsync(surgeryId);
    }

    public Task<SurgeryPrescriptionDto> CopyPrescriptionAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId)
    {
        return GetPrescriptionAsync(surgeryId);
    }

    #endregion

    #region 6.6 Kê đơn máu trong PTTT

    public Task<SurgeryBloodOrderDto?> GetBloodOrderAsync(Guid surgeryId)
    {
        return Task.FromResult<SurgeryBloodOrderDto?>(null);
    }

    public Task<SurgeryBloodOrderDto> CreateBloodOrderAsync(CreateBloodOrderDto dto, Guid userId)
    {
        return Task.FromResult(new SurgeryBloodOrderDto
        {
            Id = Guid.NewGuid(),
            SurgeryId = dto.SurgeryId,
            BloodBankId = dto.BloodBankId,
            Status = 0,
            OrderedAt = DateTime.Now,
            OrderedBy = userId
        });
    }

    public Task<SurgeryBloodOrderDto> UpdateBloodOrderAsync(Guid orderId, CreateBloodOrderDto dto, Guid userId)
    {
        return Task.FromResult(new SurgeryBloodOrderDto { Id = orderId });
    }

    public Task<bool> DeleteBloodOrderAsync(Guid orderId, Guid userId)
    {
        return Task.FromResult(true);
    }

    public Task<List<BloodBankDto>> GetBloodBanksAsync()
    {
        return Task.FromResult(new List<BloodBankDto>
        {
            new() { Id = Guid.NewGuid(), Code = "KM001", Name = "Kho máu Trung tâm", IsActive = true },
            new() { Id = Guid.NewGuid(), Code = "KM002", Name = "Kho máu Cấp cứu", IsActive = true }
        });
    }

    public Task<List<BloodProductItemDto>> SearchBloodProductsAsync(Guid bloodBankId, string? bloodType, string? rhFactor)
    {
        return Task.FromResult(new List<BloodProductItemDto>
        {
            new() { Id = Guid.NewGuid(), ProductCode = "CPM001", ProductName = "Hồng cầu khối", BloodType = "A", RhFactor = "+", Volume = 350, StockQuantity = 10 },
            new() { Id = Guid.NewGuid(), ProductCode = "CPM002", ProductName = "Huyết tương tươi", BloodType = "O", RhFactor = "+", Volume = 200, StockQuantity = 5 }
        });
    }

    public Task<decimal> GetBloodProductStockAsync(Guid bloodProductId, Guid bloodBankId)
    {
        return Task.FromResult(10m);
    }

    #endregion
    #region 6.6 Quản lý cam kết phẫu thuật

    public async Task<List<SurgeryConsentDto>> GetSurgeryConsentsAsync(Guid surgeryId)
    {
        var surgery = await _context.Set<SurgeryRequest>()
            .Include(s => s.Patient)
            .FirstOrDefaultAsync(s => s.Id == surgeryId);

        if (surgery == null) return new List<SurgeryConsentDto>();

        try
        {
            var consents = await _context.Database.SqlQueryRaw<SurgeryConsentRaw>(
                @"SELECT Id, SurgeryId, ConsentType, Diagnosis, PlannedProcedure, Risks, Alternatives,
                         DoctorExplanation, SignerName, SignerRelationship, SignedAt, IsSigned, DoctorId, CreatedAt
                  FROM SurgeryConsents WHERE SurgeryId = {0} AND IsDeleted = 0
                  ORDER BY ConsentType", surgeryId).ToListAsync();

            var doctorIds = consents.Where(c => c.DoctorId != null).Select(c => c.DoctorId!.Value).Distinct().ToList();
            var doctors = doctorIds.Count > 0
                ? await _context.Users.Where(u => doctorIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName)
                : new Dictionary<Guid, string>();

            return consents.Select(c => new SurgeryConsentDto
            {
                Id = c.Id,
                SurgeryId = c.SurgeryId,
                ConsentType = c.ConsentType,
                ConsentTypeName = GetConsentTypeName(c.ConsentType),
                PatientName = surgery.Patient?.FullName ?? "",
                PatientId = surgery.Patient?.PatientCode,
                Diagnosis = c.Diagnosis,
                PlannedProcedure = c.PlannedProcedure,
                Risks = c.Risks,
                Alternatives = c.Alternatives,
                DoctorExplanation = c.DoctorExplanation,
                SignerName = c.SignerName,
                SignerRelationship = c.SignerRelationship,
                SignedAt = c.SignedAt,
                IsSigned = c.IsSigned,
                DoctorName = c.DoctorId != null && doctors.ContainsKey(c.DoctorId.Value) ? doctors[c.DoctorId.Value] : null,
                CreatedAt = c.CreatedAt
            }).ToList();
        }
        catch
        {
            // Table may not exist yet
            return new List<SurgeryConsentDto>();
        }
    }

    public async Task<SurgeryConsentDto> SaveSurgeryConsentAsync(SaveSurgeryConsentDto dto, Guid userId)
    {
        var surgery = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId)
            ?? throw new InvalidOperationException("Không tìm thấy ca phẫu thuật");

        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE SurgeryConsents SET Diagnosis = {0}, PlannedProcedure = {1}, Risks = {2},
                  Alternatives = {3}, DoctorExplanation = {4}, UpdatedAt = GETDATE(), UpdatedBy = {5}
                  WHERE Id = {6}",
                dto.Diagnosis ?? "", dto.PlannedProcedure ?? "", dto.Risks ?? "",
                dto.Alternatives ?? "", dto.DoctorExplanation ?? "", userId.ToString(), dto.Id.Value);
        }
        else
        {
            var newId = Guid.NewGuid();
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO SurgeryConsents (Id, SurgeryId, ConsentType, Diagnosis, PlannedProcedure,
                  Risks, Alternatives, DoctorExplanation, DoctorId, IsSigned, IsDeleted, CreatedAt, CreatedBy)
                  VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, 0, 0, GETDATE(), {9})",
                newId, dto.SurgeryId, dto.ConsentType, dto.Diagnosis ?? "", dto.PlannedProcedure ?? "",
                dto.Risks ?? "", dto.Alternatives ?? "", dto.DoctorExplanation ?? "", userId, userId.ToString());
            dto.Id = newId;
        }

        var consents = await GetSurgeryConsentsAsync(dto.SurgeryId);
        return consents.FirstOrDefault(c => c.Id == dto.Id) ?? new SurgeryConsentDto { Id = dto.Id ?? Guid.NewGuid(), SurgeryId = dto.SurgeryId };
    }

    public async Task<SurgeryConsentDto> SignConsentAsync(Guid consentId, string signerName, string relationship, Guid userId)
    {
        await _context.Database.ExecuteSqlRawAsync(
            @"UPDATE SurgeryConsents SET SignerName = {0}, SignerRelationship = {1},
              SignedAt = GETDATE(), IsSigned = 1, UpdatedAt = GETDATE(), UpdatedBy = {2}
              WHERE Id = {3}",
            signerName, relationship, userId.ToString(), consentId);

        return new SurgeryConsentDto
        {
            Id = consentId, IsSigned = true, SignerName = signerName,
            SignerRelationship = relationship, SignedAt = DateTime.Now
        };
    }

    public async Task<ConsentValidationResult> ValidateConsentsBeforeSurgeryAsync(Guid surgeryId)
    {
        var consents = await GetSurgeryConsentsAsync(surgeryId);
        var result = new ConsentValidationResult { IsValid = true };

        // Cam kết PT bắt buộc
        var ptConsent = consents.FirstOrDefault(c => c.ConsentType == 1);
        if (ptConsent == null)
        {
            result.IsValid = false;
            result.MissingConsents.Add(GetConsentTypeName(1));
        }
        else if (!ptConsent.IsSigned)
        {
            result.IsValid = false;
            result.UnsignedConsents.Add(GetConsentTypeName(1));
        }

        // Nếu có gây mê → bắt buộc cam kết gây mê
        var surgery = await _context.Set<SurgeryRequest>().FindAsync(surgeryId);
        if (surgery != null && surgery.AnesthesiaType > 0)
        {
            var anes = consents.FirstOrDefault(c => c.ConsentType == 2);
            if (anes == null)
            {
                result.IsValid = false;
                result.MissingConsents.Add(GetConsentTypeName(2));
            }
            else if (!anes.IsSigned)
            {
                result.IsValid = false;
                result.UnsignedConsents.Add(GetConsentTypeName(2));
            }
        }

        if (!result.IsValid)
        {
            var msgs = new List<string>();
            if (result.MissingConsents.Count > 0) msgs.Add($"Thiếu: {string.Join(", ", result.MissingConsents)}");
            if (result.UnsignedConsents.Count > 0) msgs.Add($"Chưa ký: {string.Join(", ", result.UnsignedConsents)}");
            result.Message = string.Join(". ", msgs);
        }
        else
        {
            result.Message = "Đã đủ cam kết phẫu thuật";
        }

        return result;
    }

    public async Task<byte[]> PrintConsentFormAsync(Guid consentId)
    {
        try
        {
            var consentRaw = await _context.Database.SqlQueryRaw<SurgeryConsentRaw>(
                @"SELECT Id, SurgeryId, ConsentType, Diagnosis, PlannedProcedure, Risks, Alternatives,
                         DoctorExplanation, SignerName, SignerRelationship, SignedAt, IsSigned, DoctorId, CreatedAt
                  FROM SurgeryConsents WHERE Id = {0} AND IsDeleted = 0", consentId).FirstOrDefaultAsync();
            if (consentRaw == null) return Array.Empty<byte>();

            var surgery = await _context.Set<SurgeryRequest>()
                .Include(s => s.Patient)
                .FirstOrDefaultAsync(s => s.Id == consentRaw.SurgeryId);
            var pat = surgery?.Patient;

            var doctorName = "";
            if (consentRaw.DoctorId.HasValue)
            {
                var doc = await _context.Users.FindAsync(consentRaw.DoctorId.Value);
                doctorName = doc?.FullName ?? "";
            }

            var consentTypeName = GetConsentTypeName(consentRaw.ConsentType);

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine($@"<div class=""form-title"">GIAY {consentTypeName.ToUpper()}</div>");
            body.AppendLine($@"<div class=""form-number"">MS. CK-{consentRaw.ConsentType:D2}</div>");

            if (pat != null)
                body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""section-title"">I. CHAN DOAN VA PHUONG PHAP</div>
<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(consentRaw.Diagnosis)}</span></div>
<div class=""field""><span class=""field-label"">Phuong phap du kien:</span><span class=""field-value"">{Esc(consentRaw.PlannedProcedure)}</span></div>

<div class=""section-title"">II. NGUY CO VA TAC DUNG PHU</div>
<div class=""field""><span class=""field-value"">{Esc(consentRaw.Risks ?? "Khong co ghi nhan")}</span></div>

<div class=""section-title"">III. PHUONG PHAP THAY THE</div>
<div class=""field""><span class=""field-value"">{Esc(consentRaw.Alternatives ?? "Khong co")}</span></div>");

            if (!string.IsNullOrEmpty(consentRaw.DoctorExplanation))
            {
                body.AppendLine($@"
<div class=""section-title"">IV. GIAI THICH CUA BAC SI</div>
<div class=""field""><span class=""field-value"">{Esc(consentRaw.DoctorExplanation)}</span></div>");
            }

            body.AppendLine($@"
<div class=""section-title"">CAM KET</div>
<p>Toi da duoc bac si {Esc(doctorName)} giai thich day du ve tinh trang benh, phuong phap dieu tri, cac nguy co co the xay ra. Toi dong y va cam ket thuc hien {Esc(consentTypeName?.ToLower())} theo phuong phap da neu tren.</p>");

            if (consentRaw.IsSigned)
            {
                body.AppendLine($@"
<div class=""field""><span class=""field-label"">Nguoi ky:</span><span class=""field-value"">{Esc(consentRaw.SignerName)}</span></div>
<div class=""field""><span class=""field-label"">Quan he:</span><span class=""field-value"">{Esc(consentRaw.SignerRelationship)}</span></div>
<div class=""field""><span class=""field-label"">Ngay ky:</span><span class=""field-value"">{consentRaw.SignedAt?.ToString("dd/MM/yyyy HH:mm") ?? ""}</span></div>");
            }

            body.AppendLine(GetSignatureBlock(doctorName, null, null, false));

            var html = WrapHtmlPage($"{consentTypeName} - MS.CK-{consentRaw.ConsentType:D2}", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    private static string GetConsentTypeName(int type) => type switch
    {
        1 => "Cam kết phẫu thuật",
        2 => "Cam kết gây mê",
        3 => "Cam kết truyền máu",
        4 => "Cam kết thủ thuật",
        _ => "Cam kết khác"
    };

    #endregion
}
