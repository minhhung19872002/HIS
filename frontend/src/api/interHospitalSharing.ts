import { apiClient } from './client';

// ---- Types ----

export interface InterHospitalRequest {
  id: string;
  requestCode: string;
  requestType: 'drug_lookup' | 'ecpr' | 'patient_transfer' | 'consultation' | 'record_sharing';
  direction: 'incoming' | 'outgoing';
  urgency: 'normal' | 'urgent' | 'emergency';
  requestingHospital: string;
  respondingHospital: string;
  patientName?: string;
  patientCode?: string;
  subject: string;
  details: string;
  status: number; // 0=pending, 1=accepted, 2=in_progress, 3=completed, 4=rejected
  requestedAt: string;
  respondedAt?: string;
  completedAt?: string;
  requestedBy: string;
  respondedBy?: string;
  responseNotes?: string;
  avgResponseTimeMinutes?: number;
}

export interface InterHospitalStats {
  totalRequests: number;
  pendingRequests: number;
  completedToday: number;
  avgResponseTimeMinutes: number;
}

// ---- API Functions ----

export const searchRequests = async (params?: {
  keyword?: string;
  requestType?: string;
  direction?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<InterHospitalRequest[]>('/inter-hospital/requests', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch inter-hospital requests');
    return [];
  }
};

export const getById = async (id: string) => {
  const response = await apiClient.get<InterHospitalRequest>(`/inter-hospital/requests/${id}`);
  return response.data;
};

export const createRequest = async (data: Partial<InterHospitalRequest>) => {
  const response = await apiClient.post<InterHospitalRequest>('/inter-hospital/requests', data);
  return response.data;
};

export const respondToRequest = async (id: string, data: { status: number; responseNotes: string }) => {
  const response = await apiClient.put(`/inter-hospital/requests/${id}/respond`, data);
  return response.data;
};

export const getActiveRequests = async () => {
  try {
    const response = await apiClient.get<InterHospitalRequest[]>('/inter-hospital/active');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch active requests');
    return [];
  }
};

export const getStats = async (): Promise<InterHospitalStats> => {
  try {
    const response = await apiClient.get<InterHospitalStats>('/inter-hospital/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch inter-hospital statistics');
    return { totalRequests: 0, pendingRequests: 0, completedToday: 0, avgResponseTimeMinutes: 0 };
  }
};

export default {
  searchRequests,
  getById,
  createRequest,
  respondToRequest,
  getActiveRequests,
  getStats,
};
