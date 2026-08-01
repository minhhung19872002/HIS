using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

public partial class InsuranceXmlService
{
    public async Task<XmlExportPreviewDto> PreviewExportAsync(XmlExportConfigDto config)
    {
        _logger.LogInformation("Generating export preview for {Month}/{Year}", config.Month, config.Year);

        // Generate all table data
        var xml1Data = await GenerateXml1DataAsync(config);
        var xml2Data = await GenerateXml2DataAsync(config);
        var xml3Data = await GenerateXml3DataAsync(config);
        var xml4Data = await GenerateXml4DataAsync(config);
        var xml5Data = await GenerateXml5DataAsync(config);
        var xml6Data = await GenerateXml6DataAsync(config);
        var xml7Data = await GenerateXml7DataAsync(config);
        var xml8Data = await GenerateXml8DataAsync(config);
        var xml9Data = await GenerateXml9DataAsync(config);
        var xml10Data = await GenerateXml10DataAsync(config);
        var xml11Data = await GenerateXml11DataAsync(config);
        var xml13Data = await GenerateXml13DataAsync(config);
        var xml14Data = await GenerateXml14DataAsync(config);
        var xml15Data = await GenerateXml15DataAsync(config);

        // Build table preview list
        var tables = new List<XmlTablePreview>
        {
            new() { TableName = "XML1", Description = "Thong tin chung ho so KCB", RecordCount = xml1Data.Count },
            new() { TableName = "XML2", Description = "Thuoc dieu tri", RecordCount = xml2Data.Count },
            new() { TableName = "XML3", Description = "Dich vu ky thuat", RecordCount = xml3Data.Count },
            new() { TableName = "XML4", Description = "Thuoc ngoai danh muc", RecordCount = xml4Data.Count },
            new() { TableName = "XML5", Description = "Chi dinh thuoc", RecordCount = xml5Data.Count },
            new() { TableName = "XML6", Description = "Mau va che pham mau", RecordCount = xml6Data.Count },
            new() { TableName = "XML7", Description = "Giay chuyen tuyen", RecordCount = xml7Data.Count },
            new() { TableName = "XML8", Description = "Van chuyen nguoi benh", RecordCount = xml8Data.Count },
            new() { TableName = "XML9", Description = "Giay nghi viec huong BHXH", RecordCount = xml9Data.Count },
            new() { TableName = "XML10", Description = "Ket qua giam dinh", RecordCount = xml10Data.Count },
            new() { TableName = "XML11", Description = "So BHXH", RecordCount = xml11Data.Count },
            new() { TableName = "XML13", Description = "Giay hen tai kham", RecordCount = xml13Data.Count },
            new() { TableName = "XML14", Description = "Phieu chuyen tuyen (QD 3176)", RecordCount = xml14Data.Count },
            new() { TableName = "XML15", Description = "Dieu tri lao", RecordCount = xml15Data.Count },
        };

        // Calculate cost totals from XML1 records
        var totalCost = xml1Data.Sum(r => r.TienKham + r.TienGiuong + r.TienNgoaitruth + r.TienBhyt + r.TienBnCct + r.TienNguoibenh);
        var totalInsurance = xml1Data.Sum(r => r.TienBhyt);
        var totalPatient = xml1Data.Sum(r => r.TienNguoibenh + r.TienBnCct);

        // Run validation if requested
        var validationErrors = new List<InsuranceValidationResultDto>();
        var hasBlockingErrors = false;
        if (config.ValidateBeforeExport)
        {
            validationErrors = await ValidateBeforeExportAsync(config);
            hasBlockingErrors = validationErrors.Any(r => !r.IsValid);
        }

        // Resolve department name if filtered
        string? deptName = null;
        if (config.DepartmentId.HasValue)
        {
            deptName = await _context.Departments
                .Where(d => d.Id == config.DepartmentId.Value)
                .Select(d => d.DepartmentName)
                .FirstOrDefaultAsync();
        }

        return new XmlExportPreviewDto
        {
            TotalRecords = xml1Data.Count,
            DateRangeFrom = config.FromDate ?? new DateTime(config.Year, config.Month, 1),
            DateRangeTo = config.ToDate ?? new DateTime(config.Year, config.Month, 1).AddMonths(1).AddDays(-1),
            DepartmentName = deptName,
            TotalCostAmount = totalCost,
            TotalInsuranceAmount = totalInsurance,
            TotalPatientAmount = totalPatient,
            Tables = tables,
            ValidationErrors = validationErrors,
            HasBlockingErrors = hasBlockingErrors
        };
    }

