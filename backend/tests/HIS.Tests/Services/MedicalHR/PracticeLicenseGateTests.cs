using HIS.Core.Common;
using Xunit;
using static HIS.Core.Common.PracticeLicenseGate;

namespace HIS.Tests.Services.MedicalHR;

/// <summary>
/// QA round 3: CCHN gate for prescribing / ordering. Block ONLY on positive evidence (expired, suspended,
/// revoked); missing data must warn, never lock a doctor out.
/// </summary>
public class PracticeLicenseGateTests
{
    private static readonly DateTime Today = new(2026, 9, 15);

    private static StaffEvidence Staff(DateTime? expiry, bool active = true, string status = "Active", string? number = "CCHN-1")
        => new(number, expiry, active, status);

    private static RegistryEvidence Reg(int status, DateTime? expiry, string code = "CCHN-1")
        => new(code, status, Today.AddYears(-5), expiry);

    [Fact]
    public void No_data_at_all_warns_and_allows()
    {
        var r = Evaluate(null, Array.Empty<RegistryEvidence>(), Today);
        Assert.False(r.Blocked);
        Assert.Equal("NoData", r.Status);
    }

    [Fact]
    public void Staff_profile_without_licence_number_is_missing_data_not_a_block()
        => Assert.False(Evaluate(Staff(Today.AddDays(-100), number: null), Array.Empty<RegistryEvidence>(), Today).Blocked);

    [Fact]
    public void Expired_in_the_HR_profile_blocks()
    {
        var r = Evaluate(Staff(Today.AddDays(-1)), Array.Empty<RegistryEvidence>(), Today);
        Assert.True(r.Blocked);
        Assert.Equal("Expired", r.Status);
        Assert.Contains(UnblockHint, r.Message);
    }

    [Fact]
    public void Expiring_today_is_still_valid()
        => Assert.False(Evaluate(Staff(Today), Array.Empty<RegistryEvidence>(), Today).Blocked);

    [Fact]
    public void No_expiry_date_is_open_ended_and_allowed()
        => Assert.Equal(LevelOk, Evaluate(Staff(null), Array.Empty<RegistryEvidence>(), Today).Level);

    [Theory]
    [InlineData(2, "Suspended")]
    [InlineData(3, "Revoked")]
    public void Registry_suspension_or_revocation_blocks(int status, string expected)
    {
        var r = Evaluate(Staff(Today.AddYears(2)), new[] { Reg(status, Today.AddYears(2)) }, Today);
        Assert.True(r.Blocked);
        Assert.Equal(expected, r.Status);
    }

    [Fact]
    public void Suspended_staff_record_blocks()
        => Assert.True(Evaluate(Staff(Today.AddYears(1), active: false), Array.Empty<RegistryEvidence>(), Today).Blocked);

    [Fact]
    public void Registry_expired_status_blocks_when_nothing_says_valid()
        => Assert.True(Evaluate(Staff(null), new[] { Reg(1, Today.AddYears(1)) }, Today).Blocked);

    [Fact]
    public void A_renewal_recorded_in_the_registry_overrides_a_stale_HR_date_with_a_warning()
    {
        var r = Evaluate(Staff(Today.AddDays(-10)), new[] { Reg(0, Today.AddYears(5)) }, Today);
        Assert.False(r.Blocked);
        Assert.Equal("Mismatch", r.Status);
    }

    [Fact]
    public void The_latest_registry_record_wins_over_an_old_expired_one()
    {
        var r = Evaluate(null, new[] { Reg(1, Today.AddYears(-1)), Reg(0, Today.AddYears(4)) }, Today);
        Assert.False(r.Blocked);
    }

    [Fact]
    public void Expiring_within_30_days_warns()
        => Assert.Equal("ExpiringSoon", Evaluate(Staff(Today.AddDays(20)), Array.Empty<RegistryEvidence>(), Today).Status);
}
