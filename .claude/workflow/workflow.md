# SOFTWARE DELIVERY WORKFLOW — Pipeline & Hợp đồng I/O giữa agent

> **Đây là bản đồ end-to-end** cho mọi task code trong HIS. Nó **không thay** SKILL-MAP (skill routing)
> mà **bổ sung lớp điều phối**: task chạy qua **pipeline 5 chặng**, mỗi chặng do **agent thật** đảm nhận,
> các chặng trao đổi qua **state-store** ([`task.md`](task.md)) theo **hợp đồng I/O cố định**.
>
> Nguồn-sự-thật của *cách làm chi tiết* là **skill** (`.claude/skills/*`) + **agent prompt**
> (`.claude/agents/*.md`). File này chỉ **nối chúng thành luồng** + định nghĩa **contract handoff**.

---

## 0. Khi nào áp pipeline đầy đủ vs rút gọn

| Loại task | Pipeline |
|---|---|
| **TRIVIAL** (định nghĩa số hoá dưới) · Q&A · giải thích · tra cứu | **Bỏ pipeline + bỏ state-store + bỏ note-skill.** Chỉ gate tối thiểu: verify-before-assert → build-gate nếu chạm code. |
| Feature · bug_fix · refactor · technical_debt · migration · đa-file (KHÔNG trivial) | **Pipeline** — rút gọn (bỏ state-store) nếu ≤M & 1 module & 1 pass; **đầy đủ + state-store** nếu đa-file / blast-radius ≥ MEDIUM. |
| Đa-domain / mixed | Router **tách** thành nhiều workflow con, mỗi cái chạy pipeline riêng. |
| **Bug Production KHẨN** (mất dịch vụ/sai dữ liệu/lộ bảo mật) | **Hotfix fast-path** §6 (ghi đè DoR). |

### ★ Định nghĩa TRIVIAL (số hoá — NGUỒN CHÂN LÝ DUY NHẤT; SKILL-MAP/hook/CLAUDE.md chỉ TRỎ tới đây)
**TRIVIAL = (không đổi hành vi nghiệp vụ) AND (≤5 dòng) AND (1 file) AND (KHÔNG chạm shared/contract/DB/auth/tiền/patient-safety).**
→ Vượt **bất kỳ** điều kiện → KHÔNG trivial (vd `bug_fix` 3 dòng nhưng chạm shared service = KHÔNG trivial).

### ★ Inline vs spawn agent THẬT (mặc định INLINE — rẻ nhất)
Mặc định **1 Claude tự đóng tuần tự các pha INLINE** trong cùng context (pipeline = khung tư duy; "hợp đồng I/O §2" khi inline = tự-kỷ-luật, KHÔNG cần file riêng).
**CHỈ spawn agent thật (Agent tool) khi ≥1:** blast-radius **HIGH** · **>5 file** · mảnh **độc lập song-song-hoá-được** · cần **review độc lập** (đổi tiền/contract/DB/patient-safety). Khi spawn → **state-store BẮT BUỘC ở GitHub Issue body** + truyền `task_id` (subagent KHÔNG chia context — xem §2/§8).

Quy tắc vàng: **không IMPLEMENT trước khi xong UNDERSTAND + PLAN.** Không đánh dấu DONE trước VERIFY + REVIEW.

### ★ Definition of Ready (DoR) — điều kiện được phép BẮT ĐẦU chặng [3] Worker
KHÔNG vào IMPLEMENT khi chưa đủ **tất cả**:
- [ ] `goal` + `scope_in`/`non_goals` rõ; **hết `open_questions` chặn** (mơ hồ → STOP hỏi, §5)
- [ ] `classification` + `agent_sequence` đã chốt (Router xong)
- [ ] `impact` + `file_allow_list` đã map (Planner xong); deps/tiền-đề sẵn (không BLOCKED)
- [ ] `completion_criteria` đo được + `verification_required` đã định
- [ ] Thay đổi prod rủi-ro (tiền/schema/contract/patient-safety) → đã có **≥3 phương án** + **rollback dự kiến** ([`project-rules.md`](project-rules.md) §6)

Thiếu bất kỳ mục → **KHÔNG code**; quay lại Router/Planner hoặc STOP hỏi user. *(DoR = cổng vào; DoD = cổng ra.)*
> **Ngoại lệ:** **Hotfix fast-path (§6) GHI ĐÈ DoR** — KHÔNG đòi ≥3 phương án; chỉ cần root-cause có bằng chứng + rollback đã biết. DoR đầy đủ chỉ áp cho task thường.

---

## 1. Pipeline 5 chặng ↔ Agent thật ↔ Skill

