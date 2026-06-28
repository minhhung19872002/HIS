using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;
using HIS.API.Dtos.Pharmacy;

namespace HIS.API.Controllers;

public partial class PharmacyController
{
    // ==================== 4. Alerts ====================

    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts([FromQuery] bool? acknowledged = null)
    {
        try
        {
            var alerts = new List<object>();

            // Expiry alerts
            var expiryQuery = _context.ExpiryAlerts
                .AsNoTracking()
                .Include(a => a.Medicine)
                .Where(a => !a.IsDeleted);

            if (acknowledged.HasValue)
                expiryQuery = acknowledged.Value
                    ? expiryQuery.Where(a => a.Status >= 1)
                    : expiryQuery.Where(a => a.Status == 0);

            var expiryAlerts = await expiryQuery
                .OrderByDescending(a => a.CreatedAt)
                .Take(50)
                .ToListAsync();

            foreach (var ea in expiryAlerts)
            {
                string severity = ea.AlertLevel switch { 1 => "high", 2 => "medium", _ => "low" };
                alerts.Add(new
                {
                    id = ea.Id.ToString(),
                    type = "expiry",
                    severity,
                    medicationName = ea.Medicine?.MedicineName ?? "",
                    message = $"Thuốc sắp hết hạn ngày {ea.ExpiryDate:dd/MM/yyyy}, lô {ea.BatchNumber}, SL: {ea.Quantity}",
                    createdDate = ea.CreatedAt,
                    acknowledged = ea.Status >= 1,
                });
            }

            // Low stock alerts
            var lowStockQuery = _context.LowStockAlerts
                .AsNoTracking()
                .Include(a => a.Medicine)
                .Where(a => !a.IsDeleted);

            if (acknowledged.HasValue)
                lowStockQuery = acknowledged.Value
                    ? lowStockQuery.Where(a => a.Status >= 1)
                    : lowStockQuery.Where(a => a.Status == 0);

            var lowStockAlerts = await lowStockQuery
                .OrderByDescending(a => a.CreatedAt)
                .Take(50)
                .ToListAsync();

            foreach (var la in lowStockAlerts)
            {
                string severity = la.AlertLevel switch { 1 => "high", 2 => "medium", _ => "low" };
                alerts.Add(new
                {
                    id = la.Id.ToString(),
                    type = la.CurrentQuantity <= 0 ? "out_of_stock" : "low_stock",
                    severity,
                    medicationName = la.Medicine?.MedicineName ?? "",
                    message = $"Tồn kho: {la.CurrentQuantity}, Tồn tối thiểu: {la.MinimumQuantity}",
                    createdDate = la.CreatedAt,
                    acknowledged = la.Status >= 1,
                });
            }

            return Ok(alerts.OrderByDescending(a => ((dynamic)a).createdDate).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching alerts");
            return Ok(Array.Empty<object>());
        }
    }

    [HttpPost("alerts/{alertId}/acknowledge")]
    public async Task<IActionResult> AcknowledgeAlert(Guid alertId)
    {
        try
        {
            // Try expiry alert first
            var expiryAlert = await _context.ExpiryAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

            if (expiryAlert != null)
            {
                expiryAlert.Status = 1;
                expiryAlert.AcknowledgedAt = DateTime.UtcNow;
                expiryAlert.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(true);
            }

            // Try low stock alert
            var lowStockAlert = await _context.LowStockAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

            if (lowStockAlert != null)
            {
                lowStockAlert.Status = 1;
                lowStockAlert.AcknowledgedAt = DateTime.UtcNow;
                lowStockAlert.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(true);
            }

            return NotFound(new { message = "Không tìm thấy cảnh báo" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error acknowledging alert {Id}", alertId);
            return StatusCode(500, new { message = "Lỗi khi xác nhận cảnh báo" });
        }
    }

    [HttpPost("alerts/{alertId}/resolve")]
    public async Task<IActionResult> ResolveAlert(Guid alertId)
    {
        try
        {
            var expiryAlert = await _context.ExpiryAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

            if (expiryAlert != null)
            {
                expiryAlert.Status = 2;
                expiryAlert.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(true);
            }

            var lowStockAlert = await _context.LowStockAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

            if (lowStockAlert != null)
            {
                lowStockAlert.Status = 3;
                lowStockAlert.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(true);
            }

            return NotFound(new { message = "Không tìm thấy cảnh báo" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving alert {Id}", alertId);
            return StatusCode(500, new { message = "Lỗi khi xử lý cảnh báo" });
        }
    }
}