    public async Task<XmlExportResultDto> ExportXmlAsync(XmlExportConfigDto config)
    {
        _logger.LogInformation("Starting XML export for {Month}/{Year}", config.Month, config.Year);

        // Step 1: Validate all records (blocking per locked decision)
        if (config.ValidateBeforeExport)
        {
            var validationResults = await ValidateBeforeExportAsync(config);
            var blockingErrors = validationResults.Where(r => !r.IsValid).ToList();
            if (blockingErrors.Any())
            {
                _logger.LogWarning("XML export blocked: {Count} records with validation errors", blockingErrors.Count);
                return new XmlExportResultDto
                {
                    BatchId = Guid.Empty,
                    TotalRecords = validationResults.Count,
                    FailedRecords = blockingErrors.Count,
                    Errors = blockingErrors.SelectMany(r => r.Errors.Select(e => new XmlExportError
                    {
                        MaLk = r.MaLk,
                        ErrorCode = e.ErrorCode,
                        ErrorMessage = e.Message
                    })).ToList(),
                    ExportTime = DateTime.Now
                };
            }
        }

        // Step 2: Generate all table data
        var xml1Data = await GenerateXml1DataAsync(config);
        var xml2Data = await GenerateXml2DataAsync(config);
        var xml3Data = await GenerateXml3DataAsync(config);
        var xml4Data = await GenerateXml4DataAsync(config);
        var xml5Data = await GenerateXml5DataAsync(config);
        var xml6Data = await GenerateXml6DataAsync(config);
        var xml7Data = await GenerateXml7DataAsync(config);
        var xml8Data = await GenerateXml8DataAsync(config);
        var xml9Data = await GenerateXml9DataAsync(config);
        var xml10Data = await GenerateXml10DataAsync(config);
        var xml11Data = await GenerateXml11DataAsync(config);
        var xml13Data = await GenerateXml13DataAsync(config);
        var xml14Data = await GenerateXml14DataAsync(config);
        var xml15Data = await GenerateXml15DataAsync(config);

        // Step 3: Generate XML bytes using XmlExportService
        var xml1Bytes = await _xmlExportService.GenerateXml1FileAsync(xml1Data);
        var xml2Bytes = await _xmlExportService.GenerateXml2FileAsync(xml2Data);
        var xml3Bytes = await _xmlExportService.GenerateXml3FileAsync(xml3Data);
        var xml4Bytes = await _xmlExportService.GenerateXml4FileAsync(xml4Data);
        var xml5Bytes = await _xmlExportService.GenerateXml5FileAsync(xml5Data);
        var xml6Bytes = await _xmlExportService.GenerateXml6FileAsync(xml6Data);
        var xml7Bytes = await _xmlExportService.GenerateXml7FileAsync(xml7Data);
        var xml8Bytes = await _xmlExportService.GenerateXml8FileAsync(xml8Data);
        var xml9Bytes = await _xmlExportService.GenerateXml9FileAsync(xml9Data);
        var xml10Bytes = await _xmlExportService.GenerateXml10FileAsync(xml10Data);
        var xml11Bytes = await _xmlExportService.GenerateXml11FileAsync(xml11Data);
        var xml13Bytes = await _xmlExportService.GenerateXml13FileAsync(xml13Data);
        var xml14Bytes = await _xmlExportService.GenerateXml14FileAsync(xml14Data);
        var xml15Bytes = await _xmlExportService.GenerateXml15FileAsync(xml15Data);

        // Step 4: XSD validation of generated XML (per locked decision)
        var xsdErrors = new List<XmlValidationError>();
        xsdErrors.AddRange(_schemaValidator.Validate(xml1Bytes, "XML1"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml2Bytes, "XML2"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml3Bytes, "XML3"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml4Bytes, "XML4"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml5Bytes, "XML5"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml6Bytes, "XML6"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml7Bytes, "XML7"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml8Bytes, "XML8"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml9Bytes, "XML9"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml10Bytes, "XML10"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml11Bytes, "XML11"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml13Bytes, "XML13"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml14Bytes, "XML14"));
        xsdErrors.AddRange(_schemaValidator.Validate(xml15Bytes, "XML15"));

        if (xsdErrors.Any(e => e.Severity == "Error"))
        {
            _logger.LogWarning("XML export blocked by XSD validation: {Count} errors", xsdErrors.Count(e => e.Severity == "Error"));
            return new XmlExportResultDto
            {
                BatchId = Guid.Empty,
                TotalRecords = xml1Data.Count,
                FailedRecords = xml1Data.Count,
                Errors = xsdErrors.Where(e => e.Severity == "Error").Select(e => new XmlExportError
                {
                    MaLk = "",
                    ErrorCode = $"XSD_{e.TableName}",
                    ErrorMessage = $"[{e.TableName}] Line {e.LineNumber}: {e.Message}"
                }).ToList(),
                ExportTime = DateTime.Now
            };
        }

        // Step 5: Write files to disk with BHXH naming convention
        var facilityCode = !string.IsNullOrEmpty(_gatewayOptions.FacilityCode) ? _gatewayOptions.FacilityCode : "00000";
        var period = $"{config.Year}{config.Month:D2}";
        var batchCode = $"XML-{period}-{DateTime.Now:HHmmss}";
        var outputPath = Path.Combine("exports", "xml", batchCode);
        Directory.CreateDirectory(outputPath);

        // Always write ALL 14 tables (per locked decision), even empty ones
        var xmlFiles = new Dictionary<string, byte[]>
        {
            { $"{facilityCode}_{period}_XML1.xml", xml1Bytes },
            { $"{facilityCode}_{period}_XML2.xml", xml2Bytes },
            { $"{facilityCode}_{period}_XML3.xml", xml3Bytes },
            { $"{facilityCode}_{period}_XML4.xml", xml4Bytes },
            { $"{facilityCode}_{period}_XML5.xml", xml5Bytes },
            { $"{facilityCode}_{period}_XML6.xml", xml6Bytes },
            { $"{facilityCode}_{period}_XML7.xml", xml7Bytes },
            { $"{facilityCode}_{period}_XML8.xml", xml8Bytes },
            { $"{facilityCode}_{period}_XML9.xml", xml9Bytes },
            { $"{facilityCode}_{period}_XML10.xml", xml10Bytes },
            { $"{facilityCode}_{period}_XML11.xml", xml11Bytes },
            { $"{facilityCode}_{period}_XML13.xml", xml13Bytes },
            { $"{facilityCode}_{period}_XML14.xml", xml14Bytes },
            { $"{facilityCode}_{period}_XML15.xml", xml15Bytes },
        };

        long totalFileSize = 0;
        foreach (var (fileName, bytes) in xmlFiles)
        {
            var filePath = Path.Combine(outputPath, fileName);
            await File.WriteAllBytesAsync(filePath, bytes);
            totalFileSize += bytes.Length;
        }

        _logger.LogInformation("XML export complete: {Count} files, {Size} bytes total, path={Path}",
            xmlFiles.Count, totalFileSize, outputPath);

        // Step 6: #441 — LƯU đợt xuất (BatchId ↔ FilePath). Trước đây trả Guid.NewGuid() vứt đi
        // nên download/submit không tra ngược được ra thư mục file.
        var batch = new InsuranceXmlBatch
        {
            Id = Guid.NewGuid(),
            BatchCode = batchCode,
            PeriodMonth = config.Month,
            PeriodYear = config.Year,
            DepartmentId = config.DepartmentId,
            FilePath = outputPath,
            FileSize = totalFileSize,
            TotalRecords = xml1Data.Count,
            SuccessRecords = xml1Data.Count,
            FailedRecords = 0,
            Status = 0, // đã xuất
            ExportTime = DateTime.Now,
            CreatedAt = DateTime.UtcNow,
        };
        _context.Set<InsuranceXmlBatch>().Add(batch);
        await _context.SaveChangesAsync();

        return new XmlExportResultDto
        {
            BatchId = batch.Id,
            BatchCode = batchCode,
            TotalRecords = xml1Data.Count,
            SuccessRecords = xml1Data.Count,
            FailedRecords = 0,
            FilePath = outputPath,
            FileSize = totalFileSize,
            ExportTime = batch.ExportTime
        };
    }

