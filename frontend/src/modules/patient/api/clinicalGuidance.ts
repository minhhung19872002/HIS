import { apiClient } from '../../../services/apiClient';

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

// ---- BE code mapping ----
// QA-R2: the BE (ClinicalGuidanceService) stores GuidanceType / Status / ActivityType as string codes and names
// the batch code `code` and the activity performer `performer`. The page works with numeric enums, so without
// this mapping every batch fell into the "Hủy" tab, type labels were blank, create/type-filter were rejected,
// and delete/add-activity hit routes that don't exist.
const GUIDANCE_TYPE_CODES = ['KhamChua', 'ChuyenGiao', 'DaoTao', 'HoTro', 'GiamSat'];
const BATCH_STATUS_CODES = ['Planning', 'InProgress', 'Completed', 'Cancelled'];
const ACTIVITY_TYPE_CODES = ['KhamBenh', 'PhauThuat', 'DaoTao', 'HoiChan', 'ChuyenGiao', 'HoTroVatTu'];

const codeToIndex = (codes: string[], v: unknown): number => {
  if (typeof v === 'number') return v;
  const i = codes.indexOf(String(v ?? ''));
  return i < 0 ? -1 : i;
};
const indexToCode = (codes: string[], v: unknown): string | undefined =>
  v === undefined || v === null || v === '' ? undefined : (codes[Number(v)] ?? String(v));

const normalizeBatch = (raw: unknown): GuidanceBatchDto => {
  const b = (raw ?? {}) as GuidanceBatchDto & { code?: string };
  return {
    ...b,
    batchCode: b.batchCode ?? b.code ?? '',
    guidanceType: codeToIndex(GUIDANCE_TYPE_CODES, b.guidanceType),
    status: codeToIndex(BATCH_STATUS_CODES, b.status),
  };
};

const normalizeActivity = (raw: unknown): GuidanceActivityDto => {
  const a = (raw ?? {}) as GuidanceActivityDto & { performer?: string };
  return { ...a, activityType: codeToIndex(ACTIVITY_TYPE_CODES, a.activityType), staffName: a.staffName ?? a.performer };
};

const toBatchPayload = (data: Partial<CreateGuidanceBatchDto>) => ({
  title: data.title,
  targetFacility: data.targetFacility,
  guidanceType: indexToCode(GUIDANCE_TYPE_CODES, data.guidanceType),
  startDate: data.startDate,
  endDate: data.endDate,
  teamMembers: data.teamMembers,
  budget: data.budget,
});

// ---- API Functions ----

export const getGuidanceBatches = async (params?: {
  keyword?: string;
  status?: string;
  guidanceType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<GuidanceBatchDto[] | { items: GuidanceBatchDto[]; totalCount: number }>('/clinical-guidance/batches', {
      params: { ...params, guidanceType: indexToCode(GUIDANCE_TYPE_CODES, params?.guidanceType) },
    });
    const d = response.data;
    if (Array.isArray(d)) return { items: d.map(normalizeBatch), totalCount: d.length };
    return d ? { ...d, items: (d.items || []).map(normalizeBatch) } : { items: [], totalCount: 0 };
  } catch {
    console.warn('Failed to fetch guidance batches');
    return { items: [], totalCount: 0 };
  }
};

export const getGuidanceBatchById = async (id: string) => {
  const response = await apiClient.get<GuidanceBatchDto>(`/clinical-guidance/batches/${id}`);
  return normalizeBatch(response.data);
};

export const createGuidanceBatch = async (data: CreateGuidanceBatchDto) => {
  const response = await apiClient.post<GuidanceBatchDto>('/clinical-guidance/batches', toBatchPayload(data));
  return normalizeBatch(response.data);
};

export const updateGuidanceBatch = async (id: string, data: Partial<CreateGuidanceBatchDto>) => {
  const response = await apiClient.put<GuidanceBatchDto>(`/clinical-guidance/batches/${id}`, toBatchPayload(data));
  return normalizeBatch(response.data);
};

// The BE has no hard delete for a guidance batch; the page only offers it for planned batches → cancel.
export const deleteGuidanceBatch = async (id: string) => {
  await apiClient.put(`/clinical-guidance/batches/${id}/cancel`);
};

export const getGuidanceActivities = async (batchId: string) => {
  try {
    const response = await apiClient.get<GuidanceActivityDto[]>(`/clinical-guidance/batches/${batchId}/activities`);
    return (response.data || []).map(normalizeActivity);
  } catch {
    console.warn('Failed to fetch guidance activities');
    return [];
  }
};

export const createGuidanceActivity = async (data: CreateGuidanceActivityDto) => {
  const response = await apiClient.post<GuidanceActivityDto>(`/clinical-guidance/batches/${data.batchId}/activities`, {
    activityType: indexToCode(ACTIVITY_TYPE_CODES, data.activityType),
    activityDate: data.activityDate,
    description: data.description,
    performer: data.staffName,
    notes: [data.result && `Kết quả: ${data.result}`, data.notes].filter(Boolean).join('\n') || undefined,
  });
  return normalizeActivity(response.data);
};

export const getGuidanceStatistics = async (): Promise<GuidanceStatisticsDto> => {
  try {
    const response = await apiClient.get<GuidanceStatisticsDto & { inProgressCount?: number; completedCount?: number }>('/clinical-guidance/statistics');
    const s = response.data;
    return {
      inProgress: s?.inProgress ?? s?.inProgressCount ?? 0,
      completed: s?.completed ?? s?.completedCount ?? 0,
      totalBudget: s?.totalBudget ?? 0,
    };
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
