namespace HIS.Core.Entities;

/// <summary>
/// Quản lý giữ/trả giấy tờ bệnh nhân - Document Hold
/// </summary>
public class DocumentHold : BaseEntity
{
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    // Loại giấy tờ - Document Type
    // 1-CCCD/CMND, 2-Thẻ BHYT, 3-Giấy chuyển viện, 4-Giấy tờ khác
    public int DocumentType { get; set; }
    public string DocumentNumber { get; set; } = string.Empty; // Số giấy tờ
    public string? DocumentDescription { get; set; } // Mô tả chi tiết
    public string? Description { get; set; } // Mô tả ngắn
    public string? Notes { get; set; } // Ghi chú
    public int Quantity { get; set; } = 1; // Số lượng

    // Trạng thái - Status
    // 0-Đang giữ, 1-Đã trả, 2-Mất
    public int Status { get; set; }

    // Thông tin giữ - Hold Information
    public DateTime HoldDate { get; set; }
    public string HoldBy { get; set; } = string.Empty; // Người nhận giữ
    public Guid? HeldByUserId { get; set; } // ID người giữ
    public string? HoldNotes { get; set; }

    // Thông tin trả - Return Information
    public DateTime? ReturnDate { get; set; }
    public string? ReturnBy { get; set; } // Người trả
    public Guid? ReturnedByUserId { get; set; } // ID người trả
    public string? ReturnNotes { get; set; }
    public string? ReturnToPersonName { get; set; } // Tên người nhận lại
    public string? ReturnToPersonPhone { get; set; } // SĐT người nhận lại
    public string? ReturnToPersonRelation { get; set; } // Quan hệ với BN
}
