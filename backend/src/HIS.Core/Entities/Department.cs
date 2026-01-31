namespace HIS.Core.Entities;

/// <summary>
/// Khoa/Phòng - Department
/// </summary>
public class Department : BaseEntity
{
    public string DepartmentCode { get; set; } = string.Empty; // Mã khoa
    public string DepartmentName { get; set; } = string.Empty; // Tên khoa
    public string? DepartmentCodeBYT { get; set; } // Mã khoa theo BYT
    public int DepartmentType { get; set; } // 1-Khoa lâm sàng, 2-Khoa cận lâm sàng, 3-Khoa hành chính
    public string? Description { get; set; }
    public string? Location { get; set; } // Vị trí
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }

    public Guid? ParentId { get; set; }
    public virtual Department? Parent { get; set; }

    // Navigation properties
    public virtual ICollection<Department> Children { get; set; } = new List<Department>();
    public virtual ICollection<User> Users { get; set; } = new List<User>();
    public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
}

/// <summary>
/// Phòng - Room (Phòng khám, Phòng mổ, Phòng xét nghiệm...)
/// </summary>
public class Room : BaseEntity
{
    public string RoomCode { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string? RoomCodeBYT { get; set; } // Mã phòng theo BYT
    public int RoomType { get; set; } // 1-Phòng khám, 2-Phòng bệnh, 3-Phòng mổ, 4-Phòng xét nghiệm...
    public string? Location { get; set; }
    public int MaxPatients { get; set; } // Số bệnh nhân tối đa
    public int MaxInsurancePatients { get; set; } // Số BN BHYT tối đa
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }

    public Guid DepartmentId { get; set; }
    public virtual Department Department { get; set; } = null!;

    // Navigation properties
    public virtual ICollection<Bed> Beds { get; set; } = new List<Bed>();
}

/// <summary>
/// Giường bệnh - Bed
/// </summary>
public class Bed : BaseEntity
{
    public string BedCode { get; set; } = string.Empty;
    public string BedName { get; set; } = string.Empty;
    public int BedType { get; set; } // 1-Thường, 2-Dịch vụ, 3-ICU...
    public decimal DailyPrice { get; set; } // Giá giường/ngày
    public int Status { get; set; } // 0-Trống, 1-Đang sử dụng, 2-Bảo trì
    public bool IsActive { get; set; } = true;

    public Guid RoomId { get; set; }
    public virtual Room Room { get; set; } = null!;
}