```
 Input
   │
   ▼
[1] ROUTER/TRIAGE ─────────► phân loại · scope · risk · chọn luồng agent
   │                          agent: ai-project-orchestrator
   ▼
[2] PLANNER ───────────────► chia bước · done-criteria · impact map
   │                          agent: his-architecture-planner
   ▼
[3] WORKER(S) ─────────────► thực thi (code / doc / data / research)
   │                          agents: code-change-controller · his-docs-manager
   │                          skill research: core-codebase-map-tooling
   ▼
[4] REVIEWER/CRITIC ───────► tìm lỗi · edge case · regression · security · test
   │                          agents: his-quality-reviewer · his-test-engineer
   ▼
[5] FINALIZER ─────────────► gom kết quả · rollback · next action · sync Issue
   │                          agent: ai-project-orchestrator (post-execution)
   ▼
 Output

         ┌──── STATE-STORE INSTANCE = GitHub Issue body (theo template task.md) ────┐
 mỗi chặng│ task_id · goal · context · assumptions · steps · results                 │
 đọc/ghi  │ errors · final_decision · status   (task.md = TEMPLATE read-only, KHÔNG  │
         │ ghi state vào file tracked — tránh đua ghi đa-máy)                         │
         └───────────────────────────────────────────────────────────────────────────┘
```

| Chặng | Agent (file) | Tương ứng "5 agent lõi" | Skill chính áp dụng |
|---|---|---|---|
| [1] Router/Triage | [`agents/ai-project-orchestrator.md`](../agents/ai-project-orchestrator.md) | Router/Triage | `core-requirement-clarify`, `core-prod-change-discipline` |
| [2] Planner | [`agents/his-architecture-planner.md`](../agents/his-architecture-planner.md) | Planner | `core-impact-analysis`, `core-architecture-follow`, `core-types-contract` |
| [3] Worker — Code | [`agents/code-change-controller.md`](../agents/code-change-controller.md) | Worker/Code | `core-code-change-workflow`, `core-minimal-change`, `core-reusable-code`, `his-*` theo tầng |
| [3] Worker — Doc | [`agents/his-docs-manager.md`](../agents/his-docs-manager.md) | Worker/Doc | `his-doc-feature` |
| [3] Worker — Research/Data | inline `Explore` / `core-codebase-map-tooling` | Worker/Research+Data | `core-codebase-map-tooling` |
| [4] Reviewer | [`agents/his-quality-reviewer.md`](../agents/his-quality-reviewer.md) + [`agents/his-test-engineer.md`](../agents/his-test-engineer.md) | Reviewer/Critic | `core-testing-architecture`, `his-qa-anti-pattern` |
| [+] Tech-debt | [`agents/tech-debt-manager.md`](../agents/tech-debt-manager.md) | (Worker chuyên debt) | `his-tech-debt-workflow`, `core-refactor` |
| [5] Finalizer | `ai-project-orchestrator` (POST-EXECUTION) | Orchestrator/Finalizer | — |

> **Lưu ý điều phối (CLAUDE.md):** mặc định **trả lời inline** (rẻ nhất); chỉ spawn agent khi việc
> độc lập/nặng đáng đổi token; việc nhẹ/lặp → `agy`. Pipeline này là **mô hình logic** — Claude có thể
> tự đóng nhiều chặng inline cho task vừa, hoặc spawn agent thật cho task lớn. **Luôn báo đầu reply
> đang inline hay dùng agent nào.**

---

## 2. Hợp đồng I/O giữa các agent (state-store contract)

> Đây là phần **trước đây thiếu**: handoff không còn là văn xuôi tự do mà là **input/output contract**.
> Mỗi chặng **chỉ được đọc** field do chặng trước ghi, **chỉ được ghi** field của mình.

### [1] Router/Triage
- **INPUT:** yêu cầu thô của user + trạng thái repo (`git log origin/main`, `gh issue list`).
- **OUTPUT (ghi state §1-3, §Risks):**
  - `classification` (1 trong 11: feature/bug_fix/refactor/technical_debt/**migration**/architecture/testing/documentation/release/investigation/mixed)
    - *Chặng kích hoạt THEO loại (không phải task nào cũng đủ 5 chặng):* `architecture`→Planner; `testing`→Worker=test-engineer+Reviewer; `documentation`→Worker=docs-manager; `release`→Reviewer+ops(deploy-verify §6); `investigation`→`Explore`/`core-codebase-map-tooling` (KHÔNG quality-reviewer). **Finalizer luôn chạy** (sync Issue).
  - `goal`, `scope.in`, `scope.non_goals`
  - `priority`, `risk_level`
  - `agent_sequence` (luồng agent đã chọn — luồng nhỏ-nhất-an-toàn)
  - `verification_required` (lint/typecheck/build/test nào bắt buộc)
  - `completion_criteria` (đo được)
- **GATE:** mơ hồ → STOP hỏi (`core-requirement-clarify`); KHÔNG đoán.

