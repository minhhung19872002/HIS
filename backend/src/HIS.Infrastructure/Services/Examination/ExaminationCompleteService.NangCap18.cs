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

// K4 phien 9 (2026-05-30): tach Section NangCap18 Transfer Room & Doctor Certification (~151 dong)
// khoi ExaminationCompleteService.cs. ZERO runtime change — partial class.
// File goc giu: ctor + 7 DI deps + 2 Private Helper Methods.
public partial class ExaminationCompleteService
{
    #region NangCap18 - Transfer Room & Doctor Certification

    public async Task<HIS.Application.DTOs.NangCap18.TransferPatientRoomResultDto> TransferPatientRoomAsync(Guid examinationId, Guid newRoomId, string? reason, Guid userId)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted);
        if (examination == null)
            return new HIS.Application.DTOs.NangCap18.TransferPatientRoomResultDto { Success = false, Message = "Không tìm thấy lượt khám" };
        // QA-R4: a COMPLETED exam was moved to another room (reproduced live) — the closed visit then shows
        // up on a room it was never examined in. Only an open visit can change rooms.
        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Completed)
            return new HIS.Application.DTOs.NangCap18.TransferPatientRoomResultDto { Success = false, Message = "Lượt khám đã hoàn thành — mở lại kết luận trước khi chuyển phòng" };
        if (examination.Status == HIS.Core.Constants.ExaminationStatus.Cancelled)
            return new HIS.Application.DTOs.NangCap18.TransferPatientRoomResultDto { Success = false, Message = "Lượt khám đã hủy, không chuyển phòng được" };

        var newRoom = await _context.Rooms.FirstOrDefaultAsync(r => r.Id == newRoomId && r.IsActive && !r.IsDeleted);
        if (newRoom == null)
            return new HIS.Application.DTOs.NangCap18.TransferPatientRoomResultDto { Success = false, Message = "Phòng đích không tồn tại hoặc không hoạt động" };

        var oldRoomId = examination.RoomId;
        var oldRoom = await _context.Rooms.FindAsync(oldRoomId);

        // Update examination room
        examination.RoomId = newRoomId;
        // QA-R11: the department stayed the old room's — orders/reports by department then credited the wrong khoa
        // (the POST transfer-room path already updates it).
        examination.DepartmentId = newRoom.DepartmentId;
        examination.UpdatedAt = DateTime.Now;
        examination.UpdatedBy = userId.ToString();
        if (examination.MedicalRecord != null && examination.MedicalRecord.RoomId == oldRoomId)
            examination.MedicalRecord.RoomId = newRoomId;

        // Update QueueTicket room — only a still-open ticket (a completed/skipped one must stay where it was served).
        var ticket = await _context.QueueTickets
            .Where(t => t.MedicalRecordId == examination.MedicalRecordId && t.RoomId == oldRoomId && !t.IsDeleted
                        && t.Status < HIS.Core.Constants.QueueTicketStatus.Completed)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();
        if (ticket != null)
        {
            ticket.RoomId = newRoomId;
            ticket.Status = HIS.Core.Constants.QueueTicketStatus.Waiting;
            ticket.UpdatedAt = DateTime.Now;
            ticket.UpdatedBy = userId.ToString();
        }

        // Create activity log entry
        var log = new ExaminationActivityLog
        {
            Id = Guid.NewGuid(),
            ExaminationId = examinationId,
            ActionType = "TRANSFER_ROOM",
            ActivityType = "TRANSFER_ROOM",
            ActionDescription = $"Chuyển phòng: {oldRoom?.RoomName ?? oldRoomId.ToString()} → {newRoom.RoomName}",
            Description = reason,
            OldValue = oldRoomId.ToString(),
            NewValue = newRoomId.ToString(),
            UserId = userId,
            ActionTime = DateTime.Now,
            ActivityTime = DateTime.Now,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };
        _context.ExaminationActivityLogs.Add(log);

        await _context.SaveChangesAsync();

        return new HIS.Application.DTOs.NangCap18.TransferPatientRoomResultDto
        {
            Success = true,
            Message = "Chuyển phòng thành công",
            ExaminationId = examinationId,
            OldRoomId = oldRoomId,
            NewRoomId = newRoomId,
            OldRoomName = oldRoom?.RoomName,
            NewRoomName = newRoom.RoomName
        };
    }

    public async Task<HIS.Application.DTOs.NangCap18.DoctorCertificationResultDto> CheckDoctorCertificationAsync(Guid doctorId)
    {
        var doctor = await _context.Users.FirstOrDefaultAsync(u => u.Id == doctorId && !u.IsDeleted);
        if (doctor == null)
            return new HIS.Application.DTOs.NangCap18.DoctorCertificationResultDto
            {
                IsValid = false,
                DoctorId = doctorId,
                Message = "Không tìm thấy bác sĩ"
            };

        // Check PracticeLicenses table for valid license matching doctor
        var now = DateTime.Now;
        // QA-R14: a NULL doctor field compared with "==" matched every licence whose column is NULL (EF null
        // semantics) — a doctor with no licence number and no employee code was reported "hợp lệ" with another
        // person's CCHN (13 doctor licences have Cccd NULL) and passed the start-exam CCHN gate. Compare only
        // non-empty values, and prefer the doctor's own licence code over a name/ID-number match.
        var fullName = string.IsNullOrWhiteSpace(doctor.FullName) ? null : doctor.FullName;
        var licenseNo = string.IsNullOrWhiteSpace(doctor.LicenseNumber) ? null : doctor.LicenseNumber;
        var employeeCode = string.IsNullOrWhiteSpace(doctor.EmployeeCode) ? null : doctor.EmployeeCode;
        var license = (fullName ?? licenseNo ?? employeeCode) == null ? null : await _context.PracticeLicenses
            .Where(l => !l.IsDeleted
                && ((fullName != null && l.HolderName == fullName)
                    || (licenseNo != null && l.LicenseCode == licenseNo)
                    || (employeeCode != null && l.Cccd == employeeCode))
                && l.LicenseType == "doctor")
            .OrderByDescending(l => licenseNo != null && l.LicenseCode == licenseNo)
            .ThenByDescending(l => l.ExpiryDate)
            .FirstOrDefaultAsync();

        // Also check User.LicenseNumber field directly
        if (license == null && !string.IsNullOrEmpty(doctor.LicenseNumber))
        {
            license = await _context.PracticeLicenses
                .Where(l => !l.IsDeleted && l.LicenseCode == doctor.LicenseNumber)
                .FirstOrDefaultAsync();
        }

        // QA-R14 (prod safety): doctors who only passed through the old NULL match must not be locked out of
        // start-exam overnight — keep the legacy match as a FLAGGED fallback so admins can link the real CCHN.
        var legacyMatch = false;
        if (license == null)
        {
            license = await _context.PracticeLicenses
                .Where(l => !l.IsDeleted
                    && (l.HolderName == doctor.FullName || l.LicenseCode == doctor.LicenseNumber || l.Cccd == doctor.EmployeeCode)
                    && l.LicenseType == "doctor")
                .OrderByDescending(l => l.ExpiryDate)
                .FirstOrDefaultAsync();
            legacyMatch = license != null;
        }

        // Same safety net when the doctor's own licence row is expired/suspended but the old (lenient) match found a
        // valid one — e.g. renewed under a new number while User.LicenseNumber still holds the old code.
        if (license != null && !legacyMatch && (license.Status != 0 || (license.ExpiryDate.HasValue && license.ExpiryDate.Value < now)))
        {
            var legacy = await _context.PracticeLicenses
                .Where(l => !l.IsDeleted
                    && (l.HolderName == doctor.FullName || l.LicenseCode == doctor.LicenseNumber || l.Cccd == doctor.EmployeeCode)
                    && l.LicenseType == "doctor")
                .OrderByDescending(l => l.ExpiryDate)
                .FirstOrDefaultAsync();
            if (legacy != null && legacy.Status == 0 && (!legacy.ExpiryDate.HasValue || legacy.ExpiryDate.Value >= now))
            {
                license = legacy;
                legacyMatch = true;
            }
        }

        if (license == null)
        {
            return new HIS.Application.DTOs.NangCap18.DoctorCertificationResultDto
            {
                IsValid = false,
                DoctorId = doctorId,
                DoctorName = doctor.FullName,
                LicenseNumber = doctor.LicenseNumber,
                Message = "Bác sĩ chưa có chứng chỉ hành nghề trong hệ thống"
            };
        }

        // Check status
        if (license.Status != 0) // 0=active
        {
            var statusName = license.Status switch { 1 => "hết hạn", 2 => "bị đình chỉ", 3 => "bị thu hồi", _ => "không hợp lệ" };
            return new HIS.Application.DTOs.NangCap18.DoctorCertificationResultDto
            {
                IsValid = false,
                DoctorId = doctorId,
                DoctorName = doctor.FullName,
                LicenseNumber = license.LicenseCode,
                LicenseExpiry = license.ExpiryDate,
                LicenseStatus = statusName,
                Message = $"Chứng chỉ hành nghề đã {statusName}"
            };
        }

        // Check expiry
        if (license.ExpiryDate.HasValue && license.ExpiryDate.Value < now)
        {
            return new HIS.Application.DTOs.NangCap18.DoctorCertificationResultDto
            {
                IsValid = false,
                DoctorId = doctorId,
                DoctorName = doctor.FullName,
                LicenseNumber = license.LicenseCode,
                LicenseExpiry = license.ExpiryDate,
                LicenseStatus = "hết hạn",
                Message = $"Chứng chỉ hành nghề đã hết hạn ngày {license.ExpiryDate.Value:dd/MM/yyyy}"
            };
        }

        return new HIS.Application.DTOs.NangCap18.DoctorCertificationResultDto
        {
            IsValid = true,
            DoctorId = doctorId,
            DoctorName = doctor.FullName,
            LicenseNumber = license.LicenseCode,
            LicenseExpiry = license.ExpiryDate,
            LicenseStatus = "active",
            Message = legacyMatch
                ? "CẢNH BÁO: chưa liên kết được CCHN của chính bác sĩ (đang khớp tạm theo dữ liệu thiếu) — cập nhật số CCHN trong hồ sơ người dùng."
                : "Chứng chỉ hành nghề hợp lệ"
        };
    }

    #endregion
}
