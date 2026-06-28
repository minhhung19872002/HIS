using System.Security.Claims;
using HIS.Core.Constants;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.ServiceRefund;

    public class RequeueDto
    {
        public List<Guid> ServiceRequestDetailIds { get; set; } = new();
        public string Reason { get; set; } = string.Empty;
        public bool KeepAsPaid { get; set; } = true; // true = kế thừa đã TT, false = chờ TT lại
    }

