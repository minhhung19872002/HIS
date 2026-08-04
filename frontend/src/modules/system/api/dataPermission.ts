/**
 * NangCap26 — I.15 Quyền dữ liệu phòng/kho · I.16 Phân quyền dữ liệu người dùng.
 * Row-level scope, tách biệt với quyền chức năng (menu/permission) đã có.
 */
import apiClient from '../../../services/apiClient';

const BASE = '/data-permission';

/** Department · Room · Warehouse · TreatmentType · PatientObject */
export type DataScopeType = 'Department' | 'Room' | 'Warehouse' | 'TreatmentType' | 'PatientObject';

export const DATA_SCOPE_LABEL: Record<DataScopeType, string> = {
  Department: 'Khoa/Phòng',
  Room: 'Phòng',
  Warehouse: 'Kho',
  TreatmentType: 'Loại điều trị',
  PatientObject: 'Đối tượng BN',
};

export interface DataPermissionItemDto {
  id?: string;
  scopeType: DataScopeType | string;
  /** Dùng cho Department / Room / Warehouse */
  scopeId?: string;
  /** Dùng cho TreatmentType / PatientObject */
  scopeValue?: string;
  scopeName?: string;
}

export interface DataPermissionGroupDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  userCount: number;
  items: DataPermissionItemDto[];
}

export interface SaveDataPermissionGroupDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  items: DataPermissionItemDto[];
}

export interface EffectiveDataScopeDto {
  userId: string;
  /** true = user chưa gán nhóm nào → KHÔNG giới hạn (fail-open) */
  unrestricted: boolean;
  departmentIds: string[];
  roomIds: string[];
  warehouseIds: string[];
  treatmentTypes: string[];
  patientObjects: string[];
}

export const getDataPermissionGroups = (activeOnly = false) =>
  apiClient.get<DataPermissionGroupDto[]>(`${BASE}/groups`, { params: { activeOnly } });

export const saveDataPermissionGroup = (dto: SaveDataPermissionGroupDto) =>
  apiClient.post<DataPermissionGroupDto>(`${BASE}/groups`, dto);

export const deleteDataPermissionGroup = (id: string) =>
  apiClient.delete(`${BASE}/groups/${id}`);

export const getUserDataPermissionGroups = (userId: string) =>
  apiClient.get<string[]>(`${BASE}/users/${userId}/groups`);

export const assignUserDataPermissionGroups = (userId: string, groupIds: string[]) =>
  apiClient.post(`${BASE}/users/assign`, { userId, groupIds });

export const getUserEffectiveScope = (userId: string) =>
  apiClient.get<EffectiveDataScopeDto>(`${BASE}/users/${userId}/effective-scope`);

/** Phạm vi dữ liệu của chính người đang đăng nhập — FE dùng để lọc UI. */
export const getMyEffectiveScope = () =>
  apiClient.get<EffectiveDataScopeDto>(`${BASE}/me/effective-scope`);
