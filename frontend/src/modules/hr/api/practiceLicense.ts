import { apiClient } from '../../../services/apiClient';

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
  status: number; // BE: 0=active, 1=expired, 2=suspended, 3=revoked ("expiring" is derived from expiryDate)
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

// BE CreatePracticeLicenseDto names: holderName (required) / certificateNumber. The form uses staffName /
// licenseNumber, so posting it as-is was a 400 "HolderName is required" on every create and dropped the number.
const toBePayload = (data: Partial<PracticeLicense>) => {
  const d = data as Partial<PracticeLicense> & { holderName?: string; certificateNumber?: string };
  return { ...data, holderName: d.holderName ?? data.staffName, certificateNumber: d.certificateNumber ?? data.licenseNumber };
};

export const createLicense = async (data: Partial<PracticeLicense>) => {
  const response = await apiClient.post<PracticeLicense>('/practice-license/licenses', toBePayload(data));
  return response.data;
};

export const updateLicense = async (id: string, data: Partial<PracticeLicense>) => {
  const response = await apiClient.put<PracticeLicense>(`/practice-license/licenses/${id}`, toBePayload(data));
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
    const response = await apiClient.get<PracticeLicenseStats>('/practice-license/stats');
    return response.data;
  } catch {
    console.warn('Failed to fetch practice license statistics');
    return { totalLicenses: 0, activeLicenses: 0, expiringIn30Days: 0, expiredLicenses: 0 };
  }
};

export const renewLicense = async (id: string, data: { newExpiryDate: string; renewalNotes?: string }) => {
  const response = await apiClient.put(`/practice-license/licenses/${id}/renew`, null, {
    params: { newExpiryDate: data.newExpiryDate },
  });
  return response.data;
};

export const printLicense = (id: string) =>
  apiClient.get(`/practice-license/licenses/${id}/print`, { responseType: 'blob' });

export default {
  searchLicenses,
  getById,
  createLicense,
  updateLicense,
  getExpiringLicenses,
  getStats,
  renewLicense,
  printLicense,
};
