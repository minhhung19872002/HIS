using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HIS.Application.DTOs.Laboratory;

namespace HIS.Application.Services
{
    /// <summary>
    /// Complete LIS (Laboratory Information System) Service Interface
    /// Module 7: Xét nghiệm - 31+ chức năng
    /// </summary>
    public interface ILISCompleteService
    {
        #region DEV Endpoints
        /// <summary>
        /// Update all lab order dates to today (DEV only)
        /// </summary>
        Task<int> UpdateAllOrderDatesToTodayAsync();
        #endregion

        #region 7.1 Kết nối máy xét nghiệm (8 chức năng)

        /// <summary>
        /// 7.1.1 Danh sách máy xét nghiệm
        /// </summary>
        Task<List<LabAnalyzerDto>> GetAnalyzersAsync(string keyword = null, bool? isActive = null);

        /// <summary>
        /// 7.1.2 Thêm mới máy xét nghiệm
        /// </summary>
        Task<LabAnalyzerDto> CreateAnalyzerAsync(CreateAnalyzerDto dto);

        /// <summary>
        /// 7.1.3 Cập nhật thông tin máy
        /// </summary>
        Task<LabAnalyzerDto> UpdateAnalyzerAsync(Guid id, UpdateAnalyzerDto dto);

        /// <summary>
        /// 7.1.4 Xóa máy xét nghiệm
        /// </summary>
        Task<bool> DeleteAnalyzerAsync(Guid id);

        /// <summary>
        /// 7.1.5 Mapping chỉ số xét nghiệm với máy
        /// </summary>
        Task<List<AnalyzerTestMappingDto>> GetAnalyzerTestMappingsAsync(Guid analyzerId);

        /// <summary>
        /// 7.1.6 Cập nhật mapping chỉ số
        /// </summary>
        Task<bool> UpdateAnalyzerTestMappingsAsync(Guid analyzerId, List<UpdateAnalyzerTestMappingDto> mappings);

        /// <summary>
        /// 7.1.7 Kiểm tra kết nối máy xét nghiệm
        /// </summary>
        Task<AnalyzerConnectionStatusDto> CheckAnalyzerConnectionAsync(Guid analyzerId);

        /// <summary>
        /// 7.1.8 Khởi động/Dừng kết nối máy
        /// </summary>
        Task<bool> ToggleAnalyzerConnectionAsync(Guid analyzerId, bool connect);

