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
    /// R3: single-item BHYT estimate through the SAME formula as orders/claims (<see cref="BhytCoverageCalculator.SplitLine"/>):
    /// BHYT price = the price version in force today (InsurancePriceConfigs) else the catalog's InsurancePrice,
    /// TY_LE_TT from the same source, mức hưởng from the card. Route (tuyến) and the 15%-of-base-salary rule are
    /// properties of a whole visit, so an estimate without a visit applies neither — the order-time split does.
    /// Was: its own copy of the maths on the BHYT price only (the hospital-price difference was never shown).
    /// </summary>
    private static InsuranceCostCalculationDto EstimateInsuranceCost(
        decimal hospitalUnitPrice, decimal bhytUnitPrice, decimal quantity, decimal paymentRate, bool covered, string? insuranceNumber)
    {
        var level = BhytCardNumber.BenefitPercentOf(insuranceNumber);
        var mucHuong = level ?? BhytCoverageCalculator.DefaultBenefitPercent;
        var unitPrice = hospitalUnitPrice > 0 ? hospitalUnitPrice : bhytUnitPrice;
        var line = new BhytLineInput
        {
            UnitPrice = unitPrice, Quantity = quantity, InsurancePrice = bhytUnitPrice,
            IsCovered = covered, ItemPaymentRatePercent = paymentRate,
        };
        var r = BhytCoverageCalculator.SplitLine(line, mucHuong, 100);
        return new InsuranceCostCalculationDto
        {
            UnitPrice = unitPrice,
            InsurancePrice = bhytUnitPrice,
            PaymentRatio = r.AppliedPercent,
            InsuranceAmount = r.InsuranceAmount,
            CoPayAmount = r.InsuredBase - r.InsuranceAmount,
            PatientAmount = r.PatientAmount,
            Notes = !covered ? "Không thuộc danh mục BHYT chi trả"
                : level == null ? $"Không xác định được mức hưởng từ số thẻ BHYT — tạm tính {mucHuong}%. Tuyến KCB và ngưỡng 15% lương cơ sở áp dụng theo cả lượt khám khi chỉ định."
                : "Ước tính cho 1 mục; tuyến KCB và ngưỡng 15% lương cơ sở áp dụng theo cả lượt khám khi chỉ định."
        };
    }

    private Task<InsurancePriceConfig?> PriceConfigInForceAsync(Guid? serviceId, Guid? medicineId)
    {
        var today = DateTime.Today;
        return _context.InsurancePriceConfigs.AsNoTracking()
            .Where(c => !c.IsDeleted && c.IsActive
                        && (serviceId != null ? c.ServiceId == serviceId : c.MedicineId == medicineId)
                        && c.EffectiveFrom <= today && (c.EffectiveTo == null || c.EffectiveTo >= today))
            .OrderByDescending(c => c.EffectiveFrom)
            .FirstOrDefaultAsync();
    }

    public async Task<InsuranceCostCalculationDto> CalculateServiceInsuranceCostAsync(Guid serviceId, string insuranceNumber)
    {
        var service = await _context.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == serviceId && !s.IsDeleted);
        var priceConfig = await PriceConfigInForceAsync(serviceId, null);
        if (service == null && priceConfig == null)
            return new InsuranceCostCalculationDto { Notes = "Service not found in insurance catalog" };

        return EstimateInsuranceCost(
            service?.UnitPrice ?? 0,
            priceConfig?.InsurancePrice ?? service!.InsurancePrice,
            1,
            priceConfig?.PaymentRate ?? service!.InsurancePaymentRate,
            priceConfig != null || service!.IsInsuranceCovered,
            insuranceNumber);
    }

    public async Task<InsuranceCostCalculationDto> CalculateMedicineInsuranceCostAsync(Guid medicineId, decimal quantity, string insuranceNumber)
    {
        if (quantity <= 0)
            throw new ArgumentException("Số lượng phải lớn hơn 0.", nameof(quantity));

        var medicine = await _context.Medicines.AsNoTracking().FirstOrDefaultAsync(m => m.Id == medicineId && !m.IsDeleted);
        var priceConfig = await PriceConfigInForceAsync(null, medicineId);
        if (medicine == null && priceConfig == null)
            return new InsuranceCostCalculationDto { Notes = "Medicine not found in insurance catalog" };

        return EstimateInsuranceCost(
            medicine?.UnitPrice ?? 0,
            priceConfig?.InsurancePrice ?? medicine!.InsurancePrice,
            quantity,
            priceConfig?.PaymentRate ?? medicine!.InsurancePaymentRate,
            priceConfig != null || medicine!.IsInsuranceCovered,
            insuranceNumber);
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
        // R3: was a constant "Đúng tuyến / 100%". Now: registered facility vs this facility, the latest BHYT record's
        // route flag + referral letter, and the configured hospital level — same rules as the order-time split.
        var card = BhytCardNumber.CoreOf(BhytCardNumber.Normalize(insuranceNumber));
        var ownCode = await ResolveFacilityCodeAsync();
        var mr = string.IsNullOrEmpty(card) ? null : await _context.MedicalRecords.AsNoTracking()
            .Where(m => !m.IsDeleted && m.PatientType == 1 && m.InsuranceNumber != null && m.InsuranceNumber.StartsWith(card))
            .OrderByDescending(m => m.AdmissionDate)
            .FirstOrDefaultAsync();

        var registered = !string.IsNullOrWhiteSpace(facilityCode) ? facilityCode.Trim() : mr?.InsuranceFacilityCode;
        var isOwnFacility = !string.IsNullOrWhiteSpace(ownCode) && !string.IsNullOrWhiteSpace(registered)
                            && registered.Equals(ownCode, StringComparison.OrdinalIgnoreCase);
        var basis = mr ?? new MedicalRecord { InsuranceNumber = card, PatientType = 1, TreatmentType = 1 };
        var ctx = await new BhytVisitPricing(_context).BuildContextAsync(basis);
        ctx = new BhytVisitContext
        {
            BenefitPercent = ctx.BenefitPercent,
            Route = isOwnFacility ? 1 : (mr?.InsuranceRightRoute is 1 or 2 or 3 ? mr.InsuranceRightRoute : 2),
            HasReferral = ctx.HasReferral,
            IsEmergency = ctx.IsEmergency,
            IsInpatient = ctx.IsInpatient,
            HospitalLevel = ctx.HospitalLevel,
            BaseSalary = ctx.BaseSalary,
        };
        var factor = BhytCoverageCalculator.RouteFactorPercent(ctx, out var warning);
        var benefit = ctx.BenefitPercent ?? BhytCoverageCalculator.DefaultBenefitPercent;
        var correct = ctx.Route == 1 || ctx.HasReferral || ctx.IsEmergency;

        var reason = isOwnFacility ? "Đúng tuyến (đăng ký KCB ban đầu tại cơ sở)"
            : ctx.IsEmergency ? "Cấp cứu — không xét tuyến"
            : ctx.HasReferral ? $"Có giấy chuyển tuyến từ {mr!.ReferralFromFacilityName ?? mr.ReferralFromFacilityCode}"
            : ctx.Route == 1 ? "Đúng tuyến theo hồ sơ tiếp đón"
            : factor == 100 ? "Trái tuyến — hưởng như đúng tuyến theo quy định thông tuyến"
            : factor == 0 ? "Trái tuyến ngoại trú tại cơ sở tuyến tỉnh/trung ương — BHYT không chi trả"
            : $"Trái tuyến — BHYT chi trả {factor}% mức hưởng";
        if (warning != null) reason += ". " + warning;

        return new ReferralCheckResult
        {
            IsCorrectReferral = correct,
            PaymentRatio = benefit * factor / 100,
            Reason = reason,
            RequiresReferralLetter = !correct && factor < 100
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

        // R3: only claims that are ready for BHXH — Locked, Approved, PartiallyRejected, Paid. A Pending draft is still
        // being edited; a FullyRejected claim goes out again only when named explicitly (ResubmitRejectedClaimsAsync).
        if (config.MaLkList != null && config.MaLkList.Count > 0)
            query = query.Where(c => config.MaLkList.Contains(c.ClaimCode)
                                     && c.ClaimStatus != HIS.Core.Constants.InsuranceClaimStatus.Pending);
        else
            query = query.Where(c => c.ClaimStatus != HIS.Core.Constants.InsuranceClaimStatus.Pending
                                     && c.ClaimStatus != HIS.Core.Constants.InsuranceClaimStatus.FullyRejected);

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
