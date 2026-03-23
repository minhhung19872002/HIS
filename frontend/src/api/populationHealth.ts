import { apiClient } from './client';

// ---- Types ----

export interface PopulationRecord {
  id: string;
  recordCode: string;
  fullName: string;
  dateOfBirth: string;
  gender: number;
  address: string;
  recordType: 'birth' | 'family_planning' | 'elderly_care' | 'prenatal' | 'child_health' | 'other';
  status: number; // 0=active, 1=closed, 2=transferred
  familyCode?: string;
  healthInsuranceNumber?: string;
  lastVisitDate?: string;
  managingUnit: string;
  notes?: string;
}

export interface PopulationStats {
  totalRecords: number;
  familyPlanningActive: number;
  elderlyCareCount: number;
  birthReportsThisMonth: number;
}

export interface ElderlyStats {
  total: number;
  chronicDisease: number;
  livingAlone: number;
  needingCare: number;
}

// ---- API Functions ----

export const searchRecords = async (params?: {
  keyword?: string;
  recordType?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<PopulationRecord[]>('/population-health/records', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch population health records');
    return [];
  }
};

export const createRecord = async (data: Partial<PopulationRecord>) => {
  const response = await apiClient.post<PopulationRecord>('/population-health/records', data);
  return response.data;
};

export const updateRecord = async (id: string, data: Partial<PopulationRecord>) => {
  const response = await apiClient.put<PopulationRecord>(`/population-health/records/${id}`, data);
  return response.data;
};

export const getStats = async (): Promise<PopulationStats> => {
  try {
    const response = await apiClient.get<PopulationStats>('/population-health/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch population health statistics');
    return { totalRecords: 0, familyPlanningActive: 0, elderlyCareCount: 0, birthReportsThisMonth: 0 };
  }
};

export const getElderlyStats = async (): Promise<ElderlyStats> => {
  try {
    const response = await apiClient.get<ElderlyStats>('/population-health/elderly-statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch elderly statistics');
    return { total: 0, chronicDisease: 0, livingAlone: 0, needingCare: 0 };
  }
};

export default {
  searchRecords,
  createRecord,
  updateRecord,
  getStats,
  getElderlyStats,
};
