using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.PatientPortal
{
    #region Account & Authentication DTOs

    /// <summary>
    /// Tài khoản Patient Portal
    /// </summary>
    public class PortalAccountDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public bool IsEmailVerified { get; set; }
        public bool IsPhoneVerified { get; set; }
        public bool Is2FAEnabled { get; set; }
        public string TwoFactorMethod { get; set; } // SMS, Email, Authenticator
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public string AccountStatus { get; set; } // Active, Suspended, Locked
        public string Status { get; set; }

        // Linked Patient
        public Guid? PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public bool IsPatientLinked { get; set; }

        // Preferences
        public string Language { get; set; }
        public bool NotifyByEmail { get; set; }
        public bool NotifyBySMS { get; set; }
        public bool NotifyByPush { get; set; }
    }

    /// <summary>
    /// Đăng ký tài khoản
    /// </summary>
    public class RegisterPortalAccountDto
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string IdNumber { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Password { get; set; }
    }

    /// <summary>
    /// Xác thực eKYC
    /// </summary>
    public class eKYCVerificationDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string IdNumber { get; set; }
        public string FullName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string IdFrontImage { get; set; } // Base64
        public string IdBackImage { get; set; } // Base64
        public string SelfieImage { get; set; } // Base64
        public string Status { get; set; } // Pending, Verified, Failed
        public string VerificationStatus { get; set; } // Pending, Verified, Failed
        public string FailureReason { get; set; }
        public decimal MatchScore { get; set; }
        public DateTime VerifiedAt { get; set; }
    }

    #endregion

    #region Appointment Booking DTOs

    /// <summary>
    /// Đặt lịch hẹn khám
    /// </summary>
    public class PortalAppointmentDto
    {
        public Guid Id { get; set; }
        public string AppointmentCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }

        // Schedule
        public DateTime AppointmentDate { get; set; }
        public TimeSpan AppointmentTime { get; set; }
        public string Session { get; set; } // Morning, Afternoon

        // Location
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public Guid? DoctorId { get; set; }
        public string DoctorName { get; set; }
        public string DoctorTitle { get; set; }
        public string RoomNumber { get; set; }

        // Details
        public string VisitType { get; set; } // New, FollowUp
        public string ReasonForVisit { get; set; }
        public string Symptoms { get; set; }
        public List<string> AttachedFiles { get; set; }

        // Status
        public string Status { get; set; } // Pending, Confirmed, CheckedIn, Completed, Cancelled, NoShow
        public string ConfirmationCode { get; set; }
        public string QRCode { get; set; }
        public int? QueueNumber { get; set; }

        // Payment
        public bool IsPrepaid { get; set; }
        public decimal? BookingFee { get; set; }
        public string PaymentStatus { get; set; }
        public string PaymentTransactionId { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? CheckedInAt { get; set; }
    }

    /// <summary>
    /// Tạo lịch hẹn mới
    /// </summary>
    public class CreatePortalAppointmentDto
    {
        public DateTime AppointmentDate { get; set; }
        public TimeSpan AppointmentTime { get; set; }
        public Guid DepartmentId { get; set; }
        public Guid? DoctorId { get; set; }
        public string VisitType { get; set; }
        public string ReasonForVisit { get; set; }
        public string Symptoms { get; set; }
    }

    /// <summary>
    /// Lịch hẹn có thể đặt
    /// </summary>
    public class AvailableSlotDto
    {
        public DateTime Date { get; set; }
        public string Session { get; set; }
        public List<TimeSlotItemDto> TimeSlots { get; set; }
    }

    public class TimeSlotItemDto
    {
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public bool IsAvailable { get; set; }
        public int RemainingSlots { get; set; }
        public Guid? DoctorId { get; set; }
        public string DoctorName { get; set; }
    }

    #endregion

    #region Medical Records Access DTOs

    /// <summary>
    /// Tóm tắt hồ sơ sức khỏe
    /// </summary>
    public class HealthRecordSummaryDto
    {
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string BloodType { get; set; }

        // Allergies
        public List<string> Allergies { get; set; }

        // Chronic Conditions
        public List<string> ChronicConditions { get; set; }

        // Current Medications
        public List<CurrentMedicationDto> CurrentMedications { get; set; }

        // Recent Visits
        public List<VisitSummaryDto> RecentVisits { get; set; }

        // Immunizations
        public List<ImmunizationDto> Immunizations { get; set; }

        // Vitals Trend
        public List<VitalsTrendDto> VitalsTrend { get; set; }

        public DateTime LastUpdated { get; set; }
    }

    public class CurrentMedicationDto
    {
        public string DrugName { get; set; }
        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public DateTime StartDate { get; set; }
        public string PrescribedBy { get; set; }
    }

    public class VisitSummaryDto
    {
        public Guid VisitId { get; set; }
        public DateTime VisitDate { get; set; }
        public string VisitType { get; set; }
        public string Department { get; set; }
        public string DoctorName { get; set; }
        public string Diagnosis { get; set; }
        public string Summary { get; set; }
    }

    public class ImmunizationDto
    {
        public string VaccineName { get; set; }
        public DateTime DateAdministered { get; set; }
        public string DoseNumber { get; set; }
        public DateTime? NextDueDate { get; set; }
    }

    public class VitalsTrendDto
    {
        public DateTime Date { get; set; }
        public decimal? BloodPressureSystolic { get; set; }
        public decimal? BloodPressureDiastolic { get; set; }
        public decimal? HeartRate { get; set; }
        public decimal? Weight { get; set; }
        public decimal? BloodGlucose { get; set; }
    }

    #endregion

    #region Lab/Imaging Results DTOs

    /// <summary>
    /// Kết quả xét nghiệm cho Patient Portal
    /// </summary>
    public class PortalLabResultDto
    {
        public Guid Id { get; set; }
        public string OrderCode { get; set; }
        public DateTime OrderDate { get; set; }
        public DateTime? ResultDate { get; set; }
        public string OrderingDoctor { get; set; }
        public string Department { get; set; }

        // Test Info
        public string TestCategory { get; set; }
        public List<LabTestItemDto> TestItems { get; set; }

        // Status
        public string Status { get; set; } // Pending, InProgress, Completed
        public bool IsViewed { get; set; }
        public DateTime? ViewedAt { get; set; }

        // Report
        public string ReportUrl { get; set; }
    }

    public class LabTestItemDto
    {
        public string TestName { get; set; }
        public string Result { get; set; }
        public string Unit { get; set; }
        public string NormalRange { get; set; }
        public string Flag { get; set; } // Normal, High, Low, Critical
        public string Interpretation { get; set; }
    }

    /// <summary>
    /// Kết quả CĐHA cho Patient Portal
    /// </summary>
    public class PortalImagingResultDto
    {
        public Guid Id { get; set; }
        public string OrderCode { get; set; }
        public DateTime OrderDate { get; set; }
        public DateTime? StudyDate { get; set; }
        public string OrderingDoctor { get; set; }
        public string Department { get; set; }

        // Study Info
        public string Modality { get; set; } // XRay, CT, MRI, Ultrasound
        public string BodyPart { get; set; }
        public string StudyDescription { get; set; }

        // Result
        public string Findings { get; set; }
        public string Impression { get; set; }
        public string ReportingDoctor { get; set; }
        public string Status { get; set; }

        // Images
        public bool HasImages { get; set; }
        public string ImageViewerUrl { get; set; } // Link to PACS viewer
        public List<string> ThumbnailUrls { get; set; }

        public bool IsViewed { get; set; }
    }

    #endregion

    #region Prescription & Pharmacy DTOs

    /// <summary>
    /// Đơn thuốc trên Portal
    /// </summary>
    public class PortalPrescriptionDto
    {
        public Guid Id { get; set; }
        public string PrescriptionCode { get; set; }
        public DateTime PrescriptionDate { get; set; }
        public Guid VisitId { get; set; }
        public string Diagnosis { get; set; }
        public string DoctorName { get; set; }
        public string DepartmentName { get; set; }

        // Items
        public List<PrescriptionItemDto> Items { get; set; }

        // Status
        public string Status { get; set; } // Active, PartiallyDispensed, FullyDispensed, Expired
        public bool CanRefill { get; set; }
        public int RefillsRemaining { get; set; }

        // Dispensing
        public bool IsDispensed { get; set; }
        public DateTime? DispensedAt { get; set; }
        public string DispensingPharmacy { get; set; }

        // Delivery (optional)
        public bool RequestedDelivery { get; set; }
        public string DeliveryStatus { get; set; }
        public string DeliveryAddress { get; set; }
        public string TrackingNumber { get; set; }

        // Documents
        public string PrescriptionPdfUrl { get; set; }
        public string QRCode { get; set; }
    }

    public class PrescriptionItemDto
    {
        public string DrugName { get; set; }
        public string Strength { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public int DurationDays { get; set; }
        public string Instructions { get; set; }
    }

    /// <summary>
    /// Yêu cầu refill đơn thuốc
    /// </summary>
    public class RefillRequestDto
    {
        public Guid Id { get; set; }
        public Guid PrescriptionId { get; set; }
        public string DeliveryOption { get; set; } // Pickup, Delivery
        public string DeliveryAddress { get; set; }
        public string DeliveryPhone { get; set; }
        public Guid? PreferredPharmacyId { get; set; }
        public string Notes { get; set; }
        public string Status { get; set; } // Pending, Approved, Rejected, Dispensed
        public DateTime RequestedAt { get; set; }
    }

    #endregion

    #region Payment DTOs

    /// <summary>
    /// Hóa đơn thanh toán online
    /// </summary>
    public class PortalInvoiceDto
    {
        public Guid Id { get; set; }
        public string InvoiceCode { get; set; }
        public DateTime InvoiceDate { get; set; }
        public Guid? VisitId { get; set; }
        public Guid? AdmissionId { get; set; }
        public string VisitType { get; set; }
        public string DepartmentName { get; set; }

        // Amounts
        public decimal TotalAmount { get; set; }
        public decimal InsuranceCovered { get; set; }
        public decimal PatientResponsibility { get; set; }
        public decimal Discount { get; set; }
        public decimal AmountDue { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal Balance { get; set; }

        // Items
        public List<InvoiceItemDto> Items { get; set; }

        // Status
        public string PaymentStatus { get; set; } // Unpaid, PartiallyPaid, Paid
        public bool CanPayOnline { get; set; }
        public DateTime? DueDate { get; set; }
        public bool IsOverdue { get; set; }

        // Documents
        public string InvoicePdfUrl { get; set; }
    }

    public class InvoiceItemDto
    {
        public string ServiceName { get; set; }
        public string Category { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal InsuranceCoverage { get; set; }
        public decimal PatientPays { get; set; }
    }

    /// <summary>
    /// Thanh toán online
    /// </summary>
    public class OnlinePaymentDto
    {
        public Guid Id { get; set; }
        public string TransactionCode { get; set; }
        public List<Guid> InvoiceIds { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } // VNPay, Momo, Card, BankTransfer
        public string PaymentGateway { get; set; }
        public string GatewayTransactionId { get; set; }
        public string Status { get; set; } // Pending, Processing, Completed, Failed, Refunded
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string PaymentUrl { get; set; }
        public string ReceiptUrl { get; set; }
    }

    /// <summary>
    /// Khởi tạo thanh toán
    /// </summary>
    public class InitiatePaymentDto
    {
        public List<Guid> InvoiceIds { get; set; }
        public string PaymentMethod { get; set; }
        public string ReturnUrl { get; set; }
    }

    #endregion

    #region Feedback & Communication DTOs

    /// <summary>
    /// Đánh giá dịch vụ
    /// </summary>
    public class ServiceFeedbackDto
    {
        public Guid Id { get; set; }
        public Guid VisitId { get; set; }
        public DateTime VisitDate { get; set; }
        public string DepartmentName { get; set; }
        public string DoctorName { get; set; }

        // Ratings
        public int OverallRating { get; set; }
        public int DoctorRating { get; set; }
        public int StaffRating { get; set; }
        public int FacilityRating { get; set; }
        public int WaitTimeRating { get; set; }

        // Feedback
        public string Comments { get; set; }
        public bool WouldRecommend { get; set; }

        public DateTime SubmittedAt { get; set; }
    }

    /// <summary>
    /// Gửi đánh giá
    /// </summary>
    public class SubmitFeedbackDto
    {
        public Guid VisitId { get; set; }
        public int OverallRating { get; set; }
        public int DoctorRating { get; set; }
        public int StaffRating { get; set; }
        public int FacilityRating { get; set; }
        public int WaitTimeRating { get; set; }
        public string Comments { get; set; }
        public bool WouldRecommend { get; set; }
    }

    /// <summary>
    /// Thông báo Portal
    /// </summary>
    public class PortalNotificationDto
    {
        public Guid Id { get; set; }
        public string NotificationType { get; set; } // Appointment, LabResult, Invoice, Message, Reminder
        public string Title { get; set; }
        public string Message { get; set; }
        public string ActionUrl { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
    }

    #endregion

    #region Dashboard DTOs

    /// <summary>
    /// Dashboard cho Patient Portal
    /// </summary>
    public class PatientPortalDashboardDto
    {
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime LastVisit { get; set; }
        public int UpcomingAppointments { get; set; }
        public int UnreadLabResults { get; set; }
        public int PendingInvoices { get; set; }
        public int UnreadNotifications { get; set; }

        // Upcoming
        public PortalAppointmentDto NextAppointment { get; set; }
        public int UpcomingAppointmentsCount { get; set; }

        // Pending Actions
        public int UnpaidInvoices { get; set; }
        public decimal TotalAmountDue { get; set; }
        public int NewLabResults { get; set; }
        public int NewImagingResults { get; set; }
        public int PendingRefills { get; set; }

        // Reminders
        public List<ReminderDto> Reminders { get; set; }

        // Recent Notifications
        public List<PortalNotificationDto> RecentNotifications { get; set; }

        // Health Summary
        public string LastBloodPressure { get; set; }
        public string LastWeight { get; set; }
        public string LastBloodGlucose { get; set; }
    }

    public class ReminderDto
    {
        public string ReminderType { get; set; } // Medication, FollowUp, Vaccination, HealthCheck
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime DueDate { get; set; }
        public bool IsDue { get; set; }
    }

    #endregion
}
