# HIS Commercial — Thiết kế Layout · Role · Module cho sản phẩm thương mại

> Brief 2026-07-05: thương mại hóa cho **phòng khám đa khoa / chuyên khoa, trung tâm y tế, BV vừa-nhỏ**.
> 100–1.000 tài khoản · 30–150 CCU · team 1–3 dev · MVP 9–12 tháng. **KHÔNG enterprise, KHÔNG over-engineering.**
> Tài liệu này **điều chỉnh** các quyết định trong README (ADR-L01→L06) theo scope thương mại. Catalog quyền chi tiết → `09-permission-catalog.md`.

---

## PHẦN 1 — Phản biện Product Scope

### Các con số đề bài vs kết luận

| Đề bài | Kết luận | Ghi chú |
|---|---|---|
| 4 Layout | **1 shell vật lý + 4 workspace logic** | Xem §2 — layout vật lý riêng là bẫy chi phí |
| 10 ± 2 Role | **12 role template** (seed, editable) | Đủ biên; 2 template đánh dấu "BV mới cần" |
| 15 ± 3 Resource | **17 resource** | Trong biên nhờ model Dispense/Collect/Refund thành action |
| 6–8 Action | **8 chuẩn + 3 đặc thù** (trần 5 đặc thù) | |
| 70–100 Permission | **72 mã v1**, trần cứng 100 | Ma trận sparse, không cross-product |
| 8–12 Module | **10 module** thương mại | 28 module legacy → EXTENDED (ẩn, upsell) |

### Phản biện — giả định ngầm & điểm mù của đề bài

