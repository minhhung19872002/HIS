using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Service sinh HTML cho bieu mau EMR, tra ve byte[] (UTF-8 encoded HTML)
/// Browser se mo HTML va dung native print dialog de in
/// </summary>
public class PdfGenerationService : IPdfGenerationService
{
    private readonly HISDbContext _db;

    public PdfGenerationService(HISDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Sinh HTML bieu mau EMR theo examinationId va formType
    /// </summary>
    public async Task<byte[]> GenerateEmrPdfAsync(Guid examinationId, string formType)
    {
        var exam = await _db.Examinations
            .Include(e => e.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .Include(e => e.MedicalRecord)
                .ThenInclude(m => m.Department)
            .Include(e => e.Doctor)
            .Include(e => e.Room)
            .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted);

        if (exam == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("L\u1ED7i", "<p>Kh\u00F4ng t\u00ECm th\u1EA5y l\u01B0\u1EE3t kh\u00E1m</p>"));

        var patient = exam.MedicalRecord?.Patient;
        var mr = exam.MedicalRecord;

        string html;

        switch (formType?.ToLower())
        {
            case "summary":
                html = GetMedicalRecordSummary(
                    patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
                    patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
                    mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
                    mr?.AdmissionDate, mr?.DischargeDate,
                    exam.ChiefComplaint, exam.PresentIllness,
                    patient?.MedicalHistory, patient?.FamilyHistory,
                    exam.PhysicalExamination, exam.SystemsReview,
                    exam.MainDiagnosis ?? mr?.MainDiagnosis, exam.MainIcdCode ?? mr?.MainIcdCode,
                    exam.SubDiagnosis ?? mr?.SubDiagnosis, exam.TreatmentPlan,
                    mr?.TreatmentResult, exam.ConclusionNote,
                    exam.Doctor?.FullName, null);
                break;

            case "treatment":
                var sheets = await _db.TreatmentSheets
                    .Where(t => t.ExaminationId == examinationId && !t.IsDeleted)
                    .OrderBy(t => t.TreatmentDate)
                    .ToListAsync();

                var treatmentRows = new List<TreatmentSheetRow>();
                foreach (var s in sheets)
                {
                    var doctor = s.DoctorId.HasValue
                        ? await _db.Users.FirstOrDefaultAsync(u => u.Id == s.DoctorId.Value)
                        : null;
                    treatmentRows.Add(new TreatmentSheetRow
                    {
                        Date = s.TreatmentDate,
                        DayNumber = s.Day,
                        Progress = s.PatientCondition,
                        Orders = s.DoctorOrders,
                        DoctorName = doctor?.FullName
                    });
                }

                html = GetTreatmentSheet(
                    patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
                    patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
                    mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
                    exam.MainDiagnosis ?? mr?.MainDiagnosis, exam.MainIcdCode ?? mr?.MainIcdCode,
                    treatmentRows, exam.Doctor?.FullName);
                break;

            case "consultation":
                var consultations = await _db.ConsultationRecords
                    .Where(c => c.ExaminationId == examinationId && !c.IsDeleted)
                    .OrderByDescending(c => c.ConsultationDate)
                    .FirstOrDefaultAsync();

                if (consultations == null)
                {
                    html = GetGenericForm("BI\u00CAN B\u1EA2N H\u1ED8I CH\u1EA8N", "MS. 03/BV",
                        patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
                        patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
                        mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
                        "<p><i>Ch\u01B0a c\u00F3 bi\u00EAn b\u1EA3n h\u1ED9i ch\u1EA9n</i></p>");
                }
                else
                {
                    var chairman = consultations.PresidedByUserId.HasValue
                        ? await _db.Users.FirstOrDefaultAsync(u => u.Id == consultations.PresidedByUserId.Value)
                        : null;
                    var secretary = consultations.SecretaryUserId.HasValue
                        ? await _db.Users.FirstOrDefaultAsync(u => u.Id == consultations.SecretaryUserId.Value)
                        : null;

                    html = GetConsultationMinutes(
                        patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
                        patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
                        mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
                        consultations.ConsultationDate, consultations.Reason,
                        consultations.Summary, consultations.Conclusion,
                        consultations.TreatmentPlan, consultations.Participants,
                        chairman?.FullName, secretary?.FullName);
                }
                break;

            case "nursing":
                var nursingSheets = await _db.NursingCareSheets
                    .Where(n => n.ExaminationId == examinationId && !n.IsDeleted)
                    .OrderBy(n => n.CareDate)
                    .ToListAsync();

                var nursingRows = new List<NursingCareRow>();
                foreach (var n in nursingSheets)
                {
                    var nurse = n.NurseId.HasValue
                        ? await _db.Users.FirstOrDefaultAsync(u => u.Id == n.NurseId.Value)
                        : null;
                    nursingRows.Add(new NursingCareRow
                    {
                        Date = n.CareDate,
                        Shift = n.CareTime.HasValue ? (n.CareTime.Value.Hours < 12 ? 1 : n.CareTime.Value.Hours < 18 ? 2 : 3) : 1,
                        PatientCondition = n.Notes,
                        NursingDiagnosis = n.NursingDiagnosis,
                        Interventions = n.NursingInterventions,
                        PatientResponse = n.PatientResponse,
                        NurseName = nurse?.FullName
                    });
                }

                html = GetNursingCareSheet(
                    patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
                    patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
                    mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
                    exam.MainDiagnosis ?? mr?.MainDiagnosis,
                    nursingRows);
                break;

            case "discharge":
                html = GetDischargeLetter(
                    patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
                    patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
                    mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
                    mr?.AdmissionDate, mr?.DischargeDate ?? DateTime.Now,
                    mr?.InitialDiagnosis, exam.MainDiagnosis ?? mr?.MainDiagnosis,
                    exam.TreatmentPlan, mr?.TreatmentResult ?? 2,
                    mr?.DischargeNote, exam.FollowUpDate,
                    exam.Doctor?.FullName, null);
                break;

            // Generic forms for MS. 06-17 and DD. 01-21
            default:
                html = GenerateGenericFormHtml(formType ?? "summary", patient, mr, exam);
                break;
        }

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// Sinh HTML tom tat benh an (MS. 01/BV) theo medicalRecordId
    /// </summary>
    public async Task<byte[]> GenerateMedicalRecordSummaryAsync(Guid medicalRecordId)
    {
        var mr = await _db.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId && !m.IsDeleted);

        if (mr == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("L\u1ED7i", "<p>Kh\u00F4ng t\u00ECm th\u1EA5y h\u1ED3 s\u01A1 b\u1EC7nh \u00E1n</p>"));

        // Lay luot kham gan nhat
        var exam = await _db.Examinations
            .Where(e => e.MedicalRecordId == medicalRecordId && !e.IsDeleted)
            .OrderByDescending(e => e.StartTime)
            .FirstOrDefaultAsync();

        var html = GetMedicalRecordSummary(
            mr.Patient?.PatientCode, mr.Patient?.FullName, mr.Patient?.Gender ?? 0, mr.Patient?.DateOfBirth,
            mr.Patient?.Address, mr.Patient?.PhoneNumber, mr.Patient?.InsuranceNumber,
            mr.MedicalRecordCode, mr.Department?.DepartmentName,
            mr.AdmissionDate, mr.DischargeDate,
            exam?.ChiefComplaint, exam?.PresentIllness,
            mr.Patient?.MedicalHistory, mr.Patient?.FamilyHistory,
            exam?.PhysicalExamination, exam?.SystemsReview,
            mr.MainDiagnosis, mr.MainIcdCode,
            mr.SubDiagnosis, exam?.TreatmentPlan,
            mr.TreatmentResult, mr.DischargeNote,
            mr.Doctor?.FullName, null);

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// Sinh HTML to dieu tri (MS. 02/BV) theo admissionId
    /// </summary>
    public async Task<byte[]> GenerateTreatmentSheetAsync(Guid admissionId)
    {
        var admission = await _db.Admissions
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
                .ThenInclude(m => m.Department)
            .Include(a => a.AdmittingDoctor)
            .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);

        if (admission == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("L\u1ED7i", "<p>Kh\u00F4ng t\u00ECm th\u1EA5y l\u01B0\u1EE3t nh\u1EADp vi\u1EC7n</p>"));

        // Lay dien bien hang ngay
        var progresses = await _db.DailyProgresses
            .Where(p => p.AdmissionId == admissionId && !p.IsDeleted)
            .OrderBy(p => p.ProgressDate)
            .ToListAsync();

        var rows = new List<TreatmentSheetRow>();
        int dayNum = 1;
        foreach (var p in progresses)
        {
            var doctor = await _db.Users.FirstOrDefaultAsync(u => u.Id == p.DoctorId);
            var soapText = new StringBuilder();
            if (!string.IsNullOrEmpty(p.SubjectiveFindings)) soapText.Append(p.SubjectiveFindings);
            if (!string.IsNullOrEmpty(p.ObjectiveFindings)) soapText.Append($" | {p.ObjectiveFindings}");

            rows.Add(new TreatmentSheetRow
            {
                Date = p.ProgressDate,
                DayNumber = dayNum++,
                Progress = soapText.ToString(),
                Orders = p.Plan,
                DoctorName = doctor?.FullName
            });
        }

        var mr = admission.MedicalRecord;
        var patient = admission.Patient;

        var html = GetTreatmentSheet(
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
            mr?.MainDiagnosis ?? admission.DiagnosisOnAdmission, mr?.MainIcdCode,
            rows, admission.AdmittingDoctor?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// Sinh HTML giay ra vien (MS. 04/BV) theo admissionId
    /// </summary>
    public async Task<byte[]> GenerateDischargeLetterAsync(Guid admissionId)
    {
        var admission = await _db.Admissions
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
                .ThenInclude(m => m.Department)
            .Include(a => a.Discharge)
            .Include(a => a.AdmittingDoctor)
            .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);

        if (admission == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("L\u1ED7i", "<p>Kh\u00F4ng t\u00ECm th\u1EA5y l\u01B0\u1EE3t nh\u1EADp vi\u1EC7n</p>"));

        var discharge = admission.Discharge;
        var mr = admission.MedicalRecord;
        var patient = admission.Patient;

        // Lay bac si xuat vien
        string? dischargeDocName = null;
        if (discharge != null)
        {
            var dischargeDoc = await _db.Users.FirstOrDefaultAsync(u => u.Id == discharge.DischargedBy);
            dischargeDocName = dischargeDoc?.FullName;
        }

        var html = GetDischargeLetter(
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
            admission.AdmissionDate, discharge?.DischargeDate ?? DateTime.Now,
            admission.DiagnosisOnAdmission, discharge?.DischargeDiagnosis ?? mr?.MainDiagnosis,
            null, discharge?.DischargeCondition ?? 2,
            discharge?.DischargeInstructions, discharge?.FollowUpDate,
            dischargeDocName ?? admission.AdmittingDoctor?.FullName, null);

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// Sinh HTML don thuoc
    /// </summary>
    public async Task<byte[]> GeneratePrescriptionAsync(Guid prescriptionId)
    {
        var prescription = await _db.Prescriptions
            .Include(p => p.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.Department)
            .Include(p => p.Details)
                .ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

        if (prescription == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("L\u1ED7i", "<p>Kh\u00F4ng t\u00ECm th\u1EA5y \u0111\u01A1n thu\u1ED1c</p>"));

        var patient = prescription.MedicalRecord?.Patient;

        var items = prescription.Details
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.CreatedAt)
            .Select(d => new PrescriptionRow
            {
                MedicineName = d.Medicine?.MedicineName ?? "",
                Unit = d.Unit,
                Quantity = d.Quantity,
                Dosage = d.Dosage,
                Frequency = d.Frequency,
                Route = d.Route,
                Usage = d.Usage ?? d.UsageInstructions
            }).ToList();

        var html = GetPrescription(
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            prescription.Diagnosis ?? prescription.DiagnosisName, prescription.IcdCode ?? prescription.DiagnosisCode,
            prescription.PrescriptionDate, prescription.TotalDays,
            items, prescription.Note,
            prescription.Doctor?.FullName, prescription.Department?.DepartmentName);

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// Sinh HTML phieu ket qua xet nghiem
    /// </summary>
    public async Task<byte[]> GenerateLabResultAsync(Guid labRequestId)
    {
        var labRequest = await _db.LabRequests
            .Include(r => r.Patient)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Department)
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == labRequestId && !r.IsDeleted);

        if (labRequest == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("L\u1ED7i", "<p>Kh\u00F4ng t\u00ECm th\u1EA5y phi\u1EBFu x\u00E9t nghi\u1EC7m</p>"));

        var patient = labRequest.Patient;

        // Lay ket qua cho tung test item
        var resultRows = new List<LabResultRow>();
        foreach (var item in labRequest.Items.Where(i => !i.IsDeleted).OrderBy(i => i.CreatedAt))
        {
            var results = await _db.LabResults
                .Where(r => r.LabRequestItemId == item.Id && !r.IsDeleted)
                .OrderBy(r => r.SequenceNumber)
                .ToListAsync();

            if (results.Count > 0)
            {
                foreach (var r in results)
                {
                    resultRows.Add(new LabResultRow
                    {
                        TestName = r.ParameterName,
                        Result = r.ResultValue ?? r.Result ?? r.TextResult,
                        Unit = r.Unit,
                        ReferenceRange = r.ReferenceRange ?? (r.ReferenceMin.HasValue && r.ReferenceMax.HasValue
                            ? $"{r.ReferenceMin} - {r.ReferenceMax}"
                            : r.ReferenceText),
                        IsAbnormal = r.IsAbnormal
                    });
                }
            }
            else
            {
                // Test chua co ket qua - hien ten test
                resultRows.Add(new LabResultRow
                {
                    TestName = item.TestName,
                    Result = "(ch\u01B0a c\u00F3 KQ)",
                    Unit = "",
                    ReferenceRange = "",
                    IsAbnormal = false
                });
            }
        }

        // Lay nguoi duyet
        string? approvedByName = null;
        if (labRequest.ApprovedBy.HasValue)
        {
            var approver = await _db.Users.FirstOrDefaultAsync(u => u.Id == labRequest.ApprovedBy.Value);
            approvedByName = approver?.FullName;
        }

        var html = GetLabResult(
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            labRequest.DiagnosisName, labRequest.RequestingDoctor?.FullName,
            labRequest.Department?.DepartmentName,
            labRequest.RequestDate, labRequest.ApprovedAt,
            resultRows, approvedByName);

        return Encoding.UTF8.GetBytes(html);
    }

    // ========== Private helpers ==========

    /// <summary>
    /// Sinh generic form HTML cho cac form MS. 06-17, DD. 01-21
    /// Dung thong tin chung tu examination/patient + noi dung template rong cho dien tay
    /// </summary>
    private string GenerateGenericFormHtml(
        string formType,
        HIS.Core.Entities.Patient? patient,
        HIS.Core.Entities.MedicalRecord? mr,
        HIS.Core.Entities.Examination exam)
    {
        var (title, number) = GetFormTitleAndNumber(formType);

        var bodyContent = formType.ToLower() switch
        {
            "preanesthetic" => GetPreAnestheticContent(exam),
            "consent" => GetSurgeryConsentContent(patient),
            "progress" => GetProgressNoteContent(exam),
            "counseling" => GetCounselingContent(),
            "deathreview" => GetDeathReviewContent(exam),
            "finalsummary" => GetFinalSummaryContent(exam, mr),
            _ => GetDefaultFormContent(formType)
        };

        return GetGenericForm(title, number,
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
            bodyContent, exam.Doctor?.FullName);
    }

    private static (string title, string number) GetFormTitleAndNumber(string formType)
    {
        return formType.ToLower() switch
        {
            "preanesthetic" => ("PHI\u1EBEU KH\u00C1M TI\u1EC0N M\u00CA", "MS. 06/BV"),
            "consent" => ("CAM K\u1EBET PH\u1EAAU THU\u1EACT", "MS. 07/BV"),
            "progress" => ("S\u01A0 K\u1EBET 15 NG\u00C0Y \u0110I\u1EC0U TR\u1ECA", "MS. 08/BV"),
            "counseling" => ("PHI\u1EBEU T\u01AF V\u1EA4N", "MS. 09/BV"),
            "deathreview" => ("KI\u1EC2M \u0110I\u1EC2M T\u1EEC VONG", "MS. 10/BV"),
            "finalsummary" => ("T\u1ED4NG K\u1EBET H\u1ED2 S\u01A0 B\u1EC6NH \u00C1N", "MS. 11/BV"),
            "nutrition" => ("PHI\u1EBEU KH\u00C1M DINH D\u01AF\u1EE0NG", "MS. 12/BV"),
            "surgeryrecord" => ("PHI\u1EBEU PH\u1EAAU THU\u1EACT", "MS. 13/BV"),
            "surgeryapproval" => ("DUY\u1EC6T PH\u1EAAU THU\u1EACT", "MS. 14/BV"),
            "surgerysummary" => ("S\u01A0 K\u1EBET PH\u1EAAU THU\u1EACT", "MS. 15/BV"),
            "depttransfer" => ("B\u00C0N GIAO CHUY\u1EC2N KHOA", "MS. 16/BV"),
            "admission" => ("KH\u00C1M V\u00C0O VI\u1EC6N", "MS. 17/BV"),
            // Nursing forms DD. 01-21
            "dd01-careplan" => ("K\u1EBEHO\u1EA0CH CH\u0102M S\u00D3C", "DD. 01"),
            "dd02-icucare" => ("K\u1EBEHO\u1EA0CH CH\u0102M S\u00D3C HSCC", "DD. 02"),
            "dd03-assessment" => ("NH\u1EACN \u0110\u1ECBNH \u0110I\u1EC0U D\u01AF\u1EE0NG", "DD. 03"),
            "dd04-dailycare" => ("THEO D\u00D5I CH\u0102M S\u00D3C", "DD. 04"),
            "dd05-infusion" => ("TRUY\u1EC0N D\u1ECACH", "DD. 05"),
            "dd06-bloodlab" => ("TRUY\u1EC0N M\u00C1U (X\u00C9T NGHI\u1EC6M)", "DD. 06"),
            "dd07-bloodclinical" => ("TRUY\u1EC0N M\u00C1U (L\u00C2M S\u00C0NG)", "DD. 07"),
            "dd08-vitalsigns" => ("CH\u1EE8C N\u0102NG S\u1ED0NG", "DD. 08"),
            "dd09-meddisclosure" => ("C\u00D4NG KHAI THU\u1ED0C", "DD. 09"),
            "dd10-preop" => ("CHU\u1EA8N B\u1ECA TR\u01AF\u1EDAC M\u1ED4", "DD. 10"),
            "dd11-icutransfer" => ("CHUY\u1EC2N KH\u1ECEI H\u1ED2I S\u1EE8C", "DD. 11"),
            "dd12-nursetransfer" => ("B\u00C0N GIAO B\u1EC6NH NH\u00C2N (\u0110D)", "DD. 12"),
            "dd13-preeclampsia" => ("TI\u1EC0N S\u1EA2N GI\u1EACT", "DD. 13"),
            "dd14-ipdhandover" => ("B\u00C0N GIAO N\u1ED8I TR\u00DA", "DD. 14"),
            "dd15-orhandover" => ("B\u00C0N GIAO CHUY\u1EC2N M\u1ED4", "DD. 15"),
            "dd16-safetychecklist" => ("AN TO\u00C0N PH\u1EAAU THU\u1EACT (WHO)", "DD. 16"),
            "dd17-glucose" => ("\u0110\u01AF\u1EDCNG HUY\u1EBET", "DD. 17"),
            "dd18-pregnancyrisk" => ("THAI K\u1EF2 NGUY C\u01A0", "DD. 18"),
            "dd19-swallowing" => ("TEST NU\u1ED0T", "DD. 19"),
            "dd20-docscan" => ("SCAN T\u00C0I LI\u1EC6U", "DD. 20"),
            "dd21-vap" => ("VIPH\u1ED4I TH\u1EDE M\u00C1Y", "DD. 21"),
            _ => ("BI\u1EC2U M\u1EAAU EMR", formType.ToUpper())
        };
    }

    private static string GetPreAnestheticContent(HIS.Core.Entities.Examination exam)
    {
        return $@"
<div class=""section-title"">1. TI\u1EC0N S\u1EEC</div>
<p>Ti\u1EC1n s\u1EED b\u1EC7nh: ................................................................</p>
<p>D\u1ECB \u1EE9ng: ................................................................</p>
<p>Thu\u1ED1c \u0111ang d\u00F9ng: ................................................................</p>

<div class=""section-title"">2. KH\u00C1M HI\u1EC6N T\u1EA0I</div>
<p>C\u00E2n n\u1EB7ng: {exam.Weight?.ToString("0.0") ?? "........"} kg &nbsp;&nbsp; Chi\u1EC1u cao: {exam.Height?.ToString("0.0") ?? "........"} cm &nbsp;&nbsp; BMI: {exam.BMI?.ToString("0.0") ?? "........"}</p>
<p>M\u1EA1ch: {exam.Pulse?.ToString() ?? "........"} l/ph &nbsp;&nbsp; HA: {exam.BloodPressureSystolic?.ToString() ?? "..."}/{exam.BloodPressureDiastolic?.ToString() ?? "..."} mmHg &nbsp;&nbsp; SpO2: {exam.SpO2?.ToString("0.0") ?? "........"} %</p>
<p>Kh\u00E1m to\u00E0n th\u00E2n: {System.Net.WebUtility.HtmlEncode(exam.PhysicalExamination ?? "............................................")}</p>

<div class=""section-title"">3. PH\u00C2N LO\u1EA0I ASA</div>
<p><span class=""checkbox""></span> I &nbsp;&nbsp; <span class=""checkbox""></span> II &nbsp;&nbsp; <span class=""checkbox""></span> III &nbsp;&nbsp; <span class=""checkbox""></span> IV &nbsp;&nbsp; <span class=""checkbox""></span> V</p>

<div class=""section-title"">4. PH\u00C2N LO\u1EA0I MALLAMPATI</div>
<p><span class=""checkbox""></span> I &nbsp;&nbsp; <span class=""checkbox""></span> II &nbsp;&nbsp; <span class=""checkbox""></span> III &nbsp;&nbsp; <span class=""checkbox""></span> IV</p>

<div class=""section-title"">5. K\u1EBEHO\u1EA0CH G\u00C2Y M\u00CA</div>
<p>Ph\u01B0\u01A1ng ph\u00E1p g\u00E2y m\u00EA/t\u00EA: ................................................................</p>
<p>Ch\u1EC9 d\u1EABn tr\u01B0\u1EDBc m\u1ED5: ................................................................</p>";
    }

    private static string GetSurgeryConsentContent(HIS.Core.Entities.Patient? patient)
    {
        return $@"
<p class=""mt-10"">T\u00F4i t\u00EAn l\u00E0: ................................................................</p>
<p>L\u00E0 <span class=""checkbox""></span> Ng\u01B0\u1EDDi b\u1EC7nh &nbsp;&nbsp; <span class=""checkbox""></span> Th\u00E2n nh\u00E2n (quan h\u1EC7: ................)</p>
<p>C\u1EE7a ng\u01B0\u1EDDi b\u1EC7nh: <b>{System.Net.WebUtility.HtmlEncode(patient?.FullName ?? "")}</b></p>

<div class=""section-title"">CAM K\u1EBET</div>
<p>Sau khi \u0111\u01B0\u1EE3c b\u00E1c s\u0129 gi\u1EA3i th\u00EDch v\u1EC1:</p>
<ul style=""margin-left:20px"">
    <li>T\u00ECnh tr\u1EA1ng b\u1EC7nh</li>
    <li>Ph\u01B0\u01A1ng ph\u00E1p ph\u1EABu thu\u1EADt/th\u1EE7 thu\u1EADt</li>
    <li>C\u00E1c nguy c\u01A1, bi\u1EBFn ch\u1EE9ng c\u00F3 th\u1EC3 x\u1EA3y ra</li>
    <li>Ph\u01B0\u01A1ng ph\u00E1p thay th\u1EBF</li>
</ul>
<p class=""mt-10"">T\u00F4i \u0111\u1ED3ng \u00FD cho ph\u1EABu thu\u1EADt/th\u1EE7 thu\u1EADt: ................................................................</p>
<p>T\u00F4i hi\u1EC3u r\u00F5 v\u00E0 ch\u1EA5p nh\u1EADn c\u00E1c nguy c\u01A1 c\u00F3 th\u1EC3 x\u1EA3y ra.</p>";
    }

    private static string GetProgressNoteContent(HIS.Core.Entities.Examination exam)
    {
        return $@"
<div class=""section-title"">1. DI\u1EC4N BI\u1EBEN L\u00C2M S\u00C0NG</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.PresentIllness ?? "............................................................................................................")}</p>

<div class=""section-title"">2. K\u1EBET QU\u1EA2 C\u1EACN L\u00C2M S\u00C0NG</div>
<p>............................................................................................................</p>

<div class=""section-title"">3. \u0110I\u1EC0U TR\u1ECA \u0110\u00C3 TH\u1EFACE HI\u1EC6N</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.TreatmentPlan ?? "............................................................................................................")}</p>

