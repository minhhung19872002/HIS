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
public partial class PdfGenerationService : IPdfGenerationService
{
    private readonly HISDbContext _db;
    private readonly IPaymentGatewayService _paymentGateway;

    public PdfGenerationService(HISDbContext db, IPaymentGatewayService paymentGateway)
    {
        _db = db;
        _paymentGateway = paymentGateway;
    }

    /// <summary>
    /// Sinh HTML bieu mau EMR theo examinationId va formType
    /// </summary>
    public async Task<byte[]> GenerateEmrPdfAsync(Guid examinationId, string formType)
    {
        var exam = await _db.Examinations
            .AsNoTracking()
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
                    .AsNoTracking()
                    .Where(t => t.ExaminationId == examinationId && !t.IsDeleted)
                    .OrderBy(t => t.TreatmentDate)
                    .ToListAsync();

                // Batch-load bac si (tranh N+1: tra cuu Users theo tung sheet)
                var sheetDoctorIds = sheets.Where(s => s.DoctorId.HasValue).Select(s => s.DoctorId!.Value).Distinct().ToList();
                var sheetDoctors = await _db.Users
                    .AsNoTracking()
                    .Where(u => sheetDoctorIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id);

                var treatmentRows = new List<TreatmentSheetRow>();
                foreach (var s in sheets)
                {
                    var doctor = s.DoctorId.HasValue && sheetDoctors.TryGetValue(s.DoctorId.Value, out var sd) ? sd : null;
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
                    .AsNoTracking()
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
                        ? await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == consultations.PresidedByUserId.Value)
                        : null;
                    var secretary = consultations.SecretaryUserId.HasValue
                        ? await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == consultations.SecretaryUserId.Value)
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
                    .AsNoTracking()
                    .Where(n => n.ExaminationId == examinationId && !n.IsDeleted)
                    .OrderBy(n => n.CareDate)
                    .ToListAsync();

                // Batch-load dieu duong (tranh N+1: tra cuu Users theo tung sheet)
                var nurseIds = nursingSheets.Where(n => n.NurseId.HasValue).Select(n => n.NurseId!.Value).Distinct().ToList();
                var nurses = await _db.Users
                    .AsNoTracking()
                    .Where(u => nurseIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id);

                var nursingRows = new List<NursingCareRow>();
                foreach (var n in nursingSheets)
                {
                    var nurse = n.NurseId.HasValue && nurses.TryGetValue(n.NurseId.Value, out var nu) ? nu : null;
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
            .AsNoTracking()
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId && !m.IsDeleted);

        if (mr == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("L\u1ED7i", "<p>Kh\u00F4ng t\u00ECm th\u1EA5y h\u1ED3 s\u01A1 b\u1EC7nh \u00E1n</p>"));

