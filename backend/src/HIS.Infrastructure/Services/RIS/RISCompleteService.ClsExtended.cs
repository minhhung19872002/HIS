using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

// K3 phien 7 (2026-05-30): tach RIS region VII CLS Screen + Extended Capture &
// Consultation Methods (~406 dong) khoi RISCompleteService.cs. ZERO runtime change — partial class.
public partial class RISCompleteService
{
    #region VII. CLS Screen - Màn hình Cận lâm sàng

    public async Task<CLSScreenConfigDto> GetCLSScreenConfigAsync()
    {
        // Get first config or return default
        var config = await _context.Set<RadiologyCLSScreenConfig>()
            .FirstOrDefaultAsync();

        if (config == null)
        {
            return new CLSScreenConfigDto
            {
                Id = Guid.NewGuid(),
                DefaultFilters = "{}",
                ColumnSettings = "{}",
                PageSize = 20,
                AutoLoadTemplate = true,
                ShowPatientHistory = true,
                EnableShortcuts = true,
                CustomSettings = "{}"
            };
        }

        return new CLSScreenConfigDto
        {
            Id = config.Id,
            UserId = config.UserId,
            DefaultFilters = config.DefaultFilters,
            ColumnSettings = config.ColumnSettings,
            PageSize = config.PageSize,
            AutoLoadTemplate = config.AutoLoadTemplate,
            ShowPatientHistory = config.ShowPatientHistory,
            EnableShortcuts = config.EnableShortcuts,
            CustomSettings = config.CustomSettings
        };
    }

    public async Task<CLSScreenConfigDto> SaveCLSScreenConfigAsync(SaveCLSScreenConfigDto dto)
    {
        // Get first config or create new
        var config = await _context.Set<RadiologyCLSScreenConfig>()
            .FirstOrDefaultAsync();

        if (config == null)
        {
            config = new RadiologyCLSScreenConfig { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyCLSScreenConfig>().AddAsync(config);
        }

        config.DefaultFilters = dto.DefaultFilters;
        config.ColumnSettings = dto.ColumnSettings;
        config.PageSize = dto.PageSize;
        config.AutoLoadTemplate = dto.AutoLoadTemplate;
        config.ShowPatientHistory = dto.ShowPatientHistory;
        config.EnableShortcuts = dto.EnableShortcuts;
        config.CustomSettings = dto.CustomSettings;
        config.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new CLSScreenConfigDto
        {
            Id = config.Id,
            UserId = config.UserId,
            PageSize = config.PageSize,
            AutoLoadTemplate = config.AutoLoadTemplate
        };
    }

    public async Task<List<ServiceDescriptionTemplateDto>> GetServiceDescriptionTemplatesAsync(Guid serviceId)
    {
        var templates = await _context.Set<RadiologyServiceDescriptionTemplate>()
            .Where(t => t.ServiceId == serviceId && t.IsActive)
            .OrderBy(t => t.SortOrder)
            .ToListAsync();

        return templates.Select(t => new ServiceDescriptionTemplateDto
        {
            Id = t.Id,
            ServiceId = t.ServiceId,
            ServiceName = t.Service?.ServiceName ?? "",
            Name = t.Name,
            Description = t.Description,
            Conclusion = t.Conclusion,
            Notes = t.Notes,
            SortOrder = t.SortOrder,
            IsDefault = t.IsDefault,
            IsActive = t.IsActive,
            CreatedByUserName = t.CreatedByUser?.FullName ?? ""
        }).ToList();
    }

    public async Task<ServiceDescriptionTemplateDto> SaveServiceDescriptionTemplateAsync(SaveServiceDescriptionTemplateDto dto)
    {
        RadiologyServiceDescriptionTemplate template;
        if (dto.Id.HasValue)
        {
            template = await _context.Set<RadiologyServiceDescriptionTemplate>().FindAsync(dto.Id.Value);
            if (template == null) return null;
        }
        else
        {
            template = new RadiologyServiceDescriptionTemplate { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyServiceDescriptionTemplate>().AddAsync(template);
        }

        template.ServiceId = dto.ServiceId;
        template.Name = dto.Name;
        template.Description = dto.Description;
        template.Conclusion = dto.Conclusion;
        template.Notes = dto.Notes;
        template.SortOrder = dto.SortOrder;
        template.IsDefault = dto.IsDefault;
        template.IsActive = dto.IsActive;
        template.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new ServiceDescriptionTemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            IsActive = template.IsActive
        };
    }

    public async Task<List<DiagnosisHistoryDto>> GetDiagnosisHistoryAsync(Guid requestId)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == requestId);

        if (request == null) return new List<DiagnosisHistoryDto>();

