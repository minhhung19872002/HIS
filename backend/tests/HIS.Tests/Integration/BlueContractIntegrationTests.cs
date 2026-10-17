using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AutoMapper;
using HIS.API.Middleware;
using HIS.Application.DTOs.Integration;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Mappings;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Services;
using HIS.Infrastructure.Services.Integration;
using HIS.Tests.Fixtures;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HIS.Tests.Integration;

/// <summary>
/// Cổng BlueContract (migration 227): tài khoản dịch vụ BLUECONTRACT_SERVICE chỉ đi được trong
/// /api/integration/bluecontract, payload phiếu đúng schema của cổng (đơn giá gồm VAT, ghép HĐ theo MST + Số QĐ),
/// và request đẩy phiếu được ký HMAC đúng như cổng kiểm tra (BlueContract docs/HIS_INTEGRATION.md §1).
/// </summary>
public sealed class BlueContractIntegrationTests
{
    private static async Task<int> InvokeScopeAsync(string path, string role)
    {
        var nextCalled = false;
        var middleware = new ExternalActorScopeMiddleware(
            _ => { nextCalled = true; return Task.CompletedTask; },
            NullLogger<ExternalActorScopeMiddleware>.Instance);
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.Role, role) }, authenticationType: "Bearer"));
        await middleware.InvokeAsync(context);
        return nextCalled ? StatusCodes.Status200OK : context.Response.StatusCode;
    }

    [Theory]
    [InlineData("/api/integration/bluecontract/stock-movements")]
    [InlineData("/api/integration/bluecontract/warehouse-receipts")]
    [InlineData("/api/integration/bluecontract/bid-items")]
    [InlineData("/health")]
    public async Task Tai_khoan_dich_vu_goi_duoc_API_tich_hop(string path)
    {
        Assert.Equal(StatusCodes.Status200OK, await InvokeScopeAsync(path, RoleNames.BlueContractService));
    }

    [Theory]
    [InlineData("/api/warehouse/receipts")]
    [InlineData("/api/warehouse/stock")]
    [InlineData("/api/catalog/medicines")]
    [InlineData("/api/patients/search")]
    [InlineData("/api/users")]
    [InlineData("/api/integration/other")]
    public async Task Tai_khoan_dich_vu_bi_chan_o_moi_route_khac(string path)
    {
        Assert.Equal(StatusCodes.Status403Forbidden, await InvokeScopeAsync(path, RoleNames.BlueContractService));
    }

    [Fact]
    public async Task Tai_khoan_dich_vu_khong_bi_buoc_doi_mat_khau_khi_qua_han()
    {
        using var context = TestDb.NewInMemory();
        var role = new Role { Id = Guid.NewGuid(), RoleCode = RoleNames.BlueContractServiceCode, RoleName = "Dịch vụ" };
        context.Roles.Add(role);
        var user = new User
        {
            Id = Guid.NewGuid(), Username = "svc-bluecontract", FullName = "BlueContract", PasswordHash = "x", IsActive = true,
            PasswordChangedAt = DateTime.UtcNow.AddDays(-400),
        };
        user.UserRoles.Add(new UserRole { Id = Guid.NewGuid(), UserId = user.Id, RoleId = role.Id });
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Auth:PasswordMaxAgeDays"] = "90" })
            .Build();
        var mapper = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>()).CreateMapper();
        var auth = new AuthService(context, config, mapper, new Mock<IEmailService>().Object,
            NullLogger<AuthService>.Instance, new Mock<IRefreshTokenService>().Object,
            new Mock<IRealtimeNotifier>().Object);

        var me = (await auth.GetCurrentUserAsync(user.Id))!;
        Assert.False(me.MustChangePassword);
    }

    private sealed record Seed(Guid Approved, Guid Pending, Guid NoTaxCode);

    private static async Task<Seed> SeedReceiptsAsync(HIS.Infrastructure.Data.HISDbContext context)
    {
        var warehouse = new Warehouse { Id = Guid.NewGuid(), WarehouseCode = "KT01", WarehouseName = "Kho thuốc chính" };
        var supplier = new Supplier { Id = Guid.NewGuid(), SupplierCode = "NCC01", SupplierName = "Công ty Dược A", TaxCode = " 0302345678 " };
        var noTax = new Supplier { Id = Guid.NewGuid(), SupplierCode = "NCC02", SupplierName = "Công ty B" };
        var medicine = new Medicine { Id = Guid.NewGuid(), MedicineCode = "TH001", MedicineName = "Paracetamol 500mg", Unit = "Viên" };
        context.AddRange(warehouse, supplier, noTax, medicine);

        ImportReceipt Receipt(string code, Supplier s, int status) => new()
        {
            Id = Guid.NewGuid(), ReceiptCode = code, ReceiptDate = new DateTime(2026, 10, 15), WarehouseId = warehouse.Id,
            Warehouse = warehouse, ImportType = 1, SupplierCode = s.Id.ToString(), Status = status,
            ApprovedAt = status == 1 ? new DateTime(2026, 10, 16, 9, 0, 0) : null,
            ContractNumber = "16/2026/HĐ-BVĐK", BidDecisionNumber = "126/QĐ-BVĐK",
            Details =
            {
                new ImportReceiptDetail
                {
                    Id = Guid.NewGuid(), MedicineId = medicine.Id, Medicine = medicine, BatchNumber = "L2610",
                    ExpiryDate = new DateTime(2028, 9, 30), Quantity = 1000, UnitPrice = 800, Vat = 5,
                },
            },
        };

        var approved = Receipt("NK0001", supplier, 1);
        var pending = Receipt("NK0002", supplier, 0);
        var missingTax = Receipt("NK0003", noTax, 1);
        context.ImportReceipts.AddRange(approved, pending, missingTax);
        await context.SaveChangesAsync();
        return new Seed(approved.Id, pending.Id, missingTax.Id);
    }

    [Fact]
    public async Task Payload_phieu_dung_schema_cong_va_don_gia_gom_VAT()
    {
        using var context = TestDb.NewInMemory();
        var seed = await SeedReceiptsAsync(context);
        var service = new BlueContractIntegrationService(context, new Mock<IWarehouseCompleteService>().Object);

        var payload = await service.BuildReceiptPayloadAsync(seed.Approved);

        Assert.NotNull(payload);
        Assert.Equal(seed.Approved.ToString(), payload!.HisReceiptId);
        Assert.Equal("NK0001", payload.ReceiptNumber);
        Assert.Equal("Receipt", payload.Type);
        Assert.Equal("2026-10-15", payload.ReceiptDate);
        Assert.Equal("KT01", payload.WarehouseCode);
        Assert.Equal("0302345678", payload.SupplierTaxCode);
        Assert.Equal("16/2026/HĐ-BVĐK", payload.ContractNumber);
        Assert.Equal("126/QĐ-BVĐK", payload.BidDecisionNumber);
        var line = Assert.Single(payload.Lines);
        Assert.Equal("TH001", line.HisKey);
        Assert.Equal("Viên", line.Unit);
        Assert.Equal("2028-09-30", line.ExpiryDate);
        Assert.Equal(840m, line.UnitPrice);   // 800 + 5 % VAT
        Assert.Equal(5m, line.VatRate);
    }

    [Fact]
    public async Task Chi_phieu_NCC_da_duyet_co_MST_moi_sang_cong()
    {
        using var context = TestDb.NewInMemory();
        var seed = await SeedReceiptsAsync(context);
        var service = new BlueContractIntegrationService(context, new Mock<IWarehouseCompleteService>().Object);

        Assert.Null(await service.BuildReceiptPayloadAsync(seed.Pending));
        Assert.Null(await service.BuildReceiptPayloadAsync(seed.NoTaxCode));
        var pulled = await service.GetApprovedReceiptsAsync(new DateTime(2026, 10, 16), new DateTime(2026, 10, 16));
        Assert.Equal(seed.Approved.ToString(), Assert.Single(pulled).HisReceiptId);
        Assert.Empty(await service.GetApprovedReceiptsAsync(new DateTime(2026, 10, 17), new DateTime(2026, 10, 18)));
    }

    [Fact]
    public async Task XNT_theo_ma_kho_loc_theo_ma_thuoc()
    {
        using var context = TestDb.NewInMemory();
        await SeedReceiptsAsync(context);
        var warehouse = new Mock<IWarehouseCompleteService>();
        warehouse.Setup(w => w.GetStockMovementReportAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), null))
            .ReturnsAsync(new List<StockMovementReportDto>
            {
                new() { ItemCode = "TH001", ItemName = "Paracetamol", OpeningQuantity = 10, TotalReceived = 1000, TotalIssued = 300, ClosingQuantity = 710 },
                new() { ItemCode = "TH002", ItemName = "Khác", ClosingQuantity = 5 },
            });
        var service = new BlueContractIntegrationService(context, warehouse.Object);

        var rows = await service.GetStockMovementsAsync("KT01", new DateTime(2026, 10, 1), new DateTime(2026, 10, 16), new[] { "TH001" });

        var row = Assert.Single(rows);
        Assert.Equal(("TH001", 10m, 1000m, 300m, 710m), (row.HisKey, row.Opening, row.Received, row.Issued, row.Closing));
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            service.GetStockMovementsAsync("KHONGCO", DateTime.Today, DateTime.Today, Array.Empty<string>()));
    }

    private sealed class CapturingHandler : HttpMessageHandler
    {
        public TaskCompletionSource<(HttpRequestMessage Request, byte[] Body)> Received { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Received.TrySetResult((request, await request.Content!.ReadAsByteArrayAsync(ct)));
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"outcome\":\"Created\"}") };
        }
    }

    [Fact]
    public async Task Request_day_phieu_ky_HMAC_dung_cach_cong_kiem_tra()
    {
        const string secret = "test-secret-0123456789abcdef0123456789";
        var receiptId = Guid.NewGuid();
        var integration = new Mock<IBlueContractIntegrationService>();
        integration.Setup(s => s.BuildReceiptPayloadAsync(receiptId)).ReturnsAsync(new BlueContractReceiptPayload
        {
            HisReceiptId = receiptId.ToString(), ReceiptDate = "2026-10-16", WarehouseCode = "KT01", SupplierTaxCode = "0302345678",
            Lines = { new BlueContractReceiptLine { HisKey = "TH001", ItemCode = "TH001", ItemName = "Paracetamol", Quantity = 1, UnitPrice = 840 } },
        });
        var provider = new ServiceCollection().AddSingleton(integration.Object).BuildServiceProvider();
        var handler = new CapturingHandler();
        var httpFactory = new Mock<IHttpClientFactory>();
        httpFactory.Setup(f => f.CreateClient(BlueContractReceiptPusher.HttpClientName)).Returns(() => new HttpClient(handler, false));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["BlueContract:BaseUrl"] = "https://cong.example.vn/",
            ["BlueContract:ApiKey"] = "his-key",
            ["BlueContract:Secret"] = secret,
        }).Build();
        var pusher = new BlueContractReceiptPusher(provider.GetRequiredService<IServiceScopeFactory>(), httpFactory.Object, config,
            NullLogger<BlueContractReceiptPusher>.Instance);

        await pusher.StartAsync(CancellationToken.None);
        pusher.Enqueue(receiptId);
        var (request, body) = await handler.Received.Task.WaitAsync(TimeSpan.FromSeconds(10));
        await pusher.StopAsync(CancellationToken.None);

        Assert.Equal("https://cong.example.vn/api/integration/his/warehouse-receipts", request.RequestUri!.ToString());
        Assert.Equal("his-key", request.Headers.GetValues("X-Api-Key").Single());
        var timestamp = request.Headers.GetValues("X-Timestamp").Single();
        var canonical = string.Join('\n', "POST", "/api/integration/his/warehouse-receipts", timestamp,
            Convert.ToHexStringLower(SHA256.HashData(body)));
        var expected = Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(canonical)));
        Assert.Equal(expected, request.Headers.GetValues("X-Signature").Single());
        using var json = JsonDocument.Parse(body);
        Assert.Equal(receiptId.ToString(), json.RootElement.GetProperty("hisReceiptId").GetString());
        Assert.Equal("Receipt", json.RootElement.GetProperty("type").GetString());
    }

    [Fact]
    public void Chua_cau_hinh_thi_khong_day()
    {
        var pusher = new BlueContractReceiptPusher(new ServiceCollection().BuildServiceProvider().GetRequiredService<IServiceScopeFactory>(),
            new Mock<IHttpClientFactory>().Object, new ConfigurationBuilder().Build(), NullLogger<BlueContractReceiptPusher>.Instance);
        Assert.False(pusher.Enabled);
        pusher.Enqueue(Guid.NewGuid());   // no-op, no throw
    }
}
