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
        // QA-R4: a tube rejected at reception (hemolysed, clotted, wrong tube…) is not a valid specimen — a result
        // could still be typed on it and then approved (measured: ReceiveStatus 2 + Result + ReviewedAt).
        if (d.ReceiveStatus == LisModel1Map.RejectedReceiveStatus)
            throw new InvalidOperationException("Mẫu đã bị từ chối tại nhận mẫu — phải lấy lại mẫu trước khi ghi kết quả.");
        // OPD cancel marks only the header (ServiceRequests.Status=4), details keep Status 0 → guard the header too
        if (await _context.ServiceRequests.AnyAsync(r => r.Id == d.ServiceRequestId && (r.Status == 4 || r.IsDeleted)))
            throw new InvalidOperationException("Phiếu chỉ định đã hủy, không ghi được kết quả.");

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
            // Gender-specific reference ranges (catalog NormalMin/MaxFemale were never applied before)
            var gender = await _context.ServiceRequests.Where(r => r.Id == d.ServiceRequestId)
                .Select(r => (int?)r.MedicalRecord.Patient.Gender).FirstOrDefaultAsync();

            int seq = 0;
            foreach (var p in dto.Parameters)
            {
                var cat = catalog.FirstOrDefault(c => c.Code == p.ParameterCode || c.Hl7Code == p.ParameterCode);
                var range = LabFlagEvaluator.ResolveRange(cat, gender);
                var min = p.ReferenceMin ?? range.Min;
                var max = p.ReferenceMax ?? range.Max;
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

        // QA-R4: a result written on a rejected tube must never be released
        if (details.Any(x => !string.IsNullOrEmpty(x.Result) && x.ReceiveStatus == LisModel1Map.RejectedReceiveStatus))
            throw new InvalidOperationException("Có mẫu đã bị từ chối tại nhận mẫu — không duyệt được, phải lấy lại mẫu.");

        // QA-R2: same rule as final-approve — re-approving overwrote the approver/time and re-notified.
        var toApprove = details.Where(x => !string.IsNullOrEmpty(x.Result) && x.ReviewedAt == null).ToList();
        if (toApprove.Count == 0)
            throw new InvalidOperationException(details.Any(x => !string.IsNullOrEmpty(x.Result))
                ? "Kết quả đã được duyệt — hủy duyệt trước nếu cần duyệt lại"
                : "Phiếu không có kết quả nào để duyệt");

        foreach (var d in toApprove)
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
        // QA-R4: unknown/zero order id answered 200 and did nothing; an order with no result got a "[KTV]" note only
        var sr = await _context.ServiceRequests
            .FirstOrDefaultAsync(r => r.Id == orderId && r.RequestType == 1 && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu xét nghiệm");

        var details = await _context.ServiceRequestDetails
            .Where(d => d.ServiceRequestId == orderId && !d.IsDeleted && d.Status != 3)
            .ToListAsync();

        // Only results not yet released: re-running "sơ duyệt" on a final-approved order used to re-stamp the
        // technician of a doctor-reviewed result.
        var toApprove = details.Where(x => !string.IsNullOrEmpty(x.Result) && x.ReviewedAt == null).ToList();
        if (toApprove.Count == 0)
            throw new InvalidOperationException(details.Any(x => !string.IsNullOrEmpty(x.Result))
                ? "Phiếu đã được duyệt chính thức — không sơ duyệt lại"
                : "Phiếu không có kết quả nào để duyệt sơ bộ");

        foreach (var d in toApprove)
        {
            if (approvedByUserId.HasValue)
                d.TechnicianUserId = approvedByUserId.Value;
            if (d.TechnicianRunAt == null)
                d.TechnicianRunAt = DateTime.Now;
        }

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

        // Nothing to approve (unknown order / no result yet) → report it instead of a silent "approved"
        if (!details.Any(x => !string.IsNullOrEmpty(x.Result))) return false;

        // QA-R4: a result written on a rejected tube must never be released
        if (details.Any(x => !string.IsNullOrEmpty(x.Result) && x.ReceiveStatus == LisModel1Map.RejectedReceiveStatus))
            throw new InvalidOperationException("Có mẫu đã bị từ chối tại nhận mẫu — không duyệt được, phải lấy lại mẫu.");

        // Second final-approve used to return 200, overwrite approver/time of an already released result
        // and re-send the "BS duyệt" notification. Only unreviewed results are approved; none left → refuse.
        var toApprove = details.Where(x => !string.IsNullOrEmpty(x.Result) && x.ReviewedAt == null).ToList();
        if (toApprove.Count == 0)
            throw new InvalidOperationException("Phiếu đã được duyệt chính thức — hủy duyệt trước nếu cần duyệt lại");

        foreach (var d in toApprove)
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
        // QA-R4: same rules as the cancel chain — a reason is mandatory (audit trail), an unknown order is 404 and
        // an order with nothing approved is refused instead of a silent 200 that only appended a note.
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Phải ghi lý do hủy duyệt", nameof(reason));
        var sr = await _context.ServiceRequests
            .FirstOrDefaultAsync(r => r.Id == orderId && r.RequestType == 1 && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu xét nghiệm");

        // Hủy duyệt revert cả 2 bước: final (ReviewedAt) lẫn sơ duyệt (TechnicianUserId) → order về 3 "Chờ duyệt"
        // (khớp FE: nút Hủy duyệt hiện khi status >= 4). Trade-off: mất dấu KTV sơ duyệt — chấp nhận như model 3 cũ.
        var details = await _context.ServiceRequestDetails
            .Where(d => d.ServiceRequestId == orderId && !d.IsDeleted && d.Status != 3
                && (d.ReviewedAt != null || d.TechnicianUserId != null))
            .ToListAsync();
        if (details.Count == 0)
            throw new InvalidOperationException("Phiếu chưa được duyệt — không có gì để hủy duyệt");

        foreach (var d in details)
        {
            d.ReviewedAt = null;
            d.ReviewerUserId = null;
            d.TechnicianUserId = null;
        }

        {
            var notePrefix = string.IsNullOrWhiteSpace(sr.Notes) ? "" : sr.Notes + "\n";
            sr.Notes = notePrefix + $"[Hủy duyệt] {reason.Trim()}";
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

            // QA-R4: who was notified / how / note used to be dropped — the only audit trail of a critical call
            if (!string.IsNullOrWhiteSpace(dto.NotifiedPerson)) alert.NotifiedPerson = dto.NotifiedPerson.Trim();
            if (!string.IsNullOrWhiteSpace(dto.NotificationMethod)) alert.NotificationMethod = dto.NotificationMethod.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Note)) alert.Notes = dto.Note.Trim();
            switch (dto.Action)
            {
                case "Acknowledge":
                    alert.IsAcknowledged = true;
                    alert.AcknowledgedAt = DateTime.Now;
                    alert.Status = 1;
                    break;
                case "Notify":
                    alert.NotificationTime ??= DateTime.Now;
                    break;
                case "Escalate":
                    alert.Status = 2;
                    break;
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            // Patient safety: a failed save must not report "critical value handled".
            _logger.LogWarning(ex, "Error processing critical value alert {AlertId}", dto.AlertId);
            throw;
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
            alert.Status = 1;
            // QA-R4: the acknowledgement body (who was told, how, when, note) was ignored entirely
            if (dto != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.NotifiedPerson)) alert.NotifiedPerson = dto.NotifiedPerson.Trim();
                if (!string.IsNullOrWhiteSpace(dto.NotificationMethod)) alert.NotificationMethod = dto.NotificationMethod.Trim();
                if (dto.NotificationTime != default) alert.NotificationTime = dto.NotificationTime;
                if (!string.IsNullOrWhiteSpace(dto.Note)) alert.Notes = dto.Note.Trim();
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            // Patient safety: a failed save must not report the critical value as acknowledged.
            _logger.LogWarning(ex, "Error acknowledging critical value {AlertId}", alertId);
            throw;
        }
    }
}
