/**
 * Reconciliation Reports API Client
 * Level 6 Reconciliation Reports (Đối chiếu Level 6 - 8 báo cáo)
 */

import { apiClient } from './client';

// ============================================================================
// DTOs
// ============================================================================

// Report 1: Supplier Procurement
export interface SupplierProcurementReportDto {
  fromDate: string;
  toDate: string;
  totalSuppliers: number;
  totalItems: number;
  totalContractValue: number;
  totalDeliveredValue: number;
  fulfillmentRate: number;
  items: SupplierProcurementItemDto[];
}

export interface SupplierProcurementItemDto {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  itemCount: number;
  receiptCount: number;
  contractValue: number;
  deliveredValue: number;
  deliveredQuantity: number;
  fulfillmentRate: number;
  averageDeliveryDays: number;
  lastDeliveryDate?: string;
}

// Report 2: Revenue by Record
export interface RevenueByRecordReportDto {
  fromDate: string;
  toDate: string;
  totalRecords: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageProfitMargin: number;
  items: RevenueByRecordItemDto[];
}

export interface RevenueByRecordItemDto {
  medicalRecordId: string;
  medicalRecordCode: string;
  patientName: string;
  patientCode: string;
  departmentName: string;
  diagnosis?: string;
  serviceRevenue: number;
  medicineRevenue: number;
  supplyRevenue: number;
  bedRevenue: number;
  totalRevenue: number;
  medicineCost: number;
  supplyCost: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

// Report 3: Department Cost vs Fees
export interface DeptCostVsFeesReportDto {
  fromDate: string;
  toDate: string;
  totalDeptCost: number;
  totalHospitalFees: number;
  totalDifference: number;
  items: DeptCostVsFeesItemDto[];
}

export interface DeptCostVsFeesItemDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  serviceCost: number;
  medicineCost: number;
  supplyCost: number;
  totalDeptCost: number;
  serviceFees: number;
  medicineFees: number;
  supplyFees: number;
  totalHospitalFees: number;
  difference: number;
  differencePercent: number;
}

// Report 4: Record Cost Summary
export interface RecordCostSummaryReportDto {
  fromDate: string;
  toDate: string;
  totalRecords: number;
  totalUsed: number;
  totalCollected: number;
  totalDifference: number;
  overchargedCount: number;
  underchargedCount: number;
  items: RecordCostSummaryItemDto[];
}

export interface RecordCostSummaryItemDto {
  medicalRecordId: string;
  medicalRecordCode: string;
  patientName: string;
  departmentName: string;
  serviceUsed: number;
  medicineUsed: number;
  supplyUsed: number;
  totalUsed: number;
  serviceCollected: number;
  medicineCollected: number;
  supplyCollected: number;
  totalCollected: number;
  difference: number;
  status: string;
}

// Report 5: Fees vs Standards
export interface FeesVsStandardsReportDto {
  fromDate: string;
  toDate: string;
  totalServices: number;
  withinStandardCount: number;
  exceedStandardCount: number;
  totalActualFees: number;
  totalStandardFees: number;
  items: FeesVsStandardsItemDto[];
}

export interface FeesVsStandardsItemDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceGroupName: string;
  usageCount: number;
  standardPrice: number;
  actualAvgPrice: number;
  totalStandardAmount: number;
  totalActualAmount: number;
  difference: number;
  differencePercent: number;
  status: string;
}

// Report 6: Service Order Doctors
export interface ServiceOrderDoctorsReportDto {
  fromDate: string;
  toDate: string;
  totalOrders: number;
  sameDoctorCount: number;
  differentDoctorCount: number;
  noExecutorCount: number;
  items: ServiceOrderDoctorsItemDto[];
}

export interface ServiceOrderDoctorsItemDto {
  serviceRequestId: string;
  requestCode: string;
  requestDate: string;
  patientName: string;
  serviceName: string;
  orderingDoctorName: string;
  orderingDepartmentName?: string;
  executingDoctorName?: string;
  executingDepartmentName?: string;
  amount: number;
  status: string;
}

// Report 7: Dispensing vs Billing
export interface DispensingVsBillingReportDto {
  fromDate: string;
  toDate: string;
  totalDispensed: number;
  totalBilled: number;
  totalDifference: number;
  items: DispensingVsBillingItemDto[];
}

export interface DispensingVsBillingItemDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  medicineDispensed: number;
  supplyDispensed: number;
  totalDispensed: number;
  medicineBilled: number;
  supplyBilled: number;
  totalBilled: number;
  difference: number;
  differencePercent: number;
}

// Report 8: Dispensing vs Standards
export interface DispensingVsStandardsReportDto {
  fromDate: string;
  toDate: string;
  totalDepartments: number;
  totalDispensed: number;
  totalStandard: number;
  items: DispensingVsStandardsItemDto[];
}

export interface DispensingVsStandardsItemDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  patientCount: number;
  medicineDispensed: number;
  supplyDispensed: number;
  totalDispensed: number;
  standardPerPatient: number;
  totalStandard: number;
  difference: number;
  differencePercent: number;
  status: string;
}

// ============================================================================
// API Functions
// ============================================================================

export const reconciliationApi = {
  // BC1: Theo dõi kết quả trúng thầu theo NCC
  getSupplierProcurement: (fromDate: string, toDate: string, supplierId?: string) =>
    apiClient.get<SupplierProcurementReportDto>('/reports/reconciliation/supplier-procurement', {
      params: { fromDate, toDate, supplierId },
    }),

  // BC2: Tính doanh thu chi phí theo HSBA
  getRevenueByRecord: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<RevenueByRecordReportDto>('/reports/reconciliation/revenue-by-record', {
      params: { fromDate, toDate, departmentId },
    }),

  // BC3: Đối chiếu chi phí khoa phòng vs viện phí
  getDeptCostVsFees: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<DeptCostVsFeesReportDto>('/reports/reconciliation/dept-cost-vs-fees', {
      params: { fromDate, toDate, departmentId },
    }),

  // BC4: Tổng hợp chi phí HSBA: sử dụng vs thu
  getRecordCostSummary: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<RecordCostSummaryReportDto>('/reports/reconciliation/record-cost-summary', {
      params: { fromDate, toDate, departmentId },
    }),

  // BC5: Đối chiếu viện phí vs định mức DVKT
  getFeesVsStandards: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<FeesVsStandardsReportDto>('/reports/reconciliation/fees-vs-standards', {
      params: { fromDate, toDate, departmentId },
    }),

  // BC6: Đối chiếu DVKT giữa BS chỉ định và BS thực hiện
  getServiceOrderDoctors: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<ServiceOrderDoctorsReportDto>('/reports/reconciliation/service-order-doctors', {
      params: { fromDate, toDate, departmentId },
    }),

  // BC7: Đối chiếu xuất kho thuốc/VTYT vs viện phí theo khoa
  getDispensingVsBilling: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<DispensingVsBillingReportDto>('/reports/reconciliation/dispensing-vs-billing', {
      params: { fromDate, toDate, departmentId },
    }),

  // BC8: Đối chiếu xuất kho vs định mức theo khoa phòng
  getDispensingVsStandards: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<DispensingVsStandardsReportDto>('/reports/reconciliation/dispensing-vs-standards', {
      params: { fromDate, toDate, departmentId },
    }),
};

export default reconciliationApi;
