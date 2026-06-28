using HIS.Application.DTOs.BusinessAlert;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class BusinessAlertService : IBusinessAlertService
{
    private readonly HISDbContext _context;
    private readonly ILogger<BusinessAlertService> _logger;

    /// <summary>Ngưỡng mặc định số lượt khám/ngày của 1 BS hoặc 1 phòng khám (Rule OPD-40).
    /// Có thể override qua SystemConfig (key "ClinicOverloadThreshold") nếu cần cấu hình per-bệnh viện.</summary>
    private const int ClinicOverloadThreshold = 65;

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

    // ========== CLINIC OVERLOAD (Rule OPD-40) ==========

    /// <inheritdoc cref="IBusinessAlertService.CheckClinicOverloadAsync"/>
    public async Task<AlertCheckResultDto> CheckClinicOverloadAsync(Guid? doctorId, Guid? roomId, DateTime? date)
    {
        var alerts = new List<BusinessAlertDto>();
        try
        {
            alerts.AddRange(await CheckClinicOverloadInternalAsync(doctorId, roomId, date));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error checking clinic overload (doctorId={DoctorId}, roomId={RoomId})", doctorId, roomId);
        }
        await PersistNewAlertsAsync(alerts, null);
        return BuildResult(alerts);
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

}
