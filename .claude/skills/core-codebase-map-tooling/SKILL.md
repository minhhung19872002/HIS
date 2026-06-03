---
name: core-codebase-map-tooling
description: Use this portable, tech-agnostic skill to set up and use a code-map / symbol-index tool so AI coding agents (Claude Code, Cursor, Codex) navigate a real codebase with fewer tokens and fewer commands — locating where functions/classes/symbols are defined or referenced via an index instead of blind full-text search. Triggers include starting AI-assisted work on a software project, "where is X defined / who calls Y", repeatedly grepping source to find a symbol, onboarding to an unfamiliar repo, or "integrate a code-intelligence / code-map tool". Recommends a tiered approach: universal-ctags (lightweight — query the generated `tags` file: grep '^Symbol' tags → file:line + kind + class + language) as the low-risk baseline; an LSP-based MCP server (e.g. Serena) for semantic find-references / symbol-overview when worth the setup; SCIP for a precise code graph. Covers generating/refreshing the index and gitignoring it (generated, large, can go stale — never commit; regenerate after big changes). Do NOT recommend repo-dump packers (repomix/code2prompt) that INCREASE tokens, or GUI code visualizers (eye-candy, not agent-consumable); treat the index as a navigation aid, not source of truth — always verify against the real code (core-verify-before-assert).
metadata:
  type: core
---

# Core — Codebase Map / Symbol-Index Tooling for AI Agents (portable)

> TẦNG: **A · CORE** (portable, tech-agnostic). Dựng + dùng **"bản đồ mã"** (index hàm/lớp/symbol) để agent
> điều hướng codebase **ít token, ít lệnh** — chỉ hữu ích khi **đang lập trình** một dự án phần mềm thật.
> Ưu tiên **công cụ thực dụng cho agent**, KHÔNG "tool màu".

## Tại sao
Agent tìm "X định nghĩa ở đâu / ai gọi Y" bằng grep mù → nhiều lệnh + nhiều token + nhiễu. Một **index ký hiệu**
trả ngay `file:line + kind + class` trong 1 lệnh. Đây là đề xuất nên áp **mọi dự án AI-assisted** (con người cũng dễ quản lý hơn).

## Khi nào dùng / KHÔNG dùng
- **Dùng:** bắt đầu/đang sửa source 1 dự án; "hàm/lớp X ở đâu", "ai gọi Y", onboard repo lạ, "tích hợp công cụ code-map".
- **KHÔNG:** dự án không có source / chỉ hỏi đáp. KHÔNG dùng repo-dump (repomix/code2prompt — **tăng** token) hay visualizer GUI (đẹp cho người, agent không tiêu thụ).

## 3 tầng công cụ (chọn theo nhu cầu)
| Tầng | Công cụ | Cho gì | Rủi ro/Setup |
|---|---|---|---|
| **1 (baseline)** | **universal-ctags** | index ký hiệu (hàm/lớp/method/const) → grep file `tags` | **Rất thấp** — 1 binary + 1 file |
| 2 (semantic) | **LSP-MCP** (vd **Serena**) | find_references / symbol_overview qua Language Server (call-graph thật) | Trung — cần uv + LSP từng ngôn ngữ + `claude mcp add` |
| 3 (graph) | **SCIP** (scip-typescript…) | code-graph chính xác chuẩn Sourcegraph | Cao — nặng, theo ngôn ngữ |

→ **Bắt đầu tầng 1 (ctags)**; nâng tầng 2 (Serena) khi cần điều hướng sâu.

## Dùng file `tags` thế nào (agent — token-efficient)
Sau khi sinh `tags`, thay vì grep toàn source:
- **Định nghĩa của symbol:** `grep -nE '^SymbolName\b' tags` (PowerShell: `Select-String -Path tags -Pattern '^SymbolName\b'`) → ra `file<TAB>pattern;"<TAB>kind line:N language:… class:…`.
- Lọc theo loại/ngôn ngữ: thêm `class:` / `language:C#` / `kind` trong dòng kết quả.
- **Luôn mở file thật ở `file:line`** để xác nhận (tags có thể **stale** → `core-verify-before-assert`).

## Người dùng (human) theo dõi — editor + sơ đồ (KHÔNG đọc raw `tags`)
`tags` cho MÁY; con người điều hướng/giám sát qua:
- **VS Code:** `F12` định nghĩa · `Shift+F12` nơi gọi · `Ctrl+T` tìm symbol toàn repo · chuột phải → **Show Call Hierarchy** (cây gọi) · panel **Outline**. (TS sẵn; **C# cần extension "C# Dev Kit"**.)
- **Sơ đồ trực quan:** `docs/architecture/codebase-map.md` — kiến trúc hệ thống/FE/BE + sơ đồ phụ thuộc module. ⚠️ **Khối ```mermaid``` trong VS Code preview FLAKY** (render được rồi **trống sau reload** do extension nạp sau khi tab preview khôi phục). → **Render ra SVG tĩnh + nhúng `![]()`** (ổn định, không cần extension, sống qua reload, GitHub cũng thấy): nguồn `diagrams/*.mmd` → `pwsh -File scripts/gen-diagrams.ps1` (dùng `@mermaid-js/mermaid-cli` qua npx). **Script .ps1 phải ASCII-only** (Windows PowerShell 5.1 mis-parse non-ASCII trong string literal).
- **dependency-cruiser (FE):** `cd frontend && npm run dep:mermaid` (sinh sơ đồ phụ thuộc module, collapse theo folder) · `npm run dep:check` (phát hiện **import vòng**). Config `frontend/.dependency-cruiser.cjs`. SVG (tuỳ chọn): cài Graphviz → `depcruise src --output-type dot | dot -Tsvg -o deps.svg`.
> ⚠️ Tránh auto-vẽ call-graph CẢ repo (hairball không đọc nổi = "tool màu") — sơ đồ hữu ích phải **scoped + curated** (1 module/luồng).

## Setup (HIS binding — portable cho dự án khác)
- **Cài (Windows):** `winget install --id UniversalCtags.Ctags -e` (đã cài bản 6.1, hỗ trợ TypeScript + C#). Restart shell 1 lần để có `ctags` trên PATH. (macOS `brew install universal-ctags`; Linux `apt/dnf install universal-ctags`.)
- **Sinh/cập nhật:** `pwsh -File scripts/gen-tags.ps1` → index `frontend/src` (TS) + `backend/src` (C#) vào `tags` (loại node_modules/bin/obj/dist). Raw: `ctags -R --languages=TypeScript,C# --exclude=node_modules --exclude=bin --exclude=obj --exclude=dist --fields=+nKl --extras=+q -f tags frontend/src backend/src`.
- **Gitignore** `tags` (đã thêm `/tags`) — KHÔNG commit (lớn ~23MB + stale). Regenerate sau thay đổi lớn.
- **Dự án khác:** đổi `--languages` + thư mục nguồn cho hợp stack; cùng pattern (cài → gen → gitignore → grep).

## Guardrail
- `tags` là **navigation aid, KHÔNG phải source of truth** → khẳng định gì về code vẫn phải Read/Grep verify (`core-verify-before-assert`).
- Stale: thêm/sửa/xoá symbol nhiều → chạy lại `gen-tags.ps1`.
- Cài tool = **env-change** → surface + xin duyệt (`core-prod-change-discipline`); nâng lên Serena/MCP cũng vậy (`update-config` cho MCP).

## Liên quan
`core-verify-before-assert` · `core-prod-change-discipline` (env-change discipline) · `update-config` (MCP nếu lên Serena) · `core-architecture-consistency`.