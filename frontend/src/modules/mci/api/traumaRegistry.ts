import { apiClient } from '../../../services/apiClient';

// ---- Types ----

export type TraumaOutcome = 'discharged' | 'transferred' | 'died' | 'absconded';
export const TRAUMA_OUTCOME_LABEL: Record<TraumaOutcome, string> = {
  discharged: 'Ra viện', transferred: 'Chuyển viện', died: 'Tử vong', absconded: 'Bỏ về',
};

export interface TraumaOutcomePayload {
  outcome: TraumaOutcome;
  dischargeDate: string;
  lengthOfStay?: number;
  ventilatorDays?: number;
  notes?: string;
}

export interface TraumaCase {
  id: string;
  caseCode: string;
  patientName: string;
  patientCode: string;
  injuryDate: string;
  admissionDate: string;
  injuryType: string;
  injuryMechanism: string;
  triageCategory: 'red' | 'yellow' | 'green' | 'black';
  issScore: number;
  rtsScore: number;
  gcsScore: number;
  status: number; // 0=admitted, 1=icu, 2=ward, 3=discharged, 4=deceased
  // BE TraumaCase.Outcome vocabulary; '' until the outcome is recorded (v2 page normalises BE null → '')
  outcome: TraumaOutcome | '';
  dischargeDate?: string | null;
  lengthOfStay?: number;
  surgeryRequired: boolean;
  icuDays?: number;
  ventilatorDays?: number;
  attendingDoctor: string;
  notes?: string;
}

export interface TraumaStats {
  totalCasesThisMonth: number;
  mortalityRate: number;
  avgIssScore: number;
  avgLengthOfStay: number;
}

export interface TraumaOutcomeReport {
  totalCases: number;
  outcomeBreakdown: { outcome: string; count: number; percentage: number }[];
  triageBreakdown: { category: string; count: number }[];
  injuryTypeBreakdown: { type: string; count: number }[];
}

// ---- API Functions ----

export const searchCases = async (params?: {
  keyword?: string;
  status?: number;
  triageCategory?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<TraumaCase[]>('/trauma-registry/cases', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch trauma cases');
    return [];
  }
};

export const getById = async (id: string) => {
  const response = await apiClient.get<TraumaCase>(`/trauma-registry/cases/${id}`);
  return response.data;
};

// BE CreateTraumaCaseDto uses injurySeverityScore / revisedTraumaScore / glasgowComaScale — the FE names
// (issScore/rtsScore/gcsScore) were silently dropped, so scores entered on the form were never saved.
// GCS 0 is the page's "empty" placeholder (valid range 3-15) → send undefined.
const toCasePayload = (data: Partial<TraumaCase>) => ({
  ...data,
  injurySeverityScore: data.issScore,
  revisedTraumaScore: data.rtsScore,
  glasgowComaScale: data.gcsScore || undefined,
});

export const createCase = async (data: Partial<TraumaCase>) => {
  const response = await apiClient.post<TraumaCase>('/trauma-registry/cases', toCasePayload(data));
  return response.data;
};

export const updateCase = async (id: string, data: Partial<TraumaCase>) => {
  const response = await apiClient.put<TraumaCase>(`/trauma-registry/cases/${id}`, toCasePayload(data));
  return response.data;
};

// QA-R3: outcome / discharge date / LOS — PUT /trauma-registry/cases/{id}/outcome
export const updateOutcome = async (id: string, data: TraumaOutcomePayload) => {
  const response = await apiClient.put<TraumaCase>(`/trauma-registry/cases/${id}/outcome`, data);
  return response.data;
};

export const getStats = async (): Promise<TraumaStats> => {
  try {
    const response = await apiClient.get<TraumaStats>('/trauma-registry/stats');
    return response.data;
  } catch {
    console.warn('Failed to fetch trauma statistics');
    return { totalCasesThisMonth: 0, mortalityRate: 0, avgIssScore: 0, avgLengthOfStay: 0 };
  }
};

export const getOutcomeReport = async (params?: {
  fromDate?: string;
  toDate?: string;
}): Promise<TraumaOutcomeReport> => {
  try {
    const response = await apiClient.get<TraumaOutcomeReport>('/trauma-registry/outcome-report', { params });
    return response.data;
  } catch {
    console.warn('Failed to fetch trauma outcome report');
    return { totalCases: 0, outcomeBreakdown: [], triageBreakdown: [], injuryTypeBreakdown: [] };
  }
};

export default {
  searchCases,
  getById,
  createCase,
  updateCase,
  updateOutcome,
  getStats,
  getOutcomeReport,
};
