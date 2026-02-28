using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.CDA;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// HL7 CDA R2 Document Generation Service
/// Generates compliant Clinical Document Architecture XML documents from EHR data.
/// OIDs: Vietnam MOH = 2.16.840.1.113883.2.24.1.1, ICD-10 = 2.16.840.1.113883.6.3, LOINC = 2.16.840.1.113883.6.1
/// </summary>
public class CdaDocumentService : ICdaDocumentService
{
    private readonly HISDbContext _db;

    // HL7 CDA R2 namespaces
    private static readonly XNamespace Hl7 = "urn:hl7-org:v3";
    private static readonly XNamespace Xsi = "http://www.w3.org/2001/XMLSchema-instance";

    // Standard OIDs
    private const string OidRoot = "2.16.840.1.113883.2.24.1.1"; // Vietnam MOH
    private const string OidIcd10 = "2.16.840.1.113883.6.3";
    private const string OidLoinc = "2.16.840.1.113883.6.1";
    private const string OidSnomed = "2.16.840.1.113883.6.96";

    // LOINC codes for CDA sections
    private const string LoincChiefComplaint = "10154-3";
    private const string LoincHistory = "10164-2";
    private const string LoincPhysicalExam = "29545-1";
    private const string LoincDiagnoses = "29308-4";
    private const string LoincProcedures = "47519-4";
    private const string LoincHospitalCourse = "8648-8";
    private const string LoincDischargeMeds = "10183-2";
    private const string LoincLabResults = "26436-6";
    private const string LoincRadiology = "18748-4";
    private const string LoincVitalSigns = "8716-3";
    private const string LoincAssessment = "51848-0";
    private const string LoincPlan = "18776-5";
    private const string LoincMedications = "10160-0";
    private const string LoincReasonForReferral = "42349-1";
    private const string LoincPreopDiagnosis = "10219-4";
    private const string LoincPostopDiagnosis = "10218-6";
    private const string LoincOperativeFindings = "10215-0";
    private const string LoincConsultationNote = "11488-4";

    public CdaDocumentService(HISDbContext db)
    {
        _db = db;
    }

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

    // ======================== CDA XML Builder Methods ========================

    private async Task<string> BuildDischargeSummaryAsync(Patient patient, GenerateCdaRequest request, User? author)
    {
        var examination = request.SourceEntityId.HasValue
            ? await _db.Examinations.AsNoTracking()
                .Include(e => e.MedicalRecord)
                .Include(e => e.Department)
                .Include(e => e.Doctor)
                .FirstOrDefaultAsync(e => e.Id == request.SourceEntityId.Value)
            : request.MedicalRecordId.HasValue
                ? await _db.Examinations.AsNoTracking()
                    .Include(e => e.MedicalRecord)
                    .Include(e => e.Department)
                    .Include(e => e.Doctor)
                    .Where(e => e.MedicalRecordId == request.MedicalRecordId.Value)
                    .OrderByDescending(e => e.CreatedAt)
                    .FirstOrDefaultAsync()
                : null;

        var medRecord = examination?.MedicalRecord
            ?? (request.MedicalRecordId.HasValue
                ? await _db.MedicalRecords.AsNoTracking().Include(m => m.Doctor).FirstOrDefaultAsync(m => m.Id == request.MedicalRecordId.Value)
                : null);

        // Fetch prescriptions for discharge medications
        var prescriptions = request.MedicalRecordId.HasValue
            ? await _db.Prescriptions.AsNoTracking()
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Where(p => p.MedicalRecordId == request.MedicalRecordId.Value && !p.IsDeleted)
                .OrderByDescending(p => p.PrescriptionDate)
                .Take(5)
                .ToListAsync()
            : new List<Prescription>();

        var sections = new List<XElement>();

        // Chief Complaint section
        sections.Add(BuildTextSection(LoincChiefComplaint, "Ly do kham",
            examination?.ChiefComplaint ?? "Khong ghi nhan"));

        // History section
        sections.Add(BuildTextSection(LoincHistory, "Benh su",
            examination?.PresentIllness ?? patient.MedicalHistory ?? "Khong ghi nhan"));

        // Physical Examination section
        var vitalSignsText = BuildVitalSignsText(examination);
        var physExamText = (examination?.PhysicalExamination ?? "Khong ghi nhan") + "\n" + vitalSignsText;
        sections.Add(BuildTextSection(LoincPhysicalExam, "Kham lam sang", physExamText));

        // Vital Signs section (structured)
        if (examination != null)
            sections.Add(BuildVitalSignsSection(examination));

        // Diagnoses section
        var diagnosisText = BuildDiagnosisText(examination, medRecord);
        sections.Add(BuildCodedSection(LoincDiagnoses, "Chan doan",
            diagnosisText,
            examination?.MainIcdCode ?? medRecord?.MainIcdCode,
            examination?.MainDiagnosis ?? medRecord?.MainDiagnosis));

        // Hospital Course section
        var courseText = examination?.ConclusionNote ?? medRecord?.DischargeNote ?? "Khong ghi nhan";
        sections.Add(BuildTextSection(LoincHospitalCourse, "Dien bien dieu tri", courseText));

        // Discharge Medications section
        if (prescriptions.Any())
            sections.Add(BuildMedicationsSection(LoincDischargeMeds, "Thuoc khi ra vien", prescriptions));

        // Follow-up section
        var followUpText = examination?.FollowUpDate.HasValue == true
            ? $"Hen tai kham: {examination.FollowUpDate:dd/MM/yyyy}. {examination.TreatmentPlan ?? ""}"
            : "Khong hen tai kham";
        sections.Add(BuildTextSection(LoincPlan, "Ke hoach theo doi", followUpText));

        return BuildCdaDocument(patient, author, "18842-5", "Discharge Summary", sections).ToString();
    }

