using System.Text.Json;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Services;

/// <summary>
/// Gửi một đợt thông báo tới đúng nhóm người nhận (HSMT I.3 #1.4).
///
/// Tách thành lớp tĩnh để controller (gửi ngay) và worker (gửi theo giờ hẹn) dùng chung một đường —
/// hai bản sao của cùng một logic gửi thông báo hàng loạt là hai chỗ để lệch nhau.
/// </summary>
public static class CampaignSender
{
    /// <summary>
    /// Ghi thông báo cho từng người nhận. Trả về số người đã nhận.
    ///
    /// Ghi theo lô 200 để một chiến dịch gửi cho hàng chục nghìn người không giữ toàn bộ trong bộ
    /// nhớ và không khoá CSDL quá lâu trong một transaction khổng lồ.
    /// </summary>
    public static async Task<int> SendAsync(
        PatientAppDbContext db,
        NotificationService notifications,
        NotificationCampaign campaign,
        ILogger logger,
        CancellationToken ct)
    {
        try
        {
            var accountIds = await ResolveAudienceAsync(db, campaign, ct);
            var sent = 0;

            foreach (var accountId in accountIds)
            {
                ct.ThrowIfCancellationRequested();

                await notifications.CreateAsync(
                    accountId,
                    campaign.Title,
                    campaign.Body,
                    campaign.Category,
                    campaign.DeepLink,
                    campaignId: campaign.Id,
                    ct: ct);

                sent++;
            }

            campaign.Status = CampaignStatus.Sent;
            campaign.RecipientCount = sent;
            campaign.SentAt = DateTime.UtcNow;
            campaign.FailureReason = null;
            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Đã gửi chiến dịch {CampaignId} tới {Count} tài khoản.", campaign.Id, sent);

            return sent;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Ghi lại lý do thay vì để chiến dịch treo ở trạng thái "đã hẹn" mãi mãi — quản trị viên
            // cần biết nó hỏng để gửi lại.
            logger.LogError(ex, "Gửi chiến dịch {CampaignId} thất bại.", campaign.Id);

            campaign.Status = CampaignStatus.Failed;
            campaign.FailureReason = ex.Message.Length > 480 ? ex.Message[..480] : ex.Message;
            await db.SaveChangesAsync(CancellationToken.None);

            return 0;
        }
    }

    /// <summary>
    /// Danh sách tài khoản nhận. Luôn loại tài khoản đang bị khoá: gửi thông báo cho tài khoản không
    /// mở được app chỉ tạo ra con số thống kê sai.
    /// </summary>
    private static async Task<List<Guid>> ResolveAudienceAsync(
        PatientAppDbContext db, NotificationCampaign campaign, CancellationToken ct)
    {
        var active = db.Accounts.AsNoTracking().Where(a => a.Status == AppAccountStatus.Active);

        switch (campaign.Audience)
        {
            case CampaignAudience.Linked:
                return await active.Where(a => a.HisPatientId != null)
                    .Select(a => a.Id).ToListAsync(ct);

            case CampaignAudience.UpcomingAppointment:
                var horizon = DateTime.UtcNow.AddDays(7);
                return await active
                    .Where(a => db.AppointmentReminders.Any(r =>
                        r.AccountId == a.Id && r.Status < 2
                        && r.AppointmentAt >= DateTime.UtcNow && r.AppointmentAt <= horizon))
                    .Select(a => a.Id).ToListAsync(ct);

            case CampaignAudience.Selected:
                var selected = string.IsNullOrWhiteSpace(campaign.TargetAccountIdsJson)
                    ? new List<Guid>()
                    : JsonSerializer.Deserialize<List<Guid>>(campaign.TargetAccountIdsJson)
                      ?? new List<Guid>();

                return await active.Where(a => selected.Contains(a.Id))
                    .Select(a => a.Id).ToListAsync(ct);

            default:
                return await active.Select(a => a.Id).ToListAsync(ct);
        }
    }
}
