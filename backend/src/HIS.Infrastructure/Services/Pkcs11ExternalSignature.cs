using iText.Signatures;
using Net.Pkcs11Interop.X509Store;

namespace HIS.Infrastructure.Services;

/// <summary>
/// IExternalSignature adapter that bridges Pkcs11Interop.X509Store to iText7 PdfSigner.
/// Delegates signing to the USB Token via PKCS#11 (no Windows PIN dialog).
/// </summary>
public class Pkcs11ExternalSignature : IExternalSignature
{
    private readonly Pkcs11X509Certificate _certificate;
    private readonly string _hashAlgorithm;

    public Pkcs11ExternalSignature(Pkcs11X509Certificate certificate, string hashAlgorithm = "SHA-256")
    {
        _certificate = certificate ?? throw new ArgumentNullException(nameof(certificate));
        _hashAlgorithm = hashAlgorithm;
    }

    public string GetDigestAlgorithmName()
    {
        return _hashAlgorithm;
    }

    public string GetSignatureAlgorithmName()
    {
        return "RSA";
    }

    public ISignatureMechanismParams? GetSignatureMechanismParameters()
    {
        return null;
    }

    public byte[] Sign(byte[] message)
    {
        // Delegate signing to USB Token via Pkcs11Interop
        // The PIN was already provided when opening the session via FixedPinProvider
        return _certificate.GetRSAPrivateKey()!.SignData(
            message,
            System.Security.Cryptography.HashAlgorithmName.SHA256,
            System.Security.Cryptography.RSASignaturePadding.Pkcs1);
    }
}
