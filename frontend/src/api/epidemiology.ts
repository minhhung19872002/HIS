import { apiClient } from './client';

// ---- Types ----

export interface DiseaseReport {
  id: string;
  reportCode: string;
  patientName: string;
  patientCode: string;
  gender: number;
  age: number;
  address: string;
  diseaseName: string;
  diseaseCode: string;
  diseaseGroup: string; // A, B, C
  reportDate: string;
  onsetDate: string;
  diagnosisDate: string;
  reportingDoctor: string;
  status: number; // 0=draft, 1=submitted, 2=confirmed, 3=closed
  labConfirmed: boolean;
  outcome?: string;
  notes?: string;
  outbreakId?: string;
}

export interface Outbreak {
  id: string;
  name: string;
  diseaseCode: string;
  diseaseName: string;
  startDate: string;
  endDate?: string;
  location: string;
  caseCount: number;
  deathCount: number;
  riskLevel: number; // 1=low, 2=medium, 3=high, 4=critical
  status: number; // 0=suspected, 1=confirmed, 2=contained, 3=resolved
  responseActions?: string;
  description?: string;
}

export interface EpiStats {
  totalReports: number;
  confirmedCases: number;
  activeOutbreaks: number;
  deathCount: number;
  monthlyTrend: { month: string; count: number }[];
  diseaseDistribution: { disease: string; count: number }[];
}

export interface NotifiableDisease {
  code: string;
  name: string;
  group: string; // A, B, C
}

// ---- API Functions ----

export const searchDiseaseReports = async (params?: {
  keyword?: string;
  diseaseGroup?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<DiseaseReport[]>('/epidemiology/reports', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch disease reports');
    return [];
  }
};

export const getDiseaseReportById = async (id: string) => {
  const response = await apiClient.get<DiseaseReport>(`/epidemiology/reports/${id}`);
  return response.data;
};

export const reportDisease = async (data: Partial<DiseaseReport>) => {
  const response = await apiClient.post<DiseaseReport>('/epidemiology/reports', data);
  return response.data;
};

export const updateDiseaseReport = async (id: string, data: Partial<DiseaseReport>) => {
  const response = await apiClient.put<DiseaseReport>(`/epidemiology/reports/${id}`, data);
  return response.data;
};

export const searchOutbreaks = async (params?: {
  keyword?: string;
  status?: number;
  riskLevel?: number;
}) => {
  try {
    const response = await apiClient.get<Outbreak[]>('/epidemiology/outbreaks', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch outbreaks');
    return [];
  }
};

export const createOutbreak = async (data: Partial<Outbreak>) => {
  const response = await apiClient.post<Outbreak>('/epidemiology/outbreaks', data);
  return response.data;
};

export const updateOutbreak = async (id: string, data: Partial<Outbreak>) => {
  const response = await apiClient.put<Outbreak>(`/epidemiology/outbreaks/${id}`, data);
  return response.data;
};

export const getEpiStats = async (): Promise<EpiStats> => {
  try {
    const response = await apiClient.get<EpiStats>('/epidemiology/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch epidemiology statistics');
    return {
      totalReports: 0,
      confirmedCases: 0,
      activeOutbreaks: 0,
      deathCount: 0,
      monthlyTrend: [],
      diseaseDistribution: [],
    };
  }
};

export const getNotifiableDiseases = async (): Promise<NotifiableDisease[]> => {
  try {
    const response = await apiClient.get<NotifiableDisease[]>('/epidemiology/notifiable-diseases');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch notifiable diseases');
    return [
      { code: 'A00', name: 'Tả', group: 'A' },
      { code: 'A20', name: 'Dịch hạch', group: 'A' },
      { code: 'A33-A35', name: 'Bạch hầu', group: 'A' },
      { code: 'A80', name: 'Bại liệt', group: 'A' },
      { code: 'A98.5', name: 'Ebola', group: 'A' },
      { code: 'A90-A91', name: 'Sốt xuất huyết Dengue', group: 'B' },
      { code: 'B05', name: 'Sởi', group: 'B' },
      { code: 'A37', name: 'Ho gà', group: 'B' },
      { code: 'A01', name: 'Thương hàn', group: 'B' },
      { code: 'A39', name: 'Viêm não mô cầu', group: 'B' },
      { code: 'B15-B17', name: 'Viêm gan virus', group: 'B' },
      { code: 'J09-J11', name: 'Cúm', group: 'B' },
      { code: 'A82', name: 'Dại', group: 'B' },
      { code: 'B50-B54', name: 'Sốt rét', group: 'B' },
      { code: 'A15-A19', name: 'Lao phổi', group: 'C' },
      { code: 'B20-B24', name: 'HIV/AIDS', group: 'C' },
      { code: 'A54', name: 'Lậu', group: 'C' },
      { code: 'A51-A53', name: 'Giang mai', group: 'C' },
    ];
  }
};

export default {
  searchDiseaseReports,
  getDiseaseReportById,
  reportDisease,
  updateDiseaseReport,
  searchOutbreaks,
  createOutbreak,
  updateOutbreak,
  getEpiStats,
  getNotifiableDiseases,
};
