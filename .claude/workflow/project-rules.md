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
- Nhiều máy làm song song → **`git fetch origin` + đọc `git log origin/main` + `gh issue list` TRƯỚC** khi
  pick task (memory `feedback_fetch-origin-before-backlog`). Nguồn-sự-thật là git log + Issues, KHÔNG phải docs local.

## 3. Commit — quy ước (LẤP GAP)

- **Conventional Commits**: `type(scope): mô tả` — `type` ∈ `feat|fix|refactor|chore|docs|test|perf|build`.
  Ví dụ thực tế repo: `feat(ipd): consultation tab in Inpatient v2`, `chore(pm): ...`, `docs(status): ...`.
- Mô tả ngắn, thì hiện tại, nêu **WHAT + WHY** (không liệt kê WHAT theo từng dòng diff).
- Footer **bắt buộc** (theo cấu hình máy):
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- 🔴 **KHÔNG tự `git add`/`commit`/`push`** khi user chưa explicit (SKILL-MAP §0c). "continue/tiếp tục"
  KHÔNG phải lệnh commit. Thay đổi < 5 file / < 100 dòng → **gom batch**, chưa đẩy (memory
  `feedback_batch-changes-before-push`).
- Commit đúng thay đổi thật: `git diff --name-only | xargs git add` — tránh churn do line-ending CRLF/LF
  (memory `feedback_windows-line-ending-sed-churn`); ưu tiên `Edit` tool hơn `sed -i`.

## 4. Pull Request / Push — quy ước (LẤP GAP)

- `push` / `đẩy code` mới được `git push`; `commit` chỉ commit local. (Bảng SKILL-MAP §0c.)
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

---

## 6. Liên kết
- Pipeline: [`workflow.md`](workflow.md) · State-store: [`task.md`](task.md) · Checklist: [`checklist.md`](checklist.md)
- Quyết định kiến trúc: [`ai-memory.md`](ai-memory.md)
- Routing skill (đọc đầu tiên): [`../SKILL-MAP.md`](../SKILL-MAP.md)
