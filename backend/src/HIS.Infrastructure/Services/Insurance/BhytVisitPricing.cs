using Microsoft.EntityFrameworkCore;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>One billable line of a visit after the BHYT split.</summary>
public sealed class BhytPricedLine
{
    /// <summary>InsuranceClaimDetails.ItemType: 1 service · 2 medicine · 3 supply · 4 bed · 5 other.</summary>
    public int ItemType { get; init; }
    public Guid? ServiceId { get; init; }
    public Guid? MedicineId { get; init; }
    public string ItemCode { get; init; } = string.Empty;
    public string ItemName { get; init; } = string.Empty;
    public string? Unit { get; init; }
    public decimal Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    /// <summary>BHYT price in force at the service date (0 = none → hospital price).</summary>
    public decimal InsurancePrice { get; init; }
    public decimal ItemPaymentRate { get; init; }
    public bool IsInsuranceCovered { get; init; }
    public DateTime ServiceDate { get; init; }
    /// <summary>Bed lines (ItemType 4): the BedAssignments row priced — same id as InvoiceLedger's bed ChargeLine.</summary>
    public Guid? BedAssignmentId { get; init; }
    public BhytLineResult Result { get; set; } = null!;

    internal ServiceRequestDetail? Srd { get; init; }
    internal ServiceRequest? Sr { get; init; }
    internal PrescriptionDetail? Pd { get; init; }
    internal Prescription? Rx { get; init; }
    internal bool Frozen { get; init; }
}

public sealed class BhytPricedVisit
{
    public MedicalRecord MedicalRecord { get; init; } = null!;
    /// <summary>A valid card was found (record, else the patient's card). False → nothing is re-split, no claim.</summary>
    public bool IsInsured { get; init; }
    /// <summary>Card the split used: MedicalRecords.InsuranceNumber when valid, otherwise Patients.InsuranceNumber.</summary>
    public string? CardNumber { get; init; }
    public DateTime? CardExpireDate { get; init; }
    public BhytVisitResult Result { get; init; } = null!;
    public List<BhytPricedLine> Lines { get; init; } = new();
}

/// <summary>
/// Loads a medical record's billable lines, applies <see cref="BhytCoverageCalculator"/> and writes the split
/// back to ServiceRequests/ServiceRequestDetails/Prescriptions/PrescriptionDetails. No DI: construct with the
/// caller's DbContext so the writes join the caller's unit of work (caller saves).
/// Only BHYT records (PatientType 1) are touched — fee/service patients keep InsuranceAmount 0.
/// </summary>
public sealed class BhytVisitPricing
{
    public const string HospitalLevelKey = "BHYT.HospitalLevel";
    public const string BaseSalaryKey = "BHYT.BaseSalary";
    public const string CostCeilingKey = "BHYT.CostCeiling";

    private readonly HISDbContext _db;

    public BhytVisitPricing(HISDbContext db) => _db = db;

    /// <summary>Recalculate and stage the split on the tracked entities. Returns null when the record is not BHYT.</summary>
    public async Task<BhytPricedVisit?> RecalculateAsync(Guid medicalRecordId, bool includeBeds = false, CancellationToken ct = default)
    {
        var visit = await PriceAsync(medicalRecordId, includeBeds, ct);
        if (visit == null) return null;
        // R3 review B9: no valid card on the record NOR on the patient → leave the stored split alone (a missing card
        // must never rewrite insured lines to 100% patient). The warning travels with the result.
        if (!visit.IsInsured) return visit;

        var touchedRequests = new HashSet<ServiceRequest>();
        var touchedRx = new HashSet<Prescription>();
        foreach (var line in visit.Lines)
        {
            // Paid lines (ServiceRequests.IsPaid) are never re-split. Their amounts still count in the visit total, so
            // an order that pushes the visit over the 15%-of-base-salary threshold re-splits only the UNPAID lines at the
            // card level, while lines already paid keep the 100% coverage they were billed with. Deliberate (R3,
            // coordinator-confirmed): a patient is never re-charged after paying. The claim built at lock time prices
            // every line with the visit-level rate (what BHXH will accept), so the co-pay not collected on those
            // early-paid lines is absorbed by the hospital rather than re-billed automatically.
            if (line.Frozen) continue;
            var r = line.Result;
            if (line.Srd != null)
            {
                line.Srd.Amount = r.Amount;
                line.Srd.InsuranceAmount = r.InsuranceAmount;
                line.Srd.PatientAmount = r.PatientAmount;
                line.Srd.InsurancePaymentRate = r.AppliedPercent;
                touchedRequests.Add(line.Sr!);
            }
            else if (line.Sr != null)
            {
                // Header-only request (no detail rows)
                line.Sr.TotalAmount = r.Amount;
                line.Sr.InsuranceAmount = r.InsuranceAmount;
                line.Sr.PatientAmount = r.PatientAmount;
            }
            else if (line.Pd != null)
            {
                line.Pd.Amount = r.Amount;
                line.Pd.InsuranceAmount = r.InsuranceAmount;
                line.Pd.PatientAmount = r.PatientAmount;
                line.Pd.InsurancePaymentRate = r.AppliedPercent;
                touchedRx.Add(line.Rx!);
            }
        }

        foreach (var sr in touchedRequests)
        {
            var details = sr.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();
            sr.InsuranceAmount = details.Sum(d => d.InsuranceAmount);
            sr.PatientAmount = details.Sum(d => d.PatientAmount);
        }
        foreach (var rx in touchedRx)
        {
            var details = rx.Details.Where(d => !d.IsDeleted).ToList();
            rx.InsuranceAmount = details.Sum(d => d.InsuranceAmount);
            rx.PatientAmount = details.Sum(d => d.PatientAmount);
        }
        return visit;
    }

