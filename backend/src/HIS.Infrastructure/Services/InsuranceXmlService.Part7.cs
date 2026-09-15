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
        // Facility prefix was hard-coded "01001" for every hospital.
        var facilityCode = await ResolveFacilityCodeAsync();
        if (string.IsNullOrWhiteSpace(facilityCode)) facilityCode = "01001";
        return $"{facilityCode}{DateTime.Now:yyyyMMddHHmmss}{examinationId.GetHashCode():X8}";
    }

    /// <summary>
    /// BHYT split for an amount already priced at the BHYT price:
    ///   base (thanh tien BH) = amount × service payment rate (TY_LE_TT)
    ///   T_BHTT = base × muc huong (card benefit level) · T_BNCCT = base − T_BHTT · T_BNTT = amount − base.
    /// Was: insurance = amount × TY_LE_TT only (card level ignored — a TE1 card got 80%) and a hard-coded
    /// 20% co-pay regardless of the card.
    /// </summary>
    private static InsuranceCostCalculationDto SplitInsuranceCost(
        decimal unitPrice, decimal amount, decimal paymentRate, string? insuranceNumber)
    {
        var level = BhytCardNumber.BenefitPercentOf(insuranceNumber);
        var mucHuong = level ?? 80;
        var baseAmount = Math.Round(amount * paymentRate / 100m, 2);
        var insuranceAmount = Math.Round(baseAmount * mucHuong / 100m, 2);
        return new InsuranceCostCalculationDto
        {
            UnitPrice = unitPrice,
            InsurancePrice = amount,
            PaymentRatio = mucHuong,
            InsuranceAmount = insuranceAmount,
            CoPayAmount = baseAmount - insuranceAmount,
            PatientAmount = amount - insuranceAmount,
            Notes = level == null
                ? "Không xác định được mức hưởng từ số thẻ BHYT — tạm tính 80%; chưa áp dụng tuyến/15% lương cơ sở"
                : "Chưa áp dụng tuyến KCB và ngưỡng 15% lương cơ sở"
        };
    }

    public async Task<InsuranceCostCalculationDto> CalculateServiceInsuranceCostAsync(Guid serviceId, string insuranceNumber)
    {
        var priceConfig = await _context.InsurancePriceConfigs
            .Where(c => c.ServiceId == serviceId && c.IsActive)
            .OrderByDescending(c => c.EffectiveFrom)
            .FirstOrDefaultAsync();

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

        return SplitInsuranceCost(priceConfig.InsurancePrice, priceConfig.InsurancePrice, priceConfig.PaymentRate, insuranceNumber);
    }

    public async Task<InsuranceCostCalculationDto> CalculateMedicineInsuranceCostAsync(Guid medicineId, decimal quantity, string insuranceNumber)
    {
        if (quantity <= 0)
            throw new ArgumentException("Số lượng phải lớn hơn 0.", nameof(quantity));

        var priceConfig = await _context.InsurancePriceConfigs
            .Where(c => c.MedicineId == medicineId && c.IsActive)
            .OrderByDescending(c => c.EffectiveFrom)
            .FirstOrDefaultAsync();

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
        return SplitInsuranceCost(priceConfig.InsurancePrice, totalPrice, priceConfig.PaymentRate, insuranceNumber);
    }

    public Task<int> GetInsurancePaymentRatioAsync(string insuranceNumber, int treatmentType)
    {
        // Muc huong comes from the card benefit level (3rd character), NOT from the treatment type.
        // Was 80% for every card (TE1/CC1/HN2 cards shown 80%) and 100% for any emergency visit
        // (emergency only waives the route rule, not the benefit level).
        return Task.FromResult(BhytCardNumber.BenefitPercentOf(insuranceNumber) ?? 80);
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

        // Upper bound is EXCLUSIVE. Was `<= lastDay 00:00` (month) / `<= ToDate` (date-only), which
        // dropped every claim served after midnight of the last day from the BHYT submission.
        if (config.ToDate.HasValue)
        {
            var toDate = config.ToDate.Value;
            var toExclusive = toDate.TimeOfDay == TimeSpan.Zero ? toDate.Date.AddDays(1) : toDate;
            query = query.Where(c => c.ServiceDate < toExclusive);
        }
        else if (hasValidPeriod)
        {
            var endExclusive = new DateTime(config.Year, config.Month, 1).AddMonths(1);
            query = query.Where(c => c.ServiceDate < endExclusive);
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
