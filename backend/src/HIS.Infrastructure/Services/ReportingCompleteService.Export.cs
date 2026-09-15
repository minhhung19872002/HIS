using System.Text.Json;
using HIS.Application.DTOs.Reporting;
using HIS.Core.Entities;
using HIS.Infrastructure.Services.Export;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA-R3: /reporting/export/{excel|pdf}/{reportCode} ignored the report code — every card of the v2 Reports page
/// downloaded the same "examinations" list — and "Chạy ngay" of a scheduled report only stamped LastRunTime.
/// Report codes now map to their real data source; unknown / sourceless codes are rejected (ArgumentException → 400).
/// </summary>
public partial class ReportingCompleteService
{
    private enum ReportSource { Hospital, Reconciliation, ControlledDrug }

    /// <summary>
    /// Report codes the v2 Reports page (RPT-xxx / level6 / cost / admin / pharma cards) and the report
    /// definitions (BC-xxx) use → the existing handler that owns that data. Codes of the 140-report catalog
    /// (HospitalReportService) are accepted as-is.
    /// </summary>
    private static readonly Dictionary<string, (ReportSource Source, string Target)> ReportCodeMap =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // v2 Reports page — operational / clinical / financial / regulatory
            ["RPT-001"] = (ReportSource.Hospital, "DailyPatientCount"),
            ["RPT-002"] = (ReportSource.Hospital, "DailyBriefingBedCapacity"),
            ["RPT-003"] = (ReportSource.Hospital, "PatientWaitTimeDetail"),
            ["RPT-101"] = (ReportSource.Hospital, "DiseaseAndDeathICD10"),
            ["RPT-102"] = (ReportSource.Hospital, "DischargeByDept"),
            ["RPT-103"] = (ReportSource.Hospital, "SurgeryRegister"),
            ["RPT-201"] = (ReportSource.Hospital, "RevenueByDept"),
            ["RPT-202"] = (ReportSource.Hospital, "InsuranceSummary"),
            ["RPT-203"] = (ReportSource.Hospital, "CashierSummary"),
            ["RPT-204"] = (ReportSource.Hospital, "StockMovement"),
            ["RPT-301"] = (ReportSource.Hospital, "TreatmentActivity2360"),
            ["RPT-303"] = (ReportSource.Hospital, "RevenueByServiceType"),
            ["RPT-304"] = (ReportSource.Hospital, "InsuranceDetail"),
            // Level 6 reconciliation
            ["supplier-procurement"] = (ReportSource.Reconciliation, "supplier-procurement"),
            ["revenue-by-record"] = (ReportSource.Reconciliation, "revenue-by-record"),
            ["dept-cost-vs-fees"] = (ReportSource.Reconciliation, "dept-cost-vs-fees"),
            ["record-cost-summary"] = (ReportSource.Reconciliation, "record-cost-summary"),
            ["fees-vs-standards"] = (ReportSource.Reconciliation, "fees-vs-standards"),
            ["service-order-doctors"] = (ReportSource.Reconciliation, "service-order-doctors"),
            ["dispensing-vs-billing"] = (ReportSource.Reconciliation, "dispensing-vs-billing"),
            ["dispensing-vs-standards"] = (ReportSource.Reconciliation, "dispensing-vs-standards"),
            // BHYT cost / administration / pharmacy cards
            ["bhyt-chi-phi-kcb"] = (ReportSource.Hospital, "OpdIpdCostByFee"),
            ["bhyt-quyet-toan"] = (ReportSource.Hospital, "InsurancePaymentRequest"),
            ["admin-so-kham"] = (ReportSource.Hospital, "ExaminationRegister"),
            ["admin-so-vao-ra"] = (ReportSource.Hospital, "AdmitTransferDischarge"),
            ["admin-so-pt"] = (ReportSource.Hospital, "SurgeryRegister"),
            ["admin-xn"] = (ReportSource.Hospital, "LabRegister"),
            ["admin-cdha"] = (ReportSource.Hospital, "ImagingRegister"),
            ["pharma-the-kho"] = (ReportSource.Hospital, "StockCardDetail"),
            ["pharma-bc-sd-thuoc"] = (ReportSource.Hospital, "PharmacyDispensing"),
            ["pharma-ton-kho"] = (ReportSource.Hospital, "StockInventory"),
            ["pharma-nhap-xuat"] = (ReportSource.Hospital, "StockMovement"),
            // Report definitions (GetReportDefinitionsAsync)
            ["BC-001"] = (ReportSource.Hospital, "ExaminationActivity"),
            ["BC-002"] = (ReportSource.Hospital, "DiseaseAndDeathICD10"),
            ["BC-003"] = (ReportSource.Hospital, "DischargeByDept"),
            ["BC-004"] = (ReportSource.Hospital, "SurgeryRegister"),
            ["BC-005"] = (ReportSource.Hospital, "LabRegister"),
            ["BC-006"] = (ReportSource.Hospital, "ImagingRegister"),
            ["BC-101"] = (ReportSource.Hospital, "HospitalFeeSummary"),
            ["BC-102"] = (ReportSource.Hospital, "CashierSummary"),
            ["BC-104"] = (ReportSource.Hospital, "InsuranceSummary"),
            ["BC-106"] = (ReportSource.Hospital, "CashierSummary"),
            ["BC-201"] = (ReportSource.Hospital, "StockInventory"),
            ["BC-202"] = (ReportSource.Hospital, "StockMovement"),
            ["BC-203"] = (ReportSource.ControlledDrug, "narcotic"),
            ["BC-204"] = (ReportSource.ControlledDrug, "psychotropic"),
            ["BC-205"] = (ReportSource.Hospital, "StockInventory"),
            ["BC-206"] = (ReportSource.Hospital, "PharmacyDispensing"),
        };

    /// <summary>Fetch the real data of <paramref name="reportCode"/> as a table; unknown code → ArgumentException.</summary>
    internal async Task<ReportTable> BuildReportTableAsync(string reportCode, DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        if (string.IsNullOrWhiteSpace(reportCode))
            throw new ArgumentException("Thiếu mã báo cáo.");
        if (toDate.Date < fromDate.Date)
            throw new ArgumentException("Đến ngày phải sau hoặc bằng từ ngày.");
        var subtitle = $"Từ {fromDate:dd/MM/yyyy} đến {toDate:dd/MM/yyyy}";

        (ReportSource Source, string Target) route;
        if (ReportCodeMap.TryGetValue(reportCode, out var mapped)) route = mapped;
        else if (HospitalReportService.IsKnownReport(reportCode)) route = (ReportSource.Hospital, reportCode);
        else throw new ArgumentException($"Báo cáo '{reportCode}' chưa có nguồn dữ liệu để xuất.");

        switch (route.Source)
        {
            case ReportSource.Hospital:
            {
                var result = await _hospitalReports.GetReportDataAsync(route.Target, fromDate, toDate, departmentId, null);
                return ReportFileRenderer.FromHospitalReport(result, subtitle);
            }
            case ReportSource.ControlledDrug:
            {
                var isNarcotic = route.Target == "narcotic";
                var dto = await GetControlledDrugReportInternalAsync(fromDate, toDate, isNarcotic);
                return ReportFileRenderer.FromItems(isNarcotic ? "SỔ THUỐC GÂY NGHIỆN" : "SỔ THUỐC HƯỚNG THẦN", subtitle, dto.Items);
            }
            default:
            {
                object dto = route.Target switch
                {
                    "supplier-procurement" => await _reconciliation.GetSupplierProcurementAsync(fromDate, toDate),
                    "revenue-by-record" => await _reconciliation.GetRevenueByRecordAsync(fromDate, toDate, departmentId),
                    "dept-cost-vs-fees" => await _reconciliation.GetDeptCostVsFeesAsync(fromDate, toDate, departmentId),
                    "record-cost-summary" => await _reconciliation.GetRecordCostSummaryAsync(fromDate, toDate, departmentId),
                    "fees-vs-standards" => await _reconciliation.GetFeesVsStandardsAsync(fromDate, toDate, departmentId),
                    "service-order-doctors" => await _reconciliation.GetServiceOrderDoctorsAsync(fromDate, toDate),
                    "dispensing-vs-billing" => await _reconciliation.GetDispensingVsBillingAsync(fromDate, toDate),
                    _ => await _reconciliation.GetDispensingVsStandardsAsync(fromDate, toDate),
                };
                var items = dto.GetType().GetProperty("Items")?.GetValue(dto) as System.Collections.IEnumerable
                    ?? Array.Empty<object>();
                return ReportFileRenderer.FromItems(reportCode.ToUpperInvariant(), subtitle, items);
            }
        }
    }

    /// <summary>
    /// Records a produced report file in GeneratedReports with its bytes (FileContent) so "tải lại từ lịch sử"
    /// survives container rebuilds (prod has no volume). Best effort: history must never make the export fail.
    /// </summary>
    private async Task SaveReportHistoryAsync(string reportCode, string reportName, ReportFile file,
        DateTime fromDate, DateTime toDate, string? note)
    {
        try
        {
            if (!Guid.TryParse(_currentUser.UserId, out var userId)) return;
            var template = await _context.ReportTemplates.FirstOrDefaultAsync(t => t.ReportCode == reportCode && !t.IsDeleted);
            if (template == null)
            {
                template = new ReportTemplate
                {
                    Id = Guid.NewGuid(), ReportCode = reportCode, ReportName = reportName, ReportType = 1,
                    Category = "Export", OutputFormat = file.Extension.ToUpperInvariant(), IsActive = true,
                    CreatedAt = DateTime.UtcNow, CreatedBy = userId.ToString(),
                };
                _context.ReportTemplates.Add(template);
            }

            var id = Guid.NewGuid();
            var fileName = $"{reportCode}_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.{file.Extension}";

            var entry = new GeneratedReport
            {
                Id = id, ReportTemplateId = template.Id, ReportCode = reportCode, ReportName = reportName,
                GeneratedBy = userId, GeneratedAt = DateTime.Now,
                Parameters = JsonSerializer.Serialize(new { fromDate = fromDate.ToString("yyyy-MM-dd"), toDate = toDate.ToString("yyyy-MM-dd") }),
                OutputPath = null, FileContent = file.Content,
                FileName = fileName, FileFormat = file.Extension.ToUpperInvariant(), FileSize = file.Content.Length,
                Status = 1, StartTime = DateTime.Now, EndTime = DateTime.Now, Note = note,
                CreatedAt = DateTime.UtcNow, CreatedBy = userId.ToString(),
            };
            _context.GeneratedReports.Add(entry);
            _context.Entry(entry).Property("GeneratedByUserId").CurrentValue = userId;
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Saving report history failed for {ReportCode}", reportCode);
            _context.ChangeTracker.Clear();
        }
    }
}
