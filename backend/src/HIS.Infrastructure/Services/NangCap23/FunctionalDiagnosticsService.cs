using System.Text.Json;
using System.Text;
using HIS.Application.DTOs.NangCap23;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;
// ============================================================================
// Batch 3.2: Functional Diagnostics
// ============================================================================

public class FunctionalDiagnosticsService : IFunctionalDiagnosticsService
{
    private readonly HISDbContext _db;
    public FunctionalDiagnosticsService(HISDbContext db) { _db = db; }

    private static readonly Dictionary<string, string> _testTypeNames = new()
    {
        ["ECG"] = "Điện tim thường quy",
        ["ECGStress"] = "Điện tim gắng sức",
        ["Endoscopy"] = "Nội soi",
        ["BoneDensity"] = "Đo loãng xương",
        ["EEG"] = "Điện não",
        ["EMG"] = "Điện cơ",
        ["Spirometry"] = "Đo chức năng hô hấp",
        ["Audiometry"] = "Đo thính lực"
    };

    private static string StatusName(int s) => s switch
    {
        0 => "Đã chỉ định", 1 => "Đang thực hiện", 2 => "Đã hoàn thành", 3 => "Đã duyệt", 4 => "Đã hủy", _ => "Khác"
    };

    public async Task<List<FunctionalDiagnosticTestDto>> SearchAsync(string? keyword, string? testType, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.FunctionalDiagnosticTests.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.TestCode.Contains(k));
        }
        if (!string.IsNullOrWhiteSpace(testType)) q = q.Where(x => x.TestType == testType);
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.CreatedAt <= to.Value);

        var rows = await q.OrderByDescending(x => x.CreatedAt).Skip(pageIndex * pageSize).Take(pageSize).ToListAsync();
        var pids = rows.Select(r => r.PatientId).Distinct().ToList();
        var pmap = await _db.Patients.AsNoTracking().Where(p => pids.Contains(p.Id)).Select(p => new { p.Id, p.FullName, p.PatientCode }).ToListAsync();

        return rows.Select(r =>
        {
            var p = pmap.FirstOrDefault(x => x.Id == r.PatientId);
            return new FunctionalDiagnosticTestDto
            {
                Id = r.Id,
                TestCode = r.TestCode,
                PatientId = r.PatientId,
                PatientName = p?.FullName,
                PatientCode = p?.PatientCode,
                TestType = r.TestType,
                TestTypeName = _testTypeNames.TryGetValue(r.TestType, out var n) ? n : r.TestType,
                PerformingDoctorId = r.PerformingDoctorId,
                PerformingDoctorName = r.PerformingDoctorName,
                TechnicianId = r.TechnicianId,
                PerformedAt = r.PerformedAt,
                DeviceName = r.DeviceName,
                DeviceSerialNumber = r.DeviceSerialNumber,
                ClinicalIndication = r.ClinicalIndication,
                Findings = r.Findings,
                Conclusion = r.Conclusion,
                Recommendation = r.Recommendation,
                MeasurementsJson = r.MeasurementsJson,
                ImagesJson = r.ImagesJson,
                Status = r.Status,
                StatusName = StatusName(r.Status),
                VerifiedById = r.VerifiedById,
                VerifiedAt = r.VerifiedAt,
                Notes = r.Notes,
                CreatedAt = r.CreatedAt
            };
        }).ToList();
    }

    public async Task<FunctionalDiagnosticTestDto?> GetByIdAsync(Guid id)
    {
        var r = await _db.FunctionalDiagnosticTests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var p = await _db.Patients.AsNoTracking().Where(x => x.Id == r.PatientId).Select(x => new { x.FullName, x.PatientCode }).FirstOrDefaultAsync();
        return new FunctionalDiagnosticTestDto
        {
            Id = r.Id,
            TestCode = r.TestCode,
            PatientId = r.PatientId,
            PatientName = p?.FullName,
            PatientCode = p?.PatientCode,
            TestType = r.TestType,
            TestTypeName = _testTypeNames.TryGetValue(r.TestType, out var n) ? n : r.TestType,
            PerformingDoctorId = r.PerformingDoctorId,
            PerformingDoctorName = r.PerformingDoctorName,
            TechnicianId = r.TechnicianId,
            PerformedAt = r.PerformedAt,
            DeviceName = r.DeviceName,
            DeviceSerialNumber = r.DeviceSerialNumber,
            ClinicalIndication = r.ClinicalIndication,
            Findings = r.Findings,
            Conclusion = r.Conclusion,
            Recommendation = r.Recommendation,
            MeasurementsJson = r.MeasurementsJson,
            ImagesJson = r.ImagesJson,
            Status = r.Status,
            StatusName = StatusName(r.Status),
            VerifiedById = r.VerifiedById,
            VerifiedAt = r.VerifiedAt,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt
        };
    }

    public async Task<FunctionalDiagnosticTestDto> SaveAsync(SaveFunctionalDiagnosticTestDto dto, string? userId)
    {
        FunctionalDiagnosticTest entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.FunctionalDiagnosticTests.FirstOrDefaultAsync(x => x.Id == dto.Id.Value) ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new FunctionalDiagnosticTest
            {
                Id = Guid.NewGuid(),
                TestCode = $"FDT-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                Status = 0
            };
            _db.FunctionalDiagnosticTests.Add(entity);
        }

        entity.PatientId = dto.PatientId;
        entity.MedicalRecordId = dto.MedicalRecordId;
        entity.ExaminationId = dto.ExaminationId;
        entity.ServiceRequestDetailId = dto.ServiceRequestDetailId;
        entity.TestType = dto.TestType;
        entity.PerformingDoctorId = dto.PerformingDoctorId;
        entity.PerformingDoctorName = dto.PerformingDoctorName;
        entity.TechnicianId = dto.TechnicianId;
        entity.PerformedAt = dto.PerformedAt;
        entity.DeviceName = dto.DeviceName;
        entity.DeviceSerialNumber = dto.DeviceSerialNumber;
        entity.ClinicalIndication = dto.ClinicalIndication;
        entity.Findings = dto.Findings;
        entity.Conclusion = dto.Conclusion;
        entity.Recommendation = dto.Recommendation;
        entity.MeasurementsJson = dto.MeasurementsJson ?? "{}";
        entity.ImagesJson = dto.ImagesJson ?? "[]";
        entity.Notes = dto.Notes;

        if (!string.IsNullOrWhiteSpace(entity.Findings) && entity.Status == 0)
            entity.Status = 1;

        await _db.SaveChangesAsync();
        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task<FunctionalDiagnosticTestDto?> CompleteAsync(Guid id, string? userId)
    {
        var entity = await _db.FunctionalDiagnosticTests.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        entity.Status = 2;
        if (!entity.PerformedAt.HasValue) entity.PerformedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<FunctionalDiagnosticTestDto?> VerifyAsync(Guid id, string? userId)
    {
        var entity = await _db.FunctionalDiagnosticTests.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        // STATE GUARD: chỉ verify được khi đã Completed (status=2)
        Nangcap23StateMachine.EnsureCanVerifyDiagnostic(entity.Status);
        entity.Status = 3;
        entity.VerifiedAt = DateTime.UtcNow;
        if (Guid.TryParse(userId, out var g)) entity.VerifiedById = g;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id, string? userId)
    {
        var entity = await _db.FunctionalDiagnosticTests.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return true;
    }
}

