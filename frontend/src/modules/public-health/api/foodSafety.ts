import { apiClient } from '../../../services/apiClient';

// ---- Types ----

export interface FoodSafetyIncident {
  id: string;
  incidentCode: string;
  incidentDate: string;
  reportDate: string;
  location: string;
  locationAddress?: string;
  locationType: string; // Restaurant, School, Factory, Hospital, Market, Other
  description: string;
  suspectedFood?: string;
  suspectedCause?: string;
  totalAffected: number;
  hospitalized: number;
  deaths: number;
  severity: number; // 1=mild, 2=moderate, 3=severe, 4=critical
  investigationStatus: number; // 0=reported, 1=investigating, 2=confirmed, 3=closed
  investigationFindings?: string;
  correctiveActions?: string;
  reportedBy: string;
  reportedByName?: string;
  investigatorId?: string;
  investigatorName?: string;
  closedDate?: string;
  closedBy?: string;
  notes?: string;
}

export interface FoodSafetySample {
  id: string;
  incidentId: string;
  sampleCode: string;
  sampleType: string; // Food, Water, Swab, Stool, Blood
  sampleDescription: string;
  collectedDate: string;
  collectedBy: string;
  labId?: string;
  labName?: string;
  sentToLabDate?: string;
  resultDate?: string;
  result: string; // Pending, Negative, Positive
  organism?: string;
  toxin?: string;
  notes?: string;
}

export interface FoodInspection {
  id: string;
  inspectionCode: string;
  inspectionDate: string;
  facilityName: string;
  facilityAddress: string;
  facilityType: string; // Restaurant, Canteen, FoodProcessing, Market, Hospital, School
  inspectorId: string;
  inspectorName: string;
  complianceLevel: string; // A, B, C, D
  overallScore: number;
  hygieneScore: number;
  foodStorageScore: number;
  staffTrainingScore: number;
  documentationScore: number;
  violations: string[];
  correctiveActions?: string;
  reinspectionDate?: string;
  status: number; // 0=scheduled, 1=completed, 2=follow-up, 3=closed
  notes?: string;
}

export interface FoodSafetyStats {
  totalIncidents: number;
  activeInvestigations: number;
  totalAffected: number;
  facilitiesViolating: number;
  avgComplianceScore: number;
  incidentsByMonth: { month: string; count: number }[];
  incidentsByType: { type: string; count: number }[];
  complianceByFacilityType: { type: string; avgScore: number; count: number }[];
}

export interface InspectionStats {
  totalInspections: number;
  avgScore: number;
  complianceA: number;
  complianceB: number;
  complianceC: number;
  complianceD: number;
}

interface FoodIncidentStatsResponse {
  totalIncidents: number;
  activeInvestigations: number;
  totalAffected: number;
  totalHospitalized: number;
  totalDeaths: number;
  byMonth: { month: string; count: number; affectedCount: number }[];
}

interface FoodInspectionStatsResponse {
  totalInspections: number;
  scheduledCount: number;
  completedCount: number;
  followUpNeededCount: number;
  averageScore: number;
  byCompliance: { complianceLevel: string; count: number }[];
}

// ---- API Functions ----

