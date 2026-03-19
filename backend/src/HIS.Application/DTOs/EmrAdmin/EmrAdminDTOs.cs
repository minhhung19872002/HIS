using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.EmrAdmin
{
    // ============ Cover Type (Vo benh an) ============
    public class EmrCoverTypeDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public Guid? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string? Description { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveEmrCoverTypeDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public Guid? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string? Description { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // ============ Document Attachment (Dinh kem) ============
    public class EmrDocumentAttachmentDto
    {
        public Guid Id { get; set; }
        public Guid MedicalRecordId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string FilePath { get; set; } = string.Empty;
        public string? DocumentCategory { get; set; }
        public string? Description { get; set; }
        public string? UploadedByName { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    public class SaveAttachmentDto
    {
        public Guid MedicalRecordId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string FilePath { get; set; } = string.Empty;
        public string? DocumentCategory { get; set; }
        public string? Description { get; set; }
    }

    // ============ Print Log (Nhat ky in) ============
    public class EmrPrintLogDto
    {
        public Guid Id { get; set; }
        public Guid MedicalRecordId { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentTitle { get; set; } = string.Empty;
        public string? PrintedByName { get; set; }
        public DateTime PrintedAt { get; set; }
        public bool IsStamped { get; set; }
        public DateTime? StampedAt { get; set; }
        public string? StampedByName { get; set; }
        public int PrintCount { get; set; }
    }

    public class LogPrintDto
    {
        public Guid MedicalRecordId { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentTitle { get; set; } = string.Empty;
    }

    public class StampPrintLogDto
    {
        public Guid PrintLogId { get; set; }
    }

    // ============ Signer Catalog (Nguoi ky) ============
    public class EmrSignerCatalogDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Title { get; set; }
        public Guid? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string? CertificateInfo { get; set; }
        public string? SignatureImagePath { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveEmrSignerDto
    {
        public Guid? Id { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Title { get; set; }
        public Guid? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string? CertificateInfo { get; set; }
        public string? SignatureImagePath { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // ============ Signing Role (Vai tro ky) ============
    public class EmrSigningRoleDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveEmrSigningRoleDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // ============ Signing Operation (Nghiep vu ky) ============
    public class EmrSigningOperationDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid? RoleId { get; set; }
        public string? RoleName { get; set; }
        public string? DocumentType { get; set; }
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveEmrSigningOperationDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid? RoleId { get; set; }
        public string? RoleName { get; set; }
        public string? DocumentType { get; set; }
        public bool IsRequired { get; set; } = true;
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // ============ Document Group (Nhom van ban) ============
    public class EmrDocumentGroupDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveEmrDocumentGroupDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // ============ Document Type (Loai van ban) ============
    public class EmrDocumentTypeDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid? GroupId { get; set; }
        public string? GroupName { get; set; }
        public string? FormTemplateKey { get; set; }
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveEmrDocumentTypeDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid? GroupId { get; set; }
        public string? GroupName { get; set; }
        public string? FormTemplateKey { get; set; }
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // ============ Completeness Check (Kiem tra BA) ============
    public class EmrCompletenessDto
    {
        public Guid MedicalRecordId { get; set; }
        public int TotalDocuments { get; set; }
        public int SignedDocuments { get; set; }
        public int UnsignedDocuments { get; set; }
        public int MissingRequiredDocuments { get; set; }
        public double CompletenessPercent { get; set; }
        public bool IsComplete { get; set; }
        public bool IsFinalized { get; set; }
        public List<CompletenessItemDto> Items { get; set; } = new();
        public List<string> MissingDocumentNames { get; set; } = new();
    }

    public class CompletenessItemDto
    {
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentName { get; set; } = string.Empty;
        public bool IsRequired { get; set; }
        public bool Exists { get; set; }
        public bool IsSigned { get; set; }
        public string? SignedByName { get; set; }
        public DateTime? SignedAt { get; set; }
    }

    // ============ Finalization (Ket thuc BA) ============
    public class FinalizeRecordDto
    {
        public Guid MedicalRecordId { get; set; }
        public string? Notes { get; set; }
    }

    public class FinalizeResultDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public DateTime? FinalizedAt { get; set; }
    }

    // ============ HL7 Import/Export ============
    public class Hl7ImportDto
    {
        public string Hl7Content { get; set; } = string.Empty;
        public string? SourceFacilityCode { get; set; }
        public string? SourceFacilityName { get; set; }
    }

    public class Hl7ImportResultDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public int ImportedRecords { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class Hl7ExportResultDto
    {
        public string Hl7Content { get; set; } = string.Empty;
        public string? AuthenticatorInfo { get; set; }
        public string? FacilityCode { get; set; }
        public DateTime ExportedAt { get; set; }
    }

    // ============ Archive Barcode ============
    public class ArchiveBarcodeDto
    {
        public Guid ArchiveId { get; set; }
        public string BarcodeData { get; set; } = string.Empty;
        public string PatientCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string? MedicalRecordCode { get; set; }
        public string? ArchiveLocation { get; set; }
        public DateTime? ArchivedAt { get; set; }
    }
}
