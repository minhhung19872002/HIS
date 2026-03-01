import apiClient from './client';

const BASE_URL = '/cds';

// ===== Request Types =====

export interface DiagnosisSuggestionRequest {
  symptoms: string[];
  signs: string[];
  age?: number;
  gender?: number;
  temperature?: number;
  pulse?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  respiratoryRate?: number;
  spO2?: number;
  departmentId?: string;
}

export interface EarlyWarningScoreRequest {
  pulse?: number;
  bloodPressureSystolic?: number;
  respiratoryRate?: number;
  temperature?: number;
  spO2?: number;
  consciousnessLevel?: number; // 0=Alert, 1=Voice, 2=Pain, 3=Unresponsive
  isOnSupplementalOxygen?: boolean;
}

// ===== Response Types =====

export interface DiagnosisSuggestion {
  icdCode: string;
  icdName: string;
  englishName?: string;
  confidence: number;
  confidenceLevel: string;
  matchedSymptoms: string[];
  matchedSigns: string[];
  reasoning?: string;
  category?: string;
  isCommonInDepartment: boolean;
}

export interface EarlyWarningScore {
  totalScore: number;
  riskLevel: string;
  riskColor: string;
  recommendation: string;
  monitoringFrequencyMinutes: number;
  parameters: EarlyWarningParameter[];
}

export interface EarlyWarningParameter {
  name: string;
  value: string;
  score: number;
  alert?: string;
}

export interface ClinicalAlert {
  alertType: string;
  severity: string;
  severityColor: string;
  title: string;
  message: string;
  actionRecommendation?: string;
  source?: string;
  timestamp?: string;
}

export interface ClinicalDecisionSupportResult {
  suggestedDiagnoses: DiagnosisSuggestion[];
  earlyWarningScore?: EarlyWarningScore;
  alerts: ClinicalAlert[];
  frequentDiagnoses: Array<{ code: string; name: string; englishName?: string }>;
}

// ===== API Functions =====

export const suggestDiagnoses = (request: DiagnosisSuggestionRequest) =>
  apiClient.post<DiagnosisSuggestion[]>(`${BASE_URL}/suggest-diagnoses`, request);

export const calculateEarlyWarningScore = (request: EarlyWarningScoreRequest) =>
  apiClient.post<EarlyWarningScore>(`${BASE_URL}/early-warning-score`, request);

export const getClinicalAlerts = (patientId: string, examinationId?: string) =>
  apiClient.get<ClinicalAlert[]>(`${BASE_URL}/alerts/${patientId}`, {
    params: examinationId ? { examinationId } : undefined,
  });

export const getFullCds = (patientId: string, examinationId?: string, request?: DiagnosisSuggestionRequest) =>
  apiClient.post<ClinicalDecisionSupportResult>(`${BASE_URL}/full/${patientId}`, request || {}, {
    params: examinationId ? { examinationId } : undefined,
  });

export const getFrequentDiagnoses = (departmentId?: string, limit = 10) =>
  apiClient.get<Array<{ code: string; name: string; englishName?: string }>>(`${BASE_URL}/frequent-diagnoses`, {
    params: { departmentId, limit },
  });

export default {
  suggestDiagnoses,
  calculateEarlyWarningScore,
  getClinicalAlerts,
  getFullCds,
  getFrequentDiagnoses,
};
