using System.Security.Claims;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.InpatientDispensing;

    public class BatchDispenseDto
    {
        public Guid WarehouseId { get; set; }
        public Guid DepartmentId { get; set; }
        public List<Guid> PrescriptionIds { get; set; } = new();
        public string? Note { get; set; }
    }

