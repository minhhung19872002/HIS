using HIS.Application.DTOs.Nutrition;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

public class ClinicalNutritionServiceImpl : IClinicalNutritionService
{
    private readonly HISDbContext _context;
    public ClinicalNutritionServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<NutritionScreeningDto>> GetPendingScreeningsAsync(Guid? departmentId = null)
    {
        var admissions = await _context.Admissions.Include(x => x.Patient).Where(x => x.Status == 0).ToListAsync(); // 0 = Đang điều trị (Active)
        var screenedIds = await _context.NutritionScreenings.Select(x => x.AdmissionId).ToListAsync();
        return admissions.Where(a => !screenedIds.Contains(a.Id)).Select(a => new NutritionScreeningDto
        {
            AdmissionId = a.Id, PatientId = a.PatientId, PatientName = a.Patient?.FullName ?? "", RiskLevel = "Pending"
        }).ToList();
    }

    public async Task<NutritionScreeningDto> GetScreeningByAdmissionAsync(Guid admissionId)
    {
        var e = await _context.NutritionScreenings.Include(x => x.Admission).ThenInclude(x => x!.Patient).FirstOrDefaultAsync(x => x.AdmissionId == admissionId);
        if (e == null) return null!;
        return MapToNutritionScreeningDto(e);
    }

    public async Task<NutritionScreeningDto> PerformScreeningAsync(PerformNutritionScreeningDto dto)
    {
        var entity = new NutritionScreening
        {
            Id = Guid.NewGuid(), AdmissionId = dto.AdmissionId, Weight = dto.Weight, Height = dto.Height,
            BMI = dto.Weight / (dto.Height * dto.Height / 10000), NutritionScore = dto.NutritionScore, DiseaseScore = dto.DiseaseScore,
            TotalScore = dto.NutritionScore + dto.DiseaseScore, RiskLevel = (dto.NutritionScore + dto.DiseaseScore) >= 3 ? "High" : "Low",
            ScreeningDate = DateTime.Now, CreatedAt = DateTime.Now
        };
        _context.NutritionScreenings.Add(entity);
        await _context.SaveChangesAsync();
        return await GetScreeningByAdmissionAsync(dto.AdmissionId);
    }

    public async Task<List<NutritionScreeningDto>> GetHighRiskPatientsAsync(Guid? departmentId = null)
    {
        var list = await _context.NutritionScreenings.Include(x => x.Admission).ThenInclude(x => x!.Patient).Where(x => x.RiskLevel == "High").ToListAsync();
        return list.Select(MapToNutritionScreeningDto).ToList();
    }

    public async Task<NutritionAssessmentDto> GetAssessmentAsync(Guid id)
    {
        var e = await _context.NutritionAssessments.Include(x => x.Screening).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new NutritionAssessmentDto { Id = e.Id, ScreeningId = e.ScreeningId, Weight = e.Screening?.Weight ?? 0, Height = e.Screening?.Height ?? 0, BMI = e.Screening?.BMI ?? 0 };
    }

