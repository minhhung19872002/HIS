/**
 * RIS/PACS (Radiology Information System) API Client
 * Module 8: Chẩn đoán hình ảnh, Thăm dò chức năng - 28+ chức năng
 */

import apiClient from './client';

// #region Interfaces

// Waiting List interfaces
export interface RadiologyWaitingListDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  visitId: string;
  visitCode: string;
  orderId: string;
  orderCode: string;
  orderTime: string;
  orderDoctorName: string;
  departmentName: string;
  serviceName: string;
  serviceTypeName: string;
  roomName: string;
  queueNumber: number;
  status: string;
  patientType: string;
  priority: string;
  calledTime?: string;
  startTime?: string;
}

export interface CallPatientDto {
  orderId: string;
  roomId: string;
  message?: string;
  useSpeaker: boolean;
}

export interface CallPatientResultDto {
  success: boolean;
  message: string;
  calledTime: string;
}

export interface WaitingDisplayConfigDto {
  id: string;
  roomId: string;
  roomName: string;
  displayMode: string;
  refreshIntervalSeconds: number;
  showPatientName: boolean;
  showAge: boolean;
  showServiceName: boolean;
  enableSound: boolean;
  soundFile?: string;
  announcementTemplate?: string;
  isActive: boolean;
}

// Modality & PACS interfaces
export interface ModalityDto {
  id: string;
  code: string;
  name: string;
  modalityType: string;
  manufacturer?: string;
  model?: string;
  aeTitle: string;
  ipAddress?: string;
  port?: number;
  roomId: string;
  roomName: string;
  connectionStatus: string;
  lastCommunication?: string;
  supportsWorklist: boolean;
  supportsMPPS: boolean;
  isActive: boolean;
}

export interface CreateModalityDto {
  code: string;
  name: string;
  modalityType: string;
  manufacturer?: string;
  model?: string;
  aeTitle: string;
  ipAddress?: string;
  port?: number;
  roomId: string;
  supportsWorklist: boolean;
  supportsMPPS: boolean;
  isActive: boolean;
}

export interface UpdateModalityDto extends CreateModalityDto {
  id: string;
}

export interface PACSConnectionDto {
  id: string;
  name: string;
  serverType: string;
  aeTitle: string;
  ipAddress: string;
  port: number;
  queryRetrievePort: number;
  protocol: string;
  isConnected: boolean;
  lastSync?: string;
  isActive: boolean;
}

export interface CreatePACSConnectionDto {
  name: string;
  serverType: string;
  aeTitle: string;
  ipAddress: string;
  port: number;
  queryRetrievePort: number;
  protocol: string;
  isActive: boolean;
}

export interface UpdatePACSConnectionDto extends CreatePACSConnectionDto {
  id: string;
}

export interface PACSConnectionStatusDto {
  connectionId: string;
  isConnected: boolean;
  pingTimeMs: number;
  errorMessage?: string;
  checkTime: string;
}

export interface DicomStudyDto {
  studyInstanceUID: string;
  accessionNumber: string;
  patientId: string;
  patientName: string;
  studyDate: string;
  studyTime?: string;
  modality: string;
  studyDescription?: string;
  institutionName?: string;
  referringPhysician?: string;
  numberOfSeries: number;
  numberOfImages: number;
  studyStatus: string;
}

export interface DicomSeriesDto {
  seriesInstanceUID: string;
  studyInstanceUID: string;
  seriesNumber: number;
  modality: string;
  seriesDescription?: string;
  bodyPartExamined?: string;
  numberOfImages: number;
  seriesDate?: string;
}

export interface DicomImageDto {
  sopInstanceUID: string;
  seriesInstanceUID: string;
  instanceNumber: number;
  imageType?: string;
  rows: number;
  columns: number;
  photometricInterpretation?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  wadoUrl?: string;
}

export interface SendModalityWorklistDto {
  modalityId: string;
  orderIds: string[];
}

export interface SendWorklistResultDto {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}

export interface DeviceConnectionConfigDto {
  deviceId: string;
  connectionType: string;
  connectionString?: string;
  ipAddress?: string;
  port?: number;
  comPort?: string;
  baudRate?: number;
  protocol?: string;
  folderPath?: string;
}

// Order interfaces
export interface RadiologyOrderDto {
  id: string;
  orderCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  visitId: string;
  orderDate: string;
  orderDoctorName: string;
  departmentName: string;
  diagnosis?: string;
  clinicalInfo?: string;
  items: RadiologyOrderItemDto[];
  status: string;
  patientType: string;
}

export interface RadiologyOrderItemDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceType: string;
  quantity: number;
  price: number;
  insurancePrice: number;
  status: string;
  startTime?: string;
  endTime?: string;
  technicianName?: string;
  doctorName?: string;
  hasResult: boolean;
  hasImages: boolean;
}

// Result Template interfaces
export interface RadiologyResultTemplateDto {
  id: string;
  code: string;
  name: string;
  serviceTypeId?: string;
  serviceTypeName?: string;
  serviceId?: string;
  serviceName?: string;
  gender?: string;
  descriptionTemplate?: string;
  conclusionTemplate?: string;
  noteTemplate?: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  createdBy?: string;
}

export interface SaveResultTemplateDto {
  id?: string;
  code: string;
  name: string;
  serviceTypeId?: string;
  serviceId?: string;
  gender?: string;
  descriptionTemplate?: string;
  conclusionTemplate?: string;
  noteTemplate?: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

// Result interfaces
export interface RadiologyResultDto {
  id: string;
  orderItemId: string;
  orderCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  serviceCode: string;
  serviceName: string;
  serviceType: string;
  resultDate: string;
  description?: string;
  conclusion?: string;
  note?: string;
  technicianName?: string;
  doctorName?: string;
  approvalStatus: string;
  approvedTime?: string;
  approvedBy?: string;
  images: AttachedImageDto[];
  dicomStudyUID?: string;
}

export interface EnterRadiologyResultDto {
  orderItemId: string;
  templateId?: string;
  description?: string;
  conclusion?: string;
  note?: string;
  attachedImages?: AttachedImageDto[];
  technicianNote?: string;
}

export interface UpdateRadiologyResultDto {
  description?: string;
  conclusion?: string;
  note?: string;
  technicianNote?: string;
}

export interface AttachedImageDto {
  id?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath?: string;
  thumbnailPath?: string;
  base64Data?: string;
  description?: string;
  sortOrder: number;
  dicomStudyUID?: string;
  dicomSeriesUID?: string;
  dicomInstanceUID?: string;
}

export interface AttachImageDto {
  orderItemId: string;
  fileName: string;
  fileType: string;
  base64Data: string;
  description?: string;
  sortOrder: number;
  dicomStudyUID?: string;
  dicomSeriesUID?: string;
  dicomInstanceUID?: string;
}

export interface ChangeResultTemplateDto {
  orderItemId: string;
  newTemplateId: string;
  keepExistingContent: boolean;
}

export interface ApproveRadiologyResultDto {
  resultId: string;
  note?: string;
  isFinalApproval: boolean;
}

export interface SendResultDto {
  resultId: string;
  departmentId: string;
  sendMethod: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

export interface SendResultResponseDto {
  success: boolean;
  message: string;
  sentTime: string;
  receivedBy?: string;
}

// Prescription interfaces
export interface RadiologyPrescriptionDto {
  id: string;
  orderItemId: string;
  orderCode: string;
  patientId: string;
  patientName: string;
  serviceName: string;
  prescriptionDate: string;
  items: RadiologyPrescriptionItemDto[];
  doctorName?: string;
  status: string;
  totalAmount: number;
}

export interface RadiologyPrescriptionItemDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  unit: string;
  quantity: number;
  price: number;
  insurancePrice: number;
  amount: number;
  lotNumber?: string;
  expiryDate?: string;
  warehouseName?: string;
  note?: string;
}

export interface CreateRadiologyPrescriptionDto {
  orderItemId: string;
  warehouseId: string;
  items: CreateRadiologyPrescriptionItemDto[];
}

export interface CreateRadiologyPrescriptionItemDto {
  itemId: string;
  quantity: number;
  note?: string;
}

export interface UpdateRadiologyPrescriptionDto {
  items: CreateRadiologyPrescriptionItemDto[];
}

export interface RadiologyServiceNormDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  items: RadiologyNormItemDto[];
}

