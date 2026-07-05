# HIS Layout Architecture — Navigation UX & Persona Analysis

---

## 1. Persona Analysis — 18 Vai Nhân Viên

> Bệnh viện 100–1.000 nhân sự. Nhỏ: 1 người kiêm nhiều vai. Lớn: chuyên biệt.

### 1.1 Nhóm Lâm sàng

#### Bác sĩ Khám bệnh (Doctor)
- **Màn hình chủ:** OPD exam → EMR → Lab orders → Prescription
- **Workflow chính:** Mở queue bệnh nhân → chọn → khám → kê đơn → đóng ca
- **Áp lực UX:** Tốc độ cao nhất — mỗi bệnh nhân 5–10 phút; cần shortcut F-key; không click nhiều
- **Permission cần:** OPD.VIEW, OPD.EDIT, OPD.SIGN, EMR.VIEW, EMR.EDIT, LAB.VIEW, PHARMACY.VIEW
- **Ẩn:** Billing, Warehouse, Admin

#### Điều dưỡng (Nurse)
- **Màn hình chủ:** Inpatient ward → Medication administration → Vital signs
- **Workflow chính:** Nhận y lệnh → thực hiện → ghi kết quả → báo cáo bất thường
- **Áp lực UX:** Thường dùng tablet/laptop nhỏ tại đầu giường; compact mode quan trọng
- **Permission cần:** INPATIENT.VIEW, INPATIENT.EDIT, PHARMACY.VIEW (xem toa), LAB.VIEW
- **Ẩn:** Billing, Admin, RIS approve, Lab approve

#### Bác sĩ chuyên khoa (SpecialtyDoctor)
- **Đặc điểm:** Kết hợp Doctor + EMR sâu hơn + DICOM viewer
- **Thêm so với Doctor:** RIS.VIEW, DICOM.VIEW

#### Bác sĩ cấp cứu (EmergencyDoctor)
- **Đặc điểm:** Cần break-glass access; không có thời gian tìm bệnh nhân
- **UX đặc biệt:** Nút "Cấp cứu" trong patient search → mở hồ sơ bất kỳ + break-glass log

### 1.2 Nhóm Hành chính

#### Lễ tân / Đăng ký (Receptionist)
- **Màn hình chủ:** Patient registration → Appointment → Insurance verification
- **Workflow chính:** Bệnh nhân đến → đăng ký → chọn khoa → in số thứ tự
- **Áp lực UX:** Volume cao (50–200 BN/ngày); cần tìm nhanh bệnh nhân cũ; ít lỗi nhập liệu
- **Permission cần:** RECEPTION.VIEW, RECEPTION.REGISTER, BILLING.VIEW
- **Ẩn:** Clinical, Lab, Radiology, Admin

#### Cán bộ hồ sơ (MedicalRecords)
- **Màn hình chủ:** Patient records → Archive → Retrieval
- **Permission cần:** EMR.VIEW (readonly), RECORDS.MANAGE
- **Ẩn:** Clinical action buttons, Pharmacy, Admin

#### Thu ngân (Cashier)
- **Màn hình chủ:** OPD billing → Receipt → Insurance claim
- **Workflow chính:** Tiếp nhận invoice → xác nhận BHYT → thu tiền → in biên lai
- **Permission cần:** BILLING.VIEW, BILLING.COLLECT, BILLING.REFUND (giới hạn)
- **Ẩn:** Clinical, Pharmacy create, Lab, Admin

### 1.3 Nhóm Dược

#### Dược sĩ phát thuốc (Pharmacist)
- **Màn hình chủ:** Prescription queue → Dispensing → Stock check
- **Workflow chính:** Nhận đơn từ OPD/IP → kiểm dược lý → cấp phát → ghi nhận xuất kho
- **Permission cần:** PHARMACY.VIEW, PHARMACY.DISPENSE, PHARMACY.INVENTORY
- **Ẩn:** Clinical, Lab, Billing (chỉ xem đơn)

#### Thủ kho dược (WarehouseManager)
- **Màn hình chủ:** Stock → Purchase order → Expiry management
- **Permission cần:** PHARMACY.INVENTORY, PHARMACY.PURCHASE, REPORTS.VIEW
- **Ẩn:** Clinical, dispensing queue

### 1.4 Nhóm Cận lâm sàng

#### Kỹ thuật viên XN (LabTechnician)
- **Màn hình chủ:** Lab orders queue → Sample → Enter result → Print
- **Workflow chính:** Nhận mẫu → phân tích → nhập kết quả → phê duyệt nội bộ
- **Permission cần:** LAB.VIEW, LAB.EDIT, LAB.PRINT
- **Ẩn:** Clinical, Billing, Pharmacy, Admin

#### Bác sĩ XN (LabDoctor)
- **Thêm so với LabTechnician:** LAB.APPROVE, LAB.CRITICAL_VALUE
- **UX:** Cần alert ngay khi có giá trị nguy kịch (critical value notification)

#### Kỹ thuật viên CĐHA (RadiologyTech)
- **Màn hình chủ:** RIS orders → DICOM capture → Send to PACS
- **Permission cần:** RIS.VIEW, RIS.EDIT, DICOM.UPLOAD

