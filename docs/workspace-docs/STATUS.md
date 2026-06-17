# STATUS — đang ở đâu · blocker · việc kế tiếp

> 🔗 **TASK/PLAN quản lý trên GitHub Issues** (repo `minhhung19872002/HIS`): `gh issue list`.
> File này CHỈ giữ **session-state** cho hook — KHÔNG ghi backlog/plan/lịch sử dài vào đây.

> Cập nhật cuối: **2026-06-17** (TECH-DEBT 36 Issue #180-215 + SAFETY-PROTOCOL · **TEST-PLAN XONG** khung 10-lớp + 56 issue #216-271 (16 layer-epic + 40 module-task phủ đủ 10 group/126 màn); doc `test-plan-2026-06-17.md` · **RULE cross-machine: fix-trước-test-sau** (CLAUDE.md)).

## Test program (PLAN XONG — chạy CUỐI CÙNG, sau khi 100% fix/tech-debt DONE)
- **★ RULE CỨNG (CLAUDE.md + hook session-start/remind-pipeline, mọi máy): TEST là BẮT BUỘC nhưng LUÔN LÀM CUỐI CÙNG.**
  Xong HẾT fix/feature/tech-debt rồi mới test. **KHÔNG ngoại lệ — kể cả harness #191/#212/#213** (đã REVERT lần làm sớm, reopen #191).
- Khung: `docs/workspace-docs/10-assessment/test-plan-2026-06-17.md` (10 lớp + checklist 12 loại màn + thứ tự Permission→Workflow→State→API-error→Form→Responsive→Dark→Performance).
- **56 test issue #216-271** (label `test`): **16 layer-epic #216-231** (T1-T16) + **40 module-task #232-271**
  phủ ĐỦ 10 module-group (126 màn v2): Tài chính #232-238 · Lâm sàng #239-245 · Cận-lâm-sàng #246-250 · Dược
  #251-255 · Tổng quan #256-257 · Hồ sơ&Ký số #258-259 · Quản trị #260-264 · Liên thông #265-266 · YTCC
  #267-269 · Cổng #270-271. Mỗi task: màn thật + checklist + tooling + acceptance + parent-epic + priority.
- **18 epic nâng cao #272-289** (T17-T34): visual-regression·a11y·contract·property-based·mutation·golden-file·chaos·
  security-scan·load-soak/spike·reconciliation·audit-verify·backup-DR·synthetic-monitor·test-data·risk-based·i18n·exploratory·usability.
- **★ RULE (CLAUDE.md, mọi máy): TEST gặp bug → tạo NGAY task `fix` (rõ lỗi gì + màn/nghiệp vụ + evidence) liên kết 2
  chiều với task test; task test CHỈ DONE sau khi fix-task tạo XONG đầy đủ** (test-plan §9). UI test phải chụp evidence (§7).
- Test chạy **CUỐI CÙNG** (chỉ sau khi 100% fix DONE) — khi đó mới dựng harness #191/#212/#213 rồi P0 module-task (#232/#239/#251/#258/#260/#265/#270).

## ★ THỰC THI TECH-DEBT FE (fix-first, đang chạy 2026-06-17)
- **#208 ĐANG LÀM (làm tới hết mới đóng — KHÔNG tách):** ✅ **var-fallback pages-v2 = 0** (slice1 map 60 hex==light-value
  + slice2 define 12 legacy-token light+dark, gỡ nốt fallback). Light byte-identical, dark flip thêm; build EXIT 0.
  ✅ **hex==token map**: subagent map 3 hex an toàn; phần lớn residual GIỮ đúng (standalone-portal terminal.css-không-load,
  #fff-text, ${c}33-alpha, chart/brand off-palette). ✅ **fontSize**: 976 literal (10/11/12/13/15/20)→`--fs-*` / 158 file
  (theme-independent, no-op thị giác), build EXIT 0.
  ✅ borderRadius→`--r-*` (156) · spacing→`--space-*` (1278) + define scale `--space/--z` · width giữ literal (không phải scale).
  **#208 = CLOSED (pushed `007d40d`)** — token-scale XONG hết, light byte-identical, build EXIT 0. Phần "ab-u-* phổ biến hơn"
  (migrate inline→utility) đã chuyển ĐỦ info sang **#170** (comment) trước khi đóng (rule scope-overlap).
- **Rule mới (CLAUDE.md, cross-machine):** ① task dài/nhiều-phần → làm xong HẾT mới push+close (commit local checkpoint, không
  push partial) · ② scope chồng-lấn → chuyển đủ info sang task nhận trước rồi mới đóng (làm cái nào ra cái đó rõ ràng) · ③ task
  đang làm → gắn label `in-progress`+assign.
- ✅ **#207 CLOSED** (async-state): fix 14 swallowed `.catch(()=>{})`→log (0 empty còn, build EXIT 0). Phần "list spinner+empty+error+retry"
  (101 file raw 'Đang tải') = cơ chế #206 (SimpleV2Page 3-state) → bàn giao ĐỦ info sang #206 trước khi đóng (rule scope-overlap).
- **Kế tiếp FE tech-debt:** **#209** raw-fetch→apiClient · #206 design-adoption (gánh luôn error-state #207) · #170 ab-u · #205 god-split · #204 v1-sunset.
- Kế tiếp FE sau #208: #207 async-state(.catch) · #209 raw-fetch→apiClient · #206 design-adoption · #205 god-split · #204 v1-sunset.

## Đang ở đâu
- **★ TECH-DEBT TOÀN HỆ THỐNG — PLAN + 36 TASK chi tiết, CHƯA fix (2026-06-17):** audit 7-agent (BE-service/API/data ·
  FE-v1/v2 · cross-cutting · test+security+patient-safety). Báo cáo + **SAFETY-PROTOCOL §0** (10 luật chống-vỡ-hệ-thống):
  `docs/workspace-docs/10-assessment/tech-debt-audit-2026-06-17.md`. Mỗi Issue có evidence file:line + pre-flight +
  behavior-preservation + verify + rollback.
  - **P0 (làm trước)**: SEC #180-184 (secret hardcode/anonymous-seed-prod/path-traversal/role-drift/mass-assign) ·
    SAFE #185-186 (allergy+interaction KHÔNG enforce lúc kê) · DATA #187-190 (transaction/RowVersion/amount<=0/nuốt-exception).
    (#191 test-harness KHÔNG thuộc P0 fix — là TEST, làm CUỐI CÙNG; đã revert+reopen.)
  - **P1 #192-199** (validation/envelope/leak-catch/AsNoTracking+N+1/unbounded/DbContext-harden/audit-diff/migration).
  - **P2 #200-209** (shared-infra/BE god-split/thin-controller/DTO-hygiene · FE v1-sunset/god-component/design-adoption/
    async-state/token-scale/raw-fetch). **P3 #210-215** (lint/hygiene/vitest/e2e-functional/dose-range/antd-leftover).
  - Còn **#171** (tách FE api client god-file) — giữ, chưa gộp.
  - Thứ tự: P0-security → P0-safety → P0-data → P1 → P2 → P3 → **(CUỐI CÙNG, sau khi 100% fix DONE) toàn bộ TEST** #191/#212/#213 + #216-289.
- **UX/UI audit #158-#165: DONE** (dark token foundation + ab-* + toggle v2 topbar + tokenize + lint-guard +
  states + dual-system inventory + soft-severity). Prod Vercel vẫn block billing (account khác) — local OK.
  ⚠️ visual smoke dark cần chạy app. **#158/#159 + toggle v2 + #160 ĐÃ push** (prod Vercel đang block
  billing — xem [[reference_vercel-his-psi-other-account]]; user verify LOCAL OK A/B/C).
  - **#160 DONE (safe subset):** 4 subagent map **124 hex→token / 30 file pages-v2** + `_v2kit` footer, **chỉ thay khi
    hex === token light-value** ⇒ light byte-identical, dark mới flip; 2 luật role (`#fff` text giữ trắng, `#0f172a`
    bg giữ tối). Build EXIT 0 (tsc+vite). **Residual ~270 hex off-palette** (chart series, bootstrap-alert,
    `#15803d`/`#fecaca`/`#475569`… không có token tương đương — remap sẽ đổi light) → **follow-up #165** (palette
    consolidation). Toggle dark/light nay ở topbar v2 (icon moon/sun, cạnh chip CA).
  - CÒN audit: #161 lint-guard · #162 inline-style · #163 dual-system v1/v2 · #164 states.
  lên `AssetProcurementController.Approve/Reject` (siết quyền duyệt mua sắm; xoá TODO). ② **Infectious-report hết stub** —
  `ProvincialHealthService.GetInfectiousDiseaseReportsAsync` = aggregate THẬT (Examination MainIcdCode ∈ ICD IsNotifiable →
  join Patient) + `SubmitInfectiousReportAsync` persist qua entity `InfectiousReportSubmission` + DbSet + **migration 132**.
  ⚠️ migration chưa runtime-test (DB off). Còn 3 finding Thấp (#156): DatabaseSizeMB hardcode · HospitalReport accounting
  placeholder · NationalPrescription mock-connection — defer (cosmetic/MockMode chủ ý).
- **★ BOARD DỌN SẠCH = 0 ISSUE OPEN (2026-06-16, user "hoàn thành hết open + hardware→not-open").** Turn này đóng/dọn:
  **DONE thật**: #156 #157 (fixed+push+verify schema-drift 132=0) · #48 #43 (audit/plan). **DEFERRED (đóng not-planned + comment
  điều kiện REOPEN, KHÔNG vờ done):** hardware #113/#133/#134/#22 (chờ thiết bị) · credential #24/#25 (chờ user) · need-input
  #91/#105 (chờ user cấp danh sách mẫu/schema) · tech-debt #17/#42/#44 (chờ phiên deploy+smoke — không runtime-smoke local).
  **8 EPIC** #33/#34/#35/#36/#38/#78/#79/#82 đóng (hết con open). → **Tất cả deferred reopen được khi gỡ blocker.**
  ⚠️ #134 ghi chú: NonDicom infra (study/image/controller) ĐÃ CÓ; gap = LIS DTO thiếu `ServiceRequestDetailId` → wire = M
  BE-bridge+FE khi cần (decouple #133 bằng upload thủ công).
- **EXEC "làm tuần tự 1-2-3" (2026-06-16):** ① **CLOSED #48** (audit done) + **#43 not-planned** (6 báo cáo độc lập).
  ② QA tiền-nhạy-cảm → **bug #157**: `ReassignObjectService` đổi→BHYT default rate **80%** có thể sai mức hưởng thực
  (95/100%) → split BHYT/BN sai; kiosk anonymous OK (mutate đã auth) chỉ thiếu rate-limit. ③ **#44 đánh giá: tiền-đề SAI**
  (`Lis/RisCatalogService` KHÔNG tồn tại; dup thật trong `MasterCatalogService` 700d) → generic-extract rủi-ro-prod
  không-smoke-được → **DEFER/re-scope** (plan đã cập nhật). KHÔNG blind-refactor.
- **(b) PUSH `a3dd27a`** (#156-fix + docs) → deploy backend in_progress (migration 132). **(a) FIX bug #157** (BE 0err, chưa push):
  `ReassignObjectService` dùng `MedicalRecord.InsuranceCoverageRate` (mức hưởng THỰC 80/95/100) thay default-80 cứng —
  ưu tiên rate-dòng > rate-hồ-sơ > 80 (fallback cuối). → chờ push + verify schema-drift 132 sau deploy + close #156/#157.
- **#48 audit advanced-services (static, claim @me)** — backlog feature-mới đã CẠN (8 OPEN còn lại = blocked HW/cred
  #113/#24 · defer-cần-input #91/#105 · tech-debt-refactor-rủi-ro #42/#43/#44 cần user duyệt · audit #48). Làm #48
  static stub-audit: **5/6 service advanced persist THẬT** (SaveChanges+EF), nghi-ngờ issue đã lỗi thời. **Stub ẩn xác nhận:**
  `ProvincialHealthService.GetInfectiousDiseaseReportsAsync`/`SubmitInfectiousReportAsync` (placeholder, chưa bảng/migration).
  Báo cáo: `docs/workspace-docs/10-assessment/audit-advanced-services-48.md`. Runtime PowerShell-test defer (DB off).
- **User duyệt "làm tuần tự 1→3" (2026-06-16):** ① audit + **tạo bug #156** (gộp 5 finding: ProvincialHealth infectious-stub +
  **ProcurementService.ApproveRequestAsync thiếu role-check #108** + 3 placeholder). ② **verify prod: schema-drift `missingCount=0`**
  (migration 113–131 apply sạch, deploy wave3/4/5 success). ③ **plan #42/#43/#44**: `docs/workspace-docs/20-backlog/items/plan-42-43-44-controller-consolidation.md`
  — #42 chỉ gộp Enhancement→Pharmacy (sau #17) · **#43 KHÔNG gộp** (6 domain báo cáo độc lập, tiền-đề sai → đề xuất close) ·
  #44 DRY base service giữ controller riêng. **Chưa thực thi refactor** (rủi-ro-prod, cần phiên deploy+smoke + user duyệt từng nhóm).
  Tất cả doc/STATUS + bug #156 đã tạo; audit doc/plan **chưa commit** (chờ lệnh).
- **CHIẾN DỊCH "làm hết" (2026-06-16) — KẾT QUẢ: backlog 89→21 OPEN (đóng 68 issue).** 5 wave fan-out feature
  (W1 ADR/bảo lãnh/HR · W2 CLS-catalog/chỉ-đạo-tuyến/backup/nhắc-lịch/CV365 · W3 RIS co-reader/Cobb-CTR/batch/multi-HIS ·
  W4 kiosk/import/asset/triage/split · W5 đổi-đối-tượng/ký-số/RBAC/mobile/LIS-fields) + #148 chạy thận + #154 sổ sản.
  Migration 115-131 (idempotent, schema-drift=0 verify từng wave). Doc #112 ma trận controller. **CÒN 21 OPEN, KHÔNG
  auto-làm — lý do rõ:** (a) BLOCKED phần cứng: #22 #113 #133 #134; (b) BLOCKED credential: #24 (HDDT NCC) #25 (R2 token);
  (c) TECH-DEBT refactor rủi-ro-prod (cần user duyệt explicit, "không vỡ cái đang chạy"): #17 #35 #42 #43 #44;
  (d) DEFER lớn: #91 (~140 mẫu BC, cần danh sách gói thầu) #105 (tool migration HIS cũ, cần schema nguồn) #48 (audit
  cột CreatedBy đa-module — additive được, chưa làm); (e) EPIC còn con blocked/defer: #33 #34 #36 #38 #78 #79 #82.
- **CHIẾN DỊCH cũ "làm hết issue actionable" (fan-out)**: fan-out
  agent build module mới (mỗi agent chỉ tạo file mới + migration pre-assign, KHÔNG build/KHÔNG sửa 4 file shared,
  trả snippet → main áp tập trung + build gate). Triage 4 Explore agent: đóng 5 DONE-duplicate (#114 #119 #120
  #146 #93). BLOCKED (cần HW/credential): #133 #134 #113 #22 #24 #25. Defer tech-debt: #17 #42 #43 #44 #45 #35.
  WON'T-DO multi-branch: #107 #131 #132.
- **WAVE 5 (build-green BE + FE EXIT0, chờ push)** — nhạy cảm tiền/pháp lý + bảo mật: **Đổi đối tượng
  #104/#126/#127/#137** (reuse ReassignObjectService — KHÔNG đổi công thức tiền; +PayerChangeLog audit migration
  **130** + endpoint record/line-level + FE drawer/nút; ⚠️ chưa wire vào page billing cụ thể) · **Ký số
  #83/#84/#111** (PDF gộp HSBA ký invisible iText7 PdfMerger; ký per-y-lệnh + lịch sử/hủy ký reuse DocumentSignatures;
  docx/xlsx/txt = hash-envelope PKCS#7 detached — native OOXML defer; FE SignatureHistoryDrawer chưa mount) ·
  **RBAC #49** (khôi phục 72 role-guard RISCompleteController bị comment; secret scan = chỉ dev-cred appsettings,
  prod dùng env) · **Mobile #20** (DoctorPortalMobile +màn xem HSBA read-only +in PDF) · **LIS catalog #23**
  (LisTestParameter +SampleTypeId/PrintUnit/Description +migration **131**). ⚠️ #48 audit GIỮ OPEN (entity
  Community/Public/Forensic Health thiếu cột CreatedBy — cần migration riêng, defer). migration 130/131 verify drift sau deploy.
