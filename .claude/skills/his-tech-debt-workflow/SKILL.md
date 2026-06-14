---
name: his-tech-debt-workflow
description: Use this skill whenever working on tech-debt clean-up / refactor in HIS — splitting god-files, removing `:any`/`as any`, removing dead EF migrations, thinning controllers, blanket Fluent FK changes, sweep unused imports, planning multi-phase work, OR session handoff. Triggers include "xóa nợ kỹ thuật", "refactor", "tách god-file", "siết any", "fix hết / rà hết / file cũ", "tiếp tục theo lịch dễ → khó", "K1/K2/K5", "T1/T4/T5/T6", "D7-r*", "D8", "tổng hợp / lập kế hoạch / handoff / chuyển giao". Enforces 10 hard-learned rules per phiên 2026-05-30 (output markers, report sync, schedule discipline, no-commit-without-permission, side-effect audit, defer-on-logic-change, subagent bulk delegation, spot-check after bulk, scope expansion interpretation, comprehensive backlog planning).
metadata:
  type: project
---

# HIS Tech-Debt Workflow — 10 Rules

Skill "guardrail" cho tech-debt clean-up. **MỌI** task dạng "xóa nợ" / refactor god-file / mass-replace types / migrate FE-BE pattern phải tuân thủ 6 rule dưới. Vi phạm → output không rõ, báo cáo stale, hoặc tệ hơn — vỡ logic nghiệp vụ.

Cross-ref:
- Roadmap chi tiết: `docs/workspace-docs/20-backlog/tech-debt-roadmap.md`
- Số liệu nợ: `docs/workspace-docs/10-assessment/rule-compliance-audit.md`
- Vận hành dang dở: `docs/workspace-docs/90-archive/handoffs/session-handoff-*.md`
- Memory entries chi tiết (auto-load): xem `~/.claude/projects/.../memory/feedback_*.md`

---

## Rule 1 — Output progress markers (tiếng Anh, mỗi reply)

Mỗi reply liên quan tech-debt phải có **marker rõ** để user nhìn 1 scan biết đang ở đâu:

- **Đầu reply**: `[EASY/D7-r3]`, `[MEDIUM/T5]`, `[HARD/K1-phiên-3]`…
- **Khi báo done**: trong nội dung terminal (không chỉ task tool) phải có **rõ ràng** `[X/Y] HOÀN TẤT` hoặc `[X/Y] phiên N xong`.
- **Task tool subject**: cũng prefix `[EASY|MEDIUM|HARD]` (vd `[HARD] K1 — split god-file FE`).
- **Tiếng Anh** (không `DỄ/TB/KHÓ`), format `[<DIFFICULTY>/<TASK_ID>]`.

> **Why:** User explicit 2026-05-30: "tôi không thấy ở output có nhắc đến việc đang làm tới phần nào bằng tiếng anh" + "điều này phải nằm trong nội dung của teminal khi đã báo là làm xong".

---

## Rule 2 — Schedule discipline (roadmap dễ → khó)

1. Mọi work tech-debt khởi đầu bằng **đọc `20-backlog/tech-debt-roadmap.md`** trước.
2. Chọn mục đầu tiên còn `⏳` theo **decision matrix theo hạn chế hạ tầng** (máy D:\ không deploy được → skip mục cần deploy).
3. Sort lịch theo: **EASY → MEDIUM → HARD** (ưu tiên dễ trước).
4. Mỗi mục trong roadmap phải có:
   - ID + scope còn lại + estimate
   - Pre-flight commands
   - Verify trước khi sửa (grep/read code thực)
   - Verify sau (build/test command)
   - Deliverable + blast-radius + blocker
   - "Cần deploy hay không"

> **Why:** User explicit 2026-05-30: "lên lịch chi tiết … chỉ cần bạn nhìn vào là sẽ biết nên làm những gì, bắt đầu từ đâu. Ưu tien lên lịch theo mức độ từ dễ đến khó".

---

## Rule 3 — Update báo cáo sau MỖI step (atomic)

Sau mỗi mục hoàn tất (vd D7 đợt 1, K1 phiên 2…) → **update ngay**, không đợi cuối phiên:

1. `10-assessment/rule-compliance-audit.md`: strike-through item, đổi ✅/🟬, ghi số liệu thật.
2. `20-backlog/tech-debt-roadmap.md`: cập nhật mục + add 1 dòng Update log cuối file.
3. Trong terminal output: "Báo cáo X đã cập nhật" để user thấy.
4. Khi liệt kê "Đã làm" cuối reply: list rõ file báo cáo đã update.

