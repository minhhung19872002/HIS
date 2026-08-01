using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Pharmacy;

namespace HIS.Infrastructure.Services;

// #438 (carve từ #436 ← #407): đối chiếu y lệnh thuốc nội trú vs cấp phát thực tế.
// Clinical design đã duyệt 2026-08-02:
//   · Phạm vi khớp = ĐỢT ĐIỀU TRỊ, khoá (MedicalRecordId, MedicineId) — KHÔNG theo ngày,
//     vì y lệnh kê theo ngày còn cấp phát gom theo phiếu lĩnh → theo ngày sẽ báo lệch giả.
//   · Tolerance = 0 (thuốc đếm được). KHÔNG so liều dùng (Dosage/Frequency là text tự do).
//   · Phase 1 CHỈ BÁO CÁO — read-only, không tự sinh phiếu điều chỉnh (patient-safety).
//   · Xuất tủ trực (DrugOrderType=2) = "hợp lệ có kiểm soát", tách nhóm riêng, KHÔNG tính NO_ORDER.
public partial class PharmacyService
{
    private const int InpatientPrescriptionType = 2; // Prescription.PrescriptionType
    private const int CabinetDrugOrderType      = 2; // Prescription.DrugOrderType: xuất tủ trực
    private const int ReturnDrugOrderType       = 3; // Prescription.DrugOrderType: hoàn trả
    private const int InpatientExportType       = 2; // ExportReceipt.ExportType: BN nội trú
    private const int ExportIssuedStatus        = 1; // ExportReceipt.Status: đã xuất

    public async Task<MedicationReconciliationResultDto> GetMedicationReconciliationAsync(
        Guid? medicalRecordId, Guid? departmentId, DateTime? fromDate, DateTime? toDate)
    {
        var result = new MedicationReconciliationResultDto();

        // ── Vế 1: y lệnh nội trú ───────────────────────────────────────────────
        var rxQuery = _context.Prescriptions
            .AsNoTracking()
            .Include(p => p.Details)
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Department)
            .Where(p => !p.IsDeleted
                        && p.PrescriptionType == InpatientPrescriptionType
                        && p.Status != 4                        // 4-Hủy: không tính vào y lệnh
                        && p.DrugOrderType != ReturnDrugOrderType);

        if (medicalRecordId.HasValue) rxQuery = rxQuery.Where(p => p.MedicalRecordId == medicalRecordId.Value);
        if (departmentId.HasValue)    rxQuery = rxQuery.Where(p => p.MedicalRecord.DepartmentId == departmentId.Value);
        if (fromDate.HasValue)        rxQuery = rxQuery.Where(p => p.PrescriptionDate >= fromDate.Value);
        if (toDate.HasValue)          rxQuery = rxQuery.Where(p => p.PrescriptionDate <= toDate.Value);

        var prescriptions = await rxQuery.OrderByDescending(p => p.PrescriptionDate).Take(500).ToListAsync();
        if (prescriptions.Count == 0) return result;

        var recordIds = prescriptions.Select(p => p.MedicalRecordId).Distinct().ToList();

        // ── Vế 2: phiếu xuất kho thực tế cho chính các HSBA đó ─────────────────
        var exportLines = await _context.ExportReceiptDetails
            .AsNoTracking()
            .Include(d => d.ExportReceipt)
            .Include(d => d.Medicine)
            .Where(d => !d.IsDeleted
                        && d.MedicineId != null
                        && d.ExportReceipt.ExportType == InpatientExportType
                        && d.ExportReceipt.Status == ExportIssuedStatus
                        && d.ExportReceipt.MedicalRecordId != null
                        && recordIds.Contains(d.ExportReceipt.MedicalRecordId!.Value))
            .ToListAsync();

        // Đơn xuất tủ trực → nhóm riêng "hợp lệ có kiểm soát" (không đối chiếu như y lệnh thường quy)
        var cabinetKeys = prescriptions
            .Where(p => p.DrugOrderType == CabinetDrugOrderType)
            .SelectMany(p => p.Details.Where(d => !d.IsDeleted).Select(d => (p.MedicalRecordId, d.MedicineId)))
            .ToHashSet();

        // Gộp y lệnh theo (HSBA, thuốc) — bỏ đơn tủ trực khỏi vế "ordered" thường quy
        var orderedByKey = prescriptions
            .Where(p => p.DrugOrderType != CabinetDrugOrderType)
            .SelectMany(p => p.Details.Where(d => !d.IsDeleted).Select(d => new
            {
                p.MedicalRecordId, d.MedicineId, d.Quantity, d.DispensedQuantity, d.Unit,
            }))
            .GroupBy(x => (x.MedicalRecordId, x.MedicineId))
            .ToDictionary(g => g.Key, g => new
            {
                Ordered  = g.Sum(x => x.Quantity),
                Recorded = g.Sum(x => x.DispensedQuantity),
                Unit     = g.Select(x => x.Unit).FirstOrDefault(u => !string.IsNullOrEmpty(u)),
            });

        var dispensedByKey = exportLines
            .GroupBy(d => (MedicalRecordId: d.ExportReceipt.MedicalRecordId!.Value, MedicineId: d.MedicineId!.Value))
            .ToDictionary(g => g.Key, g => new
            {
                Dispensed = g.Sum(x => x.Quantity),
                Name      = g.Select(x => x.Medicine?.MedicineName).FirstOrDefault(n => !string.IsNullOrEmpty(n)),
                Code      = g.Select(x => x.Medicine?.MedicineCode).FirstOrDefault(c => !string.IsNullOrEmpty(c)),
                Unit      = g.Select(x => x.Unit).FirstOrDefault(u => !string.IsNullOrEmpty(u)),
            });

