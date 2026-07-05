# HIS Layout Architecture — Hiện trạng

> Kết quả khảo sát thực tế codebase (2026-07-05). Đây là phân tích "as-is" — không phán xét tốt/xấu, chỉ ghi nhận chính xác để làm cơ sở so sánh sau refactor.

---

## 1. Shell Architecture

### 1.1 TerminalLayout.tsx (v2 shell)

| Metric | Giá trị |
|---|---|
| Dòng code | **959 dòng** |
| Menu item hardcode | 128 items, 10 group |
| Permission check | **Không có** — tất cả user thấy tất cả menu |
| ErrorBoundary | **Không có** quanh `<Outlet>` — lỗi 1 trang crash toàn shell |
| Dark mode Antd-trong-v2 | **Vỡ** — `ConfigProvider` nested hardcode màu hex light, không đọc `isDark` từ ThemeContext |
| Patient context bar | Sinh bệnh nhân giả từ `?pid=` query string |
| Notification | 4 bản ghi demo cứng, KHÔNG dùng `NotificationContext` thật |
| Status bar | BHYT OK / HL7 / PACS đều hardcode, không phản ánh trạng thái thật |

**Cấu trúc menu hiện tại (`HIS_GROUPS`):**
```
type NavItem = { id: string; path: string; label: string; hot?: number }
// KHÔNG có trường: permission, role, hidden, group
```

Điều này có nghĩa: không thể filter menu mà không thay đổi kiểu dữ liệu.

### 1.2 App.tsx (v2 router)

| Metric | Giá trị |
|---|---|
| Dòng code | **834 dòng** |
| Lazy imports | 279 |
| `<Route>` elements | 305 |
| Route v2 | ~167 |
| Route v1 (đang khai tử) | ~122 |
| `ProtectedRoute` | Chỉ check `isAuthenticated`, KHÔNG check role/permission |
| Suspense | 1 cái bao toàn bộ — không granular |
| Bug | Duplicate `path="procurement"` (2 lần đăng ký, cái sau dead) |
| Dead routes | 12 `lite/*` alias cùng component; 3 menu link đến route không tồn tại |

### 1.3 MainLayout.tsx (v1 shell — đang khai tử)

| Metric | Giá trị |
|---|---|
| Dòng code | 478 |
| ErrorBoundary | **Có** (v1 tốt hơn v2 ở điểm này) |
| Notification | Dùng `NotificationContext` thật (SignalR) |
| Menu | Duplicate + `getOpenKeys` map trong cùng file |

---

## 2. RBAC End-to-End

### 2.1 Frontend — hoàn toàn mù quyền

```
AuthContext.tsx:
  hasPermission(p: string): boolean   // → 0 caller trong toàn FE
  hasRole(r: string): boolean         // → 0 caller trong toàn FE
```

**Hậu quả:** Mọi user (admin, nurse, receptionist) đều thấy toàn bộ 156 trang và 128 menu item.

### 2.2 Backend — RBAC có nhưng không hoàn chỉnh

| Layer | Trạng thái |
|---|---|
| `[Authorize(Roles=...)]` | 532 attribute trên 70 controller file |
| Permission claim trong JWT | Có emit (`AuthService.cs:283-286`) nhưng KHÔNG có policy/handler tiêu thụ |
| Role thực tế hoạt động | 6/18 nhóm role (`Admin`, `Doctor`, `Nurse`, `Receptionist`, `Pharmacist`, `LabTechnician`) |
| Orphan role constants | 26 role constant trong `RoleNames.cs` — emit trong `[Authorize]` nhưng KHÔNG có trong JWT → luôn trả `false` |

### 2.3 Phân nhóm 18 vai hiện tại

| Nhóm | Vai | Status |
|---|---|---|
| Lâm sàng | Doctor, Nurse, ClinicalPharmacist | Hoạt động |
| Hành chính | Receptionist, MedicalRecords, Cashier | Hoạt động |
| Dược | Pharmacist, WarehouseManager | Hoạt động |
| Cận lâm sàng | LabTechnician, Radiologist, RadiologyTech | Hoạt động |
| Quản lý | Admin, DirectorDoctor, DepartmentHead, QualityManager | Hoạt động |
| Nghiệp vụ khác | NutritionStaff, SocialWorker, ITStaff, SecurityStaff | Orphan |

---

## 3. Inventory 156 trang v2

### 3.1 Phân bố theo domain

| Domain | Số trang |
|---|---|
| Inpatient (nội trú) | ~28 |
| OPD/EMR (khám ngoại) | ~22 |
| Laboratory/LIS | ~18 |
| Pharmacy (dược) | ~16 |
| Billing/Finance | ~14 |
| Radiology/RIS | ~12 |
| Admin/System | ~10 |
| Nutrition, Social, Ward | ~8 |
| Reports/Dashboard | ~8 |
| Khác | ~20 |

### 3.2 Vấn đề P0 — Patient Context Race Condition

**Kịch bản:**
1. Nurse chọn Bệnh nhân A → `OpdEditor.selectPatient(A)` gọi async load
2. Ngay sau, nurse chọn Bệnh nhân B → `selectPatient(B)` gọi async load
3. Response của A đến sau response của B (network jitter)
4. **Kết quả:** Dữ liệu A ghi vào hồ sơ đang hiển thị cho B

**Hiện trạng:** Không có `AbortController`, không có revision/examId guard, không có "last-wins" protection.

**Mức độ:** P0 Patient Safety — phải fix trước khi triển khai permission layer.

### 3.3 Dashboard

- 1 dashboard duy nhất, hiển thị giống nhau cho mọi role
- KPI widget: không lọc theo phân quyền — nurse thấy widget tài chính, cashier thấy widget lâm sàng
- Không có role-aware widget registry

---

## 4. Notification Architecture

### 4.1 Hạ tầng (production-ready)

`NotificationContext.tsx` (183 dòng):
- SignalR với backoff reconnect
- Typed message bus
- Real-time alerts (lab result ready, medication pending, etc.)

### 4.2 Kết nối thực tế

| Shell | Notification |
|---|---|
| v1 (MainLayout) | Dùng `NotificationContext` thật ✓ |
| v2 (TerminalLayout) | 4 bản ghi **demo giả** hardcode ✗ |

### 4.3 Command Palette

`CommandContext.tsx` — 8 lệnh chuẩn:
- Chỉ **1/156 trang** đăng ký lệnh riêng (`SpecialtyEMR.tsx`)
- Keyboard shortcut Cmd/Ctrl+K — thiếu discoverability

---

## 5. Vấn đề Performance Hiện Tại

| Vấn đề | Chi tiết |
|---|---|
| Single `<Suspense>` | Bao toàn bộ 305 route → loading spinner quá rộng khi 1 trang lazy load |
| Bundle analysis | Chưa có Rollup visualizer trong Vite config |
| TerminalLayout monolith | 959 dòng — Sidebar + TopBar + PatientBar + NotifBell + IdleLogic tất cả cùng file |
| `HIS_GROUPS` rebuild | Không có `useMemo` — rebuild mỗi render của `TerminalLayout` |

---

## 6. Security Gaps

| Gap | Trạng thái |
|---|---|
| Idle timeout | **Không có** |
| Lock screen | **Không có** |
| Concurrent login | **Không có** chính sách (2 session cùng user = cùng token) |
| Break-glass | **Không có** (cần cho emergency access) |
| Session audit log | **Không có** phía FE |
| Permission audit | BE emit claim nhưng không log who-accessed-what |
