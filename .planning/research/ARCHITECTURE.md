# Architecture Research

**Domain:** Hospital Information System (HIS) Level 6 Upgrade - External Integration Layer
**Researched:** 2026-02-28
**Confidence:** HIGH (based on direct codebase analysis + known Vietnamese healthcare standards)

## System Overview: Current State

```
                                     EXTERNAL SYSTEMS (NEW)
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  BHXH Gateway    SMS Gateway    DQGVN Portal    AI Service    Face Auth     │
  │  (SOAP/REST)     (REST)         (REST/FHIR)     (REST/gRPC)   (REST)        │
  └──────┬──────────────┬───────────────┬──────────────┬────────────┬───────────┘
         │              │               │              │            │
  ┌──────┴──────────────┴───────────────┴──────────────┴────────────┴───────────┐
  │                    INTEGRATION GATEWAY LAYER (NEW)                          │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
  │  │ BHXH     │ │ SMS      │ │ DQGVN    │ │ AI       │ │ Face     │         │
  │  │ Client   │ │ Client   │ │ Client   │ │ Client   │ │ Client   │         │
  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘         │
  └───────┼────────────┼────────────┼────────────┼────────────┼────────────────┘
          │            │            │            │            │
  ┌───────┴────────────┴────────────┴────────────┴────────────┴────────────────┐
  │                        HIS.API (ASP.NET Core)                              │
  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐              │
  │  │ Middleware  │ │ Controllers│ │ SignalR Hub│ │ Background │              │
  │  │ (Auth,Audit│ │ (25+ ctrl) │ │ (Notif.)  │ │ (HL7 TCP)  │              │
  │  │ Metrics)   │ │            │ │           │ │            │              │
  │  └─────┬──────┘ └─────┬──────┘ └─────┬─────┘ └─────┬──────┘              │
  │        │              │              │             │                      │
  │  ┌─────┴──────────────┴──────────────┴─────────────┴──────────────────┐   │
  │  │                 HIS.Infrastructure (Services Layer)                 │   │
  │  │  Reception │ OPD │ IPD │ Billing │ LIS │ RIS │ Pharmacy │ ...     │   │
  │  │  Email │ FHIR │ DigitalSign │ PDF │ Audit │ HealthCheck │ ...     │   │
  │  └─────┬──────────────────────────────────────────────────────────────┘   │
  │        │                                                                  │
  │  ┌─────┴──────────────────────────────────────────────────────────────┐   │
  │  │                 HIS.Core (Entities + Interfaces)                    │   │
  │  │  IRepository<T> │ IUnitOfWork │ 80+ Entity classes                 │   │
  │  └─────┬──────────────────────────────────────────────────────────────┘   │
  └────────┼──────────────────────────────────────────────────────────────────┘
           │
  ┌────────┴──────────────────────────────────────────────────────────────────┐
  │                           DATA STORES                                     │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
  │  │SQL Server│  │  Redis   │  │ Orthanc  │  │ HL7Spy   │                  │
  │  │ (EF Core)│  │ (Cache)  │  │ (DICOM)  │  │ (TCP LIS)│                  │
  │  │ :1433    │  │ :6379    │  │ :8042    │  │ :2576    │                  │
  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                  │
  └───────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────┐
  │                        FRONTEND (React 19 + Antd v6)                     │
  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            │
  │  │ 34 Routes  │ │ SignalR    │ │ API Clients│ │ Contexts   │            │
  │  │ (pages)    │ │ (WS)      │ │ (38 files) │ │ (Auth,Notf)│            │
  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘            │
  │  localhost:3001 → proxy /api → localhost:5106                            │
  └───────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────┐
  │                    PUBLIC-FACING (No Auth)                                │
  │  ┌────────────┐ ┌────────────┐ ┌────────────────────────┐               │
  │  │ /queue-    │ │ /dat-lich  │ │ Patient Booking Portal │               │
  │  │  display   │ │ (booking)  │ │ (NEW - separate SPA)   │               │
  │  └────────────┘ └────────────┘ └────────────────────────┘               │
  └───────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Current State | New Integration Points |
|-----------|---------------|---------------|----------------------|
| **HIS.API** | HTTP gateway, auth, middleware pipeline | 25 controllers, JWT+2FA, AuditLog middleware | New controllers for BHXH proxy, SMS admin, DQGVN webhook receiver |
| **HIS.Infrastructure** | Service implementations, DB access, external clients | 30 service files, EF Core, EmailService | BHXH client, SMS client, DQGVN client, AI client, Face client, PKCS#11 signing |
| **HIS.Core** | Domain entities, repository interfaces | 80+ entities, IRepository<T>, IUnitOfWork | New entities for BHXH transactions, SMS logs, DQGVN submissions |
| **HIS.Application** | Service interfaces, DTOs, workflow contracts | 20+ service interfaces, 200+ DTOs | New DTOs for external system responses |
| **Frontend** | React SPA, 34 routes, API clients | 38 API client files, SignalR, Antd v6 | Booking portal SPA, WebAuthn face auth UI, PKCS#11 browser bridge |
| **HL7 Receiver** | BackgroundService for LIS TCP/MLLP | Port 2576, HL7Parser | No changes needed |
| **SignalR Hub** | Real-time notifications | NotificationHub at /hubs/notifications | Push BHXH status updates, SMS delivery receipts |
| **DigitalSignatureService** | USB Token/SmartCard signing | Windows Certificate Store, CMS/PKCS#7 | PKCS#11 via Pkcs11Interop for programmatic PIN |
| **EmailService** | SMTP email (OTP, results) | Gmail SMTP, dev fallback | No changes (SMS is separate channel) |
| **FhirService** | HL7 FHIR R4 resource mapping | 8 resources, 22+ endpoints | Extend for DQGVN FHIR bundles |
| **InsuranceXmlService** | BHYT XML claim export | Mock BHXH verification | Wire to real BHXH gateway |
| **EF Core / DbContext** | SQL Server ORM | 80+ DbSets, ValueConverter for Guid/String | Add Oracle provider, dual-provider configuration |

## New Component Definitions

### 1. BHXH Gateway Client (`IBhxhGatewayService`)

**Responsibility:** Communicate with Vietnam Social Insurance (BHXH) portal for insurance verification, claim submission, and 5-year continuous coverage checks.

**Integration points:**
- `ReceptionCompleteService.VerifyInsuranceAsync` (currently returns mock data at line 497-512)
- `InsuranceXmlService.VerifyInsuranceCardAsync` (currently returns mock at line 27-48)
- `ReceptionCompleteService.CheckBHXHConnectionAsync` (currently returns true)

**Protocol:** SOAP/XML (BHXH portal uses WCF-based web services) with REST JSON overlay for newer endpoints.

**Data flow:**
```
Reception UI → ReceptionController → ReceptionCompleteService
                                           ↓
                                    IBhxhGatewayService
                                           ↓
                                    HTTP POST to BHXH portal
                                    (XML SOAP envelope)
                                           ↓
                                    Parse XML response → InsuranceVerificationResultDto
                                           ↓
                                    Cache result in Redis (TTL 24h)
                                           ↓
                                    Return to Reception UI
