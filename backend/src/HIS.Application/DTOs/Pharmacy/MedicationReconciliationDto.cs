namespace HIS.Application.DTOs.Pharmacy;

/// <summary>
/// #438: đối chiếu y lệnh thuốc nội trú vs cấp phát thực tế (read-only, phase 1 chỉ báo cáo).
/// Phạm vi khớp = ĐỢT ĐIỀU TRỊ: khoá (MedicalRecordId, MedicineId), KHÔNG theo ngày —
/// y lệnh kê theo ngày nhưng cấp phát gom theo phiếu lĩnh nên đối chiếu theo ngày sinh lệch giả.
/// </summary>
public class MedicationReconciliationResultDto
{
    public List<MedicationReconciliationRowDto> Rows { get; set; } = new();
    public MedicationReconciliationSummaryDto Summary { get; set; } = new();
}

public class MedicationReconciliationSummaryDto
{
    /// <summary>Số HSBA được đối chiếu.</summary>
    public int MedicalRecordCount { get; set; }
    /// <summary>Đã duyệt nhưng chưa/thiếu cấp.</summary>
    public int NotDispensedCount { get; set; }
    /// <summary>Cấp mà không có y lệnh tương ứng.</summary>
    public int NoOrderCount { get; set; }
    /// <summary>Cấp vượt số lượng y lệnh.</summary>
    public int OverDispensedCount { get; set; }
    /// <summary>Lệch dữ liệu nội bộ: PrescriptionDetail.DispensedQuantity ≠ tổng phiếu xuất.</summary>
    public int FieldDriftCount { get; set; }
    /// <summary>Xuất tủ trực — hợp lệ có kiểm soát, KHÔNG tính là lệch (quyết định 2026-08-02).</summary>
    public int CabinetIssueCount { get; set; }
}

public class MedicationReconciliationRowDto
{
    public Guid MedicalRecordId { get; set; }
    public string? MedicalRecordCode { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? DepartmentName { get; set; }

    public Guid MedicineId { get; set; }
    public string? MedicineCode { get; set; }
    public string? MedicineName { get; set; }
    public string? Unit { get; set; }

    /// <summary>Tổng số lượng y lệnh (đã duyệt/đã cấp, loại trừ đơn hủy + đơn hoàn trả).</summary>
    public decimal OrderedQuantity { get; set; }
    /// <summary>Tổng số lượng thực xuất kho cho HSBA này (ExportReceipts ExportType=2, Status=1).</summary>
    public decimal DispensedQuantity { get; set; }
    /// <summary>Tổng cột denormalized PrescriptionDetail.DispensedQuantity — dùng phát hiện FIELD_DRIFT.</summary>
    public decimal RecordedDispensedQuantity { get; set; }
    /// <summary>DispensedQuantity - OrderedQuantity (âm = thiếu, dương = vượt).</summary>
    public decimal Variance { get; set; }

    /// <summary>NOT_DISPENSED · NO_ORDER · OVER_DISPENSED · FIELD_DRIFT · CABINET_ISSUE</summary>
    public string DiscrepancyType { get; set; } = string.Empty;
    public string? Note { get; set; }
}
