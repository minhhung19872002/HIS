using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponseDto>>> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.LoginAsync(dto);
        if (result == null)
            return Unauthorized(ApiResponse<LoginResponseDto>.Fail("Invalid username or password"));

        return Ok(ApiResponse<LoginResponseDto>.Ok(result, result.RequiresOtp ? "OTP sent" : "Login successful"));
    }

    [HttpPost("verify-otp")]
    public async Task<ActionResult<ApiResponse<LoginResponseDto>>> VerifyOtp([FromBody] VerifyOtpDto dto)
    {
        var result = await _authService.VerifyOtpAsync(dto);
        if (result == null)
            return Unauthorized(ApiResponse<LoginResponseDto>.Fail("Mã OTP không hợp lệ hoặc đã hết hạn"));

        return Ok(ApiResponse<LoginResponseDto>.Ok(result, "Login successful"));
    }

    [HttpPost("resend-otp")]
    public async Task<ActionResult<ApiResponse<bool>>> ResendOtp([FromBody] ResendOtpRequest request)
    {
        var result = await _authService.ResendOtpAsync(request.UserId);
        if (!result)
            return BadRequest(ApiResponse<bool>.Fail("Không thể gửi lại OTP. Vui lòng chờ 30 giây."));

        return Ok(ApiResponse<bool>.Ok(true, "OTP đã được gửi lại"));
    }

    [Authorize]
    [HttpGet("2fa-status")]
    public async Task<ActionResult<ApiResponse<TwoFactorStatusDto>>> GetTwoFactorStatus()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var status = await _authService.GetTwoFactorStatusAsync(userId);

        if (status == null)
            return NotFound(ApiResponse<TwoFactorStatusDto>.Fail("User not found"));

        return Ok(ApiResponse<TwoFactorStatusDto>.Ok(status));
    }

    [Authorize]
    [HttpPost("enable-2fa")]
    public async Task<ActionResult<ApiResponse<bool>>> EnableTwoFactor([FromBody] EnableTwoFactorDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _authService.EnableTwoFactorAsync(userId, dto.Password);

        if (!result)
            return BadRequest(ApiResponse<bool>.Fail("Mật khẩu không đúng hoặc email chưa được cấu hình"));

        return Ok(ApiResponse<bool>.Ok(true, "Xác thực 2 yếu tố đã được bật"));
    }

    [Authorize]
    [HttpPost("disable-2fa")]
    public async Task<ActionResult<ApiResponse<bool>>> DisableTwoFactor([FromBody] EnableTwoFactorDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _authService.DisableTwoFactorAsync(userId, dto.Password);

        if (!result)
            return BadRequest(ApiResponse<bool>.Fail("Mật khẩu không đúng"));

        return Ok(ApiResponse<bool>.Ok(true, "Xác thực 2 yếu tố đã được tắt"));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse<bool>>> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _authService.ChangePasswordAsync(userId, dto);

        if (!result)
            return BadRequest(ApiResponse<bool>.Fail("Current password is incorrect"));

        return Ok(ApiResponse<bool>.Ok(true, "Password changed successfully"));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetCurrentUser()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _authService.GetCurrentUserAsync(userId);

        if (user == null)
            return NotFound(ApiResponse<UserDto>.Fail("User not found"));

        return Ok(ApiResponse<UserDto>.Ok(user));
    }

    // WebAuthn/FIDO2 endpoints (NangCap12)
    [Authorize]
    [HttpPost("webauthn/register-options")]
    public async Task<ActionResult<ApiResponse<WebAuthnRegisterOptionsDto>>> WebAuthnRegisterOptions()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _authService.GetCurrentUserAsync(userId);
        if (user == null) return NotFound(ApiResponse<WebAuthnRegisterOptionsDto>.Fail("User not found"));

        var existingCreds = await _authService.GetWebAuthnCredentialsAsync(userId);
        var options = new WebAuthnRegisterOptionsDto
        {
            Challenge = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)),
            RpId = Request.Host.Host,
            RpName = "HIS - Hospital Information System",
            UserId = Convert.ToBase64String(userId.ToByteArray()),
            UserName = user.Username,
            UserDisplayName = user.FullName,
            ExcludeCredentials = existingCreds.Select(c => c.CredentialId).ToList()
        };
        // Store challenge in cache/session for verification
        HttpContext.Items["webauthn_challenge"] = options.Challenge;
        return Ok(ApiResponse<WebAuthnRegisterOptionsDto>.Ok(options));
    }

    [Authorize]
    [HttpPost("webauthn/register")]
    public async Task<ActionResult<ApiResponse<WebAuthnCredentialDto>>> WebAuthnRegister([FromBody] WebAuthnRegisterDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _authService.RegisterWebAuthnCredentialAsync(userId, dto);
        if (result == null) return BadRequest(ApiResponse<WebAuthnCredentialDto>.Fail("Registration failed"));
        return Ok(ApiResponse<WebAuthnCredentialDto>.Ok(result, "Biometric credential registered"));
    }

    [HttpPost("webauthn/authenticate-options")]
    public async Task<ActionResult<ApiResponse<WebAuthnAuthOptionsDto>>> WebAuthnAuthOptions([FromQuery] Guid userId)
    {
        var credentials = await _authService.GetWebAuthnCredentialsAsync(userId);
        if (!credentials.Any()) return NotFound(ApiResponse<WebAuthnAuthOptionsDto>.Fail("No credentials registered"));

        var options = new WebAuthnAuthOptionsDto
        {
            Challenge = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)),
            RpId = Request.Host.Host,
            AllowCredentials = credentials.Select(c => new WebAuthnAllowCredentialDto { Id = c.CredentialId }).ToList()
        };
        return Ok(ApiResponse<WebAuthnAuthOptionsDto>.Ok(options));
    }

    [HttpPost("webauthn/authenticate")]
    public async Task<ActionResult<ApiResponse<LoginResponseDto>>> WebAuthnAuthenticate([FromBody] WebAuthnAuthenticateDto dto)
    {
        var result = await _authService.AuthenticateWebAuthnAsync(dto);
        if (result == null) return Unauthorized(ApiResponse<LoginResponseDto>.Fail("Biometric authentication failed"));
        return Ok(ApiResponse<LoginResponseDto>.Ok(result, "Biometric login successful"));
    }

    [Authorize]
    [HttpGet("webauthn/credentials")]
    public async Task<ActionResult<ApiResponse<List<WebAuthnCredentialDto>>>> GetWebAuthnCredentials()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var credentials = await _authService.GetWebAuthnCredentialsAsync(userId);
        return Ok(ApiResponse<List<WebAuthnCredentialDto>>.Ok(credentials));
    }

    [Authorize]
    [HttpDelete("webauthn/credentials/{credentialId}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteWebAuthnCredential(Guid credentialId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _authService.DeleteWebAuthnCredentialAsync(userId, credentialId);
        if (!result) return NotFound(ApiResponse<bool>.Fail("Credential not found"));
        return Ok(ApiResponse<bool>.Ok(true, "Credential deleted"));
    }
}

public class ResendOtpRequest
{
    public Guid UserId { get; set; }
}
