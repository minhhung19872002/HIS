using System.Security.Claims;
using System.Security.Cryptography;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.VideoConsultation;

    public record CreateRoomDto(
        string Title,
        int RoomType,
        string? Description,
        string? StudyInstanceUID,
        Guid? PatientId,
        Guid? MedicalRecordId,
        DateTime? ScheduledAt,
        bool IsRecorded,
        string? Password,
        string[]? InviteEmails);

    public record RoomDto(
        Guid Id,
        string RoomName,
        string Title,
        int RoomType,
        string? StudyInstanceUID,
        Guid? PatientId,
        string? PatientName,
        Guid HostUserId,
        string? HostName,
        DateTime ScheduledAt,
        DateTime? StartedAt,
        DateTime? EndedAt,
        int Status,
        string StatusText,
        bool IsRecorded,
        string? RecordingUrl,
        bool HasPassword,
        string JitsiUrl,
        string? ConclusionNote,
        DateTime CreatedAt);

    public record EndRoomDto(string? ConclusionNote);

    public record JoinDto(string DisplayName, string? Email, string? Role);

    public record CancelDto(string? Reason);

