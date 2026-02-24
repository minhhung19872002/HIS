/**
 * Reporting API Module - Luồng 10: Báo cáo & Thống kê
 * Frontend API calls for HIS Reporting Module
 */

import apiClient from './client';

// ================== Types ==================

export interface ReportRequestDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  format?: 'Excel' | 'PDF' | 'HTML';
  includeDetails?: boolean;
}

export interface DashboardSummaryDto {
  totalPatients: number;
  outpatientCount: number;
  inpatientCount: number;
  emergencyCount: number;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  totalExaminations: number;
  totalLabTests: number;
  totalRadiologyExams: number;
  totalSurgeries: number;
  occupancyRate: number;
  availableBeds: number;
}

export interface DashboardChartDataDto {
  date: string;
  label: string;
  value: number;
  value2?: number;
  category?: string;
}

export interface DepartmentStatDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  patientCount: number;
  revenue: number;
  percentage: number;
}

export interface ServiceStatDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  usageCount: number;
  revenue: number;
  percentage: number;
}

export interface AlertDto {
  alertType: 'Warning' | 'Error' | 'Info';
  title: string;
  message: string;
  module: string;
  count: number;
  actionUrl?: string;
  createdAt: string;
}

export interface DashboardDto {
  dataDate: string;
  today: DashboardSummaryDto;
  thisMonth: DashboardSummaryDto;
  patientTrend: DashboardChartDataDto[];
  revenueTrend: DashboardChartDataDto[];
  topDepartments: DepartmentStatDto[];
  topServices: ServiceStatDto[];
  alerts: AlertDto[];
}

export interface KPIItemDto {
  code: string;
  name: string;
  description: string;
  currentValue: number;
  targetValue: number;
  previousValue: number;
  unit: string;
  trend: 'Up' | 'Down' | 'Stable';
  changePercent: number;
  status: 'Good' | 'Warning' | 'Bad';
}

export interface KPIDashboardDto {
  fromDate: string;
  toDate: string;
  clinicalKPIs: KPIItemDto[];
  financialKPIs: KPIItemDto[];
  operationalKPIs: KPIItemDto[];
  qualityKPIs: KPIItemDto[];
}

export interface PatientByDepartmentItemDto {
  departmentName: string;
  outpatientCount: number;
  inpatientCount: number;
  emergencyCount: number;
  totalCount: number;
  percentage: number;
}

export interface PatientByDepartmentReportDto {
  fromDate: string;
  toDate: string;
  totalPatients: number;
  departments: PatientByDepartmentItemDto[];
}

export interface DiseaseStatItemDto {
  rank: number;
  icdCode: string;
  icdName: string;
  caseCount: number;
  maleCount: number;
  femaleCount: number;
  percentage: number;
}

export interface Top10DiseasesReportDto {
  fromDate: string;
  toDate: string;
  totalDiagnoses: number;
  diseases: DiseaseStatItemDto[];
}

export interface RevenueByDayDto {
  date: string;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  transactionCount: number;
}

export interface RevenueByDepartmentDto {
  departmentName: string;
  revenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  percentage: number;
}

export interface RevenueReportDto {
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  otherRevenue: number;
  byDay: RevenueByDayDto[];
  byDepartment: RevenueByDepartmentDto[];
}

export interface PatientDebtItemDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  phoneNumber: string;
  debtAmount: number;
  daysOverdue: number;
  lastPaymentDate: string;
  departmentName: string;
}

export interface PatientDebtReportDto {
  asOfDate: string;
  totalDebt: number;
  totalDebtors: number;
  debtUnder30Days: number;
  debt30To60Days: number;
  debt60To90Days: number;
  debtOver90Days: number;
  topDebtors: PatientDebtItemDto[];
}

export interface InsuranceClaimReportDto {
  fromDate: string;
  toDate: string;
  totalClaimAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  pendingAmount: number;
  totalClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  pendingClaims: number;
  approvalRate: number;
}

export interface StockMovementItemDto {
  itemCode: string;
  itemName: string;
  unit: string;
  openingStock: number;
  importQuantity: number;
  exportQuantity: number;
  closingStock: number;
  unitPrice: number;
  stockValue: number;
}

export interface StockMovementReportDto {
  fromDate: string;
  toDate: string;
  warehouseId?: string;
  warehouseName: string;
  openingStockValue: number;
  importValue: number;
  exportValue: number;
  closingStockValue: number;
  items: StockMovementItemDto[];
}

export interface ControlledDrugItemDto {
  rowNumber: number;
  date: string;
  patientCode: string;
  patientName: string;
  diagnosis: string;
  drugCode: string;
  drugName: string;
  quantity: number;
  unit: string;
  doctorName: string;
  licenseNumber: string;
}

