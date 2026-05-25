// TEMPLATE — HIS frontend API client. Copy vào frontend/src/api/<module>.ts
// Thay X/x bằng tên entity. Xoá phần không dùng.
import apiClient from './client';

// ── DTO interfaces (camelCase — khớp JSON backend, KHÔNG copy PascalCase C#) ──
export interface XDto {
  id: string;
  code: string;
  name: string;
  status: number | string;   // NangCap<=23: int 0..4 ; NangCap24: string
  createdAt: string;
  // ...thêm field theo DTO backend
}

export interface XSearchDto {
  keyword?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface XPagedResult {
  items: XDto[];
  totalCount: number;
  pageIndex?: number;
  pageSize?: number;
}

// ── CRUD ──
// LƯU Ý: baseURL đã có '/api' → path KHÔNG kèm '/api'.
export const getXList = (q: XSearchDto) =>
  apiClient.get<XPagedResult>('/x', { params: q }).then((r) => r.data);

export const getXById = (id: string) =>
  apiClient.get<XDto>(`/x/${id}`).then((r) => r.data);

export const createX = (dto: Partial<XDto>) =>
  apiClient.post<XDto>('/x', dto).then((r) => r.data);

export const updateX = (id: string, dto: Partial<XDto>) =>
  apiClient.put<XDto>(`/x/${id}`, dto).then((r) => r.data);

export const deleteX = (id: string) =>
  apiClient.delete(`/x/${id}`).then((r) => r.data);

// ── Custom action (vd: đổi trạng thái, retry, confirm) ──
export const changeXStatus = (id: string, newStatus: number) =>
  apiClient.post(`/x/${id}/status/${newStatus}`).then((r) => r.data);

// ── Endpoint trả MẢNG THUẦN (không paged) — ví dụ ──
export const getXTypes = () =>
  apiClient.get<{ code: string; name: string }[]>('/x/types').then((r) => r.data);

// ── Object để gom (tuỳ chọn — vài client HIS dùng style này) ──
export const xApi = {
  list: getXList,
  byId: getXById,
  create: createX,
  update: updateX,
  remove: deleteX,
};

/* Nơi tiêu thụ (page) nên defensive khi shape không chắc:
   const b: any = await getXList({ pageSize: 200 });
   const rows = Array.isArray(b) ? b : (b?.items ?? []);
*/
