# HIS Layout Architecture — Theme, Performance & Security

---

## 1. Theme Strategy

### 1.1 Vấn đề Hiện tại

```tsx
// TerminalLayout.tsx — vấn đề hiện tại
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#1677ff',     // hardcode hex light
      colorBgContainer: '#ffffff', // hardcode hex
      // ... không đọc isDark
    }
  }}
>
  {/* Antd components bên trong v2 luôn render light dù theme là dark */}
```

### 1.2 Fix Dark Mode

```tsx
// TerminalLayout.tsx — sau fix
import { theme as antdTheme } from 'antd';
const { darkAlgorithm, defaultAlgorithm } = antdTheme;

// Đọc isDark từ ThemeContext
const { isDark } = useTheme();

return (
  <ConfigProvider
    theme={{
      algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
      token: {
        colorPrimary: '#1677ff',
        // KHÔNG hardcode colorBgContainer — để algorithm xử lý
      },
    }}
  >
    {/* Antd components bên trong giờ follow dark/light đúng */}
```

### 1.3 Compact Mode

```tsx
import { theme as antdTheme } from 'antd';
const { compactAlgorithm } = antdTheme;

// Kết hợp algorithms
<ConfigProvider
  theme={{
    algorithm: [
      isDark ? darkAlgorithm : defaultAlgorithm,
      isCompact ? compactAlgorithm : null,
    ].filter(Boolean),
  }}
>
```

**Compact mode quan trọng cho HIS vì:**
- Nhiều bệnh viện dùng màn 14" cũ (thường là 1366×768)
- Nurse tablet 10" ở đầu giường
- Compact giúp hiện thêm row trong table mà không scroll

### 1.4 Theme Persistence

```typescript
// ThemeContext — lưu preference
const savedTheme = localStorage.getItem('his:theme') as 'light' | 'dark' | 'auto' | null;
const savedCompact = localStorage.getItem('his:compact') === 'true';

// 'auto' = theo OS (prefers-color-scheme)
const isDark = savedTheme === 'dark'
  ? true
  : savedTheme === 'light'
  ? false
  : window.matchMedia('(prefers-color-scheme: dark)').matches;
```

### 1.5 CSS Variables cho ab-* (ngoài Antd)

```css
/* ab-module.css — cập nhật để follow theme */
:root {
  --ab-bg:        #ffffff;
  --ab-border:    #e8e8e8;
  --ab-text:      #262626;
  --ab-sidebar:   #001529;
}

[data-theme="dark"] {
  --ab-bg:        #141414;
  --ab-border:    #303030;
  --ab-text:      #f0f0f0;
  --ab-sidebar:   #000c17;
}
```

Không dùng `@media (prefers-color-scheme: dark)` trong CSS — dùng `data-theme` attribute cho phép user override.

---

## 2. Performance Strategy

### 2.1 Hiện trạng (giữ nguyên — đã tốt)

| Cơ chế | Trạng thái |
|---|---|
| 279 `React.lazy()` | ✓ Giữ nguyên |
| Vite code-splitting | ✓ Auto per lazy chunk |
| 1 `<Suspense>` toàn shell | ✗ Cải thiện (per route) |
| `HIS_GROUPS` không memo | ✗ Cải thiện |
| Bundle analyzer | ✗ Thêm mới |

### 2.2 Suspense Per Route

Xem `04-routing-strategy.md §4`. Cải thiện UX loading, không ảnh hưởng bundle size.

### 2.3 Memoize Sidebar Data

```tsx
// Sidebar.tsx
const visibleRoutes = useMemo(
  () => computeVisibleRoutes(V2_ROUTES, hasPermission, hasRole),
  [hasPermission, hasRole]  // chỉ recompute khi permissions thay đổi
);

const grouped = useMemo(
  () => groupBy(visibleRoutes, r => r.meta.group),
  [visibleRoutes]
);
```

### 2.4 Bundle Analysis (thêm vào Vite config)

```typescript
// vite.config.ts — thêm visualizer
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/bundle-stats.html',
      gzipSize: true,
    }),
  ],
});
```

