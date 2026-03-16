/**
 * API Client cho Cổng đơn thuốc quốc gia - Cục Quản lý Khám chữa bệnh
 * Endpoints: /api/national-prescription/*
 */

import apiClient from './client';

// ==================== Types ====================

export interface NationalPrescriptionDto {
  id: string;
  prescriptionCode: string;
  patientName: string;
  patientCode: string;
  patientIdNumber?: string;
  insuranceNumber?: string;
  doctorName: string;
  doctorLicenseNumber?: string;
  facilityCode: string;
  facilityName: string;
  diagnosisCode: string;
  diagnosisName: string;
  prescriptionDate: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  status: number; // 0=Draft, 1=Submitted, 2=Accepted, 3=Rejected, 4=Cancelled
  statusName: string;
  submittedAt?: string;
  responseAt?: string;
  responseCode?: string;
  responseMessage?: string;
  transactionId?: string;
  items: NationalPrescriptionItemDto[];
}

export interface NationalPrescriptionItemDto {
  medicineCode: string;
  medicineName: string;
  activeIngredient: string;
  dosageForm: string;
  strength: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  dosage: string;
  frequency: string;
  duration: number;
  route: string;
  insuranceCovered: boolean;
}

export interface NationalPrescriptionSearchDto {
  keyword?: string;
  status?: number;
  dateFrom?: string;
  dateTo?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface NationalPrescriptionPagedResult {
  items: NationalPrescriptionDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface NationalPrescriptionStatsDto {
  totalSubmitted: number;
  totalAccepted: number;
  totalRejected: number;
  totalPending: number;
  totalAmountSubmitted: number;
  lastSubmittedAt?: string;
  connectionStatus: string;
}

// ==================== API Functions ====================

export const searchPrescriptions = (search: NationalPrescriptionSearchDto = {}) =>
  apiClient.post<NationalPrescriptionPagedResult>('/national-prescription/search', {
    pageIndex: search.pageIndex ?? 0,
    pageSize: search.pageSize ?? 20,
    ...search,
  }).then(r => r.data);

export const getPrescriptionById = (id: string) =>
  apiClient.get<NationalPrescriptionDto>(`/national-prescription/${id}`).then(r => r.data);

export const submitPrescription = (prescriptionId: string) =>
  apiClient.post<{ transactionId: string; message: string }>(`/national-prescription/submit/${prescriptionId}`).then(r => r.data);

export const submitBatch = (prescriptionIds: string[]) =>
  apiClient.post<{ successCount: number; failCount: number; results: { id: string; success: boolean; message: string }[] }>(
    '/national-prescription/submit-batch', { prescriptionIds }
  ).then(r => r.data);

export const getStats = () =>
  apiClient.get<NationalPrescriptionStatsDto>('/national-prescription/stats').then(r => r.data);

export const testConnection = () =>
  apiClient.get<{ connected: boolean; message: string; latencyMs: number }>('/national-prescription/test-connection').then(r => r.data);

export const retrySubmission = (id: string) =>
  apiClient.post<{ success: boolean; message: string }>(`/national-prescription/retry/${id}`).then(r => r.data);

export const cancelSubmission = (id: string) =>
  apiClient.post<{ success: boolean; message: string }>(`/national-prescription/cancel/${id}`).then(r => r.data);
