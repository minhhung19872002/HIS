/**
 * API Client cho Quản lý chuyển giao dữ liệu
 * Endpoints: /api/data-management/*
 */

import apiClient from '../../../services/apiClient';

// ==================== Types ====================

export interface BackupInfoDto {
  id: string;
  backupType: string; // 'Full' | 'Differential' | 'Transaction Log'
  fileName: string;
  fileSize: number;
  createdAt: string;
  createdBy: string;
  status: string; // 'Completed' | 'InProgress' | 'Failed'
  modules: string[];
  remarks?: string;
}

export interface DataExportRequestDto {
  modules: string[];
  dateFrom?: string;
  dateTo?: string;
  format: string; // 'SQL' | 'JSON' | 'CSV' | 'XML'
  includeAttachments: boolean;
  remarks?: string;
}

export interface DataExportResultDto {
  id: string;
  requestedAt: string;
  completedAt?: string;
  status: string;
  modules: string[];
  format: string;
  fileSize?: number;
  downloadUrl?: string;
  errorMessage?: string;
  recordCount: number;
}

export interface DataHandoverDto {
  id: string;
  handoverCode: string;
  handoverDate: string;
  recipientName: string;
  recipientOrganization: string;
  recipientEmail: string;
  modules: string[];
  totalRecords: number;
  totalFileSize: number;
  status: number; // 0=Preparing, 1=Ready, 2=Delivered, 3=Confirmed
  statusName: string;
  deliveredAt?: string;
  confirmedAt?: string;
  remarks?: string;
}

export interface DataStatsDto {
  totalPatients: number;
  totalExaminations: number;
  totalPrescriptions: number;
  totalLabResults: number;
  totalRadiologyResults: number;
  totalAdmissions: number;
  totalBillingRecords: number;
  totalAuditLogs: number;
  databaseSizeMB: number;
  attachmentsSizeMB: number;
  lastBackupDate?: string;
  lastExportDate?: string;
}

export interface ModuleDataCountDto {
  module: string;
  moduleName: string;
  recordCount: number;
  lastUpdated?: string;
}

// ==================== API Functions ====================

export const getDataStats = () =>
  apiClient.get<DataStatsDto>('/data-management/stats').then(r => r.data);

export const getModuleDataCounts = () =>
  apiClient.get<ModuleDataCountDto[]>('/data-management/module-counts').then(r => r.data);

export const getBackups = () =>
  apiClient.get<BackupInfoDto[]>('/data-management/backups').then(r => r.data);

export const createBackup = (backupType: string, modules?: string[]) =>
  apiClient.post<{ backupId: string; message: string }>('/data-management/backups', { backupType, modules }).then(r => r.data);

export const getExportHistory = () =>
  apiClient.get<DataExportResultDto[]>('/data-management/exports').then(r => r.data);

export const requestExport = (request: DataExportRequestDto) =>
  apiClient.post<DataExportResultDto>('/data-management/exports', request).then(r => r.data);

export const getHandovers = () =>
  apiClient.get<DataHandoverDto[]>('/data-management/handovers').then(r => r.data);

export const createHandover = (data: Partial<DataHandoverDto>) =>
  apiClient.post<DataHandoverDto>('/data-management/handovers', data).then(r => r.data);

export const confirmHandover = (id: string) =>
  apiClient.post<{ success: boolean; message: string }>(`/data-management/handovers/${id}/confirm`).then(r => r.data);

export const downloadExport = (id: string) =>
  apiClient.get<Blob>(`/data-management/exports/${id}/download`, { responseType: 'blob' }).then(r => r.data);

// ==================== Backup History (mới) ====================

export interface BackupHistoryDto {
  id: string;
  fileName: string;
  filePath?: string;
  /** Kích thước file tính bằng byte */
  sizeBytes: number;
  /** 0=Manual, 1=Scheduled */
  backupType: number;
  backupTypeName: string;
  /** "Local" | "NAS" | "Cloud" */
  destination?: string;
  /** 0=Running, 1=Success, 2=Failed */
  status: number;
  statusName: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  createdBy?: string;
}

export interface CreateBackupHistoryRequest {
  /** "Full" | "Differential" | "TransactionLog" */
  backupLabel?: string;
  modules?: string[];
  /** Đích lưu: "Local" | "NAS" | "Cloud". null = dùng cấu hình hệ thống. */
  destination?: string;
}

/** QUAN TRỌNG: API này KHÔNG tự động thực thi RESTORE DATABASE. */
export interface RestoreBackupRequest {
  /** Phải = true, nếu không API trả 400 */
  confirmRisk: boolean;
  /** Lý do bắt buộc để audit */
  reason: string;
}

export interface RestoreBackupResultDto {
  requestId: string;
  fileName: string;
  filePath?: string;
  /** "Pending" = đã ghi nhận + có script; "Rejected" = lỗi điều kiện */
  status: string;
  message: string;
  /** Script T-SQL để admin chạy thủ công trong SSMS/sqlcmd */
  manualRestoreScript?: string;
  requestedAt: string;
}

export interface BackupConfigDto {
  /** "Local" | "NAS" | "Cloud" */
  destination: string;
  nasPath?: string;
  cloudBucket?: string;
  /** Cron expression (VD: "0 2 * * *"). Null = dùng intervalHours. */
  scheduleCron?: string;
  scheduleIntervalHours?: number;
  scheduleEnabled: boolean;
  /** Giữ tối đa N bản backup */
  retentionCount: number;
}

// ── Backup History API ──

export const getBackupHistory = () =>
  apiClient.get<BackupHistoryDto[]>('/data-management/backup-history').then(r => r.data);

export const createBackupWithHistory = (request: CreateBackupHistoryRequest) =>
  apiClient.post<BackupHistoryDto>('/data-management/backup-history', request).then(r => r.data);

export const requestRestore = (id: string, request: RestoreBackupRequest) =>
  apiClient.post<RestoreBackupResultDto>(`/data-management/backup-history/${id}/restore-request`, request).then(r => r.data);

// ── Backup Config API ──

export const getBackupConfig = () =>
  apiClient.get<BackupConfigDto>('/data-management/backup-config').then(r => r.data);

export const saveBackupConfig = (config: BackupConfigDto) =>
  apiClient.put<BackupConfigDto>('/data-management/backup-config', config).then(r => r.data);
