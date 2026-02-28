using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public interface ISmsService
{
    Task<bool> SendSmsAsync(string phoneNumber, string message, string messageType = "General", string? patientName = null, string? relatedEntityType = null, Guid? relatedEntityId = null);
    Task<bool> SendOtpSmsAsync(string phoneNumber, string otpCode, int validityMinutes);
    Task<bool> SendResultNotificationSmsAsync(string phoneNumber, string patientName, string resultType, string testName, Guid? resultId = null);
    Task<bool> SendBookingConfirmationSmsAsync(string phoneNumber, string patientName, string appointmentCode, DateTime date, TimeSpan? time, string? departmentName);
    Task<bool> SendBookingReminderSmsAsync(string phoneNumber, string patientName, string appointmentCode, DateTime date, TimeSpan? time);
    Task<bool> SendCriticalValueSmsAsync(string phoneNumber, string patientName, string testName);
    Task<SmsBalanceDto> GetBalanceAsync();
    Task<bool> TestConnectionAsync();
    Task<SmsLogPagedResult> GetSmsLogsAsync(SmsLogSearchDto search);
    Task<SmsStatsDto> GetSmsStatsAsync(DateTime? fromDate, DateTime? toDate);
}

public class SmsBalanceDto
{
    public decimal Balance { get; set; }
    public string? Currency { get; set; }
    public string? Provider { get; set; }
    public bool IsEnabled { get; set; }
}