export interface RadiologyNormItemDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
  isRequired: boolean;
}

export interface UpdateNormItemDto {
  id?: string;
  itemId: string;
  quantity: number;
  unit: string;
  isRequired: boolean;
}

export interface ItemSearchResultDto {
  id: string;
  code: string;
  name: string;
  itemType: string;
  unit: string;
  price: number;
  insurancePrice: number;
  stockQuantity: number;
  lotNumber?: string;
  expiryDate?: string;
}

export interface ItemStockDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  totalStock: number;
  availableStock: number;
  byLot: ItemStockByLotDto[];
}

export interface ItemStockByLotDto {
  lotNumber: string;
  expiryDate?: string;
  quantity: number;
}

// Report interfaces
export interface RadiologyRevenueReportDto {
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  totalExams: number;
  byServiceType: RevenueByServiceTypeDto[];
  byDay: RevenueByDayDto[];
  byDoctor: RevenueByDoctorDto[];
}

export interface RevenueByServiceTypeDto {
  serviceType: string;
  serviceTypeName: string;
  examCount: number;
  revenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
}

export interface RevenueByDayDto {
  date: string;
  examCount: number;
  revenue: number;
}

export interface RevenueByDoctorDto {
  doctorId: string;
  doctorName: string;
  examCount: number;
  revenue: number;
}

export interface UltrasoundRegisterDto {
  fromDate: string;
  toDate: string;
  totalExams: number;
  items: UltrasoundRegisterItemDto[];
}

export interface UltrasoundRegisterItemDto {
  rowNumber: number;
  examDate: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  address?: string;
  examType: string;
  diagnosis?: string;
  conclusion?: string;
  doctorName?: string;
  note?: string;
}

export interface RadiologyRegisterDto {
  fromDate: string;
  toDate: string;
  serviceType?: string;
  totalExams: number;
  items: RadiologyRegisterItemDto[];
}

export interface RadiologyRegisterItemDto {
  rowNumber: number;
  examDate: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  address?: string;
  serviceName: string;
  bodyPart?: string;
  technique?: string;
  description?: string;
  conclusion?: string;
  technicianName?: string;
  doctorName?: string;
}

export interface FunctionalTestRegisterDto {
  fromDate: string;
  toDate: string;
  totalExams: number;
  items: FunctionalTestRegisterItemDto[];
}

export interface FunctionalTestRegisterItemDto {
  rowNumber: number;
  examDate: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  testType: string;
  description?: string;
  conclusion?: string;
  technicianName?: string;
  doctorName?: string;
}

export interface RadiologyStatisticsDto {
  fromDate: string;
  toDate: string;
  totalOrders: number;
  totalExams: number;
  completedExams: number;
  pendingExams: number;
  averageTATMinutes: number;
  byServiceType: StatisticsByServiceTypeDto[];
  byDay: StatisticsByDayDto[];
  byModality: StatisticsByModalityDto[];
}

export interface StatisticsByServiceTypeDto {
  serviceType: string;
  serviceTypeName: string;
  examCount: number;
  completedCount: number;
  percentage: number;
}

export interface StatisticsByDayDto {
  date: string;
  examCount: number;
  completedCount: number;
}

export interface StatisticsByModalityDto {
  modalityId: string;
  modalityName: string;
  modalityType: string;
  examCount: number;
  utilizationPercent: number;
}

export interface ConsumptionNormReportDto {
  fromDate: string;
  toDate: string;
  byService: ConsumptionByServiceDto[];
}

export interface ConsumptionByServiceDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  examCount: number;
  items: ConsumptionItemDto[];
}

export interface ConsumptionItemDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  normQuantity: number;
  actualQuantity: number;
  variance: number;
  unit: string;
}

export interface SyncResultToDoHDto {
  resultId: string;
  syncStatus: string;
  syncTime?: string;
  errorMessage?: string;
  doHTransactionId?: string;
}

// DICOM Viewer interfaces
export interface ViewerUrlDto {
  studyInstanceUID: string;
  viewerUrl: string;
  wadoRsUrl?: string;
  dicomWebUrl?: string;
}

export interface DicomViewerConfigDto {
  viewerUrl: string;
  viewerType: string;
  enableAnnotation: boolean;
  enableMeasurement: boolean;
  enableMPR: boolean;
  enable3D: boolean;
  defaultLayout?: string;
  defaultWindowLevel?: string;
}

export interface ImageAnnotationDto {
  id: string;
  studyInstanceUID: string;
  seriesInstanceUID?: string;
  sopInstanceUID: string;
  annotationType: string;
  annotationData: string;
  createdBy?: string;
  createdTime: string;
}

export interface KeyImageDto {
  id: string;
  studyInstanceUID: string;
  sopInstanceUID: string;
  description?: string;
  thumbnailUrl?: string;
  markedBy?: string;
  markedTime: string;
}

export interface MarkKeyImageDto {
  studyInstanceUID: string;
  sopInstanceUID: string;
  description?: string;
}

export interface ImageEditDto {
  imageId: string;
  editType: string;
  parameters: string;
}

// Print Label interfaces
export interface PrintLabelRequestDto {
  orderItemId: string;
  labelConfigId?: string;
  copies?: number;
  printerId?: string;
}

export interface LabelDataDto {
  orderItemId: string;
  patientCode: string;
  patientName: string;
  dob?: string;
  gender?: string;
  serviceName: string;
  serviceCode: string;
  orderCode: string;
  orderDate: string;
  roomName?: string;
  queueNumber?: number;
  barcode: string;
  qrcode: string;
  labelContent: string;
}

export interface RadiologyLabelConfigDto {
  id: string;
  code: string;
  name: string;
  serviceTypeId?: string;
  serviceTypeName?: string;
  labelTemplate: string;
  width: number;
  height: number;
  includeBarcode: boolean;
  includeQRCode: boolean;
  isDefault: boolean;
  isActive: boolean;
}

// Diagnosis Template interfaces
export interface DiagnosisTemplateDto {
  id: string;
  code: string;
  name: string;
  serviceTypeId?: string;
  serviceTypeName?: string;
  modalityType?: string;
  bodyPart?: string;
  findings: string;
  conclusion: string;
  recommendation?: string;
  sortOrder: number;
  isPublic: boolean;
  isActive: boolean;
  createdById?: string;
  createdByName?: string;
}

export interface SaveDiagnosisTemplateDto {
  id?: string;
  code: string;
  name: string;
  serviceTypeId?: string;
  modalityType?: string;
  bodyPart?: string;
  findings: string;
  conclusion: string;
  recommendation?: string;
  sortOrder?: number;
  isPublic?: boolean;
  isActive?: boolean;
}

// Abbreviation interfaces
export interface AbbreviationDto {
  id: string;
  abbreviation: string;
  expansion: string;
  category?: string;
  language?: string;
  isPublic: boolean;
  isActive: boolean;
  createdById?: string;
  createdByName?: string;
}

export interface SaveAbbreviationDto {
  id?: string;
  abbreviation: string;
  expansion: string;
  category?: string;
  language?: string;
  isPublic?: boolean;
  isActive?: boolean;
}

export interface ExpandAbbreviationRequestDto {
  text: string;
  language?: string;
  category?: string;
}

export interface ExpandAbbreviationResultDto {
  originalText: string;
  expandedText: string;
  expansionsApplied: number;
}

// QR Code interfaces
export interface GenerateQRCodeRequestDto {
  dataType: string;  // PatientInfo, OrderInfo, ResultLink
  referenceId: string;
  size?: number;
  format?: string;
}

export interface QRCodeResultDto {
  dataType: string;
  referenceId: string;
  qrCodeImage: string;
  qrData: string;
  expiresAt?: string;
}

