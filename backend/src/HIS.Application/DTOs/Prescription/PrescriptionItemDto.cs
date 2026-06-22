using System.ComponentModel.DataAnnotations;
using HIS.Application.Common;

namespace HIS.Application.DTOs.Prescription;

/// <summary>
/// DTO cho chi tiết đơn thuốc - PrescriptionItem
/// </summary>
public class PrescriptionItemDto
{
    public Guid Id { get; set; }
    public Guid PrescriptionId { get; set; }

    // Thông tin thuốc
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; } // Hoạt chất
    public string? Concentration { get; set; } // Hàm lượng

    // Đơn vị và số lượng
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal DispensedQuantity { get; set; } // Số lượng đã cấp
    public decimal RemainingQuantity => Quantity - DispensedQuantity;

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public int InsurancePaymentRate { get; set; }

    // Liều dùng (Sáng - Trưa - Chiều - Tối)
    public decimal? MorningDose { get; set; }
    public decimal? NoonDose { get; set; }
    public decimal? EveningDose { get; set; }
    public decimal? NightDose { get; set; }
    public string? DosageDisplay => FormatDosage();

    // Hướng dẫn sử dụng
    public int DaysSupply { get; set; } // Số ngày dùng
    public string? Instructions { get; set; } // Cách dùng chi tiết
    public string? Route { get; set; } // Đường dùng (Uống, Tiêm, Bôi...)
    public string? Frequency { get; set; } // Tần suất (3 lần/ngày)
    public string? Timing { get; set; } // Thời gian (Trước ăn, Sau ăn...)

    // Thông tin lô thuốc
    public Guid? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime? ManufactureDate { get; set; }

    // Cảnh báo
    public bool IsNarcotic { get; set; } // Gây nghiện
    public bool IsPsychotropic { get; set; } // Hướng thần
    public bool IsAntibiotic { get; set; } // Kháng sinh
    public bool IsControlled { get; set; } // Kiểm soát đặc biệt
    public string? Warning { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Chờ, 1-Đã cấp, 2-Hoàn trả
    public string? StatusName => Status switch
    {
        0 => "Chờ cấp phát",
        1 => "Đã cấp phát",
        2 => "Hoàn trả",
        _ => ""
    };
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Định dạng liều dùng để hiển thị (Sáng - Trưa - Chiều - Tối)
    /// </summary>
    private string FormatDosage()
    {
        if (MorningDose == null && NoonDose == null && EveningDose == null && NightDose == null)
            return string.Empty;

        var morning = MorningDose?.ToString() ?? "0";
        var noon = NoonDose?.ToString() ?? "0";
        var evening = EveningDose?.ToString() ?? "0";
        var night = NightDose?.ToString() ?? "0";

        return $"{morning} - {noon} - {evening} - {night}";
    }
}

/// <summary>
/// DTO để tạo hoặc cập nhật chi tiết đơn thuốc
/// </summary>
public class CreatePrescriptionItemDto
{
    [NotEmptyGuid]
    public Guid MedicineId { get; set; }

    // Số lượng và đơn vị
    [Range(0, double.MaxValue, ErrorMessage = "Số lượng không được âm")]
    public decimal Quantity { get; set; }
    public string? Unit { get; set; }

    // Giá (tự động tính nếu không truyền)
    [Range(0, double.MaxValue, ErrorMessage = "Đơn giá không được âm")]
    public decimal? UnitPrice { get; set; }
    public int PatientType { get; set; } = 1; // 1-BHYT, 2-Viện phí, 3-Dịch vụ

    // Liều dùng
    [Range(0, double.MaxValue, ErrorMessage = "Liều dùng không được âm")]
    public decimal? MorningDose { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Liều dùng không được âm")]
    public decimal? NoonDose { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Liều dùng không được âm")]
    public decimal? EveningDose { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Liều dùng không được âm")]
    public decimal? NightDose { get; set; }

    // Hướng dẫn
    [Range(0, int.MaxValue, ErrorMessage = "Số ngày dùng không được âm")]
    public int DaysSupply { get; set; } = 1; // Số ngày dùng
    public string? Instructions { get; set; } // Cách dùng
    public string? Route { get; set; } // Đường dùng
    public string? Frequency { get; set; } // Tần suất
    public string? Timing { get; set; } // Thời gian dùng

    // Lô thuốc (tự động chọn nếu không truyền)
    public Guid? WarehouseId { get; set; }
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }

    public string? Note { get; set; }
}

/// <summary>
/// DTO cập nhật chi tiết đơn thuốc
/// </summary>
public class UpdatePrescriptionItemDto : CreatePrescriptionItemDto
{
    public Guid Id { get; set; }
}
