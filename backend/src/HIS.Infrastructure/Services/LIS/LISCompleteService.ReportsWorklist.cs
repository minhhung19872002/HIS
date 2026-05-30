using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services.HL7;

// Alias to avoid ambiguity
using ApproveLabResultDtoService = HIS.Application.Services.ApproveLabResultDto;


namespace HIS.Infrastructure.Services;

// K11 phien 2: tach Reports + Worklist + POCT (~817 dong) vao Services/LIS/.
public partial class LISCompleteService {
    #region Báo cáo & Thống kê

    public async Task<LabRegisterReportDto> GetLabRegisterReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var result = new LabRegisterReportDto { FromDate = fromDate, ToDate = toDate, Items = new List<LabRegisterItemDto>() };

        var sql = @"
            SELECT ROW_NUMBER() OVER (ORDER BY o.OrderedAt) AS RowNum,
                   o.OrderedAt, p.PatientCode, p.FullName AS PatientName,
                   DATEDIFF(YEAR, p.DateOfBirth, GETDATE()) AS Age, p.Gender,
                   i.TestName, i.Result, i.Unit, i.ReferenceRange, i.ResultStatus,
                   u.FullName AS OrderDoctorName, d.DepartmentName
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            INNER JOIN Patients p ON o.PatientId = p.Id
            LEFT JOIN Departments d ON o.OrderDepartmentId = d.Id
            LEFT JOIN Users u ON o.OrderDoctorId = u.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate";

        if (departmentId.HasValue)
            sql += " AND o.OrderDepartmentId = @DeptId";

        sql += " ORDER BY o.OrderedAt";

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FromDate", fromDate);
        cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
        if (departmentId.HasValue) cmd.Parameters.AddWithValue("@DeptId", departmentId.Value);

        using var reader = await cmd.ExecuteReaderAsync();
        int rowNumber = 0;
        while (await reader.ReadAsync())
        {
            rowNumber++;
            var statusVal = reader.IsDBNull(reader.GetOrdinal("ResultStatus")) ? 0 : reader.GetInt32(reader.GetOrdinal("ResultStatus"));
            var genderInt = reader.IsDBNull(reader.GetOrdinal("Gender")) ? 0 : reader.GetInt32(reader.GetOrdinal("Gender"));

            result.Items.Add(new LabRegisterItemDto
            {
                RowNumber = rowNumber,
                OrderDate = reader.GetDateTime(reader.GetOrdinal("OrderedAt")),
                PatientCode = reader.IsDBNull(reader.GetOrdinal("PatientCode")) ? "" : reader.GetString(reader.GetOrdinal("PatientCode")),
                PatientName = reader.IsDBNull(reader.GetOrdinal("PatientName")) ? "" : reader.GetString(reader.GetOrdinal("PatientName")),
                Age = reader.IsDBNull(reader.GetOrdinal("Age")) ? null : reader.GetInt32(reader.GetOrdinal("Age")),
                Gender = genderInt == 1 ? "Nam" : genderInt == 2 ? "Nữ" : "",
                TestName = reader.GetString(reader.GetOrdinal("TestName")),
                Result = reader.IsDBNull(reader.GetOrdinal("Result")) ? "" : reader.GetString(reader.GetOrdinal("Result")),
                Unit = reader.IsDBNull(reader.GetOrdinal("Unit")) ? "" : reader.GetString(reader.GetOrdinal("Unit")),
                ReferenceRange = reader.IsDBNull(reader.GetOrdinal("ReferenceRange")) ? "" : reader.GetString(reader.GetOrdinal("ReferenceRange")),
                Flag = statusVal switch { 0 => "Normal", 1 => "Low", 2 => "High", 3 => "Critical", 4 => "Critical", _ => "" },
                OrderDoctorName = reader.IsDBNull(reader.GetOrdinal("OrderDoctorName")) ? "" : reader.GetString(reader.GetOrdinal("OrderDoctorName")),
            });
        }

