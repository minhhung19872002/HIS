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

    // RadiologyHL7Message.Status: 0=Received, 1=Processing, 2=Processed, 3=Error, 4=Acknowledged.
    private const int Hl7StatusProcessing = 1;
    private const int Hl7StatusError = 3;
    private const int Hl7StatusAcknowledged = 4;

    private const char Hl7FieldSeparator = '|';
    private const string Hl7EncodingCharacters = "^~\\&";

    /// <summary>Kênh HL7 v2 chạy trên socket: "MLLP" và "TCP" là cùng một thứ trong triển khai thực tế.</summary>
    private static bool IsMllpChannel(string? connectionType) =>
        string.IsNullOrWhiteSpace(connectionType) ||
        connectionType.Trim().Equals("MLLP", StringComparison.OrdinalIgnoreCase) ||
        connectionType.Trim().Equals("TCP", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Kết quả gửi đi kèm lý do khi không chọn được kênh — để caller báo lỗi thật thay vì im lặng.
    /// </summary>
    private sealed record Hl7ChannelSelection(RadiologyHL7CDAConfig? Config, string? Error);

    /// <summary>
    /// Chọn kênh HL7 để gửi kết quả CĐHA đi. Nhiều kênh đang bật mà không chỉ định kênh mặc định
    /// thì DỪNG — tránh gửi nhầm kết quả CĐHA sang giao diện của hệ khác (LIS, PACS...).
    /// Kênh mặc định khai ở config `RIS:Hl7:DefaultConfigName`.
    /// </summary>
    private async Task<Hl7ChannelSelection> SelectHl7ChannelAsync(Guid? configId = null)
    {
        var active = await _context.Set<RadiologyHL7CDAConfig>()
            .Where(c => c.IsActive && !c.IsDeleted)
            .OrderBy(c => c.ConfigName)
            .ToListAsync();

        if (configId.HasValue)
        {
            var explicitConfig = active.FirstOrDefault(c => c.Id == configId.Value);
            return explicitConfig != null
                ? new Hl7ChannelSelection(explicitConfig, null)
                : new Hl7ChannelSelection(null, "Kênh HL7 được chỉ định không tồn tại hoặc đã tắt");
        }

        if (active.Count == 0)
            return new Hl7ChannelSelection(null,
                "Chưa cấu hình kênh HL7 đang hoạt động — vào Quản trị RIS > HL7/CDA để khai báo");

        var defaultName = _configuration["RIS:Hl7:DefaultConfigName"];
        if (!string.IsNullOrWhiteSpace(defaultName))
        {
            var named = active.FirstOrDefault(c =>
                string.Equals(c.ConfigName, defaultName.Trim(), StringComparison.OrdinalIgnoreCase));
            return named != null
                ? new Hl7ChannelSelection(named, null)
                : new Hl7ChannelSelection(null,
                    $"Không tìm thấy kênh HL7 mặc định '{defaultName}' trong danh sách đang hoạt động");
        }

        if (active.Count == 1) return new Hl7ChannelSelection(active[0], null);

        return new Hl7ChannelSelection(null,
            $"Có {active.Count} kênh HL7 đang hoạt động ({string.Join(", ", active.Select(c => c.ConfigName))}) — " +
            "khai báo `RIS:Hl7:DefaultConfigName` để chọn kênh gửi kết quả CĐHA");
    }

    private static string Hl7Timestamp(DateTime value) => value.ToString("yyyyMMddHHmmss");

    private static string Hl7Escape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        return value
            .Replace("\\", "\\E\\")
            .Replace("|", "\\F\\")
            .Replace("^", "\\S\\")
            .Replace("&", "\\T\\")
            .Replace("~", "\\R\\")
            .Replace("\r", " ")
            .Replace("\n", " ");
    }

    private static string BuildMshSegment(
        RadiologyHL7CDAConfig config,
        string messageType,
        string triggerEvent,
        string messageControlId,
        DateTime sentAt) =>
        string.Join(Hl7FieldSeparator,
            "MSH",
            Hl7EncodingCharacters,
            Hl7Escape(config.SendingApplication),
            Hl7Escape(config.SendingFacility),
            Hl7Escape(config.ReceivingApplication),
            Hl7Escape(config.ReceivingFacility),
            Hl7Timestamp(sentAt),
            string.Empty,
            $"{messageType}^{triggerEvent}",
            messageControlId,
            "P",
            string.IsNullOrWhiteSpace(config.HL7Version) ? "2.5" : config.HL7Version);

    /// <summary>
    /// Gửi message qua đúng kênh đã cấu hình và ghi lại kết quả thật (ACK của hệ nhận).
    /// </summary>
    private async Task<Hl7SendOutcome> DispatchHl7Async(RadiologyHL7CDAConfig config, string message)
    {
        var connectionType = (config.ConnectionType ?? "MLLP").Trim();
        if (IsMllpChannel(connectionType))
        {
            var timeout = _configuration.GetValue<int>("RIS:Hl7:TimeoutSeconds", 30);
            return await Hl7MllpClient.SendAsync(
                config.ServerAddress ?? string.Empty, config.ServerPort ?? 0, message, timeout);
        }

        if (string.Equals(connectionType, "File", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(config.FilePath))
                return new Hl7SendOutcome(false, null, null, null, "HL7 File drop path is not configured");
            try
            {
                Directory.CreateDirectory(config.FilePath);
                var path = Path.Combine(config.FilePath, $"{Guid.NewGuid():N}.hl7");
                await File.WriteAllTextAsync(path, message.Replace("\r", Environment.NewLine), Encoding.UTF8);
                return new Hl7SendOutcome(true, null, null, null, null);
            }
            catch (Exception ex)
            {
                return new Hl7SendOutcome(false, null, null, null, ex.GetBaseException().Message);
            }
        }

        if (string.Equals(connectionType, "HTTP", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(config.ServerAddress))
                return new Hl7SendOutcome(false, null, null, null, "HL7 HTTP endpoint is not configured");
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
                using var content = new StringContent(message, Encoding.UTF8, "application/hl7-v2");
                using var response = await http.PostAsync(config.ServerAddress, content);
                var body = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                    return new Hl7SendOutcome(false, null, null, body,
                        $"HL7 HTTP endpoint returned {(int)response.StatusCode}");
                return new Hl7SendOutcome(true, null, null, body, null);
            }
            catch (Exception ex)
            {
                return new Hl7SendOutcome(false, null, null, null, ex.GetBaseException().Message);
            }
        }

        return new Hl7SendOutcome(false, null, null, null,
            $"Kiểu kết nối HL7 '{connectionType}' chưa được hỗ trợ");
    }

    /// <summary>Ghi log message vừa gửi kèm trạng thái/ACK thật rồi trả kết quả cho caller.</summary>
    private async Task<SendHL7ResultDto> PersistOutboundHl7Async(
        RadiologyHL7Message message,
        Hl7SendOutcome outcome)
    {
        message.Status = outcome.Success ? Hl7StatusAcknowledged : Hl7StatusError;
        message.AckCode = outcome.AckCode;
        message.ErrorMessage = outcome.ErrorMessage;
        await _unitOfWork.SaveChangesAsync();

        if (!outcome.Success)
        {
            _logger.LogWarning(
                "HL7 {MessageType}^{TriggerEvent} {ControlId} không gửi được: {Error}",
                message.MessageType, message.TriggerEvent, message.MessageControlId, outcome.ErrorMessage);
        }

        return new SendHL7ResultDto
        {
            Success = outcome.Success,
            MessageControlId = message.MessageControlId,
            SentAt = message.MessageDateTime,
            AckCode = outcome.AckCode,
            ErrorMessage = outcome.ErrorMessage
        };
    }

    private static SendHL7ResultDto NoChannelResult(string messageControlId, string? error) => new()
    {
        Success = false,
        MessageControlId = messageControlId,
        SentAt = DateTime.Now,
        ErrorMessage = error ?? "Chưa cấu hình kênh HL7 đang hoạt động"
    };

    public async Task<SendHL7ResultDto> SendHL7MessageAsync(SendHL7MessageDto dto)
    {
        var controlId = Guid.NewGuid().ToString("N");
        var channel = await SelectHl7ChannelAsync();
        if (channel.Config == null) return NoChannelResult(controlId, channel.Error);
        var config = channel.Config;

        var sentAt = DateTime.Now;
        var segments = new List<string>
        {
            BuildMshSegment(config, dto.MessageType, dto.TriggerEvent, controlId, sentAt)
        };
        foreach (var segment in dto.Segments ?? new Dictionary<string, object>())
        {
            var body = segment.Value?.ToString() ?? string.Empty;
            segments.Add($"{segment.Key}{Hl7FieldSeparator}{body.Replace("\r", " ").Replace("\n", " ")}");
        }
        var raw = string.Join("\r", segments);

        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = controlId,
            MessageType = dto.MessageType,
            TriggerEvent = dto.TriggerEvent,
            RawMessage = raw,
            Direction = "Outbound",
            RadiologyRequestId = dto.RadiologyRequestId,
            PatientId = dto.PatientId,
            AccessionNumber = dto.AccessionNumber,
            Status = Hl7StatusProcessing,
            MessageDateTime = sentAt,
            CreatedAt = sentAt
        };
        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return await PersistOutboundHl7Async(message, await DispatchHl7Async(config, raw));
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

        var connectionType = (config.ConnectionType ?? "MLLP").Trim();
        if (string.Equals(connectionType, "File", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(config.FilePath)) return false;
            try
            {
                Directory.CreateDirectory(config.FilePath);
                return Directory.Exists(config.FilePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "HL7 file drop {Path} không truy cập được", config.FilePath);
                return false;
            }
        }

        if (string.Equals(connectionType, "HTTP", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(config.ServerAddress)) return false;
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                using var response = await http.GetAsync(config.ServerAddress);
                return (int)response.StatusCode < 500;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "HL7 HTTP endpoint {Endpoint} không kết nối được", config.ServerAddress);
                return false;
            }
        }

        var outcome = await Hl7MllpClient.TestConnectionAsync(
            config.ServerAddress ?? string.Empty, config.ServerPort ?? 0);
        if (!outcome.Success)
            _logger.LogWarning("HL7 MLLP {Host}:{Port} không kết nối được: {Error}",
                config.ServerAddress, config.ServerPort, outcome.ErrorMessage);
        return outcome.Success;
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
        if (message == null || message.Direction != "Outbound" || message.Status != Hl7StatusError)
            return false;

        var channel = await SelectHl7ChannelAsync();
        if (channel.Config == null)
        {
            message.ErrorMessage = channel.Error;
            await _unitOfWork.SaveChangesAsync();
            return false;
        }
        var config = channel.Config;

        message.RetryCount++;
        message.LastRetryAt = DateTime.Now;
        message.Status = Hl7StatusProcessing;
        await _unitOfWork.SaveChangesAsync();

        var outcome = await DispatchHl7Async(config, message.RawMessage);
        await PersistOutboundHl7Async(message, outcome);
        return outcome.Success;
    }

    public async Task<bool> SendCDADocumentAsync(SendCDADocumentDto dto)
    {
        var cdaDoc = await _context.Set<RadiologyCDADocument>().FindAsync(dto.DocumentId);
        if (cdaDoc == null) return false;
        if (string.IsNullOrWhiteSpace(cdaDoc.CDAContent))
        {
            _logger.LogWarning("Tài liệu CDA {DocumentId} rỗng, không gửi", dto.DocumentId);
            return false;
        }

        var channel = await SelectHl7ChannelAsync(dto.ConfigId);
        if (channel.Config == null)
        {
            _logger.LogWarning("Không chọn được kênh gửi CDA: {Error}", channel.Error);
            return false;
        }
        var config = channel.Config;

        var connectionType = (config.ConnectionType ?? "HTTP").Trim();
        if (string.Equals(connectionType, "File", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(config.FilePath)) return false;
            try
            {
                Directory.CreateDirectory(config.FilePath);
                var path = Path.Combine(config.FilePath, $"CDA_{cdaDoc.DocumentId}.xml");
                await File.WriteAllTextAsync(path, cdaDoc.CDAContent, Encoding.UTF8);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ghi tài liệu CDA {DocumentId} ra {Path} thất bại",
                    dto.DocumentId, config.FilePath);
                return false;
            }
        }

        if (string.IsNullOrWhiteSpace(config.ServerAddress))
        {
            _logger.LogWarning("Kênh CDA {ConfigName} chưa có địa chỉ đích", config.ConfigName);
            return false;
        }

        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
            using var content = new StringContent(cdaDoc.CDAContent, Encoding.UTF8, "application/xml");
            using var response = await http.PostAsync(config.ServerAddress, content);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gửi CDA {DocumentId} bị từ chối: HTTP {Status} {Body}",
                    dto.DocumentId, (int)response.StatusCode, body);
                return false;
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gửi tài liệu CDA {DocumentId} thất bại", dto.DocumentId);
            return false;
        }
    }

    /// <summary>
    /// Dựng ORU^R01 thật từ kết quả đọc (MSH/PID/OBR/OBX) rồi gửi qua kênh đã cấu hình.
    /// </summary>
    public async Task<SendHL7ResultDto> SendHL7ResultAsync(Guid reportId, bool withSignature)
    {
        var report = await _context.RadiologyReports
            .Include(r => r.Radiologist)
            .Include(r => r.RadiologyExam).ThenInclude(e => e.RadiologyRequest).ThenInclude(q => q.Patient)
            .Include(r => r.RadiologyExam).ThenInclude(e => e.RadiologyRequest).ThenInclude(q => q.Service)
            .FirstOrDefaultAsync(r => r.Id == reportId);
        if (report == null)
            return new SendHL7ResultDto { Success = false, ErrorMessage = "Không tìm thấy kết quả đọc" };

        var controlId = Guid.NewGuid().ToString("N");
        var channel = await SelectHl7ChannelAsync();
        if (channel.Config == null) return NoChannelResult(controlId, channel.Error);
        var config = channel.Config;

        var sentAt = DateTime.Now;
        // Kết quả đã duyệt gửi 'F' (final), chưa duyệt gửi 'P' (preliminary) — đúng nghĩa lâm sàng.
        var resultStatus = report.Status >= 2 ? "F" : "P";
        var raw = BuildOruMessage(config, report, controlId, sentAt, resultStatus, withSignature);

        var request = report.RadiologyExam?.RadiologyRequest;
        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = controlId,
            MessageType = "ORU",
            TriggerEvent = "R01",
            RawMessage = raw,
            Direction = "Outbound",
            RadiologyRequestId = request?.Id,
            PatientId = request?.Patient?.PatientCode,
            AccessionNumber = report.RadiologyExam?.AccessionNumber,
            Status = Hl7StatusProcessing,
            MessageDateTime = sentAt,
            CreatedAt = sentAt
        };
        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return await PersistOutboundHl7Async(message, await DispatchHl7Async(config, raw));
    }

    private static string BuildOruMessage(
        RadiologyHL7CDAConfig config,
        RadiologyReport report,
        string controlId,
        DateTime sentAt,
        string resultStatus,
        bool withSignature)
    {
        var exam = report.RadiologyExam;
        var request = exam?.RadiologyRequest;
        var patient = request?.Patient;

        var segments = new List<string>
        {
            BuildMshSegment(config, "ORU", "R01", controlId, sentAt),
            string.Join(Hl7FieldSeparator,
                "PID", "1", string.Empty,
                Hl7Escape(patient?.PatientCode), string.Empty,
                Hl7Escape(patient?.FullName?.Replace(' ', '^')),
                string.Empty,
                patient?.DateOfBirth?.ToString("yyyyMMdd") ?? string.Empty,
                patient?.Gender == 1 ? "M" : patient?.Gender == 2 ? "F" : "U"),
            string.Join(Hl7FieldSeparator,
                "OBR", "1",
                Hl7Escape(request?.RequestCode),
                Hl7Escape(exam?.AccessionNumber),
                $"{Hl7Escape(request?.Service?.ServiceCode)}^{Hl7Escape(request?.Service?.ServiceName)}",
                string.Empty, string.Empty,
                exam?.ExamDate != null ? Hl7Timestamp(exam.ExamDate) : string.Empty,
                string.Empty, string.Empty, string.Empty, string.Empty, string.Empty, string.Empty,
                string.Empty, string.Empty, string.Empty, string.Empty, string.Empty, string.Empty,
                string.Empty, string.Empty, string.Empty,
                report.ReportDate != null ? Hl7Timestamp(report.ReportDate.Value) : Hl7Timestamp(sentAt),
                string.Empty, string.Empty, resultStatus)
        };

        var observations = new List<(string Code, string Name, string? Value)>
        {
            ("FINDINGS", "Mô tả hình ảnh", report.Findings),
            ("IMPRESSION", "Kết luận", report.Impression),
            ("RECOMMENDATION", "Đề nghị", report.Recommendations)
        };
        if (withSignature)
        {
            observations.Add(("SIGNEDBY", "Bác sĩ ký",
                report.Radiologist?.FullName));
            observations.Add(("SIGNEDAT", "Thời điểm duyệt",
                report.ApprovedAt?.ToString("yyyy-MM-dd HH:mm")));
        }

        var setId = 1;
        foreach (var (code, name, value) in observations)
        {
            if (string.IsNullOrWhiteSpace(value)) continue;
            segments.Add(string.Join(Hl7FieldSeparator,
                "OBX", setId.ToString(), "TX",
                $"{code}^{Hl7Escape(name)}",
                "1", Hl7Escape(value),
                string.Empty, string.Empty, string.Empty, string.Empty,
                resultStatus));
            setId++;
        }

        return string.Join("\r", segments);
    }

    public async Task<bool> CancelHL7ResultAsync(Guid reportId, string reason)
    {
        var report = await _context.RadiologyReports
            .Include(r => r.RadiologyExam).ThenInclude(e => e.RadiologyRequest).ThenInclude(q => q.Patient)
            .Include(r => r.RadiologyExam).ThenInclude(e => e.RadiologyRequest).ThenInclude(q => q.Service)
            .FirstOrDefaultAsync(r => r.Id == reportId);
        if (report == null) return false;

        var controlId = Guid.NewGuid().ToString("N");
        var channel = await SelectHl7ChannelAsync();
        if (channel.Config == null)
        {
            _logger.LogWarning("Không huỷ được kết quả {ReportId} phía hệ nhận: {Error}", reportId, channel.Error);
            return false;
        }
        var config = channel.Config;

        var sentAt = DateTime.Now;
        // 'X' = results cannot be obtained / huỷ kết quả đã gửi (HL7 Table 0123).
        var raw = BuildOruMessage(config, report, controlId, sentAt, "X", withSignature: false);
        raw += $"\rNTE{Hl7FieldSeparator}1{Hl7FieldSeparator}{Hl7FieldSeparator}{Hl7Escape(reason)}";

        var request = report.RadiologyExam?.RadiologyRequest;
        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = controlId,
            MessageType = "ORU",
            TriggerEvent = "R01",
            RawMessage = raw,
            Direction = "Outbound",
            RadiologyRequestId = request?.Id,
            PatientId = request?.Patient?.PatientCode,
            AccessionNumber = report.RadiologyExam?.AccessionNumber,
            Status = Hl7StatusProcessing,
            MessageDateTime = sentAt,
            CreatedAt = sentAt
        };
        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        var result = await PersistOutboundHl7Async(message, await DispatchHl7Async(config, raw));
        return result.Success;
    }

    #endregion
}