- **WAVE 4 (build-green BE + FE EXIT0, chờ push)** — 5 cluster: **Kiosk #103/#123-125** (KioskTicket + service
  cấp số/checkin CCCD-BHYT + migration **126** + page kiosk; 3 endpoint AllowAnonymous giới hạn) · **Import Excel
  #96/#97/#121/#122** (CSV — chưa có lib Excel: import tương tác thuốc + giám định BHXH BhxhAuditImport migration
  **129**) · **Mua sắm tài sản #108** (AssetProcurementRequest+Item workflow duyệt + migration **128** + FE; controller
  đổi tên AssetProcurementController tránh trùng) · **Triage #39/#61/#63** (endpoint PUT observation/{id}/triage đổi
  mức + test-triage.ps1; infra TriageLevel đã có) · **Tách bệnh án #99** (SplitPatientAsync transaction+audit, reassign
  hồ sơ sang BN đích, không xóa data + endpoint + client). ⚠️ migration 126/128/129 verify schema-drift sau deploy.
- **WAVE 3 (build-green BE + FE EXIT0, chờ push)** — 4 cluster RIS/PACS/connector: **RIS đồng đọc #139**
  (RadiologyReportCoReader + 6 endpoint co-reader/copy/merge + migration **124** + FE section) · **Cobb/CTR #143**
  (CornerstoneViewer thêm CobbAngleTool + panel CTR, FE-only) · **RIS batch #144** (bulk-approve endpoint +
  multi-select + duyệt/in/tải hàng loạt; defer: bulk JPEG) · **Kết nối HIS đa NCC #90** (HisConnection + service
  MockMode + test + check-missing-forms + migration **125** + FE). ⚠️ migration 124-125 verify schema-drift sau deploy.
