using HIS.Core.Common;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Cấp số thứ tự theo MỘT dãy dùng chung cho mỗi (phòng, ngày, loại hàng đợi) — migration 187.
///
/// <para>Trước đây có hai nguồn số chạy song song và không biết nhau: bộ đếm
/// <c>QueueConfiguration.CurrentNumber</c> (reset mỗi ngày) cho người bốc số tại quầy, và
/// <c>MAX(QueueNumber)+1</c> tính trên TOÀN VIỆN ở luồng tiếp đón từ lịch hẹn. Bộ đếm reset theo
/// ngày nên không cách nào giữ số trước cho một ngày trong tương lai — đó chính là lý do người đặt
/// lịch trên app phải đến nơi mới bốc được số.</para>
///
/// <para>Nay mọi số của một phòng trong một ngày đều lấy từ đây:
/// <c>MAX(số đã giữ trong Appointments, số đã cấp trong QueueTickets) + 1</c>. Hệ quả:</para>
/// <list type="bullet">
/// <item>Lịch hẹn giữ được số cho ngày mai, ngày kia — điều bộ đếm cũ không làm được.</item>
/// <item>Khách bốc số tại quầy hôm đó nhận số TIẾP SAU các số đã giữ, nên không bao giờ trùng.</item>
/// <item>Vì lịch hẹn đặt trước ngày khám nên người đặt lịch tự nhiên giữ các số đầu ngày.</item>
/// </list>
///
/// <para>Số đã giữ của lịch ĐÃ HUỶ / KHÔNG ĐẾN (Status >= 3) không còn được tính, tức là trả lại
/// cho người sau — giống hệt việc trả chỗ trong khung giờ.</para>
/// </summary>
internal static class AppointmentQueueAllocator
{
    /// <summary>Hàng đợi khám bệnh — loại mà lịch hẹn ngoại trú rơi vào.</summary>
    public const int ExamQueueType = 2;

    /// <summary>Mã vé hiển thị, VD ("B", 7) → "B007". Khớp định dạng của IssueQueueTicketAsync.</summary>
    public static string FormatCode(string prefix, int number) => $"{prefix}{number:D3}";

    /// <summary>
    /// Tiền tố mã vé của phòng. Lấy theo cấu hình hàng đợi của phòng nếu có, để mã trên app trùng
    /// đúng mã hiện trên bảng gọi số; chưa cấu hình thì theo quy ước mặc định như
    /// <c>IssueQueueTicketAsync</c> (1-Tiếp đón "A", 2-Khám bệnh "B", còn lại "C").
    /// </summary>
    public static async Task<string> GetPrefixAsync(HISDbContext db, Guid roomId, int queueType)
    {
        var configured = await db.QueueConfigurations
            .AsNoTracking()
            .Where(c => !c.IsDeleted && c.RoomId == roomId && c.QueueType == queueType)
            .Select(c => c.Prefix)
            .FirstOrDefaultAsync();

        if (!string.IsNullOrWhiteSpace(configured)) return configured!;
        return queueType == 1 ? "A" : queueType == 2 ? "B" : "C";
    }

    /// <summary>
    /// Số kế tiếp của (phòng, ngày, loại hàng đợi). Tính cả số đã giữ cho lịch hẹn lẫn vé đã cấp,
    /// nên gọi được cho ngày hôm nay (bốc số tại quầy) lẫn ngày tương lai (giữ chỗ khi đặt lịch).
    /// </summary>
    public static async Task<int> NextNumberAsync(
        HISDbContext db, Guid roomId, DateTime dateVn, int queueType)
    {
        var day = dateVn.Date;
        var (fromUtc, toUtc) = VnTime.DayRangeUtc(day);

        // IssueDate lưu UTC → so theo khoảng UTC của trọn ngày VN (xem HIS.Core.Common.VnTime).
        var maxIssued = await db.QueueTickets
            .Where(t => !t.IsDeleted
                && t.RoomId == roomId
                && t.QueueType == queueType
                && t.IssueDate >= fromUtc && t.IssueDate < toUtc)
            .MaxAsync(t => (int?)t.QueueNumber) ?? 0;

        // So ngày hẹn theo KHOẢNG [day, day+1) chứ không so bằng: phần lớn bản ghi lưu ngày trần,
        // nhưng chỉ cần một bản ghi cũ còn dính phần giờ là phép so bằng bỏ sót nó — mà bỏ sót ở
        // đây nghĩa là cấp lại đúng con số người khác đang giữ. Dạng khoảng cũng dùng được chỉ số.
        var nextDay = day.AddDays(1);
        var maxReserved = await db.Appointments
            .Where(a => !a.IsDeleted
                && a.RoomId == roomId
                && a.AppointmentDate >= day && a.AppointmentDate < nextDay
                && a.Status < 3            // huỷ / không đến thì trả lại số
                && a.QueueNumber != null)
            .MaxAsync(a => a.QueueNumber) ?? 0;

        // Phòng có thể cấu hình bắt đầu từ số khác 1 (VD dải riêng cho khám dịch vụ).
        var startNumber = await db.QueueConfigurations
            .AsNoTracking()
            .Where(c => !c.IsDeleted && c.RoomId == roomId && c.QueueType == queueType)
            .Select(c => (int?)c.StartNumber)
            .FirstOrDefaultAsync() ?? 1;

        return Math.Max(Math.Max(maxIssued, maxReserved) + 1, startNumber);
    }

    /// <summary>
    /// Giữ một số cho lịch hẹn. Trả <c>null</c> khi lịch chưa gán phòng — khi đó app nói rõ người
    /// bệnh sẽ lấy số tại quầy, thay vì hiện một con số không có thật.
    /// </summary>
    public static async Task<(int Number, string Code)?> ReserveAsync(
        HISDbContext db, Guid? roomId, DateTime dateVn, int queueType = ExamQueueType)
    {
        if (roomId is null || roomId == Guid.Empty) return null;

        var number = await NextNumberAsync(db, roomId.Value, dateVn, queueType);
        var prefix = await GetPrefixAsync(db, roomId.Value, queueType);
        return (number, FormatCode(prefix, number));
    }
}
