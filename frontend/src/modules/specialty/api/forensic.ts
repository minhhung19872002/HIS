import { apiClient } from '../../../services/apiClient';

// ---- Types ----

export interface ForensicCase {
  id: string;
  caseCode: string;
  // Only present on the detail endpoint (getCaseById) — list rows don't carry it.
  patientId?: string;
  patientName: string;
  patientCode: string;
  caseType: 'disability' | 'driver' | 'employment' | 'insurance' | 'court';
  requestDate: string;
  requestingOrganization: string;
  purpose: string;
  status: number; // 0=pending, 1=examining, 2=completed, 3=approved
  disabilityPercent?: number;
  conclusion?: string;
  examinerId?: string;
  examinerName?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface ForensicExamination {
  id: string;
  caseId: string;
  examType: string;
  findings: string;
  conclusion: string;
  examinerName: string;
  examDate: string;
}

export interface ForensicStats {
  totalCases: number;
  pendingCases: number;
  completedThisMonth: number;
  avgDisabilityPercent: number;
}

// ---- API Functions ----

export const searchCases = async (params?: {
  keyword?: string;
  status?: number;
  caseType?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<Array<ForensicCase & { disabilityPercentage?: number }>>('/forensic/cases', { params });
    // BE ForensicCaseDto names the field disabilityPercentage; the page reads disabilityPercent (column was always "—").
    return (response.data || []).map((c) => ({ ...c, disabilityPercent: c.disabilityPercent ?? c.disabilityPercentage }));
  } catch {
    console.warn('Failed to fetch forensic cases');
    return [];
  }
};

export const getCaseById = async (id: string) => {
  const response = await apiClient.get<ForensicCase>(`/forensic/cases/${id}`);
  return response.data;
};

export const createCase = async (data: Partial<ForensicCase>) => {
  const response = await apiClient.post<ForensicCase>('/forensic/cases', data);
  return response.data;
};

export const updateCase = async (id: string, data: Partial<ForensicCase>) => {
  const response = await apiClient.put<ForensicCase>(`/forensic/cases/${id}`, data);
  return response.data;
};

// BE ForensicExaminationDto: examCategory / functionScore / disabilityScore / examDate (the drawer read examType →
// every exam card had an empty title).
type ExamWire = ForensicExamination & {
  forensicCaseId?: string; examCategory?: string; functionScore?: number | null; disabilityScore?: number | null; notes?: string;
};
export const getExaminations = async (caseId: string) => {
  try {
    const response = await apiClient.get<ExamWire[]>(`/forensic/cases/${caseId}/examinations`);
    return (response.data || []).map((e) => ({
      ...e,
      caseId: e.caseId ?? e.forensicCaseId ?? caseId,
      examType: e.examType ?? e.examCategory ?? '',
      conclusion: e.conclusion ?? [
        e.functionScore != null ? `Điểm chức năng: ${e.functionScore}` : '',
        e.disabilityScore != null ? `Tổn thương: ${e.disabilityScore}%` : '',
        e.notes ?? '',
      ].filter(Boolean).join(' · '),
    }));
  } catch {
    console.warn('Failed to fetch forensic examinations');
    return [];
  }
};

// CreateForensicExaminationDto: forensicCaseId + examCategory (the old body sent caseId → 404 "không tìm thấy hồ sơ").
export const addExamination = async (caseId: string, data: {
  examCategory?: string; findings?: string; functionScore?: number; disabilityScore?: number;
  examinerName?: string; notes?: string;
}) => {
  const response = await apiClient.post<ForensicExamination>('/forensic/examinations', { forensicCaseId: caseId, ...data });
  return response.data;
};

// BE reads conclusion + disabilityPercentage from the query string and REQUIRES a conclusion —
// the old call sent neither, so "Duyệt" always failed.
export const approveCase = async (id: string, conclusion?: string, disabilityPercentage?: number) => {
  const response = await apiClient.put(`/forensic/cases/${id}/approve`, null, {
    params: { conclusion, disabilityPercentage },
  });
  return response.data;
};

export const getStats = async (): Promise<ForensicStats> => {
  try {
    // BE ForensicStatsDto: pendingCount / approvedThisMonth / avgDisabilityPercent (page read pendingCases → always 0)
    const response = await apiClient.get<ForensicStats & { pendingCount?: number; approvedThisMonth?: number }>('/forensic/stats');
    const s = response.data;
    return {
      totalCases: s?.totalCases ?? 0,
      pendingCases: s?.pendingCases ?? s?.pendingCount ?? 0,
      completedThisMonth: s?.completedThisMonth ?? s?.approvedThisMonth ?? 0,
      avgDisabilityPercent: s?.avgDisabilityPercent ?? 0,
    };
  } catch {
    console.warn('Failed to fetch forensic statistics');
    return { totalCases: 0, pendingCases: 0, completedThisMonth: 0, avgDisabilityPercent: 0 };
  }
};

export const printCertificate = async (id: string) => {
  const response = await apiClient.get(`/forensic/cases/${id}/print`, { responseType: 'blob' });
  return response.data;
};

export default {
  searchCases,
  getCaseById,
  createCase,
  updateCase,
  getExaminations,
  addExamination,
  approveCase,
  getStats,
  printCertificate,
};
