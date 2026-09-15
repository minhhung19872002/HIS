using Microsoft.EntityFrameworkCore;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Builds the BHYT claim (InsuranceClaims + InsuranceClaimDetails) of a medical record from its real billable
/// lines, priced by <see cref="BhytVisitPricing"/>. Shared by "khóa hồ sơ viện phí" (auto) and the manual
/// "tạo hồ sơ BHYT" endpoint so both produce the same full claim.
/// Totals: TotalAmount = Σ line amount · InsuranceAmount = Σ T_BHTT · OutOfPocketAmount = medicines outside the
/// BHYT list (XML4) · PatientAmount = the patient share of every other line — so XML1 total = XML2 + XML3 (+ XML4).
/// </summary>
public sealed class BhytClaimBuilder
{
    private readonly HISDbContext _db;

    public BhytClaimBuilder(HISDbContext db) => _db = db;

    public static string NewClaimCode()
        => $"BHYT-{DateTime.Now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

    /// <summary>
    /// Auto path (record locked for billing): create the claim, or refresh an existing claim BHXH has not received yet
    /// (Pending/Locked, never submitted). Claims already submitted/processed are left untouched. Returns null when the
    /// record is not a BHYT record. Caller saves.
    /// </summary>
    public async Task<InsuranceClaim?> UpsertOnLockAsync(Guid medicalRecordId, string? userId, CancellationToken ct = default)
    {
        var existing = await LiveClaimsAsync(medicalRecordId, ct);
        InsuranceClaim? refreshable = null;
        foreach (var c in existing)
            if (await IsRefreshableAsync(c, ct)) { refreshable = c; break; }
        if (refreshable == null && existing.Count > 0)
            return existing[0]; // submitted / processed / rejected — BHXH flow owns it now

        var visit = await new BhytVisitPricing(_db).RecalculateAsync(medicalRecordId, includeBeds: true, ct);
        // No valid card on the record or the patient (R3 review B9): no claim, and an existing draft is left as it was.
        if (visit == null || !visit.IsInsured) return refreshable;

        var claim = refreshable ?? NewClaim(visit, userId);
        await FillAsync(claim, visit, ct);
        claim.ClaimStatus = InsuranceClaimStatus.Locked;
        return claim;
    }

    /// <summary>Manual path: one claim per record — a second one is refused with the existing code.</summary>
    public async Task<InsuranceClaim> CreateManualAsync(Guid medicalRecordId, string? userId, CancellationToken ct = default)
    {
        var existing = await LiveClaimsAsync(medicalRecordId, ct);
        if (existing.Count > 0)
            throw new InvalidOperationException(
                $"Hồ sơ bệnh án đã có hồ sơ BHYT {existing[0].ClaimCode} ({InsuranceClaimStatus.Label(existing[0].ClaimStatus)}) — không tạo thêm.");

        var visit = await new BhytVisitPricing(_db).RecalculateAsync(medicalRecordId, includeBeds: true, ct)
            ?? throw new InvalidOperationException("Hồ sơ bệnh án không phải đối tượng BHYT — không tạo hồ sơ giám định.");
        if (!visit.IsInsured)
            throw new InvalidOperationException(
                "Không tìm thấy số thẻ BHYT hợp lệ trên hồ sơ bệnh án lẫn thông tin bệnh nhân — cập nhật thẻ trước khi tạo hồ sơ giám định.");

        var claim = NewClaim(visit, userId);
        await FillAsync(claim, visit, ct);
        claim.ClaimStatus = InsuranceClaimStatus.Pending;
        return claim;
    }

    /// <summary>Record unlocked again → an auto-locked claim that never left the hospital goes back to Pending.</summary>
    public async Task ReopenOnUnlockAsync(Guid medicalRecordId, CancellationToken ct = default)
    {
        foreach (var c in await LiveClaimsAsync(medicalRecordId, ct))
            if (c.ClaimStatus == InsuranceClaimStatus.Locked && await IsRefreshableAsync(c, ct))
            {
                c.ClaimStatus = InsuranceClaimStatus.Pending;
                c.UpdatedAt = DateTime.UtcNow;
            }
    }