- **WAVE 2 (build-green BE + FE EXIT0, chờ push)** — 4 cluster: **Catalog CLS DB-driven #40/#64-67**
  (FunctionalDiagnosticTestType+Template + service + controller + migration **120** + seed 9 loại + bỏ hardcode
  GetTestTypes trong NangCap23Controllers + FE page) · **Chỉ đạo tuyến #47** (entity ProvincialDirective persist
  thật + CRUD + migration **121** + FE; defer: ProvincialReports/GetStats vẫn in-memory) · **Backup #106/#128-130**
  (BackupHistory + BackupSchedulerWorker + restore AN TOÀN manual-script + config NAS/Cloud SystemConfig +
  migration **122** + FE; defer: cloud upload SDK + cron parse) · **Nhắc lịch #102** (AppointmentReminderWorker
  MockMode SMS/Zalo + migration **123** cột reminder) · **CV365 XML #88** (Cv365XmlService export HSBA 6 nhóm +
  endpoint; defer: import). ⚠️ migration 120-123 chưa runtime-test → verify schema-drift sau deploy.
- **WAVE 1 (build-green BE 0err + FE EXIT0, chờ push)** — 3 module: **ADR #5/#55-59** (entity AdrReport + service
  + controller `api/adr-report` + migration **117** + FE AdrReports v2 + báo cáo severity) · **Bảo lãnh viện phí
  #41/#68-72** (SponsorOrg+BillingGuarantor + `api/billing-guarantor` + migration **118** + FE 3 tab + công nợ
  theo đơn vị) · **HR #19** (mở rộng HrDecision có sẵn: +Department/Position/SignerName/Notes + date filter +
  migration **119**; biểu mẫu BHXH 01A-TS defer). ⚠️ migration 117-119 chưa runtime-test (DB off) → verify
  schema-drift sau deploy.
