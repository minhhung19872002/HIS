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
        EnsureAnyThreshold(dto);

        var entity = new MedicineDoseRange
        {
            Id = Guid.NewGuid(),
            MedicineId = dto.MedicineId,
            RouteCode = dto.RouteCode,
            AgeGroup = dto.AgeGroup,
            IsRenalAdjusted = dto.IsRenalAdjusted,
            MaxSingleDose = dto.MaxSingleDose,
            MaxDailyDose = dto.MaxDailyDose,
            MinDosePerKg = dto.MinDosePerKg,
            MaxDosePerKg = dto.MaxDosePerKg,
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
        EnsureAnyThreshold(dto);

        entity.RouteCode = dto.RouteCode;
        entity.AgeGroup = dto.AgeGroup;
        entity.IsRenalAdjusted = dto.IsRenalAdjusted;
        entity.MaxSingleDose = dto.MaxSingleDose;
        entity.MaxDailyDose = dto.MaxDailyDose;
        entity.MinDosePerKg = dto.MinDosePerKg;
        entity.MaxDosePerKg = dto.MaxDosePerKg;
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
        if (request.Items.Count == 0) return new List<DoseWarningDto>();

        var medIds = request.Items.Select(i => i.MedicineId).Distinct().ToList();
        // Chỉ load range ACTIVE cho các thuốc được kê → bảng rỗng = list rỗng = không cảnh báo
        var ranges = await _db.MedicineDoseRanges.AsNoTracking()
            .Include(r => r.Medicine)
            .Where(r => r.IsActive && medIds.Contains(r.MedicineId))
            .ToListAsync();
        if (ranges.Count == 0) return new List<DoseWarningDto>();

        var age = request.PatientAge;
        var weight = request.WeightKg is > 0 ? request.WeightKg : null;
        var patientRef = request.PatientId;
        if ((patientRef == null || patientRef == Guid.Empty) && request.AdmissionId is Guid admissionId && admissionId != Guid.Empty)
            patientRef = await _db.Admissions.AsNoTracking().Where(a => a.Id == admissionId)
                .Select(a => (Guid?)a.PatientId).FirstOrDefaultAsync();
        if (patientRef is Guid patientId && patientId != Guid.Empty)
        {
            age ??= await ResolvePatientAgeAsync(_db, patientId);
            if (weight == null && ranges.Any(r => r.MaxDosePerKg is > 0 || r.MinDosePerKg is > 0))
                weight = await ResolveLatestWeightAsync(_db, patientId);
        }

        return HIS.Core.Common.DoseRangeChecker.Check(ranges,
                request.Items.Select(i => new HIS.Core.Common.DoseRangeChecker.Item(i.MedicineId, i.SingleDose, i.DailyDose,
                    i.MorningDose, i.NoonDose, i.EveningDose, i.NightDose, i.RouteCode)),
                age, request.IsRenalImpaired, weight)
            .Select(w => new DoseWarningDto
            {
                MedicineId = w.MedicineId,
                MedicineName = w.MedicineName,
                WarningType = w.WarningType,
                Severity = w.Severity,
                Message = w.Message,
                Recommendation = w.Recommendation
            })
            .ToList();
    }

    private static void EnsureAnyThreshold(CreateMedicineDoseRangeDto dto)
    {
        if (dto.MaxSingleDose == null && dto.MaxDailyDose == null && dto.MaxDosePerKg == null && dto.MinDosePerKg == null)
            throw new InvalidOperationException("Phải nhập ít nhất 1 ngưỡng (liều 1 lần, liều/ngày hoặc liều theo cân nặng)");
        if (dto.MinDosePerKg is > 0 && dto.MaxDosePerKg is > 0 && dto.MinDosePerKg > dto.MaxDosePerKg)
            throw new InvalidOperationException("Liều tối thiểu theo cân nặng phải nhỏ hơn liều tối đa theo cân nặng");
    }

    internal static async Task<int?> ResolvePatientAgeAsync(HISDbContext db, Guid patientId)
    {
        var p = await db.Patients.AsNoTracking().Where(x => x.Id == patientId)
            .Select(x => new { x.DateOfBirth, x.YearOfBirth }).FirstOrDefaultAsync();
        if (p == null) return null;
        var today = HIS.Core.Common.VnTime.TodayVn;
        if (p.DateOfBirth is DateTime dob)
        {
            var years = today.Year - dob.Year;
            if (dob.Date > today.AddYears(-years)) years--;
            return years >= 0 ? years : null;
        }
        return p.YearOfBirth is int y && y > 1900 && y <= today.Year ? today.Year - y : null;
    }

    /// <summary>
    /// Latest recorded weight (kg) of the patient: OPD vital signs on the medical record or inpatient vital signs,
    /// whichever was recorded last. Null when none was ever recorded.
    /// </summary>
    internal static async Task<decimal?> ResolveLatestWeightAsync(HISDbContext db, Guid patientId)
    {
        var opd = await db.Examinations.AsNoTracking()
            .Where(e => e.MedicalRecord.PatientId == patientId && e.Weight != null && e.Weight > 0)
            .OrderByDescending(e => e.UpdatedAt ?? e.CreatedAt)
            .Select(e => new { e.Weight, At = e.UpdatedAt ?? e.CreatedAt })
            .FirstOrDefaultAsync();
        var ipd = await db.InpatientVitalSigns.AsNoTracking()
            .Where(v => v.Weight != null && v.Weight > 0
                && db.Admissions.Any(a => a.Id == v.AdmissionId && a.PatientId == patientId))
            .OrderByDescending(v => v.RecordTime)
            .Select(v => new { v.Weight, At = v.RecordTime })
            .FirstOrDefaultAsync();
        if (opd == null) return ipd?.Weight;
        if (ipd == null) return opd.Weight;
        return ipd.At >= opd.At ? ipd.Weight : opd.Weight;
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
        MinDosePerKg = r.MinDosePerKg,
        MaxDosePerKg = r.MaxDosePerKg,
        Unit = r.Unit,
        SevereMultiplier = r.SevereMultiplier,
        Note = r.Note,
        IsActive = r.IsActive
    };
}
