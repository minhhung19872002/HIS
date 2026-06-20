/**
 * RIS API — signResult, signature history, verifySignature, signature configs,
 * USB token, generate/sign/preview PDF, certificates.
 */

import apiClient from '../client';

// #region Interfaces

export interface SignResultRequestDto {
  reportId: string;
  signatureType: string;  // USBToken, eKYC, SignServer, SmartCA
  pin?: string;
  otp?: string;
  certificateId?: string;
  note?: string;
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

// USB Token interfaces
export interface USBTokenCertificate {
  thumbprint: string;
  subjectName: string;
  issuerName: string;
  validFrom: string;
  validTo: string;
  isValid: boolean;
}

export interface USBTokenStatus {
  available: boolean;
  hasValidCertificate: boolean;
  certificateCount: number;
  message: string;
  certificates: USBTokenCertificate[];
}

export interface USBTokenSignRequest {
  reportId?: string;
  certificateThumbprint: string;
  dataToSign?: string;
}

export interface USBTokenSignResult {
  success: boolean;
  message: string;
  signature?: string;
  signatureBase64?: string;
  signedAt?: string;
  signerName?: string;
  certificateSerial?: string;
  certificateThumbprint?: string;
  hashAlgorithm?: string;
}

// PDF Generation & Signing interfaces (PAdES compliant)
export interface AttachedImageRequest {
  fileName: string;
  base64Data: string;
  description?: string;
}

export interface PdfGenerateSignRequest {
  patientCode?: string;
  patientName?: string;
  patientDob?: string;
  patientGender?: string;
  patientAddress?: string;
  requestCode?: string;
  requestDate?: string;
  orderingDoctorName?: string;
  orderingDepartment?: string;
  clinicalDiagnosis?: string;
  serviceCode?: string;
  serviceName?: string;
  modalityType?: string;
  bodyPart?: string;
  technique?: string;
  findings?: string;
  conclusion?: string;
  recommendations?: string;
  performedBy?: string;
  reportedBy?: string;
  reportedDate?: string;
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  attachedImages?: AttachedImageRequest[];
  certificateThumbprint?: string;
}

export interface PdfSignatureResult {
  success: boolean;
  message: string;
  pdfFileName?: string;
  pdfFileSize?: number;
  signedAt?: string;
  signerName?: string;
  certificateSerial?: string;
  certificateIssuer?: string;
  signatureAlgorithm?: string;
}

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

// #region USB Token APIs

export const getUSBTokenStatus = () =>
  apiClient.get<USBTokenStatus>('/RISComplete/usb-token/status');

export const getUSBTokenCertificates = () =>
  apiClient.get<USBTokenCertificate[]>('/RISComplete/usb-token/certificates');

export const signWithUSBToken = (data: USBTokenSignRequest) =>
  apiClient.post<USBTokenSignResult>('/RISComplete/usb-token/sign', data);

// #endregion

// #region PDF Generation & Signing APIs

export const generateAndSignPdf = (data: PdfGenerateSignRequest) =>
  apiClient.post<PdfSignatureResult>('/RISComplete/pdf/generate-and-sign', data);

export const downloadSignedPdf = (fileName: string) =>
  apiClient.get(`/RISComplete/pdf/download/${fileName}`, {
    responseType: 'blob'
  });

export const previewPdf = (data: PdfGenerateSignRequest) =>
  apiClient.post('/RISComplete/pdf/preview', data, {
    responseType: 'blob'
  });

// #endregion
