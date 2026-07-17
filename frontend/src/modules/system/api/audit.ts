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
