---
name: his-fe-page-v2
description: Use this skill when creating or editing a v2 frontend page in HIS (route `/v2/*`, TerminalLayout). Triggers include "create a v2 page", "add a v2 screen for [module]", build a list/detail screen with KPI strip + status tabs + table + drawer using the `_v2kit` design pack and `ab-*` CSS, wire it to an `api/*.ts` client, register the route in App.tsx and the menu in TerminalLayout. Do NOT use for v1 Antd pages (pages/, MainLayout).
metadata:
  type: project
---

# HIS Frontend Page v2

A skill standardizing how to create a **v2** page (TerminalLayout UI, route prefix `/v2/*`) with the `_v2kit` design pack + `ab-*` CSS. This is HIS's current main UI layer (all 121 routes are on v2). Do NOT use for v1 pages (Antd MainLayout in `pages/`).

> Aesthetic polish: apply alongside `core-ui-aesthetics` (taste + restraint, anti "AI-slop", no UX harm) + `core-accessibility-pattern` (a11y/contrast) — stick to the `ab-*` tokens + `_v2kit` primitives, keep HIS's "terminal" density.

## When to use

- Creating a new list + detail screen (e.g. a new NangCapNN module).
- Converting a v1 page (`pages/X.tsx`) to v2 (`pages-v2/X.tsx`).
- Editing/adding a tab, table column, KPI, drawer for an existing v2 page.

## When NOT to use

- A v1 Antd page (MainLayout, `pages/`) → not this skill.
- A full-screen viewer (DICOM viewer) — doesn't follow the list/detail frame.
- Creating a backend API client → use `his-fe-api-client`.
- Creating a test for the page → use `his-test-e2e`.

## Two ways to build a page (pick the right one)

| Way | When | Length |
|---|---|---|
| **`SimpleV2Page<T>`** (recommended) | Standard list + filter + status tab + drawer | ~80–150 lines |
| **Bespoke** (assemble primitives yourself) | A specialized layout (dashboard, grid, large form, many panels) | varies |

→ Default to `SimpleV2Page<T>`. Go bespoke only when the layout doesn't fit the frame.

## Standard process (SimpleV2Page)

### Step 1 — Prepare the API client
You need `frontend/src/api/<module>.ts` exporting a `getX(...)` function + a `XDto` interface.
If it doesn't exist → create it first with skill `his-fe-api-client`.

### Step 2 — Create `frontend/src/pages-v2/<Name>.tsx`
Per `references/v2-page-template.tsx`. Structure:
- `StatusKey` + `STATUS_TABS: StatusTab<StatusKey>[]` + a `statusKey(row) → StatusKey` function
- `columns: ColumnDef<TDto>[]` (each column has `render`, `mono`/`code`/`width` if needed)
- `<SimpleV2Page<TDto> title load rowKey columns searchOf statusTabs statusOf kpis drawer drawerTitle drawerSub />`
- The drawer body uses `.rec-section` + `.rec-kv` (see template) or `DrSec`/`DrField`

### Step 3 — Register the route in `App.tsx`
```tsx
// (1) near the v2 lazy-import block
const XNameV2 = lazy(() => import('./pages-v2/XName'));
// (2) in the <Route> block under the /v2 prefix
<Route path="x-name" element={<XNameV2 />} />
```
→ The full URL is `/v2/x-name`.

### Step 4 — Register the menu in `TerminalLayout.tsx`
Add an item to the right group's `items: [...]` (clinical / paraclinical / support / finance / records / management / integration / public-health):
```ts
{ id: 'x-name', path: '/v2/x-name', label: 'Display label' },
```

### Step 5 — Verify
```powershell
cd frontend
npx tsc --noEmit          # must be 0 errors (tsc -b is stricter — run npm run build before commit)
npm run build             # tsc -b + vite — must have no errors
```

## Patterns & Conventions (`_v2kit` — `frontend/src/pages-v2/_v2kit.tsx`)

Reused primitives (do NOT re-code them):
- `KpiStrip` / `KpiItem` — the KPI strip; `tone: 'ok'|'info'|'warn'|'crit'`
- `TopTabs<T>` (a tab that changes the data source) vs `StatusTabs<T>` (a tab that filters the current data — uses `v`/`l`/`tone`)
- `SearchBox`, `Filter` (options as `{ v, l }[]` — NOT `{value,label}`)
- `DataTable<T>` — props `columns`, `data`, `rowKey`, `onRowClick`, `actions`; column `ColumnDef<T>` `{key,label,render?,mono?,code?,width?}`
- `Pager`, `StatusBadge` (`tone` + `dot`), `ActBtn` (`{ic,title,onClick,tone}`)
- `DrawerShell` / `ModalShell` (declarative, the caller keeps the `open` state — NOT `HUI.drawer(...)`)
- `DrSec` (title + children), `DrField` (`lbl` + children)
- Helpers: `fmtVNDg`, `fmtHMg`, `fmtDMYg`, `fmtDTg`; toast `tk/ti/tw/te`; confirm `cf`
- Icon: `import TermIcon from '../layouts/terminal/Icon'`

CSS classes often used in the drawer: `.rec-section` + `<h5>` + `.rec-kv` (label/value grid), `.cell-2l` (a 2-line cell), `.mono`.

Color tokens: `var(--a-cy)`, `var(--s-crit)`, `var(--s-warn)`, `var(--t-0/1/2)`, `var(--line)`.

## Pitfalls (hit before)

- **`Filter` options are `{ v, l }`** not `{ value, label }` — wrong → doesn't render.
- **`TopTabs` uses `tab`/`setTab`**, while `StatusTabs` uses `value`/`onChange` — easy to copy wrong.
- **`StatusTab.tone` is only `'ok'|'info'|'warn'|'crit'`** — `'ghost'`/`undefined` passes `tsc --noEmit` but fails `tsc -b`. Always run `npm run build`.
- **API returns paged vs array**: many endpoints return `{items,totalCount}`, a few return a plain array. In `load` handle it right (`(await getX()).items` vs `await getX()`). Defensive: `Array.isArray(b) ? b : b?.items ?? []`.
- **Relative route path** under `/v2` — write `path="x-name"` (NOT `/v2/x-name`) in `<Route>`.
- **Menu group**: must add to the right group's `items` in `TerminalLayout.tsx` (not MainLayout — that's v1).
- Do NOT hardcode the hospital name/URL — use the constant `frontend/src/constants/hospital.ts` / env var.

## Reference

- `references/v2-page-template.tsx` — a full v2 page frame using `SimpleV2Page`
- `references/v2kit-cheatsheet.md` — a quick-lookup table of every `_v2kit` export + props

## When to update

- When `_v2kit.tsx` adds/changes a primitive or props.
- When the route convention (`/v2` prefix) or the TerminalLayout menu structure changes.
- When adding a new shared helper/CSS class.