```

**Boundary:** The BHXH client is a pure HTTP client service in `HIS.Infrastructure`. It does NOT own any database tables -- it calls the external BHXH API and returns DTOs. Caching layer (Redis) sits between the client and the calling service.

### 2. SMS Gateway Client (`ISmsGatewayService`)

**Responsibility:** Send SMS notifications for OTP (2FA), lab/radiology results, appointment reminders, and critical value alerts.

**Integration points:**
- `AuthService` (2FA OTP -- currently email only)
- `ResultNotificationService` (lab/radiology results -- currently email only)
- `AppointmentBookingService` (appointment confirmation/reminder)
- `ReceptionCompleteService` (queue ticket notification)

**Protocol:** REST API to Vietnamese SMS providers (Viettel, VNPT, FPT, Twilio as fallback).

**Data flow:**
```
Any Service → ISmsGatewayService.SendSmsAsync(phone, message)
                    ↓
             Validate phone format (VN: 0xxx or +84xxx)
                    ↓
             HTTP POST to SMS provider API
                    ↓
             Log to SmsLogs table (status, messageId, cost)
                    ↓
             Return success/failure
                    ↓
             (Async) Webhook receives delivery receipt → update SmsLogs
```

**Boundary:** Pure outbound HTTP client + delivery webhook receiver. Owns `SmsLogs` and `SmsTemplates` tables. Does NOT handle message content -- callers provide the text.

### 3. PKCS#11 Digital Signature Service (`IPkcs11SignatureService`)

**Responsibility:** Programmatic USB Token signing without Windows PIN dialog popup, enabling headless/server-side signing.

**Integration points:**
- `DigitalSignatureService` (current service uses Windows Certificate Store and triggers PIN popup)
- `PdfSignatureService` (PDF signing with iText7)
- `RISCompleteService` (radiology report signing)
- ALL EMR form signing (38 templates need CKS signature per Vietnamese medical law)

**Protocol:** PKCS#11 C_SignInit/C_Sign via Pkcs11Interop .NET wrapper.

**Data flow:**
```
User enters PIN in browser → POST /api/ris/sign {data, thumbprint, pin}
                                      ↓
                              IPkcs11SignatureService.SignWithPinAsync(data, thumbprint, pin)
                                      ↓
                              Pkcs11Interop: C_OpenSession → C_Login(pin) → C_SignInit → C_Sign → C_Logout
                                      ↓
                              CMS/PKCS#7 detached signature (same format as current)
                                      ↓
                              Return SignatureResultDto (same DTO as current)
