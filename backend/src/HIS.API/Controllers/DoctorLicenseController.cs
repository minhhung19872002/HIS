using System.Security.Claims;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Validate practice license (CCHN — Chứng chỉ hành nghề) for the calling doctor.
/// NangCap18 yêu cầu: cấm khám khi BS chưa có CCHN hoặc CCHN hết hạn.
/// </summary>
[ApiController]
[Route("api/doctor-license")]
[Authorize]
public class DoctorLicenseController : ControllerBase
{
    private readonly HISDbContext _db;

    public DoctorLicenseController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    public record LicenseStatusDto(
        bool HasProfile,
        bool IsValid,
        string Status, // Valid | NoLicense | Inactive | Expired | NoStaffProfile
        string? LicenseNumber,
        DateTime? IssueDate,
        DateTime? ExpiryDate,
        int? DaysUntilExpiry,
        string? Specialty,
        string Message);

    /// <summary>
    /// Kiểm tra CCHN của người đang login. Frontend OPD gọi khi load trang
    /// để hiển thị banner warning nếu không đủ điều kiện khám bệnh.
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<LicenseStatusDto>> GetMyLicenseStatus()
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        // Non-clinical roles (Admin/Manager/Accountant/...) bypass CCHN check
        // so they can still open the OPD page for supervision/demo without
        // being blocked from saving an exam they legitimately would not do.
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var isClinical = roles.Any(r =>
            r.Equals("Doctor", StringComparison.OrdinalIgnoreCase) ||
            r.Equals("Nurse", StringComparison.OrdinalIgnoreCase) ||
            r.Equals("Physician", StringComparison.OrdinalIgnoreCase));

        if (!isClinical)
        {
            return Ok(new LicenseStatusDto(
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
            return Ok(new LicenseStatusDto(
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
            return Ok(new LicenseStatusDto(
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
            return Ok(new LicenseStatusDto(
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
                return Ok(new LicenseStatusDto(
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

        return Ok(new LicenseStatusDto(
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
