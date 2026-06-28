# PROJECT RULES — Convention · Kiến trúc · Branch/Commit/PR/Review

> **Index**, không phải bản rule mới. Convention & kiến trúc đã là nguồn-sự-thật ở `CLAUDE.md`,
> `SKILL-MAP.md`, `skills/his-fe-convention`, `skills/his-qa-anti-pattern`. File này **gom đường dẫn** +
> **lấp phần thật sự thiếu**: quy ước **branch / commit / PR / review** (trước đây nằm rải hoặc chỉ trong
> harness, chưa được viết ra). Mâu thuẫn → theo nguồn gốc.

---

## 1. Kiến trúc & convention — TRỎ về nguồn gốc (không lặp)

| Chủ đề | Nguồn-sự-thật |
|---|---|
| Cấu trúc dự án (Clean Arch BE · FE 2 lớp v1/v2) | [`../../CLAUDE.md`](../../CLAUDE.md) "Project Structure" + "Kiến trúc & quy ước" |
| Phân tầng rule **P0/P1/P2** (an toàn BN · build-gate · DI · no-hardcode…) | [`../SKILL-MAP.md`](../SKILL-MAP.md) §0b |
| Convention FE (naming · layer · Antd-first · config-driven) | [`../skills/his-fe-convention/SKILL.md`](../skills/his-fe-convention/SKILL.md) |
| Anti-pattern / guardrail / patient-safety (#1-30) | [`../skills/his-qa-anti-pattern/SKILL.md`](../skills/his-qa-anti-pattern/SKILL.md) |
| Clean-code mức hàm | [`../skills/core-clean-code/SKILL.md`](../skills/core-clean-code/SKILL.md) |
| Quy tắc đặt tên skill (token tầng) | [`../SKILL-MAP.md`](../SKILL-MAP.md) §0 |
| DI bắt buộc · migration SQL idempotent · ValueConverter Guid↔String | [`../../CLAUDE.md`](../../CLAUDE.md) "Backend" |

> Tóm tắt P0 (chi tiết ở SKILL-MAP §0b): **không bịa** · **build-gate** · **đăng ký DI** · **không hardcode
> secret** · **audit + privacy HSBA** · **validate ở BE** · **đặt file đúng thư mục** · **giữ check an
> toàn BN**.

---

## 2. Branch — quy ước (LẤP GAP)

- **KHÔNG commit thẳng lên `main`** khi làm thay đổi lớn/độc lập. Đang ở `main` → **tạo branch trước**.
- Đặt tên branch theo loại task (khớp `classification` ở Router):
  - `feat/<scope>-<mô-tả-ngắn>` · `fix/<scope>-<mô-tả>` · `refactor/<scope>` · `debt/<scope>` ·
    `docs/<scope>` · `test/<scope>` · `chore/<scope>`
- 🔴 **PRE-FLIGHT PICK-TASK (parallel-safe — chống TRÙNG CODE 2 máy; BẮT BUỘC chạy TRƯỚC khi pick/viết code,
  enforce bằng hook `session-start.sh` báo `behind=N` + `remind-pipeline.sh`):**
  1. **Cây sạch** (commit/stash WIP) → **`git pull --ff-only`** — KHÔNG chỉ `fetch`; phải **SYNC working tree**.
     Làm trên cây CŨ (behind>0) = **gốc gây trùng** (phiên 2026-06-15: local tụt 34 commit → làm lại #142/#101 đã có trên origin).
  2. **Verify-against-CODE, KHÔNG tin issue-state:** `grep`/`Read` CODE **đã sync** cho symbol/route/file của tính năng.
     **Đã có → đóng issue (already-done), KHÔNG làm lại.** Issue OPEN chỉ là chỉ báo **trễ** (đóng theo lô) — **CODE là phán quyết**.
  3. 🔴 **WORKING-TREE FOREIGN-EDIT SCAN (chống 2 cửa CÙNG MÁY pick TRÙNG issue — gốc lỗi 2026-06-28):** ngay TRƯỚC claim
     **VÀ** ngay trước Edit đầu tiên → **`git status --short`**. File dirty mà **mình CHƯA sửa** = **cửa Claude/`agy` khác
     đang làm DỞ** (uncommitted + chưa kịp claim) → **4 check kia KHÔNG thấy** (chúng chỉ thấy state đã-commit/đã-push/đã-label;
     working-tree là tín hiệu cùng-máy SỚM NHẤT). → Map file lạ về module/issue: **trùng vùng/file của candidate → cửa khác
     đã ôm → ĐỔI candidate khác**, KHÔNG claim chồng. KHÔNG đụng/stage file lạ (R4 `parallel-windows.md`).
     ⚠️ **Issue decompose theo LOẠI** (vd #354/#355/#356 con #196 — chia theo *type-site*, KHÔNG theo *file* → **cùng file**)
     = **SINGLE-OWNER**: 1 cửa ôm CẢ cụm sibling; cửa khác KHÔNG pick sibling (claim 1 con KHÔNG đủ tách vùng).
  4. **CLAIM-FIRST (GATE — hành động ĐẦU TIÊN ngay khi chốt task):** `bash .claude/window-lock.sh claim <issue|slug> [model]`
     (⚠️ cửa **PowerShell**: `powershell -File .claude/window-lock.ps1 claim ...` — ĐỪNG gõ `bash` trực tiếp = WSL rỗng → lock câm)
     — 1 lệnh lo CẢ HAI trục (ma trận `parallel-windows.md` §2 STEP-0); PreToolUse gate `hooks/pre-edit-lock-gate.sh` **ép** khi ≥2 cửa:
     - 🔴 **same-machine (4 cửa/1 máy):** `mkdir .claude/locks/<key>` **ATOMIC** = mutex thật → đúng 1 cửa thắng dù pick đồng
       thời; cửa khác `[BUSY]` → **ĐỔI task**. ⚠️ **Đây là tầng DUY NHẤT chặn trùng-cửa same-machine** — vì 4 cửa = **CÙNG 1
       tài khoản GitHub**, `gh` assignee/in-progress **MÙ** (cả 4 đều `@me`). **KHÔNG dựa gh cho same-machine.**
     - **cross-machine (máy-2):** script kèm `gh issue edit --add-label in-progress --add-assignee @me`, rồi **VERIFY-AFTER-CLAIM**
       đọc lại `gh issue view <n> --json assignees`; **có tài khoản KHÁC bạn** = máy-2 giành → **ĐỔI task** (verify-after-claim
       CHỈ phát hiện được khi KHÁC tài khoản — same-machine vô hiệu, đã có lock lo).
     Bước 1-3 (sync + existence-check + foreign-scan) là kiểm-tra-NHẸ để CHỌN; **mọi việc "làm task" — đo-scope · đọc-file ·
     impact-analysis · viết code — chỉ SAU claim.** Issue đã in-progress + assignee KHÁC mình → **DỪNG, không pick**.
     Lock theo ISSUE; **file-overlap 2 issue khác nhau cùng đụng 1 file** vẫn cần foreign-scan (bước 3) / single-owner / `git worktree`.
     Release (`window-lock.sh release <key>` khi xong/blocked/đổi-task) + label mechanics = nguồn-chủ `CLAUDE.md` §"Quản lý plan/task".
  5. Nguồn-sự-thật = **git log origin + CODE đã sync + working-tree + Issues** (memory `feedback_fetch-origin-before-backlog`), KHÔNG phải docs local.

## 3. Commit — quy ước (LẤP GAP)

- **Conventional Commits**: `type(scope): mô tả` — `type` ∈ `feat|fix|refactor|chore|docs|test|perf|build`.
  Ví dụ thực tế repo: `feat(ipd): consultation tab in Inpatient v2`, `chore(pm): ...`, `docs(status): ...`.
- Mô tả ngắn, thì hiện tại, nêu **WHAT + WHY** (không liệt kê WHAT theo từng dòng diff).
- Footer **bắt buộc** (theo cấu hình máy):
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- 🔴 **KHÔNG tự `git add`/`commit`/`push` khi user chưa explicit lượt-hiện-tại** (★ nguồn chân lý — SKILL-MAP §0c chỉ giữ tóm tắt + trỏ về đây). 3 mức mở khoá theo keyword:
  - "continue / tiếp tục / làm tiếp" / "mọi việc còn lại giao cho bạn" → CHỈ code-change + build-verify + report; KHÔNG `git add`/`commit`/`push`.
  - "commit / lưu commit / ghi commit" → `git add` + `git commit` **LOCAL**; KHÔNG push.
  - "push / đẩy code / git push" → mới `git push` origin/main.
  - **Edge-case:** "xong hết X mới review/push" KHÔNG implicit-OK (phải explicit "push") · working-tree dirty là BÌNH THƯỜNG khi "continue" (KHÔNG commit để cleanup) · Auto-Mode KHÔNG override · lượt-trước-cho-phép KHÔNG nới sang lượt-sau.
  - Thay đổi < 5 file / < 100 dòng → **gom batch**, chưa đẩy (memory
  `feedback_batch-changes-before-push`). ⚠️ **Khi 2 máy làm song song:** ƯU TIÊN **push sớm mỗi feature DONE**
  thay vì stack nhiều feature uncommitted — batch lâu = cửa sổ phân kỳ lớn = dễ trùng/đụng (xin phép push từng cái).
- Commit đúng thay đổi thật: `git diff --name-only | xargs git add` — tránh churn do line-ending CRLF/LF
  (memory `feedback_windows-line-ending-sed-churn`); ưu tiên `Edit` tool hơn `sed -i`.

## 4. Pull Request / Push — quy ước (LẤP GAP)

- `push` / `đẩy code` mới được `git push`; `commit` chỉ commit local. (Mức mở khoá đầy đủ: §3.)
- 🔴 **Đóng issue ATOMIC với push** (chống "OPEN giả" khiến máy khác làm trùng): commit feature kèm
  **`Closes #N`** (GitHub auto-close khi merge `main`) HOẶC `gh issue close <n>` **ngay sau push**. **KHÔNG đóng
  issue theo lô trễ** nhiều commit sau khi code đã lên — đó là khoảng-trống khiến `gh issue list` còn hiện OPEN
  dù tính năng đã xong (gốc gây trùng phiên 2026-06-15).
- PR vào `main`. Body PR kết bằng:
  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```
- **Tách commit code (push-able) vs commit `docs/workspace-docs/`** — workspace-docs commit + push bình
  thường từ 2026-06-13 (quy tắc never-push đã GỠ), nhưng vẫn tách logic để review rõ.
- Sau khi push đụng `backend/**` → Cloud Run tự deploy qua GitHub Actions; verify `gh run list
  --workflow=deploy-backend.yml` + `GET /health/schema-drift` = 0 (skill `his-ops-deploy`).

## 5. Review — quy ước

- Trước khi báo "xong": **self-review 9 điểm** (his-qa #30) + **build-gate** (his-qa #27) — bước 6 REVIEW
  trong [`workflow.md`](workflow.md).
- Task lớn / rủi ro prod → chặng [4] Reviewer dùng agent `his-quality-reviewer` (+ `his-test-engineer`).
- Bulk fix > 20 file → **spot-check 3-5 file random** qua `git diff` + build + audit side-effect
  (memory `feedback_spot-check-after-bulk`); build pass ≠ behavior preserved.
- Review theo cổng [`checklist.md`](checklist.md); còn mục 🔴 fail → KHÔNG cho DONE.

## 6. Rollback / Recovery (hệ Production — BẮT BUỘC biết cách lùi trước khi đổi)

Khi thay đổi gây sự cố, chọn cách revert **nhỏ-nhất-an-toàn**. Luôn **báo user trước thao tác lùi prod**.

| Tình huống | Cách lùi |
|---|---|
| Code chưa push | `git restore` / bỏ commit local (`git reset --soft HEAD~1`) |
| Đã push, chưa deploy | **`git revert <sha>`** (KHÔNG `reset` nhánh chung) + push |
| Backend deploy Cloud Run lỗi | Lùi **revision trước**: `gcloud run services update-traffic his-api --to-revisions=<rev-cũ>=100` (hoặc redeploy image cũ) |
| Frontend Vercel lỗi | Promote lại **deployment trước** trên Vercel (hoặc revert commit → auto-deploy) |
| Migration SQL gây hỏng | Script SQL **lùi tay** (idempotent) trong `Data/Scripts/`; KHÔNG `ef migrations` |
| Tính năng mới hỏng | Tắt qua config/feature-flag (nếu có) **trước** khi revert code |

→ Ghi `rollback_notes` ở state-store ([`task.md`](task.md)) + **verify lại sau khi lùi**. Cross-ref Hotfix fast-path ([`workflow.md`](workflow.md) §6).

## 7. Estimation rubric (định nghĩa mức — dùng nhất quán cho mọi issue)

- **Độ phức tạp (effort):** `XS` vài giờ/1 file · `S` ~1 ngày/ít file · `M` vài ngày/1 module · `L` ~1 tuần/đa-file-đa-tầng · `XL` >1 tuần/đa-module/blast-radius lớn (**nên tách nhỏ**).
- **Độ ưu tiên:** `P0` thiếu → KHÔNG vận hành được (hệ đang live → rất hiếm) · `P1` quan trọng: cần cho triển khai thực / an-toàn-BN / **parity-đối-thủ** · `P2` nên có, tăng hiệu quả · `P3` làm sau, không ảnh hưởng vận hành.
- **Risk level:** `Critical` prod-down/mất-dữ-liệu/lộ-bảo-mật · `High` blast-radius rộng/khó-rollback · `Medium` giới-hạn-trong-module · `Low` cục-bộ/cosmetic.

> Phương châm parity ([[competitor-parity-philosophy]] · `requirement-coverage.md` Luật 4): đối-thủ-có→P0/P1; không-có-nhưng-cần→P2; không-có-không-cần→KHÔNG tạo.

---

## 8. Liên kết
- Pipeline: [`workflow.md`](workflow.md) · State-store: [`task.md`](task.md) · Checklist: [`checklist.md`](checklist.md)
- Quyết định kiến trúc: [`ai-memory.md`](ai-memory.md)
- Routing skill (đọc đầu tiên): [`../SKILL-MAP.md`](../SKILL-MAP.md)