```

**Boundary:** Wraps Pkcs11Interop library. Implements same `IDigitalSignatureService` interface as current Windows-based service, but adds a `pin` parameter. Deployment choice: register Pkcs11 implementation when USB Token middleware is detected, fall back to Windows Certificate Store otherwise.

### 4. Oracle DB Provider (Dual EF Core Provider)

**Responsibility:** Support Oracle Database as an alternative to SQL Server, per TT 54/2017 requirements.

**Integration points:**
- `HISDbContext` (currently hardcoded `UseSqlServer`)
- `DependencyInjection.cs` (DB registration)
- All raw SQL in services (SQL Server-specific syntax)

**Data flow:**
```
appsettings.json: { "DatabaseProvider": "SqlServer" | "Oracle" }
                         ↓
DependencyInjection.cs → if SqlServer: UseSqlServer()
                       → if Oracle: UseOracle() (Oracle.EntityFrameworkCore)
                         ↓
HISDbContext: same entity model, provider-specific OnModelCreating overrides
                         ↓
All services use LINQ (EF Core abstracts SQL differences)
```

**Boundary:** Configuration-time decision only. The same DbContext, same entities, same services. The ONLY changes are in `DependencyInjection.cs` (provider selection) and `HISDbContext.OnModelCreating` (provider-specific column mappings, e.g., `NVARCHAR(MAX)` vs `NCLOB`). Raw SQL queries in services MUST be abstracted to work with both providers.

### 5. DQGVN Health Exchange Client (`IDqgvnExchangeService`)

**Responsibility:** Submit clinical data to the National Health Data Exchange (DQGVN) portal per TT 13/2025.

**Integration points:**
- `HealthExchangeServiceImpl` (currently has DB-backed HIEConnection/HIESubmission tables)
- `FhirService` (DQGVN accepts FHIR R4 bundles)
- `InpatientCompleteService.DischargePatient` (trigger submission on discharge)
- `ExaminationCompleteService.CompleteExamination` (trigger submission on exam completion)

**Protocol:** REST + FHIR R4 bundles (JSON). The DQGVN portal accepts FHIR Bundle resources containing Patient, Encounter, Condition, Observation, MedicationRequest, and Procedure resources.

**Data flow:**
```
Clinical event (discharge, exam complete, lab result)
         ↓
Service calls IDqgvnExchangeService.SubmitClinicalDataAsync(recordId)
         ↓
Build FHIR Bundle using existing FhirService resource mappers
         ↓
Sign bundle with hospital certificate (IDigitalSignatureService)
         ↓
HTTP POST to DQGVN portal endpoint
         ↓
Log submission in HIESubmissions table (status, response, retryCount)
         ↓
If failure: queue for retry via background job
         ↓
SignalR notification to user: "Da gui du lieu len DQGVN"
```

**Boundary:** Composes FhirService (for resource building) + DigitalSignatureService (for signing) + HttpClient (for submission). Owns the retry/queue logic. Uses existing `HIESubmissions` table.

### 6. Patient Booking Portal (Separate SPA)

**Responsibility:** Public-facing appointment booking website for patients. No authentication required.

**Integration points:**
- `AppointmentBookingController` (already exists with 5 endpoints)
- `AppointmentBookingService` (already implements department listing, doctor listing, slot availability, booking creation)
- Frontend route `/dat-lich` (already exists with `AppointmentBooking.tsx`)

**Data flow:**
```
Patient browser → /dat-lich (public route, no ProtectedRoute wrapper)
         ↓
