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

public record StoreSampleRequest(Guid SampleId, string Location);

public record RetrieveSampleRequest(Guid SampleId);

public record RejectSampleRequest(Guid SampleId, string Reason);

public record UndoRejectRequest(Guid SampleId);

public record RejectInboxRequest(string? Reason);

