using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.System
{

    public class PsychotropicDrugRegisterDto
    {
        public DateTime Date { get; set; }
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string BatchNumber { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal ReceivedQuantity { get; set; }
        public decimal IssuedQuantity { get; set; }
        public decimal ClosingStock { get; set; }
    }

    public class PrecursorDrugRegisterDto
    {
        public DateTime Date { get; set; }
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string BatchNumber { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal ReceivedQuantity { get; set; }
        public decimal IssuedQuantity { get; set; }
        public decimal ClosingStock { get; set; }
    }

    public class DrugStockMovementReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal ReceivedQuantity { get; set; }
        public decimal IssuedQuantity { get; set; }
        public decimal AdjustmentQuantity { get; set; }
        public decimal ClosingStock { get; set; }
    }

    public class ExpiringDrugReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string BatchNumber { get; set; }
        public DateTime ExpiryDate { get; set; }
        public int DaysUntilExpiry { get; set; }
        public decimal Quantity { get; set; }
        public decimal Value { get; set; }
    }

    public class ExpiredDrugReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string BatchNumber { get; set; }
        public DateTime ExpiryDate { get; set; }
        public int DaysExpired { get; set; }
        public decimal Quantity { get; set; }
        public decimal Value { get; set; }
    }

    public class LowStockDrugReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public decimal CurrentStock { get; set; }
        public decimal MinStock { get; set; }
        public decimal Shortfall { get; set; }
    }

    public class DrugCostByDeptReportDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentCode { get; set; }
        public string DepartmentName { get; set; }
        public decimal TotalCost { get; set; }
        public decimal AntibioticCost { get; set; }
        public int PrescriptionCount { get; set; }
    }

    public class DrugCostByPatientReportDto
    {
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public decimal TotalCost { get; set; }
        public decimal InsuranceCost { get; set; }
        public decimal PatientCost { get; set; }
    }

    public class DrugByPaymentTypeReportDto
    {
        public string PaymentType { get; set; }
        public decimal TotalQuantity { get; set; }
        public decimal TotalValue { get; set; }
        public int PrescriptionCount { get; set; }
    }

    public class OutpatientPrescriptionStatDto
    {
        public Guid? DoctorId { get; set; }
        public string DoctorName { get; set; }
        public int PrescriptionCount { get; set; }
        public int PatientCount { get; set; }
        public decimal TotalValue { get; set; }
    }

    public class InpatientPrescriptionStatDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int PatientCount { get; set; }
        public int PrescriptionCount { get; set; }
        public decimal TotalValue { get; set; }
    }

    public class ABCVENReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<ABCVENItemDto> Items { get; set; }
    }

    public class ABCVENItemDto
    {
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string ABCClass { get; set; }
        public string VENClass { get; set; }
        public decimal TotalValue { get; set; }
        public decimal Percentage { get; set; }
    }

    public class DDDReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public decimal DDDValue { get; set; }
        public decimal TotalDDD { get; set; }
    }

    public class DepartmentStatisticsDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int OutpatientCount { get; set; }
        public int InpatientCount { get; set; }
        public int AdmissionCount { get; set; }
        public int DischargeCount { get; set; }
        public decimal Revenue { get; set; }
    }

    public class ExaminationStatisticsDto
    {
        public DateTime Date { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalExaminations { get; set; }
        public int NewPatients { get; set; }
        public int FollowUpPatients { get; set; }
    }

    public class AdmissionStatisticsDto
    {
        public DateTime Date { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalAdmissions { get; set; }
        public int EmergencyAdmissions { get; set; }
        public int ElectiveAdmissions { get; set; }
    }

    public class DischargeStatisticsDto
    {
        public DateTime Date { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalDischarges { get; set; }
        public int RecoveredCount { get; set; }
        public int ImprovedCount { get; set; }
        public int DeathCount { get; set; }
    }

    public class MortalityStatisticsDto
    {
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalDeaths { get; set; }
        public int DeathWithin24Hours { get; set; }
        public int DeathAfter24Hours { get; set; }
        public double MortalityRate { get; set; }
    }

    public class DiseaseStatisticsDto
    {
        public string IcdCode { get; set; }
        public string IcdName { get; set; }
        public int TotalCases { get; set; }
        public int OutpatientCases { get; set; }
        public int InpatientCases { get; set; }
    }

    public class DepartmentActivityReportDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int OutpatientVisits { get; set; }
        public int InpatientAdmissions { get; set; }
        public int Surgeries { get; set; }
        public int LabTests { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    public class BedOccupancyReportDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalBeds { get; set; }
        public int OccupiedBeds { get; set; }
        public int AvailableBeds { get; set; }
        public double OccupancyRate { get; set; }
    }

    public class BYTReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string HospitalName { get; set; }
        public string HospitalCode { get; set; }
        public int TotalOutpatients { get; set; }
        public int TotalInpatients { get; set; }
        public int TotalBeds { get; set; }
    }

    public class HospitalKPIDto
    {
        public string KPIName { get; set; }
        public string KPICategory { get; set; }
        public decimal TargetValue { get; set; }
        public decimal ActualValue { get; set; }
        public double Achievement { get; set; }
        public string Unit { get; set; }
    }

    public class UserSessionDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; }
        public string IpAddress { get; set; }
        public string UserAgent { get; set; }
        public DateTime LoginTime { get; set; }
        public DateTime? LastActivityTime { get; set; }
        public bool IsActive { get; set; }
    }

    public class BackupHistoryDto
    {
        public Guid Id { get; set; }
        public string BackupName { get; set; }
        public string BackupType { get; set; }
        public string FilePath { get; set; }
        public long FileSize { get; set; }
        public DateTime BackupDate { get; set; }
        public string BackupBy { get; set; }
        public string Status { get; set; }
    }

    public class SystemHealthDto
    {
        public string Status { get; set; }
        public double CpuUsage { get; set; }
        public double MemoryUsage { get; set; }
        public double DiskUsage { get; set; }
        public string DatabaseStatus { get; set; }
        public DateTime LastCheckTime { get; set; }
    }

    public class SystemResourceDto
    {
        public string ResourceName { get; set; }
        public string ResourceType { get; set; }
        public double CurrentValue { get; set; }
        public double MaxValue { get; set; }
        public double UtilizationPercentage { get; set; }
    }

    public class DatabaseStatisticsDto
    {
        public string TableName { get; set; }
        public long RowCount { get; set; }
        public long DataSize { get; set; }
        public long IndexSize { get; set; }
    }

    public class IntegrationConfigDto
    {
        public Guid Id { get; set; }
        public string IntegrationName { get; set; }
        public string IntegrationType { get; set; }
        public string Endpoint { get; set; }
        public string AuthType { get; set; }
        public bool IsActive { get; set; }
    }

    public class IntegrationLogDto
    {
        public Guid Id { get; set; }
        public Guid IntegrationId { get; set; }
        public string IntegrationName { get; set; }
        public DateTime RequestTime { get; set; }
        public DateTime? ResponseTime { get; set; }
        public string Status { get; set; }
        public string ErrorMessage { get; set; }
    }



    /// <summary>
    /// Nghề nghiệp (Occupation)
    /// </summary>
    public class OccupationCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// Giới tính (Gender)
    /// </summary>
    public class GenderCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// Đơn vị hành chính (Administrative Division) - 3 cấp: Tỉnh/Huyện/Xã
    /// </summary>
    public class AdministrativeDivisionCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Level { get; set; } // 1=Tinh, 2=Huyen, 3=Xa
        public string? ParentCode { get; set; }
        public string? ParentName { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// Quốc gia (Country)
    /// </summary>
    public class CountryCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? NationalityName { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// Cơ sở khám chữa bệnh (Healthcare Facility / CSKCB)
    /// </summary>
    public class HealthcareFacilityCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Level { get; set; } // TW, Tinh, Huyen, Xa
        public string? ProvinceCode { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }



    /// <summary>
    /// Thông tin dịch vụ bị khóa
    /// </summary>
    public class LockedServiceDto
    {
        public Guid Id { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string ServiceCode { get; set; } = string.Empty;
        public int ServiceType { get; set; } // 1=Thuốc, 2=Vật tư, 3=DVKT
        public string ServiceTypeName { get; set; } = string.Empty;
        public bool IsLocked { get; set; }
        public string? LockReason { get; set; }
        public string? LockedBy { get; set; }
        public string? LockedByName { get; set; }
        public DateTime? LockedAt { get; set; }
        public DateTime? UnlockedAt { get; set; }
    }

    /// <summary>
    /// Yêu cầu khóa dịch vụ
    /// </summary>
    public class LockServiceRequestDto
    {
        public Guid ServiceId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    /// <summary>
    /// Yêu cầu mở khóa dịch vụ
    /// </summary>
    public class UnlockServiceRequestDto
    {
        public Guid ServiceId { get; set; }
    }



    /// <summary>
    /// IT Ticket DTO
    /// </summary>
    public class ItTicketDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public string RequestedByName { get; set; } = string.Empty;
        public int Priority { get; set; } // 1=Low, 2=Medium, 3=High, 4=Urgent
        public int Status { get; set; } // 0=New, 1=InProgress, 2=Resolved, 3=Closed
        public string? Response { get; set; }
        public string? AssignedToName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }

    /// <summary>
    /// IT Ticket search parameters
    /// </summary>
    public class ItTicketSearchDto
    {
        public int? Status { get; set; }
        public int? Priority { get; set; }
        public string? Keyword { get; set; }
        public int PageIndex { get; set; } = 0;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>
    /// Create IT Ticket request
    /// </summary>
    public class CreateItTicketDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Priority { get; set; } = 2;
    }

    /// <summary>
    /// Respond to IT Ticket
    /// </summary>
    public class RespondItTicketDto
    {
        public string Response { get; set; } = string.Empty;
    }

    /// <summary>
    /// IT Ticket statistics
    /// </summary>
    public class ItTicketStatsDto
    {
        public int NewCount { get; set; }
        public int InProgressCount { get; set; }
        public int ResolvedCount { get; set; }
        public int ClosedCount { get; set; }
        public int TotalCount { get; set; }
    }

}
