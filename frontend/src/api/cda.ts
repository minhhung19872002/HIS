/**
 * API Client cho HL7 CDA Document Generation
 * Endpoints: /api/cda/*
 */

import apiClient from './client';

// ==================== Types ====================

export type CdaDocumentType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const CDA_DOCUMENT_TYPE_NAMES: Record<CdaDocumentType, string> = {
  1: 'Tóm tắt bệnh án',
  2: 'Kết quả xét nghiệm',
  3: 'Kết quả CĐHA',
  4: 'Phiếu điều trị',
  5: 'Biên bản hội chẩn',
  6: 'Phiếu phẫu thuật',
  7: 'Giấy chuyển viện',
  8: 'Đơn thuốc',
};

export interface CdaDocumentDto {
  id: string;
  documentId: string;
  documentType: CdaDocumentType;
  documentTypeName: string;
  patientId: string;
  patientName: string;
  medicalRecordId?: string;
  sourceEntityId?: string;
  cdaXml?: string;
  status: number;
  statusName: string;
  isSigned: boolean;
  signedByName?: string;
  signedAt?: string;
  createdAt: string;
  createdByName?: string;
  validationErrors?: string;
}

export interface GenerateCdaRequest {
  documentType: CdaDocumentType;
  patientId: string;
  medicalRecordId?: string;
  sourceEntityId?: string;
}

export interface CdaDocumentSearchDto {
  patientId?: string;
  documentType?: CdaDocumentType;
  status?: number;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface CdaDocumentPagedResult {
  items: CdaDocumentDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface CdaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ==================== API Functions ====================

export const generateCdaDocument = async (request: GenerateCdaRequest): Promise<CdaDocumentDto> => {
  const response = await apiClient.post('/cda/generate', request);
  return response.data;
};

export const searchCdaDocuments = async (search: CdaDocumentSearchDto = {}): Promise<CdaDocumentPagedResult> => {
  const response = await apiClient.get('/cda', { params: search });
  return response.data;
};

export const getCdaDocument = async (id: string): Promise<CdaDocumentDto> => {
  const response = await apiClient.get(`/cda/${id}`);
  return response.data;
};

export const getCdaXml = async (id: string): Promise<string> => {
  const response = await apiClient.get(`/cda/${id}/xml`);
  return response.data;
};

export const validateCdaDocument = async (id: string): Promise<CdaValidationResult> => {
  const response = await apiClient.post(`/cda/${id}/validate`);
  return response.data;
};

export const finalizeCdaDocument = async (id: string): Promise<CdaDocumentDto> => {
  const response = await apiClient.put(`/cda/${id}/finalize`);
  return response.data;
};

export const regenerateCdaDocument = async (id: string): Promise<CdaDocumentDto> => {
  const response = await apiClient.put(`/cda/${id}/regenerate`);
  return response.data;
};

export const deleteCdaDocument = async (id: string): Promise<void> => {
  await apiClient.delete(`/cda/${id}`);
};
