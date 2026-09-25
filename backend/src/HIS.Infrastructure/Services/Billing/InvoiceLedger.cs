using Microsoft.EntityFrameworkCore;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA-R3 (r3-billing): the ONE place that decides what a medical record owes the cashier.
/// <para>
/// Before this, the v2 cashier could only collect what outpatient dispensing had pushed into
/// <see cref="InvoiceSummary"/> (medicines only): service fees had no invoice, inpatient medicines were
/// never billed, bed days were ignored and the pre-discharge check only summed ServiceRequests.
/// </para>
/// <para><b>Charges</b> (patient share, insurance is NOT computed here — the order writers own
/// InsuranceAmount/PatientAmount): non-cancelled ServiceRequestDetails (or the request header when it has no
/// detail), billable prescription lines (OPD + IPD, dispensed or not; not draft/cancelled/returned, not a
/// return order, not sold through the retail POS), and bed days (Beds.DailyPrice × nights of the stay).</para>
/// <para><b>Paid</b> = payment receipts on the record net of paid-out refunds. Items flagged paid by a channel
/// outside this ledger (per-order QR, kiosk, prescription QR — flag set, no ReceiptDetail) are excluded from
/// the charges, and the receipts of those channels (plus deposit QR receipts, counted when the deposit is
/// spent) are excluded from paid, so both sides count the same money.</para>
/// <para>Invoice columns: TotalAmount = patient payable (what payments are checked against), category totals
/// and InsuranceAmount are gross, PatientCoPayment = patient share of insured lines, OutOfPocket = patient
/// share of lines without insurance.</para>
/// </summary>
public static class InvoiceLedger
{
    public const int ItemService = 1;
    public const int ItemMedicine = 2;
    public const int ItemBed = 4;

    /// <summary>Prescription statuses that are real, billable orders: pending, approved, dispensed, partially dispensed.</summary>
    public static readonly int[] BillableRxStatuses = // shared with BhytVisitPricing (R3 BHYT)
    {
        PrescriptionStatus.PendingApproval, PrescriptionStatus.Approved,
        PrescriptionStatus.Dispensed, PrescriptionStatus.PartialDispensed,
    };

    /// <summary>Gateway reference types that pay outside the invoice ledger (their receipts are not invoice money).</summary>
    private static readonly string[] OutOfLedgerRefTypes = { "service-request", "kiosk", "prescription", "deposit" };

    public sealed class ChargeLine
    {
        public int ItemType { get; init; }
        /// <summary>ServiceRequestDetail id (or ServiceRequest id when header-only) / PrescriptionDetail id / BedAssignment id.</summary>
        public Guid Id { get; init; }
        /// <summary>ServiceRequest id / Prescription id / Admission id.</summary>
        public Guid ParentId { get; init; }
        public bool IsHeaderOnly { get; init; }
        /// <summary>QA-R12: ward-cabinet issue line (Id = ExportReceiptDetail id, ParentId = ExportReceipt id).</summary>
        public bool IsCabinet { get; init; }
        public Guid ItemRefId { get; init; } // ServiceId / MedicineId / BedId
        public string Code { get; init; } = string.Empty;
        public string Name { get; init; } = string.Empty;
        public string? Unit { get; init; }
        public decimal Quantity { get; init; }
        public decimal UnitPrice { get; init; }
        public decimal Amount { get; init; }
        public decimal InsuranceAmount { get; init; }
        public decimal PatientAmount { get; init; }
        public decimal InsuranceRate { get; init; }
        public int PaymentObject { get; init; }
        /// <summary>Paid through this ledger (active ReceiptDetail, or bed money already allocated).</summary>
        public bool IsPaid { get; set; }
        public Guid? OrderDepartmentId { get; init; }
        public string? OrderDepartmentName { get; init; }
        public Guid? ExecuteDepartmentId { get; init; }
        public string? ExecuteDepartmentName { get; init; }
        public string? ActiveIngredient { get; init; }
        public DateTime OrderedAt { get; init; }
        public DateTime? ExecutedAt { get; init; }
        public DateTime? FromDate { get; init; }
        public DateTime? ToDate { get; init; }
        public int Days { get; init; }
        public string? RoomName { get; init; }
    }

    public sealed class ChargeSet
    {
        public Guid MedicalRecordId { get; init; }
        public List<ChargeLine> Services { get; } = new();
        public List<ChargeLine> Medicines { get; } = new();
        public List<ChargeLine> Beds { get; } = new();
        /// <summary>Bed money already allocated by ReceiptDetails (ItemType 4) on this record.</summary>
        public decimal BedPaidAmount { get; set; }
        /// <summary>QA-R12: things the cashier must know that the ledger cannot settle by itself (with the amounts).</summary>
        public List<string> Warnings { get; } = new();

        public IEnumerable<ChargeLine> All => Services.Concat(Medicines).Concat(Beds);
        public decimal ServiceGross => Services.Sum(l => l.Amount);
        public decimal MedicineGross => Medicines.Sum(l => l.Amount);
        public decimal BedGross => Beds.Sum(l => l.Amount);
        public decimal InsuranceTotal => All.Sum(l => l.InsuranceAmount);
        public decimal PatientTotal => All.Sum(l => l.PatientAmount);
        public decimal BedPatientTotal => Beds.Sum(l => l.PatientAmount);
        public decimal UnpaidBedAmount => Math.Max(0, BedPatientTotal - BedPaidAmount);
    }

    /// <summary>Patient share of a priced line: rows that never had the insurance split (both 0) are fully patient-paid.</summary>
    public static decimal PatientShare(decimal amount, decimal insuranceAmount, decimal patientAmount)
        => patientAmount == 0 && insuranceAmount == 0 ? amount : patientAmount;

    // ── QA-R12 billing switches (SystemConfigs, seeded by the r12-money migration) ──────────────────────
    /// <summary>Off by default (also when the row is missing) = bill as prescribed + cashier warning. On: an UNPAID medicine line is billed for what the patient
    /// actually kept — min(prescribed, dispensed) once the line was issued, minus approved patient returns. Paid lines
    /// are never re-priced; the difference is shown to the cashier as a refund suggestion.</summary>
    public const string BillDispensedQuantityKey = "Billing.BillDispensedQuantity";
    /// <summary>Off (default): ward-cabinet issues (ExportType 12) are NOT charged, the cashier sees the unbilled amount.
    /// On: they become medicine charge lines (catalog price, BHYT split from BhytVisitPricing).</summary>
    public const string BillCabinetIssuesKey = "Billing.BillCabinetIssues";
    /// <summary>Off (default): bed nights after the BHYT card expired stay BHYT-covered, the cashier sees the amount.
    /// On: BhytVisitPricing splits the bed line at the card expiry date.</summary>
    public const string SplitBedDaysAtCardExpiryKey = "Billing.SplitBedDaysAtCardExpiry";

    public sealed record BillingSwitches(bool BillDispensedQuantity, bool BillCabinetIssues, bool SplitBedDaysAtCardExpiry);

    /// <summary>Reads the QA-R12 switches in one query. On = "On"/"true"/"1", Off = "Off"/"false"/"0", else the default.</summary>
    public static async Task<BillingSwitches> SwitchesAsync(HISDbContext db)
    {
        var rows = await db.SystemConfigs.AsNoTracking()
            .Where(c => (c.ConfigKey == BillDispensedQuantityKey || c.ConfigKey == BillCabinetIssuesKey
                         || c.ConfigKey == SplitBedDaysAtCardExpiryKey) && c.IsActive && !c.IsDeleted)
            .Select(c => new { c.ConfigKey, c.ConfigValue })
            .ToListAsync();
        bool Read(string key, bool whenMissing) => ParseSwitch(rows.FirstOrDefault(r => r.ConfigKey == key)?.ConfigValue, whenMissing);
        return new BillingSwitches(Read(BillDispensedQuantityKey, false), Read(BillCabinetIssuesKey, false),
            Read(SplitBedDaysAtCardExpiryKey, false));
    }

