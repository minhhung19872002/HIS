using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Reporting
{
    /// <summary>
    /// DTOs for Level 6 Reconciliation Reports (Đối chiếu Level 6)
    /// 8 reports per NangCap Level 6 requirements
    /// </summary>

    #region Common

    /// <summary>
    /// Yêu cầu đối chiếu chung
    /// </summary>
    public class ReconciliationRequestDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? DepartmentId { get; set; }
        public Guid? SupplierId { get; set; }
    }

    #endregion

    #region Report 1: Theo dõi kết quả trúng thầu theo NCC

    /// <summary>
    /// BC1: Theo dõi kết quả trúng thầu theo NCC (Supplier Procurement)
    /// </summary>
    public class SupplierProcurementReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalSuppliers { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalContractValue { get; set; }
        public decimal TotalDeliveredValue { get; set; }
        public decimal FulfillmentRate { get; set; }
        public List<SupplierProcurementItemDto> Items { get; set; } = new();
    }

    public class SupplierProcurementItemDto
    {
        public Guid SupplierId { get; set; }
        public string SupplierCode { get; set; } = string.Empty;
        public string SupplierName { get; set; } = string.Empty;
        public int ItemCount { get; set; }
        public int ReceiptCount { get; set; }
        public decimal ContractValue { get; set; }
        public decimal DeliveredValue { get; set; }
        public decimal DeliveredQuantity { get; set; }
        public decimal FulfillmentRate { get; set; }
        public decimal AverageDeliveryDays { get; set; }
        public string? LastDeliveryDate { get; set; }
    }

    #endregion

    #region Report 2: Tính doanh thu chi phí theo HSBA

    /// <summary>
    /// BC2: Tính doanh thu chi phí theo HSBA (Revenue/Cost by Medical Record)
    /// </summary>
    public class RevenueByRecordReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalRecords { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalCost { get; set; }
        public decimal TotalProfit { get; set; }
        public decimal AverageProfitMargin { get; set; }
        public List<RevenueByRecordItemDto> Items { get; set; } = new();
    }

    public class RevenueByRecordItemDto
    {
        public Guid MedicalRecordId { get; set; }
        public string MedicalRecordCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string PatientCode { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public string? Diagnosis { get; set; }
        public decimal ServiceRevenue { get; set; }
        public decimal MedicineRevenue { get; set; }
        public decimal SupplyRevenue { get; set; }
        public decimal BedRevenue { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal MedicineCost { get; set; }
        public decimal SupplyCost { get; set; }
        public decimal TotalCost { get; set; }
        public decimal Profit { get; set; }
        public decimal ProfitMargin { get; set; }
    }

    #endregion

    #region Report 3: Đối chiếu chi phí khoa phòng vs viện phí

    /// <summary>
    /// BC3: Đối chiếu chi phí khoa phòng vs viện phí (Department Cost vs Fees)
    /// </summary>
    public class DeptCostVsFeesReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalDeptCost { get; set; }
        public decimal TotalHospitalFees { get; set; }
        public decimal TotalDifference { get; set; }
        public List<DeptCostVsFeesItemDto> Items { get; set; } = new();
    }

    public class DeptCostVsFeesItemDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentCode { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public decimal ServiceCost { get; set; }
        public decimal MedicineCost { get; set; }
        public decimal SupplyCost { get; set; }
        public decimal TotalDeptCost { get; set; }
        public decimal ServiceFees { get; set; }
        public decimal MedicineFees { get; set; }
        public decimal SupplyFees { get; set; }
        public decimal TotalHospitalFees { get; set; }
        public decimal Difference { get; set; }
        public decimal DifferencePercent { get; set; }
    }

    #endregion

    #region Report 4: Tổng hợp chi phí HSBA: sử dụng vs thu

    /// <summary>
    /// BC4: Tổng hợp chi phí HSBA: sử dụng vs thu (Record Cost Summary)
    /// </summary>
    public class RecordCostSummaryReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalRecords { get; set; }
        public decimal TotalUsed { get; set; }
        public decimal TotalCollected { get; set; }
        public decimal TotalDifference { get; set; }
        public int OverchargedCount { get; set; }
        public int UnderchargedCount { get; set; }
        public List<RecordCostSummaryItemDto> Items { get; set; } = new();
    }

    public class RecordCostSummaryItemDto
    {
        public Guid MedicalRecordId { get; set; }
        public string MedicalRecordCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public decimal ServiceUsed { get; set; }
        public decimal MedicineUsed { get; set; }
        public decimal SupplyUsed { get; set; }
        public decimal TotalUsed { get; set; }
        public decimal ServiceCollected { get; set; }
        public decimal MedicineCollected { get; set; }
        public decimal SupplyCollected { get; set; }
        public decimal TotalCollected { get; set; }
        public decimal Difference { get; set; }
        public string Status { get; set; } = string.Empty; // Match, Overcharged, Undercharged
    }

    #endregion

    #region Report 5: Đối chiếu viện phí vs định mức DVKT

    /// <summary>
    /// BC5: Đối chiếu viện phí vs định mức DVKT (Fees vs Service Standards)
    /// </summary>
    public class FeesVsStandardsReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalServices { get; set; }
        public int WithinStandardCount { get; set; }
        public int ExceedStandardCount { get; set; }
        public decimal TotalActualFees { get; set; }
        public decimal TotalStandardFees { get; set; }
        public List<FeesVsStandardsItemDto> Items { get; set; } = new();
    }

    public class FeesVsStandardsItemDto
    {
        public Guid ServiceId { get; set; }
        public string ServiceCode { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public string ServiceGroupName { get; set; } = string.Empty;
        public int UsageCount { get; set; }
        public decimal StandardPrice { get; set; }
        public decimal ActualAvgPrice { get; set; }
        public decimal TotalStandardAmount { get; set; }
        public decimal TotalActualAmount { get; set; }
        public decimal Difference { get; set; }
        public decimal DifferencePercent { get; set; }
        public string Status { get; set; } = string.Empty; // WithinStandard, ExceedStandard
    }

    #endregion

    #region Report 6: Đối chiếu DVKT giữa BS chỉ định và BS thực hiện

    /// <summary>
    /// BC6: Đối chiếu DVKT giữa BS chỉ định và BS thực hiện (Service Order Doctors)
    /// </summary>
    public class ServiceOrderDoctorsReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalOrders { get; set; }
        public int SameDoctorCount { get; set; }
        public int DifferentDoctorCount { get; set; }
        public int NoExecutorCount { get; set; }
        public List<ServiceOrderDoctorsItemDto> Items { get; set; } = new();
    }

    public class ServiceOrderDoctorsItemDto
    {
        public Guid ServiceRequestId { get; set; }
        public string RequestCode { get; set; } = string.Empty;
        public DateTime RequestDate { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public string OrderingDoctorName { get; set; } = string.Empty;
        public string? OrderingDepartmentName { get; set; }
        public string? ExecutingDoctorName { get; set; }
        public string? ExecutingDepartmentName { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty; // SameDoctor, DifferentDoctor, NoExecutor
    }

    #endregion

    #region Report 7: Đối chiếu xuất kho thuốc/VTYT vs viện phí theo khoa

    /// <summary>
    /// BC7: Đối chiếu xuất kho thuốc/VTYT vs viện phí theo khoa (Dispensing vs Billing)
    /// </summary>
    public class DispensingVsBillingReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalDispensed { get; set; }
        public decimal TotalBilled { get; set; }
        public decimal TotalDifference { get; set; }
        public List<DispensingVsBillingItemDto> Items { get; set; } = new();
    }

    public class DispensingVsBillingItemDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentCode { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public decimal MedicineDispensed { get; set; }
        public decimal SupplyDispensed { get; set; }
        public decimal TotalDispensed { get; set; }
        public decimal MedicineBilled { get; set; }
        public decimal SupplyBilled { get; set; }
        public decimal TotalBilled { get; set; }
        public decimal Difference { get; set; }
        public decimal DifferencePercent { get; set; }
    }

    #endregion

    #region Report 8: Đối chiếu xuất kho vs định mức theo khoa phòng

    /// <summary>
    /// BC8: Đối chiếu xuất kho vs định mức theo khoa phòng (Dispensing vs Standards)
    /// </summary>
    public class DispensingVsStandardsReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalDepartments { get; set; }
        public decimal TotalDispensed { get; set; }
        public decimal TotalStandard { get; set; }
        public List<DispensingVsStandardsItemDto> Items { get; set; } = new();
    }

    public class DispensingVsStandardsItemDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentCode { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public int PatientCount { get; set; }
        public decimal MedicineDispensed { get; set; }
        public decimal SupplyDispensed { get; set; }
        public decimal TotalDispensed { get; set; }
        public decimal StandardPerPatient { get; set; }
        public decimal TotalStandard { get; set; }
        public decimal Difference { get; set; }
        public decimal DifferencePercent { get; set; }
        public string Status { get; set; } = string.Empty; // WithinStandard, ExceedStandard
    }

    #endregion
}
