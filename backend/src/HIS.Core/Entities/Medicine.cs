namespace HIS.Core.Entities;

/// <summary>
/// Thuốc - Medicine
/// </summary>
public class Medicine : BaseEntity
{
    public string MedicineCode { get; set; } = string.Empty; // Mã thuốc
    public string MedicineName { get; set; } = string.Empty; // Tên thuốc
    public string? MedicineCodeBYT { get; set; } // Mã tương đương BYT
    public string? RegistrationNumber { get; set; } // Số đăng ký

    // Hoạt chất
    public string? ActiveIngredient { get; set; } // Hoạt chất
    public string? ActiveIngredientCode { get; set; } // Mã hoạt chất BYT
    public string? Concentration { get; set; } // Hàm lượng/Nồng độ

    // Phân loại
    public int MedicineType { get; set; } // 1-Tân dược, 2-YHCT, 3-Vắc xin, 4-Sinh phẩm
    public string? MedicineGroupCode { get; set; } // Nhóm thuốc
    public string? AtcCode { get; set; } // Mã ATC
    public bool IsNarcotic { get; set; } // Gây nghiện
    public bool IsPsychotropic { get; set; } // Hướng thần
    public bool IsPrecursor { get; set; } // Tiền chất
    public bool IsAntibiotic { get; set; } // Kháng sinh
    public bool IsControlled { get; set; } // Thuốc kiểm soát đặc biệt

    // Đơn vị
    public string? Unit { get; set; } // Đơn vị tính
    public string? PackageUnit { get; set; } // Đơn vị đóng gói
    public decimal ConversionRate { get; set; } = 1; // Quy đổi

    // Đường dùng
    public string? RouteCode { get; set; } // Mã đường dùng
    public string? RouteName { get; set; } // Tên đường dùng

    // Nhà sản xuất
    public string? Manufacturer { get; set; }
    public string? ManufacturerCountry { get; set; }
    public string? Supplier { get; set; }

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal ServicePrice { get; set; }

    // BHYT
    public bool IsInsuranceCovered { get; set; } = true;
    public int InsurancePaymentRate { get; set; } = 100;
    public string? InsuranceCondition { get; set; } // Điều kiện thanh toán BHYT

    // Cảnh báo
    public string? Contraindications { get; set; } // Chống chỉ định
    public string? SideEffects { get; set; } // Tác dụng phụ
    public string? DrugInteractions { get; set; } // Tương tác thuốc
    public string? Warning { get; set; }

    // Hướng dẫn mặc định
    public string? DefaultDosage { get; set; }
    public string? DefaultUsage { get; set; }

    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

/// <summary>
/// Vật tư y tế - MedicalSupply
/// </summary>
public class MedicalSupply : BaseEntity
{
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string? SupplyCodeBYT { get; set; }
    public string? RegistrationNumber { get; set; }

    public int SupplyType { get; set; } // 1-Vật tư tiêu hao, 2-Vật tư thay thế, 3-Hóa chất
    public string? SupplyGroupCode { get; set; }

    public string? Unit { get; set; }
    public string? Specification { get; set; } // Quy cách
    public string? Manufacturer { get; set; }
    public string? ManufacturerCountry { get; set; }

    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }

    public bool IsInsuranceCovered { get; set; } = true;
    public int InsurancePaymentRate { get; set; } = 100;

    public bool IsReusable { get; set; } // Tái sử dụng
    public bool IsActive { get; set; } = true;
}