    /// <summary>"On"/"true"/"1"/"yes" → true, "Off"/"false"/"0"/"no" → false, anything else → <paramref name="whenMissing"/>.</summary>
    public static bool ParseSwitch(string? value, bool whenMissing) => value?.Trim().ToLowerInvariant() switch
    {
        "on" or "true" or "1" or "yes" => true,
        "off" or "false" or "0" or "no" => false,
        _ => whenMissing,
    };

    /// <summary>
    /// QA-R12: quantity of a medicine line the patient is billed for. Before the line is issued from stock the
    /// prescription is the charge (OPD collects before dispensing). Once issued: what was handed over (never more than
    /// prescribed) minus what the patient returned (approved return), never below 0.
    /// </summary>
    public static decimal BillableQuantity(decimal prescribed, decimal dispensed, bool issued, decimal returned)
    {
        if (!issued) return prescribed;
        var kept = Math.Min(prescribed, Math.Max(0, dispensed)) - Math.Max(0, returned);
        return Math.Max(0, kept);
    }

    /// <summary>
    /// QA-R12: of <paramref name="days"/> bed nights starting on <paramref name="start"/> (night k = start.Date + k), how many
    /// fall on or before the card expiry date (a card is valid through its expiry day). No expiry = all covered.
    /// </summary>
    public static int CoveredBedNights(DateTime start, int days, DateTime? cardExpiry)
    {
        if (days <= 0) return 0;
        if (cardExpiry == null) return days;
        var covered = (cardExpiry.Value.Date - start.Date).Days + 1;
        return Math.Clamp(covered, 0, days);
    }

    /// <summary>
    /// QA-R12: spread a returned quantity over issued rows ordered latest first (same order the stock return uses),
    /// each row taking at most its remaining capacity. Returns the quantity taken per row (aligned with the input).
    /// </summary>
    public static decimal[] AllocateLatestFirst(IReadOnlyList<decimal> capacityLatestFirst, decimal quantity)
    {
        var taken = new decimal[capacityLatestFirst.Count];
        var left = Math.Max(0, quantity);
        for (var i = 0; i < taken.Length && left > 0; i++)
        {
            var t = Math.Min(Math.Max(0, capacityLatestFirst[i]), left);
            taken[i] = t;
            left -= t;
        }
        return taken;
    }

    /// <summary>A copy of a priced line billed for <paramref name="quantity"/> instead of its own quantity (amounts pro rata).</summary>
    internal static ChargeLine Rescaled(ChargeLine l, decimal quantity)
    {
        var f = l.Quantity > 0 ? quantity / l.Quantity : 0m;
        return new ChargeLine
        {
            ItemType = l.ItemType, Id = l.Id, ParentId = l.ParentId, IsHeaderOnly = l.IsHeaderOnly, IsCabinet = l.IsCabinet,
            ItemRefId = l.ItemRefId, Code = l.Code, Name = l.Name, Unit = l.Unit,
            Quantity = quantity, UnitPrice = l.UnitPrice,
            Amount = Math.Round(l.Amount * f, 2), InsuranceAmount = Math.Round(l.InsuranceAmount * f, 2),
            PatientAmount = Math.Round(l.PatientAmount * f, 2),
            InsuranceRate = l.InsuranceRate, PaymentObject = l.PaymentObject, IsPaid = l.IsPaid,
            OrderDepartmentId = l.OrderDepartmentId, OrderDepartmentName = l.OrderDepartmentName,
            ExecuteDepartmentId = l.ExecuteDepartmentId, ExecuteDepartmentName = l.ExecuteDepartmentName,
            ActiveIngredient = l.ActiveIngredient, OrderedAt = l.OrderedAt, ExecutedAt = l.ExecutedAt,
            FromDate = l.FromDate, ToDate = l.ToDate, Days = l.Days, RoomName = l.RoomName,
        };
    }

