import { apiClient } from '../../../services/apiClient';

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
    const response = await apiClient.get<Array<HealthCampaign & { organizer?: string }>>('/health-education/campaigns', { params });
    return (response.data || []).map((c) => ({ ...c, organizerName: c.organizerName ?? c.organizer ?? '' }));
  } catch {
    console.warn('Failed to fetch health campaigns');
    return [];
  }
};

// CreateHealthCampaignDto.Organizer / CreateHealthEducationMaterialDto.FilePath — the page's
// organizerName / fileUrl were dropped on save.
const toCampaignWire = (data: Partial<HealthCampaign>) => {
  const { organizerName, ...rest } = data;
  return { ...rest, organizer: organizerName };
};

export const createCampaign = async (data: Partial<HealthCampaign>) => {
  const response = await apiClient.post<HealthCampaign>('/health-education/campaigns', toCampaignWire(data));
  return response.data;
};

export const updateCampaign = async (id: string, data: Partial<HealthCampaign>) => {
  const response = await apiClient.put<HealthCampaign>(`/health-education/campaigns/${id}`, toCampaignWire(data));
  return response.data;
};

export const searchMaterials = async (params?: {
  keyword?: string;
  materialType?: string;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<Array<HealthMaterial & {
      filePath?: string; downloads?: number; isActive?: boolean; createdAt?: string;
    }>>('/health-education/materials', { params });
    // BE HealthEducationMaterialDto: isActive (no draft/published/archived) + createdAt
    return (response.data || []).map((m) => ({
      ...m,
      fileUrl: m.fileUrl ?? m.filePath,
      downloadCount: m.downloadCount ?? m.downloads ?? 0,
      status: m.status ?? (m.isActive === false ? 2 : 1),
      createdDate: m.createdDate ?? m.createdAt ?? '',
    }));
  } catch {
    console.warn('Failed to fetch health materials');
    return [];
  }
};

export const createMaterial = async (data: Partial<HealthMaterial>) => {
  const { fileUrl, ...rest } = data;
  const response = await apiClient.post<HealthMaterial>('/health-education/materials', { ...rest, filePath: fileUrl });
  return response.data;
};

export const getCampaignStats = async (): Promise<CampaignStats> => {
  try {
    const response = await apiClient.get<CampaignStats>('/health-education/stats');
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
