import apiClient from './client';

export const PATIENT_FLAG_TYPES: Record<number, string> = {
  1: 'Dị ứng nặng',
  2: 'Nợ viện phí',
  3: 'Lạm dụng BHYT',
  4: 'VIP',
  5: 'Nguy cơ tự tử/bạo hành',
  6: 'Bệnh truyền nhiễm',
  7: 'Cảnh báo khác',
};

export interface PatientFlagDto {
  id: string;
  patientId: string;
  flagType: number;
  flagTypeName: string;
  color: string;
  note: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  createdByName?: string;
}

export interface SavePatientFlagRequest {
  id?: string;
  patientId: string;
  flagType: number;
  color: string;
  note: string;
  expiresAt?: string;
}

export async function getPatientFlags(patientId: string) {
  if (!patientId) return [];
  const { data } = await apiClient.get<PatientFlagDto[]>(`/patient-flag/by-patient/${patientId}`);
  return data;
}

export async function savePatientFlag(req: SavePatientFlagRequest) {
  const { data } = await apiClient.post<PatientFlagDto>('/patient-flag', req);
  return data;
}

export async function deletePatientFlag(id: string) {
  const { data } = await apiClient.delete(`/patient-flag/${id}`);
  return data;
}
