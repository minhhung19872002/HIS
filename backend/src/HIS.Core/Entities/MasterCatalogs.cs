namespace HIS.Core.Entities;

/// <summary>
/// NangCap22 — 13 catalog entities required by tender doc but missing from
/// the existing master-data set. Each follows the standard
/// Code/Name/Note/SortOrder/IsActive shape unless the catalog needs
/// additional pricing or mapping fields.
/// </summary>

// #1 — Hãng sản xuất (page 21, item 34)
public class Manufacturer : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Country { get; set; }
    public string? Address { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// #2 — Đường dùng (page 20, item 32) — also feeds XML 4210 BHXH
public class MedicationRoute : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Mã BHXH dùng trong XML 4210</summary>
    public string? BhxhCode { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// #3 — Phụ thu (page 15, item 18)
public class AdditionalCharge : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public string? Unit { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// #4 — Thu khác (page 15, item 19)
public class OtherIncome : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public string? Unit { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// #5 — Vận chuyển BN (page 13, item 15)
public class TransportService : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>1 = theo km, 2 = theo lượt</summary>
    public int CalculationType { get; set; }
    /// <summary>Đơn giá theo km hoặc theo lượt</summary>
    public decimal UnitPrice { get; set; }
    /// <summary>Hệ số nhân với giá xăng (nếu CalculationType=1)</summary>
    public decimal? GasolineFactor { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// #6 — Giá xăng (page 14, item 16) — sửa giá -> auto cập nhật giá vận chuyển
public class GasolinePrice : BaseEntity
{
    /// <summary>RON 95, A95, E5, dầu diesel...</summary>
    public string FuelType { get; set; } = string.Empty;
    public decimal PricePerLitre { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public string? IssuedBy { get; set; }
    public string? Note { get; set; }
}

// #7 — Mã máy CDHA/Xét nghiệm gửi BHXH (page 17, item 25)
public class MachineCode : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? RoomId { get; set; }
    /// <summary>Mã BHXH</summary>
    public string? BhxhCode { get; set; }
    public string? Note { get; set; }
    public bool IsLocked { get; set; }
    public bool IsActive { get; set; } = true;
}

// #8 — Mapping dịch vụ ↔ Mã máy mặc định (page 18, item 26)
public class MachineService : BaseEntity
{
    public Guid MachineCodeId { get; set; }
    public Guid ServiceId { get; set; }
    public bool IsDefault { get; set; }
    public string? Note { get; set; }
}

// #9 — Hội đồng kiểm nhập (page 22, item 37)
public class InspectionCommittee : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
}

public class InspectionCommitteeMember : BaseEntity
{
    public Guid CommitteeId { get; set; }
    public Guid? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Role { get; set; } // Chủ tịch / Ủy viên / Thư ký
    public int SortOrder { get; set; }
}

// #10 — Chế độ chăm sóc nội trú (page 23, item 40)
public class NursingCareLevel : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>1 = Cấp 1 (chăm sóc toàn diện), 2 = Cấp 2, 3 = Cấp 3</summary>
    public int Level { get; set; }
    public string? Description { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// #11 — Loại bệnh án (page 17, item 24) — DB-driven, thay const front-end
public class MedicalRecordType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>1 = Ngoại trú, 2 = Nội trú, 3 = Cấp cứu, 4 = Khám sức khỏe...</summary>
    public int Category { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsLocked { get; set; }
}

// #12 — Cấu hình thứ tự ưu tiên phòng CLS (page 16, item 20)
public class ParaclinicalRoomPriority : BaseEntity
{
    public Guid ServiceId { get; set; }
    public Guid? RoomId { get; set; }
    public Guid? DepartmentId { get; set; }
    /// <summary>1 = phòng cấu hình, 2 = phòng của khoa, 3 = STT thiết lập</summary>
    public int PriorityLevel { get; set; }
    public int Sequence { get; set; }
    public string? Note { get; set; }
}

// #13 — Loại nhóm + Nhóm dịch vụ báo cáo (page 16-17, items 22-23)
public class ReportServiceGroupType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Nhãn báo cáo cha (e.g., "Theo nhóm BHXH")</summary>
    public string? ReportLabel { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ReportServiceGroup : BaseEntity
{
    public Guid GroupTypeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
