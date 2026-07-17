namespace HIS.Infrastructure.Services;

public class RadiologyReportData
{
    // Thông tin bệnh nhân
    public string PatientCode { get; set; } = "";
    public string PatientName { get; set; } = "";
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }

    // Thông tin phiếu yêu cầu
    public string RequestCode { get; set; } = "";
    public string RequestDate { get; set; } = "";
    public string? DepartmentName { get; set; }
    public string? RequestingDoctorName { get; set; }
    public string? Diagnosis { get; set; }
    public string? ClinicalInfo { get; set; }

    // Thông tin dịch vụ
    public string ServiceCode { get; set; } = "";
    public string ServiceName { get; set; } = "";
    public string? ServiceType { get; set; }

    // Kết quả
    public string ResultDate { get; set; } = "";
    public string? Description { get; set; }
    public string? Conclusion { get; set; }
    public string? Recommendation { get; set; }
    public string? TechnicianName { get; set; }
    public string? DoctorName { get; set; }

    // Hình ảnh đính kèm (Base64)
    public List<AttachedImageData> AttachedImages { get; set; } = new();

    // Thông tin cơ sở y tế
    public string HospitalName { get; set; } = "BỆNH VIỆN";
    public string? HospitalAddress { get; set; }
    public string? HospitalPhone { get; set; }
}
