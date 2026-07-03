// TEMPLATE — HIS frontend API client. Copy into frontend/src/api/<module>.ts
// Replace X/x with the entity name. Delete unused parts.
import apiClient from './client';

// ── DTO interfaces (camelCase — match the backend JSON, do NOT copy C# PascalCase) ──
export interface XDto {
  id: string;
  code: string;
  name: string;
  status: number | string;   // NangCap<=23: int 0..4 ; NangCap24: string
  createdAt: string;
  // ...add fields per the backend DTO
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
// NOTE: the baseURL already has '/api' → the path does NOT include '/api'.
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

// ── Custom action (e.g. change status, retry, confirm) ──
export const changeXStatus = (id: string, newStatus: number) =>
  apiClient.post(`/x/${id}/status/${newStatus}`).then((r) => r.data);

// ── An endpoint returning a PLAIN ARRAY (not paged) — example ──
export const getXTypes = () =>
  apiClient.get<{ code: string; name: string }[]>('/x/types').then((r) => r.data);

// ── An object to bundle them (optional — some HIS clients use this style) ──
export const xApi = {
  list: getXList,
  byId: getXById,
  create: createX,
  update: updateX,
  remove: deleteX,
};

/* The consumer (page) should be defensive when the shape is uncertain:
   const b: any = await getXList({ pageSize: 200 });
   const rows = Array.isArray(b) ? b : (b?.items ?? []);
*/
