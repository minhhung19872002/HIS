using HIS.Application.DTOs.BusinessAlert;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public class BusinessAlertService : IBusinessAlertService
{
    private readonly HISDbContext _context;
    private readonly ILogger<BusinessAlertService> _logger;

    public BusinessAlertService(HISDbContext context, ILogger<BusinessAlertService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ========== OPD ALERTS (Rules 1-10) ==========

    public async Task<AlertCheckResultDto> CheckOpdAlertsAsync(Guid patientId, Guid? examinationId)
    {
        var alerts = new List<BusinessAlertDto>();

        try
        {
            // Rule 1: Drug allergy alert
            alerts.AddRange(await CheckDrugAllergyAsync(patientId, examinationId));

            // Rule 2: Drug interaction
            alerts.AddRange(await CheckDrugInteractionAsync(patientId, examinationId));

            // Rule 3: Contraindication
            alerts.AddRange(await CheckContraindicationAsync(patientId));

            // Rule 4: Duplicate prescription (same medicine within 7 days)
            alerts.AddRange(await CheckDuplicatePrescriptionAsync(patientId));

            // Rule 5: Overdose
            alerts.AddRange(await CheckOverdoseAsync(patientId, examinationId));

            // Rule 6: Underdose
            alerts.AddRange(await CheckUnderdoseAsync(patientId, examinationId));

            // Rule 7: Expired medicine in stock
            alerts.AddRange(await CheckExpiredMedicineAsync());

            // Rule 8: Overdue follow-up
            alerts.AddRange(await CheckOverdueFollowUpAsync(patientId));

            // Rule 9: Abnormal lab results
            alerts.AddRange(await CheckAbnormalLabResultsAsync(patientId));

            // Rule 10: Abnormal vital signs
            if (examinationId.HasValue)
                alerts.AddRange(await CheckAbnormalVitalSignsAsync(patientId, examinationId.Value));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error checking OPD alerts for patient {PatientId}", patientId);
        }

        // Persist new alerts
        await PersistNewAlertsAsync(alerts, patientId);

        return BuildResult(alerts);
    }

    // ========== INPATIENT ALERTS (Rules 11-24) ==========

    public async Task<AlertCheckResultDto> CheckInpatientAlertsAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();

        try
        {
            // Rule 11: Fall risk (age >65 or specific conditions)
            alerts.AddRange(await CheckFallRiskAsync(patientId));

            // Rule 12: Pressure ulcer risk (Braden scale proxy)
            alerts.AddRange(await CheckPressureUlcerRiskAsync(patientId, admissionId));

            // Rule 13: Malnutrition risk
            alerts.AddRange(await CheckMalnutritionRiskAsync(patientId));

            // Rule 14: HAI risk (device/duration)
            alerts.AddRange(await CheckHaiRiskAsync(patientId, admissionId));

            // Rule 15: Extended stay >21 days
            alerts.AddRange(await CheckExtendedStayAsync(patientId, admissionId));

            // Rule 16: Pending orders overdue >4 hours
            alerts.AddRange(await CheckPendingOrdersAsync(patientId, admissionId));

            // Rule 17: Undispensed medication >2 hours
            alerts.AddRange(await CheckUndispensedMedicationAsync(patientId, admissionId));

            // Rule 18: Critical without consultation (ICU >48h)
            alerts.AddRange(await CheckCriticalWithoutConsultationAsync(patientId, admissionId));

            // Rule 19: IV infusion ending <30 min
            alerts.AddRange(await CheckIvInfusionEndingAsync(patientId, admissionId));

            // Rule 20: Positive blood culture
            alerts.AddRange(await CheckPositiveBloodCultureAsync(patientId));

            // Rule 21: NEWS2 score >= 5
            alerts.AddRange(await CheckNews2ScoreAsync(patientId, admissionId));

            // Rule 22: Discharge ready
            alerts.AddRange(await CheckDischargeReadyAsync(patientId, admissionId));

            // Rule 23: Bed capacity >85%
            alerts.AddRange(await CheckBedCapacityAsync());

            // Rule 24: Insurance expiry during admission
            alerts.AddRange(await CheckInsuranceExpiryAsync(patientId));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error checking inpatient alerts for patient {PatientId}", patientId);
        }

        await PersistNewAlertsAsync(alerts, patientId);
        return BuildResult(alerts);
    }

    // ========== RADIOLOGY ALERTS (Rules 25-28) ==========

    public async Task<AlertCheckResultDto> CheckRadiologyAlertsAsync(Guid patientId, Guid? requestId)
    {
        var alerts = new List<BusinessAlertDto>();

        try
        {
            // Rule 25: Pregnant patient radiation
            alerts.AddRange(await CheckPregnantRadiationAsync(patientId));

            // Rule 26: Contrast allergy
            alerts.AddRange(await CheckContrastAllergyAsync(patientId));

            // Rule 27: Cumulative radiation dose
            alerts.AddRange(await CheckCumulativeRadiationAsync(patientId));

            // Rule 28: Critical radiology finding
            alerts.AddRange(await CheckCriticalRadiologyFindingAsync(patientId));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error checking radiology alerts for patient {PatientId}", patientId);
        }

        await PersistNewAlertsAsync(alerts, patientId);
        return BuildResult(alerts);
    }

    // ========== LAB ALERTS (Rules 29-31) ==========

    public async Task<AlertCheckResultDto> CheckLabAlertsAsync(Guid patientId, Guid? requestId)
    {
        var alerts = new List<BusinessAlertDto>();

        try
        {
            // Rule 29: Critical lab values (panic values)
            alerts.AddRange(await CheckCriticalLabValuesAsync(patientId));

            // Rule 30: Rejected specimen
            alerts.AddRange(await CheckRejectedSpecimenAsync(patientId, requestId));

            // Rule 31: Duplicate test order (same test within 24h)
            alerts.AddRange(await CheckDuplicateTestOrderAsync(patientId));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error checking lab alerts for patient {PatientId}", patientId);
        }

        await PersistNewAlertsAsync(alerts, patientId);
        return BuildResult(alerts);
    }

    // ========== PHARMACY ALERTS (Rule 32) ==========

    public async Task<AlertCheckResultDto> CheckPharmacyAlertsAsync()
    {
        var alerts = new List<BusinessAlertDto>();

        try
        {
            // Rule 32: Low stock alert
            alerts.AddRange(await CheckLowStockAsync());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error checking pharmacy alerts");
        }

        await PersistNewAlertsAsync(alerts, null);
        return BuildResult(alerts);
    }

    // ========== BILLING ALERTS (Rules 33-34) ==========

    public async Task<AlertCheckResultDto> CheckBillingAlertsAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();

        try
        {
            // Rule 33: Insurance ceiling exceeded
            alerts.AddRange(await CheckInsuranceCeilingAsync(patientId));

            // Rule 34: Unpaid balance >3 days
            alerts.AddRange(await CheckUnpaidBalanceAsync(patientId));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error checking billing alerts for patient {PatientId}", patientId);
        }

        await PersistNewAlertsAsync(alerts, patientId);
        return BuildResult(alerts);
    }

    // ========== QUERY ==========

    public async Task<BusinessAlertPagedResult> GetActiveAlertsAsync(BusinessAlertSearchDto search)
    {
        try
        {
            var query = _context.BusinessAlerts
                .Where(a => !a.IsDeleted);

            if (search.PatientId.HasValue)
                query = query.Where(a => a.PatientId == search.PatientId.Value);
            if (!string.IsNullOrEmpty(search.Module))
                query = query.Where(a => a.Module == search.Module);
            if (!string.IsNullOrEmpty(search.Category))
                query = query.Where(a => a.Category == search.Category);
            if (search.Severity.HasValue)
                query = query.Where(a => a.Severity == search.Severity.Value);
            if (search.Status.HasValue)
                query = query.Where(a => a.Status == search.Status.Value);

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.Severity)
                .ThenByDescending(a => a.CreatedAt)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .Select(a => MapToDto(a))
                .ToListAsync();

            // Load patient names
            var patientIds = items.Where(a => a.PatientId.HasValue).Select(a => a.PatientId!.Value).Distinct().ToList();
            if (patientIds.Any())
            {
                var patients = await _context.Patients
                    .Where(p => patientIds.Contains(p.Id))
                    .Select(p => new { p.Id, p.FullName })
                    .ToListAsync();
                foreach (var alert in items)
                {
                    if (alert.PatientId.HasValue)
                        alert.PatientName = patients.FirstOrDefault(p => p.Id == alert.PatientId.Value)?.FullName;
                }
            }

            return new BusinessAlertPagedResult
            {
                Items = items,
                TotalCount = totalCount,
                PageIndex = search.PageIndex,
                PageSize = search.PageSize,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error querying active alerts");
            return new BusinessAlertPagedResult();
        }
    }

    // ========== ACTIONS ==========

    public async Task<BusinessAlertDto?> AcknowledgeAlertAsync(Guid alertId, string userId, BusinessAlertAcknowledgeDto dto)
    {
        try
        {
            var alert = await _context.BusinessAlerts.FindAsync(alertId);
            if (alert == null) return null;

            alert.Status = 1; // Acknowledged
            alert.AcknowledgedAt = DateTime.UtcNow;
            alert.AcknowledgedBy = userId;
            alert.ActionTaken = dto.ActionTaken;
            alert.UpdatedAt = DateTime.UtcNow;
            alert.UpdatedBy = userId;

            await _context.SaveChangesAsync();
            return MapToDto(alert);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error acknowledging alert {AlertId}", alertId);
            return null;
        }
    }

    public async Task<bool> ResolveAlertAsync(Guid alertId, string userId)
    {
        try
        {
            var alert = await _context.BusinessAlerts.FindAsync(alertId);
            if (alert == null) return false;

            alert.Status = 2; // Resolved
            alert.UpdatedAt = DateTime.UtcNow;
            alert.UpdatedBy = userId;

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error resolving alert {AlertId}", alertId);
            return false;
        }
    }

    // ========== RULES CATALOG ==========

    public Task<List<BusinessAlertRuleDto>> GetAlertRulesAsync()
    {
        return Task.FromResult(AlertRules);
    }

    // =====================================================================
    // INDIVIDUAL RULE IMPLEMENTATIONS
    // =====================================================================

    // Rule 1: Drug allergy alert
    private async Task<List<BusinessAlertDto>> CheckDrugAllergyAsync(Guid patientId, Guid? examinationId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var allergies = await _context.Allergies
                .Where(a => a.PatientId == patientId && a.AllergyType == 1) // Drug allergy
                .ToListAsync();

            if (!allergies.Any()) return alerts;

            // Check current prescriptions in last 24h (Prescription -> MedicalRecord -> Patient)
            var recentPrescriptions = await _context.PrescriptionDetails
                .Include(pd => pd.Prescription).ThenInclude(p => p!.MedicalRecord)
                .Include(pd => pd.Medicine)
                .Where(pd => pd.Prescription != null && pd.Prescription.MedicalRecord != null
                    && pd.Prescription.MedicalRecord.PatientId == patientId
                    && pd.Prescription.CreatedAt >= DateTime.UtcNow.AddDays(-1))
                .ToListAsync();

            foreach (var allergy in allergies)
            {
                var allergen = (allergy.AllergenName ?? "").ToLower();
                foreach (var rx in recentPrescriptions)
                {
                    var medicineName = (rx.Medicine?.MedicineName ?? "").ToLower();
                    if (!string.IsNullOrEmpty(allergen) && medicineName.Contains(allergen))
                    {
                        alerts.Add(CreateAlert("OPD-01", "OPD", 1, "OPD",
                            "Di ung thuoc",
                            $"BN co tien su di ung voi {allergy.AllergenName}. Don thuoc hien tai chua {rx.Medicine?.MedicineName}. Phan ung: {allergy.Reaction ?? "N/A"}",
                            patientId, examinationId, null));
                    }
                }

                // Even without current prescription, warn about known allergies
                if (allergy.Severity >= 3 && !recentPrescriptions.Any())
                {
                    alerts.Add(CreateAlert("OPD-01", "OPD", 1, "OPD",
                        "Di ung thuoc nghiem trong",
                        $"BN co tien su di ung nghiem trong voi {allergy.AllergenName}. Can kiem tra ky truoc khi ke don.",
                        patientId, examinationId, null));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-01 error"); }
        return alerts;
    }

    // Rule 2: Drug interaction
    private async Task<List<BusinessAlertDto>> CheckDrugInteractionAsync(Guid patientId, Guid? examinationId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var recentRx = await _context.PrescriptionDetails
                .Include(pd => pd.Prescription).ThenInclude(p => p!.MedicalRecord)
                .Where(pd => pd.Prescription != null && pd.Prescription.MedicalRecord != null
                    && pd.Prescription.MedicalRecord.PatientId == patientId
                    && pd.Prescription.CreatedAt >= DateTime.UtcNow.AddDays(-7))
                .Select(pd => pd.MedicineId)
                .Distinct()
                .ToListAsync();

            if (recentRx.Count < 2) return alerts;

            var interactions = await _context.DrugInteractions
                .Include(di => di.Medicine1)
                .Include(di => di.Medicine2)
                .Where(di => recentRx.Contains(di.Medicine1Id) && recentRx.Contains(di.Medicine2Id)
                    && di.Severity >= 2)
                .ToListAsync();

            foreach (var interaction in interactions)
            {
                alerts.Add(CreateAlert("OPD-02", "OPD", interaction.Severity >= 3 ? 1 : 2, "OPD",
                    "Tuong tac thuoc",
                    $"Tuong tac giua {interaction.Medicine1?.MedicineName ?? "N/A"} va {interaction.Medicine2?.MedicineName ?? "N/A"}: {interaction.Description ?? "Co tuong tac"}",
                    patientId, examinationId, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-02 error"); }
        return alerts;
    }

    // Rule 3: Contraindication
    private async Task<List<BusinessAlertDto>> CheckContraindicationAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var contraindications = await _context.Contraindications
                .Where(c => c.PatientId == patientId
                    && (c.EndDate == null || c.EndDate >= DateTime.UtcNow))
                .ToListAsync();

            foreach (var ci in contraindications)
            {
                alerts.Add(CreateAlert("OPD-03", "OPD", 2, "OPD",
                    "Chong chi dinh",
                    $"BN co chong chi dinh voi {ci.ItemName}: {ci.Reason ?? "Khong ro ly do"}",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-03 error"); }
        return alerts;
    }

    // Rule 4: Duplicate prescription (same medicine within 7 days)
    private async Task<List<BusinessAlertDto>> CheckDuplicatePrescriptionAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // Get recent prescription details with medicine names
            var recentItems = await _context.PrescriptionDetails
                .Include(pd => pd.Prescription).ThenInclude(p => p!.MedicalRecord)
                .Include(pd => pd.Medicine)
                .Where(pd => pd.Prescription != null && pd.Prescription.MedicalRecord != null
                    && pd.Prescription.MedicalRecord.PatientId == patientId
                    && pd.Prescription.CreatedAt >= DateTime.UtcNow.AddDays(-7))
                .ToListAsync();

            var duplicates = recentItems
                .GroupBy(pd => pd.MedicineId)
                .Where(g => g.Count() > 1)
                .Select(g => new { MedicineId = g.Key, Count = g.Count(), Name = g.First().Medicine?.MedicineName ?? "N/A" })
                .ToList();

            foreach (var dup in duplicates)
            {
                alerts.Add(CreateAlert("OPD-04", "OPD", 2, "OPD",
                    "Trung don thuoc",
                    $"Thuoc {dup.Name} da duoc ke {dup.Count} lan trong 7 ngay qua. Kiem tra trung don.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-04 error"); }
        return alerts;
    }

    // Rule 5: Overdose - check total daily quantity vs typical maximum
    private async Task<List<BusinessAlertDto>> CheckOverdoseAsync(Guid patientId, Guid? examinationId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var recentRx = await _context.PrescriptionDetails
                .Include(pd => pd.Prescription).ThenInclude(p => p!.MedicalRecord)
                .Include(pd => pd.Medicine)
                .Where(pd => pd.Prescription != null && pd.Prescription.MedicalRecord != null
                    && pd.Prescription.MedicalRecord.PatientId == patientId
                    && pd.Prescription.CreatedAt >= DateTime.UtcNow.AddDays(-1))
                .ToListAsync();

            foreach (var rx in recentRx)
            {
                // Calculate daily dose from individual doses (morning+noon+evening+night)
                var dailyDose = (rx.MorningDose ?? 0) + (rx.NoonDose ?? 0) + (rx.EveningDose ?? 0) + (rx.NightDose ?? 0);
                if (dailyDose <= 0 || rx.Days <= 0) continue;

                // Check if total quantity seems excessive (quantity / days much higher than daily dose)
                var expectedTotal = dailyDose * rx.Days;
                if (rx.Quantity > expectedTotal * 1.5m && rx.Quantity > 10)
                {
                    alerts.Add(CreateAlert("OPD-05", "OPD", 1, "OPD",
                        "Lieu qua cao",
                        $"Thuoc {rx.Medicine?.MedicineName ?? "N/A"}: so luong ke {rx.Quantity} {rx.Unit ?? ""} cho {rx.Days} ngay (lieu tinh: {dailyDose}/ngay x {rx.Days} ngay = {expectedTotal}). Kiem tra lai.",
                        patientId, examinationId, null));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-05 error"); }
        return alerts;
    }

    // Rule 6: Underdose - daily dose seems too low
    private async Task<List<BusinessAlertDto>> CheckUnderdoseAsync(Guid patientId, Guid? examinationId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var recentRx = await _context.PrescriptionDetails
                .Include(pd => pd.Prescription).ThenInclude(p => p!.MedicalRecord)
                .Include(pd => pd.Medicine)
                .Where(pd => pd.Prescription != null && pd.Prescription.MedicalRecord != null
                    && pd.Prescription.MedicalRecord.PatientId == patientId
                    && pd.Prescription.CreatedAt >= DateTime.UtcNow.AddDays(-1))
                .ToListAsync();

            foreach (var rx in recentRx)
            {
                var dailyDose = (rx.MorningDose ?? 0) + (rx.NoonDose ?? 0) + (rx.EveningDose ?? 0) + (rx.NightDose ?? 0);
                if (dailyDose <= 0 || rx.Days <= 0) continue;

                // Check if quantity seems too low
                var expectedTotal = dailyDose * rx.Days;
                if (rx.Quantity < expectedTotal * 0.5m && rx.Quantity > 0)
                {
                    alerts.Add(CreateAlert("OPD-06", "OPD", 3, "OPD",
                        "Lieu qua thap",
                        $"Thuoc {rx.Medicine?.MedicineName ?? "N/A"}: so luong ke {rx.Quantity} {rx.Unit ?? ""} cho {rx.Days} ngay (lieu tinh: {dailyDose}/ngay x {rx.Days} ngay = {expectedTotal}). Co the khong du lieu.",
                        patientId, examinationId, null));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-06 error"); }
        return alerts;
    }

    // Rule 7: Expired medicine in stock
    private async Task<List<BusinessAlertDto>> CheckExpiredMedicineAsync()
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var expired = await _context.InventoryItems
                .Where(i => i.ExpiryDate <= DateTime.UtcNow && i.Quantity > 0)
                .Take(10)
                .ToListAsync();

            foreach (var item in expired)
            {
                alerts.Add(CreateAlert("OPD-07", "OPD", 1, "Pharmacy",
                    "Thuoc het han trong kho",
                    $"Lo {item.BatchNumber} (SL: {item.Quantity}) da het han ngay {item.ExpiryDate:dd/MM/yyyy}. Khong duoc cap phat.",
                    null, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-07 error"); }
        return alerts;
    }

    // Rule 8: Overdue follow-up (missed appointment >7 days)
    private async Task<List<BusinessAlertDto>> CheckOverdueFollowUpAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var overdue = await _context.Appointments
                .Where(a => a.PatientId == patientId
                    && a.AppointmentDate < DateTime.UtcNow.AddDays(-7)
                    && a.Status == 0) // Pending/not attended
                .OrderByDescending(a => a.AppointmentDate)
                .Take(3)
                .ToListAsync();

            foreach (var apt in overdue)
            {
                var daysOverdue = (DateTime.UtcNow - apt.AppointmentDate).Days;
                alerts.Add(CreateAlert("OPD-08", "OPD", daysOverdue > 30 ? 2 : 3, "OPD",
                    "Qua hen tai kham",
                    $"BN qua hen tai kham {daysOverdue} ngay (hen ngay {apt.AppointmentDate:dd/MM/yyyy}). Can lien he benh nhan.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-08 error"); }
        return alerts;
    }

    // Rule 9: Abnormal lab results
    private async Task<List<BusinessAlertDto>> CheckAbnormalLabResultsAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // #14e: model 1 — chỉ số con bất thường (Flag != N) 3 ngày gần nhất (model 2 LabResults đã gỡ)
            var abnormalRows = await _context.ServiceRequestDetailParameters
                .Where(p => !p.IsDeleted
                    && p.ServiceRequestDetail!.ServiceRequest.MedicalRecord.PatientId == patientId
                    && p.Flag != null && p.Flag != "N"
                    && p.CreatedAt >= DateTime.UtcNow.AddDays(-3))
                .OrderByDescending(p => p.Flag == "HH" || p.Flag == "LL")
                .ThenByDescending(p => p.CreatedAt)
                .Take(5)
                .Select(p => new { p.ParameterName, p.Value, p.ReferenceRange, p.Flag })
                .ToListAsync();
            foreach (var r in abnormalRows)
            {
                var isCritical = r.Flag == "HH" || r.Flag == "LL";
                alerts.Add(CreateAlert("OPD-09", "OPD", isCritical ? 1 : 2, "Lab",
                    "Ket qua xet nghiem bat thuong",
                    $"XN {r.ParameterName}: ket qua {r.Value ?? "N/A"} (GTBT: {r.ReferenceRange ?? "N/A"})" +
                    (isCritical ? " - GIA TRI NGUY KICH" : ""),
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-09 error"); }
        return alerts;
    }

    // Rule 10: Abnormal vital signs
    private async Task<List<BusinessAlertDto>> CheckAbnormalVitalSignsAsync(Guid patientId, Guid examinationId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var exam = await _context.Examinations.FirstOrDefaultAsync(e => e.Id == examinationId);
            if (exam == null) return alerts;

            if (exam.Temperature.HasValue && exam.Temperature > 39)
                alerts.Add(CreateAlert("OPD-10", "OPD", exam.Temperature > 40 ? 1 : 2, "OPD",
                    "Sinh hieu bat thuong - Sot cao",
                    $"Nhiet do: {exam.Temperature}*C" + (exam.Temperature > 40 ? " - SOT RAT CAO" : ""),
                    patientId, examinationId, null));

            if (exam.BloodPressureSystolic.HasValue && exam.BloodPressureSystolic > 180)
                alerts.Add(CreateAlert("OPD-10", "OPD", 1, "OPD",
                    "Sinh hieu bat thuong - Tang huyet ap cap cuu",
                    $"HA: {exam.BloodPressureSystolic}/{exam.BloodPressureDiastolic} mmHg",
                    patientId, examinationId, null));

            if (exam.BloodPressureSystolic.HasValue && exam.BloodPressureSystolic < 90)
                alerts.Add(CreateAlert("OPD-10", "OPD", 1, "OPD",
                    "Sinh hieu bat thuong - Ha huyet ap",
                    $"HA: {exam.BloodPressureSystolic}/{exam.BloodPressureDiastolic} mmHg - CAN XU TRI CAP CUU",
                    patientId, examinationId, null));

            if (exam.SpO2.HasValue && exam.SpO2 < 92)
                alerts.Add(CreateAlert("OPD-10", "OPD", exam.SpO2 < 88 ? 1 : 2, "OPD",
                    "Sinh hieu bat thuong - SpO2 thap",
                    $"SpO2: {exam.SpO2}%" + (exam.SpO2 < 88 ? " - CAN THO OXY NGAY" : ""),
                    patientId, examinationId, null));

            if (exam.Pulse.HasValue && (exam.Pulse > 130 || exam.Pulse < 40))
                alerts.Add(CreateAlert("OPD-10", "OPD", 1, "OPD",
                    "Sinh hieu bat thuong - Nhip tim",
                    $"Mach: {exam.Pulse} lan/phut" + (exam.Pulse > 130 ? " - NHIP TIM RAT NHANH" : " - NHIP TIM RAT CHAM"),
                    patientId, examinationId, null));
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule OPD-10 error"); }
        return alerts;
    }

    // Rule 11: Fall risk (age >65)
    private async Task<List<BusinessAlertDto>> CheckFallRiskAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
            if (patient == null || !patient.DateOfBirth.HasValue) return alerts;

            var age = (DateTime.UtcNow - patient.DateOfBirth.Value).Days / 365;
            if (age >= 65)
            {
                alerts.Add(CreateAlert("IPD-11", "Inpatient", age >= 80 ? 1 : 2, "Inpatient",
                    "Nguy co nga",
                    $"BN {age} tuoi - nguy co nga cao. Can danh gia va ap dung bien phap phong nga.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-11 error"); }
        return alerts;
    }

    // Rule 12: Pressure ulcer risk (Braden scale proxy - immobile >3 days)
    private async Task<List<BusinessAlertDto>> CheckPressureUlcerRiskAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.Id == admissionId.Value);
            if (admission == null) return alerts;

            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
            var age = patient?.DateOfBirth.HasValue == true ? (DateTime.UtcNow - patient.DateOfBirth.Value).Days / 365 : 0;
            var daysAdmitted = (DateTime.UtcNow - admission.AdmissionDate).Days;

            // High risk if elderly + long stay
            if (age >= 70 && daysAdmitted >= 3)
            {
                alerts.Add(CreateAlert("IPD-12", "Inpatient", 2, "Inpatient",
                    "Nguy co loet ti de",
                    $"BN {age} tuoi, nam vien {daysAdmitted} ngay. Danh gia Braden Scale va thay doi tu the thuong xuyen.",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-12 error"); }
        return alerts;
    }

    // Rule 13: Malnutrition risk
    private async Task<List<BusinessAlertDto>> CheckMalnutritionRiskAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var screening = await _context.NutritionScreenings
                .Where(ns => ns.PatientId == patientId)
                .OrderByDescending(ns => ns.CreatedAt)
                .FirstOrDefaultAsync();

            if (screening != null && (screening.RiskLevel == "Medium" || screening.RiskLevel == "High"))
            {
                var isHigh = screening.RiskLevel == "High";
                alerts.Add(CreateAlert("IPD-13", "Inpatient", isHigh ? 1 : 2, "Inpatient",
                    "Nguy co suy dinh duong",
                    $"Ket qua sang loc dinh duong: nguy co {(isHigh ? "CAO" : "TRUNG BINH")}. Can hoi chan dinh duong.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-13 error"); }
        return alerts;
    }

    // Rule 14: HAI risk (hospital-acquired infection)
    private async Task<List<BusinessAlertDto>> CheckHaiRiskAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.Id == admissionId.Value);
            if (admission == null) return alerts;

            var daysAdmitted = (DateTime.UtcNow - admission.AdmissionDate).Days;
            if (daysAdmitted >= 7)
            {
                alerts.Add(CreateAlert("IPD-14", "Inpatient", daysAdmitted >= 14 ? 2 : 3, "Inpatient",
                    "Nguy co nhiem khuan benh vien",
                    $"BN nam vien {daysAdmitted} ngay - nguy co NKBV tang. Kiem tra cac thiet bi xam lan (catheter, ong NKQ, CVP).",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-14 error"); }
        return alerts;
    }

    // Rule 15: Extended stay >21 days
    private async Task<List<BusinessAlertDto>> CheckExtendedStayAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.Id == admissionId.Value);
            if (admission == null) return alerts;

            var daysAdmitted = (DateTime.UtcNow - admission.AdmissionDate).Days;
            if (daysAdmitted > 21)
            {
                alerts.Add(CreateAlert("IPD-15", "Inpatient", 2, "Inpatient",
                    "Thoi gian nam vien dai",
                    $"BN da nam vien {daysAdmitted} ngay (>21 ngay). Can danh gia lai ke hoach dieu tri va xem xet xuat vien.",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-15 error"); }
        return alerts;
    }

    // Rule 16: Pending orders overdue >4 hours
    private async Task<List<BusinessAlertDto>> CheckPendingOrdersAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var pendingOrders = await _context.ServiceRequests
                .Include(sr => sr.MedicalRecord)
                .Where(sr => sr.MedicalRecord != null && sr.MedicalRecord.PatientId == patientId
                    && sr.Status == 0 // Pending
                    && sr.CreatedAt < DateTime.UtcNow.AddHours(-4))
                .Take(5)
                .ToListAsync();

            foreach (var order in pendingOrders)
            {
                var hoursOverdue = (DateTime.UtcNow - order.CreatedAt).TotalHours;
                alerts.Add(CreateAlert("IPD-16", "Inpatient", hoursOverdue > 8 ? 1 : 2, "Inpatient",
                    "Y lenh chua thuc hien",
                    $"Y lenh tao luc {order.CreatedAt:HH:mm dd/MM} chua duoc thuc hien ({hoursOverdue:F0} gio). Can xu ly ngay.",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-16 error"); }
        return alerts;
    }

    // Rule 17: Undispensed medication >2 hours
    private async Task<List<BusinessAlertDto>> CheckUndispensedMedicationAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var pendingRx = await _context.Prescriptions
                .Include(p => p.MedicalRecord)
                .Where(p => p.MedicalRecord != null && p.MedicalRecord.PatientId == patientId
                    && !p.IsDispensed
                    && p.Status < 2 // Not completed/cancelled
                    && p.CreatedAt < DateTime.UtcNow.AddHours(-2))
                .Take(5)
                .ToListAsync();

            foreach (var rx in pendingRx)
            {
                var hoursOverdue = (DateTime.UtcNow - rx.CreatedAt).TotalHours;
                alerts.Add(CreateAlert("IPD-17", "Inpatient", hoursOverdue > 4 ? 1 : 2, "Pharmacy",
                    "Thuoc chua phat",
                    $"Don thuoc tao luc {rx.CreatedAt:HH:mm dd/MM} chua duoc cap phat ({hoursOverdue:F0} gio).",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-17 error"); }
        return alerts;
    }

    // Rule 18: Critical patient without consultation (ICU >48h no consultation)
    private async Task<List<BusinessAlertDto>> CheckCriticalWithoutConsultationAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.Id == admissionId.Value);
            if (admission == null) return alerts;

            var daysAdmitted = (DateTime.UtcNow - admission.AdmissionDate).Days;
            if (daysAdmitted < 2) return alerts;

            // Check if patient has had a consultation (ConsultationRecord -> Examination -> MedicalRecordId)
            var hasConsultation = await _context.ConsultationRecords
                .Include(cr => cr.Examination)
                .AnyAsync(cr => cr.Examination != null && cr.Examination.MedicalRecordId == admission.MedicalRecordId
                    && cr.CreatedAt >= DateTime.UtcNow.AddDays(-2));

            if (!hasConsultation && daysAdmitted >= 2)
            {
                alerts.Add(CreateAlert("IPD-18", "Inpatient", 2, "Inpatient",
                    "BN nang chua hoi chan",
                    $"BN nam vien {daysAdmitted} ngay chua co hoi chan trong 48h qua. Can xem xet hoi chan.",
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-18 error"); }
        return alerts;
    }

    // Rule 19: IV infusion ending <30 min
    private async Task<List<BusinessAlertDto>> CheckIvInfusionEndingAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // Check treatment sheets for active infusions (TreatmentSheet -> Examination -> MedicalRecord -> PatientId)
            var activeInfusions = await _context.TreatmentSheets
                .Include(ts => ts.Examination).ThenInclude(e => e.MedicalRecord)
                .Where(ts => ts.Examination != null && ts.Examination.MedicalRecord != null
                    && ts.Examination.MedicalRecord.PatientId == patientId
                    && ts.CreatedAt >= DateTime.UtcNow.AddDays(-1))
                .OrderByDescending(ts => ts.CreatedAt)
                .Take(5)
                .ToListAsync();

            // Check DoctorOrders for IV-related keywords
            foreach (var sheet in activeInfusions)
            {
                var content = (sheet.DoctorOrders ?? "").ToLower();
                if (content.Contains("truyen") || content.Contains("dich truyen") || content.Contains("iv"))
                {
                    var sheetAge = (DateTime.UtcNow - sheet.CreatedAt).TotalHours;
                    if (sheetAge >= 3.5 && sheetAge <= 6)
                    {
                        alerts.Add(CreateAlert("IPD-19", "Inpatient", 3, "Inpatient",
                            "Truyen dich sap het",
                            $"Y lenh truyen dich luc {sheet.CreatedAt:HH:mm} co the sap ket thuc. Kiem tra va thay chai dich.",
                            patientId, null, admissionId));
                    }
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-19 error"); }
        return alerts;
    }

    // Rule 20: Positive blood culture
    private async Task<List<BusinessAlertDto>> CheckPositiveBloodCultureAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // #14e: model 1 — SRD dịch vụ cấy máu có KQ dương tính 7 ngày gần nhất (model 2 LabResults đã gỡ)
            var positiveCultures = await _context.ServiceRequestDetails
                .Where(d => !d.IsDeleted && d.Status != 3
                    && d.ServiceRequest.MedicalRecord.PatientId == patientId
                    && d.Result != null
                    && (d.Service.ServiceName.Contains("cấy máu") || d.Service.ServiceName.Contains("cay mau")
                        || d.Service.ServiceName.Contains("blood culture") || d.Service.ServiceName.Contains("hemoculture"))
                    && (d.Result.Contains("dương") || d.Result.Contains("duong tinh") || d.Result.ToLower().Contains("positive"))
                    && d.CreatedAt >= DateTime.UtcNow.AddDays(-7))
                .OrderByDescending(d => d.CreatedAt)
                .Take(3)
                .Select(d => new { d.Service.ServiceName, d.Result })
                .ToListAsync();
            foreach (var c in positiveCultures)
            {
                alerts.Add(CreateAlert("IPD-20", "Inpatient", 1, "Lab",
                    "Cay mau duong tinh",
                    $"Ket qua cay mau DUONG TINH ({c.ServiceName}). {c.Result}. XU TRI NGAY.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-20 error"); }
        return alerts;
    }

    // Rule 21: NEWS2 score >= 5
    private async Task<List<BusinessAlertDto>> CheckNews2ScoreAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // Check the most recent examination for this patient (Examination -> MedicalRecord -> PatientId)
            var exam = await _context.Examinations
                .Include(e => e.MedicalRecord)
                .Where(e => e.MedicalRecord != null && e.MedicalRecord.PatientId == patientId)
                .OrderByDescending(e => e.CreatedAt)
                .FirstOrDefaultAsync();

            if (exam == null) return alerts;

            // Calculate NEWS2
            int total = 0;
            if (exam.Pulse.HasValue)
            {
                int hr = exam.Pulse.Value;
                total += hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3;
            }
            if (exam.BloodPressureSystolic.HasValue)
            {
                int sbp = exam.BloodPressureSystolic.Value;
                total += sbp <= 90 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : sbp <= 219 ? 0 : 3;
            }
            if (exam.Temperature.HasValue)
            {
                decimal temp = exam.Temperature.Value;
                total += temp <= 35.0m ? 3 : temp <= 36.0m ? 1 : temp <= 38.0m ? 0 : temp <= 39.0m ? 1 : 2;
            }
            if (exam.SpO2.HasValue)
            {
                decimal spo2 = exam.SpO2.Value;
                total += spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0;
            }

            if (total >= 5)
            {
                var riskLevel = total >= 7 ? "NGUY KICH" : "CAO";
                alerts.Add(CreateAlert("IPD-21", "Inpatient", total >= 7 ? 1 : 2, "Inpatient",
                    "Diem canh bao som NEWS2",
                    $"NEWS2 = {total} ({riskLevel}). " + (total >= 7 ? "GOI DOI CAP CUU NGAY. Theo doi lien tuc." : "BAO BAC SI NGAY. Theo doi moi 30 phut."),
                    patientId, null, admissionId));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-21 error"); }
        return alerts;
    }

    // Rule 22: Discharge ready
    private async Task<List<BusinessAlertDto>> CheckDischargeReadyAsync(Guid patientId, Guid? admissionId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            if (!admissionId.HasValue) return alerts;

            // Check if discharge has been created but patient still in hospital
            var discharge = await _context.Discharges
                .Where(d => d.AdmissionId == admissionId.Value)
                .FirstOrDefaultAsync();

            if (discharge != null)
            {
                var daysPending = (DateTime.UtcNow - discharge.CreatedAt).Days;
                if (daysPending >= 1)
                {
                    alerts.Add(CreateAlert("IPD-22", "Inpatient", 3, "Inpatient",
                        "BN can xuat vien",
                        $"Lenh xuat vien da tao {daysPending} ngay truoc nhung chua hoan tat. Kiem tra thu tuc xuat vien.",
                        patientId, null, admissionId));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-22 error"); }
        return alerts;
    }

    // Rule 23: Bed capacity >85%
    private async Task<List<BusinessAlertDto>> CheckBedCapacityAsync()
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var departments = await _context.Departments
                .Where(d => d.IsActive)
                .ToListAsync();

            foreach (var dept in departments)
            {
                var totalBeds = await _context.Beds
                    .Where(b => b.Room != null && b.Room.DepartmentId == dept.Id && b.IsActive)
                    .CountAsync();

                if (totalBeds == 0) continue;

                var occupiedBeds = await _context.Beds
                    .Where(b => b.Room != null && b.Room.DepartmentId == dept.Id && b.IsActive && b.Status == 1) // Status 1 = Occupied
                    .CountAsync();

                var occupancyRate = (double)occupiedBeds / totalBeds * 100;
                if (occupancyRate > 85)
                {
                    alerts.Add(CreateAlert("IPD-23", "Inpatient", occupancyRate > 95 ? 1 : 2, "Inpatient",
                        "Giuong sap day",
                        $"Khoa {dept.DepartmentName}: {occupiedBeds}/{totalBeds} giuong ({occupancyRate:F0}%). " +
                        (occupancyRate > 95 ? "GAN HET GIUONG - can dieu phoi." : "Can chuan bi ke hoach."),
                        null, null, null));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-23 error"); }
        return alerts;
    }

    // Rule 24: Insurance expiry during admission
    private async Task<List<BusinessAlertDto>> CheckInsuranceExpiryAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var insurance = await _context.InsuranceCards
                .Where(ic => ic.PatientId == patientId)
                .OrderByDescending(ic => ic.CreatedAt)
                .FirstOrDefaultAsync();

            if (insurance != null && insurance.EndDate.HasValue)
            {
                var daysUntilExpiry = (insurance.EndDate.Value - DateTime.UtcNow).Days;
                if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0)
                {
                    alerts.Add(CreateAlert("IPD-24", "Inpatient", 2, "Insurance",
                        "Bao hiem sap het han",
                        $"The BHYT het han sau {daysUntilExpiry} ngay ({insurance.EndDate.Value:dd/MM/yyyy}). Can thong bao BN gia han.",
                        patientId, null, null));
                }
                else if (daysUntilExpiry < 0)
                {
                    alerts.Add(CreateAlert("IPD-24", "Inpatient", 1, "Insurance",
                        "Bao hiem da het han",
                        $"The BHYT da het han ngay {insurance.EndDate.Value:dd/MM/yyyy}. BN can gia han hoac chuyen doi tuong thanh toan.",
                        patientId, null, null));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule IPD-24 error"); }
        return alerts;
    }

    // Rule 25: Pregnant patient radiation
    private async Task<List<BusinessAlertDto>> CheckPregnantRadiationAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
            if (patient == null || patient.Gender != 2 || !patient.DateOfBirth.HasValue) return alerts; // Female only

            var age = (DateTime.UtcNow - patient.DateOfBirth.Value).Days / 365;
            if (age >= 15 && age <= 49)
            {
                alerts.Add(CreateAlert("RAD-25", "Radiology", 1, "Radiology",
                    "Phu nu trong do tuoi mang thai",
                    $"BN nu {age} tuoi (15-49). Can xac nhan KHONG mang thai truoc khi chup X-quang/CT. Hoi ky kinh cuoi.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule RAD-25 error"); }
        return alerts;
    }

    // Rule 26: Contrast allergy
    private async Task<List<BusinessAlertDto>> CheckContrastAllergyAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            var contrastAllergy = await _context.Allergies
                .Where(a => a.PatientId == patientId
                    && (a.AllergenName != null &&
                        (a.AllergenName.Contains("can quang") || a.AllergenName.Contains("contrast")
                         || a.AllergenName.Contains("iod") || a.AllergenName.Contains("gadolinium"))))
                .FirstOrDefaultAsync();

            if (contrastAllergy != null)
            {
                alerts.Add(CreateAlert("RAD-26", "Radiology", 1, "Radiology",
                    "Di ung thuoc can quang",
                    $"BN co tien su di ung thuoc can quang: {contrastAllergy.AllergenName}. Phan ung: {contrastAllergy.Reaction ?? "N/A"}. KHONG SU DUNG thuoc can quang hoac can tien me phong ngua.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule RAD-26 error"); }
        return alerts;
    }

    // Rule 27: Cumulative radiation dose
    private async Task<List<BusinessAlertDto>> CheckCumulativeRadiationAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // Count radiology exams in the last year (through RadiologyRequest.PatientId)
            var examCount = await _context.RadiologyExams
                .Include(re => re.RadiologyRequest)
                .Where(re => re.RadiologyRequest != null && re.RadiologyRequest.PatientId == patientId
                    && re.CreatedAt >= DateTime.UtcNow.AddYears(-1))
                .CountAsync();

            if (examCount >= 10) // Threshold: >10 radiology exams per year
            {
                alerts.Add(CreateAlert("RAD-27", "Radiology", examCount >= 20 ? 1 : 2, "Radiology",
                    "Lieu buc xa tich luy",
                    $"BN da co {examCount} lan chup CDHA trong 12 thang qua. Can danh gia lieu buc xa tich luy va can nhac phuong phap thay the (sieu am, MRI).",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule RAD-27 error"); }
        return alerts;
    }

    // Rule 28: Critical radiology finding
    private async Task<List<BusinessAlertDto>> CheckCriticalRadiologyFindingAsync(Guid patientId)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            // RadiologyReport -> RadiologyExam -> RadiologyRequest -> PatientId
            // Check urgent requests (Priority >= 2) with completed reports
            var criticalReports = await _context.RadiologyReports
                .Include(rr => rr.RadiologyExam).ThenInclude(re => re.RadiologyRequest)
                .Where(rr => rr.RadiologyExam != null && rr.RadiologyExam.RadiologyRequest != null
                    && rr.RadiologyExam.RadiologyRequest.PatientId == patientId
                    && rr.RadiologyExam.RadiologyRequest.Priority >= 2 // Urgent or Emergency
                    && rr.CreatedAt >= DateTime.UtcNow.AddDays(-3))
                .Take(3)
                .ToListAsync();

            foreach (var report in criticalReports)
            {
                alerts.Add(CreateAlert("RAD-28", "Radiology", 1, "Radiology",
                    "Ket qua CDHA nguy hiem",
                    $"Ket qua CDHA khan: {report.Impression ?? "Phat hien bat thuong nghiem trong"}. Can xu tri ngay.",
                    patientId, null, null));
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Rule RAD-28 error"); }
        return alerts;
    }

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
                    "Gia tri nguy hiem",
                    $"XN {r.ParameterName}: ket qua {r.Value ?? "N/A"} (GTBT: {r.ReferenceRange ?? "N/A"}). GIA TRI NGUY KICH - THONG BAO BS NGAY.",
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
                    $"Mau XN {item.Service?.ServiceName ?? "N/A"} bi tu choi: {item.RejectReason ?? "Van de chat luong mau"}. Can lay mau lai.",
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
                                "Xet nghiem trung lap (1 lan/dot)",
                                $"XN {serviceName} da duoc chi dinh {epGrp.Count()} lan trong cung 1 dot dieu tri. " +
                                "Cau hinh: 1 lan/dot. Kiem tra co trung khong.",
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
                                "Xet nghiem trung lap",
                                $"XN {serviceName} da duoc chi dinh {countInWindow} lan trong {windowDays} ngay. " +
                                $"Cau hinh: khong lap trong {windowDays} ngay. Kiem tra co trung khong.",
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
                            "Xet nghiem trung lap",
                            $"XN {serviceName} da duoc chi dinh {countInWindow} lan trong 24h. Kiem tra co trung hay khong.",
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
                    $"Thuoc/VT (ID: {item.MedicineId}): ton kho {item.CurrentQuantity} < nguong toi thieu {item.MinimumQuantity}. Can dat hang bo sung.",
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
                    "Vuot tran BHXH",
                    $"Tong chi phi BHYT trong nam: {totalInsurance:N0} VND ({totalInsurance / annualCeiling * 100:F0}% tran). " +
                    (totalInsurance >= annualCeiling ? "DA VUOT TRAN - phan vuot BN tu tra." : "SAP DEN TRAN - can thong bao BN."),
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
                    "Chua thanh toan",
                    $"BN con no {totalUnpaid:N0} VND tu dich vu chua thanh toan, qua han {maxDaysOverdue} ngay. Can nhac nho thanh toan.",
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
                        "Khac nhom mau benh nhan",
                        $"BN nhom mau {patient.BloodType}{(patient.RhFactor != null ? $" {patient.RhFactor}" : "")} — yeu cau nhom {requestedBloodType}{(requestedRhFactor != null ? $" {requestedRhFactor}" : "")}. XAC NHAN truoc khi thuc hien.",
                        patientId, null, null));
                }

                if (!string.IsNullOrEmpty(patient.RhFactor) && !string.IsNullOrEmpty(requestedRhFactor)
                    && !string.Equals(patient.RhFactor, requestedRhFactor, StringComparison.OrdinalIgnoreCase))
                {
                    alerts.Add(CreateAlert("BLOOD-35", "BloodBank", 1, "BloodBank",
                        "Khac Rh benh nhan",
                        $"BN Rh {patient.RhFactor} — yeu cau Rh {requestedRhFactor}. NGUY HIEM neu truyen khac Rh.",
                        patientId, null, null));
                }
            }
            else if (string.IsNullOrEmpty(patient.BloodType))
            {
                alerts.Add(CreateAlert("BLOOD-35", "BloodBank", 2, "BloodBank",
                    "Chua co nhom mau benh nhan",
                    "BN chua co thong tin nhom mau trong ho so. Can xet nghiem nhom mau truoc khi truyen.",
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
                    "Vuot gioi han CLS BHYT/ngay",
                    $"BN BHYT da co {todayClsCount} CLS hom nay, them {newOrderCount} = {totalAfterOrder} (gioi han {bhytDailyLimit}/ngay). BHXH co the tu choi thanh toan phan vuot.",
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
                    "Ma ICD khong trong danh muc BHYT",
                    $"Ma benh {icdCode} khong nam trong danh muc BHYT duoc chi tra. BN phai tu chi tra.",
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
                        "Thuoc ngoai phac do BHYT",
                        $"Thuoc {med.MedicineName} khong thuoc danh muc BHYT cho ma ICD {icdCode}. BN tu chi tra.",
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
                    "Don thuoc chua linh",
                    $"BN co {unfilledRx.Count} don thuoc chua linh trong 30 ngay: {rxList}. Nhac BN linh thuoc cu truoc khi kham moi.",
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

    // =====================================================================
    // HELPERS
    // =====================================================================

    private BusinessAlertDto CreateAlert(string alertCode, string category, int severity, string module,
        string title, string message, Guid? patientId, Guid? examinationId, Guid? admissionId)
    {
        return new BusinessAlertDto
        {
            Id = Guid.NewGuid(),
            AlertCode = alertCode,
            Category = category,
            Severity = severity,
            SeverityLabel = severity switch { 1 => "Critical", 2 => "Warning", _ => "Info" },
            SeverityColor = severity switch { 1 => "red", 2 => "orange", _ => "blue" },
            Module = module,
            Title = title,
            Message = message,
            PatientId = patientId,
            ExaminationId = examinationId,
            AdmissionId = admissionId,
            Status = 0,
            StatusLabel = "New",
            CreatedAt = DateTime.UtcNow,
        };
    }

    private async Task PersistNewAlertsAsync(List<BusinessAlertDto> alerts, Guid? patientId)
    {
        if (!alerts.Any()) return;

        try
        {
            // Avoid duplicate alerts: check if same alert code + patient already exists today
            var today = DateTime.UtcNow.Date;
            var existingCodes = await _context.BusinessAlerts
                .Where(a => a.PatientId == patientId
                    && a.CreatedAt >= today
                    && a.Status < 2) // Not resolved
                .Select(a => a.AlertCode + "|" + a.Title)
                .ToListAsync();

            foreach (var alertDto in alerts)
            {
                var key = alertDto.AlertCode + "|" + alertDto.Title;
                if (existingCodes.Contains(key)) continue;

                var entity = new BusinessAlert
                {
                    Id = alertDto.Id,
                    AlertCode = alertDto.AlertCode,
                    Category = alertDto.Category,
                    Title = alertDto.Title,
                    Message = alertDto.Message,
                    Severity = alertDto.Severity,
                    Module = alertDto.Module,
                    PatientId = alertDto.PatientId,
                    ExaminationId = alertDto.ExaminationId,
                    AdmissionId = alertDto.AdmissionId,
                    Status = 0,
                    CreatedAt = DateTime.UtcNow,
                };
                _context.BusinessAlerts.Add(entity);
                existingCodes.Add(key);
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error persisting alerts");
        }
    }

    private static BusinessAlertDto MapToDto(BusinessAlert a)
    {
        return new BusinessAlertDto
        {
            Id = a.Id,
            AlertCode = a.AlertCode,
            Category = a.Category,
            Title = a.Title,
            Message = a.Message,
            Severity = a.Severity,
            SeverityLabel = a.Severity switch { 1 => "Critical", 2 => "Warning", _ => "Info" },
            SeverityColor = a.Severity switch { 1 => "red", 2 => "orange", _ => "blue" },
            Module = a.Module,
            PatientId = a.PatientId,
            ExaminationId = a.ExaminationId,
            AdmissionId = a.AdmissionId,
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            Status = a.Status,
            StatusLabel = a.Status switch { 0 => "New", 1 => "Acknowledged", 2 => "Resolved", 3 => "Ignored", _ => "Unknown" },
            AcknowledgedAt = a.AcknowledgedAt,
            AcknowledgedBy = a.AcknowledgedBy,
            ActionTaken = a.ActionTaken,
            Details = a.Details,
            CreatedAt = a.CreatedAt,
        };
    }

    private static AlertCheckResultDto BuildResult(List<BusinessAlertDto> alerts)
    {
        return new AlertCheckResultDto
        {
            NewAlerts = alerts,
            TotalNewAlerts = alerts.Count,
            CriticalCount = alerts.Count(a => a.Severity == 1),
            WarningCount = alerts.Count(a => a.Severity == 2),
            InfoCount = alerts.Count(a => a.Severity == 3),
        };
    }

    // =====================================================================
    // RULES CATALOG (34 rules)
    // =====================================================================

    private static readonly List<BusinessAlertRuleDto> AlertRules = new()
    {
        // OPD (1-10)
        new() { AlertCode = "OPD-01", Category = "OPD", Title = "Di ung thuoc", Description = "Canh bao khi ke don thuoc BN co tien su di ung", DefaultSeverity = 1, Module = "OPD" },
        new() { AlertCode = "OPD-02", Category = "OPD", Title = "Tuong tac thuoc", Description = "Canh bao tuong tac giua cac thuoc dang ke", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "OPD-03", Category = "OPD", Title = "Chong chi dinh", Description = "Canh bao chong chi dinh dua tren chan doan", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "OPD-04", Category = "OPD", Title = "Trung don thuoc", Description = "Canh bao trung don thuoc trong 7 ngay", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "OPD-05", Category = "OPD", Title = "Lieu qua cao", Description = "Canh bao vuot lieu toi da cho phep", DefaultSeverity = 1, Module = "OPD" },
        new() { AlertCode = "OPD-06", Category = "OPD", Title = "Lieu qua thap", Description = "Canh bao duoi lieu dieu tri toi thieu", DefaultSeverity = 3, Module = "OPD" },
        new() { AlertCode = "OPD-07", Category = "OPD", Title = "Thuoc het han trong kho", Description = "Canh bao thuoc het han khi cap phat", DefaultSeverity = 1, Module = "Pharmacy" },
        new() { AlertCode = "OPD-08", Category = "OPD", Title = "Qua hen tai kham", Description = "Canh bao BN qua hen tai kham >7 ngay", DefaultSeverity = 3, Module = "OPD" },
        new() { AlertCode = "OPD-09", Category = "OPD", Title = "Ket qua XN bat thuong", Description = "Canh bao gia tri xet nghiem bat thuong/nguy kich", DefaultSeverity = 1, Module = "Lab" },
        new() { AlertCode = "OPD-10", Category = "OPD", Title = "Sinh hieu bat thuong", Description = "Canh bao chi so sinh hieu ngoai gioi han", DefaultSeverity = 1, Module = "OPD" },

        // Inpatient (11-24)
        new() { AlertCode = "IPD-11", Category = "Inpatient", Title = "Nguy co nga", Description = "Canh bao nguy co nga cho BN >65 tuoi", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-12", Category = "Inpatient", Title = "Nguy co loet ti de", Description = "Canh bao nguy co loet dua tren Braden Scale", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-13", Category = "Inpatient", Title = "Nguy co suy dinh duong", Description = "Canh bao suy dinh duong theo NRS-2002/MUST", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-14", Category = "Inpatient", Title = "Nguy co nhiem khuan BV", Description = "Canh bao NKBV dua tren thiet bi/thoi gian", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-15", Category = "Inpatient", Title = "Nam vien dai", Description = "Canh bao thoi gian nam vien >21 ngay", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-16", Category = "Inpatient", Title = "Y lenh chua thuc hien", Description = "Canh bao y lenh qua han >4 gio", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-17", Category = "Inpatient", Title = "Thuoc chua phat", Description = "Canh bao don thuoc chua cap phat >2 gio", DefaultSeverity = 2, Module = "Pharmacy" },
        new() { AlertCode = "IPD-18", Category = "Inpatient", Title = "BN nang chua hoi chan", Description = "Canh bao ICU >48h khong hoi chan", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-19", Category = "Inpatient", Title = "Truyen dich sap het", Description = "Canh bao truyen dich con <30 phut", DefaultSeverity = 3, Module = "Inpatient" },
        new() { AlertCode = "IPD-20", Category = "Inpatient", Title = "Cay mau duong tinh", Description = "Canh bao ket qua cay mau duong tinh - xu tri ngay", DefaultSeverity = 1, Module = "Lab" },
        new() { AlertCode = "IPD-21", Category = "Inpatient", Title = "Diem NEWS2 cao", Description = "Canh bao diem NEWS2 >= 5", DefaultSeverity = 1, Module = "Inpatient" },
        new() { AlertCode = "IPD-22", Category = "Inpatient", Title = "BN can xuat vien", Description = "Canh bao dieu tri hoan tat, cho xuat vien", DefaultSeverity = 3, Module = "Inpatient" },
        new() { AlertCode = "IPD-23", Category = "Inpatient", Title = "Giuong sap day", Description = "Canh bao cong suat giuong >85%", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-24", Category = "Inpatient", Title = "Bao hiem sap het han", Description = "Canh bao BHYT het han trong thoi gian nam vien", DefaultSeverity = 2, Module = "Insurance" },

        // Radiology (25-28)
        new() { AlertCode = "RAD-25", Category = "Radiology", Title = "Phu nu mang thai", Description = "Canh bao BN nu 15-49 tuoi chup buc xa", DefaultSeverity = 1, Module = "Radiology" },
        new() { AlertCode = "RAD-26", Category = "Radiology", Title = "Di ung thuoc can quang", Description = "Canh bao tien su di ung thuoc can quang", DefaultSeverity = 1, Module = "Radiology" },
        new() { AlertCode = "RAD-27", Category = "Radiology", Title = "Lieu buc xa tich luy", Description = "Canh bao vuot nguong buc xa nam", DefaultSeverity = 2, Module = "Radiology" },
        new() { AlertCode = "RAD-28", Category = "Radiology", Title = "Ket qua CDHA nguy hiem", Description = "Canh bao ket qua CDHA khan can xu tri ngay", DefaultSeverity = 1, Module = "Radiology" },

        // Lab (29-31)
        new() { AlertCode = "LAB-29", Category = "Lab", Title = "Gia tri nguy hiem", Description = "Canh bao gia tri XN nguy kich (panic values)", DefaultSeverity = 1, Module = "Lab" },
        new() { AlertCode = "LAB-30", Category = "Lab", Title = "Mau bi tu choi", Description = "Canh bao mau XN bi tu choi do chat luong", DefaultSeverity = 2, Module = "Lab" },
        new() { AlertCode = "LAB-31", Category = "Lab", Title = "XN trung lap", Description = "Canh bao chi dinh XN trung trong 24h", DefaultSeverity = 2, Module = "Lab" },

        // Pharmacy (32)
        new() { AlertCode = "PHAR-32", Category = "Pharmacy", Title = "Ton kho thap", Description = "Canh bao thuoc/VT duoi nguong toi thieu", DefaultSeverity = 2, Module = "Pharmacy" },

        // Billing (33-34)
        new() { AlertCode = "BILL-33", Category = "Billing", Title = "Vuot tran BHXH", Description = "Canh bao vuot han muc BHYT nam", DefaultSeverity = 1, Module = "Billing" },
        new() { AlertCode = "BILL-34", Category = "Billing", Title = "Chua thanh toan", Description = "Canh bao cong no qua han >3 ngay", DefaultSeverity = 2, Module = "Billing" },

        // Inline safety (35-39)
        new() { AlertCode = "BLOOD-35", Category = "BloodBank", Title = "Khac nhom mau", Description = "Canh bao nhom mau/Rh khac giua BN va yeu cau truyen mau", DefaultSeverity = 1, Module = "BloodBank" },
        new() { AlertCode = "BHYT-36", Category = "BHYT", Title = "Vuot gioi han CLS/ngay", Description = "Canh bao vuot gioi han so luong CLS BHYT/ngay", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "BHYT-37", Category = "BHYT", Title = "Ngoai phac do BHYT", Description = "Canh bao thuoc/dich vu ngoai phac do BHYT theo ma ICD", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "REG-38", Category = "Registration", Title = "Don thuoc chua linh", Description = "Canh bao BN con don thuoc cu chua linh tai quay", DefaultSeverity = 2, Module = "Reception" },
        new() { AlertCode = "REG-39", Category = "Registration", Title = "Uoc tinh chi phi", Description = "Uoc tinh chi phi dich vu truoc khi kham", DefaultSeverity = 3, Module = "Reception" },
    };
}
