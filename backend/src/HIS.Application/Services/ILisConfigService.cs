using HIS.Application.DTOs.Laboratory;

namespace HIS.Application.Services;

/// <summary>
/// LIS Configuration Service Interface
/// Quản lý cấu hình máy xét nghiệm, thông số, khoảng tham chiếu, mapping, Labconnect
/// </summary>
public interface ILisConfigService
{
    // Analyzers
    Task<List<LisAnalyzerDto>> GetAnalyzersAsync();
    Task<LisAnalyzerDto> GetAnalyzerByIdAsync(Guid id);
    Task<LisAnalyzerDto> CreateAnalyzerAsync(CreateLisAnalyzerDto dto);
    Task<LisAnalyzerDto> UpdateAnalyzerAsync(Guid id, CreateLisAnalyzerDto dto);
    Task<bool> DeleteAnalyzerAsync(Guid id);
    Task<LisConnectionTestResultDto> TestAnalyzerConnectionAsync(Guid id);

    // Test Parameters
    Task<List<LisTestParameterDto>> GetTestParametersAsync();
    Task<LisTestParameterDto> CreateTestParameterAsync(CreateLisTestParameterDto dto);
    Task<LisTestParameterDto> UpdateTestParameterAsync(Guid id, CreateLisTestParameterDto dto);
    Task<bool> DeleteTestParameterAsync(Guid id);
    Task<int> ImportTestParametersCsvAsync(Stream csvStream);

    // Reference Ranges
    Task<List<LisReferenceRangeDto>> GetReferenceRangesAsync(Guid? testParameterId = null);
    Task<LisReferenceRangeDto> CreateReferenceRangeAsync(CreateLisReferenceRangeDto dto);
    Task<LisReferenceRangeDto> UpdateReferenceRangeAsync(Guid id, CreateLisReferenceRangeDto dto);
    Task<bool> DeleteReferenceRangeAsync(Guid id);

    // Analyzer Mappings
    Task<List<LisAnalyzerMappingDto>> GetAnalyzerMappingsAsync(Guid? analyzerId = null);
    Task<LisAnalyzerMappingDto> CreateAnalyzerMappingAsync(CreateLisAnalyzerMappingDto dto);
    Task<LisAnalyzerMappingDto> UpdateAnalyzerMappingAsync(Guid id, CreateLisAnalyzerMappingDto dto);
    Task<bool> DeleteAnalyzerMappingAsync(Guid id);
    Task<LisAutoMapResultDto> AutoMapAnalyzerAsync(Guid analyzerId);

    // Labconnect
    Task<LisLabconnectStatusDto> GetLabconnectStatusAsync();
    Task<LisLabconnectSyncResultDto> SyncLabconnectAsync(string? direction = null);
    Task<List<LisLabconnectSyncHistoryDto>> GetLabconnectHistoryAsync();
    Task<LisLabconnectRetryResultDto> RetryFailedSyncsAsync();
}
