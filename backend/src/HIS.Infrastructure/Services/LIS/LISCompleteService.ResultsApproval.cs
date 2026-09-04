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
using HIS.Core.Constants;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using HIS.Infrastructure.Services.HL7;

// Alias to avoid ambiguity
using ApproveLabResultDtoService = HIS.Application.Services.ApproveLabResultDto;


namespace HIS.Infrastructure.Services;

// #364 wave-8b (2026-07-17): tach nhap/duyet ket qua + canh bao gia tri nguy hiem khoi LISCompleteService.Execute.cs
public partial class LISCompleteService {

    public async Task<bool> EnterLabResultAsync(EnterLabResultDto dto)
    {
        // dto.LabTestItemId = ServiceRequestDetail.Id
        var d = await _context.ServiceRequestDetails
            .Include(x => x.Service)
            .FirstOrDefaultAsync(x => x.Id == dto.LabTestItemId && !x.IsDeleted);

        if (d == null) return false;

        // T3/#218 (2026-09-04): chiều ngược đã có LabCancelChainService gác theo chuỗi (hủy duyệt →
        // hủy KQ → hủy lấy mẫu), nhưng chiều thuận trước đây KHÔNG kiểm gì: ghi được kết quả vào
        // chỉ định đã hủy, và đè được lên kết quả bác sĩ đã duyệt mà không để lại dấu vết.
        // Đường máy phân tích (Worklist.cs) vốn đã lọc Status != 3 — đây là vế còn thiếu.
        LabDetailStatus.EnsureCanWriteResult(d.Status, d.ReviewedAt != null);

        // Write result directly onto SRD (model 1 is the source of truth now)
        d.Result = dto.Result;
        d.ResultDate = DateTime.Now;
        d.TechnicianRunAt = DateTime.Now;
        d.Status = 2; // Có KQ

        // R1-2b: per-parameter block — catalog ranges, EvaluateFlag, fallback range from input
        if (dto.Parameters is { Count: > 0 })
        {
            var oldParams = await _context.ServiceRequestDetailParameters
                .Where(x => x.ServiceRequestDetailId == d.Id && !x.IsDeleted).ToListAsync();
            if (oldParams.Count > 0) _context.ServiceRequestDetailParameters.RemoveRange(oldParams); // re-run idempotent

            var catalog = await _context.LisTestParameters
                .Where(p => p.ServiceId == d.ServiceId && p.IsActive && !p.IsDeleted).ToListAsync();

            // Fallback ranges: catalog row first, then input (single param case)
            bool single = dto.Parameters.Count == 1;
            // For single-param fallback: load first catalog entry ranges
            decimal? singleCatCritLow = single ? catalog.FirstOrDefault()?.CriticalLow : null;
            decimal? singleCatCritHigh = single ? catalog.FirstOrDefault()?.CriticalHigh : null;

            int seq = 0;
            foreach (var p in dto.Parameters)
            {
                var cat = catalog.FirstOrDefault(c => c.Code == p.ParameterCode || c.Hl7Code == p.ParameterCode);
                var min = p.ReferenceMin ?? cat?.ReferenceLow ?? cat?.NormalMinMale ?? (single ? (decimal?)null : null);
                var max = p.ReferenceMax ?? cat?.ReferenceHigh ?? cat?.NormalMaxMale ?? (single ? (decimal?)null : null);
                var num = LabFlagEvaluator.TryParse(p.Value);
                var flag = LabFlagEvaluator.EvaluateFlag(num, min, max,
                    cat?.CriticalLow ?? singleCatCritLow,
                    cat?.CriticalHigh ?? singleCatCritHigh);
                _context.ServiceRequestDetailParameters.Add(new ServiceRequestDetailParameter
                {
                    Id = Guid.NewGuid(),
                    ServiceRequestDetailId = d.Id,
                    ParameterCode = p.ParameterCode,
                    ParameterName = p.ParameterName,
                    Value = p.Value,
                    NumericValue = num,
                    Unit = string.IsNullOrEmpty(p.Unit) ? cat?.Unit : p.Unit,
                    ReferenceMin = min,
                    ReferenceMax = max,
                    ReferenceRange = LabFlagEvaluator.BuildReferenceRange(min, max),
                    Flag = flag,
                    SequenceNumber = seq++,
                    CreatedAt = DateTime.Now,
                });
            }
            if (string.IsNullOrWhiteSpace(d.Result))
                d.Result = string.Join("; ", dto.Parameters.Select(p => $"{p.ParameterName} {p.Value}"));
        }

        // Update header SR.Status: only raise (never lower); guard: don't touch if header already cancelled (Status==4)
        var sr = await _context.ServiceRequests.FindAsync(d.ServiceRequestId);
        if (sr != null && sr.Status != 4)
        {
            // Reload all active details (including the one just updated — SaveChanges not called yet, so check d directly)
            var allActive = await _context.ServiceRequestDetails
                .Where(x => x.ServiceRequestId == sr.Id && !x.IsDeleted && x.Status != 3)
                .ToListAsync();
            // Apply in-memory update for the current detail (not yet in DB)
            var idx = allActive.FindIndex(x => x.Id == d.Id);
            if (idx >= 0) allActive[idx] = d;

            bool allHaveResult = allActive.Count > 0 && allActive.All(x => !string.IsNullOrEmpty(x.Result));
            int newStatus = allHaveResult ? 3 : 2; // 3=Có KQ, 2=Đang XN
            if (newStatus > sr.Status)
                sr.Status = newStatus;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ApproveLabResultAsync(ApproveLabResultDtoService dto)
    {
        IQueryable<ServiceRequestDetail> detailQuery;

        if (dto.ItemIds != null && dto.ItemIds.Any())
        {
            var ids = dto.ItemIds;
            detailQuery = _context.ServiceRequestDetails
                .Where(d => ids.Contains(d.Id) && !d.IsDeleted && d.Status != 3);
        }
        else
        {
            detailQuery = _context.ServiceRequestDetails
                .Where(d => d.ServiceRequestId == dto.OrderId && !d.IsDeleted && d.Status != 3);
        }

        var details = await detailQuery.ToListAsync();

        foreach (var d in details.Where(x => !string.IsNullOrEmpty(x.Result)))
        {
            d.ReviewedAt = DateTime.Now;
            d.ReviewerUserId = dto.ApprovedByUserId;
        }

        await _context.SaveChangesAsync();

        _ = _notificationService.NotifyLabResultAsync(dto.OrderId, "Bác sĩ duyệt");
        return true;
    }

    public async Task<bool> PreliminaryApproveLabResultAsync(Guid orderId, string technicianNote, Guid? approvedByUserId = null)
    {
        // Model 1 không có "sơ duyệt" riêng — set TechnicianUserId + TechnicianRunAt cho details có Result,
        // append note vào SR.Notes. KHÔNG set ReviewedAt (đó là final approve).
        var details = await _context.ServiceRequestDetails
            .Where(d => d.ServiceRequestId == orderId && !d.IsDeleted && d.Status != 3)
            .ToListAsync();

        foreach (var d in details.Where(x => !string.IsNullOrEmpty(x.Result)))
        {
            if (approvedByUserId.HasValue)
                d.TechnicianUserId = approvedByUserId.Value;
            if (d.TechnicianRunAt == null)
                d.TechnicianRunAt = DateTime.Now;
        }

        var sr = await _context.ServiceRequests.FindAsync(orderId);
        if (sr != null)
        {
            var notePrefix = string.IsNullOrWhiteSpace(sr.Notes) ? "" : sr.Notes + "\n";
            sr.Notes = notePrefix + $"[KTV] {technicianNote ?? ""}";
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> FinalApproveLabResultAsync(Guid orderId, string doctorNote, Guid? approvedByUserId = null)
    {
        var details = await _context.ServiceRequestDetails
            .Where(d => d.ServiceRequestId == orderId && !d.IsDeleted && d.Status != 3)
            .ToListAsync();

        foreach (var d in details.Where(x => !string.IsNullOrEmpty(x.Result)))
        {
            d.ReviewedAt = DateTime.Now;
            d.ReviewerUserId = approvedByUserId;
        }

        var sr = await _context.ServiceRequests.FindAsync(orderId);
        if (sr != null)
        {
            var notePrefix = string.IsNullOrWhiteSpace(sr.Notes) ? "" : sr.Notes + "\n";
            sr.Notes = notePrefix + $"[BS duyệt] {doctorNote ?? ""}";
        }

        await _context.SaveChangesAsync();

        _ = _notificationService.NotifyLabResultAsync(orderId, "Bác sĩ duyệt");
        return true;
    }

    public async Task<bool> CancelApprovalAsync(Guid orderId, string reason)
    {
        // Hủy duyệt revert cả 2 bước: final (ReviewedAt) lẫn sơ duyệt (TechnicianUserId) → order về 3 "Chờ duyệt"
        // (khớp FE: nút Hủy duyệt hiện khi status >= 4). Trade-off: mất dấu KTV sơ duyệt — chấp nhận như model 3 cũ.
        var details = await _context.ServiceRequestDetails
            .Where(d => d.ServiceRequestId == orderId && !d.IsDeleted && d.Status != 3
                && (d.ReviewedAt != null || d.TechnicianUserId != null))
            .ToListAsync();

        foreach (var d in details)
        {
            d.ReviewedAt = null;
            d.ReviewerUserId = null;
            d.TechnicianUserId = null;
        }

        var sr = await _context.ServiceRequests.FindAsync(orderId);
        if (sr != null)
        {
            var notePrefix = string.IsNullOrWhiteSpace(sr.Notes) ? "" : sr.Notes + "\n";
            sr.Notes = notePrefix + $"[Hủy duyệt] {reason ?? ""}";
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]> PrintLabResultAsync(Guid orderId, string format = "A4")
    {
        // Gate: chưa duyệt → KHÔNG in
        var sr = await _context.ServiceRequests
            .Where(r => r.Id == orderId && r.RequestType == 1 && !r.IsDeleted)
            .Include(r => r.MedicalRecord).ThenInclude(mr => mr.Patient)
            .Include(r => r.Doctor)
            .Include(r => r.Department)
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync();

        if (sr == null)
            return System.Text.Encoding.UTF8.GetBytes("Order not found");

        var activeDetails = sr.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();

        // Gate: có KQ và tất cả KQ đều ReviewedAt != null
        var detailsWithResult = activeDetails.Where(d => !string.IsNullOrEmpty(d.Result)).ToList();
        if (detailsWithResult.Count == 0 || !detailsWithResult.All(d => d.ReviewedAt != null))
            throw new InvalidOperationException("Chưa duyệt kết quả — không có số liệu để in.");

        try
        {
            var detailIds = activeDetails.Select(d => d.Id).ToList();
            var paramsByDetail = await LoadParamsDictAsync(detailIds);

            // Approver lookup
            var approverUserId = LisModel1Map.ApprovedBy(activeDetails);
            string? approverName = null;
            if (approverUserId.HasValue)
            {
                var approver = await _context.Users.FindAsync(approverUserId.Value);
                approverName = approver?.FullName;
            }

            var patient = sr.MedicalRecord?.Patient;
            int genderInt = patient?.Gender ?? 0;

            // Build LabResultRows: if SRD has params → 1 row/param, else row per SRD
            var labResults = new List<PdfTemplateHelper.LabResultRow>();
            foreach (var d in activeDetails.Where(x => !string.IsNullOrEmpty(x.Result)))
            {
                paramsByDetail.TryGetValue(d.Id, out var dParams);
                if (dParams != null && dParams.Any())
                {
                    foreach (var p in dParams.OrderBy(x => x.SequenceNumber))
                    {
                        labResults.Add(new PdfTemplateHelper.LabResultRow
                        {
                            TestName = $"{d.Service?.ServiceName ?? ""} - {p.ParameterName}",
                            Result = p.Value ?? "",
                            Unit = p.Unit ?? "",
                            ReferenceRange = p.ReferenceRange ?? "",
                            IsAbnormal = LabFlagEvaluator.IsAbnormal(p.Flag)
                        });
                    }
                }
                else
                {
                    labResults.Add(new PdfTemplateHelper.LabResultRow
                    {
                        TestName = d.Service?.ServiceName ?? "",
                        Result = d.Result ?? "",
                        Unit = "",
                        ReferenceRange = "",
                        IsAbnormal = false
                    });
                }
            }

            var completedAt = detailsWithResult.Select(d => d.ResultDate).Where(x => x.HasValue).OrderByDescending(x => x).FirstOrDefault();

            var html = PdfTemplateHelper.GetLabResult(
                patient?.PatientCode, patient?.FullName, genderInt, patient?.DateOfBirth,
                patient?.Address, null, null,
                sr.Diagnosis, sr.Doctor?.FullName, sr.Department?.DepartmentName,
                sr.RequestDate, completedAt,
                labResults, approverName);

            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return System.Text.Encoding.UTF8.GetBytes($"LAB RESULT: {orderId}");
        }
    }

    public async Task<bool> ProcessCriticalValueAsync(ProcessCriticalValueDto dto)
    {
        try
        {
            var alert = await _context.Set<LabCriticalValueAlert>().FindAsync(dto.AlertId);
            if (alert == null) return false;

            if (dto.Action == "Acknowledge")
            {
                alert.IsAcknowledged = true;
                alert.AcknowledgedAt = DateTime.Now;
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error processing critical value alert {AlertId}", dto.AlertId);
            return true;
        }
    }

    public async Task<List<CriticalValueAlertDto>> GetCriticalValueAlertsAsync(DateTime fromDate, DateTime toDate, bool? acknowledged = null)
    {
        try
        {
            var query = _context.Set<LabCriticalValueAlert>()
                .Where(a => !a.IsDeleted && a.AlertTime >= fromDate && a.AlertTime <= toDate);

            if (acknowledged.HasValue)
                query = query.Where(a => a.IsAcknowledged == acknowledged.Value);

            var alerts = await query.OrderByDescending(a => a.AlertTime).ToBoundedListAsync("LISCompleteService.GetCriticalValueAlertsAsync");

            return alerts.Select(a => new CriticalValueAlertDto
            {
                LabTestItemId = a.LabResultId,
                LabOrderId = a.LabResultId,
                PatientName = a.Patient?.FullName ?? "",
                PatientCode = a.Patient?.PatientCode ?? "",
                TestName = a.TestName,
                Result = a.Result ?? a.NumericResult?.ToString() ?? "",
                Unit = a.Unit ?? "",
                ReferenceRange = $"{a.CriticalLow} - {a.CriticalHigh}",
                AbnormalFlag = a.AlertType,
                AlertAt = a.AlertTime,
                IsAcknowledged = a.IsAcknowledged,
                AcknowledgedAt = a.AcknowledgedAt,
                AcknowledgedBy = a.AcknowledgedByUser?.FullName
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting critical value alerts");
            return new List<CriticalValueAlertDto>();
        }
    }

    public async Task<bool> AcknowledgeCriticalValueAsync(Guid alertId, AcknowledgeCriticalValueDto dto)
    {
        try
        {
            var alert = await _context.Set<LabCriticalValueAlert>().FindAsync(alertId);
            if (alert == null) return false;

            alert.IsAcknowledged = true;
            alert.AcknowledgedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error acknowledging critical value {AlertId}", alertId);
            return true;
        }
    }
}