        /// <summary>
        /// Lấy dữ liệu thô từ máy xét nghiệm
        /// </summary>
        Task<List<RawDataDto>> GetRawDataFromAnalyzerAsync(Guid analyzerId, DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Parse dữ liệu thô theo protocol (HL7, ASTM1381, ASTM1394)
        /// </summary>
        Task<List<ParsedLabResultDto>> ParseRawDataAsync(Guid analyzerId, List<string> rawDataLines);

        /// <summary>
        /// Lấy lịch sử kết nối máy
        /// </summary>
        Task<List<AnalyzerConnectionLogDto>> GetConnectionLogsAsync(Guid analyzerId, DateTime fromDate, DateTime toDate);

        #endregion

        #region 7.2 Lấy mẫu xét nghiệm (4 chức năng)

        /// <summary>
        /// 7.2.1 Danh sách bệnh nhân chờ lấy mẫu
        /// </summary>
        Task<List<SampleCollectionListDto>> GetSampleCollectionListAsync(
            DateTime date,
            Guid? departmentId = null,
            string patientType = null,
            string keyword = null);

        /// <summary>
        /// 7.2.2 Chi tiết mẫu cần lấy của bệnh nhân
        /// </summary>
        Task<List<SampleCollectionItemDto>> GetPatientSamplesAsync(Guid patientId, Guid visitId);

        /// <summary>
        /// 7.2.3 Thực hiện lấy mẫu (ghi nhận)
        /// </summary>
        Task<CollectSampleResultDto> CollectSampleAsync(CollectSampleDto dto);

        /// <summary>
        /// 7.2.4 In nhãn barcode mẫu
        /// </summary>
        Task<byte[]> PrintSampleBarcodeAsync(Guid sampleId);

        /// <summary>
        /// In nhãn barcode hàng loạt
        /// </summary>
        Task<byte[]> PrintSampleBarcodesBatchAsync(List<Guid> sampleIds);

        /// <summary>
        /// Hủy mẫu đã lấy
        /// </summary>
        Task<bool> CancelSampleAsync(Guid sampleId, string reason);

        /// <summary>
        /// Lấy danh sách loại mẫu
        /// </summary>
        Task<List<SampleTypeDto>> GetSampleTypesAsync();

        /// <summary>
        /// Lấy danh sách loại ống nghiệm
        /// </summary>
        Task<List<TubeTypeDto>> GetTubeTypesAsync();

        /// <summary>
        /// Kiểm tra mẫu có hợp lệ không (thời gian, điều kiện)
        /// </summary>
        Task<SampleValidationResultDto> ValidateSampleAsync(Guid sampleId);

        #endregion

        #region 7.3 Thực hiện xét nghiệm (11 chức năng)

        /// <summary>
        /// 7.3.1 Danh sách xét nghiệm chờ thực hiện
        /// </summary>
        Task<List<LabOrderDto>> GetPendingLabOrdersAsync(
            DateTime date,
            Guid? departmentId = null,
            Guid? analyzerId = null,
            string patientType = null,
            string keyword = null);

        /// <summary>
        /// 7.3.2 Chi tiết xét nghiệm của bệnh nhân
        /// </summary>
        Task<LabOrderDetailDto> GetLabOrderDetailAsync(Guid orderId);

        /// <summary>
        /// 7.3.3 Gửi worklist đến máy xét nghiệm
        /// </summary>
        Task<SendWorklistResultDto> SendWorklistToAnalyzerAsync(SendWorklistDto dto);

        /// <summary>
        /// 7.3.4 Nhận kết quả từ máy xét nghiệm
        /// </summary>
        Task<ReceiveResultDto> ReceiveResultFromAnalyzerAsync(Guid analyzerId);

        /// <summary>
        /// 7.3.5 Nhập kết quả thủ công
        /// </summary>
        Task<bool> EnterLabResultAsync(EnterLabResultDto dto);

        /// <summary>
        /// 7.3.6 Duyệt kết quả xét nghiệm (1 bước)
        /// </summary>
        Task<bool> ApproveLabResultAsync(ApproveLabResultDto dto);

        /// <summary>
        /// 7.3.7 Duyệt kết quả xét nghiệm (2 bước - duyệt sơ bộ)
        /// </summary>
        Task<bool> PreliminaryApproveLabResultAsync(Guid orderId, string technicianNote);

        /// <summary>
        /// 7.3.8 Duyệt kết quả xét nghiệm (2 bước - duyệt chính thức)
        /// </summary>
        Task<bool> FinalApproveLabResultAsync(Guid orderId, string doctorNote);

        /// <summary>
        /// 7.3.9 Hủy duyệt kết quả
        /// </summary>
        Task<bool> CancelApprovalAsync(Guid orderId, string reason);

        /// <summary>
        /// 7.3.10 In phiếu kết quả xét nghiệm
        /// </summary>
        Task<byte[]> PrintLabResultAsync(Guid orderId, string format = "A4");

        /// <summary>
        /// 7.3.11 Xử lý giá trị nguy hiểm (Critical Value)
        /// </summary>
        Task<bool> ProcessCriticalValueAsync(ProcessCriticalValueDto dto);

        /// <summary>
        /// Lấy danh sách cảnh báo giá trị nguy hiểm
        /// </summary>
        Task<List<CriticalValueAlertDto>> GetCriticalValueAlertsAsync(DateTime fromDate, DateTime toDate, bool? acknowledged = null);

        /// <summary>
        /// Xác nhận đã thông báo giá trị nguy hiểm
        /// </summary>
        Task<bool> AcknowledgeCriticalValueAsync(Guid alertId, AcknowledgeCriticalValueDto dto);

        /// <summary>
        /// Lấy lịch sử kết quả xét nghiệm của bệnh nhân
        /// </summary>
        Task<List<LabResultHistoryDto>> GetLabResultHistoryAsync(Guid patientId, string testCode = null, int? lastNMonths = 12);

        /// <summary>
        /// So sánh kết quả với các lần trước
        /// </summary>
        Task<LabResultComparisonDto> CompareLabResultsAsync(Guid patientId, string testCode, int lastNTimes = 5);

        /// <summary>
        /// Tính delta check (kiểm tra chênh lệch bất thường)
        /// </summary>
        Task<DeltaCheckResultDto> PerformDeltaCheckAsync(Guid orderId);

        /// <summary>
        /// Làm lại xét nghiệm
        /// </summary>
        Task<bool> RerunLabTestAsync(Guid orderItemId, string reason);

        /// <summary>
        /// Chạy QC (Quality Control)
        /// </summary>
        Task<QCResultDto> RunQCAsync(RunQCDto dto);

        /// <summary>
        /// Lấy biểu đồ Levy-Jennings cho QC
        /// </summary>
        Task<LeveyJenningsChartDto> GetLeveyJenningsChartAsync(Guid testId, Guid analyzerId, DateTime fromDate, DateTime toDate);

        #endregion

        #region 7.4 Quản lý (8 chức năng)

        /// <summary>
        /// 7.4.1 Danh mục chỉ số xét nghiệm
        /// </summary>
        Task<List<LabTestCatalogDto>> GetLabTestCatalogAsync(string keyword = null, Guid? groupId = null, bool? isActive = null);

        /// <summary>
        /// 7.4.2 Thêm/Sửa chỉ số xét nghiệm
        /// </summary>
        Task<LabTestCatalogDto> SaveLabTestAsync(SaveLabTestDto dto);

        /// <summary>
        /// 7.4.3 Danh mục nhóm xét nghiệm
        /// </summary>
        Task<List<LabTestGroupDto>> GetLabTestGroupsAsync();

        /// <summary>
        /// 7.4.4 Thêm/Sửa nhóm xét nghiệm
        /// </summary>
        Task<LabTestGroupDto> SaveLabTestGroupAsync(SaveLabTestGroupDto dto);

        /// <summary>
        /// 7.4.5 Thiết lập giá trị tham chiếu
        /// </summary>
        Task<List<ReferenceRangeDto>> GetReferenceRangesAsync(Guid testId);

        /// <summary>
        /// 7.4.6 Cập nhật giá trị tham chiếu
        /// </summary>
        Task<bool> UpdateReferenceRangesAsync(Guid testId, List<UpdateReferenceRangeDto> ranges);

        /// <summary>
        /// 7.4.7 Thiết lập giá trị nguy hiểm (Critical Value)
        /// </summary>
        Task<CriticalValueConfigDto> GetCriticalValueConfigAsync(Guid testId);

        /// <summary>
        /// 7.4.8 Cập nhật giá trị nguy hiểm
        /// </summary>
        Task<bool> UpdateCriticalValueConfigAsync(Guid testId, UpdateCriticalValueConfigDto dto);

        /// <summary>
        /// Danh sách định mức xét nghiệm
        /// </summary>
        Task<List<LabTestNormDto>> GetLabTestNormsAsync(Guid testId);

        /// <summary>
        /// Cập nhật định mức xét nghiệm
        /// </summary>
        Task<bool> UpdateLabTestNormsAsync(Guid testId, List<UpdateLabTestNormDto> norms);

        /// <summary>
        /// Thiết lập mẫu kết luận xét nghiệm
        /// </summary>
        Task<List<LabConclusionTemplateDto>> GetConclusionTemplatesAsync(Guid? testId = null);

        /// <summary>
        /// Lưu mẫu kết luận
        /// </summary>
        Task<LabConclusionTemplateDto> SaveConclusionTemplateAsync(SaveConclusionTemplateDto dto);

        #endregion

        #region Báo cáo & Thống kê

        /// <summary>
        /// Sổ đăng ký xét nghiệm
        /// </summary>
        Task<LabRegisterReportDto> GetLabRegisterReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// Thống kê xét nghiệm theo loại
        /// </summary>
        Task<LabStatisticsDto> GetLabStatisticsAsync(DateTime fromDate, DateTime toDate, string groupBy = "day");

        /// <summary>
        /// Báo cáo doanh thu xét nghiệm
        /// </summary>
        Task<LabRevenueReportDto> GetLabRevenueReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// Báo cáo TAT (Turnaround Time)
        /// </summary>
        Task<LabTATReportDto> GetLabTATReportAsync(DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Báo cáo công suất máy xét nghiệm
        /// </summary>
        Task<AnalyzerUtilizationReportDto> GetAnalyzerUtilizationReportAsync(DateTime fromDate, DateTime toDate, Guid? analyzerId = null);

        /// <summary>
        /// Báo cáo tỷ lệ giá trị bất thường
        /// </summary>
        Task<AbnormalRateReportDto> GetAbnormalRateReportAsync(DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Báo cáo kiểm soát chất lượng (QC)
        /// </summary>
        Task<QCReportDto> GetQCReportAsync(DateTime fromDate, DateTime toDate, Guid? analyzerId = null);

        /// <summary>
        /// Xuất dữ liệu xét nghiệm cho BHXH
        /// </summary>
        Task<byte[]> ExportLabDataForBHXHAsync(DateTime fromDate, DateTime toDate);

        #endregion

        #region Worklist & Analyzer Integration

        /// <summary>
        /// Tạo worklist cho máy xét nghiệm
        /// </summary>
        Task<WorklistDto> CreateWorklistAsync(CreateWorklistDto dto);

        /// <summary>
        /// Lấy worklist đang chờ
        /// </summary>
        Task<List<WorklistDto>> GetPendingWorklistsAsync(Guid? analyzerId = null);

        /// <summary>
        /// Xử lý kết quả từ máy (auto-map và lưu)
        /// </summary>
        Task<ProcessAnalyzerResultDto> ProcessAnalyzerResultAsync(Guid analyzerId, string rawData);

        /// <summary>
        /// Lấy kết quả chưa được map
        /// </summary>
        Task<List<UnmappedResultDto>> GetUnmappedResultsAsync(Guid? analyzerId = null);

        /// <summary>
        /// Map thủ công kết quả chưa được nhận diện
        /// </summary>
        Task<bool> ManualMapResultAsync(ManualMapResultDto dto);

        /// <summary>
        /// Retry gửi worklist thất bại
        /// </summary>
        Task<bool> RetryWorklistAsync(Guid worklistId);

        /// <summary>
        /// Lấy trạng thái real-time của các máy
        /// </summary>
        Task<List<AnalyzerRealtimeStatusDto>> GetAnalyzersRealtimeStatusAsync();

        #endregion

        #region Xét nghiệm nhanh (POCT - Point of Care Testing)

        /// <summary>
        /// Danh sách thiết bị POCT
        /// </summary>
        Task<List<POCTDeviceDto>> GetPOCTDevicesAsync(string keyword = null);

        /// <summary>
        /// Nhập kết quả POCT
        /// </summary>
        Task<bool> EnterPOCTResultAsync(EnterPOCTResultDto dto);

        /// <summary>
        /// Đồng bộ kết quả POCT từ thiết bị
        /// </summary>
        Task<SyncPOCTResultDto> SyncPOCTResultsAsync(Guid deviceId);

        #endregion

        #region Vi sinh (Microbiology)

        /// <summary>
        /// Danh sách nuôi cấy vi khuẩn
        /// </summary>
        Task<List<MicrobiologyCultureDto>> GetMicrobiologyCulturesAsync(DateTime fromDate, DateTime toDate, string status = null);

        /// <summary>
        /// Nhập kết quả nuôi cấy
        /// </summary>
        Task<bool> EnterCultureResultAsync(EnterCultureResultDto dto);

        /// <summary>
        /// Nhập kết quả kháng sinh đồ
        /// </summary>
        Task<bool> EnterAntibioticSensitivityAsync(EnterAntibioticSensitivityDto dto);

        /// <summary>
        /// Lấy danh sách kháng sinh
        /// </summary>
        Task<List<AntibioticDto>> GetAntibioticsAsync();

        /// <summary>
        /// Lấy danh sách vi khuẩn
        /// </summary>
        Task<List<BacteriaDto>> GetBacteriasAsync();

        /// <summary>
        /// Báo cáo thống kê vi sinh
        /// </summary>
        Task<MicrobiologyStatisticsDto> GetMicrobiologyStatisticsAsync(DateTime fromDate, DateTime toDate);

        #endregion

        #region Queue Display (Public)

        /// <summary>
        /// Lấy dữ liệu hiển thị hàng đợi xét nghiệm (public, không cần auth)
        /// </summary>
        Task<LabQueueDisplayDto> GetLabQueueDisplayAsync();

        #endregion
    }

    #region Additional DTOs for LIS Service

    public class CreateAnalyzerDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? Protocol { get; set; } // HL7, ASTM1381, ASTM1394, RS232, TCP/IP
        public string? ConnectionType { get; set; } // Serial, TCP, File
        public string? ConnectionString { get; set; }
        public string? IpAddress { get; set; }
        public int? Port { get; set; }
        public string? ComPort { get; set; }
        public int? BaudRate { get; set; }
        public string? DataBits { get; set; }
        public string? Parity { get; set; }
        public string? StopBits { get; set; }
        public Guid? DepartmentId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateAnalyzerDto : CreateAnalyzerDto
    {
        public Guid Id { get; set; }
    }

    public class UpdateAnalyzerTestMappingDto
    {
        public Guid TestId { get; set; }
        public string AnalyzerTestCode { get; set; }
        public string AnalyzerTestName { get; set; }
        public decimal? Factor { get; set; }
        public bool IsActive { get; set; }
    }

    public class AnalyzerConnectionLogDto
    {
        public Guid Id { get; set; }
        public Guid AnalyzerId { get; set; }
        public string AnalyzerName { get; set; }
        public DateTime EventTime { get; set; }
        public string EventType { get; set; } // Connected, Disconnected, Error, DataReceived, DataSent
        public string Message { get; set; }
        public string RawData { get; set; }
    }

    public class CollectSampleResultDto
    {
        public Guid SampleId { get; set; }
        public string Barcode { get; set; }
        public bool Success { get; set; }
        public string Message { get; set; }
    }

    public class TubeTypeDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Color { get; set; }
        public string ColorHex { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; }
    }

    public class SampleValidationResultDto
    {
        public Guid SampleId { get; set; }
        public bool IsValid { get; set; }
        public List<string> Warnings { get; set; }
        public List<string> Errors { get; set; }
        public DateTime? ExpirationTime { get; set; }
    }

    public class LabOrderDetailDto
    {
        public Guid Id { get; set; }
        public string OrderCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public DateTime OrderDate { get; set; }
        public string OrderDoctorName { get; set; }
        public string DepartmentName { get; set; }
        public string Diagnosis { get; set; }
        public string ClinicalInfo { get; set; }
        public List<LabTestItemDto> TestItems { get; set; }
        public List<SampleCollectionItemDto> Samples { get; set; }
    }

    public class SendWorklistDto
    {
        public Guid AnalyzerId { get; set; }
        public List<Guid> OrderIds { get; set; }
    }

    public class SendWorklistResultDto
    {
        public bool Success { get; set; }
        public int SentCount { get; set; }
        public int FailedCount { get; set; }
        public List<string> Errors { get; set; }
    }

    public class ReceiveResultDto
    {
        public int ReceivedCount { get; set; }
        public int ProcessedCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Errors { get; set; }
        public List<AnalyzerResultDto> Results { get; set; }
    }

    public class ApproveLabResultDto
    {
        public Guid OrderId { get; set; }
        public List<Guid> ItemIds { get; set; }
        public string Note { get; set; }
        public string Conclusion { get; set; }
    }

    public class ProcessCriticalValueDto
    {
        public Guid AlertId { get; set; }
        public string Action { get; set; } // Notify, Escalate, Acknowledge
        public string NotifiedPerson { get; set; }
        public string NotificationMethod { get; set; } // Phone, SMS, Email, InPerson
        public string Note { get; set; }
    }

    public class AcknowledgeCriticalValueDto
    {
        public string NotifiedPerson { get; set; }
        public string NotificationMethod { get; set; }
        public DateTime NotificationTime { get; set; }
        public string Note { get; set; }
    }

    public class LabResultHistoryDto
    {
        public Guid OrderId { get; set; }
        public DateTime TestDate { get; set; }
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public string Result { get; set; }
        public string Unit { get; set; }
        public string ReferenceRange { get; set; }
        public string Flag { get; set; } // Normal, High, Low, Critical
        public string ApprovedBy { get; set; }
    }

    public class LabResultComparisonDto
    {
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public string Unit { get; set; }
        public List<LabResultPointDto> DataPoints { get; set; }
        public decimal? TrendPercentage { get; set; }
        public string TrendDirection { get; set; } // Increasing, Decreasing, Stable
    }

    public class LabResultPointDto
    {
        public DateTime Date { get; set; }
        public decimal Value { get; set; }
        public string Flag { get; set; }
    }

    public class DeltaCheckResultDto
    {
        public Guid OrderId { get; set; }
        public List<DeltaCheckItemDto> Items { get; set; }
        public bool HasCriticalDelta { get; set; }
    }

    public class DeltaCheckItemDto
    {
        public Guid TestId { get; set; }
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public decimal CurrentValue { get; set; }
        public decimal? PreviousValue { get; set; }
        public DateTime? PreviousDate { get; set; }
        public decimal? DeltaPercent { get; set; }
        public decimal? DeltaThreshold { get; set; }
        public bool IsCritical { get; set; }
    }

    public class RunQCDto
    {
        public Guid AnalyzerId { get; set; }
        public Guid TestId { get; set; }
        public string QCLevel { get; set; } // Level1, Level2, Level3
        public string QCLotNumber { get; set; }
        public decimal QCValue { get; set; }
        public DateTime RunTime { get; set; }
    }

    public class QCResultDto
    {
        public Guid Id { get; set; }
        public string QCLevel { get; set; }
        public decimal Value { get; set; }
        public decimal Mean { get; set; }
        public decimal SD { get; set; }
        public decimal CV { get; set; }
        public decimal ZScore { get; set; }
        public bool IsAccepted { get; set; }
        public string WestgardRule { get; set; }
        public List<string> Violations { get; set; }
    }

    public class LeveyJenningsChartDto
    {
        public string TestName { get; set; }
        public string AnalyzerName { get; set; }
        public decimal Mean { get; set; }
        public decimal SD { get; set; }
        public decimal Plus1SD { get; set; }
        public decimal Plus2SD { get; set; }
        public decimal Plus3SD { get; set; }
        public decimal Minus1SD { get; set; }
        public decimal Minus2SD { get; set; }
        public decimal Minus3SD { get; set; }
        public List<QCDataPointDto> DataPoints { get; set; }
    }

    public class QCDataPointDto
    {
        public DateTime Date { get; set; }
        public decimal Value { get; set; }
        public string Level { get; set; }
        public bool IsRejected { get; set; }
        public string Violations { get; set; }
    }

    public class SaveLabTestDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string EnglishName { get; set; }
        public Guid GroupId { get; set; }
        public string Unit { get; set; }
        public string ResultType { get; set; } // Numeric, Text, Selection
        public string ResultOptions { get; set; }
        public int? DecimalPlaces { get; set; }
        public decimal? Price { get; set; }
        public decimal? InsurancePrice { get; set; }
        public string SampleType { get; set; }
        public string TubeType { get; set; }
        public int? TATMinutes { get; set; }
        public bool IsActive { get; set; }
    }