#### Bác sĩ CĐHA (Radiologist)
- **Thêm:** RIS.APPROVE, DICOM.VIEW (full Orthanc viewer)
- **UX:** DICOM viewer fullscreen — TopBar cần có mode "collapse sidebar"

### 1.5 Nhóm Quản lý

#### Admin hệ thống (Admin)
- **Màn hình chủ:** User management → Role assignment → System config
- **Permission:** ADMIN.USERS, ADMIN.ROLES, ADMIN.CONFIG, ADMIN.AUDIT — full access
- **UX đặc biệt:** Permission matrix editor; audit log viewer

#### Giám đốc chuyên môn (DirectorDoctor)
- **Màn hình chủ:** Reports → Quality metrics → Staff performance
- **Permission cần:** REPORTS.VIEW, REPORTS.EXPORT, QA.VIEW
- **Ẩn:** Admin system; clinical action buttons (chỉ xem)

#### Trưởng khoa (DepartmentHead)
- **Đặc điểm:** Doctor + thêm quản lý nhân sự, báo cáo khoa
- **Permission cần:** Doctor permissions + DEPT.REPORT, DEPT.STAFF

#### Quản lý chất lượng (QualityManager)
- **Màn hình chủ:** Audit → Incident reports → KPI dashboard
- **Permission cần:** QA.VIEW, QA.REPORT, REPORTS.VIEW

### 1.6 Vai nghiệp vụ khác

#### Nhân viên dinh dưỡng (NutritionStaff)
- **Màn hình:** Nutrition orders → Diet planning → Food service
- **Permission cần:** NUTRITION.VIEW, NUTRITION.EDIT

#### Công tác xã hội (SocialWorker)
- **Màn hình:** Social assessment → Patient support → Discharge planning
- **Permission cần:** SOCIAL.VIEW, SOCIAL.EDIT, EMR.VIEW (readonly)

#### IT / Kỹ thuật (ITStaff)
- **Màn hình:** System monitoring → Printer config → DICOM devices
- **Permission cần:** ADMIN.DEVICES, ADMIN.SYSTEM (subset), không có patient data

#### Bảo vệ / An ninh (SecurityStaff)
- **Màn hình:** Visitor log → Access control (nếu tích hợp)
- **Permission cần:** SECURITY.VIEW (rất hạn chế)

---

## 2. Sidebar Design

### 2.1 Cấu trúc

```
┌─────────────────────┐
│  [Logo] HIS          │
├─────────────────────┤
│  [Search] Tìm nhanh  │ ← Ctrl+K
├─────────────────────┤
│ ▸ Lâm sàng          │ ← group header
│   [S] Khám ngoại    │ ← hot=1 → F1
│   [S] EMR           │
│   [S] Nội trú       │
├─────────────────────┤
│ ▸ Xét nghiệm        │
│   [F] Kết quả XN    │
├─────────────────────┤
│ ...                  │
├─────────────────────┤
│ ⚙ Cài đặt           │
│ 👤 Tài khoản         │
│ 🚪 Đăng xuất         │
└─────────────────────┘
```

### 2.2 Keyboard Shortcuts

| Phím | Hành động |
|---|---|
| F1–F9 | Chuyển đến trang `hot=1..9` |
| Ctrl+K | Mở Command Palette |
| Ctrl+B | Toggle sidebar |
| Ctrl+Shift+P | Quick switch patient |
| Esc | Đóng modal/drawer hiện tại |

### 2.3 Compact Sidebar

Bệnh viện lớn, màn nhỏ → sidebar thu gọn chỉ hiện icon:
- Double-click vào group header → collapse
- Hover → tooltip hiện label
- Lưu preference vào localStorage

---

## 3. TopBar Design

```
┌────────────────────────────────────────────────────────────────────┐
│ [≡] [Logo] › Lâm sàng › Khám ngoại trú    [🔔 3] [🌙] [👤 Dr. Hùng] │
└────────────────────────────────────────────────────────────────────┘
```

| Element | Chức năng |
|---|---|
| `[≡]` | Toggle sidebar |
| Breadcrumb | Group › Page title (từ route meta) |
| `[🔔 3]` | Notification bell — dùng `NotificationContext` thật (thay demo) |
| `[🌙]` | Theme toggle (dark/light) |
| `[👤 Dr. Hùng]` | Dropdown: profile, settings, logout; hiện role |

---

## 4. Patient Context Bar

### Vấn đề hiện tại

Patient bar sinh bệnh nhân giả từ `?pid=` query string — không có real API call.

### Thiết kế mới

```
┌────────────────────────────────────────────────────────────────────┐
│ 👤 Nguyễn Văn A (1985) · M · PID: 123456  │ OPD #2024-001 │ BHYT │
│                                             │ [Đổi BN] [Break-glass]│
└────────────────────────────────────────────────────────────────────┘
```

