using System.Security.Claims;
using HIS.Core.Constants;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using HIS.API.Dtos.DigitalSignature;

namespace HIS.API.Controllers;

public partial class DigitalSignatureController
{
    /// <summary>
    /// Get available USB tokens
    /// </summary>
    [HttpGet("tokens")]
    public ActionResult<List<TokenInfoDto>> GetTokens()
    {
        try
        {
            var tokens = _sessionManager.GetAllTokens();
            var result = tokens.Select(t => new TokenInfoDto
            {
                TokenSerial = t.Serial,
                TokenLabel = t.Label,
                CaProvider = t.Provider,
                IsActive = true
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error enumerating tokens");
            return Ok(new List<TokenInfoDto>());
        }
    }

    /// <summary>
    /// Register a token to the current user
    /// </summary>
    [HttpPost("register-token")]
    public async Task<ActionResult> RegisterToken([FromBody] RegisterTokenRequest request)
    {
        var userId = GetCurrentUserId();
        await _tokenRegistry.RegisterTokenAsync(userId, request.TokenSerial, "", "");
        return Ok(new { message = "Token đã được đăng ký" });
    }
}