    public class LabTestCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string EnglishName { get; set; }
        public Guid GroupId { get; set; }
        public string GroupName { get; set; }
        public string Unit { get; set; }
        public string ResultType { get; set; }
        public string ResultOptions { get; set; }
        public int? DecimalPlaces { get; set; }
        public decimal? Price { get; set; }
        public decimal? InsurancePrice { get; set; }
        public string SampleType { get; set; }
        public string TubeType { get; set; }
        public int? TATMinutes { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveLabTestGroupDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class LabTestGroupDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public int SortOrder { get; set; }
        public int TestCount { get; set; }
        public bool IsActive { get; set; }
    }

    public class ReferenceRangeDto
    {
        public Guid Id { get; set; }
        public Guid TestId { get; set; }
        public string Gender { get; set; } // Male, Female, Both
        public int? AgeFromDays { get; set; }
        public int? AgeToDays { get; set; }
        public decimal? LowValue { get; set; }
        public decimal? HighValue { get; set; }
        public string TextRange { get; set; }
        public string Description { get; set; }
    }

    public class UpdateReferenceRangeDto
    {
        public Guid? Id { get; set; }
        public string Gender { get; set; }
        public int? AgeFromDays { get; set; }
        public int? AgeToDays { get; set; }
        public decimal? LowValue { get; set; }
        public decimal? HighValue { get; set; }
        public string TextRange { get; set; }
        public string Description { get; set; }
    }

