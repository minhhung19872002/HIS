/**
 * Module 17: Quản trị Hệ thống
 * DTOs + adminApi (includes LockedServiceDto)
 */

import { apiClient } from '../../../../services/apiClient';

// ============================================================================
// DTOs
// ============================================================================

export interface SystemUserDto {
  id?: string;
  username: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  employeeId?: string;
  employeeCode?: string;
  departmentId?: string;
  departmentName?: string;
  branchId?: string; // R3 đa cơ sở — không có = toàn viện
  roles: RoleDto[];
  isActive: boolean;
  isLocked: boolean;
  isTwoFactorEnabled?: boolean;
  phone?: string;
  lockReason?: string;
  lastLoginDate?: string;
  lastLoginIP?: string;
  createdDate: string;
  createdBy?: string;
  modifiedDate?: string;
  modifiedBy?: string;
}

export interface CreateUserDto {
  username: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  employeeId?: string;
  departmentId?: string;
  branchId?: string; // R3 đa cơ sở
  roleIds: string[];
  initialPassword?: string;
}

export interface UpdateUserDto {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  employeeId?: string;
  departmentId?: string;
  branchId?: string; // R3 đa cơ sở
  roleIds: string[];
  isActive: boolean;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RoleDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions?: PermissionDto[];
  userCount?: number;
  isActive: boolean;
}

export interface PermissionDto {
  id?: string;
  code: string;
  name: string;
  module: string;
  description?: string;
  isActive: boolean;
}

export interface AuditLogDto {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
  duration?: number;
  isSuccess: boolean;
  errorMessage?: string;
}

