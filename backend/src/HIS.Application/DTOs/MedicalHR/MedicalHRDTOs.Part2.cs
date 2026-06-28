using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.MedicalHR
{

    public class HRCatalogDto
    {
        public Guid Id { get; set; }
        public string CatalogType { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveHRCatalogDto
    {
        public Guid? Id { get; set; }
        public string CatalogType { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }



    public class StaffContractDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffCode { get; set; }
        public string ContractType { get; set; }
        public string ContractNumber { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Terms { get; set; }
        public int Status { get; set; } // 0=Active, 1=Expired, 2=Terminated, 3=Renewed
        public string StatusName { get; set; }
        public string Notes { get; set; }
        public int? DaysUntilExpiry { get; set; }
    }

    public class SaveStaffContractDto
    {
        public Guid? Id { get; set; }
        public Guid StaffId { get; set; }
        public string ContractType { get; set; }
        public string ContractNumber { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Terms { get; set; }
        public string? Notes { get; set; }
    }



    public class SalaryRecordDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string SalaryGrade { get; set; }
        public string SalaryCoefficient { get; set; }
        public decimal BaseSalary { get; set; }
        public decimal Allowance { get; set; }
        public decimal TotalSalary { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string DecisionNumber { get; set; }
        public string Notes { get; set; }
    }

    public class SaveSalaryRecordDto
    {
        public Guid? Id { get; set; }
        public Guid StaffId { get; set; }
        public string SalaryGrade { get; set; }
        public string SalaryCoefficient { get; set; }
        public decimal BaseSalary { get; set; }
        public decimal Allowance { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string? DecisionNumber { get; set; }
        public string? Notes { get; set; }
    }



    public class LeaveRequestDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffCode { get; set; }
        public string DepartmentName { get; set; }
        public string LeaveType { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal TotalDays { get; set; }
        public string Reason { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; }
        public string ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string ApproverNote { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateLeaveRequestDto
    {
        public Guid StaffId { get; set; }
        public string LeaveType { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal TotalDays { get; set; }
        public string? Reason { get; set; }
    }

    public class LeaveApprovalDto
    {
        public bool Approved { get; set; }
        public string? Note { get; set; }
    }

    public class LeaveBalanceDto
    {
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public int Year { get; set; }
        public decimal AnnualEntitlement { get; set; }
        public decimal UsedDays { get; set; }
        public decimal RemainingDays { get; set; }
        public decimal SickDaysUsed { get; set; }
        public decimal PendingRequests { get; set; }
    }



    public class AttendanceRecordDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffCode { get; set; }
        public string DepartmentName { get; set; }
        public DateTime WorkDate { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string ShiftType { get; set; }
        public decimal WorkHours { get; set; }
        public decimal OvertimeHours { get; set; }
        public string Status { get; set; }
        public string Notes { get; set; }
    }

    public class SaveAttendanceDto
    {
        public Guid? Id { get; set; }
        public Guid StaffId { get; set; }
        public DateTime WorkDate { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string ShiftType { get; set; }
        public decimal WorkHours { get; set; }
        public decimal OvertimeHours { get; set; }
        public string Status { get; set; }
        public string? Notes { get; set; }
    }

    public class AttendanceSummaryDto
    {
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffCode { get; set; }
        public string DepartmentName { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public int WorkDays { get; set; }
        public int PresentDays { get; set; }
        public int AbsentDays { get; set; }
        public int LeaveDays { get; set; }
        public int HolidayDays { get; set; }
        public decimal TotalWorkHours { get; set; }
        public decimal TotalOvertimeHours { get; set; }
        public int LateDays { get; set; }
        public int EarlyLeaveDays { get; set; }
    }



    public class OvertimeRecordDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffCode { get; set; }
        public string DepartmentName { get; set; }
        public DateTime OvertimeDate { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public decimal Hours { get; set; }
        public string Reason { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; }
        public string ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string ApproverNote { get; set; }
    }

    public class CreateOvertimeDto
    {
        public Guid StaffId { get; set; }
        public DateTime OvertimeDate { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public decimal Hours { get; set; }
        public string? Reason { get; set; }
    }

    public class OvertimeApprovalDto
    {
        public bool Approved { get; set; }
        public string? Note { get; set; }
    }



    public class StaffAwardDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffCode { get; set; }
        public string AwardType { get; set; }
        public string Title { get; set; }
        public DateTime AwardDate { get; set; }
        public string DecisionNumber { get; set; }
        public string Description { get; set; }
        public string IssuedBy { get; set; }
    }

    public class SaveStaffAwardDto
    {
        public Guid? Id { get; set; }
        public Guid StaffId { get; set; }
        public string AwardType { get; set; }
        public string Title { get; set; }
        public DateTime AwardDate { get; set; }
        public string? DecisionNumber { get; set; }
        public string? Description { get; set; }
        public string? IssuedBy { get; set; }
    }

    public class StaffDisciplineDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffCode { get; set; }
        public string DisciplineType { get; set; }
        public string Title { get; set; }
        public DateTime DisciplineDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string DecisionNumber { get; set; }
        public string Description { get; set; }
        public bool IsExpired { get; set; }
    }

    public class SaveStaffDisciplineDto
    {
        public Guid? Id { get; set; }
        public Guid StaffId { get; set; }
        public string DisciplineType { get; set; }
        public string Title { get; set; }
        public DateTime DisciplineDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? DecisionNumber { get; set; }
        public string? Description { get; set; }
    }



    public class HRReportFilterDto
    {
        public Guid? DepartmentId { get; set; }
        public string? StaffType { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int? Year { get; set; }
        public int? Month { get; set; }
    }

    public class StaffByDepartmentReportDto
    {
        public string DepartmentName { get; set; }
        public int TotalStaff { get; set; }
        public int Doctors { get; set; }
        public int Nurses { get; set; }
        public int Technicians { get; set; }
        public int Others { get; set; }
        public List<MedicalStaffDto> Staff { get; set; }
    }

    public class StaffMovementReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int NewHires { get; set; }
        public int Resignations { get; set; }
        public int Transfers { get; set; }
        public int Promotions { get; set; }
        public int ContractsExpired { get; set; }
        public int ContractsRenewed { get; set; }
        public List<StaffMovementItemDto> Items { get; set; }
    }

    public class StaffMovementItemDto
    {
        public string StaffName { get; set; }
        public string StaffCode { get; set; }
        public string DepartmentName { get; set; }
        public string MovementType { get; set; } // NewHire, Resignation, Transfer, Promotion
        public DateTime MovementDate { get; set; }
        public string Details { get; set; }
    }

    public class AttendanceReportDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string DepartmentName { get; set; }
        public int TotalStaff { get; set; }
        public decimal AvgWorkDays { get; set; }
        public decimal AvgOvertimeHours { get; set; }
        public int TotalAbsentDays { get; set; }
        public List<AttendanceSummaryDto> Details { get; set; }
    }

    public class LeaveReportDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string DepartmentName { get; set; }
        public int TotalRequests { get; set; }
        public int ApprovedRequests { get; set; }
        public int RejectedRequests { get; set; }
        public int PendingRequests { get; set; }
        public decimal TotalLeaveDays { get; set; }
        public List<LeaveRequestDto> Details { get; set; }
    }

    public class OvertimeReportDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string DepartmentName { get; set; }
        public int TotalRequests { get; set; }
        public decimal TotalHours { get; set; }
        public decimal ApprovedHours { get; set; }
        public List<OvertimeRecordDto> Details { get; set; }
    }



    public class CopyRosterWeekDto
    {
        /// <summary>Khoa/Phòng cần sao chép lịch trực</summary>
        public Guid DepartmentId { get; set; }
        /// <summary>Ngày bắt đầu tuần nguồn (ISO date, Monday preferred)</summary>
        public DateTime SourceWeekStart { get; set; }
        /// <summary>Ngày bắt đầu tuần đích</summary>
        public DateTime TargetWeekStart { get; set; }
        /// <summary>Ghi đè nếu đã có lịch trực ở tuần đích? (false = bỏ qua trùng)</summary>
        public bool OverwriteExisting { get; set; } = false;
    }

    public class CopyRosterResultDto
    {
        public int TotalShifts { get; set; }
        public int CopiedShifts { get; set; }
        public int SkippedShifts { get; set; }
        public string Message { get; set; } = string.Empty;
    }

}
