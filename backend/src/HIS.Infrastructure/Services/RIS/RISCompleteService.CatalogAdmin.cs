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

        var rooms = await query.ToBoundedListAsync("RISCompleteService.GetRooms");

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

        var templates = await query.OrderBy(t => t.SortOrder).ToBoundedListAsync("RISCompleteService.GetDiagnosisTemplates");

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

        var abbreviations = await query.OrderBy(a => a.SortOrder).ToBoundedListAsync("RISCompleteService.GetAbbreviations");

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
}
