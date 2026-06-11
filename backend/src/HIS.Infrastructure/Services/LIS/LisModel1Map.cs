using HIS.Core.Entities;

namespace HIS.Infrastructure.Services;

/// <summary>
/// #14e-B: helper map ngữ nghĩa model 3 (LabOrders/LabOrderItems — đã gỡ) sang model 1
/// (ServiceRequest/ServiceRequestDetail) cho các DTO màn LIS v2 — GIỮ NGUYÊN shape/status FE đang render.
/// Nguồn chân lý mapping: docs/workspace-docs/20-backlog/items/plan-14eB-lis-model3.md
/// </summary>
public static class LisModel1Map
{
    /// <summary>
    /// Trạng thái header kiểu model 3 cho DTO LIS (FE Laboratory/BedLabResultSection render workflow 2 bước duyệt):
    /// 0 chờ mẫu · 1 đã lấy mẫu · 2 đang XN · 3 chờ duyệt (đủ KQ) · 4 sơ duyệt (KTV — mọi KQ có TechnicianUserId) ·
    /// 5 đã duyệt chính thức (mọi KQ đều ReviewedAt). KHÔNG ghi giá trị này vào SR.Status.
    /// Dấu "sơ duyệt" = TechnicianUserId (PreliminaryApprove set; EnterLabResult KHÔNG set — chỉ set TechnicianRunAt).
    /// </summary>
    public static int ComputeOrderStatus(IEnumerable<ServiceRequestDetail> details)
    {
        var act = details.Where(d => !d.IsDeleted && d.Status != 3).ToList();
        if (act.Count == 0) return 0;
        var withResult = act.Where(d => !string.IsNullOrEmpty(d.Result)).ToList();
        if (withResult.Count == act.Count && withResult.Count > 0)
        {
            if (withResult.All(d => d.ReviewedAt != null)) return 5;
            if (withResult.All(d => d.TechnicianUserId != null)) return 4;
            return 3;
        }
        if (withResult.Count > 0) return 2;
        if (act.Any(d => d.IsSampleCollected)) return 1;
        return 0;
    }

    /// <summary>
    /// ResultStatus kiểu model 3 cho 1 SRD: 0 normal · 1 low · 2 high · 3 crit-low · 4 crit-high ·
    /// 5 đã duyệt; null khi chưa có KQ. Cờ lấy từ chỉ số con (Flag N/H/L/HH/LL).
    /// </summary>
    public static int? ComputeItemResultStatus(ServiceRequestDetail d, IEnumerable<ServiceRequestDetailParameter>? parameters)
    {
        if (string.IsNullOrEmpty(d.Result)) return null;
        if (d.ReviewedAt != null) return 5;
        var flags = (parameters ?? Enumerable.Empty<ServiceRequestDetailParameter>())
            .Select(p => p.Flag).Where(f => !string.IsNullOrEmpty(f)).ToList();
        if (flags.Contains("HH")) return 4;
        if (flags.Contains("LL")) return 3;
        if (flags.Contains("H")) return 2;
        if (flags.Contains("L")) return 1;
        return 0;
    }

    /// <summary>Barcode đại diện phiếu = barcode đầu tiên có giá trị trong các SRD.</summary>
    public static string? FirstBarcode(IEnumerable<ServiceRequestDetail> details) =>
        details.Where(d => !d.IsDeleted).Select(d => d.SampleBarcode).FirstOrDefault(b => !string.IsNullOrEmpty(b));

    /// <summary>Thời điểm lấy mẫu đại diện = max SampleCollectedAt.</summary>
    public static DateTime? CollectedAt(IEnumerable<ServiceRequestDetail> details) =>
        details.Where(d => !d.IsDeleted).Select(d => d.SampleCollectedAt).Where(x => x.HasValue).OrderByDescending(x => x).FirstOrDefault();

    /// <summary>Thời điểm duyệt đại diện = max ReviewedAt.</summary>
    public static DateTime? ApprovedAt(IEnumerable<ServiceRequestDetail> details) =>
        details.Where(d => !d.IsDeleted).Select(d => d.ReviewedAt).Where(x => x.HasValue).OrderByDescending(x => x).FirstOrDefault();

    /// <summary>Người duyệt đại diện = reviewer của SRD duyệt muộn nhất.</summary>
    public static Guid? ApprovedBy(IEnumerable<ServiceRequestDetail> details) =>
        details.Where(d => !d.IsDeleted && d.ReviewedAt.HasValue).OrderByDescending(d => d.ReviewedAt).Select(d => d.ReviewerUserId).FirstOrDefault();
}
