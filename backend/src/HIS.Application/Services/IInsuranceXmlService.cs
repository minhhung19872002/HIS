using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;

namespace HIS.Application.Services;

/// <summary>
/// Service interface đầy đủ cho Phân hệ 12: Giám định BHYT - XML Export
/// Theo QĐ 4210, 4750, 3176, 130
/// </summary>
public interface IInsuranceXmlService
{
    #region 12.1 Tra cứu và xác minh thẻ BHYT

    /// <summary>
    /// Tra cứu thẻ BHYT từ cổng BHXH
    /// </summary>
    Task<InsuranceCardVerificationDto> VerifyInsuranceCardAsync(string insuranceNumber, string patientName, DateTime dateOfBirth);

    /// <summary>
    /// Tra cứu lịch sử KCB từ cổng BHXH
    /// </summary>
    Task<InsuranceHistoryDto> GetInsuranceHistoryAsync(string insuranceNumber, string? otp = null);

    /// <summary>
    /// Kiểm tra tính hợp lệ thẻ BHYT
    /// </summary>
    Task<bool> CheckInsuranceValidityAsync(string insuranceNumber, DateTime serviceDate);

    /// <summary>
    /// Lấy thông tin quyền lợi BHYT
    /// </summary>
    Task<InsuranceBenefitDto> GetInsuranceBenefitsAsync(string insuranceNumber);

    /// <summary>
    /// Kiểm tra đăng ký KCB ban đầu
    /// </summary>
    Task<bool> CheckPrimaryRegistrationAsync(string insuranceNumber, string facilityCode);

    #endregion

    #region 12.2 Tạo và quản lý hồ sơ BHYT

    /// <summary>
    /// Tạo hồ sơ BHYT từ lượt khám/điều trị
    /// </summary>
    Task<InsuranceClaimSummaryDto> CreateInsuranceClaimAsync(Guid examinationId);

    /// <summary>
    /// Lấy chi tiết hồ sơ BHYT
    /// </summary>
    Task<InsuranceClaimSummaryDto?> GetInsuranceClaimByMaLkAsync(string maLk);

    /// <summary>
    /// Lấy danh sách hồ sơ BHYT theo tiêu chí
    /// </summary>
    Task<PagedResultDto<InsuranceClaimSummaryDto>> SearchInsuranceClaimsAsync(InsuranceClaimSearchDto dto);

    /// <summary>
    /// Cập nhật hồ sơ BHYT
    /// </summary>
    Task<InsuranceClaimSummaryDto> UpdateInsuranceClaimAsync(string maLk, UpdateInsuranceClaimDto dto);

    /// <summary>
    /// Xóa hồ sơ BHYT
    /// </summary>
    Task<bool> DeleteInsuranceClaimAsync(string maLk);

    /// <summary>
    /// Khóa hồ sơ BHYT
    /// </summary>
    Task<bool> LockInsuranceClaimAsync(string maLk);

    /// <summary>
    /// Mở khóa hồ sơ BHYT
    /// </summary>
    Task<bool> UnlockInsuranceClaimAsync(string maLk, string reason);

    #endregion

    #region 12.3 Xuất XML theo chuẩn BHXH

