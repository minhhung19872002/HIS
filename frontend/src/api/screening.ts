import { apiClient } from './client';

export interface ScreeningRequest {
  id: string;
  requestCode: string;
  screeningType: string; // newborn, prenatal
  patientId: string;
  patientName: string;
  patientCode: string;
  // Newborn fields
  babyName?: string;
  babyGender?: number;
  birthWeight?: number;
  gestationalAge?: number;
  birthDate?: string;
  motherName?: string;
  motherAge?: number;
  deliveryMethod?: string;
  apgarScore?: string;
  feedingType?: string;
  birthCondition?: string;
  // Prenatal fields
  pregnancyWeek?: number;
  lastMenstrualDate?: string;
  ultrasoundDate?: string;
  maternalAge?: number;
  gravida?: number;
  para?: number;
  previousConditions?: string;
  familyHistory?: string;
  // Common fields
  sampleBarcode?: string;
  collectionDate?: string;
  status: number; // 0=Pending, 1=SampleCollected, 2=Processing, 3=ResultReady, 4=Completed
  results: ScreeningResult[];
  requestDate: string;
  requestedBy?: string;
  notes?: string;
}

export interface ScreeningResult {
  id: string;
  requestId: string;
  testCode: string;
  testName: string;
  value?: number;
  unit?: string;
  cutoff?: number;
  interpretation: string; // normal, borderline, abnormal, critical
  riskLevel?: string;
  referenceRange?: string;
  notes?: string;
}

export interface ScreeningProgram {
  code: string;
  name: string;
  type: string; // newborn, prenatal
  tests: { testCode: string; testName: string; cutoff: number; unit: string }[];
}

export const getScreeningRequests = async (params?: { type?: string; status?: number; fromDate?: string; keyword?: string }) => {
  const resp = await apiClient.get('/LISComplete/screening/requests', { params });
  return resp.data;
};

export const getScreeningById = async (id: string) => {
  const resp = await apiClient.get(`/LISComplete/screening/requests/${id}`);
  return resp.data;
};

export const createScreeningRequest = async (data: Partial<ScreeningRequest>) => {
  const resp = await apiClient.post('/LISComplete/screening/requests', data);
  return resp.data;
};

export const enterScreeningResult = async (requestId: string, results: Partial<ScreeningResult>[]) => {
  const resp = await apiClient.post(`/LISComplete/screening/requests/${requestId}/results`, results);
  return resp.data;
};

export const completeScreening = async (id: string, data: { conclusion: string; recommendation?: string }) => {
  const resp = await apiClient.put(`/LISComplete/screening/requests/${id}/complete`, data);
  return resp.data;
};

export const getScreeningPrograms = async (type?: string) => {
  const resp = await apiClient.get('/LISComplete/screening/programs', { params: { type } });
  return resp.data;
};

export const getScreeningStatistics = async (params?: { type?: string; fromDate?: string; toDate?: string }) => {
  const resp = await apiClient.get('/LISComplete/screening/statistics', { params });
  return resp.data;
};

export const printScreeningResult = async (id: string) => {
  const resp = await apiClient.get(`/LISComplete/screening/requests/${id}/print`, { responseType: 'blob' });
  return resp.data;
};
