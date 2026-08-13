using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HIS.Tests.Services.HospitalPharmacy;

public sealed class HospitalPharmacySalesTests
{
    [Fact]
    public async Task SearchSalesAsync_ChoosesLinkedPatientNameAfterMaterialization()
    {
        await using var context = TestDb.NewInMemory();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "BN-001",
            FullName = "Nguyen Van Lien Ket",
            Gender = 1,
            CreatedAt = DateTime.UtcNow,
        };
        var cashier = new User
        {
            Id = Guid.NewGuid(),
            Username = "cashier-test",
            PasswordHash = "not-used",
            FullName = "Thu ngan test",
            UserType = 5,
            CreatedAt = DateTime.UtcNow,
        };
        var linkedSale = new RetailSale
        {
            Id = Guid.NewGuid(),
            SaleCode = "NT-LINKED",
            PatientId = patient.Id,
            PatientName = "Ten du phong",
            CashierId = cashier.Id,
            CreatedAt = DateTime.UtcNow,
        };
        var walkInSale = new RetailSale
        {
            Id = Guid.NewGuid(),
            SaleCode = "NT-WALKIN",
            PatientName = "Khach vang lai",
            CashierId = cashier.Id,
            CreatedAt = DateTime.UtcNow.AddMinutes(-1),
        };
        linkedSale.Items.Add(new RetailSaleItem
        {
            Id = Guid.NewGuid(),
            MedicineId = Guid.NewGuid(),
            MedicineName = "Thuoc A",
            Quantity = 1,
            CreatedAt = DateTime.UtcNow,
        });

        context.Patients.Add(patient);
        context.Users.Add(cashier);
        context.RetailSales.AddRange(linkedSale, walkInSale);
        await context.SaveChangesAsync();
        Assert.Equal(2, await context.RetailSales.CountAsync());

        var service = new HospitalPharmacyService(context);
        var rows = await service.SearchSalesAsync(new RetailSaleSearchDto { PageSize = 10 });

        var linked = Assert.Single(rows, row => row.SaleCode == "NT-LINKED");
        Assert.Equal("Nguyen Van Lien Ket", linked.PatientName);
        Assert.Equal("BN-001", linked.PatientCode);
        Assert.Equal(1, linked.ItemCount);

        var walkIn = Assert.Single(rows, row => row.SaleCode == "NT-WALKIN");
        Assert.Equal("Khach vang lai", walkIn.PatientName);
        Assert.Null(walkIn.PatientCode);
    }
}
