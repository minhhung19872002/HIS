# Tech-Debt Audit toàn hệ thống — 2026-06-17

> Phương pháp: 7 audit-agent song song (read-only) quét BE-services · BE-API/controllers · BE-data/EF/SQL ·
> FE-v1 · FE-v2/design-system · cross-cutting quality · testing+security+patient-safety. Mọi finding có
> evidence `file:line`. **AUDIT-FIRST + SAFE-FIRST**: ràng buộc tối thượng = *xóa nợ KHÔNG được làm vỡ hệ thống
> và KHÔNG phát sinh nợ mới*. Nhiệm vụ = GitHub Issues (#180→). Doc này là plan chi tiết + giao thức an toàn.

## 0. SAFETY PROTOCOL — BẮT BUỘC cho MỌI task tech-debt (chống vỡ hệ thống)

> Mọi Issue tech-debt PHẢI tuân thủ. Vi phạm = không được merge.

1. **1 concern / 1 PR.** KHÔNG trộn refactor (đổi cấu trúc) với change-behavior (đổi logic) trong cùng commit.
   Refactor = behavior-preserving 100%. Sửa lỗi/đổi hành vi = PR riêng, có chủ đích, có test.
2. **Pre-flight impact-analysis** (`core-impact-analysis`): grep tất cả caller/route/DI/contract bị chạm; liệt kê
   blast-radius TRƯỚC khi sửa. KHÔNG sửa file shared khi chưa map hết caller.
3. **Characterization-first cho code rủi ro cao** (tiền/kho/patient-safety/auth): viết test "chốt hành vi hiện tại"
   TRƯỚC khi refactor (đỏ→xanh giữ nguyên). Không có test mạng-lưới → KHÔNG refactor god-file tiền/kho.
4. **Backward-compat**: tách module phải giữ public API (re-export/barrel); đổi DTO/route phải giữ shape cũ hoặc
   versioned. Đổi envelope/contract → cập nhật cả caller trong cùng PR.
5. **Incremental + batched**: chia lô nhỏ, mỗi lô build+test+spot-check rồi mới sang lô kế. KHÔNG big-bang.
   Bulk >20 file → spot-check 3-5 file random (git diff) + audit side-effect (interval/subscribe/state).
6. **Build-gate (chặn cứng)**: BE `dotnet build` 0 err · FE `npm run build` (tsc -b + vite) EXIT 0 · `lint` OK.
   Build pass ≠ behavior preserved → còn cần (7).
7. **Smoke critical flows** sau mỗi thay đổi chạm: login · tạo thanh toán→số dư · refund→ledger · kê đơn→cảnh báo
   an toàn · xuất XML BHXH · ký số · xuất viện. (Khi có test-foundation #TEST → tự động hoá.)
8. **DB/migration an toàn**: script idempotent (IF NOT EXISTS/COL_LENGTH), số tăng dần (max+1), KHÔNG sửa script đã
   apply prod. Sau migrate: `GET /health/schema-drift` → `missingCount=0`. Thay đổi FK/cascade/converter = HARD,
   bắt buộc deploy+smoke + rollback-script.
9. **Rollback plan / mỗi PR**: revert-able (1 commit/concern); thay đổi prod-facing có phương án quay lui rõ.
   KHÔNG xoá file/secret/endpoint khi chưa xác minh không còn dùng (grep + reachability).
10. **Không tạo nợ mới**: KHÔNG `:any`, KHÔNG nuốt exception (`catch{}`), KHÔNG hardcode màu/secret/role,
    KHÔNG copy-paste; tận dụng abstraction sẵn có (`_v2kit`, `SimpleV2Page`, `apiClient`, constants/) thay vì dựng trùng.

## 1. Executive Summary — mức độ nợ

- **Quy mô**: BE 49 file >800 dòng (PopulateDataController 3993, InsuranceXmlService 3219, RISCompleteController 3112…);
  FE v1 god-page 3000+ (Radiology 3374/OPD 3195/Inpatient 3096…); HISDbContext 1285 dòng/503 DbSet.
  FE: 7666 inline-style · 497 console.* · 402 residual hex · 149 v1 pages song song 181 v2 (116-117 trùng tên).
- **Nguy hiểm NHẤT (khai thác/được-ngay hôm nay)**:
  - 🔴 **Secret hardcode** trong `appsettings.json` tracked (SA pwd, JWT key fallback, Orthanc pwd, VNPay HashSecret) +
    `publish/` commit leak lại + 122MB ONNX trùng.
  - 🔴 **Endpoint ẩn danh ghi DB ở prod**: PopulateData/DailySeed/DevLinkRadiology/RIS `dev/*` `[AllowAnonymous]` chạy
    `ExecuteSqlRaw`; **path-traversal** `NonDiconController.GetImage`; **PACS proxy** ẩn danh lộ DICOM BN + cred mặc định.
  - 🔴 **Role-naming drift** ("Quản trị hệ thống" vs "Admin"; RadiologistManager vs RadiologyManager) → phân quyền sai im lặng.
  - 🔴 **Patient-safety**: allergy-check & drug-interaction **KHÔNG enforce** lúc lưu đơn (advisory); KB tương tác rỗng.
  - 🔴 **Data-integrity tiền/kho**: không RowVersion → đua oversell/double-decrement; multi-write thiếu transaction;
    **nuốt exception** giấu lỗi báo cáo tài chính/insurance (trả 0 sạch sẽ).
  - 🔴 **Zero BE unit-test + không CI test-gate** (deploy = build-only, auto prod).
- **Root-cause hệ thống**: (a) thiếu lớp shared (paging/user-context/formatter/status-enum) → copy-paste; (b) thiếu
  guard (lint/test/validation) → nợ tái phát; (c) migration v1→v2 chưa dứt → dual-maintenance; (d) infra tốt sẵn có
  (global exception handler, ApiResponseWrapperFilter, SimpleV2Page, _v2kit, FallbackPolicy auth) bị **bypass**.

## 2. Plan theo TIER → Issue (chi tiết trong từng Issue)

### P0 — An toàn/Bảo mật/Toàn vẹn (làm trước, nhưng vẫn theo SAFETY-PROTOCOL)
| Issue | Task | Evidence chính |
|---|---|---|
| SEC-1 | Gate mọi endpoint dev/seed/populate ẩn danh (env Development + Role Admin) | PopulateDataController:15-18 · DailySeedController:16 · DevLinkRadiologyController:15 · RISCompleteController:190-234 |
| SEC-2 | Path-traversal + auth cho endpoint ảnh/file BN; bỏ cred PACS mặc định | NonDicomController:118-122 · RISCompleteController:600-676 (orthanc default) |
| SEC-3 | Gỡ secret khỏi config tracked + rotate + `git rm -r publish/` | appsettings.json:3,6,19,77 · appsettings.Development.json:3 · publish/* (secrets + 122MB ONNX) |
| SEC-4 | Roles constants (BE+FE) — chuẩn hoá 1 chính tả/role, thay 513 literal | 39 file, "Quản trị hệ thống"×77 vs Admin · RadiologistManager×66 vs RadiologyManager×15 |
| SEC-5 | Request-DTO cho ~25 endpoint bind raw EF entity (chống mass-assignment) | RisCatalog/LisCatalog/EmployeeProfile/RadiologyDispatch/ReceiptBook… [FromBody] BaseEntity |
| SAFE-1 | Enforce allergy-check khi lưu đơn (block/override+log) | ExaminationCompleteService.Prescriptions.cs:50-113,300-339 |
| SAFE-2 | Enforce drug-interaction + seed KB tương tác | Prescriptions.cs:256-297 · DatabaseSeeder (no DrugInteraction) |
| DATA-1 | Bọc transaction cho multi-write tiền/kho | BillingCompleteService.Payments.cs · PharmacyApprovalService · WarehouseCompleteService.Stock* (3/106 dùng tx) |
| DATA-2 | RowVersion concurrency token cho kho + tiền | Core/Entities/* (0 RowVersion) · WarehouseCompleteService.StockOut.cs:133,272 |
| DATA-3 | Guard amount<=0 cho refund/deposit/payment | BillingCompleteService.Payments.cs:535-575 (chỉ chặn over, không chặn <0) |
| DATA-4 | Ngừng nuốt exception giấu lỗi tài chính/insurance (log+rethrow/typed-fail) | BillingCompleteService.AdminReports.cs:56…826 · InsuranceXmlService.cs:1163…2693 (~123 catch) |
| TEST-1 | BE xUnit project + CI `dotnet test` gate (chặn deploy nếu đỏ) | backend không có *Tests.csproj · deploy-backend.yml:54-67 build-only |

### P1 — Đúng đắn API · hiệu năng EF · audit
| Issue | Task | Evidence |
|---|---|---|
| API-1 | DataAnnotations validation (money/qty/id) + bật auto-400 | DTOs/** 0 [Range]/[Required] · 130 controller [ApiController] inert |
| API-2 | Chuẩn hoá envelope + error-contract (hết double-wrap & 3 shape lỗi) | ApiResponseWrapperFilter.cs:16-41 · 33 controller `Ok(new{success=})` · 200/20/5 shape lỗi |
| API-3 | Gỡ 224 per-action catch rò `ex.Message`, để global handler xử lý | ReceptionCompleteController (50) … Program.cs:226-237 |
| PERF-1 | Sweep AsNoTracking read-path + fix N+1 trong vòng lặp ghi | 33/106 dùng AsNoTracking · WarehouseCompleteService.StockIn.cs:48 FindAsync trong foreach (+11 file) |
| PERF-2 | Chặn ToListAsync vô biên (pagination/Take ceiling) | ~770 ToListAsync không Skip/Take |
| DATA-5 | HISDbContext hardening: tách config, thay blanket Cascade→ClientNoAction bằng per-rel, converter từ schema, chuẩn UTC | HISDbContext.cs:1200-1256,1275 |
| AUDIT-1 | Audit field-level diff + mở rộng coverage + ghi tin cậy | AuditLogMiddleware.cs:130-218 |
| DATA-6 | Migration hygiene: archive 89 legacy-sql, fix prefix `44` trùng, doc gap | scripts/legacy-sql/* · Data/Scripts/44_*×2 · gap 64/71/127 |

### P2 — Cấu trúc (behavior-preserving) BE & FE
| Issue | Task | Evidence |
|---|---|---|
| REFAC-1 | Shared infra: ICurrentUserAccessor + PagedResultDto<T> + ICodeGenerator + audit-helper + DateRange | 53 service tự paging/26 PagedResult · GetCurrentUserId divergent ×5 |
| REFAC-2 | BE service god-file split wave (partial-class, no-behavior-change) | InsuranceXml/NangCap23/ExtendedServiceImpl/HospitalReport/ReportingComplete/BusinessAlert/SystemComplete.M13,M17 |
| REFAC-3 | Thin controllers + tách god-controller; bỏ DbContext trong controller | RISComplete/Examination/SystemComplete/Inpatient/LIS · RisCatalog/LisCatalog/EmployeeProfile inject DbContext |
| REFAC-4 | DTO hygiene: tách god-DTO, dedupe DTO trùng, dời DTO inline-controller, đổi tên Supplementary2/Missing | RISCompleteDTOs 2667 · ServiceOrderItemDto ×3 · 13 inline DTO/controller |
| FE-1 | Quyết định sunset v1 + nghỉ hưu theo lô v1 đã có v2-parity | App.tsx 2 cây route · 116-117 trùng tên · DicomViewer v2 import v1 |
| FE-2 | Tách FE god-component (v2 OpdEditor 1643/Radiology 1461/Dashboard 1166/Laboratory/SurgeryFormModals; v1 stalled) | đã extract helper, body vẫn monolith |
| FE-3 | Adoption design-system: SimpleV2Page/CrudModal/DataTable + hook useListData/useTabCounts + statusConfigs | 116/181 hand-roll list · 1/181 dùng LoadingState |
| FE-4 | Async-state primitives (LoadingState/ErrorState) + fix `.then` nuốt lỗi | 99 page raw 'Đang tải…' · 32 `.catch(()=>{})` · 325 floating `.then` |
| FE-5 | Token scale (typography/spacing/z-index/width) + ab-u-* + dứt hex/var-fallback | 1400+ fontSize · 1422 spacing · 62 `var(--x,#hex)` · 7 ab-u- users |
| FE-6 | v1 raw-fetch/manual-JWT → apiClient; shared formatter; status-enum; PrintHeader từ config | Inpatient/OPD raw fetch · 50+ toLocaleString · 554 magic status · hospital.ts under-used |

### P3 — Chất lượng/Hygiene + Test mở rộng
| Issue | Task | Evidence |
|---|---|---|
| QA-1 | Bật lint (no-console/no-unused/no-explicit-any) + logger util + sweep 497 console.* + floating-promise | eslint.config.js chỉ guard hex · tsconfig noUnusedLocals:false |
| QA-2 | Repo hygiene: gỡ scratch (ghinho.txt/test-*.ps1/*.tmp.txt), localhost-URL→config, CORS clutter, ẩn default-cred login | root scratch · config/api.ts fallback ×N · appsettings CORS localhost · Login.tsx:203 |
| TEST-2 | FE vitest + unit (envelope-unwrap/format/validation) | package.json no vitest |
| TEST-3 | E2e functional khẳng định kết-quả (tiền/lâm sàng) + scope intercept | cypress smoke-only · 18 intercept('**/api/**') |
| SAFE-3 | Dose-range validation (max/pediatric/renal) high-risk drug | Medicine.cs:56-63 free-text dosage |
| AUDIT-2 | (gộp AUDIT-1 nếu nhỏ) field-diff + coverage GET nhạy cảm | AuditLogMiddleware.cs:32-40 |

## 3. Thứ tự đề xuất
1. **P0 security có-thể-khai-thác**: SEC-1, SEC-2, SEC-3 (rotate secret), SEC-4 — đồng thời **TEST-1** (lưới an toàn) vì các fix sau cần nó.
2. **P0 patient-safety**: SAFE-1, SAFE-2 (sau khi có test gate).
3. **P0 data-integrity tiền/kho**: DATA-3 (nhanh), DATA-1, DATA-2, DATA-4.
4. **P1** API/PERF/AUDIT/migration.
5. **P2** cấu trúc (chỉ sau khi có characterization-test cho vùng tiền/kho/safety).
6. **P3** hygiene/test mở rộng (làm xen kẽ, rủi ro thấp).

> Mỗi Issue có chi tiết: Bối cảnh(evidence) · Mục tiêu · Phạm vi IN/OUT · **An toàn (pre-flight/behavior-preservation/verify/rollback)** · Acceptance · Blast · Effort · Dependency. Tất cả trỏ về SAFETY-PROTOCOL mục 0.
