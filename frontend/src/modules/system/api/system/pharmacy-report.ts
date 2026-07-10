/**
 * Module 15: Báo cáo Dược
 * DTOs + pharmacyReportApi
 */

import { apiClient } from '../../../../services/apiClient';

// ============================================================================
// DTOs
// ============================================================================

export interface NarcoticDrugRegisterDto {
  date: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  unit: string;
  openingStock: number;
  receivedQuantity: number;
  issuedQuantity: number;
  closingStock: number;
  patientName?: string;
  prescriptionNumber?: string;
  doctorName?: string;
  note?: string;
}

export interface PsychotropicDrugRegisterDto {
  date: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  unit: string;
  openingStock: number;
  receivedQuantity: number;
  issuedQuantity: number;
  closingStock: number;
  patientName?: string;
  prescriptionNumber?: string;
  doctorName?: string;
  note?: string;
}

export interface PrecursorDrugRegisterDto {
  date: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  unit: string;
  openingStock: number;
  receivedQuantity: number;
  issuedQuantity: number;
  closingStock: number;
  patientName?: string;
  prescriptionNumber?: string;
  doctorName?: string;
  note?: string;
}

export interface MedicineUsageReportDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  genericName: string;
  unit: string;
  medicineGroupName: string;
  totalQuantity: number;
  totalValue: number;
  insuranceQuantity: number;
  insuranceValue: number;
  patientQuantity: number;
  patientValue: number;
  outpatientQuantity: number;
  inpatientQuantity: number;
  prescriptionCount: number;
  patientCount: number;
}

export interface AntibioticUsageReportDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  antibioticClass: string;
  unit: string;
  totalQuantity: number;
  totalValue: number;
  dddPerThousandPatientDays: number;
  prescriptionCount: number;
  patientCount: number;
  averageDuration: number;
  departmentBreakdown: AntibioticByDepartmentDto[];
}

export interface AntibioticByDepartmentDto {
  departmentId: string;
  departmentName: string;
  quantity: number;
  value: number;
  prescriptionCount: number;
}

export interface InventoryRecordDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  batchNumber: string;
  expiryDate: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  unitPrice: number;
  totalValue: number;
  note?: string;
}

export interface DrugStockMovementReportDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  medicineGroupName: string;
  openingStock: number;
  openingValue: number;
  receivedQuantity: number;
  receivedValue: number;
  issuedQuantity: number;
  issuedValue: number;
  adjustmentQuantity: number;
  adjustmentValue: number;
  closingStock: number;
  closingValue: number;
}

export interface ExpiringDrugReportDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  batchNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface ExpiredDrugReportDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  batchNumber: string;
  expiryDate: string;
  daysExpired: number;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  disposalStatus: string;
}

export interface LowStockDrugReportDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minStock: number;
  shortfall: number;
  averageDailyUsage: number;
  daysOfStock: number;
  lastOrderDate?: string;
  pendingOrderQuantity?: number;
}

export interface DrugCostByDeptReportDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  totalCost: number;
  medicineCost: number;
  narcoticsCount: number;
  antibioticCost: number;
  antibioticPercentage: number;
  prescriptionCount: number;
  patientCount: number;
  costPerPatient: number;
}

export interface DrugCostByPatientReportDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  patientType: string;
  admissionDate?: string;
  dischargeDate?: string;
  stayDays?: number;
  totalCost: number;
  insuranceCost: number;
  patientCost: number;
  prescriptionCount: number;
  medicineCount: number;
}

export interface DrugByPaymentTypeReportDto {
  paymentType: string;
  totalQuantity: number;
  totalValue: number;
  medicineCount: number;
  prescriptionCount: number;
  patientCount: number;
  details: DrugPaymentDetailDto[];
}

export interface DrugPaymentDetailDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  quantity: number;
  value: number;
}

