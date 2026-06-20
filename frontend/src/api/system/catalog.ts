/**
 * Module 13: Quản lý Danh mục
 * DTOs + catalogApi
 */

import { apiClient } from '../client';

type BranchPayload = Record<string, unknown>;

// ============================================================================
// DTOs
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

export interface ClinicalTermCatalogDto {
  id?: string;
  code: string;
  name: string;
  nameEnglish?: string;
  category: string; // Symptom, Sign, Examination, ReviewOfSystems, Procedure, Other
  bodySystem?: string; // General, Cardiovascular, Respiratory, GI, Neuro, MSK, Skin, ENT, Eye, Urogenital
  description?: string;
  sortOrder: number;
  isActive: boolean;
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
// API Object
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

  // Thuật ngữ lâm sàng (Clinical Terms)
  getClinicalTerms: (keyword?: string, category?: string, bodySystem?: string, isActive?: boolean) =>
    apiClient.get<ClinicalTermCatalogDto[]>('/catalog/clinical-terms', { params: { keyword, category, bodySystem, isActive } }),
  getClinicalTerm: (termId: string) =>
    apiClient.get<ClinicalTermCatalogDto>(`/catalog/clinical-terms/${termId}`),
  saveClinicalTerm: (dto: ClinicalTermCatalogDto) =>
    apiClient.post<ClinicalTermCatalogDto>('/catalog/clinical-terms', dto),
  deleteClinicalTerm: (termId: string) =>
    apiClient.delete<boolean>(`/catalog/clinical-terms/${termId}`),

  // Chi nhánh (Branches)
  getBranches: (params?: { keyword?: string; isActive?: boolean }) =>
    apiClient.get('/catalog/branches', { params }),
  saveBranch: (data: BranchPayload) =>
    apiClient.post('/catalog/branches', data),
  deleteBranch: (id: string) =>
    apiClient.delete(`/catalog/branches/${id}`),

  // Đồng bộ BHXH
  syncBHXHMedicines: () => apiClient.post<SyncResultDto>('/catalog/sync/bhxh/medicines'),
  syncBHXHServices: () => apiClient.post<SyncResultDto>('/catalog/sync/bhxh/services'),
  syncBHXHICD10: () => apiClient.post<SyncResultDto>('/catalog/sync/bhxh/icd10'),
  getLastSyncDate: (syncType: string) =>
    apiClient.get<string | null>('/catalog/sync/last-date', { params: { syncType } }),
};
