// Template for HIS service implementation
// Location: backend/src/HIS.Infrastructure/Services/<Module>Service.cs
// Replace <Xxx> placeholders.

using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.<Xxx>;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class <Xxx>Service : I<Xxx>Service
{
    private readonly HISDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<<Xxx>Service> _logger;

    public <Xxx>Service(HISDbContext db, IMapper mapper, ILogger<<Xxx>Service> logger)
    {
        _db = db;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<<Xxx>Dto?> GetByIdAsync(Guid id)
    {
        var entity = await _db.Set<<Xxx>Entity>()
            .Where(x => !x.IsDeleted)
            .FirstOrDefaultAsync(x => x.Id == id);

        return entity == null ? null : _mapper.Map<<Xxx>Dto>(entity);
    }

    public async Task<List<<Xxx>Dto>> GetListAsync(<Xxx>FilterDto filter)
    {
        var query = _db.Set<<Xxx>Entity>().Where(x => !x.IsDeleted);

        if (!string.IsNullOrEmpty(filter.Keyword))
        {
            query = query.Where(x => x.Name.Contains(filter.Keyword) || x.Code.Contains(filter.Keyword));
        }
        if (filter.Status.HasValue)
        {
            query = query.Where(x => x.Status == filter.Status.Value);
        }

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return _mapper.Map<List<<Xxx>Dto>>(items);
    }

    public async Task<<Xxx>Dto> CreateAsync(<Xxx>CreateDto dto, Guid userId)
    {
        var entity = _mapper.Map<<Xxx>Entity>(dto);
        entity.Id = Guid.NewGuid();
        entity.CreatedAt = DateTime.UtcNow;
        entity.CreatedBy = userId.ToString();
        entity.IsDeleted = false;

        _db.Set<<Xxx>Entity>().Add(entity);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Created <Xxx> {Id} by user {UserId}", entity.Id, userId);
        return _mapper.Map<<Xxx>Dto>(entity);
    }

    public async Task<<Xxx>Dto?> UpdateAsync(Guid id, <Xxx>UpdateDto dto, Guid userId)
    {
        var entity = await _db.Set<<Xxx>Entity>().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (entity == null) return null;

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();

        await _db.SaveChangesAsync();
        return _mapper.Map<<Xxx>Dto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var entity = await _db.Set<<Xxx>Entity>().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (entity == null) return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();

        await _db.SaveChangesAsync();
        _logger.LogInformation("Soft-deleted <Xxx> {Id} by user {UserId}", id, userId);
        return true;
    }
}
