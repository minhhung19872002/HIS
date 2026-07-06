import { apiClient } from '../services/apiClient';

export interface OpenSessionRequest {
  pin: string;
  skipPkcs11?: boolean;
}

export interface OpenSessionResponse {
  success: boolean;
  message?: string;
  tokenSerial?: string;
  caProvider?: string;
  certificateSubject?: string;
  sessionExpiresAt?: string;
}

export interface SessionStatusResponse {
  active: boolean;
  expiresAt?: string;
  tokenSerial?: string;
  caProvider?: string;
  certificateSubject?: string;
  expiryWarningDays?: number;
}

export interface SignDocumentRequest {
  documentId: string;
  documentType: string;
  pin?: string;
  reason: string;
  location: string;
}

export interface SignDocumentResponse {
  success: boolean;
  message?: string;
  signerName?: string;
  signedAt?: string;
  certificateSerial?: string;
  caProvider?: string;
  tsaTimestamp?: string;
  ocspStatus?: string;
  signedDocumentUrl?: string;
}

export interface BatchSignRequest {
  documentIds: string[];
  documentType: string;
  pin?: string;
  reason: string;
}

export interface BatchSignResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: BatchSignItemResult[];
}

export interface BatchSignItemResult {
  documentId: string;
  success: boolean;
  error?: string;
}

export interface DocumentSignatureDto {
  id: string;
  documentId: string;
  documentType: string;
  documentCode: string;
  signerName: string;
  signedAt: string;
  certificateSerial: string;
  caProvider: string;
  tsaTimestamp?: string;
  ocspStatus?: string;
  status: number;
  organizationName?: string;
  taxCode?: string;
  certificateSubject?: string;
}

export interface TokenInfoDto {
  tokenSerial: string;
  tokenLabel: string;
  caProvider: string;
  mappedUserName?: string;
  lastUsedAt?: string;
  isActive: boolean;
}

// Session management
export const openSession = (data: OpenSessionRequest) =>
  apiClient.post<OpenSessionResponse>('/digital-signature/open-session', data);

export const getSessionStatus = () =>
  apiClient.get<SessionStatusResponse>('/digital-signature/session-status');

export const closeSession = () =>
  apiClient.post('/digital-signature/close-session');

// Signing
export const signDocument = (data: SignDocumentRequest) =>
  apiClient.post<SignDocumentResponse>('/digital-signature/sign', data);

export const batchSign = (data: BatchSignRequest) =>
  apiClient.post<BatchSignResponse>('/digital-signature/batch-sign', data);

// Signatures
export const getSignatures = (documentId: string) =>
  apiClient.get<DocumentSignatureDto[]>(`/digital-signature/signatures/${documentId}`);

export const revokeSignature = (signatureId: string, reason: string) =>
  apiClient.post(`/digital-signature/revoke-signature/${signatureId}`, { reason });

// Download signed PDF
export const downloadSignedPdf = async (signatureId: string) => {
  const resp = await apiClient.get(`/digital-signature/download/${signatureId}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  const disposition = resp.headers['content-disposition'];
  const fileName = disposition
    ? disposition.split('filename=')[1]?.replace(/"/g, '') || `signed_${signatureId}.pdf`
    : `signed_${signatureId}.pdf`;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Batch signature lookup
export const getSignaturesBatch = (documentIds: string[]) =>
  apiClient.post<Record<string, DocumentSignatureDto>>('/digital-signature/signatures/batch', documentIds);

// Tokens
export const getTokens = () =>
  apiClient.get<TokenInfoDto[]>('/digital-signature/tokens');

export const registerToken = (tokenSerial: string) =>
  apiClient.post('/digital-signature/register-token', { tokenSerial });

// ─── #84: Lịch sử ký theo HSBA + sign/revoke per y lệnh ───

export interface DocumentSignatureHistoryDto {
  id: string;
  documentId: string;
  documentType: string;
  documentCode: string;
  signerName: string;
  signedAt: string;
  certificateSerial: string;
  caProvider: string;
  tsaTimestamp?: string;
  ocspStatus?: string;
  /** 0 = Hiệu lực, 1 = Đã thu hồi */
  status: number;
  revokeReason?: string;
  revokedAt?: string;
  certificateSubject?: string;
  signedDocumentUrl?: string;
}

/** Lấy toàn bộ lịch sử ký (gồm đã thu hồi) cho một HSBA.
 * documentType: rỗng = tất cả, "Prescription", "Order", "EMR", ... */
export const getRecordSignatures = (medicalRecordId: string, documentType?: string) =>
  apiClient.get<DocumentSignatureHistoryDto[]>(
    `/digital-signature/record-signatures/${medicalRecordId}`,
    { params: documentType ? { documentType } : undefined }
  );

/** Ký số per y lệnh — alias rõ ràng cho SignDocument với documentType y lệnh */
export const signOrder = (data: SignDocumentRequest) =>
  apiClient.post<SignDocumentResponse>('/digital-signature/sign-order', data);

/** Hủy ký per y lệnh */
export const revokeOrder = (signatureId: string, reason: string) =>
  apiClient.post(`/digital-signature/revoke-order/${signatureId}`, { reason });

// ─── #83: Export HSBA tổng kết ───

/** Tải PDF gộp toàn bộ phiếu HSBA. sign=true sẽ ký số nếu có active session. */
export const downloadFullRecord = async (medicalRecordId: string, sign = false) => {
  const resp = await apiClient.get(`/pdf/export-full-record/${medicalRecordId}`, {
    params: { sign },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `HSBA_${medicalRecordId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ─── #111: Ký file Office/Text ───

export interface FileSigningResult {
  success: boolean;
  message?: string;
  fileHashBase64?: string;
  signatureBase64?: string;
  signatureRecordId?: string;
  signerName?: string;
  certificateSerial?: string;
  caProvider?: string;
  signedAt?: string;
  note?: string;
}

export interface SignOfficeFileRequest {
  fileBase64: string;
  fileName: string;
  otpCode?: string;
  reason?: string;
  location?: string;
}

export const signDocx = (data: SignOfficeFileRequest) =>
  apiClient.post<FileSigningResult>('/central-signing/sign-docx', data);

export const signXlsx = (data: SignOfficeFileRequest) =>
  apiClient.post<FileSigningResult>('/central-signing/sign-xlsx', data);

export const signTxt = (data: SignOfficeFileRequest) =>
  apiClient.post<FileSigningResult>('/central-signing/sign-txt', data);

// ─── VGCA Sign Service (ký bằng USB token máy trạm) ───
export interface DocumentContentResponse {
  success: boolean;
  message?: string;
  fileType: string; // pdf | xml
  fileName?: string;
  base64?: string;
}

export interface SubmitSignedRequest {
  documentId: string;
  documentType: string;
  fileType: string; // pdf | xml
  signedBase64: string;
  signerName?: string;
  certificateSubject?: string;
  certificateSerial?: string;
  caProvider?: string;
}

// Lấy nội dung tài liệu (PDF chưa ký) để gửi sang VGCA Sign Service ký bằng token máy trạm.
export const getDocumentContent = (documentId: string, documentType: string, fileType = 'pdf') =>
  apiClient.get<DocumentContentResponse>('/digital-signature/content', {
    params: { documentId, documentType, fileType },
  });

// Lưu tài liệu đã ký (nhận từ client sau khi token máy trạm ký).
export const submitSigned = (data: SubmitSignedRequest) =>
  apiClient.post<SignDocumentResponse>('/digital-signature/submit-signed', data);
