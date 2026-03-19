using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HIS.Application.DTOs.EmrAdmin;

namespace HIS.Application.Services
{
    public interface IEmrAdminService
    {
        // Cover Types (Vo benh an)
        Task<List<EmrCoverTypeDto>> GetCoverTypesAsync(string? keyword = null, string? category = null);
        Task<EmrCoverTypeDto> SaveCoverTypeAsync(SaveEmrCoverTypeDto dto);
        Task<bool> DeleteCoverTypeAsync(Guid id);

        // Signer Catalog (Nguoi ky)
        Task<List<EmrSignerCatalogDto>> GetSignersAsync(string? keyword = null, Guid? departmentId = null);
        Task<EmrSignerCatalogDto> SaveSignerAsync(SaveEmrSignerDto dto);
        Task<bool> DeleteSignerAsync(Guid id);

        // Signing Roles (Vai tro ky)
        Task<List<EmrSigningRoleDto>> GetSigningRolesAsync();
        Task<EmrSigningRoleDto> SaveSigningRoleAsync(SaveEmrSigningRoleDto dto);
        Task<bool> DeleteSigningRoleAsync(Guid id);

        // Signing Operations (Nghiep vu ky)
        Task<List<EmrSigningOperationDto>> GetSigningOperationsAsync(string? documentType = null);
        Task<EmrSigningOperationDto> SaveSigningOperationAsync(SaveEmrSigningOperationDto dto);
        Task<bool> DeleteSigningOperationAsync(Guid id);

        // Document Groups (Nhom van ban)
        Task<List<EmrDocumentGroupDto>> GetDocumentGroupsAsync();
        Task<EmrDocumentGroupDto> SaveDocumentGroupAsync(SaveEmrDocumentGroupDto dto);
        Task<bool> DeleteDocumentGroupAsync(Guid id);

        // Document Types (Loai van ban)
        Task<List<EmrDocumentTypeDto>> GetDocumentTypesAsync(Guid? groupId = null);
        Task<EmrDocumentTypeDto> SaveDocumentTypeAsync(SaveEmrDocumentTypeDto dto);
        Task<bool> DeleteDocumentTypeAsync(Guid id);

        // Completeness Check (Kiem tra BA)
        Task<EmrCompletenessDto> GetCompletenessCheckAsync(Guid medicalRecordId);

        // Finalization (Ket thuc BA)
        Task<FinalizeResultDto> FinalizeRecordAsync(FinalizeRecordDto dto);

        // Attachments (Dinh kem)
        Task<List<EmrDocumentAttachmentDto>> GetAttachmentsAsync(Guid medicalRecordId);
        Task<EmrDocumentAttachmentDto> SaveAttachmentAsync(SaveAttachmentDto dto);
        Task<bool> DeleteAttachmentAsync(Guid id);

        // Print Logs (Nhat ky in)
        Task<List<EmrPrintLogDto>> GetPrintLogsAsync(Guid medicalRecordId);
        Task<EmrPrintLogDto> LogPrintAsync(LogPrintDto dto);
        Task<bool> StampPrintLogAsync(StampPrintLogDto dto);

        // Archive Barcode
        Task<ArchiveBarcodeDto?> GetArchiveBarcodeAsync(Guid archiveId);

        // HL7 Import/Export
        Task<Hl7ImportResultDto> ImportHl7Async(Hl7ImportDto dto);
        Task<Hl7ExportResultDto?> ExportHl7Async(Guid medicalRecordId);
    }
}
