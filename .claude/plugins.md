# Plugins — reuse map (USE net-new · DEFER-to-HIS · COMPLEMENT)

> 6 `claude-plugins-official` plugins enabled in `~/.claude/settings.json` (**USER-global → ALL projects**, not HIS-only).
> This file = **routing for HIS work**: which plugin to USE (new capability), which to DEFER to a HIS skill (you already have your own config),
> which to COMPLEMENT. Principle: **HIS-specific work → the HIS skill wins** (stack-aware); a generic plugin is only for
> greenfield/non-HIS or when adding a new capability. **Do NOT cram everything into use** (anti ambiguity / dual-system / drift).

## Routing table
| Plugin | Provides | HIS role | When to use |
|---|---|---|---|
| **chrome-devtools-mcp** | MCP live DevTools + skills (a11y · LCP · memory · troubleshoot) | ✅ **USE (net-new)** | Diagnose a **RUNNING page**: console-error · network · perf/LCP/CWV · a11y · memory-leak. NOT for writing code (that's `his-fe-performance` / `core-accessibility-pattern`). |
| **playwright** (MCP) | MCP browser driving (navigate/click/snapshot/**screenshot**/fill/wait) | ✅ **USE (net-new)** | Verify a live FE fix · reproduce a bug · **capture evidence** (the FINAL test phase). Writing durable test files is still `his-test-e2e`. |
| **github** (MCP) | MCP GitHub API | ⚖️ **COMPLEMENT** | Default to the **`gh` CLI** (already in the allow-list + git-ops governance). MCP only when `gh` can't do it. |
| **code-review** | command `/code-review` (generic) | ⚖️ **DEFER for HIS work** | Reviewing a HIS diff → the `his-quality-reviewer` agent (knows DI/ValueConverter/_v2kit/EF). `/code-review` for a quick / non-HIS diff. |
| **frontend-design** | generic UI skill (anti AI-slop) | ❌ **DEFER for HIS work** | HIS UI → `core-ui-aesthetics` + `his-fe-page-v2` + `his-fe-convention` (Antd v6 / _v2kit / ab-*). frontend-design only for greenfield/non-HIS or visual ideas. |
| **claude-code-setup** (recommender) | automation-suggestion skill | ⚖️ **META — occasionally** | Brainstorm a new hook/skill/agent. Output MUST pass `REGISTRY.md` + `lint.sh` before acceptance (HIS governance keeps the standard). |

## DEFER rules (HIS work — avoid dual-system)
- **HIS-specific work** (touching the stack: Antd/_v2kit/EF/DI/Clean-Arch/Issues) → the **`his-*`/`core-*` skill WINS**; a generic plugin is only a fallback.
- **Plugin = USER-global** → KEEP IT for other projects; HIS only *routes*, does **NOT disable** (unless you explicitly ask).
- **Net-new (chrome-devtools / playwright MCP)** = a **live-browser** capability HIS lacks → **use freely** for debug/verify/evidence. Concrete touchpoints: `skill-routes/fe.md` (live FE debug) + `skill-routes/test.md` (evidence + final test phase).
- ⚠️ **The MCP browser does NOT break the test-last rule:** capturing evidence / running tests only in the **TEST phase (after the fix is DONE)**;
  during the fix, use it only to **verify/debug** the change being made.

## Related
`SKILL-MAP.md` (skill router) · `REGISTRY.md` (owner) · `skill-routes/fe.md` + `skill-routes/test.md` (touchpoints). After editing this file → run `bash .claude/lint.sh`.
