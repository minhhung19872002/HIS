/**
 * API client — Workflow đề xuất / dự trù / mua sắm tài sản + vật tư (#108)
 * Base: /api/procurement
 * Entity: AssetProcurementRequest (khác ProcurementRequest của warehouse module)
 */
import apiClient from '../services/apiClient';

const BASE = '/api/asset-procurement';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssetProcurementItemDto {
  id: string;
  assetProcurementRequestId: string;
  itemName: string;
  unit?: string;
  quantity: number;
  unitPrice?: number;
  amount?: number;
  specification?: string;
}

export interface AssetProcurementRequestDto {
  id: string;
  requestNo: string;
  title: string;
  requestType: number;      // 1=DeXuat, 2=DuTru, 3=MuaSam
  requestTypeName: string;
  departmentId?: string;
  departmentName?: string;
  requesterId?: string;
  requesterName?: string;
  reason?: string;
  status: number;           // 0=DuThao,1=ChoXetDuyet,2=DaDuyet,3=TuChoi,4=HoanTat
  statusName: string;
  totalAmount?: number;
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  note?: string;
  createdAt: string;
  createdBy?: string;
  itemCount: number;
  items: AssetProcurementItemDto[];
}

export interface AssetProcurementPagedResult {
  items: AssetProcurementRequestDto[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface SaveAssetProcurementItemDto {
  id?: string;
  itemName: string;
  unit?: string;
  quantity: number;
  unitPrice?: number;
  specification?: string;
}

export interface SaveAssetProcurementRequestDto {
  id?: string;
  title: string;
  requestType: number;
  departmentId?: string;
  departmentName?: string;
  requesterName?: string;
  reason?: string;
  note?: string;
  items: SaveAssetProcurementItemDto[];
}

export interface ApproveRejectAssetProcurementDto {
  requestId: string;
  note?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getAssetProcurementList = (params: {
  keyword?: string;
  status?: number;
  requestType?: number;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}) => apiClient.get<AssetProcurementPagedResult>(`${BASE}/requests`, { params });

export const getAssetProcurementById = (id: string) =>
  apiClient.get<AssetProcurementRequestDto>(`${BASE}/requests/${id}`);

export const saveAssetProcurementRequest = (dto: SaveAssetProcurementRequestDto) =>
  apiClient.post<AssetProcurementRequestDto>(`${BASE}/requests`, dto);

export const deleteAssetProcurementRequest = (id: string) =>
  apiClient.delete(`${BASE}/requests/${id}`);

export const submitAssetProcurementRequest = (id: string) =>
  apiClient.post<AssetProcurementRequestDto>(`${BASE}/requests/${id}/submit`);

export const approveAssetProcurementRequest = (dto: ApproveRejectAssetProcurementDto) =>
  apiClient.post<AssetProcurementRequestDto>(`${BASE}/requests/approve`, dto);

export const rejectAssetProcurementRequest = (dto: ApproveRejectAssetProcurementDto) =>
  apiClient.post<AssetProcurementRequestDto>(`${BASE}/requests/reject`, dto);

export const completeAssetProcurementRequest = (id: string) =>
  apiClient.post<AssetProcurementRequestDto>(`${BASE}/requests/${id}/complete`);
