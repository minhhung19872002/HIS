using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K3 phien 1 (2026-05-30): tach RIS Module 8 (5 region 8.1+8.2+8.3+8.4+8.5, ~1730 dong)
// khoi RISCompleteService.cs god-file (5679 dong). ZERO runtime change â€" partial class.
// Ctor + 13 DI deps + PACS config o file goc.
public partial class RISCompleteService
{
    #region 8.3b PACS Imaging, Approval & History

    private sealed record OrthancStudySnapshot(
        string OrthancId,
        string StudyInstanceUID,
        string AccessionNumber,
        string PatientId,
        string PatientName,
        DateTime? StudyDate,
        DateTime? StudyTime,
        string Modality,
        string StudyDescription,
        string InstitutionName,
        string ReferringPhysician,
        int NumberOfSeries,
        int NumberOfImages,
        long? StorageSize);

    private async Task<List<OrthancStudySnapshot>> QueryOrthancStudiesAsync(
        string? patientId = null,
        string? studyInstanceUID = null)
    {
        if (!_pacsEnabled || string.IsNullOrWhiteSpace(_pacsBaseUrl))
            return new List<OrthancStudySnapshot>();

        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        var pacsUser = _configuration["PACS:Username"] ?? "admin";
        var pacsPass = _configuration["PACS:Password"] ?? "orthanc";
        var authBytes = Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

        var query = new Dictionary<string, string>();
        if (!string.IsNullOrWhiteSpace(patientId)) query["PatientID"] = patientId.Trim();
        if (!string.IsNullOrWhiteSpace(studyInstanceUID)) query["StudyInstanceUID"] = studyInstanceUID.Trim();

        var findBody = JsonSerializer.Serialize(new { Level = "Study", Query = query });
        var findResponse = await httpClient.PostAsync(
            $"{_pacsBaseUrl.TrimEnd('/')}/tools/find",
            new StringContent(findBody, Encoding.UTF8, "application/json"));
        if (!findResponse.IsSuccessStatusCode)
        {
            _logger.LogWarning("Orthanc study query failed: HTTP {StatusCode}", findResponse.StatusCode);
            return new List<OrthancStudySnapshot>();
        }

        var orthancIds = JsonSerializer.Deserialize<List<string>>(
            await findResponse.Content.ReadAsStringAsync()) ?? new List<string>();
        var snapshots = new List<OrthancStudySnapshot>();

        foreach (var orthancId in orthancIds.Take(50))
        {
            var studyResponse = await httpClient.GetAsync($"{_pacsBaseUrl.TrimEnd('/')}/studies/{orthancId}");
            if (!studyResponse.IsSuccessStatusCode) continue;

            using var studyDocument = JsonDocument.Parse(await studyResponse.Content.ReadAsStringAsync());
            var study = studyDocument.RootElement;
            var studyTags = study.TryGetProperty("MainDicomTags", out var mainTags)
                ? mainTags
                : default;
            var patientTags = study.TryGetProperty("PatientMainDicomTags", out var mainPatientTags)
                ? mainPatientTags
                : default;
            var uid = GetDicomTag(studyTags, "StudyInstanceUID");
            if (string.IsNullOrWhiteSpace(uid)) continue;

            var numberOfSeries = study.TryGetProperty("Series", out var series) && series.ValueKind == JsonValueKind.Array
                ? series.GetArrayLength()
                : 0;
            var numberOfImages = 0;
            long? storageSize = null;
            var statsResponse = await httpClient.GetAsync($"{_pacsBaseUrl.TrimEnd('/')}/studies/{orthancId}/statistics");
            if (statsResponse.IsSuccessStatusCode)
            {
                using var statsDocument = JsonDocument.Parse(await statsResponse.Content.ReadAsStringAsync());
                var stats = statsDocument.RootElement;
                if (stats.TryGetProperty("CountSeries", out var countSeries) && countSeries.TryGetInt32(out var parsedSeries))
                    numberOfSeries = parsedSeries;
                if (stats.TryGetProperty("CountInstances", out var countInstances) && countInstances.TryGetInt32(out var parsedImages))
                    numberOfImages = parsedImages;
                if (stats.TryGetProperty("DiskSize", out var diskSize) && TryReadInt64(diskSize, out var parsedSize))
                    storageSize = parsedSize;
            }

            var modality = "";
            if (study.TryGetProperty("Series", out series) && series.ValueKind == JsonValueKind.Array && series.GetArrayLength() > 0)
            {
                var firstSeriesId = series[0].GetString();
                if (!string.IsNullOrWhiteSpace(firstSeriesId))
                {
                    var seriesResponse = await httpClient.GetAsync($"{_pacsBaseUrl.TrimEnd('/')}/series/{firstSeriesId}");
                    if (seriesResponse.IsSuccessStatusCode)
                    {
                        using var seriesDocument = JsonDocument.Parse(await seriesResponse.Content.ReadAsStringAsync());
                        if (seriesDocument.RootElement.TryGetProperty("MainDicomTags", out var seriesTags))
                            modality = GetDicomTag(seriesTags, "Modality");
                    }
                }
            }

            var dicomDate = GetDicomTag(studyTags, "StudyDate");
            var dicomTime = GetDicomTag(studyTags, "StudyTime");
            snapshots.Add(new OrthancStudySnapshot(
                orthancId,
                uid,
                GetDicomTag(studyTags, "AccessionNumber"),
                GetDicomTag(patientTags, "PatientID"),
                GetDicomTag(patientTags, "PatientName").Replace('^', ' ').Trim(),
                ParseDicomDateOrNull(dicomDate),
                ParseDicomDateTimeOrNull(dicomDate, dicomTime),
                modality,
                GetDicomTag(studyTags, "StudyDescription"),
                GetDicomTag(studyTags, "InstitutionName"),
                GetDicomTag(studyTags, "ReferringPhysicianName").Replace('^', ' ').Trim(),
                numberOfSeries,
                numberOfImages,
                storageSize));
        }

        return snapshots;
    }

