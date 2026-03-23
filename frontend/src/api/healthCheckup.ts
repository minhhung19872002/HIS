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

export default {
  searchHealthCheckups,
  getHealthCheckupById,
  createHealthCheckup,
  updateHealthCheckup,
  deleteHealthCheckup,
  getHealthCheckupStats,
  getCheckupTypes,
};