    public class CriticalValueConfigDto
    {
        public Guid TestId { get; set; }
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public decimal? CriticalLow { get; set; }
        public decimal? CriticalHigh { get; set; }
        public decimal? PanicLow { get; set; }
        public decimal? PanicHigh { get; set; }
        public bool RequireAcknowledgment { get; set; }
        public int? AcknowledgmentTimeoutMinutes { get; set; }
        public string NotificationMethod { get; set; }
    }

    public class UpdateCriticalValueConfigDto
    {
        public decimal? CriticalLow { get; set; }
        public decimal? CriticalHigh { get; set; }
        public decimal? PanicLow { get; set; }
        public decimal? PanicHigh { get; set; }
        public bool RequireAcknowledgment { get; set; }
        public int? AcknowledgmentTimeoutMinutes { get; set; }
        public string NotificationMethod { get; set; }
    }

    public class UpdateLabTestNormDto
    {
        public Guid? Id { get; set; }
        public Guid ReagentId { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
    }

    public class LabConclusionTemplateDto
    {
        public Guid Id { get; set; }
        public Guid? TestId { get; set; }
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public string TemplateCode { get; set; }
        public string TemplateName { get; set; }
        public string ConclusionText { get; set; }
        public string Condition { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveConclusionTemplateDto
    {
        public Guid? Id { get; set; }
        public Guid? TestId { get; set; }
        public string TemplateCode { get; set; }
        public string TemplateName { get; set; }
        public string ConclusionText { get; set; }
        public string Condition { get; set; }
        public bool IsActive { get; set; }
    }

    public class LabRegisterReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string DepartmentName { get; set; }
        public int TotalOrders { get; set; }
        public int TotalTests { get; set; }
        public List<LabRegisterItemDto> Items { get; set; }
    }