export interface ControlledDrugReportDto {
  fromDate: string;
  toDate: string;
  drugType: string;
  items: ControlledDrugItemDto[];
}

export interface ExpiringDrugItemDto {
  itemCode: string;
  itemName: string;
  lotNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  warehouseName: string;
}

export interface ExpiringDrugsReportDto {
  asOfDate: string;
  daysAhead: number;
  totalItems: number;
  totalValue: number;
  items: ExpiringDrugItemDto[];
}

export interface ReportHistoryDto {
  id: string;
  reportCode: string;
  reportName: string;
  fromDate: string;
  toDate: string;
  format: string;
  createdBy: string;
  createdAt: string;
  filePath: string;
  fileSize: number;
}

export interface ScheduledReportConfigDto {
  id: string;
  reportCode: string;
  reportName: string;
  schedule: string;
  cronExpression: string;
  format: string;
  recipients: string;
  isActive: boolean;
  lastRunTime?: string;
  nextRunTime?: string;
  parameters?: string;
}

export interface SaveScheduledReportDto {
  id?: string;
  reportCode: string;
  schedule: string;
  cronExpression: string;
  format: string;
  recipients: string;
  isActive: boolean;
  parameters?: string;
}

export interface ReportDefinitionDto {
  reportCode: string;
  reportName: string;
  description: string;
  category: string;
  module: string;
  supportedFormats: string[];
  requiredPermissions: string[];
}

// ================== API Functions ==================

const BASE_URL = '/reporting';

// Dashboard & KPI
export const getDashboard = (date?: string) =>
  apiClient.get<DashboardDto>(`${BASE_URL}/dashboard`, { params: { date } });

export const getDepartmentDashboard = (departmentId: string, date?: string) =>
  apiClient.get<DashboardDto>(`${BASE_URL}/dashboard/department/${departmentId}`, { params: { date } });

export const getKPIDashboard = (fromDate: string, toDate: string) =>
  apiClient.get<KPIDashboardDto>(`${BASE_URL}/kpi`, { params: { fromDate, toDate } });

export const getRealtimeWaitingCount = () =>
  apiClient.get<Record<string, number>>(`${BASE_URL}/realtime/waiting-count`);

export const getRealtimeBedAvailability = () =>
  apiClient.get<Record<string, number>>(`${BASE_URL}/realtime/bed-availability`);

export const getAlerts = (module?: string, top?: number) =>
  apiClient.get<AlertDto[]>(`${BASE_URL}/alerts`, { params: { module, top } });

// Clinical Reports
export const getPatientByDepartmentReport = (
  fromDate: string,
  toDate: string,
  departmentId?: string
) =>
  apiClient.get<PatientByDepartmentReportDto>(`${BASE_URL}/clinical/patient-by-department`, {
    params: { fromDate, toDate, departmentId },
  });

export const getTop10DiseasesReport = (
  fromDate: string,
  toDate: string,
  patientType?: string
) =>
  apiClient.get<Top10DiseasesReportDto>(`${BASE_URL}/clinical/top-diseases`, {
    params: { fromDate, toDate, patientType },
  });

export const getMortalityReport = (
  fromDate: string,
  toDate: string,
  departmentId?: string
) =>
  apiClient.get(`${BASE_URL}/clinical/mortality`, {
    params: { fromDate, toDate, departmentId },
  });

export const getSurgeryStatisticsReport = (
  fromDate: string,
  toDate: string,
  departmentId?: string
) =>
  apiClient.get(`${BASE_URL}/clinical/surgery-statistics`, {
    params: { fromDate, toDate, departmentId },
  });

// Financial Reports
export const getRevenueReport = (
  fromDate: string,
  toDate: string,
  departmentId?: string,
  patientType?: string
) =>
  apiClient.get<RevenueReportDto>(`${BASE_URL}/financial/revenue`, {
    params: { fromDate, toDate, departmentId, patientType },
  });

export const getDailyRevenueReport = (fromDate: string, toDate: string) =>
  apiClient.get<RevenueByDayDto[]>(`${BASE_URL}/financial/daily-revenue`, {
    params: { fromDate, toDate },
  });

export const getPatientDebtReport = (asOfDate?: string, departmentId?: string) =>
  apiClient.get<PatientDebtReportDto>(`${BASE_URL}/financial/patient-debt`, {
    params: { asOfDate, departmentId },
  });

export const getInsuranceClaimReport = (fromDate: string, toDate: string) =>
  apiClient.get<InsuranceClaimReportDto>(`${BASE_URL}/financial/insurance-claims`, {
    params: { fromDate, toDate },
  });

export const getProfitByDepartmentReport = (fromDate: string, toDate: string) =>
  apiClient.get(`${BASE_URL}/financial/profit-by-department`, {
    params: { fromDate, toDate },
  });

