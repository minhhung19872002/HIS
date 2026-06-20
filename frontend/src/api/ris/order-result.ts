/**
 * RIS API — Radiology orders, result templates, enter/update/approve/print/send result,
 * patient radiology history, diagnosis templates, abbreviations, PTTT mapping,
 * diagnosis history, co-reader, favorites.
 */

import apiClient from '../client';
import type { AttachedImageDto } from './_shared';

// #region Interfaces

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
  /** DICOM Study Instance UID — null nếu chưa có DICOM linked */
  studyInstanceUID?: string;
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

// PTTT Service Mapping
export interface PtttMappingTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  preOpDiagnosis?: string;
  postOpDiagnosis?: string;
  surgeryMethod?: string;
  anesthesiaMethod?: string;
  narrativeBody?: string;
  complications?: string;
  postOpOrders?: string;
}

export interface PtttServiceMappingDto {
  id: string;
  radiologyServiceId: string;
  radiologyServiceName: string;
  surgeryNarrativeTemplateId?: string;
  surgeryNarrativeTemplateName?: string;
  notes?: string;
  template?: PtttMappingTemplate;
}

// Diagnosis History
export interface DiagnosisHistoryDto {
  id: string;
  requestId: string;
  serviceName: string;
  examDate: string;
  description?: string;
  conclusion?: string;
  doctorName?: string;
}

// CLS Screen interfaces (placed here as they relate to result entry/display)
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

// Favorite interfaces
export interface RadiologyFavoriteDto {
  id: string;
  userId: string;
  requestId: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  serviceName: string;
  requestDate: string;
  status: number;
  createdAt: string;
}

export interface FavoriteToggleResultDto {
  isFavorited: boolean;
  requestId: string;
}

// Co-Reader interfaces
export interface CoReaderDto {
  id: string;
  radiologyReportId: string;
  readerId: string;
  readerName?: string;
  role?: string;
  opinion?: string;
  copiedFromReportId?: string;
  createdAt: string;
}

export interface AddCoReaderDto {
  radiologyReportId: string;
  readerId: string;
  readerName?: string;
  /** CoReader | Consultant | Supervisor */
  role?: string;
  opinion?: string;
}

export interface UpdateCoReaderOpinionDto {
  coReaderId: string;
  opinion?: string;
  role?: string;
}

export interface CopyReportResultDto {
  sourceReportId: string;
  targetReportId: string;
  /** Them ban ghi co-reader tu BS doc nguon vao report dich. Mac dinh true. */
  trackAsCoReader?: boolean;
}

export interface MergeCoReaderOpinionsDto {
  radiologyReportId: string;
  /** Neu true: append vao cuoi Impression. Neu false: ghi de. */
  appendMode?: boolean;
}

export interface MergeResultDto {
  mergedImpression: string;
  coReaderCount: number;
}

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

// #region PTTT Service Mapping APIs

/**
 * Resolve mapping PTTT theo serviceId của dịch vụ CĐHA.
 * Trả 404 (throw) nếu dịch vụ không có mapping — caller nên bắt lỗi và ẩn nút.
 */
export const getPtttMappingByService = (serviceId: string) =>
  apiClient.get<PtttServiceMappingDto>(`/ris-catalog/pttt-service-mappings/by-service/${serviceId}`);

/**
 * Batch-check nhiều serviceId xem có mapping PTTT không.
 * Trả dict: { [serviceId: string]: { hasMapping: boolean; templateId?: string; templateName?: string } }
 * 1 call cho cả trang thay vì N lần by-service/{id}.
 */
export const checkBatchPtttMappings = (serviceIds: string[]) =>
  apiClient.post<Record<string, { hasMapping: boolean; templateId?: string; templateName?: string }>>(
    '/ris-catalog/pttt-service-mappings/check-batch',
    serviceIds,
  );

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

// #region CLS Screen APIs

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

// #region Bulk approve

// Bulk approve — duyệt hàng loạt kết quả CĐHA (Issue #144)
export const bulkApproveResults = (data: { resultIds: string[]; note?: string }) =>
  apiClient.post<{ approvedCount: number; skippedCount: number; skipped: string[] }>(
    '/RISComplete/results/bulk-approve',
    data,
  );

// #endregion

// #region F2.8 Favorite APIs

/** Toggle ghim / bo ghim ca chup. Tra ve { isFavorited, requestId }. */
export const toggleFavorite = (requestId: string) =>
  apiClient.post<FavoriteToggleResultDto>('/RISComplete/favorites/toggle', { requestId });

/** Lay danh sach ca chup da ghim cua user hien tai. */
export const getFavorites = () =>
  apiClient.get<RadiologyFavoriteDto[]>('/RISComplete/favorites');

/** Kiem tra 1 ca chup co dang duoc user hien tai ghim hay khong. */
export const isFavorited = (requestId: string) =>
  apiClient.get<{ isFavorited: boolean; requestId: string }>(`/RISComplete/favorites/check/${requestId}`);

// #endregion

// #region Co-Reader / Dong doc ket qua CDHA (#139)

/** Them BS dong doc vao report. */
export const addCoReader = (dto: AddCoReaderDto) =>
  apiClient.post<CoReaderDto>('/RISComplete/coreaders', dto);

/** Lay danh sach dong doc theo reportId. */
export const getCoReaders = (reportId: string) =>
  apiClient.get<CoReaderDto[]>(`/RISComplete/coreaders/${reportId}`);

/** Cap nhat y kien cua dong doc. */
export const updateCoReaderOpinion = (dto: UpdateCoReaderOpinionDto) =>
  apiClient.put<{ success: boolean }>('/RISComplete/coreaders', dto);

/** Xoa dong doc (soft-delete). */
export const removeCoReader = (coReaderId: string) =>
  apiClient.delete<{ success: boolean }>(`/RISComplete/coreaders/${coReaderId}`);

/** Copy Findings/Impression/Recommendations tu report nguon sang report dich. */
export const copyReportResult = (dto: CopyReportResultDto) =>
  apiClient.post<{ success: boolean }>('/RISComplete/coreaders/copy-from', dto);

/** Gop y kien tat ca dong doc vao Impression cua report. */
export const mergeCoReaderOpinions = (dto: MergeCoReaderOpinionsDto) =>
  apiClient.post<MergeResultDto>('/RISComplete/coreaders/merge', dto);

// #endregion
