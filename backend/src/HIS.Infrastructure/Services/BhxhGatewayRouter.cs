using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Chooses the mock or the live BHXH client per call from the settings resolved at runtime.
/// The choice used to be frozen at startup by DI, which meant credentials saved in the
/// "Cấu hình BHXH" admin screen could not take effect without a redeploy.
/// </summary>
public class BhxhGatewayRouter : IBhxhGatewayClient
{
    private readonly IBhxhGatewaySettingsProvider _settings;
    private readonly BhxhGatewayClient _live;
    private readonly BhxhGatewayMockClient _mock;

    public BhxhGatewayRouter(
        IBhxhGatewaySettingsProvider settings,
        BhxhGatewayClient live,
        BhxhGatewayMockClient mock)
    {
        _settings = settings;
        _live = live;
        _mock = mock;
    }

    private async Task<IBhxhGatewayClient> ResolveAsync(CancellationToken ct)
    {
        var settings = await _settings.GetAsync(ct);
        return settings.UseMock ? _mock : _live;
    }

    public async Task<BhxhTokenResponse> GetTokenAsync(CancellationToken ct = default) =>
        await (await ResolveAsync(ct)).GetTokenAsync(ct);

    public async Task<BhxhCardVerifyResponse> VerifyCardAsync(BhxhCardVerifyRequest request, CancellationToken ct = default) =>
        await (await ResolveAsync(ct)).VerifyCardAsync(request, ct);

    public async Task<BhxhTreatmentHistoryResponse> GetTreatmentHistoryAsync(BhxhTreatmentHistoryRequest request, CancellationToken ct = default) =>
        await (await ResolveAsync(ct)).GetTreatmentHistoryAsync(request, ct);

    public async Task<BhxhSubmitResponse> SubmitCostDataAsync(BhxhSubmitRequest request, CancellationToken ct = default) =>
        await (await ResolveAsync(ct)).SubmitCostDataAsync(request, ct);

    public async Task<BhxhAssessmentResponse> GetAssessmentResultAsync(string transactionId, CancellationToken ct = default) =>
        await (await ResolveAsync(ct)).GetAssessmentResultAsync(transactionId, ct);

    public async Task<bool> TestConnectionAsync(CancellationToken ct = default) =>
        await (await ResolveAsync(ct)).TestConnectionAsync(ct);

    public async Task<BhxhCheckInResponse> CheckInPatientAsync(BhxhCheckInRequest request, CancellationToken ct = default) =>
        await (await ResolveAsync(ct)).CheckInPatientAsync(request, ct);
}
