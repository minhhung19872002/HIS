namespace HIS.Application.DTOs.Insurance;

/// <summary>
/// Phân hệ 12: Giám định BHYT - DTOs cho xuất XML BHXH
/// Theo QĐ 4210, 4750, 3176, 130
/// </summary>


/// <summary>
/// DTO cấu hình xuất XML
/// </summary>
public class XmlExportConfigDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    public List<string>? MaLkList { get; set; } // Chọn theo mã liên thông
    public int? PatientType { get; set; } // Lọc theo loại BN
    public int? TreatmentType { get; set; } // Lọc theo loại KCB
    public Guid? DepartmentId { get; set; }

    public bool IncludeXml1 { get; set; } = true;
    public bool IncludeXml2 { get; set; } = true;
    public bool IncludeXml3 { get; set; } = true;
    public bool IncludeXml4 { get; set; } = true;
    public bool IncludeXml5 { get; set; } = true;
    public bool IncludeXml6 { get; set; } = true;
    public bool IncludeXml7 { get; set; } = true;
    public bool IncludeXml8 { get; set; } = true;
    public bool IncludeXml9 { get; set; } = true;
    public bool IncludeXml10 { get; set; } = true;
    public bool IncludeXml11 { get; set; } = true;
    public bool IncludeXml13 { get; set; } = true;
    public bool IncludeXml14 { get; set; } = true;
    public bool IncludeXml15 { get; set; } = true;

    public bool ValidateBeforeExport { get; set; } = true;
    public bool CompressOutput { get; set; } = true;
}

/// <summary>
/// DTO preview trước khi xuất XML - hiển thị số lượng bản ghi, chi phí, lỗi blocking
/// </summary>
public class XmlExportPreviewDto
{
    public int TotalRecords { get; set; }
    public DateTime? DateRangeFrom { get; set; }
    public DateTime? DateRangeTo { get; set; }
    public string? DepartmentName { get; set; }
    public decimal TotalCostAmount { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
    public decimal TotalPatientAmount { get; set; }
    public List<XmlTablePreview> Tables { get; set; } = new();
    public List<InsuranceValidationResultDto> ValidationErrors { get; set; } = new();
    public bool HasBlockingErrors { get; set; }
}

/// <summary>
/// Thông tin preview cho từng bảng XML
/// </summary>
public class XmlTablePreview
{
    public string TableName { get; set; } = string.Empty; // "XML1", "XML2", etc.
    public string Description { get; set; } = string.Empty; // Vietnamese name
    public int RecordCount { get; set; }
}

/// <summary>
/// DTO kết quả xuất XML
/// </summary>
public class XmlExportResultDto
{
    public Guid BatchId { get; set; }
    public string BatchCode { get; set; } = string.Empty;

    public int TotalRecords { get; set; }
    public int SuccessRecords { get; set; }
    public int FailedRecords { get; set; }

    public string? FilePath { get; set; }
    public long FileSize { get; set; }
    public string? FileChecksum { get; set; }

    public List<XmlExportError> Errors { get; set; } = new();

    public DateTime ExportTime { get; set; }
}

public class XmlExportError
{
    public string MaLk { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}

/// <summary>
/// DTO gửi dữ liệu lên cổng BHXH
/// </summary>
public class SubmitToInsurancePortalDto
{
    public Guid BatchId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string CertificatePath { get; set; } = string.Empty;
    public bool TestMode { get; set; }
}

/// <summary>
/// DTO kết quả gửi lên cổng BHXH
/// </summary>
public class SubmitResultDto
{
    public bool Success { get; set; }
    public string? TransactionId { get; set; }
    public string? Message { get; set; }
    public List<SubmitError> Errors { get; set; } = new();
    public DateTime SubmitTime { get; set; }
}

public class SubmitError
{
    public string MaLk { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}



/// <summary>
/// DTO mapping mã dịch vụ với mã BHYT
/// </summary>
public class ServiceInsuranceMapDto
{
    public Guid Id { get; set; }
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;

    public string InsuranceCode { get; set; } = string.Empty;
    public string InsuranceGroupCode { get; set; } = string.Empty;

    public decimal InsurancePrice { get; set; }
    public int PaymentRatio { get; set; } // Tỷ lệ thanh toán %