    public async Task<byte[]> ExportExcelAsync(XmlExportConfigDto config)
    {
        try
        {
            var claims = await _context.Set<MedicalRecord>().AsNoTracking()
                .Where(r => r.AdmissionDate.Month == config.Month && r.AdmissionDate.Year == config.Year
                    && r.PatientType == 1 && !r.IsDeleted)
                .Include(r => r.Patient).OrderBy(r => r.AdmissionDate).Take(2000).ToListAsync();

            var rows = claims.Select(r => new string[] {
                r.MedicalRecordCode, r.Patient?.FullName ?? "", r.Patient?.InsuranceNumber ?? "",
                r.AdmissionDate.ToString("dd/MM/yyyy"), r.DischargeDate?.ToString("dd/MM/yyyy") ?? "",
                r.MainIcdCode ?? "", r.MainDiagnosis ?? ""
            }).ToList();

            var html = BuildTableReport($"DU LIEU BHYT THANG {config.Month}/{config.Year}",
                $"Tong: {claims.Count} ho so", DateTime.Now,
                new[] { "Ma HSBA", "Ho ten", "So the", "Ngay vao", "Ngay ra", "Ma ICD", "Chan doan" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    public async Task<byte[]> DownloadXmlFileAsync(Guid batchId)
    {
        try
        {
            // #441: tra ĐÚNG đợt theo batchId. Trước đây quét `exports/xml` rồi lấy thư mục MỚI NHẤT
            // → xuất nhiều đợt thì tải nhầm đợt (sai hồ sơ BHYT mà không có dấu hiệu gì).
            var batch = await _context.Set<InsuranceXmlBatch>()
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == batchId && !b.IsDeleted);

            if (batch == null)
            {
                _logger.LogWarning("XML batch not found in DB (batchId={BatchId})", batchId);
                return Array.Empty<byte>();
            }

            var batchPath = batch.FilePath;
            if (string.IsNullOrWhiteSpace(batchPath) || !Directory.Exists(batchPath))
            {
                _logger.LogWarning("XML batch {BatchCode} has no file directory on disk: {Path}",
                    batch.BatchCode, batchPath);
                return Array.Empty<byte>();
            }

            // Create zip archive of all XML files in the batch folder
            using var zipStream = new MemoryStream();
            using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var xmlFile in Directory.GetFiles(batchPath, "*.xml"))
                {
                    var entry = archive.CreateEntry(Path.GetFileName(xmlFile), CompressionLevel.Optimal);
                    using var entryStream = entry.Open();
                    var fileBytes = await File.ReadAllBytesAsync(xmlFile);
                    await entryStream.WriteAsync(fileBytes);
                }
            }

            _logger.LogInformation("Created ZIP download for batch at {Path} ({Size} bytes)",
                batchPath, zipStream.Length);
            return zipStream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create ZIP download for batch {BatchId}", batchId);
            return Array.Empty<byte>();
        }
    }



    public async Task<InsuranceValidationResultDto> ValidateClaimAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        var errors = new List<InsuranceValidationError>();
        var warnings = new List<InsuranceValidationWarning>();

        if (claim == null)
        {
            errors.Add(new InsuranceValidationError
            {
                ErrorCode = "CLAIM_NOT_FOUND",
                Field = "MaLk",
                Message = $"Claim {maLk} not found",
                TableName = "XML1"
            });
        }
        else
        {
            if (string.IsNullOrEmpty(claim.InsuranceNumber))
                errors.Add(new InsuranceValidationError { ErrorCode = "MISSING_INSURANCE", Field = "InsuranceNumber", Message = "Missing insurance number", TableName = "XML1" });
            if (string.IsNullOrEmpty(claim.MainDiagnosisCode))
                warnings.Add(new InsuranceValidationWarning { WarningCode = "MISSING_DIAG", Field = "MainDiagnosisCode", Message = "Missing main diagnosis code" });
        }

        return new InsuranceValidationResultDto
        {
            MaLk = maLk,
            IsValid = errors.Count == 0,
            Errors = errors,
            Warnings = warnings
        };
    }

