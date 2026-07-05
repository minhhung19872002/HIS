# HIS Layout Architecture — Thiết kế Layout & Module Registry

---

## 1. Số lượng Layout tối ưu

### Phân tích

| Phương án | Layout | Trade-off |
|---|---|---|
| A — Hiện tại | 2 (Terminal + Main) | Main đang khai tử; v2 thiếu permission |
| B — Role-segregated | 1 per domain (Clinical/Admin/Pharmacy...) | ~5 layout shell; đồng bộ ux khó; 1 người nhiều vai = nhiều URL |
| **C — 1 unified + permission filter** | **1** (Terminal + permission) | Menu linh hoạt; 1 codebase; dễ maintain |
| D — Micro-frontend | N per team | Overkill — 1 team, 1 repo, không justify |

**Chọn C.** Lý do chi tiết: xem `README.md` ADR-L01.

### Layout cuối cùng

```
Layout                  Dùng cho              Trạng thái
──────────────────────────────────────────────────────
TerminalLayout          Tất cả v2 (156 trang) Giữ + refactor
BareLayout (LoginPage)  Login, 403, 404       Hiện có
MainLayout              v1 (khai tử)          Không phát triển mới
```

---

## 2. Module Registry — Schema Đầy Đủ

File: `frontend/src/app/module-registry.ts`

```typescript
// ──── Types ────────────────────────────────────────────────────────────────

export type NavGroupId =
  | 'clinical'        // Lâm sàng: OPD, EMR, ICU, Specialty
  | 'inpatient'       // Nội trú: Ward, Nursing, Nutrition
  | 'laboratory'      // Xét nghiệm: LIS, Microbiology, Blood bank
  | 'radiology'       // Hình ảnh: RIS, DICOM, PACS
  | 'pharmacy'        // Dược: Dispensing, Inventory, Warehouse
  | 'billing'         // Thu phí: OPD billing, Inpatient billing, Insurance
  | 'administration'  // Hành chính: Reception, Medical records
  | 'reports'         // Báo cáo + Dashboard
  | 'admin'           // Quản trị hệ thống
  | 'utility';        // Tiện ích, thiết lập cá nhân

export interface NavGroup {
  id: NavGroupId;
  label: string;      // Tiếng Việt
  icon: string;       // react-icons key
  order: number;
  permission?: string;// Group ẩn nếu user không có BẤT KỲ perm nào trong group
}

export interface AppRouteMeta {
  title: string;      // 'Khám bệnh ngoại trú'
  group: NavGroupId;
  icon?: string;
  permission?: string;// 'OPD.VIEW' — undefined = public cho mọi authenticated user
  roles?: string[];   // OR-semantics: đủ 1 trong danh sách
  hot?: number;       // F-key shortcut (F1..F12)
  hidden?: boolean;   // Có trong route nhưng ẩn khỏi menu (sub-page)
  badge?: string;     // key của realtime counter (ví dụ 'pendingLabOrders')
  layout: 'terminal' | 'bare';
}

export interface AppRoute {
  id: string;                          // unique, slug format: 'opd-examination'
  path: string;                        // '/v2/opd/examination'
  Component: React.LazyExoticComponent<React.ComponentType>;
  meta: AppRouteMeta;
  children?: AppRoute[];               // Cho nested route (tab-based pages)
}
```

### Ví dụ registry entries

```typescript
export const ROUTE_GROUPS: NavGroup[] = [
  { id: 'clinical',       label: 'Lâm sàng',      icon: 'stethoscope', order: 1 },
  { id: 'inpatient',      label: 'Nội trú',        icon: 'bed',         order: 2 },
  { id: 'laboratory',     label: 'Xét nghiệm',     icon: 'flask',       order: 3 },
  { id: 'radiology',      label: 'Hình ảnh',       icon: 'scan',        order: 4 },
  { id: 'pharmacy',       label: 'Dược',            icon: 'pill',        order: 5 },
  { id: 'billing',        label: 'Thu phí',         icon: 'receipt',     order: 6 },
  { id: 'administration', label: 'Hành chính',      icon: 'clipboard',   order: 7 },
  { id: 'reports',        label: 'Báo cáo',         icon: 'chart',       order: 8 },
  { id: 'admin',          label: 'Quản trị',        icon: 'settings',    order: 9 },
];

export const V2_ROUTES: AppRoute[] = [
  {
    id: 'opd-examination',
    path: '/v2/opd',
    Component: React.lazy(() => import('../pages-v2/OpdPage')),
    meta: {
      title: 'Khám ngoại trú',
      group: 'clinical',
      icon: 'stethoscope',
      permission: 'OPD.VIEW',
      hot: 1,               // F1
      layout: 'terminal',
    },
  },
  {
    id: 'pharmacy-dispensing',
    path: '/v2/pharmacy/dispensing',
    Component: React.lazy(() => import('../pages-v2/Pharmacy')),
    meta: {
      title: 'Cấp phát thuốc',
      group: 'pharmacy',
      permission: 'PHARMACY.DISPENSE',
      layout: 'terminal',
    },
  },
  {
    id: 'admin-users',
    path: '/v2/admin/users',
    Component: React.lazy(() => import('../pages-v2/UserManagement')),
    meta: {
      title: 'Quản lý người dùng',
      group: 'admin',
      permission: 'ADMIN.USERS',
      roles: ['Admin'],
      layout: 'terminal',
    },
  },
  // ... 153 entries còn lại
];
```

