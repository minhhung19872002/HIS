namespace HIS.Application.DTOs.Pharmacy;

/// <summary>
/// DTO chi tiết mặt hàng cấp phát - Individual Dispense Item
/// </summary>
public class DispenseItemDto
{
    public Guid Id { get; set; }

    // Tham chiếu đơn thuốc
    public Guid DispenseRequestId { get; set; }
    public Guid? PrescriptionDetailId { get; set; }

    // Thông tin thuốc
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Concentration { get; set; }
    public string? Unit { get; set; }

    // Số lượng
    public decimal OrderedQuantity { get; set; } // Số lượng kê đơn
    public decimal DispensedQuantity { get; set; } // Số lượng đã cấp
    public decimal RemainingQuantity => OrderedQuantity - DispensedQuantity;

    // Thông tin lô hàng
    public string? BatchNumber { get; set; } // Số lô
    public DateTime? ExpiryDate { get; set; } // Hạn sử dụng
    public DateTime? ManufactureDate { get; set; } // Ngày sản xuất

    // Tồn kho
    public Guid? InventoryItemId { get; set; }
    public decimal? AvailableStock { get; set; } // Tồn kho khả dụng

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Loại BN: 1=BHYT, 2=Viện phí, 3=Dịch vụ
    public int PatientType { get; set; }
    public int InsurancePaymentRate { get; set; }

    // Hướng dẫn sử dụng
    public string? Dosage { get; set; } // Liều dùng
    public string? Frequency { get; set; } // Tần suất (ngày 3 lần)
    public string? Route { get; set; } // Đường dùng (Uống, Tiêm...)
    public string? Usage { get; set; } // Cách dùng chi tiết

    // Liều theo buổi
    public decimal? MorningDose { get; set; } // Sáng
    public decimal? NoonDose { get; set; } // Trưa
    public decimal? EveningDose { get; set; } // Chiều
    public decimal? NightDose { get; set; } // Tối

    // Trạng thái: 0=Chờ cấp, 1=Đã cấp đủ, 2=Cấp thiếu, 3=Không đủ tồn kho, 4=Đã hoàn trả
    public int Status { get; set; }
    public string? StatusName => Status switch
    {
        0 => "Chờ cấp",
        1 => "Đã cấp đủ",
        2 => "Cấp thiếu",
        3 => "Không đủ tồn kho",
        4 => "Đã hoàn trả",
        _ => ""
    };

    // Ghi chú
    public string? Note { get; set; }
    public string? DispenseNote { get; set; }

    // Người cấp phát
    public Guid? DispensedBy { get; set; }
    public DateTime? DispensedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// DTO cấp phát thuốc
/// </summary>
public class DispenseItemInputDto
{
    public Guid PrescriptionDetailId { get; set; }
    public Guid MedicineId { get; set; }
    public decimal DispensedQuantity { get; set; }
    public Guid? InventoryItemId { get; set; } // Chọn lô cụ thể
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO hoàn trả thuốc
/// </summary>
public class ReturnMedicineDto
{
    public Guid DispenseItemId { get; set; }
    public decimal ReturnQuantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Note { get; set; }
}

/// <summary>
/// DTO lịch sử cấp phát của mặt hàng
/// </summary>
public class DispenseItemHistoryDto
{
    public DateTime DispenseDate { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? BatchNumber { get; set; }
    public string DispenserName { get; set; } = string.Empty;
    public int Status { get; set; }
}
