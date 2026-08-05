using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FellowOakDicom;
using FellowOakDicom.Network;
using FellowOakDicom.Network.Client;
using HIS.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Real DICOM/Orthanc adapter.  C-ECHO is sent on the DICOM wire through fo-dicom;
/// C-STORE and MWL use Orthanc's synchronous jobs/Worklists REST API, which in turn
/// execute the DICOM network operations and return their actual outcome.
/// </summary>
public sealed class DicomPacsGateway : IDicomPacsGateway
{
    private readonly IDicomClientFactory _dicomClientFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DicomPacsGateway> _logger;

    public DicomPacsGateway(
        IDicomClientFactory dicomClientFactory,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<DicomPacsGateway> logger)
    {
        _dicomClientFactory = dicomClientFactory;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<DicomEchoResult> EchoAsync(
        DicomEndpoint endpoint,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            ValidateEndpoint(endpoint);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(endpoint.TimeoutSeconds));

            var client = _dicomClientFactory.Create(
                endpoint.Host,
                endpoint.Port,
                endpoint.UseTls,
                endpoint.CallingAeTitle,
                endpoint.CalledAeTitle);

            DicomCEchoResponse? response = null;
            var request = new DicomCEchoRequest
            {
                OnResponseReceived = (_, received) => response = received,
            };

            await client.AddRequestAsync(request);
            await client.SendAsync(timeout.Token);
            stopwatch.Stop();

            if (response == null)
            {
                return new DicomEchoResult(false, (int)stopwatch.ElapsedMilliseconds, null,
                    "DICOM peer did not return a C-ECHO response");
            }

            var success = response.Status.State == DicomState.Success;
            return new DicomEchoResult(
                success,
                (int)stopwatch.ElapsedMilliseconds,
                response.Status.ToString(),
                success ? null : $"C-ECHO failed with status {response.Status}");
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            stopwatch.Stop();
            return new DicomEchoResult(false, (int)stopwatch.ElapsedMilliseconds, null,
                $"C-ECHO timed out after {endpoint.TimeoutSeconds} seconds");
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogWarning(ex, "DICOM C-ECHO failed for {CalledAet}@{Host}:{Port}",
                endpoint.CalledAeTitle, endpoint.Host, endpoint.Port);
            return new DicomEchoResult(false, (int)stopwatch.ElapsedMilliseconds, null, ex.Message);
        }
    }

    public async Task<DicomStoreResult> SendStudyAsync(
        string studyReference,
        DicomEndpoint destination,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(studyReference))
            return new DicomStoreResult(false, 0, 0, null, "Study reference is required");

        try
        {
            ValidateEndpoint(destination);
            using var client = CreateOrthancClient(TimeSpan.FromSeconds(Math.Max(destination.TimeoutSeconds, 30)));
            var modalityId = $"his-{ComputeStableId(destination)}";

            var modalityBody = JsonSerializer.Serialize(new
            {
                AET = destination.CalledAeTitle,
                Host = destination.Host,
                Port = destination.Port,
                UseDicomTls = destination.UseTls,
            });
            using var modalityResponse = await client.PutAsync(
                $"modalities/{modalityId}",
                new StringContent(modalityBody, Encoding.UTF8, "application/json"),
                cancellationToken);
            if (!modalityResponse.IsSuccessStatusCode)
                return await FailureAsync("Cannot register remote DICOM modality", modalityResponse, cancellationToken);

            var orthancStudyId = await ResolveOrthancStudyIdAsync(client, studyReference, cancellationToken);
            if (orthancStudyId == null)
                return new DicomStoreResult(false, 0, 0, null,
                    $"Study '{studyReference}' was not found in the source PACS");

            var (instanceCount, totalBytes) = await GetStudyStatisticsAsync(client, orthancStudyId, cancellationToken);
            var storeBody = JsonSerializer.Serialize(new
            {
                Resources = new[] { orthancStudyId },
                Synchronous = true,
                LocalAet = destination.CallingAeTitle,
                Timeout = destination.TimeoutSeconds,
                // Cam kết lưu trữ được xin riêng sau khi store xong (xem RequestStorageCommitmentAsync)
                // để lấy được transaction UID và đọc N-EVENT-REPORT thật, thay vì tin vào job status.
            });
            using var storeResponse = await client.PostAsync(
                $"modalities/{modalityId}/store",
                new StringContent(storeBody, Encoding.UTF8, "application/json"),
                cancellationToken);

            if (!storeResponse.IsSuccessStatusCode)
                return await FailureAsync("DICOM C-STORE job failed", storeResponse, cancellationToken,
                    instanceCount, totalBytes);

            var responseBody = await storeResponse.Content.ReadAsStringAsync(cancellationToken);
            string? jobId = null;
            if (!string.IsNullOrWhiteSpace(responseBody))
            {
                try
                {
                    using var responseJson = JsonDocument.Parse(responseBody);
                    if (responseJson.RootElement.TryGetProperty("ID", out var id)) jobId = id.GetString();
                }
                catch (JsonException)
                {
                    // A synchronous Orthanc job may return a plain success body depending on version.
                }
            }

            if (!destination.UseStorageCommitment)
                return new DicomStoreResult(true, instanceCount, totalBytes, jobId, null);

            var commitment = await RequestStorageCommitmentAsync(
                client, modalityId, orthancStudyId, destination.TimeoutSeconds, cancellationToken);

            // Đích yêu cầu cam kết lưu trữ: chỉ coi là thành công khi hệ nhận trả N-EVENT-REPORT
            // xác nhận đã giữ ảnh. Pending/Failure vẫn là chưa giao xong.
            var committed = string.Equals(commitment.Status, "Success", StringComparison.OrdinalIgnoreCase);
            return new DicomStoreResult(
                committed, instanceCount, totalBytes, jobId,
                committed ? null : commitment.Error ?? $"Storage Commitment: {commitment.Status ?? "không có phản hồi"}",
                commitment.Status, commitment.TransactionUid);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DICOM C-STORE failed for study {Study} to {CalledAet}@{Host}:{Port}",
                studyReference, destination.CalledAeTitle, destination.Host, destination.Port);
            return new DicomStoreResult(false, 0, 0, null, ex.Message);
        }
    }

    private sealed record StorageCommitmentOutcome(string? Status, string? TransactionUid, string? Error);

    /// <summary>
    /// Gửi N-ACTION xin cam kết lưu trữ rồi chờ N-EVENT-REPORT của hệ nhận.
    /// Không tự suy ra kết quả: hết thời gian chờ vẫn "Pending" thì báo đúng như vậy.
    /// </summary>
    private async Task<StorageCommitmentOutcome> RequestStorageCommitmentAsync(
        HttpClient client,
        string modalityId,
        string orthancStudyId,
        int timeoutSeconds,
        CancellationToken cancellationToken)
    {
        string? transactionUid = null;
        try
        {
            var body = JsonSerializer.Serialize(new { Resources = new[] { orthancStudyId } });
            using var response = await client.PostAsync(
                $"modalities/{modalityId}/storage-commitment",
                new StringContent(body, Encoding.UTF8, "application/json"),
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var details = await response.Content.ReadAsStringAsync(cancellationToken);
                return new(null, null,
                    $"Storage Commitment request failed: HTTP {(int)response.StatusCode} {details}");
            }

            using (var created = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken)))
                transactionUid = created.RootElement.TryGetProperty("ID", out var id) ? id.GetString() : null;
            if (string.IsNullOrWhiteSpace(transactionUid))
                return new(null, null, "Storage Commitment response did not contain a transaction UID");

            var deadline = DateTime.UtcNow.AddSeconds(Math.Clamp(timeoutSeconds, 5, 600));
            string? status = null;
            var failures = 0;
            while (DateTime.UtcNow < deadline)
            {
                using var poll = await client.GetAsync(
                    $"storage-commitment/{Uri.EscapeDataString(transactionUid)}", cancellationToken);
                if (poll.IsSuccessStatusCode)
                {
                    using var json = JsonDocument.Parse(await poll.Content.ReadAsStringAsync(cancellationToken));
                    var root = json.RootElement;
                    status = root.TryGetProperty("Status", out var s) ? s.GetString() : null;
                    failures = root.TryGetProperty("Failures", out var f) && f.ValueKind == JsonValueKind.Array
                        ? f.GetArrayLength()
                        : 0;
                    if (!string.Equals(status, "Pending", StringComparison.OrdinalIgnoreCase))
                        break;
                }
                await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);
            }

            var error = string.Equals(status, "Success", StringComparison.OrdinalIgnoreCase)
                ? null
                : failures > 0
                    ? $"Hệ nhận từ chối cam kết lưu trữ {failures} ảnh"
                    : null;
            return new(status ?? "Pending", transactionUid, error);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Storage Commitment failed for study {Study}", orthancStudyId);
            return new(null, transactionUid, ex.GetBaseException().Message);
        }
    }

    public async Task<DicomWorklistResult> CreateWorklistAsync(
        DicomWorklistItem item,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var client = CreateOrthancClient(TimeSpan.FromSeconds(30));
            var scheduled = item.ScheduledDateTime;
            var tags = new Dictionary<string, object?>
            {
                ["PatientID"] = item.PatientId,
                ["PatientName"] = ToDicomPersonName(item.PatientName),
                ["PatientBirthDate"] = item.PatientBirthDate?.ToString("yyyyMMdd") ?? string.Empty,
                ["PatientSex"] = item.PatientSex,
                ["AccessionNumber"] = item.AccessionNumber,
                ["RequestedProcedureID"] = item.RequestedProcedureId,
                ["RequestedProcedureDescription"] = item.RequestedProcedureDescription,
                ["ReferringPhysicianName"] = ToDicomPersonName(item.ReferringPhysicianName),
                ["StudyInstanceUID"] = item.StudyInstanceUid,
                ["ScheduledProcedureStepSequence"] = new[]
                {
                    new Dictionary<string, object?>
                    {
                        ["ScheduledStationAETitle"] = item.ScheduledStationAeTitle,
                        ["ScheduledProcedureStepStartDate"] = scheduled.ToString("yyyyMMdd"),
                        ["ScheduledProcedureStepStartTime"] = scheduled.ToString("HHmmss"),
                        ["Modality"] = item.ScheduledModality,
                        ["ScheduledProcedureStepID"] = item.RequestedProcedureId,
                        ["ScheduledProcedureStepDescription"] = item.RequestedProcedureDescription,
                    },
                },
            };
            if (string.IsNullOrWhiteSpace(item.StudyInstanceUid)) tags.Remove("StudyInstanceUID");

            var body = JsonSerializer.Serialize(new { Tags = tags });
            using var response = await client.PostAsync(
                "worklists/create",
                new StringContent(body, Encoding.UTF8, "application/json"),
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(cancellationToken);
                return new DicomWorklistResult(false, null,
                    $"Orthanc MWL create failed: HTTP {(int)response.StatusCode} {error}");
            }

            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var id = json.RootElement.TryGetProperty("ID", out var idProperty)
                ? idProperty.GetString()
                : null;
            if (string.IsNullOrWhiteSpace(id))
                return new DicomWorklistResult(false, null, "Orthanc MWL response did not contain an ID");

            return new DicomWorklistResult(true, id, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create MWL item for accession {Accession}", item.AccessionNumber);
            return new DicomWorklistResult(false, null, ex.Message);
        }
    }

    public async Task<DicomImportResult> ImportInstanceAsync(
        byte[] dicomBytes,
        CancellationToken cancellationToken = default)
    {
        if (dicomBytes.Length == 0)
            return new(false, null, null, null, null, null, null, "DICOM payload is empty");

        try
        {
            await using var stream = new MemoryStream(dicomBytes, writable: false);
            var dicomFile = await DicomFile.OpenAsync(stream);
            var dataset = dicomFile.Dataset;
            var patientId = dataset.GetSingleValueOrDefault(DicomTag.PatientID, string.Empty).Trim();
            var studyUid = dataset.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty).Trim();
            var seriesUid = dataset.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty).Trim();
            var sopUid = dataset.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(patientId) || string.IsNullOrWhiteSpace(studyUid) ||
                string.IsNullOrWhiteSpace(seriesUid) || string.IsNullOrWhiteSpace(sopUid))
            {
                return new(false, null, null, patientId, studyUid, seriesUid, sopUid,
                    "DICOM instance is missing PatientID or Study/Series/SOP Instance UID");
            }

            using var client = CreateOrthancClient(TimeSpan.FromMinutes(5));
            using var content = new ByteArrayContent(dicomBytes);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/dicom");
            using var response = await client.PostAsync("instances", content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var details = await response.Content.ReadAsStringAsync(cancellationToken);
                return new(false, null, null, patientId, studyUid, seriesUid, sopUid,
                    $"Orthanc import failed: HTTP {(int)response.StatusCode} {details}");
            }

            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var root = json.RootElement;
            var instanceId = root.TryGetProperty("ID", out var id) ? id.GetString() : null;
            var studyId = root.TryGetProperty("ParentStudy", out var parent) ? parent.GetString() : null;
            if (string.IsNullOrWhiteSpace(instanceId) || string.IsNullOrWhiteSpace(studyId))
                return new(false, instanceId, studyId, patientId, studyUid, seriesUid, sopUid,
                    "Orthanc acknowledged the request without instance/study identifiers");

            return new(true, instanceId, studyId, patientId, studyUid, seriesUid, sopUid, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DICOM instance import failed");
            return new(false, null, null, null, null, null, null, ex.GetBaseException().Message);
        }
    }

    public async Task<DicomQueryResult> QueryStudiesAsync(
        DicomEndpoint remote,
        DicomQueryCriteria criteria,
        CancellationToken cancellationToken = default)
    {
        string? queryId = null;
        try
        {
            ValidateEndpoint(remote);
            ValidateQueryCriteria(criteria);
            using var client = CreateOrthancClient(TimeSpan.FromSeconds(Math.Max(remote.TimeoutSeconds, 30)));
            var modalityId = await RegisterModalityAsync(client, remote, cancellationToken);
            var query = BuildStudyQuery(criteria);
            using var response = await client.PostAsync(
                $"modalities/{modalityId}/query",
                new StringContent(JsonSerializer.Serialize(new { Level = "Study", Query = query }),
                    Encoding.UTF8, "application/json"),
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var details = await response.Content.ReadAsStringAsync(cancellationToken);
                return new(false, Array.Empty<DicomRemoteStudy>(), false,
                    $"Remote Study Root C-FIND failed: HTTP {(int)response.StatusCode} {details}");
            }

            using (var created = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken)))
                queryId = created.RootElement.TryGetProperty("ID", out var id) ? id.GetString() : null;
            if (string.IsNullOrWhiteSpace(queryId))
                return new(false, Array.Empty<DicomRemoteStudy>(), false,
                    "Orthanc C-FIND response did not contain a query ID");

            using var answersResponse = await client.GetAsync($"queries/{queryId}/answers", cancellationToken);
            if (!answersResponse.IsSuccessStatusCode)
                return new(false, Array.Empty<DicomRemoteStudy>(), false,
                    $"Cannot read C-FIND answers: HTTP {(int)answersResponse.StatusCode}");
            var answerIds = JsonSerializer.Deserialize<List<string>>(
                await answersResponse.Content.ReadAsStringAsync(cancellationToken)) ?? new();
            var truncated = answerIds.Count > criteria.MaxResults;
            var studies = new List<DicomRemoteStudy>();
            foreach (var answerId in answerIds.Take(criteria.MaxResults))
            {
                // ?simplify: without it Orthanc keys the answer by hex tag ("0020,000d"), so every
                // ReadTag(name) lookup below silently returns "" and the caller gets a study with no
                // StudyInstanceUID — found but impossible to retrieve.
                using var contentResponse = await client.GetAsync(
                    $"queries/{queryId}/answers/{Uri.EscapeDataString(answerId)}/content?simplify", cancellationToken);
                if (!contentResponse.IsSuccessStatusCode) continue;
                using var content = JsonDocument.Parse(await contentResponse.Content.ReadAsStringAsync(cancellationToken));
                var root = content.RootElement;
                studies.Add(new DicomRemoteStudy(
                    ReadTag(root, "PatientID"),
                    ReadTag(root, "PatientName"),
                    ReadTag(root, "AccessionNumber"),
                    ReadTag(root, "StudyInstanceUID"),
                    ReadTag(root, "StudyDate"),
                    ReadTag(root, "StudyDescription"),
                    ReadTag(root, "ModalitiesInStudy"),
                    ReadTag(root, "NumberOfStudyRelatedInstances")));
            }

            return new(true, studies, truncated, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Remote Study Root C-FIND failed for {CalledAet}", remote.CalledAeTitle);
            return new(false, Array.Empty<DicomRemoteStudy>(), false, ex.GetBaseException().Message);
        }
        finally
        {
            if (!string.IsNullOrWhiteSpace(queryId))
            {
                try
                {
                    using var cleanupClient = CreateOrthancClient(TimeSpan.FromSeconds(10));
                    await cleanupClient.DeleteAsync($"queries/{queryId}", cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to clean Orthanc query {QueryId}", queryId);
                }
            }
        }
    }

    public async Task<DicomRetrieveResult> RetrieveStudyAsync(
        DicomEndpoint remote,
        string studyInstanceUid,
        string retrieveMethod = "C-MOVE",
        CancellationToken cancellationToken = default)
    {
        string? queryId = null;
        retrieveMethod = retrieveMethod.Trim().ToUpperInvariant();
        if (retrieveMethod is not ("C-MOVE" or "C-GET"))
            return new(false, studyInstanceUid, 0, 0, retrieveMethod, "RetrieveMethod must be C-MOVE or C-GET");
        try
        {
            ValidateEndpoint(remote);
            if (string.IsNullOrWhiteSpace(studyInstanceUid))
                throw new ArgumentException("StudyInstanceUID is required", nameof(studyInstanceUid));
            using var client = CreateOrthancClient(TimeSpan.FromMinutes(15));
            var modalityId = await RegisterModalityAsync(client, remote, cancellationToken);
            var queryBody = JsonSerializer.Serialize(new
            {
                Level = "Study",
                Query = new Dictionary<string, string>
                {
                    ["StudyInstanceUID"] = studyInstanceUid,
                    ["PatientID"] = string.Empty,
                },
            });
            using var queryResponse = await client.PostAsync(
                $"modalities/{modalityId}/query",
                new StringContent(queryBody, Encoding.UTF8, "application/json"), cancellationToken);
            if (!queryResponse.IsSuccessStatusCode)
            {
                var details = await queryResponse.Content.ReadAsStringAsync(cancellationToken);
                return new(false, studyInstanceUid, 0, 0, retrieveMethod,
                    $"C-FIND before retrieve failed: HTTP {(int)queryResponse.StatusCode} {details}");
            }
            using (var queryJson = JsonDocument.Parse(await queryResponse.Content.ReadAsStringAsync(cancellationToken)))
                queryId = queryJson.RootElement.TryGetProperty("ID", out var id) ? id.GetString() : null;
            if (string.IsNullOrWhiteSpace(queryId))
                return new(false, studyInstanceUid, 0, 0, retrieveMethod, "C-FIND did not return a query ID");

            using var answersResponse = await client.GetAsync($"queries/{queryId}/answers", cancellationToken);
            var answers = answersResponse.IsSuccessStatusCode
                ? JsonSerializer.Deserialize<List<string>>(await answersResponse.Content.ReadAsStringAsync(cancellationToken))
                : null;
            if (answers == null || answers.Count == 0)
                return new(false, studyInstanceUid, 0, 0, retrieveMethod, "Remote PACS did not find the requested study");

            var localAet = _configuration["PACS:AETitle"] ?? "HIS_PACS";
            var retrieveOptions = new Dictionary<string, object>
            {
                ["RetrieveMethod"] = retrieveMethod,
                ["Synchronous"] = true,
            };
            if (retrieveMethod == "C-MOVE") retrieveOptions["TargetAet"] = localAet;
            var retrieveBody = JsonSerializer.Serialize(retrieveOptions);
            using var retrieveResponse = await client.PostAsync(
                $"queries/{queryId}/answers/{Uri.EscapeDataString(answers[0])}/retrieve",
                new StringContent(retrieveBody, Encoding.UTF8, "application/json"), cancellationToken);
            if (!retrieveResponse.IsSuccessStatusCode)
            {
                var details = await retrieveResponse.Content.ReadAsStringAsync(cancellationToken);
                return new(false, studyInstanceUid, 0, 0, retrieveMethod,
                    $"{retrieveMethod} failed: HTTP {(int)retrieveResponse.StatusCode} {details}");
            }

            var localStudyId = await ResolveOrthancStudyIdAsync(client, studyInstanceUid, cancellationToken);
            if (localStudyId == null)
                return new(false, studyInstanceUid, 0, 0, retrieveMethod,
                    $"{retrieveMethod} completed but the study is not present in local Orthanc");
            var (count, bytes) = await GetStudyStatisticsAsync(client, localStudyId, cancellationToken);
            if (count <= 0)
                return new(false, studyInstanceUid, count, bytes, retrieveMethod,
                    $"{retrieveMethod} returned no instances");
            return new(true, studyInstanceUid, count, bytes, retrieveMethod, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Remote {Method} failed for study {Study}", retrieveMethod, studyInstanceUid);
            return new(false, studyInstanceUid, 0, 0, retrieveMethod, ex.GetBaseException().Message);
        }
        finally
        {
            if (!string.IsNullOrWhiteSpace(queryId))
            {
                try
                {
                    using var cleanupClient = CreateOrthancClient(TimeSpan.FromSeconds(10));
                    await cleanupClient.DeleteAsync($"queries/{queryId}", cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to clean Orthanc query {QueryId}", queryId);
                }
            }
        }
    }

    public async Task<DicomStudySource> GetStudySourceAsync(
        string studyReference,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(studyReference))
            return new(false, null, null, null, null, null, "Study reference is required");

        try
        {
            using var client = CreateOrthancClient(TimeSpan.FromSeconds(30));
            var orthancStudyId = await ResolveOrthancStudyIdAsync(client, studyReference, cancellationToken);
            if (orthancStudyId == null)
                return new(false, null, null, null, null, null,
                    $"Study '{studyReference}' is not present in the archive");

            var instanceId = await ResolveFirstInstanceIdAsync(client, orthancStudyId, cancellationToken);
            if (instanceId == null)
                return new(false, null, null, null, null, null,
                    $"Study '{studyReference}' has no stored instance to read provenance from");

            var origin = await ReadInstanceMetadataAsync(client, instanceId, "Origin", cancellationToken);
            var remoteAet = await ReadInstanceMetadataAsync(client, instanceId, "RemoteAET", cancellationToken);
            var remoteIp = await ReadInstanceMetadataAsync(client, instanceId, "RemoteIP", cancellationToken);

            // Only a DICOM association carries a meaningful calling AE Title.  Anything else
            // (REST upload, plugin, Lua) must not be reported as if a modality had sent it.
            var isDicomAssociation = string.Equals(origin, "DicomProtocol", StringComparison.OrdinalIgnoreCase);
            var sourceAe = isDicomAssociation && !string.IsNullOrWhiteSpace(remoteAet) ? remoteAet : null;

            string? stationName = null;
            string? departmentName = null;
            using var tagsResponse = await client.GetAsync(
                $"instances/{instanceId}/tags?simplify", cancellationToken);
            if (tagsResponse.IsSuccessStatusCode)
            {
                using var tags = JsonDocument.Parse(
                    await tagsResponse.Content.ReadAsStringAsync(cancellationToken));
                stationName = NullIfBlank(ReadTag(tags.RootElement, "StationName"));
                departmentName = NullIfBlank(ReadTag(tags.RootElement, "InstitutionalDepartmentName"));
            }

            return new(true, sourceAe, NullIfBlank(origin), NullIfBlank(remoteIp),
                stationName, departmentName, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cannot read DICOM provenance for study {Study}", studyReference);
            return new(false, null, null, null, null, null, ex.GetBaseException().Message);
        }
    }

    private static async Task<string?> ResolveFirstInstanceIdAsync(
        HttpClient client,
        string orthancStudyId,
        CancellationToken cancellationToken)
    {
        using var studyResponse = await client.GetAsync($"studies/{orthancStudyId}", cancellationToken);
        if (!studyResponse.IsSuccessStatusCode) return null;
        using var study = JsonDocument.Parse(await studyResponse.Content.ReadAsStringAsync(cancellationToken));
        if (!study.RootElement.TryGetProperty("Series", out var series) ||
            series.ValueKind != JsonValueKind.Array || series.GetArrayLength() == 0)
            return null;

        foreach (var seriesElement in series.EnumerateArray())
        {
            var seriesId = seriesElement.GetString();
            if (string.IsNullOrWhiteSpace(seriesId)) continue;
            using var seriesResponse = await client.GetAsync($"series/{seriesId}", cancellationToken);
            if (!seriesResponse.IsSuccessStatusCode) continue;
            using var seriesJson = JsonDocument.Parse(
                await seriesResponse.Content.ReadAsStringAsync(cancellationToken));
            if (!seriesJson.RootElement.TryGetProperty("Instances", out var instances) ||
                instances.ValueKind != JsonValueKind.Array || instances.GetArrayLength() == 0)
                continue;
            var instanceId = instances[0].GetString();
            if (!string.IsNullOrWhiteSpace(instanceId)) return instanceId;
        }
        return null;
    }

    private static async Task<string?> ReadInstanceMetadataAsync(
        HttpClient client,
        string instanceId,
        string key,
        CancellationToken cancellationToken)
    {
        using var response = await client.GetAsync($"instances/{instanceId}/metadata/{key}", cancellationToken);
        if (!response.IsSuccessStatusCode) return null;
        return NullIfBlank((await response.Content.ReadAsStringAsync(cancellationToken)).Trim('"', ' ', '\r', '\n'));
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private async Task<string> RegisterModalityAsync(
        HttpClient client,
        DicomEndpoint endpoint,
        CancellationToken cancellationToken)
    {
        var modalityId = $"his-{ComputeStableId(endpoint)}";
        var body = JsonSerializer.Serialize(new
        {
            AET = endpoint.CalledAeTitle,
            Host = endpoint.Host,
            Port = endpoint.Port,
            UseDicomTls = endpoint.UseTls,
        });
        using var response = await client.PutAsync(
            $"modalities/{modalityId}",
            new StringContent(body, Encoding.UTF8, "application/json"), cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var details = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"Cannot register remote DICOM modality: HTTP {(int)response.StatusCode} {details}");
        }
        return modalityId;
    }

    private static Dictionary<string, string> BuildStudyQuery(DicomQueryCriteria criteria)
    {
        var query = new Dictionary<string, string>
        {
            ["PatientID"] = criteria.PatientId ?? string.Empty,
            ["PatientName"] = criteria.PatientName ?? string.Empty,
            ["AccessionNumber"] = criteria.AccessionNumber ?? string.Empty,
            ["StudyInstanceUID"] = criteria.StudyInstanceUid ?? string.Empty,
            ["StudyDescription"] = string.Empty,
            ["ModalitiesInStudy"] = criteria.Modality ?? string.Empty,
            ["NumberOfStudyRelatedInstances"] = string.Empty,
        };
        if (criteria.FromDate.HasValue || criteria.ToDate.HasValue)
        {
            var from = (criteria.FromDate ?? criteria.ToDate)!.Value.ToString("yyyyMMdd");
            var to = (criteria.ToDate ?? criteria.FromDate)!.Value.ToString("yyyyMMdd");
            query["StudyDate"] = from == to ? from : $"{from}-{to}";
        }
        else query["StudyDate"] = string.Empty;
        return query;
    }

    private static void ValidateQueryCriteria(DicomQueryCriteria criteria)
    {
        if (criteria.MaxResults is < 1 or > 500)
            throw new ArgumentOutOfRangeException(nameof(criteria.MaxResults), "MaxResults must be 1-500");
        if (criteria.FromDate.HasValue && criteria.ToDate.HasValue &&
            criteria.ToDate.Value.Date < criteria.FromDate.Value.Date)
            throw new ArgumentException("ToDate must not be before FromDate");
        if (criteria.FromDate.HasValue && criteria.ToDate.HasValue &&
            (criteria.ToDate.Value.Date - criteria.FromDate.Value.Date).TotalDays > 366)
            throw new ArgumentException("Remote DICOM query date range cannot exceed 366 days");
        if (!criteria.FromDate.HasValue && !criteria.ToDate.HasValue &&
            string.IsNullOrWhiteSpace(criteria.PatientId) && string.IsNullOrWhiteSpace(criteria.PatientName) &&
            string.IsNullOrWhiteSpace(criteria.AccessionNumber) && string.IsNullOrWhiteSpace(criteria.StudyInstanceUid))
            throw new ArgumentException("Remote DICOM query requires a patient/accession/study filter or date range");
    }

    private static string ReadTag(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value)) return string.Empty;
        if (value.ValueKind == JsonValueKind.String) return value.GetString() ?? string.Empty;
        if (value.ValueKind == JsonValueKind.Object && value.TryGetProperty("Value", out var nested))
            return nested.ValueKind == JsonValueKind.String ? nested.GetString() ?? string.Empty : nested.ToString();
        return value.ToString();
    }

    private HttpClient CreateOrthancClient(TimeSpan timeout)
    {
        var baseUrl = _configuration["PACS:BaseUrl"]?.TrimEnd('/')
            ?? throw new InvalidOperationException("PACS:BaseUrl is not configured");
        var username = _configuration["PACS:Username"]
            ?? throw new InvalidOperationException("PACS:Username is not configured");
        var password = _configuration["PACS:Password"]
            ?? throw new InvalidOperationException("PACS:Password is not configured");

        var client = _httpClientFactory.CreateClient();
        client.BaseAddress = new Uri(baseUrl + "/", UriKind.Absolute);
        client.Timeout = timeout;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{username}:{password}")));
        return client;
    }

    private static async Task<string?> ResolveOrthancStudyIdAsync(
        HttpClient client,
        string reference,
        CancellationToken cancellationToken)
    {
        using var direct = await client.GetAsync($"studies/{Uri.EscapeDataString(reference)}", cancellationToken);
        if (direct.IsSuccessStatusCode) return reference;

        var body = JsonSerializer.Serialize(new
        {
            Level = "Study",
            Query = new Dictionary<string, string> { ["StudyInstanceUID"] = reference },
        });
        using var find = await client.PostAsync(
            "tools/find",
            new StringContent(body, Encoding.UTF8, "application/json"),
            cancellationToken);
        if (!find.IsSuccessStatusCode) return null;
        var ids = JsonSerializer.Deserialize<List<string>>(
            await find.Content.ReadAsStringAsync(cancellationToken));
        return ids?.FirstOrDefault();
    }

    private static async Task<(int InstanceCount, long TotalBytes)> GetStudyStatisticsAsync(
        HttpClient client,
        string orthancStudyId,
        CancellationToken cancellationToken)
    {
        using var response = await client.GetAsync($"studies/{orthancStudyId}/statistics", cancellationToken);
        if (!response.IsSuccessStatusCode) return (0, 0);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var root = json.RootElement;
        var count = root.TryGetProperty("CountInstances", out var countElement) && countElement.TryGetInt32(out var c)
            ? c
            : 0;
        long bytes = 0;
        if (root.TryGetProperty("DiskSize", out var sizeElement))
        {
            if (sizeElement.ValueKind == JsonValueKind.Number) sizeElement.TryGetInt64(out bytes);
            else if (sizeElement.ValueKind == JsonValueKind.String) long.TryParse(sizeElement.GetString(), out bytes);
        }
        return (count, bytes);
    }

    private static async Task<DicomStoreResult> FailureAsync(
        string prefix,
        HttpResponseMessage response,
        CancellationToken cancellationToken,
        int instanceCount = 0,
        long totalBytes = 0)
    {
        var details = await response.Content.ReadAsStringAsync(cancellationToken);
        return new DicomStoreResult(false, instanceCount, totalBytes, null,
            $"{prefix}: HTTP {(int)response.StatusCode} {details}");
    }

    private static void ValidateEndpoint(DicomEndpoint endpoint)
    {
        if (string.IsNullOrWhiteSpace(endpoint.Host)) throw new ArgumentException("DICOM host is required");
        if (endpoint.Port is < 1 or > 65535) throw new ArgumentOutOfRangeException(nameof(endpoint.Port));
        ValidateAeTitle(endpoint.CalledAeTitle, nameof(endpoint.CalledAeTitle));
        ValidateAeTitle(endpoint.CallingAeTitle, nameof(endpoint.CallingAeTitle));
        if (endpoint.TimeoutSeconds is < 1 or > 3600)
            throw new ArgumentOutOfRangeException(nameof(endpoint.TimeoutSeconds));
    }

    private static void ValidateAeTitle(string value, string name)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 16)
            throw new ArgumentException("DICOM AE Title must contain 1-16 characters", name);
    }

    private static string ComputeStableId(DicomEndpoint endpoint)
    {
        var value = $"{endpoint.CalledAeTitle}|{endpoint.Host}|{endpoint.Port}";
        var hash = System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hash.AsSpan(0, 8)).ToLowerInvariant();
    }

    private static string ToDicomPersonName(string value) =>
        string.Join('^', value.Split(' ', StringSplitOptions.RemoveEmptyEntries).Reverse());
}
