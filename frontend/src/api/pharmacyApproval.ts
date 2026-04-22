/**
 * Pharmacy approval workflow — Sprint 2 Item 1.2
 */

import apiClient from './client';

export const APPROVAL_TYPES = {
  KHO_DU_TRU: 1,
  BN_NOI_TRU: 2,
  BU_TU_TRUC: 3,
  HAO_PHI_KHOA: 4,
  HOAN_TRA: 5,
} as const;

export const APPROVAL_TYPE_LABELS: Record<number, string> = {
  1: 'Duyệt cấp theo kho dự trù',
  2: 'Duyệt cấp theo người bệnh',
  3: 'Duyệt bù cơ số tủ trực',
  4: 'Duyệt cấp hao phí khoa',
  5: 'Duyệt hoàn trả',
};

export const STATUS_LABELS: Record<number, string> = {
  0: 'Đang nhập',
  1: 'Chưa nhập',
  2: 'Đã chuyển',
  3: 'Đã duyệt',
  4: 'Đã thu hồi',
};

export const STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'warning',
  2: 'processing',
  3: 'success',
  4: 'error',
};

export interface PharmacyApprovalItemDto {
  id: string;
  medicineId?: string;
  medicineName?: string;
  supplyId?: string;
  supplyName?: string;
  batchNumber?: string;
  expiryDate?: string;
  requestedQuantity: number;
  approvedQuantity: number;
  unit?: string;
  unitPrice: number;
  amount: number;
  objectType?: string;
  usageInstruction?: string;
  isExcluded: boolean;
}

export interface PharmacyApprovalDto {
  id: string;
  approvalCode: string;
  approvalType: number;
  approvalTypeName: string;
  fromDepartmentId?: string;
  fromDepartmentName?: string;
  toWarehouseId?: string;
  toWarehouseName?: string;
  fromWarehouseId?: string;
  fromWarehouseName?: string;
  patientId?: string;
  patientName?: string;
  patientCode?: string;
  lockedObject?: string;
  requestDate: string;
  status: number;
  statusText: string;
  submittedAt?: string;
  approvedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
  note?: string;
  createdAt: string;
  items: PharmacyApprovalItemDto[];
  totalAmount: number;
}

export interface CreatePharmacyApprovalItemRequest {
  medicineId?: string;
  supplyId?: string;
  inventoryItemId?: string;
  batchNumber?: string;
  expiryDate?: string;
  requestedQuantity: number;
  unit?: string;
  unitPrice: number;
  objectType?: string;
  usageInstruction?: string;
  note?: string;
}

export interface CreatePharmacyApprovalRequest {
  approvalType: number;
  fromDepartmentId?: string;
  toWarehouseId?: string;
  fromWarehouseId?: string;
  patientId?: string;
  medicalRecordId?: string;
  lockedObject?: string;
  note?: string;
  items: CreatePharmacyApprovalItemRequest[];
}

export interface PharmacyApprovalSearchRequest {
  approvalType?: number;
  status?: number;
  fromDepartmentId?: string;
  toWarehouseId?: string;
  patientId?: string;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface PharmacyApprovalSearchResult {
  items: PharmacyApprovalDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface ExpiringMedicineDto {
  inventoryItemId: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  batchNumber?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  quantity: number;
  unit?: string;
  warehouseId: string;
  warehouseName: string;
  severity: 'info' | 'warning' | 'critical' | 'expired';
}

export async function createApproval(req: CreatePharmacyApprovalRequest) {
  const { data } = await apiClient.post<PharmacyApprovalDto>('/pharmacy-approval', req);
  return data;
}
export async function updateApproval(id: string, req: CreatePharmacyApprovalRequest) {
  const { data } = await apiClient.put<PharmacyApprovalDto>(`/pharmacy-approval/${id}`, req);
  return data;
}
export async function deleteApprovalDraft(id: string) {
  const { data } = await apiClient.delete(`/pharmacy-approval/${id}`);
  return data;
}
export async function submitApproval(id: string, note?: string) {
  const { data } = await apiClient.post<PharmacyApprovalDto>('/pharmacy-approval/submit', {
    approvalId: id, note,
  });
  return data;
}
export async function approveApproval(id: string, items: { itemId: string; approvedQuantity: number; isExcluded: boolean }[], note?: string) {
  const { data } = await apiClient.post<PharmacyApprovalDto>('/pharmacy-approval/approve', {
    approvalId: id, items, note,
  });
  return data;
}
export async function revokeApproval(id: string, reason: string) {
  const { data } = await apiClient.post<PharmacyApprovalDto>('/pharmacy-approval/revoke', {
    approvalId: id, reason,
  });
  return data;
}
export async function getApprovalById(id: string) {
  const { data } = await apiClient.get<PharmacyApprovalDto>(`/pharmacy-approval/${id}`);
  return data;
}
export async function searchApprovals(req: PharmacyApprovalSearchRequest) {
  const { data } = await apiClient.get<PharmacyApprovalSearchResult>('/pharmacy-approval', { params: req });
  return data;
}
export async function getExpiringMedicines(daysAhead = 60) {
  const { data } = await apiClient.get<ExpiringMedicineDto[]>('/pharmacy-approval/expiring-medicines', {
    params: { daysAhead },
  });
  return data;
}
