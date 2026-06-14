---
name: his-fe-convention
description: Use this skill as the mandatory FE coding-convention and architecture guardrail whenever generating or refactoring any HIS frontend code (React + TypeScript + Antd v6 + Vite, pages-v2/_v2kit). Triggers include creating/editing a page or component, adding an api client, refactoring FE code, or reviewing an FE diff before commit. Enforces naming (PascalCase/camelCase/kebab-case/UPPER_CASE), layer separation (UI vs business vs api/service vs state vs validation vs mapper vs constants), folder structure (pages/pages-v2/api/components/hooks/contexts/types/constants/utils), config-driven shared components on Antd base, maintainability/scalability rules, API/data transform layer (no raw-response binding, paged-vs-array, pagination/filter/sort), state placement (local vs context, single source of truth, no Redux/normalized-store over-engineering), security & permission (route guard, permission-based rendering, no hardcoded role, no PII logging), error/loading conventions, backward-compatible incremental refactor, and a self code-review checklist (duplicate logic, dead code, hardcode, god component, long function, import cycle, naming, state, security, error). Do NOT use for backend/SQL (see his-be-*, his-db-migration); pair with his-qa-anti-pattern (cross-tier footguns) and core-* discipline skills.
metadata:
  type: project
---

# HIS Frontend Convention & Architecture Rules

Guardrail BẮT BUỘC cho **mọi** lần generate/refactor code FE HIS (React 19 + TS + Antd v6 + Vite).
Mục tiêu: code luôn đúng convention + kiến trúc hiện có, không lệch giữa các session AISau.
Đọc CÙNG skill chuyên môn (`his-fe-page-v2`, `his-fe-api-client`, `his-fe-antd-v6`…) + `his-fe-library-policy` (cân nhắc + giải thích **chọn thư viện** cho từng nhóm form/data/state/test — tránh "code đại trà") + `core-clean-code` (clean code mức hàm/câu lệnh, FE+BE) + `his-qa-anti-pattern`.

## Khi nào dùng
- Trước/khi tạo hoặc sửa file FE bất kỳ (page, component, hook, service api, type, util).
- Khi refactor FE hoặc review diff FE trước commit.

## Khi nào KHÔNG dùng
- Code BE/SQL → `his-be-*` / `his-db-migration`.

> ⚠️ **Đây là skill QUY TẮC — KHÔNG đứng riêng, KHÔNG tự tạo file.** PHẢI áp **ngay trong lúc viết/sửa
> từng phần code FE** (đặt tên, tách layer, chọn folder, dùng shared component, review diff) — không
> "đọc cho biết rồi bỏ qua". Luôn đi **CÙNG** skill code-gen (`his-fe-page-v2`/`his-fe-api-client`/…).

---

## 1. Naming Convention

| Đối tượng | Quy tắc | Ví dụ HIS |
|---|---|---|
| File component / page | **PascalCase.tsx** | `HealthCheckup.tsx`, `pages-v2/Reception.tsx` |
| Component React | **PascalCase**; page v2 hậu tố `V2` | `const ReceptionV2: React.FC` |
| File api client / hook / util / type | **camelCase.ts** | `api/healthCheckup.ts`, `hooks/useKeyboardShortcuts.ts`, `utils/cccd.ts` |
| Folder | **camelCase** hoặc kebab (theo thư mục có sẵn) | `pages-v2/`, `layouts/terminal/` |
| Hook | **camelCase**, prefix `use` | `usePatientSearch`, `useSigningContext` |
| Service/API function | **camelCase**, động từ + danh từ nghiệp vụ | `searchAppointments`, `createIssueRequest`, `approveSurgery` |
| Biến / state | **camelCase**, danh từ nghĩa rõ | `selectedPatient`, `crudOpen`, `isReminderSent` |
| Props / interface field | **camelCase** | `patientName`, `onRowClick` |
| Event handler | **camelCase**, prefix `on`/`handle` | `onClick`, `handleSubmit`, `openEdit` |
| Boolean | prefix `is/has/should/can` | `isLoading`, `hasPendingOrders`, `canEdit` |
| Type / interface / enum | **PascalCase**; DTO hậu tố `Dto` khớp BE | `interface SurgeryDto`, `type StatusKey` |
| Constant / config | **UPPER_CASE** (module-level immutable) | `HOSPITAL_NAME`, `STATUS_TABS`, `PAGE_SIZE` |

