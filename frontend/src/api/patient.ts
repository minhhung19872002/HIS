import apiClient from './client';
import type { ApiResponse } from './auth';

// Re-export ApiResponse for convenience
export type { ApiResponse };

export interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string;
  yearOfBirth?: number;
  gender: number;
  genderName?: string;
  identityNumber?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  wardName?: string;
  districtName?: string;
  provinceName?: string;
  insuranceNumber?: string;
  insuranceExpireDate?: string;
  insuranceFacilityCode?: string;
  photoPath?: string;
}

export interface CreatePatientRequest {
  fullName: string;
  dateOfBirth?: string;
  yearOfBirth?: number;
  gender: number;
  identityNumber?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  wardCode?: string;
  wardName?: string;
  districtCode?: string;
  districtName?: string;
  provinceCode?: string;
  provinceName?: string;
  ethnicCode?: string;
  ethnicName?: string;
  occupation?: string;
  insuranceNumber?: string;
  insuranceExpireDate?: string;
  insuranceFacilityCode?: string;
  insuranceFacilityName?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelationship?: string;
}

export interface PatientSearchRequest {
  keyword?: string;
  patientCode?: string;
  identityNumber?: string;
  phoneNumber?: string;
  insuranceNumber?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const patientApi = {
  getById: async (id: string): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/${id}`);
    return response.data;
  },

  getByCode: async (code: string): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/by-code/${code}`);
    return response.data;
  },

  getByIdentityNumber: async (identityNumber: string): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/by-identity/${identityNumber}`);
    return response.data;
  },

  getByInsuranceNumber: async (insuranceNumber: string): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/by-insurance/${insuranceNumber}`);
    return response.data;
  },

  search: async (params: PatientSearchRequest): Promise<ApiResponse<PagedResult<Patient>>> => {
    const response = await apiClient.post<ApiResponse<PagedResult<Patient>>>('/patients/search', params);
    return response.data;
  },

  create: async (data: CreatePatientRequest): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.post<ApiResponse<Patient>>('/patients', data);
    return response.data;
  },

  update: async (id: string, data: CreatePatientRequest): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.put<ApiResponse<Patient>>(`/patients/${id}`, { id, ...data });
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/patients/${id}`);
    return response.data;
  },
};
