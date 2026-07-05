using HIS.Application.Common;
using HIS.Application.DTOs.DoctorLicense;
using HIS.Application.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic kiểm tra CCHN (Chứng chỉ hành nghề) — tách khỏi DoctorLicenseController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message + status logic giữ nguyên.
/// roles + userId truyền từ controller (thay cho GetUserId() + User.FindAll(ClaimTypes.Role) cũ đọc claim);
/// guard userId==Guid.Empty → Unauthorized() giữ ở controller (ServiceOutcome không biểu diễn 401). Return map về ServiceOutcome.
/// </summary>
public class DoctorLicenseService : IDoctorLicenseService
{
    private readonly HISDbContext _db;
    public DoctorLicenseService(HISDbContext db) { _db = db; }

    public async Task<ServiceOutcome> GetMyLicenseStatusAsync(List<string> roles, Guid userId)
    {
        // Non-clinical roles (Admin/Manager/Accountant/...) bypass CCHN check
        // so they can still open the OPD page for supervision/demo without
        // being blocked from saving an exam they legitimately would not do.
        var isClinical = roles.Any(r =>
            r.Equals("Doctor", StringComparison.OrdinalIgnoreCase) ||
            r.Equals("Nurse", StringComparison.OrdinalIgnoreCase) ||
            r.Equals("Physician", StringComparison.OrdinalIgnoreCase));

        if (!isClinical)
        {
            return ServiceOutcome.Ok(new LicenseStatusDto(
                HasProfile: false,
                IsValid: true,  // non-clinical → allowed to proceed
                Status: "NonClinical",
                LicenseNumber: null,
                IssueDate: null,
                ExpiryDate: null,
                DaysUntilExpiry: null,
                Specialty: null,
                Message: "Tài khoản phi lâm sàng — không cần CCHN."));
        }

        var staff = await _db.MedicalStaffs.FirstOrDefaultAsync(s => s.UserId == userId);
        if (staff == null)
        {
            return ServiceOutcome.Ok(new LicenseStatusDto(
                HasProfile: false,
                IsValid: false,
                Status: "NoStaffProfile",
                LicenseNumber: null,
                IssueDate: null,
                ExpiryDate: null,
                DaysUntilExpiry: null,
                Specialty: null,
                Message: "Chưa có hồ sơ nhân sự. Liên hệ phòng nhân sự cập nhật."));
        }

        if (string.IsNullOrWhiteSpace(staff.LicenseNumber))
        {
            return ServiceOutcome.Ok(new LicenseStatusDto(
                HasProfile: true,
                IsValid: false,
                Status: "NoLicense",
                LicenseNumber: null,
                IssueDate: staff.LicenseIssueDate,
                ExpiryDate: staff.LicenseExpiryDate,
                DaysUntilExpiry: null,
                Specialty: staff.Specialty,
                Message: "Bạn chưa có CCHN — không được phép khám bệnh theo quy định."));
        }

        if (!staff.LicenseActive)
        {
            return ServiceOutcome.Ok(new LicenseStatusDto(
                HasProfile: true,
                IsValid: false,
                Status: "Inactive",
                LicenseNumber: staff.LicenseNumber,
                IssueDate: staff.LicenseIssueDate,
                ExpiryDate: staff.LicenseExpiryDate,
                DaysUntilExpiry: null,
                Specialty: staff.Specialty,
                Message: "CCHN của bạn đang tạm ngưng hoặc thu hồi."));
        }

        int? daysUntilExpiry = null;
        if (staff.LicenseExpiryDate.HasValue)
        {
            var today = DateTime.UtcNow.Date;
            daysUntilExpiry = (int)(staff.LicenseExpiryDate.Value.Date - today).TotalDays;
            if (daysUntilExpiry < 0)
            {
                return ServiceOutcome.Ok(new LicenseStatusDto(
                    HasProfile: true,
                    IsValid: false,
                    Status: "Expired",
                    LicenseNumber: staff.LicenseNumber,
                    IssueDate: staff.LicenseIssueDate,
                    ExpiryDate: staff.LicenseExpiryDate,
                    DaysUntilExpiry: daysUntilExpiry,
                    Specialty: staff.Specialty,
                    Message: $"CCHN đã hết hạn {Math.Abs(daysUntilExpiry.Value)} ngày. Gia hạn trước khi khám."));
            }
        }

        return ServiceOutcome.Ok(new LicenseStatusDto(
            HasProfile: true,
            IsValid: true,
            Status: "Valid",
            LicenseNumber: staff.LicenseNumber,
            IssueDate: staff.LicenseIssueDate,
            ExpiryDate: staff.LicenseExpiryDate,
            DaysUntilExpiry: daysUntilExpiry,
            Specialty: staff.Specialty,
            Message: daysUntilExpiry.HasValue && daysUntilExpiry < 30
                ? $"CCHN còn {daysUntilExpiry} ngày. Nhớ gia hạn."
                : "CCHN hợp lệ"));
    }
}
