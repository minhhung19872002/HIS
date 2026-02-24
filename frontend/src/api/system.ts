/**
 * System API Client
 * Covers Modules: 11 (Tài chính), 13 (Danh mục), 15 (Báo cáo Dược), 16 (HSBA & Thống kê), 17 (Quản trị)
 */

import { apiClient } from './client';

// ============================================================================
// Module 11: Quản lý Tài chính Kế toán - DTOs
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
// Module 13: Quản lý Danh mục - DTOs
// ============================================================================

export interface ExaminationServiceCatalogDto {
  id?: string;
  code: string;
  name: string;
  nameEnglish?: string;
  description?: string;
  departmentId: string;
  departmentName?: string;
  serviceGroupId?: string;
  serviceGroupName?: string;
  bhxhCode?: string;
  bhxhName?: string;
  unitPrice: number;
  insurancePrice?: number;
  executionTime?: number;
  isActive: boolean;
  sortOrder?: number;
}

export interface ParaclinicalServiceCatalogDto {
  id?: string;
  code: string;
  name: string;
  nameEnglish?: string;
  description?: string;
  serviceType: string;
  departmentId: string;
  departmentName?: string;
  serviceGroupId?: string;
  serviceGroupName?: string;
  bhxhCode?: string;
  bhxhName?: string;
  unitPrice: number;
  insurancePrice?: number;
  executionTime?: number;
  requiresSample?: boolean;
  sampleType?: string;
  equipmentId?: string;
  equipmentName?: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface MedicineCatalogDto {
  id?: string;
  code: string;
  name: string;
  genericName: string;
  brandName?: string;
  activeIngredient: string;
  concentration?: string;
  dosageForm: string;
  unit: string;
  packagingUnit?: string;
  conversionRate?: number;
  medicineGroupId?: string;
  medicineGroupName?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  registrationNumber?: string;
  bhxhCode?: string;
  bhxhName?: string;
  unitPrice: number;
  insurancePrice?: number;
  vatRate?: number;
  isNarcotic: boolean;
  isPsychotropic: boolean;
  isPrecursor: boolean;
  isAntibiotic: boolean;
  requiresPrescription: boolean;
  storageCondition?: string;
  shelfLife?: number;
  minStock?: number;
  maxStock?: number;
  isActive: boolean;
}

export interface MedicineCatalogSearchDto {
  keyword?: string;
  medicineGroupId?: string;
  bhxhCode?: string;
  isNarcotic?: boolean;
  isPsychotropic?: boolean;
  isPrecursor?: boolean;
  isAntibiotic?: boolean;
  isActive?: boolean;
  pageIndex?: number;
  pageSize?: number;
}

export interface MedicalSupplyCatalogDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  unit: string;
  bhxhCode?: string;
  bhxhName?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  unitPrice: number;
  insurancePrice?: number;
  vatRate?: number;
  minStock?: number;
  maxStock?: number;
  isActive: boolean;
}

export interface ICD10CatalogDto {
  id?: string;
  code: string;
  name: string;
  nameEnglish?: string;
  chapterCode: string;
  chapterName?: string;
  groupCode?: string;
  groupName?: string;
  bhxhCode?: string;
  isReportable: boolean;
  isActive: boolean;
}

export interface DepartmentCatalogDto {
  id?: string;
  code: string;
  name: string;
  nameEnglish?: string;
  departmentType: string;
  parentId?: string;
  parentName?: string;
  managerId?: string;
  managerName?: string;
  phone?: string;
  email?: string;
  location?: string;
  bedCount?: number;
  isActive: boolean;
  sortOrder?: number;
}

export interface RoomCatalogDto {
  id?: string;
  code: string;
  name: string;
  departmentId: string;
  departmentName?: string;
  roomType: string;
  floor?: string;
  building?: string;
  bedCount?: number;
  maxCapacity?: number;
  isActive: boolean;
}

export interface BedCatalogDto {
  id?: string;
  code: string;
  name: string;
  roomId: string;
  roomName?: string;
  departmentId?: string;
  departmentName?: string;
  bedType: string;
  dailyRate?: number;
  insuranceRate?: number;
  isActive: boolean;
}

export interface EmployeeCatalogDto {
  id?: string;
  code: string;
  fullName: string;
  gender: string;
  dateOfBirth?: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  departmentId?: string;
  departmentName?: string;
  position: string;
  title?: string;
  specialty?: string;
  licenseNumber?: string;
  startDate?: string;
  isDoctor: boolean;
  isNurse: boolean;
  canPrescribe: boolean;
  signatureImage?: string;
  isActive: boolean;
}

export interface SupplierCatalogDto {
  id?: string;
  code: string;
  name: string;
  supplierType: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  contactPhone?: string;
  bankAccount?: string;
  bankName?: string;
  paymentTerms?: string;
  isActive: boolean;
}

