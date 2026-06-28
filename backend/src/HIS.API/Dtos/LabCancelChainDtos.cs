using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.LabCancelChain;

    // Giữ tên field cũ cho tương thích, NHƯNG nay là id của ServiceRequestDetail/ServiceRequest (model 1).
    public record CancelRequest(Guid ServiceRequestDetailId, string Reason);

    public record CancelResponse(bool Success, int NewStatus, string NewStatusLabel, string Message);

