using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.SpecimenImage;

    public record UploadResultDto(
        Guid? PathologyResultId,
        Guid? ServiceRequestDetailId,
        Guid? ServiceRequestId,
        string? Caption,
        string? Magnification,
        /// <summary>manual | webcam | microscope</summary>
        string Source = "manual");

    public record UploadBase64Dto(
        string Base64Data,
        string MimeType,
        Guid? PathologyResultId,
        Guid? ServiceRequestDetailId,
        Guid? ServiceRequestId,
        string? Caption,
        string? Magnification,
        string Source = "webcam");

    public record UpdateImageDto(string? Caption, string? Magnification, bool? IncludeInReport, int? SortOrder);

