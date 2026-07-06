/**
 * Module 11: Quản lý Tài chính Kế toán
 * DTOs + financeApi
 */

import { apiClient } from '../../services/apiClient';

// ============================================================================
// DTOs
// ============================================================================

export interface RevenueByOrderingDeptDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  serviceRevenue: number;
  medicineRevenue: number;
  supplyRevenue: number;
  bedRevenue: number;
  otherRevenue: number;
  orderCount: number;
  patientCount: number;
}

export interface RevenueByExecutingDeptDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  serviceRevenue: number;
  executionCount: number;
  patientCount: number;
}

export interface RevenueByServiceDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceGroupName: string;
  quantity: number;
  unitPrice: number;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

export interface SurgeryProfitReportDto {
  surgeryId: string;
  surgeryCode: string;
  surgeryName: string;
  departmentName: string;
  surgeryCount: number;
  totalRevenue: number;
  materialCost: number;
  medicineCost: number;
  personnelCost: number;
  overheadCost: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

export interface CostByDepartmentDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  medicineCost: number;
  supplyCost: number;
  equipmentCost: number;
  personnelCost: number;
  utilityCost: number;
  otherCost: number;
  totalCost: number;
}

export interface FinancialSummaryReportDto {
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  otherRevenue: number;
  totalCost: number;
  medicineCost: number;
  supplyCost: number;
  personnelCost: number;
  operatingCost: number;
  depreciation: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  revenueByDepartment: RevenueByExecutingDeptDto[];
  costByDepartment: CostByDepartmentDto[];
}

export interface PatientDebtReportDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  phoneNumber: string;
  totalDebt: number;
  insuranceDebt: number;
  patientDebt: number;
  oldestDebtDate: string;
  debtAgeDays: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  visits: PatientDebtDetailDto[];
}

export interface PatientDebtDetailDto {
  visitId: string;
  visitDate: string;
  visitType: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
}

export interface InsuranceDebtReportDto {
  period: string;
  insuranceCode: string;
  totalClaims: number;
  totalClaimAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  pendingAmount: number;
  paidAmount: number;
  debtAmount: number;
}

export interface InsuranceReconciliationDto {
  fromDate: string;
  toDate: string;
  totalPatients: number;
  totalVisits: number;
  totalClaimAmount: number;
  hospitalCalculation: number;
  insuranceCalculation: number;
  difference: number;
  differencePercentage: number;
  rejectedClaims: InsuranceRejectedClaimDto[];
  adjustedClaims: InsuranceAdjustedClaimDto[];
}

export interface InsuranceRejectedClaimDto {
  claimId: string;
  patientName: string;
  visitDate: string;
  claimAmount: number;
  rejectReason: string;
}

export interface InsuranceAdjustedClaimDto {
  claimId: string;
  patientName: string;
  visitDate: string;
  originalAmount: number;
  adjustedAmount: number;
  adjustReason: string;
}

export interface FinancialReportRequest {
  reportType: string;
  fromDate: string;
  toDate: string;
  departmentId?: string;
  serviceId?: string;
  groupBy?: string;
  outputFormat?: string;
}

// ============================================================================
// API Object
// ============================================================================

export const financeApi = {
  // 11.1 Báo cáo doanh thu theo khoa chỉ định
  getRevenueByOrderingDept: (fromDate: string, toDate: string, departmentId?: string, revenueType?: string) =>
    apiClient.get<RevenueByOrderingDeptDto[]>('/finance/revenue/ordering-dept', {
      params: { fromDate, toDate, departmentId, revenueType }
    }),

  // 11.2 Báo cáo doanh thu theo khoa thực hiện
  getRevenueByExecutingDept: (fromDate: string, toDate: string, departmentId?: string, revenueType?: string) =>
    apiClient.get<RevenueByExecutingDeptDto[]>('/finance/revenue/executing-dept', {
      params: { fromDate, toDate, departmentId, revenueType }
    }),

  // 11.3 Báo cáo doanh thu theo dịch vụ
  getRevenueByService: (fromDate: string, toDate: string, serviceGroupId?: string, serviceId?: string) =>
    apiClient.get<RevenueByServiceDto[]>('/finance/revenue/service', {
      params: { fromDate, toDate, serviceGroupId, serviceId }
    }),

  // 11.4 Báo cáo lợi nhuận phẫu thuật
  getSurgeryProfitReport: (fromDate: string, toDate: string, departmentId?: string, surgeryId?: string) =>
    apiClient.get<SurgeryProfitReportDto[]>('/finance/profit/surgery', {
      params: { fromDate, toDate, departmentId, surgeryId }
    }),

  // 11.5 Báo cáo chi phí theo khoa
  getCostByDepartment: (fromDate: string, toDate: string, departmentId?: string, costType?: string) =>
    apiClient.get<CostByDepartmentDto[]>('/finance/cost/department', {
      params: { fromDate, toDate, departmentId, costType }
    }),

  // 11.6 Báo cáo thu chi tổng hợp
  getFinancialSummary: (fromDate: string, toDate: string) =>
    apiClient.get<FinancialSummaryReportDto>('/finance/summary', { params: { fromDate, toDate } }),

  // 11.7 Báo cáo công nợ bệnh nhân
  getPatientDebtReport: (fromDate?: string, toDate?: string, debtStatus?: string) =>
    apiClient.get<PatientDebtReportDto[]>('/finance/debt/patient', { params: { fromDate, toDate, debtStatus } }),

  // 11.8 Báo cáo công nợ BHYT
  getInsuranceDebtReport: (fromDate: string, toDate: string, insuranceCode?: string) =>
    apiClient.get<InsuranceDebtReportDto[]>('/finance/debt/insurance', { params: { fromDate, toDate, insuranceCode } }),

  // 11.9 Đối soát BHYT
  getInsuranceReconciliation: (fromDate: string, toDate: string, insuranceCode?: string) =>
    apiClient.get<InsuranceReconciliationDto>('/finance/insurance/reconciliation', { params: { fromDate, toDate, insuranceCode } }),

  // In và xuất báo cáo
  printFinancialReport: (request: FinancialReportRequest) =>
    apiClient.post<Blob>('/finance/reports/print', request, { responseType: 'blob' }),

  exportFinancialReport: (request: FinancialReportRequest) =>
    apiClient.post<Blob>('/finance/reports/export', request, { responseType: 'blob' }),
};
