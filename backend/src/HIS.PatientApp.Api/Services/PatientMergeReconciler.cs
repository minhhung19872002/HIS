using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Services;

/// <summary>
/// Đi theo người bệnh khi quầy tiếp đón GHÉP hồ sơ trùng bên HIS.
///
/// <para>Tài khoản app và liên kết người thân giữ id hồ sơ HIS. HIS ghép hồ sơ B vào A thì B bị xoá mềm,
/// dữ liệu sang A — nhưng app vẫn hỏi theo B và nhận về danh sách RỖNG với HTTP 200: người bệnh thấy lịch
/// sử khám, lịch hẹn biến mất mà không có lỗi nào (đo trên prod 15/09). Lớp này hỏi HIS id nào đã bị ghép
/// rồi trỏ lại sang hồ sơ còn lại, có ghi nhật ký.</para>
/// </summary>
public class PatientMergeReconciler
{
    private const int BatchSize = 500;

    private readonly PatientAppDbContext _db;
    private readonly IHisConnector _his;
    private readonly ILogger<PatientMergeReconciler> _logger;

    public PatientMergeReconciler(PatientAppDbContext db, IHisConnector his, ILogger<PatientMergeReconciler> logger)
    {
        _db = db;
        _his = his;
        _logger = logger;
    }

    public sealed record Result(int AccountsMoved, int FamilyLinksMoved, int FamilyLinksRevoked);

    public async Task<Result> RunOnceAsync(CancellationToken ct = default)
    {
        var accountIds = await _db.Accounts.Where(a => a.HisPatientId != null)
            .Select(a => a.HisPatientId!.Value).ToListAsync(ct);
        var memberIds = await _db.FamilyLinks.Where(l => l.Status != AppFamilyLinkStatus.Revoked)
            .Select(l => l.MemberPatientId).ToListAsync(ct);

        var successors = new Dictionary<Guid, HisMergeSuccessor>();
        foreach (var chunk in accountIds.Concat(memberIds).Distinct().Chunk(BatchSize))
            foreach (var s in await _his.GetMergeSuccessorsAsync(chunk, ct))
                successors[s.PatientId] = s;

        if (successors.Count == 0) return new Result(0, 0, 0);

        var now = DateTime.UtcNow;
        var accountsMoved = 0;
        var mergedIds = successors.Keys.ToList();

        var accounts = await _db.Accounts
            .Where(a => a.HisPatientId != null && mergedIds.Contains(a.HisPatientId.Value))
            .ToListAsync(ct);
        foreach (var account in accounts)
        {
            var from = account.HisPatientId!.Value;
            var to = successors[from];
            account.HisPatientId = to.CurrentPatientId;
            account.HisPatientCode = to.CurrentPatientCode;
            account.UpdatedAt = now;
            Audit(account.Id, to.CurrentPatientId, "his_patient_merged", $"account:{account.Id}:from:{from}");
            accountsMoved++;
        }

        var linksMoved = 0;
        var linksRevoked = 0;
        var links = await _db.FamilyLinks
            .Where(l => l.Status != AppFamilyLinkStatus.Revoked && mergedIds.Contains(l.MemberPatientId))
            .ToListAsync(ct);
        foreach (var link in links)
        {
            var from = link.MemberPatientId;
            var to = successors[from];
            var ownerPatient = accounts.FirstOrDefault(a => a.Id == link.OwnerAccountId)?.HisPatientId
                ?? await _db.Accounts.Where(a => a.Id == link.OwnerAccountId).Select(a => a.HisPatientId).FirstOrDefaultAsync(ct);

            // (OwnerAccountId, MemberPatientId) là duy nhất trên MỌI dòng, kể cả đã thu hồi — trỏ sang một
            // người đã có dòng liên kết sẽ vỡ ràng buộc. Người thân hoá ra là chính chủ tài khoản thì liên
            // kết cũng vô nghĩa. Cả hai trường hợp: thu hồi dòng cũ thay vì trỏ lại.
            var duplicate = await _db.FamilyLinks.AnyAsync(
                l => l.OwnerAccountId == link.OwnerAccountId && l.MemberPatientId == to.CurrentPatientId, ct);
            if (duplicate || ownerPatient == to.CurrentPatientId)
            {
                link.Status = AppFamilyLinkStatus.Revoked;
                link.RevokedAt = now;
                Audit(link.OwnerAccountId, from, "family_link_revoked_his_merge", $"family_link:{link.Id}:into:{to.CurrentPatientId}");
                linksRevoked++;
                continue;
            }

            link.MemberPatientId = to.CurrentPatientId;
            link.MemberPatientCode = to.CurrentPatientCode;
            if (!string.IsNullOrWhiteSpace(to.CurrentFullName)) link.MemberName = to.CurrentFullName;
            Audit(link.OwnerAccountId, to.CurrentPatientId, "family_link_his_patient_merged", $"family_link:{link.Id}:from:{from}");
            linksMoved++;
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Đi theo hồ sơ ghép bên HIS: {Accounts} tài khoản, {Moved} liên kết người thân trỏ lại, {Revoked} liên kết thu hồi.",
            accountsMoved, linksMoved, linksRevoked);
        return new Result(accountsMoved, linksMoved, linksRevoked);
    }

    private void Audit(Guid accountId, Guid targetPatientId, string action, string resourceRef) =>
        _db.AccessAuditLogs.Add(new AccessAuditLog
        {
            ActorAccountId = accountId,
            ActorType = "system",
            TargetPatientId = targetPatientId,
            Action = action,
            ResourceRef = resourceRef,
        });
}