    private async Task<string> BuildLabReportAsync(Patient patient, GenerateCdaRequest request, User? author)
    {
        var labRequest = request.SourceEntityId.HasValue
            ? await _db.LabRequests.AsNoTracking()
                .Include(r => r.Items).ThenInclude(i => i.Results)
                .Include(r => r.RequestingDoctor)
                .FirstOrDefaultAsync(r => r.Id == request.SourceEntityId.Value)
            : request.MedicalRecordId.HasValue
                ? await _db.LabRequests.AsNoTracking()
                    .Include(r => r.Items).ThenInclude(i => i.Results)
                    .Include(r => r.RequestingDoctor)
                    .Where(r => r.MedicalRecordId == request.MedicalRecordId.Value && !r.IsDeleted)
                    .OrderByDescending(r => r.RequestDate)
                    .FirstOrDefaultAsync()
                : null;

        var sections = new List<XElement>();

        if (labRequest != null && labRequest.Items.Any())
        {
            // Build lab results table
            var tableRows = new List<XElement>();
            tableRows.Add(new XElement(Hl7 + "tr",
                new XElement(Hl7 + "th", "Xet nghiem"),
                new XElement(Hl7 + "th", "Ket qua"),
                new XElement(Hl7 + "th", "Don vi"),
                new XElement(Hl7 + "th", "Binh thuong"),
                new XElement(Hl7 + "th", "Bat thuong")));

            foreach (var item in labRequest.Items)
            {
                foreach (var result in item.Results.OrderBy(r => r.SequenceNumber))
                {
                    tableRows.Add(new XElement(Hl7 + "tr",
                        new XElement(Hl7 + "td", result.ParameterName),
                        new XElement(Hl7 + "td", result.ResultValue ?? result.TextResult ?? ""),
                        new XElement(Hl7 + "td", result.Unit ?? ""),
                        new XElement(Hl7 + "td", result.ReferenceRange ?? FormatRefRange(result.ReferenceMin, result.ReferenceMax)),
                        new XElement(Hl7 + "td", result.IsAbnormal ? (result.AbnormalType == 1 ? "Cao" : result.AbnormalType == 2 ? "Thap" : "Nguy hiem") : "Binh thuong")));
                }
            }

            var section = new XElement(Hl7 + "component",
                new XElement(Hl7 + "section",
                    new XElement(Hl7 + "code",
                        new XAttribute("code", LoincLabResults),
                        new XAttribute("codeSystem", OidLoinc),
                        new XAttribute("codeSystemName", "LOINC"),
                        new XAttribute("displayName", "Laboratory studies")),
                    new XElement(Hl7 + "title", "Ket qua xet nghiem"),
                    new XElement(Hl7 + "text",
                        new XElement(Hl7 + "table",
                            new XAttribute("border", "1"),
                            new XElement(Hl7 + "thead", tableRows[0]),
                            new XElement(Hl7 + "tbody", tableRows.Skip(1))))));

            sections.Add(section);

            // Clinical info section
            if (!string.IsNullOrEmpty(labRequest.ClinicalInfo))
                sections.Add(BuildTextSection(LoincHistory, "Thong tin lam sang", labRequest.ClinicalInfo));

            // Diagnosis section
            if (!string.IsNullOrEmpty(labRequest.DiagnosisName))
                sections.Add(BuildCodedSection(LoincDiagnoses, "Chan doan",
                    labRequest.DiagnosisName, labRequest.DiagnosisCode, labRequest.DiagnosisName));
        }
        else
        {
            sections.Add(BuildTextSection(LoincLabResults, "Ket qua xet nghiem", "Chua co ket qua"));
        }

        return BuildCdaDocument(patient, author, "11502-2", "Laboratory Report", sections).ToString();
    }

    private async Task<string> BuildRadiologyReportAsync(Patient patient, GenerateCdaRequest request, User? author)
    {
        RadiologyReport? report = null;
        RadiologyRequest? radRequest = null;

        if (request.SourceEntityId.HasValue)
        {
            // Try as RadiologyReport ID first
            report = await _db.RadiologyReports.AsNoTracking()
                .Include(r => r.RadiologyExam).ThenInclude(e => e.RadiologyRequest).ThenInclude(req => req.Service)
                .Include(r => r.Radiologist)
                .FirstOrDefaultAsync(r => r.Id == request.SourceEntityId.Value);

            if (report == null)
            {
                // Try as RadiologyRequest ID
                radRequest = await _db.RadiologyRequests.AsNoTracking()
                    .Include(r => r.Service)
                    .Include(r => r.Exams).ThenInclude(e => e.Report).ThenInclude(rp => rp!.Radiologist)
                    .FirstOrDefaultAsync(r => r.Id == request.SourceEntityId.Value);

                report = radRequest?.Exams.FirstOrDefault()?.Report;
            }
            else
            {
                radRequest = report.RadiologyExam?.RadiologyRequest;
            }
        }

        var sections = new List<XElement>();

        if (report != null)
        {
            // Findings section
            sections.Add(BuildTextSection(LoincRadiology, "Mo ta hinh anh",
                report.Findings ?? "Khong ghi nhan"));

            // Impression section
            sections.Add(BuildTextSection(LoincAssessment, "Ket luan",
                report.Impression ?? "Khong ghi nhan"));

            // Recommendations section
            if (!string.IsNullOrEmpty(report.Recommendations))
                sections.Add(BuildTextSection(LoincPlan, "De nghi", report.Recommendations));

            // Clinical info from request
            if (radRequest != null && !string.IsNullOrEmpty(radRequest.ClinicalInfo))
                sections.Add(BuildTextSection(LoincHistory, "Thong tin lam sang", radRequest.ClinicalInfo));
        }
        else
        {
            sections.Add(BuildTextSection(LoincRadiology, "Ket qua chan doan hinh anh", "Chua co ket qua"));
        }

        return BuildCdaDocument(patient, author, "18748-4", "Diagnostic Imaging Report", sections).ToString();
    }

