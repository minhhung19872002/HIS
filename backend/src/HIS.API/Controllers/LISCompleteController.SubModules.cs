using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs.Laboratory;
using ApproveLabResultDto = HIS.Application.Services.ApproveLabResultDto;
using HIS.API.Dtos.LISComplete;
using HIS.API.Extensions;
using ApiResponse = HIS.Application.DTOs.Common.ApiResponse<object>;

namespace HIS.API.Controllers
{
    public partial class LISCompleteController : ControllerBase
    {
    // ════════════════════════════════════════════════════════════════════════════════════════
    // Wave-2 (2026-09-15): everything below used to return HARD-CODED FAKE rows (random Guids,
    // "Bệnh nhân 001", fixed Roche/Sysmex lots, 10 invented reagents, 12 invented screening requests).
    // Now: sample storage/tracking + IQC read real data (ServiceRequestDetails / LabQCResults / LabQCLots);
    // reagents + screening have no backing tables → honest empty lists and 501 for writes.
    // ════════════════════════════════════════════════════════════════════════════════════════

    private const string ReagentNotSupported =
        "Quản lý hóa chất chưa có bảng dữ liệu (LabReagents/LabReagentUsages) — chức năng ghi chưa được hỗ trợ.";
    private const string ScreeningNotSupported =
        "Sàng lọc sơ sinh/trước sinh chưa có bảng dữ liệu (LabScreeningRequests/Results) — chức năng ghi chưa được hỗ trợ.";

    private ObjectResult NotImplementedResult(string message) => StatusCode(501, ApiResponse.Fail(message));

    // ─── IQC (nội kiểm) ──────────────────────────────────────────────────────────

    /// <summary>Danh sách lô QC — LabQCLots (sau migration) hoặc suy ra từ LabQCResults.</summary>
    [HttpGet("qc/lots")]
    public async Task<ActionResult> GetQCLots([FromQuery] string? testCode = null, [FromQuery] bool? isActive = null)
        => Ok(await _lisService.GetQCLotsAsync(testCode, isActive));

    [HttpPost("qc/lots")]
    public async Task<ActionResult> CreateQCLot([FromBody] SaveQCLotDto dto)
    {
        try { return Ok(await _lisService.SaveQCLotAsync(null, dto, GetUserId())); }
        catch (NotSupportedException ex) { return NotImplementedResult(ex.Message); }
    }

    [HttpPut("qc/lots/{id:guid}")]
    public async Task<ActionResult> UpdateQCLot(Guid id, [FromBody] SaveQCLotDto dto)
    {
        try { return Ok(await _lisService.SaveQCLotAsync(id, dto, GetUserId())); }
        catch (NotSupportedException ex) { return NotImplementedResult(ex.Message); }
    }

    [HttpDelete("qc/lots/{id:guid}")]
    public async Task<ActionResult> DeleteQCLot(Guid id)
    {
        try
        {
            return await _lisService.DeleteQCLotAsync(id) ? NoContent() : NotFound(ApiResponse.Fail("Không tìm thấy lô QC"));
        }
        catch (NotSupportedException ex) { return NotImplementedResult(ex.Message); }
    }

