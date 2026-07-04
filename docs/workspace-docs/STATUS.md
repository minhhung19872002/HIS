# STATUS — đang ở đâu · blocker · việc kế tiếp

> 🔗 **Task board = GitHub Issues** (`minhhung19872002/HIS`): `gh issue list`. File này CHỈ giữ
> **session-state NGẮN cho hook** — KHÔNG ghi backlog/plan/lịch sử dài. Quy tắc giữ-ngắn + vòng đời
> context (mở phiên · chọn model · plan-mode · dọn context · handoff): [`.claude/workflow/session-ops.md`](../../.claude/workflow/session-ops.md).
> 📜 Lịch sử phiên 2026-06-13→21: [`90-archive/handoffs/session-2026-06-21-handoff.md`](90-archive/handoffs/session-2026-06-21-handoff.md).
>
> Cập nhật cuối: **2026-07-04**.

## Phiên 2026-07-04 (cửa #202-BE `w973` — thin 5 fat controller, build-green, CHỜ push)
- **#202 [REFAC-3] Checkpoint** [HARD, build-only]: bỏ HISDbContext khỏi **5 controller** → service (RadiologyDispatch·RisCatalog·LisCatalog·OfficeSupply·EmployeeProfile = đủ 5 NAMED trong issue). Controller **2173→620 dòng**; logic move verbatim xuống `HIS.Infrastructure/Services/*Service.cs` + `HIS.Application/Interfaces/I*Service.cs`. Envelope mới `ServiceOutcome` (Application/Common) + `.ToActionResult()` (API/Extensions) giữ nguyên status+body; OfficeSupply dời DTO sang Application (money/kho verbatim).
- **Verify build-only:** `dotnet build` toàn sln **0 error**; multi-agent 4 self-review + 12 adversarial (3 lens×4) = **0 drift**; spot-check money-path byte-identical. **CHƯA push** (backend down → chưa smoke; DI resolution runtime chỉ chắc khi smoke). Chờ user + phiên deploy+smoke. Còn ~42 controller khác vẫn inject HISDbContext.

