# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**HL7 Laboratory Information System (LIS):**
- Service: Custom TCP/MLLP receiver on port 2576
- What it's used for: Receiving laboratory test results from automated analyzers (Mindray, Siemens, Roche)
- Implementation: `HIS.Infrastructure.Services.HL7.HL7ReceiverService`
- Parser: `HIS.Infrastructure.Services.HL7.HL7Parser`
- Messages: HL7 v2.x format with MLLP framing (VT byte start, FS/CR bytes end)
- Backend service integration: `LISCompleteService` processes parsed HL7 messages
- Notifications: `ResultNotificationService` sends email when lab results approved

**HL7 FHIR R4 Server:**
- Service: Custom HTTP REST API at `/api/fhir/*`
- What it's used for: Health data exchange in FHIR R4 format
- Implementation: `HIS.Infrastructure.Services.FhirService`
- OID: Vietnam MOH `urn:oid:2.16.840.1.113883.2.24.1.1`
- Controllers: `FhirController` (22+ endpoints)
- Supported resources: Patient, Encounter, Observation, MedicationRequest, DiagnosticReport, Condition, AllergyIntolerance, Procedure
- Frontend API: `frontend/src/api/fhir.ts`

## Data Storage

**Databases:**
- **SQL Server 2022** (Docker container `his-sqlserver`)
  - Connection: `Server=localhost\DOTNET;Database=HIS;...`
  - Connection string in: `backend/src/HIS.API/appsettings.json`
  - ORM: Entity Framework Core 9.0
  - DbContext: `HIS.Infrastructure.Data.HISDbContext`
  - 40+ DbSet tables (Patients, MedicalRecords, Examinations, Prescriptions, Inventories, etc.)

**File Storage:**
- Local filesystem - Medical record archives, PDFs, audit logs
- No cloud storage integrated
- Base64 encoding for photo/document embedding in database

**Caching:**
- **Redis 7-alpine** (optional)
  - Port: 6379
  - Use case: Session caching, notification queue
  - Connection: `localhost:6379`
  - Docker volume: `redis_data`

## Authentication & Identity

**Auth Provider:**
- **Custom JWT-based authentication**
  - Implementation: `AuthService` in `HIS.Infrastructure.Services`
  - Token location: Sent in `Authorization: Bearer {token}` header
  - Token storage (frontend): `localStorage` keys `token` and `user`
  - Expiration: 60 minutes (configurable in `appsettings.json` `Jwt:ExpireMinutes`)

**Two-Factor Authentication:**
- **Email OTP** (One-Time Password)
  - Implementation: `AuthService.VerifyOtpAsync`, `ResendOtpAsync`
  - OTP length: 6 digits
  - Validity: 5 minutes
  - Max attempts: 3 per session
  - Resend delay: 30 seconds between attempts
  - Email template: HTML formatted, branded as "HIS - Hệ thống bệnh viện"
  - Database table: `TwoFactorOtps`

**Digital Signatures:**
- **USB Token/SmartCard signing**
  - Service: `DigitalSignatureService` in `HIS.Infrastructure.Services`
  - Certificates: Windows Certificate Store (USB Tokens register there)
  - Format: CMS/PKCS#7 (SHA-256)
  - Usage: Radiology reports, medical records, EMR documents
  - Supports: Vietnamese CA providers (VNPT CA, Viettel CA, NewCA, FPT CA)
  - API endpoint: `POST /api/ris/sign-data`
  - Frontend integration: `RISCompleteController`

## Monitoring & Observability

**Error Tracking:**
- Console logging to stdout
- Application Insights integration: Not detected
- Error handling: `console.warn` for expected API failures (per convention)

**Logs:**
- ASP.NET Core logging to console (development)
- Log level: Information (default), Warning (AspNetCore, EF Core)
- SignalR connection lifecycle logged
- HL7 message processing logged with timestamps

**Health Checks:**
- Endpoints: `/health`, `/health/live`, `/health/ready`, `/health/details`
- Checks: SQL Server, Redis, PACS (Orthanc), HL7 receiver, disk space, memory
- Service: `HealthCheckService`
- Controller: `HealthController`

