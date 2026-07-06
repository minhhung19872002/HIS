/**
 * RIS API — Print label, label configs, QR code generate/scan/share,
 * tags + assign/requests-by-tag.
 */

import apiClient from '../../services/apiClient';

// #region Interfaces

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

// #endregion

// #region Print Label APIs

export const printLabel = (data: PrintLabelRequestDto) =>
  apiClient.post<LabelDataDto>('/RISComplete/print-label', data);

export const getLabelConfigs = (serviceTypeId?: string) =>
  apiClient.get<RadiologyLabelConfigDto[]>('/RISComplete/label-configs', {
    params: { serviceTypeId }
  });

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
