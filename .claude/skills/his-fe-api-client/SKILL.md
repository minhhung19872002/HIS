---
name: his-fe-api-client
description: Use this skill when creating or editing a frontend API client in HIS (`frontend/src/api/*.ts`) that calls the backend via the shared axios `apiClient`. Triggers include "add an api client for [module]", wiring a v2/v1 page to backend endpoints, defining request/response DTO interfaces in TypeScript, handling paged vs array responses, or the login token wrapper `{data:{token}}`. Do NOT use for backend controller/service code or for test scripts.
metadata:
  type: project
---

# HIS Frontend API Client

A skill standardizing how to write a TypeScript API client (`frontend/src/api/<module>.ts`) calling the HIS backend via the shared axios `apiClient`. Ensures the right base URL, auth header, response parsing, and DTO interfaces matching the backend.

## When to use

- Creating a new client for a module (e.g. `api/nangcap25.ts`).
- Adding a function calling a new endpoint to an existing client.
- Declaring a TS DTO interface matching a C# backend DTO.

## When NOT to use

- Backend code (controller/service/C# DTO) → use `his-be-module-scaffold`.
- A test script calling the API → use `his-test-api-powershell` (BE) or `his-test-e2e` (E2E).
- Building a UI page → use `his-fe-page-v2`.

## Standard process

### Step 1 — Create `frontend/src/api/<module>.ts`
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
Full reference: `references/api-client-template.ts`.

### Step 2 — Match the shape with the backend
Before writing, **read the backend Controller + DTO** to know:
- The real route prefix (`[Route("api/...")]`) — the client calls the path without `/api` (the base already has `/api`).
- Whether the response is **paged** (`{items,totalCount}`), a **plain array**, or a single object.
- PascalCase field names (C#) → axios returns camelCase JSON (configured) — write the TS interface camelCase.

### Step 3 — Use it in a page
A v2 page calls it in `load`/`useEffect`, wrapping loading + `tw('...')` (warning toast) on error.

## Patterns & Conventions

### Base client (`frontend/src/api/client.ts`)
- `apiClient = axios.create({ baseURL: API_URL })` — `API_URL` = `VITE_API_URL` (env), do NOT hardcode.
- The request interceptor auto-attaches `Authorization: Bearer <token>` from `localStorage.token`.
- The response interceptor handles common errors. Import: `import apiClient from './client'` (default export).

### Login response wrapper
`POST /api/auth/login` returns `{ success, message, data: { token, user } }`.
→ Read the token at **`resp.data.data.token`** (NOT `resp.data.token`). Save `localStorage` keys `token` + `user`.

### Paged vs Array (very commonly wrong)
Some endpoints return `{ items, totalCount, ... }`, others a plain array (BE is inconsistent).
When unsure → be defensive at the consumer: `const arr = Array.isArray(b) ? b : (b?.items ?? []);`

### Status field
NangCap ≤23 uses an **int** status (0..4); NangCap24 uses a **string** (`active/done/acked`). Type it as `number | string` if a shared mapper is used.

### Error handling
Do NOT `try/catch` swallowing the error in the client. Let the error bubble to the page → the page shows `tw()/te()`. Note: some BE modules have NO exception filter → a validation error returns **500** (not 400/404) — the UI only shows the message, don't infer from the status code.

## Pitfalls

- **Double `/api`**: the base URL already has `/api` → the path is just `/payment/bank/list` (NOT `/api/payment/...`).
- **Token in the wrong place**: login returns the token at `data.data.token`.
- **camelCase vs PascalCase**: the TS interface is camelCase, don't copy PascalCase verbatim from C#.
- **Hardcoding the host**: use `apiClient` (it has the baseURL from env). NO `axios.get('http://localhost:5106/...')` in app code (only allowed in a test script).
- **`AllowAnonymous` endpoints** (login, payment IPN, some `test-types`): don't need a token but can still be called via `apiClient`.

## Reference

- `references/api-client-template.ts` — a full client frame (CRUD + paged + search + custom action)

## When to update

- When `client.ts` changes config (interceptor, baseURL env name, response wrapper).
- When the response convention (paged shape) changes.
