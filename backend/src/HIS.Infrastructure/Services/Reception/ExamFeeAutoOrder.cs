using Microsoft.EntityFrameworkCore;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA-R12: the exam fee (công khám) of an outpatient visit. Registration never created it — only 14 of 2,717 outpatient
/// records carried an exam-service line, so the cashier collected no exam fee at all. The room has no exam-service
/// link in the data model, so the charge is a hospital policy behind SystemConfigs:
/// <list type="bullet">
/// <item><c>Reception.AutoExamFee</c> = <c>Off</c> (seeded, current behaviour): nothing is created; the cashier sees
/// "Lượt khám chưa có công khám" (InvoiceLedger warning).</item>
/// <item><c>On</c>: every new exam (primary visit or extra room) gets one exam-service order, priced from the catalog and
/// split for BHYT by <see cref="BhytVisitPricing"/>. Idempotent per examination; it carries the ExaminationId, so
/// cancelling the exam cancels it (ExaminationCompleteService.CancelExaminationAsync).</item>
/// <item><c>Reception.AutoExamFeeServiceCode</c>: which exam service (Services.ServiceType 1) to charge; empty = the
/// first active one by display order, then the cheapest (the basic exam).</item>
/// </list>
/// </summary>
public static class ExamFeeAutoOrder
{
    public const string SwitchKey = "Reception.AutoExamFee";
    public const string ServiceCodeKey = "Reception.AutoExamFeeServiceCode";

    /// <summary>Stage the exam-fee order for a newly registered exam when switched On. Does not save.</summary>
    public static async Task<bool> StageAsync(HISDbContext db, MedicalRecord record, Examination exam, Guid userId)
    {
        var configs = await db.SystemConfigs.AsNoTracking()
            .Where(c => (c.ConfigKey == SwitchKey || c.ConfigKey == ServiceCodeKey) && c.IsActive && !c.IsDeleted)
            .Select(c => new { c.ConfigKey, c.ConfigValue })
            .ToListAsync();
        if (!InvoiceLedger.ParseSwitch(configs.FirstOrDefault(c => c.ConfigKey == SwitchKey)?.ConfigValue, false))
            return false;
        if (record.TreatmentType != 1 || exam.DepartmentId == Guid.Empty) return false;

        var code = configs.FirstOrDefault(c => c.ConfigKey == ServiceCodeKey)?.ConfigValue?.Trim();
        var service = await db.Services.AsNoTracking()
            .Where(s => s.IsActive && !s.IsDeleted && s.ServiceType == 1 && s.UnitPrice > 0
                        && (string.IsNullOrEmpty(code) || s.ServiceCode == code))
            .OrderBy(s => s.DisplayOrder).ThenBy(s => s.UnitPrice).ThenBy(s => s.ServiceCode) // fallback: the basic (cheapest) exam
            .FirstOrDefaultAsync();
        if (service == null) return false; // no priced exam service in the catalog: the cashier warning stays

        // One exam fee per examination (a retried registration must not charge twice).
        if (await db.ServiceRequests.AnyAsync(r => r.ExaminationId == exam.Id && !r.IsDeleted && r.Status != 4
                                                   && r.Details.Any(d => !d.IsDeleted && d.Status != 3 && d.Service.ServiceType == 1)))
            return false;

        // The orderer must be a real user (FK): the visit's doctor, else the receptionist.
        var doctorId = exam.DoctorId ?? record.DoctorId ?? userId;
        var now = DateTime.Now;
        var request = new ServiceRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"CDKB{HIS.Core.Common.CodeGenerator.NextUniqueNow():yyyyMMddHHmmssfff}",
            RequestDate = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local
            MedicalRecordId = record.Id,
            ExaminationId = exam.Id,
            DoctorId = doctorId,
            DepartmentId = exam.DepartmentId,
            RequestType = ServiceRequestType.FromServiceType(service.ServiceType), // 1 Khám → 5 Khác (not a lab/RIS order)
            ServiceId = service.Id,
            Quantity = 1,
            UnitPrice = service.UnitPrice,
            TotalPrice = service.UnitPrice,
            TotalAmount = service.UnitPrice,
            InsuranceAmount = 0,
            PatientAmount = service.UnitPrice,
            RoomId = exam.RoomId,
            Status = 0,
            RequestedByUserId = userId,
            RequestedDate = now,
            Notes = "Công khám — tự tạo khi tiếp đón (Reception.AutoExamFee)",
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };
        request.Details.Add(new ServiceRequestDetail
        {
            Id = Guid.NewGuid(),
            ServiceRequestId = request.Id,
            ServiceId = service.Id,
            Quantity = 1,
            UnitPrice = service.UnitPrice,
            Amount = service.UnitPrice,
            InsuranceAmount = 0,
            PatientAmount = service.UnitPrice,
            PatientType = record.PatientType is 1 or 2 or 3 ? record.PatientType : 2,
            Status = 0,
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        });
        db.ServiceRequests.Add(request);
        return true;
    }

    /// <summary>After the registration was saved: BHYT split of the new line (no-op for fee patients). Saves.</summary>
    public static async Task SplitAsync(HISDbContext db, Guid medicalRecordId)
    {
        if (await new BhytVisitPricing(db).RecalculateAsync(medicalRecordId) != null)
            await db.SaveChangesAsync();
    }
}
