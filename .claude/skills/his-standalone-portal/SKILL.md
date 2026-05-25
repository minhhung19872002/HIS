---
name: his-standalone-portal
description: Use this skill when building a standalone HIS portal page that lives OUTSIDE the main app layouts (its own route, own login form, own JWT/role) — e.g. the BHXH Inspector Portal at /inspector-portal. Triggers include a separate login screen for external users, a route registered outside MainLayout/TerminalLayout/ProtectedRoute, or a non-admin role like BhxhInspector. Do NOT use for normal /v2/* pages inside TerminalLayout (his-frontend-page-v2).
type: project
---

# HIS Standalone Portal

> TẦNG: **B · PROJECT/HIS** (system). Depend: `core-error-loading-state`, `core-validation-pattern`, `his-api-client`.

Skill cho **cổng standalone** — trang có route **ngoài** layout chính (MainLayout/TerminalLayout), **đăng nhập riêng**, **JWT/role riêng**, dành cho người dùng ngoài (vd giám định viên BHXH). Mẫu: `pages-v2/InspectorPortal.tsx` tại `/inspector-portal`.

## Khi nào dùng
- Tạo cổng cho người dùng **ngoài** hệ thống (thanh tra/đối tác) đăng nhập độc lập, không qua admin login.
- Route đặt **ngoài** `ProtectedRoute`/MainLayout/TerminalLayout.
- Auth riêng: token + role riêng (vd `BhxhInspector`), tách khỏi JWT user thường.

## Khi nào KHÔNG dùng
- Page nghiệp vụ thường trong TerminalLayout `/v2/*` → `his-frontend-page-v2`.
- Chỉ thêm api client → `his-api-client`.

## Kiến trúc (mẫu Inspector Portal — NangCap24)
- Route trong `App.tsx`: đặt **ngoài** group `ProtectedRoute`/layout, ví dụ:
  ```tsx
  {/* Standalone routes - không thuộc layout chính */}
  <Route path="/inspector-portal" element={<InspectorPortalStandalone />} />
  ```
- FE: `pages-v2/InspectorPortal.tsx` tự render login form + nội dung sau đăng nhập (KHÔNG dùng sidebar/menu chung).
- BE: controller `/api/inspector-portal` — `POST /login` `[AllowAnonymous]` trả JWT role riêng;
  các endpoint dữ liệu `[Authorize(Roles="BhxhInspector")]`; quản lý account `[Authorize(Roles="Admin")]`.
- Token riêng: lưu localStorage key riêng (KHÔNG ghi đè `token`/`user` của app chính) để 2 phiên không đụng nhau.

## Quy trình chuẩn
1. **API client**: thêm object trong `api/nangcap24.ts` (login, search, detail, download, account CRUD) — theo `his-api-client`.
2. **Page standalone**: tạo `pages-v2/<Name>Portal.tsx` — quản lý `loggedIn` state; chưa login → login form; đã login → nội dung. Validate form theo `core-validation-pattern`; loading/empty/error theo `core-error-loading-state`.
3. **Route**: đăng ký trong `App.tsx` **ngoài** layout chính + ngoài `ProtectedRoute`. KHÔNG thêm vào menu TerminalLayout.
4. **Auth tách biệt**: lưu token portal ở key riêng; gọi API kèm token đó. Role guard BE phải đúng (vd `BhxhInspector`) — verify admin token KHÔNG vào được endpoint portal (403).
5. **`data-testid`** cho login (vd `inspector-login-card/username/password/login-btn`) để E2E test.
6. **Audit**: mọi truy cập dữ liệu nhạy cảm (HSBA) ghi access log (BE).

## Pitfalls
- **Đặt nhầm route trong layout/ProtectedRoute** → cổng bị ép qua admin login → sai mục đích. Phải ngoài.
- **Dùng chung localStorage `token`** với app chính → đăng nhập portal làm văng phiên admin (và ngược lại). Dùng key riêng.
- **Role guard lỏng** → lộ dữ liệu cho người không phận sự. Endpoint dữ liệu phải `[Authorize(Roles="...")]` đúng.
- **Account lockout / BCrypt**: login sai nhiều lần phải khoá (`LockedUntil`); password BCrypt, không plaintext.
- Credential test theo môi trường — xem `his-e2e-testing` (vd Inspector: local seed `inspector`, prod `thanhtra01`).

## Reference
- `references/standalone-portal-template.tsx` — khung page standalone (login form + nội dung sau login)

## When to update
- Khi thêm cổng standalone mới (đối tác khác) hoặc đổi cơ chế auth/role riêng.
