import { apiClient } from './client';

// ---- Types ----

export interface ForensicCase {
  id: string;
  caseCode: string;
  patientName: string;
  patientCode: string;
  caseType: 'disability' | 'driver' | 'employment' | 'insurance' | 'court';
  requestDate: string;
  requestingOrganization: string;
  purpose: string;
  status: number; // 0=pending, 1=examining, 2=completed, 3=approved
  disabilityPercent?: number;
  conclusion?: string;
  examinerId?: string;
  examinerName?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface ForensicExamination {
  id: string;
  caseId: string;
  examType: string;
  findings: string;
  conclusion: string;
  examinerName: string;
  examDate: string;
}

export interface ForensicStats {
  totalCases: number;
  pendingCases: number;
  completedThisMonth: number;
  avgDisabilityPercent: number;
}

// ---- API Functions ----

export const searchCases = async (params?: {
  keyword?: string;
  status?: number;
  caseType?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<ForensicCase[]>('/forensic/cases', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch forensic cases');
    return [];
  }
};

export const getCaseById = async (id: string) => {
  const response = await apiClient.get<ForensicCase>(`/forensic/cases/${id}`);
  return response.data;
};

export const createCase = async (data: Partial<ForensicCase>) => {
  const response = await apiClient.post<ForensicCase>('/forensic/cases', data);
  return response.data;
};

export const updateCase = async (id: string, data: Partial<ForensicCase>) => {
  const response = await apiClient.put<ForensicCase>(`/forensic/cases/${id}`, data);
  return response.data;
};

export const getExaminations = async (caseId: string) => {
  try {
    const response = await apiClient.get<ForensicExamination[]>(`/forensic/cases/${caseId}/examinations`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch forensic examinations');
    return [];
  }
};

export const addExamination = async (caseId: string, data: Partial<ForensicExamination>) => {
  const response = await apiClient.post<ForensicExamination>(`/forensic/cases/${caseId}/examinations`, data);
  return response.data;
};

export const approveCase = async (id: string) => {
  const response = await apiClient.put(`/forensic/cases/${id}/approve`);
  return response.data;
};

export const getStats = async (): Promise<ForensicStats> => {
  try {
    const response = await apiClient.get<ForensicStats>('/forensic/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch forensic statistics');
    return { totalCases: 0, pendingCases: 0, completedThisMonth: 0, avgDisabilityPercent: 0 };
  }
};

export const printCertificate = async (id: string) => {
  const response = await apiClient.get(`/forensic/cases/${id}/print`, { responseType: 'blob' });
  return response.data;
};

export default {
  searchCases,
  getCaseById,
  createCase,
  updateCase,
  getExaminations,
  addExamination,
  approveCase,
  getStats,
  printCertificate,
};
