using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Dtos.InpatientComplete;

namespace HIS.API.Controllers;

public partial class InpatientCompleteController
{
    #region 3.5 Chỉ định dinh dưỡng

    /// <summary>
    /// Tạo chỉ định suất ăn
    /// </summary>
    [HttpPost("nutrition-orders")]
    public async Task<ActionResult<NutritionOrderDto>> CreateNutritionOrder([FromBody] CreateNutritionOrderDto dto)
    {
        var result = await _inpatientService.CreateNutritionOrderAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chỉ định suất ăn
    /// </summary>
    [HttpPut("nutrition-orders/{id}")]
    public async Task<ActionResult<NutritionOrderDto>> UpdateNutritionOrder(Guid id, [FromBody] CreateNutritionOrderDto dto)
    {
        var result = await _inpatientService.UpdateNutritionOrderAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa chỉ định suất ăn (soft-delete)
    /// </summary>
    [HttpDelete("nutrition-orders/{id}")]
    public async Task<ActionResult> DeleteNutritionOrder(Guid id)
    {
        await _inpatientService.DeleteNutritionOrderAsync(id, GetCurrentUserId());
        return Ok(new { success = true });
    }

    /// <summary>
    /// Lấy danh sách chỉ định suất ăn
    /// </summary>
    [HttpGet("nutrition-orders")]
    public async Task<ActionResult<List<NutritionOrderDto>>> GetNutritionOrders([FromQuery] Guid? admissionId, [FromQuery] Guid? departmentId, [FromQuery] DateTime date)
    {
        var result = await _inpatientService.GetNutritionOrdersAsync(admissionId, departmentId, date);
        return Ok(result);
    }

    /// <summary>
    /// Tổng hợp suất ăn
    /// </summary>
    [HttpGet("nutrition-summary/{departmentId}")]
    public async Task<ActionResult<NutritionSummaryDto>> GetNutritionSummary(Guid departmentId, [FromQuery] DateTime date)
    {
        var result = await _inpatientService.GetNutritionSummaryAsync(departmentId, date);
        return Ok(result);
    }

    /// <summary>
    /// In phiếu tổng hợp suất ăn
    /// </summary>
    [HttpGet("print-nutrition-summary/{departmentId}")]
    public async Task<ActionResult> PrintNutritionSummary(Guid departmentId, [FromQuery] DateTime date)
    {
        var pdfBytes = await _inpatientService.PrintNutritionSummaryAsync(departmentId, date);
        return File(pdfBytes, "application/pdf", "nutrition-summary.pdf");
    }

    #endregion

    #region 3.6 Thông tin điều trị

    /// <summary>
    /// Tạo tờ điều trị
    /// </summary>
    [HttpPost("treatment-sheets")]
    public async Task<ActionResult<TreatmentSheetDto>> CreateTreatmentSheet([FromBody] CreateTreatmentSheetDto dto)
    {
        var result = await _inpatientService.CreateTreatmentSheetAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật tờ điều trị
    /// </summary>
    [HttpPut("treatment-sheets/{id}")]
    public async Task<ActionResult<TreatmentSheetDto>> UpdateTreatmentSheet(Guid id, [FromBody] CreateTreatmentSheetDto dto)
    {
        var result = await _inpatientService.UpdateTreatmentSheetAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách tờ điều trị
    /// </summary>
    [HttpGet("treatment-sheets")]
    public async Task<ActionResult<List<TreatmentSheetDto>>> GetTreatmentSheets([FromQuery] TreatmentSheetSearchDto searchDto)
    {
        var result = await _inpatientService.GetTreatmentSheetsAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// In tờ điều trị
    /// </summary>
    [HttpGet("print-treatment-sheet/{id}")]
    public async Task<ActionResult> PrintTreatmentSheet(Guid id)
    {
        var pdfBytes = await _inpatientService.PrintTreatmentSheetAsync(id);
        return File(pdfBytes, "application/pdf", "treatment-sheet.pdf");
    }

    /// <summary>
    /// Khai báo sinh tồn
    /// </summary>
    [HttpPost("vital-signs")]
    public async Task<ActionResult<VitalSignsRecordDto>> CreateVitalSigns([FromBody] CreateVitalSignsDto dto)
    {
        var result = await _inpatientService.CreateVitalSignsAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách sinh tồn
    /// </summary>
    [HttpGet("vital-signs/{admissionId}")]
    public async Task<ActionResult<List<VitalSignsRecordDto>>> GetVitalSignsList(Guid admissionId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetVitalSignsListAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lấy biểu đồ sinh tồn
    /// </summary>
    [HttpGet("vital-signs-chart/{admissionId}")]
    public async Task<ActionResult<VitalSignsChartDto>> GetVitalSignsChart(Guid admissionId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var result = await _inpatientService.GetVitalSignsChartAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Mời hội chẩn
    /// </summary>
    [HttpPost("consultations")]
    public async Task<ActionResult<ConsultationDto>> CreateConsultation([FromBody] CreateConsultationDto dto)
    {
        var result = await _inpatientService.CreateConsultationAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách hội chẩn
    /// </summary>
    [HttpGet("consultations")]
    public async Task<ActionResult<List<ConsultationDto>>> GetConsultations([FromQuery] Guid? admissionId, [FromQuery] Guid? departmentId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetConsultationsAsync(admissionId, departmentId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành hội chẩn
    /// </summary>
    [HttpPost("consultations/{id}/complete")]
    public async Task<ActionResult<ConsultationDto>> CompleteConsultation(Guid id, [FromBody] CompleteConsultationRequest request)
    {
        var result = await _inpatientService.CompleteConsultationAsync(id, request.Conclusion, request.Treatment, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// In biên bản hội chẩn
    /// </summary>
    [HttpGet("print-consultation/{id}")]
    public async Task<ActionResult> PrintConsultation(Guid id)
    {
        var pdfBytes = await _inpatientService.PrintConsultationAsync(id);
        return File(pdfBytes, "application/pdf", "consultation.pdf");
    }

    /// <summary>
    /// F1.4: Lãnh đạo duyệt / từ chối hội chẩn thuốc dấu * (ConsultationType=3)
    /// Decision: 2=Duyệt, 3=Từ chối
    /// </summary>
    [HttpPost("consultations/{id}/approve")]
    public async Task<ActionResult<ConsultationDto>> ApproveConsultation(Guid id, [FromBody] ApproveConsultationRequest request)
    {
        var result = await _inpatientService.ApproveConsultationAsync(id, request.Decision, request.Note, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu chăm sóc
    /// </summary>
    [HttpPost("nursing-care-sheets")]
    public async Task<ActionResult<NursingCareSheetDto>> CreateNursingCareSheet([FromBody] CreateNursingCareSheetDto dto)
    {
        var result = await _inpatientService.CreateNursingCareSheetAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiếu chăm sóc
    /// </summary>
    [HttpGet("nursing-care-sheets/{admissionId}")]
    public async Task<ActionResult<List<NursingCareSheetDto>>> GetNursingCareSheets(Guid admissionId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetNursingCareSheetsAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu truyền dịch
    /// </summary>
    [HttpPost("infusion-records")]
    public async Task<ActionResult<InfusionRecordDto>> CreateInfusionRecord([FromBody] CreateInfusionRecordDto dto)
    {
        var result = await _inpatientService.CreateInfusionRecordAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành truyền dịch
    /// </summary>
    [HttpPost("infusion-records/{id}/complete")]
    public async Task<ActionResult<InfusionRecordDto>> CompleteInfusion(Guid id, [FromBody] DateTime endTime)
    {
        var result = await _inpatientService.CompleteInfusionAsync(id, endTime, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tính thời gian kết thúc truyền dịch
    /// </summary>
    [HttpGet("calculate-infusion-end")]
    public async Task<ActionResult<DateTime>> CalculateInfusionEndTime([FromQuery] int volumeMl, [FromQuery] int dropRate)
    {
        var result = await _inpatientService.CalculateInfusionEndTimeAsync(volumeMl, dropRate);
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu truyền máu
    /// </summary>
    [HttpPost("blood-transfusions")]
    public async Task<ActionResult<BloodTransfusionDto>> CreateBloodTransfusion([FromBody] CreateBloodTransfusionDto dto)
    {
        var result = await _inpatientService.CreateBloodTransfusionAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Ghi nhận phản ứng truyền máu
    /// </summary>
    [HttpPost("blood-transfusions/{id}/reaction")]
    public async Task<ActionResult<BloodTransfusionDto>> RecordTransfusionReaction(Guid id, [FromBody] string reactionDetails)
    {
        var result = await _inpatientService.RecordTransfusionReactionAsync(id, reactionDetails, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Ghi nhận phản ứng thuốc
    /// </summary>
    [HttpPost("drug-reactions")]
    public async Task<ActionResult<DrugReactionRecordDto>> CreateDrugReactionRecord([FromBody] CreateDrugReactionRequest request)
    {
        var result = await _inpatientService.CreateDrugReactionRecordAsync(request.AdmissionId, request.MedicineId, request.MedicineName, request.Severity, request.Symptoms, request.Treatment, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phản ứng thuốc
    /// </summary>
    [HttpGet("drug-reactions/{admissionId}")]
    public async Task<ActionResult<List<DrugReactionRecordDto>>> GetDrugReactionRecords(Guid admissionId)
    {
        var result = await _inpatientService.GetDrugReactionRecordsAsync(admissionId);
        return Ok(result);
    }

    #endregion

    #region 3.6.x Sơ sinh nội trú (#50-54)

    /// <summary>
    /// Tạo hồ sơ trẻ sơ sinh
    /// </summary>
    [HttpPost("{motherAdmissionId:guid}/newborns")]
    public async Task<ActionResult<NewbornRecordDto>> CreateNewbornRecord(Guid motherAdmissionId, [FromBody] NewbornRecordDto dto)
    {
        var result = await _inpatientService.CreateNewbornRecordAsync(motherAdmissionId, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách trẻ sơ sinh theo admission mẹ
    /// </summary>
    [HttpGet("{motherAdmissionId:guid}/newborns")]
    public async Task<ActionResult<List<NewbornRecordDto>>> GetNewbornRecords(Guid motherAdmissionId)
    {
        var result = await _inpatientService.GetNewbornRecordsAsync(motherAdmissionId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật hồ sơ trẻ sơ sinh
    /// </summary>
    [HttpPut("newborns/{id:guid}")]
    public async Task<ActionResult<NewbornRecordDto>> UpdateNewbornRecord(Guid id, [FromBody] NewbornRecordDto dto)
    {
        var result = await _inpatientService.UpdateNewbornRecordAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xuất trẻ sơ sinh
    /// </summary>
    [HttpPut("newborns/{id:guid}/discharge")]
    public async Task<ActionResult<NewbornRecordDto>> DischargeNewbornRecord(Guid id, [FromBody] DischargeNewbornRequest req)
    {
        var result = await _inpatientService.DischargeNewbornRecordAsync(id, req.DischargeDate, GetCurrentUserId());
        return Ok(result);
    }

    #endregion

    #region 3.6.y Chạy thận nhân tạo (#148)

    /// <summary>
    /// Tạo phiếu theo dõi buổi chạy thận
    /// </summary>
    [HttpPost("{admissionId:guid}/hemodialysis")]
    public async Task<ActionResult<HemodialysisSessionDto>> CreateHemodialysisSession(Guid admissionId, [FromBody] HemodialysisSessionDto dto)
    {
        var result = await _inpatientService.CreateHemodialysisSessionAsync(admissionId, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách buổi chạy thận theo admission
    /// </summary>
    [HttpGet("{admissionId:guid}/hemodialysis")]
    public async Task<ActionResult<List<HemodialysisSessionDto>>> GetHemodialysisSessions(Guid admissionId)
    {
        var result = await _inpatientService.GetHemodialysisSessionsAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật phiếu theo dõi buổi chạy thận
    /// </summary>
    [HttpPut("hemodialysis/{id:guid}")]
    public async Task<ActionResult<HemodialysisSessionDto>> UpdateHemodialysisSession(Guid id, [FromBody] HemodialysisSessionDto dto)
    {
        var result = await _inpatientService.UpdateHemodialysisSessionAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa phiếu theo dõi buổi chạy thận
    /// </summary>
    [HttpDelete("hemodialysis/{id:guid}")]
    public async Task<IActionResult> DeleteHemodialysisSession(Guid id)
    {
        await _inpatientService.DeleteHemodialysisSessionAsync(id, GetCurrentUserId());
        return NoContent();
    }

    #endregion
}