## Phiên 2026-07-04 (cửa này — SKILL core-safe-branch-merge + forensics backup-session-b2)
- **User yêu cầu merge nhánh local → main.** Chỉ 1 nhánh khác = `backup-session-b2` (329-behind, 7 commit). **Workflow verify đối kháng (6 agent):** money-fix `3837270` ĐÃ trên main (`3edf11c`); 12 file BE B2.2/B2.4 superseded + full-merge sẽ **BUILD-BREAK** (trùng class + migration #48/#49); 4 docs never-push → **KHÔNG merge/cherry-pick backup** (leave-as-backup).
- **2 gap FE thật backup lộ ra → đề xuất 2 issue PORT (feature, làm sau):** (1) DICOM annotation FE wiring (BE main sẵn, FE main KHÔNG gọi `saveAnnotation/getAnnotations` → chú thích mất khi reload); (2) v2 Microbiology antibiogram data-entry UI (chỉ có ở v1 retiring #204; api+BE main sẵn).
- **Tạo skill `core-safe-branch-merge`** (CORE portable · LINT OK · REGISTRY+SKILL-MAP): nhúng 12 fix critique (fetch-origin trước · `git cherry` patch-id · `cherry-pick -n` stage-review · worktree teardown đừng `rm -rf` · đừng pull/rebase cây chung · FE push=Vercel deploy).
- **Việc kế (CHỜ user duyệt execution):** #359 fmtVND (worktree, chưa commit) sẵn lên main; fmtDate `bd3e4b0` cửa khác (chưa push) → phối hợp, không push hộ.

## Phiên 2026-07-04 (cửa #205-FE-2 — split 4 god-component v2, LOCAL build-green CHỜ push)
- **#205 [FE-2] Checkpoint 2-5/5 — 4 god-component** [HARD tech-debt, DONE-code CHỜ-push]: tách 4 file `pages-v2/` thành folder phẳng (convention `reception/`/`inpatient/`), mỗi main giữ `export default` (App.tsx lazy import KHÔNG đổi):
  - **Dashboard** 1166→**342** dòng · folder `dashboard/` 16 file (`_shared.ts`+9 section+6 modal). Pure-move verbatim.
  - **Radiology** 1461→**507** dòng · folder `radiology/` 8 file (`_shared.tsx`+CallPatient/SignResult/Biopsy/ResultEntry modal+CoReaderSection+DrawerBody+columns). `onBulkApprove` (clinical bulk-approve) GIỮ trong main. SurgeryReportModal import từ `../shared/SurgeryReportModal` (barrel KHÔNG export).
  - **Laboratory** 1003→**481** dòng · folder `laboratory/` 6 file (`_shared.ts`+columns+DrawerBody+ChainCancel/UtilDrawer/RolesModal). `runChainCancel`/`saveRoles`/`loadUtilData` GIỮ trong main (preserve click-gating, KHÔNG đổi useEffect).
  - **OpdEditor Phase-1** 1648→**1290** dòng · folder `opd-editor/` 5 file (`_shared.ts`+InjurySection+ClsResults/Consult/Template modal). **CONSERVATIVE (Rule 6):** chỉ tách phần KHÔNG-patient-safety; Diagnosis/Orders/Allergy/Vitals/9 disposition-completion-modal/5 useEffect/handlers (persist·completeExamination TT46-guard·doHospitalize·doTransfer) **DEFER Phase-2** phiên deploy+smoke → main còn >500 dòng (có chủ đích).
- **Verify:** `tsc -b` + `npm run build` **EXIT 0** (built 2m20s). **Verify đối kháng ĐỦ 4 lens PASS** (Radiology verbatim full-coverage 1461 dòng · Radiology patient-safety [sign/final-approve/biopsy/bulk/co-reader/statusKey] · Laboratory patient-safety [flagFor HH-LL/chainCancel level≥2/approval-chain/click-gating] · OpdEditor post-fix): equivalent=true, high-conf, **0 issue**; mount-semantics + columns-lift (0 state closure) confirmed. **2 defect OpdEditor đã fix trước verify:** ClsResultsModal+ConsultModal subtitle guard `patientName?` → pre-computed `sub` prop (khôi phục selPt-existence semantics). Side-effect audit Rule 5: 0 timer/subscribe mới sinh trong 32 file tách (2 setTimeout revoke-URL = verbatim-move từ gốc).
- **User duyệt push+close (2026-07-04).** Comment #205 khai báo 4 component để máy-2 tránh; origin đối chiếu trước push: chưa có folder nào từ máy-2. File ngoài scope (KioskSelfService/PatientPortalStandalone/reception/BE #202) — KHÔNG stage.
- **OpdEditor Phase-2 → issue #362** (scope-overlap transfer đủ context trước khi đóng #205): Diagnosis/Orders/Allergy/Vitals + 9 disposition modal + 5 useEffect + handlers TT46/persist/hospitalize/transfer — cần phiên deploy+smoke (Rule 6). TEST làm CUỐI.

## Phiên 2026-07-04 (cửa fmtDate — dedup date/time-formatter ✅ DONE + PUSHED `df20215` → origin/main)
- **SYNC-GATE:** local diverged 2 commit trùng-nội-dung đã lên origin (`4107a7f`/`3968db3`) → rebase `--skip` tự-lành về origin (0/0); STATUS.md lấy bản origin (không giành cửa khác).
- **Backlog tech-debt CẠN/bị claim:** #201/#202/#205 in-progress cửa khác; #191/#212/#213 = test (để cuối). Slice cô lập không-cần-deploy còn lại = gom date-formatter.
- **fmtDate/fmtDateTime/fmtTime** [EASY tech-debt, ✅ DONE + PUSHED `df20215` origin/main (fast-forward `4107a7f..df20215`, 0/0; Vercel auto-deploy)]: thêm **3 helper** vào `utils/format.ts` (mirror CHÍNH XÁC `new Date(x).toLocaleDateString/toLocaleString/toLocaleTimeString('vi-VN')`, không thêm guard) + migrate **24 site (13 date + 7 datetime + 3 time + 1 fold local-helper PatientPortalStandalone)** ở **18 file** v2/shared/utils. Chỉ thay inner substring, giữ nguyên guard/ternary/try-catch/fallback. **tsc -b EXIT 0**, behavior-preserving. Commit `df20215` (amend từ `bd3e4b0`; explicit-add CHỈ 18 file của tôi, KHÔNG đụng #205 god-component/CornerstoneViewer + BE #202).
- **Safe scope date/time-formatter = HẾT** (grep xác nhận: 16 datetime còn lại đều ở v1 `pages/` hoặc `opd-editor/`+`surgery-modals/` của #205; 3 time đã xong; 1 options-datetime lẻ `BedLabResultSection` = không dedup).
- **Non-goals giữ nguyên (cửa khác/deferred):** ~314 **number-formatter** (`n.toLocaleString('vi-VN')`+đ/%) = territory **#359 fmtVND** → KHÔNG đụng · no-arg `new Date()` (HrDecisions:66, current-date) · v1 `pages/` (v1-retire #204) · 5 god-component + split folders #205 · reception `fmtHM` (impl padStart khác, không byte-identical).
- ⚠️ **Trùng file với #359 (đã push TRƯỚC):** `df20215` đã lên origin với `fmtDate/fmtDateTime/fmtTime` sau `fmtNum`. #359 `fmtVND` (worktree, CHỜ push) khi push sẽ append tiếp — không chồng dòng, tự-merge. Push df20215 = fast-forward sạch, KHÔNG cần worktree (0 behind); working-tree dirty của #205/#359/#202 KHÔNG bị đẩy (git push chỉ đẩy commit).
- **Verify trước push:** workflow đối kháng 4 lens (helper-fidelity·guard-preservation·arg/type-refute·isolation) + synthesis gate = **SHIP** (0 blocker/0 fail; mọi finding là note clear/skip đúng).

## Phiên 2026-07-04 (cửa này — #359+#360 DONE + PUSHED `30f0d71`/`2659d63` → origin/main)
- **#359 fmtVND** ✅ **CLOSED+pushed `30f0d71`**: de-dup 4 bản sao `fmtVND` → `utils/format.ts`; 5 file FE (Billing|Insurance|Inpatient|Pharmacy + format.ts). Vercel auto-deploy.
- **#360 DICOM annotation** ✅ **CLOSED+pushed `2659d63`**: wired save/load per-SOP vào `CornerstoneViewer.tsx` + plumbed `DicomViewer.tsx`; 2 file FE.
- **Skill `core-safe-branch-merge`** đã ship (phiên này), REGISTRY+SKILL-MAP OK.
- **Issues mới tạo:** #361 (v2 Microbiology antibiogram port — open, chưa claim).

## Phiên 2026-07-03 (cửa Opus/Fable — #358 NangCap25 QR động VCB CLOSED+pushed+deployed+verified prod)
- **#358 [NangCap25] QR động Vietcombank kết nối viện phí (BV VN-Thụy Điển Uông Bí) → CLOSED** (`840dac9` feat + `a3a0e09` e2e).
  Trọn 22 mục (I-VI): QR động 5 nguồn (chỉ định CLS/đơn thuốc/quầy thuốc/tạm ứng/ra viện) + kiosk · paid-hook V.1
  (IsPaid+Status 0→1 mở gate LIS/PACS, tạo Deposit, RetailSale.PaidAmount) · chi hộ hoàn tiền IV (MockMode) · báo cáo
  VI.1 người-tạo-QR + VI.2 đối soát NH · nhúng QR 4 phiếu in. Mở rộng `PaymentGatewayService` (KHÔNG dựng cổng mới).
  Migration **141** (`ReferenceType/Id/Data` + bảng `RefundDisbursements`). FE: `QrPaymentCenter` `[25]` route `/v2/qr-payment-center`.
- **2 bug thật phát hiện qua test → fixed + regression-guard:** (1) business guard 500→400 (thiếu `[TypeFilter(DomainExceptionFilter)]`
  trên `PaymentGatewayController`). (2) **ROOT-CAUSE tiềm ẩn:** `PaymentTransaction.Patient` required-nav + BN xóa mềm → filtered
  `.Include(Patient)` ẩn luôn giao dịch (confirm 500 / getById 404 / rớt khỏi đối soát) → fix 1 dòng `HISDbContext`:
  `.Navigation(t=>t.Patient).IsRequired(false)`. Ảnh hưởng MỌI query payment, không riêng NangCap25.
- **Test 2 tầng:** BE `scripts/test-nangcap25.ps1` **30/30** (API + paid-hook + reports + chi hộ + print + regression 3 cổng cũ
  + BN-xóa-mềm + guards 400). FE `frontend/e2e/nangcap25-ui.spec.ts` **4/4** Playwright UI-drive (đối soát+submit chi hộ ·
  kiosk sinh QR canvas · VietQR method · render sạch) + 10 evidence `test-results/NangCap25/`.
- **Deploy verify prod:** GitHub Actions run 28644306427 **success 6m17s** · `/health/schema-drift` **missingCount=0** ·
  endpoint VI.2/IV/query-cột-mới trả 200 (migration 141 áp, bảng `RefundDisbursements` tồn tại). LIVE trên prod.
- **Vận hành còn lại (không chặn nghiệm thu):** chi hộ IV chạy MockMode (cần merchant contract VCB) · confirm bank thủ công
  (VCB chưa cấp webhook IPN) · điền số TK VCB thật qua env `PaymentGateway:Bank:vietcombank:*`.
- Cũng đã push đầu phiên: `8e46244` envelope-standardize 12 controller · `7ade374`/`f7b8784` agent-memory+docs+gitignore dọn.

## Phiên 2026-07-03 (goal: hoàn thành TẤT CẢ issue — fix trước, test cuối)
- **CLOSED hôm nay:** **#292** (Cloud SQL private-IP `10.10.0.3` + gỡ 0.0.0.0/0 + rotate pwd sqlserver; public 1433 BLOCKED; prod healthy) · **#182** (rotate Jwt__Key + PACS Orthanc pwd [VM .env + Cloud Run] + scrub seed-script + fail-fast guard default-key prod, `7bcae24`) · **#293** (shortlist 6 controller gate RBAC, `e0057d5`, smoke admin 14/14=200; test-403 bàn giao #344) · **#183** Phase-2 (verify prod 8 role; gộp RadiologyManager→RadiologistManager orphan-neutral, `52af969`) · **#209** (MOOT theo v1-retire; phần sống → #352).
- ⚠️ Máy này CÓ gcloud (owner) + SSH PACS VM — các defer "thiếu gcloud" trước đây làm được tại đây. DB prod truy cập qua cloud-sql-proxy.
- **Đang chạy (agent nền):** #193 envelope (cây chính) · #195 N+1 write-path (worktree) · #198 audit-log (worktree). Sau đó: #197(4 phần) → #202-thin → #348(+đóng #200) → #355/#356+#201-threshold → #205 → #210 → #214 → epic #352/#204 → TEST (#191/#212/#213 rồi #216-347).

## Phien 2026-06-28..29 (cua OPUS - #354/#201/#203/#202 SHIPPED prod, deploy success)
- **#354** [PERF-2a]: bound 99 list-endpoint type-(a) + verify doi-khang 43 agent bat 8 site bound-nham -> revert. PUSHED cf8962f.
- **#201** [REFAC-2]: tach 7 BE god-file -> 36 file <800 (byte-identical; encoding-fix [IO.File]::ReadAllLines UTF-8). PUSHED a50123a.
- **#203** [REFAC-4] DTO hygiene TRON VEN -> CLOSED (721316d): 11 god-DTO split <800 + 198 inline-DTO ra khoi 48 controller (Dtos/) + dedupe 8 DTO divergent rename role-specific + grab-bag rename. Du 4 acceptance.
- **#202** [REFAC-3]: tach 13 prod god-controller -> partial <800 (route-attr GLOBAL 2919==2919 + string-literal Vietnamese 6764==6764 bao toan; mojibake=0). PUSHED 8ab3a52 + 8602ed6. **OPEN**: thin/bo-DbContext + 2 dev-tool (PopulateData/DailySeed atomic method) = can smoke.
- **Viec ke:** BE tech-debt con lai (#193/#195/#197/#198/#355/#356/#202-thin/#214) deu CAN deploy+smoke -> phien smoke-capable. FE (#206/#210/fe-unused) dang do cua khac giu lock. TEST lam CUOI cung. *(#211+#353 da CLOSED+pushed e628b96/4afcf98 — boi cua nay.)*
- **#357** [bug/P0 patient-safety] **CLOSED+pushed `cd4f583`** (cua nay): khoi phuc co an-toan-BN vao **5 editor v2** (OPD/Prescription/EMR/Billing/Inpatient = dung 5 trang v1 co banner); `EmrEditor` chi `PatientFlagBanner` (parity v1). Reuse `components/PatientFlagBanner`+`BusinessAlertPanel`, behavior-preserving (tu-an khi khong co flag/alert), build FE EXIT 0, 31 insertions/5 file. Residual feature-PORT (lieu-theo-cu S/T/C/Toi · AI-CDS/NEWS2 · in MSS-01) track o #353 §2b-2 + §5 PORT + #352.

## Phiên 2026-06-28→30 (cửa này — #211 + #353 CLOSED+pushed; #357 đã xử lý; #353 Tier-2 verify done)
- **#211** dedup URL `NonDicomCapture` → **CLOSED+pushed `e628b96`**. **#353** inventory v1↔v2 → **CLOSED+pushed `4afcf98`**.
- **#357** [P0 patient-safety] (phát hiện từ #353: v2 mất `PatientFlagBanner`+`BusinessAlertPanel`) → **CLOSED+pushed `cd4f583`** (khôi phục banner vào 5 editor v2).
- **#353 Tier-2 verify HOÀN TẤT (2026-06-30, cửa này):** soi nốt 16 trang batch-Full chưa-verify (D2/E2) → **12 giữ Full, 4 HẠ Partial** (StockReport/DispensingCounter/HealthEducation/SampleTracking). RadiologyOps nghi endpoint-mismatch → **VERIFY = false-alarm** (BE có `paraclinical-services`+`medical-supplies`; convention 2=LIS/3=Radiology; v1 `/catalog/services` mới là endpoint-chết) → giữ Full, KHÔNG cần fix. Inventory doc: **TỔNG CUỐI 45 Full · 58 Partial · 14 Stub**; DELETE-safe **44** (14 verified + 30 superset); DROP-list RỖNG. Đã giải quyết hết vấn đề task → commit+push enrichment cho #353.
- Lock cửa này: `353-tier2`. (Cửa khác: #355/#356, fe-unused-cleanup, 202/206.)

## Phiên 2026-06-28 (#354 wave-2 — XONG-local, build-green, CHƯA push, chờ user duyệt)
- **#354 [PERF-2a][P1] CLAIMED** (in-progress + assignee me): bound type-(a) list endpoint còn lại (~158 file/1130 site `.ToListAsync`
  chưa quét). Nối tiếp #196 wave-1 (foundation `QueryBoundExtensions.ToBoundedListAsync`). **Calibrate rule**: type-(a) =
  `.ToListAsync()` trả rows về client, KHÔNG Skip/Take, KHÔNG aggregate(.Count/.Sum/GroupBy)/write-loop theo sau (kể cả FK-scoped);
  CHỈ bound **bảng tăng-trưởng** (bỏ catalog tham chiếu cố định nhỏ: Genders/Ethnics/Nations…).
- **Phát hiện density THẤP**: nhiều "list service" đã `.Take(200)` sẵn (Chronic/Community/Environmental/HealthEdu/Reproductive ≈0 type-(a)).
- **Cach lam**: gop 2 cua lam-trung ve 1 cua (user dung cua kia). 5 subagent Sonnet quet Set A (124 file raw ToListAsync chua bound) + Set B (26 file wave-1 con gap). Rule conservative skip-when-uncertain (bound nham aggregate = SAI so lieu; bo sot = lanh). KET QUA: 99 site bound o 45 service file + 39 using. Catalog lon (SNOMED/ClinicalTerms/Countries) DUOC bound; vai FK-scoped (caseId/chainId) bound an toan.
- **Kế**: consolidate 3 báo cáo → review từng site (cổng correctness: soi SecurityService:96 report-take, MasterCatalog reference vs growth,
  CheckMissingForms iterated-build) → áp wave-2 type-(a) rõ ràng + build BE EXIT 0 → cập nhật STATUS. **KHÔNG push** (đợi user duyệt; #354 OPEN tới khi hết wave).
- ⚠️ **Điều phối 4 cửa**: #355/#356 (cùng cha #196) **chồng file** với #354 (khác loại site, cùng service file) → liệt kê file đã đụng khi push, tuần tự merge.
- ⚠️ **TRÙNG #354 GIỮA 2 CỬA (2026-06-28):** cửa-thứ-2 cũng bound 3 site type-(a) sạch TRƯỚC khi thấy section wave-2 này (UNCOMMITTED, build Infrastructure EXIT 0):
  `Reception/...Queue.cs` `GetTodayAdmissions`(MedicalRecords toàn-viện/ngày)+`GetServingList`(QueueTickets) · `Examination/...WaitingList.cs` `GetRoomPatientList`(Examinations).
  Defer aggregate-contaminated→#355 (LIS `GetLabQueueDisplay`, Reception `GetWaitingList`=count-derive). **3 site này nằm trong scan 'subdirs' của cửa wave-2** →
  đề xuất **1 cửa OWN #354, cửa kia đổi task** để khỏi lặp; nếu giữ, gộp 3 site này vào wave-2, tránh sửa lại 2 file đó. State-store: comment trên #354.

## Phiên 2026-06-29..30 (#206 [FE-3] adoption design-system — DONE, build-green, push Closes #206)
- **Hướng B (user chốt):** trích hook thay vì ép SimpleV2Page (premise issue "95% giống" chỉ đúng phần vỏ; ép migrate vi phạm
  behavior-preserving — mất drawer-footer-action / thêm pager / vướng server-filter/CRUD). Thêm `useListData<T>` + `useTabCounts<T>`
  + `makeStatus()` (statusConfigs) vào `_v2kit.tsx` (additive export). **Acceptance đủ:** hook + statusConfigs tồn tại; pilot ≥10 page.
- **Adopt 25 page (behavior-preserving, tsc -b EXIT 0):** 1:1 thay boilerplate `[rows]+load+useEffect`→useListData (loader bọc useCallback,
  ổn-định; call-site load()→reload()) và `counts` useMemo→useTabCounts. Pilot+self: FunctionalDiagnostics·LinenManagement·HealthEducation·
  Asset·Booking·ClinicalGuidance·Culture·MRPlanning·Methadone·Micro·PracticeLicense·Consultation·Insurance·HealthExchange·OfficialDocuments·
  PayrollAdmin. Subagent (Opus, verify lại): EInvoices·EmrDataTags·NationalGateways·DeAn06Liaison·BillingGuarantors·HrDecisions·LISConfig·Quality·EmrCloudSync.
- **Cách làm:** classify 111 page (workflow fan-out, rule stable-loader nghiêm) → adopt MỌI page eligible-an-toàn. Bỏ page **server-side-filter**
  (loader đọc search/date → ép adopt = vỡ behavior) + page **cửa khác đang giữ** (fe-unused-cleanup: AnalyzerInbox/BhxhAudit/InfectionControl/
  InterHospitalSharing/MedicalRecordArchive) + **41 page chưa classify** (agent fail vì rate-limit). → **follow-up** khi cửa kia xong + quota hồi.
- **Verify:** tsc -b EXIT 0 (toàn project); eslint KHÔNG lớp-lỗi-mới (set-state-in-effect/only-export-components = pre-existing _v2kit,
  thuộc #210; `no-irregular-whitespace` Consultation:16/Insurance:18 = pre-existing ngoài diff). Spot-check 7 file (gồm multi-panel) behavior-preserving.
- **4 cửa:** chỉ `git add` file của tôi (25 page + `_v2kit.tsx`); KHÔNG đụng NonDicomCapture(#211)/file cửa khác. Push `Closes #206`.

## Phiên 2026-06-25→27
- **#183 Phase-1 SHIPPED** (`fa4e998`, deploy Cloud Run SUCCESS, live prod): gom **518** `[Authorize(Roles="...")]`
  literal ở **45 controller** → `RoleNames` const (`backend/src/HIS.Core/Constants/RoleNames.cs`), **byte-identical**
  (verify độc lập 45 file/518 attr/0 lệch + build 0 err). Acceptance #1+#3 ✅. **Phase-2 DEFER** (gộp chính tả role +
  FE role-compare — cần DB prod xác nhận chính tả thật; máy này thiếu gcloud). Issue **#183 OPEN**, đã gỡ in-progress.
- **#196 wave-1 type-(a) SHIPPED + CLOSED:** foundation `QueryLimits.DefaultListCeiling=5000` + `QueryBoundExtensions.ToBoundedListAsync`
  (static-logger, wire `Program.cs`) + áp **66 site type-(a)** ở **27 file** (`.ToListAsync()`→`.ToBoundedListAsync("Svc.Method")`).
  Byte-safe, build 0 err, verify: không site nào theo sau bởi aggregate/write-bulk reuse (đã đọc 3 ca SaveChanges → đều method kế bên).
  Pre-flight lộ: ~770 ToListAsync vô biên chia 4 loại — chỉ **(a) list-trả-rows** bound an toàn bằng helper.
  **Decompose** phần còn lại thành issue con: **#354** (a-remaining ~124 file chưa quét) · **#355** (b aggregate-in-memory→SQL, bound=sai số liệu)
  · **#356** (c write-bulk→ExecuteUpdate, bound=update thiếu). **#196 CLOSED** (parent đã decompose).
- **Kế tiếp:** #354/#355/#356 cho phiên sau (b/c cần thận trọng correctness; c đụng write-path cần deploy+smoke).
  Khi tới phase TEST → test thẳng prod his-psi (vòng-6) sau khi xong hết fix/tech-debt.

## Đang dở (uncommitted)
- **Governance: mô hình 4 cửa sổ song song** (2026-06-24): `3b1c57b` PUSHED — `.claude/workflow/parallel-windows.md`
  (4 SOẠN + 1 RUNNER · §2b skill-routing theo tầng · §7 TEST mode) + allocation `20-backlog/test-4window-allocation.md`
  (38 phân hệ+12 luồng+cross→C1-C4) + `session-start.sh` cross-identify (chống nhầm Antigravity, mọi máy) + REGISTRY + vite strictPort.
- **Governance: hoàn thiện cơ chế test 4 cửa** (2026-06-24, đang commit batch): §7 **case T7-T32** (A-I + N1-N10 + R1-R8:
  browser/auth/moving-target/PNG-git/uncapturable/RAM/infra-noise/MCP-drop · plan-drift/PHI/test-id/LLM-rogue-prod/sequence/JWT/disk-C/
  done-metric/test≠fix/migration-mid-test · BOM/manifest-vs-image/animation-flake/viewport/seed-effort/quota/DICOM/integrator-SPOF)
  + **§8 BA TRỤ root-fix** + **§7c STAGING DUYỆT** (data giả logic-nhất-quán, module nhạy cảm→staging) + **gitignore ảnh+`manifest.js`**
  (untrack) + **kế hoạch staging** `20-backlog/staging-plan.md` (Cloud SQL `HIS_staging` + Cloud Run revision + seed-generator + MCP read-only).
  **LINT OK.**
- **Red-team vòng-4 + ĐỊNH VỊ LẠI (2026-06-24, UNCOMMITTED):** verify repo **ĐÃ CÓ ~127 Playwright/Cypress** (`e2e/workflows/00-13`=12 luồng ·
  `e2e-prod/*` prod read-only · `clinical-safety-checks` assert patient-safety) + CI `e2e-prod-smoke.yml`. → **4-cửa-MCP THỪA cho correctness**;
  dùng/mở rộng **suite sẵn có** (deterministic·CI). Ghi **§9 parallel-windows.md** (M1-M10 + demote 4-cửa→optional) + reposition `staging-plan.md`
  (staging = chạy Playwright E2E có-ghi trên seed, KHÔNG phải 4-cửa-MCP; **blocker: máy thiếu gcloud → không provision được từ đây**; spike MCP MOOT).
  **ĐÃ CHỐT mục tiêu (2026-06-24):** correctness/regression = **chạy + mở rộng bộ Playwright/Cypress sẵn có** (CI prod read-only; staging cho E2E có-ghi);
  evidence-screenshot sinh bằng Playwright; 4-cửa-MCP = optional. Đã viết **`20-backlog/staging-runbook.md`** (gcloud provisioning + seed-QUA-APP
  logic-nhất-quán [không SQL thô vì Users/Roles seed trong DatabaseSeeder.cs] + chạy Playwright trên staging) — **user execute ở máy có gcloud**.
  Tất cả UNCOMMITTED (§9 parallel-windows + staging-plan reposition + staging-runbook + STATUS). Kế: commit/push (mọi máy) khi user duyệt.
- **Red-team vòng-5 (verify, UNCOMMITTED):** TỰ BÁC kết luận "suite sẵn có=đủ" (xuống THẤP): suite **rot/hard-skip** ("selector stale/route changed", "seed failed") · **27 test.skip** (skip-if-no-data → **xanh giả**) · **69 file localhost** (bulk cần backend) · seed-via-test **circular**. Khắc phục vào runbook: **§3 validate data-layer (không chỉ schema-drift NR4)** · **§4 seed CHUYÊN DỤNG + seed-verify-gate (NR2/NR3)** · **§5 empirical-1-workflow-trước + đếm skip, SKIP≠PASS (NR1/NR6)**. NR5 (sửa-suite) = backlog fix.
- **EMPIRICAL (2026-06-24, ĐO THẬT — bác bớt round-5):** CI prod-smoke **8/8 success** (21-23/06) · chạy live `e2e-prod/smoke.spec.ts` = **4 passed/0 skip/0 fail** (read-only prod) · audit tĩnh: PW **473 test/10 hard-skip/0 .only**, Cypress **1325/0 skip**. → "suite rot/xanh-giả" (NR1) **CƯỜNG ĐIỆU**; prod-smoke **lành thật**. NHƯNG smoke ≠ correctness (M2 giữ); **pass-rate ~1798 test + logic nghiệp vụ CHƯA đo** (cần backend). Backend local DOWN; provision staging chặn (máy thiếu gcloud).
- **VÒNG-6 — BỎ STAGING + test thẳng prod (2026-06-24, empirical):** prod = no-real-data + đang xây (**deploy 1-3 lần/ngày · 26 commit/3 ngày**) → staging **DEPRIORITIZED** (PHI/pollution moot; schema prod chín > staging fresh). Đo `crud-25groups` (audit serial) prod = **22/23 pass · 1 flaky (opd) · 0 API-err**; 4 nhóm empty-data n/a. **Vehicle ỔN = Playwright serial/CI**, KHÔNG phải **4-cửa-MCP song-song** (bất ổn: prod moving-target + 4-ghi-1-DB + flaky + rot — bỏ-staging KHÔNG fix). **🔴 TRIPWIRE: có data thật/pilot/bán → dừng test-ghi-prod.** Quyết định ghi parallel-windows §9 + staging-plan (DEPRIORITIZED).
- **#192 NotEmptyGuid (phần required-id)** (2026-06-23): tạo `Common/NotEmptyGuidAttribute.cs` + 12 `[NotEmptyGuid]` trên
  required-id non-nullable ở 5 DTO (Payment/Billing/Prescription×2/Reception). Build BE EXIT 0, additive sạch (12 attr+5 using,
  0 dòng logic). An toàn: chỉ reject `Guid.Empty` (đã chắc fail hôm nay → nâng 500/not-found thành 400). **CHỜ user quyết push**
  (cây có việc song song — xem dưới). 6 file tách bạch, `git add` tường minh được.
- ⚠️ **Việc song song CHƯA commit (KHÔNG phải phiên này — nghi Antigravity IDE chạy song song):** #200 CurrentUserAccessor
  (`ICurrentUserAccessor.cs`+`CurrentUserAccessor.cs`+`DependencyInjection.cs` +4 DI) · #215 print-dedup (`utils/printWindow.ts`
  + AnesthesiaPrintTemplates/BirthCertificatePrint/HemodialysisSheetPrint) · ~12 FE (`api/assetManagement|laboratory`,
  9× `pages-v2/*`). **TUYỆT ĐỐI KHÔNG commit/push nhóm này** — chờ user xác nhận.
- 📌 **Đính chính (phiên Claude 2026-06-23):** phần **#200 CurrentUserAccessor** ở dòng trên CHÍNH LÀ việc của
  phiên Claude này (không phải Antigravity) — đã làm **abstraction 1/5**: tạo `ICurrentUserAccessor`
  (`HIS.Application/Common`) + impl `CurrentUserAccessor` (`HIS.Infrastructure/Services`) đọc claim **canonical**
  (NameIdentifier·Name→FullName·Roles) + DI `AddScoped`; adopt **behavior-preserving** (delegate shim) 4 service
  EmrAdmin/EmrManagement/Examination/Reporting (bỏ `_http` dead ở 3, giữ EmrManagement vì còn RemoteIpAddress).
  **Build BE EXIT 0.** Đã **PUSH** commit #200 (KHÔNG `Closes` — task còn 4 abstraction). **Defer (cùng #200):**
  PaginationExtensions→PagedResultDto · ICodeGenerator · AuditLog.WriteAsync · DateRange · adopt RIS(OrAdmin)+~94 controller.
  ⚠️ Phần **#215-print + ~12 FE** ở dòng trên đúng là việc song song của user — phiên này **KHÔNG đụng** (vẫn uncommitted).

## Đã xong gần đây (DONE + PUSHED, origin/main)
- **#291 [audit] CreatedBy create-path advanced** (2026-06-22, CLOSED): luồn `userId` qua 15 Create-method 3 module advanced
  (Community/Forensic/PublicHealth) → `entity.CreatedBy=userId`; 9 file (interface+service+controller). Build BE EXIT 0. Closes #291.
- **#192 [API-1] Range validation request-DTO** (2026-06-22, OPEN-partial): 17 `[Range(0,…)]` chặn money/qty/dose ÂM → auto-400,
  5 DTO (Payment/Billing/Prescription/Reception). Additive, build EXIT 0. **Còn (defer)**: empty-Guid (custom `NonEmptyGuid` attr) +
  DTO money khác (Inpatient/CLS) + smoke neg→400 phiên deploy → GIỮ OPEN.
- **#215 [QA-3] dọn leftover FE antd/print/`:any`** (2026-06-23, **CLOSED**): (1) Space→orientation 4 shared component (`1f4c580`).
  (2) Tách `utils/printWindow.ts` `openPrintWindow()` → migrate 13 file print (8 v2 + 3 component + 2 api) khỏi `window.open+
  document.write`, behavior-preserving. (3) Type 2 `:any` v2 (LabQC/DispensingCounter). Commit **`c5f3352` PUSHED, Closes #215**.
  Build FE EXIT 0. **MOOT #204**: Space/List/print 8 v1 `pages/` (v1 retire). **Defer**: `:any` `_v2kit`(13)+CatalogsAdmin generic (eslint cố ý) · smoke in-thật phiên deploy.
- **#205 [FE-2] tách god-component v2 — SurgeryFormModals** (2026-06-23, **OPEN-partial 1/5**): tách `pages-v2/shared/SurgeryFormModals.tsx`
  (1113 dòng) → folder `surgery-modals/` (1 file/modal + `_shared`) + barrel re-export (importer `Surgery.tsx` KHÔNG đổi); 5 file <500
  (325/315/268/196/55). Pure-move behavior-preserving (giữ useEffect/setTimeout/state, 0 đổi logic). Build FE EXIT 0. Commit **`956509d`
  PUSHED, Refs #205**. **Còn (GIỮ OPEN)**: OpdEditor(1643·68 useState)/Radiology(1461)/Dashboard(1166)/Laboratory(1003) — inline-modal/card, cần smoke phiên deploy.
- **Governance: IN-PROGRESS = CLAIM-FIRST** (2026-06-22): siết ordering — claim NGAY khi chốt task, TRƯỚC pre-flight đo-scope —
  ở `CLAUDE.md` §plan/task + `project-rules.md` §2 bước 3; tách sync-check-nhẹ vs scope-pre-flight-nặng. LINT OK. Gỡ #182 stale.
- **Plugin-routing** (`a3bd364`, 2026-06-22): `.claude/plugins.md` (6 plugin — USE chrome-devtools/playwright MCP ·
  DEFER-to-HIS frontend-design/code-review/github) + touchpoint `skill-routes/fe.md`+`test.md` + REGISTRY owner. LINT OK.
- **Cơ chế "Session Ops" + permission rules** (`f6f2682`, 2026-06-22): `session-ops.md` (mở phiên/model/plan-mode/dọn-context/handoff
  + cheat-sheet 4 permission mode + rule allow/ask/deny) · siết STATUS 447→31 dòng (lịch sử → `90-archive/handoffs/`) ·
  `settings.json` baseline deny/ask/allow (**git commit·push → ASK**, deny đọc secrets) · pointer REGISTRY/SKILL-MAP/README. LINT OK.
- **#195 [PERF-1] AsNoTracking + N+1** — batch 1-4 SAFE (8 file read-only BE), build Infra EXIT 0 (`0d6ba69`/`7198bda`).
  **#195 GIỮ OPEN**: phần còn lại = **N+1 write-path tiền/kho/patient-safety** (Warehouse · BloodBank · PharmacyApproval ·
  Examination/Inpatient Prescriptions · Reception OrdersBilling · Billing) → **DEFER** (cần characterization-test + deploy/smoke).
- **Governance dedup `.claude`** (REGISTRY owner-rows + co-link SKILL-MAP/project-rules) — `15204dc`, LINT OK.
- **#190 [DATA-4]** ngừng nuốt exception tài chính/insurance/signing (41 catch · 9 file) — `454fa82`.
- **#171** tách fat FE api client (barrel re-export, behavior-preserving) — DONE + #171 CLOSED.

## Blocker / chờ user
- **#182** rotate secret (cần quyền Cloud Run) · **#183** role-taxonomy (auth-nhạy-cảm, chờ duyệt phương án) ·
  **#24/#25** credential NCC/R2 · **#22/#113/#133/#134** chờ phần cứng (máy XN / thiết bị).

## Việc kế tiếp
1. **User quyết push #192 NotEmptyGuid** (6 file tách bạch, `git add` tường minh) — đang CHỜ vì cây có việc song song Antigravity.
2. Xác nhận với user nhóm uncommitted #200/#215-print/FE là việc song song của họ → KHÔNG đụng; verify deploy #291/#192-Range đã push.
3. **#195** write-path N+1 (tiền/kho/safety) — làm ở phiên có deploy + smoke (không tự sửa mù).
3. **TEST** (#191/#212/#216-347, label `test`) làm **CUỐI CÙNG** — chỉ sau khi 100% fix/tech-debt DONE. KHÔNG ngoại lệ.
4. **LUÔN** `git fetch` + `git pull --ff-only` + đối chiếu CODE (route/feature/issue đã có chưa) **TRƯỚC** khi pick task (2 máy song song).