    /// <summary>Price every live line of the record (tracked entities). Null when the record does not exist or is not BHYT.</summary>
    public async Task<BhytPricedVisit?> PriceAsync(Guid medicalRecordId, bool includeBeds, CancellationToken ct = default)
    {
        var mr = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == medicalRecordId && !m.IsDeleted, ct);
        if (mr == null || mr.PatientType != 1) return null;

        // R3 review B9: most BHYT records keep the card only on Patients (631/655 locally) — fall back to it.
        var patientCard = await _db.Patients.AsNoTracking()
            .Where(p => p.Id == mr.PatientId)
            .Select(p => new { p.InsuranceNumber, p.InsuranceExpireDate })
            .FirstOrDefaultAsync(ct);
        string? cardNumber = null;
        DateTime? cardExpiry = null;
        if (BhytCardNumber.TryValidate(mr.InsuranceNumber, out var mrCard, out _))
        {
            cardNumber = mr.InsuranceNumber;
            cardExpiry = mr.InsuranceExpireDate
                         ?? (BhytCardNumber.TryValidate(patientCard?.InsuranceNumber, out var pc, out _)
                             && BhytCardNumber.CoreOf(pc) == BhytCardNumber.CoreOf(mrCard) ? patientCard!.InsuranceExpireDate : null);
        }
        else if (BhytCardNumber.TryValidate(patientCard?.InsuranceNumber, out _, out _))
        {
            cardNumber = patientCard!.InsuranceNumber;
            cardExpiry = patientCard.InsuranceExpireDate ?? mr.InsuranceExpireDate;
        }
        var cardValid = cardNumber != null;
        var expiry = cardExpiry?.Date;
        bool CardCovers(DateTime date) => cardValid && (expiry == null || date.Date <= expiry.Value);

