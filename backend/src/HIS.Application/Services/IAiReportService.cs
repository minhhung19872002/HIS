namespace HIS.Application.Services;

/// <summary>
/// Phase 3 — Xuất kết quả AI sang định dạng tiêu chuẩn (HSMT yêu cầu):
///   1. PDF (HTML render → browser print) — báo cáo AI in giấy
///   2. DICOM SR (TID 1500 Imaging Report) — đẩy ngược về PACS để các
///      workstation khác đọc được
///   3. Merge findings → RadiologyReport.Findings/Impression
/// </summary>
public interface IAiReportService
{
    /// <summary>
    /// Sinh HTML báo cáo AI cho 1 AiLabelingResult — header BV, patient
    /// info, study info, bảng labels + confidence + BS-accepted, ghi chú
    /// BS, signature block. Browser mở rồi print → PDF.
    /// </summary>
    Task<byte[]> GenerateAiReportHtmlAsync(Guid aiResultId);

    /// <summary>
    /// Sinh DICOM Structured Report (PS3.10 file format) cho 1
    /// AiLabelingResult. SR document tham chiếu Study/Series gốc qua
    /// StudyInstanceUID + chứa các finding như TextContentItem.
    /// Trả về byte[] DICOM binary.
    /// </summary>
    Task<byte[]> GenerateDicomSrAsync(Guid aiResultId);

    /// <summary>
    /// Build DICOM SR + upload về Orthanc qua REST /instances.
    /// Returns (instanceId, studyInstanceUid). Throws nếu PACS không
    /// configure hoặc upload fail.
    /// </summary>
    Task<(string OrthancInstanceId, string StudyInstanceUid)> UploadDicomSrToOrthancAsync(Guid aiResultId);

    /// <summary>
    /// Append AI findings vào RadiologyReport.Findings field, đi qua
    /// RadiologyExam → RadiologyRequest → StudyInstanceUID match.
    /// Idempotent — nếu đã merge rồi (text marker đã có) thì replace
    /// thay vì append duplicate.
    /// </summary>
    /// <returns>RadiologyReportId đã update, hoặc null nếu không tìm thấy report.</returns>
    Task<Guid?> MergeToRadiologyReportAsync(Guid aiResultId);
}
