import { apiClient } from './client';

// ---- Types ----

export interface TraditionalTreatment {
  id: string;
  treatmentCode: string;
  patientName: string;
  patientCode: string;
  treatmentType: 'acupuncture' | 'herbal' | 'massage' | 'cupping' | 'moxibustion' | 'combined';
  diagnosis: string;
  startDate: string;
  endDate?: string;
  status: number; // 0=active, 1=completed, 2=cancelled
  doctorName: string;
  totalSessions?: number;
  completedSessions?: number;
  notes?: string;
}

export interface HerbalPrescription {
  id: string;
  treatmentId: string;
  prescriptionCode: string;
  prescriptionDate: string;
  ingredients: string; // JSON string of ingredients
  dosage: string;
  preparation: string;
  duration: number;
  durationUnit: string;
  notes?: string;
  doctorName: string;
}

export interface TraditionalMedicineStats {
  activeTreatments: number;
  completedThisMonth: number;
  acupunctureSessions: number;
  herbalPrescriptions: number;
}

// ---- API Functions ----

export const searchTreatments = async (params?: {
  keyword?: string;
  status?: number;
  treatmentType?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<TraditionalTreatment[]>('/traditional-medicine/treatments', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch traditional medicine treatments');
    return [];
  }
};

export const getById = async (id: string) => {
  const response = await apiClient.get<TraditionalTreatment>(`/traditional-medicine/treatments/${id}`);
  return response.data;
};

export const createTreatment = async (data: Partial<TraditionalTreatment>) => {
  const response = await apiClient.post<TraditionalTreatment>('/traditional-medicine/treatments', data);
  return response.data;
};

export const updateTreatment = async (id: string, data: Partial<TraditionalTreatment>) => {
  const response = await apiClient.put<TraditionalTreatment>(`/traditional-medicine/treatments/${id}`, data);
  return response.data;
};

export const createHerbalPrescription = async (treatmentId: string, data: Partial<HerbalPrescription>) => {
  const response = await apiClient.post<HerbalPrescription>('/traditional-medicine/herbal-prescriptions', {
    treatmentId,
    ...data,
  });
  return response.data;
};

export const getHerbalPrescriptions = async (treatmentId: string) => {
  try {
    const response = await apiClient.get<HerbalPrescription[]>(`/traditional-medicine/treatments/${treatmentId}/herbal-prescriptions`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch herbal prescriptions');
    return [];
  }
};

export const getStats = async (): Promise<TraditionalMedicineStats> => {
  try {
    const response = await apiClient.get<TraditionalMedicineStats>('/traditional-medicine/stats');
    return response.data;
  } catch {
    console.warn('Failed to fetch traditional medicine statistics');
    return { activeTreatments: 0, completedThisMonth: 0, acupunctureSessions: 0, herbalPrescriptions: 0 };
  }
};

export const completeTreatment = async (id: string) => {
  const response = await apiClient.put(`/traditional-medicine/treatments/${id}/complete`);
  return response.data;
};

export default {
  searchTreatments,
  getById,
  createTreatment,
  updateTreatment,
  createHerbalPrescription,
  getHerbalPrescriptions,
  getStats,
  completeTreatment,
};
