using System;
using HIS.Core.Constants;
using Xunit;

namespace HIS.Tests.Services.Surgery;

/// <summary>
/// #218 (T3): luật bắt đầu và kết thúc một ca mổ.
///
/// Đo trên API đang chạy (docs/architecture/evidence/cross/t3/t3_surgery_transitions.json) trước khi
/// có luật, 3/13 ca đạt. Hai điều nặng nhất:
///
/// * **Kết thúc một ca chưa từng bắt đầu thì tường trình rơi hết.** Biên bản mổ chỉ sinh ra ở bước
///   bắt đầu, mà chẩn đoán sau mổ / mô tả / tai biến lại ghi vào biên bản đó qua một
///   `if (record != null)`. Không có biên bản thì mọi thứ bác sĩ gõ vào biến mất, API vẫn trả 200.
/// * **Bắt đầu lần thứ hai đẻ thêm một biên bản mổ nữa** cho cùng một ca — hai tường trình cho một
///   lần mổ.
///
/// Ngoài ra bắt đầu được cả một ca ĐÃ HỦY (trạng thái nhảy từ 4 về 2).
/// </summary>
public class SurgeryStatusTests
{
    [Fact]
    public void A_scheduled_surgery_can_start()
        => Assert.True(SurgeryStatus.CanStart(
            SurgeryStatus.RequestScheduled, SurgeryStatus.SchedulePreparing));

    [Fact]
    public void A_cancelled_surgery_cannot_start()
        => Assert.False(SurgeryStatus.CanStart(
            SurgeryStatus.RequestCancelled, SurgeryStatus.SchedulePreparing));

    [Theory]
    [InlineData(SurgeryStatus.ScheduleInProgress)]
    [InlineData(SurgeryStatus.ScheduleCompleted)]
    public void A_surgery_already_under_way_or_over_cannot_start_again(int scheduleStatus)
        => Assert.False(SurgeryStatus.CanStart(SurgeryStatus.RequestScheduled, scheduleStatus));

    [Fact]
    public void Cancelled_is_reported_before_anything_else()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => SurgeryStatus.EnsureCanStart(SurgeryStatus.RequestCancelled, SurgeryStatus.SchedulePreparing));
        Assert.Equal("Ca mổ đã hủy, không bắt đầu được.", ex.Message);
    }

    [Fact]
    public void Starting_twice_is_refused_with_its_own_reason()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => SurgeryStatus.EnsureCanStart(SurgeryStatus.RequestInProgress, SurgeryStatus.ScheduleInProgress));
        Assert.Equal("Ca mổ đang diễn ra, không bắt đầu lại được.", ex.Message);
    }

    [Fact]
    public void Ensure_start_stays_silent_on_the_normal_path()
        => SurgeryStatus.EnsureCanStart(SurgeryStatus.RequestScheduled, SurgeryStatus.SchedulePreparing);

    [Fact]
    public void Completing_without_an_operative_record_is_refused_and_says_what_to_do()
    {
        // Đây là ca giữ cho tường trình không bị vứt. Câu báo lỗi phải chỉ ra việc cần làm trước,
        // vì người dùng đang có sẵn nội dung trên màn hình và chỉ cần bấm đúng thứ tự.
        var ex = Assert.Throws<InvalidOperationException>(
            () => SurgeryStatus.EnsureCanComplete(SurgeryStatus.SchedulePreparing, hasRecord: false));
        Assert.Contains("chưa được bắt đầu", ex.Message);
        Assert.Contains("Bắt đầu ca mổ", ex.Message);
    }

    [Fact]
    public void Completing_twice_is_refused()
        => Assert.Throws<InvalidOperationException>(
            () => SurgeryStatus.EnsureCanComplete(SurgeryStatus.ScheduleCompleted, hasRecord: true));

    [Fact]
    public void Ensure_complete_stays_silent_when_the_surgery_really_is_under_way()
        => SurgeryStatus.EnsureCanComplete(SurgeryStatus.ScheduleInProgress, hasRecord: true);

    [Fact]
    public void An_already_completed_surgery_is_reported_as_such_even_with_a_record()
    {
        // Thứ tự kiểm quan trọng: đã kết thúc thì nói "đã kết thúc", đừng nói "chưa bắt đầu".
        var ex = Assert.Throws<InvalidOperationException>(
            () => SurgeryStatus.EnsureCanComplete(SurgeryStatus.ScheduleCompleted, hasRecord: false));
        Assert.Equal("Ca mổ đã kết thúc rồi.", ex.Message);
    }

    [Theory]
    [InlineData(SurgeryStatus.RequestScheduled, "Đã lên lịch")]
    [InlineData(SurgeryStatus.RequestInProgress, "Đang mổ")]
    [InlineData(SurgeryStatus.RequestCompleted, "Đã hoàn thành")]
    [InlineData(SurgeryStatus.RequestCancelled, "Đã hủy")]
    public void Labels_match_the_vocabulary_the_running_code_uses(int status, string expected)
        => Assert.Equal(expected, SurgeryStatus.RequestLabel(status));
}
