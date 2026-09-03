using HIS.Application.Common;
using HIS.Application.DTOs.LabCancelChain;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// M3.14 — Hủy chuỗi ngược workflow XN. Logic tách khỏi LabCancelChainController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/validate/response shape + message + Vietnamese string giữ
/// nguyên; userId truyền từ controller (thay cho GetUserId() cũ đọc claim). Return map về ServiceOutcome.
///
/// FLOW-3 #14a (audit luồng nghiệp vụ 2026-06-06 #10): thao tác trên
/// <see cref="ServiceRequestDetail"/> (model 1 — nguồn-sự-thật, nơi KQ XN thật được ghi),
/// thay vì <c>LabRequestItem</c> (model 2 — chỉ seed tạo, chết trong luồng thật).
///
/// Trạng thái CLS trên model 1 (ServiceRequestDetail.Status: 0=Chờ,1=Đang TH,2=Có KQ,3=Hủy),
/// "đã duyệt" = ReviewedAt != null. Chuỗi hủy ngược:
///   1) Hủy duyệt (ReviewedAt set → clear)             — cancel-approval
///   2) Hủy KQ (Status 2 → 1, xóa Result)              — cancel-result
///   3) Hủy lấy mẫu (IsSampleCollected → false, → 0)   — cancel-collection
/// Mỗi bước validate bước sau phải được hủy trước. Đồng thời cập nhật ServiceRequest.Status cha.
///
/// Input nhận id của một ServiceRequestDetail HOẶC một ServiceRequest (UI v1 cấp order) —
/// dual-lookup: nếu là phiếu cha thì áp cho mọi dòng chưa hủy.
/// </summary>
public class LabCancelChainService : ILabCancelChainService
{
    private readonly HISDbContext _db;

    public LabCancelChainService(HISDbContext db) { _db = db; }

    private static string StatusLabel(int s) => s switch
    {
        0 => "Chờ lấy mẫu",
        1 => "Đang thực hiện",
        2 => "Có kết quả",
        3 => "Đã hủy",
        _ => "Khác"
    };

    /// <summary>Resolve target details: id là ServiceRequestDetail → 1 dòng; nếu là ServiceRequest → mọi dòng chưa hủy.</summary>
    private async Task<List<ServiceRequestDetail>> ResolveDetailsAsync(Guid id)
    {
        var one = await _db.ServiceRequestDetails.FirstOrDefaultAsync(d => d.Id == id);
        if (one != null) return new List<ServiceRequestDetail> { one };
        return await _db.ServiceRequestDetails
            .Where(d => d.ServiceRequestId == id && d.Status != 3)
            .ToListAsync();
    }

    /// <summary>Cập nhật Status phiếu cha theo các dòng còn lại: còn dòng "Có KQ" → 2 (đang có KQ), ngược lại → 2 (đang TH).</summary>
    private async Task UpdateParentStatusAsync(IEnumerable<Guid> serviceRequestIds)
    {
        // #195: nạp 1 lần các phiếu cha thay vì 1 query/phiếu.
        var srIds = serviceRequestIds.Distinct().ToList();
        var parents = await _db.ServiceRequests
            .Where(r => srIds.Contains(r.Id))
            .ToListAsync();

        foreach (var sr in parents)
        {
            // Phiếu "Có kết quả" (Status=3) khi đã rollback KQ phải lùi về "Đang thực hiện" (2).
            if (sr.Status == 3) sr.Status = 2;
        }
    }

