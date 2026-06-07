import apiClient from './client';

// BHXH Audit — giám định BHXH. Tách call ra api layer (không gọi axios/client trong component).

// ==================== INTERFACES ====================

export interface BhxhAuditPortalSubmitResult {
  sessionId: string;
  sessionCode: string;
  /** MockMode: "MockSubmitted" cho đến khi tích hợp cổng BHXH thật */
  portalStatus: string;
  transactionId?: string;
  submittedAt: string;
  success: boolean;
  message?: string;
}

export interface BhxhAuditBatchSubmitResult {
  totalRequested: number;
  submitted: number;
  skipped: number;
  failed: number;
  results: BhxhAuditPortalSubmitResult[];
}

// ==================== API FUNCTIONS ====================

/** Danh sách phiên giám định BHXH. */
export const getAuditSessions = () => apiClient.get('/bhxh-audit/sessions');

/** Duyệt hồ sơ giám định (Completed → Approved). */
export const approveAuditSession = (sessionId: string, notes?: string) =>
  apiClient.post(`/bhxh-audit/session/${sessionId}/approve`, { notes });

/**
 * Gửi 1 phiên giám định lên cổng BHXH.
 * MockMode: cập nhật status + log, không gọi cổng thật (chưa tích hợp).
 */
export const submitToPortal = (sessionId: string) =>
  apiClient.post<BhxhAuditPortalSubmitResult>(`/bhxh-audit/session/${sessionId}/submit-portal`);

/**
 * Gửi hàng loạt phiên giám định lên cổng BHXH.
 * MockMode: xem submitToPortal.
 */
export const submitBatch = (sessionIds: string[]) =>
  apiClient.post<BhxhAuditBatchSubmitResult>('/bhxh-audit/sessions/submit-batch', { sessionIds });

/** Xuất XML giám định (XML130 format, trả blob). */
export const exportXml = (sessionId: string) =>
  apiClient.get(`/bhxh-audit/session/${sessionId}/export-xml`, { responseType: 'blob' });

/** In phiếu giám định (trả HTML text để mở cửa sổ in). */
export const printAuditForm = (sessionId: string) =>
  apiClient.get<string>(`/bhxh-audit/session/${sessionId}/print-form`, { responseType: 'text' });

/**
 * Xuất hàng loạt XML giám định — trả ZIP blob.
 * Mỗi session 1 file {SessionCode}.xml trong ZIP.
 */
export const exportBatchXml = (sessionIds: string[]) =>
  apiClient.post('/bhxh-audit/sessions/export-batch-xml', { sessionIds }, { responseType: 'blob' });

export default {
  getAuditSessions,
  approveAuditSession,
  submitToPortal,
  submitBatch,
  exportXml,
  exportBatchXml,
  printAuditForm,
};