- **Tên phản ánh DOMAIN/nghiệp vụ**, không kỹ thuật chung chung: `prescriptionItems` ✅ chứ không `dataList`/`arr`/`tmp`.
- **Không viết tắt khó hiểu**: `medicalRecord` ✅ chứ không `mr/medRec`. Cho phép viết tắt phổ biến của dự án: BN (bệnh nhân), CLS, KSK, CCHN, BHYT.
- DTO field PHẢI khớp tên BE (camelCase JSON) — không tự đổi tên ở FE.
- **Props interface đặt tên `<TênComponent>Props`** (PascalCase + hậu tố `Props`), field camelCase: `interface ReceptionPaymentProps { ... }`. Component có props → luôn khai báo interface, không dùng inline `{ x }: { x: T }` cho props phức tạp.
- **Export — KHÔNG đồng nhất, theo LAYER (đừng ép named export toàn bộ):**
  - **Page-v2** (`pages-v2/*.tsx`) → **`export default`** (bắt buộc, để `React.lazy(() => import(...))` trong `App.tsx`). Vd `export default ReceptionV2;`.
  - **Component tái dùng / biểu mẫu in / util / hook / `_v2kit`** → **named export** (`export const PatientTimeline`, `export function toSignatureStamp`) để barrel `export *` + import chọn lọc.
  - File tách từ god-file → giữ **named export** cho từng phần + `index.ts` barrel re-export (giữ đường import cũ).

## 2. FE Architecture Rules (tách layer)

Tách 7 lớp, KHÔNG trộn:
1. **UI component** (`pages-v2/*.tsx`, `components/*.tsx`) — render + sự kiện; KHÔNG chứa business logic/fetch phức tạp.
2. **API/service** (`api/<domain>.ts`) — mọi gọi axios + DTO interface. UI KHÔNG gọi axios trực tiếp.
3. **Business logic / state** — `hooks/`, `contexts/` (vd `AuthContext`, `NotificationContext`, `useSigningContext`).
4. **Validation** — rule client (Antd Form rules) **chỉ hỗ trợ UX**; **BE là nguồn validate chuẩn** (map lỗi BE→field qua `applyServerErrors`). Xem `core-validation-pattern`.
5. **Mapper/transform** — hàm `mapXToY` riêng (vd `mapVictimToCase`), không nhét logic biến đổi vào JSX.
6. **Constants/config** — `constants/` (vd `HOSPITAL_NAME`), option list khai báo `const X_TABS = [...]` cấp module, KHÔNG hardcode rải rác trong JSX.
7. **Types** — `interface`/`type` cho DTO + props.

Quy tắc:
- **KHÔNG** đặt business logic trong hàm render. Tính toán phức tạp → `useMemo`/helper thuần.
- **KHÔNG** gọi API trực tiếp trong component lớn nếu tách được → dùng `api/*.ts` + (nếu lặp) custom hook.
- **Shared component config-driven + reusable** (xem mục 5). Tránh duplicate logic/CSS/hardcode data.
- Ưu tiên **composition** hơn copy/paste component.

## 3. Maintainability & Scalability (HIS enterprise)

- Component lớn → tách theo **responsibility** (vd `<XDrawerBody>`, `<XForm>`, panel con) — không god-component.
- **Function quá dài (> ~60 dòng / nhiều việc)** → tách helper/usecase riêng.
- Hạn chế **prop drilling** sâu → dùng context khi state xuyên nhiều cấp (đã có `Auth/Notification/Signing` context).
- **Typed model rõ ràng** — không `any` bừa (chỉ `// eslint-disable` khi thật cần + ghi lý do).
- Chuẩn hoá **error/loading/empty state** (xem `core-error-loading-state`): `loading` flag, empty placeholder, `message.error`/`te()` khi fetch fail — KHÔNG nuốt lỗi im lặng.
- Ưu tiên **config/schema-driven** khi hợp (vd `CrudFieldCfg[]` cho form, `ColumnDef[]` cho bảng, `STATUS_TABS` cho tab).
- Hạn chế **side effect trong render** — đặt trong `useEffect`.
- **Centralized constants/enums** — status code, label, tone map khai báo 1 nơi/module.

## 4. Folder Structure Rules

`frontend/src/`:
| Thư mục | Chứa | Khi nào |
|---|---|---|
| `pages-v2/` | page v2 (TerminalLayout, route `/v2/*`) — **layer chính hiện nay** | feature mới mặc định ở đây |
| `pages/` | page v1 (Antd MainLayout, route gốc) — legacy | chỉ sửa khi đụng v1 |
| `pages-v2/_v2kit.tsx` | **kit shared chuẩn V2** (Btn, DataTable, CrudModal, OptionsSelect…) | reuse trước khi tạo mới |
| `api/<domain>.ts` | axios client + DTO theo domain | mọi call BE |
| `components/` | component dùng lại **cross-page** (vd `BarcodeScanner`, `PatientTimeline`, `ErrorBoundary`) | dùng ≥2 page |
| `hooks/` | custom hook tái dùng | logic stateful lặp lại |
| `contexts/` | React context (auth, notification, signing) | state global/xuyên cấp |
| `layouts/` | layout shell (`terminal/`, `MainLayout`) + CSS design (`ab-module.css`) | — |
| `types/` | type/interface dùng chung | contract chia sẻ |
| `constants/` | hằng số nghiệp vụ (`hospital.ts`) | dữ liệu cố định |
| `utils/` | hàm thuần không phụ thuộc React | helper chung |

