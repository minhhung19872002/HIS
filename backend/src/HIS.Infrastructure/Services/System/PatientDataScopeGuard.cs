using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Common;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Enforces the per-user data scope on patient reads. See <see cref="IPatientDataScopeGuard"/> for why
/// this exists; the short version is that the scope was configurable but never consulted.
///
/// A patient is in scope when ANY of their encounters is: a medical record or an inpatient stay in one
/// of the allowed departments, in one of the allowed rooms, of an allowed treatment type, or of an
/// allowed patient object. "Any" is deliberate — a patient transferred out of your department is still
/// yours to read for continuity of care; the scope is there to keep whole departments apart, not to
/// re-implement the treatment-relationship guard (<see cref="ITreatmentRelationshipService"/>).
/// </summary>
public class PatientDataScopeGuard : IPatientDataScopeGuard
{
    private readonly HISDbContext _context;
    private readonly IDataPermissionService _dataPermission;
    private readonly ICurrentUserAccessor _currentUser;
    private readonly ILogger<PatientDataScopeGuard> _logger;

    // Roles that run the hospital rather than a ward: restricting them by department would break
    // cashiers, pharmacists and administrators, who legitimately serve every department.
    private static readonly string[] ExemptRoles =
    {
        RoleNames.Admin, RoleNames.Manager, RoleNames.Director,
        "ADMIN", "MANAGER", "DIRECTOR",
    };

    public PatientDataScopeGuard(
        HISDbContext context,
        IDataPermissionService dataPermission,
        ICurrentUserAccessor currentUser,
        ILogger<PatientDataScopeGuard> logger)
    {
        _context = context;
        _dataPermission = dataPermission;
        _currentUser = currentUser;
        _logger = logger;
    }

    public Task EnsurePatientInScopeAsync(Guid patientId, CancellationToken ct = default)
        => EnsureAsync(patientId: patientId, medicalRecordId: null, admissionId: null, ct);

    public Task EnsureMedicalRecordInScopeAsync(Guid medicalRecordId, CancellationToken ct = default)
        => EnsureAsync(patientId: null, medicalRecordId: medicalRecordId, admissionId: null, ct);

    public Task EnsureAdmissionInScopeAsync(Guid admissionId, CancellationToken ct = default)
        => EnsureAsync(patientId: null, medicalRecordId: null, admissionId: admissionId, ct);

    // The guard is scoped (one instance per request) and a request can touch several ids, so the
    // scope lookup is resolved once — the check must not cost a query per id.
    private Application.DTOs.System.EffectiveDataScopeDto? _cachedScope;

    private async Task EnsureAsync(Guid? patientId, Guid? medicalRecordId, Guid? admissionId, CancellationToken ct)
    {
        var userId = _currentUser.UserGuid;
        if (userId is null) return;                                   // anonymous paths are gated elsewhere
        if (_currentUser.Roles.Any(r => ExemptRoles.Contains(r))) return;

        var scope = _cachedScope ??= await _dataPermission.GetEffectiveScopeAsync(userId.Value);
        if (scope.Unrestricted) return;                               // no group assigned → unchanged behaviour
        if (scope.DepartmentIds.Count == 0 && scope.RoomIds.Count == 0
            && scope.TreatmentTypes.Count == 0 && scope.PatientObjects.Count == 0)
            return;                                                   // group exists but constrains nothing

        // Resolve whichever anchor the caller gave us down to the patient.
        var pid = patientId;
        if (pid is null && medicalRecordId is { } mrId)
            pid = await _context.MedicalRecords.AsNoTracking()
                .Where(m => m.Id == mrId).Select(m => (Guid?)m.PatientId).FirstOrDefaultAsync(ct);
        if (pid is null && admissionId is { } admId)
            pid = await _context.Admissions.AsNoTracking()
                .Where(a => a.Id == admId).Select(a => (Guid?)a.PatientId).FirstOrDefaultAsync(ct);
        if (pid is null || pid == Guid.Empty) return;                 // unknown anchor → the caller answers 404

        if (await IsInScopeAsync(pid.Value, scope, ct)) return;

        _logger.LogWarning("DataScope DENY user={UserId} patient={PatientId}", userId, pid);
        throw new UnauthorizedAccessException(
            "Bệnh nhân này nằm ngoài phạm vi dữ liệu được cấp cho tài khoản của bạn " +
            "(khoa/phòng/loại điều trị). Liên hệ quản trị nếu cần mở rộng phạm vi.");
    }

    public async Task<PatientListScope?> GetListScopeAsync(CancellationToken ct = default)
    {
        // Same fail-open gates as EnsureAsync: anything that returns early there returns null here.
        var userId = _currentUser.UserGuid;
        if (userId is null) return null;
        if (_currentUser.Roles.Any(r => ExemptRoles.Contains(r))) return null;

        var scope = _cachedScope ??= await _dataPermission.GetEffectiveScopeAsync(userId.Value);
        if (scope.Unrestricted) return null;
        if (scope.DepartmentIds.Count == 0 && scope.RoomIds.Count == 0
            && scope.TreatmentTypes.Count == 0 && scope.PatientObjects.Count == 0)
            return null;

        return new PatientListScope
        {
            DepartmentIds = scope.DepartmentIds.ToList(),
            RoomIds = scope.RoomIds.ToList(),
            TreatmentTypes = ParseInts(scope.TreatmentTypes),
            PatientObjects = ParseInts(scope.PatientObjects),
        };
    }

    private async Task<bool> IsInScopeAsync(Guid patientId, Application.DTOs.System.EffectiveDataScopeDto scope, CancellationToken ct)
    {
        var treatmentTypes = ParseInts(scope.TreatmentTypes);
        var patientObjects = ParseInts(scope.PatientObjects);

        var recordHit = await _context.MedicalRecords.AsNoTracking().AnyAsync(m =>
            m.PatientId == patientId && !m.IsDeleted
            && ((scope.DepartmentIds.Count > 0 && m.DepartmentId != null && scope.DepartmentIds.Contains(m.DepartmentId.Value))
                || (scope.RoomIds.Count > 0 && m.RoomId != null && scope.RoomIds.Contains(m.RoomId.Value))
                || (treatmentTypes.Count > 0 && treatmentTypes.Contains(m.TreatmentType))
                || (patientObjects.Count > 0 && patientObjects.Contains(m.PatientType))), ct);
        if (recordHit) return true;

        if (scope.DepartmentIds.Count == 0) return false;
        return await _context.Admissions.AsNoTracking().AnyAsync(a =>
            a.PatientId == patientId && !a.IsDeleted
            && scope.DepartmentIds.Contains(a.DepartmentId), ct);
    }

    /// <summary>Scope values are stored as free text; the columns they filter are ints.</summary>
    private static List<int> ParseInts(List<string> values)
    {
        var result = new List<int>();
        foreach (var v in values)
            if (int.TryParse(v, out var n)) result.Add(n);
        return result;
    }
}