**Race-safe patient change:**
```tsx
// PatientContextBar.tsx
const latestRequestId = useRef<string | null>(null);

const changePatient = async (pid: string) => {
  const reqId = crypto.randomUUID();
  latestRequestId.current = reqId;

  const data = await api.get(`/patients/${pid}/context`);

  // Chỉ apply nếu đây vẫn là request mới nhất
  if (latestRequestId.current !== reqId) return;
  setPatient(data);
};
```

**Đây là fix P0 race condition** — chi tiết thêm tại `01-hien-trang.md §3.2`.

---

## 5. Command Palette

### Hiện trạng

`CommandContext.tsx` — 8 lệnh; chỉ 1/156 trang đăng ký.

### Mở rộng (Phase 2)

```tsx
// Mỗi page tự đăng ký lệnh khi mount
useRegisterCommands([
  { id: 'opd:new-patient',  label: 'Thêm bệnh nhân mới', action: openNewPatient, hot: 'n' },
  { id: 'opd:quick-search', label: 'Tìm bệnh nhân',       action: openSearch,    hot: '/' },
  { id: 'opd:print-queue',  label: 'In danh sách chờ',    action: printQueue },
]);

// Lệnh global (luôn có)
GLOBAL_COMMANDS = [
  { id: 'nav:opd',       label: 'Mở Khám ngoại trú',    action: () => navigate('/v2/opd') },
  { id: 'nav:pharmacy',  label: 'Mở Dược',               action: () => navigate('/v2/pharmacy') },
  { id: 'app:logout',    label: 'Đăng xuất',             action: logout },
  { id: 'app:profile',   label: 'Hồ sơ cá nhân',         action: () => navigate('/v2/profile') },
  // + tất cả route từ registry (người dùng gõ tên trang → navigate)
];
```

### Lệnh từ Registry (tự sinh)

```tsx
// Trong CommandContext hoặc SearchCommand.tsx
const routeCommands = V2_ROUTES
  .filter(r => !r.meta.hidden && can(r.meta.permission))
  .map(r => ({
    id: `nav:${r.id}`,
    label: r.meta.title,
    group: ROUTE_GROUPS.find(g => g.id === r.meta.group)?.label,
    action: () => navigate(r.path),
    hot: r.meta.hot ? `F${r.meta.hot}` : undefined,
  }));
```

---

## 6. Dashboard — Role-Aware Widgets

### Hiện tại

1 dashboard giống nhau cho mọi role.

### Thiết kế mới

```typescript
// Widget registry trong module-registry.ts
interface DashboardWidget {
  id: string;
  Component: React.LazyExoticComponent<any>;
  permission?: string;         // undefined = mọi authenticated user
  roles?: string[];
  size: 'small' | 'medium' | 'large';
  order: number;
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'opd-queue-count', Component: lazy(...), permission: 'OPD.VIEW',  size: 'small', order: 1 },
  { id: 'lab-pending',     Component: lazy(...), permission: 'LAB.VIEW',  size: 'small', order: 2 },
  { id: 'billing-revenue', Component: lazy(...), permission: 'BILLING.VIEW', size: 'medium', order: 3 },
  { id: 'admin-users',     Component: lazy(...), permission: 'ADMIN.USERS',  size: 'large', order: 4 },
  // ...
];
```

```tsx
// DashboardPage.tsx
const widgets = DASHBOARD_WIDGETS.filter(w =>
  (!w.permission || hasPermission(w.permission)) &&
  (!w.roles?.length || w.roles.some(hasRole))
);

return (
  <div className="dashboard-grid">
    {widgets.map(w => (
      <Suspense key={w.id} fallback={<WidgetSkeleton size={w.size} />}>
        <w.Component />
      </Suspense>
    ))}
  </div>
);
```

---

## 7. UX Thực tế HIS (không phải học thuật)

### 7.1 Vấn đề từ Epic/Cerner/MQSoft và HIS Việt Nam

| Vấn đề | Biểu hiện | Giải pháp |
|---|---|---|
| Alert fatigue | Quá nhiều notification → người dùng bỏ qua | Phân loại: Critical (màu đỏ, âm thanh) / Warning / Info; Max 3 alert cùng lúc |
| Cognitive overload | 128 menu item → không biết tìm gì | Group collapse; search palette; F-key top 9 |
| Lost patient context | Mở nhiều tab → quên đang xem BN nào | Patient pill luôn hiện; màu sắc phân biệt |
| Timeout giữa workflow | Session hết → mất data form chưa lưu | Auto-save draft mỗi 30s; resume sau re-auth |
| Printer không in | IP máy in thay đổi → lỗi im lặng | Printer status icon trong TopBar; test-print button |
| Màn hình 768px | Laptop cũ + màn nhỏ ở nhiều BV | Compact sidebar (icon-only); table horizontal scroll |

### 7.2 Notification Priority (thực tế)

```
Critical  → Âm thanh + Banner đỏ toàn màn hình (critical lab value, code blue alert)
Warning   → Toast cam + Bell đỏ (medication due, BHYT sắp hết hạn)
Info      → Toast xanh (lab result ready, BN đến)
System    → Badge trên notification menu (system updates, version info)
```
