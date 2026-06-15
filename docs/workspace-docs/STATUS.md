# STATUS — đang ở đâu · blocker · việc kế tiếp

> 🔗 **TASK/PLAN quản lý trên GitHub Issues** (repo `minhhung19872002/HIS`): `gh issue list`.
> File này CHỈ giữ **session-state** cho hook — KHÔNG ghi backlog/plan/lịch sử dài vào đây.

> Cập nhật cuối: **2026-06-15** (SÓNG 4: 4 feature đã push+deploy, VERIFY schema-drift=0 + smoke 200; #98 REVERTED).

## Đang ở đâu
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
