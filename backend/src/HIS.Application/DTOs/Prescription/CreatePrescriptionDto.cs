namespace HIS.Application.DTOs.Prescription;

/// <summary>
/// DTO để tạo đơn thuốc mới
/// </summary>
public class CreatePrescriptionDto
{
    // Liên kết
    public Guid MedicalRecordId { get; set; }
    public Guid? ExaminationId { get; set; }

    // Bệnh nhân (lấy từ MedicalRecord nếu không truyền)
    public Guid? PatientId { get; set; }
    public int PatientType { get; set; } = 1; // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public string? InsuranceNumber { get; set; }
    public DateTime? InsuranceExpireDate { get; set; }
    public int InsuranceRightRoute { get; set; } = 1; // 1-Đúng tuyến, 2-Trái tuyến, 3-Thông tuyến

    // Bác sĩ kê đơn (lấy từ context nếu không truyền)
    public Guid? DoctorId { get; set; }

    // Khoa/Phòng (lấy từ context nếu không truyền)
    public Guid? DepartmentId { get; set; }
    public Guid? RoomId { get; set; }

    // Kho xuất (tự động chọn nếu không truyền)
    public Guid? WarehouseId { get; set; }

    // Chẩn đoán
    public string DiagnosisCode { get; set; } = string.Empty;
    public string DiagnosisName { get; set; } = string.Empty;
    public string? SubDiagnosis { get; set; }

    // Loại đơn
    public int PrescriptionType { get; set; } = 1; // 1-Ngoại trú, 2-Nội trú, 3-Nhà thuốc, 4-YHCT
    public int TotalDays { get; set; } = 1; // Số ngày đơn thuốc
    public int TotalTangs { get; set; } = 0; // Số thang (YHCT)

    // Lời dặn
    public string? Notes { get; set; }
    public string? Instructions { get; set; } // Lời dặn bác sĩ

    // Chi tiết thuốc
    public List<CreatePrescriptionItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO để cập nhật đơn thuốc
/// </summary>
public class UpdatePrescriptionDto
{
    public Guid Id { get; set; }

    // Kho xuất
    public Guid? WarehouseId { get; set; }

    // Chẩn đoán
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? SubDiagnosis { get; set; }

    // Loại đơn
    public int? PrescriptionType { get; set; }
    public int? TotalDays { get; set; }
    public int? TotalTangs { get; set; }

    // Lời dặn
    public string? Notes { get; set; }
    public string? Instructions { get; set; }

    // Chi tiết thuốc (null = không cập nhật, empty = xóa hết, có items = thay thế)
    public List<UpdatePrescriptionItemDto>? Items { get; set; }
}

/// <summary>
/// DTO để tìm kiếm đơn thuốc
/// </summary>
public class PrescriptionSearchDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientKeyword { get; set; } // Mã BN, Tên, SĐT
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public string? PrescriptionCode { get; set; }
    public string? DiagnosisCode { get; set; }
    public int? Status { get; set; } // 0-Chờ, 1-Một phần, 2-Đã cấp, 3-Hủy
    public int? PrescriptionType { get; set; } // 1-Ngoại trú, 2-Nội trú, 3-Nhà thuốc, 4-YHCT
    public int? PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public bool? IsDispensed { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// DTO cấp phát thuốc
/// </summary>
public class DispensePrescriptionDto
{
    public Guid PrescriptionId { get; set; }
    public Guid WarehouseId { get; set; }
    public List<DispensePrescriptionItemDto> Items { get; set; } = new();
    public string? Note { get; set; }
}

/// <summary>
/// DTO cấp phát từng thuốc
/// </summary>
public class DispensePrescriptionItemDto
{
    public Guid PrescriptionItemId { get; set; }
    public decimal DispensedQuantity { get; set; }
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
}

/// <summary>
/// DTO hủy đơn thuốc
/// </summary>
public class CancelPrescriptionDto
{
    public Guid PrescriptionId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// DTO sao chép đơn thuốc
/// </summary>
public class CopyPrescriptionDto
{
    public Guid SourcePrescriptionId { get; set; }
    public Guid MedicalRecordId { get; set; }
    public Guid? ExaminationId { get; set; }
    public bool CopyAllItems { get; set; } = true;
    public List<Guid>? SelectedItemIds { get; set; } // Chỉ copy các thuốc được chọn
}

/// <summary>
/// DTO in đơn thuốc
/// </summary>
public class PrescriptionPrintDto
{
    public PrescriptionDto Prescription { get; set; } = null!;
    public string HospitalName { get; set; } = string.Empty;
    public string HospitalAddress { get; set; } = string.Empty;
    public string HospitalPhone { get; set; } = string.Empty;
    public string? HospitalLogo { get; set; }
    public DateTime PrintDate { get; set; }
    public string? PrintedBy { get; set; }
    public string? QRCode { get; set; } // QR code cho tra cứu đơn thuốc
}
