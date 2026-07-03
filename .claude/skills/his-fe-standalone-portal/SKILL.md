---
name: his-fe-standalone-portal
description: Use this skill when building a standalone HIS portal page that lives OUTSIDE the main app layouts (its own route, own login form, own JWT/role) — e.g. the BHXH Inspector Portal at /inspector-portal. Triggers include a separate login screen for external users, a route registered outside MainLayout/TerminalLayout/ProtectedRoute, or a non-admin role like BhxhInspector. Do NOT use for normal /v2/* pages inside TerminalLayout (his-fe-page-v2).
metadata:
  type: project
---

# HIS Standalone Portal

> TIER: **B · PROJECT/HIS** (system). Depends: `core-error-loading-state`, `core-validation-pattern`, `his-fe-api-client`.

A skill for a **standalone portal** — a page with a route **outside** the main layout (MainLayout/TerminalLayout), with its **own login**, **own JWT/role**, for external users (e.g. a BHXH inspector). Reference: `pages-v2/InspectorPortal.tsx` at `/inspector-portal`.

## When to use
- Creating a portal for **external** users (inspector/partner) to log in independently, not via the admin login.
- A route placed **outside** `ProtectedRoute`/MainLayout/TerminalLayout.
- A separate auth: its own token + role (e.g. `BhxhInspector`), separate from the normal user JWT.

## When NOT to use
- A normal business page inside TerminalLayout `/v2/*` → `his-fe-page-v2`.
- Just adding an api client → `his-fe-api-client`.

## Architecture (Inspector Portal reference — NangCap24)
- The route in `App.tsx`: placed **outside** the `ProtectedRoute`/layout group, e.g.:
  ```tsx
  {/* Standalone routes - not part of the main layout */}
  <Route path="/inspector-portal" element={<InspectorPortalStandalone />} />
  ```
- FE: `pages-v2/InspectorPortal.tsx` renders its own login form + post-login content (does NOT use the shared sidebar/menu).
- BE: controller `/api/inspector-portal` — `POST /login` `[AllowAnonymous]` returns a JWT with its own role;
  data endpoints `[Authorize(Roles="BhxhInspector")]`; account management `[Authorize(Roles="Admin")]`.
- Separate token: store it in its own localStorage key (do NOT overwrite the main app's `token`/`user`) so the 2 sessions don't collide.

## Standard process
1. **API client**: add an object in `api/nangcap24.ts` (login, search, detail, download, account CRUD) — per `his-fe-api-client`.
2. **Standalone page**: create `pages-v2/<Name>Portal.tsx` — manage `loggedIn` state; not logged in → login form; logged in → content. Validate the form per `core-validation-pattern`; loading/empty/error per `core-error-loading-state`.
3. **Route**: register in `App.tsx` **outside** the main layout + outside `ProtectedRoute`. Do NOT add it to the TerminalLayout menu.
4. **Separate auth**: store the portal token in its own key; call the API with that token. The BE role guard must be correct (e.g. `BhxhInspector`) — verify an admin token CANNOT reach the portal endpoint (403).
5. **`data-testid`** for login (e.g. `inspector-login-card/username/password/login-btn`) for E2E tests.
6. **Audit**: every access to sensitive data (medical records) logs an access log (BE).

## Pitfalls
- **Putting the route inside the layout/ProtectedRoute by mistake** → the portal is forced through the admin login → wrong purpose. It must be outside.
- **Sharing the localStorage `token`** with the main app → logging into the portal kicks out the admin session (and vice versa). Use a separate key.
- **Loose role guard** → leaks data to unauthorized people. Data endpoints must be `[Authorize(Roles="...")]` correctly.
- **Account lockout / BCrypt**: too many wrong logins must lock (`LockedUntil`); BCrypt the password, no plaintext.
- Test credentials depend on the environment — see `his-test-e2e` (e.g. Inspector: local seed `inspector`, prod `thanhtra01`).

## Reference
- `references/standalone-portal-template.tsx` — a standalone page frame (login form + post-login content)

## When to update
- When adding a new standalone portal (another partner) or changing the separate auth/role mechanism.
