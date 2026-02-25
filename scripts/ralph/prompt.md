# HIS Project - Ralph Wiggum Development Prompt

You are working on the HIS (Hospital Information System) project at `C:\Source\HIS`.

## Project Context
- **Backend**: ASP.NET Core Clean Architecture (.NET 8)
- **Frontend**: React 19 + TypeScript + Ant Design v6 + Vite
- **Database**: SQL Server (Docker container `his-sqlserver`)
- **Tests**: Cypress E2E (500+ tests), Playwright E2E (255 tests), API workflow (41 tests)

## Key Files
- Routes: `frontend/src/App.tsx`
- DI: `backend/src/HIS.Infrastructure/DependencyInjection.cs`
- Cypress tests: `frontend/cypress/e2e/`
- Playwright tests: `frontend/e2e/workflows/`
- CLAUDE.md: project documentation

## Your Task

Read `scripts/ralph/prd.json` to find the next uncompleted story (passes: false).
For each story:

1. **Read** the story's acceptance criteria carefully
2. **Implement** the changes needed
3. **Test** by running the relevant test commands:
   - Backend build: `cd backend/src/HIS.API && dotnet build`
   - Cypress specific: `cd frontend && npx cypress run --spec "cypress/e2e/<file>.cy.ts" --browser chrome`
   - Playwright specific: `cd frontend && npx playwright test e2e/workflows/<file>.spec.ts`
4. **Verify** tests pass
5. **Update** `scripts/ralph/prd.json`: set the story's `passes` to `true`
6. **Commit** changes: `git add -A && git commit -m "<story-id>: <description>"`
7. **Log** progress to `scripts/ralph/progress.txt`

## Important Rules
- Only work on ONE story per iteration
- If a story fails after 3 attempts, add notes and move to next
- Always run tests before marking a story as passed
- Never break existing tests
- Follow existing code patterns (check CLAUDE.md)
- Backend services must be registered in DependencyInjection.cs

## Completion
When ALL stories in prd.json have `passes: true`, output:
<promise>COMPLETE</promise>

## Current Iteration
Check progress.txt for what was done in previous iterations.
Pick up where the last iteration left off.
