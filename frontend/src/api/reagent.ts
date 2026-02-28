import { apiClient } from './client';

export interface Reagent {
  id: string;
  code: string;
  name: string;
  manufacturer: string;
  lotNumber: string;
  catalogNumber?: string;
  testCodes: string[];
  testNames: string[];
  analyzerId?: string;
  analyzerName?: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  usedQuantity: number;
  remainingQuantity: number;
  expiryDate: string;
  isExpired: boolean;
  isLowStock: boolean;
  storageCondition: string;
  receivedDate: string;
  openedDate?: string;
  stabilityDays?: number;
  expiryAfterOpen?: string;
  status: number; // 0=Available, 1=InUse, 2=LowStock, 3=Expired, 4=Disposed
  notes?: string;
}

export interface ReagentUsage {
  id: string;
  reagentId: string;
  reagentName: string;
  lotNumber: string;
  testCode: string;
  testName: string;
  analyzerId: string;
  analyzerName: string;
  quantityUsed: number;
  usageDate: string;
  operatorName: string;
}

export interface ReagentAlert {
  id: string;
  type: string; // lowStock, expiringSoon, expired
  reagentName: string;
  lotNumber: string;
  message: string;
  severity: string;
  createdAt: string;
}

export const getReagents = async (params?: { keyword?: string; status?: number; analyzerId?: string }) => {
  const resp = await apiClient.get('/LISComplete/reagents', { params });
  return resp.data;
};

export const getReagentById = async (id: string) => {
  const resp = await apiClient.get(`/LISComplete/reagents/${id}`);
  return resp.data;
};

export const createReagent = async (data: Partial<Reagent>) => {
  const resp = await apiClient.post('/LISComplete/reagents', data);
  return resp.data;
};

export const updateReagent = async (id: string, data: Partial<Reagent>) => {
  const resp = await apiClient.put(`/LISComplete/reagents/${id}`, data);
  return resp.data;
};

export const deleteReagent = async (id: string) => {
  const resp = await apiClient.delete(`/LISComplete/reagents/${id}`);
  return resp.data;
};

export const recordReagentUsage = async (data: { reagentId: string; testCode: string; analyzerId: string; quantityUsed: number }) => {
  const resp = await apiClient.post('/LISComplete/reagents/usage', data);
  return resp.data;
};

export const getReagentUsageHistory = async (params?: { reagentId?: string; fromDate?: string; toDate?: string }) => {
  const resp = await apiClient.get('/LISComplete/reagents/usage', { params });
  return resp.data;
};

export const getReagentAlerts = async () => {
  const resp = await apiClient.get('/LISComplete/reagents/alerts');
  return resp.data;
};

export const getReagentInventory = async () => {
  const resp = await apiClient.get('/LISComplete/reagents/inventory');
  return resp.data;
};
