using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using HIS.Application.Common;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Http;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Đọc người dùng hiện tại từ <see cref="IHttpContextAccessor"/> theo claim canonical.
/// Triển khai duy nhất của <see cref="ICurrentUserAccessor"/> — thay cho các
/// <c>GetCurrentUserId/Name</c> tự cài rải rác trong từng service (xem #200 REFAC-1).
/// </summary>
public class CurrentUserAccessor : ICurrentUserAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public string? UserId => User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    public Guid? UserGuid => Guid.TryParse(UserId, out var id) ? id : null;

    public string? UserName =>
        User?.FindFirst(ClaimTypes.Name)?.Value
        ?? User?.FindFirst(JwtClaims.FullName)?.Value;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public IReadOnlyList<string> Roles =>
        User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? new List<string>();

    /// <summary>AUTHZ-3 (#369): claim <c>branchId</c> — null = không giới hạn.</summary>
    public Guid? BranchId =>
        Guid.TryParse(User?.FindFirst(JwtClaims.BranchId)?.Value, out var b) ? b : null;
}
