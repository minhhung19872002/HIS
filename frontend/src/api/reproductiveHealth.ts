import { apiClient } from './client';

// ---- Types ----

export interface PrenatalRecord {
  id: string;
  recordCode: string;
  patientName: string;
  patientCode: string;
  dateOfBirth: string;
  gestationalWeeks: number;
  expectedDeliveryDate: string;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  status: number; // 0=active, 1=delivered, 2=completed, 3=cancelled
  visitCount: number;
  lastVisitDate?: string;
  bloodType?: string;
  gravida: number;
  para: number;
  doctorName: string;
  notes?: string;
}

export interface FamilyPlanningRecord {
  id: string;
  recordCode: string;
  patientName: string;
  patientCode: string;
  method: 'iud' | 'pill' | 'injection' | 'implant' | 'condom' | 'sterilization' | 'natural' | 'other';
  startDate: string;
  nextVisitDate?: string;
  status: number; // 0=active, 1=discontinued, 2=changed
  sideEffects?: string;
  doctorName: string;
  notes?: string;
}

export interface ReproductiveHealthStats {
  activePregnancies: number;
  highRiskCount: number;
  familyPlanningActive: number;
  deliveriesThisMonth: number;
}

// ---- API Functions ----

export const searchPrenatal = async (params?: {
  keyword?: string;
  riskLevel?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<PrenatalRecord[]>('/reproductive-health/prenatal', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch prenatal records');
    return [];
  }
};

export const getPrenatalById = async (id: string) => {
  const response = await apiClient.get<PrenatalRecord>(`/reproductive-health/prenatal/${id}`);
  return response.data;
};

export const createPrenatal = async (data: Partial<PrenatalRecord>) => {
  const response = await apiClient.post<PrenatalRecord>('/reproductive-health/prenatal', data);
  return response.data;
};

export const updatePrenatal = async (id: string, data: Partial<PrenatalRecord>) => {
  const response = await apiClient.put<PrenatalRecord>(`/reproductive-health/prenatal/${id}`, data);
  return response.data;
};

export const searchFamilyPlanning = async (params?: {
  keyword?: string;
  method?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<FamilyPlanningRecord[]>('/reproductive-health/family-planning', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch family planning records');
    return [];
  }
};

export const createFamilyPlanning = async (data: Partial<FamilyPlanningRecord>) => {
  const response = await apiClient.post<FamilyPlanningRecord>('/reproductive-health/family-planning', data);
  return response.data;
};

export const updateFamilyPlanning = async (id: string, data: Partial<FamilyPlanningRecord>) => {
  const response = await apiClient.put<FamilyPlanningRecord>(`/reproductive-health/family-planning/${id}`, data);
  return response.data;
};

export const getStats = async (): Promise<ReproductiveHealthStats> => {
  try {
    const response = await apiClient.get<ReproductiveHealthStats>('/reproductive-health/stats');
    return response.data;
  } catch {
    console.warn('Failed to fetch reproductive health statistics');
    return { activePregnancies: 0, highRiskCount: 0, familyPlanningActive: 0, deliveriesThisMonth: 0 };
  }
};

export const getHighRiskPregnancies = async () => {
  try {
    const response = await apiClient.get<PrenatalRecord[]>('/reproductive-health/high-risk');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch high risk pregnancies');
    return [];
  }
};

export default {
  searchPrenatal,
  getPrenatalById,
  createPrenatal,
  updatePrenatal,
  searchFamilyPlanning,
  createFamilyPlanning,
  updateFamilyPlanning,
  getStats,
  getHighRiskPregnancies,
};
