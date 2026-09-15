using HIS.Application.DTOs.Nutrition;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

public partial class ClinicalNutritionServiceImpl : IClinicalNutritionService
{
    private readonly HISDbContext _context;
    private readonly HIS.Application.Common.ICurrentUserAccessor? _currentUser;
    public ClinicalNutritionServiceImpl(HISDbContext context, HIS.Application.Common.ICurrentUserAccessor? currentUser = null)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<NutritionScreeningDto>> GetPendingScreeningsAsync(Guid? departmentId = null)
    {
        var admissions = await _context.Admissions.Include(x => x.Patient).Where(x => x.Status == 0).ToListAsync(); // 0 = Đang điều trị (Active)
        var screenedIds = await _context.NutritionScreenings.Select(x => x.AdmissionId).ToListAsync();
        return admissions.Where(a => !screenedIds.Contains(a.Id)).Select(a => new NutritionScreeningDto
        {
            AdmissionId = a.Id, PatientId = a.PatientId, PatientName = a.Patient?.FullName ?? "", RiskLevel = "Pending"
        }).ToList();
    }

    // QA-R3: GET /nutrition/screenings returned the pending list again, so the v2 "Đã sàng lọc" tab was always
    // empty and a screened patient disappeared from the page. Latest screening per admission.
    public async Task<List<NutritionScreeningDto>> GetCompletedScreeningsAsync(Guid? departmentId = null)
    {
        var query = _context.NutritionScreenings.AsNoTracking()
            .Include(x => x.Admission).ThenInclude(x => x!.Patient)
            .Include(x => x.Admission).ThenInclude(x => x!.Department)
            .AsQueryable();
        if (departmentId.HasValue) query = query.Where(x => x.Admission!.DepartmentId == departmentId.Value);
        var rows = await query.OrderByDescending(x => x.ScreeningDate).Take(1000).ToListAsync();
        return rows.GroupBy(x => x.AdmissionId).Select(g => g.First()).Take(200).Select(e =>
        {
            var dto = MapToNutritionScreeningDto(e);
            dto.PatientCode = e.Admission?.Patient?.PatientCode ?? "";
            dto.DepartmentName = e.Admission?.Department?.DepartmentName ?? "";
            return dto;
        }).ToList();
    }

    public async Task<NutritionScreeningDto> GetScreeningByAdmissionAsync(Guid admissionId)
    {
        // QA-R2: latest screening first (re-screening used to return an arbitrary older row).
        var e = await _context.NutritionScreenings.Include(x => x.Admission).ThenInclude(x => x!.Patient)
            .Where(x => x.AdmissionId == admissionId).OrderByDescending(x => x.ScreeningDate).FirstOrDefaultAsync();
        if (e == null) return null!;
        return MapToNutritionScreeningDto(e);
    }

