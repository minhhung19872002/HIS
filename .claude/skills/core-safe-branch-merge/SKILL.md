---
name: core-safe-branch-merge
description: Use this skill (portable, tech-agnostic) to SAFELY consolidate/merge local branches + worktree work into a main branch WITHOUT regressing it. Triggers include "merge branches into main", "consolidate local branches", "clean up my branches", "is this branch safe to merge", "combine the worktree work", "should I merge or cherry-pick", or finding stray backup-*/feature/WIP branches or uncommitted worktrees. Enforces fetch-origin → enumerate → ahead/behind → classify → SUPERSESSION check (git cherry / patch-id) → cherry-pick-specific-over-full-merge → stage-and-review → build+semantic verify → parallel-window/worktree safety → push discipline → rollback. Do NOT use for a normal single-file edit (core-code-change-workflow), pure design/planning with no git op, or resolving one ordinary in-progress conflict.
metadata:
  type: reference
---

# Core — Safe Branch / Worktree Merge (portable)

> TIER: **A · CORE** (governance, tech-agnostic). How to fold local branches + worktree work into `main` **without regressing it**. Owner of the *merge-safety process*; for the rules it touches it LINKS, not copies — git-ops permission = [`workflow/project-rules.md`](../../workflow/project-rules.md) §2-4 · parallel-window/worktree model = [`workflow/parallel-windows.md`](../../workflow/parallel-windows.md) · rollback policy = `project-rules.md` §6.

A full-branch merge is the most destructive "harmless-looking" git op. Two traps drive every accident:
- **Value on a branch ≠ commits not yet on main.** A money/logic fix can be *already live on main* via another path — from the branch's side it still looks "unmerged".
- **A stale branch drags in unknown/unwanted commits + mass conflicts.** (It does NOT wholesale-resurrect files a clean 3-way merge leaves alone — the danger is modify/delete conflicts, mis-resolved conflicts, and evil merges, not blanket file revival.)

So: **prove supersession per commit, integrate the specific commit not the branch, and review the STAGED result — never trust that the source commit equals the applied result.**

## When to use
- Consolidating several local branches / worktrees down to `main`.
- Deciding **merge vs cherry-pick vs skip vs keep-as-backup** for a branch.
- A shared working tree with parallel windows + `backup-*` / never-push branches.

## When NOT to use
- A single ordinary code edit → `core-code-change-workflow`.
- Pure design/planning, no git op yet.
- One in-progress conflict on a normal feature merge (just resolve it).

## Golden rules (hard-learned)
1. **Compare to `origin/*`, not local.** On a multi-machine / multi-window setup local `main` is routinely behind `origin/main`; every ahead/behind, the classify gate, and "already on main" are wrong against a stale baseline. **`git fetch origin` FIRST.**
2. **Behind-count is a heuristic red flag.** A branch far behind (e.g. > ~50 commits) → **do NOT full-merge**; cherry-pick the proven-valuable commits instead. *(Heuristic, not a mechanism — see the trap note above.)*
3. **Prove supersession per commit before taking anything.** A fix may already be on main via another SHA. Merging a superseded fix = churn + regression risk, zero value.
4. **Cherry-pick is NOT automatically safe.** It applies a *diff*: against a diverged main it can fail, apply with fuzz to the WRONG location, or apply clean-but-semantically-wrong (symbol renamed on main; fix already present in another form). Always **stage and read the diff vs intent** (§5/§7).
5. **No commit / no push without explicit user permission** (an explicit keyword *this turn*). Owner: `project-rules.md` §2-4. Here both FE and BE push to `main` auto-deploy prod (see §9).

## Ordered checklist

### 0. FETCH FIRST
- `git fetch origin`. From here on, compute EVERYTHING (ahead/behind, base age, supersession) against **`origin/main`**, not local `main` (which may be stale/ahead-unpushed).

### 1. ENUMERATE everything
- `git branch -vv` · `git worktree list` · `git status` · `git stash list`.
- Explicitly capture **uncommitted worktree work** and stashes — they are integration candidates too and are the easiest to lose.

### 2. AHEAD / BEHIND + merge-base age (per candidate branch)
- `git rev-list --left-right --count origin/main...<branch>` → `<ahead> <behind>`.
- `git merge-base origin/main <branch>` → `git show -s --format=%ci <base>` = how OLD the fork point is.
- Record a table: branch · ahead · behind · base-age · upstream.

### 3. CLASSIFY each branch
- **active-feature** (small behind, real unique work) → merge/cherry-pick candidate.
- **stale-backup** (large behind, old base) → **cherry-pick only or skip**; full-merge is banned (Golden rule 2).
- **never-push** (e.g. `backup-*` marked LOCAL-ONLY) → extract value by cherry-pick if any, else leave untouched (§10).

### 4. SUPERSESSION CHECK — the core gate (before taking ANY commit)
For each **unique** commit (`git log --oneline origin/main..<branch>`):
- **Primary (patch-identity):** `git cherry -v origin/main <branch>` — a leading **`-`** = already in main (applied by patch-id); `+` = genuinely absent. Also `git log --cherry-pick --right-only origin/main...<branch>`. A pick that later reports *"nothing to commit"* is itself a supersession signal.
- **Secondary (semantic):** `git show <sha>` to see the actual change, then compare its VALUE on main by feature/logic — `git show origin/main:path` + diff the region; grep main for the fix's marker/symbol. Catches a fix **re-implemented differently** (patch-id won't match) and guards against a false "unmerged".
- **Already on main → SKIP** (record "superseded by <sha> on main"). **Genuinely unmerged AND still valuable → §5.**
- *Why: this gate caught a money-fix already live on main from another branch — a full-merge would have regressed it.*

