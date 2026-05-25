namespace HIS.Application.Services;

/// <summary>
/// State-transition guard cho các submission/certificate trong NangCap23.
/// Mỗi entity có thang status 0..4 chung:
///   0 = Nháp / NotSubmitted
///   1 = Đã gửi / Submitted
///   2 = Cổng xác nhận / Acknowledged
///   3 = Bị từ chối / Rejected
///   4 = Đã hủy / Cancelled
///
/// Service layer GỌI <see cref="EnsureCanSubmit"/>, <see cref="EnsureCanRetry"/>,
/// <see cref="EnsureCanCancel"/> trước khi mutate entity. Helper throw
/// <see cref="InvalidOperationException"/> với message tiếng Việt để controller
/// trả về 400 + body có lý do (qua exception filter mặc định của ASP.NET).
/// </summary>
public static class Nangcap23StateMachine
{
    /// <summary>Submit chỉ hợp lệ khi status ∈ {0 Nháp, 3 Rejected}.</summary>
    public static void EnsureCanSubmit(int currentStatus, string entityLabel)
    {
        if (currentStatus == 0 || currentStatus == 3) return;
        throw new InvalidOperationException(currentStatus switch
        {
            1 => $"{entityLabel} đang ở trạng thái 'Đã gửi' — chờ phản hồi cổng, không thể submit lại.",
            2 => $"{entityLabel} đã được cổng QG xác nhận — không thể submit lại.",
            4 => $"{entityLabel} đã hủy — không thể submit. Vui lòng tạo bản mới.",
            _ => $"{entityLabel} ở trạng thái không hợp lệ (status={currentStatus})."
        });
    }

    /// <summary>Retry chỉ hợp lệ khi status ∈ {1 Submitted, 3 Rejected}. Không cho retry khi đã ack/cancel.</summary>
    public static void EnsureCanRetry(int currentStatus, int retryCount, int maxRetries, string entityLabel)
    {
        if (currentStatus == 2)
            throw new InvalidOperationException($"{entityLabel} đã được cổng xác nhận — không cần retry.");
        if (currentStatus == 4)
            throw new InvalidOperationException($"{entityLabel} đã hủy — không thể retry.");
        if (currentStatus == 0)
            throw new InvalidOperationException($"{entityLabel} chưa từng gửi — vui lòng submit lần đầu thay vì retry.");
        if (retryCount >= maxRetries)
            throw new InvalidOperationException($"{entityLabel} đã retry {retryCount} lần — vượt quá giới hạn {maxRetries} lần.");
    }

    /// <summary>Cancel chỉ hợp lệ khi status ∈ {0, 1, 3}. Không cancel được khi đã ack hoặc đã cancel rồi.</summary>
    public static void EnsureCanCancel(int currentStatus, string entityLabel)
    {
        if (currentStatus == 2)
            throw new InvalidOperationException($"{entityLabel} đã được cổng xác nhận — không thể hủy. Liên hệ cổng QG để yêu cầu hoàn nguyên.");
        if (currentStatus == 4)
            throw new InvalidOperationException($"{entityLabel} đã ở trạng thái 'Đã hủy'.");
    }

    /// <summary>Đảm bảo Functional Diagnostics Verify chỉ chạy sau Complete (status=2).</summary>
    public static void EnsureCanVerifyDiagnostic(int currentStatus)
    {
        if (currentStatus != 2)
            throw new InvalidOperationException(currentStatus switch
            {
                0 => "Phiếu thăm dò chức năng chưa thực hiện — không thể duyệt.",
                1 => "Phiếu đang thực hiện — vui lòng hoàn tất trước khi duyệt.",
                3 => "Phiếu đã được duyệt rồi.",
                4 => "Phiếu đã hủy — không thể duyệt.",
                _ => $"Trạng thái không hợp lệ (status={currentStatus})."
            });
    }

    /// <summary>Đảm bảo Sterilization Schedule chuyển status hợp lệ (0→1→2 hoặc 0→4 hoặc 1→3 Failed).</summary>
    public static void EnsureValidSterilizationTransition(int from, int to)
    {
        var valid = (from, to) switch
        {
            (0, 1) => true,  // Scheduled → InProgress
            (1, 2) => true,  // InProgress → Completed
            (1, 3) => true,  // InProgress → Failed
            (0, 4) => true,  // Scheduled → Cancelled
            (1, 4) => true,  // InProgress → Cancelled
            _ => false
        };
        if (!valid)
            throw new InvalidOperationException($"Chuyển trạng thái không hợp lệ: {from} → {to}.");
    }

    /// <summary>
    /// Đảm bảo Linen Transaction (giao/nhận đồ vải) chuyển status hợp lệ.
    /// Status: 0=Draft, 1=Dispatched, 2=Received, 3=Reconciled, 4=Cancelled.
    /// Workflow chuẩn: 0→1→2→3 hoặc bất kỳ trạng thái trước Reconciled có thể Cancel.
    /// Chặn các nhảy bất hợp pháp (vd. 0→3 Reconciled khi chưa Receive).
    /// </summary>
    public static void EnsureValidLinenTransition(int from, int to)
    {
        if (from == to) return; // idempotent — không đổi gì
        var valid = (from, to) switch
        {
            (0, 1) => true,  // Draft → Dispatched
            (1, 2) => true,  // Dispatched → Received
            (2, 3) => true,  // Received → Reconciled (sau kiểm đếm)
            (0, 4) => true,  // Draft → Cancelled
            (1, 4) => true,  // Dispatched → Cancelled (recall trước khi nhận)
            (2, 4) => true,  // Received → Cancelled (phát hiện sai sau khi nhận, hủy)
            _ => false
        };
        if (!valid)
            throw new InvalidOperationException(
                $"Chuyển trạng thái giao nhận đồ vải không hợp lệ: {from} → {to}. " +
                "Workflow đúng: Nháp → Đã giao → Đã nhận → Đối soát.");
    }
}
