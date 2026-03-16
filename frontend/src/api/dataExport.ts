/**
 * API Client cho Quản lý chuyển giao dữ liệu
 * Endpoints: /api/data-management/*
 */

import apiClient from './client';

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
