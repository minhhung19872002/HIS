---
name: his-api-client
description: Use this skill when creating or editing a frontend API client in HIS (`frontend/src/api/*.ts`) that calls the backend via the shared axios `apiClient`. Triggers include "thêm api client cho [module]", wiring a v2/v1 page to backend endpoints, defining request/response DTO interfaces in TypeScript, handling paged vs array responses, or the login token wrapper `{data:{token}}`. Do NOT use for backend controller/service code or for test scripts.
type: project
---

# HIS Frontend API Client

Skill chuẩn hoá cách viết API client TypeScript (`frontend/src/api/<module>.ts`) gọi backend HIS qua axios `apiClient` dùng chung. Đảm bảo đúng base URL, auth header, parse response, và khai báo DTO interface khớp backend.

## Khi nào dùng

- Tạo client mới cho 1 phân hệ (vd: `api/nangcap25.ts`).
- Thêm hàm gọi endpoint mới vào client có sẵn.
- Khai báo interface DTO TS khớp DTO C# backend.

## Khi nào KHÔNG dùng

- Code backend (controller/service/DTO C#) → dùng `his-backend-module-scaffold`.
- Test script gọi API → dùng `his-api-test-powershell` (BE) hoặc `his-e2e-testing` (E2E).
- Dựng UI page → dùng `his-frontend-page-v2`.

## Quy trình chuẩn

### Bước 1 — Tạo `frontend/src/api/<module>.ts`
```ts
import apiClient from './client';

export interface XDto { id: string; code: string; name: string; status: number | string; createdAt: string; }
export interface XSearchDto { keyword?: string; status?: string; pageIndex?: number; pageSize?: number; }
export interface XPagedResult { items: XDto[]; totalCount: number; }

export const getXList   = (q: XSearchDto) => apiClient.get<XPagedResult>('/x', { params: q }).then(r => r.data);
export const getXById   = (id: string)    => apiClient.get<XDto>(`/x/${id}`).then(r => r.data);
export const createX    = (dto: Partial<XDto>) => apiClient.post<XDto>('/x', dto).then(r => r.data);
export const updateX    = (id: string, dto: Partial<XDto>) => apiClient.put<XDto>(`/x/${id}`, dto).then(r => r.data);
export const deleteX    = (id: string)    => apiClient.delete(`/x/${id}`).then(r => r.data);
```
Tham khảo đầy đủ: `references/api-client-template.ts`.

### Bước 2 — Khớp shape với backend
Trước khi viết, **đọc Controller + DTO backend** để biết:
- Route prefix thật (`[Route("api/...")]`) — client gọi path bỏ `/api` (base đã có `/api`).
- Response là **paged** (`{items,totalCount}`) hay **mảng thuần** hay object đơn.
- Tên field PascalCase (C#) → axios trả JSON camelCase (đã cấu hình) — interface TS viết camelCase.

### Bước 3 — Dùng trong page
Page v2 gọi trong `load`/`useEffect`, bọc loading + `tw('...')` (toast warning) khi lỗi.

## Patterns & Conventions

### Base client (`frontend/src/api/client.ts`)
- `apiClient = axios.create({ baseURL: API_URL })` — `API_URL` = `VITE_API_URL` (env), KHÔNG hardcode.
- Request interceptor tự gắn `Authorization: Bearer <token>` từ `localStorage.token`.
- Response interceptor xử lý lỗi chung. Import: `import apiClient from './client'` (default export).

### Login response wrapper
`POST /api/auth/login` trả `{ success, message, data: { token, user } }`.
→ Đọc token tại **`resp.data.data.token`** (KHÔNG `resp.data.token`). Lưu `localStorage` keys `token` + `user`.

### Paged vs Array (rất hay sai)
Một số endpoint trả `{ items, totalCount, ... }`, số khác trả mảng thuần (BE không nhất quán).
Khi không chắc → defensive ở nơi tiêu thụ: `const arr = Array.isArray(b) ? b : (b?.items ?? []);`

### Status field
NangCap ≤23 dùng status **int** (0..4); NangCap24 dùng **string** (`active/done/acked`). Interface để `number | string` nếu dùng chung mapper.

### Error handling
KHÔNG `try/catch` nuốt lỗi trong client. Để lỗi nổi lên page → page hiện `tw()/te()`. Lưu ý: một số phân hệ BE KHÔNG có exception filter → lỗi validation trả **500** (không 400/404) — UI chỉ hiển thị message, không suy luận theo status code.

## Pitfalls

- **Double `/api`**: base URL đã có `/api` → path chỉ viết `/payment/bank/list` (KHÔNG `/api/payment/...`).
- **Token sai chỗ**: login trả token ở `data.data.token`.
- **camelCase vs PascalCase**: interface TS camelCase, không copy nguyên PascalCase từ C#.
- **Hardcode host**: dùng `apiClient` (đã có baseURL từ env). KHÔNG `axios.get('http://localhost:5106/...')` trong code app (chỉ cho phép trong test script).
- **`AllowAnonymous` endpoints** (login, IPN payment, một số `test-types`): không cần token nhưng vẫn gọi qua `apiClient` được.

## Reference

- `references/api-client-template.ts` — khung client đầy đủ (CRUD + paged + search + custom action)

## When to update this skill

- Khi `client.ts` đổi cấu hình (interceptor, baseURL env name, wrapper response).
- Khi convention response (paged shape) thay đổi.
