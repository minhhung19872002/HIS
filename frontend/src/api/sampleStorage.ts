import { apiClient } from './client';

export interface SampleStorageRecord {
  id: string;
  sampleBarcode: string;
  labRequestId?: string;
  requestCode?: string;
  patientName?: string;
  patientCode?: string;
  sampleType: string;
  tubeColor: string;
  storageLocation: string; // e.g. "Freezer-A/Rack-2/Box-5/Pos-12"
  freezer?: string;
  rack?: string;
  box?: string;
  position?: string;
  temperature?: number;
  storageCondition: string; // room, refrigerator, frozen, deepFrozen
  storedAt: string;
  storedBy: string;
  retrievedAt?: string;
  retrievedBy?: string;
  expiryDate?: string;
  isExpired: boolean;
  status: number; // 0=Stored, 1=Retrieved, 2=Disposed, 3=Expired
  notes?: string;
}

export interface StorageLocation {
  freezer: string;
  rack: string;
  box: string;
  totalPositions: number;
  usedPositions: number;
  availablePositions: number;
}

export interface StorageAlert {
  id: string;
  type: string; // expiry, temperature, capacity
  message: string;
  severity: string; // warning, critical
  sampleBarcode?: string;
  location?: string;
  createdAt: string;
}

export const getSampleStorageRecords = async (params?: { keyword?: string; status?: number; location?: string }) => {
  const resp = await apiClient.get('/LISComplete/sample-storage', { params });
  return resp.data;
};

export const storeSample = async (data: { sampleBarcode: string; storageLocation: string; storageCondition: string; temperature?: number; notes?: string }) => {
  const resp = await apiClient.post('/LISComplete/sample-storage/store', data);
  return resp.data;
};

export const retrieveSample = async (id: string, data: { reason: string }) => {
  const resp = await apiClient.post(`/LISComplete/sample-storage/${id}/retrieve`, data);
  return resp.data;
};

export const disposeSample = async (id: string, data: { reason: string }) => {
  const resp = await apiClient.post(`/LISComplete/sample-storage/${id}/dispose`, data);
  return resp.data;
};

export const getStorageLocations = async () => {
  const resp = await apiClient.get('/LISComplete/sample-storage/locations');
  return resp.data;
};

export const getStorageAlerts = async () => {
  const resp = await apiClient.get('/LISComplete/sample-storage/alerts');
  return resp.data;
};

export const getSampleByBarcode = async (barcode: string) => {
  const resp = await apiClient.get(`/LISComplete/sample-storage/barcode/${barcode}`);
  return resp.data;
};
