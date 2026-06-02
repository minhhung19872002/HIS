---
name: his-fe-library-policy
description: Use this skill before generating or refactoring any HIS frontend code to make a deliberate, justified library choice per category (forms, validation, API/data-fetching, client state, dates, charts, testing, error handling) instead of reflexively reusing one pattern ("code đại trà"). Triggers include creating/editing a page/component/form/api-client/hook in frontend/src, deciding how to fetch data or manage state, adding a form with validation, picking a chart or test approach, or any "which library should I use / nên dùng thư viện nào" decision. Encodes the HIS DEFAULT per category (Antd v6 Form + _v2kit CrudModal/applyServerErrors for forms, axios apiClient + useEffect/refetch for data, local useState + Context for state, dayjs for dates, recharts for charts, Cypress + Playwright for tests) AND a controlled adoption path for libraries NOT yet installed (react-hook-form + zod + @hookform/resolvers, @tanstack/react-query, Zustand, Vitest + Testing Library): permitted only when measurably better for that case, with explicit user approval + npm install + incremental coexistence, never a blanket rewrite of existing Antd-Form/axios pages. Do NOT use for backend/SQL library choices, and never as a license to introduce a new dependency silently. Pair with his-fe-convention, his-fe-page-v2, his-fe-api-client, his-fe-performance, core-architecture-consistency, core-minimal-change.
metadata:
  type: project
---

# HIS Frontend — Library Decision Policy

> TẦNG: **B · HIS (FE)**. Kỷ luật **cân nhắc + giải thích chọn thư viện** TRƯỚC khi gen/refactor code FE —
> để code **fit-for-purpose**, KHÔNG "code đại trà" (phản xạ lặp 1 pattern cho mọi bài toán).
> Đi CÙNG `his-fe-convention` (guardrail) + skill code-gen (`his-fe-page-v2`/`his-fe-api-client`).

## Nguyên tắc vàng
1. **Cân nhắc trước khi viết:** mỗi lần gen FE, với mỗi nhóm (form / validate / data-fetch / state / date / chart / test / error) → nêu RÕ 1 dòng "dùng X vì Y". Không mặc định copy pattern cũ mà không nghĩ.
2. **Mặc định = lib HIS đang dùng** (bảng dưới) → giữ nhất quán, không phá 200+ page, không thêm dep thừa.
3. **Tích hợp lib MỚI khi tối ưu rõ rệt** (đo được/lý do cụ thể) — KHÔNG cấm tuyệt đối, nhưng qua **cổng**: (a) giải thích tại sao default không đủ → (b) **hỏi user duyệt** → (c) `npm install` → (d) **coexist** (chỉ áp cho code MỚI, KHÔNG mass-rewrite code cũ) → (e) build/typecheck/eslint pass.
4. **Không over-engineer:** lib mới thêm phụ thuộc + learning-curve + bundle → chỉ khi giá trị > chi phí (`core-minimal-change`, `his-fe-performance` đo trước khi tối ưu).

## Khi nào dùng
- Trước khi tạo/sửa page, component, form, api client, hook; khi chọn cách fetch data / quản state / validate / vẽ chart / viết test.

## Khi nào KHÔNG dùng
- Chọn lib BE/SQL → `his-be-*`. KHÔNG dùng skill này để lén thêm dep (luôn cần user duyệt).

## Bảng quyết định (DEFAULT HIS · CONSIDER lib mới khi…)

| Nhóm | DEFAULT (đang dùng, ưu tiên) | CONSIDER lib mới khi… (qua cổng mục 3) |
|---|---|---|
| **Form** | **Antd v6 `Form`** + `_v2kit` `CrudModal`/`applyServerErrors` (`form.validateFields`) | `react-hook-form` (+`@hookform/resolvers`): form **rất phức tạp** (mảng động lớn, nested sâu, cross-field, re-render nặng đo được) mà Antd Form vướng |
| **Validate** | Antd `Form` rules (client) + **BE là authoritative** (P0 — không tin client) | `zod`: schema dùng chung/nhiều nơi, parse dữ liệu ngoài, validate phức tạp tái dùng |
| **Data fetch** | **axios** (`api/*` qua `apiClient`) + `useEffect`+`useState`+`.then`/`reload()` (hoặc hook nhỏ) | `@tanstack/react-query`: cần **cache/refetch/invalidate/optimistic/pagination** chia sẻ nhiều component (server-state nặng) |
| **HTTP** | **axios** (`apiClient` — interceptor token sẵn) | `fetch` thuần chỉ khi có lý do (stream, không cần interceptor) — phải justify |
| **State** | **local `useState` trước** → **Context** cho cross-tree | `Zustand`: global client-state chia sẻ rộng, update thường xuyên, Context gây re-render đau (đo được). **TRÁNH Redux** |
| **Date** | **`dayjs`** (luôn) | — |
| **Chart** | **`recharts`** (đã dùng: Dashboard, LabQC Levey-Jennings) | lib chart khác chỉ khi recharts không vẽ được loại biểu đồ cần |
| **Test** | **Cypress** (E2E + component) + **Playwright** (E2E) | `Vitest` + `@testing-library`: unit/logic/hook test nhanh (cần cài + setup) |
| **Error** | `ErrorBoundary` ở ranh giới route/page · **KHÔNG silent fail** (`message` + `console.warn` lỗi-dự-kiến / `console.error` bất ngờ) · đủ error/loading/empty (`core-error-loading-state`) | — |

> Lib hiện **CÓ** trong `package.json`: antd, axios, dayjs, recharts, react-router-dom, @microsoft/signalr, cornerstone, qrcode.react, xlsx, cypress, @playwright/test.
> Lib **CHƯA cài** (cần cổng mục 3 mới thêm): react-hook-form, zod, @hookform/resolvers, @tanstack/react-query, zustand, vitest, @testing-library/*.

## Quy tắc khi THÊM lib mới (bắt buộc đủ 5)
1. Nêu vấn đề default không giải quyết tốt (cụ thể, đo được nếu là perf).
2. **Hỏi user duyệt** (lib + lý do + chi phí bundle/dep) — KHÔNG tự cài.
3. `npm install` đúng package (+ devDependency nếu là test/tooling).
4. **Coexist:** chỉ dùng cho phần MỚI; KHÔNG mass-migrate Antd-Form/axios/Context cũ (`core-minimal-change`, backward-compat).
5. Build-gate: `npm run build` (tsc -b + vite) EXIT 0 + eslint pass mới báo xong.

## Chất lượng (P0 — luôn áp)
- Pass **eslint** + **typecheck** + **build** trước khi báo xong (đã là build-gate `his-qa-anti-pattern` #27).
- Không thêm dep "phòng xa"; không introduce lib mới rồi để code cũ + mới lệch pattern không lý do.

## Liên quan
`his-fe-convention` (ANTD-FIRST + layer) · `his-fe-page-v2` (page v2 `_v2kit`) · `his-fe-api-client` (axios pattern) · `his-fe-performance` (đo trước khi tối ưu) · `core-architecture-consistency` (theo tiền lệ) · `core-minimal-change` (YAGNI).