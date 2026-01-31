/**
 * API Client cho Phân hệ 3: Quản lý Điều trị Nội trú
 * Bao gồm 100+ chức năng
 */
import apiClient from './apiClient';

// ============================================================================
// Types/Interfaces
// ============================================================================

// #region 3.1 Màn hình chờ buồng bệnh

export interface WardLayoutDto {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  occupancyRate: number;
  rooms: RoomLayoutDto[];
}

export interface RoomLayoutDto {
  roomId: string;
  roomCode: string;
  roomName: string;
  roomType: number;
  roomTypeName: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  displayColor: string;
  beds: BedLayoutDto[];
}

export interface BedLayoutDto {
  bedId: string;
  bedCode: string;
  bedName: string;
  bedType: number;
  status: number;
  statusName: string;
  displayColor: string;
  position: number;
  currentAdmissionId?: string;
  patientName?: string;
  patientCode?: string;
  gender?: number;
  age?: number;
  isInsurance: boolean;
  admissionDate?: string;
  daysOfStay?: number;
  mainDiagnosis?: string;
  sharedPatients?: SharedBedPatientDto[];
}

export interface SharedBedPatientDto {
  admissionId: string;
  patientName: string;
  patientCode: string;
  age?: number;
  isInsurance: boolean;
}

export interface WardColorConfigDto {
  insurancePatientColor: string;
  feePatientColor: string;
  chronicPatientColor: string;
  emergencyPatientColor: string;
  vipPatientColor: string;
  pediatricPatientColor: string;
}

// #endregion

// #region 3.2 Quản lý bệnh nhân

export interface InpatientListDto {
  admissionId: string;
  medicalRecordCode: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  age?: number;
  insuranceNumber?: string;
  isInsurance: boolean;
  insuranceExpiry?: string;
  departmentName: string;
  roomName: string;
  bedName?: string;
  admissionDate: string;
  daysOfStay: number;
  mainDiagnosis?: string;
  attendingDoctorName?: string;
  status: number;
  statusName: string;
  hasPendingOrders: boolean;
  hasPendingLabResults: boolean;
  hasUnclaimedMedicine: boolean;
  isDebtWarning: boolean;
  totalDebt?: number;
  isInsuranceExpiring: boolean;
}

export interface AdmissionDto {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  insuranceNumber?: string;
  medicalRecordId: string;
  medicalRecordCode: string;
  admissionDate: string;
  admissionType: number;
  admissionTypeName: string;
  referralSource?: string;
  admittingDoctorId: string;
  admittingDoctorName?: string;
  departmentId: string;
  departmentName?: string;
  roomId: string;
  roomName?: string;
  bedId?: string;
  bedName?: string;
  status: number;
  statusName: string;
  diagnosisOnAdmission?: string;
  reasonForAdmission?: string;
  daysOfStay: number;
  dischargeDate?: string;
}

export interface AdmitFromOpdDto {
  medicalRecordId: string;
  departmentId: string;
  roomId: string;
  bedId?: string;
  admissionType: number;
  diagnosisOnAdmission?: string;
  reasonForAdmission?: string;
  attendingDoctorId: string;
}

export interface AdmitFromDepartmentDto {
  sourceAdmissionId: string;
  targetDepartmentId: string;
  targetRoomId: string;
  targetBedId?: string;
  transferReason?: string;
  diagnosisOnTransfer?: string;
  attendingDoctorId: string;
}

export interface DepartmentTransferDto {
  admissionId: string;
  targetDepartmentId: string;
  targetRoomId: string;
  targetBedId?: string;
  transferReason?: string;
  diagnosisOnTransfer?: string;
  treatmentSummary?: string;
  receivingDoctorId: string;
}

export interface CombinedTreatmentDto {
  id: string;
  admissionId: string;
  consultingDepartmentId: string;
  consultingDepartmentName: string;
  requestDate: string;
  requestReason?: string;
  consultingDiagnosis?: string;
  consultingDoctorId: string;
  consultingDoctorName?: string;
  status: number;
  statusName: string;
  completedDate?: string;
  treatmentResult?: string;
}

export interface CreateCombinedTreatmentDto {
  admissionId: string;
  consultingDepartmentId: string;
  requestReason?: string;
  consultingDiagnosis?: string;
}

export interface SpecialtyConsultRequestDto {
  id: string;
  admissionId: string;
  patientName: string;
  specialtyDepartmentId: string;
  specialtyDepartmentName: string;
  requestingDoctorId: string;
  requestingDoctorName: string;
  requestDate: string;
  requestReason?: string;
  clinicalInfo?: string;
  status: number;
  statusName: string;
  consultingDoctorId?: string;
  consultingDoctorName?: string;
  consultDate?: string;
  consultResult?: string;
  recommendations?: string;
}

export interface CreateSpecialtyConsultDto {
  admissionId: string;
  specialtyDepartmentId: string;
  requestReason?: string;
  clinicalInfo?: string;
}

export interface SurgeryTransferDto {
  admissionId: string;
  surgeryType: number;
  surgeryTypeName?: string;
  surgeryRoomId: string;
  scheduledDate: string;
  scheduledTime?: string;
  preopDiagnosis?: string;
  plannedProcedure?: string;
  surgeonId: string;
  assistantIds: string[];
  anesthesiologistId: string;
  specialNotes?: string;
}

export interface UpdateInsuranceDto {
  admissionId: string;
  insuranceNumber: string;
  insuranceStartDate: string;
  insuranceEndDate: string;
  initialFacilityCode?: string;
  initialFacilityName?: string;
  benefitLevel: number;
}

export interface InsuranceReferralCheckDto {
  admissionId: string;
  insuranceNumber: string;
  isValid: boolean;
  isCorrectRoute: boolean;
  requiresReferral: boolean;
  initialFacilityCode?: string;
  initialFacilityName?: string;
  benefitLevel: number;
  benefitLevelName: string;
  warnings: string[];
  message?: string;
}