        var requests = await _db.ServiceRequests
            .Include(r => r.Service)
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .Where(r => r.MedicalRecordId == medicalRecordId && !r.IsDeleted && r.Status != 4)
            .ToListAsync(ct);
        // R3 review B6: same billable-prescription filter as the cashier ledger — no drafts, cancelled or returned
        // prescriptions, no return orders (DrugOrderType 3), nothing sold through the retail POS.
        var prescriptions = await _db.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => p.MedicalRecordId == medicalRecordId && !p.IsDeleted
                        && InvoiceLedger.BillableRxStatuses.Contains(p.Status)
                        && p.DrugOrderType != 3
                        && !_db.RetailSales.Any(s => s.PrescriptionId == p.Id && s.Status != "Cancelled" && !s.IsDeleted))
            .ToListAsync(ct);

        // Lines already paid through the cashier (active payment ReceiptDetail) are never re-split (R3 review B6).
        var allocated = await _db.ReceiptDetails.AsNoTracking()
            .Where(rd => !rd.IsDeleted && rd.Receipt.Status == 1 && !rd.Receipt.IsDeleted
                         && rd.Receipt.ReceiptType == 2 && rd.Receipt.MedicalRecordId == medicalRecordId)
            .Select(rd => new { rd.ServiceRequestDetailId, rd.PrescriptionDetailId, rd.ItemType, rd.ItemCode })
            .ToListAsync(ct);
        var paidSrd = allocated.Where(a => a.ServiceRequestDetailId != null).Select(a => a.ServiceRequestDetailId!.Value).ToHashSet();
        var paidPd = allocated.Where(a => a.PrescriptionDetailId != null).Select(a => a.PrescriptionDetailId!.Value).ToHashSet();
        var paidHeader = allocated
            .Where(a => a.ItemType == InvoiceLedger.ItemService && a.ServiceRequestDetailId == null && Guid.TryParse(a.ItemCode, out _))
            .Select(a => Guid.Parse(a.ItemCode!)).ToHashSet();

        var serviceIds = requests.SelectMany(r => r.Details.Select(d => d.ServiceId))
            .Concat(requests.Where(r => r.ServiceId.HasValue).Select(r => r.ServiceId!.Value)).Distinct().ToList();
        var medicineIds = prescriptions.SelectMany(p => p.Details.Select(d => d.MedicineId)).Distinct().ToList();
        var priceConfigs = (serviceIds.Count + medicineIds.Count) == 0
            ? new List<InsurancePriceConfig>()
            : await _db.InsurancePriceConfigs.AsNoTracking()
                .Where(c => !c.IsDeleted
                            && ((c.ServiceId != null && serviceIds.Contains(c.ServiceId.Value))
                                || (c.MedicineId != null && medicineIds.Contains(c.MedicineId.Value))))
                .ToListAsync(ct);

        InsurancePriceConfig? ConfigFor(Guid? serviceId, Guid? medicineId, DateTime date) => priceConfigs
            .Where(c => (serviceId != null && c.ServiceId == serviceId) || (medicineId != null && c.MedicineId == medicineId))
            .Where(c => c.EffectiveFrom.Date <= date.Date && (c.EffectiveTo == null || c.EffectiveTo.Value.Date >= date.Date))
            .Where(c => c.IsActive || c.EffectiveTo != null) // a closed historical version still prices its own period
            .OrderByDescending(c => c.EffectiveFrom)
            .FirstOrDefault();

        var lines = new List<BhytPricedLine>();

        foreach (var sr in requests)
        {
            var details = sr.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();
            var date = sr.RequestDate == default ? mr.AdmissionDate : sr.RequestDate;
            if (details.Count == 0)
            {
                if (sr.Service == null) continue;
                lines.Add(ServiceLine(sr.Service, sr.Quantity, sr.UnitPrice, selfPay: false, date, sr, null, sr.IsPaid || paidHeader.Contains(sr.Id)));
                continue;
            }
            foreach (var d in details)
            {
                if (d.Service == null) continue;
                // PatientType on the line: 2 viện phí / 3 dịch vụ = doctor/patient chose self-pay for this item.
                lines.Add(ServiceLine(d.Service, d.Quantity, d.UnitPrice, d.PatientType is 2 or 3, date, sr, d, sr.IsPaid || paidSrd.Contains(d.Id)));
            }
        }

        foreach (var rx in prescriptions)
        {
            var date = rx.PrescriptionDate == default ? mr.AdmissionDate : rx.PrescriptionDate;
            var rxSelfPay = rx.PaymentCategory is 2 or 3; // 2 thu phí · 3 thuốc ngoài
            foreach (var d in rx.Details.Where(d => !d.IsDeleted && d.Status != 2)) // line status 2 = returned
            {
                if (d.Medicine == null) continue;
                var cfg = ConfigFor(null, d.MedicineId, date);
                var covered = !rxSelfPay && d.PatientType is not (2 or 3) && CardCovers(date)
                              && (cfg != null || d.Medicine.IsInsuranceCovered);
                lines.Add(new BhytPricedLine
                {
                    ItemType = 2,
                    MedicineId = d.MedicineId,
                    ItemCode = cfg?.ItemCode is { Length: > 0 } c ? c : (d.Medicine.MedicineCodeBYT ?? d.Medicine.MedicineCode),
                    ItemName = d.Medicine.MedicineName,
                    Unit = d.Unit ?? d.Medicine.Unit,
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    ItemPaymentRate = cfg?.PaymentRate ?? d.Medicine.InsurancePaymentRate,
                    IsInsuranceCovered = covered,
                    ServiceDate = date,
                    Pd = d,
                    Rx = rx,
                    Frozen = rx.IsPaid || paidPd.Contains(d.Id),
                    Result = null!,
                    InsurancePrice = cfg?.InsurancePrice ?? d.Medicine.InsurancePrice,
                });
            }
        }

        if (includeBeds && mr.TreatmentType == 2)
            lines.AddRange(await BedLinesAsync(mr, CardCovers, ct));

        var ctx = await BuildContextAsync(mr, ct, cardNumber);
        var result = BhytCoverageCalculator.Calculate(ctx, lines.Select(l => new BhytLineInput
        {
            UnitPrice = l.UnitPrice,
            Quantity = l.Quantity,
            InsurancePrice = l.InsurancePrice,
            IsCovered = l.IsInsuranceCovered,
            ItemPaymentRatePercent = l.ItemPaymentRate,
        }).ToList());
        for (var i = 0; i < lines.Count; i++) lines[i].Result = result.Lines[i];

        if (!cardValid)
            result = WithWarning(result, "Không tìm thấy số thẻ BHYT hợp lệ trên hồ sơ lẫn thông tin bệnh nhân — giữ nguyên phần BHYT đã tính, không tạo hồ sơ giám định.");

        return new BhytPricedVisit
        {
            MedicalRecord = mr, IsInsured = cardValid, CardNumber = cardNumber, CardExpireDate = cardExpiry,
            Result = result, Lines = lines,
        };

        BhytPricedLine ServiceLine(Service svc, int qty, decimal unitPrice, bool selfPay, DateTime date,
            ServiceRequest sr, ServiceRequestDetail? d, bool frozen)
        {
            var cfg = ConfigFor(svc.Id, null, date);
            var covered = !selfPay && CardCovers(date) && (cfg != null || svc.IsInsuranceCovered);
            return new BhytPricedLine
            {
                ItemType = 1,
                ServiceId = svc.Id,
                ItemCode = cfg?.ItemCode is { Length: > 0 } c ? c : (svc.ServiceCodeBHYT ?? svc.ServiceCode),
                ItemName = svc.ServiceName,
                Unit = svc.Unit,
                Quantity = qty,
                UnitPrice = unitPrice,
                ItemPaymentRate = cfg?.PaymentRate ?? svc.InsurancePaymentRate,
                IsInsuranceCovered = covered,
                ServiceDate = date,
                Sr = sr,
                Srd = d,
                Frozen = frozen,
                Result = null!,
                InsurancePrice = cfg?.InsurancePrice ?? svc.InsurancePrice,
            };
        }
    }

    /// <summary>
    /// Bed-day lines of the record, counted exactly like <see cref="InvoiceLedger"/> (<see cref="InvoiceLedger.ComputeBedDays"/>;
    /// a stay ends at discharge, at the last update of a closed admission, or now while active) so the claim and the
    /// cashier see the same days. Public contract for billing: call <see cref="PriceAsync"/> with includeBeds = true and
    /// read the ItemType 4 lines (<see cref="BhytPricedLine.BedAssignmentId"/> = the ledger's bed ChargeLine id).
    /// </summary>
    private async Task<List<BhytPricedLine>> BedLinesAsync(MedicalRecord mr, Func<DateTime, bool> cardCovers, CancellationToken ct)
    {
        var assignments = await _db.BedAssignments.AsNoTracking()
            .Include(b => b.Bed)
            .Where(b => !b.IsDeleted && b.Admission.MedicalRecordId == mr.Id)
            .OrderBy(b => b.AssignedAt)
            .ToListAsync(ct);
        var lines = new List<BhytPricedLine>();
        if (assignments.Count == 0) return lines;

        var now = DateTime.Now;
        var admissionIds = assignments.Select(a => a.AdmissionId).Distinct().ToList();
        var admissions = await _db.Admissions.AsNoTracking()
            .Where(a => admissionIds.Contains(a.Id))
            .Select(a => new { a.Id, a.Status, a.UpdatedAt })
            .ToDictionaryAsync(a => a.Id, ct);
        var discharges = await _db.Discharges.AsNoTracking()
            .Where(d => admissionIds.Contains(d.AdmissionId) && !d.IsDeleted)
            .Select(d => new { d.AdmissionId, d.DischargeDate })
            .ToListAsync(ct);

        // Same merge as InvoiceLedger (QA-R3 review B4): clamp each assignment to its admission's end, then merge across
        // ALL admissions of the record so duplicate admissions with open beds never bill the fund for a night twice.
        DateTime AdmissionEnd(Guid admissionId)
        {
            admissions.TryGetValue(admissionId, out var adm);
            var active = adm == null || adm.Status is 0 or 6;
            return discharges.Where(d => d.AdmissionId == admissionId).Select(d => (DateTime?)d.DischargeDate).FirstOrDefault()
                   ?? (active ? now : (mr.DischargeDate ?? adm!.UpdatedAt ?? now));
        }
        {
            var list = assignments;
            var clamped = list.Select(a =>
            {
                var admEnd = AdmissionEnd(a.AdmissionId);
                var end = a.ReleasedAt.HasValue && a.ReleasedAt.Value < admEnd ? a.ReleasedAt.Value : admEnd;
                return (a.AssignedAt, (DateTime?)end);
            }).ToList();
            var days = InvoiceLedger.ComputeBedDays(clamped, clamped.Max(c => c.Item2!.Value));
            for (var i = 0; i < list.Count; i++)
            {
                var a = list[i];
                if (a.Bed == null || a.Bed.DailyPrice <= 0 || days[i] <= 0) continue;
                lines.Add(new BhytPricedLine
                {
                    ItemType = 4,
                    BedAssignmentId = a.Id,
                    ItemCode = a.Bed.BedCode,
                    ItemName = $"Ngày giường {a.Bed.BedName}",
                    Unit = "Ngày",
                    Quantity = days[i],
                    UnitPrice = a.Bed.DailyPrice,
                    ItemPaymentRate = 100,
                    // BedType 2 = giường dịch vụ theo yêu cầu — not paid by the fund.
                    IsInsuranceCovered = a.Bed.BedType != 2 && cardCovers(a.AssignedAt),
                    ServiceDate = a.AssignedAt,
                    Frozen = true,
                    Result = null!,
                });
            }
        }
        return lines;
    }

    /// <summary>
    /// Payment ceiling for ONE technical service (DVKT): SystemConfigs "BHYT.CostCeiling" (VND) when set, otherwise
    /// 40 × lương cơ sở (NĐ 146/2018 art.14 — DVKT cao chi phí lớn, mỗi lần sử dụng).
    /// </summary>
    public async Task<decimal> CostCeilingAsync(CancellationToken ct = default)
    {
        var rows = await _db.SystemConfigs.AsNoTracking()
            .Where(c => (c.ConfigKey == CostCeilingKey || c.ConfigKey == BaseSalaryKey) && c.IsActive && !c.IsDeleted)
            .Select(c => new { c.ConfigKey, c.ConfigValue })
            .ToListAsync(ct);
        decimal Parse(string key) => decimal.TryParse(rows.FirstOrDefault(r => r.ConfigKey == key)?.ConfigValue,
            System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var v) && v > 0 ? v : 0;
        var ceiling = Parse(CostCeilingKey);
        if (ceiling > 0) return ceiling;
        var salary = Parse(BaseSalaryKey);
        return 40 * (salary > 0 ? salary : BhytCoverageCalculator.DefaultBaseSalary);
    }

    /// <summary>Claim lines (services/supplies) whose amount is above the per-service ceiling, with the excess.</summary>
    public static List<(InsuranceClaimDetail Line, decimal Excess)> LinesOverCeiling(IEnumerable<InsuranceClaimDetail> details, decimal ceiling)
        => details.Where(d => !d.IsDeleted && d.ItemType != 2 && d.IsInsuranceCovered && d.Amount > ceiling)
            .Select(d => (d, d.Amount - ceiling))
            .ToList();

    public async Task<BhytVisitContext> BuildContextAsync(MedicalRecord mr, CancellationToken ct = default, string? cardNumber = null)
    {
        var configs = await _db.SystemConfigs.AsNoTracking()
            .Where(c => (c.ConfigKey == HospitalLevelKey || c.ConfigKey == BaseSalaryKey) && c.IsActive && !c.IsDeleted)
            .Select(c => new { c.ConfigKey, c.ConfigValue })
            .ToListAsync(ct);
        int? level = int.TryParse(configs.FirstOrDefault(c => c.ConfigKey == HospitalLevelKey)?.ConfigValue, out var lv)
                     && lv is >= 1 and <= 4 ? lv : null;
        var salary = decimal.TryParse(configs.FirstOrDefault(c => c.ConfigKey == BaseSalaryKey)?.ConfigValue,
            System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var s) && s > 0
            ? s : BhytCoverageCalculator.DefaultBaseSalary;

        return new BhytVisitContext
        {
            BenefitPercent = BhytCoverageCalculator.ResolveBenefitPercent(mr.InsuranceCoverageRate, cardNumber ?? mr.InsuranceNumber),
            Route = mr.InsuranceRightRoute,
            HasReferral = !string.IsNullOrWhiteSpace(mr.ReferralFromFacilityCode),
            IsEmergency = mr.TreatmentType == 3,
            IsInpatient = mr.TreatmentType == 2,
            HospitalLevel = level,
            BaseSalary = salary,
        };
    }

    private static BhytVisitResult WithWarning(BhytVisitResult r, string warning) => new()
    {
        Lines = r.Lines,
        BenefitPercent = r.BenefitPercent,
        RouteFactorPercent = r.RouteFactorPercent,
        EffectivePercent = r.EffectivePercent,
        BelowFifteenPercentThreshold = r.BelowFifteenPercentThreshold,
        Warnings = r.Warnings.Append(warning).ToList(),
    };
}
