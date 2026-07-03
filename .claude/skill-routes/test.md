# Skill-routes · TEST TIER (Testing)

> Sub-map — read it **TOGETHER WITH** `.claude/SKILL-MAP.md`. For the CORE principles (choose when) see (1a) in SKILL-MAP.
> Always take the level/isolation principle from `core-testing-architecture` + reuse fixtures from `core-testing-reuse`.

## TEST skills (`his-test-*`)

| Skill | Purpose | Choose when the request involves |
|---|---|---|
| `his-test-api-powershell` | PowerShell API test against `localhost:5106` | backend API test |
| `his-test-e2e` | Cypress + Playwright (HIS conventions) | UI/E2E test |

> ★ **Interactive browser driving + evidence capture** (ONLY the final TEST phase, after the fix is DONE) → **MCP plugin playwright** (navigate/click/snapshot/screenshot) + **chrome-devtools** (a11y/perf/console). `his-test-e2e` STILL owns the **durable test files** (Cypress/Playwright spec). Evidence per `docs/architecture/evidence/README.md` · routing `../plugins.md`. ⚠️ Do NOT run tests early (the test-last rule).

## Prompt → skill chain (TEST) + PATH

| When the developer prompts | Skills (core → his, in order) | Files/paths touched |
|---|---|---|
| "write a UI/E2E test [X]" | `core-testing-architecture` → `core-testing-reuse` → `his-test-e2e` | `frontend/cypress/e2e/`, `frontend/e2e/` |
| "write a backend API test [X]" | `core-testing-architecture` → `core-testing-reuse` → `his-test-api-powershell` | `test-*.ps1` |

## Conflict (TEST)
- BE test vs E2E: BE API → `his-test-api-powershell`; UI/route/flow in the browser → `his-test-e2e`.
