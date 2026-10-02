using System;
using System.Linq;
using System.Threading.Tasks;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace HIS.Tests.Services.Insurance;

/// <summary>
/// QA-R14 (bhyt-rules): what the cashier charges must agree with what the BHYT claim / XML will carry.
/// Live repro: a line paid while the visit was under 15% of lương cơ sở (100%) kept that split after a later order pushed
/// the visit over the threshold (claim 80%) — ledger 334,100 vs claim 316,400 BHYT; reception orders were billed 100% to the
/// patient; "đổi đối tượng" priced BHYT lines at Amount × card level (above the BHYT price); XML1 counted XML4 drugs twice.
/// </summary>
public class BhytLedgerClaimConsistencyTests
{
    private const string Card = "DN4791234567890"; // mức hưởng 4 → 80%

    private sealed record Seeded(Guid MrId, Guid PatientId, ServiceRequestDetail Paid, ServiceRequestDetail Unpaid);

    /// <summary>
    /// 80% card, đúng tuyến. Line A (65,000, BHYT price 50,000) was PAID at 100% (visit then below 351,000). Line B
    /// (400,000) is unpaid and still carries the split stored at order time (0 insurance, as reception orders did).
    /// Whole visit: base 50,000 + 400,000 = 450,000 ≥ 351,000 → 80%.
    /// </summary>
    private static Seeded Seed(HISDbContext ctx, bool switchOn)
    {
        var patientId = Guid.NewGuid();
        var mrId = Guid.NewGuid();
        ctx.Patients.Add(new Patient { Id = patientId, PatientCode = "BN-R14", FullName = "QA-R14", InsuranceNumber = Card });
        ctx.MedicalRecords.Add(new MedicalRecord
        {
            Id = mrId, PatientId = patientId, PatientType = 1, TreatmentType = 1, InsuranceNumber = Card,
            InsuranceRightRoute = 1, AdmissionDate = DateTime.Now,
        });
        if (switchOn)
            ctx.SystemConfigs.Add(new SystemConfig { Id = Guid.NewGuid(), ConfigKey = InvoiceLedger.LedgerUsesVisitPricingKey, ConfigValue = "On", IsActive = true });

        var lab = new Service { Id = Guid.NewGuid(), ServiceCode = "XN_CTM", ServiceName = "CTM", ServiceGroupId = Guid.NewGuid(), UnitPrice = 65_000, InsurancePrice = 50_000, IsInsuranceCovered = true, InsurancePaymentRate = 100 };
        var ct = new Service { Id = Guid.NewGuid(), ServiceCode = "CT", ServiceName = "CT", ServiceGroupId = Guid.NewGuid(), UnitPrice = 400_000, InsurancePrice = 400_000, IsInsuranceCovered = true, InsurancePaymentRate = 100 };
        ctx.Services.AddRange(lab, ct);
        var dept = new Department { Id = Guid.NewGuid(), DepartmentCode = "K-R14", DepartmentName = "Khoa QA-R14" }; // ledger Includes it
        ctx.Departments.Add(dept);

        var srA = new ServiceRequest { Id = Guid.NewGuid(), MedicalRecordId = mrId, ServiceId = lab.Id, Quantity = 1, UnitPrice = 65_000, TotalAmount = 65_000, InsuranceAmount = 50_000, PatientAmount = 15_000, RequestDate = DateTime.Now, Status = 1, IsPaid = true, DepartmentId = dept.Id };
        var a = new ServiceRequestDetail { Id = Guid.NewGuid(), ServiceRequestId = srA.Id, ServiceId = lab.Id, Quantity = 1, UnitPrice = 65_000, Amount = 65_000, InsuranceAmount = 50_000, PatientAmount = 15_000, InsurancePaymentRate = 100, PatientType = 1 };
        srA.Details.Add(a);
        var srB = new ServiceRequest { Id = Guid.NewGuid(), MedicalRecordId = mrId, ServiceId = ct.Id, Quantity = 1, UnitPrice = 400_000, TotalAmount = 400_000, InsuranceAmount = 0, PatientAmount = 400_000, RequestDate = DateTime.Now, Status = 0, DepartmentId = dept.Id };
        var b = new ServiceRequestDetail { Id = Guid.NewGuid(), ServiceRequestId = srB.Id, ServiceId = ct.Id, Quantity = 1, UnitPrice = 400_000, Amount = 400_000, InsuranceAmount = 0, PatientAmount = 400_000, PatientType = 1 };
        srB.Details.Add(b);
        ctx.ServiceRequests.AddRange(srA, srB);

        var receipt = new Receipt { Id = Guid.NewGuid(), ReceiptCode = "PT-R14", ReceiptDate = DateTime.Now, PatientId = patientId, MedicalRecordId = mrId, ReceiptType = 2, Status = 1, Amount = 15_000, FinalAmount = 15_000 };
        receipt.Details.Add(new ReceiptDetail { Id = Guid.NewGuid(), ReceiptId = receipt.Id, ServiceRequestDetailId = a.Id, ItemType = InvoiceLedger.ItemService, ItemCode = "XN_CTM", ItemName = "CTM", Quantity = 1, Amount = 65_000, FinalAmount = 15_000 });
        ctx.Receipts.Add(receipt);
        ctx.SaveChanges();
        return new Seeded(mrId, patientId, a, b);
    }

