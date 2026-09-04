using HIS.Core.Constants;
using Xunit;

namespace HIS.Tests.Services.Pharmacy;

/// <summary>
/// #218 (T3): luật chuyển trạng thái đơn thuốc.
///
/// Đo trên API đang chạy (docs/architecture/evidence/cross/t3) cho thấy trước khi có luật thì
/// 9/15 lượt chuyển bất hợp lệ đều được chấp nhận với HTTP 200 — trong đó có hai lượt nguy hiểm:
/// đơn đã HỦY vẫn cấp phát được, và đơn ĐÃ CẤP PHÁT vẫn hủy được bằng cách lật cờ mà không hoàn kho.
/// Lưới test này giữ bảng luật khỏi bị nới lỏng lại về sau.
/// </summary>
public class PrescriptionTransitionTests
{
    [Theory]
    // Đường đi đúng của một đơn thuốc.
    [InlineData(PrescriptionStatus.PendingApproval, PrescriptionStatus.Approved)]
    [InlineData(PrescriptionStatus.PendingApproval, PrescriptionStatus.Cancelled)]
    [InlineData(PrescriptionStatus.Approved, PrescriptionStatus.Dispensed)]
    [InlineData(PrescriptionStatus.Approved, PrescriptionStatus.PartialDispensed)]
    [InlineData(PrescriptionStatus.Approved, PrescriptionStatus.Cancelled)]
    [InlineData(PrescriptionStatus.PartialDispensed, PrescriptionStatus.Dispensed)]
    [InlineData(PrescriptionStatus.PartialDispensed, PrescriptionStatus.Returned)]
    [InlineData(PrescriptionStatus.PartialDispensed, PrescriptionStatus.Cancelled)]
    [InlineData(PrescriptionStatus.Dispensed, PrescriptionStatus.Returned)]
    public void Legal_transitions_are_allowed(int from, int to)
        => Assert.True(PrescriptionStatus.CanTransition(from, to));

    [Theory]
    // Hai lượt nguy hiểm nhất mà bản chưa sửa cho qua.
    [InlineData(PrescriptionStatus.Cancelled, PrescriptionStatus.Dispensed)]
    [InlineData(PrescriptionStatus.Dispensed, PrescriptionStatus.Cancelled)]
    // Phát khi chưa được dược sĩ duyệt.
    [InlineData(PrescriptionStatus.PendingApproval, PrescriptionStatus.Dispensed)]
    // Trạng thái kết thúc thì không quay đầu.
    [InlineData(PrescriptionStatus.Cancelled, PrescriptionStatus.Approved)]
    [InlineData(PrescriptionStatus.Returned, PrescriptionStatus.Approved)]
    [InlineData(PrescriptionStatus.Returned, PrescriptionStatus.Dispensed)]
    [InlineData(PrescriptionStatus.Returned, PrescriptionStatus.Cancelled)]
    // Lùi trạng thái sau khi đã phát.
    [InlineData(PrescriptionStatus.Dispensed, PrescriptionStatus.Approved)]
    [InlineData(PrescriptionStatus.PartialDispensed, PrescriptionStatus.Approved)]
    public void Illegal_transitions_are_refused(int from, int to)
    {
        Assert.False(PrescriptionStatus.CanTransition(from, to));
        var ex = Assert.Throws<InvalidOperationException>(
            () => PrescriptionStatus.EnsureCanTransition(from, to));
        // Thông báo phải gọi tên hai trạng thái để người dùng biết vì sao bị chặn.
        Assert.Contains(PrescriptionStatus.GetName(from), ex.Message);
        Assert.Contains(PrescriptionStatus.GetName(to), ex.Message);
    }

    [Theory]
    [InlineData(PrescriptionStatus.PendingApproval)]
    [InlineData(PrescriptionStatus.Approved)]
    [InlineData(PrescriptionStatus.Dispensed)]
    [InlineData(PrescriptionStatus.Cancelled)]
    public void Staying_in_the_same_state_is_a_no_op(int status)
    {
        // Giao diện gọi lại cùng một hành động (bấm hai lần, retry mạng) không được biến thành lỗi.
        Assert.True(PrescriptionStatus.CanTransition(status, status));
        PrescriptionStatus.EnsureCanTransition(status, status);
    }

    [Fact]
    public void Cancelled_is_four_not_five()
    {
        // WarehouseCompleteService.CancelUnclaimedPrescriptionAsync từng ghi 5 (giá trị Cancelled của
        // ExaminationStatus/LabRequestStatus) nên đơn hủy quá hạn không lọt màn lọc Status == 4.
        Assert.Equal(4, PrescriptionStatus.Cancelled);
        Assert.Equal("Hủy", PrescriptionStatus.GetName(PrescriptionStatus.Cancelled));
    }
}
