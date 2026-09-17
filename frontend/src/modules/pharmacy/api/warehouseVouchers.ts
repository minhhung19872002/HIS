import apiClient from '../../../services/apiClient';
import type { PagedResult, StockTakeDto } from './warehouse';

// ========================
// Kho Dược — thao tác trên phiếu đã lập (QA-R8): danh sách / mở lại / hủy phiếu kiểm kê, hủy phiếu xuất.
// Backend: WarehouseCompleteController (route /api/warehouse). Tách khỏi warehouse.ts vì file đó đang có
// thay đổi song song ở cửa khác — gộp lại khi tiện.
// ========================

const BASE_URL = '/warehouse';

// BE nhận `[FromBody] string` → body phải là chuỗi JSON có nháy. Axios chỉ tự bọc nháy khi chuỗi KHÔNG phải
// JSON hợp lệ — lý do như "123" / "true" sẽ đi nguyên dạng và bị 400, nên luôn JSON.stringify trước.

/** Trạng thái phiếu kiểm kê (StockTake.Status). */
export const STOCK_TAKE_STATUS = {
  NEW: 0,
  COUNTING: 1,
  COMPLETED: 2,
  ADJUSTED: 3,
  CANCELLED: 4,
} as const;

/** Trạng thái phiếu xuất (ExportReceipt.Status). */
export const STOCK_ISSUE_STATUS = { NEW: 0, ISSUED: 1, CANCELLED: 2 } as const;

export interface StockTakeSearchParams {
  warehouseId?: string;
  status?: number;
  page?: number;
  pageSize?: number;
}

/** Danh sách phiếu kiểm kê (không kèm dòng), mới nhất trước. */
export const getStockTakes = (params: StockTakeSearchParams) =>
  apiClient.get<PagedResult<StockTakeDto>>(`${BASE_URL}/stock-takes`, { params });

/** Chi tiết phiếu kiểm kê kèm dòng — mở lại phiếu đang kiểm để đếm tiếp. */
export const getStockTakeById = (id: string) =>
  apiClient.get<StockTakeDto>(`${BASE_URL}/stock-takes/${id}`);

/** Hủy phiếu kiểm kê chưa hoàn thành (lý do bắt buộc). */
export const cancelStockTake = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/stock-takes/${id}/cancel`, JSON.stringify(reason));

/** Hủy phiếu xuất (xuất khoa / chuyển kho / trả NCC / xuất hủy) — BE hoàn tồn và từ chối phiếu thuộc chứng từ khác. */
export const cancelStockIssue = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/issues/${id}/cancel`, JSON.stringify(reason));
