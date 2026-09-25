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
        // QA-R11: a name-only treatment was saved with PatientId = Guid.Empty — its herbal prescriptions then skipped
        // billing silently (BillHerbalPrescriptionAsync returns when there is no patient) while the page said
        // "vào viện phí". The treatment must belong to a real patient; the name comes from the patient record.
        if (!dto.PatientId.HasValue || dto.PatientId == Guid.Empty)
            throw new ArgumentException("Chưa chọn bệnh nhân (tra theo mã BN / họ tên).", nameof(dto.PatientId));
        var patient = await _context.Patients.AsNoTracking().Where(p => p.Id == dto.PatientId.Value && !p.IsDeleted)
            .Select(p => new { p.Id, p.FullName }).FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy bệnh nhân.");

        var year = DateTime.UtcNow.Year;
        // Count-based numbering reused a code once a treatment was soft-deleted (the filter hides it from the count).
        var prefix = $"YHCT-{year}-";
        var lastCode = await _context.TraditionalMedicineTreatments.IgnoreQueryFilters()
            .Where(t => t.TreatmentCode.StartsWith(prefix))
            .OrderByDescending(t => t.TreatmentCode).Select(t => t.TreatmentCode).FirstOrDefaultAsync();
        var count = lastCode != null && int.TryParse(lastCode.Substring(prefix.Length), out var n) ? n + 1 : 1;

        var entity = new TraditionalMedicineTreatment
        {
            Id = Guid.NewGuid(),
            TreatmentCode = $"{prefix}{count:D4}",
            PatientId = patient.Id,
            PatientName = patient.FullName ?? dto.PatientName ?? "",
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
            ?? throw new KeyNotFoundException("Không tìm thấy đợt điều trị YHCT.");
        // QA-R11: a completed/cancelled treatment could still be edited (diagnosis, practitioner, plan …).
        if (entity.Status != 0)
            throw new InvalidOperationException("Đợt điều trị đã kết thúc/hủy — không sửa được.");

        if (dto.TreatmentType != null) entity.TreatmentType = dto.TreatmentType;
        if (!string.IsNullOrWhiteSpace(dto.StartDate) && DateTime.TryParse(dto.StartDate, out var sd)) entity.StartDate = sd;
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
        // QA-R2: a missing/finished treatment still created (and billed) a herbal Rx with TreatmentId = Guid.Empty.
        var treatment = dto.TreatmentId.HasValue
            ? await _context.TraditionalMedicineTreatments.FirstOrDefaultAsync(t => t.Id == dto.TreatmentId.Value && !t.IsDeleted)
            : null;
        if (treatment == null)
            throw new KeyNotFoundException("Không tìm thấy đợt điều trị YHCT.");
        if (treatment.Status != 0)
            throw new InvalidOperationException("Đợt điều trị đã kết thúc/hủy — không thể kê thêm đơn thuốc bắc.");
        if (dto.Quantity is <= 0 || dto.Duration is <= 0)
            throw new ArgumentException("Số thang và thời gian dùng phải lớn hơn 0.");

        var year = DateTime.UtcNow.Year;
        var rxPrefix = $"BT-{year}-";
        var lastRx = await _context.HerbalPrescriptions.IgnoreQueryFilters()
            .Where(h => h.PrescriptionCode.StartsWith(rxPrefix))
            .OrderByDescending(h => h.PrescriptionCode).Select(h => h.PrescriptionCode).FirstOrDefaultAsync();
        var count = lastRx != null && int.TryParse(lastRx.Substring(rxPrefix.Length), out var rn) ? rn + 1 : 1;

        var entity = new HerbalPrescription
        {
            Id = Guid.NewGuid(),
            TreatmentId = dto.TreatmentId ?? Guid.Empty,
            PrescriptionCode = $"{rxPrefix}{count:D4}",
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

        // F6 (audit FLOW-FINAL 2026-06-06): đơn thuốc bắc structured → sinh Prescription tính phí (kho trừ khi quầy phát).
        // Trước đây chỉ lưu công thức free-text, không vào viện phí, không trừ kho.
        await BillHerbalPrescriptionAsync(entity, dto.PrescriberId);

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
    /// (type 4 YHCT, Status=0 → quầy phát thấy) tính phí per-vị × số thang (kho trừ lúc quầy phát). Idempotent
    /// theo PrescriptionCode=YHCT-{herbalRxId}. Free-text (không JSON) → bỏ qua billing (giữ tương thích đơn cũ).</summary>
    private async Task BillHerbalPrescriptionAsync(HerbalPrescription herbal, Guid? prescriberId)
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
        // QA-R11: every gap below used to "return" silently — the herbal Rx was saved and the page reported
        // "Đã tạo đơn thuốc bắc + vào viện phí" although nothing was billed; department and prescribing doctor were
        // "the first department / first user in the table". Each gap is now a real error (as in telemedicine F8).
        if (treatment == null || treatment.PatientId == Guid.Empty)
            throw new InvalidOperationException("Đợt điều trị YHCT chưa gắn bệnh nhân — không tính phí đơn thuốc bắc được.");

        var mr = await _context.MedicalRecords
            .Where(m => m.PatientId == treatment.PatientId && !m.IsDeleted)
            .OrderByDescending(m => m.AdmissionDate)
            .Select(m => new { m.Id, m.DepartmentId })
            .FirstOrDefaultAsync();
        if (mr == null || mr.Id == Guid.Empty)
            throw new InvalidOperationException("Người bệnh chưa có hồ sơ bệnh án — không tính phí đơn thuốc bắc được.");

        Guid? deptId = mr.DepartmentId;
        if (deptId == null || deptId == Guid.Empty)
            throw new InvalidOperationException("Hồ sơ bệnh án chưa có khoa điều trị — không xác định được khoa chỉ định đơn.");

        if (!prescriberId.HasValue || prescriberId == Guid.Empty || !await _context.Users.AnyAsync(u => u.Id == prescriberId.Value && !u.IsDeleted))
            throw new InvalidOperationException("Không xác định được bác sĩ kê đơn.");
        var doctorId = prescriberId.Value;
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
        // #195: tra danh mục thuốc 1 lần cho cả đơn thay vì 1 query/vị thuốc.
        var herbIds = items.Select(i => i.MedicineId).Distinct().ToList();
        var herbsById = await _context.Medicines
            .Where(m => herbIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);

        decimal total = 0;
        foreach (var it in items)
        {
            if (!herbsById.TryGetValue(it.MedicineId, out var med)) continue;
            var totalQty = it.Quantity * soThang; // lượng dùng cả đợt = mỗi thang × số thang
            var amount = med.UnitPrice * totalQty;
            total += amount;
            // QA-R11: stock was also deducted HERE (FEFO) although this Prescription (Status 0) is then dispensed at the
            // counter, whose DispenseOutpatientPrescriptionAsync deducts the same quantity again → every herbal Rx took
            // its herbs out of stock twice. Stock now leaves only when the counter dispenses.
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

    public async Task<TraditionalMedicineTreatmentDto> CancelTreatmentAsync(Guid id, string? reason)
    {
        var entity = await _context.TraditionalMedicineTreatments.FindAsync(id)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt điều trị YHCT.");
        if (entity.Status != 0)
            throw new InvalidOperationException("Chỉ hủy được đợt điều trị đang hoạt động.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Phải nhập lý do hủy đợt điều trị", nameof(reason));
        entity.Status = 2; // cancelled
        entity.EndDate = HIS.Core.Common.VnTime.NowVn;
        entity.Notes = string.IsNullOrEmpty(entity.Notes) ? $"[Hủy] {reason.Trim()}" : $"{entity.Notes}\n[Hủy] {reason.Trim()}";
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return new TraditionalMedicineTreatmentDto
        {
            Id = entity.Id, TreatmentCode = entity.TreatmentCode, PatientName = entity.PatientName,
            PatientId = entity.PatientId, TreatmentType = entity.TreatmentType, Status = entity.Status,
        };
    }

    public async Task<TraditionalMedicineTreatmentDto> CompleteTreatmentAsync(Guid id)
    {
        var entity = await _context.TraditionalMedicineTreatments.FindAsync(id)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt điều trị YHCT.");
        if (entity.Status != 0)
            throw new InvalidOperationException("Chỉ kết thúc được đợt điều trị đang hoạt động.");

        entity.Status = 1; // completed
        entity.EndDate = HIS.Core.Common.VnTime.NowVn; // business timestamp = VN local
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
