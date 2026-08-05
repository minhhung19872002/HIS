using FellowOakDicom;
using FellowOakDicom.Network;
using FellowOakDicom.Network.Client;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HIS.Tests.Services.Radiology;

public sealed class MppsDicomServerTests
{
    [Fact]
    public async Task NCreate_and_NSet_update_exam_through_real_DICOM_association()
    {
        const int port = 11115;
        const string callingAet = "TEST_MODALITY";
        const string calledAet = "HIS_MPPS_TEST";
        const string accession = "MPPS-TEST-001";
        var dbName = $"mpps-{Guid.NewGuid():N}";
        var settings = new Dictionary<string, string?>
        {
            ["PACS:MPPS:Enabled"] = "true",
            ["PACS:MPPS:Port"] = port.ToString(),
            ["PACS:MPPS:AETitle"] = calledAet,
        };
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddFellowOakDicom();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder()
            .AddInMemoryCollection(settings).Build());
        services.AddDbContext<HISDbContext>(options => options.UseInMemoryDatabase(dbName));
        services.AddScoped<IMppsProcessor, MppsProcessor>();
        services.AddSingleton<MppsDicomServerHostedService>();

        await using var provider = services.BuildServiceProvider();
        DicomSetupBuilder.UseServiceProvider(provider);
        Guid examId;
        using (var seedScope = provider.CreateScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<HISDbContext>();
            var modality = new RadiologyModality
            {
                Id = Guid.NewGuid(),
                ModalityCode = "TEST",
                ModalityName = "Test modality",
                ModalityType = 1,
                AETitle = callingAet,
                SupportsMPPS = true,
                IsActive = true,
            };
            var request = new RadiologyRequest
            {
                Id = Guid.NewGuid(),
                RequestCode = "REQ-MPPS-001",
                PatientId = Guid.NewGuid(),
                ServiceId = Guid.NewGuid(),
                RequestingDoctorId = Guid.NewGuid(),
                RequestDate = DateTime.UtcNow,
                Status = 1,
            };
            var exam = new RadiologyExam
            {
                Id = Guid.NewGuid(),
                RadiologyRequestId = request.Id,
                RadiologyRequest = request,
                ModalityId = modality.Id,
                Modality = modality,
                ExamCode = "EX-MPPS-001",
                ExamName = "MPPS integration",
                ExamDate = DateTime.UtcNow,
                AccessionNumber = accession,
                Status = 0,
            };
            examId = exam.Id;
            db.AddRange(modality, request, exam);
            await db.SaveChangesAsync();
        }

        var server = provider.GetRequiredService<MppsDicomServerHostedService>();
        await server.StartAsync(CancellationToken.None);
        try
        {
            var factory = provider.GetRequiredService<IDicomClientFactory>();
            var mppsUid = DicomUID.Generate();
            DicomNCreateResponse? createResponse = null;
            var create = new DicomNCreateRequest(DicomUID.ModalityPerformedProcedureStep, mppsUid)
            {
                Dataset = new DicomDataset
                {
                    { DicomTag.PerformedProcedureStepStatus, "IN PROGRESS" },
                    { DicomTag.PerformedProcedureStepStartDate, DateTime.Today.ToString("yyyyMMdd") },
                    { DicomTag.PerformedProcedureStepStartTime, "120000" },
                    new DicomSequence(DicomTag.ScheduledStepAttributesSequence,
                        new DicomDataset { { DicomTag.AccessionNumber, accession } }),
                },
                OnResponseReceived = (_, response) => createResponse = response,
            };
            var createClient = factory.Create("127.0.0.1", port, false, callingAet, calledAet);
            await createClient.AddRequestAsync(create);
            await createClient.SendAsync();
            Assert.NotNull(createResponse);
            Assert.Equal(DicomState.Success, createResponse!.Status.State);

            DicomNSetResponse? setResponse = null;
            var set = new DicomNSetRequest(DicomUID.ModalityPerformedProcedureStep, mppsUid)
            {
                Dataset = new DicomDataset
                {
                    { DicomTag.PerformedProcedureStepStatus, "COMPLETED" },
                    { DicomTag.PerformedProcedureStepEndDate, DateTime.Today.ToString("yyyyMMdd") },
                    { DicomTag.PerformedProcedureStepEndTime, "123000" },
                },
                OnResponseReceived = (_, response) => setResponse = response,
            };
            var setClient = factory.Create("127.0.0.1", port, false, callingAet, calledAet);
            await setClient.AddRequestAsync(set);
            await setClient.SendAsync();
            Assert.NotNull(setResponse);
            Assert.Equal(DicomState.Success, setResponse!.Status.State);

            using var verifyScope = provider.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<HISDbContext>();
            var persisted = await verifyDb.RadiologyExams
                .Include(e => e.RadiologyRequest)
                .SingleAsync(e => e.Id == examId);
            Assert.Equal("COMPLETED", persisted.MppsStatus);
            Assert.Equal(mppsUid.UID, persisted.MppsInstanceUid);
            Assert.Equal(2, persisted.Status);
            Assert.Equal(3, persisted.RadiologyRequest.Status);
            Assert.NotNull(persisted.StartTime);
            Assert.NotNull(persisted.EndTime);
        }
        finally
        {
            await server.StopAsync(CancellationToken.None);
        }
    }
}
