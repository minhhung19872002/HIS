import { apiClient } from './client';

// ---- Types ----

export interface TbHivRecordDto {
  id: string;
  registrationCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender?: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  recordType: number; // 0=TB, 1=HIV, 2=TB_HIV (co-infection)
  treatmentCategory: number; // 0=New, 1=Relapse, 2=Failure, 3=ReturnAfterDefault, 4=Other
  regimen: string;
  startDate: string;
  treatmentMonth?: number;
  status: number; // 0=onTreatment, 1=completed, 2=failed, 3=defaulted, 4=died, 5=transferredOut
  // TB-specific
  sputumSmearResult?: string;
  geneXpertResult?: string;
  // HIV-specific
  cd4Count?: number;
  viralLoad?: number;
  artRegimen?: string;
  // General
  notes?: string;
  doctorName?: string;
  createdAt?: string;
}

export interface TbHivFollowUpDto {
  id: string;
  recordId: string;
  visitDate: string;
  treatmentMonth: number;
  weight?: number;
  sideEffects?: string;
  drugAdherence: number; // 0=Good, 1=Fair, 2=Poor
  sputumSmearResult?: string;
  cd4Count?: number;
  viralLoad?: number;
  notes?: string;
  doctorName?: string;
}

export interface TbHivStatisticsDto {
  onTreatment: number;
  tbCount: number;
  hivCount: number;
  coInfectionCount: number;
}

export interface CreateTbHivRecordDto {
  patientId: string;
  recordType: number;
  treatmentCategory: number;
  regimen: string;
  startDate: string;
  sputumSmearResult?: string;
  geneXpertResult?: string;
  cd4Count?: number;
  viralLoad?: number;
  artRegimen?: string;
  notes?: string;
}

export interface CreateTbHivFollowUpDto {
  recordId: string;
  visitDate: string;
  treatmentMonth: number;
  weight?: number;
  sideEffects?: string;
  drugAdherence: number;
  sputumSmearResult?: string;
  cd4Count?: number;
  viralLoad?: number;
  notes?: string;
}

// ---- API Functions ----

export const getTbHivRecords = async (params?: {
  keyword?: string;
  recordType?: number;
  treatmentCategory?: number;
  status?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<{ items: TbHivRecordDto[]; totalCount: number }>('/tb-hiv/records', { params });
    return response.data || { items: [], totalCount: 0 };
  } catch {
    console.warn('Failed to fetch TB/HIV records');
    return { items: [], totalCount: 0 };
  }
};

export const getTbHivRecordById = async (id: string) => {
  const response = await apiClient.get<TbHivRecordDto>(`/tb-hiv/records/${id}`);
  return response.data;
};

export const createTbHivRecord = async (data: CreateTbHivRecordDto) => {
  const response = await apiClient.post<TbHivRecordDto>('/tb-hiv/records', data);
  return response.data;
};

export const updateTbHivRecord = async (id: string, data: Partial<CreateTbHivRecordDto>) => {
  const response = await apiClient.put<TbHivRecordDto>(`/tb-hiv/records/${id}`, data);
  return response.data;
};

export const updateTbHivStatus = async (id: string, status: number, notes?: string) => {
  const response = await apiClient.put(`/tb-hiv/records/${id}/status`, { status, notes });
  return response.data;
};

export const getFollowUps = async (recordId: string) => {
  try {
    const response = await apiClient.get<TbHivFollowUpDto[]>(`/tb-hiv/records/${recordId}/follow-ups`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch TB/HIV follow-ups');
    return [];
  }
};

export const createFollowUp = async (data: CreateTbHivFollowUpDto) => {
  const response = await apiClient.post<TbHivFollowUpDto>('/tb-hiv/follow-ups', data);
  return response.data;
};

export const getTbHivStatistics = async (): Promise<TbHivStatisticsDto> => {
  try {
    const response = await apiClient.get<TbHivStatisticsDto>('/tb-hiv/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch TB/HIV statistics');
    return { onTreatment: 0, tbCount: 0, hivCount: 0, coInfectionCount: 0 };
  }
};

export const printTreatmentCard = async (id: string) => {
  const response = await apiClient.get(`/tb-hiv/records/${id}/print`, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  getTbHivRecords,
  getTbHivRecordById,
  createTbHivRecord,
  updateTbHivRecord,
  updateTbHivStatus,
  getFollowUps,
  createFollowUp,
  getTbHivStatistics,
  printTreatmentCard,
};
