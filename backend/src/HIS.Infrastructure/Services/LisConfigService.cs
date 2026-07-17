using System.Net.Sockets;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

/// <summary>
/// LIS Configuration Service Implementation
/// Quản lý cấu hình máy xét nghiệm, thông số, khoảng tham chiếu, mapping, Labconnect
/// </summary>
public partial class LisConfigService : ILisConfigService
{
    private readonly HISDbContext _context;
    private readonly ILogger<LisConfigService> _logger;

    public LisConfigService(HISDbContext context, ILogger<LisConfigService> logger)
    {
        _context = context;
        _logger = logger;
    }

    #region Analyzers

    public async Task<List<LisAnalyzerDto>> GetAnalyzersAsync()
    {
        try
        {
            return await _context.LisAnalyzers.AsNoTracking()
                .OrderBy(a => a.Name)
                .Select(a => new LisAnalyzerDto
                {
                    Id = a.Id,
                    Name = a.Name,
                    Model = a.Model,
                    Manufacturer = a.Manufacturer,
                    ConnectionType = a.ConnectionType,
                    IpAddress = a.IpAddress,
                    Port = a.Port,
                    ComPort = a.ComPort,
                    BaudRate = a.BaudRate,
                    ProtocolVersion = a.ProtocolVersion,
                    IsActive = a.IsActive,
                    LastConnectionTime = a.LastConnectionTime,
                    ConnectionStatus = a.ConnectionStatus,
                    Description = a.Description,
                    CreatedAt = a.CreatedAt
                })
                .ToBoundedListAsync("LisConfigService.GetAnalyzersAsync");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAnalyzersAsync");
            return new List<LisAnalyzerDto>();
        }
    }

    public async Task<LisAnalyzerDto> GetAnalyzerByIdAsync(Guid id)
    {
        try
        {
            var a = await _context.LisAnalyzers.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);
            if (a == null) return null!;

            return new LisAnalyzerDto
            {
                Id = a.Id,
                Name = a.Name,
                Model = a.Model,
                Manufacturer = a.Manufacturer,
                ConnectionType = a.ConnectionType,
                IpAddress = a.IpAddress,
                Port = a.Port,
                ComPort = a.ComPort,
                BaudRate = a.BaudRate,
                ProtocolVersion = a.ProtocolVersion,
                IsActive = a.IsActive,
                LastConnectionTime = a.LastConnectionTime,
                ConnectionStatus = a.ConnectionStatus,
                Description = a.Description,
                CreatedAt = a.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAnalyzerByIdAsync");
            return null!;
        }
    }

    public async Task<LisAnalyzerDto> CreateAnalyzerAsync(CreateLisAnalyzerDto dto)
    {
        try
        {
            var entity = new LisAnalyzer
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Model = dto.Model,
                Manufacturer = dto.Manufacturer,
                ConnectionType = dto.ConnectionType,
                IpAddress = dto.IpAddress,
                Port = dto.Port,
                ComPort = dto.ComPort,
                BaudRate = dto.BaudRate,
                ProtocolVersion = dto.ProtocolVersion,
                IsActive = dto.IsActive,
                ConnectionStatus = "Unknown",
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow
            };

            _context.LisAnalyzers.Add(entity);
            await _context.SaveChangesAsync();

            return new LisAnalyzerDto
            {
                Id = entity.Id,
                Name = entity.Name,
                Model = entity.Model,
                Manufacturer = entity.Manufacturer,
                ConnectionType = entity.ConnectionType,
                IpAddress = entity.IpAddress,
                Port = entity.Port,
                ComPort = entity.ComPort,
                BaudRate = entity.BaudRate,
                ProtocolVersion = entity.ProtocolVersion,
                IsActive = entity.IsActive,
                ConnectionStatus = entity.ConnectionStatus,
                Description = entity.Description,
                CreatedAt = entity.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateAnalyzerAsync");
            throw;
        }
    }

