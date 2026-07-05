# HIS Layout Architecture — Routing Strategy

---

## 1. React Router v7 — Quyết định Mode

### 3 Mode của RR v7

| Mode | Cơ chế | HIS hiện tại |
|---|---|---|
| **Declarative** | `<Routes><Route>` trong JSX | ✓ Đang dùng |
| **Data** | `createBrowserRouter` + loader/action | ✗ |
| **Framework** | Vite plugin (file-based routing) | ✗ |

### Quyết định: Giữ Declarative Mode

**Lý do KHÔNG migrate sang Data mode:**
1. 156 trang cần refactor loader/action → 3–4 tuần chỉ migration, zero feature value
2. Không có trigger thật (không cần streaming SSR, prefetch không critical)
3. Code-splitting bằng 279 `lazy()` đã hoạt động tốt, không bottleneck
4. Data mode = thay đổi lifecycle component (loader chạy ngoài React tree) → rủi ro regression cao

**Lợi ích duy nhất của Data mode bị bỏ:** `useFetcher`, `<Form>`, optimistic UI. HIS dùng Ant Design Form + React Query/axios — không cần RR Form.

---

## 2. Route Guards

### RequireAuth

```tsx
// guards/RequireAuth.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const RequireAuth: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};
```

### RequirePermission

Xem đầy đủ tại `03-permission-pipeline.md §3`.

### Route Hierarchy

```
/
├── /login                  → LoginPage (bare layout)
├── /403                    → Forbidden403 (bare layout)
│
└── [RequireAuth]
    └── /v2/*               → TerminalLayout
        ├── /v2/dashboard   → DashboardPage
        ├── /v2/opd         → OpdPage         (permission: OPD.VIEW)
        ├── /v2/pharmacy    → PharmacyPage     (permission: PHARMACY.VIEW)
        └── ... (153 routes từ registry)
```

---

## 3. Xử lý Bug Duplicate Route

**Bug hiện tại:** `path="procurement"` được đăng ký 2 lần trong App.tsx. Route thứ 2 là dead code (RR khớp route đầu tiên).

**Fix khi migrate sang registry:** Registry là array TypeScript → TypeScript sẽ báo lỗi nếu `id` hoặc `path` trùng (thêm runtime check trong dev mode):

```typescript
// module-registry.ts
if (process.env.NODE_ENV === 'development') {
  const paths = V2_ROUTES.map(r => r.path);
  const dups = paths.filter((p, i) => paths.indexOf(p) !== i);
  if (dups.length) console.error('[registry] Duplicate paths:', dups);
}
```

---

## 4. Code Splitting Strategy

### Hiện tại (giữ nguyên)

```tsx
// 279 lazy() — đã tốt, không thay đổi
const OpdPage = React.lazy(() => import('../pages-v2/OpdPage'));
```

### Cải tiến: Suspense per group (thay vì 1 Suspense toàn shell)

```tsx
// Hiện tại — 1 Suspense bao toàn bộ (fallback quá rộng)
<Suspense fallback={<GlobalSpinner />}>
  <Routes>...</Routes>
</Suspense>

// Đề xuất — Suspense per route (trong map của App.tsx)
{V2_ROUTES.map(route => (
  <Route
    key={route.id}
    path={...}
    element={
      <Suspense fallback={<PageLoader label={route.meta.title} />}>
        <RequirePermission meta={route.meta}>
          <route.Component />
        </RequirePermission>
      </Suspense>
    }
  />
))}
```

**Lợi ích:** User thấy skeleton của đúng trang đang load, không bị blank toàn màn hình.

---

## 5. Breadcrumb

### Pattern

```tsx
// hooks/useBreadcrumb.ts
export const useBreadcrumb = () => {
  const location = useLocation();
  const route = V2_ROUTES.find(r => matchPath(r.path, location.pathname));

  return [
    { label: 'HIS', path: '/v2/dashboard' },
    route?.meta.group
      ? { label: ROUTE_GROUPS.find(g => g.id === route.meta.group)?.label, path: undefined }
      : null,
    route ? { label: route.meta.title, path: route.path } : null,
  ].filter(Boolean);
};
```

### Hiển thị trong TopBar

```tsx
// TopBar.tsx
const crumbs = useBreadcrumb();
return (
  <Breadcrumb items={crumbs.map(c => ({
    title: c.path ? <Link to={c.path}>{c.label}</Link> : c.label,
  }))} />
);
```

---

## 6. Multi-Tab Strategy

### Hiện trạng

TerminalLayout có `TopTabs` từ `_v2kit.tsx` — dùng trong một số trang kiểu "tab-per-patient".

### Vấn đề thực tế HIS

"Bác sĩ khám 2 bệnh nhân đồng thời" → cần 2 tab song song cùng route, khác bệnh nhân.

### Giải pháp đề xuất (Phase 2+)

```
/v2/opd?tab=12345   → Patient 12345 tab
/v2/opd?tab=67890   → Patient 67890 tab (cùng route, khác state)
```

**Không dùng multi-window router** vì:
- Phức tạp, không có trong react-router-dom
- Chỉ cần tối đa 3–4 tab đồng thời

**Scope của epic này:** Chỉ document vấn đề; không implement multi-tab trong Phase 1 + 2.

---

## 7. Dead Routes Cleanup

### Hiện tại

| Loại dead route | Số lượng |
|---|---|
| `lite/*` alias (12 route cùng component) | 12 |
| Menu link đến route không tồn tại | 3 |
| Duplicate `procurement` | 1 |

### Xử lý khi build registry

1. `lite/*` alias: Nếu không có traffic, xóa. Nếu cần backward compat: thêm `<Route path="lite/x" element={<Navigate to="/v2/x" />}>`
2. Menu link không tồn tại: Sẽ bị phát hiện khi build registry (TypeScript sẽ yêu cầu `path` phải tồn tại trong `V2_ROUTES`)
3. Duplicate: Tự bị loại khi migrate sang array (không thể có 2 entry cùng `id`)
