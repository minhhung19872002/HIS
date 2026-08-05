using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Filters;
using HIS.Application.Services;
using HIS.Application.DTOs.Common;
using HIS.Application.DTOs.Radiology;
using HIS.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using HIS.API.Dtos.RISComplete;

namespace HIS.API.Controllers
{
    public partial class RISCompleteController
    {
        /// <summary>
        /// Lấy danh sách cấu hình HL7 CDA
        /// </summary>
        [HttpGet("hl7-cda/configs")]
        public async Task<ActionResult<List<HL7CDAConfigDto>>> GetHL7CDAConfigs()
        {
            var result = await _risService.GetHL7CDAConfigsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Lưu cấu hình HL7 CDA
        /// </summary>
        [HttpPost("hl7-cda/configs")]
        public async Task<ActionResult<HL7CDAConfigDto>> SaveHL7CDAConfig([FromBody] SaveHL7CDAConfigDto dto)
        {
            var result = await _risService.SaveHL7CDAConfigAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa cấu hình HL7 CDA
        /// </summary>
        [HttpDelete("hl7-cda/configs/{configId}")]
        public async Task<ActionResult> DeleteHL7CDAConfig(Guid configId)
        {
            await _risService.DeleteHL7CDAConfigAsync(configId);
            return NoContent();
        }

        /// <summary>
        /// Kiểm tra kết nối HL7
        /// </summary>
        [HttpGet("hl7-cda/configs/{configId}/test-connection")]
        public async Task<ActionResult> TestHL7Connection(Guid configId)
        {
            var result = await _risService.TestHL7ConnectionAsync(configId);
            return Ok(new { connected = result });
        }

        /// <summary>
        /// Gửi HL7 message
        /// </summary>
        [HttpPost("hl7-cda/send-message")]
        public async Task<ActionResult<SendHL7ResultDto>> SendHL7Message([FromBody] SendHL7MessageDto dto)
        {
            var result = await _risService.SendHL7MessageAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách HL7 messages theo ngày
        /// </summary>
        [HttpGet("hl7-cda/messages")]
        public async Task<ActionResult<HL7MessageSearchResultDto>> GetHL7Messages(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var searchDto = new SearchHL7MessageDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                Page = 1,
                PageSize = 50
            };
            var result = await _risService.SearchHL7MessagesAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Tìm kiếm HL7 messages
        /// </summary>
        [HttpPost("hl7-cda/messages/search")]
        public async Task<ActionResult<HL7MessageSearchResultDto>> SearchHL7Messages([FromBody] SearchHL7MessageDto searchDto)
        {
            var result = await _risService.SearchHL7MessagesAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Retry gửi HL7 message lỗi
        /// </summary>
        [HttpPost("hl7-cda/messages/{messageId}/retry")]
        public async Task<ActionResult> RetryHL7Message(Guid messageId)
        {
            await _risService.RetryHL7MessageAsync(messageId);
            return Ok();
        }

        /// <summary>
        /// Tạo tài liệu CDA
        /// </summary>
        [HttpPost("hl7-cda/documents")]
        public async Task<ActionResult<CDADocumentDto>> CreateCDADocument([FromBody] CreateCDADocumentDto dto)
        {
            var result = await _risService.CreateCDADocumentAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy tài liệu CDA
        /// </summary>
        [HttpGet("hl7-cda/documents/{documentId}")]
        public async Task<ActionResult<CDADocumentDto>> GetCDADocument(Guid documentId)
        {
            var result = await _risService.GetCDADocumentAsync(documentId);
            return Ok(result);
        }

        /// <summary>
        /// Gửi tài liệu CDA
        /// </summary>
        [HttpPost("hl7-cda/documents/send")]
        public async Task<ActionResult> SendCDADocument([FromBody] SendCDADocumentDto dto)
        {
            await _risService.SendCDADocumentAsync(dto);
            return Ok();
        }

        /// <summary>
        /// Nhận chỉ định từ HIS qua HL7
        /// </summary>
        [HttpPost("hl7-cda/receive-order")]
        public async Task<ActionResult> ReceiveHL7Order([FromBody] ReceiveHL7OrderRequest request)
        {
            var orderId = await _risService.ReceiveHL7OrderAsync(request.HL7Message);
            return Ok(new { orderId });
        }

        /// <summary>
        /// Gửi kết quả về HIS qua HL7
        /// </summary>
        [HttpPost("hl7-cda/reports/{reportId}/send-result")]
        public async Task<ActionResult<SendHL7ResultDto>> SendHL7Result(Guid reportId, [FromQuery] bool withSignature = false)
        {
            var result = await _risService.SendHL7ResultAsync(reportId, withSignature);
            return Ok(result);
        }

        /// <summary>
        /// Hủy kết quả đã gửi về HIS
        /// </summary>
        [HttpPost("hl7-cda/reports/{reportId}/cancel-result")]
        public async Task<ActionResult> CancelHL7Result(Guid reportId, [FromBody] CancelHL7ResultRequest request)
        {
            await _risService.CancelHL7ResultAsync(reportId, request.Reason);
            return Ok();
        }

        /// <summary>
        /// Lấy danh mục hướng dẫn
        /// </summary>
        [HttpGet("help/categories")]
        public async Task<ActionResult<List<HelpCategoryDto>>> GetHelpCategories([FromQuery] Guid? parentId = null)
        {
            var result = await _risService.GetHelpCategoriesAsync(parentId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu danh mục hướng dẫn
        /// </summary>
        [HttpPost("help/categories")]
        public async Task<ActionResult<HelpCategoryDto>> SaveHelpCategory([FromBody] SaveHelpCategoryDto dto)
        {
            var result = await _risService.SaveHelpCategoryAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa danh mục hướng dẫn
        /// </summary>
        [HttpDelete("help/categories/{categoryId}")]
        public async Task<ActionResult> DeleteHelpCategory(Guid categoryId)
        {
            await _risService.DeleteHelpCategoryAsync(categoryId);
            return NoContent();
        }

        /// <summary>
        /// Tìm kiếm bài viết hướng dẫn
        /// </summary>
        [HttpPost("help/articles/search")]
        public async Task<ActionResult<HelpSearchResultDto>> SearchHelpArticles([FromBody] SearchHelpDto searchDto)
        {
            var result = await _risService.SearchHelpArticlesAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết bài viết
        /// </summary>
        [HttpGet("help/articles/{articleId}")]
        public async Task<ActionResult<HelpArticleDto>> GetHelpArticle(Guid articleId)
        {
            // Tăng lượt xem
            await _risService.IncrementArticleViewCountAsync(articleId);
            var result = await _risService.GetHelpArticleAsync(articleId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu bài viết hướng dẫn
        /// </summary>
        [HttpPost("help/articles")]
        public async Task<ActionResult<HelpArticleDto>> SaveHelpArticle([FromBody] SaveHelpArticleDto dto)
        {
            var result = await _risService.SaveHelpArticleAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa bài viết hướng dẫn
        /// </summary>
        [HttpDelete("help/articles/{articleId}")]
        public async Task<ActionResult> DeleteHelpArticle(Guid articleId)
        {
            await _risService.DeleteHelpArticleAsync(articleId);
            return NoContent();
        }

        /// <summary>
        /// Lấy danh sách troubleshooting
        /// </summary>
        [HttpGet("help/troubleshooting")]
        public async Task<ActionResult<List<TroubleshootingDto>>> GetTroubleshootingList(
            [FromQuery] string module = null,
            [FromQuery] int? severity = null)
        {
            var result = await _risService.GetTroubleshootingListAsync(module, severity);
            return Ok(result);
        }

        /// <summary>
        /// Lưu troubleshooting
        /// </summary>
        [HttpPost("help/troubleshooting")]
        public async Task<ActionResult<TroubleshootingDto>> SaveTroubleshooting([FromBody] SaveTroubleshootingDto dto)
        {
            var result = await _risService.SaveTroubleshootingAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa troubleshooting
        /// </summary>
        [HttpDelete("help/troubleshooting/{troubleshootingId}")]
        public async Task<ActionResult> DeleteTroubleshooting(Guid troubleshootingId)
        {
            await _risService.DeleteTroubleshootingAsync(troubleshootingId);
            return NoContent();
        }

        /// <summary>
        /// Lấy cấu hình màn hình CLS
        /// </summary>
        [HttpGet("cls-screen/config")]
        public async Task<ActionResult<CLSScreenConfigDto>> GetCLSScreenConfig()
        {
            var result = await _risService.GetCLSScreenConfigAsync();
            return Ok(result);
        }

        /// <summary>
        /// Lưu cấu hình màn hình CLS
        /// </summary>
        [HttpPost("cls-screen/config")]
        public async Task<ActionResult<CLSScreenConfigDto>> SaveCLSScreenConfig([FromBody] SaveCLSScreenConfigDto dto)
        {
            var result = await _risService.SaveCLSScreenConfigAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách mẫu mô tả theo dịch vụ
        /// </summary>
        [HttpGet("services/{serviceId}/description-templates")]
        public async Task<ActionResult<List<ServiceDescriptionTemplateDto>>> GetServiceDescriptionTemplates(Guid serviceId)
        {
            var result = await _risService.GetServiceDescriptionTemplatesAsync(serviceId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu mẫu mô tả dịch vụ
        /// </summary>
        [HttpPost("services/description-templates")]
        public async Task<ActionResult<ServiceDescriptionTemplateDto>> SaveServiceDescriptionTemplate([FromBody] SaveServiceDescriptionTemplateDto dto)
        {
            var result = await _risService.SaveServiceDescriptionTemplateAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa mẫu mô tả dịch vụ
        /// </summary>
        [HttpDelete("services/description-templates/{templateId}")]
        public async Task<ActionResult> DeleteServiceDescriptionTemplate(Guid templateId)
        {
            await _risService.DeleteServiceDescriptionTemplateAsync(templateId);
            return NoContent();
        }

        /// <summary>
        /// Lấy lịch sử chẩn đoán ca chụp
        /// </summary>
        [HttpGet("requests/{requestId}/diagnosis-history")]
        public async Task<ActionResult<List<DiagnosisHistoryDto>>> GetDiagnosisHistory(Guid requestId)
        {
            var result = await _risService.GetDiagnosisHistoryAsync(requestId);
            return Ok(result);
        }

        /// <summary>
        /// Lấy lịch sử chụp chiếu của bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/exam-history")]
        public async Task<ActionResult<List<RadiologyWaitingListDto>>> GetPatientExamHistory(
            Guid patientId,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _risService.GetPatientExamHistoryAsync(patientId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Export DICOM study as ZIP archive from Orthanc PACS
        /// </summary>
        [HttpGet("dicom/export/{studyId}")]
        public async Task<IActionResult> ExportDicomStudy(string studyId, [FromQuery] string format = "zip")
        {
            var data = await _risService.ExportDicomStudyAsync(studyId, format);
            if (data == null || data.Length == 0)
                return NotFound(ApiResponse<object>.Fail("Study not found or export failed"));

            var contentType = format == "dicomdir" ? "application/dicom" : "application/zip";
            var fileName = $"study_{studyId}.{(format == "dicomdir" ? "dcm" : "zip")}";
            return File(data, contentType, fileName);
        }

        /// <summary>
        /// Send DICOM study to remote PACS server via C-STORE
        /// </summary>
        [HttpPost("dicom/send")]
        public async Task<ActionResult<DicomSendResultDto>> SendDicomToRemote([FromBody] DicomSendRequest request)
        {
            var result = await _risService.SendDicomToRemoteAsync(request);
            return Ok(result);
        }

        /// <summary>Study Root C-FIND against a configured remote PACS.</summary>
        [HttpPost("dicom/remote-servers/{serverId}/query")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult<RemoteDicomQueryResultDto>> QueryRemotePacs(
            Guid serverId,
            [FromBody] RemoteDicomQueryRequestDto request)
        {
            var result = await _risService.QueryRemotePacsAsync(serverId, request);
            return result.Success ? Ok(result) : StatusCode(StatusCodes.Status502BadGateway, result);
        }

        /// <summary>Retrieve one remote study into the local PACS using C-MOVE or C-GET.</summary>
        [HttpPost("dicom/remote-servers/{serverId}/retrieve")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult<RemoteDicomRetrieveResultDto>> RetrieveRemoteStudy(
            Guid serverId,
            [FromBody] RemoteDicomRetrieveRequestDto request)
        {
            var result = await _risService.RetrieveRemoteStudyAsync(serverId, request);
            return result.Success ? Ok(result) : StatusCode(StatusCodes.Status502BadGateway, result);
        }

        /// <summary>
        /// Get list of configured remote PACS servers
        /// </summary>
        [HttpGet("dicom/remote-servers")]
        public async Task<ActionResult<List<RemotePacsServerDto>>> GetRemoteServers()
        {
            var result = await _risService.GetRemoteServersAsync();
            return Ok(result);
        }

        /// <summary>
        /// Create or update remote PACS server configuration
        /// </summary>
        [HttpPost("dicom/remote-servers")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<RemotePacsServerDto>> SaveRemoteServer([FromBody] RemotePacsServerDto dto)
        {
            var result = await _risService.SaveRemoteServerAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Delete remote PACS server configuration
        /// </summary>
        [HttpDelete("dicom/remote-servers/{id}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<bool>> DeleteRemoteServer(Guid id)
        {
            var result = await _risService.DeleteRemoteServerAsync(id);
            return Ok(result);
        }

        /// <summary>
        /// Bulk download DICOM theo danh sách studyId, kèm tùy chọn anonymize PHI.
        /// Trả về ZIP chứa từng study con.
        ///
        /// Khi Anonymize=true: với mỗi study, gọi Orthanc POST /studies/{id}/anonymize để loại bỏ
        /// PHI thật trong DICOM tag (0010,xxxx), archive bản ẩn danh, rồi DELETE bản copy trên Orthanc.
        /// Lỗi anonymize 1 study → skip study đó + ghi log, KHÔNG fail cả batch.
        /// PACS không khả dụng → toàn bộ entry bỏ qua (data.Length == 0).
        /// </summary>
        [HttpPost("dicom/bulk-export")]
        public async Task<IActionResult> BulkExportDicom([FromBody] BulkDicomExportRequest request)
        {
            if (request.StudyIds == null || request.StudyIds.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("Cần ít nhất 1 studyId"));
            if (request.StudyIds.Count > 50)
                return BadRequest(ApiResponse<object>.Fail("Tối đa 50 study mỗi lần tải"));

            var skipped = new List<string>();

            // Collect bytes for each study, zip them together
            using var memStream = new System.IO.MemoryStream();
            using (var zipArchive = new System.IO.Compression.ZipArchive(memStream,
                System.IO.Compression.ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var studyId in request.StudyIds)
                {
                    try
                    {
                        byte[] data;
                        if (request.Anonymize)
                        {
                            // Gọi Orthanc anonymize thật — loại bỏ PHI trong DICOM tag
                            data = await _risService.ExportDicomStudyAnonymizedAsync(studyId);
                        }
                        else
                        {
                            data = await _risService.ExportDicomStudyAsync(studyId, "zip");
                        }

                        if (data == null || data.Length == 0)
                        {
                            skipped.Add(studyId);
                            continue;
                        }

                        var prefix = request.Anonymize ? "anon" : "study";
                        var entryName = $"{prefix}_{studyId[..Math.Min(8, studyId.Length)]}.zip";
                        var entry = zipArchive.CreateEntry(entryName,
                            System.IO.Compression.CompressionLevel.Fastest);
                        using var entryStream = entry.Open();
                        await entryStream.WriteAsync(data);
                    }
                    catch (Exception ex)
                    {
                        // Ghi log nhưng không fail cả batch
                        _logger.LogWarning(ex,
                            "BulkExportDicom: skipping study {StudyId} due to error: {Message}",
                            studyId, ex.Message);
                        skipped.Add(studyId);
                    }
                }
            }

            memStream.Seek(0, System.IO.SeekOrigin.Begin);
            var zipBytes = memStream.ToArray();

            // Nếu không có study nào thành công → báo lỗi rõ thay vì trả ZIP rỗng
            if (zipBytes.Length < 22) // ZIP end-of-central-directory record tối thiểu 22 bytes
                return StatusCode(422, ApiResponse<object>.Fail(
                    "Không tải được dữ liệu DICOM cho bất kỳ study nào. PACS có thể không khả dụng.",
                    new Dictionary<string, string[]> { ["skipped"] = skipped.ToArray() }));

            var fileName = request.Anonymize ? "bulk_anon_export.zip" : "bulk_export.zip";
            // Đính kèm danh sách study bị bỏ qua vào header để caller biết
            if (skipped.Count > 0)
                Response.Headers["X-Skipped-Studies"] = string.Join(",", skipped);

            return File(zipBytes, "application/zip", fileName);
        }

        /// <summary>
        /// Duyệt hàng loạt kết quả CĐHA theo danh sách resultId.
        /// Mỗi entry được duyệt độc lập; lỗi 1 entry không fail cả batch.
        /// Trả về số duyệt thành công và danh sách entry bị bỏ qua.
        /// POST /api/RISComplete/results/bulk-approve
        /// </summary>
        [HttpPost("results/bulk-approve")]
        public async Task<IActionResult> BulkApproveResults([FromBody] BulkApproveRequest request)
        {
            if (request.ResultIds == null || request.ResultIds.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("Cần ít nhất 1 resultId"));
            if (request.ResultIds.Count > 100)
                return BadRequest(ApiResponse<object>.Fail("Tối đa 100 kết quả mỗi lần duyệt"));

            var userId = GetUserId();
            var approved = new List<Guid>();
            var skipped = new List<string>();

            foreach (var resultId in request.ResultIds)
            {
                try
                {
                    var dto = new HIS.Application.DTOs.Radiology.ApproveRadiologyResultDto
                    {
                        ResultId = resultId,
                        Note = request.Note,
                        IsFinalApproval = true,
                        ApprovingUserId = userId == Guid.Empty ? (Guid?)null : userId,
                    };
                    await _risService.FinalApproveResultAsync(dto);
                    approved.Add(resultId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "BulkApproveResults: skipping resultId {ResultId}: {Message}",
                        resultId, ex.Message);
                    skipped.Add(resultId.ToString());
                }
            }

            return Ok(new
            {
                approvedCount = approved.Count,
                skippedCount = skipped.Count,
                skipped,
            });
        }

        /// <summary>
        /// Toggle ghim / bo ghim ca chup yeu thich. Tra ve trang thai sau toggle.
        /// POST /api/RISComplete/favorites/toggle
        /// </summary>
        [HttpPost("favorites/toggle")]
        public async Task<IActionResult> ToggleFavorite([FromBody] HIS.Application.DTOs.Radiology.ToggleFavoriteDto dto)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();
            var result = await _risService.ToggleFavoriteAsync(dto.RequestId, userId);
            return Ok(result);
        }

        /// <summary>
        /// Lay danh sach ca chup yeu thich cua user dang dang nhap.
        /// GET /api/RISComplete/favorites
        /// </summary>
        [HttpGet("favorites")]
        public async Task<IActionResult> GetFavorites()
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();
            var list = await _risService.GetFavoritesAsync(userId);
            return Ok(list);
        }

        /// <summary>
        /// Kiem tra 1 ca chup co dang duoc user hien tai ghim hay khong.
        /// GET /api/RISComplete/favorites/check/{requestId}
        /// </summary>
        [HttpGet("favorites/check/{requestId:guid}")]
        public async Task<IActionResult> IsFavorited(Guid requestId)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();
            var isFav = await _risService.IsFavoritedAsync(requestId, userId);
            return Ok(new { isFavorited = isFav, requestId });
        }

        /// <summary>
        /// Them BS dong doc vao mot report.
        /// POST /api/RISComplete/coreaders
        /// </summary>
        [HttpPost("coreaders")]
        public async Task<IActionResult> AddCoReader([FromBody] AddCoReaderDto dto)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();
            var result = await _risService.AddCoReaderAsync(dto, userId);
            return Ok(result);
        }

        /// <summary>
        /// Lay danh sach dong doc theo reportId.
        /// GET /api/RISComplete/coreaders/{reportId}
        /// </summary>
        [HttpGet("coreaders/{reportId:guid}")]
        public async Task<IActionResult> GetCoReaders(Guid reportId)
        {
            var list = await _risService.GetCoReadersAsync(reportId);
            return Ok(list);
        }

        /// <summary>
        /// Cap nhat y kien cua dong doc.
        /// PUT /api/RISComplete/coreaders
        /// </summary>
        [HttpPut("coreaders")]
        public async Task<IActionResult> UpdateCoReaderOpinion([FromBody] UpdateCoReaderOpinionDto dto)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();
            var ok = await _risService.UpdateCoReaderOpinionAsync(dto, userId);
            return Ok(ok);
        }

        /// <summary>
        /// Xoa dong doc (soft-delete).
        /// DELETE /api/RISComplete/coreaders/{coReaderId}
        /// </summary>
        [HttpDelete("coreaders/{coReaderId:guid}")]
        public async Task<IActionResult> RemoveCoReader(Guid coReaderId)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();
            var ok = await _risService.RemoveCoReaderAsync(coReaderId, userId);
            return Ok(ok);
        }

        /// <summary>
        /// Copy ket qua tu report nguon sang report dich.
        /// POST /api/RISComplete/coreaders/copy-from
        /// </summary>
        [HttpPost("coreaders/copy-from")]
        public async Task<IActionResult> CopyReportResult([FromBody] CopyReportResultDto dto)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();
            var ok = await _risService.CopyReportResultAsync(dto, userId);
            return Ok(ok);
        }

        /// <summary>
        /// Gop (merge) y kien tat ca dong doc vao Impression cua report.
        /// POST /api/RISComplete/coreaders/merge
        /// </summary>
        [HttpPost("coreaders/merge")]
        public async Task<IActionResult> MergeCoReaderOpinions([FromBody] MergeCoReaderOpinionsDto dto)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();
            var result = await _risService.MergeCoReaderOpinionsAsync(dto, userId);
            return Ok(result);
        }
    }
}
