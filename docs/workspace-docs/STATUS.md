# STATUS — đang ở đâu · blocker · việc kế tiếp

> 🔗 **Task board = GitHub Issues** (`minhhung19872002/HIS`): `gh issue list`. File này CHỈ giữ
> **session-state NGẮN cho hook** — KHÔNG ghi backlog/plan/lịch sử dài. Quy tắc giữ-ngắn + vòng đời
> context (mở phiên · chọn model · plan-mode · dọn context · handoff): [`.claude/workflow/session-ops.md`](../../.claude/workflow/session-ops.md).
> 📜 Lịch sử phiên 2026-06-13→21: [`90-archive/handoffs/session-2026-06-21-handoff.md`](90-archive/handoffs/session-2026-06-21-handoff.md).
>
> Cập nhật cuối: **2026-06-22**.

## Đang dở (uncommitted — READY_FOR_PUSH)
- **Plugin-routing** (2026-06-22): `.claude/plugins.md` (bản đồ 6 plugin — USE chrome-devtools/playwright MCP ·
  DEFER-to-HIS frontend-design/code-review/github · meta recommender) + touchpoint `skill-routes/fe.md`+`test.md`
  + REGISTRY owner + pointer SKILL-MAP. LINT OK. Chờ push.

## Đã xong gần đây (DONE + PUSHED, origin/main)
- **Cơ chế "Session Ops" + permission rules** (`f6f2682`, 2026-06-22): `session-ops.md` (mở phiên/model/plan-mode/dọn-context/handoff
  + cheat-sheet 4 permission mode + rule allow/ask/deny) · siết STATUS 447→31 dòng (lịch sử → `90-archive/handoffs/`) ·
  `settings.json` baseline deny/ask/allow (**git commit·push → ASK**, deny đọc secrets) · pointer REGISTRY/SKILL-MAP/README. LINT OK.
- **#195 [PERF-1] AsNoTracking + N+1** — batch 1-4 SAFE (8 file read-only BE), build Infra EXIT 0 (`0d6ba69`/`7198bda`).
  **#195 GIỮ OPEN**: phần còn lại = **N+1 write-path tiền/kho/patient-safety** (Warehouse · BloodBank · PharmacyApproval ·
  Examination/Inpatient Prescriptions · Reception OrdersBilling · Billing) → **DEFER** (cần characterization-test + deploy/smoke).
- **Governance dedup `.claude`** (REGISTRY owner-rows + co-link SKILL-MAP/project-rules) — `15204dc`, LINT OK.
- **#190 [DATA-4]** ngừng nuốt exception tài chính/insurance/signing (41 catch · 9 file) — `454fa82`.
- **#171** tách fat FE api client (barrel re-export, behavior-preserving) — DONE + #171 CLOSED.

## Blocker / chờ user
- **#182** rotate secret (cần quyền Cloud Run) · **#183** role-taxonomy (auth-nhạy-cảm, chờ duyệt phương án) ·
  **#24/#25** credential NCC/R2 · **#22/#113/#133/#134** chờ phần cứng (máy XN / thiết bị).

## Việc kế tiếp
1. `lint.sh` OK → xin push cơ chế Session Ops (1 commit governance).
2. **#195** write-path N+1 (tiền/kho/safety) — làm ở phiên có deploy + smoke (không tự sửa mù).
3. **TEST** (#191/#212/#216-347, label `test`) làm **CUỐI CÙNG** — chỉ sau khi 100% fix/tech-debt DONE. KHÔNG ngoại lệ.
4. **LUÔN** `git fetch` + `git pull --ff-only` + đối chiếu CODE (route/feature/issue đã có chưa) **TRƯỚC** khi pick task (2 máy song song).