// Pharmacy Reports
export const getCurrentStockReport = (warehouseId?: string, category?: string) =>
  apiClient.get(`${BASE_URL}/pharmacy/current-stock`, {
    params: { warehouseId, category },
  });

export const getStockMovementReport = (
  fromDate: string,
  toDate: string,
  warehouseId?: string
) =>
  apiClient.get<StockMovementReportDto>(`${BASE_URL}/pharmacy/stock-movement`, {
    params: { fromDate, toDate, warehouseId },
  });

export const getNarcoticDrugReport = (fromDate: string, toDate: string) =>
  apiClient.get<ControlledDrugReportDto>(`${BASE_URL}/pharmacy/narcotic-drugs`, {
    params: { fromDate, toDate },
  });

export const getPsychotropicDrugReport = (fromDate: string, toDate: string) =>
  apiClient.get<ControlledDrugReportDto>(`${BASE_URL}/pharmacy/psychotropic-drugs`, {
    params: { fromDate, toDate },
  });

export const getExpiringDrugsReport = (daysAhead?: number, warehouseId?: string) =>
  apiClient.get<ExpiringDrugsReportDto>(`${BASE_URL}/pharmacy/expiring-drugs`, {
    params: { daysAhead, warehouseId },
  });

// Administrative Reports
export const getUserStatisticsReport = (fromDate: string, toDate: string) =>
  apiClient.get(`${BASE_URL}/admin/user-statistics`, {
    params: { fromDate, toDate },
  });

export const getAuditLogReport = (
  fromDate: string,
  toDate: string,
  module?: string,
  userName?: string
) =>
  apiClient.get(`${BASE_URL}/admin/audit-log`, {
    params: { fromDate, toDate, module, userName },
  });

// Export Reports
export const exportToExcel = (
  reportCode: string,
  fromDate: string,
  toDate: string
): string =>
  `${BASE_URL}/export/excel/${reportCode}?fromDate=${fromDate}&toDate=${toDate}`;

export const exportToPdf = (
  reportCode: string,
  fromDate: string,
  toDate: string
): string =>
  `${BASE_URL}/export/pdf/${reportCode}?fromDate=${fromDate}&toDate=${toDate}`;

export const getReportHistory = (
  reportCode?: string,
  fromDate?: string,
  toDate?: string,
  top?: number
) =>
  apiClient.get<ReportHistoryDto[]>(`${BASE_URL}/history`, {
    params: { reportCode, fromDate, toDate, top },
  });

export const downloadReportFromHistory = (reportHistoryId: string): string =>
  `${BASE_URL}/history/${reportHistoryId}/download`;

// Scheduled Reports
export const getScheduledReports = () =>
  apiClient.get<ScheduledReportConfigDto[]>(`${BASE_URL}/scheduled`);

export const saveScheduledReport = (data: SaveScheduledReportDto) =>
  apiClient.post<ScheduledReportConfigDto>(`${BASE_URL}/scheduled`, data);

export const deleteScheduledReport = (id: string) =>
  apiClient.delete(`${BASE_URL}/scheduled/${id}`);

export const runScheduledReportNow = (id: string) =>
  apiClient.post(`${BASE_URL}/scheduled/${id}/run`);

// Report Definitions
export const getReportDefinitions = (category?: string) =>
  apiClient.get<ReportDefinitionDto[]>(`${BASE_URL}/definitions`, {
    params: { category },
  });

export const getReportDefinition = (reportCode: string) =>
  apiClient.get<ReportDefinitionDto>(`${BASE_URL}/definitions/${reportCode}`);

// Export all as default
export default {
  // Dashboard & KPI
  getDashboard,
  getDepartmentDashboard,
  getKPIDashboard,
  getRealtimeWaitingCount,
  getRealtimeBedAvailability,
  getAlerts,

  // Clinical Reports
  getPatientByDepartmentReport,
  getTop10DiseasesReport,
  getMortalityReport,
  getSurgeryStatisticsReport,

  // Financial Reports
  getRevenueReport,
  getDailyRevenueReport,
  getPatientDebtReport,
  getInsuranceClaimReport,
  getProfitByDepartmentReport,

  // Pharmacy Reports
  getCurrentStockReport,
  getStockMovementReport,
  getNarcoticDrugReport,
  getPsychotropicDrugReport,
  getExpiringDrugsReport,

  // Admin Reports
  getUserStatisticsReport,
  getAuditLogReport,

  // Export
  exportToExcel,
  exportToPdf,
  getReportHistory,
  downloadReportFromHistory,

  // Scheduled
  getScheduledReports,
  saveScheduledReport,
  deleteScheduledReport,
  runScheduledReportNow,

  // Definitions
  getReportDefinitions,
  getReportDefinition,
};
