import { apiClient } from '../../../services/apiClient';

// ---- Types (FE contract — numeric enum, component dùng nguyên) ----

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

// ---- Adapter BE (TbHivController) ----
// BE dùng STRING enum ("TB"/"HIV"/"TB_HIV", "OnTreatment"…, "New"…) + tên field khác
// (treatmentRegimen/treatmentStartDate/smearResult) → map 2 chiều tại đây, component giữ contract số.

const RT_STR = ['TB', 'HIV', 'TB_HIV'];
const CAT_STR = ['New', 'Relapse', 'FailedTreatment', 'ReturnAfterDefault', 'Other'];
const ST_STR = ['OnTreatment', 'Completed', 'Failed', 'DefaultedLostToFollowUp', 'Died', 'TransferredOut'];
const ADH_STR = ['Good', 'Fair', 'Poor'];

const toNum = (map: string[], v: unknown, dflt = 0): number => {
  if (typeof v === 'number') return v;
  const i = map.indexOf(String(v));
  return i >= 0 ? i : dflt;
};

// Filter value từ trang có thể là mã số ('0'/'1') hoặc enum name BE ('OnTreatment') → chuẩn về enum name.
const toBeStr = (map: string[], v: string | number | undefined): string | undefined => {
  if (v === undefined || v === '') return undefined;
  if (map.includes(String(v))) return String(v);
  const n = Number(v);
  return Number.isInteger(n) ? map[n] : undefined;
};

interface RawTbHivRecord {
  id: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
  gender?: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  recordType?: unknown;
  registrationCode?: string;
  registrationDate?: string;
  treatmentCategory?: unknown;
  treatmentRegimen?: string;
  treatmentStartDate?: string;
  status?: unknown;
  doctorName?: string;
  departmentName?: string;
  smearResult?: string;
  geneXpertResult?: string;
  cd4Count?: number;
  viralLoad?: number;
  artRegimen?: string;
  notes?: string;
  createdAt?: string;
  // phòng thủ nếu env khác trả sẵn shape FE
  regimen?: string;
  startDate?: string;
  sputumSmearResult?: string;
  treatmentMonth?: number;
}

const mapRecord = (r: RawTbHivRecord): TbHivRecordDto => ({
  id: r.id,
  registrationCode: r.registrationCode || '',
  patientId: r.patientId,
  patientCode: r.patientCode || '',
  patientName: r.patientName || '',
  gender: r.gender,
  dateOfBirth: r.dateOfBirth,
  phoneNumber: r.phoneNumber,
  address: r.address,
  recordType: toNum(RT_STR, r.recordType, 0),
  treatmentCategory: toNum(CAT_STR, r.treatmentCategory, 4),
  regimen: r.regimen ?? r.treatmentRegimen ?? '',
  startDate: r.startDate ?? r.treatmentStartDate ?? r.registrationDate ?? '',
  treatmentMonth: r.treatmentMonth,
  status: toNum(ST_STR, r.status, 0),
  sputumSmearResult: r.sputumSmearResult ?? r.smearResult,
  geneXpertResult: r.geneXpertResult,
  cd4Count: r.cd4Count,
  viralLoad: r.viralLoad,
  artRegimen: r.artRegimen,
  notes: r.notes,
  doctorName: r.doctorName,
  createdAt: r.createdAt,
});

interface RawFollowUp {
  id: string;
  tbHivRecordId?: string;
  recordId?: string;
  visitDate?: string;
  treatmentMonth: number;
  weight?: number;
  smearResult?: string;
  sputumSmearResult?: string;
  cd4Count?: number;
  viralLoad?: number;
  drugAdherence?: unknown;
  sideEffects?: string;
  notes?: string;
  doctorName?: string;
}

const mapFollowUp = (f: RawFollowUp): TbHivFollowUpDto => ({
  id: f.id,
  recordId: f.recordId ?? f.tbHivRecordId ?? '',
  visitDate: f.visitDate || '',
  treatmentMonth: f.treatmentMonth,
  weight: f.weight,
  sideEffects: f.sideEffects,
  drugAdherence: toNum(ADH_STR, f.drugAdherence, 0),
  sputumSmearResult: f.sputumSmearResult ?? f.smearResult,
  cd4Count: f.cd4Count,
  viralLoad: f.viralLoad,
  notes: f.notes,
  doctorName: f.doctorName,
});

// ---- API Functions ----

