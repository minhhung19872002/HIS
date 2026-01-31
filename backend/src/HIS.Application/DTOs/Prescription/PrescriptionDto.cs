namespace HIS.Application.DTOs.Prescription;

/// <summary>
/// DTO cho đơn thuốc - Prescription
/// </summary>
public class PrescriptionDto
{
    public Guid Id { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public DateTime PrescriptionDate { get; set; }

    // Thông tin bệnh nhân
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public string? GenderName => Gender switch { 1 => "Nam", 2 => "Nữ", _ => "Khác" };
    public DateTime? DateOfBirth { get; set; }
    public int? YearOfBirth { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }

    // BHYT
    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public string? PatientTypeName => PatientType switch { 1 => "BHYT", 2 => "Viện phí", 3 => "Dịch vụ", _ => "" };
    public string? InsuranceNumber { get; set; }
    public DateTime? InsuranceExpireDate { get; set; }
    public int InsuranceRightRoute { get; set; } // 1-Đúng tuyến, 2-Trái tuyến, 3-Thông tuyến

    // Liên kết
    public Guid MedicalRecordId { get; set; }
    public string? MedicalRecordCode { get; set; }
    public Guid? ExaminationId { get; set; }

    // Bác sĩ kê đơn
    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string? DoctorTitle { get; set; }

    // Khoa/Phòng kê
    public Guid DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }

    // Kho xuất
    public Guid? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }

    // Chẩn đoán
    public string DiagnosisCode { get; set; } = string.Empty;
    public string DiagnosisName { get; set; } = string.Empty;
    public string? SubDiagnosis { get; set; }

    // Loại đơn
    public int PrescriptionType { get; set; } // 1-Ngoại trú, 2-Nội trú, 3-Nhà thuốc, 4-YHCT
    public string? PrescriptionTypeName => PrescriptionType switch
    {
        1 => "Ngoại trú",
        2 => "Nội trú",
        3 => "Nhà thuốc",
        4 => "YHCT",
        _ => ""
    };
    public int TotalDays { get; set; } // Số ngày đơn thuốc
    public int TotalTangs { get; set; } // Số thang (YHCT)

    // Chi phí
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public decimal DiscountAmount { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Chờ duyệt, 1-Một phần, 2-Đã cấp phát, 3-Hủy
    public string? StatusName => Status switch
    {
        0 => "Chờ duyệt",
        1 => "Cấp phát một phần",
        2 => "Đã cấp phát",
        3 => "Hủy",
        _ => ""
    };
    public bool IsDispensed { get; set; } // Đã cấp phát
    public DateTime? DispensedAt { get; set; }
    public string? DispensedByName { get; set; }

    // Lời dặn
    public string? Notes { get; set; }
    public string? Instructions { get; set; } // Lời dặn bác sĩ

    // Người tạo
    public DateTime CreatedAt { get; set; }
    public string? CreatedByName { get; set; }

    // Chi tiết thuốc
    public List<PrescriptionItemDto> Items { get; set; } = new();

    // Thống kê
    public int TotalItems { get; set; }
    public int DispensedItems { get; set; }
    public int PendingItems { get; set; }
}

/// <summary>
/// DTO tóm tắt đơn thuốc cho danh sách
/// </summary>
public class PrescriptionSummaryDto
{
    public Guid Id { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public DateTime PrescriptionDate { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string DiagnosisCode { get; set; } = string.Empty;
    public string DiagnosisName { get; set; } = string.Empty;
    public int Status { get; set; }
    public string? StatusName => Status switch
    {
        0 => "Chờ duyệt",
        1 => "Cấp phát một phần",
        2 => "Đã cấp phát",
        3 => "Hủy",
        _ => ""
    };
    public decimal TotalAmount { get; set; }
    public int TotalItems { get; set; }
}
