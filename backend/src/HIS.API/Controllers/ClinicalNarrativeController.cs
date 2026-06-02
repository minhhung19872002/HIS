using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/clinical-narratives")]
[Authorize]
public class ClinicalNarrativeController : ControllerBase
{
    private readonly HISDbContext _db;

    public ClinicalNarrativeController(HISDbContext db) => _db = db;

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ========== Surgery Narrative Templates ==========

    [HttpGet("surgery")]
    public async Task<IActionResult> GetSurgeryNarratives(
        [FromQuery] Guid? departmentId, [FromQuery] Guid? surgeryServiceId, [FromQuery] string? keyword)
    {
        var q = _db.SurgeryNarrativeTemplates
            .Include(t => t.SurgeryService)
            .Include(t => t.Department)
            .Where(t => t.IsActive);

        if (departmentId.HasValue)
            q = q.Where(t => t.DepartmentId == departmentId || t.IsPublic);
        if (surgeryServiceId.HasValue)
            q = q.Where(t => t.SurgeryServiceId == surgeryServiceId);
        if (!string.IsNullOrEmpty(keyword))
            q = q.Where(t => t.TemplateName.Contains(keyword) || t.TemplateCode.Contains(keyword));

        var items = await q.OrderBy(t => t.SortOrder).ThenBy(t => t.TemplateName).Take(200)
            .Select(t => new
            {
                t.Id, t.TemplateCode, t.TemplateName,
                SurgeryServiceName = t.SurgeryService != null ? t.SurgeryService.ServiceName : null,
                DepartmentName = t.Department != null ? t.Department.DepartmentName : null,
                t.PreOpDiagnosis, t.PostOpDiagnosis, t.SurgeryMethod, t.AnesthesiaMethod,
                t.IsPublic, t.SortOrder, t.CreatedAt
            }).ToListAsync();

        return Ok(items);
    }

    [HttpGet("surgery/{id:guid}")]
    public async Task<IActionResult> GetSurgeryNarrative(Guid id)
    {
        var t = await _db.SurgeryNarrativeTemplates
            .Include(x => x.SurgeryService).Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (t == null) return NotFound();

        return Ok(new
        {
            t.Id, t.TemplateCode, t.TemplateName, t.SurgeryServiceId,
            SurgeryServiceName = t.SurgeryService?.ServiceName,
            t.DepartmentId, DepartmentName = t.Department?.DepartmentName,
            t.PreOpDiagnosis, t.PostOpDiagnosis, t.SurgeryMethod, t.AnesthesiaMethod,
            t.NarrativeBody, t.Complications, t.PostOpOrders,
            t.IsPublic, t.SortOrder, t.IsActive, t.CreatedAt
        });
    }

    [HttpPost("surgery")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<IActionResult> SaveSurgeryNarrative([FromBody] SurgeryNarrativeTemplate dto)
    {
        SurgeryNarrativeTemplate entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _db.SurgeryNarrativeTemplates.FirstOrDefaultAsync(x => x.Id == dto.Id)
                ?? throw new Exception("Template không tồn tại");
            entity.TemplateCode = dto.TemplateCode;
            entity.TemplateName = dto.TemplateName;
            entity.SurgeryServiceId = dto.SurgeryServiceId;
            entity.DepartmentId = dto.DepartmentId;
            entity.PreOpDiagnosis = dto.PreOpDiagnosis;
            entity.PostOpDiagnosis = dto.PostOpDiagnosis;
            entity.SurgeryMethod = dto.SurgeryMethod;
            entity.AnesthesiaMethod = dto.AnesthesiaMethod;
            entity.NarrativeBody = dto.NarrativeBody;
            entity.Complications = dto.Complications;
            entity.PostOpOrders = dto.PostOpOrders;
            entity.IsPublic = dto.IsPublic;
            entity.SortOrder = dto.SortOrder;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.Now;
            entity.UpdatedBy = GetUserId().ToString();
        }
        else
        {
            entity = new SurgeryNarrativeTemplate
            {
                Id = Guid.NewGuid(),
                TemplateCode = dto.TemplateCode,
                TemplateName = dto.TemplateName,
                SurgeryServiceId = dto.SurgeryServiceId,
                DepartmentId = dto.DepartmentId,
                PreOpDiagnosis = dto.PreOpDiagnosis,
                PostOpDiagnosis = dto.PostOpDiagnosis,
                SurgeryMethod = dto.SurgeryMethod,
                AnesthesiaMethod = dto.AnesthesiaMethod,
                NarrativeBody = dto.NarrativeBody,
                Complications = dto.Complications,
                PostOpOrders = dto.PostOpOrders,
                IsPublic = dto.IsPublic,
                SortOrder = dto.SortOrder,
                IsActive = true,
                CreatedByUserId = GetUserId(),
                CreatedAt = DateTime.Now,
                CreatedBy = GetUserId().ToString(),
            };
            _db.SurgeryNarrativeTemplates.Add(entity);
        }

        await _db.SaveChangesAsync();
        return Ok(new { entity.Id });
    }

