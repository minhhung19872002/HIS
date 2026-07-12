using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace HIS.API.Authorization;

/// <summary>
/// AUTHZ-1 (#367): sinh policy <c>perm:{code}</c> ON-DEMAND cho <see cref="RequirePermissionAttribute"/> —
/// không phải đăng ký hàng nghìn AddPolicy tay. Mọi policy khác (kể cả FallbackPolicy
/// RequireAuthenticatedUser của B3-global và [Authorize(Roles=...)]) ủy quyền nguyên vẹn cho
/// DefaultAuthorizationPolicyProvider — KHÔNG đổi hành vi gate hiện có.
/// </summary>
public sealed class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallback;

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
        => _fallback = new DefaultAuthorizationPolicyProvider(options);

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(RequirePermissionAttribute.PolicyPrefix, StringComparison.Ordinal))
        {
            var code = policyName[RequirePermissionAttribute.PolicyPrefix.Length..];
            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(code))
                .Build();
            return Task.FromResult<AuthorizationPolicy?>(policy);
        }
        return _fallback.GetPolicyAsync(policyName);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();
}
