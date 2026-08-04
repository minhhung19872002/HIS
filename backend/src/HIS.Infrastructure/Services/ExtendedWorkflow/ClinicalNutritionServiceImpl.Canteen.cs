using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Nutrition;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap26 — XII.5 Duyệt phiếu suất ăn (khoa dinh dưỡng) · XII.6 Nhà ăn.
/// Vòng đời: Planned → Approved/Rejected → Prepared → Distributed.
/// Khi duyệt, mỗi suất ăn có DietType đã map ServiceId sẽ sinh khoản thu cho BN;
/// MealPlanItem.BilledAt chống tính tiền 2 lần khi duyệt lại.
/// </summary>
public partial class ClinicalNutritionServiceImpl
{
    public async Task<MealPlanApprovalResultDto> ApproveMealPlanAsync(Guid mealPlanId, Guid userId)
    {
        var plan = await _context.MealPlans
            .Include(p => p.Items!).ThenInclude(i => i.DietOrder)
            .FirstOrDefaultAsync(p => p.Id == mealPlanId && !p.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy phiếu suất ăn.");

        if (plan.Status is "Prepared" or "Distributed")
            throw new InvalidOperationException($"Phiếu đã ở trạng thái \"{plan.Status}\", không duyệt lại được.");

        var now = DateTime.Now;
        plan.Status = "Approved";
        plan.ApprovedBy = userId;
        plan.ApprovedAt = now;
        plan.RejectReason = null;
        plan.UpdatedAt = now;

        var billed = await BillApprovedMealsAsync(plan, userId, now);
        await _context.SaveChangesAsync();

        return new MealPlanApprovalResultDto
        {
            MealPlanId = plan.Id,
            Status = plan.Status,
            ApprovedAt = now,
            BilledItems = billed,
            TotalItems = plan.Items?.Count ?? 0
        };
    }

    public async Task<MealPlanApprovalResultDto> RejectMealPlanAsync(Guid mealPlanId, string reason, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("Phải nhập lý do từ chối phiếu suất ăn.");

        var plan = await _context.MealPlans.FirstOrDefaultAsync(p => p.Id == mealPlanId && !p.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy phiếu suất ăn.");

        if (plan.Status is "Prepared" or "Distributed")
            throw new InvalidOperationException($"Phiếu đã ở trạng thái \"{plan.Status}\", không từ chối được.");

        plan.Status = "Rejected";
        plan.RejectReason = reason.Trim();
        plan.ApprovedBy = userId;
        plan.ApprovedAt = DateTime.Now;
        plan.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();

        return new MealPlanApprovalResultDto
        {
            MealPlanId = plan.Id, Status = plan.Status, ApprovedAt = plan.ApprovedAt, BilledItems = 0,
            TotalItems = 0
        };
    }

    public async Task<List<CanteenQueueItemDto>> GetCanteenQueueAsync(DateTime date, string? mealType)
    {
        var q = _context.MealPlans
            .Include(p => p.Department)
            // Màn hình gộp 2 vai (khoa dinh dưỡng DUYỆT + nhà ăn CHUẨN BỊ/PHÁT) nên phải trả cả
            // phiếu "Planned" — nếu lọc bỏ thì khâu duyệt XII.5 không có đường vào. Việc chặn
            // nhà ăn thao tác trên phiếu chưa duyệt do AdvanceCanteenStatusAsync đảm nhiệm.
            .Where(p => !p.IsDeleted && p.Date.Date == date.Date
                        && (p.Status == "Planned" || p.Status == "Approved"
                            || p.Status == "Prepared" || p.Status == "Distributed"));
        if (!string.IsNullOrWhiteSpace(mealType)) q = q.Where(p => p.MealType == mealType);

        var plans = await q.OrderBy(p => p.MealType).ThenBy(p => p.Department!.DepartmentName).ToListAsync();

        return plans.Select(p => new CanteenQueueItemDto
        {
            MealPlanId = p.Id,
            Date = p.Date,
            MealType = p.MealType,
            DepartmentId = p.DepartmentId,
            DepartmentName = p.Department?.DepartmentName ?? "(Toàn viện)",
            TotalPatients = p.TotalPatients,
            Status = p.Status,
            ApprovedAt = p.ApprovedAt,
            PreparedAt = p.PreparedAt,
            DistributedAt = p.DistributedAt
        }).ToList();
    }

    public async Task<CanteenQueueItemDto> MarkMealPlanPreparedAsync(Guid mealPlanId, Guid userId)
        => await AdvanceCanteenStatusAsync(mealPlanId, userId, "Prepared");

    public async Task<CanteenQueueItemDto> MarkMealPlanDistributedAsync(Guid mealPlanId, Guid userId)
        => await AdvanceCanteenStatusAsync(mealPlanId, userId, "Distributed");

    private async Task<CanteenQueueItemDto> AdvanceCanteenStatusAsync(Guid mealPlanId, Guid userId, string target)
    {
        var plan = await _context.MealPlans
            .Include(p => p.Department)
            .Include(p => p.Items!)
            .FirstOrDefaultAsync(p => p.Id == mealPlanId && !p.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy phiếu suất ăn.");

        // Nhà ăn chỉ thao tác trên phiếu ĐÃ DUYỆT — chặn phát suất chưa qua khoa dinh dưỡng.
        if (target == "Prepared" && plan.Status != "Approved")
            throw new InvalidOperationException("Chỉ chuẩn bị được phiếu đã duyệt.");
        if (target == "Distributed" && plan.Status is not ("Approved" or "Prepared"))
            throw new InvalidOperationException("Chỉ phát được phiếu đã duyệt/đã chuẩn bị.");

        var now = DateTime.Now;
        plan.Status = target;
        if (target == "Prepared") plan.PreparedAt = now;
        else
        {
            plan.DistributedAt = now;
            foreach (var it in plan.Items ?? new List<MealPlanItem>())
            {
                if (it.IsDeleted || it.IsDelivered) continue;
                it.IsDelivered = true;
                it.DeliveredAt = now;
                it.UpdatedAt = now;
            }
        }
        plan.UpdatedAt = now;
        plan.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        return new CanteenQueueItemDto
        {
            MealPlanId = plan.Id, Date = plan.Date, MealType = plan.MealType,
            DepartmentId = plan.DepartmentId, DepartmentName = plan.Department?.DepartmentName ?? "(Toàn viện)",
            TotalPatients = plan.TotalPatients, Status = plan.Status,
            ApprovedAt = plan.ApprovedAt, PreparedAt = plan.PreparedAt, DistributedAt = plan.DistributedAt
        };
    }

    /// <summary>
    /// Sinh khoản thu suất ăn cho các item chưa tính tiền. Chỉ tính khi DietType
    /// đã được map ServiceId trong danh mục — NULL nghĩa là chế độ ăn không thu tiền.
    /// </summary>
    private async Task<int> BillApprovedMealsAsync(MealPlan plan, Guid userId, DateTime now)
    {
        var items = (plan.Items ?? new List<MealPlanItem>())
            .Where(i => !i.IsDeleted && i.BilledAt == null)
            .ToList();
        if (items.Count == 0) return 0;

        var dietTypeIds = items.Where(i => i.DietOrder != null).Select(i => i.DietOrder!.DietTypeId).Distinct().ToList();
        var serviceByDietType = await _context.DietTypes
            .Where(d => dietTypeIds.Contains(d.Id) && d.ServiceId != null)
            .ToDictionaryAsync(d => d.Id, d => d.ServiceId!.Value);
        if (serviceByDietType.Count == 0) return 0;

        var admissionIds = items.Where(i => i.DietOrder != null).Select(i => i.DietOrder!.AdmissionId).Distinct().ToList();
        var admissions = await _context.Admissions
            .Where(a => admissionIds.Contains(a.Id))
            .Select(a => new { a.Id, a.MedicalRecordId, a.DepartmentId })
            .ToDictionaryAsync(a => a.Id, a => a);

        var serviceIds = serviceByDietType.Values.Distinct().ToList();
        var prices = await _context.Services
            .Where(s => serviceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.UnitPrice);

        var billed = 0;
        foreach (var it in items)
        {
            if (it.DietOrder == null) continue;
            if (!serviceByDietType.TryGetValue(it.DietOrder.DietTypeId, out var serviceId)) continue;
            if (!admissions.TryGetValue(it.DietOrder.AdmissionId, out var adm)) continue;

            var price = prices.TryGetValue(serviceId, out var p) ? p : 0m;
            var requestId = Guid.NewGuid();

            // Dùng đúng đường tính tiền sẵn có của hệ thống (ServiceRequest + Detail)
            // thay vì tạo bảng thu riêng cho suất ăn.
            _context.ServiceRequests.Add(new ServiceRequest
            {
                Id = requestId,
                RequestCode = $"SA{now:yyyyMMddHHmmss}{billed:D3}",
                RequestDate = plan.Date,
                MedicalRecordId = adm.MedicalRecordId,
                DoctorId = it.DietOrder.OrderedById,
                DepartmentId = adm.DepartmentId,
                RequestType = 5, // Khác
                ServiceId = serviceId,
                Quantity = 1,
                UnitPrice = price,
                TotalPrice = price,
                TotalAmount = price,
                PatientAmount = price,
                Status = 2, // đang/đã thực hiện — suất ăn được phát trong ngày
                Note = $"Suất ăn {plan.MealType} ngày {plan.Date:dd/MM/yyyy}",
                CreatedAt = now,
                CreatedBy = userId.ToString(),
                Details = new List<ServiceRequestDetail>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        ServiceRequestId = requestId,
                        ServiceId = serviceId,
                        Quantity = 1,
                        UnitPrice = price,
                        Amount = price,
                        PatientAmount = price,
                        Status = 2,
                        CreatedAt = now,
                        CreatedBy = userId.ToString()
                    }
                }
            });

            it.BilledAt = now;
            it.UpdatedAt = now;
            billed++;
        }
        return billed;
    }
}
