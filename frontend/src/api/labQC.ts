import { apiClient } from './client';

export interface QCLot {
  id: string;
  lotNumber: string;
  testCode: string;
  testName: string;
  level: number; // 1=Low, 2=Normal, 3=High
  manufacturer: string;
  expiryDate: string;
  targetMean: number;
  targetSD: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
}

export interface QCResult {
  id: string;
  lotId: string;
  lotNumber: string;
  testCode: string;
  testName: string;
  level: number;
  value: number;
  mean: number;
  sd: number;
  zScore: number;
  westgardRule?: string;
  isViolation: boolean;
  analyzerId?: string;
  analyzerName?: string;
  runDate: string;
  operatorName: string;
  notes?: string;
}

export interface LeveyJenningsData {
  testCode: string;
  testName: string;
  level: number;
  mean: number;
  sd: number;
  unit: string;
  points: { date: string; value: number; zScore: number; violation?: string }[];
}

export interface QCReport {
  testCode: string;
  testName: string;
  totalRuns: number;
  violations: number;
  violationRate: number;
  lastRunDate: string;
  status: string;
}

export const getQCLots = async (params?: { testCode?: string; isActive?: boolean }) => {
  const resp = await apiClient.get('/LISComplete/qc/lots', { params });
  return resp.data;
};

export const createQCLot = async (data: Partial<QCLot>) => {
  const resp = await apiClient.post('/LISComplete/qc/lots', data);
  return resp.data;
};

export const updateQCLot = async (id: string, data: Partial<QCLot>) => {
  const resp = await apiClient.put(`/LISComplete/qc/lots/${id}`, data);
  return resp.data;
};

export const deleteQCLot = async (id: string) => {
  const resp = await apiClient.delete(`/LISComplete/qc/lots/${id}`);
  return resp.data;
};

export const runQC = async (data: { lotId: string; value: number; analyzerId?: string; notes?: string }) => {
  const resp = await apiClient.post('/LISComplete/qc/run', data);
  return resp.data;
};

export const getQCResults = async (params?: { lotId?: string; testCode?: string; fromDate?: string; toDate?: string }) => {
  const resp = await apiClient.get('/LISComplete/qc/results', { params });
  return resp.data;
};

export const getLeveyJenningsData = async (params: { testCode: string; level: number; fromDate?: string; toDate?: string }) => {
  const resp = await apiClient.get('/LISComplete/qc/levey-jennings', { params });
  return resp.data;
};

export const getQCReport = async (params?: { fromDate?: string; toDate?: string }) => {
  const resp = await apiClient.get('/LISComplete/reports/qc', { params });
  return resp.data;
};
