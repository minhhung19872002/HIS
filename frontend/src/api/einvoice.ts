import apiClient from './client';

// ============================================================================
// HĐĐT — Hóa đơn điện tử đa NCC (VNPT / Viettel / MISA)
// Route BE: /api/einvoice
// MockMode mặc định true — sinh InvoiceNo giả, không gọi NCC thật.
// ============================================================================

export type EInvoiceStatus = 0 | 1 | 2 | 3 | 4;
// 0=draft, 1=issued, 2=signed, 3=cancelled, 4=failed

export interface EInvoiceDto {
  id: string;
  receiptId?: string;
  provider: string;          // "VNPT" | "Viettel" | "MISA"
  invoiceNo?: string;
  invoiceCode?: string;      // Mã CQT
  templateCode?: string;
  serialNo?: string;
  status: EInvoiceStatus;
  statusName: string;
  totalAmount: number;
  taxAmount?: number;
  issuedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface EInvoiceDetailDto extends EInvoiceDto {
  portalResponse?: string;   // Raw JSON từ NCC
}

export interface IssueEInvoiceDto {
  receiptId: string;
  /** NCC muốn dùng — nếu bỏ trống, lấy từ server config. */
  provider?: string;
}

export interface EInvoiceConfigDto {
  /** NCC đang kích hoạt: "VNPT" | "Viettel" | "MISA" */
  provider: string;
  /** true = sinh số giả, không gọi NCC */
  mockMode: boolean;
  enabled: boolean;
}

export interface EInvoiceListParams {
  receiptId?: string;
  status?: number;
  pageSize?: number;
}

// ── API object ───────────────────────────────────────────────────────────────

export const einvoice = {
  /** Lấy danh sách HĐĐT. */
  getList: async (params?: EInvoiceListParams): Promise<EInvoiceDto[]> => {
    const { data } = await apiClient.get<EInvoiceDto[]>('/einvoice', { params });
    return data;
  },

  /** Chi tiết 1 HĐĐT (kèm PortalResponse thô). */
  getDetail: async (id: string): Promise<EInvoiceDetailDto> => {
    const { data } = await apiClient.get<EInvoiceDetailDto>(`/einvoice/${id}`);
    return data;
  },

  /**
   * Phát hành HĐĐT từ phiếu thu.
   * MockMode=true (server default) → InvoiceNo giả "MOCK-…".
   * MockMode=false → gọi NCC thật (cần credential trong Cloud Run env).
   */
  issue: async (dto: IssueEInvoiceDto): Promise<EInvoiceDto> => {
    const { data } = await apiClient.post<EInvoiceDto>('/einvoice/issue', dto);
    return data;
  },

  /** Hủy HĐĐT. */
  cancel: async (id: string): Promise<EInvoiceDto> => {
    const { data } = await apiClient.post<EInvoiceDto>(`/einvoice/cancel/${id}`);
    return data;
  },

  /**
   * Đồng bộ trạng thái từ NCC.
   * MockMode=true → trả current status không gọi NCC.
   */
  syncStatus: async (id: string): Promise<EInvoiceDto> => {
    const { data } = await apiClient.post<EInvoiceDto>(`/einvoice/status/${id}`);
    return data;
  },

  /** Đọc cấu hình hiện tại (Provider, MockMode, Enabled). */
  getConfig: async (): Promise<EInvoiceConfigDto> => {
    const { data } = await apiClient.get<EInvoiceConfigDto>('/einvoice/config');
    return data;
  },

  /**
   * Lưu cấu hình.
   * Lưu ý: config không persist qua restart trừ khi set Cloud Run env.
   * Credential NCC cần set:
   *   EInvoice__Vnpt__BaseUrl, EInvoice__Vnpt__Account, EInvoice__Vnpt__Password,
   *   EInvoice__Vnpt__Serial, EInvoice__Vnpt__Pattern, EInvoice__Vnpt__TaxCode
   *   (tương tự cho Viettel__ và MISA__)
   */
  saveConfig: async (cfg: EInvoiceConfigDto): Promise<{ message: string }> => {
    const { data } = await apiClient.put<{ message: string }>('/einvoice/config', cfg);
    return data;
  },
};
