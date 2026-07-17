using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.CDA;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class CdaDocumentService
{
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
}
