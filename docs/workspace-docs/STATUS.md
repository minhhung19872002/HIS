# STATUS — đang ở đâu · blocker · việc kế tiếp

> Cập nhật cuối: **2026-06-08** (sync origin +18 commit + slice BE-storage tường trình PTTT).

## ✅ PHIÊN 2026-06-08 — sync origin + tách cột tường trình PTTT (slice BE-storage)

- **Git sync:** local đã rebase lên `origin/main` (kéo về **18 commit** code của user: gap đối thủ, seed worker demo, wire 83 stub-button, fix UI v2…). 2 commit docs LOCAL-ONLY của phiên trước được giữ (`audit-g37` + `plan-pttt`); STATUS lấy bản origin. Tag an toàn `backup-local-docs-2026-06-08`.
- **▶ Tiếp tục plan `20-backlog/items/plan-pttt-narrative-columns.md`** — làm **nửa BE-storage additive** (verify được local, KHÔNG cần smoke):
  - Entity `SurgeryRequest` +3 cột `SurgeryReport`/`Conclusion`/`AttachedImageUrls`.
  - **Migration `78_surgery_narrative_columns.sql`** (ADD idempotent + backfill từ sentinel `Notes`) — áp local Docker 2 lần OK, 0 lỗi.
  - Service create parse sentinel → cột mới (`ApplyNarrativeFromNotes`), **giữ nguyên `Notes`** (không regression in).
  - Verify: `dotnet build` 0 err · migration idempotent · parse expr đúng.
  - **DEFER (cần phiên deploy + browser smoke):** FE flip `SurgeryReportModal` · print `PrintSurgeryReportAsync` render cột mới + fallback · expose `SurgeryDto` (29 điểm map). Chi tiết trong plan file.