1. **"4 Layout" là giả định ngầm nguy hiểm nhất.** Nếu hiểu là 4 shell component riêng → chi phí bảo trì x4, UX không nhất quán, và người kiêm nhiệm (rất phổ biến ở PK nhỏ: 1 người = lễ tân + thu ngân) phải nhảy giữa 2 "ứng dụng". Giải đúng: **layout = hồ sơ menu (data), không phải code**. Chi tiết §2.
2. **Điểm mù lớn nhất: codebase đã có 156 trang / 38 module** — đề bài nói 8–12 module nhưng không nói làm gì với phần còn lại. Đây là quyết định chi phí lớn nhất: **không xóa, không port — ẩn sau cờ module** (EnabledModules). Cơ chế cờ này chính là **cơ chế đóng gói bán hàng** (Gói Phòng khám / Gói Bệnh viện) — không phải over-engineering, là điều kiện thương mại hóa.
3. **Thiếu trong đề bài nhưng bắt buộc cho thị trường VN:** BHYT (check-in + XML claims — phần lớn PK đa khoa có ký BHYT; đối thủ MQSoft có), lịch hẹn + số thứ tự (PK sống nhờ nó), in phiếu (nhiệt vs A4). Đã đưa vào 10 module.
4. **Không cần thiết kế cho 30–150 CCU** — con số này không tạo ràng buộc kiến trúc FE nào; backend Cloud Run hiện tại thừa sức. Không làm gì thêm = đúng.
5. **Chuỗi phòng khám 2–5 cơ sở** là phân khúc thương mại có thật nhưng đề bài loại multi-hospital. Quyết định: **DEFER** — không làm UI multi-branch v1, nhưng không phá (BranchId đã tồn tại trong DB per #369/#292).

**Kết luận Phần 1:** scope đề bài về cơ bản hợp lý; điều chỉnh 3 điểm: (a) 4 workspace thay vì 4 layout vật lý, (b) bổ sung cơ chế đóng gói module, (c) BHYT + Appointment vào core.

---

## PHẦN 2 — Layout Architecture: 1 Shell + 4 Workspace

### Vì sao KHÔNG phải 4 layout vật lý (Clinical/Financial/Administration/System như gợi ý)

- "System" cho phòng khám chỉ là user/role/danh mục/cấu hình — quá mỏng để là workspace làm việc hằng ngày → gộp vào Back-office.
- Reception đứng cùng bàn với Cashier (thực tế PK Việt Nam) → tách họ vào 2 layout là sai thực địa.
- Workspace = **thuộc tính `workspace` trên mỗi entry của module-registry** (#375) — đổi cách cắt sau này là sửa data, không refactor.

### 4 Workspace

| WS | Tên | Ai dùng | Workflow chính | Dashboard widget | Sidebar (nhóm) | KHÔNG nên có |
|---|---|---|---|---|---|---|
| 1 | **Tiếp đón & Thu phí** | Lễ tân, Thu ngân | BN đến → đăng ký/hẹn → phát số → thu tiền → in hóa đơn → cuối ca nộp quỹ | Hàng đợi hôm nay, số BN đã đăng ký, doanh thu ca, hóa đơn chưa thu | Tiếp đón · Hẹn khám · Thu ngân · BHYT check-in | EMR chi tiết, kho, cấu hình |
| 2 | **Chuyên môn** | Bác sĩ, Điều dưỡng, KTV XN/CĐHA, BS CLS | Nhận BN từ hàng đợi → khám → chỉ định → kết quả → kê đơn → chốt bệnh án; KTV: queue chỉ định → nhập KQ → (BS CLS) duyệt | Hàng đợi của tôi, KQ chờ duyệt, lịch hẹn hôm nay, (BV) giường trống | Khám bệnh · Xét nghiệm · CĐHA · Nội trú (nếu bật) | Giá tiền chi tiết, thu tiền, user mgmt |
| 3 | **Dược & Kho** | Dược sĩ, Thủ kho | Đơn từ phòng khám → kiểm → cấp phát/bán lẻ → trừ kho; nhập hàng → duyệt phiếu → kiểm kê → cảnh báo hạn dùng | Đơn chờ cấp phát, cảnh báo tồn/hạn dùng, phiếu chờ duyệt | Cấp phát · Bán lẻ · Kho · Mua hàng | EMR, thu ngân, báo cáo tài chính |
| 4 | **Quản trị & Báo cáo** | Admin, Quản lý/Giám đốc, Kế toán | Duyệt (hoàn tiền, hủy hóa đơn, phiếu kho), báo cáo doanh thu/hoạt động, chốt BHYT XML hàng tháng, quản lý user/role/danh mục/giá | Doanh thu ngày/tháng, hoạt động theo khoa, BHYT chờ chốt, cảnh báo hệ thống | Báo cáo · BHYT (claims) · Danh mục & Giá · Người dùng · Hệ thống | Màn thao tác nghiệp vụ hằng ngày (khám, thu từng ca) |

**Cơ chế:** user có ≥2 workspace → topbar hiện switcher; 1 workspace → không hiện gì (không phí UI). Workspace mặc định gán theo role template (bảng ở `09-permission-catalog.md §4`). Trong 1 workspace, sidebar chỉ có 2–4 nhóm — giải quyết tận gốc bệnh "128 menu item trong 1 sidebar".

**Mở rộng tương lai:** thêm workspace = thêm 1 record data (ví dụ WS5 "Nội trú" tách riêng nếu khách BV yêu cầu) — không đụng shell.

---

## PHẦN 3 — Roles (12 template)

Chi tiết + ma trận: `09-permission-catalog.md §4`. Nguyên tắc cốt lõi:

- **Role = permission bundle template (seed data), KHÔNG hardcode enum** — mỗi triển khai clone/sửa được. Đây là điểm khác biệt quyết định so với 18 role hardcode hiện tại (26 orphan constants).
- **Multi-role = UNION** — 1 người kiêm lễ tân + thu ngân là chuẩn PK nhỏ, không phải ngoại lệ.
- **Gộp:** SpecialtyDoctor/EmergencyDoctor/DepartmentHead → Doctor · DirectorDoctor/QualityManager → Manager · MedicalRecords → clone Receptionist · ITStaff → Admin · RadiologyTech → ImagingTech · Radiologist/LabDoctor → BS CLS (PCD).
- **Không tách:** không tạo role theo chức danh (Phó khoa, Điều dưỡng trưởng...) — khác biệt quyền giải quyết bằng clone template.
- **Bỏ khỏi core:** NutritionStaff / SocialWorker / SecurityStaff (module không ship v1).

## PHẦN 4–6 — Resources (17) · Actions (8+3) · Permissions (72)

→ Toàn bộ trong **`09-permission-catalog.md`** (nguồn sự thật duy nhất, tránh chép đôi).

---

## PHẦN 7 — Modules (10) + Đóng gói

| # | Module | Loại | Gói Phòng khám | Gói Bệnh viện | Trang v2 hiện có |
|---|---|---|---|---|---|
| 1 | TIEPDON — Tiếp đón, hẹn, số thứ tự | **CORE** | ✓ | ✓ | Có (verify workflow) |
| 2 | KHAMBENH — Khám + EMR | **CORE** | ✓ | ✓ | Có |
| 3 | LIS — Xét nghiệm | Toggle | Tùy chọn | ✓ | Có |
| 4 | CDHA — Chẩn đoán hình ảnh | Toggle | Tùy chọn | ✓ | Có |
| 5 | DUOCKHO — Dược + Kho | **CORE** | ✓ | ✓ | Có |
| 6 | THUNGAN — Thu ngân, hóa đơn | **CORE** | ✓ | ✓ | Có |
| 7 | BHYT — Giám định, XML | Toggle | Tùy chọn | ✓ | Có (verify độ sâu) |
| 8 | NOITRU — Nội trú | Toggle | ✗ | ✓ | Có (~28 trang) |
| 9 | BAOCAO — Báo cáo | **CORE** | ✓ | ✓ | Có |
| 10 | QUANTRI — User/Role/Danh mục/Cấu hình | **CORE** | ✓ | ✓ | Có |

- **~28 module legacy còn lại** (huyết học truyền máu, dinh dưỡng, CTXH, HR, telemedicine, KSK hợp đồng, tiêm chủng, quản lý thiết bị...) = **EXTENDED**: ẩn sau cờ module, không bán v1, giữ code (không xóa, không maintain chủ động) → upsell sau.
- **Cơ chế:** bảng `EnabledModules` (hoặc section appsettings) + `GET /api/system/enabled-modules`; FE registry lọc menu + route theo cờ. **KHÔNG plugin engine, KHÔNG license server** — cờ tĩnh per deployment.
- **Bỏ hẳn (không làm):** không có module nào phải xây MỚI cho v1 — 10 module đều đã có code nền; công việc là đóng gói + làm cứng chất lượng.

---

## PHẦN 8 — Navigation (giữ đơn giản)

| Thành phần | Quyết định |
|---|---|
| Sidebar | 2–4 nhóm của workspace hiện hành, lọc theo permission; collapse icon-only cho màn nhỏ |
| Topbar | Workspace switcher (khi ≥2) · breadcrumb `Workspace › Nhóm › Trang` (từ registry meta) · bell (SignalR thật, #380) · user menu (tên + role + theme + logout) |
| Search | **Tìm BN nhanh** trên topbar (không dấu → có dấu), KHÔNG phải command palette |
| Quick action | Nút hành động chính per-page (đã có pattern `_v2kit`); KHÔNG global palette (#382 → backlog P3) |
| Notification | 3 mức: Critical (đỏ + âm) / Warning / Info; tối đa 3 hiển thị đồng thời |
| Breadcrumb | Tự sinh từ registry — không maintain tay |

## PHẦN 9 — Routing (không over-engineering)

Giữ nguyên kết luận `04-routing-strategy.md`: **RR7 declarative + registry** (#375) + `RequireAuth`/`RequirePermission` (#377) + lazy per-route (đã có 279) + Suspense per-route + ErrorBoundary (#373). **Không** Data mode, **không** framework mode. Registry meta thêm 2 trường: `workspace` + `module`.

## PHẦN 10 — Folder Structure (tối thiểu churn)

```
frontend/src/
├── app/                    # MỚI — cấu hình trung tâm
│   ├── module-registry.ts  # route + menu + workspace + module + permission
│   ├── workspaces.ts       # 4 workspace definitions
│   └── permissions.ts      # 72 mã (mirror BE HIS.Core)
├── guards/                 # MỚI — RequireAuth, RequirePermission, Forbidden403
├── layouts/terminal/       # giữ + tách (#376)
└── pages-v2/               # GIỮ PHẲNG — KHÔNG migrate 156 file sang feature-folder
```

**Phản biện feature-folder:** migrate 156 file = churn khổng lồ, giá trị gần 0 khi registry đã là chỗ tra cứu trung tâm. Trang mới đặt cạnh trang cũ, phẳng. Chỉ tách folder khi 1 trang phình >5 file con (pattern #205 đã làm).

---

## PHẦN 11 — Những vấn đề thực tế hay bị bỏ sót (disposition từng mục)

| Mục | Trạng thái / Quyết định |
|---|---|
| Dynamic sidebar | Registry + permission filter (#375/#377) |
| Permission cache | `/auth/me` + TTL 5 phút + reload khi đổi role; SignalR push = v2 |
| Route guard | #377 |
| Audit log | BE #371; FE batch page-view cho màn nhạy cảm (Encounter, AuditLog tự thân) |
| Session/Idle timeout | #383 idle-lock 10' + auto-save draft trước khi khóa |
| Loading | Suspense per-route + skeleton widget |
| Error handling | #373 ErrorBoundary + convention toast lỗi API (interceptor đã unwrap envelope) |
| **Print** | **Gap thật cần verify**: chuẩn hóa phiếu in (A4 vs khổ nhiệt 80mm cho hóa đơn/số thứ tự), print CSS, chọn máy in per quầy → issue riêng nếu verify xác nhận thiếu |
| Report/Export | Report.View/Export + lọc theo module visibility (09 §3 ghi chú) |
| Reusable table/form | ĐÃ CÓ `_v2kit` (DataTable/CrudModal/DrawerShell...) — dùng, không xây lại |
| Confirm/Toast/Empty | Convention hóa từ `_v2kit` + Antd (Modal.confirm / message) — 1 trang doc convention, không code mới |
| 403/404 | #377 Forbidden403 + NotFound404 |
| Logging FE | console discipline (đã có convention warn-vs-error); Sentry = backlog |
| **Tìm BN không dấu** | Verify BE — nếu thiếu là **deal-breaker demo** với khách VN |
| **Số phiếu/số hóa đơn** | ĐÃ CÓ ReceiptBook (UPDLOCK) — giữ |
| Concurrent edit 1 hồ sơ | DEFER có cảnh báo — optimistic concurrency cho Encounter ghi vào backlog |

## PHẦN 12 — KHÔNG làm (backlog tường minh)

Multi-tenant SaaS (thay bằng deploy-per-customer) · Multi-hospital · AI · Workflow engine (hardcode luồng VN) · CQRS / Event Sourcing · Micro-frontend · Plugin system · **Patient Portal (FREEZE code hiện có — không bán v1)** · Mobile app · SSO/LDAP · Custom report builder · i18n đa ngôn ngữ · Break-glass (#385 → backlog, tier BV mới xét) · ABAC L3 đầy đủ (SoD/delegation #370 → defer) · Field-masking L4 (giữ tối thiểu 1 case: thu ngân không thấy chẩn đoán — nằm ở #369 BE) · Command palette mở rộng (#382 → P3) · Kiosk lấy số tự phục vụ (v1: lễ tân phát số; kiosk = upsell phần cứng) · Telemedicine/Jitsi (EXTENDED).

---

## PHẦN 14 — Tự phản biện (6 câu hỏi bắt buộc)

| Câu hỏi | Trả lời | Căn cứ |
|---|---|---|
| Over-engineering? | **Không** — workspace là data; module flag là config tĩnh; 72 permission tự viết ~100 dòng guard; đã CẮT: 4 shell vật lý, CASL, data-mode router, feature-folder migration, palette, break-glass, ABAC L3/L4 | Panel phản biện 4 lens (kết quả tích hợp bên dưới) |
| Phù hợp PK & BV vừa-nhỏ? | **Có** — multi-role union + seed rộng cho PK nhỏ; BV siết bằng clone template; NOITRU là toggle | §2, 09 §4 |
| Khó bảo trì? | **Không** — 1 shell, 1 registry, role là data; điểm rủi ro duy nhất = kỷ luật trần 100 permission | 09 §3 |
| Dễ thương mại hóa? | **Có** — EnabledModules = cơ chế đóng gói Gói PK / Gói BV; demo được theo gói | §7 |
| 1–3 dev làm được? | **Có** — epic layout ≈ 4–6 tuần 1 dev; không có hạng mục nào cần chuyên môn hiếm | §13 roadmap |
| MVP 9–12 tháng? | **Có, với điều kiện** — layout/permission chỉ là ~1.5 tháng; rủi ro thật nằm ở **làm cứng chất lượng 10 module** (test, print, BHYT edge-case) — cờ module chính là cơ chế giảm rủi ro (ship 10 module bóng bẩy, ẩn 28 module thô) | §7 |

*(Bảng này được cập nhật sau khi panel phản biện đối kháng hoàn tất — xem mục Kết quả phản biện bên dưới.)*

## Kết quả panel phản biện (4 lens)

> Hoàn tất 2026-07-06. Lens 1+4: workflow agent (sonnet). Lens 2+3: Opus inline (2 agent kia hết quota).

### Lens 1 — Over-engineering?

**Verdict: PASS — không over-engineering. Mọi hạng mục đều justified.**

| Cấu phần | Đánh giá |
|---|---|
| 4 workspace | Data thuần (trường `workspace` trên registry entry) — 0 component mới, 0 routing logic mới |
| 72 permission | ~100 dòng custom (`hasPermission()` đã có trong AuthContext); bỏ CASL là đúng |
| Module flag | Boolean per-deployment, query 1 endpoint — không phức hơn feature-flag thông thường |
| Module Registry | Gộp 834-dòng App.tsx + HIS_GROUPS hardcode → 1 array typed — giảm complexity |
| Role template | Seed data upsert, không thêm code path nào |

Các hạng mục ĐÃ CẮT: 4 shell vật lý · CASL · Data-mode router migration · Feature-folder 156 file · Command Palette mở rộng · Break-glass · ABAC L3/L4 · Multi-tenant. Danh sách cắt dài hơn danh sách làm → thiết kế tiết chế.

**Rủi ro duy nhất cần monitor:** kỷ luật trần 100 permission (phá vỡ khi thêm resource mà không gộp action).

---

### Lens 2 — Phù hợp thương mại PK/BV vừa-nhỏ VN?

**Verdict: 7/10 — thiết kế phù hợp nhưng có 2 gap deal-breaker cần xử lý trước demo.**

| Hạng mục | Trạng thái |
|---|---|
| Lịch hẹn + số thứ tự | **SẴN SÀNG** — `AppointmentBookingController.cs` đầy đủ end-to-end (verify workflow) |
| In hóa đơn / phiếu | **SẴN SÀNG** — `PdfController` có (verify workflow) |
| BHYT check-in + XML | **PARTIAL** — code thật nhưng cần credentials BHXH + XSD files; không block demo nội bộ |
| Multi-role union (1 người = lễ tân + thu ngân) | **OK** — union semantics trong `hasPermission()`, 12 template seed phù hợp |
| Chuỗi PK 2–5 cơ sở | **DEFER** — BranchId có trong DB per #369; UI multi-branch không làm v1 |
| **Tìm BN không dấu** | **❌ MISSING — DEAL-BREAKER** — verify xác nhận: `Contains()` plain SQL, không normalize dấu; PK VN demo là type "nguyen van an" find "Nguyễn Văn An" |
| EnabledModules | **❌ MISSING** — chưa có bảng/API/FE filter; cần xây trước ship |

**Gap #403 — Tìm BN không dấu:** Đây là tính năng bắt buộc khi demo cho khách VN. Không một PK nào chấp nhận phần mềm không hỗ trợ tìm không dấu. Đối thủ MQSoft có. Chi phí fix thấp (SQL COLLATE_INSENSITIVE hoặc normalize pre-query). Phải có issue riêng, độ ưu tiên P1 commercial.

**Gap #402 — EnabledModules:** Không có cơ chế này thì không demo được "Gói Phòng khám" vs "Gói Bệnh viện" cho khách. Phải xây trước marketing.

---

### Lens 3 — Nhất quán với path migration hiện tại?

**Verdict: PASS — additive hoàn toàn, không phá vỡ hiện trạng.**

Kiểm tra 3 điểm rủi ro:

1. **Module Registry là file mới** (`src/app/module-registry.ts`) — App.tsx HIỆN TẠI không đụng cho đến khi team quyết định chuyển sang. Migration có thể làm dần (pilot 10 route trước, giữ 146 route inline).
2. **Permission pipeline** bắt đầu từ 0 FE caller → không có regression cũ. `RequirePermission` wrapper thêm vào từng route một — không batch break.
3. **v1 pages** không đụng gì — decision #204 giữ nguyên. workspace + module là trường trong registry chỉ áp cho v2.

Rủi ro nhỏ duy nhất: **schema drift giữa `09-permission-catalog.md` và code thật** — giải quyết bằng `PermissionCatalog.cs` là nguồn sự thật BE, FE mirror thủ công từ đó (tài liệu hóa trong cmt-378).

---

### Lens 4 — Completeness?

**Verdict: 90% đủ — 3 gap nhỏ cần issue, 1 gap lớn đã tạo (#403).**

| Gap | Mức | Issue |
|---|---|---|
| Tìm BN không dấu | **P1** | #403 (mới tạo) |
| EnabledModules chưa có BE+FE | P1 | #402 (mới tạo) |
| Workspace layer + switcher | P1 | #401 (mới tạo) |
| Print CSS / chọn máy in per quầy | P2 | Chưa có — note trong §11 "Print" |
| Role seeder script SQL thật | P2 | Thêm vào AC của #367 |
| Audit log event catalog theo 10 module | P3 | Thuộc #371 |

Phần đã đủ: §2 workspace design · §3 role taxonomy · §4–6 permission catalog (doc 09) · §7 module packaging · §8 navigation · §9 routing · §10 folder · §12 NOT-DO list · §14 self-critique.

Tài liệu đủ để team bắt đầu implement phase P0→P1 mà không cần thêm research.