    public async Task<NutritionScreeningDto> PerformScreeningAsync(PerformNutritionScreeningDto dto)
    {
        // QA-R2: unknown admission → 404 (was an orphan row); Height=0 (form has no anthropometrics) → BMI 0
        // instead of DivideByZeroException 500; PatientId/ScreenedBy/SGA/Notes were silently dropped.
        var admission = await _context.Admissions.AsNoTracking().FirstOrDefaultAsync(a => a.Id == dto.AdmissionId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ nhập viện");
        if (dto.NutritionScore < 0 || dto.DiseaseScore < 0 || dto.Weight < 0 || dto.Height < 0)
            throw new ArgumentException("Điểm sàng lọc / cân nặng / chiều cao không được âm");
        var nrs = await CalculateNrs2002Async(dto, admission.PatientId);
        var entity = new NutritionScreening
        {
            Id = Guid.NewGuid(), AdmissionId = dto.AdmissionId, PatientId = admission.PatientId,
            ScreenedById = _currentUser?.UserGuid ?? Guid.Empty,
            Weight = dto.Weight, Height = dto.Height,
            BMI = dto.Height > 0 ? Math.Round(dto.Weight / (dto.Height * dto.Height / 10000), 2) : 0,
            NutritionScore = nrs.NutritionScore, DiseaseScore = nrs.DiseaseScore, AgeScore = nrs.AgeScore,
            TotalScore = nrs.TotalScore, RiskLevel = nrs.RiskLevel,
            RequiresIntervention = nrs.RequiresIntervention, SGACategory = dto.SGACategory, Notes = dto.Notes,
            ScreeningDate = DateTime.Now, CreatedAt = DateTime.Now
        };
        _context.NutritionScreenings.Add(entity);
        await _context.SaveChangesAsync();
        return await GetScreeningByAdmissionAsync(dto.AdmissionId);
    }

    /// <summary>QA-R3: NRS-2002 = max(BMI, weight loss, intake) + disease severity + (age ≥ 70 ? 1 : 0).</summary>
    private async Task<HIS.Core.Common.Nrs2002Calculator.Result> CalculateNrs2002Async(PerformNutritionScreeningDto dto, Guid patientId)
    {
        if (dto.BmiScore < 0 || dto.WeightLossScore < 0 || dto.IntakeScore < 0)
            throw new ArgumentException("Điểm sàng lọc không được âm");
        var p = await _context.Patients.AsNoTracking().Where(x => x.Id == patientId)
            .Select(x => new { x.DateOfBirth, x.YearOfBirth }).FirstOrDefaultAsync();
        var today = HIS.Core.Common.VnTime.TodayVn;
        int? age = null;
        if (p?.DateOfBirth is DateTime dob)
            age = today.Year - dob.Year - (dob.Date > today.AddYears(-(today.Year - dob.Year)) ? 1 : 0);
        else if (p?.YearOfBirth is int y && y > 1900)
            age = today.Year - y;
        return HIS.Core.Common.Nrs2002Calculator.Calculate(
            new[] { dto.BmiScore, dto.WeightLossScore, dto.IntakeScore }, dto.NutritionScore, dto.DiseaseScore, age);
    }

    public async Task<List<NutritionScreeningDto>> GetHighRiskPatientsAsync(Guid? departmentId = null)
    {
        var list = await _context.NutritionScreenings.Include(x => x.Admission).ThenInclude(x => x!.Patient).Where(x => x.RiskLevel == "High").ToBoundedListAsync("ClinicalNutrition.HighRiskPatients");
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
        Restrictions = SplitCsv(e.Restrictions),
        SpecialInstructions = e.SpecialInstructions ?? "",
        // QA-R3: was hard-coded "Oral" (the form's route / meals per day / snacks were never stored).
        FeedingRoute = string.IsNullOrWhiteSpace(e.FeedingRoute) ? "Oral" : e.FeedingRoute,
        MealFrequency = e.MealFrequency,
        IncludeSnacks = e.IncludeSnacks ?? false,
        Status = e.Status ?? "",
        StartDate = e.StartDate,
        EndDate = e.EndDate,
        OrderedBy = e.OrderedBy?.FullName ?? "",
        OrderedAt = e.CreatedAt,
    };

    private static List<string> SplitCsv(string? s)
        => string.IsNullOrWhiteSpace(s) ? new List<string>() : s.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim()).ToList();

    private static string? JoinCsv(List<string>? items)
    {
        var parts = (items ?? new List<string>()).Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList();
        return parts.Count == 0 ? null : string.Join(", ", parts);
    }

    /// <summary>QA-R2: shared input guards for create/update diet order.</summary>
    private async Task ValidateDietOrderAsync(CreateDietOrderDto dto)
    {
        if (dto.DietTypeId == Guid.Empty || !await _context.DietTypes.AnyAsync(d => d.Id == dto.DietTypeId))
            throw new ArgumentException("Chế độ ăn không hợp lệ");
        if (dto.StartDate == default)
            throw new ArgumentException("Thiếu ngày bắt đầu");
        if (dto.EndDate.HasValue && dto.EndDate.Value.Date < dto.StartDate.Date)
            throw new ArgumentException("Ngày kết thúc không được trước ngày bắt đầu");
        if (dto.CalorieLevel < 0 || dto.ProteinLevel < 0 || dto.FluidRestriction < 0 || dto.SodiumRestriction < 0)
            throw new ArgumentException("Năng lượng / protein / dịch không được âm");
        if (dto.MealFrequency is < 1 or > 12)
            throw new ArgumentException("Số bữa / ngày phải từ 1 đến 12");
        if (!string.IsNullOrWhiteSpace(dto.FeedingRoute) && dto.FeedingRoute.Trim().Length > 20)
            throw new ArgumentException("Đường nuôi dưỡng không hợp lệ");
    }

