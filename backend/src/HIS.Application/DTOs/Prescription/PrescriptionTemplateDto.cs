namespace HIS.Application.DTOs.Prescription;

/// <summary>
/// DTO mẫu đơn thuốc
/// </summary>
public class PrescriptionTemplateDto
{
    public Guid Id { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Chẩn đoán mặc định
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Loại đơn
    public int PrescriptionType { get; set; } // 1-Ngoại trú, 2-Nội trú, 3-Nhà thuốc, 4-YHCT
    public int TotalDays { get; set; }

    // Lời dặn mặc định
    public string? Instructions { get; set; }

    // Bác sĩ tạo mẫu
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }

    // Khoa áp dụng
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    // Phạm vi sử dụng
    public int Scope { get; set; } // 1-Cá nhân, 2-Khoa, 3-Toàn viện
    public bool IsPublic { get; set; }
    public bool IsActive { get; set; }

    // Thống kê
    public int UsageCount { get; set; }
    public DateTime? LastUsedDate { get; set; }

    public DateTime CreatedAt { get; set; }
    public string? CreatedByName { get; set; }

    // Chi tiết thuốc trong mẫu
    public List<PrescriptionTemplateItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO chi tiết thuốc trong mẫu đơn
/// </summary>
public class PrescriptionTemplateItemDto
{
    public Guid Id { get; set; }
    public Guid TemplateId { get; set; }

    // Thuốc
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Unit { get; set; }

    // Liều dùng mặc định
    public decimal? MorningDose { get; set; }
    public decimal? NoonDose { get; set; }
    public decimal? EveningDose { get; set; }
    public decimal? NightDose { get; set; }

    // Hướng dẫn mặc định
    public int DaysSupply { get; set; }
    public string? Instructions { get; set; }
    public string? Route { get; set; }
    public string? Frequency { get; set; }
    public string? Timing { get; set; }

    // Số lượng mặc định (null = tính tự động từ liều)
    public decimal? Quantity { get; set; }

    public string? Note { get; set; }
    public int DisplayOrder { get; set; }
}

/// <summary>
/// DTO tạo mẫu đơn thuốc
/// </summary>
public class CreatePrescriptionTemplateDto
{
    public string TemplateName { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Chẩn đoán
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Loại đơn
    public int PrescriptionType { get; set; } = 1;
    public int TotalDays { get; set; } = 1;

    // Lời dặn
    public string? Instructions { get; set; }

    // Bác sĩ (lấy từ context nếu không truyền)
    public Guid? DoctorId { get; set; }

    // Khoa (lấy từ context nếu không truyền)
    public Guid? DepartmentId { get; set; }

    // Phạm vi
    public int Scope { get; set; } = 1; // 1-Cá nhân, 2-Khoa, 3-Toàn viện
    public bool IsPublic { get; set; } = false;

    // Chi tiết thuốc
    public List<CreatePrescriptionTemplateItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO tạo chi tiết mẫu đơn thuốc
/// </summary>
public class CreatePrescriptionTemplateItemDto
{
    public Guid MedicineId { get; set; }

    // Liều dùng
    public decimal? MorningDose { get; set; }
    public decimal? NoonDose { get; set; }
    public decimal? EveningDose { get; set; }
    public decimal? NightDose { get; set; }

    // Hướng dẫn
    public int DaysSupply { get; set; } = 1;
    public string? Instructions { get; set; }
    public string? Route { get; set; }
    public string? Frequency { get; set; }
    public string? Timing { get; set; }

    // Số lượng (null = tính tự động)
    public decimal? Quantity { get; set; }

    public string? Note { get; set; }
    public int DisplayOrder { get; set; }
}

/// <summary>
/// DTO cập nhật mẫu đơn thuốc
/// </summary>
public class UpdatePrescriptionTemplateDto : CreatePrescriptionTemplateDto
{
    public Guid Id { get; set; }
    public bool? IsActive { get; set; }
}

/// <summary>
/// DTO tìm kiếm mẫu đơn thuốc
/// </summary>
public class PrescriptionTemplateSearchDto
{
    public string? Keyword { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? Scope { get; set; }
    public int? PrescriptionType { get; set; }
    public bool? IsPublic { get; set; }
    public bool? IsActive { get; set; } = true;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// DTO áp dụng mẫu đơn thuốc vào đơn mới
/// </summary>
public class ApplyTemplateDto
{
    public Guid TemplateId { get; set; }
    public Guid MedicalRecordId { get; set; }
    public Guid? ExaminationId { get; set; }

    // Ghi đè thông tin nếu cần
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public int? TotalDays { get; set; }
    public string? Instructions { get; set; }

    // Chọn thuốc cụ thể (null = lấy tất cả)
    public List<Guid>? SelectedItemIds { get; set; }
}
