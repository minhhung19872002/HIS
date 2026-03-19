using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class EndpointSecurityService : IEndpointSecurityService
{
    private readonly HISDbContext _context;
    public EndpointSecurityService(HISDbContext context) => _context = context;

    public async Task<List<EndpointDeviceDto>> GetDevicesAsync(string? keyword = null, int? status = null)
    {
        var query = _context.EndpointDevices.Where(d => d.IsActive).AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(d => d.Hostname.Contains(keyword) || (d.IpAddress != null && d.IpAddress.Contains(keyword)) || (d.AssignedUser != null && d.AssignedUser.Contains(keyword)));
        if (status.HasValue)
            query = query.Where(d => d.Status == status.Value);
        return await query.OrderByDescending(d => d.LastSeenAt ?? d.CreatedAt).Select(d => new EndpointDeviceDto
        {
            Id = d.Id, Hostname = d.Hostname, IpAddress = d.IpAddress, MacAddress = d.MacAddress,
            OperatingSystem = d.OperatingSystem, OsVersion = d.OsVersion, AntivirusName = d.AntivirusName,
            AntivirusStatus = d.AntivirusStatus, AntivirusLastUpdate = d.AntivirusLastUpdate,
            DepartmentName = d.DepartmentName, AssignedUser = d.AssignedUser, Status = d.Status,
            LastSeenAt = d.LastSeenAt, AgentVersion = d.AgentVersion, IsCompliant = d.IsCompliant,
            ComplianceNotes = d.ComplianceNotes, CreatedAt = d.CreatedAt
        }).ToListAsync();
    }

    public async Task<EndpointDeviceDto?> GetDeviceByIdAsync(Guid id)
    {
        var d = await _context.EndpointDevices.FindAsync(id);
        if (d == null || !d.IsActive) return null;
        return new EndpointDeviceDto
        {
            Id = d.Id, Hostname = d.Hostname, IpAddress = d.IpAddress, MacAddress = d.MacAddress,
            OperatingSystem = d.OperatingSystem, OsVersion = d.OsVersion, AntivirusName = d.AntivirusName,
            AntivirusStatus = d.AntivirusStatus, AntivirusLastUpdate = d.AntivirusLastUpdate,
            DepartmentName = d.DepartmentName, AssignedUser = d.AssignedUser, Status = d.Status,
            LastSeenAt = d.LastSeenAt, AgentVersion = d.AgentVersion, IsCompliant = d.IsCompliant,
            ComplianceNotes = d.ComplianceNotes, CreatedAt = d.CreatedAt
        };
    }

    public async Task<EndpointDeviceDto> RegisterDeviceAsync(RegisterDeviceDto dto)
    {
        var device = new EndpointDevice
        {
            Id = Guid.NewGuid(), Hostname = dto.Hostname, IpAddress = dto.IpAddress, MacAddress = dto.MacAddress,
            OperatingSystem = dto.OperatingSystem, OsVersion = dto.OsVersion, AntivirusName = dto.AntivirusName,
            AntivirusStatus = dto.AntivirusStatus, DepartmentName = dto.DepartmentName, AssignedUser = dto.AssignedUser,
            AgentVersion = dto.AgentVersion, Status = 1, IsCompliant = true, LastSeenAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow
        };
        _context.EndpointDevices.Add(device);
        await _context.SaveChangesAsync();
        return (await GetDeviceByIdAsync(device.Id))!;
    }

    public async Task<EndpointDeviceDto?> UpdateDeviceStatusAsync(Guid id, UpdateDeviceStatusDto dto)
    {
        var device = await _context.EndpointDevices.FindAsync(id);
        if (device == null) return null;
        device.Status = dto.Status;
        if (dto.AntivirusStatus != null) device.AntivirusStatus = dto.AntivirusStatus;
        if (dto.AntivirusLastUpdate.HasValue) device.AntivirusLastUpdate = dto.AntivirusLastUpdate;
        if (dto.AgentVersion != null) device.AgentVersion = dto.AgentVersion;
        if (dto.IsCompliant.HasValue) device.IsCompliant = dto.IsCompliant.Value;
        if (dto.ComplianceNotes != null) device.ComplianceNotes = dto.ComplianceNotes;
        device.LastSeenAt = DateTime.UtcNow;
        device.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await GetDeviceByIdAsync(id);
    }

    public async Task<bool> DeleteDeviceAsync(Guid id)
    {
        var device = await _context.EndpointDevices.FindAsync(id);
        if (device == null) return false;
        device.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SecurityIncidentDto>> GetIncidentsAsync(int? severity = null, int? status = null, string? keyword = null)
    {
        var query = _context.SecurityIncidents.AsQueryable();
        if (severity.HasValue) query = query.Where(i => i.Severity == severity.Value);
        if (status.HasValue) query = query.Where(i => i.Status == status.Value);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(i => i.Title.Contains(keyword) || (i.Description != null && i.Description.Contains(keyword)));
        return await query.OrderByDescending(i => i.CreatedAt).Select(i => new SecurityIncidentDto
        {
            Id = i.Id, IncidentCode = i.IncidentCode, Title = i.Title, Description = i.Description,
            Severity = i.Severity, Status = i.Status, Category = i.Category, DeviceId = i.DeviceId,
            DeviceHostname = i.DeviceHostname, AffectedSystem = i.AffectedSystem,
            ReportedByName = i.ReportedByName, AssignedToName = i.AssignedToName,
            Resolution = i.Resolution, ResolvedAt = i.ResolvedAt, RootCause = i.RootCause,
            CorrectiveAction = i.CorrectiveAction, CreatedAt = i.CreatedAt
        }).ToListAsync();
    }

    public async Task<SecurityIncidentDto?> GetIncidentByIdAsync(Guid id)
    {
        var i = await _context.SecurityIncidents.FindAsync(id);
        if (i == null) return null;
        return new SecurityIncidentDto
        {
            Id = i.Id, IncidentCode = i.IncidentCode, Title = i.Title, Description = i.Description,
            Severity = i.Severity, Status = i.Status, Category = i.Category, DeviceId = i.DeviceId,
            DeviceHostname = i.DeviceHostname, AffectedSystem = i.AffectedSystem,
            ReportedByName = i.ReportedByName, AssignedToName = i.AssignedToName,
            Resolution = i.Resolution, ResolvedAt = i.ResolvedAt, RootCause = i.RootCause,
            CorrectiveAction = i.CorrectiveAction, CreatedAt = i.CreatedAt
        };
    }

    public async Task<SecurityIncidentDto> CreateIncidentAsync(CreateIncidentDto dto)
    {
        var incident = new SecurityIncident
        {
            Id = Guid.NewGuid(), IncidentCode = $"INC-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}",
            Title = dto.Title, Description = dto.Description, Severity = dto.Severity, Status = 0,
            Category = dto.Category, DeviceId = dto.DeviceId, AffectedSystem = dto.AffectedSystem,
            ReportedByName = dto.ReportedByName, CreatedAt = DateTime.UtcNow
        };
        if (dto.DeviceId.HasValue)
        {
            var device = await _context.EndpointDevices.FindAsync(dto.DeviceId.Value);
            if (device != null) incident.DeviceHostname = device.Hostname;
        }
        _context.SecurityIncidents.Add(incident);
        await _context.SaveChangesAsync();
        return (await GetIncidentByIdAsync(incident.Id))!;
    }

    public async Task<SecurityIncidentDto?> UpdateIncidentAsync(Guid id, UpdateIncidentDto dto)
    {
        var incident = await _context.SecurityIncidents.FindAsync(id);
        if (incident == null) return null;
        if (dto.Status.HasValue) incident.Status = dto.Status.Value;
        if (dto.AssignedToName != null) incident.AssignedToName = dto.AssignedToName;
        if (dto.AssignedToId.HasValue) incident.AssignedToId = dto.AssignedToId;
        if (dto.Resolution != null) incident.Resolution = dto.Resolution;
        if (dto.RootCause != null) incident.RootCause = dto.RootCause;
        if (dto.CorrectiveAction != null) incident.CorrectiveAction = dto.CorrectiveAction;
        if (dto.Status == 2) incident.ContainedAt = DateTime.UtcNow;
        incident.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await GetIncidentByIdAsync(id);
    }

    public async Task<SecurityIncidentDto?> ResolveIncidentAsync(Guid id, string resolution, string? rootCause = null)
    {
        var incident = await _context.SecurityIncidents.FindAsync(id);
        if (incident == null) return null;
        incident.Status = 3;
        incident.Resolution = resolution;
        incident.RootCause = rootCause;
        incident.ResolvedAt = DateTime.UtcNow;
        incident.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await GetIncidentByIdAsync(id);
    }

    public async Task<List<InstalledSoftwareDto>> GetSoftwareInventoryAsync(Guid? deviceId = null, bool? authorized = null)
    {
        var query = _context.InstalledSoftwareItems.AsQueryable();
        if (deviceId.HasValue) query = query.Where(s => s.DeviceId == deviceId.Value);
        if (authorized.HasValue) query = query.Where(s => s.IsAuthorized == authorized.Value);
        return await query.OrderBy(s => s.SoftwareName).Select(s => new InstalledSoftwareDto
        {
            Id = s.Id, DeviceId = s.DeviceId, SoftwareName = s.SoftwareName, Version = s.Version,
            Publisher = s.Publisher, InstallDate = s.InstallDate, IsAuthorized = s.IsAuthorized,
            Category = s.Category, Notes = s.Notes
        }).ToListAsync();
    }

    public async Task<bool> FlagUnauthorizedSoftwareAsync(Guid softwareId, string? notes = null)
    {
        var sw = await _context.InstalledSoftwareItems.FindAsync(softwareId);
        if (sw == null) return false;
        sw.IsAuthorized = false;
        if (notes != null) sw.Notes = notes;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<EndpointSecurityDashboardDto> GetDashboardAsync()
    {
        var devices = await _context.EndpointDevices.Where(d => d.IsActive).ToListAsync();
        var incidents = await _context.SecurityIncidents.Where(i => i.Status < 4).ToListAsync();
        var totalSw = await _context.InstalledSoftwareItems.CountAsync();
        var unauthorizedSw = await _context.InstalledSoftwareItems.CountAsync(s => !s.IsAuthorized);

        return new EndpointSecurityDashboardDto
        {
            TotalDevices = devices.Count,
            OnlineDevices = devices.Count(d => d.Status == 1),
            OfflineDevices = devices.Count(d => d.Status == 0),
            WarningDevices = devices.Count(d => d.Status == 2),
            CriticalDevices = devices.Count(d => d.Status == 3),
            CompliantDevices = devices.Count(d => d.IsCompliant),
            CompliancePercent = devices.Count > 0 ? Math.Round((decimal)devices.Count(d => d.IsCompliant) / devices.Count * 100, 1) : 100,
            OpenIncidents = incidents.Count(i => i.Status < 3),
            CriticalIncidents = incidents.Count(i => i.Severity == 1),
            TotalSoftware = totalSw,
            UnauthorizedSoftware = unauthorizedSw,
            IncidentsByCategory = incidents.GroupBy(i => i.Category ?? "Other").Select(g => new IncidentByCategoryDto { Category = g.Key, Count = g.Count() }).ToList(),
            DevicesByStatus = new List<DeviceByStatusDto>
            {
                new() { Status = "Online", Count = devices.Count(d => d.Status == 1) },
                new() { Status = "Offline", Count = devices.Count(d => d.Status == 0) },
                new() { Status = "Warning", Count = devices.Count(d => d.Status == 2) },
                new() { Status = "Critical", Count = devices.Count(d => d.Status == 3) }
            }
        };
    }
}
