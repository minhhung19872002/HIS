using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.MedicalHR
{
    #region Employee Profile DTOs

    /// <summary>
    /// Hồ sơ nhân viên y tế
    /// </summary>
    public class MedicalStaffDto
    {
        public Guid Id { get; set; }
        public string EmployeeCode { get; set; }
        public string StaffCode { get; set; }
        public string FullName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }

        // Position
        public string StaffType { get; set; } // Doctor, Nurse, Technician, Pharmacist, Admin
        public string Position { get; set; }
        public string Title { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string Specialty { get; set; }
        public DateTime JoinDate { get; set; }
        public string EmploymentStatus { get; set; } // Active, OnLeave, Resigned, Retired
        public string Status { get; set; }

        // Practice License
        public string PracticeLicenseNumber { get; set; }
        public DateTime? LicenseIssueDate { get; set; }
        public DateTime? LicenseExpiryDate { get; set; }
        public string LicenseStatus { get; set; } // Valid, Expired, Suspended
        public bool IsLicenseExpiringSoon { get; set; }
        public int? DaysUntilLicenseExpiry { get; set; }
        public string LicenseScope { get; set; }
        public string IssuingAuthority { get; set; }

        // Qualifications
        public List<QualificationDto> Qualifications { get; set; }
        public List<CertificationDto> Certifications { get; set; }

        // Training
        public int CMECreditsThisYear { get; set; }
        public int CMECreditsRequired { get; set; }
        public bool CMECompliant { get; set; }

        // Contract
        public string ContractType { get; set; } // Permanent, Contract, PartTime
        public DateTime? ContractStartDate { get; set; }
        public DateTime? ContractEndDate { get; set; }

        // System
        public Guid? UserId { get; set; }
        public bool HasSystemAccess { get; set; }
        public string SignatureUrl { get; set; }
        public string PhotoUrl { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? LastUpdatedAt { get; set; }
    }

    public class QualificationDto
    {
        public Guid Id { get; set; }
        public string Degree { get; set; } // BS, ThS, TS, PGS, GS
        public string Major { get; set; }
        public string Institution { get; set; }
        public int GraduationYear { get; set; }
        public string Country { get; set; }
        public string CertificateNumber { get; set; }
        public string DocumentUrl { get; set; }
        public bool IsVerified { get; set; }
    }

    public class CertificationDto
    {
        public Guid Id { get; set; }
        public string CertificationName { get; set; }
        public string IssuingBody { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string CertificateNumber { get; set; }
        public string DocumentUrl { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật hồ sơ nhân viên
    /// </summary>
    public class SaveMedicalStaffDto
    {
        public Guid? Id { get; set; }
        public string EmployeeCode { get; set; }
        public string FullName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string StaffType { get; set; }
        public string Position { get; set; }
        public string Title { get; set; }
        public Guid DepartmentId { get; set; }
        public string Specialty { get; set; }
        public DateTime JoinDate { get; set; }
        public string PracticeLicenseNumber { get; set; }
        public DateTime? LicenseIssueDate { get; set; }
        public DateTime? LicenseExpiryDate { get; set; }
        public string LicenseScope { get; set; }
        public string IssuingAuthority { get; set; }
        public string ContractType { get; set; }
        public DateTime? ContractStartDate { get; set; }
        public DateTime? ContractEndDate { get; set; }
    }

    #endregion

    #region Duty Roster DTOs

    /// <summary>
    /// Lịch trực
    /// </summary>
    public class DutyRosterDto
    {
        public Guid Id { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }

        // Status
        public string Status { get; set; } // Draft, Published, Locked
        public DateTime? PublishedAt { get; set; }
        public string PublishedBy { get; set; }

        // Summary
        public int TotalShifts { get; set; }
        public int FilledShifts { get; set; }
        public int OpenShifts { get; set; }
        public List<DutyShiftDto> Shifts { get; set; }

        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Ca trực
    /// </summary>
    public class DutyShiftDto
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }
        public Guid RosterId { get; set; }
        public DateTime ShiftDate { get; set; }
        public string ShiftType { get; set; } // Morning, Afternoon, Night, 24h

        // Time
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int DurationHours { get; set; }

        // Staff
        public List<ShiftAssignmentDto> Assignments { get; set; }

        // Requirements
        public int RequiredDoctors { get; set; }
        public int RequiredNurses { get; set; }
        public int RequiredTechnicians { get; set; }
        public bool IsFulfilled { get; set; }

        public string Notes { get; set; }
    }

    public class ShiftAssignmentDto
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffType { get; set; }
        public string Role { get; set; } // Primary, Backup, Supervisor

        // Status
        public string Status { get; set; } // Assigned, Confirmed, Swapped, Absent
        public bool IsConfirmed { get; set; }
        public DateTime? ConfirmedAt { get; set; }

        // Swap
        public Guid? SwappedWithId { get; set; }
        public string SwappedWithName { get; set; }
        public string SwapReason { get; set; }
        public bool? SwapApproved { get; set; }
    }

    /// <summary>
    /// Tạo lịch trực
    /// </summary>
    public class CreateDutyRosterDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public Guid DepartmentId { get; set; }
        public List<CreateDutyShiftDto> Shifts { get; set; }
    }

    public class CreateDutyShiftDto
    {
        public DateTime ShiftDate { get; set; }
        public string ShiftType { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public List<Guid> AssignedStaffIds { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Yêu cầu đổi ca
    /// </summary>
    public class ShiftSwapRequestDto
    {
        public Guid Id { get; set; }
        public Guid OriginalAssignmentId { get; set; }
        public Guid RequesterId { get; set; }
        public string RequesterName { get; set; }
        public DateTime OriginalShiftDate { get; set; }
        public string OriginalShiftType { get; set; }

        public Guid? TargetAssignmentId { get; set; }
        public Guid? TargetStaffId { get; set; }
        public string TargetStaffName { get; set; }
        public DateTime? TargetShiftDate { get; set; }
        public string TargetShiftType { get; set; }

        public string Reason { get; set; }
        public string Status { get; set; } // Pending, TargetApproved, ManagerApproved, Rejected
        public bool? TargetApproval { get; set; }
        public bool? ManagerApproval { get; set; }
        public string ApprovalNotes { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
    }

    #endregion

    #region Room/Clinic Assignment DTOs

    /// <summary>
    /// Phân công phòng khám
    /// </summary>
    public class ClinicAssignmentDto
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public string Session { get; set; } // Morning, Afternoon

        // Location
        public Guid RoomId { get; set; }
        public string RoomCode { get; set; }
        public string RoomName { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }

        // Staff
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; }
        public string DoctorTitle { get; set; }
        public Guid? NurseId { get; set; }
        public string NurseName { get; set; }

        // Capacity
        public int MaxPatients { get; set; }
        public int BookedPatients { get; set; }
        public int AvailableSlots { get; set; }

        // Status
        public string Status { get; set; } // Scheduled, Active, Completed, Cancelled
        public bool IsPublished { get; set; }
    }

    /// <summary>
    /// Tạo phân công phòng khám
    /// </summary>
    public class CreateClinicAssignmentDto
    {
        public DateTime Date { get; set; }
        public string Session { get; set; }
        public Guid RoomId { get; set; }
        public Guid DoctorId { get; set; }
        public Guid? NurseId { get; set; }
        public int MaxPatients { get; set; }
    }

    #endregion

    #region CME (Continuing Medical Education) DTOs

    /// <summary>
    /// Khóa đào tạo liên tục
    /// </summary>
    public class CMECourseDto
    {
        public Guid Id { get; set; }
        public string CourseCode { get; set; }
        public string CourseName { get; set; }
        public string Description { get; set; }
        public string Category { get; set; } // Clinical, Administrative, Safety, Research
        public string Provider { get; set; }
        public int Credits { get; set; }
        public string CourseType { get; set; } // Online, InPerson, Blended
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int DurationHours { get; set; }
        public int MaxParticipants { get; set; }
        public int EnrolledCount { get; set; }
        public string Status { get; set; } // Upcoming, InProgress, Completed, Cancelled
        public bool IsAccredited { get; set; }
        public string AccreditationBody { get; set; }
        public string CertificateTemplate { get; set; }
    }

    /// <summary>
    /// Ghi nhận đào tạo của nhân viên
    /// </summary>
    public class CMERecordDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public Guid CourseId { get; set; }
        public string CourseName { get; set; }
        public DateTime CompletionDate { get; set; }
        public DateTime CompletedAt { get; set; }
        public int CreditsEarned { get; set; }
        public string Grade { get; set; }
        public string CertificateNumber { get; set; }
        public string CertificateUrl { get; set; }
        public DateTime ExpiryDate { get; set; }
        public bool IsVerified { get; set; }
    }

    /// <summary>
    /// Tổng hợp CME của nhân viên
    /// </summary>
    public class CMESummaryDto
    {
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffType { get; set; }
        public int RequiredCreditsPerYear { get; set; }
        public int RequiredCredits { get; set; }
        public int EarnedCredits { get; set; }

        // Current Year
        public int CurrentYearCredits { get; set; }
        public int CurrentYearRequired { get; set; }
        public bool IsCompliant { get; set; }
        public int CreditsShortfall { get; set; }

        // By Category
        public Dictionary<string, int> CreditsByCategory { get; set; }

        // History
        public List<CMERecordDto> RecentRecords { get; set; }

        // Upcoming
        public List<CMECourseDto> EnrolledCourses { get; set; }
    }

    #endregion

    #region Competency Assessment DTOs

    /// <summary>
    /// Đánh giá năng lực
    /// </summary>
    public class CompetencyAssessmentDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffType { get; set; }
        public string DepartmentName { get; set; }

        // Assessment Info
        public string AssessmentType { get; set; } // Annual, Probation, Promotion
        public string AssessmentPeriod { get; set; }
        public DateTime AssessmentDate { get; set; }

        // Scores
        public List<CompetencyScoreDto> Scores { get; set; }
        public decimal OverallScore { get; set; }
        public string OverallRating { get; set; } // Excellent, Good, Satisfactory, NeedsImprovement

        // Feedback
        public string Strengths { get; set; }
        public string AreasForImprovement { get; set; }
        public string DevelopmentPlan { get; set; }
        public string EmployeeComments { get; set; }

        // Sign-off
        public string AssessedBy { get; set; }
        public DateTime? EmployeeSignedAt { get; set; }
        public DateTime? ManagerSignedAt { get; set; }
        public string Status { get; set; } // Draft, EmployeeSigned, Completed
    }

    public class CompetencyScoreDto
    {
        public string CompetencyArea { get; set; }
        public string CompetencyName { get; set; }
        public int Score { get; set; } // 1-5
        public int Weight { get; set; }
        public string Evidence { get; set; }
        public string Comments { get; set; }
    }

    #endregion

    #region Dashboard DTOs

    /// <summary>
    /// Dashboard Quản lý Nhân sự Y tế
    /// </summary>
    public class MedicalHRDashboardDto
    {
        public DateTime Date { get; set; }

        // Staff Summary
        public int TotalStaff { get; set; }
        public int Doctors { get; set; }
        public int Nurses { get; set; }
        public int Technicians { get; set; }
        public int Pharmacists { get; set; }
        public int OtherStaff { get; set; }
        public int ActiveDoctors { get; set; }
        public int ActiveNurses { get; set; }
        public int ExpiringLicenses30Days { get; set; }
        public int CMENonCompliant { get; set; }

        // By Status
        public int ActiveStaff { get; set; }
        public int OnLeave { get; set; }
        public int NewHiresThisMonth { get; set; }
        public int ResignationsThisMonth { get; set; }

        // License Status
        public int ValidLicenses { get; set; }
        public int ExpiringSoon { get; set; }
        public int Expired { get; set; }

        // CME Compliance
        public int CMECompliant { get; set; }
        public int CMENotCompliant { get; set; }
        public decimal CMEComplianceRate { get; set; }

        // Today's Schedule
        public int OnDutyToday { get; set; }
        public int ClinicSessionsToday { get; set; }
        public int OpenShiftsThisWeek { get; set; }

        // By Department
        public List<DepartmentStaffStatDto> ByDepartment { get; set; }

        // Alerts
        public List<HRAlertDto> Alerts { get; set; }
    }

    public class DepartmentStaffStatDto
    {
        public string DepartmentName { get; set; }
        public int TotalStaff { get; set; }
        public int Doctors { get; set; }
        public int Nurses { get; set; }
        public int OnDutyToday { get; set; }
    }

    public class HRAlertDto
    {
        public string AlertType { get; set; } // LicenseExpiring, CMEDue, ContractEnding, ShiftGap
        public string Severity { get; set; }
        public Guid? StaffId { get; set; }
        public string StaffName { get; set; }
        public string Message { get; set; }
        public DateTime DueDate { get; set; }
        public string ActionRequired { get; set; }
    }

    #endregion
}
