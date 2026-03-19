import client from './client';

export interface EndpointDeviceDto {
  id: string;
  hostname: string;
  ipAddress?: string;
  macAddress?: string;
  operatingSystem?: string;
  osVersion?: string;
  antivirusName?: string;
  antivirusStatus?: string;
  antivirusLastUpdate?: string;
  departmentName?: string;
  assignedUser?: string;
  status: number;
  statusText: string;
  lastSeenAt?: string;
  agentVersion?: string;
  isCompliant: boolean;
  complianceNotes?: string;
  createdAt: string;
}

export interface RegisterDeviceDto {
  hostname: string;
  ipAddress?: string;
  macAddress?: string;
  operatingSystem?: string;
  osVersion?: string;
  antivirusName?: string;
  antivirusStatus?: string;
  departmentName?: string;
  assignedUser?: string;
  agentVersion?: string;
}

export interface UpdateDeviceStatusDto {
  status: number;
  antivirusStatus?: string;
  antivirusLastUpdate?: string;
  agentVersion?: string;
  isCompliant?: boolean;
  complianceNotes?: string;
}

export interface SecurityIncidentDto {
  id: string;
  incidentCode: string;
  title: string;
  description?: string;
  severity: number;
  severityText: string;
  status: number;
  statusText: string;
  category?: string;
  deviceId?: string;
  deviceHostname?: string;
  affectedSystem?: string;
  reportedByName?: string;
  assignedToName?: string;
  resolution?: string;
  resolvedAt?: string;
  rootCause?: string;
  correctiveAction?: string;
  createdAt: string;
}

export interface CreateIncidentDto {
  title: string;
  description?: string;
  severity: number;
  category?: string;
  deviceId?: string;
  affectedSystem?: string;
  reportedByName?: string;
}

export interface UpdateIncidentDto {
  status?: number;
  assignedToName?: string;
  resolution?: string;
  rootCause?: string;
  correctiveAction?: string;
}

export interface InstalledSoftwareDto {
  id: string;
  deviceId: string;
  softwareName: string;
  version?: string;
  publisher?: string;
  installDate?: string;
  isAuthorized: boolean;
  category?: string;
  notes?: string;
}

export interface EndpointSecurityDashboardDto {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  warningDevices: number;
  criticalDevices: number;
  compliantDevices: number;
  compliancePercent: number;
  openIncidents: number;
  criticalIncidents: number;
  totalSoftware: number;
  unauthorizedSoftware: number;
  incidentsByCategory: { category: string; count: number }[];
  devicesByStatus: { status: string; count: number }[];
}

export const getDevices = (keyword?: string, status?: number) => {
  const params = new URLSearchParams();
  if (keyword) params.append('keyword', keyword);
  if (status !== undefined) params.append('status', String(status));
  return client.get<EndpointDeviceDto[]>(`/endpoint-security/devices?${params}`).then(r => r.data);
};

export const getDevice = (id: string) =>
  client.get<EndpointDeviceDto>(`/endpoint-security/devices/${id}`).then(r => r.data);

export const registerDevice = (dto: RegisterDeviceDto) =>
  client.post<EndpointDeviceDto>('/endpoint-security/devices', dto).then(r => r.data);

export const updateDeviceStatus = (id: string, dto: UpdateDeviceStatusDto) =>
  client.put<EndpointDeviceDto>(`/endpoint-security/devices/${id}/status`, dto).then(r => r.data);

export const deleteDevice = (id: string) =>
  client.delete(`/endpoint-security/devices/${id}`);

export const getIncidents = (severity?: number, status?: number, keyword?: string) => {
  const params = new URLSearchParams();
  if (severity !== undefined) params.append('severity', String(severity));
  if (status !== undefined) params.append('status', String(status));
  if (keyword) params.append('keyword', keyword);
  return client.get<SecurityIncidentDto[]>(`/endpoint-security/incidents?${params}`).then(r => r.data);
};

export const getIncident = (id: string) =>
  client.get<SecurityIncidentDto>(`/endpoint-security/incidents/${id}`).then(r => r.data);

export const createIncident = (dto: CreateIncidentDto) =>
  client.post<SecurityIncidentDto>('/endpoint-security/incidents', dto).then(r => r.data);

export const updateIncident = (id: string, dto: UpdateIncidentDto) =>
  client.put<SecurityIncidentDto>(`/endpoint-security/incidents/${id}`, dto).then(r => r.data);

export const resolveIncident = (id: string, resolution: string, rootCause?: string) =>
  client.post<SecurityIncidentDto>(`/endpoint-security/incidents/${id}/resolve`, { resolution, rootCause }).then(r => r.data);

export const getSoftwareInventory = (deviceId?: string, authorized?: boolean) => {
  const params = new URLSearchParams();
  if (deviceId) params.append('deviceId', deviceId);
  if (authorized !== undefined) params.append('authorized', String(authorized));
  return client.get<InstalledSoftwareDto[]>(`/endpoint-security/software?${params}`).then(r => r.data);
};

export const flagUnauthorized = (id: string, notes?: string) =>
  client.post(`/endpoint-security/software/${id}/flag-unauthorized`, { notes });

export const getSecurityDashboard = () =>
  client.get<EndpointSecurityDashboardDto>('/endpoint-security/dashboard').then(r => r.data);
