using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Sửa hàng loạt đối tượng thanh toán (BHYT/Viện phí/Dịch vụ) của dịch vụ
/// hoặc thuốc theo BN. Use case: BN mang BHYT nhưng phát hiện thẻ hết hạn,
/// đổi hết dịch vụ đã chỉ định sang Thu phí.
/// </summary>
public class ReassignObjectService : IReassignObjectService
{
    private readonly HISDbContext _db;
    private readonly ILogger<ReassignObjectService> _logger;

    public ReassignObjectService(HISDbContext db, ILogger<ReassignObjectService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ReassignObjectResultDto> ReassignAsync(ReassignObjectRequestDto dto, Guid userId)
    {
        if (dto.ToPatientType < 1 || dto.ToPatientType > 4)
            throw new ArgumentException("ToPatientType phải 1-4 (1=BHYT, 2=ViệnPhí, 3=DịchVụ, 4=KhámSK)");
        if (string.IsNullOrWhiteSpace(dto.Reason))
            throw new ArgumentException("Lý do bắt buộc (audit)");

        var result = new ReassignObjectResultDto();
        var patientRecordIds = await _db.MedicalRecords
            .Where(m => m.PatientId == dto.PatientId && (!dto.MedicalRecordId.HasValue || m.Id == dto.MedicalRecordId))
            .Select(m => m.Id)
            .ToListAsync();

        if (patientRecordIds.Count == 0)
            throw new InvalidOperationException("Không tìm thấy hồ sơ bệnh án của BN");

        if (dto.Scope == "service")
        {
            await ReassignServicesAsync(dto, patientRecordIds, result);
        }
        else if (dto.Scope == "medicine")
        {
            await ReassignMedicinesAsync(dto, patientRecordIds, result);
        }
        else
        {
            throw new ArgumentException($"Scope không hợp lệ: {dto.Scope}");
        }

        await _db.SaveChangesAsync();

        _logger.LogWarning(
            "User {UserId} reassigned {Count} {Scope} for patient {PatientId} to type {Type}. Reason: {Reason}",
            userId, result.UpdatedCount, dto.Scope, dto.PatientId, dto.ToPatientType, dto.Reason);

        return result;
    }

    private async Task ReassignServicesAsync(
        ReassignObjectRequestDto dto,
        List<Guid> recordIds,
        ReassignObjectResultDto result)
    {
        var q = _db.ServiceRequestDetails
            .Include(d => d.ServiceRequest)
            .Where(d => recordIds.Contains(d.ServiceRequest.MedicalRecordId));

        // KHÔNG cho đổi dòng đã thanh toán / đã có kết quả
        q = q.Where(d => d.ServiceRequest.Status != 4 && !d.ServiceRequest.IsPaid);

        if (dto.Mode == "detail")
        {
            q = q.Where(d => dto.ItemIds.Contains(d.Id));
        }
        else if (dto.FromPatientType.HasValue)
        {
            q = q.Where(d => d.PatientType == dto.FromPatientType.Value);
        }

        var items = await q.ToListAsync();
        result.OldTotal = items.Sum(i => i.PatientAmount);

        foreach (var it in items)
        {
            it.PatientType = dto.ToPatientType;
            // Recompute split theo logic đơn giản
            if (dto.ToPatientType == 1)
            {
                // BHYT: giữ InsurancePaymentRate hiện tại; nếu = 0 thì default 80
                var rate = it.InsurancePaymentRate > 0 ? it.InsurancePaymentRate : 80;
                it.InsurancePaymentRate = rate;
                it.InsuranceAmount = Math.Round(it.Amount * rate / 100m, 0);
                it.PatientAmount = it.Amount - it.InsuranceAmount;
            }
            else
            {
                it.InsurancePaymentRate = 0;
                it.InsuranceAmount = 0;
                it.PatientAmount = it.Amount;
            }
            it.UpdatedAt = DateTime.UtcNow;
        }

        // Recompute ServiceRequest totals
        var affectedRequestIds = items.Select(i => i.ServiceRequestId).Distinct().ToList();
        var requests = await _db.ServiceRequests
            .Where(r => affectedRequestIds.Contains(r.Id))
            .Include(r => r.Details)
            .ToListAsync();
        foreach (var r in requests)
        {
            r.InsuranceAmount = r.Details.Sum(d => d.InsuranceAmount);
            r.PatientAmount = r.Details.Sum(d => d.PatientAmount);
            r.UpdatedAt = DateTime.UtcNow;
        }

        result.UpdatedCount = items.Count;
        result.NewTotal = items.Sum(i => i.PatientAmount);
        if (items.Count == 0)
            result.Warnings.Add("Không có dịch vụ nào thỏa điều kiện để đổi (đã thanh toán hoặc đã có kết quả)");
    }

    private async Task ReassignMedicinesAsync(
        ReassignObjectRequestDto dto,
        List<Guid> recordIds,
        ReassignObjectResultDto result)
    {
        var q = _db.PrescriptionDetails
            .Include(d => d.Prescription)
            .Where(d => recordIds.Contains(d.Prescription.MedicalRecordId));

        // Không cho đổi đơn thuốc đã phát
        q = q.Where(d => !d.Prescription.IsDispensed);

        if (dto.Mode == "detail")
        {
            q = q.Where(d => dto.ItemIds.Contains(d.Id));
        }
        else if (dto.FromPatientType.HasValue)
        {
            q = q.Where(d => d.PatientType == dto.FromPatientType.Value);
        }

        var items = await q.ToListAsync();
        result.OldTotal = items.Sum(i => i.PatientAmount);

        foreach (var it in items)
        {
            it.PatientType = dto.ToPatientType;
            if (dto.ToPatientType == 1)
            {
                var rate = it.InsurancePaymentRate > 0 ? it.InsurancePaymentRate : 80;
                it.InsurancePaymentRate = rate;
                it.InsuranceAmount = Math.Round(it.Amount * rate / 100m, 0);
                it.PatientAmount = it.Amount - it.InsuranceAmount;
            }
            else
            {
                it.InsurancePaymentRate = 0;
                it.InsuranceAmount = 0;
                it.PatientAmount = it.Amount;
            }
            it.UpdatedAt = DateTime.UtcNow;
        }

        var affectedPrescriptionIds = items.Select(i => i.PrescriptionId).Distinct().ToList();
        var prescriptions = await _db.Prescriptions
            .Where(p => affectedPrescriptionIds.Contains(p.Id))
            .Include(p => p.Details)
            .ToListAsync();
        foreach (var p in prescriptions)
        {
            p.InsuranceAmount = p.Details.Sum(d => d.InsuranceAmount);
            p.PatientAmount = p.Details.Sum(d => d.PatientAmount);
            p.UpdatedAt = DateTime.UtcNow;
        }

        result.UpdatedCount = items.Count;
        result.NewTotal = items.Sum(i => i.PatientAmount);
        if (items.Count == 0)
            result.Warnings.Add("Không có thuốc nào thỏa điều kiện để đổi (đã phát thuốc)");
    }
}
