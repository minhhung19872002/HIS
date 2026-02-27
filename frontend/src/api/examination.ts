import request from '@/utils/request';

// ============================================
// Phân hệ 2: Khám bệnh OPD - API Client đầy đủ
// Bao gồm tất cả 180+ chức năng theo yêu cầu
// ============================================

// #region Types

// 2.1 Màn hình chờ
export interface WaitingRoomDisplayDto {
  roomId: string;
  roomCode: string;
  roomName: string;
  departmentName?: string;
  doctorName?: string;
  doctorTitle?: string;
  currentNumber?: number;
  currentPatientName?: string;
  callingList: CallingPatientDto[];
  waitingList: WaitingPatientDto[];
  totalWaiting: number;
  totalWaitingResult: number;
  totalCompleted: number;
  backgroundColor?: string;
  textColor?: string;
}

export interface CallingPatientDto {
  queueNumber: number;
  patientName: string;
  calledCount: number;
  calledAt?: string;
}

export interface WaitingPatientDto {
  examinationId: string;
  queueNumber: number;
  patientName: string;
  priority: number;
  isInsurance: boolean;
  isChronic: boolean;
  status: number;
  isDoingLab: boolean;
  waitingMinutes: number;
}

export interface WaitingRoomDisplayConfigDto {
  backgroundColor?: string;
  textColor?: string;
  refreshIntervalSeconds: number;
  displayCount: number;
  showPatientPhoto: boolean;
  showInsuranceStatus: boolean;
}

// 2.2 Danh sách bệnh nhân
export interface RoomPatientListDto {
  examinationId: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender: number;
  age: number;
  photoUrl?: string;
  patientType: number;
  insuranceNumber?: string;
  isInsuranceValid: boolean;
  isChronic: boolean;
  isPriority: boolean;
  isEmergency: boolean;
  hasDebt: boolean;
  hasUnpaidServices: boolean;
  queueNumber: number;
  status: number;
  statusName: string;
  totalLabOrders: number;
  completedLabOrders: number;
  hasPendingLabs: boolean;
  labStatuses: LabStatusDto[];
  preliminaryDiagnosis?: string;
}

export interface LabStatusDto {
  serviceName: string;
  status: number;
  hasResult: boolean;
}

export interface PatientLabResultsDto {
  patientId: string;
  examinationId: string;
  labResults: LabResultSummaryDto[];
  imagingResults: ImagingResultSummaryDto[];
}

export interface LabResultSummaryDto {
  orderId: string;
  serviceCode: string;
  serviceName: string;
  resultDate?: string;
  status: number;
  items: LabResultItemDto[];
}

export interface LabResultItemDto {
  testName: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  abnormalType?: number;
}

export interface ImagingResultSummaryDto {
  orderId: string;
  serviceCode: string;
  serviceName: string;
  resultDate?: string;
  conclusion?: string;
  imageUrls: string[];
}

export interface PatientFilterDto {
  isInsurance?: boolean;
  isChronic?: boolean;
  isPriority?: boolean;
  isEmergency?: boolean;
  hasDebt?: boolean;
  hasPendingLabs?: boolean;
  status?: number;
}

// 2.3 Khám bệnh
export interface MedicalRecordFullDto {
  id: string;
  medicalRecordCode: string;
  patient: PatientInfoDto;
  vitalSigns?: VitalSignsFullDto;
  interview?: MedicalInterviewDto;
  physicalExam?: PhysicalExaminationDto;
  diagnoses: DiagnosisFullDto[];
  serviceOrders: ServiceOrderFullDto[];
  prescriptions: PrescriptionFullDto[];
  history: MedicalHistoryDto[];
  allergies: AllergyDto[];
  contraindications: ContraindicationDto[];
  conclusion?: ExaminationConclusionDto;
}

export interface PatientInfoDto {
  id: string;
  patientCode: string;
  fullName: string;
  gender: number;
  dateOfBirth?: string;
  age: number;
  phoneNumber?: string;
  address?: string;
  occupation?: string;
  photoUrl?: string;
}

export interface VitalSignsFullDto {
  weight?: number;
  height?: number;
  bmi?: number;
  bmiClassification?: string;
  systolicBP?: number;
  diastolicBP?: number;
  bpClassification?: string;
  pulse?: number;
  temperature?: number;
  respiratoryRate?: number;
  spO2?: number;
  bloodGlucose?: number;
  glucoseType?: string;
  notes?: string;
  measuredAt: string;
  measuredBy?: string;
}

export interface MedicalInterviewDto {
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  surgicalHistory?: string;
  obstetricHistory?: string;
  medicationHistory?: string;
  allergyHistory?: string;
}

export interface PhysicalExaminationDto {
  generalAppearance?: string;
  skin?: string;
  headNeck?: string;
  eyes?: string;
  ent?: string;
  cardiovascular?: string;
  respiratory?: string;
  gastrointestinal?: string;
  genitourinary?: string;
  musculoskeletal?: string;
  neurological?: string;
  psychiatric?: string;
  lymphatic?: string;
  otherFindings?: string;
  templateId?: string;
  templateName?: string;
}

export interface ExaminationTemplateDto {
  id: string;
  templateName: string;
  description?: string;
  templateType: number;
  departmentId?: string;
  createdByUserId?: string;
  content: PhysicalExaminationDto;
  isDefault: boolean;
}

export interface AllergyDto {
  id: string;
  patientId: string;
  allergyType: number;
  allergenName: string;
  reaction?: string;
  severity: number;
  reportedDate?: string;
  isActive: boolean;
}

export interface ContraindicationDto {
  id: string;
  patientId: string;
  contraindicationType: number;
  name: string;
  description?: string;
  reportedDate?: string;
  isActive: boolean;
}

export interface TreatmentSheetDto {
  id: string;
  examinationId: string;
  treatmentDate: string;
  dayNumber: number;
  dailyProgress?: string;
  treatmentOrders?: string;
  doctorNotes?: string;
  vitalSigns?: VitalSignsFullDto;
  medications: MedicationOrderDto[];
  doctorId: string;
  doctorName?: string;
}

export interface MedicationOrderDto {
  id: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  morningDose: number;
  noonDose: number;
  afternoonDose: number;
  eveningDose: number;
  totalDailyDose: number;
  unit: string;
  route?: string;
  notes?: string;
}