Chạy: `ANALYZE=true npm run build` → xem `dist/bundle-stats.html`.

### 2.5 Target Metrics

| Metric | Target |
|---|---|
| Initial bundle (gzip) | < 300KB |
| Largest lazy chunk | < 150KB |
| Time to Interactive | < 3s (LAN) / < 6s (3G) |
| Shell render | < 50ms (layout paint) |
| Route switch | < 200ms (cached) |

### 2.6 Không cần làm (over-engineering)

- Server-Side Rendering (Next.js) — không cần cho internal tool
- Service Worker / PWA — không có offline requirement cho hospital LAN
- Micro-frontend — 1 team, 1 repo
- GraphQL — REST đã đủ

---

## 3. Security — Session & Access Control

### 3.1 Idle Timeout + Lock Screen

**Yêu cầu bệnh viện:** Máy tính ở phòng khám thường để mở → người không liên quan có thể thấy hồ sơ.

**Thiết kế:**

```tsx
// IdleLockScreen.tsx
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút (cấu hình được)

export const IdleLockScreen: React.FC = () => {
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLocked(true), IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    // Events chứng tỏ user active
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // khởi tạo timer

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer));
      clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  if (!locked) return null;

  return (
    <div className="idle-lock-overlay">
      <div className="lock-card">
        <Avatar size={64} src={user?.avatar} />
        <h2>Phiên bị khóa</h2>
        <p>{user?.displayName}</p>
        <Input.Password
          placeholder="Nhập mật khẩu để mở khóa"
          onPressEnter={handleUnlock}
        />
        <Button onClick={handleUnlock}>Mở khóa</Button>
        <a onClick={handleLogout}>Đăng nhập tài khoản khác</a>
      </div>
    </div>
  );
};
```

**Vị trí:** Trong `TerminalLayout.tsx`, render overlay trên toàn màn hình khi `locked = true`.

**Auto-save draft:** Trước khi lock, dispatch `SAVE_DRAFT` event → mỗi form có thể lắng nghe và lưu tạm.

### 3.2 Concurrent Login Policy

**Vấn đề:** 2 session cùng tài khoản (home + office) → dữ liệu ghi đè nhau.

**Giải pháp (2 option):**

**Option A — Last-wins (đơn giản):**
- BE tạo `SessionId` mới mỗi lần login
- JWT chứa `sessionId`
- BE validate `sessionId` trùng với session cuối → hợp lệ; session cũ → 401
- FE nhận 401 → tự động redirect login + thông báo "Tài khoản đã đăng nhập ở nơi khác"

**Option B — Multi-session (phức tạp hơn, defer):**
- BE cho phép N session song song (có thể cấu hình)
- Admin có thể force-logout session cụ thể

**Khuyến nghị Phase 1:** Option A. Option B đưa vào backlog.

### 3.3 Break-Glass Access

**Kịch bản:** Bác sĩ cấp cứu cần xem hồ sơ bệnh nhân đang trong phòng mổ (không phải patient của họ).

**Flow:**
```
1. Bác sĩ click [Break-Glass] trên Patient Context Bar
2. Modal: "Lý do truy cập khẩn cấp" (textarea, bắt buộc)
3. POST /auth/break-glass { patientId, reason }
4. BE: log audit (who, when, patient, reason) → trả về temp-token (TTL: 2h)
5. FE: lưu temp-token; hiện banner đỏ "BREAK-GLASS ACTIVE — Phiên kết thúc lúc HH:MM"
6. Sau TTL: banner chuyển warning → auto-expire quyền mở rộng
```

**Audit log phải ghi:**
- UserId, PatientId, Timestamp, Reason, IP, SessionId
- Gửi alert realtime đến Admin/DirectorDoctor

### 3.4 Session Audit (FE)

```typescript
// Mỗi navigation → log
router.subscribe(({ location }) => {
  auditLog.track('page_view', {
    path: location.pathname,
    userId: user?.id,
    sessionId: auth.sessionId,
    timestamp: Date.now(),
  });
});
```

Gửi batch lên BE mỗi 30s hoặc khi navigate. BE lưu vào audit_logs table.

