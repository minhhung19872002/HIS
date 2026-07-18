# Session Ops — running one session (open · choose model · plan-mode · context cleanup · handoff)

> **OWNED scope (REGISTRY):** this file is the SOURCE OF TRUTH for **4 NEW things**: (a) the *what-to-read-at-session-start* checklist,
> (b) *when-to-use-plan-mode* + plan reuse, (c) *context cleanup* (`/compact` `/clear` `/rewind` `/context`),
> (d) *handoff discipline* (keep STATUS.md SHORT). Everything else **LINKS, does NOT copy**: model → `CLAUDE.md §Agent routing`;
> git-sync/commit/push → [`project-rules.md`](project-rules.md) §2-4; pipeline/DONE → [`workflow.md`](workflow.md);
> report-file location → [`../SKILL-MAP.md`](../SKILL-MAP.md) §0a.

> ⚠️ **3 HARD LIMITS of the AI (don't expect automation):**
> 1. The AI **cannot change the model itself** — only the user `/model`, and NOT mid-session → "choose the model for the session" is at most a **nudge at session open**.
> 2. The AI **cannot read its own live context %** — only the user sees it (status line / `/context`) → the "60%" threshold is **the user's call**, not AI-triggered.
> 3. `/compact` `/clear` `/rewind` `/context` are **user commands** — the AI can't run them.
>
> ⇒ Below = a **decision table for the USER** + behavior rules for the AI (proactively refresh the handoff at each milestone; proactively offer a handoff).

## 1. Opening a session — what to read, in order (save context)
The harness auto-loads **CLAUDE.md + MEMORY.md**. The `session-start.sh` hook prints a banner (branch/dirty/behind + test-last reminder + `/model` nudge). Then:
1. Read **`docs/workspace-docs/STATUS.md`** — where-we-are / blocker / next (the SHORT version; long history lives in `90-archive/handoffs/`).
2. Banner reports **`behind>0`** → `git pull --ff-only` + check whether the CODE already exists (SYNC-GATE, [`project-rules.md`](project-rules.md) §2) **BEFORE** picking/writing.
3. Entering a **code task** → [`../SKILL-MAP.md`](../SKILL-MAP.md) (router) → sub-map → skill. Look symbols up fast with the ctags `tags` index (`core-codebase-map-tooling`).

Do NOT wander through source — open **only** the files STATUS/SKILL-MAP/the skill point to. Open `task.md`/the Issue body when the task is non-trivial.

## 2. Choosing the model tier (NUDGE — owner = `CLAUDE.md §Agent routing`, no table repetition)
- **Sonnet** — ~80-90% of everyday work: normal code/feature, a clear bug fix in a few files, test · lint · docs · small refactor.
- **Opus** — genuinely HARD work: new architecture/phase, multi-file/multi-module refactor, migration · DI · contract · DB, **money · patient-safety**, hard debugging, large security review.
- **Haiku / subagent / `agy`** — scan · lookup · **isolated boilerplate NOT touching the guardrail**; return a short summary to the main session.

AI: at session start, assess the request's nature → if the model is in the wrong tier, **nudge the user to `/model`** to the right tier BEFORE starting; if it already matches, stay quiet and get to work.

## 3. Plan mode — when to enable, where to store it (reuse, no re-planning)
**Enable plan mode when:** the task is LARGE/hard (new phase · large module · multi-file refactor · hard debug · migration) **and the context is still clean** (session start = best). Small/clear task → do NOT enable (wasted token overhead).

**Store & reuse:** a finalized plan → write it into the task's **GitHub Issue body** (the official state-store — [`workflow.md`](workflow.md) §2), do **NOT spawn a loose `PLAN_*.md` file** (duplicate state-store → drift). Next session: open the Issue → **implement per the plan, do NOT re-plan**.

Ideal workflow: *plan mode (clean context) → finalize the plan into the Issue → `/clear` → new session implements (usually = Sonnet).*

## 4. Cleaning up context — pick the right tool (TABLE FOR THE USER)
| Situation | Tool | Why |
|---|---|---|
| AI is going the wrong way | **`/rewind`** or **Esc** | Go back to before the mistake, don't keep the wrong direction in context |
| Same task but history too long | **`/compact`** | Compress history, KEEP the goal + edited files + remaining errors + next |
| Switching to a NEW (unrelated) task | **`/clear`** or a new session | Clear old noise, start clean |
| Task unfinished but the session is heavy | **Handoff (§5) → new session** | Save the key state then continue with clean context |
| Unsure why context is heavy | **`/context`** | See which component is taking space |

⚠️ Don't always `/clear`: a task **unfinished and NOT yet handed off** → `/clear` **loses the thread**. Do the handoff (§5) first.

## 5. Handoff & the "heavy context" threshold (~60%)
When context is ~60% (the user sees the %) **OR** before leaving an unfinished task → the safe sequence:
**stop adding new code → update the handoff → (commit a milestone if the user permits — [`project-rules.md`](project-rules.md) §2) → new session reads STATUS + Issue → summarize, do NOT edit code yet.**

**Handoff = update `STATUS.md`** (short session-state; the hook reminds + the Stop hook blocks if you forget), recording: where-we-are · edited files · build/test run · errors/remaining work · next · **what NOT to do next session**. A long/multi-task session → also add `90-archive/handoffs/session-YYYY-MM-DD-handoff.md` ([`../SKILL-MAP.md`](../SKILL-MAP.md) §0a) for history; **STATUS.md STAYS SHORT** (§6).

**AI proactivity (compensating for the can't-measure-% limit):** auto-refresh `STATUS.md` at **each milestone** (a part done / direction change) so the user can `/clear` safely at any time; and **proactively offer a handoff** when many files have been touched / the chain has gotten long.

## 6. Discipline of keeping STATUS.md SHORT (anti context-bloat)
STATUS.md is read by the hook **every session** → bloat = **every session wastes context**. Keep it **~30-40 lines**, only: *In-progress (uncommitted) · Recently-done · Blocker · Next*. Old session history → **move to `90-archive/handoffs/`**, STATUS only links. Detailed backlog/plan = **GitHub Issues** (do NOT copy into STATUS).

## 7. Permission Modes (cheat-sheet — harness config, NOT a rule)
Change mode **LIVE** with `Shift+Tab`; the session default = `permissions.defaultMode` (settings.json); a one-session flag = `--permission-mode`.

| Mode (Shift+Tab) | `defaultMode` | Does what | Safety |
|---|---|---|---|
| Ask Permission | `default` | Asks before every edit/command | 🟢 high (slow) |
| Accept Edits | `acceptEdits` | Auto-accepts file edits, still asks on unfamiliar Bash | 🟡 balanced |
| Plan Mode | `plan` | Read-only, planning only | 🟢 (use per task) |
| Bypass | `bypassPermissions` | Skips ALL prompts | 🔴 dangerous |

Other modes not shown: **`auto`** (auto-allows safe work · soft-blocks destructive · hard-blocks security — needs `skipAutoPermissionPrompt:true`) · `dontAsk`.
- Do NOT "add all 4" — pick **1** default then `Shift+Tab` to change in place. The thing that *pre-answers prompts* (fewer questions) = `permissions.allow`/`deny`/`ask`, **not** the mode.
- HIS currently: project (`settings.local.json`) + global = **`auto`**. **ABSOLUTELY DO NOT** set `bypassPermissions` as default (skips even destructive-command prompts — against governance). Use Plan Mode **per task**.
- **The `allow`/`ask`/`deny` rules** = long-term guardrails (stronger than the mode): **deny** secrets (`.env`·`secrets/`·`*.key|pem|pfx`·`appsettings.Production.json`) + destructive (`rm -rf`·force-push·`reset --hard`·DROP) · **ask** `git commit`·`git push`·`reset`·`npm install`·`gcloud run|builds` · **allow** safe-read + build + test. Baseline = `.claude/settings.json` (committed, shared across 2 machines); per-machine allow = `settings.local.json`.

## 8. Session ↔ task naming — which window is running which task (#430)

Running N parallel windows on one tree → make each window's CURRENT TASK visible so the user tells them apart.
The identity source is the **window-lock** you already claim (CLAIM-FIRST, [`project-rules.md`](project-rules.md) §2): its `key` = the task.

- **Claim with the ISSUE NUMBER as the key + a short note** so the display reads well:
  `bash .claude/window-lock.sh claim <issue#> <model> "<short title>"` (a slug only when there is no issue).
- **Statusline** (`.claude/statusline.sh`, wired in `settings.json`) shows `⎇branch · 🔖 task #<key> · <note> · <model>`
  for THIS window, LIVE — it auto-updates the moment you claim/release a lock. No user action needed.
- **Tab title**: the `SessionStart` hook sets `sessionTitle = HIS: task #<key>` from this session's lock on
  **startup/resume** (only when a lock exists — else Claude's auto-title stands; ignored on clear/compact).
- **On task switch**: release the old lock + claim the new one → statusline updates immediately. The assistant
  **CANNOT** rename the chat tab mid-session (Claude Code exposes `/rename` to the USER only) → state the canonical
  name and suggest the user run `/rename <task>` (the tab also self-corrects on the next resume via the hook).

> Mechanism: `.claude/statusline.sh` + `.claude/hooks/session-start.sh` (sessionTitle) reading `.claude/window-lock.sh` locks.

---
> Related: [`workflow.md`](workflow.md) (pipeline) · [`project-rules.md`](project-rules.md) (git-ops/rollback) · [`README.md`](README.md) (index of `.claude/workflow/`) · `CLAUDE.md §Agent routing` (model). **After editing this file → run `bash .claude/lint.sh`.**
