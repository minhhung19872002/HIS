import { apiClient } from './client';

// ---- Types ----

export interface HealthCheckup {
  id: string;
  checkupCode: string;
  patientName: string;
  patientCode: string;
  gender: number;
  dateOfBirth: string;
  checkupDate: string;
  checkupType: string;
  companyName?: string;
  groupName?: string;
  examDoctor: string;
  status: number; // 0=pending, 1=inProgress, 2=completed, 3=certified
  conclusion: string; // 'pass' | 'fail' | 'conditional' | ''
  notes?: string;
  internalMedicine?: string;
  surgery?: string;
  ophthalmology?: string;
  entExam?: string;
  dentalExam?: string;
  dermatology?: string;
  gynecology?: string;
  psychiatry?: string;
  labResults?: string;
  xrayResults?: string;
}

export interface HealthCheckupStats {
  totalCheckups: number;
  todayCount: number;
  passCount: number;
  failCount: number;
}

export interface CheckupType {
  code: string;
  name: string;
}

// ---- API Functions ----

export const searchHealthCheckups = async (params?: {
  keyword?: string;
  checkupType?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<HealthCheckup[]>('/health-checkup', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch health checkups');
    return [];
  }
};

export const getHealthCheckupById = async (id: string) => {
  const response = await apiClient.get<HealthCheckup>(`/health-checkup/${id}`);
  return response.data;
};

export const createHealthCheckup = async (data: Partial<HealthCheckup>) => {
  const response = await apiClient.post<HealthCheckup>('/health-checkup', data);
  return response.data;
};

export const updateHealthCheckup = async (id: string, data: Partial<HealthCheckup>) => {
  const response = await apiClient.put<HealthCheckup>(`/health-checkup/${id}`, data);
  return response.data;
};

export const deleteHealthCheckup = async (id: string) => {
  await apiClient.delete(`/health-checkup/${id}`);
};

export const getHealthCheckupStats = async (): Promise<HealthCheckupStats> => {
  try {
    const response = await apiClient.get<HealthCheckupStats>('/health-checkup/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch health checkup statistics');
    return { totalCheckups: 0, todayCount: 0, passCount: 0, failCount: 0 };
  }
};

export const getCheckupTypes = async (): Promise<CheckupType[]> => {
  try {
    const response = await apiClient.get<CheckupType[]>('/health-checkup/types');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch checkup types');
    return [
      { code: 'general_adult', name: 'Tổng quát >= 18 tuổi' },
      { code: 'general_child', name: 'Tổng quát < 18 tuổi' },
      { code: 'periodic', name: 'Định kỳ' },
      { code: 'driver', name: 'Lái xe' },
      { code: 'student', name: 'Học sinh' },
      { code: 'elderly', name: 'Người cao tuổi' },
      { code: 'occupational', name: 'Nghề nghiệp' },
      { code: 'infant', name: 'Trẻ < 24 tháng' },
    ];
  }
};

// ---- Group/Campaign Management ----

export interface CheckupCampaign {
  id: string;
  campaignCode: string;
  campaignName: string;
  companyName: string;
  contactPerson?: string;
  contactPhone?: string;
  startDate: string;
  endDate?: string;
  checkupType: string;
  servicePackage?: string;
  discountPercent: number;
  totalRegistered: number;
  totalCompleted: number;
  totalCost: number;
  status: number; // 0=draft, 1=active, 2=completed, 3=cancelled
  notes?: string;
}

export interface CampaignGroup {
  id: string;
  campaignId: string;
  groupName: string;
  roomAssignment?: string;
  totalMembers: number;
  completedMembers: number;
}

export interface BatchImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export const getCampaigns = async (params?: {
  keyword?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<CheckupCampaign[]> => {
  try {
    const response = await apiClient.get<CheckupCampaign[]>('/health-checkup/campaigns', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch campaigns');
    return [];
  }
};

export const getCampaignById = async (id: string) => {
  const response = await apiClient.get<CheckupCampaign>(`/health-checkup/campaigns/${id}`);
  return response.data;
};

export const createCampaign = async (data: Partial<CheckupCampaign>) => {
  const response = await apiClient.post<CheckupCampaign>('/health-checkup/campaigns', data);
  return response.data;
};

export const updateCampaign = async (id: string, data: Partial<CheckupCampaign>) => {
  const response = await apiClient.put<CheckupCampaign>(`/health-checkup/campaigns/${id}`, data);
  return response.data;
};

export const deleteCampaign = async (id: string) => {
  await apiClient.delete(`/health-checkup/campaigns/${id}`);
};

export const getCampaignGroups = async (campaignId: string): Promise<CampaignGroup[]> => {
  try {
    const response = await apiClient.get<CampaignGroup[]>(`/health-checkup/campaigns/${campaignId}/groups`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch campaign groups');
    return [];
  }
};

export const createCampaignGroup = async (campaignId: string, data: Partial<CampaignGroup>) => {
  const response = await apiClient.post<CampaignGroup>(`/health-checkup/campaigns/${campaignId}/groups`, data);
  return response.data;
};

export const deleteCampaignGroup = async (campaignId: string, groupId: string) => {
  await apiClient.delete(`/health-checkup/campaigns/${campaignId}/groups/${groupId}`);
};

export const importBatchExcel = async (campaignId: string, file: File): Promise<BatchImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<BatchImportResult>(
    `/health-checkup/campaigns/${campaignId}/import`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const getCampaignCostReport = async (campaignId: string) => {
  try {
    const response = await apiClient.get(`/health-checkup/campaigns/${campaignId}/cost-report`);
    return response.data;
  } catch {
    console.warn('Failed to fetch campaign cost report');
    return null;
  }
};

export default {
  searchHealthCheckups,
  getHealthCheckupById,
  createHealthCheckup,
  updateHealthCheckup,
  deleteHealthCheckup,
  getHealthCheckupStats,
  getCheckupTypes,
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignGroups,
  createCampaignGroup,
  deleteCampaignGroup,
  importBatchExcel,
  getCampaignCostReport,
};
