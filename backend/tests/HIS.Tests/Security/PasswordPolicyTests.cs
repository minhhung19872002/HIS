using HIS.Core.Common;
using Xunit;

namespace HIS.Tests.Security;

/// <summary>#216 TC-PERM-015 — chính sách mật khẩu là hàm thuần, test thẳng không cần DB.</summary>
public sealed class PasswordPolicyTests
{
    [Theory]
    [InlineData("", "Chưa nhập")]
    [InlineData("abc1", "ít nhất 8")]
    [InlineData("abcdefgh", "cả chữ và số")]
    [InlineData("12345678", "cả chữ và số")]
    public void Weak_passwords_are_rejected_with_a_vietnamese_reason(string pwd, string expectedFragment)
    {
        var err = PasswordPolicy.Validate(pwd, currentPassword: "Old@12345", username: "bsannn");
        Assert.NotNull(err);
        Assert.Contains(expectedFragment, err!);
    }

    [Fact]
    public void New_password_must_differ_from_current()
    {
        var err = PasswordPolicy.Validate("Same@12345", "Same@12345", "bsannn");
        Assert.NotNull(err);
        Assert.Contains("khác mật khẩu hiện tại", err!);
    }

    [Fact]
    public void New_password_must_not_contain_username()
    {
        var err = PasswordPolicy.Validate("bsannn2026", "Old@12345", "bsannn");
        Assert.NotNull(err);
        Assert.Contains("tên đăng nhập", err!);
    }

    [Fact]
    public void Strong_password_passes()
    {
        Assert.Null(PasswordPolicy.Validate("Benhvien2026", "Old@12345", "bsannn"));
    }

    [Fact]
    public void Expiry_is_disabled_when_max_age_is_zero()
    {
        var changed = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        Assert.False(PasswordPolicy.IsExpired(changed, 0, new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void Unknown_change_date_is_not_treated_as_expired()
    {
        // Chặn nhầm cả bệnh viện tệ hơn bỏ sót một tài khoản lạ.
        Assert.False(PasswordPolicy.IsExpired(null, 90, DateTime.UtcNow));
    }

    [Fact]
    public void Password_older_than_max_age_is_expired_exactly_at_the_boundary()
    {
        var now = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc);
        Assert.False(PasswordPolicy.IsExpired(now.AddDays(-89), 90, now));
        Assert.True(PasswordPolicy.IsExpired(now.AddDays(-90), 90, now));
    }

    [Fact]
    public void Admin_flag_wins_over_expiry_as_the_reason()
    {
        var now = DateTime.UtcNow;
        Assert.Equal(PasswordPolicy.ReasonFirstLogin, PasswordPolicy.MustChange(true, now.AddDays(-400), 90, now));
        Assert.Equal(PasswordPolicy.ReasonExpired, PasswordPolicy.MustChange(false, now.AddDays(-400), 90, now));
        Assert.Null(PasswordPolicy.MustChange(false, now.AddDays(-1), 90, now));
    }
}
