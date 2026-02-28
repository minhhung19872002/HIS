using System.Security.Cryptography.X509Certificates;
using HIS.Infrastructure.Configuration;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using iText.Kernel.Font;
using iText.IO.Font;
using iText.Kernel.Colors;
using iText.Signatures;
using iText.Bouncycastle.Crypto;
using iText.Bouncycastle.X509;
using iText.Commons.Bouncycastle.Cert;
using Microsoft.Extensions.Logging;
using Net.Pkcs11Interop.X509Store;
using Org.BouncyCastle.Pkcs;
using Org.BouncyCastle.Security;
using Org.BouncyCastle.X509;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Service tạo PDF báo cáo CĐHA và ký số bằng USB Token
/// </summary>
public interface IPdfSignatureService
{
    /// <summary>
    /// Tạo file PDF từ kết quả CĐHA
    /// </summary>
    Task<PdfGenerationResult> GenerateRadiologyReportPdfAsync(RadiologyReportData reportData);

    /// <summary>
    /// Ký số vào file PDF sử dụng USB Token (certificate từ Windows Store)
    /// </summary>
    Task<PdfSignatureResult> SignPdfWithUSBTokenAsync(byte[] pdfBytes, string certificateThumbprint, string reason, string location);

    /// <summary>
    /// Tạo và ký PDF trong một bước
    /// </summary>
    Task<PdfSignatureResult> GenerateAndSignRadiologyReportAsync(RadiologyReportData reportData, string certificateThumbprint);

    /// <summary>
    /// Sign PDF using PKCS#11 token with TSA + OCSP + CRL
    /// </summary>
    Task<PdfSignatureResult> SignPdfWithPkcs11Async(
        byte[] pdfBytes,
        Pkcs11X509Certificate pkcs11Cert,
        Pkcs11Configuration config,
        string reason,
        string location,
        string signerName);

    /// <summary>
    /// Convert HTML byte[] to PDF byte[] (for EMR form signing pipeline)
    /// </summary>
    Task<byte[]> ConvertHtmlToPdfAsync(byte[] htmlBytes);

    /// <summary>
    /// Generate PDF from HTML and sign in one step
    /// </summary>
    Task<PdfSignatureResult> ConvertAndSignAsync(
        byte[] htmlBytes,
        Pkcs11X509Certificate pkcs11Cert,
        Pkcs11Configuration config,
        string reason,
        string location,
        string signerName);
}

public class RadiologyReportData
{
    // Thông tin bệnh nhân
    public string PatientCode { get; set; } = "";
    public string PatientName { get; set; } = "";
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }

    // Thông tin phiếu yêu cầu
    public string RequestCode { get; set; } = "";
    public string RequestDate { get; set; } = "";
    public string? DepartmentName { get; set; }
    public string? RequestingDoctorName { get; set; }
    public string? Diagnosis { get; set; }
    public string? ClinicalInfo { get; set; }

    // Thông tin dịch vụ
    public string ServiceCode { get; set; } = "";
    public string ServiceName { get; set; } = "";
    public string? ServiceType { get; set; }

    // Kết quả
    public string ResultDate { get; set; } = "";
    public string? Description { get; set; }
    public string? Conclusion { get; set; }
    public string? Recommendation { get; set; }
    public string? TechnicianName { get; set; }
    public string? DoctorName { get; set; }

    // Hình ảnh đính kèm (Base64)
    public List<AttachedImageData> AttachedImages { get; set; } = new();

    // Thông tin cơ sở y tế
    public string HospitalName { get; set; } = "BỆNH VIỆN";
    public string? HospitalAddress { get; set; }
    public string? HospitalPhone { get; set; }
}

public class AttachedImageData
{
    public string FileName { get; set; } = "";
    public string Base64Data { get; set; } = "";
    public string? Description { get; set; }
}

public class PdfGenerationResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public byte[]? PdfBytes { get; set; }
    public string? FilePath { get; set; }
}

public class PdfSignatureResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public byte[]? SignedPdfBytes { get; set; }
    public string? SignedFilePath { get; set; }
    public string? SignerName { get; set; }
    public string? SignedAt { get; set; }
    public string? CertificateSerial { get; set; }
    public string? CertificateThumbprint { get; set; }
}

public class PdfSignatureService : IPdfSignatureService
{
    private readonly string _fontPath;
    private readonly string _outputFolder;
    private readonly ILogger<PdfSignatureService>? _logger;

    public PdfSignatureService() : this(null) { }

