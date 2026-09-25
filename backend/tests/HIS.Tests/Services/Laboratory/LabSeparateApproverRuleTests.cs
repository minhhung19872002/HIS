using System;
using HIS.Core.Common;
using Xunit;

namespace HIS.Tests.Services.Laboratory;

/// <summary>QA-R12: 4-eyes rule on the final release of a lab result (SystemConfigs "Lab.SeparateApproverMode").</summary>
public class LabSeparateApproverRuleTests
{
    private static readonly Guid Tech = Guid.NewGuid(), Doctor = Guid.NewGuid();

    [Theory]
    [InlineData(null, LabSeparateApproverRule.Mode.Off)]  // row missing → old behaviour
    [InlineData("", LabSeparateApproverRule.Mode.Off)]
    [InlineData("off", LabSeparateApproverRule.Mode.Off)]
    [InlineData(" Warn ", LabSeparateApproverRule.Mode.Warn)]
    [InlineData("BLOCK", LabSeparateApproverRule.Mode.Block)]
    [InlineData("nonsense", LabSeparateApproverRule.Mode.Off)]
    public void Mode_parsing(string? value, LabSeparateApproverRule.Mode expected)
        => Assert.Equal(expected, LabSeparateApproverRule.ParseMode(value));

    [Fact]
    public void Another_user_releasing_is_fine()
        => Assert.Equal((false, null), LabSeparateApproverRule.Evaluate(LabSeparateApproverRule.Mode.Block, Doctor,
            new[] { new LabSeparateApproverRule.Line(Tech, Tech) }));

    [Fact]
    public void Self_release_warns_in_warn_mode()
    {
        var (blocked, warning) = LabSeparateApproverRule.Evaluate(LabSeparateApproverRule.Mode.Warn, Tech,
            new[] { new LabSeparateApproverRule.Line(Tech, null) });
        Assert.False(blocked);
        Assert.Contains("đã nhập", warning);
    }

    [Fact]
    public void Self_release_after_own_pre_approval_blocks_in_block_mode()
    {
        var (blocked, message) = LabSeparateApproverRule.Evaluate(LabSeparateApproverRule.Mode.Block, Tech,
            new[] { new LabSeparateApproverRule.Line(null, Tech), new LabSeparateApproverRule.Line(Doctor, null) });
        Assert.True(blocked);
        Assert.Contains("duyệt sơ bộ", message);
    }

    [Fact]
    public void Off_mode_never_reports()
        => Assert.Equal((false, null), LabSeparateApproverRule.Evaluate(LabSeparateApproverRule.Mode.Off, Tech,
            new[] { new LabSeparateApproverRule.Line(Tech, Tech) }));

    [Fact]
    public void No_recorded_author_or_no_approver_is_not_evidence()
    {
        Assert.Null(LabSeparateApproverRule.Finding(Tech, new[] { new LabSeparateApproverRule.Line(null, null) }));
        Assert.Null(LabSeparateApproverRule.Finding(null, new[] { new LabSeparateApproverRule.Line(Tech, Tech) }));
        Assert.Null(LabSeparateApproverRule.Finding(Guid.Empty, new[] { new LabSeparateApproverRule.Line(Guid.Empty, null) }));
    }
}
