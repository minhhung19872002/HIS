# Kế hoạch dựng STAGING — khắc phục TRIỆT ĐỂ cho test 4 cửa (Trụ #1)

> **Vì sao:** [`.claude/workflow/parallel-windows.md`](../../../.claude/workflow/parallel-windows.md) §8 — staging + data giả là root-fix tắt cùng lúc
> **N2** (PHI thật vào ảnh) · **N5** (hỏng sequence prod) · **N10** (schema đổi giữa run) · **F** (ép error/empty) · **D** (đóng băng version) · **R5/R7**.
> Hai rủi ro KHÔNG vá được bằng quy trình (PHI + LLM tự-ghi-prod) **bắt buộc** cần staging. Đây là **kế hoạch** (chưa thực thi).
> ⚠️ Test làm CUỐI; staging là **hạ tầng chuẩn bị** — dựng được sớm, nhưng **chạy test** vẫn gated sau khi mọi fix DONE.

## 1. Mục tiêu
Một môi trường **giống prod nhưng ghi thoải mái + data GIẢ logic-nhất-quán + reset được**, để chạy **12 luồng E2E + state ép + module nhạy cảm** mà KHÔNG đụng prod/PHI thật. 4 cửa test ghi song song an toàn (mỗi cửa 1 domain data).

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
