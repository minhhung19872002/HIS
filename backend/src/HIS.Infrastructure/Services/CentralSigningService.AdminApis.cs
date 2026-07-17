using System.Diagnostics;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Security.Cryptography.Xml;
using System.Text;
using System.Xml;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class CentralSigningService
{
    // ============ Admin APIs ============

    public async Task<List<ManagedCertificateDto>> GetManagedCertificatesAsync(string? keyword, bool? isActive)
    {
        var query = _db.Set<ManagedCertificate>().Include(c => c.OwnerUser).AsQueryable();

        if (isActive.HasValue) query = query.Where(c => c.IsActive == isActive.Value);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.SubjectName.Contains(keyword) || c.SerialNumber.Contains(keyword)
                || c.Cccd != null && c.Cccd.Contains(keyword));

        return await query.OrderByDescending(c => c.CreatedAt).Select(c => new ManagedCertificateDto
        {
            Id = c.Id, SerialNumber = c.SerialNumber, SubjectName = c.SubjectName,
            IssuerName = c.IssuerName, CaProvider = c.CaProvider,
            ValidFrom = c.ValidFrom, ValidTo = c.ValidTo, IsActive = c.IsActive,
            OwnerUserId = c.OwnerUserId.HasValue ? c.OwnerUserId.Value.ToString() : null,
            OwnerFullName = c.OwnerUser != null ? c.OwnerUser.FullName : null,
            Cccd = c.Cccd, SignatureImagePath = c.SignatureImagePath,
            StorageType = c.StorageType, CreatedAt = c.CreatedAt
        }).ToBoundedListAsync("CentralSigningService.GetManagedCertificatesAsync");
    }

    public async Task<ManagedCertificateDto?> SaveManagedCertificateAsync(SaveManagedCertificateRequest request)
    {
        ManagedCertificate entity;
        if (request.Id.HasValue)
        {
            entity = await _db.Set<ManagedCertificate>().FindAsync(request.Id.Value) ?? new ManagedCertificate();
        }
        else
        {
            entity = new ManagedCertificate();
            _db.Set<ManagedCertificate>().Add(entity);
        }

        entity.SerialNumber = request.SerialNumber;
        entity.SubjectName = request.SubjectName;
        entity.IssuerName = request.IssuerName;
        entity.CaProvider = request.CaProvider;
        entity.ValidFrom = request.ValidFrom;
        entity.ValidTo = request.ValidTo;
        entity.IsActive = request.IsActive;
        entity.Cccd = request.Cccd;
        entity.StorageType = request.StorageType;
        if (!string.IsNullOrEmpty(request.OwnerUserId) && Guid.TryParse(request.OwnerUserId, out var ownerId))
            entity.OwnerUserId = ownerId;

        await _db.SaveChangesAsync();

        return new ManagedCertificateDto
        {
            Id = entity.Id, SerialNumber = entity.SerialNumber, SubjectName = entity.SubjectName,
            IssuerName = entity.IssuerName, CaProvider = entity.CaProvider,
            ValidFrom = entity.ValidFrom, ValidTo = entity.ValidTo, IsActive = entity.IsActive,
            StorageType = entity.StorageType, Cccd = entity.Cccd, CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteManagedCertificateAsync(Guid id)
    {
        var entity = await _db.Set<ManagedCertificate>().FindAsync(id);
        if (entity == null) return false;
        _db.Set<ManagedCertificate>().Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<SigningTransactionDto>> GetTransactionsAsync(SigningTransactionSearchDto search)
    {
        var query = _db.Set<SigningTransaction>().Include(t => t.User).AsQueryable();

        if (!string.IsNullOrEmpty(search.UserId)) query = query.Where(t => t.UserId.ToString() == search.UserId);
        if (!string.IsNullOrEmpty(search.Action)) query = query.Where(t => t.Action == search.Action);
        if (!string.IsNullOrEmpty(search.DataType)) query = query.Where(t => t.DataType == search.DataType);
        if (search.Success.HasValue) query = query.Where(t => t.Success == search.Success.Value);
        if (search.DateFrom.HasValue) query = query.Where(t => t.Timestamp >= search.DateFrom.Value);
        if (search.DateTo.HasValue) query = query.Where(t => t.Timestamp <= search.DateTo.Value);
        if (!string.IsNullOrEmpty(search.Keyword))
            query = query.Where(t => (t.User != null && t.User.FullName.Contains(search.Keyword)) || t.CertificateSerial != null && t.CertificateSerial.Contains(search.Keyword));

        return await query.OrderByDescending(t => t.Timestamp)
            .Skip(search.PageIndex * search.PageSize).Take(search.PageSize)
            .Select(t => new SigningTransactionDto
            {
                Id = t.Id, UserId = t.UserId.ToString(),
                UserFullName = t.User != null ? t.User.FullName : "",
                Action = t.Action, DataType = t.DataType, Success = t.Success,
                ErrorMessage = t.ErrorMessage, CertificateSerial = t.CertificateSerial,
                CaProvider = t.CaProvider, HashAlgorithm = t.HashAlgorithm,
                DataSizeBytes = t.DataSizeBytes, DurationMs = t.DurationMs,
                IpAddress = t.IpAddress, Timestamp = t.Timestamp
            }).ToListAsync();
    }

    public async Task<int> GetTransactionCountAsync(SigningTransactionSearchDto search)
    {
        var query = _db.Set<SigningTransaction>().AsQueryable();
        if (!string.IsNullOrEmpty(search.UserId)) query = query.Where(t => t.UserId.ToString() == search.UserId);
        if (!string.IsNullOrEmpty(search.Action)) query = query.Where(t => t.Action == search.Action);
        if (search.Success.HasValue) query = query.Where(t => t.Success == search.Success.Value);
        if (search.DateFrom.HasValue) query = query.Where(t => t.Timestamp >= search.DateFrom.Value);
        if (search.DateTo.HasValue) query = query.Where(t => t.Timestamp <= search.DateTo.Value);
        return await query.CountAsync();
    }

    public async Task<SigningStatisticsDto> GetStatisticsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var thirtyDaysAgo = today.AddDays(-30);

        var stats = new SigningStatisticsDto
        {
            TotalTransactions = await _db.Set<SigningTransaction>().CountAsync(),
            TotalSuccess = await _db.Set<SigningTransaction>().CountAsync(t => t.Success),
            TotalFailed = await _db.Set<SigningTransaction>().CountAsync(t => !t.Success),
            ActiveCertificates = await _db.Set<ManagedCertificate>().CountAsync(c => c.IsActive && c.ValidTo > DateTime.UtcNow),
            ExpiringSoon = await _db.Set<ManagedCertificate>().CountAsync(c => c.IsActive && c.ValidTo > DateTime.UtcNow && c.ValidTo <= DateTime.UtcNow.AddDays(30)),
            ExpiredCertificates = await _db.Set<ManagedCertificate>().CountAsync(c => c.ValidTo <= DateTime.UtcNow),
            ActiveUsers = await _db.Set<SigningTransaction>().Where(t => t.Timestamp >= thirtyDaysAgo).Select(t => t.UserId).Distinct().CountAsync(),
            TodayTransactions = await _db.Set<SigningTransaction>().CountAsync(t => t.Timestamp >= today),
        };

        // Daily trend (last 7 days) - materialize then group in memory
        var sevenDaysAgo = today.AddDays(-7);
        var recentTx = await _db.Set<SigningTransaction>()
            .Where(t => t.Timestamp >= sevenDaysAgo)
            .Select(t => t.Timestamp)
            .ToListAsync();
        stats.DailyTrend = recentTx
            .GroupBy(ts => ts.Date)
            .Select(g => new SigningDailyCount { Date = g.Key.ToString("dd/MM"), Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToList();

        // By type - materialize then group
        var allTypes = await _db.Set<SigningTransaction>()
            .Select(t => t.DataType)
            .ToListAsync();
        stats.ByType = allTypes
            .GroupBy(dt => dt)
            .Select(g => new SigningByTypeCount { DataType = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToList();

        // Top users (last 30 days) - materialize then group
        var recentUserTx = await _db.Set<SigningTransaction>()
            .Where(t => t.Timestamp >= thirtyDaysAgo)
            .Include(t => t.User)
            .Select(t => new { t.UserId, UserName = t.User != null ? t.User.FullName : "Unknown" })
            .ToListAsync();
        stats.TopUsers = recentUserTx
            .GroupBy(t => new { t.UserId, t.UserName })
            .Select(g => new SigningByUserCount { UserFullName = g.Key.UserName, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(10)
            .ToList();

        return stats;
    }

    public async Task LogTransactionAsync(SigningTransaction transaction)
    {
        try
        {
            _db.Set<SigningTransaction>().Add(transaction);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log signing transaction");
        }
    }

    // ============ HSM APIs (stub - requires hardware) ============

    public Task<HsmInfoDto> GetHsmInfoAsync()
    {
        // HSM hardware connectivity stub
        return Task.FromResult(new HsmInfoDto
        {
            Connected = false,
            Model = "HSM chưa được kết nối",
            FirmwareVersion = "N/A",
            TotalSlots = 0, UsedSlots = 0, AvailableSlots = 0,
            Slots = new List<HsmSlotDto>()
        });
    }

    public Task<CsrResult> CreateCsrAsync(CreateCsrRequest request)
    {
        try
        {
            using var rsa = RSA.Create(request.KeySize);
            var subjectName = $"CN={request.CommonName},O={request.Organization},OU={request.OrganizationUnit},C={request.Country},ST={request.Province}";
            var certRequest = new CertificateRequest(subjectName, rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            var csrDer = certRequest.CreateSigningRequest();
            var csrPem = "-----BEGIN CERTIFICATE REQUEST-----\n" +
                Convert.ToBase64String(csrDer, Base64FormattingOptions.InsertLineBreaks) +
                "\n-----END CERTIFICATE REQUEST-----";

            return Task.FromResult(new CsrResult { Success = true, CsrPem = csrPem });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new CsrResult { Success = false, Message = ex.Message });
        }
    }

    public async Task<bool> UploadSignatureImageAsync(string cccd, byte[] imageBytes)
    {
        var cert = await _db.Set<ManagedCertificate>().FirstOrDefaultAsync(c => c.Cccd == cccd);
        if (cert == null) return false;

        var dir = Path.Combine(Directory.GetCurrentDirectory(), "Reports", "SignatureImages");
        Directory.CreateDirectory(dir);
        var filePath = Path.Combine(dir, $"{cccd}.png");
        await File.WriteAllBytesAsync(filePath, imageBytes);
        cert.SignatureImagePath = filePath;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<string>> ExportCertificateSerialListAsync()
    {
        return await _db.Set<ManagedCertificate>()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SerialNumber)
            .Select(c => c.SerialNumber)
            .ToListAsync();
    }
}
