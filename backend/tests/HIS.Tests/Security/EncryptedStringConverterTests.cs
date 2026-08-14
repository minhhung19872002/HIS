using HIS.Infrastructure.Security;
using Microsoft.AspNetCore.DataProtection;
using Xunit;

namespace HIS.Tests.Security;

public sealed class EncryptedStringConverterTests
{
    [Fact]
    public void Ciphertext_from_an_unavailable_key_is_not_returned_as_patient_data()
    {
        var writer = new EncryptedStringConverter(new EphemeralDataProtectionProvider());
        var reader = new EncryptedStringConverter(new EphemeralDataProtectionProvider());

        var ciphertext = writer.ConvertToProviderExpression.Compile()("0912345678");
        var result = reader.ConvertFromProviderExpression.Compile()(ciphertext);

        Assert.NotNull(ciphertext);
        Assert.StartsWith("CfDJ8", ciphertext!);
        Assert.Null(result);
    }

    [Fact]
    public void Legacy_plaintext_remains_readable()
    {
        var converter = new EncryptedStringConverter(new EphemeralDataProtectionProvider());

        var result = converter.ConvertFromProviderExpression.Compile()("0912345678");

        Assert.Equal("0912345678", result);
    }
}
