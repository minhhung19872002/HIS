import { apiClient } from './client';

// ---- Types ----

export interface ChronicRecordDto {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender?: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  icdCode: string;
  icdName: string;
  diagnosisDate: string;
  doctorId?: string;
  doctorName?: string;
  departmentName?: string;
  followUpIntervalDays: number;
  nextFollowUpDate?: string;
  notes?: string;
  status: number; // 0=active, 1=needFollowUp, 2=closed, 3=removed
  closedDate?: string;
  closedReason?: string;
  createdAt?: string;
}

export interface ChronicFollowUpDto {
  id: string;
  chronicRecordId: string;
  visitDate: string;
  doctorName?: string;
  notes?: string;
  vitalSigns?: string;
  prescriptionSummary?: string;
  labSummary?: string;
  status: number; // 0=scheduled, 1=completed, 2=missed
  nextFollowUpDate?: string;
}

export interface ChronicStatisticsDto {
  totalActive: number;
  needFollowUp: number;
  newThisMonth: number;
  closedOrRemoved: number;
}

export interface CreateChronicRecordDto {
  patientId: string;
  icdCode: string;
  diagnosisDate: string;
  followUpIntervalDays: number;
  notes?: string;
  doctorId?: string;
}

export interface CreateFollowUpDto {
  chronicRecordId: string;
  visitDate: string;
  notes?: string;
  vitalSigns?: string;
  prescriptionSummary?: string;
  labSummary?: string;
  nextFollowUpDate?: string;
}

// ---- API Functions ----

export const getChronicRecords = async (params?: {
  keyword?: string;
  status?: number;
  icdCode?: string;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<{ items: ChronicRecordDto[]; totalCount: number }>('/chronic-disease/records', { params });
    return response.data || { items: [], totalCount: 0 };
  } catch {
    console.warn('Failed to fetch chronic disease records');
    return { items: [], totalCount: 0 };
  }
};

export const getChronicRecordById = async (id: string) => {
  const response = await apiClient.get<ChronicRecordDto>(`/chronic-disease/records/${id}`);
  return response.data;
};

export const createChronicRecord = async (data: CreateChronicRecordDto) => {
  const response = await apiClient.post<ChronicRecordDto>('/chronic-disease/records', data);
  return response.data;
};

export const updateChronicRecord = async (id: string, data: Partial<CreateChronicRecordDto>) => {
  const response = await apiClient.put<ChronicRecordDto>(`/chronic-disease/records/${id}`, data);
  return response.data;
};

export const closeChronicRecord = async (id: string, reason?: string) => {
  const response = await apiClient.put(`/chronic-disease/records/${id}/close`, { reason });
  return response.data;
};

export const removeChronicRecord = async (id: string) => {
  const response = await apiClient.put(`/chronic-disease/records/${id}/remove`);
  return response.data;
};

export const reopenChronicRecord = async (id: string) => {
  const response = await apiClient.put(`/chronic-disease/records/${id}/reopen`);
  return response.data;
};

export const getFollowUps = async (chronicRecordId: string) => {
  try {
    const response = await apiClient.get<ChronicFollowUpDto[]>(`/chronic-disease/records/${chronicRecordId}/follow-ups`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch follow-ups');
    return [];
  }
};

export const createFollowUp = async (data: CreateFollowUpDto) => {
  const response = await apiClient.post<ChronicFollowUpDto>('/chronic-disease/follow-ups', data);
  return response.data;
};

export const getChronicStatistics = async (): Promise<ChronicStatisticsDto> => {
  try {
    const response = await apiClient.get<ChronicStatisticsDto>('/chronic-disease/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch chronic disease statistics');
    return { totalActive: 0, needFollowUp: 0, newThisMonth: 0, closedOrRemoved: 0 };
  }
};

export default {
  getChronicRecords,
  getChronicRecordById,
  createChronicRecord,
  updateChronicRecord,
  closeChronicRecord,
  removeChronicRecord,
  reopenChronicRecord,
  getFollowUps,
  createFollowUp,
  getChronicStatistics,
};
