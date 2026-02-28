using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public interface ITokenRegistryService
{
    Task<TokenUserMapping?> GetMappingBySerialAsync(string tokenSerial);
    Task<List<TokenInfoDto>> GetUserTokensAsync(Guid userId);
    Task<TokenUserMapping> RegisterTokenAsync(Guid userId, string tokenSerial, string tokenLabel, string caProvider);
    Task UpdateLastUsedAsync(string tokenSerial);
    Task DeactivateTokenAsync(string tokenSerial);
}

public class TokenRegistryService : ITokenRegistryService
{
    private readonly HISDbContext _db;
    private readonly ILogger<TokenRegistryService> _logger;

    public TokenRegistryService(HISDbContext db, ILogger<TokenRegistryService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<TokenUserMapping?> GetMappingBySerialAsync(string tokenSerial)
    {
        return await _db.TokenUserMappings
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenSerial == tokenSerial && t.IsActive);
    }

    public async Task<List<TokenInfoDto>> GetUserTokensAsync(Guid userId)
    {
        return await _db.TokenUserMappings
            .Where(t => t.UserId == userId && t.IsActive)
            .Select(t => new TokenInfoDto
            {
                TokenSerial = t.TokenSerial,
                TokenLabel = t.TokenLabel,
                CaProvider = t.CaProvider,
                MappedUserName = t.User != null ? t.User.FullName : null,
                LastUsedAt = t.LastUsedAt,
                IsActive = t.IsActive
            })
            .ToListAsync();
    }

    public async Task<TokenUserMapping> RegisterTokenAsync(Guid userId, string tokenSerial, string tokenLabel, string caProvider)
    {
        var existing = await _db.TokenUserMappings
            .FirstOrDefaultAsync(t => t.TokenSerial == tokenSerial);

        if (existing != null)
        {
            // Update existing mapping
            existing.UserId = userId;
            existing.TokenLabel = tokenLabel;
            existing.CaProvider = caProvider;
            existing.LastUsedAt = DateTime.UtcNow;
            existing.IsActive = true;
            _db.TokenUserMappings.Update(existing);
        }
        else
        {
            existing = new TokenUserMapping
            {
                TokenSerial = tokenSerial,
                TokenLabel = tokenLabel,
                CaProvider = caProvider,
                UserId = userId,
                FirstRegisteredAt = DateTime.UtcNow,
                LastUsedAt = DateTime.UtcNow,
                IsActive = true
            };
            _db.TokenUserMappings.Add(existing);
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Token {Serial} registered/updated for user {UserId}", tokenSerial, userId);
        return existing;
    }

    public async Task UpdateLastUsedAsync(string tokenSerial)
    {
        var mapping = await _db.TokenUserMappings
            .FirstOrDefaultAsync(t => t.TokenSerial == tokenSerial && t.IsActive);

        if (mapping != null)
        {
            mapping.LastUsedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task DeactivateTokenAsync(string tokenSerial)
    {
        var mapping = await _db.TokenUserMappings
            .FirstOrDefaultAsync(t => t.TokenSerial == tokenSerial);

        if (mapping != null)
        {
            mapping.IsActive = false;
            await _db.SaveChangesAsync();
            _logger.LogInformation("Token {Serial} deactivated", tokenSerial);
        }
    }
}
