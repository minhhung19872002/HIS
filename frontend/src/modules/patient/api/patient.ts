import apiClient from '../../../services/apiClient';
import type { ApiResponse } from '../../../api/auth';

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

/**
 * `apiClient` TỰ BÓC envelope `{success,data}` (services/apiClient.ts) nên `response.data`
 * chính là payload trần. Nhưng mọi hàm dưới đây khai kiểu `ApiResponse<T>` và TOÀN BỘ caller
 * đọc `res.data` / `res.success` → luôn undefined, im lặng không lỗi:
 *   · bấm "Kê đơn thuốc" từ màn khám → sang màn kê đơn KHÔNG nạp được bệnh nhân
 *     (PrescriptionEditor đọc `pRes.data` nên không bao giờ gọi setPt);
 *   · "Tìm BN" và mọi ô tìm bệnh nhân khác đọc `res.data?.items` → luôn rỗng.
 * Bọc lại đúng envelope tại tầng API để vá một chỗ cho tất cả caller. Tolerant cả 2 shape
 * phòng khi interceptor đổi hành vi (pattern như AuthContext, commit 92d35a2).
 */
const asEnvelope = <T>(payload: unknown): ApiResponse<T> => {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return payload as ApiResponse<T>;
  }
  return { success: payload != null, data: (payload ?? undefined) as T };
};

export const patientApi = {
  getById: async (id: string): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/${id}`);
    return asEnvelope<Patient>(response.data);
  },

  getByCode: async (code: string): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/by-code/${code}`);
    return asEnvelope<Patient>(response.data);
  },

  getByIdentityNumber: async (identityNumber: string): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/by-identity/${identityNumber}`);
    return asEnvelope<Patient>(response.data);
  },

  getByInsuranceNumber: async (insuranceNumber: string): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/by-insurance/${insuranceNumber}`);
    return asEnvelope<Patient>(response.data);
  },

  search: async (params: PatientSearchRequest): Promise<ApiResponse<PagedResult<Patient>>> => {
    const response = await apiClient.post<ApiResponse<PagedResult<Patient>>>('/patients/search', params);
    return asEnvelope<PagedResult<Patient>>(response.data);
  },

  create: async (data: CreatePatientRequest): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.post<ApiResponse<Patient>>('/patients', data);
    return asEnvelope<Patient>(response.data);
  },

  update: async (id: string, data: CreatePatientRequest): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.put<ApiResponse<Patient>>(`/patients/${id}`, { id, ...data });
    return asEnvelope<Patient>(response.data);
  },

  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/patients/${id}`);
    return asEnvelope<boolean>(response.data);
  },
};
