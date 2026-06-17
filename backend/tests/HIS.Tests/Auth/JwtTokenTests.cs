using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using HIS.Application.DTOs;
using HIS.Core.Constants;
using HIS.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace HIS.Tests.Auth;

/// <summary>
/// Characterization tests for AuthService.GenerateJwtToken.
/// These tests lock the CURRENT behavior of JWT generation so regressions are caught immediately.
/// No DB, no network — runs fully offline.
/// </summary>
public class JwtTokenTests
{
    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /// <summary>
    /// Build an IConfiguration backed by in-memory key/value — mirrors appsettings.json JWT section.
    /// </summary>
    private static IConfiguration BuildConfig(
        string key = "super-secret-test-key-at-least-32-bytes!",
        string issuer = "HIS-Test",
        string audience = "HIS-Test-Audience",
        string expireMinutes = "60")
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]            = key,
                ["Jwt:Issuer"]         = issuer,
                ["Jwt:Audience"]       = audience,
                ["Jwt:ExpireMinutes"]  = expireMinutes,
            })
            .Build();
    }

    /// <summary>
    /// Construct AuthService with only IConfiguration wired (other deps are null —
    /// safe because GenerateJwtToken does NOT touch DbContext / IMapper / IEmailService / ILogger).
    /// </summary>
    private static AuthService BuildAuthService(IConfiguration config)
        => new AuthService(
            context: null!,
            configuration: config,
            mapper: null!,
            emailService: null!,
            logger: null!);

    /// <summary>
    /// Minimal UserDto used by most tests.
    /// </summary>
    private static UserDto SampleUser() => new UserDto
    {
        Id           = Guid.Parse("11111111-1111-1111-1111-111111111111"),
        Username     = "testuser",
        FullName     = "Test User",
        EmployeeCode = "EMP001",
        Roles        = new List<string> { "Admin" },
        RoleCodes    = new List<string> { "ADMIN" },
        Permissions  = new List<string> { "patient.view", "billing.create" },
    };

    // -----------------------------------------------------------------------
    // Test: token is a valid non-empty JWT string
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateJwtToken_ReturnsNonEmptyToken()
    {
        var config  = BuildConfig();
        var service = BuildAuthService(config);

        var token = service.GenerateJwtToken(SampleUser());

        token.Should().NotBeNullOrWhiteSpace();
        // A JWT has exactly 2 dots separating 3 base64url segments
        token.Split('.').Should().HaveCount(3, "JWT must have 3 segments: header.payload.signature");
    }

    // -----------------------------------------------------------------------
    // Test: generated token validates successfully with the same key
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateJwtToken_ValidatesWithSameKey()
    {
        const string key      = "super-secret-test-key-at-least-32-bytes!";
        const string issuer   = "HIS-Test";
        const string audience = "HIS-Test-Audience";

        var config  = BuildConfig(key: key, issuer: issuer, audience: audience);
        var service = BuildAuthService(config);

        var tokenStr = service.GenerateJwtToken(SampleUser());

        var handler = new JwtSecurityTokenHandler();
        var validationParams = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = issuer,
            ValidAudience            = audience,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ClockSkew                = TimeSpan.Zero,
        };

        var act = () => handler.ValidateToken(tokenStr, validationParams, out _);
        act.Should().NotThrow("a freshly generated token must be valid");
    }

    // -----------------------------------------------------------------------
    // Test: token contains expected standard claims
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateJwtToken_ContainsStandardClaims()
    {
        var config  = BuildConfig();
        var service = BuildAuthService(config);
        var user    = SampleUser();

        var tokenStr = service.GenerateJwtToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(tokenStr);

        jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value
            .Should().Be(user.Id.ToString(), "NameIdentifier must equal user.Id");

        jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value
            .Should().Be(user.Username, "Name claim must equal username");

        jwt.Claims.FirstOrDefault(c => c.Type == JwtClaims.FullName)?.Value
            .Should().Be(user.FullName, "fullName custom claim must match");

        jwt.Claims.FirstOrDefault(c => c.Type == JwtClaims.EmployeeCode)?.Value
            .Should().Be(user.EmployeeCode, "employeeCode custom claim must match");
    }

    // -----------------------------------------------------------------------
    // Test: role claims are present (both raw role names and ADMIN mapped roles)
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateJwtToken_ContainsRoleClaims()
    {
        var config  = BuildConfig();
        var service = BuildAuthService(config);
        var user    = SampleUser(); // RoleCodes = ["ADMIN"]

        var tokenStr = service.GenerateJwtToken(user);

        var handler   = new JwtSecurityTokenHandler();
        var jwt       = handler.ReadJwtToken(tokenStr);
        var roleClaims = jwt.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
            .ToList();

        // Raw role from user.Roles
        roleClaims.Should().Contain("Admin", "Admin role from user.Roles must be present");

        // English roles mapped from ADMIN roleCode (AuthService.RoleCodeToEnglishRoles)
        roleClaims.Should().Contain("Manager",  "Manager mapped from ADMIN roleCode must be present");
        roleClaims.Should().Contain("Director", "Director mapped from ADMIN roleCode must be present");
    }

    // -----------------------------------------------------------------------
    // Test: permission claims are present
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateJwtToken_ContainsPermissionClaims()
    {
        var config  = BuildConfig();
        var service = BuildAuthService(config);
        var user    = SampleUser();

        var tokenStr = service.GenerateJwtToken(user);

        var handler     = new JwtSecurityTokenHandler();
        var jwt         = handler.ReadJwtToken(tokenStr);
        var permissions = jwt.Claims
            .Where(c => c.Type == JwtClaims.Permission)
            .Select(c => c.Value)
            .ToList();

        permissions.Should().Contain("patient.view");
        permissions.Should().Contain("billing.create");
    }

    // -----------------------------------------------------------------------
    // Test: token expiry matches configured ExpireMinutes
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateJwtToken_ExpiryMatchesConfiguration()
    {
        var config  = BuildConfig(expireMinutes: "120");
        var service = BuildAuthService(config);

        var before   = DateTime.UtcNow;
        var tokenStr = service.GenerateJwtToken(SampleUser());
        var after    = DateTime.UtcNow;

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(tokenStr);

        jwt.ValidTo.Should().BeOnOrAfter(before.AddMinutes(119),
            "token should expire ~120 min from now (allow 1 min tolerance)");
        jwt.ValidTo.Should().BeOnOrBefore(after.AddMinutes(121),
            "token expiry should not exceed configured 120 min (allow 1 min tolerance)");
    }

    // -----------------------------------------------------------------------
    // Test: wrong signing key causes validation to fail (security regression guard)
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateJwtToken_FailsValidationWithWrongKey()
    {
        const string correctKey = "super-secret-test-key-at-least-32-bytes!";
        const string wrongKey   = "wrong-key-must-fail-validation-padded!!";

        var config  = BuildConfig(key: correctKey);
        var service = BuildAuthService(config);

        var tokenStr = service.GenerateJwtToken(SampleUser());

        var handler = new JwtSecurityTokenHandler();
        var validationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer           = false,
            ValidateAudience         = false,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(wrongKey)),
        };

        var act = () => handler.ValidateToken(tokenStr, validationParams, out _);
        act.Should().Throw<SecurityTokenSignatureKeyNotFoundException>(
            "a token signed with a different key must not validate");
    }

    // -----------------------------------------------------------------------
    // Test: branchId claim is present when BranchId is set (R3 multi-branch)
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateJwtToken_ContainsBranchIdWhenSet()
    {
        var config  = BuildConfig();
        var service = BuildAuthService(config);
        var branchId = Guid.NewGuid();
        var user = SampleUser();
        user.BranchId = branchId;

        var tokenStr = service.GenerateJwtToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(tokenStr);

        jwt.Claims.FirstOrDefault(c => c.Type == JwtClaims.BranchId)?.Value
            .Should().Be(branchId.ToString(), "branchId claim must match when BranchId is set");
    }

    // -----------------------------------------------------------------------
    // Test: no branchId claim when BranchId is null (global access sentinel)
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateJwtToken_NoBranchIdClaimWhenNull()
    {
        var config  = BuildConfig();
        var service = BuildAuthService(config);
        var user = SampleUser();
        user.BranchId = null; // explicitly null — SampleUser already defaults to null, this is explicit

        var tokenStr = service.GenerateJwtToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(tokenStr);

        jwt.Claims.Any(c => c.Type == JwtClaims.BranchId)
            .Should().BeFalse("branchId claim must be absent when BranchId is null (global access)");
    }
}
