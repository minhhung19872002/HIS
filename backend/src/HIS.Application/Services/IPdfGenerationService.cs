namespace HIS.Application.Services;

/// <summary>
/// Service sinh PDF/HTML cho bieu mau EMR (Ho so benh an dien tu)
/// Tra ve HTML string voi inline CSS, UTF-8, san sang cho browser printing
/// </summary>
public interface IPdfGenerationService
{
    /// <summary>
    /// Sinh HTML bieu mau EMR theo loai form
    /// formType: summary, treatment, consultation, discharge, nursing,
    ///           preanesthetic, consent, progress, counseling, deathreview, finalsummary,
    ///           nutrition, surgeryrecord, surgeryapproval, surgerysummary, depttransfer, admission
    /// </summary>
    Task<byte[]> GenerateEmrPdfAsync(Guid examinationId, string formType);

    /// <summary>
    /// Sinh HTML tom tat ho so benh an (MS. 01/BV)
    /// </summary>
    Task<byte[]> GenerateMedicalRecordSummaryAsync(Guid medicalRecordId);

    /// <summary>
    /// Sinh HTML to dieu tri (MS. 02/BV)
    /// </summary>
    Task<byte[]> GenerateTreatmentSheetAsync(Guid admissionId);

    /// <summary>
    /// Sinh HTML giay ra vien (MS. 04/BV)
    /// </summary>
    Task<byte[]> GenerateDischargeLetterAsync(Guid admissionId);

    /// <summary>
    /// Sinh HTML don thuoc
    /// </summary>
    Task<byte[]> GeneratePrescriptionAsync(Guid prescriptionId);

    /// <summary>
    /// Sinh HTML phieu ket qua xet nghiem
    /// </summary>
    Task<byte[]> GenerateLabResultAsync(Guid labRequestId);
}