export interface ConsultationRecordDto {
  id: string;
  examinationId: string;
  consultationDate: string;
  reason: string;
  summary: string;
  conclusion: string;
  recommendations: string;
  consultants: ConsultantDto[];
  chairman?: string;
  secretary?: string;
}

export interface ConsultantDto {
  doctorId: string;
  doctorName: string;
  specialty?: string;
  opinion?: string;
}

export interface NursingCareSheetDto {
  id: string;
  examinationId: string;
  careDate: string;
  shift: number;
  patientCondition?: string;
  nursingAssessment?: string;
  nursingInterventions?: string;
  patientResponse?: string;
  vitalSigns?: VitalSignsFullDto;
  nurseId: string;
  nurseName?: string;
}

export interface InjuryInfoDto {
  id: string;
  examinationId: string;
  injuryType: number;
  injuryTime: string;
  injuryLocation?: string;
  injuryDescription?: string;
  witness?: string;
  hasPoliceReport: boolean;
  policeReportNumber?: string;
}

// 2.4 Chẩn đoán
export interface DiagnosisFullDto {
  id: string;
  examinationId: string;
  diagnosisType: number;
  diagnosisTypeName: string;
  isPrimary: boolean;
  icdCode: string;
  icdName: string;
  customDiagnosis?: string;
  externalCauseCode?: string;
  externalCauseName?: string;
  order: number;
  diagnosedAt: string;
  diagnosedBy?: string;
}

export interface UpdateDiagnosisDto {
  preliminaryDiagnosis?: string;
  primaryIcdCode?: string;
  primaryDiagnosis?: string;
  secondaryDiagnoses: SecondaryDiagnosisDto[];
  externalCauseCode?: string;
  externalCauseName?: string;
}

export interface SecondaryDiagnosisDto {
  icdCode: string;
  diagnosisName?: string;
}

export interface IcdCodeFullDto {
  code: string;
  name: string;
  englishName?: string;
  icdType: number;
  chapterCode?: string;
  chapterName?: string;
  groupCode?: string;
  groupName?: string;
  isActive: boolean;
  requiresExternalCause: boolean;
}

// 2.5 Khám thêm
export interface AdditionalExaminationDto {
  originalExaminationId: string;
  newRoomId: string;
  newDoctorId?: string;
  examType: number;
  paymentType: number;
  diagnosis?: string;
  reason?: string;
}

export interface TransferRoomRequestDto {
  examinationId: string;
  newRoomId: string;
  newDoctorId?: string;
  reason?: string;
  keepOriginalQueue: boolean;
}

// 2.6 Chỉ định dịch vụ
export interface ServiceOrderFullDto {
  id: string;
  examinationId: string;
  orderDate: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceType: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  insurancePrice: number;
  patientPrice: number;
  surcharge?: number;
  roomId?: string;
  roomName?: string;
  paymentType: number;
  payerSourceId?: string;
  isPriority: boolean;
  isEmergency: boolean;
  status: number;
  statusName: string;
  orderNotes?: string;
  serviceNotes?: string;
  orderedById: string;
  orderedByName?: string;
  consultantId?: string;
  consultantName?: string;
  result?: string;
  resultDate?: string;
}

export interface CreateServiceOrderDto {
  examinationId: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  services: ServiceOrderItemDto[];
  autoSelectRoom: boolean;
  calculateOptimalPath: boolean;
}

export interface ServiceOrderItemDto {
  serviceId: string;
  quantity: number;
  roomId?: string;
  paymentType: number;
  payerSourceId?: string;
  isPriority: boolean;
  isEmergency: boolean;
  notes?: string;
  surcharge?: number;
}

export interface ServiceGroupTemplateDto {
  id: string;
  groupCode: string;
  groupName: string;
  groupType: number;
  departmentId?: string;
  createdByUserId?: string;
  serviceIds: string[];
  isDefault: boolean;
}

export interface ServicePackageDto {
  id: string;
  packageCode: string;
  packageName: string;
  packagePrice: number;
  services: ServicePackageItemDto[];
}

export interface ServicePackageItemDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
}

export interface ServiceOrderWarningDto {
  warningType: number;
  warningTypeName: string;
  message: string;
  isBlocking: boolean;
  relatedServiceId?: string;
  lastOrderDate?: string;
}

// 2.7 Kê đơn thuốc
export interface PrescriptionFullDto {
  id: string;
  examinationId: string;
  prescriptionDate: string;
  prescriptionType: number;
  diagnosisCode?: string;
  diagnosisName?: string;
  warehouseId?: string;
  warehouseName?: string;
  totalDays: number;
  items: PrescriptionItemFullDto[];
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  paymentType: number;
  instructions?: string;
  status: number;
  statusName: string;
  prescribedById: string;
  prescribedByName?: string;
}

export interface PrescriptionItemFullDto {
  id: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  activeIngredient?: string;
  manufacturer?: string;
  country?: string;
  quantity: number;
  unit: string;
  days: number;
  dosage?: string;
  route?: string;
  frequency?: string;
  usageInstructions?: string;
  unitPrice: number;
  totalPrice: number;
  insurancePrice: number;
  patientPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  paymentType: number;
  availableQuantity: number;
  isOutOfStock: boolean;
}

export interface CreatePrescriptionDto {
  examinationId: string;
  prescriptionType: number;
  diagnosisCode?: string;
  diagnosisName?: string;
  warehouseId?: string;
  totalDays: number;
  items: CreatePrescriptionItemDto[];
  instructions?: string;
}

export interface CreatePrescriptionItemDto {
  medicineId: string;
  quantity: number;
  days: number;
  dosage?: string;
  route?: string;
  frequency?: string;
  usageInstructions?: string;
  paymentType: number;
}

export interface PrescriptionTemplateDto {
  id: string;
  templateName: string;
  description?: string;
  templateType: number;
  departmentId?: string;
  createdByUserId?: string;
  items: CreatePrescriptionItemDto[];
  instructions?: string;
  isShared: boolean;
}

export interface DrugInteractionDto {
  drug1Id: string;
  drug1Name: string;
  drug2Id: string;
  drug2Name: string;
  severity: number;
  severityName: string;
  severityColor: string;
  description?: string;
  recommendation?: string;
}

