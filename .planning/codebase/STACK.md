# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- **C# 12** (net9.0) - Backend API and services
- **TypeScript 5.9** (~5.9.3) - Frontend React application
- **SQL** (T-SQL) - SQL Server database scripts

**Secondary:**
- **JavaScript** - Node.js test scripts (`scripts/test_real_workflow.js`)
- **HTML/CSS** - Email templates, PDF templates

## Runtime

**Environment:**
- **.NET 9.0** - Backend runtime
- **Node.js 18+** - Frontend build and testing
- **SQL Server 2022** - Database engine (Docker container `his-sqlserver`)

**Package Manager:**
- **npm** (frontend)
- **NuGet** (backend)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- **ASP.NET Core 9.0** - Web framework (MVC controllers, SignalR hubs)
- **Entity Framework Core 9.0** - ORM for SQL Server (`Microsoft.EntityFrameworkCore.SqlServer`)
- **React 19.2** - Frontend UI framework
- **Ant Design v6.2.2** - Component library (replaced v5 in Antd v6 migration)
- **Vite 5.4.21** - Frontend build tool and dev server

**Authentication & Security:**
- **JWT (Bearer tokens)** - Authentication via `Microsoft.AspNetCore.Authentication.JwtBearer`
- **BCrypt.Net-Next 4.0.3** - Password hashing

**Real-time Communication:**
- **SignalR 9.0** - WebSocket hub for real-time notifications (`/hubs/notifications`)
- **@microsoft/signalr 10.0.0** - Frontend client

**State Management & Data:**
- **React Query (@tanstack/react-query 5.90.20)** - Server state management
- **React Router 7.13** - Routing
- **Axios 1.13.4** - HTTP client

**UI & Visualization:**
- **Recharts 3.7.0** - Chart library (AreaChart, BarChart, PieChart for dashboards)
- **dayjs 1.11.19** - Date/time utilities
- **html5-qrcode 2.3.8** - Barcode/QR code scanning

**PDF & Document Generation:**
- **iText7 8.0.2** - PDF generation with digital signatures
- **itext7.bouncy-castle-adapter 8.0.2** - Cryptography for PDF signing

**Testing:**
- **Playwright 1.58.2** - E2E testing
- **Cypress 15.10.0** - E2E testing (primary - 22 spec files)
- **ESLint 9.39.1** - Code linting

## Key Dependencies

**Critical Backend:**
- `Microsoft.EntityFrameworkCore.SqlServer` (9.0.0) - Database access
- `Microsoft.AspNetCore.Authentication.JwtBearer` (8.0.0) - JWT auth
- `System.Security.Cryptography.Pkcs` (10.0.3) - PKCS#11/USB Token signing
- `Microsoft.Extensions.Http` (9.0.0) - HTTP client factory

**Healthcare/Integration:**
- **HL7 Parser** - Custom implementation in `HIS.Infrastructure.Services.HL7` namespace
  - TCP/MLLP protocol receiver on port 2576
  - Parses HL7 v2 messages from laboratory analyzers
- **FHIR R4 Service** - Custom implementation in `HIS.Infrastructure.Services.FhirService`
  - Maps HIS entities to FHIR resources
  - Uses Vietnam MOH OID: `urn:oid:2.16.840.1.113883.2.24.1.1`
  - Supports 8+ FHIR resources (Patient, Encounter, Observation, MedicationRequest, DiagnosticReport, Condition, AllergyIntolerance, Procedure)

**Email & Notifications:**
- `System.Net.Mail.SmtpClient` - SMTP client (Gmail compatible)
- Custom `EmailService` - OTP and result notifications

**Cryptography:**
- `System.Security.Cryptography.X509Certificates` - USB Token certificate handling
- `System.Security.Cryptography.Pkcs` - CMS/PKCS#7 digital signatures

**Infrastructure:**
- `Microsoft.Extensions.Hosting` (10.0.3) - Background services (HL7 receiver)
- `Microsoft.Extensions.Configuration` - Settings management

## Configuration

**Environment:**
- `.env` file exists (secrets not visible)
- `appsettings.json` - Connection strings, JWT, PACS, HL7, Email, TwoFactor settings
- Vite config: `frontend/vite.config.ts` with proxy rules for `/api`, `/hubs`, `/health`

**Build:**
- Backend: MSBuild with net9.0 target framework
- Frontend: Vite with React plugin (`@vitejs/plugin-react`)
- TypeScript: strict mode enabled

**Database Connection String:**
```
Server=localhost\DOTNET;Database=HIS;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

## Platform Requirements

**Development:**
- Windows 11 (Git Bash environment)
- .NET 9 SDK
- Node.js 18+
- SQL Server 2022 (Docker: `mcr.microsoft.com/mssql/server:2022-latest`)

**Production:**
- Linux/Windows with .NET 9 runtime
- SQL Server 2022+ (or compatible)
- Docker container orchestration (docker-compose.yml available)

## External Services & Integrations

**PACS (Picture Archiving & Communication System):**
- **Orthanc 24.1.2** - DICOM server
  - Web UI: `http://localhost:8042`
  - DICOM port: `localhost:4242`
  - Config: `appsettings.json` `[PACS]` section
  - DICOMweb plugin enabled, OHIF Viewer plugin enabled

**Cache:**
- **Redis 7-alpine** - Session/caching (port 6379)
  - Connection: `localhost:6379`
  - Volumes: `redis_data`

**Email (SMTP):**
- **Gmail SMTP** (configurable in `appsettings.json`)
  - Server: `smtp.gmail.com`
  - Port: 587 (TLS)
  - Dev fallback: Logs OTP to console if SMTP not configured

**HL7 Laboratory Integration:**
- Custom TCP/MLLP receiver on port 2576
- Supports: Mindray, Siemens, Roche analyzer protocols
- Background service: `HL7ReceiverService`

**Digital Signatures:**
- USB Token integration (PKCS#11)
- Windows Certificate Store
- Vietnamese CA providers: VNPT CA, Viettel CA, NewCA, FPT CA
- Signing method: `DigitalSignatureService` class

---

*Stack analysis: 2026-02-28*