- **#154 F1.8 — Sổ sinh đẻ + Sổ theo dõi nạo phá thai (code-complete, build-green BE 0err + FE EXIT0, chờ push)**:
  module mới `ObstetricRegister` (clone pattern #94 DM hành chính). BE: entity `BirthRegister`+`AbortionRegister`
  + DTO + interface + service (CRUD soft-delete + report aggregate) + controller `/api/obstetric-register`
  (births/abortions/report) + DI + 2 DbSet + **migration 116** (2 bảng standalone, audit NVARCHAR(450)).
  FE: api client + page v2 `ObstetricRegisters.tsx` (3 tab: Sổ sinh đẻ / Sổ nạo phá thai / Báo cáo BYT) +
  route `/v2/obstetric-registers` + menu "Sổ sản khoa". ⚠️ migration chưa runtime-test (DB off) → verify
  schema-drift sau deploy. → chờ user push + `Closes #154`.
- **#148 F1.7 — Phiếu theo dõi chạy thận nhân tạo (✅ PUSHED `05121a2` + CLOSED + VERIFY PROD)**: deploy success
  (run 27593904185, 7m42s). Prod: schema-drift `missingCount=0` (bảng+cột live) · GET hemodialysis có-token 200 []
  · no-token 401 · report `DialysisMachineUsage` 200 shape mới `{count,patientCount}`+summary (stub thay query thực).
  Round-trip có-data để verify local (DB off). Chi tiết impl:
  clone pattern sơ sinh #112, **reuse `InpatientCompleteService`/`Controller`** (không DI mới). Entity
  `HemodialysisSession` (Inpatient.cs) + DbSet/FK NoAction (HISDbContext) + DTO + interface + service CRUD
  (Create/Get/Update/soft-Delete + `ValidateHemodialysis`) + 4 endpoint (`{admissionId}/hemodialysis` POST/GET,
  `hemodialysis/{id}` PUT/DELETE) + **migration 115** (idempotent, audit NVARCHAR(450), FK Admissions) +
  **fix stub `FillDialysisMachineUsage`** đếm session thực (join Admissions, filter dept/date). FE: api client
  4 hàm + `HemodialysisSection.tsx` (form đủ chỉ số: CN trước/sau, M/HA nằm-đứng/T°/NT, tốc độ/áp lực ĐM-TM/PTM/
  tái dịch, thuốc/biến chứng) + `HemodialysisSheetPrint.tsx` (phiếu in A4 popup) + wire vào `Inpatient.tsx`.
  ⚠️ migration chưa runtime-test (DB off) → verify schema-drift sau deploy. → chờ user push + `Closes #148`.
- **#100 F11.2 — Vân tay tiếp đón + checkbox không thu thập được (code-complete, build-green FE+BE, chờ push)**:
  KHÔNG dùng WebAuthn (đúng issue). 2 cột Patient (`FingerprintData`/`FingerprintNotCollected`) + **migration 114**
  + `SaveFingerprintAsync` (ReceptionCompleteService.PhotosDocs) + endpoint `POST reception/register/fingerprint/{patientId}`
  + client `api/reception.saveFingerprint` + `FingerprintPanel` trong drawer Reception.tsx (checkbox + upload ảnh→base64).
  FE EXIT 0 + BE 0 errors. ⚠️ migration chưa runtime-test (DB off) → schema-drift sau deploy. → chờ push + `Closes #100`.
  *(#144 RIS batch: verify thấy ~70% đã có ở Radiology.tsx — multi-select + bulk DICOM + per-row print/share; gap còn
  batch-approve(cần resultId/BE) + JPEG(BE mới); issue trỏ sai file RisDispatcher → đã unclaim, để scope lại sau.)*
- **✅ PUSHED + CLOSED phiên này (7 việc, tất cả v2, atomic `Closes #N`):** #145 picker Diễn biến · #85 trích lục
  watermark · #86 Data Tag (+fix lệch FE/BE) · #89 Nhi YHCT MS.20 · #87 EMR duyệt 2 cấp + late-days (no-migration) ·
  #155 khám tâm lý trước mổ (migration 113) · governance sync-gate (chống trùng 2 máy). ⚠️ #87/#155 chạm BE+migration
  → verify schema-drift + smoke sau auto-deploy.
- **#145 F8.12 — Picker "Diễn biến mẫu" (✅ DONE, PUSHED `d6886fb`, CLOSED)** — pre-flight chuẩn (sync→verify→claim)
  rồi re-apply tay lên code đã sync; atomic `Closes #145`. Stash đã drop.
- **FIX TRIỆT ĐỂ trùng-code-2-máy (governance — ĐÃ PUSH `49452a9`+`eb4590f`)**: gốc = *làm trên code cũ + tin
  issue-state trễ* (phiên này local tụt 34 commit → làm lại #142/#101 đã có origin). Fix **ENFORCE bằng máy**:
  (1) `hooks/session-start.sh` thêm `git fetch`+`behind=N` → chỉ thị BẮT BUỘC pull khi behind>0; (2) `hooks/remind-pipeline.sh`
  SYNC-GATE per-task; (3) `project-rules.md §2-4`: fetch→`pull --ff-only` + verify-against-CODE + claim issue +
  **đóng issue ATOMIC với push** + push-sớm khi song song. LINT OK ✅, hook đã bắt live `behind` thật.
- **VERIFY FUNCTIONAL nhóm mẫu in EMR (✅ CLOSED #140 #110 #141 #142)** — data-layer round-trip + static-audit binding:
  **#140** PUT/GET injury-info → 5 field pháp lý (helmet/alcohol/vehicle) persist · **#110** POST maternity-leave → 200 +
  MaternityLeaveDto · **#141/#142** printType injury-cert/treatment-confirm đăng ký + render branch + binding type-valid
  (build-green). ⚠️ Render PDF trực quan chưa tự động hóa (cần FE+browser harness) — verify qua data + registration + type.
  **→ CHIẾN DỊCH PHIÊN NÀY HOÀN TẤT: 19 feature shipped (4 sóng + #98 redo), 19 issue CLOSED với functional-verify thật:**
  #149 #151 #150 #109 #98 #94 #95 #138 #135 #136 #117 #153 #152 #101 #147 #140 #110 #141 #142.
  (Migrations 101-111 live, schema-drift=0. #98 từng revert do lỗ hổng+route-conflict → đã làm lại đúng.)
- **VERIFY FUNCTIONAL nhóm anti-fraud/alert (✅ CLOSED #152 #101 #147)** — test thật trên local:
  **#152** book 3 OK → #4 chặn "đã đặt 3 lần hôm nay" (limit 3/SĐT) · **#101** seed 66 exam → alert OPD-40 "66 lượt > ngưỡng 65",
  giảm 60 → không alert (boundary) · **#147** aggregate drugCounts (Cam thảo=2) + diagnosisFrequency (J18.9=2).
  **Tổng 15 issue CLOSED phiên này: #149 #151 #150 #109 #98 #94 #95 #138 #135 #136 #117 #153 #152 #101 #147.**
  Còn OPEN từ các sóng: **#141 #142 #110 #140** (mẫu in EMR — verify = render component FE, ít API-assertable).
- **VERIFY FUNCTIONAL nhóm reporting (✅ CLOSED #117 #153)** — test thật:
  **#153** waiting-phase-analysis trả delta tính-thật (totalVisits=398, overallMinutes=170.5, break-down theo đối tượng),
  hết hardcode 15/20/10/8 (vài phase=0 do data thiếu mốc StartTime/EndTime — nợ cột CompletedAt). **#117** seed
  ClaimDetail local → bhyt-21/20/285 + c79b/c80b ra số đúng (c80b claim thật 3.5M); 8 endpoint shape đúng (mẫu 18
  defer, bhyt-16/17 YHCT chưa seed test số, FE chưa nối route). **Tổng 12 CLOSED phiên này: #149 #151 #150 #109 #98 #94 #95 #138 #135 #136 #117 #153.**
  Còn OPEN (build-green+smoke): #141 #142 #110 #140 (mẫu in) · #152 (anti-fraud) · #101 (cảnh báo quá tải) · #147 (biểu đồ điều trị).
- **VERIFY FUNCTIONAL nhóm master-data + RIS (✅ CLOSED 5 issue)** — test thật trên local, prod schema-drift=0:
  **#94** tỉnh/huyện/xã (seed 8 tỉnh, hierarchy FK, DELETE soft) · **#95** DM nhỏ (Note/SortOrder persist đúng — cột drift-fixed) ·
  **#138** favorite RIS (toggle ON/list/OFF) · **#135** overdue TAT (tatMinutes+isOverdue, overdueOnly lọc đúng) ·
  **#136** lọc đoàn khám (ExamGroupName filter match/0). **Tổng 10 issue CLOSED phiên này: #149 #151 #150 #109 #98 #94 #95 #138 #135 #136.**
  Còn OPEN (build-green+smoke, chưa verify sâu): #141 #142 #110 #153 #152 #101 #140 #147 #117.
- **#98 KSK chuyên biệt — REDONE SAFELY + CLOSED** (commit `26b2b1d`): sửa trọn 3 lỗi của bản revert —
  (1) CRUD vào `HealthCheckupController [Authorize]`, GET không token→**401** (hết anonymous đọc dữ liệu lâm sàng);
  (2) XÓA `HealthCheckupList` khỏi FrontendCompat → hết route trùng; (3) migration **111 additive thuần**
  (ADD FoodHandlerRole/FoodSafetyConclusion nullable, KHÔNG đổi kiểu PatientId/CreatedBy, KHÔNG drop FK).
  Tận dụng entity sẵn có (Driver/Child fields đã có) + 3 mẫu in TT36/TT15/TT14. Verify local (401, POST persist VSATTP)
  + prod (schema-drift=0, types/list 200, no-token 401). **5 issue đã CLOSED tổng cộng: #149 #151 #150 #109 #98.**
- **VERIFY FUNCTIONAL money/safety (✅ — CLOSED 4 issue)**: chạy backend local + test thật (mutate local DB, không đụng prod):
  **#149** hard-block tạm ứng — 3 scenario (OFF→tạo đơn OK · ON ngưỡng>deposit→CHẶN đúng message · ON ngưỡng<deposit→OK).
  **#151** BHYT zero-copay — end-to-end reassign: ngoài DS→PatientAmount=40k(đồng chi trả) · trong DS→PatientAmount=0.
  **#150** XN đặc biệt — 4 scenario (24h fallback · N-ngày=90 fire · per-episode fire · N-ngày=3 skip); **FIX bug**
  per-episode chỉ lookback 24h → mở rộng 90 ngày (commit `a314aa5`). **#109** hội chẩn duyệt — approve→st=2 · reject→st=3 ·
  guard type≠3→HTTP400. Tất cả deploy prod, schema-drift=0, prod smoke 200. Backend local đã tắt.
  ⚠️ Các feature KHÁC (sóng 1-4) vẫn ở mức build-green+smoke, CHƯA verify chức năng sâu → vẫn OPEN.
- **SÓNG 4 (build-green, 4/5 feature — ĐÃ push+deploy+verify)**: fan-out 5 agent, build gate tập trung.
  VERIFY PROD: `schema-drift=0` (sau fix #138 FK shadow `RadiologyRequestId`→`[ForeignKey(RequestId)]`, commit 84676d2);
  smoke #138 favorites · #117 bhyt-21/c79b/c80b · #109 consultations = **200**.
  **#146** PACS overlay 6 vùng (FE CornerstoneViewer/DicomViewerConfig, lưu localStorage per-user; defer:
  drag-drop thật, HU live) · **#138** Favorite ca chụp RIS (entity RadiologyStudyFavorite, migration **109**,
  partial `HISDbContext.RadiologyFavorite.cs`, toggle/list endpoint, nút ghim + filter RisDispatcher) ·
  **#109** Hội chẩn thuốc trình duyệt (4 cột approval InpatientConsultation, migration **110** ALTER,
  endpoint approve, 3 tab duyệt — ⚠️ phân quyền lãnh đạo mới `[Authorize]` generic, chưa lock role) ·
  **#117** Mẫu BHYT 16-21/C79B/C80B/285 (16 endpoint InsuranceXml; mẫu 18 defer thiếu field radiopharma;
  ⚠️ FE bhytReports.ts dùng route khác — chưa nối FE). Sửa ở gate: #117 biến `from` trùng keyword LINQ (→`@from`).
  ⚠️ **#98 KSK chuyên biệt — REVERTED toàn bộ (KHÔNG ship)**: agent dùng `FrontendCompatController` [AllowAnonymous]
  → POST/PUT ghi dữ liệu lâm sàng không auth + route `api/health-checkup` TRÙNG `HealthCheckupController`
  (AmbiguousMatchException) + migration 111 đổi kiểu cột nặng. Làm lại sau: route vào HealthCheckupController có auth.
- **VERIFY PROD sau 3 sóng (✅)**: deploy `186ddb1` success. `/health/schema-drift` **missingCount=0**
  (vá `108_admin_catalog_missing_columns.sql` — #95 dùng CREATE-IF-NULL bỏ qua 3 bảng có sẵn prod
  → ALTER ADD Note/SortOrder). Smoke: #94 provinces · #150 special-test-rules · #151 bhyt-full-coverage ·
  #95 nations/initial-facilities/occupations/genders/ethnics · #153 waiting-phase-analysis = **200**.
  CHƯA verify chức năng sâu (money #149/#151 zero-copay, block behavior, #152 IP-behind-LB) — chỉ smoke GET.
  **CHƯA close issue nào** (15 issue: #141 #142 #149 #150 #153 #110 #152 #94 #135 #101 #140 #136 #147 #95 #151).
- **SÓNG 3 (build-green)**: fan-out 5 agent, build gate tập trung (BE 0 err · FE 0 err).
  **#140** form TNGT đủ trường pháp lý (mũ BH/rượu bia/phương tiện — thêm 5 cột InjuryInfo, migration **104**
  ALTER, form trong OpdEditor) · **#136** RIS lọc theo Tên đoàn khám (cột `ExamGroupName`, migration **107**
  — ⚠️ RisDispatcher dùng `/radiology-dispatch/pending`, filter `waiting-list` đã có nhưng tab pending cần
  nối thêm; cần flow điền ExamGroupName khi tạo từ KSK #98) · **#147** EMR 2 biểu đồ quá trình điều trị
  (endpoint aggregate drugCounts/diagnosisFrequency, recharts) · **#95** DM hành chính nhỏ (migration **105**
  — Occupation/Gender/Ethnic ĐÃ CÓ Icd.cs nên reuse + thêm cột Note/SortOrder; chỉ Nation/InitialFacility là
  entity mới; 5 tab CatalogsAdmin) · **#151** BN BHYT chi trả 100% thuốc đặc trị (migration **106** +
  nhánh additive trong `ReassignObjectService.ReassignMedicinesAsync`, mặc định BN ngoài DS tính như cũ).
  ⚠️ Đã sửa 3 lỗi agent ở gate: #95 trùng migration-số (104→105) + trùng entity Occupation/Gender/Ethnic;
  #147 recharts formatter type. ⚠️ #151 chỉ hook ở ReassignObject — chưa hook lúc tạo đơn BHYT đầu tiên (defer).
- **SÓNG 2 (build-green, đã push)**: fan-out 5 agent, build gate tập trung (BE 0 err · FE 0 err).
  **#110** Giấy nghỉ dưỡng thai (printType `maternity-leave` + modal nhập tuần thai trong EmrEditor, không
  migration — tái dùng pattern giấy nghỉ ốm) · **#152** chống giả mạo đặt khám (migration **102**
  BookingAttemptLogs+BookingBlacklists qua partial `HISDbContext.AntiFraud.cs`, log IP server-side +
  blacklist + giới hạn 3/SĐT·10/IP·ngày, cấu hình SystemConfig `Booking.*`) — ⚠️ Cloud Run sau LB cần
  `UseForwardedHeaders` để lấy IP thật (deferred) · **#94** DM địa danh hành chính (migration **103**
  Provinces/Districts/Wards — entity ĐÃ CÓ sẵn Icd.cs, seed 8 tỉnh; controller+service+page-v2+route/menu+DI)
  — ⚠️ verify schema-drift sau deploy (entity cũ vs bảng mới) · **#135** RIS cờ/lọc quá hạn TAT (ngưỡng
  SystemConfig `RIS.TAT.DefaultThresholdMinutes` def 60', cột IsOverdue/TATMinutes, filter overdueOnly) ·
  **#101** cảnh báo quá tải phòng khám >65 lượt/ngày (rule OPD-40, đếm Examination theo VnTime.DayRangeUtc).
  ⚠️ Đã sửa 2 lỗi agent ở build gate: agent #135 thay nháy thẳng→cong (42 chỗ, vỡ 200 lỗi C#); #94 dùng sai `cf`.
