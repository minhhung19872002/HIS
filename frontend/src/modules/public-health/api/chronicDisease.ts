import { apiClient } from '../../../services/apiClient';

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
  /** Required by BE CreateChronicDiseaseDto ([Required] IcdName). */
  icdName?: string;
  diagnosisDate: string;
  followUpIntervalDays: number;
  notes?: string;
  doctorId?: string;
}

// BE (ChronicDiseaseDTOs.cs) uses string statuses; the v2 page uses numbers.
const RECORD_STATUS: Record<string, number> = { Active: 0, Remission: 1, Closed: 2, Removed: 3 };
const FOLLOWUP_STATUS: Record<string, number> = { Scheduled: 0, Completed: 1, Missed: 2, Cancelled: 3 };
type RawRecord = Omit<ChronicRecordDto, 'status'> & { status: string | number };
const mapRecord = (r: RawRecord): ChronicRecordDto => ({
  ...r,
  status: typeof r.status === 'number' ? r.status : (RECORD_STATUS[r.status] ?? 0),
});

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
  status?: string;
  icdCode?: string;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) => {
  try {
    const { page, ...rest } = params || {};
    const pageSize = rest.pageSize ?? 50;
    const pageIndex = Math.max(0, (page ?? 1) - 1); // BE binds `pageIndex` (0-based) — `page` was ignored
    const response = await apiClient.get<RawRecord[] | { items: RawRecord[]; totalCount: number }>('/chronic-disease/records', {
      params: { ...rest, pageIndex, pageSize },
    });
    const d = response.data;
    if (Array.isArray(d)) {
      // BE returns only the page, no total: expose one more page while the current one is full.
      const totalCount = pageIndex * pageSize + d.length + (d.length === pageSize ? 1 : 0);
      return { items: d.map(mapRecord), totalCount };
    }
    return d ? { items: (d.items || []).map(mapRecord), totalCount: d.totalCount } : { items: [], totalCount: 0 };
  } catch {
    console.warn('Failed to fetch chronic disease records');
    return { items: [], totalCount: 0 };
  }
};

export const getChronicRecordById = async (id: string) => {
  const response = await apiClient.get<RawRecord>(`/chronic-disease/records/${id}`);
  return mapRecord(response.data);
};

export const createChronicRecord = async (data: CreateChronicRecordDto) => {
  const response = await apiClient.post<RawRecord>('/chronic-disease/records', {
    ...data,
    icdName: data.icdName || data.icdCode,
    doctorId: data.doctorId || undefined, // BE falls back to the signed-in user
  });
  return response.data ? mapRecord(response.data) : response.data;
};

export const updateChronicRecord = async (id: string, data: Partial<CreateChronicRecordDto>) => {
  // UpdateChronicDiseaseDto: patient/diagnosis date are not editable.
  const response = await apiClient.put<RawRecord>(`/chronic-disease/records/${id}`, {
    icdCode: data.icdCode,
    icdName: data.icdName,
    doctorId: data.doctorId || undefined,
    notes: data.notes,
    followUpIntervalDays: data.followUpIntervalDays,
  });
  return response.data ? mapRecord(response.data) : response.data;
};

export const closeChronicRecord = async (id: string, reason?: string) => {
  const response = await apiClient.put(`/chronic-disease/records/${id}/close`, { reason });
  return response.data;
};

export const removeChronicRecord = async (id: string, reason = 'Loại bỏ hồ sơ') => {
  // [FromBody] RemoveChronicDiseaseDto — a bodiless PUT was rejected with 415.
  const response = await apiClient.put(`/chronic-disease/records/${id}/remove`, { reason });
  return response.data;
};

export const reopenChronicRecord = async (id: string) => {
  const response = await apiClient.put(`/chronic-disease/records/${id}/reopen`);
  return response.data;
};

export const getFollowUps = async (chronicRecordId: string) => {
  try {
    const response = await apiClient.get<Array<{
      id: string; chronicDiseaseRecordId: string; followUpDate?: string; status: string;
      notes?: string; vitalSigns?: string; medicationChanges?: string; labResults?: string;
    }>>(`/chronic-disease/records/${chronicRecordId}/follow-ups`);
    return (response.data || []).map((f): ChronicFollowUpDto => ({
      id: f.id,
      chronicRecordId: f.chronicDiseaseRecordId,
      visitDate: f.followUpDate || '',
      status: FOLLOWUP_STATUS[f.status] ?? 0,
      notes: f.notes,
      vitalSigns: f.vitalSigns,
      prescriptionSummary: f.medicationChanges,
      labSummary: f.labResults,
    }));
  } catch {
    console.warn('Failed to fetch follow-ups');
    return [];
  }
};

export const createFollowUp = async (data: CreateFollowUpDto) => {
  // Real route: POST /chronic-disease/records/{id}/follow-ups (CreateChronicDiseaseFollowUpDto).
  const response = await apiClient.post<ChronicFollowUpDto>(`/chronic-disease/records/${data.chronicRecordId}/follow-ups`, {
    followUpDate: data.visitDate,
    status: 'Completed',
    notes: data.notes,
    vitalSigns: data.vitalSigns,
    medicationChanges: data.prescriptionSummary,
    labResults: data.labSummary,
  });
  return response.data;
};

export const getChronicStatistics = async (): Promise<ChronicStatisticsDto> => {
  try {
    const response = await apiClient.get<{
      totalActive: number; totalRemission: number; totalClosed: number; totalRemoved: number;
    }>('/chronic-disease/statistics');
    const s = response.data;
    return {
      totalActive: s?.totalActive ?? 0,
      needFollowUp: s?.totalRemission ?? 0, // tab "Cần tái khám" filters status=Remission
      newThisMonth: 0, // not provided by BE
      closedOrRemoved: (s?.totalClosed ?? 0) + (s?.totalRemoved ?? 0),
    };
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
