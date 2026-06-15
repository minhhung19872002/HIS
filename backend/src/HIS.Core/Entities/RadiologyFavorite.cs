using System.ComponentModel.DataAnnotations.Schema;

namespace HIS.Core.Entities;

/// <summary>
/// F2.8 #138: Ca chup yeu thich (Favorite) cua nguoi dung RIS — server-side, dong bo da thiet bi.
/// Entity khong ke thua BaseEntity de tranh ValueConverter Guid&lt;&gt;String conflict (HISDbContext whitelist CAN'T be modified here).
/// </summary>
public class RadiologyStudyFavorite
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Nguoi dung ghim ca chup (FK -> Users.Id)
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Phieu yeu cau CDHA (FK -> RadiologyRequests.Id)
    /// </summary>
    public Guid RequestId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation (optional — lazy load off by default)
    public virtual User? User { get; set; }
    [ForeignKey(nameof(RequestId))]
    public virtual RadiologyRequest? RadiologyRequest { get; set; }
}
