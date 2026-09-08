using System.Text.Json.Serialization;

namespace HIS.PatientApp.Api.Connector;

// ============================================================================
// Kết quả khám chữa bệnh ngoại trú (HSMT I.2 #5)
//
// Các lớp này chỉ chuyển tiếp hình dạng DTO của HIS. Cố ý KHÔNG đổi tên trường: mỗi lần đổi tên là
// một chỗ nữa để hai bên lệch nhau mà không ai biết cho tới khi người bệnh nhìn thấy ô trống.
// ============================================================================

public class HisVisitSummary
{
    [JsonPropertyName("visitId")] public Guid VisitId { get; set; }
    [JsonPropertyName("visitDate")] public DateTime VisitDate { get; set; }
    [JsonPropertyName("visitType")] public string? VisitType { get; set; }
    [JsonPropertyName("department")] public string? Department { get; set; }
    [JsonPropertyName("doctorName")] public string? DoctorName { get; set; }
    [JsonPropertyName("diagnosis")] public string? Diagnosis { get; set; }
    [JsonPropertyName("summary")] public string? Summary { get; set; }
}

public class HisLabTestItem
{
    [JsonPropertyName("testName")] public string? TestName { get; set; }
    [JsonPropertyName("result")] public string? Result { get; set; }
    [JsonPropertyName("unit")] public string? Unit { get; set; }
    [JsonPropertyName("normalRange")] public string? NormalRange { get; set; }
    [JsonPropertyName("flag")] public string? Flag { get; set; }
    [JsonPropertyName("interpretation")] public string? Interpretation { get; set; }
}

public class HisLabResult
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("orderCode")] public string? OrderCode { get; set; }
    [JsonPropertyName("orderDate")] public DateTime OrderDate { get; set; }
    [JsonPropertyName("resultDate")] public DateTime? ResultDate { get; set; }
    [JsonPropertyName("orderingDoctor")] public string? OrderingDoctor { get; set; }
    [JsonPropertyName("department")] public string? Department { get; set; }
    [JsonPropertyName("testCategory")] public string? TestCategory { get; set; }
    [JsonPropertyName("serviceName")] public string? ServiceName { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
    [JsonPropertyName("hasAbnormal")] public bool HasAbnormal { get; set; }
    [JsonPropertyName("visitId")] public Guid? VisitId { get; set; }
    [JsonPropertyName("reportUrl")] public string? ReportUrl { get; set; }
    [JsonPropertyName("testItems")] public List<HisLabTestItem> TestItems { get; set; } = new();
}

public class HisImagingResult
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("orderCode")] public string? OrderCode { get; set; }
    [JsonPropertyName("orderDate")] public DateTime OrderDate { get; set; }
    [JsonPropertyName("studyDate")] public DateTime? StudyDate { get; set; }
    [JsonPropertyName("orderingDoctor")] public string? OrderingDoctor { get; set; }
    [JsonPropertyName("modality")] public string? Modality { get; set; }
    [JsonPropertyName("bodyPart")] public string? BodyPart { get; set; }
    [JsonPropertyName("studyDescription")] public string? StudyDescription { get; set; }
    [JsonPropertyName("findings")] public string? Findings { get; set; }
    [JsonPropertyName("impression")] public string? Impression { get; set; }
    [JsonPropertyName("recommendations")] public string? Recommendations { get; set; }
    [JsonPropertyName("reportingDoctor")] public string? ReportingDoctor { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
    [JsonPropertyName("hasImages")] public bool HasImages { get; set; }
    [JsonPropertyName("imageCount")] public int ImageCount { get; set; }
    [JsonPropertyName("visitId")] public Guid? VisitId { get; set; }
}

public class HisImagingInstance
{
    [JsonPropertyName("instanceId")] public string InstanceId { get; set; } = string.Empty;
    [JsonPropertyName("seriesInstanceUid")] public string? SeriesInstanceUid { get; set; }
    [JsonPropertyName("seriesNumber")] public int SeriesNumber { get; set; }
    [JsonPropertyName("instanceNumber")] public int InstanceNumber { get; set; }
    [JsonPropertyName("seriesDescription")] public string? SeriesDescription { get; set; }
}