        // Get previous radiology results for the same patient
        var previousReports = await _context.RadiologyReports
            .Include(r => r.RadiologyExam)
                .ThenInclude(e => e.RadiologyRequest)
                    .ThenInclude(req => req.Service)
            .Include(r => r.Radiologist)
            .Where(r => r.RadiologyExam.RadiologyRequest.PatientId == request.PatientId
                && r.RadiologyExam.RadiologyRequestId != requestId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(10)
            .ToListAsync();

        return previousReports.Select(r => new DiagnosisHistoryDto
        {
            Id = r.Id,
            RadiologyRequestId = r.RadiologyExam?.RadiologyRequestId ?? Guid.Empty,
            OrderCode = r.RadiologyExam?.RadiologyRequest?.RequestCode ?? "",
            DiagnosisDate = r.ReportDate ?? DateTime.Now,
            Description = r.Findings ?? "",
            Conclusion = r.Impression ?? "",
            DoctorName = r.Radiologist?.FullName ?? ""
        }).ToList();
    }

    public async Task<bool> DeleteServiceDescriptionTemplateAsync(Guid templateId)
    {
        var template = await _context.Set<RadiologyServiceDescriptionTemplate>().FindAsync(templateId);
        if (template == null) return false;
        template.IsActive = false;
        template.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<RadiologyWaitingListDto>> GetPatientExamHistoryAsync(Guid patientId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Exams)
                .ThenInclude(e => e.DicomStudies)
            .Where(r => r.PatientId == patientId);

        if (fromDate.HasValue)
            query = query.Where(r => r.RequestDate >= fromDate);
        if (toDate.HasValue)
            query = query.Where(r => r.RequestDate <= toDate);

        var requests = await query.OrderByDescending(r => r.RequestDate).Take(50).ToListAsync();

        return requests.Select((r, index) => new RadiologyWaitingListDto
        {
            PatientId = r.PatientId,
            PatientCode = r.Patient.PatientCode,
            PatientName = r.Patient.FullName,
            Age = r.Patient.DateOfBirth.HasValue ? (int?)((DateTime.Now - r.Patient.DateOfBirth.Value).Days / 365) : null,
            Gender = r.Patient.Gender == 1 ? "Nam" : "Nu",
            VisitId = r.MedicalRecordId ?? Guid.Empty,
            VisitCode = r.MedicalRecord?.MedicalRecordCode ?? "",
            OrderId = r.Id,
            OrderCode = r.RequestCode,
            OrderTime = r.RequestDate,
            OrderDoctorName = r.RequestingDoctor?.FullName ?? "",
            DepartmentName = "",
            ServiceName = r.Service?.ServiceName ?? "",
            ServiceTypeName = GetRadiologyServiceTypeName(r.Service),
            RoomName = r.Exams.FirstOrDefault()?.Room?.RoomName ?? "",
            QueueNumber = index + 1,
            StatusCode = r.Status,
            Status = GetStatusName(r.Status),
            PatientType = r.PatientType == 1 ? "BHYT" : "Vien phi",
            Priority = r.Priority == 3 ? "Cap cuu" : r.Priority == 2 ? "Khan" : "Binh thuong",
            StudyInstanceUID = r.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID ?? "",
            HasImages = r.Exams.Any(e => e.DicomStudies.Any())
        }).ToList();
    }

    #endregion
    #region Extended Capture & Consultation Methods

    public async Task<bool> CheckDeviceConnectionAsync(Guid deviceId)
    {
        var device = await _context.Set<RadiologyCaptureDevice>().FindAsync(deviceId);
        return device != null;
    }

    public async Task<bool> DeleteWorkstationAsync(Guid workstationId)
    {
        var ws = await _context.Set<RadiologyWorkstation>().FindAsync(workstationId);
        if (ws == null) return false;
        ws.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<CaptureSessionDto> GetActiveCaptureSessionAsync(Guid deviceId)
    {
        var session = await _context.Set<RadiologyCaptureSession>()
            .Where(s => s.DeviceId == deviceId && s.Status == 0)
            .FirstOrDefaultAsync();
        if (session == null) return null;
        return new CaptureSessionDto { Id = session.Id, DeviceId = session.DeviceId, Status = session.Status };
    }

    public async Task<CapturedMediaDto> UploadCapturedMediaAsync(SaveCapturedMediaDto dto)
    {
        var media = new RadiologyCapturedMedia
        {
            Id = Guid.NewGuid(),
            SessionId = dto.CaptureSessionId,
            MediaType = dto.MediaType,
            FilePath = dto.FilePath,
            FileSize = dto.FileSize,
            ThumbnailPath = dto.ThumbnailPath,
            CreatedAt = DateTime.Now
        };
        await _context.Set<RadiologyCapturedMedia>().AddAsync(media);
        await _unitOfWork.SaveChangesAsync();
        return new CapturedMediaDto { Id = media.Id, SessionId = media.SessionId };
    }

    public async Task<bool> SetThumbnailImageAsync(Guid sessionId, Guid mediaId)
    {
        return true;
    }

    public async Task<object> GetDeviceDailyStatisticsAsync(Guid deviceId, DateTime date)
    {
        // StartTime ghi bằng DateTime.Now — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (stFromUtc, stToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var count = await _context.Set<RadiologyCaptureSession>()
            .Where(s => s.DeviceId == deviceId && s.StartTime >= stFromUtc && s.StartTime < stToUtc)
            .CountAsync();
        return new { DeviceId = deviceId, Date = date, SessionCount = count };
    }

    public async Task<bool> CancelConsultationSessionAsync(Guid sessionId, string reason)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return false;
        session.Status = 3;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationSessionDto> StartConsultationSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;
        session.Status = 1;
        session.ActualStartTime = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationSessionDto { Id = session.Id, Status = session.Status };
    }

