# HIS Layout Architecture — Implementation Roadmap

> Thứ tự triển khai theo dependency + rủi ro. Fix P0 trước; test CUỐI CÙNG.
> Mỗi mục có GitHub Issue tương ứng (tạo trong phiên này).

---

## Phase 0 — P0 Bugs (phải làm TRƯỚC tất cả)

### #P0-ERRORBOUNDARY — Add ErrorBoundary to v2 Outlet
- **Vấn đề:** Lỗi JS trong bất kỳ trang v2 nào crash toàn TerminalLayout
- **Fix:** Thêm `<ErrorBoundary>` quanh `<Outlet>` trong TerminalLayout
- **Blast radius:** Minimal (chỉ thêm try/catch wrapper)
- **Effort:** XS (< 1h)
- **Dependency:** Không có
- **GitHub Issue:** #373

### #P0-PATIENT-RACE — Fix patient-context race condition
- **Vấn đề:** Async selectPatient() không có cancellation guard → data BN A ghi vào BN B
- **Fix:** `AbortController` hoặc `requestId` guard trong `PatientContextBar` + `OpdEditor`
- **Blast radius:** Thấp-Trung (OpdEditor.tsx + PatientContextBar.tsx)
- **Effort:** S (2–3h)
- **Dependency:** Không có
- **GitHub Issue:** #374

---

## Phase 1 — Nền móng Registry (không breaking change)

### #LAYOUT-REGISTRY — Module Registry + App.tsx refactor
- **Mục tiêu:** Tạo `src/app/module-registry.ts`; rút gọn App.tsx từ 834 → ~100 dòng; xóa `HIS_GROUPS` hardcode
- **Chi tiết:**
  - Tạo `module-registry.ts` với 156 entry (permission = undefined ban đầu)
  - Map registry → `<Route>` trong App.tsx
  - Sidebar đọc từ registry (menu hiển thị y hệt — không ai bị ảnh hưởng)
  - Xóa duplicate route `procurement`; xóa 12 `lite/*` dead alias
  - Thêm dev-mode duplicate-path check
- **Effort:** M (1–2 ngày)
- **Dependency:** Không có
- **Verify:** Build pass; tất cả 156 trang vẫn accessible
- **GitHub Issue:** #375

### #LAYOUT-SPLIT-SHELL — Tách TerminalLayout thành sub-components
- **Mục tiêu:** Sidebar.tsx + TopBar.tsx + PatientContextBar.tsx từ 959-line monolith
- **Chi tiết:** Behavior-preserving split; không đổi bất kỳ logic nghiệp vụ
- **Effort:** S-M (4–6h)
- **Dependency:** #375 (registry cần có trước để Sidebar đọc từ đó)
- **Verify:** Build pass; visual regression test (screenshot comparison)
- **GitHub Issue:** #376

---

## Phase 2 — Permission Layer

