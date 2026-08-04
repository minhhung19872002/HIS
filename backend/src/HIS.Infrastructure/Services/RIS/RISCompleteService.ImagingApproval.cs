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

    public async Task<List<DicomStudyDto>> GetStudiesFromPACSAsync(string patientId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        // Get studies from internal database (HIS DicomStudy table)
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

        return studies.Select(d => new DicomStudyDto
        {
            StudyInstanceUID = d.StudyInstanceUID ?? "",
            AccessionNumber = d.AccessionNumber ?? "",
            PatientId = d.PatientID ?? "",
            PatientName = d.PatientName ?? "",
            StudyDate = d.StudyDate ?? DateTime.Now,
            StudyDescription = d.StudyDescription ?? "",
            Modality = d.Modality ?? "",
            NumberOfSeries = d.NumberOfSeries,
            NumberOfImages = d.NumberOfImages,
            StudyStatus = d.Status == 1 ? "Available" : "Pending"
        }).ToList();
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
            .Include(r => r.Exams)
            .FirstOrDefaultAsync(r => r.Id == orderItemId);

        if (request == null) return false;

        var exam = request.Exams.FirstOrDefault();
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
                AccessionNumber = GenerateAccessionNumber()
            };
            await _context.RadiologyExams.AddAsync(exam);
        }

        // Create DICOM study record
        var dicomStudy = new DicomStudy
        {
            Id = Guid.NewGuid(),
            RadiologyExamId = exam.Id,
            StudyInstanceUID = studyInstanceUID,
            StudyDate = DateTime.Now,
            Status = 1,
            CreatedAt = DateTime.Now
        };
        await _context.DicomStudies.AddAsync(dicomStudy);
        await _unitOfWork.SaveChangesAsync();

        return true;
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
