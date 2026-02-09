using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using RoomDto = HIS.Application.DTOs.RoomDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;

namespace HIS.API.Controllers;

/// <summary>
/// Controller đầy đủ cho Phân hệ 2: Khám bệnh OPD
/// Bao gồm tất cả 180+ chức năng theo yêu cầu
/// </summary>
[Authorize]
[ApiController]
[Route("api/examination")]
public class ExaminationCompleteController : ControllerBase
{
    private readonly IExaminationCompleteService _examinationService;

    public ExaminationCompleteController(IExaminationCompleteService examinationService)
    {
        _examinationService = examinationService;
    }

    #region 2.1 Màn hình chờ phòng khám

    /// <summary>
    /// Lấy thông tin hiển thị màn hình chờ của phòng khám
    /// </summary>
    [HttpGet("waiting-room/{roomId}")]
    [AllowAnonymous] // Màn hình chờ có thể public
    public async Task<ActionResult<WaitingRoomDisplayDto>> GetWaitingRoomDisplay(Guid roomId)
    {
        var result = await _examinationService.GetWaitingRoomDisplayAsync(roomId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách màn hình chờ tất cả phòng khám của khoa
    /// </summary>
    [HttpGet("waiting-rooms/department/{departmentId}")]
    [AllowAnonymous]
    public async Task<ActionResult<List<WaitingRoomDisplayDto>>> GetDepartmentWaitingRoomDisplays(Guid departmentId)
    {
        var result = await _examinationService.GetDepartmentWaitingRoomDisplaysAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật cấu hình hiển thị màn hình chờ
    /// </summary>
    [HttpPut("waiting-room/{roomId}/config")]
    public async Task<ActionResult<bool>> UpdateWaitingRoomDisplayConfig(Guid roomId, [FromBody] WaitingRoomDisplayConfigDto config)
    {
        var result = await _examinationService.UpdateWaitingRoomDisplayConfigAsync(roomId, config);
        return Ok(result);
    }

    /// <summary>
    /// Gọi bệnh nhân tiếp theo
    /// </summary>
    [HttpPost("waiting-room/{roomId}/call-next")]
    public async Task<ActionResult<CallingPatientDto>> CallNextPatient(Guid roomId)
    {
        var result = await _examinationService.CallNextPatientAsync(roomId);
        return Ok(result);
    }

    /// <summary>
    /// Gọi lại bệnh nhân
    /// </summary>
    [HttpPost("{examinationId}/recall")]
    public async Task<ActionResult<CallingPatientDto>> RecallPatient(Guid examinationId)
    {
        var result = await _examinationService.RecallPatientAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Bỏ qua bệnh nhân (chuyển xuống cuối hàng đợi)
    /// </summary>
    [HttpPost("{examinationId}/skip")]
    public async Task<ActionResult<bool>> SkipPatient(Guid examinationId)
    {
        var result = await _examinationService.SkipPatientAsync(examinationId);
        return Ok(result);
    }

    #endregion

    #region 2.2 Danh sách bệnh nhân phòng khám

    /// <summary>
    /// Lấy danh sách bệnh nhân trong phòng khám
    /// </summary>
    [HttpGet("room/{roomId}/patients")]
    public async Task<ActionResult<List<RoomPatientListDto>>> GetRoomPatientList(
        Guid roomId,
        [FromQuery] DateTime? date = null,
        [FromQuery] int? status = null)
    {
        var result = await _examinationService.GetRoomPatientListAsync(roomId, date ?? DateTime.Today, status);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm bệnh nhân trong phòng khám
    /// </summary>
    [HttpGet("room/{roomId}/patients/search")]
    public async Task<ActionResult<List<RoomPatientListDto>>> SearchRoomPatients(
        Guid roomId,
        [FromQuery] string keyword,
        [FromQuery] DateTime? date = null)
    {
        var result = await _examinationService.SearchRoomPatientsAsync(roomId, keyword, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// Lọc bệnh nhân theo trạng thái đặc biệt
    /// </summary>
    [HttpPost("room/{roomId}/patients/filter")]
    public async Task<ActionResult<List<RoomPatientListDto>>> FilterPatientsByCondition(
        Guid roomId,
        [FromBody] PatientFilterDto filter)
    {
        var result = await _examinationService.FilterPatientsByConditionAsync(roomId, filter);
        return Ok(result);
    }

    /// <summary>
    /// Lấy kết quả CLS của bệnh nhân
    /// </summary>
    [HttpGet("{examinationId}/lab-results")]
    public async Task<ActionResult<PatientLabResultsDto>> GetPatientLabResults(Guid examinationId)
    {
        var result = await _examinationService.GetPatientLabResultsAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trạng thái CLS đang chờ
    /// </summary>
    [HttpGet("{examinationId}/pending-labs")]
    public async Task<ActionResult<List<LabStatusDto>>> GetPendingLabStatus(Guid examinationId)
    {
        var result = await _examinationService.GetPendingLabStatusAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy ảnh chân dung bệnh nhân
    /// </summary>
    [HttpGet("patient/{patientId}/photo")]
    public async Task<ActionResult<string>> GetPatientPhoto(Guid patientId)
    {
        var result = await _examinationService.GetPatientPhotoAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật ảnh chân dung bệnh nhân
    /// </summary>
    [HttpPut("patient/{patientId}/photo")]
    public async Task<ActionResult<bool>> UpdatePatientPhoto(Guid patientId, [FromBody] UpdatePhotoRequest request)
    {
        var result = await _examinationService.UpdatePatientPhotoAsync(patientId, request.PhotoBase64);
        return Ok(result);
    }

    #endregion

    #region 2.3 Chức năng khám bệnh

    /// <summary>
    /// Lấy hồ sơ bệnh án đầy đủ
    /// </summary>
    [HttpGet("{examinationId}/medical-record")]
    public async Task<ActionResult<MedicalRecordFullDto>> GetMedicalRecordFull(Guid examinationId)
    {
        var result = await _examinationService.GetMedicalRecordFullAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Bắt đầu khám bệnh
    /// </summary>
    [HttpPost("{examinationId}/start")]
    public async Task<ActionResult<ExaminationDto>> StartExamination(Guid examinationId)
    {
        var doctorId = GetCurrentUserId();
        var result = await _examinationService.StartExaminationAsync(examinationId, doctorId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật dấu hiệu sinh tồn
    /// </summary>
    [HttpPut("{examinationId}/vital-signs")]
    public async Task<ActionResult<VitalSignsFullDto>> UpdateVitalSigns(Guid examinationId, [FromBody] VitalSignsFullDto dto)
    {
        var result = await _examinationService.UpdateVitalSignsAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy dấu hiệu sinh tồn
    /// </summary>
    [HttpGet("{examinationId}/vital-signs")]
    public async Task<ActionResult<VitalSignsFullDto>> GetVitalSigns(Guid examinationId)
    {
        var result = await _examinationService.GetVitalSignsAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Tính BMI
    /// </summary>
    [HttpGet("calculate-bmi")]
    public async Task<ActionResult<BmiCalculationResult>> CalculateBmi([FromQuery] decimal weight, [FromQuery] decimal height)
    {
        var result = await _examinationService.CalculateBmiAsync(weight, height);
        return Ok(result);
    }

    /// <summary>
    /// Phân loại huyết áp
    /// </summary>
    [HttpGet("classify-blood-pressure")]
    public async Task<ActionResult<string>> ClassifyBloodPressure([FromQuery] int systolic, [FromQuery] int diastolic)
    {
        var result = await _examinationService.ClassifyBloodPressureAsync(systolic, diastolic);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin hỏi bệnh
    /// </summary>
    [HttpPut("{examinationId}/medical-interview")]
    public async Task<ActionResult<MedicalInterviewDto>> UpdateMedicalInterview(Guid examinationId, [FromBody] MedicalInterviewDto dto)
    {
        var result = await _examinationService.UpdateMedicalInterviewAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin hỏi bệnh
    /// </summary>
    [HttpGet("{examinationId}/medical-interview")]
    public async Task<ActionResult<MedicalInterviewDto>> GetMedicalInterview(Guid examinationId)
    {
        var result = await _examinationService.GetMedicalInterviewAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật khám toàn thân
    /// </summary>
    [HttpPut("{examinationId}/physical-examination")]
    public async Task<ActionResult<PhysicalExaminationDto>> UpdatePhysicalExamination(Guid examinationId, [FromBody] PhysicalExaminationDto dto)
    {
        var result = await _examinationService.UpdatePhysicalExaminationAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin khám toàn thân
    /// </summary>
    [HttpGet("{examinationId}/physical-examination")]
    public async Task<ActionResult<PhysicalExaminationDto>> GetPhysicalExamination(Guid examinationId)
    {
        var result = await _examinationService.GetPhysicalExaminationAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách mẫu thăm khám
    /// </summary>
    [HttpGet("templates/examination")]
    public async Task<ActionResult<List<ExaminationTemplateDto>>> GetExaminationTemplates(
        [FromQuery] Guid? departmentId = null,
        [FromQuery] int? templateType = null)
    {
        var result = await _examinationService.GetExaminationTemplatesAsync(departmentId, templateType);
        return Ok(result);
    }

    /// <summary>
    /// Tạo mẫu thăm khám mới
    /// </summary>
    [HttpPost("templates/examination")]
    public async Task<ActionResult<ExaminationTemplateDto>> CreateExaminationTemplate([FromBody] ExaminationTemplateDto dto)
    {
        var result = await _examinationService.CreateExaminationTemplateAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật mẫu thăm khám
    /// </summary>
    [HttpPut("templates/examination/{id}")]
    public async Task<ActionResult<ExaminationTemplateDto>> UpdateExaminationTemplate(Guid id, [FromBody] ExaminationTemplateDto dto)
    {
        var result = await _examinationService.UpdateExaminationTemplateAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa mẫu thăm khám
    /// </summary>
    [HttpDelete("templates/examination/{id}")]
    public async Task<ActionResult<bool>> DeleteExaminationTemplate(Guid id)
    {
        var result = await _examinationService.DeleteExaminationTemplateAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng mẫu thăm khám
    /// </summary>
    [HttpPost("{examinationId}/apply-template/{templateId}")]
    public async Task<ActionResult<PhysicalExaminationDto>> ApplyExaminationTemplate(Guid examinationId, Guid templateId)
    {
        var result = await _examinationService.ApplyExaminationTemplateAsync(examinationId, templateId);
        return Ok(result);
    }

    /// <summary>
    /// Lưu khám hiện tại thành mẫu
    /// </summary>
    [HttpPost("{examinationId}/save-as-template")]
    public async Task<ActionResult<ExaminationTemplateDto>> SaveAsExaminationTemplate(Guid examinationId, [FromBody] SaveAsTemplateRequest request)
    {
        var result = await _examinationService.SaveAsExaminationTemplateAsync(examinationId, request.TemplateName);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách dị ứng của bệnh nhân
    /// </summary>
    [HttpGet("patient/{patientId}/allergies")]
    public async Task<ActionResult<List<AllergyDto>>> GetPatientAllergies(Guid patientId)
    {
        var result = await _examinationService.GetPatientAllergiesAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// Thêm dị ứng
    /// </summary>
    [HttpPost("patient/{patientId}/allergies")]
    public async Task<ActionResult<AllergyDto>> AddPatientAllergy(Guid patientId, [FromBody] AllergyDto dto)
    {
        dto.PatientId = patientId;
        var result = await _examinationService.AddPatientAllergyAsync(patientId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật dị ứng
    /// </summary>
    [HttpPut("allergies/{id}")]
    public async Task<ActionResult<AllergyDto>> UpdatePatientAllergy(Guid id, [FromBody] AllergyDto dto)
    {
        var result = await _examinationService.UpdatePatientAllergyAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa dị ứng
    /// </summary>
    [HttpDelete("allergies/{id}")]
    public async Task<ActionResult<bool>> DeletePatientAllergy(Guid id)
    {
        var result = await _examinationService.DeletePatientAllergyAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách chống chỉ định
    /// </summary>
    [HttpGet("patient/{patientId}/contraindications")]
    public async Task<ActionResult<List<ContraindicationDto>>> GetPatientContraindications(Guid patientId)
    {
        var result = await _examinationService.GetPatientContraindicationsAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// Thêm chống chỉ định
    /// </summary>
    [HttpPost("patient/{patientId}/contraindications")]
    public async Task<ActionResult<ContraindicationDto>> AddPatientContraindication(Guid patientId, [FromBody] ContraindicationDto dto)
    {
        dto.PatientId = patientId;
        var result = await _examinationService.AddPatientContraindicationAsync(patientId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chống chỉ định
    /// </summary>
    [HttpPut("contraindications/{id}")]
    public async Task<ActionResult<ContraindicationDto>> UpdatePatientContraindication(Guid id, [FromBody] ContraindicationDto dto)
    {
        var result = await _examinationService.UpdatePatientContraindicationAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa chống chỉ định
    /// </summary>
    [HttpDelete("contraindications/{id}")]
    public async Task<ActionResult<bool>> DeletePatientContraindication(Guid id)
    {
        var result = await _examinationService.DeletePatientContraindicationAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Lấy lịch sử khám bệnh
    /// </summary>
    [HttpGet("patient/{patientId}/history")]
    public async Task<ActionResult<List<MedicalHistoryDto>>> GetPatientMedicalHistory(Guid patientId, [FromQuery] int limit = 20)
    {
        var result = await _examinationService.GetPatientMedicalHistoryAsync(patientId, limit);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết một lần khám trong lịch sử
    /// </summary>
    [HttpGet("history/{examinationId}/detail")]
    public async Task<ActionResult<MedicalRecordFullDto>> GetMedicalHistoryDetail(Guid examinationId)
    {
        var result = await _examinationService.GetMedicalHistoryDetailAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Xem ảnh CĐHA trong lịch sử
    /// </summary>
    [HttpGet("history/imaging/{orderId}/images")]
    public async Task<ActionResult<List<string>>> GetHistoryImagingImages(Guid orderId)
    {
        var result = await _examinationService.GetHistoryImagingImagesAsync(orderId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo tờ điều trị
    /// </summary>
    [HttpPost("treatment-sheets")]
    public async Task<ActionResult<TreatmentSheetDto>> CreateTreatmentSheet([FromBody] TreatmentSheetDto dto)
    {
        var result = await _examinationService.CreateTreatmentSheetAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật tờ điều trị
    /// </summary>
    [HttpPut("treatment-sheets/{id}")]
    public async Task<ActionResult<TreatmentSheetDto>> UpdateTreatmentSheet(Guid id, [FromBody] TreatmentSheetDto dto)
    {
        var result = await _examinationService.UpdateTreatmentSheetAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách tờ điều trị
    /// </summary>
    [HttpGet("{examinationId}/treatment-sheets")]
    public async Task<ActionResult<List<TreatmentSheetDto>>> GetTreatmentSheets(Guid examinationId)
    {
        var result = await _examinationService.GetTreatmentSheetsAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo biên bản hội chẩn
    /// </summary>
    [HttpPost("consultations")]
    public async Task<ActionResult<ConsultationRecordDto>> CreateConsultationRecord([FromBody] ConsultationRecordDto dto)
    {
        var result = await _examinationService.CreateConsultationRecordAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật biên bản hội chẩn
    /// </summary>
    [HttpPut("consultations/{id}")]
    public async Task<ActionResult<ConsultationRecordDto>> UpdateConsultationRecord(Guid id, [FromBody] ConsultationRecordDto dto)
    {
        var result = await _examinationService.UpdateConsultationRecordAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách biên bản hội chẩn
    /// </summary>
    [HttpGet("{examinationId}/consultations")]
    public async Task<ActionResult<List<ConsultationRecordDto>>> GetConsultationRecords(Guid examinationId)
    {
        var result = await _examinationService.GetConsultationRecordsAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu chăm sóc
    /// </summary>
    [HttpPost("nursing-care")]
    public async Task<ActionResult<NursingCareSheetDto>> CreateNursingCareSheet([FromBody] NursingCareSheetDto dto)
    {
        var result = await _examinationService.CreateNursingCareSheetAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật phiếu chăm sóc
    /// </summary>
    [HttpPut("nursing-care/{id}")]
    public async Task<ActionResult<NursingCareSheetDto>> UpdateNursingCareSheet(Guid id, [FromBody] NursingCareSheetDto dto)
    {
        var result = await _examinationService.UpdateNursingCareSheetAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiếu chăm sóc
    /// </summary>
    [HttpGet("{examinationId}/nursing-care")]
    public async Task<ActionResult<List<NursingCareSheetDto>>> GetNursingCareSheets(Guid examinationId)
    {
        var result = await _examinationService.GetNursingCareSheetsAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin tai nạn thương tích
    /// </summary>
    [HttpPut("{examinationId}/injury-info")]
    public async Task<ActionResult<InjuryInfoDto>> UpdateInjuryInfo(Guid examinationId, [FromBody] InjuryInfoDto dto)
    {
        var result = await _examinationService.UpdateInjuryInfoAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin tai nạn thương tích
    /// </summary>
    [HttpGet("{examinationId}/injury-info")]
    public async Task<ActionResult<InjuryInfoDto>> GetInjuryInfo(Guid examinationId)
    {
        var result = await _examinationService.GetInjuryInfoAsync(examinationId);
        return Ok(result);
    }

    #endregion

    #region 2.4 Chẩn đoán

    /// <summary>
    /// Lấy danh sách chẩn đoán
    /// </summary>
    [HttpGet("{examinationId}/diagnoses")]
    public async Task<ActionResult<List<DiagnosisFullDto>>> GetDiagnoses(Guid examinationId)
    {
        var result = await _examinationService.GetDiagnosesAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Thêm chẩn đoán
    /// </summary>
    [HttpPost("{examinationId}/diagnoses")]
    public async Task<ActionResult<DiagnosisFullDto>> AddDiagnosis(Guid examinationId, [FromBody] DiagnosisFullDto dto)
    {
        dto.ExaminationId = examinationId;
        var result = await _examinationService.AddDiagnosisAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chẩn đoán
    /// </summary>
    [HttpPut("diagnoses/{diagnosisId}")]
    public async Task<ActionResult<DiagnosisFullDto>> UpdateDiagnosis(Guid diagnosisId, [FromBody] DiagnosisFullDto dto)
    {
        var result = await _examinationService.UpdateDiagnosisAsync(diagnosisId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa chẩn đoán
    /// </summary>
    [HttpDelete("diagnoses/{diagnosisId}")]
    public async Task<ActionResult<bool>> DeleteDiagnosis(Guid diagnosisId)
    {
        var result = await _examinationService.DeleteDiagnosisAsync(diagnosisId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật toàn bộ danh sách chẩn đoán
    /// </summary>
    [HttpPut("{examinationId}/diagnoses/batch")]
    public async Task<ActionResult<List<DiagnosisFullDto>>> UpdateDiagnosisList(Guid examinationId, [FromBody] UpdateDiagnosisDto dto)
    {
        var result = await _examinationService.UpdateDiagnosisListAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Đặt chẩn đoán chính
    /// </summary>
    [HttpPost("diagnoses/{diagnosisId}/set-primary")]
    public async Task<ActionResult<DiagnosisFullDto>> SetPrimaryDiagnosis(Guid diagnosisId)
    {
        var result = await _examinationService.SetPrimaryDiagnosisAsync(diagnosisId);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm mã ICD
    /// </summary>
    [HttpGet("icd/search")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> SearchIcdCodes(
        [FromQuery] string keyword,
        [FromQuery] int? icdType = null,
        [FromQuery] int limit = 20)
    {
        var result = await _examinationService.SearchIcdCodesAsync(keyword, icdType, limit);
        return Ok(result);
    }

    /// <summary>
    /// Lấy mã ICD theo code
    /// </summary>
    [HttpGet("icd/{code}")]
    public async Task<ActionResult<IcdCodeFullDto>> GetIcdByCode(string code)
    {
        var result = await _examinationService.GetIcdByCodeAsync(code);
        return Ok(result);
    }

    /// <summary>
    /// Lấy ICD phổ biến theo chuyên khoa
    /// </summary>
    [HttpGet("icd/frequent")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> GetFrequentIcdCodes(
        [FromQuery] Guid? departmentId = null,
        [FromQuery] int limit = 20)
    {
        var result = await _examinationService.GetFrequentIcdCodesAsync(departmentId, limit);
        return Ok(result);
    }

    /// <summary>
    /// Gợi ý ICD dựa trên triệu chứng
    /// </summary>
    [HttpGet("icd/suggest")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> SuggestIcdCodes([FromQuery] string symptoms)
    {
        var result = await _examinationService.SuggestIcdCodesAsync(symptoms);
        return Ok(result);
    }

    /// <summary>
    /// Lấy ICD gần đây của bác sĩ
    /// </summary>
    [HttpGet("icd/recent")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> GetRecentIcdCodes([FromQuery] int limit = 20)
    {
        var doctorId = GetCurrentUserId();
        var result = await _examinationService.GetRecentIcdCodesAsync(doctorId, limit);
        return Ok(result);
    }

    /// <summary>
    /// Tìm mã nguyên nhân ngoài
    /// </summary>
    [HttpGet("icd/external-cause/search")]
    public async Task<ActionResult<List<IcdCodeFullDto>>> SearchExternalCauseCodes([FromQuery] string keyword)
    {
        var result = await _examinationService.SearchExternalCauseCodesAsync(keyword);
        return Ok(result);
    }

    #endregion

    #region 2.5 Khám thêm

    /// <summary>
    /// Tạo yêu cầu khám thêm
    /// </summary>
    [HttpPost("additional")]
    public async Task<ActionResult<ExaminationDto>> CreateAdditionalExamination([FromBody] AdditionalExaminationDto dto)
    {
        var result = await _examinationService.CreateAdditionalExaminationAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Chuyển phòng khám
    /// </summary>
    [HttpPost("transfer-room")]
    public async Task<ActionResult<ExaminationDto>> TransferRoom([FromBody] TransferRoomRequestDto dto)
    {
        var result = await _examinationService.TransferRoomAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Chuyển khám chính sang phòng khác
    /// </summary>
    [HttpPost("{examinationId}/transfer-primary/{newRoomId}")]
    public async Task<ActionResult<ExaminationDto>> TransferPrimaryExamination(Guid examinationId, Guid newRoomId)
    {
        var result = await _examinationService.TransferPrimaryExaminationAsync(examinationId, newRoomId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách khám thêm
    /// </summary>
    [HttpGet("{primaryExaminationId}/additional-list")]
    public async Task<ActionResult<List<ExaminationDto>>> GetAdditionalExaminations(Guid primaryExaminationId)
    {
        var result = await _examinationService.GetAdditionalExaminationsAsync(primaryExaminationId);
        return Ok(result);
    }

    /// <summary>
    /// Hủy khám thêm
    /// </summary>
    [HttpPost("{examinationId}/cancel-additional")]
    public async Task<ActionResult<bool>> CancelAdditionalExamination(Guid examinationId, [FromBody] CancelReasonRequest request)
    {
        var result = await _examinationService.CancelAdditionalExaminationAsync(examinationId, request.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành khám thêm
    /// </summary>
    [HttpPost("{examinationId}/complete-additional")]
    public async Task<ActionResult<ExaminationDto>> CompleteAdditionalExamination(Guid examinationId)
    {
        var result = await _examinationService.CompleteAdditionalExaminationAsync(examinationId);
        return Ok(result);
    }

    #endregion

    #region 2.6 Chỉ định dịch vụ

    /// <summary>
    /// Lấy danh sách chỉ định dịch vụ
    /// </summary>
    [HttpGet("{examinationId}/service-orders")]
    public async Task<ActionResult<List<ServiceOrderFullDto>>> GetServiceOrders(Guid examinationId)
    {
        var result = await _examinationService.GetServiceOrdersAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo chỉ định dịch vụ
    /// </summary>
    [HttpPost("service-orders")]
    public async Task<ActionResult<List<ServiceOrderFullDto>>> CreateServiceOrders([FromBody] CreateServiceOrderDto dto)
    {
        var result = await _examinationService.CreateServiceOrdersAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chỉ định dịch vụ
    /// </summary>
    [HttpPut("service-orders/{orderId}")]
    public async Task<ActionResult<ServiceOrderFullDto>> UpdateServiceOrder(Guid orderId, [FromBody] ServiceOrderFullDto dto)
    {
        var result = await _examinationService.UpdateServiceOrderAsync(orderId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Hủy chỉ định dịch vụ
    /// </summary>
    [HttpPost("service-orders/{orderId}/cancel")]
    public async Task<ActionResult<bool>> CancelServiceOrder(Guid orderId, [FromBody] CancelReasonRequest request)
    {
        var result = await _examinationService.CancelServiceOrderAsync(orderId, request.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách dịch vụ
    /// </summary>
    [HttpGet("services")]
    public async Task<ActionResult<List<ServiceDto>>> GetServices(
        [FromQuery] int? serviceType = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] string? keyword = null)
    {
        var result = await _examinationService.GetServicesAsync(serviceType, departmentId, keyword);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm dịch vụ
    /// </summary>
    [HttpGet("services/search")]
    public async Task<ActionResult<List<ServiceDto>>> SearchServices([FromQuery] string keyword, [FromQuery] int limit = 20)
    {
        var result = await _examinationService.SearchServicesAsync(keyword, limit);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ
    /// </summary>
    [HttpGet("service-groups")]
    public async Task<ActionResult<List<ServiceGroupTemplateDto>>> GetServiceGroupTemplates([FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetServiceGroupTemplatesAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo nhóm dịch vụ
    /// </summary>
    [HttpPost("service-groups")]
    public async Task<ActionResult<ServiceGroupTemplateDto>> CreateServiceGroupTemplate([FromBody] ServiceGroupTemplateDto dto)
    {
        var result = await _examinationService.CreateServiceGroupTemplateAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật nhóm dịch vụ
    /// </summary>
    [HttpPut("service-groups/{id}")]
    public async Task<ActionResult<ServiceGroupTemplateDto>> UpdateServiceGroupTemplate(Guid id, [FromBody] ServiceGroupTemplateDto dto)
    {
        var result = await _examinationService.UpdateServiceGroupTemplateAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa nhóm dịch vụ
    /// </summary>
    [HttpDelete("service-groups/{id}")]
    public async Task<ActionResult<bool>> DeleteServiceGroupTemplate(Guid id)
    {
        var result = await _examinationService.DeleteServiceGroupTemplateAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách gói dịch vụ
    /// </summary>
    [HttpGet("service-packages")]
    public async Task<ActionResult<List<ServicePackageDto>>> GetServicePackages()
    {
        var result = await _examinationService.GetServicePackagesAsync();
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng gói dịch vụ
    /// </summary>
    [HttpPost("{examinationId}/apply-service-package/{packageId}")]
    public async Task<ActionResult<List<ServiceOrderFullDto>>> ApplyServicePackage(Guid examinationId, Guid packageId)
    {
        var result = await _examinationService.ApplyServicePackageAsync(examinationId, packageId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trùng dịch vụ
    /// </summary>
    [HttpPost("{examinationId}/check-duplicate-services")]
    public async Task<ActionResult<List<ServiceOrderWarningDto>>> CheckDuplicateServices(Guid examinationId, [FromBody] List<Guid> serviceIds)
    {
        var result = await _examinationService.CheckDuplicateServicesAsync(examinationId, serviceIds);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra quy định chỉ định
    /// </summary>
    [HttpPost("{examinationId}/validate-service-orders")]
    public async Task<ActionResult<List<ServiceOrderWarningDto>>> ValidateServiceOrders(Guid examinationId, [FromBody] List<Guid> serviceIds)
    {
        var result = await _examinationService.ValidateServiceOrdersAsync(examinationId, serviceIds);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phòng thực hiện dịch vụ
    /// </summary>
    [HttpGet("services/{serviceId}/rooms")]
    public async Task<ActionResult<List<RoomDto>>> GetServiceRooms(Guid serviceId)
    {
        var result = await _examinationService.GetServiceRoomsAsync(serviceId);
        return Ok(result);
    }

    /// <summary>
    /// Tự động chọn phòng tối ưu
    /// </summary>
    [HttpGet("services/{serviceId}/optimal-room")]
    public async Task<ActionResult<Guid?>> AutoSelectOptimalRoom(Guid serviceId)
    {
        var result = await _examinationService.AutoSelectOptimalRoomAsync(serviceId);
        return Ok(result);
    }

    /// <summary>
    /// Tính đường đi tối ưu
    /// </summary>
    [HttpPost("calculate-optimal-path")]
    public async Task<ActionResult<List<RoomDto>>> CalculateOptimalPath([FromBody] List<Guid> serviceIds)
    {
        var result = await _examinationService.CalculateOptimalPathAsync(serviceIds);
        return Ok(result);
    }

    /// <summary>
    /// Lấy dịch vụ thường dùng
    /// </summary>
    [HttpGet("services/frequent")]
    public async Task<ActionResult<List<ServiceDto>>> GetFrequentServices([FromQuery] int limit = 20)
    {
        var doctorId = GetCurrentUserId();
        var result = await _examinationService.GetFrequentServicesAsync(doctorId, limit);
        return Ok(result);
    }

    /// <summary>
    /// In phiếu chỉ định
    /// </summary>
    [HttpGet("service-orders/{orderId}/print")]
    public async Task<ActionResult> PrintServiceOrder(Guid orderId)
    {
        var result = await _examinationService.PrintServiceOrderAsync(orderId);
        return File(result, "application/pdf", $"PhieuChiDinh_{orderId}.pdf");
    }

    /// <summary>
    /// In tất cả phiếu chỉ định
    /// </summary>
    [HttpGet("{examinationId}/service-orders/print-all")]
    public async Task<ActionResult> PrintAllServiceOrders(Guid examinationId)
    {
        var result = await _examinationService.PrintAllServiceOrdersAsync(examinationId);
        return File(result, "application/pdf", $"PhieuChiDinh_{examinationId}.pdf");
    }

    #endregion

    #region 2.7 Kê đơn thuốc

    /// <summary>
    /// Lấy danh sách đơn thuốc
    /// </summary>
    [HttpGet("{examinationId}/prescriptions")]
    public async Task<ActionResult<List<PrescriptionFullDto>>> GetPrescriptions(Guid examinationId)
    {
        var result = await _examinationService.GetPrescriptionsAsync(examinationId);
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
    public async Task<ActionResult<PrescriptionFullDto>> CreatePrescription([FromBody] CreatePrescriptionDto dto)
    {
        var result = await _examinationService.CreatePrescriptionAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật đơn thuốc
    /// </summary>
    [HttpPut("prescriptions/{id}")]
    public async Task<ActionResult<PrescriptionFullDto>> UpdatePrescription(Guid id, [FromBody] CreatePrescriptionDto dto)
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
    public async Task<ActionResult<List<PrescriptionWarningDto>>> ValidateBhytPrescription(Guid examinationId, [FromBody] CreatePrescriptionDto dto)
    {
        var result = await _examinationService.ValidateBhytPrescriptionAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách mẫu đơn thuốc
    /// </summary>
    [HttpGet("templates/prescription")]
    public async Task<ActionResult<List<PrescriptionTemplateDto>>> GetPrescriptionTemplates([FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetPrescriptionTemplatesAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo mẫu đơn thuốc
    /// </summary>
    [HttpPost("templates/prescription")]
    public async Task<ActionResult<PrescriptionTemplateDto>> CreatePrescriptionTemplate([FromBody] PrescriptionTemplateDto dto)
    {
        var result = await _examinationService.CreatePrescriptionTemplateAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật mẫu đơn thuốc
    /// </summary>
    [HttpPut("templates/prescription/{id}")]
    public async Task<ActionResult<PrescriptionTemplateDto>> UpdatePrescriptionTemplate(Guid id, [FromBody] PrescriptionTemplateDto dto)
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
    public async Task<ActionResult<PrescriptionTemplateDto>> SaveAsPrescriptionTemplate(Guid prescriptionId, [FromBody] SaveAsTemplateRequest request)
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

    #endregion

    #region 2.8 Kết luận khám bệnh

    /// <summary>
    /// Lấy kết luận khám bệnh
    /// </summary>
    [HttpGet("{examinationId}/conclusion")]
    public async Task<ActionResult<ExaminationConclusionDto>> GetConclusion(Guid examinationId)
    {
        var result = await _examinationService.GetConclusionAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành khám bệnh
    /// </summary>
    [HttpPost("{examinationId}/complete")]
    public async Task<ActionResult<ExaminationConclusionDto>> CompleteExamination(Guid examinationId, [FromBody] CompleteExaminationDto dto)
    {
        var result = await _examinationService.CompleteExaminationAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật kết luận
    /// </summary>
    [HttpPut("{examinationId}/conclusion")]
    public async Task<ActionResult<ExaminationConclusionDto>> UpdateConclusion(Guid examinationId, [FromBody] CompleteExaminationDto dto)
    {
        var result = await _examinationService.UpdateConclusionAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Yêu cầu nhập viện
    /// </summary>
    [HttpPost("{examinationId}/request-hospitalization")]
    public async Task<ActionResult<ExaminationDto>> RequestHospitalization(Guid examinationId, [FromBody] HospitalizationRequestDto dto)
    {
        var result = await _examinationService.RequestHospitalizationAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Yêu cầu chuyển viện
    /// </summary>
    [HttpPost("{examinationId}/request-transfer")]
    public async Task<ActionResult<ExaminationDto>> RequestTransfer(Guid examinationId, [FromBody] TransferRequestDto dto)
    {
        var result = await _examinationService.RequestTransferAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Tạo hẹn khám
    /// </summary>
    [HttpPost("{examinationId}/appointment")]
    public async Task<ActionResult<AppointmentDto>> CreateAppointment(Guid examinationId, [FromBody] CreateAppointmentDto dto)
    {
        var result = await _examinationService.CreateAppointmentAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Cấp giấy nghỉ ốm
    /// </summary>
    [HttpPost("{examinationId}/sick-leave")]
    public async Task<ActionResult<SickLeaveDto>> CreateSickLeave(Guid examinationId, [FromBody] CreateSickLeaveDto dto)
    {
        var result = await _examinationService.CreateSickLeaveAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// In giấy nghỉ ốm
    /// </summary>
    [HttpGet("{examinationId}/sick-leave/print")]
    public async Task<ActionResult> PrintSickLeave(Guid examinationId)
    {
        var result = await _examinationService.PrintSickLeaveAsync(examinationId);
        return File(result, "application/pdf", $"GiayNghiOm_{examinationId}.pdf");
    }

    /// <summary>
    /// Khóa hồ sơ
    /// </summary>
    [HttpPost("{examinationId}/lock")]
    public async Task<ActionResult<bool>> LockExamination(Guid examinationId)
    {
        var result = await _examinationService.LockExaminationAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Mở khóa hồ sơ
    /// </summary>
    [HttpPost("{examinationId}/unlock")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<bool>> UnlockExamination(Guid examinationId, [FromBody] UnlockReasonRequest request)
    {
        var result = await _examinationService.UnlockExaminationAsync(examinationId, request.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra điều kiện hoàn thành
    /// </summary>
    [HttpGet("{examinationId}/validate-completion")]
    public async Task<ActionResult<ExaminationValidationResult>> ValidateExaminationForCompletion(Guid examinationId)
    {
        var result = await _examinationService.ValidateExaminationForCompletionAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Hủy lượt khám
    /// </summary>
    [HttpPost("{examinationId}/cancel")]
    public async Task<ActionResult<bool>> CancelExamination(Guid examinationId, [FromBody] CancelReasonRequest request)
    {
        var result = await _examinationService.CancelExaminationAsync(examinationId, request.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn tác hoàn thành
    /// </summary>
    [HttpPost("{examinationId}/revert-completion")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ExaminationDto>> RevertCompletion(Guid examinationId, [FromBody] RevertReasonRequest request)
    {
        var result = await _examinationService.RevertCompletionAsync(examinationId, request.Reason);
        return Ok(result);
    }

    #endregion

    #region 2.9 Quản lý và báo cáo

    /// <summary>
    /// Tìm kiếm lượt khám
    /// </summary>
    [HttpPost("search")]
    public async Task<ActionResult<PagedResultDto<ExaminationDto>>> SearchExaminations([FromBody] ExaminationSearchDto dto)
    {
        var result = await _examinationService.SearchExaminationsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thống kê khám bệnh
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<ExaminationStatisticsDto>> GetExaminationStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] Guid? roomId = null)
    {
        var result = await _examinationService.GetExaminationStatisticsAsync(fromDate, toDate, departmentId, roomId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy sổ khám bệnh
    /// </summary>
    [HttpGet("register")]
    public async Task<ActionResult<List<ExaminationRegisterDto>>> GetExaminationRegister(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? roomId = null)
    {
        var result = await _examinationService.GetExaminationRegisterAsync(fromDate, toDate, roomId);
        return Ok(result);
    }

    /// <summary>
    /// Xuất Excel sổ khám bệnh
    /// </summary>
    [HttpGet("register/export-excel")]
    public async Task<ActionResult> ExportExaminationRegisterToExcel(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? roomId = null)
    {
        var result = await _examinationService.ExportExaminationRegisterToExcelAsync(fromDate, toDate, roomId);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"SoKhamBenh_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.xlsx");
    }

    /// <summary>
    /// Xuất báo cáo thống kê
    /// </summary>
    [HttpGet("statistics/export")]
    public async Task<ActionResult> ExportExaminationStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] string format = "excel")
    {
        var result = await _examinationService.ExportExaminationStatisticsAsync(fromDate, toDate, format);
        var contentType = format == "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        var extension = format == "pdf" ? "pdf" : "xlsx";
        return File(result, contentType, $"ThongKeKhamBenh_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.{extension}");
    }

    /// <summary>
    /// Lấy thống kê theo bác sĩ
    /// </summary>
    [HttpGet("statistics/by-doctor")]
    public async Task<ActionResult<List<DoctorExaminationStatDto>>> GetDoctorStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetDoctorStatisticsAsync(fromDate, toDate, departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thống kê theo mã bệnh
    /// </summary>
    [HttpGet("statistics/by-diagnosis")]
    public async Task<ActionResult<Dictionary<string, int>>> GetDiagnosisStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        var result = await _examinationService.GetDiagnosisStatisticsAsync(fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lấy báo cáo bệnh truyền nhiễm
    /// </summary>
    [HttpGet("reports/communicable-diseases")]
    public async Task<ActionResult<List<CommunicableDiseaseReportDto>>> GetCommunicableDiseaseReport(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        var result = await _examinationService.GetCommunicableDiseaseReportAsync(fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// In phiếu khám bệnh
    /// </summary>
    [HttpGet("{examinationId}/print")]
    public async Task<ActionResult> PrintExaminationForm(Guid examinationId)
    {
        var result = await _examinationService.PrintExaminationFormAsync(examinationId);
        return File(result, "application/pdf", $"PhieuKham_{examinationId}.pdf");
    }

    /// <summary>
    /// In bệnh án ngoại trú
    /// </summary>
    [HttpGet("{examinationId}/print-medical-record")]
    public async Task<ActionResult> PrintOutpatientMedicalRecord(Guid examinationId)
    {
        var result = await _examinationService.PrintOutpatientMedicalRecordAsync(examinationId);
        return File(result, "application/pdf", $"BenhAnNgoaiTru_{examinationId}.pdf");
    }

    /// <summary>
    /// In giấy hẹn khám
    /// </summary>
    [HttpGet("appointments/{appointmentId}/print")]
    public async Task<ActionResult> PrintAppointmentSlip(Guid appointmentId)
    {
        var result = await _examinationService.PrintAppointmentSlipAsync(appointmentId);
        return File(result, "application/pdf", $"GiayHenKham_{appointmentId}.pdf");
    }

    /// <summary>
    /// In phiếu nhập viện
    /// </summary>
    [HttpGet("{examinationId}/print-admission")]
    public async Task<ActionResult> PrintAdmissionForm(Guid examinationId)
    {
        var result = await _examinationService.PrintAdmissionFormAsync(examinationId);
        return File(result, "application/pdf", $"PhieuNhapVien_{examinationId}.pdf");
    }

    /// <summary>
    /// In giấy chuyển viện
    /// </summary>
    [HttpGet("{examinationId}/print-transfer")]
    public async Task<ActionResult> PrintTransferForm(Guid examinationId)
    {
        var result = await _examinationService.PrintTransferFormAsync(examinationId);
        return File(result, "application/pdf", $"GiayChuyenVien_{examinationId}.pdf");
    }

    #endregion

    #region 2.10 Chức năng bổ sung

    /// <summary>
    /// Lấy thông tin bệnh nhân
    /// </summary>
    [HttpGet("patient/lookup")]
    public async Task<ActionResult<PatientInfoDto>> GetPatientInfo(
        [FromQuery] string? patientCode = null,
        [FromQuery] string? idNumber = null)
    {
        var result = await _examinationService.GetPatientInfoAsync(patientCode, idNumber);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phòng khám đang hoạt động
    /// </summary>
    [HttpGet("rooms/active")]
    public async Task<ActionResult<List<RoomDto>>> GetActiveExaminationRooms([FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetActiveExaminationRoomsAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách bác sĩ đang trực
    /// </summary>
    [HttpGet("doctors/on-duty")]
    public async Task<ActionResult<List<DoctorDto>>> GetOnDutyDoctors([FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetOnDutyDoctorsAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy cấu hình phòng khám
    /// </summary>
    [HttpGet("rooms/{roomId}/config")]
    public async Task<ActionResult<RoomExaminationConfigDto>> GetRoomExaminationConfig(Guid roomId)
    {
        var result = await _examinationService.GetRoomExaminationConfigAsync(roomId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật cấu hình phòng khám
    /// </summary>
    [HttpPut("rooms/{roomId}/config")]
    public async Task<ActionResult<RoomExaminationConfigDto>> UpdateRoomExaminationConfig(Guid roomId, [FromBody] RoomExaminationConfigDto config)
    {
        var result = await _examinationService.UpdateRoomExaminationConfigAsync(roomId, config);
        return Ok(result);
    }

    /// <summary>
    /// Ký điện tử
    /// </summary>
    [HttpPost("{examinationId}/sign")]
    public async Task<ActionResult<bool>> SignExamination(Guid examinationId, [FromBody] SignatureRequest request)
    {
        var result = await _examinationService.SignExaminationAsync(examinationId, request.Signature);
        return Ok(result);
    }

    /// <summary>
    /// Xác minh chữ ký
    /// </summary>
    [HttpGet("{examinationId}/verify-signature")]
    public async Task<ActionResult<SignatureVerificationResult>> VerifyExaminationSignature(Guid examinationId)
    {
        var result = await _examinationService.VerifyExaminationSignatureAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Gửi kết quả qua SMS/Zalo
    /// </summary>
    [HttpPost("{examinationId}/send-result")]
    public async Task<ActionResult<bool>> SendResultNotification(Guid examinationId, [FromBody] SendNotificationRequest request)
    {
        var result = await _examinationService.SendResultNotificationAsync(examinationId, request.Channel);
        return Ok(result);
    }

    /// <summary>
    /// Lấy log hoạt động
    /// </summary>
    [HttpGet("{examinationId}/activity-logs")]
    public async Task<ActionResult<List<ExaminationActivityLogDto>>> GetExaminationLogs(Guid examinationId)
    {
        var result = await _examinationService.GetExaminationLogsAsync(examinationId);
        return Ok(result);
    }

    #endregion

    #region Helper Methods

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("sub") ?? User.FindFirst("UserId") ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return userIdClaim != null ? Guid.Parse(userIdClaim.Value) : Guid.Empty;
    }

    #endregion
}

#region Request DTOs

public class UpdatePhotoRequest
{
    public string PhotoBase64 { get; set; } = string.Empty;
}

public class SaveAsTemplateRequest
{
    public string TemplateName { get; set; } = string.Empty;
}

public class CancelReasonRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class UnlockReasonRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class RevertReasonRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SignatureRequest
{
    public string Signature { get; set; } = string.Empty;
}

public class SendNotificationRequest
{
    public string Channel { get; set; } = string.Empty; // sms, zalo, email
}

#endregion