    /// <summary>
    /// Tạo dữ liệu XML1 - Thông tin chung hồ sơ KCB
    /// </summary>
    Task<List<Xml1MedicalRecordDto>> GenerateXml1DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML2 - Thuốc điều trị
    /// </summary>
    Task<List<Xml2MedicineDto>> GenerateXml2DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML3 - Dịch vụ kỹ thuật
    /// </summary>
    Task<List<Xml3ServiceDto>> GenerateXml3DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML4 - Chi phí ngoài danh mục
    /// </summary>
    Task<List<Xml4OtherMedicineDto>> GenerateXml4DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML5 - Chỉ định thuốc
    /// </summary>
    Task<List<Xml5PrescriptionDto>> GenerateXml5DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML7 - Giấy chuyển tuyến
    /// </summary>
    Task<List<Xml7ReferralDto>> GenerateXml7DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML6 - Máu và chế phẩm máu
    /// </summary>
    Task<List<Xml6BloodDto>> GenerateXml6DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML8 - Vận chuyển người bệnh
    /// </summary>
    Task<List<Xml8TransportDto>> GenerateXml8DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML9 - Giấy nghỉ việc hưởng BHXH
    /// </summary>
    Task<List<Xml9SickLeaveDto>> GenerateXml9DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML10 - Kết quả giám định
    /// </summary>
    Task<List<Xml10AssessmentDto>> GenerateXml10DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML11 - Sổ BHXH
    /// </summary>
    Task<List<Xml11SocialInsuranceDto>> GenerateXml11DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML13 - Giấy hẹn tái khám
    /// </summary>
    Task<List<Xml13ReExamDto>> GenerateXml13DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML14 - Phiếu chuyển tuyến (QĐ 3176)
    /// </summary>
    Task<List<Xml14ReferralCertDto>> GenerateXml14DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tạo dữ liệu XML15 - Điều trị lao
    /// </summary>
    Task<List<Xml15TbTreatmentDto>> GenerateXml15DataAsync(XmlExportConfigDto config);

    /// <summary>
    /// Preview trước khi xuất - hiển thị số lượng bản ghi, chi phí, lỗi blocking
    /// </summary>
    Task<XmlExportPreviewDto> PreviewExportAsync(XmlExportConfigDto config);

    /// <summary>
    /// Xuất file XML tổng hợp
    /// </summary>
    Task<XmlExportResultDto> ExportXmlAsync(XmlExportConfigDto config);

    /// <summary>
    /// Xuất file Excel dữ liệu BHYT
    /// </summary>
    Task<byte[]> ExportExcelAsync(XmlExportConfigDto config);

    /// <summary>
    /// Tải file XML đã xuất
    /// </summary>
    Task<byte[]> DownloadXmlFileAsync(Guid batchId);

    #endregion

    #region 12.4 Kiểm tra và validate

    /// <summary>
    /// Kiểm tra hồ sơ BHYT đơn lẻ
    /// </summary>
    Task<InsuranceValidationResultDto> ValidateClaimAsync(string maLk);

    /// <summary>
    /// Kiểm tra hàng loạt hồ sơ BHYT
    /// </summary>
    Task<List<InsuranceValidationResultDto>> ValidateClaimsBatchAsync(List<string> maLkList);

    /// <summary>
    /// Kiểm tra trước khi xuất XML
    /// </summary>
    Task<List<InsuranceValidationResultDto>> ValidateBeforeExportAsync(XmlExportConfigDto config);

    /// <summary>
    /// Kiểm tra quy tắc kê đơn BHYT
    /// </summary>
    Task<List<PrescriptionValidationError>> ValidateBhytPrescriptionAsync(Guid prescriptionId);

    /// <summary>
    /// Kiểm tra quy tắc chỉ định CLS BHYT
    /// </summary>
    Task<List<ServiceValidationError>> ValidateBhytServiceOrderAsync(Guid serviceOrderId);

    /// <summary>
    /// Kiểm tra chi phí vượt trần BHYT
    /// </summary>
    Task<CostCeilingCheckResult> CheckCostCeilingAsync(string maLk);

    #endregion

    #region 12.5 Gửi dữ liệu lên cổng BHXH

    /// <summary>
    /// Gửi XML lên cổng BHXH
    /// </summary>
    Task<SubmitResultDto> SubmitToInsurancePortalAsync(SubmitToInsurancePortalDto dto);

    /// <summary>
    /// Kiểm tra trạng thái gửi
    /// </summary>
    Task<SubmitStatusDto> CheckSubmitStatusAsync(string transactionId);

    /// <summary>
    /// Lấy kết quả phản hồi từ BHXH
    /// </summary>
    Task<InsuranceFeedbackDto> GetInsuranceFeedbackAsync(string transactionId);

    /// <summary>
    /// Tái gửi hồ sơ bị từ chối
    /// </summary>
    Task<SubmitResultDto> ResubmitRejectedClaimsAsync(List<string> maLkList);

    #endregion

    #region 12.6 Đối soát và quyết toán