public class SmsLogDto
{
    public Guid Id { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string MessageType { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public int Status { get; set; } // 0=Sent, 1=Failed, 2=DevMode
    public string? ErrorMessage { get; set; }
    public string? PatientName { get; set; }
    public string? RelatedEntityType { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SmsLogSearchDto
{
    public string? MessageType { get; set; }
    public int? Status { get; set; }
    public string? Keyword { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class SmsLogPagedResult
{
    public List<SmsLogDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class SmsStatsDto
{
    public int TotalSent { get; set; }
    public int TotalFailed { get; set; }
    public int TotalDevMode { get; set; }
    public decimal SuccessRate { get; set; }
    public List<SmsStatsByType> ByType { get; set; } = new();
    public List<SmsStatsByDay> ByDay { get; set; } = new();
}

public class SmsStatsByType
{
    public string MessageType { get; set; } = string.Empty;
    public int Sent { get; set; }
    public int Failed { get; set; }
    public int DevMode { get; set; }
    public int Total { get; set; }
}

public class SmsStatsByDay
{
    public string Date { get; set; } = string.Empty;
    public int Sent { get; set; }
    public int Failed { get; set; }
    public int Total { get; set; }
}

public class SmsService : ISmsService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmsService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IServiceProvider _serviceProvider;

    public SmsService(IConfiguration configuration, ILogger<SmsService> logger, IHttpClientFactory httpClientFactory, IServiceProvider serviceProvider)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _serviceProvider = serviceProvider;
    }

    private string Provider => _configuration["Sms:Provider"] ?? "esms";
    private string ApiKey => _configuration["Sms:ApiKey"] ?? "";
    private string ApiSecret => _configuration["Sms:ApiSecret"] ?? "";
    private string BrandName => _configuration["Sms:BrandName"] ?? "HIS";
    private bool IsEnabled => bool.Parse(_configuration["Sms:Enabled"] ?? "false");

    public async Task<bool> SendSmsAsync(string phoneNumber, string message, string messageType = "General", string? patientName = null, string? relatedEntityType = null, Guid? relatedEntityId = null)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber)) return false;

        var normalizedPhone = NormalizePhone(phoneNumber);

        if (!IsEnabled || string.IsNullOrEmpty(ApiKey))
        {
            _logger.LogWarning("[SMS-DEV] To: {Phone} | Type: {Type} | Message: {Message}", normalizedPhone, messageType, message);
            await LogSmsAsync(normalizedPhone, message, messageType, "dev", 2, null, null, patientName, relatedEntityType, relatedEntityId);
            return true;
        }

        try
        {
            var provider = Provider.ToLower();
            string? providerResponse = null;
            bool success;

            if (provider == "speedsms")
            {
                (success, providerResponse) = await SendViaSpeedSmsAsync(normalizedPhone, message);
            }
            else
            {
                (success, providerResponse) = await SendViaEsmsAsync(normalizedPhone, message);
                provider = "esms";
            }

            await LogSmsAsync(normalizedPhone, message, messageType, provider, success ? 0 : 1, success ? null : "Provider returned failure", providerResponse, patientName, relatedEntityType, relatedEntityId);
            return success;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send SMS to {Phone}", normalizedPhone);
            await LogSmsAsync(normalizedPhone, message, messageType, Provider.ToLower(), 1, ex.Message, null, patientName, relatedEntityType, relatedEntityId);
            return false;
        }
    }

    public async Task<bool> SendOtpSmsAsync(string phoneNumber, string otpCode, int validityMinutes)
    {
        var msg = $"Ma xac thuc HIS cua ban la: {otpCode}. Hieu luc {validityMinutes} phut. Khong chia se ma nay.";
        return await SendSmsAsync(phoneNumber, msg, "OTP");
    }

    public async Task<bool> SendResultNotificationSmsAsync(string phoneNumber, string patientName, string resultType, string testName, Guid? resultId = null)
    {
        var msg = $"Kinh gui {patientName}, ket qua {resultType} ({testName}) cua ban da san sang. Vui long lien he benh vien de nhan ket qua. HIS";
        return await SendSmsAsync(phoneNumber, msg, "Result", patientName, resultType == "xet nghiem" ? "LabResult" : "RadiologyResult", resultId);
    }

    public async Task<bool> SendBookingConfirmationSmsAsync(string phoneNumber, string patientName, string appointmentCode, DateTime date, TimeSpan? time, string? departmentName)
    {
        var timeStr = time.HasValue ? $" luc {time.Value:hh\\:mm}" : "";
        var deptStr = departmentName != null ? $", khoa {departmentName}" : "";
        var msg = $"Dat lich thanh cong! Ma hen: {appointmentCode}. Ngay {date:dd/MM/yyyy}{timeStr}{deptStr}. Den truoc 15 phut. HIS";
        return await SendSmsAsync(phoneNumber, msg, "Booking", patientName, "Appointment");
    }

    public async Task<bool> SendBookingReminderSmsAsync(string phoneNumber, string patientName, string appointmentCode, DateTime date, TimeSpan? time)
    {
        var timeStr = time.HasValue ? $" luc {time.Value:hh\\:mm}" : "";
        var msg = $"Nhac lich: Ban co hen kham ngay {date:dd/MM/yyyy}{timeStr}. Ma hen: {appointmentCode}. Mang theo CCCD va the BHYT. HIS";
        return await SendSmsAsync(phoneNumber, msg, "Reminder", patientName, "Appointment");
    }

    public async Task<bool> SendCriticalValueSmsAsync(string phoneNumber, string patientName, string testName)
    {
        var msg = $"[KHAN] Ket qua {testName} cua {patientName} co gia tri bat thuong. Vui long lien he bac si dieu tri ngay. HIS";
        return await SendSmsAsync(phoneNumber, msg, "Critical", patientName, "LabResult");
    }

    public async Task<SmsBalanceDto> GetBalanceAsync()
    {
        if (!IsEnabled || string.IsNullOrEmpty(ApiKey))
            return new SmsBalanceDto { Balance = -1, Provider = Provider, Currency = "VND", IsEnabled = false };

        try
        {
            if (Provider.ToLower() == "esms")
            {
                var client = _httpClientFactory.CreateClient();
                var url = $"http://rest.esms.vn/MainService.svc/json/GetBalance/{ApiKey}/{ApiSecret}";
                var response = await client.GetAsync(url);
                var json = await response.Content.ReadAsStringAsync();
                var doc = JsonDocument.Parse(json);
                var balance = doc.RootElement.GetProperty("Balance").GetDecimal();
                return new SmsBalanceDto { Balance = balance, Provider = "eSMS.vn", Currency = "VND", IsEnabled = true };
            }
            else
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic",
                    Convert.ToBase64String(Encoding.UTF8.GetBytes($"{ApiKey}:x")));
                var response = await client.GetAsync("https://api.speedsms.vn/index.php/user/info");
                var json = await response.Content.ReadAsStringAsync();
                var doc = JsonDocument.Parse(json);
                var balance = doc.RootElement.GetProperty("data").GetProperty("balance").GetDecimal();
                return new SmsBalanceDto { Balance = balance, Provider = "SpeedSMS.vn", Currency = "VND", IsEnabled = true };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get SMS balance");
            return new SmsBalanceDto { Balance = -1, Provider = Provider, Currency = "VND", IsEnabled = true };
        }
    }

    public async Task<bool> TestConnectionAsync()
    {
        var balance = await GetBalanceAsync();
        return balance.Balance >= 0;
    }

    public async Task<SmsLogPagedResult> GetSmsLogsAsync(SmsLogSearchDto search)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<HISDbContext>();

        var query = context.SmsLogs.AsNoTracking().Where(l => !l.IsDeleted);

        if (!string.IsNullOrEmpty(search.MessageType))
            query = query.Where(l => l.MessageType == search.MessageType);
        if (search.Status.HasValue)
            query = query.Where(l => l.Status == search.Status.Value);
        if (search.FromDate.HasValue)
            query = query.Where(l => l.CreatedAt >= search.FromDate.Value);
        if (search.ToDate.HasValue)
            query = query.Where(l => l.CreatedAt <= search.ToDate.Value.AddDays(1));
        if (!string.IsNullOrEmpty(search.Keyword))
            query = query.Where(l => l.PhoneNumber.Contains(search.Keyword) || l.PatientName != null && l.PatientName.Contains(search.Keyword));

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip(search.PageIndex * search.PageSize)
            .Take(search.PageSize)
            .Select(l => new SmsLogDto
            {
                Id = l.Id,
                PhoneNumber = l.PhoneNumber,
                Message = l.Message,
                MessageType = l.MessageType,
                Provider = l.Provider,
                Status = l.Status,
                ErrorMessage = l.ErrorMessage,
                PatientName = l.PatientName,
                RelatedEntityType = l.RelatedEntityType,
                CreatedAt = l.CreatedAt,
            })
            .ToListAsync();

        return new SmsLogPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = search.PageIndex,
            PageSize = search.PageSize,
        };
    }

    public async Task<SmsStatsDto> GetSmsStatsAsync(DateTime? fromDate, DateTime? toDate)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<HISDbContext>();

        var from = fromDate ?? DateTime.Today.AddDays(-30);
        var to = toDate ?? DateTime.Today.AddDays(1);

        var logs = await context.SmsLogs.AsNoTracking()
            .Where(l => !l.IsDeleted && l.CreatedAt >= from && l.CreatedAt <= to)
            .ToListAsync();

        var totalSent = logs.Count(l => l.Status == 0);
        var totalFailed = logs.Count(l => l.Status == 1);
        var totalDevMode = logs.Count(l => l.Status == 2);
        var total = logs.Count;

        var byType = logs.GroupBy(l => l.MessageType).Select(g => new SmsStatsByType
        {
            MessageType = g.Key,
            Sent = g.Count(l => l.Status == 0),
            Failed = g.Count(l => l.Status == 1),
            DevMode = g.Count(l => l.Status == 2),
            Total = g.Count(),
        }).OrderByDescending(x => x.Total).ToList();

        var byDay = logs.GroupBy(l => l.CreatedAt.Date).OrderBy(g => g.Key).Select(g => new SmsStatsByDay
        {
            Date = g.Key.ToString("yyyy-MM-dd"),
            Sent = g.Count(l => l.Status == 0),
            Failed = g.Count(l => l.Status == 1),
            Total = g.Count(),
        }).ToList();

        return new SmsStatsDto
        {
            TotalSent = totalSent,
            TotalFailed = totalFailed,
            TotalDevMode = totalDevMode,
            SuccessRate = total > 0 ? Math.Round((decimal)(totalSent + totalDevMode) / total * 100, 1) : 0,
            ByType = byType,
            ByDay = byDay,
        };
    }

    // === Provider implementations ===

    private async Task<(bool success, string? response)> SendViaEsmsAsync(string phone, string message)
    {
        var client = _httpClientFactory.CreateClient();
        var payload = new
        {
            ApiKey,
            Content = message,
            Phone = phone,
            SecretKey = ApiSecret,
            SmsType = 2,
            Brandname = BrandName,
            IsUnicode = 0
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync("http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post", content);
        var result = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("[eSMS] Sent to {Phone}, response: {Response}", phone, result);

        var doc = JsonDocument.Parse(result);
        var code = doc.RootElement.GetProperty("CodeResult").GetString();
        return (code == "100", result);
    }

    private async Task<(bool success, string? response)> SendViaSpeedSmsAsync(string phone, string message)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{ApiKey}:x")));

        var payload = new[] {
            new { to = phone, content = message, sms_type = 2, sender = BrandName }
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync("https://api.speedsms.vn/index.php/sms/send", content);
        var result = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("[SpeedSMS] Sent to {Phone}, response: {Response}", phone, result);

        var doc = JsonDocument.Parse(result);
        var status = doc.RootElement.GetProperty("status").GetString();
        return (status == "success", result);
    }

    // === Helpers ===

    private async Task LogSmsAsync(string phone, string message, string messageType, string provider, int status, string? errorMessage, string? providerResponse, string? patientName, string? relatedEntityType, Guid? relatedEntityId)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<HISDbContext>();
            context.SmsLogs.Add(new SmsLog
            {
                Id = Guid.NewGuid(),
                PhoneNumber = phone,
                Message = message,
                MessageType = messageType,
                Provider = provider,
                Status = status,
                ErrorMessage = errorMessage,
                ProviderResponse = providerResponse,
                PatientName = patientName,
                RelatedEntityType = relatedEntityType,
                RelatedEntityId = relatedEntityId,
                CreatedAt = DateTime.Now,
            });
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log SMS send");
        }
    }

    private static string NormalizePhone(string phone)
    {
        phone = phone.Trim().Replace(" ", "").Replace("-", "").Replace(".", "");
        if (phone.StartsWith("0"))
            phone = "84" + phone.Substring(1);
        if (!phone.StartsWith("+") && !phone.StartsWith("84"))
            phone = "84" + phone;
        return phone;
    }
}
