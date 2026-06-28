using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K3 phien 6 (2026-05-30): tach RIS region IX Online Help (~298 dong) khoi
// RISCompleteService.cs. ZERO runtime change — partial class.
public partial class RISCompleteService
{
    #region IX. Online Help - Hướng dẫn sử dụng Online

    public async Task<List<HelpCategoryDto>> GetHelpCategoriesAsync(Guid? parentId = null)
    {
        var query = _context.Set<RadiologyHelpCategory>()
            .Where(c => c.IsActive);

        if (parentId.HasValue)
            query = query.Where(c => c.ParentId == parentId);
        else
            query = query.Where(c => c.ParentId == null);

        var categories = await query.OrderBy(c => c.SortOrder).ToBoundedListAsync("RISCompleteService.GetHelpCategoriesAsync");

        return categories.Select(c => new HelpCategoryDto
        {
            Id = c.Id,
            Code = c.Code,
            Name = c.Name,
            Description = c.Description,
            ParentId = c.ParentId,
            IconClass = c.IconClass,
            SortOrder = c.SortOrder,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<HelpCategoryDto> SaveHelpCategoryAsync(SaveHelpCategoryDto dto)
    {
        RadiologyHelpCategory category;
        if (dto.Id.HasValue)
        {
            category = await _context.Set<RadiologyHelpCategory>().FindAsync(dto.Id.Value);
            if (category == null) return null;
        }
        else
        {
            category = new RadiologyHelpCategory { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyHelpCategory>().AddAsync(category);
        }

        category.Code = dto.Code;
        category.Name = dto.Name;
        category.Description = dto.Description;
        category.ParentId = dto.ParentId;
        category.IconClass = dto.IconClass;
        category.SortOrder = dto.SortOrder;
        category.IsActive = dto.IsActive;
        category.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new HelpCategoryDto
        {
            Id = category.Id,
            Code = category.Code,
            Name = category.Name,
            IsActive = category.IsActive
        };
    }

    public async Task<HelpSearchResultDto> SearchHelpArticlesAsync(SearchHelpDto searchDto)
    {
        var query = _context.Set<RadiologyHelpArticle>()
            .Include(a => a.Category)
            .Where(a => a.IsPublished);

        if (searchDto.CategoryId.HasValue)
            query = query.Where(a => a.CategoryId == searchDto.CategoryId);
        if (!string.IsNullOrEmpty(searchDto.Keyword))
            query = query.Where(a => a.Title.Contains(searchDto.Keyword) || a.Content.Contains(searchDto.Keyword));

        var totalCount = await query.CountAsync();
        var articles = await query
            .OrderBy(a => a.SortOrder)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return new HelpSearchResultDto
        {
            Items = articles.Select(a => new HelpArticleDto
            {
                Id = a.Id,
                Title = a.Title,
                Summary = a.Summary,
                CategoryId = a.CategoryId,
                CategoryName = a.Category?.Name ?? "",
                ArticleType = a.ArticleType,
                ViewCount = a.ViewCount,
                IsPublished = a.IsPublished
            }).ToList(),
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / searchDto.PageSize),
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<HelpArticleDto> GetHelpArticleAsync(Guid articleId)
    {
        var article = await _context.Set<RadiologyHelpArticle>()
            .Include(a => a.Category)
            .FirstOrDefaultAsync(a => a.Id == articleId);

        if (article == null) return null;

        // Increment view count
        article.ViewCount++;
        await _unitOfWork.SaveChangesAsync();

        return new HelpArticleDto
        {
            Id = article.Id,
            Title = article.Title,
            Summary = article.Summary,
            Content = article.Content,
            CategoryId = article.CategoryId,
            CategoryName = article.Category?.Name ?? "",
            VideoUrl = article.VideoUrl,
            ArticleType = article.ArticleType,
            Tags = article.Tags,
            ViewCount = article.ViewCount,
            SortOrder = article.SortOrder,
            IsPublished = article.IsPublished
        };
    }

    public async Task<HelpArticleDto> SaveHelpArticleAsync(SaveHelpArticleDto dto)
    {
        RadiologyHelpArticle article;
        if (dto.Id.HasValue)
        {
            article = await _context.Set<RadiologyHelpArticle>().FindAsync(dto.Id.Value);
            if (article == null) return null;
        }
        else
        {
            article = new RadiologyHelpArticle { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyHelpArticle>().AddAsync(article);
        }

        article.Title = dto.Title;
        article.Summary = dto.Summary;
        article.Content = dto.Content;
        article.CategoryId = dto.CategoryId;
        article.VideoUrl = dto.VideoUrl;
        article.ArticleType = dto.ArticleType;
        article.Tags = dto.Tags;
        article.SortOrder = dto.SortOrder;
        article.IsPublished = dto.IsPublished;
        article.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new HelpArticleDto
        {
            Id = article.Id,
            Title = article.Title,
            Summary = article.Summary,
            IsPublished = article.IsPublished
        };
    }

    public async Task<List<TroubleshootingDto>> GetTroubleshootingListAsync(
        string category = null,
        string keyword = null)
    {
        var query = _context.Set<RadiologyTroubleshooting>()
            .Where(t => t.IsActive);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(t => t.RelatedModule == category);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(t => t.ErrorTitle.Contains(keyword) || t.Solution.Contains(keyword));

        var items = await query.OrderBy(t => t.SortOrder).ToBoundedListAsync("RISCompleteService.GetTroubleshootingListAsync");

        return items.Select(t => new TroubleshootingDto
        {
            Id = t.Id,
            ErrorCode = t.ErrorCode,
            ErrorTitle = t.ErrorTitle,
            ErrorDescription = t.ErrorDescription,
            Symptoms = t.Symptoms,
            Causes = t.Causes,
            Solution = t.Solution,
            RelatedModule = t.RelatedModule,
            Severity = t.Severity,
            SortOrder = t.SortOrder,
            IsActive = t.IsActive
        }).ToList();
    }

    public async Task<TroubleshootingDto> SaveTroubleshootingAsync(SaveTroubleshootingDto dto)
    {
        RadiologyTroubleshooting troubleshooting;
        if (dto.Id.HasValue)
        {
            troubleshooting = await _context.Set<RadiologyTroubleshooting>().FindAsync(dto.Id.Value);
            if (troubleshooting == null) return null;
        }
        else
        {
            troubleshooting = new RadiologyTroubleshooting { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyTroubleshooting>().AddAsync(troubleshooting);
        }

        troubleshooting.ErrorCode = dto.ErrorCode;
        troubleshooting.ErrorTitle = dto.ErrorTitle;
        troubleshooting.ErrorDescription = dto.ErrorDescription;
        troubleshooting.Symptoms = dto.Symptoms;
        troubleshooting.Causes = dto.Causes;
        troubleshooting.Solution = dto.Solution;
        troubleshooting.RelatedModule = dto.RelatedModule;
        troubleshooting.Severity = dto.Severity;
        troubleshooting.SortOrder = dto.SortOrder;
        troubleshooting.IsActive = dto.IsActive;
        troubleshooting.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new TroubleshootingDto
        {
            Id = troubleshooting.Id,
            ErrorCode = troubleshooting.ErrorCode,
            ErrorTitle = troubleshooting.ErrorTitle,
            IsActive = troubleshooting.IsActive
        };
    }

    public async Task<bool> DeleteHelpCategoryAsync(Guid categoryId)
    {
        var category = await _context.Set<RadiologyHelpCategory>().FindAsync(categoryId);
        if (category == null) return false;
        category.IsActive = false;
        category.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteHelpArticleAsync(Guid articleId)
    {
        var article = await _context.Set<RadiologyHelpArticle>().FindAsync(articleId);
        if (article == null) return false;
        article.IsPublished = false;
        article.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<TroubleshootingDto>> GetTroubleshootingListAsync(string module = null, int? severity = null)
    {
        var query = _context.Set<RadiologyTroubleshooting>()
            .Where(t => t.IsActive);

        if (!string.IsNullOrEmpty(module))
            query = query.Where(t => t.RelatedModule == module);
        if (severity.HasValue)
            query = query.Where(t => t.Severity == severity);

        var items = await query.OrderBy(t => t.SortOrder).ToBoundedListAsync("RISCompleteService.GetTroubleshootingListAsync");

        return items.Select(t => new TroubleshootingDto
        {
            Id = t.Id,
            ErrorCode = t.ErrorCode,
            ErrorTitle = t.ErrorTitle,
            ErrorDescription = t.ErrorDescription,
            Symptoms = t.Symptoms,
            Causes = t.Causes,
            Solution = t.Solution,
            RelatedModule = t.RelatedModule,
            Severity = t.Severity,
            SortOrder = t.SortOrder,
            IsActive = t.IsActive
        }).ToList();
    }

    public async Task<bool> DeleteTroubleshootingAsync(Guid troubleshootingId)
    {
        var troubleshooting = await _context.Set<RadiologyTroubleshooting>().FindAsync(troubleshootingId);
        if (troubleshooting == null) return false;
        troubleshooting.IsActive = false;
        troubleshooting.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IncrementArticleViewCountAsync(Guid articleId)
    {
        var article = await _context.Set<RadiologyHelpArticle>().FindAsync(articleId);
        if (article == null) return false;
        article.ViewCount++;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    #endregion
}
