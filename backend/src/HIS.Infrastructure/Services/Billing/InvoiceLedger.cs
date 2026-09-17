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

        var allocated = await db.ReceiptDetails.AsNoTracking()
            .Where(rd => !rd.IsDeleted && rd.Receipt.Status == 1 && !rd.Receipt.IsDeleted
                         && rd.Receipt.ReceiptType == 2 && rd.Receipt.MedicalRecordId == medicalRecordId)
            .Select(rd => new { rd.ServiceRequestDetailId, rd.PrescriptionDetailId, rd.ItemType, rd.ItemCode, rd.FinalAmount })
            .ToListAsync();
        var paidSrd = allocated.Where(a => a.ServiceRequestDetailId != null).Select(a => a.ServiceRequestDetailId!.Value).ToHashSet();
        var paidPd = allocated.Where(a => a.PrescriptionDetailId != null).Select(a => a.PrescriptionDetailId!.Value).ToHashSet();
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
        foreach (var p in prescriptions)
        {
            foreach (var d in p.Details.Where(d => !d.IsDeleted && d.Status != 2))
            {
                var paidHere = paidPd.Contains(d.Id);
                if (p.IsPaid && !paidHere) continue; // paid outside the ledger (prescription QR)
                var amount = d.Amount != 0 ? d.Amount : d.Quantity * d.UnitPrice;
                set.Medicines.Add(new ChargeLine
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
                });
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
                for (var i = 0; i < set.Beds.Count; i++)
                {
                    var b = set.Beds[i];
                    var match = bhytBeds.FirstOrDefault(l => l.ItemCode == b.Code && l.ServiceDate == b.FromDate)
                                ?? bhytBeds.FirstOrDefault(l => l.ItemCode == b.Code);
                    if (match == null || match.Result.Amount <= 0 || match.Result.InsuranceAmount <= 0) continue;
                    var insurance = Math.Min(b.Amount, Math.Round(b.Amount * match.Result.InsuranceAmount / match.Result.Amount, 0));
                    set.Beds[i] = new ChargeLine
                    {
                        ItemType = b.ItemType, Id = b.Id, ParentId = b.ParentId, ItemRefId = b.ItemRefId, Code = b.Code, Name = b.Name,
                        RoomName = b.RoomName, Unit = b.Unit, Quantity = b.Quantity, Days = b.Days, UnitPrice = b.UnitPrice, Amount = b.Amount,
                        InsuranceAmount = insurance, PatientAmount = b.Amount - insurance,
                        InsuranceRate = b.Amount > 0 ? Math.Round(insurance * 100 / b.Amount, 0) : 0, PaymentObject = 1,
                        FromDate = b.FromDate, ToDate = b.ToDate, OrderedAt = b.OrderedAt,
                    };
                }
            }

            // Bed money is allocated as a running amount (a stay grows every day), oldest first.
            var left = set.BedPaidAmount;
            foreach (var b in set.Beds)
            {
                if (left >= b.PatientAmount) { b.IsPaid = true; left -= b.PatientAmount; }
                else break;
            }
        }

        return set;
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
                PrescriptionDetailId = l.ItemType == ItemMedicine ? l.Id : null,
                ItemCode = l.IsHeaderOnly ? l.Id.ToString() : (l.Code.Length > 50 ? l.Code[..50] : l.Code),
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
