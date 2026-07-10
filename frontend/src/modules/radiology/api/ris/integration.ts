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

// HL7 CDA interfaces
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

// #region Chat APIs (NangCap15)

export const getCaseMessages = (caseId: string) =>
  apiClient.get<RisChatMessageDto[]>(`/RISComplete/chat/${caseId}/messages`);

export const sendCaseMessage = (data: SendRisChatMessageDto) =>
  apiClient.post<RisChatMessageDto>('/RISComplete/chat/messages', data);

// #endregion
