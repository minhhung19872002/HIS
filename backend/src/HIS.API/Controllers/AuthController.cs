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
}

public class ResendOtpRequest
{
    public Guid UserId { get; set; }
}