    private static string GetDicomTag(JsonElement tags, string name) =>
        tags.ValueKind == JsonValueKind.Object && tags.TryGetProperty(name, out var value)
            ? value.GetString() ?? ""
            : "";

    private static bool TryReadInt64(JsonElement value, out long parsed) =>
        value.ValueKind == JsonValueKind.Number
            ? value.TryGetInt64(out parsed)
            : long.TryParse(value.GetString(), out parsed);

    private static DateTime? ParseDicomDateOrNull(string value) =>
        DateTime.TryParseExact(value, "yyyyMMdd", null,
            System.Globalization.DateTimeStyles.None, out var parsed) ? parsed : null;

    private static DateTime? ParseDicomDateTimeOrNull(string date, string time)
    {
        if (string.IsNullOrWhiteSpace(date) || string.IsNullOrWhiteSpace(time)) return null;
        var normalizedTime = new string(time.TakeWhile(char.IsDigit).Take(6).ToArray()).PadRight(6, '0');
        return DateTime.TryParseExact($"{date}{normalizedTime}", "yyyyMMddHHmmss", null,
            System.Globalization.DateTimeStyles.None, out var parsed) ? parsed : null;
    }

    public async Task<List<DicomStudyDto>> GetStudiesFromPACSAsync(string patientId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.DicomStudies
            .Include(d => d.RadiologyExam)
                .ThenInclude(e => e.RadiologyRequest)
                    .ThenInclude(r => r.Patient)
            .AsQueryable();

        if (!string.IsNullOrEmpty(patientId))
        {
            query = query.Where(d => d.PatientID == patientId ||
                                     d.RadiologyExam.RadiologyRequest.Patient.PatientCode == patientId);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(d => d.StudyDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(d => d.StudyDate <= toDate.Value);
        }

        var studies = await query.OrderByDescending(d => d.StudyDate).Take(50).ToListAsync();
        var merged = new Dictionary<string, DicomStudyDto>(StringComparer.Ordinal);
        foreach (var study in studies.Where(study => !string.IsNullOrWhiteSpace(study.StudyInstanceUID)))
        {
            merged[study.StudyInstanceUID] = new DicomStudyDto
            {
                StudyInstanceUID = study.StudyInstanceUID,
                AccessionNumber = study.AccessionNumber ?? "",
                PatientId = study.PatientID ?? "",
                PatientName = study.PatientName ?? "",
                StudyDate = study.StudyDate ?? DateTime.Now,
                StudyTime = study.StudyTime,
                StudyDescription = study.StudyDescription ?? "",
                Modality = study.Modality ?? "",
                NumberOfSeries = study.NumberOfSeries,
                NumberOfImages = study.NumberOfImages,
                StudyStatus = study.Status == 1 ? "Available" : "Pending"
            };
        }

        try
        {
            var pacsStudies = await QueryOrthancStudiesAsync(patientId);
            foreach (var study in pacsStudies)
            {
                if (fromDate.HasValue && study.StudyDate < fromDate.Value) continue;
                if (toDate.HasValue && study.StudyDate > toDate.Value) continue;

                merged[study.StudyInstanceUID] = new DicomStudyDto
                {
                    StudyInstanceUID = study.StudyInstanceUID,
                    AccessionNumber = study.AccessionNumber,
                    PatientId = study.PatientId,
                    PatientName = study.PatientName,
                    StudyDate = study.StudyDate ?? DateTime.Now,
                    StudyTime = study.StudyTime,
                    Modality = study.Modality,
                    StudyDescription = study.StudyDescription,
                    InstitutionName = study.InstitutionName,
                    ReferringPhysician = study.ReferringPhysician,
                    NumberOfSeries = study.NumberOfSeries,
                    NumberOfImages = study.NumberOfImages,
                    StudyStatus = "Available"
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cannot query Orthanc studies for patient {PatientId}", patientId);
        }

        return merged.Values.OrderByDescending(d => d.StudyDate).Take(50).ToList();
    }

    public async Task<List<DicomSeriesDto>> GetSeriesAsync(string studyInstanceUID)
    {
        var pacsBaseUrl = _pacsBaseUrl.TrimEnd('/');
        var pacsUser = _configuration["PACS:Username"] ?? "admin";
        var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

        // Try to query Orthanc PACS directly
        if (_pacsEnabled && !string.IsNullOrEmpty(pacsBaseUrl))
        {
            try
            {
                using var httpClient = new HttpClient();
                var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                // Find study in Orthanc by StudyInstanceUID
                var findJson = $"{{\"Level\":\"Study\",\"Query\":{{\"StudyInstanceUID\":\"{studyInstanceUID}\"}}}}";
                var findResp = await httpClient.PostAsync($"{pacsBaseUrl}/tools/find",
                    new StringContent(findJson, System.Text.Encoding.UTF8, "application/json"));

                if (findResp.IsSuccessStatusCode)
                {
                    var studyIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(await findResp.Content.ReadAsStringAsync());
                    if (studyIds != null && studyIds.Count > 0)
                    {
                        var seriesResp = await httpClient.GetAsync($"{pacsBaseUrl}/studies/{studyIds[0]}/series");
                        if (seriesResp.IsSuccessStatusCode)
                        {
                            var seriesJson = await seriesResp.Content.ReadAsStringAsync();
                            var orthancSeries = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(seriesJson);

                            // Get patient info from study
                            var studyResp = await httpClient.GetAsync($"{pacsBaseUrl}/studies/{studyIds[0]}");
                            var studyJson = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(await studyResp.Content.ReadAsStringAsync());
                            var patientName = "";
                            var patientId = "";
                            var studyDate = "";
                            var studyDesc = "";
                            if (studyJson.TryGetProperty("PatientMainDicomTags", out var ptTags))
                            {
                                if (ptTags.TryGetProperty("PatientName", out var pn)) patientName = pn.GetString() ?? "";
                                if (ptTags.TryGetProperty("PatientID", out var pid)) patientId = pid.GetString() ?? "";
                            }
                            if (studyJson.TryGetProperty("MainDicomTags", out var stTags))
                            {
                                if (stTags.TryGetProperty("StudyDate", out var sd)) studyDate = sd.GetString() ?? "";
                                if (stTags.TryGetProperty("StudyDescription", out var sdd)) studyDesc = sdd.GetString() ?? "";
                            }

                            var result = new List<DicomSeriesDto>();
                            int idx = 1;
                            foreach (var s in orthancSeries ?? new List<System.Text.Json.JsonElement>())
                            {
                                var tags = s.GetProperty("MainDicomTags");
                                var seriesUID = tags.TryGetProperty("SeriesInstanceUID", out var suid) ? suid.GetString() ?? "" : "";
                                var modality = tags.TryGetProperty("Modality", out var mod) ? mod.GetString() ?? "CR" : "CR";
                                var instanceCount = s.TryGetProperty("Instances", out var inst) ? inst.GetArrayLength() : 0;

                                result.Add(new DicomSeriesDto
                                {
                                    SeriesInstanceUID = seriesUID,
                                    StudyInstanceUID = studyInstanceUID,
                                    SeriesNumber = idx++,
                                    Modality = modality,
                                    SeriesDescription = studyDesc,
                                    BodyPartExamined = "",
                                    NumberOfImages = instanceCount,
                                    PatientName = patientName,
                                    PatientId = patientId,
                                    StudyDate = studyDate,
                                    StudyDescription = studyDesc,
                                    OrthancStudyId = studyIds[0],
                                    OrthancSeriesId = s.TryGetProperty("ID", out var sid) ? sid.GetString() ?? "" : ""
                                });
                            }
                            if (result.Count > 0) return result;
                        }
                    }
                }
            }
            catch { /* Fall through to DB lookup */ }
        }

        // Fallback: Get study from database
        var study = await _context.DicomStudies
            .Include(d => d.RadiologyExam)
                .ThenInclude(e => e.RadiologyRequest)
                    .ThenInclude(r => r.Patient)
            .FirstOrDefaultAsync(d => d.StudyInstanceUID == studyInstanceUID);

        if (study == null)
            return new List<DicomSeriesDto>();

        return new List<DicomSeriesDto>
        {
            new DicomSeriesDto
            {
                SeriesInstanceUID = $"{studyInstanceUID}.1",
                StudyInstanceUID = studyInstanceUID,
                SeriesNumber = 1,
                Modality = study.Modality ?? "CR",
                SeriesDescription = study.StudyDescription ?? "",
                BodyPartExamined = study.BodyPartExamined ?? "",
                NumberOfImages = study.NumberOfImages,
                PatientName = study.PatientName ?? study.RadiologyExam?.RadiologyRequest?.Patient?.FullName ?? "",
                PatientId = study.PatientID ?? "",
                StudyDate = study.StudyDate?.ToString("yyyyMMdd") ?? "",
                StudyDescription = study.StudyDescription ?? ""
            }
        };
    }

    public async Task<List<DicomImageDto>> GetImagesAsync(string seriesInstanceUID)
    {
        var pacsBaseUrl = _pacsBaseUrl.TrimEnd('/');
        var pacsUser = _configuration["PACS:Username"] ?? "admin";
        var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

        // Try to query Orthanc PACS directly
        if (_pacsEnabled && !string.IsNullOrEmpty(pacsBaseUrl))
        {
            try
            {
                using var httpClient = new HttpClient();
                var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                // Find series in Orthanc
                var findJson = $"{{\"Level\":\"Series\",\"Query\":{{\"SeriesInstanceUID\":\"{seriesInstanceUID}\"}}}}";
                var findResp = await httpClient.PostAsync($"{pacsBaseUrl}/tools/find",
                    new StringContent(findJson, System.Text.Encoding.UTF8, "application/json"));

                if (findResp.IsSuccessStatusCode)
                {
                    var seriesIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(await findResp.Content.ReadAsStringAsync());
                    if (seriesIds != null && seriesIds.Count > 0)
                    {
                        // Pull series-level metadata once to know Modality (cheap)
                        string? seriesModality = null;
                        try
                        {
                            var seriesResp = await httpClient.GetAsync($"{pacsBaseUrl}/series/{seriesIds[0]}");
                            if (seriesResp.IsSuccessStatusCode)
                            {
                                var serJson = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(
                                    await seriesResp.Content.ReadAsStringAsync());
                                if (serJson.TryGetProperty("MainDicomTags", out var sTags) &&
                                    sTags.TryGetProperty("Modality", out var modProp))
                                    seriesModality = modProp.GetString();
                            }
                        }
                        catch { /* best effort */ }

                        var instResp = await httpClient.GetAsync($"{pacsBaseUrl}/series/{seriesIds[0]}/instances");
                        if (instResp.IsSuccessStatusCode)
                        {
                            var instJson = await instResp.Content.ReadAsStringAsync();
                            var instances = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(instJson);

                            var result = new List<DicomImageDto>();
                            int idx = 1;
                            // For mammography (â‰¤16 instances typical), fetch per-instance laterality/viewPosition.
                            // For larger CT/MR series, skip the extra round-trips.
                            bool fetchExtraTags = seriesModality == "MG" || (instances?.Count ?? 0) <= 16;

                            foreach (var inst in instances ?? new List<System.Text.Json.JsonElement>())
                            {
                                var instId = inst.TryGetProperty("ID", out var iid) ? iid.GetString() ?? "" : "";
                                var tags = inst.GetProperty("MainDicomTags");
                                var sopUID = tags.TryGetProperty("SOPInstanceUID", out var sop) ? sop.GetString() ?? "" : "";

                                string? laterality = null;
                                string? viewPosition = null;
                                decimal? pixelSpacing = null;

                                if (fetchExtraTags && !string.IsNullOrEmpty(instId))
                                {
                                    try
                                    {
                                        var tagsResp = await httpClient.GetAsync($"{pacsBaseUrl}/instances/{instId}/tags?simplify");
                                        if (tagsResp.IsSuccessStatusCode)
                                        {
                                            var tagsObj = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(
                                                await tagsResp.Content.ReadAsStringAsync());
                                            if (tagsObj.TryGetProperty("ImageLaterality", out var latProp))
                                                laterality = latProp.GetString();
                                            if (laterality == null && tagsObj.TryGetProperty("Laterality", out var lat2))
                                                laterality = lat2.GetString();
                                            if (tagsObj.TryGetProperty("ViewPosition", out var vpProp))
                                                viewPosition = vpProp.GetString();
                                            if (tagsObj.TryGetProperty("PixelSpacing", out var psProp))
                                            {
                                                var psStr = psProp.GetString();
                                                if (!string.IsNullOrEmpty(psStr))
                                                {
                                                    var parts = psStr.Split('\\', '/', ',');
                                                    if (parts.Length > 0 && decimal.TryParse(parts[0],
                                                        System.Globalization.NumberStyles.Float,
                                                        System.Globalization.CultureInfo.InvariantCulture, out var ps))
                                                        pixelSpacing = ps;
                                                }
                                            }
                                        }
                                    }
                                    catch { /* best effort per instance */ }
                                }

                                result.Add(new DicomImageDto
                                {
                                    SOPInstanceUID = sopUID,
                                    SeriesInstanceUID = seriesInstanceUID,
                                    InstanceNumber = idx++,
                                    ThumbnailUrl = $"/api/RISComplete/pacs/instances/{instId}/preview",
                                    ImageUrl = $"/api/RISComplete/pacs/instances/{instId}/rendered?width=1024",
                                    WadoUrl = $"/api/RISComplete/pacs/instances/{instId}/file",
                                    Laterality = laterality,
                                    ViewPosition = viewPosition,
                                    Modality = seriesModality,
                                    PixelSpacing = pixelSpacing,
                                });
                            }
                            if (result.Count > 0) return result;
                        }
                    }
                }
            }
            catch { /* Fall through to DB lookup */ }
        }

        // Fallback: extract study UID from series UID
        var studyUid = seriesInstanceUID.EndsWith(".1")
            ? seriesInstanceUID[..^2]
            : seriesInstanceUID;

        var study = await _context.DicomStudies
            .FirstOrDefaultAsync(d => d.StudyInstanceUID == studyUid);

        if (study == null)
            return new List<DicomImageDto>();

        var images = new List<DicomImageDto>();
        for (int i = 1; i <= Math.Max(1, study.NumberOfImages); i++)
        {
            images.Add(new DicomImageDto
            {
                SOPInstanceUID = $"{seriesInstanceUID}.{i}",
                SeriesInstanceUID = seriesInstanceUID,
                InstanceNumber = i,
                ThumbnailUrl = $"/api/RISComplete/pacs/instances/{study.Id}/preview",
                ImageUrl = $"/api/RISComplete/pacs/instances/{study.Id}/rendered?width=1024",
                WadoUrl = ""
            });
        }
        return images;
    }

    public async Task<bool> LinkStudyToOrderAsync(Guid orderItemId, string studyInstanceUID)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.Exams)
                .ThenInclude(e => e.DicomStudies)
            .FirstOrDefaultAsync(r => r.Id == orderItemId);

        if (request == null || string.IsNullOrWhiteSpace(studyInstanceUID)) return false;

        OrthancStudySnapshot? pacsStudy;
        try
        {
            pacsStudy = (await QueryOrthancStudiesAsync(studyInstanceUID: studyInstanceUID)).FirstOrDefault();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cannot verify PACS study {StudyInstanceUID}", studyInstanceUID);
            return false;
        }
        if (pacsStudy == null) return false;

        var exam = request.Exams.FirstOrDefault();
        var patientMatches = !string.IsNullOrWhiteSpace(pacsStudy.PatientId) &&
            string.Equals(pacsStudy.PatientId.Trim(), request.Patient.PatientCode?.Trim(), StringComparison.OrdinalIgnoreCase);
        var accessionMatches = !string.IsNullOrWhiteSpace(pacsStudy.AccessionNumber) &&
            (string.Equals(pacsStudy.AccessionNumber.Trim(), request.RequestCode?.Trim(), StringComparison.OrdinalIgnoreCase) ||
             string.Equals(pacsStudy.AccessionNumber.Trim(), exam?.AccessionNumber?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (!patientMatches && !accessionMatches)
        {
            _logger.LogWarning(
                "Rejected PACS link because patient/accession mismatch. Order {OrderId}, Study {StudyInstanceUID}",
                request.Id, studyInstanceUID);
            return false;
        }

        var linkedToAnotherOrder = await _context.DicomStudies.AnyAsync(d =>
            d.StudyInstanceUID == studyInstanceUID &&
            d.RadiologyExam.RadiologyRequestId != request.Id);
        if (linkedToAnotherOrder) return false;

        if (exam == null)
        {
            exam = new RadiologyExam
            {
                Id = Guid.NewGuid(),
                RadiologyRequestId = request.Id,
                ExamCode = $"EX{DateTime.Now:yyyyMMddHHmmss}",
                ExamName = "CDHA",
                ExamDate = DateTime.Now,
                Status = 2,
                AccessionNumber = string.IsNullOrWhiteSpace(pacsStudy.AccessionNumber)
                    ? request.RequestCode
                    : pacsStudy.AccessionNumber
            };
            await _context.RadiologyExams.AddAsync(exam);
        }

        var dicomStudy = exam.DicomStudies.FirstOrDefault();
        if (dicomStudy == null)
        {
            dicomStudy = new DicomStudy
            {
                Id = Guid.NewGuid(),
                RadiologyExamId = exam.Id,
                CreatedAt = DateTime.Now
            };
            await _context.DicomStudies.AddAsync(dicomStudy);
        }

        dicomStudy.StudyInstanceUID = pacsStudy.StudyInstanceUID;
        dicomStudy.StudyDate = pacsStudy.StudyDate ?? DateTime.Now;
        dicomStudy.StudyTime = pacsStudy.StudyTime;
        dicomStudy.StudyDescription = pacsStudy.StudyDescription;
        dicomStudy.AccessionNumber = pacsStudy.AccessionNumber;
        dicomStudy.PatientID = string.IsNullOrWhiteSpace(pacsStudy.PatientId)
            ? request.Patient.PatientCode
            : pacsStudy.PatientId;
        dicomStudy.PatientName = string.IsNullOrWhiteSpace(pacsStudy.PatientName)
            ? request.Patient.FullName
            : pacsStudy.PatientName;
        dicomStudy.Modality = pacsStudy.Modality;
        dicomStudy.NumberOfSeries = pacsStudy.NumberOfSeries;
        dicomStudy.NumberOfImages = pacsStudy.NumberOfImages;
        dicomStudy.StorageLocation = pacsStudy.OrthancId;
        dicomStudy.StorageSize = pacsStudy.StorageSize;
        dicomStudy.Status = 1;
        dicomStudy.UpdatedAt = DateTime.Now;
        await ResolveStudyProvenanceAsync(dicomStudy, exam);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    /// <summary>
    /// Records how the study actually reached the archive, plus the HIS department that performed
    /// it.  Failure leaves <c>SourceResolvedAt</c> null so filtered auto-send rules keep skipping
    /// the study instead of matching it on absent metadata.
    /// </summary>
    private async Task ResolveStudyProvenanceAsync(DicomStudy dicomStudy, RadiologyExam exam)
    {
        var source = await _dicomPacsGateway.GetStudySourceAsync(dicomStudy.StudyInstanceUID);
        if (!source.Success)
        {
            _logger.LogWarning(
                "Cannot resolve DICOM provenance for study {StudyInstanceUID}: {Error}",
                dicomStudy.StudyInstanceUID, source.ErrorMessage);
            return;
        }

        dicomStudy.SourceAeTitle = source.SourceAeTitle;
        dicomStudy.SourceOrigin = source.Origin;
        dicomStudy.SourceIpAddress = source.SourceIpAddress;
        dicomStudy.StationName = source.StationName;
        dicomStudy.DepartmentCode =
            await ResolveExamDepartmentCodeAsync(exam) ?? source.InstitutionalDepartmentName;
        dicomStudy.SourceResolvedAt = DateTime.UtcNow;
    }

    /// <summary>Department code of the room the exam was performed in, when HIS knows it.</summary>
    private async Task<string?> ResolveExamDepartmentCodeAsync(RadiologyExam exam)
    {
        if (exam.RoomId == null) return null;
        var code = await _context.Rooms
            .Where(r => r.Id == exam.RoomId.Value)
            .Select(r => r.Department.DepartmentCode)
            .FirstOrDefaultAsync();
        return string.IsNullOrWhiteSpace(code) ? null : code;
    }

    public async Task<bool> PreliminaryApproveResultAsync(Guid resultId, string note)
    {
        var report = await _context.RadiologyReports.FindAsync(resultId);
        if (report == null) return false;

        report.Status = 1; // Preliminary approved
        report.UpdatedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> FinalApproveResultAsync(ApproveRadiologyResultDto dto)
    {
        var report = await _context.RadiologyReports.FindAsync(dto.ResultId);
        if (report == null) return false;

        // G-36: per-modality permission check.
        // Chá»‰ Ã¡p khi ApprovingUserId cÃ³ giÃ¡ trá»‹ (controller Ä'iá»n tá»« JWT).
        // Logic: náº¿u user cÃ³ RadiologyPermission row nÃ o cho modality cá»§a ca chá»¥p
        // â†' pháº£i cÃ³ bit DuyetKQ (0x0010). KhÃ´ng cÃ³ row nÃ o = khÃ´ng háº¡n cháº¿ (backward-compat).
        if (dto.ApprovingUserId.HasValue && dto.ApprovingUserId.Value != Guid.Empty)
        {
            var examForCheck = await _context.RadiologyExams
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == report.RadiologyExamId);

            if (examForCheck != null)
            {
                const int DuyetKQFlag = 0x0010;
                var modalityPerms = await _context.RadiologyPermissions
                    .Where(p =>
                        p.UserId == dto.ApprovingUserId.Value &&
                        p.IsActive &&
                        (p.ModalityId == examForCheck.ModalityId || p.ModalityId == null))
                    .ToListAsync();

                // CÃ³ row háº¡n cháº¿ â†' pháº£i cÃ³ flag DuyetKQ
                if (modalityPerms.Count > 0 && !modalityPerms.Any(p => (p.Permissions & DuyetKQFlag) != 0))
                {
                    throw new UnauthorizedAccessException(
                        "Báº¡n khÃ´ng cÃ³ quyá»n duyá»‡t káº¿t quáº£ cho loáº¡i mÃ¡y chá»¥p nÃ y.");
                }
            }
        }

        report.Status = 2; // Final approved
        report.ApprovedBy = dto.ApprovingUserId ?? GetCurrentUserIdOrAdmin();
        report.ApprovedAt = DateTime.Now;
        report.UpdatedAt = DateTime.Now;

        // Update request status
        var exam = await _context.RadiologyExams
            .Include(e => e.RadiologyRequest)
            .FirstOrDefaultAsync(e => e.Id == report.RadiologyExamId);

        if (exam?.RadiologyRequest != null)
        {
            exam.RadiologyRequest.Status = 5; // Approved
        }

        await _unitOfWork.SaveChangesAsync();

        // Fire-and-forget email notification
        _ = _notificationService.NotifyRadiologyResultAsync(report.Id, "BÃ¡c sÄ© duyá»‡t");

        return true;
    }

    public async Task<bool> CancelApprovalAsync(Guid resultId, string reason)
    {
        var report = await _context.RadiologyReports.FindAsync(resultId);
        if (report == null) return false;

        report.Status = 0; // Back to draft
        report.ApprovedBy = null;
        report.ApprovedAt = null;
        report.UpdatedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]> PrintRadiologyResultAsync(Guid resultId, string format = "A4", bool includeImages = true)
    {
        // Generate PDF report
        return await Task.FromResult(new byte[0]);
    }

    public async Task<byte[]> PrintRadiologyResultsBatchAsync(List<Guid> resultIds, string format = "A4")
    {
        return await Task.FromResult(new byte[0]);
    }

    public async Task<SendResultResponseDto> SendResultToDepartmentAsync(SendResultDto dto)
    {
        return new SendResultResponseDto
        {
            Success = true,
            Message = "Ket qua da duoc gui thanh cong",
            SentTime = DateTime.Now
        };
    }

    public async Task<List<RadiologyResultDto>> GetPatientRadiologyHistoryAsync(Guid patientId, string serviceType = null, int? lastNMonths = 12)
    {
        var fromDate = DateTime.Now.AddMonths(-(lastNMonths ?? 12));

        var query = _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.Exams)
                .ThenInclude(e => e.Report)
            .Where(r => r.PatientId == patientId && r.RequestDate >= fromDate);

        var requests = await query.OrderByDescending(r => r.RequestDate).ToBoundedListAsync("RIS.GetPatientRadiologyHistory");

        return requests.Select(r =>
        {
            var exam = r.Exams.FirstOrDefault();
            var report = exam?.Report;
            return new RadiologyResultDto
            {
                Id = report?.Id ?? Guid.Empty,
                OrderItemId = r.Id,
                OrderCode = r.RequestCode,
                PatientId = r.PatientId,
                PatientCode = r.Patient.PatientCode,
                PatientName = r.Patient.FullName,
                ServiceCode = r.Service?.ServiceCode ?? "",
                ServiceName = r.Service?.ServiceName ?? "",
                ServiceType = GetRadiologyServiceTypeName(r.Service),
                ResultDate = report?.ReportDate ?? r.RequestDate,
                Description = report?.Findings ?? "",
                Conclusion = report?.Impression ?? "",
                ApprovalStatus = GetReportStatusName(report?.Status ?? 0)
            };
        }).ToList();
    }

    #endregion
}