    private async Task<string> BuildProgressNoteAsync(Patient patient, GenerateCdaRequest request, User? author)
    {
        // Try to find daily progress from inpatient admission or treatment sheet from examination
        DailyProgress? progress = null;
        Examination? examination = null;
        TreatmentSheet? treatmentSheet = null;

        if (request.SourceEntityId.HasValue)
        {
            // Try as DailyProgress
            progress = await _db.DailyProgresses.AsNoTracking()
                .Include(d => d.Doctor)
                .FirstOrDefaultAsync(d => d.Id == request.SourceEntityId.Value);

            if (progress == null)
            {
                // Try as TreatmentSheet
                treatmentSheet = await _db.TreatmentSheets.AsNoTracking()
                    .Include(t => t.Doctor)
                    .Include(t => t.Examination)
                    .FirstOrDefaultAsync(t => t.Id == request.SourceEntityId.Value);

                if (treatmentSheet == null)
                {
                    // Try as Examination
                    examination = await _db.Examinations.AsNoTracking()
                        .Include(e => e.Doctor)
                        .FirstOrDefaultAsync(e => e.Id == request.SourceEntityId.Value);
                }
            }
        }

        var sections = new List<XElement>();

        if (progress != null)
        {
            // SOAP format progress note
            if (!string.IsNullOrEmpty(progress.SubjectiveFindings))
                sections.Add(BuildTextSection(LoincChiefComplaint, "Chu quan (S)", progress.SubjectiveFindings));

            if (!string.IsNullOrEmpty(progress.ObjectiveFindings))
                sections.Add(BuildTextSection(LoincPhysicalExam, "Khach quan (O)", progress.ObjectiveFindings));

            if (!string.IsNullOrEmpty(progress.Assessment))
                sections.Add(BuildTextSection(LoincAssessment, "Danh gia (A)", progress.Assessment));

            if (!string.IsNullOrEmpty(progress.Plan))
                sections.Add(BuildTextSection(LoincPlan, "Ke hoach (P)", progress.Plan));

            if (!string.IsNullOrEmpty(progress.VitalSigns))
                sections.Add(BuildTextSection(LoincVitalSigns, "Dau hieu sinh ton", progress.VitalSigns));
        }
        else if (treatmentSheet != null)
        {
            sections.Add(BuildTextSection(LoincAssessment, "Tinh trang benh nhan",
                treatmentSheet.PatientCondition ?? "Khong ghi nhan"));
            sections.Add(BuildTextSection(LoincPlan, "Y lenh",
                treatmentSheet.DoctorOrders ?? "Khong ghi nhan"));
            if (!string.IsNullOrEmpty(treatmentSheet.NursingCare))
                sections.Add(BuildTextSection("46209-3", "Cham soc dieu duong", treatmentSheet.NursingCare));
        }
        else if (examination != null)
        {
            if (!string.IsNullOrEmpty(examination.ChiefComplaint))
                sections.Add(BuildTextSection(LoincChiefComplaint, "Ly do kham", examination.ChiefComplaint));
            if (!string.IsNullOrEmpty(examination.PhysicalExamination))
                sections.Add(BuildTextSection(LoincPhysicalExam, "Kham lam sang", examination.PhysicalExamination));
            if (!string.IsNullOrEmpty(examination.MainDiagnosis))
                sections.Add(BuildCodedSection(LoincDiagnoses, "Chan doan",
                    examination.MainDiagnosis, examination.MainIcdCode, examination.MainDiagnosis));
            if (!string.IsNullOrEmpty(examination.TreatmentPlan))
                sections.Add(BuildTextSection(LoincPlan, "Phuong huong dieu tri", examination.TreatmentPlan));

            sections.Add(BuildVitalSignsSection(examination));
        }
        else
        {
            sections.Add(BuildTextSection(LoincAssessment, "Phieu dieu tri", "Khong co du lieu"));
        }

        return BuildCdaDocument(patient, author, "11506-3", "Progress Note", sections).ToString();
    }

    private async Task<string> BuildConsultationNoteAsync(Patient patient, GenerateCdaRequest request, User? author)
    {
        ConsultationRecord? consultation = null;

        if (request.SourceEntityId.HasValue)
        {
            consultation = await _db.ConsultationRecords.AsNoTracking()
                .Include(c => c.PresidedBy)
                .Include(c => c.Secretary)
                .FirstOrDefaultAsync(c => c.Id == request.SourceEntityId.Value);
        }

        var sections = new List<XElement>();

        if (consultation != null)
        {
            // Reason for consultation
            sections.Add(BuildTextSection(LoincReasonForReferral, "Ly do hoi chan",
                consultation.Reason ?? "Khong ghi nhan"));

            // Summary
            if (!string.IsNullOrEmpty(consultation.Summary))
                sections.Add(BuildTextSection(LoincConsultationNote, "Tom tat benh an",
                    consultation.Summary));

            // Conclusion
            if (!string.IsNullOrEmpty(consultation.Conclusion))
                sections.Add(BuildTextSection(LoincAssessment, "Ket luan",
                    consultation.Conclusion));

            // Recommendations
            if (!string.IsNullOrEmpty(consultation.TreatmentPlan))
                sections.Add(BuildTextSection(LoincPlan, "Huong xu tri",
                    consultation.TreatmentPlan));

            // Participants info
            var participantText = "";
            if (consultation.PresidedBy != null)
                participantText += $"Chu tri: {consultation.PresidedBy.FullName}\n";
            if (consultation.Secretary != null)
                participantText += $"Thu ky: {consultation.Secretary.FullName}\n";
            if (!string.IsNullOrEmpty(participantText))
                sections.Add(BuildTextSection("10164-2", "Thanh phan tham du", participantText.TrimEnd()));
        }
        else
        {
            sections.Add(BuildTextSection(LoincConsultationNote, "Bien ban hoi chan", "Khong co du lieu"));
        }

        return BuildCdaDocument(patient, author, "11488-4", "Consultation Note", sections).ToString();
    }

