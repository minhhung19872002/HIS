import api from './client';

// ========================
// PHÂN HỆ 1: TIẾP ĐÓN - API CLIENT
// Bao gồm tất cả 105+ chức năng theo yêu cầu
// ========================

// #region Types

export interface RoomOverviewDto {
  roomId: string;
  roomCode: string;
  roomName: string;
  departmentId: string;
  departmentName: string;
  totalPatientsToday: number;
  waitingCount: number;
  inProgressCount: number;
  waitingResultCount: number;
  completedCount: number;
  doingLabCount: number;
  maxPatientsPerDay: number;
  maxInsurancePatientsPerDay: number;
  insurancePatientsToday: number;
  currentDoctorId?: string;
  currentDoctorName?: string;
  doctorSchedule?: string;
  roomStatus: number;
  roomStatusColor: string;
}

export interface DoctorScheduleDto {
  doctorId: string;
  doctorCode: string;
  doctorName: string;
  specialty?: string;
  roomId: string;
  roomName: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
  currentPatients: number;
  isAvailable: boolean;
}

export interface QueueTicketDto {
  id: string;
  ticketCode: string;
  queueNumber: number;
  queueDate: string;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  roomId: string;
  roomName: string;
  queueType: number;
  queueTypeName: string;
  priority: number;
  priorityName: string;
  status: number;
  statusName: string;
  calledCount: number;
  calledAt?: string;
  servedAt?: string;
  completedAt?: string;
  estimatedWaitMinutes: number;
  counter?: string;
  calledBy?: string;
}

export interface QueueDisplayDto {
  roomId: string;
  roomName: string;
  doctorName?: string;
  currentServing?: QueueTicketDto;
  callingList: QueueTicketDto[];
  waitingList: QueueTicketDto[];
  totalWaiting: number;
  averageWaitMinutes: number;
}

export interface InsuranceVerificationResultDto {
  isValid: boolean;
  insuranceNumber: string;
  patientName?: string;
  dateOfBirth?: string;
  gender?: number;
  address?: string;
  insuranceCode?: string;
  startDate?: string;
  endDate?: string;
  isExpired: boolean;
  isNewCard: boolean;
  newInsuranceNumber?: string;
  facilityCode?: string;
  facilityName?: string;
  rightRoute: number;
  rightRouteName: string;
  paymentRate: number;
  warnings: string[];
  errorMessage?: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
}

export interface AdmissionDto {
  id: string;
  medicalRecordCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender: number;
  genderName: string;
  dateOfBirth?: string;
  yearOfBirth?: number;
  age: number;
  phoneNumber?: string;
  address?: string;
  identityNumber?: string;
  patientType: number;
  patientTypeName: string;
  insuranceNumber?: string;
  insuranceExpireDate?: string;
  isInsuranceValid: boolean;
  insuranceFacilityCode?: string;
  insuranceFacilityName?: string;
  insuranceRightRoute: number;
  insuranceRightRouteName: string;
  departmentId?: string;
  departmentName?: string;
  roomId?: string;
  roomName?: string;
  doctorId?: string;
  doctorName?: string;
  queueNumber: number;
  queueCode?: string;
  priority: number;
  priorityName: string;
  status: number;
  statusName: string;
  admissionDate: string;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
  chiefComplaint?: string;
  notes?: string;
  treatmentType: number;
  treatmentTypeName: string;
  isEmergency: boolean;
  isPriority: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface DocumentHoldDto {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  medicalRecordId?: string;
  medicalRecordCode?: string;
  documentType: number;
  documentTypeName: string;
  documentNumber: string;
  documentDescription?: string;
  quantity: number;
  status: number;
  statusName: string;
  holdDate: string;
  holdBy: string;
  holdNotes?: string;
  returnDate?: string;
  returnBy?: string;
  returnNotes?: string;
  returnToPersonName?: string;
  returnToPersonPhone?: string;
  returnToPersonRelation?: string;
  holdDurationDays: number;
  createdAt: string;
  createdBy?: string;
}

export interface PatientPhotoDto {
  id: string;
  patientId: string;
  medicalRecordId?: string;
  photoType: number;
  photoTypeName: string;
  fileName: string;
  filePath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  capturedAt: string;
  capturedBy?: string;
  deviceInfo?: string;
  notes?: string;
}

export interface PatientVisitHistoryDto {
  medicalRecordId: string;
  medicalRecordCode: string;
  visitDate: string;
  departmentName?: string;
  roomName?: string;
  doctorName?: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  treatmentResult?: string;
  patientType: number;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  services: VisitServiceDto[];
}

export interface VisitServiceDto {
  serviceCode: string;
  serviceName: string;
  result?: string;
  amount: number;
}

export interface HealthCheckContractDto {
  id: string;
  contractNumber: string;
  contractName: string;
  companyName: string;
  companyAddress?: string;
  companyTaxCode?: string;
  contactPerson?: string;
  contactPhone?: string;
  startDate: string;
  endDate: string;
  totalPatients: number;
  completedPatients: number;
  totalAmount: number;
  discountPercent: number;
  finalAmount: number;
  packages: HealthCheckPackageDto[];
  status: number;
}

export interface HealthCheckPackageDto {
  id: string;
  packageCode: string;
  packageName: string;
  forGender?: number;
  minAge?: number;
  maxAge?: number;
  price: number;
  services: HealthCheckServiceDto[];
}

export interface HealthCheckServiceDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  roomId?: string;
  roomName?: string;
}

