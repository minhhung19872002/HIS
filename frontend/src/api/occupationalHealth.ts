import { apiClient } from './client';

// ---- Types ----

export interface OccExam {
  id: string;
  examCode: string;
  patientName: string;
  patientCode: string;
  gender: number;
  dateOfBirth: string;
  companyName: string;
  companyCode: string;
  department: string;
  occupation: string;
  yearsOfExposure: number;
  examDate: string;
  examType: string; // periodic, preEmployment, postExposure
  examDoctor: string;
  hazardTypes: string[]; // dust, chemical, noise, vibration, heat, radiation, biological
  spirometryResult?: string;
  audiometryResult?: string;
  bloodLeadLevel?: number;
  visionResult?: string;
  xrayResult?: string;
  labResults?: string;
  classification: string; // pass, fail, restricted
  occupationalDisease?: string;
  status: number; // 0=pending, 1=inProgress, 2=completed, 3=certified
  conclusion?: string;
  recommendations?: string;
}

export interface OccStats {
  totalExams: number;
  diseaseDetected: number;
  needsFollowUp: number;
  companies: number;
}

export interface HazardType {
  code: string;
  name: string;
  description: string;
}

// ---- API Functions ----

export const searchOccExams = async (params?: {
  keyword?: string;
  companyCode?: string;
  examType?: string;
  hazardType?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<OccExam[]>('/occupational-health/exams', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch occupational health exams');
    return [];
  }
};

export const getOccExamById = async (id: string) => {
  const response = await apiClient.get<OccExam>(`/occupational-health/exams/${id}`);
  return response.data;
};

export const createOccExam = async (data: Partial<OccExam>) => {
  const response = await apiClient.post<OccExam>('/occupational-health/exams', data);
  return response.data;
};

export const updateOccExam = async (id: string, data: Partial<OccExam>) => {
  const response = await apiClient.put<OccExam>(`/occupational-health/exams/${id}`, data);
  return response.data;
};

export const getOccStats = async (): Promise<OccStats> => {
  try {
    const response = await apiClient.get<OccStats>('/occupational-health/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch occupational health statistics');
    return { totalExams: 0, diseaseDetected: 0, needsFollowUp: 0, companies: 0 };
  }
};

export const getHazardTypes = async (): Promise<HazardType[]> => {
  try {
    const response = await apiClient.get<HazardType[]>('/occupational-health/hazard-types');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch hazard types');
    return [
      { code: 'dust', name: 'Bụi', description: 'Bụi phổi, bụi silic, bụi amiăng' },
      { code: 'chemical', name: 'Hóa chất', description: 'Hóa chất độc hại, dung môi hữu cơ' },
      { code: 'noise', name: 'Tiếng ồn', description: 'Tiếng ồn > 85dB' },
      { code: 'vibration', name: 'Rung', description: 'Rung toàn thân, rung cục bộ' },
      { code: 'heat', name: 'Nhiệt', description: 'Làm việc môi trường nóng' },
      { code: 'radiation', name: 'Bức xạ', description: 'Bức xạ ion hóa, bức xạ tia UV' },
      { code: 'biological', name: 'Vi sinh', description: 'Vi khuẩn, virus, nấm' },
    ];
  }
};

export default {
  searchOccExams,
  getOccExamById,
  createOccExam,
  updateOccExam,
  getOccStats,
  getHazardTypes,
};
