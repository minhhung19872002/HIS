using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Xunit;

namespace HIS.Tests.Services.Insurance;

/// <summary>
/// R3 pre-push review B5/B6/B9: order-time BHYT pricing must use the patient's card when the record has none, must
/// not touch amounts when no card exists, must ignore drafts/return orders, must never re-split paid medicine, and
/// must recognise the claims an XML batch carries.
/// </summary>
public class BhytVisitPricingTests
{
    private const string Card = "DN4461234567890";

    private static (Guid mrId, ServiceRequestDetail srd) Seed(HISDbContext ctx, string? mrCard, string? patientCard)
    {
        var patientId = Guid.NewGuid();
        var mrId = Guid.NewGuid();
        var service = new Service
        {
            Id = Guid.NewGuid(), ServiceCode = "XQ", ServiceName = "X-quang", ServiceGroupId = Guid.NewGuid(),
            UnitPrice = 500_000, InsurancePrice = 400_000, IsInsuranceCovered = true, InsurancePaymentRate = 100,
        };
        ctx.Patients.Add(new Patient { Id = patientId, PatientCode = "BN1", FullName = "QA", InsuranceNumber = patientCard });
        ctx.MedicalRecords.Add(new MedicalRecord
        {
            Id = mrId, PatientId = patientId, PatientType = 1, TreatmentType = 1, InsuranceNumber = mrCard,
            InsuranceRightRoute = 1, AdmissionDate = DateTime.Now,
        });
        ctx.Services.Add(service);
        var sr = new ServiceRequest
        {
            Id = Guid.NewGuid(), MedicalRecordId = mrId, ServiceId = service.Id, Quantity = 1, UnitPrice = 500_000,
            TotalAmount = 500_000, InsuranceAmount = 100, PatientAmount = 499_900, RequestDate = DateTime.Now, Status = 0,
        };
        var srd = new ServiceRequestDetail
        {
            Id = Guid.NewGuid(), ServiceRequestId = sr.Id, ServiceId = service.Id, Quantity = 1, UnitPrice = 500_000,
            Amount = 500_000, InsuranceAmount = 100, PatientAmount = 499_900, PatientType = 1, Status = 0,
        };
        sr.Details.Add(srd);
        ctx.ServiceRequests.Add(sr);
        ctx.SaveChanges();
        return (mrId, srd);
    }

    private static Prescription AddRx(HISDbContext ctx, Guid mrId, int status, int drugOrderType = 1, bool isPaid = false)
    {
        var med = new Medicine { Id = Guid.NewGuid(), MedicineCode = "M" + status + drugOrderType, MedicineName = "Thuoc", UnitPrice = 10_000, InsurancePrice = 10_000, IsInsuranceCovered = true, InsurancePaymentRate = 100 };
        ctx.Medicines.Add(med);
        var rx = new Prescription
        {
            Id = Guid.NewGuid(), MedicalRecordId = mrId, Status = status, DrugOrderType = drugOrderType, IsPaid = isPaid,
            PrescriptionDate = DateTime.Now, PrescriptionCode = "DT" + Guid.NewGuid().ToString("N")[..6],
        };
        rx.Details.Add(new PrescriptionDetail
        {
            Id = Guid.NewGuid(), PrescriptionId = rx.Id, MedicineId = med.Id, Quantity = 10, UnitPrice = 10_000,
            Amount = 100_000, InsuranceAmount = 0, PatientAmount = 100_000, PatientType = 1,
        });
        ctx.Prescriptions.Add(rx);
        ctx.SaveChanges();
        return rx;
    }

    [Fact]
    public async Task Card_only_on_patient_is_used_for_the_split()
    {
        using var ctx = TestDb.NewInMemory();
        var (mrId, srd) = Seed(ctx, mrCard: null, patientCard: Card);

        var visit = await new BhytVisitPricing(ctx).RecalculateAsync(mrId);
        await ctx.SaveChangesAsync();

        Assert.True(visit!.IsInsured);
        Assert.Equal(Card, visit.CardNumber);
        Assert.Equal(320_000m, srd.InsuranceAmount); // 400,000 BHYT price × 80% (above the 15% threshold)
        Assert.Equal(180_000m, srd.PatientAmount);
    }

    [Fact]
    public async Task No_valid_card_anywhere_leaves_existing_amounts_untouched()
    {
        using var ctx = TestDb.NewInMemory();
        var (mrId, srd) = Seed(ctx, mrCard: null, patientCard: "INVALID");

        var visit = await new BhytVisitPricing(ctx).RecalculateAsync(mrId);
        await ctx.SaveChangesAsync();

        Assert.False(visit!.IsInsured);
        Assert.Equal(100m, srd.InsuranceAmount);
        Assert.Equal(499_900m, srd.PatientAmount);
        Assert.Contains(visit.Result.Warnings, w => w.Contains("thẻ BHYT"));
    }

    [Fact]
    public async Task Drafts_and_return_orders_are_not_priced()
    {
        using var ctx = TestDb.NewInMemory();
        var (mrId, _) = Seed(ctx, Card, Card);
        var draft = AddRx(ctx, mrId, PrescriptionStatus.Draft);
        var returnOrder = AddRx(ctx, mrId, PrescriptionStatus.PendingApproval, drugOrderType: 3);
        var billable = AddRx(ctx, mrId, PrescriptionStatus.PendingApproval);

        var visit = await new BhytVisitPricing(ctx).PriceAsync(mrId, includeBeds: false);

        var rxLines = visit!.Lines.Where(l => l.ItemType == 2).ToList();
        Assert.Single(rxLines);
        Assert.Equal(billable.Details.Single().MedicineId, rxLines[0].MedicineId);
        Assert.DoesNotContain(rxLines, l => l.MedicineId == draft.Details.Single().MedicineId || l.MedicineId == returnOrder.Details.Single().MedicineId);
    }

    [Fact]
    public async Task Paid_prescription_is_never_re_split()
    {
        using var ctx = TestDb.NewInMemory();
        var (mrId, _) = Seed(ctx, Card, Card);
        var paid = AddRx(ctx, mrId, PrescriptionStatus.Dispensed, isPaid: true);

        await new BhytVisitPricing(ctx).RecalculateAsync(mrId);
        await ctx.SaveChangesAsync();

        var d = paid.Details.Single();
        Assert.Equal(0m, d.InsuranceAmount);
        Assert.Equal(100_000m, d.PatientAmount);
    }

    [Fact]
    public void Batch_membership_reads_ma_lk_from_xml1()
    {
        var dir = Path.Combine(Path.GetTempPath(), "bhyt-batch-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            File.WriteAllText(Path.Combine(dir, "46001_202609_XML1.xml"),
                "<DSACH_THONG_TIN><THONG_TIN><MA_LK>BHYT-1</MA_LK></THONG_TIN><THONG_TIN><MA_LK>BHYT-2</MA_LK></THONG_TIN></DSACH_THONG_TIN>");
            File.WriteAllText(Path.Combine(dir, "46001_202609_XML2.xml"), "<X><MA_LK>BHYT-9</MA_LK></X>");
            var codes = BhytXmlBatchMembership.ClaimCodesOf(new InsuranceXmlBatch { FilePath = dir });
            Assert.Equal(new[] { "BHYT-1", "BHYT-2" }, codes.OrderBy(c => c));
        }
        finally { Directory.Delete(dir, true); }
    }
}
