import apiClient from './client';

export interface LicenseStatusDto {
  hasProfile: boolean;
  isValid: boolean;
  status: 'Valid' | 'NoLicense' | 'Inactive' | 'Expired' | 'NoStaffProfile' | 'NonClinical';
  licenseNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  specialty?: string;
  message: string;
}

export async function getMyLicenseStatus(): Promise<LicenseStatusDto> {
  const { data } = await apiClient.get<LicenseStatusDto>('/doctor-license/me');
  return data;
}
