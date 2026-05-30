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

// K4 phien 8 (2026-05-30): tach Section 2.10 Additional Functions (~134 dong)
// khoi ExaminationCompleteService.cs. ZERO runtime change — partial class.
public partial class ExaminationCompleteService
{
    #region 2.10 Additional Functions

    public async Task<PatientInfoDto?> GetPatientInfoAsync(string? patientCode = null, string? idNumber = null)
    {
        Patient? patient = null;

        if (!string.IsNullOrEmpty(patientCode))
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == patientCode);
        else if (!string.IsNullOrEmpty(idNumber))
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == idNumber);

        if (patient == null) return null;

        return new PatientInfoDto
        {
            Id = patient.Id,
            PatientCode = patient.PatientCode,
            FullName = patient.FullName,
            Gender = patient.Gender,
            DateOfBirth = patient.DateOfBirth,
            Age = CalculateAge(patient.DateOfBirth, patient.YearOfBirth),
            PhoneNumber = patient.PhoneNumber,
            Address = patient.Address,
            Occupation = patient.Occupation,
            PhotoUrl = patient.PhotoPath
        };
    }

    public async Task<List<RoomDto>> GetActiveExaminationRoomsAsync(Guid? departmentId = null)
    {
        var query = _context.Rooms
            .Include(r => r.Department)
            .Where(r => r.IsActive && r.RoomType == 1); // Examination rooms

        if (departmentId.HasValue)
            query = query.Where(r => r.DepartmentId == departmentId.Value);

        var rooms = await query.ToListAsync();

        return rooms.Select(r => new RoomDto
        {
            Id = r.Id,
            Code = r.RoomCode,
            Name = r.RoomName,
            DepartmentId = r.DepartmentId,
            DepartmentName = r.Department.DepartmentName,
            RoomType = r.RoomType,
            IsActive = r.IsActive
        }).ToList();
    }

    public async Task<List<DoctorDto>> GetOnDutyDoctorsAsync(Guid? departmentId = null)
    {
        var query = _context.Users
            .Include(u => u.Department)
            .Where(u => u.IsActive && u.UserType == 2); // Doctors

        if (departmentId.HasValue)
            query = query.Where(u => u.DepartmentId == departmentId.Value);

        var doctors = await query.ToListAsync();

        return doctors.Select(d => new DoctorDto
        {
            Id = d.Id,
            Code = d.UserCode,
            Name = d.FullName,
            Title = d.Title,
            Specialty = d.Specialty,
            DepartmentId = d.DepartmentId,
            DepartmentName = d.Department?.DepartmentName,
            IsOnDuty = true
        }).ToList();
    }

    public async Task<RoomExaminationConfigDto> GetRoomExaminationConfigAsync(Guid roomId)
    {
        var room = await _roomRepo.GetByIdAsync(roomId);

        return new RoomExaminationConfigDto
        {
            RoomId = roomId,
            MaxPatientsPerDay = room?.MaxPatients ?? 50,
            AverageExaminationMinutes = 15,
            AutoCallNext = true,
            RequireVitalSigns = true,
            RequireDiagnosis = true
        };
    }

    public async Task<RoomExaminationConfigDto> UpdateRoomExaminationConfigAsync(Guid roomId, RoomExaminationConfigDto config)
    {
        config.RoomId = roomId;
        return config;
    }

    public async Task<bool> SignExaminationAsync(Guid examinationId, string signature)
    {
        return true;
    }

    public async Task<SignatureVerificationResult> VerifyExaminationSignatureAsync(Guid examinationId)
    {
        return new SignatureVerificationResult { IsValid = false };
    }

    public async Task<bool> SendResultNotificationAsync(Guid examinationId, string channel)
    {
        return true;
    }

    public async Task<List<ExaminationActivityLogDto>> GetExaminationLogsAsync(Guid examinationId)
    {
        return await _context.ExaminationActivityLogs
            .Include(l => l.User)
            .Where(l => l.ExaminationId == examinationId)
            .OrderByDescending(l => l.ActionTime)
            .Select(l => new ExaminationActivityLogDto
            {
                Id = l.Id,
                ExaminationId = l.ExaminationId,
                ActionType = l.ActionType,
                ActionDescription = l.ActionDescription,
                OldValue = l.OldValue,
                NewValue = l.NewValue,
                ActionTime = l.ActionTime,
                UserId = l.UserId,
                UserName = l.User != null ? l.User.FullName : null,
                IpAddress = l.IpAddress
            })
            .ToListAsync();
    }

    #endregion
}
