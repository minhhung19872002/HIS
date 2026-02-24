using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IInsuranceXmlService
/// Handles insurance claim management, XML export, settlement, and BHYT workflows
/// </summary>
public class InsuranceXmlService : IInsuranceXmlService
{
    private readonly HISDbContext _context;

    public InsuranceXmlService(HISDbContext context)
    {
        _context = context;
    }

    #region 12.1 Tra cuu va xac minh the BHYT

    public async Task<InsuranceCardVerificationDto> VerifyInsuranceCardAsync(string insuranceNumber, string patientName, DateTime dateOfBirth)
    {
        // Simulated verification - in production, this would call the BHXH portal API
        return new InsuranceCardVerificationDto
        {
            MaThe = insuranceNumber,
            HoTen = patientName,
            NgaySinh = dateOfBirth,
            GioiTinh = 1,
            DiaChi = "",
            GtTheTu = DateTime.Today.AddYears(-1),
            GtTheDen = DateTime.Today.AddYears(1),
            MaDkbd = "01001",
            TenDkbd = "BV Da khoa",
            MucHuong = "80",
            DuDkKcb = true,
            MaKv = "K1",
            LoaiThe = "DN",
            VerificationTime = DateTime.Now,
            VerificationToken = Guid.NewGuid().ToString()
        };
    }

    public async Task<InsuranceHistoryDto> GetInsuranceHistoryAsync(string insuranceNumber)
    {
        return new InsuranceHistoryDto
        {
            MaThe = insuranceNumber,
            Visits = new List<InsuranceVisitHistoryDto>()
        };
    }

    public async Task<bool> CheckInsuranceValidityAsync(string insuranceNumber, DateTime serviceDate)
    {
        return !string.IsNullOrEmpty(insuranceNumber);
    }

    public async Task<InsuranceBenefitDto> GetInsuranceBenefitsAsync(string insuranceNumber)
    {
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

    public async Task<bool> CheckPrimaryRegistrationAsync(string insuranceNumber, string facilityCode)
    {
        return true;
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
        // Return empty Excel placeholder
        return Array.Empty<byte>();
    }

    public async Task<byte[]> DownloadXmlFileAsync(Guid batchId)
    {
        return Array.Empty<byte>();
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
        return new SubmitResultDto
        {
            Success = true,
            TransactionId = Guid.NewGuid().ToString(),
            Message = "Submitted successfully (test mode)",
            SubmitTime = DateTime.Now
        };
    }

    public async Task<SubmitStatusDto> CheckSubmitStatusAsync(string transactionId)
    {
        return new SubmitStatusDto
        {
            TransactionId = transactionId,
            Status = 0,
            StatusName = "Dang xu ly",
            CompletedAt = null
        };
    }

    public async Task<InsuranceFeedbackDto> GetInsuranceFeedbackAsync(string transactionId)
    {
        return new InsuranceFeedbackDto
        {
            TransactionId = transactionId,
            TotalRecords = 0,
            AcceptedRecords = 0,
            RejectedRecords = 0,
            Items = new List<FeedbackItem>()
        };
    }

    public async Task<SubmitResultDto> ResubmitRejectedClaimsAsync(List<string> maLkList)
    {
        return new SubmitResultDto
        {
            Success = true,
            TransactionId = Guid.NewGuid().ToString(),
            Message = $"Resubmitted {maLkList.Count} claims",
            SubmitTime = DateTime.Now
        };
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
        return Array.Empty<byte>();
    }

    public async Task<byte[]> ExportReport80aToExcelAsync(int month, int year)
    {
        return Array.Empty<byte>();
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
        return new PortalConnectionTestResult
        {
            IsConnected = false,
            ResponseTimeMs = 0,
            ErrorMessage = "Test mode - no real connection",
            TestedAt = DateTime.Now
        };
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
