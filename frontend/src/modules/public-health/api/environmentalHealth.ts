import { apiClient } from '../../../services/apiClient';

// ---- Types ----

export interface WasteRecord {
  id: string;
  recordCode: string;
  recordDate: string;
  wasteType: 'infectious' | 'sharp' | 'pharmaceutical' | 'chemical' | 'radioactive' | 'general';
  quantity: number;
  unit: string;
  source: string;
  handlerName: string;
  disposalMethod: string;
  isCompliant: boolean;
  notes?: string;
}

export interface MonitoringRecord {
  id: string;
  recordCode: string;
  monitoringDate: string;
  monitoringType: 'air' | 'water' | 'surface' | 'noise' | 'radiation';
  location: string;
  parameter: string;
  value: number;
  unit: string;
  standardLimit: number;
  isCompliant: boolean;
  measuredBy: string;
  notes?: string;
}

export interface WasteStats {
  totalCollectedThisMonth: number;
  nonCompliantItems: number;
  infectiousWasteKg: number;
  generalWasteKg: number;
}

export interface MonitoringStats {
  totalMonitoringCount: number;
  nonCompliantCount: number;
  lastMonitoringDate?: string;
}

export interface BiosafetyStatus {
  level: number;
  isCompliant: boolean;
  lastAuditDate?: string;
  findings?: string;
}

// ---- API Functions ----

export const searchWasteRecords = async (params?: {
  keyword?: string;
  wasteType?: string;
  isCompliant?: boolean;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<WasteRecord[]>('/environmental-health/waste', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch waste records');
    return [];
  }
};

// BE CreateWasteRecordDto has no source/handlerName: map them onto departmentName/collectorName (the
// columns the list reads them back from) — they were silently dropped before.
const toWastePayload = (data: Partial<WasteRecord>) => ({
  ...data,
  departmentName: data.source,
  collectorName: data.handlerName,
});

export const createWasteRecord = async (data: Partial<WasteRecord>) => {
  const response = await apiClient.post<WasteRecord>('/environmental-health/waste', toWastePayload(data));
  return response.data;
};

export const updateWasteRecord = async (id: string, data: Partial<WasteRecord>) => {
  const response = await apiClient.put<WasteRecord>(`/environmental-health/waste/${id}`, toWastePayload(data));
  return response.data;
};

export const searchMonitoring = async (params?: {
  keyword?: string;
  monitoringType?: string;
  isCompliant?: boolean;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<(MonitoringRecord & { monitoringCode?: string; measuredValue?: number })[]>(
      '/environmental-health/monitoring', { params });
    // BE EnvironmentalMonitoringDto: monitoringCode / measuredValue
    return (response.data || []).map((m) => ({
      ...m,
      recordCode: m.recordCode ?? m.monitoringCode ?? '',
      value: m.value ?? m.measuredValue ?? 0,
    }));
  } catch {
    console.warn('Failed to fetch monitoring records');
    return [];
  }
};

export const createMonitoring = async (data: Partial<MonitoringRecord>) => {
  // BE expects measuredValue: `value` was dropped, stored as 0 and therefore always "compliant".
  // There is no parameter column — keep it in notes so it is not lost.
  const notes = [data.parameter ? `Thông số: ${data.parameter}` : '', data.notes ?? ''].filter(Boolean).join('\n');
  const response = await apiClient.post<MonitoringRecord>('/environmental-health/monitoring', {
    ...data,
    measuredValue: data.value,
    notes: notes || undefined,
  });
  return response.data;
};

export const getWasteStats = async (): Promise<WasteStats> => {
  try {
    const response = await apiClient.get<WasteStats>('/environmental-health/waste/stats');
    return response.data;
  } catch {
    console.warn('Failed to fetch waste statistics');
    return { totalCollectedThisMonth: 0, nonCompliantItems: 0, infectiousWasteKg: 0, generalWasteKg: 0 };
  }
};

export const getMonitoringStats = async (): Promise<MonitoringStats> => {
  try {
    const response = await apiClient.get<MonitoringStats>('/environmental-health/monitoring/stats');
    return response.data;
  } catch {
    console.warn('Failed to fetch monitoring statistics');
    return { totalMonitoringCount: 0, nonCompliantCount: 0 };
  }
};

export const getBiosafetyStatus = async (): Promise<BiosafetyStatus> => {
  try {
    const response = await apiClient.get<BiosafetyStatus & { overallStatus?: string }>('/environmental-health/biosafety-status');
    // BE BiosafetyStatusDto has overallStatus (good|warning|critical), no isCompliant → KPI always showed "Chưa đạt".
    const d = response.data;
    return { ...d, isCompliant: d?.isCompliant ?? d?.overallStatus === 'good' };
  } catch {
    console.warn('Failed to fetch biosafety status');
    return { level: 0, isCompliant: true };
  }
};

export default {
  searchWasteRecords,
  createWasteRecord,
  updateWasteRecord,
  searchMonitoring,
  createMonitoring,
  getWasteStats,
  getMonitoringStats,
  getBiosafetyStatus,
};
