# Session handoff — 2026-06-28..29 (cửa OPUS, tech-debt refactor wave)

> Mục đích: ghi chú task **KHÔNG làm được trên máy này** (thiếu gcloud → không deploy+smoke) để **máy có deploy** tiếp tục.
> Task board = GitHub Issues. Filter nhanh việc còn lại: `gh issue list --label needs-deploy-smoke`.
> Cross-ref: `20-backlog/tech-debt-roadmap.md` · `10-assessment/rule-compliance-audit.md` · skill `his-tech-debt-workflow`.

## A. ĐÃ HOÀN TẤT phiên này (shipped prod, build-green, deploy-success, behavior-preserving)

| Issue | Việc | Commit |
|---|---|---|
| **#354** [PERF-2a] | Bound 99 list-endpoint type-(a) qua `ToBoundedListAsync`. **Verify đối kháng 43 agent** bắt **8 site bound-nhầm** (aggregate/Contains/legal-register/auth-creds) → revert. 99 site SAFE. | `cf8962f` |
| **#201** [REFAC-2] | Tách 7 BE god-service (NangCap23/Insurance/Reporting/HospitalReport/BusinessAlert/SystemM13/M17) → 36 file <800. Byte-identical. | `a50123a` |
| **#203** [REFAC-4] **CLOSED** | DTO hygiene trọn vẹn: 11 god-DTO split <800 + **198 inline-DTO** ra khỏi 48 controller (→ `HIS.API/Dtos/<Ctrl>` per-controller namespace né collision) + dedupe **8 DTO divergent rename role-specific** (KHÔNG merge — patient-safety) + grab-bag rename. Đủ 4 acceptance. | `dd32718`→`721316d` |
| **#202** [REFAC-3] (split-part) | Tách **14 god-controller** → partial <800 (RISComplete + 12 prod + PopulateData dev). | `8ab3a52`,`8602ed6`,`54ce38b` |

**Verify chuẩn (ground-truth, không tin report agent 1 chiều):** build EXIT 0 mọi bước · route-attr `[Http*]` GLOBAL **2919==2919** · string-literal Vietnamese **6764==6764** · mojibake=0.

## B. ĐANG DỞ
Không. Toàn bộ work của cửa này đã commit+push (origin HEAD `54ce38b`, cây sạch phần backend của tôi).

## C. CHƯA LÀM — DEPLOY-GATED (label `needs-deploy-smoke`, KHÔNG đóng)

Tất cả đều **thay đổi hành vi / correctness** → BẮT BUỘC build+deploy+smoke để verify. Máy này thiếu gcloud nên KHÔNG làm an toàn được.

| Issue | P | Việc | Vì sao cần smoke |
|---|---|---|---|
| **#202** thin-part | P2 | Bỏ DbContext khỏi controller, đẩy logic→service; 2 file atomic-method còn >800 (`DailySeedController` 1346, `PopulateDataController.Finishing` 1276) cần extract-helper | Đổi luồng/contract; issue ghi "smoke từng endpoint + deploy+smoke + Phụ thuộc TEST-1" |
| **#195** | P1 | N+1 write-path (Warehouse/BloodBank/PharmacyApproval/Prescriptions/Billing) | Write-path tiền/kho/patient-safety; cần characterization-test + smoke |
| **#197** | P1 | HISDbContext hardening (cascade/converter/UTC/split-config), LÀM TỪNG PHẦN 4 PR | Đổi schema/cascade → migration + smoke |
| **#355** | P2 | Aggregate-in-memory → SQL (load-all rồi count/sum/group) | Đổi cách tính → SAI số liệu nếu lệch semantic; so kết quả cần DB chạy |
| **#356** | P2 | Write-bulk load-then-loop-save → ExecuteUpdate | Write-path; update thiếu nếu sai |
| **#193** | P1 | Chuẩn hoá response envelope + error-contract | Đổi shape JSON → vỡ FE (envelope từng làm sập login prod); smoke FE↔BE |
| **#198** | P1 | Audit-log field-diff + coverage GET nhạy cảm | Đổi pipeline audit; verify ghi đúng cần chạy thật |
| **#214** | P3 | Dose-range validation (max/pediatric/renal) thuốc nguy cơ cao | Thêm logic chặn kê đơn → patient-safety, smoke kẻo chặn nhầm đơn hợp lệ; Phụ thuộc TEST-1 |

**Thứ tự ưu tiên đề xuất khi có deploy:** #202-thin → #195 → #197 → #355/#356 → #193 → #198 → #214.

## D. CŨNG CHỜ (ngoài deploy-gate)
- **FE** (#206/#210/#211/#353): cửa khác đang giữ lock — KHÔNG đụng.
- 🔴 **Regression patient-safety (cửa #353 phát hiện):** `PatientFlagBanner`+`BusinessAlertPanel` chỉ có ở v1, THIẾU ở `pages-v2` → v2 mất cảnh báo cờ BN + alert nghiệp vụ. Đề xuất tạo **issue fix P0** liên kết #353 (chờ user duyệt).
- **TEST** (#191/#212/#216-347...): làm CUỐI cùng, chỉ sau khi hết fix OPEN.

## E. KEY DECISIONS (để phiên sau khỏi debate lại)
1. **God-file split = behavior-preserving move** (KHÔNG đổi logic): multi-class → 1 file/class; single-class → partial-class group theo `#region`/method-boundary; `#region` directive **drop** (cosmetic, tránh CS1027/CS1028). Verify = build + reassembly + route/string-literal count.
2. **Encoding BẮT BUỘC `[System.IO.File]::ReadAllLines(path, UTF8)` + `WriteAllLines(..., UTF8Encoding($false))`** — KHÔNG dùng `Get-Content` (PS 5.1 đọc UTF-8 thành ANSI → mojibake; đã làm CS1012 ở char-literal BOM). Agent dùng Edit/Write = encoding-safe.
3. **Dedupe DTO divergent = RENAME role-specific, KHÔNG merge** (merge drop field patient-safety/insurance → vỡ contract thuốc/tiền).
4. **Bound list = conservative skip-when-uncertain** (failure-mode bất đối xứng: bound nhầm aggregate = SAI số liệu; bỏ sót = lành).
5. **Multi-agent: verify ground-truth (build + count), KHÔNG tin report 1 chiều** — verify đối kháng #354 bắt 8 bug compiler/grep bỏ lọt.

## F. SKILL / MEMORY
- Dùng `his-tech-debt-workflow` + `his-flow-multi-agent-orchestration` (objective-gate = build-green) + `core-critic` (adversarial verify).
- Bài học encoding (mục E.2) đáng cân nhắc thêm vào skill split nếu lặp lại.

## G. GOTCHA
- Máy này (D:\) **thiếu gcloud → KHÔNG deploy/smoke được** (gốc của mọi defer trên).
- **Atomic method >800 KHÔNG split byte-identical được** (1 method không cắt qua partial) → cần extract-helper = logic-refactor + smoke.
- Đa cửa song song: chỉ `git add` file tường minh của mình; window-lock `.claude/window-lock.ps1 claim <issue>`; STATUS.md/governance do cửa khác sửa — KHÔNG giành.
