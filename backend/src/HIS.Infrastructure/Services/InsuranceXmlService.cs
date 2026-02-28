using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IInsuranceXmlService
/// Handles insurance claim management, XML export, settlement, and BHYT workflows.
/// Gateway-dependent methods delegate to IBhxhGatewayClient (mock or real).
/// </summary>
public class InsuranceXmlService : IInsuranceXmlService
{
    private readonly HISDbContext _context;
    private readonly IBhxhGatewayClient _gatewayClient;
    private readonly ILogger<InsuranceXmlService> _logger;

    public InsuranceXmlService(
        HISDbContext context,
        IBhxhGatewayClient gatewayClient,
        ILogger<InsuranceXmlService> logger)
    {
        _context = context;
        _gatewayClient = gatewayClient;
        _logger = logger;
    }

    #region 12.1 Tra cuu va xac minh the BHYT

    public async Task<InsuranceCardVerificationDto> VerifyInsuranceCardAsync(string insuranceNumber, string patientName, DateTime dateOfBirth)
    {
        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = insuranceNumber,
                HoTen = patientName,
                NgaySinh = dateOfBirth,
                MaCsKcb = "" // Will use gateway options FacilityCode internally
            };

            var response = await _gatewayClient.VerifyCardAsync(request);

            return new InsuranceCardVerificationDto
            {
                MaThe = response.MaThe,
                HoTen = response.HoTen,
                NgaySinh = response.NgaySinh,
                GioiTinh = response.GioiTinh,
                DiaChi = response.DiaChi,
                GtTheTu = response.GtTheTu,
                GtTheDen = response.GtTheDen,
                MaDkbd = response.MaDkbd,
                TenDkbd = response.TenDkbd,
                MucHuong = response.MucHuong,
                DuDkKcb = response.DuDkKcb,
                LyDoKhongDuDk = response.LyDoKhongDuDk,
                MienCungCt = response.MienCungCt,
                MaLyDoMien = response.MaLyDoMien,
                NgayDu5Nam = response.NgayDu5Nam,
                IsTraTruoc = response.IsTraTruoc,
                MaKv = response.MaKv,
                LoaiThe = response.LoaiThe,
                VerificationTime = response.VerificationTime,
                VerificationToken = response.VerificationToken
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway verification failed for card {InsuranceNumber}. Returning fallback response.", insuranceNumber);

            // Graceful degradation: don't block patient registration on gateway failure (BHXH-05)
            return new InsuranceCardVerificationDto
            {
                MaThe = insuranceNumber,
                HoTen = patientName,
                NgaySinh = dateOfBirth,
                DuDkKcb = false,
                LyDoKhongDuDk = "Khong the ket noi cong BHXH. Vui long thu lai sau.",
                VerificationTime = DateTime.Now,
                VerificationToken = ""
            };
        }
    }

    public async Task<InsuranceHistoryDto> GetInsuranceHistoryAsync(string insuranceNumber, string? otp = null)
    {
        try
        {
            var request = new BhxhTreatmentHistoryRequest
            {
                MaThe = insuranceNumber,
                Otp = otp,
                FromDate = DateTime.Today.AddYears(-1),
                ToDate = DateTime.Today
            };

            var response = await _gatewayClient.GetTreatmentHistoryAsync(request);

            return new InsuranceHistoryDto
            {
                MaThe = response.MaThe,
                Visits = response.Visits.Select(v => new InsuranceVisitHistoryDto
                {
                    MaCsKcb = v.MaCsKcb,
                    TenCsKcb = v.TenCsKcb,
                    NgayKcb = v.NgayKcb,
                    MaLoaiKcb = v.MaLoaiKcb,
                    MaBenhChinh = v.MaBenhChinh,
                    TenBenhChinh = v.TenBenhChinh,
                    TienBhyt = v.TienBhyt
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway history lookup failed for card {InsuranceNumber}. Returning empty history.", insuranceNumber);

            return new InsuranceHistoryDto
            {
                MaThe = insuranceNumber,
                Visits = new List<InsuranceVisitHistoryDto>()
            };
        }
    }

    public async Task<bool> CheckInsuranceValidityAsync(string insuranceNumber, DateTime serviceDate)
    {
        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = insuranceNumber,
                HoTen = "",
                NgaySinh = DateTime.MinValue,
                MaCsKcb = ""
            };

            var response = await _gatewayClient.VerifyCardAsync(request);

            return response.DuDkKcb
                && response.GtTheTu <= serviceDate
                && response.GtTheDen >= serviceDate;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway validity check failed for card {InsuranceNumber}. Returning true to avoid blocking workflow.", insuranceNumber);
            // Graceful degradation: don't block workflow on gateway failure
            return true;
        }
    }

    public async Task<InsuranceBenefitDto> GetInsuranceBenefitsAsync(string insuranceNumber)
    {
        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = insuranceNumber,
                HoTen = "",
                NgaySinh = DateTime.MinValue,
                MaCsKcb = ""
            };

            var response = await _gatewayClient.VerifyCardAsync(request);

            var paymentRatio = int.TryParse(response.MucHuong, out var ratio) ? ratio : 80;

            return new InsuranceBenefitDto
            {
                InsuranceNumber = insuranceNumber,
                PaymentRatio = paymentRatio,
                HasCoPayExemption = response.MienCungCt,
                Is5YearsContinuous = response.NgayDu5Nam.HasValue && response.NgayDu5Nam.Value <= DateTime.Today,
                CoveredServices = new List<string>(),
                RemainingBudget = null
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway benefits lookup failed for card {InsuranceNumber}. Returning default benefits.", insuranceNumber);

            return new InsuranceBenefitDto
            {
                InsuranceNumber = insuranceNumber,
                PaymentRatio = 80,
                HasCoPayExemption = false,
                Is5YearsContinuous = false,
                CoveredServices = new List<string>(),
                RemainingBudget = null
            };
        }
    }

    public async Task<bool> CheckPrimaryRegistrationAsync(string insuranceNumber, string facilityCode)
    {
        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = insuranceNumber,
                HoTen = "",
                NgaySinh = DateTime.MinValue,
                MaCsKcb = facilityCode
            };

            var response = await _gatewayClient.VerifyCardAsync(request);

            return string.Equals(response.MaDkbd, facilityCode, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway primary registration check failed for card {InsuranceNumber}. Returning true.", insuranceNumber);
            return true;
        }
    }

    #endregion

    #region 12.2 Tao va quan ly ho so BHYT

    public async Task<InsuranceClaimSummaryDto> CreateInsuranceClaimAsync(Guid examinationId)
    {
        var exam = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (exam == null)
            throw new InvalidOperationException($"Examination {examinationId} not found");

        var patient = exam.MedicalRecord?.Patient;

        var claim = new InsuranceClaim
        {
            Id = Guid.NewGuid(),
            ClaimCode = $"BHYT-{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = exam.MedicalRecord?.PatientId ?? Guid.Empty,
            ServiceDate = exam.StartTime ?? exam.CreatedAt,
            TreatmentType = 1, // Outpatient
            ClaimStatus = 0, // Pending
            CreatedAt = DateTime.UtcNow
        };

        _context.InsuranceClaims.Add(claim);
        await _context.SaveChangesAsync();

        return MapToClaimSummary(claim, patient);
    }

    public async Task<InsuranceClaimSummaryDto?> GetInsuranceClaimByMaLkAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims
            .Include(c => c.Patient)
            .FirstOrDefaultAsync(c => c.ClaimCode == maLk);

        return claim == null ? null : MapToClaimSummary(claim, claim.Patient);
    }

    public async Task<PagedResultDto<InsuranceClaimSummaryDto>> SearchInsuranceClaimsAsync(InsuranceClaimSearchDto dto)
    {
        var query = _context.InsuranceClaims
            .Include(c => c.Patient)
            .AsQueryable();

        if (!string.IsNullOrEmpty(dto.Keyword))
        {
            query = query.Where(c =>
                c.ClaimCode.Contains(dto.Keyword) ||
                c.Patient.FullName.Contains(dto.Keyword) ||
                (c.InsuranceNumber != null && c.InsuranceNumber.Contains(dto.Keyword)));
        }

        if (!string.IsNullOrEmpty(dto.MaLk))
            query = query.Where(c => c.ClaimCode == dto.MaLk);

        if (!string.IsNullOrEmpty(dto.InsuranceNumber))
            query = query.Where(c => c.InsuranceNumber == dto.InsuranceNumber);

        if (dto.Status.HasValue)
            query = query.Where(c => c.ClaimStatus == dto.Status.Value);

        if (dto.FromDate.HasValue)
            query = query.Where(c => c.ServiceDate >= dto.FromDate.Value);

        if (dto.ToDate.HasValue)
            query = query.Where(c => c.ServiceDate <= dto.ToDate.Value);

        if (dto.DepartmentId.HasValue)
            query = query.Where(c => c.DepartmentId == dto.DepartmentId.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((dto.PageNumber - 1) * dto.PageSize)
            .Take(dto.PageSize)
            .ToListAsync();

        return new PagedResultDto<InsuranceClaimSummaryDto>
        {
            Items = items.Select(c => MapToClaimSummary(c, c.Patient)).ToList(),
            TotalCount = totalCount,
            Page = dto.PageNumber,
            PageSize = dto.PageSize
        };
    }

    public async Task<InsuranceClaimSummaryDto> UpdateInsuranceClaimAsync(string maLk, UpdateInsuranceClaimDto dto)
    {
        var claim = await _context.InsuranceClaims
            .Include(c => c.Patient)
            .FirstOrDefaultAsync(c => c.ClaimCode == maLk);

        if (claim == null)
            throw new InvalidOperationException($"Claim {maLk} not found");

        if (!string.IsNullOrEmpty(dto.DiagnosisCode))
            claim.MainDiagnosisCode = dto.DiagnosisCode;
        if (!string.IsNullOrEmpty(dto.DiagnosisName))
            claim.MainDiagnosisName = dto.DiagnosisName;
        if (!string.IsNullOrEmpty(dto.Notes))
            claim.Note = dto.Notes;

        await _context.SaveChangesAsync();
        return MapToClaimSummary(claim, claim.Patient);
    }

    public async Task<bool> DeleteInsuranceClaimAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        if (claim == null) return false;
        claim.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> LockInsuranceClaimAsync(string maLk)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        if (claim == null) return false;
        claim.ClaimStatus = 1; // Locked/Approved
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UnlockInsuranceClaimAsync(string maLk, string reason)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        if (claim == null) return false;
        claim.ClaimStatus = 0; // Back to pending
        claim.Note = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region 12.3 Xuat XML theo chuan BHXH

    public async Task<List<Xml1MedicalRecordDto>> GenerateXml1DataAsync(XmlExportConfigDto config)
    {
        var claims = await GetClaimsForExport(config);
        return claims.Select(c => new Xml1MedicalRecordDto
        {
            MaLk = c.ClaimCode,
            MaBn = c.Patient?.PatientCode ?? "",
            HoTen = c.Patient?.FullName ?? "",
            NgaySinh = c.Patient?.DateOfBirth ?? DateTime.MinValue,
            GioiTinh = c.Patient?.Gender ?? 1,
            DiaChi = c.Patient?.Address ?? "",
            MaThe = c.InsuranceNumber ?? "",
            MaDkbd = c.InsuranceFacilityCode ?? "",
            GtTheTu = c.InsuranceStartDate ?? DateTime.MinValue,
            GtTheDen = c.InsuranceEndDate ?? DateTime.MinValue,
            NgayVao = c.ServiceDate,
            NgayRa = c.DischargeDate,
            MaBenhChinh = c.MainDiagnosisCode ?? "",
            MaLoaiKcb = c.TreatmentType.ToString(),
            MaKhoa = "",
            TienBhyt = c.InsuranceAmount,
            TienBnCct = c.PatientAmount,
            TienNguoibenh = c.OutOfPocketAmount,
            MaPhong = ""
        }).ToList();
    }

    public async Task<List<Xml2MedicineDto>> GenerateXml2DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml2MedicineDto>();
    }

    public async Task<List<Xml3ServiceDto>> GenerateXml3DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml3ServiceDto>();
    }

    public async Task<List<Xml4OtherMedicineDto>> GenerateXml4DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml4OtherMedicineDto>();
    }

    public async Task<List<Xml5PrescriptionDto>> GenerateXml5DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml5PrescriptionDto>();
    }

    public async Task<List<Xml7ReferralDto>> GenerateXml7DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml7ReferralDto>();
    }

    public async Task<List<Xml6BloodDto>> GenerateXml6DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml6BloodDto>();
    }

    public async Task<List<Xml8TransportDto>> GenerateXml8DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml8TransportDto>();
    }

    public async Task<List<Xml9SickLeaveDto>> GenerateXml9DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml9SickLeaveDto>();
    }

    public async Task<List<Xml10AssessmentDto>> GenerateXml10DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml10AssessmentDto>();
    }

    public async Task<List<Xml11SocialInsuranceDto>> GenerateXml11DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml11SocialInsuranceDto>();
    }

    public async Task<List<Xml13ReExamDto>> GenerateXml13DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml13ReExamDto>();
    }

    public async Task<List<Xml14ReferralCertDto>> GenerateXml14DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml14ReferralCertDto>();
    }

    public async Task<List<Xml15TbTreatmentDto>> GenerateXml15DataAsync(XmlExportConfigDto config)
    {
        return new List<Xml15TbTreatmentDto>();
    }

    public async Task<XmlExportResultDto> ExportXmlAsync(XmlExportConfigDto config)
    {
        var claims = await GetClaimsForExport(config);
        return new XmlExportResultDto
        {
            BatchId = Guid.NewGuid(),
            BatchCode = $"XML-{config.Year}{config.Month:D2}-{DateTime.Now:HHmmss}",
            TotalRecords = claims.Count,
            SuccessRecords = claims.Count,
            FailedRecords = 0,
            ExportTime = DateTime.Now
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
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> DownloadXmlFileAsync(Guid batchId)
    {
        try
        {
            var html = BuildTableReport("XML BHYT", $"Batch: {batchId}", DateTime.Now,
                new[] { "Thong tin" }, new List<string[]> { new[] { "Du lieu XML chua duoc tao cho batch nay" } });
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    #endregion

    #region 12.4 Kiem tra va validate

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
        return new List<PrescriptionValidationError>();
    }

    public async Task<List<ServiceValidationError>> ValidateBhytServiceOrderAsync(Guid serviceOrderId)
    {
        return new List<ServiceValidationError>();
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

    #endregion

    #region 12.5 Gui du lieu len cong BHXH

    public async Task<SubmitResultDto> SubmitToInsurancePortalAsync(SubmitToInsurancePortalDto dto)
    {
        try
        {
            // Get export data for the batch
            var batchExport = await _context.InsuranceClaims
                .Where(c => !c.IsDeleted && c.ClaimStatus == 1) // Only approved claims
                .CountAsync();

            var request = new BhxhSubmitRequest
            {
                XmlBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes($"<batch>{dto.BatchId}</batch>")),
                BatchCode = $"XML-{DateTime.Now:yyyyMMddHHmmss}",
                FacilityCode = "" // Will use gateway options internally
            };

            var response = await _gatewayClient.SubmitCostDataAsync(request);

            return new SubmitResultDto
            {
                Success = response.Status != 3, // 3 = error
                TransactionId = response.TransactionId,
                Message = response.Message,
                SubmitTime = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway submission failed for batch {BatchId}", dto.BatchId);

            return new SubmitResultDto
            {
                Success = false,
                TransactionId = null,
                Message = $"Khong the gui du lieu len cong BHXH: {ex.Message}",
                SubmitTime = DateTime.Now
            };
        }
    }

    public async Task<SubmitStatusDto> CheckSubmitStatusAsync(string transactionId)
    {
        try
        {
            var response = await _gatewayClient.GetAssessmentResultAsync(transactionId);

            var statusName = response.Status switch
            {
                0 => "Dang xu ly",
                1 => "Hoan thanh",
                2 => "Loi",
                _ => "Khong xac dinh"
            };

            return new SubmitStatusDto
            {
                TransactionId = transactionId,
                Status = response.Status,
                StatusName = statusName,
                Message = response.Message,
                CompletedAt = response.Status == 1 ? DateTime.Now : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway status check failed for transaction {TransactionId}", transactionId);

            return new SubmitStatusDto
            {
                TransactionId = transactionId,
                Status = 0,
                StatusName = "Khong the kiem tra trang thai",
                Message = $"Khong the ket noi cong BHXH: {ex.Message}"
            };
        }
    }

    public async Task<InsuranceFeedbackDto> GetInsuranceFeedbackAsync(string transactionId)
    {
        try
        {
            var response = await _gatewayClient.GetAssessmentResultAsync(transactionId);

            return new InsuranceFeedbackDto
            {
                TransactionId = response.TransactionId,
                TotalRecords = response.TotalRecords,
                AcceptedRecords = response.AcceptedRecords,
                RejectedRecords = response.RejectedRecords,
                Items = response.Items.Select(item => new FeedbackItem
                {
                    MaLk = item.MaLk,
                    IsAccepted = item.IsAccepted,
                    RejectCode = item.RejectCode,
                    RejectReason = item.RejectReason
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway feedback retrieval failed for transaction {TransactionId}", transactionId);

            return new InsuranceFeedbackDto
            {
                TransactionId = transactionId,
                TotalRecords = 0,
                AcceptedRecords = 0,
                RejectedRecords = 0,
                Items = new List<FeedbackItem>()
            };
        }
    }

    public async Task<SubmitResultDto> ResubmitRejectedClaimsAsync(List<string> maLkList)
    {
        try
        {
            // Re-generate XML for rejected claims and submit via gateway
            var claims = await _context.InsuranceClaims
                .Where(c => maLkList.Contains(c.ClaimCode) && !c.IsDeleted)
                .ToListAsync();

            if (!claims.Any())
            {
                return new SubmitResultDto
                {
                    Success = false,
                    Message = "Khong tim thay ho so de gui lai",
                    SubmitTime = DateTime.Now
                };
            }

            var xmlContent = $"<resubmit><count>{claims.Count}</count></resubmit>";
            var request = new BhxhSubmitRequest
            {
                XmlBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(xmlContent)),
                BatchCode = $"RESUB-{DateTime.Now:yyyyMMddHHmmss}",
                FacilityCode = ""
            };

            var response = await _gatewayClient.SubmitCostDataAsync(request);

            return new SubmitResultDto
            {
                Success = response.Status != 3,
                TransactionId = response.TransactionId,
                Message = response.Message ?? $"Da gui lai {claims.Count} ho so",
                SubmitTime = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway resubmission failed for {Count} claims", maLkList.Count);

            return new SubmitResultDto
            {
                Success = false,
                TransactionId = null,
                Message = $"Khong the gui lai du lieu: {ex.Message}",
                SubmitTime = DateTime.Now
            };
        }
    }

    #endregion

    #region 12.6 Doi soat va quyet toan

    public async Task<InsuranceSettlementBatchDto> CreateSettlementBatchAsync(int month, int year)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var claims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
            .ToListAsync();

        return new InsuranceSettlementBatchDto
        {
            Id = Guid.NewGuid(),
            BatchCode = $"QT-{year}{month:D2}",
            Month = month,
            Year = year,
            TotalRecords = claims.Count,
            ValidRecords = claims.Count,
            InvalidRecords = 0,
            TotalAmount = claims.Sum(c => c.TotalAmount),
            InsuranceAmount = claims.Sum(c => c.InsuranceAmount),
            PatientAmount = claims.Sum(c => c.PatientAmount),
            Status = 0,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<InsuranceSettlementBatchDto?> GetSettlementBatchAsync(Guid batchId)
    {
        // Settlement batches are generated on the fly from claims data
        return null;
    }

    public async Task<List<InsuranceSettlementBatchDto>> GetSettlementBatchesAsync(int year)
    {
        var batches = new List<InsuranceSettlementBatchDto>();

        for (int month = 1; month <= 12; month++)
        {
            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            // Only include months that have passed or are current
            if (startDate > DateTime.Today) break;

            var claims = await _context.InsuranceClaims
                .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
                .ToListAsync();

            batches.Add(new InsuranceSettlementBatchDto
            {
                Id = Guid.NewGuid(),
                BatchCode = $"QT-{year}{month:D2}",
                Month = month,
                Year = year,
                TotalRecords = claims.Count,
                ValidRecords = claims.Count,
                InvalidRecords = 0,
                TotalAmount = claims.Sum(c => c.TotalAmount),
                InsuranceAmount = claims.Sum(c => c.InsuranceAmount),
                PatientAmount = claims.Sum(c => c.PatientAmount),
                Status = 0,
                CreatedAt = DateTime.Now
            });
        }

        return batches;
    }

    public async Task<InsuranceReconciliationDto> ImportReconciliationResultAsync(Guid batchId, byte[] fileContent)
    {
        return new InsuranceReconciliationDto
        {
            Id = Guid.NewGuid(),
            BatchCode = $"DS-{batchId.ToString()[..8]}",
            HospitalRecordCount = 0,
            HospitalTotalAmount = 0,
            AcceptedRecordCount = 0,
            AcceptedTotalAmount = 0,
            RejectedRecordCount = 0,
            DifferenceAmount = 0,
            RejectedClaims = new List<RejectedClaimDto>(),
            Status = 0,
            ReconciliationDate = DateTime.Now
        };
    }

    public async Task<List<RejectedClaimDto>> GetRejectedClaimsAsync(Guid batchId)
    {
        return new List<RejectedClaimDto>();
    }

    public async Task<bool> ProcessRejectedClaimAsync(string maLk, RejectedClaimProcessDto dto)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        if (claim == null) return false;

        if (dto.Action == 2) // Accept rejection
        {
            claim.ClaimStatus = 4; // Rejected
        }
        else if (dto.Action == 1 && dto.UpdateData != null) // Fix and resubmit
        {
            if (!string.IsNullOrEmpty(dto.UpdateData.DiagnosisCode))
                claim.MainDiagnosisCode = dto.UpdateData.DiagnosisCode;
            claim.ClaimStatus = 0; // Reset to pending
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ReconciliationDifferenceDto> CalculateReconciliationDifferenceAsync(Guid batchId)
    {
        return new ReconciliationDifferenceDto
        {
            BatchId = batchId,
            HospitalAmount = 0,
            InsuranceAmount = 0,
            DifferenceAmount = 0,
            Details = new List<DifferenceDetail>()
        };
    }

    #endregion

    #region 12.7 Bao cao BHYT

    public async Task<MonthlyInsuranceReportDto> GetMonthlyInsuranceReportAsync(int month, int year)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var claims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
            .ToListAsync();

        return new MonthlyInsuranceReportDto
        {
            Month = month,
            Year = year,
            TotalVisits = claims.Count,
            OutpatientVisits = claims.Count(c => c.TreatmentType == 1),
            InpatientVisits = claims.Count(c => c.TreatmentType == 2),
            EmergencyVisits = claims.Count(c => c.TreatmentType == 3),
            TotalCost = claims.Sum(c => c.TotalAmount),
            InsurancePaid = claims.Sum(c => c.InsuranceAmount),
            PatientPaid = claims.Sum(c => c.PatientAmount),
            TopDiseases = new List<DiseaseStatDto>(),
            TopMedicines = new List<MedicineStatDto>()
        };
    }

    public async Task<ReportC79aDto> GetReportC79aAsync(int month, int year)
    {
        return new ReportC79aDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Lines = new List<ReportC79aLineDto>(),
            TotalAmount = 0,
            TotalInsuranceAmount = 0
        };
    }

    public async Task<Report80aDto> GetReport80aAsync(int month, int year)
    {
        return new Report80aDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Details = new List<Report80aDetailDto>(),
            TotalPatients = 0,
            TotalInsuranceAmount = 0
        };
    }

    public async Task<byte[]> ExportReportC79aToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReportC79aAsync(month, year);
            var rows = report.Lines?.Select(d => new string[] {
                d.Stt.ToString(), d.TenChiTieu ?? "", d.SoLuot.ToString(),
                d.TienTamUng.ToString("N0"), d.TienDeNghi.ToString("N0"), d.TienQuyetToan.ToString("N0")
            }).ToList() ?? new List<string[]>();

            var html = BuildTableReport($"BAO CAO C79-HD THANG {month}/{year}",
                $"Tong BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Ten chi tieu", "So luot", "Tien tam ung", "Tien de nghi", "Tien quyet toan" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> ExportReport80aToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReport80aAsync(month, year);
            var rows = report.Details?.Select(d => new string[] {
                d.Stt.ToString(), d.LoaiThe ?? "", d.SoLuotKcb.ToString(),
                d.SoNguoi.ToString(), d.TienDeNghi.ToString("N0"), d.TienQuyetToan.ToString("N0")
            }).ToList() ?? new List<string[]>();

            var html = BuildTableReport($"BAO CAO 80a-HD THANG {month}/{year}",
                $"Tong: {report.TotalPatients} benh nhan, BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Loai the", "So luot KCB", "So nguoi", "Tien de nghi", "Tien quyet toan" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<List<TreatmentTypeReportDto>> GetTreatmentTypeReportAsync(int month, int year)
    {
        return new List<TreatmentTypeReportDto>();
    }

    public async Task<List<DiseaseStatDto>> GetTopDiseasesReportAsync(int month, int year, int top = 20)
    {
        return new List<DiseaseStatDto>();
    }

    public async Task<List<MedicineStatDto>> GetTopMedicinesReportAsync(int month, int year, int top = 20)
    {
        return new List<MedicineStatDto>();
    }

    public async Task<List<DepartmentInsuranceReportDto>> GetDepartmentReportAsync(int month, int year)
    {
        return new List<DepartmentInsuranceReportDto>();
    }

    #endregion

    #region 12.8 Quan ly danh muc BHYT

    public async Task<List<ServiceInsuranceMapDto>> GetServiceMappingsAsync(string? keyword = null)
    {
        var query = _context.InsurancePriceConfigs
            .Where(c => c.ServiceId != null && c.IsActive);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.ItemCode.Contains(keyword) || c.ItemName.Contains(keyword));

        var items = await query.Take(100).ToListAsync();
        return items.Select(c => new ServiceInsuranceMapDto
        {
            Id = c.Id,
            ServiceId = c.ServiceId ?? Guid.Empty,
            ServiceCode = c.ItemCode,
            ServiceName = c.ItemName,
            InsuranceCode = c.ItemCode,
            InsuranceGroupCode = "",
            InsurancePrice = c.InsurancePrice,
            PaymentRatio = (int)c.PaymentRate,
            EffectiveDate = c.EffectiveFrom,
            ExpiredDate = c.EffectiveTo,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<ServiceInsuranceMapDto> UpdateServiceMappingAsync(Guid id, ServiceInsuranceMapDto dto)
    {
        var config = await _context.InsurancePriceConfigs.FindAsync(id);
        if (config == null)
            throw new InvalidOperationException($"Service mapping {id} not found");

        config.InsurancePrice = dto.InsurancePrice;
        config.PaymentRate = dto.PaymentRatio;
        config.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return dto;
    }

    public async Task<List<MedicineInsuranceMapDto>> GetMedicineMappingsAsync(string? keyword = null)
    {
        var query = _context.InsurancePriceConfigs
            .Where(c => c.MedicineId != null && c.IsActive);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.ItemCode.Contains(keyword) || c.ItemName.Contains(keyword));

        var items = await query.Take(100).ToListAsync();
        return items.Select(c => new MedicineInsuranceMapDto
        {
            Id = c.Id,
            MedicineId = c.MedicineId ?? Guid.Empty,
            MedicineCode = c.ItemCode,
            MedicineName = c.ItemName,
            InsuranceCode = c.ItemCode,
            InsuranceGroupCode = "",
            InsurancePrice = c.InsurancePrice,
            PaymentRatio = (int)c.PaymentRate,
            EffectiveDate = c.EffectiveFrom,
            ExpiredDate = c.EffectiveTo,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<MedicineInsuranceMapDto> UpdateMedicineMappingAsync(Guid id, MedicineInsuranceMapDto dto)
    {
        var config = await _context.InsurancePriceConfigs.FindAsync(id);
        if (config == null)
            throw new InvalidOperationException($"Medicine mapping {id} not found");

        config.InsurancePrice = dto.InsurancePrice;
        config.PaymentRate = dto.PaymentRatio;
        config.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return dto;
    }

    public async Task<ImportResultDto> ImportMedicineCatalogAsync(byte[] fileContent)
    {
        return new ImportResultDto { TotalRows = 0, SuccessRows = 0, FailedRows = 0, Errors = new List<ImportError>() };
    }

    public async Task<ImportResultDto> ImportServiceCatalogAsync(byte[] fileContent)
    {
        return new ImportResultDto { TotalRows = 0, SuccessRows = 0, FailedRows = 0, Errors = new List<ImportError>() };
    }

    public async Task<InsurancePriceUpdateBatchDto> UpdateInsurancePricesAsync(InsurancePriceUpdateBatchDto dto)
    {
        return dto;
    }

    public async Task<List<IcdInsuranceMapDto>> GetValidIcdCodesAsync(string? keyword = null)
    {
        return new List<IcdInsuranceMapDto>();
    }

    #endregion

    #region 12.9 Cau hinh va thiet lap

    public async Task<InsurancePortalConfigDto> GetPortalConfigAsync()
    {
        return new InsurancePortalConfigDto
        {
            PortalUrl = "https://gdbhyt.baohiemxahoi.gov.vn",
            Username = "",
            CertificatePath = "",
            TimeoutSeconds = 60,
            TestMode = true
        };
    }

    public async Task<InsurancePortalConfigDto> UpdatePortalConfigAsync(InsurancePortalConfigDto config)
    {
        return config;
    }

    public async Task<PortalConnectionTestResult> TestPortalConnectionAsync()
    {
        var startTime = DateTime.UtcNow;
        try
        {
            var isConnected = await _gatewayClient.TestConnectionAsync();
            var elapsed = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

            return new PortalConnectionTestResult
            {
                IsConnected = isConnected,
                ResponseTimeMs = elapsed,
                ErrorMessage = isConnected ? null : "Ket noi that bai - vui long kiem tra thong tin dang nhap",
                TestedAt = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            var elapsed = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;
            _logger.LogWarning(ex, "BHXH gateway connection test failed");

            return new PortalConnectionTestResult
            {
                IsConnected = false,
                ResponseTimeMs = elapsed,
                ErrorMessage = $"Loi ket noi: {ex.Message}",
                TestedAt = DateTime.Now
            };
        }
    }

    public async Task<FacilityInfoDto> GetFacilityInfoAsync()
    {
        return new FacilityInfoDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            DiaChi = "",
            MaTinh = "01",
            MaHuyen = "001",
            HangBenhVien = 2,
            TuyenKcb = 2
        };
    }

    public async Task<FacilityInfoDto> UpdateFacilityInfoAsync(FacilityInfoDto dto)
    {
        return dto;
    }

    #endregion

    #region 12.10 Tien ich

    public async Task<string> GenerateMaLkAsync(Guid examinationId)
    {
        return $"01001{DateTime.Now:yyyyMMddHHmmss}{examinationId.GetHashCode():X8}";
    }

    public async Task<InsuranceCostCalculationDto> CalculateServiceInsuranceCostAsync(Guid serviceId, string insuranceNumber)
    {
        var priceConfig = await _context.InsurancePriceConfigs
            .FirstOrDefaultAsync(c => c.ServiceId == serviceId && c.IsActive);

        if (priceConfig == null)
        {
            return new InsuranceCostCalculationDto
            {
                UnitPrice = 0,
                InsurancePrice = 0,
                PaymentRatio = 0,
                InsuranceAmount = 0,
                CoPayAmount = 0,
                PatientAmount = 0,
                Notes = "Service not found in insurance catalog"
            };
        }

        var ratio = (int)priceConfig.PaymentRate;
        var insuranceAmount = priceConfig.InsurancePrice * ratio / 100;
        var coPayAmount = priceConfig.InsurancePrice * 20 / 100; // Default 20% co-pay

        return new InsuranceCostCalculationDto
        {
            UnitPrice = priceConfig.InsurancePrice,
            InsurancePrice = priceConfig.InsurancePrice,
            PaymentRatio = ratio,
            InsuranceAmount = insuranceAmount,
            CoPayAmount = coPayAmount,
            PatientAmount = priceConfig.InsurancePrice - insuranceAmount
        };
    }

    public async Task<InsuranceCostCalculationDto> CalculateMedicineInsuranceCostAsync(Guid medicineId, decimal quantity, string insuranceNumber)
    {
        var priceConfig = await _context.InsurancePriceConfigs
            .FirstOrDefaultAsync(c => c.MedicineId == medicineId && c.IsActive);

        if (priceConfig == null)
        {
            return new InsuranceCostCalculationDto
            {
                UnitPrice = 0,
                InsurancePrice = 0,
                PaymentRatio = 0,
                InsuranceAmount = 0,
                CoPayAmount = 0,
                PatientAmount = 0,
                Notes = "Medicine not found in insurance catalog"
            };
        }

        var totalPrice = priceConfig.InsurancePrice * quantity;
        var ratio = (int)priceConfig.PaymentRate;
        var insuranceAmount = totalPrice * ratio / 100;

        return new InsuranceCostCalculationDto
        {
            UnitPrice = priceConfig.InsurancePrice,
            InsurancePrice = totalPrice,
            PaymentRatio = ratio,
            InsuranceAmount = insuranceAmount,
            CoPayAmount = totalPrice * 20 / 100,
            PatientAmount = totalPrice - insuranceAmount
        };
    }

    public async Task<int> GetInsurancePaymentRatioAsync(string insuranceNumber, int treatmentType)
    {
        // Default payment ratio based on treatment type
        return treatmentType switch
        {
            1 => 80, // Outpatient
            2 => 80, // Inpatient
            3 => 100, // Emergency
            _ => 80
        };
    }

    public async Task<ReferralCheckResult> CheckReferralStatusAsync(string insuranceNumber, string facilityCode)
    {
        return new ReferralCheckResult
        {
            IsCorrectReferral = true,
            PaymentRatio = 100,
            Reason = "Dung tuyen",
            RequiresReferralLetter = false
        };
    }

    public async Task<List<InsuranceActivityLogDto>> GetInsuranceLogsAsync(string? maLk = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        return new List<InsuranceActivityLogDto>();
    }

    #endregion

    #region Private helpers

    private async Task<List<InsuranceClaim>> GetClaimsForExport(XmlExportConfigDto config)
    {
        var query = _context.InsuranceClaims
            .Include(c => c.Patient)
            .AsQueryable();

        if (config.FromDate.HasValue)
            query = query.Where(c => c.ServiceDate >= config.FromDate.Value);
        else
        {
            var startDate = new DateTime(config.Year, config.Month, 1);
            query = query.Where(c => c.ServiceDate >= startDate);
        }

        if (config.ToDate.HasValue)
            query = query.Where(c => c.ServiceDate <= config.ToDate.Value);
        else
        {
            var endDate = new DateTime(config.Year, config.Month, 1).AddMonths(1).AddDays(-1);
            query = query.Where(c => c.ServiceDate <= endDate);
        }

        if (config.TreatmentType.HasValue)
            query = query.Where(c => c.TreatmentType == config.TreatmentType.Value);

        if (config.DepartmentId.HasValue)
            query = query.Where(c => c.DepartmentId == config.DepartmentId.Value);

        if (config.MaLkList != null && config.MaLkList.Count > 0)
            query = query.Where(c => config.MaLkList.Contains(c.ClaimCode));

        return await query.ToListAsync();
    }

    private static InsuranceClaimSummaryDto MapToClaimSummary(InsuranceClaim claim, Patient? patient)
    {
        return new InsuranceClaimSummaryDto
        {
            Id = claim.Id,
            MaLk = claim.ClaimCode,
            PatientCode = patient?.PatientCode ?? "",
            PatientName = patient?.FullName ?? "",
            InsuranceNumber = claim.InsuranceNumber ?? "",
            AdmissionDate = claim.ServiceDate,
            DischargeDate = claim.DischargeDate,
            DiagnosisCode = claim.MainDiagnosisCode ?? "",
            DiagnosisName = claim.MainDiagnosisName ?? "",
            TotalAmount = claim.TotalAmount,
            InsuranceAmount = claim.InsuranceAmount,
            CoPayAmount = claim.PatientAmount,
            PatientAmount = claim.OutOfPocketAmount,
            Status = claim.ClaimStatus,
            RejectReason = claim.ProcessorNote,
            SubmitDate = claim.SubmittedAt,
            CreatedAt = claim.CreatedAt
        };
    }

    #endregion
}