### [2] Planner
- **INPUT (đọc state):** `classification`, `scope`, `constraints`.
- **OUTPUT (ghi state §3 Plan + §Impact):**
  - `steps[]` (bước nhỏ có thứ tự) + `done_criteria` từng bước
  - `impact`: affected files / modules / APIs / DB objects / auth flows / UI flows / integrations
  - `phases` (nếu blast-radius lớn → chia batch)
  - `file_allow_list` (chỉ những file được phép đụng)
- **GATE:** không xác định được impact → route `investigation` trước.

### [3] Worker — Code (`code-change-controller`)
- **INPUT (đọc state):** 1 `step` + `file_allow_list` + convention ([`project-rules.md`](project-rules.md)) + giới hạn thay đổi.
- **OUTPUT (ghi state §4 Execute):**
  - `diff` / changed files (chỉ trong allow-list; vượt → STOP, re-plan)
  - `change_summary` ngắn (WHAT + WHY)
  - `suggested_tests`
  - `build_result` (FE `npm run build` EXIT 0 / BE `dotnet build` 0 errors — **BUILD-GATE bắt buộc**)
- **GATE:** vượt allow-list / đổi contract-DB-API ngoài kế hoạch → STOP, báo Router re-plan (SKILL-MAP P0).

### [3] Worker — Doc (`his-docs-manager`)
- **INPUT:** code change đã merge + `final_decision`.
- **OUTPUT:** docs/ADR (ghi quyết định kiến trúc vào [`ai-memory.md`](ai-memory.md) nếu là quyết định lâu dài).

