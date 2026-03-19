using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IEndpointSecurityService
{
    // Devices
    Task<List<EndpointDeviceDto>> GetDevicesAsync(string? keyword = null, int? status = null);
    Task<EndpointDeviceDto?> GetDeviceByIdAsync(Guid id);
    Task<EndpointDeviceDto> RegisterDeviceAsync(RegisterDeviceDto dto);
    Task<EndpointDeviceDto?> UpdateDeviceStatusAsync(Guid id, UpdateDeviceStatusDto dto);
    Task<bool> DeleteDeviceAsync(Guid id);

    // Incidents
    Task<List<SecurityIncidentDto>> GetIncidentsAsync(int? severity = null, int? status = null, string? keyword = null);
    Task<SecurityIncidentDto?> GetIncidentByIdAsync(Guid id);
    Task<SecurityIncidentDto> CreateIncidentAsync(CreateIncidentDto dto);
    Task<SecurityIncidentDto?> UpdateIncidentAsync(Guid id, UpdateIncidentDto dto);
    Task<SecurityIncidentDto?> ResolveIncidentAsync(Guid id, string resolution, string? rootCause = null);

    // Software
    Task<List<InstalledSoftwareDto>> GetSoftwareInventoryAsync(Guid? deviceId = null, bool? authorized = null);
    Task<bool> FlagUnauthorizedSoftwareAsync(Guid softwareId, string? notes = null);

    // Dashboard
    Task<EndpointSecurityDashboardDto> GetDashboardAsync();
}
