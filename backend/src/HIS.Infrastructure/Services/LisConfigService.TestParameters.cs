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
    #region Test Parameters

    public async Task<List<LisTestParameterDto>> GetTestParametersAsync()
    {
        try
        {
            return await _context.LisTestParameters
                .Include(t => t.Group)
                .Include(t => t.Service)
                .Include(t => t.SampleType)
                .AsNoTracking()
                .OrderBy(t => t.SortOrder).ThenBy(t => t.Code)
                .Select(t => new LisTestParameterDto
                {
                    Id = t.Id,
                    Code = t.Code,
                    Name = t.Name,
                    Unit = t.Unit,
                    ReferenceLow = t.ReferenceLow,
                    ReferenceHigh = t.ReferenceHigh,
                    NormalMinMale = t.NormalMinMale,
                    NormalMaxMale = t.NormalMaxMale,
                    NormalMinFemale = t.NormalMinFemale,
                    NormalMaxFemale = t.NormalMaxFemale,
                    CriticalLow = t.CriticalLow,
                    CriticalHigh = t.CriticalHigh,
                    Hl7Code = t.Hl7Code,
                    GroupId = t.GroupId,
                    GroupName = t.Group != null ? t.Group.Name : null,
                    ServiceId = t.ServiceId,
                    ServiceName = t.Service != null ? t.Service.ServiceName : null,
                    SampleTypeId = t.SampleTypeId,
                    SampleTypeName = t.SampleType != null ? t.SampleType.Name : null,
                    PrintUnit = t.PrintUnit,
                    Description = t.Description,
                    DataType = t.DataType,
                    EnumValues = t.EnumValues,
                    SortOrder = t.SortOrder,
                    IsActive = t.IsActive
                })
                .ToBoundedListAsync("LisConfigService.GetTestParametersAsync");
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
                NormalMinMale = dto.NormalMinMale,
                NormalMaxMale = dto.NormalMaxMale,
                NormalMinFemale = dto.NormalMinFemale,
                NormalMaxFemale = dto.NormalMaxFemale,
                CriticalLow = dto.CriticalLow,
                CriticalHigh = dto.CriticalHigh,
                Hl7Code = dto.Hl7Code,
                GroupId = dto.GroupId,
                ServiceId = dto.ServiceId,
                SampleTypeId = dto.SampleTypeId,
                PrintUnit = dto.PrintUnit,
                Description = dto.Description,
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
                NormalMinMale = entity.NormalMinMale,
                NormalMaxMale = entity.NormalMaxMale,
                NormalMinFemale = entity.NormalMinFemale,
                NormalMaxFemale = entity.NormalMaxFemale,
                CriticalLow = entity.CriticalLow,
                CriticalHigh = entity.CriticalHigh,
                Hl7Code = entity.Hl7Code,
                GroupId = entity.GroupId,
                ServiceId = entity.ServiceId,
                SampleTypeId = entity.SampleTypeId,
                PrintUnit = entity.PrintUnit,
                Description = entity.Description,
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
            entity.NormalMinMale = dto.NormalMinMale;
            entity.NormalMaxMale = dto.NormalMaxMale;
            entity.NormalMinFemale = dto.NormalMinFemale;
            entity.NormalMaxFemale = dto.NormalMaxFemale;
            entity.CriticalLow = dto.CriticalLow;
            entity.CriticalHigh = dto.CriticalHigh;
            entity.Hl7Code = dto.Hl7Code;
            entity.GroupId = dto.GroupId;
            entity.ServiceId = dto.ServiceId;
            entity.SampleTypeId = dto.SampleTypeId;
            entity.PrintUnit = dto.PrintUnit;
            entity.Description = dto.Description;
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
                NormalMinMale = entity.NormalMinMale,
                NormalMaxMale = entity.NormalMaxMale,
                NormalMinFemale = entity.NormalMinFemale,
                NormalMaxFemale = entity.NormalMaxFemale,
                CriticalLow = entity.CriticalLow,
                CriticalHigh = entity.CriticalHigh,
                Hl7Code = entity.Hl7Code,
                GroupId = entity.GroupId,
                ServiceId = entity.ServiceId,
                SampleTypeId = entity.SampleTypeId,
                PrintUnit = entity.PrintUnit,
                Description = entity.Description,
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
}
