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

    // QA-R14: allergy recorded as a drug CLASS must match member drugs (free text and structured allergen name).
    [Theory]
    [InlineData("Dị ứng nhóm Penicillin (phát ban)", "Amoxicillin 500mg", "Amoxicillin")]
    [InlineData("Dị ứng nhóm Penicillin", "Visulin 1g/0,5g", "Ampicilin + sulbactam")]
    [InlineData("Dị ứng kháng sinh nhóm beta-lactam", "Gogo 200", "Cefixim")]
    [InlineData("Dị ứng Cephalosporin", "Medivernol 1g", "Ceftriaxone (dưới dạng ceftriaxone sodium)")]
    [InlineData("dị ứng sulfa", "Cotrimoxazol 480mg", "Sulfamethoxazol; Trimethoprim")]
    [InlineData("Dị ứng beta lactam", "Meronem 1g", "Meropenem")]
    public void Detects_drug_class_allergy(string note, string medicineName, string ingredient)
    {
        Assert.NotNull(PrescriptionSafetyGuard.FreeTextAllergyHit(note, medicineName, ingredient));
        Assert.True(PrescriptionSafetyGuard.MentionsAllergen(medicineName, ingredient, note));
    }

    [Theory]
    [InlineData("Dị ứng nhóm Penicillin", "Azithromycin 250mg", "Azithromycin")]
    [InlineData("Dị ứng Cephalosporin", "Amoxicillin 500mg", "Amoxicillin")]   // no penicillin↔cephalosporin cross-block
    [InlineData("dị ứng sulfa", "Magnesi sulfat 15%", "Magnesi sulfat")]
    [InlineData("Dị ứng nhóm Penicillin", "Gentamicin 80mg", "Gentamicin")]
    public void Drug_class_allergy_does_not_match_other_classes(string note, string medicineName, string ingredient)
    {
        Assert.Null(PrescriptionSafetyGuard.DrugClassAllergyHit(note, medicineName, ingredient));
    }

    [Fact]
    public void Generic_salt_words_do_not_create_matches()
    {
        Assert.Null(PrescriptionSafetyGuard.FreeTextAllergyHit("Dị ứng natri", "Natri clorid 0,9%", "Natri clorid 0,9%"));
    }
}
