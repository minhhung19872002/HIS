# PLAN — Hoàn thiện gói NangCap26 + xử lý dứt điểm backlog

> Lập 2026-08-04. Nguồn: `docs/requirements/20-yeu-cau-nang-cap/NangCap26.pdf` (113 trang,
> HSMT TTYT Tịnh Biên — An Giang: HIS + EMR + RIS/PACS + LIS).
> Kết quả đối chiếu chi tiết: `docs/requirements/20-yeu-cau-nang-cap/nangcap-phan-tich.md` §PHAN 22.
>
> **Quy định mới (2026-08-04): KHÔNG tạo GitHub Issue mới.** Plan nằm ở file này.
> Issue đang mở = việc thật, giải quyết cho xong, **không bulk-close**.

---

## 0. Kết quả kiểm tra yêu cầu

| Phân hệ | Số mục yêu cầu | Đã có | Thiếu |
|---|---|---|---|
| HIS | ~745 | ~735 | 10 |
| EMR | 99 | 99 | 0 |
| LIS | ~150 thao tác (35 nhóm) | 33 nhóm | 2 |
| RIS/PACS | 254 | 253 | 1 |
| **Tổng** | **~1.250** | **~1.238** | **12 gap** |

Không có gap nào là "phân hệ mới hoàn toàn" — tất cả đều bổ sung trên module đã tồn tại.

---

## A. 9 hạng mục triển khai (12 gap)

Quy tắc chạy chung cho mọi hạng mục:
`đọc code hiện trạng → sửa/bổ sung BE → FE → build-gate (dotnet build + npm run build 0 error) → commit LOCAL`.
**Chỉ `git push` khi cả 9 hạng mục xong** (theo CLAUDE.md: long/multi-part task push 1 lần).

| # | Hạng mục | Mục HSMT | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| 1 | Khóa lô thuốc + khóa kho | V.31, V.33 | P1 | ✅ **DONE** — `c02fad38` |
| 2 | Phân quyền dữ liệu row-level + khoa/phòng làm việc | I.15, I.16, I.4 | P1 | ✅ **DONE** — `f8d2e8cd` |
| 3 | LIS: Ngoại kiểm (EQA) + đơn vị gửi mẫu | LIS #29, #15 | P2 | ✅ **DONE** — `da27f24c` |
| 4 | RIS: ghi đĩa CD/DVD ảnh + kết quả | RIS I.4.3, #59, CAPTURE #118 | P2 | ✅ **DONE** — `006ff39d` |
| 5 | Duyệt phiếu suất ăn + màn hình Nhà ăn | XII.5, XII.6 | P2 | ✅ **DONE** — `b01786c1` |
| 6 | TTB: yêu cầu trang cấp + duyệt; duyệt KH bảo dưỡng | XVII.3/4/7 | P2 | ✅ **DONE** — `b4daa60f` |
| 7 | Kiểm tra lạm dụng thẻ BHYT | Liên thông XIX.1.1 | P2 | ✅ **DONE** — `ac9cd465` |
| 8 | Phiếu đếm gạc-dụng cụ + phiếu lĩnh hóa chất | X.2#16, phiếu in #98 | P3 | ✅ **DONE** — `159c701a` |
| 9 | Tách điều trị nội trú tại khoa cấp cứu | XIX.2#20 | P3 | ✅ **DONE** — `e7330535` |

### Hạng mục 1 — Khóa lô thuốc + khóa kho ✅
- **DB** `154_nangcap26_lock_lot_warehouse.sql`: `Warehouses` + IsLocked/LockReason/LockedBy/LockedAt;
  `InventoryItems` + LockedBy/LockedAt (IsLocked/LockReason đã có); index `IX_InventoryItems_IsLocked`.
- **BE** `WarehouseCompleteService.Locking.cs`: lock/unlock lô + kho, danh sách lô khóa, trạng thái kho.
  Guard `EnsureWarehouseNotLockedAsync` cắm vào phát ngoại trú / nội trú / xuất khoa / `CreateStockIssueByType`;
  `EnsureBatchNotLocked` chặn cả khi chọn đích danh lô.
