using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.PatientPortal
{

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

    /// <summary>R2: Bệnh nhân tự đăng nhập portal (identifier = username/email/phone).</summary>
    public class PortalLoginDto
    {
        public string Identifier { get; set; }
        public string Password { get; set; }
    }

    /// <summary>Issue #202: kết quả xác thực portal (DB+BCrypt+lockout ở service; JWT gen ở controller).</summary>
    public class PortalAuthResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public Guid AccountId { get; set; }
        public Guid PatientId { get; set; }
        public string Username { get; set; } = string.Empty;
    }

    /// <summary>R2: Kết quả đăng nhập portal — token JWT role PortalPatient mang claim patientId.</summary>
    public class PortalLoginResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string Token { get; set; }
        public PortalAccountDto Account { get; set; }
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



    /// <summary>
    /// Tóm tắt hồ sơ sức khỏe
    /// </summary>
    public class HealthRecordSummaryDto
    {
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string BloodType { get; set; }
        public string PhoneNumber { get; set; }
        public string InsuranceNumber { get; set; }
        public DateTime? InsuranceExpiry { get; set; }
        public string Address { get; set; }

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

        /// <summary>Lượt khám sinh ra chỉ định này — để lọc "kết quả của lần khám này".</summary>
        public Guid? VisitId { get; set; }

        /// <summary>Tên dịch vụ xét nghiệm (VD "Công thức máu 18 thông số").</summary>
        public string ServiceName { get; set; }

        /// <summary>Có ít nhất một chỉ số vượt khoảng tham chiếu — app tô cờ ở danh sách.</summary>
        public bool HasAbnormal { get; set; }
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

        /// <summary>Lượt khám sinh ra chỉ định này.</summary>
        public Guid? VisitId { get; set; }

        /// <summary>Study Instance UID trong PACS — khoá để lấy danh sách ảnh.</summary>
        public string StudyInstanceUid { get; set; }

        public int ImageCount { get; set; }

        /// <summary>Đề nghị của bác sĩ đọc phim (tái khám, chụp bổ sung…).</summary>
        public string Recommendations { get; set; }
    }

    /// <summary>
    /// Kết quả thăm dò chức năng cho Patient Portal (HSMT app I.2 #5 — điện tim, điện não, nội soi,
    /// đo loãng xương, hô hấp, thính lực…). Trước đây bệnh nhân không có đường nào xem được.
    /// </summary>
    public class PortalFunctionalResultDto
    {
        public Guid Id { get; set; }
        public string TestCode { get; set; }

        /// <summary>Mã loại: ECG, ECGStress, Endoscopy, BoneDensity, EEG, EMG, Spirometry, Audiometry.</summary>
        public string TestType { get; set; }

        /// <summary>Tên loại đã dịch sang tiếng Việt để hiển thị thẳng.</summary>
        public string TestTypeName { get; set; }

        public DateTime? PerformedAt { get; set; }
        public string PerformingDoctorName { get; set; }
        public string DeviceName { get; set; }

        public string ClinicalIndication { get; set; }
        public string Findings { get; set; }
        public string Conclusion { get; set; }
        public string Recommendation { get; set; }

        /// <summary>Các số đo, đã tách từ JSON để app khỏi phải tự phân tích.</summary>
        public List<FunctionalMeasurementDto> Measurements { get; set; } = new List<FunctionalMeasurementDto>();

        public int ImageCount { get; set; }

        /// <summary>0 chờ · 1 đang làm · 2 đã có KQ · 3 đã duyệt · 4 huỷ.</summary>
        public int Status { get; set; }
        public string StatusName { get; set; }

        public Guid? VisitId { get; set; }
    }

    public class FunctionalMeasurementDto
    {
        public string Name { get; set; }
        public string Value { get; set; }
    }

    /// <summary>
    /// Đợt khám sức khoẻ hợp đồng của một người bệnh (HSMT app I.2 #5).
    /// </summary>
    public class PortalHealthCheckupDto
    {
        public Guid Id { get; set; }
        public string RecordCode { get; set; }
        public string CampaignName { get; set; }
        public string CompanyName { get; set; }
        public DateTime? CheckupDate { get; set; }

        /// <summary>Phân loại sức khoẻ I…V theo Quyết định 1613/BYT-QĐ.</summary>
        public string HealthClassification { get; set; }
        public string Conclusion { get; set; }
        public string Recommendation { get; set; }

        public bool CertificateIssued { get; set; }
        public string CertificateNumber { get; set; }
        public DateTime? CertificateDate { get; set; }
    }

    /// <summary>
    /// Một đợt nằm viện (HSMT app I.2 #6). Trước đây không có đường nào để bệnh nhân liệt kê các đợt
    /// điều trị nội trú của chính mình.
    /// </summary>
    public class PortalAdmissionDto
    {
        public Guid Id { get; set; }
        public Guid MedicalRecordId { get; set; }
        public string MedicalRecordCode { get; set; }

        public DateTime AdmissionDate { get; set; }
        public DateTime? DischargeDate { get; set; }

        /// <summary>Số ngày nằm viện tính tới hôm nay nếu chưa ra viện.</summary>
        public int DaysOfStay { get; set; }

        public string DepartmentName { get; set; }
        public string RoomName { get; set; }
        public string BedName { get; set; }
        public string AdmittingDoctorName { get; set; }

        public string ReasonForAdmission { get; set; }
        public string DiagnosisOnAdmission { get; set; }
        public string DischargeDiagnosis { get; set; }

        /// <summary>Xem <c>HIS.Core.Constants.AdmissionStatus</c>.</summary>
        public int Status { get; set; }
        public string StatusName { get; set; }
        public bool IsInProgress { get; set; }
    }

    /// <summary>
    /// Bảng công khai thuốc nội trú theo mẫu 11D/BV-01/TT23 (HSMT app I.2 #6 "xem công khai thuốc").
    /// Trước đây HIS chỉ xuất được bản in; DTO này là dạng dữ liệu để app dựng bảng.
    /// </summary>
    public class PortalMedicineDisclosureDto
    {
        public Guid AdmissionId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        public List<PortalMedicineDisclosureItemDto> Items { get; set; } = new List<PortalMedicineDisclosureItemDto>();

        public decimal TotalAmount { get; set; }
        public decimal InsuranceAmount { get; set; }
        public decimal PatientAmount { get; set; }
    }

    public class PortalMedicineDisclosureItemDto
    {
        public DateTime PrescriptionDate { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string ActiveIngredient { get; set; }
        public string Unit { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Amount { get; set; }

        /// <summary>BHYT · Viện phí · Khác — nguồn chi trả của dòng thuốc này.</summary>
        public string PaymentSourceName { get; set; }

        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public string UsageInstructions { get; set; }
    }

    /// <summary>
    /// Một chỉ định cận lâm sàng trong đợt nội trú, kèm số thứ tự thực hiện (HSMT app I.2 #6).
    /// </summary>
    public class PortalServiceOrderDto
    {
        public Guid Id { get; set; }
        public string OrderCode { get; set; }
        public DateTime OrderDate { get; set; }

        public string ServiceName { get; set; }

        /// <summary>1 Xét nghiệm · 2 CĐHA · 3 TDCN · 4 Thủ thuật — theo <c>ServiceRequest.RequestType</c>.</summary>
        public int RequestType { get; set; }
        public string RequestTypeName { get; set; }

        public string ExecuteRoomName { get; set; }
        public string OrderingDoctor { get; set; }

        /// <summary>0 chờ · 1 đang thực hiện · 2 đã có kết quả · 3 huỷ.</summary>
        public int Status { get; set; }
        public string StatusName { get; set; }
        public DateTime? ResultDate { get; set; }

        /// <summary>
        /// Số thứ tự thực hiện tại phòng cận lâm sàng, ví dụ "C012". Rỗng khi chưa lấy số hoặc khi
        /// phòng đó không phát số.
        /// </summary>
        public string QueueNumber { get; set; }

        /// <summary>Còn bao nhiêu người trước mình; -1 = không xác định được.</summary>
        public int PeopleAhead { get; set; }
    }

    /// <summary>Một ảnh trong PACS, đủ để app dựng khung xem ảnh.</summary>
    public class PortalImagingInstanceDto
    {
        /// <summary>Id instance trong Orthanc — ghép vào URL ảnh.</summary>
        public string InstanceId { get; set; }
        public string SeriesInstanceUid { get; set; }
        public int SeriesNumber { get; set; }
        public int InstanceNumber { get; set; }
        public string SeriesDescription { get; set; }
    }



    /// <summary>
    /// Đơn thuốc trên Portal
    /// </summary>
    public class PortalPrescriptionDto
    {
        public Guid Id { get; set; }
        public string PrescriptionCode { get; set; }
        public DateTime PrescriptionDate { get; set; }
        public Guid VisitId { get; set; }
        public Guid? ExaminationId { get; set; }
        public Guid? PatientId { get; set; }
        public string? PatientCode { get; set; }
        public string? PatientName { get; set; }
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


}
