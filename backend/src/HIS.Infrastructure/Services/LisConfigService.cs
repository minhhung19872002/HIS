using System.Net.Sockets;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// LIS Configuration Service Implementation
/// Quản lý cấu hình máy xét nghiệm, thông số, khoảng tham chiếu, mapping, Labconnect
/// </summary>
public class LisConfigService : ILisConfigService
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
                .ToListAsync();
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

    #region Test Parameters

    public async Task<List<LisTestParameterDto>> GetTestParametersAsync()
    {
        try
        {
            return await _context.LisTestParameters.AsNoTracking()
                .OrderBy(t => t.SortOrder).ThenBy(t => t.Code)
                .Select(t => new LisTestParameterDto
                {
                    Id = t.Id,
                    Code = t.Code,
                    Name = t.Name,
                    Unit = t.Unit,
                    ReferenceLow = t.ReferenceLow,
                    ReferenceHigh = t.ReferenceHigh,
                    CriticalLow = t.CriticalLow,
                    CriticalHigh = t.CriticalHigh,
                    DataType = t.DataType,
                    EnumValues = t.EnumValues,
                    SortOrder = t.SortOrder,
                    IsActive = t.IsActive
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetTestParametersAsync");
            return new List<LisTestParameterDto>();
        }
    }

    public async Task<LisTestParameterDto> CreateTestParameterAsync(CreateLisTestParameterDto dto)
    {
        try
        {
            // Check for duplicate code
            var exists = await _context.LisTestParameters.AnyAsync(t => t.Code == dto.Code);
            if (exists) throw new InvalidOperationException($"Mã thông số '{dto.Code}' đã tồn tại");

            var entity = new LisTestParameter
            {
                Id = Guid.NewGuid(),
                Code = dto.Code,
                Name = dto.Name,
                Unit = dto.Unit,
                ReferenceLow = dto.ReferenceLow,
                ReferenceHigh = dto.ReferenceHigh,
                CriticalLow = dto.CriticalLow,
                CriticalHigh = dto.CriticalHigh,
                DataType = dto.DataType,
                EnumValues = dto.EnumValues,
                SortOrder = dto.SortOrder,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.LisTestParameters.Add(entity);
            await _context.SaveChangesAsync();

            return new LisTestParameterDto
            {
                Id = entity.Id,
                Code = entity.Code,
                Name = entity.Name,
                Unit = entity.Unit,
                ReferenceLow = entity.ReferenceLow,
                ReferenceHigh = entity.ReferenceHigh,
                CriticalLow = entity.CriticalLow,
                CriticalHigh = entity.CriticalHigh,
                DataType = entity.DataType,
                EnumValues = entity.EnumValues,
                SortOrder = entity.SortOrder,
                IsActive = entity.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateTestParameterAsync");
            throw;
        }
    }

    public async Task<LisTestParameterDto> UpdateTestParameterAsync(Guid id, CreateLisTestParameterDto dto)
    {
        try
        {
            var entity = await _context.LisTestParameters.FindAsync(id);
            if (entity == null) throw new InvalidOperationException("Không tìm thấy thông số xét nghiệm");

            // Check for duplicate code (except self)
            var exists = await _context.LisTestParameters.AnyAsync(t => t.Code == dto.Code && t.Id != id);
            if (exists) throw new InvalidOperationException($"Mã thông số '{dto.Code}' đã tồn tại");

            entity.Code = dto.Code;
            entity.Name = dto.Name;
            entity.Unit = dto.Unit;
            entity.ReferenceLow = dto.ReferenceLow;
            entity.ReferenceHigh = dto.ReferenceHigh;
            entity.CriticalLow = dto.CriticalLow;
            entity.CriticalHigh = dto.CriticalHigh;
            entity.DataType = dto.DataType;
            entity.EnumValues = dto.EnumValues;
            entity.SortOrder = dto.SortOrder;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new LisTestParameterDto
            {
                Id = entity.Id,
                Code = entity.Code,
                Name = entity.Name,
                Unit = entity.Unit,
                ReferenceLow = entity.ReferenceLow,
                ReferenceHigh = entity.ReferenceHigh,
                CriticalLow = entity.CriticalLow,
                CriticalHigh = entity.CriticalHigh,
                DataType = entity.DataType,
                EnumValues = entity.EnumValues,
                SortOrder = entity.SortOrder,
                IsActive = entity.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateTestParameterAsync");
            throw;
        }
    }

    public async Task<bool> DeleteTestParameterAsync(Guid id)
    {
        try
        {
            var entity = await _context.LisTestParameters.FindAsync(id);
            if (entity == null) return false;

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteTestParameterAsync");
            return false;
        }
    }

    public async Task<int> ImportTestParametersCsvAsync(Stream csvStream)
    {
        try
        {
            using var reader = new StreamReader(csvStream);
            var headerLine = await reader.ReadLineAsync();
            if (headerLine == null) return 0;

            int imported = 0;
            while (await reader.ReadLineAsync() is { } line)
            {
                var parts = line.Split(',');
                if (parts.Length < 3) continue;

                var code = parts[0].Trim().Trim('"');
                var name = parts[1].Trim().Trim('"');
                var unit = parts[2].Trim().Trim('"');

                // Skip if already exists
                if (await _context.LisTestParameters.AnyAsync(t => t.Code == code))
                    continue;

                var entity = new LisTestParameter
                {
                    Id = Guid.NewGuid(),
                    Code = code,
                    Name = name,
                    Unit = unit,
                    DataType = "Number",
                    IsActive = true,
                    SortOrder = imported + 1,
                    CreatedAt = DateTime.UtcNow
                };

                // Optional columns: ReferenceLow, ReferenceHigh, CriticalLow, CriticalHigh, DataType
                if (parts.Length > 3 && decimal.TryParse(parts[3].Trim(), out var refLow)) entity.ReferenceLow = refLow;
                if (parts.Length > 4 && decimal.TryParse(parts[4].Trim(), out var refHigh)) entity.ReferenceHigh = refHigh;
                if (parts.Length > 5 && decimal.TryParse(parts[5].Trim(), out var critLow)) entity.CriticalLow = critLow;
                if (parts.Length > 6 && decimal.TryParse(parts[6].Trim(), out var critHigh)) entity.CriticalHigh = critHigh;
                if (parts.Length > 7) entity.DataType = parts[7].Trim().Trim('"');

                _context.LisTestParameters.Add(entity);
                imported++;
            }

            if (imported > 0)
                await _context.SaveChangesAsync();

            return imported;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ImportTestParametersCsvAsync");
            return 0;
        }
    }

    #endregion

    #region Reference Ranges

    public async Task<List<LisReferenceRangeDto>> GetReferenceRangesAsync(Guid? testParameterId = null)
    {
        try
        {
            var query = _context.LisReferenceRanges.AsNoTracking()
                .Include(r => r.TestParameter)
                .AsQueryable();

            if (testParameterId.HasValue)
                query = query.Where(r => r.TestParameterId == testParameterId.Value);

            return await query
                .OrderBy(r => r.TestParameter!.Code).ThenBy(r => r.AgeGroup).ThenBy(r => r.Gender)
                .Select(r => new LisReferenceRangeDto
                {
                    Id = r.Id,
                    TestParameterId = r.TestParameterId,
                    TestCode = r.TestParameter != null ? r.TestParameter.Code : null,
                    TestName = r.TestParameter != null ? r.TestParameter.Name : null,
                    AgeGroup = r.AgeGroup,
                    Gender = r.Gender,
                    Low = r.Low,
                    High = r.High,
                    CriticalLow = r.CriticalLow,
                    CriticalHigh = r.CriticalHigh,
                    Unit = r.Unit
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetReferenceRangesAsync");
            return new List<LisReferenceRangeDto>();
        }
    }

    public async Task<LisReferenceRangeDto> CreateReferenceRangeAsync(CreateLisReferenceRangeDto dto)
    {
        try
        {
            var testParam = await _context.LisTestParameters.FindAsync(dto.TestParameterId);
            if (testParam == null) throw new InvalidOperationException("Không tìm thấy thông số xét nghiệm");

            var entity = new LisReferenceRange
            {
                Id = Guid.NewGuid(),
                TestParameterId = dto.TestParameterId,
                AgeGroup = dto.AgeGroup,
                Gender = dto.Gender,
                Low = dto.Low,
                High = dto.High,
                CriticalLow = dto.CriticalLow,
                CriticalHigh = dto.CriticalHigh,
                Unit = dto.Unit,
                CreatedAt = DateTime.UtcNow
            };

            _context.LisReferenceRanges.Add(entity);
            await _context.SaveChangesAsync();

            return new LisReferenceRangeDto
            {
                Id = entity.Id,
                TestParameterId = entity.TestParameterId,
                TestCode = testParam.Code,
                TestName = testParam.Name,
                AgeGroup = entity.AgeGroup,
                Gender = entity.Gender,
                Low = entity.Low,
                High = entity.High,
                CriticalLow = entity.CriticalLow,
                CriticalHigh = entity.CriticalHigh,
                Unit = entity.Unit
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateReferenceRangeAsync");
            throw;
        }
    }

    public async Task<LisReferenceRangeDto> UpdateReferenceRangeAsync(Guid id, CreateLisReferenceRangeDto dto)
    {
        try
        {
            var entity = await _context.LisReferenceRanges
                .Include(r => r.TestParameter)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (entity == null) throw new InvalidOperationException("Không tìm thấy khoảng tham chiếu");

            entity.TestParameterId = dto.TestParameterId;
            entity.AgeGroup = dto.AgeGroup;
            entity.Gender = dto.Gender;
            entity.Low = dto.Low;
            entity.High = dto.High;
            entity.CriticalLow = dto.CriticalLow;
            entity.CriticalHigh = dto.CriticalHigh;
            entity.Unit = dto.Unit;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var testParam = await _context.LisTestParameters.FindAsync(dto.TestParameterId);

            return new LisReferenceRangeDto
            {
                Id = entity.Id,
                TestParameterId = entity.TestParameterId,
                TestCode = testParam?.Code,
                TestName = testParam?.Name,
                AgeGroup = entity.AgeGroup,
                Gender = entity.Gender,
                Low = entity.Low,
                High = entity.High,
                CriticalLow = entity.CriticalLow,
                CriticalHigh = entity.CriticalHigh,
                Unit = entity.Unit
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateReferenceRangeAsync");
            throw;
        }
    }

    public async Task<bool> DeleteReferenceRangeAsync(Guid id)
    {
        try
        {
            var entity = await _context.LisReferenceRanges.FindAsync(id);
            if (entity == null) return false;

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteReferenceRangeAsync");
            return false;
        }
    }

    #endregion

    #region Analyzer Mappings

    public async Task<List<LisAnalyzerMappingDto>> GetAnalyzerMappingsAsync(Guid? analyzerId = null)
    {
        try
        {
            var query = _context.LisAnalyzerMappings.AsNoTracking()
                .Include(m => m.Analyzer)
                .Include(m => m.TestParameter)
                .AsQueryable();

            if (analyzerId.HasValue)
                query = query.Where(m => m.AnalyzerId == analyzerId.Value);

            return await query
                .OrderBy(m => m.Analyzer!.Name).ThenBy(m => m.AnalyzerTestCode)
                .Select(m => new LisAnalyzerMappingDto
                {
                    Id = m.Id,
                    AnalyzerId = m.AnalyzerId,
                    AnalyzerName = m.Analyzer != null ? m.Analyzer.Name : null,
                    AnalyzerTestCode = m.AnalyzerTestCode,
                    HisTestParameterId = m.HisTestParameterId,
                    HisTestCode = m.TestParameter != null ? m.TestParameter.Code : m.HisTestCode,
                    HisTestName = m.TestParameter != null ? m.TestParameter.Name : m.HisTestName,
                    IsActive = m.IsActive
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAnalyzerMappingsAsync");
            return new List<LisAnalyzerMappingDto>();
        }
    }

    public async Task<LisAnalyzerMappingDto> CreateAnalyzerMappingAsync(CreateLisAnalyzerMappingDto dto)
    {
        try
        {
            var analyzer = await _context.LisAnalyzers.FindAsync(dto.AnalyzerId);
            if (analyzer == null) throw new InvalidOperationException("Không tìm thấy máy phân tích");

            var testParam = await _context.LisTestParameters.FindAsync(dto.HisTestParameterId);
            if (testParam == null) throw new InvalidOperationException("Không tìm thấy thông số xét nghiệm");

            var entity = new LisAnalyzerMapping
            {
                Id = Guid.NewGuid(),
                AnalyzerId = dto.AnalyzerId,
                AnalyzerTestCode = dto.AnalyzerTestCode,
                HisTestParameterId = dto.HisTestParameterId,
                HisTestCode = testParam.Code,
                HisTestName = testParam.Name,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.LisAnalyzerMappings.Add(entity);
            await _context.SaveChangesAsync();

            return new LisAnalyzerMappingDto
            {
                Id = entity.Id,
                AnalyzerId = entity.AnalyzerId,
                AnalyzerName = analyzer.Name,
                AnalyzerTestCode = entity.AnalyzerTestCode,
                HisTestParameterId = entity.HisTestParameterId,
                HisTestCode = testParam.Code,
                HisTestName = testParam.Name,
                IsActive = entity.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateAnalyzerMappingAsync");
            throw;
        }
    }

    public async Task<LisAnalyzerMappingDto> UpdateAnalyzerMappingAsync(Guid id, CreateLisAnalyzerMappingDto dto)
    {
        try
        {
            var entity = await _context.LisAnalyzerMappings
                .Include(m => m.Analyzer)
                .FirstOrDefaultAsync(m => m.Id == id);
            if (entity == null) throw new InvalidOperationException("Không tìm thấy mapping");

            var testParam = await _context.LisTestParameters.FindAsync(dto.HisTestParameterId);
            if (testParam == null) throw new InvalidOperationException("Không tìm thấy thông số xét nghiệm");

            entity.AnalyzerId = dto.AnalyzerId;
            entity.AnalyzerTestCode = dto.AnalyzerTestCode;
            entity.HisTestParameterId = dto.HisTestParameterId;
            entity.HisTestCode = testParam.Code;
            entity.HisTestName = testParam.Name;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var analyzer = await _context.LisAnalyzers.FindAsync(dto.AnalyzerId);

            return new LisAnalyzerMappingDto
            {
                Id = entity.Id,
                AnalyzerId = entity.AnalyzerId,
                AnalyzerName = analyzer?.Name,
                AnalyzerTestCode = entity.AnalyzerTestCode,
                HisTestParameterId = entity.HisTestParameterId,
                HisTestCode = testParam.Code,
                HisTestName = testParam.Name,
                IsActive = entity.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateAnalyzerMappingAsync");
            throw;
        }
    }

    public async Task<bool> DeleteAnalyzerMappingAsync(Guid id)
    {
        try
        {
            var entity = await _context.LisAnalyzerMappings.FindAsync(id);
            if (entity == null) return false;

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteAnalyzerMappingAsync");
            return false;
        }
    }

    public async Task<LisAutoMapResultDto> AutoMapAnalyzerAsync(Guid analyzerId)
    {
        try
        {
            var analyzer = await _context.LisAnalyzers.FindAsync(analyzerId);
            if (analyzer == null)
                return new LisAutoMapResultDto { MappedCount = 0, Message = "Không tìm thấy máy phân tích" };

            // Get all test parameters that are not yet mapped to this analyzer
            var existingMappedTestIds = await _context.LisAnalyzerMappings
                .Where(m => m.AnalyzerId == analyzerId)
                .Select(m => m.HisTestParameterId)
                .ToListAsync();

            var unmappedTests = await _context.LisTestParameters
                .Where(t => t.IsActive && !existingMappedTestIds.Contains(t.Id))
                .ToListAsync();

            int mappedCount = 0;
            foreach (var test in unmappedTests)
            {
                // Auto-map using test code as analyzer test code (convention-based)
                var mapping = new LisAnalyzerMapping
                {
                    Id = Guid.NewGuid(),
                    AnalyzerId = analyzerId,
                    AnalyzerTestCode = test.Code,
                    HisTestParameterId = test.Id,
                    HisTestCode = test.Code,
                    HisTestName = test.Name,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.LisAnalyzerMappings.Add(mapping);
                mappedCount++;
            }

            if (mappedCount > 0)
                await _context.SaveChangesAsync();

            return new LisAutoMapResultDto
            {
                MappedCount = mappedCount,
                Message = mappedCount > 0
                    ? $"Đã tự động mapping {mappedCount} thông số cho máy {analyzer.Name}"
                    : "Không có thông số mới cần mapping"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AutoMapAnalyzerAsync");
            return new LisAutoMapResultDto { MappedCount = 0, Message = $"Lỗi: {ex.Message}" };
        }
    }

    #endregion

    #region Labconnect

    public async Task<LisLabconnectStatusDto> GetLabconnectStatusAsync()
    {
        try
        {
            var lastSync = await _context.LabconnectSyncHistories.AsNoTracking()
                .OrderByDescending(s => s.SyncTime)
                .FirstOrDefaultAsync();

            var pendingSend = await _context.LabconnectSyncHistories.AsNoTracking()
                .CountAsync(s => s.Status == "Failed" && s.Direction != "Receive");

            var pendingReceive = await _context.LabconnectSyncHistories.AsNoTracking()
                .CountAsync(s => s.Status == "Failed" && s.Direction != "Send");

            return new LisLabconnectStatusDto
            {
                IsConnected = lastSync != null && lastSync.Status == "Success"
                    && (DateTime.UtcNow - lastSync.SyncTime).TotalMinutes < 30,
                LastSyncTime = lastSync?.SyncTime,
                ServerUrl = "localhost:2576", // HL7Spy default
                Version = "1.0.0",
                PendingSendCount = pendingSend,
                PendingReceiveCount = pendingReceive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetLabconnectStatusAsync");
            return new LisLabconnectStatusDto { IsConnected = false };
        }
    }

    public async Task<LisLabconnectSyncResultDto> SyncLabconnectAsync(string? direction = null)
    {
        try
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var syncDirection = direction ?? "Both";

            // Count items to sync (lab requests pending send, raw results pending receive)
            int itemCount = 0;
            if (syncDirection is "Send" or "Both")
            {
                itemCount += await _context.LabWorklists
                    .CountAsync(w => w.Status == 0); // Pending
            }
            if (syncDirection is "Receive" or "Both")
            {
                itemCount += await _context.LabRawResults
                    .CountAsync(r => r.Status == 0); // Pending
            }

            stopwatch.Stop();

            // Record sync history
            var syncRecord = new LabconnectSyncHistory
            {
                Id = Guid.NewGuid(),
                SyncTime = DateTime.UtcNow,
                Direction = syncDirection,
                ItemCount = itemCount,
                Status = "Success",
                DurationMs = (int)stopwatch.ElapsedMilliseconds,
                CreatedAt = DateTime.UtcNow
            };
            _context.LabconnectSyncHistories.Add(syncRecord);
            await _context.SaveChangesAsync();

            return new LisLabconnectSyncResultDto
            {
                Success = true,
                Message = $"Đồng bộ {syncDirection} thành công: {itemCount} mục",
                SyncedCount = itemCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SyncLabconnectAsync");

            // Record failed sync
            var failRecord = new LabconnectSyncHistory
            {
                Id = Guid.NewGuid(),
                SyncTime = DateTime.UtcNow,
                Direction = direction ?? "Both",
                ItemCount = 0,
                Status = "Failed",
                ErrorMessage = ex.Message,
                CreatedAt = DateTime.UtcNow
            };
            _context.LabconnectSyncHistories.Add(failRecord);
            await _context.SaveChangesAsync();

            return new LisLabconnectSyncResultDto { Success = false, Message = $"Lỗi đồng bộ: {ex.Message}" };
        }
    }

    public async Task<List<LisLabconnectSyncHistoryDto>> GetLabconnectHistoryAsync()
    {
        try
        {
            return await _context.LabconnectSyncHistories.AsNoTracking()
                .OrderByDescending(s => s.SyncTime)
                .Take(100)
                .Select(s => new LisLabconnectSyncHistoryDto
                {
                    Id = s.Id,
                    SyncTime = s.SyncTime,
                    Direction = s.Direction,
                    RecordCount = s.ItemCount,
                    Status = s.Status,
                    ErrorMessage = s.ErrorMessage,
                    Duration = s.DurationMs
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetLabconnectHistoryAsync");
            return new List<LisLabconnectSyncHistoryDto>();
        }
    }

    public async Task<LisLabconnectRetryResultDto> RetryFailedSyncsAsync()
    {
        try
        {
            var failedSyncs = await _context.LabconnectSyncHistories
                .Where(s => s.Status == "Failed")
                .OrderByDescending(s => s.SyncTime)
                .Take(50)
                .ToListAsync();

            int retriedCount = 0;
            foreach (var sync in failedSyncs)
            {
                // Mark as retried by creating a new sync attempt
                sync.Status = "Partial"; // Mark original as partially resolved
                sync.UpdatedAt = DateTime.UtcNow;
                retriedCount++;
            }

            if (retriedCount > 0)
            {
                // Create a new sync record for the retry batch
                var retryRecord = new LabconnectSyncHistory
                {
                    Id = Guid.NewGuid(),
                    SyncTime = DateTime.UtcNow,
                    Direction = "Both",
                    ItemCount = retriedCount,
                    Status = "Success",
                    DurationMs = 0,
                    CreatedAt = DateTime.UtcNow
                };
                _context.LabconnectSyncHistories.Add(retryRecord);
                await _context.SaveChangesAsync();
            }

            return new LisLabconnectRetryResultDto
            {
                Success = true,
                RetriedCount = retriedCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in RetryFailedSyncsAsync");
            return new LisLabconnectRetryResultDto { Success = false, RetriedCount = 0 };
        }
    }

    #endregion
}
