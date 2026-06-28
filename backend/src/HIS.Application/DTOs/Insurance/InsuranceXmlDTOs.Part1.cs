namespace HIS.Application.DTOs.Insurance;

/// <summary>
/// Phân hệ 12: Giám định BHYT - DTOs cho xuất XML BHXH
/// Theo QĐ 4210, 4750, 3176, 130
/// </summary>


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

/// <summary>
/// Bảng XML6 - Máu và chế phẩm máu (Blood and blood products)
/// </summary>
public class Xml6BloodDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string MaMau { get; set; } = string.Empty; // Blood product code
    public string TenMau { get; set; } = string.Empty;
    public decimal TheTich { get; set; } // Volume (ml)
    public decimal DonGia { get; set; }
    public decimal ThanhTien { get; set; }
    public decimal? TienBhyt { get; set; }
    public decimal? TienBnCct { get; set; }
    public decimal? TienNguoiBenh { get; set; }
    public DateTime? NgayYl { get; set; }
    public string? MaKhoa { get; set; }
    public string? MaBacSi { get; set; }
}

/// <summary>
/// Bảng XML8 - Vận chuyển người bệnh (Patient transport)
/// </summary>
public class Xml8TransportDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string PhuongTien { get; set; } = string.Empty; // Transport type
    public decimal KhoangCach { get; set; } // Distance (km)
    public decimal PhiVc { get; set; } // Transport fee
    public decimal? TienBhyt { get; set; }
    public DateTime? NgayVc { get; set; }
    public string? NoiDi { get; set; }
    public string? NoiDen { get; set; }
}

/// <summary>
/// Bảng XML9 - Giấy nghỉ việc hưởng BHXH (Sick leave certificates)
/// </summary>
public class Xml9SickLeaveDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public DateTime TuNgay { get; set; }
    public DateTime DenNgay { get; set; }
    public int SoNgay { get; set; }
    public string LyDo { get; set; } = string.Empty;
    public string? MaBenh { get; set; }
    public string? MaBacSi { get; set; }
}

/// <summary>
/// Bảng XML10 - Kết quả giám định (Assessment results)
/// </summary>
public class Xml10AssessmentDto
{
    public string MaLk { get; set; } = string.Empty;
    public string KetQua { get; set; } = string.Empty; // Assessment result
    public string? GhiChu { get; set; }
    public DateTime NgayGiamDinh { get; set; }
    public string? MaNguoiGd { get; set; } // Assessor code
    public string? TenNguoiGd { get; set; }
}

/// <summary>
/// Bảng XML11 - Sổ BHXH (Social insurance certificate)
/// </summary>
public class Xml11SocialInsuranceDto
{
    public string MaLk { get; set; } = string.Empty;
    public string MaBhxh { get; set; } = string.Empty;
    public string HoTen { get; set; } = string.Empty;
    public string SoSoBhxh { get; set; } = string.Empty;
    public DateTime? NgaySinh { get; set; }
    public int? GioiTinh { get; set; }
}

/// <summary>
/// Bảng XML13 - Giấy hẹn tái khám (Re-examination appointments) - QĐ 3176
/// </summary>
public class Xml13ReExamDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public DateTime NgayHen { get; set; }
    public string NoiDung { get; set; } = string.Empty;
    public string? MaBacSi { get; set; }
    public string? MaKhoa { get; set; }
}

/// <summary>
/// Bảng XML14 - Phiếu chuyển tuyến (Referral certificates) - QĐ 3176
/// </summary>
public class Xml14ReferralCertDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string SoPhieu { get; set; } = string.Empty;
    public string MaCskbChuyenDen { get; set; } = string.Empty;
    public string TenCskbChuyenDen { get; set; } = string.Empty;
    public DateTime NgayChuyen { get; set; }
    public string LyDoChuyen { get; set; } = string.Empty;
    public string? ChanDoanChuyen { get; set; }
    public string? HuongDieuTri { get; set; }
    public string? MaBacSi { get; set; }
}

/// <summary>
/// Bảng XML15 - Điều trị lao (TB treatment details) - QĐ 3176
/// </summary>
public class Xml15TbTreatmentDto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string PhacDo { get; set; } = string.Empty; // Treatment regimen
    public string GiaiDoan { get; set; } = string.Empty; // Treatment phase
    public DateTime? NgayBatDau { get; set; }
    public DateTime? NgayKetThuc { get; set; }
    public string? KetQua { get; set; }
}



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


