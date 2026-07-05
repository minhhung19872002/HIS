using HIS.Application.Common;
using HIS.Application.DTOs.ServiceRefund;
using HIS.Application.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Cho lại chỉ định CLS sau hoàn hóa đơn — N1.09 — tách khỏi ServiceRefundController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ nguyên; return map về ServiceOutcome.
/// </summary>
public class ServiceRefundService : IServiceRefundService
{
    private readonly HISDbContext _db;
    public ServiceRefundService(HISDbContext db) { _db = db; }

    /// <summary>Lấy danh sách DV CLS đã hủy/hoàn của 1 hồ sơ để chọn "cho lại".</summary>
    public async Task<ServiceOutcome> CancelledServicesAsync(Guid medicalRecordId)
    {
        var list = await _db.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medicalRecordId
                && d.Status == 3) // 3 = Hủy
            .OrderByDescending(d => d.UpdatedAt ?? d.CreatedAt)
            .Take(100)
            .ToListAsync();
        return ServiceOutcome.Ok(list.Select(d => new
        {
            d.Id,
            ServiceRequestId = d.ServiceRequestId,
            RequestCode = d.ServiceRequest.RequestCode,
            RequestDate = d.ServiceRequest.RequestDate,
            ServiceCode = d.Service.ServiceCode,
            ServiceName = d.Service.ServiceName,
            d.Quantity,
            d.UnitPrice,
            d.Amount,
            d.PatientAmount,
            d.InsuranceAmount,
            d.Note,
            CancelledAt = d.UpdatedAt,
        }).ToList());
    }

    /// <summary>Cho lại các chỉ định — chuyển status về Chờ, log lý do.</summary>
    public async Task<ServiceOutcome> RequeueAsync(RequeueDto dto, Guid userId)
    {
        if (dto.ServiceRequestDetailIds.Count == 0)
            return ServiceOutcome.Bad("Chưa chọn dịch vụ");
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return ServiceOutcome.Bad("Phải nhập lý do cho lại");

        var details = await _db.ServiceRequestDetails
            .Include(d => d.ServiceRequest)
            .Where(d => dto.ServiceRequestDetailIds.Contains(d.Id))
            .ToListAsync();

        var updated = 0;
        var now = DateTime.Now;

        foreach (var d in details)
        {
            if (d.Status != 3) continue; // only re-issue cancelled ones
            d.Status = 0;
            d.Result = null;
            d.ResultDescription = null;
            d.Conclusion = null;
            d.ResultDate = null;
            d.ResultUserId = null;
            d.IsSampleCollected = false;
            d.SampleCollectedAt = null;
            d.SampleBarcode = null;
            var prefix = string.IsNullOrWhiteSpace(d.Note) ? "" : d.Note + "\n";
            d.Note = $"{prefix}[CHO LẠI {now:dd/MM/yyyy HH:mm}] {dto.Reason}";
            d.UpdatedAt = now;
            d.UpdatedBy = userId.ToString();

            // Also lift parent request from cancelled if entirely rebooted
            var sr = d.ServiceRequest;
            if (sr.Status == 4)
            {
                sr.Status = dto.KeepAsPaid && sr.IsPaid ? 1 : 0;
                sr.UpdatedAt = now;
                sr.UpdatedBy = userId.ToString();
            }
            updated++;
        }

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { requeued = updated, total = details.Count });
    }
}
