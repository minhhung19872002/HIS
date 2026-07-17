using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.CDA;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class CdaDocumentService
{
    public async Task<CdaDocumentDto> GenerateCdaDocumentAsync(GenerateCdaRequest request, string userId)
    {
        var patient = await _db.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.PatientId)
            ?? throw new InvalidOperationException($"Patient {request.PatientId} not found");

        var author = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id.ToString() == userId);

        var cdaXml = request.DocumentType switch
        {
            CdaDocumentType.DischargeSummary => await BuildDischargeSummaryAsync(patient, request, author),
            CdaDocumentType.LabReport => await BuildLabReportAsync(patient, request, author),
            CdaDocumentType.RadiologyReport => await BuildRadiologyReportAsync(patient, request, author),
            CdaDocumentType.ProgressNote => await BuildProgressNoteAsync(patient, request, author),
            CdaDocumentType.ConsultationNote => await BuildConsultationNoteAsync(patient, request, author),
            CdaDocumentType.OperativeNote => await BuildOperativeNoteAsync(patient, request, author),
            CdaDocumentType.ReferralNote => await BuildReferralNoteAsync(patient, request, author),
            CdaDocumentType.PrescriptionDocument => await BuildPrescriptionDocumentAsync(patient, request, author),
            _ => throw new ArgumentOutOfRangeException(nameof(request.DocumentType))
        };

        var documentId = $"{OidRoot}.{Guid.NewGuid():N}";

        var entity = new CdaDocument
        {
            DocumentId = documentId,
            DocumentType = (int)request.DocumentType,
            PatientId = request.PatientId,
            MedicalRecordId = request.MedicalRecordId,
            SourceEntityId = request.SourceEntityId,
            CdaXml = cdaXml,
            Status = 0, // Draft
            CreatedBy = userId
        };

        _db.CdaDocuments.Add(entity);
        await _db.SaveChangesAsync();

        return MapToDto(entity, patient.FullName, author?.FullName);
    }

    public async Task<CdaDocumentPagedResult> SearchCdaDocumentsAsync(CdaDocumentSearchDto search)
    {
        var query = _db.CdaDocuments.AsNoTracking()
            .Include(c => c.Patient)
            .Include(c => c.SignedByUser)
            .AsQueryable();

        if (search.PatientId.HasValue)
            query = query.Where(c => c.PatientId == search.PatientId.Value);
        if (search.DocumentType.HasValue)
            query = query.Where(c => c.DocumentType == (int)search.DocumentType.Value);
        if (search.Status.HasValue)
            query = query.Where(c => c.Status == search.Status.Value);
        if (search.DateFrom.HasValue)
            query = query.Where(c => c.CreatedAt >= search.DateFrom.Value);
        if (search.DateTo.HasValue)
            query = query.Where(c => c.CreatedAt <= search.DateTo.Value.AddDays(1));
        if (!string.IsNullOrWhiteSpace(search.Keyword))
        {
            var kw = search.Keyword.Trim().ToLower();
            query = query.Where(c =>
                (c.Patient != null && c.Patient.FullName.ToLower().Contains(kw)) ||
                c.DocumentId.ToLower().Contains(kw));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip(search.PageIndex * search.PageSize)
            .Take(search.PageSize)
            .Select(c => new CdaDocumentDto
            {
                Id = c.Id,
                DocumentId = c.DocumentId,
                DocumentType = (CdaDocumentType)c.DocumentType,
                DocumentTypeName = GetDocumentTypeName((CdaDocumentType)c.DocumentType),
                PatientId = c.PatientId,
                PatientName = c.Patient != null ? c.Patient.FullName : "",
                MedicalRecordId = c.MedicalRecordId,
                SourceEntityId = c.SourceEntityId,
                Status = c.Status,
                IsSigned = c.IsSigned,
                SignedByName = c.SignedByUser != null ? c.SignedByUser.FullName : null,
                SignedAt = c.SignedAt,
                CreatedAt = c.CreatedAt,
                ValidationErrors = c.ValidationErrors
            })
            .ToListAsync();

        return new CdaDocumentPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = search.PageIndex,
            PageSize = search.PageSize
        };
    }

    public async Task<CdaDocumentDto?> GetCdaDocumentAsync(Guid documentId)
    {
        var doc = await _db.CdaDocuments.AsNoTracking()
            .Include(c => c.Patient)
            .Include(c => c.SignedByUser)
            .FirstOrDefaultAsync(c => c.Id == documentId);

        if (doc == null) return null;

        return new CdaDocumentDto
        {
            Id = doc.Id,
            DocumentId = doc.DocumentId,
            DocumentType = (CdaDocumentType)doc.DocumentType,
            DocumentTypeName = GetDocumentTypeName((CdaDocumentType)doc.DocumentType),
            PatientId = doc.PatientId,
            PatientName = doc.Patient?.FullName ?? "",
            MedicalRecordId = doc.MedicalRecordId,
            SourceEntityId = doc.SourceEntityId,
            CdaXml = doc.CdaXml,
            Status = doc.Status,
            IsSigned = doc.IsSigned,
            SignedByName = doc.SignedByUser?.FullName,
            SignedAt = doc.SignedAt,
            CreatedAt = doc.CreatedAt,
            ValidationErrors = doc.ValidationErrors
        };
    }

    public async Task<string> GetCdaXmlAsync(Guid documentId)
    {
        var doc = await _db.CdaDocuments.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == documentId)
            ?? throw new InvalidOperationException($"CDA document {documentId} not found");

        return doc.CdaXml;
    }

    public async Task<CdaValidationResult> ValidateCdaDocumentAsync(Guid documentId)
    {
        var doc = await _db.CdaDocuments.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == documentId)
            ?? throw new InvalidOperationException($"CDA document {documentId} not found");

        var result = new CdaValidationResult { IsValid = true };

        try
        {
            var xdoc = XDocument.Parse(doc.CdaXml);
            var root = xdoc.Root;
            if (root == null)
            {
                result.IsValid = false;
                result.Errors.Add("Empty XML document");
                return result;
            }

            // Check required CDA R2 elements
            var clinicalDocument = root;
            if (clinicalDocument.Name.LocalName != "ClinicalDocument")
            {
                result.IsValid = false;
                result.Errors.Add("Root element must be ClinicalDocument");
            }

            // Check typeId (required in CDA R2)
            var typeId = clinicalDocument.Element(Hl7 + "typeId");
            if (typeId == null)
            {
                result.IsValid = false;
                result.Errors.Add("Missing required element: typeId");
            }

            // Check id (document identifier)
            var id = clinicalDocument.Element(Hl7 + "id");
            if (id == null)
            {
                result.IsValid = false;
                result.Errors.Add("Missing required element: id");
            }

            // Check code (document type code)
            var code = clinicalDocument.Element(Hl7 + "code");
            if (code == null)
            {
                result.IsValid = false;
                result.Errors.Add("Missing required element: code");
            }

            // Check effectiveTime
            var effectiveTime = clinicalDocument.Element(Hl7 + "effectiveTime");
            if (effectiveTime == null)
            {
                result.IsValid = false;
                result.Errors.Add("Missing required element: effectiveTime");
            }

            // Check recordTarget (patient)
            var recordTarget = clinicalDocument.Element(Hl7 + "recordTarget");
            if (recordTarget == null)
            {
                result.IsValid = false;
                result.Errors.Add("Missing required element: recordTarget");
            }

            // Check author
            var author = clinicalDocument.Element(Hl7 + "author");
            if (author == null)
            {
                result.IsValid = false;
                result.Errors.Add("Missing required element: author");
            }

            // Check custodian
            var custodian = clinicalDocument.Element(Hl7 + "custodian");
            if (custodian == null)
            {
                result.IsValid = false;
                result.Errors.Add("Missing required element: custodian");
            }

            // Check component/structuredBody
            var component = clinicalDocument.Element(Hl7 + "component");
            if (component == null)
            {
                result.IsValid = false;
                result.Errors.Add("Missing required element: component");
            }
            else
            {
                var structuredBody = component.Element(Hl7 + "structuredBody");
                if (structuredBody == null)
                {
                    result.IsValid = false;
                    result.Errors.Add("Missing required element: component/structuredBody");
                }
                else
                {
                    var sections = structuredBody.Elements(Hl7 + "component")
                        .Select(c => c.Element(Hl7 + "section"))
                        .Where(s => s != null)
                        .ToList();

                    if (sections.Count == 0)
                        result.Warnings.Add("Document body has no sections");

                    // Validate each section has a code and title
                    foreach (var section in sections)
                    {
                        var sectionCode = section!.Element(Hl7 + "code");
                        if (sectionCode == null)
                            result.Warnings.Add("Section missing code element");

                        var sectionTitle = section.Element(Hl7 + "title");
                        if (sectionTitle == null)
                            result.Warnings.Add("Section missing title element");
                    }
                }
            }

            // Check confidentialityCode
            var confCode = clinicalDocument.Element(Hl7 + "confidentialityCode");
            if (confCode == null)
                result.Warnings.Add("Missing recommended element: confidentialityCode");

            // Check languageCode
            var langCode = clinicalDocument.Element(Hl7 + "languageCode");
            if (langCode == null)
                result.Warnings.Add("Missing recommended element: languageCode");
        }
        catch (Exception ex)
        {
            result.IsValid = false;
            result.Errors.Add($"XML parse error: {ex.Message}");
        }

        // Save validation results
        var entity = await _db.CdaDocuments.FirstOrDefaultAsync(c => c.Id == documentId);
        if (entity != null)
        {
            entity.ValidationErrors = result.IsValid ? null : string.Join("; ", result.Errors);
            await _db.SaveChangesAsync();
        }

        return result;
    }

    public async Task<CdaDocumentDto> FinalizeCdaDocumentAsync(Guid documentId, string userId)
    {
        var doc = await _db.CdaDocuments
            .Include(c => c.Patient)
            .Include(c => c.SignedByUser)
            .FirstOrDefaultAsync(c => c.Id == documentId)
            ?? throw new InvalidOperationException($"CDA document {documentId} not found");

        if (doc.Status != 0)
            throw new InvalidOperationException("Only draft documents can be finalized");

        doc.Status = 1; // Final
        doc.UpdatedBy = userId;
        await _db.SaveChangesAsync();

        return MapToDto(doc, doc.Patient?.FullName ?? "", doc.SignedByUser?.FullName);
    }

    public async Task DeleteCdaDocumentAsync(Guid documentId)
    {
        var doc = await _db.CdaDocuments.FirstOrDefaultAsync(c => c.Id == documentId)
            ?? throw new InvalidOperationException($"CDA document {documentId} not found");

        if (doc.Status > 1)
            throw new InvalidOperationException("Cannot delete signed or sent documents");

        doc.IsDeleted = true;
        await _db.SaveChangesAsync();
    }

    public async Task<CdaDocumentDto> RegenerateCdaDocumentAsync(Guid documentId, string userId)
    {
        var doc = await _db.CdaDocuments
            .Include(c => c.Patient)
            .FirstOrDefaultAsync(c => c.Id == documentId)
            ?? throw new InvalidOperationException($"CDA document {documentId} not found");

        if (doc.Status > 1)
            throw new InvalidOperationException("Cannot regenerate signed or sent documents");

        var request = new GenerateCdaRequest
        {
            DocumentType = (CdaDocumentType)doc.DocumentType,
            PatientId = doc.PatientId,
            MedicalRecordId = doc.MedicalRecordId,
            SourceEntityId = doc.SourceEntityId
        };

        var patient = doc.Patient ?? await _db.Patients.AsNoTracking().FirstAsync(p => p.Id == doc.PatientId);
        var author = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id.ToString() == userId);

        var cdaXml = request.DocumentType switch
        {
            CdaDocumentType.DischargeSummary => await BuildDischargeSummaryAsync(patient, request, author),
            CdaDocumentType.LabReport => await BuildLabReportAsync(patient, request, author),
            CdaDocumentType.RadiologyReport => await BuildRadiologyReportAsync(patient, request, author),
            CdaDocumentType.ProgressNote => await BuildProgressNoteAsync(patient, request, author),
            CdaDocumentType.ConsultationNote => await BuildConsultationNoteAsync(patient, request, author),
            CdaDocumentType.OperativeNote => await BuildOperativeNoteAsync(patient, request, author),
            CdaDocumentType.ReferralNote => await BuildReferralNoteAsync(patient, request, author),
            CdaDocumentType.PrescriptionDocument => await BuildPrescriptionDocumentAsync(patient, request, author),
            _ => throw new ArgumentOutOfRangeException()
        };

        doc.CdaXml = cdaXml;
        doc.Status = 0; // Reset to draft
        doc.UpdatedBy = userId;
        doc.ValidationErrors = null;
        await _db.SaveChangesAsync();

        return MapToDto(doc, patient.FullName, author?.FullName);
    }
}