### [4] Reviewer/Critic (`his-quality-reviewer` + `his-test-engineer`)
- **INPUT (đọc state):** `diff` + `goal`/`scope` gốc + `build_result` + test result.
- **OUTPUT (ghi state §5 Verify/Review):**
  - `verdict`: PASS / FAIL
  - `review_dims`: **Code Quality · Performance · Security · Maintainability** (mỗi chiều: OK / issue — bám self-review 9 điểm `his-qa-anti-pattern` #30)
  - `issues[]` (lỗi logic · thiếu edge case · vi phạm yêu cầu · regression · security)
  - `must_fix[]` (việc phải sửa trước khi DONE)
  - `residual_risk`
- **GATE:** FAIL → quay lại [3] Worker với `must_fix`; KHÔNG cho qua khi còn `must_fix`.

### [5] Finalizer (`ai-project-orchestrator` post-execution)
- **INPUT (đọc state toàn bộ).**
- **OUTPUT (ghi state §6 Close + báo cáo):**
  - `completed_work`, `deferred_work` (+ lý do)
  - `remaining_risks` (+ owner)
  - `rollback_notes`
  - `next_actions` (ưu tiên)
  - `status` → `READY_FOR_PUSH` (KHÔNG tự push — SKILL-MAP §0c) → sau khi user push: `DONE` + `gh issue close`.

---

## 3. 7 bước WORKFLOW (chuẩn hoá — trỏ về skill, KHÔNG lặp nội dung)

7 bước này là **khung tư duy trong mỗi chặng**. Chi tiết cách làm nằm ở skill được trỏ — đây là index.

| Bước | Mục tiêu | Nguồn-sự-thật (skill) | Map vào chặng |
|---|---|---|---|
| **1 · UNDERSTAND** | Hiểu đúng yêu cầu nghiệp vụ; restate; nêu giả định/risk/câu hỏi mở | `core-requirement-clarify` | Router |
| **2 · ANALYZE** | Bản đồ tác động: file/module/DB/API/contract/dependency | `core-impact-analysis`, `core-verify-before-assert` | Router→Planner |
| **3 · PLAN** | Chia bước nhỏ · done-criteria · ≥3 phương án cho thay đổi prod | `core-prod-change-discipline`, `core-minimal-change` | Planner |
| **4 · IMPLEMENT** | Sửa đúng file cần thiết · reuse-first · giữ convention · không over-refactor | `core-code-change-workflow`, `core-reusable-code`, `core-clean-code`, `his-fe-convention` | Worker |
| **5 · VERIFY** | Build/lint/typecheck/test · edge case · error handling | `his-qa-anti-pattern` #27, `core-testing-architecture` | Worker→Reviewer |
| **6 · REVIEW** | Tự rà như senior: chất lượng · kiến trúc · performance · security · maintainability (self-review 9 điểm) | `his-qa-anti-pattern` #30, `core-prod-change-discipline` | Reviewer |
| **7 · COMPLETE** | Chỉ DONE khi đủ Done-criteria + verify + review + báo cáo; ngược lại giữ IN_PROGRESS | [`checklist.md`](checklist.md) Completion | Finalizer |

**3 mốc tách bạch (chống "DONE quá sớm" VÀ "kẹt READY_FOR_PUSH"):**

| Mốc | Điều kiện | Ai chuyển |
|---|---|---|
| **CODE_COMPLETE** | (1) Yêu cầu thoả `goal`+`completion_criteria` · (2) không lỗi logic/runtime đã biết · (3) build-gate xanh tầng đã đụng · (4) VERIFY+REVIEW xong, hết `must_fix` · (5) báo cáo 7-part xong + state-store sync về Issue | **AI tự đạt** |
| **READY_FOR_PUSH** | = CODE_COMPLETE + chờ user cho push. **Đây là trạng-thái-cuối AI tự đạt — KHÔNG phải lỗi, KHÔNG phải "chưa xong"** | **AI tự đạt** |
| **DONE** | = đã `git push` OK (+ verify deploy nếu chạm prod) | **CHỈ user explicit "push"** → rồi AI mới `gh issue close` |

> 🔴 **AI TUYỆT ĐỐI KHÔNG `gh issue close` ở READY_FOR_PUSH** (= báo DONE sai sự thật, code chưa lên remote). Close chỉ trong cùng lượt user cho push + push OK. Nếu user chủ động chưa push (batch) → giữ READY_FOR_PUSH, Issue vẫn mở — **đúng**, không treo-lỗi.

(Đồng bộ memory `feedback_task-lifecycle-dod-remote`. Git-ops: `project-rules.md` §2-4.)

---

## 4. Chống scope-creep (bắt buộc mọi chặng)

Phát hiện mở rộng phạm vi (refactor ngoài kế hoạch · đổi architecture/contract/DB ngoài plan · "tiện tay
sửa thêm") → **STOP ngay**, tạo task/Issue mới cho phần mở rộng, re-plan, **xin phép user** rồi mới làm.
KHÔNG nhét scope mới vào task đang chạy. (SKILL-MAP P0 + agent `ai-project-orchestrator` SCOPE CONTROL.)

---

## 5. ★ Escalation / STOP-and-ask — khi nào DỪNG, hỏi user (gộp 1 chỗ)
DỪNG ngay + báo/hỏi user, **KHÔNG tự quyết**, khi:
- Yêu cầu **mơ hồ** / ≥2 cách hiểu cho kết quả khác nhau (`core-requirement-clarify`).
- **Scope nở** (phát sinh refactor/contract/DB/feature ngoài plan) → tạo task mới, re-plan (§4).
- **Risk Critical** hoặc đụng **tiền · schema · contract · patient-safety · bảo mật** ngoài kế hoạch.
- **BLOCKED**: thiếu thông tin/quyết định/phụ thuộc ngoài (vd cổng NCC) → ghi `errors`, chuyển `BLOCKED`.
- Verify/Review có **`must_fix` không tự sửa an toàn được** (đụng vùng rủi ro).
- Sắp **commit / push / deploy / migration / xoá** (thao tác khó đảo ngược) → xin phép (SKILL-MAP §0c).
- Build-gate fail **không rõ nguyên nhân sau 2 lần thử** → báo, KHÔNG che lỗi, KHÔNG claim success.

Cách báo: nêu **vấn đề + ≥2 lựa chọn + khuyến nghị**, để user quyết. *(Thành thật > tự tin.)*

---

## 6. ★ Incident / Hotfix fast-path (bug Production KHẨN)
Bug prod nghiêm trọng (mất dịch vụ/sai dữ liệu/lộ bảo mật) → luồng **rút gọn** nhưng **GIỮ safety**:
1. **Triage nhanh**: blast-radius + **root-cause có bằng chứng** (KHÔNG vá mù).
2. **Fix tối thiểu** (`core-minimal-change`) — bỏ ≥3-phương-án/plan dài, NHƯNG **giữ**: verify-before-assert · build-gate · không-hardcode · audit/patient-safety.
3. **Verify**: build xanh + smoke test đúng đường ảnh hưởng.
4. **Xin phép push/deploy** (vẫn §0c) — ưu tiên nhanh nhưng user duyệt; biết **rollback** trước ([`project-rules.md`](project-rules.md) §6).
5. **Post-mortem ngắn**: root-cause + cách chặn tái diễn → ghi Issue; nếu là vấn đề kiến trúc → ADR (`ai-memory.md`).

> Fast-path **CHỈ** cho incident khẩn; bug thường vẫn đi pipeline đầy đủ.

---

## 7. Liên kết
- Routing skill: [`../SKILL-MAP.md`](../SKILL-MAP.md) — **đọc đầu tiên** cho mọi task code.
- State-store template: [`task.md`](task.md) · Checklist: [`checklist.md`](checklist.md)
- Convention · git · **rollback** · **estimation**: [`project-rules.md`](project-rules.md)
- Sổ quyết định kiến trúc: [`ai-memory.md`](ai-memory.md) · Phủ yêu cầu: [`requirement-coverage.md`](requirement-coverage.md)
