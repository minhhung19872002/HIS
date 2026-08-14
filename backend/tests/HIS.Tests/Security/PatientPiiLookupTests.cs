using HIS.Core.Entities;
using HIS.Infrastructure.Security;
using HIS.Tests.Fixtures;
using Xunit;

namespace HIS.Tests.Security;

public sealed class PatientPiiLookupTests
{
    [Fact]
    public async Task Lookup_matches_decrypted_identity_phone_and_insurance_values()
    {
        using var context = TestDb.NewInMemory();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "BN-PII-01",
            FullName = "PII Lookup Patient",
            IdentityNumber = "012345678901",
            PhoneNumber = "0912345678",
            InsuranceNumber = "DN4010123456789"
        };
        context.Patients.Add(patient);
        await context.SaveChangesAsync();

        Assert.Equal(patient.Id, (await context.Patients
            .FindByIdentityNumberDecryptedAsync(" 012345678901 "))?.Id);
        Assert.Equal(patient.Id, (await context.Patients
            .FindByPhoneNumberDecryptedAsync("0912345678"))?.Id);
        Assert.Equal(patient.Id, (await context.Patients
            .FindByInsuranceNumberDecryptedAsync("dn4010123456789"))?.Id);
    }
}
