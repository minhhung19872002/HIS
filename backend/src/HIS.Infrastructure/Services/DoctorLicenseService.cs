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

        // A suspended/resigned staff kept "Valid" as long as the licence row itself was active.
        if (!staff.LicenseActive
            || string.Equals(staff.Status, "Suspended", StringComparison.OrdinalIgnoreCase)
            || string.Equals(staff.Status, "Resigned", StringComparison.OrdinalIgnoreCase))
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
            // Local (VN) calendar day: UtcNow.Date kept a licence that expired yesterday valid until 07:00.
            var today = DateTime.Today;
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

    public async Task<PracticeLicenseGateDto> EvaluatePrescribingGateAsync(Guid userId)
    {
        HIS.Core.Common.PracticeLicenseGate.StaffEvidence? staffEvidence = null;
        var numbers = new List<string>();
        if (userId != Guid.Empty)
        {
            var staff = await _db.MedicalStaffs.AsNoTracking()
                .Where(s => s.UserId == userId && !s.IsDeleted)
                .OrderByDescending(s => s.LicenseExpiryDate)
                .Select(s => new { s.LicenseNumber, s.LicenseExpiryDate, s.LicenseActive, s.Status })
                .FirstOrDefaultAsync();
            if (staff != null)
            {
                staffEvidence = new(staff.LicenseNumber, staff.LicenseExpiryDate, staff.LicenseActive, staff.Status);
                if (!string.IsNullOrWhiteSpace(staff.LicenseNumber)) numbers.Add(staff.LicenseNumber.Trim());
            }
            var userLicence = await _db.Users.AsNoTracking().Where(u => u.Id == userId)
                .Select(u => u.LicenseNumber).FirstOrDefaultAsync();
            if (!string.IsNullOrWhiteSpace(userLicence)) numbers.Add(userLicence.Trim());
        }

        // Registry rows are linked ONLY by licence number: a holder-name match is not a positive link (namesakes),
        // and no CCCD of the user exists anywhere to match PracticeLicenses.Cccd against.
        var registry = numbers.Count == 0
            ? new List<HIS.Core.Common.PracticeLicenseGate.RegistryEvidence>()
            : await _db.PracticeLicenses.AsNoTracking()
                .Where(l => !l.IsDeleted && numbers.Contains(l.LicenseCode))
                .Select(l => new HIS.Core.Common.PracticeLicenseGate.RegistryEvidence(l.LicenseCode, l.Status, l.IssueDate, l.ExpiryDate))
                .ToListAsync();

        var r = HIS.Core.Common.PracticeLicenseGate.Evaluate(staffEvidence, registry, HIS.Core.Common.VnTime.TodayVn);

        // QA-R9: admin switch SystemConfigs "Clinical.PracticeLicenseGateMode" (seeded by migration 215).
        // Block (default, also when the row is missing) = refuse on positive evidence; Warn = never refuse, show the finding.
        if (r.Blocked && await IsPracticeLicenseWarnModeAsync())
            return new PracticeLicenseGateDto(HIS.Core.Common.PracticeLicenseGate.LevelWarning, false, r.Status,
                "[Chế độ chỉ cảnh báo — hệ thống KHÔNG chặn kê đơn/chỉ định] "
                + r.Message.Replace(" — không được kê đơn/chỉ định", ""), r.LicenseNumber, r.ExpiryDate);
        return new PracticeLicenseGateDto(r.Level, r.Blocked, r.Status, r.Message, r.LicenseNumber, r.ExpiryDate);
    }

    public const string PracticeLicenseGateModeKey = "Clinical.PracticeLicenseGateMode";

    private async Task<bool> IsPracticeLicenseWarnModeAsync()
    {
        var mode = await _db.SystemConfigs.AsNoTracking()
            .Where(c => c.ConfigKey == PracticeLicenseGateModeKey && c.IsActive && !c.IsDeleted)
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync();
        return string.Equals(mode?.Trim(), "Warn", StringComparison.OrdinalIgnoreCase);
    }
}