export interface BedAssignmentDto {
  id: string;
  admissionId: string;
  patientName: string;
  patientCode: string;
  bedId: string;
  bedCode: string;
  bedName: string;
  roomName: string;
  departmentName: string;
  assignedAt: string;
  releasedAt?: string;
  status: number;
  statusName: string;
}

export interface CreateBedAssignmentDto {
  admissionId: string;
  bedId: string;
}

export interface TransferBedDto {
  admissionId: string;
  newBedId: string;
  reason?: string;
}

export interface BedStatusDto {
  bedId: string;
  bedCode: string;
  bedName: string;
  roomName: string;
  departmentName: string;
  bedStatus: number;
  bedStatusName: string;
  currentAdmissionId?: string;
  patientName?: string;
  patientCode?: string;
  admissionDate?: string;
  daysOfStay?: number;
}

export interface DailyOrderSummaryDto {
  orderDate: string;
  admissionId: string;
  medicineOrderCount: number;
  medicineIssuedCount: number;
  medicinePendingCount: number;
  serviceOrderCount: number;
  serviceCompletedCount: number;
  servicePendingCount: number;
  labOrderCount: number;
  labResultCount: number;
  labPendingCount: number;
  medicineOrders: MedicineOrderItemDto[];
  serviceOrders: ServiceOrderItemDto[];
  labResults: LabResultItemDto[];
}

export interface MedicineOrderItemDto {
  id: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  quantity: number;
  dosage?: string;
  usage?: string;
  status: number;
  warehouseName?: string;
}

export interface ServiceOrderItemDto {
  id: string;
  serviceCode: string;
  serviceName: string;
  serviceGroupName: string;
  quantity: number;
  status: number;
  executingRoomName?: string;
  scheduledDate?: string;
}

export interface LabResultItemDto {
  id: string;
  testCode: string;
  testName: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  status: number;
  resultDate?: string;
}

export interface DepartmentFeeOverviewDto {
  departmentId: string;
  departmentName: string;
  totalPatients: number;
  insurancePatients: number;
  feePatients: number;
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
  depositAmount: number;
  debtAmount: number;
  patientFees: PatientFeeItemDto[];
}

export interface PatientFeeItemDto {
  admissionId: string;
  patientCode: string;
  patientName: string;
  bedName?: string;
  isInsurance: boolean;
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
  depositAmount: number;
  debtAmount: number;
  daysOfStay: number;
}

export interface DepositRequestDto {
  id: string;
  admissionId: string;
  patientName: string;
  patientCode: string;
  requestedAmount: number;
  reason?: string;
  requestedBy: string;
  requestedByName: string;
  requestDate: string;
  status: number;
  statusName: string;
  collectedDate?: string;
  collectedByName?: string;
}

export interface CreateDepositRequestDto {
  admissionId: string;
  requestedAmount: number;
  reason?: string;
}

export interface TransferWarningDto {
  admissionId: string;
  patientName: string;
  hasUnclaimedMedicine: boolean;
  unclaimedMedicineCount: number;
  unclaimedMedicineNames: string[];
  hasPendingLabResults: boolean;
  pendingLabCount: number;
  pendingLabNames: string[];
  hasPendingServices: boolean;
  pendingServiceCount: number;
  canTransfer: boolean;
  warnings: string[];
}

// #endregion

// #region 3.3 Chỉ định dịch vụ nội trú

export interface InpatientServiceOrderDto {
  id: string;
  admissionId: string;
  orderDate: string;
  orderingDoctorId: string;
  orderingDoctorName: string;
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  secondaryDiagnosisCodes?: string;
  secondaryDiagnoses?: string;
  services: InpatientServiceItemDto[];
  status: number;
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
}

export interface InpatientServiceItemDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceGroupName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  paymentSource: number;
  insuranceRatio: number;
  executingRoomId?: string;
  executingRoomName?: string;
  scheduledDate?: string;
  isUrgent: boolean;
  isEmergency: boolean;
  status: number;
  statusName: string;
  note?: string;
}

export interface CreateInpatientServiceOrderDto {
  admissionId: string;
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  secondaryDiagnosisCodes?: string;
  secondaryDiagnoses?: string;
  services: CreateInpatientServiceItemDto[];
}

export interface CreateInpatientServiceItemDto {
  serviceId: string;
  quantity: number;
  paymentSource: number;
  executingRoomId?: string;
  scheduledDate?: string;
  isUrgent: boolean;
  isEmergency: boolean;
  note?: string;
}

export interface ServiceGroupTemplateDto {
  id: string;
  groupCode: string;
  groupName: string;
  description?: string;
  departmentId?: string;
  createdBy?: string;
  isShared: boolean;
  items: ServiceTemplateItemDto[];
}

export interface ServiceTemplateItemDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  defaultQuantity: number;
}

export interface ServiceOrderWarningDto {
  hasDuplicateToday: boolean;
  duplicateServices: string[];
  exceedsDeposit: boolean;
  depositRemaining: number;
  orderAmount: number;
  hasTT35Warnings: boolean;
  tt35Warnings: string[];
  exceedsPackageLimit: boolean;
  packageLimitMessage?: string;
  isOutsideProtocol: boolean;
  protocolWarning?: string;
  generalWarnings: string[];
}

// #endregion

// #region 3.4 Kê đơn thuốc nội trú

export interface InpatientPrescriptionDto {
  id: string;
  admissionId: string;
  prescriptionDate: string;
  prescribingDoctorId: string;
  prescribingDoctorName: string;
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  warehouseId: string;
  warehouseName: string;
  items: InpatientMedicineItemDto[];
  status: number;
  statusName: string;
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
}

export interface InpatientMedicineItemDto {
  id: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  activeIngredient?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  dosage?: string;
  morning?: string;
  noon?: string;
  afternoon?: string;
  evening?: string;
  usageInstructions?: string;
  paymentSource: number;
  insuranceRatio: number;
  batchNumber?: string;
  expiryDate?: string;
  status: number;
}

export interface CreateInpatientPrescriptionDto {
  admissionId: string;
  prescriptionDate: string;
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  warehouseId: string;
  items: CreateInpatientMedicineItemDto[];
}