- **SÓNG 1 (đã push, commit ee12b81/e160b4a/543b418/14ae299/75f97d4)**: #141 #142 #149 #150 #153 (xem dưới).
- **Chiến dịch "làm tất cả feature" — SÓNG 1 (build-green, ĐÃ push)**: fan-out 4 agent song song,
  build gate tập trung (BE `dotnet build` 0 err · FE `tsc -b` 0 err). Đã làm:
  **#142** phiếu in Giấy xác nhận đang điều trị · **#141** Giấy chứng nhận thương tích (printType
  `treatment-confirm`/`injury-cert` + EmrEditor PRINT_FORMS + truyền examinationId) ·
  **#153** phân tích thời gian chờ thực (bỏ hardcode 15/20/10/8 trong ReceptionCompleteService.Statistics,
  page-v2 WaitingTimeReport + route/menu) — *nợ: cột `ServiceRequest.CompletedAt` để chính xác mốc "có KQ"* ·
  **#150** XN đặc biệt 1-lần/đợt (migration **101** SpecialTestRules + mở rộng CheckDuplicateTestOrderAsync
  fallback 24h + page-v2 SpecialTestRuleAdmin + route/menu) · **#149** hard-block tạm ứng (guard
  CheckDepositEnforceBlockAsync trong CreatePrescription/CreateServiceOrder, cờ SystemConfig
  `Billing.DepositEnforceBlock`+`Billing.DepositMinThreshold`, **mặc định OFF**, FE Inpatient.tsx).
  ⚠️ Nợ #149: FE balance endpoint Inpatient.tsx sai sẵn từ trước (`/billing/deposit-balance` vs thực
  `/api/billing-complete/deposits/balance/{id}`) — BE guard vẫn enforce độc lập. Verify prod cần deploy.
  Sóng kế (chờ tiếp): #6 sơ sinh, #5 ADR, mẫu BHYT #117, kiosk #123-125, backup #128-130, RIS multi-branch #131-132.
