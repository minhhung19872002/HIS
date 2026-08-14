using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Moq;
using Xunit;

namespace HIS.Tests.Services;

public sealed class BookingManagementSearchTests
{
    [Theory]
    [InlineData("booking search", "APT-SEARCH-01")]
    [InlineData("APT-SEARCH", "APT-SEARCH-01")]
    [InlineData("091234", "APT-SEARCH-01")]
    [InlineData("not-present", null)]
    public async Task Search_supports_name_code_and_decrypted_phone_without_sql_like_on_pii(
        string keyword,
        string? expectedCode)
    {
        using var context = TestDb.NewInMemory();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "BN-SEARCH-01",
            FullName = "Booking Search Patient",
            PhoneNumber = "0912345678"
        };
        context.Patients.Add(patient);
        context.Appointments.Add(new Appointment
        {
            Id = Guid.NewGuid(),
            AppointmentCode = "APT-SEARCH-01",
            AppointmentDate = DateTime.Today.AddDays(1),
            PatientId = patient.Id,
            Patient = patient,
            AppointmentType = 2,
            Status = 1
        });
        await context.SaveChangesAsync();

        var service = new BookingManagementService(context, new Mock<IUnitOfWork>().Object);
        var result = await service.GetBookingsAsync(new BookingSearchDto
        {
            Keyword = keyword,
            FromDate = DateTime.Today,
            ToDate = DateTime.Today.AddDays(2),
            PageSize = 20
        });

        if (expectedCode is null)
        {
            Assert.Empty(result.Items);
            Assert.Equal(0, result.TotalCount);
        }
        else
        {
            var booking = Assert.Single(result.Items);
            Assert.Equal(expectedCode, booking.AppointmentCode);
            Assert.Equal("0912345678", booking.PhoneNumber);
            Assert.Equal(1, result.TotalCount);
        }
    }
}