    public async Task<List<InsuranceValidationResultDto>> ValidateClaimsBatchAsync(List<string> maLkList)
    {
        var results = new List<InsuranceValidationResultDto>();
        foreach (var maLk in maLkList)
        {
            results.Add(await ValidateClaimAsync(maLk));
        }
        return results;
    }

    public async Task<List<InsuranceValidationResultDto>> ValidateBeforeExportAsync(XmlExportConfigDto config)
    {
        var claims = await GetClaimsForExport(config);
        var results = new List<InsuranceValidationResultDto>();
        foreach (var claim in claims)
        {
            results.Add(await ValidateClaimAsync(claim.ClaimCode));
        }
        return results;
    }

    public async Task<List<PrescriptionValidationError>> ValidateBhytPrescriptionAsync(Guid prescriptionId)
    {
        // Validation rules: missing diagnosis, BHYT-restricted med without
        // matching diagnosis, expired BHYT card, missing required fields.
        // Without a separate medicine-restriction table we only flag the
        // structural issues we can detect.
        var errors = new List<PrescriptionValidationError>();
        var rx = await _context.Prescriptions
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);
        if (rx == null) return errors;

        if (string.IsNullOrEmpty(rx.MedicalRecord?.Patient?.InsuranceNumber))
        {
            errors.Add(new PrescriptionValidationError
            {
                ErrorCode = "BHYT_MISSING_CARD",
                MedicineCode = "",
                MedicineName = "",
                Message = "Bệnh nhân chưa có thông tin BHYT",
                IsBlocking = true,
            });
            return errors;
        }
        if (string.IsNullOrEmpty(rx.IcdCode) && string.IsNullOrEmpty(rx.DiagnosisCode))
        {
            errors.Add(new PrescriptionValidationError
            {
                ErrorCode = "BHYT_MISSING_ICD",
                MedicineCode = "",
                MedicineName = "",
                Message = "Đơn thuốc chưa có mã ICD chẩn đoán",
                IsBlocking = true,
            });
        }
        if (rx.MedicalRecord?.Patient?.InsuranceExpireDate < DateTime.UtcNow)
        {
            errors.Add(new PrescriptionValidationError
            {
                ErrorCode = "BHYT_EXPIRED",
                MedicineCode = "",
                MedicineName = "",
                Message = "Thẻ BHYT đã hết hạn",
                IsBlocking = true,
            });
        }
        foreach (var item in rx.Details ?? new List<PrescriptionDetail>())
        {
            if (item.Quantity <= 0)
            {
                errors.Add(new PrescriptionValidationError
                {
                    ErrorCode = "BHYT_INVALID_QTY",
                    MedicineCode = item.Medicine?.MedicineCode ?? "",
                    MedicineName = item.Medicine?.MedicineName ?? "",
                    Message = "Số lượng không hợp lệ",
                    IsBlocking = true,
                });
            }
            if (string.IsNullOrEmpty(item.Medicine?.RegistrationNumber))
            {
                errors.Add(new PrescriptionValidationError
                {
                    ErrorCode = "BHYT_NO_VISA",
                    MedicineCode = item.Medicine?.MedicineCode ?? "",
                    MedicineName = item.Medicine?.MedicineName ?? "",
                    Message = "Thuốc không có số đăng ký lưu hành",
                    IsBlocking = false,
                });
            }
        }
        return errors;
    }

    public async Task<List<ServiceValidationError>> ValidateBhytServiceOrderAsync(Guid serviceOrderId)
    {
        var errors = new List<ServiceValidationError>();
        var sr = await _context.ServiceRequests
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(r => r.Service)
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(r => r.Id == serviceOrderId && !r.IsDeleted);
        if (sr == null) return errors;

        if (string.IsNullOrEmpty(sr.MedicalRecord?.Patient?.InsuranceNumber))
        {
            errors.Add(new ServiceValidationError
            {
                ErrorCode = "BHYT_MISSING_CARD",
                ServiceCode = sr.Service?.ServiceCode ?? "",
                ServiceName = sr.Service?.ServiceName ?? "",
                Message = "Bệnh nhân chưa có thông tin BHYT",
                IsBlocking = true,
            });
            return errors;
        }
        if (string.IsNullOrEmpty(sr.IcdCode))
        {
            errors.Add(new ServiceValidationError
            {
                ErrorCode = "BHYT_MISSING_ICD",
                ServiceCode = sr.Service?.ServiceCode ?? "",
                ServiceName = sr.Service?.ServiceName ?? "",
                Message = "Phiếu chỉ định chưa có mã ICD",
                IsBlocking = true,
            });
        }
        return errors;
    }

    public async Task<CostCeilingCheckResult> CheckCostCeilingAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        return new CostCeilingCheckResult
        {
            MaLk = maLk,
            TotalCost = claim?.TotalAmount ?? 0,
            CeilingAmount = 50000000, // 50M VND default ceiling
            IsExceeded = false,
            ExceededAmount = 0,
            ViolatedRules = new List<string>()
        };
    }


}
