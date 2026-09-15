import { apiClient } from '../../../services/apiClient';

export interface MicrobiologyCulture {
  id: string;
  labRequestId: string;
  requestCode: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  sampleType: string;
  sampleBarcode: string;
  cultureType: string; // aerobic, anaerobic, fungal, mycobacteria
  cultureDate: string;
  incubationStart?: string;
  incubationEnd?: string;
  resultDate?: string;
  status: number; // 0=Pending, 1=Incubating, 2=GrowthDetected, 3=NoGrowth, 4=Identified, 5=Completed
  organisms: MicrobiologyOrganism[];
  notes?: string;
}

export interface MicrobiologyOrganism {
  id: string;
  cultureId: string;
  organismCode: string;
  organismName: string;
  colonyCount?: string;
  morphology?: string;
  gramStain?: string; // positive, negative, mixed
  identificationMethod?: string;
  antibiogram?: AntibioticSensitivity[];
}

export interface AntibioticSensitivity {
  id: string;
  organismId: string;
  antibioticCode: string;
  antibioticName: string;
  mic?: number;
  zoneDiameter?: number;
  interpretation: string; // S=Sensitive, I=Intermediate, R=Resistant
  method?: string; // disk, mic, etest
}

export interface MicrobiologyReport {
  organism: string;
  count: number;
  sampleTypes: { type: string; count: number }[];
  resistanceProfile: { antibiotic: string; sensitiveRate: number; resistantRate: number }[];
}

export const getMicrobiologyCultures = async (params?: { status?: number; fromDate?: string; keyword?: string }) => {
  // Route /cultures/v2 accepts status + keyword query params and returns real DB data (G-19)
  const resp = await apiClient.get('/LISComplete/microbiology/cultures/v2', { params });
  return resp.data;
};

export const getCultureById = async (id: string) => {
  const resp = await apiClient.get(`/LISComplete/microbiology/cultures/${id}`);
  return resp.data;
};

// The BE DTOs (ILISCompleteService.cs) declare every optional text field as non-nullable `string`,
// which is implicitly [Required]: an omitted key (`x || undefined`) → 400 "The Notes/GramStain/Method
// field is required." on EVERY create/update/add/antibiogram save. The service treats "" as empty.
const s = (v?: string | null) => v ?? '';

export const createCulture = async (data: Partial<MicrobiologyCulture>) => {
  const resp = await apiClient.post('/LISComplete/microbiology/cultures', {
    ...data,
    labRequestId: s(data.labRequestId),
    sampleType: s(data.sampleType),
    cultureType: s(data.cultureType),
    sampleBarcode: s(data.sampleBarcode),
    notes: s(data.notes),
  });
  return resp.data;
};

export const updateCultureStatus = async (id: string, data: { status: number; notes?: string }) => {
  const resp = await apiClient.put(`/LISComplete/microbiology/cultures/${id}/status`, { ...data, notes: s(data.notes) });
  return resp.data;
};

export const addOrganism = async (cultureId: string, data: Partial<MicrobiologyOrganism>) => {
  const resp = await apiClient.post(`/LISComplete/microbiology/cultures/${cultureId}/organisms`, {
    ...data,
    organismCode: s(data.organismCode),
    organismName: s(data.organismName),
    colonyCount: s(data.colonyCount),
    morphology: s(data.morphology),
    gramStain: s(data.gramStain),
    identificationMethod: s(data.identificationMethod),
  });
  return resp.data;
};

export const saveAntibiogram = async (organismId: string, data: AntibioticSensitivity[]) => {
  const resp = await apiClient.post(
    `/LISComplete/microbiology/organisms/${organismId}/antibiogram`,
    data.map((r) => ({
      ...r,
      antibioticCode: s(r.antibioticCode),
      antibioticName: s(r.antibioticName),
      interpretation: s(r.interpretation),
      method: s(r.method),
    })),
  );
  return resp.data;
};

export const getMicrobiologyReport = async (params?: { fromDate?: string; toDate?: string; sampleType?: string }) => {
  const resp = await apiClient.get('/LISComplete/microbiology/reports', { params });
  return resp.data;
};

export const getCommonOrganisms = async () => {
  const resp = await apiClient.get('/LISComplete/microbiology/organisms/common');
  return resp.data;
};

export const getAntibioticList = async () => {
  const resp = await apiClient.get('/LISComplete/microbiology/antibiotics');
  return resp.data;
};
