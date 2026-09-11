using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Mở hồ sơ khám từ một lịch hẹn — dùng chung cho tiếp đón tại quầy và luồng tự động (migration 187).
///
/// <para>Trước đây đoạn này chỉ nằm trong <c>CheckinFromBookingAsync</c>. Từ khi lịch hẹn tự vào
/// hàng đợi đầu ngày, phòng khám gọi trúng số của người đặt lịch mà chưa ai bấm tiếp đón, nên
/// <c>CallNextAsync</c> cũng cần đúng các bước này. Chép làm hai bản thì sớm muộn hai bên lệch
/// nhau — mà lệch ở đây nghĩa là bệnh nhân được gọi vào phòng nhưng bác sĩ không có hồ sơ.</para>
/// </summary>
internal static class AppointmentCheckin
{
    /// <summary>Mã hồ sơ kế tiếp trong ngày: MR + yyyyMMdd + 4 chữ số.</summary>
    public static async Task<string> NextRecordCodeAsync(HISDbContext db, DateTime todayVn)
    {
        var prefix = $"MR{todayVn:yyyyMMdd}";
        var maxCode = await db.MedicalRecords
            .Where(m => m.MedicalRecordCode.StartsWith(prefix))
            .OrderByDescending(m => m.MedicalRecordCode)
            .Select(m => m.MedicalRecordCode)
            .FirstOrDefaultAsync();

        var next = 1;
        if (!string.IsNullOrEmpty(maxCode) && maxCode.Length > prefix.Length
            && int.TryParse(maxCode[prefix.Length..], out var current))
        {
            next = current + 1;
        }

        return $"{prefix}{next:D4}";
    }

    /// <summary>
    /// Hồ sơ ngoại trú đang mở của người bệnh, nếu có. Tiếp đón tại quầy coi đây là lỗi (không mở
    /// hai hồ sơ cho một người); luồng tự động thì gắn vé vào hồ sơ đó thay vì tạo thêm.
    /// </summary>
    public static Task<MedicalRecord?> FindActiveRecordAsync(HISDbContext db, Guid patientId) =>
        db.MedicalRecords.FirstOrDefaultAsync(
            m => m.PatientId == patientId && m.Status < 3 && m.TreatmentType == 1 && !m.IsDeleted);

    /// <summary>
    /// Tạo hồ sơ khám + phiên khám cho lịch hẹn và gắn vé hàng đợi vào đó.
    ///
    /// <para>Không gọi <c>SaveChanges</c> — bên gọi tự quyết định gộp vào giao dịch nào.
    /// Trả <c>null</c> khi lịch hẹn chưa có khoa hoặc chưa có phòng: phiên khám không tồn tại được
    /// nếu thiếu hai thứ đó.</para>
    /// </summary>
    public static async Task<MedicalRecord?> CreateRecordAsync(
        HISDbContext db, Appointment appointment, QueueTicket? ticket, DateTime todayVn)
    {
        if (!appointment.DepartmentId.HasValue || !appointment.RoomId.HasValue) return null;

        var nowUtc = DateTime.UtcNow;

        var record = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = await NextRecordCodeAsync(db, todayVn),
            PatientId = appointment.PatientId,
            AdmissionDate = nowUtc,
            PatientType = 2,   // Viện phí
            TreatmentType = 1, // Ngoại trú
            RoomId = appointment.RoomId,
            DoctorId = appointment.DoctorId,
            DepartmentId = appointment.DepartmentId,
            Status = 0,        // Chờ
            CreatedAt = nowUtc
        };
        await db.MedicalRecords.AddAsync(record);

        var examination = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = record.Id,
            ExaminationType = 1, // Khám chính
            DepartmentId = appointment.DepartmentId.Value,
            RoomId = appointment.RoomId.Value,
            DoctorId = appointment.DoctorId,
            QueueNumber = ticket?.QueueNumber ?? appointment.QueueNumber ?? 0,
            Status = 0,
            CreatedAt = nowUtc
        };
        await db.Examinations.AddAsync(examination);

        // Gắn vé vào hồ sơ để mọi thao tác gọi/phục vụ sau đó tự đồng bộ trạng thái hồ sơ
        // (xem SyncMedicalRecordStatusAsync trong ReceptionCompleteService.Queue).
        if (ticket != null) ticket.MedicalRecordId = record.Id;

        appointment.Status = 2; // Đã đến khám
        appointment.UpdatedAt = nowUtc;

        return record;
    }
}
