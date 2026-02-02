namespace HIS.Application.DTOs.Insurance;

/// <summary>
/// Phân hệ 12: Giám định BHYT - DTOs cho xuất XML BHXH
/// Theo QĐ 4210, 4750, 3176, 130
/// </summary>

#region XML Hồ sơ BHYT theo QĐ 4210/4750

/// <summary>
/// Bảng XML1 - Thông tin chung hồ sơ KCB
/// </summary>
public class Xml1MedicalRecordDto
{
    // Mã liên thông
    public string MaLk { get; set; } = string.Empty;

    // Thông tin bệnh nhân
    public string MaBn { get; set; } = string.Empty; // Mã bệnh nhân
    public string HoTen { get; set; } = string.Empty;
    public DateTime NgaySinh { get; set; }
    public int GioiTinh { get; set; } // 1-Nam, 2-Nữ
    public string DiaChi { get; set; } = string.Empty;
    public string MaThe { get; set; } = string.Empty; // Mã thẻ BHYT
    public string MaDkbd { get; set; } = string.Empty; // Mã ĐKBD
    public DateTime GtTheTu { get; set; } // Giá trị thẻ từ
    public DateTime GtTheDen { get; set; } // Giá trị thẻ đến
    public string? MienCungCt { get; set; } // Miễn cùng chi trả
    public DateTime NgayVao { get; set; }
    public DateTime? NgayRa { get; set; }
    public int SoNgayDt { get; set; } // Số ngày điều trị
    public int TinhTrangRv { get; set; } // Tình trạng ra viện
    public string KetQuaDt { get; set; } = string.Empty; // Kết quả điều trị

    // Chẩn đoán
    public string MaLoaiKcb { get; set; } = string.Empty;
    public string MaKhoa { get; set; } = string.Empty;
    public string MaBenhChinh { get; set; } = string.Empty;
    public string? MaBenhKt { get; set; } // Mã bệnh kèm theo
    public string? MaBenhYhct { get; set; } // Mã bệnh YHCT
    public string? MaPtttQt { get; set; } // Mã phẫu thuật, thủ thuật
    public string? MaDoiTuong { get; set; }

    // Tiền khám
    public decimal TienKham { get; set; }
    public decimal TienGiuong { get; set; }
    public decimal TienNgoaitruth { get; set; } // Tiền ngoài trường hợp
    public decimal TienBhyt { get; set; }
    public decimal TienBnCct { get; set; } // Tiền bệnh nhân cùng chi trả
    public decimal TienNguoibenh { get; set; }
    public decimal TienTuphitru { get; set; } // Tiền từ phi trừ

    // Thông tin bổ sung
    public string? CanNang { get; set; }
    public string? MaTtpt { get; set; } // Mã tình trạng phát triển (trẻ em)
    public string? NamQtNhoHat { get; set; }
    public string? MaNoiChuyen { get; set; }
    public DateTime? NgayMien { get; set; }

    // Nhân viên
    public string? MaLoaiRv { get; set; }
    public string? MaKhuvuc { get; set; }
    public string MaPhong { get; set; } = string.Empty;
}

/// <summary>
/// Bảng XML2 - Thuốc điều trị
/// </summary>
public class Xml2MedicineDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string MaThuoc { get; set; } = string.Empty;
    public string MaNhom { get; set; } = string.Empty;
    public string TenThuoc { get; set; } = string.Empty;
    public string? DonViTinh { get; set; }
    public string? HamLuong { get; set; }
    public string? DuongDung { get; set; }
    public decimal SoLuong { get; set; }
    public decimal DonGia { get; set; }
    public int TyLeThanhToan { get; set; }
    public decimal ThanhTien { get; set; }
    public string? MaKhoa { get; set; }
    public string? MaBacSi { get; set; }
    public DateTime? NgayYl { get; set; } // Ngày y lệnh
    public string? MaPttt { get; set; }
    public string? MaBenh { get; set; }
    public decimal? ThanhTienBv { get; set; }
    public decimal? TienBhyt { get; set; }
    public decimal? TienBnCct { get; set; }
    public decimal? TienNguoiBenh { get; set; }
    public int? MucHuong { get; set; }
    public int? MaNguonChiTra { get; set; }
}

/// <summary>
/// Bảng XML3 - Dịch vụ kỹ thuật (DVKT)
/// </summary>
public class Xml3ServiceDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string MaDvu { get; set; } = string.Empty;
    public string MaNhom { get; set; } = string.Empty;
    public string? MaPttt { get; set; }
    public string TenDvu { get; set; } = string.Empty;
    public string? DonViTinh { get; set; }
    public decimal SoLuong { get; set; }
    public decimal DonGia { get; set; }
    public int TyLeThanhToan { get; set; }
    public decimal ThanhTien { get; set; }
    public string? MaKhoa { get; set; }
    public string? MaBacSi { get; set; }
    public DateTime? NgayYl { get; set; }
    public DateTime? NgayKq { get; set; } // Ngày kết quả
    public string? MaBenh { get; set; }
    public decimal? ThanhTienBv { get; set; }
    public decimal? TienBhyt { get; set; }
    public decimal? TienBnCct { get; set; }
    public decimal? TienNguoiBenh { get; set; }
    public int? MucHuong { get; set; }
    public int? MaNguonChiTra { get; set; }
}

