import { apiClient } from './client';

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
  const resp = await apiClient.get('/LISComplete/microbiology/cultures', { params });
  return resp.data;
};

export const getCultureById = async (id: string) => {
  const resp = await apiClient.get(`/LISComplete/microbiology/cultures/${id}`);
  return resp.data;
};

export const createCulture = async (data: Partial<MicrobiologyCulture>) => {
  const resp = await apiClient.post('/LISComplete/microbiology/cultures', data);
  return resp.data;
};

export const updateCultureStatus = async (id: string, data: { status: number; notes?: string }) => {
  const resp = await apiClient.put(`/LISComplete/microbiology/cultures/${id}/status`, data);
  return resp.data;
};

export const addOrganism = async (cultureId: string, data: Partial<MicrobiologyOrganism>) => {
  const resp = await apiClient.post(`/LISComplete/microbiology/cultures/${cultureId}/organisms`, data);
  return resp.data;
};

export const saveAntibiogram = async (organismId: string, data: AntibioticSensitivity[]) => {
  const resp = await apiClient.post(`/LISComplete/microbiology/organisms/${organismId}/antibiogram`, data);
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