    /// <summary>
    /// Tạo đợt quyết toán
    /// </summary>
    Task<InsuranceSettlementBatchDto> CreateSettlementBatchAsync(int month, int year);

    /// <summary>
    /// Lấy thông tin đợt quyết toán
    /// </summary>
    Task<InsuranceSettlementBatchDto?> GetSettlementBatchAsync(Guid batchId);

    /// <summary>
    /// Lấy danh sách đợt quyết toán
    /// </summary>
    Task<List<InsuranceSettlementBatchDto>> GetSettlementBatchesAsync(int year);

    /// <summary>
    /// Import kết quả đối soát từ BHXH
    /// </summary>
    Task<InsuranceReconciliationDto> ImportReconciliationResultAsync(Guid batchId, byte[] fileContent);

    /// <summary>
    /// Lấy danh sách hồ sơ bị từ chối
    /// </summary>
    Task<List<RejectedClaimDto>> GetRejectedClaimsAsync(Guid batchId);

    /// <summary>
    /// Xử lý hồ sơ bị từ chối
    /// </summary>
    Task<bool> ProcessRejectedClaimAsync(string maLk, RejectedClaimProcessDto dto);

    /// <summary>
    /// Tính toán chênh lệch đối soát
    /// </summary>
    Task<ReconciliationDifferenceDto> CalculateReconciliationDifferenceAsync(Guid batchId);

    #endregion

    #region 12.7 Báo cáo BHYT

    /// <summary>
    /// Báo cáo tổng hợp BHYT theo tháng
    /// </summary>
    Task<MonthlyInsuranceReportDto> GetMonthlyInsuranceReportAsync(int month, int year);

    /// <summary>
    /// Báo cáo theo mẫu C79a-HD
    /// </summary>
    Task<ReportC79aDto> GetReportC79aAsync(int month, int year);

    /// <summary>
    /// Báo cáo theo mẫu 80a-HD
    /// </summary>
    Task<Report80aDto> GetReport80aAsync(int month, int year);

    /// <summary>
    /// Xuất báo cáo C79a ra Excel
    /// </summary>
    Task<byte[]> ExportReportC79aToExcelAsync(int month, int year);

    /// <summary>
    /// Xuất báo cáo 80a ra Excel
    /// </summary>
    Task<byte[]> ExportReport80aToExcelAsync(int month, int year);

    /// <summary>
    /// Báo cáo chi tiết theo loại KCB
    /// </summary>
    Task<List<TreatmentTypeReportDto>> GetTreatmentTypeReportAsync(int month, int year);

    /// <summary>
    /// Báo cáo top bệnh thường gặp
    /// </summary>
    Task<List<DiseaseStatDto>> GetTopDiseasesReportAsync(int month, int year, int top = 20);

    /// <summary>
    /// Báo cáo top thuốc sử dụng
    /// </summary>
    Task<List<MedicineStatDto>> GetTopMedicinesReportAsync(int month, int year, int top = 20);

    /// <summary>
    /// Báo cáo theo khoa/phòng
    /// </summary>
    Task<List<DepartmentInsuranceReportDto>> GetDepartmentReportAsync(int month, int year);

    #endregion

    #region 12.8 Quản lý danh mục BHYT

    /// <summary>
    /// Lấy danh sách mapping dịch vụ - mã BHYT
    /// </summary>
    Task<List<ServiceInsuranceMapDto>> GetServiceMappingsAsync(string? keyword = null);

    /// <summary>
    /// Cập nhật mapping dịch vụ - mã BHYT
    /// </summary>
    Task<ServiceInsuranceMapDto> UpdateServiceMappingAsync(Guid id, ServiceInsuranceMapDto dto);

    /// <summary>
    /// Lấy danh sách mapping thuốc - mã BHYT
    /// </summary>
    Task<List<MedicineInsuranceMapDto>> GetMedicineMappingsAsync(string? keyword = null);

    /// <summary>
    /// Cập nhật mapping thuốc - mã BHYT
    /// </summary>
    Task<MedicineInsuranceMapDto> UpdateMedicineMappingAsync(Guid id, MedicineInsuranceMapDto dto);

