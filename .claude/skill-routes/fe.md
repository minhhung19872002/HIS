# Skill-routes · FE TIER (Frontend)

> Sub-map — read it **TOGETHER WITH** `.claude/SKILL-MAP.md`. For the CORE principles (choose when) see (1a) in SKILL-MAP.
> Every chain: **core-* first → his-* after**. Every code-gen INCLUDES `core-reusable-code` + `core-clean-code` + `his-qa-anti-pattern`.

> ★ **`his-fe-convention` applies WITH EVERY FE task** (generate/refactor/review): naming · layer separation ·
> folder · config-driven shared components · maintainability · backward-compat refactor · self code-review.
> Read it alongside the specialty skill below. Detail: `.claude/skills/his-fe-convention/SKILL.md`.
>
> **★ REUSE-FIRST + ANTD-FIRST (MANDATORY):** before creating a new component/hook/util/api → **grep whether it already exists**
> (`_v2kit`, `components/`, `hooks/`, `utils/`, `api/`, `constants/`) → if it exists, reuse/extend, do NOT duplicate.
> Always prefer **Antd v6 / `_v2kit`**, **do NOT write plain HTML/CSS when not needed**.

## FE skills (`his-fe-*`, `his-fs-*`)

| Skill | Purpose | Choose when the request involves |
|---|---|---|
| `his-fe-convention` | ★ mandatory FE convention + architecture (naming/layer/folder/component/refactor/review) | **EVERY** FE code generate/refactor/review |
| `his-fe-library-policy` | ★ choose/integrate the right library at the right time (form/validate/data/state/date/chart/test/error) — HIS default stack, a new lib only with a clear win + user approval + dep installed + coexisting | **EVERY** FE code generate/refactor (avoid "mass-produced code") |
| `his-fe-page-v2` | v2 page (`_v2kit` + `ab-*`, route `/v2/*`, menu) | create/edit a v2 screen |
| `his-fe-api-client` | axios `api/*.ts` + DTO interface | call the backend from FE |
| `his-fe-antd-v6` | Antd v6 UI on a v1 page + avoid deprecated | edit a v1 page / antd error |
| `his-fe-webauthn-biometric` | WebAuthn biometric signing (register/2-phase sign) | fingerprint/FaceID, `/api/biometric`, navigator.credentials |
| `his-fe-standalone-portal` | a standalone portal outside the layout (own login + own JWT) | the BHXH inspector portal, a separate login for external users |
| `his-fe-dicom-viewer` | Cornerstone3D viewer (MPR/MIP/MinIP/Cine/Mammo) | edit DicomViewer/CornerstoneViewer, projection, cine |
| `his-fe-emr-print-form` | VN medical print forms (MS xx/BV, DD xx, paraclinical, specialty record) | add a print form/slip, *Print component, PrintTemplateRenderer |
| `his-fe-performance` | bundle/code-split/re-render, heavy vendors (Cornerstone/Antd/recharts) | build warning >500KB, slow page/lag with many rows, tune manualChunks |
| `his-fs-realtime-signalr` | SignalR hub + client (reconnect + polling fallback) | realtime/push notifications, chat, live queue (spans FE+BE) |

> A11y/WCAG use `core-accessibility-pattern`; **taste / polish** use `core-ui-aesthetics` (CORE portable — anti "AI-slop", no UX harm). Both apply alongside `his-fe-page-v2` when building/reviewing UI.

> B5 domain: print forms (`his-fe-emr-print-form`) already split out. Create another domain skill when an HIS module has recurring specialized business (see (6) Fallback in SKILL-MAP).

> ★ **Live debug/verify a RUNNING page** (NOT writing code) → **MCP plugins**: **chrome-devtools** (console · network · perf/LCP · a11y · memory-leak) + **playwright** (drive the browser, snapshot/screenshot). **Complementary**, NOT a replacement for `his-fe-performance` / `core-accessibility-pattern` (writing code). Full routing + boundaries: `../plugins.md`.

