using HIS.PatientApp.Api.Auth;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Dtos;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Xác thực cho app người bệnh (HSMT I.2 #2 và #9).
///
/// Mọi đường công khai ở đây đều có giới hạn tần suất — đây là bề mặt mở ra Internet, và khảo sát
/// cho thấy <c>POST /api/portal/login</c> của HIS thiếu đúng thứ này (§11.1 GAP 2).
/// </summary>
[ApiController]
[Route("api/v1/patient/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly PatientAuthService _auth;
    private readonly OtpService _otp;
    private readonly PatientAppDbContext _db;
    private readonly TokenService _tokens;

    public AuthController(
        PatientAuthService auth, OtpService otp, PatientAppDbContext db, TokenService tokens)
    {
        _auth = auth;
        _otp = otp;
        _db = db;
        _tokens = tokens;
    }

    /// <summary>Gửi mã OTP về số điện thoại.</summary>
    [HttpPost("request-otp")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Otp)]
    public async Task<IActionResult> RequestOtp(RequestOtpDto dto, CancellationToken ct)
    {
        if (!PhoneNumbers.IsValidVietnameseMobile(dto.PhoneNumber))
            return BadRequest(ApiResponse.Fail("Số điện thoại không hợp lệ."));

        if (dto.Purpose != OtpPurpose.Register &&
            dto.Purpose != OtpPurpose.ResetPassword &&
            dto.Purpose != OtpPurpose.LinkPatient)
            return BadRequest(ApiResponse.Fail("Mục đích gửi mã không hợp lệ."));

        var issued = await _otp.IssueAsync(dto.PhoneNumber, dto.Purpose, HttpContext.GetClientIp(), ct);
        if (!issued)
            return StatusCode(StatusCodes.Status429TooManyRequests,
                ApiResponse.Fail("Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ít phút."));

        // KHÔNG cho biết số điện thoại đã có tài khoản hay chưa — nếu không, đây thành công cụ
        // dò xem ai là bệnh nhân của bệnh viện.
        return Ok(ApiResponse.Ok("Đã gửi mã xác thực."));
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<IActionResult> Register(RegisterDto dto, CancellationToken ct)
    {
        var outcome = await _auth.RegisterAsync(dto, HttpContext.GetClientIp(), ct);
        return outcome.Success
            ? Ok(ApiResponse<AuthResultDto>.Ok(outcome.Result!))
            : BadRequest(ApiResponse.Fail(outcome.Message!, outcome.Error));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<IActionResult> Login(LoginDto dto, CancellationToken ct)
    {
        var outcome = await _auth.LoginAsync(dto, HttpContext.GetClientIp(), ct);
        return outcome.Success
            ? Ok(ApiResponse<AuthResultDto>.Ok(outcome.Result!))
            : Unauthorized(ApiResponse.Fail(outcome.Message!, outcome.Error));
    }

    /// <summary>Làm mới phiên — nền của tính năng "giữ đăng nhập" trong HSMT.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<IActionResult> Refresh(RefreshDto dto, CancellationToken ct)
    {
        var result = await _auth.RefreshAsync(dto.RefreshToken, HttpContext.GetClientIp(), ct);
        return result is null
            ? Unauthorized(ApiResponse.Fail("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."))
            : Ok(ApiResponse<AuthResultDto>.Ok(result.Result));
    }

    /// <summary>Đăng xuất máy hiện tại. Các máy khác giữ nguyên phiên.</summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await _tokens.RevokeDeviceAsync(
            User.GetAccountId(), User.GetDeviceId(), DateTime.UtcNow, ct);
        await _db.SaveChangesAsync(ct);
        return Ok(ApiResponse.Ok("Đã đăng xuất."));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var account = await _db.Accounts
            .Include(a => a.Devices)
            .FirstOrDefaultAsync(a => a.Id == User.GetAccountId(), ct);

        return account is null
            ? NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."))
            : Ok(ApiResponse<AccountDto>.Ok(PatientAuthService.ToDto(account)));
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto, CancellationToken ct)
    {
        var (success, message, result) = await _auth.ChangePasswordAsync(
            User.GetAccountId(), User.GetDeviceId(), dto, HttpContext.GetClientIp(), ct);

        if (!success) return BadRequest(ApiResponse.Fail(message!));
        return result is null
            ? Ok(ApiResponse.Ok(message))
            : Ok(ApiResponse<AuthResultDto>.Ok(result, message));
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto, CancellationToken ct)
    {
        var (success, message) = await _auth.ResetPasswordAsync(dto, ct);
        return success ? Ok(ApiResponse.Ok(message)) : BadRequest(ApiResponse.Fail(message));
    }

    [HttpPost("pin")]
    [Authorize]
    public async Task<IActionResult> SetPin(SetPinDto dto, CancellationToken ct)
    {
        var (success, message) = await _auth.SetPinAsync(User.GetAccountId(), dto, ct);
        return success ? Ok(ApiResponse.Ok(message)) : BadRequest(ApiResponse.Fail(message));
    }

    /// <summary>Mở khoá app hoặc mở khoá màn bệnh án bằng PIN.</summary>
    [HttpPost("pin/verify")]
    [Authorize]
    public async Task<IActionResult> VerifyPin(VerifyPinDto dto, CancellationToken ct)
    {
        var (success, message) = await _auth.VerifyPinAsync(User.GetAccountId(), dto.Pin, ct);
        return success ? Ok(ApiResponse.Ok(message)) : BadRequest(ApiResponse.Fail(message));
    }

    /// <summary>Bật đăng nhập sinh trắc trên máy hiện tại bằng cách gửi lên khoá công khai.</summary>
    [HttpPost("biometric/enroll")]
    [Authorize]
    public async Task<IActionResult> EnrollBiometric(EnrollBiometricDto dto, CancellationToken ct)
    {
        var (success, message) = await _auth.EnrollBiometricAsync(
            User.GetAccountId(), User.GetDeviceId(), dto, ct);
        return success ? Ok(ApiResponse.Ok(message)) : BadRequest(ApiResponse.Fail(message));
    }

    /// <summary>Xin chuỗi thử thách để ký bằng khoá sinh trắc.</summary>
    [HttpPost("biometric/challenge")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<IActionResult> BiometricChallenge(
        BiometricChallengeRequestDto dto, CancellationToken ct)
    {
        var challenge = await _auth.CreateBiometricChallengeAsync(dto, ct);
        return challenge is null
            ? BadRequest(ApiResponse.Fail("Thiết bị này chưa bật đăng nhập bằng sinh trắc học."))
            : Ok(ApiResponse<BiometricChallengeDto>.Ok(challenge));
    }

    [HttpPost("biometric/login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<IActionResult> BiometricLogin(BiometricLoginDto dto, CancellationToken ct)
    {
        var outcome = await _auth.BiometricLoginAsync(dto, HttpContext.GetClientIp(), ct);
        return outcome.Success
            ? Ok(ApiResponse<AuthResultDto>.Ok(outcome.Result!))
            : Unauthorized(ApiResponse.Fail(outcome.Message!, outcome.Error));
    }
}