    public async Task<ConsultationSessionDto> EndConsultationSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;
        session.Status = 2;
        session.ActualEndTime = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationSessionDto { Id = session.Id, Status = session.Status };
    }

    public async Task<ConsultationCaseDto> ConcludeCaseAsync(Guid caseId, string conclusion, string recommendation)
    {
        var caseEntity = await _context.Set<RadiologyConsultationCase>().FindAsync(caseId);
        if (caseEntity == null) return null;
        caseEntity.Conclusion = conclusion;
        caseEntity.Recommendation = recommendation;
        caseEntity.Status = 2;
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationCaseDto { Id = caseEntity.Id, Conclusion = conclusion, Recommendation = recommendation };
    }

    public async Task<bool> RespondInvitationAsync(Guid sessionId, Guid userId, bool accepted)
    {
        var participant = await _context.Set<RadiologyConsultationParticipant>()
            .FirstOrDefaultAsync(p => p.SessionId == sessionId && p.UserId == userId);
        if (participant == null) return false;
        participant.Status = accepted ? 1 : 2;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationSessionDto> JoinSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;
        return new ConsultationSessionDto { Id = session.Id, Status = session.Status };
    }

    public async Task<bool> LeaveSessionAsync(Guid sessionId)
    {
        return true;
    }

    public async Task<ConsultationAttachmentDto> UploadAttachmentAsync(AddConsultationAttachmentDto dto)
    {
        var attachment = new RadiologyConsultationAttachment
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            FileName = dto.FileName,
            CreatedAt = DateTime.Now
        };
        await _context.Set<RadiologyConsultationAttachment>().AddAsync(attachment);
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationAttachmentDto { Id = attachment.Id, FileName = attachment.FileName };
    }

    public async Task<bool> DeleteAttachmentAsync(Guid attachmentId)
    {
        var attachment = await _context.Set<RadiologyConsultationAttachment>().FindAsync(attachmentId);
        if (attachment == null) return false;
        _context.Set<RadiologyConsultationAttachment>().Remove(attachment);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationDiscussionDto> PostDiscussionAsync(AddConsultationDiscussionDto dto)
    {
        var discussion = new RadiologyConsultationDiscussion
        {
            Id = Guid.NewGuid(),
            CaseId = dto.CaseId ?? Guid.Empty,
            Content = dto.Content,
            CreatedAt = DateTime.Now
        };
        await _context.Set<RadiologyConsultationDiscussion>().AddAsync(discussion);
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationDiscussionDto { Id = discussion.Id };
    }

    public async Task<bool> DeleteDiscussionAsync(Guid discussionId)
    {
        var discussion = await _context.Set<RadiologyConsultationDiscussion>().FindAsync(discussionId);
        if (discussion == null) return false;
        _context.Set<RadiologyConsultationDiscussion>().Remove(discussion);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationImageNoteDto> SaveImageNoteAsync(AddConsultationImageNoteDto dto)
    {
        var imageNote = new RadiologyConsultationImageNote
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            AnnotationData = dto.AnnotationData,
            CreatedAt = DateTime.Now
        };
        await _context.Set<RadiologyConsultationImageNote>().AddAsync(imageNote);
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationImageNoteDto { Id = imageNote.Id, SessionId = imageNote.SessionId };
    }

    public async Task<byte[]> GenerateInviteQRCodeAsync(Guid sessionId)
    {
        return System.Text.Encoding.UTF8.GetBytes("QR:" + sessionId.ToString());
    }

    public async Task<bool> ToggleRecordingAsync(Guid sessionId, bool start)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return false;
        session.IsRecording = start;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    #endregion
}
