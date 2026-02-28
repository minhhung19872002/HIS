# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
HIS/
├── backend/                           # ASP.NET Core application
│   └── src/
│       ├── HIS.Core/                  # Domain entities and interfaces
│       │   ├── Entities/              # 30+ entity classes
│       │   └── Interfaces/            # IRepository, IUnitOfWork, service interfaces
│       ├── HIS.Application/           # Business logic and services
│       │   ├── Services/              # 25+ service implementations (IExaminationCompleteService, etc.)
│       │   ├── DTOs/                  # Data transfer objects (50+ DTO files)
│       │   ├── Mappings/              # AutoMapper profiles
│       │   └── Workflows/             # Complex business workflows
│       ├── HIS.Infrastructure/        # Data access and external services
│       │   ├── Data/                  # HISDbContext, Repository, UnitOfWork, EF Core migrations
│       │   ├── Services/              # Email, PDF generation, HL7, digital signature
│       │   └── DependencyInjection.cs # Service registration (125+ registrations)
│       └── HIS.API/                   # HTTP endpoints and middleware
│           ├── Controllers/           # 24+ controllers (ExaminationCompleteController, etc.)
│           ├── Middleware/            # AuditLogMiddleware, RequestMetricsMiddleware
│           ├── Hubs/                  # NotificationHub for real-time WebSocket
│           ├── Program.cs             # ASP.NET Core pipeline configuration
│           └── Properties/
│
├── frontend/                          # React + TypeScript application
│   ├── src/
│   │   ├── pages/                     # 37 page components (OPD.tsx, Prescription.tsx, EMR.tsx)
│   │   ├── components/                # 8 shared components (NotificationBell, PatientTimeline, BarcodeScanner)
│   │   ├── api/                       # 35 API client modules (examination.ts, pharmacy.ts, etc.)
│   │   ├── contexts/                  # AuthContext, NotificationContext for state management
│   │   ├── layouts/                   # MainLayout.tsx - header, sidebar, content area
│   │   ├── hooks/                     # useKeyboardShortcuts, custom hooks
│   │   ├── constants/                 # hospital.ts (hospital name/address/phone)
│   │   ├── utils/                     # Helper functions (request.ts - axios config)
│   │   ├── assets/                    # Images, icons
│   │   ├── App.tsx                    # Main app with 32 routes
│   │   └── App.css                    # Global styles
│   ├── cypress/
│   │   ├── e2e/                       # 20+ Cypress spec files (*.cy.ts) - E2E tests
│   │   └── support/                   # Custom commands, utilities
│   ├── e2e/
│   │   ├── workflows/                 # 10 Playwright spec files (*.spec.ts)
│   │   └── fixtures/                  # Test data
│   ├── vite.config.ts                 # Vite build config with /api proxy
│   └── package.json                   # Dependencies: Ant Design v6, React 19, TanStack Query
│
├── database/                          # SQL Server database
│   ├── scripts/                       # Migration + seed scripts
│   │   ├── create_*.sql               # Table creation (idempotent)
│   │   ├── seed_data.sql              # Master data seed
│   │   └── fix_*.sql                  # Data fixes (encoding, FK mapping)
│   └── docker-compose.yml             # SQL Server container config
│
├── docker/                            # Docker configuration
│   ├── docker-compose.yml             # Full stack: SQL Server, Orthanc PACS, Redis
│   └── .dockerignore
│
├── scripts/                           # Utility scripts
│   ├── test_real_workflow.js          # Node.js API integration tests
│   ├── ralph/                         # Ralph Wiggum automation plugin
│   └── *.sql                          # SQL migration scripts
│
├── docs/                              # Documentation
│   └── HIS_DataFlow_Architecture.md   # Data flow diagrams
│
├── bieu_mau/                          # Medical form templates (reference)
│
├── .planning/
│   └── codebase/                      # This directory - GSD codebase analysis documents
│       ├── ARCHITECTURE.md            # Architecture patterns and layers
│       ├── STRUCTURE.md               # This file - file organization
│       ├── CONVENTIONS.md             # Coding standards (quality focus)
│       ├── TESTING.md                 # Test patterns and frameworks (quality focus)
│       ├── STACK.md                   # Technology stack (tech focus)
│       ├── INTEGRATIONS.md            # External services (tech focus)
│       └── CONCERNS.md                # Technical debt and issues (concerns focus)
│
└── CLAUDE.md                          # Project instructions and work log (keep updated!)
```

## Directory Purposes

**backend/src/HIS.Core/Entities/:**
- Purpose: All domain entity classes (Patient, MedicalRecord, Examination, Prescription, etc.)
- Contains: 30+ .cs files organized by domain (Patient.cs, Inpatient.cs, Laboratory.cs, Radiology.cs, Medicine.cs, etc.)
- Key files:
  - `BaseEntity.cs`: Abstract base with Id, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy, IsDeleted (soft delete)
  - `Patient.cs`: Patient demographics, insurance, contact info
  - `MedicalRecord.cs`: Medical record linked to patient
  - `Examination.cs`: OPD examination with diagnosis, vital signs, allergies
  - `Inpatient.cs`: IPD admission with bed assignment, transfer history
  - `Prescription.cs`: Medicine prescription with dosage, instructions
  - `Radiology.cs`: Imaging order with DICOM study/series
  - `Laboratory.cs`: Lab test request with results
  - `Billing.cs`: Invoice, payment, deposit entities
  - Icd.cs, ClinicalEntities.cs, ExtendedWorkflowEntities.cs (40+ other entities)

**backend/src/HIS.Application/Services/:**
- Purpose: Business logic implementations
- Contains: Service interfaces (I*.cs) + implementations
- Key service types:
  - **Clinical Domain Services:** IReceptionCompleteService (105+ methods), IExaminationCompleteService (180+ methods), IInpatientCompleteService (100+ methods), IWarehouseCompleteService (50+ methods)
  - **Administrative:** IBillingCompleteService, ISurgeryCompleteService, IBloodBankCompleteService
  - **Integration:** ILISCompleteService (HL7), IRISCompleteService (PACS), IInsuranceXmlService
  - **System:** ISystemCompleteService (50+ catalog/admin methods), IAuditLogService, IHealthCheckService
  - **Extended Workflows:** Telemedicine, Nutrition, Equipment, HR, Quality (10 services for Level 6)
  - **Utilities:** IAuthService (JWT/2FA), IEmailService, IResultNotificationService, IPdfGenerationService

**backend/src/HIS.Infrastructure/Data/:**
- Purpose: Database persistence and EF Core configuration
- Key files:
  - `HISDbContext.cs`: DbSet declarations for 100+ entities, Fluent API configuration for FK, value converters (Guid↔String CreatedBy), soft delete queries
  - `Repository.cs`: Generic `IRepository<T>` with GetByIdAsync, GetAllAsync, AddAsync, UpdateAsync, DeleteAsync, IQueryable support
  - `UnitOfWork.cs`: Coordinates multiple repositories, SaveChangesAsync for atomic commits
  - `Migrations/`: ~50 EF Core migration files (auto-generated from code-first)
  - `DatabaseSeeder.cs`: Auto-seed on startup via SeedAsync()

**backend/src/HIS.API/Controllers/:**
- Purpose: HTTP endpoints organized by domain
- Naming: `[Domain]CompleteController.cs` (ExaminationCompleteController, BillingCompleteController, etc.)
- Pattern: Constructor injection of IXxxCompleteService, [Authorize] attribute on protected endpoints, all return ApiResponse<T>
- Key controllers:
  - `AuthController.cs`: /login, /verify-otp, /resend-otp, /2fa-status, /enable-2fa, /disable-2fa (6 endpoints)
  - `ReceptionCompleteController.cs`: /register-patient, /search, /check-insurance, /queue operations (20+ endpoints)
  - `ExaminationCompleteController.cs`: /save-examination, /search, /update-diagnosis, /get-frequent-codes (40+ endpoints)
  - `BillingCompleteController.cs`: /create-invoice, /payment, /deposit, /refund (25+ endpoints)
  - `SystemCompleteController.cs`: /catalog (departments, rooms, services, ICD codes), /admin (users, roles) (50+ endpoints)
  - `HealthController.cs`: /health, /health/live, /health/ready, /health/details (4 endpoints, no auth required)
  - Extended modules: `TelemedicineController.cs`, `NutritionController.cs`, `EquipmentController.cs`, etc. (auto-generated in ExtendedWorkflowControllers.cs)

**backend/src/HIS.API/Middleware/:**
- Purpose: Cross-cutting concerns in request pipeline
- Key files:
  - `AuditLogMiddleware.cs`: Logs POST/PUT/DELETE calls with UserId, Module, EntityType, RequestPath, ResponseStatus (placed after auth middleware)
  - `RequestMetricsMiddleware.cs`: Tracks request duration and HTTP status codes
  - Placement in Program.cs: CORS → Metrics → Auth → Audit → Map Controllers

**backend/src/HIS.API/Hubs/:**
- Purpose: Real-time WebSocket communication
- Key files:
  - `NotificationHub.cs`: Manages SignalR connections, user groups (by UserId), broadcasts notifications
  - Methods: OnConnectedAsync (add to group), OnDisconnectedAsync (remove from group), NotifyUser (server → client), ReceiveNotification (client → server)

**frontend/src/pages/:**
- Purpose: Full-page components for each module
- Naming: PascalCase (OPD.tsx, Prescription.tsx, EMR.tsx)
- Organization:
  - **Clinical Workflows:** Reception.tsx (patient registration), OPD.tsx (examination), Prescription.tsx (medicine), Inpatient.tsx (IPD), Laboratory.tsx (tests), Radiology.tsx (imaging), Surgery.tsx, BloodBank.tsx
  - **Administrative:** Billing.tsx (invoicing), Pharmacy.tsx (warehouse), Insurance.tsx, MasterData.tsx, SystemAdmin.tsx, Reports.tsx
  - **Extended:** Telemedicine.tsx, Nutrition.tsx, Equipment.tsx, HR.tsx, Quality.tsx, HealthExchange.tsx, EmergencyDisaster.tsx, PatientPortal.tsx
  - **Special:** EMR.tsx (medical records with 5 tabs), QueueDisplay.tsx (LCD full-screen), Dashboard.tsx (KPIs + charts), Login.tsx
- Pattern: Form with Ant Design, API calls via `import { fetchXxx } from '../api/xxx'`, error handling with message.error/warn, loading states with Spin

**frontend/src/components/:**
- Purpose: Reusable UI components across pages
- Key files:
  - `NotificationBell.tsx`: Dropdown popover showing real-time notifications with unread count, type colors, relative timestamps
  - `PatientTimeline.tsx`: Vertical timeline aggregating OPD, Lab, Radiology, Billing, Pharmacy history for patient
  - `EMRPrintTemplates.tsx`: 17 doctor print forms (discharge, surgery, consultation records) with HTML layout for browser printing
  - `EMRNursingPrintTemplates.tsx`: 21 nursing care print forms
  - `BarcodeScanner.tsx`: Camera-based QR code scanning (html5-qrcode library)
  - `WebcamCapture.tsx`: Patient photo capture from webcam
  - `ErrorBoundary.tsx`: React class component wrapping page routes, shows error UI on crash
  - `ClinicalTermSelector.tsx`: Reusable checklist for symptoms/signs with free text notes

**frontend/src/api/:**
- Purpose: API client modules (one per domain)
- Naming: camelCase (examination.ts, pharmacy.ts, lis.ts)
- Pattern: Named exports per function (fetchPatientList, createExamination, etc.), uses apiClient from client.ts, catches errors with console.warn
- Key modules:
  - `client.ts`: Main axios instance with JWT interceptor, base URL from VITE_API_URL env var
  - `publicClient.ts`: Unauthenticated axios for public endpoints (queue display, appointment booking)
  - `auth.ts`: login, verifyOtp, getTwoFactorStatus, enableTwoFactor (JWT + 2FA)
  - `examination.ts`: searchPatients, saveExamination, getFrequentIcdCodes, checkDrugInteractions (40+ functions)
  - `pharmacy.ts`: search medicines, create/update prescriptions, dispense, inventory (20+ functions)
  - `billing.ts`: create invoice, payment, deposit, refund (15+ functions)
  - `notification.ts`: getMyNotifications, getUnreadCount, markAsRead
  - `audit.ts`: getAuditLogs (paginated search), getUserActivity (timeline)
  - Extended modules: `telemedicine.ts`, `nutrition.ts`, `equipment.ts`, `health.ts`, `fhir.ts`, `reconciliation.ts` (25+ files)

**frontend/src/contexts/:**
- Purpose: Global state management via React Context + useContext hook
- Key files:
  - `AuthContext.tsx`: User login/logout, JWT token management, 2FA OTP state, role/permission checking methods
  - `NotificationContext.tsx`: SignalR WebSocket connection management, auto-reconnect with exponential backoff [0, 2, 5, 10, 30 sec], fallback polling every 60s, ReceiveNotification handler
  - Both: Provide values + methods to entire app via <AuthProvider>, <NotificationProvider>

**frontend/src/layouts/:**
- Purpose: Shared layout structure (header, sidebar, content)
- Key files:
  - `MainLayout.tsx`: Layout component with responsive sidebar (desktop, tablet, mobile drawer), header with user avatar dropdown, NotificationBell icon, menu with 40+ route links, bottom Outlet for page content
  - Responsive breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)

**frontend/src/hooks/:**
- Purpose: Custom React hooks for reusable logic
- Key files:
  - `useKeyboardShortcuts.ts`: Global keyboard handler hook (F2=Save, F5=Refresh, F7=Barcode, F9=Print, Ctrl+F=Search) with smart input detection (skip when typing in textarea/input)

**frontend/src/constants/:**
- Purpose: Application-wide constants
- Key files:
  - `hospital.ts`: Extracted hospital name/address/phone (used in 12+ print templates to avoid hardcoding)

**frontend/src/utils/:**
- Purpose: Helper functions and utilities
- Key files:
  - `request.ts`: Axios wrapper with fallback base URL, request timeout, request/response interceptors

## Key File Locations

**Entry Points:**
- Backend: `backend/src/HIS.API/Program.cs` (line 11: `WebApplication.CreateBuilder`, line 151: `app.Run()`)
- Frontend: `frontend/src/App.tsx` (line 133: `function App()`, line 149: `export default App`)
- Database: `docker-compose.yml` at root (SQL Server container at localhost:1433)

**Configuration:**
- Backend API: `backend/src/HIS.API/Properties/launchSettings.json` (port 5106, profile `http`)
- Frontend Vite: `frontend/vite.config.ts` (API proxy /api → http://localhost:5106, WebSocket proxy /hubs)
- Database: `backend/src/appsettings.json` (connection string, JWT key, CORS origins)
- Environment: `.env` files (VITE_API_URL, VITE_ORTHANC_URL, etc.) - **never commit secrets**

**Core Logic:**
- Authentication: `backend/src/HIS.Application/Services/AuthService.cs` (JWT generation, 2FA OTP logic)
- OPD Workflow: `backend/src/HIS.Application/Services/ExaminationCompleteService.cs` (180+ methods)
- Pharmacy/Warehouse: `backend/src/HIS.Application/Services/WarehouseCompleteService.cs` (inventory, prescriptions)
- Billing: `backend/src/HIS.Application/Services/BillingCompleteService.cs` (invoicing, payments, deposits)
- EMR Frontend: `frontend/src/pages/EMR.tsx` (medical record detail with 5 tabs)

**Testing:**
- E2E Cypress: `frontend/cypress/e2e/` (20 spec files, 637 total tests)
  - Core tests: `console-errors.cy.ts`, `user-workflow.cy.ts`, `manual-user-workflow.cy.ts`
  - Domain tests: `opd-examination.cy.ts`, `prescription-flow.cy.ts`, `emr.cy.ts`, `two-factor-auth.cy.ts`
  - UI tests: `new-features.cy.ts` (dashboard charts, timeline, notifications)
- E2E Playwright: `frontend/e2e/workflows/` (10 spec files, 255 tests)
- API Integration: `scripts/test_real_workflow.js` (Node.js, 41 tests across 4 workflows)

**Database:**
- Migrations: `backend/src/HIS.Infrastructure/Migrations/` (50+ migration files, code-first EF Core)
- Schema: `database/scripts/` (create_*.sql, seed_*.sql files for manual schema setup)
- Seed data: `database/scripts/seed_data.sql`, `seed_all_modules.sql`, `seed_lis_data.sql`, `seed_ris_data.sql`

## Naming Conventions

**Files:**
- Page components: PascalCase, singular (OPD.tsx not OpdPage.tsx)
- API client modules: camelCase, plural when multiple endpoints (examination.ts, pharmacy.ts)
- Services: InterfaceAsClass pattern (IExaminationCompleteService → ExaminationCompleteService.cs)
- Controllers: [Domain]CompleteController pattern (ExaminationCompleteController.cs)
- Entities: PascalCase, singular (Patient.cs, Prescription.cs)
- DTOs: [Operation][Entity]Dto pattern (CreateExaminationDto, ExaminationListDto)
- Tests: descriptive with .cy.ts suffix for Cypress, .spec.ts for Playwright

**Directories:**
- Backend layers: PascalCase (HIS.Core, HIS.Application, HIS.Infrastructure, HIS.API)
- Frontend layers: camelCase (pages, components, api, contexts, layouts, hooks, constants, utils)
- Domain entities grouped: By aggregate root (Patient, Inpatient, Prescription, etc.)
- Feature branches: kebab-case (feature/2fa-authentication, fix/cypress-flaky-tests)

**Code Identifiers:**
- Classes: PascalCase (Patient, ExaminationService, ApiResponse)
- Methods: PascalCase (GetByIdAsync, CreateExaminationAsync)
- Properties: PascalCase (Id, CreatedAt, FullName)
- Private fields: _camelCase (_repository, _logger, _httpClient)
- Constants: UPPER_SNAKE_CASE (API_URL, MOBILE_BREAKPOINT=768)
- React hooks: usePrefix (useAuth, useKeyboardShortcuts, custom hooks)
- React components: PascalCase (NotificationBell, PatientTimeline)

## Where to Add New Code

**New Feature (Clinical Workflow):**
- Backend:
  - Entity: `backend/src/HIS.Core/Entities/[Domain].cs` (add DbSet<NewEntity> in HISDbContext)
  - Service interface: `backend/src/HIS.Application/Services/I[Domain]CompleteService.cs` (add interface)
  - Service implementation: `backend/src/HIS.Application/Services/[Domain]ServiceImpl.cs` (implement logic)
  - DTOs: `backend/src/HIS.Application/DTOs/[Domain]DTOs.cs` (Create/Update/List DTOs)
  - Controller: `backend/src/HIS.API/Controllers/[Domain]CompleteController.cs` (add endpoints)
  - Register DI: `backend/src/HIS.Infrastructure/DependencyInjection.cs` (add `services.AddScoped<I[Domain]Service, [Domain]ServiceImpl>()`)
- Database:
  - Migration: `dotnet ef migrations add [FeatureName]` in HIS.Infrastructure directory
  - Seed script: `database/scripts/seed_[feature].sql`
- Frontend:
  - Page: `frontend/src/pages/[FeatureName].tsx` (import from ../api/[domain])
  - API client: `frontend/src/api/[domain].ts` (export functions using apiClient)
  - Menu: Add route in `frontend/src/App.tsx` (new <Route path="/[route]" element={<[Component] />} />)
  - Menu sidebar: Add menu item in `frontend/src/layouts/MainLayout.tsx`
  - Tests: `frontend/cypress/e2e/[feature].cy.ts` (add to console-errors page list)

**New Component/Module:**
- Implementation: `frontend/src/components/[ComponentName].tsx` (if reusable across pages) or `frontend/src/pages/[FeatureName].tsx` (if single-page)
- Pattern: Export React.FC<Props> with typed props, use Ant Design components, integrate with context/API
- Example: `PatientTimeline.tsx` aggregates 4 API calls, `NotificationBell.tsx` listens to context

**Utilities/Helpers:**
- Shared helpers: `frontend/src/utils/[helper].ts` (generic functions)
- Custom hooks: `frontend/src/hooks/[hook].ts` (useKeyboardShortcuts, useCustom)
- Constants: `frontend/src/constants/[domain].ts` (HOSPITAL_NAME, MOBILE_BREAKPOINT)
- Example: `hospital.ts` defines HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE (used in 12 print templates)

**API Integration:**
- For new domain service: Create `frontend/src/api/[domain].ts` with named exports
- Pattern: `export const fetchXxx = async (params) => { const response = await apiClient.get(...); return response.data; }`
- Error handling: Wrap in try-catch, log via console.warn, let caller handle message.error
- Type safety: Define request/response types in same file or import from shared types

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD (Guided Software Development) codebase analysis documents
- Generated: By `/gsd:map-codebase` command with focus areas (arch, tech, quality, concerns)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- Consumed by: `/gsd:plan-phase` (loads relevant docs based on phase type) and `/gsd:execute-phase` (references for code generation)

**`backend/src/HIS.Infrastructure/Migrations/`:**
- Purpose: EF Core code-first migrations (auto-generated from model changes)
- Generated: `dotnet ef migrations add [MigrationName]`
- Applied: Auto-applied at startup via `DatabaseSeeder.SeedAsync()` in Program.cs
- Not committed to git: .gitignore may exclude, but migrations.json tracks applied migrations

**`database/scripts/`:**
- Purpose: Manual SQL scripts for schema setup, data fixes, seed data
- Generated: Created manually or via SQLCMD after environment variable fix scripts
- Apply: `docker cp scripts/[file].sql his-sqlserver:/ && docker exec his-sqlserver sqlcmd -S localhost -U sa -P HisDocker2024Pass# -i /[file].sql`
- Contents: create_billing_tables.sql, seed_data.sql, fix_encoding.sql, create_emr_tables.sql, etc.

**`frontend/cypress/` vs `frontend/e2e/`:**
- Purpose: E2E test organization by framework
- Cypress (`cypress/e2e/`): 20 spec files, 637 total tests, headless Chrome + Firefox, better debugging
- Playwright (`e2e/workflows/`): 10 spec files, 255 tests, cross-browser (Chrome, Firefox, Safari), parallel execution
- Both: Can run independently, Cypress preferred for rapid iteration

**`docker/`:**
- Purpose: Container orchestration
- Contents: docker-compose.yml with services (SQL Server, Orthanc PACS, Redis)
- Start: `docker compose up -d` at project root
- Cleanup: `docker compose down -v` to remove volumes

---

*Structure analysis: 2026-02-28*
