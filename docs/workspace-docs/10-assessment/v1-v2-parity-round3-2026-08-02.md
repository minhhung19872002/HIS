# Vong-3 adversarial parity verify v1<->v2 (2026-08-02)

> Snapshot phien verify #352 vong-3 (cua 436). Nguon: Workflow 2 dot — 15 finder (Sonnet, 119 cap)
> + skeptic doi khang 100% cac verdict DELETE_SAFE (15 mau vong-1 lat 8; 55 con lai vong-2 lat 27).
> Doc cung `v1-v2-conversion-inventory.md` (SS7); bang nay THAY THE uoc luong "~55-60 DELETE-safe" cua SS7e.

## Tong ket

| Verdict | So trang | Ghi chu |
|---|---|---|
| **DELETE_SAFE (da doi khang 100%)** | **35** | Du dieu kien go route v1 o #204 (sau smoke) |
| **GAP** | **83** | v2 thieu tinh nang cu the (danh sach missing kem file:line ben duoi) |
| KEEP_STANDALONE | 1 | Giu rieng by-design |

Ty le lat qua 2 vong skeptic: 35/70 (50%) verdict DELETE_SAFE ban dau bi bac — kiem tra doi khang la BAT BUOC truoc khi go route.

## A. DELETE_SAFE — 35 trang du dieu kien go route v1 (#204)

