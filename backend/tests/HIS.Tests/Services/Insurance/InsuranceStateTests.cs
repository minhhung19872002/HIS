using System;
using HIS.Core.Constants;
using Xunit;

namespace HIS.Tests.Services.Insurance;

/// <summary>
/// #218 (T3): luật trạng thái của đường gửi hồ sơ bảo hiểm xã hội.
///
/// Đây là đường duy nhất trong cả đợt đo mà hậu quả đi RA NGOÀI bệnh viện. Đo trên API đang chạy
/// (docs/architecture/evidence/cross/t3/t3_bhxh_transitions.json) trước khi có luật: một đợt XML đã
/// gửi vẫn gửi lại được — `SubmittedAt` và `SubmitTransactionId` của lượt gửi cũ bị ghi đè, tức là
/// hệ thống đã thực sự đi ra cổng lần thứ hai. Ký lại một đợt đã gửi thì đặt `Status = 1` đè lên
/// `2`, xoá mất dấu là nó đã được truyền đi.
///
/// Bên hồ sơ, sửa được chẩn đoán của hồ sơ đã khóa, đã duyệt và cả hồ sơ ĐÃ THANH TOÁN; xoá được
/// hồ sơ đã thanh toán.
/// </summary>
public class InsuranceStateTests
{
    // ── Đợt XML ─────────────────────────────────────────────────────────────

    [Fact]
    public void A_submitted_batch_is_recognised_as_submitted()
        => Assert.True(InsuranceXmlBatchStatus.IsAlreadySubmitted(InsuranceXmlBatchStatus.Submitted));

    [Theory]
    [InlineData(InsuranceXmlBatchStatus.Exported)]
    [InlineData(InsuranceXmlBatchStatus.Signed)]
    // Bị từ chối thì nộp lại là ĐÚNG quy trình — không được chặn.
    [InlineData(InsuranceXmlBatchStatus.Rejected)]
    public void Every_other_batch_state_may_still_be_sent(int status)
        => Assert.False(InsuranceXmlBatchStatus.IsAlreadySubmitted(status));

    [Fact]
    public void Ensure_refuses_a_submitted_batch_and_says_what_to_do_instead()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => InsuranceXmlBatchStatus.EnsureNotSubmitted(InsuranceXmlBatchStatus.Submitted, "ký lại"));
        Assert.Contains("đã gửi lên BHXH", ex.Message);
        Assert.Contains("xuất đợt mới", ex.Message);
    }

    [Fact]
    public void Ensure_stays_silent_for_a_signed_batch()
        => InsuranceXmlBatchStatus.EnsureNotSubmitted(InsuranceXmlBatchStatus.Signed, "gửi");

    // ── Hồ sơ ───────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(InsuranceClaimStatus.Pending)]
    // Hồ sơ bị từ chối PHẢI còn sửa được — đó chính là quy trình sửa rồi nộp lại.
    [InlineData(InsuranceClaimStatus.PartiallyRejected)]
    [InlineData(InsuranceClaimStatus.FullyRejected)]
    public void A_claim_still_in_play_can_be_edited(int status)
        => Assert.True(InsuranceClaimStatus.IsEditable(status));

    [Theory]
    [InlineData(InsuranceClaimStatus.Locked)]
    [InlineData(InsuranceClaimStatus.Approved)]
    [InlineData(InsuranceClaimStatus.Paid)]
    public void A_settled_or_locked_claim_cannot(int status)
        => Assert.False(InsuranceClaimStatus.IsEditable(status));

    [Fact]
    public void A_locked_claim_is_told_to_unlock_rather_than_just_refused()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => InsuranceClaimStatus.EnsureEditable(InsuranceClaimStatus.Locked));
        Assert.Equal("Hồ sơ đã khóa, phải mở khóa trước khi sửa.", ex.Message);
    }

    [Fact]
    public void A_paid_claim_refusal_names_its_state()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => InsuranceClaimStatus.EnsureEditable(InsuranceClaimStatus.Paid));
        Assert.Contains("Đã thanh toán", ex.Message);
    }

    [Fact]
    public void Only_a_pending_claim_can_be_deleted()
    {
        Assert.True(InsuranceClaimStatus.IsDeletable(InsuranceClaimStatus.Pending));
        Assert.False(InsuranceClaimStatus.IsDeletable(InsuranceClaimStatus.Locked));
        Assert.False(InsuranceClaimStatus.IsDeletable(InsuranceClaimStatus.Approved));
        Assert.False(InsuranceClaimStatus.IsDeletable(InsuranceClaimStatus.FullyRejected));
        Assert.False(InsuranceClaimStatus.IsDeletable(InsuranceClaimStatus.Paid));
    }

    [Fact]
    public void A_rejected_claim_is_editable_but_not_deletable()
    {
        // Cặp này dễ gộp nhầm thành một luật. Sửa để nộp lại thì được; xoá đi thì mất dấu là hồ sơ
        // từng bị cơ quan bảo hiểm từ chối.
        Assert.True(InsuranceClaimStatus.IsEditable(InsuranceClaimStatus.FullyRejected));
        Assert.False(InsuranceClaimStatus.IsDeletable(InsuranceClaimStatus.FullyRejected));
    }

    [Theory]
    [InlineData(InsuranceClaimStatus.Pending, "Chờ")]
    [InlineData(InsuranceClaimStatus.Locked, "Đã khóa")]
    [InlineData(InsuranceClaimStatus.Approved, "Đã duyệt")]
    [InlineData(InsuranceClaimStatus.PartiallyRejected, "Từ chối một phần")]
    [InlineData(InsuranceClaimStatus.FullyRejected, "Từ chối toàn bộ")]
    [InlineData(InsuranceClaimStatus.Paid, "Đã thanh toán")]
    public void Claim_labels_match_the_vocabulary_the_running_code_uses(int status, string expected)
        => Assert.Equal(expected, InsuranceClaimStatus.Label(status));
}
