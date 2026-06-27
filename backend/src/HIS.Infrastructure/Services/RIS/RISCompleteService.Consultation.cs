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
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K3 phien 2 (2026-05-30): tach RIS region V Consultation (Hoi chan ca chup, ~522 dong) khoi
// RISCompleteService.cs. ZERO runtime change â€” partial class.
public partial class RISCompleteService
{
    #region V. Consultation - Há»™i cháº©n ca chá»¥p

    public async Task<ConsultationSearchResultDto> SearchConsultationsAsync(SearchConsultationDto searchDto)
    {
        var query = _context.Set<RadiologyConsultationSession>()
            .Include(c => c.Organizer)
            .Include(c => c.Cases)
            .AsQueryable();

        if (searchDto.FromDate.HasValue)
            query = query.Where(c => c.ScheduledStartTime >= searchDto.FromDate);
        if (searchDto.ToDate.HasValue)
            query = query.Where(c => c.ScheduledStartTime <= searchDto.ToDate);
        if (searchDto.Status.HasValue)
            query = query.Where(c => c.Status == searchDto.Status);
        if (!string.IsNullOrEmpty(searchDto.Keyword))
            query = query.Where(c => c.SessionCode.Contains(searchDto.Keyword) || c.Title.Contains(searchDto.Keyword));

        var totalCount = await query.CountAsync();
        var sessions = await query
            .OrderByDescending(c => c.ScheduledStartTime)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return new ConsultationSearchResultDto
        {
            Items = sessions.Select(s => new ConsultationSessionDto
            {
                Id = s.Id,
                SessionCode = s.SessionCode,
                Title = s.Title,
                ScheduledStartTime = s.ScheduledStartTime,
                ScheduledEndTime = s.ScheduledEndTime,
                ActualStartTime = s.ActualStartTime,
                ActualEndTime = s.ActualEndTime,
                Status = s.Status,
                StatusName = GetConsultationStatusName(s.Status),
                OrganizerName = s.Organizer?.FullName ?? "",
                CaseCount = s.Cases?.Count ?? 0
            }).ToList(),
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / searchDto.PageSize),
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<ConsultationSessionDto> GetConsultationSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>()
            .Include(c => c.Organizer)
            .Include(c => c.Cases)
                .ThenInclude(cc => cc.RadiologyRequest)
                    .ThenInclude(r => r.Patient)
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(c => c.Id == sessionId);

        if (session == null) return null;

        return new ConsultationSessionDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            Title = session.Title,
            Description = session.Description,
            ScheduledStartTime = session.ScheduledStartTime,
            ScheduledEndTime = session.ScheduledEndTime,
            ActualStartTime = session.ActualStartTime,
            ActualEndTime = session.ActualEndTime,
            Status = session.Status,
            StatusName = GetConsultationStatusName(session.Status),
            MeetingUrl = session.MeetingUrl,
            OrganizerName = session.Organizer?.FullName ?? "",
            CaseCount = session.Cases?.Count ?? 0,
            Cases = session.Cases?.Select(c => new ConsultationCaseDto
            {
                Id = c.Id,
                RadiologyRequestId = c.RadiologyRequestId,
                PatientName = c.RadiologyRequest?.Patient?.FullName ?? "",
                PatientCode = c.RadiologyRequest?.Patient?.PatientCode ?? "",
                Reason = c.Reason,
                Status = c.Status
            }).ToList(),
            Participants = session.Participants?.Select(p => new ConsultationParticipantDto
            {
                Id = p.Id,
                UserId = p.UserId,
                UserName = p.User?.FullName ?? "",
                Role = p.Role,
                JoinedAt = p.JoinedAt
            }).ToList()
        };
    }

    public async Task<ConsultationSessionDto> SaveConsultationSessionAsync(SaveConsultationSessionDto dto)
    {
        RadiologyConsultationSession session;
        if (dto.Id.HasValue)
        {
            session = await _context.Set<RadiologyConsultationSession>().FindAsync(dto.Id.Value);
            if (session == null) return null;
        }
        else
        {
            session = new RadiologyConsultationSession
            {
                Id = Guid.NewGuid(),
                SessionCode = $"HC{DateTime.Now:yyyyMMddHHmmss}",
                OrganizerId = GetCurrentUserIdOrAdmin(),
                CreatedAt = DateTime.Now
            };
            await _context.Set<RadiologyConsultationSession>().AddAsync(session);
        }

        session.Title = dto.Title;
        session.Description = dto.Description;
        session.ScheduledStartTime = dto.ScheduledStartTime;
        session.ScheduledEndTime = dto.ScheduledEndTime;
        
        
        session.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new ConsultationSessionDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            Title = session.Title,
            ScheduledStartTime = session.ScheduledStartTime,
            ScheduledEndTime = session.ScheduledEndTime,
            Status = session.Status
        };
    }

    public async Task<bool> DeleteConsultationSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return false;
        session.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationSessionDto> StartConsultationAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;

        session.Status = 2; // InProgress
        session.ActualStartTime = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationSessionDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            ActualStartTime = session.ActualStartTime,
            Status = session.Status
        };
    }

    public async Task<ConsultationSessionDto> EndConsultationAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;

        session.Status = 3; // Completed
        session.ActualEndTime = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationSessionDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            ActualEndTime = session.ActualEndTime,
            Status = session.Status
        };
    }

    public async Task<ConsultationCaseDto> AddConsultationCaseAsync(AddConsultationCaseDto dto)
    {
        var consultationCase = new RadiologyConsultationCase
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            RadiologyRequestId = dto.RadiologyRequestId,
            Reason = dto.Reason,
            Status = 0,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationCase>().AddAsync(consultationCase);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationCaseDto
        {
            Id = consultationCase.Id,
            RadiologyRequestId = consultationCase.RadiologyRequestId,
            Reason = consultationCase.Reason,
            Status = consultationCase.Status
        };
    }

    public async Task<bool> RemoveConsultationCaseAsync(Guid caseId)
    {
        var consultationCase = await _context.Set<RadiologyConsultationCase>().FindAsync(caseId);
        if (consultationCase == null) return false;
        _context.Set<RadiologyConsultationCase>().Remove(consultationCase);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationParticipantDto> InviteParticipantAsync(InviteParticipantDto dto)
    {
        var participant = new RadiologyConsultationParticipant
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            UserId = dto.UserId,
            Role = dto.Role ?? "Participant",
            InvitedAt = DateTime.Now,
            Status = 0, // Invited
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationParticipant>().AddAsync(participant);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationParticipantDto
        {
            Id = participant.Id,
            UserId = participant.UserId,
            Role = participant.Role,
            InvitedAt = participant.InvitedAt
        };
    }

    public async Task<bool> RemoveParticipantAsync(Guid participantId)
    {
        var participant = await _context.Set<RadiologyConsultationParticipant>().FindAsync(participantId);
        if (participant == null) return false;
        _context.Set<RadiologyConsultationParticipant>().Remove(participant);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationParticipantDto> JoinConsultationAsync(Guid sessionId, Guid userId)
    {
        var participant = await _context.Set<RadiologyConsultationParticipant>()
            .FirstOrDefaultAsync(p => p.SessionId == sessionId && p.UserId == userId);

        if (participant == null)
        {
            participant = new RadiologyConsultationParticipant
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                UserId = userId,
                Role = "Participant",
                Status = 3, // Joined
                JoinedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };
            await _context.Set<RadiologyConsultationParticipant>().AddAsync(participant);
        }
        else
        {
            participant.Status = 3;
            participant.JoinedAt = DateTime.Now;
        }

        await _unitOfWork.SaveChangesAsync();

        return new ConsultationParticipantDto
        {
            Id = participant.Id,
            UserId = participant.UserId,
            JoinedAt = participant.JoinedAt
        };
    }

    public async Task<bool> LeaveConsultationAsync(Guid sessionId, Guid userId)
    {
        var participant = await _context.Set<RadiologyConsultationParticipant>()
            .FirstOrDefaultAsync(p => p.SessionId == sessionId && p.UserId == userId);

        if (participant == null) return false;

        participant.Status = 4; // Left
        participant.LeftAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationDiscussionDto> AddDiscussionAsync(AddConsultationDiscussionDto dto)
    {
        var discussion = new RadiologyConsultationDiscussion
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            CaseId = dto.CaseId,
            ParticipantId = GetCurrentUserIdOrAdmin(),
            MessageType = dto.MessageType ?? "Text",
            Content = dto.Content,
            PostedAt = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationDiscussion>().AddAsync(discussion);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationDiscussionDto
        {
            Id = discussion.Id,
            Content = discussion.Content,
            MessageType = discussion.MessageType,
            PostedAt = discussion.PostedAt
        };
    }

    public async Task<List<ConsultationDiscussionDto>> GetDiscussionsAsync(Guid caseId)
    {
        var discussions = await _context.Set<RadiologyConsultationDiscussion>()
            .Include(d => d.Participant)
            .Where(d => d.CaseId == caseId)
            .OrderBy(d => d.PostedAt)
            .ToBoundedListAsync("RIS.GetDiscussions");

        return discussions.Select(d => new ConsultationDiscussionDto
        {
            Id = d.Id,
            CaseId = d.CaseId,
            ParticipantId = d.ParticipantId,
            ParticipantName = d.Participant?.FullName ?? "",
            Content = d.Content,
            MessageType = d.MessageType,
            PostedAt = d.PostedAt
        }).ToList();
    }

    public async Task<ConsultationImageNoteDto> AddImageNoteAsync(AddConsultationImageNoteDto dto)
    {
        var imageNote = new RadiologyConsultationImageNote
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            StudyInstanceUID = dto.StudyInstanceUID,
            SeriesInstanceUID = dto.SeriesInstanceUID,
            SOPInstanceUID = dto.SOPInstanceUID,
            AnnotationType = dto.AnnotationType,
            AnnotationData = dto.AnnotationData,
            Notes = dto.Notes,
            IsShared = dto.IsShared,
            CreatedByUserId = GetCurrentUserIdOrAdmin(),
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationImageNote>().AddAsync(imageNote);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationImageNoteDto
        {
            Id = imageNote.Id,
            AnnotationType = imageNote.AnnotationType,
            AnnotationData = imageNote.AnnotationData,
            Notes = imageNote.Notes
        };
    }

    public async Task<List<ConsultationImageNoteDto>> GetImageNotesAsync(Guid caseId)
    {
        // Get notes by session since ImageNote doesn't have CaseId
        var notes = await _context.Set<RadiologyConsultationImageNote>()
            .Include(n => n.CreatedByUser)
            .OrderBy(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        return notes.Select(n => new ConsultationImageNoteDto
        {
            Id = n.Id,
            SessionId = n.SessionId,
            StudyInstanceUID = n.StudyInstanceUID,
            SeriesInstanceUID = n.SeriesInstanceUID,
            SOPInstanceUID = n.SOPInstanceUID,
            AnnotationType = n.AnnotationType,
            AnnotationData = n.AnnotationData,
            Notes = n.Notes,
            IsShared = n.IsShared,
            CreatedByUserName = n.CreatedByUser?.FullName ?? ""
        }).ToList();
    }

    public async Task<ConsultationMinutesDto> SaveMinutesAsync(SaveConsultationMinutesDto dto)
    {
        var minutes = await _context.Set<RadiologyConsultationMinutes>()
            .FirstOrDefaultAsync(m => m.SessionId == dto.SessionId);

        if (minutes == null)
        {
            minutes = new RadiologyConsultationMinutes
            {
                Id = Guid.NewGuid(),
                SessionId = dto.SessionId,
                CreatedByUserId = GetCurrentUserIdOrAdmin(),
                CreatedAt = DateTime.Now
            };
            await _context.Set<RadiologyConsultationMinutes>().AddAsync(minutes);
        }

        minutes.Content = dto.Content;
        minutes.Conclusions = dto.Conclusions;
        minutes.Recommendations = dto.Recommendations;
        minutes.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new ConsultationMinutesDto
        {
            Id = minutes.Id,
            SessionId = minutes.SessionId,
            Content = minutes.Content,
            Conclusions = minutes.Conclusions,
            Recommendations = minutes.Recommendations
        };
    }

    public async Task<ConsultationMinutesDto> GetMinutesAsync(Guid sessionId)
    {
        var minutes = await _context.Set<RadiologyConsultationMinutes>()
            .FirstOrDefaultAsync(m => m.SessionId == sessionId);

        if (minutes == null) return null;

        return new ConsultationMinutesDto
        {
            Id = minutes.Id,
            SessionId = minutes.SessionId,
            Content = minutes.Content,
            Conclusions = minutes.Conclusions,
            Recommendations = minutes.Recommendations
        };
    }

    public async Task<ConsultationMinutesDto> ApproveMinutesAsync(Guid minutesId)
    {
        var minutes = await _context.Set<RadiologyConsultationMinutes>().FindAsync(minutesId);
        if (minutes == null) return null;

        minutes.Status = 2; // Approved
        minutes.ApprovedByUserId = GetCurrentUserIdOrAdmin();
        minutes.ApprovedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationMinutesDto
        {
            Id = minutes.Id,
            Status = minutes.Status,
            ApprovedAt = minutes.ApprovedAt
        };
    }

    public async Task<ConsultationAttachmentDto> AddAttachmentAsync(AddConsultationAttachmentDto dto)
    {
        var attachment = new RadiologyConsultationAttachment
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            CaseId = dto.CaseId,
            FileName = dto.FileName,
            FileType = dto.FileType,
            FilePath = "", // Will be set after file upload
            FileSize = 0,
            UploadedByUserId = GetCurrentUserIdOrAdmin(),
            UploadedAt = DateTime.Now,
            Description = dto.Description,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationAttachment>().AddAsync(attachment);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationAttachmentDto
        {
            Id = attachment.Id,
            FileName = attachment.FileName,
            FileType = attachment.FileType,
            FilePath = attachment.FilePath,
            UploadedAt = attachment.UploadedAt
        };
    }

    public async Task<List<ConsultationAttachmentDto>> GetAttachmentsAsync(Guid caseId)
    {
        var attachments = await _context.Set<RadiologyConsultationAttachment>()
            .Where(a => a.CaseId == caseId)
            .ToListAsync();

        return attachments.Select(a => new ConsultationAttachmentDto
        {
            Id = a.Id,
            FileName = a.FileName,
            FileType = a.FileType,
            FilePath = a.FilePath,
            FileSize = a.FileSize,
            UploadedAt = a.UploadedAt
        }).ToList();
    }

    private string GetConsultationStatusName(int status) => status switch
    {
        0 => "Scheduled",
        1 => "InProgress",
        2 => "Completed",
        3 => "Cancelled",
        _ => "Unknown"
    };

    #endregion
}