public class HisFunctionalMeasurement
{
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("value")] public string? Value { get; set; }
}

public class HisFunctionalResult
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("testCode")] public string? TestCode { get; set; }
    [JsonPropertyName("testType")] public string? TestType { get; set; }
    [JsonPropertyName("testTypeName")] public string? TestTypeName { get; set; }
    [JsonPropertyName("performedAt")] public DateTime? PerformedAt { get; set; }
    [JsonPropertyName("performingDoctorName")] public string? PerformingDoctorName { get; set; }
    [JsonPropertyName("deviceName")] public string? DeviceName { get; set; }
    [JsonPropertyName("clinicalIndication")] public string? ClinicalIndication { get; set; }
    [JsonPropertyName("findings")] public string? Findings { get; set; }
    [JsonPropertyName("conclusion")] public string? Conclusion { get; set; }
    [JsonPropertyName("recommendation")] public string? Recommendation { get; set; }
    [JsonPropertyName("measurements")] public List<HisFunctionalMeasurement> Measurements { get; set; } = new();
    [JsonPropertyName("imageCount")] public int ImageCount { get; set; }
    [JsonPropertyName("status")] public int Status { get; set; }
    [JsonPropertyName("statusName")] public string? StatusName { get; set; }
    [JsonPropertyName("visitId")] public Guid? VisitId { get; set; }
}

public class HisHealthCheckup
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("recordCode")] public string? RecordCode { get; set; }
    [JsonPropertyName("campaignName")] public string? CampaignName { get; set; }
    [JsonPropertyName("companyName")] public string? CompanyName { get; set; }
    [JsonPropertyName("checkupDate")] public DateTime? CheckupDate { get; set; }
    [JsonPropertyName("healthClassification")] public string? HealthClassification { get; set; }
    [JsonPropertyName("conclusion")] public string? Conclusion { get; set; }
    [JsonPropertyName("recommendation")] public string? Recommendation { get; set; }
    [JsonPropertyName("certificateIssued")] public bool CertificateIssued { get; set; }
    [JsonPropertyName("certificateNumber")] public string? CertificateNumber { get; set; }
}

public class HisPrescriptionItem
{
    [JsonPropertyName("drugName")] public string? DrugName { get; set; }
    [JsonPropertyName("strength")] public string? Strength { get; set; }
    [JsonPropertyName("quantity")] public decimal Quantity { get; set; }
    [JsonPropertyName("unit")] public string? Unit { get; set; }
    [JsonPropertyName("dosage")] public string? Dosage { get; set; }
    [JsonPropertyName("frequency")] public string? Frequency { get; set; }
    [JsonPropertyName("durationDays")] public int DurationDays { get; set; }
    [JsonPropertyName("instructions")] public string? Instructions { get; set; }
}

public class HisPrescription
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("prescriptionCode")] public string? PrescriptionCode { get; set; }
    [JsonPropertyName("prescriptionDate")] public DateTime PrescriptionDate { get; set; }
    [JsonPropertyName("visitId")] public Guid VisitId { get; set; }
    [JsonPropertyName("doctorName")] public string? DoctorName { get; set; }
    [JsonPropertyName("departmentName")] public string? DepartmentName { get; set; }
    [JsonPropertyName("diagnosis")] public string? Diagnosis { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
    [JsonPropertyName("isDispensed")] public bool IsDispensed { get; set; }
    [JsonPropertyName("dispensedAt")] public DateTime? DispensedAt { get; set; }
    [JsonPropertyName("items")] public List<HisPrescriptionItem> Items { get; set; } = new();
}

/// <summary>Ảnh đã dựng của một instance PACS, kèm kiểu nội dung để trả nguyên vẹn cho app.</summary>
public record HisImageBytes(byte[] Content, string ContentType);
