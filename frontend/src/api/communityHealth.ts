import { apiClient } from './client';

// ---- Types ----

export interface Household {
  id: string;
  householdCode: string;
  headName: string;
  address: string;
  ward: string;
  district: string;
  province: string;
  phone?: string;
  memberCount: number;
  riskLevel: string; // Low, Medium, High, VeryHigh
  assignedTeamId?: string;
  assignedTeamName?: string;
  lastVisitDate?: string;
  nextVisitDate?: string;
  hasElderlyMember: boolean;
  hasChildUnder5: boolean;
  hasPregnant: boolean;
  hasChronicDisease: boolean;
  notes?: string;
  status: number; // 0=active, 1=inactive, 2=moved
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  fullName: string;
  dateOfBirth: string;
  gender: number;
  relationship: string; // Head, Spouse, Child, Parent, Sibling, Other
  cccd?: string;
  insuranceNumber?: string;
  occupation?: string;
  chronicDiseases?: string[];
  lastScreeningDate?: string;
  riskFactors?: string[];
}

export interface NcdScreening {
  id: string;
  screeningCode: string;
  patientName: string;
  patientCode?: string;
  householdId?: string;
  dateOfBirth: string;
  gender: number;
  screeningDate: string;
  screenerName: string;
  // Blood pressure
  systolicBP: number;
  diastolicBP: number;
  bpClassification: string; // Normal, Elevated, Stage1, Stage2, Crisis
  // Glucose
  fastingGlucose?: number;
  randomGlucose?: number;
  hba1c?: number;
  glucoseClassification?: string; // Normal, Prediabetes, Diabetes
  // BMI
  height: number;
  weight: number;
  bmi: number;
  bmiClassification: string; // Underweight, Normal, Overweight, Obese
  // CVD Risk
  isSmoker: boolean;
  alcoholUse: string; // None, Occasional, Regular, Heavy
  physicalActivity: string; // Active, Moderate, Sedentary
  familyHistoryCVD: boolean;
  cvdRiskScore: number; // 0-100 WHO/ISH score
  cvdRiskLevel: string; // Low, Medium, High, VeryHigh
  // Follow-up
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  referralRequired: boolean;
  referralFacility?: string;
  status: number; // 0=completed, 1=pending-follow-up, 2=referred
}

export interface CommunityTeam {
  id: string;
  teamCode: string;
  teamName: string;
  leaderId: string;
  leaderName: string;
  wardAssigned: string;
  memberCount: number;
  activeHouseholds: number;
  visitCoverage: number; // 0-100%
  lastActivityDate?: string;
  phone?: string;
  notes?: string;
  status: number; // 0=active, 1=inactive
}

export interface CommunityHealthStats {
  totalHouseholds: number;
  totalMembers: number;
  screeningsThisMonth: number;
  highRiskHouseholds: number;
  activeTeams: number;
  visitCoverageRate: number;
  overdueVisits: number;
  ncdScreeningRate: number;
  bpElevatedRate: number;
  diabetesRate: number;
  overweightRate: number;
  highCvdRiskRate: number;
}

// ---- API Functions ----

export const searchHouseholds = async (params?: {
  keyword?: string;
  ward?: string;
  riskLevel?: string;
  teamId?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<Household[]>('/community-health/households', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch households');
    return [];
  }
};

export const getHouseholdById = async (id: string) => {
  const response = await apiClient.get<Household>(`/community-health/households/${id}`);
  return response.data;
};

export const createHousehold = async (data: Partial<Household>) => {
  const response = await apiClient.post<Household>('/community-health/households', data);
  return response.data;
};

export const updateHousehold = async (id: string, data: Partial<Household>) => {
  const response = await apiClient.put<Household>(`/community-health/households/${id}`, data);
  return response.data;
};

export const getHouseholdMembers = async (householdId: string) => {
  try {
    const response = await apiClient.get<HouseholdMember[]>(`/community-health/households/${householdId}/members`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch household members');
    return [];
  }
};

export const searchNcdScreenings = async (params?: {
  keyword?: string;
  cvdRiskLevel?: string;
  bpClassification?: string;
  fromDate?: string;
  toDate?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<NcdScreening[]>('/community-health/ncd-screenings', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch NCD screenings');
    return [];
  }
};

export const createNcdScreening = async (data: Partial<NcdScreening>) => {
  const response = await apiClient.post<NcdScreening>('/community-health/ncd-screenings', data);
  return response.data;
};

export const updateNcdScreening = async (id: string, data: Partial<NcdScreening>) => {
  const response = await apiClient.put<NcdScreening>(`/community-health/ncd-screenings/${id}`, data);
  return response.data;
};

export const searchTeams = async (params?: {
  keyword?: string;
  ward?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<CommunityTeam[]>('/community-health/teams', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch community health teams');
    return [];
  }
};

export const createTeam = async (data: Partial<CommunityTeam>) => {
  const response = await apiClient.post<CommunityTeam>('/community-health/teams', data);
  return response.data;
};

export const updateTeam = async (id: string, data: Partial<CommunityTeam>) => {
  const response = await apiClient.put<CommunityTeam>(`/community-health/teams/${id}`, data);
  return response.data;
};

export const getStats = async (): Promise<CommunityHealthStats> => {
  try {
    const response = await apiClient.get<CommunityHealthStats>('/community-health/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch community health statistics');
    return {
      totalHouseholds: 0,
      totalMembers: 0,
      screeningsThisMonth: 0,
      highRiskHouseholds: 0,
      activeTeams: 0,
      visitCoverageRate: 0,
      overdueVisits: 0,
      ncdScreeningRate: 0,
      bpElevatedRate: 0,
      diabetesRate: 0,
      overweightRate: 0,
      highCvdRiskRate: 0,
    };
  }
};

export const getOverdueVisits = async () => {
  try {
    const response = await apiClient.get<Household[]>('/community-health/households/overdue-visits');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch overdue visits');
    return [];
  }
};

export const getHouseholdsByRisk = async (riskLevel: string) => {
  try {
    const response = await apiClient.get<Household[]>('/community-health/households/by-risk', { params: { riskLevel } });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch households by risk level');
    return [];
  }
};

export default {
  searchHouseholds,
  getHouseholdById,
  createHousehold,
  updateHousehold,
  getHouseholdMembers,
  searchNcdScreenings,
  createNcdScreening,
  updateNcdScreening,
  searchTeams,
  createTeam,
  updateTeam,
  getStats,
  getOverdueVisits,
  getHouseholdsByRisk,
};