    /// <summary>
    /// R3 review B5: a claim may be rebuilt / reopened only while it never left the hospital — not stamped as submitted
    /// AND not inside an XML batch that was sent to BHXH (batch Status ≥ 2). The batch check also covers batches
    /// submitted before claims were stamped at submit time; such a claim is stamped here (self-healing).
    /// </summary>
    private async Task<bool> IsRefreshableAsync(InsuranceClaim c, CancellationToken ct)
    {
        if (c.SubmittedAt != null) return false;
        if (c.ClaimStatus != InsuranceClaimStatus.Pending && c.ClaimStatus != InsuranceClaimStatus.Locked) return false;
        var batch = await BhytXmlBatchMembership.SubmittedBatchContainingAsync(_db, c, ct);
        if (batch == null) return true;
        c.SubmittedAt = batch.SubmittedAt ?? DateTime.Now;
        c.ClaimStatus = InsuranceClaimStatus.Locked;
        c.UpdatedAt = DateTime.UtcNow;
        return false;
    }

    private Task<List<InsuranceClaim>> LiveClaimsAsync(Guid medicalRecordId, CancellationToken ct)
        => _db.InsuranceClaims.Include(c => c.ClaimDetails)
            .Where(c => c.MedicalRecordId == medicalRecordId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

    private InsuranceClaim NewClaim(BhytPricedVisit visit, string? userId)
    {
        var claim = new InsuranceClaim
        {
            Id = Guid.NewGuid(),
            ClaimCode = NewClaimCode(),
            PatientId = visit.MedicalRecord.PatientId,
            MedicalRecordId = visit.MedicalRecord.Id,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _db.InsuranceClaims.Add(claim);
        return claim;
    }

    private async Task FillAsync(InsuranceClaim claim, BhytPricedVisit visit, CancellationToken ct)
    {
        var mr = visit.MedicalRecord;
        var lastExam = await _db.Examinations.AsNoTracking()
            .Where(e => e.MedicalRecordId == mr.Id && !e.IsDeleted && e.Status != ExaminationStatus.Cancelled)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new { e.MainIcdCode, e.MainDiagnosis, e.SubIcdCodes, e.SubDiagnosis, e.DoctorId, e.DepartmentId, e.StartTime })
            .FirstOrDefaultAsync(ct);

        // Card the split used (record card, else the patient's card — R3 review B9).
        claim.InsuranceNumber = HIS.Core.Common.BhytCardNumber.CoreOf(HIS.Core.Common.BhytCardNumber.Normalize(visit.CardNumber));
        claim.InsuranceEndDate = visit.CardExpireDate;
        claim.InsuranceFacilityCode = mr.InsuranceFacilityCode;
        claim.InsuranceType = mr.TreatmentType == 3 ? 1
            : mr.InsuranceRightRoute switch
            {
                2 => string.IsNullOrWhiteSpace(mr.ReferralFromFacilityCode) ? 3 : 2,
                3 => 5,
                _ => 1,
            };
        claim.ServiceDate = mr.AdmissionDate;
        claim.DischargeDate = mr.DischargeDate;
        claim.TreatmentType = mr.TreatmentType is 1 or 2 or 3 ? mr.TreatmentType : 1;
        claim.MainDiagnosisCode = Trunc(mr.MainIcdCode ?? lastExam?.MainIcdCode, 20);
        claim.MainDiagnosisName = Trunc(mr.MainDiagnosis ?? lastExam?.MainDiagnosis, 500);
        claim.SubDiagnosisCodes = Trunc(mr.SubIcdCodes ?? lastExam?.SubIcdCodes, 500);
        claim.SubDiagnosisNames = Trunc(mr.SubDiagnosis ?? lastExam?.SubDiagnosis, 1000);
        claim.DepartmentId = mr.DepartmentId ?? lastExam?.DepartmentId;
        claim.DoctorId = mr.DoctorId ?? lastExam?.DoctorId;
        claim.InsurancePaymentRate = visit.Result.EffectivePercent;

        // Rebuild the lines from scratch — the claim mirrors the record at lock time.
        if (claim.ClaimDetails.Count > 0)
        {
            _db.InsuranceClaimDetails.RemoveRange(claim.ClaimDetails);
            claim.ClaimDetails.Clear();
        }
        foreach (var l in visit.Lines)
        {
            var detail = new InsuranceClaimDetail
            {
                Id = Guid.NewGuid(),
                ClaimId = claim.Id,
                ItemType = l.ItemType,
                ServiceId = l.ServiceId,
                MedicineId = l.MedicineId,
                ItemCode = Trunc(l.ItemCode, 50) ?? string.Empty,
                ItemName = Trunc(l.ItemName, 500) ?? string.Empty,
                Unit = Trunc(l.Unit, 50),
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                Amount = l.Result.Amount,
                InsuranceCoverage = l.ItemPaymentRate,
                InsuranceAmount = l.Result.InsuranceAmount,
                PatientAmount = l.Result.PatientAmount,
                IsInsuranceCovered = l.IsInsuranceCovered,
                ServiceDate = l.ServiceDate,
                CreatedAt = DateTime.UtcNow,
            };
            _db.InsuranceClaimDetails.Add(detail);
            claim.ClaimDetails.Add(detail);
        }

        var outsideList = visit.Lines.Where(l => l.ItemType == 2 && !l.IsInsuranceCovered).ToList();
        claim.TotalAmount = visit.Lines.Sum(l => l.Result.Amount);
        claim.InsuranceAmount = visit.Lines.Sum(l => l.Result.InsuranceAmount);
        claim.OutOfPocketAmount = outsideList.Sum(l => l.Result.Amount);
        claim.PatientAmount = claim.TotalAmount - claim.InsuranceAmount - claim.OutOfPocketAmount;
        claim.Note = visit.Result.Warnings.Count > 0 ? Trunc(string.Join(" ", visit.Result.Warnings), 1000) : claim.Note;
        claim.UpdatedAt = DateTime.UtcNow;
    }

    private static string? Trunc(string? s, int max) => s == null ? null : (s.Length <= max ? s : s[..max]);
}

/// <summary>
/// Which claims an exported XML batch carries: the MA_LK values of its XML1 file — exactly what was (or will be)
/// sent to BHXH. Used to stamp claims at submit time and to protect claims of already-sent batches (R3 review B5).
/// </summary>
public static class BhytXmlBatchMembership
{
    public static IReadOnlyCollection<string> ClaimCodesOf(InsuranceXmlBatch batch)
    {
        if (string.IsNullOrWhiteSpace(batch.FilePath) || !Directory.Exists(batch.FilePath)) return Array.Empty<string>();
        var codes = new HashSet<string>(StringComparer.Ordinal);
        foreach (var file in Directory.GetFiles(batch.FilePath, "*_XML1.xml"))
        {
            try
            {
                foreach (var el in System.Xml.Linq.XDocument.Load(file).Descendants("MA_LK"))
                    if (!string.IsNullOrWhiteSpace(el.Value)) codes.Add(el.Value.Trim());
            }
            catch (System.Xml.XmlException) { /* unreadable file → no membership evidence */ }
        }
        return codes;
    }

    /// <summary>A batch with Status ≥ 2 (sent / rejected by BHXH) created after the claim whose XML1 lists it; null if none.</summary>
    public static async Task<InsuranceXmlBatch?> SubmittedBatchContainingAsync(HISDbContext db, InsuranceClaim claim, CancellationToken ct = default)
    {
        var batches = await db.Set<InsuranceXmlBatch>().AsNoTracking()
            .Where(b => !b.IsDeleted && b.Status >= 2 && b.CreatedAt >= claim.CreatedAt.AddDays(-1)) // tolerant to UTC vs VN-local stamps
            .OrderByDescending(b => b.SubmittedAt)
            .ToListAsync(ct);
        return batches.FirstOrDefault(b => ClaimCodesOf(b).Contains(claim.ClaimCode));
    }
}
