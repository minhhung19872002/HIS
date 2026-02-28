using System.Globalization;

namespace HIS.Application.DTOs.Insurance;

/// <summary>
/// DTOs for BHXH Gateway communication (request/response).
/// Field names follow BHXH conventions (Vietnamese abbreviations).
/// Date format: yyyyMMddHHmm per BHXH specification.
/// </summary>

#region Helpers

public static class BhxhDateHelper
{
    private const string BhxhDateFormat = "yyyyMMddHHmm";
    private const string BhxhDateOnlyFormat = "yyyyMMdd";

    public static string ToBhxhDate(DateTime? dt)
        => dt?.ToString(BhxhDateFormat, CultureInfo.InvariantCulture) ?? "";

    public static string ToBhxhDateOnly(DateTime? dt)
        => dt?.ToString(BhxhDateOnlyFormat, CultureInfo.InvariantCulture) ?? "";

    public static DateTime? FromBhxhDate(string? dateStr)
    {
        if (string.IsNullOrWhiteSpace(dateStr)) return null;
        if (DateTime.TryParseExact(dateStr, BhxhDateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            return dt;
        if (DateTime.TryParseExact(dateStr, BhxhDateOnlyFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
            return dt;
        return null;
    }
}

#endregion

#region Token

public class BhxhTokenResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

#endregion

#region Card Verification

public class BhxhCardVerifyRequest
{
    public string MaThe { get; set; } = string.Empty;
    public string HoTen { get; set; } = string.Empty;
    public DateTime NgaySinh { get; set; }
    public string MaCsKcb { get; set; } = string.Empty;
}

public class BhxhCardVerifyResponse
{
    // Identity
    public string MaThe { get; set; } = string.Empty;
    public string HoTen { get; set; } = string.Empty;
    public DateTime NgaySinh { get; set; }
    public int GioiTinh { get; set; }
    public string DiaChi { get; set; } = string.Empty;

    // Card validity
    public DateTime GtTheTu { get; set; }
    public DateTime GtTheDen { get; set; }
    public string MaDkbd { get; set; } = string.Empty;
    public string TenDkbd { get; set; } = string.Empty;

    // Coverage
    public string MucHuong { get; set; } = string.Empty;
    public bool DuDkKcb { get; set; }
    public string? LyDoKhongDuDk { get; set; }
    public bool MienCungCt { get; set; }
    public string? MaLyDoMien { get; set; }
    public DateTime? NgayDu5Nam { get; set; }
    public bool IsTraTruoc { get; set; }
    public string MaKv { get; set; } = string.Empty;
    public string LoaiThe { get; set; } = string.Empty;

    // Verification metadata
    public DateTime VerificationTime { get; set; }
    public string VerificationToken { get; set; } = string.Empty;
}

#endregion

#region Treatment History

public class BhxhTreatmentHistoryRequest
{
    public string MaThe { get; set; } = string.Empty;
    public string? Otp { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class BhxhTreatmentHistoryResponse
{
    public string MaThe { get; set; } = string.Empty;
    public List<BhxhVisitRecord> Visits { get; set; } = new();
}

public class BhxhVisitRecord
{
    public string MaCsKcb { get; set; } = string.Empty;
    public string TenCsKcb { get; set; } = string.Empty;
    public DateTime NgayKcb { get; set; }
    public string MaLoaiKcb { get; set; } = string.Empty;
    public string MaBenhChinh { get; set; } = string.Empty;
    public string TenBenhChinh { get; set; } = string.Empty;
    public decimal TienBhyt { get; set; }
}

#endregion

#region Cost Submission

public class BhxhSubmitRequest
{
    public string XmlBase64 { get; set; } = string.Empty;
    public string BatchCode { get; set; } = string.Empty;
    public string FacilityCode { get; set; } = string.Empty;
}

public class BhxhSubmitResponse
{
    public string? TransactionId { get; set; }
    public string? Message { get; set; }
    public int Status { get; set; } // 0=received, 1=processing, 2=completed, 3=error
}

#endregion

#region Assessment Result

public class BhxhAssessmentResponse
{
    public string TransactionId { get; set; } = string.Empty;
    public int Status { get; set; } // 0=processing, 1=completed, 2=error
    public int TotalRecords { get; set; }
    public int AcceptedRecords { get; set; }
    public int RejectedRecords { get; set; }
    public List<BhxhAssessmentItem> Items { get; set; } = new();
    public string? Message { get; set; }
}

public class BhxhAssessmentItem
{
    public string MaLk { get; set; } = string.Empty;
    public bool IsAccepted { get; set; }
    public string? RejectCode { get; set; }
    public string? RejectReason { get; set; }
    public decimal? ClaimAmount { get; set; }
    public decimal? AcceptedAmount { get; set; }
}

#endregion

#region Check-In

public class BhxhCheckInRequest
{
    public string MaThe { get; set; } = string.Empty;
    public string HoTen { get; set; } = string.Empty;
    public DateTime NgaySinh { get; set; }
    public string MaCsKcb { get; set; } = string.Empty;
    public DateTime NgayVao { get; set; }
}

public class BhxhCheckInResponse
{
    public string? MaLk { get; set; }
    public int Status { get; set; } // 0=success, 1=duplicate, 2=invalid card, 3=error
    public string? Message { get; set; }
}

#endregion
