import apiClient from './client';

const BASE_URL = '/business-alerts';

// ===== Types =====

export interface BusinessAlertDto {
  id: string;
  alertCode: string;
  category: string;
  title: string;
  message: string;
  severity: number;
  severityLabel: string;
  severityColor: string;
  module: string;
  patientId?: string;
  patientName?: string;
  examinationId?: string;
  admissionId?: string;
  entityType?: string;
  entityId?: string;
  status: number;
  statusLabel: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  actionTaken?: string;
  details?: string;
  createdAt: string;
}

export interface AlertCheckResult {
  newAlerts: BusinessAlertDto[];
  totalNewAlerts: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export interface BusinessAlertSearchDto {
  patientId?: string;
  module?: string;
  category?: string;
  severity?: number;
  status?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface BusinessAlertPagedResult {
  items: BusinessAlertDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface BusinessAlertRuleDto {
  alertCode: string;
  category: string;
  title: string;
  description: string;
  defaultSeverity: number;
  module: string;
  isActive: boolean;
}

// ===== Check Alerts =====

export const checkOpdAlerts = (patientId: string, examinationId?: string) =>
  apiClient.get<AlertCheckResult>(`${BASE_URL}/check/opd/${patientId}`, {
    params: examinationId ? { examinationId } : undefined,
  });

export const checkInpatientAlerts = (patientId: string, admissionId?: string) =>
  apiClient.get<AlertCheckResult>(`${BASE_URL}/check/inpatient/${patientId}`, {
    params: admissionId ? { admissionId } : undefined,
  });

export const checkRadiologyAlerts = (patientId: string, requestId?: string) =>
  apiClient.get<AlertCheckResult>(`${BASE_URL}/check/radiology/${patientId}`, {
    params: requestId ? { requestId } : undefined,
  });

export const checkLabAlerts = (patientId: string, requestId?: string) =>
  apiClient.get<AlertCheckResult>(`${BASE_URL}/check/lab/${patientId}`, {
    params: requestId ? { requestId } : undefined,
  });

export const checkPharmacyAlerts = () =>
  apiClient.get<AlertCheckResult>(`${BASE_URL}/check/pharmacy`);

export const checkBillingAlerts = (patientId: string) =>
  apiClient.get<AlertCheckResult>(`${BASE_URL}/check/billing/${patientId}`);

// ===== Query Alerts =====

export const getActiveAlerts = (params: BusinessAlertSearchDto) =>
  apiClient.get<BusinessAlertPagedResult>(`${BASE_URL}/active`, { params });

// ===== Actions =====

export const acknowledgeAlert = (id: string, actionTaken?: string) =>
  apiClient.put<BusinessAlertDto>(`${BASE_URL}/${id}/acknowledge`, { actionTaken });

export const resolveAlert = (id: string) =>
  apiClient.put(`${BASE_URL}/${id}/resolve`);

// ===== Rules =====

export const getAlertRules = () =>
  apiClient.get<BusinessAlertRuleDto[]>(`${BASE_URL}/rules`);
