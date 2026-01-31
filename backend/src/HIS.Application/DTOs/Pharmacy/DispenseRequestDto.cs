namespace HIS.Application.DTOs.Pharmacy;

/// <summary>
/// DTO yêu cầu cấp phát thuốc - Dispense Request
/// </summary>
public class DispenseRequestDto
{
    public Guid Id { get; set; }

    // Thông tin đơn thuốc
    public Guid PrescriptionId { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;

    // Thông tin bệnh nhân
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int? Age { get; set; }
    public string? PhoneNumber { get; set; }

    // Mã phiếu cấp phát
    public string RequestCode { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; }

    // Kho xuất thuốc
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    // Trạng thái: 0=Chờ cấp phát, 1=Đang xử lý, 2=Đã cấp đủ, 3=Cấp thiếu, 4=Đã hủy
    public int Status { get; set; }
    public string? StatusName => Status switch
    {
        0 => "Chờ cấp phát",
        1 => "Đang xử lý",
        2 => "Đã cấp đủ",
        3 => "Cấp thiếu",
        4 => "Đã hủy",
        _ => ""
    };

    // Chi phí
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Thanh toán
    public bool IsPaid { get; set; }
    public DateTime? PaidAt { get; set; }

    // Loại bệnh nhân: 1=BHYT, 2=Viện phí, 3=Dịch vụ
    public int PatientType { get; set; }
    public string? InsuranceNumber { get; set; }

    // Thông tin bác sĩ kê đơn
    public Guid DoctorId { get; set; }
    public string? DoctorName { get; set; }

    public Guid DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    // Chẩn đoán
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }

    // Danh sách thuốc cần cấp
    public List<DispenseItemDto> Items { get; set; } = new();

    // Người cấp phát
    public Guid? DispensedBy { get; set; }
    public string? DispenserName { get; set; }
    public DateTime? DispensedAt { get; set; }

    // Ghi chú
    public string? Note { get; set; }
    public string? CancellationReason { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// DTO tóm tắt yêu cầu cấp phát - Summary view
/// </summary>
public class DispenseRequestSummaryDto
{
    public Guid Id { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; }

    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public int Status { get; set; }
    public string? StatusName => Status switch
    {
        0 => "Chờ cấp phát",
        1 => "Đang xử lý",
        2 => "Đã cấp đủ",
        3 => "Cấp thiếu",
        4 => "Đã hủy",
        _ => ""
    };

    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }

    public int TotalItems { get; set; }
    public int DispensedItems { get; set; }

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO tạo yêu cầu cấp phát thuốc
/// </summary>
public class CreateDispenseRequestDto
{
    public Guid PrescriptionId { get; set; }
    public Guid WarehouseId { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO tìm kiếm yêu cầu cấp phát
/// </summary>
public class DispenseRequestSearchDto
{
    public string? Keyword { get; set; } // Tìm theo mã, tên BN
    public Guid? WarehouseId { get; set; }
    public int? Status { get; set; }
    public bool? IsPaid { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
