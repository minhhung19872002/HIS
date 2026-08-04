using System.Security.Cryptography.X509Certificates;
using HIS.Infrastructure.Common;
using HIS.Infrastructure.Configuration;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using iText.Kernel.Font;
using iText.IO.Font;
using iText.Kernel.Colors;
using iText.IO.Image;
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

    /// <summary>
    /// Sign PDF bytes invisibly (no visible stamp) - NangCap6 API #4
    /// </summary>
    Task<PdfSignatureResult> SignPdfBytesInvisibleAsync(
        byte[] pdfBytes,
        Pkcs11X509Certificate pkcs11Cert,
        string reason, string location, string signerName);

    /// <summary>
    /// Sign PDF bytes with visible signature at specified position - NangCap6 API #9
    /// </summary>
    Task<PdfSignatureResult> SignPdfBytesVisibleAsync(
        byte[] pdfBytes,
        Pkcs11X509Certificate pkcs11Cert,
        string reason, string location, string signerName,
        int page, float x, float y, float width, float height,
        float fontSize, string fontColor, string? signatureImageBase64);

    /// <summary>
    /// Verify all signatures in a signed PDF - NangCap6 API #10, #12
    /// </summary>
    HIS.Application.DTOs.PdfVerificationResult VerifyPdfSignatures(byte[] pdfBytes);

    /// <summary>
    /// Sign PDF using a PFX file (server-side cert, no USB Token / Pkcs11).
    /// Use case: AI report signed by hospital cert on Cloud Run Linux. If
    /// <paramref name="pfxBytes"/> is null, falls back to an in-memory
    /// self-signed cert (demo mode — visible in Adobe Reader as "Self-Signed").
    /// </summary>
    Task<PdfSignatureResult> SignPdfWithPfxAsync(
        byte[] pdfBytes,
        byte[]? pfxBytes,
        string? pfxPassword,
        string reason,
        string location,
        string signerName,
        bool visibleStamp = true);
}

/// <summary>
/// MemoryStream wrapper that ignores Close/Dispose calls.
/// Required because iText PdfSigner.SignDetached() closes the output stream internally,
/// then tries to read back from it for byte range computation.
/// </summary>
internal class UnclosableMemoryStream : MemoryStream
{
    public UnclosableMemoryStream() : base() { }
    public override void Close() { /* Prevent iText from closing this stream */ }
    protected override void Dispose(bool disposing) { /* Prevent disposal */ }
    public void ForceDispose() => base.Dispose(true);
}

public partial class PdfSignatureService : IPdfSignatureService
{
    private readonly string _fontPath;
    private readonly string _fontBoldPath;
    private readonly string _outputFolder;
    private readonly ILogger<PdfSignatureService>? _logger;
    private readonly byte[]? _checkmarkImageBytes;

    public PdfSignatureService() : this(null) { }

    public PdfSignatureService(ILogger<PdfSignatureService>? logger)
    {
        _logger = logger;

        // Vietnamese-capable font: Windows ships Times New Roman; Linux containers
        // (Cloud Run) install DejaVu via fonts-dejavu in Dockerfile. Fall back to
        // first existing path so PDF rendering doesn't crash on either OS.
        var candidates = new[]
        {
            @"C:\Windows\Fonts\times.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
        };
        _fontPath = candidates.FirstOrDefault(File.Exists) ?? candidates[0];

        // Bản cũ hard-code C:\Windows\Fonts\timesbd.ttf cho chữ đậm: trên container Linux file này
        // không tồn tại -> CreateFont ném lỗi -> CẢ HAI font rơi về Helvetica (Latin-1) và báo cáo
        // mất hết dấu tiếng Việt. Phải dò theo OS giống font thường.
        var boldCandidates = new[]
        {
            @"C:\Windows\Fonts\timesbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        };
        _fontBoldPath = boldCandidates.FirstOrDefault(File.Exists) ?? boldCandidates[0];

        // Thư mục lưu file PDF
        _outputFolder = Path.Combine(Directory.GetCurrentDirectory(), "Reports", "Radiology");
        if (!Directory.Exists(_outputFolder))
        {
            Directory.CreateDirectory(_outputFolder);
        }

        // Load green checkmark image from embedded resource
        try
        {
            var assembly = typeof(PdfSignatureService).Assembly;
            using var stream = assembly.GetManifestResourceStream("HIS.Infrastructure.Assets.green_checkmark.png");
            if (stream != null)
            {
                using var ms = new MemoryStream();
                stream.CopyTo(ms);
                _checkmarkImageBytes = ms.ToArray();
            }
        }
        catch { /* checkmark image not available - signing still works without it */ }
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
                fontBold = PdfFontFactory.CreateFont(_fontBoldPath, PdfEncodings.IDENTITY_H);
            }
            catch
            {
                // Font hệ thống không dùng được -> font Unicode đóng gói kèm ứng dụng.
                // KHÔNG rơi về Helvetica: font đó là Latin-1, nuốt sạch ký tự tiếng Việt 2 dấu.
                font = VietnamesePdfFonts.Regular();
                fontBold = VietnamesePdfFonts.Bold();
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
            // #402: thêm GUID — tên file chỉ timestamp có thể brute-force để tải PDF của BN khác
            var fileName = $"RIS_{reportData.RequestCode}_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid():N}.pdf";
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

            // Use UnclosableMemoryStream because PdfSigner.SignDetached() closes the stream
            // internally (via PdfWriter.Close()), then reads back for byte range computation.
            // A regular MemoryStream would throw "Cannot access a closed Stream".
            var outputStream = new UnclosableMemoryStream();

            var inputStream = new MemoryStream(pdfBytes);
            var reader = new PdfReader(inputStream);

            // Create signer using PdfSigner
            var signer = new PdfSigner(
                reader,
                outputStream,
                new StampingProperties());

            signer.SetFieldName("Sig_" + Guid.NewGuid().ToString("N")[..8]);

            // Configure visible stamp appearance (Vietnamese CKS format)
            ConfigureStampAppearance(signer, cert.Subject, cert.Subject, reason, location);

            // Create external signature using Windows CryptoAPI
            var externalSignature = new X509Certificate2Signature(cert, "SHA-256");

            // Sign the document
            signer.SignDetached(
                externalSignature,
                chain,
                null, // No CRL
                null, // No OCSP
                null, // No TSA
                8192,
                PdfSigner.CryptoStandard.CMS);

            var signedPdfBytes = outputStream.ToArray();
            outputStream.ForceDispose();

            // Save signed PDF
            var fileName = $"RIS_SIGNED_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid():N}.pdf";
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

}
