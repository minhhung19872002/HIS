# HIS Layout Architecture — Permission Pipeline

> Pipeline đầy đủ: JWT → AuthContext → menu → route → button → action

---

## 1. Tổng quan Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Permission Pipeline                           │
│                                                                       │
│  JWT (login)                                                          │
│    └→ /auth/me (load per session)                                     │
│         └→ AuthContext { permissions[], roles[] }                     │
│              ├→ can(perm) → Sidebar filter (Layer 1)                 │
│              ├→ RequirePermission → Route guard (Layer 2)            │
│              └→ <Can> component → Button/action (Layer 3)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer 1 — Sidebar Menu Filter

**Thực thi tại:** `Sidebar.tsx` (xây từ `V2_ROUTES` + `can()`)

**Logic:** Xem `02-layout-architecture.md §4`

**Quan trọng:** Layer này chỉ là UX — ẩn menu item khỏi mắt user. **KHÔNG phải security boundary.**

---

## 3. Layer 2 — Route Guard (RequirePermission)

**File:** `frontend/src/guards/RequirePermission.tsx`

```tsx
import { useAuth } from '../contexts/AuthContext';
import { AppRouteMeta } from '../app/module-registry';
import Forbidden403 from './Forbidden403';

interface Props {
  meta: AppRouteMeta;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<Props> = ({ meta, children }) => {
  const { hasPermission, hasRole } = useAuth();

  // undefined permission = accessible to all authenticated users
  const permOk = !meta.permission || hasPermission(meta.permission);
  const roleOk  = !meta.roles?.length || meta.roles.some(r => hasRole(r));

  if (!permOk || !roleOk) {
    return <Forbidden403 resource={meta.title} />;
  }

  return <>{children}</>;
};
```

**Forbidden403.tsx:**
```tsx
export const Forbidden403: React.FC<{ resource?: string }> = ({ resource }) => (
  <Result
    status="403"
    title="Không có quyền truy cập"
    subTitle={resource ? `Bạn không có quyền xem "${resource}".` : undefined}
    extra={
      <Button type="primary" onClick={() => navigate(-1)}>
        Quay lại
      </Button>
    }
  />
);
```

**Vị trí trong App.tsx:**
```tsx
<RequirePermission meta={route.meta}>
  <ErrorBoundary>   {/* ← thêm mới cho v2 */}
    <Suspense fallback={<PageLoader />}>
      <route.Component />
    </Suspense>
  </ErrorBoundary>
</RequirePermission>
```

---

## 4. Layer 3 — Component-Level Guard (Can)

**File:** `frontend/src/components/Can.tsx`

```tsx
import { useAuth } from '../contexts/AuthContext';

interface CanProps {
  permission: string;       // 'PHARMACY.APPROVE'
  role?: string;            // optional: also check role
  fallback?: React.ReactNode; // gì hiện khi không có quyền (default: null)
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  role,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasRole } = useAuth();

  const ok = hasPermission(permission) && (!role || hasRole(role));
  return ok ? <>{children}</> : <>{fallback}</>;
};
```

**Sử dụng:**
```tsx
// Ẩn hoàn toàn button nếu không có quyền
<Can permission="PHARMACY.APPROVE">
  <Button danger>Duyệt cấp phát</Button>
</Can>

// Hiển thị disabled state thay vì ẩn
<Can
  permission="LAB.APPROVE"
  fallback={<Button disabled title="Không có quyền">Phê duyệt</Button>}
>
  <Button onClick={handleApprove}>Phê duyệt</Button>
</Can>
```

---

## 5. AuthContext — Permission Loading

### Hiện tại (auth/me pattern — tốt)

```typescript
// AuthContext.tsx — đây là pattern đúng, giữ nguyên
const loadUser = async () => {
  const me = await api.get('/auth/me');  // load permissions từ server
  setUser(me);
  setPermissions(me.permissions);        // mảng string
  setRoles(me.roles);
};

const hasPermission = (p: string) => permissions.includes(p);
const hasRole = (r: string) => roles.includes(r);
```

### JWT Strategy

| Giai đoạn | Permissions trong JWT | Lý do |
|---|---|---|
| Phase 1 (≤50 permission codes) | Có trong JWT | Giảm 1 round-trip; tolerable payload size |
| Phase 2 (>50 codes) | Xóa khỏi JWT, chỉ dùng /auth/me | JWT payload sẽ lớn → latency; /auth/me có cache |