export interface PrescriptionWarningDto {
  warningType: number;
  warningTypeName: string;
  message: string;
  severity: number;
  isBlocking: boolean;
  relatedMedicineId?: string;
}

export interface InstructionLibraryDto {
  id: string;
  category: string;
  content: string;
  isDefault: boolean;
  createdByUserId?: string;
}

// 2.8 Kết luận
export interface ExaminationConclusionDto {
  id: string;
  examinationId: string;
  conclusionType: number;
  conclusionTypeName: string;
  conclusionNotes?: string;
  admissionDepartmentId?: string;
  admissionDepartmentName?: string;
  admissionReason?: string;
  transferToFacility?: string;
  transferReason?: string;
  nextAppointmentDate?: string;
  appointmentNotes?: string;
  sickLeaveDays?: number;
  sickLeaveFromDate?: string;
  sickLeaveToDate?: string;
  concludedAt: string;
  concludedBy?: string;
}

export interface CompleteExaminationDto {
  conclusionType: number;
  conclusionNotes?: string;
  admissionDepartmentId?: string;
  admissionReason?: string;
  transferToFacility?: string;
  transferReason?: string;
  nextAppointmentDate?: string;
  appointmentNotes?: string;
  sickLeaveDays?: number;
  finalDiagnosisCode?: string;
  finalDiagnosisName?: string;
}

export interface HospitalizationRequestDto {
  departmentId: string;
  reason: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  isEmergency: boolean;
}

export interface TransferRequestDto {
  facilityName: string;
  reason: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  transportMethod?: string;
}

export interface CreateAppointmentDto {
  appointmentDate: string;
  roomId?: string;
  doctorId?: string;
  notes?: string;
}

export interface AppointmentDto {
  id: string;
  patientId: string;
  appointmentDate: string;
  roomId?: string;
  roomName?: string;
  doctorId?: string;
  doctorName?: string;
  notes?: string;
  status: number;
}

export interface CreateSickLeaveDto {
  days: number;
  fromDate: string;
  toDate: string;
  reason?: string;
}

export interface SickLeaveDto {
  id: string;
  examinationId: string;
  days: number;
  fromDate: string;
  toDate: string;
  reason?: string;
  doctorName?: string;
  issuedAt: string;
}

export interface ExaminationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 2.9 Thống kê báo cáo
export interface ExaminationStatisticsDto {
  fromDate: string;
  toDate: string;
  totalExaminations: number;
  insuranceExaminations: number;
  feeExaminations: number;
  pendingCount: number;
  inProgressCount: number;
  waitingResultCount: number;
  completedCount: number;
  dischargedHomeCount: number;
  hospitalizedCount: number;
  transferredCount: number;
  reexaminationCount: number;
  averageWaitingTime: number;
  averageExaminationTime: number;
  byDepartment: Record<string, number>;
  byRoom: Record<string, number>;
  byDoctor: DoctorExaminationStatDto[];
}

export interface DoctorExaminationStatDto {
  doctorId: string;
  doctorName: string;
  totalExaminations: number;
  insuranceExaminations: number;
  averageExaminationTime: number;
}

export interface ExaminationRegisterDto {
  rowNumber: number;
  examinationDate: string;
  patientCode: string;
  patientName: string;
  age: number;
  gender: string;
  address?: string;
  insuranceNumber?: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  treatmentResult?: string;
  doctorName?: string;
  notes?: string;
}

export interface CommunicableDiseaseReportDto {
  icdCode: string;
  diseaseName: string;
  caseCount: number;
  reportDate: string;
}

// 2.10 Chức năng bổ sung
export interface RoomExaminationConfigDto {
  roomId: string;
  maxPatientsPerDay: number;
  averageExaminationMinutes: number;
  autoCallNext: boolean;
  requireVitalSigns: boolean;
  requireDiagnosis: boolean;
  defaultServiceIds: string[];
}

export interface SignatureVerificationResult {
  isValid: boolean;
  signerName?: string;
  signedAt?: string;
  certificateInfo?: string;
}

export interface ExaminationActivityLogDto {
  id: string;
  timestamp: string;
  action: string;
  description?: string;
  userName?: string;
  ipAddress?: string;
}

export interface BmiCalculationResult {
  bmi: number;
  classification: string;
  colorCode: string;
}

export interface MedicalHistoryDto {
  examinationId: string;
  examinationDate: string;
  roomName?: string;
  doctorName?: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  conclusionType?: number;
  conclusionTypeName?: string;
}

export interface ExaminationDto {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  roomId: string;
  roomName?: string;
  doctorId?: string;
  doctorName?: string;
  status: number;
  statusName: string;
  queueNumber: number;
  examinationDate: string;
  diagnosisCode?: string;
  diagnosisName?: string;
}

