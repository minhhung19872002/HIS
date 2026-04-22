namespace HIS.Core.Entities;

/// <summary>
/// Link chia sẻ ca chụp PACS với password + TTL — Sprint 4 Item 2.18.
/// BS tạo link → copy gửi BN/đồng nghiệp → mở ngoài mạng, xác thực password,
/// xem ảnh DICOM read-only qua viewer public.
/// </summary>
public class StudyShareLink : BaseEntity
{
    /// <summary>Random token trong URL — VD: /shared/abc123def456</summary>
    public string Token { get; set; } = string.Empty;

    public string StudyInstanceUID { get; set; } = string.Empty;
    public string? OrthancStudyId { get; set; }

    public Guid? PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    /// <summary>SHA-256 hash của password. Null = không cần password.</summary>
    public string? PasswordHash { get; set; }

    /// <summary>Ẩn thông tin demographics khi render viewer (tên BN, DOB, CCCD)</summary>
    public bool HideDemographics { get; set; }

    /// <summary>Link hết hạn. Null = không hết hạn (chỉ dùng khi sensitive).</summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>Số lần đã xem. Có thể dùng để giới hạn max views.</summary>
    public int ViewCount { get; set; }
    public int? MaxViews { get; set; }

    public Guid CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }

    public bool IsRevoked { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokeReason { get; set; }

    public string? LastViewerIp { get; set; }
    public DateTime? LastViewedAt { get; set; }
}
