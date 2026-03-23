import { apiClient } from './client';

// ---- Types ----

export interface HealthCampaign {
  id: string;
  campaignCode: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: number; // 0=planned, 1=ongoing, 2=completed, 3=cancelled
  targetAudience: string;
  location: string;
  participantCount: number;
  organizerName: string;
  budget?: number;
  notes?: string;
}

export interface HealthMaterial {
  id: string;
  materialCode: string;
  title: string;
  materialType: 'poster' | 'brochure' | 'video' | 'audio' | 'presentation' | 'infographic' | 'other';
  topic: string;
  language: string;
  createdDate: string;
  author: string;
  fileUrl?: string;
  downloadCount: number;
  status: number; // 0=draft, 1=published, 2=archived
  notes?: string;
}

export interface CampaignStats {
  campaignsThisYear: number;
  ongoingCampaigns: number;
  totalParticipants: number;
  totalMaterials: number;
}

// ---- API Functions ----

export const searchCampaigns = async (params?: {
  keyword?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<HealthCampaign[]>('/health-education/campaigns', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch health campaigns');
    return [];
  }
};

export const createCampaign = async (data: Partial<HealthCampaign>) => {
  const response = await apiClient.post<HealthCampaign>('/health-education/campaigns', data);
  return response.data;
};

export const updateCampaign = async (id: string, data: Partial<HealthCampaign>) => {
  const response = await apiClient.put<HealthCampaign>(`/health-education/campaigns/${id}`, data);
  return response.data;
};

export const searchMaterials = async (params?: {
  keyword?: string;
  materialType?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<HealthMaterial[]>('/health-education/materials', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch health materials');
    return [];
  }
};

export const createMaterial = async (data: Partial<HealthMaterial>) => {
  const response = await apiClient.post<HealthMaterial>('/health-education/materials', data);
  return response.data;
};

export const getCampaignStats = async (): Promise<CampaignStats> => {
  try {
    const response = await apiClient.get<CampaignStats>('/health-education/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch campaign statistics');
    return { campaignsThisYear: 0, ongoingCampaigns: 0, totalParticipants: 0, totalMaterials: 0 };
  }
};

export default {
  searchCampaigns,
  createCampaign,
  updateCampaign,
  searchMaterials,
  createMaterial,
  getCampaignStats,
};