### 5. INTEGRATE — specific commit, staged, reviewed
- Stale/backup → `git cherry-pick -n <sha>` (**`-n` = stage, do not auto-commit**), then **`git diff --staged` and read it against INTENT** before committing. Never assume `applied == source commit`.
- A "valuable" commit may **depend on earlier unmerged commits** — cherry-pick the minimal dependent SET in order, or port the feature as one fresh squashed change; don't assume self-containment.
- A **merge commit** needs `git cherry-pick -m 1 <sha>` (pick the mainline parent) — a plain pick fails.
- Prefer `git merge --ff-only` when the branch is a true continuation (its **refusal on divergence is a safe signal — don't force past it**). True/no-ff merge only for a clean, near-zero-behind branch.
- One integration at a time; VERIFY (§7) before the next.

### 6. CONSOLIDATE worktree / uncommitted work
- Commit it in its worktree, then rebase/cherry-pick **onto current `origin/main`**.
- Resolve **same-file append overlaps** deliberately (e.g. helpers appended to a shared `format`/`util` file after an earlier extraction) — keep **BOTH** additions; don't let the older side win. When two lines both append right after the same anchor, re-apply yours *after* the newer content rather than at the old offset.

### 7. VERIFY GATE after EVERY integration
- Build / typecheck / lint must pass; run the relevant tests. **Plus a semantic diff review** (§5) — build-green ≠ behavior-correct; a compile-clean pick can still be a regression.
- **Never push a side you cannot locally build/verify** (e.g. a machine lacking the backend toolchain must not push backend). A green pick that doesn't compile is not integrated. Fail → roll back that step (§11), fix, re-verify.

### 8. PARALLEL-WINDOW SAFETY (shared working tree) — owner: `parallel-windows.md`
- Contended shared tree → **isolate the risky merge in a dedicated worktree**: `git worktree add --detach <dir> origin/main` (you **cannot** check out `main` in a second worktree while it's checked out in the main tree — use `--detach`).
- To build in that worktree, **junction/symlink `node_modules`** from the main tree in. **Tear down with `git worktree remove` / `rmdir` the junction — NEVER `rm -rf`** (it follows the junction and deletes the SHARED tree's real `node_modules`).
- **Only `git add` your own explicit paths** — never `git add -A` on a mixed tree (stages siblings' half-done work; also buries CRLF churn — see Pitfalls).
- **NEVER pull / rebase / reset the shared `main` working tree** while sibling windows have WIP — it destroys their uncommitted work.
- **Never resolve another window's in-flight rebase/merge**; a shared session file (e.g. `STATUS.md`) may be clobbered by another window — don't fight over it, re-apply yours later.

### 9. PUSH DISCIPLINE — owner: `project-rules.md` §2-4
- **No commit/push without an explicit user keyword this turn** (permission does not carry across turns).
- **Both** backend (Cloud Run GH Action on `backend/**`) **and** frontend (Vercel on any push to `main`) **auto-deploy prod** — warn explicitly before either; require permission for each side.
- Sync before the final push: `git pull --rebase` **only when the working tree is clean AND uncontended**. On a dirty/contended shared main, do NOT pull/rebase (see §8) — instead push from the **isolated detached worktree**: cherry-pick your own commits onto `origin/main` there, then `git push HEAD:main`.
- Push **atomically** with `Closes #N`; don't push partial multi-part work.

### 10. NEVER-PUSH / backup branches
- Leave `backup-*` (LOCAL-ONLY) branches in place as local safety nets after extracting any valuable commit.
- **Delete a branch ONLY with explicit user OK** — never prune "to tidy up"; it may be a last-known-good.

### 11. ROLLBACK — general policy owner: `project-rules.md` §6; merge-specific mechanics:
- **Capture the pre-op sha first:** `START=$(git rev-parse HEAD)`; stash/commit unrelated WIP BEFORE the op (a bad step must not eat uncommitted work).
- In-flight abort: `git merge --abort` · `git cherry-pick --abort` · `git rebase --abort`.
- Committed mistake → `git reset --hard $START` **only on an isolated worktree/branch you own** (never on a shared `main` with siblings' WIP; ORIG_HEAD is transient — use the captured `$START`). Otherwise `git revert`.
- Lost a commit → `git reflog` → recover the sha → cherry-pick back.

## Pitfalls
- Treating "branch has commits main doesn't" as "branch has value" — run §4 first (`git cherry`).
- `git merge` a far-behind branch "to be safe" — pulls unknown commits + mass conflicts; cherry-pick instead.
- Trusting a cherry-pick applied correctly — always read the STAGED diff (§5).
- Comparing to local `main` without `git fetch origin` (§0) — stale baseline → wrong verdict.
- `rm -rf` a verify-worktree — deletes the shared `node_modules` through the junction (§8).
- Pushing without warning — triggers a FE (Vercel) or BE (Cloud Run) prod deploy (§9).
- CRLF/autocrlf whole-file churn on a pick/merge can bury the real change and clobber siblings — stage explicit paths, check `git diff --stat` before committing.

## When to update
- When the repo's branch model, deploy-on-push behavior, or parallel-window / worktree conventions change.
