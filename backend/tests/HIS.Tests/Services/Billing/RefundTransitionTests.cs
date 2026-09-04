using HIS.Core.Constants;
using Xunit;

namespace HIS.Tests.Services.Billing;

/// <summary>
/// #218 (T3): luật chuyển trạng thái phiếu hoàn tiền.
///
/// Đo trên API đang chạy (docs/architecture/evidence/cross/t3/t3_refund_matrix.json) cho thấy trước
/// khi có luật thì 11/16 lượt chuyển bất hợp lệ đều được chấp nhận với HTTP 200 — trong đó ba lượt
/// cho TIỀN RA KHỎI QUỸ sai: xác nhận chi cho phiếu chưa từng duyệt, cho phiếu đã từ chối, và cho
/// phiếu đã hủy. Lưới test này giữ bảng luật khỏi bị nới lỏng lại về sau.
/// </summary>
public class RefundTransitionTests
{
    [Theory]
    [InlineData(RefundStatus.PendingApproval, RefundStatus.Approved)]
    [InlineData(RefundStatus.PendingApproval, RefundStatus.Rejected)]
    [InlineData(RefundStatus.PendingApproval, RefundStatus.Cancelled)]
    [InlineData(RefundStatus.Approved, RefundStatus.Paid)]
    [InlineData(RefundStatus.Approved, RefundStatus.Cancelled)]
    public void Legal_transitions_are_allowed(int from, int to)
        => Assert.True(RefundStatus.CanTransition(from, to));

    [Theory]
    // Ba lượt cho tiền ra khỏi quỹ sai — nguy hiểm nhất trong nhóm này.
    [InlineData(RefundStatus.PendingApproval, RefundStatus.Paid)]
    [InlineData(RefundStatus.Rejected, RefundStatus.Paid)]
    [InlineData(RefundStatus.Cancelled, RefundStatus.Paid)]
    // Trạng thái kết thúc thì không quay đầu.
    [InlineData(RefundStatus.Rejected, RefundStatus.Approved)]
    [InlineData(RefundStatus.Rejected, RefundStatus.Cancelled)]
    [InlineData(RefundStatus.Cancelled, RefundStatus.Approved)]
    [InlineData(RefundStatus.Cancelled, RefundStatus.Rejected)]
    // Đã chi rồi thì không lật lại trên giấy.
    [InlineData(RefundStatus.Paid, RefundStatus.Approved)]
    [InlineData(RefundStatus.Paid, RefundStatus.Rejected)]
    [InlineData(RefundStatus.Paid, RefundStatus.Cancelled)]
    // Đã duyệt rồi thì không quay lại từ chối; muốn dừng thì hủy.
    [InlineData(RefundStatus.Approved, RefundStatus.Rejected)]
    public void Illegal_transitions_are_refused(int from, int to)
    {
        Assert.False(RefundStatus.CanTransition(from, to));
        var ex = Assert.Throws<InvalidOperationException>(() => RefundStatus.EnsureCanTransition(from, to));
        Assert.Contains(RefundStatus.GetName(from), ex.Message);
        Assert.Contains(RefundStatus.GetName(to), ex.Message);
    }

    [Theory]
    [InlineData(RefundStatus.PendingApproval)]
    [InlineData(RefundStatus.Approved)]
    [InlineData(RefundStatus.Paid)]
    [InlineData(RefundStatus.Cancelled)]
    public void Staying_in_the_same_state_is_a_no_op(int status)
    {
        // Bấm hai lần / retry mạng không được biến thành lỗi.
        Assert.True(RefundStatus.CanTransition(status, status));
        RefundStatus.EnsureCanTransition(status, status);
    }

    [Fact]
    public void Paid_is_four_and_cancelled_is_five()
    {
        // Các giá trị này đã nằm sẵn trong dữ liệu prod (Receipts.Status với ReceiptType = 3),
        // nên hằng số phải khớp đúng con số cũ chứ không được đánh số lại.
        Assert.Equal(4, RefundStatus.Paid);
        Assert.Equal(5, RefundStatus.Cancelled);
        Assert.Equal("Đã chi hoàn", RefundStatus.GetName(RefundStatus.Paid));
    }
}