    /// <summary>
    /// Import danh mục thuốc BHYT từ file
    /// </summary>
    Task<ImportResultDto> ImportMedicineCatalogAsync(byte[] fileContent);

    /// <summary>
    /// Import danh mục dịch vụ BHYT từ file
    /// </summary>
    Task<ImportResultDto> ImportServiceCatalogAsync(byte[] fileContent);

    /// <summary>
    /// Cập nhật giá BHYT theo đợt
    /// </summary>
    Task<InsurancePriceUpdateBatchDto> UpdateInsurancePricesAsync(InsurancePriceUpdateBatchDto dto);

    /// <summary>
    /// Lấy danh sách mã ICD hợp lệ BHYT
    /// </summary>
    Task<List<IcdInsuranceMapDto>> GetValidIcdCodesAsync(string? keyword = null);

    #endregion

    #region 12.9 Cấu hình và thiết lập

    /// <summary>
    /// Lấy cấu hình kết nối cổng BHXH
    /// </summary>
    Task<InsurancePortalConfigDto> GetPortalConfigAsync();

    /// <summary>
    /// Cập nhật cấu hình kết nối cổng BHXH
    /// </summary>
    Task<InsurancePortalConfigDto> UpdatePortalConfigAsync(InsurancePortalConfigDto config);

    /// <summary>
    /// Kiểm tra kết nối cổng BHXH
    /// </summary>
    Task<PortalConnectionTestResult> TestPortalConnectionAsync();

    /// <summary>
    /// Lấy thông tin cơ sở KCB
    /// </summary>
    Task<FacilityInfoDto> GetFacilityInfoAsync();

    /// <summary>
    /// Cập nhật thông tin cơ sở KCB
    /// </summary>
    Task<FacilityInfoDto> UpdateFacilityInfoAsync(FacilityInfoDto dto);

    #endregion

    #region 12.10 Tiện ích

    /// <summary>
    /// Tạo mã liên thông mới
    /// </summary>
    Task<string> GenerateMaLkAsync(Guid examinationId);

    /// <summary>
    /// Tính toán chi phí BHYT cho dịch vụ
    /// </summary>
    Task<InsuranceCostCalculationDto> CalculateServiceInsuranceCostAsync(Guid serviceId, string insuranceNumber);

    /// <summary>
    /// Tính toán chi phí BHYT cho thuốc
    /// </summary>
    Task<InsuranceCostCalculationDto> CalculateMedicineInsuranceCostAsync(Guid medicineId, decimal quantity, string insuranceNumber);

    /// <summary>
    /// Lấy tỷ lệ thanh toán BHYT
    /// </summary>
    Task<int> GetInsurancePaymentRatioAsync(string insuranceNumber, int treatmentType);

    /// <summary>
    /// Kiểm tra đúng tuyến/trái tuyến
    /// </summary>
    Task<ReferralCheckResult> CheckReferralStatusAsync(string insuranceNumber, string facilityCode);

    /// <summary>
    /// Lấy log hoạt động BHYT
    /// </summary>
    Task<List<InsuranceActivityLogDto>> GetInsuranceLogsAsync(string? maLk = null, DateTime? fromDate = null, DateTime? toDate = null);

    #endregion
}

#region Supporting DTOs

public class InsuranceBenefitDto
{
    public string InsuranceNumber { get; set; } = string.Empty;
    public int PaymentRatio { get; set; }
    public bool HasCoPayExemption { get; set; }
    public bool Is5YearsContinuous { get; set; }
    public List<string> CoveredServices { get; set; } = new();
    public decimal? RemainingBudget { get; set; }
}

