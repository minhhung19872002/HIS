/**
 * Module 11: Quản lý Tài chính Kế toán
 * DTOs + financeApi
 */

import { apiClient } from '../../../../services/apiClient';

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
// BE → FE normalizers
// The /finance report endpoints return report WRAPPERS ([{fromDate,toDate,byService:[...]}], ...) with other
// field names than the row DTOs above, so the v2 Finance screen rendered one blank row per report and every
// missing amount as "Miễn phí" (fmtVNDg(undefined)). Flatten + rename here so pages keep one contract.
// ============================================================================

type Raw = Record<string, unknown>;
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const optNum = (v: unknown): number => (v == null ? (undefined as unknown as number) : num(v));
const flatten = (data: unknown, key: string): Raw[] =>
  (Array.isArray(data) ? data : []).flatMap((x: Raw) => (Array.isArray(x?.[key]) ? (x[key] as Raw[]) : [x]));

const toRevenueByService = (r: Raw): RevenueByServiceDto => ({
  ...(r as unknown as RevenueByServiceDto),
  serviceGroupName: (r.serviceGroupName ?? r.serviceGroup ?? '') as string,
  quantity: num(r.quantity),
  unitPrice: num(r.unitPrice),
  totalRevenue: num(r.totalRevenue),
  insuranceRevenue: num(r.insuranceRevenue),
  patientRevenue: num(r.patientRevenue),
  // BE has no per-service cost yet — 0 instead of undefined ("Miễn phí").
  cost: num(r.cost),
  profit: r.profit != null ? num(r.profit) : num(r.totalRevenue) - num(r.cost),
  profitMargin: num(r.profitMargin),
});

const toSurgeryProfit = (r: Raw): SurgeryProfitReportDto => {
  const revenue = num(r.totalRevenue ?? r.revenue);
  const totalCost = num(r.totalCost);
  const profit = r.profit != null ? num(r.profit) : revenue - totalCost;
  return {
    surgeryId: (r.surgeryId ?? r.surgeryCode ?? '') as string,
    surgeryCode: (r.surgeryCode ?? '') as string,
    surgeryName: (r.surgeryName ?? '') as string,
    departmentName: (r.departmentName ?? '') as string,
    surgeryCount: num(r.surgeryCount ?? r.count),
    totalRevenue: revenue,
    materialCost: num(r.materialCost ?? r.supplyCost),
    medicineCost: num(r.medicineCost),
    personnelCost: num(r.personnelCost ?? r.laborCost),
    overheadCost: num(r.overheadCost),
    totalCost,
    profit,
    profitMargin: r.profitMargin != null ? num(r.profitMargin) : (revenue > 0 ? (profit / revenue) * 100 : 0),
  };
};

const toFinancialSummary = (r: Raw): FinancialSummaryReportDto => {
  const totalRevenue = num(r.totalRevenue);
  const netProfit = num(r.netProfit);
  return {
    ...(r as unknown as FinancialSummaryReportDto),
    totalRevenue,
    totalCost: num(r.totalCost),
    grossProfit: num(r.grossProfit),
    netProfit,
    // Breakdown lines the BE summary does not return stay undefined (page renders "—"), never a made-up 0.
    insuranceRevenue: optNum(r.insuranceRevenue),
    patientRevenue: optNum(r.patientRevenue),
    medicineCost: optNum(r.medicineCost),
    personnelCost: optNum(r.personnelCost),
    profitMargin: r.profitMargin != null ? num(r.profitMargin) : (totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0),
    revenueByDepartment: (r.revenueByDepartment ?? []) as RevenueByExecutingDeptDto[],
    costByDepartment: (r.costByDepartment ?? []) as CostByDepartmentDto[],
  };
};