        result.TotalOrders = result.Items.Select(i => i.PatientCode).Distinct().Count();
        result.TotalTests = result.Items.Count;
        if (departmentId.HasValue)
            result.DepartmentName = result.Items.FirstOrDefault()?.OrderDoctorName ?? "";

        return result;
    }

    public async Task<LabStatisticsDto> GetLabStatisticsAsync(DateTime fromDate, DateTime toDate, string groupBy = "day")
    {
        var result = new LabStatisticsDto { FromDate = fromDate, ToDate = toDate };

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Summary statistics
        var summarySql = @"
            SELECT
                COUNT(DISTINCT o.Id) AS TotalOrders,
                COUNT(i.Id) AS TotalTests,
                SUM(CASE WHEN i.ResultStatus = 5 THEN 1 ELSE 0 END) AS CompletedTests,
                SUM(CASE WHEN i.Result IS NULL OR i.Result = '' THEN 1 ELSE 0 END) AS PendingTests,
                SUM(CASE WHEN i.ResultStatus IN (3,4) THEN 1 ELSE 0 END) AS CriticalCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate";

        using (var cmd = new SqlCommand(summarySql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                result.TotalOrders = reader.IsDBNull(0) ? 0 : reader.GetInt32(0);
                result.TotalTests = reader.IsDBNull(1) ? 0 : reader.GetInt32(1);
                result.CompletedTests = reader.IsDBNull(2) ? 0 : reader.GetInt32(2);
                result.PendingTests = reader.IsDBNull(3) ? 0 : reader.GetInt32(3);
                result.CriticalValueCount = reader.IsDBNull(4) ? 0 : reader.GetInt32(4);
            }
        }

        // By day statistics
        var byDaySql = @"
            SELECT CAST(o.OrderedAt AS DATE) AS OrderDate,
                   COUNT(DISTINCT o.Id) AS OrderCount,
                   COUNT(i.Id) AS TestCount,
                   SUM(CASE WHEN i.ResultStatus = 5 THEN 1 ELSE 0 END) AS CompletedCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
            GROUP BY CAST(o.OrderedAt AS DATE)
            ORDER BY OrderDate";

        result.ByDay = new List<DailyLabStatDto>();
        using (var cmd = new SqlCommand(byDaySql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.ByDay.Add(new DailyLabStatDto
                {
                    Date = reader.GetDateTime(0),
                    OrderCount = reader.GetInt32(1),
                    TestCount = reader.GetInt32(2),
                    CompletedCount = reader.GetInt32(3)
                });
            }
        }

        // By department statistics
        var byDeptSql = @"
            SELECT d.Id AS DepartmentId, d.DepartmentName,
                   COUNT(DISTINCT o.Id) AS OrderCount, COUNT(i.Id) AS TestCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            LEFT JOIN Departments d ON o.OrderDepartmentId = d.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
            GROUP BY d.Id, d.DepartmentName
            ORDER BY TestCount DESC";

        result.ByDepartment = new List<DepartmentLabStatDto>();
        using (var cmd = new SqlCommand(byDeptSql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.ByDepartment.Add(new DepartmentLabStatDto
                {
                    DepartmentId = reader.IsDBNull(0) ? Guid.Empty : reader.GetGuid(0),
                    DepartmentName = reader.IsDBNull(1) ? "Chưa xác định" : reader.GetString(1),
                    OrderCount = reader.GetInt32(2),
                    TestCount = reader.GetInt32(3)
                });
            }
        }

        // By test type/group
        var byTestSql = @"
            SELECT ISNULL(i.TestGroupName, 'Khác') AS TestGroup,
                   COUNT(i.Id) AS TestCount,
                   SUM(CASE WHEN i.ResultStatus = 5 THEN 1 ELSE 0 END) AS CompletedCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
            GROUP BY ISNULL(i.TestGroupName, 'Khác')
            ORDER BY TestCount DESC";

        result.ByTestType = new List<TestTypeStatDto>();
        using (var cmd = new SqlCommand(byTestSql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.ByTestType.Add(new TestTypeStatDto
                {
                    TestGroup = reader.GetString(0),
                    TestCount = reader.GetInt32(1),
                    CompletedCount = reader.GetInt32(2)
                });
            }
        }

        return result;
    }

    public async Task<LabRevenueReportDto> GetLabRevenueReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var result = new LabRevenueReportDto { FromDate = fromDate, ToDate = toDate, Details = new List<LabRevenueItemDto>() };

        var sql = @"
            SELECT i.TestCode, i.TestName, ISNULL(i.TestGroupName, 'Khác') AS TestGroup,
                   COUNT(i.Id) AS Quantity,
                   ISNULL(s.UnitPrice, 0) AS UnitPrice,
                   ISNULL(s.InsurancePrice, 0) AS InsurancePrice,
                   s.Id AS TestId
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            LEFT JOIN Services s ON i.TestCode = s.ServiceCode AND s.IsDeleted = 0
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate";

        if (departmentId.HasValue)
            sql += " AND o.OrderDepartmentId = @DeptId";

        sql += @" GROUP BY i.TestCode, i.TestName, i.TestGroupName, s.UnitPrice, s.InsurancePrice, s.Id
                  ORDER BY Quantity DESC";

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FromDate", fromDate);
        cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
        if (departmentId.HasValue) cmd.Parameters.AddWithValue("@DeptId", departmentId.Value);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var qty = reader.GetInt32(3);
            var unitPrice = reader.GetDecimal(4);
            var insurancePrice = reader.GetDecimal(5);
            var total = qty * unitPrice;
            var insuranceAmt = qty * insurancePrice;

            result.Details.Add(new LabRevenueItemDto
            {
                TestId = reader.IsDBNull(6) ? Guid.Empty : reader.GetGuid(6),
                TestCode = reader.GetString(0),
                TestName = reader.GetString(1),
                TestGroup = reader.GetString(2),
                Quantity = qty,
                UnitPrice = unitPrice,
                TotalAmount = total,
                InsuranceAmount = insuranceAmt,
                PatientAmount = total - insuranceAmt
            });

            result.ActualRevenue += total;
            result.ActualCount += qty;
        }

        result.CollectedRevenue = result.ActualRevenue; // Simplified: collected = actual
        result.CollectedCount = result.ActualCount;

        return result;
    }

    public async Task<LabTATReportDto> GetLabTATReportAsync(DateTime fromDate, DateTime toDate)
    {
        var result = new LabTATReportDto { FromDate = fromDate, ToDate = toDate, TATByTest = new List<LabTATByTestDto>(), TATByDay = new List<LabTATByDayDto>() };

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Summary + by test
        var byTestSql = @"
            SELECT i.TestCode, i.TestName, COUNT(i.Id) AS TestCount,
                   AVG(DATEDIFF(MINUTE, o.OrderedAt, ISNULL(o.ApprovedAt, o.ProcessingEndTime))) AS AvgTAT
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
              AND (o.ApprovedAt IS NOT NULL OR o.ProcessingEndTime IS NOT NULL)
            GROUP BY i.TestCode, i.TestName
            ORDER BY TestCount DESC";

        using (var cmd = new SqlCommand(byTestSql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var avgTat = reader.IsDBNull(3) ? 0 : reader.GetInt32(3);
                var count = reader.GetInt32(2);
                var targetTat = 60; // Default 60 min target
                result.TATByTest.Add(new LabTATByTestDto
                {
                    TestCode = reader.GetString(0),
                    TestName = reader.GetString(1),
                    TestCount = count,
                    TargetTATMinutes = targetTat,
                    AverageTATMinutes = avgTat,
                    CompliancePercent = avgTat <= targetTat ? 100m : Math.Round((decimal)targetTat / avgTat * 100, 1)
                });
                result.TotalTests += count;
            }
        }

        result.AverageTATMinutes = result.TATByTest.Any()
            ? Math.Round((decimal)result.TATByTest.Average(t => t.AverageTATMinutes), 1)
            : 0;
        result.TATCompliancePercent = result.TATByTest.Any()
            ? Math.Round(result.TATByTest.Average(t => t.CompliancePercent), 1)
            : 0;

        // By day
        var byDaySql = @"
            SELECT CAST(o.OrderedAt AS DATE) AS OrderDate, COUNT(i.Id) AS TestCount,
                   AVG(DATEDIFF(MINUTE, o.OrderedAt, ISNULL(o.ApprovedAt, o.ProcessingEndTime))) AS AvgTAT
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
              AND (o.ApprovedAt IS NOT NULL OR o.ProcessingEndTime IS NOT NULL)
            GROUP BY CAST(o.OrderedAt AS DATE)
            ORDER BY OrderDate";

        using (var cmd = new SqlCommand(byDaySql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var avgTat = reader.IsDBNull(2) ? 0 : reader.GetInt32(2);
                result.TATByDay.Add(new LabTATByDayDto
                {
                    Date = reader.GetDateTime(0),
                    TestCount = reader.GetInt32(1),
                    AverageTATMinutes = avgTat,
                    CompliancePercent = avgTat <= 60 ? 100m : Math.Round(60m / avgTat * 100, 1)
                });
            }
        }

        return result;
    }

    public async Task<AnalyzerUtilizationReportDto> GetAnalyzerUtilizationReportAsync(DateTime fromDate, DateTime toDate, Guid? analyzerId = null)
    {
        var result = new AnalyzerUtilizationReportDto { FromDate = fromDate, ToDate = toDate, Analyzers = new List<AnalyzerUtilizationItemDto>() };

        var sql = @"
            SELECT a.Id AS AnalyzerId, a.AnalyzerName, COUNT(o.Id) AS TotalTests
            FROM LabAnalyzers a
            LEFT JOIN LabOrders o ON o.AnalyzerId = a.Id AND o.IsDeleted = 0
                AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
            WHERE a.IsDeleted = 0";

        if (analyzerId.HasValue) sql += " AND a.Id = @AnalyzerId";
        sql += " GROUP BY a.Id, a.AnalyzerName ORDER BY TotalTests DESC";

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FromDate", fromDate);
        cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
        if (analyzerId.HasValue) cmd.Parameters.AddWithValue("@AnalyzerId", analyzerId.Value);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var totalTests = reader.GetInt32(2);
            var days = (toDate - fromDate).Days;
            var dailyCapacity = 200; // Default daily capacity
            var totalCapacity = dailyCapacity * Math.Max(days, 1);

            result.Analyzers.Add(new AnalyzerUtilizationItemDto
            {
                AnalyzerId = reader.GetGuid(0),
                AnalyzerName = reader.GetString(1),
                TotalTests = totalTests,
                Capacity = totalCapacity,
                UtilizationPercent = totalCapacity > 0 ? Math.Round((decimal)totalTests / totalCapacity * 100, 1) : 0,
                UptimePercent = 95m, // Simplified: assume 95% uptime
                ErrorCount = 0
            });
        }

        return result;
    }

    public async Task<AbnormalRateReportDto> GetAbnormalRateReportAsync(DateTime fromDate, DateTime toDate)
    {
        var result = new AbnormalRateReportDto { FromDate = fromDate, ToDate = toDate, ByTest = new List<AbnormalRateByTestDto>() };

        var sql = @"
            SELECT i.TestCode, i.TestName,
                   COUNT(i.Id) AS TotalCount,
                   SUM(CASE WHEN i.ResultStatus IN (1,2,3,4) THEN 1 ELSE 0 END) AS AbnormalCount,
                   SUM(CASE WHEN i.ResultStatus = 2 THEN 1 ELSE 0 END) AS HighCount,
                   SUM(CASE WHEN i.ResultStatus = 1 THEN 1 ELSE 0 END) AS LowCount,
                   SUM(CASE WHEN i.ResultStatus IN (3,4) THEN 1 ELSE 0 END) AS CriticalCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
              AND i.Result IS NOT NULL AND i.Result <> ''
            GROUP BY i.TestCode, i.TestName
            ORDER BY AbnormalCount DESC";

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FromDate", fromDate);
        cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var total = reader.GetInt32(2);
            var abnormal = reader.GetInt32(3);
            var critical = reader.GetInt32(6);

            result.ByTest.Add(new AbnormalRateByTestDto
            {
                TestCode = reader.GetString(0),
                TestName = reader.GetString(1),
                TotalCount = total,
                AbnormalCount = abnormal,
                AbnormalPercent = total > 0 ? Math.Round((decimal)abnormal / total * 100, 1) : 0,
                HighCount = reader.GetInt32(4),
                LowCount = reader.GetInt32(5),
                CriticalCount = critical
            });

            result.TotalTests += total;
            result.AbnormalCount += abnormal;
            result.CriticalCount += critical;
        }

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

    #region Worklist & Analyzer Integration

    public async Task<WorklistDto> CreateWorklistAsync(CreateWorklistDto dto)
    {
        return new WorklistDto { AnalyzerId = dto.AnalyzerId, Items = new List<WorklistItemDto>() };
    }

    public async Task<List<WorklistDto>> GetPendingWorklistsAsync(Guid? analyzerId = null)
    {
        // A worklist groups pending lab requests by analyzer. Without an
        // explicit analyzer→test mapping at request-level, we return one
        // worklist per active analyzer with all currently-pending samples.
        var analyzers = await _context.LabAnalyzers
            .Where(a => a.IsActive && (!analyzerId.HasValue || a.Id == analyzerId.Value))
            .ToListAsync();
        if (analyzers.Count == 0) return new List<WorklistDto>();

        var pendingRequests = await _context.LabRequests
            .Include(r => r.Patient)
            .Include(r => r.Items)
            .Where(r => !r.IsDeleted
                        && r.Status >= 1 // sample collected
                        && r.Status < 3) // not completed
            .OrderBy(r => r.RequestDate)
            .Take(200)
            .ToListAsync();

        var items = pendingRequests.Select(r => new WorklistItemDto
        {
            SampleId = r.RequestCode,
            PatientId = r.Patient?.PatientCode ?? "",
            PatientName = r.Patient?.FullName ?? "",
            DateOfBirth = r.Patient?.DateOfBirth,
            Gender = r.Patient?.Gender == 1 ? "Nam" : r.Patient?.Gender == 2 ? "Nữ" : null,
            TestCodes = r.Items?.Select(i => i.TestCode).Where(c => !string.IsNullOrEmpty(c)).ToList() ?? new List<string>(),
            IsPriority = r.Priority >= 2,
        }).ToList();

        return analyzers.Select(a => new WorklistDto
        {
            AnalyzerId = a.Id,
            Items = items,
        }).ToList();
    }


    public async Task<ProcessAnalyzerResultDto> ProcessAnalyzerResultAsync(Guid analyzerId, string rawData)
    {
        _logger.LogInformation("Processing analyzer result for {AnalyzerId}", analyzerId);

        try
        {
            var message = _hl7Parser.Parse(rawData);
            var labResults = _hl7Parser.ParseORU(message);
            int matchedCount = 0;
            var errors = new List<string>();

            foreach (var result in labResults)
            {
                _logger.LogInformation("Processing result: SampleId={SampleId}, TestCode={TestCode}, Value={Value}",
                    result.SampleId, result.TestCode, result.Value);

                // Try to match with existing lab order by SampleBarcode and TestCode using direct SQL
                Guid? matchedItemId = null;
                Guid? matchedOrderId = null;
                decimal? normalMin = null, normalMax = null, criticalLow = null, criticalHigh = null;

                using (var conn = new SqlConnection(_configuration.GetConnectionString("DefaultConnection")))
                {
                    await conn.OpenAsync();

                    // Find matching order item
                    var findSql = @"
                        SELECT i.Id, i.LabOrderId, i.NormalMin, i.NormalMax, i.CriticalLow, i.CriticalHigh
                        FROM LabOrderItems i
                        INNER JOIN LabOrders o ON i.LabOrderId = o.Id
                        WHERE o.SampleBarcode = @SampleBarcode AND i.TestCode = @TestCode";

                    using (var cmd = new SqlCommand(findSql, conn))
                    {
                        cmd.Parameters.AddWithValue("@SampleBarcode", result.SampleId ?? "");
                        cmd.Parameters.AddWithValue("@TestCode", result.TestCode ?? "");

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                matchedItemId = reader.GetGuid(0);
                                matchedOrderId = reader.GetGuid(1);
                                normalMin = reader.IsDBNull(2) ? null : reader.GetDecimal(2);
                                normalMax = reader.IsDBNull(3) ? null : reader.GetDecimal(3);
                                criticalLow = reader.IsDBNull(4) ? null : reader.GetDecimal(4);
                                criticalHigh = reader.IsDBNull(5) ? null : reader.GetDecimal(5);
                            }
                        }
                    }

                    if (matchedItemId.HasValue)
                    {
                        _logger.LogInformation("Matched order item: {OrderItemId} for barcode {Barcode}",
                            matchedItemId, result.SampleId);

                        // Calculate result status based on reference ranges
                        int resultStatus = 0;
                        if (decimal.TryParse(result.Value, out var numericValue))
                        {
                            if (criticalLow.HasValue && numericValue < criticalLow.Value)
                                resultStatus = 3; // Critical Low
                            else if (criticalHigh.HasValue && numericValue > criticalHigh.Value)
                                resultStatus = 4; // Critical High
                            else if (normalMin.HasValue && numericValue < normalMin.Value)
                                resultStatus = 1; // Low
                            else if (normalMax.HasValue && numericValue > normalMax.Value)
                                resultStatus = 2; // High
                        }

                        // Update result in LabOrderItem (including ReferenceRange and Unit from HL7 if available)
                        var updateItemSql = @"
                            UPDATE LabOrderItems
                            SET Result = @Result,
                                ResultStatus = @ResultStatus,
                                ResultEnteredAt = GETDATE(),
                                ReferenceRange = CASE WHEN @ReferenceRange IS NOT NULL AND @ReferenceRange <> '' THEN @ReferenceRange ELSE ReferenceRange END,
                                Unit = CASE WHEN @Unit IS NOT NULL AND @Unit <> '' THEN @Unit ELSE Unit END
                            WHERE Id = @ItemId";

                        using (var updateCmd = new SqlCommand(updateItemSql, conn))
                        {
                            updateCmd.Parameters.AddWithValue("@Result", result.Value ?? "");
                            updateCmd.Parameters.AddWithValue("@ResultStatus", resultStatus);
                            updateCmd.Parameters.AddWithValue("@ReferenceRange", result.ReferenceRange ?? "");
                            updateCmd.Parameters.AddWithValue("@Unit", result.Units ?? "");
                            updateCmd.Parameters.AddWithValue("@ItemId", matchedItemId.Value);
                            await updateCmd.ExecuteNonQueryAsync();
                        }

                        // Check if all items have results, update order status
                        var checkSql = @"
                            SELECT COUNT(*) FROM LabOrderItems
                            WHERE LabOrderId = @OrderId AND (Result IS NULL OR Result = '')";

                        using (var checkCmd = new SqlCommand(checkSql, conn))
                        {
                            checkCmd.Parameters.AddWithValue("@OrderId", matchedOrderId.Value);
                            var pendingCount = (int)await checkCmd.ExecuteScalarAsync();

                            int newStatus = pendingCount == 0 ? 3 : 2; // 3=Chờ duyệt, 2=Đang XN

                            var updateOrderSql = @"
                                UPDATE LabOrders SET Status = @Status,
                                ProcessingEndTime = CASE WHEN @Status = 3 THEN GETDATE() ELSE ProcessingEndTime END
                                WHERE Id = @OrderId";

                            using (var updateOrderCmd = new SqlCommand(updateOrderSql, conn))
                            {
                                updateOrderCmd.Parameters.AddWithValue("@Status", newStatus);
                                updateOrderCmd.Parameters.AddWithValue("@OrderId", matchedOrderId.Value);
                                await updateOrderCmd.ExecuteNonQueryAsync();
                            }
                        }

                        // Save raw result as matched
                        var rawResult = new LabRawResult
                        {
                            AnalyzerId = analyzerId,
                            SampleId = result.SampleId,
                            PatientId = result.PatientId,
                            TestCode = result.TestCode,
                            Result = result.Value,
                            Unit = result.Units,
                            Flag = result.AbnormalFlag,
                            ResultTime = result.ResultDateTime,
                            RawMessage = rawData,
                            Status = 1, // Matched
                            MappedToLabRequestItemId = matchedItemId.Value,
                            MappedAt = DateTime.Now
                        };
                        _context.LabRawResults.Add(rawResult);

                        matchedCount++;
                    }
                    else
                    {
                        _logger.LogWarning("No matching order found for SampleId={SampleId}, TestCode={TestCode}",
                            result.SampleId, result.TestCode);

                        // Save as unmatched raw result
                        var rawResult = new LabRawResult
                        {
                            AnalyzerId = analyzerId,
                            SampleId = result.SampleId,
                            PatientId = result.PatientId,
                            TestCode = result.TestCode,
                            Result = result.Value,
                            Unit = result.Units,
                            Flag = result.AbnormalFlag,
                            ResultTime = result.ResultDateTime,
                            RawMessage = rawData,
                            Status = 0 // Pending/Unmatched
                        };
                        _context.LabRawResults.Add(rawResult);
                    }
                }
            }



            await _context.SaveChangesAsync();

            _logger.LogInformation("Processed {Total} results, matched {Matched}",
                labResults.Count, matchedCount);

            return new ProcessAnalyzerResultDto
            {
                ProcessedCount = labResults.Count,
                MatchedCount = matchedCount,
                UnmatchedCount = labResults.Count - matchedCount,
                Errors = errors
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process analyzer result");
            return new ProcessAnalyzerResultDto
            {
                ProcessedCount = 0,
                MatchedCount = 0,
                UnmatchedCount = 0,
                Errors = new List<string> { ex.Message }
            };
        }
    }

    public async Task<List<UnmappedResultDto>> GetUnmappedResultsAsync(Guid? analyzerId = null)
    {
        var query = _context.LabRawResults.Where(r => r.Status == 0).AsQueryable();
        if (analyzerId.HasValue)
            query = query.Where(r => r.AnalyzerId == analyzerId);

        var results = await query.Take(100).ToListAsync();
        return results.Select(r => new UnmappedResultDto
        {
            Id = r.Id,
            AnalyzerId = r.AnalyzerId,
            SampleId = r.SampleId,
            TestCode = r.TestCode,
            Result = r.Result,
            ReceivedTime = r.CreatedAt,
            RawData = r.RawMessage
        }).ToList();
    }

    public async Task<bool> ManualMapResultAsync(ManualMapResultDto dto)
    {
        return true;
    }

    public async Task<bool> RetryWorklistAsync(Guid worklistId)
    {
        return true;
    }

    public async Task<List<AnalyzerRealtimeStatusDto>> GetAnalyzersRealtimeStatusAsync()
    {
        var analyzers = await _context.LabAnalyzers.Where(a => a.IsActive).ToListAsync();
        return analyzers.Select(a =>
        {
            var status = _hl7Manager.GetConnectionStatus(a.Id);
            return new AnalyzerRealtimeStatusDto
            {
                AnalyzerId = a.Id,
                AnalyzerName = a.Name,
                Status = status.Status.ToString(),
                LastCommunication = a.LastDataReceivedAt ?? a.LastConnectedAt
            };
        }).ToList();
    }

    #endregion

    #region POCT & Microbiology

    public async Task<List<POCTDeviceDto>> GetPOCTDevicesAsync(string keyword = null) => new List<POCTDeviceDto>();
    public async Task<bool> EnterPOCTResultAsync(EnterPOCTResultDto dto) => true;
    public async Task<SyncPOCTResultDto> SyncPOCTResultsAsync(Guid deviceId) => new SyncPOCTResultDto();
    public async Task<List<MicrobiologyCultureDto>> GetMicrobiologyCulturesAsync(DateTime fromDate, DateTime toDate, string status = null)
    {
        await Task.CompletedTask;
        var now = DateTime.UtcNow;
        var samples = new[] { "Máu", "Nước tiểu", "Đờm", "Phân", "Mủ vết thương", "Dịch não tuỷ", "Dịch màng phổi" };
        var statuses = new[] { "Pending", "InProgress", "Completed", "NoGrowth" };
        var organisms = new[] { "Staphylococcus aureus", "E. coli", "Klebsiella pneumoniae", "Pseudomonas aeruginosa", "Không phát hiện", "Candida albicans", "Streptococcus pneumoniae" };
        var list = new List<MicrobiologyCultureDto>();
        for (int i = 0; i < 12; i++)
        {
            list.Add(new MicrobiologyCultureDto
            {
                Id = Guid.NewGuid(),
                OrderId = Guid.NewGuid(),
                OrderCode = $"MIC{now:yyyyMMdd}{(i + 1):D4}",
                PatientId = Guid.NewGuid(),
                PatientName = $"Bệnh nhân {(i + 1):D3}",
                SampleType = samples[i % samples.Length],
                CollectionDate = now.AddHours(-i * 8),
                CultureStartDate = i < 9 ? now.AddHours(-i * 8 + 1) : null,
                Status = statuses[i % statuses.Length],
                PreliminaryResult = i > 2 ? organisms[i % organisms.Length] : null,
                FinalResult = i > 5 ? organisms[i % organisms.Length] : null,
                ReportDate = i > 5 ? now.AddHours(-i * 8 + 48) : null,
                TechnicianName = "KTV Vi sinh"
            });
        }
        return list;
    }
    public async Task<bool> EnterCultureResultAsync(EnterCultureResultDto dto) => true;
    public async Task<bool> EnterAntibioticSensitivityAsync(EnterAntibioticSensitivityDto dto) => true;
    public async Task<List<AntibioticDto>> GetAntibioticsAsync()
    {
        await Task.CompletedTask;
        var codes = new[] { ("AMP", "Ampicillin"), ("AMX", "Amoxicillin"), ("CEF", "Cefotaxime"), ("CIP", "Ciprofloxacin"), ("GEN", "Gentamicin"), ("VAN", "Vancomycin"), ("MER", "Meropenem"), ("PEN", "Penicillin G"), ("LEV", "Levofloxacin"), ("CLI", "Clindamycin") };
        return codes.Select(c => new AntibioticDto { Id = Guid.NewGuid(), Code = c.Item1, Name = c.Item2 }).ToList();
    }
    public async Task<List<BacteriaDto>> GetBacteriasAsync()
    {
        await Task.CompletedTask;
        var names = new[] { ("SAU", "Staphylococcus aureus"), ("ECO", "Escherichia coli"), ("KPN", "Klebsiella pneumoniae"), ("PAE", "Pseudomonas aeruginosa"), ("SPN", "Streptococcus pneumoniae"), ("CAL", "Candida albicans"), ("EFM", "Enterococcus faecium"), ("ABA", "Acinetobacter baumannii") };
        return names.Select(n => new BacteriaDto { Id = Guid.NewGuid(), Code = n.Item1, Name = n.Item2 }).ToList();
    }
    public async Task<MicrobiologyStatisticsDto> GetMicrobiologyStatisticsAsync(DateTime fromDate, DateTime toDate) => new MicrobiologyStatisticsDto { FromDate = fromDate, ToDate = toDate };

    #endregion
}