AppointmentBooking.tsx → api/booking/* endpoints
         ↓
AppointmentBookingService → Appointments + AppointmentServices tables
         ↓
ISmsGatewayService.SendSmsAsync (booking confirmation)
         ↓
Queue ticket auto-generated on appointment date
```

**Boundary:** This is already partially built. The existing `/dat-lich` route and `AppointmentBookingService` handle the core flow. What remains: SMS confirmation integration, pre-registration data collection (insurance, photo), calendar/slot UI enhancement, and QR code for check-in.

### 7. AI Inference Service

**Responsibility:** Provide AI-assisted clinical decision support: diagnosis suggestions from symptoms, drug interaction enhancement, radiology image analysis.

**Integration points:**
- `ExaminationCompleteService` (diagnosis suggestion during OPD)
- `PrescriptionService` (enhanced drug interaction checking beyond the 11 hardcoded rules)
- `RISCompleteService` (AI-assisted radiology report generation)
- `LISCompleteService` (lab result interpretation)

**Protocol:** REST API to a separate AI microservice (Python Flask/FastAPI) or cloud API (Azure OpenAI, Google Vertex AI).

**Data flow:**
```
OPD page: doctor types symptoms + vital signs
         ↓
POST /api/ai/suggest-diagnosis { symptoms, vitals, history }
         ↓
IAiInferenceService.SuggestDiagnosisAsync()
         ↓
HTTP POST to AI service (external or internal)
         ↓
Return ranked ICD-10 codes with confidence scores
         ↓
Display suggestions in OPD UI (doctor selects/rejects)
```

**Boundary:** Pure HTTP client calling an external AI service. Does NOT own training data or models. The AI service itself is OUT OF SCOPE for the HIS codebase -- only the client interface and UI integration are in scope. All AI suggestions are advisory only and require doctor confirmation.

### 8. Face Recognition Service

**Responsibility:** Biometric patient identification at reception kiosks and staff authentication.

**Integration points:**
- `AuthService` (face login as alternative to password)
- `ReceptionCompleteService` (patient identification by face at check-in)
- `WebcamCapture.tsx` (already exists for patient photo capture)

**Protocol:** REST API to face recognition service (could be on-premises for privacy).

**Data flow:**
```
Reception: camera captures face → base64 image
         ↓
POST /api/face/identify { imageBase64 }
         ↓
IFaceRecognitionService.IdentifyPatientAsync(imageBytes)
         ↓
HTTP POST to face service → returns matched patientId + confidence
         ↓
If confidence > threshold: auto-fill patient data in Reception form
         ↓
If no match: prompt manual registration + store face encoding
```

**Boundary:** Pure HTTP client to an external face recognition service. Patient face encodings stored in a separate FaceEncodings table (NOT raw images). Privacy-critical: face data must be encrypted at rest, consent required.

### 9. Smart Card Reader Integration

**Responsibility:** Read and write Vietnamese BHYT insurance smart cards (chip cards) at reception.

**Integration points:**
- `ReceptionCompleteController` (already has `/smart-card/read` and `/register/smart-card` endpoints)
- `ReceptionCompleteService.ReadSmartCardAsync` (currently returns empty mock at line 2520-2528)
- `ReceptionCompleteService.WriteSmartCardAsync` (currently has TODO at line 2531-2533)

**Protocol:** PC/SC (Personal Computer/Smart Card) via system-level smart card reader API. On Windows: `winscard.dll`. On .NET: `PCSC-Sharp` NuGet package.

**Data flow:**
```
Reception staff inserts BHYT card into reader
         ↓
Browser calls backend: POST /api/reception/smart-card/read { readerName }
         ↓
ISmartCardService.ReadCardAsync(readerName)
         ↓
PCSC-Sharp: SCardEstablishContext → SCardConnect → SCardTransmit (APDU commands)
         ↓
Parse card data: insurance number, patient name, DOB, facility code
         ↓
Return SmartCardDataDto → auto-fill Reception form
         ↓
After visit: POST /api/reception/smart-card/write { patientId, visitData }
         ↓
Write visit record to card chip (APDU write commands)
```

**Boundary:** Requires a physical smart card reader connected to the server machine. The service wraps PCSC-Sharp library. Existing DTO `SmartCardDataDto` and `SmartCardRegistrationDto` are already defined in `ReceptionCompleteDTOs.cs` -- just needs implementation.

### 10. SNOMED CT + HL7 CDA

**Responsibility:** Map clinical terminology to SNOMED CT codes and generate HL7 CDA documents for clinical document exchange.

**Integration points:**
- `ClinicalTerm` entity (already exists with 58 seed terms -- needs SNOMED CT code mapping)
- `FhirService` (already maps ICD-10 codes -- extend to SNOMED CT)
- `PdfGenerationService` (CDA is alternative clinical document format to PDF)
- `DqgvnExchangeService` (DQGVN may accept CDA documents)

**Data flow:**
```
SNOMED CT mapping (one-time setup):
  ClinicalTerms table → add SnomedCode column → populate from SNOMED CT Vietnamese subset

CDA document generation:
  Clinical event → ICdaGenerationService.GenerateCdaAsync(recordId)
         ↓
  Load patient, encounter, observations, medications from DB
         ↓
  Build CDA XML document per HL7 CDA R2 schema
         ↓
  Sign with hospital certificate
         ↓
  Store in DB or submit to DQGVN
```

**Boundary:** SNOMED CT mapping is a data migration task (add codes to existing `ClinicalTerms` table). CDA generation is a new service that composes data from multiple sources into XML. It sits alongside FhirService as another interoperability format.

## Key Data Flows

### Flow 1: Patient Registration with Insurance Verification (End-to-End)

```
Patient arrives
    ↓
[Smart Card Reader] → ReadSmartCardAsync → insurance number + demographics
    ↓
[Face Recognition] → IdentifyPatientAsync → matched patient or new registration
    ↓
[BHXH Gateway] → VerifyInsuranceAsync → coverage status, benefit level, facility code
    ↓
[Reception Service] → CreatePatient / UpdatePatient → SQL Server
    ↓
[SMS Gateway] → SendSmsAsync → queue ticket + estimated wait time
    ↓
[Queue Display] → SignalR push → LCD screen update
    ↓
[DQGVN] → (after visit) SubmitClinicalDataAsync → FHIR Bundle to national portal
```

### Flow 2: Clinical Document Signing (EMR + CKS)

```
Doctor completes examination / treatment sheet
    ↓
[Frontend] → User clicks "Ky so" button → enters PIN in modal
    ↓
[Backend] → IPkcs11SignatureService.SignWithPinAsync(documentHash, thumbprint, pin)
    ↓
[USB Token] → PKCS#11 C_Sign → CMS/PKCS#7 signature
    ↓
[PdfSignatureService] → embed signature in PDF (iText7)
    ↓
[EMR] → Store signed PDF + signature metadata in DB
    ↓
[CDA Service] → Generate CDA with embedded signature for interoperability
    ↓
[DQGVN] → Submit signed CDA document to national portal
```

### Flow 3: AI-Assisted Clinical Workflow

```
Doctor opens OPD examination
    ↓
[Data Inheritance] → load reception context (insurance, allergies, history)
    ↓
Doctor types chief complaint + vital signs
    ↓
[AI Service] → POST symptoms → receive ICD-10 suggestions with confidence
    ↓
Doctor selects/modifies diagnosis
    ↓
[AI Service] → POST prescription → check drug interactions (beyond 11 hardcoded rules)
    ↓
Doctor confirms prescription
    ↓
[Billing] → calculate fees with insurance discount
    ↓
[Pharmacy] → dispense medications
```

### Flow 4: Oracle DB Dual-Provider Support

```
appsettings.json: DatabaseProvider = "Oracle"
    ↓
DependencyInjection.cs: services.AddDbContext<HISDbContext>(options =>
    options.UseOracle(connectionString))
    ↓
HISDbContext.OnModelCreating: apply Oracle-specific type mappings
    - NVARCHAR(MAX) → NCLOB
    - UNIQUEIDENTIFIER → RAW(16)
    - DATETIME2 → TIMESTAMP
    - BIT → NUMBER(1)
    ↓
All services use LINQ → EF Core translates to Oracle SQL
    ↓
Raw SQL (in reconciliation reports, statistics) → use IDbProviderHelper
    for provider-specific query generation
```

## Patterns to Follow

### Pattern 1: Gateway Client with Resilience

**What:** All external service clients implement retry, circuit breaker, and timeout policies using `IHttpClientFactory` + Polly.

**When:** Every external integration (BHXH, SMS, DQGVN, AI, Face).

**Why:** External services are unreliable. BHXH gateway has documented downtime windows. SMS providers have rate limits. AI services have variable latency.

**Example:**
```csharp
// In DependencyInjection.cs
services.AddHttpClient<IBhxhGatewayService, BhxhGatewayService>()
    .AddPolicyHandler(GetRetryPolicy())      // 3 retries with exponential backoff
    .AddPolicyHandler(GetCircuitBreakerPolicy())  // Open circuit after 5 failures
    .AddPolicyHandler(Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(30)));

// In BhxhGatewayService
public class BhxhGatewayService : IBhxhGatewayService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<BhxhGatewayService> _logger;
    private readonly StackExchange.Redis.IDatabase _redis; // For caching

    public async Task<InsuranceVerificationResultDto> VerifyInsuranceAsync(string insuranceNumber)
    {
        // Check Redis cache first
        var cached = await _redis.StringGetAsync($"bhxh:verify:{insuranceNumber}");
        if (cached.HasValue) return JsonSerializer.Deserialize<InsuranceVerificationResultDto>(cached);

        // Call BHXH SOAP endpoint
        var soapEnvelope = BuildSoapEnvelope("CheckTheBHYT", insuranceNumber);
        var response = await _httpClient.PostAsync(_bhxhUrl, new StringContent(soapEnvelope, Encoding.UTF8, "text/xml"));

        var result = ParseSoapResponse(await response.Content.ReadAsStringAsync());

        // Cache for 24 hours
        await _redis.StringSetAsync($"bhxh:verify:{insuranceNumber}",
            JsonSerializer.Serialize(result), TimeSpan.FromHours(24));

        return result;
    }
}
```

### Pattern 2: Feature Flag for External Services

**What:** Each external integration is behind a configuration flag so the system works without it.

**When:** All 10 new components. The hospital may not have BHXH connectivity, SMS budget, or AI service.

**Why:** Current codebase already follows this pattern -- `EmailService` falls back to logging when SMTP is not configured. PACS and HL7 are optional. Every new service must degrade gracefully.

**Example:**
```json
// appsettings.json
{
  "ExternalServices": {
    "BHXH": { "Enabled": true, "BaseUrl": "https://gdbhxh.baohiemxahoi.gov.vn/..." },
    "SMS": { "Enabled": false, "Provider": "Viettel", "ApiKey": "" },
    "DQGVN": { "Enabled": false, "BaseUrl": "https://dqgvn.moh.gov.vn/..." },
    "AI": { "Enabled": false, "BaseUrl": "http://localhost:8080/ai" },
    "FaceRecognition": { "Enabled": false, "BaseUrl": "http://localhost:8081/face" },
    "SmartCard": { "Enabled": false },
    "Pkcs11": { "Enabled": false, "LibraryPath": "C:/Windows/System32/eps2003csp11.dll" }
  }
}
```

### Pattern 3: Composition Over New Service Files

**What:** New external clients should be injected into EXISTING services, not create parallel service hierarchies.

**When:** BHXH integration goes into `ReceptionCompleteService` and `InsuranceXmlService`. SMS goes into `EmailService` (renamed to `NotificationChannelService`). PKCS#11 goes into `DigitalSignatureService`.

**Why:** The codebase already has 30 service files. Adding 10 more parallel services would create confusion about which service to call. Instead, inject the external client into the existing service that owns the workflow.

**Example:**
```csharp
// ReceptionCompleteService already handles insurance verification
// Just inject the BHXH client and replace the mock
public class ReceptionCompleteService : IReceptionCompleteService
{
    private readonly IBhxhGatewayService _bhxhGateway; // NEW injection
    private readonly IConfiguration _configuration;

    public async Task<InsuranceVerificationResultDto> VerifyInsuranceAsync(InsuranceVerificationRequestDto dto)
    {
        if (_configuration.GetValue<bool>("ExternalServices:BHXH:Enabled"))
        {
            return await _bhxhGateway.VerifyInsuranceAsync(dto.InsuranceNumber, dto.PatientName, dto.DateOfBirth);
        }
        // Fallback to mock (current behavior)
        return new InsuranceVerificationResultDto { /* mock data */ };
    }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct External Calls from Controllers

