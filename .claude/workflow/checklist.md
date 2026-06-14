# SOFTWARE DELIVERY CHECKLIST — Cổng giao hàng

> **Đây là view checklist** gom theo nhóm, mỗi mục **trỏ về rule gốc** (nguồn-sự-thật). KHÔNG phải bộ rule
> mới. Nguồn: `SKILL-MAP.md` (P0/P1/P2), `skills/his-qa-anti-pattern` (#1-30), `skills/his-fe-convention`,
> `skills/core-*`. Khi mâu thuẫn → theo nguồn gốc.
>
> Áp ở bước **5·VERIFY** + **6·REVIEW** + **7·COMPLETE** của [`workflow.md`](workflow.md). Mục **🔴 = P0
> tuyệt đối** (vi phạm = chặn DONE).

---

## A. Requirement (bước 1 UNDERSTAND)
- [ ] Hiểu đúng yêu cầu nghiệp vụ → `core-requirement-clarify`
- [ ] Restate yêu cầu bằng lời đơn giản (ghi `requirement_restated` ở [`task.md`](task.md))
- [ ] Nêu thông tin còn thiếu / câu hỏi mở; mơ hồ → **STOP hỏi**, không đoán
- [ ] Ghi giả định (`assumptions`) + rủi ro (`risks`)

## B. Design / Impact (bước 2 ANALYZE + 3 PLAN)
- [ ] Đã rà kiến trúc & tiền lệ hiện có → `core-architecture-consistency`, `core-architecture-follow`
- [ ] 🔴 **Verify-before-assert**: không bịa file/symbol/endpoint/field/cột DB → `core-verify-before-assert` (SKILL-MAP P0 #2)
- [ ] Bản đồ tác động (callers/contract/test/migration) trước khi sửa code dùng chung → `core-impact-analysis`
- [ ] Impact DB / API / auth / UI / integration đã liệt kê (`impact` trong state-store)
- [ ] Có `file_allow_list` + done-criteria từng bước

## C. Implementation (bước 4 IMPLEMENT)
- [ ] 🔴 **Reuse-first**: tìm code/thư mục đã có → dùng lại/mở rộng, không tạo trùng → `core-reusable-code` (P1 #9)
- [ ] Chỉ sửa file cần thiết, trong `file_allow_list`; không over-refactor → `core-minimal-change`
- [ ] Không dead code / không logic trùng / clean-code mức hàm → `core-clean-code`
- [ ] Theo convention (naming/layer/Antd-first) → [`project-rules.md`](project-rules.md), `his-fe-convention`
- [ ] 🔴 **Đăng ký DI** service/controller mới → `DependencyInjection.cs` (P0 #4, his-qa #1)
- [ ] 🔴 File đặt **đúng thư mục**, KHÔNG ở root → his-qa #28-29 (P0 #8)
- [ ] Giữ stack — KHÔNG CQRS/MediatR/Next.js/Tailwind-first; migration SQL tay idempotent → his-qa #2-4 (P1 #15)

## D. Quality (bước 6 REVIEW)
- [ ] **Self-review 9 điểm** (duplicate logic · dead code · hard-code · anti-pattern · component/service quá lớn · function quá dài · import cycle · naming · state mgmt) BE+FE → his-qa #30 (P1 #10)
- [ ] Không lỗi logic / runtime đã biết
- [ ] Edge case + error handling đã rà → `core-error-loading-state`
- [ ] Tách layer (UI · api/service · state · validation · mapper · constants) → `his-fe-convention` §2,§8 (P1 #11)

## E. Security & Patient-safety (🔴 P0)
- [ ] 🔴 Giữ check tương tác thuốc / dị ứng / chống chỉ định; mapping Patient↔MedicalRecord↔Order đúng → his-qa #20-22 (P0 #1)
- [ ] 🔴 **Validate ở BE** (không tin client) → `core-validation-pattern` (P0 #7)
- [ ] 🔴 Auth/authz + route guard, không hardcode role → `his-fe-convention` §9 (P1 #16)
- [ ] 🔴 KHÔNG hardcode credentials/secret/connection string/token; tên BV/URL → constants/env → his-qa #16-18 (P0 #5)
- [ ] 🔴 Giữ audit log mutation; `CreatedBy` user thật (≠ `Guid.Empty`); role-guard HSBA → his-qa #23-26 (P0 #6)

## F. Performance (P2 — chỉ khi đo được)
- [ ] Query đắt / N+1 / payload lớn đã xem (khi có dấu hiệu tải) → `his-be-scalability`
- [ ] Lazy/code-split/memo/virtualize **đúng chỗ, đo trước** — KHÔNG tối ưu non → `his-fe-performance` (P2 #19)

## G. Testing (bước 5 VERIFY)
- [ ] 🔴 **BUILD-GATE**: build sạch tầng đã đụng MỚI báo xong — FE `npm run build` EXIT 0 · BE `dotnet build` 0 errors → his-qa #27 (P0 #3)
- [ ] Lint / typecheck sạch (build-gate = `npm run build`, KHÔNG `tsc --noEmit`)
- [ ] Chức năng cũ không bị ảnh hưởng (regression) → `core-testing-architecture`, `his-quality-reviewer`
- [ ] 🔴 **Logic mới chạm tiền / thuốc / schema / contract / patient-safety → BẮT BUỘC ≥1 test (unit/integration/e2e) PASS** (ghi `verification`). Logic khác: test bổ sung khuyến nghị (`core-testing-reuse`).

## H. Completion (bước 7 COMPLETE) — cổng DONE
- [ ] 🔴 Yêu cầu thoả mãn (khớp `goal` + `completion_criteria`)
- [ ] 🔴 VERIFY + REVIEW xong, **không còn `must_fix`**
- [ ] Báo cáo cuối (7-part) viết xong → Finalizer
- [ ] State-store sync về **GitHub Issue**
- [ ] 🔴 **KHÔNG tự commit/push** — dừng `READY_FOR_PUSH`, xin phép; `DONE` chỉ sau khi push OK (SKILL-MAP §0c)

> **Task chỉ được đánh `DONE` khi MỌI mục 🔴 pass + nhóm H đủ.** Còn 🔴 fail → giữ `IN_PROGRESS`/`REVIEW`.

## I. Requirement coverage (CHỈ khi task = rà soát / đối chiếu tài liệu / gap analysis / "đã đủ chưa")
> Chi tiết: [`requirement-coverage.md`](requirement-coverage.md). Áp khi lập backlog từ `docs/requirements/**`.
> ⚠️ **Các 🔴 dưới = P0 CÓ-ĐIỀU-KIỆN (chỉ chặn DONE KHI task thuộc loại rà-soát)** — KHÁC 🔴 P0-LUÔN-ÁP ở mục E (an-toàn-BN/secret). Task code thường KHÔNG áp mục I.
- [ ] 🔴 **Source manifest 100%** — đã liệt kê + đọc HẾT mọi nguồn (`requirements/00·10·20·30·90` + `luong_nghiep_vu`); không còn ⬜/⚠️
- [ ] 🔴 **Đọc PDF gốc** nếu `.md` trích rỗng/hụt (không tin bản trích)
- [ ] 🔴 **Enumerate đủ** từng mục/feature/form (không tóm tắt "trọng yếu"); mỗi mục có evidence
- [ ] 🔴 **Phương châm parity**: đối thủ-có→P0/P1 bắt buộc · không-có-nhưng-cần→P2 (ghi lý do) · không-có-không-cần→KHÔNG tạo
- [ ] 🔴 **Dedup** vs `gh issue list` + "đã DONE trong code" trước khi tạo
- [ ] 🔴 **Completeness critic** chạy xong + tách VERIFIED/ASSUMED → KHÔNG nói "đủ" khi manifest chưa 100%
