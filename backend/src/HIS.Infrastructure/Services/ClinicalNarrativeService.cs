using HIS.Application.Common;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic mẫu tường trình lâm sàng — tách khỏi ClinicalNarrativeController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message giữ nguyên; userId truyền
/// từ controller (thay cho GetUserId() cũ đọc claim). Return map về ServiceOutcome.
/// </summary>
public class ClinicalNarrativeService : IClinicalNarrativeService
{
    private readonly HISDbContext _db;

    public ClinicalNarrativeService(HISDbContext db) => _db = db;

    // ========== Surgery Narrative Templates ==========

    public async Task<ServiceOutcome> GetSurgeryNarrativesAsync(
        Guid? departmentId, Guid? surgeryServiceId, string? keyword)
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

        return ServiceOutcome.Ok(items);
    }

    public async Task<ServiceOutcome> GetSurgeryNarrativeAsync(Guid id)
    {
        var t = await _db.SurgeryNarrativeTemplates
            .Include(x => x.SurgeryService).Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (t == null) return ServiceOutcome.NotFound();

        return ServiceOutcome.Ok(new
        {
            t.Id, t.TemplateCode, t.TemplateName, t.SurgeryServiceId,
            SurgeryServiceName = t.SurgeryService?.ServiceName,
            t.DepartmentId, DepartmentName = t.Department?.DepartmentName,
            t.PreOpDiagnosis, t.PostOpDiagnosis, t.SurgeryMethod, t.AnesthesiaMethod,
            t.NarrativeBody, t.Complications, t.PostOpOrders,
            t.IsPublic, t.SortOrder, t.IsActive, t.CreatedAt
        });
    }

    public async Task<ServiceOutcome> SaveSurgeryNarrativeAsync(SurgeryNarrativeTemplate dto, Guid userId)
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
            entity.UpdatedBy = userId.ToString();
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
                CreatedByUserId = userId,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString(),
            };
            _db.SurgeryNarrativeTemplates.Add(entity);
        }

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { entity.Id });
    }

    public async Task<ServiceOutcome> DeleteSurgeryNarrativeAsync(Guid id, Guid userId)
    {
        var entity = await _db.SurgeryNarrativeTemplates.FindAsync(id);
        if (entity == null) return ServiceOutcome.NotFound();
        entity.IsActive = false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.Now;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    // ========== Outpatient Record Templates ==========

    public async Task<ServiceOutcome> GetOutpatientRecordsAsync(
        Guid? departmentId, string? diagnosisCode, string? keyword)
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

        return ServiceOutcome.Ok(items);
    }

    public async Task<ServiceOutcome> GetOutpatientRecordAsync(Guid id)
    {
        var t = await _db.OutpatientRecordTemplates
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (t == null) return ServiceOutcome.NotFound();

        return ServiceOutcome.Ok(new
        {
            t.Id, t.TemplateCode, t.TemplateName, t.DiagnosisCode, t.DiagnosisName,
            t.DepartmentId, DepartmentName = t.Department?.DepartmentName,
            t.ChiefComplaint, t.MedicalHistory, t.PhysicalExamination,
            t.GeneralExamBody, t.CardiovascularExam, t.RespiratoryExam,
            t.GiExam, t.NeuroExam, t.Conclusion, t.TreatmentPlan, t.FollowUpNotes,
            t.IsPublic, t.SortOrder, t.IsActive, t.CreatedAt
        });
    }

    public async Task<ServiceOutcome> SaveOutpatientRecordAsync(OutpatientRecordTemplate dto, Guid userId)
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
            entity.UpdatedBy = userId.ToString();
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
                CreatedByUserId = userId,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString(),
            };
            _db.OutpatientRecordTemplates.Add(entity);
        }

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { entity.Id });
    }

    public async Task<ServiceOutcome> DeleteOutpatientRecordAsync(Guid id, Guid userId)
    {
        var entity = await _db.OutpatientRecordTemplates.FindAsync(id);
        if (entity == null) return ServiceOutcome.NotFound();
        entity.IsActive = false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.Now;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }
}
