using HIS.PatientApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Data;

/// <summary>
/// CSDL riêng của app mobile (PostgreSQL — quyết định D9).
///
/// Chỉ chứa dữ liệu của app: tài khoản, thiết bị, phiên, OTP, thông báo, nhật ký truy cập.
/// KHÔNG chứa dữ liệu khám chữa bệnh — thứ đó nằm lại trong HIS và được lấy qua IHisConnector.
/// </summary>
public class PatientAppDbContext : DbContext
{
    public PatientAppDbContext(DbContextOptions<PatientAppDbContext> options) : base(options) { }

    public DbSet<AppAccount> Accounts => Set<AppAccount>();
    public DbSet<AppDevice> Devices => Set<AppDevice>();
    public DbSet<AppRefreshToken> RefreshTokens => Set<AppRefreshToken>();
    public DbSet<OtpChallenge> OtpChallenges => Set<OtpChallenge>();
    public DbSet<BiometricChallenge> BiometricChallenges => Set<BiometricChallenge>();
    public DbSet<AppNotification> Notifications => Set<AppNotification>();
    public DbSet<PushOutbox> PushOutbox => Set<PushOutbox>();
    public DbSet<AccessAuditLog> AccessAuditLogs => Set<AccessAuditLog>();
    public DbSet<AppointmentReminder> AppointmentReminders => Set<AppointmentReminder>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<AppAccount>(e =>
        {
            e.ToTable("app_accounts");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.PhoneNumber).IsUnique();
            // Tra theo hồ sơ HIS khi nhân viên CSKH tìm tài khoản app của một bệnh nhân.
            e.HasIndex(x => x.HisPatientId);
            e.Property(x => x.PhoneNumber).HasMaxLength(20).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(200).IsRequired();
            e.Property(x => x.HisPatientCode).HasMaxLength(50);
            e.Property(x => x.FullName).HasMaxLength(200);
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.SecurityStamp).HasMaxLength(64).IsRequired();
            e.Property(x => x.PinHash).HasMaxLength(200);
        });

        b.Entity<AppDevice>(e =>
        {
            e.ToTable("app_devices");
            e.HasKey(x => x.Id);
            // Một máy chỉ có một dòng cho mỗi tài khoản: đăng nhập lại không đẻ thêm bản ghi mới.
            e.HasIndex(x => new { x.AccountId, x.DeviceKey }).IsUnique();
            e.Property(x => x.DeviceKey).HasMaxLength(128).IsRequired();
            e.Property(x => x.DeviceName).HasMaxLength(120).IsRequired();
            e.Property(x => x.Platform).HasMaxLength(20).IsRequired();
            e.Property(x => x.OsVersion).HasMaxLength(50);
            e.Property(x => x.AppVersion).HasMaxLength(50);
            e.Property(x => x.PushToken).HasMaxLength(512);
            e.Property(x => x.BiometricPublicKey).HasMaxLength(1024);
            e.Property(x => x.LastIp).HasMaxLength(64);
            e.HasOne(x => x.Account).WithMany(x => x.Devices)
                .HasForeignKey(x => x.AccountId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<AppRefreshToken>(e =>
        {
            e.ToTable("app_refresh_tokens");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => x.AccountId);
            e.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
            e.Property(x => x.ReplacedByTokenHash).HasMaxLength(64);
            e.Property(x => x.CreatedByIp).HasMaxLength(64);
            e.HasOne(x => x.Account).WithMany()
                .HasForeignKey(x => x.AccountId).OnDelete(DeleteBehavior.Cascade);
            // Xoá thiết bị KHÔNG xoá token: cần giữ để điều tra khi có sự cố bảo mật.
            e.HasOne(x => x.Device).WithMany()
                .HasForeignKey(x => x.DeviceId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<OtpChallenge>(e =>
        {
            e.ToTable("otp_challenges");
            e.HasKey(x => x.Id);
            // Tìm mã còn hiệu lực mới nhất của một số điện thoại cho một mục đích.
            e.HasIndex(x => new { x.PhoneNumber, x.Purpose, x.CreatedAt });
            e.Property(x => x.PhoneNumber).HasMaxLength(20).IsRequired();
            e.Property(x => x.Purpose).HasMaxLength(30).IsRequired();
            e.Property(x => x.CodeHash).HasMaxLength(64).IsRequired();
            e.Property(x => x.RequestedByIp).HasMaxLength(64);
        });

        b.Entity<BiometricChallenge>(e =>
        {
            e.ToTable("biometric_challenges");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.DeviceId, x.CreatedAt });
            e.Property(x => x.Nonce).HasMaxLength(64).IsRequired();
            e.HasOne(x => x.Device).WithMany()
                .HasForeignKey(x => x.DeviceId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<AppNotification>(e =>
        {
            e.ToTable("app_notifications");
            e.HasKey(x => x.Id);
            // Inbox luôn đọc theo tài khoản, mới nhất trước.
            e.HasIndex(x => new { x.AccountId, x.CreatedAt });
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Body).HasMaxLength(2000).IsRequired();
            e.Property(x => x.Category).HasMaxLength(30).IsRequired();
            e.Property(x => x.DeepLink).HasMaxLength(300);
            e.HasOne(x => x.Account).WithMany()
                .HasForeignKey(x => x.AccountId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<PushOutbox>(e =>
        {
            e.ToTable("push_outbox");
            e.HasKey(x => x.Id);
            // Relay quét đúng những bản ghi tới hạn gửi.
            e.HasIndex(x => new { x.Status, x.NextAttemptAt });
            e.Property(x => x.PushToken).HasMaxLength(512).IsRequired();
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.LastError).HasMaxLength(1000);
            e.HasOne(x => x.Notification).WithMany()
                .HasForeignKey(x => x.NotificationId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<AppointmentReminder>(e =>
        {
            e.ToTable("appointment_reminders");
            e.HasKey(x => x.Id);
            // Một mã lịch hẹn chỉ có một dòng cho mỗi tài khoản: đồng bộ lại thì cập nhật, không đẻ thêm.
            e.HasIndex(x => new { x.AccountId, x.AppointmentCode }).IsUnique();
            // Worker quét theo thời điểm hẹn.
            e.HasIndex(x => new { x.AppointmentAt, x.Status });
            e.Property(x => x.AppointmentCode).HasMaxLength(50).IsRequired();
            e.Property(x => x.DepartmentName).HasMaxLength(200);
            e.Property(x => x.DoctorName).HasMaxLength(200);
            e.Property(x => x.RoomName).HasMaxLength(100);
            e.HasOne(x => x.Account).WithMany()
                .HasForeignKey(x => x.AccountId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<AccessAuditLog>(e =>
        {
            e.ToTable("access_audit_logs");
            e.HasKey(x => x.Id);
            // Câu hỏi thường gặp nhất khi thanh tra: "ai đã xem hồ sơ bệnh nhân này?"
            e.HasIndex(x => new { x.TargetPatientId, x.CreatedAt });
            e.HasIndex(x => new { x.ActorAccountId, x.CreatedAt });
            e.Property(x => x.ActorType).HasMaxLength(20).IsRequired();
            e.Property(x => x.Action).HasMaxLength(60).IsRequired();
            e.Property(x => x.ResourceRef).HasMaxLength(200);
            e.Property(x => x.Ip).HasMaxLength(64);
            e.Property(x => x.UserAgent).HasMaxLength(300);
        });
    }
}
