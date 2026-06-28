using System.Security.Claims;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.AiLabeling;

    public record SaveAiResultDto(
        string StudyInstanceUID,
        Guid? PatientId,
        Guid? RadiologyRequestId,
        string ModelName,
        string? ModelVersion,
        string? ModelUrl,
        int DurationMs,
        string LabelsJson,
        string? InputImageHash,
        int? InputWidth,
        int? InputHeight,
        string? ErrorMessage);

    public record ReviewDto(
        int ReviewStatus,          // 1=accept all, 2=accept partial, 3=reject
        string? AcceptedLabelsJson,
        string? ReviewNote);

    public record AiResultDto(
        Guid Id,
        string StudyInstanceUID,
        string ModelName,
        string? ModelVersion,
        int DurationMs,
        string LabelsJson,
        int ReviewStatus,
        string ReviewStatusLabel,
        string? AcceptedLabelsJson,
        Guid? ReviewedBy,
        string? ReviewedByName,
        DateTime? ReviewedAt,
        string? ReviewNote,
        string? CreatedBy,
        string? CreatedByName,
        DateTime CreatedAt,
        string? ErrorMessage);

    public record ModelConfigDto(
        string ModelUrl,
        string ModelName,
        string ModelVersion,
        IReadOnlyList<string> Labels,
        IReadOnlyList<string> LabelsVi,
        int InputWidth,
        int InputHeight,
        string Modality,
        bool Available);

    public record ModalitySummaryDto(
        string Modality,
        IReadOnlyList<string> Aliases,
        string ModelName,
        string ModelVersion,
        bool Available,
        string? Note);

    public record QueueItemDto(
        Guid Id,
        string StudyInstanceUID,
        Guid? PatientId,
        string? PatientName,
        Guid? RadiologyRequestId,
        string? RequestCode,
        string? Modality,
        DateTime QueuedAt,
        bool AutoQueued);

    public record ProviderDto(
        string Id,
        string Name,
        IReadOnlyList<string> SupportedModalities);

    public record RunViaProviderDto(
        string ProviderId,
        string StudyInstanceUID,
        string Modality,
        string? ImageUrl,
        Guid? PatientId,
        Guid? RadiologyRequestId);

