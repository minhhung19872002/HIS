using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// AUTHZ-3 (#369): quan hệ điều trị từ 4 nguồn encounter (OR bất kỳ):
/// 1. MedicalRecord.DoctorId — BS điều trị hồ sơ (mở, hoặc đóng trong grace-days)
/// 2. Examination.DoctorId — BS khám lượt khám trong grace-days
/// 3. Admission.AdmittingDoctorId — BS nhận nội trú (đang điều trị / trong grace-days)
/// 4. ServiceRequest.DoctorId — BS chỉ định CLS trong grace-days
/// (Hội chẩn/ConsultationParticipant: bổ sung khi wire enforcement — increment-3.)
/// </summary>
public class TreatmentRelationshipService : ITreatmentRelationshipService
{
    private readonly HISDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TreatmentRelationshipService> _logger;

    // Role lâm sàng BỊ scope bởi quan hệ điều trị. Admin/Cashier… không nằm đây —
    // họ bị chặn bởi permission (#367), không phải quan hệ điều trị.
    private static readonly string[] ScopedRoles = { "DOCTOR", "NURSE", "Doctor", "Nurse" };

    public TreatmentRelationshipService(
        HISDbContext context, IConfiguration configuration, ILogger<TreatmentRelationshipService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    private int GraceDays => int.TryParse(_configuration["Auth:TreatmentRelationshipGraceDays"], out var d) ? d : 30;
    private bool Enabled => string.Equals(
        _configuration["Auth:TreatmentRelationshipEnabled"], "true", StringComparison.OrdinalIgnoreCase);

    public async Task<bool> HasRelationshipAsync(Guid userId, Guid patientId)
    {
        var since = DateTime.Now.AddDays(-GraceDays);

        // 1. Hồ sơ bệnh án BS đang/vừa điều trị
        var viaRecord = await _context.MedicalRecords.AnyAsync(r =>
            r.PatientId == patientId && r.DoctorId == userId
            && (r.DischargeDate == null || r.DischargeDate >= since));
        if (viaRecord) return true;

        // 2. Lượt khám BS thực hiện trong grace-window
        var viaExam = await _context.Examinations.AnyAsync(e =>
            e.DoctorId == userId && e.MedicalRecord.PatientId == patientId
            && (e.EndTime == null || e.EndTime >= since));
        if (viaExam) return true;

        // 3. Nội trú BS nhận (đang điều trị 0/5/6, hoặc nhập viện trong grace-window)
        var viaAdmission = await _context.Admissions.AnyAsync(a =>
            a.PatientId == patientId && a.AdmittingDoctorId == userId
            && (a.Status == 0 || a.Status == 5 || a.Status == 6 || a.AdmissionDate >= since));
        if (viaAdmission) return true;

        // 4. Chỉ định CLS của BS trong grace-window
        var viaRequest = await _context.ServiceRequests.AnyAsync(sr =>
            sr.DoctorId == userId && sr.MedicalRecord.PatientId == patientId
            && sr.RequestDate >= since);
        return viaRequest;
    }

    public async Task EnsureCanAccessPatientAsync(Guid userId, IReadOnlyList<string> roles, Guid patientId)
    {
        if (!Enabled) return;
        if (roles == null || !roles.Any(r => ScopedRoles.Contains(r))) return;
        // ORG/BRANCH scope trên lượt gán role (UserRoles.ScopeType, migration 146) = miễn trừ:
        // trưởng khoa/giám đốc chuyên môn xem rộng hơn quan hệ điều trị trực tiếp.
        var wideScope = await _context.UserRoles.AnyAsync(ur =>
            ur.UserId == userId && (ur.ScopeType == "ORG" || ur.ScopeType == "BRANCH" || ur.ScopeType == "DEPT"));
        if (wideScope) return; // backfill 146 = ORG → hành vi hiện tại giữ nguyên tới khi admin thu hẹp scope

        if (await HasRelationshipAsync(userId, patientId)) return;

        _logger.LogWarning("TreatmentRelationship DENY user={UserId} patient={PatientId}", userId, patientId);
        throw new UnauthorizedAccessException(
            "Bạn không có quan hệ điều trị còn hiệu lực với bệnh nhân này (AUTHZ-3). " +
            "Truy cập khẩn cấp dùng cơ chế Break-glass (khi được bật).");
    }
}