    [HttpDelete("surgery/{id:guid}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<IActionResult> DeleteSurgeryNarrative(Guid id)
    {
        var entity = await _db.SurgeryNarrativeTemplates.FindAsync(id);
        if (entity == null) return NotFound();
        entity.IsActive = false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.Now;
        entity.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ========== Outpatient Record Templates ==========

    [HttpGet("outpatient-records")]
    public async Task<IActionResult> GetOutpatientRecords(
        [FromQuery] Guid? departmentId, [FromQuery] string? diagnosisCode, [FromQuery] string? keyword)
    {
        var q = _db.OutpatientRecordTemplates
            .Include(t => t.Department)
            .Where(t => t.IsActive);

        if (departmentId.HasValue)
            q = q.Where(t => t.DepartmentId == departmentId || t.IsPublic);
        if (!string.IsNullOrEmpty(diagnosisCode))
            q = q.Where(t => t.DiagnosisCode == diagnosisCode);
        if (!string.IsNullOrEmpty(keyword))
            q = q.Where(t => t.TemplateName.Contains(keyword) || (t.DiagnosisName != null && t.DiagnosisName.Contains(keyword)));

        var items = await q.OrderBy(t => t.SortOrder).ThenBy(t => t.TemplateName).Take(200)
            .Select(t => new
            {
                t.Id, t.TemplateCode, t.TemplateName,
                t.DiagnosisCode, t.DiagnosisName,
                DepartmentName = t.Department != null ? t.Department.DepartmentName : null,
                t.IsPublic, t.SortOrder, t.CreatedAt
            }).ToListAsync();

        return Ok(items);
    }

    [HttpGet("outpatient-records/{id:guid}")]
    public async Task<IActionResult> GetOutpatientRecord(Guid id)
    {
        var t = await _db.OutpatientRecordTemplates
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (t == null) return NotFound();

        return Ok(new
        {
            t.Id, t.TemplateCode, t.TemplateName, t.DiagnosisCode, t.DiagnosisName,
            t.DepartmentId, DepartmentName = t.Department?.DepartmentName,
            t.ChiefComplaint, t.MedicalHistory, t.PhysicalExamination,
            t.GeneralExamBody, t.CardiovascularExam, t.RespiratoryExam,
            t.GiExam, t.NeuroExam, t.Conclusion, t.TreatmentPlan, t.FollowUpNotes,
            t.IsPublic, t.SortOrder, t.IsActive, t.CreatedAt
        });
    }

    [HttpPost("outpatient-records")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<IActionResult> SaveOutpatientRecord([FromBody] OutpatientRecordTemplate dto)
    {
        OutpatientRecordTemplate entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _db.OutpatientRecordTemplates.FirstOrDefaultAsync(x => x.Id == dto.Id)
                ?? throw new Exception("Template không tồn tại");
            entity.TemplateCode = dto.TemplateCode;
            entity.TemplateName = dto.TemplateName;
            entity.DiagnosisCode = dto.DiagnosisCode;
            entity.DiagnosisName = dto.DiagnosisName;
            entity.DepartmentId = dto.DepartmentId;
            entity.ChiefComplaint = dto.ChiefComplaint;
            entity.MedicalHistory = dto.MedicalHistory;
            entity.PhysicalExamination = dto.PhysicalExamination;
            entity.GeneralExamBody = dto.GeneralExamBody;
            entity.CardiovascularExam = dto.CardiovascularExam;
            entity.RespiratoryExam = dto.RespiratoryExam;
            entity.GiExam = dto.GiExam;
            entity.NeuroExam = dto.NeuroExam;
            entity.Conclusion = dto.Conclusion;
            entity.TreatmentPlan = dto.TreatmentPlan;
            entity.FollowUpNotes = dto.FollowUpNotes;
            entity.IsPublic = dto.IsPublic;
            entity.SortOrder = dto.SortOrder;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.Now;
            entity.UpdatedBy = GetUserId().ToString();
        }
        else
        {
            entity = new OutpatientRecordTemplate
            {
                Id = Guid.NewGuid(),
                TemplateCode = dto.TemplateCode,
                TemplateName = dto.TemplateName,
                DiagnosisCode = dto.DiagnosisCode,
                DiagnosisName = dto.DiagnosisName,
                DepartmentId = dto.DepartmentId,
                ChiefComplaint = dto.ChiefComplaint,
                MedicalHistory = dto.MedicalHistory,
                PhysicalExamination = dto.PhysicalExamination,
                GeneralExamBody = dto.GeneralExamBody,
                CardiovascularExam = dto.CardiovascularExam,
                RespiratoryExam = dto.RespiratoryExam,
                GiExam = dto.GiExam,
                NeuroExam = dto.NeuroExam,
                Conclusion = dto.Conclusion,
                TreatmentPlan = dto.TreatmentPlan,
                FollowUpNotes = dto.FollowUpNotes,
                IsPublic = dto.IsPublic,
                SortOrder = dto.SortOrder,
                IsActive = true,
                CreatedByUserId = GetUserId(),
                CreatedAt = DateTime.Now,
                CreatedBy = GetUserId().ToString(),
            };
            _db.OutpatientRecordTemplates.Add(entity);
        }

        await _db.SaveChangesAsync();
        return Ok(new { entity.Id });
    }

    [HttpDelete("outpatient-records/{id:guid}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<IActionResult> DeleteOutpatientRecord(Guid id)
    {
        var entity = await _db.OutpatientRecordTemplates.FindAsync(id);
        if (entity == null) return NotFound();
        entity.IsActive = false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.Now;
        entity.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