export interface AuditLogSearchDto {
  fromDate?: string;
  toDate?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface SystemConfigDto {
  configKey: string;
  configValue: string;
  category: string;
  description?: string;
  dataType: string;
  isEncrypted: boolean;
  isEditable: boolean;
  modifiedDate?: string;
  modifiedBy?: string;
}

export interface UserSessionDto {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  loginTime: string;
  lastActivityTime: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  isActive: boolean;
}

export interface SystemNotificationDto {
  id?: string;
  title: string;
  content: string;
  notificationType: string;
  priority: string;
  targetRoles?: string[];
  targetUsers?: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdDate?: string;
  createdBy?: string;
}

export interface BackupHistoryDto {
  id: string;
  backupName: string;
  backupType: string;
  filePath: string;
  fileSize: number;
  databaseName: string;
  backupDate: string;
  backupBy: string;
  status: string;
  duration: number;
  isCompressed: boolean;
  description?: string;
}

export interface CreateBackupDto {
  backupName: string;
  backupType: string;
  description?: string;
  compressBackup: boolean;
}

export interface SystemHealthDto {
  status: string;
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  databaseStatus: string;
  cacheStatus: string;
  queueStatus: string;
  lastCheckTime: string;
  services: ServiceHealthDto[];
}

export interface ServiceHealthDto {
  serviceName: string;
  status: string;
  responseTime: number;
  lastError?: string;
  lastErrorTime?: string;
}

export interface SystemResourceDto {
  resourceName: string;
  resourceType: string;
  currentValue: number;
  maxValue: number;
  unit: string;
  utilizationPercentage: number;
  status: string;
}

export interface DatabaseStatisticsDto {
  tableName: string;
  rowCount: number;
  dataSize: number;
  indexSize: number;
  totalSize: number;
  lastModified?: string;
}

export interface IntegrationConfigDto {
  id?: string;
  integrationName: string;
  integrationType: string;
  endpoint: string;
  authType: string;
  username?: string;
  apiKey?: string;
  additionalConfig?: string;
  isActive: boolean;
  lastTestDate?: string;
  lastTestResult?: string;
}

export interface IntegrationLogDto {
  id: string;
  integrationId: string;
  integrationName: string;
  requestTime: string;
  responseTime?: string;
  duration?: number;
  requestData?: string;
  responseData?: string;
  status: string;
  errorMessage?: string;
}

export interface LockedServiceDto {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  serviceType: number; // 1=Thuốc, 2=Vật tư, 3=DVKT
  serviceTypeName: string;
  isLocked: boolean;
  lockReason?: string;
  lockedBy?: string;
  lockedByName?: string;
  lockedAt?: string;
  unlockedAt?: string;
}

// ============================================================================
// API Object
// ============================================================================

export const adminApi = {
  // Quản lý người dùng
  getUsers: (keyword?: string, departmentId?: string, isActive?: boolean) =>
    apiClient.get<SystemUserDto[]>('/admin/users', { params: { keyword, departmentId, isActive } }),
  getUser: (userId: string) =>
    apiClient.get<SystemUserDto>(`/admin/users/${userId}`),
  createUser: (dto: CreateUserDto) =>
    apiClient.post<SystemUserDto>('/admin/users', dto),
  updateUser: (userId: string, dto: UpdateUserDto) =>
    apiClient.put<SystemUserDto>(`/admin/users/${userId}`, dto),
  deleteUser: (userId: string) =>
    apiClient.delete<boolean>(`/admin/users/${userId}`),
  resetPassword: (userId: string) =>
    apiClient.post<boolean>(`/admin/users/${userId}/reset-password`),
  changePassword: (userId: string, dto: ChangePasswordDto) =>
    apiClient.post<boolean>(`/admin/users/${userId}/change-password`, dto),
  lockUser: (userId: string, reason: string) =>
    apiClient.post<boolean>(`/admin/users/${userId}/lock`, reason),
  unlockUser: (userId: string) =>
    apiClient.post<boolean>(`/admin/users/${userId}/unlock`),

  // Quản lý vai trò
  getRoles: (isActive?: boolean) =>
    apiClient.get<RoleDto[]>('/admin/roles', { params: { isActive } }),
  getRole: (roleId: string) =>
    apiClient.get<RoleDto>(`/admin/roles/${roleId}`),
  saveRole: (dto: RoleDto) =>
    apiClient.post<RoleDto>('/admin/roles', dto),
  deleteRole: (roleId: string) =>
    apiClient.delete<boolean>(`/admin/roles/${roleId}`),

  // Quản lý quyền
  getPermissions: (module?: string) =>
    apiClient.get<PermissionDto[]>('/admin/permissions', { params: { module } }),
  getRolePermissions: (roleId: string) =>
    apiClient.get<PermissionDto[]>(`/admin/roles/${roleId}/permissions`),
  updateRolePermissions: (roleId: string, permissionIds: string[]) =>
    apiClient.put<boolean>(`/admin/roles/${roleId}/permissions`, permissionIds),
  getUserPermissions: (userId: string) =>
    apiClient.get<PermissionDto[]>(`/admin/users/${userId}/permissions`),
  updateUserPermissions: (userId: string, permissionIds: string[]) =>
    apiClient.put<boolean>(`/admin/users/${userId}/permissions`, permissionIds),

  // Nhật ký hệ thống
  getAuditLogs: (search: AuditLogSearchDto) =>
    apiClient.get<AuditLogDto[]>('/admin/audit-logs', { params: search }),
  getAuditLog: (logId: string) =>
    apiClient.get<AuditLogDto>(`/admin/audit-logs/${logId}`),
  exportAuditLogs: (search: AuditLogSearchDto) =>
    apiClient.post<Blob>('/admin/audit-logs/export', search, { responseType: 'blob' }),

  // Cấu hình hệ thống
  getSystemConfigs: (category?: string) =>
    apiClient.get<SystemConfigDto[]>('/admin/configs', { params: { category } }),
  getSystemConfig: (configKey: string) =>
    apiClient.get<SystemConfigDto>(`/admin/configs/${configKey}`),
  saveSystemConfig: (dto: SystemConfigDto) =>
    apiClient.post<SystemConfigDto>('/admin/configs', dto),
  deleteSystemConfig: (configKey: string) =>
    apiClient.delete<boolean>(`/admin/configs/${configKey}`),

  // Quản lý phiên
  getActiveSessions: (userId?: string) =>
    apiClient.get<UserSessionDto[]>('/admin/sessions', { params: { userId } }),
  terminateSession: (sessionId: string) =>
    apiClient.delete<boolean>(`/admin/sessions/${sessionId}`),
  terminateAllSessions: (userId: string) =>
    apiClient.delete<boolean>(`/admin/users/${userId}/sessions`),

  // Thông báo hệ thống
  getSystemNotifications: (isActive?: boolean) =>
    apiClient.get<SystemNotificationDto[]>('/admin/notifications', { params: { isActive } }),
  getSystemNotification: (notificationId: string) =>
    apiClient.get<SystemNotificationDto>(`/admin/notifications/${notificationId}`),
  saveSystemNotification: (dto: SystemNotificationDto) =>
    apiClient.post<SystemNotificationDto>('/admin/notifications', dto),
  deleteSystemNotification: (notificationId: string) =>
    apiClient.delete<boolean>(`/admin/notifications/${notificationId}`),

  // Sao lưu dữ liệu
  getBackupHistory: (fromDate?: string, toDate?: string) =>
    apiClient.get<BackupHistoryDto[]>('/admin/backups', { params: { fromDate, toDate } }),
  createBackup: (dto: CreateBackupDto) =>
    apiClient.post<BackupHistoryDto>('/admin/backups', dto),
  restoreBackup: (backupId: string) =>
    apiClient.post<boolean>(`/admin/backups/${backupId}/restore`),
  deleteBackup: (backupId: string) =>
    apiClient.delete<boolean>(`/admin/backups/${backupId}`),

  // Giám sát hệ thống
  getSystemHealth: () =>
    apiClient.get<SystemHealthDto>('/admin/health'),
  getSystemResources: () =>
    apiClient.get<SystemResourceDto[]>('/admin/resources'),
  getDatabaseStatistics: () =>
    apiClient.get<DatabaseStatisticsDto[]>('/admin/database-statistics'),

  // Quản lý tích hợp
  getIntegrationConfigs: (isActive?: boolean) =>
    apiClient.get<IntegrationConfigDto[]>('/admin/integrations', { params: { isActive } }),
  getIntegrationConfig: (integrationId: string) =>
    apiClient.get<IntegrationConfigDto>(`/admin/integrations/${integrationId}`),
  saveIntegrationConfig: (dto: IntegrationConfigDto) =>
    apiClient.post<IntegrationConfigDto>('/admin/integrations', dto),
  testIntegrationConnection: (integrationId: string) =>
    apiClient.post<boolean>(`/admin/integrations/${integrationId}/test`),
  getIntegrationLogs: (integrationId: string, fromDate?: string, toDate?: string) =>
    apiClient.get<IntegrationLogDto[]>(`/admin/integrations/${integrationId}/logs`, { params: { fromDate, toDate } }),

  // Khóa dịch vụ
  getLockedServices: () =>
    apiClient.get<LockedServiceDto[]>('/admin/locked-services'),
  lockService: (serviceId: string, reason: string) =>
    apiClient.post<LockedServiceDto>('/admin/lock-service', { serviceId, reason }),
  unlockService: (serviceId: string) =>
    apiClient.post<boolean>('/admin/unlock-service', { serviceId }),
};
