using System.Security.Cryptography.X509Certificates;
using iText.Signatures;
using iText.Commons.Bouncycastle.Cert;

namespace HIS.Infrastructure.Services;

/// <summary>
/// External signature implementation using X509Certificate2 (Windows CryptoAPI)
/// This triggers the Windows PIN dialog for USB Token
/// </summary>
public class X509Certificate2Signature : IExternalSignature
{
    private readonly X509Certificate2 _certificate;
    private readonly string _hashAlgorithm;

    public X509Certificate2Signature(X509Certificate2 certificate, string hashAlgorithm)
    {
        _certificate = certificate;
        _hashAlgorithm = hashAlgorithm;
    }

    public string GetDigestAlgorithmName() => _hashAlgorithm;

    public string GetSignatureAlgorithmName() => "RSA";

    public ISignatureMechanismParams? GetSignatureMechanismParameters() => null;

    public byte[] Sign(byte[] message)
    {
        using var rsa = _certificate.GetRSAPrivateKey();
        if (rsa == null)
            throw new InvalidOperationException("Cannot get RSA private key from certificate");

        var hashAlgorithmName = _hashAlgorithm switch
        {
            "SHA-256" => System.Security.Cryptography.HashAlgorithmName.SHA256,
            "SHA-384" => System.Security.Cryptography.HashAlgorithmName.SHA384,
            "SHA-512" => System.Security.Cryptography.HashAlgorithmName.SHA512,
            _ => System.Security.Cryptography.HashAlgorithmName.SHA256
        };

        return rsa.SignData(message, hashAlgorithmName, System.Security.Cryptography.RSASignaturePadding.Pkcs1);
    }
}
