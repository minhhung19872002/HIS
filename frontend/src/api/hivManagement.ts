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

type HivPatientDto = {
  id: string;
  patientId: string;
  hivCode: string;
  patientName?: string | null;
  patientCode?: string | null;
  gender?: number | null;
  dateOfBirth?: string | null;
  diagnosisDate: string;
  diagnosisType: string;
  currentARTRegimen?: string | null;
  artStatus: number;
  whoStage: number;
  lastCD4Count?: number | null;
  lastCD4Date?: string | null;
  lastViralLoad?: number | null;
  lastViralLoadDate?: string | null;
  isVirallySuppressed?: boolean | null;
  nextAppointmentDate?: string | null;
  linkedToMethadone: boolean;
};

type HivLabResultDto = {
  id: string;
  hivPatientId: string;
  patientName?: string | null;
  hivCode?: string | null;
  testDate: string;
  testType: string;
  result?: string | null;
  unit?: string | null;
  isAbnormal?: boolean | null;
  labName?: string | null;
  orderedBy?: string | null;
};

type PmtctRecordDto = {
  id: string;
  hivPatientId: string;
  patientName?: string | null;
  hivCode?: string | null;
  gestationalAgeAtDiagnosis?: number | null;
  artDuringPregnancy: boolean;
  deliveryDate?: string | null;
  deliveryMode?: string | null;
  infantProphylaxis: boolean;
  infantHivTestDate?: string | null;
  infantHivTestResult?: string | null;
  breastfeedingStatus?: string | null;
};

type HivStatsDto = {
  totalPatients: number;
  onARTCount: number;
  preARTCount: number;
  virallySuppressedCount: number;
  lostToFollowUpCount: number;
  deceasedCount: number;
  suppressedRate: number;
};

type PmtctStatsDto = {
  totalPregnancies: number;
  artDuringPregnancyCount: number;
  infantProphylaxisCount: number;
  infantTestedCount: number;
  infantPositiveCount: number;
  transmissionRate: number;
};

const ART_STATUS_MAP: Record<number, HivPatient['artStatus']> = {
  0: 'PreART',
  1: 'OnART',
  2: 'Interrupted',
  3: 'Transferred',
  4: 'Deceased',
  5: 'Lost',
};

const parseNumber = (value: string | number | null | undefined): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapPatient = (dto: HivPatientDto): HivPatient => ({
  id: dto.id,
  patientCode: dto.patientCode || '',
  hivCode: dto.hivCode,
  fullName: dto.patientName || '',
  dateOfBirth: dto.dateOfBirth || '',
  gender: dto.gender || 0,
  diagnosisDate: dto.diagnosisDate,
  enrollmentDate: dto.diagnosisDate,
  artStatus: ART_STATUS_MAP[dto.artStatus] || 'PreART',
  artStartDate: undefined,
  currentRegimen: dto.currentARTRegimen || undefined,
  whoStage: dto.whoStage,
  lastCd4Count: dto.lastCD4Count ?? undefined,
  lastCd4Date: dto.lastCD4Date || undefined,
  lastViralLoad: dto.lastViralLoad ?? undefined,
  lastViralLoadDate: dto.lastViralLoadDate || undefined,
  viralSuppressed: Boolean(dto.isVirallySuppressed),
  tbCoinfection: false,
  hbvCoinfection: false,
  hcvCoinfection: false,
  isPregnant: false,
  pmtctEnrolled: false,
  adherenceStatus: '',
  nextAppointmentDate: dto.nextAppointmentDate || undefined,
  assignedDoctorId: undefined,
  assignedDoctorName: undefined,
  facilityId: undefined,
  facilityName: undefined,
  notes: dto.diagnosisType,
  status: 0,
});

const mapLabResult = (dto: HivLabResultDto): HivLabResult => ({
  id: dto.id,
  patientId: dto.hivPatientId,
  testType: dto.testType,
  testDate: dto.testDate,
  result: parseNumber(dto.result) ?? 0,
  unit: dto.unit || '',
  isAbnormal: Boolean(dto.isAbnormal),
  labName: dto.labName || undefined,
  orderedBy: dto.orderedBy || undefined,
  notes: undefined,
});

const mapPmtctRecord = (dto: PmtctRecordDto): PmtctRecord => ({
  id: dto.id,
  patientId: dto.hivPatientId,
  patientName: dto.patientName || '',
  gestationalAge: dto.gestationalAgeAtDiagnosis ?? undefined,
  artBeforePregnancy: false,
  artDuringPregnancy: dto.artDuringPregnancy,
  viralSuppressedAtDelivery: dto.infantHivTestResult === 'Negative',
  deliveryDate: dto.deliveryDate || undefined,
  deliveryMode: dto.deliveryMode || undefined,
  infantProphylaxis: dto.infantProphylaxis,
  infantTestDate: dto.infantHivTestDate || undefined,
  infantTestResult: dto.infantHivTestResult || undefined,
  infantFeedingMethod: dto.breastfeedingStatus || undefined,
  infantHivStatus: dto.infantHivTestResult || undefined,
  status: dto.deliveryDate ? 1 : 0,
});

// ---- API Functions ----

export const searchPatients = async (params?: {
  keyword?: string;
  artStatus?: string;
  whoStage?: number;
  viralSuppressed?: boolean;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<HivPatientDto[]>('/hiv-management/patients', {
      params: {
        keyword: params?.keyword,
        whoStage: params?.whoStage,
        isVirallySuppressed: params?.viralSuppressed,
      },
    });
    return (response.data || []).map(mapPatient);
  } catch {
    console.warn('Failed to fetch HIV patients');
    return [];
  }
};

export const getPatientById = async (id: string) => {
  const response = await apiClient.get<HivPatientDto>(`/hiv-management/patients/${id}`);
  return mapPatient(response.data);
};

