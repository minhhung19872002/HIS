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

namespace HIS.Infrastructure.Services;

// K3 phien 5 (2026-05-30): tach RIS region DICOM Export / Send NangCap15 PACS 3/4 (~219 dong)
// khoi RISCompleteService.cs. ZERO runtime change — partial class.
public partial class RISCompleteService
{
    #region DICOM Export / Send (NangCap15 PACS 3/4)

    private async Task<string?> ResolveOrthancStudyIdAsync(HttpClient httpClient, string studyReference)
    {
        if (string.IsNullOrWhiteSpace(studyReference)) return null;

        var pacsBaseUrl = _pacsBaseUrl.TrimEnd('/');
        var directResponse = await httpClient.GetAsync($"{pacsBaseUrl}/studies/{studyReference}");
        if (directResponse.IsSuccessStatusCode) return studyReference;

        var studyInstanceUid = studyReference;
        if (Guid.TryParse(studyReference, out var dicomStudyId))
        {
            var linkedStudy = await _context.DicomStudies.AsNoTracking()
                .Where(s => s.Id == dicomStudyId && !s.IsDeleted)
                .Select(s => new { s.StorageLocation, s.StudyInstanceUID })
                .FirstOrDefaultAsync();
            if (linkedStudy == null) return null;
            if (!string.IsNullOrWhiteSpace(linkedStudy.StorageLocation))
            {
                var storedResponse = await httpClient.GetAsync(
                    $"{pacsBaseUrl}/studies/{linkedStudy.StorageLocation}");
                if (storedResponse.IsSuccessStatusCode) return linkedStudy.StorageLocation;
            }
            studyInstanceUid = linkedStudy.StudyInstanceUID;
        }

        var findBody = JsonSerializer.Serialize(new
        {
            Level = "Study",
            Query = new Dictionary<string, string> { ["StudyInstanceUID"] = studyInstanceUid }
        });
        var findResponse = await httpClient.PostAsync(
            $"{pacsBaseUrl}/tools/find",
            new StringContent(findBody, Encoding.UTF8, "application/json"));
        if (!findResponse.IsSuccessStatusCode) return null;

        var ids = JsonSerializer.Deserialize<List<string>>(await findResponse.Content.ReadAsStringAsync());
        return ids?.FirstOrDefault();
    }

    /// <summary>
    /// Gọi Orthanc POST /studies/{id}/anonymize để loại bỏ PHI (tag 0010,xxxx) khỏi DICOM,
    /// archive study ẩn danh, rồi XÓA bản copy trên Orthanc sau khi đọc xong (tránh rác PACS).
    /// Trả về byte[] ZIP của study đã ẩn danh, hoặc rỗng nếu PACS không khả dụng.
    /// </summary>
    public async Task<byte[]> ExportDicomStudyAnonymizedAsync(string studyReference)
    {
        if (!_pacsEnabled || string.IsNullOrEmpty(_pacsBaseUrl))
            return Array.Empty<byte>();

        var pacsBaseUrl = _pacsBaseUrl.TrimEnd('/');
        var pacsUser = _configuration["PACS:Username"] ?? "admin";
        var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromMinutes(10); // anonymize + archive có thể chậm với study lớn
        var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

        string? anonymizedId = null;
        try
        {
            var orthancStudyId = await ResolveOrthancStudyIdAsync(httpClient, studyReference);
            if (string.IsNullOrWhiteSpace(orthancStudyId)) return Array.Empty<byte>();

            // Bước 1: Anonymize — Orthanc tạo bản sao mới không có PHI
            var anonBody = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
            var anonResp = await httpClient.PostAsync(
                $"{pacsBaseUrl}/studies/{orthancStudyId}/anonymize",
                anonBody);

            if (!anonResp.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Orthanc anonymize failed for study {StudyId}: HTTP {StatusCode}",
                    studyReference, anonResp.StatusCode);
                return Array.Empty<byte>();
            }

            var anonJson = await anonResp.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(anonJson);
            if (!doc.RootElement.TryGetProperty("ID", out var idProp))
            {
                _logger.LogWarning(
                    "Orthanc anonymize response missing 'ID' field for study {StudyId}",
                    studyReference);
                return Array.Empty<byte>();
            }
            anonymizedId = idProp.GetString();

            if (string.IsNullOrEmpty(anonymizedId))
                return Array.Empty<byte>();

            // Bước 2: Archive bản đã ẩn danh
            var archResp = await httpClient.GetAsync(
                $"{pacsBaseUrl}/studies/{anonymizedId}/archive");

            if (!archResp.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Orthanc archive failed for anonymized study {AnonId}: HTTP {StatusCode}",
                    anonymizedId, archResp.StatusCode);
                return Array.Empty<byte>();
            }