    public class LabRegisterItemDto
    {
        public int RowNumber { get; set; }
        public DateTime OrderDate { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public int? Age { get; set; }
        public string Gender { get; set; }
        public string TestName { get; set; }
        public string Result { get; set; }
        public string Unit { get; set; }
        public string ReferenceRange { get; set; }
        public string Flag { get; set; }
        public string OrderDoctorName { get; set; }
        public string TechnicianName { get; set; }
    }

    public class LabTATReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalTests { get; set; }
        public decimal AverageTATMinutes { get; set; }
        public decimal TATCompliancePercent { get; set; }
        public List<LabTATByTestDto> TATByTest { get; set; }
        public List<LabTATByDayDto> TATByDay { get; set; }
    }

    public class LabTATByTestDto
    {
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public int TestCount { get; set; }
        public int? TargetTATMinutes { get; set; }
        public decimal AverageTATMinutes { get; set; }
        public decimal CompliancePercent { get; set; }
    }

    public class LabTATByDayDto
    {
        public DateTime Date { get; set; }
        public int TestCount { get; set; }
        public decimal AverageTATMinutes { get; set; }
        public decimal CompliancePercent { get; set; }
    }

    public class AnalyzerUtilizationReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<AnalyzerUtilizationItemDto> Analyzers { get; set; }
    }

