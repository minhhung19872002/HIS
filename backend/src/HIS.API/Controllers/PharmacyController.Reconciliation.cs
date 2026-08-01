using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

// #438: đối chiếu y lệnh thuốc nội trú vs cấp phát thực tế. READ-ONLY (phase 1 chỉ báo cáo —
// KHÔNG tự sinh phiếu điều chỉnh; hành động sửa lệch do dược sĩ thực hiện thủ công có duyệt).
public partial class PharmacyController
{
    /// <summary>Đối chiếu thuốc nội trú theo đợt điều trị. Lọc theo HSBA HOẶC khoa + khoảng ngày kê.</summary>
    [HttpGet("reconciliation")]
    public async Task<IActionResult> GetMedicationReconciliation(
        [FromQuery] Guid? medicalRecordId,
        [FromQuery] Guid? departmentId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        try
        {
            return Ok(await _pharmacyService.GetMedicationReconciliationAsync(
                medicalRecordId, departmentId, fromDate, toDate));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error building medication reconciliation report");
            return Ok(new HIS.Application.DTOs.Pharmacy.MedicationReconciliationResultDto());
        }
    }
}
