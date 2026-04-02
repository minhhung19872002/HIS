import { apiClient } from './client';

// ---- Types ----

export interface TraumaCase {
  id: string;
  caseCode: string;
  patientName: string;
  patientCode: string;
  injuryDate: string;
  admissionDate: string;
  injuryType: string;
  injuryMechanism: string;
  triageCategory: 'red' | 'yellow' | 'green' | 'black';
  issScore: number;
  rtsScore: number;
  gcsScore: number;
  status: number; // 0=admitted, 1=icu, 2=ward, 3=discharged, 4=deceased
  outcome: 'recovered' | 'improved' | 'unchanged' | 'worsened' | 'deceased' | 'pending';
  lengthOfStay?: number;
  surgeryRequired: boolean;
  icuDays?: number;
  ventilatorDays?: number;
  attendingDoctor: string;
  notes?: string;
}

export interface TraumaStats {
  totalCasesThisMonth: number;
  mortalityRate: number;
  avgIssScore: number;
  avgLengthOfStay: number;
}

export interface TraumaOutcomeReport {
  totalCases: number;
  outcomeBreakdown: { outcome: string; count: number; percentage: number }[];
  triageBreakdown: { category: string; count: number }[];
  injuryTypeBreakdown: { type: string; count: number }[];
}

// ---- API Functions ----

export const searchCases = async (params?: {
  keyword?: string;
  status?: number;
  triageCategory?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<TraumaCase[]>('/trauma-registry/cases', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch trauma cases');
    return [];
  }
};

export const getById = async (id: string) => {
  const response = await apiClient.get<TraumaCase>(`/trauma-registry/cases/${id}`);
  return response.data;
};

export const createCase = async (data: Partial<TraumaCase>) => {
  const response = await apiClient.post<TraumaCase>('/trauma-registry/cases', data);
  return response.data;
};

export const updateCase = async (id: string, data: Partial<TraumaCase>) => {
  const response = await apiClient.put<TraumaCase>(`/trauma-registry/cases/${id}`, data);
  return response.data;
};

export const getStats = async (): Promise<TraumaStats> => {
  try {
    const response = await apiClient.get<TraumaStats>('/trauma-registry/stats');
    return response.data;
  } catch {
    console.warn('Failed to fetch trauma statistics');
    return { totalCasesThisMonth: 0, mortalityRate: 0, avgIssScore: 0, avgLengthOfStay: 0 };
  }
};

export const getOutcomeReport = async (params?: {
  fromDate?: string;
  toDate?: string;
}): Promise<TraumaOutcomeReport> => {
  try {
    const response = await apiClient.get<TraumaOutcomeReport>('/trauma-registry/outcome-report', { params });
    return response.data;
  } catch {
    console.warn('Failed to fetch trauma outcome report');
    return { totalCases: 0, outcomeBreakdown: [], triageBreakdown: [], injuryTypeBreakdown: [] };
  }
};

export default {
  searchCases,
  getById,
  createCase,
  updateCase,
  getStats,
  getOutcomeReport,
};
