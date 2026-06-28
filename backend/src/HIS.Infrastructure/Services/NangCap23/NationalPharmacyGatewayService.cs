using System.Text.Json;
using System.Text;
using HIS.Application.DTOs.NangCap23;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;
// ============================================================================
// Batch 1.2: National Pharmacy Gateway (duocquocgia.com.vn)
// ============================================================================

public class NationalPharmacyGatewayService : INationalPharmacyGatewayService
{
    private const string EntityLabel = "Báo cáo Dược QG";
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly INationalPharmacyGatewayClient _client;
    private readonly ILogger<NationalPharmacyGatewayService> _logger;

    public NationalPharmacyGatewayService(
        HISDbContext db, IConfiguration config,
        INationalPharmacyGatewayClient client,
        ILogger<NationalPharmacyGatewayService> logger)
    {
        _db = db; _config = config; _client = client; _logger = logger;
    }

    private static string StatusName(int s) => s switch
    {
        0 => "Nháp",
        1 => "Đã gửi",
        2 => "Cổng QG xác nhận",
        3 => "Bị từ chối",
        _ => "Khác"
    };

    public async Task<List<NationalPharmacyOutboundReportDto>> SearchAsync(string? reportType, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.NationalPharmacyOutboundReports.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(reportType)) q = q.Where(x => x.ReportType == reportType);
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.PeriodFrom >= from.Value);
        if (to.HasValue) q = q.Where(x => x.PeriodTo <= to.Value);

        return await q.OrderByDescending(x => x.CreatedAt)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .Select(r => new NationalPharmacyOutboundReportDto
            {
                Id = r.Id,
                ReportCode = r.ReportCode,
                ReportType = r.ReportType,
                PeriodFrom = r.PeriodFrom,
                PeriodTo = r.PeriodTo,
                ItemCount = r.ItemCount,
                Status = r.Status,
                StatusName = StatusName(r.Status),
                GatewayTicketNumber = r.GatewayTicketNumber,
                ErrorCode = r.ErrorCode,
                ErrorMessage = r.ErrorMessage,
                SubmittedAt = r.SubmittedAt,
                AcknowledgedAt = r.AcknowledgedAt,
                RetryCount = r.RetryCount,
                CreatedAt = r.CreatedAt,
                Notes = r.Notes
            })
            .ToListAsync();
    }

    public async Task<NationalPharmacyOutboundReportDetailDto?> GetByIdAsync(Guid id)
    {
        var r = await _db.NationalPharmacyOutboundReports.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        return new NationalPharmacyOutboundReportDetailDto
        {
            Id = r.Id,
            ReportCode = r.ReportCode,
            ReportType = r.ReportType,
            PeriodFrom = r.PeriodFrom,
            PeriodTo = r.PeriodTo,
            ItemCount = r.ItemCount,
            Status = r.Status,
            StatusName = StatusName(r.Status),
            GatewayTicketNumber = r.GatewayTicketNumber,
            ErrorCode = r.ErrorCode,
            ErrorMessage = r.ErrorMessage,
            SubmittedAt = r.SubmittedAt,
            AcknowledgedAt = r.AcknowledgedAt,
            RetryCount = r.RetryCount,
            CreatedAt = r.CreatedAt,
            Notes = r.Notes,
            PayloadXml = r.PayloadXml,
            ResponseXml = r.ResponseXml
        };
    }

    public async Task<NationalPharmacyOutboundReportDto> GenerateAndSubmitAsync(GeneratePharmacyReportDto dto, string? userId)
    {
        // Validation
        var allowed = new[] { "DailySale", "MonthlyInventory", "NarcoticReport", "Recall" };
        if (!allowed.Contains(dto.ReportType))
            throw new ArgumentException($"ReportType phải thuộc {string.Join("/", allowed)}.", nameof(dto));
        if (dto.PeriodFrom > dto.PeriodTo)
            throw new ArgumentException("PeriodFrom phải <= PeriodTo.", nameof(dto));
        if (dto.PeriodTo > DateTime.UtcNow.AddDays(1))
            throw new ArgumentException("PeriodTo không được vượt quá hôm nay.", nameof(dto));

        // Dedupe: cùng (ReportType, PeriodFrom, PeriodTo) đã có report Status=2 Acknowledged
        var dup = await _db.NationalPharmacyOutboundReports.AsNoTracking()
            .Where(x => x.ReportType == dto.ReportType
                     && x.PeriodFrom == dto.PeriodFrom
                     && x.PeriodTo == dto.PeriodTo
                     && x.Status == 2)
            .Select(x => x.ReportCode)
            .FirstOrDefaultAsync();
        if (dup != null)
            throw new InvalidOperationException(
                $"Báo cáo '{dto.ReportType}' giai đoạn {dto.PeriodFrom:yyyy-MM-dd}..{dto.PeriodTo:yyyy-MM-dd} đã được cổng QG xác nhận (mã {dup}). Không thể tạo lại.");

        var code = $"DQG-{dto.ReportType}-{DateTime.Now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";

        // Build XML payload per CV 2406/QLD-Ttra 2018 schema
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<DuocQuocGiaReport>");
        sb.AppendLine($"  <ReportCode>{code}</ReportCode>");
        sb.AppendLine($"  <FacilityCode>{_config["NationalGateway:FacilityCode"] ?? "BV-DEMO-01"}</FacilityCode>");
        sb.AppendLine($"  <ReportType>{dto.ReportType}</ReportType>");
        sb.AppendLine($"  <PeriodFrom>{dto.PeriodFrom:yyyy-MM-dd}</PeriodFrom>");
        sb.AppendLine($"  <PeriodTo>{dto.PeriodTo:yyyy-MM-dd}</PeriodTo>");

        // Pull data based on report type
        var items = new List<object>();
        if (dto.ReportType == "DailySale" || dto.ReportType == "MonthlyInventory")
        {
            // Gather pharmacy sales for period (use CreatedAt as transaction time)
            var sales = await _db.RetailSales.AsNoTracking()
                .Where(s => s.CreatedAt >= dto.PeriodFrom && s.CreatedAt <= dto.PeriodTo)
                .Include(s => s.Items)
                .ToListAsync();
            foreach (var s in sales)
            {
                foreach (var i in s.Items)
                {
                    items.Add(new
                    {
                        Code = (string?)null,
                        Name = i.MedicineName,
                        i.Quantity,
                        i.UnitPrice,
                        SaleDate = s.CreatedAt
                    });
                }
            }
        }

        sb.AppendLine($"  <ItemCount>{items.Count}</ItemCount>");
        sb.AppendLine("  <Items>");
        foreach (dynamic it in items)
        {
            sb.AppendLine($"    <Item code=\"{it.Code}\" name=\"{System.Net.WebUtility.HtmlEncode((string?)it.Name ?? "")}\" qty=\"{it.Quantity}\" price=\"{it.UnitPrice}\" date=\"{it.SaleDate:yyyy-MM-dd}\" />");
        }
        sb.AppendLine("  </Items>");
        sb.AppendLine("</DuocQuocGiaReport>");

        var entity = new NationalPharmacyOutboundReport
        {
            Id = Guid.NewGuid(),
            ReportCode = code,
            ReportType = dto.ReportType,
            PeriodFrom = dto.PeriodFrom,
            PeriodTo = dto.PeriodTo,
            PharmacyId = dto.PharmacyId,
            ItemCount = items.Count,
            PayloadXml = sb.ToString(),
            Status = 1,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            SubmittedAt = DateTime.UtcNow,
            Notes = dto.Notes
        };

        // PHASE 1: save row trước khi gọi gateway
        _db.NationalPharmacyOutboundReports.Add(entity);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException dux) when (NangCap23ServiceHelpers.IsUniqueViolation(dux))
        {
            throw new InvalidOperationException(
                $"Báo cáo Dược QG cho giai đoạn này đã được cổng xác nhận bởi một request khác. Vui lòng refresh danh sách.", dux);
        }

        // PHASE 2: gọi gateway (có thể block lâu, có thể bị cancel)
        var result = await _client.SubmitReportAsync(entity.PayloadXml, dto.ReportType);
        if (result.Acknowledged)
        {
            entity.Status = 2;
            entity.GatewayTicketNumber = result.TransactionId;
            entity.AcknowledgedAt = DateTime.UtcNow;
            entity.ResponseXml = result.RawResponse;
            _logger.LogInformation("Pharmacy QG ack: code={Code} ticket={Ticket}", code, result.TransactionId);
        }
        else
        {
            entity.Status = result.ErrorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN" ? 1 : 3;
            entity.ErrorCode = result.ErrorCode;
            entity.ErrorMessage = result.ErrorMessage;
            entity.ResponseXml = result.RawResponse;
            _logger.LogWarning("Pharmacy QG submit fail: code={Code} err={Err}", code, result.ErrorCode);
        }

        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (Exception ex) when (result.Acknowledged)
        {
            _logger.LogCritical(ex,
                "[NANGCAP23-ALERT] Gateway acknowledged pharmacy report {Code} (ticket={Ticket}) but DB final save FAILED. "
                + "Manual reconcile required for row {EntityId}.",
                code, result.TransactionId, entity.Id);
            throw;
        }

        return new NationalPharmacyOutboundReportDto
        {
            Id = entity.Id,
            ReportCode = entity.ReportCode,
            ReportType = entity.ReportType,
            PeriodFrom = entity.PeriodFrom,
            PeriodTo = entity.PeriodTo,
            ItemCount = entity.ItemCount,
            Status = entity.Status,
            StatusName = StatusName(entity.Status),
            GatewayTicketNumber = entity.GatewayTicketNumber,
            SubmittedAt = entity.SubmittedAt,
            AcknowledgedAt = entity.AcknowledgedAt,
            RetryCount = entity.RetryCount,
            CreatedAt = entity.CreatedAt,
            Notes = entity.Notes
        };
    }

    public async Task<NationalPharmacyOutboundReportDto?> RetryAsync(Guid id, string? userId)
    {
        var entity = await _db.NationalPharmacyOutboundReports.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        var maxRetries = _config.GetValue<int>("NationalGateway:RetryCount", 3);
        Nangcap23StateMachine.EnsureCanRetry(entity.Status, entity.RetryCount, maxRetries, EntityLabel);

        entity.RetryCount++;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        var result = await _client.SubmitReportAsync(entity.PayloadXml, entity.ReportType);
        if (result.Acknowledged)
        {
            entity.Status = 2;
            entity.AcknowledgedAt = DateTime.UtcNow;
            entity.GatewayTicketNumber = result.TransactionId;
            entity.ResponseXml = result.RawResponse;
            entity.ErrorCode = null;
            entity.ErrorMessage = null;
        }
        else
        {
            entity.Status = result.ErrorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN" ? 1 : 3;
            entity.ErrorCode = result.ErrorCode;
            entity.ErrorMessage = result.ErrorMessage;
            entity.ResponseXml = result.RawResponse;
        }
        await _db.SaveChangesAsync();

        var detail = await GetByIdAsync(id);
        return detail;
    }

    public Task<bool> TestConnectionAsync() => _client.PingAsync();
}

