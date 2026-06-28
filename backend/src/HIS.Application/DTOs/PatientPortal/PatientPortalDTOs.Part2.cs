using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.PatientPortal
{

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



    public class FamilyMemberDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string FullName { get; set; }
        public string Relationship { get; set; }
        public string DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string InsuranceNumber { get; set; }
        public Guid? LinkedPatientId { get; set; }
        public string LinkedPatientName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SaveFamilyMemberDto
    {
        public Guid? Id { get; set; }
        public Guid AccountId { get; set; }
        public string FullName { get; set; }
        public string Relationship { get; set; }
        public string DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string InsuranceNumber { get; set; }
        public Guid? LinkedPatientId { get; set; }
    }



    public class MedicineReminderDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string MedicineName { get; set; }
        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public string Times { get; set; }
        public string Instructions { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; }
        public string PrescriptionId { get; set; }
        public string Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SaveMedicineReminderDto
    {
        public Guid? Id { get; set; }
        public Guid AccountId { get; set; }
        public string MedicineName { get; set; }
        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public string Times { get; set; }
        public string Instructions { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string PrescriptionId { get; set; }
        public string Notes { get; set; }
    }



    public class HealthMetricDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public DateTime RecordedAt { get; set; }
        public decimal? BloodPressureSystolic { get; set; }
        public decimal? BloodPressureDiastolic { get; set; }
        public decimal? HeartRate { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public decimal? BMI { get; set; }
        public decimal? BloodGlucose { get; set; }
        public decimal? Temperature { get; set; }
        public decimal? SpO2 { get; set; }
        public string Notes { get; set; }
        public string Source { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SaveHealthMetricDto
    {
        public Guid? Id { get; set; }
        public Guid AccountId { get; set; }
        public DateTime RecordedAt { get; set; }
        public decimal? BloodPressureSystolic { get; set; }
        public decimal? BloodPressureDiastolic { get; set; }
        public decimal? HeartRate { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public decimal? BloodGlucose { get; set; }
        public decimal? Temperature { get; set; }
        public decimal? SpO2 { get; set; }
        public string Notes { get; set; }
        public string Source { get; set; }
    }

    public class HealthMetricTrendDto
    {
        public string MetricName { get; set; }
        public List<HealthMetricPointDto> DataPoints { get; set; }
        public decimal? MinValue { get; set; }
        public decimal? MaxValue { get; set; }
        public decimal? AvgValue { get; set; }
        public decimal? LatestValue { get; set; }
    }

    public class HealthMetricPointDto
    {
        public DateTime RecordedAt { get; set; }
        public decimal Value { get; set; }
    }



    public class PatientQuestionDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string Subject { get; set; }
        public string Content { get; set; }
        public string Category { get; set; }
        public string ImageUrls { get; set; }
        public int Status { get; set; }
        public string StatusText { get; set; }
        public string AnsweredBy { get; set; }
        public string AnsweredByName { get; set; }
        public string Answer { get; set; }
        public DateTime? AnsweredAt { get; set; }
        public bool IsPublic { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePatientQuestionDto
    {
        public Guid AccountId { get; set; }
        public string Subject { get; set; }
        public string Content { get; set; }
        public string Category { get; set; }
        public string ImageUrls { get; set; }
        public bool IsPublic { get; set; }
    }

    public class AnswerPatientQuestionDto
    {
        public string AnsweredBy { get; set; }
        public string AnsweredByName { get; set; }
        public string Answer { get; set; }
    }

    // G-39: Full EMR visit detail for Patient Portal
    public class PortalVisitDetailDto
    {
        public Guid VisitId { get; set; }
        public DateTime VisitDate { get; set; }
        public string Department { get; set; }
        public string DoctorName { get; set; }
        // Hỏi bệnh
        public string ChiefComplaint { get; set; }
        public string PresentIllness { get; set; }
        public string PhysicalExamination { get; set; }
        // Sinh hiệu
        public decimal? Temperature { get; set; }
        public int? Pulse { get; set; }
        public int? BloodPressureSystolic { get; set; }
        public int? BloodPressureDiastolic { get; set; }
        public int? RespiratoryRate { get; set; }
        public decimal? Height { get; set; }
        public decimal? Weight { get; set; }
        public decimal? SpO2 { get; set; }
        // Chẩn đoán
        public string InitialDiagnosis { get; set; }
        public string MainDiagnosis { get; set; }
        public string MainIcdCode { get; set; }
        public string SubDiagnosis { get; set; }
        // Kết luận
        public string ConclusionNote { get; set; }
        public string TreatmentPlan { get; set; }
        public DateTime? FollowUpDate { get; set; }
        // Đơn thuốc trong lượt khám này
        public List<PortalVisitPrescriptionDto> Prescriptions { get; set; } = new();
        // Tờ điều trị (nội trú)
        public List<PortalTreatmentSheetDto> TreatmentSheets { get; set; } = new();
        // Phẫu thuật/thủ thuật
        public List<PortalSurgeryDto> Surgeries { get; set; } = new();
    }

    public class PortalVisitPrescriptionDto
    {
        public Guid Id { get; set; }
        public string PrescriptionCode { get; set; }
        public DateTime PrescriptionDate { get; set; }
        public string Status { get; set; }
        public List<PortalVisitPrescriptionItemDto> Items { get; set; } = new();
    }

    public class PortalVisitPrescriptionItemDto
    {
        public string MedicineName { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
        public string Usage { get; set; }
    }

    public class PortalTreatmentSheetDto
    {
        public DateTime TreatmentDate { get; set; }
        public int Day { get; set; }
        public string DoctorOrders { get; set; }
        public string PatientCondition { get; set; }
        public string Notes { get; set; }
    }

    public class PortalSurgeryDto
    {
        public string SurgeryName { get; set; }
        public string ProcedureCode { get; set; }
        public DateTime? ScheduledDate { get; set; }
        public string Status { get; set; }
    }

}