- **Bug an toàn NB đã fix kèm**: `DispenseInpatientOrderAsync` trước đây không lọc `IsLocked`
  → lô thu hồi vẫn phát được cho BN nội trú.
- **FE** `StockReport.tsx`: nút Khóa/Mở trên dòng lô + tab "Khóa kho" + modal bắt buộc nhập lý do.

### Hạng mục 2 — Phân quyền dữ liệu row-level (P1, blast radius rộng)
- **DB**: `DataPermissionGroups`, `DataPermissionGroupItems` (ScopeType Department/Room/Warehouse/
  TreatmentType/PatientObject + ScopeId), `UserDataPermissionGroups`.
- **BE**: CRUD nhóm quyền + gán user; `IDataScopeResolver` áp dần vào query Reception/OPD/IPD/Pharmacy/Billing.
- **FE**: `SystemAdmin` tab "Quyền dữ liệu"; header chọn khoa/phòng làm việc (lưu `UserSettings`).
- ⚠️ **Fail-open**: user chưa gán nhóm = thấy toàn bộ như hiện nay → không chặn nhầm dữ liệu lâm sàng.

### Hạng mục 3 — LIS Ngoại kiểm + đơn vị gửi mẫu
- **DB**: `LabEqaTests`, `LabEqaBatches`, `LabEqaResults`, `LabSendingUnits`.
- **BE**: `LISCompleteController.SubModules` — `eqa/*`, `sending-units/*` (kèm import/export Excel).
- **FE**: `LabQC.tsx` thêm tab "Ngoại kiểm"; `LisCatalogAdmin.tsx` thêm "Đơn vị gửi mẫu".
- Nội kiểm (IQC: `qc/lots`, `qc/levey-jennings`) đã có — không đụng.

### Hạng mục 4 — RIS ghi đĩa CD/DVD
- Trình duyệt không ghi đĩa trực tiếp → **BE đóng gói, FE tải về**, user ghi bằng công cụ OS.
- **BE**: `POST ris/studies/{studyId}/disc-package` — pull ảnh từ Orthanc (`/studies/{id}/archive`),
  gộp PDF kết quả, (tùy chọn) `DICOMDIR`/`AUTORUN.INF` → ZIP; study lớn chạy async + job status.
- **FE**: nút "Ghi đĩa / Xuất gói ảnh" ở `Radiology` + `radiology/viewer`.
- **Audit**: log ai xuất, study nào, lúc nào (dữ liệu BN rời hệ thống).

### Hạng mục 5 — Duyệt suất ăn + Nhà ăn ✅
- **DB** `155_nangcap26_meal_approval_canteen.sql`: `MealPlans` + ApprovedBy/ApprovedAt/RejectReason/
  PreparedAt/DistributedAt; `MealPlanItems` + BilledAt; `DietTypes` + ServiceId; index Date+Status.
- **BE** `ClinicalNutritionServiceImpl.Canteen.cs`: vòng đời `Planned → Approved/Rejected → Prepared → Distributed`;
  duyệt → sinh khoản thu qua **ServiceRequest + Detail** (đường tính tiền sẵn có), `BilledAt` chống tính trùng.
  Chế độ ăn không map `ServiceId` = không thu tiền.
- **FE**: trang Nutrition thêm tab "Duyệt suất ăn" + trang "Nhà ăn" (hàng chờ theo khoa/bữa).
- API: meal-plans/{id}/approve|reject · canteen/queue · canteen/{id}/prepared|distributed.

### Hạng mục 6 — TTB trang cấp + duyệt bảo dưỡng
- **DB**: `AssetAllocationRequests` (+items, Draft/Submitted/Approved/Rejected/Issued);
  maintenance schedule + ApprovalStatus/ApprovedBy/ApprovedAt.
