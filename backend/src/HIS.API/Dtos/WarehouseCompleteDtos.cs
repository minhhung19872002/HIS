using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using System.Security.Claims;
using WarehouseDto = HIS.Application.DTOs.Warehouse.WarehouseDto;
using HIS.API.Controllers;

namespace HIS.API.Dtos.WarehouseComplete;

public class CreateStockTakeRequest
{
    public Guid WarehouseId { get; set; }
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }
}

public class SplitPackageRequest
{
    public Guid WarehouseId { get; set; }
    public Guid ItemId { get; set; }
    public decimal PackageQuantity { get; set; }
}

