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

    /// <summary>
    /// CSV columns (by position, header row skipped): Code, Name, Unit, ReferenceLow, ReferenceHigh,
    /// CriticalLow, CriticalHigh, DataType.
    /// QA-R10: used to (a) insert the same code twice when it appeared twice in one file, (b) accept an
    /// inverted reference / critical range (patient safety — critical flags never fire), (c) drop bad rows
    /// silently and swallow every exception as "Đã import 0". Now every rejected row is reported.
    /// </summary>
    public async Task<ImportResultDto> ImportTestParametersCsvAsync(Stream csvStream)
    {
        var result = new ImportResultDto();
        var records = Export.CsvUtil.ReadRecords(await Export.CsvUtil.ReadTextAsync(csvStream));
        if (records.Count < 2)
            throw new InvalidOperationException("Tệp CSV rỗng hoặc chỉ có dòng tiêu đề (Code,Name,Unit,ReferenceLow,ReferenceHigh,CriticalLow,CriticalHigh,DataType).");

        var existingCodes = (await _context.LisTestParameters.Select(t => t.Code).ToListAsync())
            .Select(c => c.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var sortBase = await _context.LisTestParameters.Select(t => (int?)t.SortOrder).MaxAsync() ?? 0;
        var allowedTypes = new[] { "Number", "Text", "Enum" };

        foreach (var (lineNumber, parts) in records.Skip(1))
        {
            result.TotalRows++;
            void Fail(string column, string message)
            {
                result.FailedRows++;
                result.Errors.Add(new ImportError { RowNumber = lineNumber, ColumnName = column, ErrorMessage = message });
            }

            var code = Export.CsvUtil.Get(parts, 0);
            var name = Export.CsvUtil.Get(parts, 1);
            var unit = Export.CsvUtil.Get(parts, 2);
            if (code.Length == 0) { Fail("Code", "Thiếu mã thông số."); continue; }
            if (name.Length == 0) { Fail("Name", "Thiếu tên thông số."); continue; }
            if (!existingCodes.Add(code)) { Fail("Code", $"Mã '{code}' đã tồn tại (trong hệ thống hoặc trùng dòng trước)."); continue; }

            decimal? Num(int index, string column, out bool bad)
            {
                var raw = Export.CsvUtil.Get(parts, index);
                bad = false;
                if (raw.Length == 0) return null;
                if (decimal.TryParse(raw.Replace(',', '.'), System.Globalization.NumberStyles.Number & ~System.Globalization.NumberStyles.AllowThousands,
                        System.Globalization.CultureInfo.InvariantCulture, out var v)) return v;
                bad = true;
                return null;
            }
            var refLow = Num(3, "ReferenceLow", out var b1);
            var refHigh = Num(4, "ReferenceHigh", out var b2);
            var critLow = Num(5, "CriticalLow", out var b3);
            var critHigh = Num(6, "CriticalHigh", out var b4);
            if (b1 || b2 || b3 || b4) { existingCodes.Remove(code); Fail("Reference", "Giá trị tham chiếu/ngưỡng không phải số."); continue; }
            if (refLow > refHigh || critLow > critHigh)
            { existingCodes.Remove(code); Fail("Reference", "Ngưỡng thấp lớn hơn ngưỡng cao."); continue; }
            if ((critLow.HasValue && refLow.HasValue && critLow > refLow) || (critHigh.HasValue && refHigh.HasValue && critHigh < refHigh))
            { existingCodes.Remove(code); Fail("Critical", "Ngưỡng nguy hiểm phải nằm ngoài khoảng tham chiếu."); continue; }

            var dataType = "Number";
            var rawType = Export.CsvUtil.Get(parts, 7);
            if (rawType.Length > 0)
            {
                var match = allowedTypes.FirstOrDefault(t => string.Equals(t, rawType, StringComparison.OrdinalIgnoreCase));
                if (match == null) { existingCodes.Remove(code); Fail("DataType", "DataType phải là Number, Text hoặc Enum."); continue; }
                dataType = match;
            }

            _context.LisTestParameters.Add(new LisTestParameter
            {
                Id = Guid.NewGuid(),
                Code = code,
                Name = name,
                Unit = unit,
                ReferenceLow = refLow,
                ReferenceHigh = refHigh,
                CriticalLow = critLow,
                CriticalHigh = critHigh,
                DataType = dataType,
                IsActive = true,
                SortOrder = sortBase + result.SuccessRows + 1,
                CreatedAt = DateTime.UtcNow
            });
            result.SuccessRows++;
        }

        if (result.SuccessRows > 0)
            await _context.SaveChangesAsync();
        return result;
    }

    #endregion
}
