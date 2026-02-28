# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Clean Architecture with Domain-Driven Design (DDD) + Vertical Slicing for Clinical Workflows

**Key Characteristics:**
- Hospital information system organized by clinical domain (20+ specialized modules)
- Layered backend: Core (entities) → Application (services) → Infrastructure (data) → API (endpoints)
- Frontend: React context-based state management with API-driven data layer
- Real-time capabilities via SignalR WebSocket for notifications
- Multi-tenant support with role-based access control (RBAC)

## Layers

**HIS.Core (Domain Layer):**
- Purpose: Business entities and domain rules
- Location: `backend/src/HIS.Core/`
- Contains: 30+ entity classes (Patient, MedicalRecord, Examination, Prescription, etc.), BaseEntity abstract class, interfaces (IRepository, IUnitOfWork)
- Depends on: Nothing (pure domain, no external dependencies)
- Used by: Application and Infrastructure layers

**HIS.Application (Application/Service Layer):**
- Purpose: Business logic, orchestration, and workflows
- Location: `backend/src/HIS.Application/`
- Contains: 25+ service interfaces + implementations (IExaminationCompleteService, IBillingCompleteService, etc.), DTOs for data transfer, AutoMapper profiles, workflow implementations
- Depends on: HIS.Core (entities and interfaces)
- Used by: API controllers and other services

**HIS.Infrastructure (Data Access & External Integration Layer):**
- Purpose: Database access, persistence, external service integration
- Location: `backend/src/HIS.Infrastructure/`
- Contains: EF Core DbContext (HISDbContext), Repository pattern, Unit of Work, Entity Framework migrations, HL7 services, email/notification services, PDF generation, digital signature
- Depends on: HIS.Core, HIS.Application
- Used by: API layer for dependency injection setup

**HIS.API (Presentation/API Layer):**
- Purpose: HTTP endpoints, request handling, middleware
- Location: `backend/src/HIS.API/`
- Contains: 24+ controllers (AuthController, ExaminationCompleteController, BillingCompleteController, etc.), middleware (AuditLogMiddleware, RequestMetricsMiddleware), SignalR hubs (NotificationHub), health checks
- Depends on: HIS.Application, HIS.Infrastructure
- Used by: Frontend applications, external systems

**Frontend: React Component Layer:**
- Purpose: User interface, client-side business logic, API integration
- Location: `frontend/src/`
- Contains: 37 page components (OPD.tsx, Prescription.tsx, EMR.tsx), 8 shared components (NotificationBell, PatientTimeline, BarcodeScanner), context providers (AuthContext, NotificationContext), 35 API client modules
- Depends on: Ant Design v6, React Router, TanStack Query, SignalR client, Recharts
- Used by: Browser clients (web, WebSocket connection)

## Data Flow

**Patient Reception Flow:**

1. Patient arrives → Frontend: Reception.tsx form submission
2. POST `/api/reception/register` → ReceptionCompleteController
3. ReceptionCompleteService validates, calls IRepository<Patient>.Add
4. Infrastructure: HISDbContext.Patients.Add() → SQL Server INSERT
5. Frontend: Refresh patient list via GET `/api/reception/search`
6. Audit logged by AuditLogMiddleware (POST → creates AuditLog entity)
7. Real-time notification broadcast via NotificationHub to admin clients

**OPD Examination → Prescription → Pharmacy Flow:**

1. Doctor selects patient in OPD.tsx → calls ExaminationCompleteService
2. Fill vital signs, diagnosis, physical exam → POST `/api/examination/save`
3. Clinical Data: Examination entity stored with FK to MedicalRecord
4. Prescription: Click "Kê đơn" → Prescription.tsx form
5. POST `/api/pharmacy/create-prescription` → WarehouseCompleteService (shared logic)
6. Data inheritance: `DataInheritanceController` pulls OPD diagnosis → pre-fill Prescription.tsx
7. Pharmacy dispense: Pharmacy.tsx calls WarehouseCompleteService.DispenseOutpatientPrescriptionAsync()
8. Inventory updated: InventoryItems stock decremented via EF Core SaveChanges()
9. Billing auto-calculated: Fee attached to PrescriptionDetail by ServicePrice

