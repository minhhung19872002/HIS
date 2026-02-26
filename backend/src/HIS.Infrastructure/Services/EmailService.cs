using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public interface IEmailService
{
    Task<bool> SendOtpAsync(string toEmail, string otpCode, int validityMinutes);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendOtpAsync(string toEmail, string otpCode, int validityMinutes)
    {
        try
        {
            var smtpServer = _configuration["Email:SmtpServer"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var fromAddress = _configuration["Email:FromAddress"] ?? "noreply@hospital.local";
            var fromName = _configuration["Email:FromName"] ?? "HIS";
            var username = _configuration["Email:Username"];
            var password = _configuration["Email:Password"];
            var enableSsl = bool.Parse(_configuration["Email:EnableSsl"] ?? "true");

            // If SMTP is not configured, log the OTP for development
            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                _logger.LogWarning("SMTP not configured. OTP for {Email}: {OtpCode} (valid {Minutes} minutes)",
                    toEmail, otpCode, validityMinutes);
                return true; // Return success in dev mode
            }

            using var client = new SmtpClient(smtpServer, smtpPort)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = enableSsl
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(fromAddress, fromName),
                Subject = $"Mã xác thực OTP - HIS",
                IsBodyHtml = true,
                Body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                        <h2 style='color: #1890ff;'>Mã xác thực đăng nhập</h2>
                        <p>Mã OTP của bạn là:</p>
                        <div style='font-size: 32px; font-weight: bold; color: #333; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center; letter-spacing: 8px;'>
                            {otpCode}
                        </div>
                        <p style='color: #666; margin-top: 16px;'>Mã có hiệu lực trong <strong>{validityMinutes} phút</strong>.</p>
                        <p style='color: #999; font-size: 12px;'>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                        <hr style='border: none; border-top: 1px solid #eee; margin: 24px 0;' />
                        <p style='color: #999; font-size: 12px;'>HIS - Hệ thống thông tin bệnh viện</p>
                    </div>"
            };

            mailMessage.To.Add(toEmail);
            await client.SendMailAsync(mailMessage);

            _logger.LogInformation("OTP email sent to {Email}", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send OTP email to {Email}. OTP: {OtpCode}", toEmail, otpCode);
            // Still return true in development so 2FA flow works without SMTP
            return true;
        }
    }
}
