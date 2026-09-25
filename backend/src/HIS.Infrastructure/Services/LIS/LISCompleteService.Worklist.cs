using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Constants;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using HIS.Infrastructure.Services.HL7;

namespace HIS.Infrastructure.Services;

// K-wave5: tach tu LISCompleteService.ReportsWorklist.cs — Worklist & Analyzer Integration (~265 dong).
public partial class LISCompleteService
{
    #region Worklist & Analyzer Integration

    /// <summary>
    /// Tạo worklist gửi máy phân tích. #218/T3 — trước đây trả về một `WorklistDto` rỗng mà không
    /// ghi gì, trong khi bảng `LabWorklists` đã có sẵn (19 cột) và `GetPendingWorklistsAsync` ngay
    /// dưới vẫn truy vấn dữ liệu thật. Người dùng bấm "gửi máy", nhận HTTP 200, và không dòng nào
    /// được ghi — máy phân tích không bao giờ nhận được y lệnh.
    /// Đo được ở evidence/cross/t3/t3_stub_group_a.json.
    /// </summary>
    public async Task<WorklistDto> CreateWorklistAsync(CreateWorklistDto dto)
    {
        var orderIds = (dto.OrderIds ?? new List<Guid>()).Where(x => x != Guid.Empty).Distinct().ToList();
        if (orderIds.Count == 0)
            throw new InvalidOperationException("Chưa chọn chỉ định nào để gửi máy phân tích.");

        var details = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Where(d => orderIds.Contains(d.Id) && !d.IsDeleted)
            .ToListAsync();
        if (details.Count == 0)
            throw new KeyNotFoundException("Không tìm thấy chỉ định xét nghiệm nào trong danh sách đã chọn.");

        var now = DateTime.UtcNow;
        var items = new List<WorklistItemDto>();
        foreach (var detail in details)
        {
            // Không gửi trùng: một chỉ định đã có worklist đang chờ trên cùng máy thì bỏ qua.
            var already = await _context.LabWorklists.AnyAsync(w =>
                w.LabRequestItemId == detail.Id && w.AnalyzerId == dto.AnalyzerId
                && w.Status < 2 && !w.IsDeleted);
            if (already) continue;

            var barcode = detail.SampleBarcode ?? detail.Id.ToString("N")[..12].ToUpperInvariant();
            await _context.LabWorklists.AddAsync(new LabWorklist
            {
                Id = Guid.NewGuid(),
                AnalyzerId = dto.AnalyzerId,
                LabRequestItemId = detail.Id,
                SampleBarcode = barcode,
                TestCodes = detail.Service?.ServiceCode,
                SentAt = now,
                Status = 0,
                RetryCount = 0,
                CreatedAt = now,
            });

            var patient = detail.ServiceRequest?.MedicalRecord?.Patient;
            items.Add(new WorklistItemDto
            {
                SampleId = barcode,
                PatientId = patient?.PatientCode ?? "",
                PatientName = patient?.FullName ?? "",
                DateOfBirth = patient?.DateOfBirth,
                Gender = patient == null ? null : (patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nữ" : "Khác"),
                TestCodes = string.IsNullOrWhiteSpace(detail.Service?.ServiceCode)
                    ? new List<string>()
                    : new List<string> { detail.Service!.ServiceCode },
            });
        }

        await _context.SaveChangesAsync();
        return new WorklistDto { AnalyzerId = dto.AnalyzerId, Items = items };
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

        // #14b: model 1 — SR XN có mẫu đã lấy nhưng chưa có KQ (model 2 LabRequests chết)
        var pendingRequests = await _context.ServiceRequests
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
            .Where(r => !r.IsDeleted && r.RequestType == 1
                        && r.Details.Any(d => !d.IsDeleted && d.Status != 3 && d.IsSampleCollected && d.Status < 2))
            .OrderBy(r => r.RequestDate)
            .Take(200)
            .ToListAsync();

        var items = pendingRequests.Select(r =>
        {
            var patient = r.MedicalRecord?.Patient;
            var pendingDetails = r.Details?.Where(d => d.IsSampleCollected && d.Status < 2).ToList() ?? new List<ServiceRequestDetail>();
            return new WorklistItemDto
            {
                SampleId = pendingDetails.Select(d => d.SampleBarcode).FirstOrDefault(b => !string.IsNullOrEmpty(b)) ?? r.RequestCode,
                PatientId = patient?.PatientCode ?? "",
                PatientName = patient?.FullName ?? "",
                DateOfBirth = patient?.DateOfBirth,
                Gender = patient?.Gender == 1 ? "Nam" : patient?.Gender == 2 ? "Nữ" : null,
                TestCodes = pendingDetails.Select(d => d.Service?.ServiceCode).Where(c => !string.IsNullOrEmpty(c)).Select(c => c!).ToList(),
                IsPriority = r.IsPriority || r.IsEmergency,
            };
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

            // QA-R11: the analyzer's own test codes (AST, WBC…) are mapped to HIS services in
            // LabAnalyzerTestMappings (LIS config "Map máy XN"), with a unit conversion factor. This path (the MLLP
            // listener) ignored them and required OBX-3 == Service.ServiceCode, so a mapped analyzer never matched.
            var mappings = await _context.LabAnalyzerTestMappings.AsNoTracking()
                .Where(m => m.AnalyzerId == analyzerId && m.IsActive && !m.IsDeleted && m.ServiceId != null)
                .ToListAsync();
            var panelSrds = new HashSet<Guid>(); // multi-parameter services touched → summary rebuilt at the end

            foreach (var result in labResults)
            {
                _logger.LogInformation("Processing result: SampleId={SampleId}, TestCode={TestCode}, Value={Value}",
                    result.SampleId, result.TestCode, result.Value);

                var map = mappings.FirstOrDefault(m =>
                    string.Equals(m.AnalyzerTestCode?.Trim(), result.TestCode?.Trim(), StringComparison.OrdinalIgnoreCase));
                var paramCode = map != null && !string.IsNullOrWhiteSpace(map.HisTestCode) ? map.HisTestCode.Trim() : (result.TestCode ?? "");

                // #14e-B: model 1 — match ServiceRequestDetail theo SampleBarcode + dịch vụ.
                // Match 1: mapping máy → dịch vụ; Match 2: OBX-3 = mã dịch vụ (hành vi cũ);
                // Match 3: OBX-3 / mã map = mã chỉ số con trong catalog (dịch vụ nhiều chỉ số).
                IQueryable<ServiceRequestDetail> Candidates() => _context.ServiceRequestDetails
                    .Include(d => d.ServiceRequest)
                    .Include(d => d.Service)
                    .Where(d =>
                        !d.IsDeleted && d.Status != 3
                        && d.SampleBarcode == result.SampleId
                        && d.ServiceRequest.RequestType == 1
                        && !d.ServiceRequest.IsDeleted
                        && d.ServiceRequest.Status != 4); // header 4 = cancelled from OPD
                ServiceRequestDetail? srd = null;
                var directMatch = false;
                if (map?.ServiceId != null)
                    srd = await Candidates().FirstOrDefaultAsync(d => d.ServiceId == map.ServiceId.Value);
                if (srd == null)
                {
                    srd = await Candidates().FirstOrDefaultAsync(d => d.Service.ServiceCode == result.TestCode);
                    directMatch = srd != null;
                }
                if (srd == null)
                {
                    var catServiceIds = await _context.LisTestParameters
                        .Where(p => (p.Code == paramCode || p.Hl7Code == result.TestCode)
                                    && p.ServiceId != null && p.IsActive && !p.IsDeleted)
                        .Select(p => p.ServiceId!.Value)
                        .ToListAsync();
                    if (catServiceIds.Count > 0)
                        srd = await Candidates().FirstOrDefaultAsync(d => catServiceIds.Contains(d.ServiceId));
                }
                // A mapped service whose catalog has a single parameter behaves like a direct match (bare value).
                if (srd != null && !directMatch && map != null)
                    directMatch = mappings.Count(m => m.ServiceId == srd.ServiceId) <= 1;

                // T3/#218 (2026-09-04): kết quả đã được bác sĩ duyệt thì máy KHÔNG được đè lên.
                // Trước đây dòng khớp bị ghi đè lặng lẽ, ReviewedAt vẫn còn nguyên nên bệnh án hiện
                // một con số khác con số đã duyệt mà không có dấu vết nào. Ở đây không ném lỗi vì
                // đó sẽ giết cả lô kết quả của máy — thay vào đó bỏ qua dòng này, giữ nguyên bản tin
                // thô để người soi lại được, và báo trong `errors` của phản hồi.
                if (srd != null && srd.ReviewedAt != null)
                {
                    _logger.LogWarning("Refusing to overwrite reviewed result on {SrdId} (barcode {Barcode}, test {TestCode})",
                        srd.Id, result.SampleId, result.TestCode);
                    errors.Add($"Mẫu {result.SampleId} / {result.TestCode}: kết quả đã duyệt, không ghi đè. Phải hủy duyệt trước.");

                    _context.LabRawResults.Add(new LabRawResult
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
                        Status = 0 // chờ người xử lý, KHÔNG tính là đã khớp
                    });
                    continue;
                }

                if (srd != null)
                {
                    _logger.LogInformation("Matched ServiceRequestDetail: {SrdId} for barcode {Barcode}",
                        srd.Id, result.SampleId);

                    // Catalog row: the parameter with this code (panel) or, for a single-value service, its first row.
                    var cat = await _context.LisTestParameters
                        .Where(p => p.ServiceId == srd.ServiceId && p.IsActive && !p.IsDeleted
                                    && (p.Code == paramCode || p.Hl7Code == result.TestCode))
                        .FirstOrDefaultAsync();
                    if (cat == null && directMatch)
                        cat = await _context.LisTestParameters
                            .Where(p => p.ServiceId == srd.ServiceId && p.IsActive && !p.IsDeleted)
                            .OrderBy(p => p.SortOrder)
                            .FirstOrDefaultAsync();

                    // QA-R12: age/sex reference rows + configured critical thresholds (LabRangeContext), same as manual entry.
                    var ranges = await LabRangeContext.LoadAsync(_context, srd);
                    var mrInfo = ranges.PatientId is Guid mrPatientId ? new { PatientId = mrPatientId } : null;

                    // QA-R11: analyzer → HIS unit conversion from the mapping (factor ≠ 1), mapped unit wins.
                    var value = result.Value;
                    var units = result.Units;
                    if (map != null)
                    {
                        if (map.ConversionFactor is decimal factor && factor > 0 && factor != 1m
                            && LabFlagEvaluator.TryParse(value) is decimal rawNum)
                            value = (rawNum * factor).ToString("0.####", System.Globalization.CultureInfo.InvariantCulture);
                        if (!string.IsNullOrWhiteSpace(map.Unit)) units = map.Unit;
                    }
                    // Range rows are matched on the unit AFTER conversion (a row in another unit is skipped).
                    var rangeCode = directMatch ? result.TestCode : paramCode;
                    var (normalMin, normalMax) = ranges.Range(cat, rangeCode, !string.IsNullOrEmpty(units) ? units : cat?.Unit);
                    var (criticalLow, criticalHigh) = ranges.Critical(cat, rangeCode, cat?.CriticalLow, cat?.CriticalHigh);

                    // Ghi KQ vào SRD (giống EnterLabResult model 1)
                    if (directMatch) srd.Result = value ?? "";
                    srd.ResultDate = result.ResultDateTime ?? DateTime.Now;
                    srd.TechnicianRunAt = DateTime.Now;
                    srd.Status = 2; // Có KQ

                    // Ghi chỉ số con (parameter) để tính cờ H/L/HH/LL
                    var num = LabFlagEvaluator.TryParse(value);
                    var flag = LabFlagEvaluator.EvaluateFlag(num, normalMin, normalMax, criticalLow, criticalHigh);
                    // Normalise cờ HL7 nếu có; fallback tính từ range
                    var hl7Flag = LabFlagEvaluator.NormalizeHl7Flag(result.AbnormalFlag);
                    var resolvedFlag = hl7Flag ?? flag;

                    // Single-value service: replace all params (re-run idempotent). Panel (CBC…): upsert only this
                    // parameter — before, every OBX of a panel wiped the previous ones, keeping only the last line.
                    var oldParams = await _context.ServiceRequestDetailParameters
                        .Where(p => p.ServiceRequestDetailId == srd.Id && !p.IsDeleted
                                    && (directMatch || p.ParameterCode == paramCode)).ToListAsync();
                    if (oldParams.Count > 0) _context.ServiceRequestDetailParameters.RemoveRange(oldParams);
                    if (!directMatch) panelSrds.Add(srd.Id);

                    // QA-R7: the analyzer path never raised critical-value alerts (manual entry did since R6).
                    await RemoveOpenCriticalAlertsAsync(_context, srd.Id, directMatch ? null : paramCode);
                    if (!string.IsNullOrEmpty(value) && mrInfo != null)
                        AddCriticalAlertIfNeeded(_context, srd.Id, mrInfo.PatientId, resolvedFlag, directMatch ? (result.TestCode ?? "") : paramCode,
                            directMatch ? (srd.Service?.ServiceName ?? result.TestCode ?? "") : (cat?.Name ?? map?.HisTestName ?? paramCode),
                            value, num, !string.IsNullOrEmpty(units) ? units : cat?.Unit, criticalLow, criticalHigh);

                    if (!string.IsNullOrEmpty(value))
                    {
                        _context.ServiceRequestDetailParameters.Add(new ServiceRequestDetailParameter
                        {
                            Id = Guid.NewGuid(),
                            ServiceRequestDetailId = srd.Id,
                            ParameterCode = directMatch ? (result.TestCode ?? "") : paramCode,
                            ParameterName = directMatch
                                ? (srd.Service?.ServiceName ?? result.TestCode ?? "")
                                : (cat?.Name ?? map?.HisTestName ?? paramCode),
                            Value = value,
                            NumericValue = num,
                            Unit = !string.IsNullOrEmpty(units) ? units : cat?.Unit,
                            ReferenceMin = normalMin,
                            ReferenceMax = normalMax,
                            ReferenceRange = !string.IsNullOrEmpty(result.ReferenceRange) && map?.ConversionFactor is null or 1m
                                ? result.ReferenceRange
                                : LabFlagEvaluator.BuildReferenceRange(normalMin, normalMax),
                            Flag = resolvedFlag,
                            SequenceNumber = directMatch ? 0 : Math.Max(0, mappings.FindIndex(m => m == map)),
                            CreatedAt = DateTime.Now,
                        });
                    }

                    // Save raw result as matched — MappedToLabRequestItemId = SRD id (model 1)
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
                        MappedToLabRequestItemId = srd.Id, // #14e-B: SRD id (model 1), bỏ LabOrderItems id
                        MappedAt = DateTime.Now
                    };
                    _context.LabRawResults.Add(rawResult);

                    matchedCount++;
                }
                else
                {
                    _logger.LogWarning("No matching ServiceRequestDetail found for SampleId={SampleId}, TestCode={TestCode}",
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

            await _context.SaveChangesAsync();

            // Multi-parameter services: SRD.Result = summary of all parameters (same as the connection-manager path).
            if (panelSrds.Count > 0)
            {
                var panelRows = await _context.ServiceRequestDetailParameters
                    .Where(p => panelSrds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted)
                    .OrderBy(p => p.SequenceNumber)
                    .ToListAsync();
                var details = await _context.ServiceRequestDetails.Where(d => panelSrds.Contains(d.Id)).ToListAsync();
                foreach (var d in details)
                    d.Result = string.Join("; ", panelRows.Where(p => p.ServiceRequestDetailId == d.Id)
                        .Select(p => $"{p.ParameterName} {p.Value}"));
                await _context.SaveChangesAsync();
            }

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
        var analyzers = await _context.LabAnalyzers.Where(a => a.IsActive).ToBoundedListAsync("LISCompleteService.GetAnalyzersRealtimeStatusAsync");
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
}