**What people do:** Call BHXH/SMS/AI APIs directly from controller action methods.
**Why it's wrong:** Controllers in this codebase are thin wrappers (try/catch + call service + return result). Putting HTTP client logic in controllers violates the Clean Architecture boundary and makes testing impossible.
**Do this instead:** All external calls go through Infrastructure services. Controllers call Application service interfaces.

### Anti-Pattern 2: Synchronous External Calls in Request Pipeline

**What people do:** `await bhxhClient.VerifyAsync()` in the registration POST handler, blocking the user for 10+ seconds if BHXH is slow.
**Why it's wrong:** BHXH gateway response times are notoriously variable (1-30 seconds). The user should not wait.
**Do this instead:** Return registration immediately with "insurance verification pending". Use a background job (or fire-and-forget like the existing `ResultNotificationService`) to verify insurance. Push result via SignalR when verification completes.

### Anti-Pattern 3: Separate Oracle and SQL Server Code Paths

**What people do:** Write `if (isOracle) { oracleQuery } else { sqlServerQuery }` throughout services.
**Why it's wrong:** Unmaintainable. 350+ methods would need branching.
**Do this instead:** Use LINQ exclusively (EF Core translates). For the ~10 raw SQL queries in reconciliation/statistics, create a small `IDbDialectHelper` that provides provider-specific SQL fragments (e.g., date functions, pagination syntax).

