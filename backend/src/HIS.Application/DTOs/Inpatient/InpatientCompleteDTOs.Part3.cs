namespace HIS.Application.DTOs.Inpatient;


/// <summary>
/// DTO tờ điều trị
/// </summary>
public class TreatmentSheetDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public DateTime TreatmentDate { get; set; }

    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;

    // Diễn biến bệnh
    public string? ProgressNotes { get; set; }

    // Y lệnh điều trị
    public string? TreatmentOrders { get; set; }

    // Chăm sóc
    public string? NursingOrders { get; set; }

    // Chế độ dinh dưỡng
    public string? DietOrders { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// DTO tạo tờ điều trị
/// </summary>
public class CreateTreatmentSheetDto
{
    public Guid AdmissionId { get; set; }
    public DateTime TreatmentDate { get; set; }
    public string? ProgressNotes { get; set; }
    public string? TreatmentOrders { get; set; }
    public string? NursingOrders { get; set; }
    public string? DietOrders { get; set; }
}

/// <summary>
/// DTO mẫu tờ điều trị
/// </summary>
public class TreatmentSheetTemplateDto
{
    public Guid Id { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string? TemplateContent { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? CreatedBy { get; set; }
    public bool IsShared { get; set; }
}

/// <summary>
/// DTO dấu hiệu sinh tồn
/// </summary>
public class VitalSignsRecordDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public DateTime RecordTime { get; set; }

    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? RespiratoryRate { get; set; }
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public decimal? SpO2 { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }

    public string? Notes { get; set; }

    public Guid RecordedBy { get; set; }
    public string RecordedByName { get; set; } = string.Empty;
}

/// <summary>
/// DTO tạo dấu hiệu sinh tồn
/// </summary>
public class CreateVitalSignsDto
{
    public Guid AdmissionId { get; set; }
    public DateTime RecordTime { get; set; }

    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? RespiratoryRate { get; set; }
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public decimal? SpO2 { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO biểu đồ sinh tồn
/// </summary>
public class VitalSignsChartDto
{
    public Guid AdmissionId { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public List<VitalSignsPointDto> TemperatureData { get; set; } = new();
    public List<VitalSignsPointDto> PulseData { get; set; } = new();
    public List<VitalSignsPointDto> BPData { get; set; } = new();
    public List<VitalSignsPointDto> SpO2Data { get; set; } = new();
}

/// <summary>
/// DTO điểm dữ liệu sinh tồn
/// </summary>
public class VitalSignsPointDto
{
    public DateTime Time { get; set; }
    public decimal? Value { get; set; }
    public decimal? Value2 { get; set; } // For BP (systolic/diastolic)
}

/// <summary>
/// DTO hội chẩn
/// </summary>
public class ConsultationDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public int ConsultationType { get; set; } // 1-Hội chẩn khoa, 2-Hội chẩn BV, 3-Thuốc dấu *, 4-PTTT
    public string ConsultationTypeName => ConsultationType switch
    {
        1 => "Hội chẩn khoa",
        2 => "Hội chẩn bệnh viện",
        3 => "Hội chẩn thuốc dấu *",
        4 => "Hội chẩn PTTT",
        _ => ""
    };

    public DateTime ConsultationDate { get; set; }
    public TimeSpan? ConsultationTime { get; set; }
    public string? Location { get; set; }

    public Guid ChairmanId { get; set; }
    public string ChairmanName { get; set; } = string.Empty;

    public Guid SecretaryId { get; set; }
    public string SecretaryName { get; set; } = string.Empty;

    public List<ConsultationMemberDto> Members { get; set; } = new();

    public string? Reason { get; set; }
    public string? ClinicalFindings { get; set; }
    public string? LabResults { get; set; }
    public string? ImageResults { get; set; }

    public string? Conclusion { get; set; }
    public string? Treatment { get; set; }

    public int Status { get; set; } // 0-Chờ, 1-Đang HC, 2-Hoàn thành

    // F1.4: Luồng duyệt lãnh đạo — chỉ áp dụng ConsultationType=3 (Thuốc dấu *)
    // ApprovalStatus: 0-Chưa yêu cầu, 1-Chờ duyệt, 2-Đã duyệt, 3-Từ chối
    public int ApprovalStatus { get; set; }
    public string ApprovalStatusName => ApprovalStatus switch
    {
        1 => "Chờ duyệt",
        2 => "Đã duyệt",
        3 => "Từ chối",
        _ => ""
    };
    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovalNote { get; set; }
}

/// <summary>
/// DTO thành viên hội chẩn
/// </summary>
public class ConsultationMemberDto
{
    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Department { get; set; }
    public string? Opinion { get; set; }
}

/// <summary>
/// DTO tạo hội chẩn
/// </summary>
public class CreateConsultationDto
{
    public Guid AdmissionId { get; set; }
    public int ConsultationType { get; set; }
    public DateTime ConsultationDate { get; set; }
    public TimeSpan? ConsultationTime { get; set; }
    public string? Location { get; set; }

    public Guid ChairmanId { get; set; }
    public Guid SecretaryId { get; set; }
    public List<Guid> MemberIds { get; set; } = new();

    public string? Reason { get; set; }
    public string? ClinicalFindings { get; set; }
}

/// <summary>
/// Request duyệt / từ chối hội chẩn thuốc dấu * (F1.4)
/// </summary>
public class ApproveConsultationRequest
{
    /// <summary>2 = Duyệt, 3 = Từ chối</summary>
    public int Decision { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO phiếu chăm sóc
/// </summary>
public class NursingCareSheetDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public DateTime CareDate { get; set; }

    public Guid NurseId { get; set; }
    public string NurseName { get; set; } = string.Empty;

    public int Shift { get; set; } // 1-Sáng, 2-Chiều, 3-Đêm
    public string ShiftName => Shift switch
    {
        1 => "Ca sáng",
        2 => "Ca chiều",
        3 => "Ca đêm",
        _ => ""
    };

    // Đánh giá BN
    public string? PatientCondition { get; set; }
    public string? Consciousness { get; set; }

    // Các hoạt động chăm sóc
    public string? HygieneActivities { get; set; }
    public string? MedicationActivities { get; set; }
    public string? NutritionActivities { get; set; }
    public string? MovementActivities { get; set; }

    // Theo dõi đặc biệt
    public string? SpecialMonitoring { get; set; }

    // Vấn đề phát sinh
    public string? IssuesAndActions { get; set; }

    // Ghi chú
    public string? Notes { get; set; }

    // Phân cấp chăm sóc: 1 = Cấp 1, 2 = Cấp 2, null = chưa phân cấp
    public int? CareLevel { get; set; }

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO tạo phiếu chăm sóc
/// </summary>
public class CreateNursingCareSheetDto
{
    public Guid AdmissionId { get; set; }
    public DateTime CareDate { get; set; }
    public int Shift { get; set; }

    public string? PatientCondition { get; set; }
    public string? Consciousness { get; set; }
    public string? HygieneActivities { get; set; }
    public string? MedicationActivities { get; set; }
    public string? NutritionActivities { get; set; }
    public string? MovementActivities { get; set; }
    public string? SpecialMonitoring { get; set; }
    public string? IssuesAndActions { get; set; }
    public string? Notes { get; set; }

    // Phân cấp chăm sóc: 1 = Cấp 1, 2 = Cấp 2
    public int? CareLevel { get; set; }
}

/// <summary>
/// DTO phiếu truyền dịch
/// </summary>
public class InfusionRecordDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public string FluidName { get; set; } = string.Empty;
    public int Volume { get; set; } // ml
    public int DropRate { get; set; } // giọt/phút

    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? DurationMinutes { get; set; }

    public string? Route { get; set; } // Đường truyền
    public string? AdditionalMedication { get; set; }

    public Guid StartedBy { get; set; }
    public string StartedByName { get; set; } = string.Empty;

    public string? Observations { get; set; }
    public string? Complications { get; set; }

    public int Status { get; set; } // 0-Đang truyền, 1-Hoàn thành, 2-Ngừng
}

/// <summary>
/// DTO tạo phiếu truyền dịch
/// </summary>
public class CreateInfusionRecordDto
{
    public Guid AdmissionId { get; set; }
    public string FluidName { get; set; } = string.Empty;
    public int Volume { get; set; }
    public int DropRate { get; set; }
    public DateTime StartTime { get; set; }
    public string? Route { get; set; }
    public string? AdditionalMedication { get; set; }
}

/// <summary>
/// DTO phiếu truyền máu
/// </summary>
public class BloodTransfusionDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public string BloodType { get; set; } = string.Empty; // Nhóm máu
    public string RhFactor { get; set; } = string.Empty;

    public string BloodProductType { get; set; } = string.Empty; // Loại chế phẩm
    public string BagNumber { get; set; } = string.Empty; // Số túi máu
    public int Volume { get; set; } // ml

    public DateTime TransfusionStart { get; set; }
    public DateTime? TransfusionEnd { get; set; }

    public Guid DoctorOrderId { get; set; }
    public string DoctorOrderName { get; set; } = string.Empty;

    public Guid? ExecutedBy { get; set; }
    public string? ExecutedByName { get; set; }

    // Theo dõi phản ứng
    public string? PreTransfusionVitals { get; set; }
    public string? DuringTransfusionVitals { get; set; }
    public string? PostTransfusionVitals { get; set; }

    public bool HasReaction { get; set; }
    public string? ReactionDetails { get; set; }

    public int Status { get; set; }
}

/// <summary>
/// DTO tạo phiếu truyền máu
/// </summary>
public class CreateBloodTransfusionDto
{
    public Guid AdmissionId { get; set; }
    public string BloodType { get; set; } = string.Empty;
    public string RhFactor { get; set; } = string.Empty;
    public string BloodProductType { get; set; } = string.Empty;
    public string BagNumber { get; set; } = string.Empty;
    public int Volume { get; set; }
    public DateTime TransfusionStart { get; set; }
}

/// <summary>
/// DTO phản ứng thuốc
/// </summary>
public class DrugReactionRecordDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public Guid? MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;

    public DateTime ReactionTime { get; set; }
    public int Severity { get; set; } // 1-Nhẹ, 2-Vừa, 3-Nặng
    public string SeverityName => Severity switch
    {
        1 => "Nhẹ",
        2 => "Vừa",
        3 => "Nặng",
        _ => ""
    };

    public string Symptoms { get; set; } = string.Empty;
    public string? Treatment { get; set; }
    public string? Outcome { get; set; }

    public Guid ReportedBy { get; set; }
    public string ReportedByName { get; set; } = string.Empty;
}

/// <summary>
/// DTO tai nạn thương tích
/// </summary>
public class InjuryRecordDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public int InjuryType { get; set; }
    public string InjuryTypeName => InjuryType switch
    {
        1 => "Tai nạn giao thông",
        2 => "Tai nạn lao động",
        3 => "Tai nạn sinh hoạt",
        4 => "Bạo lực",
        5 => "Tự gây",
        6 => "Khác",
        _ => ""
    };

    public DateTime InjuryTime { get; set; }
    public string? InjuryLocation { get; set; }

    public string? InjuryDescription { get; set; }
    public string? AffectedParts { get; set; }

    public bool InvolvedAlcohol { get; set; }
    public bool InvolvedDrugs { get; set; }

    public string? PoliceReportNumber { get; set; }
}

/// <summary>
/// DTO hồ sơ trẻ sơ sinh
/// </summary>
public class NewbornRecordDto
{
    public Guid Id { get; set; }
    public Guid MotherAdmissionId { get; set; }

    public DateTime BirthDate { get; set; }
    public TimeSpan BirthTime { get; set; }
    public int Gender { get; set; }

    public decimal BirthWeight { get; set; } // gram
    public decimal BirthLength { get; set; } // cm
    public decimal HeadCircumference { get; set; } // cm

    public int ApgarScore1Min { get; set; }
    public int ApgarScore5Min { get; set; }
    public int? ApgarScore10Min { get; set; }

    public string? DeliveryMethod { get; set; }
    public string? Complications { get; set; }

    public string? InitialExamFindings { get; set; }
    public string? VitaminKGiven { get; set; }
    public string? HepBVaccine { get; set; }

    public Guid? NewbornAdmissionId { get; set; }

    // Vong doi
    public int Status { get; set; } // 0=Dang theo doi, 2=Da xuat
    public DateTime? DischargeDate { get; set; }
}

/// <summary>
/// DTO phiếu theo dõi buổi chạy thận nhân tạo (#148)
/// </summary>
public class HemodialysisSessionDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public DateTime SessionDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int SessionNumber { get; set; }

    public decimal WeightPre { get; set; }  // kg
    public decimal WeightPost { get; set; } // kg

    public int Pulse { get; set; }
    public string? BloodPressureLying { get; set; }
    public string? BloodPressureStanding { get; set; }
    public decimal Temperature { get; set; }
    public int RespiratoryRate { get; set; }

    public int BloodFlowRate { get; set; }
    public int? ArterialPressure { get; set; }
    public int? VenousPressure { get; set; }
    public decimal Tmp { get; set; }
    public decimal ReplacementFluid { get; set; }
    public string? DialyzerType { get; set; }

    public string? Medications { get; set; }
    public string? Complications { get; set; }
    public string? Notes { get; set; }
}