export interface CreateInpatientMedicineItemDto {
  medicineId: string;
  quantity: number;
  dosage?: string;
  morning?: string;
  noon?: string;
  afternoon?: string;
  evening?: string;
  usageInstructions?: string;
  paymentSource: number;
  note?: string;
}

export interface MedicineOrderSummaryDto {
  id: string;
  summaryDate: string;
  departmentId: string;
  departmentName: string;
  roomId?: string;
  roomName?: string;
  warehouseId: string;
  warehouseName: string;
  items: MedicineOrderSummaryItemDto[];
  status: number;
  statusName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: string;
}

export interface MedicineOrderSummaryItemDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  totalQuantity: number;
  issuedQuantity: number;
  remainingQuantity: number;
  patientCount: number;
  patientDetails: MedicinePatientDetailDto[];
}

export interface MedicinePatientDetailDto {
  admissionId: string;
  patientCode: string;
  patientName: string;
  bedName?: string;
  quantity: number;
  dosage?: string;
}

export interface PrescriptionWarningDto {
  hasDuplicateToday: boolean;
  duplicateMedicines: string[];
  hasDrugInteraction: boolean;
  interactions: DrugInteractionDto[];
  hasAntibioticDuplicate: boolean;
  duplicateAntibiotics: string[];
  exceedsInsuranceCeiling: boolean;
  insuranceCeiling: number;
  prescriptionAmount: number;
  isInsuranceExpiring: boolean;
  daysRemaining: number;
  isOutsideProtocol: boolean;
  protocolWarnings: string[];
  generalWarnings: string[];
}

export interface DrugInteractionDto {
  drug1Name: string;
  drug2Name: string;
  severity: number;
  severityName: string;
  severityColor: string;
  description: string;
  recommendation?: string;
}

export interface PrescriptionTemplateDto {
  id: string;
  templateCode: string;
  templateName: string;
  description?: string;
  departmentId?: string;
  createdBy?: string;
  createdByName?: string;
  isShared: boolean;
  items: PrescriptionTemplateItemDto[];
}

export interface PrescriptionTemplateItemDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  defaultQuantity: number;
  defaultDosage?: string;
  defaultUsage?: string;
}

// #endregion

// #region 3.5 Chỉ định dinh dưỡng

export interface NutritionOrderDto {
  id: string;
  admissionId: string;
  patientName: string;
  bedName?: string;
  orderDate: string;
  mealType: number;
  mealTypeName: string;
  nutritionLevel: number;
  nutritionLevelName: string;
  menuCode?: string;
  menuName?: string;
  specialRequirements?: string;
  status: number;
}

export interface CreateNutritionOrderDto {
  admissionId: string;
  orderDate: string;
  mealType: number;
  nutritionLevel: number;
  menuCode?: string;
  specialRequirements?: string;
}

export interface NutritionSummaryDto {
  summaryDate: string;
  departmentId: string;
  departmentName: string;
  totalBreakfast: number;
  totalLunch: number;
  totalDinner: number;
  totalSnack: number;
  normalCount: number;
  dietCount: number;
  specialCount: number;
  details: NutritionOrderDto[];
}

// #endregion

// #region 3.6 Thông tin điều trị

