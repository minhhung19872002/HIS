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

        return diagnoses;
    }

    public async Task<DiagnosisFullDto> AddDiagnosisAsync(Guid examinationId, DiagnosisFullDto dto)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new Exception("Examination not found");

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

        await _examinationRepo.UpdateAsync(examination);
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
        return true;
    }

    public async Task<List<DiagnosisFullDto>> UpdateDiagnosisListAsync(Guid examinationId, UpdateDiagnosisDto dto)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) throw new Exception("Examination not found");

        examination.InitialDiagnosis = dto.PreliminaryDiagnosis;
        examination.MainIcdCode = dto.PrimaryIcdCode;
        examination.MainDiagnosis = dto.PrimaryDiagnosis;

        if (dto.SecondaryDiagnoses?.Any() == true)
        {
            examination.SubIcdCodes = string.Join(",", dto.SecondaryDiagnoses.Select(d => d.IcdCode));
            examination.SubDiagnosis = string.Join("; ", dto.SecondaryDiagnoses.Select(d => d.DiagnosisName));
        }

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return await GetDiagnosesAsync(examinationId);
    }

    public async Task<DiagnosisFullDto> SetPrimaryDiagnosisAsync(Guid diagnosisId)
    {
        return new DiagnosisFullDto { Id = diagnosisId, IsPrimary = true };
    }

    public async Task<List<IcdCodeFullDto>> SearchIcdCodesAsync(string keyword, int? icdType = null, int limit = 20)
    {
        var codes = await _context.IcdCodes
            .Where(i => i.Code.Contains(keyword) || i.Name.Contains(keyword) || (i.NameEnglish != null && i.NameEnglish.Contains(keyword)))
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

        if (originalExam == null) throw new Exception("Original examination not found");

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

        if (examination == null) throw new Exception("Examination not found");

        var newRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == dto.NewRoomId);

        examination.RoomId = dto.NewRoomId;
        examination.DepartmentId = newRoom?.DepartmentId ?? examination.DepartmentId;
        if (dto.NewDoctorId.HasValue)
            examination.DoctorId = dto.NewDoctorId;

        await _examinationRepo.UpdateAsync(examination);
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
            .ToListAsync();

        return additionalExams.Select(MapToExaminationDto).ToList();
    }

    public async Task<bool> CancelAdditionalExaminationAsync(Guid examinationId, string reason)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return false;

        examination.Status = 5; // Cancelled
        examination.ConclusionNote = reason;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<Application.DTOs.ExaminationDto> CompleteAdditionalExaminationAsync(Guid examinationId)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new Exception("Examination not found");

        examination.Status = 4; // Completed
        examination.EndTime = DateTime.Now;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    #endregion
}