### Anti-Pattern 4: Storing USB Token PIN in Backend

**What people do:** Accept PIN from frontend, store it in session/memory for reuse.
**Why it's wrong:** Security violation. PIN must be used immediately and discarded. This was already attempted and reverted in Session 8-9 of development.
**Do this instead:** PIN is passed per-request, used for PKCS#11 C_Login, then the session is immediately closed. PIN never touches disk, logs, or persistent memory.

## Integration Points Summary

### External Services (New)

| Service | Protocol | Direction | Latency | Availability | Fallback |
|---------|----------|-----------|---------|-------------|----------|
| BHXH Gateway | SOAP/XML | Outbound | 1-30s | Business hours | Mock data (current) |
| SMS Gateway | REST | Outbound | <1s | 99.9% | Email fallback |
| DQGVN Portal | REST/FHIR | Outbound | 2-10s | Variable | Queue for retry |
| AI Service | REST/gRPC | Outbound | 0.5-5s | Optional | No suggestions shown |
| Face Service | REST | Outbound | 0.5-2s | Optional | Manual patient search |
| Smart Card | PC/SC local | Bidirectional | <0.5s | Hardware dependent | Manual data entry |
| USB Token | PKCS#11 local | Local | <1s | Hardware dependent | Windows PIN popup (current) |
| Oracle DB | EF Core | Local | Same as SQL | Config choice | SQL Server (default) |

