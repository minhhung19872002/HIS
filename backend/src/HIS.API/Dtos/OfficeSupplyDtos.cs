using System.Security.Claims;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.OfficeSupply;

    public class OfficeRequestItemDto
    {
        public Guid SupplyId { get; set; }
        public decimal RequestedQuantity { get; set; }
        public string? Unit { get; set; }
        public decimal UnitPrice { get; set; }
        public string? Note { get; set; }
    }

    public class CreateOfficeRequestDto
    {
        public Guid DepartmentId { get; set; }
        public Guid WarehouseId { get; set; }
        public List<OfficeRequestItemDto> Items { get; set; } = new();
        public string? Note { get; set; }
    }

    public class ApproveOfficeDto
    {
        public Guid Id { get; set; }
        /// <summary>SupplyApprovalItemId → quantity approved; if omitted, approves RequestedQuantity</summary>
        public Dictionary<Guid, decimal>? ApprovedQuantities { get; set; }
        public string? Note { get; set; }
    }

    public class CreateReturnDto
    {
        public Guid DepartmentId { get; set; }
        public Guid WarehouseId { get; set; }
        public List<OfficeRequestItemDto> Items { get; set; } = new();
        public string? Note { get; set; }
    }

    public class ApproveReturnDto
    {
        public Guid Id { get; set; }
        public Dictionary<Guid, decimal>? ApprovedQuantities { get; set; }
        public string? Note { get; set; }
    }