        // Thông tin hiển thị (HSBA + thuốc) — nạp 1 lần, tránh N+1
        var recordInfo = prescriptions
            .GroupBy(p => p.MedicalRecordId)
            .ToDictionary(g => g.Key, g => g.First().MedicalRecord);

        var medicineIds = orderedByKey.Keys.Select(k => k.MedicineId)
            .Concat(dispensedByKey.Keys.Select(k => k.MedicineId))
            .Concat(cabinetKeys.Select(k => k.MedicineId))
            .Distinct().ToList();
        var medicines = await _context.Medicines.AsNoTracking()
            .Where(m => medicineIds.Contains(m.Id))
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName, m.Unit })
            .ToDictionaryAsync(m => m.Id);

        var rows = new List<MedicationReconciliationRowDto>();

        MedicationReconciliationRowDto NewRow(Guid recordId, Guid medicineId, string? unit)
        {
            recordInfo.TryGetValue(recordId, out var mr);
            medicines.TryGetValue(medicineId, out var med);
            return new MedicationReconciliationRowDto
            {
                MedicalRecordId   = recordId,
                MedicalRecordCode = mr?.MedicalRecordCode,
                PatientId         = mr?.PatientId,
                PatientCode       = mr?.Patient?.PatientCode,
                PatientName       = mr?.Patient?.FullName,
                DepartmentName    = mr?.Department?.DepartmentName,
                MedicineId        = medicineId,
                MedicineCode      = med?.MedicineCode,
                MedicineName      = med?.MedicineName,
                Unit              = unit ?? med?.Unit,
            };
        }

        // ── Đối chiếu vế y lệnh ────────────────────────────────────────────────
        foreach (var (key, ord) in orderedByKey)
        {
            dispensedByKey.TryGetValue(key, out var disp);
            var dispensed = disp?.Dispensed ?? 0m;

            if (dispensed < ord.Ordered)
            {
                var row = NewRow(key.MedicalRecordId, key.MedicineId, ord.Unit);
                row.OrderedQuantity = ord.Ordered;
                row.DispensedQuantity = dispensed;
                row.RecordedDispensedQuantity = ord.Recorded;
                row.Variance = dispensed - ord.Ordered;
                row.DiscrepancyType = "NOT_DISPENSED";
                row.Note = $"Thiếu {ord.Ordered - dispensed} so với y lệnh";
                rows.Add(row);
            }
            else if (dispensed > ord.Ordered)
            {
                var row = NewRow(key.MedicalRecordId, key.MedicineId, ord.Unit);
                row.OrderedQuantity = ord.Ordered;
                row.DispensedQuantity = dispensed;
                row.RecordedDispensedQuantity = ord.Recorded;
                row.Variance = dispensed - ord.Ordered;
                row.DiscrepancyType = "OVER_DISPENSED";
                row.Note = $"Cấp vượt {dispensed - ord.Ordered} so với y lệnh";
                rows.Add(row);
            }

            // Lệch dữ liệu nội bộ: cột denormalized ≠ tổng phiếu xuất thật (báo độc lập với 2 loại trên)
            if (ord.Recorded != dispensed)
            {
                var row = NewRow(key.MedicalRecordId, key.MedicineId, ord.Unit);
                row.OrderedQuantity = ord.Ordered;
                row.DispensedQuantity = dispensed;
                row.RecordedDispensedQuantity = ord.Recorded;
                row.Variance = dispensed - ord.Recorded;
                row.DiscrepancyType = "FIELD_DRIFT";
                row.Note = $"PrescriptionDetail.DispensedQuantity={ord.Recorded} ≠ tổng phiếu xuất={dispensed}";
                rows.Add(row);
            }
        }

        // ── Vế cấp phát không có y lệnh tương ứng ──────────────────────────────
        foreach (var (key, disp) in dispensedByKey)
        {
            if (orderedByKey.ContainsKey(key)) continue;

            var isCabinet = cabinetKeys.Contains(key);
            var row = NewRow(key.MedicalRecordId, key.MedicineId, disp.Unit);
            row.OrderedQuantity = 0;
            row.DispensedQuantity = disp.Dispensed;
            row.Variance = disp.Dispensed;
            row.DiscrepancyType = isCabinet ? "CABINET_ISSUE" : "NO_ORDER";
            row.Note = isCabinet
                ? "Xuất tủ trực — hợp lệ có kiểm soát"
                : "Đã cấp nhưng không tìm thấy y lệnh nội trú tương ứng trong đợt điều trị";
            rows.Add(row);
        }

        result.Rows = rows
            .OrderBy(r => r.DiscrepancyType == "CABINET_ISSUE" ? 1 : 0) // nhóm hợp lệ xuống cuối
            .ThenBy(r => r.PatientName)
            .ThenBy(r => r.MedicineName)
            .ToList();

        result.Summary = new MedicationReconciliationSummaryDto
        {
            MedicalRecordCount = recordIds.Count,
            NotDispensedCount  = rows.Count(r => r.DiscrepancyType == "NOT_DISPENSED"),
            NoOrderCount       = rows.Count(r => r.DiscrepancyType == "NO_ORDER"),
            OverDispensedCount = rows.Count(r => r.DiscrepancyType == "OVER_DISPENSED"),
            FieldDriftCount    = rows.Count(r => r.DiscrepancyType == "FIELD_DRIFT"),
            CabinetIssueCount  = rows.Count(r => r.DiscrepancyType == "CABINET_ISSUE"),
        };

        return result;
    }
}