export interface ReceptionWarningDto {
  warningType: number;
  warningTypeName: string;
  message: string;
  amount?: number;
  date?: string;
  isBlocking: boolean;
}

export interface ServiceOrderResultDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  roomId?: string;
  roomName?: string;
  queueNumber?: number;
  status: number;
}

export interface OptimalPathResultDto {
  totalEstimatedMinutes: number;
  steps: PathStepDto[];
}

export interface PathStepDto {
  order: number;
  roomId: string;
  roomName: string;
  building?: string;
  floor?: string;
  services: string[];
  estimatedWaitMinutes: number;
  estimatedServiceMinutes: number;
}

export interface PatientBillingInfoDto {
  medicalRecordId: string;
  patientName: string;
  patientType: number;
  totalServiceAmount: number;
  insuranceCoverage: number;
  patientResponsibility: number;
  depositAmount: number;
  paidAmount: number;
  remainingAmount: number;
  pendingItems: BillingItemDto[];
}

export interface BillingItemDto {
  id: string;
  serviceName: string;
  amount: number;
  insuranceAmount: number;
  patientAmount: number;
  isPaid: boolean;
}

export interface QueueRoomStatisticsDto {
  roomId: string;
  roomName: string;
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  totalSkipped: number;
  currentNumber?: number;
  averageWaitMinutes: number;
}

