using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.DQGVN;
using HIS.Application.Services;

namespace HIS.API.Controllers
{
    /// <summary>
    /// DQGVN - Cong du lieu y te quoc gia (Vietnam National Health Data Exchange)
    /// Lien thong du lieu y te voi co quan quan ly nha nuoc
    /// </summary>
    [ApiController]
    [Route("api/dqgvn")]
    [Authorize]
    public class DqgvnController : ControllerBase
    {
        private readonly IDqgvnService _service;

        public DqgvnController(IDqgvnService service)
        {
            _service = service;
        }

        private string GetUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "system";

        /// <summary>
        /// Dashboard thong ke DQGVN (tong quan gui du lieu)
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<ActionResult<DqgvnDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());

        /// <summary>
        /// Tim kiem danh sach ban ghi gui DQGVN
        /// </summary>
        [HttpGet("submissions")]
        public async Task<ActionResult<DqgvnSubmissionPagedResult>> SearchSubmissions(
            [FromQuery] DqgvnSubmissionSearchDto search)
            => Ok(await _service.SearchSubmissionsAsync(search));

        /// <summary>
        /// Chi tiet 1 ban ghi gui DQGVN
        /// </summary>
        [HttpGet("submissions/{id}")]
        public async Task<ActionResult<DqgvnSubmissionDto>> GetSubmission(Guid id)
        {
            var result = await _service.GetSubmissionAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>
        /// Gui thong tin benh nhan len DQGVN
        /// </summary>
        [HttpPost("submit/patient/{patientId}")]
        public async Task<ActionResult<DqgvnSubmitResult>> SubmitPatient(Guid patientId)
            => Ok(await _service.SubmitPatientAsync(patientId, GetUserId()));

        /// <summary>
        /// Gui bao cao luot kham/dieu tri len DQGVN
        /// </summary>
        [HttpPost("submit/encounter")]
        public async Task<ActionResult<DqgvnSubmitResult>> SubmitEncounter(
            [FromBody] SubmitEncounterRequest request)
            => Ok(await _service.SubmitEncounterAsync(request, GetUserId()));

        /// <summary>
        /// Gui ket qua xet nghiem len DQGVN
        /// </summary>
        [HttpPost("submit/lab-result")]
        public async Task<ActionResult<DqgvnSubmitResult>> SubmitLabResult(
            [FromBody] SubmitLabResultRequest request)
            => Ok(await _service.SubmitLabResultAsync(request, GetUserId()));

        /// <summary>
        /// Thu gui lai ban ghi bi loi
        /// </summary>
        [HttpPost("submit/{id}/retry")]
        public async Task<ActionResult<DqgvnSubmitResult>> RetrySubmission(Guid id)
            => Ok(await _service.RetrySubmissionAsync(id, GetUserId()));

        /// <summary>
        /// Gui hang loat cac ban ghi dang cho (auto-submit)
        /// </summary>
        [HttpPost("submit/batch")]
        public async Task<ActionResult<object>> SubmitBatch()
        {
            var count = await _service.SubmitPendingBatchAsync(GetUserId());
            return Ok(new { submittedCount = count });
        }

        /// <summary>
        /// Lay cau hinh DQGVN hien tai
        /// </summary>
        [HttpGet("config")]
        public async Task<ActionResult<DqgvnConfigDto>> GetConfig()
            => Ok(await _service.GetConfigAsync());

        /// <summary>
        /// Cap nhat cau hinh DQGVN
        /// </summary>
        [HttpPut("config")]
        public async Task<IActionResult> UpdateConfig([FromBody] DqgvnConfigDto config)
        {
            await _service.SaveConfigAsync(config, GetUserId());
            return Ok(new { message = "Cau hinh DQGVN da duoc cap nhat" });
        }
    }
}