public class InsuranceClaimSearchDto
{
    public string? Keyword { get; set; }
    public string? MaLk { get; set; }
    public string? PatientCode { get; set; }
    public string? InsuranceNumber { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class UpdateInsuranceClaimDto
{
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public int? TreatmentResult { get; set; }
    public string? Notes { get; set; }
}

public class PrescriptionValidationError
{
    public string ErrorCode { get; set; } = string.Empty;
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsBlocking { get; set; }
}

public class ServiceValidationError
{
    public string ErrorCode { get; set; } = string.Empty;
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsBlocking { get; set; }
}

public class CostCeilingCheckResult
{
    public string MaLk { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }
    public decimal CeilingAmount { get; set; }
    public bool IsExceeded { get; set; }
    public decimal ExceededAmount { get; set; }
    public List<string> ViolatedRules { get; set; } = new();
}

public class SubmitStatusDto
{
    public string TransactionId { get; set; } = string.Empty;
    public int Status { get; set; } // 0-Đang xử lý, 1-Thành công, 2-Lỗi
    public string StatusName { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class InsuranceFeedbackDto
{
    public string TransactionId { get; set; } = string.Empty;
    public int TotalRecords { get; set; }
    public int AcceptedRecords { get; set; }
    public int RejectedRecords { get; set; }
    public List<FeedbackItem> Items { get; set; } = new();
}

public class FeedbackItem
{
    public string MaLk { get; set; } = string.Empty;
    public bool IsAccepted { get; set; }
    public string? RejectCode { get; set; }
    public string? RejectReason { get; set; }
}

public class RejectedClaimProcessDto
{
    public int Action { get; set; } // 1-Sửa và gửi lại, 2-Chấp nhận từ chối, 3-Khiếu nại
    public string? Notes { get; set; }
    public UpdateInsuranceClaimDto? UpdateData { get; set; }
}

public class ReconciliationDifferenceDto
{
    public Guid BatchId { get; set; }
    public decimal HospitalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal DifferenceAmount { get; set; }
    public List<DifferenceDetail> Details { get; set; } = new();
}

public class DifferenceDetail
{
    public string Category { get; set; } = string.Empty;
    public decimal HospitalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal Difference { get; set; }
}

public class TreatmentTypeReportDto
{
    public string TreatmentTypeCode { get; set; } = string.Empty;
    public string TreatmentTypeName { get; set; } = string.Empty;
    public int VisitCount { get; set; }
    public decimal TotalCost { get; set; }
    public decimal InsurancePaid { get; set; }
    public decimal PatientPaid { get; set; }
}

public class DepartmentInsuranceReportDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int VisitCount { get; set; }
    public decimal TotalCost { get; set; }
    public decimal InsurancePaid { get; set; }
    public decimal MedicineCost { get; set; }
    public decimal ServiceCost { get; set; }
}

public class ImportResultDto
{
    public int TotalRows { get; set; }
    public int SuccessRows { get; set; }
    public int FailedRows { get; set; }
    public List<ImportError> Errors { get; set; } = new();
}

public class ImportError
{
    public int RowNumber { get; set; }
    public string ColumnName { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}

public class InsurancePortalConfigDto
{
    public string PortalUrl { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Password { get; set; }
    public string CertificatePath { get; set; } = string.Empty;
    public bool UseProxy { get; set; }
    public string? ProxyUrl { get; set; }
    public int TimeoutSeconds { get; set; } = 60;
    public bool TestMode { get; set; }
}

public class PortalConnectionTestResult
{
    public bool IsConnected { get; set; }
    public int ResponseTimeMs { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime TestedAt { get; set; }
}

public class FacilityInfoDto
{
    public string MaCsKcb { get; set; } = string.Empty;
    public string TenCsKcb { get; set; } = string.Empty;
    public string DiaChi { get; set; } = string.Empty;
    public string MaTinh { get; set; } = string.Empty;
    public string MaHuyen { get; set; } = string.Empty;
    public int HangBenhVien { get; set; }
    public int TuyenKcb { get; set; }
    public string? MaSoThue { get; set; }
    public string? SoDienThoai { get; set; }
    public string? GiamDoc { get; set; }
}

public class InsuranceCostCalculationDto
{
    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public int PaymentRatio { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal CoPayAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public string? Notes { get; set; }
}

public class ReferralCheckResult
{
    public bool IsCorrectReferral { get; set; } // Đúng tuyến
    public int PaymentRatio { get; set; }
    public string? Reason { get; set; }
    public bool RequiresReferralLetter { get; set; }
}

public class InsuranceActivityLogDto
{
    public Guid Id { get; set; }
    public string? MaLk { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? UserName { get; set; }
    public DateTime Timestamp { get; set; }
    public string? IpAddress { get; set; }
}

#endregion
