# Skill-routes · TẦNG TEST (Testing)

> Map con — đọc **CÙNG** `.claude/SKILL-MAP.md`. Nguyên tắc CORE (chọn khi) xem (1a) trong SKILL-MAP.
> Luôn lấy nguyên tắc level/isolation từ `core-testing-architecture` + reuse fixture `core-testing-reuse`.

## Skill TEST (`his-test-*`)

| Skill | Mục đích | Chọn khi yêu cầu liên quan |
|---|---|---|
| `his-test-api-powershell` | test API PowerShell `localhost:5106` | test API backend |
| `his-test-e2e` | Cypress + Playwright (convention HIS) | test UI/E2E |

> ★ **Lái browser tương tác + chụp evidence** (CHỈ giai đoạn TEST cuối, sau khi fix DONE) → **plugin MCP playwright** (navigate/click/snapshot/screenshot) + **chrome-devtools** (a11y/perf/console). `his-test-e2e` VẪN sở hữu **file test bền** (Cypress/Playwright spec). Evidence theo `docs/architecture/evidence/README.md` · routing `../plugins.md`. ⚠️ KHÔNG chạy test sớm (rule test-cuối).

## Prompt → chuỗi skill (TEST) + PATH

| Khi developer prompt | Skills (core → his, đúng thứ tự) | File/đường dẫn chạm tới |
|---|---|---|
| "viết test UI/E2E [X]" | `core-testing-architecture` → `core-testing-reuse` → `his-test-e2e` | `frontend/cypress/e2e/`, `frontend/e2e/` |
| "viết test API backend [X]" | `core-testing-architecture` → `core-testing-reuse` → `his-test-api-powershell` | `test-*.ps1` |

## Conflict (TEST)
- Test BE vs E2E: API BE → `his-test-api-powershell`; UI/route/flow trên trình duyệt → `his-test-e2e`.
