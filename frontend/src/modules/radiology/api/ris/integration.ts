/**
 * RIS API — Integration logs, HL7 messages, CDA documents, HL7CDA config, syncResultToDoH
 * is in report.ts (it's a report-related sync); this module covers the HL7/CDA messaging layer.
 */

import apiClient from '../../../../services/apiClient';

// #region Interfaces

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

// HL7 CDA interfaces — khớp 1-1 với RISCompleteController.Integration + RISCompleteDTOs.Part4.
// Lưu ý JSON casing: `HL7Version` serialize thành `hL7Version`.
export type Hl7ConnectionType = 'MLLP' | 'TCP' | 'HTTP' | 'File';

export interface HL7CDAConfigDto {
  id: string;
  configName: string;
  hL7Version: string;
  cdaVersion?: string;
  sendingApplication?: string;
  sendingFacility?: string;
  receivingApplication?: string;
  receivingFacility?: string;
  connectionType?: string;
  serverAddress?: string;
  serverPort?: number;
  filePath?: string;
  isActive: boolean;
}

export interface SaveHL7CDAConfigDto {
  id?: string;
  configName: string;
  hL7Version: string;
  cdaVersion?: string;
  sendingApplication?: string;
  sendingFacility?: string;
  receivingApplication?: string;
  receivingFacility?: string;
  connectionType?: string;
  serverAddress?: string;
  serverPort?: number;
  filePath?: string;
  configJson?: string;
  isActive: boolean;
}

/**
 * Status theo entity RadiologyHL7Message:
 * 0=Nhận về · 1=Đang gửi · 2=Đã xử lý · 3=Lỗi · 4=Hệ nhận đã ACK.
 */
export interface HL7MessageDto {
  id: string;
  messageControlId: string;
  messageType: string;
  triggerEvent: string;
  direction: string;
  radiologyRequestId?: string;
  patientId?: string;
  accessionNumber?: string;
  rawMessage: string;
  parsedData?: string;
  messageDateTime: string;
  status: number;
  ackCode?: string;
  errorMessage?: string;
  retryCount: number;
}

export interface HL7MessageSearchResultDto {
  items: HL7MessageDto[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface SearchHL7MessageDto {
  fromDate?: string;
  toDate?: string;
  messageType?: string;
  direction?: string;
  status?: number;
  patientId?: string;
  accessionNumber?: string;
  page?: number;
  pageSize?: number;
}

export interface SendHL7MessageDto {
  messageType: string;
  triggerEvent: string;
  radiologyRequestId?: string;
  patientId?: string;
  accessionNumber?: string;
  segments?: Record<string, string>;
}

export interface SendHL7ResultDto {
  success: boolean;
  messageControlId: string;
  /** Mã ACK thật của hệ nhận (AA/AE/AR); rỗng khi chưa gửi được tới nơi. */
  ackCode?: string;
  errorMessage?: string;
  sentAt: string;
}

export interface CDADocumentDto {
  id: string;
  documentId: string;
  documentType: string;
  radiologyReportId: string;
  orderCode?: string;
  patientName?: string;
  cdaContent?: string;
}

export interface CreateCDADocumentDto {
  reportId: string;
  documentType: string;
}

export interface SendCDADocumentDto {
  documentId: string;
  configId?: string;
}

// Chat interfaces (NangCap15 — consultation chat)
export interface RisChatMessageDto {
  id: string;
  caseId: string;
  senderUserId: string;
  senderName: string;
  message: string;
  timestamp: string;
  studyRef?: string;
}

export interface SendRisChatMessageDto {
  caseId: string;
  message: string;
  studyRef?: string;
}

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

// #region X. HL7 CDA APIs

export const getHL7CDAConfigs = () =>
  apiClient.get<HL7CDAConfigDto[]>('/RISComplete/hl7-cda/configs');

export const saveHL7CDAConfig = (data: SaveHL7CDAConfigDto) =>
  apiClient.post<HL7CDAConfigDto>('/RISComplete/hl7-cda/configs', data);

export const deleteHL7CDAConfig = (configId: string) =>
  apiClient.delete(`/RISComplete/hl7-cda/configs/${configId}`);

/** Mở kết nối thật tới hệ nhận (MLLP/TCP: TCP connect · HTTP: GET · File: kiểm tra thư mục). */
export const testHL7Connection = (configId: string) =>
  apiClient.get<{ connected: boolean }>(`/RISComplete/hl7-cda/configs/${configId}/test-connection`);

export const sendHL7Message = (data: SendHL7MessageDto) =>
  apiClient.post<SendHL7ResultDto>('/RISComplete/hl7-cda/send-message', data);

export const getHL7Messages = (fromDate?: string, toDate?: string) =>
  apiClient.get<HL7MessageSearchResultDto>('/RISComplete/hl7-cda/messages', {
    params: { fromDate, toDate }
  });

export const searchHL7Messages = (data: SearchHL7MessageDto) =>
  apiClient.post<HL7MessageSearchResultDto>('/RISComplete/hl7-cda/messages/search', data);

export const retryHL7Message = (messageId: string) =>
  apiClient.post(`/RISComplete/hl7-cda/messages/${messageId}/retry`);

/** Gửi kết quả đã đọc về hệ nhận dưới dạng ORU^R01; trả ACK thật. */
export const sendHL7Result = (reportId: string, withSignature = false) =>
  apiClient.post<SendHL7ResultDto>(
    `/RISComplete/hl7-cda/reports/${reportId}/send-result`,
    null,
    { params: { withSignature } }
  );

export const cancelHL7Result = (reportId: string, reason: string) =>
  apiClient.post(`/RISComplete/hl7-cda/reports/${reportId}/cancel-result`, { reason });

export const createCDADocument = (data: CreateCDADocumentDto) =>
  apiClient.post<CDADocumentDto>('/RISComplete/hl7-cda/documents', data);

export const getCDADocument = (documentId: string) =>
  apiClient.get<CDADocumentDto>(`/RISComplete/hl7-cda/documents/${documentId}`);

export const sendCDADocument = (data: SendCDADocumentDto) =>
  apiClient.post('/RISComplete/hl7-cda/documents/send', data);

export const receiveHL7Order = (hl7Message: string) =>
  apiClient.post<{ orderId: string }>('/RISComplete/hl7-cda/receive-order', { hl7Message });

// #endregion

// #region Chat APIs (NangCap15)

export const getCaseMessages = (caseId: string) =>
  apiClient.get<RisChatMessageDto[]>(`/RISComplete/chat/${caseId}/messages`);

export const sendCaseMessage = (data: SendRisChatMessageDto) =>
  apiClient.post<RisChatMessageDto>('/RISComplete/chat/messages', data);

// #endregion
