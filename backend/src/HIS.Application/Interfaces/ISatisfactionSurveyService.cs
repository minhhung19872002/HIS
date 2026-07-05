using HIS.Application.Common;
using HIS.Application.DTOs.SatisfactionSurvey;

namespace HIS.Application.Interfaces;

/// <summary>
/// Khảo sát hài lòng (Satisfaction Survey) — logic tách khỏi SatisfactionSurveyController
/// (#202 thin-controller). Behavior-preserving: giữ nguyên query/projection/response shape +
/// message. Các action tạo mới đọc claim NameIdentifier dạng string (KHÔNG parse Guid) → truyền
/// nguyên string? userId để giữ đúng hành vi (null vẫn là null). Return map về ServiceOutcome,
/// riêng Export trả byte[] (File download không biểu diễn được bằng ServiceOutcome).
/// </summary>
public interface ISatisfactionSurveyService
{
    Task<ServiceOutcome> GetStatsAsync();
    Task<ServiceOutcome> GetTemplatesAsync();
    Task<ServiceOutcome> CreateTemplateAsync(SurveyTemplateDto dto);
    Task<ServiceOutcome> UpdateTemplateAsync(Guid id, SurveyTemplateDto dto);
    Task<ServiceOutcome> DeleteTemplateAsync(Guid id);
    Task<ServiceOutcome> GetResultsAsync();
    Task<ServiceOutcome> GetAnalysisAsync();
    Task<ServiceOutcome> GetConfigAsync();
    Task<ServiceOutcome> UpdateConfigAsync(object config);
    Task<ServiceOutcome> GetCampaignsAsync(int? status);
    Task<ServiceOutcome> CreateCampaignAsync(CreateSurveyCampaignDto dto, string? userId);
    Task<ServiceOutcome> GetCallbacksAsync(int? status);
    Task<ServiceOutcome> ContactCallbackAsync(ContactCallbackDto dto, string? userId);
    Task<ServiceOutcome> AcknowledgeFeedbackAsync(Guid id, AcknowledgeDto dto, string? userId);
    Task<byte[]> ExportSurveysAsync(DateTime? from, DateTime? to, Guid? campaignId);
}
