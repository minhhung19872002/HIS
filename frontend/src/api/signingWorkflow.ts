import { apiClient } from './client';

export interface SigningRequestItem {
  id: string;
  documentType: string;
  documentId: string;
  documentTitle: string;
  documentContent: string;
  submittedById: string;
  submittedByName: string;
  assignedToId: string;
  assignedToName: string;
  status: number; // 0=Pending, 1=Approved, 2=Rejected, 3=Cancelled
  statusText: string;
  rejectReason?: string;
  signedAt?: string;
  signatureData?: string;
  patientId?: string;
  patientName?: string;
  departmentName?: string;
  createdAt: string;
}

export interface SigningWorkflowStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  cancelledCount: number;
  totalCount: number;
  todaySubmitted: number;
  todayApproved: number;
}

export interface SubmitSigningRequest {
  documentType: string;
  documentId: string;
  documentTitle: string;
  documentContent?: string;
  assignedToId: string;
  assignedToName: string;
  patientId?: string;
  patientName?: string;
  departmentName?: string;
}

export const getPendingRequests = async (params?: Record<string, unknown>): Promise<SigningRequestItem[]> => {
  try {
    const resp = await apiClient.get('/signing-workflow/pending', { params });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('Failed to load pending signing requests');
    return [];
  }
};

export const getSubmittedRequests = async (params?: Record<string, unknown>): Promise<SigningRequestItem[]> => {
  try {
    const resp = await apiClient.get('/signing-workflow/submitted', { params });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('Failed to load submitted signing requests');
    return [];
  }
};

export const getHistory = async (params?: Record<string, unknown>): Promise<SigningRequestItem[]> => {
  try {
    const resp = await apiClient.get('/signing-workflow/history', { params });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('Failed to load signing history');
    return [];
  }
};

export const submitSigningRequest = async (data: SubmitSigningRequest): Promise<SigningRequestItem | null> => {
  try {
    const resp = await apiClient.post('/signing-workflow/submit', data);
    return resp.data;
  } catch {
    console.warn('Failed to submit signing request');
    return null;
  }
};

export const approveSigningRequest = async (id: string, signatureData?: string): Promise<SigningRequestItem | null> => {
  try {
    const resp = await apiClient.post(`/signing-workflow/${id}/approve`, { signatureData });
    return resp.data;
  } catch {
    console.warn('Failed to approve signing request');
    return null;
  }
};

export const rejectSigningRequest = async (id: string, rejectReason: string): Promise<SigningRequestItem | null> => {
  try {
    const resp = await apiClient.post(`/signing-workflow/${id}/reject`, { rejectReason });
    return resp.data;
  } catch {
    console.warn('Failed to reject signing request');
    return null;
  }
};

export const cancelSigningRequest = async (id: string): Promise<boolean> => {
  try {
    await apiClient.post(`/signing-workflow/${id}/cancel`);
    return true;
  } catch {
    console.warn('Failed to cancel signing request');
    return false;
  }
};

export const getSigningStats = async (): Promise<SigningWorkflowStats | null> => {
  try {
    const resp = await apiClient.get('/signing-workflow/stats');
    return resp.data;
  } catch {
    console.warn('Failed to load signing workflow stats');
    return null;
  }
};
