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

namespace HIS.Infrastructure.Services;

// K3 phien 8 (2026-05-30): tach 9 region RIS catalog admin (DICOM Viewer + Room & Schedule +
// Print Label + Diagnosis Templates + Abbreviations + QR Code + Duty Schedule + Room Assignment
// + Tags, ~1126 dong) khoi RISCompleteService.cs. ZERO runtime change — partial class.
public partial class RISCompleteService
{
    #region DICOM Viewer

    public async Task<ViewerUrlDto> GetViewerUrlAsync(string studyInstanceUID)
    {
        // Return internal viewer URL (built-in HIS viewer)
        return await Task.FromResult(new ViewerUrlDto
        {
            StudyInstanceUID = studyInstanceUID,
            ViewerUrl = $"/radiology/viewer?study={studyInstanceUID}",
            WadoRsUrl = $"/api/radiology/dicom-web/studies/{studyInstanceUID}",
            DicomWebUrl = "/api/radiology/dicom-web"
        });
    }

    public async Task<DicomViewerConfigDto> GetViewerConfigAsync()
    {
        return new DicomViewerConfigDto
        {
            ViewerUrl = "/radiology/viewer",
            ViewerType = "HISViewer", // Built-in viewer
            EnableAnnotation = true,
            EnableMeasurement = true,
            EnableMPR = false, // Basic viewer
            Enable3D = false,
            DefaultLayout = "1x1"
        };
    }

    public async Task<ImageAnnotationDto> SaveAnnotationAsync(ImageAnnotationDto annotation)
    {
        // Upsert: if Id is provided and exists, update; otherwise insert new record.
        PacsImageAnnotation? entity = null;
        if (annotation.Id != Guid.Empty)
            entity = await _context.PacsImageAnnotations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Id == annotation.Id);

