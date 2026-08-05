using FellowOakDicom;
using FellowOakDicom.Network;
using FellowOakDicom.Network.Client;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace HIS.Tests.Services.Radiology;

public sealed class DicomIntegrationFactAttribute : FactAttribute
{
    public DicomIntegrationFactAttribute()
    {
        if (!string.Equals(Environment.GetEnvironmentVariable("HIS_DICOM_INTEGRATION"), "1",
                StringComparison.Ordinal))
            Skip = "Set HIS_DICOM_INTEGRATION=1 to run against an actual Orthanc/DICOM peer";
    }
}

/// <summary>
/// Explicit integration suite. These tests never silently substitute a mock peer. They are skipped
/// in normal unit-test runs and only pass when an actual Orthanc REST endpoint and DICOM SCP reply.
/// </summary>
public sealed class DicomNetworkingIntegrationTests
{
    [DicomIntegrationFact]
    [Trait("Category", "DICOMIntegration")]
    public async Task Echo_mwl_find_and_synchronous_store_are_acknowledged_by_real_peer()
    {
        var baseUrl = Require("HIS_TEST_PACS_BASE_URL");
        var username = Require("HIS_TEST_PACS_USERNAME");
        var password = Require("HIS_TEST_PACS_PASSWORD");
        var host = Environment.GetEnvironmentVariable("HIS_TEST_DICOM_HOST") ?? "127.0.0.1";
        var port = int.Parse(Environment.GetEnvironmentVariable("HIS_TEST_DICOM_PORT") ?? "4243");
        var calledAet = Environment.GetEnvironmentVariable("HIS_TEST_DICOM_CALLED_AET") ?? "HIS_PACS";
        var callingAet = Environment.GetEnvironmentVariable("HIS_TEST_DICOM_CALLING_AET") ?? "HIS_RIS";

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddHttpClient();
        services.AddFellowOakDicom();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["PACS:BaseUrl"] = baseUrl,
                ["PACS:Username"] = username,
                ["PACS:Password"] = password,
                ["PACS:AETitle"] = calledAet,
            }).Build());
        services.AddTransient<DicomPacsGateway>();
        await using var provider = services.BuildServiceProvider();
        DicomSetupBuilder.UseServiceProvider(provider);
        var gateway = provider.GetRequiredService<DicomPacsGateway>();

        var endpoint = new DicomEndpoint(host, port, calledAet, callingAet, TimeoutSeconds: 10);
        var echo = await gateway.EchoAsync(endpoint);
        Assert.True(echo.Success, echo.ErrorMessage);

        var accession = $"INT-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
        var patientId = $"TEST-{Guid.NewGuid():N}"[..21];
        var worklist = await gateway.CreateWorklistAsync(new DicomWorklistItem(
            patientId,
            "PATIENT^INTEGRATION",
            new DateTime(1990, 1, 1),
            "O",
            accession,
            accession,
            "DICOM integration verification",
            callingAet,
            "CR",
            DateTime.Today.AddHours(12),
            "DOCTOR^TEST"));
        Assert.True(worklist.Success, worklist.ErrorMessage);
        Assert.False(string.IsNullOrWhiteSpace(worklist.WorklistId));

        try
        {
            var factory = provider.GetRequiredService<IDicomClientFactory>();
            var client = factory.Create(host, port, false, callingAet, calledAet);
            var matches = new List<DicomDataset>();
            // Start with the most interoperable MWL query: exact Accession Number plus return keys.
            // Real modalities vary widely in which optional SPS filters they send.
            var find = new DicomCFindRequest(
                DicomUID.ModalityWorklistInformationModelFind, DicomPriority.Medium);
            find.Dataset.AddOrUpdate(DicomTag.AccessionNumber, accession);
            find.Dataset.AddOrUpdate(DicomTag.PatientID, string.Empty);
            find.Dataset.AddOrUpdate(DicomTag.PatientName, string.Empty);
            find.OnResponseReceived = (_, response) =>
            {
                if (response.Status.State == DicomState.Pending && response.Dataset != null)
                    matches.Add(response.Dataset);
            };
            await client.AddRequestAsync(find);
            await client.SendAsync();
            Assert.Contains(matches, dataset =>
                dataset.GetSingleValueOrDefault(DicomTag.PatientID, string.Empty) == patientId);

            using var http = CreateHttpClient(baseUrl, username, password);
            var studies = System.Text.Json.JsonSerializer.Deserialize<List<string>>(
                await http.GetStringAsync("studies")) ?? new();
            Assert.NotEmpty(studies);
            using var studyResponse = await http.GetAsync($"studies/{studies[0]}");
            studyResponse.EnsureSuccessStatusCode();
            using var studyJson = System.Text.Json.JsonDocument.Parse(
                await studyResponse.Content.ReadAsStringAsync());
            var studyUid = studyJson.RootElement.GetProperty("MainDicomTags")
                .GetProperty("StudyInstanceUID").GetString();
            Assert.False(string.IsNullOrWhiteSpace(studyUid));

            var store = await gateway.SendStudyAsync(studyUid!, new DicomEndpoint(
                "host.docker.internal", port, calledAet, callingAet, TimeoutSeconds: 30));
            Assert.True(store.Success, store.ErrorMessage);
            Assert.True(store.InstanceCount > 0);

            await using var db = TestDb.NewInMemory();
            var remote = new RemotePacsServer
            {
                Id = Guid.NewGuid(),
                Name = "Integration destination",
                AeTitle = calledAet,
                Host = "host.docker.internal",
                Port = port,
                CallingAeTitle = callingAet,
                TimeoutSeconds = 30,
                IsActive = true,
            };
            var sourceStudy = new DicomStudy
            {
                Id = Guid.NewGuid(),
                RadiologyExamId = Guid.NewGuid(),
                StudyInstanceUID = studyUid!,
                Modality = "CR",
                Status = 1,
            };
            var rule = new DicomAutoSendRule
            {
                Id = Guid.NewGuid(),
                RuleName = "Integration on-arrival",
                Modality = "CR",
                DestinationServerId = remote.Id,
                EncryptBeforeSend = false,
                TriggerType = "on_arrival",
                Priority = 1,
                IsActive = true,
            };
            db.AddRange(remote, sourceStudy, rule);
            await db.SaveChangesAsync();
            var autoSend = new DicomAutoSendService(
                db, provider.GetRequiredService<IConfiguration>(), gateway,
                NullLogger<DicomAutoSendService>.Instance);
            Assert.Equal(1, await autoSend.TriggerAutoSendCheckAsync());
            Assert.Equal(0, await autoSend.TriggerAutoSendCheckAsync());
            var delivery = Assert.Single(db.DicomTransmissionLogs);
            Assert.Equal("done", delivery.Status);
            Assert.True(delivery.InstanceCount > 0);
            Assert.False(string.IsNullOrWhiteSpace(delivery.DeduplicationKey));
        }
        finally
        {
            using var http = CreateHttpClient(baseUrl, username, password);
            await http.DeleteAsync($"worklists/{worklist.WorklistId}");
        }
    }

    private static HttpClient CreateHttpClient(string baseUrl, string username, string password)
    {
        var client = new HttpClient { BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/") };
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{username}:{password}")));
        return client;
    }

    private static string Require(string name) =>
        Environment.GetEnvironmentVariable(name) is { Length: > 0 } value
            ? value
            : throw new InvalidOperationException($"Required integration setting {name} is missing");
}
