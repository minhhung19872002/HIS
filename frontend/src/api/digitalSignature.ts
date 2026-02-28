import { apiClient } from './client';

export interface OpenSessionRequest {
  pin: string;
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

// Tokens
export const getTokens = () =>
  apiClient.get<TokenInfoDto[]>('/digital-signature/tokens');

export const registerToken = (tokenSerial: string) =>
  apiClient.post('/digital-signature/register-token', { tokenSerial });
