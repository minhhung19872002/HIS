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
public partial class CdaDocumentService : ICdaDocumentService
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
