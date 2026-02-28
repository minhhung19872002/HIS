/**
 * API Client cho DQGVN - Cổng dữ liệu y tế quốc gia
 * Endpoints: /api/dqgvn/*
 */

import apiClient from './client';

// ==================== Types ====================

export type DqgvnSubmissionType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const DQGVN_SUBMISSION_TYPE_NAMES: Record<DqgvnSubmissionType, string> = {
  1: 'Thông tin BN',
  2: 'Lượt khám/điều trị',
  3: 'Kết quả XN',
  4: 'Kết quả CĐHA',
  5: 'Đơn thuốc',
  6: 'Ra viện',
  7: 'Tử vong',
  8: 'Bệnh truyền nhiễm',
  9: 'Sinh',
  10: 'Tiêm chủng',
};

export interface DqgvnSubmissionDto {
  id: string;
  submissionType: DqgvnSubmissionType;
  submissionTypeName: string;
  patientId?: string;
  patientName?: string;
  sourceEntityId?: string;
  requestPayload?: string;
  responsePayload?: string;
  status: number;
  statusName: string;
  errorMessage?: string;
  transactionId?: string;
  retryCount: number;
  createdAt: string;
  submittedAt?: string;
  responseAt?: string;
}

export interface DqgvnSubmissionSearchDto {
  submissionType?: DqgvnSubmissionType;
  status?: number;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface DqgvnSubmissionPagedResult {
  items: DqgvnSubmissionDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface DqgvnDashboardDto {
  totalSubmissions: number;
  pendingCount: number;
  submittedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  errorCount: number;
  acceptanceRate: number;
  byType: Array<{
    submissionType: DqgvnSubmissionType;
    typeName: string;
    count: number;
    acceptedCount: number;
  }>;
  last7Days: Array<{
    date: string;
    count: number;
    acceptedCount: number;
  }>;
}

export interface DqgvnConfigDto {
  apiBaseUrl: string;
  facilityCode: string;
  facilityName: string;
  provinceCode: string;
  districtCode: string;
  apiKey: string;
  secretKey: string;
  isEnabled: boolean;
  autoSubmit: boolean;
  retryCount: number;
  timeoutSeconds: number;
}

export interface SubmitEncounterRequest {
  patientId: string;
  examinationId?: string;
  admissionId?: string;
}

export interface SubmitLabResultRequest {
  labRequestId: string;
}

export interface DqgvnSubmitResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  submissionId: string;
}

// ==================== API Functions ====================

export const getDqgvnDashboard = async (): Promise<DqgvnDashboardDto> => {
  const response = await apiClient.get('/dqgvn/dashboard');
  return response.data;
};

export const searchDqgvnSubmissions = async (search: DqgvnSubmissionSearchDto = {}): Promise<DqgvnSubmissionPagedResult> => {
  const response = await apiClient.get('/dqgvn/submissions', { params: search });
  return response.data;
};

export const getDqgvnSubmission = async (id: string): Promise<DqgvnSubmissionDto> => {
  const response = await apiClient.get(`/dqgvn/submissions/${id}`);
  return response.data;
};

export const submitPatient = async (patientId: string): Promise<DqgvnSubmitResult> => {
  const response = await apiClient.post(`/dqgvn/submit/patient/${patientId}`);
  return response.data;
};

export const submitEncounter = async (request: SubmitEncounterRequest): Promise<DqgvnSubmitResult> => {
  const response = await apiClient.post('/dqgvn/submit/encounter', request);
  return response.data;
};

export const submitLabResult = async (request: SubmitLabResultRequest): Promise<DqgvnSubmitResult> => {
  const response = await apiClient.post('/dqgvn/submit/lab-result', request);
  return response.data;
};

export const retrySubmission = async (id: string): Promise<DqgvnSubmitResult> => {
  const response = await apiClient.post(`/dqgvn/submit/${id}/retry`);
  return response.data;
};

export const submitPendingBatch = async (): Promise<number> => {
  const response = await apiClient.post('/dqgvn/submit/batch');
  return response.data;
};

export const getDqgvnConfig = async (): Promise<DqgvnConfigDto> => {
  const response = await apiClient.get('/dqgvn/config');
  return response.data;
};

export const saveDqgvnConfig = async (config: DqgvnConfigDto): Promise<void> => {
  await apiClient.put('/dqgvn/config', config);
};
