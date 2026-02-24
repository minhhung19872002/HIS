# HIS - Hospital Information System

## Project Structure
- **Backend**: ASP.NET Core Clean Architecture (HIS.Core → HIS.Application → HIS.Infrastructure → HIS.API)
- **Frontend**: React 19 + TypeScript + Ant Design v6 + Vite
- **Database**: SQL Server (Docker container `his-sqlserver`)
- **External**: Orthanc PACS (DICOM), HL7 LIS, Redis

## Key Ports
- Frontend: `http://localhost:3001` (Vite dev server)
- Backend API: `http://localhost:5106` (ASP.NET Core)
- SQL Server: `localhost:1433`
- Orthanc PACS: `localhost:8042` (Web), `localhost:4242` (DICOM)
- Redis: `localhost:6379`

## Running
- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend/src/HIS.API && ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http`
- Docker (SQL + PACS + Redis): `docker compose up -d`

## Testing
- Cypress E2E: `cd frontend && npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome`
- Playwright: `cd frontend && npx playwright test`

## Auth
- Login: `POST /api/auth/login` with `{"username":"admin","password":"Admin@123"}`
- JWT stored in `localStorage` keys: `token`, `user`

## Antd v6 Migration Notes (completed 2026-02-24)
- `<Space direction=...>` replaced with `orientation=...` (49 occurrences in 20 files)
- `<Alert message=...>` replaced with `title=...` (50 occurrences in 18 files)
- `<Drawer width=...>` replaced with `size=...` (7 occurrences in 3 files)
- `<Timeline>` items: `children` → `content` (6 files)
- `<Timeline.Item>` converted to `items` array prop (3 files)
- `<List>` deprecated component replaced with div-based custom (6 files)
- `<Tabs tabPosition=...>` replaced with `tabPlacement=...` (1 file)
- API error logging changed from `console.error` to `console.warn` for expected failures

## Backend DI Registration
All services must be registered in `backend/src/HIS.Infrastructure/DependencyInjection.cs`.
If a new service/controller is added, register it there or you get 500 errors.
