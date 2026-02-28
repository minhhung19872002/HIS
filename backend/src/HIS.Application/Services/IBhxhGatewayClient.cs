using HIS.Application.DTOs.Insurance;

namespace HIS.Application.Services;

/// <summary>
/// Abstraction for BHXH (Vietnam Social Insurance) gateway API calls.
/// Real implementation connects to gdbhyt.baohiemxahoi.gov.vn.
/// Mock implementation provides realistic Vietnamese test data for development.
/// </summary>
public interface IBhxhGatewayClient
{
    /// <summary>
    /// Authenticate with BHXH portal and obtain access token.
    /// </summary>
    Task<BhxhTokenResponse> GetTokenAsync(CancellationToken ct = default);

    /// <summary>
    /// Real-time insurance card verification.
    /// </summary>
    Task<BhxhCardVerifyResponse> VerifyCardAsync(BhxhCardVerifyRequest request, CancellationToken ct = default);

    /// <summary>
    /// Retrieve patient treatment history from BHXH portal. Requires OTP.
    /// </summary>
    Task<BhxhTreatmentHistoryResponse> GetTreatmentHistoryAsync(BhxhTreatmentHistoryRequest request, CancellationToken ct = default);

    /// <summary>
    /// Submit XML cost data to BHXH gateway for assessment.
    /// </summary>
    Task<BhxhSubmitResponse> SubmitCostDataAsync(BhxhSubmitRequest request, CancellationToken ct = default);

    /// <summary>
    /// Get assessment result for a previously submitted batch.
    /// </summary>
    Task<BhxhAssessmentResponse> GetAssessmentResultAsync(string transactionId, CancellationToken ct = default);

    /// <summary>
    /// Test connectivity to BHXH gateway.
    /// </summary>
    Task<bool> TestConnectionAsync(CancellationToken ct = default);

    /// <summary>
    /// Real-time patient check-in at facility.
    /// </summary>
    Task<BhxhCheckInResponse> CheckInPatientAsync(BhxhCheckInRequest request, CancellationToken ct = default);
}
