import { apiClient } from './client';

// ---- Types ----

export interface MentalHealthCase {
  id: string;
  caseCode: string;
  patientName: string;
  patientCode: string;
  caseType: 'schizophrenia' | 'depression' | 'anxiety' | 'bipolar' | 'ptsd' | 'substance';
  diagnosis: string;
  severity: 'mild' | 'moderate' | 'severe';
  status: number; // 0=active, 1=stable, 2=remission, 3=discharged
  startDate: string;
  lastAssessmentDate?: string;
  nextFollowUpDate?: string;
  adherenceLevel: 'good' | 'moderate' | 'poor';
  medications?: string;
  psychiatristName: string;
  notes?: string;
}

export interface MentalHealthAssessment {
  id: string;
  caseId: string;
  assessmentType: 'PHQ9' | 'GAD7' | 'PANSS' | 'HAM-D' | 'YMRS' | 'general';
  assessmentDate: string;
  totalScore: number;
  interpretation: string;
  findings: string;
  recommendations: string;
  assessorName: string;
}

export interface MentalHealthStats {
  activeCases: number;
  severeCases: number;
  overdueFollowUps: number;
  assessmentsThisMonth: number;
}

// ---- API Functions ----

export const searchCases = async (params?: {
  keyword?: string;
  status?: number;
  caseType?: string;
  severity?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<MentalHealthCase[]>('/mental-health/cases', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch mental health cases');
    return [];
  }
};

export const getById = async (id: string) => {
  const response = await apiClient.get<MentalHealthCase>(`/mental-health/cases/${id}`);
  return response.data;
};

export const createCase = async (data: Partial<MentalHealthCase>) => {
  const response = await apiClient.post<MentalHealthCase>('/mental-health/cases', data);
  return response.data;
};

export const updateCase = async (id: string, data: Partial<MentalHealthCase>) => {
  const response = await apiClient.put<MentalHealthCase>(`/mental-health/cases/${id}`, data);
  return response.data;
};

export const addAssessment = async (caseId: string, data: Partial<MentalHealthAssessment>) => {
  const response = await apiClient.post<MentalHealthAssessment>('/mental-health/assessments', {
    caseId,
    ...data,
  });
  return response.data;
};

export const getAssessments = async (caseId: string) => {
  try {
    const response = await apiClient.get<MentalHealthAssessment[]>(`/mental-health/cases/${caseId}/assessments`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch mental health assessments');
    return [];
  }
};

export const getStats = async (): Promise<MentalHealthStats> => {
  try {
    const response = await apiClient.get<{
      activeCount?: number;
      overdueFollowUps?: number;
      severityBreakdown?: Array<{ severity?: string; count?: number }>;
    }>('/mental-health/stats');
    const severityBreakdown = response.data?.severityBreakdown || [];
    const severeCases = severityBreakdown
      .filter((item) => item.severity === 'severe')
      .reduce((sum, item) => sum + (item.count || 0), 0);

    return {
      activeCases: response.data?.activeCount || 0,
      severeCases,
      overdueFollowUps: response.data?.overdueFollowUps || 0,
      assessmentsThisMonth: 0,
    };
  } catch {
    console.warn('Failed to fetch mental health statistics');
    return { activeCases: 0, severeCases: 0, overdueFollowUps: 0, assessmentsThisMonth: 0 };
  }
};

export const getOverdueFollowUps = async () => {
  try {
    const response = await apiClient.get<MentalHealthCase[]>('/mental-health/overdue-followups');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch overdue follow-ups');
    return [];
  }
};

export const screenDepression = async (data: { patientId: string; answers: number[] }) => {
  const phq9Score = data.answers.reduce((sum, value) => sum + value, 0);
  const response = await apiClient.post('/mental-health/screen-depression', null, {
    params: {
      caseId: data.patientId,
      phq9Score,
    },
  });
  return response.data;
};

export default {
  searchCases,
  getById,
  createCase,
  updateCase,
  addAssessment,
  getAssessments,
  getStats,
  getOverdueFollowUps,
  screenDepression,
};
