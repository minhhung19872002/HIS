using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.EmrAdmin;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services
{
    public class EmrAdminService : IEmrAdminService
    {
        private readonly HISDbContext _db;
        private readonly IHttpContextAccessor _http;

        public EmrAdminService(HISDbContext db, IHttpContextAccessor httpContextAccessor)
        {
            _db = db;
            _http = httpContextAccessor;
        }

        private string? GetCurrentUserId() =>
            _http.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        private string? GetCurrentUserName() =>
            _http.HttpContext?.User?.FindFirst(ClaimTypes.Name)?.Value
            ?? _http.HttpContext?.User?.FindFirst(JwtClaims.FullName)?.Value;

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
                }).ToListAsync();
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
                }).ToListAsync();
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
                }).ToListAsync();
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
                }).ToListAsync();
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
                }).ToListAsync();
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
                }).ToListAsync();
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

        // ============ Completeness Check ============
        public async Task<EmrCompletenessDto> GetCompletenessCheckAsync(Guid medicalRecordId)
        {
            var record = await _db.MedicalRecords.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == medicalRecordId);

            var requiredDocTypes = await _db.Set<EmrDocumentType>().AsNoTracking()
                .Where(d => d.IsRequired && d.IsActive).ToListAsync();

            // Get signing requests for this record
            var signingRequests = await _db.SigningRequests.AsNoTracking()
                .Where(s => s.PatientId == (record != null ? record.PatientId : Guid.Empty))
                .ToListAsync();

            var items = new List<CompletenessItemDto>();
            foreach (var docType in requiredDocTypes)
            {
                var sr = signingRequests.FirstOrDefault(s => s.DocumentType == docType.Code);
                items.Add(new CompletenessItemDto
                {
                    DocumentType = docType.Code,
                    DocumentName = docType.Name,
                    IsRequired = docType.IsRequired,
                    Exists = sr != null,
                    IsSigned = sr?.Status == 1,
                    SignedByName = sr?.AssignedToName,
                    SignedAt = sr?.SignedAt
                });
            }

            var total = items.Count;
            var signed = items.Count(i => i.IsSigned);
            var unsigned = items.Count(i => i.Exists && !i.IsSigned);
            var missing = items.Count(i => i.IsRequired && !i.Exists);
            var pct = total > 0 ? Math.Round((double)signed / total * 100, 1) : 0;

            return new EmrCompletenessDto
            {
                MedicalRecordId = medicalRecordId,
                TotalDocuments = total,
                SignedDocuments = signed,
                UnsignedDocuments = unsigned,
                MissingRequiredDocuments = missing,
                CompletenessPercent = pct,
                IsComplete = missing == 0 && unsigned == 0,
                IsFinalized = record?.EmrFinalizedAt != null, // TT46: cờ riêng (Status=5 là PendingCLS — bug cũ đã sửa)
                Items = items,
                MissingDocumentNames = items.Where(i => i.IsRequired && !i.Exists).Select(i => i.DocumentName).ToList()
            };
        }

        // ============ Finalization (TT46 — plan-emr-tt46-immutability) ============
        // ⚠️ Trước đây set Status=5 — SAI semantics (5 = MedicalRecordStatus.PendingCLS của luồng khám).
        // Nay khóa bằng cờ riêng EmrFinalizedAt/By + ghi vết/phiên bản vào EmrAmendments (snapshot bản hiện hành).
        public async Task<FinalizeResultDto> FinalizeRecordAsync(FinalizeRecordDto dto)
        {
            var record = await _db.MedicalRecords.FindAsync(dto.MedicalRecordId);
            if (record == null)
                return new FinalizeResultDto { Success = false, Message = "Khong tim thay ho so benh an" };
            if (record.EmrFinalizedAt != null)
                return new FinalizeResultDto { Success = false, Message = "Ho so da duoc ket thuc truoc do" };

            var now = DateTime.UtcNow;
            Guid.TryParse(GetCurrentUserId(), out var userId);

            record.EmrFinalizedAt = now;
            record.EmrFinalizedBy = userId == Guid.Empty ? null : userId;
            record.UpdatedAt = now;
            record.UpdatedBy = GetCurrentUserId();

            var versionNo = ((await _db.EmrAmendments
                .Where(a => a.MedicalRecordId == record.Id && a.Action == 1 && !a.IsDeleted)
                .MaxAsync(a => (int?)a.VersionNo)) ?? 0) + 1;

            _db.EmrAmendments.Add(new EmrAmendment
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                Action = 1, // Finalize
                VersionNo = versionNo,
                Reason = dto.Notes,
                SnapshotJson = await BuildEmrSnapshotJsonAsync(record),
                PerformedBy = userId,
                PerformedByName = GetCurrentUserName(),
                PerformedAt = now,
                CreatedAt = now,
                CreatedBy = GetCurrentUserId(),
            });
            await _db.SaveChangesAsync();

            return new FinalizeResultDto
            {
                Success = true,
                Message = $"Da ket thuc ho so benh an (phien ban v{versionNo})",
                FinalizedAt = now,
                VersionNo = versionNo,
            };
        }

        /// <summary>TT46: mở lại hồ sơ đã kết thúc — bắt buộc lý do, lưu vết EmrAmendments.</summary>
        public async Task<FinalizeResultDto> ReopenRecordAsync(Guid medicalRecordId, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                return new FinalizeResultDto { Success = false, Message = "Phai nhap ly do mo lai ho so (TT46)" };

            var record = await _db.MedicalRecords.FindAsync(medicalRecordId);
            if (record == null)
                return new FinalizeResultDto { Success = false, Message = "Khong tim thay ho so benh an" };
            if (record.EmrFinalizedAt == null)
                return new FinalizeResultDto { Success = false, Message = "Ho so chua ket thuc — khong can mo lai" };

            var now = DateTime.UtcNow;
            Guid.TryParse(GetCurrentUserId(), out var userId);

            record.EmrFinalizedAt = null;
            record.EmrFinalizedBy = null;
            record.UpdatedAt = now;
            record.UpdatedBy = GetCurrentUserId();

            var currentVersion = (await _db.EmrAmendments
                .Where(a => a.MedicalRecordId == record.Id && a.Action == 1 && !a.IsDeleted)
                .MaxAsync(a => (int?)a.VersionNo)) ?? 1;

            _db.EmrAmendments.Add(new EmrAmendment
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                Action = 2, // Reopen
                VersionNo = currentVersion,
                Reason = reason.Trim(),
                PerformedBy = userId,
                PerformedByName = GetCurrentUserName(),
                PerformedAt = now,
                CreatedAt = now,
                CreatedBy = GetCurrentUserId(),
            });
            await _db.SaveChangesAsync();

            return new FinalizeResultDto { Success = true, Message = "Da mo lai ho so — moi chinh sua se duoc luu vet; ket thuc lai de tao phien ban moi" };
        }

        public async Task<List<EmrAmendmentDto>> GetAmendmentsAsync(Guid medicalRecordId)
        {
            return await _db.EmrAmendments.AsNoTracking()
                .Where(a => a.MedicalRecordId == medicalRecordId && !a.IsDeleted)
                .OrderByDescending(a => a.PerformedAt)
                .Select(a => new EmrAmendmentDto
                {
                    Id = a.Id,
                    MedicalRecordId = a.MedicalRecordId,
                    Action = a.Action,
                    ActionName = a.Action == 1 ? "Kết thúc hồ sơ" : a.Action == 2 ? "Mở lại hồ sơ" : "Tu chỉnh",
                    VersionNo = a.VersionNo,
                    Reason = a.Reason,
                    SnapshotJson = a.SnapshotJson,
                    PerformedBy = a.PerformedBy,
                    PerformedByName = a.PerformedByName,
                    PerformedAt = a.PerformedAt,
                }).ToListAsync();
        }

        /// <summary>
        /// Snapshot "bản cũ" mức hồ sơ tại thời điểm finalize: nội dung chính + thống kê tài liệu
        /// + danh sách chữ ký số hiệu lực — đủ đối chiếu khi tu chỉnh (per-document snapshot = phase sau).
        /// </summary>
        private async Task<string> BuildEmrSnapshotJsonAsync(MedicalRecord record)
        {
            var examIds = await _db.Examinations.AsNoTracking()
                .Where(e => e.MedicalRecordId == record.Id && !e.IsDeleted)
                .Select(e => e.Id).ToListAsync();
            var prescriptionIds = await _db.Prescriptions.AsNoTracking()
                .Where(p => p.MedicalRecordId == record.Id && !p.IsDeleted)
                .Select(p => p.Id).ToListAsync();
            var serviceRequestCount = await _db.ServiceRequests.AsNoTracking()
                .CountAsync(s => s.MedicalRecordId == record.Id && !s.IsDeleted);
            var progressCount = await _db.DailyProgresses.AsNoTracking()
                .CountAsync(d => !d.IsDeleted && _db.Admissions
                    .Any(ad => ad.Id == d.AdmissionId && ad.MedicalRecordId == record.Id));

            var docIds = examIds.Concat(prescriptionIds).Append(record.Id).ToList();
            var signatures = await _db.DocumentSignatures.AsNoTracking()
                .Where(ds => ds.Status == 0 && docIds.Contains(ds.DocumentId))
                .Select(ds => new
                {
                    ds.DocumentId,
                    ds.DocumentType,
                    ds.DocumentCode,
                    SignerName = ds.SignedByUser != null ? ds.SignedByUser.FullName : null,
                    ds.SignedAt,
                })
                .ToListAsync();

            return System.Text.Json.JsonSerializer.Serialize(new
            {
                snapshotAt = DateTime.UtcNow,
                record.MedicalRecordCode,
                record.MainDiagnosis,
                record.MainIcdCode,
                record.SubDiagnosis,
                record.TreatmentResult,
                record.DischargeType,
                record.AdmissionDate,
                record.DischargeDate,
                counts = new
                {
                    examinations = examIds.Count,
                    prescriptions = prescriptionIds.Count,
                    serviceRequests = serviceRequestCount,
                    dailyProgresses = progressCount,
                },
                activeSignatures = signatures,
            });
        }

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
                }).ToListAsync();
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
                }).ToListAsync();
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

        // ============ Archive Barcode ============
        public async Task<ArchiveBarcodeDto?> GetArchiveBarcodeAsync(Guid archiveId)
        {
            var archive = await _db.MedicalRecordArchives.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == archiveId);
            if (archive == null) return null;

            var record = await _db.MedicalRecords.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == archive.MedicalRecordId);
            var patient = record != null ? await _db.Patients.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == record.PatientId) : null;

            return new ArchiveBarcodeDto
            {
                ArchiveId = archive.Id,
                BarcodeData = $"MRA-{archive.Id:N}".Substring(0, 20).ToUpperInvariant(),
                PatientCode = patient?.PatientCode ?? "",
                PatientName = patient?.FullName ?? "",
                MedicalRecordCode = record?.MedicalRecordCode,
                ArchiveLocation = archive.StorageLocation,
                ArchivedAt = archive.CreatedAt
            };
        }

        // ============ HL7 Import/Export ============
        public async Task<Hl7ImportResultDto> ImportHl7Async(Hl7ImportDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Hl7Content))
                return new Hl7ImportResultDto { Success = false, Message = "Noi dung HL7 trong", Errors = new List<string> { "Empty HL7 content" } };

            var segments = dto.Hl7Content.Split('\r', '\n').Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
            var msh = segments.FirstOrDefault(s => s.StartsWith("MSH"));
            if (msh == null)
                return new Hl7ImportResultDto { Success = false, Message = "Khong tim thay MSH segment", Errors = new List<string> { "Missing MSH segment" } };

            var fields = msh.Split('|');
            var sendingFacility = fields.Length > 3 ? fields[3] : dto.SourceFacilityCode ?? "UNKNOWN";
            var pidSegments = segments.Where(s => s.StartsWith("PID")).ToList();
            var imported = 0;

            foreach (var pid in pidSegments)
            {
                var pidFields = pid.Split('|');
                // Basic patient data extraction from PID segment
                var patientName = pidFields.Length > 5 ? pidFields[5].Replace("^", " ") : "Unknown";
                var patientDob = pidFields.Length > 7 ? pidFields[7] : null;
                var gender = pidFields.Length > 8 ? pidFields[8] : null;

                // Log import as audit
                var auditLog = new AuditLog
                {
                    TableName = "HL7Import", RecordId = Guid.NewGuid(),
                    Action = "Import", Module = "EMR",
                    Details = $"HL7 import from {sendingFacility}: {patientName}",
                    Timestamp = DateTime.UtcNow, UserId = Guid.TryParse(GetCurrentUserId(), out var uid) ? uid : null,
                    Username = GetCurrentUserName()
                };
                _db.AuditLogs.Add(auditLog);
                imported++;
            }

            await _db.SaveChangesAsync();
            return new Hl7ImportResultDto { Success = true, Message = $"Da import {imported} ban ghi tu {sendingFacility}", ImportedRecords = imported };
        }

        public async Task<Hl7ExportResultDto?> ExportHl7Async(Guid medicalRecordId)
        {
            var record = await _db.MedicalRecords.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == medicalRecordId);
            if (record == null) return null;

            var patient = await _db.Patients.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == record.PatientId);
            if (patient == null) return null;

            var exam = await _db.Examinations.AsNoTracking()
                .Include(e => e.Doctor)
                .FirstOrDefaultAsync(e => e.MedicalRecordId == medicalRecordId);

            // Build HL7 v2.4 message with authenticator info
            var ts = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var msgId = Guid.NewGuid().ToString("N").Substring(0, 20);
            var hl7 = $"MSH|^~\\&|HIS|HOSPITAL|RECEIVING|FACILITY|{ts}||ADT^A01|{msgId}|P|2.4\r";
            hl7 += $"PID|1||{patient.PatientCode}||{patient.FullName?.Replace(" ", "^")}||{patient.DateOfBirth:yyyyMMdd}|{(patient.Gender == 1 ? "M" : "F")}\r";

            if (exam != null)
            {
                hl7 += $"DG1|1||{exam.MainIcdCode}|||A\r";
            }

            // Authenticator info (who signed/approved the record)
            var authenticator = exam?.Doctor?.FullName ?? GetCurrentUserName() ?? "System";
            hl7 += $"AUT|{authenticator}|||{ts}\r";

            return new Hl7ExportResultDto
            {
                Hl7Content = hl7,
                AuthenticatorInfo = authenticator,
                FacilityCode = "HOSPITAL",
                ExportedAt = DateTime.UtcNow
            };
        }
    }
}