export interface ExaminationSearchDto {
  keyword?: string;
  patientCode?: string;
  patientName?: string;
  roomId?: string;
  doctorId?: string;
  departmentId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface ServiceDto {
  id: string;
  code: string;
  name: string;
  serviceType: number;
  unitPrice: number;
  insurancePrice: number;
  isActive: boolean;
}

export interface RoomDto {
  id: string;
  code: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  roomType: number;
  isActive: boolean;
  currentQueueCount?: number;
}

export interface DoctorDto {
  id: string;
  code: string;
  name: string;
  title?: string;
  specialty?: string;
  departmentId?: string;
  departmentName?: string;
  isOnDuty: boolean;
}

export interface MedicineDto {
  id: string;
  code: string;
  name: string;
  activeIngredient?: string;
  manufacturer?: string;
  country?: string;
  unit?: string;
  unitPrice: number;
  insurancePrice: number;
  availableQuantity: number;
  isActive: boolean;
}

export interface WarehouseDto {
  id: string;
  code: string;
  name: string;
  warehouseType: number;
  isActive: boolean;
}

// #endregion

// #region 2.1 Màn hình chờ phòng khám

export const getWaitingRoomDisplay = (roomId: string) =>
  request.get<WaitingRoomDisplayDto>(`/examination/waiting-room/${roomId}`);

export const getDepartmentWaitingRoomDisplays = (departmentId: string) =>
  request.get<WaitingRoomDisplayDto[]>(`/examination/waiting-rooms/department/${departmentId}`);

export const updateWaitingRoomDisplayConfig = (roomId: string, config: WaitingRoomDisplayConfigDto) =>
  request.put<boolean>(`/examination/waiting-room/${roomId}/config`, config);

export const callNextPatient = (roomId: string) =>
  request.post<CallingPatientDto>(`/examination/waiting-room/${roomId}/call-next`);

export const recallPatient = (examinationId: string) =>
  request.post<CallingPatientDto>(`/examination/${examinationId}/recall`);

export const skipPatient = (examinationId: string) =>
  request.post<boolean>(`/examination/${examinationId}/skip`);

// #endregion

// #region 2.2 Danh sách bệnh nhân phòng khám

export const getRoomPatientList = (roomId: string, date?: string, status?: number) =>
  request.get<RoomPatientListDto[]>(`/examination/room/${roomId}/patients`, { params: { date, status } });

export const searchRoomPatients = (roomId: string, keyword: string, date?: string) =>
  request.get<RoomPatientListDto[]>(`/examination/room/${roomId}/patients/search`, { params: { keyword, date } });

export const filterPatientsByCondition = (roomId: string, filter: PatientFilterDto) =>
  request.post<RoomPatientListDto[]>(`/examination/room/${roomId}/patients/filter`, filter);

export const getPatientLabResults = (examinationId: string) =>
  request.get<PatientLabResultsDto>(`/examination/${examinationId}/lab-results`);

export const getPendingLabStatus = (examinationId: string) =>
  request.get<LabStatusDto[]>(`/examination/${examinationId}/pending-labs`);

export const getPatientPhoto = (patientId: string) =>
  request.get<string>(`/examination/patient/${patientId}/photo`);

export const updatePatientPhoto = (patientId: string, photoBase64: string) =>
  request.put<boolean>(`/examination/patient/${patientId}/photo`, { photoBase64 });

// #endregion

// #region 2.3 Chức năng khám bệnh

export const getMedicalRecordFull = (examinationId: string) =>
  request.get<MedicalRecordFullDto>(`/examination/${examinationId}/medical-record`);

export const startExamination = (examinationId: string) =>
  request.post<ExaminationDto>(`/examination/${examinationId}/start`);

export const updateVitalSigns = (examinationId: string, dto: VitalSignsFullDto) =>
  request.put<VitalSignsFullDto>(`/examination/${examinationId}/vital-signs`, dto);

export const getVitalSigns = (examinationId: string) =>
  request.get<VitalSignsFullDto>(`/examination/${examinationId}/vital-signs`);

export const calculateBmi = (weight: number, height: number) =>
  request.get<BmiCalculationResult>(`/examination/calculate-bmi`, { params: { weight, height } });

export const classifyBloodPressure = (systolic: number, diastolic: number) =>
  request.get<string>(`/examination/classify-blood-pressure`, { params: { systolic, diastolic } });

export const updateMedicalInterview = (examinationId: string, dto: MedicalInterviewDto) =>
  request.put<MedicalInterviewDto>(`/examination/${examinationId}/medical-interview`, dto);

export const getMedicalInterview = (examinationId: string) =>
  request.get<MedicalInterviewDto>(`/examination/${examinationId}/medical-interview`);

export const updatePhysicalExamination = (examinationId: string, dto: PhysicalExaminationDto) =>
  request.put<PhysicalExaminationDto>(`/examination/${examinationId}/physical-examination`, dto);

export const getPhysicalExamination = (examinationId: string) =>
  request.get<PhysicalExaminationDto>(`/examination/${examinationId}/physical-examination`);

export const getExaminationTemplates = (departmentId?: string, templateType?: number) =>
  request.get<ExaminationTemplateDto[]>(`/examination/templates/examination`, { params: { departmentId, templateType } });

export const createExaminationTemplate = (dto: ExaminationTemplateDto) =>
  request.post<ExaminationTemplateDto>(`/examination/templates/examination`, dto);

export const updateExaminationTemplate = (id: string, dto: ExaminationTemplateDto) =>
  request.put<ExaminationTemplateDto>(`/examination/templates/examination/${id}`, dto);

export const deleteExaminationTemplate = (id: string) =>
  request.delete<boolean>(`/examination/templates/examination/${id}`);

export const applyExaminationTemplate = (examinationId: string, templateId: string) =>
  request.post<PhysicalExaminationDto>(`/examination/${examinationId}/apply-template/${templateId}`);

export const saveAsExaminationTemplate = (examinationId: string, templateName: string) =>
  request.post<ExaminationTemplateDto>(`/examination/${examinationId}/save-as-template`, { templateName });

export const getPatientAllergies = (patientId: string) =>
  request.get<AllergyDto[]>(`/examination/patient/${patientId}/allergies`);

export const addPatientAllergy = (patientId: string, dto: AllergyDto) =>
  request.post<AllergyDto>(`/examination/patient/${patientId}/allergies`, dto);

export const updatePatientAllergy = (id: string, dto: AllergyDto) =>
  request.put<AllergyDto>(`/examination/allergies/${id}`, dto);

export const deletePatientAllergy = (id: string) =>
  request.delete<boolean>(`/examination/allergies/${id}`);

export const getPatientContraindications = (patientId: string) =>
  request.get<ContraindicationDto[]>(`/examination/patient/${patientId}/contraindications`);

export const addPatientContraindication = (patientId: string, dto: ContraindicationDto) =>
  request.post<ContraindicationDto>(`/examination/patient/${patientId}/contraindications`, dto);

export const updatePatientContraindication = (id: string, dto: ContraindicationDto) =>
  request.put<ContraindicationDto>(`/examination/contraindications/${id}`, dto);

export const deletePatientContraindication = (id: string) =>
  request.delete<boolean>(`/examination/contraindications/${id}`);

export const getPatientMedicalHistory = (patientId: string, limit = 20) =>
  request.get<MedicalHistoryDto[]>(`/examination/patient/${patientId}/history`, { params: { limit } });

export const getMedicalHistoryDetail = (examinationId: string) =>
  request.get<MedicalRecordFullDto>(`/examination/history/${examinationId}/detail`);

export const getHistoryImagingImages = (orderId: string) =>
  request.get<string[]>(`/examination/history/imaging/${orderId}/images`);

export const createTreatmentSheet = (dto: TreatmentSheetDto) =>
  request.post<TreatmentSheetDto>(`/examination/treatment-sheets`, dto);

export const updateTreatmentSheet = (id: string, dto: TreatmentSheetDto) =>
  request.put<TreatmentSheetDto>(`/examination/treatment-sheets/${id}`, dto);

export const getTreatmentSheets = (examinationId: string) =>
  request.get<TreatmentSheetDto[]>(`/examination/${examinationId}/treatment-sheets`);

export const createConsultationRecord = (dto: ConsultationRecordDto) =>
  request.post<ConsultationRecordDto>(`/examination/consultations`, dto);

export const updateConsultationRecord = (id: string, dto: ConsultationRecordDto) =>
  request.put<ConsultationRecordDto>(`/examination/consultations/${id}`, dto);

export const getConsultationRecords = (examinationId: string) =>
  request.get<ConsultationRecordDto[]>(`/examination/${examinationId}/consultations`);

export const createNursingCareSheet = (dto: NursingCareSheetDto) =>
  request.post<NursingCareSheetDto>(`/examination/nursing-care`, dto);

export const updateNursingCareSheet = (id: string, dto: NursingCareSheetDto) =>
  request.put<NursingCareSheetDto>(`/examination/nursing-care/${id}`, dto);

export const getNursingCareSheets = (examinationId: string) =>
  request.get<NursingCareSheetDto[]>(`/examination/${examinationId}/nursing-care`);

export const updateInjuryInfo = (examinationId: string, dto: InjuryInfoDto) =>
  request.put<InjuryInfoDto>(`/examination/${examinationId}/injury-info`, dto);

export const getInjuryInfo = (examinationId: string) =>
  request.get<InjuryInfoDto>(`/examination/${examinationId}/injury-info`);

// #endregion

// #region 2.4 Chẩn đoán

export const getDiagnoses = (examinationId: string) =>
  request.get<DiagnosisFullDto[]>(`/examination/${examinationId}/diagnoses`);

export const addDiagnosis = (examinationId: string, dto: DiagnosisFullDto) =>
  request.post<DiagnosisFullDto>(`/examination/${examinationId}/diagnoses`, dto);

export const updateDiagnosis = (diagnosisId: string, dto: DiagnosisFullDto) =>
  request.put<DiagnosisFullDto>(`/examination/diagnoses/${diagnosisId}`, dto);

export const deleteDiagnosis = (diagnosisId: string) =>
  request.delete<boolean>(`/examination/diagnoses/${diagnosisId}`);

export const updateDiagnosisList = (examinationId: string, dto: UpdateDiagnosisDto) =>
  request.put<DiagnosisFullDto[]>(`/examination/${examinationId}/diagnoses/batch`, dto);

export const setPrimaryDiagnosis = (diagnosisId: string) =>
  request.post<DiagnosisFullDto>(`/examination/diagnoses/${diagnosisId}/set-primary`);

export const searchIcdCodes = (keyword: string, icdType?: number, limit = 20) =>
  request.get<IcdCodeFullDto[]>(`/examination/icd/search`, { params: { keyword, icdType, limit } });

export const getIcdByCode = (code: string) =>
  request.get<IcdCodeFullDto>(`/examination/icd/${code}`);

export const getFrequentIcdCodes = (departmentId?: string, limit = 20) =>
  request.get<IcdCodeFullDto[]>(`/examination/icd/frequent`, { params: { departmentId, limit } });

export const suggestIcdCodes = (symptoms: string) =>
  request.get<IcdCodeFullDto[]>(`/examination/icd/suggest`, { params: { symptoms } });

export const getRecentIcdCodes = (limit = 20) =>
  request.get<IcdCodeFullDto[]>(`/examination/icd/recent`, { params: { limit } });

export const searchExternalCauseCodes = (keyword: string) =>
  request.get<IcdCodeFullDto[]>(`/examination/icd/external-cause/search`, { params: { keyword } });

// #endregion

// #region 2.5 Khám thêm

export const createAdditionalExamination = (dto: AdditionalExaminationDto) =>
  request.post<ExaminationDto>(`/examination/additional`, dto);

export const transferRoom = (dto: TransferRoomRequestDto) =>
  request.post<ExaminationDto>(`/examination/transfer-room`, dto);

export const transferPrimaryExamination = (examinationId: string, newRoomId: string) =>
  request.post<ExaminationDto>(`/examination/${examinationId}/transfer-primary/${newRoomId}`);

export const getAdditionalExaminations = (primaryExaminationId: string) =>
  request.get<ExaminationDto[]>(`/examination/${primaryExaminationId}/additional-list`);

export const cancelAdditionalExamination = (examinationId: string, reason: string) =>
  request.post<boolean>(`/examination/${examinationId}/cancel-additional`, { reason });

export const completeAdditionalExamination = (examinationId: string) =>
  request.post<ExaminationDto>(`/examination/${examinationId}/complete-additional`);

// #endregion

// #region 2.6 Chỉ định dịch vụ

export const getServiceOrders = (examinationId: string) =>
  request.get<ServiceOrderFullDto[]>(`/examination/${examinationId}/service-orders`);

export const createServiceOrders = (dto: CreateServiceOrderDto) =>
  request.post<ServiceOrderFullDto[]>(`/examination/service-orders`, dto);

export const updateServiceOrder = (orderId: string, dto: ServiceOrderFullDto) =>
  request.put<ServiceOrderFullDto>(`/examination/service-orders/${orderId}`, dto);

export const cancelServiceOrder = (orderId: string, reason: string) =>
  request.post<boolean>(`/examination/service-orders/${orderId}/cancel`, { reason });

export const getServices = (serviceType?: number, departmentId?: string, keyword?: string) =>
  request.get<ServiceDto[]>(`/examination/services`, { params: { serviceType, departmentId, keyword } });

export const searchServices = (keyword: string, limit = 20) =>
  request.get<ServiceDto[]>(`/examination/services/search`, { params: { keyword, limit } });

export const getServiceGroupTemplates = (departmentId?: string) =>
  request.get<ServiceGroupTemplateDto[]>(`/examination/service-groups`, { params: { departmentId } });

export const createServiceGroupTemplate = (dto: ServiceGroupTemplateDto) =>
  request.post<ServiceGroupTemplateDto>(`/examination/service-groups`, dto);

export const updateServiceGroupTemplate = (id: string, dto: ServiceGroupTemplateDto) =>
  request.put<ServiceGroupTemplateDto>(`/examination/service-groups/${id}`, dto);

export const deleteServiceGroupTemplate = (id: string) =>
  request.delete<boolean>(`/examination/service-groups/${id}`);

export const getServicePackages = () =>
  request.get<ServicePackageDto[]>(`/examination/service-packages`);

export const applyServicePackage = (examinationId: string, packageId: string) =>
  request.post<ServiceOrderFullDto[]>(`/examination/${examinationId}/apply-service-package/${packageId}`);

export const checkDuplicateServices = (examinationId: string, serviceIds: string[]) =>
  request.post<ServiceOrderWarningDto[]>(`/examination/${examinationId}/check-duplicate-services`, serviceIds);

export const validateServiceOrders = (examinationId: string, serviceIds: string[]) =>
  request.post<ServiceOrderWarningDto[]>(`/examination/${examinationId}/validate-service-orders`, serviceIds);

export const getServiceRooms = (serviceId: string) =>
  request.get<RoomDto[]>(`/examination/services/${serviceId}/rooms`);

export const autoSelectOptimalRoom = (serviceId: string) =>
  request.get<string>(`/examination/services/${serviceId}/optimal-room`);

export const calculateOptimalPath = (serviceIds: string[]) =>
  request.post<RoomDto[]>(`/examination/calculate-optimal-path`, serviceIds);

export const getFrequentServices = (limit = 20) =>
  request.get<ServiceDto[]>(`/examination/services/frequent`, { params: { limit } });

export const printServiceOrder = (orderId: string) =>
  request.get(`/examination/service-orders/${orderId}/print`, { responseType: 'blob' });

export const printAllServiceOrders = (examinationId: string) =>
  request.get(`/examination/${examinationId}/service-orders/print-all`, { responseType: 'blob' });

// #endregion

// #region 2.7 Kê đơn thuốc

export const getPrescriptions = (examinationId: string) =>
  request.get<PrescriptionFullDto[]>(`/examination/${examinationId}/prescriptions`);

export const getPrescriptionById = (id: string) =>
  request.get<PrescriptionFullDto>(`/examination/prescriptions/${id}`);

export const createPrescription = (dto: CreatePrescriptionDto) =>
  request.post<PrescriptionFullDto>(`/examination/prescriptions`, dto);

export const updatePrescription = (id: string, dto: CreatePrescriptionDto) =>
  request.put<PrescriptionFullDto>(`/examination/prescriptions/${id}`, dto);

export const deletePrescription = (id: string) =>
  request.delete<boolean>(`/examination/prescriptions/${id}`);

export const searchMedicines = (keyword: string, warehouseId?: string, limit = 20) =>
  request.get<MedicineDto[]>(`/examination/medicines/search`, { params: { keyword, warehouseId, limit } });

export const getMedicineWithStock = (medicineId: string, warehouseId?: string) =>
  request.get<MedicineDto>(`/examination/medicines/${medicineId}`, { params: { warehouseId } });

export const getMedicinesByGroup = (groupId: string) =>
  request.get<MedicineDto[]>(`/examination/medicines/group/${groupId}`);

export const checkDrugInteractions = (medicineIds: string[]) =>
  request.post<DrugInteractionDto[]>(`/examination/check-drug-interactions`, medicineIds);

export const checkDrugAllergies = (patientId: string, medicineIds: string[]) =>
  request.post<PrescriptionWarningDto[]>(`/examination/patient/${patientId}/check-drug-allergies`, medicineIds);

export const checkContraindications = (patientId: string, medicineIds: string[]) =>
  request.post<PrescriptionWarningDto[]>(`/examination/patient/${patientId}/check-contraindications`, medicineIds);

export const checkDuplicateMedicines = (patientId: string, medicineIds: string[], date?: string) =>
  request.post<PrescriptionWarningDto[]>(`/examination/patient/${patientId}/check-duplicate-medicines`, medicineIds, { params: { date } });

export const validateBhytPrescription = (examinationId: string, dto: CreatePrescriptionDto) =>
  request.post<PrescriptionWarningDto[]>(`/examination/${examinationId}/validate-bhyt-prescription`, dto);

export const getPrescriptionTemplates = (departmentId?: string) =>
  request.get<PrescriptionTemplateDto[]>(`/examination/templates/prescription`, { params: { departmentId } });

export const createPrescriptionTemplate = (dto: PrescriptionTemplateDto) =>
  request.post<PrescriptionTemplateDto>(`/examination/templates/prescription`, dto);

export const updatePrescriptionTemplate = (id: string, dto: PrescriptionTemplateDto) =>
  request.put<PrescriptionTemplateDto>(`/examination/templates/prescription/${id}`, dto);

export const deletePrescriptionTemplate = (id: string) =>
  request.delete<boolean>(`/examination/templates/prescription/${id}`);

export const applyPrescriptionTemplate = (examinationId: string, templateId: string) =>
  request.post<PrescriptionFullDto>(`/examination/${examinationId}/apply-prescription-template/${templateId}`);

export const saveAsPrescriptionTemplate = (prescriptionId: string, templateName: string) =>
  request.post<PrescriptionTemplateDto>(`/examination/prescriptions/${prescriptionId}/save-as-template`, { templateName });

export const getInstructionLibrary = (category?: string) =>
  request.get<InstructionLibraryDto[]>(`/examination/instruction-library`, { params: { category } });

export const addInstruction = (dto: InstructionLibraryDto) =>
  request.post<InstructionLibraryDto>(`/examination/instruction-library`, dto);

export const deleteInstruction = (id: string) =>
  request.delete<boolean>(`/examination/instruction-library/${id}`);

export const getFrequentMedicines = (limit = 20) =>
  request.get<MedicineDto[]>(`/examination/medicines/frequent`, { params: { limit } });

export const printPrescription = (prescriptionId: string) =>
  request.get(`/examination/prescriptions/${prescriptionId}/print`, { responseType: 'blob' });

export const printExternalPrescription = (prescriptionId: string) =>
  request.get(`/examination/prescriptions/${prescriptionId}/print-external`, { responseType: 'blob' });

export const copyPrescriptionFromHistory = (examinationId: string, sourcePrescriptionId: string) =>
  request.post<PrescriptionFullDto>(`/examination/${examinationId}/copy-prescription/${sourcePrescriptionId}`);

export const getDispensaryWarehouses = () =>
  request.get<WarehouseDto[]>(`/examination/dispensary-warehouses`);

// #endregion

// #region 2.8 Kết luận khám bệnh

export const getConclusion = (examinationId: string) =>
  request.get<ExaminationConclusionDto>(`/examination/${examinationId}/conclusion`);

export const completeExamination = (examinationId: string, dto: CompleteExaminationDto) =>
  request.post<ExaminationConclusionDto>(`/examination/${examinationId}/complete`, dto);

export const updateConclusion = (examinationId: string, dto: CompleteExaminationDto) =>
  request.put<ExaminationConclusionDto>(`/examination/${examinationId}/conclusion`, dto);

export const requestHospitalization = (examinationId: string, dto: HospitalizationRequestDto) =>
  request.post<ExaminationDto>(`/examination/${examinationId}/request-hospitalization`, dto);

export const requestTransfer = (examinationId: string, dto: TransferRequestDto) =>
  request.post<ExaminationDto>(`/examination/${examinationId}/request-transfer`, dto);

export const createAppointment = (examinationId: string, dto: CreateAppointmentDto) =>
  request.post<AppointmentDto>(`/examination/${examinationId}/appointment`, dto);

export interface AppointmentSearchDto {
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  status?: number;
  appointmentType?: number;
  departmentId?: string;
  doctorId?: string;
  page?: number;
  pageSize?: number;
}

export interface AppointmentListDto {
  id: string;
  appointmentCode: string;
  appointmentDate: string;
  appointmentTime?: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  phoneNumber?: string;
  gender?: number;
  dateOfBirth?: string;
  appointmentType: number;
  appointmentTypeName: string;
  reason?: string;
  notes?: string;
  departmentId?: string;
  departmentName?: string;
  roomId?: string;
  roomName?: string;
  doctorId?: string;
  doctorName?: string;
  status: number;
  statusName: string;
  isReminderSent: boolean;
  reminderSentAt?: string;
  daysOverdue: number;
  previousDiagnosis?: string;
}

export interface PagedAppointments {
  totalCount: number;
  items: AppointmentListDto[];
}

export const searchAppointments = (search: AppointmentSearchDto) =>
  request.get<PagedAppointments>('/examination/appointments', { params: search });

export const updateAppointmentStatus = (appointmentId: string, status: number) =>
  request.put<AppointmentDto>(`/examination/appointments/${appointmentId}/status`, null, { params: { status } });

export const getOverdueFollowUps = (daysOverdue: number = 7) =>
  request.get<AppointmentListDto[]>('/examination/appointments/overdue', { params: { daysOverdue } });

export const createSickLeave = (examinationId: string, dto: CreateSickLeaveDto) =>
  request.post<SickLeaveDto>(`/examination/${examinationId}/sick-leave`, dto);

export const printSickLeave = (examinationId: string) =>
  request.get(`/examination/${examinationId}/sick-leave/print`, { responseType: 'blob' });

export const lockExamination = (examinationId: string) =>
  request.post<boolean>(`/examination/${examinationId}/lock`);

export const unlockExamination = (examinationId: string, reason: string) =>
  request.post<boolean>(`/examination/${examinationId}/unlock`, { reason });

export const validateExaminationForCompletion = (examinationId: string) =>
  request.get<ExaminationValidationResult>(`/examination/${examinationId}/validate-completion`);

export const cancelExamination = (examinationId: string, reason: string) =>
  request.post<boolean>(`/examination/${examinationId}/cancel`, { reason });

export const revertCompletion = (examinationId: string, reason: string) =>
  request.post<ExaminationDto>(`/examination/${examinationId}/revert-completion`, { reason });

// #endregion

// #region 2.9 Quản lý và báo cáo

export const searchExaminations = (dto: ExaminationSearchDto) =>
  request.post<PagedResult<ExaminationDto>>(`/examination/search`, dto);

export const getExaminationStatistics = (fromDate: string, toDate: string, departmentId?: string, roomId?: string) =>
  request.get<ExaminationStatisticsDto>(`/examination/statistics`, { params: { fromDate, toDate, departmentId, roomId } });

export const getExaminationRegister = (fromDate: string, toDate: string, roomId?: string) =>
  request.get<ExaminationRegisterDto[]>(`/examination/register`, { params: { fromDate, toDate, roomId } });

export const exportExaminationRegisterToExcel = (fromDate: string, toDate: string, roomId?: string) =>
  request.get(`/examination/register/export-excel`, { params: { fromDate, toDate, roomId }, responseType: 'blob' });

export const exportExaminationStatistics = (fromDate: string, toDate: string, format = 'excel') =>
  request.get(`/examination/statistics/export`, { params: { fromDate, toDate, format }, responseType: 'blob' });

export const getDoctorStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  request.get<DoctorExaminationStatDto[]>(`/examination/statistics/by-doctor`, { params: { fromDate, toDate, departmentId } });

export const getDiagnosisStatistics = (fromDate: string, toDate: string) =>
  request.get<Record<string, number>>(`/examination/statistics/by-diagnosis`, { params: { fromDate, toDate } });

export const getCommunicableDiseaseReport = (fromDate: string, toDate: string) =>
  request.get<CommunicableDiseaseReportDto[]>(`/examination/reports/communicable-diseases`, { params: { fromDate, toDate } });

export const printExaminationForm = (examinationId: string) =>
  request.get(`/examination/${examinationId}/print`, { responseType: 'blob' });

export const printOutpatientMedicalRecord = (examinationId: string) =>
  request.get(`/examination/${examinationId}/print-medical-record`, { responseType: 'blob' });

export const printAppointmentSlip = (appointmentId: string) =>
  request.get(`/examination/appointments/${appointmentId}/print`, { responseType: 'blob' });

export const printAdmissionForm = (examinationId: string) =>
  request.get(`/examination/${examinationId}/print-admission`, { responseType: 'blob' });

export const printTransferForm = (examinationId: string) =>
  request.get(`/examination/${examinationId}/print-transfer`, { responseType: 'blob' });

// #endregion

// #region 2.10 Chức năng bổ sung

export const getPatientInfo = (patientCode?: string, idNumber?: string) =>
  request.get<PatientInfoDto>(`/examination/patient/lookup`, { params: { patientCode, idNumber } });

export const getActiveExaminationRooms = (departmentId?: string) =>
  request.get<RoomDto[]>(`/examination/rooms/active`, { params: { departmentId } });

export const getOnDutyDoctors = (departmentId?: string) =>
  request.get<DoctorDto[]>(`/examination/doctors/on-duty`, { params: { departmentId } });

export const getRoomExaminationConfig = (roomId: string) =>
  request.get<RoomExaminationConfigDto>(`/examination/rooms/${roomId}/config`);

export const updateRoomExaminationConfig = (roomId: string, config: RoomExaminationConfigDto) =>
  request.put<RoomExaminationConfigDto>(`/examination/rooms/${roomId}/config`, config);

export const signExamination = (examinationId: string, signature: string) =>
  request.post<boolean>(`/examination/${examinationId}/sign`, { signature });

export const verifyExaminationSignature = (examinationId: string) =>
  request.get<SignatureVerificationResult>(`/examination/${examinationId}/verify-signature`);

export const sendResultNotification = (examinationId: string, channel: string) =>
  request.post<boolean>(`/examination/${examinationId}/send-result`, { channel });

export const getExaminationLogs = (examinationId: string) =>
  request.get<ExaminationActivityLogDto[]>(`/examination/${examinationId}/activity-logs`);

// #endregion

// Legacy exports for backward compatibility
export {
  getWaitingRoomDisplay as getQueue,
  searchIcdCodes as searchICDCodes,
  searchServices as searchServicesLegacy
};

// Export as object for convenience
export const examinationApi = {
  // 2.1 Màn hình chờ
  getWaitingRoomDisplay,
  getDepartmentWaitingRoomDisplays,
  updateWaitingRoomDisplayConfig,
  callNextPatient,
  recallPatient,
  skipPatient,
  // 2.2 Danh sách bệnh nhân
  getRoomPatientList,
  searchRoomPatients,
  filterPatientsByCondition,
  getPatientLabResults,
  getPendingLabStatus,
  getPatientPhoto,
  updatePatientPhoto,
  // 2.3 Khám bệnh
  getMedicalRecordFull,
  startExamination,
  updateVitalSigns,
  getVitalSigns,
  calculateBmi,
  classifyBloodPressure,
  updateMedicalInterview,
  getMedicalInterview,
  updatePhysicalExamination,
  getPhysicalExamination,
  getExaminationTemplates,
  createExaminationTemplate,
  updateExaminationTemplate,
  deleteExaminationTemplate,
  applyExaminationTemplate,
  saveAsExaminationTemplate,
  getPatientAllergies,
  addPatientAllergy,
  updatePatientAllergy,
  deletePatientAllergy,
  getPatientContraindications,
  addPatientContraindication,
  updatePatientContraindication,
  deletePatientContraindication,
  getPatientMedicalHistory,
  getMedicalHistoryDetail,
  getHistoryImagingImages,
  createTreatmentSheet,
  updateTreatmentSheet,
  getTreatmentSheets,
  createConsultationRecord,
  updateConsultationRecord,
  getConsultationRecords,
  createNursingCareSheet,
  updateNursingCareSheet,
  getNursingCareSheets,
  updateInjuryInfo,
  getInjuryInfo,
  // 2.4 Chẩn đoán
  getDiagnoses,
  addDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
  updateDiagnosisList,
  setPrimaryDiagnosis,
  searchIcdCodes,
  getIcdByCode,
  getFrequentIcdCodes,
  suggestIcdCodes,
  getRecentIcdCodes,
  searchExternalCauseCodes,
  // 2.5 Khám thêm
  createAdditionalExamination,
  transferRoom,
  transferPrimaryExamination,
  getAdditionalExaminations,
  cancelAdditionalExamination,
  completeAdditionalExamination,
  // 2.6 Chỉ định dịch vụ
  getServiceOrders,
  createServiceOrders,
  updateServiceOrder,
  cancelServiceOrder,
  getServices,
  searchServices,
  getServiceGroupTemplates,
  createServiceGroupTemplate,
  updateServiceGroupTemplate,
  deleteServiceGroupTemplate,
  getServicePackages,
  applyServicePackage,
  checkDuplicateServices,
  validateServiceOrders,
  getServiceRooms,
  autoSelectOptimalRoom,
  calculateOptimalPath,
  getFrequentServices,
  printServiceOrder,
  printAllServiceOrders,
  // 2.7 Kê đơn thuốc
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
  searchMedicines,
  getMedicineWithStock,
  getMedicinesByGroup,
  checkDrugInteractions,
  checkDrugAllergies,
  checkContraindications,
  checkDuplicateMedicines,
  validateBhytPrescription,
  getPrescriptionTemplates,
  createPrescriptionTemplate,
  updatePrescriptionTemplate,
  deletePrescriptionTemplate,
  applyPrescriptionTemplate,
  saveAsPrescriptionTemplate,
  getInstructionLibrary,
  addInstruction,
  deleteInstruction,
  getFrequentMedicines,
  printPrescription,
  printExternalPrescription,
  copyPrescriptionFromHistory,
  getDispensaryWarehouses,
  // 2.8 Kết luận
  getConclusion,
  completeExamination,
  updateConclusion,
  requestHospitalization,
  requestTransfer,
  createAppointment,
  createSickLeave,
  printSickLeave,
  lockExamination,
  unlockExamination,
  validateExaminationForCompletion,
  cancelExamination,
  revertCompletion,
  // 2.9 Quản lý báo cáo
  searchExaminations,
  getExaminationStatistics,
  getExaminationRegister,
  exportExaminationRegisterToExcel,
  exportExaminationStatistics,
  getDoctorStatistics,
  getDiagnosisStatistics,
  getCommunicableDiseaseReport,
  printExaminationForm,
  printOutpatientMedicalRecord,
  printAppointmentSlip,
  printAdmissionForm,
  printTransferForm,
  // 2.10 Chức năng bổ sung
  getPatientInfo,
  getActiveExaminationRooms,
  getOnDutyDoctors,
  getRoomExaminationConfig,
  updateRoomExaminationConfig,
  signExamination,
  verifyExaminationSignature,
  sendResultNotification,
  getExaminationLogs,
};
