using System.Globalization;
using FellowOakDicom;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public interface IMppsProcessor
{
    Task<bool> IsKnownMppsAeAsync(string callingAeTitle, CancellationToken cancellationToken);
    Task<MppsProcessResult> ProcessAsync(
        string callingAeTitle,
        string sopInstanceUid,
        DicomDataset dataset,
        bool isCreate,
        CancellationToken cancellationToken);
}

public sealed record MppsProcessResult(bool Success, string? ErrorMessage);

/// <summary>
/// Applies DICOM MPPS N-CREATE/N-SET to the scheduled radiology exam. Matching is based on
/// Accession Number from Scheduled Step Attributes, then on the persisted MPPS SOP Instance UID.
/// </summary>
public sealed class MppsProcessor : IMppsProcessor
{
    private readonly HISDbContext _db;
    private readonly ILogger<MppsProcessor> _logger;

    public MppsProcessor(HISDbContext db, ILogger<MppsProcessor> logger)
    {
        _db = db;
        _logger = logger;
    }

    public Task<bool> IsKnownMppsAeAsync(string callingAeTitle, CancellationToken cancellationToken) =>
        _db.RadiologyModalities.AsNoTracking().AnyAsync(m =>
            m.IsActive && !m.IsDeleted && m.SupportsMPPS &&
            m.AETitle != null && m.AETitle == callingAeTitle, cancellationToken);

    public async Task<MppsProcessResult> ProcessAsync(
        string callingAeTitle,
        string sopInstanceUid,
        DicomDataset dataset,
        bool isCreate,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(sopInstanceUid))
            return new MppsProcessResult(false, "MPPS SOP Instance UID is missing");

        var accession = GetAccessionNumber(dataset);
        var query = _db.RadiologyExams
            .Include(e => e.RadiologyRequest)
            .Where(e => !e.IsDeleted);

        var exam = !string.IsNullOrWhiteSpace(accession)
            ? await query.FirstOrDefaultAsync(e => e.AccessionNumber == accession, cancellationToken)
            : await query.FirstOrDefaultAsync(e => e.MppsInstanceUid == sopInstanceUid, cancellationToken);

        if (exam == null)
            return new MppsProcessResult(false,
                string.IsNullOrWhiteSpace(accession)
                    ? $"No exam is linked to MPPS {sopInstanceUid}"
                    : $"No exam has accession number {accession}");

        if (!isCreate && exam.MppsInstanceUid != null &&
            !string.Equals(exam.MppsInstanceUid, sopInstanceUid, StringComparison.Ordinal))
            return new MppsProcessResult(false, "MPPS SOP Instance UID does not match the scheduled exam");

        var status = dataset.GetSingleValueOrDefault(DicomTag.PerformedProcedureStepStatus, string.Empty)
            .Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(status))
            return new MppsProcessResult(false, "Performed Procedure Step Status is missing");

        exam.MppsInstanceUid = sopInstanceUid;
        exam.MppsStatus = status;
        exam.MppsLastUpdatedAt = DateTime.UtcNow;

        switch (status)
        {
            case "IN PROGRESS":
                exam.Status = 1;
                exam.StartTime = ParseDicomDateTime(
                    dataset.GetSingleValueOrDefault(DicomTag.PerformedProcedureStepStartDate, string.Empty),
                    dataset.GetSingleValueOrDefault(DicomTag.PerformedProcedureStepStartTime, string.Empty))
                    ?? exam.StartTime ?? DateTime.UtcNow;
                exam.RadiologyRequest.Status = 2;
                break;
            case "COMPLETED":
                exam.Status = 2;
                exam.EndTime = ParseDicomDateTime(
                    dataset.GetSingleValueOrDefault(DicomTag.PerformedProcedureStepEndDate, string.Empty),
                    dataset.GetSingleValueOrDefault(DicomTag.PerformedProcedureStepEndTime, string.Empty))
                    ?? DateTime.UtcNow;
                exam.RadiologyRequest.Status = Math.Max(exam.RadiologyRequest.Status, 3);
                break;
            case "DISCONTINUED":
                exam.Status = 3;
                exam.EndTime = ParseDicomDateTime(
                    dataset.GetSingleValueOrDefault(DicomTag.PerformedProcedureStepEndDate, string.Empty),
                    dataset.GetSingleValueOrDefault(DicomTag.PerformedProcedureStepEndTime, string.Empty))
                    ?? DateTime.UtcNow;
                break;
            default:
                return new MppsProcessResult(false, $"Unsupported MPPS status '{status}'");
        }

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation(
            "Applied MPPS {Status} from {CallingAe} to exam {ExamId}, accession {Accession}",
            status, callingAeTitle, exam.Id, exam.AccessionNumber);
        return new MppsProcessResult(true, null);
    }

    private static string? GetAccessionNumber(DicomDataset dataset)
    {
        if (dataset.TryGetSequence(DicomTag.ScheduledStepAttributesSequence, out var sequence) &&
            sequence.Items.Count > 0)
        {
            var value = sequence.Items[0].GetSingleValueOrDefault(DicomTag.AccessionNumber, string.Empty);
            if (!string.IsNullOrWhiteSpace(value)) return value.Trim();
        }
        var direct = dataset.GetSingleValueOrDefault(DicomTag.AccessionNumber, string.Empty);
        return string.IsNullOrWhiteSpace(direct) ? null : direct.Trim();
    }

    private static DateTime? ParseDicomDateTime(string date, string time)
    {
        if (string.IsNullOrWhiteSpace(date)) return null;
        var normalizedTime = new string((time ?? string.Empty).TakeWhile(c => c != '.').ToArray());
        normalizedTime = normalizedTime.PadRight(6, '0');
        return DateTime.TryParseExact(
            date.Trim() + normalizedTime[..6],
            "yyyyMMddHHmmss",
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeLocal,
            out var parsed)
            ? parsed
            : null;
    }
}
