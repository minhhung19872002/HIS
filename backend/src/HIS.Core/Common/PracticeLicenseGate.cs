namespace HIS.Core.Common;

/// <summary>
/// Gate deciding whether the acting user may create/issue prescriptions and service orders, based on the
/// practice licence (CCHN) evidence the hospital holds about them.
///
/// Safety principle: block ONLY on positive evidence (a licence that IS expired, suspended or revoked).
/// Missing data (no HR profile, no licence number, no registry record, no expiry date) never blocks — it
/// yields a warning so the doctor is not locked out of emergency work because HR has not entered a record.
/// </summary>
public static class PracticeLicenseGate
{
    public const string LevelOk = "Ok";
    public const string LevelWarning = "Warning";
    public const string LevelBlocked = "Blocked";

    /// <summary>Who can lift a block — included in every refusal so the user knows where to go.</summary>
    public const string UnblockHint =
        "Liên hệ phòng Tổ chức cán bộ/Nhân sự cập nhật CCHN (màn Nhân sự y tế hoặc Quản lý hành nghề) để được mở khóa.";

    /// <summary>Licence facts from the HR profile (MedicalStaffs row linked by UserId).</summary>
    public sealed record StaffEvidence(string? LicenseNumber, DateTime? ExpiryDate, bool LicenseActive, string? StaffStatus);

    /// <summary>One PracticeLicenses registry row linked by licence number or CCCD.
    /// Status: 0=active, 1=expired, 2=suspended, 3=revoked.</summary>
    public sealed record RegistryEvidence(string LicenseCode, int Status, DateTime? IssueDate, DateTime? ExpiryDate);

    public sealed record Result(string Level, string Status, string Message, string? LicenseNumber, DateTime? ExpiryDate)
    {
        public bool Blocked => Level == LevelBlocked;
    }

    public static Result Evaluate(StaffEvidence? staff, IReadOnlyCollection<RegistryEvidence> registry, DateTime today)
    {
        today = today.Date;
        var staffHasLicence = staff != null && !string.IsNullOrWhiteSpace(staff.LicenseNumber);

        // The registry's current record = the one with the latest expiry (no expiry = open-ended = latest).
        var current = registry
            .OrderByDescending(r => r.ExpiryDate ?? DateTime.MaxValue)
            .ThenByDescending(r => r.IssueDate ?? DateTime.MinValue)
            .FirstOrDefault();

        if (!staffHasLicence && current == null)
            return new Result(LevelWarning, "NoData",
                "Chưa có dữ liệu CCHN (hồ sơ nhân sự/sổ quản lý hành nghề) — hệ thống CHƯA kiểm tra được CCHN của bạn. "
                + "Đề nghị phòng Nhân sự cập nhật.", null, null);

        // 1) Suspension / revocation is positive evidence on its own.
        if (staffHasLicence && (!staff!.LicenseActive
                || string.Equals(staff.StaffStatus, "Suspended", StringComparison.OrdinalIgnoreCase)))
            return new Result(LevelBlocked, "Suspended",
                $"CCHN số {staff.LicenseNumber} đang bị tạm ngưng/thu hồi (hồ sơ nhân sự). {UnblockHint}",
                staff.LicenseNumber, staff.ExpiryDate);
        if (current is { Status: 2 or 3 })
            return new Result(LevelBlocked, current.Status == 2 ? "Suspended" : "Revoked",
                $"CCHN số {current.LicenseCode} đã bị {(current.Status == 2 ? "đình chỉ" : "thu hồi")} (sổ quản lý hành nghề). {UnblockHint}",
                current.LicenseCode, current.ExpiryDate);

        // 2) Expiry. A renewal recorded in only one of the two sources must not lock the doctor out.
        var staffExpired = staffHasLicence && staff!.ExpiryDate.HasValue && staff.ExpiryDate.Value.Date < today;
        var staffValidKnown = staffHasLicence && staff!.ExpiryDate.HasValue && staff.ExpiryDate.Value.Date >= today;
        var registryExpired = current != null
            && (current.Status == 1 || (current.ExpiryDate.HasValue && current.ExpiryDate.Value.Date < today));
        var registryValid = current != null && current.Status == 0
            && (!current.ExpiryDate.HasValue || current.ExpiryDate.Value.Date >= today);

        if (staffExpired || registryExpired)
        {
            var number = staffExpired ? staff!.LicenseNumber : current!.LicenseCode;
            var expiry = staffExpired ? staff!.ExpiryDate : current!.ExpiryDate;
            if (staffValidKnown || registryValid)
                return new Result(LevelWarning, "Mismatch",
                    $"Hai nguồn CCHN lệch nhau: số {number} ghi hết hạn"
                    + (expiry.HasValue ? $" ngày {expiry.Value:dd/MM/yyyy}" : "")
                    + " nhưng nguồn còn lại ghi còn hiệu lực. Đề nghị phòng Nhân sự đồng bộ.", number, expiry);
            return new Result(LevelBlocked, "Expired",
                $"CCHN số {number} đã hết hạn"
                + (expiry.HasValue ? $" ngày {expiry.Value:dd/MM/yyyy}" : "")
                + $" — không được kê đơn/chỉ định. {UnblockHint}", number, expiry);
        }

        var validNumber = staffHasLicence ? staff!.LicenseNumber : current!.LicenseCode;
        var validExpiry = new[] { staffHasLicence ? staff!.ExpiryDate : null, current?.ExpiryDate }
            .Where(d => d.HasValue).Select(d => d!.Value).DefaultIfEmpty().Max();
        DateTime? shownExpiry = validExpiry == default ? null : validExpiry;
        if (shownExpiry.HasValue && (shownExpiry.Value.Date - today).TotalDays <= 30)
            return new Result(LevelWarning, "ExpiringSoon",
                $"CCHN số {validNumber} sắp hết hạn ngày {shownExpiry.Value:dd/MM/yyyy}. Nhớ gia hạn.", validNumber, shownExpiry);
        return new Result(LevelOk, "Valid", "CCHN hợp lệ", validNumber, shownExpiry);
    }
}