export interface OutpatientPrescriptionStatDto {
  doctorId?: string;
  doctorName?: string;
  departmentId?: string;
  departmentName?: string;
  prescriptionCount: number;
  patientCount: number;
  totalMedicines: number;
  totalValue: number;
  averageMedicinesPerPrescription: number;
  averageValuePerPrescription: number;
  antibioticPrescriptionCount: number;
  antibioticPercentage: number;
}

export interface InpatientPrescriptionStatDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  patientCount: number;
  totalPrescriptions: number;
  totalValue: number;
  averageValuePerPatient: number;
  averageStayDays: number;
  dailyCostPerPatient: number;
}

export interface ABCVENReportDto {
  fromDate: string;
  toDate: string;
  totalItems: number;
  totalValue: number;
  classAItems: ABCClassDto;
  classBItems: ABCClassDto;
  classCItems: ABCClassDto;
  vitalItems: VENClassDto;
  essentialItems: VENClassDto;
  nonEssentialItems: VENClassDto;
  matrix: ABCVENMatrixDto[];
}

export interface ABCClassDto {
  itemCount: number;
  percentage: number;
  value: number;
  valuePercentage: number;
}

export interface VENClassDto {
  itemCount: number;
  percentage: number;
  value: number;
  valuePercentage: number;
}

export interface ABCVENMatrixDto {
  abcClass: string;
  venClass: string;
  itemCount: number;
  value: number;
  items: string[];
}

export interface DDDReportDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  atcCode: string;
  dddValue: number;
  dddUnit: string;
  totalQuantityUsed: number;
  numberOfDDDs: number;
  dddPerThousandPatientDays: number;
  patientCount: number;
  prescriptionCount: number;
}

export interface PharmacyReportRequest {
  reportType: string;
  fromDate: string;
  toDate: string;
  warehouseId?: string;
  medicineId?: string;
  departmentId?: string;
  outputFormat?: string;
}

// ============================================================================
// API Object
// ============================================================================