export interface ScanQRCodeResultDto {
  dataType: string;
  referenceId: string;
  isValid: boolean;
  data?: Record<string, unknown>;
  errorMessage?: string;
}

export interface ShareResultQRDto {
  resultId: string;
  shareUrl: string;
  qrCodeImage: string;
  validUntil: string;
}

// Duty Schedule interfaces
export interface DutyScheduleDto {
  id: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  roomName?: string;
  userId: string;
  userName: string;
  role: string;
  note?: string;
  status: string;
}

export interface SaveDutyScheduleDto {
  id?: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  userId: string;
  role: string;
  note?: string;
}

export interface BatchCreateDutyScheduleDto {
  fromDate: string;
  toDate: string;
  schedules: DutyScheduleTemplateDto[];
}

export interface DutyScheduleTemplateDto {
  dayOfWeek: number;
  shiftType: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  userId: string;
  role: string;
}

// Room Assignment interfaces
export interface AssignRoomRequestDto {
  orderItemId: string;
  roomId: string;
  priority?: number;
  note?: string;
}

export interface RoomAssignmentDto {
  id: string;
  orderItemId: string;
  orderCode: string;
  patientName: string;
  serviceName: string;
  roomId: string;
  roomName: string;
  queueNumber: number;
  priority: number;
  assignedTime: string;
  calledTime?: string;
  startTime?: string;
  endTime?: string;
  status: string;
  note?: string;
}

export interface RoomQueueDto {
  roomId: string;
  roomName: string;
  currentNumber?: number;
  nextNumber?: number;
  waitingCount: number;
  inProgressCount: number;
  queue: RoomAssignmentDto[];
}

export interface RoomStatisticsDto {
  roomId: string;
  roomName: string;
  date: string;
  totalPatients: number;
  completedPatients: number;
  averageWaitTimeMinutes: number;
  averageExamTimeMinutes: number;
  utilizationPercent: number;
}

