/**
 * Audit Log API Client
 * Level 6 security compliance - tracks medical record access and modifications
 */

import { apiClient } from './client';

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
