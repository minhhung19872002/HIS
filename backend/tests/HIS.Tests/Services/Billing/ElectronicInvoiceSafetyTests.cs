using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace HIS.Tests.Services.Billing;

public sealed class ElectronicInvoiceSafetyTests
{
    [Fact]
    public async Task Legacy_receipt_issue_does_not_create_mock_invoice()
    {
        using var context = TestDb.NewInMemory();
        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = "PT-TEST-0001",
            ReceiptDate = DateTime.UtcNow,
            PatientId = Guid.NewGuid(),
            CashierId = Guid.NewGuid(),
            Amount = 100_000,
            FinalAmount = 100_000,
            Status = 1
        };
        context.Receipts.Add(receipt);
        await context.SaveChangesAsync();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["EInvoice:Enabled"] = "false",
                ["EInvoice:MockMode"] = "true"
            })
            .Build();
        var service = new EInvoiceService(
            context,
            configuration,
            new Mock<ILogger<EInvoiceService>>().Object);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.IssueAsync(
                new IssueEInvoiceRequestDto { ReceiptId = receipt.Id, Provider = "VNPT" },
                Guid.NewGuid().ToString()));

        Assert.Contains("Không thể phát hành hóa đơn mô phỏng", error.Message);
        Assert.Empty(context.EInvoices);
    }

    [Fact]
    public async Task Export_without_real_provider_does_not_mark_invoice_as_issued()
    {
        using var context = TestDb.NewInMemory();
        var invoice = new ElectronicInvoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = "HDDT-TEST-0001",
            InvoiceSeries = "1C26TAA",
            InvoiceDate = DateTime.UtcNow,
            PatientName = "Nguyen Van Test",
            SubTotal = 100_000,
            TotalAmount = 108_000,
            Status = 0,
            CreatedBy = Guid.NewGuid().ToString()
        };
        context.ElectronicInvoices.Add(invoice);
        await context.SaveChangesAsync();

        var provider = new Mock<IElectronicInvoiceProvider>();
        provider.SetupGet(x => x.IsConfigured).Returns(false);
        var service = new BillingCompleteService(
            context,
            new Mock<IUnitOfWork>().Object,
            provider.Object,
            new Mock<ILogger<BillingCompleteService>>().Object,
            new Mock<IPaymentGatewayService>().Object);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ExportElectronicInvoiceAsync(invoice.Id, Guid.NewGuid()));

        Assert.Contains("Chưa cấu hình", error.Message);
        var persisted = await context.ElectronicInvoices.FindAsync(invoice.Id);
        Assert.NotNull(persisted);
        Assert.Equal(0, persisted!.Status);
        Assert.Null(persisted.ProviderInvoiceId);
        Assert.Null(persisted.LookupCode);
        Assert.Null(persisted.LookupUrl);
        provider.Verify(x => x.IssueAsync(It.IsAny<EInvoiceRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
