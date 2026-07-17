using System.Net.Sockets;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class LisConfigService
{
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
                .ToBoundedListAsync("LisConfigService.GetAnalyzerMappingsAsync");
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
}
