# Kế hoạch dựng STAGING — khắc phục TRIỆT ĐỂ cho test 4 cửa (Trụ #1)

> **Vì sao:** [`.claude/workflow/parallel-windows.md`](../../../.claude/workflow/parallel-windows.md) §8 — staging + data giả là root-fix tắt cùng lúc
> **N2** (PHI thật vào ảnh) · **N5** (hỏng sequence prod) · **N10** (schema đổi giữa run) · **F** (ép error/empty) · **D** (đóng băng version) · **R5/R7**.
> Hai rủi ro KHÔNG vá được bằng quy trình (PHI + LLM tự-ghi-prod) **bắt buộc** cần staging. Đây là **kế hoạch** (chưa thực thi).
> ⚠️ Test làm CUỐI; staging là **hạ tầng chuẩn bị** — dựng được sớm, nhưng **chạy test** vẫn gated sau khi mọi fix DONE.

## 0. ⚠️ ĐỊNH VỊ LẠI (red-team vòng-4, 2026-06-24)
Repo **ĐÃ CÓ ~127 test Playwright/Cypress** (`e2e/workflows/00-13` = 12 luồng · `e2e-prod/*` prod read-only · `clinical-safety-checks` assert patient-safety) + CI `e2e-prod-smoke.yml`. → **Staging KHÔNG phải để chạy 4-cửa-MCP thủ công**, mà để **chạy bộ Playwright E2E workflow SẴN CÓ (có ghi) trên DB seed an-toàn** + sinh evidence-screenshot bằng Playwright. 4-cửa-MCP demote → optional (parallel-windows.md §9).
> **TRƯỚC khi dựng:** chốt **"test để LÀM GÌ"** (compliance/correctness/regression). Nếu chỉ cần correctness → có thể chỉ cần **chạy suite sẵn có trong CI**, chưa chắc cần staging riêng.

## 1. Mục tiêu
Môi trường **giống prod, ghi thoải mái, data GIẢ logic-nhất-quán, reset được** để **chạy các Playwright E2E workflow có-ghi (00-13) + module nhạy cảm** mà KHÔNG đụng prod/PHI thật.

## 1b. ⚠️ Blocker thực thi (máy này)
**Máy hiện tại THIẾU `gcloud`/auth** (memory `reference_local-dev-env`) → **KHÔNG provision được Cloud SQL/Cloud Run từ đây**. Phần `gcloud create/deploy` phải chạy trên **máy có gcloud auth**. Spike MCP (đề xuất cũ) **MOOT** — Playwright đã chứng minh automation chạy được trên app này.
> **▶ Runbook thực thi từng bước (gcloud + seed-qua-API + chạy Playwright) = [`staging-runbook.md`](staging-runbook.md)** — bạn execute ở máy có gcloud.
> **Seed = QUA APP, không SQL thô:** Users/Roles seed bằng `DatabaseSeeder.cs` + hashing `AuthService.cs` → SQL tay sai hash/FK. Seed logic-nhất-quán = **chạy create-flow E2E sẵn có** (app tự enforce) + tạo account role `ZZTEST_*` qua admin API (runbook §4).

## 2. Kiến trúc (tái dùng hạ tầng sẵn — rẻ, KHÔNG tốn RAM local)
| Thành phần | Cách dựng | Ghi chú |
|---|---|---|
| **DB** | **Cloud SQL DB riêng `HIS_staging`** trên **CÙNG instance** đang chạy (không dựng instance mới) | Rẻ; cô lập data khỏi DB `HIS` prod |
| **Backend** | **Cloud Run revision/service `his-api-staging`** = image hiện tại, env `DefaultConnection` → `HIS_staging` | `ProductionSchemaRepairRunner` tự tạo schema lúc startup (đã có) |
| **Frontend** | Vercel **preview env** HOẶC dùng FE hiện có trỏ `VITE_API_URL` → URL staging | FE đã env-driven (`config/api.ts`) |
| **PACS/Redis** | Orthanc/Redis **dùng chung** + **data DICOM giả** (vài study mẫu) cho RIS (R7) | Hoặc mock; không đụng R2 prod |
| **Đóng băng version** | Staging deploy **thủ công** (không auto theo main) lúc test → sửa D/N10 | Pin tag image khi chạy |

## 3. Seed-generator data GIẢ (R5 — task LỚN nhất, đừng coi nhẹ)
"Data giả miễn hợp logic" = phải **tôn trọng FK + business-state** xuyên 485 bảng để flow chạy:
- Bộ BN giả (prefix `ZZTEST_`) + `MedicalRecord` + BHYT hợp lệ + `Orders`/`Results`/`Prescriptions`/`Receipts`… **liên kết đúng** để 12 luồng E2E pass vì-đúng chứ không vì-thiếu-data.
- **Idempotent reset + re-seed** (chạy lại ra cùng trạng thái → **tái hiện** evidence).
- Phủ đủ **38 phân hệ + 12 luồng + cross** (mỗi luồng có sẵn data đầu vào).
- Module nhạy cảm (HIV/Lao/Pháp y/Tâm thần) → **chỉ BN giả** (giải N2).
- Dạng: script SQL seed `Data/Scripts/seed_staging_*.sql` (idempotent) HOẶC generator code chạy 1 lần.

## 4. Cấu hình MCP cho cửa test (Trụ #2 + #3)
- **Prod windows:** MCP **allow-list READ-ONLY** (navigate/snapshot/screenshot/đọc console-network); CHẶN click-submit/fill/upload/accept-dialog/`evaluate`/`run_code` (T18/N4).
- **Staging windows:** cho phép ghi (đã cô lập).
- **Mọi cửa:** headless · pin viewport 1920×1080 (T28) · `user-data-dir`+downloads+output **sang D:** (T21) · wait-for-stable trước capture (T27) · cửa capture chạy **Sonnet/Haiku** (T30).
- **Reconciliation gate (T15):** verify route/màn với `App.tsx` thật TRƯỚC khi chụp.

## 5. Phases (đề xuất — tạo GitHub issue khi lên lịch chạy)
1. **P1** — Tạo DB `HIS_staging` + Cloud Run `his-api-staging` trỏ DB đó; verify `/health/schema-drift`=0.
2. **P2** — **Seed-generator** logic-nhất-quán (việc nặng nhất) + reset/re-seed idempotent.
3. **P3** — Wiring FE (env `VITE_API_URL` staging) + smoke login.
4. **P4** — MCP config (allow-list read-only prod / write staging · viewport · D: · wait-stable).
5. **P5** — Chạy thử **1 luồng E2E** (vd F-OPD) end-to-end → verify evidence + reset.

## 6. Effort / rủi ro
- **Nặng nhất = P2 seed-generator** (R5): logic-nhất-quán xuyên nhiều bảng là việc thật, không freebie.
- Chi phí cloud: 1 DB cùng instance + 1 Cloud Run revision (min-instances=0) → thấp.
- Rủi ro: seed thiếu nhất-quán → flow fail giả → cần verify seed trước khi tin kết quả test.
- Cross-ref: cơ chế chạy = `parallel-windows.md` §7-§8; chia 4 cửa = [`test-4window-allocation.md`](test-4window-allocation.md).

> **Gating:** dựng staging (P1-P4) làm được khi rảnh; **chạy test thật (P5+)** chỉ sau khi 100% fix/tech-debt DONE (rule `CLAUDE.md`).
