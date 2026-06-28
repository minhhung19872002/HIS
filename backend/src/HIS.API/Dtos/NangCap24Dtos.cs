using System.Security.Claims;
using HIS.API.Filters;
using HIS.Application.DTOs.NangCap24;
using HIS.Application.Services;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Controllers;

namespace HIS.API.Dtos.NangCap24;

    public class ResetPwDto { public string NewPassword { get; set; } = string.Empty; }

    public class DemoEnqueueDto
    {
        public string? Direction { get; set; }
        public string? Source { get; set; }
        public string? Target { get; set; }
        public string? MessageType { get; set; }
        public string? Payload { get; set; }
        public string? Endpoint { get; set; }
    }

    public class LogDto
    {
        public string StudyInstanceUid { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public Guid? RadiologyRequestId { get; set; }
        public string? ActionDetails { get; set; }
        public string? MachineName { get; set; }
        public string? RelatedReportId { get; set; }
    }

