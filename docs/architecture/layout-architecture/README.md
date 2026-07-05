# HIS Layout Architecture — Tổng quan & Quyết định Kiến trúc

> Phiên nghiên cứu: 2026-07-05 · Không chứa code production · Tài liệu này là **nguồn sự thật duy nhất** cho toàn bộ epic Layout Architecture.
> Triển khai → xem `07-implementation-roadmap.md` + GitHub Issues `#373–#386`.

---

## 1. Bối cảnh

| Điểm | Giá trị |
|---|---|
| Frontend stack | React 19.2 + TypeScript 5.9 + Ant Design v6.2.2 + Vite 5.4 + react-router-dom 7.13 |
| Số trang v2 | **156 trang** (`pages-v2/`) + ~67 file support; route `/v2/*`, shell `TerminalLayout` |
| v1 (MainLayout) | **Đang khai tử** — Decision #204 (2026-06-17); không phát triển mới |
| Nhân viên sử dụng | **100–1.000 người** (nội bộ bệnh viện; không có patient portal / mobile) |
| Bệnh viện mục tiêu | Từ phòng khám nhỏ (1 người kiêm nhiều vai) đến bệnh viện lớn (chuyên sâu từng vai) |

---

## 2. Các vấn đề hiện tại (P0→P2)

### P0 — Patient Safety
| # | Vấn đề | File | Rủi ro |
|---|---|---|---|
| P0-A | Race condition đổi bệnh nhân nhanh: `selectPatient()` async không có cancellation guard | `OpdEditor.tsx` | Dữ liệu bệnh nhân A ghi vào hồ sơ bệnh nhân B |
| P0-B | v2 Outlet không có `<ErrorBoundary>` | `TerminalLayout.tsx` | Lỗi 1 trang crash toàn shell |

### P1 — Nghiêm trọng (ảnh hưởng bảo mật / trải nghiệm)
| # | Vấn đề | Chi tiết |
|---|---|---|
| P1-A | **0 role-gating FE** | `hasPermission/hasRole` được khai báo trong `AuthContext.tsx:214` nhưng **0 caller** trong toàn FE |
| P1-B | **Hai nguồn sự thật** | `App.tsx` (route) vs `TerminalLayout.HIS_GROUPS` (menu) — thêm trang phải sửa 2 file |
| P1-C | Dark mode Antd-trong-v2 vỡ | `TerminalLayout` dùng `ConfigProvider` hardcode màu hex light, không đọc `isDark` |
| P1-D | v2 bell thông báo dùng 4 bản ghi demo giả | `NotificationContext.tsx` đã production-ready nhưng chỉ v1 dùng |

### P2 — Cải tiến UX / kỹ thuật
| # | Vấn đề |
|---|---|
| P2-A | Patient context bar sinh bệnh nhân giả từ `?pid=` query string |
| P2-B | `CommandContext.tsx` chỉ có 8 lệnh, chỉ 1/156 trang đăng ký |
| P2-C | `App.tsx` (834 dòng) — 279 lazy imports + 305 `<Route>` inline, khó maintain |
| P2-D | Dashboard giống nhau cho mọi vai, không lọc widget theo phân quyền |
| P2-E | Không có idle timeout / lock screen |
| P2-F | Không có chính sách concurrent login |

---

## 3. Quyết định kiến trúc chốt

### ADR-L01: 1 Shell thống nhất (không tách layout theo domain)

**Quyết định:** Dùng **1 shell duy nhất** (`TerminalLayout`) + **lọc menu theo phân quyền** — KHÔNG tạo nhiều layout riêng theo domain nghiệp vụ (clinical / administrative / pharmacy).

**Lý do:**
- Bệnh viện 100 nhân sự: 1 người thường kiêm nhiều vai → menu filter linh hoạt hơn layout cứng.
- Bệnh viện 1.000 nhân sự: menu đủ granular để mỗi vai chỉ thấy phần của mình.
- Tạo layout riêng = nhân đôi code shell + khó maintain + UX không nhất quán.
- 156 trang đã chạy ổn trên TerminalLayout → refactor shell là rủi ro cao, không có lợi.

**Hệ quả:** Module registry trở thành nguồn sự thật duy nhất cho menu + route + permission.

### ADR-L02: Module Registry — nguồn sự thật duy nhất

**Quyết định:** Tạo `src/app/module-registry.ts` — mảng tĩnh TypeScript chứa **route + menu + permission** cho mọi trang.

**Schema:**
```ts
interface AppRoute {
  id: string;           // 'opd'
  path: string;         // '/v2/opd'
  Component: LazyExoticComponent<any>;
  meta: {
    title: string;      // 'Khám bệnh'
    group: NavGroupId;  // 'clinical'
    icon?: string;      // key string, not JSX
    permission?: string;// 'OPD.VIEW'
    roles?: string[];   // OR-semantics
    hot?: number;       // keyboard shortcut
    hidden?: boolean;
    layout: 'terminal' | 'bare';
  };
}
```