// Tag interfaces
export interface RadiologyTagDto {
  id: string;
  code: string;
  name: string;
  color: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface SaveRadiologyTagDto {
  id?: string;
  code: string;
  name: string;
  color: string;
  description?: string;
  isActive?: boolean;
}

export interface AssignTagRequestDto {
  requestId: string;
  tagIds: string[];
}

export interface TaggedRequestDto {
  requestId: string;
  orderCode: string;
  patientName: string;
  serviceName: string;
  requestDate: string;
  status: string;
  tags: RadiologyTagDto[];
}

// Integration Log interfaces
export interface IntegrationLogDto {
  id: string;
  logTime: string;
  direction: string;
  messageType: string;
  sourceSystem: string;
  targetSystem: string;
  patientId?: string;
  patientName?: string;
  orderCode?: string;
  messageContent?: string;
  status: string;
  errorMessage?: string;
  responseTime?: number;
}

export interface SearchIntegrationLogDto {
  fromDate: string;
  toDate: string;
  direction?: string;
  messageType?: string;
  status?: string;
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface IntegrationLogSearchResultDto {
  items: IntegrationLogDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export interface IntegrationLogStatisticsDto {
  fromDate: string;
  toDate: string;
  totalMessages: number;
  successCount: number;
  failedCount: number;
  averageResponseTimeMs: number;
  byMessageType: MessageTypeStatDto[];
  byDay: DailyLogStatDto[];
}

export interface MessageTypeStatDto {
  messageType: string;
  count: number;
  successCount: number;
  failedCount: number;
}

export interface DailyLogStatDto {
  date: string;
  count: number;
  successCount: number;
  failedCount: number;
}

// Digital Signature interfaces
export interface SignResultRequestDto {
  reportId: string;
  signatureType: string;  // USBToken, eKYC, SignServer, SmartCA
  pin?: string;
  otp?: string;
  certificateId?: string;
}

export interface SignResultResponseDto {
  success: boolean;
  message: string;
  signedTime?: string;
  signatureId?: string;
  certificateInfo?: CertificateInfoDto;
}

export interface CertificateInfoDto {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  thumbprint: string;
}

export interface SignatureHistoryDto {
  id: string;
  reportId: string;
  signedTime: string;
  signedById: string;
  signedByName: string;
  signatureType: string;
  certificateSubject?: string;
  certificateIssuer?: string;
  isValid: boolean;
}

export interface RadiologyDigitalSignatureConfigDto {
  id: string;
  signatureType: string;
  name: string;
  serverUrl?: string;
  apiKey?: string;
  certificatePath?: string;
  isDefault: boolean;
  isActive: boolean;
}

// Statistics interfaces
export interface ExamStatisticsByServiceTypeDto {
  fromDate: string;
  toDate: string;
  totalExams: number;
  serviceTypes: ServiceTypeStatDto[];
}

export interface ServiceTypeStatDto {
  serviceTypeId: string;
  serviceTypeName: string;
  examCount: number;
  completedCount: number;
  pendingCount: number;
  averageTATMinutes: number;
  revenue: number;
}

// Room interfaces
export interface RadiologyRoomDto {
  id: string;
  code: string;
  name: string;
  roomType: string;
  departmentId: string;
  departmentName: string;
  capacity: number;
  status: string;
  modalities: ModalityDto[];
  isActive: boolean;
}

export interface SaveRadiologyRoomDto {
  id?: string;
  code: string;
  name: string;
  roomType: string;
  departmentId: string;
  capacity: number;
  isActive: boolean;
}

export interface RadiologyScheduleDto {
  id: string;
  roomId: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  technicianId?: string;
  technicianName?: string;
  doctorId?: string;
  doctorName?: string;
  maxSlots: number;
  bookedSlots: number;
  note?: string;
}

export interface SaveRadiologyScheduleDto {
  id?: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  technicianId?: string;
  doctorId?: string;
  maxSlots: number;
  note?: string;
}

// #endregion

// #region 8.1 Waiting List APIs

export const getWaitingList = (
  date: string,
  roomId?: string,
  serviceType?: string,
  status?: string,
  keyword?: string
) =>
  apiClient.get<RadiologyWaitingListDto[]>('/RISComplete/waiting-list', {
    params: { date, roomId, serviceType, status, keyword }
  });

export const callPatient = (data: CallPatientDto) =>
  apiClient.post<CallPatientResultDto>('/RISComplete/call-patient', data);

export const getDisplayConfig = (roomId: string) =>
  apiClient.get<WaitingDisplayConfigDto>(`/RISComplete/rooms/${roomId}/display-config`);

export const updateDisplayConfig = (roomId: string, config: WaitingDisplayConfigDto) =>
  apiClient.put(`/RISComplete/rooms/${roomId}/display-config`, config);

export const startExam = (orderId: string) =>
  apiClient.post(`/RISComplete/orders/${orderId}/start`);

export const completeExam = (orderId: string) =>
  apiClient.post(`/RISComplete/orders/${orderId}/complete`);

// #endregion

// #region 8.2 PACS & Modality APIs

export const getPACSConnections = () =>
  apiClient.get<PACSConnectionDto[]>('/RISComplete/pacs-connections');

export const createPACSConnection = (data: CreatePACSConnectionDto) =>
  apiClient.post<PACSConnectionDto>('/RISComplete/pacs-connections', data);

export const updatePACSConnection = (id: string, data: UpdatePACSConnectionDto) =>
  apiClient.put<PACSConnectionDto>(`/RISComplete/pacs-connections/${id}`, data);

export const deletePACSConnection = (id: string) =>
  apiClient.delete(`/RISComplete/pacs-connections/${id}`);

export const checkPACSConnection = (connectionId: string) =>
  apiClient.get<PACSConnectionStatusDto>(`/RISComplete/pacs-connections/${connectionId}/status`);

export const getModalities = (keyword?: string, modalityType?: string) =>
  apiClient.get<ModalityDto[]>('/RISComplete/modalities', {
    params: { keyword, modalityType }
  });

export const createModality = (data: CreateModalityDto) =>
  apiClient.post<ModalityDto>('/RISComplete/modalities', data);

export const updateModality = (id: string, data: UpdateModalityDto) =>
  apiClient.put<ModalityDto>(`/RISComplete/modalities/${id}`, data);

export const deleteModality = (id: string) =>
  apiClient.delete(`/RISComplete/modalities/${id}`);

export const sendWorklistToModality = (data: SendModalityWorklistDto) =>
  apiClient.post<SendWorklistResultDto>('/RISComplete/modalities/worklist/send', data);

export const configureDeviceConnection = (deviceId: string, config: DeviceConnectionConfigDto) =>
  apiClient.put(`/RISComplete/devices/${deviceId}/connection`, config);

// #endregion

// #region 8.3 Radiology Order & Result APIs

export const getRadiologyOrders = (
  fromDate: string,
  toDate: string,
  departmentId?: string,
  serviceType?: string,
  status?: string,
  keyword?: string
) =>
  apiClient.get<RadiologyOrderDto[]>('/RISComplete/orders', {
    params: { fromDate, toDate, departmentId, serviceType, status, keyword }
  });

export const getRadiologyOrder = (orderId: string) =>
  apiClient.get<RadiologyOrderDto>(`/RISComplete/orders/${orderId}`);

export const getResultTemplatesByServiceType = (serviceTypeId: string) =>
  apiClient.get<RadiologyResultTemplateDto[]>(`/RISComplete/templates/by-service-type/${serviceTypeId}`);

export const getResultTemplatesByService = (serviceId: string) =>
  apiClient.get<RadiologyResultTemplateDto[]>(`/RISComplete/templates/by-service/${serviceId}`);

export const getResultTemplatesByGender = (gender: string) =>
  apiClient.get<RadiologyResultTemplateDto[]>(`/RISComplete/templates/by-gender/${gender}`);

export const getAllResultTemplates = (keyword?: string) =>
  apiClient.get<RadiologyResultTemplateDto[]>('/RISComplete/templates', {
    params: { keyword }
  });

export const saveResultTemplate = (data: SaveResultTemplateDto) =>
  apiClient.post<RadiologyResultTemplateDto>('/RISComplete/templates', data);

export const deleteResultTemplate = (templateId: string) =>
  apiClient.delete(`/RISComplete/templates/${templateId}`);

export const changeResultTemplate = (data: ChangeResultTemplateDto) =>
  apiClient.post<RadiologyResultDto>('/RISComplete/results/change-template', data);

export const enterRadiologyResult = (data: EnterRadiologyResultDto) =>
  apiClient.post<RadiologyResultDto>('/RISComplete/results/enter', data);

export const getRadiologyResult = (orderItemId: string) =>
  apiClient.get<RadiologyResultDto>(`/RISComplete/order-items/${orderItemId}/result`);

export const updateRadiologyResult = (resultId: string, data: UpdateRadiologyResultDto) =>
  apiClient.put<RadiologyResultDto>(`/RISComplete/results/${resultId}`, data);

export const attachImage = (data: AttachImageDto) =>
  apiClient.post<AttachedImageDto>('/RISComplete/results/attach-image', data);

export const removeAttachedImage = (imageId: string) =>
  apiClient.delete(`/RISComplete/results/images/${imageId}`);

export const getStudiesFromPACS = (patientId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<DicomStudyDto[]>('/RISComplete/pacs/studies', {
    params: { patientId, fromDate, toDate }
  });

export const getSeries = (studyInstanceUID: string) =>
  apiClient.get<DicomSeriesDto[]>(`/RISComplete/pacs/studies/${studyInstanceUID}/series`);

export const getImages = (seriesInstanceUID: string) =>
  apiClient.get<DicomImageDto[]>(`/RISComplete/pacs/series/${seriesInstanceUID}/images`);

export const linkStudyToOrder = (orderItemId: string, studyInstanceUID: string) =>
  apiClient.post(`/RISComplete/order-items/${orderItemId}/link-study`, { studyInstanceUID });

export const preliminaryApproveResult = (resultId: string, note?: string) =>
  apiClient.post(`/RISComplete/results/${resultId}/preliminary-approve`, { note });

export const finalApproveResult = (resultId: string, data: ApproveRadiologyResultDto) =>
  apiClient.post(`/RISComplete/results/${resultId}/final-approve`, data);

export const cancelApproval = (resultId: string, reason: string) =>
  apiClient.post(`/RISComplete/results/${resultId}/cancel-approval`, { reason });

export const printRadiologyResult = (resultId: string, format: string = 'A4', includeImages: boolean = true) =>
  apiClient.get(`/RISComplete/results/${resultId}/print`, {
    params: { format, includeImages },
    responseType: 'blob'
  });

export const printRadiologyResultsBatch = (resultIds: string[], format: string = 'A4') =>
  apiClient.post('/RISComplete/results/print-batch', resultIds, {
    params: { format },
    responseType: 'blob'
  });

export const sendResultToDepartment = (data: SendResultDto) =>
  apiClient.post<SendResultResponseDto>('/RISComplete/results/send', data);

export const getPatientRadiologyHistory = (patientId: string, serviceType?: string, lastNMonths?: number) =>
  apiClient.get<RadiologyResultDto[]>(`/RISComplete/patients/${patientId}/history`, {
    params: { serviceType, lastNMonths }
  });

// #endregion

// #region 8.4 Prescription APIs

export const getRadiologyPrescriptions = (orderItemId: string) =>
  apiClient.get<RadiologyPrescriptionDto[]>(`/RISComplete/order-items/${orderItemId}/prescriptions`);

export const createRadiologyPrescription = (data: CreateRadiologyPrescriptionDto) =>
  apiClient.post<RadiologyPrescriptionDto>('/RISComplete/prescriptions', data);

export const updateRadiologyPrescription = (prescriptionId: string, data: UpdateRadiologyPrescriptionDto) =>
  apiClient.put<RadiologyPrescriptionDto>(`/RISComplete/prescriptions/${prescriptionId}`, data);

export const deleteRadiologyPrescription = (prescriptionId: string) =>
  apiClient.delete(`/RISComplete/prescriptions/${prescriptionId}`);

export const createPrescriptionFromNorm = (orderItemId: string, warehouseId: string) =>
  apiClient.post<RadiologyPrescriptionDto>(
    `/RISComplete/order-items/${orderItemId}/prescription-from-norm`,
    null,
    { params: { warehouseId } }
  );

export const getServiceNorm = (serviceId: string) =>
  apiClient.get<RadiologyServiceNormDto>(`/RISComplete/services/${serviceId}/norm`);

export const updateServiceNorm = (serviceId: string, items: UpdateNormItemDto[]) =>
  apiClient.put(`/RISComplete/services/${serviceId}/norm`, items);

export const searchItems = (keyword: string, warehouseId: string, itemType?: string) =>
  apiClient.get<ItemSearchResultDto[]>('/RISComplete/items/search', {
    params: { keyword, warehouseId, itemType }
  });

export const checkItemStock = (itemId: string, warehouseId: string) =>
  apiClient.get<ItemStockDto>(`/RISComplete/items/${itemId}/stock`, {
    params: { warehouseId }
  });

// #endregion

// #region 8.5 Reports APIs

export const getRevenueReport = (
  fromDate: string,
  toDate: string,
  departmentId?: string,
  serviceType?: string
) =>
  apiClient.get<RadiologyRevenueReportDto>('/RISComplete/reports/revenue', {
    params: { fromDate, toDate, departmentId, serviceType }
  });

export const getUltrasoundRegister = (fromDate: string, toDate: string) =>
  apiClient.get<UltrasoundRegisterDto>('/RISComplete/reports/ultrasound-register', {
    params: { fromDate, toDate }
  });

export const getRadiologyRegisterByType = (fromDate: string, toDate: string, serviceType: string) =>
  apiClient.get<RadiologyRegisterDto>('/RISComplete/reports/radiology-register/by-type', {
    params: { fromDate, toDate, serviceType }
  });

export const getRadiologyRegister = (fromDate: string, toDate: string) =>
  apiClient.get<RadiologyRegisterDto>('/RISComplete/reports/radiology-register', {
    params: { fromDate, toDate }
  });

export const getFunctionalTestRegister = (fromDate: string, toDate: string) =>
  apiClient.get<FunctionalTestRegisterDto>('/RISComplete/reports/functional-test-register', {
    params: { fromDate, toDate }
  });

export const getConsumptionNormReport = (fromDate: string, toDate: string, serviceId?: string) =>
  apiClient.get<ConsumptionNormReportDto>('/RISComplete/reports/consumption-norm', {
    params: { fromDate, toDate, serviceId }
  });

export const getRevenueByBaseCostReport = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<RadiologyRevenueReportDto>('/RISComplete/reports/revenue-by-base-cost', {
    params: { fromDate, toDate, departmentId }
  });

export const syncResultToDoH = (resultId: string) =>
  apiClient.post<SyncResultToDoHDto>(`/RISComplete/results/${resultId}/sync-doh`);

export const getStatistics = (fromDate: string, toDate: string, serviceType?: string) =>
  apiClient.get<RadiologyStatisticsDto>('/RISComplete/reports/statistics', {
    params: { fromDate, toDate, serviceType }
  });

export const exportReportToExcel = (reportType: string, fromDate: string, toDate: string) =>
  apiClient.get('/RISComplete/reports/export', {
    params: { reportType, fromDate, toDate },
    responseType: 'blob'
  });

// #endregion

// #region DICOM Viewer APIs

export const getViewerUrl = (studyInstanceUID: string) =>
  apiClient.get<ViewerUrlDto>('/RISComplete/viewer/url', {
    params: { studyInstanceUID }
  });

export const getViewerConfig = () =>
  apiClient.get<DicomViewerConfigDto>('/RISComplete/viewer/config');

export const saveAnnotation = (annotation: ImageAnnotationDto) =>
  apiClient.post<ImageAnnotationDto>('/RISComplete/annotations', annotation);

export const getAnnotations = (sopInstanceUID: string) =>
  apiClient.get<ImageAnnotationDto[]>('/RISComplete/annotations', {
    params: { sopInstanceUID }
  });

export const markKeyImage = (data: MarkKeyImageDto) =>
  apiClient.post<KeyImageDto>('/RISComplete/key-images', data);

export const getKeyImages = (studyInstanceUID: string) =>
  apiClient.get<KeyImageDto[]>('/RISComplete/key-images', {
    params: { studyInstanceUID }
  });

export const editImage = (data: ImageEditDto) =>
  apiClient.post('/RISComplete/images/edit', data, {
    responseType: 'blob'
  });

// #endregion

// #region Room & Schedule APIs

export const getRooms = (keyword?: string, roomType?: string) =>
  apiClient.get<RadiologyRoomDto[]>('/RISComplete/rooms', {
    params: { keyword, roomType }
  });

export const saveRoom = (data: SaveRadiologyRoomDto) =>
  apiClient.post<RadiologyRoomDto>('/RISComplete/rooms', data);

export const getRoomSchedule = (roomId: string, fromDate: string, toDate: string) =>
  apiClient.get<RadiologyScheduleDto[]>(`/RISComplete/rooms/${roomId}/schedule`, {
    params: { fromDate, toDate }
  });

export const saveSchedule = (data: SaveRadiologyScheduleDto) =>
  apiClient.post<RadiologyScheduleDto>('/RISComplete/rooms/schedule', data);

// #endregion

// #region Print Label APIs

export const printLabel = (data: PrintLabelRequestDto) =>
  apiClient.post<LabelDataDto>('/RISComplete/print-label', data);

export const getLabelConfigs = (serviceTypeId?: string) =>
  apiClient.get<RadiologyLabelConfigDto[]>('/RISComplete/label-configs', {
    params: { serviceTypeId }
  });

// #endregion

// #region Diagnosis Template APIs

export const getDiagnosisTemplates = (
  keyword?: string,
  serviceTypeId?: string,
  modalityType?: string,
  includePrivate?: boolean
) =>
  apiClient.get<DiagnosisTemplateDto[]>('/RISComplete/diagnosis-templates', {
    params: { keyword, serviceTypeId, modalityType, includePrivate }
  });

export const saveDiagnosisTemplate = (data: SaveDiagnosisTemplateDto) =>
  apiClient.post<DiagnosisTemplateDto>('/RISComplete/diagnosis-templates', data);

export const deleteDiagnosisTemplate = (templateId: string) =>
  apiClient.delete(`/RISComplete/diagnosis-templates/${templateId}`);

// #endregion

// #region Abbreviation APIs

export const getAbbreviations = (
  keyword?: string,
  category?: string,
  includePrivate?: boolean
) =>
  apiClient.get<AbbreviationDto[]>('/RISComplete/abbreviations', {
    params: { keyword, category, includePrivate }
  });

export const saveAbbreviation = (data: SaveAbbreviationDto) =>
  apiClient.post<AbbreviationDto>('/RISComplete/abbreviations', data);

export const deleteAbbreviation = (abbreviationId: string) =>
  apiClient.delete(`/RISComplete/abbreviations/${abbreviationId}`);

export const expandAbbreviations = (data: ExpandAbbreviationRequestDto) =>
  apiClient.post<ExpandAbbreviationResultDto>('/RISComplete/abbreviations/expand', data);

// #endregion

// #region QR Code APIs

export const generateQRCode = (data: GenerateQRCodeRequestDto) =>
  apiClient.post<QRCodeResultDto>('/RISComplete/qrcode/generate', data);

export const scanQRCode = (qrData: string) =>
  apiClient.post<ScanQRCodeResultDto>('/RISComplete/qrcode/scan', { qrData });

export const createShareResultQR = (resultId: string, validityHours?: number) =>
  apiClient.post<ShareResultQRDto>(`/RISComplete/results/${resultId}/share-qr`, null, {
    params: { validityHours }
  });

// #endregion

// #region Duty Schedule APIs

export const getDutySchedules = (
  fromDate: string,
  toDate: string,
  roomId?: string,
  userId?: string
) =>
  apiClient.get<DutyScheduleDto[]>('/RISComplete/duty-schedules', {
    params: { fromDate, toDate, roomId, userId }
  });

export const saveDutySchedule = (data: SaveDutyScheduleDto) =>
  apiClient.post<DutyScheduleDto>('/RISComplete/duty-schedules', data);

export const deleteDutySchedule = (scheduleId: string) =>
  apiClient.delete(`/RISComplete/duty-schedules/${scheduleId}`);

export const batchCreateDutySchedules = (data: BatchCreateDutyScheduleDto) =>
  apiClient.post<DutyScheduleDto[]>('/RISComplete/duty-schedules/batch', data);

// #endregion

// #region Room Assignment APIs

export const assignRoom = (data: AssignRoomRequestDto) =>
  apiClient.post<RoomAssignmentDto>('/RISComplete/room-assignments', data);

export const getRoomQueue = (roomId: string) =>
  apiClient.get<RoomQueueDto>(`/RISComplete/rooms/${roomId}/queue`);

export const callNextPatient = (roomId: string) =>
  apiClient.post<RoomAssignmentDto>(`/RISComplete/rooms/${roomId}/call-next`);

export const getRoomStatistics = (date: string) =>
  apiClient.get<RoomStatisticsDto[]>('/RISComplete/rooms/statistics', {
    params: { date }
  });

// #endregion

// #region Tag APIs

export const getTags = (keyword?: string, includeInactive?: boolean) =>
  apiClient.get<RadiologyTagDto[]>('/RISComplete/tags', {
    params: { keyword, includeInactive }
  });

export const saveTag = (data: SaveRadiologyTagDto) =>
  apiClient.post<RadiologyTagDto>('/RISComplete/tags', data);

export const deleteTag = (tagId: string) =>
  apiClient.delete(`/RISComplete/tags/${tagId}`);

export const assignTagsToRequest = (data: AssignTagRequestDto) =>
  apiClient.post<boolean>('/RISComplete/requests/tags', data);

export const getRequestsByTag = (
  tagId: string,
  fromDate?: string,
  toDate?: string
) =>
  apiClient.get<TaggedRequestDto[]>(`/RISComplete/tags/${tagId}/requests`, {
    params: { fromDate, toDate }
  });

// #endregion

// #region Integration Log APIs

export const searchIntegrationLogs = (data: SearchIntegrationLogDto) =>
  apiClient.post<IntegrationLogSearchResultDto>('/RISComplete/integration-logs/search', data);

export const getIntegrationLogStatistics = (fromDate: string, toDate: string) =>
  apiClient.get<IntegrationLogStatisticsDto>('/RISComplete/integration-logs/statistics', {
    params: { fromDate, toDate }
  });

export const getIntegrationLogDetail = (logId: string) =>
  apiClient.get<IntegrationLogDto>(`/RISComplete/integration-logs/${logId}`);

export const retryIntegrationMessage = (logId: string) =>
  apiClient.post(`/RISComplete/integration-logs/${logId}/retry`);

// #endregion

// #region Digital Signature APIs

export const signResult = (data: SignResultRequestDto) =>
  apiClient.post<SignResultResponseDto>('/RISComplete/results/sign', data);

export const getSignatureHistory = (reportId: string) =>
  apiClient.get<SignatureHistoryDto[]>(`/RISComplete/reports/${reportId}/signature-history`);

export const verifySignature = (reportId: string) =>
  apiClient.get<SignResultResponseDto>(`/RISComplete/reports/${reportId}/verify-signature`);

export const getSignatureConfigs = () =>
  apiClient.get<RadiologyDigitalSignatureConfigDto[]>('/RISComplete/signature-configs');

// #endregion

// #region Statistics APIs

export const getExamStatisticsByServiceType = (fromDate: string, toDate: string) =>
  apiClient.get<ExamStatisticsByServiceTypeDto>('/RISComplete/statistics/by-service-type', {
    params: { fromDate, toDate }
  });

// #endregion

// #region IV. Capture Device Interfaces

export interface CaptureDeviceDto {
  id: string;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  deviceTypeName: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  modalityId?: string;
  modalityName?: string;
  roomId?: string;
  roomName?: string;
  status: string;
  lastCommunication?: string;
  isActive: boolean;
}

export interface SaveCaptureDeviceDto {
  id?: string;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  modalityId?: string;
  roomId?: string;
  isActive: boolean;
}

export interface CaptureDeviceStatusDto {
  deviceId: string;
  isConnected: boolean;
  lastCommunication?: string;
  status: string;
  message?: string;
}

export interface WorkstationDto {
  id: string;
  workstationCode: string;
  workstationName: string;
  computerName: string;
  ipAddress?: string;
  roomId?: string;
  roomName?: string;
  capturePort?: number;
  isActive: boolean;
}

export interface SaveWorkstationDto {
  id?: string;
  workstationCode: string;
  workstationName: string;
  computerName: string;
  ipAddress?: string;
  roomId?: string;
  capturePort?: number;
  isActive: boolean;
}

export interface CaptureSessionDto {
  id: string;
  sessionCode: string;
  radiologyRequestId: string;
  captureDeviceId?: string;
  workstationId?: string;
  startTime: string;
  endTime?: string;
  status: string;
  mediaCount?: number;
}

export interface CreateCaptureSessionDto {
  radiologyRequestId: string;
  captureDeviceId?: string;
  workstationId?: string;
}

export interface CapturedMediaDto {
  id: string;
  captureSessionId: string;
  mediaType: string;
  filePath: string;
  fileSize: number;
  thumbnailPath?: string;
  description?: string;
  capturedAt: string;
}

export interface SaveCapturedMediaDto {
  captureSessionId: string;
  mediaType: string;
  filePath: string;
  fileSize: number;
  thumbnailPath?: string;
  description?: string;
}

export interface SendToPacsRequestDto {
  captureSessionId: string;
  mediaIds: string[];
  studyInstanceUID?: string;
  seriesDescription?: string;
}

export interface SendToPacsResultDto {
  success: boolean;
  sentCount: number;
  failedCount: number;
  studyInstanceUID?: string;
  sentAt: string;
  errors?: string[];
}

// #endregion

// #region V. Consultation Interfaces

export interface ConsultationSessionDto {
  id: string;
  sessionCode: string;
  title: string;
  description?: string;
  scheduledTime: string;
  startTime?: string;
  endTime?: string;
  status: number;
  statusName: string;
  meetingUrl?: string;
  createdByUserName: string;
  caseCount: number;
  cases?: ConsultationCaseDto[];
  participants?: ConsultationParticipantDto[];
}

export interface SaveConsultationSessionDto {
  id?: string;
  title: string;
  description?: string;
  scheduledTime: string;
  meetingUrl?: string;
  status?: number;
}

export interface SearchConsultationDto {
  fromDate?: string;
  toDate?: string;
  status?: number;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface ConsultationSearchResultDto {
  items: ConsultationSessionDto[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface ConsultationCaseDto {
  id: string;
  radiologyRequestId: string;
  patientName?: string;
  patientCode?: string;
  serviceName?: string;
  reason?: string;
  status: number;
}

export interface AddConsultationCaseDto {
  consultationSessionId: string;
  radiologyRequestId: string;
  reason?: string;
}

export interface ConsultationParticipantDto {
  id: string;
  userId: string;
  userName?: string;
  role: string;
  invitedAt?: string;
  joinedAt?: string;
  leftAt?: string;
}

export interface InviteParticipantDto {
  consultationSessionId: string;
  userId: string;
  role?: string;
}

export interface ConsultationDiscussionDto {
  id: string;
  consultationCaseId: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: string;
}

export interface AddConsultationDiscussionDto {
  consultationCaseId: string;
  content: string;
}

export interface ConsultationImageNoteDto {
  id: string;
  studyInstanceUID: string;
  sopInstanceUID?: string;
  annotationType: string;
  annotationData: string;
  note?: string;
  createdByUserName?: string;
  createdAt: string;
}

export interface AddConsultationImageNoteDto {
  consultationCaseId: string;
  studyInstanceUID: string;
  sopInstanceUID?: string;
  annotationType: string;
  annotationData: string;
  note?: string;
}

export interface ConsultationMinutesDto {
  id: string;
  consultationSessionId: string;
  content?: string;
  conclusion?: string;
  recommendations?: string;
  isApproved?: boolean;
  approvedAt?: string;
}

export interface SaveConsultationMinutesDto {
  consultationSessionId: string;
  content?: string;
  conclusion?: string;
  recommendations?: string;
}

export interface ConsultationAttachmentDto {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
}

export interface AddConsultationAttachmentDto {
  consultationCaseId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
}

// #endregion

// #region X. HL7 CDA Interfaces

export interface HL7CDAConfigDto {
  id: string;
  name: string;
  version: string;
  messageType: string;
  receivingApplication?: string;
  receivingFacility?: string;
  sendingApplication?: string;
  sendingFacility?: string;
  serverUrl?: string;
  port?: number;
  isActive: boolean;
}

export interface SaveHL7CDAConfigDto {
  id?: string;
  name: string;
  version: string;
  messageType: string;
  receivingApplication?: string;
  receivingFacility?: string;
  sendingApplication?: string;
  sendingFacility?: string;
  serverUrl?: string;
  port?: number;
  isActive: boolean;
}

export interface HL7MessageDto {
  id: string;
  messageType: string;
  messageContent: string;
  direction: string;
  status: number;
  sentAt?: string;
  receivedAt?: string;
  acknowledgementCode?: string;
  errorMessage?: string;
}

export interface SendHL7MessageDto {
  hl7ConfigId: string;
  messageType: string;
  messageContent: string;
}

export interface SendHL7ResultDto {
  success: boolean;
  messageId: string;
  sentAt: string;
  acknowledgementCode?: string;
  errorMessage?: string;
}

export interface CDADocumentDto {
  id: string;
  radiologyReportId?: string;
  documentType: string;
  documentContent: string;
  createdAt: string;
}

export interface CreateCDADocumentDto {
  radiologyReportId: string;
  documentType: string;
}

// #endregion

// #region IX. Online Help Interfaces

export interface HelpCategoryDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SaveHelpCategoryDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface HelpArticleDto {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  categoryId?: string;
  categoryName?: string;
  videoUrl?: string;
  attachments?: string;
  tags?: string;
  viewCount: number;
  sortOrder: number;
  isActive: boolean;
}

export interface SaveHelpArticleDto {
  id?: string;
  title: string;
  summary?: string;
  content?: string;
  categoryId?: string;
  videoUrl?: string;
  attachments?: string;
  tags?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SearchHelpDto {
  categoryId?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface HelpSearchResultDto {
  items: HelpArticleDto[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface TroubleshootingDto {
  id: string;
  code: string;
  category: string;
  problem: string;
  solution: string;
  steps?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SaveTroubleshootingDto {
  id?: string;
  code: string;
  category: string;
  problem: string;
  solution: string;
  steps?: string;
  sortOrder: number;
  isActive: boolean;
}

// #endregion

// #region VII. CLS Screen Interfaces

export interface CLSScreenConfigDto {
  id: string;
  showPatientInfo: boolean;
  showPreviousResults: boolean;
  showDicomViewer: boolean;
  showResultEntry: boolean;
  defaultLayout: string;
  dicomViewerUrl?: string;
  customSettings?: string;
  isActive: boolean;
}

export interface SaveCLSScreenConfigDto {
  showPatientInfo: boolean;
  showPreviousResults: boolean;
  showDicomViewer: boolean;
  showResultEntry: boolean;
  defaultLayout: string;
  dicomViewerUrl?: string;
  customSettings?: string;
  isActive: boolean;
}

export interface ServiceDescriptionTemplateDto {
  id: string;
  serviceId: string;
  name: string;
  description?: string;
  conclusion?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface SaveServiceDescriptionTemplateDto {
  id?: string;
  serviceId: string;
  name: string;
  description?: string;
  conclusion?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface DiagnosisHistoryDto {
  id: string;
  requestId: string;
  serviceName: string;
  examDate: string;
  description?: string;
  conclusion?: string;
  doctorName?: string;
}

// #endregion

// #region IV. Capture Device APIs

export const getCaptureDevices = (deviceType?: string, keyword?: string, isActive?: boolean) =>
  apiClient.get<CaptureDeviceDto[]>('/RISComplete/capture-devices', {
    params: { deviceType, keyword, isActive }
  });

export const saveCaptureDevice = (data: SaveCaptureDeviceDto) =>
  apiClient.post<CaptureDeviceDto>('/RISComplete/capture-devices', data);

export const deleteCaptureDevice = (deviceId: string) =>
  apiClient.delete(`/RISComplete/capture-devices/${deviceId}`);

export const testCaptureDeviceConnection = (deviceId: string) =>
  apiClient.get<CaptureDeviceStatusDto>(`/RISComplete/capture-devices/${deviceId}/test`);

export const getWorkstations = (roomId?: string) =>
  apiClient.get<WorkstationDto[]>('/RISComplete/workstations', {
    params: { roomId }
  });

export const saveWorkstation = (data: SaveWorkstationDto) =>
  apiClient.post<WorkstationDto>('/RISComplete/workstations', data);

export const createCaptureSession = (data: CreateCaptureSessionDto) =>
  apiClient.post<CaptureSessionDto>('/RISComplete/capture-sessions', data);

export const endCaptureSession = (sessionId: string) =>
  apiClient.post<CaptureSessionDto>(`/RISComplete/capture-sessions/${sessionId}/end`);

export const saveCapturedMedia = (data: SaveCapturedMediaDto) =>
  apiClient.post<CapturedMediaDto>('/RISComplete/captured-media', data);

export const getCapturedMedia = (sessionId: string) =>
  apiClient.get<CapturedMediaDto[]>(`/RISComplete/capture-sessions/${sessionId}/media`);

export const sendMediaToPacs = (data: SendToPacsRequestDto) =>
  apiClient.post<SendToPacsResultDto>('/RISComplete/captured-media/send-to-pacs', data);

// #endregion

// #region V. Consultation APIs

export const searchConsultations = (data: SearchConsultationDto) =>
  apiClient.post<ConsultationSearchResultDto>('/RISComplete/consultations/search', data);

export const getConsultationSession = (sessionId: string) =>
  apiClient.get<ConsultationSessionDto>(`/RISComplete/consultations/${sessionId}`);

export const saveConsultationSession = (data: SaveConsultationSessionDto) =>
  apiClient.post<ConsultationSessionDto>('/RISComplete/consultations', data);

export const deleteConsultationSession = (sessionId: string) =>
  apiClient.delete(`/RISComplete/consultations/${sessionId}`);

export const startConsultation = (sessionId: string) =>
  apiClient.post<ConsultationSessionDto>(`/RISComplete/consultations/${sessionId}/start`);

export const endConsultation = (sessionId: string) =>
  apiClient.post<ConsultationSessionDto>(`/RISComplete/consultations/${sessionId}/end`);

export const addConsultationCase = (data: AddConsultationCaseDto) =>
  apiClient.post<ConsultationCaseDto>('/RISComplete/consultations/cases', data);

export const removeConsultationCase = (caseId: string) =>
  apiClient.delete(`/RISComplete/consultations/cases/${caseId}`);

export const inviteParticipant = (data: InviteParticipantDto) =>
  apiClient.post<ConsultationParticipantDto>('/RISComplete/consultations/participants', data);

export const removeParticipant = (participantId: string) =>
  apiClient.delete(`/RISComplete/consultations/participants/${participantId}`);

export const joinConsultation = (sessionId: string) =>
  apiClient.post<ConsultationParticipantDto>(`/RISComplete/consultations/${sessionId}/join`);

export const leaveConsultation = (sessionId: string) =>
  apiClient.post(`/RISComplete/consultations/${sessionId}/leave`);

export const addConsultationDiscussion = (data: AddConsultationDiscussionDto) =>
  apiClient.post<ConsultationDiscussionDto>('/RISComplete/consultations/discussions', data);

export const getConsultationDiscussions = (caseId: string) =>
  apiClient.get<ConsultationDiscussionDto[]>(`/RISComplete/consultations/cases/${caseId}/discussions`);

export const addConsultationImageNote = (data: AddConsultationImageNoteDto) =>
  apiClient.post<ConsultationImageNoteDto>('/RISComplete/consultations/image-notes', data);

export const getConsultationImageNotes = (caseId: string) =>
  apiClient.get<ConsultationImageNoteDto[]>(`/RISComplete/consultations/cases/${caseId}/image-notes`);

export const saveConsultationMinutes = (data: SaveConsultationMinutesDto) =>
  apiClient.post<ConsultationMinutesDto>('/RISComplete/consultations/minutes', data);

export const getConsultationMinutes = (sessionId: string) =>
  apiClient.get<ConsultationMinutesDto>(`/RISComplete/consultations/${sessionId}/minutes`);

export const approveConsultationMinutes = (minutesId: string) =>
  apiClient.post<ConsultationMinutesDto>(`/RISComplete/consultations/minutes/${minutesId}/approve`);

export const addConsultationAttachment = (data: AddConsultationAttachmentDto) =>
  apiClient.post<ConsultationAttachmentDto>('/RISComplete/consultations/attachments', data);

export const getConsultationAttachments = (caseId: string) =>
  apiClient.get<ConsultationAttachmentDto[]>(`/RISComplete/consultations/cases/${caseId}/attachments`);

// #endregion

// #region X. HL7 CDA APIs

export const getHL7CDAConfigs = () =>
  apiClient.get<HL7CDAConfigDto[]>('/RISComplete/hl7-cda/configs');

export const saveHL7CDAConfig = (data: SaveHL7CDAConfigDto) =>
  apiClient.post<HL7CDAConfigDto>('/RISComplete/hl7-cda/configs', data);

export const sendHL7Message = (data: SendHL7MessageDto) =>
  apiClient.post<SendHL7ResultDto>('/RISComplete/hl7-cda/send', data);

export const getHL7Messages = (fromDate?: string, toDate?: string, direction?: string, status?: number) =>
  apiClient.get<HL7MessageDto[]>('/RISComplete/hl7-cda/messages', {
    params: { fromDate, toDate, direction, status }
  });

export const createCDADocument = (data: CreateCDADocumentDto) =>
  apiClient.post<CDADocumentDto>('/RISComplete/hl7-cda/documents', data);

export const getCDADocument = (reportId: string) =>
  apiClient.get<CDADocumentDto>(`/RISComplete/hl7-cda/documents/${reportId}`);

export const receiveHL7Order = (hl7Message: string) =>
  apiClient.post<{ orderId: string }>('/RISComplete/hl7-cda/receive-order', { hl7Message });

// #endregion

// #region IX. Online Help APIs

export const getHelpCategories = (parentId?: string) =>
  apiClient.get<HelpCategoryDto[]>('/RISComplete/help/categories', {
    params: { parentId }
  });

export const saveHelpCategory = (data: SaveHelpCategoryDto) =>
  apiClient.post<HelpCategoryDto>('/RISComplete/help/categories', data);

export const searchHelpArticles = (data: SearchHelpDto) =>
  apiClient.post<HelpSearchResultDto>('/RISComplete/help/articles/search', data);

export const getHelpArticle = (articleId: string) =>
  apiClient.get<HelpArticleDto>(`/RISComplete/help/articles/${articleId}`);

export const saveHelpArticle = (data: SaveHelpArticleDto) =>
  apiClient.post<HelpArticleDto>('/RISComplete/help/articles', data);

export const getTroubleshootingList = (category?: string, keyword?: string) =>
  apiClient.get<TroubleshootingDto[]>('/RISComplete/help/troubleshooting', {
    params: { category, keyword }
  });

export const saveTroubleshooting = (data: SaveTroubleshootingDto) =>
  apiClient.post<TroubleshootingDto>('/RISComplete/help/troubleshooting', data);

// #endregion

// #region VII. CLS Screen APIs

export const getCLSScreenConfig = () =>
  apiClient.get<CLSScreenConfigDto>('/RISComplete/cls-screen/config');

export const saveCLSScreenConfig = (data: SaveCLSScreenConfigDto) =>
  apiClient.post<CLSScreenConfigDto>('/RISComplete/cls-screen/config', data);

export const getServiceDescriptionTemplates = (serviceId: string) =>
  apiClient.get<ServiceDescriptionTemplateDto[]>(`/RISComplete/cls-screen/description-templates/${serviceId}`);

export const saveServiceDescriptionTemplate = (data: SaveServiceDescriptionTemplateDto) =>
  apiClient.post<ServiceDescriptionTemplateDto>('/RISComplete/cls-screen/description-templates', data);

export const getDiagnosisHistory = (requestId: string) =>
  apiClient.get<DiagnosisHistoryDto[]>(`/RISComplete/cls-screen/diagnosis-history/${requestId}`);

// #endregion

export default {
  // Waiting List
  getWaitingList,
  callPatient,
  getDisplayConfig,
  updateDisplayConfig,
  startExam,
  completeExam,

  // PACS & Modality
  getPACSConnections,
  createPACSConnection,
  updatePACSConnection,
  deletePACSConnection,
  checkPACSConnection,
  getModalities,
  createModality,
  updateModality,
  deleteModality,
  sendWorklistToModality,
  configureDeviceConnection,

  // Orders & Results
  getRadiologyOrders,
  getRadiologyOrder,
  getResultTemplatesByServiceType,
  getResultTemplatesByService,
  getResultTemplatesByGender,
  getAllResultTemplates,
  saveResultTemplate,
  deleteResultTemplate,
  changeResultTemplate,
  enterRadiologyResult,
  getRadiologyResult,
  updateRadiologyResult,
  attachImage,
  removeAttachedImage,
  getStudiesFromPACS,
  getSeries,
  getImages,
  linkStudyToOrder,
  preliminaryApproveResult,
  finalApproveResult,
  cancelApproval,
  printRadiologyResult,
  printRadiologyResultsBatch,
  sendResultToDepartment,
  getPatientRadiologyHistory,

  // Prescriptions
  getRadiologyPrescriptions,
  createRadiologyPrescription,
  updateRadiologyPrescription,
  deleteRadiologyPrescription,
  createPrescriptionFromNorm,
  getServiceNorm,
  updateServiceNorm,
  searchItems,
  checkItemStock,

  // Reports
  getRevenueReport,
  getUltrasoundRegister,
  getRadiologyRegisterByType,
  getRadiologyRegister,
  getFunctionalTestRegister,
  getConsumptionNormReport,
  getRevenueByBaseCostReport,
  syncResultToDoH,
  getStatistics,
  exportReportToExcel,

  // DICOM Viewer
  getViewerUrl,
  getViewerConfig,
  saveAnnotation,
  getAnnotations,
  markKeyImage,
  getKeyImages,
  editImage,

  // Rooms & Schedule
  getRooms,
  saveRoom,
  getRoomSchedule,
  saveSchedule,

  // Print Label
  printLabel,
  getLabelConfigs,

  // Diagnosis Templates
  getDiagnosisTemplates,
  saveDiagnosisTemplate,
  deleteDiagnosisTemplate,

  // Abbreviations
  getAbbreviations,
  saveAbbreviation,
  deleteAbbreviation,
  expandAbbreviations,

  // QR Code
  generateQRCode,
  scanQRCode,
  createShareResultQR,

  // Duty Schedule
  getDutySchedules,
  saveDutySchedule,
  deleteDutySchedule,
  batchCreateDutySchedules,

  // Room Assignment
  assignRoom,
  getRoomQueue,
  callNextPatient,
  getRoomStatistics,

  // Tags
  getTags,
  saveTag,
  deleteTag,
  assignTagsToRequest,
  getRequestsByTag,

  // Integration Logs
  searchIntegrationLogs,
  getIntegrationLogStatistics,
  getIntegrationLogDetail,
  retryIntegrationMessage,

  // Digital Signature
  signResult,
  getSignatureHistory,
  verifySignature,
  getSignatureConfigs,

  // Statistics
  getExamStatisticsByServiceType,

  // IV. Capture Device
  getCaptureDevices,
  saveCaptureDevice,
  deleteCaptureDevice,
  testCaptureDeviceConnection,
  getWorkstations,
  saveWorkstation,
  createCaptureSession,
  endCaptureSession,
  saveCapturedMedia,
  getCapturedMedia,
  sendMediaToPacs,

  // V. Consultation
  searchConsultations,
  getConsultationSession,
  saveConsultationSession,
  deleteConsultationSession,
  startConsultation,
  endConsultation,
  addConsultationCase,
  removeConsultationCase,
  inviteParticipant,
  removeParticipant,
  joinConsultation,
  leaveConsultation,
  addConsultationDiscussion,
  getConsultationDiscussions,
  addConsultationImageNote,
  getConsultationImageNotes,
  saveConsultationMinutes,
  getConsultationMinutes,
  approveConsultationMinutes,
  addConsultationAttachment,
  getConsultationAttachments,

  // X. HL7 CDA
  getHL7CDAConfigs,
  saveHL7CDAConfig,
  sendHL7Message,
  getHL7Messages,
  createCDADocument,
  getCDADocument,
  receiveHL7Order,

  // IX. Online Help
  getHelpCategories,
  saveHelpCategory,
  searchHelpArticles,
  getHelpArticle,
  saveHelpArticle,
  getTroubleshootingList,
  saveTroubleshooting,

  // VII. CLS Screen
  getCLSScreenConfig,
  saveCLSScreenConfig,
  getServiceDescriptionTemplates,
  saveServiceDescriptionTemplate,
  getDiagnosisHistory
};