export const pharmacyReportApi = {
  // 15.1 Sổ theo dõi thuốc gây nghiện
  getNarcoticDrugRegister: (fromDate: string, toDate: string, warehouseId?: string) =>
    apiClient.get<NarcoticDrugRegisterDto[]>('/pharmacy/reports/narcotic-drugs', { params: { fromDate, toDate, warehouseId } }),

  // 15.2 Sổ theo dõi thuốc hướng thần
  getPsychotropicDrugRegister: (fromDate: string, toDate: string, warehouseId?: string) =>
    apiClient.get<PsychotropicDrugRegisterDto[]>('/pharmacy/reports/psychotropic-drugs', { params: { fromDate, toDate, warehouseId } }),

  // 15.3 Sổ theo dõi thuốc tiền chất
  getPrecursorDrugRegister: (fromDate: string, toDate: string, warehouseId?: string) =>
    apiClient.get<PrecursorDrugRegisterDto[]>('/pharmacy/reports/precursor-drugs', { params: { fromDate, toDate, warehouseId } }),

  // 15.4 Báo cáo sử dụng thuốc theo TT20/2017
  getMedicineUsageReport: (fromDate: string, toDate: string, medicineId?: string, departmentId?: string) =>
    apiClient.get<MedicineUsageReportDto[]>('/pharmacy/reports/medicine-usage', { params: { fromDate, toDate, medicineId, departmentId } }),

  // 15.5 Báo cáo sử dụng kháng sinh
  getAntibioticUsageReport: (fromDate: string, toDate: string, antibioticId?: string, departmentId?: string) =>
    apiClient.get<AntibioticUsageReportDto[]>('/pharmacy/reports/antibiotic-usage', { params: { fromDate, toDate, antibioticId, departmentId } }),

  // 15.6 Sổ kiểm kê thuốc (TT22)
  getDrugInventoryRecord: (inventoryDate: string, warehouseId: string) =>
    apiClient.get<InventoryRecordDto[]>('/pharmacy/reports/inventory-record', { params: { inventoryDate, warehouseId } }),

  // 15.7 Báo cáo xuất nhập tồn kho thuốc
  getDrugStockMovementReport: (fromDate: string, toDate: string, warehouseId?: string, medicineGroupId?: string) =>
    apiClient.get<DrugStockMovementReportDto[]>('/pharmacy/reports/stock-movement', { params: { fromDate, toDate, warehouseId, medicineGroupId } }),

  // 15.8 Báo cáo thuốc sắp hết hạn
  getExpiringDrugReport: (daysUntilExpiry?: number, warehouseId?: string) =>
    apiClient.get<ExpiringDrugReportDto[]>('/pharmacy/reports/expiring-drugs', { params: { daysUntilExpiry, warehouseId } }),

  // 15.9 Báo cáo thuốc đã hết hạn
  getExpiredDrugReport: (warehouseId?: string) =>
    apiClient.get<ExpiredDrugReportDto[]>('/pharmacy/reports/expired-drugs', { params: { warehouseId } }),

  // 15.10 Báo cáo thuốc tồn kho dưới mức tối thiểu
  getLowStockDrugReport: (warehouseId?: string) =>
    apiClient.get<LowStockDrugReportDto[]>('/pharmacy/reports/low-stock-drugs', { params: { warehouseId } }),

  // 15.11 Báo cáo chi phí thuốc theo khoa
  getDrugCostByDeptReport: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<DrugCostByDeptReportDto[]>('/pharmacy/reports/drug-cost-by-dept', { params: { fromDate, toDate, departmentId } }),

  // 15.12 Báo cáo chi phí thuốc theo bệnh nhân
  getDrugCostByPatientReport: (fromDate: string, toDate: string, patientId?: string, patientType?: string) =>
    apiClient.get<DrugCostByPatientReportDto[]>('/pharmacy/reports/drug-cost-by-patient', { params: { fromDate, toDate, patientId, patientType } }),

  // 15.13 Báo cáo thuốc BHYT/Viện phí
  getDrugByPaymentTypeReport: (fromDate: string, toDate: string, paymentType?: string) =>
    apiClient.get<DrugByPaymentTypeReportDto[]>('/pharmacy/reports/drug-by-payment-type', { params: { fromDate, toDate, paymentType } }),

  // 15.14 Thống kê đơn thuốc ngoại trú
  getOutpatientPrescriptionStat: (fromDate: string, toDate: string, doctorId?: string, departmentId?: string) =>
    apiClient.get<OutpatientPrescriptionStatDto[]>('/pharmacy/reports/outpatient-prescription-stat', { params: { fromDate, toDate, doctorId, departmentId } }),

  // 15.15 Thống kê đơn thuốc nội trú
  getInpatientPrescriptionStat: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<InpatientPrescriptionStatDto[]>('/pharmacy/reports/inpatient-prescription-stat', { params: { fromDate, toDate, departmentId } }),

  // 15.16 Báo cáo ABC/VEN
  getABCVENReport: (fromDate: string, toDate: string, warehouseId?: string) =>
    apiClient.get<ABCVENReportDto>('/pharmacy/reports/abc-ven', { params: { fromDate, toDate, warehouseId } }),

  // 15.17 Báo cáo DDD
  getDDDReport: (fromDate: string, toDate: string, medicineId?: string) =>
    apiClient.get<DDDReportDto[]>('/pharmacy/reports/ddd', { params: { fromDate, toDate, medicineId } }),

  // In và xuất báo cáo
  printPharmacyReport: (request: PharmacyReportRequest) =>
    apiClient.post<Blob>('/pharmacy/reports/print', request, { responseType: 'blob' }),
  exportPharmacyReport: (request: PharmacyReportRequest) =>
    apiClient.post<Blob>('/pharmacy/reports/export', request, { responseType: 'blob' }),
};
