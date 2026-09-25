using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Inpatient;
using HIS.Core.Constants;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap26 — XIX.2 #20: TÁCH ĐIỀU TRỊ NỘI TRÚ tại khoa/phòng cấp cứu.
///
/// Bệnh nhân lưu cấp cứu sau đó chuyển thành đợt nội trú riêng: đợt cấp cứu được
/// chốt tại mốc tách, mọi chỉ định phát sinh SAU mốc chuyển sang hồ sơ nội trú mới.
/// Nhờ đó viện phí và hồ sơ BHYT của 2 đợt tách bạch đúng quy định.
///
/// ⚠️ Chạm viện phí + hồ sơ BHYT: chặn tách khi đợt đã duyệt BHYT / đã thanh toán.
/// </summary>
public partial class InpatientCompleteService
{
    public async Task<SplitEmergencyResultDto> SplitEmergencyToInpatientAsync(SplitEmergencyToInpatientDto dto, Guid userId)
    {
        var source = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == dto.SourceMedicalRecordId && !m.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy hồ sơ cấp cứu cần tách.");

        // ── Guard 1: đợt đã thanh toán/hủy thì không tách ──
        if (source.Status == 4)
            throw new InvalidOperationException("Đợt đã thanh toán — không tách được. Hãy hoàn tác thanh toán trước.");
        if (source.Status == 6)
            throw new InvalidOperationException("Đợt đã hủy — không tách được.");

        // ── Guard 2: đã duyệt BHYT / đã gửi hồ sơ thì khóa số liệu ──
        var claimApproved = await _context.InsuranceClaims
            .AnyAsync(c => c.MedicalRecordId == source.Id && !c.IsDeleted && c.ClaimStatus >= 1);
        if (claimApproved)
            throw new InvalidOperationException("Hồ sơ đã duyệt/gửi BHYT — số liệu đã khóa, không tách được.");

        // QA-R6: a second split of the same (already closed) emergency record created a second active
        // admission for the patient; likewise a patient already in an open inpatient stay.
        if (source.TreatmentType == 2)
            throw new InvalidOperationException("Hồ sơ nguồn đã là hồ sơ nội trú — không tách được.");
        if (await _context.Set<Admission>().AnyAsync(a => a.PatientId == source.PatientId && !a.IsDeleted
                && (a.Status == AdmissionStatus.InTreatment || a.Status == AdmissionStatus.PendingDischarge)))
            throw new InvalidOperationException("Bệnh nhân đang có lượt nội trú chưa kết thúc — không tách thêm được.");
        // QA-R6: the bed was taken without any check (another patient's bed accepted) and no BedAssignment
        // was written, so the ward map never showed the patient on it.
        if (dto.BedId.HasValue)
            await EnsureBedAvailableAsync(dto.BedId.Value, null, dto.DepartmentId);

        var splitAt = dto.SplitAt ?? DateTime.Now;
        if (splitAt < source.AdmissionDate)
            throw new InvalidOperationException("Mốc tách không được sớm hơn thời điểm vào viện của đợt cấp cứu.");

        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            // QA-R11: same per-bed lock as AssignBed — the availability check above could race another assignment.
            if (dto.BedId.HasValue)
            {
                await LockBedAsync(dto.BedId.Value);
                await EnsureBedAvailableAsync(dto.BedId.Value, null, dto.DepartmentId);
            }
            var now = DateTime.Now;

            // 1) Hồ sơ nội trú MỚI, kế thừa thông tin hành chính + BHYT của đợt cấp cứu.
            var target = new MedicalRecord
            {
                Id = Guid.NewGuid(),
                MedicalRecordCode = $"NT{now:yyyyMMddHHmmss}",
                PatientId = source.PatientId,
                AdmissionDate = splitAt,
                TreatmentType = 2, // Nội trú
                Status = 1,        // Đang điều trị
                DepartmentId = dto.DepartmentId,
                RoomId = dto.RoomId,
                BedId = dto.BedId,
                DoctorId = dto.AttendingDoctorId,
                InitialDiagnosis = dto.DiagnosisOnAdmission ?? source.InitialDiagnosis,
                MainDiagnosis = dto.DiagnosisOnAdmission ?? source.MainDiagnosis,
                MainIcdCode = dto.IcdCode ?? source.MainIcdCode,
                InsuranceNumber = source.InsuranceNumber,
                InsuranceExpireDate = source.InsuranceExpireDate,
                InsuranceFacilityCode = source.InsuranceFacilityCode,
                // QA-R11 (MONEY): PatientType was not copied → the new inpatient record was PatientType 0, which
                // BhytVisitPricing treats as non-BHYT: every order of the inpatient stay was billed 100% to the patient.
                PatientType = source.PatientType,
                InsuranceRightRoute = source.InsuranceRightRoute,
                InsuranceCoverageRate = source.InsuranceCoverageRate,
                InsuranceFiveYearContinuous = source.InsuranceFiveYearContinuous,
                ReferralFromFacilityCode = source.ReferralFromFacilityCode,
                ReferralFromFacilityName = source.ReferralFromFacilityName,
                ReferralIcdCode = source.ReferralIcdCode,
                ReferralDate = source.ReferralDate,
                CreatedAt = now,
                CreatedBy = userId.ToString(),
            };
            _context.MedicalRecords.Add(target);

            // 2) Chuyển các chỉ định phát sinh SAU mốc tách sang hồ sơ mới.
            var movedRequests = await _context.ServiceRequests
                .Where(r => r.MedicalRecordId == source.Id && !r.IsDeleted && r.RequestDate >= splitAt)
                .ToListAsync();
            foreach (var r in movedRequests)
            {
                r.MedicalRecordId = target.Id;
                r.UpdatedAt = now;
                r.UpdatedBy = userId.ToString();
            }

            var movedPrescriptions = await _context.Prescriptions
                .Where(p => p.MedicalRecordId == source.Id && !p.IsDeleted && p.PrescriptionDate >= splitAt)
                .ToListAsync();
            foreach (var p in movedPrescriptions)
            {
                p.MedicalRecordId = target.Id;
                p.UpdatedAt = now;
                p.UpdatedBy = userId.ToString();
            }

            // 3) Bản ghi Admission cho đợt nội trú mới.
            var admission = new Admission
            {
                Id = Guid.NewGuid(),
                PatientId = source.PatientId,
                MedicalRecordId = target.Id,
                AdmissionDate = splitAt,
                AdmissionType = 2, // Cấp cứu chuyển vào
                AdmittingDoctorId = dto.AttendingDoctorId,
                DepartmentId = dto.DepartmentId,
                RoomId = dto.RoomId,
                BedId = dto.BedId,
                Status = 0, // Đang điều trị
                CreatedAt = now,
                CreatedBy = userId.ToString(),
            };
            _context.Admissions.Add(admission);
            if (dto.BedId.HasValue)
            {
                _context.Set<BedAssignment>().Add(new BedAssignment
                {
                    Id = Guid.NewGuid(),
                    AdmissionId = admission.Id,
                    BedId = dto.BedId.Value,
                    AssignedAt = splitAt,
                    Status = 0,
                    CreatedAt = now,
                    CreatedBy = userId.ToString(),
                });
            }

            // 4) Chốt đợt cấp cứu tại mốc tách + để lại vết 2 chiều.
            source.DischargeDate = splitAt;
            source.Status = 3; // Hoàn thành
            source.DischargeNote = $"{source.DischargeNote} | [NangCap26] Tách điều trị nội trú {splitAt:dd/MM/yyyy HH:mm} → hồ sơ {target.MedicalRecordCode}".TrimStart(' ', '|');
            source.UpdatedAt = now;
            source.UpdatedBy = userId.ToString();
            target.DischargeNote = $"[NangCap26] Tách từ đợt cấp cứu {source.MedicalRecordCode} lúc {splitAt:dd/MM/yyyy HH:mm}";

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return new SplitEmergencyResultDto
            {
                SourceMedicalRecordId = source.Id,
                SourceMedicalRecordCode = source.MedicalRecordCode,
                TargetMedicalRecordId = target.Id,
                TargetMedicalRecordCode = target.MedicalRecordCode,
                AdmissionId = admission.Id,
                SplitAt = splitAt,
                MovedServiceRequests = movedRequests.Count,
                MovedPrescriptions = movedPrescriptions.Count,
            };
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
