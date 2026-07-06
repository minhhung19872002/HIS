using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using RoomDto = HIS.Application.DTOs.RoomDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Dtos.ExaminationComplete;

namespace HIS.API.Controllers;

public partial class ExaminationCompleteController : ControllerBase
{
    [HttpGet("{examinationId}/prescriptions")]
    public async Task<ActionResult<List<PrescriptionFullDto>>> GetPrescriptions(Guid examinationId)
    {
        var result = await _examinationService.GetPrescriptionsAsync(examinationId);
        return Ok(result);
    }

    [HttpGet("prescriptions/recent")]
    public async Task<IActionResult> GetRecentPrescriptions(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? keyword,
        [FromQuery] int pageSize = 100)
    {
        var from = fromDate ?? DateTime.Today;
        var to = toDate ?? DateTime.Today.AddDays(1).AddTicks(-1);
        return Ok(await _examinationService.GetRecentPrescriptionsAsync(from, to, keyword, pageSize));
    }

    [HttpGet("prescriptions/search-by-code/{code}")]
    public async Task<IActionResult> SearchPrescriptionByCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return BadRequest(new { message = "Mã đơn không được để trống" });
        var result = await _examinationService.SearchPrescriptionByCodeAsync(code);
        if (result == null)
            return NotFound(new { message = $"Không tìm thấy đơn thuốc với mã '{code.Trim()}'" });
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết đơn thuốc
    /// </summary>
    [HttpGet("prescriptions/{id}")]
    public async Task<ActionResult<PrescriptionFullDto>> GetPrescriptionById(Guid id)
    {
        var result = await _examinationService.GetPrescriptionByIdAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Tạo đơn thuốc
    /// </summary>
    [HttpPost("prescriptions")]
    public async Task<ActionResult<PrescriptionFullDto>> CreatePrescription([FromBody] CreateExaminationPrescriptionDto dto)
    {
        var result = await _examinationService.CreatePrescriptionAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật đơn thuốc
    /// </summary>
    [HttpPut("prescriptions/{id}")]
    public async Task<ActionResult<PrescriptionFullDto>> UpdatePrescription(Guid id, [FromBody] CreateExaminationPrescriptionDto dto)
    {
        var result = await _examinationService.UpdatePrescriptionAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa đơn thuốc
    /// </summary>
    [HttpDelete("prescriptions/{id}")]
    public async Task<ActionResult<bool>> DeletePrescription(Guid id)
    {
        var result = await _examinationService.DeletePrescriptionAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm thuốc
    /// </summary>
    [HttpGet("medicines/search")]
    public async Task<ActionResult<List<MedicineDto>>> SearchMedicines(
        [FromQuery] string keyword,
        [FromQuery] Guid? warehouseId = null,
        [FromQuery] int limit = 20)
    {
        var result = await _examinationService.SearchMedicinesAsync(keyword, warehouseId, limit);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin thuốc với tồn kho
    /// </summary>
    [HttpGet("medicines/{medicineId}")]
    public async Task<ActionResult<MedicineDto>> GetMedicineWithStock(Guid medicineId, [FromQuery] Guid? warehouseId = null)
    {
        var result = await _examinationService.GetMedicineWithStockAsync(medicineId, warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thuốc theo nhóm
    /// </summary>
    [HttpGet("medicines/group/{groupId}")]
    public async Task<ActionResult<List<MedicineDto>>> GetMedicinesByGroup(Guid groupId)
    {
        var result = await _examinationService.GetMedicinesByGroupAsync(groupId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra tương tác thuốc
    /// </summary>
    [HttpPost("check-drug-interactions")]
    public async Task<ActionResult<List<DrugInteractionDto>>> CheckDrugInteractions([FromBody] List<Guid> medicineIds)
    {
        var result = await _examinationService.CheckDrugInteractionsAsync(medicineIds);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra dị ứng thuốc
    /// </summary>
    [HttpPost("patient/{patientId}/check-drug-allergies")]
    public async Task<ActionResult<List<PrescriptionWarningDto>>> CheckDrugAllergies(Guid patientId, [FromBody] List<Guid> medicineIds)
    {
        var result = await _examinationService.CheckDrugAllergiesAsync(patientId, medicineIds);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra chống chỉ định
    /// </summary>
    [HttpPost("patient/{patientId}/check-contraindications")]
    public async Task<ActionResult<List<PrescriptionWarningDto>>> CheckContraindications(Guid patientId, [FromBody] List<Guid> medicineIds)
    {
        var result = await _examinationService.CheckContraindicationsAsync(patientId, medicineIds);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trùng thuốc trong ngày
    /// </summary>
    [HttpPost("patient/{patientId}/check-duplicate-medicines")]
    public async Task<ActionResult<List<PrescriptionWarningDto>>> CheckDuplicateMedicines(
        Guid patientId,
        [FromBody] List<Guid> medicineIds,
        [FromQuery] DateTime? date = null)
    {
        var result = await _examinationService.CheckDuplicateMedicinesAsync(patientId, medicineIds, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra quy định BHYT
    /// </summary>
    [HttpPost("{examinationId}/validate-bhyt-prescription")]
    public async Task<ActionResult<List<PrescriptionWarningDto>>> ValidateBhytPrescription(Guid examinationId, [FromBody] CreateExaminationPrescriptionDto dto)
    {
        var result = await _examinationService.ValidateBhytPrescriptionAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách mẫu đơn thuốc
    /// </summary>
    [HttpGet("templates/prescription")]
    public async Task<ActionResult<List<ExaminationPrescriptionTemplateDto>>> GetPrescriptionTemplates([FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetPrescriptionTemplatesAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo mẫu đơn thuốc
    /// </summary>
    [HttpPost("templates/prescription")]
    public async Task<ActionResult<ExaminationPrescriptionTemplateDto>> CreatePrescriptionTemplate([FromBody] ExaminationPrescriptionTemplateDto dto)
    {
        var result = await _examinationService.CreatePrescriptionTemplateAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật mẫu đơn thuốc
    /// </summary>
    [HttpPut("templates/prescription/{id}")]
    public async Task<ActionResult<ExaminationPrescriptionTemplateDto>> UpdatePrescriptionTemplate(Guid id, [FromBody] ExaminationPrescriptionTemplateDto dto)
    {
        var result = await _examinationService.UpdatePrescriptionTemplateAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa mẫu đơn thuốc
    /// </summary>
    [HttpDelete("templates/prescription/{id}")]
    public async Task<ActionResult<bool>> DeletePrescriptionTemplate(Guid id)
    {
        var result = await _examinationService.DeletePrescriptionTemplateAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng mẫu đơn thuốc
    /// </summary>
    [HttpPost("{examinationId}/apply-prescription-template/{templateId}")]
    public async Task<ActionResult<PrescriptionFullDto>> ApplyPrescriptionTemplate(Guid examinationId, Guid templateId)
    {
        var result = await _examinationService.ApplyPrescriptionTemplateAsync(examinationId, templateId);
        return Ok(result);
    }

    /// <summary>
    /// Lưu đơn thuốc thành mẫu
    /// </summary>
    [HttpPost("prescriptions/{prescriptionId}/save-as-template")]
    public async Task<ActionResult<ExaminationPrescriptionTemplateDto>> SaveAsPrescriptionTemplate(Guid prescriptionId, [FromBody] SaveAsTemplateRequest request)
    {
        var result = await _examinationService.SaveAsPrescriptionTemplateAsync(prescriptionId, request.TemplateName);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thư viện lời dặn
    /// </summary>
    [HttpGet("instruction-library")]
    public async Task<ActionResult<List<InstructionLibraryDto>>> GetInstructionLibrary([FromQuery] string? category = null)
    {
        var result = await _examinationService.GetInstructionLibraryAsync(category);
        return Ok(result);
    }

    /// <summary>
    /// Thêm lời dặn vào thư viện
    /// </summary>
    [HttpPost("instruction-library")]
    public async Task<ActionResult<InstructionLibraryDto>> AddInstruction([FromBody] InstructionLibraryDto dto)
    {
        var result = await _examinationService.AddInstructionAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa lời dặn
    /// </summary>
    [HttpDelete("instruction-library/{id}")]
    public async Task<ActionResult<bool>> DeleteInstruction(Guid id)
    {
        var result = await _examinationService.DeleteInstructionAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thuốc thường dùng
    /// </summary>
    [HttpGet("medicines/frequent")]
    public async Task<ActionResult<List<MedicineDto>>> GetFrequentMedicines([FromQuery] int limit = 20)
    {
        var doctorId = GetCurrentUserId();
        var result = await _examinationService.GetFrequentMedicinesAsync(doctorId, limit);
        return Ok(result);
    }

    /// <summary>
    /// In đơn thuốc
    /// </summary>
    [HttpGet("prescriptions/{prescriptionId}/print")]
    public async Task<ActionResult> PrintPrescription(Guid prescriptionId)
    {
        var result = await _examinationService.PrintPrescriptionAsync(prescriptionId);
        return File(result, "application/pdf", $"DonThuoc_{prescriptionId}.pdf");
    }

    /// <summary>
    /// In đơn thuốc ngoài
    /// </summary>
    [HttpGet("prescriptions/{prescriptionId}/print-external")]
    public async Task<ActionResult> PrintExternalPrescription(Guid prescriptionId)
    {
        var result = await _examinationService.PrintExternalPrescriptionAsync(prescriptionId);
        return File(result, "application/pdf", $"DonThuocNgoai_{prescriptionId}.pdf");
    }

    /// <summary>
    /// Sao chép đơn thuốc từ lịch sử
    /// </summary>
    [HttpPost("{examinationId}/copy-prescription/{sourcePrescriptionId}")]
    public async Task<ActionResult<PrescriptionFullDto>> CopyPrescriptionFromHistory(Guid examinationId, Guid sourcePrescriptionId)
    {
        var result = await _examinationService.CopyPrescriptionFromHistoryAsync(examinationId, sourcePrescriptionId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách kho xuất thuốc
    /// </summary>
    [HttpGet("dispensary-warehouses")]
    public async Task<ActionResult<List<ExamWarehouseDto>>> GetDispensaryWarehouses()
    {
        var result = await _examinationService.GetDispensaryWarehousesAsync();
        return Ok(result);
    }
}
