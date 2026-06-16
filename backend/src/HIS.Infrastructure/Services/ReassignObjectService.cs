using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
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
    private readonly IBhytFullCoverageService _fullCoverage;

    public ReassignObjectService(
        HISDbContext db,
        ILogger<ReassignObjectService> logger,
        IBhytFullCoverageService fullCoverage)
    {
        _db = db;
        _logger = logger;
        _fullCoverage = fullCoverage;
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

        // #157: mức hưởng BHYT THỰC theo hồ sơ (InsuranceCoverageRate 80/95/100) — thay default 80 cứng.
        var coverageByRecord = await _db.MedicalRecords
            .Where(m => recordIds.Contains(m.Id))
            .Select(m => new { m.Id, m.InsuranceCoverageRate })
            .ToDictionaryAsync(x => x.Id, x => x.InsuranceCoverageRate);

        foreach (var it in items)
        {
            it.PatientType = dto.ToPatientType;
            // Recompute split theo logic đơn giản
            if (dto.ToPatientType == 1)
            {
                // #157: ưu tiên rate dòng đã có > mức hưởng thực của hồ sơ (InsuranceCoverageRate) > 80 (fallback cuối).
                var recRate = coverageByRecord.TryGetValue(it.ServiceRequest.MedicalRecordId, out var cr) ? cr : null;
                var rate = it.InsurancePaymentRate > 0 ? it.InsurancePaymentRate
                         : (recRate.HasValue && recRate.Value > 0 ? recRate.Value : 80);
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

    // ────────────────────────────────────────────────────────────────────────────────
    // PER-LINE / PER-RECORD CHANGE WITH AUDIT — additive, KHÔNG đổi công thức tiền
    // Chiến lược: reuse toàn bộ logic tính tiền trong ReassignServicesAsync /
    //             ReassignMedicinesAsync qua ReassignAsync (mode=detail / mode=all).
    //             Chỉ thêm ghi PayerChangeLog sau khi ReassignAsync hoàn thành.
    // ────────────────────────────────────────────────────────────────────────────────

    public async Task<ChangeObjectResultDto> ChangeObjectForRecordAsync(
        ChangeObjectForRecordRequestDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            throw new ArgumentException("Lý do bắt buộc (audit)");
        if (dto.ToObjectType < 1 || dto.ToObjectType > 4)
            throw new ArgumentException("ToObjectType phải 1-4");

        // Lấy medicalRecord để xác định patientId
        var record = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == dto.MedicalRecordId)
            ?? throw new InvalidOperationException("Không tìm thấy hồ sơ bệnh án");

        // Snapshot trước khi đổi
        var oldServiceTotal = await _db.ServiceRequestDetails
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == dto.MedicalRecordId
                     && d.ServiceRequest.Status != 4 && !d.ServiceRequest.IsPaid)
            .SumAsync(d => d.PatientAmount);

        var oldDrugTotal = await _db.PrescriptionDetails
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == dto.MedicalRecordId
                     && !d.Prescription.IsDispensed)
            .SumAsync(d => d.PatientAmount);

        var oldTotal = oldServiceTotal + oldDrugTotal;

        // Reuse logic cũ — scope service + medicine, mode all
        var svcReq = new ReassignObjectRequestDto
        {
            PatientId = record.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            Scope = "service",
            Mode = "all",
            ToPatientType = dto.ToObjectType,
            Reason = dto.Reason,
        };
        var svcResult = await ReassignAsync(svcReq, userId);

        var medReq = new ReassignObjectRequestDto
        {
            PatientId = record.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            Scope = "medicine",
            Mode = "all",
            ToPatientType = dto.ToObjectType,
            Reason = dto.Reason,
        };
        var medResult = await ReassignAsync(medReq, userId);

        var newTotal = svcResult.NewTotal + medResult.NewTotal;
        var totalLines = svcResult.UpdatedCount + medResult.UpdatedCount;

        // Ghi audit log
        var log = new PayerChangeLog
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = dto.MedicalRecordId,
            ChangeScope = "record",
            FromObjectType = 0, // 0 = mixed (nhiều đối tượng), ghi chú qua Reason
            ToObjectType = dto.ToObjectType,
            Reason = dto.Reason,
            ChangedBy = userId,
            OldPatientAmount = oldTotal,
            NewPatientAmount = newTotal,
            AffectedLineCount = totalLines,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
        };
        _db.Set<PayerChangeLog>().Add(log);
        await _db.SaveChangesAsync();

        _logger.LogWarning(
            "User {UserId} ChangeObjectForRecord MedicalRecord {RecId} → type {Type}. Lines={Lines} Δ={Delta}. Reason: {Reason}",
            userId, dto.MedicalRecordId, dto.ToObjectType, totalLines, newTotal - oldTotal, dto.Reason);

        var warnings = svcResult.Warnings.Concat(medResult.Warnings).ToList();

        return new ChangeObjectResultDto
        {
            LogId = log.Id,
            FromObjectType = 0,
            ToObjectType = dto.ToObjectType,
            OldPatientAmount = oldTotal,
            NewPatientAmount = newTotal,
            DeltaPatientAmount = newTotal - oldTotal,
            AffectedLineCount = totalLines,
            Warnings = warnings,
        };
    }

    public async Task<ChangeObjectResultDto> ChangeObjectForServiceLineAsync(
        ChangeObjectForServiceLineRequestDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            throw new ArgumentException("Lý do bắt buộc (audit)");
        if (dto.ToObjectType < 1 || dto.ToObjectType > 4)
            throw new ArgumentException("ToObjectType phải 1-4");

        var detail = await _db.ServiceRequestDetails
            .Include(d => d.ServiceRequest)
            .FirstOrDefaultAsync(d => d.Id == dto.ServiceRequestDetailId)
            ?? throw new InvalidOperationException("Không tìm thấy dòng dịch vụ");

        if (detail.ServiceRequest.Status == 4 || detail.ServiceRequest.IsPaid)
            throw new InvalidOperationException("Dòng dịch vụ đã thanh toán hoặc đã hủy — không thể đổi đối tượng");

        var oldPatientAmount = detail.PatientAmount;
        var fromType = detail.PatientType;

        var medRecord = await _db.MedicalRecords
            .FirstOrDefaultAsync(m => m.Id == detail.ServiceRequest.MedicalRecordId)
            ?? throw new InvalidOperationException("Không tìm thấy hồ sơ bệnh án");

        // Reuse logic tính tiền: gọi ReassignAsync mode=detail, scope=service
        var req = new ReassignObjectRequestDto
        {
            PatientId = medRecord.PatientId,
            MedicalRecordId = detail.ServiceRequest.MedicalRecordId,
            Scope = "service",
            Mode = "detail",
            ToPatientType = dto.ToObjectType,
            ItemIds = new List<Guid> { dto.ServiceRequestDetailId },
            Reason = dto.Reason,
        };
        var result = await ReassignAsync(req, userId);

        // Reload để lấy giá mới sau khi tính lại
        await _db.Entry(detail).ReloadAsync();
        var newPatientAmount = detail.PatientAmount;

        var log = new PayerChangeLog
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = detail.ServiceRequest.MedicalRecordId,
            ServiceRequestDetailId = dto.ServiceRequestDetailId,
            ChangeScope = "service_line",
            FromObjectType = fromType,
            ToObjectType = dto.ToObjectType,
            Reason = dto.Reason,
            ChangedBy = userId,
            OldPatientAmount = oldPatientAmount,
            NewPatientAmount = newPatientAmount,
            AffectedLineCount = 1,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
        };
        _db.Set<PayerChangeLog>().Add(log);
        await _db.SaveChangesAsync();

        _logger.LogWarning(
            "User {UserId} ChangeObjectForServiceLine Detail {DetailId} {From}→{To} Δ={Delta}. Reason: {Reason}",
            userId, dto.ServiceRequestDetailId, fromType, dto.ToObjectType, newPatientAmount - oldPatientAmount, dto.Reason);

        return new ChangeObjectResultDto
        {
            LogId = log.Id,
            FromObjectType = fromType,
            ToObjectType = dto.ToObjectType,
            OldPatientAmount = oldPatientAmount,
            NewPatientAmount = newPatientAmount,
            DeltaPatientAmount = newPatientAmount - oldPatientAmount,
            AffectedLineCount = 1,
            Warnings = result.Warnings,
        };
    }

    public async Task<ChangeObjectResultDto> ChangeObjectForDrugLineAsync(
        ChangeObjectForDrugLineRequestDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            throw new ArgumentException("Lý do bắt buộc (audit)");
        if (dto.ToObjectType < 1 || dto.ToObjectType > 4)
            throw new ArgumentException("ToObjectType phải 1-4");

        var detail = await _db.PrescriptionDetails
            .Include(d => d.Prescription)
            .FirstOrDefaultAsync(d => d.Id == dto.PrescriptionDetailId)
            ?? throw new InvalidOperationException("Không tìm thấy dòng thuốc/VTYT");

        if (detail.Prescription.IsDispensed)
            throw new InvalidOperationException("Đơn thuốc đã phát — không thể đổi đối tượng");

        var oldPatientAmount = detail.PatientAmount;
        var fromType = detail.PatientType;

        var medRecord = await _db.MedicalRecords
            .FirstOrDefaultAsync(m => m.Id == detail.Prescription.MedicalRecordId)
            ?? throw new InvalidOperationException("Không tìm thấy hồ sơ bệnh án");

        // Reuse logic tính tiền: gọi ReassignAsync mode=detail, scope=medicine
        var req = new ReassignObjectRequestDto
        {
            PatientId = medRecord.PatientId,
            MedicalRecordId = detail.Prescription.MedicalRecordId,
            Scope = "medicine",
            Mode = "detail",
            ToPatientType = dto.ToObjectType,
            ItemIds = new List<Guid> { dto.PrescriptionDetailId },
            Reason = dto.Reason,
        };
        var result = await ReassignAsync(req, userId);

        // Reload để lấy giá mới
        await _db.Entry(detail).ReloadAsync();
        var newPatientAmount = detail.PatientAmount;

        var log = new PayerChangeLog
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = detail.Prescription.MedicalRecordId,
            PrescriptionDetailId = dto.PrescriptionDetailId,
            ChangeScope = "drug_line",
            FromObjectType = fromType,
            ToObjectType = dto.ToObjectType,
            Reason = dto.Reason,
            ChangedBy = userId,
            OldPatientAmount = oldPatientAmount,
            NewPatientAmount = newPatientAmount,
            AffectedLineCount = 1,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
        };
        _db.Set<PayerChangeLog>().Add(log);
        await _db.SaveChangesAsync();

        _logger.LogWarning(
            "User {UserId} ChangeObjectForDrugLine Detail {DetailId} {From}→{To} Δ={Delta}. Reason: {Reason}",
            userId, dto.PrescriptionDetailId, fromType, dto.ToObjectType, newPatientAmount - oldPatientAmount, dto.Reason);

        return new ChangeObjectResultDto
        {
            LogId = log.Id,
            FromObjectType = fromType,
            ToObjectType = dto.ToObjectType,
            OldPatientAmount = oldPatientAmount,
            NewPatientAmount = newPatientAmount,
            DeltaPatientAmount = newPatientAmount - oldPatientAmount,
            AffectedLineCount = 1,
            Warnings = result.Warnings,
        };
    }

    public async Task<List<PayerChangeLogDto>> GetPayerChangeHistoryAsync(Guid medicalRecordId)
    {
        var logs = await _db.Set<PayerChangeLog>()
            .Where(l => l.MedicalRecordId == medicalRecordId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(100)
            .ToListAsync();

        // Lấy tên user từ UserId
        var userIds = logs.Select(l => l.ChangedBy).Distinct().ToList();
        var userNames = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName ?? u.Username);

        return logs.Select(l => new PayerChangeLogDto
        {
            Id = l.Id,
            ChangeScope = l.ChangeScope,
            FromObjectType = l.FromObjectType,
            ToObjectType = l.ToObjectType,
            Reason = l.Reason,
            ChangedBy = l.ChangedBy,
            ChangedByName = userNames.GetValueOrDefault(l.ChangedBy),
            OldPatientAmount = l.OldPatientAmount,
            NewPatientAmount = l.NewPatientAmount,
            AffectedLineCount = l.AffectedLineCount,
            ChangedAt = l.CreatedAt,
            ServiceRequestDetailId = l.ServiceRequestDetailId,
            PrescriptionDetailId = l.PrescriptionDetailId,
        }).ToList();
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

        // F3.4: kiem tra BN co trong danh sach full-coverage khong (1 query cho ca lo)
        var isFullCoverage = dto.ToPatientType == 1
            && await _fullCoverage.IsFullCoverageActiveAsync(dto.PatientId, DateTime.UtcNow);

        foreach (var it in items)
        {
            it.PatientType = dto.ToPatientType;
            if (dto.ToPatientType == 1)
            {
                var rate = it.InsurancePaymentRate > 0 ? it.InsurancePaymentRate : 80;
                it.InsurancePaymentRate = rate;
                it.InsuranceAmount = Math.Round(it.Amount * rate / 100m, 0);
                it.PatientAmount = it.Amount - it.InsuranceAmount;

                // F3.4 ADDITIVE: neu BN thuoc dien 100% thuoc dac tri → phan cung chi tra = 0
                // BN khong trong danh sach: tinh y nhu cu (khong doi)
                if (isFullCoverage)
                {
                    it.InsuranceAmount = it.Amount;
                    it.PatientAmount = 0;
                }
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
