using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.API.Controllers;

namespace HIS.API.Dtos.SupplementaryControllers2;

public class ApproveAuditSessionDto
{
    public string? Notes { get; set; }
}

public class BatchSubmitAuditDto
{
    public List<Guid> SessionIds { get; set; } = new();
}

public class BatchExportXmlDto
{
    public List<Guid> SessionIds { get; set; } = new();
}

