import { apiClient } from './client';

// ---- Types ----

export interface PathologyRequest {
  id: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  requestDate: string;
  specimenType: 'biopsy' | 'cytology' | 'pap' | 'frozenSection';
  specimenSite: string;
  clinicalDiagnosis: string;
  requestingDoctor: string;
  status: number; // 0=pending, 1=grossing, 2=processing, 3=completed, 4=verified
  priority: 'normal' | 'urgent';
  departmentName?: string;
  patientId?: string;
  gender?: number;
  dateOfBirth?: string;
}

export interface PathologyResult {
  id: string;
  requestId: string;
  grossDescription: string;
  microscopicDescription: string;
  diagnosis: string;
  icdCode: string;
  stainingMethods: string[];
  slideCount: number;
  blockCount: number;
  specialStains: string;
  immunohistochemistry: string;
  molecularTests: string;
  pathologist: string;
  verifiedBy: string;
  verifiedAt: string;
  images: string[];
}

export interface PathologyStats {
  totalRequests: number;
  pendingCount: number;
  completedCount: number;
  avgTurnaroundDays: number;
  specimenTypeBreakdown: { type: string; count: number }[];
}

export interface SpecimenType {
  code: string;
  name: string;
}

// ---- API Functions ----

export const getPathologyRequests = async (params?: {
  keyword?: string;
  status?: number;
  specimenType?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<PathologyRequest[]>('/pathology/requests', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch pathology requests');
    return [];
  }
};

export const getPathologyRequestById = async (id: string) => {
  const response = await apiClient.get<PathologyRequest & { result?: PathologyResult }>(`/pathology/requests/${id}`);
  return response.data;
};

export const createPathologyResult = async (data: Partial<PathologyResult>) => {
  const response = await apiClient.post<PathologyResult>('/pathology/results', data);
  return response.data;
};

export const updatePathologyResult = async (id: string, data: Partial<PathologyResult>) => {
  const response = await apiClient.put<PathologyResult>(`/pathology/results/${id}`, data);
  return response.data;
};

export const getPathologyStatistics = async (): Promise<PathologyStats> => {
  try {
    const response = await apiClient.get<PathologyStats>('/pathology/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch pathology statistics');
    return {
      totalRequests: 0,
      pendingCount: 0,
      completedCount: 0,
      avgTurnaroundDays: 0,
      specimenTypeBreakdown: [],
    };
  }
};

export const getSpecimenTypes = async (): Promise<SpecimenType[]> => {
  try {
    const response = await apiClient.get<SpecimenType[]>('/pathology/specimen-types');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch specimen types');
    return [
      { code: 'biopsy', name: 'Sinh thiết' },
      { code: 'cytology', name: 'Tế bào học' },
      { code: 'pap', name: 'Pap smear' },
      { code: 'frozenSection', name: 'Cắt lạnh' },
    ];
  }
};

export const printPathologyReport = async (id: string) => {
  const response = await apiClient.get(`/pathology/results/${id}/print`, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  getPathologyRequests,
  getPathologyRequestById,
  createPathologyResult,
  updatePathologyResult,
  getPathologyStatistics,
  getSpecimenTypes,
  printPathologyReport,
};