### Internal Boundaries (Existing)

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ Backend | HTTP REST + SignalR WebSocket | Vite proxy :3001 → :5106 |
| Backend ↔ SQL Server | EF Core (TCP :1433) | 80+ DbSets, ValueConverter for Guid/String |
| Backend ↔ Redis | StackExchange.Redis (TCP :6379) | Currently minimal use, expand for BHXH cache |
| Backend ↔ Orthanc PACS | REST + DICOM (TCP :4242/:8042) | DICOM push/query/retrieve |
| Backend ↔ HL7Spy LIS | TCP/MLLP (:2576) | BackgroundService listener |
| Backend services ↔ each other | Direct DI injection | Scoped services share DbContext |

## Suggested Build Order

Build order is driven by dependencies between components and hospital operational priorities.

### Phase 1: BHXH Gateway + SMS Gateway (highest operational value)
**Why first:** BHXH integration is the single biggest gap for Level 6 compliance. Every patient registration currently uses mock insurance data. SMS is the companion channel for OTP and result notifications.
- BHXH client: Replace mock in ReceptionCompleteService + InsuranceXmlService
- SMS client: Add alongside existing EmailService
- Redis caching: For BHXH response caching
- **Depends on:** Nothing new. Uses existing service injection pattern.
- **Blocks:** DQGVN (needs real insurance data to submit)

### Phase 2: PKCS#11 USB Token Signing (security requirement)
**Why second:** All EMR forms legally require CKS digital signatures. Currently only works via Windows PIN popup (unusable in headless/thin client scenarios). This blocks EMR certification.
- Pkcs11Interop integration in DigitalSignatureService
- Frontend PIN input modal (already partially exists)
- Extend to all 38 EMR form print templates
- **Depends on:** Nothing new. Physical USB Token hardware already available.
- **Blocks:** Full EMR signing workflow, DQGVN signed document submission

