# .claude/REGISTRY.md — Sổ đăng ký NGUỒN-SỰ-THẬT (single-source-of-truth index)

> **ROOT-CAUSE của drift** (mọi lần tạo gì trong `.claude` lại sinh mâu thuẫn): rule cross-cutting bị **copy
> ra nhiều file mà KHÔNG khai báo file-chủ** → N bản → sửa 1 chỗ, N-1 chỗ tụt hậu. File này khai báo **CHỦ
> DUY NHẤT** cho mỗi rule. **Mọi nơi khác PHẢI link, KHÔNG copy nội dung.** Sửa rule → chỉ sửa file-chủ.

## Bảng CHỦ (canonical owner)

| Rule / chủ đề | **FILE CHỦ** | Nơi khác chỉ được |
|---|---|---|
| git-ops (commit/push/workspace-docs) | `workflow/project-rules.md` §2-4 | nguyên-tắc-lõi 1 dòng + link |
| trivial threshold (số hoá) | `workflow/workflow.md` §0 | link |
| DONE / READY_FOR_PUSH / CODE_COMPLETE | `workflow/workflow.md` DoD | link |
| build-gate (`npm run build`, KHÔNG `tsc --noEmit`) | `his-qa-anti-pattern` #27 | link |
| self-review 9 điểm | `his-qa-anti-pattern` #30 | link (FE: `his-fe-convention` §7 = view) |
| số migration kế tiếp | **ĐỘNG**: `ls Data/Scripts/` max(NN)+1 | KHÔNG hard-code số bao giờ |
| P0/P1/P2 priority | `SKILL-MAP` §0b | link |
| conflict tiebreaker / rule-tension | `SKILL-MAP` §5 / §5b | link |
| thứ tự ưu tiên chất lượng | `SKILL-MAP` §5c | `core-prod-change-discipline` G12 chỉ link |
| owner-diff (refactor/god-file-split) | `SKILL-MAP` §5 (tech-debt=plan · code-change=execute · planner=design) | |
| requirement coverage / completeness-gate | `workflow/requirement-coverage.md` | link |
| audit / review không-nói-quá (no-quota, evidence, confidence) | `workflow/audit-protocol.md` | link |
| UI-test evidence + traceability (screenshot mỗi case · tên test=màn+nghiệp vụ · báo cáo) | `skills/his-test-e2e` §6 | link; test-plan doc + Issues `test` chỉ link |
| sparring / phản biện chống-nịnh (giao thức 4 bước, calibrated, no-quota) | `skills/core-sparring-partner` | link; global `~/.claude/CLAUDE.md` mang 1 pointer cho project khác |
| drift-lint (hệ miễn dịch) | `.claude/lint.sh` (auto qua `hooks/stop-checks.sh`) | chạy sau mọi sửa .claude |
| agent memory-spec block (~137 dòng boilerplate) | **đồng nhất 100% ở cả 7 agent** (KHÔNG dedup — subagent cần inline) | sửa 1 → sửa CẢ 7; lint [9] enforce giống nhau |
| estimation rubric (XS-XL · P0-P3 · risk) | `workflow/project-rules.md` §7 | link |
| rollback / recovery | `workflow/project-rules.md` §6 | link |
| pipeline I/O contract + state-store = Issue body | `workflow/workflow.md` §2 | agent prompt chỉ link |
| skill naming token (his-`<token>`-) | `SKILL-MAP` §0 | |
| agent slug ↔ display-name | `agents/ai-project-orchestrator.md` (AVAILABLE...) + `workflow.md` §1 | |
| file-placement (report→workspace-docs; backlog→GitHub Issues) | `SKILL-MAP` §0a + `CLAUDE.md` | |
| deploy (auto via GitHub Actions) | `his-ops-deploy` + `CLAUDE.md` Deploy | |
| test-làm-cuối (fix/feature/tech-debt xong HẾT rồi mới test; không ngoại lệ harness) | `CLAUDE.md` §"Quản lý plan/task" | hook `session-start.sh`/`remind-pipeline.sh` inline-enforce + STATUS chỉ link |
| model-tier routing (Opus/Sonnet/Haiku theo tính chất phiên; nudge mềm) | `CLAUDE.md` §"Agent routing" | hook `session-start.sh` nudge inline; nơi khác link |
| task-lifecycle (in-progress label · scope-overlap · task-dài→push-1-lần) | `CLAUDE.md` §"Quản lý plan/task" | git-ops mechanics ở `workflow/project-rules.md` §2-4; nơi khác link |
| SYNC-GATE chống-trùng-code-2-máy (pull --ff-only + verify-against-CODE + claim) | `workflow/project-rules.md` §2 | hook `session-start.sh`/`remind-pipeline.sh` inline-enforce |
| evidence viewer / file-layout / naming / regen / dedup-GitHub | `docs/architecture/evidence/README.md` | `CLAUDE.md` §test + `his-test-e2e` §6 (convention đặt-tên-test) chỉ link |
| session-ops (đọc-gì-đầu-phiên · plan-mode timing · dọn-context `/compact`-`/clear`-`/rewind`-`/context` · handoff giữ STATUS ngắn) | `workflow/session-ops.md` | link; KHÔNG sở hữu model (→`CLAUDE.md §Agent routing`) · git-sync (→`project-rules.md` §2) · pipeline/DONE (→`workflow.md`) · file-placement (→`SKILL-MAP` §0a) |
| plugin-routing (USE net-new · DEFER-to-HIS overlap · COMPLEMENT) | `plugins.md` | link; review→`his-quality-reviewer` · UI→`core-ui-aesthetics`+`his-fe-page-v2` · skill-routing→`SKILL-MAP` · enabledPlugins→`~/.claude/settings.json` |

## ★ Quy tắc ghi/sửa rule trong `.claude` (BẮT BUỘC — chống tái drift)
1. **Tra bảng trên TRƯỚC.** Rule đã có chủ → file mới chỉ **1 dòng + link**, TUYỆT ĐỐI không chép nội dung.
2. Rule cross-cutting MỚI → **thêm 1 dòng vào bảng này** (khai báo chủ) rồi mới viết ở 1 nơi.
3. **KHÔNG hard-code giá trị biến-động** (số migration / ngày / đếm) → dùng chỉ thị động (`ls`/`date`/`grep`).
4. **KHÔNG ref memory bằng tên cứng** nếu không chắc tồn tại → tra MEMORY.md.
5. Sau MỌI sửa `.claude` → chạy **`bash .claude/lint.sh`** (phải LINT OK mới coi là xong).

> Nguyên lý: governance giữ nhất quán bằng **verify + enforce (lint)**, KHÔNG bằng trust/diligence (luôn trôi).
