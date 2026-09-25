using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Security;
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
            patient = await _context.Patients
                .Where(p => !p.IsDeleted)
                .FindByIdentityNumberDecryptedAsync(idNumber);

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
            .Where(u => u.IsActive && u.UserType == 1); // Type 1 = Bác sĩ (User.cs); type 2 là ĐIỀU DƯỠNG

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
        // QA-R11: echoed the body back with 200 and saved nothing. The only stored setting is the room's daily
        // capacity (Rooms.MaxPatients); the other flags are fixed, and the response now says what is really in force.
        var room = await _context.Rooms.FirstOrDefaultAsync(r => r.Id == roomId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng khám");
        if (config.MaxPatientsPerDay <= 0)
            throw new ArgumentException("Số bệnh nhân tối đa/ngày phải lớn hơn 0", nameof(config.MaxPatientsPerDay));
        room.MaxPatients = config.MaxPatientsPerDay;
        await _unitOfWork.SaveChangesAsync();
        return await GetRoomExaminationConfigAsync(roomId);
    }

    public async Task<bool> SignExaminationAsync(Guid examinationId, string signature)
    {
        // QA-R6: this stub answered "signed" without signing anything. Clinical signing lives in the
        // digital-signature module; say so instead of faking success.
        await Task.CompletedTask;
        throw new NotSupportedException("Ký số lượt khám thực hiện tại phân hệ Ký số (digital-signature), không qua API này");
    }

    public async Task<SignatureVerificationResult> VerifyExaminationSignatureAsync(Guid examinationId)
    {
        return new SignatureVerificationResult { IsValid = false };
    }

    public async Task<bool> SendResultNotificationAsync(Guid examinationId, string channel)
    {
        // QA-R11: answered "sent" without sending anything. No channel is wired for examination results yet.
        await Task.CompletedTask;
        throw new NotSupportedException("Gửi kết quả khám qua SMS/email chưa được kết nối — in phiếu hoặc dùng Cổng bệnh nhân");
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
