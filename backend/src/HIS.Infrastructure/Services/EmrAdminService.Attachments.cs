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
    public partial class EmrAdminService
    {
        // ============ Attachments ============
        public async Task<List<EmrDocumentAttachmentDto>> GetAttachmentsAsync(Guid medicalRecordId)
        {
            return await _db.Set<EmrDocumentAttachment>().AsNoTracking()
                .Where(a => a.MedicalRecordId == medicalRecordId)
                .OrderByDescending(a => a.UploadedAt)
                .Select(a => new EmrDocumentAttachmentDto
                {
                    Id = a.Id, MedicalRecordId = a.MedicalRecordId, FileName = a.FileName,
                    FileType = a.FileType, FileSize = a.FileSize, FilePath = a.FilePath,
                    DocumentCategory = a.DocumentCategory, Description = a.Description,
                    UploadedByName = a.UploadedByName, UploadedAt = a.UploadedAt,
                    HasContent = a.FileContent != null
                }).ToBoundedListAsync("EmrAdminService.GetAttachmentsAsync");
        }

        public async Task<EmrDocumentAttachmentDto> SaveAttachmentAsync(SaveAttachmentDto dto)
        {
            await EmrLockGuard.EnsureEditableByRecordAsync(_db, dto.MedicalRecordId); // TT46
            var entity = new EmrDocumentAttachment
            {
                MedicalRecordId = dto.MedicalRecordId, FileName = dto.FileName,
                FileType = dto.FileType, FileSize = dto.FileSize, FilePath = dto.FilePath,
                DocumentCategory = dto.DocumentCategory, Description = dto.Description,
                UploadedById = Guid.TryParse(GetCurrentUserId(), out var uid) ? uid : null,
                UploadedByName = GetCurrentUserName(), UploadedAt = DateTime.UtcNow
            };
            _db.Set<EmrDocumentAttachment>().Add(entity);
            await _db.SaveChangesAsync();
            return new EmrDocumentAttachmentDto
            {
                Id = entity.Id, MedicalRecordId = entity.MedicalRecordId, FileName = entity.FileName,
                FileType = entity.FileType, FileSize = entity.FileSize, FilePath = entity.FilePath,
                DocumentCategory = entity.DocumentCategory, Description = entity.Description,
                UploadedByName = entity.UploadedByName, UploadedAt = entity.UploadedAt
            };
        }

        public async Task<EmrDocumentAttachmentDto> UploadAttachmentAsync(UploadAttachmentDto dto, byte[] content)
        {
            await EmrLockGuard.EnsureEditableByRecordAsync(_db, dto.MedicalRecordId); // TT46
            var entity = new EmrDocumentAttachment
            {
                MedicalRecordId = dto.MedicalRecordId, FileName = dto.FileName,
                FileType = string.IsNullOrWhiteSpace(dto.FileType) ? "application/octet-stream" : dto.FileType,
                FileSize = content.LongLength, FileContent = content, FilePath = string.Empty,
                DocumentCategory = dto.DocumentCategory, Description = dto.Description,
                UploadedById = Guid.TryParse(GetCurrentUserId(), out var uid) ? uid : null,
                UploadedByName = GetCurrentUserName(), UploadedAt = DateTime.UtcNow
            };
            _db.Set<EmrDocumentAttachment>().Add(entity);
            await _db.SaveChangesAsync();
            return new EmrDocumentAttachmentDto
            {
                Id = entity.Id, MedicalRecordId = entity.MedicalRecordId, FileName = entity.FileName,
                FileType = entity.FileType, FileSize = entity.FileSize, FilePath = entity.FilePath,
                DocumentCategory = entity.DocumentCategory, Description = entity.Description,
                UploadedByName = entity.UploadedByName, UploadedAt = entity.UploadedAt, HasContent = true
            };
        }

        public async Task<EmrAttachmentContentDto?> DownloadAttachmentAsync(Guid id)
        {
            var entity = await _db.Set<EmrDocumentAttachment>().AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id);
            if (entity?.FileContent == null || entity.FileContent.Length == 0) return null;
            return new EmrAttachmentContentDto
            {
                Content = entity.FileContent,
                FileType = string.IsNullOrWhiteSpace(entity.FileType) ? "application/octet-stream" : entity.FileType,
                FileName = string.IsNullOrWhiteSpace(entity.FileName) ? "attachment" : entity.FileName
            };
        }

        public async Task<bool> DeleteAttachmentAsync(Guid id)
        {
            var entity = await _db.Set<EmrDocumentAttachment>().FindAsync(id);
            if (entity == null) return false;
            await EmrLockGuard.EnsureEditableByRecordAsync(_db, entity.MedicalRecordId); // TT46
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        // ============ Print Logs ============
        public async Task<List<EmrPrintLogDto>> GetPrintLogsAsync(Guid medicalRecordId)
        {
            return await _db.Set<EmrPrintLog>().AsNoTracking()
                .Where(p => p.MedicalRecordId == medicalRecordId)
                .OrderByDescending(p => p.PrintedAt)
                .Select(p => new EmrPrintLogDto
                {
                    Id = p.Id, MedicalRecordId = p.MedicalRecordId, DocumentType = p.DocumentType,
                    DocumentTitle = p.DocumentTitle, PrintedByName = p.PrintedByName,
                    PrintedAt = p.PrintedAt, IsStamped = p.IsStamped, StampedAt = p.StampedAt,
                    StampedByName = p.StampedByName, PrintCount = p.PrintCount
                }).ToBoundedListAsync("EmrAdminService.GetPrintLogsAsync");
        }

        public async Task<EmrPrintLogDto> LogPrintAsync(LogPrintDto dto)
        {
            // Check if there's already a print log for the same doc type on this record
            var existing = await _db.Set<EmrPrintLog>()
                .FirstOrDefaultAsync(p => p.MedicalRecordId == dto.MedicalRecordId && p.DocumentType == dto.DocumentType);
            if (existing != null)
            {
                existing.PrintCount++;
                existing.PrintedAt = DateTime.UtcNow;
                existing.PrintedByName = GetCurrentUserName();
                await _db.SaveChangesAsync();
                return new EmrPrintLogDto
                {
                    Id = existing.Id, MedicalRecordId = existing.MedicalRecordId,
                    DocumentType = existing.DocumentType, DocumentTitle = existing.DocumentTitle,
                    PrintedByName = existing.PrintedByName, PrintedAt = existing.PrintedAt,
                    IsStamped = existing.IsStamped, StampedAt = existing.StampedAt,
                    StampedByName = existing.StampedByName, PrintCount = existing.PrintCount
                };
            }

            var entity = new EmrPrintLog
            {
                MedicalRecordId = dto.MedicalRecordId, DocumentType = dto.DocumentType,
                DocumentTitle = dto.DocumentTitle,
                PrintedById = Guid.TryParse(GetCurrentUserId(), out var uid) ? uid : null,
                PrintedByName = GetCurrentUserName(), PrintedAt = DateTime.UtcNow, PrintCount = 1
            };
            _db.Set<EmrPrintLog>().Add(entity);
            await _db.SaveChangesAsync();
            return new EmrPrintLogDto
            {
                Id = entity.Id, MedicalRecordId = entity.MedicalRecordId,
                DocumentType = entity.DocumentType, DocumentTitle = entity.DocumentTitle,
                PrintedByName = entity.PrintedByName, PrintedAt = entity.PrintedAt,
                IsStamped = entity.IsStamped, PrintCount = entity.PrintCount
            };
        }

        public async Task<bool> StampPrintLogAsync(StampPrintLogDto dto)
        {
            var entity = await _db.Set<EmrPrintLog>().FindAsync(dto.PrintLogId);
            if (entity == null) return false;
            entity.IsStamped = true;
            entity.StampedAt = DateTime.UtcNow;
            entity.StampedByName = GetCurrentUserName();
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
