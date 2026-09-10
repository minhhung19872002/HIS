using HIS.Application.DTOs.BusinessAlert;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class BusinessAlertService
{
    // Rule 29: Critical lab values (panic values)
    private async Task<List<BusinessAlertDto>> CheckCriticalLabValuesAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // #14e: model 1 — chỉ số con cờ nguy kịch HH/LL 3 ngày gần nhất (model 2 LabResults đã gỡ)
            var criticalRows = await _context.ServiceRequestDetailParameters
                .Where(p => !p.IsDeleted
                    && p.ServiceRequestDetail!.ServiceRequest.MedicalRecord.PatientId == patientId
                    && (p.Flag == "HH" || p.Flag == "LL")
                    && p.CreatedAt >= DateTime.UtcNow.AddDays(-3))
                .OrderByDescending(p => p.CreatedAt)
                .Take(5)
                .Select(p => new { p.ParameterName, p.Value, p.ReferenceRange })
                .ToListAsync();
            foreach (var r in criticalRows)
            {
                alerts.Add(CreateAlert("LAB-29", "Lab", 1, "Lab",
                    "Giá trị nguy hiểm",
                    $"XN {r.ParameterName}: kết quả {r.Value ?? "N/A"} (GTBT: {r.ReferenceRange ?? "N/A"}). GIÁ TRỊ NGUY KỊCH - THÔNG BÁO BS NGAY.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule LAB-29 error"); }
        return alerts;
    }

    // Rule 30: Rejected specimen
    private async Task<List<BusinessAlertDto>> CheckRejectedSpecimenAsync(Guid patientId, Guid? requestId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // #14b: model 1 — SampleReceive reject ghi SRD.ReceiveStatus=2 + RejectReason (LabRequestItems model 2 chết)
            var query = _context.ServiceRequestDetails
                .Include(d => d.Service)
                .Where(d => d.ServiceRequest.MedicalRecord.PatientId == patientId
                    && d.ReceiveStatus == 2 // mẫu bị từ chối
                    && d.CreatedAt >= DateTime.UtcNow.AddDays(-3));

            if (requestId.HasValue)
                query = query.Where(d => d.ServiceRequestId == requestId.Value);

            var rejected = await query.Take(5).ToListAsync();

            foreach (var item in rejected)
            {
                alerts.Add(CreateAlert("LAB-30", "Lab", 2, "Lab",
                    "Mau bi tu choi",
                    $"Mẫu XN {item.Service?.ServiceName ?? "N/A"} bị từ chối: {item.RejectReason ?? "Vấn đề chất lượng mẫu"}. Cần lấy mẫu lại.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule LAB-30 error"); }
        return alerts;
    }

    // Rule 31: Duplicate test order (same test within 24h)
    private async Task<List<BusinessAlertDto>> CheckDuplicateTestOrderAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // F2.13: Load special test rules for this patient's active services
            var specialRules = await _context.SpecialTestRules
                .Where(r => r.IsActive && !r.IsDeleted)
                .Select(r => new { r.TestId, r.WindowType, r.WindowDays })
                .ToListAsync();
            var specialRuleMap = specialRules.ToDictionary(r => r.TestId);

            // Default fallback window = 24h (Rule LAB-31 original)
            const int fallbackHours = 24;

            // Determine the widest window we need to look back (either per-rule or fallback)
            // For per-episode we look back 90 days (covers any realistic episode), then filter in memory
            // For N-days we look back max(WindowDays) or 90 days
            var maxLookbackDays = specialRuleMap.Values
                .Where(r => r.WindowType == 1)
                .Select(r => r.WindowDays ?? fallbackHours / 24)
                .DefaultIfEmpty(0)
                .Max();
            var lookbackHours = Math.Max(fallbackHours, maxLookbackDays * 24 + 1); // +1 to include boundary
            // Per-episode rules need a wide lookback (an episode can span weeks) — extend to 90 days
            if (specialRuleMap.Values.Any(r => r.WindowType == 0)) lookbackHours = 90 * 24;
            // Cap at 90 days to avoid full-table scans
            if (lookbackHours > 90 * 24) lookbackHours = 90 * 24;

            var sinceUtc = DateTime.UtcNow.AddHours(-lookbackHours);

            // #14b: model 1 — SRD theo BN, loại dòng hủy
            var recentOrders = await _context.ServiceRequestDetails
                .Where(d => d.ServiceRequest.MedicalRecord.PatientId == patientId
                    && d.ServiceRequest.RequestType == 1 && d.Status != 3 && !d.IsDeleted
                    && d.CreatedAt >= sinceUtc)
                .Select(d => new
                {
                    d.ServiceId,
                    ServiceName = d.Service.ServiceName,
                    d.CreatedAt,
                    MedicalRecordId = d.ServiceRequest.MedicalRecordId,
                })
                .ToListAsync();

            // Group by ServiceId and evaluate each group against its rule
            var grouped = recentOrders.GroupBy(d => d.ServiceId);
            foreach (var grp in grouped)
            {
                var serviceId = grp.Key;
                var items = grp.OrderBy(d => d.CreatedAt).ToList();
                if (items.Count <= 1) continue;

                var serviceName = items[0].ServiceName ?? serviceId.ToString();

                if (specialRuleMap.TryGetValue(serviceId, out var rule))
                {
                    if (rule.WindowType == 0)
                    {
                        // Per-episode: flag if more than 1 order in the same MedicalRecord (đợt điều trị)
                        var byEpisode = items.GroupBy(d => d.MedicalRecordId).Where(g => g.Count() > 1);
                        foreach (var epGrp in byEpisode)
                        {
                            alerts.Add(CreateAlert("LAB-31", "Lab", 2, "Lab",
                                "Xét nghiệm trùng lặp (1 lần/đợt)",
                                $"XN {serviceName} đã được chỉ định {epGrp.Count()} lần trong cùng 1 đợt điều trị. " +
                                "Cấu hình: 1 lần/đợt. Kiểm tra có trùng không.",
                                patientId, null, null));
                        }
                    }
                    else
                    {
                        // N-ngày
                        var windowDays = rule.WindowDays ?? 1;
                        var windowStart = DateTime.UtcNow.AddDays(-windowDays);
                        var countInWindow = items.Count(d => d.CreatedAt >= windowStart);
                        if (countInWindow > 1)
                        {
                            alerts.Add(CreateAlert("LAB-31", "Lab", 2, "Lab",
                                "Xét nghiệm trùng lặp",
                                $"XN {serviceName} đã được chỉ định {countInWindow} lần trong {windowDays} ngày. " +
                                $"Cấu hình: không lặp trong {windowDays} ngày. Kiểm tra có trùng không.",
                                patientId, null, null));
                        }
                    }
                }
                else
                {
                    // Fallback: original 24h rule
                    var windowStart = DateTime.UtcNow.AddHours(-fallbackHours);
                    var countInWindow = items.Count(d => d.CreatedAt >= windowStart);
                    if (countInWindow > 1)
                    {
                        alerts.Add(CreateAlert("LAB-31", "Lab", 2, "Lab",
                            "Xét nghiệm trùng lặp",
                            $"XN {serviceName} đã được chỉ định {countInWindow} lần trong 24h. Kiểm tra có trùng hay không.",
                            patientId, null, null));
                    }
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule LAB-31 error"); }
        return alerts;
    }

    // Rule 32: Low stock alert
    private async Task<List<BusinessAlertDto>> CheckLowStockAsync()
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var lowStock = await _context.Set<LowStockAlert>()
                .Where(lsa => lsa.Status == 0) // New
                .Take(10)
                .ToListAsync();

            foreach (var item in lowStock)
            {
                alerts.Add(CreateAlert("PHAR-32", "Pharmacy", item.CurrentQuantity <= 0 ? 1 : 2, "Pharmacy",
                    "Ton kho thap",
                    $"Thuốc/VT (ID: {item.MedicineId}): tồn kho {item.CurrentQuantity} < ngưỡng tối thiểu {item.MinimumQuantity}. Cần đặt hàng bổ sung.",
                    null, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule PHAR-32 error"); }
        return alerts;
    }

    // Rule 33: Insurance ceiling exceeded
    private async Task<List<BusinessAlertDto>> CheckInsuranceCeilingAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();
            var sql = @"SELECT ISNULL(SUM(rd.InsuranceAmount), 0) as TotalInsurance
                FROM ReceiptDetails rd
                INNER JOIN Receipts r ON rd.ReceiptId = r.Id
                WHERE r.PatientId = @PatientId AND r.IsDeleted = 0
                AND r.CreatedAt >= DATEADD(YEAR, -1, GETDATE())";
            using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@PatientId", patientId);
            var totalInsurance = (decimal)(await cmd.ExecuteScalarAsync() ?? 0m);

            // Vietnamese BHXH ceiling: ~40 months * base salary = ~60,000,000 VND typical annual limit
            const decimal annualCeiling = 60_000_000m;
            if (totalInsurance >= annualCeiling * 0.8m)
            {
                alerts.Add(CreateAlert("BILL-33", "Billing", totalInsurance >= annualCeiling ? 1 : 2, "Billing",
                    "Vượt trần BHXH",
                    $"Tổng chi phí BHYT trong năm: {totalInsurance:N0} VND ({totalInsurance / annualCeiling * 100:F0}% trần). " +
                    (totalInsurance >= annualCeiling ? "ĐÃ VƯỢT TRẦN - phần vượt BN tự trả." : "SẮP ĐẾN TRẦN - cần thông báo BN."),
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule BILL-33 error"); }
        return alerts;
    }

    // Rule 34: Unpaid balance >3 days
    private async Task<List<BusinessAlertDto>> CheckUnpaidBalanceAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // Check service requests that are not paid (ServiceRequest -> MedicalRecord -> PatientId)
            var unpaidServices = await _context.ServiceRequests
                .Include(sr => sr.MedicalRecord)
                .Where(sr => sr.MedicalRecord != null && sr.MedicalRecord.PatientId == patientId
                    && !sr.IsPaid
                    && sr.Status != 4 // Not cancelled
                    && sr.CreatedAt < DateTime.UtcNow.AddDays(-3))
                .ToListAsync();

            if (unpaidServices.Any())
            {
                var totalUnpaid = unpaidServices.Sum(r => r.TotalAmount);
                var maxDaysOverdue = unpaidServices.Max(r => (DateTime.UtcNow - r.CreatedAt).Days);

                alerts.Add(CreateAlert("BILL-34", "Billing", maxDaysOverdue > 7 ? 1 : 2, "Billing",
                    "Chưa thanh toán",
                    $"BN còn nợ {totalUnpaid:N0} VND từ dịch vụ chưa thanh toán, quá hạn {maxDaysOverdue} ngày. Cần nhắc nhở thanh toán.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule BILL-34 error"); }
        return alerts;
    }

    // =====================================================================
    // INLINE SAFETY CHECKS (Rules 35-39)
    // =====================================================================

    // Rule 35: Blood type mismatch
    public async Task<AlertCheckResultDto> CheckBloodTypeMismatchAsync(Guid patientId, string requestedBloodType, string? requestedRhFactor)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
            if (patient == null) return BuildResult(alerts);

            if (!string.IsNullOrEmpty(patient.BloodType) && !string.IsNullOrEmpty(requestedBloodType))
            {
                if (!string.Equals(patient.BloodType, requestedBloodType, StringComparison.OrdinalIgnoreCase))
                {
                    alerts.Add(CreateAlert("BLOOD-35", "BloodBank", 1, "BloodBank",
                        "Khác nhóm máu bệnh nhân",
                        $"BN nhóm máu {patient.BloodType}{(patient.RhFactor != null ? $" {patient.RhFactor}" : "")} — yêu cầu nhóm {requestedBloodType}{(requestedRhFactor != null ? $" {requestedRhFactor}" : "")}. XÁC NHẬN trước khi thực hiện.",
                        patientId, null, null));
                }

                if (!string.IsNullOrEmpty(patient.RhFactor) && !string.IsNullOrEmpty(requestedRhFactor)
                    && !string.Equals(patient.RhFactor, requestedRhFactor, StringComparison.OrdinalIgnoreCase))
                {
                    alerts.Add(CreateAlert("BLOOD-35", "BloodBank", 1, "BloodBank",
                        "Khác Rh bệnh nhân",
                        $"BN Rh {patient.RhFactor} — yêu cầu Rh {requestedRhFactor}. NGUY HIỂM nếu truyền khác Rh.",
                        patientId, null, null));
                }
            }
            else if (string.IsNullOrEmpty(patient.BloodType))
            {
                alerts.Add(CreateAlert("BLOOD-35", "BloodBank", 2, "BloodBank",
                    "Chưa có nhóm máu bệnh nhân",
                    "BN chưa có thông tin nhóm máu trong hồ sơ. Cần xét nghiệm nhóm máu trước khi truyền.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule BLOOD-35 error"); }

        await PersistNewAlertsAsync(alerts, patientId);
        return BuildResult(alerts);
    }

    // Rule 36: BHYT CLS daily limit
    public async Task<AlertCheckResultDto> CheckBhytClsDailyLimitAsync(Guid patientId, int newOrderCount)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var today = DateTime.UtcNow.Date;
            var todayClsCount = await _context.ServiceRequests
                .Include(sr => sr.MedicalRecord)
                .Where(sr => sr.MedicalRecord != null && sr.MedicalRecord.PatientId == patientId
                    && sr.MedicalRecord.PatientType == 1 // BHYT
                    && sr.CreatedAt >= today
                    && sr.Status != 4) // Not cancelled
                .CountAsync();

            const int bhytDailyLimit = 15;
            var totalAfterOrder = todayClsCount + newOrderCount;
            if (totalAfterOrder > bhytDailyLimit)
            {
                alerts.Add(CreateAlert("BHYT-36", "BHYT", totalAfterOrder > bhytDailyLimit + 5 ? 1 : 2, "OPD",
                    "Vượt giới hạn CLS BHYT/ngày",
                    $"BN BHYT đã có {todayClsCount} CLS hôm nay, thêm {newOrderCount} = {totalAfterOrder} (giới hạn {bhytDailyLimit}/ngày). BHXH có thể từ chối thanh toán phần vượt.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule BHYT-36 error"); }

        await PersistNewAlertsAsync(alerts, patientId);
        return BuildResult(alerts);
    }

    // Rule 37: ICD-BHYT protocol compliance
    public async Task<AlertCheckResultDto> CheckIcdBhytProtocolAsync(Guid patientId, string icdCode, List<Guid> medicineIds)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (string.IsNullOrEmpty(icdCode) || !medicineIds.Any()) return BuildResult(alerts);

            var icdMap = await _context.Set<IcdInsuranceMap>()
                .Where(m => m.IcdCode == icdCode && m.IsCovered)
                .FirstOrDefaultAsync();

            if (icdMap == null)
            {
                alerts.Add(CreateAlert("BHYT-37", "BHYT", 2, "OPD",
                    "Mã ICD không trong danh mục BHYT",
                    $"Mã bệnh {icdCode} không nằm trong danh mục BHYT được chi trả. BN phải tự chi trả.",
                    patientId, null, null));
                return BuildResult(alerts);
            }

            var medicines = await _context.Medicines
                .Where(m => medicineIds.Contains(m.Id))
                .Select(m => new { m.Id, m.MedicineName, m.InsurancePaymentRate })
                .ToListAsync();

            foreach (var med in medicines)
            {
                if (med.InsurancePaymentRate <= 0)
                {
                    alerts.Add(CreateAlert("BHYT-37", "BHYT", 2, "OPD",
                        "Thuốc ngoài phác đồ BHYT",
                        $"Thuốc {med.MedicineName} không thuộc danh mục BHYT cho mã ICD {icdCode}. BN tự chi trả.",
                        patientId, null, null));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule BHYT-37 error"); }

        await PersistNewAlertsAsync(alerts, patientId);
        return BuildResult(alerts);
    }

    // Rule 38: Previous unfilled prescription
    public async Task<AlertCheckResultDto> CheckUnfilledPrescriptionsAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var unfilledRx = await _context.Prescriptions
                .Include(p => p.MedicalRecord)
                .Where(p => p.MedicalRecord != null && p.MedicalRecord.PatientId == patientId
                    && !p.IsDispensed
                    && p.Status <= 1 // Draft or Approved but not dispensed
                    && p.CreatedAt >= DateTime.UtcNow.AddDays(-30))
                .OrderByDescending(p => p.PrescriptionDate)
                .Take(5)
                .Select(p => new { p.PrescriptionCode, p.PrescriptionDate, p.TotalAmount })
                .ToListAsync();

            if (unfilledRx.Any())
            {
                var rxList = string.Join(", ", unfilledRx.Select(r => $"{r.PrescriptionCode} ({r.PrescriptionDate:dd/MM})"));
                alerts.Add(CreateAlert("REG-38", "Registration", unfilledRx.Count >= 3 ? 1 : 2, "Reception",
                    "Đơn thuốc chưa lĩnh",
                    $"BN có {unfilledRx.Count} đơn thuốc chưa lĩnh trong 30 ngày: {rxList}. Nhắc BN lĩnh thuốc cũ trước khi khám mới.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule REG-38 error"); }

        await PersistNewAlertsAsync(alerts, patientId);
        return BuildResult(alerts);
    }

    // Rule 39: Cost estimation at registration
    public async Task<CostEstimationResultDto> EstimateCostAsync(Guid patientId, List<Guid> serviceIds)
    {
        var result = new CostEstimationResultDto { PatientId = patientId };
        try
        {
            var mr = await _context.MedicalRecords
                .Where(m => m.PatientId == patientId)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            result.PatientType = mr?.PatientType ?? 2;
            result.PatientTypeName = result.PatientType switch
            {
                1 => "BHYT",
                2 => "Viện phí",
                3 => "Dịch vụ",
                4 => "Khám sức khỏe",
                _ => "Khác"
            };
            result.InsuranceCoverageRate = mr?.InsuranceCoverageRate ?? (result.PatientType == 1 ? 80 : 0);

            var services = await _context.Services
                .Where(s => serviceIds.Contains(s.Id))
                .Select(s => new { s.Id, s.ServiceName, s.ServiceGroupId, GroupName = s.ServiceGroup != null ? s.ServiceGroup.GroupName : "", s.UnitPrice, s.InsurancePrice })
                .ToListAsync();

            foreach (var svc in services)
            {
                var coverageRate = result.InsuranceCoverageRate ?? 0;
                var insPrice = result.PatientType == 1 && svc.InsurancePrice > 0
                    ? svc.InsurancePrice * coverageRate / 100m
                    : 0;
                var patientPrice = svc.UnitPrice - insPrice;

                result.Items.Add(new CostEstimationItemDto
                {
                    ServiceId = svc.Id,
                    ServiceName = svc.ServiceName,
                    ServiceGroupName = svc.GroupName,
                    UnitPrice = svc.UnitPrice,
                    InsurancePrice = insPrice,
                    PatientPrice = patientPrice,
                    CoverageRate = coverageRate,
                });
            }

            result.TotalAmount = result.Items.Sum(i => i.UnitPrice);
            result.InsuranceAmount = result.Items.Sum(i => i.InsurancePrice);
            result.PatientAmount = result.Items.Sum(i => i.PatientPrice);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule REG-39 (cost estimation) error"); }
        return result;
    }

    // #455: Pre-registration cost estimation (no patientId required)
    public async Task<CostEstimationResultDto> EstimateCostDirectAsync(CostEstimateDirectRequestDto req)
    {
        var coverageRate = req.PatientType == 1 ? req.InsuranceCoverageRate : 0;
        var result = new CostEstimationResultDto
        {
            PatientType = req.PatientType,
            PatientTypeName = req.PatientType switch { 1 => "BHYT", 2 => "Viện phí", 3 => "Dịch vụ", 4 => "Khám sức khỏe", _ => "Khác" },
            InsuranceCoverageRate = coverageRate,
        };
        try
        {
            var services = await _context.Services
                .Where(s => req.ServiceIds.Contains(s.Id))
                .Select(s => new { s.Id, s.ServiceName, GroupName = s.ServiceGroup != null ? s.ServiceGroup.GroupName : "", s.UnitPrice, s.InsurancePrice })
                .ToListAsync();

            foreach (var svc in services)
            {
                var insPrice = req.PatientType == 1 && svc.InsurancePrice > 0
                    ? svc.InsurancePrice * coverageRate / 100m
                    : 0;
                result.Items.Add(new CostEstimationItemDto
                {
                    ServiceId = svc.Id,
                    ServiceName = svc.ServiceName,
                    ServiceGroupName = svc.GroupName,
                    UnitPrice = svc.UnitPrice,
                    InsurancePrice = insPrice,
                    PatientPrice = svc.UnitPrice - insPrice,
                    CoverageRate = coverageRate,
                });
            }

            result.TotalAmount = result.Items.Sum(i => i.UnitPrice);
            result.InsuranceAmount = result.Items.Sum(i => i.InsurancePrice);
            result.PatientAmount = result.Items.Sum(i => i.PatientPrice);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "#455 EstimateCostDirect error"); }
        return result;
    }

    // =====================================================================
    // SPECIAL TEST RULE CRUD (F2.13)
    // =====================================================================

    public async Task<SpecialTestRulePagedResult> GetSpecialTestRulesAsync(SpecialTestRuleSearchDto search)
    {
        var query = _context.SpecialTestRules
            .Include(r => r.Test)
            .Where(r => !r.IsDeleted);

        if (search.IsActive.HasValue)
            query = query.Where(r => r.IsActive == search.IsActive.Value);
        if (!string.IsNullOrWhiteSpace(search.Keyword))
        {
            var kw = search.Keyword.Trim().ToLower();
            query = query.Where(r => r.Test.ServiceName.ToLower().Contains(kw)
                                  || (r.Note != null && r.Note.ToLower().Contains(kw)));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(r => r.Test.ServiceName)
            .Skip(search.PageIndex * search.PageSize)
            .Take(search.PageSize)
            .Select(r => MapSpecialTestRuleToDto(r))
            .ToListAsync();

        return new SpecialTestRulePagedResult { Items = items, TotalCount = total };
    }

    public async Task<SpecialTestRuleDto?> GetSpecialTestRuleByIdAsync(Guid id)
    {
        var entity = await _context.SpecialTestRules
            .Include(r => r.Test)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        return entity == null ? null : MapSpecialTestRuleToDto(entity);
    }

    public async Task<SpecialTestRuleDto> SaveSpecialTestRuleAsync(SpecialTestRuleSaveDto dto, string userId)
    {
        HIS.Core.Entities.SpecialTestRule entity;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.SpecialTestRules
                .Include(r => r.Test)
                .FirstOrDefaultAsync(r => r.Id == dto.Id.Value && !r.IsDeleted)
                ?? throw new InvalidOperationException($"SpecialTestRule {dto.Id} not found");
            entity.TestId = dto.TestId;
            entity.WindowType = dto.WindowType;
            entity.WindowDays = dto.WindowType == 1 ? dto.WindowDays : null;
            entity.Note = dto.Note;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new HIS.Core.Entities.SpecialTestRule
            {
                Id = Guid.NewGuid(),
                TestId = dto.TestId,
                WindowType = dto.WindowType,
                WindowDays = dto.WindowType == 1 ? dto.WindowDays : null,
                Note = dto.Note,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
            };
            _context.SpecialTestRules.Add(entity);
        }
        await _context.SaveChangesAsync();

        // Reload navigation for name
        await _context.Entry(entity).Reference(r => r.Test).LoadAsync();
        return MapSpecialTestRuleToDto(entity);
    }

    public async Task<bool> DeleteSpecialTestRuleAsync(Guid id, string userId)
    {
        var entity = await _context.SpecialTestRules
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (entity == null) return false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _context.SaveChangesAsync();
        return true;
    }

    private static SpecialTestRuleDto MapSpecialTestRuleToDto(HIS.Core.Entities.SpecialTestRule r) => new()
    {
        Id = r.Id,
        TestId = r.TestId,
        TestName = r.Test?.ServiceName ?? string.Empty,
        WindowType = r.WindowType,
        WindowDays = r.WindowDays,
        Note = r.Note,
        IsActive = r.IsActive,
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt,
    };

    // Rule 40: Clinic overload — visits/day for a doctor or room exceeds threshold
    private async Task<List<BusinessAlertDto>> CheckClinicOverloadInternalAsync(Guid? doctorId, Guid? roomId, DateTime? date)
    {
        var alerts = new List<BusinessAlertDto>();

        // Resolve threshold: override qua "Alerts:Opd:ClinicOverloadThreshold", default = const cũ (65). (#363)
        var threshold = AlertInt("Opd:ClinicOverloadThreshold", ClinicOverloadThreshold);

        // Resolve the VN-local date to a sargable UTC range
        var localDate = date?.Date ?? VnTime.TodayVn;
        var (fromUtc, toUtc) = VnTime.DayRangeUtc(localDate);

        // Check by doctor
        if (doctorId.HasValue)
        {
            var doctorCount = await _context.Examinations
                .Where(e => e.DoctorId == doctorId.Value
                         && e.CreatedAt >= fromUtc
                         && e.CreatedAt < toUtc)
                .CountAsync();

            if (doctorCount > threshold)
            {
                alerts.Add(CreateAlert(
                    "OPD-40", "OPD", 2, "OPD",
                    "Quá tải lượt khám BS",
                    $"Bác sĩ đã khám {doctorCount} lượt trong ngày {localDate:dd/MM/yyyy} (ngưỡng: {threshold}). Đề nghị điều phối thêm phòng hoặc giờ làm việc.",
                    null, null, null));
            }
        }

        // Check by room
        if (roomId.HasValue)
        {
            var roomCount = await _context.Examinations
                .Where(e => e.RoomId == roomId.Value
                         && e.CreatedAt >= fromUtc
                         && e.CreatedAt < toUtc)
                .CountAsync();

            if (roomCount > threshold)
            {
                alerts.Add(CreateAlert(
                    "OPD-40", "OPD", 2, "OPD",
                    "Quá tải lượt khám phòng",
                    $"Phòng khám đã tiếp nhận {roomCount} lượt trong ngày {localDate:dd/MM/yyyy} (ngưỡng: {threshold}). Đề nghị mở thêm phòng hoặc phân luồng.",
                    null, null, null));
            }
        }

        return alerts;
    }

}