    /// <summary>Kết quả QC — LabQCResults.</summary>
    [HttpGet("qc/results")]
    public async Task<ActionResult> GetQCResults(
        [FromQuery] string? testCode = null,
        [FromQuery] string? lotNumber = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
        => Ok(await _lisService.GetQCResultsAsync(testCode, lotNumber, fromDate, toDate));

    // ─── Lưu trữ mẫu (ServiceRequestDetails.SampleLocation) ──────────────────────

    [HttpGet("sample-storage")]
    public async Task<ActionResult> GetSampleStorageRecords([FromQuery] string? status = null, [FromQuery] string? keyword = null)
        => Ok(await _lisService.GetStoredSamplesAsync(keyword));

    [HttpGet("sample-storage/barcode/{barcode}")]
    public async Task<ActionResult> GetStoredSampleByBarcode(string barcode)
    {
        var rec = await _lisService.GetSampleByBarcodeAsync(barcode);
        return rec == null ? NotFound(ApiResponse.Fail("Không tìm thấy mẫu với barcode này")) : Ok(rec);
    }

    [HttpGet("sample-storage/locations")]
    public async Task<ActionResult> GetStorageLocations() => Ok(await _lisService.GetStorageLocationsAsync());

    /// <summary>No temperature/retention data is recorded anywhere → no alerts (instead of invented ones).</summary>
    [HttpGet("sample-storage/alerts")]
    public ActionResult GetStorageAlerts() => Ok(new List<object>());

    /// <summary>Hủy mẫu lưu trữ — needs a storage-status column (proposed) to be distinguishable from "lấy ra".</summary>
    [HttpPost("sample-storage/{id:guid}/dispose")]
    public ActionResult DisposeStoredSample(Guid id)
        => NotImplementedResult("Hủy mẫu lưu trữ chưa được hỗ trợ (chưa có cột trạng thái lưu trữ) — dùng \"Lấy ra\".");

    // ─── Sàng lọc (no backing tables) ────────────────────────────────────────────

    [HttpGet("screening/requests")]
    public ActionResult GetScreeningRequests([FromQuery] string? type = null, [FromQuery] string? status = null)
        => Ok(new List<object>());

    [HttpGet("screening/programs")]
    public ActionResult GetScreeningPrograms() => Ok(new List<object>());

    [HttpPost("screening/requests")]
    public ActionResult CreateScreeningRequest([FromBody] System.Text.Json.JsonElement body)
        => NotImplementedResult(ScreeningNotSupported);

    // ─── Hóa chất (no backing tables) ────────────────────────────────────────────

    [HttpGet("reagents")]
    public ActionResult GetReagents([FromQuery] string? keyword = null, [FromQuery] string? status = null)
        => Ok(new List<object>());

    [HttpGet("reagents/usage")]
    public ActionResult GetReagentUsage([FromQuery] Guid? reagentId = null, [FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
        => Ok(new List<object>());

    [HttpGet("reagents/alerts")]
    public ActionResult GetReagentAlerts() => Ok(new List<object>());

    [HttpGet("reagents/inventory")]
    public ActionResult GetReagentInventory() => Ok(new List<object>());

    [HttpPost("reagents")]
    public ActionResult CreateReagent([FromBody] System.Text.Json.JsonElement body) => NotImplementedResult(ReagentNotSupported);

    [HttpPut("reagents/{id:guid}")]
    public ActionResult UpdateReagent(Guid id, [FromBody] System.Text.Json.JsonElement body) => NotImplementedResult(ReagentNotSupported);

    [HttpDelete("reagents/{id:guid}")]
    public ActionResult DeleteReagent(Guid id) => NotImplementedResult(ReagentNotSupported);

    [HttpPost("reagents/usage")]
    public ActionResult RecordReagentUsage([FromBody] System.Text.Json.JsonElement body) => NotImplementedResult(ReagentNotSupported);

    // ─── Theo dõi mẫu (ServiceRequestDetails) ────────────────────────────────────

    [HttpGet("sample-tracking/rejections")]
    public async Task<ActionResult> GetSampleRejections(
        [FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null, [FromQuery] string? keyword = null)
        => Ok(await _lisService.GetSampleRejectionsAsync(fromDate, toDate, keyword));

    [HttpGet("sample-tracking/summary")]
    public async Task<ActionResult> GetSampleTrackingSummary([FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
        => Ok(await _lisService.GetSampleTrackingSummaryAsync(fromDate, toDate));

    [HttpGet("sample-tracking/{barcode}/timeline")]
    public async Task<ActionResult> GetSampleTimeline(string barcode)
        => Ok(await _lisService.GetSampleTimelineAsync(barcode));

    /// <summary>Lý do từ chối mẫu — a code list (configuration); codes match the v2 reject form.</summary>
    [HttpGet("sample-tracking/rejection-reasons")]
    public ActionResult GetRejectionReasons()
    {
        return Ok(new[]
        {
            new { code = "HEM", label = "Mẫu vỡ hồng cầu", category = "quality" },
            new { code = "CLT", label = "Mẫu đông", category = "quality" },
            new { code = "QNS", label = "Không đủ lượng mẫu", category = "quantity" },
            new { code = "WRG", label = "Sai ống/loại mẫu", category = "collection" },
            new { code = "LBL", label = "Sai nhãn/không nhãn", category = "identification" },
            new { code = "TMP", label = "Nhiệt độ không đạt", category = "transport" },
            new { code = "OLD", label = "Mẫu quá hạn", category = "transport" },
        });
    }

    // #14b: operations on ServiceRequestDetail (model 1) — id mẫu = SRD id. Wave-2: also accept the v2 FE
    // body shape (by barcode) and the v2 routes /sample-storage/{id}/retrieve, /rejections/{id}/undo|recollect.

    /// <summary>Resolve target SRD ids: barcode (whole tube, optionally one request) or an explicit SampleId.</summary>
    private async Task<List<Guid>> ResolveSampleIdsAsync(Guid? sampleId, string? barcode, string? labRequestId = null)
    {
        if (!string.IsNullOrWhiteSpace(barcode))
            return await _lisService.GetDetailIdsByBarcodeAsync(barcode,
                Guid.TryParse(labRequestId, out var srId) ? srId : null);
        return sampleId.HasValue ? new List<Guid> { sampleId.Value } : new List<Guid>();
    }

    [HttpPost("sample-storage/store")]
    public async Task<IActionResult> StoreSample([FromBody] StoreSampleRequest dto)
    {
        var location = (dto.StorageLocation ?? dto.Location)?.Trim();
        if (string.IsNullOrEmpty(location)) return BadRequest(ApiResponse.Fail("Chưa nhập vị trí lưu trữ"));
        var ids = await ResolveSampleIdsAsync(dto.SampleId, dto.SampleBarcode);
        var stored = 0;
        foreach (var id in ids)
            if (await _lisService.StoreSampleAsync(id, location, GetUserId())) stored++;
        if (stored == 0) return NotFound(ApiResponse.Fail("Mẫu không tồn tại"));
        return Ok(new { message = $"Đã lưu trữ mẫu tại {location}", stored });
    }

    [HttpPost("sample-storage/retrieve")]
    public async Task<IActionResult> RetrieveSample([FromBody] RetrieveSampleRequest dto)
        => dto.SampleId.HasValue ? await RetrieveTubeAsync(dto.SampleId.Value) : BadRequest(ApiResponse.Fail("Thiếu sampleId"));

    [HttpPost("sample-storage/{id:guid}/retrieve")]
    public Task<IActionResult> RetrieveSampleById(Guid id, [FromBody] RetrieveSampleRequest? dto) => RetrieveTubeAsync(id);

    /// <summary>A stored record is a tube → take every test sharing its barcode out of storage.</summary>
    private async Task<IActionResult> RetrieveTubeAsync(Guid id)
    {
        var ok = false;
        foreach (var sid in await _lisService.GetTubeDetailIdsAsync(id))
            ok |= await _lisService.RetrieveSampleAsync(sid, GetUserId());
        if (!ok) return NotFound(ApiResponse.Fail("Mẫu không tồn tại"));
        return Ok(new { message = "Đã lấy mẫu ra khỏi kho" });
    }

    [HttpPost("sample-tracking/reject")]
    public async Task<IActionResult> RejectSample([FromBody] RejectSampleRequest dto)
    {
        var label = (dto.RejectionReason ?? dto.Reason)?.Trim();
        if (string.IsNullOrEmpty(label) && string.IsNullOrWhiteSpace(dto.RejectionCode))
            return BadRequest(ApiResponse.Fail("Phải nhập lý do từ chối"));
        // Stored as "CODE - label: notes" so the rejection list can split code and reason again
        var reason = string.IsNullOrWhiteSpace(dto.RejectionCode) ? label : $"{dto.RejectionCode.Trim()} - {label}";
        if (!string.IsNullOrWhiteSpace(dto.Notes)) reason += $": {dto.Notes.Trim()}";
        var ids = await ResolveSampleIdsAsync(dto.SampleId, dto.SampleBarcode, dto.LabRequestId);
        var rejected = 0;
        foreach (var id in ids)
            if (await _lisService.RejectSampleAsync(id, reason, GetUserId())) rejected++;
        if (rejected == 0) return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy mẫu." });
        return Ok(new { rejected });
    }

    [HttpPost("sample-tracking/undo-reject")]
    public async Task<IActionResult> UndoRejectSample([FromBody] UndoRejectRequest dto)
    {
        if (!dto.SampleId.HasValue) return BadRequest(ApiResponse.Fail("Thiếu sampleId"));
        var ok = await _lisService.UndoRejectSampleAsync(dto.SampleId.Value, GetUserId());
        if (!ok) return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy dữ liệu." });
        return Ok();
    }

    [HttpPost("sample-tracking/rejections/{id:guid}/undo")]
    public async Task<IActionResult> UndoRejectionById(Guid id, [FromBody] UndoRejectRequest? dto)
    {
        var ok = await _lisService.UndoRejectSampleAsync(id, GetUserId());
        if (!ok) return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy dữ liệu." });
        return Ok();
    }

    /// <summary>Lấy lại mẫu sau khi từ chối = hủy lấy mẫu (bước 3 chuỗi hủy) → dòng quay về "Chờ lấy mẫu".</summary>
    [HttpPost("sample-tracking/rejections/{id:guid}/recollect")]
    public async Task<IActionResult> RecollectRejectedSample(Guid id)
        => (await _cancelChain.CancelCollectionAsync(
                new HIS.Application.DTOs.LabCancelChain.CancelRequest(id, "Lấy lại mẫu sau khi từ chối"),
                GetUserId() ?? Guid.Empty)).ToActionResult();

    /// <summary>
    /// Màn hình hiển thị hàng đợi xét nghiệm (public API, không cần đăng nhập)
    /// </summary>
    [HttpGet("queue/display")]
    [AllowAnonymous]
    public async Task<ActionResult<LabQueueDisplayDto>> GetLabQueueDisplay()
    {
        var result = await _lisService.GetLabQueueDisplayAsync();
        if (result != null)
        {
            // Endpoint anonymous (màn hình TV) không được lộ họ tên đầy đủ + mã BN (#406)
            foreach (var item in result.ProcessingItems.Concat(result.WaitingItems).Concat(result.CompletedItems))
            {
                item.PatientName = HIS.Core.Common.NameMask.Mask(item.PatientName);
                item.PatientCode = null;
            }
        }
        return Ok(result);
    }

    #region NangCap26 — LIS #29 Ngoại kiểm (EQA) + LIS #15 Đơn vị gửi mẫu

    /// <summary>Danh mục xét nghiệm ngoại kiểm.</summary>
    [HttpGet("eqa/tests")]
    public async Task<ActionResult<List<LabEqaTestDto>>> GetEqaTests([FromQuery] bool activeOnly = true)
        => Ok(await _lisService.GetEqaTestsAsync(activeOnly));

    [HttpPost("eqa/tests")]
    public async Task<ActionResult<LabEqaTestDto>> SaveEqaTest([FromBody] LabEqaTestDto dto)
        => Ok(await _lisService.SaveEqaTestAsync(dto, GetUserId() ?? Guid.Empty));

    [HttpDelete("eqa/tests/{id}")]
    public async Task<IActionResult> DeleteEqaTest(Guid id)
    {
        await _lisService.DeleteEqaTestAsync(id, GetUserId() ?? Guid.Empty);
        return NoContent();
    }

    /// <summary>Danh sách đợt ngoại kiểm (tiếp nhận bàn giao mẫu).</summary>
    [HttpGet("eqa/batches")]
    public async Task<ActionResult<List<LabEqaBatchDto>>> GetEqaBatches(
        [FromQuery] string? status, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        => Ok(await _lisService.GetEqaBatchesAsync(status, fromDate, toDate));

    [HttpGet("eqa/batches/{id}")]
    public async Task<ActionResult<LabEqaBatchDto>> GetEqaBatch(Guid id)
        => Ok(await _lisService.GetEqaBatchAsync(id));

    [HttpPost("eqa/batches")]
    public async Task<ActionResult<LabEqaBatchDto>> SaveEqaBatch([FromBody] SaveLabEqaBatchDto dto)
        => Ok(await _lisService.SaveEqaBatchAsync(dto, GetUserId() ?? Guid.Empty));

    /// <summary>Chuyển trạng thái đợt: Received → Running → Reported → Closed.</summary>
    [HttpPost("eqa/batches/{id}/status")]
    public async Task<ActionResult<LabEqaBatchDto>> SetEqaBatchStatus(Guid id, [FromBody] EqaStatusRequest req)
        => Ok(await _lisService.SetEqaBatchStatusAsync(id, req?.Status ?? string.Empty, GetUserId() ?? Guid.Empty));

    /// <summary>Đăng ký chạy mẫu / nhập kết quả ngoại kiểm.</summary>
    [HttpPost("eqa/results")]
    public async Task<ActionResult<LabEqaResultDto>> SaveEqaResult([FromBody] SaveLabEqaResultDto dto)
        => Ok(await _lisService.SaveEqaResultAsync(dto, GetUserId() ?? Guid.Empty));

    [HttpDelete("eqa/results/{id}")]
    public async Task<IActionResult> DeleteEqaResult(Guid id)
    {
        await _lisService.DeleteEqaResultAsync(id, GetUserId() ?? Guid.Empty);
        return NoContent();
    }

    /// <summary>Danh mục đơn vị gửi mẫu.</summary>
    [HttpGet("sending-units")]
    public async Task<ActionResult<List<LabSendingUnitDto>>> GetSendingUnits([FromQuery] bool activeOnly = true)
        => Ok(await _lisService.GetSendingUnitsAsync(activeOnly));

    [HttpPost("sending-units")]
    public async Task<ActionResult<LabSendingUnitDto>> SaveSendingUnit([FromBody] LabSendingUnitDto dto)
        => Ok(await _lisService.SaveSendingUnitAsync(dto, GetUserId() ?? Guid.Empty));

    [HttpDelete("sending-units/{id}")]
    public async Task<IActionResult> DeleteSendingUnit(Guid id)
    {
        await _lisService.DeleteSendingUnitAsync(id, GetUserId() ?? Guid.Empty);
        return NoContent();
    }

    /// <summary>Import đơn vị gửi mẫu từ Excel (client parse file → gửi mảng dòng).</summary>
    [HttpPost("sending-units/import")]
    public async Task<ActionResult<object>> ImportSendingUnits([FromBody] List<LabSendingUnitDto> rows)
        => Ok(new { imported = await _lisService.ImportSendingUnitsAsync(rows, GetUserId() ?? Guid.Empty) });

    public class EqaStatusRequest { public string Status { get; set; } = string.Empty; }

    #endregion
    }
}
