import apiClient from '../../../services/apiClient';

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

/** Phiên giám định (BhxhAuditListDto). Status: 0 nháp · 1 đang kiểm tra · 2 hoàn thành · 3 đã gửi cổng · 4 đã duyệt. */
export interface BhxhAuditSession {
  id: string;
  sessionCode: string;
  periodMonth: number;
  periodYear: number;
  totalRecords: number;
  totalAmount: number;
  errorCount: number;
  errorAmount: number;
  status: number;
  statusName?: string;
  auditorName?: string;
  notes?: string;
  createdAt: string;
}

export interface BhxhAuditSessionPage {
  items: BhxhAuditSession[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

/** Lỗi giám định của 1 hồ sơ trong phiên (AuditErrorDto). */
export interface BhxhAuditError {
  id: string;
  auditSessionId: string;
  recordId?: string;
  patientName?: string;
  insuranceNumber?: string;
  errorType: string;
  errorTypeName?: string;
  errorDescription?: string;
  originalAmount: number;
  adjustedAmount: number;
  isFixed: boolean;
  fixedDate?: string;
  notes?: string;
}

// ==================== API FUNCTIONS ====================

/**
 * Danh sách phiên giám định BHXH — BE trả trang `{ items, totalCount, pageIndex, pageSize }` (BhxhAuditPagedResult).
 * R3: trang v2 trước đây đọc kết quả này như danh sách HỒ SƠ (maLk/patientName…) nên mọi dòng trống.
 */
export const getAuditSessions = (params: { periodYear?: number; periodMonth?: number; status?: number; pageSize?: number } = {}) =>
  apiClient.get<BhxhAuditSessionPage>('/bhxh-audit/sessions', { params: { pageSize: 500, ...params } });

/** Tạo phiên giám định cho kỳ tháng/năm. */
export const createAuditSession = (dto: { periodMonth: number; periodYear: number; notes?: string }) =>
  apiClient.post<BhxhAuditSession>('/bhxh-audit/session', dto);

/** Chạy kiểm tra tự động trên hồ sơ BHYT của kỳ (trùng, vượt trần DVKT, thiếu ICD). */
export const runAuditSession = (sessionId: string) =>
  apiClient.post<BhxhAuditSession & { errors: BhxhAuditError[] }>(`/bhxh-audit/session/${sessionId}/run`);

/** Lỗi của phiên. */
export const getAuditErrors = (sessionId: string) =>
  apiClient.get<BhxhAuditError[]>(`/bhxh-audit/session/${sessionId}/errors`);

/** Ghi nhận xử lý lỗi (số tiền còn được thanh toán 0..gốc). */
export const fixAuditError = (errorId: string, dto: { adjustedAmount: number; notes?: string }) =>
  apiClient.put<BhxhAuditError>(`/bhxh-audit/error/${errorId}/fix`, dto);

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
  createAuditSession,
  runAuditSession,
  getAuditErrors,
  fixAuditError,
  approveAuditSession,
  submitToPortal,
  submitBatch,
  exportXml,
  exportBatchXml,
  printAuditForm,
  importAuditCsv,
  getImportedRows,
};
