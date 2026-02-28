using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public interface ISmsService
{
    Task<bool> SendSmsAsync(string phoneNumber, string message);
    Task<bool> SendOtpSmsAsync(string phoneNumber, string otpCode, int validityMinutes);
    Task<bool> SendResultNotificationSmsAsync(string phoneNumber, string patientName, string resultType, string testName);
    Task<bool> SendBookingConfirmationSmsAsync(string phoneNumber, string patientName, string appointmentCode, DateTime date, TimeSpan? time, string? departmentName);
    Task<bool> SendBookingReminderSmsAsync(string phoneNumber, string patientName, string appointmentCode, DateTime date, TimeSpan? time);
    Task<bool> SendCriticalValueSmsAsync(string phoneNumber, string patientName, string testName);
    Task<SmsBalanceDto> GetBalanceAsync();
    Task<bool> TestConnectionAsync();
}

public class SmsBalanceDto
{
    public decimal Balance { get; set; }
    public string? Currency { get; set; }
    public string? Provider { get; set; }
}

public class SmsService : ISmsService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmsService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public SmsService(IConfiguration configuration, ILogger<SmsService> logger, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    private string Provider => _configuration["Sms:Provider"] ?? "esms";
    private string ApiKey => _configuration["Sms:ApiKey"] ?? "";
    private string ApiSecret => _configuration["Sms:ApiSecret"] ?? "";
    private string BrandName => _configuration["Sms:BrandName"] ?? "HIS";
    private bool IsEnabled => bool.Parse(_configuration["Sms:Enabled"] ?? "false");

    public async Task<bool> SendSmsAsync(string phoneNumber, string message)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber)) return false;

        // Normalize phone: 0xxx -> 84xxx
        var normalizedPhone = NormalizePhone(phoneNumber);

        if (!IsEnabled || string.IsNullOrEmpty(ApiKey))
        {
            _logger.LogWarning("[SMS-DEV] To: {Phone} | Message: {Message}", normalizedPhone, message);
            return true; // Dev mode: log and succeed
        }

        try
        {
            return Provider.ToLower() switch
            {
                "esms" => await SendViaEsmsAsync(normalizedPhone, message),
                "speedsms" => await SendViaSpeedSmsAsync(normalizedPhone, message),
                _ => await SendViaEsmsAsync(normalizedPhone, message)
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send SMS to {Phone}", normalizedPhone);
            return false;
        }
    }

    public async Task<bool> SendOtpSmsAsync(string phoneNumber, string otpCode, int validityMinutes)
    {
        var msg = $"Ma xac thuc HIS cua ban la: {otpCode}. Hieu luc {validityMinutes} phut. Khong chia se ma nay.";
        return await SendSmsAsync(phoneNumber, msg);
    }

    public async Task<bool> SendResultNotificationSmsAsync(string phoneNumber, string patientName, string resultType, string testName)
    {
        var msg = $"Kinh gui {patientName}, ket qua {resultType} ({testName}) cua ban da san sang. Vui long lien he benh vien de nhan ket qua. HIS";
        return await SendSmsAsync(phoneNumber, msg);
    }

    public async Task<bool> SendBookingConfirmationSmsAsync(string phoneNumber, string patientName, string appointmentCode, DateTime date, TimeSpan? time, string? departmentName)
    {
        var timeStr = time.HasValue ? $" luc {time.Value:hh\\:mm}" : "";
        var deptStr = departmentName != null ? $", khoa {departmentName}" : "";
        var msg = $"Dat lich thanh cong! Ma hen: {appointmentCode}. Ngay {date:dd/MM/yyyy}{timeStr}{deptStr}. Den truoc 15 phut. HIS";
        return await SendSmsAsync(phoneNumber, msg);
    }

    public async Task<bool> SendBookingReminderSmsAsync(string phoneNumber, string patientName, string appointmentCode, DateTime date, TimeSpan? time)
    {
        var timeStr = time.HasValue ? $" luc {time.Value:hh\\:mm}" : "";
        var msg = $"Nhac lich: Ban co hen kham ngay {date:dd/MM/yyyy}{timeStr}. Ma hen: {appointmentCode}. Mang theo CCCD va the BHYT. HIS";
        return await SendSmsAsync(phoneNumber, msg);
    }

    public async Task<bool> SendCriticalValueSmsAsync(string phoneNumber, string patientName, string testName)
    {
        var msg = $"[KHAN] Ket qua {testName} cua {patientName} co gia tri bat thuong. Vui long lien he bac si dieu tri ngay. HIS";
        return await SendSmsAsync(phoneNumber, msg);
    }

    public async Task<SmsBalanceDto> GetBalanceAsync()
    {
        if (!IsEnabled || string.IsNullOrEmpty(ApiKey))
            return new SmsBalanceDto { Balance = -1, Provider = Provider, Currency = "VND" };

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
                return new SmsBalanceDto { Balance = balance, Provider = "eSMS.vn", Currency = "VND" };
            }
            else // speedsms
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic",
                    Convert.ToBase64String(Encoding.UTF8.GetBytes($"{ApiKey}:x")));
                var response = await client.GetAsync("https://api.speedsms.vn/index.php/user/info");
                var json = await response.Content.ReadAsStringAsync();
                var doc = JsonDocument.Parse(json);
                var balance = doc.RootElement.GetProperty("data").GetProperty("balance").GetDecimal();
                return new SmsBalanceDto { Balance = balance, Provider = "SpeedSMS.vn", Currency = "VND" };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get SMS balance");
            return new SmsBalanceDto { Balance = -1, Provider = Provider, Currency = "VND" };
        }
    }

    public async Task<bool> TestConnectionAsync()
    {
        var balance = await GetBalanceAsync();
        return balance.Balance >= 0;
    }

    // === Provider implementations ===

    private async Task<bool> SendViaEsmsAsync(string phone, string message)
    {
        var client = _httpClientFactory.CreateClient();
        var payload = new
        {
            ApiKey,
            Content = message,
            Phone = phone,
            SecretKey = ApiSecret,
            SmsType = 2, // Brandname
            Brandname = BrandName,
            IsUnicode = 0 // ASCII (cheaper, no diacritics)
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync("http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post", content);
        var result = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("[eSMS] Sent to {Phone}, response: {Response}", phone, result);

        var doc = JsonDocument.Parse(result);
        var code = doc.RootElement.GetProperty("CodeResult").GetString();
        return code == "100"; // 100 = success
    }

    private async Task<bool> SendViaSpeedSmsAsync(string phone, string message)
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
        return status == "success";
    }

    // === Helpers ===

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
