using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
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

// #364 wave-8b (2026-07-17): tach History/DeltaCheck/QC/LevyJennings/GetLabOrdersByAdmission khoi LISCompleteService.Execute.cs
public partial class LISCompleteService {

    public async Task<List<LabResultHistoryDto>> GetLabResultHistoryAsync(Guid patientId, string testCode = null, int? lastNMonths = 12)
    {
        var months = lastNMonths ?? 12;
        var fromDate = DateTime.Now.AddMonths(-months);

        // Load SRDs có Result, của SR XN, theo MedicalRecord.PatientId, RequestDate >= fromDate
        var query = _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.Status != 3
                     && !string.IsNullOrEmpty(d.Result)
                     && d.ServiceRequest.RequestType == 1
                     && !d.ServiceRequest.IsDeleted
                     && d.ServiceRequest.MedicalRecord.PatientId == patientId
                     && d.ServiceRequest.RequestDate >= fromDate)
            .Include(d => d.ServiceRequest)
            .Include(d => d.Service)
            .AsQueryable();

        if (!string.IsNullOrEmpty(testCode))
            query = query.Where(d => d.Service.ServiceCode == testCode);

        var items = await query
            .OrderByDescending(d => d.ServiceRequest.RequestDate)
            .ThenBy(d => d.Service.ServiceName)
            .ToBoundedListAsync("LISCompleteService.GetLabResultHistoryAsync");

        if (!items.Any()) return new List<LabResultHistoryDto>();

        // Catalog for unit/range
        var svcIds = items.Select(d => d.ServiceId).Distinct().ToList();
        var catalogByService = await LoadCatalogFirstRowAsync(svcIds);

        // Approver names: collect unique ReviewerUserIds → batch lookup
        var reviewerIds = items.Where(d => d.ReviewerUserId.HasValue).Select(d => d.ReviewerUserId!.Value).Distinct().ToList();
        var reviewerNames = reviewerIds.Any()
            ? (await _context.Users.Where(u => reviewerIds.Contains(u.Id)).ToListAsync())
                .ToDictionary(u => u.Id, u => u.FullName)
            : new Dictionary<Guid, string>();

        // Detail params — for flag computation
        var detailIds = items.Select(d => d.Id).ToList();
        var paramsByDetail = await LoadParamsDictAsync(detailIds);