/// <summary>
/// Bảng XML4 - Chi phí thuốc ngoài danh mục (C)
/// </summary>
public class Xml4OtherMedicineDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string MaThuoc { get; set; } = string.Empty;
    public string TenThuoc { get; set; } = string.Empty;
    public string? DonViTinh { get; set; }
    public string? HamLuong { get; set; }
    public string? DuongDung { get; set; }
    public decimal SoLuong { get; set; }
    public decimal DonGia { get; set; }
    public decimal ThanhTien { get; set; }
    public string? MaKhoa { get; set; }
    public string? MaBacSi { get; set; }
    public DateTime? NgayYl { get; set; }
}

/// <summary>
/// Bảng XML5 - Chỉ định thuốc điều trị
/// </summary>
public class Xml5PrescriptionDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string MaThuoc { get; set; } = string.Empty;
    public string TenThuoc { get; set; } = string.Empty;
    public string? SoDk { get; set; } // Số đăng ký
    public string? HamLuong { get; set; }
    public decimal SoLuong { get; set; }
    public decimal DonGia { get; set; }
    public decimal ThanhTien { get; set; }
    public string? LieuDung { get; set; }
    public string? CachDung { get; set; }
    public int SoNgay { get; set; }
    public string? MaBenh { get; set; }
    public DateTime NgayKeDon { get; set; }
}

/// <summary>
/// Bảng XML7 - Giấy giới thiệu chuyển tuyến
/// </summary>
public class Xml7ReferralDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string SoHoSo { get; set; } = string.Empty;
    public string MaBnChuyenDi { get; set; } = string.Empty;
    public string MaCskbChuyenDi { get; set; } = string.Empty;
    public DateTime NgayChuyenDi { get; set; }
    public string MaCskbChuyenDen { get; set; } = string.Empty;
    public string LyDoChuyenVien { get; set; } = string.Empty;
    public string? MaBenhChinh { get; set; }
    public string? MaBenhKt { get; set; }
    public string? TomTatKq { get; set; }
    public string? HuongDieuTri { get; set; }
    public string? PhuongTienVc { get; set; }
    public string? HoTenNguoiHt { get; set; }
    public string? ChucDanhNguoiHt { get; set; }
}

#endregion

#region Thống kê và báo cáo BHYT