export interface TreatmentSheetDto {
  id: string;
  admissionId: string;
  treatmentDate: string;
  doctorId: string;
  doctorName: string;
  progressNotes?: string;
  treatmentOrders?: string;
  nursingOrders?: string;
  dietOrders?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTreatmentSheetDto {
  admissionId: string;
  treatmentDate: string;
  progressNotes?: string;
  treatmentOrders?: string;
  nursingOrders?: string;
  dietOrders?: string;
}

export interface TreatmentSheetTemplateDto {
  id: string;
  templateCode: string;
  templateName: string;
  templateContent?: string;
  departmentId?: string;
  createdBy?: string;
  isShared: boolean;
}

export interface VitalSignsRecordDto {
  id: string;
  admissionId: string;
  recordTime: string;
  temperature?: number;
  pulse?: number;
  respiratoryRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  spO2?: number;
  weight?: number;
  height?: number;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
}

export interface CreateVitalSignsDto {
  admissionId: string;
  recordTime: string;
  temperature?: number;
  pulse?: number;
  respiratoryRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  spO2?: number;
  weight?: number;
  height?: number;
  notes?: string;
}

export interface VitalSignsChartDto {
  admissionId: string;
  fromDate: string;
  toDate: string;
  temperatureData: VitalSignsPointDto[];
  pulseData: VitalSignsPointDto[];
  bpData: VitalSignsPointDto[];
  spO2Data: VitalSignsPointDto[];
}

export interface VitalSignsPointDto {
  time: string;
  value?: number;
  value2?: number;
}

export interface ConsultationDto {
  id: string;
  admissionId: string;
  consultationType: number;
  consultationTypeName: string;
  consultationDate: string;
  consultationTime?: string;
  location?: string;
  chairmanId: string;
  chairmanName: string;
  secretaryId: string;
  secretaryName: string;
  members: ConsultationMemberDto[];
  reason?: string;
  clinicalFindings?: string;
  labResults?: string;
  imageResults?: string;
  conclusion?: string;
  treatment?: string;
  status: number;
}

export interface ConsultationMemberDto {
  doctorId: string;
  doctorName: string;
  title?: string;
  department?: string;
  opinion?: string;
}

export interface CreateConsultationDto {
  admissionId: string;
  consultationType: number;
  consultationDate: string;
  consultationTime?: string;
  location?: string;
  chairmanId: string;
  secretaryId: string;
  memberIds: string[];
  reason?: string;
  clinicalFindings?: string;
}

export interface NursingCareSheetDto {
  id: string;
  admissionId: string;
  careDate: string;
  nurseId: string;
  nurseName: string;
  shift: number;
  shiftName: string;
  patientCondition?: string;
  consciousness?: string;
  hygieneActivities?: string;
  medicationActivities?: string;
  nutritionActivities?: string;
  movementActivities?: string;
  specialMonitoring?: string;
  issuesAndActions?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateNursingCareSheetDto {
  admissionId: string;
  careDate: string;
  shift: number;
  patientCondition?: string;
  consciousness?: string;
  hygieneActivities?: string;
  medicationActivities?: string;
  nutritionActivities?: string;
  movementActivities?: string;
  specialMonitoring?: string;
  issuesAndActions?: string;
  notes?: string;
}

export interface InfusionRecordDto {
  id: string;
  admissionId: string;
  fluidName: string;
  volume: number;
  dropRate: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  route?: string;
  additionalMedication?: string;
  startedBy: string;
  startedByName: string;
  observations?: string;
  complications?: string;
  status: number;
}

export interface CreateInfusionRecordDto {
  admissionId: string;
  fluidName: string;
  volume: number;
  dropRate: number;
  startTime: string;
  route?: string;
  additionalMedication?: string;
}

export interface BloodTransfusionDto {
  id: string;
  admissionId: string;
  bloodType: string;
  rhFactor: string;
  bloodProductType: string;
  bagNumber: string;
  volume: number;
  transfusionStart: string;
  transfusionEnd?: string;
  doctorOrderId: string;
  doctorOrderName: string;
  executedBy?: string;
  executedByName?: string;
  preTransfusionVitals?: string;
  duringTransfusionVitals?: string;
  postTransfusionVitals?: string;
  hasReaction: boolean;
  reactionDetails?: string;
  status: number;
}

export interface CreateBloodTransfusionDto {
  admissionId: string;
  bloodType: string;
  rhFactor: string;
  bloodProductType: string;
  bagNumber: string;
  volume: number;
  transfusionStart: string;
}

export interface DrugReactionRecordDto {
  id: string;
  admissionId: string;
  medicineId?: string;
  medicineName: string;
  reactionTime: string;
  severity: number;
  severityName: string;
  symptoms: string;
  treatment?: string;
  outcome?: string;
  reportedBy: string;
  reportedByName: string;
}

// #endregion

// #region 3.7 Kết thúc điều trị

export interface CompleteDischargeDto {
  admissionId: string;
  dischargeDate: string;
  dischargeType: number;
  dischargeCondition: number;
  dischargeDiagnosisCode?: string;
  dischargeDiagnosis?: string;
  secondaryDiagnosisCodes?: string;
  secondaryDiagnoses?: string;
  treatmentSummary?: string;
  proceduresSummary?: string;
  dischargeInstructions?: string;
  medicationInstructions?: string;
  dietInstructions?: string;
  activityInstructions?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  sickLeaveDays?: number;
  sickLeaveStartDate?: string;
  transferToHospital?: string;
  transferReason?: string;
}

export interface DischargeDto {
  id: string;
  admissionId: string;
  dischargeDate: string;
  dischargeType: number;
  dischargeTypeName: string;
  dischargeCondition: number;
  dischargeConditionName: string;
  dischargeDiagnosis?: string;
  dischargeInstructions?: string;
  followUpDate?: string;
  dischargedBy: string;
  dischargedByName?: string;
  createdAt: string;
}

export interface PreDischargeCheckDto {
  admissionId: string;
  patientName: string;
  isInsuranceValid: boolean;
  insuranceCheckMessage?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  hasUnpaidBalance: boolean;
  hasUnclaimedMedicine: boolean;
  unclaimedPrescriptionCount: number;
  hasPendingResults: boolean;
  pendingResultCount: number;
  isMedicalRecordComplete: boolean;
  missingDocuments: string[];
  canDischarge: boolean;
  warnings: string[];
}

export interface BillingStatement6556Dto {
  admissionId: string;
  patientName: string;
  patientCode: string;
  insuranceNumber?: string;
  gender: number;
  dateOfBirth?: string;
  address?: string;
  admissionDate: string;
  dischargeDate: string;
  daysOfStay: number;
  diagnosis?: string;
  diagnosisCode?: string;
  items: BillingItemDto[];
  totalAmount: number;
  insuranceAmount: number;
  patientCoPayAmount: number;
  outOfPocketAmount: number;
  depositAmount: number;
  refundAmount: number;
  amountDue: number;
}

export interface BillingItemDto {
  orderNo: number;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  insuranceRatio: number;
  insuranceAmount: number;
  patientAmount: number;
  itemType: string;
}

export interface ReferralCertificateDto {
  admissionId: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  address?: string;
  insuranceNumber?: string;
  fromHospitalName: string;
  fromHospitalCode: string;
  toHospitalName: string;
  toHospitalCode: string;
  transferReason?: string;
  diagnosis?: string;
  treatmentSummary?: string;
  currentCondition?: string;
  requestedServices?: string;
  transferDate: string;
  doctorName?: string;
}

// #endregion

// #region 3.8 Báo cáo

export interface TreatmentActivityReportDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  departmentName?: string;
  totalAdmissions: number;
  emergencyAdmissions: number;
  electiveAdmissions: number;
  transferInAdmissions: number;
  totalDischarges: number;
  recoveredCount: number;
  improvedCount: number;
  unchangedCount: number;
  worsenedCount: number;
  deathCount: number;
  transferOutCount: number;
  totalBeds: number;
  averageOccupancyRate: number;
  averageLengthOfStay: number;
  totalRevenue: number;
  insuranceRevenue: number;
  feeRevenue: number;
}

export interface DepartmentRevenueReportDto {
  fromDate: string;
  toDate: string;
  departments: DepartmentRevenueItemDto[];
  totalRevenue: number;
  totalInsuranceRevenue: number;
  totalFeeRevenue: number;
}

export interface DepartmentRevenueItemDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  patientCount: number;
  totalBedDays: number;
  medicineRevenue: number;
  supplyRevenue: number;
  serviceRevenue: number;
  bedRevenue: number;
  totalRevenue: number;
  insuranceRevenue: number;
  feeRevenue: number;
}

export interface MedicineSupplyUsageReportDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  departmentName?: string;
  medicines: MedicineUsageItemDto[];
  supplies: SupplyUsageItemDto[];
  totalMedicineAmount: number;
  totalSupplyAmount: number;
}

