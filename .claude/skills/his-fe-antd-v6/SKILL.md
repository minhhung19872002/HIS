---
name: his-fe-antd-v6
description: Use this skill when writing or editing React UI in HIS that uses Ant Design v6 (mostly v1 pages in `frontend/src/pages/`, MainLayout). Triggers include using antd components (Space, Alert, Drawer, Timeline, List, Tabs, Modal, Statistic), fixing antd deprecation warnings/console errors, or migrating deprecated props. Do NOT use for v2 pages built with the `_v2kit`/`ab-*` design pack (use his-fe-page-v2).
metadata:
  type: project
---

# HIS Ant Design v6 Conventions

Skill ghi nhớ cách dùng **Ant Design v6** đúng trong HIS và tránh các deprecated props đã được migrate hàng loạt (xem CLAUDE.md "Antd v6 Migration Notes"). Áp dụng chủ yếu cho page v1 (`pages/`, MainLayout). Page v2 dùng design pack riêng — xem `his-fe-page-v2`.

## Khi nào dùng

- Viết/sửa component Antd trong page v1.
- Fix console warning/error kiểu `[antd: ...] deprecated`.
- Thấy prop cũ (`Space direction`, `Alert message`, `Drawer width`...) cần đổi sang API v6.

## Khi nào KHÔNG dùng

- Page v2 (`pages-v2/`, `_v2kit`, `ab-*`) → dùng `his-fe-page-v2`.
- Logic API/test → dùng skill tương ứng.

## Deprecated props → API v6 (BẮT BUỘC đổi)

| Component | Prop CŨ (deprecated) | Prop MỚI v6 |
|---|---|---|
| `Space` | `direction="vertical"` | `orientation="vertical"` |
| `Alert` | `message="..."` | `title="..."` |
| `Drawer` | `width={...}` | `size="default"\|"large"` (hoặc `size={number}`) |
| `Timeline` | `<Timeline><Timeline.Item>` + `children` | `items={[{ content, ... }]}` |
| `List` (deprecated component) | `<List dataSource render/>` | div-based custom render (tránh blank render bug) |
| `Tabs` | `tabPosition="..."` | `tabPlacement="..."` |
| `Modal`/`Drawer` | `destroyOnClose` | `destroyOnHidden` |
| `Statistic` | `valueStyle={...}` | `styles={{ content: {...} }}` |

→ Chi tiết + ví dụ trước/sau: `references/deprecations-cheatsheet.md`.

## Convention bổ sung

### API error logging
Theo convention dự án: log lỗi API kỳ vọng (expected failure) bằng **`console.warn`**, KHÔNG `console.error`. (Test smoke bắt `console.error` — dùng `error` sẽ làm fail test.)

### Empty / Loading / Error state
- Loading: bọc `<Spin>` quanh nội dung.
- Empty: hiển thị "Chưa có dữ liệu" (Antd `<Empty>` hoặc text).
- Error fetch: `message.warning(...)` / `message.error(...)` + set state rỗng (KHÔNG hiện mock data).

### Form
- Dùng `Form.useForm()` + `Form.Item name=...`. Tránh warning "not connected to any Form element" (đặt input trong `<Form>`).

### Icon
Page v1 dùng `@ant-design/icons`. Page v2 dùng `TermIcon` (`layouts/terminal/Icon`) — KHÔNG trộn.

## Pitfalls (đã dính)

- **`List` deprecated render blank**: component `List` cũ render trắng ở 1 số case → đã thay bằng div custom ở 6 page (Prescription, Dashboard, Quality, HR, EmergencyDisaster, PatientPortal). Khi gặp List → cân nhắc div-based.
- **`console.error` làm fail smoke test**: đổi sang `console.warn` cho lỗi API kỳ vọng.
- **`destroyOnClose` cảnh báo deprecated** → `destroyOnHidden`.
- **Trộn v1/v2 UI**: KHÔNG import `_v2kit`/`ab-*` vào page v1, và ngược lại không dùng Antd primitive thô trong page v2 (page v2 dùng design pack).
- **Hardcode tên BV/URL**: dùng `constants/hospital.ts` (HOSPITAL_NAME/ADDRESS/PHONE), env `VITE_ORTHANC_URL`...

## Verify
```powershell
cd frontend
npx tsc --noEmit
npm run build           # tsc -b + vite — 0 lỗi/0 deprecated mới
```
Smoke `console-errors.cy.ts` (Cypress) phải 0 error sau khi sửa.

## Reference

- `references/deprecations-cheatsheet.md` — bảng before/after từng deprecated prop + ví dụ code

## When to update

- Khi nâng Antd lên major mới (v7...) hoặc antd báo deprecated props mới.
- Khi convention logging/empty-state thay đổi.
