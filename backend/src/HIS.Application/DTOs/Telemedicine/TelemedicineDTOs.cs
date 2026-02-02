using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Telemedicine
{
    #region Appointment DTOs

    /// <summary>
    /// Thông tin đặt lịch khám Telemedicine
    /// </summary>
    public class TeleAppointmentDto
    {
        public Guid Id { get; set; }
        public string AppointmentCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public string PatientPhone { get; set; }
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; }
        public Guid SpecialityId { get; set; }
        public string SpecialityName { get; set; }
        public DateTime AppointmentDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string Status { get; set; } // Pending, Confirmed, InProgress, Completed, Cancelled
        public string AppointmentType { get; set; } // NewConsult, FollowUp, SecondOpinion
        public string ChiefComplaint { get; set; }
        public decimal Fee { get; set; }
        public string PaymentStatus { get; set; } // Pending, Paid, Refunded
        public string PaymentMethod { get; set; }
        public string PaymentTransactionId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Tạo mới lịch hẹn Telemedicine
    /// </summary>
    public class CreateTeleAppointmentDto
    {
        public Guid PatientId { get; set; }
        public Guid DoctorId { get; set; }
        public Guid SpecialityId { get; set; }
        public DateTime AppointmentDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public string AppointmentType { get; set; }
        public string ChiefComplaint { get; set; }
        public List<string> AttachedFiles { get; set; }
    }

    /// <summary>
    /// Khung giờ khả dụng của bác sĩ
    /// </summary>
    public class DoctorAvailableSlotDto
    {
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; }
        public DateTime Date { get; set; }
        public List<TimeSlotDto> AvailableSlots { get; set; }
    }

    public class TimeSlotDto
    {
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public bool IsAvailable { get; set; }
    }

    #endregion

    #region Video Session DTOs

    /// <summary>
    /// Phiên Video Call
    /// </summary>
    public class TeleSessionDto
    {
        public Guid Id { get; set; }
        public string SessionCode { get; set; }
        public Guid AppointmentId { get; set; }
        public string RoomId { get; set; }
        public string RoomToken { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int? DurationMinutes { get; set; }
        public string Status { get; set; } // Waiting, InProgress, Completed, Disconnected
        public string RecordingUrl { get; set; }
        public bool IsRecorded { get; set; }
        public string DoctorJoinUrl { get; set; }
        public string PatientJoinUrl { get; set; }
    }

    /// <summary>
    /// Thông tin tham gia phòng chờ
    /// </summary>
    public class WaitingRoomDto
    {
        public Guid SessionId { get; set; }
        public int QueuePosition { get; set; }
        public int EstimatedWaitMinutes { get; set; }
        public bool DoctorOnline { get; set; }
        public string Message { get; set; }
    }

    /// <summary>
    /// Yêu cầu bắt đầu video call
    /// </summary>
    public class StartVideoCallDto
    {
        public Guid AppointmentId { get; set; }
        public string ParticipantType { get; set; } // Doctor, Patient
        public string DeviceInfo { get; set; }
    }

    #endregion

    #region E-Prescription DTOs

    /// <summary>
    /// Đơn thuốc điện tử Telemedicine
    /// </summary>
    public class TelePrescriptionDto
    {
        public Guid Id { get; set; }
        public string PrescriptionCode { get; set; }
        public Guid SessionId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; }
        public string DoctorLicenseNumber { get; set; }
        public string Diagnosis { get; set; }
        public string DiagnosisICD { get; set; }
        public List<TelePrescriptionItemDto> Items { get; set; }
        public string Note { get; set; }
        public DateTime PrescriptionDate { get; set; }
        public string DigitalSignature { get; set; }
        public string QRCode { get; set; }
        public string Status { get; set; } // Draft, Signed, SentToPharmacy, Dispensed
        public Guid? LinkedPharmacyId { get; set; }
        public string LinkedPharmacyName { get; set; }
    }

    public class TelePrescriptionItemDto
    {
        public int RowNumber { get; set; }
        public Guid DrugId { get; set; }
        public string DrugCode { get; set; }
        public string DrugName { get; set; }
        public string Strength { get; set; }
        public string Unit { get; set; }
        public decimal Quantity { get; set; }
        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public string Route { get; set; }
        public int DurationDays { get; set; }
        public string Instructions { get; set; }
    }

    /// <summary>
    /// Gửi đơn thuốc đến nhà thuốc
    /// </summary>
    public class SendPrescriptionToPharmacyDto
    {
        public Guid PrescriptionId { get; set; }
        public Guid PharmacyId { get; set; }
        public string DeliveryAddress { get; set; }
        public string DeliveryPhone { get; set; }
        public string DeliveryNote { get; set; }
    }

    #endregion

    #region Consultation Record DTOs

    /// <summary>
    /// Hồ sơ khám Telemedicine
    /// </summary>
    public class TeleConsultationRecordDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public Guid AppointmentId { get; set; }

        // Patient Info
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public int PatientAge { get; set; }
        public string PatientGender { get; set; }

        // Consultation Content
        public string ChiefComplaint { get; set; }
        public string HistoryOfPresentIllness { get; set; }
        public string PastMedicalHistory { get; set; }
        public string CurrentMedications { get; set; }
        public string Allergies { get; set; }
        public string VitalSigns { get; set; } // JSON của dữ liệu BN tự đo
        public string PhysicalExamNotes { get; set; }
        public string Assessment { get; set; }
        public string PrimaryDiagnosis { get; set; }
        public string PrimaryDiagnosisICD { get; set; }
        public List<string> SecondaryDiagnoses { get; set; }
        public string Plan { get; set; }

        // Recommendations
        public bool RequiresInPersonVisit { get; set; }
        public string InPersonVisitReason { get; set; }
        public DateTime? FollowUpDate { get; set; }
        public string FollowUpInstructions { get; set; }

        // Attachments
        public List<string> PatientUploadedFiles { get; set; }
        public List<string> DoctorNotes { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật hồ sơ khám
    /// </summary>
    public class SaveTeleConsultationDto
    {
        public Guid? Id { get; set; }
        public Guid SessionId { get; set; }
        public string ChiefComplaint { get; set; }
        public string HistoryOfPresentIllness { get; set; }
        public string PastMedicalHistory { get; set; }
        public string CurrentMedications { get; set; }
        public string Allergies { get; set; }
        public string VitalSigns { get; set; }
        public string PhysicalExamNotes { get; set; }
        public string Assessment { get; set; }
        public string PrimaryDiagnosis { get; set; }
        public string PrimaryDiagnosisICD { get; set; }
        public List<string> SecondaryDiagnoses { get; set; }
        public string Plan { get; set; }
        public bool RequiresInPersonVisit { get; set; }
        public string InPersonVisitReason { get; set; }
        public DateTime? FollowUpDate { get; set; }
        public string FollowUpInstructions { get; set; }
    }

    #endregion

    #region Patient Portal Integration DTOs

    /// <summary>
    /// Thông tin BN từ Portal
    /// </summary>
    public class TelePatientProfileDto
    {
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string FullName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string PhoneNumber { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string InsuranceNumber { get; set; }
        public bool InsuranceValid { get; set; }
        public List<TeleAppointmentDto> UpcomingAppointments { get; set; }
        public List<TeleAppointmentDto> PastAppointments { get; set; }
    }

    /// <summary>
    /// Đánh giá dịch vụ Telemedicine
    /// </summary>
    public class TeleFeedbackDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public Guid PatientId { get; set; }
        public int OverallRating { get; set; } // 1-5
        public int DoctorRating { get; set; }
        public int TechnicalRating { get; set; }
        public int WaitTimeRating { get; set; }
        public string Comments { get; set; }
        public bool WouldRecommend { get; set; }
        public DateTime SubmittedAt { get; set; }
    }

    /// <summary>
    /// Gửi đánh giá
    /// </summary>
    public class SubmitTeleFeedbackDto
    {
        public Guid SessionId { get; set; }
        public int OverallRating { get; set; }
        public int DoctorRating { get; set; }
        public int TechnicalRating { get; set; }
        public int WaitTimeRating { get; set; }
        public string Comments { get; set; }
        public bool WouldRecommend { get; set; }
    }

    #endregion

    #region Dashboard & Statistics DTOs

    /// <summary>
    /// Dashboard Telemedicine
    /// </summary>
    public class TelemedicineDashboardDto
    {
        public DateTime Date { get; set; }

        // Today Stats
        public int TodayAppointments { get; set; }
        public int TodayCompleted { get; set; }
        public int TodayCancelled { get; set; }
        public int TodayNoShow { get; set; }
        public decimal TodayRevenue { get; set; }

        // Current Status
        public int CurrentWaitingPatients { get; set; }
        public int CurrentActiveSessions { get; set; }
        public int OnlineDoctors { get; set; }

        // This Month
        public int MonthAppointments { get; set; }
        public int MonthCompleted { get; set; }
        public decimal MonthRevenue { get; set; }
        public double AverageRating { get; set; }
        public int AverageWaitMinutes { get; set; }
        public int AverageSessionMinutes { get; set; }

        // By Speciality
        public List<TeleSpecialityStatDto> BySpeciality { get; set; }

        // Trends
        public List<TeleDailyStatDto> DailyTrend { get; set; }
    }

    public class TeleSpecialityStatDto
    {
        public Guid SpecialityId { get; set; }
        public string SpecialityName { get; set; }
        public int AppointmentCount { get; set; }
        public decimal Revenue { get; set; }
        public double AverageRating { get; set; }
    }

    public class TeleDailyStatDto
    {
        public DateTime Date { get; set; }
        public int Appointments { get; set; }
        public int Completed { get; set; }
        public decimal Revenue { get; set; }
    }

    #endregion
}
