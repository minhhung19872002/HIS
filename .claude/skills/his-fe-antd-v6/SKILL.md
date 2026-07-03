---
name: his-fe-antd-v6
description: Use this skill when writing or editing React UI in HIS that uses Ant Design v6 (mostly v1 pages in `frontend/src/pages/`, MainLayout). Triggers include using antd components (Space, Alert, Drawer, Timeline, List, Tabs, Modal, Statistic), fixing antd deprecation warnings/console errors, or migrating deprecated props. Do NOT use for v2 pages built with the `_v2kit`/`ab-*` design pack (use his-fe-page-v2).
metadata:
  type: project
---

# HIS Ant Design v6 Conventions

A skill recording how to use **Ant Design v6** correctly in HIS and avoid the deprecated props that were mass-migrated (see CLAUDE.md "Antd v6 Migration Notes"). Mainly applies to v1 pages (`pages/`, MainLayout). v2 pages use a separate design pack — see `his-fe-page-v2`.

## When to use

- Writing/editing an Antd component in a v1 page.
- Fixing a console warning/error like `[antd: ...] deprecated`.
- Seeing an old prop (`Space direction`, `Alert message`, `Drawer width`...) that needs the v6 API.

## When NOT to use

- A v2 page (`pages-v2/`, `_v2kit`, `ab-*`) → use `his-fe-page-v2`.
- API/test logic → use the matching skill.

## Deprecated props → v6 API (MANDATORY to change)

| Component | OLD prop (deprecated) | NEW v6 prop |
|---|---|---|
| `Space` | `direction="vertical"` | `orientation="vertical"` |
| `Alert` | `message="..."` | `title="..."` |
| `Drawer` | `width={...}` | `size="default"\|"large"` (or `size={number}`) |
| `Timeline` | `<Timeline><Timeline.Item>` + `children` | `items={[{ content, ... }]}` |
| `List` (deprecated component) | `<List dataSource render/>` | div-based custom render (avoid the blank-render bug) |
| `Tabs` | `tabPosition="..."` | `tabPlacement="..."` |
| `Modal`/`Drawer` | `destroyOnClose` | `destroyOnHidden` |
| `Statistic` | `valueStyle={...}` | `styles={{ content: {...} }}` |

→ Detail + before/after examples: `references/deprecations-cheatsheet.md`.

## Additional conventions

### API error logging
Per project convention: log an expected API failure with **`console.warn`**, NOT `console.error`. (The smoke test catches `console.error` — using `error` will fail the test.)

### Empty / Loading / Error state
- Loading: wrap the content in `<Spin>`.
- Empty: show "No data yet" (Antd `<Empty>` or text).
- Fetch error: `message.warning(...)` / `message.error(...)` + set empty state (do NOT show mock data).

### Form
- Use `Form.useForm()` + `Form.Item name=...`. Avoid the "not connected to any Form element" warning (put the input inside `<Form>`).

### Icon
v1 pages use `@ant-design/icons`. v2 pages use `TermIcon` (`layouts/terminal/Icon`) — do NOT mix.

## Pitfalls (hit before)

- **`List` deprecated renders blank**: the old `List` component renders blank in some cases → replaced with a custom div on 6 pages (Prescription, Dashboard, Quality, HR, EmergencyDisaster, PatientPortal). When you hit List → consider div-based.
- **`console.error` fails the smoke test**: switch to `console.warn` for an expected API error.
- **`destroyOnClose` deprecation warning** → `destroyOnHidden`.
- **Mixing v1/v2 UI**: do NOT import `_v2kit`/`ab-*` into a v1 page, and conversely don't use a raw Antd primitive in a v2 page (v2 pages use the design pack).
- **Hardcoding the hospital name/URL**: use `constants/hospital.ts` (HOSPITAL_NAME/ADDRESS/PHONE), env `VITE_ORTHANC_URL`...

## Verify
```powershell
cd frontend
npx tsc --noEmit
npm run build           # tsc -b + vite — 0 errors / 0 new deprecations
```
The `console-errors.cy.ts` smoke (Cypress) must be 0 errors after the fix.

## Reference

- `references/deprecations-cheatsheet.md` — a before/after table per deprecated prop + code examples

## When to update

- When upgrading Antd to a new major (v7...) or antd reports new deprecated props.
- When the logging/empty-state convention changes.
