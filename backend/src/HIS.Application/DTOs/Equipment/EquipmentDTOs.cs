using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Equipment
{
    #region Equipment Master DTOs

    /// <summary>
    /// Thông tin Trang thiết bị Y tế
    /// </summary>
    public class MedicalEquipmentDto
    {
        public Guid Id { get; set; }
        public string EquipmentCode { get; set; }
        public string SerialNumber { get; set; }
        public string Name { get; set; }
        public string Model { get; set; }
        public string Manufacturer { get; set; }
        public string CountryOfOrigin { get; set; }

        // Classification
        public string Category { get; set; } // Diagnostic, Therapeutic, Monitoring, Support
        public string RiskClass { get; set; } // A, B, C, D (theo NĐ 36)
        public string EquipmentType { get; set; }
        public bool RequiresCalibration { get; set; }
        public int? CalibrationFrequencyMonths { get; set; }

        // Location
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string RoomNumber { get; set; }
        public string Location { get; set; }

        // Procurement
        public string PurchaseOrderNumber { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public decimal? PurchasePrice { get; set; }
        public string Supplier { get; set; }
        public string SupplierContact { get; set; }

        // Warranty
        public DateTime? WarrantyStartDate { get; set; }
        public DateTime? WarrantyEndDate { get; set; }
        public bool IsUnderWarranty { get; set; }
        public string WarrantyDetails { get; set; }

        // Lifecycle
        public DateTime? CommissionDate { get; set; }
        public DateTime? RegisteredAt { get; set; }
        public int? ExpectedLifeYears { get; set; }
        public DateTime? ExpectedEndOfLife { get; set; }
        public string Status { get; set; } // Active, Inactive, UnderRepair, Decommissioned
        public string Condition { get; set; } // Excellent, Good, Fair, Poor

        // Depreciation
        public string DepreciationMethod { get; set; }
        public decimal? CurrentValue { get; set; }
        public decimal? AccumulatedDepreciation { get; set; }

        // Documentation
        public string ManualUrl { get; set; }
        public List<string> AttachedDocuments { get; set; }
        public string Notes { get; set; }

        // Audit
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? LastUpdatedAt { get; set; }
    }

    /// <summary>
    /// Đăng ký thiết bị mới
    /// </summary>
    public class RegisterEquipmentDto
    {
        public string EquipmentCode { get; set; }
        public string SerialNumber { get; set; }
        public string Name { get; set; }
        public string EquipmentName { get; set; }
        public string Model { get; set; }
        public string Manufacturer { get; set; }
        public string CountryOfOrigin { get; set; }
        public string Category { get; set; }
        public string RiskClass { get; set; }
        public string EquipmentType { get; set; }
        public bool RequiresCalibration { get; set; }
        public int? CalibrationFrequencyMonths { get; set; }
        public Guid? DepartmentId { get; set; }
        public string RoomNumber { get; set; }
        public string PurchaseOrderNumber { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public decimal? PurchasePrice { get; set; }
        public string Supplier { get; set; }
        public DateTime? WarrantyEndDate { get; set; }
        public int? ExpectedLifeYears { get; set; }
        public string Notes { get; set; }
    }

    #endregion

    #region Maintenance DTOs

    /// <summary>
    /// Lịch bảo trì
    /// </summary>
    public class MaintenanceScheduleDto
    {
        public Guid Id { get; set; }
        public Guid EquipmentId { get; set; }
        public string EquipmentCode { get; set; }
        public string EquipmentName { get; set; }
        public string DepartmentName { get; set; }

        // Schedule
        public string MaintenanceType { get; set; } // Preventive, Calibration, Safety
        public string Frequency { get; set; } // Monthly, Quarterly, Biannually, Annually
        public DateTime NextDueDate { get; set; }
        public int ReminderDaysBefore { get; set; }
        public bool IsOverdue { get; set; }
        public int? DaysOverdue { get; set; }

        // Assignment
        public string AssignedTo { get; set; } // Internal, ExternalVendor
        public string VendorName { get; set; }
        public string ContactPerson { get; set; }

        // Checklist
        public List<string> MaintenanceTasks { get; set; }

        public string Status { get; set; } // Scheduled, InProgress, Completed, Skipped
        public DateTime? LastCompletedDate { get; set; }
    }

    /// <summary>
    /// Ghi nhận bảo trì
    /// </summary>
    public class MaintenanceRecordDto
    {
        public Guid Id { get; set; }
        public string RecordCode { get; set; }
        public Guid EquipmentId { get; set; }
        public string EquipmentCode { get; set; }
        public string EquipmentName { get; set; }
        public Guid? ScheduleId { get; set; }

        // Maintenance Info
        public string MaintenanceType { get; set; } // Preventive, Corrective, Calibration
        public DateTime MaintenanceDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public DateTime? PerformedAt { get; set; }
        public int? DowntimeHours { get; set; }

        // Work Done
        public string Description { get; set; }
        public List<MaintenanceTaskRecordDto> TasksPerformed { get; set; }
        public string PartsReplaced { get; set; }
        public decimal? PartsCost { get; set; }
        public decimal? LaborCost { get; set; }
        public decimal? TotalCost { get; set; }

        // Performed By
        public string PerformedBy { get; set; }
        public string TechnicianName { get; set; }
        public string VendorName { get; set; }

        // Result
        public string Result { get; set; } // Completed, PartiallyCompleted, Failed
        public string EquipmentConditionAfter { get; set; }
        public bool RequiresFollowUp { get; set; }
        public string FollowUpNotes { get; set; }

        // Documentation
        public List<string> AttachedPhotos { get; set; }
        public string ServiceReport { get; set; }
    }

    public class MaintenanceTaskRecordDto
    {
        public string TaskName { get; set; }
        public bool IsCompleted { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Tạo ghi nhận bảo trì
    /// </summary>
    public class CreateMaintenanceRecordDto
    {
        public Guid EquipmentId { get; set; }
        public Guid? ScheduleId { get; set; }
        public string MaintenanceType { get; set; }
        public DateTime MaintenanceDate { get; set; }
        public string Description { get; set; }
        public List<MaintenanceTaskRecordDto> TasksPerformed { get; set; }
        public string PartsReplaced { get; set; }
        public decimal? PartsCost { get; set; }
        public decimal? LaborCost { get; set; }
        public string PerformedBy { get; set; }
        public string TechnicianName { get; set; }
        public string Result { get; set; }
        public string EquipmentConditionAfter { get; set; }
        public bool RequiresFollowUp { get; set; }
        public string FollowUpNotes { get; set; }
    }

    #endregion

    #region Calibration DTOs

    /// <summary>
    /// Kiểm định thiết bị
    /// </summary>
    public class CalibrationRecordDto
    {
        public Guid Id { get; set; }
        public string CertificateNumber { get; set; }
        public Guid EquipmentId { get; set; }
        public string EquipmentCode { get; set; }
        public string EquipmentName { get; set; }
        public string SerialNumber { get; set; }

        // Calibration Info
        public DateTime CalibrationDate { get; set; }
        public DateTime NextCalibrationDate { get; set; }
        public string CalibrationType { get; set; } // Initial, Periodic, After Repair
        public string CalibrationStandard { get; set; }

        // Calibration Body
        public string CalibratedBy { get; set; } // Internal, External
        public string CalibrationLab { get; set; }
        public string LabAccreditation { get; set; }
        public string TechnicianName { get; set; }

        // Results
        public string Result { get; set; } // Pass, Fail, Conditional
        public List<CalibrationMeasurementDto> Measurements { get; set; }
        public decimal? Uncertainty { get; set; }
        public string DeviationNotes { get; set; }

        // Cost
        public decimal? CalibrationCost { get; set; }

        // Documentation
        public string CertificateUrl { get; set; }
        public List<string> AttachedDocuments { get; set; }

        public string Status { get; set; } // Valid, Expired, Suspended
    }

    public class CalibrationMeasurementDto
    {
        public string Parameter { get; set; }
        public string Unit { get; set; }
        public decimal ReferenceValue { get; set; }
        public decimal MeasuredValue { get; set; }
        public decimal Tolerance { get; set; }
        public decimal Deviation { get; set; }
        public bool IsWithinTolerance { get; set; }
    }

    /// <summary>
    /// Ghi nhận kiểm định
    /// </summary>
    public class RecordCalibrationDto
    {
        public Guid EquipmentId { get; set; }
        public DateTime CalibrationDate { get; set; }
        public DateTime NextCalibrationDate { get; set; }
        public string CalibrationType { get; set; }
        public string CalibrationStandard { get; set; }
        public string CalibratedBy { get; set; }
        public string CalibrationLab { get; set; }
        public string TechnicianName { get; set; }
        public string Result { get; set; }
        public List<CalibrationMeasurementDto> Measurements { get; set; }
        public string CertificateNumber { get; set; }
        public decimal? CalibrationCost { get; set; }
    }

    #endregion

    #region Repair DTOs

    /// <summary>
    /// Yêu cầu sửa chữa
    /// </summary>
    public class RepairRequestDto
    {
        public Guid Id { get; set; }
        public string RequestCode { get; set; }
        public Guid EquipmentId { get; set; }
        public string EquipmentCode { get; set; }
        public string EquipmentName { get; set; }
        public string DepartmentName { get; set; }

        // Problem
        public string ProblemDescription { get; set; }
        public string ProblemCategory { get; set; }
        public string Severity { get; set; } // Critical, High, Medium, Low
        public DateTime ReportedDate { get; set; }
        public DateTime RequestedAt { get; set; }
        public string ReportedBy { get; set; }
        public string ReporterContact { get; set; }

        // Status
        public string Status { get; set; } // Reported, Acknowledged, InProgress, Completed, Cancelled
        public DateTime? AcknowledgedDate { get; set; }
        public string AssignedTo { get; set; }
        public DateTime? ExpectedCompletionDate { get; set; }
        public DateTime? ActualCompletionDate { get; set; }

        // Resolution
        public string RootCause { get; set; }
        public string ActionTaken { get; set; }
        public string PartsUsed { get; set; }
        public decimal? RepairCost { get; set; }
        public int? DowntimeHours { get; set; }

        // Vendor
        public bool RequiresVendor { get; set; }
        public string VendorName { get; set; }
        public string VendorReferenceNumber { get; set; }

        public List<string> AttachedPhotos { get; set; }
    }

    /// <summary>
    /// Tạo yêu cầu sửa chữa
    /// </summary>
    public class CreateRepairRequestDto
    {
        public Guid EquipmentId { get; set; }
        public string ProblemDescription { get; set; }
        public string ProblemCategory { get; set; }
        public string Severity { get; set; }
        public string ReporterContact { get; set; }
        public List<string> AttachedPhotos { get; set; }
    }

    #endregion

    #region Disposal DTOs

    /// <summary>
    /// Thanh lý thiết bị
    /// </summary>
    public class EquipmentDisposalDto
    {
        public Guid Id { get; set; }
        public string DisposalCode { get; set; }
        public Guid EquipmentId { get; set; }
        public string EquipmentCode { get; set; }
        public string EquipmentName { get; set; }
        public string SerialNumber { get; set; }

        // Reason
        public string DisposalReason { get; set; } // EndOfLife, Obsolete, Irrepairable, Safety
        public string DisposalMethod { get; set; } // Sell, Donate, Recycle, Destroy

        // Values
        public decimal OriginalValue { get; set; }
        public decimal BookValue { get; set; }
        public decimal? SaleValue { get; set; }
        public decimal? DisposalCost { get; set; }

        // Approval
        public string ApprovalStatus { get; set; } // Pending, Approved, Rejected
        public string ApprovedBy { get; set; }
        public DateTime? ApprovalDate { get; set; }
        public string ApprovalNotes { get; set; }

        // Execution
        public DateTime? DisposalDate { get; set; }
        public string DisposedBy { get; set; }
        public string RecipientName { get; set; } // For sale/donation
        public string DisposalCertificate { get; set; }

        // Documentation
        public List<string> SupportingDocuments { get; set; }

        public string Status { get; set; } // Draft, PendingApproval, Approved, Completed
        public DateTime RequestedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; }
    }

    /// <summary>
    /// Tạo yêu cầu thanh lý
    /// </summary>
    public class CreateDisposalRequestDto
    {
        public Guid EquipmentId { get; set; }
        public string DisposalReason { get; set; }
        public string DisposalMethod { get; set; }
        public decimal? EstimatedSaleValue { get; set; }
        public string Justification { get; set; }
        public List<string> SupportingDocuments { get; set; }
    }

    #endregion

    #region Dashboard & Reports DTOs

    /// <summary>
    /// Dashboard Quản lý TTBYT
    /// </summary>
    public class EquipmentDashboardDto
    {
        public DateTime Date { get; set; }

        // Inventory Summary
        public int TotalEquipment { get; set; }
        public int ActiveEquipment { get; set; }
        public int InactiveEquipment { get; set; }
        public int UnderRepair { get; set; }
        public int InMaintenance { get; set; }
        public int OutOfService { get; set; }
        public int Decommissioned { get; set; }
        public decimal TotalAssetValue { get; set; }

        // By Risk Class
        public int ClassACount { get; set; }
        public int ClassBCount { get; set; }
        public int ClassCCount { get; set; }
        public int ClassDCount { get; set; }

        // Maintenance
        public int MaintenanceDueThisMonth { get; set; }
        public int MaintenanceOverdue { get; set; }
        public int MaintenanceCompletedThisMonth { get; set; }

        // Calibration
        public int CalibrationDueThisMonth { get; set; }
        public int CalibrationOverdue { get; set; }
        public int CalibrationExpiringSoon { get; set; }

        // Repairs
        public int OpenRepairRequests { get; set; }
        public int CriticalRepairs { get; set; }
        public decimal RepairCostThisMonth { get; set; }

        // Warranty
        public int UnderWarranty { get; set; }
        public int WarrantyExpiringThisMonth { get; set; }

        // By Department
        public List<DepartmentEquipmentStatDto> ByDepartment { get; set; }

        // Alerts
        public List<EquipmentAlertDto> Alerts { get; set; }
    }

    public class DepartmentEquipmentStatDto
    {
        public string DepartmentName { get; set; }
        public int TotalEquipment { get; set; }
        public int Active { get; set; }
        public int UnderRepair { get; set; }
        public decimal AssetValue { get; set; }
    }

    public class EquipmentAlertDto
    {
        public string AlertType { get; set; } // MaintenanceDue, CalibrationDue, RepairNeeded, WarrantyExpiring
        public string Severity { get; set; }
        public Guid EquipmentId { get; set; }
        public string EquipmentName { get; set; }
        public string Message { get; set; }
        public DateTime DueDate { get; set; }
    }

    /// <summary>
    /// Báo cáo tổng hợp TTBYT
    /// </summary>
    public class EquipmentReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }

        // Acquisition
        public int NewEquipmentCount { get; set; }
        public decimal NewEquipmentValue { get; set; }

        // Maintenance
        public int MaintenanceEventsTotal { get; set; }
        public int PreventiveMaintenance { get; set; }
        public int CorrectiveMaintenance { get; set; }
        public decimal MaintenanceCost { get; set; }
        public int TotalDowntimeHours { get; set; }

        // Repairs
        public int RepairRequests { get; set; }
        public int RepairsCompleted { get; set; }
        public decimal RepairCost { get; set; }
        public decimal AverageRepairTime { get; set; }

        // Calibration
        public int CalibrationsDone { get; set; }
        public int CalibrationsPassed { get; set; }
        public int CalibrationsFailed { get; set; }
        public decimal CalibrationCost { get; set; }

        // Disposal
        public int DisposedCount { get; set; }
        public decimal DisposedValue { get; set; }

        // Details
        public List<EquipmentMaintenanceHistoryDto> MaintenanceHistory { get; set; }
    }

    public class EquipmentMaintenanceHistoryDto
    {
        public Guid EquipmentId { get; set; }
        public string EquipmentCode { get; set; }
        public string EquipmentName { get; set; }
        public string EventType { get; set; }
        public DateTime EventDate { get; set; }
        public string Description { get; set; }
        public decimal Cost { get; set; }
    }

    #endregion
}