    public PdfSignatureService(ILogger<PdfSignatureService>? logger)
    {
        _logger = logger;

        // Sử dụng font Times New Roman có sẵn trong Windows
        _fontPath = @"C:\Windows\Fonts\times.ttf";

        // Thư mục lưu file PDF
        _outputFolder = Path.Combine(Directory.GetCurrentDirectory(), "Reports", "Radiology");
        if (!Directory.Exists(_outputFolder))
        {
            Directory.CreateDirectory(_outputFolder);
        }
    }

    public async Task<PdfGenerationResult> GenerateRadiologyReportPdfAsync(RadiologyReportData reportData)
    {
        try
        {
            using var memoryStream = new MemoryStream();

            // Tạo PDF document
            var writer = new PdfWriter(memoryStream);
            var pdf = new PdfDocument(writer);
            var document = new Document(pdf, iText.Kernel.Geom.PageSize.A4);
            document.SetMargins(36, 36, 36, 36); // 0.5 inch margins

            // Load Vietnamese font
            PdfFont font;
            PdfFont fontBold;
            try
            {
                font = PdfFontFactory.CreateFont(_fontPath, PdfEncodings.IDENTITY_H);
                fontBold = PdfFontFactory.CreateFont(@"C:\Windows\Fonts\timesbd.ttf", PdfEncodings.IDENTITY_H);
            }
            catch
            {
                // Fallback to default font if Times New Roman not available
                font = PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.HELVETICA, PdfEncodings.IDENTITY_H);
                fontBold = PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.HELVETICA_BOLD, PdfEncodings.IDENTITY_H);
            }

            // === HEADER - Thông tin bệnh viện ===
            var headerTable = new Table(2).UseAllAvailableWidth();

            // Logo placeholder (left)
            var logoCell = new Cell()
                .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
                .SetWidth(100);
            logoCell.Add(new Paragraph(reportData.HospitalName)
                .SetFont(fontBold)
                .SetFontSize(14)
                .SetFontColor(ColorConstants.DARK_GRAY));
            if (!string.IsNullOrEmpty(reportData.HospitalAddress))
            {
                logoCell.Add(new Paragraph(reportData.HospitalAddress)
                    .SetFont(font)
                    .SetFontSize(9));
            }
            headerTable.AddCell(logoCell);

            // Title (right)
            var titleCell = new Cell()
                .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
                .SetTextAlignment(TextAlignment.RIGHT);
            titleCell.Add(new Paragraph("KẾT QUẢ CHẨN ĐOÁN HÌNH ẢNH")
                .SetFont(fontBold)
                .SetFontSize(16)
                .SetFontColor(new DeviceRgb(0, 102, 153)));
            titleCell.Add(new Paragraph($"Mã phiếu: {reportData.RequestCode}")
                .SetFont(font)
                .SetFontSize(10));
            headerTable.AddCell(titleCell);

            document.Add(headerTable);
            document.Add(new Paragraph("\n"));

            // === THÔNG TIN BỆNH NHÂN ===
            document.Add(new Paragraph("THÔNG TIN BỆNH NHÂN")
                .SetFont(fontBold)
                .SetFontSize(12)
                .SetFontColor(new DeviceRgb(0, 102, 153))
                .SetMarginBottom(5));

            var patientTable = new Table(4).UseAllAvailableWidth();
            patientTable.SetBorder(iText.Layout.Borders.Border.NO_BORDER);

            AddInfoRow(patientTable, font, fontBold, "Họ tên:", reportData.PatientName);
            AddInfoRow(patientTable, font, fontBold, "Mã BN:", reportData.PatientCode);
            AddInfoRow(patientTable, font, fontBold, "Giới tính:", reportData.Gender ?? "");
            AddInfoRow(patientTable, font, fontBold, "Tuổi:", reportData.Age?.ToString() ?? "");
            AddInfoRow(patientTable, font, fontBold, "Địa chỉ:", reportData.Address ?? "");
            AddInfoRow(patientTable, font, fontBold, "SĐT:", reportData.PhoneNumber ?? "");

            document.Add(patientTable);
            document.Add(new Paragraph("\n"));

            // === THÔNG TIN CHỈ ĐỊNH ===
            document.Add(new Paragraph("THÔNG TIN CHỈ ĐỊNH")
                .SetFont(fontBold)
                .SetFontSize(12)
                .SetFontColor(new DeviceRgb(0, 102, 153))
                .SetMarginBottom(5));

            var orderTable = new Table(4).UseAllAvailableWidth();
            orderTable.SetBorder(iText.Layout.Borders.Border.NO_BORDER);

