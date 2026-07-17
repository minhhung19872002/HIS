using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Common;
using HIS.Application.DTOs;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class EmrManagementService
{
    // ============================================================
    // Data Tags (B.1.13)
    // ============================================================

    public async Task<List<EmrDataTagDto>> GetDataTagsAsync(string? keyword = null, string? category = null, string? formType = null)
    {
        try
        {
            var query = _context.Set<EmrDataTag>().AsNoTracking()
                .Where(t => !t.IsDeleted);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(t => t.Code.Contains(keyword) || t.Name.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(t => t.Category == category);
            if (!string.IsNullOrWhiteSpace(formType))
                query = query.Where(t => t.FormType == formType);

            return await query.OrderBy(t => t.SortOrder).ThenBy(t => t.Code)
                .Select(t => new EmrDataTagDto
                {
                    Id = t.Id,
                    Code = t.Code,
                    Name = t.Name,
                    Description = t.Description,
                    DataType = t.DataType,
                    DefaultValue = t.DefaultValue,
                    Category = t.Category,
                    FormType = t.FormType,
                    SortOrder = t.SortOrder,
                    IsSystem = t.IsSystem,
                    IsActive = t.IsActive
                }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrDataTagDto>();
        }
    }

    public async Task<EmrDataTagDto> SaveDataTagAsync(SaveEmrDataTagDto dto)
    {
        var userId = GetCurrentUserId();
        EmrDataTag entity;

        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _context.Set<EmrDataTag>()
                .FirstOrDefaultAsync(t => t.Id == dto.Id.Value && !t.IsDeleted)
                ?? throw new InvalidOperationException("Data tag not found");

            // Cannot edit system tags
            if (entity.IsSystem)
                throw new InvalidOperationException("Cannot edit system data tag");

            entity.Code = dto.Code;
            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.DataType = dto.DataType;
            entity.DefaultValue = dto.DefaultValue;
            entity.Category = dto.Category;
            entity.FormType = dto.FormType;
            entity.SortOrder = dto.SortOrder;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new EmrDataTag
            {
                Id = Guid.NewGuid(),
                Code = dto.Code,
                Name = dto.Name,
                Description = dto.Description,
                DataType = dto.DataType,
                DefaultValue = dto.DefaultValue,
                Category = dto.Category,
                FormType = dto.FormType,
                SortOrder = dto.SortOrder,
                IsSystem = dto.IsSystem,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrDataTag>().Add(entity);
        }

        await _context.SaveChangesAsync();

        return new EmrDataTagDto
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name,
            Description = entity.Description,
            DataType = entity.DataType,
            DefaultValue = entity.DefaultValue,
            Category = entity.Category,
            FormType = entity.FormType,
            SortOrder = entity.SortOrder,
            IsSystem = entity.IsSystem,
            IsActive = entity.IsActive
        };
    }

    public async Task<bool> DeleteDataTagAsync(Guid id)
    {
        try
        {
            var entity = await _context.Set<EmrDataTag>()
                .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
            if (entity == null) return false;

            if (entity.IsSystem)
                throw new InvalidOperationException("Cannot delete system data tag");

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = GetCurrentUserId();
            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    // ============================================================
    // Images (B.1.20)
    // ============================================================

    public async Task<List<EmrImageDto>> GetImagesAsync(string? keyword = null, string? category = null, Guid? departmentId = null)
    {
        try
        {
            var query = _context.Set<EmrImage>().AsNoTracking()
                .Where(i => !i.IsDeleted && i.IsActive);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(i => i.Title.Contains(keyword) || (i.Tags != null && i.Tags.Contains(keyword)));
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(i => i.Category == category);
            if (departmentId.HasValue)
                query = query.Where(i => i.DepartmentId == departmentId.Value || i.IsShared);

            return await query.OrderByDescending(i => i.CreatedAt)
                .Select(i => new EmrImageDto
                {
                    Id = i.Id,
                    Title = i.Title,
                    Description = i.Description,
                    ImageData = i.ImageData,
                    Category = i.Category,
                    DepartmentId = i.DepartmentId,
                    UploadedByUserId = i.UploadedByUserId,
                    Tags = i.Tags,
                    Annotations = i.Annotations,
                    IsShared = i.IsShared,
                    IsActive = i.IsActive,
                    CreatedAt = i.CreatedAt
                }).ToBoundedListAsync("EmrManagement.GetImages");
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrImageDto>();
        }
    }

    public async Task<EmrImageDto> SaveImageAsync(SaveEmrImageDto dto)
    {
        var userId = GetCurrentUserId() ?? "system";
        EmrImage entity;

        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _context.Set<EmrImage>()
                .FirstOrDefaultAsync(i => i.Id == dto.Id.Value && !i.IsDeleted)
                ?? throw new InvalidOperationException("Image not found");

            entity.Title = dto.Title;
            entity.Description = dto.Description;
            entity.ImageData = dto.ImageData;
            entity.Category = dto.Category;
            entity.DepartmentId = dto.DepartmentId;
            entity.Tags = dto.Tags;
            entity.Annotations = dto.Annotations;
            entity.IsShared = dto.IsShared;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new EmrImage
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Description = dto.Description,
                ImageData = dto.ImageData,
                Category = dto.Category,
                DepartmentId = dto.DepartmentId,
                UploadedByUserId = userId,
                Tags = dto.Tags,
                Annotations = dto.Annotations,
                IsShared = dto.IsShared,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrImage>().Add(entity);
        }

        await _context.SaveChangesAsync();

        return new EmrImageDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Description = entity.Description,
            ImageData = entity.ImageData,
            Category = entity.Category,
            DepartmentId = entity.DepartmentId,
            UploadedByUserId = entity.UploadedByUserId,
            Tags = entity.Tags,
            Annotations = entity.Annotations,
            IsShared = entity.IsShared,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteImageAsync(Guid id)
    {
        try
        {
            var entity = await _context.Set<EmrImage>()
                .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);
            if (entity == null) return false;

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = GetCurrentUserId();
            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }
}
