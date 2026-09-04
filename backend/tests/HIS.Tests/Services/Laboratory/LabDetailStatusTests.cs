using System;
using HIS.Core.Constants;
using Xunit;

namespace HIS.Tests.Services.Laboratory;

/// <summary>
/// #218 (T3): luật ghi kết quả lên một dòng chỉ định xét nghiệm.
///
/// Đo trên API đang chạy (docs/architecture/evidence/cross/t3/t3_lab_transitions.json) cho thấy
/// chiều NGƯỢC đã được <c>LabCancelChainService</c> gác đúng chuỗi (hủy duyệt → hủy KQ → hủy lấy
/// mẫu, 3/3 ca chặn đúng), nhưng chiều THUẬN thì không: ghi được kết quả vào chỉ định đã hủy, và
/// đè được lên kết quả bác sĩ đã duyệt — cả hai cửa, nhập tay lẫn máy phân tích.
///
/// Hai lượt đè kết quả đã duyệt là nguy hiểm nhất: <c>ReviewedAt</c> vẫn còn nguyên sau khi bị đè,
/// nên bệnh án hiện một con số khác con số bác sĩ đã ký mà không để lại dấu vết nào.
/// </summary>
public class LabDetailStatusTests
{
    [Theory]
    [InlineData(LabDetailStatus.Pending)]
    [InlineData(LabDetailStatus.InProgress)]
    [InlineData(LabDetailStatus.HasResult)]   // ghi lại khi CHƯA duyệt là hợp lệ (chạy lại mẫu)
    public void Unreviewed_and_not_cancelled_can_take_a_result(int status)
        => Assert.True(LabDetailStatus.CanWriteResult(status, isReviewed: false));

    [Fact]
    public void Cancelled_order_cannot_take_a_result()
        => Assert.False(LabDetailStatus.CanWriteResult(LabDetailStatus.Cancelled, isReviewed: false));

    [Theory]
    [InlineData(LabDetailStatus.Pending)]
    [InlineData(LabDetailStatus.InProgress)]
    [InlineData(LabDetailStatus.HasResult)]
    public void Reviewed_result_cannot_be_overwritten(int status)
        => Assert.False(LabDetailStatus.CanWriteResult(status, isReviewed: true));

    [Fact]
    public void Cancelled_beats_reviewed_in_the_refusal_message()
    {
        // Một dòng vừa hủy vừa đã duyệt thì lý do nêu ra phải là "đã hủy" — đó là trạng thái
        // người dùng cần biết trước để xử lý.
        Assert.Equal("Chỉ định đã hủy, không ghi được kết quả.",
            LabDetailStatus.WriteResultRefusal(LabDetailStatus.Cancelled, isReviewed: true));
    }

    [Fact]
    public void Reviewed_refusal_says_to_unapprove_first()
        => Assert.Equal("Kết quả đã được duyệt. Phải hủy duyệt trước khi ghi đè.",
            LabDetailStatus.WriteResultRefusal(LabDetailStatus.HasResult, isReviewed: true));

    [Fact]
    public void No_refusal_when_the_write_is_allowed()
        => Assert.Null(LabDetailStatus.WriteResultRefusal(LabDetailStatus.InProgress, isReviewed: false));

    [Fact]
    public void Ensure_throws_for_a_cancelled_order()
        => Assert.Throws<InvalidOperationException>(
            () => LabDetailStatus.EnsureCanWriteResult(LabDetailStatus.Cancelled, isReviewed: false));

    [Fact]
    public void Ensure_throws_for_a_reviewed_result()
        => Assert.Throws<InvalidOperationException>(
            () => LabDetailStatus.EnsureCanWriteResult(LabDetailStatus.HasResult, isReviewed: true));

    [Fact]
    public void Ensure_stays_silent_on_the_normal_path()
        => LabDetailStatus.EnsureCanWriteResult(LabDetailStatus.InProgress, isReviewed: false);

    [Theory]
    [InlineData(LabDetailStatus.Pending, "Chờ")]
    [InlineData(LabDetailStatus.InProgress, "Đang thực hiện")]
    [InlineData(LabDetailStatus.HasResult, "Có kết quả")]
    [InlineData(LabDetailStatus.Cancelled, "Đã hủy")]
    public void Labels_match_the_vocabulary_the_running_code_uses(int status, string expected)
        => Assert.Equal(expected, LabDetailStatus.Label(status));

    [Fact]
    public void Unknown_status_is_named_rather_than_hidden()
        => Assert.Equal("Không xác định (9)", LabDetailStatus.Label(9));
}