            AddInfoRow(orderTable, font, fontBold, "Ngày chỉ định:", reportData.RequestDate);
            AddInfoRow(orderTable, font, fontBold, "Khoa:", reportData.DepartmentName ?? "");
            AddInfoRow(orderTable, font, fontBold, "BS chỉ định:", reportData.RequestingDoctorName ?? "");
            AddInfoRow(orderTable, font, fontBold, "Dịch vụ:", reportData.ServiceName);

            if (!string.IsNullOrEmpty(reportData.Diagnosis))
            {
                AddInfoRowFullWidth(orderTable, font, fontBold, "Chẩn đoán:", reportData.Diagnosis);
            }
            if (!string.IsNullOrEmpty(reportData.ClinicalInfo))
            {
                AddInfoRowFullWidth(orderTable, font, fontBold, "Lâm sàng:", reportData.ClinicalInfo);
            }

            document.Add(orderTable);
            document.Add(new Paragraph("\n"));

            // === KẾT QUẢ ===
            document.Add(new Paragraph("KẾT QUẢ")
                .SetFont(fontBold)
                .SetFontSize(12)
                .SetFontColor(new DeviceRgb(0, 102, 153))
                .SetMarginBottom(5));

            // Mô tả
            if (!string.IsNullOrEmpty(reportData.Description))
            {
                document.Add(new Paragraph("Mô tả:")
                    .SetFont(fontBold)
                    .SetFontSize(10)
                    .SetMarginBottom(3));
                document.Add(new Paragraph(reportData.Description)
                    .SetFont(font)
                    .SetFontSize(10)
                    .SetMarginLeft(20)
                    .SetMarginBottom(10));
            }

            // Kết luận
            if (!string.IsNullOrEmpty(reportData.Conclusion))
            {
                document.Add(new Paragraph("Kết luận:")
                    .SetFont(fontBold)
                    .SetFontSize(10)
                    .SetMarginBottom(3));
                document.Add(new Paragraph(reportData.Conclusion)
                    .SetFont(fontBold)
                    .SetFontSize(11)
                    .SetMarginLeft(20)
                    .SetFontColor(new DeviceRgb(0, 51, 102))
                    .SetMarginBottom(10));
            }

            // Đề xuất
            if (!string.IsNullOrEmpty(reportData.Recommendation))
            {
                document.Add(new Paragraph("Đề xuất:")
                    .SetFont(fontBold)
                    .SetFontSize(10)
                    .SetMarginBottom(3));
                document.Add(new Paragraph(reportData.Recommendation)
                    .SetFont(font)
                    .SetFontSize(10)
                    .SetMarginLeft(20)
                    .SetMarginBottom(10));
            }

            // === HÌNH ẢNH ĐÍNH KÈM ===
            if (reportData.AttachedImages.Any())
            {
                document.Add(new Paragraph("\n"));
                document.Add(new Paragraph("HÌNH ẢNH")
                    .SetFont(fontBold)
                    .SetFontSize(12)
                    .SetFontColor(new DeviceRgb(0, 102, 153))
                    .SetMarginBottom(5));

                var imageTable = new Table(2).UseAllAvailableWidth();
                foreach (var imageData in reportData.AttachedImages.Take(6)) // Tối đa 6 hình
                {
                    try
                    {
                        var imageBytes = Convert.FromBase64String(imageData.Base64Data);
                        var image = new iText.Layout.Element.Image(iText.IO.Image.ImageDataFactory.Create(imageBytes));
                        image.ScaleToFit(250, 200);

                        var imageCell = new Cell()
                            .Add(image)
                            .Add(new Paragraph(imageData.Description ?? imageData.FileName)
                                .SetFont(font)
                                .SetFontSize(8)
                                .SetTextAlignment(TextAlignment.CENTER))
                            .SetTextAlignment(TextAlignment.CENTER)
                            .SetPadding(5);
                        imageTable.AddCell(imageCell);
                    }
                    catch
                    {
                        // Skip invalid images
                    }
                }

                // Fill empty cells if odd number of images
                if (reportData.AttachedImages.Count % 2 == 1)
                {
                    imageTable.AddCell(new Cell().SetBorder(iText.Layout.Borders.Border.NO_BORDER));
                }

                document.Add(imageTable);
            }

            // === FOOTER - Chữ ký ===
            document.Add(new Paragraph("\n\n"));

            var signatureTable = new Table(2).UseAllAvailableWidth();
            signatureTable.SetBorder(iText.Layout.Borders.Border.NO_BORDER);

