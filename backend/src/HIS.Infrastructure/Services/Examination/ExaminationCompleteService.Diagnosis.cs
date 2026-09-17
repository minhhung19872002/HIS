using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using ServiceDto = HIS.Application.Services.ServiceDto;
using RoomDto = HIS.Application.Services.RoomDto;
using MedicineDto = HIS.Application.Services.MedicineDto;
using DoctorDto = HIS.Application.Services.DoctorDto;
using ExamWarehouseDto = HIS.Application.Services.ExamWarehouseDto;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K4 phien 6 (2026-05-30): tach Section 2.4 Diagnosis + 2.5 Additional Examination (~329 dong)
// khoi ExaminationCompleteService.cs. ZERO runtime change — partial class.
public partial class ExaminationCompleteService
{
    #region 2.4 Diagnosis

    public async Task<List<DiagnosisFullDto>> GetDiagnosesAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return new List<DiagnosisFullDto>();

        var diagnoses = new List<DiagnosisFullDto>();

        if (!string.IsNullOrEmpty(examination.MainIcdCode))
        {
            diagnoses.Add(new DiagnosisFullDto
            {
                Id = Guid.NewGuid(),
                ExaminationId = examinationId,
                IcdCode = examination.MainIcdCode,
                IcdName = examination.MainDiagnosis ?? "",
                IsPrimary = true,
                DiagnosisType = 2
            });
        }

        // Secondary diagnoses (ICD kèm theo) are stored as "I10,E11" + "name1; name2" but were never
        // returned, so the OPD screen reloaded with only the primary ICD and the doctor could not
        // see — or remove — the secondary ones that still went onto the record.
        if (!string.IsNullOrWhiteSpace(examination.SubIcdCodes))
        {
            var codes = examination.SubIcdCodes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var names = (examination.SubDiagnosis ?? string.Empty).Split("; ");
            for (var i = 0; i < codes.Length; i++)
            {
                diagnoses.Add(new DiagnosisFullDto
                {
                    Id = Guid.NewGuid(),
                    ExaminationId = examinationId,
                    IcdCode = codes[i],
                    IcdName = i < names.Length ? names[i] : "",
                    IsPrimary = false,
                    DiagnosisType = 2,
                    Order = i + 1
                });
            }
        }

