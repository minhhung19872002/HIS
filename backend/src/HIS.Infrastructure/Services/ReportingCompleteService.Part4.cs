using System.Text.Json;
using HIS.Application.Common;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class ReportingCompleteService
{

    public async Task<UserStatisticsReportDto> GetUserStatisticsReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            // CreatedAt / AuditLogs.Timestamp are UTC; toDate is date-only "through that day".
            var fromUtc = ReportPeriod.ToUtc(fromDate);
            var toUtc = ReportPeriod.ToUtc(ReportPeriod.EndExclusive(toDate));
            var users = await _context.Users.Where(u => !u.IsDeleted).ToListAsync();

            var totalUsers = users.Count;
            var activeUsers = users.Count(u => u.IsActive);
            var inactiveUsers = totalUsers - activeUsers;
            var newThisMonth = users.Count(u => u.CreatedAt >= fromUtc && u.CreatedAt < toUtc);

            var byDept = await _context.Users
                .Where(u => !u.IsDeleted && u.DepartmentId != null)
                .GroupBy(u => u.Department!.DepartmentName)
                .Select(g => new UserByDepartmentDto { DepartmentName = g.Key, UserCount = g.Count() })
                .OrderByDescending(d => d.UserCount)
                .ToListAsync();

            var byRole = await _context.UserRoles
                .Where(ur => !ur.IsDeleted)
                .GroupBy(ur => ur.Role.RoleName)
                .Select(g => new UserByRoleDto { RoleName = g.Key, UserCount = g.Count() })
                .OrderByDescending(r => r.UserCount)
                .ToListAsync();

            // Top active users from audit logs
            var topActive = await _context.AuditLogs
                .Where(a => a.Timestamp >= fromUtc && a.Timestamp < toUtc && a.Username != null)
                .GroupBy(a => new { a.Username, a.UserFullName })
                .Select(g => new UserActivityDto
                {
                    UserName = g.Key.Username ?? "",
                    FullName = g.Key.UserFullName ?? "",
                    ActionCount = g.Count(),
                    LoginCount = g.Count(a => a.Action == "Login"),
                    LastLoginTime = g.Max(a => a.Timestamp)
                })
                .OrderByDescending(u => u.ActionCount)
                .Take(10)
                .ToListAsync();

            return new UserStatisticsReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                InactiveUsers = inactiveUsers,
                NewUsersThisMonth = newThisMonth,
                ByDepartment = byDept,
                ByRole = byRole,
                TopActiveUsers = topActive
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "User statistics report failed");
            return new UserStatisticsReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                ByDepartment = new List<UserByDepartmentDto>(),
                ByRole = new List<UserByRoleDto>(),
                TopActiveUsers = new List<UserActivityDto>()
            };
        }
    }

    public async Task<AuditLogReportDto> GetAuditLogReportAsync(DateTime fromDate, DateTime toDate, string? module = null, string? userName = null)
    {
        try
        {
            var fromUtc = ReportPeriod.ToUtc(fromDate);
            var toUtc = ReportPeriod.ToUtc(ReportPeriod.EndExclusive(toDate));
            var query = _context.AuditLogs
                .Where(a => a.Timestamp >= fromUtc && a.Timestamp < toUtc);

            if (!string.IsNullOrEmpty(module))
                query = query.Where(a => a.Module == module);
            if (!string.IsNullOrEmpty(userName))
                query = query.Where(a => a.Username != null && a.Username.Contains(userName));

            var totalLogs = await query.CountAsync();

            var logs = await query
                .OrderByDescending(a => a.Timestamp)
                .Take(500)
                .Select(a => new AuditLogItemDto
                {
                    Id = a.Id,
                    Timestamp = a.Timestamp,
                    UserName = a.Username ?? "",
                    Action = a.Action,
                    Module = a.Module ?? "",
                    EntityType = a.EntityType ?? a.TableName,
                    EntityId = a.EntityId ?? a.RecordId.ToString(),
                    OldValues = a.OldValues,
                    NewValues = a.NewValues,
                    IpAddress = a.IpAddress ?? ""
                })
                .ToListAsync();

            var byAction = await query
                .GroupBy(a => a.Action)
                .Select(g => new AuditByActionDto { Action = g.Key, Count = g.Count() })
                .OrderByDescending(a => a.Count)
                .ToListAsync();

            var byModule = await query
                .Where(a => a.Module != null)
                .GroupBy(a => a.Module!)
                .Select(g => new AuditByModuleDto { Module = g.Key, Count = g.Count() })
                .OrderByDescending(m => m.Count)
                .ToListAsync();

            return new AuditLogReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalLogs = totalLogs,
                Logs = logs,
                ByAction = byAction,
                ByModule = byModule
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Audit log report failed");
            return new AuditLogReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                Logs = new List<AuditLogItemDto>(),
                ByAction = new List<AuditByActionDto>(),
                ByModule = new List<AuditByModuleDto>()
            };
        }
    }

    public async Task<object> GetSystemPerformanceReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            // API response times from audit logs (count per hour as proxy for load)
            // AuditLogs.Timestamp is UTC: filter on UTC bounds and bucket by VN hour.
            var fromUtc = ReportPeriod.ToUtc(fromDate);
            var toUtc = ReportPeriod.ToUtc(ReportPeriod.EndExclusive(toDate));
            var offsetHours = (int)Math.Round((fromDate - fromUtc).TotalHours);
            var hourlyLoad = await _context.AuditLogs
                .Where(a => a.Timestamp >= fromUtc && a.Timestamp < toUtc)
                .GroupBy(a => (a.Timestamp.Hour + offsetHours + 24) % 24)
                .Select(g => new { Hour = g.Key, RequestCount = g.Count() })
                .OrderBy(h => h.Hour)
                .ToListAsync();

            var totalRequests = hourlyLoad.Sum(h => h.RequestCount);
            var peakHour = hourlyLoad.OrderByDescending(h => h.RequestCount).FirstOrDefault();

            // Error rate from audit logs with non-200 status
            var errorCount = await _context.AuditLogs
                .CountAsync(a => a.Timestamp >= fromUtc && a.Timestamp < toUtc && a.ResponseStatusCode != null && a.ResponseStatusCode >= 500);

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalRequests = totalRequests,
                PeakHour = peakHour?.Hour,
                PeakRequestCount = peakHour?.RequestCount ?? 0,
                ErrorCount = errorCount,
                ErrorRate = totalRequests > 0 ? Math.Round(errorCount * 100m / totalRequests, 2) : 0,
                HourlyLoad = hourlyLoad
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "System performance report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalRequests = 0 };
        }
    }



    public async Task<ReportExportResultDto> ExportReportAsync(string reportCode, ReportRequestDto request)
    {
        try
        {
            // Generate report data based on code
            var fileName = $"{reportCode}_{request.FromDate:yyyyMMdd}_{request.ToDate:yyyyMMdd}.{request.Format.ToLower()}";
            var contentType = request.Format.ToLower() switch
            {
                "pdf" => "application/pdf",
                "excel" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                _ => "text/html"
            };

            // Log export history
            var history = new GeneratedReport
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.Now,
                CreatedBy = GetCurrentUserId()
            };
            // Store in GeneratedReports if table exists
            try
            {
                _context.GeneratedReports.Add(history);
                await _context.SaveChangesAsync();
            }
            catch (SqlException) { /* table may not exist */ }

            return new ReportExportResultDto
            {
                Success = true,
                FileName = fileName,
                ContentType = contentType,
                FileContent = Array.Empty<byte>(),
                Message = "Xuat bao cao thanh cong"
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Export report failed for {ReportCode}", reportCode);
            return new ReportExportResultDto { Success = false, Message = $"Loi xuat bao cao: {ex.Message}" };
        }
    }

    public async Task<byte[]> ExportToExcelAsync(string reportCode, DateTime fromDate, DateTime toDate, object? parameters = null)
    {
        // QA-R3: honours reportCode (every code used to export the same examination list). Unknown code → ArgumentException (400).
        var table = await BuildReportTableAsync(reportCode, fromDate, toDate);
        var file = HIS.Infrastructure.Services.Export.ReportFileRenderer.Render(table, "xlsx");
        await SaveReportHistoryAsync(reportCode, table.Title, file, fromDate, toDate, null);
        return file.Content;
    }

    public async Task<byte[]> ExportToPdfAsync(string reportCode, DateTime fromDate, DateTime toDate, object? parameters = null)
    {
        try
        {
            // QA-R3: honours reportCode (was the same examination list for every code).
            var table = await BuildReportTableAsync(reportCode, fromDate, toDate);
            var file = HIS.Infrastructure.Services.Export.ReportFileRenderer.Render(table, "pdf");
            await SaveReportHistoryAsync(reportCode, table.Title, file, fromDate, toDate, null);
            return file.Content;
        }
        catch (Exception ex) when (ex is not ArgumentException)
        {
            // Surface the failure (controller → 500) instead of downloading an empty "PDF".
            _logger.LogWarning(ex, "ExportToPdfAsync failed for {ReportCode}", reportCode);
            throw;
        }
    }

    public async Task<List<ReportHistoryDto>> GetReportHistoryAsync(string? reportCode = null, DateTime? fromDate = null, DateTime? toDate = null, int? top = 50)
    {
        try
        {
            var query = _context.GeneratedReports.Where(r => !r.IsDeleted).AsQueryable();
            // reportCode/fromDate/toDate were accepted but ignored (always the latest N of every report).
            if (!string.IsNullOrEmpty(reportCode))
                query = query.Where(r => r.ReportCode == reportCode);
            if (fromDate.HasValue)
            {
                var fromUtc = ReportPeriod.ToUtc(fromDate.Value);
                query = query.Where(r => r.CreatedAt >= fromUtc);
            }
            if (toDate.HasValue)
            {
                var toUtc = ReportPeriod.ToUtc(ReportPeriod.EndExclusive(toDate.Value));
                query = query.Where(r => r.CreatedAt < toUtc);
            }

            var rows = await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(top ?? 50)
                .Select(r => new
                {
                    Dto = new ReportHistoryDto
                    {
                        Id = r.Id,
                        // QA-R3: history rows showed only id/date — code, name, format and size were never returned.
                        ReportCode = r.ReportCode,
                        ReportName = r.ReportName,
                        Format = r.FileFormat ?? "",
                        FilePath = r.FileName ?? "",
                        FileSize = r.FileSize,
                        CreatedAt = r.CreatedAt,
                        CreatedBy = r.CreatedBy ?? ""
                    },
                    r.Parameters
                })
                .ToListAsync();

            // QA-R4: FromDate/ToDate were never filled (0001-01-01) — the period lives in Parameters JSON.
            foreach (var row in rows)
            {
                if (string.IsNullOrEmpty(row.Parameters)) continue;
                try
                {
                    using var doc = JsonDocument.Parse(row.Parameters);
                    if (doc.RootElement.TryGetProperty("fromDate", out var f) && DateTime.TryParse(f.GetString(), out var fd))
                        row.Dto.FromDate = fd;
                    if (doc.RootElement.TryGetProperty("toDate", out var t) && DateTime.TryParse(t.GetString(), out var td))
                        row.Dto.ToDate = td;
                }
                catch (JsonException) { /* legacy free-text parameters */ }
            }

            return rows.Select(r => r.Dto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Report history query failed");
            return new List<ReportHistoryDto>();
        }
    }

    public async Task<byte[]> DownloadReportFromHistoryAsync(Guid reportHistoryId)
    {
        try
        {
            var report = await _context.GeneratedReports.FirstOrDefaultAsync(r => r.Id == reportHistoryId && !r.IsDeleted);
            if (report == null) return Array.Empty<byte>();

            // QA-R3: the generated bytes are kept in the history row (survives container rebuilds).
            if (report.FileContent is { Length: > 0 })
            {
                report.IsDownloaded = true;
                report.DownloadCount++;
                await _context.SaveChangesAsync();
                return report.FileContent;
            }

            // Legacy rows: file on disk, if it still exists
            if (!string.IsNullOrEmpty(report.OutputPath) && System.IO.File.Exists(report.OutputPath))
            {
                return await System.IO.File.ReadAllBytesAsync(report.OutputPath);
            }

            // Otherwise regenerate a summary HTML
            var html = $@"<!DOCTYPE html>
<html><head><meta charset=""utf-8""><title>{System.Net.WebUtility.HtmlEncode(report.ReportName)}</title>
<style>
body {{ font-family: 'Times New Roman', serif; font-size: 13px; margin: 20px; }}
h1 {{ text-align: center; font-size: 16px; }}
.info {{ margin: 6px 0; }}
.label {{ font-weight: bold; display: inline-block; width: 160px; }}
</style></head><body>
<h1>{System.Net.WebUtility.HtmlEncode(report.ReportName)}</h1>
<div class=""info""><span class=""label"">Ma bao cao:</span> {System.Net.WebUtility.HtmlEncode(report.ReportCode)}</div>
<div class=""info""><span class=""label"">Ngay tao:</span> {report.GeneratedAt:dd/MM/yyyy HH:mm}</div>
<div class=""info""><span class=""label"">Dinh dang:</span> {System.Net.WebUtility.HtmlEncode(report.FileFormat ?? "HTML")}</div>
<div class=""info""><span class=""label"">So ban ghi:</span> {report.TotalRecords?.ToString() ?? "N/A"}</div>
<div class=""info""><span class=""label"">Trang thai:</span> {(report.Status == 1 ? "Hoan thanh" : report.Status == 2 ? "Loi" : "Dang tao")}</div>
{(string.IsNullOrEmpty(report.Parameters) ? "" : $"<div class=\"info\"><span class=\"label\">Tham so:</span> {System.Net.WebUtility.HtmlEncode(report.Parameters)}</div>")}
{(string.IsNullOrEmpty(report.ErrorMessage) ? "" : $"<div class=\"info\" style=\"color:red\"><span class=\"label\">Loi:</span> {System.Net.WebUtility.HtmlEncode(report.ErrorMessage)}</div>")}
<p style=""font-style:italic;margin-top:20px"">File goc khong con tren he thong. Day la ban tom tat thong tin bao cao.</p>
</body></html>";

            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DownloadReportFromHistoryAsync failed for {Id}", reportHistoryId);
            return Array.Empty<byte>();
        }
    }



    public async Task<List<ScheduledReportConfigDto>> GetScheduledReportsAsync()
    {
        try
        {
            var configs = await _context.SystemConfigs
                .Where(c => c.ConfigKey.StartsWith("ScheduledReport_") && c.IsActive && !c.IsDeleted)
                .ToListAsync();

            return configs.Select(c =>
            {
                try
                {
                    var dto = JsonSerializer.Deserialize<ScheduledReportConfigDto>(c.ConfigValue);
                    if (dto != null)
                    {
                        dto.Id = c.Id;
                        return dto;
                    }
                }
                catch { /* invalid JSON */ }
                return null;
            }).Where(d => d != null).ToList()!;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Scheduled reports query failed");
            return new List<ScheduledReportConfigDto>();
        }
    }

    private static readonly string[] AllowedSchedules = { "Daily", "Weekly", "Monthly", "Quarterly", "Yearly" };

    public async Task<ScheduledReportConfigDto> SaveScheduledReportAsync(SaveScheduledReportDto dto)
    {
        // QA-R4: nothing was validated — a blank code / unknown code / "Fortnightly" / "not-an-email" were all
        // saved, and a Guid.Empty id was treated as an update (never found → inserted under the same ConfigKey
        // "ScheduledReport__000…"; the second save hit UX_SystemConfigs_ConfigKey_Active → 500).
        var reportCode = (dto.ReportCode ?? "").Trim();
        if (reportCode.Length == 0)
            throw new ArgumentException("Thiếu mã báo cáo.");
        if (!ReportCodeMap.ContainsKey(reportCode) && !HospitalReportService.IsKnownReport(reportCode))
            throw new ArgumentException($"Báo cáo '{reportCode}' chưa có nguồn dữ liệu để xuất.");
        var schedule = string.IsNullOrWhiteSpace(dto.Schedule) ? "Daily"
            : AllowedSchedules.FirstOrDefault(s => s.Equals(dto.Schedule.Trim(), StringComparison.OrdinalIgnoreCase));
        if (schedule == null)
            throw new ArgumentException("Chu kỳ không hợp lệ (Daily / Weekly / Monthly / Quarterly / Yearly).");
        var format = string.IsNullOrWhiteSpace(dto.Format) ? "Excel"
            : dto.Format.Trim().Equals("pdf", StringComparison.OrdinalIgnoreCase) ? "PDF"
            : dto.Format.Trim().Equals("excel", StringComparison.OrdinalIgnoreCase) ? "Excel" : null;
        if (format == null)
            throw new ArgumentException("Định dạng không hợp lệ (Excel / PDF).");
        var cron = (dto.CronExpression ?? "").Trim();
        if (cron.Length > 0 && cron.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length is < 5 or > 6)
            throw new ArgumentException("Biểu thức cron không hợp lệ (5–6 trường).");
        var badEmail = (dto.Recipients ?? "")
            .Split(new[] { ',', ';', ' ', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault(e => !System.Net.Mail.MailAddress.TryCreate(e, out _));
        if (badEmail != null)
            throw new ArgumentException($"Email người nhận không hợp lệ: {badEmail}");
        if (dto.Id == Guid.Empty) dto.Id = null;

        try
        {
            var configKey = $"ScheduledReport_{reportCode}_{(dto.Id ?? Guid.NewGuid()):N}";
            var now = DateTime.Now;

            var config = dto.Id.HasValue
                ? await _context.SystemConfigs.FindAsync(dto.Id.Value)
                : null;
            if (dto.Id.HasValue && (config == null || config.IsDeleted))
                throw new KeyNotFoundException("Không tìm thấy cấu hình báo cáo");

            var resultDto = new ScheduledReportConfigDto
            {
                Id = dto.Id ?? Guid.NewGuid(),
                ReportCode = reportCode,
                ReportName = reportCode,
                Schedule = schedule,
                CronExpression = cron,
                Format = format,
                Recipients = dto.Recipients ?? "",
                IsActive = dto.IsActive,
                Parameters = dto.Parameters
            };

            var jsonValue = JsonSerializer.Serialize(resultDto);

            if (config != null)
            {
                config.ConfigValue = jsonValue;
                config.UpdatedAt = now;
                config.UpdatedBy = GetCurrentUserId();
            }
            else
            {
                config = new SystemConfig
                {
                    Id = resultDto.Id,
                    ConfigKey = configKey,
                    ConfigValue = jsonValue,
                    ConfigType = "JSON",
                    Description = $"Scheduled report: {dto.ReportCode}",
                    IsActive = true,
                    CreatedAt = now,
                    CreatedBy = GetCurrentUserId()
                };
                _context.SystemConfigs.Add(config);
            }

            await _context.SaveChangesAsync();
            return resultDto;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Save scheduled report failed");
            return new ScheduledReportConfigDto { Id = dto.Id ?? Guid.NewGuid(), ReportCode = dto.ReportCode ?? "" };
        }
    }

    public async Task<bool> DeleteScheduledReportAsync(Guid id)
    {
        try
        {
            var config = await _context.SystemConfigs.FindAsync(id);
            if (config == null) return false;

            config.IsDeleted = true;
            config.UpdatedAt = DateTime.Now;
            config.UpdatedBy = GetCurrentUserId();
            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Delete scheduled report failed");
            return false;
        }
    }

    public async Task<bool> RunScheduledReportNowAsync(Guid id)
    {
        try
        {
            var config = await _context.SystemConfigs.FindAsync(id);
            if (config == null) return false;

            var dto = JsonSerializer.Deserialize<ScheduledReportConfigDto>(config.ConfigValue);
            if (dto == null) return false;

            // QA-R3: "Chạy ngay" only stamped LastRunTime — no report was produced and nobody received anything.
            // Generate the report for the schedule's current period, keep it in report history, and e-mail it to
            // the configured recipients. Unknown report code → ArgumentException (400).
            var today = DateTime.Today;
            var (fromDate, toDate) = (dto.Schedule ?? "").Trim().ToLowerInvariant() switch
            {
                "weekly" => (today.AddDays(-6), today),
                "monthly" => (new DateTime(today.Year, today.Month, 1), today),
                "quarterly" => (new DateTime(today.Year, (today.Month - 1) / 3 * 3 + 1, 1), today),
                "yearly" => (new DateTime(today.Year, 1, 1), today),
                _ => (today, today),
            };
            var table = await BuildReportTableAsync(dto.ReportCode, fromDate, toDate);
            var file = HIS.Infrastructure.Services.Export.ReportFileRenderer.Render(table,
                string.Equals(dto.Format, "pdf", StringComparison.OrdinalIgnoreCase) ? "pdf" : "xlsx");

            var recipients = (dto.Recipients ?? "")
                .Split(new[] { ',', ';', ' ', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(e => e.Contains('@'))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            var attachmentName = $"{dto.ReportCode}_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.{file.Extension}";
            var failed = new List<string>();
            foreach (var to in recipients)
                if (!await _email.SendReportAsync(to, table.Title, file.Content, attachmentName))
                    failed.Add(to);

            dto.LastRunTime = DateTime.Now;
            config.ConfigValue = JsonSerializer.Serialize(dto);
            config.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            await SaveReportHistoryAsync(dto.ReportCode, table.Title, file, fromDate, toDate,
                recipients.Count == 0 ? "Chạy thủ công — không có người nhận"
                    : $"Gửi {recipients.Count - failed.Count}/{recipients.Count} email" + (failed.Count > 0 ? $" (lỗi: {string.Join(", ", failed)})" : ""));

            _logger.LogInformation("Scheduled report {ReportCode} run manually: {Rows} rows, {Sent}/{Total} emails",
                dto.ReportCode, table.Rows.Count, recipients.Count - failed.Count, recipients.Count);
            if (failed.Count > 0)
                throw new InvalidOperationException($"Đã tạo báo cáo nhưng gửi email thất bại tới: {string.Join(", ", failed)}");
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Run scheduled report failed");
            return false;
        }
    }



    public Task<List<ReportDefinitionDto>> GetReportDefinitionsAsync(string? category = null)
    {
        var definitions = GetAllReportDefinitions();
        if (!string.IsNullOrEmpty(category))
            definitions = definitions.Where(d => d.Category == category).ToList();
        return Task.FromResult(definitions);
    }

    public Task<ReportDefinitionDto?> GetReportDefinitionAsync(string reportCode)
    {
        var def = GetAllReportDefinitions().FirstOrDefault(d => d.ReportCode == reportCode);
        return Task.FromResult(def);
    }



    private async Task<DashboardSummaryDto> BuildSummaryAsync(DateTime from, DateTime to, Guid? departmentId = null)
    {
        var mrQuery = _context.MedicalRecords.Where(m => m.AdmissionDate >= from && m.AdmissionDate < to && !m.IsDeleted);
        if (departmentId.HasValue)
            mrQuery = mrQuery.Where(m => m.DepartmentId == departmentId.Value);

        var totalPatients = await mrQuery.CountAsync();
        var outpatient = await mrQuery.CountAsync(m => m.TreatmentType == 1);
        var inpatient = await mrQuery.CountAsync(m => m.TreatmentType == 2);
        var emergency = await mrQuery.CountAsync(m => m.TreatmentType == 3);

        // CreatedAt is UTC (HISDbContext.SaveChangesAsync); cancelled examinations (5) are not visits.
        var fromUtc = ReportPeriod.ToUtc(from);
        var toUtc = ReportPeriod.ToUtc(to);
        var examQuery = _context.Examinations.Where(e => e.CreatedAt >= fromUtc && e.CreatedAt < toUtc && e.Status != 5 && !e.IsDeleted);
        if (departmentId.HasValue)
            examQuery = examQuery.Where(e => e.DepartmentId == departmentId.Value);
        var totalExams = await examQuery.CountAsync();

        // Net cash: refund slips were added as revenue when approved (1) and ignored once paid out (4).
        var receiptQuery = _context.Receipts.Where(r => r.ReceiptDate >= from && r.ReceiptDate < to && !r.IsDeleted).Where(ReportPeriod.CashReceipt);
        if (departmentId.HasValue)
            receiptQuery = receiptQuery.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == departmentId.Value);
        var totalRevenue = await receiptQuery.SumAsync(r => (decimal?)(r.ReceiptType == 3 ? -r.FinalAmount : r.FinalAmount)) ?? 0;

        // #14b: model 1 (SRD RequestType=1, loại hủy) thay LabRequestItems (model 2 chết)
        // Department dashboard: labs/surgeries/beds were hospital-wide even when departmentId was given.
        var labQuery = _context.ServiceRequestDetails.Where(d => d.CreatedAt >= fromUtc && d.CreatedAt < toUtc && !d.IsDeleted
            && d.ServiceRequest.RequestType == 1 && d.Status != 3);
        if (departmentId.HasValue)
            labQuery = labQuery.Where(d => d.ServiceRequest.DepartmentId == departmentId.Value);
        var labTests = await labQuery.CountAsync();

        // SurgeryRequest.Status 4 = cancelled
        var surgeryQuery = _context.SurgeryRequests.Where(s => s.RequestDate >= from && s.RequestDate < to && s.Status != 4 && !s.IsDeleted);
        if (departmentId.HasValue)
            surgeryQuery = surgeryQuery.Where(s => s.MedicalRecord != null && s.MedicalRecord.DepartmentId == departmentId.Value);
        var surgeries = await surgeryQuery.CountAsync();

        var bedQuery = _context.Beds.Where(b => b.IsActive && !b.IsDeleted);
        if (departmentId.HasValue)
            bedQuery = bedQuery.Where(b => b.Room.DepartmentId == departmentId.Value);
        var totalBeds = await bedQuery.CountAsync();
        var availableBeds = await bedQuery.CountAsync(b => b.Status == 0);
        var occupancyRate = totalBeds > 0 ? Math.Round((totalBeds - availableBeds) * 100m / totalBeds, 1) : 0;

        return new DashboardSummaryDto
        {
            TotalPatients = totalPatients,
            OutpatientCount = outpatient,
            InpatientCount = inpatient,
            EmergencyCount = emergency,
            TotalRevenue = totalRevenue,
            InsuranceRevenue = 0,
            PatientRevenue = totalRevenue,
            TotalExaminations = totalExams,
            TotalLabTests = labTests,
            TotalRadiologyExams = 0,
            TotalSurgeries = surgeries,
            OccupancyRate = occupancyRate,
            AvailableBeds = availableBeds
        };
    }

    private static KPIItemDto BuildKPI(string code, string name, decimal current, decimal previous, string unit, decimal target)
    {
        var change = previous != 0 ? Math.Round((current - previous) * 100m / previous, 1) : 0;
        var trend = change > 0 ? "Up" : change < 0 ? "Down" : "Stable";
        var status = target == 0 ? "Good" : current >= target ? "Good" : current >= target * 0.8m ? "Warning" : "Bad";

        return new KPIItemDto
        {
            Code = code, Name = name,
            CurrentValue = current, TargetValue = target, PreviousValue = previous,
            Unit = unit, Trend = trend, ChangePercent = change, Status = status
        };
    }

    private async Task<ControlledDrugReportDto> GetControlledDrugReportInternalAsync(DateTime fromDate, DateTime toDate, bool isNarcotic)
    {
        try
        {
            var toEnd = ReportPeriod.EndExclusive(toDate);
            // Cancelled (4) and draft/unissued (5) prescriptions dispensed nothing.
            var query = _context.PrescriptionDetails
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate
                    && pd.Prescription.PrescriptionDate < toEnd
                    && pd.Prescription.Status != 4 && pd.Prescription.Status != 5
                    && !pd.IsDeleted
                    && (isNarcotic ? pd.Medicine.IsNarcotic : pd.Medicine.IsPsychotropic));

            var items = await query
                .OrderBy(pd => pd.Prescription.PrescriptionDate)
                .Select(pd => new ControlledDrugItemDto
                {
                    Date = pd.Prescription.PrescriptionDate,
                    PatientCode = pd.Prescription.MedicalRecord.Patient.PatientCode,
                    PatientName = pd.Prescription.MedicalRecord.Patient.FullName,
                    Diagnosis = pd.Prescription.Diagnosis ?? "",
                    DrugCode = pd.Medicine.MedicineCode,
                    DrugName = pd.Medicine.MedicineName,
                    Quantity = pd.Quantity,
                    Unit = pd.Unit ?? "",
                    DoctorName = pd.Prescription.Doctor.FullName,
                    LicenseNumber = pd.Prescription.Doctor.LicenseNumber ?? ""
                })
                .ToListAsync();

            for (int i = 0; i < items.Count; i++)
                items[i].RowNumber = i + 1;

            return new ControlledDrugReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                DrugType = isNarcotic ? "Narcotic" : "Psychotropic",
                Items = items
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Controlled drug report failed");
            return new ControlledDrugReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                DrugType = isNarcotic ? "Narcotic" : "Psychotropic",
                Items = new List<ControlledDrugItemDto>()
            };
        }
    }

    private static List<ReportDefinitionDto> GetAllReportDefinitions()
    {
        var dateParams = new List<ReportParameterDto>
        {
            new() { Name = "fromDate", Label = "Tu ngay", DataType = "Date", IsRequired = true },
            new() { Name = "toDate", Label = "Den ngay", DataType = "Date", IsRequired = true }
        };

        var deptParam = new ReportParameterDto { Name = "departmentId", Label = "Khoa", DataType = "Guid", IsRequired = false, LookupSource = "/api/departments" };
        var formats = new List<string> { "Excel", "PDF", "HTML" };

        return new List<ReportDefinitionDto>
        {
            new() { ReportCode = "BC-001", ReportName = "Bao cao benh nhan theo khoa", Category = "Clinical", Module = "OPD", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-002", ReportName = "Top 10 benh ICD-10", Category = "Clinical", Module = "OPD", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-003", ReportName = "Bao cao ty le tu vong", Category = "Clinical", Module = "Inpatient", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-004", ReportName = "Thong ke phau thuat thu thuat", Category = "Clinical", Module = "Surgery", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-005", ReportName = "Thong ke xet nghiem", Category = "Clinical", Module = "Laboratory", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-006", ReportName = "Thong ke CDHA", Category = "Clinical", Module = "Radiology", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-007", ReportName = "Bao cao tai kham", Category = "Clinical", Module = "OPD", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-008", ReportName = "Bao cao nhiem khuan benh vien", Category = "Clinical", Module = "Inpatient", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-101", ReportName = "Doanh thu tong hop", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-102", ReportName = "Doanh thu theo ngay", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-103", ReportName = "Cong no benh nhan", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = new List<ReportParameterDto> { new() { Name = "asOfDate", Label = "Tinh den ngay", DataType = "Date", IsRequired = false } } },
            new() { ReportCode = "BC-104", ReportName = "BHYT tong hop", Category = "Financial", Module = "Insurance", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-105", ReportName = "Loi nhuan theo khoa", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-106", ReportName = "Thu tien theo nhan vien", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-107", ReportName = "Hoa don GTGT", Category = "Financial", Module = "Billing", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-201", ReportName = "Ton kho hien tai", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = new List<ReportParameterDto> { new() { Name = "warehouseId", Label = "Kho", DataType = "Guid", IsRequired = false, LookupSource = "/api/warehouses" } } },
            new() { ReportCode = "BC-202", ReportName = "Xuat nhap ton", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-203", ReportName = "Thuoc gay nghien", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-204", ReportName = "Thuoc huong than", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-205", ReportName = "Thuoc sap het han", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = new List<ReportParameterDto> { new() { Name = "daysAhead", Label = "So ngay", DataType = "Int", IsRequired = false, DefaultValue = "90" } } },
            new() { ReportCode = "BC-206", ReportName = "Su dung thuoc theo khoa", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = new List<ReportParameterDto>(dateParams) { deptParam } },
            new() { ReportCode = "BC-207", ReportName = "Phan tich ABC/VEN", Category = "Pharmacy", Module = "Pharmacy", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-301", ReportName = "Thong ke nguoi dung", Category = "Admin", Module = "SystemAdmin", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-302", ReportName = "Nhat ky he thong", Category = "Admin", Module = "SystemAdmin", SupportedFormats = formats, Parameters = dateParams },
            new() { ReportCode = "BC-303", ReportName = "Hieu suat he thong", Category = "Admin", Module = "SystemAdmin", SupportedFormats = formats, Parameters = dateParams }
        };
    }

}
