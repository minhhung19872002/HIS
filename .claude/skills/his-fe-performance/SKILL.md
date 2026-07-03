---
name: his-fe-performance
description: Use this skill when optimizing HIS frontend performance — bundle size, code-splitting, render/re-render cost, lazy loading heavy vendors (Cornerstone3D, Ant Design, recharts), and large-table/list responsiveness. Triggers include "optimize FE performance", "reduce bundle / chunk > 500KB", "page loads slowly / lags with many rows", fixing the Vite `chunkSizeWarningLimit` warnings, tuning `manualChunks` in `vite.config.ts`, or adding `React.lazy`/`useMemo`/virtualization. Adapts the open-source `vercel-labs/agent-skills` React rules to this project's Vite + React 19 + Antd v6 stack. Do NOT use for backend/load capacity (his-be-scalability), accessibility (core-accessibility-pattern), or building a new page (his-fe-page-v2).
metadata:
  type: project
---

# HIS Frontend Performance (Vite + React 19 + Antd v6)

Reduce bundle + render cost for the FE. The project has recorded very heavy chunks: `vendor-cornerstone`
~3MB (gzip 830KB), `vendor-antd` ~1.6MB, `vendor-charts` ~398KB → the build always warns >500KB.
This skill standardizes handling it properly instead of leaving it "accepted/deferred".

## When to use
- Build warns chunk > 500KB; a page opens slowly; a table/list lags with many rows.
- Adding a heavy library (DICOM viewer, chart, Excel/PDF export, QR) → must code-split.
- A page re-renders excessively (typing in the search box re-renders the whole table; props change constantly).

## When NOT to use
- Load / many concurrent users / slow DB → `his-be-scalability`.
- A11y/WCAG → `core-accessibility-pattern`. Creating a new screen → `his-fe-page-v2`.

## Standard pattern (per repo precedent)

1. **Route-level code-split** — every page loads via `React.lazy(() => import(...))` in `App.tsx`
   (already the precedent: `const OPDV2 = lazy(...)`). A new page MUST be lazy, don't static-import it at the top of `App.tsx`.
2. **Dynamic import a heavy vendor** — Cornerstone3D loads only when the viewer opens:
   `await import('@cornerstonejs/core')` (see `components/CornerstoneViewer.tsx`, `MipMinIpViewer.tsx`).
   Same for `xlsx`/export, `recharts`, `html5-qrcode` — import inside the handler/effect, not top-level.
3. **`manualChunks` (vite.config.ts)** — split large vendors into separate chunks (`vendor-cornerstone`,
   `vendor-antd`, `vendor-charts`, `vendor-qrcode` exist). A new heavy lib → add a manualChunk
   so the common chunk doesn't bloat. `worker.format: 'es'` MUST be kept (cornerstone codec workers code-split).
4. **Avoid barrel imports** — import the specific icon/component you need, not `import * as Icons`.
   Antd: import the single component, don't pull in all of `antd`.
5. **Anti re-render** — `useMemo`/`useCallback` for table columns + handlers passed down to `DataTable`;
   split the search box into local state + `debounce` (don't filter the whole table per keystroke); `React.memo` for a
   heavy row/cell. Compute KPIs in `useMemo`, don't recompute every render.
6. **Large table/list** — client pagination (`_v2kit`'s `Pager`) or server-side; consider virtualization
   when > a few hundred rows. Don't render 2000 rows at once.

## Measurement (don't guess)
- `cd frontend && npm run build` → read the chunk table + the >500KB warning lines at the end.
- Isolate a regression: compare `dist/assets/*` sizes before/after. Only optimize a genuinely large chunk.
- React DevTools Profiler to confirm excessive re-render before memoizing (don't memo blindly).

## Pitfalls
- **`tsc -b` is stricter than `tsc --noEmit`** — always run `npm run build` (Vercel uses `tsc -b`) before reporting done.
- **Wrong dynamic-import `worker.format`** — switching to `iife` breaks cornerstone code-split (hit before, see CLAUDE.md 2026-04-28).
- **Memoizing blindly** — `useMemo` on a cheap value is slower + harder to read; only memo when the Profiler points to a hotspot (per `core-minimal-change`).
- **Lazy but still static-imported** elsewhere → the vendor still goes into the common chunk; grep for a lingering static import.

## Reference
- Knowledge source: `vercel-labs/agent-skills` (React best practices, 64 rules/8 groups — open-source).
  Filter: the **Vite-applicable** rules (bundle-size, re-render, rendering, JS efficiency); DROP the Next.js rules
  (server caching/RSC/async-waterfall) since the project uses Vite + Cloud Run, not Next.

## When to update
- When changing the bundler/manualChunks, upgrading a React/Antd major, or adding a new heavy vendor needing its own split strategy.
