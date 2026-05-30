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

// K3 phien 4 (2026-05-30): tach RIS region X HL7 CDA Integration (~361 dong) khoi
// RISCompleteService.cs. ZERO runtime change — partial class.
public partial class RISCompleteService
{
    #region X. HL7 CDA Integration - Tích hợp HL7 CDA

    public async Task<List<HL7CDAConfigDto>> GetHL7CDAConfigsAsync()
    {
        var configs = await _context.Set<RadiologyHL7CDAConfig>()
            .Where(c => c.IsActive)
            .ToListAsync();

        return configs.Select(c => new HL7CDAConfigDto
        {
            Id = c.Id,
            ConfigName = c.ConfigName,
            HL7Version = c.HL7Version,
            CDAVersion = c.CDAVersion,
            ReceivingApplication = c.ReceivingApplication,
            ReceivingFacility = c.ReceivingFacility,
            SendingApplication = c.SendingApplication,
            SendingFacility = c.SendingFacility,
            ConnectionType = c.ConnectionType,
            ServerAddress = c.ServerAddress,
            ServerPort = c.ServerPort,
            FilePath = c.FilePath,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<HL7CDAConfigDto> SaveHL7CDAConfigAsync(SaveHL7CDAConfigDto dto)
    {
        RadiologyHL7CDAConfig config;
        if (dto.Id.HasValue)
        {
            config = await _context.Set<RadiologyHL7CDAConfig>().FindAsync(dto.Id.Value);
            if (config == null) return null;
        }
        else
        {
            config = new RadiologyHL7CDAConfig { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyHL7CDAConfig>().AddAsync(config);
        }

        config.ConfigName = dto.ConfigName;
        config.HL7Version = dto.HL7Version;
        config.CDAVersion = dto.CDAVersion;
        config.ReceivingApplication = dto.ReceivingApplication;
        config.ReceivingFacility = dto.ReceivingFacility;
        config.SendingApplication = dto.SendingApplication;
        config.SendingFacility = dto.SendingFacility;
        config.ConnectionType = dto.ConnectionType;
        config.ServerAddress = dto.ServerAddress;
        config.ServerPort = dto.ServerPort;
        config.FilePath = dto.FilePath;
        config.IsActive = dto.IsActive;
        config.ConfigJson = dto.ConfigJson;
        config.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new HL7CDAConfigDto
        {
            Id = config.Id,
            ConfigName = config.ConfigName,
            HL7Version = config.HL7Version,
            IsActive = config.IsActive
        };
    }

    public async Task<SendHL7ResultDto> SendHL7MessageAsync(SendHL7MessageDto dto)
    {
        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = Guid.NewGuid().ToString(),
            MessageType = dto.MessageType,
            TriggerEvent = dto.TriggerEvent,
            RawMessage = System.Text.Json.JsonSerializer.Serialize(dto.Segments ?? new Dictionary<string, object>()),
            Direction = "Outbound",
            RadiologyRequestId = dto.RadiologyRequestId,
            PatientId = dto.PatientId,
            AccessionNumber = dto.AccessionNumber,
            Status = 1, // Sent
            MessageDateTime = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return new SendHL7ResultDto
        {
            Success = true,
            MessageControlId = message.MessageControlId,
            SentAt = message.MessageDateTime,
            AckCode = "AA"
        };
    }

    public async Task<List<HL7MessageDto>> GetHL7MessagesAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string direction = null,
        int? status = null)
    {
        var query = _context.Set<RadiologyHL7Message>().AsQueryable();

        if (fromDate.HasValue)
            query = query.Where(m => m.CreatedAt >= fromDate);
        if (toDate.HasValue)
            query = query.Where(m => m.CreatedAt <= toDate);
        if (!string.IsNullOrEmpty(direction))
            query = query.Where(m => m.Direction == direction);
        if (status.HasValue)
            query = query.Where(m => m.Status == status);

        var messages = await query.OrderByDescending(m => m.CreatedAt).Take(100).ToListAsync();

        return messages.Select(m => new HL7MessageDto
        {
            Id = m.Id,
            MessageControlId = m.MessageControlId,
            MessageType = m.MessageType,
            TriggerEvent = m.TriggerEvent,
            Direction = m.Direction,
            RadiologyRequestId = m.RadiologyRequestId,
            PatientId = m.PatientId,
            AccessionNumber = m.AccessionNumber,
            RawMessage = m.RawMessage,
            ParsedData = m.ParsedData,
            MessageDateTime = m.MessageDateTime,
            Status = m.Status,
            AckCode = m.AckCode,
            ErrorMessage = m.ErrorMessage,
            RetryCount = m.RetryCount
        }).ToList();
    }

    public async Task<CDADocumentDto> CreateCDADocumentAsync(CreateCDADocumentDto dto)
    {
        var cdaDoc = new RadiologyCDADocument
        {
            Id = Guid.NewGuid(),
            DocumentId = Guid.NewGuid().ToString(),
            RadiologyReportId = dto.RadiologyReportId,
            DocumentType = dto.DocumentType,
            CDAContent = GenerateCDAContent(dto),
            SignatureType = dto.SignatureType,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyCDADocument>().AddAsync(cdaDoc);
        await _unitOfWork.SaveChangesAsync();

        return new CDADocumentDto
        {
            Id = cdaDoc.Id,
            DocumentId = cdaDoc.DocumentId,
            DocumentType = cdaDoc.DocumentType,
            RadiologyReportId = cdaDoc.RadiologyReportId,
            CDAContent = cdaDoc.CDAContent,
            Status = cdaDoc.Status
        };
    }

    public async Task<CDADocumentDto> GetCDADocumentAsync(Guid reportId)
    {
        var cdaDoc = await _context.Set<RadiologyCDADocument>()
            .FirstOrDefaultAsync(d => d.RadiologyReportId == reportId);

        if (cdaDoc == null) return null;

        return new CDADocumentDto
        {
            Id = cdaDoc.Id,
            DocumentId = cdaDoc.DocumentId,
            RadiologyReportId = cdaDoc.RadiologyReportId,
            DocumentType = cdaDoc.DocumentType,
            CDAContent = cdaDoc.CDAContent,
            IsSigned = cdaDoc.IsSigned,
            SignatureType = cdaDoc.SignatureType,
            SignedAt = cdaDoc.SignedAt,
            Status = cdaDoc.Status,
            SentAt = cdaDoc.SentAt,
            AckStatus = cdaDoc.AckStatus
        };
    }

    public async Task<Guid> ReceiveHL7OrderAsync(string hl7Message)
    {
        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = Guid.NewGuid().ToString(),
            MessageType = "ORM",
            TriggerEvent = "O01",
            RawMessage = hl7Message,
            Direction = "Inbound",
            Status = 1,
            MessageDateTime = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        // Parse HL7 message and create radiology request
        // In production, implement HL7 parsing logic
        return message.Id;
    }

    private string GenerateCDAContent(CreateCDADocumentDto dto)
    {
        return $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<ClinicalDocument xmlns=""urn:hl7-org:v3"">
    <typeId root=""2.16.840.1.113883.1.3"" extension=""POCD_HD000040""/>
    <id root=""{dto.RadiologyReportId}""/>
    <code code=""18748-4"" codeSystem=""2.16.840.1.113883.6.1"" displayName=""Diagnostic Imaging Report""/>
    <title>Radiology Report</title>
    <effectiveTime value=""{DateTime.Now:yyyyMMddHHmmss}""/>
    <confidentialityCode code=""N"" codeSystem=""2.16.840.1.113883.5.25""/>
</ClinicalDocument>";
    }

    public async Task<bool> DeleteHL7CDAConfigAsync(Guid configId)
    {
        var config = await _context.Set<RadiologyHL7CDAConfig>().FindAsync(configId);
        if (config == null) return false;
        config.IsActive = false;
        config.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> TestHL7ConnectionAsync(Guid configId)
    {
        var config = await _context.Set<RadiologyHL7CDAConfig>().FindAsync(configId);
        if (config == null) return false;
        // In production, test actual HL7 connection
        return true;
    }

    public async Task<HL7MessageSearchResultDto> SearchHL7MessagesAsync(SearchHL7MessageDto searchDto)
    {
        var query = _context.Set<RadiologyHL7Message>().AsQueryable();

        if (searchDto.FromDate.HasValue)
            query = query.Where(m => m.CreatedAt >= searchDto.FromDate);
        if (searchDto.ToDate.HasValue)
            query = query.Where(m => m.CreatedAt <= searchDto.ToDate);
        if (!string.IsNullOrEmpty(searchDto.Direction))
            query = query.Where(m => m.Direction == searchDto.Direction);
        if (!string.IsNullOrEmpty(searchDto.MessageType))
            query = query.Where(m => m.MessageType == searchDto.MessageType);
        if (searchDto.Status.HasValue)
            query = query.Where(m => m.Status == searchDto.Status);

        var totalCount = await query.CountAsync();
        var messages = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return new HL7MessageSearchResultDto
        {
            Items = messages.Select(m => new HL7MessageDto
            {
                Id = m.Id,
                MessageControlId = m.MessageControlId,
                MessageType = m.MessageType,
                TriggerEvent = m.TriggerEvent,
                Direction = m.Direction,
                RadiologyRequestId = m.RadiologyRequestId,
                PatientId = m.PatientId,
                AccessionNumber = m.AccessionNumber,
                RawMessage = m.RawMessage,
                ParsedData = m.ParsedData,
                MessageDateTime = m.MessageDateTime,
                Status = m.Status,
                AckCode = m.AckCode,
                ErrorMessage = m.ErrorMessage,
                RetryCount = m.RetryCount
            }).ToList(),
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / searchDto.PageSize),
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<bool> RetryHL7MessageAsync(Guid messageId)
    {
        var message = await _context.Set<RadiologyHL7Message>().FindAsync(messageId);
        if (message == null || message.Status != 2) return false;

        message.Status = 0; // Pending for retry
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SendCDADocumentAsync(SendCDADocumentDto dto)
    {
        var cdaDoc = await _context.Set<RadiologyCDADocument>().FindAsync(dto.DocumentId);
        if (cdaDoc == null) return false;

        // In production, send CDA document to destination
        return true;
    }

    public async Task<SendHL7ResultDto> SendHL7ResultAsync(Guid reportId, bool withSignature)
    {
        var report = await _context.RadiologyReports.FindAsync(reportId);
        if (report == null)
        {
            return new SendHL7ResultDto { Success = false, ErrorMessage = "Report not found" };
        }

        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = Guid.NewGuid().ToString(),
            MessageType = "ORU",
            TriggerEvent = "R01",
            RawMessage = $"Report {reportId}",
            Direction = "Outbound",
            Status = 1,
            MessageDateTime = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return new SendHL7ResultDto
        {
            Success = true,
            MessageControlId = message.MessageControlId,
            SentAt = message.MessageDateTime,
            AckCode = "AA"
        };
    }

    public async Task<bool> CancelHL7ResultAsync(Guid reportId, string reason)
    {
        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = Guid.NewGuid().ToString(),
            MessageType = "ORU",
            TriggerEvent = "R01",
            RawMessage = $"Cancel report {reportId}: {reason}",
            Direction = "Outbound",
            Status = 1,
            MessageDateTime = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    #endregion
}
