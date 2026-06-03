---
name: his-fe-page-v2
description: Use this skill when creating or editing a v2 frontend page in HIS (route `/v2/*`, TerminalLayout). Triggers include "tạo page v2", "thêm màn hình v2 cho [module]", build a list/detail screen with KPI strip + status tabs + table + drawer using the `_v2kit` design pack and `ab-*` CSS, wire it to an `api/*.ts` client, register the route in App.tsx and the menu in TerminalLayout. Do NOT use for v1 Antd pages (pages/, MainLayout).
metadata:
  type: project
---

# HIS Frontend Page v2

Skill chuẩn hoá cách tạo 1 trang **v2** (giao diện TerminalLayout, prefix route `/v2/*`) bằng design pack `_v2kit` + CSS `ab-*`. Đây là layer UI chính của HIS hiện nay (toàn bộ 121 route đã chuyển v2). KHÔNG dùng cho page v1 (Antd MainLayout trong `pages/`).

> Polish thẩm mỹ: áp kèm `core-ui-aesthetics` (gu + tiết chế, chống "AI-slop", KHÔNG hại UX) + `core-accessibility-pattern` (a11y/contrast) — bám đúng token `ab-*` + primitive `_v2kit`, giữ mật độ "terminal" của HIS.

## Khi nào dùng

- Tạo màn hình mới dạng danh sách + chi tiết (vd: phân hệ NangCapNN mới).
- Chuyển 1 page v1 (`pages/X.tsx`) sang v2 (`pages-v2/X.tsx`).
- Sửa/ thêm tab, cột bảng, KPI, drawer cho page v2 có sẵn.

## Khi nào KHÔNG dùng

- Page v1 Antd (MainLayout, `pages/`) → không thuộc skill này.
- Viewer toàn màn hình (DICOM viewer) — không theo khuôn list/detail.
- Tạo API client backend → dùng `his-fe-api-client`.
- Tạo test cho page → dùng `his-test-e2e`.

## Hai cách dựng page (chọn đúng)

| Cách | Khi nào | Độ dài |
|---|---|---|
| **`SimpleV2Page<T>`** (khuyến nghị) | List + filter + status tab + drawer chuẩn | ~80–150 dòng |
| **Bespoke** (tự ráp primitives) | Layout đặc thù (dashboard, grid, form lớn, nhiều panel) | tuỳ |

→ Mặc định dùng `SimpleV2Page<T>`. Chỉ bespoke khi layout không vừa khuôn.

## Quy trình chuẩn (SimpleV2Page)

### Bước 1 — Chuẩn bị API client
Phải có `frontend/src/api/<module>.ts` export hàm `getX(...)` + interface `XDto`.
Nếu chưa có → tạo trước bằng skill `his-fe-api-client`.

### Bước 2 — Tạo `frontend/src/pages-v2/<Name>.tsx`
Theo `references/v2-page-template.tsx`. Cấu trúc:
- `StatusKey` + `STATUS_TABS: StatusTab<StatusKey>[]` + hàm `statusKey(row) → StatusKey`
- `columns: ColumnDef<TDto>[]` (mỗi cột có `render`, `mono`/`code`/`width` nếu cần)
- `<SimpleV2Page<TDto> title load rowKey columns searchOf statusTabs statusOf kpis drawer drawerTitle drawerSub />`
- Drawer body dùng `.rec-section` + `.rec-kv` (xem template) hoặc `DrSec`/`DrField`

### Bước 3 — Đăng ký route trong `App.tsx`
```tsx
// (1) gần khối lazy import v2
const XNameV2 = lazy(() => import('./pages-v2/XName'));
// (2) trong khối <Route> dưới prefix /v2
<Route path="x-name" element={<XNameV2 />} />
```
→ URL đầy đủ là `/v2/x-name`.

### Bước 4 — Đăng ký menu trong `TerminalLayout.tsx`
Thêm item vào đúng `items: [...]` của nhóm phù hợp (clinical / paraclinical / support / finance / records / management / integration / public-health):
```ts
{ id: 'x-name', path: '/v2/x-name', label: 'Nhãn hiển thị' },
```

### Bước 5 — Verify
```powershell
cd frontend
npx tsc --noEmit          # phải 0 lỗi (tsc -b nghiêm hơn — chạy npm run build trước commit)
npm run build             # tsc -b + vite — KHÔNG được lỗi
```

## Patterns & Conventions (`_v2kit` — `frontend/src/pages-v2/_v2kit.tsx`)

Primitives dùng lại (KHÔNG tự code lại):
- `KpiStrip` / `KpiItem` — dải KPI; `tone: 'ok'|'info'|'warn'|'crit'`
- `TopTabs<T>` (tab đổi nguồn dữ liệu) vs `StatusTabs<T>` (tab lọc data hiện tại — dùng `v`/`l`/`tone`)
- `SearchBox`, `Filter` (options dạng `{ v, l }[]` — KHÔNG `{value,label}`)
- `DataTable<T>` — props `columns`, `data`, `rowKey`, `onRowClick`, `actions`; cột `ColumnDef<T>` `{key,label,render?,mono?,code?,width?}`
- `Pager`, `StatusBadge` (`tone` + `dot`), `ActBtn` (`{ic,title,onClick,tone}`)
- `DrawerShell` / `ModalShell` (declarative, caller giữ `open` state — KHÔNG `HUI.drawer(...)`)
- `DrSec` (title + children), `DrField` (`lbl` + children)
- Helpers: `fmtVNDg`, `fmtHMg`, `fmtDMYg`, `fmtDTg`; toast `tk/ti/tw/te`; confirm `cf`
- Icon: `import TermIcon from '../layouts/terminal/Icon'`

CSS class hay dùng trong drawer: `.rec-section` + `<h5>` + `.rec-kv` (grid label/value), `.cell-2l` (cell 2 dòng), `.mono`.

Token màu: `var(--a-cy)`, `var(--s-crit)`, `var(--s-warn)`, `var(--t-0/1/2)`, `var(--line)`.

## Pitfalls (đã dính)

- **`Filter` options là `{ v, l }`** không phải `{ value, label }` — sai → không render.
- **`TopTabs` dùng `tab`/`setTab`**, còn `StatusTabs` dùng `value`/`onChange` — dễ copy nhầm.
- **`StatusTab.tone` chỉ `'ok'|'info'|'warn'|'crit'`** — `'ghost'`/`undefined` lọt `tsc --noEmit` nhưng fail `tsc -b`. Luôn chạy `npm run build`.
- **API trả paged vs array**: nhiều endpoint trả `{items,totalCount}`, vài cái trả mảng thuần. Trong `load` phải xử lý đúng (`(await getX()).items` vs `await getX()`). Defensive: `Array.isArray(b) ? b : b?.items ?? []`.
- **Route path tương đối** dưới `/v2` — viết `path="x-name"` (KHÔNG `/v2/x-name`) trong `<Route>`.
- **Menu group**: phải thêm vào đúng `items` của nhóm trong `TerminalLayout.tsx` (không phải MainLayout — đó là v1).
- KHÔNG hardcode tên bệnh viện/URL — dùng constant `frontend/src/constants/hospital.ts` / env var.

## Reference

- `references/v2-page-template.tsx` — khung page v2 đầy đủ dùng `SimpleV2Page`
- `references/v2kit-cheatsheet.md` — bảng tra nhanh mọi export của `_v2kit` + props

## When to update

- Khi `_v2kit.tsx` thêm/đổi primitive hoặc props.
- Khi đổi convention route (`/v2` prefix) hoặc cấu trúc menu TerminalLayout.
- Khi thêm helper/CSS class mới dùng chung.