    [Fact]
    public async Task Switch_off_keeps_the_stored_split_and_warns_the_cashier_with_both_amounts()
    {
        using var ctx = TestDb.NewInMemory();
        var s = Seed(ctx, switchOn: false);

        var set = await InvoiceLedger.LoadAsync(ctx, s.MrId);

        var b = set.Services.Single(l => l.Id == s.Unpaid.Id);
        Assert.Equal(0m, b.InsuranceAmount);
        Assert.Equal(400_000m, b.PatientAmount); // old behaviour
        Assert.Contains(set.Warnings, w => w.Contains(InvoiceLedger.LedgerUsesVisitPricingKey) && w.Contains("80.000"));
        Assert.Contains(set.Warnings, w => w.Contains("đã thu") && w.Contains("25.000")); // claim: 65,000 − 40,000
    }

    [Fact]
    public async Task Switch_on_bills_unpaid_lines_with_the_claim_split_and_never_reprices_a_paid_line()
    {
        using var ctx = TestDb.NewInMemory();
        var s = Seed(ctx, switchOn: true);

        var set = await InvoiceLedger.LoadAsync(ctx, s.MrId);
        var visit = await new BhytVisitPricing(ctx).PriceAsync(s.MrId, includeBeds: true);

        var b = set.Services.Single(l => l.Id == s.Unpaid.Id);
        var claimB = visit!.Lines.Single(l => l.ItemCode == "CT").Result;
        Assert.Equal(80, visit.Result.EffectivePercent);
        Assert.Equal(320_000m, b.InsuranceAmount);
        Assert.Equal(claimB.InsuranceAmount, b.InsuranceAmount);
        Assert.Equal(claimB.PatientAmount, b.PatientAmount);
        Assert.Equal(80m, b.InsuranceRate);

        var a = set.Services.Single(l => l.Id == s.Paid.Id);
        Assert.True(a.IsPaid);
        Assert.Equal(15_000m, a.PatientAmount); // collected amount stays
        Assert.DoesNotContain(set.Warnings, w => w.Contains("chưa thu đang tính"));
        Assert.Contains(set.Warnings, w => w.Contains("đã thu"));
    }

