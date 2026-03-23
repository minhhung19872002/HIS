import { apiClient } from './client';

// ---- Types ----

export interface Vaccination {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  dateOfBirth: string;
  gender: number;
  vaccineName: string;
  vaccineCode: string;
  lotNumber: string;
  doseNumber: number;
  totalDoses: number;
  vaccinationDate: string;
  nextDueDate?: string;
  site: string; // injection site
  route: string; // IM, SC, ID, Oral
  administeredBy: string;
  status: number; // 0=scheduled, 1=completed, 2=missed, 3=deferred
  notes?: string;
  adverseEvent?: string;
}

export interface VaccinationSchedule {
  vaccineCode: string;
  vaccineName: string;
  doses: {
    doseNumber: number;
    ageMonths: number;
    ageLabel: string;
    status: string;
    scheduledDate?: string;
    completedDate?: string;
  }[];
}

export interface Campaign {
  id: string;
  name: string;
  vaccineCode: string;
  vaccineName: string;
  startDate: string;
  endDate: string;
  targetPopulation: number;
  completedCount: number;
  status: number; // 0=planned, 1=active, 2=completed, 3=cancelled
  area: string;
  description?: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalVaccinated: number;
  coveragePercent: number;
}

export interface AefiReport {
  id: string;
  patientName: string;
  vaccineName: string;
  vaccinationDate: string;
  reactionDate: string;
  severity: number; // 1=mild, 2=moderate, 3=severe, 4=serious
  symptoms: string;
  outcome: string;
  reportedBy: string;
  status: number; // 0=reported, 1=investigating, 2=closed
}

// ---- API Functions ----

export const searchVaccinations = async (params?: {
  keyword?: string;
  vaccineCode?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<Vaccination[]>('/immunization/vaccinations', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch vaccinations');
    return [];
  }
};

export const getVaccinationById = async (id: string) => {
  const response = await apiClient.get<Vaccination>(`/immunization/vaccinations/${id}`);
  return response.data;
};

export const recordVaccination = async (data: Partial<Vaccination>) => {
  const response = await apiClient.post<Vaccination>('/immunization/vaccinations', data);
  return response.data;
};

export const getVaccinationSchedule = async (patientId: string): Promise<VaccinationSchedule[]> => {
  try {
    const response = await apiClient.get<VaccinationSchedule[]>(`/immunization/schedule/${patientId}`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch vaccination schedule');
    return [];
  }
};

export const searchCampaigns = async (params?: {
  keyword?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<Campaign[]>('/immunization/campaigns', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch campaigns');
    return [];
  }
};

export const createCampaign = async (data: Partial<Campaign>) => {
  const response = await apiClient.post<Campaign>('/immunization/campaigns', data);
  return response.data;
};

export const getCampaignStats = async (): Promise<CampaignStats> => {
  try {
    const response = await apiClient.get<CampaignStats>('/immunization/campaigns/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch campaign statistics');
    return { totalCampaigns: 0, activeCampaigns: 0, totalVaccinated: 0, coveragePercent: 0 };
  }
};

export const getAefiReports = async (params?: {
  keyword?: string;
  severity?: number;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<AefiReport[]>('/immunization/aefi', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch AEFI reports');
    return [];
  }
};

export default {
  searchVaccinations,
  getVaccinationById,
  recordVaccination,
  getVaccinationSchedule,
  searchCampaigns,
  createCampaign,
  getCampaignStats,
  getAefiReports,
};
