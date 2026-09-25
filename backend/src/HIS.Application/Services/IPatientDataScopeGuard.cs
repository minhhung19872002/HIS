namespace HIS.Application.Services;

/// <summary>
/// Applies the per-user data scope (NangCap26 I.15/I.16 — khoa · phòng · loại điều trị · đối tượng
/// bệnh nhân) to the reads that return patient data.
///
/// The scope model itself already existed and an admin screen could configure it, but nothing ever
/// consulted it, so a user assigned to one department still read every department's patients
/// (QA round 4, 2026-09-16). This guard is the missing consumer.
///
/// FAIL-OPEN is preserved deliberately: a user with no data-permission group is Unrestricted and
/// sees exactly what they saw before, so turning this on changes nothing until the hospital
/// actually assigns groups. Admin is always exempt.
/// </summary>
public interface IPatientDataScopeGuard
{
    /// <summary>Throws <see cref="UnauthorizedAccessException"/> (→ 403) when the patient has no
    /// encounter inside the caller's scope.</summary>
    Task EnsurePatientInScopeAsync(Guid patientId, CancellationToken ct = default);

    /// <summary>Same check anchored on one medical record.</summary>
    Task EnsureMedicalRecordInScopeAsync(Guid medicalRecordId, CancellationToken ct = default);

    /// <summary>Same check anchored on one inpatient stay.</summary>
    Task EnsureAdmissionInScopeAsync(Guid admissionId, CancellationToken ct = default);

    /// <summary>
    /// QA-R12: the scope to apply to LIST queries (the per-record checks above never ran on lists, so a user
    /// scoped to one department still saw every department in /inpatient/patients and the OPD room list).
    /// Returns <c>null</c> — "do not filter" — for anonymous / exempt roles / Unrestricted / a group that
    /// constrains nothing, i.e. every user without a configured scope keeps exactly the same lists.
    /// </summary>
    Task<PatientListScope?> GetListScopeAsync(CancellationToken ct = default);
}

/// <summary>QA-R12: a resolved list scope. A row is visible when it matches ANY non-empty dimension (same
/// "any" semantics as the per-record guard).</summary>
public sealed class PatientListScope
{
    public List<Guid> DepartmentIds { get; init; } = new();
    public List<Guid> RoomIds { get; init; } = new();
    public List<int> TreatmentTypes { get; init; } = new();
    public List<int> PatientObjects { get; init; } = new();
}
