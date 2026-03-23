import { apiClient } from './client';

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

export const createIncident = async (data: Partial<FoodSafetyIncident>) => {
  const response = await apiClient.post<FoodSafetyIncident>('/food-safety/incidents', data);
  return response.data;
};

export const updateIncident = async (id: string, data: Partial<FoodSafetyIncident>) => {
  const response = await apiClient.put<FoodSafetyIncident>(`/food-safety/incidents/${id}`, data);
  return response.data;
};

export const getIncidentStats = async (): Promise<FoodSafetyStats> => {
  try {
    const response = await apiClient.get<FoodSafetyStats>('/food-safety/incidents/statistics');
    return response.data;
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

export const addSample = async (data: Partial<FoodSafetySample>) => {
  const response = await apiClient.post<FoodSafetySample>('/food-safety/samples', data);
  return response.data;
};

export const getSamplesByIncident = async (incidentId: string) => {
  try {
    const response = await apiClient.get<FoodSafetySample[]>(`/food-safety/incidents/${incidentId}/samples`);
    return response.data || [];
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

export const createInspection = async (data: Partial<FoodInspection>) => {
  const response = await apiClient.post<FoodInspection>('/food-safety/inspections', data);
  return response.data;
};

export const updateInspection = async (id: string, data: Partial<FoodInspection>) => {
  const response = await apiClient.put<FoodInspection>(`/food-safety/inspections/${id}`, data);
  return response.data;
};

export const getInspectionStats = async (): Promise<InspectionStats> => {
  try {
    const response = await apiClient.get<InspectionStats>('/food-safety/inspections/statistics');
    return response.data;
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
