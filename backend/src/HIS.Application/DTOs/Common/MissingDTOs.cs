using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs
{
    // ============================================================================
    // Reception DTOs - Missing types
    // ============================================================================

    public class ReceptionDto
    {
        public Guid Id { get; set; }
        public string MedicalRecordCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public Guid? RoomId { get; set; }
        public string RoomName { get; set; }
        public Guid? DoctorId { get; set; }
        public string DoctorName { get; set; }
        public string InsuranceNumber { get; set; }
        public DateTime? InsuranceExpireDate { get; set; }
        public string PatientType { get; set; }
        public string Status { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    // ============================================================================
    // Billing DTOs - Missing types
    // ============================================================================

    public class PaymentDto
    {
        public Guid Id { get; set; }
        public string PaymentCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public Guid? InvoiceId { get; set; }
        public string InvoiceCode { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; }
        public string PaymentStatus { get; set; }
        public DateTime PaymentDate { get; set; }
        public string ReceivedBy { get; set; }
        public string Note { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public class CreatePaymentDto
    {
        public Guid PatientId { get; set; }
        public Guid? InvoiceId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; }
        public string Note { get; set; }
    }

    public class CancelPaymentDto
    {
        public Guid PaymentId { get; set; }
        public string Reason { get; set; }
    }

    public class PaymentHistoryDto
    {
        public Guid Id { get; set; }
        public Guid PaymentId { get; set; }
        public string Action { get; set; }
        public string OldStatus { get; set; }
        public string NewStatus { get; set; }
        public DateTime ActionDate { get; set; }
        public string ActionBy { get; set; }
        public string Note { get; set; }
    }

    public class PaymentStatusDto
    {
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public string Status { get; set; }
    }

    public class CashierReportRequestDto
    {
        public Guid CashierId { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ShiftCode { get; set; }
    }

    public class CashierReportDto
    {
        public Guid CashierId { get; set; }
        public string CashierName { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ShiftCode { get; set; }
        public decimal OpeningBalance { get; set; }
        public decimal TotalCashReceived { get; set; }
        public decimal TotalCardReceived { get; set; }
        public decimal TotalTransferReceived { get; set; }
        public decimal TotalRefunded { get; set; }
        public decimal ClosingBalance { get; set; }
        public int TransactionCount { get; set; }
        public bool IsClosed { get; set; }
    }

    public class CloseCashBookDto
    {
        public Guid CashierId { get; set; }
        public string ShiftCode { get; set; }
        public decimal ActualCashAmount { get; set; }
        public string Note { get; set; }
    }

    public class DepartmentRevenueDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentCode { get; set; }
        public string DepartmentName { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal ServiceRevenue { get; set; }
        public decimal MedicineRevenue { get; set; }
        public decimal SupplyRevenue { get; set; }
        public int PatientCount { get; set; }
    }

    // ============================================================================
    // Admission / Reception DTOs - Missing types
    // ============================================================================

    public class AdmissionDto
    {
        public Guid Id { get; set; }
        public string AdmissionCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public int? YearOfBirth { get; set; }
        public string Gender { get; set; }
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        public string IdentityNumber { get; set; }
        public string InsuranceNumber { get; set; }
        public string InsuranceFacilityName { get; set; }
        public DateTime AdmissionDate { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public Guid? RoomId { get; set; }
        public string RoomName { get; set; }
        public Guid? BedId { get; set; }
        public string BedName { get; set; }
        public string AdmissionType { get; set; }
        public string AdmissionSource { get; set; }
        public string ChiefComplaint { get; set; }
        public string InitialDiagnosis { get; set; }
        public Guid? AttendingDoctorId { get; set; }
        public string AttendingDoctorName { get; set; }
        public string DoctorName { get; set; }
        public string Status { get; set; }
        public DateTime CreatedDate { get; set; }
        // Queue properties for MappingProfile
        public bool IsEmergency { get; set; }
        public bool IsPriority { get; set; }
        public int QueueNumber { get; set; }
        public string QueueCode { get; set; }
        public int Priority { get; set; }
        public DateTime? CalledAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string Notes { get; set; }
    }

    public class AdmissionSearchDto
    {
        public string Keyword { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public Guid? DepartmentId { get; set; }
        public string Status { get; set; }
        public string AdmissionType { get; set; }
        public int? PageIndex { get; set; }
        public int? PageSize { get; set; }
    }

    public class CreateAdmissionDto
    {
        public Guid PatientId { get; set; }
        public Guid DepartmentId { get; set; }
        public Guid? RoomId { get; set; }
        public Guid? BedId { get; set; }
        public string AdmissionType { get; set; }
        public string AdmissionSource { get; set; }
        public string ChiefComplaint { get; set; }
        public string InitialDiagnosis { get; set; }
        public Guid? AttendingDoctorId { get; set; }
    }

    public class UpdateAdmissionDto
    {
        public Guid? DepartmentId { get; set; }
        public Guid? RoomId { get; set; }
        public Guid? BedId { get; set; }
        public string ChiefComplaint { get; set; }
        public string InitialDiagnosis { get; set; }
        public Guid? AttendingDoctorId { get; set; }
    }

    public class DocumentHoldDto
    {
        public Guid Id { get; set; }
        public Guid AdmissionId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string MedicalRecordCode { get; set; }
        public string DocumentType { get; set; }
        public string DocumentNumber { get; set; }
        public string Description { get; set; }
        public DateTime HoldDate { get; set; }
        public string HeldBy { get; set; }
        public DateTime? ReturnDate { get; set; }
        public string ReturnedBy { get; set; }
        public string Status { get; set; }
        public string Note { get; set; }
    }

    public class CreateDocumentHoldDto
    {
        public Guid AdmissionId { get; set; }
        public string DocumentType { get; set; }
        public string DocumentNumber { get; set; }
        public string Description { get; set; }
        public string Note { get; set; }
    }

    public class ReturnDocumentDto
    {
        public Guid DocumentHoldId { get; set; }
        public string Note { get; set; }
    }

    // ============================================================================
    // Bed Management DTOs - Missing types
    // ============================================================================

    public class BedAssignmentDto
    {
        public Guid Id { get; set; }
        public Guid AdmissionId { get; set; }
        public Guid BedId { get; set; }
        public string BedCode { get; set; }
        public string BedName { get; set; }
        public Guid RoomId { get; set; }
        public string RoomName { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public DateTime AssignedDate { get; set; }
        public DateTime? ReleasedDate { get; set; }
        public string Status { get; set; }
        public string AssignedBy { get; set; }
    }

    public class CreateBedAssignmentDto
    {
        public Guid AdmissionId { get; set; }
        public Guid BedId { get; set; }
        public string Note { get; set; }
    }

    public class TransferBedDto
    {
        public Guid AdmissionId { get; set; }
        public Guid NewBedId { get; set; }
        public string Reason { get; set; }
    }

    public class BedStatusDto
    {
        public Guid BedId { get; set; }
        public string BedCode { get; set; }
        public string BedName { get; set; }
        public Guid RoomId { get; set; }
        public string RoomName { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public bool IsOccupied { get; set; }
        public Guid? CurrentPatientId { get; set; }
        public string CurrentPatientName { get; set; }
        public DateTime? OccupiedSince { get; set; }
        public string BedType { get; set; }
        public decimal DailyRate { get; set; }
    }

    public class DischargeDto
    {
        public Guid Id { get; set; }
        public Guid AdmissionId { get; set; }
        public string AdmissionCode { get; set; }
        public string PatientName { get; set; }
        public DateTime DischargeDate { get; set; }
        public string DischargeType { get; set; }
        public string DischargeStatus { get; set; }
        public string FinalDiagnosis { get; set; }
        public string TreatmentSummary { get; set; }
        public string DischargeInstructions { get; set; }
        public string FollowUpDate { get; set; }
        public string DischargedBy { get; set; }
    }

    // ============================================================================
    // Examination DTOs - Missing types
    // ============================================================================

    public class ExaminationDto
    {
        public Guid Id { get; set; }
        public string ExaminationCode { get; set; }
        public string MedicalRecordCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public int? Age { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public DateTime ExaminationDate { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public Guid? RoomId { get; set; }
        public string RoomName { get; set; }
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; }
        public string ChiefComplaint { get; set; }
        public string ClinicalFindings { get; set; }
        public string Diagnosis { get; set; }
        public string IcdCode { get; set; }
        public string TreatmentPlan { get; set; }
        public string Status { get; set; }
        public int? QueueNumber { get; set; }
        public DateTime CreatedDate { get; set; }
        // Properties for MappingProfile
        public int? HeartRate { get; set; }
        public string GeneralExamination { get; set; }
        public string SystemExamination { get; set; }
        public string PrimaryDiagnosisCode { get; set; }
        public string PrimaryDiagnosisName { get; set; }
        public string MedicalHistory { get; set; }
        public DateTime? ReexaminationDate { get; set; }
        public string Notes { get; set; }
        public string PatientType { get; set; }
        public string InsuranceNumber { get; set; }
        public DateTime? InsuranceExpireDate { get; set; }
        public List<IcdCodeDto> SecondaryDiagnoses { get; set; }
    }

    public class IcdCodeDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string NameEnglish { get; set; }
        public string ChapterCode { get; set; }
        public string ChapterName { get; set; }
    }

    public class ExaminationSearchDto
    {
        public string Keyword { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public Guid? DepartmentId { get; set; }
        public Guid? DoctorId { get; set; }
        public string Status { get; set; }
        public int? PageIndex { get; set; }
        public int? PageSize { get; set; }
    }

    public class CreateExaminationDto
    {
        public Guid PatientId { get; set; }
        public Guid DepartmentId { get; set; }
        public Guid? RoomId { get; set; }
        public string ChiefComplaint { get; set; }
    }

    public class UpdateExaminationDto
    {
        public string ClinicalFindings { get; set; }
        public string Diagnosis { get; set; }
        public string IcdCode { get; set; }
        public string TreatmentPlan { get; set; }
    }

    public class MedicalHistoryDto
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public string HistoryType { get; set; }
        public string Description { get; set; }
        public DateTime? OccurrenceDate { get; set; }
        public string Severity { get; set; }
        public string Treatment { get; set; }
        public string Outcome { get; set; }
        public string Note { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    // ============================================================================
    // Queue DTOs - Missing types
    // ============================================================================

    public class QueueDto
    {
        public Guid Id { get; set; }
        public int QueueNumber { get; set; }
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string Gender { get; set; }
        public int? Age { get; set; }
        public string MedicalRecordCode { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public Guid ServicePointId { get; set; }
        public string ServicePointName { get; set; }
        public Guid? RoomId { get; set; }
        public string RoomName { get; set; }
        public string Priority { get; set; }
        public string Status { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? CalledTime { get; set; }
        public DateTime? ServedTime { get; set; }
        public DateTime? CompletedTime { get; set; }
        public int WaitingMinutes { get; set; }
    }

    public class AggregatedRoomStatisticsDto
    {
        public int TotalRooms { get; set; }
        public int OccupiedRooms { get; set; }
        public int AvailableRooms { get; set; }
        public double OccupancyRate { get; set; }
        public List<RoomStatisticsDto> RoomDetails { get; set; }
    }

    public class RoomStatisticsDto
    {
        public Guid RoomId { get; set; }
        public string RoomCode { get; set; }
        public string RoomName { get; set; }
        public string RoomType { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalBeds { get; set; }
        public int OccupiedBeds { get; set; }
        public int AvailableBeds { get; set; }
        public double OccupancyRate { get; set; }
    }

    public class QueueStatisticsDto
    {
        public DateTime Date { get; set; }
        public Guid? ServicePointId { get; set; }
        public string ServicePointName { get; set; }
        public int TotalQueued { get; set; }
        public int TotalServed { get; set; }
        public int TotalWaiting { get; set; }
        public int TotalCancelled { get; set; }
        public double AverageWaitingMinutes { get; set; }
        public double AverageServiceMinutes { get; set; }
    }

    public class QueueDailyStatisticsDto
    {
        public DateTime Date { get; set; }
        public int TotalQueued { get; set; }
        public int TotalServed { get; set; }
        public int TotalCancelled { get; set; }
        public double AverageWaitingMinutes { get; set; }
        public List<HourlyStatisticsDto> HourlyBreakdown { get; set; }
    }

    public class HourlyStatisticsDto
    {
        public int Hour { get; set; }
        public int Count { get; set; }
        public double AverageWaitingMinutes { get; set; }
    }

    public class AverageWaitingTimeDto
    {
        public Guid? ServicePointId { get; set; }
        public string ServicePointName { get; set; }
        public double AverageMinutes { get; set; }
        public int SampleCount { get; set; }
        public double MinMinutes { get; set; }
        public double MaxMinutes { get; set; }
    }

    public class QueueReportRequestDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? ServicePointId { get; set; }
        public string GroupBy { get; set; }
    }

    public class QueueConfigurationDto
    {
        public Guid Id { get; set; }
        public Guid ServicePointId { get; set; }
        public string ServicePointName { get; set; }
        public string QueuePrefix { get; set; }
        public int StartNumber { get; set; }
        public int MaxNumber { get; set; }
        public bool ResetDaily { get; set; }
        public string CallingPattern { get; set; }
        public int MaxWaitingMinutes { get; set; }
        public bool IsActive { get; set; }
    }
}

namespace HIS.Application.DTOs.Reception
{
    // Empty - types are in HIS.Application.DTOs namespace
}

namespace HIS.Application.DTOs.Examination
{
    // Empty - types are in HIS.Application.DTOs namespace
}