            return await archResp.Content.ReadAsByteArrayAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Orthanc anonymize+archive failed for study {StudyId}: {Message}",
                studyReference, ex.Message);
            return Array.Empty<byte>();
        }
        finally
        {
            // Bước 3: Dọn bản copy ẩn danh trên Orthanc (tránh rác PACS)
            if (!string.IsNullOrEmpty(anonymizedId))
            {
                try
                {
                    await httpClient.DeleteAsync($"{pacsBaseUrl}/studies/{anonymizedId}");
                }
                catch (Exception ex)
                {
                    // Không fail export vì lỗi cleanup — ghi log để admin dọn thủ công nếu cần
                    _logger.LogWarning(ex,
                        "Failed to delete anonymized study {AnonId} from Orthanc after export. Manual cleanup may be needed.",
                        anonymizedId);
                }
            }
        }
    }

    public async Task<byte[]> ExportDicomStudyAsync(string studyId, string format = "zip")
    {
        // Try to export from Orthanc PACS
        if (_pacsEnabled && !string.IsNullOrEmpty(_pacsBaseUrl))
        {
            try
            {
                var pacsBaseUrl = _pacsBaseUrl.TrimEnd('/');
                var pacsUser = _configuration["PACS:Username"] ?? "admin";
                var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromMinutes(5); // Large studies may take time
                var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                var orthancStudyId = await ResolveOrthancStudyIdAsync(httpClient, studyId);
                if (string.IsNullOrWhiteSpace(orthancStudyId)) return Array.Empty<byte>();

                if (format == "dicomdir")
                {
                    // Export as DICOMDIR media
                    var resp = await httpClient.PostAsync(
                        $"{pacsBaseUrl}/studies/{orthancStudyId}/media",
                        new StringContent("", System.Text.Encoding.UTF8));
                    if (resp.IsSuccessStatusCode)
                        return await resp.Content.ReadAsByteArrayAsync();
                }
                else
                {
                    // Export as ZIP archive (default)
                    var resp = await httpClient.GetAsync(
                        $"{pacsBaseUrl}/studies/{orthancStudyId}/archive");
                    if (resp.IsSuccessStatusCode)
                        return await resp.Content.ReadAsByteArrayAsync();
                }
            }
            catch (Exception ex)
            {
                // Log but don't throw - fall through to stub
                _logger.LogWarning(ex, "Orthanc export failed: {Message}", ex.Message);
            }
        }

        // Fallback: return empty byte array if PACS is not available
        return Array.Empty<byte>();
    }

    public async Task<DicomSendResultDto> SendDicomToRemoteAsync(DicomSendRequest request)
    {
        // Look up the remote server configuration
        var server = await _context.Set<RemotePacsServer>()
            .FirstOrDefaultAsync(s => s.Id == request.RemoteServerId && !s.IsDeleted && s.IsActive);

        if (server == null)
        {
            return new DicomSendResultDto
            {
                Success = false,
                Message = "Remote PACS server not found or is inactive",
                StudyId = request.StudyId,
                SentAt = DateTime.UtcNow,
            };
        }

        if (_pacsEnabled && !string.IsNullOrEmpty(_pacsBaseUrl))
        {
            var store = await _dicomPacsGateway.SendStudyAsync(request.StudyId, ToEndpoint(server));
            return new DicomSendResultDto
            {
                Success = store.Success,
                Message = store.Success
                    ? $"Đã C-STORE {store.InstanceCount} instance ({store.TotalBytes} bytes) tới {server.Name}"
                    : store.ErrorMessage,
                StudyId = request.StudyId,
                RemoteServerName = server.Name,
                SentAt = DateTime.UtcNow,
            };
        }

        // PACS not configured - return informational message
        return new DicomSendResultDto
        {
            Success = false,
            Message = "Orthanc PACS is not configured. Enable PACS in appsettings.json to use DICOM send.",
            StudyId = request.StudyId,
            RemoteServerName = server.Name,
            SentAt = DateTime.UtcNow,
        };
    }

    public async Task<RemoteDicomQueryResultDto> QueryRemotePacsAsync(
        Guid remoteServerId,
        RemoteDicomQueryRequestDto request)
    {
        var server = await _context.Set<RemotePacsServer>()
            .FirstOrDefaultAsync(s => s.Id == remoteServerId && !s.IsDeleted && s.IsActive)
            ?? throw new KeyNotFoundException("Remote PACS server not found or inactive");
        var result = await _dicomPacsGateway.QueryStudiesAsync(ToEndpoint(server), new DicomQueryCriteria(
            request.PatientId,
            request.PatientName,
            request.AccessionNumber,
            request.StudyInstanceUid,
            request.Modality,
            request.FromDate,
            request.ToDate,
            request.MaxResults));
        return new RemoteDicomQueryResultDto
        {
            Success = result.Success,
            WasTruncated = result.WasTruncated,
            ErrorMessage = result.ErrorMessage,
            Studies = result.Studies.Select(s => new RemoteDicomStudyDto
            {
                PatientId = s.PatientId,
                PatientName = s.PatientName,
                AccessionNumber = s.AccessionNumber,
                StudyInstanceUid = s.StudyInstanceUid,
                StudyDate = s.StudyDate,
                StudyDescription = s.StudyDescription,
                ModalitiesInStudy = s.ModalitiesInStudy,
                NumberOfStudyRelatedInstances = s.NumberOfStudyRelatedInstances,
            }).ToList(),
        };
    }

    public async Task<RemoteDicomRetrieveResultDto> RetrieveRemoteStudyAsync(
        Guid remoteServerId,
        RemoteDicomRetrieveRequestDto request)
    {
        var server = await _context.Set<RemotePacsServer>()
            .FirstOrDefaultAsync(s => s.Id == remoteServerId && !s.IsDeleted && s.IsActive)
            ?? throw new KeyNotFoundException("Remote PACS server not found or inactive");
        var result = await _dicomPacsGateway.RetrieveStudyAsync(
            ToEndpoint(server), request.StudyInstanceUid, request.RetrieveMethod);
        return new RemoteDicomRetrieveResultDto
        {
            Success = result.Success,
            StudyInstanceUid = result.StudyInstanceUid,
            InstanceCount = result.InstanceCount,
            TotalBytes = result.TotalBytes,
            RetrieveMethod = result.RetrieveMethod,
            ErrorMessage = result.ErrorMessage,
        };
    }

    public async Task<List<RemotePacsServerDto>> GetRemoteServersAsync()
    {
        try
        {
            var servers = await _context.Set<RemotePacsServer>()
                .Where(s => !s.IsDeleted)
                .OrderBy(s => s.Name)
                .ToListAsync();

            return servers.Select(s => new RemotePacsServerDto
            {
                Id = s.Id,
                Name = s.Name,
                AeTitle = s.AeTitle,
                Host = s.Host,
                Port = s.Port,
                CallingAeTitle = s.CallingAeTitle,
                UseTls = s.UseTls,
                UseStorageCommitment = s.UseStorageCommitment,
                TimeoutSeconds = s.TimeoutSeconds,
                Description = s.Description,
                IsActive = s.IsActive,
            }).ToList();
        }
        catch (Exception)
        {
            // Table may not exist yet
            return new List<RemotePacsServerDto>();
        }
    }

    public async Task<RemotePacsServerDto> SaveRemoteServerAsync(RemotePacsServerDto dto)
    {
        RemotePacsServer entity;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.Set<RemotePacsServer>().FindAsync(dto.Id.Value)
                ?? throw new KeyNotFoundException($"Remote PACS server {dto.Id} not found");
            entity.Name = dto.Name;
            entity.AeTitle = dto.AeTitle;
            entity.Host = dto.Host;
            entity.Port = dto.Port;
            entity.CallingAeTitle = dto.CallingAeTitle;
            entity.UseTls = dto.UseTls;
            entity.UseStorageCommitment = dto.UseStorageCommitment;
            entity.TimeoutSeconds = dto.TimeoutSeconds;
            entity.Description = dto.Description;
            entity.IsActive = dto.IsActive;
            _context.Set<RemotePacsServer>().Update(entity);
        }
        else
        {
            entity = new RemotePacsServer
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                AeTitle = dto.AeTitle,
                Host = dto.Host,
                Port = dto.Port,
                CallingAeTitle = dto.CallingAeTitle,
                UseTls = dto.UseTls,
                UseStorageCommitment = dto.UseStorageCommitment,
                TimeoutSeconds = dto.TimeoutSeconds,
                Description = dto.Description,
                IsActive = dto.IsActive,
            };
            await _context.Set<RemotePacsServer>().AddAsync(entity);
        }
        await _unitOfWork.SaveChangesAsync();

        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteRemoteServerAsync(Guid id)
    {
        var entity = await _context.Set<RemotePacsServer>().FindAsync(id);
        if (entity == null) return false;

        entity.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    #endregion
}