- **(máy D) Governance `.claude` lên ~9/10 (drift-immune)** — thêm `REGISTRY.md` (sổ nguồn-sự-thật, link-không-copy)
  + `lint.sh` (hệ miễn dịch **9 check** chống drift, auto qua Stop hook) + `audit-protocol.md` (chống agent nói-quá)
  + gộp 2 Stop hook → `stop-checks.sh` (gate drift-lint) + 6 agent-memory dir + prerequisite môi trường (Git Bash/WSL2).
  Memory mới: `user_wsl2-first-windows-agent-stack`.
- **(máy C) Verify-and-close pass wave E1–E12 (~110 issue)** — fan-out 9 Explore agent quét codebase.
  KẾT QUẢ: wave này là **backlog gap thật**, gần như tất cả MISSING/PARTIAL. ĐÓNG 4 issue DONE có evidence:
  **#46** (META diff NangCap) · **#60** (enum 5 mức triage + mig 83) · **#62** (UI bảng cấp cứu theo triage) ·
  **#92** (8 endpoint đối chiếu CP–định mức–DT). **#23 mơ hồ** → chờ user chốt field. Gap lớn còn lại: chạy thận
  #148, sơ sinh #6/#50-54, kiosk #103/#123-125, backup #106/#128-130, bảo lãnh #41/#68-72.
