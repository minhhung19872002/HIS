---
name: core-codebase-map-tooling
description: Use this portable, tech-agnostic skill to set up and use a code-map / symbol-index tool so AI coding agents (Claude Code, Cursor, Codex) navigate a real codebase with fewer tokens and fewer commands — locating where functions/classes/symbols are defined or referenced via an index instead of blind full-text search. Triggers include starting AI-assisted work on a software project, "where is X defined / who calls Y", repeatedly grepping source to find a symbol, onboarding to an unfamiliar repo, or "integrate a code-intelligence / code-map tool". Recommends a tiered approach: universal-ctags (lightweight — query the generated `tags` file: grep '^Symbol' tags → file:line + kind + class + language) as the low-risk baseline; an LSP-based MCP server (e.g. Serena) for semantic find-references / symbol-overview when worth the setup; SCIP for a precise code graph. Covers generating/refreshing the index and gitignoring it (generated, large, can go stale — never commit; regenerate after big changes). Do NOT recommend repo-dump packers (repomix/code2prompt) that INCREASE tokens, or GUI code visualizers (eye-candy, not agent-consumable); treat the index as a navigation aid, not source of truth — always verify against the real code (core-verify-before-assert).
metadata:
  type: core
---

# Core — Codebase Map / Symbol-Index Tooling for AI Agents (portable)

> TIER: **A · CORE** (portable, tech-agnostic). Set up + use a **"code map"** (function/class/symbol index) so the agent
> navigates the codebase with **fewer tokens, fewer commands** — useful only when **actually programming** a real software project.
> Prefer **practical agent tooling**, NOT "eye-candy tools".

## Why
The agent finds "where is X defined / who calls Y" via blind grep → many commands + many tokens + noise. A **symbol index**
returns `file:line + kind + class` in 1 command. This is a recommendation to apply to **every AI-assisted project** (humans manage it more easily too).

## When to use / NOT use
- **Use:** starting/editing the source of a project; "where is function/class X", "who calls Y", onboarding an unfamiliar repo, "integrate a code-map tool".
- **NOT:** a project with no source / pure Q&A. Do NOT use repo-dump (repomix/code2prompt — **increases** tokens) or a GUI visualizer (pretty for humans, not agent-consumable).

## 3 tool tiers (choose by need)
| Tier | Tool | For | Risk/Setup |
|---|---|---|---|
| **1 (baseline)** | **universal-ctags** | symbol index (function/class/method/const) → grep the `tags` file | **Very low** — 1 binary + 1 file |
| 2 (semantic) | **LSP-MCP** (e.g. **Serena**) | find_references / symbol_overview via a Language Server (real call-graph) | Medium — needs uv + a per-language LSP + `claude mcp add` |
| 3 (graph) | **SCIP** (scip-typescript…) | a precise Sourcegraph-standard code-graph | High — heavy, per-language |

→ **Start at tier 1 (ctags)**; upgrade to tier 2 (Serena) when you need deep navigation.

## How to use the `tags` file (agent — token-efficient)
After generating `tags`, instead of grepping the whole source:
- **A symbol's definition:** `grep -nE '^SymbolName\b' tags` (PowerShell: `Select-String -Path tags -Pattern '^SymbolName\b'`) → gives `file<TAB>pattern;"<TAB>kind line:N language:… class:…`.
- Filter by kind/language: add `class:` / `language:C#` / `kind` in the result line.
- **Always open the real file at `file:line`** to confirm (tags can be **stale** → `core-verify-before-assert`).

## Humans monitoring — editor + diagrams (do NOT read raw `tags`)
`tags` is for the MACHINE; humans navigate/monitor via:
- **VS Code:** `F12` definition · `Shift+F12` callers · `Ctrl+T` find a symbol across the repo · right-click → **Show Call Hierarchy** (call tree) · the **Outline** panel. (TS built-in; **C# needs the "C# Dev Kit" extension**.)
- **Visual diagrams:** `docs/architecture/codebase-map.md` — system/FE/BE architecture + module dependency diagrams. ⚠️ A ```mermaid``` block in VS Code preview is FLAKY (renders, then goes **blank after reload** because the extension loads after the preview tab is restored). → **Render to a static SVG + embed `![]()`** (stable, no extension needed, survives reload, GitHub also shows it): source `diagrams/*.mmd` → `pwsh -File scripts/gen-diagrams.ps1` (uses `@mermaid-js/mermaid-cli` via npx). **The .ps1 script must be ASCII-only** (Windows PowerShell 5.1 mis-parses non-ASCII in a string literal).
- **dependency-cruiser (FE):** `cd frontend && npm run dep:mermaid` (generates a module dependency diagram, collapsed by folder) · `npm run dep:check` (detects **circular imports**). Config `frontend/.dependency-cruiser.cjs`. SVG (optional): install Graphviz → `depcruise src --output-type dot | dot -Tsvg -o deps.svg`.
> ⚠️ Avoid auto-drawing a call-graph of the WHOLE repo (an unreadable hairball = "eye-candy") — a useful diagram must be **scoped + curated** (1 module/flow).

## Setup (HIS binding — portable to other projects)
- **Install (Windows):** `winget install --id UniversalCtags.Ctags -e` (v6.1 installed, supports TypeScript + C#). Restart the shell once to get `ctags` on PATH. (macOS `brew install universal-ctags`; Linux `apt/dnf install universal-ctags`.)
- **Generate/refresh:** `pwsh -File scripts/gen-tags.ps1` → index `frontend/src` (TS) + `backend/src` (C#) into `tags` (exclude node_modules/bin/obj/dist). Raw: `ctags -R --languages=TypeScript,C# --exclude=node_modules --exclude=bin --exclude=obj --exclude=dist --fields=+nKl --extras=+q -f tags frontend/src backend/src`.
- **Gitignore** `tags` (already added `/tags`) — do NOT commit (large ~23MB + stale). Regenerate after big changes.
- **Other projects:** change `--languages` + source dirs to match the stack; same pattern (install → gen → gitignore → grep).

## Guardrail
- `tags` is a **navigation aid, NOT a source of truth** → any claim about the code still needs Read/Grep verify (`core-verify-before-assert`).
- Stale: after adding/editing/removing many symbols → re-run `gen-tags.ps1`.
- Installing the tool = an **env-change** → surface + ask for approval (`core-prod-change-discipline`); upgrading to Serena/MCP too (`update-config` for MCP).

## Related
`core-verify-before-assert` · `core-prod-change-discipline` (env-change discipline) · `update-config` (MCP if upgrading to Serena) · `core-architecture-consistency`.