    [Fact]
    public async Task Switch_on_refresh_stores_the_claim_split_on_unpaid_lines()
    {
        using var ctx = TestDb.NewInMemory();
        var s = Seed(ctx, switchOn: true);
        var invoice = new InvoiceSummary { Id = Guid.NewGuid(), InvoiceCode = "HD-R14", MedicalRecordId = s.MrId, InvoiceDate = DateTime.Now };
        ctx.InvoiceSummaries.Add(invoice);

        await InvoiceLedger.RefreshAsync(ctx, invoice);
        ctx.SaveChanges();

        var stored = ctx.ServiceRequestDetails.Single(d => d.Id == s.Unpaid.Id);
        Assert.Equal(320_000m, stored.InsuranceAmount);
        Assert.Equal(80_000m, stored.PatientAmount);
        Assert.Equal(15_000m + 80_000m, invoice.TotalAmount);
        Assert.Equal(50_000m, ctx.ServiceRequestDetails.Single(d => d.Id == s.Paid.Id).InsuranceAmount); // paid: untouched
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("Off", false)]
    [InlineData("On", true)]
    public async Task Missing_switch_row_means_off(string? value, bool expectedOn)
    {
        using var ctx = TestDb.NewInMemory();
        if (value != null)
            ctx.SystemConfigs.Add(new SystemConfig { Id = Guid.NewGuid(), ConfigKey = InvoiceLedger.LedgerUsesVisitPricingKey, ConfigValue = value, IsActive = true });
        ctx.SaveChanges();
        Assert.Equal(expectedOn, (await InvoiceLedger.SwitchesAsync(ctx)).LedgerUsesVisitPricing);
    }

    [Fact]
    public void Line_split_uses_the_claim_only_for_unpaid_lines_when_switched_on()
    {
        var priced = new BhytLineResult { Amount = 400_000, InsuranceAmount = 320_000, PatientAmount = 80_000, AppliedPercent = 80 };
        Assert.Equal((320_000m, 80_000m, 80m), InvoiceLedger.LineSplit(400_000, 0, 400_000, 0, priced, usePriced: true));
        Assert.Equal((0m, 400_000m, 0m), InvoiceLedger.LineSplit(400_000, 0, 400_000, 0, priced, usePriced: false));
        Assert.Equal((0m, 400_000m, 0m), InvoiceLedger.LineSplit(400_000, 0, 0, 0, null, usePriced: true)); // no match: stored (unsplit = patient)
        // Ledger amount lower than the priced amount: the fund's share is capped at the line amount.
        Assert.Equal((300_000m, 0m, 80m), InvoiceLedger.LineSplit(300_000, 0, 300_000, 0, priced, usePriced: true));
    }

    [Fact]
    public void No_warning_when_ledger_and_claim_agree()
        => Assert.Empty(InvoiceLedger.ClaimDifferenceWarnings(new[] { (15_000m, 15_000m, true), (80_000m, 80_000m, false) }, 80));

    [Fact]
    public async Task Reassign_to_bhyt_uses_the_bhyt_price_and_the_visit_threshold()
    {
        using var ctx = TestDb.NewInMemory();
        var patientId = Guid.NewGuid();
        var mrId = Guid.NewGuid();
        ctx.Patients.Add(new Patient { Id = patientId, PatientCode = "BN-R14R", FullName = "QA-R14", InsuranceNumber = Card });
        ctx.MedicalRecords.Add(new MedicalRecord { Id = mrId, PatientId = patientId, PatientType = 1, TreatmentType = 1, InsuranceNumber = Card, InsuranceRightRoute = 1, InsuranceCoverageRate = 80, AdmissionDate = DateTime.Now });
        var echo = new Service { Id = Guid.NewGuid(), ServiceCode = "SA_TIM", ServiceName = "SA tim", ServiceGroupId = Guid.NewGuid(), UnitPrice = 250_000, InsurancePrice = 192_000, IsInsuranceCovered = true, InsurancePaymentRate = 100 };
        ctx.Services.Add(echo);
        var sr = new ServiceRequest { Id = Guid.NewGuid(), MedicalRecordId = mrId, ServiceId = echo.Id, Quantity = 1, UnitPrice = 250_000, TotalAmount = 250_000, PatientAmount = 250_000, RequestDate = DateTime.Now, Status = 0 };
        var line = new ServiceRequestDetail { Id = Guid.NewGuid(), ServiceRequestId = sr.Id, ServiceId = echo.Id, Quantity = 1, UnitPrice = 250_000, Amount = 250_000, PatientAmount = 250_000, PatientType = 2 };
        sr.Details.Add(line);
        ctx.ServiceRequests.Add(sr);
        ctx.SaveChanges();

        var svc = new ReassignObjectService(ctx, NullLogger<ReassignObjectService>.Instance, Mock.Of<IBhytFullCoverageService>());
        await svc.ReassignAsync(new HIS.Application.DTOs.Billing.ReassignObjectRequestDto
        {
            PatientId = patientId, MedicalRecordId = mrId, Scope = "service", Mode = "all", FromPatientType = 2, ToPatientType = 1, Reason = "QA-R14",
        }, Guid.NewGuid());

        var stored = ctx.ServiceRequestDetails.Single(d => d.Id == line.Id);
        // Base 192,000 < 351,000 → 100% of the BHYT price; was 80% × 250,000 = 200,000 (above the BHYT price).
        Assert.Equal(192_000m, stored.InsuranceAmount);
        Assert.Equal(58_000m, stored.PatientAmount);
    }