    public DateTime EffectiveDate { get; set; }
    public DateTime? ExpiredDate { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO mapping mã thuốc với mã BHYT
/// </summary>
public class MedicineInsuranceMapDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;

    public string InsuranceCode { get; set; } = string.Empty;
    public string InsuranceGroupCode { get; set; } = string.Empty;
    public string? HoatChat { get; set; } // Hoạt chất
    public string? DuongDung { get; set; }
    public string? HamLuong { get; set; }

    public decimal InsurancePrice { get; set; }
    public int PaymentRatio { get; set; }

    public DateTime EffectiveDate { get; set; }
    public DateTime? ExpiredDate { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO mapping mã ICD với BHYT
/// </summary>
public class IcdInsuranceMapDto
{
    public string IcdCode { get; set; } = string.Empty;
    public string IcdName { get; set; } = string.Empty;

    public bool IsValidForOutpatient { get; set; }
    public bool IsValidForInpatient { get; set; }

    public int? MaxDays { get; set; } // Số ngày điều trị tối đa
    public decimal? MaxCost { get; set; } // Chi phí tối đa

    public List<string> RequiredServices { get; set; } = new(); // Dịch vụ bắt buộc
    public List<string> AllowedMedicines { get; set; } = new(); // Thuốc cho phép
}

/// <summary>
/// DTO cập nhật giá BHYT theo đợt
/// </summary>
public class InsurancePriceUpdateBatchDto
{
    public Guid Id { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public DateTime EffectiveDate { get; set; }
    public string QuyetDinhSo { get; set; } = string.Empty; // Số quyết định

    public int TotalItems { get; set; }
    public int UpdatedItems { get; set; }

    public int Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}



/// <summary>
/// DTO báo cáo mẫu 16/BHYT - Danh sách chế phẩm YHCT được BHYT thanh toán
/// Nguồn: Medicine (MedicineType=2) + PrescriptionDetails (tháng báo cáo)
/// </summary>
public class Report16BhytDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public int TotalItems { get; set; }
    public decimal TotalAmount { get; set; }
    public List<Report16BhytLineDto> Lines { get; set; } = new();
}

public class Report16BhytLineDto
{
    public int Stt { get; set; }
    public string MaThuoc { get; set; } = string.Empty;        // Mã thuốc
    public string TenThuoc { get; set; } = string.Empty;       // Tên chế phẩm YHCT
    public string HoatChat { get; set; } = string.Empty;       // Hoạt chất/Thành phần
    public string DonViTinh { get; set; } = string.Empty;      // Đơn vị tính
    public decimal SoLuong { get; set; }                       // Số lượng sử dụng
    public decimal DonGia { get; set; }                        // Đơn giá
    public decimal ThanhTien { get; set; }                     // Thành tiền
    public decimal TienBhyt { get; set; }                      // BHYT chi trả
}

/// <summary>
/// DTO báo cáo mẫu 17/BHYT - Danh sách vị thuốc YHCT được BHYT thanh toán
/// Nguồn: PrescriptionDetails (Prescription.PrescriptionType=4) trong tháng báo cáo
/// Assumption: phân biệt vị thuốc = đơn YHCT (PrescriptionType=4); chế phẩm = Medicine MedicineType=2 chung
/// </summary>
public class Report17BhytDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public int TotalItems { get; set; }
    public decimal TotalAmount { get; set; }
    public List<Report17BhytLineDto> Lines { get; set; } = new();
}

public class Report17BhytLineDto
{
    public int Stt { get; set; }
    public string MaThuoc { get; set; } = string.Empty;        // Mã vị thuốc
    public string TenViThuoc { get; set; } = string.Empty;     // Tên vị thuốc
    public string DonViTinh { get; set; } = string.Empty;      // Đơn vị tính (thang, gói...)
    public decimal SoLuong { get; set; }                       // Số lượng (số thang)
    public decimal DonGia { get; set; }
    public decimal ThanhTien { get; set; }
    public decimal TienBhyt { get; set; }
}

/// <summary>
/// DTO báo cáo mẫu 19/BHYT - Thống kê tổng hợp vật tư y tế được BHYT thanh toán
/// Nguồn: InsuranceClaimDetail (ItemType=3) trong tháng báo cáo
/// </summary>
public class Report19BhytDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public int TotalItems { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
    public List<Report19BhytLineDto> Lines { get; set; } = new();
}

public class Report19BhytLineDto
{
    public int Stt { get; set; }
    public string MaVatTu { get; set; } = string.Empty;        // Mã vật tư
    public string TenVatTu { get; set; } = string.Empty;       // Tên vật tư
    public string DonViTinh { get; set; } = string.Empty;
    public decimal SoLuong { get; set; }
    public decimal DonGia { get; set; }
    public decimal ThanhTien { get; set; }
    public decimal TienBhyt { get; set; }
    public decimal TienBenhNhan { get; set; }
}

/// <summary>
/// DTO báo cáo mẫu 20/BHYT - Thống kê tổng hợp thuốc sử dụng cho bệnh nhân BHYT
/// Nguồn: InsuranceClaimDetail (ItemType=2) hoặc PrescriptionDetails (bệnh nhân có InsuranceNumber) trong tháng
/// </summary>
public class Report20BhytDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public int TotalItems { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
    public List<Report20BhytLineDto> Lines { get; set; } = new();
}

public class Report20BhytLineDto
{
    public int Stt { get; set; }
    public string MaThuoc { get; set; } = string.Empty;
    public string TenThuoc { get; set; } = string.Empty;
    public string HoatChat { get; set; } = string.Empty;
    public string DonViTinh { get; set; } = string.Empty;
    public decimal SoLuong { get; set; }
    public decimal DonGia { get; set; }
    public decimal ThanhTien { get; set; }
    public decimal TienBhyt { get; set; }
    public decimal TienBenhNhan { get; set; }
}

/// <summary>
/// DTO báo cáo mẫu 21/BHYT - Thống kê tổng hợp DVKT sử dụng cho bệnh nhân BHYT
/// Nguồn: InsuranceClaimDetail (ItemType=1) trong tháng báo cáo
/// </summary>
public class Report21BhytDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public int TotalItems { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
    public List<Report21BhytLineDto> Lines { get; set; } = new();
}

public class Report21BhytLineDto
{
    public int Stt { get; set; }
    public string MaDvkt { get; set; } = string.Empty;         // Mã DVKT theo BYT
    public string TenDvkt { get; set; } = string.Empty;        // Tên dịch vụ kỹ thuật
    public string DonViTinh { get; set; } = string.Empty;
    public int SoLuong { get; set; }
    public decimal DonGia { get; set; }
    public decimal ThanhTien { get; set; }
    public decimal TienBhyt { get; set; }
    public decimal TienBenhNhan { get; set; }
}

/// <summary>
/// DTO báo cáo mẫu 21/BHYT theo CV 285/BHXH-CSYT
/// Nguồn: InsuranceClaimDetail (ItemType=1) - cùng nguồn mẫu 21 nhưng format cột thêm nhóm DVKT
/// </summary>
public class Report285BhytDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public int TotalItems { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
    public List<Report285BhytLineDto> Lines { get; set; } = new();
}

public class Report285BhytLineDto
{
    public int Stt { get; set; }
    public string NhomDvkt { get; set; } = string.Empty;       // Nhóm DVKT (tên ServiceGroup)
    public string MaDvkt { get; set; } = string.Empty;
    public string TenDvkt { get; set; } = string.Empty;
    public string DonViTinh { get; set; } = string.Empty;
    public int SoLuong { get; set; }
    public decimal DonGia { get; set; }
    public decimal ThanhTien { get; set; }
    public decimal TienBhyt { get; set; }
    public decimal TienBenhNhan { get; set; }
}

/// <summary>
/// DTO báo cáo C79B-HD - Tổng hợp chi phí KCB BHYT ngoại trú (bản B)
/// Cấu trúc tương tự C79a nhưng gộp theo nhóm dịch vụ thay vì từng dòng chỉ tiêu
/// </summary>
public class ReportC79bDto
{
    public string MaCsKcb { get; set; } = string.Empty;
    public string TenCsKcb { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public List<ReportC79bLineDto> Lines { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
    public int TotalVisits { get; set; }
}

public class ReportC79bLineDto
{
    public int Stt { get; set; }
    public string NhomDvkt { get; set; } = string.Empty;       // Nhóm dịch vụ kỹ thuật
    public int SoLuot { get; set; }                            // Số lượt sử dụng
    public decimal TienDeNghi { get; set; }                    // Tiền đề nghị thanh toán
    public decimal TienQuyetToan { get; set; }                 // Tiền quyết toán
    public string GhiChu { get; set; } = string.Empty;
}

/// <summary>
/// DTO báo cáo C80B-HD - Tổng hợp chi phí KCB BHYT nội trú (bản B)
/// Cấu trúc tương tự 80a nhưng phân tổ theo nhóm đối tượng BHYT
/// </summary>
public class ReportC80bDto
{
    public string MaCsKcb { get; set; } = string.Empty;
    public string TenCsKcb { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public List<ReportC80bLineDto> Lines { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
    public int TotalPatients { get; set; }
}

public class ReportC80bLineDto
{
    public int Stt { get; set; }
    public string NhomDoiTuong { get; set; } = string.Empty;   // Nhóm đối tượng BHYT (InsuranceType)
    public int SoBenhNhan { get; set; }                        // Số bệnh nhân
    public int SoNgayDieuTri { get; set; }                    // Tổng số ngày điều trị
    public decimal TienDeNghi { get; set; }
    public decimal TienQuyetToan { get; set; }
}

/// <summary>
/// DTO báo cáo theo mẫu C79a-HD (TT39)
/// </summary>
public class ReportC79aDto
{
    public string MaCsKcb { get; set; } = string.Empty;
    public string TenCsKcb { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }

    public List<ReportC79aLineDto> Lines { get; set; } = new();

    public decimal TotalAmount { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
}

public class ReportC79aLineDto
{
    public int Stt { get; set; }
    public string TenChiTieu { get; set; } = string.Empty;
    public int SoLuot { get; set; }
    public decimal TienTamUng { get; set; }
    public decimal TienDeNghi { get; set; }
    public decimal TienQuyetToan { get; set; }
}

/// <summary>
/// DTO báo cáo theo mẫu 80a-HD (TT39)
/// </summary>
public class Report80aDto
{
    public string MaCsKcb { get; set; } = string.Empty;
    public string TenCsKcb { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }

    public List<Report80aDetailDto> Details { get; set; } = new();

    public int TotalPatients { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
}

public class Report80aDetailDto
{
    public int Stt { get; set; }
    public string LoaiThe { get; set; } = string.Empty;
    public int SoLuotKcb { get; set; }
    public int SoNguoi { get; set; }
    public decimal TienDeNghi { get; set; }
    public decimal TienQuyetToan { get; set; }
}

