import { apiClient } from '../../../services/apiClient';

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

interface NcdStatsResponse {
  totalScreenings: number;
  highRiskCount: number;
  referredCount: number;
  hypertensionDetected: number;
  diabetesDetected: number;
  averageCVDRisk: number;
}

const isHighRiskHousehold = (riskLevel: Household['riskLevel']) => {
  if (typeof riskLevel === 'number') {
    return riskLevel >= 2;
  }

  return riskLevel === 'High' || riskLevel === 'VeryHigh';
};

const isActiveTeam = (status: CommunityTeam['status'] | string) => status === 0 || status === 'active';

const getNcdStatsRaw = async (): Promise<NcdStatsResponse> => {
  const response = await apiClient.get<NcdStatsResponse>('/community-health/ncd-screenings/stats');
  return response.data;
};

// ---- API Functions ----

// BE HouseholdCreateDto/HouseholdListDto: headOfHousehold / wardName / districtName / phoneNumber and
// riskLevel as int (0..3). The page sent headName/ward/... and "High" → JSON bind failure (400) on every save.
const RISK_TO_INT: Record<string, number> = { Low: 0, Medium: 1, High: 2, VeryHigh: 3 };
const RISK_FROM_INT = ['Low', 'Medium', 'High', 'VeryHigh'];
type HouseholdWire = Omit<Household, 'riskLevel'> & {
  riskLevel: string | number; headOfHousehold?: string; wardName?: string; districtName?: string; phoneNumber?: string;
};
const fromHouseholdWire = (h: HouseholdWire): Household => ({
  ...h,
  headName: h.headName ?? h.headOfHousehold ?? '',
  ward: h.ward ?? h.wardName ?? '',
  district: h.district ?? h.districtName ?? '',
  phone: h.phone ?? h.phoneNumber,
  riskLevel: typeof h.riskLevel === 'number' ? (RISK_FROM_INT[h.riskLevel] ?? 'Low') : h.riskLevel,
});
const toHouseholdWire = (d: Partial<Household>) => {
  const { headName, ward, district, province, phone, riskLevel, ...rest } = d;
  return {
    ...rest,
    headOfHousehold: headName,
    wardName: ward,
    // no province column in HouseholdCreateDto — keep it in the address text instead of dropping it
    address: [rest.address, province].filter(Boolean).join(', ') || undefined,
    districtName: district,
    phoneNumber: phone,
    riskLevel: riskLevel != null ? (RISK_TO_INT[riskLevel] ?? 0) : undefined,
  };
};

export const searchHouseholds = async (params?: {
  keyword?: string;
  ward?: string;
  riskLevel?: string;
  teamId?: string;
  status?: number;
}) => {
  try {
    const { ward, riskLevel, teamId, ...rest } = params || {};
    const response = await apiClient.get<HouseholdWire[]>('/community-health/households', {
      params: {
        ...rest,
        wardName: ward,
        assignedTeamId: teamId,
        riskLevel: riskLevel != null ? RISK_TO_INT[riskLevel] : undefined,
      },
    });
    return (response.data || []).map(fromHouseholdWire);
  } catch {
    console.warn('Failed to fetch households');
    return [];
  }
};

export const getHouseholdById = async (id: string) => {
  const response = await apiClient.get<HouseholdWire>(`/community-health/households/${id}`);
  return fromHouseholdWire(response.data);
};

export const createHousehold = async (data: Partial<Household>) => {
  const response = await apiClient.post<Household>('/community-health/households', {
    // [Required] HouseholdCode — the form has no code field
    householdCode: data.householdCode || `HGD-${dayjsLikeStamp()}`,
    ...toHouseholdWire(data),
  });
  return response.data;
};

export const updateHousehold = async (id: string, data: Partial<Household>) => {
  const response = await apiClient.put<Household>(`/community-health/households/${id}`, toHouseholdWire(data));
  return response.data;
};

const dayjsLikeStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
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
    const { ward, ...rest } = params || {};
    const response = await apiClient.get<Array<CommunityTeam & { assignedWard?: string }>>('/community-health/teams', {
      params: { ...rest, assignedWard: ward },
    });
    return (response.data || []).map((t) => ({ ...t, wardAssigned: t.wardAssigned ?? t.assignedWard ?? '' }));
  } catch {
    console.warn('Failed to fetch community health teams');
    return [];
  }
};

// TeamCreateDto: [Required] teamCode + assignedWard (page sent wardAssigned and no code → 400).
export const createTeam = async (data: Partial<CommunityTeam>) => {
  const { wardAssigned, ...rest } = data;
  const response = await apiClient.post<CommunityTeam>('/community-health/teams', {
    ...rest,
    teamCode: data.teamCode || `TEAM-${dayjsLikeStamp()}`,
    assignedWard: wardAssigned,
  });
  return response.data;
};

export const updateTeam = async (id: string, data: Partial<CommunityTeam>) => {
  const { wardAssigned, ...rest } = data;
  const response = await apiClient.put<CommunityTeam>(`/community-health/teams/${id}`, { ...rest, assignedWard: wardAssigned });
  return response.data;
};

export const getStats = async (): Promise<CommunityHealthStats> => {
  try {
    const [households, screenings, teams, ncdStats] = await Promise.all([
      searchHouseholds(),
      searchNcdScreenings(),
      searchTeams(),
      getNcdStatsRaw(),
    ]);

    const totalMembers = households.reduce((sum, household) => sum + (household.memberCount || 0), 0);
    const highRiskHouseholds = households.filter(household => isHighRiskHousehold(household.riskLevel)).length;
    const activeTeams = teams.filter(team => isActiveTeam(team.status)).length;
    const visitCoverageRate = teams.length
      ? Math.round(teams.reduce((sum, team) => sum + (team.visitCoverage || 0), 0) / teams.length)
      : 0;

    return {
      totalHouseholds: households.length,
      totalMembers,
      screeningsThisMonth: ncdStats.totalScreenings ?? screenings.length,
      highRiskHouseholds,
      activeTeams,
      visitCoverageRate,
      overdueVisits: households.filter(household => household.nextVisitDate && household.lastVisitDate && household.nextVisitDate < household.lastVisitDate).length,
      ncdScreeningRate: totalMembers ? Number(((ncdStats.totalScreenings / totalMembers) * 100).toFixed(1)) : 0,
      bpElevatedRate: ncdStats.totalScreenings ? Number(((ncdStats.hypertensionDetected / ncdStats.totalScreenings) * 100).toFixed(1)) : 0,
      diabetesRate: ncdStats.totalScreenings ? Number(((ncdStats.diabetesDetected / ncdStats.totalScreenings) * 100).toFixed(1)) : 0,
      overweightRate: screenings.length
        ? Number(((screenings.filter(screening => (screening.bmi ?? 0) >= 25).length / screenings.length) * 100).toFixed(1))
        : 0,
      highCvdRiskRate: ncdStats.averageCVDRisk ?? 0,
    };
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
    const response = await apiClient.get<Household[]>(`/community-health/households/by-risk/${riskLevel}`);
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