        // Lay luot kham gan nhat
        var exam = await _db.Examinations
            .AsNoTracking()
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
            .AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
                .ThenInclude(m => m.Department)
            .Include(a => a.AdmittingDoctor)
            .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);

        if (admission == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("L\u1ED7i", "<p>Kh\u00F4ng t\u00ECm th\u1EA5y l\u01B0\u1EE3t nh\u1EADp vi\u1EC7n</p>"));

        // Lay dien bien hang ngay
        var progresses = await _db.DailyProgresses
            .AsNoTracking()
            .Where(p => p.AdmissionId == admissionId && !p.IsDeleted)
            .OrderBy(p => p.ProgressDate)
            .ToListAsync();

        // Batch-load bac si (tranh N+1: tra cuu Users theo tung dien bien)
        var progressDoctorIds = progresses.Select(p => p.DoctorId).Distinct().ToList();
        var progressDoctors = await _db.Users
            .AsNoTracking()
            .Where(u => progressDoctorIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var rows = new List<TreatmentSheetRow>();
        int dayNum = 1;
        foreach (var p in progresses)
        {
            progressDoctors.TryGetValue(p.DoctorId, out var doctor);
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
            .AsNoTracking()
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
            var dischargeDoc = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == discharge.DischargedBy);
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
            .AsNoTracking()
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

        // NangCap25 I.3 — đơn có khoản BN phải trả → nhúng QR thanh toán (helper tự bỏ qua nếu đã TT/lỗi)
        if (prescription.PatientAmount > 0 || prescription.TotalAmount > 0)
        {
            var qrBlock = await _paymentGateway.BuildPrintQrBlockHtmlAsync(new Application.DTOs.Payment.DynamicQrRequestDto
            {
                ReferenceType = "prescription",
                ReferenceId = prescription.Id
            }, Guid.Empty);
            if (!string.IsNullOrEmpty(qrBlock))
                html = html.Replace("</body>", qrBlock + "</body>");
        }

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// Sinh HTML phieu ket qua xet nghiem
    /// </summary>
    public async Task<byte[]> GenerateLabResultAsync(Guid labRequestId)
    {
        // #14e: model 1 \u2014 phi\u1EBFu KQ in t\u1EEB ServiceRequest + SRD + ch\u1EC9 s\u1ED1 con R1 (model 2 \u0111\u00E3 g\u1EE1; \u0111\u00F3ng lu\u00F4n defer R1 "in phi\u1EBFu t\u1EEB SRD-Items")
        var labRequest = await _db.ServiceRequests
            .AsNoTracking()
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(r => r.Doctor)
            .Include(r => r.Department)
            .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(r => r.Id == labRequestId && !r.IsDeleted && r.RequestType == 1);

        if (labRequest == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("L\u1ED7i", "<p>Kh\u00F4ng t\u00ECm th\u1EA5y phi\u1EBFu x\u00E9t nghi\u1EC7m</p>"));

        var patient = labRequest.MedicalRecord?.Patient;

        // Lay ket qua cho tung SRD (ch\u1EC9 s\u1ED1 con n\u1EBFu c\u00F3, fallback KQ chu\u1ED7i)
        // Batch-load chi so con cho tat ca SRD (tranh N+1: tra cuu tham so theo tung detail)
        var detailIds = labRequest.Details.Select(d => d.Id).ToList();
        var allParams = await _db.ServiceRequestDetailParameters
            .AsNoTracking()
            .Where(p => detailIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted)
            .ToListAsync();
        var paramsByDetail = allParams
            .GroupBy(p => p.ServiceRequestDetailId)
            .ToDictionary(g => g.Key, g => g.OrderBy(p => p.SequenceNumber).ToList());

        var resultRows = new List<LabResultRow>();
        foreach (var item in labRequest.Details.OrderBy(i => i.CreatedAt))
        {
            var results = paramsByDetail.TryGetValue(item.Id, out var prm) ? prm : null;

            if (results != null && results.Count > 0)
            {
                foreach (var r in results)
                {
                    resultRows.Add(new LabResultRow
                    {
                        TestName = r.ParameterName,
                        Result = r.Value,
                        Unit = r.Unit,
                        ReferenceRange = r.ReferenceRange ?? (r.ReferenceMin.HasValue && r.ReferenceMax.HasValue
                            ? $"{r.ReferenceMin} - {r.ReferenceMax}"
                            : null),
                        IsAbnormal = LabFlagEvaluator.IsAbnormal(r.Flag)
                    });
                }
            }
            else
            {
                resultRows.Add(new LabResultRow
                {
                    TestName = item.Service?.ServiceName ?? "",
                    Result = item.Result ?? "(ch\u01B0a c\u00F3 KQ)",
                    Unit = "",
                    ReferenceRange = "",
                    IsAbnormal = false
                });
            }
        }

        // Lay nguoi duyet (reviewer mu\u1ED9n nh\u1EA5t trong c\u00E1c SRD)
        string? approvedByName = null;
        var approvedAt = labRequest.Details.Select(d => d.ReviewedAt).Where(x => x.HasValue).OrderByDescending(x => x).FirstOrDefault();
        var reviewerId = labRequest.Details.Where(d => d.ReviewedAt.HasValue).OrderByDescending(d => d.ReviewedAt).Select(d => d.ReviewerUserId).FirstOrDefault();
        if (reviewerId.HasValue)
        {
            var approver = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == reviewerId.Value);
            approvedByName = approver?.FullName;
        }

        var html = GetLabResult(
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            labRequest.Diagnosis, labRequest.Doctor?.FullName,
            labRequest.Department?.DepartmentName,
            labRequest.RequestDate, approvedAt,
            resultRows, approvedByName);

        return Encoding.UTF8.GetBytes(html);
    }
}