- **(máy C) Fix smell E2E `xml/generate/xml1`** (`ded43da`, PUSHED+DEPLOYED+VERIFY PROD 3/3 ✅):
  `GetClaimsForExport` dựng `DateTime(0,0,1)` khi chỉ gửi `MaLkList` → 400 opaque. Fix guard `hasValidPeriod`.
  Prod: maLkList-only→200 (data thật) · body rỗng→400 message rõ · month/year→200 (regression OK).
  Chi tiết: VÒNG 3 trong `prod-e2e-flow-test-2026-06-13.md`.
- **Verify #13 (per-parameter lab `b448306`)**: deploy success; contract additive + smoke local OK; CHƯA verify
  payload sống vì prod KHÔNG còn order LIS (test data clear).
- Quick-win batch (#145 picker · #102 worker tái khám · #61 triage-at-register) **tạm dừng** (user đổi hướng).

## (cũ) Đang ở đâu
- **Fix phát thuốc ngoại trú trừ kho (`de9b05c`, PUSHED+DEPLOYED+VERIFY PROD)**: test e2e prod
  (`prod-e2e-flow-test-2026-06-13.md`) bắt nhánh fallback `CompleteDispensing` (đơn NULL-kho) chỉ flip
  status mà KHÔNG tạo phiếu xuất / KHÔNG trừ kho → thất thoát kho + cancel-dispensed 400. Fix: luôn đi
  qua `DispenseOutpatientPrescriptionAsync` (resolve kho lẻ WarehouseType=2 nếu đơn chưa gán; không có →
  400) + cancel legacy-fallback. Smoke local 9/9 (trừ đúng 15, hoàn đúng). **Verify prod SEED005
  `39722354`: cancel(legacy 400→200) → dispense(200) → cancel(200) — 3/3 PASS**, bản ghi về cancelled sạch.
  ⚠️ **Còn 31 bản ghi legacy cùng lỗi trên prod (24 SEED 0-item + 7 DT có-item)** — toàn test data, stock
  chưa từng bị trừ (không thất thoát thật); CHỜ user duyệt có reset về accepted không (không tự bulk-mutate).

- **Đợt 24 đóng trọn**: 3 P0 + 15 endpoint deploy + re-probe prod 17/17 PASS; thêm fix nối tiếp:
  reception payment/deposit **404 khi HSBA không tồn tại** (`1d511ed`, verify prod 404 ✓), phiếu mồ côi
  `PT202606130001` đã xóa prod (guard kép).
- **Chiến dịch Issues (user: "làm hết tất cả task trong Issues")** — đã xử lý **22/29** (19 closed):
  - **#13 ✅** per-parameter KQ XN (`b448306`): plan phát hiện hạ tầng ĐÃ CÓ từ mig 87 (bảng params +
    3 writer dual-write + FHIR + DQGVN) → chỉ làm 4 gap đọc/hiển thị: reader API trả parameters[] ·
    Laboratory v2 drawer tô màu flag · print thêm cột Cờ · DQGVN verify OK. Smoke local 3 params
    N/L/H đúng. **Deploy đang chạy — cần verify prod sau deploy.**
  - **#19 plan posted** (module HrDecision ĐÃ CÓ MVP — plan mở rộng 22 loại QĐ + người ký + print +
    01A-TS; 4 câu hỏi chờ user trong issue) · **#20 plan posted** (PNG proxy PACS đã có, gap = mobile
    viewer nhẹ + gallery + print helper; 3 câu hỏi chờ user) · **#17 scoped 5 batch** (phiên riêng).
  - **#29 ✅** wave-ui-all.spec.ts 5 PASS + 1 skip-có-log, suite cũ 9/9 (agent test) · **#30 ✅** 10/11 mục
    (mục 7 EMR template UI vừa làm: OpdEditor áp mẫu/lưu mẫu/quản lý — reuse /clinical-narratives; mục 11
    → #20) · **#31 ✅** audit crud25 re-run prod SẠCH 0 fail thật (3 false-fail là bug spec đã fix: regex
    "Làm mới", closeOverlay backdrop, navigate-as-create; 404 pttt-mapping là contract chủ đích) — commit
    `8202090`.
  - Làm mới: **#4** nutrition persist (DietOrders reuse, `c3bab0a`) · **#26** schema-drift so CỘT EF model
    + mig 100 vá 4 cột drift thật (`aac78db`, prod missingCount=0 ✓) · **#27** bật worker nhắc hẹn prod
    (log started ✓) · **#28** popup hạn dùng thêm HospitalPharmacy (`fc1bc06`).
  - Đóng vì đã làm từ trước (verify code + commit evidence): **#3 #7 #8 #9 #10 #11 #12 #15 #16 #18 #21**
    (đa số từ wave flow-final 06/09 — issues tạo từ docs cũ bị stale).
  - **#22** → label blocked (chiều nhận KQ máy XN đã thật qua HL7 TCP; gửi worklist cần máy thật).
  - **#30**: verify 9/11 mục DONE; còn mục 7 (EMR template UI — MISSING) + mục 11 (dồn về #20).
  - **#31 đang chạy**: audit crud25 re-run prod — fix bug spec (regex "Mới" match nhầm nút "Làm mới"
    → false fail); đang chờ kết quả lần 2.