### Phase 3: Oracle DB Support (contractual requirement)
**Why third:** Required by contract/TT specifications. Can be done in parallel with Phase 2 since it touches different files.
- Add `Oracle.EntityFrameworkCore` NuGet package
- Provider switch in DependencyInjection.cs
- Type mapping overrides in HISDbContext
- Abstract raw SQL to provider-neutral LINQ or IDbDialectHelper
- **Depends on:** Nothing new. Pure infrastructure change.
- **Blocks:** Nothing directly, but required for final certification.

### Phase 4: DQGVN + SNOMED CT + HL7 CDA (interoperability)
**Why fourth:** Requires real patient data (Phase 1: BHXH), signed documents (Phase 2: PKCS#11), and is lower priority than direct patient care workflows.
- DQGVN FHIR Bundle submission service
- SNOMED CT code mapping on ClinicalTerms table
- HL7 CDA document generation service
- Extend existing FhirService for DQGVN-specific bundle format
- **Depends on:** Phase 1 (real insurance data), Phase 2 (document signing)
- **Blocks:** Nothing

### Phase 5: Smart Card Reader (hardware integration)
**Why fifth:** Requires physical smart card readers at all reception desks. Hardware procurement is independent of software. Existing endpoints and DTOs are already defined.
- PCSC-Sharp integration in new SmartCardService
- Implement ReceptionCompleteService.ReadSmartCardAsync (replace mock)
- Implement ReceptionCompleteService.WriteSmartCardAsync (replace TODO)
- **Depends on:** Phase 1 (BHXH verification to write to card after visit)
- **Blocks:** Nothing

### Phase 6: AI Inference + Face Recognition (enhancement, not compliance)
**Why last:** These are differentiators, not Level 6 requirements. They depend on external AI/ML services that need separate development/training.
- AI diagnosis suggestion client
- AI drug interaction enhancement
- Face recognition client for patient identification
- Patient booking portal enhancement (QR check-in, SMS confirmation)
- **Depends on:** Everything else should be stable first
- **Blocks:** Nothing (optional features)

### Build Order Dependency Graph

```
Phase 1 (BHXH + SMS)
    ↓
Phase 2 (PKCS#11)  ←→  Phase 3 (Oracle) [parallel]
    ↓
Phase 4 (DQGVN + SNOMED + CDA)
    ↓
Phase 5 (Smart Card)
    ↓
Phase 6 (AI + Face)
```

## Scaling Considerations

| Concern | Current (1 hospital) | Growth (5 hospitals) | Scale (50+ hospitals) |
|---------|---------------------|---------------------|----------------------|
| Database | Single SQL Server instance | Separate DB per hospital | Consider read replicas for reporting |
| BHXH Gateway | Direct HTTP calls | Still direct (per-hospital BHXH connection) | Gateway proxy with rate limiting |
| SMS | Low volume (<100/day) | Moderate (<1000/day) | Bulk SMS provider, queue-based |
| SignalR | Single hub, in-memory | Single hub per hospital | Redis backplane for multi-instance |
| FHIR/DQGVN | Low volume (on-demand) | Moderate (batch nightly) | Background job queue |
| USB Token | 1-2 tokens per hospital | Same (per-workstation) | No scaling concern |
| AI Service | Optional, low volume | Shared service instance | GPU scaling, request queuing |

**First bottleneck:** BHXH gateway rate limiting. The BHXH portal has undocumented rate limits. Mitigation: aggressive Redis caching (24h TTL for verified insurance cards), batch verification during off-hours.

**Second bottleneck:** SignalR connections at scale. Current in-memory model works for one server instance. If deploying multiple API instances behind load balancer, add Redis backplane for SignalR (`services.AddSignalR().AddStackExchangeRedis()`).

## Sources

- Direct codebase analysis of `C:/Source/HIS/` (HIGH confidence -- primary source)
- Vietnamese healthcare IT standards: TT 54/2017, TT 32/2023, TT 13/2025 (referenced in PROJECT.md)
- Existing NangCap_PhanTich.md gap analysis document
- BHXH portal integration documentation (known SOAP/XML protocol -- MEDIUM confidence, exact API spec not verified)
- Pkcs11Interop .NET library: known to support WINCA/VNPT CA/Viettel CA tokens (MEDIUM confidence -- verified token hardware exists in project, library compatibility assumed from .NET support)
- Oracle.EntityFrameworkCore: officially supported EF Core provider (HIGH confidence)
- PCSC-Sharp NuGet package for smart card reader: standard .NET PC/SC wrapper (HIGH confidence)

---
*Architecture research for: HIS Level 6 Upgrade -- External Integration Layer*
*Researched: 2026-02-28*
