namespace HIS.Application.Services;

/// <summary>
/// AUTHZ-3 (#369) increment-2: QUAN HỆ ĐIỀU TRỊ — rule ABAC trung tâm của HIS.
/// BS đọc/ghi được BN khi tồn tại encounter mà BS được phân công điều trị / chỉ định /
/// được mời hội chẩn; hiệu lực kéo dài thêm grace-days sau khi encounter đóng
/// (config `Auth:TreatmentRelationshipGraceDays`, mặc định 30).
/// KHÔNG dùng CreatedBy (audit ≠ quan hệ điều trị). Enforcement bật qua
/// `Auth:TreatmentRelationshipEnabled` (mặc định FALSE — bật ở increment-3 kèm smoke).
/// </summary>
public interface ITreatmentRelationshipService
{
    /// <summary>User (bác sĩ/điều dưỡng) có quan hệ điều trị còn hiệu lực với BN không.</summary>
    Task<bool> HasRelationshipAsync(Guid userId, Guid patientId);

    /// <summary>
    /// Guard dùng ở service lâm sàng: enforcement TẮT / user không phải role lâm sàng
    /// bị scope (DOCTOR/NURSE) / có quan hệ → pass. Ngược lại throw UnauthorizedAccessException
    /// (controller filter map → 403). Emergency/Break-glass bypass thuộc AUTHZ-4 (#370).
    /// </summary>
    Task EnsureCanAccessPatientAsync(Guid userId, IReadOnlyList<string> roles, Guid patientId);
}