| Trang | v2 | Evidence (rut gon) |
|---|---|---|
| BhxhConfig | frontend/src/modules/insurance/pages/BhxhConfig.tsx | v2 (modules/insurance/pages/BhxhConfig.tsx) ports both v1 tabs verbatim — same config fields (gatewayUrl/tokenUrl/username/password/maCSKCB/maDVI/timeout/environment) and all 3 test tools (Ping gateway, Test authenticate |
| CatalogsAdmin | frontend/src/modules/administration/pages/CatalogsAdmin.tsx | v2 (modules/administration/pages/CatalogsAdmin.tsx) has both v1 tabs (Viết tắt + Template lâm sàng, identical fields/scopes/validation and same API calls) plus 5 additional catalog CRUD tabs (occupation/gender/ethnic/nat |
| ChronicDisease | frontend/src/modules/public-health/pages/ChronicDisease.tsx | v2 (428 dòng) có đủ 4 KPI, 3 status-tabs (Đang theo dõi/Cần tái khám/Đã đóng)+all, search+ICD filter+date range, CrudModal Thêm/Sửa hồ sơ (6 field khớp v1 form), Drawer chi tiết + timeline lịch sử tái khám, và các action |
| ConsultationRegister | frontend/src/modules/reception/pages/ConsultationRegister.tsx | v2 port 1:1 sổ hội chẩn: filter (range/loại/keyword), bảng, Drawer chi tiết đủ 4 mục I-IV + thành phần tham dự, và in biên bản BBHC với cùng nội dung/mẫu MS.03/BV (v2:66-88 tương đương v1:77-142, chuyển từ window.open tr |
| DicomViewer | frontend/src/pages-v2/DicomViewer.tsx | Both v1 (pages/DicomViewer.tsx:6) and v2 (pages-v2/DicomViewer.tsx:8) are 1-line re-exports of the exact same component `pages-v2/dicom-viewer/DicomViewer.tsx` (post-#413 migration comment states this explicitly: 'DicomV |
| DigitalSignature | frontend/src/modules/emr/pages/DigitalSignature.tsx | v2 covers pending-sign list (single + batch sign via server session, pages/DigitalSignature.tsx:148-204 vs modules/emr/pages/DigitalSignature.tsx:139-167), tokens tab, certificates tab, and folds v1's 'Trạng thái' tab st |
| EndpointSecurity | frontend/src/modules/administration/pages/EndpointSecurity.tsx | v2 covers all 4 v1 tabs (Thiết bị/Phần mềm/Sự cố/Tổng quan) — devices list+search+register+update, incidents create/resolve, software flag-unauthorized, and dashboard charts (devices-by-status, incidents-by-category, sum |
| EnvironmentalHealth | frontend/src/modules/public-health/pages/EnvironmentalHealth.tsx | v2 covers both v1 tabs (waste records + monitoring records) with the same create-forms and stat cards (thu gom tháng, không tuân thủ, giám sát, an toàn sinh học), and adds waste-record update (v1 was create-only), a prin |
| HR | frontend/src/modules/hr/pages/HR.tsx | All 12 v1 tabs present verbatim in v2 topTabs (employees/catalogs/contracts/attendance/leave/overtime/awards/schedule/shifts/training/licenses/reports — HR.tsx:1247-1258), v2 adds an extra 'roster' weekly-schedule tab. A |
| HealthEducation | frontend/src/modules/public-health/pages/HealthEducation.tsx | Both tabs 'campaigns'/'materials' ported (v1 L179-182 vs v2 TOP_TABS L53-56), same 4 KPIs (campaignsThisYear/ongoing/participants/materials, v1 L172-175 vs v2 L185-191), same create-campaign and create-material forms (fi |
| HealthExchange | frontend/src/modules/system/pages/HealthExchange.tsx | v2 file header explicitly states '7 tab (port đủ từ v1)' and all 7 tab keys match exactly: connections/submissions/referrals/consultations/fhir/national-rx/provincial (v1 pages/HealthExchange.tsx:922-1473 vs v2 L215-221) |
| HivManagement | frontend/src/modules/public-health/pages/HivManagement.tsx | v2 frontend/src/modules/public-health/pages/HivManagement.tsx has all 4 v1 tabs (patients/lab/pmtct/statistics → vaccinations equivalents 'patients','lab','pmtct','stats' at lines 364-371) incl. cascade 90-90-90 stats (l |
| IvfLab | frontend/src/pages-v2/IvfLab.tsx | v2 (921 lines, real impl, code explicitly labeled 'port verbatim từ v1') has all 6 v1 tabs (couples/cycles/embryos/cryo/sperm/dashboard) and calls every v1 API: saveCouple, saveCycle, saveEmbryo, freezeEmbryo, thawEmbryo |
| LabQC | frontend/src/pages-v2/LabQC.tsx | v2 has all 3 v1 tabs (lots/results/reports) with strictly more capability: full CRUD on lots (v1 had create-only, no edit/delete), a Run-QC modal with live Westgard evaluation, a Levey-Jennings chart with analyzer+date-r |
| LisCatalogAdmin | frontend/src/modules/laboratory/pages/LisCatalogAdmin.tsx | v2 has all 6 v1 tabs (books/groups/units/organisms/antibiotics/chemicals) with identical CRUD field sets and lookups (books/services/supplies), plus 2 extra tabs (Chỉ số XN 'tests', Viết tắt KQ 'abbr') not present in v1. |
| NonDicomCapture | frontend/src/modules/radiology/pages/NonDicomCapture.tsx | v2 (modules/radiology/pages/NonDicomCapture.tsx) is a near-verbatim port: worklist + device-type filter, create-study form (submitCreate matches v1 handleOpenCapture), live camera snapshot/record (snapshot/startRec/stopR |
| Nutrition | frontend/src/pages-v2/Nutrition.tsx | v2 (864 dòng) có 3 top-tabs (Sàng lọc NRS-2002 / Chế độ ăn / Quản lý bữa ăn — dòng 98-102) khớp 3/4 tab nghiệp vụ thật của v1 (patients/diet_orders/meals), cùng API (getPendingScreenings, getDietOrders, getMealPlan, crea |
| ObservationStay | frontend/src/modules/inpatient/pages/ObservationStay.tsx | Parity gần như 1:1 — cùng interface Stay/Vital, cùng 3 trạng thái (Đang lưu/Đã về/Chuyển NV), cùng modal Tiếp nhận + Ghi sinh hiệu (MEWS) + Cho về/Chuyển NV, cùng endpoint /observation/*. v2 chỉ đổi UI shell sang _v2kit  |
| OccupationalHealth | frontend/src/modules/public-health/pages/OccupationalHealth.tsx | v2 có đủ 4 tab (Khám định kỳ/Khám trước tuyển/Bệnh nghề nghiệp/Thống kê), đủ toàn bộ field form tạo/sửa phiếu khám (spirometry, audiometry, chì máu, thị lực, X-quang, xét nghiệm, phân loại SK, bệnh NN, kết luận, khuyến n |
| OfficeSupplyApproval | frontend/src/modules/pharmacy/pages/OfficeSupplyApproval.tsx | v2 giữ đủ luồng tạo phiếu yêu cầu VPP/TTB + duyệt (approve modal với InputNumber SL duyệt từng dòng) đúng API /office-supply/requests, /office-supply/requests/approve như v1; v2 còn thêm hẳn module 'Phiếu hoàn trả' (retu |
| Pathology | frontend/src/modules/pathology/pages/Pathology.tsx | v2 ResultModal (dòng 224-338) có đủ toàn bộ field form kết quả GPB của v1 (mô tả đại thể/vi thể, chẩn đoán, ICD, phương pháp nhuộm, số lam/block, BS GPB, nhuộm đặc biệt, IHC, xét nghiệm phân tử — đối chiếu 1:1 với v1 dòn |
| PaymentTransactions | frontend/src/modules/billing/pages/PaymentTransactions.tsx | v2 keeps all 4 KPIs, keyword/provider/date filters, refund Modal (v2 ModalShell refundOpen, PaymentTransactions.tsx:178-211) matching v1 Modal 'Hoàn tiền giao dịch' (v1:241-260) with identical amount/reason fields, and E |
| Quality | frontend/src/modules/quality/pages/Quality.tsx | v2 header comment explicitly documents it as 'full parity port từ v1 pages/Quality.tsx (#409 batch-4)' (modules/quality/pages/Quality.tsx:24-30). Verified: all 6 top tabs present (kpi/incidents/audit/capa/standards/satis |
| RadiologyOps | frontend/src/modules/radiology/pages/RadiologyOps.tsx | 1:1 port — both tabs present (Chỉ định thêm N1.14 / Xuất thuốc tại phòng N1.15) with identical search endpoint fallback logic, identical form fields, and identical POST payloads to /radiology-ops/add-on and /radiology-op |
| RisAdmin | frontend/src/modules/radiology/pages/RisAdmin.tsx | v1 (pages/RisAdmin.tsx:60-71) has 8 tabs: Phân quyền BS/KTV, Khu vực/Chi nhánh, Thư mục, ICD↔Mẫu KQ, Máy chụp+Mẫu in, Vật tư CĐHA, Cấu hình BV, Thống kê. v2 (modules/radiology/pages/RisAdmin.tsx:39-51) has all 8 with equ |
| RisCatalogAdmin | frontend/src/modules/radiology/pages/RisCatalogAdmin.tsx | v1 (pages/RisCatalogAdmin.tsx:262-266) has 4 tabs: Modality, Vị trí chụp, Giao thức, Mẫu báo cáo — full CRUD each. v2 (modules/radiology/pages/RisCatalogAdmin.tsx:10-17) has all 4 with the same fields plus 2 additional t |
| RisDispatcher | frontend/src/modules/radiology/pages/RisDispatcher.tsx | Both cover the same 2 tabs (Chờ điều phối / Hàng đợi phòng) with identical dispatch/mark-arrived/mark-performed/cancel actions and the print-ticket HTML ported verbatim (room-highlight ticket). v2 (modules/radiology/page |
| SampleReceive | frontend/src/modules/laboratory/pages/SampleReceive.tsx | v2 covers accept/reject/technician-run/review/detail-timeline (v2:103-166,274-320) matching v1 (v1:64-137,222-281) 1:1, and adds an 'accepted' tab, cancel-receive action, and a warehouse-stock 'Tiện ích XN' drawer (v2:27 |
| SampleTracking | frontend/src/modules/laboratory/pages/SampleTracking.tsx | v2 explicitly marked 'Parity v1 (#352 P4)' (v2:27) and implements all 3 tabs (rejections/batches/stats), the real camera <BarcodeScanner> (v2:15,523-527), reject/undo/reCollect actions, and sample timeline — plus an extr |
| SchoolHealth | frontend/src/modules/public-health/pages/SchoolHealth.tsx | v2's EXAM_FIELDS (v2:33-54) covers every v1 create/edit form field 1:1, KPI/filters/detail-drawer match v1's stats+Descriptions (v1:247-269,357-401), and actions Xem/Sửa are preserved (v2:168-173). v1's 'Khám lô (cả lớp) |
| Screening | frontend/src/modules/laboratory/pages/Screening.tsx | v2's TOP_TABS newborn/prenatal (v2:13-16) plus STATUS_TABS is a superset of v1's pending/completed/all tabs; NEWBORN_FIELDS/PRENATAL_FIELDS (v2:37-76) reproduce every v1 create-form field (v1:190-239); detail drawer with |
| ServiceRequeue | frontend/src/modules/checkup/pages/ServiceRequeue.tsx | v2 reproduces the search→select→requeue flow 1:1: table columns (v2:67-78) match v1 (v1:135-151), and the confirm modal with reason + keepAsPaid checkbox (v2:135-161) matches v1 (v1:163-186). |
| SigningWorkflow | frontend/src/modules/emr/pages/SigningWorkflow.tsx | v2 implements all 4 tabs pending/submitted/history/stats (v2:15-20) with the overdue(>48h)/duplicate warnings ported verbatim from v1 (v1:340-351 vs v2:122-135,266-287), batch-approve, approve/reject/cancel, and document |
| VideoConsultation | frontend/src/modules/telemedicine/pages/VideoConsultation.tsx | 1:1 feature parity: same 4 status filters, create-room form (title/type/schedule/description/invite emails/password/recording), start/join/end(with conclusion note)/cancel/copy-link/participants-drawer/export-Excel/QR-co |
| WorkloadReport | frontend/src/modules/reports/pages/WorkloadReport.tsx | All 3 tabs (Bác sĩ/CĐHA/Xét nghiệm) with same columns and same per-tab Excel export (identical exportToExcel column configs, v2 :73-94 mirrors v1 :119-142) are present in v2 modules/reports/pages/WorkloadReport.tsx, plus |

## B. GAP — 83 trang v2 con thieu tinh nang (KHONG go route v1 truoc khi dong gap / chap nhan bo)

### AssetManagement
- v1: `frontend/src/pages/AssetManagement.tsx` | v2: `frontend/src/modules/asset/pages/AssetManagement.tsx` | confidence scan: high | SCAN_ONLY
  - [x] Handovers tab (Bàn giao tài sản) — ĐÃ PORT 2026-08-02 (tab "Bàn giao" v2, chọn tài sản bằng Select thay vì gõ GUID) — v1 pages/AssetManagement.tsx:308-379 create/list/confirm handover; getHandovers/saveHandover/confirmHandover exist unused in modules/asset/api/assetManagement.ts:222-239
  - [x] Disposals tab (Thanh lý) — ĐÃ PORT 2026-08-02 (tab "Thanh lý" v2, đủ đề xuất/duyệt/hoàn thành + cf-confirm) — v1 pages/AssetManagement.tsx:382-453 propose/approve/complete disposal; getDisposals/proposeDisposal/approveDisposal/completeDisposal exist unused in modules/asset/api/assetManagement.ts:243-265
  - [x] Full 'Báo cáo TSCD' report catalog — ĐÃ PORT 2026-08-02 (tab "Báo cáo TSCĐ" v2: catalog nhóm theo category + filter năm/tháng/từ-đến/nhóm TS + click-to-generate mở print window) — v1 pages/AssetManagement.tsx:576-681; getAssetReportTypes/generateAssetReport exist unused in modules/asset/api/assetManagement.ts:304-314
  - [x] Dashboard pie/bar charts by status + depreciation trend — ĐÃ PORT 2026-08-02 (trong tab "Báo cáo TSCĐ": toggle pie statusBreakdown / bar depreciationTrends bằng recharts) — v1 pages/AssetManagement.tsx:540-570

### BhxhAudit
- v1: `frontend/src/pages/BhxhAudit.tsx` | v2: `frontend/src/modules/insurance/pages/BhxhAudit.tsx` | confidence scan: high | SCAN_ONLY
  > ⛔ **VERIFY 2026-08-02 — CẢ 4 GAP DƯỚI ĐÂY LÀ TÍNH NĂNG CHẾT Ở CHÍNH v1, KHÔNG PORT.**
  > Backend `[Route("api/bhxh-audit")]` (SupplementaryControllers2.cs) chỉ có **6 endpoint**:
  > `GET sessions` · `POST session` · `POST session/{id}/run` · `GET session/{id}/errors` · `PUT error/{id}/fix` · `GET dashboard`.
  > Grep toàn bộ `backend/src`: `auditor-accounts`=0 · `import-excel`=0 · `recordIds`/`RecordIds`=0 · `records/{id}/pdf`=0.
  > → 4 lệnh gọi của v1 (`pages/BhxhAudit.tsx:198,350,397,518,1503`) đều trỏ route **KHÔNG TỒN TẠI** ⇒ v1 đang 404.
  > Port sang v2 = nhân bản lỗi. Muốn có thật thì phải **làm backend trước** (task riêng), không phải việc của #352.
  - [~]   - [ ] Tab 'Cổng giám định': auditor account management CRUD (GET/POST /bhxh-audit/auditor-accounts) — v1 pages/BhxhAudit.tsx:1066-1089, 1354-1451
  - [~] Portal records list + PDF viewer — KHÔNG PORT (BE thiếu route, xem note trên) (view/download HSBA PDF, GET /bhxh-audit/records/{id}/pdf) — v1 pages/BhxhAudit.tsx:1094-1135, 1453-1522
  - [~] Bulk single-call approve — KHÔNG PORT (BE thiếu route, xem note trên) (POST /bhxh-audit/approve {recordIds}) — v1 pages/BhxhAudit.tsx:388-408; v2 keeps only per-record approveAuditSession
  - [~] Excel import with preview/confirm — KHÔNG PORT (BE thiếu route, xem note trên) (POST /bhxh-audit/import-excel) — v1 pages/BhxhAudit.tsx:338-386, 1199-1288; v2 replaced with a different CSV import flow

### Billing
- v1: `frontend/src/pages/Billing.tsx` | v2: `frontend/src/modules/billing/pages/Billing.tsx` | confidence scan: high | SCAN_ONLY
  - [x] Refund approval/rejection workflow — ĐÃ PORT 2026-08-02 (màn mới /v2/refund-approval: duyệt/từ chối/xác-nhận-chi/hủy, gate Billing.Collect) (Duyệt/Từ chối, approveRefund/cancelRefund) — v1 pages/Billing.tsx:1435-1476; the API functions exist in modules/billing/api/billing.ts but are never called from any v2 page (verified via repo-wide grep)
  - [ ] Global cross-patient Deposits/Refunds admin lists with search+stats — v1 pages/Billing.tsx:1204-1267 (Deposits) and 1344-1502 (Refunds); v2's only equivalent (BillingEditor.tsx) is scoped to one selected patient at a time, no global admin view
  - [ ] E-invoice send-email, export, and print-representative actions + full buyer-info issue form (buyerName/buyerTaxCode/buyerAddress/buyerEmail) — v1 pages/Billing.tsx:1976-2012, 2223-2291; v2's EInvoicesV2 (modules/billing/pages/EInvoices.tsx) issue/cancel/sync-status only, no send/export/print-representative and a simplified issue form (receiptId + provider only)

### BloodBank
- v1: `frontend/src/pages/BloodBank.tsx` | v2: `frontend/src/modules/blood-bank/pages/BloodBank.tsx` | confidence scan: high | OVERTURNED_R2
  - [x] Danh sách túi máu ĐÃ HẾT HẠN — ĐÃ PORT 2026-08-02 (tab "Đã hết hạn" v2 dùng getExpiredBloodBags + banner cần-xử-lý-ngay + CHẶN cấp phát, chỉ cho tiêu huỷ) + alert 'cần xử lý ngay' + đếm bucket: v1 pages/BloodBank.tsx:756-761 (tính expiredUnits/expiring30d/safeUnits) + :1049-1051 (Alert error) + :1056-1057 (sub-tab 'Hết hạn (N)' bảng liệt kê túi quá hạn). v2 tab 'Sắp hết hạn' dùng getExpiringBloodBags(7) mà backend (BloodBankCompleteService.Stock.cs:109 ép status='Available'; BloodBankCompleteService.cs:200 lọc ExpiryDate > GETDATE()) loại hẳn túi đã quá hạn — chúng không xuất hiện ở bất kỳ view chuyên biệt nào của v2; getExpiredBloodBags() có sẵn trong api/bloodBank.ts:527 nhưng v2 không gọi. Nút 'Tiêu huỷ' của v2 vì thế không bao giờ với tới đúng đối tượng cần tiêu huỷ (patient-safety).
  - [x] Bucket HSD 8-30 ngày — ĐÃ PORT 2026-08-02 (4 stat-card phân bố hạn dùng trên tab Sắp hết hạn) và >30 ngày (an toàn) + 4 stat-card phân bố hạn dùng: v1 pages/BloodBank.tsx:1035-1048 + :1060-1063 — v2 không có view tương đương (tab expiring chỉ 0<days≤7).
  - [x] Túi Reserved sắp hết hạn — ĐÃ SỬA 2026-08-02 (gộp nguồn BE + tự tính từ units status Available|Reserved, không cần đổi BE): v1 tính activeUnits = status 0|1 (pages/BloodBank.tsx:757) nên túi Đã đặt sắp/quá hạn vẫn hiện trong tab Hạn sử dụng; v2 getExpiringBloodBags chỉ trả Available (BloodBankCompleteService.Stock.cs:109).
  - [ ] Phụ (gần layout): bảng so sánh 8 nhóm máu cùng lúc với hàng tổng Table.Summary + cột 'Đã dùng'/'Hết hạn' per-group: v1 pages/BloodBank.tsx:993-1020 (used tính ở :748) — v2 BloodTypeDetail drawer chỉ xem 1 nhóm/lần và BloodStockDto không có usedBags; filter trạng thái kho (gồm 'Đã sử dụng') + sorter HSD: v1 :559, :579-585 — v2 stock tab không có.

### BookingManagement
- v1: `frontend/src/pages/BookingManagement.tsx` | v2: `frontend/src/modules/reception/pages/BookingManagement.tsx` | confidence scan: high | OVERTURNED_R2
  - [x] Date-range filter on booking list — ĐÃ PORT 2026-08-02 (2 ô date trên toolbar, mặc định hôm nay→+7d, truyền fromDate/toDate): v1 pages/BookingManagement.tsx:338-343 (RangePicker) + :58-59 passes fromDate/toDate to getBookings (backend supports it, BookingManagementService.cs:231-234); v2 modules/reception/pages/BookingManagement.tsx:73-76 calls getBookings({keyword, pageSize:200}) with no date UI and no date params — cannot view bookings for a specific day/range (e.g. tomorrow's list to call-confirm)
  - [x] Server-side filtering — GIẢI QUYẾT THEO THIẾT KẾ v2 2026-08-02: keyword + fromDate/toDate đẩy server-side (đã có) + debounce 300ms (mới); cửa sổ 200 dòng/bộ-lọc là tradeoff giữ StatusTabs counts của v2 — mọi booking đều REACHABLE bằng thu hẹp khoảng ngày/keyword (mặc định 7 ngày tới hiếm khi >200). Server pageIndex/totalCount thuần như v1 sẽ phá counts tabs → không áp.

### CentralSigning
- v1: `frontend/src/pages/CentralSigning.tsx` | v2: `frontend/src/modules/emr/pages/CentralSigning.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Tab 'Sinh trắc học' (WebAuthn/FIDO2 biometric registration for signing) entirely absent — v1 pages/CentralSigning.tsx:438-482; no PublicKeyCredential/WebAuthn reference anywhere in v2's file (verified via grep)
  - [x] TOTP setup flow broken — ĐÃ SỬA 2026-08-02 (đọc response → ModalShell hiện qrCodeUri + manualEntryKey; thêm nút Tắt TOTP có cf-confirm): v2's Setup TOTP button (modules/emr/pages/CentralSigning.tsx:391-394) discards the API response and never displays the QR code / manual entry key needed to actually enroll an authenticator app, unlike v1's Modal.info with qrCodeUri+manualEntryKey (pages/CentralSigning.tsx:406-424); 'Tắt TOTP' (disable) button also missing in v2 even though api.disableTotp exists unused
  - [ ] Thống kê tab reduced to 4 KPI numbers — v1's 8 stat cards plus 'Phân loại theo định dạng' (byType) and 'Top người dùng' (topUsers ranking) tables (pages/CentralSigning.tsx:280-313) have no equivalent in v2
  - [ ] Giao dịch tab missing the 'Hành động' (action-type: SignHash/SignRaw/SignPdfVisible/etc.) filter dropdown — v1 pages/CentralSigning.tsx:250-259; v2 (modules/emr/pages/CentralSigning.tsx:329-334) only filters by success/fail

### ClinicalCatalogs
- v1: `frontend/src/pages/ClinicalCatalogs.tsx` | v2: `frontend/src/modules/administration/pages/ClinicalCatalogs.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Required-field validation bị mất hoàn toàn: v1 chặn save khi trống Mã/Tên/Cấp/Phân loại qua form.validateFields() (frontend/src/pages/_CrudTab.tsx:110-112, rules sinh tại _CrudTab.tsx:221 từ required:true ở frontend/src/pages/ClinicalCatalogs.tsx:22-24 và :42-48); v2 handleSave (modules/administration/pages/ClinicalCatalogs.tsx:157-166) submit thẳng không kiểm tra — và backend KHÔNG đỡ (DTO không [Required], MasterCatalogDtos.cs:127-149; service copy thẳng vào entity, MasterCatalogService.cs:382-391 & 413-422) → v2 tạo được bản ghi danh mục lâm sàng RỖNG ghi thật vào DB kèm toast 'Đã thêm'
  - [ ] Chi tiết lỗi backend không còn hiển thị: v1 show response.data.message/title khi save lỗi (frontend/src/pages/_CrudTab.tsx:124-126) và xoá lỗi (:139) — vd message 'Loại bệnh án này đang khóa, không thể xóa' (MasterCatalogService.cs:428); v2 nuốt mọi lỗi thành 'Lưu thất bại'/'Xoá thất bại' generic (modules/administration/pages/ClinicalCatalogs.tsx:165,179)
  - [ ] (Phụ) Nút 'Làm mới' refresh thủ công (frontend/src/pages/_CrudTab.tsx:190) không có ở v2 — muốn thấy dữ liệu máy khác vừa sửa phải F5 cả trang

### ClinicalGuidance
- v1: `frontend/src/pages/ClinicalGuidance.tsx` | v2: `frontend/src/modules/patient/pages/ClinicalGuidance.tsx` | confidence scan: high | OVERTURNED
  - [x] Bộ lọc khoảng thời gian — ĐÃ SỬA 2026-08-02 (2 input date toolbar, fromDate/toDate server-side)
  - [x] Luồng lọc/tìm kiếm server-side — ĐÃ SỬA 2026-08-02 (load useCallback keyword/type/date + pageSize 200 vượt trần BE 50 + debounce 300ms; filtered chỉ còn tab trạng thái)
  - [x] KPI thống kê server — ĐÃ SỬA 2026-08-02 (getGuidanceStatistics gọi song song, KPI ưu tiên stats server, fallback client)
  - [x] Option guidanceType=0 'Khám chữa bệnh' — ĐÃ SỬA 2026-08-02 (BATCH_FIELDS đủ 0-4, TYPE_LABEL đủ 0-4 nên filter 'Giám sát' hoạt động)
  - [x] Guard chỉ-cho-xóa-khi-status===0 — ĐÃ SỬA 2026-08-02 (nút Xoá chỉ hiện khi Lên kế hoạch)

### ClinicalPharmacyCheck
- v1: `frontend/src/pages/ClinicalPharmacyCheck.tsx` | v2: `frontend/src/modules/opd/pages/ClinicalPharmacyCheck.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] PharmacyExpiryBanner (cảnh báo thuốc sắp hết hạn, asModalOnFirstVisit) — có ở v1:14+85, không có trong modules/opd/pages/ClinicalPharmacyCheck.tsx

### CommunityHealth
- v1: `frontend/src/pages/CommunityHealth.tsx` | v2: `frontend/src/modules/public-health/pages/CommunityHealth.tsx` | confidence scan: high | SCAN_ONLY
  - [x] Nút 'Thêm HGD' tạo hộ gia đình mới — ĐÃ PORT 2026-08-02 (headerActions + CrudModal dùng HH_FIELDS sẵn có) — v1:448 (Button PlusOutlined) → không có trong v2
  - [x] Nút Sửa hộ gia đình theo dòng — ĐÃ PORT 2026-08-02 (rowActions ic=edit mở CrudModal prefill) — v1:273 (EditOutlined) → không có trong v2 (v2 chỉ có onRowClick mở drawer xem)
  - [x] Modal Thêm/Sửa hộ gia đình — ĐÃ PORT 2026-08-02 (CrudModal gắn HH_FIELDS, create/update theo id) (chủ hộ, địa chỉ, phường/xã/quận/tỉnh, SL thành viên, mức rủi ro, đội phụ trách, 4 checkbox NCT/trẻ<5/thai phụ/bệnh mạn tính, ghi chú) — v1:619-698 → HH_FIELDS định nghĩa ở v2:36-61 nhưng chưa gắn CrudModal nào

### Consultation
- v1: `frontend/src/pages/Consultation.tsx` | v2: `frontend/src/pages-v2/Consultation.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Danh sách ca chụp hội chẩn (BN, dịch vụ, lý do, nút 'Xem ảnh DICOM') trong chi tiết phiên — v1:707-727, không có trong DrawerShell/ConsultationDrawerBody v2 (v2:263-397)
  - [ ] Tạo mã QR mời tham gia hội chẩn (Modal.info hiện QR + copy link) — v1:244-272 & nút QR v1:362-366, không có trong v2

### CultureCollection
- v1: `frontend/src/pages/CultureCollection.tsx` | v2: `frontend/src/modules/laboratory/pages/CultureCollection.tsx` | confidence scan: high | SCAN_ONLY
  - [x] Nút 'Hủy chủng' — ĐÃ PORT 2026-08-02 (ActBtn trash + ModalShell BẮT BUỘC lý do → audit) (discardStock API + Popconfirm xác nhận, có audit lý do) — v1:333-335, không được gọi ở modules/laboratory/pages/CultureCollection.tsx
  - [x] Bộ lọc theo Tủ lạnh — ĐÃ PORT 2026-08-02 (Filter ▾ Tủ lạnh, nguồn getFreezerCodes()) (freezerCode, getFreezerCodes()) — v1:46-47,239-240, không có trong v2 (chỉ còn filter PP bảo quản)

### Dashboard
- v1: `frontend/src/pages/Dashboard.tsx` | v2: `frontend/src/pages-v2/Dashboard.tsx` | confidence scan: high | SCAN_ONLY
  - [x] Interactive 'Biểu đồ hoạt động' chart — ĐÃ PORT 2026-08-02 (ActivityChartCard toggle 7-ngày/theo-khoa/phân-bố, native bars + conic-donut theo design pack; gate MedicalRecord.Read) — pages/Dashboard.tsx:348-443
  - [x] 'Doanh thu theo khoa' — ĐÃ PORT 2026-08-02 (RevenueBreakdownCard: bar theo khoa từ deptStats.totalRevenue, fallback revenueByDepartment; gate Billing.Read) — pages/Dashboard.tsx:554-579
  - [x] Per-service done/pending mini-cards — ĐÃ PORT 2026-08-02 (ServiceStatusStrip 6 dịch vụ, đọc service*Done/Pending từ BE HospitalDashboardDto — FE type đã khai báo thêm field) — pages/Dashboard.tsx:159-166,322-345
  - [x] Revenue-by-patient-type pie — ĐÃ PORT 2026-08-02 (donut BHYT/Tự chi trả/Khác trong RevenueBreakdownCard; BE chưa trả split → ước 60/35/5 như v1, có nhãn "(ước)") — pages/Dashboard.tsx:167-171,486-522

### Dashboard3Cap
- v1: `frontend/src/pages/Dashboard3Cap.tsx` | v2: `frontend/src/modules/administration/pages/Dashboard3Cap.tsx` | confidence scan: high | SCAN_ONLY
  - [x] Day-by-day duty roster calendar table — ĐÃ PORT 2026-08-02 (panel "Lịch trực theo ngày" dưới tổng hợp ca trực: Ngày/Thứ chip CN-T7/Sáng/Chiều/Đêm từ duty.shifts) — pages/Dashboard3Cap.tsx:795-827
  - [x] Consolidated report TOTALS footer — ĐÃ PORT 2026-08-02 (hàng TỔNG CỘNG dưới DataTable: BN/lượt khám/nhập viện/doanh thu/100%) — pages/Dashboard3Cap.tsx:707-730

### DeAn06Liaison
- v1: `frontend/src/pages/DeAn06Liaison.tsx` | v2: `frontend/src/modules/system/pages/DeAn06Liaison.tsx` | confidence scan: high | SCAN_ONLY
  - [x] KSK lái xe drawer: Thính lực — ĐÃ SỬA 2026-08-02 (DrField hearingNormal + hearingDetail fallback, sec đổi tên "THỊ / THÍNH / THẦN KINH / TÂM THẦN") — v1 pages/DeAn06Liaison.tsx:260
  - [x] KSK lái xe drawer: Thần kinh — ĐÃ SỬA 2026-08-02 (neurologicalNormal + neurologicalDetail) — v1 pages/DeAn06Liaison.tsx:261
  - [x] KSK lái xe drawer: Tâm thần — ĐÃ SỬA 2026-08-02 (psychiatricNormal + psychiatricDetail) — v1 pages/DeAn06Liaison.tsx:262

### DispensingCounter
- v1: `frontend/src/pages/DispensingCounter.tsx` | v2: `frontend/src/modules/opd/pages/DispensingCounter.tsx` | confidence scan: high | OVERTURNED_R2
  - [x] One-click per-row 'Phát + In' — ĐÃ PORT 2026-08-02 (ActBtn check trên dòng chờ: phát xong TỰ mở tem; batch cũng in, gộp 1 tài liệu) (dispense single prescription + AUTO-open tem-thuốc print preview) — v1 frontend/src/pages/DispensingCounter.tsx:288-302 (handlePrintLabels(row) called right after POST, line 296; core workflow per file header line 3). v2 has NO equivalent: pending rows expose no dispense action at all (frontend/src/modules/opd/pages/DispensingCounter.tsx:233-241 — only eye/print), and no v2 dispense path ever prints — batch toolbar (219-223) just toasts+reloads, drawer 'Phát đơn này' (282-291) even calls setDetail(null) closing the drawer; the dispensed row jumps to the 'Đã phát' tab so the pharmacist must switch tab, re-locate the row and print manually. Tem = patient medication label with dosage — an easily-skipped manual print step at a busy counter is a behavioral/patient-safety-adjacent regression, not cosmetic.
  - [x] (Secondary, fix alongside — ĐÃ SỬA 2026-08-02 (px tuyệt đối; cửa sổ in là document riêng, không có biến CSS của app) — not counted as the gap) v2 print template CSS is corrupted by a design-token sweep: padding:'var(--space-10)'px / padding:'var(--space-8)'px 12px / margin:'var(--space-2)'px 0 at frontend/src/modules/opd/pages/DispensingCounter.tsx:159 are invalid CSS values that browsers drop, so printed tem labels lose body/label padding and paragraph margins vs v1 (pages/DispensingCounter.tsx:140-144).

### DoctorPortal
- v1: `frontend/src/pages/DoctorPortal.tsx` | v2: `frontend/src/modules/opd/pages/DoctorPortal.tsx` | confidence scan: high | OVERTURNED_R2
  - [x] Server-side keyword tab Ngoại trú — ĐÃ CÓ (verified 2026-08-02: keyword truyền vào searchExaminations, DoctorPortal.tsx:119)
  - [x] Server-side keyword tab Nội trú — ĐÃ CÓ (verified 2026-08-02: keyword truyền vào getInpatientList, :141)
  - [x] totalCount thật cho KPI — ĐÃ SỬA 2026-08-02 (opdTotal/ipdTotal bắt totalCount từ response → KPI 'Tổng cộng'/'Đang điều trị' không còn trần 200; pager vẫn chạy trên cửa sổ 200 đã lọc server-side)
  - [ ] [Phụ - nghiêng layout] Calendar tháng lịch trực với tag ca theo ô ngày + panel 'Lịch sắp tới' 7 ca (pages/DoctorPortal.tsx:651-663, 665-709, 681-682): v2 thay bằng bảng phẳng, mất góc nhìn lịch-tháng
  - [x] Checkbox 'chọn tất cả' tab Ký số — ĐÃ SỬA 2026-08-02 (toggleAllSig chạy trên toàn bộ sigFiltered mọi trang)

### EMR
- v1: `frontend/src/pages/EMR.tsx` | v2: `frontend/src/modules/opd/pages/EMR.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] ~60+ official MoH print form templates (MS.04-20, CĐHA, TDCN/XN/LS, DD.01-21, TT32 specialty records) inaccessible in v2's 9-item print menu — pages/EMR.tsx:1518-1636 vs modules/emr/pages/EmrEditor.tsx:82-92
  - [ ] 'Nhật ký in' print-log audit tab with đóng dấu (stamp) action — pages/EMR.tsx:1423-1449
  - [ ] 'Quản lý BA' (EmrManagementTabs) tab — pages/EMR.tsx:1451-1453
  - [ ] 'Thử phản ứng thuốc' create-test-entry workflow (only read-only allergy list remains) — pages/EMR.tsx:1092-1129 vs modules/emr/pages/EmrEditor.tsx:700-713

### EmergencyDisaster
- v1: `frontend/src/pages/EmergencyDisaster.tsx` | v2: `frontend/src/modules/mci/pages/EmergencyDisaster.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] 'Tài nguyên' (Resources) tab — bed/ICU/OR/phòng mổ/máu/thiết bị availability tracking, getResources() (v1 lines 780-832)
  - [ ] 'Nhân sự' (Staff) tab — command-center staff roster with role/department/status/phone, getCommandCenter() (v1 lines 834-887)
  - [ ] 'Hướng dẫn START' triage-protocol reference tab (v1 lines 888-957)
  - [x] 'Kết thúc sự kiện' button — ĐÃ PORT 2026-08-02 (nút + modal bắt buộc lý do → deactivateMCI, reset activeEvent) to deactivate/end an active MCI event, handleEndMCI()->deactivateMCI() (v1 lines 422-441, 992-994) — v2 has no way to end an MCI event once Code Blue is activated
  - [ ] Per-victim 'Liên lạc' family-notification action, notifyFamily() (v1 lines 300-337)
  - [ ] Per-victim quick 'Cập nhật' (updateVictim) inline action (v1 lines 353-369)
  - [ ] Event-history table + facility readiness KPIs (events/victims this year, readiness score, staff on-call) shown when no active event, getDashboard()/getEvents() (v1 lines 1012-1088)
  - [ ] Diễn biến sự kiện (activity-log Timeline), getActivityLog() (v1 lines 599-646, 723-730)

### EmployeeProfile
- v1: `frontend/src/pages/EmployeeProfile.tsx` | v2: `frontend/src/modules/hr/pages/EmployeeProfile.tsx` | confidence scan: high | OVERTURNED
  - [ ] Searchable employee picker: v1 frontend/src/pages/EmployeeProfile.tsx:40-45 uses Antd Select showSearch + optionFilterProp="label" to type-filter ~300 employees; v2 uses _v2kit Filter = native <select> with no search (frontend/src/components/form/Filter/Filter.tsx:11) — significant regression on the page's gateway interaction
  - [ ] Backend error message on CRUD save failure: v1 frontend/src/pages/EmployeeProfile.tsx:638-641 shows err.response.data.message via message.error in all 9 tabs' modals; v2 (frontend/src/modules/hr/pages/EmployeeProfile.tsx:127) only shows generic 'Lưu thất bại' and also fires it on client-side validateFields rejection
  - [ ] Sub-table pagination: v1 frontend/src/pages/EmployeeProfile.tsx:684 Table pagination pageSize=10; v2 DataTable (frontend/src/components/table/DataTable/DataTable.tsx) renders all rows unpaginated (minor)
  - [ ] Mechanical delete blocker (not a feature gap): v1 still imported+routed at frontend/src/router/AppRoutes.tsx:67 and :234 — route + lazy import must be removed in the same change as the file deletion

### Epidemiology
- v1: `frontend/src/pages/Epidemiology.tsx` | v2: `frontend/src/pages-v2/Epidemiology.tsx` | confidence scan: high | OVERTURNED_R2
  - [~] 'Truy vết tiếp xúc' (contact-tracing) tab — KHÔNG PORT (v1 là static placeholder, không API/form; phần cảnh báo động nhóm A đã port riêng dòng dưới) (v1 pages/Epidemiology.tsx lines 318-345)
  - [x] Date-range filter — ĐÃ SỬA 2026-08-02 (2 input date toolbar, fromDate/toDate server-side qua searchDiseaseReports)
  - [x] Cross-tab active-outbreak alert banner — ĐÃ SỬA 2026-08-02 (banner đỏ trên TopTabs khi activeOutbreaks>0 + nút nhảy tab Ổ dịch)
  - [x] Catalog-driven disease select — ĐÃ SỬA 2026-08-02 (drFields useMemo: diseaseName = select showSearch từ danh mục 28 bệnh, chọn → tự điền ICD+nhóm khi bỏ trống; reportDate required; reportCode prefill BC+timestamp; fallback free-text khi danh mục rỗng)
  - [x] Dynamic group-A urgent alert — ĐÃ SỬA 2026-08-02 (banner cam "N ca bệnh nhóm A cần truy vết tiếp xúc khẩn cấp" tính từ ca nhóm A chưa đóng + nút lọc nhóm A)

### Equipment
- v1: `frontend/src/pages/Equipment.tsx` | v2: `frontend/src/modules/asset/pages/Equipment.tsx` | confidence scan: high | OVERTURNED_R2
  - [x] CRITICAL — v2 list rong — ĐÃ SỬA 2026-08-02 (chấp nhận cả mảng trần lẫn {items} như v1) voi backend dang wire: backend GET /api/equipment (EquipmentController.cs:35-40 → MedicalEquipmentServiceImpl.GetEquipmentListAsync, List<MedicalEquipmentDto> = mang JSON tran) — v1 pages/Equipment.tsx:113 xu ly ca 2 shape (Array.isArray ? data : data.items) nen hien thi duoc; v2 modules/asset/pages/Equipment.tsx:125 chi doc data?.items → luon [] → tab Danh sach thiet bi + KPI + status counts + tab Kiem dinh deu rong. Xoa v1 = mat trang Equipment duy nhat con render du lieu.
  - [x] Nut 'Len lich bao tri' trong tab Lich bao tri — ĐÃ SỬA 2026-08-02 (nút "+ Lên lịch bảo trì" toolbar tab maintenance, modal thêm Select thiết bị showSearch khi mở không có target) — v1 pages/Equipment.tsx:520-527 va :674-682.
  - [x] Field 'Don vi thuc hien' — ĐÃ SỬA 2026-08-02 (Form.Item performedBy → gửi performedByCompany, field có sẵn trong CreateMaintenanceRecordDto) — v1 pages/Equipment.tsx:692-694.
  - [x] Ten benh vien tren phieu in — ĐÃ SỬA 2026-08-02 (in HOSPITAL_NAME ở đầu phiếu như v1) 'PHIEU LY LICH THIET BI Y TE' — v1 pages/Equipment.tsx:261 in ${HOSPITAL_NAME} (env VITE_HOSPITAL_NAME, header form phap ly theo constants/hospital.ts:9); v2 modules/asset/pages/Equipment.tsx:317 bo hoan toan → claim 'print template ported verbatim' la SAI.
  - [x] Minor: drawer chi tiet hien thi Trang thai hoat dong — ĐÃ SỬA 2026-08-02 (StatusBadge trong sec THIẾT BỊ theo operationalStatus/Name). Stats client-side giữ nguyên (danh sách đã hết rỗng theo gap 1 → số liệu đúng).

### Finance
- v1: `frontend/src/pages/Finance.tsx` | v2: `frontend/src/modules/reports/pages/Finance.tsx` | confidence scan: high | SCAN_ONLY
  - [~] 'Chi phí' (Expense) tab — KHÔNG PORT (verify 2026-08-02: v1 tab là PSEUDO-AP — map lại getCostByDepartment thành "expense record" với supplier/invoiceNumber LUÔN undefined + status hardcode 2 "Đã thanh toán" (pages/Finance.tsx:188-199) → không có nghiệp vụ AP thật ở BE; v2 đã hiện đúng cùng dữ liệu qua card "Chi phí theo khoa". AP thật = làm backend trước, task riêng.)
  - [x] 'Báo cáo' (Reports) tab — ĐÃ PORT 2026-08-02 (tab Báo cáo v2: doanh thu dịch vụ/khoa trong tab chính + 4 RptCard Chi phí theo khoa / Đối soát BHYT QĐ 6556 / Lợi nhuận phẫu thuật / Tổng hợp thu chi, mỗi card hit endpoint riêng) (v1 lines 303-362, 908-1016)
  - [x] Global date-range picker — ĐÃ PORT 2026-08-02 (reportFrom/reportTo inputs dùng chung mọi tab + card, không còn hardcode tháng hiện tại) (v1 lines 648-663)
  - [ ] Department-revenue detail drawer on row click (v1 double-click → modal, lines 713-720, 1059-1073) — v2's 'Theo khoa' DataTable has no onRowClick for department rows

### FinanceCatalogs
- v1: `frontend/src/pages/FinanceCatalogs.tsx` | v2: `frontend/src/modules/administration/pages/FinanceCatalogs.tsx` | confidence scan: high | OVERTURNED_R2
  - [x] Required-field validation before save — ĐÃ PORT 2026-08-02 (validateEdit theo từng tab: mã/tên/đơn-giá>0 · vận chuyển thêm cách-tính · xăng: loại/giá/ngày-hiệu-lực) — v1 blocks save and shows per-field 'X là bắt buộc' for code/name/price (Phụ thu: frontend/src/pages/FinanceCatalogs.tsx:23-25; Thu khác: :44-46), code/name/calculationType/unitPrice (Vận chuyển: :65-76), fuelType/pricePerLitre/effectiveFrom (Giá xăng: :95-108), enforced via form.validateFields() + rules in frontend/src/pages/_CrudTab.tsx:112 and :221. v2 handleSave (modules/administration/pages/FinanceCatalogs.tsx:218-234) posts with zero checks and seeds code:'' name:'' (:208-211); backend also does not validate (MasterCatalogDtos.cs Code/Name default string.Empty, no [Required]; MasterCatalogService.cs:114-123 saves blindly) → v2 lets users create blank finance-catalog records that feed billing/transport pricing.
  - [x] Detailed server-error surfacing — ĐÃ PORT 2026-08-02 (serverMsg đọc response.data.message||title cho cả save lẫn delete) on save/delete failure — v1 shows response.data.message || title (frontend/src/pages/_CrudTab.tsx:124-128 save, :139 delete); v2 collapses all failures to generic 'Lưu thất bại'/'Xoá thất bại' (modules/administration/pages/FinanceCatalogs.tsx:233, :250), so the user never sees why a save/delete was rejected.

### FollowUp
- v1: `frontend/src/pages/FollowUp.tsx` | v2: `frontend/src/modules/opd/pages/FollowUp.tsx` | confidence scan: high | OVERTURNED
  - [x] Server-side keyword search: v1 pages/FollowUp — ĐÃ PORT 2026-08-02 (truyền keyword lên searchAppointments, thêm vào deps).tsx:79 sends keyword to searchAppointments (DTO modules/opd/api/examination.ts:1391; backend filters FullName/PatientCode/AppointmentCode/PhoneNumber in ExaminationCompleteService.Conclusion.cs:241-248, before paging). v2 modules/opd/pages/FollowUp.tsx:101-110 never sends keyword — its SearchBox (L162-173) filters client-side over only the 16 rows of the current server page (PAGE_SIZE=16 L63; paged=filtered on server-paged tabs L180), so on tabs Hôm nay/Sắp tới/Tất cả any patient beyond the first page is unfindable and totalCount/Pager ignore the search. v1 searched database-wide.
  - [x] Click-to-call tel: links — ĐÃ PORT 2026-08-02 (SĐT thành <a href=tel:> + nút phone GỌI thật; tách nút "Ghi nhận đã liên hệ" nói đúng việc nó làm): v1 pages/FollowUp.tsx:188-192 (table SĐT column) and :443-447 (detail modal) render <a href="tel:...">; v2 has zero tel: occurrences — phone is plain text, and the phone-icon ActBtn 'Ghi nhận liên lạc' (v2 L332-334) does NOT dial: it calls onRemind → updateAppointmentStatus(id, 1) (v2 L140-149), silently mutating the appointment to 'Đã xác nhận' instead of opening a call.
  - [x] Sortable 'Ngày hẹn' — ĐÃ SỬA 2026-08-02 (nút toggle ↑/↓/↕ toolbar sort trang hiện tại — đúng hành vi Antd sorter + server pagination của v1)
  - [x] Page-size changer — ĐÃ SỬA 2026-08-02 (select 16/20/50 dòng/trang, wired vào fetch + Pager)
  - [x] 'Hôm nay' tab badge — ĐÃ SỬA 2026-08-02 (label `Hôm nay (N✓)` = số lịch đã xác nhận hôm nay)

### FoodSafety
- v1: `frontend/src/pages/FoodSafety.tsx` | v2: `frontend/src/modules/public-health/pages/FoodSafety.tsx` | confidence scan: high | SCAN_ONLY
  - [x] 'Thống kê' tab — ĐÃ PORT 2026-08-02 (tab Thống kê: 4 KPI + panel Sự cố theo tháng + panel Xếp loại tuân thủ A-D)
  - [x] 'Sự cố theo tháng' — ĐÃ PORT 2026-08-02 (Line rows từ stats.incidentsByMonth trong tab Thống kê)
  - [x] 'Điểm tuân thủ TB' — ĐÃ PORT 2026-08-02 (KPI `avgScore/100` trong tab Thống kê, fallback avgComplianceScore)

### FunctionalDiagnostics
- v1: `frontend/src/pages/FunctionalDiagnostics.tsx` | v2: `frontend/src/modules/radiology/pages/FunctionalDiagnostics.tsx` | confidence scan: high | OVERTURNED_R2
  - [x] Nút 'Tải lại' + refetch — ĐÃ PORT 2026-08-02 (nút Làm mới + refetch khi đổi keyword/loại/trạng thái): v1 frontend/src/pages/FunctionalDiagnostics.tsx:70 (Button Tải lại) + :27-36 (refetch server mỗi khi keyword/testType/status đổi). V2 fetch đúng 1 lần khi mount (modules/radiology/pages/FunctionalDiagnostics.tsx:38-41), toolbar :100-108 không có nút refresh — worklist stale, chỉ reload sau complete/verify. Không phải house-style v2: SimpleV2Page chuẩn (pages-v2/_v2kit.tsx:300-302) và các trang v2 khác (HealthCheckup:299, AssetManagement:235, PharmacyApproval:351…) đều có nút 'Làm mới'.
  - [x] Tìm kiếm/lọc server-side toàn dataset — ĐÃ PORT 2026-08-02 (truyền keyword/testType/status vào fdt.search): v1 :30-32 truyền keyword/testType/status vào fdt.search (backend FunctionalDiagnosticsService.SearchAsync:42-52 lọc toàn bảng, top-N CreatedAt desc). V2 :39 chỉ tải 500 bản ghi mới nhất rồi lọc client (:48-57) → bản ghi cũ hơn cửa sổ 500 dòng không thể tìm/lọc ra ở v2 nhưng v1 tìm được.
  - [x] Trạng thái loading của bảng — ĐÃ PORT 2026-08-02 (DataTable empty phân biệt Đang tải / Không có dữ liệu): v1 :73 Table loading spinner (:21,:28). V2 :38 destructure chỉ { rows, reload } từ useListData, bỏ loading/error, DataTable không nhận empty/loading state → lúc tải bảng trống trơn, không phân biệt đang-tải với không-có-dữ-liệu.
  - [x] Drawer luôn hiển thị Kết luận — ĐÃ SỬA 2026-08-02 (bỏ bọc `findings &&` → không còn ẩn kết luận khi mô tả rỗng) + Khuyến nghị: v1 :108-113 luôn render với fallback '—'; v2 :156-171 bọc cả Kết luận/Khuyến nghị trong {detail.findings && …} → bản ghi có conclusion/recommendation nhưng findings rỗng bị ẨN dữ liệu lâm sàng trong drawer kết quả.

### HealthCheckup
- v1: `frontend/src/pages/HealthCheckup.tsx` | v2: `frontend/src/modules/checkup/pages/HealthCheckup.tsx` | confidence scan: high | SCAN_ONLY
  - [x] 'Báo cáo' tab — ĐÃ PORT 2026-08-02 (tab Báo cáo: DataTable tổng hợp theo công ty/đợt — Tổng ĐK/Hoàn thành/Đạt/Không đạt/Tỷ lệ + hàng TỔNG CỘNG)

### Help
- v1: `frontend/src/pages/Help.tsx` | v2: `frontend/src/modules/radiology/pages/Help.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Server-side full-text search over article CONTENT: v1 pages/Help.tsx L135-137 (handleSearch) -> L80-85 sends keyword to risApi.searchHelpArticles on every search; backend RISCompleteService.OnlineHelp.cs L92-93 matches Title.Contains(keyword) || Content.Contains(keyword). v2 (modules/radiology/pages/Help.tsx L60-68) filters client-side over title/summary/tags/categoryName only — content is impossible to match because list-DTO items don't include Content (backend L104-114). Even v2's 'Làm mới' path (L37) is neutralized: content-only server matches are re-filtered out by the client filter. Repro: search a term that appears only in an article body -> v1 finds it, v2 shows 'Chưa có bài viết'.
  - [ ] (minor) Searchable corpus truncation: v2 fetches once with pageSize 200 (v2 L37) and never re-queries per search; v1 re-queries the server per keyword/category (pages/Help.tsx L77-93), so with >200 published articles v2 silently drops the tail from search/browse.

### HospitalPharmacy
- v1: `frontend/src/pages/HospitalPharmacy.tsx` | v2: `frontend/src/modules/pharmacy/pages/HospitalPharmacy.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Đóng ca (close shift) unreachable in v2: backend PharmacyShift.Status 1=Open/2=Closed (HIS.Core/Entities/HospitalPharmacy.cs:119, Shifts.cs:70,106); v1 renders per-row 'Đóng ca' when status===1 + close modal (frontend/src/pages/HospitalPharmacy.tsx:1005-1010, 1033-1057); v2 only renders its close button inside `currentShift.status === 0` branch (modules/pharmacy/pages/HospitalPharmacy.tsx:1108-1116) which is never true — close-shift modal (v2:1152) can never open; open shifts also mislabeled 'Đã đóng' (v2 SHIFT_ST:39-42)
  - [x] GPP record types ADR + Đình chỉ thuốc — ĐÃ SỬA (016feeba P0): GPP_TYPES = {1:'ADR (biến cố thuốc)',2:'Đình chỉ thuốc',3:'Nhiệt độ',4:'Độ ẩm'} khớp backend RecordType (HospitalPharmacy.cs:131)
  - [x] Customer type Staff + VIP filter — ĐÃ SỬA (016feeba P0 + 2026-08-02): CTYPE={1:'Thường',2:'VIP',3:'Nhân viên'} khớp backend; default customerType form 0→1 (0 không tồn tại trong BE)
  - [x] Commission status filter — ĐÃ SỬA (016feeba P0): COMM_ST 1=Chờ TT/2=Đã trả khớp backend
  - [x] Gender + sales history — ĐÃ SỬA (016feeba + 2026-08-02): gender Nam=1/Nữ=0 khớp BE 0=Female/1=Male; sales history 7→30 ngày + keyword server-side (debounce 300ms), tab trạng thái vẫn client-side

### Immunization
- v1: `frontend/src/pages/Immunization.tsx` | v2: `frontend/src/modules/immunization/pages/Immunization.tsx` | confidence scan: high | SCAN_ONLY
  - [~] Create Campaign — KHÔNG PORT (verify 2026-08-02: FE api createCampaign tự throw 'Campaign API is not supported by the current backend' — BE không có endpoint tạo chiến dịch; nút v1 là flow chết. Muốn có thật → làm backend trước, task riêng.)

### InfectionControl
- v1: `frontend/src/pages/InfectionControl.tsx` | v2: `frontend/src/pages-v2/InfectionControl.tsx` | confidence scan: high | SCAN_ONLY
  - [x] Isolation orders list — ĐÃ PORT 2026-08-02 (tab "Cách ly" mới: KPI + DataTable getIsolationOrders + drawer chi tiết (biện pháp/PPE/hạn chế thăm) + modal Kết thúc cách ly BẮT BUỘC lý do qua discontinueIsolation)
  - [ ] Surveillance dashboard tab ('Giám sát thường quy' — dept-level HAI rate/patient-days table, v1 lines 853-915)
  - [ ] Isolation guidelines reference tab ('Hướng dẫn cách ly' — v1 lines 1040-1125)
  - [ ] Aggregate infection-control report print ('In báo cáo' header button + buildInfectionReportHtml, v1 lines 337-343, 761); v2 only prints a single case via window.print()

### Inpatient
- v1: `frontend/src/pages/Inpatient.tsx` | v2: `frontend/src/modules/inpatient/pages/Inpatient.tsx` | confidence scan: med | SCAN_ONLY
  - [ ] Daily progress note creation ('Ghi nhận diễn biến hàng ngày' tab + modal, v1 pages/Inpatient.tsx:1236-1258); v2's only related feature (TreatmentSheetsModal in TreatmentMonitorSection.tsx:1623-1729) is print-only of existing sheets, with no create UI reachable from the Inpatient page

### InpatientDispensing
- v1: `frontend/src/pages/InpatientDispensing.tsx` | v2: `frontend/src/modules/pharmacy/pages/InpatientDispensing.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Per-prescription expandable drug-items table (nested table of p.items: Mã/Thuốc/SL/ĐV/Đơn giá) letting pharmacist review medicines+quantities+prices inside each prescription before batch dispense — frontend/src/pages/InpatientDispensing.tsx:249-266; v2 only has department-level collapse showing a flat prescription list with an item count (modules/pharmacy/pages/InpatientDispensing.tsx:222)
  - [ ] Server-provided error message surfaced on load/submit failure (err.response.data.message) — frontend/src/pages/InpatientDispensing.tsx:93-95,134-136; v2 shows only generic 'Tải danh sách thất bại'/'Tạo phiếu thất bại'
  - [ ] Typeahead search on warehouse and department selects (showSearch + optionFilterProp=label) — frontend/src/pages/InpatientDispensing.tsx:183-184,193-194; v2 Filter is a plain option list

### Insurance
- v1: `frontend/src/pages/Insurance.tsx` | v2: `frontend/src/modules/insurance/pages/Insurance.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Ký số XML lô xuất (USB token) — frontend/src/pages/Insurance.tsx:429-449 handleSignExport → signXmlBatch (POST /insurance/xml/sign/{batchId}); nút 'Ký số XML' :1039-1046; panel 'Bước 4: Kết quả ký số' :1051-1061. Không có caller v2 nào cho signXmlBatch.
  - [ ] Gửi lô XML lên cổng BHXH (batch-level, dùng portal credentials) — frontend/src/pages/Insurance.tsx:541-567 handleSubmitBatch (getPortalConfig + submitToInsurancePortal); nút 'Gửi BHXH' per-batch :793-797. Không có caller v2; BhxhAudit chỉ gửi per-hồ-sơ qua /insurance-xml/submit; nút 'Gửi BHXH' v2 chỉ navigate sang trang cấu hình /v2/bhxh-config.
  - [ ] Tải xuống lô XML lịch sử (bất kỳ lô nào đã xuất trước đó) — frontend/src/pages/Insurance.tsx:522-539 handleDownloadBatch; nút 'Tải xuống' trong bảng 'Lịch sử xuất XML' :790-792, bảng :1063-1077. Tab 'Đợt quyết toán' v2 không có action nào; v2 chỉ tải được lô vừa xuất trong session (modules/insurance/pages/Insurance.tsx:823-827).
  - [ ] Xuất XML theo khoảng ngày tùy ý (fromDate/toDate) — frontend/src/pages/Insurance.tsx:76-79, 290-307 (buildExportConfig), 874-884 (RangePicker); v2 buildXmlConfig (modules/insurance/pages/Insurance.tsx:431-438) chỉ chọn tháng/năm. Gap phụ.

### InterHospitalSharing
- v1: `frontend/src/pages/InterHospitalSharing.tsx` | v2: `frontend/src/modules/system/pages/InterHospitalSharing.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Date-range filter: v1 pages/InterHospitalSharing.tsx:42,62-63,177-179 sends fromDate/toDate (RangePicker) to searchRequests; v2 only calls searchRequests({keyword}) (modules/system/pages/InterHospitalSharing.tsx:74) — no date filtering exists at all despite API support (modules/system/api/interHospitalSharing.ts:41-42)
  - [ ] Server-side KPI stats: v1 pages/InterHospitalSharing.tsx:38,66-67,186-187 shows 'Hoàn thành hôm nay' (completedToday) and 'TB phản hồi (phút)' (avgResponseTimeMinutes) from ihApi.getStats(); v2 never calls getStats and its client-computed KPIs cannot reproduce either metric — the 'KPI stats all matching' claim is false
  - [ ] Direction filter incoming/outgoing/all: v1 pages/InterHospitalSharing.tsx:39,55-57,191-195 — tabs drive the server 'direction' param and the DEFAULT view is the incoming work queue; v2 only renders direction as a column value with no way to filter (not merely cosmetic)
  - [ ] Respond decision 'Tiếp nhận' (status→1) missing + workflow semantics changed: v1 pages/InterHospitalSharing.tsx:245-249 offers Accept(status 1)/Reject(4); v2 lines 55-57,177 maps approve→status 3 (Completed) directly, making the intermediate 'Đã nhận'/'Đang xử lý' states unreachable from v2 UI; additionally v1:141 restricts respond to incoming requests only while v2:133 allows responding to one's own outgoing requests
  - [ ] Minor: completedAt shown in v1 detail timeline (pages/InterHospitalSharing.tsx:220) is not displayed anywhere in the v2 drawer

### LISConfig
- v1: `frontend/src/pages/LISConfig.tsx` | v2: `frontend/src/modules/laboratory/pages/LISConfig.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Full Labconnect tab UI (pages/LISConfig.tsx:1105-1327 LabconnectTab) not ported: sync history table (getLabconnectHistory, columns: thời gian/hướng/số bản ghi/trạng thái/duration/lỗi), 'Thử lại lỗi' retryFailedSyncs button, separate Gửi/Nhận (Send/Receive direction) sync buttons, pending send/receive counts, status card fields serverUrl/version — v2 (modules/laboratory/pages/LISConfig.tsx:1-22,87-89,170,180) never imports getLabconnectHistory or retryFailedSyncs at all, only calls syncLabconnect() with no direction and shows isConnected as one KPI tile.

### Laboratory
- v1: `frontend/src/pages/Laboratory.tsx` | v2: `frontend/src/modules/laboratory/pages/Laboratory.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] 'Gửi kết quả qua SMS' action (pages/Laboratory.tsx:141-153,999-1007, POST /sms/send-test) has no equivalent anywhere in the v2 laboratory module — grep for 'sms/send-test' across frontend/src only matches the v1 file.
  - [ ] v1's sample-collection Modal (pages/Laboratory.tsx:1272-1376) lets staff choose sample type from 6 options (Máu tĩnh mạch/mao mạch, Nước tiểu, Phân, Dịch não tủy, Khác) + actual collection time + notes; v2's onCollect (modules/laboratory/pages/Laboratory.tsx:257-272) is a one-click action that hardcodes sampleType:'Blood' and collectionTime:now with no way to record a non-blood specimen type or notes — confirmed no other v2 laboratory page (SampleReceive/SampleTracking) restores this.

### LinenManagement
- v1: `frontend/src/pages/LinenManagement.tsx` | v2: `frontend/src/modules/administration/pages/LinenManagement.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Items tab: v1 has keyword search + category filter dropdown (pages/LinenManagement.tsx:47-51); v2's LinenItemsPanel calls linen.listItems({}) with no params and imports neither SearchBox nor Filter.
  - [ ] Tx tab: v1 has transactionType filter + status filter dropdown (pages/LinenManagement.tsx:106-113); v2's LinenTxPanel has no filters, loads a fixed pageSize:200.
  - [ ] Ster tab: v1 has areaType filter + status filter dropdown (pages/LinenManagement.tsx:193-200); v2's LinenSterPanel has no filters.
  - [ ] Tx detail drawer: v1 shows Người gửi (dispatcherName), Người nhận (receiverName), Ghi chú (notes), and an itemized JSON breakdown of detailsJson (pages/LinenManagement.tsx:145-152); v2's drawer (modules/administration/pages/LinenManagement.tsx:190-206) shows none of these fields.

### MasterData
- v1: `frontend/src/pages/MasterData.tsx` | v2: `frontend/src/modules/system/pages/MasterData.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Services form: v1 exposes bhytCode + bhytPrice (BHYT insurance code/price) (pages/MasterData.tsx:1421-1424,1457-1464) sent to saveParaclinicalService; v2's FORM_FIELDS.services (modules/system/pages/MasterData.tsx:52-63) has no such fields and its submit only defaults isActive/unitPrice — BHYT code/price cannot be set.
  - [ ] Medicines form: v1 exposes registrationNumber, manufacturer, country, price (unitPrice), bhytPrice (pages/MasterData.tsx:1495-1547); v2's FORM_FIELDS.medicines (modules/system/pages/MasterData.tsx:82-91) has none of these — a new/edited medicine in v2 cannot be given a sale price, BHYT price, manufacturer, registration number, or country of origin.
  - [ ] Departments form: v1 exposes parentId (khoa cha/parent department hierarchy), email, bedCount (số giường) (pages/MasterData.tsx:1587-1621); v2's FORM_FIELDS.departments (modules/system/pages/MasterData.tsx:71-81) has none of these.

### MedicalForensics
- v1: `frontend/src/pages/MedicalForensics.tsx` | v2: `frontend/src/modules/specialty/pages/MedicalForensics.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] 'In giấy giám định' (print certificate, pages/MedicalForensics.tsx:117-125,176 via forensicApi.printCertificate, blob PDF) has no equivalent in v2 — confirmed printCertificate is exported from modules/specialty/api/forensic.ts but the only caller in the whole frontend is the v1 page; v2's MedicalForensicsV2 action column only has Sửa/Duyệt (modules/specialty/pages/MedicalForensics.tsx:144-149).
  - [ ] Loại giám định (caseType) filter dropdown and RangePicker date filter in the list toolbar (pages/MedicalForensics.tsx:216-220) are absent in v2 — only free-text SearchBox remains (modules/specialty/pages/MedicalForensics.tsx:155-159).

### MedicalRecordArchive
- v1: `frontend/src/pages/MedicalRecordArchive.tsx` | v2: `frontend/src/pages-v2/MedicalRecordArchive.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Tab 'Bàn giao HSBA' (pages/MedicalRecordArchive.tsx:1210-1390, tabs registration :1962-1973) — handover list w/ status filter+date range, bulk 'Bàn giao'/'Duyệt' actions (handleHandover :508-524, handleApprove :526-548), preview drawer w/ form-completion progress (:1391-1440). Entirely absent from v2.
  - [ ] v1's 'Lưu trữ & Tra cứu' tab (pages/MedicalRecordArchive.tsx:1602-1874): local/cloud storage-status dashboard w/ sync status (fetchStorageStatus :1472-1493), generate archive as XML/HL7/CDA (handleGenerateArchive :1495-1507, buttons :1739-1761), decode archived record drawer (handleDecodeRecord :1509-1522, decode Drawer :1786-1872), download archive blob (handleDownloadArchive :1524-1537). v2's same-named tab is a different feature (2-level dept/KHTH archive approval workflow) — none of the XML/HL7/CDA generate/decode/download/sync flows exist in v2.

### MedicalRecordPlanning
- v1: `frontend/src/pages/MedicalRecordPlanning.tsx` | v2: `frontend/src/modules/medical-record/pages/MedicalRecordPlanning.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Tab 'Mã BA' (tab mặc định): duyệt/lọc TOÀN BỘ dataset qua phân trang + lọc ngày server-side — v1 pages/MedicalRecordPlanning.tsx:248-267 gửi pageIndex/pageSize/fromDate/toDate lên server (backend hỗ trợ đủ: MedicalRecordPlanningService.RecordCode.cs:35-46), Table v1:705-711 phân trang 20/trang trên toàn bộ 'Tổng N bản ghi'; v2 modules/medical-record/pages/MedicalRecordPlanning.tsx:252 hardcode pageIndex:0 pageSize:200 và lọc ngày in-memory (v2:502-521) → mọi hồ sơ ngoài 200 dòng mới nhất KHÔNG thể truy cập bằng duyệt trang hay lọc 'Ngày cấp từ–đến' (kết quả lọc thiếu âm thầm, tổng số hiển thị sai); chỉ keyword search còn chạm server

### MedicalSupply
- v1: `frontend/src/pages/MedicalSupply.tsx` | v2: `frontend/src/modules/pharmacy/pages/MedicalSupply.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Tab 'Xuất kho' (Issues) — pages/MedicalSupply.tsx:296-308 (issueColumns), :457-478 (tab), :619-669 (create-issue modal). Entirely absent from v2.
  - [ ] Tab 'VT tái sử dụng' (Reusable supplies) — pages/MedicalSupply.tsx:310-349 (reusableColumns w/ remaining-uses progress + next-sterilization-due warning), :480-515 (tab), :672-688 (sterilize modal) calling real API warehouseApi.recordSterilization (:364-375). Infection-control/patient-safety relevant feature entirely absent from v2.
  - [ ] Tab 'Đề xuất mua sắm' (Procurement requests) — pages/MedicalSupply.tsx:351-362 (procurementColumns), :516-538 (tab), :690-735 (create-procurement modal) calling real API warehouseApi.createProcurementRequest (:164-181). Entirely absent from v2.

### MentalHealth
- v1: `frontend/src/pages/MentalHealth.tsx` | v2: `frontend/src/modules/public-health/pages/MentalHealth.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Minor filter-UI gap only: v1's explicit 'Loại bệnh' (caseType) Select and RangePicker date filters (pages/MentalHealth.tsx:189-195) have no equivalent dropdown/range control in v2 — v2's SearchBox does not index caseType text, so filtering cases by disease type or date range is not directly possible in v2 (case type is still visible as a column chip and case data itself is not lost).
  - [ ] Case-type filter (Select 'Loại bệnh', 6 categories) — v1 pages/MentalHealth.tsx:43,64,189-192; absent in v2 (filter memo modules/public-health/pages/MentalHealth.tsx:118-126 has no caseType condition)
  - [ ] Date-range filter (RangePicker fromDate/toDate) — v1 pages/MentalHealth.tsx:44,65-66,193-195; v2 has no date filtering at all
  - [ ] Aggregate KPI 'Quá hạn tái khám' (overdueFollowUps from GET /mental-health/stats) — v1 pages/MentalHealth.tsx:70,202; v2 never calls getStats and its KpiStrip (:166-173) omits overdue count (secondary gap; per-row overdue highlight retained)

### MethadoneTreatment
- v1: `frontend/src/pages/MethadoneTreatment.tsx` | v2: `frontend/src/pages-v2/MethadoneTreatment.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Tab 'Cấp liều hàng ngày' — v1 doseColumns (pages/MethadoneTreatment.tsx:226-238) shows ALL patients' dose records in one table for daily ops. v2 only has a per-patient 'openHistory' drawer (pages-v2/MethadoneTreatment.tsx:204-218) reachable one patient at a time — no cross-patient daily dosing view.
  - [ ] Tab 'Xét nghiệm nước tiểu' — v1 urineColumns (pages/MethadoneTreatment.tsx:240-264) lists all patients' urine tests in one table. No equivalent list/table exists anywhere in v2.
  - [ ] Tab 'Thống kê' — v1 (pages/MethadoneTreatment.tsx:370-449): compliance-rate stat+progress, phase-distribution chart, urine-test positivity summary, avg-dose-by-phase. Entirely absent from v2.
  - [ ] Data-integrity regression in urine-test modal: v1's recordUrineTest form requires user-entered results for morphine/amphetamine/thc/benzodiazepine/methadone (all 5 required Selects, pages/MethadoneTreatment.tsx:661-695). v2's submitUrine (pages-v2/MethadoneTreatment.tsx:186-202) only lets the user set morphine/amphetamine/thc and HARDCODES `methadone: 'positive', benzodiazepine: 'negative'` regardless of actual lab result — a real positive benzodiazepine or negative methadone result cannot be recorded.

### Microbiology
- v1: `frontend/src/pages/Microbiology.tsx` | v2: `frontend/src/modules/laboratory/pages/Microbiology.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Hiển thị 'Hình thái' (morphology) + 'PP định danh' (identificationMethod) của vi khuẩn phân lập — v1 frontend/src/pages/Microbiology.tsx:237-238 (Descriptions.Item trong Culture Detail Modal); v2 chỉ nhập (modules/laboratory/pages/Microbiology.tsx:475-480) mà không bao giờ render lại (v2:209-230) → dữ liệu định danh vi sinh thành write-only
  - [ ] Tab/bộ lọc 'Không mọc' (status 3 = NoGrowth) — v1 frontend/src/pages/Microbiology.tsx:152-153 (tabItems key 'noGrowth' → getFilteredCultures([3])); v2 gộp status 3 vào nhóm 'completed' (modules/laboratory/pages/Microbiology.tsx:53) và không có filter trạng thái nào khác → không thể liệt kê riêng mẫu cấy âm tính, KPI 'Hoàn tất' bị đếm gộp (v2:139)
  - [ ] Tìm kiếm phía server theo keyword — v1 frontend/src/pages/Microbiology.tsx:41,49,51 (fetchData useCallback deps [searchText] → gọi lại API kèm keyword mỗi lần đổi từ khoá); v2 chỉ load 1 lần lúc mount (v2:79) rồi filter client-side (v2:88-97) trên tập bị backend cắt .Take(200) (backend/src/HIS.Infrastructure/Services/LIS/LISCompleteService.Microbiology.cs:40) → không tìm được mẫu cũ ngoài 200 bản ghi mới nhất
  - [ ] Nhãn tiếng Việt cho cultureType và gramStain (mức thấp) — v1 frontend/src/pages/Microbiology.tsx:116-117 ('Hiếu khí/Kỵ khí/Nấm/Mycobacteria') và :236 (tag Gram(+)/Gram(-)); v2 in thẳng mã enum tiếng Anh (v2:112,145,196,226)

### NationalGateways
- v1: `frontend/src/pages/NationalGateways.tsx` | v2: `frontend/src/modules/system/pages/NationalGateways.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Report detail drawer with payload/response XML inspection — v1 pages/NationalGateways.tsx:231-253 (Drawer showing payloadXml/responseXml, triggered by onRow onClick :209). v2's DataTable in NgPharmPanel (modules/system/pages/NationalGateways.tsx:227-232) has no onRowClick handler at all — no way to inspect what XML was sent to / received from the national pharmacy gateway.
  - [ ] Report-type filter dropdown — v1 pages/NationalGateways.tsx:180-185 (Select filtering the report list by DailySale/MonthlyInventory/NarcoticReport/Recall). No equivalent filter control in v2's NgPharmPanel.
  - [ ] 'Tạo & gửi' (generate) modal with report-type choice, custom period range and notes — v1 pages/NationalGateways.tsx:212-229 (genForm: reportType Select w/ 4 options incl. 'NarcoticReport' — báo cáo gây nghiện — + RangePicker + notes). v2's generate() (modules/system/pages/NationalGateways.tsx:189-197) has NO modal/form at all — it hardcodes reportType:'DailySale' and a fixed 7-day period, so a user can no longer generate a MonthlyInventory/NarcoticReport/Recall report or choose a custom period through the UI, a compliance-relevant regression for narcotics reporting.

### OPD
- v1: `frontend/src/pages/OPD.tsx` | v2: `frontend/src/modules/reception/pages/OPD.tsx (list shell) + frontend/src/modules/opd/pages/OpdEditor.tsx (form khám đầy đủ, route /v2/opd/edit)` | confidence scan: med | SCAN_ONLY
  - [ ] Kê vật tư y tế (VTYT) trực tiếp trong phiếu khám ngoại trú: v1 OPD.tsx dòng 862-1090 (handleSearchSupplies gọi getWarehouseStock itemType=2, handleAddSupplyOrder, handleSaveSupplyOrders dùng chung createServiceOrders để lên hóa đơn ngay, handleSaveAsTemplate lưu mẫu vật tư, handleCopyPreviousSupplyOrders copy đơn VTYT lần khám trước, handlePrintSupplyOrders in phiếu VTYT riêng). v2 DiagnosisOrdersSection chỉ tìm dịch vụ CLS qua examinationApi.searchServices (backend ExaminationCompleteService.ServiceOrders.cs dòng 212-215 chỉ query bảng Services, KHÔNG có warehouse item). Hai modal thay thế trong OpdEditor — CabinetIssueModal ('Xuất tủ trực', kho WarehouseType=4) và StockReservationModal ('Xuất dự trù' F10, tạo PharmacyApproval cần duyệt kho) — là 2 luồng nghiệp vụ khác (dispensing từ tủ trực / xin duyệt kho), không phải kê VTYT tức thời từ kho chung kèm bill như v1.

### ParaclinicalCatalogs
- v1: `frontend/src/pages/ParaclinicalCatalogs.tsx` | v2: `frontend/src/modules/administration/pages/ParaclinicalCatalogs.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Client-side required-field validation khi lưu: v1 chặn submit + báo lỗi từng field 'X là bắt buộc' qua antd Form rules (frontend/src/pages/_CrudTab.tsx:112,221; fields required khai tại frontend/src/pages/ParaclinicalCatalogs.tsx:22-23,52,60,83,91) — v2 handleSave (frontend/src/modules/administration/pages/ParaclinicalCatalogs.tsx:193-203) gửi thẳng API không validate, có thể submit mã máy BHXH (XML 4210) với code/name rỗng, hoặc chỉ nhận toast 'Lưu thất bại' không chỉ ra field thiếu
  - [ ] Dropdown ngữ nghĩa nghiệp vụ cho priorityLevel: v1 là Select 3 mức có nhãn '1 - Phòng cấu hình / 2 - Phòng của khoa / 3 - STT thiết lập' + render nhãn trong bảng (frontend/src/pages/ParaclinicalCatalogs.tsx:88-101) — v2 thay bằng InputNumber tự do min=1 max=9 (v2 :361-368, bảng chỉ hiện badge P{n}), mất ngữ nghĩa nghiệp vụ và cho nhập giá trị 4-9 vô nghĩa vào cấu hình điều phối phòng CLS
  - [ ] Hiển thị message lỗi chi tiết từ server khi save thất bại: v1 show response.data.message/title (frontend/src/pages/_CrudTab.tsx:124-126) — v2 nuốt mọi lỗi thành 'Lưu thất bại' chung chung (v2 :202)
  - [ ] Nút 'Làm mới' reload thủ công (frontend/src/pages/_CrudTab.tsx:190) — v2 chỉ load một lần lúc mount, không có cách refresh không rời trang

### PatientPortal
- v1: `frontend/src/pages/PatientPortal.tsx` | v2: `frontend/src/modules/portal/pages/PatientPortal.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Kết quả xét nghiệm (Lab results) — v1 dòng 861-908, gọi getLabResults
  - [ ] Hóa đơn (Bills) — v1 dòng 911-956, gọi getBills
  - [ ] Đánh giá dịch vụ / Feedback-rating (Rate component) — v1 dòng 957-1024, gọi getFeedbacks/submitFeedback
  - [ ] Tính năng Portal + Tin tức (thông tin/tin tức bệnh viện) — v1 dòng 1025-1175
  - [ ] Tài khoản (account info) — v1 dòng 1176-1254, gọi getAccount
  - [ ] Gia đình — CRUD thành viên gia đình — v1 dòng 1255-1279, gọi getFamilyMembers/saveFamilyMember/deleteFamilyMember
  - [ ] Nhắc thuốc — CRUD nhắc uống thuốc + toggle — v1 dòng 1280-1303, gọi getMedicineReminders/saveMedicineReminder/deleteMedicineReminder/toggleMedicineReminder
  - [ ] Sức khỏe — CRUD chỉ số sức khỏe + biểu đồ xu hướng (recharts LineChart) — v1 dòng 1304-1356, gọi getHealthMetrics/saveHealthMetric/deleteHealthMetric/getHealthMetricTrends
  - [ ] Hỏi đáp với bác sĩ — CRUD câu hỏi bệnh nhân — v1 dòng 1357-1400+, gọi getPatientQuestions/createPatientQuestion
  - [ ] Đặt lịch hẹn mới (modal bookAppointment) trong tab Lịch hẹn — v2 chỉ hiển thị danh sách, không có action tạo mới
  - [ ] Notifications (thông báo, mark-as-read) — v1 dùng getNotifications/markNotificationRead, không thấy tương đương trong v2
  - [ ] Dashboard tổng quan (getDashboard) hiển thị số liệu tổng hợp đầu trang — không thấy trong v2

### PaymentReports
- v1: `frontend/src/pages/PaymentReports.tsx` | v2: `frontend/src/modules/billing/pages/PaymentReports.tsx` | confidence scan: high | OVERTURNED
  - [ ] BC6 Excel export thiếu cột 'Đơn giá' (unitPrice) — v1 frontend/src/pages/PaymentReports.tsx:404 có {header:'Đơn giá', key:'unitPrice', format:formatVnd}; v2 EXCEL_HEADERS.bc6 (modules/billing/pages/PaymentReports.tsx:158-163) không có → khẳng định 'column defs match 1:1' của agent kia sai thực tế
  - [ ] Excel export v2 mất format tiền/ngày + width: v1 truyền formatVnd/formatDateTime/formatDate cho mọi cột tiền/ngày (v1:94,97,172-181,256,261,334-338,399-405,464-466); v2 EXCEL_HEADERS chỉ {key,header} → excelExport.ts:47 ghi raw value → ngày xuất ra dạng ISO thô (2026-08-02T04:12:33Z) thay vì 02/08/2026 11:12
  - [ ] Tổng tiền CHÍNH XÁC trên màn hình bị mất: v1 Statistic hiển thị đủ số VND — Tổng tạm ứng (v1:108), Tổng thu ròng net (v1:189), Tổng tiền HĐ (v1:348), Tổng hoàn (v1:477); v2 KPI làm tròn về triệu Math.round(x/1_000_000)+'tr' (v2:286,292,306,319), sai số ±500k, không nơi nào trên UI v2 xem được số chính xác — nghiệp vụ đối soát thu ngân cần số đúng từng đồng
  - [ ] Default date-range theo từng báo cáo bị mất: v1 BC3+BC6 mặc định hôm nay (v1:227,370), BC4/BC5/BC7 mặc định 30 ngày (v1:301,433); v2 dùng 1 range chung 7 ngày cho cả 8 tab (v2:53)
  - [ ] Pagination bị mất: v1 antd Table pageSize 20/30 (v1:115,274,354,417,483); v2 DataTable (components/table/DataTable/DataTable.tsx) render toàn bộ rows không phân trang — BC6 theo range có thể hàng nghìn dòng; kèm bug v2:278 rowKey=Math.random() gây key không ổn định

### Pharmacy
- v1: `frontend/src/pages/Pharmacy.tsx` | v2: `frontend/src/modules/pharmacy/pages/Pharmacy.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] In 'Phiếu xuất thuốc' MS 05/BV-02 (formal MOH dispensing slip with 3 signature blocks: Người nhận / Dược sĩ phát / Trưởng khoa) — v1 pages/Pharmacy.tsx:1046-1048 button 'In phiếu xuất' calls executePrintDispensingSlip (v1:538-550) which renders pages/pharmacy/printTemplates.ts (buildDispensingSlipHtml, header 'MS: 05/BV-02'). v2 modules/pharmacy/pages/Pharmacy.tsx only has 'In nhãn'/'In phiếu' buttons (v2:551, 581-583) that call pharmacyApi.printDrugLabel → backend PharmacyService.StockOps.cs:301-368, which renders a per-medicine 'NHÃN THUỐC' sticker label, NOT the signed dispensing-slip form. Grep confirms 'MS 05/BV-02' / dispensing-slip HTML exists nowhere else in frontend or backend — this is a real, unported clinical/administrative document.

### PharmacyApproval
- v1: `frontend/src/pages/PharmacyApproval.tsx` | v2: `frontend/src/modules/pharmacy/pages/PharmacyApproval.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] 'Xuất Excel' button (exportToExcel with columns Mã phiếu/Loại/Khoa-Phòng/Kho nhận/BN/Tổng tiền/Trạng thái/Ngày) — v1 pages/PharmacyApproval.tsx:199-221. v2 modules/pharmacy/pages/PharmacyApproval.tsx has no Excel export at all (grep for 'Excel'/'exportToExcel' in v2 file returns no matches); toolbar only has Làm mới, Cảnh báo HSD, Lập phiếu dự trù.

### PharmacyCatalogs
- v1: `frontend/src/pages/PharmacyCatalogs.tsx` | v2: `frontend/src/modules/administration/pages/PharmacyCatalogs.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Required-field validation on save: v1 blocks empty Mã/Tên with inline errors (frontend/src/pages/_CrudTab.tsx:112 + :221 via required:true at frontend/src/pages/PharmacyCatalogs.tsx:22-23,41-42; committee code/name at _CrudTab.tsx:401,404). v2 handleSave (frontend/src/modules/administration/pages/PharmacyCatalogs.tsx:199-209) has NO validation and seeds code:''/name:'' (lines 191-193); backend confirmed unguarded (no [Required] in MasterCatalogDtos.cs:3-13,104-114; MasterCatalogService.cs:38-57,332-360 persists as-is) → v2 silently creates catalog rows with empty code/name that feed pharmacy dropdowns and BHYT XML 4210.
  - [ ] Backend error message passthrough on save/delete failure: v1 shows response.data.message/title (frontend/src/pages/_CrudTab.tsx:124-126 save, :138-139 delete); v2 always shows generic 'Lưu thất bại'/'Xoá thất bại' (v2 lines 208, 219).
  - [ ] Manual refresh button 'Làm mới' (frontend/src/pages/_CrudTab.tsx:190 and :343): v2 toolbar has no re-fetch control (minor).

### PopulationHealth
- v1: `frontend/src/pages/PopulationHealth.tsx` | v2: `frontend/src/modules/public-health/pages/PopulationHealth.tsx` | confidence scan: med | SCAN_ONLY
  - [ ] Card 'Thống kê người cao tuổi' — 4 sub-metrics (Tổng / Bệnh mãn tính / Sống một mình / Cần chăm sóc), shown in v1 when elderlyStats.total > 0 via popApi.getElderlyStats() (pages/PopulationHealth.tsx:36,64-65,174-183). v2 modules/public-health/pages/PopulationHealth.tsx does not call getElderlyStats or render this breakdown; it only shows one aggregate KPI 'CS người già' (v2:138). Low severity (read-only reporting stat, no workflow/action attached), but a genuine data-display gap — no other public-health v2 page (checked ChronicDisease.tsx and siblings) surfaces this elderly-care breakdown either.

### PracticeLicense
- v1: `frontend/src/pages/PracticeLicense.tsx` | v2: `frontend/src/modules/hr/pages/PracticeLicense.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Date-range filter (RangePicker → fromDate/toDate) — v1 frontend/src/pages/PracticeLicense.tsx:39 (dateRange state), :58-59 (fromDate/toDate params to API), :192 (RangePicker UI). Confirmed real end-to-end: backend PracticeLicenseService.cs:42-45 filters IssueDate by these params. v2 has NO date filter at all (only sends {keyword}, v2:69) — user cannot filter licenses by issue-date range in v2.
  - [ ] Dedicated one-step renew flow via PUT /practice-license/licenses/{id}/renew — v1 frontend/src/pages/PracticeLicense.tsx:93-110 (handleRenew) + :234-244 (renew modal with newExpiryDate). Backend renew endpoint (PracticeLicenseService.cs:211-224) auto-resets Status=0 (active) with the new expiry. v2 replaces this with a generic edit modal (updateLicense, v2:151, 313-315) where the user must manually change both expiryDate AND status — guided renewal workflow lost, risk of stale 'Hết hạn' status after renewal.
  - [ ] (Secondary) v1 filters server-side (status/type/date/keyword pushed to API, v1:54-60) while v2 loads once and filters client-side; backend caps results at Take(200), so v2 filtering/search operates on a truncated set when >200 licenses exist.

### Prescription
- v1: `frontend/src/pages/Prescription.tsx` | v2: `frontend/src/modules/opd/pages/PrescriptionEditor.tsx (the real port target; frontend/src/modules/portal/pages/Prescription.tsx is a companion list/history page that navigates into it)` | confidence scan: med | OVERTURNED
  - [ ] Hard-stop hoàn thành đơn khi tương tác thuốc severity HIGH chưa có lý do ghi đè — frontend/src/pages/Prescription.tsx:593-604 (Modal.confirm chặn + ép mở drawer); v2 guard() PrescriptionEditor.tsx:237-242 không kiểm tra interactions, completeWithSign v2:252-260 tạo đơn không gate
  - [ ] Nhập + enforce + persist 'Lý do ghi đè tương tác thuốc' vào DTO instructions — frontend/src/pages/Prescription.tsx:1962-1987 (TextArea bind overrideReason, nút Xác nhận ghi đè disabled khi rỗng) và :610-613 (đưa vào instructions); v2 textarea PrescriptionEditor.tsx:775 uncontrolled (không value/onChange), buildDto v2:222-235 không set instructions dù CreatePrescriptionDto có field (examination.ts:549)
  - [ ] Tính BHYT chi trả per-item theo medicine.insuranceCovered trên Phiếu công khai thuốc + paymentType per-item — frontend/src/pages/Prescription.tsx:762, 1863-1873 (chỉ thuốc insuranceCovered mới tính 80%), :575/629/1743 (paymentType = insuranceCovered ? 1 : 2); v2 hardcode paymentType:1 (PrescriptionEditor.tsx:233, 361) và tính 80% cho MỌI thuốc nếu BN có số thẻ (v2:324, 720) — sai tiền trên biểu mẫu in với thuốc tự túc
  - [ ] Panel 'Đơn thuốc gần đây' click-to-load BN + chẩn đoán vào editor khi chưa chọn BN — frontend/src/pages/Prescription.tsx:1294-1370 và handleSelectRecentPrescription :279-310; trang list portal v2 (modules/portal/pages/Prescription.tsx:104) navigate('/v2/prescription/edit') KHÔNG kèm ?patientId=/?examId= dù editor hỗ trợ preload (PrescriptionEditor.tsx:137-162) → editor mở trống, mất context BN
  - [ ] Ô 'Chẩn đoán' nhập/sửa tay bởi bác sĩ — frontend/src/pages/Prescription.tsx:1287-1289; v2 chỉ lấy read-only từ OPD context (ctx.mainDiagnosis), không có input
  - [ ] Validation số lượng tối đa theo tồn kho — frontend/src/pages/Prescription.tsx:1613-1618 (InputNumber max={selectedMedicine.stock}); v2 qty input không giới hạn (PrescriptionEditor.tsx:595)

### Procurement
- v1: `frontend/src/pages/Procurement.tsx` | v2: `frontend/src/modules/pharmacy/pages/Procurement.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Duyệt đề xuất (Approve) — v1 pages/Procurement.tsx:89-95 handleApprove + :149-153 Popconfirm/Button 'Duyệt' calling warehouseApi.approveProcurementRequest — no approve action anywhere in v2
  - [ ] Tạo đề xuất dự trù (Create request modal + cart) — v1 pages/Procurement.tsx:34-37,96-117,203-224,336+ (createModal/cartItems/Form, warehouseApi.createProcurementRequest) — no create flow in v2 (v2 has zero POST calls)
  - [ ] Tab 'Gợi ý nhập hàng' (auto-restock suggestions + add-to-cart) — v1 pages/Procurement.tsx:239-268 (fetchSuggestions/suggestionColumns/addToCart, warehouseApi.getAutoProcurementSuggestions) — tab does not exist in v2

### QualityDashboardLive
- v1: `frontend/src/pages/QualityDashboardLive.tsx` | v2: `frontend/src/modules/quality/pages/QualityDashboardLive.tsx` | confidence scan: high | OVERTURNED
  - [ ] Zero-money rendering: v1 fmtVnd (pages/QualityDashboardLive.tsx:9) renders 0 as '0đ'; v2 uses fmtVNDg (_v2kit.tsx:67-68) which renders 0/null as 'Miễn phí' (Free). Affects Revenue-tab KPIs 'Tổng doanh thu/Ngoại trú/Nội trú' (v1 lines 150-152) — every day before the first receipt the dashboard shows 'Tổng doanh thu: Miễn phí' — plus per-cashier money columns (v1 lines 159-161), Inpatient 'Tổng chi phí' KPI (v1 line 75) and 'Chi phí phát sinh' column (v1 line 84). Wrong business semantics on a money dashboard; refutes the 'same KPI numbers' evidence.
  - [ ] Refresh timestamp precision: v1 shows HH:mm:ss and '—' before first successful load (pages/QualityDashboardLive.tsx:16,26); v2 fmtHMg shows only HH:mm and displays mount time before any data loads (minor).
  - [ ] Lab tab column header lost explanatory text '(Huyết học / Sinh hóa / Vi sinh / Miễn dịch)' (pages/QualityDashboardLive.tsx:130) (cosmetic).
  - [ ] Zero ratio renders '—' in v2 vs '0%' in v1 (pages/QualityDashboardLive.tsx:109,136) (cosmetic).
  - [ ] Page title annotation 'theo HSMT mục 39' (traceability to tender requirement) dropped (pages/QualityDashboardLive.tsx:23) (cosmetic).

### QueueDisplay
- v1: `frontend/src/pages/QueueDisplay.tsx` | v2: `frontend/src/modules/reception/pages/QueueDisplay.tsx` | confidence scan: med | SCAN_ONLY
  - [ ] Kiosk — Tra cứu giá dịch vụ (price lookup screen) — v1 pages/QueueDisplay.tsx:918-981 (KioskView 'price' screen) — absent from v2 QueueDisplay and from KioskSelfService.tsx (grep for 'price'/'giá' returns no matches)
  - [ ] Kiosk — Khảo sát hài lòng (satisfaction survey + thank-you screens) — v1 pages/QueueDisplay.tsx:982-1042 ('survey'/'survey-thanks') — absent from KioskSelfService.tsx (grep for 'survey' returns no matches)
  - [ ] Zone display (?zone=lab|pharmacy|reception generic TV board) — v1 pages/QueueDisplay.tsx:1043-1152 ZoneQueueView — explicitly excluded per v2 comment; zone=reception renders a distinct simplified room-overview not reproduced by v2's default room view (zone=pharmacy branch is already non-functional/stub in v1 itself, so lower severity there)

### Radiology
- v1: `frontend/src/pages/Radiology.tsx` | v2: `frontend/src/modules/radiology/pages/Radiology.tsx` | confidence scan: low | SCAN_ONLY
  - [ ] Lịch trực (duty-roster scheduling for radiology rooms) — v1 pages/Radiology.tsx:2001-2097 (tab 'dutySchedule', risApi.getDutySchedules) — no caller anywhere in v2 (project-wide grep)
  - [ ] Log tích hợp (HL7 ORM/ORU/ADT integration log viewer + stats) — v1 pages/Radiology.tsx:2098-2180+ (tab 'integrationLogs', risApi.searchIntegrationLogs/getIntegrationLogStatistics) — no caller anywhere in v2
  - [ ] Chat nội bộ RIS (risChat.ts) — v1 pages/Radiology.tsx:398,2660-2730 (chatOpen/chatLoading) — API client exists (modules/radiology/api/risChat.ts) but zero .tsx components use it anywhere in the project
  - [ ] RIS Config tab (in-app operational settings: print grouping / max results per read / auto-save interval / require-technician, localStorage-backed) — v1 pages/Radiology.tsx:511-522 + tab key:'config' ~2497-2609 — not found ported to any v2 file

### ReagentManagement
- v1: `frontend/src/pages/ReagentManagement.tsx` | v2: `frontend/src/modules/laboratory/pages/ReagentManagement.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Ghi nhận sử dụng hóa chất (record reagent consumption against a specific test/analyzer, decrements remainingQuantity) — v1 pages/ReagentManagement.tsx:72-85 handleRecordUsage, :110 action button, :201-208 modal (testCode/analyzerId/quantityUsed) — v2 never imports or calls reagentApi.recordReagentUsage

### ReceiptBookAdmin
- v1: `frontend/src/pages/ReceiptBookAdmin.tsx` | v2: `frontend/src/modules/billing/pages/ReceiptBookAdmin.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Hiển thị lý do lỗi nghiệp vụ từ server: v1 đọc err.response.data.message ở cả 5 đường lỗi (frontend/src/pages/ReceiptBookAdmin.tsx:72 load, :125 save, :136 activate, :151 close, :162 delete) — backend trả 400 {message} thật, ví dụ 'Sổ đã có phát hành — không thể xóa, nhấn Đóng sổ.' (backend/src/HIS.Infrastructure/Services/ReceiptBookService.cs:172, kèm hướng dẫn khắc phục) và 'Dải số bắt đầu/kết thúc không hợp lệ' (ReceiptBookService.cs:62). V2 (frontend/src/modules/billing/pages/ReceiptBookAdmin.tsx:76,114,119,128,133) catch vứt bỏ error, chỉ toast chung 'Lưu thất bại'/'Xóa thất bại'; apiClient (services/apiClient.ts) KHÔNG có global error-toast nên message mất hẳn — user không biết vì sao thao tác thất bại lẫn cách xử lý.
  - [ ] (thứ yếu, sát ranh layout — không tính là gap chính) v1 phân trang pageSize 20 + showSizeChanger (pages/ReceiptBookAdmin.tsx:223); v2 dùng DataTable thô không pagination (frontend/src/components/table/DataTable/DataTable.tsx render toàn bộ rows; Pager chỉ có trong SimpleV2Page mà page này không dùng).

### Reception
- v1: `frontend/src/pages/Reception.tsx` | v2: `frontend/src/modules/reception/pages/Reception.tsx (+ NewVisitModal.tsx, BhytVerifyModal.tsx, PatientLookupModal.tsx, ReceptionPrintModals.tsx, MoveRoomModal.tsx, ReceptionPayModal.tsx, VisitDrawerBody.tsx, StatsTab.tsx, NowServingTab.tsx)` | confidence scan: high | SCAN_ONLY
  - [ ] Barcode/QR scanner tại quầy tiếp đón (v1 pages/Reception.tsx:65,94,110,490-526,838,2082-2087) — không tồn tại trong modules/reception/pages/Reception.tsx hay bất kỳ file con nào
  - [ ] Truy cập 'Lịch sử khám' 1-click từ dòng/detail modal (v1 pages/Reception.tsx:309-311, 691-707, 1388-1393) — v2 chỉ có qua Tìm BN cũ → tìm lại → bấm Lịch sử (PatientLookupModal.tsx), không có trên dòng bảng chính hay drawer chi tiết

### Rehabilitation
- v1: `frontend/src/pages/Rehabilitation.tsx` | v2: `frontend/src/pages-v2/Rehabilitation.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Tab 'Tổng quan' (dashboard PHCN: BN mới hôm nay/xuất viện tuần này/PT-OT-ST breakdown/tỷ lệ đạt mục tiêu/bảng KTV phụ trách+utilization) — v1 pages/Rehabilitation.tsx:778-834, không có trong pages-v2/Rehabilitation.tsx (TOP_TABS chỉ referrals/schedule/exercises, getDashboard không được import)
  - [ ] Chọn KTV phụ trách (therapist) khi Lập kế hoạch PHCN / Thêm buổi tập — v1 pages/Rehabilitation.tsx:932-948,1005-1019, không có field tương ứng trong PLAN_FIELDS (pages-v2/Rehabilitation.tsx:84-91) hay modal Thêm buổi tập (:779-815)

### ReportCatalogs
- v1: `frontend/src/pages/ReportCatalogs.tsx` | v2: `frontend/src/modules/administration/pages/ReportCatalogs.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Required-field validation chặn save: v1 gọi form.validateFields() với rule required + message per-field (frontend/src/pages/_CrudTab.tsx:110-112, 221) cho các field required khai tại frontend/src/pages/ReportCatalogs.tsx:22-23 (code/name loại nhóm), :48 (groupTypeId), :53-54 (code/name nhóm BC). v2 handleSave (frontend/src/modules/administration/pages/ReportCatalogs.tsx:151-160) POST thẳng không kiểm tra — và backend cũng không validate (MasterCatalogService.cs:489-497, 524-532; DTO không [Required]) nên bấm 'Tạo mới' trên drawer trống sẽ tạo bản ghi danh mục Code/Name rỗng thật trong DB. Không phải cosmetic — mất guard toàn vẹn dữ liệu duy nhất của flow này.
  - [ ] Hiển thị message lỗi backend khi save/delete thất bại: v1 đọc response.data.message/title và show cho user (frontend/src/pages/_CrudTab.tsx:124-128, 138-139); v2 chỉ toast chung 'Lưu thất bại'/'Xoá thất bại' (modules/administration/pages/ReportCatalogs.tsx:159, 169) — mất thông tin lỗi actionable (gap phụ).
  - [ ] Nút 'Làm mới' refetch thủ công từ server (frontend/src/pages/_CrudTab.tsx:190) — v2 toolbar không có nút reload, muốn refresh phải F5 cả trang (gap nhỏ).

### Reports
- v1: `frontend/src/pages/Reports.tsx` | v2: `frontend/src/modules/reports/pages/Reports.tsx (+ ReportsHospitalTab.tsx)` | confidence scan: high | SCAN_ONLY
  - [ ] Tab 'Đối chiếu Level 6' — 8 reconciliation reports theo TT 54/2017/TT-BYT + TT 32/2023/TT-BYT (v1 pages/Reports.tsx:561-1005, ReconciliationTab) — không có trong v2
  - [ ] Tab 'Báo cáo động' — Report Builder tùy chỉnh (v1 pages/reports/ReportBuilderTab.tsx, 347 dòng) — không có trong v2
  - [ ] Tab 'BC Chi phí KCB' — 10 báo cáo chi phí KCB BHYT (v1 pages/reports/Nc10ReportTab.tsx, BhytCostReportsTab) — không có trong v2
  - [ ] Tab 'BC Hành chính & CLS' — 18 báo cáo hành chính/CLS (v1 pages/reports/Nc10ReportTab.tsx, AdminClsReportsTab) — không có trong v2
  - [ ] Tab 'BC Dược' — 12 báo cáo dược mở rộng (v1 pages/reports/Nc10ReportTab.tsx, PharmacyExtReportsTab) — không có trong v2

### ReproductiveHealth
- v1: `frontend/src/pages/ReproductiveHealth.tsx` | v2: `frontend/src/modules/specialty/pages/ReproductiveHealth.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Date-range filter: v1 RangePicker (frontend/src/pages/ReproductiveHealth.tsx:190-192, state :47) sends fromDate/toDate server-side (:63-64); backend really filters CreatedAt range (backend/src/HIS.Infrastructure/Services/ReproductiveHealthService.cs:40-43). v2 has NO date filter UI/state/param at all (grep RangePicker|fromDate|toDate|dateRange = 0 matches).
  - [ ] Server-side search & risk filter degraded to client-side over a capped dataset: v1 passes keyword/riskLevel/fromDate/toDate into searchPrenatal(params) (frontend/src/pages/ReproductiveHealth.tsx:60-67) so the backend filters BEFORE its Take(200) cap (ReproductiveHealthService.cs:46-48); v2 calls searchPrenatal() with no params (modules/specialty/pages/ReproductiveHealth.tsx:142-148) and filters client-side (:156-173) over only the 200 most-recent rows -> with >200 prenatal records, older records become unfindable by search/risk filter. Same Take(200) cap applies to family planning (ReproductiveHealthService.cs:198).
  - [ ] Minor: high-risk warning Alert banner 'N thai phu nguy co cao can theo doi dac biet' (frontend/src/pages/ReproductiveHealth.tsx:196-200) — v2 fetches getHighRiskPregnancies() but discards the list (:147 'parallel warm-up'), leaving only the KPI count; and v2 KpiStrip renders only on the Quan thai tab while v1 shows stats on both tabs.

### SampleStorage
- v1: `frontend/src/pages/SampleStorage.tsx` | v2: `frontend/src/modules/laboratory/pages/SampleStorage.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Storage alerts banner + 'Cảnh báo' stat card (v1:34,48,52,176-180,185, storageApi.getStorageAlerts) — absent in v2
  - [ ] Real camera/QR barcode scanner (v1:13,92-109,170,249, <BarcodeScanner> html5-qrcode) — v2 'Quét QR' modal (v2:150-196) is manual text entry only

### SatisfactionSurvey
- v1: `frontend/src/pages/SatisfactionSurvey.tsx` | v2: `frontend/src/pages-v2/SatisfactionSurvey.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] 'Phân tích' tab: monthly trend table + top-complaints table from /satisfaction-survey/analysis (v1:157,169-173,494-528) — no equivalent view/tab in v2
  - [ ] Per-question answer breakdown in result detail drawer (v1:762-778, SurveyResult.answers) — v2 SurveyResult type/drawer (v2:22-31,530-556) has no per-question answers at all

### SmsManagement
- v1: `frontend/src/pages/SmsManagement.tsx` | v2: `frontend/src/modules/system/pages/SmsManagement.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Date-range filter (RangePicker fromDate/toDate) on SMS logs — v1 frontend/src/pages/SmsManagement.tsx:352-367; API supports it (modules/system/api/sms.ts:27-28, backend SmsService.cs:242-245) but v2 loadLogs (modules/system/pages/SmsManagement.tsx:119-133) has no date UI and never sends fromDate/toDate
  - [ ] Correct message-type filter — v1 pages/SmsManagement.tsx:24-33 uses real backend values OTP/Result/Booking/Reminder/Critical/Test/Queue/General (exact-match filter, SmsService.cs:238-239); v2:22-25 uses invented lowercase appointment/billing/emergency/... so the filter always returns 0 rows and OTP/Critical/Booking/General cannot be filtered at all; type labels also fall back to raw codes for real data
  - [ ] Phone-number validation on test-SMS form — v1 pages/SmsManagement.tsx:400-403 pattern /^(0|\+?84)\d{9,10}$/ + message maxLength 500; v2 SEND_FIELDS (v2:40-43) only has required:true
  - [ ] Bonus regression (bug, supports non-parity): v2:183 multiplies successRate by 100 but backend already returns 0-100 percent (SmsService.cs:317) -> displays 9500% instead of 95%

### SpecialtyEMR
- v1: `frontend/src/pages/SpecialtyEMR.tsx` | v2: `frontend/src/modules/emr/pages/SpecialtyEMR.tsx` | confidence scan: high | OVERTURNED_R2
  - [x] Date-range filter — ĐÃ SỬA 2026-08-02 (RangePicker toolbar, fromDate/toDate đẩy server-side qua SpecialtyEmrSearchDto) — v1 frontend/src/pages/SpecialtyEMR.tsx:229-233 (state :118, sent as fromDate/toDate :136); backend genuinely filters by it (SpecialtyEmrService.cs:48-55, SpecialtyEmrSearchDto.FromDate/ToDate). v2 has NO date filter at all — its '7 ngày qua' KPI (modules/emr/pages/SpecialtyEMR.tsx:186,337) is a stat, not a filter.
  - [x] Server-side search — ĐÃ SỬA 2026-08-02 (keyword + specialtyType + fromDate/toDate đẩy server-side, useCallback + debounce 300ms; page vẫn cache 200/bộ-lọc nhưng mọi HSBA đều REACHABLE qua filter — giữ status-tab counts của v2) — v1 frontend/src/pages/SpecialtyEMR.tsx:131-145 sends keyword/specialtyType/pageIndex/pageSize per page (pagination onChange :250, backend Skip/Take + TotalCount SpecialtyEmrService.cs:64-67,92). v2 fetches only searchSpecialtyRecords(0, 200) once and filters/pages client-side.

### StockReport
- v1: `frontend/src/pages/StockReport.tsx` | v2: `frontend/src/modules/pharmacy/pages/StockReport.tsx` | confidence scan: med | SCAN_ONLY
  - [x] Mất phân trang bảng cho cả 4 tab — ĐÃ SỬA 2026-08-02 (Pager chung 50 dòng/trang, slice client-side như v1, reset trang khi đổi tab/bộ lọc) — v1 dùng Antd <Table pagination={{pageSize:50, showSizeChanger:true}}> (StockReport.tsx v1:156,202,237,272); v2 (modules/pharmacy/pages/StockReport.tsx:199-213) render toàn bộ detail.items/summary.items/... 1 lần, không có <Pager/> nào trong file — rủi ro UX/hiệu năng khi kho có hàng nghìn dòng tồn/lô.

### Surgery
- v1: `frontend/src/pages/Surgery.tsx` | v2: `frontend/src/modules/surgery/pages/Surgery.tsx` | confidence scan: med | SCAN_ONLY
  - [ ] Tab 'Phòng mổ' (OR status board: mã/tên/loại phòng, vị trí, trạng thái available/busy, số ca hôm nay) không có màn tương đương ở v2 — v1 Surgery.tsx:1154-1201 (roomColumns tại dòng 777, dữ liệu operatingRooms) vs v2 chỉ dùng operatingRoomName như 1 field hiển thị trong bảng ca mổ/modal lên lịch, không có view giám sát trạng thái phòng mổ độc lập.

### SystemAdmin
- v1: `frontend/src/pages/SystemAdmin.tsx` | v2: `frontend/src/modules/system/pages/SystemAdmin.tsx` | confidence scan: med | OVERTURNED
  - [~] Tab 'Tích hợp APP' — KHÔNG PORT (verify 2026-08-02: 100% mock trình diễn, nút không có onClick, không mất nghiệp vụ thật; theo triết lý chống over-build) — v1's IntegrationTab.tsx (pages/system-admin/IntegrationTab.tsx) tự comment 'pure mock data hardcoded, no state/API/timer'.
  - [x] Role permission assignment ('Phân quyền') — ĐÃ CÓ trong v2 (verified 2026-08-02: role modal có checkbox quyền theo module + rolePermIds + adminApi.updateRolePermissions khi lưu — SystemAdmin.tsx:271-272, 683-717).
  - [x] Delete user — ĐÃ CÓ trong v2 (verified 2026-08-02: deleteUser + confirm, ẩn với user admin — SystemAdmin.tsx:235-238, 504).
  - [x] Audit-log query capability — ĐÃ SỬA 2026-08-02 (filter module/action/entityType + RangePicker tùy ý + server pagination totalCount/Pager ĐÃ CÓ; bổ sung drawer chi tiết row-click: request method/path, IP, User-Agent, details, old→new values pretty-JSON) — v1 pages/system-admin/AuditTab.tsx:69-115, :187-198, :199-239.
  - [~] Tab 'Tích hợp APP' (integration) — KHÔNG PORT (mock 100%, xem dòng trên).

### TbHivManagement
- v1: `frontend/src/pages/TbHivManagement.tsx` | v2: `frontend/src/modules/public-health/pages/TbHivManagement.tsx` | confidence scan: high | OVERTURNED_R2
  - [x] Server-side search/filter — ĐÃ SỬA 2026-08-02 (keyword/recordType/treatmentCategory/fromDate/toDate đẩy server-side, useCallback + debounce 300ms; PHÁT HIỆN THÊM: toàn bộ contract FE↔BE lệch — BE dùng STRING enum "TB"/"HIV"/"TB_HIV", "OnTreatment"…, field treatmentRegimen/treatmentStartDate/smearResult, route follow-up /records/{id}/follow-ups, stats onTreatmentCount/tbHivCoinfectionCount — FE giả định numeric/tên khác → hiển thị chip loại, filter, create, follow-up, stats, print ĐỀU hỏng. Đã viết adapter 2 chiều trong api/tbHivManagement.ts (map string↔number, đúng route, tolerant cả 2 shape); drawer fetch detail để đủ khối XN; print card dựng client-side qua openPrintWindow vì BE không có endpoint print; v1 vá 3 điểm collateral: bad-status filter numeric, pageIndex 0-based, print chuyển hướng v2)
  - [x] Conditional TB/HIV blocks — ĐÃ SỬA 2026-08-02 (CrudModal thêm prop onValuesChange pass-through; recFields useMemo ghép khối Lao khi recordType 0/2, khối HIV khi 1/2)
  - [x] Validation range số — ĐÃ SỬA 2026-08-02 (rules Antd: CD4 0–3000, viralLoad ≥0, treatmentMonth 1–36, weight 0–300 — cả record modal lẫn follow-up modal)

### Telemedicine
- v1: `frontend/src/pages/Telemedicine.tsx` | v2: `frontend/src/pages-v2/Telemedicine.tsx` | confidence scan: high | SCAN_ONLY
  - [x] Kết thúc buổi khám v2 — ĐÃ SỬA 2026-08-02 (modal ghi chẩn đoán/ICD/kế hoạch → createConsultation+completeConsultation TRƯỚC rồi mới endSession) (onEndSession, pages-v2/Telemedicine.tsx:147-156) chỉ gọi endSession, KHÔNG gọi completeConsultation để lưu chẩn đoán/kế hoạch điều trị — v1 handleEndConsultation gọi completeConsultation({diagnosisMain, diagnosisMainIcd, treatmentPlan}) (Telemedicine.tsx v1:261-286). v2 tự đánh dấu TODO: 'Consultation flow (createConsultation/completeConsultation) skipped — requires active sessionId + encounter IDs... Implement in a dedicated consultation modal when session management is fully wired' (pages-v2/Telemedicine.tsx:731-734) — hồ sơ khám từ xa v2 hiện thiếu bước ghi chẩn đoán/kế hoạch điều trị khi hoàn tất ca khám.

### TraditionalMedicine
- v1: `frontend/src/pages/TraditionalMedicine.tsx` | v2: `frontend/src/modules/traditional-medicine/pages/TraditionalMedicine.tsx` | confidence scan: high | OVERTURNED
  - [ ] Complete-treatment action: v1 'Xong' button (frontend/src/pages/TraditionalMedicine.tsx:182-184; handleComplete :109-117) calls PUT /treatments/{id}/complete = the only path setting Status=1 + EndDate (backend TraditionalMedicineService.cs:397-417). v2 has no call to completeTreatment; its edit-modal status select is silently dropped server-side (CreateTraditionalMedicineTreatmentDto has no Status field, TraditionalMedicineDTOs.cs:39-51; UpdateTreatmentAsync never maps Status, TraditionalMedicineService.cs:153-178) — not 'one extra click', but zero working clicks.
  - [ ] Date-range filter: v1 RangePicker (frontend/src/pages/TraditionalMedicine.tsx:220-222) sends fromDate/toDate to the search API (:80-81), which the backend honors (TraditionalMedicineService.cs:42-45); v2 has no date filter at all (only keyword + treatment-type).
  - [ ] Minor: herbal-prescription durationUnit select ngày/tuần (v1 frontend/src/pages/TraditionalMedicine.tsx:295-296); v2 hardcodes durationUnit 'ngày' (modules/traditional-medicine/pages/TraditionalMedicine.tsx:182).

### TrainingResearch
- v1: `frontend/src/pages/TrainingResearch.tsx` | v2: `frontend/src/modules/training/pages/TrainingResearch.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Tab 'Dashboard' - v1 pages/TrainingResearch.tsx:551-556 (tabItems includes key 'dashboard') / :494-549 (renderDashboard) not present in v2 MAIN_TABS (modules/training/pages/TrainingResearch.tsx:102-107 only has classes/directions/research/certificates)
  - [ ] Pie chart 'Lớp theo loại đào tạo' (recharts PieChart) - v1 :517-529, no equivalent chart in v2
  - [ ] Progress-bar breakdown 'Đề tài NCKH theo trạng thái' - v1 :531-545, no equivalent in v2
  - [ ] KPI 'Đã công bố' (researchPublished) and 'Chỉ đạo tuyến' (clinicalDirections count) shown as Statistic cards - v1 :505-506, not in v2 KpiStrip (v2 :425-432 has only 6 of v1's 8 dashboard metrics)

### TraumaRegistry
- v1: `frontend/src/pages/TraumaRegistry.tsx` | v2: `frontend/src/modules/mci/pages/TraumaRegistry.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Date-range filter (RangePicker fromDate/toDate passed to traumaApi.searchCases) - v1 pages/TraumaRegistry.tsx:152-155, v2 modules/mci/pages/TraumaRegistry.tsx toolbar (:166-180) only has keyword SearchBox + triage Filter, no date range, and load() (:63-70) doesn't send date params to searchCases
  - [ ] Monthly/aggregate stats from traumaApi.getStats() - 'Ca trong tháng' (totalCasesThisMonth), 'Tỷ lệ tử vong' (mortalityRate), 'ISS trung bình' (avgIssScore), 'TB ngày nằm' (avgLengthOfStay) - v1 :159-162, v2 KpiStrip (:159-164) uses different client-computed ad-hoc counts instead (Tổng ca/Triage đỏ/Đang ICU/Cần PT), getStats API is never called in v2

### TreatmentProtocol
- v1: `frontend/src/pages/TreatmentProtocol.tsx` | v2: `frontend/src/modules/patient/pages/TreatmentProtocol.tsx` | confidence scan: high | SCAN_ONLY
  - [ ] Step editor (add/remove/edit 'các bước điều trị' with activityType-conditional fields: medicationName/Dose/Route/Frequency for Medication, serviceCode/Name for Lab/Imaging, plus durationDays/isOptional/conditions/expectedOutcome) - v1 pages/TreatmentProtocol.tsx:287-307 (addStep/updateStep/removeStep) and :797-939 (steps UI inside Modal). v2 modules/patient/pages/TreatmentProtocol.tsx PROTO_FIELDS (:12-26) and CrudModal usage (:221-233) have no field/UI to create or edit steps at all
  - [ ] Steps table shown in detail Drawer (columns: #/Tên bước/Loại/Thời gian/Thuốc-Dịch vụ/Tùy chọn) - v1 :419-474 (stepColumns) rendered at :714-721; v2 drawer (modules/patient/pages/TreatmentProtocol.tsx:192-219) only shows the numeric 'Số bước' (stepCount), no actual steps list/table

### ZaloNotifications
- v1: `frontend/src/pages/ZaloNotifications.tsx` | v2: `frontend/src/modules/system/pages/ZaloNotifications.tsx` | confidence scan: high | OVERTURNED_R2
  - [ ] Nut 'Tai lai' (manual refresh) cua tab Logs — v1 frontend/src/pages/ZaloNotifications.tsx:58; toolbar v2 (modules/system/pages/ZaloNotifications.tsx:98-107) khong co bat ky nut reload nao, danh sach chi load on-mount va sau khi gui thu. Log ZNS doi trang thai bat dong bo (Dang cho -> Da gui -> Da nhan) nen user v2 khong the cap nhat trang thai giao tin ma khong reload ca trang — day la action button user-facing bi mat, khong phai cosmetic.
  - [ ] Search + loc trang thai server-side — v1 frontend/src/pages/ZaloNotifications.tsx:38 gui keyword+status vao zalo.search (backend tim tren toan bo dataset, refetch khi doi filter l.41,54); v2 (modules/system/pages/ZaloNotifications.tsx:52,57-65) chi fetch 1 lan pageSize 200 roi loc client-side -> khong bao gio tim duoc log cu hon 200 ban ghi moi nhat. Regression pham vi du lieu tim kiem, khong phai layout.
  - [ ] Access Token mat password-masking — v1 frontend/src/pages/ZaloNotifications.tsx:162 dung Input.Password (che secret); v2 modules/system/pages/ZaloNotifications.tsx:230 dung input text thuong -> OA access token hien plain-text tren man hinh (security/field-type regression).

## C. KEEP_STANDALONE

- AppointmentBooking~BookingManagement: v1 AppointmentBooking is registered at the PUBLIC unauthenticated route '/dat-lich' (frontend/src/router/AppRoutes.tsx:173, sits outside <ProtectedRoute> alongside /queue-display and /shared/:token) — a patient self-service online-booking wizard (dept/doctor/date/timeslot picker, personal info, conf

## Cach dung ket qua
1. #204 Phase-2: chi go route v1 cua 35 trang bang A (theo lo nho + smoke tung lo).
2. 83 trang bang B: moi muc missing = 1 dau viec port HOAC user quyet "chap nhan bo" (ghi ro roi moi go).
3. Cac muc missing co tag patient-safety (BloodBank expired-bags, ClinicalCatalogs validation...) uu tien dong truoc.
