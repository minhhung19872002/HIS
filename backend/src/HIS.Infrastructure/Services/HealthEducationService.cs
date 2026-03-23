using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class HealthEducationService : IHealthEducationService
{
    private readonly HISDbContext _context;

    public HealthEducationService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<HealthCampaignDto>> SearchCampaignsAsync(HealthCampaignSearchDto? filter = null)
    {
        try
        {
            var query = _context.HealthCampaigns.Where(c => !c.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(c =>
                        c.CampaignCode.ToLower().Contains(kw) ||
                        c.Title.ToLower().Contains(kw) ||
                        (c.Organizer != null && c.Organizer.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.CampaignType))
                    query = query.Where(c => c.CampaignType == filter.CampaignType);
                if (filter.Status.HasValue)
                    query = query.Where(c => c.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(c => c.StartDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(c => c.StartDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(c => c.CreatedAt)
                .Take(200)
                .Select(c => new HealthCampaignDto
                {
                    Id = c.Id,
                    CampaignCode = c.CampaignCode,
                    Title = c.Title,
                    Description = c.Description,
                    CampaignType = c.CampaignType,
                    TargetAudience = c.TargetAudience,
                    StartDate = c.StartDate.HasValue ? c.StartDate.Value.ToString("yyyy-MM-dd") : null,
                    EndDate = c.EndDate.HasValue ? c.EndDate.Value.ToString("yyyy-MM-dd") : null,
                    Location = c.Location,
                    Organizer = c.Organizer,
                    ParticipantCount = c.ParticipantCount,
                    Budget = c.Budget,
                    Status = c.Status,
                    Outcomes = c.Outcomes,
                    Notes = c.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<HealthCampaignDto>(); }
    }

    public async Task<HealthCampaignDto> CreateCampaignAsync(CreateHealthCampaignDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.HealthCampaigns.CountAsync(c => c.CreatedAt.Year == year) + 1;

        var entity = new HealthCampaign
        {
            Id = Guid.NewGuid(),
            CampaignCode = $"TTGDSK-{year}-{count:D4}",
            Title = dto.Title ?? "",
            Description = dto.Description,
            CampaignType = dto.CampaignType ?? "other",
            TargetAudience = dto.TargetAudience,
            StartDate = DateTime.TryParse(dto.StartDate, out var sd) ? sd : null,
            EndDate = DateTime.TryParse(dto.EndDate, out var ed) ? ed : null,
            Location = dto.Location,
            Organizer = dto.Organizer,
            ParticipantCount = dto.ParticipantCount,
            Budget = dto.Budget,
            Status = 0,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.HealthCampaigns.Add(entity);
        await _context.SaveChangesAsync();

        return new HealthCampaignDto { Id = entity.Id, CampaignCode = entity.CampaignCode, Title = entity.Title, CampaignType = entity.CampaignType, Status = entity.Status };
    }

    public async Task<HealthCampaignDto> UpdateCampaignAsync(Guid id, CreateHealthCampaignDto dto)
    {
        var entity = await _context.HealthCampaigns.FindAsync(id)
            ?? throw new InvalidOperationException("Campaign not found");

        if (dto.Title != null) entity.Title = dto.Title;
        if (dto.Description != null) entity.Description = dto.Description;
        if (dto.CampaignType != null) entity.CampaignType = dto.CampaignType;
        if (dto.TargetAudience != null) entity.TargetAudience = dto.TargetAudience;
        if (dto.Location != null) entity.Location = dto.Location;
        if (dto.Organizer != null) entity.Organizer = dto.Organizer;
        if (dto.ParticipantCount.HasValue) entity.ParticipantCount = dto.ParticipantCount.Value;
        if (dto.Budget.HasValue) entity.Budget = dto.Budget.Value;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        if (DateTime.TryParse(dto.StartDate, out var sd)) entity.StartDate = sd;
        if (DateTime.TryParse(dto.EndDate, out var ed)) entity.EndDate = ed;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new HealthCampaignDto { Id = entity.Id, CampaignCode = entity.CampaignCode, Title = entity.Title, CampaignType = entity.CampaignType, Status = entity.Status };
    }

    public async Task<List<HealthEducationMaterialDto>> SearchMaterialsAsync(HealthEducationMaterialSearchDto? filter = null)
    {
        try
        {
            var query = _context.HealthEducationMaterials.Where(m => !m.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(m =>
                        m.MaterialCode.ToLower().Contains(kw) ||
                        m.Title.ToLower().Contains(kw));
                }
                if (!string.IsNullOrEmpty(filter.MaterialType))
                    query = query.Where(m => m.MaterialType == filter.MaterialType);
                if (!string.IsNullOrEmpty(filter.Topic))
                    query = query.Where(m => m.Topic != null && m.Topic.ToLower().Contains(filter.Topic.ToLower()));
            }

            return await query
                .OrderByDescending(m => m.CreatedAt)
                .Take(200)
                .Select(m => new HealthEducationMaterialDto
                {
                    Id = m.Id,
                    MaterialCode = m.MaterialCode,
                    Title = m.Title,
                    MaterialType = m.MaterialType,
                    Topic = m.Topic,
                    Language = m.Language,
                    FilePath = m.FilePath,
                    FileSize = m.FileSize,
                    Downloads = m.Downloads,
                    IsActive = m.IsActive,
                })
                .ToListAsync();
        }
        catch { return new List<HealthEducationMaterialDto>(); }
    }

    public async Task<HealthEducationMaterialDto> CreateMaterialAsync(CreateHealthEducationMaterialDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.HealthEducationMaterials.CountAsync(m => m.CreatedAt.Year == year) + 1;

        var entity = new HealthEducationMaterial
        {
            Id = Guid.NewGuid(),
            MaterialCode = $"TL-{year}-{count:D4}",
            Title = dto.Title ?? "",
            MaterialType = dto.MaterialType ?? "leaflet",
            Topic = dto.Topic,
            Language = dto.Language ?? "vi",
            FilePath = dto.FilePath,
            FileSize = dto.FileSize,
            Downloads = 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _context.HealthEducationMaterials.Add(entity);
        await _context.SaveChangesAsync();

        return new HealthEducationMaterialDto { Id = entity.Id, MaterialCode = entity.MaterialCode, Title = entity.Title, MaterialType = entity.MaterialType, IsActive = entity.IsActive };
    }

    public async Task<CampaignStatsDto> GetCampaignStatsAsync()
    {
        try
        {
            var campaigns = await _context.HealthCampaigns.Where(c => !c.IsDeleted).ToListAsync();
            var materials = await _context.HealthEducationMaterials.Where(m => !m.IsDeleted).CountAsync();

            return new CampaignStatsDto
            {
                TotalCampaigns = campaigns.Count,
                PlannedCount = campaigns.Count(c => c.Status == 0),
                OngoingCount = campaigns.Count(c => c.Status == 1),
                CompletedCount = campaigns.Count(c => c.Status == 2),
                TotalParticipants = campaigns.Where(c => c.ParticipantCount.HasValue).Sum(c => c.ParticipantCount!.Value),
                TotalBudget = campaigns.Where(c => c.Budget.HasValue).Sum(c => c.Budget!.Value),
                TotalMaterials = materials,
                CampaignTypeBreakdown = campaigns.GroupBy(c => c.CampaignType)
                    .Select(g => new CampaignTypeBreakdownDto { CampaignType = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new CampaignStatsDto(); }
    }
}