export interface MedicineUsageItemDto {
  medicineCode: string;
  medicineName: string;
  unit: string;
  totalQuantity: number;
  totalAmount: number;
  patientCount: number;
}

export interface SupplyUsageItemDto {
  supplyCode: string;
  supplyName: string;
  unit: string;
  totalQuantity: number;
  totalAmount: number;
  patientCount: number;
}

// #endregion

// #region Search DTOs

export interface InpatientSearchDto {
  fromDate?: string;
  toDate?: string;
  departmentId?: string;
  roomId?: string;
  status?: number;
  isInsurance?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface TreatmentSheetSearchDto {
  admissionId?: string;
  fromDate?: string;
  toDate?: string;
  doctorId?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportSearchDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  doctorId?: string;
  paymentSource?: number;
  groupBy?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// #endregion

// ============================================================================
// API Functions
// ============================================================================

const BASE_URL = '/api/inpatient';

// #region 3.1 Màn hình chờ buồng bệnh

export const getWardLayout = (departmentId: string) =>
  apiClient.get<WardLayoutDto>(`${BASE_URL}/ward-layout/${departmentId}`);

export const getRoomLayouts = (departmentId: string) =>
  apiClient.get<RoomLayoutDto[]>(`${BASE_URL}/room-layouts/${departmentId}`);

export const getBedLayouts = (roomId: string) =>
  apiClient.get<BedLayoutDto[]>(`${BASE_URL}/bed-layouts/${roomId}`);

export const getSharedBedPatients = (bedId: string) =>
  apiClient.get<SharedBedPatientDto[]>(`${BASE_URL}/shared-bed/${bedId}`);

export const getWardColorConfig = (departmentId?: string) =>
  apiClient.get<WardColorConfigDto>(`${BASE_URL}/ward-color-config`, { params: { departmentId } });

export const updateWardColorConfig = (config: WardColorConfigDto, departmentId?: string) =>
  apiClient.put(`${BASE_URL}/ward-color-config`, config, { params: { departmentId } });

// #endregion

// #region 3.2 Quản lý bệnh nhân

export const getInpatientList = (search: InpatientSearchDto) =>
  apiClient.get<PagedResult<InpatientListDto>>(`${BASE_URL}/patients`, { params: search });

export const admitFromOpd = (dto: AdmitFromOpdDto) =>
  apiClient.post<AdmissionDto>(`${BASE_URL}/admit-from-opd`, dto);

export const admitFromDepartment = (dto: AdmitFromDepartmentDto) =>
  apiClient.post<AdmissionDto>(`${BASE_URL}/admit-from-department`, dto);

export const createCombinedTreatment = (dto: CreateCombinedTreatmentDto) =>
  apiClient.post<CombinedTreatmentDto>(`${BASE_URL}/combined-treatment`, dto);

export const getCombinedTreatments = (admissionId: string) =>
  apiClient.get<CombinedTreatmentDto[]>(`${BASE_URL}/combined-treatments/${admissionId}`);

export const completeCombinedTreatment = (id: string, treatmentResult: string) =>
  apiClient.post<CombinedTreatmentDto>(`${BASE_URL}/combined-treatment/${id}/complete`, treatmentResult);

export const transferDepartment = (dto: DepartmentTransferDto) =>
  apiClient.post<AdmissionDto>(`${BASE_URL}/transfer-department`, dto);

export const requestSpecialtyConsult = (dto: CreateSpecialtyConsultDto) =>
  apiClient.post<SpecialtyConsultRequestDto>(`${BASE_URL}/specialty-consult`, dto);

export const getSpecialtyConsultRequests = (admissionId: string) =>
  apiClient.get<SpecialtyConsultRequestDto[]>(`${BASE_URL}/specialty-consults/${admissionId}`);

export const completeSpecialtyConsult = (id: string, result: string, recommendations?: string) =>
  apiClient.post<SpecialtyConsultRequestDto>(`${BASE_URL}/specialty-consult/${id}/complete`, { result, recommendations });

export const transferToScheduledSurgery = (dto: SurgeryTransferDto) =>
  apiClient.post<boolean>(`${BASE_URL}/transfer-scheduled-surgery`, dto);

export const transferToEmergencySurgery = (dto: SurgeryTransferDto) =>
  apiClient.post<boolean>(`${BASE_URL}/transfer-emergency-surgery`, dto);

export const updateInsurance = (dto: UpdateInsuranceDto) =>
  apiClient.post<AdmissionDto>(`${BASE_URL}/update-insurance`, dto);

export const checkInsuranceReferral = (admissionId: string) =>
  apiClient.get<InsuranceReferralCheckDto>(`${BASE_URL}/insurance-check/${admissionId}`);

export const convertToFeePaying = (admissionId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/convert-to-fee/${admissionId}`);

export const assignBed = (dto: CreateBedAssignmentDto) =>
  apiClient.post<BedAssignmentDto>(`${BASE_URL}/assign-bed`, dto);

export const transferBed = (dto: TransferBedDto) =>
  apiClient.post<BedAssignmentDto>(`${BASE_URL}/transfer-bed`, dto);

export const registerSharedBed = (admissionId: string, bedId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/shared-bed`, { admissionId, bedId });

export const releaseBed = (admissionId: string) =>
  apiClient.post(`${BASE_URL}/release-bed/${admissionId}`);

export const getBedStatus = (departmentId?: string, roomId?: string) =>
  apiClient.get<BedStatusDto[]>(`${BASE_URL}/bed-status`, { params: { departmentId, roomId } });

export const getDailyOrderSummary = (admissionId: string, date: string) =>
  apiClient.get<DailyOrderSummaryDto>(`${BASE_URL}/daily-orders/${admissionId}`, { params: { date } });

export const getLabResults = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<LabResultItemDto[]>(`${BASE_URL}/lab-results/${admissionId}`, { params: { fromDate, toDate } });

export const printLabResults = (admissionId: string, resultIds: string[]) =>
  apiClient.post(`${BASE_URL}/print-lab-results/${admissionId}`, resultIds, { responseType: 'blob' });

export const getDepartmentFeeOverview = (departmentId: string) =>
  apiClient.get<DepartmentFeeOverviewDto>(`${BASE_URL}/department-fee/${departmentId}`);

export const getPatientFee = (admissionId: string) =>
  apiClient.get<PatientFeeItemDto>(`${BASE_URL}/patient-fee/${admissionId}`);

export const createDepositRequest = (dto: CreateDepositRequestDto) =>
  apiClient.post<DepositRequestDto>(`${BASE_URL}/deposit-request`, dto);

export const getDepositRequests = (departmentId?: string, status?: number) =>
  apiClient.get<DepositRequestDto[]>(`${BASE_URL}/deposit-requests`, { params: { departmentId, status } });

export const checkTransferWarnings = (admissionId: string) =>
  apiClient.get<TransferWarningDto>(`${BASE_URL}/transfer-warnings/${admissionId}`);

// #endregion

// #region 3.3 Chỉ định dịch vụ nội trú

export const getDiagnosisFromRecord = (admissionId: string) =>
  apiClient.get<{ diagnosisCode?: string; diagnosis?: string }>(`${BASE_URL}/diagnosis/${admissionId}`);

export const getServiceTree = (parentId?: string) =>
  apiClient.get<any[]>(`${BASE_URL}/service-tree`, { params: { parentId } });

export const searchServices = (keyword: string, serviceType?: string) =>
  apiClient.get<any[]>(`${BASE_URL}/search-services`, { params: { keyword, serviceType } });

export const createServiceOrder = (dto: CreateInpatientServiceOrderDto) =>
  apiClient.post<InpatientServiceOrderDto>(`${BASE_URL}/service-orders`, dto);

export const updateServiceOrder = (id: string, dto: CreateInpatientServiceOrderDto) =>
  apiClient.put<InpatientServiceOrderDto>(`${BASE_URL}/service-orders/${id}`, dto);

export const deleteServiceOrder = (id: string) =>
  apiClient.delete(`${BASE_URL}/service-orders/${id}`);

export const getServiceOrders = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<InpatientServiceOrderDto[]>(`${BASE_URL}/service-orders/${admissionId}`, { params: { fromDate, toDate } });

export const getServiceOrderById = (id: string) =>
  apiClient.get<InpatientServiceOrderDto>(`${BASE_URL}/service-order/${id}`);

export const createServiceGroupTemplate = (dto: ServiceGroupTemplateDto) =>
  apiClient.post<ServiceGroupTemplateDto>(`${BASE_URL}/service-group-templates`, dto);

export const getServiceGroupTemplates = (departmentId?: string) =>
  apiClient.get<ServiceGroupTemplateDto[]>(`${BASE_URL}/service-group-templates`, { params: { departmentId } });

export const orderByTemplate = (admissionId: string, templateId: string) =>
  apiClient.post<InpatientServiceOrderDto>(`${BASE_URL}/order-by-template`, { admissionId, templateId });

export const orderByPackage = (admissionId: string, packageId: string) =>
  apiClient.post<InpatientServiceOrderDto>(`${BASE_URL}/order-by-package`, { admissionId, packageId });

export const markServiceAsUrgent = (itemId: string, isUrgent: boolean) =>
  apiClient.post(`${BASE_URL}/service-item/${itemId}/urgent`, isUrgent);

export const checkServiceOrderWarnings = (admissionId: string, items: CreateInpatientServiceItemDto[]) =>
  apiClient.post<ServiceOrderWarningDto>(`${BASE_URL}/service-order-warnings`, { admissionId, items });

export const printServiceOrder = (orderId: string) =>
  apiClient.get(`${BASE_URL}/print-service-order/${orderId}`, { responseType: 'blob' });

// #endregion

// #region 3.4 Kê đơn thuốc nội trú

export const searchMedicines = (keyword: string, warehouseId: string) =>
  apiClient.get<any[]>(`${BASE_URL}/search-medicines`, { params: { keyword, warehouseId } });

export const getMedicineContraindications = (medicineId: string, admissionId: string) =>
  apiClient.get<any>(`${BASE_URL}/medicine-contraindications/${medicineId}`, { params: { admissionId } });

export const getMedicineStock = (medicineId: string, warehouseId: string) =>
  apiClient.get<number>(`${BASE_URL}/medicine-stock/${medicineId}`, { params: { warehouseId } });

export const createPrescription = (dto: CreateInpatientPrescriptionDto) =>
  apiClient.post<InpatientPrescriptionDto>(`${BASE_URL}/prescriptions`, dto);

export const updatePrescription = (id: string, dto: CreateInpatientPrescriptionDto) =>
  apiClient.put<InpatientPrescriptionDto>(`${BASE_URL}/prescriptions/${id}`, dto);

export const deletePrescription = (id: string) =>
  apiClient.delete(`${BASE_URL}/prescriptions/${id}`);

export const getPrescriptions = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<InpatientPrescriptionDto[]>(`${BASE_URL}/prescriptions/${admissionId}`, { params: { fromDate, toDate } });

export const getPrescriptionById = (id: string) =>
  apiClient.get<InpatientPrescriptionDto>(`${BASE_URL}/prescription/${id}`);

export const createEmergencyCabinetPrescription = (admissionId: string, cabinetId: string, items: CreateInpatientMedicineItemDto[]) =>
  apiClient.post<any>(`${BASE_URL}/emergency-cabinet-prescription`, { admissionId, cabinetId, items });

export const getEmergencyCabinets = (departmentId: string) =>
  apiClient.get<any[]>(`${BASE_URL}/emergency-cabinets/${departmentId}`);

export const checkPrescriptionWarnings = (admissionId: string, items: CreateInpatientMedicineItemDto[]) =>
  apiClient.post<PrescriptionWarningDto>(`${BASE_URL}/prescription-warnings`, { admissionId, items });

export const getPrescriptionTemplates = (departmentId?: string) =>
  apiClient.get<PrescriptionTemplateDto[]>(`${BASE_URL}/prescription-templates`, { params: { departmentId } });

export const createPrescriptionTemplate = (dto: PrescriptionTemplateDto) =>
  apiClient.post<PrescriptionTemplateDto>(`${BASE_URL}/prescription-templates`, dto);

export const prescribeByTemplate = (admissionId: string, templateId: string) =>
  apiClient.post<InpatientPrescriptionDto>(`${BASE_URL}/prescribe-by-template`, { admissionId, templateId });

export const createMedicineOrderSummary = (departmentId: string, date: string, warehouseId: string, roomId?: string) =>
  apiClient.post<MedicineOrderSummaryDto>(`${BASE_URL}/medicine-order-summary`, { departmentId, date, roomId, warehouseId });

export const getMedicineOrderSummaries = (departmentId: string, fromDate: string, toDate: string) =>
  apiClient.get<MedicineOrderSummaryDto[]>(`${BASE_URL}/medicine-order-summaries/${departmentId}`, { params: { fromDate, toDate } });

export const printMedicineOrderSummary = (summaryId: string) =>
  apiClient.get(`${BASE_URL}/print-medicine-summary/${summaryId}`, { responseType: 'blob' });

// #endregion

// #region 3.5 Chỉ định dinh dưỡng

export const createNutritionOrder = (dto: CreateNutritionOrderDto) =>
  apiClient.post<NutritionOrderDto>(`${BASE_URL}/nutrition-orders`, dto);

export const updateNutritionOrder = (id: string, dto: CreateNutritionOrderDto) =>
  apiClient.put<NutritionOrderDto>(`${BASE_URL}/nutrition-orders/${id}`, dto);

export const getNutritionOrders = (admissionId?: string, departmentId?: string, date?: string) =>
  apiClient.get<NutritionOrderDto[]>(`${BASE_URL}/nutrition-orders`, { params: { admissionId, departmentId, date } });

export const getNutritionSummary = (departmentId: string, date: string) =>
  apiClient.get<NutritionSummaryDto>(`${BASE_URL}/nutrition-summary/${departmentId}`, { params: { date } });

export const printNutritionSummary = (departmentId: string, date: string) =>
  apiClient.get(`${BASE_URL}/print-nutrition-summary/${departmentId}`, { params: { date }, responseType: 'blob' });

// #endregion

// #region 3.6 Thông tin điều trị

export const createTreatmentSheet = (dto: CreateTreatmentSheetDto) =>
  apiClient.post<TreatmentSheetDto>(`${BASE_URL}/treatment-sheets`, dto);

export const updateTreatmentSheet = (id: string, dto: CreateTreatmentSheetDto) =>
  apiClient.put<TreatmentSheetDto>(`${BASE_URL}/treatment-sheets/${id}`, dto);

export const getTreatmentSheets = (search: TreatmentSheetSearchDto) =>
  apiClient.get<TreatmentSheetDto[]>(`${BASE_URL}/treatment-sheets`, { params: search });

export const printTreatmentSheet = (id: string) =>
  apiClient.get(`${BASE_URL}/print-treatment-sheet/${id}`, { responseType: 'blob' });

export const createVitalSigns = (dto: CreateVitalSignsDto) =>
  apiClient.post<VitalSignsRecordDto>(`${BASE_URL}/vital-signs`, dto);

export const getVitalSignsList = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<VitalSignsRecordDto[]>(`${BASE_URL}/vital-signs/${admissionId}`, { params: { fromDate, toDate } });

export const getVitalSignsChart = (admissionId: string, fromDate: string, toDate: string) =>
  apiClient.get<VitalSignsChartDto>(`${BASE_URL}/vital-signs-chart/${admissionId}`, { params: { fromDate, toDate } });

export const createConsultation = (dto: CreateConsultationDto) =>
  apiClient.post<ConsultationDto>(`${BASE_URL}/consultations`, dto);

export const getConsultations = (admissionId?: string, departmentId?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<ConsultationDto[]>(`${BASE_URL}/consultations`, { params: { admissionId, departmentId, fromDate, toDate } });

export const completeConsultation = (id: string, conclusion: string, treatment?: string) =>
  apiClient.post<ConsultationDto>(`${BASE_URL}/consultations/${id}/complete`, { conclusion, treatment });

export const printConsultation = (id: string) =>
  apiClient.get(`${BASE_URL}/print-consultation/${id}`, { responseType: 'blob' });

export const createNursingCareSheet = (dto: CreateNursingCareSheetDto) =>
  apiClient.post<NursingCareSheetDto>(`${BASE_URL}/nursing-care-sheets`, dto);

export const getNursingCareSheets = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<NursingCareSheetDto[]>(`${BASE_URL}/nursing-care-sheets/${admissionId}`, { params: { fromDate, toDate } });

export const createInfusionRecord = (dto: CreateInfusionRecordDto) =>
  apiClient.post<InfusionRecordDto>(`${BASE_URL}/infusion-records`, dto);

export const completeInfusion = (id: string, endTime: string) =>
  apiClient.post<InfusionRecordDto>(`${BASE_URL}/infusion-records/${id}/complete`, endTime);

export const calculateInfusionEndTime = (volumeMl: number, dropRate: number) =>
  apiClient.get<string>(`${BASE_URL}/calculate-infusion-end`, { params: { volumeMl, dropRate } });

export const createBloodTransfusion = (dto: CreateBloodTransfusionDto) =>
  apiClient.post<BloodTransfusionDto>(`${BASE_URL}/blood-transfusions`, dto);

export const recordTransfusionReaction = (id: string, reactionDetails: string) =>
  apiClient.post<BloodTransfusionDto>(`${BASE_URL}/blood-transfusions/${id}/reaction`, reactionDetails);

export const createDrugReactionRecord = (admissionId: string, medicineId: string | undefined, medicineName: string, severity: number, symptoms: string, treatment?: string) =>
  apiClient.post<DrugReactionRecordDto>(`${BASE_URL}/drug-reactions`, { admissionId, medicineId, medicineName, severity, symptoms, treatment });

export const getDrugReactionRecords = (admissionId: string) =>
  apiClient.get<DrugReactionRecordDto[]>(`${BASE_URL}/drug-reactions/${admissionId}`);

// #endregion

// #region 3.7 Kết thúc điều trị

export const checkPreDischarge = (admissionId: string) =>
  apiClient.get<PreDischargeCheckDto>(`${BASE_URL}/pre-discharge-check/${admissionId}`);

export const dischargePatient = (dto: CompleteDischargeDto) =>
  apiClient.post<DischargeDto>(`${BASE_URL}/discharge`, dto);

export const cancelDischarge = (admissionId: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/cancel-discharge/${admissionId}`, reason);

export const printDischargeCertificate = (admissionId: string) =>
  apiClient.get(`${BASE_URL}/print-discharge-certificate/${admissionId}`, { responseType: 'blob' });

export const printReferralCertificate = (admissionId: string, data: ReferralCertificateDto) =>
  apiClient.post(`${BASE_URL}/print-referral-certificate/${admissionId}`, data, { responseType: 'blob' });

export const printServiceDisclosure = (admissionId: string) =>
  apiClient.get(`${BASE_URL}/print-service-disclosure/${admissionId}`, { responseType: 'blob' });

export const printMedicineDisclosure = (admissionId: string) =>
  apiClient.get(`${BASE_URL}/print-medicine-disclosure/${admissionId}`, { responseType: 'blob' });

export const getBillingStatement6556 = (admissionId: string) =>
  apiClient.get<BillingStatement6556Dto>(`${BASE_URL}/billing-statement/${admissionId}`);

export const printBillingStatement6556 = (admissionId: string) =>
  apiClient.get(`${BASE_URL}/print-billing-statement/${admissionId}`, { responseType: 'blob' });

// #endregion

// #region 3.8 Báo cáo

export const getDepartmentRevenueReport = (search: ReportSearchDto) =>
  apiClient.get<DepartmentRevenueReportDto>(`${BASE_URL}/reports/department-revenue`, { params: search });

export const getTreatmentActivityReport = (search: ReportSearchDto) =>
  apiClient.get<TreatmentActivityReportDto>(`${BASE_URL}/reports/treatment-activity`, { params: search });

export const getRegister4069 = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<any>(`${BASE_URL}/reports/register-4069`, { params: { fromDate, toDate, departmentId } });

export const printRegister4069 = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get(`${BASE_URL}/reports/print-register-4069`, { params: { fromDate, toDate, departmentId }, responseType: 'blob' });

export const getMedicineSupplyUsageReport = (search: ReportSearchDto) =>
  apiClient.get<MedicineSupplyUsageReportDto>(`${BASE_URL}/reports/medicine-supply-usage`, { params: search });

// #endregion

// Default export for convenience
export default {
  // Ward Layout
  getWardLayout,
  getRoomLayouts,
  getBedLayouts,
  getSharedBedPatients,
  getWardColorConfig,
  updateWardColorConfig,

  // Patient Management
  getInpatientList,
  admitFromOpd,
  admitFromDepartment,
  createCombinedTreatment,
  getCombinedTreatments,
  completeCombinedTreatment,
  transferDepartment,
  requestSpecialtyConsult,
  getSpecialtyConsultRequests,
  completeSpecialtyConsult,
  transferToScheduledSurgery,
  transferToEmergencySurgery,
  updateInsurance,
  checkInsuranceReferral,
  convertToFeePaying,
  assignBed,
  transferBed,
  registerSharedBed,
  releaseBed,
  getBedStatus,
  getDailyOrderSummary,
  getLabResults,
  printLabResults,
  getDepartmentFeeOverview,
  getPatientFee,
  createDepositRequest,
  getDepositRequests,
  checkTransferWarnings,

  // Service Orders
  getDiagnosisFromRecord,
  getServiceTree,
  searchServices,
  createServiceOrder,
  updateServiceOrder,
  deleteServiceOrder,
  getServiceOrders,
  getServiceOrderById,
  createServiceGroupTemplate,
  getServiceGroupTemplates,
  orderByTemplate,
  orderByPackage,
  markServiceAsUrgent,
  checkServiceOrderWarnings,
  printServiceOrder,

  // Prescriptions
  searchMedicines,
  getMedicineContraindications,
  getMedicineStock,
  createPrescription,
  updatePrescription,
  deletePrescription,
  getPrescriptions,
  getPrescriptionById,
  createEmergencyCabinetPrescription,
  getEmergencyCabinets,
  checkPrescriptionWarnings,
  getPrescriptionTemplates,
  createPrescriptionTemplate,
  prescribeByTemplate,
  createMedicineOrderSummary,
  getMedicineOrderSummaries,
  printMedicineOrderSummary,

  // Nutrition
  createNutritionOrder,
  updateNutritionOrder,
  getNutritionOrders,
  getNutritionSummary,
  printNutritionSummary,

  // Treatment Info
  createTreatmentSheet,
  updateTreatmentSheet,
  getTreatmentSheets,
  printTreatmentSheet,
  createVitalSigns,
  getVitalSignsList,
  getVitalSignsChart,
  createConsultation,
  getConsultations,
  completeConsultation,
  printConsultation,
  createNursingCareSheet,
  getNursingCareSheets,
  createInfusionRecord,
  completeInfusion,
  calculateInfusionEndTime,
  createBloodTransfusion,
  recordTransfusionReaction,
  createDrugReactionRecord,
  getDrugReactionRecords,

  // Discharge
  checkPreDischarge,
  dischargePatient,
  cancelDischarge,
  printDischargeCertificate,
  printReferralCertificate,
  printServiceDisclosure,
  printMedicineDisclosure,
  getBillingStatement6556,
  printBillingStatement6556,

  // Reports
  getDepartmentRevenueReport,
  getTreatmentActivityReport,
  getRegister4069,
  printRegister4069,
  getMedicineSupplyUsageReport,
};
