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
        var query = _context.InsuranceActivityLogs.Where(l => !l.IsDeleted);
        if (!string.IsNullOrWhiteSpace(maLk)) query = query.Where(l => l.MaLk == maLk);
        if (fromDate.HasValue) query = query.Where(l => l.ActivityTime >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(l => l.ActivityTime < toDate.Value.Date.AddDays(1));

        var rows = await query
            .OrderByDescending(l => l.ActivityTime)
            .Take(200)
            .ToListAsync();

        return rows.Select(l => new InsuranceActivityLogDto
        {
            Id = l.Id,
            MaLk = l.MaLk,
            Action = l.ActivityType,
            Description = l.Description,
            UserName = l.UserName,
            Timestamp = l.ActivityTime,
        }).ToList();
    }



    private async Task<List<InsuranceClaim>> GetClaimsForExport(XmlExportConfigDto config)
    {
        var query = _context.InsuranceClaims
            .Include(c => c.Patient)
            .Include(c => c.Department)
            .Include(c => c.Doctor)
            .Include(c => c.MedicalRecord)
            .Include(c => c.ClaimDetails).ThenInclude(d => d.Medicine)
            .Include(c => c.ClaimDetails).ThenInclude(d => d.Service).ThenInclude(s => s!.ServiceGroup)
            .AsNoTracking()
            .Where(c => !c.IsDeleted)
            .AsQueryable();

        // Chỉ suy khoảng ngày từ Month/Year khi kỳ hợp lệ — tránh dựng DateTime(0,0,..)
        // (ArgumentOutOfRange → 400 opaque) khi caller chỉ truyền MaLkList mà không kèm kỳ quyết toán.
        var hasValidPeriod = config.Year > 0 && config.Month is >= 1 and <= 12;

        if (config.FromDate.HasValue)
            query = query.Where(c => c.ServiceDate >= config.FromDate.Value);
        else if (hasValidPeriod)
        {
            var startDate = new DateTime(config.Year, config.Month, 1);
            query = query.Where(c => c.ServiceDate >= startDate);
        }

        if (config.ToDate.HasValue)
            query = query.Where(c => c.ServiceDate <= config.ToDate.Value);
        else if (hasValidPeriod)
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

}
