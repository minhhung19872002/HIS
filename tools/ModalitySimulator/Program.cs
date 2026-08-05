// Modality simulator: stands in for a real CR/DX/CT console during RIS/PACS acceptance testing.
//
// It is NOT a mock. Every command opens a real DICOM association with fo-dicom and speaks the
// same SOP classes a vendor console does, so a failure here is a failure the hospital would see:
//   echo      C-ECHO to the archive
//   worklist  Modality Worklist C-FIND (the query a technologist's console fires at shift start)
//   acquire   the full clinical loop: MWL C-FIND -> MPPS N-CREATE "IN PROGRESS" -> C-STORE the
//             images -> MPPS N-SET "COMPLETED", carrying the scheduled StudyInstanceUID and
//             AccessionNumber through, which is what links the images back to the HIS order.
//
// The AE title passed as --calling-aet must be registered as a modality in RIS, otherwise the
// MPPS SCP rejects the association (IsKnownMppsAeAsync) — that rejection is correct behaviour and
// the simulator reports it rather than hiding it.

using FellowOakDicom;
using FellowOakDicom.IO.Buffer;
using FellowOakDicom.Imaging;
using FellowOakDicom.Network;
using FellowOakDicom.Network.Client;

namespace HIS.Tools.ModalitySimulator;

internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        if (args.Length == 0 || args[0] is "-h" or "--help" or "help")
        {
            PrintUsage();
            return args.Length == 0 ? 2 : 0;
        }

        var command = args[0].ToLowerInvariant();
        var opt = ParseOptions(args.Skip(1));

        var pacsHost    = opt.GetValueOrDefault("pacs-host", "127.0.0.1");
        var pacsPort    = int.Parse(opt.GetValueOrDefault("pacs-port", "4243"));
        var pacsAet     = opt.GetValueOrDefault("pacs-aet", "HIS_PACS");
        var callingAet  = opt.GetValueOrDefault("calling-aet", "SIM_CR01");
        var mppsHost    = opt.GetValueOrDefault("mpps-host", "127.0.0.1");
        var mppsPort    = int.Parse(opt.GetValueOrDefault("mpps-port", "11114"));
        var mppsAet     = opt.GetValueOrDefault("mpps-aet", "HIS_MPPS");

        try
        {
            return command switch
            {
                "echo"     => await EchoAsync(pacsHost, pacsPort, pacsAet, callingAet),
                "worklist" => await WorklistAsync(pacsHost, pacsPort, pacsAet, callingAet, opt),
                "acquire"  => await AcquireAsync(pacsHost, pacsPort, pacsAet, callingAet,
                                                 mppsHost, mppsPort, mppsAet, opt),
                _          => Fail($"unknown command '{command}'"),
            };
        }
        catch (Exception ex)
        {
            return Fail(ex.GetBaseException().Message);
        }
    }

    // ---------------------------------------------------------------------------------- commands

    private static async Task<int> EchoAsync(string host, int port, string calledAet, string callingAet)
    {
        var client = DicomClientFactory.Create(host, port, false, callingAet, calledAet);
        DicomStatus? status = null;
        var request = new DicomCEchoRequest();
        request.OnResponseReceived = (_, rsp) => status = rsp.Status;
        await client.AddRequestAsync(request);
        await client.SendAsync();

        if (status == DicomStatus.Success)
        {
            Console.WriteLine($"C-ECHO to {calledAet}@{host}:{port} succeeded (calling AE {callingAet})");
            return 0;
        }
        return Fail($"C-ECHO returned {status?.ToString() ?? "no response"}");
    }

    private static async Task<int> WorklistAsync(
        string host, int port, string calledAet, string callingAet, Dictionary<string, string> opt)
    {
        var items = await QueryWorklistAsync(host, port, calledAet, callingAet,
            opt.GetValueOrDefault("modality"), opt.GetValueOrDefault("accession"));

        if (items.Count == 0)
        {
            Console.WriteLine("Worklist C-FIND returned no scheduled procedure step");
            return 1;
        }

        Console.WriteLine($"Worklist C-FIND returned {items.Count} scheduled procedure step(s):");
        foreach (var ds in items) Console.WriteLine("  " + Describe(ds));
        return 0;
    }

    private static async Task<int> AcquireAsync(
        string pacsHost, int pacsPort, string pacsAet, string callingAet,
        string mppsHost, int mppsPort, string mppsAet, Dictionary<string, string> opt)
    {
        var imageCount = int.Parse(opt.GetValueOrDefault("images", "3"));
        if (imageCount is < 1 or > 200) return Fail("--images must be between 1 and 200");
        var skipMpps = opt.ContainsKey("no-mpps");

        // 1. Ask the RIS what this room is supposed to do next.
        var items = await QueryWorklistAsync(pacsHost, pacsPort, pacsAet, callingAet,
            opt.GetValueOrDefault("modality"), opt.GetValueOrDefault("accession"));
        if (items.Count == 0)
            return Fail("no scheduled procedure step matched — nothing to acquire");

        var step = items[0];
        Console.WriteLine("Acquiring: " + Describe(step));

        var patientId   = step.GetSingleValueOrDefault(DicomTag.PatientID, string.Empty);
        var patientName = step.GetSingleValueOrDefault(DicomTag.PatientName, string.Empty);
        var accession   = step.GetSingleValueOrDefault(DicomTag.AccessionNumber, string.Empty);
        var studyUid    = step.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty);
        var sps         = FirstItem(step, DicomTag.ScheduledProcedureStepSequence);
        var modality    = sps?.GetSingleValueOrDefault(DicomTag.Modality, string.Empty) ?? string.Empty;
        var spsId       = sps?.GetSingleValueOrDefault(DicomTag.ScheduledProcedureStepID, string.Empty) ?? string.Empty;
        var spsDesc     = sps?.GetSingleValueOrDefault(DicomTag.ScheduledProcedureStepDescription, string.Empty) ?? string.Empty;

        if (string.IsNullOrWhiteSpace(studyUid))
            return Fail("the worklist item has no StudyInstanceUID — images could not be linked to the order");
        if (string.IsNullOrWhiteSpace(accession))
            return Fail("the worklist item has no AccessionNumber — MPPS could not be matched to the exam");
        if (string.IsNullOrWhiteSpace(modality)) modality = opt.GetValueOrDefault("modality", "OT");

        var seriesUid   = DicomUIDGenerator.GenerateDerivedFromUUID().UID;
        var mppsUid     = DicomUIDGenerator.GenerateDerivedFromUUID().UID;
        var startedAt   = DateTime.Now;

        // 2. Tell the RIS the patient is on the table, before any image exists.
        if (!skipMpps)
        {
            var created = await SendMppsAsync(mppsHost, mppsPort, mppsAet, callingAet, mppsUid,
                BuildMppsCreate(mppsUid, patientId, patientName, accession, studyUid, modality,
                    spsId, spsDesc, callingAet, startedAt),
                isCreate: true);
            if (created != DicomStatus.Success)
                return Fail($"MPPS N-CREATE (IN PROGRESS) returned {created} — the RIS did not accept the step");
            Console.WriteLine($"MPPS N-CREATE IN PROGRESS accepted (SOP Instance {mppsUid})");
        }

        // 3. Acquire and push. Instance UIDs are recorded so N-SET can reference exactly what landed.
        var stored = new List<(DicomUID SopClass, string SopInstance)>();
        var storeClient = DicomClientFactory.Create(pacsHost, pacsPort, false, callingAet, pacsAet);
        var failures = new List<string>();
        for (var i = 1; i <= imageCount; i++)
        {
            var file = BuildImage(patientId, patientName, accession, studyUid, seriesUid, modality, i, imageCount);
            var sopInstance = file.Dataset.GetSingleValue<string>(DicomTag.SOPInstanceUID);
            var request = new DicomCStoreRequest(file);
            request.OnResponseReceived = (req, rsp) =>
            {
                if (rsp.Status == DicomStatus.Success)
                    stored.Add((DicomUID.SecondaryCaptureImageStorage, sopInstance));
                else
                    failures.Add($"instance {sopInstance}: {rsp.Status}");
            };
            await storeClient.AddRequestAsync(request);
        }
        await storeClient.SendAsync();

        if (failures.Count > 0)
            return Fail($"C-STORE rejected {failures.Count}/{imageCount} instance(s): {string.Join("; ", failures)}");
        if (stored.Count != imageCount)
            return Fail($"C-STORE acknowledged {stored.Count}/{imageCount} instance(s)");
        Console.WriteLine($"C-STORE delivered {stored.Count} instance(s) to {pacsAet}, series {seriesUid}");

        // 4. Close the step. Only now may the RIS treat the exam as performed.
        if (!skipMpps)
        {
            var completed = await SendMppsAsync(mppsHost, mppsPort, mppsAet, callingAet, mppsUid,
                BuildMppsComplete(mppsUid, seriesUid, modality, callingAet, pacsAet, stored, DateTime.Now),
                isCreate: false);
            if (completed != DicomStatus.Success)
                return Fail($"MPPS N-SET (COMPLETED) returned {completed} — the exam stays IN PROGRESS in the RIS");
            Console.WriteLine("MPPS N-SET COMPLETED accepted");
        }

        Console.WriteLine();
        Console.WriteLine("ACQUIRED");
        Console.WriteLine($"  AccessionNumber   {accession}");
        Console.WriteLine($"  StudyInstanceUID  {studyUid}");
        Console.WriteLine($"  SeriesInstanceUID {seriesUid}");
        Console.WriteLine($"  MppsSopInstance   {(skipMpps ? "(skipped)" : mppsUid)}");
        Console.WriteLine($"  Instances         {stored.Count}");
        return 0;
    }

    // ------------------------------------------------------------------------------------ DICOM

    private static async Task<List<DicomDataset>> QueryWorklistAsync(
        string host, int port, string calledAet, string callingAet, string? modality, string? accession)
    {
        var request = DicomCFindRequest.CreateWorklistQuery(modality: modality);
        if (!string.IsNullOrWhiteSpace(accession))
            request.Dataset.AddOrUpdate(DicomTag.AccessionNumber, accession);

        var results = new List<DicomDataset>();
        request.OnResponseReceived = (_, rsp) =>
        {
            if (rsp.HasDataset && rsp.Dataset != null) results.Add(rsp.Dataset);
        };

        var client = DicomClientFactory.Create(host, port, false, callingAet, calledAet);
        await client.AddRequestAsync(request);
        await client.SendAsync();
        return results;
    }

    private static async Task<DicomStatus?> SendMppsAsync(
        string host, int port, string calledAet, string callingAet,
        string mppsUid, DicomDataset dataset, bool isCreate)
    {
        DicomStatus? status = null;
        var client = DicomClientFactory.Create(host, port, false, callingAet, calledAet);
        var mppsSopInstance = DicomUID.Parse(mppsUid);

        if (isCreate)
        {
            var req = new DicomNCreateRequest(DicomUID.ModalityPerformedProcedureStep, mppsSopInstance) { Dataset = dataset };
            req.OnResponseReceived = (_, rsp) => status = rsp.Status;
            await client.AddRequestAsync(req);
        }
        else
        {
            var req = new DicomNSetRequest(DicomUID.ModalityPerformedProcedureStep, mppsSopInstance) { Dataset = dataset };
            req.OnResponseReceived = (_, rsp) => status = rsp.Status;
            await client.AddRequestAsync(req);
        }

        await client.SendAsync();
        return status;
    }

    private static DicomDataset BuildMppsCreate(
        string mppsUid, string patientId, string patientName, string accession, string studyUid,
        string modality, string spsId, string spsDescription, string stationAet, DateTime startedAt)
    {
        // ScheduledStepAttributesSequence is how the RIS finds the exam: MppsProcessor reads
        // AccessionNumber out of it first and only falls back to the top level.
        var scheduled = new DicomDataset
        {
            { DicomTag.StudyInstanceUID, studyUid },
            { DicomTag.AccessionNumber, accession },
            { DicomTag.ScheduledProcedureStepID, spsId },
            { DicomTag.ScheduledProcedureStepDescription, spsDescription },
            { DicomTag.RequestedProcedureID, spsId },
        };
        scheduled.Add(new DicomSequence(DicomTag.ReferencedStudySequence));

        return new DicomDataset
        {
            { DicomTag.SOPClassUID, DicomUID.ModalityPerformedProcedureStep },
            { DicomTag.SOPInstanceUID, mppsUid },
            { DicomTag.PatientID, patientId },
            { DicomTag.PatientName, patientName },
            { DicomTag.Modality, modality },
            { DicomTag.PerformedStationAETitle, stationAet },
            // VR SH caps this at 16 characters, so the year is two digits.
            { DicomTag.PerformedProcedureStepID, "PPS" + startedAt.ToString("yyMMddHHmmss") },
            { DicomTag.PerformedProcedureStepStartDate, startedAt.ToString("yyyyMMdd") },
            { DicomTag.PerformedProcedureStepStartTime, startedAt.ToString("HHmmss") },
            { DicomTag.PerformedProcedureStepStatus, "IN PROGRESS" },
            { DicomTag.PerformedProcedureStepDescription, spsDescription },
            new DicomSequence(DicomTag.ScheduledStepAttributesSequence, scheduled),
            new DicomSequence(DicomTag.PerformedProtocolCodeSequence),
            new DicomSequence(DicomTag.PerformedSeriesSequence),
        };
    }

    private static DicomDataset BuildMppsComplete(
        string mppsUid, string seriesUid, string modality, string stationAet, string retrieveAet,
        List<(DicomUID SopClass, string SopInstance)> stored, DateTime endedAt)
    {
        var referenced = stored
            .Select(s => new DicomDataset
            {
                { DicomTag.ReferencedSOPClassUID, s.SopClass },
                { DicomTag.ReferencedSOPInstanceUID, s.SopInstance },
            })
            .ToArray();

        var series = new DicomDataset
        {
            { DicomTag.SeriesInstanceUID, seriesUid },
            { DicomTag.PerformingPhysicianName, string.Empty },
            { DicomTag.ProtocolName, modality + " SIMULATED" },
            { DicomTag.OperatorsName, stationAet },
            { DicomTag.RetrieveAETitle, retrieveAet },
        };
        series.Add(new DicomSequence(DicomTag.ReferencedImageSequence, referenced));

        return new DicomDataset
        {
            { DicomTag.SOPClassUID, DicomUID.ModalityPerformedProcedureStep },
            { DicomTag.SOPInstanceUID, mppsUid },
            { DicomTag.PerformedProcedureStepEndDate, endedAt.ToString("yyyyMMdd") },
            { DicomTag.PerformedProcedureStepEndTime, endedAt.ToString("HHmmss") },
            { DicomTag.PerformedProcedureStepStatus, "COMPLETED" },
            new DicomSequence(DicomTag.PerformedSeriesSequence, series),
        };
    }

    private static DicomFile BuildImage(
        string patientId, string patientName, string accession, string studyUid, string seriesUid,
        string modality, int index, int total)
    {
        const int size = 256;
        var now = DateTime.Now;
        var ds = new DicomDataset(DicomTransferSyntax.ExplicitVRLittleEndian)
        {
            { DicomTag.SOPClassUID, DicomUID.SecondaryCaptureImageStorage },
            { DicomTag.SOPInstanceUID, DicomUIDGenerator.GenerateDerivedFromUUID() },
            { DicomTag.StudyInstanceUID, studyUid },
            { DicomTag.SeriesInstanceUID, seriesUid },
            { DicomTag.PatientID, patientId },
            { DicomTag.PatientName, patientName },
            { DicomTag.AccessionNumber, accession },
            { DicomTag.Modality, modality },
            { DicomTag.StudyDate, now.ToString("yyyyMMdd") },
            { DicomTag.StudyTime, now.ToString("HHmmss") },
            { DicomTag.SeriesNumber, "1" },
            { DicomTag.InstanceNumber, index.ToString() },
            { DicomTag.SeriesDescription, "SIMULATED ACQUISITION" },
            { DicomTag.ConversionType, "WSD" },
            { DicomTag.SamplesPerPixel, (ushort)1 },
            { DicomTag.PhotometricInterpretation, PhotometricInterpretation.Monochrome2.Value },
            { DicomTag.Rows, (ushort)size },
            { DicomTag.Columns, (ushort)size },
            { DicomTag.BitsAllocated, (ushort)8 },
            { DicomTag.BitsStored, (ushort)8 },
            { DicomTag.HighBit, (ushort)7 },
            { DicomTag.PixelRepresentation, (ushort)0 },
        };

        // A recognisable gradient plus a per-instance band, so a viewer shows a different picture
        // per instance and a silently duplicated instance is visible to the eye.
        var pixels = new byte[size * size];
        var band = (int)((index - 1) / (double)total * size);
        for (var y = 0; y < size; y++)
            for (var x = 0; x < size; x++)
                pixels[y * size + x] = (byte)(y >= band && y < band + 16 ? 255 : (x + y) / 2);

        var pixelData = DicomPixelData.Create(ds, true);
        pixelData.AddFrame(new MemoryByteBuffer(pixels));
        return new DicomFile(ds);
    }

    // ------------------------------------------------------------------------------------ helpers

    private static DicomDataset? FirstItem(DicomDataset ds, DicomTag tag) =>
        ds.TryGetSequence(tag, out var seq) && seq.Items.Count > 0 ? seq.Items[0] : null;

    private static string Describe(DicomDataset ds)
    {
        var sps = FirstItem(ds, DicomTag.ScheduledProcedureStepSequence);
        return string.Join(" | ", new[]
        {
            "acc=" + ds.GetSingleValueOrDefault(DicomTag.AccessionNumber, "-"),
            "pid=" + ds.GetSingleValueOrDefault(DicomTag.PatientID, "-"),
            "name=" + ds.GetSingleValueOrDefault(DicomTag.PatientName, "-"),
            "mod=" + (sps?.GetSingleValueOrDefault(DicomTag.Modality, "-") ?? "-"),
            "sps=" + (sps?.GetSingleValueOrDefault(DicomTag.ScheduledProcedureStepDescription, "-") ?? "-"),
            "study=" + ds.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, "-"),
        });
    }

    private static Dictionary<string, string> ParseOptions(IEnumerable<string> args)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        string? pending = null;
        foreach (var arg in args)
        {
            if (arg.StartsWith("--", StringComparison.Ordinal))
            {
                if (pending != null) result[pending] = "true";
                var body = arg[2..];
                var eq = body.IndexOf('=');
                if (eq > 0) { result[body[..eq]] = body[(eq + 1)..]; pending = null; }
                else pending = body;
            }
            else if (pending != null) { result[pending] = arg; pending = null; }
        }
        if (pending != null) result[pending] = "true";
        return result;
    }

    private static int Fail(string message)
    {
        Console.Error.WriteLine("FAILED: " + message);
        return 1;
    }

    private static void PrintUsage() => Console.WriteLine("""
        ModalitySimulator - drives a real DICOM association against HIS RIS/PACS.

          echo       C-ECHO the archive
          worklist   Modality Worklist C-FIND, prints the scheduled procedure steps
          acquire    MWL C-FIND -> MPPS IN PROGRESS -> C-STORE -> MPPS COMPLETED

        Options (defaults match docker-compose + appsettings):
          --pacs-host 127.0.0.1   --pacs-port 4243    --pacs-aet HIS_PACS
          --mpps-host 127.0.0.1   --mpps-port 11114   --mpps-aet HIS_MPPS
          --calling-aet SIM_CR01  must be registered as a modality in RIS, or MPPS rejects it
          --modality CR           filter the worklist query
          --accession A123        acquire one specific scheduled step
          --images 3              number of instances to send
          --no-mpps               C-STORE only, to isolate storage from the MPPS path

        Examples:
          ModalitySimulator echo --calling-aet SIM_CR01
          ModalitySimulator worklist --modality CR
          ModalitySimulator acquire --accession 2026080500123 --images 5
        """);
}
