using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Common;
using HIS.Application.DTOs.EmrAdmin;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services
{
    public partial class EmrAdminService : IEmrAdminService
    {
        private readonly HISDbContext _db;
        private readonly ICurrentUserAccessor _currentUser;
        private readonly IAuditLogService _auditLog;

        public EmrAdminService(HISDbContext db, ICurrentUserAccessor currentUser, IAuditLogService auditLog)
        {
            _db = db;
            _currentUser = currentUser;
            _auditLog = auditLog;
        }

        // Đọc người dùng hiện tại qua ICurrentUserAccessor (canonical claim) — #200 REFAC-1
        private string? GetCurrentUserId() => _currentUser.UserId;
        private string? GetCurrentUserName() => _currentUser.UserName;

        // ============ Cover Types ============
        public async Task<List<EmrCoverTypeDto>> GetCoverTypesAsync(string? keyword = null, string? category = null)
        {
            var query = _db.Set<EmrCoverType>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(x => x.Code.Contains(keyword) || x.Name.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(x => x.Category == category);
            return await query.OrderBy(x => x.SortOrder).ThenBy(x => x.Code)
                .Select(x => new EmrCoverTypeDto
                {
                    Id = x.Id, Code = x.Code, Name = x.Name, Category = x.Category,
                    DepartmentId = x.DepartmentId, DepartmentName = x.DepartmentName,
                    Description = x.Description, SortOrder = x.SortOrder, IsActive = x.IsActive
                }).ToBoundedListAsync("EmrAdminService.GetCoverTypesAsync");
        }

        public async Task<EmrCoverTypeDto> SaveCoverTypeAsync(SaveEmrCoverTypeDto dto)
        {
            EmrCoverType entity;
            if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
            {
                entity = await _db.Set<EmrCoverType>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Cover type not found");
                entity.Code = dto.Code; entity.Name = dto.Name; entity.Category = dto.Category;
                entity.DepartmentId = dto.DepartmentId; entity.DepartmentName = dto.DepartmentName;
                entity.Description = dto.Description; entity.SortOrder = dto.SortOrder;
                entity.IsActive = dto.IsActive;
            }
            else
            {
                entity = new EmrCoverType
                {
                    Code = dto.Code, Name = dto.Name, Category = dto.Category,
                    DepartmentId = dto.DepartmentId, DepartmentName = dto.DepartmentName,
                    Description = dto.Description, SortOrder = dto.SortOrder, IsActive = dto.IsActive
                };
                _db.Set<EmrCoverType>().Add(entity);
            }
            await _db.SaveChangesAsync();
            return new EmrCoverTypeDto
            {
                Id = entity.Id, Code = entity.Code, Name = entity.Name, Category = entity.Category,
                DepartmentId = entity.DepartmentId, DepartmentName = entity.DepartmentName,
                Description = entity.Description, SortOrder = entity.SortOrder, IsActive = entity.IsActive
            };
        }

        public async Task<bool> DeleteCoverTypeAsync(Guid id)
        {
            var entity = await _db.Set<EmrCoverType>().FindAsync(id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        // ============ Signer Catalog ============
        public async Task<List<EmrSignerCatalogDto>> GetSignersAsync(string? keyword = null, Guid? departmentId = null)
        {
            var query = _db.Set<EmrSignerCatalog>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(x => x.FullName.Contains(keyword) || x.UserName.Contains(keyword));
            if (departmentId.HasValue)
                query = query.Where(x => x.DepartmentId == departmentId.Value);
            return await query.OrderBy(x => x.FullName)
                .Select(x => new EmrSignerCatalogDto
                {
                    Id = x.Id, UserId = x.UserId, UserName = x.UserName, FullName = x.FullName,
                    Title = x.Title, DepartmentId = x.DepartmentId, DepartmentName = x.DepartmentName,
                    CertificateInfo = x.CertificateInfo, SignatureImagePath = x.SignatureImagePath,
                    IsActive = x.IsActive
                }).ToBoundedListAsync("EmrAdminService.GetSignersAsync");
        }

        public async Task<EmrSignerCatalogDto> SaveSignerAsync(SaveEmrSignerDto dto)
        {
            EmrSignerCatalog entity;
            if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
            {
                entity = await _db.Set<EmrSignerCatalog>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Signer not found");
                entity.UserId = dto.UserId; entity.UserName = dto.UserName; entity.FullName = dto.FullName;
                entity.Title = dto.Title; entity.DepartmentId = dto.DepartmentId;
                entity.DepartmentName = dto.DepartmentName; entity.CertificateInfo = dto.CertificateInfo;
                entity.SignatureImagePath = dto.SignatureImagePath; entity.IsActive = dto.IsActive;
            }
            else
            {
                entity = new EmrSignerCatalog
                {
                    UserId = dto.UserId, UserName = dto.UserName, FullName = dto.FullName,
                    Title = dto.Title, DepartmentId = dto.DepartmentId,
                    DepartmentName = dto.DepartmentName, CertificateInfo = dto.CertificateInfo,
                    SignatureImagePath = dto.SignatureImagePath, IsActive = dto.IsActive
                };
                _db.Set<EmrSignerCatalog>().Add(entity);
            }
            await _db.SaveChangesAsync();
            return new EmrSignerCatalogDto
            {
                Id = entity.Id, UserId = entity.UserId, UserName = entity.UserName, FullName = entity.FullName,
                Title = entity.Title, DepartmentId = entity.DepartmentId, DepartmentName = entity.DepartmentName,
                CertificateInfo = entity.CertificateInfo, SignatureImagePath = entity.SignatureImagePath,
                IsActive = entity.IsActive
            };
        }

        public async Task<bool> DeleteSignerAsync(Guid id)
        {
            var entity = await _db.Set<EmrSignerCatalog>().FindAsync(id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        // ============ Signing Roles ============
        public async Task<List<EmrSigningRoleDto>> GetSigningRolesAsync()
        {
            return await _db.Set<EmrSigningRole>().AsNoTracking()
                .OrderBy(x => x.SortOrder).ThenBy(x => x.Code)
                .Select(x => new EmrSigningRoleDto
                {
                    Id = x.Id, Code = x.Code, Name = x.Name, Description = x.Description,
                    SortOrder = x.SortOrder, IsActive = x.IsActive
                }).ToBoundedListAsync("EmrAdminService.GetSigningRolesAsync");
        }

        public async Task<EmrSigningRoleDto> SaveSigningRoleAsync(SaveEmrSigningRoleDto dto)
        {
            EmrSigningRole entity;
            if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
            {
                entity = await _db.Set<EmrSigningRole>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Signing role not found");
                entity.Code = dto.Code; entity.Name = dto.Name; entity.Description = dto.Description;
                entity.SortOrder = dto.SortOrder; entity.IsActive = dto.IsActive;
            }
            else
            {
                entity = new EmrSigningRole { Code = dto.Code, Name = dto.Name, Description = dto.Description, SortOrder = dto.SortOrder, IsActive = dto.IsActive };
                _db.Set<EmrSigningRole>().Add(entity);
            }
            await _db.SaveChangesAsync();
            return new EmrSigningRoleDto { Id = entity.Id, Code = entity.Code, Name = entity.Name, Description = entity.Description, SortOrder = entity.SortOrder, IsActive = entity.IsActive };
        }

        public async Task<bool> DeleteSigningRoleAsync(Guid id)
        {
            var entity = await _db.Set<EmrSigningRole>().FindAsync(id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        // ============ Signing Operations ============
        public async Task<List<EmrSigningOperationDto>> GetSigningOperationsAsync(string? documentType = null)
        {
            var query = _db.Set<EmrSigningOperation>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(documentType))
                query = query.Where(x => x.DocumentType == documentType);
            return await query.OrderBy(x => x.SortOrder)
                .Select(x => new EmrSigningOperationDto
                {
                    Id = x.Id, Code = x.Code, Name = x.Name, RoleId = x.RoleId, RoleName = x.RoleName,
                    DocumentType = x.DocumentType, IsRequired = x.IsRequired, SortOrder = x.SortOrder, IsActive = x.IsActive
                }).ToBoundedListAsync("EmrAdminService.GetSigningOperationsAsync");
        }

        public async Task<EmrSigningOperationDto> SaveSigningOperationAsync(SaveEmrSigningOperationDto dto)
        {
            EmrSigningOperation entity;
            if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
            {
                entity = await _db.Set<EmrSigningOperation>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Signing operation not found");
                entity.Code = dto.Code; entity.Name = dto.Name; entity.RoleId = dto.RoleId;
                entity.RoleName = dto.RoleName; entity.DocumentType = dto.DocumentType;
                entity.IsRequired = dto.IsRequired; entity.SortOrder = dto.SortOrder; entity.IsActive = dto.IsActive;
            }
            else
            {
                entity = new EmrSigningOperation
                {
                    Code = dto.Code, Name = dto.Name, RoleId = dto.RoleId, RoleName = dto.RoleName,
                    DocumentType = dto.DocumentType, IsRequired = dto.IsRequired, SortOrder = dto.SortOrder, IsActive = dto.IsActive
                };
                _db.Set<EmrSigningOperation>().Add(entity);
            }
            await _db.SaveChangesAsync();
            return new EmrSigningOperationDto
            {
                Id = entity.Id, Code = entity.Code, Name = entity.Name, RoleId = entity.RoleId, RoleName = entity.RoleName,
                DocumentType = entity.DocumentType, IsRequired = entity.IsRequired, SortOrder = entity.SortOrder, IsActive = entity.IsActive
            };
        }

        public async Task<bool> DeleteSigningOperationAsync(Guid id)
        {
            var entity = await _db.Set<EmrSigningOperation>().FindAsync(id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        // ============ Document Groups ============
        public async Task<List<EmrDocumentGroupDto>> GetDocumentGroupsAsync()
        {
            return await _db.Set<EmrDocumentGroup>().AsNoTracking()
                .OrderBy(x => x.SortOrder).ThenBy(x => x.Code)
                .Select(x => new EmrDocumentGroupDto
                {
                    Id = x.Id, Code = x.Code, Name = x.Name, Category = x.Category,
                    SortOrder = x.SortOrder, IsActive = x.IsActive
                }).ToBoundedListAsync("EmrAdminService.GetDocumentGroupsAsync");
        }

        public async Task<EmrDocumentGroupDto> SaveDocumentGroupAsync(SaveEmrDocumentGroupDto dto)
        {
            EmrDocumentGroup entity;
            if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
            {
                entity = await _db.Set<EmrDocumentGroup>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Document group not found");
                entity.Code = dto.Code; entity.Name = dto.Name; entity.Category = dto.Category;
                entity.SortOrder = dto.SortOrder; entity.IsActive = dto.IsActive;
            }
            else
            {
                entity = new EmrDocumentGroup { Code = dto.Code, Name = dto.Name, Category = dto.Category, SortOrder = dto.SortOrder, IsActive = dto.IsActive };
                _db.Set<EmrDocumentGroup>().Add(entity);
            }
            await _db.SaveChangesAsync();
            return new EmrDocumentGroupDto { Id = entity.Id, Code = entity.Code, Name = entity.Name, Category = entity.Category, SortOrder = entity.SortOrder, IsActive = entity.IsActive };
        }

        public async Task<bool> DeleteDocumentGroupAsync(Guid id)
        {
            var entity = await _db.Set<EmrDocumentGroup>().FindAsync(id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        // ============ Document Types ============
        public async Task<List<EmrDocumentTypeDto>> GetDocumentTypesAsync(Guid? groupId = null)
        {
            var query = _db.Set<EmrDocumentType>().AsNoTracking().AsQueryable();
            if (groupId.HasValue)
                query = query.Where(x => x.GroupId == groupId.Value);
            return await query.OrderBy(x => x.SortOrder).ThenBy(x => x.Code)
                .Select(x => new EmrDocumentTypeDto
                {
                    Id = x.Id, Code = x.Code, Name = x.Name, GroupId = x.GroupId, GroupName = x.GroupName,
                    FormTemplateKey = x.FormTemplateKey, IsRequired = x.IsRequired, SortOrder = x.SortOrder, IsActive = x.IsActive
                }).ToBoundedListAsync("EmrAdminService.GetDocumentTypesAsync");
        }

        public async Task<EmrDocumentTypeDto> SaveDocumentTypeAsync(SaveEmrDocumentTypeDto dto)
        {
            EmrDocumentType entity;
            if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
            {
                entity = await _db.Set<EmrDocumentType>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Document type not found");
                entity.Code = dto.Code; entity.Name = dto.Name; entity.GroupId = dto.GroupId;
                entity.GroupName = dto.GroupName; entity.FormTemplateKey = dto.FormTemplateKey;
                entity.IsRequired = dto.IsRequired; entity.SortOrder = dto.SortOrder; entity.IsActive = dto.IsActive;
            }
            else
            {
                entity = new EmrDocumentType
                {
                    Code = dto.Code, Name = dto.Name, GroupId = dto.GroupId, GroupName = dto.GroupName,
                    FormTemplateKey = dto.FormTemplateKey, IsRequired = dto.IsRequired, SortOrder = dto.SortOrder, IsActive = dto.IsActive
                };
                _db.Set<EmrDocumentType>().Add(entity);
            }
            await _db.SaveChangesAsync();
            return new EmrDocumentTypeDto
            {
                Id = entity.Id, Code = entity.Code, Name = entity.Name, GroupId = entity.GroupId, GroupName = entity.GroupName,
                FormTemplateKey = entity.FormTemplateKey, IsRequired = entity.IsRequired, SortOrder = entity.SortOrder, IsActive = entity.IsActive
            };
        }

        public async Task<bool> DeleteDocumentTypeAsync(Guid id)
        {
            var entity = await _db.Set<EmrDocumentType>().FindAsync(id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

    }
}