- **✅ ĐÃ PUSH 2026-06-08:** code commit `aa18467` (entity+service+migration 78) + chore `b59d609` (Stop hook ép cập nhật STATUS) → `origin/main` (backend/** → GitHub Actions tự deploy Cloud Run; migration 78 auto-apply, verify `/health/schema-drift`=0 sau deploy). Docs commit `d42ea76` giữ local.
- **🔧 Cơ chế chống quên:** `notify-stop.sh` (Stop hook) nay CHẶN kết thúc lượt nếu code đổi mà STATUS chưa cập nhật trong ngày → buộc đồng bộ workspace-docs mỗi phiên.

## 🧭 TỒN ĐỌNG — phân loại theo blocker (cập nhật 2026-06-08)

> Mọi mục dưới đây **không làm trọn được từ máy local-only này** (thiếu: thông tin user / quyền prod-gcloud / browser-smoke). Liệt kê rõ "mở khoá bằng gì" để phiên/người sau xử lý ngay.

| # | Việc | Blocker | Mở khoá bằng |
|---|---|---|---|
| 1 | **HDDT (P5)** — nối NCC hoá đơn điện tử thật | ⛔ Chờ USER | User cấp NCC (VNPT/Viettel/MISA) + endpoint + credential qua ENV |
| 2 | Bật worker nhắc hẹn lấy mẫu trên prod | ⛔ Quyền prod | Set env `SampleAppointmentReminder__Enabled=true` trên Cloud Run (cần gcloud) |
| 3 | Rotate R2 API token (bảo mật) | ⛔ Quyền prod | Tạo token R2 mới + cập nhật env Cloud Run |
| 4 | ~~**PTTT** nửa hiển thị: FE flip + print render~~ | ✅ XONG 2026-06-08 | auto-smoke API PASS; còn visual layout check sau deploy (không chặn) |
| 5 | ~~**3 phiếu in gây mê** (theo dõi/hồi tỉnh/biên bản)~~ | ✅ XONG 2026-06-08 | FE print component + wire xong, tsc 0 err; visual browser smoke defer (cần seed data gây mê) |
| 6 | Chuẩn hoá storage `AdmissionDate/ReceiptDate` Now→UtcNow | 🟡 Logic-nhạy-cảm | Phiên có smoke biên đêm (fix luôn Playwright `13-opd-...` fail) — user lên lịch |
| 7 | Siết auth portal mobile (`patientId` FromQuery) · recurrence hẹn lấy mẫu · user-picker trình ký | 🟡 Feature + smoke | Lên lịch từng cái (đụng auth/luồng → cần kiểm thực tế) |

**Kết luận:** sau khi user duyệt làm tiếp với auto-smoke local, **#4 (PTTT) + #5 (3 phiếu gây mê) ĐÃ XONG 2026-06-08**. Tồn đọng còn lại (#1 HDDT, #2/#3 ops prod, #6/#7 logic-nhạy/feature) **đều cần user mở blocker** (info NCC / quyền gcloud / lên lịch smoke) — không làm trọn được từ máy local-only.

## ✅ PHIÊN 2026-06-08 (đợt 2) — hoàn tất PTTT hiển thị + 3 phiếu in gây mê (auto-smoke local)

- **PTTT nửa hiển thị (plan items/plan-pttt…):** BE `CreateSurgeryRequestDto` +3 field · service create ưu tiên field tường minh (fallback parse Notes) · `PrintSurgeryReportAsync` thêm section TƯỜNG TRÌNH + `ExtractNoteTag` fallback · FE `SurgeryReportModal` gửi field riêng + `surgery.ts` type. **Auto-smoke API (:5199) PASS** explicit + legacy; cột persist verify SQL. Read-DTO bỏ (print đọc entity).
- **3 phiếu in gây mê (audit-g37):** subagent thêm `frontend/src/components/AnesthesiaPrintTemplates.tsx` (3 component + 3 helper, presentational) · đăng ký `gayme-monitor/recovery/record` trong `PrintTemplateRenderer` · wire nút In trong `SurgeryFormModals` (AnesthesiaMonitorModal +2 nút khi có existingId; PostAnesthesiaPlanModal đổi handlePrint inline→template). Spot-check sạch (additive, no API trong component), **tsc 0 err**. Visual browser smoke defer.
- Build: BE 0 err · FE tsc 0 err · registry print 94→97.
- **CHƯA push (đợt này):** chờ commit. Backend test :5199 còn chạy (cần stop khi xong).
- **⚠️ ANOMALY KHÔNG PHẢI CỦA TÔI:** working tree có **~35 PDF `docs/TaiLieuChucNang/` bị xoá + xuất hiện `docs/requirements/TaiLieuChucNang/`** (MOVE ở filesystem, không qua git, không trong reflog/commit phiên này). Nghi user/tool khác di chuyển song song. **KHÔNG commit mớ này** (chỉ `git add` file cụ thể). Cần user xác nhận: giữ move (stage rename) hay hoàn tác.

## ✅ AUDIT-STUB-BUTTONS-FULL (audit-stub-buttons-full-2026-06-06.md) — XONG 2026-06-07 (CHƯA PUSH)

- Verify lại: 81/97 nút còn stub thật + 2 page v1 → **83 nút xử lý** (fan-out 1 BE + 9 FE agent, 3 wave, build-gate tập trung).
- **BE mới (build 0 err · migration 75/76 applied local)**: printDrugLabel · bhxhAudit 5 endpoint (mig 75) · copyRoster · bulkAllocate · satisfactionSurvey (mig 76) · healthExchange syncAll. Fix 2 class trùng interface (dead code) + đổi tên DTO trùng `CreateCampaignDto`→`CreateSurveyCampaignDto`.
- **FE**: wire ~72 nút (lab/mẫu/lâm sàng/viện phí/admin/HR/tài chính/public-health) — nối API có sẵn / xuất Excel-CSV (helper chung) / print blob / ẩn-navigate nút không nghiệp vụ. BillingEditor email+in HĐ+biên lai dùng hàm ĐÃ CÓ (audit đoán nhầm CẦN BE).
- **✅ 8 defer cần BE — ĐÃ LÀM NỐT 2026-06-07 tối** (4 agent vertical-slice, migration **77** MCI/Code Blue applied local, build 2 tầng 0 err, schema-drift 0): rehab print giấy GT · barcode lookup đơn thuốc · EMR `medicalRecordId` + OPD `examinationId` (DTO map) · CCHN print · Finance gửi báo cáo email (MockMode) · **Code Blue thật** (POST /api/mci/activate-code-blue, smoke OK) · BHXH export XML hàng loạt (zip). Fix tập trung: 2 class stub trùng interface + 1 Guid-null + 6 TS FE. Chi tiết cuối file audit.
- **Prompt 12 regression ĐÃ CHẠY 2026-06-07 tối**: build BE 0 err · FE EXIT 0 · BE startup OK · **schema-drift missingCount=0** · **Cypress 81/81** · **Playwright 587 pass / 1 fail / 9 skip** · API **test-doithu-gap 28/28** · suite 9/10.
  - **2 fail đều PRE-EXISTING (verify trên HEAD sạch — KHÔNG do phiên này)**:
    (1) Playwright `13-opd-service-selection-regression` — stash về HEAD vẫn fail → quirk dev-ban-đêm (`AdmissionDate/ReceiptDate=Now` vs query range UTC, BN tối rơi ngoài "hôm nay"); (2) suite "Real workflow" — `ExaminationCompleteService.StartExaminationAsync` "Examination not found" do test harness dùng `medicalRecordId` làm `examinationId`; diff phiên này KHÔNG chạm examination/reception BE.
- **CHƯA**: git commit/push (chờ lệnh "push").

## ✅ UI-ALL (audit-ui-print-stub-2026-06-06.md) — XONG 2026-06-07 (CHƯA PUSH)

- **Đợt 1 in lâm sàng**: drawer "In biểu mẫu HSBA" EmrEditor nối PrintTemplateRenderer THẬT (6 mẫu, preview+print) ·
  2 template mới `partograph`/`drug-reaction` · in đơn thuốc print-external blob · CSV thật Insurance/Consultation.
- **Đợt 2 nghiệp vụ**: cấp phát/tiêu hủy túi máu (BloodBankComplete, modal+lý do) · mở DICOM viewer thật theo UID ·
  drawer chi tiết thiết bị · HR duyệt/từ chối đổi ca + chốt lịch (publishRoster) + Excel CSV.
- **Đợt 3 row-detail**: OfficialDocuments (drawer xem/sửa + attachment) + HrDecisions (setEditing) hết HỎNG ·
  PayrollAdmin/VppStockCard onRowClick · CSV thật Telemedicine/FollowUp · FollowUp "Gọi BN"→"Ghi nhận liên lạc" thật ·
  Reports nối export pdf/excel ReportingController, nút chưa có BE → disable+tooltip · Dashboard bỏ PO-random
  (→/v2/procurement), Hoàn tất ca nối completeSurgery, Mở hồ sơ →/v2/ipd.
- **Đợt 4 dọn dẹp**: XÓA dead code SpecialtyMedicalRecordPrintTemplates/ (7 file) · util chung utils/csvExport.ts ·
  11 trang public-health hết toast giả (in thật từ drawer / row-action đổi Chi tiết) · EmergencyDisaster banner+nhãn
  "MÔ PHỎNG / DIỄN TẬP" + confirm.
- **Regression lần 3 SẠCH**: build 2 tầng 0 err · schema-drift 0 · gap 28/28 · suite 10/10 · Cypress 81/81 ·
  Playwright 588/9 skip/0 fail.
- **Defer trung thực còn treo** (ghi trong report agents): OPD in phiếu khám cần map examinationId · BHYT claim /
  RIS consultation print cần BE endpoint · BHYT-01 template riêng · HR swap-list còn mock + sao chép lịch tuần ·
  Đặt giường từ Dashboard · Code Blue chờ BE endpoint · print CSS @media cho drawer public-health.

## ✅ SỬA LỖI KIỂM ĐỊNH verify-doithu-2026-06-06.md — XONG 2026-06-07 (CHƯA PUSH)

- **P0/P1 6/6 fixed**: (1) bulk-download DICOM anonymize THẬT qua Orthanc anonymize→archive→DELETE; share
  HideDemographics chọn phương án trung thực (disable + 400 rõ, TODO anonymize-at-share); (2) HĐĐT Issue=Nháp
  Status 0 không mã giả, Export=phát hành thật (rà đủ caller, defer AutoIssue gateway); (3) nhập viện persist đủ
  khoa/cấp cứu/chẩn đoán (migration 72); (4) màu XN H đỏ/L xanh/HH-LL đậm + fix criticalLow→LL; (5) chặn in KQ
  chưa duyệt 2 lớp BE+FE; (6) hủy đặt khám quầy + guard check-in.
- **P2 11/12 fixed** (migration 73 chuyển viện + 74 CareLevel/cam kết): toa ngoài persist PaymentCategory ·
  verify-password BCrypt người duyệt tại giường · panel Tiện ích tách tủ trực (BE thêm filter WarehouseType) ·
  in nhiều tờ điều trị · nút In sau gây mê · TT32 cam kết (seed — component có sẵn) · CareLevel 1/2 · mobile
  chẩn đoán+mẫu · BC8 nhà thuốc · VPP recall→Nháp. DEFER: trình ký nhiều cấp (thiết kế 5 bước trong report agent).
- **Regression lần 2 SẠCH**: build 2 tầng 0 err · migration 72/73/74 sạch · schema-drift 0 ·
  test-doithu-gap 28/28 · suite 10/10 · Cypress 81/81 · Playwright 588/9 skip/0 fail.
- **Khi deploy nhớ**: bật worker `SampleAppointmentReminder__Enabled=true` (P2 ops) · test 1 study thật trên
  Orthanc prod verify anonymize parse đúng · dữ liệu HĐĐT cũ Status=1 mã giả cần quyết cách dọn (note agent V1.2).

## ✅ PROMPT 12 — REGRESSION TOÀN HỆ THỐNG 2026-06-07 (KẾT QUẢ CUỐI)

- Build gate: FE install+build EXIT 0 · BE 0 err · startup sạch · schema-drift 0.
- **Cypress 81/81** mọi route · **Playwright FULL 588 passed / 9 skipped / 0 failed** (4.3m).
- API: `test-doithu-gap.ps1` MỚI **28/28** (smoke+write+authz 401+privacy lookup) · test-ipd/test-reception sạch ·
  `test-regression-suite.ps1` **10/10** (kể cả Real workflow luồng lõi: đăng ký→khám→kê đơn→hóa đơn→thu tiền).
- **BUG THẬT bắt được + fix (CHƯA commit/push):**
  1. 🔴 Migration `70_prescription_payment_category.sql` — DB thiếu cột `PaymentCategory`+`DrugOrderType`
     (entity có, không kèm migration — class "13 cột" tái diễn) → 500 kê đơn/xem đơn/tạo hóa đơn. Đã apply local.
     ⚠️ `/health/schema-drift` KHÔNG bắt được (so list tĩnh, không so EF model) — cần nâng cấp checker (backlog).
  2. 🟡 2 Drawer `width=` deprecated trong pages-v2/Dashboard.tsx → `size="large"` (convention antd v6).
- **Fix hạ tầng test (CHƯA commit):** suite path `$repoRoot` 2 cấp + `test_real_workflow.js` về `scripts/misc-js/` ·
  `sqlcmd -I` ×4 script (filtered index) · unwrap envelope test-print-lis-signing · 8 spec Playwright stale
  envelope/selector (unwrap helper, agent fix 91 passed/8 skipped) · spec 10-ris-pacs 60/60 ·
  `design-diff/**` loại khỏi suite mặc định (workbench cần server :3003) · spec MỚI `doithu-gap-dot23.spec.ts` 9/9.
- Skip có chủ đích (9): ACRIN CT data-dependent · seed-demo-btn selector chưa có · menu v1 cần layoutMode ·
  5 clinical-safety data-dependent · mobile soft-skip. File này là cửa vào nhanh; chi tiết xem
> [`10-assessment/prompts-doithu-gap.md`](10-assessment/prompts-doithu-gap.md) (mục "Tình trạng triển khai") +
> handoff trong [`90-archive/handoffs/`](90-archive/handoffs/).

## Đang ở đâu

- **Gói bù gap đối thủ HOÀN TẤT 100%** ([`10-assessment/prompts-doithu-gap.md`](10-assessment/prompts-doithu-gap.md)):
  - Đợt 1 (P1–P5) ✅ · Đợt 2 (P6–P10) ✅ · Đợt 3 (P11) ✅ · **Wave defer (các prompt còn lại) ✅ 2026-06-07**.
  - Regression chốt: build 2 tầng 0 err · migration **61→68** apply sạch · schema-drift 0 · smoke endpoint mới 13/13
    · Cypress 81/81 (nhiều lần) · Playwright xanh (kể cả reception sau fix TZ).
- **Bug TZ — AUDIT TOÀN CỤC HOÀN TẤT 2026-06-07**: helper `HIS.Core.Common.VnTime`; 57 site `.Date ==` phân loại
  đầy đủ (bảng trong report agent); **fix 31 site tổng** (Tier-1 4 + loại A 15 + trọn cụm D QueueTickets 12 so sánh
  + 2 nơi ghi `IssueDate` Now→UtcNow). Verify repro bảng tiếp đón 0→4 rows lúc 1h sáng. Còn defer: 3 site DosingDate
  (semantics chưa rõ — UNKNOWN) + lưu ý AdmissionDate/ReceiptDate vẫn ghi `DateTime.Now` (đúng trên prod UTC,
  lệch nhẹ ban đêm trên dev — chuẩn hóa storage là việc riêng).
- **✅ ĐÃ COMMIT + PUSH + DEPLOY PROD 2026-06-07** (7 commit `45e5e33..fb9183e`, rebase lên 3 commit song song
  từ nguồn khác: G-37 phiếu in XN, G-07 toa về ItemPicker, fix money-bug đảo nhãn, fix mới script 45 Msg 1934).
  Conflict duy nhất (TreatmentMonitorSection): giữ cả modal G-07 remote (wire `dischargePrescription`) lẫn
  InpatientPrescriptionModal cho y lệnh thường quy. **Prod verify: schema-drift 0 (migration 61–68 tự apply),
  smoke 9/9 endpoint mới OK, public lookup anonymous trả thông điệp trung lập đúng.**
- E2E mới trong phiên: `frontend/e2e/doithu-gap-dot1.spec.ts` (+ sửa spec cũ `reception-drawer.spec.ts` selector `.hui-drawer`).

## Blocker / rủi ro đang treo

1. **HDDT (P5)**: khung config-driven xong — **chờ user cấp thông tin NCC** (VNPT/Viettel/MISA, endpoint, credential qua ENV).
2. ~~Attachment số hóa HSBA filesystem~~ → ✅ XÁC MINH STALE 2026-06-07 (`EmrAdminService` đã lưu DB blob `FileContent`, migration 47).
3. Tường trình PTTT pack sentinel vào `SurgeryRequest.Notes` (tạm).
4. Portal mobile `patientId` FromQuery — siết auth khi BN tự đăng nhập.
5. ~~G-07 toa được phát: medicine picker~~ → ✅ ĐÃ XONG (commit `88d115d` từ nguồn song song — ItemPicker + lưu thật).
6. Rotate R2 API token (TODO bảo mật cũ).
7. ~~Defer nhỏ~~ → ✅ ĐÃ XONG + DEPLOY 2026-06-07 (commit `196f116`, revision `his-api-00058-t9f`): batch-check PTTT ·
   prefill narrativeBody · SignerRole DTO (form standalone bị GỠ — fake documentId, caller module thật sẽ truyền) ·
   DefaultKtv → cột `CollectorId` LabOrders · worker nhắc hẹn (migration 69, **mặc định TẮT** — bật:
   env `SampleAppointmentReminder__Enabled=true` trên Cloud Run) · 3 site DosingDate (audit TZ → 100%).

## Việc kế tiếp

1. **HDDT**: chờ user cấp thông tin NCC (VNPT/Viettel/MISA + endpoint + credential qua ENV) — duy nhất còn chặn.
2. Tùy chọn vận hành: bật worker nhắc hẹn trên prod (env trên) · rotate R2 token.
3. Smoke UI thủ công các trang mới/đổi + viết thêm E2E cho Đợt 2/3 + wave.
4. **Tường trình PTTT** — BE-storage XONG (migration 78, 2026-06-08); **còn nửa hiển thị: FE flip + print render + read-DTO** → phiên có deploy + browser smoke (xem `20-backlog/items/plan-pttt-narrative-columns.md`). Cùng phiên có thể làm nốt **3 phiếu in gây mê** (audit-g37, cũng cần smoke).
5. Việc nền dài hạn: chuẩn hóa storage `AdmissionDate/ReceiptDate` Now→UtcNow (hiện đúng prod, lệch nhẹ dev ban đêm) ·
   siết auth portal · recurrence generation cho hẹn lấy mẫu · user picker cho trình ký.
