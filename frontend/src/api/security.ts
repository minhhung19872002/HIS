import { apiClient } from './client';

// Types matching backend SecurityComplianceDTOs

export interface ModulePermissionDto {
  module: string;
  permissions: {
    permissionCode: string;
    permissionName: string;
    description?: string;
  }[];
}

export interface AccessControlMatrixDto {
  roleCode: string;
  roleName: string;
  description?: string;
  userCount: number;
  modulePermissions: ModulePermissionDto[];
}

export interface RecentAccessDto {
  timestamp: string;
  entityType: string;
  entityId: string;
  requestPath: string;
  module: string;
}

export interface SensitiveDataAccessReportDto {
  userId: string;
  userName: string;
  userFullName: string;
  totalAccesses: number;
  recentAccesses: RecentAccessDto[];
}

export interface ComplianceSummaryDto {
  totalRoles: number;
  totalPermissions: number;
  totalUsers: number;
  activeUsers: number;
  usersWithTwoFactor: number;
  tdeEnabled: boolean;
  columnEncryptionEnabled: boolean;
  lastBackupDate?: string;
  auditLogsLast30Days: number;
  sensitiveAccessLast30Days: number;
}

export const getAccessControlMatrix = () =>
  apiClient.get<AccessControlMatrixDto[]>('/security/compliance/access-matrix');

export const getSensitiveAccessReport = (from: string, to: string, limit?: number) =>
  apiClient.get<SensitiveDataAccessReportDto[]>('/security/compliance/sensitive-access', {
    params: { from, to, limit: limit ?? 50 },
  });

export const getComplianceSummary = () =>
  apiClient.get<ComplianceSummaryDto>('/security/compliance/summary');
