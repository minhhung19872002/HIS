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

                if (format == "dicomdir")
                {
                    // Export as DICOMDIR media
                    var resp = await httpClient.PostAsync(
                        $"{pacsBaseUrl}/studies/{studyId}/media",
                        new StringContent("", System.Text.Encoding.UTF8));
                    if (resp.IsSuccessStatusCode)
                        return await resp.Content.ReadAsByteArrayAsync();
                }
                else
                {
                    // Export as ZIP archive (default)
                    var resp = await httpClient.PostAsync(
                        $"{pacsBaseUrl}/studies/{studyId}/archive",
                        new StringContent("", System.Text.Encoding.UTF8));
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

        // Try to send via Orthanc C-STORE (Orthanc acts as SCU, sending to remote SCP)
        if (_pacsEnabled && !string.IsNullOrEmpty(_pacsBaseUrl))
        {
            try
            {
                var pacsBaseUrl = _pacsBaseUrl.TrimEnd('/');
                var pacsUser = _configuration["PACS:Username"] ?? "admin";
                var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromMinutes(10);
                var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                // First, ensure the remote modality is registered in Orthanc
                var modalityName = $"remote_{server.Id:N}".Substring(0, Math.Min(32, $"remote_{server.Id:N}".Length));
                var modalityConfig = JsonSerializer.Serialize(new
                {
                    AET = server.AeTitle,
                    Host = server.Host,
                    Port = server.Port,
                });
                var putResp = await httpClient.PutAsync(
                    $"{pacsBaseUrl}/modalities/{modalityName}",
                    new StringContent(modalityConfig, System.Text.Encoding.UTF8, "application/json"));

                if (!putResp.IsSuccessStatusCode)
                {
                    return new DicomSendResultDto
                    {
                        Success = false,
                        Message = $"Failed to register remote modality in Orthanc: {putResp.StatusCode}",
                        StudyId = request.StudyId,
                        RemoteServerName = server.Name,
                        SentAt = DateTime.UtcNow,
                    };
                }

                // Send the study via C-STORE
                var storeBody = JsonSerializer.Serialize(new { Resources = new[] { request.StudyId } });
                var storeResp = await httpClient.PostAsync(
                    $"{pacsBaseUrl}/modalities/{modalityName}/store",
                    new StringContent(storeBody, System.Text.Encoding.UTF8, "application/json"));

                return new DicomSendResultDto
                {
                    Success = storeResp.IsSuccessStatusCode,
                    Message = storeResp.IsSuccessStatusCode
                        ? $"Study sent successfully to {server.Name} ({server.AeTitle}@{server.Host}:{server.Port})"
                        : $"C-STORE failed: {storeResp.StatusCode}",
                    StudyId = request.StudyId,
                    RemoteServerName = server.Name,
                    SentAt = DateTime.UtcNow,
                };
            }
            catch (Exception ex)
            {
                return new DicomSendResultDto
                {
                    Success = false,
                    Message = $"DICOM send error: {ex.Message}",
                    StudyId = request.StudyId,
                    RemoteServerName = server.Name,
                    SentAt = DateTime.UtcNow,
                };
            }
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
