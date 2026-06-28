using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.StockLedgerReport;

    public record StockLedgerLineDto(
        DateTime Date, string ItemCode, string ItemName, string? Unit,
        decimal InQty, decimal OutQty, decimal UnitPrice, string RefCode, string RefType);