---

## 3. App.tsx sau refactor (~100 dòng)

```tsx
// App.tsx — sau khi dùng module-registry
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { V2_ROUTES }       from './app/module-registry';
import { RequireAuth }      from './guards/RequireAuth';
import { RequirePermission } from './guards/RequirePermission';
import TerminalLayout        from './layouts/terminal/TerminalLayout';
import LoginPage             from './pages/LoginPage';
import Forbidden403          from './guards/Forbidden403';
import NotFound404           from './pages/NotFound404';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403"   element={<Forbidden403 />} />

      <Route element={<RequireAuth />}>
        <Route path="/v2/*" element={<TerminalLayout />}>
          {V2_ROUTES.map(route => (
            <Route
              key={route.id}
              path={route.path.replace('/v2/', '')}
              element={
                <Suspense fallback={<PageLoader />}>
                  <RequirePermission meta={route.meta}>
                    <route.Component />
                  </RequirePermission>
                </Suspense>
              }
            />
          ))}
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/v2/dashboard" replace />} />
      <Route path="*" element={<NotFound404 />} />
    </Routes>
  );
}
```

---

## 4. TerminalLayout sau refactor

### Cấu trúc tách file

| File | Trách nhiệm | Dòng ước tính |
|---|---|---|
| `TerminalLayout.tsx` | Compose các sub-component; ThemeContext; IdleLock | ~200 |
| `Sidebar.tsx` | Build menu từ `V2_ROUTES` + `can()`; active state | ~150 |
| `TopBar.tsx` | Breadcrumb; NotifBell (thật); ThemeToggle; UserMenu | ~100 |
| `PatientContextBar.tsx` | Patient info từ real API; race-safe change | ~80 |
| `IdleLockScreen.tsx` | 10-min timer; lock overlay; re-auth modal | ~100 |

**Tổng:** ~630 dòng (vs 959 hiện tại) + tách logic riêng.

### Sidebar với permission filter

```tsx
// Sidebar.tsx (simplified)
const { hasPermission, hasRole } = useAuth();

const visibleRoutes = useMemo(
  () => V2_ROUTES.filter(r => {
    if (r.meta.hidden) return false;
    if (!r.meta.permission && !r.meta.roles?.length) return true;
    const permOk = !r.meta.permission || hasPermission(r.meta.permission);
    const roleOk = !r.meta.roles?.length || r.meta.roles.some(hasRole);
    return permOk && roleOk;
  }),
  [hasPermission, hasRole]
);

const grouped = useMemo(
  () => groupBy(visibleRoutes, r => r.meta.group),
  [visibleRoutes]
);
```

---

## 5. Permission Code Convention

### Format

```
MODULE.RESOURCE.ACTION   (ví dụ: PHARMACY.PRESCRIPTION.APPROVE)
MODULE.ACTION            (ví dụ: OPD.VIEW, BILLING.COLLECT)
```

### Nguyên tắc

| Nguyên tắc | Mô tả |
|---|---|
| UPPERCASE | Tất cả uppercase, dấu chấm phân cách |
| Additive | Thiếu permission = không có; không có "deny" rule |
| OR-semantics cho `roles[]` | Đủ 1 role trong mảng là pass |
| AND-semantics cho permission + roles | Phải thỏa cả 2 (nếu cả 2 được khai báo) |
| Không có trong registry = public | `permission: undefined` → mọi user đăng nhập đều thấy |

### Danh sách module permissions (Phase 1 — tối thiểu)

```
OPD.VIEW          INPATIENT.VIEW      PHARMACY.VIEW
OPD.EDIT          INPATIENT.EDIT      PHARMACY.DISPENSE
OPD.SIGN          INPATIENT.SIGN      PHARMACY.APPROVE
EMR.VIEW          LAB.VIEW            BILLING.VIEW
EMR.EDIT          LAB.APPROVE         BILLING.COLLECT
RIS.VIEW          BLOOD_BANK.VIEW     ADMIN.USERS
RIS.APPROVE       NUTRITION.VIEW      ADMIN.ROLES
REPORTS.VIEW      ADMIN.CONFIG
```

---

## 6. Persona → Domain × Permission Matrix

| Vai | Group hiện trong menu |
|---|---|
| Admin | Tất cả |
| Doctor | clinical, inpatient, laboratory, radiology, reports |
| Nurse | inpatient, clinical (một phần), pharmacy (xem) |
| Receptionist | administration, billing (một phần) |
| Pharmacist | pharmacy, reports |
| LabTechnician | laboratory, reports |
| Radiologist | radiology, reports |
| Cashier | billing, reports |
| DepartmentHead | Tất cả nhưng readonly đa số |
| DirectorDoctor | reports, admin (readonly) |

Chi tiết đầy đủ 18 vai → `05-navigation-ux.md`