## Prompt → skill chain (FE) + PATH

| When the developer prompts | Skills (core → his, in order) | Files/paths touched |
|---|---|---|
| "create v2 page [X]" | `core-reusable-code` → `core-error-loading-state` → `his-fe-library-policy` (pick form/data/state lib) → `his-fe-api-client` → `his-fe-page-v2` → `his-fe-convention` → `core-ui-aesthetics` (taste polish, no UX harm) → `his-fe-antd-v6` (if needed) → `his-qa-anti-pattern` | `frontend/src/api/*.ts`, `frontend/src/pages-v2/*.tsx`, `App.tsx`, `TerminalLayout.tsx` |
| "add api client [X]" | `core-types-contract` → `his-fe-api-client` | `frontend/src/api/*.ts` |
| "fix v1 page / antd error [X]" | `core-error-loading-state` → `his-fe-antd-v6` → `his-qa-anti-pattern` | `frontend/src/pages/*.tsx`, `MainLayout` |
| "biometric / patient fingerprint [X]" | `core-types-contract` → `core-error-loading-state` → `his-fe-api-client` → `his-fe-webauthn-biometric` → `his-qa-anti-pattern` | `api/nangcap24.ts`, `pages-v2/BiometricEnrollment.tsx`, `/api/biometric` |
| "a separate login portal for [external users]" | `core-validation-pattern` → `his-fe-api-client` → `his-fe-standalone-portal` | a route outside the layout `App.tsx`, `pages-v2/*Portal.tsx` |
| "DICOM viewer / MPR / MIP / cine [X]" | `core-reusable-code` → `core-error-loading-state` → `his-fe-dicom-viewer` | `components/*Viewer.tsx`, `pages/DicomViewer.tsx` |
| "add a print form / slip [X]" | `core-reusable-code` → `his-fe-emr-print-form` → `his-qa-anti-pattern` | `components/*PrintTemplates.tsx`, `PrintTemplateRenderer.tsx`, `constants/hospital.ts` |
| "realtime / push notification / chat / live queue [X]" | `core-error-loading-state` → `his-fe-api-client` → `his-fs-realtime-signalr` | `HIS.API/Hubs/*`, `Program.cs`, `contexts/NotificationContext.tsx`, `vite.config.ts` (spans FE+BE — also see be.md) |
| "optimize performance / reduce bundle / laggy page [X]" | `core-minimal-change` → `his-fe-performance` (measure first, optimize only hotspots) | `vite.config.ts` (manualChunks/worker.format), `App.tsx` (lazy), `components/*Viewer.tsx` (dynamic import), `pages-v2/*` |
| "make the UI accessible / a11y / WCAG [X]" | `core-accessibility-pattern` → `his-fe-page-v2` → `his-qa-anti-pattern` | `pages-v2/*.tsx`, `layouts/terminal/*` |
| "make the UI nicer / tasteful / less generic / more pro [X]" | `core-ui-aesthetics` (taste + restraint, anti slop) → `core-accessibility-pattern` (keep UX/contrast) → `his-fe-page-v2`/`his-fe-convention` | `pages-v2/*.tsx`, `_v2kit.tsx`, `layouts/terminal/ab-module.css` |
| "**review/audit system-wide UX-UI · sync light/dark · plan UI fixes**" | `core-ui-ux-audit` (AUDIT-FIRST → plan + tasks BEFORE → root-first fixes AFTER; no edits until the audit is done) → bind `his-fe-page-v2`/`his-fe-convention` + `core-ui-aesthetics`/`core-accessibility-pattern` | `pages-v2/_v2kit.tsx`, `layouts/terminal/ab-module.css` (light/dark tokens), all `pages-v2/*.tsx` |

## Conflict (FE)
- Page v1 (Antd) vs v2 (`_v2kit`): v1 → `his-fe-antd-v6`; v2 → `his-fe-page-v2`. Default new feature = **v2**. Do NOT mix.
