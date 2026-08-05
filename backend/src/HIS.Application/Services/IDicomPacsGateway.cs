namespace HIS.Application.Services;

/// <summary>
/// DICOM endpoint used by the infrastructure adapter.  The application layer deliberately
/// carries no fo-dicom types so the protocol implementation can be replaced independently.
/// </summary>
public sealed record DicomEndpoint(
    string Host,
    int Port,
    string CalledAeTitle,
    string CallingAeTitle,
    bool UseTls = false,
    bool UseStorageCommitment = false,
    int TimeoutSeconds = 30);

public sealed record DicomEchoResult(
    bool Success,
    int ElapsedMilliseconds,
    string? Status,
    string? ErrorMessage);

public sealed record DicomStoreResult(
    bool Success,
    int InstanceCount,
    long TotalBytes,
    string? JobId,
    string? ErrorMessage,
    // Chỉ có giá trị khi đích bật Storage Commitment. Null = không yêu cầu cam kết lưu trữ.
    // "Success" nghĩa là hệ nhận đã trả N-EVENT-REPORT xác nhận giữ ảnh, không phải suy đoán.
    string? StorageCommitmentStatus = null,
    string? StorageCommitmentTransactionUid = null);

public sealed record DicomImportResult(
    bool Success,
    string? OrthancInstanceId,
    string? OrthancStudyId,
    string? PatientId,
    string? StudyInstanceUid,
    string? SeriesInstanceUid,
    string? SopInstanceUid,
    string? ErrorMessage);

public sealed record DicomWorklistItem(
    string PatientId,
    string PatientName,
    DateTime? PatientBirthDate,
    string PatientSex,
    string AccessionNumber,
    string RequestedProcedureId,
    string RequestedProcedureDescription,
    string ScheduledStationAeTitle,
    string ScheduledModality,
    DateTime ScheduledDateTime,
    string ReferringPhysicianName,
    string? StudyInstanceUid = null);

public sealed record DicomWorklistResult(
    bool Success,
    string? WorklistId,
    string? ErrorMessage);

public sealed record DicomQueryCriteria(
    string? PatientId,
    string? PatientName,
    string? AccessionNumber,
    string? StudyInstanceUid,
    string? Modality,
    DateTime? FromDate,
    DateTime? ToDate,
    int MaxResults = 100);

public sealed record DicomRemoteStudy(
    string PatientId,
    string PatientName,
    string AccessionNumber,
    string StudyInstanceUid,
    string StudyDate,
    string StudyDescription,
    string ModalitiesInStudy,
    string NumberOfStudyRelatedInstances);

public sealed record DicomQueryResult(
    bool Success,
    IReadOnlyList<DicomRemoteStudy> Studies,
    bool WasTruncated,
    string? ErrorMessage);

public sealed record DicomRetrieveResult(
    bool Success,
    string StudyInstanceUid,
    int InstanceCount,
    long TotalBytes,
    string RetrieveMethod,
    string? ErrorMessage);

/// <summary>
/// Provenance of a stored study, read back from the archive rather than assumed.  A study that
/// arrived over the DICOM wire carries the modality's calling AE Title; anything imported through
/// another channel reports that channel in <see cref="Origin"/> and leaves the AE Title null.
/// </summary>
public sealed record DicomStudySource(
    bool Success,
    string? SourceAeTitle,
    string? Origin,
    string? SourceIpAddress,
    string? StationName,
    string? InstitutionalDepartmentName,
    string? ErrorMessage);

/// <summary>
/// Production PACS boundary.  Implementations must never synthesize success: success means
/// a DICOM peer or the Orthanc worklist/storage job acknowledged the operation.
/// </summary>
public interface IDicomPacsGateway
{
    Task<DicomEchoResult> EchoAsync(DicomEndpoint endpoint, CancellationToken cancellationToken = default);

    Task<DicomStoreResult> SendStudyAsync(
        string studyReference,
        DicomEndpoint destination,
        CancellationToken cancellationToken = default);

    Task<DicomImportResult> ImportInstanceAsync(
        byte[] dicomBytes,
        CancellationToken cancellationToken = default);

    Task<DicomWorklistResult> CreateWorklistAsync(
        DicomWorklistItem item,
        CancellationToken cancellationToken = default);

    Task<DicomQueryResult> QueryStudiesAsync(
        DicomEndpoint remote,
        DicomQueryCriteria criteria,
        CancellationToken cancellationToken = default);

    Task<DicomRetrieveResult> RetrieveStudyAsync(
        DicomEndpoint remote,
        string studyInstanceUid,
        string retrieveMethod = "C-MOVE",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Reads the archive's own record of how a study arrived.  Never infers a source: when the
    /// archive cannot answer, the result is a failure carrying the real reason.
    /// </summary>
    Task<DicomStudySource> GetStudySourceAsync(
        string studyReference,
        CancellationToken cancellationToken = default);
}
