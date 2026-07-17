using HIS.Infrastructure.Configuration;
using iText.Kernel.Pdf;
using iText.Signatures;
using iText.Bouncycastle.X509;
using iText.Commons.Bouncycastle.Cert;
using Microsoft.Extensions.Logging;
using Net.Pkcs11Interop.X509Store;
using Org.BouncyCastle.X509;

namespace HIS.Infrastructure.Services;

public partial class PdfSignatureService
{
    #region PKCS#11 Signing Methods (TSA + OCSP + CRL)

    public async Task<PdfSignatureResult> SignPdfWithPkcs11Async(
        byte[] pdfBytes,
        Pkcs11X509Certificate pkcs11Cert,
        Pkcs11Configuration config,
        string reason,
        string location,
        string signerName)
    {
        try
        {
            var x509 = pkcs11Cert.Info!.ParsedCertificate!;

            // Build certificate chain for iText
            var parser = new X509CertificateParser();
            var bcCert = parser.ReadCertificate(x509.RawData);
            var bcCertWrapped = new X509CertificateBC(bcCert);
            IX509Certificate[] chain = new IX509Certificate[] { bcCertWrapped };

            // Create PKCS#11 external signature
            var externalSignature = new Pkcs11ExternalSignature(pkcs11Cert, config.DefaultHashAlgorithm);

            // TSA client with fallback
            ITSAClient? tsaClient = null;
            foreach (var tsaUrl in config.TsaUrls)
            {
                try
                {
                    tsaClient = new TSAClientBouncyCastle(tsaUrl);
                    _logger?.LogInformation("Using TSA server: {TsaUrl}", tsaUrl);
                    break;
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "TSA server {TsaUrl} failed, trying next", tsaUrl);
                }
            }

            if (tsaClient == null)
                _logger?.LogWarning("No TSA server available. Signing without timestamp.");

            // OCSP client
            IOcspClient? ocspClient = null;
            if (config.EnableOcsp)
            {
                ocspClient = new OcspClientBouncyCastle(null);
            }

            // CRL client
            ICollection<ICrlClient>? crlClients = null;
            if (config.EnableCrl)
            {
                crlClients = new List<ICrlClient> { new CrlClientOnline(chain) };
            }

            // Sign PDF
            using var inputStream = new MemoryStream(pdfBytes);
            using var outputStream = new MemoryStream();

            var reader = new PdfReader(inputStream);
            var signer = new PdfSigner(reader, outputStream, new StampingProperties());

            var fieldName = $"Sig_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}";
            signer.SetFieldName(fieldName);

            // Configure visible stamp appearance (Vietnamese CKS format) on last page
            ConfigureStampAppearance(signer, x509.Subject, signerName, reason, location);

            // Estimated size: 15000 with TSA+OCSP+CRL, 8192 without
            int estimatedSize = tsaClient != null ? 15000 : 8192;

            signer.SignDetached(externalSignature, chain, crlClients, ocspClient, tsaClient, estimatedSize,
                PdfSigner.CryptoStandard.CMS);

            var signedBytes = outputStream.ToArray();

            _logger?.LogInformation("PDF signed with PKCS#11. Signer: {Signer}, Cert: {Serial}", signerName, x509.SerialNumber);

            return new PdfSignatureResult
            {
                Success = true,
                Message = "Ký số thành công",
                SignedPdfBytes = signedBytes,
                SignerName = signerName,
                SignedAt = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"),
                CertificateSerial = x509.SerialNumber,
                CertificateThumbprint = x509.Thumbprint
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error signing PDF with PKCS#11");

            var message = ex.Message.Contains("CKR_PIN_INCORRECT")
                ? "PIN không đúng. Vui lòng kiểm tra lại."
                : ex.Message.Contains("CKR_DEVICE_REMOVED")
                    ? "USB Token đã bị rút ra. Vui lòng cắm lại và thử lại."
                    : $"Lỗi ký số: {ex.Message}";

            return new PdfSignatureResult
            {
                Success = false,
                Message = message
            };
        }
    }

    public Task<byte[]> ConvertHtmlToPdfAsync(byte[] htmlBytes)
    {
        using var htmlStream = new MemoryStream(htmlBytes);
        using var outputStream = new MemoryStream();

        var converterProperties = new iText.Html2pdf.ConverterProperties();

        // Set font provider with Vietnamese font support - load all Windows fonts
        var fontProvider = new iText.Layout.Font.FontProvider();
        fontProvider.AddStandardPdfFonts();

        // Add entire Windows Fonts directory for full Vietnamese support
        var windowsFontsDir = @"C:\Windows\Fonts";
        if (Directory.Exists(windowsFontsDir))
        {
            fontProvider.AddDirectory(windowsFontsDir);
        }

        converterProperties.SetFontProvider(fontProvider);

        iText.Html2pdf.HtmlConverter.ConvertToPdf(htmlStream, outputStream, converterProperties);

        // Note: HtmlConverter.ConvertToPdf closes the outputStream internally (via PdfWriter.Close).
        // MemoryStream.ToArray() works on closed streams, but .Length does not.
        var pdfBytes = outputStream.ToArray();
        _logger?.LogInformation("Converted HTML to PDF ({Size} bytes)", pdfBytes.Length);
        return Task.FromResult(pdfBytes);
    }

    public async Task<PdfSignatureResult> ConvertAndSignAsync(
        byte[] htmlBytes,
        Pkcs11X509Certificate pkcs11Cert,
        Pkcs11Configuration config,
        string reason,
        string location,
        string signerName)
    {
        var pdfBytes = await ConvertHtmlToPdfAsync(htmlBytes);
        return await SignPdfWithPkcs11Async(pdfBytes, pkcs11Cert, config, reason, location, signerName);
    }

    #endregion
}