export const searchIncidents = async (params?: {
  keyword?: string;
  severity?: number;
  investigationStatus?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<FoodSafetyIncident[]>('/food-safety/incidents', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch food safety incidents');
    return [];
  }
};

export const getIncidentById = async (id: string) => {
  const response = await apiClient.get<FoodSafetyIncident>(`/food-safety/incidents/${id}`);
  return response.data;
};

// BE FoodIncidentCreate/UpdateDto use reportNumber / foodSource / affectedCount / hospitalizedCount / deathCount /
// severityLevel / symptoms: the FE names were ignored, so every saved incident had 0 affected, 0 deaths, severity 1.
const toIncidentPayload = (data: Partial<FoodSafetyIncident>) => ({
  ...data,
  reportNumber: data.incidentCode,
  foodSource: data.suspectedFood,
  affectedCount: data.totalAffected,
  hospitalizedCount: data.hospitalized,
  deathCount: data.deaths,
  severityLevel: data.severity,
  symptoms: data.description,
});

export const createIncident = async (data: Partial<FoodSafetyIncident>) => {
  const response = await apiClient.post<FoodSafetyIncident>('/food-safety/incidents', toIncidentPayload(data));
  return response.data;
};

export const updateIncident = async (id: string, data: Partial<FoodSafetyIncident>) => {
  const response = await apiClient.put<FoodSafetyIncident>(`/food-safety/incidents/${id}`, toIncidentPayload(data));
  return response.data;
};

export const getIncidentStats = async (): Promise<FoodSafetyStats> => {
  try {
    const response = await apiClient.get<FoodIncidentStatsResponse>('/food-safety/incidents/stats');
    return {
      totalIncidents: response.data.totalIncidents,
      activeInvestigations: response.data.activeInvestigations,
      totalAffected: response.data.totalAffected,
      facilitiesViolating: 0,
      avgComplianceScore: 0,
      incidentsByMonth: response.data.byMonth ?? [],
      incidentsByType: [],
      complianceByFacilityType: [],
    };
  } catch {
    console.warn('Failed to fetch food safety incident statistics');
    return {
      totalIncidents: 0,
      activeInvestigations: 0,
      totalAffected: 0,
      facilitiesViolating: 0,
      avgComplianceScore: 0,
      incidentsByMonth: [],
      incidentsByType: [],
      complianceByFacilityType: [],
    };
  }
};

// BE FoodSampleCreate/Update/ListDto: collectedAt / labResult / labResultDate / pathogensFound / isPositive.
type SampleWire = Partial<FoodSafetySample> & {
  collectedAt?: string; labSentAt?: string; labResult?: string; labResultDate?: string;
  pathogensFound?: string; isPositive?: boolean | null;
};
const fromSampleWire = (s: SampleWire): FoodSafetySample => ({
  id: s.id || '',
  incidentId: s.incidentId || '',
  sampleCode: s.sampleCode || '',
  sampleType: s.sampleType || '',
  sampleDescription: s.sampleDescription || '',
  collectedDate: s.collectedDate ?? s.collectedAt ?? '',
  collectedBy: s.collectedBy || '',
  sentToLabDate: s.sentToLabDate ?? s.labSentAt,
  resultDate: s.resultDate ?? s.labResultDate,
  result: s.result ?? (s.isPositive === true ? 'Positive' : s.isPositive === false ? 'Negative' : 'Pending'),
  organism: s.organism ?? s.pathogensFound,
  notes: s.notes ?? s.labResult,
});

export const addSample = async (data: Partial<FoodSafetySample>) => {
  const response = await apiClient.post<SampleWire>('/food-safety/samples', {
    incidentId: data.incidentId,
    sampleType: data.sampleType,
    sampleCode: data.sampleCode || undefined,
    collectedAt: data.collectedDate || undefined,
    collectedBy: data.collectedBy,
  });
  return fromSampleWire(response.data);
};

// Ghi kết quả xét nghiệm mẫu (PUT /food-safety/samples/{id})
export const updateSampleResult = async (id: string, data: Partial<FoodSafetySample>) => {
  const response = await apiClient.put<SampleWire>(`/food-safety/samples/${id}`, {
    labResult: data.notes,
    labResultDate: data.resultDate || undefined,
    labSentAt: data.sentToLabDate || undefined,
    pathogensFound: data.organism,
    isPositive: data.result === 'Positive' ? true : data.result === 'Negative' ? false : undefined,
  });
  return fromSampleWire(response.data);
};

export const getSamplesByIncident = async (incidentId: string) => {
  try {
    const response = await apiClient.get<SampleWire[]>(`/food-safety/incidents/${incidentId}/samples`);
    return (response.data || []).map(fromSampleWire);
  } catch {
    console.warn('Failed to fetch samples for incident');
    return [];
  }
};

export const searchInspections = async (params?: {
  keyword?: string;
  facilityType?: string;
  complianceLevel?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<FoodInspection[]>('/food-safety/inspections', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch food inspections');
    return [];
  }
};

// BE FoodInspectionCreate/UpdateDto: establishmentName / address / licenseNumber (the list maps inspectionCode
// back from licenseNumber). Before, facility name/address were dropped → inspections saved with an empty name.
const toInspectionPayload = (data: Partial<FoodInspection>) => ({
  ...data,
  establishmentName: data.facilityName,
  address: data.facilityAddress,
  licenseNumber: data.inspectionCode,
});

export const createInspection = async (data: Partial<FoodInspection>) => {
  const response = await apiClient.post<FoodInspection>('/food-safety/inspections', toInspectionPayload(data));
  return response.data;
};

export const updateInspection = async (id: string, data: Partial<FoodInspection>) => {
  // inspectionCode is read-only on edit (and may be a TK-xxxx placeholder) — never write it back as licenseNumber.
  const response = await apiClient.put<FoodInspection>(`/food-safety/inspections/${id}`, { ...toInspectionPayload(data), licenseNumber: undefined });
  return response.data;
};

export const getInspectionStats = async (): Promise<InspectionStats> => {
  try {
    const response = await apiClient.get<FoodInspectionStatsResponse>('/food-safety/inspections/stats');
    const complianceCounts = Object.fromEntries(
      (response.data.byCompliance ?? []).map(item => [item.complianceLevel, item.count]),
    ) as Record<string, number>;

    return {
      totalInspections: response.data.totalInspections,
      avgScore: response.data.averageScore,
      complianceA: complianceCounts.A ?? 0,
      complianceB: complianceCounts.B ?? 0,
      complianceC: complianceCounts.C ?? 0,
      complianceD: complianceCounts.D ?? 0,
    };
  } catch {
    console.warn('Failed to fetch inspection statistics');
    return {
      totalInspections: 0,
      avgScore: 0,
      complianceA: 0,
      complianceB: 0,
      complianceC: 0,
      complianceD: 0,
    };
  }
};

export default {
  searchIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  getIncidentStats,
  addSample,
  getSamplesByIncident,
  searchInspections,
  createInspection,
  updateInspection,
  getInspectionStats,
};
