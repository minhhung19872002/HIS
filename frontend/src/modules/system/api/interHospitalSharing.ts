import { apiClient } from '../../../services/apiClient';

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

// BE CreateInterHospitalRequestDto has receivingFacility/requestingFacility/requestDetails — the FE names
// (respondingHospital/subject/details) were silently dropped, saving requests with no destination or content.
export const createRequest = async (data: Partial<InterHospitalRequest>) => {
  const requestDetails = [data.subject, data.details].filter(Boolean).join('\n');
  const response = await apiClient.post<InterHospitalRequest>('/inter-hospital/requests', {
    requestType: data.requestType,
    // QA-R3: BE now stores the direction (was always shown as outgoing → incoming requests had no "Xử lý")
    direction: data.direction ?? 'outgoing',
    urgency: data.urgency,
    requestingFacility: data.requestingHospital,
    receivingFacility: data.respondingHospital,
    requestDetails: requestDetails || undefined,
    patientName: data.patientName,
    requestedBy: data.requestedBy,
    notes: data.patientCode ? `Mã BN: ${data.patientCode}` : undefined,
  });
  return response.data;
};

// BE RespondInterHospitalRequestDto reads responseDetails (responseNotes was dropped).
export const respondToRequest = async (id: string, data: { status: number; responseNotes: string }) => {
  const response = await apiClient.put(`/inter-hospital/requests/${id}/respond`, {
    status: data.status,
    responseDetails: data.responseNotes,
  });
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
    // BE InterHospitalStatsDto: pendingCount / completedToday / avgResponseTimeMinutes (pendingRequests was
    // undefined and Math.round(undefined) rendered "NaNp").
    const response = await apiClient.get<InterHospitalStats & { pendingCount?: number }>('/inter-hospital/stats');
    const s = response.data;
    return {
      totalRequests: s?.totalRequests ?? 0,
      pendingRequests: s?.pendingRequests ?? s?.pendingCount ?? 0,
      completedToday: s?.completedToday ?? 0,
      avgResponseTimeMinutes: s?.avgResponseTimeMinutes ?? 0,
    };
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
