# STATUS — đang ở đâu · blocker · việc kế tiếp

> 🔗 **Task board = GitHub Issues** (`minhhung19872002/HIS`): `gh issue list`. File này CHỈ giữ
> **session-state NGẮN cho hook** — KHÔNG ghi backlog/plan/lịch sử dài. Quy tắc giữ-ngắn + vòng đời
> context (mở phiên · chọn model · plan-mode · dọn context · handoff): [`.claude/workflow/session-ops.md`](../../.claude/workflow/session-ops.md).
> 📜 Lịch sử phiên 2026-06-13→21: [`90-archive/handoffs/session-2026-06-21-handoff.md`](90-archive/handoffs/session-2026-06-21-handoff.md).
>
> Cập nhật cuối: **2026-06-30**.

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