        return items.Select(d =>
        {
            var cat = catalogByService.GetValueOrDefault(d.ServiceId);
            paramsByDetail.TryGetValue(d.Id, out var dParams);

            // Compute flag from params (ignoring ReviewedAt for history display)
            string flag = ComputeFlagStringFromParams(dParams);

            return new LabResultHistoryDto
            {
                OrderId = d.ServiceRequestId,
                TestDate = d.ServiceRequest.RequestDate,
                TestCode = d.Service?.ServiceCode ?? "",
                TestName = d.Service?.ServiceName ?? "",
                Result = d.Result ?? "",
                Unit = cat?.Unit ?? "",
                ReferenceRange = LabFlagEvaluator.BuildReferenceRange(
                    cat?.NormalMinMale ?? cat?.ReferenceLow,
                    cat?.NormalMaxMale ?? cat?.ReferenceHigh) ?? "",
                Flag = flag,
                ApprovedBy = d.ReviewerUserId.HasValue
                    ? reviewerNames.GetValueOrDefault(d.ReviewerUserId.Value, "")
                    : ""
            };
        }).ToList();
    }

    public async Task<LabResultComparisonDto> CompareLabResultsAsync(Guid patientId, string testCode, int lastNTimes = 5)
    {
        var items = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.Status != 3
                     && !string.IsNullOrEmpty(d.Result)
                     && d.Service.ServiceCode == testCode
                     && d.ServiceRequest.RequestType == 1
                     && !d.ServiceRequest.IsDeleted
                     && d.ServiceRequest.MedicalRecord.PatientId == patientId)
            .Include(d => d.ServiceRequest)
            .Include(d => d.Service)
            .OrderByDescending(d => d.ServiceRequest.RequestDate)
            .Take(lastNTimes)
            .ToListAsync();

        var result = new LabResultComparisonDto { TestCode = testCode, DataPoints = new List<LabResultPointDto>() };
        if (!items.Any()) return result;

        result.TestName = items.First().Service?.ServiceName ?? testCode;

        var svcIds = items.Select(d => d.ServiceId).Distinct().ToList();
        var catalogByService = await LoadCatalogFirstRowAsync(svcIds);
        result.Unit = catalogByService.GetValueOrDefault(items.First().ServiceId)?.Unit ?? "";

        var detailIds = items.Select(d => d.Id).ToList();
        var paramsByDetail = await LoadParamsDictAsync(detailIds);

        foreach (var d in items)
        {
            if (!decimal.TryParse(d.Result, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var numericVal))
                continue;

            paramsByDetail.TryGetValue(d.Id, out var dParams);
            string flag = ComputeFlagStringFromParams(dParams);

            result.DataPoints.Add(new LabResultPointDto
            {
                Date = d.ServiceRequest.RequestDate,
                Value = numericVal,
                Flag = flag
            });
        }

        // Reverse to chronological order and calculate trend
        result.DataPoints.Reverse();
        if (result.DataPoints.Count >= 2)
        {
            var first = result.DataPoints.First().Value;
            var last = result.DataPoints.Last().Value;
            if (first != 0)
            {
                result.TrendPercentage = Math.Round((last - first) / first * 100, 1);
                result.TrendDirection = result.TrendPercentage > 5 ? "Increasing" : result.TrendPercentage < -5 ? "Decreasing" : "Stable";
            }
        }

        return result;
    }

    public async Task<DeltaCheckResultDto> PerformDeltaCheckAsync(Guid orderId)
    {
        var result = new DeltaCheckResultDto { OrderId = orderId, Items = new List<DeltaCheckItemDto>() };

        // Load current order details with result
        var sr = await _context.ServiceRequests
            .Where(r => r.Id == orderId && !r.IsDeleted)
            .Include(r => r.MedicalRecord)
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync();

        if (sr == null) return result;

        var currentDetails = sr.Details
            .Where(d => !d.IsDeleted && !string.IsNullOrEmpty(d.Result))
            .ToList();

        if (!currentDetails.Any()) return result;

        var patientId = sr.MedicalRecord?.PatientId;
        if (!patientId.HasValue) return result;

        // Load previous SRDs for each service code — batch by unique service codes
        var serviceCodes = currentDetails.Select(d => d.Service?.ServiceCode).Where(c => !string.IsNullOrEmpty(c)).Distinct().ToList();

        // Get all previous matching SRDs (different SR, same patient, same service code, has result)
        var previousDetails = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted
                     && !string.IsNullOrEmpty(d.Result)
                     && d.ServiceRequestId != orderId
                     && d.ServiceRequest.MedicalRecord.PatientId == patientId.Value
                     && d.ServiceRequest.RequestType == 1
                     && !d.ServiceRequest.IsDeleted
                     && serviceCodes.Contains(d.Service.ServiceCode))
            .Include(d => d.ServiceRequest)
            .Include(d => d.Service)
            .OrderByDescending(d => d.ServiceRequest.RequestDate)
            .ToListAsync();

        // Group previous by ServiceCode for fast lookup
        var prevByCode = previousDetails
            .GroupBy(d => d.Service?.ServiceCode ?? "")
            .ToDictionary(g => g.Key, g => g.First()); // most recent per code

        foreach (var d in currentDetails)
        {
            var code = d.Service?.ServiceCode ?? "";
            if (!decimal.TryParse(d.Result, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var currentVal))
                continue;

            decimal? prevVal = null;
            DateTime? prevDate = null;

            if (prevByCode.TryGetValue(code, out var prev) &&
                decimal.TryParse(prev.Result, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var pv))
            {
                prevVal = pv;
                prevDate = prev.ServiceRequest.RequestDate;
            }

            decimal? deltaPercent = null;
            decimal deltaThreshold = 50m;
            bool isCritical = false;

            if (prevVal.HasValue && prevVal.Value != 0)
            {
                deltaPercent = Math.Round(Math.Abs((currentVal - prevVal.Value) / prevVal.Value * 100), 1);
                isCritical = deltaPercent > deltaThreshold;
            }

            result.Items.Add(new DeltaCheckItemDto
            {
                TestId = d.Id,
                TestCode = code,
                TestName = d.Service?.ServiceName ?? "",
                CurrentValue = currentVal,
                PreviousValue = prevVal,
                PreviousDate = prevDate,
                DeltaPercent = deltaPercent,
                DeltaThreshold = deltaThreshold,
                IsCritical = isCritical
            });

            if (isCritical) result.HasCriticalDelta = true;
        }

        return result;
    }

    public async Task<bool> RerunLabTestAsync(Guid orderItemId, string reason)
    {
        // orderItemId = ServiceRequestDetail.Id
        var d = await _context.ServiceRequestDetails
            .FindAsync(orderItemId);

        if (d == null) return false;

        // Clear result fields
        d.Result = null;
        d.ResultDate = null;
        d.TechnicianRunAt = null;
        d.Status = 1; // Đang thực hiện
        var notePrefix = string.IsNullOrWhiteSpace(d.Note) ? "" : d.Note + "\n";
        d.Note = notePrefix + $"[Làm lại] {reason ?? ""}";

        // Delete associated ServiceRequestDetailParameters
        var oldParams = await _context.ServiceRequestDetailParameters
            .Where(p => p.ServiceRequestDetailId == orderItemId && !p.IsDeleted)
            .ToListAsync();
        if (oldParams.Count > 0)
            _context.ServiceRequestDetailParameters.RemoveRange(oldParams);

        // Header SR.Status: nếu đang 3 → 2 (có KQ → đang XN)
        var sr = await _context.ServiceRequests.FindAsync(d.ServiceRequestId);
        if (sr != null && sr.Status == 3)
            sr.Status = 2;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<QCResultDto> RunQCAsync(RunQCDto dto)
    {
        // Validate QC result against Westgard rules
        var violations = new List<string>();
        bool isAccepted = true;
        decimal mean = 0, sd = 1, zScore = 0;

        try
        {
            using var connection = new Microsoft.Data.SqlClient.SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();

            // Find QC lot by lot number
            var lotSql = @"SELECT Id, Mean, SD FROM QCLots WHERE LotNumber = @LotNumber AND IsActive = 1";
            Guid? lotId = null;
            using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(lotSql, connection))
            {
                cmd.Parameters.AddWithValue("@LotNumber", dto.QCLotNumber ?? "");
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    lotId = reader.GetGuid(0);
                    mean = reader.IsDBNull(1) ? 0 : reader.GetDecimal(1);
                    sd = reader.IsDBNull(2) ? 1 : reader.GetDecimal(2);
                }
            }

            if (sd > 0)
            {
                zScore = Math.Round((dto.QCValue - mean) / sd, 2);
                var absZ = Math.Abs(zScore);
                if (absZ > 3) { violations.Add("1-3s: Vượt 3SD"); isAccepted = false; }
                else if (absZ > 2) { violations.Add("1-2s: Cảnh báo vượt 2SD"); }
            }

            // Save QC result
            if (lotId.HasValue)
            {
                var insertSql = @"INSERT INTO QCResults (Id, QCLotId, AnalyzerId, TestCode, Value, IsAccepted, Violations, RunDate, CreatedAt)
                                  VALUES (NEWID(), @LotId, @AnalyzerId, @TestCode, @Value, @IsAccepted, @Violations, @RunTime, GETDATE())";
                using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(insertSql, connection))
                {
                    cmd.Parameters.AddWithValue("@LotId", lotId.Value);
                    cmd.Parameters.AddWithValue("@AnalyzerId", dto.AnalyzerId);
                    cmd.Parameters.AddWithValue("@TestCode", "");
                    cmd.Parameters.AddWithValue("@Value", dto.QCValue);
                    cmd.Parameters.AddWithValue("@IsAccepted", isAccepted);
                    cmd.Parameters.AddWithValue("@Violations", string.Join("; ", violations));
                    cmd.Parameters.AddWithValue("@RunTime", dto.RunTime);
                    await cmd.ExecuteNonQueryAsync();
                }
            }
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Message.Contains("Invalid object name"))
        {
            _logger.LogWarning("QC tables not found: {Message}", ex.Message);
        }

        return new QCResultDto
        {
            IsAccepted = isAccepted,
            Violations = violations,
            Value = dto.QCValue,
            Mean = mean,
            SD = sd,
            ZScore = zScore,
            CV = mean != 0 ? Math.Round(sd / mean * 100, 2) : 0,
            QCLevel = dto.QCLevel,
            WestgardRule = violations.Any() ? violations.First() : "Pass"
        };
    }

    public async Task<LeveyJenningsChartDto> GetLeveyJenningsChartAsync(Guid testId, Guid analyzerId, DateTime fromDate, DateTime toDate)
    {
        var result = new LeveyJenningsChartDto { DataPoints = new List<QCDataPointDto>() };

        try
        {
            using var connection = new Microsoft.Data.SqlClient.SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();

            // Get QC lot mean/SD for chart reference lines
            var lotSql = @"SELECT TOP 1 Mean, SD FROM QCLots
                           WHERE AnalyzerId = @AnalyzerId AND IsActive = 1
                           ORDER BY CreatedAt DESC";
            using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(lotSql, connection))
            {
                cmd.Parameters.AddWithValue("@AnalyzerId", analyzerId);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    result.Mean = reader.IsDBNull(0) ? 0 : reader.GetDecimal(0);
                    result.SD = reader.IsDBNull(1) ? 0 : reader.GetDecimal(1);
                }
            }

            // Calculate SD lines
            result.Plus1SD = result.Mean + result.SD;
            result.Plus2SD = result.Mean + 2 * result.SD;
            result.Plus3SD = result.Mean + 3 * result.SD;
            result.Minus1SD = result.Mean - result.SD;
            result.Minus2SD = result.Mean - 2 * result.SD;
            result.Minus3SD = result.Mean - 3 * result.SD;

            // Get QC data points
            var dataSql = @"SELECT RunDate, Value, IsAccepted, Violations
                           FROM QCResults
                           WHERE AnalyzerId = @AnalyzerId
                             AND RunDate >= @FromDate AND RunDate < @ToDate
                           ORDER BY RunDate";
            using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(dataSql, connection))
            {
                cmd.Parameters.AddWithValue("@AnalyzerId", analyzerId);
                cmd.Parameters.AddWithValue("@FromDate", fromDate);
                cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    result.DataPoints.Add(new QCDataPointDto
                    {
                        Date = reader.GetDateTime(0),
                        Value = reader.GetDecimal(1),
                        IsRejected = !reader.GetBoolean(2),
                        Violations = reader.IsDBNull(3) ? null : reader.GetString(3)
                    });
                }
            }
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Message.Contains("Invalid object name"))
        {
            _logger.LogWarning("QC tables not found for Levey-Jennings chart: {Message}", ex.Message);
        }

        return result;
    }

    #region Private helpers (#14e-B EF LINQ)

    /// <summary>
    /// Batch load ServiceRequestDetailParameters cho danh sách detail IDs → dictionary by detailId.
    /// Tránh N+1 query.
    /// </summary>
    private async Task<Dictionary<Guid, List<ServiceRequestDetailParameter>>> LoadParamsDictAsync(List<Guid> detailIds)
    {
        if (!detailIds.Any()) return new Dictionary<Guid, List<ServiceRequestDetailParameter>>();

        var allParams = await _context.ServiceRequestDetailParameters
            .Where(p => detailIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted)
            .OrderBy(p => p.SequenceNumber)
            .ToListAsync();

        return allParams
            .GroupBy(p => p.ServiceRequestDetailId)
            .ToDictionary(g => g.Key, g => g.ToList());
    }

    /// <summary>
    /// Batch load LisTestParameter — 1 row đầu tiên per ServiceId (catalog cho unit/range).
    /// </summary>
    private async Task<Dictionary<Guid, LisTestParameter>> LoadCatalogFirstRowAsync(List<Guid> serviceIds)
    {
        if (!serviceIds.Any()) return new Dictionary<Guid, LisTestParameter>();

        var rows = await _context.LisTestParameters
            .Where(p => p.ServiceId.HasValue && serviceIds.Contains(p.ServiceId.Value) && p.IsActive && !p.IsDeleted)
            .ToListAsync();

        // Keep first row per ServiceId (arbitrary but deterministic — matches old model-3 behaviour)
        return rows
            .GroupBy(p => p.ServiceId!.Value)
            .ToDictionary(g => g.Key, g => g.First());
    }

    /// <summary>
    /// Compute flag string (Normal/Low/High/Critical) từ params cho history/compare display.
    /// Tính từ Flag trực tiếp (không xét ReviewedAt — lịch sử hiển thị cờ thực tế).
    /// HH/LL → "Critical"; H → "High"; L → "Low"; else "Normal".
    /// </summary>
    private static string ComputeFlagStringFromParams(List<ServiceRequestDetailParameter>? dParams)
    {
        if (dParams == null || !dParams.Any()) return "Normal";
        var flags = dParams.Select(p => p.Flag).Where(f => !string.IsNullOrEmpty(f)).ToList();
        if (flags.Contains("HH") || flags.Contains("LL")) return "Critical";
        if (flags.Contains("H")) return "High";
        if (flags.Contains("L")) return "Low";
        return "Normal";
    }

    // ── G-01: Lab orders theo lượt nội trú (Issue #202 — moved from controller) ──

    public async Task<List<LabOrderDto>?> GetLabOrdersByAdmissionAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);
        if (admission == null) return null;

        var medicalRecordId = admission.MedicalRecordId;
        // #14b: model 1 — SR XN theo HSBA + chỉ số con R1 (model 2 LabRequests chết → endpoint này trước trả rỗng)
        var orders = await _context.ServiceRequests
            .AsNoTracking()
            .Where(r => r.MedicalRecordId == medicalRecordId && !r.IsDeleted && r.RequestType == 1)
            .Include(r => r.Details.Where(d => !d.IsDeleted)).ThenInclude(d => d.Service)
            .Include(r => r.Doctor)
            .OrderByDescending(r => r.RequestDate)
            .ToListAsync();

        var allDetailIds = orders.SelectMany(r => r.Details.Select(d => d.Id)).ToList();
        var paramsByDetail = allDetailIds.Count == 0
            ? new Dictionary<Guid, List<ServiceRequestDetailParameter>>()
            : (await _context.ServiceRequestDetailParameters.AsNoTracking()
                    .Where(p => allDetailIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted)
                    .OrderBy(p => p.SequenceNumber)
                    .ToListAsync())
                .GroupBy(p => p.ServiceRequestDetailId)
                .ToDictionary(g => g.Key, g => g.ToList());

        return orders.Select(r => new LabOrderDto
        {
            Id = r.Id,
            OrderCode = r.RequestCode,
            PatientId = admission.PatientId,
            PatientCode = "",
            PatientName = "",
            MedicalRecordId = r.MedicalRecordId,
            MedicalRecordCode = "",
            OrderDepartmentId = r.DepartmentId,
            OrderDoctorId = r.DoctorId,
            OrderDoctorName = r.Doctor?.FullName ?? "",
            Diagnosis = r.Diagnosis,
            IcdCode = r.IcdCode,
            Notes = r.Notes ?? r.Note,
            Status = r.Status,
            StatusName = r.Status switch
            {
                0 => "Chờ thanh toán",
                1 => "Đã thanh toán",
                2 => "Đang thực hiện",
                3 => "Có kết quả",
                _ => "Đã hủy"
            },
            IsPriority = r.IsPriority || r.IsEmergency,
            IsEmergency = r.IsEmergency,
            OrderedAt = r.RequestDate,
            ApprovedAt = r.Details.Select(d => d.ReviewedAt).Where(x => x.HasValue).OrderByDescending(x => x).FirstOrDefault(),
            Tests = r.Details.Where(d => d.Status != 3).Select(d =>
            {
                paramsByDetail.TryGetValue(d.Id, out var ps);
                var single = ps != null && ps.Count == 1 ? ps[0] : null;
                return new HIS.Application.DTOs.Laboratory.LabTestItemDto
                {
                    Id = d.Id,
                    LabOrderId = r.Id,
                    TestCode = d.Service?.ServiceCode ?? "",
                    TestName = d.Service?.ServiceName ?? "",
                    SampleTypeName = null,
                    Result = single?.Value ?? d.Result,
                    Unit = single?.Unit,
                    ReferenceRange = single?.ReferenceRange,
                    AbnormalFlag = ps != null && ps.Any(p => !string.IsNullOrEmpty(p.Flag) && p.Flag != "N") ? 1 : 0,
                    Status = d.Status,
                    StatusName = d.ReceiveStatus == 2 ? "Từ chối" : d.Status switch
                    {
                        0 => "Chờ",
                        1 => d.IsSampleCollected ? "Có mẫu" : "Đang XN",
                        2 => d.ReviewedAt != null ? "Đã duyệt" : "Có KQ",
                        3 => "Đã hủy",
                        _ => "Không rõ"
                    }
                };
            }).ToList()
        }).ToList();
    }

    #endregion
}
