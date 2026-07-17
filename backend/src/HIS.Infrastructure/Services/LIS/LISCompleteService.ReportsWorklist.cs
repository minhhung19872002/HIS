using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient; // GetQCReportAsync (QCResults) còn dùng raw SQL — ngoài scope #14e-B
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using HIS.Infrastructure.Services.HL7;

// Alias to avoid ambiguity
using ApproveLabResultDtoService = HIS.Application.Services.ApproveLabResultDto;


namespace HIS.Infrastructure.Services;

// K11 phien 2: tach Reports + POCT (~580 dong) vao Services/LIS/.
// K-wave5: tach them Worklist & Analyzer Integration sang LISCompleteService.Worklist.cs (~265 dong).
public partial class LISCompleteService {
    #region Báo cáo & Thống kê

    public async Task<LabRegisterReportDto> GetLabRegisterReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        // #14e-B: model 1 — ServiceRequestDetails (XN, không hủy) thay LabOrderItems JOIN LabOrders
        var result = new LabRegisterReportDto { FromDate = fromDate, ToDate = toDate, Items = new List<LabRegisterItemDto>() };
        var toDateExcl = toDate.AddDays(1);

        // 1 query cho tất cả dữ liệu cần (Id để join flagDict + ServiceId cho catalog)
        var rawRowsWithId = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.Status != 3
                        && d.ServiceRequest.RequestType == 1
                        && !d.ServiceRequest.IsDeleted
                        && d.ServiceRequest.RequestDate >= fromDate
                        && d.ServiceRequest.RequestDate < toDateExcl
                        && (!departmentId.HasValue || d.ServiceRequest.DepartmentId == departmentId.Value))
            .OrderBy(d => d.ServiceRequest.RequestDate)
            .Select(d => new
            {
                d.Id,
                d.ServiceId,
                d.Result,
                d.ReviewedAt,
                ServiceName = d.Service.ServiceName,
                RequestDate = d.ServiceRequest.RequestDate,
                PatientCode = d.ServiceRequest.MedicalRecord.Patient.PatientCode,
                PatientName = d.ServiceRequest.MedicalRecord.Patient.FullName,
                DateOfBirth = d.ServiceRequest.MedicalRecord.Patient.DateOfBirth,
                Gender = d.ServiceRequest.MedicalRecord.Patient.Gender,
                DoctorName = d.ServiceRequest.Doctor.FullName,
                DepartmentName = d.ServiceRequest.Department.DepartmentName,
            })
            .ToListAsync();

        // Catalog Unit/ReferenceRange: 1 query theo tập ServiceId (row đầu tiên mỗi ServiceId)
        var serviceIds = rawRowsWithId.Select(r => r.ServiceId).Distinct().ToList();
        var catalogDict = await _context.LisTestParameters
            .Where(p => p.ServiceId != null && serviceIds.Contains(p.ServiceId!.Value) && !p.IsDeleted)
            .GroupBy(p => p.ServiceId!.Value)
            .Select(g => g.OrderBy(p => p.SortOrder).FirstOrDefault()!)
            .ToDictionaryAsync(p => p.ServiceId!.Value, p => p);

        // Flag HH/LL/H/L từ ServiceRequestDetailParameters (bulk load theo SRD ids)
        var srdIds = rawRowsWithId.Select(r => r.Id).ToList();
        var paramFlags = await _context.ServiceRequestDetailParameters
            .Where(p => srdIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted && p.Flag != null)
            .GroupBy(p => p.ServiceRequestDetailId)
            .Select(g => new { SrdId = g.Key, Flags = g.Select(x => x.Flag!).ToList() })
            .ToListAsync();
        var flagDict = paramFlags.ToDictionary(x => x.SrdId, x => x.Flags);

        int rowNumber = 0;
        foreach (var row in rawRowsWithId)
        {
            rowNumber++;
            catalogDict.TryGetValue(row.ServiceId, out var cat);
            flagDict.TryGetValue(row.Id, out var flags);

            // Tính cờ kiểu model 3: 5=duyệt, HH=4(critical high), LL=3(critical low), H=2, L=1, 0=normal
            int statusVal;
            if (row.ReviewedAt != null && !string.IsNullOrEmpty(row.Result)) statusVal = 5;
            else if (flags != null && flags.Contains("HH")) statusVal = 4;
            else if (flags != null && flags.Contains("LL")) statusVal = 3;
            else if (flags != null && flags.Contains("H")) statusVal = 2;
            else if (flags != null && flags.Contains("L")) statusVal = 1;
            else statusVal = 0;

            var age = row.DateOfBirth.HasValue
                ? (int?)((DateTime.Now - row.DateOfBirth.Value).TotalDays / 365.25)
                : null;

            result.Items.Add(new LabRegisterItemDto
            {
                RowNumber = rowNumber,
                OrderDate = row.RequestDate,
                PatientCode = row.PatientCode ?? "",
                PatientName = row.PatientName ?? "",
                Age = age,
                Gender = row.Gender == 1 ? "Nam" : row.Gender == 2 ? "Nữ" : "",
                TestName = row.ServiceName ?? "",
                Result = row.Result ?? "",
                Unit = cat?.Unit ?? "",
                ReferenceRange = LabFlagEvaluator.BuildReferenceRange(cat?.ReferenceLow, cat?.ReferenceHigh) ?? "",
                Flag = statusVal switch { 5 => "Approved", 4 => "Critical", 3 => "Critical", 2 => "High", 1 => "Low", _ => "Normal" },
                OrderDoctorName = row.DoctorName ?? "",
            });
        }

        result.TotalOrders = result.Items.Select(i => i.PatientCode).Distinct().Count();
        result.TotalTests = result.Items.Count;
        if (departmentId.HasValue)
            result.DepartmentName = rawRowsWithId.Select(r => r.DepartmentName).FirstOrDefault() ?? "";

        return result;
    }

    public async Task<LabStatisticsDto> GetLabStatisticsAsync(DateTime fromDate, DateTime toDate, string groupBy = "day")
    {
        // #14e-B: model 1 — ServiceRequestDetails (XN, không hủy) thay LabOrderItems JOIN LabOrders
        var result = new LabStatisticsDto { FromDate = fromDate, ToDate = toDate };
        var toDateExcl = toDate.AddDays(1);

        // --- Site 2: Summary ---
        // Load projection gọn (Id phiếu + ngày + KQ + flag) vào bộ nhớ, sau đó xử lý in-memory.
        // CriticalCount: SRD có ít nhất 1 param Flag HH hoặc LL
        var summaryRows = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.Status != 3
                        && d.ServiceRequest.RequestType == 1
                        && !d.ServiceRequest.IsDeleted
                        && d.ServiceRequest.RequestDate >= fromDate
                        && d.ServiceRequest.RequestDate < toDateExcl)
            .Select(d => new
            {
                RequestId = d.ServiceRequestId,
                d.Result,
                d.ReviewedAt,
                RequestDate = d.ServiceRequest.RequestDate,
                d.ServiceRequest.DepartmentId,
                DepartmentName = d.ServiceRequest.Department.DepartmentName,
                ServiceGroupName = d.Service.ServiceGroup.GroupName,
                d.Id,
            })
            .ToListAsync();

        // CriticalCount — SRD với param HH/LL
        var srdIdsForStats = summaryRows.Select(r => r.Id).ToList();
        var criticalSrdIds = await _context.ServiceRequestDetailParameters
            .Where(p => srdIdsForStats.Contains(p.ServiceRequestDetailId)
                        && !p.IsDeleted
                        && (p.Flag == "HH" || p.Flag == "LL"))
            .Select(p => p.ServiceRequestDetailId)
            .Distinct()
            .ToListAsync();
        var criticalSet = criticalSrdIds.ToHashSet();

        result.TotalOrders = summaryRows.Select(r => r.RequestId).Distinct().Count();
        result.TotalTests = summaryRows.Count;
        result.CompletedTests = summaryRows.Count(r => r.ReviewedAt != null && !string.IsNullOrEmpty(r.Result));
        result.PendingTests = summaryRows.Count(r => string.IsNullOrEmpty(r.Result));
        result.CriticalValueCount = summaryRows.Count(r => criticalSet.Contains(r.Id));

        // --- Site 3: ByDay — group in-memory sau khi đã load projection ---
        result.ByDay = summaryRows
            .GroupBy(r => r.RequestDate.Date)
            .OrderBy(g => g.Key)
            .Select(g => new DailyLabStatDto
            {
                Date = g.Key,
                OrderCount = g.Select(r => r.RequestId).Distinct().Count(),
                TestCount = g.Count(),
                CompletedCount = g.Count(r => r.ReviewedAt != null),
            })
            .ToList();

        // --- Site 4: ByDepartment ---
        result.ByDepartment = summaryRows
            .GroupBy(r => r.DepartmentId)
            .Select(g => new DepartmentLabStatDto
            {
                DepartmentId = g.Key,
                DepartmentName = g.First().DepartmentName ?? "Chưa xác định",
                OrderCount = g.Select(r => r.RequestId).Distinct().Count(),
                TestCount = g.Count(),
            })
            .OrderByDescending(x => x.TestCount)
            .ToList();

        // ByTestType — model 1: nhóm dịch vụ từ ServiceGroup.GroupName (tương đương TestGroupName model 3)
        result.ByTestType = summaryRows
            .GroupBy(r => string.IsNullOrEmpty(r.ServiceGroupName) ? "Khác" : r.ServiceGroupName)
            .Select(g => new TestTypeStatDto
            {
                TestGroup = g.Key,
                TestCount = g.Count(),
                CompletedCount = g.Count(r => r.ReviewedAt != null),
            })
            .OrderByDescending(x => x.TestCount)
            .ToList();

        return result;
    }

    public async Task<LabRevenueReportDto> GetLabRevenueReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        // #14e-B: model 1 — ServiceRequestDetails thay LabOrderItems JOIN LabOrders
        var result = new LabRevenueReportDto { FromDate = fromDate, ToDate = toDate, Details = new List<LabRevenueItemDto>() };
        var toDateExcl = toDate.AddDays(1);

        // Load projection flat (EF GroupBy server-side có giới hạn — dùng client-side grouping)
        var flatRows = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.Status != 3
                        && d.ServiceRequest.RequestType == 1
                        && !d.ServiceRequest.IsDeleted
                        && d.ServiceRequest.RequestDate >= fromDate
                        && d.ServiceRequest.RequestDate < toDateExcl
                        && (!departmentId.HasValue || d.ServiceRequest.DepartmentId == departmentId.Value))
            .Select(d => new
            {
                d.ServiceId,
                ServiceCode = d.Service.ServiceCode,
                ServiceName = d.Service.ServiceName,
                GroupName = d.Service.ServiceGroup.GroupName,
                d.UnitPrice,
                d.Amount,
                d.InsuranceAmount,
            })
            .ToListAsync();

        var rows = flatRows
            .GroupBy(d => new { d.ServiceId, d.ServiceCode, d.ServiceName, GroupName = d.GroupName ?? "Khác" })
            .Select(g => new
            {
                g.Key.ServiceId,
                g.Key.ServiceCode,
                g.Key.ServiceName,
                GroupName = g.Key.GroupName,
                Quantity = g.Count(),
                UnitPrice = g.Max(d => d.UnitPrice),
                InsuranceAmount = g.Sum(d => d.InsuranceAmount),
                TotalAmount = g.Sum(d => d.Amount),
            })
            .OrderByDescending(x => x.Quantity)
            .ToList();

        foreach (var row in rows)
        {
            var total = row.TotalAmount > 0 ? row.TotalAmount : row.UnitPrice * row.Quantity;
            var insuranceAmt = row.InsuranceAmount;

            result.Details.Add(new LabRevenueItemDto
            {
                TestId = row.ServiceId,
                TestCode = row.ServiceCode,
                TestName = row.ServiceName,
                TestGroup = row.GroupName,
                Quantity = row.Quantity,
                UnitPrice = row.UnitPrice,
                TotalAmount = total,
                InsuranceAmount = insuranceAmt,
                PatientAmount = total - insuranceAmt
            });

            result.ActualRevenue += total;
            result.ActualCount += row.Quantity;
        }

        result.CollectedRevenue = result.ActualRevenue; // Simplified: collected = actual
        result.CollectedCount = result.ActualCount;

        return result;
    }

    public async Task<LabTATReportDto> GetLabTATReportAsync(DateTime fromDate, DateTime toDate)
    {
        // #14e-B: model 1 — TAT = ReviewedAt - RequestDate (thay ApprovedAt/ProcessingEndTime)
        var result = new LabTATReportDto { FromDate = fromDate, ToDate = toDate, TATByTest = new List<LabTATByTestDto>(), TATByDay = new List<LabTATByDayDto>() };
        var toDateExcl = toDate.AddDays(1);

        // Load projection: chỉ các SRD đã có ReviewedAt (tương đương đã duyệt — TAT có nghĩa)
        var rows = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.Status != 3
                        && d.ServiceRequest.RequestType == 1
                        && !d.ServiceRequest.IsDeleted
                        && d.ServiceRequest.RequestDate >= fromDate
                        && d.ServiceRequest.RequestDate < toDateExcl
                        && d.ReviewedAt != null)
            .Select(d => new
            {
                ServiceCode = d.Service.ServiceCode,
                ServiceName = d.Service.ServiceName,
                RequestDate = d.ServiceRequest.RequestDate,
                ReviewedAt = d.ReviewedAt!.Value,
            })
            .ToListAsync();

        // By test — group in-memory để tính TAT trung bình
        var targetTat = 60; // mặc định 60 phút
        var byTest = rows
            .GroupBy(r => new { r.ServiceCode, r.ServiceName })
            .Select(g =>
            {
                var count = g.Count();
                var avgTat = g.Count() > 0
                    ? (int)g.Average(r => (r.ReviewedAt - r.RequestDate).TotalMinutes)
                    : 0;
                return new LabTATByTestDto
                {
                    TestCode = g.Key.ServiceCode,
                    TestName = g.Key.ServiceName,
                    TestCount = count,
                    TargetTATMinutes = targetTat,
                    AverageTATMinutes = avgTat,
                    CompliancePercent = avgTat <= targetTat ? 100m : Math.Round((decimal)targetTat / avgTat * 100, 1)
                };
            })
            .OrderByDescending(x => x.TestCount)
            .ToList();

        result.TATByTest = byTest;
        result.TotalTests = byTest.Sum(t => t.TestCount);
        result.AverageTATMinutes = byTest.Any()
            ? Math.Round((decimal)byTest.Average(t => t.AverageTATMinutes), 1) : 0;
        result.TATCompliancePercent = byTest.Any()
            ? Math.Round(byTest.Average(t => t.CompliancePercent), 1) : 0;

        // By day
        result.TATByDay = rows
            .GroupBy(r => r.RequestDate.Date)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var avgTat = g.Count() > 0
                    ? (int)g.Average(r => (r.ReviewedAt - r.RequestDate).TotalMinutes)
                    : 0;
                return new LabTATByDayDto
                {
                    Date = g.Key,
                    TestCount = g.Count(),
                    AverageTATMinutes = avgTat,
                    CompliancePercent = avgTat <= 60 ? 100m : Math.Round(60m / avgTat * 100, 1)
                };
            })
            .ToList();

        return result;
    }

    public async Task<AnalyzerUtilizationReportDto> GetAnalyzerUtilizationReportAsync(DateTime fromDate, DateTime toDate, Guid? analyzerId = null)
    {
        // #14e-B: model 1 — LabOrders không còn; đếm TotalTests từ LabRawResults.AnalyzerId
        // (LabRawResults là điểm giao nhận giữa máy và hệ thống — thay thế hợp lý cho LabOrders.AnalyzerId)
        var result = new AnalyzerUtilizationReportDto { FromDate = fromDate, ToDate = toDate, Analyzers = new List<AnalyzerUtilizationItemDto>() };
        var toDateExcl = toDate.AddDays(1);

        var analyzers = await _context.LabAnalyzers
            .Where(a => !a.IsDeleted && (!analyzerId.HasValue || a.Id == analyzerId.Value))
            .ToListAsync();

        // Đếm raw results (matched) theo analyzerId trong khoảng ngày
        var countByAnalyzer = await _context.LabRawResults
            .Where(r => (!analyzerId.HasValue || r.AnalyzerId == analyzerId.Value)
                        && r.ResultTime >= fromDate && r.ResultTime < toDateExcl)
            .GroupBy(r => r.AnalyzerId)
            .Select(g => new { AnalyzerId = g.Key, Count = g.Count() })
            .ToListAsync();
        var countDict = countByAnalyzer.ToDictionary(x => x.AnalyzerId, x => x.Count);

        var days = (toDate - fromDate).Days;
        var dailyCapacity = 200; // Default daily capacity
        var totalCapacity = dailyCapacity * Math.Max(days, 1);

        result.Analyzers = analyzers
            .Select(a =>
            {
                var totalTests = countDict.TryGetValue(a.Id, out var cnt) ? cnt : 0;
                return new AnalyzerUtilizationItemDto
                {
                    AnalyzerId = a.Id,
                    AnalyzerName = a.Name,
                    TotalTests = totalTests,
                    Capacity = totalCapacity,
                    UtilizationPercent = totalCapacity > 0 ? Math.Round((decimal)totalTests / totalCapacity * 100, 1) : 0,
                    UptimePercent = 95m, // Simplified: assume 95% uptime
                    ErrorCount = 0
                };
            })
            .OrderByDescending(x => x.TotalTests)
            .ToList();

        return result;
    }

    public async Task<AbnormalRateReportDto> GetAbnormalRateReportAsync(DateTime fromDate, DateTime toDate)
    {
        // #14e-B: model 1 — cờ (H/L/HH/LL) lấy từ ServiceRequestDetailParameters thay ResultStatus model 3
        var result = new AbnormalRateReportDto { FromDate = fromDate, ToDate = toDate, ByTest = new List<AbnormalRateByTestDto>() };
        var toDateExcl = toDate.AddDays(1);

        // Load SRD có kết quả trong khoảng ngày
        var srdRows = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.Status != 3
                        && d.ServiceRequest.RequestType == 1
                        && !d.ServiceRequest.IsDeleted
                        && d.ServiceRequest.RequestDate >= fromDate
                        && d.ServiceRequest.RequestDate < toDateExcl
                        && !string.IsNullOrEmpty(d.Result))
            .Select(d => new
            {
                d.Id,
                ServiceCode = d.Service.ServiceCode,
                ServiceName = d.Service.ServiceName,
            })
            .ToListAsync();

        if (!srdRows.Any()) return result;

        var srdIds = srdRows.Select(r => r.Id).ToList();

        // Load flags từ ServiceRequestDetailParameters (worst-flag per SRD)
        var paramRows = await _context.ServiceRequestDetailParameters
            .Where(p => srdIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted && p.Flag != null && p.Flag != "N")
            .Select(p => new { p.ServiceRequestDetailId, p.Flag })
            .ToListAsync();

        // Build: per SRD Id → worst flag (HH > LL > H > L > null)
        var worstFlagBySrd = paramRows
            .GroupBy(p => p.ServiceRequestDetailId)
            .ToDictionary(g => g.Key, g =>
            {
                var flags = g.Select(x => x.Flag!).ToList();
                if (flags.Contains("HH")) return "HH";
                if (flags.Contains("LL")) return "LL";
                if (flags.Contains("H")) return "H";
                if (flags.Contains("L")) return "L";
                return (string?)null;
            });

        // Group by service + compute counts
        var byService = srdRows
            .GroupBy(r => new { r.ServiceCode, r.ServiceName })
            .Select(g =>
            {
                int total = g.Count();
                int highCount = g.Count(r => worstFlagBySrd.TryGetValue(r.Id, out var f) && f == "H");
                int lowCount = g.Count(r => worstFlagBySrd.TryGetValue(r.Id, out var f) && f == "L");
                int critCount = g.Count(r => worstFlagBySrd.TryGetValue(r.Id, out var f) && (f == "HH" || f == "LL"));
                int abnormal = highCount + lowCount + critCount;
                return new AbnormalRateByTestDto
                {
                    TestCode = g.Key.ServiceCode,
                    TestName = g.Key.ServiceName,
                    TotalCount = total,
                    AbnormalCount = abnormal,
                    AbnormalPercent = total > 0 ? Math.Round((decimal)abnormal / total * 100, 1) : 0,
                    HighCount = highCount,
                    LowCount = lowCount,
                    CriticalCount = critCount
                };
            })
            .OrderByDescending(x => x.AbnormalCount)
            .ToList();

        result.ByTest = byService;
        result.TotalTests = byService.Sum(x => x.TotalCount);
        result.AbnormalCount = byService.Sum(x => x.AbnormalCount);
        result.CriticalCount = byService.Sum(x => x.CriticalCount);
        result.AbnormalPercent = result.TotalTests > 0 ? Math.Round((decimal)result.AbnormalCount / result.TotalTests * 100, 1) : 0;
        result.CriticalPercent = result.TotalTests > 0 ? Math.Round((decimal)result.CriticalCount / result.TotalTests * 100, 1) : 0;

        return result;
    }

    public async Task<QCReportDto> GetQCReportAsync(DateTime fromDate, DateTime toDate, Guid? analyzerId = null)
    {
        var result = new QCReportDto { FromDate = fromDate, ToDate = toDate, ByAnalyzer = new List<QCReportByAnalyzerDto>() };

        // Query QC results from QCResults table (created by LabQC module)
        var sql = @"
            SELECT a.Id AS AnalyzerId, a.AnalyzerName,
                   COUNT(qr.Id) AS TotalRuns,
                   SUM(CASE WHEN qr.IsAccepted = 1 THEN 1 ELSE 0 END) AS AcceptedRuns,
                   SUM(CASE WHEN qr.IsAccepted = 0 THEN 1 ELSE 0 END) AS RejectedRuns
            FROM LabAnalyzers a
            LEFT JOIN QCResults qr ON qr.AnalyzerId = a.Id
                AND qr.RunDate >= @FromDate AND qr.RunDate < @ToDate
            WHERE a.IsDeleted = 0";

        if (analyzerId.HasValue) sql += " AND a.Id = @AnalyzerId";
        sql += " GROUP BY a.Id, a.AnalyzerName ORDER BY TotalRuns DESC";

        try
        {
            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();
            using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            if (analyzerId.HasValue) cmd.Parameters.AddWithValue("@AnalyzerId", analyzerId.Value);

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var total = reader.GetInt32(2);
                var accepted = reader.GetInt32(3);
                result.ByAnalyzer.Add(new QCReportByAnalyzerDto
                {
                    AnalyzerId = reader.GetGuid(0),
                    AnalyzerName = reader.GetString(1),
                    TotalQCRuns = total,
                    AcceptedRuns = accepted,
                    RejectedRuns = reader.GetInt32(4),
                    AcceptanceRate = total > 0 ? Math.Round((decimal)accepted / total * 100, 1) : 0,
                    ByTest = new List<QCReportByTestDto>()
                });
            }
        }
        catch (SqlException ex) when (ex.Message.Contains("Invalid object name") || ex.Message.Contains("Invalid column"))
        {
            // QCResults table may not exist yet
            _logger.LogWarning("QCResults table not found for QC report: {Message}", ex.Message);
        }

        return result;
    }

    public async Task<byte[]> ExportLabDataForBHXHAsync(DateTime fromDate, DateTime toDate)
    {
        return System.Text.Encoding.UTF8.GetBytes($"<?xml version=\"1.0\"?><LabData><From>{fromDate:yyyy-MM-dd}</From><To>{toDate:yyyy-MM-dd}</To></LabData>");
    }

    #endregion

    #region POCT & Microbiology

    public async Task<List<POCTDeviceDto>> GetPOCTDevicesAsync(string keyword = null) => new List<POCTDeviceDto>();
    public async Task<bool> EnterPOCTResultAsync(EnterPOCTResultDto dto) => true;
    public async Task<SyncPOCTResultDto> SyncPOCTResultsAsync(Guid deviceId) => new SyncPOCTResultDto();

    /// <summary>
    /// Legacy method — returns stub list of MicrobiologyCultureDto (old interface).
    /// Real data is served by GetMicrobiologyCulturesV2Async via the v2 FE routes.
    /// </summary>
    public async Task<List<MicrobiologyCultureDto>> GetMicrobiologyCulturesAsync(DateTime fromDate, DateTime toDate, string status = null)
    {
        // Bridge: pull real data and map to legacy DTO shape
        var cultures = await _context.MicrobiologyCultures
            .Where(c => c.CultureDate >= fromDate && c.CultureDate <= toDate)
            .OrderByDescending(c => c.CultureDate)
            .Take(200)
            .ToListAsync();

        return cultures.Select(c => new MicrobiologyCultureDto
        {
            Id = c.Id,
            OrderId = c.LabRequestId ?? c.Id,
            OrderCode = c.RequestCode,
            PatientId = c.PatientId ?? Guid.Empty,
            PatientName = c.PatientName,
            SampleType = c.SampleType,
            CollectionDate = c.CultureDate,
            CultureStartDate = c.IncubationStart,
            Status = c.Status switch { 0 => "Pending", 1 => "InProgress", 3 => "NoGrowth", 5 => "Completed", _ => "InProgress" },
            ReportDate = c.ResultDate,
            TechnicianName = c.CreatedBy ?? string.Empty,
        }).ToList();
    }

    // EnterCultureResultAsync, EnterAntibioticSensitivityAsync, GetAntibioticsAsync, GetBacteriasAsync
    // are implemented in LISCompleteService.Microbiology.cs (G-19)

    public async Task<MicrobiologyStatisticsDto> GetMicrobiologyStatisticsAsync(DateTime fromDate, DateTime toDate)
    {
        var total = await _context.MicrobiologyCultures
            .CountAsync(c => c.CultureDate >= fromDate && c.CultureDate <= toDate);
        var positive = await _context.MicrobiologyCultures
            .CountAsync(c => c.CultureDate >= fromDate && c.CultureDate <= toDate && c.Status >= 2 && c.Status != 3);

        return new MicrobiologyStatisticsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalCultures = total,
            PositiveCultures = positive,
            PositiveRate = total > 0 ? Math.Round((decimal)positive / total * 100, 1) : 0,
        };
    }

    #endregion
}