<div class=""section-title"">4. T\u00CCNH TR\u1EA0NG HI\u1EC6N T\u1EA0I</div>
<p>............................................................................................................</p>

<div class=""section-title"">5. H\u01AF\u1EDANG \u0110I\u1EC0U TR\u1ECA TI\u1EAEP</div>
<p>............................................................................................................</p>";
    }

    private static string GetCounselingContent()
    {
        return @"
<div class=""section-title"">1. N\u1ED8I DUNG T\u01AF V\u1EA4N</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">2. C\u00C2U H\u1ECEI C\u1EE6A NG\u01AF\u1EDCI B\u1EC6NH</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">3. M\u1EE8C \u0110\u1ED8 HI\u1EC2U BI\u1EBET</div>
<p>
    <span class=""checkbox""></span> Hi\u1EC3u r\u00F5 &nbsp;&nbsp;
    <span class=""checkbox""></span> Hi\u1EC3u m\u1ED9t ph\u1EA7n &nbsp;&nbsp;
    <span class=""checkbox""></span> Ch\u01B0a hi\u1EC3u &nbsp;&nbsp;
    <span class=""checkbox""></span> Kh\u00F4ng h\u1EE3p t\u00E1c
</p>";
    }

    private static string GetDeathReviewContent(HIS.Core.Entities.Examination exam)
    {
        return $@"
<div class=""section-title"">1. CH\u1EA8N \u0110O\u00C1N</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.MainDiagnosis ?? "............................................................................................................")}</p>