            // Kỹ thuật viên
            var techCell = new Cell()
                .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
                .SetTextAlignment(TextAlignment.CENTER);
            techCell.Add(new Paragraph("KỸ THUẬT VIÊN")
                .SetFont(fontBold)
                .SetFontSize(10));
            techCell.Add(new Paragraph("\n\n\n"));
            techCell.Add(new Paragraph(reportData.TechnicianName ?? "")
                .SetFont(font)
                .SetFontSize(10));
            signatureTable.AddCell(techCell);

            // Bác sĩ đọc kết quả
            var doctorCell = new Cell()
                .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
                .SetTextAlignment(TextAlignment.CENTER);
            doctorCell.Add(new Paragraph($"Ngày {DateTime.Now:dd} tháng {DateTime.Now:MM} năm {DateTime.Now:yyyy}")
                .SetFont(font)
                .SetFontSize(9)
                .SetItalic());
            doctorCell.Add(new Paragraph("BÁC SĨ ĐỌC KẾT QUẢ")
                .SetFont(fontBold)
                .SetFontSize(10));
            doctorCell.Add(new Paragraph("(Ký số)")
                .SetFont(font)
                .SetFontSize(9)
                .SetItalic());
            doctorCell.Add(new Paragraph("\n\n"));
            doctorCell.Add(new Paragraph(reportData.DoctorName ?? "")
                .SetFont(fontBold)
                .SetFontSize(10));
            signatureTable.AddCell(doctorCell);

            document.Add(signatureTable);

            // Close document
            document.Close();

            var pdfBytes = memoryStream.ToArray();

            // Save to file
            var fileName = $"RIS_{reportData.RequestCode}_{DateTime.Now:yyyyMMddHHmmss}.pdf";
            var filePath = Path.Combine(_outputFolder, fileName);
            await File.WriteAllBytesAsync(filePath, pdfBytes);

