/**
 * API Client cho Hệ thống giám sát điều hành thông tin y tế - Sở Y tế
 * Endpoints: /api/provincial-health/*
 */

import apiClient from './client';

// ==================== Types ====================

export interface ProvincialReportDto {
  id: string;
  reportCode: string;
  reportType: number; // 1=Daily, 2=Weekly, 3=Monthly, 4=Quarterly, 5=Annual, 6=Adhoc
  reportTypeName: string;
  reportPeriod: string;
  facilityCode: string;
  facilityName: string;
  totalOutpatients: number;
  totalInpatients: number;
  totalEmergencies: number;
  totalSurgeries: number;
  totalDeaths: number;
  totalBirths: number;
  totalLabTests: number;
  totalRadiologyExams: number;
  totalRevenue: number;
  totalInsuranceClaims: number;
  bedOccupancyRate: number;
  avgLengthOfStay: number;
  infectiousDiseaseCount: number;
  status: number; // 0=Draft, 1=Submitted, 2=Acknowledged, 3=Rejected
  statusName: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  remarks?: string;
  createdAt: string;
}

export interface ProvincialReportSearchDto {
  reportType?: number;
  status?: number;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface ProvincialReportPagedResult {
  items: ProvincialReportDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface InfectiousDiseaseReportDto {
  id: string;
  diseaseCode: string;
  diseaseName: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientAddress: string;
  onsetDate: string;
  diagnosisDate: string;
  reportDate: string;
  severity: string;
  outcome: string;
  status: number;
  statusName: string;
}

export interface ProvincialStatsDto {
  totalReportsThisMonth: number;
  totalSubmitted: number;
  totalAcknowledged: number;
  totalPending: number;
  lastReportDate?: string;
  connectionStatus: string;
  infectiousDiseaseAlerts: number;
}

export interface ProvincialConnectionDto {
  endpoint: string;
  status: string;
  lastSync: string;
  protocol: string;
  certificateExpiry?: string;
}

// ==================== API Functions ====================

export const searchReports = (search: ProvincialReportSearchDto = {}) =>
  apiClient.post<ProvincialReportPagedResult>('/provincial-health/reports/search', {
    pageIndex: search.pageIndex ?? 0,
    pageSize: search.pageSize ?? 20,
    ...search,
  }).then(r => r.data);

export const getReportById = (id: string) =>
  apiClient.get<ProvincialReportDto>(`/provincial-health/reports/${id}`).then(r => r.data);

export const generateReport = (reportType: number, period: string) =>
  apiClient.post<ProvincialReportDto>('/provincial-health/reports/generate', { reportType, period }).then(r => r.data);

export const submitReport = (id: string) =>
  apiClient.post<{ success: boolean; message: string }>(`/provincial-health/reports/submit/${id}`).then(r => r.data);

export const getStats = () =>
  apiClient.get<ProvincialStatsDto>('/provincial-health/stats').then(r => r.data);

export const testConnection = () =>
  apiClient.get<{ connected: boolean; message: string; latencyMs: number }>('/provincial-health/test-connection').then(r => r.data);

export const getConnectionInfo = () =>
  apiClient.get<ProvincialConnectionDto>('/provincial-health/connection').then(r => r.data);

export const getInfectiousDiseaseReports = (dateFrom?: string, dateTo?: string) =>
  apiClient.get<InfectiousDiseaseReportDto[]>('/provincial-health/infectious-diseases', {
    params: { dateFrom, dateTo },
  }).then(r => r.data);

export const submitInfectiousReport = (id: string) =>
  apiClient.post<{ success: boolean; message: string }>(`/provincial-health/infectious-diseases/submit/${id}`).then(r => r.data);
