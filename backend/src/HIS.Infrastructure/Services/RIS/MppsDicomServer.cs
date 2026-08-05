using System.Text;
using FellowOakDicom;
using FellowOakDicom.Network;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public sealed class MppsDicomServerHostedService : IHostedService, IDisposable
{
    private readonly IDicomServerFactory _serverFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MppsDicomServerHostedService> _logger;
    private IDicomServer? _server;

    public MppsDicomServerHostedService(
        IDicomServerFactory serverFactory,
        IConfiguration configuration,
        ILogger<MppsDicomServerHostedService> logger)
    {
        _serverFactory = serverFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_configuration.GetValue<bool>("PACS:MPPS:Enabled", true))
        {
            _logger.LogInformation("DICOM MPPS SCP is disabled");
            return Task.CompletedTask;
        }

        var port = _configuration.GetValue<int>("PACS:MPPS:Port", 11114);
        _server = _serverFactory.Create<MppsDicomService>(port);
        _logger.LogInformation("DICOM MPPS SCP listening on port {Port} as AE {AeTitle}",
            port, _configuration["PACS:MPPS:AETitle"] ?? "HIS_MPPS");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _server?.Stop();
        _server?.Dispose();
        _server = null;
        return Task.CompletedTask;
    }

    public void Dispose() => _server?.Dispose();
}

public sealed class MppsDicomService : DicomService, IDicomServiceProvider, IDicomNServiceProvider
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MppsDicomService> _logger;
    private string _callingAeTitle = string.Empty;

    public MppsDicomService(
        INetworkStream stream,
        Encoding fallbackEncoding,
        ILogger logger,
        DicomServiceDependencies dependencies,
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<MppsDicomService> typedLogger)
        : base(stream, fallbackEncoding, logger, dependencies)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = typedLogger;
    }

    public async Task OnReceiveAssociationRequestAsync(DicomAssociation association)
    {
        var expectedCalledAe = _configuration["PACS:MPPS:AETitle"] ?? "HIS_MPPS";
        if (!string.Equals(association.CalledAE?.Trim(), expectedCalledAe, StringComparison.OrdinalIgnoreCase))
        {
            await SendAssociationRejectAsync(DicomRejectResult.Permanent, DicomRejectSource.ServiceUser,
                DicomRejectReason.CalledAENotRecognized);
            return;
        }

        _callingAeTitle = association.CallingAE?.Trim() ?? string.Empty;
        using var scope = _scopeFactory.CreateScope();
        var processor = scope.ServiceProvider.GetRequiredService<IMppsProcessor>();
        if (!await processor.IsKnownMppsAeAsync(_callingAeTitle, CancellationToken.None))
        {
            _logger.LogWarning("Rejected MPPS association from unknown AE {CallingAe}", _callingAeTitle);
            await SendAssociationRejectAsync(DicomRejectResult.Permanent, DicomRejectSource.ServiceUser,
                DicomRejectReason.CallingAENotRecognized);
            return;
        }

        foreach (var context in association.PresentationContexts)
        {
            context.SetResult(context.AbstractSyntax == DicomUID.ModalityPerformedProcedureStep
                ? DicomPresentationContextResult.Accept
                : DicomPresentationContextResult.RejectAbstractSyntaxNotSupported);
        }
        await SendAssociationAcceptAsync(association);
    }

    public Task OnReceiveAssociationReleaseRequestAsync() => SendAssociationReleaseResponseAsync();

    public void OnReceiveAbort(DicomAbortSource source, DicomAbortReason reason) =>
        _logger.LogWarning("MPPS association aborted by {Source}: {Reason}", source, reason);

    public void OnConnectionClosed(Exception exception)
    {
        if (exception != null) _logger.LogWarning(exception, "MPPS connection closed with error");
    }

    public async Task<DicomNCreateResponse> OnNCreateRequestAsync(DicomNCreateRequest request)
    {
        using var scope = _scopeFactory.CreateScope();
        var processor = scope.ServiceProvider.GetRequiredService<IMppsProcessor>();
        var result = await processor.ProcessAsync(
            _callingAeTitle, request.SOPInstanceUID?.UID ?? string.Empty,
            request.Dataset, true, CancellationToken.None);
        return new DicomNCreateResponse(request, result.Success ? DicomStatus.Success : DicomStatus.ProcessingFailure);
    }

    public async Task<DicomNSetResponse> OnNSetRequestAsync(DicomNSetRequest request)
    {
        using var scope = _scopeFactory.CreateScope();
        var processor = scope.ServiceProvider.GetRequiredService<IMppsProcessor>();
        var result = await processor.ProcessAsync(
            _callingAeTitle, request.SOPInstanceUID?.UID ?? string.Empty,
            request.Dataset, false, CancellationToken.None);
        return new DicomNSetResponse(request, result.Success ? DicomStatus.Success : DicomStatus.ProcessingFailure);
    }

    public Task<DicomNActionResponse> OnNActionRequestAsync(DicomNActionRequest request) =>
        Task.FromResult(new DicomNActionResponse(request, DicomStatus.UnrecognizedOperation));

    public Task<DicomNDeleteResponse> OnNDeleteRequestAsync(DicomNDeleteRequest request) =>
        Task.FromResult(new DicomNDeleteResponse(request, DicomStatus.UnrecognizedOperation));

    public Task<DicomNEventReportResponse> OnNEventReportRequestAsync(DicomNEventReportRequest request) =>
        Task.FromResult(new DicomNEventReportResponse(request, DicomStatus.UnrecognizedOperation));

    public Task<DicomNGetResponse> OnNGetRequestAsync(DicomNGetRequest request) =>
        Task.FromResult(new DicomNGetResponse(request, DicomStatus.UnrecognizedOperation));
}