    public async Task<DietOrderDto> CreateDietOrderAsync(CreateDietOrderDto dto)
    {
        // QA-R2: PatientId/OrderedById stayed Guid.Empty → the required OrderedBy/DietType includes became INNER
        // JOINs so the new order was invisible (POST 204, list never showed it) and meal-plan generation hit the
        // MealPlanItems.PatientId FK. Texture/allergies/instructions were silently dropped; no admission check.
        var admission = await _context.Admissions.AsNoTracking().FirstOrDefaultAsync(a => a.Id == dto.AdmissionId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ nhập viện");
        await ValidateDietOrderAsync(dto);
        // A second Active order for the same admission would double every generated meal (and its charge).
        if (await _context.DietOrders.AnyAsync(o => o.AdmissionId == dto.AdmissionId && o.Status == "Active"))
            throw new InvalidOperationException("Bệnh nhân đã có chế độ ăn đang hiệu lực — hãy sửa hoặc ngưng đơn hiện tại");
        var orderedById = _currentUser?.UserGuid
            ?? throw new InvalidOperationException("Không xác định được người chỉ định (chưa đăng nhập).");
        var entity = new DietOrder
        {
            Id = Guid.NewGuid(), OrderCode = CodeGenerator.Timestamp("DIET"), AdmissionId = dto.AdmissionId, PatientId = admission.PatientId,
            DietTypeId = dto.DietTypeId, OrderedById = orderedById,
            TargetCalories = dto.CalorieLevel, TargetProtein = dto.ProteinLevel, Status = "Active", StartDate = dto.StartDate, EndDate = dto.EndDate,
            TextureModification = dto.Texture, Allergies = JoinCsv(dto.Allergies), FoodPreferences = JoinCsv(dto.Dislikes),
            Restrictions = JoinCsv(dto.Restrictions), SpecialInstructions = dto.SpecialInstructions, CreatedAt = DateTime.Now,
            FeedingRoute = string.IsNullOrWhiteSpace(dto.FeedingRoute) ? null : dto.FeedingRoute.Trim(),
            MealFrequency = dto.MealFrequency, IncludeSnacks = dto.IncludeSnacks
        };
        _context.DietOrders.Add(entity);
        await _context.SaveChangesAsync();
        return await GetDietOrderAsync(entity.Id);
    }

    public async Task<DietOrderDto> UpdateDietOrderAsync(Guid id, CreateDietOrderDto dto)
    {
        var e = await _context.DietOrders.FindAsync(id)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn dinh dưỡng");
        if (e.Status != "Active")
            throw new InvalidOperationException("Chỉ sửa được đơn dinh dưỡng đang hiệu lực");
        await ValidateDietOrderAsync(dto);
        e.DietTypeId = dto.DietTypeId; e.TargetCalories = dto.CalorieLevel; e.TargetProtein = dto.ProteinLevel;
        e.StartDate = dto.StartDate; e.EndDate = dto.EndDate; e.TextureModification = dto.Texture;
        e.Allergies = JoinCsv(dto.Allergies); e.FoodPreferences = JoinCsv(dto.Dislikes); e.Restrictions = JoinCsv(dto.Restrictions);
        e.SpecialInstructions = dto.SpecialInstructions; e.UpdatedAt = DateTime.Now;
        if (!string.IsNullOrWhiteSpace(dto.FeedingRoute)) e.FeedingRoute = dto.FeedingRoute.Trim();
        if (dto.MealFrequency.HasValue) e.MealFrequency = dto.MealFrequency;
        if (dto.IncludeSnacks.HasValue) e.IncludeSnacks = dto.IncludeSnacks;
        await _context.SaveChangesAsync();
        return await GetDietOrderAsync(id);
    }

    public async Task<bool> DiscontinueDietOrderAsync(Guid id, string reason)
    {
        var e = await _context.DietOrders.FindAsync(id)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn dinh dưỡng");
        if (e.Status != "Active")
            throw new InvalidOperationException("Đơn dinh dưỡng đã ngưng/kết thúc");
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
        var plans = await query.OrderBy(p => p.MealType).ToBoundedListAsync("ClinicalNutrition.GetMealPlans");
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
        var list = await _context.NutritionMonitorings.Where(x => x.AdmissionId == admissionId).OrderByDescending(x => x.Date).ToBoundedListAsync("ClinicalNutrition.MonitoringHistory");
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
                // QA-R2: was never computed → v2 KPI "Chờ sàng lọc" always showed 0 (dashboard value wins over the local count).
                PendingScreening = await _context.Admissions.CountAsync(a => a.Status == 0
                    && !_context.NutritionScreenings.Any(s => s.AdmissionId == a.Id)),
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
        NutritionScore = e.NutritionScore, DiseaseScore = e.DiseaseScore, AgeScore = e.AgeScore, TotalScore = e.TotalScore, RiskLevel = e.RiskLevel,
        RequiresIntervention = e.RequiresIntervention, SGACategory = e.SGACategory ?? "", ScreeningDate = e.ScreeningDate
    };
}
