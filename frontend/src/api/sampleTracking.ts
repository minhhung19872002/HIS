import { apiClient } from './client';

export interface SampleTrackingEvent {
  id: string;
  sampleBarcode: string;
  labRequestId?: string;
  requestCode?: string;
  patientName?: string;
  eventType: string; // collected, received, rejected, reCollected, processing, completed, stored, retrieved, disposed
  eventDate: string;
  userId: string;
  userName: string;
  location?: string;
  reason?: string;
  notes?: string;
}

export interface SampleRejection {
  id: string;
  sampleBarcode: string;
  labRequestId: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  rejectionReason: string;
  rejectionCode: string;
  rejectedAt: string;
  rejectedBy: string;
  isUndone: boolean;
  undoneAt?: string;
  undoneBy?: string;
  reCollected: boolean;
  reCollectedAt?: string;
  notes?: string;
}

export interface SampleTrackingSummary {
  totalSamples: number;
  collected: number;
  received: number;
  rejected: number;
  processing: number;
  completed: number;
  rejectionRate: number;
  averageTurnaroundMinutes: number;
  topRejectionReasons: { reason: string; count: number }[];
}

export const getSampleTimeline = async (sampleBarcode: string) => {
  const resp = await apiClient.get(`/LISComplete/sample-tracking/${sampleBarcode}/timeline`);
  return resp.data;
};

export const getSampleRejections = async (params?: { fromDate?: string; toDate?: string; keyword?: string }) => {
  const resp = await apiClient.get('/LISComplete/sample-tracking/rejections', { params });
  return resp.data;
};

export const rejectSample = async (data: { sampleBarcode: string; labRequestId: string; rejectionCode: string; rejectionReason: string; notes?: string }) => {
  const resp = await apiClient.post('/LISComplete/sample-tracking/reject', data);
  return resp.data;
};

export const undoRejection = async (id: string, data: { reason: string }) => {
  const resp = await apiClient.post(`/LISComplete/sample-tracking/rejections/${id}/undo`, data);
  return resp.data;
};

export const reCollectSample = async (rejectionId: string) => {
  const resp = await apiClient.post(`/LISComplete/sample-tracking/rejections/${rejectionId}/recollect`);
  return resp.data;
};

export const getSampleTrackingSummary = async (params?: { fromDate?: string; toDate?: string }) => {
  const resp = await apiClient.get('/LISComplete/sample-tracking/summary', { params });
  return resp.data;
};

export const getRejectionReasons = async () => {
  const resp = await apiClient.get('/LISComplete/sample-tracking/rejection-reasons');
  return resp.data;
};