export interface QueueDailyStatisticsDto {
  date: string;
  totalTickets: number;
  servedTickets: number;
  skippedTickets: number;
  averageWaitingTime: number;
  averageServiceTime: number;
  peakHour: number;
  peakHourCount: number;
  byRoom: Record<string, number>;
  byPatientType: Record<string, number>;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// #endregion

// #region 1.1 Điều phối bệnh nhân vào các phòng khám

export const getRoomOverview = (departmentId?: string, date?: string) =>
  api.get<RoomOverviewDto[]>('/reception/rooms/overview', {
    params: { departmentId, date }
  });

export const getRoomDetail = (roomId: string, date?: string) =>
  api.get<RoomOverviewDto>(`/reception/rooms/${roomId}/detail`, {
    params: { date }
  });

export const getWorkingDoctors = (departmentId?: string, date?: string) =>
  api.get<DoctorScheduleDto[]>('/reception/doctors/working', {
    params: { departmentId, date }
  });

export const getDoctorSchedule = (roomId: string, date?: string) =>
  api.get<DoctorScheduleDto[]>(`/reception/rooms/${roomId}/doctors/schedule`, {
    params: { date }
  });

export const getAvailableRooms = (departmentId: string, patientType: number, date?: string) =>
  api.get<RoomOverviewDto[]>('/reception/rooms/available', {
    params: { departmentId, patientType, date }
  });

// #endregion

// #region 1.2 Hệ thống xếp hàng

export interface IssueQueueTicketDto {
  patientId?: string;
  patientName?: string;
  roomId: string;
  queueType: number;
  priority: number;
  source?: string;
}

export const issueQueueTicket = (dto: IssueQueueTicketDto) =>
  api.post<QueueTicketDto>('/reception/queue/issue', dto);

export const issueQueueTicketMobile = (dto: { patientPhone: string; patientName?: string; insuranceNumber?: string; roomId: string; queueType: number }) =>
  api.post<QueueTicketDto>('/reception/queue/issue-mobile', dto);

export const callNextQueue = (roomId: string, queueType: number) =>
  api.post<QueueTicketDto>('/reception/queue/call-next', { roomId, queueType });

export const callSpecificQueue = (ticketId: string) =>
  api.post<QueueTicketDto>(`/reception/queue/${ticketId}/call`);

export const recallQueue = (ticketId: string) =>
  api.post<QueueTicketDto>(`/reception/queue/${ticketId}/recall`);

export const skipQueue = (ticketId: string, reason?: string) =>
  api.post<QueueTicketDto>(`/reception/queue/${ticketId}/skip`, { reason });

export const startServing = (ticketId: string) =>
  api.post<QueueTicketDto>(`/reception/queue/${ticketId}/start-serving`);

export const completeServing = (ticketId: string) =>
  api.post<QueueTicketDto>(`/reception/queue/${ticketId}/complete`);

export const getWaitingList = (roomId: string, queueType: number, date?: string) =>
  api.get<QueueTicketDto[]>(`/reception/queue/waiting/${roomId}`, {
    params: { queueType, date }
  });

export const getQueueDisplay = (roomId: string, queueType: number) =>
  api.get<QueueDisplayDto>(`/reception/queue/display/${roomId}`, {
    params: { queueType }
  });

export const getCallingTickets = (roomId: string, limit = 5) =>
  api.get<QueueTicketDto[]>(`/reception/queue/calling/${roomId}`, {
    params: { limit }
  });

// #endregion

// #region 1.3 Kết nối BHYT

export interface InsuranceVerificationRequest {
  insuranceNumber: string;
  patientName?: string;
  dateOfBirth?: string;
}

export const verifyInsurance = (dto: InsuranceVerificationRequest) =>
  api.post<InsuranceVerificationResultDto>('/reception/insurance/verify', dto);

export const verifyInsuranceByQR = (qrData: string) =>
  api.post<InsuranceVerificationResultDto>('/reception/insurance/verify-qr', { qrData });

export const getBlockedInsuranceList = (keyword?: string, page = 1, pageSize = 50) =>
  api.get<PagedResult<any>>('/reception/insurance/blocked', {
    params: { keyword, page, pageSize }
  });

export const blockInsurance = (insuranceNumber: string, reason: number, notes?: string) =>
  api.post('/reception/insurance/block', { insuranceNumber, reason, notes });

export const unblockInsurance = (id: string) =>
  api.post(`/reception/insurance/${id}/unblock`);

// #endregion

// #region 1.4 Cấp thẻ BHYT tạm

export const checkTemporaryInsuranceEligibility = (dateOfBirth: string) =>
  api.get<{ isEligible: boolean; message: string }>('/reception/insurance/temporary/check-eligibility', {
    params: { dateOfBirth }
  });

export interface CreateTemporaryInsuranceDto {
  patientName: string;
  dateOfBirth: string;
  gender: number;
  birthCertificateNumber?: string;
  guardian: {
    fullName: string;
    identityNumber?: string;
    phoneNumber?: string;
    address?: string;
    relationship: string;
    insuranceNumber?: string;
  };
  address?: string;
}

export const createTemporaryInsurance = (dto: CreateTemporaryInsuranceDto) =>
  api.post('/reception/insurance/temporary', dto);

// #endregion

// #region 1.5 Chụp ảnh

export interface UploadPhotoDto {
  patientId: string;
  medicalRecordId?: string;
  photoType: number;
  base64Data: string;
  fileName?: string;
  notes?: string;
}

export const uploadPhoto = (dto: UploadPhotoDto) =>
  api.post<PatientPhotoDto>('/reception/photos', dto);

export const getPatientPhotos = (patientId: string, medicalRecordId?: string) =>
  api.get<PatientPhotoDto[]>(`/reception/photos/patient/${patientId}`, {
    params: { medicalRecordId }
  });

export const deletePhoto = (photoId: string) =>
  api.delete(`/reception/photos/${photoId}`);

// #endregion

// #region 1.6 Quản lý giấy tờ

export interface CreateDocumentHoldDto {
  patientId: string;
  medicalRecordId?: string;
  documentType: number;
  documentNumber: string;
  documentDescription?: string;
  quantity?: number;
  holdNotes?: string;
}

export const createDocumentHold = (dto: CreateDocumentHoldDto) =>
  api.post<DocumentHoldDto>('/reception/documents/hold', dto);

export interface ReturnDocumentDto {
  documentHoldId: string;
  returnNotes?: string;
  returnToPersonName?: string;
  returnToPersonPhone?: string;
  returnToPersonRelation?: string;
}

export const returnDocument = (dto: ReturnDocumentDto) =>
  api.post<DocumentHoldDto>('/reception/documents/return', dto);

export interface DocumentHoldSearchDto {
  keyword?: string;
  patientId?: string;
  documentType?: number;
  status?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export const searchDocumentHolds = (dto: DocumentHoldSearchDto) =>
  api.post<PagedResult<DocumentHoldDto>>('/reception/documents/search', dto);

export const getDocumentHoldReceipt = (documentHoldId: string) =>
  api.get(`/reception/documents/${documentHoldId}/receipt`);

// #endregion

// #region 1.7 Đăng ký khám BHYT

export interface InsuranceRegistrationDto {
  patientId?: string;
  patientCode?: string;
  identityNumber?: string;
  appointmentCode?: string;
  insuranceNumber: string;
  useQRCode?: boolean;
  qrCodeData?: string;
  roomId: string;
  doctorId?: string;
  isPriority?: boolean;
  priorityReason?: number;
  useSmartCard?: boolean;
  smartCardData?: string;
}

export const registerInsurancePatient = (dto: InsuranceRegistrationDto) =>
  api.post<AdmissionDto>('/reception/register/insurance', dto);

export const quickRegisterByPatientCode = (patientCode: string, roomId: string) =>
  api.post<AdmissionDto>('/reception/register/quick/patient-code', { patientCode, roomId });

export const quickRegisterByAppointment = (appointmentCode: string) =>
  api.post<AdmissionDto>('/reception/register/quick/appointment', { appointmentCode });

export const quickRegisterByIdentity = (identityNumber: string, roomId: string) =>
  api.post<AdmissionDto>('/reception/register/quick/identity', { identityNumber, roomId });

export const registerByTreatmentCode = (treatmentCode: string, roomId: string) =>
  api.post<AdmissionDto>('/reception/register/quick/treatment-code', { patientCode: treatmentCode, roomId });

export const registerBySmartCard = (cardData: string, roomId: string) =>
  api.post<AdmissionDto>('/reception/register/smart-card', { cardData, roomId });

// #endregion

// #region 1.8 Đăng ký viện phí/dịch vụ

export interface FeeRegistrationDto {
  patientId?: string;
  newPatient?: {
    fullName: string;
    gender: number;
    dateOfBirth?: string;
    yearOfBirth?: number;
    phoneNumber?: string;
    address?: string;
    identityNumber?: string;
  };
  patientCode?: string;
  identityNumber?: string;
  phoneNumber?: string;
  smartCardData?: string;
  serviceType: number;
  hasInsuranceButPayFee?: boolean;
  roomId: string;
  doctorId?: string;
  selectSpecificDoctor?: boolean;
  isPriority?: boolean;
}

export const registerFeePatient = (dto: FeeRegistrationDto) =>
  api.post<AdmissionDto>('/reception/register/fee', dto);

export const quickRegisterByPhone = (phoneNumber: string, roomId: string, serviceType: number) =>
  api.post<AdmissionDto>('/reception/register/quick/phone', { phoneNumber, roomId, serviceType });

// #endregion

// #region 1.9 Khám sức khỏe

export const createHealthCheckContract = (dto: HealthCheckContractDto) =>
  api.post<HealthCheckContractDto>('/reception/health-check/contracts', dto);

export const getHealthCheckContracts = (keyword?: string, status?: number, page = 1, pageSize = 50) =>
  api.get<PagedResult<HealthCheckContractDto>>('/reception/health-check/contracts', {
    params: { keyword, status, page, pageSize }
  });

export const importHealthCheckPatients = (contractId: string, patients: any[]) =>
  api.post<{ success: number; failed: number; errors: string[] }>(
    `/reception/health-check/contracts/${contractId}/import`,
    patients
  );

export interface HealthCheckRegistrationDto {
  contractId?: string;
  patientId?: string;
  newPatient?: any;
  packageId: string;
  hasLifeInsurance?: boolean;
  lifeInsuranceNumber?: string;
}

export const registerHealthCheckPatient = (dto: HealthCheckRegistrationDto) =>
  api.post<AdmissionDto>('/reception/register/health-check', dto);

export const getHealthCheckPackages = (forGender?: number, age?: number) =>
  api.get<HealthCheckPackageDto[]>('/reception/health-check/packages', {
    params: { forGender, age }
  });

// #endregion

// #region 1.10 Cấp cứu

export interface EmergencyRegistrationDto {
  patientId?: string;
  patientName?: string;
  gender?: number;
  estimatedAge?: number;
  identityNumber?: string;
  phoneNumber?: string;
  patientType: number;
  insuranceNumber?: string;
  painStartTime?: string;
  chiefComplaint?: string;
  severity: number;
  transportMethod?: string;
  allowDebt?: boolean;
  depositAmount?: number;
}

export const registerEmergencyPatient = (dto: EmergencyRegistrationDto) =>
  api.post<AdmissionDto>('/reception/register/emergency', dto);

export const updateEmergencyPatientInfo = (medicalRecordId: string, dto: any) =>
  api.put<AdmissionDto>(`/reception/emergency/${medicalRecordId}/patient-info`, dto);

export const mergePatients = (sourcePatientId: string, targetPatientId: string, reason: string) =>
  api.post('/reception/patients/merge', { sourcePatientId, targetPatientId, reason });

export const createEmergencyDeposit = (medicalRecordId: string, amount: number) =>
  api.post(`/reception/emergency/${medicalRecordId}/deposit`, { amount });

// #endregion

// #region 1.11 Quản lý tiếp đón khác

export const getReceptionWarnings = (patientId: string) =>
  api.get<ReceptionWarningDto[]>(`/reception/warnings/patient/${patientId}`);

export const changeRoom = (medicalRecordId: string, newRoomId: string, newDoctorId?: string, reason?: string) =>
  api.post<AdmissionDto>(`/reception/admissions/${medicalRecordId}/change-room`, {
    newRoomId,
    newDoctorId,
    reason
  });

export const updateAdmission = (id: string, dto: any) =>
  api.put<AdmissionDto>(`/reception/admissions/${id}`, dto);

export const getOtherPayers = () =>
  api.get('/reception/payers');

export const saveGuardianInfo = (patientId: string, guardian: any) =>
  api.post(`/reception/patients/${patientId}/guardian`, guardian);

// #endregion

// #region 1.12 Lịch sử khám

export const getPatientVisitHistory = (patientId: string, maxRecords = 5) =>
  api.get<PatientVisitHistoryDto[]>(`/reception/patients/${patientId}/visit-history`, {
    params: { maxRecords }
  });

export const getVisitDetail = (medicalRecordId: string) =>
  api.get<PatientVisitHistoryDto>(`/reception/visit-history/${medicalRecordId}`);

export const getHistoryDisplayConfig = () =>
  api.get('/reception/settings/history-display');

// #endregion

// #region 1.13 Chỉ định dịch vụ

export interface ServiceOrderItemDto {
  serviceId: string;
  serviceCode?: string;
  serviceName?: string;
  quantity?: number;
  roomId?: string;
  paymentType: number;
  notes?: string;
}

export interface ReceptionServiceOrderDto {
  medicalRecordId: string;
  services: ServiceOrderItemDto[];
  autoSelectRoom?: boolean;
  calculateOptimalPath?: boolean;
}

export const orderServicesAtReception = (medicalRecordId: string, dto: Omit<ReceptionServiceOrderDto, 'medicalRecordId'>) =>
  api.post<ServiceOrderResultDto[]>(`/reception/admissions/${medicalRecordId}/services`, dto);

export const orderServicesByGroup = (medicalRecordId: string, groupId: string) =>
  api.post<ServiceOrderResultDto[]>(`/reception/admissions/${medicalRecordId}/services/by-group/${groupId}`);

export const getServiceGroups = () =>
  api.get('/reception/service-groups');

export const calculateOptimalPath = (medicalRecordId: string) =>
  api.get<OptimalPathResultDto>(`/reception/admissions/${medicalRecordId}/optimal-path`);

// #endregion

// #region 1.14 In phiếu

export const printExaminationSlip = (medicalRecordId: string) =>
  api.get(`/reception/print/examination-slip/${medicalRecordId}`, {
    responseType: 'blob'
  });

export const printInsuranceCardHoldSlip = (documentHoldId: string) =>
  api.get(`/reception/print/insurance-hold-slip/${documentHoldId}`, {
    responseType: 'blob'
  });

export const printPatientCard = (patientId: string) =>
  api.get(`/reception/print/patient-card/${patientId}`, {
    responseType: 'blob'
  });

export const printServiceOrderSlip = (medicalRecordId: string) =>
  api.get(`/reception/print/service-order-slip/${medicalRecordId}`, {
    responseType: 'blob'
  });

export const getExaminationSlipData = (medicalRecordId: string) =>
  api.get(`/reception/print/examination-slip/${medicalRecordId}/data`);

// #endregion

// #region 1.16 Thu tiền

export interface ReceptionDepositDto {
  medicalRecordId: string;
  amount: number;
  paymentMethod: number;
  transactionReference?: string;
  notes?: string;
}

export const createDeposit = (dto: ReceptionDepositDto) =>
  api.post('/reception/billing/deposit', dto);

export interface ReceptionPaymentDto {
  medicalRecordId: string;
  serviceIds: string[];
  totalAmount: number;
  paidAmount: number;
  paymentMethod: number;
  transactionReference?: string;
}

export const createPayment = (dto: ReceptionPaymentDto) =>
  api.post('/reception/billing/payment', dto);

export const getPatientBillingInfo = (medicalRecordId: string) =>
  api.get<PatientBillingInfoDto>(`/reception/billing/${medicalRecordId}`);

// #endregion

// #region 1.17 Thẻ thông minh

export const readSmartCard = (cardData: string) =>
  api.post('/reception/smart-card/read', { cardData });

export const checkBHXHConnection = () =>
  api.get<{ isConnected: boolean }>('/reception/bhxh/check-connection');

// #endregion

// #region Thống kê

export const getRoomQueueStatistics = (roomId: string, date?: string) =>
  api.get<QueueRoomStatisticsDto>(`/reception/statistics/room/${roomId}`, {
    params: { date }
  });

export const getDailyStatistics = (date: string, departmentId?: string) =>
  api.get<QueueDailyStatisticsDto>('/reception/statistics/daily', {
    params: { date, departmentId }
  });

export const getAverageWaitingTime = (fromDate: string, toDate: string, roomId?: string) =>
  api.get('/reception/statistics/waiting-time', {
    params: { fromDate, toDate, roomId }
  });

export interface QueueReportRequestDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  roomId?: string;
  queueType?: number;
  exportFormat: 'Excel' | 'PDF';
}

export const exportQueueReport = (dto: QueueReportRequestDto) =>
  api.post('/reception/reports/export', dto, {
    responseType: 'blob'
  });

export const getQueueConfiguration = (roomId: string, queueType: number) =>
  api.get(`/reception/queue/config/${roomId}`, {
    params: { queueType }
  });

export const saveQueueConfiguration = (dto: any) =>
  api.post('/reception/queue/config', dto);

// #endregion
