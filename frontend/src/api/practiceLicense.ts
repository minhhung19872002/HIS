import { apiClient } from './client';

// ---- Types ----

export interface PracticeLicense {
  id: string;
  licenseCode: string;
  staffName: string;
  staffCode: string;
  licenseType: 'doctor' | 'pharmacist' | 'nurse' | 'midwife' | 'technician' | 'dentist' | 'traditional_medicine';
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  specialty?: string;
  status: number; // 0=active, 1=expiring, 2=expired, 3=revoked, 4=suspended
  renewalDate?: string;
  practiceScope?: string;
  notes?: string;
}

export interface PracticeLicenseStats {
  totalLicenses: number;
  activeLicenses: number;
  expiringIn30Days: number;
  expiredLicenses: number;
}

// ---- API Functions ----

export const searchLicenses = async (params?: {
  keyword?: string;
  licenseType?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<PracticeLicense[]>('/practice-license/licenses', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch practice licenses');
    return [];
  }
};

export const getById = async (id: string) => {
  const response = await apiClient.get<PracticeLicense>(`/practice-license/licenses/${id}`);
  return response.data;
};

export const createLicense = async (data: Partial<PracticeLicense>) => {
  const response = await apiClient.post<PracticeLicense>('/practice-license/licenses', data);
  return response.data;
};

export const updateLicense = async (id: string, data: Partial<PracticeLicense>) => {
  const response = await apiClient.put<PracticeLicense>(`/practice-license/licenses/${id}`, data);
  return response.data;
};

export const getExpiringLicenses = async () => {
  try {
    const response = await apiClient.get<PracticeLicense[]>('/practice-license/expiring');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch expiring licenses');
    return [];
  }
};

export const getStats = async (): Promise<PracticeLicenseStats> => {
  try {
    const response = await apiClient.get<PracticeLicenseStats>('/practice-license/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch practice license statistics');
    return { totalLicenses: 0, activeLicenses: 0, expiringIn30Days: 0, expiredLicenses: 0 };
  }
};

export const renewLicense = async (id: string, data: { newExpiryDate: string; renewalNotes?: string }) => {
  const response = await apiClient.put(`/practice-license/licenses/${id}/renew`, data);
  return response.data;
};

export default {
  searchLicenses,
  getById,
  createLicense,
  updateLicense,
  getExpiringLicenses,
  getStats,
  renewLicense,
};
