using System;
using HIS.Core.Constants;
using Xunit;

namespace HIS.Tests.Services.Billing;

/// <summary>
/// #218 (T3): phiếu tạm ứng đã hủy thì không được đụng tới tiền nữa.
///
/// Đo trên API đang chạy (docs/architecture/evidence/cross/t3/t3_deposit_transitions.json) trước khi
/// có luật: hủy phiếu chỉ đặt `Status = 5` mà không đụng `RemainingAmount`, còn hai đường tiêu tiền
/// thì chỉ so số dư. Kết quả là phiếu đã hủy vẫn tiêu được 100.000đ và vẫn lập được phiếu hoàn.
///
/// `CreateRefundAsync` là ví dụ rõ nhất của hình dạng lỗi lặp lại suốt đợt này: nhánh "phiếu thanh
/// toán" kiểm `Status == 2` và chặn, nhánh "phiếu tạm ứng" cách đó mười dòng thì không kiểm gì.
/// </summary>
public class DepositStatusTests
{
    [Theory]
    [InlineData(DepositStatus.Confirmed)]
    [InlineData(DepositStatus.FullyUsed)]
    public void An_uncancelled_deposit_can_still_be_touched(int status)
        => Assert.True(DepositStatus.IsSpendable(status));

    [Fact]
    public void A_cancelled_deposit_cannot()
        => Assert.False(DepositStatus.IsSpendable(DepositStatus.Cancelled));

    [Fact]
    public void Ensure_throws_and_names_the_action_that_was_refused()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => DepositStatus.EnsureSpendable(DepositStatus.Cancelled, "hoàn tiền"));
        Assert.Equal("Phiếu tạm ứng đã hủy, không hoàn tiền được.", ex.Message);
    }

    [Fact]
    public void Ensure_stays_silent_for_a_live_deposit()
        => DepositStatus.EnsureSpendable(DepositStatus.Confirmed, "sử dụng");

    [Theory]
    [InlineData(DepositStatus.Confirmed, "Đã xác nhận")]
    [InlineData(DepositStatus.FullyUsed, "Đã dùng hết")]
    [InlineData(DepositStatus.Cancelled, "Đã hủy")]
    public void Labels_match_the_vocabulary_the_running_code_uses(int status, string expected)
        => Assert.Equal(expected, DepositStatus.Label(status));

    [Fact]
    public void The_numbers_are_2_3_5_with_no_4()
    {
        // Không phải 0-1-2 và cũng không liền mạch — 4 bị bỏ trống. Ghi lại thành test vì rất dễ
        // "sửa cho gọn" rồi làm lệch dữ liệu đã có trong cơ sở dữ liệu.
        Assert.Equal(2, DepositStatus.Confirmed);
        Assert.Equal(3, DepositStatus.FullyUsed);
        Assert.Equal(5, DepositStatus.Cancelled);
    }
}