    public class AnalyzerUtilizationItemDto
    {
        public Guid AnalyzerId { get; set; }
        public string AnalyzerName { get; set; }
        public int TotalTests { get; set; }
        public int Capacity { get; set; }
        public decimal UtilizationPercent { get; set; }
        public decimal UptimePercent { get; set; }
        public int ErrorCount { get; set; }
    }

    public class AbnormalRateReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalTests { get; set; }
        public int AbnormalCount { get; set; }
        public decimal AbnormalPercent { get; set; }
        public int CriticalCount { get; set; }
        public decimal CriticalPercent { get; set; }
        public List<AbnormalRateByTestDto> ByTest { get; set; }
    }

    public class AbnormalRateByTestDto
    {
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public int TotalCount { get; set; }
        public int AbnormalCount { get; set; }
        public decimal AbnormalPercent { get; set; }
        public int HighCount { get; set; }
        public int LowCount { get; set; }
        public int CriticalCount { get; set; }
    }

    public class QCReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<QCReportByAnalyzerDto> ByAnalyzer { get; set; }
    }

    public class QCReportByAnalyzerDto
    {
        public Guid AnalyzerId { get; set; }
        public string AnalyzerName { get; set; }
        public int TotalQCRuns { get; set; }
        public int AcceptedRuns { get; set; }
        public int RejectedRuns { get; set; }
        public decimal AcceptanceRate { get; set; }
        public List<QCReportByTestDto> ByTest { get; set; }
    }