> **Why:** User explicit 2026-05-30: "lưu ý sau khi làm tới đâu thì phải cập nhật lại báo cáo tới đó". Báo cáo stale = phiên sau / người khác không biết hiện trạng.

---

## Rule 4 — KHÔNG commit/push khi user chưa nói rõ (EXPAND 2026-05-30)

- Sửa file (Edit/Write) = OK, an toàn local.
- `git add` / `git commit` (kể cả LOCAL) + `git push` = **CHỈ khi user explicit** keyword
  trong **lượt hiện tại**:
  - "commit" / "lưu commit" / "ghi commit" / "git add" → OK commit local
  - "push" / "đẩy code" / "git push" / "đẩy lên" → OK push
- **"continue" / "tiếp tục" / "làm tiếp" / "mọi việc còn lại giao cho bạn" KHÔNG implicit OK**
  cho bất kỳ git op nào. Chỉ làm:
  1. Code change theo lịch roadmap
  2. Build verify (tsc, dotnet build)
  3. Report progress + flag pending
  4. KEEP working tree dirty là OK
- Lượt cho phép trước **KHÔNG mở rộng** sang lượt sau (vd: "commit" ở turn N không có
  nghĩa được commit thêm ở turn N+1 mà user chỉ nói "continue").
- Nguy hiểm: HIS có GitHub Actions `deploy-backend.yml` auto-deploy Cloud Run khi push BE
  → push lén = deploy prod. Plus user coi commit local cũng là "đẩy" qua log.
- Workspace-docs: commit + push **BÌNH THƯỜNG** (never-push GỠ 2026-06-13). KHÔNG auto-exclude.
  Git-ops nguồn chân lý: `.claude/workflow/project-rules.md` §2-4.
- Khi nghi ngờ → STOP + clear status report, KHÔNG `AskUserQuestion` (user thường trả "continue").

> **Why:** User reprimanded 2026-05-30:
> 1. Sau commit `0be6eb1` push docs lén
> 2. "sao tự đẩy code lên suốt thế. cập nhật trong skill-skillmap hay đâu đó để biết
>    khi continue thì làm theo lịch đã lên sẵn mà không push code"
> 3. "tuyệt đối không đẩy code và đặc biệt là không đẩy code trong workspace-doc"

---

## Rule 5 — Audit side-effects khi tách god-file

**Trước khi commit batch refactor**, grep timer/subscription trong từng sub-file mới:

```bash
grep -nE "setInterval|setTimeout|addEventListener|subscribe|IntersectionObserver" pages/<feature>/*.tsx
```

Với mỗi side-effect → audit:

1. Trong god-file gốc, side-effect có gắn `if (activeTab === 'X')` / route visible check / modal open check không?
2. Container giữ component mount? (Antd Tabs default keep mounted, React Router với state cũng keep, Modal `destroyOnClose=false` keep)
3. Nếu có check + container giữ mount → sau tách side-effect chạy mãi → **logic CHANGE**.

**Fix preserve behavior**: pass `active` / `enabled` / `visible` prop từ parent → sub-component dùng prop trong useEffect deps + early return khi `!active`.

Đã gặp 2026-05-30: K1 phiên 3 `HealthTab` interval 30s — pause-on-leave bị mất, đã fix bằng `active={activeTab === 'health'}` prop.

> **Why:** User explicit 2026-05-30: "áp dụng quy tắc nhưng lưu ý không làm hỏng logic của hệ thống".

---

## Rule 6 — Defer khi đụng logic nghiệp vụ

Khi clean tech-debt mà phát hiện change sẽ **ảnh hưởng logic nghiệp vụ**:

1. **STOP** tại đó.
2. Document trong `20-backlog/tech-debt-roadmap.md`: chuyển mục sang 🔴 BLOCKED / ⚠️ PHẢI XÁC NHẬN, ghi rõ change ảnh hưởng gì.
3. Báo user **trích đoạn code trước/sau** + impact.
4. Hỏi user: fix-now (nếu minimal) / defer-and-schedule / revert toàn bộ.
5. **Auto fix CHỈ KHI**: (a) change minimal (vd 1 prop preserve behavior), VÀ (b) verify behavior preserved bằng đọc code 2 chiều — không đoán.

