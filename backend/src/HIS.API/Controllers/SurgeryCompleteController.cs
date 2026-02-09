using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using System.Security.Claims;
using IcdCodeDto = HIS.Application.DTOs.IcdCodeDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;

namespace HIS.API.Controllers;

/// <summary>
/// API Controller đầy đủ cho Phân hệ 6: Phẫu thuật thủ thuật (PTTT)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SurgeryCompleteController : ControllerBase
{
    private readonly ISurgeryCompleteService _surgeryService;

    public SurgeryCompleteController(ISurgeryCompleteService surgeryService)
    {
        _surgeryService = surgeryService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());

    #region 6.1 Quản lý PTTT

    /// <summary>
    /// Tạo yêu cầu PTTT
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SurgeryDto>> CreateSurgeryRequest([FromBody] CreateSurgeryRequestDto dto)
    {
        var result = await _surgeryService.CreateSurgeryRequestAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Duyệt mổ
    /// </summary>
    [HttpPost("approve")]
    public async Task<ActionResult<SurgeryDto>> ApproveSurgery([FromBody] ApproveSurgeryDto dto)
    {
        var result = await _surgeryService.ApproveSurgeryAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Từ chối duyệt mổ
    /// </summary>
    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin,SurgeryManager,DepartmentHead")]
    public async Task<ActionResult<SurgeryDto>> RejectSurgery(Guid id, [FromBody] RejectRequest request)
    {
        var result = await _surgeryService.RejectSurgeryAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lên lịch mổ
    /// </summary>
    [HttpPost("schedule")]
    public async Task<ActionResult<SurgeryDto>> ScheduleSurgery([FromBody] ScheduleSurgeryDto dto)
    {
        var result = await _surgeryService.ScheduleSurgeryAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy lịch mổ
    /// </summary>
    [HttpGet("schedule")]
    public async Task<ActionResult<List<SurgeryScheduleDto>>> GetSurgerySchedule([FromQuery] DateTime date, [FromQuery] Guid? operatingRoomId)
    {
        var result = await _surgeryService.GetSurgeryScheduleAsync(date, operatingRoomId);
        return Ok(result);
    }

    /// <summary>
    /// Tiếp nhận bệnh nhân vào phòng mổ
    /// </summary>
    [HttpPost("check-in")]
    public async Task<ActionResult<SurgeryDto>> CheckInPatient([FromBody] SurgeryCheckInDto dto)
    {
        var result = await _surgeryService.CheckInPatientAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách PTTT
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResultDto<SurgeryDto>>> GetSurgeries([FromQuery] SurgerySearchDto dto)
    {
        var result = await _surgeryService.GetSurgeriesAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết PTTT
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<SurgeryDto>> GetSurgery(Guid id)
    {
        var result = await _surgeryService.GetSurgeryByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Hủy PTTT
    /// </summary>
    [HttpPost("{id}/cancel")]
    [Authorize(Roles = "Admin,SurgeryManager,Doctor")]
    public async Task<ActionResult<bool>> CancelSurgery(Guid id, [FromBody] SurgeryCancelRequest request)
    {
        var result = await _surgeryService.CancelSurgeryAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Khai báo tiền công ekip
    /// </summary>
    [HttpPost("{id}/team-fees")]
    [Authorize(Roles = "Admin,SurgeryManager")]
    public async Task<ActionResult<SurgeryDto>> SetTeamFees(Guid id, [FromBody] List<SurgeryTeamMemberRequestDto> teamMembers)
    {
        var result = await _surgeryService.SetTeamFeesAsync(id, teamMembers, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tính công PTTT theo QĐ73
    /// </summary>
    [HttpGet("{id}/fee-calculation")]
    public async Task<ActionResult<SurgeryFeeCalculationDto>> CalculateTeamFees(Guid id)
    {
        var result = await _surgeryService.CalculateTeamFeesAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Tính lợi nhuận PTTT
    /// </summary>
    [HttpGet("{id}/profit")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<SurgeryProfitDto>> CalculateProfit(Guid id)
    {
        var result = await _surgeryService.CalculateProfitAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Tính chi phí theo TT37
    /// </summary>
    [HttpGet("{id}/cost-tt37")]
    public async Task<ActionResult<SurgeryCostCalculationDto>> CalculateCostTT37(Guid id, [FromQuery] bool hasTeamChange = false)
    {
        var result = await _surgeryService.CalculateCostTT37Async(id, hasTeamChange);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo thống kê PTTT
    /// </summary>
    [HttpGet("statistics")]
    [Authorize(Roles = "Admin,SurgeryManager,Accountant")]
    public async Task<ActionResult<SurgeryStatisticsDto>> GetStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? departmentId)
    {
        var result = await _surgeryService.GetStatisticsAsync(fromDate, toDate, departmentId);
        return Ok(result);
    }

    #endregion

    #region 6.1.1 Gói PTTT & Định mức

    /// <summary>
    /// Lấy danh sách gói PTTT
    /// </summary>
    [HttpGet("packages")]
    public async Task<ActionResult<List<SurgeryPackageDto>>> GetSurgeryPackages([FromQuery] Guid? surgeryServiceId)
    {
        var result = await _surgeryService.GetSurgeryPackagesAsync(surgeryServiceId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết gói PTTT
    /// </summary>
    [HttpGet("packages/{id}")]
    public async Task<ActionResult<SurgeryPackageDto>> GetSurgeryPackage(Guid id)
    {
        var result = await _surgeryService.GetSurgeryPackageByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Tạo/Cập nhật gói PTTT
    /// </summary>
    [HttpPost("packages")]
    [Authorize(Roles = "Admin,SurgeryManager")]
    public async Task<ActionResult<SurgeryPackageDto>> SaveSurgeryPackage([FromBody] SurgeryPackageDto dto)
    {
        var result = await _surgeryService.SaveSurgeryPackageAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa gói PTTT
    /// </summary>
    [HttpDelete("packages/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<bool>> DeleteSurgeryPackage(Guid id)
    {
        var result = await _surgeryService.DeleteSurgeryPackageAsync(id, GetUserId());
        return Ok(result);
    }

    #endregion

    #region 6.2 Màn hình chờ phòng mổ

    /// <summary>
    /// Lấy danh sách chờ của phòng mổ
    /// </summary>
    [HttpGet("waiting-list/{roomId}")]
    public async Task<ActionResult<SurgeryWaitingListDto>> GetWaitingList(Guid roomId, [FromQuery] DateTime date)
    {
        var result = await _surgeryService.GetWaitingListAsync(roomId, date);
        return Ok(result);
    }

    /// <summary>
    /// Lấy tất cả danh sách chờ
    /// </summary>
    [HttpGet("waiting-lists")]
    public async Task<ActionResult<List<SurgeryWaitingListDto>>> GetAllWaitingLists([FromQuery] DateTime date)
    {
        var result = await _surgeryService.GetAllWaitingListsAsync(date);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phòng mổ
    /// </summary>
    [HttpGet("operating-rooms")]
    public async Task<ActionResult<List<OperatingRoomDto>>> GetOperatingRooms([FromQuery] int? roomType, [FromQuery] int? status)
    {
        var result = await _surgeryService.GetOperatingRoomsAsync(roomType, status);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật trạng thái phòng mổ
    /// </summary>
    [HttpPut("operating-rooms/{id}/status")]
    [Authorize(Roles = "Admin,SurgeryManager")]
    public async Task<ActionResult<OperatingRoomDto>> UpdateOperatingRoomStatus(Guid id, [FromBody] SurgeryUpdateStatusRequest request)
    {
        var result = await _surgeryService.UpdateOperatingRoomStatusAsync(id, request.Status, GetUserId());
        return Ok(result);
    }

    #endregion

    #region 6.3 Thực hiện PTTT

    /// <summary>
    /// Bắt đầu ca mổ
    /// </summary>
    [HttpPost("start")]
    public async Task<ActionResult<SurgeryDto>> StartSurgery([FromBody] StartSurgeryDto dto)
    {
        var result = await _surgeryService.StartSurgeryAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Kết thúc ca mổ
    /// </summary>
    [HttpPost("complete")]
    public async Task<ActionResult<SurgeryDto>> CompleteSurgery([FromBody] CompleteSurgeryDto dto)
    {
        var result = await _surgeryService.CompleteSurgeryAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin thực hiện
    /// </summary>
    [HttpPut("{id}/execution")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryDto>> UpdateExecutionInfo(Guid id, [FromBody] SurgeryExecutionDto dto)
    {
        dto.SurgeryId = id;
        var result = await _surgeryService.UpdateExecutionInfoAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chẩn đoán trước mổ
    /// </summary>
    [HttpPut("{id}/pre-diagnosis")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryDto>> UpdatePreOperativeDiagnosis(Guid id, [FromBody] DiagnosisRequest request)
    {
        var result = await _surgeryService.UpdatePreOperativeDiagnosisAsync(id, request.Diagnosis, request.IcdCode, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chẩn đoán sau mổ
    /// </summary>
    [HttpPut("{id}/post-diagnosis")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryDto>> UpdatePostOperativeDiagnosis(Guid id, [FromBody] DiagnosisRequest request)
    {
        var result = await _surgeryService.UpdatePostOperativeDiagnosisAsync(id, request.Diagnosis, request.IcdCode, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Khai báo thông tin theo TT50
    /// </summary>
    [HttpPut("{id}/tt50-info")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryDto>> UpdateTT50Info(Guid id, [FromBody] SurgeryTT50InfoDto dto)
    {
        dto.SurgeryId = id;
        var result = await _surgeryService.UpdateTT50InfoAsync(id, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật ekip mổ
    /// </summary>
    [HttpPut("{id}/team")]
    [Authorize(Roles = "Admin,Doctor,SurgeryManager")]
    public async Task<ActionResult<SurgeryDto>> UpdateTeamMembers(Guid id, [FromBody] List<SurgeryTeamMemberRequestDto> members)
    {
        var result = await _surgeryService.UpdateTeamMembersAsync(id, members, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Thay đổi thành viên ekip giữa chừng
    /// </summary>
    [HttpPost("{id}/team/change")]
    [Authorize(Roles = "Admin,Doctor,SurgeryManager")]
    public async Task<ActionResult<SurgeryDto>> ChangeTeamMember(Guid id, [FromBody] ChangeTeamMemberRequest request)
    {
        var result = await _surgeryService.ChangeTeamMemberAsync(id, request.OldMemberId, request.NewMember, request.ChangeTime, GetUserId());
        return Ok(result);
    }

    #endregion

    #region 6.3.1 In ấn PTTT

    /// <summary>
    /// In phiếu chứng nhận PTTT
    /// </summary>
    [HttpGet("{id}/print/certificate")]
    public async Task<IActionResult> PrintSurgeryCertificate(Guid id)
    {
        var result = await _surgeryService.PrintSurgeryCertificateAsync(id);
        return File(result, "application/pdf", "chungnhan_pttt.pdf");
    }

    /// <summary>
    /// In giải trình/tường trình PT
    /// </summary>
    [HttpGet("{id}/print/report")]
    public async Task<IActionResult> PrintSurgeryReport(Guid id)
    {
        var result = await _surgeryService.PrintSurgeryReportAsync(id);
        return File(result, "application/pdf", "tuongtrinh_pt.pdf");
    }

    /// <summary>
    /// In bảng kiểm an toàn
    /// </summary>
    [HttpGet("{id}/print/safety-checklist")]
    public async Task<IActionResult> PrintSafetyChecklist(Guid id)
    {
        var result = await _surgeryService.PrintSafetyChecklistAsync(id);
        return File(result, "application/pdf", "bangkiem_antoan.pdf");
    }

    /// <summary>
    /// In phiếu PTTT
    /// </summary>
    [HttpGet("{id}/print/form")]
    public async Task<IActionResult> PrintSurgeryForm(Guid id)
    {
        var result = await _surgeryService.PrintSurgeryFormAsync(id);
        return File(result, "application/pdf", "phieu_pttt.pdf");
    }

    /// <summary>
    /// In phiếu GMHS
    /// </summary>
    [HttpGet("{id}/print/anesthesia")]
    public async Task<IActionResult> PrintAnesthesiaForm(Guid id)
    {
        var result = await _surgeryService.PrintAnesthesiaFormAsync(id);
        return File(result, "application/pdf", "phieu_gmhs.pdf");
    }

    /// <summary>
    /// In phiếu theo dõi sau PT
    /// </summary>
    [HttpGet("{id}/print/post-op-care")]
    public async Task<IActionResult> PrintPostOpCareForm(Guid id)
    {
        var result = await _surgeryService.PrintPostOpCareFormAsync(id);
        return File(result, "application/pdf", "theodoi_saupt.pdf");
    }

    /// <summary>
    /// In phiếu thuốc/VT
    /// </summary>
    [HttpGet("{id}/print/medicine-disclosure")]
    public async Task<IActionResult> PrintMedicineDisclosure(Guid id)
    {
        var result = await _surgeryService.PrintMedicineDisclosureAsync(id);
        return File(result, "application/pdf", "congkhai_thuoc.pdf");
    }

    /// <summary>
    /// Xuất XML 4210 bảng 5
    /// </summary>
    [HttpGet("{id}/export/xml-4210")]
    public async Task<IActionResult> ExportXml4210(Guid id)
    {
        var result = await _surgeryService.ExportXml4210Async(id);
        return File(result, "application/xml", "xml4210_pttt.xml");
    }

    #endregion

    #region 6.4 Chỉ định dịch vụ trong PTTT

    /// <summary>
    /// Tìm kiếm ICD-10
    /// </summary>
    [HttpGet("icd-codes/search")]
    public async Task<ActionResult<List<IcdCodeDto>>> SearchIcdCodes([FromQuery] string keyword, [FromQuery] bool byCode = false)
    {
        var result = await _surgeryService.SearchIcdCodesAsync(keyword, byCode);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm dịch vụ
    /// </summary>
    [HttpGet("services/search")]
    public async Task<ActionResult<List<ServiceDto>>> SearchServices([FromQuery] string keyword, [FromQuery] int? serviceType)
    {
        var result = await _surgeryService.SearchServicesAsync(keyword, serviceType);
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định dịch vụ
    /// </summary>
    [HttpPost("{surgeryId}/service-orders")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryServiceOrderDto>> OrderService(Guid surgeryId, [FromBody] CreateSurgeryServiceOrderDto dto)
    {
        dto.SurgeryId = surgeryId;
        var result = await _surgeryService.OrderServiceAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định nhiều dịch vụ
    /// </summary>
    [HttpPost("{surgeryId}/service-orders/batch")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<List<SurgeryServiceOrderDto>>> OrderServices(Guid surgeryId, [FromBody] List<CreateSurgeryServiceOrderDto> dtos)
    {
        var result = await _surgeryService.OrderServicesAsync(surgeryId, dtos, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định theo gói
    /// </summary>
    [HttpPost("{surgeryId}/service-orders/package/{packageId}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryPackageOrderDto>> OrderPackage(Guid surgeryId, Guid packageId)
    {
        var result = await _surgeryService.OrderPackageAsync(surgeryId, packageId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách chỉ định dịch vụ
    /// </summary>
    [HttpGet("{surgeryId}/service-orders")]
    public async Task<ActionResult<List<SurgeryServiceOrderDto>>> GetServiceOrders(Guid surgeryId)
    {
        var result = await _surgeryService.GetServiceOrdersAsync(surgeryId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chỉ định dịch vụ
    /// </summary>
    [HttpPut("service-orders/{orderId}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryServiceOrderDto>> UpdateServiceOrder(Guid orderId, [FromBody] CreateSurgeryServiceOrderDto dto)
    {
        var result = await _surgeryService.UpdateServiceOrderAsync(orderId, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa chỉ định dịch vụ
    /// </summary>
    [HttpDelete("service-orders/{orderId}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<bool>> DeleteServiceOrder(Guid orderId)
    {
        var result = await _surgeryService.DeleteServiceOrderAsync(orderId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xem tổng chi phí dịch vụ
    /// </summary>
    [HttpGet("{surgeryId}/service-cost")]
    public async Task<ActionResult<ServiceCostInfoDto>> GetServiceCostInfo(Guid surgeryId)
    {
        var result = await _surgeryService.GetServiceCostInfoAsync(surgeryId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra cảnh báo chỉ định
    /// </summary>
    [HttpGet("{surgeryId}/service-orders/warnings")]
    public async Task<ActionResult<List<ServiceOrderWarningDto>>> CheckOrderWarnings(Guid surgeryId, [FromQuery] Guid serviceId)
    {
        var result = await _surgeryService.CheckOrderWarningsAsync(surgeryId, serviceId);
        return Ok(result);
    }

    #endregion

    #region 6.4.1 Nhóm dịch vụ nhanh

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ
    /// </summary>
    [HttpGet("service-groups")]
    public async Task<ActionResult<List<SurgeryServiceGroupDto>>> GetServiceGroups()
    {
        var result = await _surgeryService.GetServiceGroupsAsync(GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo nhóm dịch vụ
    /// </summary>
    [HttpPost("service-groups")]
    public async Task<ActionResult<SurgeryServiceGroupDto>> CreateServiceGroup([FromBody] SurgeryServiceGroupDto dto)
    {
        var result = await _surgeryService.CreateServiceGroupAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định theo nhóm
    /// </summary>
    [HttpPost("{surgeryId}/service-orders/group/{groupId}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<List<SurgeryServiceOrderDto>>> OrderByGroup(Guid surgeryId, Guid groupId)
    {
        var result = await _surgeryService.OrderByGroupAsync(surgeryId, groupId, GetUserId());
        return Ok(result);
    }

    #endregion

    #region 6.5 Kê thuốc, vật tư trong PTTT

    /// <summary>
    /// Lấy đơn thuốc/vật tư của PTTT
    /// </summary>
    [HttpGet("{surgeryId}/prescription")]
    public async Task<ActionResult<SurgeryPrescriptionDto>> GetPrescription(Guid surgeryId)
    {
        var result = await _surgeryService.GetPrescriptionAsync(surgeryId);
        return Ok(result);
    }

    /// <summary>
    /// Thêm thuốc
    /// </summary>
    [HttpPost("{surgeryId}/medicines")]
    [Authorize(Roles = "Admin,Doctor,Nurse")]
    public async Task<ActionResult<SurgeryMedicineDto>> AddMedicine(Guid surgeryId, [FromBody] AddSurgeryMedicineDto dto)
    {
        dto.SurgeryId = surgeryId;
        var result = await _surgeryService.AddMedicineAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Thêm vật tư
    /// </summary>
    [HttpPost("{surgeryId}/supplies")]
    [Authorize(Roles = "Admin,Doctor,Nurse")]
    public async Task<ActionResult<SurgerySupplyDto>> AddSupply(Guid surgeryId, [FromBody] AddSurgerySupplyDto dto)
    {
        dto.SurgeryId = surgeryId;
        var result = await _surgeryService.AddSupplyAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thuốc
    /// </summary>
    [HttpPut("medicines/{itemId}")]
    [Authorize(Roles = "Admin,Doctor,Nurse")]
    public async Task<ActionResult<SurgeryMedicineDto>> UpdateMedicine(Guid itemId, [FromBody] AddSurgeryMedicineDto dto)
    {
        var result = await _surgeryService.UpdateMedicineAsync(itemId, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa thuốc
    /// </summary>
    [HttpDelete("medicines/{itemId}")]
    [Authorize(Roles = "Admin,Doctor,Nurse")]
    public async Task<ActionResult<bool>> RemoveMedicine(Guid itemId)
    {
        var result = await _surgeryService.RemoveMedicineAsync(itemId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa vật tư
    /// </summary>
    [HttpDelete("supplies/{itemId}")]
    [Authorize(Roles = "Admin,Doctor,Nurse")]
    public async Task<ActionResult<bool>> RemoveSupply(Guid itemId)
    {
        var result = await _surgeryService.RemoveSupplyAsync(itemId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng gói thuốc/VT
    /// </summary>
    [HttpPost("{surgeryId}/prescription/apply-package/{packageId}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryPrescriptionDto>> ApplyPackage(Guid surgeryId, Guid packageId)
    {
        var result = await _surgeryService.ApplyPackageAsync(surgeryId, packageId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm thuốc
    /// </summary>
    [HttpGet("medicines/search")]
    public async Task<ActionResult<List<MedicineDetailDto>>> SearchMedicines([FromQuery] string keyword, [FromQuery] Guid warehouseId)
    {
        var result = await _surgeryService.SearchMedicinesAsync(keyword, warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra cảnh báo thuốc
    /// </summary>
    [HttpGet("{surgeryId}/medicines/warnings")]
    public async Task<ActionResult<List<MedicineWarningDto>>> CheckMedicineWarnings(Guid surgeryId, [FromQuery] Guid medicineId)
    {
        var result = await _surgeryService.CheckMedicineWarningsAsync(surgeryId, medicineId);
        return Ok(result);
    }

    /// <summary>
    /// Xem thông tin chi tiết thuốc
    /// </summary>
    [HttpGet("medicines/{medicineId}/detail")]
    public async Task<ActionResult<MedicineDetailDto>> GetMedicineDetail(Guid medicineId, [FromQuery] Guid warehouseId)
    {
        var result = await _surgeryService.GetMedicineDetailAsync(medicineId, warehouseId);
        if (result == null) return NotFound();
        return Ok(result);
    }

    #endregion

    #region 6.5.1 Mẫu đơn thuốc

    /// <summary>
    /// Lấy danh sách mẫu đơn thuốc
    /// </summary>
    [HttpGet("prescription-templates")]
    public async Task<ActionResult<List<SurgeryPrescriptionTemplateDto>>> GetPrescriptionTemplates([FromQuery] Guid? surgeryServiceId)
    {
        var result = await _surgeryService.GetPrescriptionTemplatesAsync(GetUserId(), surgeryServiceId);
        return Ok(result);
    }

    /// <summary>
    /// Lưu mẫu đơn thuốc
    /// </summary>
    [HttpPost("prescription-templates")]
    public async Task<ActionResult<SurgeryPrescriptionTemplateDto>> SavePrescriptionTemplate([FromBody] SurgeryPrescriptionTemplateDto dto)
    {
        var result = await _surgeryService.SavePrescriptionTemplateAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng mẫu đơn thuốc
    /// </summary>
    [HttpPost("{surgeryId}/prescription/apply-template/{templateId}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryPrescriptionDto>> ApplyPrescriptionTemplate(Guid surgeryId, Guid templateId)
    {
        var result = await _surgeryService.ApplyPrescriptionTemplateAsync(surgeryId, templateId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Sao chép đơn thuốc cũ
    /// </summary>
    [HttpPost("{surgeryId}/prescription/copy/{sourceSurgeryId}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryPrescriptionDto>> CopyPrescription(Guid surgeryId, Guid sourceSurgeryId)
    {
        var result = await _surgeryService.CopyPrescriptionAsync(surgeryId, sourceSurgeryId, GetUserId());
        return Ok(result);
    }

    #endregion

    #region 6.6 Kê đơn máu trong PTTT

    /// <summary>
    /// Lấy kê đơn máu
    /// </summary>
    [HttpGet("{surgeryId}/blood-order")]
    public async Task<ActionResult<SurgeryBloodOrderDto>> GetBloodOrder(Guid surgeryId)
    {
        var result = await _surgeryService.GetBloodOrderAsync(surgeryId);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Tạo kê đơn máu
    /// </summary>
    [HttpPost("{surgeryId}/blood-order")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryBloodOrderDto>> CreateBloodOrder(Guid surgeryId, [FromBody] CreateBloodOrderDto dto)
    {
        dto.SurgeryId = surgeryId;
        var result = await _surgeryService.CreateBloodOrderAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật kê đơn máu
    /// </summary>
    [HttpPut("blood-orders/{orderId}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<SurgeryBloodOrderDto>> UpdateBloodOrder(Guid orderId, [FromBody] CreateBloodOrderDto dto)
    {
        var result = await _surgeryService.UpdateBloodOrderAsync(orderId, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách kho máu
    /// </summary>
    [HttpGet("blood-banks")]
    public async Task<ActionResult<List<BloodBankDto>>> GetBloodBanks()
    {
        var result = await _surgeryService.GetBloodBanksAsync();
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm chế phẩm máu
    /// </summary>
    [HttpGet("blood-products/search")]
    public async Task<ActionResult<List<BloodProductItemDto>>> SearchBloodProducts(
        [FromQuery] Guid bloodBankId,
        [FromQuery] string? bloodType,
        [FromQuery] string? rhFactor)
    {
        var result = await _surgeryService.SearchBloodProductsAsync(bloodBankId, bloodType, rhFactor);
        return Ok(result);
    }

    #endregion
}

#region Request DTOs

public class RejectRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SurgeryCancelRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SurgeryUpdateStatusRequest
{
    public int Status { get; set; }
}

public class DiagnosisRequest
{
    public string Diagnosis { get; set; } = string.Empty;
    public string IcdCode { get; set; } = string.Empty;
}

public class ChangeTeamMemberRequest
{
    public Guid OldMemberId { get; set; }
    public SurgeryTeamMemberRequestDto NewMember { get; set; } = new();
    public DateTime ChangeTime { get; set; }
}

#endregion
