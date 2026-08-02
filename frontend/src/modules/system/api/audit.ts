/**
 * Audit Log API Client
 * Level 6 security compliance - tracks medical record access and modifications
 */

import { apiClient } from '../../../services/apiClient';

// ============================================================================
// DTOs
// ============================================================================

export interface AuditLogDto {
  id: string;
  userId?: string;
  userName?: string;
  userFullName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  module?: string;
  requestPath?: string;
  requestMethod?: string;
  responseStatusCode?: number;
  oldValues?: string;
  newValues?: string;
}

export interface AuditLogSearchDto {
  userId?: string;
  action?: string;
  entityType?: string;
  module?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
  keyword?: string;
}

export interface AuditLogPagedResult {
  items: AuditLogDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// API Functions
// ============================================================================

/** Search audit logs with filters and pagination */
export const getAuditLogs = (params: AuditLogSearchDto) =>
  apiClient.get<AuditLogPagedResult>('/audit/logs', { params });

/** #458: Xuất nhật ký kiểm toán ra Excel — trả URL blob để tải xuống */
export const exportAuditLogs = (params: AuditLogSearchDto): void => {
  const qs = new URLSearchParams();
  if (params.fromDate) qs.set('fromDate', params.fromDate);
  if (params.toDate) qs.set('toDate', params.toDate);
  if (params.action) qs.set('action', params.action);
  if (params.module) qs.set('module', params.module);
  if (params.entityType) qs.set('entityType', params.entityType);
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.userId) qs.set('userId', params.userId);
  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:5106/api').replace(/\/+$/, '');
  const token = localStorage.getItem('token');
  // Build URL with auth token as query param for file download (Bearer header not applicable on window.open)
  const url = `${base}/audit/logs/export?${qs.toString()}`;
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', '');
  // Use fetch + blob so Bearer header is sent correctly
  fetch(url, { headers: { Authorization: `Bearer ${token ?? ''}` } })
    .then(r => r.ok ? r.blob() : Promise.reject(r.status))
    .then(blob => {
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    })
    .catch(() => { /* silent — no alert needed */ });
};

/** Get activity logs for a specific user */
export const getUserActivity = (userId: string, from?: string, to?: string) =>
  apiClient.get<AuditLogDto[]>(`/audit/user/${userId}`, {
    params: { from, to },
  });

// ============================================================================
// AUTHZ-5 (#371) increment-3: báo cáo truy vết compliance (read-only)
// ============================================================================

/** 1 dòng lịch sử thay đổi phân quyền (ai gán/thu-hồi role/quyền cho ai, old→new, khi nào). */
export interface PermissionChangeHistoryDto {
  id: string;
  changeType: string;            // UserRole | RolePermission | UserPermissionOverride | Delegation
  targetUserId?: string;
  targetUserName?: string;
  targetRoleId?: string;
  targetRoleName?: string;
  permissionCode?: string;
  action: string;                // grant | revoke | modify
  oldValueJson?: string;
  newValueJson?: string;
  reason?: string;
  changedBy?: string;
  changedAt: string;
}

export interface PermissionChangeSearchDto {
  targetUserId?: string;
  changeType?: string;
  action?: string;
  changedBy?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface PermissionChangePagedResult {
  items: PermissionChangeHistoryDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditCountItem {
  key: string;
  count: number;
}

export interface AuditSummaryDto {
  fromDate: string;
  toDate: string;
  totalEvents: number;
  byAction: AuditCountItem[];
  byModule: AuditCountItem[];
  topUsers: AuditCountItem[];
}

/** Báo cáo truy vết thay đổi phân quyền (lọc + phân trang). */
export const getPermissionChanges = (params: PermissionChangeSearchDto) =>
  apiClient.get<PermissionChangePagedResult>('/audit/permission-changes', { params });

/** Báo cáo tổng hợp hoạt động audit theo khoảng ngày (đếm action/module/top-user). */
export const getAuditSummary = (from?: string, to?: string) =>
  apiClient.get<AuditSummaryDto>('/audit/summary', { params: { from, to } });

// ── AUTHZ-5 (#371) inc-6: Recertification ────────────────────────────────────

/** 1 dòng gán role cho user (tại thời điểm asOf). */
export interface UserRoleRecordDto {
  userId: string;
  username: string;
  fullName: string;
  roleCode: string;
  roleName: string;
  scopeType: string;  // ORG | DEPT | BRANCH | OWN
  validFrom?: string;
  validTo?: string;
  grantedBy?: string;
}

/** Nhóm gán role theo scopeType cho báo cáo tái chứng nhận. */
export interface RecertificationGroupDto {
  scopeType: string;
  scopeLabel: string;
  totalAssignments: number;
  totalUniqueUsers: number;
  assignments: UserRoleRecordDto[];
}

/** Báo cáo tái chứng nhận: ai đang có role gì tại asOf. */
export interface RecertificationReportDto {
  asOf: string;
  totalActiveAssignments: number;
  totalUsers: number;
  groups: RecertificationGroupDto[];
}

/** Báo cáo tái chứng nhận — ai đang có quyền gì tại thời điểm asOf (mặc định = now). */
export const getRecertification = (asOf?: string) =>
  apiClient.get<RecertificationReportDto>('/audit/recertification', { params: { asOf } });
