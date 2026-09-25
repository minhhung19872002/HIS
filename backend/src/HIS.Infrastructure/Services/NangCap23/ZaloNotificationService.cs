using System.Text.Json;
using System.Text;
using HIS.Application.DTOs.NangCap23;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;
// ============================================================================
// Batch 4.1: Zalo Notification Service
// ============================================================================

public class ZaloNotificationService : IZaloNotificationService
{
    private const string EntityLabel = "Tin Zalo ZNS";
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly IZaloOaClient _client;
    private readonly INangCap23ConfigStore _configStore;
    private readonly ILogger<ZaloNotificationService> _logger;

    public ZaloNotificationService(
        HISDbContext db, IConfiguration config,
        IZaloOaClient client, INangCap23ConfigStore configStore, ILogger<ZaloNotificationService> logger)
    {
        _db = db; _config = config; _client = client; _configStore = configStore; _logger = logger;
    }

    private static string StatusName(int s) => s switch
    {
        0 => "Đang chờ", 1 => "Đã gửi", 2 => "Đã nhận", 3 => "Lỗi", 4 => "Giả lập — không gửi thật", _ => "Khác"
    };

    /// <summary>QA-R11: status of a message produced by the mock channel (never reached Zalo).</summary>
    private const int StatusMock = 4;
    private const string MockNote = "[MOCK] Chế độ giả lập — tin KHÔNG được gửi tới Zalo, không tính phí";

    /// <summary>
    /// QA-R11 (mock honesty): the client is chosen once at startup from appsettings <c>Zalo:MockMode</c>, while the
    /// config screen toggles <c>NangCap23.Zalo.MockMode/IsEnabled</c> in the DB — so the toggles changed nothing and a
    /// mock send was stored as "Đã nhận" (Delivered) with a 350đ cost. Mock = either switch says mock; the mock path
    /// never calls the real client and is recorded as <see cref="StatusMock"/> with cost 0.
    /// </summary>
    private async Task<(bool Mock, bool Enabled)> GetModeAsync()
    {
        var dbMock = await _configStore.GetBoolAsync("NangCap23.Zalo.MockMode", _config.GetValue<bool>("Zalo:MockMode", false));
        var enabled = await _configStore.GetBoolAsync("NangCap23.Zalo.IsEnabled", _config.GetValue<bool>("Zalo:IsEnabled", false));
        return (dbMock || _client is HIS.Infrastructure.Services.External.InMemoryZaloOaClient, enabled);
    }

    private async Task<GatewaySubmissionResult> DispatchAsync(string phone, string templateId, string payloadJson)
    {
        var (mock, enabled) = await GetModeAsync();
        if (mock)
            return new GatewaySubmissionResult { Acknowledged = false, ErrorCode = "MOCK", ErrorMessage = MockNote, TransactionId = $"MOCK-ZL-{Guid.NewGuid():N}"[..18] };
        if (!enabled)
            throw new InvalidOperationException("Kênh Zalo OA đang tắt — bật \"IsEnabled\" trong cấu hình Zalo trước khi gửi.");
        return await _client.SendTemplateMessageAsync(phone, templateId, payloadJson);
    }

