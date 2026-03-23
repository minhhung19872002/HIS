import { apiClient } from './client';

// ---- Types ----

export interface HivPatient {
  id: string;
  patientCode: string;
  hivCode: string; // unique HIV program code
  fullName: string;
  dateOfBirth: string;
  gender: number;
  address?: string;
  phone?: string;
  cccd?: string;
  insuranceNumber?: string;
  diagnosisDate: string;
  enrollmentDate: string;
  artStatus: string; // PreART, OnART, Interrupted, Transferred, Deceased, Lost
  artStartDate?: string;
  currentRegimen?: string;
  whoStage: number; // 1, 2, 3, 4
  lastCd4Count?: number;
  lastCd4Date?: string;
  lastViralLoad?: number;
  lastViralLoadDate?: string;
  viralSuppressed: boolean; // VL < 200 copies/ml
  tbCoinfection: boolean;
  hbvCoinfection: boolean;
  hcvCoinfection: boolean;
  isPregnant: boolean;
  pmtctEnrolled: boolean;
  adherenceStatus: string; // Good, Fair, Poor
  nextAppointmentDate?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  facilityId?: string;
  facilityName?: string;
  notes?: string;
  status: number; // 0=active, 1=transferred, 2=deceased, 3=lost
}

export interface HivLabResult {
  id: string;
  patientId: string;
  testType: string; // CD4, ViralLoad, HIV-DR, HBV-DNA, HCV-RNA, CBC, Liver, Kidney, Lipid
  testDate: string;
  result: number;
  unit: string;
  referenceRange?: string;
  isAbnormal: boolean;
  labName?: string;
  orderedBy?: string;
  notes?: string;
}

export interface PmtctRecord {
  id: string;
  patientId: string;
  patientName: string;
  pregnancyId?: string;
  gestationalAge?: number;
  artBeforePregnancy: boolean;
  artDuringPregnancy: boolean;
  artRegimen?: string;
  artStartWeek?: number;
  viralLoadAtDelivery?: number;
  viralSuppressedAtDelivery: boolean;
  deliveryDate?: string;
  deliveryMode?: string; // Vaginal, Cesarean
  infantId?: string;
  infantName?: string;
  infantProphylaxis: boolean;
  infantProphylaxisRegimen?: string;
  infantTestDate?: string;
  infantTestResult?: string; // Negative, Positive, Pending, Indeterminate
  infantFeedingMethod?: string; // Exclusive_BF, Formula, Mixed
  infantHivStatus?: string; // Uninfected, Infected, Unknown
  status: number; // 0=antenatal, 1=delivered, 2=postnatal, 3=completed
  notes?: string;
}

export interface HivStats {
  totalPatients: number;
  onArt: number;
  viralSuppressed: number;
  pmtctEnrolled: number;
  newEnrollmentsThisMonth: number;
  lostToFollowUp: number;
  artCoverageRate: number; // percentage
  viralSuppressionRate: number; // percentage
  // Cascade data
  cascadeDiagnosed: number;
  cascadeLinked: number;
  cascadeRetained: number;
  cascadeSuppressed: number;
  // PMTCT outcomes
  pmtctMothers: number;
  pmtctInfantsExposed: number;
  pmtctInfantsTested: number;
  pmtctInfantsNegative: number;
  pmtctTransmissionRate: number;
}

// ---- API Functions ----

export const searchPatients = async (params?: {
  keyword?: string;
  artStatus?: string;
  whoStage?: number;
  viralSuppressed?: boolean;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<HivPatient[]>('/hiv-management/patients', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch HIV patients');
    return [];
  }
};

export const getPatientById = async (id: string) => {
  const response = await apiClient.get<HivPatient>(`/hiv-management/patients/${id}`);
  return response.data;
};

export const enrollPatient = async (data: Partial<HivPatient>) => {
  const response = await apiClient.post<HivPatient>('/hiv-management/patients', data);
  return response.data;
};

export const updatePatient = async (id: string, data: Partial<HivPatient>) => {
  const response = await apiClient.put<HivPatient>(`/hiv-management/patients/${id}`, data);
  return response.data;
};

export const addLabResult = async (data: Partial<HivLabResult>) => {
  const response = await apiClient.post<HivLabResult>('/hiv-management/lab-results', data);
  return response.data;
};

export const getLabHistory = async (patientId: string) => {
  try {
    const response = await apiClient.get<HivLabResult[]>(`/hiv-management/patients/${patientId}/lab-results`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch lab history for HIV patient');
    return [];
  }
};

export const addPmtctRecord = async (data: Partial<PmtctRecord>) => {
  const response = await apiClient.post<PmtctRecord>('/hiv-management/pmtct', data);
  return response.data;
};

export const getPmtctRecords = async (params?: {
  keyword?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<PmtctRecord[]>('/hiv-management/pmtct', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch PMTCT records');
    return [];
  }
};

export const getStats = async (): Promise<HivStats> => {
  try {
    const response = await apiClient.get<HivStats>('/hiv-management/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch HIV management statistics');
    return {
      totalPatients: 0,
      onArt: 0,
      viralSuppressed: 0,
      pmtctEnrolled: 0,
      newEnrollmentsThisMonth: 0,
      lostToFollowUp: 0,
      artCoverageRate: 0,
      viralSuppressionRate: 0,
      cascadeDiagnosed: 0,
      cascadeLinked: 0,
      cascadeRetained: 0,
      cascadeSuppressed: 0,
      pmtctMothers: 0,
      pmtctInfantsExposed: 0,
      pmtctInfantsTested: 0,
      pmtctInfantsNegative: 0,
      pmtctTransmissionRate: 0,
    };
  }
};

export default {
  searchPatients,
  getPatientById,
  enrollPatient,
  updatePatient,
  addLabResult,
  getLabHistory,
  addPmtctRecord,
  getPmtctRecords,
  getStats,
};
