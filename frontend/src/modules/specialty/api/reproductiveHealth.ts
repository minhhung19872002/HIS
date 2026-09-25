import { apiClient } from '../../../services/apiClient';

// ---- Types ----

export interface PrenatalRecord {
  id: string;
  recordCode: string;
  patientName: string;
  patientCode: string;
  dateOfBirth: string;
  gestationalWeeks: number;
  expectedDeliveryDate: string;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  status: number; // 0=active, 1=delivered, 2=completed, 3=cancelled
  visitCount: number;
  lastVisitDate?: string;
  bloodType?: string;
  gravida: number;
  para: number;
  doctorName: string;
  notes?: string;
}

export interface FamilyPlanningRecord {
  id: string;
  recordCode: string;
  patientName: string;
  patientCode: string;
  method: 'iud' | 'pill' | 'injection' | 'implant' | 'condom' | 'sterilization' | 'natural' | 'other';
  startDate: string;
  nextVisitDate?: string;
  status: number; // 0=active, 1=discontinued, 2=changed
  sideEffects?: string;
  doctorName: string;
  notes?: string;
}

export interface ReproductiveHealthStats {
  activePregnancies: number;
  highRiskCount: number;
  familyPlanningActive: number;
  deliveriesThisMonth: number;
}

// ---- API Functions ----

const normalizePatientFields = <T extends { recordCode: string; patientName: string; patientCode: string }>(record: T): T => ({
  ...record,
  // Historical production rows may not be linked to a patient yet. Keep the
  // UI searchable and renderable even when those legacy columns are null.
  recordCode: record.recordCode ?? '',
  patientName: record.patientName ?? '',
  patientCode: record.patientCode ?? '',
});

// BE contract (ReproductiveHealthDTOs.cs): gestational age is `gestationalAge`, family-planning
// follow-up is `followUpDate`, prescriber is `provider`. The v2 page used other names, so the
// gestational age column rendered "undefinedt" and edits/creates silently dropped these fields.
type PrenatalWire = Omit<PrenatalRecord, 'gestationalWeeks'> & { gestationalAge?: number; gestationalWeeks?: number };
const fromPrenatalWire = (r: PrenatalWire): PrenatalRecord => ({
  ...normalizePatientFields(r as PrenatalRecord),
  gestationalWeeks: r.gestationalWeeks ?? r.gestationalAge ?? 0,
});
const toPrenatalWire = (d: Partial<PrenatalRecord>) => {
  const { gestationalWeeks, ...rest } = d;
  return { ...rest, gestationalAge: gestationalWeeks };
};
type FpWire = FamilyPlanningRecord & { followUpDate?: string; provider?: string };
const fromFpWire = (r: FpWire): FamilyPlanningRecord => ({
  ...normalizePatientFields(r),
  nextVisitDate: r.nextVisitDate ?? r.followUpDate,
  doctorName: r.doctorName ?? r.provider ?? '',
});
const toFpWire = (d: Partial<FamilyPlanningRecord>) => {
  const { nextVisitDate, doctorName, ...rest } = d;
  return { ...rest, followUpDate: nextVisitDate, provider: doctorName };
};

export const searchPrenatal = async (params?: {
  keyword?: string;
  riskLevel?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<PrenatalWire[]>('/reproductive-health/prenatal', { params });
    return (response.data || []).map(fromPrenatalWire);
  } catch {
    console.warn('Failed to fetch prenatal records');
    return [];
  }
};

export const getPrenatalById = async (id: string) => {
  const response = await apiClient.get<PrenatalWire>(`/reproductive-health/prenatal/${id}`);
  return fromPrenatalWire(response.data);
};

export const createPrenatal = async (data: Partial<PrenatalRecord>) => {
  const response = await apiClient.post<PrenatalRecord>('/reproductive-health/prenatal', toPrenatalWire(data));
  return response.data;
};

export const updatePrenatal = async (id: string, data: Partial<PrenatalRecord>) => {
  const response = await apiClient.put<PrenatalRecord>(`/reproductive-health/prenatal/${id}`, toPrenatalWire(data));
  return response.data;
};

export const searchFamilyPlanning = async (params?: {
  keyword?: string;
  method?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<FpWire[]>('/reproductive-health/family-planning', { params });
    return (response.data || []).map(fromFpWire);
  } catch {
    console.warn('Failed to fetch family planning records');
    return [];
  }
};

export const createFamilyPlanning = async (data: Partial<FamilyPlanningRecord>) => {
  const response = await apiClient.post<FamilyPlanningRecord>('/reproductive-health/family-planning', toFpWire(data));
  return response.data;
};

export const updateFamilyPlanning = async (id: string, data: Partial<FamilyPlanningRecord>) => {
  const response = await apiClient.put<FamilyPlanningRecord>(`/reproductive-health/family-planning/${id}`, toFpWire(data));
  return response.data;
};

export const getStats = async (): Promise<ReproductiveHealthStats> => {
  try {
    // BE ReproductiveHealthStatsDto: activePrenatal / highRiskPrenatal / activeFamilyPlanning / deliveredThisMonth
    // (the page read activePregnancies… → every KPI was blank)
    const response = await apiClient.get<Partial<ReproductiveHealthStats> & {
      activePrenatal?: number; highRiskPrenatal?: number; activeFamilyPlanning?: number; deliveredThisMonth?: number;
    }>('/reproductive-health/stats');
    const s = response.data || {};
    return {
      activePregnancies: s.activePregnancies ?? s.activePrenatal ?? 0,
      highRiskCount: s.highRiskCount ?? s.highRiskPrenatal ?? 0,
      familyPlanningActive: s.familyPlanningActive ?? s.activeFamilyPlanning ?? 0,
      deliveriesThisMonth: s.deliveriesThisMonth ?? s.deliveredThisMonth ?? 0,
    };
  } catch {
    console.warn('Failed to fetch reproductive health statistics');
    return { activePregnancies: 0, highRiskCount: 0, familyPlanningActive: 0, deliveriesThisMonth: 0 };
  }
};

export const getHighRiskPregnancies = async () => {
  try {
    const response = await apiClient.get<PrenatalWire[]>('/reproductive-health/high-risk');
    return (response.data || []).map(fromPrenatalWire);
  } catch {
    console.warn('Failed to fetch high risk pregnancies');
    return [];
  }
};

export default {
  searchPrenatal,
  getPrenatalById,
  createPrenatal,
  updatePrenatal,
  searchFamilyPlanning,
  createFamilyPlanning,
  updateFamilyPlanning,
  getStats,
  getHighRiskPregnancies,
};
