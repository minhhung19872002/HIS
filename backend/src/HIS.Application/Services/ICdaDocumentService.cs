using HIS.Application.DTOs.CDA;

namespace HIS.Application.Services;

/// <summary>
/// HL7 CDA R2 Document Generation Service
/// Generates Clinical Document Architecture documents conforming to HL7 CDA R2 standard
/// for health information exchange (TT 54/2017, TT 32/2023, TT 13/2025)
/// </summary>
public interface ICdaDocumentService
{
    /// <summary>
    /// Generate a new CDA document from clinical data
    /// </summary>
    Task<CdaDocumentDto> GenerateCdaDocumentAsync(GenerateCdaRequest request, string userId);

    /// <summary>
    /// Search CDA documents with pagination and filters
    /// </summary>
    Task<CdaDocumentPagedResult> SearchCdaDocumentsAsync(CdaDocumentSearchDto search);

    /// <summary>
    /// Get a CDA document by ID (without XML content for listing)
    /// </summary>
    Task<CdaDocumentDto?> GetCdaDocumentAsync(Guid documentId);

    /// <summary>
    /// Get the raw CDA XML content for a document
    /// </summary>
    Task<string> GetCdaXmlAsync(Guid documentId);

    /// <summary>
    /// Validate a CDA document against HL7 CDA R2 schema rules
    /// </summary>
    Task<CdaValidationResult> ValidateCdaDocumentAsync(Guid documentId);

    /// <summary>
    /// Finalize a draft CDA document (set Status=1)
    /// </summary>
    Task<CdaDocumentDto> FinalizeCdaDocumentAsync(Guid documentId, string userId);

    /// <summary>
    /// Delete a draft CDA document (soft delete)
    /// </summary>
    Task DeleteCdaDocumentAsync(Guid documentId);

    /// <summary>
    /// Regenerate a CDA document (re-query clinical data and rebuild XML)
    /// </summary>
    Task<CdaDocumentDto> RegenerateCdaDocumentAsync(Guid documentId, string userId);
}