**Audit Logging:**
- Middleware: `AuditLogMiddleware` - captures all POST/PUT/DELETE
- Service: `AuditLogService`
- Table: `AuditLogs`
- Fields: UserId, Username, EntityType, EntityId, Module, Action, Timestamp, RequestPath
- Database indexes: Timestamp, UserId+Timestamp, Module+Action, EntityType+EntityId
- UI: SystemAdmin tab "Nhat ky he thong"

## CI/CD & Deployment

**Hosting:**
- **Docker Compose** - Local orchestration
  - Services: SQL Server, Orthanc PACS, Redis
  - Network: `his-network` (bridge)
  - Health checks configured for all containers

**CI Pipeline:**
- GitHub Actions: Not detected
- Manual build/deployment via `dotnet build` and npm scripts
- Dockerfile: Not present (using Docker Compose with standard images)

**Build Scripts:**
- Backend: `dotnet build`, `dotnet run`
- Frontend: `npm run build` (Vite), `npm run dev`
- Tests: `npm run test` (Playwright), `npm run cy:run` (Cypress)

## Environment Configuration

**Required env vars:**
- `VITE_API_URL` - Frontend API base URL (default: `http://localhost:5106/api`)
- `VITE_ORTHANC_URL` - PACS server URL (default: `http://localhost:8042`)
- `ASPNETCORE_ENVIRONMENT` - Set to `Development` for local

**Secrets location:**
- `.env` file (not committed)
- `appsettings.json` defaults (change in production)
- Database password: `HisDocker2024Pass#` (Docker dev only)
- JWT Key: 32+ char minimum

**Configuration Sections (appsettings.json):**
```
ConnectionStrings:DefaultConnection
Jwt: Key, Issuer, Audience, ExpireMinutes
PACS: BaseUrl, AETitle, Port, Username, Password
HL7: ReceiverPort, Enabled
Email: SmtpServer, SmtpPort, FromAddress, FromName, Username, Password, EnableSsl
TwoFactor: OtpLength, OtpValidityMinutes, MaxOtpAttempts, ResendDelaySeconds
```

## Webhooks & Callbacks

**Incoming:**
- **HL7 Result Messages** - TCP/MLLP on port 2576
  - From: Laboratory analyzers, external LIS systems
  - Triggers: `HL7ReceiverService` parses and creates lab results

**Outgoing:**
- **Email Notifications:**
  - Trigger: Lab/Radiology results approved, 2FA OTP needed
  - Protocol: SMTP
  - Recipients: Patient email, doctor email
  - Service: `EmailService.SendResultNotificationAsync`, `SendCriticalValueNotificationAsync`

- **SignalR Real-time Notifications:**
  - Trigger: New appointment, lab result, admission, system alerts
  - Protocol: WebSocket to `/hubs/notifications`
  - Hub: `NotificationHub` in `HIS.API/Hubs`
  - Clients: Authenticated users receive in `NotificationContext`

## System Integrations

**DICOM/PACS:**
- Server: Orthanc 24.1.2
- Web UI: `http://localhost:8042`
- DICOM AET: `HIS_PACS`
- DICOM port: 4242
- DICOMweb: Enabled (REST API)
- Viewer: OHIF Viewer plugin (built-in to Orthanc)
- Frontend integration: `frontend/src/pages/DicomViewer.tsx` (embeds OHIF)
- Backend API: `RISCompleteService` manages DICOM worklist, studies, series, images

**Message Formatting:**
- HL7 v2.x: Custom parser (field delimiter `|`, component `^`, sub-component `&`)
- FHIR R4: JSON/REST via ASP.NET Core
- DICOM: Binary protocol with MLLP TCP for transporting

**Data Exchange Patterns:**
- Patient info flows: Reception → OPD → Prescription → Billing → Pharmacy → Inpatient
- Service inheritance: `DataInheritanceService` auto-populates from prior encounters
- Lab results: HL7 TCP → Parser → LISCompleteService → Email/SignalR notifications
- Radiology reports: RIS UI → DigitalSignatureService → PDF → Archive

---

*Integration audit: 2026-02-28*