**State Management:**
- Frontend: AuthContext (user + permissions), NotificationContext (real-time messages), local React state per page
- Backend: Stateless request-response + SignalR connection state (user groups by userId)
- Database: Single source of truth via EF Core with 100+ tables + 200+ stored procedures (not used, all code-first)

## Key Abstractions

**Service Abstraction Layer:**
- Purpose: Encapsulate complex business logic behind interfaces
- Examples: `IExaminationCompleteService` (180+ methods), `IBillingCompleteService` (16 methods), `ILISCompleteService` (HL7 integration)
- Pattern: Dependency Injection via `DependencyInjection.cs` → ASP.NET Core service collection
- Implementation: All clinical domain services registered in DependencyInjection.cs lines 32-125

**Repository Pattern:**
- Purpose: Abstract database access
- Location: `HIS.Infrastructure/Data/Repository.cs`, `UnitOfWork.cs`
- Pattern: Generic `IRepository<T>` with CRUD + IQueryable support, IUnitOfWork for transaction management
- Usage: `var patient = await _repository<Patient>.GetByIdAsync(id);`

**DTO (Data Transfer Object):**
- Purpose: Decouple API contracts from domain entities
- Location: `HIS.Application/DTOs/` (50+ DTO files)
- Pattern: Request (e.g., `CreateExaminationDto`), Response (e.g., `ExaminationDto`), mapped via AutoMapper profiles in `HIS.Application/Mappings/`
- Usage: Controllers receive DTOs, convert to entities via mapper, pass to services

**API Response Wrapper:**
- Purpose: Standardize all API responses
- Pattern: `ApiResponse<T>` generic class with `Success`, `Data`, `Message`, `StatusCode` properties
- Usage: All 200+ endpoints return `Ok(ApiResponse<Data>.Ok(data, message))` or error variants

**Module Pattern (20 Domain Services):**
- Purpose: Vertical organization by clinical domain, not by layer
- Examples: `IReceptionCompleteService` (registration module), `ILISCompleteService` (lab module), `IInpatientCompleteService` (inpatient module)
- Each has 50-180 methods covering full CRUD + workflow operations
- Enables independent scaling and testing of clinical workflows

## Entry Points

**Backend Entry Point (HTTP API):**
- Location: `backend/src/HIS.API/Program.cs`
- Triggers: HTTP requests from frontend (port 5106 by default)
- Responsibilities: Configure middleware pipeline (Auth, CORS, Audit), setup SignalR, register EF Core DbContext, enable Swagger/OpenAPI

**Frontend Entry Point (Browser):**
- Location: `frontend/src/App.tsx`
- Triggers: Browser page load or navigation
- Responsibilities: Setup React Router (32 routes), wrap with QueryClientProvider (caching), AuthProvider (auth state), NotificationProvider (WebSocket), ConfigProvider (Ant Design locale)

**Authentication Entry Point:**
- Location: `frontend/src/pages/Login.tsx` (POST `/api/auth/login`)
- Flow: Credentials → AuthService.LoginAsync() → JWT token generation → localStorage persistence → redirect to Dashboard
- 2FA Optional: If `IsTwoFactorEnabled`, return `LoginResponseDto.RequiresOtp=true` → user enters 6-digit OTP → AuthService.VerifyOtpAsync()

**Real-time Notification Entry Point:**
- Location: `backend/src/HIS.API/Hubs/NotificationHub.cs`
- Triggers: SignalR WebSocket connection at `/hubs/notifications?access_token={token}`
- Responsibilities: Manage user groups (OnConnectedAsync adds user to userId group), broadcast messages (NotifyUser method), handle disconnections
- Frontend listener: `frontend/src/contexts/NotificationContext.tsx` receives messages, displays in NotificationBell component

## Error Handling

**Strategy:** Try-catch with graceful degradation, console.warn for expected errors (per project convention)

