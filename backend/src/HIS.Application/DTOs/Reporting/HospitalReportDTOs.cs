using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Reporting
{
    /// <summary>
    /// Hospital Report DTOs - Generic report data structure for 140 reports
    /// </summary>

    /// <summary>
    /// Generic report result returned by HospitalReportService
    /// </summary>
    public class HospitalReportResult
    {
        public string ReportName { get; set; } = string.Empty;
        public string ReportCode { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; } = DateTime.Now;
        public HospitalReportParameters Parameters { get; set; } = new();
        public List<Dictionary<string, object>> Data { get; set; } = new();
        public Dictionary<string, object> Summary { get; set; } = new();
    }

    /// <summary>
    /// Parameters echo in report result
    /// </summary>
    public class HospitalReportParameters
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public Guid? DepartmentId { get; set; }
        public Guid? WarehouseId { get; set; }
    }

    /// <summary>
    /// Birth Certificate DTO - Giay khai sinh
    /// </summary>
    public class BirthCertificateDto
    {
        // Baby information
        public string BabyFullName { get; set; } = string.Empty;
        public int BabyGender { get; set; } // 1=Male, 2=Female
        public DateTime BabyDateOfBirth { get; set; }
        public string BabyTimeOfBirth { get; set; } = string.Empty; // HH:mm
        public string BabyPlaceOfBirth { get; set; } = string.Empty;
        public decimal? BabyWeight { get; set; } // grams
        public decimal? BabyHeight { get; set; } // cm
        public string? BabyEthnicName { get; set; }
        public string? BabyNationalityName { get; set; }

        // Mother information
        public string MotherFullName { get; set; } = string.Empty;
        public DateTime? MotherDateOfBirth { get; set; }
        public int? MotherYearOfBirth { get; set; }
        public string? MotherIdentityNumber { get; set; }
        public string? MotherNationalityName { get; set; }
        public string? MotherEthnicName { get; set; }
        public string? MotherAddress { get; set; }
        public string? MotherOccupation { get; set; }
        public string? MotherPhoneNumber { get; set; }
        public Guid? MotherPatientId { get; set; }

        // Father information
        public string? FatherFullName { get; set; }
        public DateTime? FatherDateOfBirth { get; set; }
        public int? FatherYearOfBirth { get; set; }
        public string? FatherIdentityNumber { get; set; }
        public string? FatherNationalityName { get; set; }
        public string? FatherEthnicName { get; set; }
        public string? FatherAddress { get; set; }
        public string? FatherOccupation { get; set; }

        // Delivery information
        public string? DeliveryMethod { get; set; }
        public int? GestationalWeeks { get; set; }
        public int? ApgarScore1Min { get; set; }
        public int? ApgarScore5Min { get; set; }
        public string? DeliveryDoctor { get; set; }
        public string? DeliveryMidwife { get; set; }
        public string? DeliveryNotes { get; set; }
        public int? NumberInOrder { get; set; }
        public bool? IsMultipleBirth { get; set; }
        public int? MultipleBirthOrder { get; set; }

        // Medical record reference
        public Guid? MedicalRecordId { get; set; }
        public string? MedicalRecordCode { get; set; }
        public Guid? ExaminationId { get; set; }

        // Administrative
        public string? CertificateNumber { get; set; }
        public DateTime? IssuedDate { get; set; }
        public string? IssuedBy { get; set; }
    }
}
