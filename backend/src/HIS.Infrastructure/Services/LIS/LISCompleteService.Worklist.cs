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
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using HIS.Infrastructure.Services.HL7;

namespace HIS.Infrastructure.Services;

// K-wave5: tach tu LISCompleteService.ReportsWorklist.cs — Worklist & Analyzer Integration (~265 dong).
public partial class LISCompleteService
{
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

            foreach (var result in labResults)
            {
                _logger.LogInformation("Processing result: SampleId={SampleId}, TestCode={TestCode}, Value={Value}",
                    result.SampleId, result.TestCode, result.Value);

                // #14e-B: model 1 — match ServiceRequestDetail theo SampleBarcode + Service.ServiceCode
                // (thay LabOrderItems JOIN LabOrders theo SampleBarcode + TestCode)
                var srd = await _context.ServiceRequestDetails
                    .Include(d => d.ServiceRequest)
                    .Include(d => d.Service)
                    .FirstOrDefaultAsync(d =>
                        !d.IsDeleted && d.Status != 3
                        && d.SampleBarcode == result.SampleId
                        && d.Service.ServiceCode == result.TestCode
                        && d.ServiceRequest.RequestType == 1
                        && !d.ServiceRequest.IsDeleted);

                if (srd != null)
                {
                    _logger.LogInformation("Matched ServiceRequestDetail: {SrdId} for barcode {Barcode}",
                        srd.Id, result.SampleId);

                    // Lấy khoảng tham chiếu từ catalog LisTestParameter theo ServiceId (row đầu)
                    var cat = await _context.LisTestParameters
                        .Where(p => p.ServiceId == srd.ServiceId && p.IsActive && !p.IsDeleted)
                        .OrderBy(p => p.SortOrder)
                        .FirstOrDefaultAsync();

                    decimal? normalMin = cat?.ReferenceLow ?? cat?.NormalMinMale;
                    decimal? normalMax = cat?.ReferenceHigh ?? cat?.NormalMaxMale;
                    decimal? criticalLow = cat?.CriticalLow;
                    decimal? criticalHigh = cat?.CriticalHigh;

                    // Ghi KQ vào SRD (giống EnterLabResult model 1)
                    srd.Result = result.Value ?? "";
                    srd.ResultDate = result.ResultDateTime ?? DateTime.Now;
                    srd.TechnicianRunAt = DateTime.Now;
                    srd.Status = 2; // Có KQ

                    // Ghi chỉ số con (parameter) để tính cờ H/L/HH/LL
                    var num = LabFlagEvaluator.TryParse(result.Value);
                    var flag = LabFlagEvaluator.EvaluateFlag(num, normalMin, normalMax, criticalLow, criticalHigh);
                    // Normalise cờ HL7 nếu có; fallback tính từ range
                    var hl7Flag = LabFlagEvaluator.NormalizeHl7Flag(result.AbnormalFlag);
                    var resolvedFlag = hl7Flag ?? flag;

                    // Xóa params cũ (re-run idempotent) rồi ghi mới
                    var oldParams = await _context.ServiceRequestDetailParameters
                        .Where(p => p.ServiceRequestDetailId == srd.Id && !p.IsDeleted).ToListAsync();
                    if (oldParams.Count > 0) _context.ServiceRequestDetailParameters.RemoveRange(oldParams);

                    if (!string.IsNullOrEmpty(result.Value))
                    {
                        _context.ServiceRequestDetailParameters.Add(new ServiceRequestDetailParameter
                        {
                            Id = Guid.NewGuid(),
                            ServiceRequestDetailId = srd.Id,
                            ParameterCode = result.TestCode ?? "",
                            ParameterName = srd.Service?.ServiceName ?? result.TestCode ?? "",
                            Value = result.Value,
                            NumericValue = num,
                            Unit = !string.IsNullOrEmpty(result.Units) ? result.Units : cat?.Unit,
                            ReferenceMin = normalMin,
                            ReferenceMax = normalMax,
                            ReferenceRange = !string.IsNullOrEmpty(result.ReferenceRange)
                                ? result.ReferenceRange
                                : LabFlagEvaluator.BuildReferenceRange(normalMin, normalMax),
                            Flag = resolvedFlag,
                            SequenceNumber = 0,
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
