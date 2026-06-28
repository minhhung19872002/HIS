using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Filters;
using HIS.Application.Services;
using HIS.Application.DTOs.Radiology;
using HIS.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using HIS.API.Controllers;

namespace HIS.API.Dtos.RISComplete;

// USB Token Sign Request DTO
public class USBTokenSignRequest
{
    public string? ReportId { get; set; }
    public string? CertificateThumbprint { get; set; }
    public string? DataToSign { get; set; }
}

// PDF Generation and Sign Request DTO
public class GenerateSignPdfRequest
{
    // Patient info
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }

    // Request info
    public string? RequestCode { get; set; }
    public string? RequestDate { get; set; }
    public string? DepartmentName { get; set; }
    public string? RequestingDoctorName { get; set; }
    public string? Diagnosis { get; set; }
    public string? ClinicalInfo { get; set; }

    // Service info
    public string? ServiceCode { get; set; }
    public string? ServiceName { get; set; }
    public string? ServiceType { get; set; }

    // Result info
    public string? ResultDate { get; set; }
    public string? Description { get; set; }
    public string? Conclusion { get; set; }
    public string? Recommendation { get; set; }
    public string? TechnicianName { get; set; }
    public string? DoctorName { get; set; }

    // Hospital info
    public string? HospitalName { get; set; }
    public string? HospitalAddress { get; set; }
    public string? HospitalPhone { get; set; }

    // Attached images
    public List<AttachedImageRequest>? AttachedImages { get; set; }

    // Certificate for signing
    public string? CertificateThumbprint { get; set; }
}

public class AttachedImageRequest
{
    public string? FileName { get; set; }
    public string? Base64Data { get; set; }
    public string? Description { get; set; }
}

    public class LinkStudyRequest
    {
        public string StudyInstanceUID { get; set; }
    }

    public class ApproveRequest
    {
        public string Note { get; set; }
    }

    public class RISCancelApprovalRequest
    {
        public string Reason { get; set; }
    }

    public class BulkDicomExportRequest
    {
        /// <summary>Danh sách studyId (tối đa 50)</summary>
        public List<string> StudyIds { get; set; } = new();

        /// <summary>
        /// Nếu true: gọi Orthanc POST /studies/{id}/anonymize để loại bỏ PHI thật trong DICOM tag (0010,xxxx),
        /// archive bản đã ẩn danh, rồi DELETE bản copy tạm. PACS phải khả dụng; study không anonymize được sẽ bị skip.
        /// </summary>
        public bool Anonymize { get; set; }
    }

    /// <summary>Request duyệt hàng loạt kết quả CĐHA (Issue #144)</summary>
    public class BulkApproveRequest
    {
        /// <summary>Danh sách resultId cần duyệt (tối đa 100)</summary>
        public List<Guid> ResultIds { get; set; } = new();

        /// <summary>Ghi chú duyệt (tuỳ chọn — áp cho tất cả entry)</summary>
        public string? Note { get; set; }
    }