        if (entity == null)
        {
            entity = new PacsImageAnnotation
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.Now,
                AnnotatedTime = DateTime.Now,
            };
            await _context.PacsImageAnnotations.AddAsync(entity);
        }
        else
        {
            entity.UpdatedAt = DateTime.Now;
        }

        entity.StudyInstanceUID = annotation.StudyInstanceUID;
        entity.SeriesInstanceUID = annotation.SeriesInstanceUID;
        entity.SOPInstanceUID = annotation.SOPInstanceUID ?? string.Empty;
        entity.AnnotationType = annotation.AnnotationType ?? string.Empty;
        entity.AnnotationData = annotation.AnnotationData;
        entity.AnnotatedBy = annotation.CreatedBy;
        entity.IsDeleted = false;

        await _unitOfWork.SaveChangesAsync();

        annotation.Id = entity.Id;
        annotation.CreatedTime = entity.AnnotatedTime;
        return annotation;
    }

    public async Task<List<ImageAnnotationDto>> GetAnnotationsAsync(string sopInstanceUID)
    {
        var records = await _context.PacsImageAnnotations
            .Where(a => a.SOPInstanceUID == sopInstanceUID)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync();

        return records.Select(a => new ImageAnnotationDto
        {
            Id = a.Id,
            StudyInstanceUID = a.StudyInstanceUID,
            SeriesInstanceUID = a.SeriesInstanceUID,
            SOPInstanceUID = a.SOPInstanceUID,
            AnnotationType = a.AnnotationType,
            AnnotationData = a.AnnotationData,
            CreatedBy = a.AnnotatedBy,
            CreatedTime = a.AnnotatedTime,
        }).ToList();
    }

    public async Task<KeyImageDto> MarkKeyImageAsync(MarkKeyImageDto dto)
    {
        // Unmark: soft-delete existing record if Unmark flag is set
        if (dto.Unmark)
        {
            var existing = await _context.PacsKeyImages
                .FirstOrDefaultAsync(k => k.StudyInstanceUID == dto.StudyInstanceUID
                                       && k.SOPInstanceUID == dto.SOPInstanceUID);
            if (existing != null)
            {
                existing.IsDeleted = true;
                existing.UpdatedAt = DateTime.Now;
                await _unitOfWork.SaveChangesAsync();
            }
            return new KeyImageDto
            {
                Id = existing?.Id ?? Guid.Empty,
                StudyInstanceUID = dto.StudyInstanceUID,
                SOPInstanceUID = dto.SOPInstanceUID,
                Description = dto.Description,
                MarkedTime = DateTime.Now,
            };
        }

        // Mark: check for existing (allow re-mark if previously deleted)
        var record = await _context.PacsKeyImages
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(k => k.StudyInstanceUID == dto.StudyInstanceUID
                                   && k.SOPInstanceUID == dto.SOPInstanceUID);
        if (record == null)
        {
            record = new PacsKeyImage
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.Now,
                MarkedTime = DateTime.Now,
            };
            await _context.PacsKeyImages.AddAsync(record);
        }
        else
        {
            record.UpdatedAt = DateTime.Now;
            record.IsDeleted = false;
        }

        record.StudyInstanceUID = dto.StudyInstanceUID;
        record.SOPInstanceUID = dto.SOPInstanceUID;
        record.Description = dto.Description;
        record.MarkedTime = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new KeyImageDto
        {
            Id = record.Id,
            StudyInstanceUID = record.StudyInstanceUID,
            SOPInstanceUID = record.SOPInstanceUID,
            Description = record.Description,
            MarkedBy = record.MarkedBy,
            MarkedTime = record.MarkedTime,
        };
    }

    public async Task<List<KeyImageDto>> GetKeyImagesAsync(string studyInstanceUID)
    {
        var records = await _context.PacsKeyImages
            .Where(k => k.StudyInstanceUID == studyInstanceUID)
            .OrderBy(k => k.MarkedTime)
            .ToListAsync();

        return records.Select(k => new KeyImageDto
        {
            Id = k.Id,
            StudyInstanceUID = k.StudyInstanceUID,
            SOPInstanceUID = k.SOPInstanceUID,
            Description = k.Description,
            MarkedBy = k.MarkedBy,
            MarkedTime = k.MarkedTime,
        }).ToList();
    }

    public async Task<byte[]> EditImageAsync(ImageEditDto dto)
    {
        return await Task.FromResult(new byte[0]);
    }

    #endregion

    #region Room & Schedule

    public async Task<List<RadiologyRoomDto>> GetRoomsAsync(string keyword = null, string roomType = null)
    {
        var query = _context.Rooms
            .Include(r => r.Department)
            .Where(r => r.IsActive);

        // Filter for radiology rooms (CDHA type)
        query = query.Where(r => r.RoomType >= 10 && r.RoomType < 20);

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(r => r.RoomName.Contains(keyword) || r.RoomCode.Contains(keyword));
        }

        var rooms = await query.ToListAsync();

        return rooms.Select(r => new RadiologyRoomDto
        {
            Id = r.Id,
            Code = r.RoomCode,
            Name = r.RoomName,
            RoomType = GetRoomTypeName(r.RoomType),
            DepartmentId = r.DepartmentId,
            DepartmentName = r.Department?.DepartmentName ?? "",
            Capacity = 1,
            Status = "Available",
            IsActive = r.IsActive
        }).ToList();
    }

    public async Task<RadiologyRoomDto> SaveRoomAsync(SaveRadiologyRoomDto dto)
    {
        Room room;
        if (dto.Id.HasValue)
        {
            room = await _context.Rooms.FindAsync(dto.Id.Value);
            if (room == null) return null;
        }
        else
        {
            room = new Room
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.Now
            };
            await _context.Rooms.AddAsync(room);
        }

        room.RoomCode = dto.Code;
        room.RoomName = dto.Name;
        room.RoomType = ParseRoomType(dto.RoomType);
        room.DepartmentId = dto.DepartmentId;
        room.IsActive = dto.IsActive;
        room.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new RadiologyRoomDto
        {
            Id = room.Id,
            Code = room.RoomCode,
            Name = room.RoomName,
            RoomType = dto.RoomType,
            DepartmentId = room.DepartmentId,
            IsActive = room.IsActive
        };
    }

    public async Task<List<RadiologyScheduleDto>> GetRoomScheduleAsync(Guid roomId, DateTime fromDate, DateTime toDate)
    {
        return await Task.FromResult(new List<RadiologyScheduleDto>());
    }

    public async Task<RadiologyScheduleDto> SaveScheduleAsync(SaveRadiologyScheduleDto dto)
    {
        return new RadiologyScheduleDto
        {
            Id = dto.Id ?? Guid.NewGuid(),
            RoomId = dto.RoomId,
            Date = dto.Date,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            TechnicianId = dto.TechnicianId,
            DoctorId = dto.DoctorId,
            MaxSlots = dto.MaxSlots,
            Note = dto.Note
        };
    }

    #endregion

    #region Print Label - In nhãn dán

    public async Task<LabelDataDto> PrintLabelAsync(PrintLabelRequestDto request)
    {
        var order = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.Exams)
            .FirstOrDefaultAsync(r => r.Id == request.OrderId);

        if (order == null) return null;

        var exam = order.Exams.FirstOrDefault();
        var queueNumber = await _context.RadiologyRequests
            .Where(r => r.RequestDate.Date == order.RequestDate.Date && r.CreatedAt <= order.CreatedAt)
            .CountAsync();

        var labelData = new LabelDataDto
        {
            PatientCode = order.Patient.PatientCode,
            PatientName = order.Patient.FullName,
            Age = order.Patient.DateOfBirth.HasValue ? (int?)((DateTime.Now - order.Patient.DateOfBirth.Value).Days / 365) : null,
            Gender = order.Patient.Gender == 1 ? "Nam" : "Nu",
            OrderCode = order.RequestCode,
            ServiceName = order.Service?.ServiceName ?? "",
            RoomName = exam?.Room?.RoomName ?? "",
            OrderDate = order.RequestDate,
            QueueNumber = queueNumber,
            AccessionNumber = exam?.AccessionNumber ?? GenerateAccessionNumber(),
            QRCodeData = $"HIS|{order.RequestCode}|{order.Patient.PatientCode}",
            BarcodeData = order.RequestCode
        };

        // Generate label HTML content
        labelData.LabelContent = GenerateLabelHtml(labelData, request.OutputFormat);

        return labelData;
    }

    public async Task<List<RadiologyLabelConfigDto>> GetLabelConfigsAsync(Guid? serviceTypeId = null)
    {
        var configs = await _context.Set<RadiologyLabelConfig>()
            .Where(c => c.IsActive && (!serviceTypeId.HasValue || c.ServiceTypeId == serviceTypeId))
            .ToListAsync();

        if (!configs.Any())
        {
            // Return default config
            return new List<RadiologyLabelConfigDto>
            {
                new RadiologyLabelConfigDto
                {
                    Id = Guid.NewGuid(),
                    Name = "Nhan mac dinh",
                    LabelWidth = 70,
                    LabelHeight = 40,
                    IncludeQRCode = true,
                    IncludeBarcode = true,
                    BarcodeFormat = "CODE128",
                    IsDefault = true,
                    IsActive = true
                }
            };
        }

        return configs.Select(c => new RadiologyLabelConfigDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            LabelWidth = c.LabelWidth,
            LabelHeight = c.LabelHeight,
            TemplateHtml = c.TemplateHtml,
            TemplateZpl = c.TemplateZpl,
            IncludeQRCode = c.IncludeQRCode,
            IncludeBarcode = c.IncludeBarcode,
            BarcodeFormat = c.BarcodeFormat,
            ServiceTypeId = c.ServiceTypeId,
            DepartmentId = c.DepartmentId,
            IsDefault = c.IsDefault,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<RadiologyLabelConfigDto> SaveLabelConfigAsync(RadiologyLabelConfigDto dto)
    {
        RadiologyLabelConfig config;
        if (dto.Id != Guid.Empty)
        {
            config = await _context.Set<RadiologyLabelConfig>().FindAsync(dto.Id);
            if (config == null) return null;
        }
        else
        {
            config = new RadiologyLabelConfig { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyLabelConfig>().AddAsync(config);
        }

        config.Name = dto.Name;
        config.Description = dto.Description;
        config.LabelWidth = dto.LabelWidth;
        config.LabelHeight = dto.LabelHeight;
        config.TemplateHtml = dto.TemplateHtml;
        config.TemplateZpl = dto.TemplateZpl;
        config.IncludeQRCode = dto.IncludeQRCode;
        config.IncludeBarcode = dto.IncludeBarcode;
        config.BarcodeFormat = dto.BarcodeFormat;
        config.ServiceTypeId = dto.ServiceTypeId;
        config.DepartmentId = dto.DepartmentId;
        config.IsDefault = dto.IsDefault;
        config.IsActive = dto.IsActive;
        config.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();
        dto.Id = config.Id;
        return dto;
    }

    public async Task<bool> DeleteLabelConfigAsync(Guid configId)
    {
        var config = await _context.Set<RadiologyLabelConfig>().FindAsync(configId);
        if (config == null) return false;
        config.IsActive = false;
        config.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private string GenerateLabelHtml(LabelDataDto data, string format)
    {
        return $@"
        <div style='width:70mm;height:40mm;padding:2mm;font-family:Arial;font-size:10px;'>
            <div style='font-weight:bold;font-size:12px;'>{data.PatientName}</div>
            <div>Ma BN: {data.PatientCode} | {data.Age} tuoi | {data.Gender}</div>
            <div>Ma phieu: {data.OrderCode}</div>
            <div>DV: {data.ServiceName}</div>
            <div>STT: {data.QueueNumber} | Ngay: {data.OrderDate:dd/MM/yyyy HH:mm}</div>
        </div>";
    }

    #endregion

    #region Diagnosis Templates - Mẫu chẩn đoán

    public async Task<List<DiagnosisTemplateDto>> GetDiagnosisTemplatesAsync(
        Guid? serviceTypeId = null,
        Guid? serviceId = null,
        string keyword = null)
    {
        var query = _context.Set<RadiologyDiagnosisTemplate>()
            .Include(t => t.Service)
            .Include(t => t.CreatedByUser)
            .Where(t => t.IsActive);

        if (serviceTypeId.HasValue)
            query = query.Where(t => t.ServiceTypeId == serviceTypeId);
        if (serviceId.HasValue)
            query = query.Where(t => t.ServiceId == serviceId);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(t => t.Name.Contains(keyword) || t.Code.Contains(keyword));

        var templates = await query.OrderBy(t => t.SortOrder).ToListAsync();

        return templates.Select(t => new DiagnosisTemplateDto
        {
            Id = t.Id,
            Code = t.Code,
            Name = t.Name,
            Description = t.Description,
            Conclusion = t.Conclusion,
            Recommendation = t.Recommendation,
            ServiceTypeId = t.ServiceTypeId,
            ServiceId = t.ServiceId,
            ServiceName = t.Service?.ServiceName,
            Gender = t.Gender,
            MinAge = t.MinAge,
            MaxAge = t.MaxAge,
            SortOrder = t.SortOrder,
            IsDefault = t.IsDefault,
            IsActive = t.IsActive,
            CreatedByUserName = t.CreatedByUser?.FullName
        }).ToList();
    }

    public async Task<DiagnosisTemplateDto> SaveDiagnosisTemplateAsync(SaveDiagnosisTemplateDto dto)
    {
        RadiologyDiagnosisTemplate template;
        if (dto.Id.HasValue)
        {
            template = await _context.Set<RadiologyDiagnosisTemplate>().FindAsync(dto.Id.Value);
            if (template == null) return null;
        }
        else
        {
            template = new RadiologyDiagnosisTemplate { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyDiagnosisTemplate>().AddAsync(template);
        }

        template.Code = dto.Code;
        template.Name = dto.Name;
        template.Description = dto.Description;
        template.Conclusion = dto.Conclusion;
        template.Recommendation = dto.Recommendation;
        template.ServiceTypeId = dto.ServiceTypeId;
        template.ServiceId = dto.ServiceId;
        template.Gender = dto.Gender;
        template.MinAge = dto.MinAge;
        template.MaxAge = dto.MaxAge;
        template.SortOrder = dto.SortOrder;
        template.IsDefault = dto.IsDefault;
        template.IsActive = dto.IsActive;
        template.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new DiagnosisTemplateDto
        {
            Id = template.Id,
            Code = template.Code,
            Name = template.Name,
            Description = template.Description,
            Conclusion = template.Conclusion,
            Recommendation = template.Recommendation,
            SortOrder = template.SortOrder,
            IsDefault = template.IsDefault,
            IsActive = template.IsActive
        };
    }

    public async Task<bool> DeleteDiagnosisTemplateAsync(Guid templateId)
    {
        var template = await _context.Set<RadiologyDiagnosisTemplate>().FindAsync(templateId);
        if (template == null) return false;
        template.IsActive = false;
        template.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    #endregion

    #region Abbreviations - Bộ từ viết tắt

    public async Task<List<AbbreviationDto>> GetAbbreviationsAsync(
        string category = null,
        Guid? serviceTypeId = null,
        string keyword = null)
    {
        var query = _context.Set<RadiologyAbbreviation>()
            .Include(a => a.CreatedByUser)
            .Where(a => a.IsActive);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(a => a.Category == category);
        if (serviceTypeId.HasValue)
            query = query.Where(a => a.IsGlobal || a.ServiceTypeId == serviceTypeId);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(a => a.Abbreviation.Contains(keyword) || a.FullText.Contains(keyword));

        var abbreviations = await query.OrderBy(a => a.SortOrder).ToListAsync();

        return abbreviations.Select(a => new AbbreviationDto
        {
            Id = a.Id,
            Abbreviation = a.Abbreviation,
            FullText = a.FullText,
            Category = a.Category,
            ServiceTypeId = a.ServiceTypeId,
            IsGlobal = a.IsGlobal,
            SortOrder = a.SortOrder,
            IsActive = a.IsActive,
            CreatedByUserName = a.CreatedByUser?.FullName
        }).ToList();
    }

    public async Task<AbbreviationDto> SaveAbbreviationAsync(SaveAbbreviationDto dto)
    {
        RadiologyAbbreviation abbreviation;
        if (dto.Id.HasValue)
        {
            abbreviation = await _context.Set<RadiologyAbbreviation>().FindAsync(dto.Id.Value);
            if (abbreviation == null) return null;
        }
        else
        {
            abbreviation = new RadiologyAbbreviation { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyAbbreviation>().AddAsync(abbreviation);
        }

        abbreviation.Abbreviation = dto.Abbreviation;
        abbreviation.FullText = dto.FullText;
        abbreviation.Category = dto.Category;
        abbreviation.ServiceTypeId = dto.ServiceTypeId;
        abbreviation.IsGlobal = dto.IsGlobal;
        abbreviation.SortOrder = dto.SortOrder;
        abbreviation.IsActive = dto.IsActive;
        abbreviation.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new AbbreviationDto
        {
            Id = abbreviation.Id,
            Abbreviation = abbreviation.Abbreviation,
            FullText = abbreviation.FullText,
            Category = abbreviation.Category,
            IsGlobal = abbreviation.IsGlobal,
            SortOrder = abbreviation.SortOrder,
            IsActive = abbreviation.IsActive
        };
    }

    public async Task<bool> DeleteAbbreviationAsync(Guid abbreviationId)
    {
        var abbreviation = await _context.Set<RadiologyAbbreviation>().FindAsync(abbreviationId);
        if (abbreviation == null) return false;
        abbreviation.IsActive = false;
        abbreviation.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ExpandAbbreviationResultDto> ExpandAbbreviationsAsync(string text, string category = null, Guid? serviceTypeId = null)
    {
        var abbreviations = await GetAbbreviationsAsync(category, serviceTypeId, null);
        var result = new ExpandAbbreviationResultDto
        {
            OriginalText = text,
            ExpandedText = text,
            ReplacementCount = 0,
            ReplacedAbbreviations = new List<string>()
        };

        foreach (var abbr in abbreviations.OrderByDescending(a => a.Abbreviation.Length))
        {
            if (result.ExpandedText.Contains(abbr.Abbreviation))
            {
                result.ExpandedText = result.ExpandedText.Replace(abbr.Abbreviation, abbr.FullText);
                result.ReplacementCount++;
                result.ReplacedAbbreviations.Add(abbr.Abbreviation);
            }
        }

        return result;
    }

    #endregion

    #region QR Code

    public async Task<QRCodeResultDto> GenerateQRCodeAsync(GenerateQRCodeRequestDto request)
    {
        var order = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == request.OrderId);

        if (order == null) return null;

        var qrData = request.QRType switch
        {
            "PATIENT_INFO" => $"PATIENT|{order.Patient.PatientCode}|{order.Patient.FullName}",
            "ORDER_INFO" => $"ORDER|{order.RequestCode}|{order.Patient.PatientCode}",
            "RESULT_SHARE" => $"SHARE|{order.Id}|{Guid.NewGuid():N}",
            "DICOM_LINK" => $"DICOM|{order.Id}",
            _ => $"HIS|{order.RequestCode}"
        };

        // Generate QR Code (simplified - in production use QRCoder library)
        var qrCodeBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(qrData));

        return new QRCodeResultDto
        {
            OrderId = request.OrderId,
            QRType = request.QRType,
            QRCodeBase64 = qrCodeBase64,
            QRCodeUrl = $"/api/RISComplete/qrcode/{request.OrderId}",
            EncodedData = qrData,
            GeneratedAt = DateTime.Now,
            ExpiresAt = request.ValidityHours.HasValue ? DateTime.Now.AddHours(request.ValidityHours.Value) : null
        };
    }

    public async Task<ScanQRCodeResultDto> ScanQRCodeAsync(string qrData)
    {
        var result = new ScanQRCodeResultDto { Success = false };

        var parts = qrData.Split('|');
        if (parts.Length < 2)
        {
            result.ErrorMessage = "Invalid QR code format";
            return result;
        }

        switch (parts[0])
        {
            case "PATIENT":
                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == parts[1]);
                if (patient != null)
                {
                    result.Success = true;
                    result.QRType = "PATIENT_INFO";
                    result.PatientId = patient.Id;
                    result.PatientCode = patient.PatientCode;
                    result.PatientName = patient.FullName;
                }
                break;
            case "ORDER":
                var order = await _context.RadiologyRequests
                    .Include(r => r.Patient)
                    .FirstOrDefaultAsync(r => r.RequestCode == parts[1]);
                if (order != null)
                {
                    result.Success = true;
                    result.QRType = "ORDER_INFO";
                    result.OrderId = order.Id;
                    result.OrderCode = order.RequestCode;
                    result.PatientId = order.PatientId;
                    result.PatientCode = order.Patient.PatientCode;
                    result.PatientName = order.Patient.FullName;
                }
                break;
            case "SHARE":
                if (Guid.TryParse(parts[1], out var shareOrderId))
                {
                    result.Success = true;
                    result.QRType = "RESULT_SHARE";
                    result.OrderId = shareOrderId;
                    result.ResultShareUrl = $"/api/RISComplete/shared-result/{parts[2]}";
                }
                break;
        }

        return result;
    }

    public async Task<ShareResultQRDto> CreateShareResultQRAsync(Guid resultId, int? validityHours = 24)
    {
        var shareCode = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
        var accessCode = new Random().Next(1000, 9999).ToString();

        return new ShareResultQRDto
        {
            ResultId = resultId,
            ShareUrl = $"/api/RISComplete/shared-result/{shareCode}",
            QRCodeBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"SHARE|{resultId}|{shareCode}")),
            ExpiresAt = DateTime.Now.AddHours(validityHours ?? 24),
            AccessCode = accessCode
        };
    }

    public async Task<RadiologyResultDto> GetSharedResultAsync(string shareCode, string accessCode)
    {
        // In production, validate share code and access code from database
        return new RadiologyResultDto
        {
            Id = Guid.NewGuid(),
            Description = "Shared result - implement validation",
            Conclusion = "Shared result"
        };
    }

    #endregion

    #region Duty Schedule - Lịch phân công trực

    public async Task<List<DutyScheduleDto>> GetDutySchedulesAsync(
        Guid departmentId,
        DateTime fromDate,
        DateTime toDate,
        Guid? roomId = null)
    {
        var query = _context.Set<RadiologyDutySchedule>()
            .Include(s => s.Department)
            .Include(s => s.Room)
            .Include(s => s.Doctor)
            .Include(s => s.Technician)
            .Include(s => s.AssistantTechnician)
            .Where(s => s.DepartmentId == departmentId && s.DutyDate >= fromDate && s.DutyDate <= toDate);

        if (roomId.HasValue)
            query = query.Where(s => s.RoomId == roomId);

        var schedules = await query.OrderBy(s => s.DutyDate).ThenBy(s => s.ShiftType).ToListAsync();

        return schedules.Select(s => new DutyScheduleDto
        {
            Id = s.Id,
            DepartmentId = s.DepartmentId,
            DepartmentName = s.Department.DepartmentName,
            RoomId = s.RoomId,
            RoomName = s.Room?.RoomName,
            DutyDate = s.DutyDate,
            ShiftType = s.ShiftType,
            ShiftTypeName = GetShiftTypeName(s.ShiftType),
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            DoctorId = s.DoctorId,
            DoctorName = s.Doctor?.FullName,
            TechnicianId = s.TechnicianId,
            TechnicianName = s.Technician?.FullName,
            AssistantTechnicianId = s.AssistantTechnicianId,
            AssistantTechnicianName = s.AssistantTechnician?.FullName,
            Notes = s.Notes,
            Status = s.Status,
            StatusName = s.Status == 1 ? "Da duyet" : s.Status == 2 ? "Da huy" : "Chua duyet"
        }).ToList();
    }

    public async Task<DutyScheduleDto> SaveDutyScheduleAsync(SaveDutyScheduleDto dto)
    {
        RadiologyDutySchedule schedule;
        if (dto.Id.HasValue)
        {
            schedule = await _context.Set<RadiologyDutySchedule>().FindAsync(dto.Id.Value);
            if (schedule == null) return null;
        }
        else
        {
            schedule = new RadiologyDutySchedule { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyDutySchedule>().AddAsync(schedule);
        }

        schedule.DepartmentId = dto.DepartmentId;
        schedule.RoomId = dto.RoomId;
        schedule.DutyDate = dto.DutyDate;
        schedule.ShiftType = dto.ShiftType;
        schedule.StartTime = dto.StartTime;
        schedule.EndTime = dto.EndTime;
        schedule.DoctorId = dto.DoctorId;
        schedule.TechnicianId = dto.TechnicianId;
        schedule.AssistantTechnicianId = dto.AssistantTechnicianId;
        schedule.Notes = dto.Notes;
        schedule.Status = 0; // Draft
        schedule.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new DutyScheduleDto
        {
            Id = schedule.Id,
            DepartmentId = schedule.DepartmentId,
            RoomId = schedule.RoomId,
            DutyDate = schedule.DutyDate,
            ShiftType = schedule.ShiftType,
            ShiftTypeName = GetShiftTypeName(schedule.ShiftType),
            StartTime = schedule.StartTime,
            EndTime = schedule.EndTime,
            Status = schedule.Status
        };
    }

    public async Task<List<DutyScheduleDto>> BatchCreateDutySchedulesAsync(BatchCreateDutyScheduleDto dto)
    {
        var schedules = new List<DutyScheduleDto>();
        for (var date = dto.FromDate; date <= dto.ToDate; date = date.AddDays(1))
        {
            foreach (var shiftType in dto.ShiftTypes)
            {
                var staff = dto.Staff.FirstOrDefault(s => s.DayOfWeek == (int)date.DayOfWeek && s.ShiftType == shiftType);
                var schedule = await SaveDutyScheduleAsync(new SaveDutyScheduleDto
                {
                    DepartmentId = dto.DepartmentId,
                    RoomId = dto.RoomId,
                    DutyDate = date,
                    ShiftType = shiftType,
                    StartTime = GetShiftStartTime(shiftType),
                    EndTime = GetShiftEndTime(shiftType),
                    DoctorId = staff?.DoctorId,
                    TechnicianId = staff?.TechnicianId,
                    AssistantTechnicianId = staff?.AssistantTechnicianId
                });
                schedules.Add(schedule);
            }
        }
        return schedules;
    }

    public async Task<bool> DeleteDutyScheduleAsync(Guid scheduleId)
    {
        var schedule = await _context.Set<RadiologyDutySchedule>().FindAsync(scheduleId);
        if (schedule == null) return false;
        schedule.Status = 2; // Cancelled
        schedule.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ApproveDutyScheduleAsync(Guid scheduleId)
    {
        var schedule = await _context.Set<RadiologyDutySchedule>().FindAsync(scheduleId);
        if (schedule == null) return false;
        schedule.Status = 1; // Confirmed
        schedule.ApprovedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private string GetShiftTypeName(int shiftType) => shiftType switch
    {
        1 => "Ca sang",
        2 => "Ca chieu",
        3 => "Ca dem",
        4 => "Ca 24h",
        _ => "Khac"
    };

    private TimeSpan GetShiftStartTime(int shiftType) => shiftType switch
    {
        1 => new TimeSpan(7, 0, 0),
        2 => new TimeSpan(13, 0, 0),
        3 => new TimeSpan(19, 0, 0),
        4 => new TimeSpan(7, 0, 0),
        _ => new TimeSpan(7, 0, 0)
    };

    private TimeSpan GetShiftEndTime(int shiftType) => shiftType switch
    {
        1 => new TimeSpan(12, 0, 0),
        2 => new TimeSpan(18, 0, 0),
        3 => new TimeSpan(7, 0, 0),
        4 => new TimeSpan(7, 0, 0),
        _ => new TimeSpan(17, 0, 0)
    };

    #endregion

    #region Room Assignment - Phân phòng thực hiện

    public async Task<RoomAssignmentDto> AssignRoomAsync(AssignRoomRequestDto request)
    {
        // AssignedAt ghi bằng DateTime.Now — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (asgnFromUtc, asgnToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
        var queueNumber = await _context.Set<RadiologyRoomAssignment>()
            .Where(a => a.RoomId == request.RoomId && a.AssignedAt >= asgnFromUtc && a.AssignedAt < asgnToUtc)
            .CountAsync() + 1;

        var assignment = new RadiologyRoomAssignment
        {
            Id = Guid.NewGuid(),
            RadiologyRequestId = request.RadiologyRequestId,
            RoomId = request.RoomId,
            ModalityId = request.ModalityId,
            QueueNumber = queueNumber,
            Status = 0, // Waiting
            AssignedAt = DateTime.UtcNow, // dot16: chuẩn UTC — query DayRangeUtc (:924/:988/:1063)
            Notes = request.Notes,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyRoomAssignment>().AddAsync(assignment);
        await _unitOfWork.SaveChangesAsync();

        return new RoomAssignmentDto
        {
            Id = assignment.Id,
            RadiologyRequestId = request.RadiologyRequestId,
            RoomId = request.RoomId,
            QueueNumber = queueNumber,
            Status = 0,
            StatusName = "Cho",
            AssignedAt = assignment.AssignedAt
        };
    }

    public async Task<RoomAssignmentDto> UpdateRoomAssignmentAsync(Guid assignmentId, AssignRoomRequestDto request)
    {
        var assignment = await _context.Set<RadiologyRoomAssignment>().FindAsync(assignmentId);
        if (assignment == null) return null;

        assignment.RoomId = request.RoomId;
        assignment.ModalityId = request.ModalityId;
        assignment.Notes = request.Notes;
        assignment.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new RoomAssignmentDto
        {
            Id = assignment.Id,
            RadiologyRequestId = assignment.RadiologyRequestId,
            RoomId = assignment.RoomId,
            QueueNumber = assignment.QueueNumber,
            Status = assignment.Status
        };
    }

    public async Task<List<RoomAssignmentDto>> GetRoomQueueAsync(Guid roomId, DateTime date)
    {
        // AssignedAt ghi bằng DateTime.Now — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (rqFromUtc, rqToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var assignments = await _context.Set<RadiologyRoomAssignment>()
            .Include(a => a.RadiologyRequest)
                .ThenInclude(r => r.Patient)
            .Include(a => a.RadiologyRequest)
                .ThenInclude(r => r.Service)
            .Include(a => a.Room)
            .Include(a => a.Modality)
            .Where(a => a.RoomId == roomId && a.AssignedAt >= rqFromUtc && a.AssignedAt < rqToUtc && a.Status < 3)
            .OrderBy(a => a.QueueNumber)
            .ToListAsync();

        return assignments.Select(a => new RoomAssignmentDto
        {
            Id = a.Id,
            RadiologyRequestId = a.RadiologyRequestId,
            OrderCode = a.RadiologyRequest.RequestCode,
            PatientCode = a.RadiologyRequest.Patient.PatientCode,
            PatientName = a.RadiologyRequest.Patient.FullName,
            ServiceName = a.RadiologyRequest.Service?.ServiceName ?? "",
            RoomId = a.RoomId,
            RoomName = a.Room.RoomName,
            ModalityId = a.ModalityId,
            ModalityName = a.Modality?.ModalityName,
            QueueNumber = a.QueueNumber,
            Status = a.Status,
            StatusName = GetAssignmentStatusName(a.Status),
            AssignedAt = a.AssignedAt,
            CalledAt = a.CalledAt,
            StartedAt = a.StartedAt,
            CompletedAt = a.CompletedAt
        }).ToList();
    }

    public async Task<RoomAssignmentDto> CallNextPatientAsync(Guid roomId)
    {
        var nextAssignment = await _context.Set<RadiologyRoomAssignment>()
            .Include(a => a.RadiologyRequest)
                .ThenInclude(r => r.Patient)
            .Where(a => a.RoomId == roomId && a.Status == 0)
            .OrderBy(a => a.QueueNumber)
            .FirstOrDefaultAsync();

        if (nextAssignment == null) return null;

        nextAssignment.Status = 1; // Called
        nextAssignment.CalledAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new RoomAssignmentDto
        {
            Id = nextAssignment.Id,
            RadiologyRequestId = nextAssignment.RadiologyRequestId,
            PatientCode = nextAssignment.RadiologyRequest.Patient.PatientCode,
            PatientName = nextAssignment.RadiologyRequest.Patient.FullName,
            QueueNumber = nextAssignment.QueueNumber,
            Status = nextAssignment.Status,
            StatusName = "Da goi",
            CalledAt = nextAssignment.CalledAt
        };
    }

    public async Task<bool> SkipPatientAsync(Guid assignmentId, string reason)
    {
        var assignment = await _context.Set<RadiologyRoomAssignment>().FindAsync(assignmentId);
        if (assignment == null) return false;

        assignment.Status = 4; // Skipped
        assignment.Notes = reason;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<RoomStatisticsDto>> GetRoomStatisticsAsync(DateTime date)
    {
        // AssignedAt ghi bằng DateTime.Now — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (rsFromUtc, rsToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var rooms = await _context.Rooms.Where(r => r.RoomType >= 10 && r.RoomType < 20 && r.IsActive).ToListAsync();
        var result = new List<RoomStatisticsDto>();

        foreach (var room in rooms)
        {
            var assignments = await _context.Set<RadiologyRoomAssignment>()
                .Where(a => a.RoomId == room.Id && a.AssignedAt >= rsFromUtc && a.AssignedAt < rsToUtc)
                .ToListAsync();

            result.Add(new RoomStatisticsDto
            {
                RoomId = room.Id,
                RoomName = room.RoomName,
                WaitingCount = assignments.Count(a => a.Status == 0),
                CalledCount = assignments.Count(a => a.Status == 1),
                InProgressCount = assignments.Count(a => a.Status == 2),
                CompletedCount = assignments.Count(a => a.Status == 3),
                SkippedCount = assignments.Count(a => a.Status == 4),
                TotalCount = assignments.Count
            });
        }

        return result;
    }

    private string GetAssignmentStatusName(int status) => status switch
    {
        0 => "Cho",
        1 => "Da goi",
        2 => "Dang thuc hien",
        3 => "Hoan thanh",
        4 => "Bo qua",
        _ => "Khong xac dinh"
    };

    #endregion

    #region Tags - Quản lý Tag

    public async Task<List<RadiologyTagDto>> GetTagsAsync(string keyword = null, bool includeInactive = false)
    {
        var query = _context.Set<RadiologyTag>()
            .Include(t => t.Children)
            .Include(t => t.RequestTags)
            .Where(t => includeInactive || t.IsActive);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(t => t.Name.Contains(keyword) || t.Code.Contains(keyword));

        var tags = await query.Where(t => t.ParentId == null).OrderBy(t => t.SortOrder).ToListAsync();

        return tags.Select(MapTagToDto).ToList();
    }

    private RadiologyTagDto MapTagToDto(RadiologyTag tag)
    {
        return new RadiologyTagDto
        {
            Id = tag.Id,
            Code = tag.Code,
            Name = tag.Name,
            Description = tag.Description,
            Color = tag.Color,
            ParentId = tag.ParentId,
            SortOrder = tag.SortOrder,
            IsActive = tag.IsActive,
            RequestCount = tag.RequestTags?.Count ?? 0,
            Children = tag.Children?.Select(MapTagToDto).ToList() ?? new List<RadiologyTagDto>()
        };
    }

    public async Task<RadiologyTagDto> SaveTagAsync(SaveRadiologyTagDto dto)
    {
        RadiologyTag tag;
        if (dto.Id.HasValue)
        {
            tag = await _context.Set<RadiologyTag>().FindAsync(dto.Id.Value);
            if (tag == null) return null;
        }
        else
        {
            tag = new RadiologyTag { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyTag>().AddAsync(tag);
        }

        tag.Code = dto.Code;
        tag.Name = dto.Name;
        tag.Description = dto.Description;
        tag.Color = dto.Color;
        tag.ParentId = dto.ParentId;
        tag.SortOrder = dto.SortOrder;
        tag.IsActive = dto.IsActive;
        tag.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new RadiologyTagDto
        {
            Id = tag.Id,
            Code = tag.Code,
            Name = tag.Name,
            Description = tag.Description,
            Color = tag.Color,
            ParentId = tag.ParentId,
            SortOrder = tag.SortOrder,
            IsActive = tag.IsActive
        };
    }

    public async Task<bool> DeleteTagAsync(Guid tagId)
    {
        var tag = await _context.Set<RadiologyTag>().FindAsync(tagId);
        if (tag == null) return false;
        tag.IsActive = false;
        tag.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AssignTagsToRequestAsync(AssignTagRequestDto request)
    {
        foreach (var tagId in request.TagIds)
        {
            var existingTag = await _context.Set<RadiologyRequestTag>()
                .FirstOrDefaultAsync(rt => rt.RadiologyRequestId == request.RadiologyRequestId && rt.TagId == tagId);

            if (existingTag == null)
            {
                var requestTag = new RadiologyRequestTag
                {
                    Id = Guid.NewGuid(),
                    RadiologyRequestId = request.RadiologyRequestId,
                    TagId = tagId,
                    Note = request.Note,
                    CreatedAt = DateTime.Now
                };
                await _context.Set<RadiologyRequestTag>().AddAsync(requestTag);
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveTagFromRequestAsync(Guid requestId, Guid tagId)
    {
        var requestTag = await _context.Set<RadiologyRequestTag>()
            .FirstOrDefaultAsync(rt => rt.RadiologyRequestId == requestId && rt.TagId == tagId);

        if (requestTag == null) return false;

        _context.Set<RadiologyRequestTag>().Remove(requestTag);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<TaggedRequestDto>> GetRequestsByTagAsync(Guid tagId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.Set<RadiologyRequestTag>()
            .Include(rt => rt.RadiologyRequest)
                .ThenInclude(r => r.Patient)
            .Include(rt => rt.RadiologyRequest)
                .ThenInclude(r => r.Service)
            .Include(rt => rt.Tag)
            .Include(rt => rt.AddedByUser)
            .Where(rt => rt.TagId == tagId);

        if (fromDate.HasValue)
            query = query.Where(rt => rt.RadiologyRequest.RequestDate >= fromDate);
        if (toDate.HasValue)
            query = query.Where(rt => rt.RadiologyRequest.RequestDate <= toDate);

        var requestTags = await query.OrderByDescending(rt => rt.CreatedAt).ToListAsync();

        return requestTags.Select(rt => new TaggedRequestDto
        {
            Id = rt.Id,
            RadiologyRequestId = rt.RadiologyRequestId,
            OrderCode = rt.RadiologyRequest.RequestCode,
            PatientCode = rt.RadiologyRequest.Patient.PatientCode,
            PatientName = rt.RadiologyRequest.Patient.FullName,
            ServiceName = rt.RadiologyRequest.Service?.ServiceName ?? "",
            OrderDate = rt.RadiologyRequest.RequestDate,
            TagId = rt.TagId,
            TagName = rt.Tag.Name,
            TagColor = rt.Tag.Color,
            Note = rt.Note,
            AddedByUserName = rt.AddedByUser?.FullName,
            CreatedAt = rt.CreatedAt
        }).ToList();
    }

    public async Task<List<RadiologyTagDto>> GetTagsOfRequestAsync(Guid requestId)
    {
        var requestTags = await _context.Set<RadiologyRequestTag>()
            .Include(rt => rt.Tag)
            .Where(rt => rt.RadiologyRequestId == requestId)
            .ToListAsync();

        return requestTags.Select(rt => new RadiologyTagDto
        {
            Id = rt.Tag.Id,
            Code = rt.Tag.Code,
            Name = rt.Tag.Name,
            Color = rt.Tag.Color
        }).ToList();
    }

    #endregion
}
