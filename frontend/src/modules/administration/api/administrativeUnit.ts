import apiClient from '../../../services/apiClient';

const BASE = '/administrative-unit';

// ─── DTO interfaces ─────────────────────────────────────────────────────────

export interface ProvinceDto {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface DistrictDto {
  id: string;
  code: string;
  name: string;
  provinceId: string;
  provinceName?: string;
  isActive: boolean;
}

export interface WardDto {
  id: string;
  code: string;
  name: string;
  districtId: string;
  districtName?: string;
  isActive: boolean;
}

// ─── Province ───────────────────────────────────────────────────────────────

export const getProvinces = (keyword?: string) =>
  apiClient.get<ProvinceDto[]>(`${BASE}/provinces`, { params: { keyword } }).then(r => r.data);

export const saveProvince = (dto: Partial<ProvinceDto>) =>
  apiClient.post<ProvinceDto>(`${BASE}/provinces`, dto).then(r => r.data);

export const deleteProvince = (id: string) =>
  apiClient.delete(`${BASE}/provinces/${id}`).then(r => r.data);

// ─── District ───────────────────────────────────────────────────────────────

export const getDistricts = (provinceId?: string, keyword?: string) =>
  apiClient.get<DistrictDto[]>(`${BASE}/districts`, { params: { provinceId, keyword } }).then(r => r.data);

export const saveDistrict = (dto: Partial<DistrictDto>) =>
  apiClient.post<DistrictDto>(`${BASE}/districts`, dto).then(r => r.data);

export const deleteDistrict = (id: string) =>
  apiClient.delete(`${BASE}/districts/${id}`).then(r => r.data);

// ─── Ward ───────────────────────────────────────────────────────────────────

export const getWards = (districtId?: string, keyword?: string) =>
  apiClient.get<WardDto[]>(`${BASE}/wards`, { params: { districtId, keyword } }).then(r => r.data);

export const saveWard = (dto: Partial<WardDto>) =>
  apiClient.post<WardDto>(`${BASE}/wards`, dto).then(r => r.data);

export const deleteWard = (id: string) =>
  apiClient.delete(`${BASE}/wards/${id}`).then(r => r.data);
