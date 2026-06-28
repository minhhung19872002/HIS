using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Infrastructure.Data;
using RoomDto = HIS.Application.DTOs.RoomDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Dtos.ExaminationComplete;

namespace HIS.API.Controllers;

/// <summary>
/// Controller đầy đủ cho Phân hệ 2: Khám bệnh OPD
/// Bao gồm tất cả 180+ chức năng theo yêu cầu
/// </summary>
[Authorize]
[ApiController]
[Route("api/examination")]
[TypeFilter(typeof(Filters.DomainExceptionFilter))] // TT46: InvalidOperationException (EmrLockGuard) → 400 + message rõ
public partial class ExaminationCompleteController : ControllerBase
{
    private readonly IExaminationCompleteService _examinationService;
    private readonly HISDbContext _db;

    public ExaminationCompleteController(IExaminationCompleteService examinationService, HISDbContext db)
    {
        _examinationService = examinationService;
        _db = db;
    }

    /// <summary>
    /// EMR record-centric: danh sách gộp theo BỆNH NHÂN, kèm bệnh nền (chronic)
    /// + dị ứng (allergy), số lượt khám, lần khám cuối, chẩn đoán gần nhất.
    /// </summary>
    [HttpGet("emr-records")]
    public async Task<ActionResult> GetEmrRecords([FromQuery] string? keyword, [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 50)
    {
        var since = DateTime.Today.AddDays(-365);
        var rows = await _db.Examinations
            .Where(e => e.CreatedAt >= since && e.MedicalRecord.PatientId != Guid.Empty)
            .OrderByDescending(e => e.CreatedAt)
            .Take(5000)
            .Select(e => new
            {
                PatientId = e.MedicalRecord.PatientId,
                MedicalRecordId = (Guid?)e.MedicalRecordId,
                Code = e.MedicalRecord.Patient.PatientCode,
                Name = e.MedicalRecord.Patient.FullName,
                Gender = e.MedicalRecord.Patient.Gender,
                Dob = e.MedicalRecord.Patient.DateOfBirth,
                Yob = e.MedicalRecord.Patient.YearOfBirth,
                Insurance = e.MedicalRecord.Patient.InsuranceNumber,
                Date = e.CreatedAt,
                Dx = e.MainDiagnosis,
                Icd = e.MainIcdCode,
                Room = e.Room.RoomName,
            })
            .ToListAsync();

        var grouped = rows
            .GroupBy(r => r.PatientId)
            .Select(g =>
            {
                var latest = g.OrderByDescending(x => x.Date).First();
                int? age = latest.Dob.HasValue
                    ? Math.Max(0, DateTime.Today.Year - latest.Dob.Value.Year)
                    : (latest.Yob.HasValue ? DateTime.Today.Year - latest.Yob.Value : (int?)null);
                return new EmrRecordDto
                {
                    PatientId = g.Key,
                    MedicalRecordId = latest.MedicalRecordId,
                    PatientCode = latest.Code ?? "",
                    PatientName = latest.Name ?? "",
                    Gender = latest.Gender,
                    Age = age,
                    InsuranceNumber = latest.Insurance,
                    VisitCount = g.Count(),
                    LastVisit = latest.Date,
                    LastDiagnosisName = latest.Dx,
                    LastDiagnosisCode = latest.Icd,
                    LastRoomName = latest.Room,
                };
            })
            .ToList();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLower();
            grouped = grouped.Where(r =>
                (r.PatientName?.ToLower().Contains(kw) ?? false) ||
                (r.PatientCode?.ToLower().Contains(kw) ?? false) ||
                (r.LastDiagnosisName?.ToLower().Contains(kw) ?? false)).ToList();
        }

        grouped = grouped.OrderByDescending(r => r.LastVisit).ToList();
        var total = grouped.Count;
        var page = grouped.Skip((Math.Max(1, pageIndex) - 1) * pageSize).Take(pageSize).ToList();

        var ids = page.Select(p => p.PatientId).ToList();
        if (ids.Count > 0)
        {
            var chronic = await _db.ChronicDiseaseRecords
                .Where(c => c.Status == "Active" && ids.Contains(c.PatientId))
                .Select(c => new { c.PatientId, c.IcdName })
                .ToListAsync();
            var chronicMap = chronic.GroupBy(c => c.PatientId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.IcdName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList());

            var allergies = await _db.Allergies
                .Where(a => a.IsActive && ids.Contains(a.PatientId))
                .Select(a => new { a.PatientId, a.AllergenName })
                .ToListAsync();
            var allergyMap = allergies.GroupBy(a => a.PatientId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.AllergenName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList());

            foreach (var p in page)
            {
                if (chronicMap.TryGetValue(p.PatientId, out var cs)) p.ChronicDiseases = cs;
                if (allergyMap.TryGetValue(p.PatientId, out var al)) p.Allergies = al;
            }
        }

        return Ok(new { items = page, totalCount = total, pageIndex, pageSize });
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
    [HttpGet("rooms/{roomId}/patients")]
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

    #region Helper Methods

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("sub") ?? User.FindFirst("UserId") ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return userIdClaim != null ? Guid.Parse(userIdClaim.Value) : Guid.Empty;
    }

    #endregion
}

#region Request DTOs




#endregion