- Backup branch local cũ đã xóa theo lệnh user (`git branch -D backup/local-main-2026-06-13`).

## Blocker / cần user quyết
1. **#24 HDDT**: chờ user chọn NCC (VNPT/Viettel/MISA) + endpoint + credential ENV.
2. **#25 rotate R2**: cần quyền Cloudflare (token/dashboard) — máy không có credential.
3. **#5 ADR / #6 sơ sinh / #23 field LIS-RIS**: cần user chốt scope/danh sách field.
4. **#14 đa cơ sở Tier2+**: user đã chốt WON'T-DO Tier 2/3 (2026-06-11) — đề nghị close not-planned?
5. **#22 LIS analyzer**: blocked chờ máy xét nghiệm thật (driver gửi worklist).

## Việc kế tiếp
1. Verify prod sau deploy `b448306` (per-parameter lab): GET LISComplete order detail có parameters[].
2. Còn mở 9 issue: **#5 #6 #23** chờ user chốt scope · **#24 #25** blocked credential ·
   **#22** blocked máy XN · **#17** làm theo 5 batch đã ghi trong issue (phiên riêng) ·
   **#19 #20** implement theo plan đã đăng sau khi user trả lời open questions.
3. **LUÔN fetch + git log origin + gh issue list trước khi pick** (máy D làm song song).
