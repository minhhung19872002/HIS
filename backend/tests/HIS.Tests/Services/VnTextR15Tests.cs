using System.Text;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Services.Export;
using HIS.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HIS.Tests.Services;

/// <summary>QA-R15 (vn-text): NFD input (macOS/iOS keyboard, PDF paste) is stored NFC; phone search accepts +84.</summary>
public sealed class VnTextR15Tests
{
    private static readonly string Nfc = "Nguyễn Thị Ánh".Normalize(NormalizationForm.FormC);
    private static readonly string Nfd = "Nguyễn Thị Ánh".Normalize(NormalizationForm.FormD);

    [Fact]
    public void ToNfc_composes_and_keeps_unnormalisable_text()
    {
        Assert.NotEqual(Nfc, Nfd);
        Assert.Equal(Nfc, VnSearchText.ToNfc(Nfd));
        Assert.Null(VnSearchText.ToNfc(null));
        const string loneSurrogate = "A\uD800B";
        Assert.Equal(loneSurrogate, VnSearchText.ToNfc(loneSurrogate));
    }

    [Fact]
    public async Task Patient_name_address_guardian_are_saved_nfc()
    {
        await using var db = TestDb.NewInMemory();
        var id = Guid.NewGuid();
        db.Patients.Add(new Patient
        {
            Id = id, PatientCode = "QA-R15-1", FullName = Nfd,
            Address = "Phường Đống Đa".Normalize(NormalizationForm.FormD),
            GuardianName = Nfd,
        });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var p = await db.Patients.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.Equal(Nfc, p.FullName);
        Assert.True(p.Address!.IsNormalized(NormalizationForm.FormC));
        Assert.Equal(Nfc, p.GuardianName);
    }

    [Theory]
    [InlineData("0912345678", "+84912345678", true)]
    [InlineData("0912345678", "0912 345 678", true)]
    [InlineData("0912345678", "84912345678", true)]
    [InlineData("0912345678", "5678", true)]          // partial digits still work (contains)
    [InlineData("0912345678", "+84987654321", false)]
    [InlineData(null, "0912345678", false)]
    [InlineData("0912345678", "nguyen", false)]
    public void Phone_search_matches_every_spelling_of_the_number(string? stored, string term, bool expected)
        => Assert.Equal(expected, PhoneNumberKey.SearchMatches(stored, term));

    [Fact]
    public void Unsign_keeps_case_and_handles_d_and_nfd()
    {
        Assert.Equal("Kinh gui Nguyen Thi Anh, khoa Noi - DANG", VnSearchText.Unsign("Kính gửi " + Nfd + ", khoa Nội - ĐẶNG"));
        Assert.Equal(string.Empty, VnSearchText.Unsign(null));
    }

    [Fact]
    public void Accent_insensitive_collate_translates_on_sql_server()
    {
        var options = new DbContextOptionsBuilder<HIS.Infrastructure.Data.HISDbContext>()
            .UseSqlServer("Server=none;Database=none;Trusted_Connection=True;TrustServerCertificate=True").Options;
        using var db = new HIS.Infrastructure.Data.HISDbContext(options);
        var kw = "dang van";
        var sql = db.PharmacyCustomers
            .Where(c => EF.Functions.Collate(c.FullName, "Latin1_General_CI_AI").Contains(kw)).ToQueryString();
        Assert.Contains("COLLATE Latin1_General_CI_AI", sql);
    }

    [Fact]
    public void Utf8_csv_in_nfd_is_decoded_to_nfc()
        => Assert.Equal(Nfc, CsvUtil.DecodeText(Encoding.UTF8.GetBytes(Nfd)));

    [Fact]
    public void Accent_insensitive_search_matches_both_forms()
    {
        Assert.True(VnSearchText.Contains(Nfd, Nfc));
        Assert.True(VnSearchText.Contains(Nfc, Nfd));
        Assert.True(VnSearchText.Contains(Nfd, "nguyen thi anh"));
        Assert.True(VnSearchText.Contains("Đặng Văn Bình", "dang van"));
    }
}
