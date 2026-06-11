# STATUS — đang ở đâu · blocker · việc kế tiếp

> Cập nhật cuối: **2026-06-12** (đối chiếu git origin + push docling docs). Phần dưới (≤2026-06-08) là LỊCH SỬ.

## ⚠️ 2026-06-12 — ĐỐI CHIẾU GIT ORIGIN (nguồn-sự-thật xuyên máy) + push docling docs

> **Bài học**: workspace-docs **không push** → 2 máy phân kỳ âm thầm. **Trước khi pick việc PHẢI**
> `git fetch` + đọc `git log origin/main` (KHÔNG tin docs local). Phiên này tôi đã lỡ làm B2 trùng vì bỏ bước đó.

- **Máy khác đã push (origin, chuỗi R-series + dot):** `b9dbe17 R2 portal self-login` (đóng IDOR, role `PortalPatient`,
  claim-scoped, fix register-500 + plaintext pw + link-no-verify) · `51318ab R3 multi-facility Tier1` (Users.BranchId,
  JWT claim, write-path stamp, mig 89) · `50834dd R4 NFR` (backup/DR + load-test plan) · `56f4772` **unify lab models +
  gỡ model 2/3** (đóng #14e, mig 91/92) · `c3a0da6` seed LisTestParameters · `64f6cca` infusion persist (mig 94) ·
  `ae8d5a8` telemedicine e-prescription FE↔pharmacy · `b92ae18` TT46 EMR immutability/versioning (mig 95).
- **B2 tôi làm phiên này = TRÙNG R2 → ĐÃ BỎ** (xóa 2 file untracked; tracked changes giữ ở `git stash` "B2-local-wip"
  làm backup, có thể `git stash drop` khi chắc). R2 đầy đủ hơn (403 mismatch + ownership check + e2e/smoke).
- **Push phiên này**: `cc087ca docs(requirements)` — 156 .md docling + `scripts/docling_convert.py` + gitignore artifacts
  (workspace-docs giữ LOCAL như thường lệ). Migration mới nhất origin: **95**.

### Còn tồn (chức năng mới — đã trừ trùng R-series)
- #16 hội chẩn/nutrition/ADR persist · R-series tiếp (nếu máy kia chưa làm — **fetch trước**) · đa cơ sở R3 mở rộng Tier2+.

## (LỊCH SỬ ≤2026-06-08) ────────────────────────────────────────

## ✅ PHIÊN 2026-06-08 (chiều→tối) — FLOW-4 + bảo mật + F1 (đã PUSH phần code, F1 CHƯA commit)

Nguồn: `10-assessment/{audit-luong-nghiepvu, fix-rowclick-detail, FLOW-FINAL-all-remaining, FLOW4-A}.md`. Chi tiết roadmap: `20-backlog/tech-debt-roadmap.md`.

- **FLOW-3 #14a–e + #15/#16/#17 ✅ ĐÃ PUSH** (cancel-chain→model 1, bridge CĐHA model1→4 mig 80, auto-summary BA, CheckTransferWarnings, auto-billing mig 79). #14e gỡ bảng = DEFER (destructive).
- **FLOW-4 (#14b reader + analyzer) ✅ ĐÃ PUSH**: portal/report đọc KQ XN model 1; **analyzer HL7 + KTV LIS dual-write → ServiceRequestDetail** (KQ máy/tay/màn khám cùng 1 nguồn). KQ cấu trúc per-parameter = feature roadmap.
- **FLOW-FINAL bảo mật P0 ✅ ĐÃ PUSH**: **B1** chặn CCHN hết hạn khi bắt đầu khám · **B3** RBAC ký số (loại lễ tân/kế toán) · **B2** siết role `/api/portal/*` (mitigation; portal self-login = FEATURE roadmap). **B3-global fallback** = DEFER (cần audit public endpoint).
- **P1/P2 bounded ✅ ĐÃ PUSH**: F2 (DietTypes đọc DB, hết bug GUID) · F5 (booking check-in→sinh lượt khám) · F1-diag · F10 (responseRate thật).
- **F1-full PTTT vào viện phí ✅ XONG (CHƯA COMMIT — working tree dirty)**: bảng `SurgeryMedicineItems`+`SurgerySupplyItems` (**mig 82**) + service persist + giá + **trừ kho FEFO** + gộp viện phí. Build 0 err · schema-drift 0 · suite Surgery/IPD PASS · doithu 28/28.
- **⚠️ docs-leak**: 2 commit workspace-docs (`d19cde4`,`d02156a`) đã LỠ lên remote main (qua reorg) — chỉ tài liệu, vô hại. Chọn A (để nguyên, không force-push vì nhánh song song active).
- **Real workflow test fail = flaky pre-existing** (`StartExamination "Examination not found"`, timing/data — KHÔNG do thay đổi phiên này; verify git diff 0 file examination; Print/LIS/Signing + Surgery + IPD đều PASS).

### 🔜 MAI LÀM TIẾP (FLOW-FINAL feature-sized còn lại — mỗi cái 1 chunk)
- **F1**: commit + push (đang dirty) + tinh chỉnh (tách BHYT per-item, restore kho khi xoá, bỏ nuốt lỗi schema Start/CompleteSurgery).
- **F3** cấp cứu persist (ReceptionComplete+ObservationStay, FE+BE) · **F4** BHYT đối soát · **F6** YHCT→phí+trừ kho dược liệu · **F7** Rehab buổi→phí · **F8** tele tạo Rx thật sang quầy · **F9** quality/infection/portal persist.
- **B3-global** RequireAuthenticatedUser (sau khi audit [AllowAnonymous] public endpoint) · **#14e** gỡ bảng model 2/3 (destructive, chờ duyệt).

## ✅ AUDIT LUỒNG NGHIỆP VỤ — FLOW-1 (P0) + FLOW-2 (P1) + FLOW-3 (#17 + plan) — XONG 2026-06-08 (COMMIT LOCAL, CHƯA PUSH)

## ✅ AUDIT LUỒNG NGHIỆP VỤ — FLOW-1 (P0) + FLOW-2 (P1) + FLOW-3 (#17 + plan) — XONG 2026-06-08 (COMMIT LOCAL, CHƯA PUSH)

Nguồn: [`10-assessment/audit-luong-nghiepvu-2026-06-06.md`](10-assessment/audit-luong-nghiepvu-2026-06-06.md). Sửa **đứt mạch dữ liệu nghiệp vụ** (nặng hơn lỗi UI).

- **FLOW-1 P0 (6/6)**: (1) KQ XN/CĐHA về màn khám — `GetPatientLabResultsAsync` đọc `ServiceRequestDetail` (model 1) thay `LabResults` (model 2 rỗng) · (2) CLS tại giường nội trú persist `ServiceRequest`+`Detail` (trước in-memory) · (3) sinh hiệu nội trú lưu DB — bảng `InpatientVitalSigns` (**mig 78**) · (4) worklist "chờ nhập viện" OPD→nội trú (BE endpoint + FE Admit modal) · (5) bảng kê gom nợ thuốc + chặn ra viện + bỏ `catch{}` · (6) phát thuốc trừ kho FEFO (nhánh chuẩn + bán lẻ transaction).
- **FLOW-2 P1 (6/7)**: (#9) OPD tạo `ServiceRequestDetail` · (#7) phiên khám "Chờ CLS"=2 · (#8 một phần) mark-performed cập nhật SRD.Status · (#11) Admission.Status 5="Đã chuyển khoa" + tên 4/5/6 · (#12) FEFO gộp nhiều lô + throw khi thiếu · (#13) nút Hủy phát đúng route. **#10 DEFER → #14** (LabRequestItem không có link tới SRD — cần model unification).
- **FLOW-3 P2 (phần lớn XONG)**: **#17** auto-billing (mig 79) · **#14a** cancel-chain→model 1 (đóng #10) · **#14b**
  pending XN→model 1 (phần lâm sàng; còn ~9 reader báo cáo/FHIR) · **#14c** model 3 LabOrder = legacy · **#14d**
  bridge CĐHA model1→model4 (mig 80, đóng #8) · **#15** auto-summary BA nội trú · **#16** CheckTransferWarnings thật
  (còn stub feature nutrition/hội chẩn/truyền dịch/ADR). **CÒN**: #14b-remaining (grind báo cáo) · **#14e gỡ bảng
  model 2/3 (DESTRUCTIVE — chờ duyệt)** · stub feature #16. Chi tiết [`20-backlog/tech-debt-roadmap.md`](20-backlog/tech-debt-roadmap.md).
- **Bug bắt khi regression + fix**: `ServiceRequest.Status` header hủy=**4** (không phải 3=Có KQ) — xem memory `servicerequest-status-enum-gotcha`. `CompleteDispensing` trả **400** rõ ràng khi thiếu kho. Test `test_real_workflow.js` cập nhật: settle order trước xuất viện + coi "thiếu tồn kho" là hợp lệ.
- **Regression SẠCH** (chạy lại sau MỖI thay đổi): BE/FE build 0 err · schema-drift 0 (mig 78+79) · API suite **10/10** · doithu-gap **28/28** · Cypress **81/81** · Playwright **588/9skip/0fail**.
- **TIẾP THEO**: FLOW-3 #14 (hợp nhất 4 model CLS) theo plan — P0 khảo sát → P1 thêm link migration additive (đang làm).

## ✅ DAILY SEED WORKER + FIX ROW-CLICK — XONG + ĐÃ PUSH + DEPLOY 2026-06-08

## ✅ DAILY SEED WORKER + FIX ROW-CLICK — XONG + ĐÃ PUSH + DEPLOY 2026-06-08

**Bối cảnh**: user báo Tiếp Đón (và các phân hệ khác) không có data. Gốc rễ: logic seed đã có sẵn
(`DailySeedController` + `PopulateDataController`) nhưng **không có gì tự kích hoạt** → DB rỗng.

- **Job seed hằng ngày (BE)**: thêm `HIS.API/Workers/DailyDemoSeedWorker.cs` (BackgroundService) chạy ~30s
  sau khởi động + mỗi 24h, **reuse 100%** logic: gọi `DailySeedController.RunDailySeedAsync` (tách core khỏi
  HttpContext/key) → `PopulateDataController.PopulateAll`. Idempotent (mã `*SEED*`/bảng rỗng). Đăng ký
  `AddHostedService` trong `Program.cs` (đặt ở tầng API vì Infra không reference được API). Config
  `DailyDemoSeed` (appsettings) mặc định **TẮT**; bật prod bằng env `DailyDemoSeed__Enabled=true`.
- **Fix row-click (FE)**: `pages-v2/EmergencyDisaster.tsx` + `InspectorPortal.tsx` — bảng tự dựng còn sót,
  thêm `onClick` cấp dòng gọi hàm detail sẵn có (openCase/openDetail) + `cursor:pointer` + `e.stopPropagation()`
  cho nút con. Quét toàn bộ pages-v2 (41 dòng `<tr key=` + Explore) xác nhận **không còn trường hợp khác**
  (theo `10-assessment/fix-rowclick-detail-2026-06-06.md`).
- **Regression SẠCH**: BE/FE build 0 err · startup + schema-drift **missingCount=0** · API regression-suite
  **10/10** · doithu-gap **28/28** · Cypress console-errors **81/81** · Playwright **588 pass / 9 skip / 0 fail**.
- **ĐÃ PUSH** `main` (`32f9287..2897ccd`, 2 commit code: `34440a6` seed worker, `2897ccd` fix row-click;
  file `fix-rowclick-detail-*.md` giữ local-only). BE auto-deploy Cloud Run (run 27113544814 success),
  FE Vercel auto-deploy.
- **BẬT WORKER PROD**: `gcloud run services update his-api --update-env-vars=DailyDemoSeed__Enabled=true`
  → revision `his-api-00063-r8l`. **Verify thật**: log prod `Daily seed: 30 patients + 30 records + 30 exams
  + 10 tele + 10 rx + 10 lab + 5 incidents + 5 rehab + 6 signing + 4 proc + 8 archive...`;
  `/reception/admissions/today` trả **30** BN. Từ giờ prod tự bơm data mỗi 24h.

## ✅ AUDIT-STUB-BUTTONS-FULL (audit-stub-buttons-full-2026-06-06.md) — XONG 2026-06-07 (CHƯA PUSH)

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
4. Việc nền dài hạn: chuẩn hóa storage `AdmissionDate/ReceiptDate` Now→UtcNow (hiện đúng prod, lệch nhẹ dev ban đêm) ·
   bỏ sentinel Notes PTTT · siết auth portal · recurrence generation cho hẹn lấy mẫu · user picker cho trình ký.
