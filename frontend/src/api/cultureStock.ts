import { apiClient } from './client';

export interface CultureStock {
  id: string;
  stockCode: string;
  sourceCultureId?: string;
  organismCode: string;
  organismName: string;
  scientificName?: string;
  gramStain?: string;
  sourceType?: string;
  sourceDescription?: string;
  freezerCode?: string;
  rackCode?: string;
  boxCode?: string;
  position?: string;
  locationDisplay: string;
  preservationMethod: string;
  storageTemperature?: string;
  passageNumber: number;
  aliquotCount: number;
  remainingAliquots: number;
  preservationDate: string;
  expiryDate?: string;
  lastViabilityCheck?: string;
  lastViabilityResult?: boolean;
  status: number; // 0=Active, 1=LowStock, 2=Expired, 3=Depleted, 4=Discarded
  preservedBy?: string;
  notes?: string;
  logCount: number;
}

export interface CultureStockLog {
  id: string;
  action: string;
  aliquotsTaken?: number;
  purpose?: string;
  result?: string;
  performedBy?: string;
  performedAt: string;
  notes?: string;
}

export interface CultureStockStats {
  totalStocks: number;
  activeCount: number;
  lowStockCount: number;
  expiredCount: number;
  depletedCount: number;
  expiringIn30Days: number;
  needViabilityCheck: number;
  topOrganisms: { organismName: string; stockCount: number; totalAliquots: number }[];
}

export const getCultureStocks = async (params?: Record<string, unknown>): Promise<CultureStock[]> => {
  try {
    const resp = await apiClient.get('/culture-stock', { params });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('Failed to load culture stocks');
    return [];
  }
};

export const getCultureStockById = async (id: string): Promise<CultureStock | null> => {
  try {
    const resp = await apiClient.get(`/culture-stock/${id}`);
    return resp.data;
  } catch {
    console.warn('Failed to load culture stock detail');
    return null;
  }
};

export const getStockLogs = async (id: string): Promise<CultureStockLog[]> => {
  try {
    const resp = await apiClient.get(`/culture-stock/${id}/logs`);
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('Failed to load stock logs');
    return [];
  }
};

export const createCultureStock = async (data: Record<string, unknown>): Promise<CultureStock> => {
  const resp = await apiClient.post('/culture-stock', data);
  return resp.data;
};

export const updateCultureStock = async (id: string, data: Record<string, unknown>): Promise<CultureStock> => {
  const resp = await apiClient.put(`/culture-stock/${id}`, data);
  return resp.data;
};

export const retrieveAliquot = async (id: string, data: { aliquotCount: number; purpose?: string; notes?: string }): Promise<CultureStock> => {
  const resp = await apiClient.post(`/culture-stock/${id}/retrieve`, data);
  return resp.data;
};

export const recordViabilityCheck = async (id: string, data: { isViable: boolean; method?: string; notes?: string }): Promise<CultureStock> => {
  const resp = await apiClient.post(`/culture-stock/${id}/viability-check`, data);
  return resp.data;
};

export const subcultureStock = async (id: string, data: Record<string, unknown>): Promise<CultureStock> => {
  const resp = await apiClient.post(`/culture-stock/${id}/subculture`, data);
  return resp.data;
};

export const discardStock = async (id: string, reason?: string): Promise<void> => {
  await apiClient.delete(`/culture-stock/${id}`, { params: { reason } });
};

export const getCultureStockStats = async (): Promise<CultureStockStats> => {
  try {
    const resp = await apiClient.get('/culture-stock/statistics');
    return resp.data;
  } catch {
    console.warn('Failed to load culture stock stats');
    return { totalStocks: 0, activeCount: 0, lowStockCount: 0, expiredCount: 0, depletedCount: 0, expiringIn30Days: 0, needViabilityCheck: 0, topOrganisms: [] };
  }
};

export const getFreezerCodes = async (): Promise<string[]> => {
  try {
    const resp = await apiClient.get('/culture-stock/freezer-codes');
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    return [];
  }
};