### 3.5 JWT Security

| Điểm | Hiện trạng | Đề xuất |
|---|---|---|
| Token storage | localStorage | Giữ localStorage (internal app, không có XSS vectors phức tạp); thêm token rotation |
| Token TTL | Không rõ (cần kiểm tra) | Access token: 1h; Refresh token: 8h (1 ca) |
| Token rotation | Không có | Thêm refresh-token endpoint; auto-renew khi còn 5 phút |
| HTTPS | Production có (Cloud Run) | Dev: localhost OK |
| CSP | Không rõ | Thêm `Content-Security-Policy` header ở BE |

### 3.6 Các vấn đề bảo mật thực tế HIS Việt Nam

| Vấn đề | Giải pháp |
|---|---|
| Bác sĩ chia sẻ tài khoản | Không giải quyết ở FE; cần chính sách + audit |
| Kết quả XN của BN A hiện cho BN B | Fix P0 race condition (xem 01-hien-trang.md §3.2) |
| Anonymous endpoint public | Fix `[AllowAnonymous]` trong FrontendCompat (#366) |
| In hồ sơ không có watermark | Thêm "Printed by: User, Time" vào PDF template |
| Session không hết khi đổi mật khẩu | Thêm `SecurityStamp` + refresh invalidation (#368) |

---

## §2. Performance audit — kết quả (#386, 2026-07-11)

Bundle report = output `vite build` (per-chunk gzip). Không cần thêm `rollup-plugin-visualizer`
(size đã đủ để đánh giá; tránh thêm dev-dep).

### Bundle hiện tại (gzip)
| Chunk | Raw | Gzip | Tải khi |
|---|---|---|---|
| vendor-antd | 1.648 KB | **496 KB** | eager (dùng toàn app) |
| entry index (×3) | ~288 KB | ~63 KB | eager |
| vendor-cornerstone | 3.042 KB | 830 KB | lazy (chỉ route DICOM viewer) |
| DicomViewer | 484 KB | 135 KB | lazy |
| vendor-charts | 398 KB | 115 KB | lazy |
| vendor-qrcode | 334 KB | 99 KB | lazy |
| excelExport | 283 KB | 95 KB | lazy |
| Inpatient / EMR / OPD / Reception / SystemAdmin | — | 35 / 29 / 25 / 23 / 21 KB | lazy per-route |

### Đối chiếu target
- **Suspense per route:** ✅ ĐẠT — mỗi route `/v2/*` đã bọc `<Suspense fallback={PageLoader}>` riêng
  (`router/AppRoutes.tsx` — data-driven `v2Routes.map`). Không còn 1 Suspense toàn shell.
- **Sidebar không re-render khi navigate:** ✅ ĐẠT — `Rail`+`Flyout` bọc `React.memo` + callbacks
  (`onHoverGroup/onClickGroup/onSwitchLayout/...`) `useCallback` ổn định → navigate trong cùng group
  không rebuild sidebar (verify React DevTools Profiler).
- **Initial gzip < 300 KB:** ❌ CHƯA — eager ≈ 63 KB entry + **496 KB vendor-antd** ≈ 560 KB. Nghẽn = antd
  (dùng khắp app, khó code-split). Đề xuất (ngoài scope, task riêng): audit import antd tree-shake, cân nhắc
  giảm bề mặt component. KHÔNG ép giảm bằng cách vỡ kiến trúc.
- **Largest lazy chunk < 150 KB:** ⚠️ vendor-cornerstone 830 KB gzip vượt — NHƯNG lazy, chỉ nạp ở route
  DICOM viewer (chấp nhận: thư viện y tế nặng bản chất). DicomViewer app-chunk 135 KB < 150 ✅.

### Đã làm (safe, self-contained)
- `React.memo` cho Rail + Flyout; `useCallback` 6 handler shell → sidebar ổn định.
- Suspense per-route xác nhận đã có (không cần đổi).
- **DEFER (ngoài scope / phụ thuộc):** visualizer plugin (thêm dev-dep) · antd-slimming (task riêng) ·
  memo sâu hơn sau khi tách shell (#376 Sidebar.tsx).
