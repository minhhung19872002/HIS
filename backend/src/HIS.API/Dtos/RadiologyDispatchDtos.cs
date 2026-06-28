using System.Security.Claims;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.RadiologyDispatch;

    public record CreateDispatchDto(
        Guid ServiceRequestDetailId,
        Guid RoomId,
        int? Priority,
        string? Note);

    public record SavePermissionDto(
        Guid UserId,
        Guid? RoomId,
        /// <summary>G-36: FK sang RadiologyModalities.Id — null = áp dụng mọi loại máy</summary>
        Guid? ModalityId,
        string? ModalityType,
        int Permissions,
        string? RoleTemplate);

