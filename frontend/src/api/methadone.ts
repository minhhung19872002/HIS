import { apiClient } from './client';

// ---- Types ----

export interface MethadonePatient {
  id: string;
  patientName: string;
  patientCode: string;
  gender: number;
  dateOfBirth: string;
  address: string;
  phone: string;
  enrollmentDate: string;
  phase: string; // induction, stabilization, maintenance, tapering
  currentDose: number; // mg
  doseType: string; // witnessed, takeHome
  attendingDoctor: string;
  status: number; // 0=active, 1=suspended, 2=discharged, 3=transferred
  lastDoseDate?: string;
  missedDoses: number;
  urineTestDate?: string;
  notes?: string;
}

export interface DoseRecord {
  id: string;
  patientId: string;
  patientName: string;
  doseDate: string;
  doseAmount: number; // mg
  doseType: string; // witnessed, takeHome
  administeredBy: string;
  witnessedBy?: string;
  notes?: string;
  status: number; // 0=scheduled, 1=administered, 2=missed, 3=refused
}

export interface UrineTest {
  id: string;
  patientId: string;
  patientName: string;
  testDate: string;
  morphine: string; // positive, negative
  amphetamine: string;
  thc: string;
  benzodiazepine: string;
  methadone: string;
  otherSubstances?: string;
  collectedBy: string;
  notes?: string;
}

export interface MethadoneStats {
  activePatients: number;
  todayDoses: number;
  monthlyUrineTests: number;
  missedDoses: number;
}

// ---- API Functions ----

export const searchMethadonePatients = async (params?: {
  keyword?: string;
  phase?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<MethadonePatient[]>('/methadone/patients', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch methadone patients');
    return [];
  }
};

export const getMethadonePatientById = async (id: string) => {
  const response = await apiClient.get<MethadonePatient>(`/methadone/patients/${id}`);
  return response.data;
};

export const enrollPatient = async (data: Partial<MethadonePatient>) => {
  const response = await apiClient.post<MethadonePatient>('/methadone/patients', data);
  return response.data;
};

export const updatePatient = async (id: string, data: Partial<MethadonePatient>) => {
  const response = await apiClient.put<MethadonePatient>(`/methadone/patients/${id}`, data);
  return response.data;
};

export const recordDose = async (data: Partial<DoseRecord>) => {
  const response = await apiClient.post<DoseRecord>('/methadone/doses', data);
  return response.data;
};

export const getDosingHistory = async (params?: {
  patientId?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<DoseRecord[]>('/methadone/doses', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch dosing history');
    return [];
  }
};

export const recordUrineTest = async (data: Partial<UrineTest>) => {
  const response = await apiClient.post<UrineTest>('/methadone/urine-tests', data);
  return response.data;
};

export const getUrineTests = async (params?: {
  patientId?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<UrineTest[]>('/methadone/urine-tests', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch urine tests');
    return [];
  }
};

export const getMethadoneStats = async (): Promise<MethadoneStats> => {
  try {
    const response = await apiClient.get<MethadoneStats>('/methadone/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch methadone statistics');
    return { activePatients: 0, todayDoses: 0, monthlyUrineTests: 0, missedDoses: 0 };
  }
};

export default {
  searchMethadonePatients,
  getMethadonePatientById,
  enrollPatient,
  updatePatient,
  recordDose,
  getDosingHistory,
  recordUrineTest,
  getUrineTests,
  getMethadoneStats,
};