    /// <summary>Step 1: Hủy duyệt kết quả (đã duyệt → bỏ duyệt, giữ KQ).</summary>
    public async Task<ServiceOutcome> CancelApprovalAsync(CancelRequest dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return ServiceOutcome.Bad("Phải ghi lý do hủy duyệt");

        var details = await ResolveDetailsAsync(dto.ServiceRequestDetailId);
        var targets = details.Where(d => d.ReviewedAt != null).ToList();
        if (targets.Count == 0)
            return ServiceOutcome.Status(400, new CancelResponse(false, 0, "", "Không có kết quả đã duyệt để hủy duyệt"));

        var note = $"\n[Hủy duyệt {DateTime.Now:dd/MM HH:mm} - {userId}]: {dto.Reason}";
        foreach (var d in targets)
        {
            d.ReviewedAt = null;
            d.ReviewerUserId = null;
            d.Note = (d.Note ?? "") + note;
            d.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        var st = targets[0].Status;
        return ServiceOutcome.Ok(new CancelResponse(true, st, StatusLabel(st), $"Đã hủy duyệt {targets.Count} kết quả"));
    }

    /// <summary>Step 2: Hủy kết quả (Có KQ → Đang TH). Phải hủy duyệt trước.</summary>
    public async Task<ServiceOutcome> CancelResultAsync(CancelRequest dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return ServiceOutcome.Bad("Phải ghi lý do hủy kết quả");

        var details = await ResolveDetailsAsync(dto.ServiceRequestDetailId);
        var withResult = details.Where(d => d.Status == 2 || d.Result != null || d.ResultDate != null).ToList();
        if (withResult.Count == 0)
            return ServiceOutcome.Status(400, new CancelResponse(false, 0, "", "Không có kết quả để hủy"));
        if (withResult.Any(d => d.ReviewedAt != null))
            return ServiceOutcome.Status(400, new CancelResponse(false, 2, StatusLabel(2), "KQ đã duyệt. Phải hủy duyệt trước (bước 1)"));

        var note = $"\n[Hủy KQ {DateTime.Now:dd/MM HH:mm} - {userId}]: {dto.Reason}";
        foreach (var d in withResult)
        {
            d.Result = null;
            d.ResultDescription = null;
            d.Conclusion = null;
            d.ResultDate = null;
            d.ResultUserId = null;
            d.TechnicianUserId = null;
            d.TechnicianRunAt = null;
            d.Status = 1; // Đang thực hiện (giữ mẫu đã nhận)
            d.Note = (d.Note ?? "") + note;
            d.UpdatedAt = DateTime.UtcNow;
        }
        await UpdateParentStatusAsync(withResult.Select(d => d.ServiceRequestId));

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new CancelResponse(true, 1, StatusLabel(1),
            $"Đã hủy {withResult.Count} kết quả, rollback sang 'Đang thực hiện'"));
    }

    /// <summary>Step 3: Hủy lấy/nhận mẫu (→ Chờ lấy mẫu). Phải hủy KQ trước.</summary>
    public async Task<ServiceOutcome> CancelCollectionAsync(CancelRequest dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return ServiceOutcome.Bad("Phải ghi lý do hủy lấy mẫu");

        var details = await ResolveDetailsAsync(dto.ServiceRequestDetailId);
        var collected = details.Where(d => d.IsSampleCollected || d.SampleCollectedAt != null || d.ReceiveStatus == 1).ToList();
        if (collected.Count == 0)
            return ServiceOutcome.Status(400, new CancelResponse(false, 0, StatusLabel(0), "Mẫu chưa lấy, không cần hủy"));
        if (collected.Any(d => d.Status == 2 || d.Result != null))
            return ServiceOutcome.Status(400, new CancelResponse(false, 2, StatusLabel(2), "Mẫu đã có KQ. Phải hủy KQ trước (bước 2)"));

        var note = $"\n[Hủy lấy mẫu {DateTime.Now:dd/MM HH:mm} - {userId}]: {dto.Reason}";
        foreach (var d in collected)
        {
            d.IsSampleCollected = false;
            d.SampleCollectedAt = null;
            d.SampleBarcode = null;
            d.CollectedByUserId = null;
            d.ReceiveStatus = 0;
            d.ReceivedAt = null;
            d.ReceivedByUserId = null;
            d.Status = 0; // Chờ lấy mẫu
            d.Note = (d.Note ?? "") + note;
            d.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new CancelResponse(true, 0, StatusLabel(0), $"Đã hủy lấy mẫu {collected.Count} dòng"));
    }
}
