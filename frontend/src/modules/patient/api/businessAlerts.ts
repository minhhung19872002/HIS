import apiClient from '../../../services/apiClient';

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

// ===== Inline Safety Checks (Rules 35-39) =====

export const checkBloodTypeMismatch = (patientId: string, bloodType: string, rhFactor?: string) =>
  apiClient.get<AlertCheckResult>(`${BASE_URL}/check/blood-type/${patientId}`, {
    params: { bloodType, rhFactor },
  });

export const checkBhytClsDailyLimit = (patientId: string, newOrderCount = 1) =>
  apiClient.get<AlertCheckResult>(`${BASE_URL}/check/bhyt-cls-limit/${patientId}`, {
    params: { newOrderCount },
  });

export const checkIcdBhytProtocol = (patientId: string, icdCode: string, medicineIds: string[]) =>
  apiClient.post<AlertCheckResult>(`${BASE_URL}/check/bhyt-protocol/${patientId}`, medicineIds, {
    params: { icdCode },
  });

export const checkUnfilledPrescriptions = (patientId: string) =>
  apiClient.get<AlertCheckResult>(`${BASE_URL}/check/unfilled-rx/${patientId}`);

export interface CostEstimationResult {
  patientId: string;
  patientType: number;
  patientTypeName: string;
  insuranceCoverageRate?: number;
  items: CostEstimationItem[];
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
}

export interface CostEstimationItem {
  serviceId: string;
  serviceName: string;
  serviceGroupName: string;
  unitPrice: number;
  insurancePrice: number;
  patientPrice: number;
  coverageRate?: number;
}

export const estimateCost = (patientId: string, serviceIds: string[]) =>
  apiClient.post<CostEstimationResult>(`${BASE_URL}/estimate-cost/${patientId}`, serviceIds);

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

// ===== Special Test Rule CRUD (F2.13) =====

/** WindowType: 0 = per-episode (1 lần/đợt), 1 = N-ngày */
export interface SpecialTestRuleDto {
  id: string;
  testId: string;
  testName: string;
  windowType: 0 | 1;
  windowDays?: number;
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SpecialTestRuleSaveDto {
  id?: string;
  testId: string;
  windowType: 0 | 1;
  windowDays?: number;
  note?: string;
  isActive: boolean;
}

export interface SpecialTestRuleSearchDto {
  keyword?: string;
  isActive?: boolean;
  pageIndex?: number;
  pageSize?: number;
}

export interface SpecialTestRulePagedResult {
  items: SpecialTestRuleDto[];
  totalCount: number;
}

export const getSpecialTestRules = (params: SpecialTestRuleSearchDto) =>
  apiClient.get<SpecialTestRulePagedResult>(`${BASE_URL}/special-test-rules`, { params });

export const getSpecialTestRuleById = (id: string) =>
  apiClient.get<SpecialTestRuleDto>(`${BASE_URL}/special-test-rules/${id}`);

export const saveSpecialTestRule = (dto: SpecialTestRuleSaveDto) =>
  apiClient.post<SpecialTestRuleDto>(`${BASE_URL}/special-test-rules`, dto);

export const deleteSpecialTestRule = (id: string) =>
  apiClient.delete(`${BASE_URL}/special-test-rules/${id}`);