    private static string Money(decimal v) => v.ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("vi-VN")) + " đ";
    private static string Qty(decimal v) => v.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture);

    /// <summary>
    /// Bed days per assignment of ONE admission = nights on that bed (calendar days between assignment and its
    /// effective end). Effective end = release time, but never after <paramref name="stayEnd"/> (discharge date, or
    /// "now" only while the admission is active) and never after the next assignment starts — an assignment left
    /// open by a transfer or a missed release must not keep charging, and overlapping assignments never charge the
    /// same night twice. A stay with no full night but at least 4 hours on beds is charged one day, on its longest
    /// assignment. Result is aligned with the input order.
    /// </summary>
    public static int[] ComputeBedDays(IReadOnlyList<(DateTime Start, DateTime? End)> stays, DateTime stayEnd)
    {
        var days = new int[stays.Count];
        var hours = new double[stays.Count];
        var order = Enumerable.Range(0, stays.Count).OrderBy(i => stays[i].Start).ThenBy(i => i).ToArray();
        for (var k = 0; k < order.Length; k++)
        {
            var i = order[k];
            var start = stays[i].Start;
            var end = stays[i].End ?? stayEnd;
            if (end > stayEnd) end = stayEnd;
            if (k + 1 < order.Length && stays[order[k + 1]].Start < end) end = stays[order[k + 1]].Start;
            if (end < start) end = start;
            days[i] = Math.Max(0, (end.Date - start.Date).Days);
            hours[i] = (end - start).TotalHours;
        }
        if (stays.Count > 0 && days.Sum() == 0 && hours.Sum() >= 4)
            days[Array.IndexOf(hours, hours.Max())] = 1;
        return days;
    }

    public static async Task<ChargeSet> LoadAsync(HISDbContext db, Guid medicalRecordId)
    {
        var set = new ChargeSet { MedicalRecordId = medicalRecordId };
        var sw = await SwitchesAsync(db); // QA-R12
        var record = await db.MedicalRecords.AsNoTracking()
            .Where(m => m.Id == medicalRecordId)
            .Select(m => new { m.PatientId, m.PatientType, m.TreatmentType })
            .FirstOrDefaultAsync();

        var allocated = await db.ReceiptDetails.AsNoTracking()
            .Where(rd => !rd.IsDeleted && rd.Receipt.Status == 1 && !rd.Receipt.IsDeleted
                         && rd.Receipt.ReceiptType == 2 && rd.Receipt.MedicalRecordId == medicalRecordId)
            .Select(rd => new { rd.ServiceRequestDetailId, rd.PrescriptionDetailId, rd.ItemType, rd.ItemCode, rd.FinalAmount, rd.Quantity })
            .ToListAsync();
        var paidSrd = allocated.Where(a => a.ServiceRequestDetailId != null).Select(a => a.ServiceRequestDetailId!.Value).ToHashSet();
        var paidPd = allocated.Where(a => a.PrescriptionDetailId != null).Select(a => a.PrescriptionDetailId!.Value).ToHashSet();
        // QA-R12: quantity each medicine line was collected for (a line paid after a partial dispense was collected for less).
        var paidQtyPd = allocated.Where(a => a.PrescriptionDetailId != null)
            .GroupBy(a => a.PrescriptionDetailId!.Value).ToDictionary(g => g.Key, g => g.Max(x => x.Quantity));
        // QA-R12: a ward-cabinet line has no PrescriptionDetail — its ReceiptDetail carries the ExportReceiptDetail id in ItemCode.
        var paidCabinet = allocated.Where(a => a.ItemType == ItemMedicine && a.PrescriptionDetailId == null && Guid.TryParse(a.ItemCode, out _))
            .GroupBy(a => Guid.Parse(a.ItemCode!)).ToDictionary(g => g.Key, g => g.Max(x => x.Quantity));
        // Header-only service requests have no detail id: their ReceiptDetail carries the request id in ItemCode.
        var paidHeader = allocated.Where(a => a.ItemType == ItemService && a.ServiceRequestDetailId == null && Guid.TryParse(a.ItemCode, out _))
            .Select(a => Guid.Parse(a.ItemCode!)).ToHashSet();
        set.BedPaidAmount = allocated.Where(a => a.ItemType == ItemBed).Sum(a => a.FinalAmount);

        // ── Services ────────────────────────────────────────────────────────────────
        var requests = await db.ServiceRequests.AsNoTracking()
            .Include(r => r.Department)
            .Include(r => r.ExecuteDepartment)
            .Include(r => r.Service)
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .Where(r => r.MedicalRecordId == medicalRecordId && !r.IsDeleted && r.Status != 4)
            .OrderBy(r => r.RequestDate)
            .ToListAsync();
        foreach (var r in requests)
        {
            var details = r.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();
            if (r.Details.Count > 0)
            {
                foreach (var d in details)
                {
                    var paidHere = paidSrd.Contains(d.Id);
                    if (r.IsPaid && !paidHere) continue; // paid outside the ledger (QR/kiosk)
                    var amount = d.Amount != 0 ? d.Amount : d.Quantity * d.UnitPrice;
                    set.Services.Add(new ChargeLine
                    {
                        ItemType = ItemService, Id = d.Id, ParentId = r.Id, ItemRefId = d.ServiceId,
                        Code = d.Service?.ServiceCode ?? string.Empty, Name = d.Service?.ServiceName ?? string.Empty,
                        Quantity = d.Quantity, UnitPrice = d.UnitPrice, Amount = amount,
                        InsuranceAmount = d.InsuranceAmount,
                        PatientAmount = PatientShare(amount, d.InsuranceAmount, d.PatientAmount),
                        InsuranceRate = d.InsurancePaymentRate, PaymentObject = d.PatientType,
                        IsPaid = paidHere,
                        OrderDepartmentId = r.DepartmentId, OrderDepartmentName = r.Department?.DepartmentName,
                        ExecuteDepartmentId = r.ExecuteDepartmentId, ExecuteDepartmentName = r.ExecuteDepartment?.DepartmentName,
                        OrderedAt = r.RequestDate, ExecutedAt = d.ResultDate,
                    });
                }
            }
            else
            {
                var paidHere = paidHeader.Contains(r.Id);
                if (r.IsPaid && !paidHere) continue;
                var amount = r.TotalAmount != 0 ? r.TotalAmount : (r.TotalPrice != 0 ? r.TotalPrice : r.Quantity * r.UnitPrice);
                set.Services.Add(new ChargeLine
                {
                    ItemType = ItemService, Id = r.Id, ParentId = r.Id, IsHeaderOnly = true, ItemRefId = r.ServiceId ?? Guid.Empty,
                    Code = r.Service?.ServiceCode ?? string.Empty, Name = r.Service?.ServiceName ?? string.Empty,
                    Quantity = r.Quantity, UnitPrice = r.UnitPrice, Amount = amount,
                    InsuranceAmount = r.InsuranceAmount,
                    PatientAmount = PatientShare(amount, r.InsuranceAmount, r.PatientAmount),
                    IsPaid = paidHere,
                    OrderDepartmentId = r.DepartmentId, OrderDepartmentName = r.Department?.DepartmentName,
                    ExecuteDepartmentId = r.ExecuteDepartmentId, ExecuteDepartmentName = r.ExecuteDepartment?.DepartmentName,
                    OrderedAt = r.RequestDate,
                });
            }
        }

        // ── Medicines (OPD + IPD, dispensed or not) ─────────────────────────────────
        var prescriptions = await db.Prescriptions.AsNoTracking()
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => p.MedicalRecordId == medicalRecordId && !p.IsDeleted
                        && BillableRxStatuses.Contains(p.Status)
                        && p.DrugOrderType != 3 // return order (hoàn trả) is not a charge
                        && !db.RetailSales.Any(s => s.PrescriptionId == p.Id && s.Status != "Cancelled" && !s.IsDeleted))
            .OrderBy(p => p.PrescriptionDate)
            .ToListAsync();

        // QA-R12: approved patient returns (PharmacyApproval type 5) per line of this record.
        var returned = sw.BillDispensedQuantity && record != null
            ? await ReturnedByLineAsync(db, medicalRecordId, record.PatientId, prescriptions)
            : new Dictionary<Guid, decimal>();
        // Unpaid lines to bill for less (index into set.Medicines, billable quantity) — applied at the end, capped by
        // the money still owed so a record already collected in full is never turned into an overpayment.
        var pendingCuts = new List<(int Index, decimal Quantity)>();
        var refundHints = new List<(string Text, decimal Amount)>();
        var topUpHints = new List<(string Text, decimal Amount)>();
        var underDispensed = new List<(string Text, decimal Amount)>();

        foreach (var p in prescriptions)
        {
            foreach (var d in p.Details.Where(d => !d.IsDeleted && d.Status != 2))
            {
                var paidHere = paidPd.Contains(d.Id);
                if (p.IsPaid && !paidHere) continue; // paid outside the ledger (prescription QR)
                var amount = d.Amount != 0 ? d.Amount : d.Quantity * d.UnitPrice;
                var line = new ChargeLine
                {
                    ItemType = ItemMedicine, Id = d.Id, ParentId = p.Id, ItemRefId = d.MedicineId,
                    Code = d.Medicine?.MedicineCode ?? string.Empty, Name = d.Medicine?.MedicineName ?? string.Empty,
                    ActiveIngredient = d.Medicine?.ActiveIngredient, Unit = d.Unit ?? d.Medicine?.Unit,
                    Quantity = d.Quantity, UnitPrice = d.UnitPrice, Amount = amount,
                    InsuranceAmount = d.InsuranceAmount,
                    PatientAmount = PatientShare(amount, d.InsuranceAmount, d.PatientAmount),
                    InsuranceRate = d.InsurancePaymentRate, PaymentObject = d.PatientType,
                    IsPaid = paidHere,
                    OrderDepartmentId = p.DepartmentId,
                    OrderedAt = p.PrescriptionDate, ExecutedAt = p.DispensedAt,
                };

                // QA-R12 (partial dispense / patient return): bill what the patient kept, never re-price a paid line.
                if (sw.BillDispensedQuantity && d.Quantity > 0)
                {
                    var issued = d.Status == 1 && p.Status is PrescriptionStatus.Dispensed or PrescriptionStatus.PartialDispensed;
                    var billable = BillableQuantity(d.Quantity, d.DispensedQuantity, issued, returned.GetValueOrDefault(d.Id));
                    var unitShare = line.PatientAmount / d.Quantity;
                    if (paidHere)
                    {
                        // Collected for less than prescribed (paid after a partial dispense): the line stays at what was collected.
                        var paidQty = paidQtyPd.GetValueOrDefault(d.Id);
                        var chargedQty = paidQty > 0 && paidQty < d.Quantity ? paidQty : d.Quantity;
                        if (chargedQty < d.Quantity) line = Rescaled(line, chargedQty);
                        if (billable < chargedQty)
                            refundHints.Add(($"{line.Name}: đã thu {Qty(chargedQty)}, thực nhận {Qty(billable)}", Math.Round(unitShare * (chargedQty - billable), 0)));
                        else if (billable > chargedQty)
                            topUpHints.Add(($"{line.Name}: đã thu {Qty(chargedQty)}, nay đã cấp {Qty(billable)}", Math.Round(unitShare * (billable - chargedQty), 0)));
                    }
                    else if (billable < d.Quantity)
                        pendingCuts.Add((set.Medicines.Count, billable));
                }
                else if (!sw.BillDispensedQuantity && !paidHere && d.Quantity > 0 && d.Status == 1
                         && p.Status is PrescriptionStatus.Dispensed or PrescriptionStatus.PartialDispensed
                         && d.DispensedQuantity < d.Quantity)
                {
                    // Switch Off (default): bill as prescribed like before, but tell the cashier what was not handed out.
                    underDispensed.Add(($"{line.Name}: kê {Qty(d.Quantity)}, thực cấp {Qty(d.DispensedQuantity)}",
                        Math.Round(line.PatientAmount / d.Quantity * (d.Quantity - d.DispensedQuantity), 0)));
                }
                set.Medicines.Add(line);
            }
        }

        // ── Ward-cabinet issues (ExportType 12) — QA-R12 ────────────────────────────
        var cabinet = await db.ExportReceiptDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && d.MedicineId != null && d.Quantity > 0
                        && d.ExportReceipt.ExportType == 12 && d.ExportReceipt.Status == 1 && !d.ExportReceipt.IsDeleted
                        && d.ExportReceipt.MedicalRecordId == medicalRecordId)
            .OrderBy(d => d.ExportReceipt.ReceiptDate)
            .Select(d => new
            {
                d.Id, d.ExportReceiptId, d.ExportReceipt.ReceiptCode, d.ExportReceipt.ReceiptDate, d.ExportReceipt.ToDepartmentId,
                MedicineId = d.MedicineId!.Value, d.Quantity, d.Unit, LotPrice = d.UnitPrice,
                d.Medicine!.MedicineCode, d.Medicine.MedicineName, d.Medicine.ActiveIngredient, CatalogPrice = d.Medicine.UnitPrice,
                MedicineUnit = d.Medicine.Unit,
            })
            .ToListAsync();
        var cabinetUnbilled = 0m;
        foreach (var c in cabinet)
        {
            var price = c.CatalogPrice > 0 ? c.CatalogPrice : c.LotPrice; // same catalog price as prescription lines
            var paidHere = paidCabinet.TryGetValue(c.Id, out var paidQty);
            var kept = Math.Max(0, c.Quantity - returned.GetValueOrDefault(c.Id));
            var qty = paidHere ? paidQty : kept; // a paid line stays at what was collected
            if (paidHere && kept < paidQty)
                refundHints.Add(($"{c.MedicineName} (tủ trực {c.ReceiptCode}): đã thu {Qty(paidQty)}, thực nhận {Qty(kept)}", Math.Round(price * (paidQty - kept), 0)));
            if (!sw.BillCabinetIssues)
            {
                cabinetUnbilled += qty * price;
                continue;
            }
            if (qty <= 0) continue;
            var amount = qty * price;
            set.Medicines.Add(new ChargeLine
            {
                ItemType = ItemMedicine, Id = c.Id, ParentId = c.ExportReceiptId, IsCabinet = true, ItemRefId = c.MedicineId,
                Code = c.MedicineCode, Name = $"{c.MedicineName} (tủ trực {c.ReceiptCode})",
                ActiveIngredient = c.ActiveIngredient, Unit = c.Unit ?? c.MedicineUnit,
                Quantity = qty, UnitPrice = price, Amount = amount, PatientAmount = amount, // BHYT split below
                PaymentObject = record?.PatientType ?? 0, IsPaid = paidHere,
                OrderDepartmentId = c.ToDepartmentId, OrderedAt = c.ReceiptDate, ExecutedAt = c.ReceiptDate,
            });
        }
        if (cabinetUnbilled > 0)
            set.Warnings.Add($"Có {cabinet.Count} dòng thuốc xuất tủ trực cho hồ sơ này ({Money(cabinetUnbilled)} theo giá danh mục) "
                             + "CHƯA tính vào viện phí — kê bổ sung hoặc bật cấu hình Billing.BillCabinetIssues.");
        if (sw.BillCabinetIssues && record?.PatientType == 1 && set.Medicines.Any(l => l.IsCabinet && !l.IsPaid))
        {
            // Insured record: take the fund's share of each cabinet line from the visit pricing (like bed days).
            var visit = await new BhytVisitPricing(db).PriceAsync(medicalRecordId, includeBeds: false);
            for (var i = 0; i < set.Medicines.Count; i++)
            {
                var l = set.Medicines[i];
                if (!l.IsCabinet || l.IsPaid) continue;
                var match = visit?.Lines.FirstOrDefault(x => x.CabinetDetailId == l.Id && x.Result != null);
                if (match == null || match.Result.Amount <= 0 || match.Result.InsuranceAmount <= 0) continue;
                var insurance = Math.Min(l.Amount, Math.Round(l.Amount * match.Result.InsuranceAmount / match.Result.Amount, 0));
                set.Medicines[i] = new ChargeLine
                {
                    ItemType = l.ItemType, Id = l.Id, ParentId = l.ParentId, IsCabinet = true, ItemRefId = l.ItemRefId,
                    Code = l.Code, Name = l.Name, ActiveIngredient = l.ActiveIngredient, Unit = l.Unit,
                    Quantity = l.Quantity, UnitPrice = l.UnitPrice, Amount = l.Amount,
                    InsuranceAmount = insurance, PatientAmount = l.Amount - insurance,
                    InsuranceRate = l.Amount > 0 ? Math.Round(insurance * 100 / l.Amount, 0) : 0, PaymentObject = 1,
                    IsPaid = l.IsPaid, OrderDepartmentId = l.OrderDepartmentId, OrderedAt = l.OrderedAt, ExecutedAt = l.ExecutedAt,
                };
            }
        }

        // ── Bed days ────────────────────────────────────────────────────────────────
        var assignments = await db.BedAssignments.AsNoTracking()
            .Include(b => b.Bed).ThenInclude(b => b.Room)
            .Where(b => !b.IsDeleted && b.Admission.MedicalRecordId == medicalRecordId)
            .OrderBy(b => b.AssignedAt)
            .ToListAsync();
        if (assignments.Count > 0)
        {
            var now = DateTime.Now;
            var admissionIds = assignments.Select(a => a.AdmissionId).Distinct().ToList();
            var admissions = await db.Admissions.AsNoTracking()
                .Where(a => admissionIds.Contains(a.Id))
                .Select(a => new { a.Id, a.Status, a.UpdatedAt, a.AdmissionDate, RecordDischarge = a.MedicalRecord.DischargeDate })
                .ToDictionaryAsync(a => a.Id);
            var discharges = await db.Set<Discharge>().AsNoTracking()
                .Where(d => admissionIds.Contains(d.AdmissionId) && !d.IsDeleted)
                .Select(d => new { d.AdmissionId, d.DischargeDate })
                .ToListAsync();
            // QA-R3 review B4: each admission's stay ends at its discharge; an admission no longer active
            // (transferred/closed) ends at its last update; only an active admission runs until now. Assignments are
            // then merged across ALL admissions of the record (duplicate admissions with open beds exist) so one
            // night is never charged twice — the later assignment wins.
            DateTime AdmissionEnd(Guid admissionId)
            {
                admissions.TryGetValue(admissionId, out var adm);
                var active = adm == null || adm.Status is 0 or 6;
                return discharges.Where(d => d.AdmissionId == admissionId).Select(d => (DateTime?)d.DischargeDate).FirstOrDefault()
                       ?? (active ? now : (adm!.RecordDischarge ?? adm.UpdatedAt ?? now));
            }
            {
                var list = assignments;
                var clamped = list.Select(a =>
                {
                    var admEnd = AdmissionEnd(a.AdmissionId);
                    var end = a.ReleasedAt.HasValue && a.ReleasedAt.Value < admEnd ? a.ReleasedAt.Value : admEnd;
                    return (a.AssignedAt, (DateTime?)end);
                }).ToList();
                var days = ComputeBedDays(clamped, clamped.Max(c => c.Item2!.Value));
                for (var i = 0; i < list.Count; i++)
                {
                    var a = list[i];
                    var price = a.Bed?.DailyPrice ?? 0;
                    if (price <= 0 || days[i] <= 0) continue;
                    var amount = price * days[i];
                    set.Beds.Add(new ChargeLine
                    {
                        ItemType = ItemBed, Id = a.Id, ParentId = a.AdmissionId, ItemRefId = a.BedId,
                        Code = a.Bed?.BedCode ?? string.Empty, Name = $"Tiền giường {a.Bed?.BedCode}",
                        RoomName = a.Bed?.Room?.RoomName, Unit = "Ngày",
                        Quantity = days[i], Days = days[i], UnitPrice = price, Amount = amount,
                        PatientAmount = amount, // bed insurance split is not computed here
                        FromDate = a.AssignedAt, ToDate = a.ReleasedAt, OrderedAt = a.AssignedAt,
                    });
                }
            }
            // QA-R3 review B3: on a BHYT record the fund pays its share of covered beds (the claim bills it through
            // BhytVisitPricing) — take the split from that calculation instead of charging the patient 100%.
            if (set.Beds.Count > 0
                && await db.MedicalRecords.AnyAsync(m => m.Id == medicalRecordId && m.PatientType == 1))
            {
                var visit = await new BhytVisitPricing(db).PriceAsync(medicalRecordId, includeBeds: true);
                var bhytBeds = visit?.Lines.Where(l => l.ItemType == ItemBed && l.Result != null).ToList() ?? new();
                var expiry = visit?.CardExpireDate?.Date;
                decimal lateInsurance = 0; var lateNights = 0;
                for (var i = 0; i < set.Beds.Count; i++)
                {
                    var b = set.Beds[i];
                    // QA-R12: one assignment may be priced as two lines (split at the card expiry) — sum its lines.
                    var parts = bhytBeds.Where(l => l.BedAssignmentId == b.Id).ToList();
                    if (parts.Count == 0)
                    {
                        var single = bhytBeds.FirstOrDefault(l => l.ItemCode == b.Code && l.ServiceDate == b.FromDate)
                                     ?? bhytBeds.FirstOrDefault(l => l.ItemCode == b.Code);
                        if (single != null) parts.Add(single);
                    }
                    var partAmount = parts.Sum(l => l.Result.Amount);
                    var partInsurance = parts.Sum(l => l.Result.InsuranceAmount);
                    if (parts.Count == 0 || partAmount <= 0 || partInsurance <= 0) continue;
                    var insurance = Math.Min(b.Amount, Math.Round(b.Amount * partInsurance / partAmount, 0));
                    // QA-R12 (switch Off): nights after the card expired that the fund is still shown paying for.
                    if (!sw.SplitBedDaysAtCardExpiry && expiry != null && b.FromDate != null && b.Days > 0)
                    {
                        var after = b.Days - CoveredBedNights(b.FromDate.Value, b.Days, expiry);
                        if (after > 0) { lateNights += after; lateInsurance += Math.Round(insurance * after / b.Days, 0); }
                    }
                    set.Beds[i] = new ChargeLine
                    {
                        ItemType = b.ItemType, Id = b.Id, ParentId = b.ParentId, ItemRefId = b.ItemRefId, Code = b.Code, Name = b.Name,
                        RoomName = b.RoomName, Unit = b.Unit, Quantity = b.Quantity, Days = b.Days, UnitPrice = b.UnitPrice, Amount = b.Amount,
                        InsuranceAmount = insurance, PatientAmount = b.Amount - insurance,
                        InsuranceRate = b.Amount > 0 ? Math.Round(insurance * 100 / b.Amount, 0) : 0, PaymentObject = 1,
                        FromDate = b.FromDate, ToDate = b.ToDate, OrderedAt = b.OrderedAt,
                    };
                }
                if (lateNights > 0)
                    set.Warnings.Add($"Thẻ BHYT hết hạn {expiry:dd/MM/yyyy} trong đợt nằm viện: {lateNights} ngày giường sau ngày hết hạn "
                                     + $"vẫn đang tính BHYT chi trả ({Money(lateInsurance)}) — kiểm tra thẻ mới hoặc bật cấu hình Billing.SplitBedDaysAtCardExpiry.");
            }

            // Bed money is allocated as a running amount (a stay grows every day), oldest first.
            var left = set.BedPaidAmount;
            foreach (var b in set.Beds)
            {
                if (left >= b.PatientAmount) { b.IsPaid = true; left -= b.PatientAmount; }
                else break;
            }
        }

        await ApplyQuantityCutsAsync(db, set, pendingCuts, refundHints, topUpHints);
        if (underDispensed.Count > 0)
            set.Warnings.Add($"Thuốc cấp thiếu so với đơn nhưng vẫn tính theo SL kê (Billing.BillDispensedQuantity = Off): "
                             + $"{Money(underDispensed.Sum(u => u.Amount))} — "
                             + $"{string.Join("; ", underDispensed.Take(5).Select(u => u.Text))}{(underDispensed.Count > 5 ? "; …" : "")}.");
        if (record is { TreatmentType: 1 })
            await AddExamFeeWarningAsync(db, set, medicalRecordId);
        return set;
    }

    /// <summary>
    /// QA-R12: quantity returned by the patient per charge line of this record (PrescriptionDetail id, or ExportReceiptDetail
    /// id for a ward-cabinet issue). Approved patient returns (PharmacyApproval type 5, Status 3) carry medicine + quantity,
    /// not the line — they are spread over the issued rows latest first, exactly like PharmacyApprovalService puts the stock
    /// back (record-scoped returns over this record's rows, patient-scoped returns over all the patient's rows).
    /// </summary>
    private static async Task<Dictionary<Guid, decimal>> ReturnedByLineAsync(HISDbContext db, Guid medicalRecordId, Guid patientId,
        List<Prescription> prescriptions)
    {
        var result = new Dictionary<Guid, decimal>();
        var returns = await db.PharmacyApprovalItems.AsNoTracking()
            .Where(i => !i.IsDeleted && !i.IsExcluded && i.MedicineId != null && i.ApprovedQuantity > 0
                        && i.PharmacyApproval.ApprovalType == 5 && i.PharmacyApproval.Status == 3 && !i.PharmacyApproval.IsDeleted
                        && (i.PharmacyApproval.MedicalRecordId == medicalRecordId
                            || (i.PharmacyApproval.MedicalRecordId == null && i.PharmacyApproval.PatientId == patientId)))
            .Select(i => new { MedicineId = i.MedicineId!.Value, i.ApprovedQuantity, RecordScoped = i.PharmacyApproval.MedicalRecordId != null })
            .ToListAsync();
        if (returns.Count == 0) return result;

        var medIds = returns.Select(r => r.MedicineId).Distinct().ToList();
        var rows = await db.ExportReceiptDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && d.MedicineId != null && medIds.Contains(d.MedicineId.Value) && d.InventoryItemId != null
                        && !d.ExportReceipt.IsDeleted && d.ExportReceipt.Status == 1
                        && (d.ExportReceipt.ExportType == 1 || d.ExportReceipt.ExportType == 2 || d.ExportReceipt.ExportType == 12)
                        && (d.ExportReceipt.MedicalRecordId == medicalRecordId || d.ExportReceipt.PatientId == patientId))
            .OrderByDescending(d => d.ExportReceipt.ReceiptDate).ThenByDescending(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id, MedicineId = d.MedicineId!.Value, d.Quantity, d.ExportReceipt.ExportType, d.ExportReceipt.PrescriptionId,
                d.ExportReceipt.MedicalRecordId, d.ExportReceipt.PatientId,
            })
            .ToListAsync();
        var rxIds = prescriptions.Select(p => p.Id).ToHashSet();

        foreach (var med in medIds)
        {
            var medRows = rows.Where(r => r.MedicineId == med).ToList();
            var capacity = medRows.Select(r => r.Quantity).ToArray();
            var taken = new decimal[medRows.Count];
            void Spread(Func<int, bool> inScope, decimal qty)
            {
                var idx = Enumerable.Range(0, medRows.Count).Where(inScope).ToList();
                var got = AllocateLatestFirst(idx.Select(i => capacity[i] - taken[i]).ToList(), qty);
                for (var k = 0; k < idx.Count; k++) taken[idx[k]] += got[k];
            }
            Spread(i => medRows[i].MedicalRecordId == medicalRecordId,
                returns.Where(r => r.MedicineId == med && r.RecordScoped).Sum(r => r.ApprovedQuantity));
            Spread(i => medRows[i].PatientId == patientId,
                returns.Where(r => r.MedicineId == med && !r.RecordScoped).Sum(r => r.ApprovedQuantity));

            for (var i = 0; i < medRows.Count; i++)
            {
                if (taken[i] <= 0) continue;
                var r = medRows[i];
                if (r.ExportType == 12)
                {
                    if (r.MedicalRecordId == medicalRecordId) result[r.Id] = result.GetValueOrDefault(r.Id) + taken[i];
                    continue;
                }
                // A dispensing row → the line(s) of that medicine on its prescription (on this record), capped by what each got.
                if (r.PrescriptionId == null || !rxIds.Contains(r.PrescriptionId.Value)) continue;
                var left = taken[i];
                foreach (var d in prescriptions.First(p => p.Id == r.PrescriptionId.Value).Details
                             .Where(d => !d.IsDeleted && d.MedicineId == med).OrderBy(d => d.CreatedAt))
                {
                    if (left <= 0) break;
                    var room = Math.Max(0, d.DispensedQuantity - result.GetValueOrDefault(d.Id));
                    var t = Math.Min(room, left);
                    if (t <= 0) continue;
                    result[d.Id] = result.GetValueOrDefault(d.Id) + t;
                    left -= t;
                }
            }
        }
        return result;
    }

    /// <summary>
    /// QA-R12: bill unpaid medicine lines for what the patient kept, but only while money is still owed on the record —
    /// a cut is never allowed to push the charges below what was already collected (that part becomes a refund hint).
    /// </summary>
    private static async Task ApplyQuantityCutsAsync(HISDbContext db, ChargeSet set, List<(int Index, decimal Quantity)> cuts,
        List<(string Text, decimal Amount)> refundHints, List<(string Text, decimal Amount)> topUpHints)
    {
        if (cuts.Count > 0)
        {
            var (paid, refunded) = await PaidOnRecordAsync(db, set.MedicalRecordId);
            var discount = await db.InvoiceSummaries.AsNoTracking()
                .Where(i => i.MedicalRecordId == set.MedicalRecordId && !i.IsDeleted)
                .OrderByDescending(i => i.InvoiceDate).Select(i => (decimal?)i.DiscountAmount).FirstOrDefaultAsync() ?? 0m;
            var headroom = set.PatientTotal - discount - Math.Max(0, paid - refunded);
            var applied = new List<string>();
            decimal appliedAmount = 0;
            var drop = new HashSet<int>();
            foreach (var (index, quantity) in cuts)
            {
                var line = set.Medicines[index];
                var cut = Rescaled(line, quantity);
                var delta = line.PatientAmount - cut.PatientAmount;
                if (delta > headroom)
                {
                    refundHints.Add(($"{line.Name}: kê {Qty(line.Quantity)}, thực nhận {Qty(quantity)} (tiền đã thu trên hồ sơ)", Math.Round(delta, 0)));
                    continue;
                }
                headroom -= delta;
                appliedAmount += delta;
                applied.Add($"{line.Name} {Qty(line.Quantity)}→{Qty(quantity)}");
                if (quantity <= 0) drop.Add(index); else set.Medicines[index] = cut;
            }
            foreach (var i in drop.OrderByDescending(i => i)) set.Medicines.RemoveAt(i);
            if (applied.Count > 0)
                set.Warnings.Add($"Tiền thuốc tính theo số lượng thực cấp / đã trừ hoàn trả: {applied.Count} dòng, giảm {Money(appliedAmount)} "
                                 + $"({string.Join("; ", applied.Take(5))}{(applied.Count > 5 ? "; …" : "")}).");
        }
        if (refundHints.Count > 0)
            set.Warnings.Add($"Gợi ý hoàn tiền {Money(refundHints.Sum(h => h.Amount))}: thuốc đã thu nhưng người bệnh không nhận đủ / đã hoàn trả — "
                             + $"{string.Join("; ", refundHints.Take(5).Select(h => $"{h.Text} ({Money(h.Amount)})"))}{(refundHints.Count > 5 ? "; …" : "")}.");
        if (topUpHints.Count > 0)
            set.Warnings.Add($"Thuốc cấp bổ sung sau khi đã thu tiền, chưa thu thêm {Money(topUpHints.Sum(h => h.Amount))}: "
                             + $"{string.Join("; ", topUpHints.Take(5).Select(h => h.Text))}.");
    }

    /// <summary>
    /// QA-R12: an outpatient visit whose exam fee (dịch vụ khám, Services.ServiceType 1) was never charged — registration
    /// does not create it unless Reception.AutoExamFee = On. Tell the cashier instead of silently collecting less.
    /// </summary>
    private static async Task AddExamFeeWarningAsync(HISDbContext db, ChargeSet set, Guid medicalRecordId)
    {
        var hasExam = await db.Examinations.AsNoTracking()
            .AnyAsync(e => e.MedicalRecordId == medicalRecordId && !e.IsDeleted && e.Status != ExaminationStatus.Cancelled);
        if (!hasExam) return;
        var hasFee = await db.ServiceRequests.AsNoTracking()
            .AnyAsync(r => r.MedicalRecordId == medicalRecordId && !r.IsDeleted && r.Status != 4
                           && ((!r.Details.Any() && r.Service != null && r.Service.ServiceType == 1)
                               || r.Details.Any(d => !d.IsDeleted && d.Status != 3 && d.Service.ServiceType == 1)));
        if (!hasFee)
            set.Warnings.Add("Lượt khám chưa có công khám (tiền khám) — thêm dịch vụ khám cho lượt này trước khi thu, "
                             + "hoặc bật cấu hình Reception.AutoExamFee để tiếp đón tự tạo.");
    }

    /// <summary>Receipts of gateway channels whose money is not invoice money (see class remarks).</summary>
    public static IQueryable<Guid> OutOfLedgerReceiptIds(HISDbContext db)
        => db.PaymentTransactions
            .Where(t => t.ReceiptId != null && t.ReferenceType != null && OutOfLedgerRefTypes.Contains(t.ReferenceType))
            .Select(t => t.ReceiptId!.Value);

    /// <summary>Money collected on the record for the invoice: payment receipts minus paid-out payment refunds.</summary>
    public static async Task<(decimal Paid, decimal Refunded)> PaidOnRecordAsync(HISDbContext db, Guid medicalRecordId, Guid? excludeReceiptId = null)
    {
        var outside = OutOfLedgerReceiptIds(db);
        var paid = await db.Receipts.AsNoTracking()
            .Where(r => r.MedicalRecordId == medicalRecordId && r.ReceiptType == 2 && r.Status == 1 && !r.IsDeleted
                        && (excludeReceiptId == null || r.Id != excludeReceiptId.Value)
                        && !outside.Contains(r.Id))
            .SumAsync(r => (decimal?)r.FinalAmount) ?? 0m;
        // QA-R3 review B7: a refund of an out-of-ledger payment (per-order/kiosk/prescription QR) gives back money that
        // was never counted as paid here — subtracting it created phantom debt.
        var refunded = await db.Receipts.AsNoTracking()
            .Where(r => r.MedicalRecordId == medicalRecordId && r.ReceiptType == 3 && r.Status == RefundStatus.Paid
                        && r.OriginalPaymentId != null && !r.IsDeleted
                        && !outside.Contains(r.OriginalPaymentId.Value))
            .SumAsync(r => (decimal?)r.FinalAmount) ?? 0m;
        return (paid, refunded);
    }

    /// <summary>Unspent deposit money of the record: not cancelled, RemainingAmount minus live refunds raised on it.</summary>
    public static async Task<decimal> DepositBalanceOnRecordAsync(HISDbContext db, Guid medicalRecordId)
    {
        var deposits = await db.Deposits.AsNoTracking()
            .Where(d => d.MedicalRecordId == medicalRecordId && !d.IsDeleted && d.Status != DepositStatus.Cancelled)
            .Select(d => new { d.Id, d.RemainingAmount })
            .ToListAsync();
        if (deposits.Count == 0) return 0m;
        var ids = deposits.Select(d => d.Id).ToList();
        var refunds = await db.Receipts.AsNoTracking()
            .Where(r => r.ReceiptType == 3 && !r.IsDeleted && r.OriginalDepositId != null && ids.Contains(r.OriginalDepositId.Value)
                        && r.Status != RefundStatus.Rejected && r.Status != RefundStatus.Cancelled)
            .GroupBy(r => r.OriginalDepositId!.Value)
            .Select(g => new { g.Key, Sum = g.Sum(r => r.FinalAmount) })
            .ToDictionaryAsync(x => x.Key, x => x.Sum);
        return deposits.Sum(d => Math.Max(0m, d.RemainingAmount - (refunds.TryGetValue(d.Id, out var rf) ? rf : 0m)));
    }

    /// <summary>
    /// Recompute a (tracked) invoice from the ledger. Does not save. A settled invoice (Status 2) is frozen.
    /// </summary>
    public static async Task<ChargeSet> RefreshAsync(HISDbContext db, InvoiceSummary invoice, Guid? excludeReceiptId = null)
    {
        var set = await LoadAsync(db, invoice.MedicalRecordId);
        if (invoice.Status == 2) return set;

        var (paid, refunded) = await PaidOnRecordAsync(db, invoice.MedicalRecordId, excludeReceiptId);
        invoice.TotalServiceAmount = set.ServiceGross;
        invoice.TotalMedicineAmount = set.MedicineGross;
        invoice.TotalBedAmount = set.BedGross;
        invoice.InsuranceAmount = set.InsuranceTotal;
        invoice.PatientCoPayment = set.All.Where(l => l.InsuranceAmount > 0).Sum(l => l.PatientAmount);
        invoice.OutOfPocket = set.All.Where(l => l.InsuranceAmount == 0).Sum(l => l.PatientAmount);
        invoice.TotalAmount = set.PatientTotal;
        invoice.RefundAmount = refunded;
        invoice.PaidAmount = Math.Max(0, paid - refunded);
        invoice.RemainingAmount = Math.Max(0, invoice.TotalAmount - invoice.DiscountAmount - invoice.PaidAmount);
        invoice.Status = invoice.RemainingAmount == 0 && invoice.TotalAmount > 0 ? 1 : 0;
        invoice.UpdatedAt = DateTime.Now;
        return set;
    }

    /// <summary>
    /// Get the invoice of a record (creating it when missing) and refresh it from the ledger. Does not save.
    /// </summary>
    public static async Task<(InvoiceSummary Invoice, ChargeSet Charges)> EnsureAsync(HISDbContext db, Guid medicalRecordId, string? userId)
    {
        // QA-R6: two parallel "lập hóa đơn" on one record both found no invoice and inserted two (same code).
        // When the caller runs in a transaction, find-or-create is serialized per record.
        await SqlAppLock.AcquireAsync(db, $"HIS.Billing.Invoice.{medicalRecordId:N}",
            "Hóa đơn của hồ sơ này đang được lập ở quầy khác, vui lòng thử lại.");
        var invoice = await db.InvoiceSummaries
            .Where(i => i.MedicalRecordId == medicalRecordId && !i.IsDeleted)
            .OrderByDescending(i => i.InvoiceDate)
            .FirstOrDefaultAsync();
        if (invoice == null)
        {
            invoice = new InvoiceSummary
            {
                Id = Guid.NewGuid(),
                InvoiceCode = $"HD{DateTime.Now:yyyyMMddHHmmssfff}",
                InvoiceDate = DateTime.Now,
                MedicalRecordId = medicalRecordId,
                Status = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId,
            };
            db.InvoiceSummaries.Add(invoice);
        }
        var set = await RefreshAsync(db, invoice);
        invoice.UpdatedBy = userId;
        return (invoice, set);
    }

    /// <summary>
    /// Mark items covered by money on the invoice as paid (ReceiptDetails on <paramref name="receipt"/> +
    /// ServiceRequests.IsPaid / Prescriptions.IsPaid). Idempotent: already-paid lines are skipped.
    /// Fully paid invoice → every unpaid line. Otherwise the requested lines, in order, while the money on the
    /// invoice not yet allocated to a line covers them. Call after the invoice was refreshed/updated. Does not save.
    /// </summary>
    public static async Task<int> MarkCoveredAsync(HISDbContext db, InvoiceSummary invoice, ChargeSet set, Receipt receipt,
        IReadOnlyCollection<Guid>? serviceItemIds, IReadOnlyCollection<Guid>? medicineItemIds, bool includeBed, string? userId)
    {
        var unpaid = set.Services.Concat(set.Medicines).Where(l => !l.IsPaid).ToList();
        var bedDue = set.UnpaidBedAmount;
        if (unpaid.Count == 0 && bedDue <= 0) return 0;

        List<ChargeLine> toMark;
        var markBed = false;
        if (invoice.RemainingAmount <= 0 && invoice.TotalAmount > 0)
        {
            toMark = unpaid;
            markBed = bedDue > 0;
        }
        else
        {
            // Money on the invoice (payments + discount) not yet allocated to any line.
            var allocated = set.Services.Concat(set.Medicines).Where(l => l.IsPaid).Sum(l => l.PatientAmount) + set.BedPaidAmount;
            var free = invoice.PaidAmount + invoice.DiscountAmount - allocated;
            toMark = new List<ChargeLine>();
            foreach (var l in unpaid.Where(l =>
                         (l.ItemType == ItemService && serviceItemIds != null && serviceItemIds.Contains(l.Id))
                         || (l.ItemType == ItemMedicine && medicineItemIds != null && medicineItemIds.Contains(l.Id))))
            {
                if (l.PatientAmount > free) break;
                free -= l.PatientAmount;
                toMark.Add(l);
            }
            markBed = includeBed && bedDue > 0 && bedDue <= free;
        }
        if (toMark.Count == 0 && !markBed) return 0;

        var now = DateTime.Now;
        if (markBed)
        {
            // Bed days are allocated as one running amount (the stay keeps growing).
            db.ReceiptDetails.Add(new ReceiptDetail
            {
                Id = Guid.NewGuid(), ReceiptId = receipt.Id, ItemType = ItemBed, ItemCode = "GIUONG",
                ItemName = "Tiền giường", Quantity = set.Beds.Sum(l => l.Days),
                UnitPrice = 0, Amount = bedDue, Discount = 0, FinalAmount = bedDue, CreatedAt = now, CreatedBy = userId,
            });
            foreach (var b in set.Beds) b.IsPaid = true;
            set.BedPaidAmount += bedDue;
        }

        foreach (var l in toMark)
        {
            db.ReceiptDetails.Add(new ReceiptDetail
            {
                Id = Guid.NewGuid(), ReceiptId = receipt.Id, ItemType = l.ItemType,
                ServiceRequestDetailId = l.ItemType == ItemService && !l.IsHeaderOnly ? l.Id : null,
                PrescriptionDetailId = l.ItemType == ItemMedicine && !l.IsCabinet ? l.Id : null,
                // Header-only request / ward-cabinet line (QA-R12): no detail FK — the line id travels in ItemCode.
                ItemCode = l.IsHeaderOnly || l.IsCabinet ? l.Id.ToString() : (l.Code.Length > 50 ? l.Code[..50] : l.Code),
                ItemName = l.Name.Length > 200 ? l.Name[..200] : l.Name,
                Quantity = l.Quantity, UnitPrice = l.UnitPrice, Amount = l.Amount, Discount = 0,
                FinalAmount = l.PatientAmount, CreatedAt = now, CreatedBy = userId,
            });
            l.IsPaid = true;
        }

        // Flags: a request / prescription is paid when all of its billable lines are.
        var srIds = toMark.Where(l => l.ItemType == ItemService).Select(l => l.ParentId).Distinct().ToList();
        if (srIds.Count > 0)
        {
            var srs = await db.ServiceRequests.Where(r => srIds.Contains(r.Id)).ToListAsync();
            foreach (var sr in srs)
            {
                if (set.Services.Any(l => l.ParentId == sr.Id && !l.IsPaid)) continue;
                if (!sr.IsPaid)
                {
                    sr.IsPaid = true;
                    if (sr.Status == 0) sr.Status = 1; // 0-Chờ TT → 1-Đã TT (same gate as the QR hook)
                    sr.UpdatedAt = now;
                }
            }
        }
        var rxIds = toMark.Where(l => l.ItemType == ItemMedicine).Select(l => l.ParentId).Distinct().ToList();
        if (rxIds.Count > 0)
        {
            var rxs = await db.Prescriptions.Where(p => rxIds.Contains(p.Id)).ToListAsync();
            foreach (var rx in rxs)
            {
                if (set.Medicines.Any(l => l.ParentId == rx.Id && !l.IsPaid)) continue;
                if (!rx.IsPaid) { rx.IsPaid = true; rx.UpdatedAt = now; }
            }
        }
        return toMark.Count + (markBed ? 1 : 0);
    }

    /// <summary>
    /// Undo what <see cref="MarkCoveredAsync"/> did for one receipt (payment cancelled / fully refunded):
    /// soft-delete its ReceiptDetails and clear the paid flags of the requests/prescriptions they covered. Does not save.
    /// </summary>
    public static async Task<int> ReverseReceiptItemsAsync(HISDbContext db, Guid receiptId)
    {
        var details = await db.ReceiptDetails.Where(rd => rd.ReceiptId == receiptId && !rd.IsDeleted).ToListAsync();
        return await UnflagAsync(db, details);
    }

    /// <summary>
    /// Partial (item) refund paid out: release the payment allocation of exactly these lines (soft-delete their
    /// ReceiptDetails on payment receipts) and clear the paid flag of their request / prescription. Does not save.
    /// </summary>
    public static async Task<int> ReverseLineItemsAsync(HISDbContext db, Guid refundReceiptId, IReadOnlyDictionary<Guid, decimal> refundedNow)
    {
        // QA-R3 review S4: a partial amount refund on a line (goodwill) must not make the whole line "unpaid" — release
        // a line only once everything refunded on it (paid-out refunds + this one) reaches its patient share.
        var lineIds = refundedNow.Keys.ToList();
        if (lineIds.Count == 0) return 0;
        var refundedBefore = (await db.ReceiptDetails.AsNoTracking()
                .Where(rd => !rd.IsDeleted && rd.Receipt.ReceiptType == 3 && rd.Receipt.Status == RefundStatus.Paid
                             && rd.ReceiptId != refundReceiptId && !rd.Receipt.IsDeleted
                             && ((rd.ServiceRequestDetailId != null && lineIds.Contains(rd.ServiceRequestDetailId.Value))
                                 || (rd.PrescriptionDetailId != null && lineIds.Contains(rd.PrescriptionDetailId.Value))))
                .Select(rd => new { Id = rd.ServiceRequestDetailId ?? rd.PrescriptionDetailId, rd.FinalAmount })
                .ToListAsync())
            .GroupBy(x => x.Id!.Value).ToDictionary(g => g.Key, g => g.Sum(x => x.FinalAmount));
        var srdShares = await db.ServiceRequestDetails.AsNoTracking().Where(d => lineIds.Contains(d.Id))
            .Select(d => new { d.Id, d.Amount, d.InsuranceAmount, d.PatientAmount }).ToListAsync();
        var pdShares = await db.PrescriptionDetails.AsNoTracking().Where(d => lineIds.Contains(d.Id))
            .Select(d => new { d.Id, d.Amount, d.InsuranceAmount, d.PatientAmount }).ToListAsync();
        bool FullyRefunded(Guid id, decimal amount, decimal ins, decimal pat)
            => refundedBefore.GetValueOrDefault(id) + refundedNow.GetValueOrDefault(id) >= PatientShare(amount, ins, pat);
        var serviceRequestDetailIds = srdShares.Where(d => FullyRefunded(d.Id, d.Amount, d.InsuranceAmount, d.PatientAmount)).Select(d => d.Id).ToList();
        var prescriptionDetailIds = pdShares.Where(d => FullyRefunded(d.Id, d.Amount, d.InsuranceAmount, d.PatientAmount)).Select(d => d.Id).ToList();
        if (serviceRequestDetailIds.Count == 0 && prescriptionDetailIds.Count == 0) return 0;
        var details = await db.ReceiptDetails
            .Where(rd => !rd.IsDeleted && rd.Receipt.ReceiptType == 2
                         && ((rd.ServiceRequestDetailId != null && serviceRequestDetailIds.Contains(rd.ServiceRequestDetailId.Value))
                             || (rd.PrescriptionDetailId != null && prescriptionDetailIds.Contains(rd.PrescriptionDetailId.Value))))
            .ToListAsync();
        // A line flagged paid by a channel outside the ledger (no payment ReceiptDetail) still gets its flag cleared.
        var n = await UnflagAsync(db, details);
        var now = DateTime.Now;
        var srIds = await db.ServiceRequestDetails.Where(d => serviceRequestDetailIds.Contains(d.Id)).Select(d => d.ServiceRequestId).Distinct().ToListAsync();
        foreach (var sr in await db.ServiceRequests.Where(r => srIds.Contains(r.Id) && r.IsPaid).ToListAsync())
        {
            sr.IsPaid = false;
            if (sr.Status == 1) sr.Status = 0;
            sr.UpdatedAt = now;
        }
        var rxIds = await db.PrescriptionDetails.Where(d => prescriptionDetailIds.Contains(d.Id)).Select(d => d.PrescriptionId).Distinct().ToListAsync();
        foreach (var rx in await db.Prescriptions.Where(p => rxIds.Contains(p.Id) && p.IsPaid).ToListAsync())
        {
            rx.IsPaid = false;
            rx.UpdatedAt = now;
        }
        return n;
    }

    private static async Task<int> UnflagAsync(HISDbContext db, List<ReceiptDetail> details)
    {
        if (details.Count == 0) return 0;
        var now = DateTime.Now;
        foreach (var d in details) { d.IsDeleted = true; d.UpdatedAt = now; }

        var srdIds = details.Where(d => d.ServiceRequestDetailId != null).Select(d => d.ServiceRequestDetailId!.Value).ToList();
        var headerIds = details.Where(d => d.ItemType == ItemService && d.ServiceRequestDetailId == null && Guid.TryParse(d.ItemCode, out _))
            .Select(d => Guid.Parse(d.ItemCode!)).ToList();
        var srIds = await db.ServiceRequestDetails.Where(d => srdIds.Contains(d.Id)).Select(d => d.ServiceRequestId).Distinct().ToListAsync();
        srIds.AddRange(headerIds);
        if (srIds.Count > 0)
        {
            var srs = await db.ServiceRequests.Where(r => srIds.Contains(r.Id)).ToListAsync();
            foreach (var sr in srs)
            {
                if (!sr.IsPaid) continue;
                sr.IsPaid = false;
                if (sr.Status == 1) sr.Status = 0;
                sr.UpdatedAt = now;
            }
        }
        var pdIds = details.Where(d => d.PrescriptionDetailId != null).Select(d => d.PrescriptionDetailId!.Value).ToList();
        if (pdIds.Count > 0)
        {
            var rxIds = await db.PrescriptionDetails.Where(d => pdIds.Contains(d.Id)).Select(d => d.PrescriptionId).Distinct().ToListAsync();
            var rxs = await db.Prescriptions.Where(p => rxIds.Contains(p.Id) && p.IsPaid).ToListAsync();
            foreach (var rx in rxs) { rx.IsPaid = false; rx.UpdatedAt = now; }
        }
        return details.Count;
    }
}
