using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Filters;
using HIS.API.Controllers;

namespace HIS.API.Dtos.DevLinkRadiology;

    public record LinkResult(int RequestsUpdated, int ExamsCreated, int StudiesCreated, List<string> OrthancUIDs);