    private async Task<string> BuildOperativeNoteAsync(Patient patient, GenerateCdaRequest request, User? author)
    {
        SurgeryRecord? record = null;
        SurgeryRequest? surgRequest = null;

        if (request.SourceEntityId.HasValue)
        {
            // Try as SurgeryRecord
            record = await _db.SurgeryRecords.AsNoTracking()
                .Include(r => r.SurgerySchedule).ThenInclude(s => s.SurgeryRequest)
                .Include(r => r.SurgerySchedule).ThenInclude(s => s.Surgeon)
                .Include(r => r.SurgerySchedule).ThenInclude(s => s.Anesthesiologist)
                .Include(r => r.TeamMembers)
                .FirstOrDefaultAsync(r => r.Id == request.SourceEntityId.Value);

            if (record == null)
            {
                // Try as SurgeryRequest
                surgRequest = await _db.SurgeryRequests.AsNoTracking()
                    .Include(r => r.Schedules).ThenInclude(s => s.SurgeryRecord)
                    .Include(r => r.Schedules).ThenInclude(s => s.Surgeon)
                    .Include(r => r.RequestingDoctor)
                    .FirstOrDefaultAsync(r => r.Id == request.SourceEntityId.Value);

                record = surgRequest?.Schedules.FirstOrDefault()?.SurgeryRecord;
            }

            surgRequest ??= record?.SurgerySchedule?.SurgeryRequest;
        }

        var sections = new List<XElement>();

        // Preoperative Diagnosis
        var preopDx = surgRequest?.PreOpDiagnosis ?? "Khong ghi nhan";
        sections.Add(BuildCodedSection(LoincPreopDiagnosis, "Chan doan truoc mo",
            preopDx, surgRequest?.PreOpIcdCode, preopDx));

        // Procedure performed
        var procedureText = record?.ProcedurePerformed ?? surgRequest?.PlannedProcedure ?? "Khong ghi nhan";
        sections.Add(BuildTextSection(LoincProcedures, "Phuong phap phau thuat", procedureText));

        // Operative Findings
        if (record != null)
        {
            sections.Add(BuildTextSection(LoincOperativeFindings, "Mo ta qua trinh",
                record.Findings ?? "Khong ghi nhan"));

            // Postoperative Diagnosis
            if (!string.IsNullOrEmpty(record.PostOpDiagnosis))
                sections.Add(BuildCodedSection(LoincPostopDiagnosis, "Chan doan sau mo",
                    record.PostOpDiagnosis, record.PostOpIcdCode, record.PostOpDiagnosis));

            // Complications
            if (!string.IsNullOrEmpty(record.Complications))
                sections.Add(BuildTextSection("55109-3", "Bien chung", record.Complications));

            // Post-op instructions
            if (!string.IsNullOrEmpty(record.PostOpInstructions))
                sections.Add(BuildTextSection(LoincPlan, "Huong dan sau mo", record.PostOpInstructions));

            // Blood loss
            if (record.BloodLoss.HasValue)
                sections.Add(BuildTextSection("55111-9", "Mat mau",
                    $"{record.BloodLoss.Value} ml"));

            // Duration
            if (record.ActualStartTime.HasValue && record.ActualEndTime.HasValue)
                sections.Add(BuildTextSection("55112-7", "Thoi gian phau thuat",
                    $"Bat dau: {record.ActualStartTime:HH:mm dd/MM/yyyy}, Ket thuc: {record.ActualEndTime:HH:mm dd/MM/yyyy}, " +
                    $"Thoi gian: {record.ActualDuration ?? (int)(record.ActualEndTime.Value - record.ActualStartTime.Value).TotalMinutes} phut"));
        }
        else
        {
            sections.Add(BuildTextSection(LoincOperativeFindings, "Ket qua phau thuat", "Chua thuc hien"));
        }

        return BuildCdaDocument(patient, author, "11504-8", "Operative Note", sections).ToString();
    }

    private async Task<string> BuildReferralNoteAsync(Patient patient, GenerateCdaRequest request, User? author)
    {
        Examination? examination = null;
        MedicalRecord? medRecord = null;

        if (request.SourceEntityId.HasValue)
        {
            examination = await _db.Examinations.AsNoTracking()
                .Include(e => e.MedicalRecord)
                .Include(e => e.Doctor)
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.Id == request.SourceEntityId.Value);
        }

        medRecord = examination?.MedicalRecord
            ?? (request.MedicalRecordId.HasValue
                ? await _db.MedicalRecords.AsNoTracking().Include(m => m.Doctor).FirstOrDefaultAsync(m => m.Id == request.MedicalRecordId.Value)
                : null);

        // Get recent prescriptions for treatment summary
        var prescriptions = request.MedicalRecordId.HasValue
            ? await _db.Prescriptions.AsNoTracking()
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Where(p => p.MedicalRecordId == request.MedicalRecordId.Value && !p.IsDeleted)
                .OrderByDescending(p => p.PrescriptionDate)
                .Take(3)
                .ToListAsync()
            : new List<Prescription>();

        var sections = new List<XElement>();

        // Reason for referral
        var reason = examination?.ConclusionNote ?? "Chuyen vien de dieu tri tiep";
        sections.Add(BuildTextSection(LoincReasonForReferral, "Ly do chuyen vien", reason));

        // Diagnoses
        var diagText = BuildDiagnosisText(examination, medRecord);
        sections.Add(BuildCodedSection(LoincDiagnoses, "Chan doan",
            diagText,
            examination?.MainIcdCode ?? medRecord?.MainIcdCode,
            examination?.MainDiagnosis ?? medRecord?.MainDiagnosis));

