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
// Batch 4.2: Quality Dashboard Service
// ============================================================================

public class QualityDashboardService : IQualityDashboardService
{
    private readonly HISDbContext _db;
    private readonly ILogger<QualityDashboardService> _logger;
    public QualityDashboardService(HISDbContext db, ILogger<QualityDashboardService> logger)
    {
        _db = db; _logger = logger;
    }

    public async Task<QualityDashboardDto> GetFullDashboardAsync(DateTime? asOfDate = null)
    {
        var dt = asOfDate ?? DateTime.Today;
        return new QualityDashboardDto
        {
            AsOfDate = dt,
            ClinicQueues = await GetClinicQueuesAsync(dt),
            InpatientByDepartment = await GetInpatientByDepartmentAsync(dt),
            Paraclinical = await GetParaclinicalStatusAsync(dt),
            Lab = await GetLabStatusAsync(dt),
            Revenue = await GetDailyRevenueAsync(dt),
            WaitTimeByVisitType = await GetWaitTimeByVisitTypeAsync(dt),
            ClsCostByPaymentType = await GetClsCostByPaymentTypeAsync(dt),
        };
    }

    public async Task<List<ClinicQueueViewDto>> GetClinicQueuesAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        try
        {
            var queueRows = await _db.QueueTickets.AsNoTracking()
                .Where(q => q.CreatedAt >= date && q.CreatedAt < nextDay)
                .GroupBy(q => new { q.RoomId })
                .Select(g => new
                {
                    g.Key.RoomId,
                    Waiting = g.Count(x => x.Status == 0),    // not yet called
                    InProgress = g.Count(x => x.Status == 1), // called / serving
                    Completed = g.Count(x => x.Status == 2)   // completed
                })
                .ToListAsync();

            var roomIds = queueRows.Where(r => r.RoomId.HasValue).Select(r => r.RoomId!.Value).ToList();
            var rooms = await _db.Rooms.AsNoTracking()
                .Where(r => roomIds.Contains(r.Id))
                .Select(r => new { r.Id, Name = r.RoomName })
                .ToListAsync();

            return queueRows.Select(q => new ClinicQueueViewDto
            {
                RoomId = q.RoomId ?? Guid.Empty,
                RoomName = rooms.FirstOrDefault(r => r.Id == q.RoomId)?.Name ?? "Phòng không xác định",
                Waiting = q.Waiting,
                InProgress = q.InProgress,
                Completed = q.Completed
            }).ToList();
        }
        catch
        {
            return new List<ClinicQueueViewDto>();
        }
    }

    public async Task<List<InpatientDepartmentViewDto>> GetInpatientByDepartmentAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        try
        {
            var admissions = await _db.Admissions.AsNoTracking()
                .Include(a => a.Department)
                .Include(a => a.Discharge)
                .ToListAsync();

            var grouped = admissions
                .GroupBy(a => new { a.DepartmentId, DeptName = a.Department != null ? a.Department.DepartmentName : "?" })
                .Select(g => new InpatientDepartmentViewDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DeptName,
                    Present = g.Count(a => a.Status == 0),
                    Admitted = g.Count(a => a.AdmissionDate >= date && a.AdmissionDate < nextDay),
                    Discharged = g.Count(a => a.Discharge != null && a.Discharge.DischargeDate >= date && a.Discharge.DischargeDate < nextDay)
                })
                .OrderByDescending(x => x.Present)
                .ToList();

            return grouped;
        }
        catch
        {
            return new List<InpatientDepartmentViewDto>();
        }
    }

    public async Task<ParaclinicalStatusViewDto> GetParaclinicalStatusAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        var view = new ParaclinicalStatusViewDto();

        try
        {
            // Radiology
            var radiology = await _db.RadiologyRequests.AsNoTracking()
                .Where(r => r.CreatedAt >= date && r.CreatedAt < nextDay)
                .GroupBy(r => 1)
                .Select(g => new { Pending = g.Count(x => x.Status < 2), Completed = g.Count(x => x.Status >= 2) })
                .FirstOrDefaultAsync();
            view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Chẩn đoán hình ảnh", Pending = radiology?.Pending ?? 0, Completed = radiology?.Completed ?? 0 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QualityDashboard: failed to aggregate Radiology");
            view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Chẩn đoán hình ảnh" });
        }

        try
        {
            // Endoscopy / functional diag
            var fdt = await _db.FunctionalDiagnosticTests.AsNoTracking()
                .Where(r => r.CreatedAt >= date && r.CreatedAt < nextDay)
                .GroupBy(r => 1)
                .Select(g => new { Pending = g.Count(x => x.Status < 2), Completed = g.Count(x => x.Status >= 2) })
                .FirstOrDefaultAsync();
            view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Thăm dò chức năng", Pending = fdt?.Pending ?? 0, Completed = fdt?.Completed ?? 0 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QualityDashboard: failed to aggregate FunctionalDiagnostics");
            view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Thăm dò chức năng" });
        }

        try
        {
            // Pathology
            var path = await _db.PathologyRequests.AsNoTracking()
                .Where(r => r.RequestDate >= date && r.RequestDate < nextDay)
                .GroupBy(r => 1)
                .Select(g => new { Pending = g.Count(x => x.Status < 3), Completed = g.Count(x => x.Status >= 3) })
                .FirstOrDefaultAsync();
            view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Giải phẫu bệnh", Pending = path?.Pending ?? 0, Completed = path?.Completed ?? 0 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QualityDashboard: failed to aggregate Pathology");
            view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Giải phẫu bệnh" });
        }

        return view;
    }

    public async Task<LabStatusViewDto> GetLabStatusAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        var view = new LabStatusViewDto();

        // #14e: model 1 SRD (RequestType=1) — aggregate theo Service.ServiceGroup (model 2 đã gỡ)
        try
        {
            var labItems = await _db.ServiceRequestDetails.AsNoTracking()
                .Include(x => x.Service).ThenInclude(s => s.ServiceGroup)
                .Where(x => !x.IsDeleted && x.Status != 3
                    && x.ServiceRequest.RequestType == 1
                    && x.CreatedAt >= date && x.CreatedAt < nextDay)
                .ToListAsync();

            var grouped = labItems
                .GroupBy(x => x.Service?.ServiceGroup?.GroupName ?? "Khác")
                .Select(g => new LabCategoryStatusDto
                {
                    CategoryName = g.Key,
                    Pending = g.Count(x => x.Status < 2),
                    Completed = g.Count(x => x.Status == 2)
                })
                .ToList();

            view.Categories.AddRange(grouped);

            // Always include 4 standard categories
            string[] standardCats = { "Huyết học", "Sinh hóa", "Vi sinh", "Miễn dịch" };
            foreach (var c in standardCats)
            {
                if (!view.Categories.Any(x => x.CategoryName == c))
                    view.Categories.Add(new LabCategoryStatusDto { CategoryName = c, Pending = 0, Completed = 0 });
            }
        }
        catch
        {
            view.Categories.Add(new LabCategoryStatusDto { CategoryName = "Huyết học" });
            view.Categories.Add(new LabCategoryStatusDto { CategoryName = "Sinh hóa" });
            view.Categories.Add(new LabCategoryStatusDto { CategoryName = "Vi sinh" });
            view.Categories.Add(new LabCategoryStatusDto { CategoryName = "Miễn dịch" });
        }

        return view;
    }

    public async Task<DailyRevenueViewDto> GetDailyRevenueAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        var view = new DailyRevenueViewDto();

        try
        {
            var receipts = await _db.Receipts.AsNoTracking()
                .Where(r => r.ReceiptDate >= date && r.ReceiptDate < nextDay && r.Status == 1)
                .ToListAsync();

            // Outpatient vs Inpatient detection by MedicalRecord type
            var mrIds = receipts.Where(r => r.MedicalRecordId.HasValue).Select(r => r.MedicalRecordId!.Value).Distinct().ToList();
            var mrTypes = await _db.MedicalRecords.AsNoTracking()
                .Where(m => mrIds.Contains(m.Id))
                .Select(m => new { m.Id, MedicalRecordType = m.TreatmentType })
                .ToListAsync();

            foreach (var r in receipts)
            {
                var t = r.MedicalRecordId.HasValue
                    ? mrTypes.FirstOrDefault(m => m.Id == r.MedicalRecordId.Value)?.MedicalRecordType
                    : null;
                // type 1=Outpatient, 2=Inpatient (per most existing usage)
                if (t == 2) view.InpatientTotal += r.FinalAmount;
                else view.OutpatientTotal += r.FinalAmount;
            }

            // Group by cashier
            var cashierGroups = receipts
                .GroupBy(r => r.CashierId)
                .ToList();

            var cashierIds = cashierGroups.Select(g => g.Key).Distinct().ToList();
            var cashierMap = await _db.Users.AsNoTracking()
                .Where(u => cashierIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName })
                .ToListAsync();

            foreach (var g in cashierGroups)
            {
                var name = cashierMap.FirstOrDefault(c => c.Id == g.Key)?.FullName ?? "Không xác định";
                decimal opTotal = 0, ipTotal = 0;
                foreach (var r in g)
                {
                    var t = r.MedicalRecordId.HasValue
                        ? mrTypes.FirstOrDefault(m => m.Id == r.MedicalRecordId.Value)?.MedicalRecordType
                        : null;
                    if (t == 2) ipTotal += r.FinalAmount; else opTotal += r.FinalAmount;
                }
                view.ByCashier.Add(new CashierRevenueDto
                {
                    CashierId = g.Key,
                    CashierName = name,
                    OutpatientRevenue = opTotal,
                    InpatientRevenue = ipTotal,
                    ReceiptCount = g.Count()
                });
            }
        }
        catch
        {
            // tolerate schema drift
        }

        return view;
    }

    public async Task<List<WaitTimeByVisitTypeDto>> GetWaitTimeByVisitTypeAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);
        var results = new List<WaitTimeByVisitTypeDto>();

        try
        {
            var tickets = await _db.QueueTickets.AsNoTracking()
                .Where(q => q.CreatedAt >= date && q.CreatedAt < nextDay && q.Status >= 2)
                .ToListAsync();

            var mrIds = tickets.Where(t => t.MedicalRecordId.HasValue).Select(t => t.MedicalRecordId!.Value).Distinct().ToList();
            var mrHasCls = new Dictionary<Guid, (bool hasLab, bool hasRad)>();
            if (mrIds.Any())
            {
                var srGroups = await _db.ServiceRequests.AsNoTracking()
                    .Where(sr => mrIds.Contains(sr.MedicalRecordId) && sr.Status != 4)
                    .GroupBy(sr => sr.MedicalRecordId)
                    .Select(g => new { g.Key, HasLab = g.Any(x => x.RequestType == 1), HasRad = g.Any(x => x.RequestType == 2) })
                    .ToListAsync();
                foreach (var g in srGroups) mrHasCls[g.Key] = (g.HasLab, g.HasRad);
            }

            var groups = tickets
                .Select(t =>
                {
                    var cls = t.MedicalRecordId.HasValue && mrHasCls.TryGetValue(t.MedicalRecordId.Value, out var c) ? c : (false, false);
                    var type = cls switch { (true, true) => "KHÁM+XN+CĐHA", (true, false) => "KHÁM+XN", (false, true) => "KHÁM+CĐHA", _ => "KHÁM" };
                    var waitMin = t.CalledTime.HasValue ? (int)(t.CalledTime.Value - t.CreatedAt).TotalMinutes : 0;
                    return new { Type = type, WaitMin = Math.Max(0, waitMin) };
                })
                .GroupBy(x => x.Type);

            foreach (var g in groups)
            {
                var waits = g.Select(x => x.WaitMin).ToList();
                results.Add(new WaitTimeByVisitTypeDto
                {
                    VisitType = g.Key,
                    TotalVisits = waits.Count,
                    MinMinutes = waits.Min(),
                    MaxMinutes = waits.Max(),
                    AvgMinutes = (int)waits.Average(),
                });
            }
        }
        catch { }

        return results.OrderBy(r => r.VisitType).ToList();
    }

    public async Task<List<ClsCostByPaymentTypeDto>> GetClsCostByPaymentTypeAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);
        var results = new List<ClsCostByPaymentTypeDto>();

        try
        {
            var details = await _db.ServiceRequestDetails.AsNoTracking()
                .Include(d => d.ServiceRequest).ThenInclude(sr => sr!.MedicalRecord)
                .Include(d => d.Service).ThenInclude(s => s!.ServiceGroup)
                .Where(d => d.CreatedAt >= date && d.CreatedAt < nextDay && d.ServiceRequest != null && d.ServiceRequest.Status != 4)
                .Select(d => new
                {
                    GroupName = d.Service != null && d.Service.ServiceGroup != null ? d.Service.ServiceGroup.GroupName : "Khác",
                    PatientType = d.ServiceRequest != null && d.ServiceRequest.MedicalRecord != null ? d.ServiceRequest.MedicalRecord.PatientType : 2,
                    Amount = d.Amount,
                })
                .ToListAsync();

            var groups = details.GroupBy(d => d.GroupName);
            foreach (var g in groups)
            {
                results.Add(new ClsCostByPaymentTypeDto
                {
                    ServiceGroup = g.Key,
                    BhytAmount = g.Where(x => x.PatientType == 1).Sum(x => x.Amount),
                    FeeAmount = g.Where(x => x.PatientType == 2).Sum(x => x.Amount),
                    ServiceAmount = g.Where(x => x.PatientType == 3).Sum(x => x.Amount),
                    OtherAmount = g.Where(x => x.PatientType >= 4).Sum(x => x.Amount),
                    TotalAmount = g.Sum(x => x.Amount),
                });
            }
        }
        catch { }

        return results.OrderByDescending(r => r.TotalAmount).ToList();
    }
}