**Mental checklist trước khi commit batch:**
- [ ] Build/typecheck pass? (cần, không đủ)
- [ ] Behavior identical bản trước? (đọc code 2 chiều, không đoán)
- [ ] Side-effects preserved? (xem Rule 5)
- [ ] API contract preserved? (FE shape + BE shape)
- [ ] Edge case preserved? (null/empty/error path)

Bất kỳ checkbox uncertain → **defer + roadmap**, không commit.

**Cases:** T5 (`xóa Migrations/` blind sẽ vỡ `DatabaseSeeder.cs:32 MigrateAsync()` runtime) → đã BLOCK, defer cho phiên có deploy. ĐÚNG.

> **Why:** User explicit 2026-05-30: "nếu quy tắc áp dụng đó ảnh hưởng logic nghiệp vụ thì phải cân nhắc và lên lịch phù hợp để áp dụng sau".

---

## Decision matrix — máy D:\ KHÔNG deploy/smoke-test được

| Tình huống | Mục có thể làm | Mục SKIP |
|---|---|---|
| Chỉ FE build verify | D7 (siết any) · K1 (tách god-file FE) | — |
| Build BE + FE | K2 (partial class) · T6 (build-gate) | — |
| Cần deploy + smoke-test | — | T1 · T4 · T5 · K5 |
| Cần hardware/Pkcs11 | — | USB Token PIN, smart card |

**Trên máy D:\ ưu tiên:** `D7-r*` → `K1` → `K2`. **Skip:** `T1` `T4` `T5` `T6` `K5` đợi phiên có deploy.

---

---

## Rule 7 — Subagent delegation cho bulk mechanical (>50 file)

Khi tech-debt cần fix bulk pattern lặp (vd 570 unused imports trong 70 file, >100 typed cast giống nhau) — **KHÔNG làm tuần tự một mình**, phí context window. Delegate **2-3 subagent (`general-purpose`) parallel**:

**Pattern subagent prompt:**
1. **Scope rõ ràng**: list file paths đầy đủ HOẶC regex pattern + exclude list (tránh overlap giữa subagents)
2. **Rule cụ thể**: behavior-preserving · KHÔNG đụng JSX/logic · KHÔNG commit/push · KHÔNG đụng task khác (vd KHÔNG đụng `:any` nếu task riêng)
3. **Verify commands**: `tsc --noEmit -p tsconfig.app.json` sau mỗi file
4. **Edge case handling**: vd `const [loading, setLoading]` nếu `loading` unused nhưng setLoading dùng → `const [, setLoading]`
5. **Report format**: per-file count + build status + uncertain cases
6. **Run in background**: `run_in_background: true` để 3 agent parallel

**Cảnh báo:** Subagent có context riêng, KHÔNG biết domain HIS. Chỉ giao mechanical (remove imports, rename param, extract helper). KHÔNG giao logic refactor / business rule / API contract change.

**Khi KHÔNG dùng subagent:** <50 issue · cross-file dependencies · cần đọc context phức tạp.

---

## Rule 8 — Spot-check sau bulk fix (BẮT BUỘC)

Sau MỌI bulk fix (manual hoặc subagent) >20 file — PHẢI spot-check thực tế:

1. **3-5 file random** từ batch → đọc `git diff <file>` verify:
   - Chỉ thay đổi imports/types đúng kỳ vọng
   - KHÔNG xoá nhầm side-effect imports (`import './styles.css'`, `import 'dayjs/locale/vi'`)
   - KHÔNG thay đổi JSX render
   - KHÔNG thay đổi logic handler/useEffect
2. **Build verify đầy đủ**:
   - `tsc --noEmit -p tsconfig.app.json` → 0 error
   - `tsc --noEmit --noUnusedLocals --noUnusedParameters` → 0 unused (cho D8-style task)
   - `npm run build` cho FE / `dotnet build HIS.sln` cho BE — full bundle ok
3. **Audit side-effects** (xem Rule 5): grep timer/subscription
4. **Output report (BẮT BUỘC)**: list file spot-checked + verdict (PASS/WARN/FAIL) + build status

**Why:** Build pass ≠ behavior preserved. Subagent có thể xoá nhầm `import 'styles.css'` (build pass nhưng vỡ UI), `_param` rename quên ở callsite (silent runtime undefined). Spot-check phát hiện sớm.

