namespace HIS.Core.Entities;

/// <summary>
/// Phê duyệt cấp phát kho Dược — quy trình 5 loại theo chuẩn HIS VN.
/// 1 = Duyệt cấp theo kho dự trù (kho chính duyệt phiếu DT của khoa)
/// 2 = Duyệt cấp theo người bệnh (kho duyệt phiếu lệnh thuốc theo BN nội trú)
/// 3 = Duyệt bù cơ số tủ trực theo BN (bù lại thuốc tủ trực đã dùng)
/// 4 = Duyệt cấp hao phí theo khoa/phòng (thuốc dùng chung, không theo BN)
/// 5 = Duyệt hoàn trả theo BN (hoàn trả thuốc thừa về kho)
///
/// State machine 5 trạng thái:
/// 0 = Đang nhập (phiếu đang nhập dở, chưa gửi)
/// 1 = Chưa nhập (phiếu mới tạo rỗng)
/// 2 = Đã chuyển (khoa gửi xuống kho, chờ duyệt)
/// 3 = Đã duyệt (kho duyệt — trừ tồn, sinh ExportReceipt)
/// 4 = Đã thu hồi (kho hủy sau khi duyệt — hoàn tồn lại)
/// </summary>
public class PharmacyApproval : BaseEntity
{
    public string ApprovalCode { get; set; } = string.Empty;
    public int ApprovalType { get; set; }

    public Guid? FromDepartmentId { get; set; }
    public virtual Department? FromDepartment { get; set; }

    public Guid? ToWarehouseId { get; set; }
    public virtual Warehouse? ToWarehouse { get; set; }

    public Guid? FromWarehouseId { get; set; }
    public virtual Warehouse? FromWarehouse { get; set; }

    /// <summary>BN đích (chỉ áp dụng cho type 2/3/5)</summary>
    public Guid? PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    /// <summary>Đối tượng khóa: BHYT / ThuPhi / BHBL / HaoPhi — nếu có, các item mới tự động dùng đối tượng này</summary>
    public string? LockedObject { get; set; }

    public DateTime RequestDate { get; set; }
    public int Status { get; set; }

    public Guid? RequestedBy { get; set; }
    public DateTime? RequestedAt { get; set; }

    public Guid? SubmittedBy { get; set; }
    public DateTime? SubmittedAt { get; set; }

    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public Guid? RevokedBy { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokeReason { get; set; }

    public string? Note { get; set; }

    public virtual ICollection<PharmacyApprovalItem> Items { get; set; } = new List<PharmacyApprovalItem>();
}

/// <summary>
/// Dòng chi tiết của phiếu phê duyệt — 1 thuốc/VTYT kèm lô SX & hạn dùng.
/// </summary>
public class PharmacyApprovalItem : BaseEntity
{
    public Guid PharmacyApprovalId { get; set; }
    public virtual PharmacyApproval PharmacyApproval { get; set; } = null!;

    public Guid? MedicineId { get; set; }
    public virtual Medicine? Medicine { get; set; }

    public Guid? SupplyId { get; set; }
    public virtual MedicalSupply? Supply { get; set; }

    public Guid? InventoryItemId { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }

    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal RequestedQuantity { get; set; }
    public decimal ApprovedQuantity { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public string? ObjectType { get; set; }
    public string? UsageInstruction { get; set; }
    public string? Note { get; set; }

    public bool IsExcluded { get; set; }
}

/// <summary>
/// Audit log cho đổi trạng thái PharmacyApproval.
/// </summary>
public class PharmacyApprovalLog : BaseEntity
{
    public Guid PharmacyApprovalId { get; set; }
    public virtual PharmacyApproval PharmacyApproval { get; set; } = null!;

    public int FromStatus { get; set; }
    public int ToStatus { get; set; }
    public string Action { get; set; } = string.Empty;
    public Guid ActorId { get; set; }
    public DateTime ActedAt { get; set; }
    public string? Note { get; set; }
}