export interface ServicePriceCatalogDto {
  id?: string;
  serviceId: string;
  serviceCode?: string;
  serviceName?: string;
  priceType: string;
  patientTypeId?: string;
  patientTypeName?: string;
  unitPrice: number;
  insurancePrice?: number;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
}

export interface PatientTypeCatalogDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  discountRate?: number;
  insuranceCoverage?: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder?: number;
}

export interface AdmissionSourceCatalogDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder?: number;
}

export interface PrintTemplateCatalogDto {
  id?: string;
  code: string;
  name: string;
  templateType: string;
  departmentId?: string;
  departmentName?: string;
  templateContent: string;
  paperSize?: string;
  orientation?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface MedicalRecordTemplateCatalogDto {
  id?: string;
  code: string;
  name: string;
  templateType: string;
  description?: string;
  templateContent: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface ServiceGroupCatalogDto {
  id?: string;
  code: string;
  name: string;
  groupType: string;
  parentId?: string;
  parentName?: string;
  description?: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface MedicineGroupCatalogDto {
  id?: string;
  code: string;
  name: string;
  parentId?: string;
  parentName?: string;
  description?: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface SyncResultDto {
  isSuccess: boolean;
  totalRecords: number;
  insertedRecords: number;
  updatedRecords: number;
  failedRecords: number;
  errors: string[];
  syncDate: string;
}

// ============================================================================
// Module 15: Báo cáo Dược - DTOs
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
// Module 16: HSBA & Thống kê - DTOs
// ============================================================================

export interface MedicalRecordArchiveDto {
  id?: string;
  medicalRecordNumber: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  dateOfBirth: string;
  gender: string;
  admissionDate: string;
  dischargeDate: string;
  departmentId: string;
  departmentName: string;
  primaryDiagnosis: string;
  icdCode: string;
  dischargeStatus: string;
  archiveDate: string;
  archiveLocation: string;
  shelfNumber?: string;
  boxNumber?: string;
  archiveStatus: string;
  retentionYears: number;
  destructionDate?: string;
  archivedBy?: string;
  note?: string;
}

export interface MedicalRecordBorrowRequestDto {
  id?: string;
  medicalRecordArchiveId: string;
  medicalRecordNumber: string;
  patientName: string;
  borrowerId: string;
  borrowerName: string;
  borrowerDepartment?: string;
  requestDate: string;
  purpose: string;
  expectedReturnDate: string;
  actualBorrowDate?: string;
  actualReturnDate?: string;
  status: string;
  approvedBy?: string;
  approvedDate?: string;
  processedBy?: string;
  processedDate?: string;
  returnReceivedBy?: string;
  note?: string;
}

export interface CreateBorrowRequestDto {
  medicalRecordArchiveId: string;
  purpose: string;
  expectedReturnDate: string;
  note?: string;
}

export interface HospitalDashboardDto {
  date: string;
  outpatientCount: number;
  outpatientChange: number;
  inpatientCount: number;
  inpatientChange: number;
  emergencyCount: number;
  emergencyChange: number;
  surgeryCount: number;
  surgeryChange: number;
  admissionCount: number;
  dischargeCount: number;
  bedOccupancyRate: number;
  averageStayDays: number;
  totalRevenue: number;
  revenueChange: number;
  outpatientByDepartment: DepartmentCountDto[];
  inpatientByDepartment: DepartmentCountDto[];
  revenueByDepartment: DepartmentRevenueDto[];
}

export interface DepartmentCountDto {
  departmentId: string;
  departmentName: string;
  count: number;
}

export interface DepartmentRevenueDto {
  departmentId: string;
  departmentName: string;
  revenue: number;
}

export interface DepartmentStatisticsDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  outpatientCount: number;
  inpatientCount: number;
  admissionCount: number;
  dischargeCount: number;
  transferInCount: number;
  transferOutCount: number;
  deathCount: number;
  surgeryCount: number;
  bedCount: number;
  occupiedBeds: number;
  occupancyRate: number;
  averageStayDays: number;
  totalRevenue: number;
}

export interface ExaminationStatisticsDto {
  date?: string;
  departmentId?: string;
  departmentName?: string;
  doctorId?: string;
  doctorName?: string;
  totalExaminations: number;
  newPatients: number;
  followUpPatients: number;
  insurancePatients: number;
  feePayingPatients: number;
  freePatients: number;
  maleCount: number;
  femaleCount: number;
  childrenCount: number;
  elderlyCount: number;
}

export interface AdmissionStatisticsDto {
  date?: string;
  departmentId?: string;
  departmentName?: string;
  admissionSource?: string;
  totalAdmissions: number;
  emergencyAdmissions: number;
  electiveAdmissions: number;
  transferAdmissions: number;
  insuranceAdmissions: number;
  feePayingAdmissions: number;
  maleCount: number;
  femaleCount: number;
  childrenCount: number;
  elderlyCount: number;
}

export interface DischargeStatisticsDto {
  date?: string;
  departmentId?: string;
  departmentName?: string;
  totalDischarges: number;
  recoveredCount: number;
  improvedCount: number;
  unchangedCount: number;
  worsenedCount: number;
  deathCount: number;
  transferCount: number;
  selfDischargeCount: number;
  averageStayDays: number;
}

export interface MortalityStatisticsDto {
  departmentId?: string;
  departmentName?: string;
  totalDeaths: number;
  deathWithin24Hours: number;
  deathAfter24Hours: number;
  surgicalDeaths: number;
  nonSurgicalDeaths: number;
  mortalityRate: number;
  causeOfDeathBreakdown: CauseOfDeathDto[];
}

export interface CauseOfDeathDto {
  icdCode: string;
  icdName: string;
  count: number;
  percentage: number;
}

export interface DiseaseStatisticsDto {
  icdCode: string;
  icdName: string;
  chapterCode?: string;
  chapterName?: string;
  totalCases: number;
  outpatientCases: number;
  inpatientCases: number;
  maleCount: number;
  femaleCount: number;
  deathCount: number;
  averageStayDays?: number;
}

export interface DepartmentActivityReportDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  outpatientVisits: number;
  inpatientAdmissions: number;
  surgeries: number;
  labTests: number;
  imagingExams: number;
  procedures: number;
  consultations: number;
  totalRevenue: number;
  personnelCount: number;
  productivityPerPerson: number;
}

export interface BedOccupancyReportDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  patientDays: number;
  bedDays: number;
  averageStayDays: number;
  turnoverRate: number;
}

export interface BYTReportDto {
  reportPeriod: string;
  hospitalName: string;
  hospitalCode: string;
  a1Data: A1ReportDataDto;
  a2Data: A2ReportDataDto;
  a3Data: A3ReportDataDto;
}

export interface A1ReportDataDto {
  totalOutpatients: number;
  totalInpatients: number;
  totalBeds: number;
  averageOccupancy: number;
}

export interface A2ReportDataDto {
  diseaseStatistics: DiseaseStatisticsDto[];
}

export interface A3ReportDataDto {
  surgeryStatistics: SurgeryStatisticsDto[];
}

export interface SurgeryStatisticsDto {
  surgeryType: string;
  totalCount: number;
  successCount: number;
  complicationCount: number;
}

export interface HospitalKPIDto {
  kpiId: string;
  kpiName: string;
  kpiCategory: string;
  targetValue: number;
  actualValue: number;
  achievement: number;
  unit: string;
  trend: string;
  status: string;
}

export interface StatisticsReportRequest {
  reportType: string;
  fromDate: string;
  toDate: string;
  departmentId?: string;
  groupBy?: string;
  outputFormat?: string;
}

// ============================================================================
// Module 17: Quản trị Hệ thống - DTOs
// ============================================================================

export interface SystemUserDto {
  id?: string;
  username: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  employeeId?: string;
  employeeCode?: string;
  departmentId?: string;
  departmentName?: string;
  roles: RoleDto[];
  isActive: boolean;
  isLocked: boolean;
  lockReason?: string;
  lastLoginDate?: string;
  lastLoginIP?: string;
  createdDate: string;
  createdBy?: string;
  modifiedDate?: string;
  modifiedBy?: string;
}

export interface CreateUserDto {
  username: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  employeeId?: string;
  departmentId?: string;
  roleIds: string[];
  initialPassword?: string;
}

export interface UpdateUserDto {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  employeeId?: string;
  departmentId?: string;
  roleIds: string[];
  isActive: boolean;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RoleDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions?: PermissionDto[];
  userCount?: number;
  isActive: boolean;
}

export interface PermissionDto {
  id?: string;
  code: string;
  name: string;
  module: string;
  description?: string;
  isActive: boolean;
}

export interface AuditLogDto {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
  duration?: number;
  isSuccess: boolean;
  errorMessage?: string;
}

export interface AuditLogSearchDto {
  fromDate?: string;
  toDate?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface SystemConfigDto {
  configKey: string;
  configValue: string;
  category: string;
  description?: string;
  dataType: string;
  isEncrypted: boolean;
  isEditable: boolean;
  modifiedDate?: string;
  modifiedBy?: string;
}

export interface UserSessionDto {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  loginTime: string;
  lastActivityTime: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  isActive: boolean;
}

export interface SystemNotificationDto {
  id?: string;
  title: string;
  content: string;
  notificationType: string;
  priority: string;
  targetRoles?: string[];
  targetUsers?: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdDate?: string;
  createdBy?: string;
}

export interface BackupHistoryDto {
  id: string;
  backupName: string;
  backupType: string;
  filePath: string;
  fileSize: number;
  databaseName: string;
  backupDate: string;
  backupBy: string;
  status: string;
  duration: number;
  isCompressed: boolean;
  description?: string;
}

export interface CreateBackupDto {
  backupName: string;
  backupType: string;
  description?: string;
  compressBackup: boolean;
}

export interface SystemHealthDto {
  status: string;
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  databaseStatus: string;
  cacheStatus: string;
  queueStatus: string;
  lastCheckTime: string;
  services: ServiceHealthDto[];
}

export interface ServiceHealthDto {
  serviceName: string;
  status: string;
  responseTime: number;
  lastError?: string;
  lastErrorTime?: string;
}

export interface SystemResourceDto {
  resourceName: string;
  resourceType: string;
  currentValue: number;
  maxValue: number;
  unit: string;
  utilizationPercentage: number;
  status: string;
}

export interface DatabaseStatisticsDto {
  tableName: string;
  rowCount: number;
  dataSize: number;
  indexSize: number;
  totalSize: number;
  lastModified?: string;
}

export interface IntegrationConfigDto {
  id?: string;
  integrationName: string;
  integrationType: string;
  endpoint: string;
  authType: string;
  username?: string;
  apiKey?: string;
  additionalConfig?: string;
  isActive: boolean;
  lastTestDate?: string;
  lastTestResult?: string;
}

export interface IntegrationLogDto {
  id: string;
  integrationId: string;
  integrationName: string;
  requestTime: string;
  responseTime?: string;
  duration?: number;
  requestData?: string;
  responseData?: string;
  status: string;
  errorMessage?: string;
}

// ============================================================================
// Module 11: Quản lý Tài chính Kế toán - API Functions
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

// ============================================================================
// Module 13: Quản lý Danh mục - API Functions
// ============================================================================

export const catalogApi = {
  // Dịch vụ khám
  getExaminationServices: (keyword?: string, isActive?: boolean) =>
    apiClient.get<ExaminationServiceCatalogDto[]>('/catalog/examination-services', { params: { keyword, isActive } }),
  getExaminationService: (serviceId: string) =>
    apiClient.get<ExaminationServiceCatalogDto>(`/catalog/examination-services/${serviceId}`),
  saveExaminationService: (dto: ExaminationServiceCatalogDto) =>
    apiClient.post<ExaminationServiceCatalogDto>('/catalog/examination-services', dto),
  deleteExaminationService: (serviceId: string) =>
    apiClient.delete<boolean>(`/catalog/examination-services/${serviceId}`),

  // Dịch vụ cận lâm sàng
  getParaclinicalServices: (keyword?: string, serviceType?: string, isActive?: boolean) =>
    apiClient.get<ParaclinicalServiceCatalogDto[]>('/catalog/paraclinical-services', { params: { keyword, serviceType, isActive } }),
  getParaclinicalService: (serviceId: string) =>
    apiClient.get<ParaclinicalServiceCatalogDto>(`/catalog/paraclinical-services/${serviceId}`),
  saveParaclinicalService: (dto: ParaclinicalServiceCatalogDto) =>
    apiClient.post<ParaclinicalServiceCatalogDto>('/catalog/paraclinical-services', dto),
  deleteParaclinicalService: (serviceId: string) =>
    apiClient.delete<boolean>(`/catalog/paraclinical-services/${serviceId}`),

  // Thuốc
  getMedicines: (search: MedicineCatalogSearchDto) =>
    apiClient.get<MedicineCatalogDto[]>('/catalog/medicines', { params: search }),
  getMedicine: (medicineId: string) =>
    apiClient.get<MedicineCatalogDto>(`/catalog/medicines/${medicineId}`),
  saveMedicine: (dto: MedicineCatalogDto) =>
    apiClient.post<MedicineCatalogDto>('/catalog/medicines', dto),
  deleteMedicine: (medicineId: string) =>
    apiClient.delete<boolean>(`/catalog/medicines/${medicineId}`),
  importMedicines: (fileData: ArrayBuffer) =>
    apiClient.post<boolean>('/catalog/medicines/import', fileData),
  exportMedicines: (search: MedicineCatalogSearchDto) =>
    apiClient.post<Blob>('/catalog/medicines/export', search, { responseType: 'blob' }),

  // Vật tư y tế
  getMedicalSupplies: (keyword?: string, categoryId?: string, isActive?: boolean) =>
    apiClient.get<MedicalSupplyCatalogDto[]>('/catalog/medical-supplies', { params: { keyword, categoryId, isActive } }),
  getMedicalSupply: (supplyId: string) =>
    apiClient.get<MedicalSupplyCatalogDto>(`/catalog/medical-supplies/${supplyId}`),
  saveMedicalSupply: (dto: MedicalSupplyCatalogDto) =>
    apiClient.post<MedicalSupplyCatalogDto>('/catalog/medical-supplies', dto),
  deleteMedicalSupply: (supplyId: string) =>
    apiClient.delete<boolean>(`/catalog/medical-supplies/${supplyId}`),

  // ICD-10
  getICD10Codes: (keyword?: string, chapterCode?: string, isActive?: boolean) =>
    apiClient.get<ICD10CatalogDto[]>('/catalog/icd10', { params: { keyword, chapterCode, isActive } }),
  getICD10Code: (icd10Id: string) =>
    apiClient.get<ICD10CatalogDto>(`/catalog/icd10/${icd10Id}`),
  saveICD10Code: (dto: ICD10CatalogDto) =>
    apiClient.post<ICD10CatalogDto>('/catalog/icd10', dto),
  deleteICD10Code: (icd10Id: string) =>
    apiClient.delete<boolean>(`/catalog/icd10/${icd10Id}`),
  importICD10: (fileData: ArrayBuffer) =>
    apiClient.post<boolean>('/catalog/icd10/import', fileData),
  exportICD10: (chapterCode?: string) =>
    apiClient.get<Blob>('/catalog/icd10/export', { params: { chapterCode }, responseType: 'blob' }),

  // Khoa phòng
  getDepartments: (keyword?: string, departmentType?: string, isActive?: boolean) =>
    apiClient.get<DepartmentCatalogDto[]>('/catalog/departments', { params: { keyword, departmentType, isActive } }),
  getDepartment: (departmentId: string) =>
    apiClient.get<DepartmentCatalogDto>(`/catalog/departments/${departmentId}`),
  saveDepartment: (dto: DepartmentCatalogDto) =>
    apiClient.post<DepartmentCatalogDto>('/catalog/departments', dto),
  deleteDepartment: (departmentId: string) =>
    apiClient.delete<boolean>(`/catalog/departments/${departmentId}`),

  // Phòng/Giường
  getRooms: (departmentId?: string, roomType?: string, isActive?: boolean) =>
    apiClient.get<RoomCatalogDto[]>('/catalog/rooms', { params: { departmentId, roomType, isActive } }),
  getRoom: (roomId: string) =>
    apiClient.get<RoomCatalogDto>(`/catalog/rooms/${roomId}`),
  saveRoom: (dto: RoomCatalogDto) =>
    apiClient.post<RoomCatalogDto>('/catalog/rooms', dto),
  deleteRoom: (roomId: string) =>
    apiClient.delete<boolean>(`/catalog/rooms/${roomId}`),
  getBeds: (roomId?: string, isActive?: boolean) =>
    apiClient.get<BedCatalogDto[]>('/catalog/beds', { params: { roomId, isActive } }),
  getBed: (bedId: string) =>
    apiClient.get<BedCatalogDto>(`/catalog/beds/${bedId}`),
  saveBed: (dto: BedCatalogDto) =>
    apiClient.post<BedCatalogDto>('/catalog/beds', dto),
  deleteBed: (bedId: string) =>
    apiClient.delete<boolean>(`/catalog/beds/${bedId}`),

  // Nhân viên
  getEmployees: (keyword?: string, departmentId?: string, position?: string, isActive?: boolean) =>
    apiClient.get<EmployeeCatalogDto[]>('/catalog/employees', { params: { keyword, departmentId, position, isActive } }),
  getEmployee: (employeeId: string) =>
    apiClient.get<EmployeeCatalogDto>(`/catalog/employees/${employeeId}`),
  saveEmployee: (dto: EmployeeCatalogDto) =>
    apiClient.post<EmployeeCatalogDto>('/catalog/employees', dto),
  deleteEmployee: (employeeId: string) =>
    apiClient.delete<boolean>(`/catalog/employees/${employeeId}`),

  // Nhà cung cấp
  getSuppliers: (keyword?: string, supplierType?: string, isActive?: boolean) =>
    apiClient.get<SupplierCatalogDto[]>('/catalog/suppliers', { params: { keyword, supplierType, isActive } }),
  getSupplier: (supplierId: string) =>
    apiClient.get<SupplierCatalogDto>(`/catalog/suppliers/${supplierId}`),
  saveSupplier: (dto: SupplierCatalogDto) =>
    apiClient.post<SupplierCatalogDto>('/catalog/suppliers', dto),
  deleteSupplier: (supplierId: string) =>
    apiClient.delete<boolean>(`/catalog/suppliers/${supplierId}`),

  // Giá viện phí
  getServicePrices: (serviceId?: string, priceType?: string, effectiveDate?: string) =>
    apiClient.get<ServicePriceCatalogDto[]>('/catalog/service-prices', { params: { serviceId, priceType, effectiveDate } }),
  getServicePrice: (priceId: string) =>
    apiClient.get<ServicePriceCatalogDto>(`/catalog/service-prices/${priceId}`),
  saveServicePrice: (dto: ServicePriceCatalogDto) =>
    apiClient.post<ServicePriceCatalogDto>('/catalog/service-prices', dto),
  deleteServicePrice: (priceId: string) =>
    apiClient.delete<boolean>(`/catalog/service-prices/${priceId}`),

  // Các danh mục khác
  getPatientTypes: (isActive?: boolean) =>
    apiClient.get<PatientTypeCatalogDto[]>('/catalog/patient-types', { params: { isActive } }),
  savePatientType: (dto: PatientTypeCatalogDto) =>
    apiClient.post<PatientTypeCatalogDto>('/catalog/patient-types', dto),

  getAdmissionSources: (isActive?: boolean) =>
    apiClient.get<AdmissionSourceCatalogDto[]>('/catalog/admission-sources', { params: { isActive } }),
  saveAdmissionSource: (dto: AdmissionSourceCatalogDto) =>
    apiClient.post<AdmissionSourceCatalogDto>('/catalog/admission-sources', dto),

  getPrintTemplates: (templateType?: string, departmentId?: string, isActive?: boolean) =>
    apiClient.get<PrintTemplateCatalogDto[]>('/catalog/print-templates', { params: { templateType, departmentId, isActive } }),
  savePrintTemplate: (dto: PrintTemplateCatalogDto) =>
    apiClient.post<PrintTemplateCatalogDto>('/catalog/print-templates', dto),

  getMedicalRecordTemplates: (templateType?: string, isActive?: boolean) =>
    apiClient.get<MedicalRecordTemplateCatalogDto[]>('/catalog/medical-record-templates', { params: { templateType, isActive } }),
  saveMedicalRecordTemplate: (dto: MedicalRecordTemplateCatalogDto) =>
    apiClient.post<MedicalRecordTemplateCatalogDto>('/catalog/medical-record-templates', dto),

  getServiceGroups: (groupType?: string, isActive?: boolean) =>
    apiClient.get<ServiceGroupCatalogDto[]>('/catalog/service-groups', { params: { groupType, isActive } }),
  saveServiceGroup: (dto: ServiceGroupCatalogDto) =>
    apiClient.post<ServiceGroupCatalogDto>('/catalog/service-groups', dto),

  getMedicineGroups: (isActive?: boolean) =>
    apiClient.get<MedicineGroupCatalogDto[]>('/catalog/medicine-groups', { params: { isActive } }),
  saveMedicineGroup: (dto: MedicineGroupCatalogDto) =>
    apiClient.post<MedicineGroupCatalogDto>('/catalog/medicine-groups', dto),

  // Đồng bộ BHXH
  syncBHXHMedicines: () => apiClient.post<SyncResultDto>('/catalog/sync/bhxh/medicines'),
  syncBHXHServices: () => apiClient.post<SyncResultDto>('/catalog/sync/bhxh/services'),
  syncBHXHICD10: () => apiClient.post<SyncResultDto>('/catalog/sync/bhxh/icd10'),
  getLastSyncDate: (syncType: string) =>
    apiClient.get<string | null>('/catalog/sync/last-date', { params: { syncType } }),
};

// ============================================================================
// Module 15: Báo cáo Dược - API Functions
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

// ============================================================================
// Module 16: HSBA & Thống kê - API Functions
// ============================================================================

export const medicalRecordApi = {
  // Lưu trữ HSBA
  getArchives: (keyword?: string, year?: number, archiveStatus?: string, departmentId?: string) =>
    apiClient.get<MedicalRecordArchiveDto[]>('/medical-records/archives', { params: { keyword, year, archiveStatus, departmentId } }),
  getArchive: (archiveId: string) =>
    apiClient.get<MedicalRecordArchiveDto>(`/medical-records/archives/${archiveId}`),
  saveArchive: (dto: MedicalRecordArchiveDto) =>
    apiClient.post<MedicalRecordArchiveDto>('/medical-records/archives', dto),
  updateArchiveLocation: (archiveId: string, location: string) =>
    apiClient.put<boolean>(`/medical-records/archives/${archiveId}/location`, location),

  // Mượn trả HSBA
  getBorrowRequests: (fromDate?: string, toDate?: string, status?: string, borrowerId?: string) =>
    apiClient.get<MedicalRecordBorrowRequestDto[]>('/medical-records/borrow-requests', { params: { fromDate, toDate, status, borrowerId } }),
  getBorrowRequest: (requestId: string) =>
    apiClient.get<MedicalRecordBorrowRequestDto>(`/medical-records/borrow-requests/${requestId}`),
  createBorrowRequest: (dto: CreateBorrowRequestDto) =>
    apiClient.post<MedicalRecordBorrowRequestDto>('/medical-records/borrow-requests', dto),
  approveBorrowRequest: (requestId: string) =>
    apiClient.put<boolean>(`/medical-records/borrow-requests/${requestId}/approve`),
  rejectBorrowRequest: (requestId: string, reason: string) =>
    apiClient.put<boolean>(`/medical-records/borrow-requests/${requestId}/reject`, reason),
  processBorrow: (requestId: string) =>
    apiClient.put<boolean>(`/medical-records/borrow-requests/${requestId}/process`),
  returnMedicalRecord: (requestId: string, note?: string) =>
    apiClient.put<boolean>(`/medical-records/borrow-requests/${requestId}/return`, note),
};

export const statisticsApi = {
  // Dashboard
  getHospitalDashboard: (date?: string) =>
    apiClient.get<HospitalDashboardDto>('/statistics/dashboard', { params: { date } }),
  getDepartmentStatistics: (fromDate: string, toDate: string) =>
    apiClient.get<DepartmentStatisticsDto[]>('/statistics/departments', { params: { fromDate, toDate } }),

  // Báo cáo khám bệnh
  getExaminationStatistics: (fromDate: string, toDate: string, departmentId?: string, doctorId?: string) =>
    apiClient.get<ExaminationStatisticsDto[]>('/statistics/examination', { params: { fromDate, toDate, departmentId, doctorId } }),

  // Báo cáo nhập viện
  getAdmissionStatistics: (fromDate: string, toDate: string, departmentId?: string, admissionSource?: string) =>
    apiClient.get<AdmissionStatisticsDto[]>('/statistics/admission', { params: { fromDate, toDate, departmentId, admissionSource } }),

  // Báo cáo xuất viện
  getDischargeStatistics: (fromDate: string, toDate: string, departmentId?: string, dischargeType?: string) =>
    apiClient.get<DischargeStatisticsDto[]>('/statistics/discharge', { params: { fromDate, toDate, departmentId, dischargeType } }),

  // Báo cáo tử vong
  getMortalityStatistics: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<MortalityStatisticsDto[]>('/statistics/mortality', { params: { fromDate, toDate, departmentId } }),

  // Báo cáo bệnh theo ICD-10
  getDiseaseStatistics: (fromDate: string, toDate: string, icdChapter?: string, departmentId?: string) =>
    apiClient.get<DiseaseStatisticsDto[]>('/statistics/disease', { params: { fromDate, toDate, icdChapter, departmentId } }),

  // Báo cáo hoạt động khoa
  getDepartmentActivityReport: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<DepartmentActivityReportDto[]>('/statistics/department-activity', { params: { fromDate, toDate, departmentId } }),

  // Báo cáo công suất giường
  getBedOccupancyReport: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<BedOccupancyReportDto[]>('/statistics/bed-occupancy', { params: { fromDate, toDate, departmentId } }),

  // Báo cáo BYT
  getBYTReport: (fromDate: string, toDate: string) =>
    apiClient.get<BYTReportDto>('/statistics/byt-report', { params: { fromDate, toDate } }),

  // KPI
  getHospitalKPIs: (fromDate: string, toDate: string) =>
    apiClient.get<HospitalKPIDto[]>('/statistics/kpi', { params: { fromDate, toDate } }),

  // In và xuất báo cáo
  printStatisticsReport: (request: StatisticsReportRequest) =>
    apiClient.post<Blob>('/statistics/reports/print', request, { responseType: 'blob' }),
  exportStatisticsReport: (request: StatisticsReportRequest) =>
    apiClient.post<Blob>('/statistics/reports/export', request, { responseType: 'blob' }),
};

// ============================================================================
// Module 17: Quản trị Hệ thống - API Functions
// ============================================================================

export const adminApi = {
  // Quản lý người dùng
  getUsers: (keyword?: string, departmentId?: string, isActive?: boolean) =>
    apiClient.get<SystemUserDto[]>('/admin/users', { params: { keyword, departmentId, isActive } }),
  getUser: (userId: string) =>
    apiClient.get<SystemUserDto>(`/admin/users/${userId}`),
  createUser: (dto: CreateUserDto) =>
    apiClient.post<SystemUserDto>('/admin/users', dto),
  updateUser: (userId: string, dto: UpdateUserDto) =>
    apiClient.put<SystemUserDto>(`/admin/users/${userId}`, dto),
  deleteUser: (userId: string) =>
    apiClient.delete<boolean>(`/admin/users/${userId}`),
  resetPassword: (userId: string) =>
    apiClient.post<boolean>(`/admin/users/${userId}/reset-password`),
  changePassword: (userId: string, dto: ChangePasswordDto) =>
    apiClient.post<boolean>(`/admin/users/${userId}/change-password`, dto),
  lockUser: (userId: string, reason: string) =>
    apiClient.post<boolean>(`/admin/users/${userId}/lock`, reason),
  unlockUser: (userId: string) =>
    apiClient.post<boolean>(`/admin/users/${userId}/unlock`),

  // Quản lý vai trò
  getRoles: (isActive?: boolean) =>
    apiClient.get<RoleDto[]>('/admin/roles', { params: { isActive } }),
  getRole: (roleId: string) =>
    apiClient.get<RoleDto>(`/admin/roles/${roleId}`),
  saveRole: (dto: RoleDto) =>
    apiClient.post<RoleDto>('/admin/roles', dto),
  deleteRole: (roleId: string) =>
    apiClient.delete<boolean>(`/admin/roles/${roleId}`),

  // Quản lý quyền
  getPermissions: (module?: string) =>
    apiClient.get<PermissionDto[]>('/admin/permissions', { params: { module } }),
  getRolePermissions: (roleId: string) =>
    apiClient.get<PermissionDto[]>(`/admin/roles/${roleId}/permissions`),
  updateRolePermissions: (roleId: string, permissionIds: string[]) =>
    apiClient.put<boolean>(`/admin/roles/${roleId}/permissions`, permissionIds),
  getUserPermissions: (userId: string) =>
    apiClient.get<PermissionDto[]>(`/admin/users/${userId}/permissions`),
  updateUserPermissions: (userId: string, permissionIds: string[]) =>
    apiClient.put<boolean>(`/admin/users/${userId}/permissions`, permissionIds),

  // Nhật ký hệ thống
  getAuditLogs: (search: AuditLogSearchDto) =>
    apiClient.get<AuditLogDto[]>('/admin/audit-logs', { params: search }),
  getAuditLog: (logId: string) =>
    apiClient.get<AuditLogDto>(`/admin/audit-logs/${logId}`),
  exportAuditLogs: (search: AuditLogSearchDto) =>
    apiClient.post<Blob>('/admin/audit-logs/export', search, { responseType: 'blob' }),

  // Cấu hình hệ thống
  getSystemConfigs: (category?: string) =>
    apiClient.get<SystemConfigDto[]>('/admin/configs', { params: { category } }),
  getSystemConfig: (configKey: string) =>
    apiClient.get<SystemConfigDto>(`/admin/configs/${configKey}`),
  saveSystemConfig: (dto: SystemConfigDto) =>
    apiClient.post<SystemConfigDto>('/admin/configs', dto),
  deleteSystemConfig: (configKey: string) =>
    apiClient.delete<boolean>(`/admin/configs/${configKey}`),

  // Quản lý phiên
  getActiveSessions: (userId?: string) =>
    apiClient.get<UserSessionDto[]>('/admin/sessions', { params: { userId } }),
  terminateSession: (sessionId: string) =>
    apiClient.delete<boolean>(`/admin/sessions/${sessionId}`),
  terminateAllSessions: (userId: string) =>
    apiClient.delete<boolean>(`/admin/users/${userId}/sessions`),

  // Thông báo hệ thống
  getSystemNotifications: (isActive?: boolean) =>
    apiClient.get<SystemNotificationDto[]>('/admin/notifications', { params: { isActive } }),
  getSystemNotification: (notificationId: string) =>
    apiClient.get<SystemNotificationDto>(`/admin/notifications/${notificationId}`),
  saveSystemNotification: (dto: SystemNotificationDto) =>
    apiClient.post<SystemNotificationDto>('/admin/notifications', dto),
  deleteSystemNotification: (notificationId: string) =>
    apiClient.delete<boolean>(`/admin/notifications/${notificationId}`),

  // Sao lưu dữ liệu
  getBackupHistory: (fromDate?: string, toDate?: string) =>
    apiClient.get<BackupHistoryDto[]>('/admin/backups', { params: { fromDate, toDate } }),
  createBackup: (dto: CreateBackupDto) =>
    apiClient.post<BackupHistoryDto>('/admin/backups', dto),
  restoreBackup: (backupId: string) =>
    apiClient.post<boolean>(`/admin/backups/${backupId}/restore`),
  deleteBackup: (backupId: string) =>
    apiClient.delete<boolean>(`/admin/backups/${backupId}`),

  // Giám sát hệ thống
  getSystemHealth: () =>
    apiClient.get<SystemHealthDto>('/admin/health'),
  getSystemResources: () =>
    apiClient.get<SystemResourceDto[]>('/admin/resources'),
  getDatabaseStatistics: () =>
    apiClient.get<DatabaseStatisticsDto[]>('/admin/database-statistics'),

  // Quản lý tích hợp
  getIntegrationConfigs: (isActive?: boolean) =>
    apiClient.get<IntegrationConfigDto[]>('/admin/integrations', { params: { isActive } }),
  getIntegrationConfig: (integrationId: string) =>
    apiClient.get<IntegrationConfigDto>(`/admin/integrations/${integrationId}`),
  saveIntegrationConfig: (dto: IntegrationConfigDto) =>
    apiClient.post<IntegrationConfigDto>('/admin/integrations', dto),
  testIntegrationConnection: (integrationId: string) =>
    apiClient.post<boolean>(`/admin/integrations/${integrationId}/test`),
  getIntegrationLogs: (integrationId: string, fromDate?: string, toDate?: string) =>
    apiClient.get<IntegrationLogDto[]>(`/admin/integrations/${integrationId}/logs`, { params: { fromDate, toDate } }),
};

// Export all APIs
export default {
  finance: financeApi,
  catalog: catalogApi,
  pharmacyReport: pharmacyReportApi,
  medicalRecord: medicalRecordApi,
  statistics: statisticsApi,
  admin: adminApi,
};