    public async Task<LisAnalyzerDto> UpdateAnalyzerAsync(Guid id, CreateLisAnalyzerDto dto)
    {
        try
        {
            var entity = await _context.LisAnalyzers.FindAsync(id);
            if (entity == null) throw new InvalidOperationException("Không tìm thấy máy phân tích");

            entity.Name = dto.Name;
            entity.Model = dto.Model;
            entity.Manufacturer = dto.Manufacturer;
            entity.ConnectionType = dto.ConnectionType;
            entity.IpAddress = dto.IpAddress;
            entity.Port = dto.Port;
            entity.ComPort = dto.ComPort;
            entity.BaudRate = dto.BaudRate;
            entity.ProtocolVersion = dto.ProtocolVersion;
            entity.IsActive = dto.IsActive;
            entity.Description = dto.Description;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new LisAnalyzerDto
            {
                Id = entity.Id,
                Name = entity.Name,
                Model = entity.Model,
                Manufacturer = entity.Manufacturer,
                ConnectionType = entity.ConnectionType,
                IpAddress = entity.IpAddress,
                Port = entity.Port,
                ComPort = entity.ComPort,
                BaudRate = entity.BaudRate,
                ProtocolVersion = entity.ProtocolVersion,
                IsActive = entity.IsActive,
                LastConnectionTime = entity.LastConnectionTime,
                ConnectionStatus = entity.ConnectionStatus,
                Description = entity.Description,
                CreatedAt = entity.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateAnalyzerAsync");
            throw;
        }
    }

    public async Task<bool> DeleteAnalyzerAsync(Guid id)
    {
        try
        {
            var entity = await _context.LisAnalyzers.FindAsync(id);
            if (entity == null) return false;

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteAnalyzerAsync");
            return false;
        }
    }

    public async Task<LisConnectionTestResultDto> TestAnalyzerConnectionAsync(Guid id)
    {
        try
        {
            var analyzer = await _context.LisAnalyzers.FindAsync(id);
            if (analyzer == null)
                return new LisConnectionTestResultDto { Success = false, Message = "Không tìm thấy máy phân tích" };

            bool connected = false;
            string message;

            if (analyzer.ConnectionType == "Serial")
            {
                // For serial connections, just validate config exists
                if (string.IsNullOrEmpty(analyzer.ComPort))
                {
                    message = "Chưa cấu hình cổng COM";
                }
                else
                {
                    connected = true;
                    message = $"Cấu hình serial hợp lệ: {analyzer.ComPort} @ {analyzer.BaudRate ?? 9600} baud";
                }
            }
            else
            {
                // TCP connection test for HL7 / ASTM
                if (string.IsNullOrEmpty(analyzer.IpAddress) || !analyzer.Port.HasValue)
                {
                    message = "Chưa cấu hình IP/Port";
                }
                else
                {
                    try
                    {
                        using var client = new TcpClient();
                        var connectTask = client.ConnectAsync(analyzer.IpAddress, analyzer.Port.Value);
                        if (await Task.WhenAny(connectTask, Task.Delay(5000)) == connectTask)
                        {
                            await connectTask; // propagate exceptions
                            connected = true;
                            message = $"Kết nối thành công tới {analyzer.IpAddress}:{analyzer.Port}";
                        }
                        else
                        {
                            message = $"Timeout kết nối tới {analyzer.IpAddress}:{analyzer.Port} (5s)";
                        }
                    }
                    catch (SocketException ex)
                    {
                        message = $"Lỗi kết nối: {ex.Message}";
                    }
                }
            }

            // Update connection status
            analyzer.ConnectionStatus = connected ? "Connected" : "Disconnected";
            analyzer.LastConnectionTime = connected ? DateTime.UtcNow : analyzer.LastConnectionTime;
            await _context.SaveChangesAsync();

            return new LisConnectionTestResultDto { Success = connected, Message = message };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TestAnalyzerConnectionAsync");
            return new LisConnectionTestResultDto { Success = false, Message = $"Lỗi: {ex.Message}" };
        }
    }

    #endregion
}
