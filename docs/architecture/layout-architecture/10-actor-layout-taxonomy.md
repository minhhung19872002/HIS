# HIS Layout Taxonomy — Actor-band layouts + phân quyền qua module

> Spec kiến trúc cho hệ layout HIS v2 (task #431, 2026-07-18). Bổ sung/điều chỉnh `02-layout-architecture.md` (§1 ADR-L01):
> từ "1 shell thống nhất" → **shell-family theo band chức năng, layout do MODULE quyết định (không phải actor)**.
> Nguồn quyết định: hội thoại thiết kế với product owner 2026-07-18.

---

## 0. Nguyên tắc nền (RÀNG BUỘC)

**Thứ tự phân tầng:**
```
App (Router) → Layout → Module → Page → Component
```

1. **Layout là TẦNG cao hơn Module.** Module chỉ *sử dụng* layout, **không sở hữu**. → Mọi layout đặt ở tầng chung `frontend/src/components/layout/`, **tuyệt đối không** định nghĩa shell/layout trong `modules/*`.
2. **Layout KHÔNG quyết định theo actor.** Một người có thể kiêm nhiều vai (bác sĩ đồng thời trưởng khoa). Cơ chế đúng:
   ```
   permission  →  MODULE (user được vào)  →  LAYOUT (module dùng)
   ```
   → `actor × layout` chỉ là **kết quả suy ra** (test-oracle), không phải cổng gác trực tiếp.
3. **Module có 1 layout MẶC ĐỊNH; Page kế thừa; Page override khi hiển thị đặc biệt.**
   - Override: `Print → BlankLayout`, `Viewer → FullscreenLayout`.
   - **Wizard / Split = VARIANT** (mode của 1 layout qua prop), **không** phải layout độc lập.
   - Module nhiều band (vd HR) → gán layout ở **mức page/sub-function**, không gán cứng cả module.

---

## 1. Danh mục Layout

| Loại | Layout | Vai trò | Chrome |
|---|---|---|---|
| **Shell/band** (module-default) | **AdminLayout** | Quản trị hệ thống (User/Role/Permission/SSO/Danh mục/HL7-FHIR/Audit/Thiết bị) | sidebar admin + topbar |
| | **ClinicalLayout** | Chăm sóc lâm sàng (khám, EMR, y lệnh, sinh hiệu, hội chẩn) | sidebar clinical + patient-context bar |
| | **WorkstationLayout** | Nghiệp vụ quầy/CRUD (tiếp đón, thu ngân, dược, kho, LIS, RIS, HR hồ sơ) | sidebar workstation + topbar |
| | **DashboardLayout** | Điều hành/thống kê (KPI, báo cáo, dashboard khoa/viện) | grid widget, tối giản sidebar |
| **Nền tảng** (xuyên suốt) | **AuthLayout** | Chưa đăng nhập (login/OTP/portal login) | card giữa, brand, không sidebar |
| | **ErrorLayout** | 403/404/500/503/maintenance — **= `HttpError` (#428)** | icon + message + action |
| **Override** (page chuyển tới) | **BlankLayout** | In ấn / embed / PDF preview | không chrome |
| | **FullscreenLayout** | Viewer DICOM / kiosk / màn hàng chờ | edge-to-edge, chrome ẩn được |
| **Variant** (mode của 1 layout, KHÔNG standalone) | **Wizard** | Luồng nhiều bước (đăng ký, nhập viện, gói khám) | stepper + prev/next trong band |
| | **Split** | Master-detail (worklist + editor: OPD/EMR/Billing) | 2 pane trong band |

Vị trí file: tất cả trong `frontend/src/components/layout/` (xem §7). Layout nền/override = component riêng; Variant = prop/mode của shell band.

---

## 2. Module → Layout mặc định

11 module nghiệp vụ:

| Module | Band mặc định | Page override / variant |
|---|---|---|
| EMR | Clinical | in bệnh án → Blank |
| Reception | Workstation | đăng ký khám → Wizard(variant) |
| Billing | Workstation | in biên lai/hoá đơn → Blank |
| Pharmacy | Workstation | — |
| Inventory (Kho) | Workstation | — |
| LIS | Workstation | xem kết quả trong ngữ cảnh BN → Clinical |
| RIS | Workstation | — |
| PACS | Workstation | viewer ảnh → Fullscreen |
| HR | Workstation | KPI/thống kê nhân sự → Dashboard *(User/Role/SSO KHÔNG thuộc HR → System → Admin)* |
| System | Admin | — |
| Dashboard | Dashboard | — |

> **HR không gắn cứng 1 layout**: đa số màn hình (Employee/Contract/Salary/Attendance/Insurance/Training) → Workstation; màn thống kê/KPI → Dashboard. Quản trị (User/Role/Permission) là **System**, không phải HR.

---

## 3. Ma trận Actor × Layout (test-oracle)

`✅ default` (landing) · `⚠️ secondary` (vào được nếu quyền cho phép — người kiêm nhiệm) · `❌ blocked` (chặn cứng, gõ URL → 403).

| Actor | Auth | Admin | Clinical | Workstation | Dashboard | Wizard | Blank | Error |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| System Admin | ✅ | ✅ | ❌ | ❌ | ⚠️ | ⚠️ | ✅ | ✅ |
| Ban Giám đốc | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Trưởng khoa | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| Bác sĩ | ✅ | ❌ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| Điều dưỡng | ✅ | ❌ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Tiếp đón | ✅ | ❌ | ❌ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Thu ngân | ✅ | ❌ | ❌ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Dược sĩ | ✅ | ❌ | ❌ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| KTV LIS | ✅ | ❌ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| KTV RIS | ✅ | ❌ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Kho / Vật tư | ✅ | ❌ | ❌ | ✅ | ⚠️ | ✅ | ✅ | ✅ |

> Ma trận này là **oracle kiểm thử**: sau khi gán `permission→module` (RBAC) + `module→layout` (§2), tính ra tập layout mỗi actor chạm được → **phải KHỚP bảng này**. Không hard-code "actor→layout" trong code.

---

## 4. Cơ chế enforce (Router)

Route-config (`routeConfigs/*.routes.ts`) mỗi entry mang meta:
- `module: ModuleId` — module nghiệp vụ (đã có `meta.module`, #405).
- `layout?: LayoutId` — suy mặc định từ `MODULE_LAYOUT[module]`; chỉ set tường minh khi override band.
- `override?: 'blank' | 'fullscreen'` — page chuyển layout đặc biệt.
- `variant?: 'wizard' | 'split'` — mode trong band.
- `permission?: string` — mã quyền (đã có, #377/#378).

Luồng render:
```
Route match → RequirePermission(meta.permission, meta.module)
  ├─ thiếu quyền/module tắt → <ErrorLayout code=403/module-not-enabled>
  └─ ok → resolve layout = override ?? MODULE_LAYOUT[module].band
           → <BandShell band> (+ variant) → <Module><Page/></Module>
```
- **Layout suy từ module**, không từ actor. Actor bị chặn = do thiếu **permission của module** → 403, KHÔNG phải "chặn layout".
- Landing sau login: `defaultLayout(userPerms)` = band của module mặc định theo union quyền (multi-role an toàn).

---

## 5. Reconcile với Workspace #404 (1 nguồn sự thật)

`#404` đã có `WorkspaceId = frontoffice | clinical | pharmacy | backoffice` + switcher + `meta.workspace`. Band mới **thay thế** khái niệm này (cùng trục "nhóm chức năng"), **tái dùng** hạ tầng #404:

| WorkspaceId cũ (#404) | → Band mới |
|---|---|
| `clinical` (Chuyên môn) | `clinical` |
| `frontoffice` (Tiếp đón & Thu phí) | `workstation` |
| `pharmacy` (Dược & Kho) | `workstation` |
| `backoffice` (Quản trị & Báo cáo) | `admin` + `dashboard` (tách theo page: quản trị→admin, báo cáo→dashboard) |

→ Re-cut `WorkspaceId` type + `workspace.service.ts` + gán lại `meta` (Phase 3, tăng dần). **KHÔNG dựng hệ band song song** với workspace.

---

## 6. Ghi chú ADR-L01 (cập nhật)

`02-layout-architecture.md §1` chọn "1 shell thống nhất, bác role-segregated". Cập nhật: quyết định đó đúng cho trục **"1 người nhiều vai không nên bị fragment shell theo vai"** — **vẫn giữ** (band do MODULE quyết định + permission union, không segment theo actor). Bổ sung trục còn thiếu: **band theo chức năng module + layout theo mục đích page** (override/variant). Không mâu thuẫn: multi-role vẫn dùng chung shell-family, chỉ khác band theo module đang mở.

---

## 7. Cây thư mục mục tiêu `components/layout/`

```
components/layout/
├── index.ts                      # barrel
├── types.ts                      # LayoutId · LayoutVariant · ModuleId
├── layoutRegistry.ts             # MODULE_LAYOUT + layoutForModule/layoutForRoute
├── layoutAccess.ts               # LAYOUT_ACCESS (oracle) + canAccessLayout/defaultLayout
├── AuthLayout/                   # nền: chưa đăng nhập
├── ErrorLayout/                  # nền: = wrap HttpError (#428)
├── BlankLayout/                  # override: in/embed
├── FullscreenLayout/             # override: viewer/kiosk
├── variants/
│   ├── WizardLayout.tsx          # variant: stepper mode
│   └── SplitLayout.tsx           # variant: master-detail mode
├── bands/                        # 4 band = wrapper mỏng trên shared shell (Phase 2)
│   ├── AdminLayout.tsx
│   ├── ClinicalLayout.tsx
│   ├── WorkstationLayout.tsx
│   └── DashboardLayout.tsx
├── AppShell/                     # shared shell (refactor từ terminal/TerminalLayout, nhận prop band)
└── terminal/                     # hiện có: Sidebar/TopBar/PatientContextBar/... (tái dùng)
```
> Tất cả trong `components/layout/` (layout > module). Không file layout nào ở `pages/`/`modules/*`.

---

## 8. Roadmap → xem task #431 (Phase 0→4 + checklist chi tiết)
Phase 0 (doc này) → 1 (primitives+registry) → 2 (band shell + enforce) → 3 (reconcile #404 + wiring) → 4 (fix opd hooks + lint folder-convention).
