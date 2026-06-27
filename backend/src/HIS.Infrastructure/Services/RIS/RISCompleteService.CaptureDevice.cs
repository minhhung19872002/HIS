using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K3 phien 3 (2026-05-30): tach RIS region IV Capture Device Management (~302 dong) khoi
// RISCompleteService.cs. ZERO runtime change — partial class.
public partial class RISCompleteService
{
    #region IV. Capture Device Management - Quản lý thiết bị Capture

    public async Task<List<CaptureDeviceDto>> GetCaptureDevicesAsync(
        string deviceType = null,
        string keyword = null,
        bool? isActive = null)
    {
        var query = _context.Set<RadiologyCaptureDevice>()
            .Include(d => d.Room)
            
            .AsQueryable();

        if (!string.IsNullOrEmpty(deviceType))
            query = query.Where(d => d.DeviceType == deviceType);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(d => d.DeviceName.Contains(keyword) || d.DeviceCode.Contains(keyword));
        if (isActive.HasValue)
            query = query.Where(d => d.IsActive == isActive.Value);

        var devices = await query.OrderBy(d => d.DeviceName).ToListAsync();

        return devices.Select(d => new CaptureDeviceDto
        {
            Id = d.Id,
            DeviceCode = d.DeviceCode,
            DeviceName = d.DeviceName,
            DeviceType = d.DeviceType,
            
            Manufacturer = d.Manufacturer,
            Model = d.Model,
            SerialNumber = d.SerialNumber,
            ConnectionType = d.ConnectionType,
            IpAddress = d.IpAddress,
            Port = d.Port,
            
            
            RoomId = d.RoomId,
            RoomName = d.Room?.RoomName ?? "",
            Status = d.Status,
            LastCommunication = d.LastCommunication,
            IsActive = d.IsActive
        }).ToList();
    }

