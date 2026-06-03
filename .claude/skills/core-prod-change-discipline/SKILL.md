---
name: core-prod-change-discipline
description: Use this portable, tech-agnostic skill as the end-to-end Tech-Lead discipline for any change to a running/production system, wrapping the whole task lifecycle. Triggers include any feature, bug fix, refactor, migration, config/infra change, or "fix this in production" — especially risky/hard-to-reverse changes touching auth, money, schema, or contracts. It orchestrates the existing discipline skills (core-requirement-clarify, core-impact-analysis, core-minimal-change, core-code-change-workflow, core-architecture-follow, core-execution-output) and ADDS what they don't fully cover: find the root cause with evidence before fixing (no symptom-patch, no temp workaround unless asked); when several solutions exist present at least 3 options, each with pros/cons/complexity/risk/cost, then recommend one; self-critique the chosen solution (simpler? lower risk? breaks architecture? adds tech-debt? hurts performance?); a full pre-done verification gate (lint + typecheck + build + unit + integration + e2e as available — never claim done unverified); a 7-part completion report (work done, files changed, blast radius, residual risks, deferred work, tech-debt found, rollback plan); and the quality priority order correctness > stability > maintainability > security > performance > code-aesthetics. Do NOT use as a substitute for the specific skills it links (route to them for the mechanics), nor to gate trivial Q&A.
metadata:
  type: core
---

# Core — Production Change Discipline (portable)

> TẦNG: **A · CORE** (portable, tech-agnostic). Playbook **Tech-Lead chịu trách nhiệm hệ Production** cho
> MỌI thay đổi. **KHÔNG copy** skill khác — **LINK** chúng + đóng **5 gap** (G3/G6/G9/G10/G11).
> Hành xử như người chịu trách nhiệm cuối: đúng > ổn định > còn lại.

## Khi nào dùng
- Bất kỳ feature / bug fix / refactor / migration / đổi config·infra / "sửa lỗi production".
- Ưu tiên khi thay đổi **rủi ro cao / khó rollback / chạm auth·tiền·schema·contract**.

## Khi nào KHÔNG dùng
- Q&A / giải thích / tra cứu thuần (không thay đổi gì). Mechanics cụ thể → skill được link.

## Vòng đời 1 thay đổi (mỗi bước → skill phụ trách)
1. **Làm rõ** yêu cầu, liệt kê thiếu, mark **UNKNOWN**, không suy diễn → `core-requirement-clarify`.
2. **Phân tích → plan TRƯỚC code** (yêu cầu/scope/dependency/rủi ro/kiến trúc) → `core-impact-analysis` + `core-code-change-workflow` + `core-architecture-follow`. Chưa viết code.
3. **(Bug) Root cause + bằng chứng** → **G3** dưới.
4. **Blast radius** (file·module·API·DTO·DB·auth·authz·UI·test) → `core-impact-analysis`.
5. **Thay đổi nhỏ-nhất an-toàn-nhất**, không out-of-scope (refactor/kiến trúc/contract/DB/rename hàng loạt) → `core-minimal-change` + SKILL-MAP §5b.
6. **≥3 phương án khi nhiều cách** → **G6**.
7. **Kiểm soát scope**: việc mới ngoài plan → KHÔNG tự làm, báo cáo, **tách task riêng** → `core-minimal-change` + `his-tech-debt-workflow`.
8. **Tech-debt phát hiện**: mô tả/nguyên nhân/mức độ/hướng xử lý/ưu tiên, **không auto-fix** chưa duyệt → `his-tech-debt-workflow`.
9. **Tự phản biện** trước khi chốt → **G9**.
10. **Cổng verify đủ** trước khi báo xong → **G10**.
11. **Báo cáo 7 phần** → **G11**.
12. **Thứ tự ưu tiên chất lượng** → **G12**.

## 5 rule bổ sung (đóng GAP)

### G3 · Root cause trước khi sửa
Lỗi hệ thống: xác định **nguyên nhân GỐC** + **bằng chứng** (log / repro / diff / trace) + giải thích **WHY**.
**KHÔNG** chữa triệu chứng. **KHÔNG** workaround tạm — trừ khi user yêu cầu rõ (ghi rõ là tạm + nợ phải xử).

### G6 · ≥3 phương án khi có nhiều cách
Khi >1 cách hợp lý → trình **tối thiểu 3 phương án**, mỗi cái nêu: **Ưu · Nhược · Độ phức tạp · Rủi ro · Chi phí triển khai** → rồi **đề xuất 1**. (Việc tầm thường / chỉ 1 cách hiển nhiên → bỏ qua, KHÔNG bịa option cho đủ số.)

### G9 · Tự phản biện trước khi chốt
Tự hỏi: có cách **đơn giản hơn**? **ít rủi ro hơn**? có **phá kiến trúc** hiện tại? có **thêm nợ kỹ thuật**? có **hại hiệu năng**? — "có" ở bất kỳ câu nào → cân nhắc lại trước khi làm.

### G10 · Cổng verify đủ (BẮT BUỘC trước khi báo "xong")
Chạy theo mức **có sẵn** trong dự án: **lint · typecheck · build · unit · integration · e2e**. Còn đỏ = **CHƯA xong**; không claim success khi chưa verify (`core-execution-output`).
> HIS: build-gate `his-qa-anti-pattern` #27 (FE `npm run build` EXIT 0 / BE `dotnet build` 0 err) · lint `npm run lint` · test Cypress/Playwright (`npm test`). Chỉ `.claude/`·docs → không cần build.

### G11 · Báo cáo hoàn thành 7 phần
(1) Công việc đã làm · (2) File đã thay đổi · (3) Phạm vi ảnh hưởng · (4) Rủi ro còn tồn tại · (5) Việc được hoãn · (6) Nợ kỹ thuật phát hiện · (7) **Hướng rollback**.

## G12 · Thứ tự ưu tiên chất lượng
**Đúng đắn > Ổn định > Bảo trì > Bảo mật > Hiệu năng > Thẩm mỹ code.** KHÔNG hy sinh ổn định chỉ để code ngắn/đẹp hơn.
> ⚠️ Khớp SKILL-MAP §5c + P0: với hệ **y tế/HIS**, **an toàn BN + correctness + security** là **P0 tuyệt đối** — KHÔNG bị xếp dưới maintainability. Thứ tự trên áp cho các đánh đổi **ngoài P0**; khi xung đột, **P0 thắng trước**.

## Liên quan (LINK — không copy)
`core-requirement-clarify` · `core-verify-before-assert` · `core-impact-analysis` · `core-minimal-change` · `core-code-change-workflow` · `core-architecture-follow` · `core-execution-output` · `his-tech-debt-workflow` · `his-qa-anti-pattern` (#27 build-gate, #30 self-review) · SKILL-MAP §5b/§5c (tiebreaker + thứ tự ưu tiên).