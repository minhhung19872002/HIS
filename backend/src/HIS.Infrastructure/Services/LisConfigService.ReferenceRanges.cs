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
                .ToBoundedListAsync("LisConfigService.GetReferenceRangesAsync");
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
}