    public class QCReportByTestDto
    {
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public int TotalRuns { get; set; }
        public int Accepted { get; set; }
        public int Rejected { get; set; }
        public decimal CV { get; set; }
        public decimal Bias { get; set; }
    }

    public class CreateWorklistDto
    {
        public Guid AnalyzerId { get; set; }
        public List<Guid> OrderIds { get; set; }
        public bool AutoSend { get; set; }
    }

    public class ProcessAnalyzerResultDto
    {
        public int ProcessedCount { get; set; }
        public int MatchedCount { get; set; }
        public int UnmatchedCount { get; set; }
        public List<string> Errors { get; set; }
    }

    public class UnmappedResultDto
    {
        public Guid Id { get; set; }
        public Guid AnalyzerId { get; set; }
        public string AnalyzerName { get; set; }
        public string SampleId { get; set; }
        public string TestCode { get; set; }
        public string Result { get; set; }
        public DateTime ReceivedTime { get; set; }
        public string RawData { get; set; }
    }

    public class ManualMapResultDto
    {
        public Guid UnmappedResultId { get; set; }
        public Guid OrderItemId { get; set; }
    }

    public class AnalyzerRealtimeStatusDto
    {
        public Guid AnalyzerId { get; set; }
        public string AnalyzerName { get; set; }
        public string Status { get; set; } // Online, Offline, Error, Processing
        public DateTime? LastCommunication { get; set; }
        public int PendingWorklistCount { get; set; }
        public int TodayTestCount { get; set; }
        public string CurrentQCStatus { get; set; }
        public List<string> ActiveAlerts { get; set; }
    }

