using HIS.Application.DTOs;            // CreatePaymentDto
using HIS.Application.DTOs.Billing;    // CreateDepositDto, CreateRefundDto
using HIS.Application.Services;        // UseDepositForPaymentDto, IElectronicInvoiceProvider
using HIS.Core.Entities;
using HIS.Core.Interfaces;             // IUnitOfWork
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace HIS.Tests.Services.Billing;

/// <summary>
/// #189 (DATA-3): chặn amount &lt;= 0 cho deposit/payment/use-deposit/refund.
/// Lưới test khu trú (user duyệt) cho nhóm tiền/safety #185-190 — chạy LOCAL `dotnet test`.
/// </summary>
public class BillingAmountGuardTests
{
    private static BillingCompleteService NewService(HISDbContext ctx) =>
        new BillingCompleteService(
            ctx,
            new Mock<IUnitOfWork>().Object,
            new Mock<IElectronicInvoiceProvider>().Object,
            new Mock<ILogger<BillingCompleteService>>().Object);

    private static Patient SeedPatient(HISDbContext ctx)
    {
        var p = new Patient { Id = Guid.NewGuid(), PatientCode = "BN001", FullName = "Nguyen Van Test" };
        ctx.Patients.Add(p);
        ctx.SaveChanges();
        return p;
    }

    // ---------- CreateDepositAsync ----------
    [Theory]
    [InlineData(0)]
    [InlineData(-500)]
    public async Task CreateDeposit_rejects_non_positive_amount(decimal amount)
    {
        using var ctx = TestDb.NewInMemory();
        var p = SeedPatient(ctx);
        var svc = NewService(ctx);
        var dto = new CreateDepositDto { PatientId = p.Id, Amount = amount, PaymentMethod = 1 };
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateDepositAsync(dto, Guid.NewGuid()));
        Assert.Empty(ctx.Deposits); // không tạo bản ghi rác
    }

    [Fact]
    public async Task CreateDeposit_accepts_positive_amount()
    {
        using var ctx = TestDb.NewInMemory();
        var p = SeedPatient(ctx);
        var svc = NewService(ctx);
        var dto = new CreateDepositDto { PatientId = p.Id, Amount = 100000, PaymentMethod = 1 };
        var result = await svc.CreateDepositAsync(dto, Guid.NewGuid());
        Assert.Equal(100000, result.Amount);
        Assert.Single(ctx.Deposits);
    }

    // ---------- CreatePaymentAsync (guard ở đầu method, không cần seed) ----------
    [Theory]
    [InlineData(0)]
    [InlineData(-1000)]
    public async Task CreatePayment_rejects_non_positive_amount(decimal amount)
    {
        using var ctx = TestDb.NewInMemory();
        var svc = NewService(ctx);
        var dto = new CreatePaymentDto { PatientId = Guid.NewGuid(), Amount = amount };
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreatePaymentAsync(dto, Guid.NewGuid()));
    }

    // ---------- UseDepositForPaymentAsync ----------
    [Theory]
    [InlineData(0)]
    [InlineData(-500)]
    public async Task UseDeposit_rejects_non_positive_amount(decimal amount)
    {
        using var ctx = TestDb.NewInMemory();
        var p = SeedPatient(ctx);
        var deposit = new Deposit
        {
            Id = Guid.NewGuid(), PatientId = p.Id, Amount = 100000,
            RemainingAmount = 100000, UsedAmount = 0, Status = 2,
            ReceiptNumber = "TU001"
        };
        ctx.Deposits.Add(deposit);
        ctx.SaveChanges();
        var svc = NewService(ctx);
        var dto = new UseDepositForPaymentDto { DepositId = deposit.Id, Amount = amount, InvoiceId = Guid.NewGuid() };
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.UseDepositForPaymentAsync(dto, Guid.NewGuid()));
        // deposit không bị trừ
        Assert.Equal(100000, ctx.Deposits.Single().RemainingAmount);
    }

    // ---------- CreateRefundAsync ----------
    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    public async Task CreateRefund_rejects_non_positive_amount(decimal amount)
    {
        using var ctx = TestDb.NewInMemory();
        var p = SeedPatient(ctx);
        var svc = NewService(ctx);
        var dto = new CreateRefundDto
        {
            PatientId = p.Id, RefundAmount = amount, RefundType = 1,
            OriginalDepositId = Guid.NewGuid()
        };
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateRefundAsync(dto, Guid.NewGuid()));
        Assert.Empty(ctx.Receipts); // không tạo phiếu hoàn rác
    }
}