export const getTbHivRecords = async (params?: {
  keyword?: string;
  recordType?: string | number; // mã số ('0'/'1'/'2') hoặc enum name BE
  treatmentCategory?: string | number;
  status?: string | number;
  fromDate?: string;
  toDate?: string;
  page?: number; // 0-based pageIndex
  pageSize?: number;
}) => {
  try {
    const q = {
      keyword: params?.keyword || undefined,
      recordType: toBeStr(RT_STR, params?.recordType),
      treatmentCategory: toBeStr(CAT_STR, params?.treatmentCategory),
      status: toBeStr(ST_STR, params?.status),
      fromDate: params?.fromDate || undefined,
      toDate: params?.toDate || undefined,
      pageIndex: params?.page ?? 0,
      pageSize: params?.pageSize ?? 50,
    };
    const response = await apiClient.get<RawTbHivRecord[] | { items: RawTbHivRecord[]; totalCount: number }>('/tb-hiv/records', { params: q });
    const d = response.data;
    const raw = Array.isArray(d) ? d : d?.items || [];
    return { items: raw.map(mapRecord), totalCount: Array.isArray(d) ? d.length : (d?.totalCount ?? raw.length) };
  } catch {
    console.warn('Failed to fetch TB/HIV records');
    return { items: [], totalCount: 0 };
  }
};

export const getTbHivRecordById = async (id: string) => {
  const response = await apiClient.get<RawTbHivRecord>(`/tb-hiv/records/${id}`);
  return mapRecord(response.data);
};

export const createTbHivRecord = async (data: CreateTbHivRecordDto) => {
  const payload = {
    patientId: data.patientId,
    recordType: RT_STR[data.recordType] ?? 'TB',
    treatmentCategory: CAT_STR[data.treatmentCategory] ?? 'New',
    treatmentRegimen: data.regimen,
    treatmentStartDate: data.startDate || undefined,
    smearResult: data.sputumSmearResult,
    geneXpertResult: data.geneXpertResult,
    cd4Count: data.cd4Count,
    viralLoad: data.viralLoad,
    artRegimen: data.artRegimen,
    notes: data.notes,
  };
  const response = await apiClient.post<RawTbHivRecord>('/tb-hiv/records', payload);
  return mapRecord(response.data);
};

export const updateTbHivRecord = async (id: string, data: Partial<CreateTbHivRecordDto>) => {
  // BE UpdateTbHivRecordDto không cho đổi recordType/treatmentCategory
  const payload = {
    treatmentRegimen: data.regimen,
    treatmentStartDate: data.startDate || undefined,
    smearResult: data.sputumSmearResult,
    geneXpertResult: data.geneXpertResult,
    cd4Count: data.cd4Count,
    viralLoad: data.viralLoad,
    artRegimen: data.artRegimen,
    notes: data.notes,
  };
  const response = await apiClient.put<RawTbHivRecord>(`/tb-hiv/records/${id}`, payload);
  return mapRecord(response.data);
};

export const updateTbHivStatus = async (id: string, status: number, notes?: string) => {
  const response = await apiClient.put(`/tb-hiv/records/${id}/close`, {
    status: ST_STR[status] ?? 'Completed',
    outcomeNotes: notes,
  });
  return response.data;
};

export const getFollowUps = async (recordId: string) => {
  try {
    const response = await apiClient.get<RawFollowUp[]>(`/tb-hiv/records/${recordId}/follow-ups`);
    return (response.data || []).map(mapFollowUp);
  } catch {
    console.warn('Failed to fetch TB/HIV follow-ups');
    return [];
  }
};

export const createFollowUp = async (data: CreateTbHivFollowUpDto) => {
  const payload = {
    visitDate: data.visitDate || undefined,
    treatmentMonth: data.treatmentMonth,
    weight: data.weight,
    smearResult: data.sputumSmearResult,
    cd4Count: data.cd4Count,
    viralLoad: data.viralLoad,
    drugAdherence: ADH_STR[data.drugAdherence] ?? 'Good',
    sideEffects: data.sideEffects,
    notes: data.notes,
  };
  const response = await apiClient.post<RawFollowUp>(`/tb-hiv/records/${data.recordId}/follow-ups`, payload);
  return mapFollowUp(response.data);
};

export const getTbHivStatistics = async (): Promise<TbHivStatisticsDto> => {
  try {
    const response = await apiClient.get<Record<string, number | undefined>>('/tb-hiv/statistics');
    const s = response.data ?? {};
    return {
      onTreatment: s.onTreatment ?? s.onTreatmentCount ?? 0,
      tbCount: s.tbCount ?? 0,
      hivCount: s.hivCount ?? 0,
      coInfectionCount: s.coInfectionCount ?? s.tbHivCoinfectionCount ?? 0,
    };
  } catch {
    console.warn('Failed to fetch TB/HIV statistics');
    return { onTreatment: 0, tbCount: 0, hivCount: 0, coInfectionCount: 0 };
  }
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
};