**Backend Patterns:**
- Controllers return ApiResponse<T> with error status codes (400, 401, 404, 500)
- Services throw custom exceptions (e.g., `InvalidOperationException`) caught by controllers
- Middleware `AuditLogMiddleware` logs all POST/PUT/DELETE regardless of success/failure
- Health endpoint `/api/health` checks 6 components (SQL, Redis, PACS, HL7, Disk, Memory)
- SQL errors wrapped in try-catch with fallback: `ExtendedWorkflowSqlGuard.IsMissingColumnOrTable` (line 600+)

**Frontend Patterns:**
- API calls wrapped in try-catch, errors logged via `console.warn` (not console.error)
- Message popup via `message.error()` for user-facing errors
- Loading states via Spin component during async operations
- Timeout handling via axios request timeout (implicit, may need explicit config for long-running calls)
- Network failure fallback: All components have offline detection via NotificationContext.isConnected

**Database-Level:**
- EF Core migrations handle schema versioning in `HIS.Infrastructure/Migrations/`
- Soft delete pattern: All entities inherit BaseEntity.IsDeleted boolean
- Foreign key constraints: 30+ navigation properties with explicit .HasForeignKey() in HISDbContext
- Transaction handling: IUnitOfWork.SaveChangesAsync() commits all changes or rolls back

## Cross-Cutting Concerns

**Logging:**
- Backend: ASP.NET Core ILogger to console/debug in development
- Audit logging: AuditLogMiddleware captures UserId, Username, EntityType, RequestPath, Module for Level 6 compliance
- Frontend: console.warn for API errors, console.log cleared from production (Session 6)

**Validation:**
- Frontend: Ant Design Form.Item rules (required, pattern, custom validators)
- Backend: DTO validation via data annotations (RequiredAttribute, MaxLengthAttribute), custom validators in services
- Example: `IsValidPatientIdAsync()` checks against 50+ ICD-10 codes

**Authentication:**
- JWT bearer token stored in localStorage (keys: `token`, `user`)
- Token refresh: Not implemented (stateless JWT), logout removes both keys
- 2FA: Optional OTP via email, stored in TwoFactorOtps table with 5-min expiry
- Claims extraction: `User.FindFirstValue(ClaimTypes.NameIdentifier)` in protected endpoints

**Authorization:**
- Role-based: User → UserRoles → Role → RolePermissions → Permission
- Claim-based: JWT includes role/permission claims (emitted by AuthService)
- Frontend: `hasRole('Doctor')`, `hasPermission('ExaminationCreate')` in `useAuth()` context
- Backend: [Authorize] on all protected endpoints

**Performance Optimization:**
- Database: 200+ stored procedures (legacy), supplemented by EF Core queries with .Include() for eager loading
- Caching: TanStack Query (React Query) on frontend for automatic request deduplication
- Real-time: SignalR for instant notifications instead of polling
- Pagination: All list endpoints support pageIndex, pageSize (default 20)
- Async/await: All I/O operations async to prevent thread starvation

**Data Consistency:**
- Unit of Work pattern: All service operations committed atomically via `_unitOfWork.SaveChangesAsync()`
- Concurrency: Optimistic locking via RowVersion (not enforced everywhere, potential issue)
- Cascade delete: EF Core handles via navigation properties, some manual cleanup in services
- Data inheritance: DataInheritanceController ensures OPD context flows to Prescription/Billing

**Security:**
- CORS enabled for frontend origin only: `WithOrigins(corsOrigins)` in Program.cs
- JWT key stored in appsettings (production should use Azure Key Vault or environment variables)
- USB Token signing: DigitalSignatureService uses Windows CNG cryptography, PIN via Windows popup (not programmatic)
- PDF digital signature: iText7 with PKCS#7 CMS format
- Audit trail: AuditLogMiddleware + AuditLogService + 4 performance indexes (Timestamp, UserId+Timestamp, Module+Action, EntityType+EntityId)

---

*Architecture analysis: 2026-02-28*