        // Treatment summary
        var treatmentLines = new List<string>();
        if (!string.IsNullOrEmpty(examination?.TreatmentPlan))
            treatmentLines.Add($"Phuong huong dieu tri: {examination.TreatmentPlan}");
        foreach (var rx in prescriptions)
        {
            var meds = string.Join(", ", rx.Details.Select(d => $"{d.Medicine?.MedicineName ?? "?"} {d.Dosage ?? ""} x{d.Quantity}"));
            treatmentLines.Add($"Don thuoc ({rx.PrescriptionDate:dd/MM/yyyy}): {meds}");
        }
        if (treatmentLines.Any())
            sections.Add(BuildTextSection(LoincHospitalCourse, "Tom tat dieu tri", string.Join("\n", treatmentLines)));

        // History
        if (!string.IsNullOrEmpty(examination?.PresentIllness))
            sections.Add(BuildTextSection(LoincHistory, "Benh su", examination.PresentIllness));

        // Vital signs at referral
        if (examination != null)
            sections.Add(BuildVitalSignsSection(examination));

        return BuildCdaDocument(patient, author, "34133-9", "Referral Note", sections).ToString();
    }

    private async Task<string> BuildPrescriptionDocumentAsync(Patient patient, GenerateCdaRequest request, User? author)
    {
        Prescription? prescription = null;

        if (request.SourceEntityId.HasValue)
        {
            prescription = await _db.Prescriptions.AsNoTracking()
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .FirstOrDefaultAsync(p => p.Id == request.SourceEntityId.Value);
        }

        if (prescription == null && request.MedicalRecordId.HasValue)
        {
            prescription = await _db.Prescriptions.AsNoTracking()
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Where(p => p.MedicalRecordId == request.MedicalRecordId.Value && !p.IsDeleted)
                .OrderByDescending(p => p.PrescriptionDate)
                .FirstOrDefaultAsync();
        }

        var sections = new List<XElement>();

        if (prescription != null)
        {
            // Diagnosis section
            if (!string.IsNullOrEmpty(prescription.Diagnosis))
                sections.Add(BuildCodedSection(LoincDiagnoses, "Chan doan",
                    prescription.DiagnosisName ?? prescription.Diagnosis,
                    prescription.DiagnosisCode ?? prescription.IcdCode,
                    prescription.DiagnosisName ?? prescription.Diagnosis));

            // Medications section with detail table
            sections.Add(BuildMedicationsSection(LoincMedications, "Don thuoc",
                new List<Prescription> { prescription }));

            // Instructions
            if (!string.IsNullOrEmpty(prescription.Note))
                sections.Add(BuildTextSection(LoincPlan, "Loi dan", prescription.Note));

            if (!string.IsNullOrEmpty(prescription.Instructions))
                sections.Add(BuildTextSection("69730-0", "Huong dan su dung", prescription.Instructions));
        }
        else
        {
            sections.Add(BuildTextSection(LoincMedications, "Don thuoc", "Khong co don thuoc"));
        }

        return BuildCdaDocument(patient, author, "57833-6", "Prescription Document", sections).ToString();
    }

    // ======================== CDA XML Structure Builders ========================

    private XDocument BuildCdaDocument(Patient patient, User? author, string docTypeCode, string docTypeDisplayName, List<XElement> sections)
    {
        var now = DateTime.UtcNow;
        var docId = $"{OidRoot}.{Guid.NewGuid():N}";

        var doc = new XDocument(
            new XDeclaration("1.0", "UTF-8", null),
            new XProcessingInstruction("xml-stylesheet", "type=\"text/xsl\" href=\"CDA.xsl\""),
            new XElement(Hl7 + "ClinicalDocument",
                new XAttribute(XNamespace.Xmlns + "xsi", Xsi.NamespaceName),
                new XAttribute("xmlns", Hl7.NamespaceName),
                new XAttribute(Xsi + "schemaLocation", "urn:hl7-org:v3 CDA.xsd"),

                // CDA R2 Header - Required elements

                // realmCode - Vietnam
                new XElement(Hl7 + "realmCode", new XAttribute("code", "VN")),

                // typeId - Fixed for CDA R2
                new XElement(Hl7 + "typeId",
                    new XAttribute("root", "2.16.840.1.113883.1.3"),
                    new XAttribute("extension", "POCD_HD000040")),

                // templateId - CDA R2 General Header Constraints
                new XElement(Hl7 + "templateId",
                    new XAttribute("root", "2.16.840.1.113883.10.20.22.1.1")),

                // Document ID
                new XElement(Hl7 + "id",
                    new XAttribute("root", OidRoot),
                    new XAttribute("extension", docId)),

                // Document type code (LOINC)
                new XElement(Hl7 + "code",
                    new XAttribute("code", docTypeCode),
                    new XAttribute("codeSystem", OidLoinc),
                    new XAttribute("codeSystemName", "LOINC"),
                    new XAttribute("displayName", docTypeDisplayName)),

                // Title
                new XElement(Hl7 + "title", docTypeDisplayName),

                // Effective time
                new XElement(Hl7 + "effectiveTime",
                    new XAttribute("value", now.ToString("yyyyMMddHHmmsszzz").Replace(":", ""))),

                // Confidentiality code
                new XElement(Hl7 + "confidentialityCode",
                    new XAttribute("code", "N"),
                    new XAttribute("codeSystem", "2.16.840.1.113883.5.25"),
                    new XAttribute("codeSystemName", "Confidentiality"),
                    new XAttribute("displayName", "Normal")),

                // Language code
                new XElement(Hl7 + "languageCode",
                    new XAttribute("code", "vi-VN")),

                // Record Target (Patient)
                BuildRecordTarget(patient),

                // Author
                BuildAuthor(author, now),

                // Custodian (Hospital)
                BuildCustodian(),

                // Document body with sections
                new XElement(Hl7 + "component",
                    new XElement(Hl7 + "structuredBody",
                        sections.ToArray()))));

        return doc;
    }

    private XElement BuildRecordTarget(Patient patient)
    {
        var genderCode = patient.Gender switch
        {
            1 => "M",
            2 => "F",
            _ => "UN"
        };

        var patientRole = new XElement(Hl7 + "patientRole",
            // Patient ID
            new XElement(Hl7 + "id",
                new XAttribute("root", OidRoot),
                new XAttribute("extension", patient.PatientCode)),

            // Address
            new XElement(Hl7 + "addr",
                new XAttribute("use", "HP"),
                new XElement(Hl7 + "streetAddressLine", patient.Address ?? ""),
                new XElement(Hl7 + "city", patient.ProvinceName ?? ""),
                new XElement(Hl7 + "state", patient.DistrictName ?? ""),
                new XElement(Hl7 + "country", "VN")),

            // Phone
            new XElement(Hl7 + "telecom",
                new XAttribute("value", $"tel:{patient.PhoneNumber ?? ""}"),
                new XAttribute("use", "HP")));

        // Email
        if (!string.IsNullOrEmpty(patient.Email))
        {
            patientRole.Add(new XElement(Hl7 + "telecom",
                new XAttribute("value", $"mailto:{patient.Email}"),
                new XAttribute("use", "HP")));
        }

        // Patient demographics
        var patientEl = new XElement(Hl7 + "patient",
            new XElement(Hl7 + "name",
                new XAttribute("use", "L"),
                new XElement(Hl7 + "given", patient.FullName)),
            new XElement(Hl7 + "administrativeGenderCode",
                new XAttribute("code", genderCode),
                new XAttribute("codeSystem", "2.16.840.1.113883.5.1"),
                new XAttribute("displayName", patient.Gender == 1 ? "Male" : patient.Gender == 2 ? "Female" : "Undifferentiated")));

        // Birth time
        if (patient.DateOfBirth.HasValue)
        {
            patientEl.Add(new XElement(Hl7 + "birthTime",
                new XAttribute("value", patient.DateOfBirth.Value.ToString("yyyyMMdd"))));
        }
        else if (patient.YearOfBirth.HasValue)
        {
            patientEl.Add(new XElement(Hl7 + "birthTime",
                new XAttribute("value", patient.YearOfBirth.Value.ToString())));
        }

        // Ethnic group
        if (!string.IsNullOrEmpty(patient.EthnicName))
        {
            patientEl.Add(new XElement(Hl7 + "ethnicGroupCode",
                new XAttribute("code", patient.EthnicCode ?? ""),
                new XAttribute("displayName", patient.EthnicName)));
        }

        // Guardian (for pediatric patients)
        if (!string.IsNullOrEmpty(patient.GuardianName))
        {
            patientEl.Add(new XElement(Hl7 + "guardian",
                new XElement(Hl7 + "guardianPerson",
                    new XElement(Hl7 + "name",
                        new XElement(Hl7 + "given", patient.GuardianName))),
                !string.IsNullOrEmpty(patient.GuardianPhone)
                    ? new XElement(Hl7 + "telecom",
                        new XAttribute("value", $"tel:{patient.GuardianPhone}"))
                    : null!));
        }

        // Identity number (CCCD)
        if (!string.IsNullOrEmpty(patient.IdentityNumber))
        {
            patientRole.Add(new XElement(Hl7 + "id",
                new XAttribute("root", "2.16.840.1.113883.2.24.1.2"), // Vietnam CCCD OID
                new XAttribute("extension", patient.IdentityNumber)));
        }

        // Insurance number
        if (!string.IsNullOrEmpty(patient.InsuranceNumber))
        {
            patientRole.Add(new XElement(Hl7 + "id",
                new XAttribute("root", "2.16.840.1.113883.2.24.1.3"), // Vietnam BHYT OID
                new XAttribute("extension", patient.InsuranceNumber)));
        }

        patientRole.Add(patientEl);

        return new XElement(Hl7 + "recordTarget", patientRole);
    }

    private XElement BuildAuthor(User? author, DateTime now)
    {
        return new XElement(Hl7 + "author",
            new XElement(Hl7 + "time",
                new XAttribute("value", now.ToString("yyyyMMddHHmmss"))),
            new XElement(Hl7 + "assignedAuthor",
                new XElement(Hl7 + "id",
                    new XAttribute("root", OidRoot),
                    new XAttribute("extension", author?.EmployeeCode ?? author?.Username ?? "system")),
                new XElement(Hl7 + "assignedPerson",
                    new XElement(Hl7 + "name",
                        new XElement(Hl7 + "given", author?.FullName ?? "He thong"))),
                author?.DepartmentId.HasValue == true
                    ? new XElement(Hl7 + "representedOrganization",
                        new XElement(Hl7 + "name", author.Department?.DepartmentName ?? ""))
                    : null!));
    }

    private static XElement BuildCustodian()
    {
        return new XElement(Hl7 + "custodian",
            new XElement(Hl7 + "assignedCustodian",
                new XElement(Hl7 + "representedCustodianOrganization",
                    new XElement(Hl7 + "id",
                        new XAttribute("root", OidRoot)),
                    new XElement(Hl7 + "name", "Benh vien"),
                    new XElement(Hl7 + "telecom",
                        new XAttribute("value", "tel:"),
                        new XAttribute("use", "WP")),
                    new XElement(Hl7 + "addr",
                        new XAttribute("use", "WP"),
                        new XElement(Hl7 + "country", "VN")))));
    }

    // ======================== Section Builder Helpers ========================

    private static XElement BuildTextSection(string loincCode, string title, string textContent)
    {
        return new XElement(Hl7 + "component",
            new XElement(Hl7 + "section",
                new XElement(Hl7 + "code",
                    new XAttribute("code", loincCode),
                    new XAttribute("codeSystem", OidLoinc),
                    new XAttribute("codeSystemName", "LOINC")),
                new XElement(Hl7 + "title", title),
                new XElement(Hl7 + "text",
                    textContent.Contains('\n')
                        ? new XElement(Hl7 + "list",
                            textContent.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                                .Select(line => new XElement(Hl7 + "item", line.Trim()))
                                .ToArray())
                        : (object)textContent)));
    }

    private static XElement BuildCodedSection(string loincCode, string title, string textContent,
        string? icdCode, string? icdDisplay)
    {
        var section = new XElement(Hl7 + "section",
            new XElement(Hl7 + "code",
                new XAttribute("code", loincCode),
                new XAttribute("codeSystem", OidLoinc),
                new XAttribute("codeSystemName", "LOINC")),
            new XElement(Hl7 + "title", title),
            new XElement(Hl7 + "text", textContent));

        // Add coded entry for ICD-10 diagnosis
        if (!string.IsNullOrEmpty(icdCode))
        {
            section.Add(new XElement(Hl7 + "entry",
                new XAttribute("typeCode", "DRIV"),
                new XElement(Hl7 + "observation",
                    new XAttribute("classCode", "OBS"),
                    new XAttribute("moodCode", "EVN"),
                    new XElement(Hl7 + "code",
                        new XAttribute("code", icdCode),
                        new XAttribute("codeSystem", OidIcd10),
                        new XAttribute("codeSystemName", "ICD-10"),
                        new XAttribute("displayName", icdDisplay ?? icdCode)),
                    new XElement(Hl7 + "statusCode",
                        new XAttribute("code", "completed")))));
        }

        return new XElement(Hl7 + "component", section);
    }

    private static XElement BuildVitalSignsSection(Examination examination)
    {
        var vitalEntries = new List<XElement>();

        void AddVital(string code, string name, string? value, string unit)
        {
            if (value == null) return;
            vitalEntries.Add(new XElement(Hl7 + "component",
                new XElement(Hl7 + "observation",
                    new XAttribute("classCode", "OBS"),
                    new XAttribute("moodCode", "EVN"),
                    new XElement(Hl7 + "code",
                        new XAttribute("code", code),
                        new XAttribute("codeSystem", OidLoinc),
                        new XAttribute("displayName", name)),
                    new XElement(Hl7 + "value",
                        new XAttribute(Xsi + "type", "PQ"),
                        new XAttribute("value", value),
                        new XAttribute("unit", unit)))));
        }

        AddVital("8310-5", "Body temperature", examination.Temperature?.ToString("F1"), "Cel");
        AddVital("8867-4", "Heart rate", examination.Pulse?.ToString(), "/min");
        AddVital("8480-6", "Systolic blood pressure", examination.BloodPressureSystolic?.ToString(), "mm[Hg]");
        AddVital("8462-4", "Diastolic blood pressure", examination.BloodPressureDiastolic?.ToString(), "mm[Hg]");
        AddVital("9279-1", "Respiratory rate", examination.RespiratoryRate?.ToString(), "/min");
        AddVital("8302-2", "Body height", examination.Height?.ToString("F1"), "cm");
        AddVital("29463-7", "Body weight", examination.Weight?.ToString("F1"), "kg");
        AddVital("2708-6", "SpO2", examination.SpO2?.ToString("F1"), "%");
        AddVital("39156-5", "BMI", examination.BMI?.ToString("F1"), "kg/m2");

        var textContent = BuildVitalSignsText(examination);

        var section = new XElement(Hl7 + "section",
            new XElement(Hl7 + "code",
                new XAttribute("code", LoincVitalSigns),
                new XAttribute("codeSystem", OidLoinc),
                new XAttribute("codeSystemName", "LOINC"),
                new XAttribute("displayName", "Vital Signs")),
            new XElement(Hl7 + "title", "Dau hieu sinh ton"),
            new XElement(Hl7 + "text", textContent));

        if (vitalEntries.Any())
        {
            section.Add(new XElement(Hl7 + "entry",
                new XAttribute("typeCode", "DRIV"),
                new XElement(Hl7 + "organizer",
                    new XAttribute("classCode", "CLUSTER"),
                    new XAttribute("moodCode", "EVN"),
                    new XElement(Hl7 + "statusCode",
                        new XAttribute("code", "completed")),
                    vitalEntries.ToArray())));
        }

        return new XElement(Hl7 + "component", section);
    }

    private static XElement BuildMedicationsSection(string loincCode, string title, List<Prescription> prescriptions)
    {
        var rows = new List<XElement>();
        rows.Add(new XElement(Hl7 + "tr",
            new XElement(Hl7 + "th", "Thuoc"),
            new XElement(Hl7 + "th", "Lieu dung"),
            new XElement(Hl7 + "th", "Duong dung"),
            new XElement(Hl7 + "th", "Tan suat"),
            new XElement(Hl7 + "th", "So ngay"),
            new XElement(Hl7 + "th", "So luong")));

        var entries = new List<XElement>();

        foreach (var rx in prescriptions)
        {
            foreach (var detail in rx.Details)
            {
                var medName = detail.Medicine?.MedicineName ?? "?";
                rows.Add(new XElement(Hl7 + "tr",
                    new XElement(Hl7 + "td", medName),
                    new XElement(Hl7 + "td", detail.Dosage ?? ""),
                    new XElement(Hl7 + "td", detail.Route ?? ""),
                    new XElement(Hl7 + "td", detail.Frequency ?? ""),
                    new XElement(Hl7 + "td", detail.Days.ToString()),
                    new XElement(Hl7 + "td", detail.Quantity.ToString("F0"))));

                // Coded medication entry
                entries.Add(new XElement(Hl7 + "entry",
                    new XAttribute("typeCode", "DRIV"),
                    new XElement(Hl7 + "substanceAdministration",
                        new XAttribute("classCode", "SBADM"),
                        new XAttribute("moodCode", "INT"),
                        new XElement(Hl7 + "statusCode",
                            new XAttribute("code", "completed")),
                        !string.IsNullOrEmpty(detail.Route)
                            ? new XElement(Hl7 + "routeCode",
                                new XAttribute("displayName", detail.Route))
                            : null!,
                        new XElement(Hl7 + "doseQuantity",
                            new XAttribute("value", detail.Quantity.ToString("F0")),
                            new XAttribute("unit", detail.Unit ?? "")),
                        new XElement(Hl7 + "consumable",
                            new XElement(Hl7 + "manufacturedProduct",
                                new XElement(Hl7 + "manufacturedMaterial",
                                    new XElement(Hl7 + "name", medName)))))));
            }
        }

        var section = new XElement(Hl7 + "section",
            new XElement(Hl7 + "code",
                new XAttribute("code", loincCode),
                new XAttribute("codeSystem", OidLoinc),
                new XAttribute("codeSystemName", "LOINC")),
            new XElement(Hl7 + "title", title),
            new XElement(Hl7 + "text",
                new XElement(Hl7 + "table",
                    new XAttribute("border", "1"),
                    new XElement(Hl7 + "thead", rows[0]),
                    new XElement(Hl7 + "tbody", rows.Skip(1)))));

        foreach (var entry in entries)
            section.Add(entry);

        return new XElement(Hl7 + "component", section);
    }

    // ======================== Utility Helpers ========================

    private static string BuildVitalSignsText(Examination? examination)
    {
        if (examination == null) return "Khong ghi nhan";

        var parts = new List<string>();
        if (examination.Temperature.HasValue) parts.Add($"Nhiet do: {examination.Temperature:F1} C");
        if (examination.Pulse.HasValue) parts.Add($"Mach: {examination.Pulse}/phut");
        if (examination.BloodPressureSystolic.HasValue && examination.BloodPressureDiastolic.HasValue)
            parts.Add($"Huyet ap: {examination.BloodPressureSystolic}/{examination.BloodPressureDiastolic} mmHg");
        if (examination.RespiratoryRate.HasValue) parts.Add($"Nhip tho: {examination.RespiratoryRate}/phut");
        if (examination.Height.HasValue) parts.Add($"Chieu cao: {examination.Height:F1} cm");
        if (examination.Weight.HasValue) parts.Add($"Can nang: {examination.Weight:F1} kg");
        if (examination.SpO2.HasValue) parts.Add($"SpO2: {examination.SpO2:F1}%");
        if (examination.BMI.HasValue) parts.Add($"BMI: {examination.BMI:F1}");

        return parts.Any() ? string.Join(", ", parts) : "Khong ghi nhan";
    }

    private static string BuildDiagnosisText(Examination? examination, MedicalRecord? medRecord)
    {
        var lines = new List<string>();

        var mainDx = examination?.MainDiagnosis ?? medRecord?.MainDiagnosis;
        var mainCode = examination?.MainIcdCode ?? medRecord?.MainIcdCode;
        if (!string.IsNullOrEmpty(mainDx))
            lines.Add($"Chan doan chinh: {mainDx}" + (!string.IsNullOrEmpty(mainCode) ? $" ({mainCode})" : ""));

        var subDx = examination?.SubDiagnosis ?? medRecord?.SubDiagnosis;
        if (!string.IsNullOrEmpty(subDx))
            lines.Add($"Chan doan phu: {subDx}");

        var initDx = examination?.InitialDiagnosis ?? medRecord?.InitialDiagnosis;
        if (!string.IsNullOrEmpty(initDx) && initDx != mainDx)
            lines.Add($"Chan doan ban dau: {initDx}");

        return lines.Any() ? string.Join("\n", lines) : "Chua chan doan";
    }

    private static string FormatRefRange(decimal? min, decimal? max)
    {
        if (min.HasValue && max.HasValue) return $"{min:F2} - {max:F2}";
        if (min.HasValue) return $">= {min:F2}";
        if (max.HasValue) return $"<= {max:F2}";
        return "";
    }

    private static string GetDocumentTypeName(CdaDocumentType type) => type switch
    {
        CdaDocumentType.DischargeSummary => "Tom tat benh an",
        CdaDocumentType.LabReport => "Ket qua xet nghiem",
        CdaDocumentType.RadiologyReport => "Ket qua CDHA",
        CdaDocumentType.ProgressNote => "Phieu dieu tri",
        CdaDocumentType.ConsultationNote => "Bien ban hoi chan",
        CdaDocumentType.OperativeNote => "Phieu phau thuat",
        CdaDocumentType.ReferralNote => "Giay chuyen vien",
        CdaDocumentType.PrescriptionDocument => "Don thuoc",
        _ => "Khong xac dinh"
    };

    private static CdaDocumentDto MapToDto(CdaDocument entity, string patientName, string? createdByName)
    {
        return new CdaDocumentDto
        {
            Id = entity.Id,
            DocumentId = entity.DocumentId,
            DocumentType = (CdaDocumentType)entity.DocumentType,
            DocumentTypeName = GetDocumentTypeName((CdaDocumentType)entity.DocumentType),
            PatientId = entity.PatientId,
            PatientName = patientName,
            MedicalRecordId = entity.MedicalRecordId,
            SourceEntityId = entity.SourceEntityId,
            CdaXml = entity.CdaXml,
            Status = entity.Status,
            IsSigned = entity.IsSigned,
            SignedByName = entity.SignedByUser?.FullName,
            SignedAt = entity.SignedAt,
            CreatedAt = entity.CreatedAt,
            CreatedByName = createdByName,
            ValidationErrors = entity.ValidationErrors
        };
    }
}
