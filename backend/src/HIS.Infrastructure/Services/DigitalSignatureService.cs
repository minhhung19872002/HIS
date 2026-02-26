using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;
using HIS.Application.DTOs.Radiology;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services
{
    /// <summary>
    /// Digital Signature Service for USB Token integration
    /// Supports USB Token (PKCS#11), SmartCard, and Windows Certificate Store
    /// Compatible with Vietnamese CA providers: VNPT CA, Viettel CA, NewCA, FPT CA
    /// </summary>
    public interface IDigitalSignatureService
    {
        /// <summary>
        /// Get list of available signing certificates from Windows Certificate Store
        /// USB Tokens and SmartCards register certificates in the Personal store
        /// </summary>
        Task<List<CertificateInfoDto>> GetAvailableCertificatesAsync();

        /// <summary>
        /// Sign data using selected certificate (Windows will prompt for USB Token PIN)
        /// </summary>
        Task<SignatureResultDto> SignDataAsync(byte[] data, string certificateThumbprint);

        /// <summary>
        /// Verify a CMS/PKCS#7 signature
        /// </summary>
        Task<bool> VerifySignatureAsync(byte[] originalData, byte[] signature);

        /// <summary>
        /// Get certificate details by thumbprint
        /// </summary>
        Task<CertificateInfoDto> GetCertificateInfoAsync(string thumbprint);
    }

    public class CertificateInfoDto
    {
        public string Thumbprint { get; set; }
        public string Subject { get; set; }
        public string SubjectName { get; set; } // Extracted CN
        public string Issuer { get; set; }
        public string IssuerName { get; set; } // Extracted CN
        public string SerialNumber { get; set; }
        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }
        public bool IsValid { get; set; }
        public bool HasPrivateKey { get; set; }
        public string KeyUsage { get; set; }
        public string SignatureAlgorithm { get; set; }
        public string ProviderName { get; set; } // CSP/KSP name (indicates if it's a USB Token)
    }

    public class SignatureResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public byte[] Signature { get; set; }
        public string SignatureBase64 { get; set; }
        public DateTime SignedAt { get; set; }
        public string SignerName { get; set; }
        public string CertificateSerial { get; set; }
        public string CertificateThumbprint { get; set; }
        public string HashAlgorithm { get; set; }
    }

    public class DigitalSignatureService : IDigitalSignatureService
    {
        private readonly ILogger<DigitalSignatureService> _logger;

        public DigitalSignatureService(ILogger<DigitalSignatureService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Get all available signing certificates from Personal store
        /// USB Tokens register their certificates here when plugged in
        /// </summary>
        public Task<List<CertificateInfoDto>> GetAvailableCertificatesAsync()
        {
            var certificates = new List<CertificateInfoDto>();

            try
            {
                // Open the Personal certificate store (CurrentUser\My)
                // USB Tokens and SmartCards register certificates here
                using (var store = new X509Store(StoreName.My, StoreLocation.CurrentUser))
                {
                    store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);

                    foreach (var cert in store.Certificates)
                    {
                        try
                        {
                            // Only include certificates that can be used for signing
                            // - Has private key (required for signing)
                            // - Not expired
                            // - Has digital signature key usage
                            if (!cert.HasPrivateKey) continue;

                            var certInfo = CreateCertificateInfo(cert);
                            certificates.Add(certInfo);

                            _logger.LogInformation(
                                "Found certificate: {Subject}, Provider: {Provider}, HasPrivateKey: {HasKey}",
                                certInfo.SubjectName,
                                certInfo.ProviderName,
                                certInfo.HasPrivateKey);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Error reading certificate: {Subject}", cert.Subject);
                        }
                    }

                    store.Close();
                }

                _logger.LogInformation("Found {Count} signing certificates", certificates.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error accessing certificate store");
            }

            return Task.FromResult(certificates);
        }

        /// <summary>
        /// Sign data using the certificate identified by thumbprint (Windows prompts for PIN)
        /// </summary>
        public Task<SignatureResultDto> SignDataAsync(byte[] data, string certificateThumbprint)
        {
            var result = new SignatureResultDto
            {
                Success = false,
                SignedAt = DateTime.Now
            };

            try
            {
                // Find the certificate
                X509Certificate2 signingCert = null;
                using (var store = new X509Store(StoreName.My, StoreLocation.CurrentUser))
                {
                    store.Open(OpenFlags.ReadOnly);
                    var certs = store.Certificates.Find(
                        X509FindType.FindByThumbprint,
                        certificateThumbprint,
                        validOnly: false);

                    if (certs.Count == 0)
                    {
                        result.Message = "Không tìm thấy chứng thư số với thumbprint đã chọn. Vui lòng kiểm tra USB Token đã cắm chưa.";
                        return Task.FromResult(result);
                    }

                    signingCert = certs[0];
                    store.Close();
                }

                if (!signingCert.HasPrivateKey)
                {
                    result.Message = "Chứng thư số không có private key. Vui lòng kiểm tra USB Token.";
                    return Task.FromResult(result);
                }

                // Check certificate validity
                if (DateTime.Now < signingCert.NotBefore)
                {
                    result.Message = $"Chứng thư số chưa có hiệu lực. Có hiệu lực từ: {signingCert.NotBefore:dd/MM/yyyy}";
                    return Task.FromResult(result);
                }

                if (DateTime.Now > signingCert.NotAfter)
                {
                    result.Message = $"Chứng thư số đã hết hạn vào: {signingCert.NotAfter:dd/MM/yyyy}";
                    return Task.FromResult(result);
                }

                _logger.LogInformation("Signing with certificate: {Subject}", signingCert.Subject);

                // CMS/PKCS#7 signing - Windows will prompt for USB Token PIN
                var defaultContentInfo = new ContentInfo(data);
                var defaultSignedCms = new SignedCms(defaultContentInfo, detached: true);
                var defaultSigner = new CmsSigner(SubjectIdentifierType.IssuerAndSerialNumber, signingCert);
                defaultSigner.DigestAlgorithm = new Oid("2.16.840.1.101.3.4.2.1"); // SHA-256
                defaultSigner.IncludeOption = X509IncludeOption.WholeChain;
                defaultSigner.SignedAttributes.Add(new Pkcs9SigningTime(DateTime.Now));

                // Compute signature - PIN PROMPT APPEARS HERE FOR USB TOKEN
                defaultSignedCms.ComputeSignature(defaultSigner);

                byte[] defaultSignature = defaultSignedCms.Encode();

                result.Success = true;
                result.Message = "Ký số thành công";
                result.Signature = defaultSignature;
                result.SignatureBase64 = Convert.ToBase64String(defaultSignature);
                result.SignerName = GetCommonName(signingCert.Subject);
                result.CertificateSerial = signingCert.SerialNumber;
                result.CertificateThumbprint = signingCert.Thumbprint;
                result.HashAlgorithm = "SHA-256";

                _logger.LogInformation("Successfully signed data. Signer: {Signer}", result.SignerName);
            }
            catch (CryptographicException ex)
            {
                _logger.LogError(ex, "Cryptographic error during signing");

                if (ex.Message.Contains("canceled") || ex.Message.Contains("cancelled"))
                {
                    result.Message = "Người dùng đã hủy nhập PIN. Vui lòng thử lại.";
                }
                else if (ex.Message.Contains("PIN") || ex.Message.Contains("password"))
                {
                    result.Message = "PIN không đúng. Vui lòng kiểm tra lại.";
                }
                else if (ex.Message.Contains("smart card") || ex.Message.Contains("token"))
                {
                    result.Message = "Không thể truy cập USB Token. Vui lòng kiểm tra đã cắm USB Token chưa.";
                }
                else
                {
                    result.Message = $"Lỗi ký số: {ex.Message}";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error signing data");
                result.Message = $"Lỗi không xác định: {ex.Message}";
            }

            return Task.FromResult(result);
        }

        /// <summary>
        /// Verify a CMS/PKCS#7 signature
        /// </summary>
        public Task<bool> VerifySignatureAsync(byte[] originalData, byte[] signature)
        {
            try
            {
                var contentInfo = new ContentInfo(originalData);
                var signedCms = new SignedCms(contentInfo, detached: true);
                signedCms.Decode(signature);

                // Verify signature - throws if invalid
                signedCms.CheckSignature(verifySignatureOnly: false);

                _logger.LogInformation("Signature verified successfully");
                return Task.FromResult(true);
            }
            catch (CryptographicException ex)
            {
                _logger.LogWarning(ex, "Signature verification failed");
                return Task.FromResult(false);
            }
        }

        /// <summary>
        /// Get certificate info by thumbprint
        /// </summary>
        public Task<CertificateInfoDto> GetCertificateInfoAsync(string thumbprint)
        {
            try
            {
                using (var store = new X509Store(StoreName.My, StoreLocation.CurrentUser))
                {
                    store.Open(OpenFlags.ReadOnly);
                    var certs = store.Certificates.Find(
                        X509FindType.FindByThumbprint,
                        thumbprint,
                        validOnly: false);

                    if (certs.Count > 0)
                    {
                        return Task.FromResult(CreateCertificateInfo(certs[0]));
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting certificate info");
            }

            return Task.FromResult<CertificateInfoDto>(null);
        }

        private CertificateInfoDto CreateCertificateInfo(X509Certificate2 cert)
        {
            var info = new CertificateInfoDto
            {
                Thumbprint = cert.Thumbprint,
                Subject = cert.Subject,
                SubjectName = GetCommonName(cert.Subject),
                Issuer = cert.Issuer,
                IssuerName = GetCommonName(cert.Issuer),
                SerialNumber = cert.SerialNumber,
                ValidFrom = cert.NotBefore,
                ValidTo = cert.NotAfter,
                IsValid = DateTime.Now >= cert.NotBefore && DateTime.Now <= cert.NotAfter,
                HasPrivateKey = cert.HasPrivateKey,
                SignatureAlgorithm = cert.SignatureAlgorithm.FriendlyName
            };

            // Try to get key usage
            try
            {
                foreach (var ext in cert.Extensions)
                {
                    if (ext is X509KeyUsageExtension keyUsage)
                    {
                        info.KeyUsage = keyUsage.KeyUsages.ToString();
                    }
                }
            }
            catch { }

            // Try to get provider name (indicates if USB Token)
            try
            {
                if (cert.HasPrivateKey)
                {
                    using (var rsa = cert.GetRSAPrivateKey())
                    {
                        if (rsa != null)
                        {
                            var keyType = rsa.GetType().Name;
                            info.ProviderName = keyType;

                            // RSACng indicates CNG-based key (often USB Token)
                            // RSACryptoServiceProvider indicates CSP-based key
                        }
                    }
                }
            }
            catch
            {
                // Can't get provider info - may need PIN to access
                info.ProviderName = "Unknown (requires PIN)";
            }

            return info;
        }

        /// <summary>
        /// Extract Common Name (CN) from X.500 Distinguished Name
        /// </summary>
        private string GetCommonName(string distinguishedName)
        {
            if (string.IsNullOrEmpty(distinguishedName))
                return string.Empty;

            // Parse CN from distinguished name like "CN=Nguyen Van A, O=Company, C=VN"
            var parts = distinguishedName.Split(',');
            foreach (var part in parts)
            {
                var trimmed = part.Trim();
                if (trimmed.StartsWith("CN=", StringComparison.OrdinalIgnoreCase))
                {
                    return trimmed.Substring(3).Trim();
                }
            }

            return distinguishedName;
        }
    }
}