**App.tsx** sẽ rút gọn từ 834 dòng xuống ~100 dòng bằng cách map qua registry.
**TerminalLayout.HIS_GROUPS** sẽ được sinh từ registry, xóa `HIS_GROUPS` hardcode.

### ADR-L03: React Router 7 — ở lại Declarative Mode

**Quyết định:** Giữ nguyên mode khai báo (không migrate sang Data mode / Framework mode). Chỉ tập trung code vào route-config array từ registry.

**Lý do:** Data mode yêu cầu refactor loader/action/form toàn bộ 156 trang. Không có trigger cụ thể (performance, streaming SSR) để justify chi phí này. Code-splitting bằng 279 `lazy()` đã hoạt động tốt.

### ADR-L04: Permission Pipeline — tự viết, không dùng CASL

**Quyết định:** Tự implement 3-layer permission (~80–120 dòng):
1. `moduleRegistry` → filter menu (`can(perm)`)
2. `<RequirePermission>` wrapper per route → `<Forbidden403>`
3. `<Can permission="X">` component → ẩn/disable button

**Lý do:** CASL là dependency nặng (policy DSL, ability builder, subject types) cho bài toán đơn giản là string-based permission check. `hasPermission()` trong `AuthContext` đã đủ.

### ADR-L05: Dashboard theo vai (không tạo dashboard riêng)

**Quyết định:** 1 dashboard duy nhất, widget được lọc theo permission từ registry — không tạo route dashboard riêng cho từng vai.

### ADR-L06: Theme — dark mode + compact, 2 giai đoạn

**Quyết định:**
- Giai đoạn 1: Sửa `ConfigProvider` nesting trong `TerminalLayout` để dark mode Antd-trong-v2 hoạt động.
- Giai đoạn 2: Thêm compact mode (bệnh viện lớn dùng màn nhỏ nhiều).

---

## 4. Kiến trúc tổng thể (mục tiêu)

```
┌─────────────────────────────────────────────────────┐
│                   TerminalLayout                     │
│  ┌──────────┐  ┌──────────────────────────────────┐ │
│  │ Sidebar  │  │           Outlet                  │ │
│  │          │  │  ┌────────────────────────────┐  │ │
│  │ (lọc từ  │  │  │    <RequirePermission>      │  │ │
│  │ registry │  │  │    <ErrorBoundary>           │  │ │
│  │ + can()) │  │  │    <PageComponent>           │  │ │
│  │          │  │  └────────────────────────────┘  │ │
│  └──────────┘  └──────────────────────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐│
│  │ TopBar   │  │ Patient  │  │  IdleLockOverlay     ││
│  │ (notify) │  │ Context  │  │  (10 min timeout)    ││
│  └──────────┘  └──────────┘  └─────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 5. Cấu trúc thư mục đề xuất

```
frontend/src/
├── app/
│   ├── module-registry.ts          # Nguồn sự thật duy nhất
│   ├── route-groups.ts             # NavGroupId type + group metadata
│   └── App.tsx                     # ~100 dòng (map registry → <Route>)
├── guards/
│   ├── RequireAuth.tsx
│   ├── RequirePermission.tsx       # Wrapper per route
│   └── Forbidden403.tsx
├── components/
│   ├── Can.tsx                     # <Can permission="X"> button guard
│   └── IdleLockScreen.tsx          # Idle timeout overlay
├── layouts/
│   └── terminal/
│       ├── TerminalLayout.tsx      # Giảm từ 959 → ~400 dòng
│       ├── Sidebar.tsx             # Tách ra từ TerminalLayout
│       ├── TopBar.tsx              # Tách ra từ TerminalLayout
│       ├── PatientContextBar.tsx   # Tách ra + dùng real data
│       └── ab-module.css
└── pages-v2/                       # Không đổi gì ở đây
```

---

## 6. Tài liệu chi tiết

| File | Nội dung |
|---|---|
| [01-hien-trang.md](01-hien-trang.md) | Hiện trạng shell + RBAC + inventory 156 trang |
| [02-layout-architecture.md](02-layout-architecture.md) | Layout hierarchy + module registry schema |
| [03-permission-pipeline.md](03-permission-pipeline.md) | Permission pipeline đầy đủ (menu→route→button) |
| [04-routing-strategy.md](04-routing-strategy.md) | Router v7 + route-config + guard patterns |
| [05-navigation-ux.md](05-navigation-ux.md) | Sidebar/topbar/multi-tab/command palette + persona 18 vai |
| [06-theme-performance-security.md](06-theme-performance-security.md) | Theme + performance + idle/break-glass/concurrent login |
| [07-implementation-roadmap.md](07-implementation-roadmap.md) | Lộ trình triển khai theo priority + dependency |

---

## 7. GitHub Issues liên quan

Xem `07-implementation-roadmap.md` để biết danh sách đầy đủ Issues và thứ tự thực hiện.