---

## Rule 10 — Comprehensive backlog planning + session handoff doc

Cuối phiên tech-debt LỚN (>5 task hoặc >50 file modified) HOẶC khi user yêu cầu **"tổng hợp / lập kế hoạch / handoff / chuyển giao"** — PHẢI tạo session handoff doc.

**Vị trí BẮT BUỘC:** `docs/workspace-docs/90-archive/handoffs/session-YYYY-MM-DD-handoff.md` (kèm suffix `-AM`/`-PM` nếu cùng ngày có 2 phiên).

**7 section bắt buộc:**

| Section | Nội dung |
|---|---|
| **A. ĐÃ HOÀN TẤT** | Bảng task xong + số liệu thật (file count, dòng giảm, build time) + method |
| **B. ĐANG CHẠY** | Background tasks/agents: ID, scope, % done, ETA, file còn unfixed |
| **C. CHƯA LÀM (defer)** | Bảng task pending chia EASY/MEDIUM/HARD + cột **Lý do defer** + **Pre-requisite** |
| **D. KẾ HOẠCH TIẾP THEO** | Phiên N+1, N+2, N+3… theo nguyên tắc 1 phiên 1 việc, sort dễ→khó. Mỗi phiên: scope rõ, pre-flight, effort estimate, risk, verify command |
| **E. KEY DECISIONS** | Decision chốt phiên này (vd "decision matrix máy D:\", "subagent delegation effective", "logic-preserve via `active` prop") để phiên sau không debate lại |
| **F. SKILL + MEMORY UPDATES** | Skill nào đã update + memory feedback nào đã add (link path) |
| **G. CẢNH BÁO + GOTCHA** | List risk cho phiên sau (vd "máy D:\ không deploy", "Antd Tabs giữ mount", "subagent KHÔNG biết domain") |

**Cross-ref bắt buộc trong doc:**
- `docs/workspace-docs/20-backlog/tech-debt-roadmap.md`
- `docs/workspace-docs/10-assessment/rule-compliance-audit.md`
- `.claude/skills/his-tech-debt-workflow/SKILL.md`
- Memory feedback files relevant

**Sau khi viết:** report user file đã tạo + tóm tắt 3-5 điểm chính, KHÔNG paste full content.

**Why:** Phiên 2026-05-30 dài (~13h) làm xong D7/D8 + K1 partial + 148 file modified. Không document đầy đủ → phiên sau lặp lại work / debate lại decision / push commit chưa duyệt.

---

## Rule 9 — Scope expansion interpretation (tech-debt)

Khi user dùng ngữ "**fix hết**" / "fix toàn bộ" / "rà hết" / "file cũ" trong context tech-debt — interpret **rộng nhất hợp lý**:

| User nói | Scope interpret |
|---|---|
| "fix hết unused / dead code" | TOÀN project (`tsc --noUnusedLocals` toàn project, không chỉ file session) |
| "fix file cũ" trong context refactor | TẤT CẢ file v1 cũ + file đã sửa session này |
| "rà soát hết" | Toàn project, mọi area, mọi rule |
| "tiếp tục fix" sau khi đã định scope hẹp | Mở rộng scope (user muốn complete cycle) |
| "fix [X cụ thể] trong [file Y]" | Scope hẹp đúng X+Y |

**How:** DEFAULT WIDE. Nếu scope rộng quá → estimate effort (vd "570 issue / 70 file / ~6-9h") + propose plan (delegate subagent / batching) + hỏi user **CÁCH làm chứ KHÔNG hỏi phạm vi**.

**Why:** Phiên 2026-05-30 D8 — em interpret "file cũ" = file session-modified (filter 22 issue) → user lặp lại 3 lần "tiếp tục fix" mới hiểu là toàn project (570 issue). Đốt thời gian + lặp lại tin nhắn.

---

## Pair với skill khác

- Pre-flight chung mọi code: `core-verify-before-assert` + `core-impact-analysis` + `core-minimal-change`
- Refactor cụ thể: `core-refactor` (behavior-preserving) + `core-architecture-consistency`
- HIS anti-pattern: `his-qa-anti-pattern` (KHÔNG ảo tưởng, KHÔNG bỏ DI, KHÔNG hardcode tên BV)
- Khi đụng output style: `core-execution-output` (concise, surface destructive ops)
- Khi đụng API contract: `core-types-contract`
