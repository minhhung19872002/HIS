using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class TraditionalMedicineService : ITraditionalMedicineService
{
    private readonly HISDbContext _context;
    private readonly ILogger<TraditionalMedicineService> _logger;

    public TraditionalMedicineService(HISDbContext context, ILogger<TraditionalMedicineService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<TraditionalMedicineTreatmentDto>> SearchTreatmentsAsync(TraditionalMedicineSearchDto? filter = null)
    {
        try
        {
            var query = _context.TraditionalMedicineTreatments.Where(t => !t.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(t =>
                        t.TreatmentCode.ToLower().Contains(kw) ||
                        t.PatientName.ToLower().Contains(kw) ||
                        (t.DiagnosisTCM != null && t.DiagnosisTCM.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.TreatmentType))
                    query = query.Where(t => t.TreatmentType == filter.TreatmentType);
                if (filter.Status.HasValue)
                    query = query.Where(t => t.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(t => t.StartDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(t => t.StartDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(t => t.CreatedAt)
                .Take(200)
                .Select(t => new TraditionalMedicineTreatmentDto
                {
                    Id = t.Id,
                    TreatmentCode = t.TreatmentCode,
                    PatientName = t.PatientName,
                    PatientId = t.PatientId,
                    TreatmentType = t.TreatmentType,
                    DiagnosisTCM = t.DiagnosisTCM,
                    DiagnosisWestern = t.DiagnosisWestern,
                    SessionNumber = t.SessionNumber,
                    TreatmentPlan = t.TreatmentPlan,
                    Practitioner = t.Practitioner,
                    Status = t.Status,
                    StartDate = t.StartDate.HasValue ? t.StartDate.Value.ToString("yyyy-MM-dd") : null,
                    EndDate = t.EndDate.HasValue ? t.EndDate.Value.ToString("yyyy-MM-dd") : null,
                    Notes = t.Notes,
                })
                .ToListAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "TraditionalMedicineService thao tác thất bại, trả giá trị mặc định"); return new List<TraditionalMedicineTreatmentDto>(); }
    }

    public async Task<TraditionalMedicineTreatmentDetailDto?> GetByIdAsync(Guid id)
    {
        try
        {
            var t = await _context.TraditionalMedicineTreatments
                .Include(x => x.HerbalPrescriptions.Where(h => !h.IsDeleted))
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (t == null) return null;

            return new TraditionalMedicineTreatmentDetailDto
            {
                Id = t.Id,
                TreatmentCode = t.TreatmentCode,
                PatientName = t.PatientName,
                PatientId = t.PatientId,
                TreatmentType = t.TreatmentType,
                DiagnosisTCM = t.DiagnosisTCM,
                DiagnosisWestern = t.DiagnosisWestern,
                SessionNumber = t.SessionNumber,
                TreatmentPlan = t.TreatmentPlan,
                Practitioner = t.Practitioner,
                Status = t.Status,
                StartDate = t.StartDate?.ToString("yyyy-MM-dd"),
                EndDate = t.EndDate?.ToString("yyyy-MM-dd"),
                Notes = t.Notes,
                HerbalPrescriptions = t.HerbalPrescriptions.Select(h => new HerbalPrescriptionDto
                {
                    Id = h.Id,
                    TreatmentId = h.TreatmentId,
                    PrescriptionCode = h.PrescriptionCode,
                    HerbalFormula = h.HerbalFormula,
                    Ingredients = h.Ingredients,
                    Dosage = h.Dosage,
                    Instructions = h.Instructions,
                    Duration = h.Duration,
                    Quantity = h.Quantity,
                    Notes = h.Notes,
                }).ToList(),
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "TraditionalMedicineService thao tác thất bại, trả giá trị mặc định"); return null; }
    }

    public async Task<TraditionalMedicineTreatmentDto> CreateTreatmentAsync(CreateTraditionalMedicineTreatmentDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.TraditionalMedicineTreatments.CountAsync(t => t.CreatedAt.Year == year) + 1;

        var entity = new TraditionalMedicineTreatment
        {
            Id = Guid.NewGuid(),
            TreatmentCode = $"YHCT-{year}-{count:D4}",
            PatientId = dto.PatientId ?? Guid.Empty,
            PatientName = dto.PatientName ?? "",
            TreatmentType = dto.TreatmentType ?? "combined",
            DiagnosisTCM = dto.DiagnosisTCM,
            DiagnosisWestern = dto.DiagnosisWestern,
            SessionNumber = dto.SessionNumber ?? 1,
            TreatmentPlan = dto.TreatmentPlan,
            Practitioner = dto.Practitioner,
            Status = 0,
            StartDate = DateTime.TryParse(dto.StartDate, out var sd) ? sd : DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.TraditionalMedicineTreatments.Add(entity);
        await _context.SaveChangesAsync();

        return new TraditionalMedicineTreatmentDto
        {
            Id = entity.Id,
            TreatmentCode = entity.TreatmentCode,
            PatientName = entity.PatientName,
            PatientId = entity.PatientId,
            TreatmentType = entity.TreatmentType,
            Status = entity.Status,
        };
    }

    public async Task<TraditionalMedicineTreatmentDto> UpdateTreatmentAsync(Guid id, CreateTraditionalMedicineTreatmentDto dto)
    {
        var entity = await _context.TraditionalMedicineTreatments.FindAsync(id)
            ?? throw new InvalidOperationException("Treatment not found");

        if (dto.TreatmentType != null) entity.TreatmentType = dto.TreatmentType;
        if (dto.DiagnosisTCM != null) entity.DiagnosisTCM = dto.DiagnosisTCM;
        if (dto.DiagnosisWestern != null) entity.DiagnosisWestern = dto.DiagnosisWestern;
        if (dto.SessionNumber.HasValue) entity.SessionNumber = dto.SessionNumber.Value;
        if (dto.TreatmentPlan != null) entity.TreatmentPlan = dto.TreatmentPlan;
        if (dto.Practitioner != null) entity.Practitioner = dto.Practitioner;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new TraditionalMedicineTreatmentDto
        {
            Id = entity.Id,
            TreatmentCode = entity.TreatmentCode,
            PatientName = entity.PatientName,
            PatientId = entity.PatientId,
            TreatmentType = entity.TreatmentType,
            Status = entity.Status,
        };
    }

    public async Task<HerbalPrescriptionDto> CreateHerbalPrescriptionAsync(CreateHerbalPrescriptionDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.HerbalPrescriptions.CountAsync(h => h.CreatedAt.Year == year) + 1;

        var entity = new HerbalPrescription
        {
            Id = Guid.NewGuid(),
            TreatmentId = dto.TreatmentId ?? Guid.Empty,
            PrescriptionCode = $"BT-{year}-{count:D4}",
            HerbalFormula = dto.HerbalFormula,
            Ingredients = dto.Ingredients,
            Dosage = dto.Dosage,
            Instructions = dto.Instructions,
            Duration = dto.Duration ?? 7,
            Quantity = dto.Quantity ?? 1,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.HerbalPrescriptions.Add(entity);

        // F6 (audit FLOW-FINAL 2026-06-06): đơn thuốc bắc structured → sinh Prescription tính phí + trừ kho dược liệu.
        // Trước đây chỉ lưu công thức free-text, không vào viện phí, không trừ kho.
        await BillHerbalPrescriptionAsync(entity);

        await _context.SaveChangesAsync();

        return new HerbalPrescriptionDto
        {
            Id = entity.Id,
            TreatmentId = entity.TreatmentId,
            PrescriptionCode = entity.PrescriptionCode,
            HerbalFormula = entity.HerbalFormula,
            Ingredients = entity.Ingredients,
            Dosage = entity.Dosage,
            Instructions = entity.Instructions,
            Duration = entity.Duration,
            Quantity = entity.Quantity,
            Notes = entity.Notes,
        };
    }

    private sealed class HerbIngredient
    {
        public Guid MedicineId { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
        public string? Name { get; set; }
    }

    /// <summary>F6: parse ingredients structured (JSON `[{medicineId,quantity,unit,name}]`) → tạo Prescription
    /// (type 4 YHCT, Status=0 → quầy phát thấy) tính phí per-vị × số thang + trừ kho FEFO. Best-effort, idempotent
    /// theo PrescriptionCode=YHCT-{herbalRxId}. Free-text (không JSON) → bỏ qua billing (giữ tương thích đơn cũ).</summary>
    private async Task BillHerbalPrescriptionAsync(HerbalPrescription herbal)
    {
        List<HerbIngredient> items;
        try
        {
            if (string.IsNullOrWhiteSpace(herbal.Ingredients) || !herbal.Ingredients.TrimStart().StartsWith("[")) return;
            items = JsonSerializer.Deserialize<List<HerbIngredient>>(herbal.Ingredients,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
        }
        catch { return; } // không phải JSON structured → giữ free-text, không bill
        items = items.Where(i => i.MedicineId != Guid.Empty && i.Quantity > 0).ToList();
        if (items.Count == 0) return;

        var rxCode = $"YHCT-{herbal.Id:N}";
        if (await _context.Prescriptions.AnyAsync(p => p.PrescriptionCode == rxCode)) return; // đã tính phí

        var treatment = await _context.TraditionalMedicineTreatments.FindAsync(herbal.TreatmentId);
        if (treatment == null || treatment.PatientId == Guid.Empty) return;

        var mr = await _context.MedicalRecords
            .Where(m => m.PatientId == treatment.PatientId && !m.IsDeleted)
            .OrderByDescending(m => m.AdmissionDate)
            .Select(m => new { m.Id, m.DepartmentId })
            .FirstOrDefaultAsync();
        if (mr == null || mr.Id == Guid.Empty) return; // không có HSBA → không bill

        Guid? deptId = mr.DepartmentId;
        if (deptId == null || deptId == Guid.Empty)
            deptId = (await _context.Departments.FirstOrDefaultAsync(d => !d.IsDeleted))?.Id;
        if (deptId == null || deptId == Guid.Empty) return;

        var doctorId = await _context.Users.Where(u => !u.IsDeleted).Select(u => u.Id).FirstOrDefaultAsync();
        if (doctorId == Guid.Empty) return;
        var by = doctorId.ToString();

        var soThang = herbal.Quantity > 0 ? herbal.Quantity : 1; // số thang
        var rx = new Prescription
        {
            Id = Guid.NewGuid(),
            PrescriptionCode = rxCode,
            PrescriptionDate = DateTime.Now,
            MedicalRecordId = mr.Id,
            DoctorId = doctorId,
            DepartmentId = deptId.Value,
            PrescriptionType = 4, // YHCT
            PaymentCategory = 2,  // Thu phí
            Status = 0,           // Chờ duyệt/phát → quầy phát thấy
            TotalTangs = soThang,
            Note = $"Đơn thuốc bắc {herbal.PrescriptionCode} ({soThang} thang)",
            CreatedAt = DateTime.Now,
            CreatedBy = by,
            Details = new List<PrescriptionDetail>(),
        };
        decimal total = 0;
        foreach (var it in items)
        {
            var med = await _context.Medicines.FindAsync(it.MedicineId);
            if (med == null) continue;
            var totalQty = it.Quantity * soThang; // lượng dùng cả đợt = mỗi thang × số thang
            var amount = med.UnitPrice * totalQty;
            total += amount;
            await DeductHerbStockFefoAsync(it.MedicineId, totalQty);
            rx.Details.Add(new PrescriptionDetail
            {
                Id = Guid.NewGuid(), PrescriptionId = rx.Id,
                MedicineId = it.MedicineId, Quantity = totalQty,
                Unit = string.IsNullOrEmpty(it.Unit) ? med.Unit : it.Unit,
                UnitPrice = med.UnitPrice, Amount = amount, TotalPrice = amount, PatientAmount = amount,
                PatientType = 2, Status = 0,
                CreatedAt = DateTime.Now, CreatedBy = by,
            });
        }
        rx.TotalAmount = total; rx.PatientAmount = total;
        _context.Prescriptions.Add(rx);
    }

    /// <summary>F6: trừ kho FEFO best-effort cho 1 vị thuốc (gộp mọi kho theo lô sớm hết hạn trước).</summary>
    private async Task<bool> DeductHerbStockFefoAsync(Guid medicineId, decimal qty)
    {
        if (qty <= 0) return false;
        var batches = await _context.InventoryItems
            .Where(i => i.MedicineId == medicineId && (i.Quantity - i.ReservedQuantity) > 0
                && i.ExpiryDate >= DateTime.Today && !i.IsLocked && !i.IsDeleted)
            .OrderBy(i => i.ExpiryDate).ToListAsync();
        var remaining = qty;
        foreach (var b in batches)
        {
            if (remaining <= 0) break;
            var take = Math.Min(b.Quantity - b.ReservedQuantity, remaining);
            if (take <= 0) continue;
            b.Quantity -= take; remaining -= take;
        }
        return remaining <= 0;
    }

    /// <summary>F6: danh mục vị thuốc bắc (Medicine type=2) cho herb-picker FE — kèm tồn khả dụng + đơn giá.</summary>
    public async Task<List<HerbItemDto>> GetHerbsAsync(string? keyword)
    {
        var q = _context.Medicines.Where(m => m.MedicineType == 2 && m.IsActive && !m.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(m => m.MedicineName.Contains(kw) || m.MedicineCode.Contains(kw));
        }
        var meds = await q.OrderBy(m => m.MedicineName).Take(200).ToListAsync();
        var ids = meds.Select(m => m.Id).ToList();
        var stock = await _context.InventoryItems
            .Where(i => i.MedicineId != null && ids.Contains(i.MedicineId.Value) && !i.IsDeleted && !i.IsLocked
                && i.ExpiryDate >= DateTime.Today)
            .GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { MedicineId = g.Key, Stock = g.Sum(x => x.Quantity - x.ReservedQuantity) })
            .ToDictionaryAsync(x => x.MedicineId, x => x.Stock);
        return meds.Select(m => new HerbItemDto
        {
            Id = m.Id, Code = m.MedicineCode, Name = m.MedicineName,
            Unit = m.Unit ?? "g", UnitPrice = m.UnitPrice,
            Stock = stock.TryGetValue(m.Id, out var s) ? s : 0,
        }).ToList();
    }

    public async Task<List<HerbalPrescriptionDto>> GetHerbalPrescriptionsAsync(Guid treatmentId)
    {
        try
        {
            return await _context.HerbalPrescriptions
                .Where(h => h.TreatmentId == treatmentId && !h.IsDeleted)
                .OrderByDescending(h => h.CreatedAt)
                .Select(h => new HerbalPrescriptionDto
                {
                    Id = h.Id,
                    TreatmentId = h.TreatmentId,
                    PrescriptionCode = h.PrescriptionCode,
                    HerbalFormula = h.HerbalFormula,
                    Ingredients = h.Ingredients,
                    Dosage = h.Dosage,
                    Instructions = h.Instructions,
                    Duration = h.Duration,
                    Quantity = h.Quantity,
                    Notes = h.Notes,
                })
                .ToListAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "TraditionalMedicineService thao tác thất bại, trả giá trị mặc định"); return new List<HerbalPrescriptionDto>(); }
    }

    public async Task<TraditionalMedicineStatsDto> GetStatsAsync()
    {
        try
        {
            var treatments = await _context.TraditionalMedicineTreatments.Where(t => !t.IsDeleted).ToListAsync();
            return new TraditionalMedicineStatsDto
            {
                TotalTreatments = treatments.Count,
                ActiveCount = treatments.Count(t => t.Status == 0),
                CompletedCount = treatments.Count(t => t.Status == 1),
                TreatmentTypeBreakdown = treatments.GroupBy(t => t.TreatmentType)
                    .Select(g => new TreatmentTypeBreakdownDto { TreatmentType = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "TraditionalMedicineService thao tác thất bại, trả giá trị mặc định"); return new TraditionalMedicineStatsDto(); }
    }

    public async Task<TraditionalMedicineTreatmentDto> CompleteTreatmentAsync(Guid id)
    {
        var entity = await _context.TraditionalMedicineTreatments.FindAsync(id)
            ?? throw new InvalidOperationException("Treatment not found");

        entity.Status = 1; // completed
        entity.EndDate = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new TraditionalMedicineTreatmentDto
        {
            Id = entity.Id,
            TreatmentCode = entity.TreatmentCode,
            PatientName = entity.PatientName,
            PatientId = entity.PatientId,
            TreatmentType = entity.TreatmentType,
            Status = entity.Status,
        };
    }
}
