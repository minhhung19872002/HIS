using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs.Laboratory;
using ApproveLabResultDto = HIS.Application.Services.ApproveLabResultDto;
using HIS.API.Controllers;

namespace HIS.API.Dtos.LISComplete;

    public class CancelSampleRequest
    {
        public string Reason { get; set; }
    }

    public class PreliminaryApproveRequest
    {
        public string TechnicianNote { get; set; }
    }

    public class FinalApproveRequest
    {
        public string DoctorNote { get; set; }
    }

    public class LISCancelApprovalRequest
    {
        public string Reason { get; set; }
    }

    public class RerunRequest
    {
        public string Reason { get; set; }
    }

    public class ProcessResultRequest
    {
        public string RawData { get; set; }
    }

// Wave-2: accept both the legacy {sampleId, location/reason} body and the v2 FE body
// ({sampleBarcode, storageLocation, ...} / {sampleBarcode, labRequestId, rejectionCode, rejectionReason, notes}).
// The old positional records made every v2 call a 400 (SampleId required / Location required).
public class StoreSampleRequest
{
    public Guid? SampleId { get; set; }
    public string? SampleBarcode { get; set; }
    public string? Location { get; set; }
    public string? StorageLocation { get; set; }
    public string? StorageCondition { get; set; }
    public decimal? Temperature { get; set; }
    public string? Notes { get; set; }
}

public class RetrieveSampleRequest
{
    public Guid? SampleId { get; set; }
    public string? Reason { get; set; }
}

public class RejectSampleRequest
{
    public Guid? SampleId { get; set; }
    public string? SampleBarcode { get; set; }
    /// <summary>ServiceRequest id OR request code (the v2 form field is free text "Mã yêu cầu XN").</summary>
    public string? LabRequestId { get; set; }
    public string? RejectionCode { get; set; }
    public string? RejectionReason { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
}

public class UndoRejectRequest
{
    public Guid? SampleId { get; set; }
    public string? Reason { get; set; }
}

public record RejectInboxRequest(string? Reason);