<div class=""section-title"">2. QU\u00C1 TR\u00CCNH \u0110I\u1EC0U TR\u1ECA</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">3. NH\u1EACN X\u00C9T</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">4. B\u00C0I H\u1ECCC KINH NGHI\u1EC6M</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">5. TH\u00C0NH PH\u1EA6N THAM D\u1EF0</div>
<p>............................................................................................................</p>";
    }

    private static string GetFinalSummaryContent(HIS.Core.Entities.Examination exam, HIS.Core.Entities.MedicalRecord? mr)
    {
        return $@"
<div class=""section-title"">1. QU\u00C1 TR\u00CCNH B\u1EC6NH L\u00DD V\u00C0 DI\u1EC4N BI\u1EBEN L\u00C2M S\u00C0NG</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.PresentIllness ?? "............................................................................................................")}</p>

<div class=""section-title"">2. K\u1EBET QU\u1EA2 C\u1EACN L\u00C2M S\u00C0NG</div>
<p>............................................................................................................</p>

<div class=""section-title"">3. CH\u1EA8N \u0110O\u00C1N</div>
<p><b>Ch\u1EA9n \u0111o\u00E1n ch\u00EDnh:</b> {System.Net.WebUtility.HtmlEncode(exam.MainDiagnosis ?? mr?.MainDiagnosis ?? "")} ({System.Net.WebUtility.HtmlEncode(exam.MainIcdCode ?? mr?.MainIcdCode ?? "")})</p>
<p><b>Ch\u1EA9n \u0111o\u00E1n ph\u1EE5:</b> {System.Net.WebUtility.HtmlEncode(exam.SubDiagnosis ?? mr?.SubDiagnosis ?? "")}</p>

<div class=""section-title"">4. \u0110I\u1EC0U TR\u1ECA</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.TreatmentPlan ?? "............................................................................................................")}</p>

<div class=""section-title"">5. K\u1EBET QU\u1EA2 \u0110I\u1EC0U TR\u1ECA</div>
<p>
    <span class=""checkbox""></span> Kh\u1ECFi &nbsp;&nbsp;
    <span class=""checkbox""></span> \u0110\u1EE1, gi\u1EA3m &nbsp;&nbsp;
    <span class=""checkbox""></span> Kh\u00F4ng thay \u0111\u1ED5i &nbsp;&nbsp;
    <span class=""checkbox""></span> N\u1EB7ng h\u01A1n &nbsp;&nbsp;
    <span class=""checkbox""></span> T\u1EED vong
</p>

<div class=""section-title"">6. H\u01AF\u1EDANG TI\u1EAEP</div>
<p>............................................................................................................</p>";
    }

    private static string GetDefaultFormContent(string formType)
    {
        // Tra ve form rong voi dong ke de dien tay, ap dung cho cac form DD. 01-21
        return @"
<div class=""mt-10"">
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
</div>";
    }
}
