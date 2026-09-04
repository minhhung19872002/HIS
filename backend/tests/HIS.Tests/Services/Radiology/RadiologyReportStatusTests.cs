using System;
using HIS.Core.Constants;
using Xunit;

namespace HIS.Tests.Services.Radiology;

/// <summary>
/// #218 (T3): luật sửa nội dung một phiếu kết quả chẩn đoán hình ảnh.
///
/// Đo trên API đang chạy (docs/architecture/evidence/cross/t3/t3_radiology_transitions.json) trước
/// khi có luật: sửa được nội dung của phiếu đã duyệt chính thức, và sửa được cả phiếu ĐÃ KÝ SỐ —
/// lịch sử chữ ký vẫn nguyên "đã ký" sau khi kết luận bị đổi. Nói cách khác chữ ký đang bảo chứng
/// cho một nội dung khác nội dung bác sĩ thực sự ký.
///
/// Lưới test giữ hai điều dễ bị nới lỏng lại nhất:
/// (1) sơ duyệt CỐ Ý vẫn cho sửa — nếu ai đó siết luôn cả trạng thái 1 thì hỏng quy trình đọc hai
///     bước của kỹ thuật viên rồi bác sĩ;
/// (2) chữ ký được xét ĐỘC LẬP với Status — vì `CancelApprovalAsync` đưa phiếu về nháp mà không thu
///     hồi chữ ký, nên gác theo Status thôi là còn lối vòng ký → hủy duyệt → sửa.
/// </summary>
public class RadiologyReportStatusTests
{
    [Fact]
    public void Draft_can_be_edited()
        => Assert.True(RadiologyReportStatus.CanEditContent(
            RadiologyReportStatus.Draft, hasActiveSignature: false));

    [Fact]
    public void Preliminary_approval_deliberately_still_allows_editing()
        => Assert.True(RadiologyReportStatus.CanEditContent(
            RadiologyReportStatus.PreliminaryApproved, hasActiveSignature: false));

    [Fact]
    public void Final_approval_blocks_editing()
        => Assert.False(RadiologyReportStatus.CanEditContent(
            RadiologyReportStatus.FinalApproved, hasActiveSignature: false));

    [Theory]
    // Chữ ký còn hiệu lực thì chặn ở MỌI trạng thái — kể cả nháp, vì đó chính là lối vòng.
    [InlineData(RadiologyReportStatus.Draft)]
    [InlineData(RadiologyReportStatus.PreliminaryApproved)]
    [InlineData(RadiologyReportStatus.FinalApproved)]
    public void An_active_signature_blocks_editing_at_every_status(int status)
        => Assert.False(RadiologyReportStatus.CanEditContent(status, hasActiveSignature: true));

    [Fact]
    public void Signature_refusal_wins_over_approval_refusal()
    {
        // Phiếu vừa đã duyệt vừa còn chữ ký: nói về chữ ký trước, vì thu hồi chữ ký là việc nặng
        // hơn và người dùng cần biết ngay.
        Assert.Equal("Kết quả đã ký số. Phải thu hồi chữ ký trước khi sửa nội dung.",
            RadiologyReportStatus.EditContentRefusal(
                RadiologyReportStatus.FinalApproved, hasActiveSignature: true));
    }

    [Fact]
    public void Final_approval_refusal_points_at_the_unapprove_step()
        => Assert.Equal("Kết quả đã duyệt chính thức. Phải hủy duyệt trước khi sửa nội dung.",
            RadiologyReportStatus.EditContentRefusal(
                RadiologyReportStatus.FinalApproved, hasActiveSignature: false));

    [Fact]
    public void No_refusal_on_the_normal_path()
        => Assert.Null(RadiologyReportStatus.EditContentRefusal(
            RadiologyReportStatus.Draft, hasActiveSignature: false));

    [Fact]
    public void Ensure_throws_for_a_signed_report()
        => Assert.Throws<InvalidOperationException>(
            () => RadiologyReportStatus.EnsureCanEditContent(
                RadiologyReportStatus.Draft, hasActiveSignature: true));

    [Fact]
    public void Ensure_throws_for_a_finally_approved_report()
        => Assert.Throws<InvalidOperationException>(
            () => RadiologyReportStatus.EnsureCanEditContent(
                RadiologyReportStatus.FinalApproved, hasActiveSignature: false));

    [Fact]
    public void Ensure_stays_silent_on_a_draft_with_no_signature()
        => RadiologyReportStatus.EnsureCanEditContent(
            RadiologyReportStatus.Draft, hasActiveSignature: false);

    [Theory]
    [InlineData(RadiologyReportStatus.Draft, "Nháp")]
    [InlineData(RadiologyReportStatus.PreliminaryApproved, "Sơ duyệt")]
    [InlineData(RadiologyReportStatus.FinalApproved, "Đã duyệt")]
    public void Labels_match_the_vocabulary_the_running_code_uses(int status, string expected)
        => Assert.Equal(expected, RadiologyReportStatus.Label(status));
}