- **BE**: `asset/allocation-requests` CRUD + approve/reject/issue (issue → sinh handover đã có);
  `equipment/maintenance/{id}/approve|reject`.
- **FE**: `AssetManagement.tsx` tab "Yêu cầu trang cấp"; Equipment thêm nút duyệt kế hoạch.

### Hạng mục 7 — Lạm dụng thẻ BHYT ✅
- **BE** `ReceptionCompleteService.CardAbuse.cs` + `GET /api/reception/insurance/card-abuse-check`.
  3 ngưỡng đọc `SystemConfig` (lượt/ngày, lượt/kỳ, số cơ sở), mặc định 2/6/3 trong 30 ngày.
- **FE** `BhytVerifyModal`: tự kiểm tra sau khi tra thẻ, khối cảnh báo vàng/đỏ + bảng chi tiết lượt.
- **Chỉ cảnh báo, không chặn tiếp nhận.**

### Hạng mục 8 — 2 mẫu in
- Phiếu đếm gạc/dụng cụ (ekip mổ, đếm trước–sau, ký xác nhận) + Phiếu lĩnh hóa chất.
- Theo skill `his-fe-emr-print-form`: print component + đăng ký `printType` trong `PrintTemplateRenderer`.

### Hạng mục 9 — Tách điều trị nội trú tại cấp cứu
- **BE**: `POST emergency/encounters/{id}/split-inpatient` — tạo encounter nội trú mới,
  chuyển chỉ định/thuốc phát sinh sau mốc tách, giữ liên kết + audit 2 chiều.
- **FE**: nút "Tách điều trị nội trú" + modal chọn mốc thời gian/khoa.
- ⚠️ Chạm viện phí + hồ sơ BHYT → **chặn tách khi đợt đã duyệt BHYT / đã khóa số liệu**.

---

## B. Xử lý backlog Issue đang mở (133 issue)

**Không đóng hàng loạt.** Phân loại và giải quyết:

| Nhóm | Số lượng | Cách xử lý |
|---|---|---|
| Feature/UX còn mở (`#467` v2 UX + RowActions) | 1 | Làm sau khi xong 9 hạng mục NangCap26 |
| `test` / `TEST-EV` (evidence, E2E, harness) | ~132 | **Đi cuối cùng** theo CLAUDE.md — chỉ bắt đầu khi 100% việc fix/feature đã xong |
| Issue `NC26-1..5` (#468–#472) vừa tạo | 5 | Đã có plan tương ứng trong file này; đóng khi code được push |

**Thứ tự tổng**: 9 hạng mục NangCap26 → `#467` → toàn bộ nhóm `test`.

---

## C. Định nghĩa hoàn thành (DoD) cho mỗi hạng mục

- [ ] `dotnet build` 0 error · `npm run build` 0 error
- [ ] Migration idempotent (`IF NOT EXISTS`), số thứ tự = max(NN)+1 tại thời điểm tạo
- [ ] Service mới đăng ký DI trong `DependencyInjection.cs` (nếu là service mới)
- [ ] Smoke thủ công đường đi chính (không có test tự động — test đi sau)
- [ ] Commit local, message nêu rõ mục HSMT tương ứng
- [ ] Cập nhật trạng thái trong file plan này

---

## D. Trạng thái chốt (2026-08-04)

**9/9 hạng mục DONE**, 8 commit local chưa push:
`c02fad38` · `ac9cd465` · `79cc0259` (docs) · `b01786c1` · `b4daa60f` · `da27f24c` ·
`006ff39d` · `159c701a` · `e7330535` · `f8d2e8cd`

Migration mới: 154 (khóa lô/kho) · 155 (duyệt suất ăn) · 156 (trang cấp + duyệt bảo dưỡng) ·
157 (ngoại kiểm EQA + đơn vị gửi mẫu) · 158 (quyền dữ liệu).

Build-gate: `dotnet build` 0 error · `npm run build` thành công.
Chưa push — chờ người dùng quyết định.
