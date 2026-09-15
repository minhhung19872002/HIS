import apiClient from '../../../services/apiClient';

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

/** Server-side prescribing/ordering gate — the same evaluation the API uses to refuse (403 PRACTICE_LICENSE_BLOCKED). */
export interface PracticeLicenseGateDto {
  level: 'Ok' | 'Warning' | 'Blocked';
  blocked: boolean;
  status: 'Valid' | 'ExpiringSoon' | 'Mismatch' | 'NoData' | 'Expired' | 'Suspended' | 'Revoked';
  message: string;
  licenseNumber?: string;
  expiryDate?: string;
}

export async function getMyPrescribingGate(): Promise<PracticeLicenseGateDto> {
  const { data } = await apiClient.get<PracticeLicenseGateDto>('/doctor-license/me/gate');
  return data;
}

export async function getMyLicenseStatus(): Promise<LicenseStatusDto> {
  const { data } = await apiClient.get<LicenseStatusDto>('/doctor-license/me');
  return data;
}