        return diagnoses;
    }

    public async Task<DiagnosisFullDto> AddDiagnosisAsync(Guid examinationId, DiagnosisFullDto dto)
    {
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, examinationId); // TT46
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new KeyNotFoundException("Examination not found");

        if (dto.IsPrimary)
        {
            examination.MainIcdCode = dto.IcdCode;
            examination.MainDiagnosis = dto.IcdName;
        }
        else
        {
            examination.SubIcdCodes = string.IsNullOrEmpty(examination.SubIcdCodes)
                ? dto.IcdCode
                : $"{examination.SubIcdCodes},{dto.IcdCode}";
            examination.SubDiagnosis = string.IsNullOrEmpty(examination.SubDiagnosis)
                ? dto.IcdName
                : $"{examination.SubDiagnosis}; {dto.IcdName}";
        }

        // Entity is already tracked: no repo.UpdateAsync (it marks ALL columns modified, so parallel OPD saves overwrote each other).
        await _unitOfWork.SaveChangesAsync();

        dto.Id = Guid.NewGuid();
        dto.ExaminationId = examinationId;
        return dto;
    }

    public async Task<DiagnosisFullDto> UpdateDiagnosisAsync(Guid diagnosisId, DiagnosisFullDto dto)
    {
        dto.Id = diagnosisId;
        return dto;
    }

    public async Task<bool> DeleteDiagnosisAsync(Guid diagnosisId)
    {
        // QA-R6: this stub answered "deleted" without deleting. Diagnoses are stored on the examination
        // (MainIcdCode/SubIcdCodes) and are replaced as a list via PUT {examinationId}/diagnoses/batch.
        await Task.CompletedTask;
        throw new NotSupportedException("Xóa chẩn đoán: cập nhật lại danh sách chẩn đoán của lượt khám (diagnoses/batch)");
    }

    public async Task<List<DiagnosisFullDto>> UpdateDiagnosisListAsync(Guid examinationId, UpdateDiagnosisDto dto)
    {
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, examinationId); // TT46
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new KeyNotFoundException("Examination not found");

        // The OPD screen does not send PreliminaryDiagnosis; a missing field must not wipe it.
        if (dto.PreliminaryDiagnosis != null)
            examination.InitialDiagnosis = dto.PreliminaryDiagnosis;
        // This is a full-list replace (both callers send the whole current list). Previously an empty
        // list left the old secondary ICDs in place, so a diagnosis the doctor removed stayed on the
        // record (and on the BHYT claim).
        var secondaries = (dto.SecondaryDiagnoses ?? new List<SecondaryDiagnosisDto>())
            .Where(d => !string.IsNullOrWhiteSpace(d.IcdCode))
            .ToList();

        // Guard against an UNLOADED form: no primary AND no secondary sent while the exam already has
        // diagnoses means the screen never received them (e.g. GET diagnoses failed) — a doctor cannot
        // conclude without a primary ICD anyway. Keep what is stored instead of erasing everything.
        var looksUnloaded = string.IsNullOrWhiteSpace(dto.PrimaryIcdCode) && secondaries.Count == 0
            && (!string.IsNullOrWhiteSpace(examination.MainIcdCode) || !string.IsNullOrWhiteSpace(examination.SubIcdCodes));
        if (!looksUnloaded)
        {
            examination.MainIcdCode = dto.PrimaryIcdCode;
            examination.MainDiagnosis = dto.PrimaryDiagnosis;
            examination.SubIcdCodes = secondaries.Count > 0 ? string.Join(",", secondaries.Select(d => d.IcdCode.Trim())) : null;
            examination.SubDiagnosis = secondaries.Count > 0 ? string.Join("; ", secondaries.Select(d => d.DiagnosisName)) : null;
        }

        // Entity is already tracked: no repo.UpdateAsync (it marks ALL columns modified, so parallel OPD saves overwrote each other).
        await _unitOfWork.SaveChangesAsync();

        return await GetDiagnosesAsync(examinationId);
    }

    public async Task<DiagnosisFullDto> SetPrimaryDiagnosisAsync(Guid diagnosisId)
    {
        return new DiagnosisFullDto { Id = diagnosisId, IsPrimary = true };
    }

    /// <summary>
    /// Bỏ dấu tiếng Việt. PHẢI khớp đúng cách migration 192 sinh cột NameNoDiacritics:
    /// đổi Đ/đ → D/d trước, rồi tách tổ hợp Unicode (NFD) và loại các dấu thanh/dấu mũ.
    /// Lệch cách bỏ dấu giữa hai bên là từ khoá không bao giờ khớp dữ liệu.
    /// </summary>
    private static string RemoveDiacritics(string s)
    {
        if (string.IsNullOrEmpty(s)) return string.Empty;
        var normalized = s.Replace('Đ', 'D').Replace('đ', 'd')
            .Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch)
                != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }
        return sb.ToString();
    }

    public async Task<List<IcdCodeFullDto>> SearchIcdCodesAsync(string keyword, int? icdType = null, int limit = 20)
    {
        // TÌM KHÔNG DẤU: DB dùng collation Vietnamese_CI_AS — CI = không phân biệt hoa/thường
        // nhưng AS = PHÂN BIỆT DẤU, nên gõ "tang huyet ap" KHÔNG khớp "tăng huyết áp".
        // Bác sĩ đang khám gõ nhanh không dấu là ra rỗng. So thêm trên cột NameNoDiacritics
        // (migration 192) sau khi bỏ dấu chính từ khoá người dùng gõ.
        var kw = (keyword ?? string.Empty).Trim();
        var kwNoDiacritics = RemoveDiacritics(kw);

        var query = _context.IcdCodes.Where(i => !i.IsDeleted && i.IsActive);
        if (kw.Length > 0)
        {
            query = query.Where(i =>
                i.Code.Contains(kw)
                || i.Name.Contains(kw)
                || (i.NameEnglish != null && i.NameEnglish.Contains(kw))
                || (i.NameNoDiacritics != null && i.NameNoDiacritics.Contains(kwNoDiacritics)));
        }

        // SẮP THEO ĐỘ KHỚP: trước đây lấy nguyên thứ tự DB rồi Take(limit) → gõ "tăng huyết áp"
        // thì "O12 Phù thai kỳ" lên trước "I10 Tăng huyết áp vô căn". Mã khớp chính xác lên đầu,
        // rồi tới mã bắt đầu bằng từ khoá, rồi tên bắt đầu bằng từ khoá, cuối cùng mới là chứa.
        var codes = await query
            .OrderBy(i =>
                i.Code == kw ? 0
                : i.Code.StartsWith(kw) ? 1
                : i.Name.StartsWith(kw) ? 2
                : (i.NameNoDiacritics != null && i.NameNoDiacritics.StartsWith(kwNoDiacritics)) ? 3
                : 4)
            .ThenBy(i => i.Code)
            .Take(limit)
            .ToListAsync();

        return codes.Select(i => new IcdCodeFullDto
        {
            Code = i.Code,
            Name = i.Name,
            EnglishName = i.NameEnglish,
            IcdType = 1,
            ChapterCode = i.ChapterCode,
            ChapterName = i.ChapterName,
            IsActive = i.IsActive
        }).ToList();
    }

    public async Task<IcdCodeFullDto?> GetIcdByCodeAsync(string code)
    {
        var icd = await _context.IcdCodes.FirstOrDefaultAsync(i => i.Code == code);
        if (icd == null) return null;

        return new IcdCodeFullDto
        {
            Code = icd.Code,
            Name = icd.Name,
            EnglishName = icd.NameEnglish,
            IcdType = 1,
            IsActive = icd.IsActive
        };
    }

    public async Task<List<IcdCodeFullDto>> GetFrequentIcdCodesAsync(Guid? departmentId = null, int limit = 20)
    {
        // Get ICD codes most frequently used in examinations
        var query = _context.Examinations
            .Where(e => !e.IsDeleted && e.MainIcdCode != null);

        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        var frequentCodes = await query
            .GroupBy(e => e.MainIcdCode)
            .OrderByDescending(g => g.Count())
            .Take(limit)
            .Select(g => g.Key!)
            .ToListAsync();

        if (frequentCodes.Count == 0)
            return await SearchIcdCodesAsync("", null, limit);

        var icdCodes = await _context.Set<IcdCode>()
            .Where(i => frequentCodes.Contains(i.Code) && i.IsActive)
            .ToListAsync();

        // Sort by frequency order
        return icdCodes
            .OrderBy(i => frequentCodes.IndexOf(i.Code))
            .Select(i => new IcdCodeFullDto
            {
                Code = i.Code,
                Name = i.Name,
                EnglishName = i.NameEnglish,
                IcdType = i.IcdType,
                ChapterCode = i.ChapterCode,
                ChapterName = i.ChapterName,
                GroupCode = i.GroupCode,
                GroupName = i.GroupName,
                IsActive = i.IsActive
            })
            .ToList();
    }

    public async Task<List<IcdCodeFullDto>> SuggestIcdCodesAsync(string symptoms)
    {
        return await SearchIcdCodesAsync(symptoms, null, 10);
    }

    public async Task<List<IcdCodeFullDto>> GetRecentIcdCodesAsync(Guid doctorId, int limit = 20)
    {
        // Most-recent distinct ICD codes used by this doctor in their last
        // examinations (across last 90 days).
        var since = DateTime.UtcNow.AddDays(-90);
        var recentCodes = await _context.Examinations
            .Where(e => e.DoctorId == doctorId
                        && !string.IsNullOrEmpty(e.MainIcdCode)
                        && e.CreatedAt >= since
                        && !e.IsDeleted)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => e.MainIcdCode!)
            .Distinct()
            .Take(limit)
            .ToListAsync();
        if (recentCodes.Count == 0) return new List<IcdCodeFullDto>();

        var icdRows = await _context.IcdCodes
            .Where(c => recentCodes.Contains(c.Code) && !c.IsDeleted)
            .ToListAsync();

        // Preserve order by recent usage
        return recentCodes
            .Select(code => icdRows.FirstOrDefault(c => c.Code == code))
            .Where(c => c != null)
            .Select(c => new IcdCodeFullDto
            {
                Code = c!.Code,
                Name = c.Name,
                EnglishName = c.NameEnglish,
                IcdType = 1,
                ChapterCode = c.ChapterCode,
                ChapterName = c.ChapterName,
                IsActive = c.IsActive,
                RequiresExternalCause = false,
            })
            .ToList();
    }

    public async Task<List<IcdCodeFullDto>> SearchExternalCauseCodesAsync(string keyword)
    {
        return await SearchIcdCodesAsync(keyword, null, 20);
    }

    #endregion

    #region 2.5 Additional Examination

    public async Task<Application.DTOs.ExaminationDto> CreateAdditionalExaminationAsync(AdditionalExaminationDto dto)
    {
        var originalExam = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == dto.OriginalExaminationId);

        if (originalExam == null) throw new KeyNotFoundException("Original examination not found");

        var newRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == dto.NewRoomId);

        var newExam = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = originalExam.MedicalRecordId,
            ExaminationType = 2, // Additional
            DepartmentId = newRoom?.DepartmentId ?? originalExam.DepartmentId,
            RoomId = dto.NewRoomId,
            DoctorId = dto.NewDoctorId,
            ChiefComplaint = dto.Reason,
            Status = 0
        };

        await _examinationRepo.AddAsync(newExam);
        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(newExam);
    }

    public async Task<Application.DTOs.ExaminationDto> TransferRoomAsync(TransferRoomRequestDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId);

        if (examination == null) throw new KeyNotFoundException("Examination not found");
        // QA-R4: a finished/cancelled exam could still be moved, and an unknown room surfaced as an FK 500.
        EnsureExaminationOpenForRoomChange(examination.Status);

        var newRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == dto.NewRoomId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng khám đích");

        examination.RoomId = dto.NewRoomId;
        examination.DepartmentId = newRoom.DepartmentId;
        if (dto.NewDoctorId.HasValue)
            examination.DoctorId = dto.NewDoctorId;

        // Entity is already tracked: no repo.UpdateAsync (it marks ALL columns modified, so parallel OPD saves overwrote each other).
        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    public async Task<Application.DTOs.ExaminationDto> TransferPrimaryExaminationAsync(Guid examinationId, Guid newRoomId)
    {
        return await TransferRoomAsync(new TransferRoomRequestDto
        {
            ExaminationId = examinationId,
            NewRoomId = newRoomId
        });
    }

    public async Task<List<Application.DTOs.ExaminationDto>> GetAdditionalExaminationsAsync(Guid primaryExaminationId)
    {
        var primaryExam = await _examinationRepo.GetByIdAsync(primaryExaminationId);
        if (primaryExam == null) return new List<Application.DTOs.ExaminationDto>();

        var additionalExams = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Include(e => e.Room)
            .Where(e => e.MedicalRecordId == primaryExam.MedicalRecordId && e.ExaminationType == 2)
            .ToBoundedListAsync("ExaminationCompleteService.GetAdditionalExaminationsAsync");

        return additionalExams.Select(MapToExaminationDto).ToList();
    }

    /// <summary>A room change only makes sense while the visit is still open.</summary>
    private static void EnsureExaminationOpenForRoomChange(int status)
    {
        if (status == HIS.Core.Constants.ExaminationStatus.Completed)
            throw new InvalidOperationException("Lượt khám đã hoàn thành — nhờ Quản trị/Trưởng khoa mở lại kết luận trước khi chuyển phòng.");
        if (status == HIS.Core.Constants.ExaminationStatus.Cancelled)
            throw new InvalidOperationException("Lượt khám đã hủy, không chuyển phòng được.");
    }

    public async Task<bool> CancelAdditionalExaminationAsync(Guid examinationId, string reason)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return false;

        // QA-R4: this endpoint had no guard at all — it cancelled the PRIMARY exam, even a COMPLETED one,
        // bypassing every rule in CancelExaminationAsync and the TT46 lock (reproduced live). Only an
        // additional exam (khám thêm) that is still open may be cancelled here.
        if (examination.ExaminationType == 1)
            throw new InvalidOperationException("Đây là lượt khám chính — dùng chức năng hủy lượt khám.");
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, examinationId);
        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Cancelled)
            throw new InvalidOperationException("Lượt khám thêm đã hủy trước đó rồi.");
        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Completed)
            throw new InvalidOperationException("Lượt khám thêm đã hoàn thành, không hủy thẳng được.");

        examination.Status = 5; // Cancelled
        // Same fix as CancelExaminationAsync (#218/T3): the reason goes to CancelReason, not over the
        // doctor's conclusion.
        examination.CancelReason = reason;

        // Entity is already tracked: no repo.UpdateAsync (it marks ALL columns modified, so parallel OPD saves overwrote each other).
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<Application.DTOs.ExaminationDto> CompleteAdditionalExaminationAsync(Guid examinationId)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new KeyNotFoundException("Examination not found");

        // QA-R4: no guard here either — it "completed" a CANCELLED primary exam (Status 5 → 4, reproduced
        // live), skipping the diagnosis/conclusion validation of CompleteExaminationAsync.
        if (examination.ExaminationType == 1)
            throw new InvalidOperationException("Đây là lượt khám chính — dùng chức năng hoàn thành khám (kết luận).");
        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Cancelled)
            throw new InvalidOperationException("Lượt khám thêm đã hủy, không hoàn thành được.");
        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Completed)
            return MapToExaminationDto(examination); // idempotent double-click

        examination.Status = 4; // Completed
        examination.EndTime = DateTime.Now;

        // Entity is already tracked: no repo.UpdateAsync (it marks ALL columns modified, so parallel OPD saves overwrote each other).
        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    #endregion
}
