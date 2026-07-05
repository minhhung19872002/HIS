namespace HIS.Application.DTOs.ObservationStay;

    public class CreateDto
    {
        public Guid PatientId { get; set; }
        public Guid? MedicalRecordId { get; set; }
        public Guid? DepartmentId { get; set; }
        public Guid? RoomId { get; set; }
        public Guid? BedId { get; set; }
        public Guid? DoctorId { get; set; }
        public string? ChiefComplaint { get; set; }
        public string? InitialDiagnosis { get; set; }
        public string? Notes { get; set; }
        public int? TriageLevel { get; set; }
    }

    public class VitalDto
    {
        public decimal? Temperature { get; set; }
        public int? HeartRate { get; set; }
        public int? RespirationRate { get; set; }
        public string? BloodPressure { get; set; }
        public int? SpO2 { get; set; }
        public int? Consciousness { get; set; }
        public string? NurseNote { get; set; }
        public string? DoctorNote { get; set; }
    }

    public class DischargeDto
    {
        public string? FinalDiagnosis { get; set; }
        public string? DischargeReason { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateTriageDto { public int TriageLevel { get; set; } }