- **Shared khi**: dùng ≥2 nơi HOẶC là design-primitive → đưa vào `_v2kit`/`components/`.
- **Giữ local theo module khi**: chỉ 1 page dùng (sub-component, field config, mapper riêng) → khai báo ngay trong file page đó.
- **★ KHÔNG đặt file mới ở root** repo hay ngoài cây thư mục — luôn vào đúng thư mục theo loại ở trên. Thiếu thư mục phù hợp → **đề xuất user tạo thư mục** rồi mới đặt file (xem `his-qa-anti-pattern` #28-29).

## 5. Component Rules

- **★ REUSE-FIRST (BẮT BUỘC, cả FE):** trước khi viết component/hook/util/api mới → **tìm xem đã tồn tại chưa**
  (grep `_v2kit`, `components/`, `hooks/`, `utils/`, `api/`, `constants/`). Đã có → **dùng lại / mở rộng / compose**,
  KHÔNG tạo trùng. Xem `core-reusable-code`.
- **★ ANTD-FIRST (BẮT BUỘC):** luôn ưu tiên component **Ant Design v6** (hoặc primitive `_v2kit` đã wrap Antd)
  làm base. **KHÔNG viết HTML/CSS thuần** (`<div>`/`<input>`/`<select>`/`<table>`/`<button>` tự dựng) để mô phỏng
  thứ Antd/`_v2kit` đã có (Input/Select/Radio/Checkbox/Table/Modal/Tabs/DatePicker/`Btn`/`DataTable`/`CrudModal`…).
  Chỉ dựng/tự-style khi (a) là design-primitive terminal `ab-*` đã quy ước, hoặc (b) Antd thật sự không đáp ứng — và khi đó **gói vào shared component**, không rải raw HTML khắp page.
- **Input/Select/Radio/Checkbox/Table/Modal nhận config JSON** thay hardcode option inline:
  dùng `OptionsSelect` / `RadioField` / `CheckboxField` / `AbSelect` / `CrudModal` (`CrudFieldCfg[]`) + `normalizeOptions`/`fieldNames` (map label/value/disabled/group/children/custom-field/async). Định nghĩa + cách dùng kit: `frontend/src/pages-v2/_v2kit.tsx`.
- **Typed props đầy đủ** cho mọi component.
- **KHÔNG tạo wrapper vô nghĩa** chỉ để bọc 1 lớp Antd không thêm giá trị.
- Antd v6: dùng prop mới (`orientation`/`title`/`size`/`destroyOnHidden`…), tránh deprecated — xem `his-fe-antd-v6`.

## 6. Refactor Rules

Ưu tiên (đọc cùng `core-refactor`):
1. **Backward compatibility** — không break API/props/flow HIS hiện tại.
2. **Không đổi behavior ngoài scope** + **không đổi style** trừ khi được yêu cầu.
3. **Migrate dần** thay vì rewrite toàn bộ ("gọi lại component shared khi cần", không mass-replace cơ học).
4. KHÔNG replace cơ học khi logic/style đặc biệt khác (vd standalone portal light-theme, radio có mô tả riêng).

Khi phát hiện **technical debt** → note rõ:
- **Mức độ ảnh hưởng** (page nào / số chỗ).
- **Hướng refactor** phù hợp.
- **Dependency liên quan** (component/api/contract bị chạm).

## 7. Code Review Rules (AI tự kiểm trước khi báo xong)

Checklist tự rà mỗi diff FE — **= self-review 9 điểm canonical (`his-qa-anti-pattern` #30) ở góc nhìn FE + 2 lát-cắt FE bổ sung (API/Data-transform, Security/Permission-render)**. KHÔNG phải checklist độc lập; "9 điểm" trích ở hook/checklist vẫn đúng, FE chỉ thêm chi tiết:
- [ ] **Duplicate logic / CSS** — đã reuse `_v2kit`/`components`/helper chưa?
- [ ] **Dead code** — import/biến/hàm không dùng (lưu ý `noUnusedLocals=false` ở `tsconfig.app` → tự dọn, đừng để rác).
- [ ] **Hardcode data** — tên BV/URL/credential/option phải lấy từ `constants`/config/`api` (KHÔNG mock cứng).
- [ ] **Anti-pattern** — xem `his-qa-anti-pattern` (cy.intercept('**/*'), nuốt lỗi…).
- [ ] **God component / function quá dài** — tách nhỏ theo responsibility.
- [ ] **Import cycle** — không vòng lặp import.
- [ ] **Naming** — đúng mục 1; tên domain rõ nghĩa.
- [ ] **State management** — state đặt đúng cấp (local vs context), không prop-drill sâu, không side effect trong render (§8).
- [ ] **API/Data** — call qua `api/*.ts`, không bind response thô vào UI, paged-vs-array đã chuẩn hoá (§8).
- [ ] **Security/Permission** — route trong guard, ẩn hành động theo quyền, KHÔNG hardcode role, không log PII (§9).
- [ ] **Error/Loading** — đủ loading/empty/error, lỗi API chuẩn hoá, `console.warn` cho lỗi kỳ vọng (§10).
- [ ] **Build sạch** — `npm run build` (tsc -b strict + vite) EXIT 0 trước khi báo xong; `tsc --noEmit` không đủ.

## 8. API & Data / State (transform + nguồn dữ liệu)

- **Mọi call BE qua `api/<domain>.ts`** (axios `apiClient` chung) — UI/component KHÔNG `axios`/`fetch` trực tiếp.
- **KHÔNG bind thẳng response API thô vào UI** khi shape lệch nhu cầu hiển thị → có **DTO interface** + (khi cần) **mapper** `mapXToVm`. Field hiển thị suy ra đặt ở mapper/`useMemo`, không tính trong JSX.
- **Paged vs array**: BE có chỗ trả mảng trần, chỗ trả `{items,totalCount}` → luôn chuẩn hoá `Array.isArray(b)?b:(b.items??[])` (xem `his-fe-api-client`).
- **Pagination/filter/sort**: client-side cho list ≤ vài trăm dòng (đang dùng `Pager`+`useMemo` filter); list lớn → server-side qua tham số `pageIndex/pageSize/keyword`. Giữ NHẤT QUÁN tên tham số với BE.
- **State**: đặt **đúng cấp** — local (`useState`) cho UI cục bộ; **Context** (`Auth/Notification/Signing`) cho state xuyên nhiều cấp; **single source of truth**, derived bằng `useMemo` (KHÔNG copy thành state lệch). Sau mutation → **refetch** (`load()`), không tự sửa cache tay.
  - ⚠️ **KHÔNG over-engineer**: dự án **không** dùng Redux/normalized store/state-machine — đừng đề xuất. Context + local + refetch là chuẩn hiện tại.

## 9. Security & Permission (HIS — dữ liệu BN nhạy cảm)

- **Route guard**: trang nội bộ phải sau `ProtectedRoute` (JWT) trong layout; cổng ngoài → `his-fe-standalone-portal` (login/role riêng). KHÔNG để route lộ ngoài guard.
- **Permission-based rendering**: ẩn/hiện nút/menu/tab theo role/permission của user (đọc từ `AuthContext`), KHÔNG render hành động user không có quyền. **BE vẫn phải authorize** (FE ẩn chỉ là UX, không phải bảo mật).
- **KHÔNG hardcode role/permission** rải rác → so khớp qua hằng số/enum tập trung; thêm role mới sửa 1 nơi.
- **Dữ liệu nhạy cảm**: KHÔNG log token/PII ra console; KHÔNG nhét secret vào bundle (chỉ `VITE_*` công khai); che/min thông tin BN theo quyền.

## 10. Error Handling & Logging

- **Mọi fetch/submit** có `loading` + `empty` + `error` (xem `core-error-loading-state`). KHÔNG để trắng/spinner-vĩnh-viễn/lỗi im lặng.
- **Chuẩn hoá lỗi API**: đọc `e?.response?.data?.message` để hiện thông báo; lỗi validate BE → map vào field (`applyServerErrors`).
- **Thông báo**: dùng Antd `message`/helper `tk/ti/tw/te` (kit) — nhất quán, KHÔNG `alert()`.
- **Logging**: lỗi API "kỳ vọng/được phép" → `console.warn` (convention dự án), KHÔNG `console.error` gây nhiễu; bỏ `console.log` debug trước khi báo.
- **ErrorBoundary** đã có ở layout — không nuốt lỗi runtime; lỗi nghiệp vụ thì báo người dùng, không crash trắng trang.

> Mục tiêu: session AI sau đọc skill này là biết đặt tên / tách layer / dựng folder / dùng shared component /
> xử lý data-state-security-error đúng kiến trúc HIS hiện có — không generate lệch convention, không quên kit sẵn có,
> KHÔNG over-engineer (xem ranh giới ở §8 + `core-minimal-change`).
