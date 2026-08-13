using HIS.Application.DTOs.Reporting;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap27 (HSMT BV Tâm thần Quảng Ngãi) — 2 sổ còn thiếu so với danh mục báo cáo của HSMT:
///   13.2.7  Sổ duyệt kế hoạch phẫu thuật
///   13.2.10 Sổ tổng hợp thuốc hàng ngày
/// Tách partial riêng để không phình thêm Part1-Part4 vốn đã lớn.
/// </summary>
public partial class HospitalReportService
{
    /// <summary>
    /// HSMT 13.2.7 — Sổ duyệt kế hoạch phẫu thuật: mỗi dòng là một ca đã lên lịch mổ,
    /// kèm trạng thái duyệt (SurgerySchedule.Status: 0 = đã lên lịch/chờ duyệt, 1 = đã xác nhận…).
    /// </summary>
    private async Task FillSurgeryPlanApprovalRegister(
        HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.SurgerySchedules.AsNoTracking()
            .Where(s => !s.IsDeleted && s.ScheduledDateTime >= from && s.ScheduledDateTime < to);

        if (deptId.HasValue)
        {
            query = query.Where(s => s.SurgeryRequest != null
                && s.SurgeryRequest.Examination != null
                && s.SurgeryRequest.Examination.DepartmentId == deptId);
        }

        var rows = await query
            .OrderBy(s => s.ScheduledDateTime)
            .Select(s => new
            {
                s.ScheduledDateTime,
                s.Status,
                RequestCode = s.SurgeryRequest != null ? s.SurgeryRequest.RequestCode : null,
                PatientCode = s.SurgeryRequest != null && s.SurgeryRequest.Patient != null
                    ? s.SurgeryRequest.Patient.PatientCode : null,
                PatientName = s.SurgeryRequest != null && s.SurgeryRequest.Patient != null
                    ? s.SurgeryRequest.Patient.FullName : null,
                PreOpDiagnosis = s.SurgeryRequest != null ? s.SurgeryRequest.PreOpDiagnosis : null,
                PlannedProcedure = s.SurgeryRequest != null ? s.SurgeryRequest.PlannedProcedure : null,
                SurgeryType = s.SurgeryRequest != null ? s.SurgeryRequest.SurgeryType : null,
                Priority = s.SurgeryRequest != null ? s.SurgeryRequest.Priority : 1,
                RoomName = s.OperatingRoom != null ? s.OperatingRoom.RoomName : null,
                SurgeonName = s.Surgeon != null ? s.Surgeon.FullName : null,
                AnesthesiologistName = s.Anesthesiologist != null ? s.Anesthesiologist.FullName : null,
                s.CancellationReason
            })
            .ToListAsync();

        foreach (var r in rows)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["scheduledDateTime"] = r.ScheduledDateTime,
                ["requestCode"] = r.RequestCode ?? "",
                ["patientCode"] = r.PatientCode ?? "",
                ["patientName"] = r.PatientName ?? "",
                ["preOpDiagnosis"] = r.PreOpDiagnosis ?? "",
                ["plannedProcedure"] = r.PlannedProcedure ?? "",
                ["surgeryType"] = r.SurgeryType ?? "",
                ["priority"] = SurgeryPriorityName(r.Priority),
                ["roomName"] = r.RoomName ?? "",
                ["surgeonName"] = r.SurgeonName ?? "",
                ["anesthesiologistName"] = r.AnesthesiologistName ?? "",
                ["approvalStatus"] = SurgeryScheduleStatusName(r.Status),
                ["cancellationReason"] = r.CancellationReason ?? ""
            });
        }

        result.Summary["totalPlans"] = rows.Count;
        result.Summary["approved"] = rows.Count(r => r.Status >= 1 && r.Status != 5 && r.Status != 6);
        result.Summary["pendingApproval"] = rows.Count(r => r.Status == 0);
        result.Summary["cancelled"] = rows.Count(r => r.Status == 5);
        result.Summary["postponed"] = rows.Count(r => r.Status == 6);
    }

    private static string SurgeryPriorityName(int priority) => priority switch
    {
        1 => "Binh thuong",
        2 => "Khan",
        3 => "Cap cuu",
        _ => "Khac"
    };

    private static string SurgeryScheduleStatusName(int status) => status switch
    {
        0 => "Da len lich (cho duyet)",
        1 => "Da xac nhan",
        2 => "Dang chuan bi",
        3 => "Dang mo",
        4 => "Hoan thanh",
        5 => "Huy",
        6 => "Hoan",
        _ => "Khac"
    };

    /// <summary>
    /// HSMT 13.2.10 — Sổ tổng hợp thuốc hàng ngày: tổng hợp lượng xuất theo NGÀY + THUỐC
    /// từ sổ StockMovements (MovementType 2 = Export). Lọc theo kho khi truyền warehouseId.
    /// </summary>
    private async Task FillDailyMedicineSummaryRegister(
        HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        var query = _context.StockMovements.AsNoTracking()
            .Where(m => !m.IsDeleted
                && m.MovementType == 2
                && m.MovementDate >= from && m.MovementDate < to);

        if (warehouseId.HasValue)
            query = query.Where(m => m.WarehouseId == warehouseId.Value);

        var rows = await query
            .GroupBy(m => new { Day = m.MovementDate.Date, m.MedicineId })
            .Select(g => new
            {
                g.Key.Day,
                g.Key.MedicineId,
                Quantity = g.Sum(x => x.Quantity),
                Amount = g.Sum(x => x.Amount),
                Times = g.Count()
            })
            .OrderBy(x => x.Day)
            .ToListAsync();

        var medicineIds = rows.Select(r => r.MedicineId).Distinct().ToList();
        var medicines = await _context.Medicines.AsNoTracking()
            .Where(m => medicineIds.Contains(m.Id))
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName, m.Unit })
            .ToListAsync();

        foreach (var r in rows.OrderBy(x => x.Day)
                     .ThenBy(x => medicines.FirstOrDefault(m => m.Id == x.MedicineId)?.MedicineName))
        {
            var med = medicines.FirstOrDefault(m => m.Id == r.MedicineId);
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = r.Day,
                ["medicineCode"] = med?.MedicineCode ?? "",
                ["medicineName"] = med?.MedicineName ?? "",
                ["unit"] = med?.Unit ?? "",
                ["quantity"] = r.Quantity,
                ["amount"] = r.Amount,
                ["issueCount"] = r.Times
            });
        }

        result.Summary["totalRows"] = rows.Count;
        result.Summary["totalQuantity"] = rows.Sum(r => r.Quantity);
        result.Summary["totalAmount"] = rows.Sum(r => r.Amount);
        result.Summary["distinctMedicines"] = medicineIds.Count;
    }
}