const toInsuranceReconciliation = (r: Raw): InsuranceReconciliationDto => {
  const hospital = num(r.hospitalCalculation ?? r.hospitalAmount);
  const insurance = num(r.insuranceCalculation ?? r.insuranceAmount);
  const difference = r.difference != null ? num(r.difference) : hospital - insurance;
  return {
    ...(r as unknown as InsuranceReconciliationDto),
    totalPatients: optNum(r.totalPatients),
    totalVisits: optNum(r.totalVisits),
    hospitalCalculation: hospital,
    insuranceCalculation: insurance,
    difference,
    differencePercentage: r.differencePercentage != null ? num(r.differencePercentage) : (hospital > 0 ? (difference / hospital) * 100 : 0),
    rejectedClaims: (r.rejectedClaims ?? []) as InsuranceRejectedClaimDto[],
    adjustedClaims: (r.adjustedClaims ?? []) as InsuranceAdjustedClaimDto[],
  };
};

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
    }).then((r) => ({
      ...r,
      data: flatten(r.data, 'byDepartment').map((x) => ({
        ...(x as unknown as RevenueByExecutingDeptDto),
        executionCount: num(x.executionCount ?? x.serviceCount),
      })),
    })),

  // 11.3 Báo cáo doanh thu theo dịch vụ
  getRevenueByService: (fromDate: string, toDate: string, serviceGroupId?: string, serviceId?: string) =>
    apiClient.get<RevenueByServiceDto[]>('/finance/revenue/service', {
      params: { fromDate, toDate, serviceGroupId, serviceId }
    }).then((r) => ({ ...r, data: flatten(r.data, 'byService').map(toRevenueByService) })),

  // 11.4 Báo cáo lợi nhuận phẫu thuật
  getSurgeryProfitReport: (fromDate: string, toDate: string, departmentId?: string, surgeryId?: string) =>
    apiClient.get<SurgeryProfitReportDto[]>('/finance/profit/surgery', {
      params: { fromDate, toDate, departmentId, surgeryId }
    }).then((r) => ({ ...r, data: flatten(r.data, 'items').map(toSurgeryProfit) })),

  // 11.5 Báo cáo chi phí theo khoa
  getCostByDepartment: (fromDate: string, toDate: string, departmentId?: string, costType?: string) =>
    apiClient.get<CostByDepartmentDto[]>('/finance/cost/department', {
      params: { fromDate, toDate, departmentId, costType }
    }),

  // 11.6 Báo cáo thu chi tổng hợp
  getFinancialSummary: (fromDate: string, toDate: string) =>
    apiClient.get<FinancialSummaryReportDto>('/finance/summary', { params: { fromDate, toDate } })
      .then((r) => ({ ...r, data: r.data ? toFinancialSummary(r.data as unknown as Raw) : r.data })),

  // 11.7 Báo cáo công nợ bệnh nhân
  getPatientDebtReport: (fromDate?: string, toDate?: string, debtStatus?: string) =>
    apiClient.get<PatientDebtReportDto[]>('/finance/debt/patient', { params: { fromDate, toDate, debtStatus } }),

  // 11.8 Báo cáo công nợ BHYT
  getInsuranceDebtReport: (fromDate: string, toDate: string, insuranceCode?: string) =>
    apiClient.get<InsuranceDebtReportDto[]>('/finance/debt/insurance', { params: { fromDate, toDate, insuranceCode } }),

  // 11.9 Đối soát BHYT
  getInsuranceReconciliation: (fromDate: string, toDate: string, insuranceCode?: string) =>
    apiClient.get<InsuranceReconciliationDto>('/finance/insurance/reconciliation', { params: { fromDate, toDate, insuranceCode } })
      .then((r) => ({ ...r, data: r.data ? toInsuranceReconciliation(r.data as unknown as Raw) : r.data })),

  // In và xuất báo cáo
  printFinancialReport: (request: FinancialReportRequest) =>
    apiClient.post<Blob>('/finance/reports/print', request, { responseType: 'blob' }),

  exportFinancialReport: (request: FinancialReportRequest) =>
    apiClient.post<Blob>('/finance/reports/export', request, { responseType: 'blob' }),
};