    public async Task<NutritionAssessmentDto> SaveAssessmentAsync(SaveNutritionAssessmentDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.NutritionAssessments.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new NutritionAssessment { Id = Guid.NewGuid(), ScreeningId = dto.ScreeningId, AssessmentDate = DateTime.Now, CreatedAt = DateTime.Now };
            _context.NutritionAssessments.Add(entity);
        }
        entity.ActivityFactor = dto.ActivityFactor; entity.StressFactor = dto.StressFactor;
        await _context.SaveChangesAsync();
        return new NutritionAssessmentDto { Id = entity.Id, ScreeningId = entity.ScreeningId };
    }

    public Task<decimal> CalculateEnergyRequirementAsync(Guid patientId, decimal weight, decimal height, decimal activityFactor, decimal stressFactor)
    {
        var bmr = 10 * weight + 6.25m * height - 5 * 40 + 5;
        return Task.FromResult(bmr * activityFactor * stressFactor);
    }

    public async Task<List<DietOrderDto>> GetActiveDietOrdersAsync(Guid? departmentId = null)
    {
        try
        {
            var query = _context.DietOrders
                .Include(x => x.Admission).ThenInclude(x => x!.Patient)
                .Include(x => x.Admission).ThenInclude(x => x!.Department)
                .Include(x => x.Admission).ThenInclude(x => x!.Bed)
                .Include(x => x.DietType)
                .Include(x => x.OrderedBy)
                .Where(x => x.Status == "Active");
            if (departmentId.HasValue)
                query = query.Where(x => x.Admission!.DepartmentId == departmentId.Value);
            var list = await query.OrderByDescending(x => x.CreatedAt).Take(200).ToListAsync();
            return list.Select(MapDietOrderDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<DietOrderDto>();
        }
    }

    public async Task<DietOrderDto> GetDietOrderAsync(Guid id)
    {
        var e = await _context.DietOrders
            .Include(x => x.Admission).ThenInclude(x => x!.Patient)
            .Include(x => x.Admission).ThenInclude(x => x!.Department)
            .Include(x => x.Admission).ThenInclude(x => x!.Bed)
            .Include(x => x.DietType)
            .Include(x => x.OrderedBy)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return MapDietOrderDto(e);
    }

    private static DietOrderDto MapDietOrderDto(DietOrder e) => new()
    {
        Id = e.Id,
        OrderCode = e.OrderCode ?? string.Empty,
        AdmissionId = e.AdmissionId,
        PatientId = e.PatientId,
        PatientName = e.Admission?.Patient?.FullName ?? "",
        DepartmentName = e.Admission?.Department?.DepartmentName ?? "",
        BedNumber = e.Admission?.Bed?.BedName ?? e.Admission?.Bed?.BedCode ?? "",
        DietTypeId = e.DietTypeId,
        DietTypeCode = e.DietType?.Code ?? "",
        DietTypeName = e.DietType?.Name ?? "",
        DietCategory = e.DietType?.Category ?? "",
        Texture = e.TextureModification ?? "",
        Consistency = e.FluidConsistency ?? "",
        CalorieLevel = e.TargetCalories,
        ProteinLevel = e.TargetProtein,
        Allergies = SplitCsv(e.Allergies),
        Dislikes = SplitCsv(e.FoodPreferences),
        SpecialInstructions = e.SpecialInstructions ?? "",
        FeedingRoute = "Oral",
        Status = e.Status ?? "",
        StartDate = e.StartDate,
        EndDate = e.EndDate,
        OrderedBy = e.OrderedBy?.FullName ?? "",
        OrderedAt = e.CreatedAt,
    };

    private static List<string> SplitCsv(string? s)
        => string.IsNullOrWhiteSpace(s) ? new List<string>() : s.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim()).ToList();

    public async Task<DietOrderDto> CreateDietOrderAsync(CreateDietOrderDto dto)
    {
        var entity = new DietOrder
        {
            Id = Guid.NewGuid(), OrderCode = CodeGenerator.Timestamp("DIET"), AdmissionId = dto.AdmissionId, DietTypeId = dto.DietTypeId,
            TargetCalories = dto.CalorieLevel, TargetProtein = dto.ProteinLevel, Status = "Active", StartDate = dto.StartDate, CreatedAt = DateTime.Now
        };
        _context.DietOrders.Add(entity);
        await _context.SaveChangesAsync();
        return await GetDietOrderAsync(entity.Id);
    }

    public async Task<DietOrderDto> UpdateDietOrderAsync(Guid id, CreateDietOrderDto dto)
    {
        var e = await _context.DietOrders.FindAsync(id);
        if (e == null) return null!;
        e.DietTypeId = dto.DietTypeId; e.TargetCalories = dto.CalorieLevel; e.TargetProtein = dto.ProteinLevel;
        await _context.SaveChangesAsync();
        return await GetDietOrderAsync(id);
    }

    public async Task<bool> DiscontinueDietOrderAsync(Guid id, string reason)
    {
        var e = await _context.DietOrders.FindAsync(id);
        if (e == null) return false;
        e.Status = "Discontinued"; e.EndDate = DateTime.Now; e.DiscontinuationReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<DietTypeDto>> GetDietTypesAsync(string? category = null)
    {
        // F2 (audit FLOW-FINAL 2026-06-06): đọc DietType từ DB — trước đây hardcode Guid.NewGuid()
        // MỖI lần gọi → id ngẫu nhiên, đặt suất ăn (DietOrder.DietTypeId) vỡ tham chiếu.
        var query = _context.DietTypes.Where(d => d.IsActive);
        if (!string.IsNullOrEmpty(category)) query = query.Where(d => d.Category == category);
        return await query.OrderBy(d => d.Name)
            .Select(d => new DietTypeDto
            {
                Id = d.Id,
                Code = d.Code,
                Name = d.Name,
                Category = d.Category,
                Description = d.Description ?? string.Empty,
                DefaultCalories = d.BaseCalories
            })
            .ToListAsync();
    }

    // F2 (audit FLOW-FINAL): meal plan persist THẬT (bảng MealPlans/MealPlanItems) — trước chỉ trả DTO,
    // không lưu → suất ăn không vào hệ thống, không theo dõi cấp phát.
    public async Task<List<MealPlanDto>> GetMealPlansAsync(DateTime date, Guid? departmentId = null)
    {
        var query = _context.MealPlans
            .Include(p => p.Department)
            .Include(p => p.Items!).ThenInclude(i => i.Patient)
            .Include(p => p.Items!).ThenInclude(i => i.DietOrder).ThenInclude(o => o!.DietType)
            .Where(p => !p.IsDeleted && p.Date.Date == date.Date);
        if (departmentId.HasValue) query = query.Where(p => p.DepartmentId == departmentId.Value);
        var plans = await query.OrderBy(p => p.MealType).ToListAsync();
        return plans.Select(MapMealPlanDto).ToList();
    }

    public async Task<MealPlanDto> GenerateMealPlanAsync(DateTime date, string mealType, Guid? departmentId = null)
    {
        // Idempotent: đã có meal plan cho (ngày, bữa, khoa) → trả lại.
        var existingId = await _context.MealPlans
            .Where(p => !p.IsDeleted && p.Date.Date == date.Date && p.MealType == mealType && p.DepartmentId == departmentId)
            .Select(p => (Guid?)p.Id).FirstOrDefaultAsync();
        if (existingId.HasValue)
            return MapMealPlanDto((await LoadMealPlanAsync(existingId.Value))!);

        // Sinh suất ăn từ y lệnh ăn đang hiệu lực (lọc theo khoa nếu có).
        var ordersQ = _context.DietOrders
            .Include(o => o.Admission).ThenInclude(a => a!.Bed)
            .Where(o => o.Status == "Active");
        if (departmentId.HasValue) ordersQ = ordersQ.Where(o => o.Admission!.DepartmentId == departmentId.Value);
        var orders = await ordersQ.ToListAsync();

        var now = DateTime.Now;
        var plan = new MealPlan
        {
            Id = Guid.NewGuid(), Date = date.Date, MealType = mealType, DepartmentId = departmentId,
            Status = "Planned", TotalPatients = orders.Count, CreatedAt = now,
            Items = orders.Select(o => new MealPlanItem
            {
                Id = Guid.NewGuid(), DietOrderId = o.Id, PatientId = o.PatientId,
                RoomBed = o.Admission?.Bed?.BedName ?? o.Admission?.Bed?.BedCode,
                IsDelivered = false, CreatedAt = now,
            }).ToList(),
        };
        _context.MealPlans.Add(plan);
        await _context.SaveChangesAsync();
        return MapMealPlanDto((await LoadMealPlanAsync(plan.Id))!);
    }

    public async Task<bool> MarkMealDeliveredAsync(Guid dietOrderId, DateTime date, string mealType)
    {
        var item = await _context.MealPlanItems
            .Include(i => i.MealPlan)
            .FirstOrDefaultAsync(i => !i.IsDeleted && i.DietOrderId == dietOrderId
                && i.MealPlan!.Date.Date == date.Date && i.MealPlan.MealType == mealType);
        if (item == null) return false;
        item.IsDelivered = true; item.DeliveredAt = DateTime.Now; item.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<MealPlan?> LoadMealPlanAsync(Guid id) =>
        await _context.MealPlans
            .Include(p => p.Department)
            .Include(p => p.Items!).ThenInclude(i => i.Patient)
            .Include(p => p.Items!).ThenInclude(i => i.DietOrder).ThenInclude(o => o!.DietType)
            .FirstOrDefaultAsync(p => p.Id == id);

    private static MealPlanDto MapMealPlanDto(MealPlan p) => new()
    {
        Id = p.Id, Date = p.Date, MealType = p.MealType,
        DepartmentName = p.Department?.DepartmentName ?? "",
        TotalPatients = p.TotalPatients, Status = p.Status,
        Items = (p.Items ?? new List<MealPlanItem>()).Select(i => new MealPlanItemDto
        {
            DietOrderId = i.DietOrderId,
            PatientName = i.Patient?.FullName ?? "",
            BedNumber = i.RoomBed ?? "",
            DietType = i.DietOrder?.DietType?.Name ?? "",
            Texture = i.DietOrder?.TextureModification ?? "",
            Allergies = SplitCsv(i.DietOrder?.Allergies),
            SpecialNotes = i.Notes ?? "",
            MenuItems = new List<MenuItemDto>(),
            IsDelivered = i.IsDelivered,
        }).ToList(),
    };

    public async Task<NutritionMonitoringDto> GetMonitoringAsync(Guid admissionId, DateTime date)
    {
        var e = await _context.NutritionMonitorings.FirstOrDefaultAsync(x => x.AdmissionId == admissionId && x.Date.Date == date.Date);
        if (e == null) return null!;
        return new NutritionMonitoringDto { Id = e.Id, AdmissionId = e.AdmissionId, Date = e.Date };
    }

    public async Task<NutritionMonitoringDto> RecordMonitoringAsync(RecordNutritionMonitoringDto dto)
    {
        var entity = new NutritionMonitoring
        {
            Id = Guid.NewGuid(), AdmissionId = dto.AdmissionId, Date = dto.Date,
            BreakfastIntakePercent = dto.OralIntakePercent, CreatedAt = DateTime.Now
        };
        _context.NutritionMonitorings.Add(entity);
        await _context.SaveChangesAsync();
        return new NutritionMonitoringDto { Id = entity.Id, AdmissionId = entity.AdmissionId, Date = entity.Date };
    }

    public async Task<List<NutritionMonitoringDto>> GetMonitoringHistoryAsync(Guid admissionId)
    {
        var list = await _context.NutritionMonitorings.Where(x => x.AdmissionId == admissionId).OrderByDescending(x => x.Date).ToListAsync();
        return list.Select(e => new NutritionMonitoringDto { Id = e.Id, AdmissionId = e.AdmissionId, Date = e.Date }).ToList();
    }

    public Task<TPNOrderDto> GetTPNOrderAsync(Guid id) => Task.FromResult(new TPNOrderDto { Id = id });
    public Task<TPNOrderDto> CreateTPNOrderAsync(TPNOrderDto dto) => Task.FromResult(dto);

    public async Task<NutritionDashboardDto> GetDashboardAsync(DateTime? date = null)
    {
        var d = date ?? DateTime.Today;
        try
        {
            return new NutritionDashboardDto
            {
                Date = d,
                HighRiskCount = await _context.NutritionScreenings.CountAsync(x => x.RiskLevel == "High"),
                ActiveDietOrders = await _context.DietOrders.CountAsync(x => x.Status == "Active")
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new NutritionDashboardDto { Date = d, HighRiskCount = 0, ActiveDietOrders = 0 };
        }
    }

    private static NutritionScreeningDto MapToNutritionScreeningDto(NutritionScreening e) => new()
    {
        Id = e.Id, AdmissionId = e.AdmissionId, PatientId = e.Admission?.PatientId ?? Guid.Empty,
        PatientName = e.Admission?.Patient?.FullName ?? "", Weight = e.Weight, Height = e.Height, BMI = e.BMI,
        NutritionScore = e.NutritionScore, DiseaseScore = e.DiseaseScore, TotalScore = e.TotalScore, RiskLevel = e.RiskLevel
    };
}