    public async Task<List<ZaloNotificationLogDto>> SearchLogsAsync(string? keyword, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.ZaloNotificationLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.TargetPhone.Contains(k) || x.TemplateName.Contains(k) || (x.PatientName != null && x.PatientName.Contains(k)));
        }
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.CreatedAt <= to.Value);

        return await q.OrderByDescending(x => x.CreatedAt)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .Select(r => new ZaloNotificationLogDto
            {
                Id = r.Id,
                TemplateId = r.TemplateId,
                TemplateName = r.TemplateName,
                TargetPhone = r.TargetPhone,
                PatientId = r.PatientId,
                PatientName = r.PatientName,
                RelatedEntityType = r.RelatedEntityType,
                RelatedEntityId = r.RelatedEntityId,
                PayloadJson = r.PayloadJson,
                MessageId = r.MessageId,
                Status = r.Status,
                StatusName = StatusName(r.Status),
                ErrorCode = r.ErrorCode,
                ErrorMessage = r.ErrorMessage,
                SentAt = r.SentAt,
                DeliveredAt = r.DeliveredAt,
                CostVnd = r.CostVnd,
                RetryCount = r.RetryCount,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ZaloNotificationLogDto?> GetLogAsync(Guid id)
    {
        return (await SearchLogsAsync(null, null, null, null, 0, 1000)).FirstOrDefault(x => x.Id == id);
    }

    public async Task<ZaloNotificationLogDto> SendAsync(SendZaloMessageDto dto, string? userId)
    {
        // Validation
        if (string.IsNullOrWhiteSpace(dto.TargetPhone) || dto.TargetPhone.Length < 9 || dto.TargetPhone.Length > 12)
            throw new ArgumentException("Số điện thoại không hợp lệ (yêu cầu 9-12 chữ số).", nameof(dto));
        if (string.IsNullOrWhiteSpace(dto.TemplateId))
            throw new ArgumentException("Thiếu TemplateId.", nameof(dto));

        // Resolve patient name if patientId provided
        string? patientName = null;
        if (dto.PatientId.HasValue)
        {
            patientName = await _db.Patients.AsNoTracking()
                .Where(p => p.Id == dto.PatientId)
                .Select(p => p.FullName)
                .FirstOrDefaultAsync();
        }

        var templateName = dto.TemplateId switch
        {
            "appointment_reminder" => "Nhắc lịch tái khám",
            "lab_result_ready" => "Kết quả XN sẵn sàng",
            "prescription_dispense" => "Đơn thuốc đã có",
            "medicine_reminder" => "Nhắc uống thuốc",
            _ => "Thông báo"
        };

        var entity = new ZaloNotificationLog
        {
            Id = Guid.NewGuid(),
            TemplateId = dto.TemplateId,
            TemplateName = templateName,
            TargetPhone = dto.TargetPhone,
            PatientId = dto.PatientId,
            PatientName = patientName,
            RelatedEntityType = dto.RelatedEntityType,
            RelatedEntityId = dto.RelatedEntityId,
            PayloadJson = JsonSerializer.Serialize(dto.TemplateParams),
            Status = 0,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        // Real Zalo OA call — or the labelled mock (QA-R11)
        var result = await DispatchAsync(dto.TargetPhone, dto.TemplateId, entity.PayloadJson);
        if (result.ErrorCode == "MOCK")
        {
            entity.Status = StatusMock;
            entity.MessageId = result.TransactionId;
            entity.ErrorCode = result.ErrorCode;
            entity.ErrorMessage = result.ErrorMessage;
            entity.SentAt = DateTime.UtcNow;
            entity.CostVnd = 0;
            _logger.LogInformation("ZNS MOCK (not sent): phone={Phone} template={Tpl}", dto.TargetPhone, dto.TemplateId);
        }
        else if (result.Acknowledged)
        {
            entity.Status = 2; // Delivered
            entity.MessageId = result.TransactionId;
            entity.SentAt = DateTime.UtcNow;
            entity.DeliveredAt = DateTime.UtcNow;
            entity.CostVnd = _config.GetValue<decimal>("Zalo:CostPerMessageVnd", 350m);
            _logger.LogInformation("ZNS sent: msg={Msg} phone={Phone}", result.TransactionId, dto.TargetPhone);
        }
        else
        {
            entity.Status = 3; // Failed
            entity.ErrorCode = result.ErrorCode;
            entity.ErrorMessage = result.ErrorMessage;
            entity.SentAt = DateTime.UtcNow;
            _logger.LogWarning("ZNS fail: phone={Phone} err={Err}", dto.TargetPhone, result.ErrorCode);
        }

        _db.ZaloNotificationLogs.Add(entity);
        await _db.SaveChangesAsync();

        return new ZaloNotificationLogDto
        {
            Id = entity.Id,
            TemplateId = entity.TemplateId,
            TemplateName = entity.TemplateName,
            TargetPhone = entity.TargetPhone,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            RelatedEntityType = entity.RelatedEntityType,
            RelatedEntityId = entity.RelatedEntityId,
            PayloadJson = entity.PayloadJson,
            MessageId = entity.MessageId,
            Status = entity.Status,
            StatusName = StatusName(entity.Status),
            ErrorCode = entity.ErrorCode,
            ErrorMessage = entity.ErrorMessage,
            SentAt = entity.SentAt,
            DeliveredAt = entity.DeliveredAt,
            CostVnd = entity.CostVnd,
            RetryCount = entity.RetryCount,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<ZaloConfigDto> GetConfigAsync()
    {
        // Đọc từ SystemConfig (AccessToken được decrypt tự động), fallback appsettings.
        // KHÔNG trả AccessToken thật ra UI — chỉ trả "***" nếu đã có cấu hình.
        var rawToken = await _configStore.GetOrFallbackAsync("NangCap23.Zalo.AccessToken", _config["Zalo:AccessToken"]);
        return new ZaloConfigDto
        {
            AccessToken = string.IsNullOrEmpty(rawToken) ? "" : "***", // mask, không leak token ra FE
            OaId = await _configStore.GetOrFallbackAsync("NangCap23.Zalo.OaId", _config["Zalo:OaId"]) ?? "",
            BaseUrl = await _configStore.GetOrFallbackAsync("NangCap23.Zalo.BaseUrl", "https://business.openapi.zalo.me") ?? "https://business.openapi.zalo.me",
            MockMode = await _configStore.GetBoolAsync("NangCap23.Zalo.MockMode", _config.GetValue<bool>("Zalo:MockMode", false)),
            IsEnabled = await _configStore.GetBoolAsync("NangCap23.Zalo.IsEnabled", _config.GetValue<bool>("Zalo:IsEnabled", false))
        };
    }

    public async Task<bool> SaveConfigAsync(ZaloConfigDto config, string? userId)
    {
        Nangcap23ConfigValidator.ValidateZalo(config);
        var pairs = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["NangCap23.Zalo.OaId"] = config.OaId,
            ["NangCap23.Zalo.BaseUrl"] = config.BaseUrl,
            ["NangCap23.Zalo.MockMode"] = config.MockMode.ToString(),
            ["NangCap23.Zalo.IsEnabled"] = config.IsEnabled.ToString(),
        };
        // Med-New-1: 3 trạng thái cho AccessToken
        //   null  → bỏ qua, không touch DB row (UI không sửa field)
        //   "***" → bỏ qua (UI gửi lại mask)
        //   ""    → CLEAR token (vô hiệu hóa Zalo OA) — phải save explicit empty
        //   khác  → cập nhật token mới
        if (config.AccessToken == null || config.AccessToken == "***")
        {
            // no-op
        }
        else if (config.AccessToken.Length == 0)
        {
            // Explicit clear — save empty string vào DB (ConfigStore không encrypt vì empty)
            pairs["NangCap23.Zalo.AccessToken"] = string.Empty;
            _logger.LogWarning("Zalo AccessToken cleared by {User} — OA disabled until reconfigured",
                userId ?? "?");
        }
        else
        {
            pairs["NangCap23.Zalo.AccessToken"] = config.AccessToken;
        }
        var n = await _configStore.SaveAsync(pairs, userId);
        _logger.LogInformation("Zalo config saved by {User}, {Count} keys upserted", userId ?? "?", n);
        return true;
    }

    public async Task<bool> TestConnectionAsync()
    {
        // QA-R11: the in-memory mock always answered "Kết nối OK". A mock channel is not a connection.
        var (mock, _) = await GetModeAsync();
        if (mock) return false;
        return await _client.PingAsync();
    }

    public async Task<ZaloNotificationLogDto?> RetryAsync(Guid id, string? userId)
    {
        var entity = await _db.ZaloNotificationLogs.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        var maxRetries = _config.GetValue<int>("Zalo:RetryCount", 3);
        if (entity.Status == 2)
            throw new InvalidOperationException("Tin nhắn đã giao thành công — không cần retry.");
        if (entity.RetryCount >= maxRetries)
            throw new InvalidOperationException($"Đã retry {entity.RetryCount} lần — vượt quá giới hạn {maxRetries}.");

        var result = await DispatchAsync(entity.TargetPhone, entity.TemplateId, entity.PayloadJson);
        if (result.ErrorCode == "MOCK")
            throw new InvalidOperationException("Kênh Zalo đang ở chế độ giả lập — tắt MockMode rồi gửi lại.");
        entity.RetryCount++;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        if (result.Acknowledged)
        {
            entity.Status = 2;
            entity.MessageId = result.TransactionId;
            entity.DeliveredAt = DateTime.UtcNow;
            entity.ErrorCode = null;
            entity.ErrorMessage = null;
            entity.CostVnd = _config.GetValue<decimal>("Zalo:CostPerMessageVnd", 350m);
        }
        else
        {
            entity.Status = 3; // a mock-labelled row resent for real and failing is now a real failure
            entity.ErrorCode = result.ErrorCode;
            entity.ErrorMessage = result.ErrorMessage;
        }
        await _db.SaveChangesAsync();
        return await GetLogAsync(id);
    }
}