    public async Task<CaptureDeviceDto> SaveCaptureDeviceAsync(SaveCaptureDeviceDto dto)
    {
        RadiologyCaptureDevice device;
        if (dto.Id.HasValue)
        {
            device = await _context.Set<RadiologyCaptureDevice>().FindAsync(dto.Id.Value);
            if (device == null) return null;
        }
        else
        {
            device = new RadiologyCaptureDevice { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyCaptureDevice>().AddAsync(device);
        }

        device.DeviceCode = dto.DeviceCode;
        device.DeviceName = dto.DeviceName;
        device.DeviceType = dto.DeviceType;
        device.Manufacturer = dto.Manufacturer;
        device.Model = dto.Model;
        device.SerialNumber = dto.SerialNumber;
        device.ConnectionType = dto.ConnectionType;
        device.IpAddress = dto.IpAddress;
        device.Port = dto.Port;
        
        device.RoomId = dto.RoomId;
        device.IsActive = dto.IsActive;
        device.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new CaptureDeviceDto
        {
            Id = device.Id,
            DeviceCode = device.DeviceCode,
            DeviceName = device.DeviceName,
            DeviceType = device.DeviceType,
            IsActive = device.IsActive
        };
    }

    public async Task<bool> DeleteCaptureDeviceAsync(Guid deviceId)
    {
        var device = await _context.Set<RadiologyCaptureDevice>().FindAsync(deviceId);
        if (device == null) return false;
        device.IsActive = false;
        device.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<CaptureDeviceStatusDto> TestCaptureDeviceConnectionAsync(Guid deviceId)
    {
        var device = await _context.Set<RadiologyCaptureDevice>().FindAsync(deviceId);
        if (device == null)
        {
            return new CaptureDeviceStatusDto { IsConnected = false, Message = "Device not found" };
        }

        // Simulate connection test
        return new CaptureDeviceStatusDto
        {
            DeviceId = deviceId,
            IsConnected = true,
            LastCommunication = DateTime.Now,
            Status = "Online",
            Message = "Connection successful"
        };
    }

    public async Task<List<WorkstationDto>> GetWorkstationsAsync(Guid? roomId = null)
    {
        var query = _context.Set<RadiologyWorkstation>()
            .Include(w => w.Room)
            .Where(w => w.IsActive);

        if (roomId.HasValue)
            query = query.Where(w => w.RoomId == roomId);

        var workstations = await query.ToListAsync();

        return workstations.Select(w => new WorkstationDto
        {
            Id = w.Id,
            WorkstationCode = w.WorkstationCode,
            WorkstationName = w.WorkstationName,
            ComputerName = w.ComputerName,
            IpAddress = w.IpAddress,
            RoomId = w.RoomId,
            RoomName = w.Room?.RoomName ?? "",
            
            IsActive = w.IsActive
        }).ToList();
    }

    public async Task<WorkstationDto> SaveWorkstationAsync(SaveWorkstationDto dto)
    {
        RadiologyWorkstation workstation;
        if (dto.Id.HasValue)
        {
            workstation = await _context.Set<RadiologyWorkstation>().FindAsync(dto.Id.Value);
            if (workstation == null) return null;
        }
        else
        {
            workstation = new RadiologyWorkstation { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyWorkstation>().AddAsync(workstation);
        }

        workstation.WorkstationCode = dto.WorkstationCode;
        workstation.WorkstationName = dto.WorkstationName;
        workstation.ComputerName = dto.ComputerName;
        workstation.IpAddress = dto.IpAddress;
        workstation.RoomId = dto.RoomId;
        
        workstation.IsActive = dto.IsActive;
        workstation.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new WorkstationDto
        {
            Id = workstation.Id,
            WorkstationCode = workstation.WorkstationCode,
            WorkstationName = workstation.WorkstationName,
            IsActive = workstation.IsActive
        };
    }

    public async Task<CaptureSessionDto> CreateCaptureSessionAsync(CreateCaptureSessionDto dto)
    {
        var session = new RadiologyCaptureSession
        {
            Id = Guid.NewGuid(),
            RadiologyRequestId = dto.RadiologyRequestId,
            DeviceId = dto.DeviceId,
            WorkstationId = dto.WorkstationId,
            StartTime = DateTime.UtcNow, // dot16: chuẩn UTC — query DayRangeUtc (ClsExtended:288)
            Status = 0, // Active
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyCaptureSession>().AddAsync(session);
        await _unitOfWork.SaveChangesAsync();

        return new CaptureSessionDto
        {
            Id = session.Id,
            RadiologyRequestId = session.RadiologyRequestId,
            StartTime = session.StartTime,
            Status = session.Status
        };
    }

    public async Task<CaptureSessionDto> EndCaptureSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyCaptureSession>().FindAsync(sessionId);
        if (session == null) return null;

        session.EndTime = DateTime.Now;
        session.Status = 2; // Completed
        await _unitOfWork.SaveChangesAsync();

        return new CaptureSessionDto
        {
            Id = session.Id,
            StartTime = session.StartTime,
            EndTime = session.EndTime,
            Status = session.Status
        };
    }

    public async Task<CapturedMediaDto> SaveCapturedMediaAsync(SaveCapturedMediaDto dto)
    {
        var media = new RadiologyCapturedMedia
        {
            Id = Guid.NewGuid(),
            SessionId = dto.CaptureSessionId,
            MediaType = dto.MediaType,
            FileName = $"capture_{DateTime.Now:yyyyMMddHHmmss}",
            FilePath = dto.FilePath,
            FileSize = dto.FileSize,
            ThumbnailPath = dto.ThumbnailPath,
            Notes = dto.Description,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyCapturedMedia>().AddAsync(media);
        await _unitOfWork.SaveChangesAsync();

        return new CapturedMediaDto
        {
            Id = media.Id,
            MediaType = media.MediaType,
            FilePath = media.FilePath,
            ThumbnailPath = media.ThumbnailPath,
            FileSize = media.FileSize
        };
    }

    public async Task<List<CapturedMediaDto>> GetCapturedMediaAsync(Guid sessionId)
    {
        var media = await _context.Set<RadiologyCapturedMedia>()
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.SequenceNumber)
            .ToBoundedListAsync("RIS.GetCapturedMedia");

        return media.Select(m => new CapturedMediaDto
        {
            Id = m.Id,
            SessionId = m.SessionId,
            MediaType = m.MediaType,
            FileName = m.FileName,
            FilePath = m.FilePath,
            FileSize = m.FileSize,
            ThumbnailPath = m.ThumbnailPath,
            MimeType = m.MimeType,
            SequenceNumber = m.SequenceNumber,
            IsThumbnail = m.IsThumbnail,
            IsSentToPacs = m.IsSentToPacs
        }).ToList();
    }

    public async Task<SendToPacsResultDto> SendMediaToPacsAsync(SendToPacsRequestDto request)
    {
        // Send captured media to PACS server
        var result = new SendToPacsResultDto
        {
            Success = true,
            SentCount = request.MediaIds.Count,
            FailedCount = 0,
            StudyInstanceUID = $"1.2.840.{DateTime.Now.Ticks}",
            SentAt = DateTime.Now
        };

        foreach (var mediaId in request.MediaIds)
        {
            var media = await _context.Set<RadiologyCapturedMedia>().FindAsync(mediaId);
            if (media != null)
            {
                media.IsSentToPacs = true;
                media.SentToPacsAt = DateTime.Now;
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return result;
    }

    private string GetCaptureDeviceTypeName(string deviceType) => deviceType switch
    {
        "ULTRASOUND" => "Sieu am",
        "ENDOSCOPY" => "Noi soi",
        "CAMERA" => "Camera",
        "SCANNER" => "May quet",
        _ => deviceType
    };

    #endregion
}