/// <summary>
/// DTO tổng hợp hồ sơ BHYT
/// </summary>
public class InsuranceClaimSummaryDto
{
    public Guid Id { get; set; }
    public string MaLk { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string InsuranceNumber { get; set; } = string.Empty;

    public DateTime AdmissionDate { get; set; }
    public DateTime? DischargeDate { get; set; }

    public string DiagnosisCode { get; set; } = string.Empty;
    public string DiagnosisName { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal CoPayAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public int Status { get; set; } // 0-Chờ duyệt, 1-Đã duyệt, 2-Đã gửi BHXH, 3-Đã thanh toán, 4-Từ chối
    public string StatusName => Status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đã gửi BHXH",
        3 => "Đã thanh toán",
        4 => "Từ chối",
        _ => ""
    };

    public string? RejectReason { get; set; }
    public DateTime? SubmitDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO kiểm tra và validate hồ sơ BHYT
/// </summary>
public class InsuranceValidationResultDto
{
    public string MaLk { get; set; } = string.Empty;
    public bool IsValid { get; set; }
    public List<InsuranceValidationError> Errors { get; set; } = new();
    public List<InsuranceValidationWarning> Warnings { get; set; } = new();
}

public class InsuranceValidationError
{
    public string ErrorCode { get; set; } = string.Empty;
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
}

public class InsuranceValidationWarning
{
    public string WarningCode { get; set; } = string.Empty;
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// DTO thống kê BHYT theo đợt quyết toán
/// </summary>
public class InsuranceSettlementBatchDto
{
    public Guid Id { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }

    public int TotalRecords { get; set; }
    public int ValidRecords { get; set; }
    public int InvalidRecords { get; set; }

    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public int Status { get; set; } // 0-Đang tạo, 1-Đã kiểm tra, 2-Đã gửi, 3-Đã nhận kết quả
    public DateTime CreatedAt { get; set; }
    public DateTime? SubmitDate { get; set; }
    public DateTime? ResultDate { get; set; }
}

/// <summary>
/// DTO báo cáo tổng hợp BHYT theo tháng
/// </summary>
public class MonthlyInsuranceReportDto
{
    public int Month { get; set; }
    public int Year { get; set; }

    // Thống kê lượt khám
    public int TotalVisits { get; set; }
    public int OutpatientVisits { get; set; }
    public int InpatientVisits { get; set; }
    public int EmergencyVisits { get; set; }

    // Thống kê chi phí
    public decimal TotalCost { get; set; }
    public decimal MedicineCost { get; set; }
    public decimal ServiceCost { get; set; }
    public decimal BedCost { get; set; }
    public decimal ExaminationCost { get; set; }

    // Thống kê thanh toán
    public decimal InsurancePaid { get; set; }
    public decimal PatientPaid { get; set; }
    public decimal CoPayAmount { get; set; }

    // Theo loại KCB
    public Dictionary<string, decimal> ByTreatmentType { get; set; } = new();

    // Theo khoa
    public Dictionary<string, decimal> ByDepartment { get; set; } = new();

    // Top bệnh phổ biến
    public List<DiseaseStatDto> TopDiseases { get; set; } = new();

    // Top thuốc
    public List<MedicineStatDto> TopMedicines { get; set; } = new();
}

public class DiseaseStatDto
{
    public string IcdCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalCost { get; set; }
}

public class MedicineStatDto
{
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public decimal TotalQuantity { get; set; }
    public decimal TotalCost { get; set; }
}

/// <summary>
/// DTO đối soát BHYT
/// </summary>
public class InsuranceReconciliationDto
{
    public Guid Id { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }

    // Bệnh viện đề nghị
    public int HospitalRecordCount { get; set; }
    public decimal HospitalTotalAmount { get; set; }
    public decimal HospitalInsuranceAmount { get; set; }

    // BHXH chấp nhận
    public int AcceptedRecordCount { get; set; }
    public decimal AcceptedTotalAmount { get; set; }
    public decimal AcceptedInsuranceAmount { get; set; }

    // Chênh lệch
    public int RejectedRecordCount { get; set; }
    public decimal DifferenceAmount { get; set; }

    // Chi tiết từ chối
    public List<RejectedClaimDto> RejectedClaims { get; set; } = new();

    public int Status { get; set; }
    public DateTime ReconciliationDate { get; set; }
}

public class RejectedClaimDto
{
    public string MaLk { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string InsuranceNumber { get; set; } = string.Empty;
    public string RejectCode { get; set; } = string.Empty;
    public string RejectReason { get; set; } = string.Empty;
    public decimal ClaimAmount { get; set; }
    public decimal RejectedAmount { get; set; }
}

#endregion

#region Tra cứu và xác minh thẻ BHYT

/// <summary>
/// DTO kết quả tra cứu thẻ BHYT từ cổng BHXH
/// </summary>
public class InsuranceCardVerificationDto
{
    public string MaThe { get; set; } = string.Empty;
    public string HoTen { get; set; } = string.Empty;
    public DateTime NgaySinh { get; set; }
    public int GioiTinh { get; set; }
    public string DiaChi { get; set; } = string.Empty;

    public DateTime GtTheTu { get; set; }
    public DateTime GtTheDen { get; set; }

    public string MaDkbd { get; set; } = string.Empty;
    public string TenDkbd { get; set; } = string.Empty;

    public string MucHuong { get; set; } = string.Empty;
    public bool DuDkKcb { get; set; } // Đủ điều kiện KCB

    public string? LyDoKhongDuDk { get; set; }
    public bool MienCungCt { get; set; }
    public string? MaLyDoMien { get; set; }

    public DateTime? NgayDu5Nam { get; set; } // Ngày đủ 5 năm liên tục
    public bool IsTraTruoc { get; set; } // Trả trước

    public string MaKv { get; set; } = string.Empty; // Mã khu vực (K1, K2, K3)
    public string LoaiThe { get; set; } = string.Empty;

    public DateTime VerificationTime { get; set; }
    public string VerificationToken { get; set; } = string.Empty;

    // English property aliases for compatibility
    public bool IsValid => DuDkKcb;
    public decimal CoverageRate => decimal.TryParse(MucHuong, out var rate) ? rate / 100 : 0;
    public DateTime ExpireDate => GtTheDen;
}

/// <summary>
/// DTO lịch sử KCB từ cổng BHXH
/// </summary>
public class InsuranceHistoryDto
{
    public string MaThe { get; set; } = string.Empty;
    public List<InsuranceVisitHistoryDto> Visits { get; set; } = new();
}

public class InsuranceVisitHistoryDto
{
    public string MaCsKcb { get; set; } = string.Empty;
    public string TenCsKcb { get; set; } = string.Empty;
    public DateTime NgayKcb { get; set; }
    public string MaLoaiKcb { get; set; } = string.Empty;
    public string MaBenhChinh { get; set; } = string.Empty;
    public string TenBenhChinh { get; set; } = string.Empty;
    public decimal TienBhyt { get; set; }
}

#endregion

#region Xuất XML

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
    public bool IncludeXml7 { get; set; } = true;

    public bool ValidateBeforeExport { get; set; } = true;
    public bool CompressOutput { get; set; } = true;
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

#endregion

#region Cấu hình và mapping danh mục

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

#endregion

#region Báo cáo theo thông tư

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

#endregion