export const enrollPatient = async (data: Partial<HivPatient>) => {
  if (!data.id && !(data as Partial<{ patientId: string }>).patientId) {
    throw new Error('Backend HIV enrollment requires an existing patientId');
  }
  const response = await apiClient.post<HivPatientDto>('/hiv-management/patients', {
    patientId: (data as Partial<{ patientId: string }>).patientId || data.id,
    hivCode: data.hivCode,
    diagnosisDate: data.diagnosisDate,
    diagnosisType: 'VCT',
    currentARTRegimen: data.currentRegimen,
    artStartDate: data.artStartDate,
    artStatus: Object.entries(ART_STATUS_MAP).find(([, value]) => value === data.artStatus)?.[0] ?? 0,
    whoStage: data.whoStage ?? 1,
    linkedToMethadone: false,
  });
  return mapPatient(response.data);
};

export const updatePatient = async (id: string, data: Partial<HivPatient>) => {
  const response = await apiClient.put<HivPatientDto>(`/hiv-management/patients/${id}`, {
    currentARTRegimen: data.currentRegimen,
    artStartDate: data.artStartDate,
    artStatus: data.artStatus ? Number(Object.entries(ART_STATUS_MAP).find(([, value]) => value === data.artStatus)?.[0]) : undefined,
    whoStage: data.whoStage,
    lastCD4Count: data.lastCd4Count,
    lastCD4Date: data.lastCd4Date,
    lastViralLoad: data.lastViralLoad,
    lastViralLoadDate: data.lastViralLoadDate,
    isVirallySuppressed: data.viralSuppressed,
    nextAppointmentDate: data.nextAppointmentDate,
  });
  return mapPatient(response.data);
};

export const addLabResult = async (data: Partial<HivLabResult>) => {
  const response = await apiClient.post<HivLabResultDto>('/hiv-management/lab-results', {
    hivPatientId: data.patientId,
    testType: data.testType,
    testDate: data.testDate,
    result: data.result != null ? String(data.result) : undefined,
    unit: data.unit,
    isAbnormal: data.isAbnormal,
    labName: data.labName,
    orderedBy: data.orderedBy,
  });
  return mapLabResult(response.data);
};

export const getLabHistory = async (patientId: string) => {
  try {
    const response = await apiClient.get<HivLabResultDto[]>('/hiv-management/lab-results', {
      params: { hivPatientId: patientId },
    });
    return (response.data || []).map(mapLabResult);
  } catch {
    console.warn('Failed to fetch lab history for HIV patient');
    return [];
  }
};

export const addPmtctRecord = async (data: Partial<PmtctRecord>) => {
  const response = await apiClient.post<PmtctRecordDto>('/hiv-management/pmtct', {
    hivPatientId: data.patientId,
    gestationalAgeAtDiagnosis: data.gestationalAge,
    artDuringPregnancy: data.artDuringPregnancy ?? false,
    deliveryDate: data.deliveryDate,
    deliveryMode: data.deliveryMode,
    infantProphylaxis: data.infantProphylaxis ?? false,
    infantHivTestDate: data.infantTestDate,
    infantHivTestResult: data.infantTestResult,
    breastfeedingStatus: data.infantFeedingMethod,
  });
  return mapPmtctRecord(response.data);
};

export const getPmtctRecords = async (params?: {
  patientId?: string;
  keyword?: string;
  status?: number;
}) => {
  try {
    if (!params?.patientId) return [];
    const response = await apiClient.get<PmtctRecordDto[]>(`/hiv-management/pmtct/${params.patientId}`);
    return (response.data || []).map(mapPmtctRecord);
  } catch {
    console.warn('Failed to fetch PMTCT records');
    return [];
  }
};

export const getStats = async (): Promise<HivStats> => {
  try {
    const [patientResponse, pmtctResponse] = await Promise.allSettled([
      apiClient.get<HivStatsDto>('/hiv-management/patients/stats'),
      apiClient.get<PmtctStatsDto>('/hiv-management/pmtct/stats'),
    ]);
    const patientStats = patientResponse.status === 'fulfilled' ? patientResponse.value.data : null;
    const pmtctStats = pmtctResponse.status === 'fulfilled' ? pmtctResponse.value.data : null;
    return {
      totalPatients: patientStats?.totalPatients ?? 0,
      onArt: patientStats?.onARTCount ?? 0,
      viralSuppressed: patientStats?.virallySuppressedCount ?? 0,
      pmtctEnrolled: pmtctStats?.totalPregnancies ?? 0,
      newEnrollmentsThisMonth: 0,
      lostToFollowUp: patientStats?.lostToFollowUpCount ?? 0,
      artCoverageRate: patientStats ? Math.round(((patientStats.onARTCount || 0) / Math.max(patientStats.totalPatients || 1, 1)) * 1000) / 10 : 0,
      viralSuppressionRate: patientStats?.suppressedRate ?? 0,
      cascadeDiagnosed: patientStats?.totalPatients ?? 0,
      cascadeLinked: patientStats?.totalPatients ?? 0,
      cascadeRetained: patientStats?.onARTCount ?? 0,
      cascadeSuppressed: patientStats?.virallySuppressedCount ?? 0,
      pmtctMothers: pmtctStats?.totalPregnancies ?? 0,
      pmtctInfantsExposed: pmtctStats?.totalPregnancies ?? 0,
      pmtctInfantsTested: pmtctStats?.infantTestedCount ?? 0,
      pmtctInfantsNegative: Math.max((pmtctStats?.infantTestedCount ?? 0) - (pmtctStats?.infantPositiveCount ?? 0), 0),
      pmtctTransmissionRate: pmtctStats?.transmissionRate ?? 0,
    };
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
