import { apiClient } from './client';

// ---- Types ----

export interface GuidanceBatchDto {
  id: string;
  batchCode: string;
  title: string;
  targetFacility: string;
  guidanceType: number; // 0=KhamChuaBenh, 1=DaoTao, 2=ChuyenGiaoKT, 3=HoTro
  startDate: string;
  endDate: string;
  teamMembers?: string;
  budget?: number;
  status: number; // 0=planning, 1=inProgress, 2=completed, 3=cancelled
  notes?: string;
  createdByName?: string;
  createdAt?: string;
  activityCount?: number;
}

export interface GuidanceActivityDto {
  id: string;
  batchId: string;
  activityType: number; // 0=KhamBenh, 1=PhauThuat, 2=DaoTao, 3=HoiChan, 4=ChuyenGiaoKT, 5=HoTroVatTu
  description: string;
  activityDate: string;
  staffName?: string;
  result?: string;
  notes?: string;
  createdAt?: string;
}

export interface GuidanceStatisticsDto {
  inProgress: number;
  completed: number;
  totalBudget: number;
}

export interface CreateGuidanceBatchDto {
  title: string;
  targetFacility: string;
  guidanceType: number;
  startDate: string;
  endDate: string;
  teamMembers?: string;
  budget?: number;
  notes?: string;
}

export interface CreateGuidanceActivityDto {
  batchId: string;
  activityType: number;
  description: string;
  activityDate: string;
  staffName?: string;
  result?: string;
  notes?: string;
}

// ---- API Functions ----

export const getGuidanceBatches = async (params?: {
  keyword?: string;
  status?: number;
  guidanceType?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<{ items: GuidanceBatchDto[]; totalCount: number }>('/clinical-guidance/batches', { params });
    return response.data || { items: [], totalCount: 0 };
  } catch {
    console.warn('Failed to fetch guidance batches');
    return { items: [], totalCount: 0 };
  }
};

export const getGuidanceBatchById = async (id: string) => {
  const response = await apiClient.get<GuidanceBatchDto>(`/clinical-guidance/batches/${id}`);
  return response.data;
};

export const createGuidanceBatch = async (data: CreateGuidanceBatchDto) => {
  const response = await apiClient.post<GuidanceBatchDto>('/clinical-guidance/batches', data);
  return response.data;
};

export const updateGuidanceBatch = async (id: string, data: Partial<CreateGuidanceBatchDto>) => {
  const response = await apiClient.put<GuidanceBatchDto>(`/clinical-guidance/batches/${id}`, data);
  return response.data;
};

export const deleteGuidanceBatch = async (id: string) => {
  await apiClient.delete(`/clinical-guidance/batches/${id}`);
};

export const getGuidanceActivities = async (batchId: string) => {
  try {
    const response = await apiClient.get<GuidanceActivityDto[]>(`/clinical-guidance/batches/${batchId}/activities`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch guidance activities');
    return [];
  }
};

export const createGuidanceActivity = async (data: CreateGuidanceActivityDto) => {
  const response = await apiClient.post<GuidanceActivityDto>('/clinical-guidance/activities', data);
  return response.data;
};

export const getGuidanceStatistics = async (): Promise<GuidanceStatisticsDto> => {
  try {
    const response = await apiClient.get<GuidanceStatisticsDto>('/clinical-guidance/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch guidance statistics');
    return { inProgress: 0, completed: 0, totalBudget: 0 };
  }
};

export default {
  getGuidanceBatches,
  getGuidanceBatchById,
  createGuidanceBatch,
  updateGuidanceBatch,
  deleteGuidanceBatch,
  getGuidanceActivities,
  createGuidanceActivity,
  getGuidanceStatistics,
};
