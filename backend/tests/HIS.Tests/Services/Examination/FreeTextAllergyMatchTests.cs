using HIS.Infrastructure.Services;
using Xunit;

namespace HIS.Tests.Services.ExaminationFlow;

/// <summary>
/// QA sweep 2026-09-15: free-text allergy notes typed in the exam ("Dị ứng Amoxicillin") must block the
/// matching drug even when spelling / strength / trade name differ, and must not block on negative notes.
/// </summary>
public class FreeTextAllergyMatchTests
{
    [Theory]
    [InlineData("Dị ứng Amoxicillin", "Fabamox 1000 DT.", "Amoxicilin")]                       // double consonant variant
    [InlineData("dị ứng ceftriaxon", "Rocephin 1g", "Ceftriaxone (dưới dạng Ceftriaxone natri) 1g")] // missing final letter
    [InlineData("Dị ứng thuốc: Metformin", "Glucophage 500", "Metformin Hydrochloride 500mg")]   // strength in ingredient
    [InlineData("Từng sốc phản vệ với Fabamox", "Fabamox 1000 DT.", "Amoxicilin")]               // trade name only
    [InlineData("DỊ ỨNG PENICILLIN", "Penicilin V 1 triệu", "Phenoxymethylpenicilin")]           // trade-name keyword
    public void Detects_allergy_mentioned_in_free_text(string note, string medicineName, string ingredient)
    {
        Assert.NotNull(PrescriptionSafetyGuard.FreeTextAllergyHit(note, medicineName, ingredient));
    }

    [Theory]
    [InlineData("Không")]
    [InlineData("Không dị ứng")]
    [InlineData("Chưa ghi nhận tiền sử dị ứng")]
    [InlineData("Dị ứng hải sản")]
    [InlineData("")]
    public void Does_not_block_unrelated_or_empty_notes(string note)
    {
        Assert.Null(PrescriptionSafetyGuard.FreeTextAllergyHit(note, "Biocemet DT 500mg/62,5mg",
            "Amoxicilin (dưới dạng Amoxicilin trihydrat); Acid Clavulanic (dưới dạng Kali clavulanat)"));
    }

    [Fact]
    public void Generic_salt_words_do_not_create_matches()
    {
        Assert.Null(PrescriptionSafetyGuard.FreeTextAllergyHit("Dị ứng natri", "Natri clorid 0,9%", "Natri clorid 0,9%"));
    }
}
