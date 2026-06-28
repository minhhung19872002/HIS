using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.ServiceVolumeReport;

    public record RoomServiceVolumeDto(
        Guid RoomId,
        string RoomCode,
        string RoomName,
        int RoomType,
        int ServiceCount);

