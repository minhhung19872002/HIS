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
        // Wave-2: persist into LabQCResults (the EF table that exists). The old code read/wrote QCLots/QCResults,
        // tables that never existed — the SqlException was swallowed, nothing was saved and every run "passed"
        // against Mean=0/SD=1.
        if (string.IsNullOrWhiteSpace(dto.QCLotNumber)) throw new ArgumentException("Chưa nhập số lô QC", nameof(dto.QCLotNumber));
        var service = await _context.Services.Where(s => s.Id == dto.TestId).Select(s => new { s.Id, s.ServiceCode }).FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy xét nghiệm");
        if (!await _context.LabAnalyzers.AnyAsync(a => a.Id == dto.AnalyzerId))
            throw new KeyNotFoundException("Không tìm thấy máy xét nghiệm");

        var lotNumber = dto.QCLotNumber.Trim();
        var levelNo = ParseQcLevel(dto.QCLevel);
        var level = levelNo > 0 ? $"Level{levelNo}" : (dto.QCLevel ?? "Level2");

        // Target Mean/SD: declared lot (LabQCLots) first, else the lot's last recorded run
        decimal mean, sd;
        var declared = (await TryLoadLotTableAsync(lotNumber: lotNumber, testCode: service.ServiceCode, level: levelNo))?.FirstOrDefault();
        if (declared != null) { mean = declared.TargetMean; sd = declared.TargetSD; }
        else
        {
            var last = await _context.LabQCResults
                .Where(r => !r.IsDeleted && r.ServiceId == service.Id && r.QCLevel == level && r.QCLotNumber == lotNumber && r.SD > 0)
                .OrderByDescending(r => r.RunTime).Select(r => new { r.Mean, r.SD }).FirstOrDefaultAsync()
                ?? throw new InvalidOperationException(
                    $"Lô QC {lotNumber} ({level}) chưa có giá trị đích Mean/SD — khai báo lô QC trước khi chạy nội kiểm.");
            mean = last.Mean; sd = last.SD;
        }

        var z = Math.Round((dto.QCValue - mean) / sd, 3);
        // Previous runs of the same analyzer/test/level/lot, newest first — for multi-run Westgard rules
        var prev = await _context.LabQCResults
            .Where(r => !r.IsDeleted && r.AnalyzerId == dto.AnalyzerId && r.ServiceId == service.Id
                && r.QCLevel == level && r.QCLotNumber == lotNumber && r.RunTime < dto.RunTime)
            .OrderByDescending(r => r.RunTime).Take(9).Select(r => r.ZScore).ToListAsync();

        var violations = new List<string>();
        var rejected = false;
        if (Math.Abs(z) > 3) { violations.Add("1-3s: vượt 3SD"); rejected = true; }
        if (prev.Count >= 1 && Math.Abs(z) > 2 && Math.Abs(prev[0]) > 2 && Math.Sign(z) == Math.Sign(prev[0]))
        { violations.Add("2-2s: 2 lần liên tiếp vượt 2SD cùng phía"); rejected = true; }
        if (prev.Count >= 1 && ((z > 2 && prev[0] < -2) || (z < -2 && prev[0] > 2)))
        { violations.Add("R-4s: chênh lệch vượt 4SD"); rejected = true; }
        if (prev.Count >= 3 && Math.Abs(z) > 1 && prev.Take(3).All(p => Math.Abs(p) > 1 && Math.Sign(p) == Math.Sign(z)))
        { violations.Add("4-1s: 4 lần liên tiếp vượt 1SD cùng phía"); rejected = true; }
        if (prev.Count >= 9 && z != 0 && prev.All(p => p != 0 && Math.Sign(p) == Math.Sign(z)))
        { violations.Add("10x: 10 lần liên tiếp cùng phía trung bình"); rejected = true; }
        if (!rejected && Math.Abs(z) > 2) violations.Add("1-2s: cảnh báo vượt 2SD");

        var cv = mean != 0 ? Math.Round(sd / mean * 100, 2) : 0;
        var entity = new LabQCResult
        {
            Id = Guid.NewGuid(),
            AnalyzerId = dto.AnalyzerId,
            ServiceId = service.Id,
            TestCode = service.ServiceCode,
            QCLevel = level,
            QCLotNumber = lotNumber,
            RunTime = dto.RunTime == default ? DateTime.Now : dto.RunTime,
            Value = dto.QCValue,
            Mean = mean,
            SD = sd,
            CV = cv,
            ZScore = z,
            IsAccepted = !rejected,
            WestgardRule = violations.FirstOrDefault(),
            Violations = violations.Count > 0 ? string.Join("; ", violations) : null,
            Notes = dto.Notes,
            PerformedBy = dto.PerformedBy,
            CreatedAt = DateTime.Now,
            CreatedBy = dto.PerformedBy?.ToString(),
        };
        _context.LabQCResults.Add(entity);
        await _context.SaveChangesAsync();

        return new QCResultDto
        {
            Id = entity.Id,
            IsAccepted = !rejected,
            Violations = violations,
            Value = dto.QCValue,
            Mean = mean,
            SD = sd,
            ZScore = z,
            CV = cv,
            QCLevel = level,
            WestgardRule = violations.FirstOrDefault() ?? "Pass"
        };
    }

    public async Task<LeveyJenningsChartDto> GetLeveyJenningsChartAsync(Guid testId, Guid analyzerId, DateTime fromDate, DateTime toDate)
    {
        // Wave-2: read LabQCResults (old code queried the non-existent QCLots/QCResults → always an empty chart)
        var result = new LeveyJenningsChartDto { DataPoints = new List<QCDataPointDto>() };
        var q = _context.LabQCResults.Where(r => !r.IsDeleted && r.ServiceId == testId && r.AnalyzerId == analyzerId
            && r.RunTime >= fromDate && r.RunTime < toDate.Date.AddDays(1));
        var latest = await q.OrderByDescending(r => r.RunTime)
            .Select(r => new { r.QCLevel, r.QCLotNumber, r.Mean, r.SD }).FirstOrDefaultAsync();
        result.TestName = await _context.Services.Where(s => s.Id == testId).Select(s => s.ServiceName).FirstOrDefaultAsync();
        result.AnalyzerName = await _context.LabAnalyzers.Where(a => a.Id == analyzerId).Select(a => a.Name).FirstOrDefaultAsync();
        if (latest == null) return result;

        // One chart = one control level + lot (mixing levels makes the SD lines meaningless)
        result.Mean = latest.Mean;
        result.SD = latest.SD;
        result.Plus1SD = result.Mean + result.SD;
        result.Plus2SD = result.Mean + 2 * result.SD;
        result.Plus3SD = result.Mean + 3 * result.SD;
        result.Minus1SD = result.Mean - result.SD;
        result.Minus2SD = result.Mean - 2 * result.SD;
        result.Minus3SD = result.Mean - 3 * result.SD;

        result.DataPoints = await q.Where(r => r.QCLevel == latest.QCLevel && r.QCLotNumber == latest.QCLotNumber)
            .OrderBy(r => r.RunTime)
            .Select(r => new QCDataPointDto
            {
                Date = r.RunTime,
                Value = r.Value,
                Level = r.QCLevel,
                IsRejected = !r.IsAccepted,
                Violations = r.Violations
            }).ToListAsync();
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
            // The only caller (inpatient BedLabResultSection) drives approve/print buttons with the LIS order vocabulary
            // (LisModel1Map.ComputeOrderStatus: 3 chờ duyệt · 4 sơ duyệt · 5 duyệt chính thức). Raw ServiceRequest.Status
            // (4 = HỦY) made a cancelled order offer "Duyệt chính thức" + "In KQ", and approved results never became
            // printable. Cancelled orders get 6.
            Status = r.Status == 4 ? 6 : LisModel1Map.ComputeOrderStatus(r.Details),
            StatusName = r.Status == 4 ? "Đã hủy" : LisModel1Map.ComputeOrderStatus(r.Details) switch
            {
                0 => "Chờ lấy mẫu",
                1 => "Đã lấy mẫu",
                2 => "Đang xử lý",
                3 => "Chờ duyệt",
                4 => "Sơ duyệt",
                5 => "Hoàn thành",
                _ => "Không rõ"
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
