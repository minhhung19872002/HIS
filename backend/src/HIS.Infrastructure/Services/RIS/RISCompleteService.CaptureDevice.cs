using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Net.Sockets;
using FellowOakDicom;
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

        var devices = await query.OrderBy(d => d.DeviceName).ToBoundedListAsync("RISCompleteService.GetCaptureDevices");

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
            ComPort = d.ComPort,
            BaudRate = d.BaudRate,
            FolderPath = d.FolderPath,
            AETitle = d.AETitle,
            SupportsDicom = d.SupportsDicom,
            SupportsWorklist = d.SupportsWorklist,
            SupportsMPPS = d.SupportsMPPS,
            MaxExamsPerDay = d.MaxExamsPerDay,
            AutoSelectThumbnail = d.AutoSelectThumbnail,
            SendOnlyThumbnail = d.SendOnlyThumbnail,
            DefaultFrameFormat = d.DefaultFrameFormat,
            VideoFormat = d.VideoFormat,
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
        device.ComPort = dto.ComPort;
        device.BaudRate = dto.BaudRate;
        device.FolderPath = dto.FolderPath;
        device.AETitle = dto.AETitle;
        device.SupportsDicom = dto.SupportsDicom;
        device.SupportsWorklist = dto.SupportsWorklist;
        device.SupportsMPPS = dto.SupportsMPPS;
        device.MaxExamsPerDay = dto.MaxExamsPerDay;
        device.AutoSelectThumbnail = dto.AutoSelectThumbnail;
        device.SendOnlyThumbnail = dto.SendOnlyThumbnail;
        device.DefaultFrameFormat = dto.DefaultFrameFormat;
        device.VideoFormat = dto.VideoFormat;
        device.ConfigJson = dto.ConfigJson;
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

        var status = new CaptureDeviceStatusDto
        {
            DeviceId = deviceId,
            IsConnected = false,
            Status = "Offline",
        };

        try
        {
            var type = (device.ConnectionType ?? string.Empty).Trim().ToUpperInvariant();
            if (device.SupportsDicom || type == "DICOM")
            {
                if (string.IsNullOrWhiteSpace(device.IpAddress) ||
                    string.IsNullOrWhiteSpace(device.AETitle) || device.Port is null)
                    throw new InvalidOperationException("Thiết bị DICOM thiếu IP, port hoặc AE Title");
                var echo = await _dicomPacsGateway.EchoAsync(new DicomEndpoint(
                    device.IpAddress,
                    device.Port.Value,
                    device.AETitle,
                    _configuration["PACS:CallingAETitle"] ?? "HIS_RIS",
                    false,
                    false,
                    5));
                status.IsConnected = echo.Success;
                status.Message = echo.Success ? $"DICOM C-ECHO: {echo.Status}" : echo.ErrorMessage;
            }
            else if (type == "TCP")
            {
                if (string.IsNullOrWhiteSpace(device.IpAddress) || device.Port is null)
                    throw new InvalidOperationException("Thiết bị TCP thiếu IP hoặc port");
                using var tcp = new TcpClient();
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                await tcp.ConnectAsync(device.IpAddress, device.Port.Value, timeout.Token);
                status.IsConnected = tcp.Connected;
                status.Message = tcp.Connected ? "TCP connection established" : "TCP connection failed";
            }
            else if (type == "FILE")
            {
                if (string.IsNullOrWhiteSpace(device.FolderPath))
                    throw new InvalidOperationException("Thiết bị File chưa cấu hình thư mục");
                status.IsConnected = Directory.Exists(device.FolderPath);
                status.Message = status.IsConnected
                    ? "Exchange folder is accessible"
                    : "Exchange folder does not exist or is not accessible";
            }
            else
            {
                status.Message = $"Chưa có adapter kiểm tra thật cho kết nối {type}";
            }
        }
        catch (Exception ex)
        {
            status.IsConnected = false;
            status.Message = ex.GetBaseException().Message;
        }

        device.Status = status.IsConnected ? 1 : 3;
        device.LastCommunication = status.IsConnected ? DateTime.UtcNow : device.LastCommunication;
        device.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        status.LastCommunication = device.LastCommunication;
        status.Status = status.IsConnected ? "Online" : "Error";
        return status;
    }

    public async Task<List<WorkstationDto>> GetWorkstationsAsync(Guid? roomId = null)
    {
        var query = _context.Set<RadiologyWorkstation>()
            .Include(w => w.Room)
            .Where(w => w.IsActive);

        if (roomId.HasValue)
            query = query.Where(w => w.RoomId == roomId);

        var workstations = await query.ToBoundedListAsync("RISCompleteService.GetWorkstations");

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
        var result = new SendToPacsResultDto
        {
            Success = false,
            SentCount = 0,
            FailedCount = request.MediaIds?.Count ?? 0,
            Errors = new List<string>(),
            SentAt = DateTime.UtcNow
        };

        if (!_pacsEnabled)
        {
            result.Errors.Add("PACS chưa được bật");
            return result;
        }
        if (request.MediaIds == null || request.MediaIds.Count == 0)
        {
            result.Errors.Add("Chưa chọn media DICOM");
            return result;
        }

        var session = await _context.Set<RadiologyCaptureSession>()
            .Include(s => s.RadiologyRequest).ThenInclude(r => r.Patient)
            .FirstOrDefaultAsync(s => s.Id == request.SessionId && !s.IsDeleted);
        if (session == null)
        {
            result.Errors.Add("Không tìm thấy phiên capture");
            return result;
        }

        var selectedIds = request.MediaIds.Distinct().ToList();
        var mediaItems = await _context.Set<RadiologyCapturedMedia>()
            .Where(m => selectedIds.Contains(m.Id) && m.SessionId == request.SessionId && !m.IsDeleted &&
                        (!request.OnlyThumbnails || m.IsThumbnail))
            .ToListAsync();
        if (mediaItems.Count != selectedIds.Count && !request.OnlyThumbnails)
            result.Errors.Add("Một số media không tồn tại hoặc không thuộc phiên capture");

        var maxBytes = _configuration.GetValue<long>("PACS:CaptureMaxInstanceBytes", 512L * 1024 * 1024);
        var allowedRoots = _configuration.GetSection("PACS:CaptureAllowedRoots").Get<string[]>() ?? Array.Empty<string>();
        var normalizedRoots = allowedRoots
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(Path.GetFullPath)
            .Select(x => x.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar)
            .ToArray();
        if (normalizedRoots.Length == 0)
        {
            result.Errors.Add("PACS:CaptureAllowedRoots chưa được cấu hình; từ chối đọc đường dẫn media tùy ý");
            return result;
        }

        var validated = new List<(RadiologyCapturedMedia Media, string Path, string PatientId, string StudyUid)>();
        foreach (var media in mediaItems)
        {
            try
            {
                var fullPath = Path.GetFullPath(media.FilePath);
                if (!normalizedRoots.Any(root => fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase)))
                    throw new InvalidOperationException("đường dẫn nằm ngoài thư mục capture được cho phép");
                var fileInfo = new FileInfo(fullPath);
                if (!fileInfo.Exists) throw new FileNotFoundException("không tìm thấy file", fullPath);
                if (fileInfo.Length <= 0 || fileInfo.Length > maxBytes)
                    throw new InvalidOperationException($"kích thước file không hợp lệ ({fileInfo.Length} bytes)");

                var dicom = await DicomFile.OpenAsync(fullPath);
                var patientId = dicom.Dataset.GetSingleValueOrDefault(DicomTag.PatientID, string.Empty).Trim();
                var studyUid = dicom.Dataset.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty).Trim();
                var seriesUid = dicom.Dataset.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty).Trim();
                var sopUid = dicom.Dataset.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(patientId) || string.IsNullOrWhiteSpace(studyUid) ||
                    string.IsNullOrWhiteSpace(seriesUid) || string.IsNullOrWhiteSpace(sopUid))
                    throw new InvalidDataException("thiếu PatientID hoặc Study/Series/SOP Instance UID");
                if (!string.Equals(patientId, session.RadiologyRequest.Patient.PatientCode,
                        StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException(
                        $"PatientID DICOM '{patientId}' không khớp bệnh nhân '{session.RadiologyRequest.Patient.PatientCode}'");
                validated.Add((media, fullPath, patientId, studyUid));
            }
            catch (Exception ex)
            {
                result.Errors.Add($"{media.FileName}: {ex.GetBaseException().Message}");
            }
        }

        var distinctStudies = validated.Select(x => x.StudyUid).Distinct(StringComparer.Ordinal).ToList();
        if (distinctStudies.Count > 1)
        {
            result.Errors.Add("Các media được chọn thuộc nhiều StudyInstanceUID; phải gửi từng study riêng");
            return result;
        }

        foreach (var item in validated)
        {
            var imported = await _dicomPacsGateway.ImportInstanceAsync(await File.ReadAllBytesAsync(item.Path));
            if (!imported.Success)
            {
                result.Errors.Add($"{item.Media.FileName}: {imported.ErrorMessage}");
                continue;
            }
            item.Media.IsSentToPacs = true;
            item.Media.SentToPacsAt = DateTime.UtcNow;
            item.Media.DicomStudyUID = imported.StudyInstanceUid;
            item.Media.DicomSeriesUID = imported.SeriesInstanceUid;
            item.Media.DicomInstanceUID = imported.SopInstanceUid;
            result.SentCount++;
            result.StudyInstanceUID = imported.StudyInstanceUid;
        }

        await _unitOfWork.SaveChangesAsync();
        result.FailedCount = selectedIds.Count - result.SentCount;
        result.Success = result.SentCount == selectedIds.Count && result.Errors.Count == 0;
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