            return new PdfGenerationResult
            {
                Success = true,
                Message = "Tạo PDF thành công",
                PdfBytes = pdfBytes,
                FilePath = filePath
            };
        }
        catch (Exception ex)
        {
            return new PdfGenerationResult
            {
                Success = false,
                Message = $"Lỗi tạo PDF: {ex.Message}"
            };
        }
    }

    public async Task<PdfSignatureResult> SignPdfWithUSBTokenAsync(
        byte[] pdfBytes,
        string certificateThumbprint,
        string reason = "Ký xác nhận kết quả CĐHA",
        string location = "Việt Nam")
    {
        try
        {
            // Tìm certificate từ Windows Store
            using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
            store.Open(OpenFlags.ReadOnly);

            var certificates = store.Certificates.Find(
                X509FindType.FindByThumbprint,
                certificateThumbprint,
                false);

            if (certificates.Count == 0)
            {
                return new PdfSignatureResult
                {
                    Success = false,
                    Message = $"Không tìm thấy certificate với thumbprint: {certificateThumbprint}"
                };
            }

            var cert = certificates[0];

            // Kiểm tra certificate có private key
            if (!cert.HasPrivateKey)
            {
                return new PdfSignatureResult
                {
                    Success = false,
                    Message = "Certificate không có private key"
                };
            }

            // Lấy private key - sẽ trigger Windows PIN dialog cho USB Token
            var privateKey = cert.GetRSAPrivateKey();
            if (privateKey == null)
            {
                return new PdfSignatureResult
                {
                    Success = false,
                    Message = "Không thể lấy private key từ certificate"
                };
            }

            // Convert to BouncyCastle types for iText
            var bouncyCastleCert = new X509CertificateParser().ReadCertificate(cert.RawData);
            var chain = new IX509Certificate[] { new X509CertificateBC(bouncyCastleCert) };

            // Create output stream
            using var outputStream = new MemoryStream();

            // Create reader and stamper
            using var reader = new PdfReader(new MemoryStream(pdfBytes));

            // Create signer using PdfSigner
            var signer = new PdfSigner(
                reader,
                outputStream,
                new StampingProperties());

            // Configure signature appearance
            var appearance = signer.GetSignatureAppearance();
            appearance
                .SetReason(reason)
                .SetLocation(location)
                .SetContact(cert.Subject)
                .SetSignatureCreator("HIS RIS/PACS Module")
                .SetPageNumber(1)
                .SetPageRect(new iText.Kernel.Geom.Rectangle(400, 50, 150, 50));

            signer.SetFieldName("Signature_RIS");

            // Create external signature using Windows CryptoAPI (triggers PIN dialog)
            var externalSignature = new X509Certificate2Signature(cert, "SHA-256");

            // Sign the document
            signer.SignDetached(
                externalSignature,
                chain,
                null, // No CRL
                null, // No OCSP
                null, // No TSA
                0,
                PdfSigner.CryptoStandard.CMS);

            var signedPdfBytes = outputStream.ToArray();

            // Save signed PDF
            var fileName = $"RIS_SIGNED_{DateTime.Now:yyyyMMddHHmmss}.pdf";
            var filePath = Path.Combine(_outputFolder, fileName);
            await File.WriteAllBytesAsync(filePath, signedPdfBytes);

            return new PdfSignatureResult
            {
                Success = true,
                Message = "Ký số PDF thành công",
                SignedPdfBytes = signedPdfBytes,
                SignedFilePath = filePath,
                SignerName = cert.Subject,
                SignedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                CertificateSerial = cert.SerialNumber,
                CertificateThumbprint = cert.Thumbprint
            };
        }
        catch (Exception ex)
        {
            return new PdfSignatureResult
            {
                Success = false,
                Message = $"Lỗi ký số PDF: {ex.Message}"
            };
        }
    }

    public async Task<PdfSignatureResult> GenerateAndSignRadiologyReportAsync(
        RadiologyReportData reportData,
        string certificateThumbprint)
    {
        // Bước 1: Tạo PDF
        var pdfResult = await GenerateRadiologyReportPdfAsync(reportData);
        if (!pdfResult.Success || pdfResult.PdfBytes == null)
        {
            return new PdfSignatureResult
            {
                Success = false,
                Message = $"Lỗi tạo PDF: {pdfResult.Message}"
            };
        }

        // Bước 2: Ký số
        var signResult = await SignPdfWithUSBTokenAsync(
            pdfResult.PdfBytes,
            certificateThumbprint,
            $"Ký xác nhận kết quả CĐHA - Mã phiếu: {reportData.RequestCode}",
            "Việt Nam");

        return signResult;
    }

    #region Helper Methods

    private void AddInfoRow(Table table, PdfFont font, PdfFont fontBold, string label, string value)
    {
        table.AddCell(new Cell()
            .Add(new Paragraph(label).SetFont(fontBold).SetFontSize(10))
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
            .SetPaddingRight(5));
        table.AddCell(new Cell()
            .Add(new Paragraph(value).SetFont(font).SetFontSize(10))
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER));
    }

    private void AddInfoRowFullWidth(Table table, PdfFont font, PdfFont fontBold, string label, string value)
    {
        table.AddCell(new Cell()
            .Add(new Paragraph(label).SetFont(fontBold).SetFontSize(10))
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
            .SetPaddingRight(5));
        table.AddCell(new Cell(1, 3)
            .Add(new Paragraph(value).SetFont(font).SetFontSize(10))
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER));
    }

    #endregion

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

            // Visible signature appearance on last page
            var document = signer.GetDocument();
            var lastPage = document.GetNumberOfPages();
            var appearance = config.SignatureAppearance;

            float x = 36;
            float y = 36;
            if (appearance.PagePosition == "bottom-right")
            {
                x = 595 - 36 - appearance.Width; // A4 width - margin - stamp width
                y = 36;
            }

            var rect = new iText.Kernel.Geom.Rectangle(x, y, appearance.Width, appearance.Height);
            var fieldName = $"Sig_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}";

            signer.SetFieldName(fieldName);
            signer.SetPageNumber(lastPage);
            signer.SetPageRect(rect);

            var signatureAppearance = signer.GetSignatureAppearance();
            signatureAppearance
                .SetReason(reason)
                .SetLocation(location)
                .SetContact(signerName)
                .SetSignatureCreator("HIS Digital Signature");

            // Set visible text
            var stampText = $"Ký bởi: {signerName}\nNgày: {DateTime.Now:dd/MM/yyyy HH:mm:ss}\nSố CT: {x509.SerialNumber}";
            signatureAppearance.SetLayer2Text(stampText);

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

        // Set font provider with Vietnamese font support
        var fontProvider = new iText.Layout.Font.FontProvider();
        fontProvider.AddStandardPdfFonts();
        if (File.Exists(_fontPath))
        {
            fontProvider.AddFont(_fontPath);
        }
        converterProperties.SetFontProvider(fontProvider);

        iText.Html2pdf.HtmlConverter.ConvertToPdf(htmlStream, outputStream, converterProperties);

        _logger?.LogInformation("Converted HTML to PDF ({Size} bytes)", outputStream.Length);
        return Task.FromResult(outputStream.ToArray());
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
