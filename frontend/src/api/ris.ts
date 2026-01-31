/**
 * RIS/PACS (Radiology Information System) API Client
 * Module 8: Chẩn đoán hình ảnh, Thăm dò chức năng - 28+ chức năng
 */

import apiClient from './apiClient';

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
  saveSchedule
};