**Khuyến nghị Phase 1:** Giữ permission trong JWT (đã có) + dùng /auth/me làm fallback khi JWT thiếu.

### Cache /auth/me

```typescript
// Thêm cache để không gọi /auth/me mỗi page navigation
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

let cachedUser: User | null = null;
let cacheExpiry = 0;

const loadUser = async (force = false) => {
  if (!force && cachedUser && Date.now() < cacheExpiry) {
    setUser(cachedUser);
    return;
  }
  const me = await api.get('/auth/me');
  cachedUser = me;
  cacheExpiry = Date.now() + USER_CACHE_TTL_MS;
  setUser(me);
};
```

---

## 6. Phased Rollout (3 giai đoạn)

### Phase 1 — Nền móng (không breaking change)

**Mục tiêu:** Registry tồn tại, sidebar filter hoạt động, không ai bị chặn (permission tất cả undefined).

1. Tạo `module-registry.ts` với `permission: undefined` cho tất cả 156 route
2. Tái cấu trúc App.tsx để map từ registry
3. Sidebar đọc từ registry (menu giống y hệt hiện tại — không ai bị ảnh hưởng)
4. Thêm `RequirePermission` wrapper (luôn pass vì permission = undefined)
5. Thêm ErrorBoundary quanh Outlet
6. Fix duplicate route procurement

**Verify:** Build pass, tất cả 156 trang vẫn truy cập được như cũ.

### Phase 2 — Kích hoạt permission (theo module)

**Mục tiêu:** Điền permission codes vào registry từng module một; BE sync permission codes.

1. Sync permission codes giữa FE registry và BE `RolePermissions` table
2. Điền `permission` field cho từng module (bắt đầu từ Admin — ít rủi ro nhất)
3. Test với từng role group
4. Deploy + monitor error log (403 bất ngờ = permission mapping sai)

**Thứ tự an toàn (ít rủi ro → nhiều rủi ro):**
```
Admin pages → Pharmacy → Lab → Radiology → Billing → Clinical → Inpatient
```

### Phase 3 — Button-level + Field masking

**Mục tiêu:** `<Can>` cho action buttons; field masking nhạy cảm (optional).

1. Thêm `<Can>` vào các action button quan trọng (Approve, Sign, Delete)
2. Field masking: ẩn column lương, ẩn cột giá vật tư (nếu cần)

---

## 7. Vấn đề Thường Gặp trong HIS (không phải học thuật)

### 7.1 Doctor kiêm Department Head

**Vấn đề:** Một người có cả 2 role → menu phải merge, không phải chọn 1.

**Giải pháp:** OR-semantics trong `roles[]` → user thấy union của tất cả trang họ có quyền.

### 7.2 Nurse thấy kết quả xét nghiệm nhưng không approve

**Vấn đề:** LAB.VIEW ≠ LAB.APPROVE → cùng route nhưng button khác nhau.

**Giải pháp:** Route chỉ cần `permission: 'LAB.VIEW'`; button "Phê duyệt" bọc bằng `<Can permission="LAB.APPROVE">`.

### 7.3 Bệnh viện nhỏ: 1 người = Receptionist + Cashier + Admin

**Vấn đề:** 3 role → user cần thấy menu của cả 3.

**Giải pháp:** Đúng với OR-semantics; menu tự expand vì có cả 3 role trong JWT.

### 7.4 Permission cache stale sau khi admin thay đổi role

**Vấn đề:** Admin gán thêm quyền cho nurse → nurse vẫn dùng cache cũ 5 phút.

**Giải pháp ngắn hạn:** Thêm `?v=<timestamp>` vào /auth/me call sau khi change role (invalidate cache). Long-term: SignalR push event `PermissionsChanged` → FE reload.

### 7.5 Break-glass access (cấp cứu)

**Vấn đề:** Bác sĩ trực cấp cứu cần truy cập hồ sơ bất kỳ dù không có permission thường.

**Giải pháp:** Break-glass button trong Patient Context Bar → POST /auth/break-glass/{patientId} → BE log audit → FE nhận token tạm thời với quyền mở rộng (TTL 2 giờ); màn hình hiển thị banner "BREAK-GLASS ACTIVE".
