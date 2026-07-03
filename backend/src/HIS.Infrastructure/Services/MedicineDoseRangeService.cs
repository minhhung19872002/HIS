using HIS.Application.DTOs.Pharmacy;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// #214 [SAFE-3] Ngưỡng liều thuốc + kiểm tra quá liều (advisory).
/// Behavior-preserving: chỉ SINH cảnh báo, KHÔNG tự chặn kê đơn (bảng rỗng = không cảnh báo).
/// </summary>
public class MedicineDoseRangeService : IMedicineDoseRangeService
{
    private readonly HISDbContext _db;

    public MedicineDoseRangeService(HISDbContext db) => _db = db;

    public async Task<List<MedicineDoseRangeDto>> GetByMedicineAsync(Guid medicineId)
    {
        return await _db.MedicineDoseRanges.AsNoTracking()
            .Include(r => r.Medicine)
            .Where(r => r.MedicineId == medicineId)
            .OrderBy(r => r.AgeGroup)
            .Select(r => Map(r))
            .ToListAsync();
    }

    public async Task<List<MedicineDoseRangeDto>> SearchAsync(string? keyword)
    {
        var q = _db.MedicineDoseRanges.AsNoTracking().Include(r => r.Medicine).AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(r => r.Medicine.MedicineName.Contains(kw) || r.Medicine.MedicineCode.Contains(kw));
        }
        return await q.OrderBy(r => r.Medicine.MedicineName).Take(500)
            .Select(r => Map(r)).ToListAsync();
    }

    public async Task<MedicineDoseRangeDto> CreateAsync(CreateMedicineDoseRangeDto dto, Guid userId)
    {
        var med = await _db.Medicines.FirstOrDefaultAsync(m => m.Id == dto.MedicineId)
            ?? throw new InvalidOperationException("Thuốc không tồn tại");
        if (dto.MaxSingleDose == null && dto.MaxDailyDose == null)
            throw new InvalidOperationException("Phải nhập ít nhất 1 ngưỡng (liều 1 lần hoặc liều/ngày)");

        var entity = new MedicineDoseRange
        {
            Id = Guid.NewGuid(),
            MedicineId = dto.MedicineId,
            RouteCode = dto.RouteCode,
            AgeGroup = dto.AgeGroup,
            IsRenalAdjusted = dto.IsRenalAdjusted,
            MaxSingleDose = dto.MaxSingleDose,
            MaxDailyDose = dto.MaxDailyDose,
            Unit = dto.Unit ?? med.Unit,
            SevereMultiplier = dto.SevereMultiplier <= 1 ? 1.5m : dto.SevereMultiplier,
            Note = dto.Note,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        _db.MedicineDoseRanges.Add(entity);
        await _db.SaveChangesAsync();
        entity.Medicine = med;
        return Map(entity);
    }

    public async Task<MedicineDoseRangeDto> UpdateAsync(Guid id, CreateMedicineDoseRangeDto dto, Guid userId)
    {
        var entity = await _db.MedicineDoseRanges.Include(r => r.Medicine).FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new InvalidOperationException("Ngưỡng liều không tồn tại");
        if (dto.MaxSingleDose == null && dto.MaxDailyDose == null)
            throw new InvalidOperationException("Phải nhập ít nhất 1 ngưỡng (liều 1 lần hoặc liều/ngày)");

        entity.RouteCode = dto.RouteCode;
        entity.AgeGroup = dto.AgeGroup;
        entity.IsRenalAdjusted = dto.IsRenalAdjusted;
        entity.MaxSingleDose = dto.MaxSingleDose;
        entity.MaxDailyDose = dto.MaxDailyDose;
        entity.Unit = dto.Unit ?? entity.Unit;
        entity.SevereMultiplier = dto.SevereMultiplier <= 1 ? 1.5m : dto.SevereMultiplier;
        entity.Note = dto.Note;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var entity = await _db.MedicineDoseRanges.FirstOrDefaultAsync(r => r.Id == id);
        if (entity == null) return false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<DoseWarningDto>> CheckAsync(DoseCheckRequestDto request)
    {
        var warnings = new List<DoseWarningDto>();
        if (request.Items.Count == 0) return warnings;

        var medIds = request.Items.Select(i => i.MedicineId).Distinct().ToList();
        // Chỉ load range ACTIVE cho các thuốc được kê → bảng rỗng = list rỗng = không cảnh báo
        var ranges = await _db.MedicineDoseRanges.AsNoTracking()
            .Include(r => r.Medicine)
            .Where(r => r.IsActive && medIds.Contains(r.MedicineId))
            .ToListAsync();
        if (ranges.Count == 0) return warnings;

        var ageGroup = ResolveAgeGroup(request.PatientAge);

        foreach (var item in request.Items)
        {
            var candidates = ranges.Where(r => r.MedicineId == item.MedicineId).ToList();
            if (candidates.Count == 0) continue;

            // Chọn range phù hợp nhất: khớp đường dùng > khớp nhóm tuổi > renal (khi BN suy thận) > mặc định
            var range = PickBestRange(candidates, item.RouteCode, ageGroup, request.IsRenalImpaired);
            if (range == null) continue;

            var dailyDose = item.DailyDose
                ?? SumNullable(item.MorningDose, item.NoonDose, item.EveningDose, item.NightDose);
            var medName = range.Medicine?.MedicineName ?? "";

            AddIfExceeds(warnings, range, item.MedicineId, medName, "liều 1 lần", item.SingleDose, range.MaxSingleDose);
            AddIfExceeds(warnings, range, item.MedicineId, medName, "liều/ngày", dailyDose, range.MaxDailyDose);
        }
        return warnings;
    }

    private static void AddIfExceeds(List<DoseWarningDto> warnings, MedicineDoseRange range,
        Guid medId, string medName, string label, decimal? actual, decimal? max)
    {
        if (actual == null || actual <= 0 || max == null || max <= 0) return;
        if (actual.Value <= max.Value) return;

        var severe = actual.Value >= max.Value * range.SevereMultiplier;
        var unit = string.IsNullOrEmpty(range.Unit) ? "" : " " + range.Unit;
        warnings.Add(new DoseWarningDto
        {
            MedicineId = medId,
            MedicineName = medName,
            WarningType = "DoseRange",
            Severity = severe ? 3 : 2,
            Message = $"{(severe ? "QUÁ LIỀU NẶNG" : "Vượt ngưỡng")} {label}: kê {actual.Value:0.##}{unit} > tối đa {max.Value:0.##}{unit}"
                + (range.IsRenalAdjusted ? " (ngưỡng đã hiệu chỉnh suy thận)" : ""),
            Recommendation = severe
                ? "Rà soát lại liều — quá liều nặng, cân nhắc giảm liều hoặc ghi rõ lý do y lệnh"
                : "Kiểm tra lại liều so với khuyến cáo"
        });
    }

    private static MedicineDoseRange? PickBestRange(List<MedicineDoseRange> candidates,
        string? route, int ageGroup, bool renal)
    {
        return candidates
            .OrderByDescending(r => renal && r.IsRenalAdjusted)                              // ưu tiên renal khi BN suy thận
            .ThenByDescending(r => !string.IsNullOrEmpty(route) && r.RouteCode == route)     // khớp đường dùng
            .ThenByDescending(r => r.AgeGroup == ageGroup)                                   // khớp nhóm tuổi
            .ThenByDescending(r => r.AgeGroup == 0)                                          // fallback mọi lứa tuổi
            .FirstOrDefault();
    }

    private static int ResolveAgeGroup(int? age)
    {
        if (age == null) return 0;
        if (age < 12) return 1;
        if (age >= 65) return 3;
        return 2;
    }

    private static decimal? SumNullable(params decimal?[] vals)
    {
        var present = vals.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        return present.Count == 0 ? null : present.Sum();
    }

    private static MedicineDoseRangeDto Map(MedicineDoseRange r) => new()
    {
        Id = r.Id,
        MedicineId = r.MedicineId,
        MedicineCode = r.Medicine?.MedicineCode,
        MedicineName = r.Medicine?.MedicineName,
        RouteCode = r.RouteCode,
        AgeGroup = r.AgeGroup,
        IsRenalAdjusted = r.IsRenalAdjusted,
        MaxSingleDose = r.MaxSingleDose,
        MaxDailyDose = r.MaxDailyDose,
        Unit = r.Unit,
        SevereMultiplier = r.SevereMultiplier,
        Note = r.Note,
        IsActive = r.IsActive
    };
}
