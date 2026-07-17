using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.CDA;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class CdaDocumentService
{
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
        // #14e: model 1 ServiceRequest + SRD + chỉ số con (model 2 LabRequests/LabResults đã gỡ)
        var labRequest = request.SourceEntityId.HasValue
            ? await _db.ServiceRequests.AsNoTracking()
                .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
                .Include(r => r.Doctor)
                .FirstOrDefaultAsync(r => r.Id == request.SourceEntityId.Value && r.RequestType == 1)
            : request.MedicalRecordId.HasValue
                ? await _db.ServiceRequests.AsNoTracking()
                    .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
                    .Include(r => r.Doctor)
                    .Where(r => r.MedicalRecordId == request.MedicalRecordId.Value && !r.IsDeleted && r.RequestType == 1)
                    .OrderByDescending(r => r.RequestDate)
                    .FirstOrDefaultAsync()
                : null;

        var sections = new List<XElement>();

        if (labRequest != null && labRequest.Details.Any())
        {
            var detailIds = labRequest.Details.Select(d => d.Id).ToList();
            var paramsByDetail = (await _db.ServiceRequestDetailParameters.AsNoTracking()
                    .Where(p => detailIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted)
                    .OrderBy(p => p.SequenceNumber)
                    .ToListAsync())
                .GroupBy(p => p.ServiceRequestDetailId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Build lab results table
            var tableRows = new List<XElement>();
            tableRows.Add(new XElement(Hl7 + "tr",
                new XElement(Hl7 + "th", "Xet nghiem"),
                new XElement(Hl7 + "th", "Ket qua"),
                new XElement(Hl7 + "th", "Don vi"),
                new XElement(Hl7 + "th", "Binh thuong"),
                new XElement(Hl7 + "th", "Bat thuong")));

            foreach (var item in labRequest.Details)
            {
                if (paramsByDetail.TryGetValue(item.Id, out var ps))
                {
                    foreach (var result in ps)
                    {
                        var abnormalType = LabFlagEvaluator.FlagToAbnormalType(result.Flag);
                        tableRows.Add(new XElement(Hl7 + "tr",
                            new XElement(Hl7 + "td", result.ParameterName),
                            new XElement(Hl7 + "td", result.Value ?? ""),
                            new XElement(Hl7 + "td", result.Unit ?? ""),
                            new XElement(Hl7 + "td", result.ReferenceRange ?? FormatRefRange(result.ReferenceMin, result.ReferenceMax)),
                            new XElement(Hl7 + "td", abnormalType.HasValue ? (abnormalType == 1 ? "Cao" : abnormalType == 2 ? "Thap" : "Nguy hiem") : "Binh thuong")));
                    }
                }
                else if (item.Result != null)
                {
                    tableRows.Add(new XElement(Hl7 + "tr",
                        new XElement(Hl7 + "td", item.Service?.ServiceName ?? ""),
                        new XElement(Hl7 + "td", item.Result),
                        new XElement(Hl7 + "td", ""),
                        new XElement(Hl7 + "td", ""),
                        new XElement(Hl7 + "td", "")));
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
            if (!string.IsNullOrEmpty(labRequest.Notes ?? labRequest.Note))
                sections.Add(BuildTextSection(LoincHistory, "Thong tin lam sang", labRequest.Notes ?? labRequest.Note!));

            // Diagnosis section
            if (!string.IsNullOrEmpty(labRequest.Diagnosis))
                sections.Add(BuildCodedSection(LoincDiagnoses, "Chan doan",
                    labRequest.Diagnosis, labRequest.IcdCode, labRequest.Diagnosis));
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
}