### #LAYOUT-PERMISSION-GUARDS — RequirePermission + Can + Forbidden403
- **Mục tiêu:** Implement 3-layer permission pipeline
- **Chi tiết:**
  - `guards/RequirePermission.tsx` — route-level guard
  - `components/Can.tsx` — button-level guard
  - `guards/Forbidden403.tsx` — 403 page
  - Thêm `<RequirePermission>` vào App.tsx route map
  - Thêm `<ErrorBoundary>` cùng lúc (nếu #373 chưa done)
- **Effort:** S (3–4h)
- **Dependency:** #375
- **Note:** Giai đoạn này permission vẫn = undefined → không ai bị chặn; guards hoạt động nhưng pass-through
- **GitHub Issue:** #377

### #LAYOUT-PERMISSION-CODES — Điền permission codes vào registry (theo module)
- **Mục tiêu:** Sync permission codes FE ↔ BE; kích hoạt từng module
- **Chi tiết:**
  - Lấy danh sách permission từ BE `RolePermissions` table
  - Điền `permission` field vào registry entry theo từng module
  - Thứ tự kích hoạt: Admin → Pharmacy → Lab → Radiology → Billing → Clinical → Inpatient
  - Test với từng role group
  - Monitor 403 logs sau mỗi module kích hoạt
- **Effort:** L (2–3 ngày — cần sync FE/BE; test từng role)
- **Dependency:** #377 + BE issue #366/#367 (AuthZ)
- **Note:** Đây là điểm phối hợp quan trọng với RBAC epic #372
- **GitHub Issue:** #378

### #LAYOUT-DASHBOARD-WIDGETS — Role-aware dashboard
- **Mục tiêu:** Dashboard filter widget theo permission từ `DASHBOARD_WIDGETS` registry
- **Effort:** S-M (4–6h)
- **Dependency:** #378 (cần permission codes hoạt động)
- **GitHub Issue:** #379

---

## Phase 3 — Shell Improvements

### #LAYOUT-NOTIFICATION — Connect SignalR notification to v2 bell
- **Mục tiêu:** Thay 4 bản ghi demo giả bằng `NotificationContext` thật
- **Chi tiết:** v1 đã có implementation hoàn chỉnh → port sang v2
- **Effort:** S (2–3h)
- **Dependency:** #376 (TopBar.tsx tách ra là lúc phù hợp để wire)
- **GitHub Issue:** #380

### #LAYOUT-DARK-MODE — Fix dark mode Antd-trong-v2
- **Mục tiêu:** ConfigProvider đọc `isDark` → Antd component trong v2 follow theme
- **Thêm:** Compact mode toggle; CSS variable `data-theme` cho ab-*
- **Effort:** S (2–3h)
- **Dependency:** #376
- **GitHub Issue:** #381

### #LAYOUT-COMMAND-PALETTE — Mở rộng Command Palette
- **Mục tiêu:** Auto-generate commands từ registry; hook để page tự đăng ký lệnh
- **Effort:** M (4–6h)
- **Dependency:** #375
- **GitHub Issue:** #382

---

## Phase 4 — Security

### #LAYOUT-IDLE-LOCK — Idle timeout + lock screen
- **Mục tiêu:** 10-min idle → lock overlay; re-auth mà không mất data form
- **Thêm:** Auto-save draft event trước khi lock
- **Effort:** M (6–8h)
- **Dependency:** #376 (IdleLockScreen.tsx component mới)
- **GitHub Issue:** #383

### #LAYOUT-CONCURRENT-LOGIN — Concurrent login policy (last-wins)
- **Mục tiêu:** BE tạo SessionId mới mỗi login; FE nhận 401 → thông báo + redirect
- **Chi tiết:** Cần thay đổi cả BE (AuthService) + FE (axios interceptor)
- **Effort:** M (1 ngày FE + BE phối hợp)
- **Dependency:** #367 (AUTHZ-1 enforcement)
- **GitHub Issue:** #384

### #LAYOUT-BREAK-GLASS — Break-glass emergency access
- **Mục tiêu:** Button + modal + temp-token + banner + audit log
- **Effort:** M-L (1–2 ngày FE + BE)
- **Dependency:** #383, #367
- **GitHub Issue:** #385

---

## Phase 5 — Performance & Polish

### #LAYOUT-PERF — Performance audit + improvements
- **Mục tiêu:** Bundle analysis; Suspense per route; memoize sidebar data
- **Effort:** M (1 ngày)
- **Dependency:** #375, #376
- **GitHub Issue:** #386

---

## Thứ tự tổng hợp (dependency graph)

```
#373 (ErrorBoundary)  ─┐
#374 (Race condition)  ─┤
                        ├→ #375 (Registry) → #376 (Shell split) → #380 (Notification)
                        │                                        → #381 (Dark mode)
                        │                                        → #386 (Perf)
                        │  #375 → #377 (Guards) → #378 (Permission codes) → #379 (Dashboard)
                        │                       ↑
                        │         #366/#367 (AuthZ BE) ──────────→ #384 (Concurrent login)
                        │
                        └→ #382 (Command Palette) [→ #375]
                           #383 (Idle lock) → #385 (Break-glass) [→ #383, #367]
```

---

## Timeline Ước tính

| Phase | Issues | Effort | Nên bắt đầu |
|---|---|---|---|
| Phase 0 | #373, #374 | 0.5 ngày | **Ngay** |
| Phase 1 | #375, #376 | 3–4 ngày | Sau P0 |
| Phase 2 | #377, #378, #379 | 4–5 ngày | Sau Phase 1; phối hợp với RBAC BE |
| Phase 3 | #380, #381, #382 | 3–4 ngày | Song song với Phase 2 |
| Phase 4 | #383, #384, #385 | 3–4 ngày | Sau Phase 2 |
| Phase 5 | #386 | 1 ngày | Sau Phase 1 |
| **Test** | Test issues (existing) | **CUỐI CÙNG** | Sau tất cả fix |

**Tổng:** ~15–18 ngày engineering (có thể song song hóa Phase 3 + Phase 4).

---

## Dependency với RBAC Epic (#372)

Issue #378 (permission codes) cần #367 (AUTHZ-1 BE enforcement) hoàn thành trước vì:
- FE cần biết chính xác permission codes BE công nhận
- Không thể test role-gating FE nếu BE vẫn cho pass mọi request

**Khuyến nghị:** Chạy #373 + #374 + #375 (nền móng, không liên quan RBAC) song song với RBAC epic. #377+ sau khi #367 có prototype.

---

## THÊM 2026-07-06 — Commercial Issues (brief thương mại hóa)

Phát sinh từ brief thương mại hóa + verify agent trong phiên 2026-07-05.
Tài liệu: `08-thiet-ke-thuong-mai.md`, `09-permission-catalog.md`.

### #403 — Tìm bệnh nhân không dấu (P1 commercial, deal-breaker demo)
- **Vấn đề:** Backend dùng `.Contains()` → accent-sensitive; gõ "nguyen van an" không ra "Nguyễn Văn An"
- **Fix:** Đổi collation sang `Vietnamese_CI_AI` (Option A) hoặc cột SearchName normalize (Option B)
- **Effort:** S (0.5–1 ngày)
- **Dependency:** Không có — standalone BE fix
- **Ưu tiên:** **NGAY — trước bất kỳ demo nào với khách**

### #404 — Workspace layer (4 không gian làm việc)
- **Mục tiêu:** Topbar workspace switcher + sidebar lọc theo workspace; sidebar mỗi WS ≤ 4 nhóm
- **Effort:** M (1 ngày)
- **Dependency:** #375 (registry + field workspace), #376 (Sidebar tách)

### #405 — EnabledModules (cơ chế đóng gói Gói PK / Gói BV)
- **Mục tiêu:** Bảng/API + FE filter menu+route theo module flag; trang tắt → "Module chưa kích hoạt"
- **Effort:** M (1.5 ngày FE+BE)
- **Dependency:** #375 (registry + field module)

### Dependency graph bổ sung

```
#403 (VN accent search) — standalone, làm ngay
#375 (Registry) → #376 (Shell split) → #404 (Workspace layer)
#375 (Registry)                      → #405 (EnabledModules)
#404 + #405                          → #379 (Dashboard workspace-aware)
```

### Timeline thương mại (P0 → shipable commercial demo)

| Ưu tiên | Issues | Ghi chú |
|---|---|---|
| **Ngay** | #373, #374, #403 | P0 safety + P1 deal-breaker |
| Tuần 1 | #375, #376, #405 | Nền + đóng gói |
| Tuần 2 | #377, #378, #404 | Permission + workspace |
| Tuần 3 | #379, #380, #381 | Dashboard + notification + dark mode |
| Tuần 4+ | #383, #384, #386 | Security + perf |
| Backlog | #382, #385, #370 | Không cần cho commercial v1 |