    public class POCTDeviceDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public string Location { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public bool IsActive { get; set; }
    }

    public class EnterPOCTResultDto
    {
        public Guid DeviceId { get; set; }
        public Guid PatientId { get; set; }
        public Guid? VisitId { get; set; }
        public string TestCode { get; set; }
        public string Result { get; set; }
        public DateTime TestTime { get; set; }
        public string OperatorId { get; set; }
    }

    public class SyncPOCTResultDto
    {
        public int SyncedCount { get; set; }
        public int MatchedCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Errors { get; set; }
    }

    public class MicrobiologyCultureDto
    {
        public Guid Id { get; set; }
        public Guid OrderId { get; set; }
        public string OrderCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public string SampleType { get; set; }
        public DateTime CollectionDate { get; set; }
        public DateTime? CultureStartDate { get; set; }
        public string Status { get; set; } // Pending, InProgress, Completed, NoGrowth
        public string PreliminaryResult { get; set; }
        public string FinalResult { get; set; }
        public DateTime? ReportDate { get; set; }
        public string TechnicianName { get; set; }
    }

    public class EnterCultureResultDto
    {
        public Guid CultureId { get; set; }
        public DateTime CultureDate { get; set; }
        public bool HasGrowth { get; set; }
        public List<CultureOrganismDto> Organisms { get; set; }
        public string PreliminaryConclusion { get; set; }
        public string FinalConclusion { get; set; }
    }

    public class CultureOrganismDto
    {
        public Guid? OrganismId { get; set; }
        public string OrganismCode { get; set; }
        public string OrganismName { get; set; }
        public string Quantity { get; set; } // Few, Moderate, Many
        public string ColonyDescription { get; set; }
    }

    public class EnterAntibioticSensitivityDto
    {
        public Guid CultureId { get; set; }
        public Guid OrganismId { get; set; }
        public List<AntibioticResultDto> Results { get; set; }
    }

    public class AntibioticResultDto
    {
        public Guid AntibioticId { get; set; }
        public string Sensitivity { get; set; } // S (Sensitive), I (Intermediate), R (Resistant)
        public decimal? MIC { get; set; }
        public decimal? ZoneDiameter { get; set; }
    }

    public class AntibioticDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Group { get; set; }
        public bool IsActive { get; set; }
    }

    public class BacteriaDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string ScientificName { get; set; }
        public string Type { get; set; } // Gram+, Gram-, Fungus
        public bool IsActive { get; set; }
    }

    public class MicrobiologyStatisticsDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalCultures { get; set; }
        public int PositiveCultures { get; set; }
        public decimal PositiveRate { get; set; }
        public List<OrganismFrequencyDto> TopOrganisms { get; set; }
        public List<AntibioticResistanceDto> ResistancePatterns { get; set; }
    }

    public class OrganismFrequencyDto
    {
        public string OrganismName { get; set; }
        public int Count { get; set; }
        public decimal Percentage { get; set; }
    }

    public class AntibioticResistanceDto
    {
        public string OrganismName { get; set; }
        public string AntibioticName { get; set; }
        public int TestedCount { get; set; }
        public int ResistantCount { get; set; }
        public decimal ResistanceRate { get; set; }
    }

    public class ParsedLabResultDto
    {
        public string SampleId { get; set; }
        public string PatientId { get; set; }
        public string TestCode { get; set; }
        public string Result { get; set; }
        public string Unit { get; set; }
        public string Flag { get; set; }
        public DateTime? ResultTime { get; set; }
        public string RawData { get; set; }
    }

    #endregion

}
