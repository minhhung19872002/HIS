/**
 * API Client cho Phân hệ 6: Phẫu thuật thủ thuật (PTTT)
 * Module: Surgery Complete
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region Surgery Management

export interface SurgeryDto {
  id: string;
  surgeryCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  medicalRecordId: string;
  medicalRecordCode: string;
  inpatientId?: string;
  requestDepartmentId: string;
  requestDepartmentName: string;
  requestDoctorId: string;
  requestDoctorName: string;
  operatingRoomId?: string;
  operatingRoomName?: string;
  surgeryType: number; // 1-PT, 2-TT
  surgeryTypeName: string;
  surgeryClass: number; // 1-Đặc biệt, 2-Loại 1, 3-Loại 2, 4-Loại 3
  surgeryClassName: string;
  surgeryNature: number; // 1-Cấp cứu, 2-Chương trình
  surgeryNatureName: string;
  preOperativeDiagnosis?: string;
  preOperativeIcdCode?: string;
  postOperativeDiagnosis?: string;
  postOperativeIcdCode?: string;
  secondaryIcdCodes?: string;
  surgeryServiceId: string;
  surgeryServiceCode: string;
  surgeryServiceName: string;
  surgeryMethod?: string;
  anesthesiaType: number;
  anesthesiaTypeName: string;
  anesthesiaMethod?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  description?: string;
  conclusion?: string;
  complications?: string;
  status: number;
  statusName: string;
  teamMembers: SurgeryTeamMemberDto[];
  medicines: SurgeryMedicineDto[];
  supplies: SurgerySupplyDto[];
  serviceCost: number;
  medicineCost: number;
  supplyCost: number;
  totalCost: number;
  revenue?: number;
  expense?: number;
  profit?: number;
  createdAt: string;
  createdBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface SurgeryTeamMemberDto {
  id: string;
  surgeryId: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  specialty?: string;
  role: number;
  roleName: string;
  feePercent?: number;
  feeAmount?: number;
  joinTime?: string;
  leaveTime?: string;
}

export interface SurgeryMedicineDto {
  id: string;
  surgeryId: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  activeIngredient?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isInPackage: boolean;
  packageQuantity?: number;
  extraQuantity?: number;
  warehouseId: string;
  warehouseName: string;
  batchNumber?: string;
  expiryDate?: string;
  paymentObject: number;
  insuranceRate: number;
  notes?: string;
}

export interface SurgerySupplyDto {
  id: string;
  surgeryId: string;
  supplyId: string;
  supplyCode: string;
  supplyName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isInPackage: boolean;
  packageQuantity?: number;
  extraQuantity?: number;
  warehouseId: string;
  warehouseName: string;
  paymentObject: number;
  insuranceRate: number;
  notes?: string;
}

export interface CreateSurgeryRequestDto {
  medicalRecordId: string;
  inpatientId?: string;
  surgeryServiceId: string;
  surgeryType: number;
  surgeryClass: number;
  surgeryNature: number;
  preOperativeDiagnosis?: string;
  preOperativeIcdCode?: string;
  surgeryMethod?: string;
  anesthesiaType: number;
  anesthesiaMethod?: string;
  scheduledDate?: string;
  operatingRoomId?: string;
  notes?: string;
  teamMembers?: SurgeryTeamMemberRequestDto[];
}

export interface SurgeryTeamMemberRequestDto {
  staffId: string;
  role: number;
  feePercent?: number;
}

export interface ApproveSurgeryDto {
  surgeryId: string;
  isApproved: boolean;
  scheduledDate?: string;
  operatingRoomId?: string;
  notes?: string;
}

export interface ScheduleSurgeryDto {
  surgeryId: string;
  scheduledDate: string;
  operatingRoomId: string;
  estimatedDurationMinutes: number;
  teamMembers?: SurgeryTeamMemberRequestDto[];
}

export interface SurgeryScheduleDto {
  date: string;
  operatingRoomId: string;
  operatingRoomName: string;
  surgeries: SurgeryScheduleItemDto[];
}

export interface SurgeryScheduleItemDto {
  surgeryId: string;
  surgeryCode: string;
  patientName: string;
  patientCode: string;
  surgeryServiceName: string;
  surgeryType: number;
  surgeryNature: number;
  scheduledTime?: string;
  estimatedDuration: number;
  status: number;
  statusName: string;
  surgeonName: string;
  anesthesiologistName?: string;
}

export interface SurgerySearchDto {
  keyword?: string;
  departmentId?: string;
  operatingRoomId?: string;
  surgeryType?: number;
  surgeryNature?: number;
  status?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Waiting List & Operating Room

export interface SurgeryWaitingListDto {
  operatingRoomId: string;
  operatingRoomName: string;
  date: string;
  waitingPatients: SurgeryWaitingItemDto[];
  currentSurgery?: SurgeryWaitingItemDto;
}

export interface SurgeryWaitingItemDto {
  surgeryId: string;
  queueNumber: number;
  patientCode: string;
  patientName: string;
  surgeryServiceName: string;
  surgeryType: number;
  surgeryNature: number;
  scheduledTime?: string;
  estimatedDuration: number;
  status: number;
  statusName: string;
  surgeonName: string;
  requestDepartmentName: string;
  checkInTime?: string;
}

export interface OperatingRoomDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  roomType: number;
  roomTypeName: string;
  specialtyId?: string;
  specialtyName?: string;
  status: number;
  statusName: string;
  currentSurgeryId?: string;
  currentPatientName?: string;
  isActive: boolean;
}

// #endregion

// #region Surgery Execution

export interface SurgeryExecutionDto {
  surgeryId: string;
  preOperativeDiagnosis?: string;
  preOperativeIcdCode?: string;
  postOperativeDiagnosis?: string;
  postOperativeIcdCode?: string;
  secondaryIcdCodes?: string;
  surgeryMethod?: string;
  anesthesiaType: number;
  anesthesiaMethod?: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  description?: string;
  conclusion?: string;
  complications?: string;
  teamMembers: SurgeryTeamMemberRequestDto[];
}

export interface SurgeryCheckInDto {
  surgeryId: string;
  checkInTime: string;
  operatingRoomId: string;
  notes?: string;
}

export interface StartSurgeryDto {
  surgeryId: string;
  startTime: string;
  teamMembers?: SurgeryTeamMemberRequestDto[];
}

export interface CompleteSurgeryDto {
  surgeryId: string;
  endTime: string;
  postOperativeDiagnosis?: string;
  postOperativeIcdCode?: string;
  description?: string;
  conclusion?: string;
  complications?: string;
}

export interface SurgeryTT50InfoDto {
  surgeryId: string;
  anesthesiologistId: string;
  anesthesiologistName: string;
  assistantAnesthesiologistId?: string;
  assistantAnesthesiologistName?: string;
  anesthesiaType: number;
  anesthesiaTypeName: string;
  anesthesiaMethod?: string;
  anesthesiaNotes?: string;
  surgeryMethod: string;
  surgeryClass: number;
  mainSurgeonId: string;
  mainSurgeonName: string;
  mainSurgeonCertificate?: string;
  assistantSurgeons: AssistantSurgeonDto[];
  nurses: SurgeryNurseDto[];
}

export interface AssistantSurgeonDto {
  staffId: string;
  staffName: string;
  certificate?: string;
  order: number;
}

export interface SurgeryNurseDto {
  staffId: string;
  staffName: string;
  role: number;
}

// #endregion

// #region Service Orders

export interface SurgeryServiceOrderDto {
  id: string;
  surgeryId: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceGroup: string;
  serviceType: number;
  serviceTypeName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  surcharge?: number;
  executeRoomId?: string;
  executeRoomName?: string;
  orderDoctorId: string;
  orderDoctorName: string;
  consultantId?: string;
  consultantName?: string;
  paymentObject: number;
  paymentObjectName: string;
  insuranceRate: number;
  isPriority: boolean;
  isEmergency: boolean;
  notes?: string;
  status: number;
  statusName: string;
  orderedAt: string;
  executedAt?: string;
}

export interface CreateSurgeryServiceOrderDto {
  surgeryId: string;
  serviceId: string;
  quantity?: number;
  surcharge?: number;
  executeRoomId?: string;
  consultantId?: string;
  paymentObject: number;
  isPriority?: boolean;
  isEmergency?: boolean;
  notes?: string;
}

export interface SurgeryPackageOrderDto {
  surgeryId: string;
  packageId: string;
  packageCode: string;
  packageName: string;
  services: SurgeryServiceOrderDto[];
  medicines: SurgeryMedicineDto[];
  supplies: SurgerySupplyDto[];
  packagePrice: number;
  actualCost: number;
  difference: number;
}

export interface SurgeryServiceGroupDto {
  id: string;
  code: string;
  name: string;
  createdBy: string;
  isShared: boolean;
  serviceIds: string[];
}

export interface ServiceOrderWarningDto {
  warningType: number;
  warningTypeName: string;
  message: string;
  detail?: string;
  isBlocking: boolean;
}

export interface ServiceCostInfoDto {
  totalServiceCost: number;
  insuranceCoverage: number;
  patientPayment: number;
  depositBalance: number;
  remainingDeposit: number;
  hasSufficientDeposit: boolean;
}

// #endregion

// #region Prescription

export interface SurgeryPrescriptionDto {
  surgeryId: string;
  diagnosisMain?: string;
  diagnosisMainIcd?: string;
  diagnosisSecondary?: string;
  externalCause?: string;
  warehouseId: string;
  warehouseName: string;
  medicines: SurgeryMedicineDto[];
  supplies: SurgerySupplyDto[];
  totalMedicineCost: number;
  totalSupplyCost: number;
  totalCost: number;
  packageLimit?: number;
  isOverLimit: boolean;
  overLimitAmount?: number;
}

export interface AddSurgeryMedicineDto {
  surgeryId: string;
  medicineId: string;
  quantity: number;
  warehouseId: string;
  batchNumber?: string;
  isInPackage: boolean;
  paymentObject: number;
  usageInstruction?: string;
  notes?: string;
}

export interface AddSurgerySupplyDto {
  surgeryId: string;
  supplyId: string;
  quantity: number;
  warehouseId: string;
  isInPackage: boolean;
  paymentObject: number;
  notes?: string;
}

export interface SurgeryPrescriptionTemplateDto {
  id: string;
  code: string;
  name: string;
  surgeryServiceId?: string;
  surgeryServiceName?: string;
  medicines: TemplateMedicineItemDto[];
  supplies: TemplateSupplyItemDto[];
  createdBy: string;
  createdByName: string;
  isShared: boolean;
}

export interface TemplateMedicineItemDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  quantity: number;
  usageInstruction?: string;
}

export interface TemplateSupplyItemDto {
  supplyId: string;
  supplyCode: string;
  supplyName: string;
  quantity: number;
}

export interface MedicineWarningDto {
  warningType: number;
  warningTypeName: string;
  severity: number;
  severityColor: string;
  message: string;
  relatedMedicineId?: string;
  relatedMedicineName?: string;
}

export interface MedicineDetailDto {
  id: string;
  code: string;
  name: string;
  activeIngredient?: string;
  dosage?: string;
  unit: string;
  manufacturer?: string;
  country?: string;
  batchNumber?: string;
  expiryDate?: string;
  stockQuantity: number;
  unitPrice: number;
  contraindications?: string;
  interactions?: string;
}

// #endregion

// #region Blood Order

export interface SurgeryBloodOrderDto {
  id: string;
  surgeryId: string;
  diagnosisMain?: string;
  diagnosisMainIcd?: string;
  diagnosisSecondary?: string;
  externalCause?: string;
  bloodBankId: string;
  bloodBankName: string;
  bloodProducts: BloodProductItemDto[];
  totalCost: number;
  status: number;
  statusName: string;
  orderedAt: string;
  orderedBy: string;
  orderedByName: string;
}

export interface BloodProductItemDto {
  id: string;
  bloodProductId: string;
  productCode: string;
  productName: string;
  bloodType: string;
  rhFactor: string;
  volume: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  bagNumber?: string;
  expiryDate?: string;
  stockQuantity: number;
}

export interface CreateBloodOrderDto {
  surgeryId: string;
  diagnosisMain?: string;
  diagnosisMainIcd?: string;
  bloodBankId: string;
  bloodProducts: BloodProductRequestDto[];
}

export interface BloodProductRequestDto {
  bloodProductId: string;
  bloodType: string;
  rhFactor: string;
  quantity: number;
}

export interface BloodBankDto {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

// #endregion

// #region Statistics & Reports

export interface SurgeryStatisticsDto {
  fromDate: string;
  toDate: string;
  totalSurgeries: number;
  emergencySurgeries: number;
  scheduledSurgeries: number;
  completedCount: number;
  cancelledCount: number;
  byType: SurgeryTypeStatDto[];
  byDepartment: SurgeryDepartmentStatDto[];
  bySurgeon: SurgeonStatDto[];
  byRoom: OperatingRoomStatDto[];
  totalRevenue: number;
  totalExpense: number;
  totalProfit: number;
}

export interface SurgeryTypeStatDto {
  surgeryType: number;
  surgeryTypeName: string;
  surgeryClass: number;
  surgeryClassName: string;
  count: number;
  revenue: number;
}

export interface SurgeryDepartmentStatDto {
  departmentId: string;
  departmentName: string;
  surgeryCount: number;
  procedureCount: number;
  revenue: number;
}

export interface SurgeonStatDto {
  doctorId: string;
  doctorName: string;
  mainSurgeonCount: number;
  assistantCount: number;
  totalFee: number;
}

export interface OperatingRoomStatDto {
  roomId: string;
  roomName: string;
  surgeryCount: number;
  totalDurationMinutes: number;
  utilizationRate: number;
}

export interface SurgeryFeeCalculationDto {
  surgeryId: string;
  servicePrice: number;
  totalFeePool: number;
  teamFees: TeamMemberFeeDto[];
  totalDistributed: number;
  remainder: number;
}

export interface TeamMemberFeeDto {
  staffId: string;
  staffName: string;
  role: number;
  roleName: string;
  feePercent: number;
  feeAmount: number;
}

export interface SurgeryCostCalculationDto {
  surgeryId: string;
  serviceCost: number;
  hasTeamChange: boolean;
  additionalServiceCost?: number;
  medicineCost: number;
  supplyCost: number;
  totalCost: number;
  insuranceCoverage: number;
  patientPayment: number;
}

export interface SurgeryProfitDto {
  surgeryId: string;
  surgeryCode: string;
  serviceRevenue: number;
  medicineRevenue: number;
  supplyRevenue: number;
  totalRevenue: number;
  medicineCost: number;
  supplyCost: number;
  teamFee: number;
  operatingCost: number;
  totalExpense: number;
  profit: number;
  profitMargin: number;
}

// #endregion

// #region Package & Norms

export interface SurgeryPackageDto {
  id: string;
  code: string;
  name: string;
  surgeryServiceId: string;
  surgeryServiceName: string;
  medicineNorms: PackageMedicineNormDto[];
  supplyNorms: PackageSupplyNormDto[];
  packagePrice: number;
  medicineLimit: number;
  supplyLimit: number;
  isActive: boolean;
}

export interface PackageMedicineNormDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  minQuantity: number;
  maxQuantity: number;
  standardQuantity: number;
  unitPrice: number;
}

export interface PackageSupplyNormDto {
  supplyId: string;
  supplyCode: string;
  supplyName: string;
  unit: string;
  minQuantity: number;
  maxQuantity: number;
  standardQuantity: number;
  unitPrice: number;
}

// #endregion

// #region Other DTOs

export interface IcdCodeDto {
  code: string;
  name: string;
  nameEnglish?: string;
  chapter?: string;
}

export interface ServiceDto {
  id: string;
  code: string;
  name: string;
  groupName?: string;
  serviceType: number;
  unitPrice: number;
  insurancePrice?: number;
  isActive: boolean;
}

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// #endregion

// ==================== API FUNCTIONS ====================

const BASE_URL = '/api/SurgeryComplete';

// #region 6.1 Quản lý PTTT

export const createSurgeryRequest = (dto: CreateSurgeryRequestDto) =>
  apiClient.post<SurgeryDto>(`${BASE_URL}`, dto);

export const approveSurgery = (dto: ApproveSurgeryDto) =>
  apiClient.post<SurgeryDto>(`${BASE_URL}/approve`, dto);

export const rejectSurgery = (id: string, reason: string) =>
  apiClient.post<SurgeryDto>(`${BASE_URL}/${id}/reject`, { reason });

export const scheduleSurgery = (dto: ScheduleSurgeryDto) =>
  apiClient.post<SurgeryDto>(`${BASE_URL}/schedule`, dto);

export const getSurgerySchedule = (date: string, operatingRoomId?: string) =>
  apiClient.get<SurgeryScheduleDto[]>(`${BASE_URL}/schedule`, { params: { date, operatingRoomId } });

export const checkInPatient = (dto: SurgeryCheckInDto) =>
  apiClient.post<SurgeryDto>(`${BASE_URL}/check-in`, dto);

export const getSurgeries = (dto: SurgerySearchDto) =>
  apiClient.get<PagedResultDto<SurgeryDto>>(`${BASE_URL}`, { params: dto });

export const getSurgeryById = (id: string) =>
  apiClient.get<SurgeryDto>(`${BASE_URL}/${id}`);

export const cancelSurgery = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/${id}/cancel`, { reason });

export const setTeamFees = (id: string, teamMembers: SurgeryTeamMemberRequestDto[]) =>
  apiClient.post<SurgeryDto>(`${BASE_URL}/${id}/team-fees`, teamMembers);

export const calculateTeamFees = (id: string) =>
  apiClient.get<SurgeryFeeCalculationDto>(`${BASE_URL}/${id}/fee-calculation`);

export const calculateProfit = (id: string) =>
  apiClient.get<SurgeryProfitDto>(`${BASE_URL}/${id}/profit`);

export const calculateCostTT37 = (id: string, hasTeamChange = false) =>
  apiClient.get<SurgeryCostCalculationDto>(`${BASE_URL}/${id}/cost-tt37`, { params: { hasTeamChange } });

export const getStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<SurgeryStatisticsDto>(`${BASE_URL}/statistics`, { params: { fromDate, toDate, departmentId } });

// #endregion

// #region Packages

export const getSurgeryPackages = (surgeryServiceId?: string) =>
  apiClient.get<SurgeryPackageDto[]>(`${BASE_URL}/packages`, { params: { surgeryServiceId } });

export const getSurgeryPackageById = (id: string) =>
  apiClient.get<SurgeryPackageDto>(`${BASE_URL}/packages/${id}`);

export const saveSurgeryPackage = (dto: SurgeryPackageDto) =>
  apiClient.post<SurgeryPackageDto>(`${BASE_URL}/packages`, dto);

export const deleteSurgeryPackage = (id: string) =>
  apiClient.delete<boolean>(`${BASE_URL}/packages/${id}`);

// #endregion

// #region 6.2 Waiting List & Operating Room

export const getWaitingList = (roomId: string, date: string) =>
  apiClient.get<SurgeryWaitingListDto>(`${BASE_URL}/waiting-list/${roomId}`, { params: { date } });

export const getAllWaitingLists = (date: string) =>
  apiClient.get<SurgeryWaitingListDto[]>(`${BASE_URL}/waiting-lists`, { params: { date } });

export const getOperatingRooms = (roomType?: number, status?: number) =>
  apiClient.get<OperatingRoomDto[]>(`${BASE_URL}/operating-rooms`, { params: { roomType, status } });

export const updateOperatingRoomStatus = (id: string, status: number) =>
  apiClient.put<OperatingRoomDto>(`${BASE_URL}/operating-rooms/${id}/status`, { status });

// #endregion

// #region 6.3 Surgery Execution

export const startSurgery = (dto: StartSurgeryDto) =>
  apiClient.post<SurgeryDto>(`${BASE_URL}/start`, dto);

export const completeSurgery = (dto: CompleteSurgeryDto) =>
  apiClient.post<SurgeryDto>(`${BASE_URL}/complete`, dto);

export const updateExecutionInfo = (id: string, dto: SurgeryExecutionDto) =>
  apiClient.put<SurgeryDto>(`${BASE_URL}/${id}/execution`, dto);

export const updatePreOperativeDiagnosis = (id: string, diagnosis: string, icdCode: string) =>
  apiClient.put<SurgeryDto>(`${BASE_URL}/${id}/pre-diagnosis`, { diagnosis, icdCode });

export const updatePostOperativeDiagnosis = (id: string, diagnosis: string, icdCode: string) =>
  apiClient.put<SurgeryDto>(`${BASE_URL}/${id}/post-diagnosis`, { diagnosis, icdCode });

export const updateTT50Info = (id: string, dto: SurgeryTT50InfoDto) =>
  apiClient.put<SurgeryDto>(`${BASE_URL}/${id}/tt50-info`, dto);

export const updateTeamMembers = (id: string, members: SurgeryTeamMemberRequestDto[]) =>
  apiClient.put<SurgeryDto>(`${BASE_URL}/${id}/team`, members);

export const changeTeamMember = (id: string, oldMemberId: string, newMember: SurgeryTeamMemberRequestDto, changeTime: string) =>
  apiClient.post<SurgeryDto>(`${BASE_URL}/${id}/team/change`, { oldMemberId, newMember, changeTime });

// #endregion

// #region 6.3.1 Print

export const printSurgeryCertificate = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/print/certificate`, { responseType: 'blob' });

export const printSurgeryReport = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/print/report`, { responseType: 'blob' });

export const printSafetyChecklist = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/print/safety-checklist`, { responseType: 'blob' });

export const printSurgeryForm = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/print/form`, { responseType: 'blob' });

export const printAnesthesiaForm = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/print/anesthesia`, { responseType: 'blob' });

export const printPostOpCareForm = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/print/post-op-care`, { responseType: 'blob' });

export const printMedicineDisclosure = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/print/medicine-disclosure`, { responseType: 'blob' });

export const exportXml4210 = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/export/xml-4210`, { responseType: 'blob' });

// #endregion

// #region 6.4 Service Orders

export const searchIcdCodes = (keyword: string, byCode = false) =>
  apiClient.get<IcdCodeDto[]>(`${BASE_URL}/icd-codes/search`, { params: { keyword, byCode } });

export const searchServices = (keyword: string, serviceType?: number) =>
  apiClient.get<ServiceDto[]>(`${BASE_URL}/services/search`, { params: { keyword, serviceType } });

export const orderService = (surgeryId: string, dto: CreateSurgeryServiceOrderDto) =>
  apiClient.post<SurgeryServiceOrderDto>(`${BASE_URL}/${surgeryId}/service-orders`, dto);

export const orderServices = (surgeryId: string, dtos: CreateSurgeryServiceOrderDto[]) =>
  apiClient.post<SurgeryServiceOrderDto[]>(`${BASE_URL}/${surgeryId}/service-orders/batch`, dtos);

export const orderPackage = (surgeryId: string, packageId: string) =>
  apiClient.post<SurgeryPackageOrderDto>(`${BASE_URL}/${surgeryId}/service-orders/package/${packageId}`);

export const getServiceOrders = (surgeryId: string) =>
  apiClient.get<SurgeryServiceOrderDto[]>(`${BASE_URL}/${surgeryId}/service-orders`);

export const updateServiceOrder = (orderId: string, dto: CreateSurgeryServiceOrderDto) =>
  apiClient.put<SurgeryServiceOrderDto>(`${BASE_URL}/service-orders/${orderId}`, dto);

export const deleteServiceOrder = (orderId: string) =>
  apiClient.delete<boolean>(`${BASE_URL}/service-orders/${orderId}`);

export const getServiceCostInfo = (surgeryId: string) =>
  apiClient.get<ServiceCostInfoDto>(`${BASE_URL}/${surgeryId}/service-cost`);

export const checkOrderWarnings = (surgeryId: string, serviceId: string) =>
  apiClient.get<ServiceOrderWarningDto[]>(`${BASE_URL}/${surgeryId}/service-orders/warnings`, { params: { serviceId } });

// #endregion

// #region Service Groups

export const getServiceGroups = () =>
  apiClient.get<SurgeryServiceGroupDto[]>(`${BASE_URL}/service-groups`);

export const createServiceGroup = (dto: SurgeryServiceGroupDto) =>
  apiClient.post<SurgeryServiceGroupDto>(`${BASE_URL}/service-groups`, dto);

export const orderByGroup = (surgeryId: string, groupId: string) =>
  apiClient.post<SurgeryServiceOrderDto[]>(`${BASE_URL}/${surgeryId}/service-orders/group/${groupId}`);

// #endregion

// #region 6.5 Prescription

export const getPrescription = (surgeryId: string) =>
  apiClient.get<SurgeryPrescriptionDto>(`${BASE_URL}/${surgeryId}/prescription`);

export const addMedicine = (surgeryId: string, dto: AddSurgeryMedicineDto) =>
  apiClient.post<SurgeryMedicineDto>(`${BASE_URL}/${surgeryId}/medicines`, dto);

export const addSupply = (surgeryId: string, dto: AddSurgerySupplyDto) =>
  apiClient.post<SurgerySupplyDto>(`${BASE_URL}/${surgeryId}/supplies`, dto);

export const updateMedicine = (itemId: string, dto: AddSurgeryMedicineDto) =>
  apiClient.put<SurgeryMedicineDto>(`${BASE_URL}/medicines/${itemId}`, dto);

export const removeMedicine = (itemId: string) =>
  apiClient.delete<boolean>(`${BASE_URL}/medicines/${itemId}`);

export const removeSupply = (itemId: string) =>
  apiClient.delete<boolean>(`${BASE_URL}/supplies/${itemId}`);

export const applyPackage = (surgeryId: string, packageId: string) =>
  apiClient.post<SurgeryPrescriptionDto>(`${BASE_URL}/${surgeryId}/prescription/apply-package/${packageId}`);

export const searchMedicines = (keyword: string, warehouseId: string) =>
  apiClient.get<MedicineDetailDto[]>(`${BASE_URL}/medicines/search`, { params: { keyword, warehouseId } });

export const checkMedicineWarnings = (surgeryId: string, medicineId: string) =>
  apiClient.get<MedicineWarningDto[]>(`${BASE_URL}/${surgeryId}/medicines/warnings`, { params: { medicineId } });

export const getMedicineDetail = (medicineId: string, warehouseId: string) =>
  apiClient.get<MedicineDetailDto>(`${BASE_URL}/medicines/${medicineId}/detail`, { params: { warehouseId } });

// #endregion

// #region Prescription Templates

export const getPrescriptionTemplates = (surgeryServiceId?: string) =>
  apiClient.get<SurgeryPrescriptionTemplateDto[]>(`${BASE_URL}/prescription-templates`, { params: { surgeryServiceId } });

export const savePrescriptionTemplate = (dto: SurgeryPrescriptionTemplateDto) =>
  apiClient.post<SurgeryPrescriptionTemplateDto>(`${BASE_URL}/prescription-templates`, dto);

export const applyPrescriptionTemplate = (surgeryId: string, templateId: string) =>
  apiClient.post<SurgeryPrescriptionDto>(`${BASE_URL}/${surgeryId}/prescription/apply-template/${templateId}`);

export const copyPrescription = (surgeryId: string, sourceSurgeryId: string) =>
  apiClient.post<SurgeryPrescriptionDto>(`${BASE_URL}/${surgeryId}/prescription/copy/${sourceSurgeryId}`);

// #endregion

// #region 6.6 Blood Order

export const getBloodOrder = (surgeryId: string) =>
  apiClient.get<SurgeryBloodOrderDto>(`${BASE_URL}/${surgeryId}/blood-order`);

export const createBloodOrder = (surgeryId: string, dto: CreateBloodOrderDto) =>
  apiClient.post<SurgeryBloodOrderDto>(`${BASE_URL}/${surgeryId}/blood-order`, dto);

export const updateBloodOrder = (orderId: string, dto: CreateBloodOrderDto) =>
  apiClient.put<SurgeryBloodOrderDto>(`${BASE_URL}/blood-orders/${orderId}`, dto);

export const getBloodBanks = () =>
  apiClient.get<BloodBankDto[]>(`${BASE_URL}/blood-banks`);

export const searchBloodProducts = (bloodBankId: string, bloodType?: string, rhFactor?: string) =>
  apiClient.get<BloodProductItemDto[]>(`${BASE_URL}/blood-products/search`, { params: { bloodBankId, bloodType, rhFactor } });

// #endregion

export default {
  // Surgery Management
  createSurgeryRequest,
  approveSurgery,
  rejectSurgery,
  scheduleSurgery,
  getSurgerySchedule,
  checkInPatient,
  getSurgeries,
  getSurgeryById,
  cancelSurgery,
  setTeamFees,
  calculateTeamFees,
  calculateProfit,
  calculateCostTT37,
  getStatistics,
  // Packages
  getSurgeryPackages,
  getSurgeryPackageById,
  saveSurgeryPackage,
  deleteSurgeryPackage,
  // Waiting List
  getWaitingList,
  getAllWaitingLists,
  getOperatingRooms,
  updateOperatingRoomStatus,
  // Execution
  startSurgery,
  completeSurgery,
  updateExecutionInfo,
  updatePreOperativeDiagnosis,
  updatePostOperativeDiagnosis,
  updateTT50Info,
  updateTeamMembers,
  changeTeamMember,
  // Print
  printSurgeryCertificate,
  printSurgeryReport,
  printSafetyChecklist,
  printSurgeryForm,
  printAnesthesiaForm,
  printPostOpCareForm,
  printMedicineDisclosure,
  exportXml4210,
  // Service Orders
  searchIcdCodes,
  searchServices,
  orderService,
  orderServices,
  orderPackage,
  getServiceOrders,
  updateServiceOrder,
  deleteServiceOrder,
  getServiceCostInfo,
  checkOrderWarnings,
  // Service Groups
  getServiceGroups,
  createServiceGroup,
  orderByGroup,
  // Prescription
  getPrescription,
  addMedicine,
  addSupply,
  updateMedicine,
  removeMedicine,
  removeSupply,
  applyPackage,
  searchMedicines,
  checkMedicineWarnings,
  getMedicineDetail,
  // Templates
  getPrescriptionTemplates,
  savePrescriptionTemplate,
  applyPrescriptionTemplate,
  copyPrescription,
  // Blood Order
  getBloodOrder,
  createBloodOrder,
  updateBloodOrder,
  getBloodBanks,
  searchBloodProducts,
};