    [Fact]
    public async Task Xml1_totals_do_not_count_out_of_list_medicines_twice_when_the_copay_is_zero()
    {
        using var ctx = TestDb.NewInMemory();
        var patientId = Guid.NewGuid();
        ctx.Patients.Add(new Patient { Id = patientId, PatientCode = "BN-R14X", FullName = "QA-R14" });
        var claim = new InsuranceClaim
        {
            Id = Guid.NewGuid(), ClaimCode = "BHYT-R14-X", PatientId = patientId, ClaimStatus = InsuranceClaimStatus.Locked,
            ServiceDate = DateTime.Now, TreatmentType = 1, InsurancePaymentRate = 100,
            // 100% card, covered lab without price difference + a self-pay medicine (XML4).
            TotalAmount = 100_000, InsuranceAmount = 80_000, PatientAmount = 0, OutOfPocketAmount = 20_000,
        };
        claim.ClaimDetails.Add(new InsuranceClaimDetail { Id = Guid.NewGuid(), ClaimId = claim.Id, ItemType = 1, ItemCode = "XN", ItemName = "XN", Quantity = 1, UnitPrice = 80_000, Amount = 80_000, InsuranceAmount = 80_000, PatientAmount = 0, IsInsuranceCovered = true });
        claim.ClaimDetails.Add(new InsuranceClaimDetail { Id = Guid.NewGuid(), ClaimId = claim.Id, ItemType = 2, ItemCode = "AMOX", ItemName = "AMOX", Quantity = 10, UnitPrice = 2_000, Amount = 20_000, InsuranceAmount = 0, PatientAmount = 20_000, IsInsuranceCovered = false });
        ctx.InsuranceClaims.Add(claim);
        ctx.SaveChanges();

        var svc = new InsuranceXmlService(ctx, null!, null!, null!, Options.Create(new BhxhGatewayOptions()),
            NullLogger<InsuranceXmlService>.Instance, null!);
        var xml1 = (await svc.GenerateXml1DataAsync(new XmlExportConfigDto { MaLkList = new() { "BHYT-R14-X" } })).Single();

        Assert.Equal(80_000m, xml1.TienBhyt);
        Assert.Equal(0m, xml1.TienBnCct); // was 20,000 (fell back to Σ line PatientAmount incl. the XML4 drug)
        Assert.Equal(20_000m, xml1.TienNguoibenh);
        Assert.Equal(claim.TotalAmount, xml1.TienBhyt + xml1.TienBnCct + xml1.TienNguoibenh); // T_TONGCHI
    }

    [Theory]
    [InlineData("HT3", 95)]
    [InlineData("CK2", 100)]
    [InlineData("QN5", 100)]
    [InlineData("TE1", 100)]
    [InlineData("DN4", 80)]
    public void Card_benefit_code_above_threshold(string prefix, int expected)
    {
        var card = prefix + "791234567890";
        var ctx = new BhytVisitContext { BenefitPercent = BhytCoverageCalculator.ResolveBenefitPercent(null, card), Route = 1, BaseSalary = 2_340_000m };
        var r = BhytCoverageCalculator.Calculate(ctx, new[] { new BhytLineInput { UnitPrice = 1_000_000, Quantity = 1, IsCovered = true } });
        Assert.False(r.BelowFifteenPercentThreshold);
        Assert.Equal(expected, r.EffectivePercent);
        Assert.Equal(1_000_000m * expected / 100, r.Lines[0].InsuranceAmount);
    }
}
