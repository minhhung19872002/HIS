import apiClient from '../services/apiClient';

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

// === Import danh sach giam dinh BHXH tu CSV (Issue #97/#121/#122) ===

export interface BhxhAuditImportRow {
  id: string;
  importBatchCode: string;
  importedAt: string;
  fileName?: string;
  rowNumber: number;
  maHoSo: string;
  maBenhNhan?: string;
  hoTen?: string;
  soTheBHYT?: string;
  ngayVao?: string;
  ngayRa?: string;
  maKhoa?: string;
  tenKhoa?: string;
  maChanDoan?: string;
  tienVienPhi: number;
  tienBHYT: number;
  tienBenhNhan: number;
  trangThaiGiamDinh: number;
  trangThaiName?: string;
  ghiChu?: string;
  isValid: boolean;
  validationError?: string;
}

export interface BhxhAuditImportResult {
  importBatchCode: string;
  fileName?: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: Array<{ rowNumber: number; maHoSo: string; errorMessage: string }>;
}

export interface BhxhAuditImportPagedResult {
  items: BhxhAuditImportRow[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  countChuaDuyet: number;
  countDaDuyet: number;
  countTuChoi: number;
}

/**
 * Import danh sach ho so giam dinh BHXH tu file CSV.
 * CSV header bat buoc: MaHoSo,MaBenhNhan,HoTen,SoTheBHYT,NgayVao,NgayRa,MaKhoa,TenKhoa,MaChanDoan,TienVienPhi,TienBHYT,TienBenhNhan,TrangThaiGiamDinh,GhiChu
 * NOTE: Excel can them thu vien backend ClosedXML/EPPlus; hien tai chi ho tro CSV.
 */
export const importAuditCsv = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return apiClient.post<BhxhAuditImportResult>('/bhxh-audit/import-csv', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** Danh sach hang da import, ho tro filter trangThai (0/1/2 hoac undefined=tat ca) */
export const getImportedRows = (params: {
  importBatchCode?: string;
  keyword?: string;
  trangThai?: number;
  pageIndex?: number;
  pageSize?: number;
}) => apiClient.get<BhxhAuditImportPagedResult>('/bhxh-audit/imported-rows', { params });

export default {
  getAuditSessions,
  approveAuditSession,
  submitToPortal,
  submitBatch,
  exportXml,
  exportBatchXml,
  printAuditForm,
  importAuditCsv,
  getImportedRows,
};
