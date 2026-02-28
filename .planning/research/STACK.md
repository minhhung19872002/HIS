# Stack Research: HIS Level 6 Compliance Features

**Domain:** Vietnamese Hospital Information System (HIS) -- Level 6 upgrade per TT 54/2017, TT 32/2023, TT 13/2025
**Researched:** 2026-02-28
**Confidence:** MEDIUM (Vietnamese government APIs have limited public documentation; library versions verified via NuGet/npm)

---

## Current Stack (Baseline)

Before recommending additions, here is the verified existing stack that all new packages must integrate with:

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | .NET 9.0 | net9.0 | All backend projects target net9.0 |
| Frontend | React | 19.2.0 | With TypeScript 5.9 |
| UI Library | Ant Design | 6.2.2 | Migrated from v5, stable |
| ORM | EF Core (SQL Server) | 9.0.0 | Microsoft.EntityFrameworkCore.SqlServer |
| PDF | iText7 | 8.0.2 | With BouncyCastle adapter 8.0.2 |
| Auth | JWT Bearer | 8.0.0 | Microsoft.AspNetCore.Authentication.JwtBearer |
| Real-time | SignalR | Built-in (ASP.NET Core 9) | @microsoft/signalr 10.0.0 on frontend |
| Crypto | System.Security.Cryptography.Pkcs | 10.0.3 | CMS/PKCS#7 signing |
| Hashing | BCrypt.Net-Next | 4.0.3 | Password hashing |
| Validation | FluentValidation | 11.9.0 | DTO validation |
| Mapping | AutoMapper | 12.0.1 | DTO mapping |
| HTTP | Axios | 1.13.4 | Frontend API client |
| Charts | Recharts | 3.7.0 | Dashboard visualizations |
| Scanning | html5-qrcode | 2.3.8 | Barcode/QR in browser |
| Testing | Cypress 15.10, Playwright 1.58 | | 803+ E2E tests |

---

## Recommended Stack Additions

### 1. BHXH Gateway Integration (Vietnamese Social Insurance)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `System.Net.Http` (built-in) | .NET 9 | HTTP client for BHXH web services | Already in runtime; no extra package needed | HIGH |
| `System.Xml.Serialization` (built-in) | .NET 9 | XML 4210/4750 serialization | BHXH uses XML format per QD 4750/QD-BYT | HIGH |
| `System.ServiceModel.Http` | 6.2.0 | WCF client for BHXH SOAP endpoints | BHXH gateway uses SOAP web services alongside REST/JSON | MEDIUM |

**Architecture:** Create `IBhxhGatewayService` in HIS.Application with two transport adapters:
1. **SOAP adapter** for legacy BHXH endpoints (tra cuu the BHYT, giam dinh)
2. **REST/JSON adapter** for newer BHXH endpoints (per Decree 102/2025/ND-CP)

**Vietnamese-specific details:**
- BHXH portal: `https://egw.baohiemxahoi.gov.vn` (production), `https://egwtest.baohiemxahoi.gov.vn` (staging)
- Authentication: Digital certificate (USB Token) + API key issued per hospital
- XML format: Per QD 4750/QD-BYT (replacing older 4210 format), defines XML1-XML5 for medical claims
- Data exchange: JSON via web service for real-time lookups, XML batch for claim submission
- Hospital must register with BHXH Vietnam to receive API credentials

**What NOT to use:**
- Do NOT use third-party BHXH middleware services (e.g., VNPT-BHXH, eBH, VIN-BHXH) as the library layer -- these are SaaS products for accountants, not developer APIs. Instead, integrate directly with BHXH gateway endpoints.

**Confidence: MEDIUM** -- BHXH API documentation is not publicly available; specifications are distributed to registered healthcare facilities. The XML format is confirmed via QD 4750/QD-BYT. Gateway URLs are from training data and need verification with the hospital's BHXH credentials.

---

### 2. SMS Gateway (Vietnamese Carriers)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **eSMS.vn REST API** | Current | Primary SMS gateway | Vietnamese-focused, REST/JSON API, supports Brandname + OTP, C# samples provided, covers all VN carriers | HIGH |
| **SpeedSMS API** | Current | Alternative/backup | Good fallback, REST API, supports brandname/OTP, competitive pricing | MEDIUM |

**Recommended: eSMS.vn** because:
- REST endpoint: `POST https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/`
- Auth: ApiKey + SecretKey (issued on registration)
- SMS types: type 2 (random sender), type 3 (registered brandname), type 4 (Verify/Notify brandname)
- Supports OTP delivery with Vietnamese carrier routing (Viettel, VNPT, Mobifone, Vietnamobile)
- Provides C# / .NET sample code
- Pricing competitive for Vietnamese market

**Implementation pattern:**
```
ISmsGateway (interface)
  ├── EsmsGatewayService (primary)
  └── SpeedSmsGatewayService (fallback)
```

Create `ISmsGateway` abstraction in HIS.Application, implement in HIS.Infrastructure. Use `IHttpClientFactory` (already registered) for HTTP calls. No additional NuGet packages needed -- just HttpClient with JSON.

**What NOT to use:**
- Twilio, Vonage, AWS SNS -- overpriced for Vietnamese domestic SMS, routing through international gateways adds latency and cost
- Direct Viettel/VNPT/Mobifone APIs -- these require enterprise contracts, branded SIM allocation, and are harder to integrate than aggregator APIs

**Confidence: HIGH** -- eSMS.vn API documentation is publicly available at https://developers.esms.vn and https://esms.vn/SMSApi/ApiDetail. SpeedSMS docs at https://speedsms.vn/sms-api/.

---

### 3. USB Token / CKS Digital Signatures via PKCS#11

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Pkcs11Interop** | 5.3.0 | PKCS#11 managed wrapper | Only mature .NET PKCS#11 library; supports all Vietnamese CA tokens | HIGH |
| **Pkcs11Interop.X509Store** | 0.5.0 | Simplified cert/key access | Provides X509Certificate2 compatible store over PKCS#11; integrates with SignedCms | HIGH |
| iText7 (existing 8.0.2) | 8.0.2 | PDF signing with IExternalSignature | Already installed; use custom Pkcs11Signature implementing IExternalSignature | HIGH |

**Vietnamese CA PKCS#11 driver DLL paths (Windows):**

| CA Provider | Token Model | PKCS#11 DLL (typical) | Notes |
|-------------|-------------|----------------------|-------|
| Viettel-CA | ePass2003 / SafeNet | `C:\Windows\System32\efy-ca_v6.dll` or `eps2003csp11.dll` | Installed by Viettel Token Manager |
| VNPT-CA | eToken 5110 / SafeNet | `C:\Windows\System32\eTPKCS11.dll` | Installed by VNPT Token Manager |
| BKAV-CA | ePass2003 | `C:\Windows\System32\eps2003csp11.dll` | Same hardware as some Viettel tokens |
| NewCA (FPT) | Various | Varies by hardware model | Check installation directory |

**Implementation pattern:**
1. Create `Pkcs11SignatureService : IExternalSignature` that wraps Pkcs11Interop
2. Accept PKCS#11 DLL path + token slot + PIN as configuration
3. Use `Pkcs11Interop.HighLevelAPI` to open session, find private key, sign hash
4. Integrate with existing `PdfSignatureService` (already uses iText7)
5. Configure per-hospital via `appsettings.json` (DLL path varies by CA provider)

**Why Pkcs11Interop over alternatives:**
- RSACng (current approach) cannot send PIN programmatically -- triggers Windows dialog, blocks headless/server scenarios
- Pkcs11Interop talks directly to the PKCS#11 driver, bypassing Windows CSP layer
- Apache 2.0 license, actively maintained (last release Feb 2025)

**What NOT to use:**
- `System.Security.Cryptography.Pkcs` alone -- it only handles CMS message formatting, not PKCS#11 token communication
- GemBox.Pdf, GroupDocs.Signature -- commercial licenses, unnecessary when iText7 + Pkcs11Interop covers the use case
- Windows CNG/CSP APIs -- cannot programmatically supply PIN for server-side signing

**Confidence: HIGH** -- Pkcs11Interop 5.3.0 verified on NuGet (Feb 2025). iText7 PKCS#11 integration documented at https://kb.itextpdf.com/home/it7kb/examples/digital-signing-with-itext-7/part-iii-pkcs-11.

---

### 4. Oracle DB Dual-Support

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Oracle.EntityFrameworkCore** | 9.23.90 | EF Core provider for Oracle | Official Oracle-maintained provider for EF Core 9, same DbContext API | HIGH |
| **Oracle.ManagedDataAccess.Core** | 23.7.0 | Oracle managed data access (transitive dep) | Pulled in automatically by Oracle.EntityFrameworkCore, 100% managed code | HIGH |

**Architecture: Provider-switching pattern**
```csharp
// In DependencyInjection.cs
if (dbProvider == "Oracle")
    services.AddDbContext<HISDbContext>(o => o.UseOracle(connectionString));
else
    services.AddDbContext<HISDbContext>(o => o.UseSqlServer(connectionString));
```

**Migration strategy:**
1. Add Oracle.EntityFrameworkCore to HIS.Infrastructure.csproj (alongside existing SqlServer provider)
2. Abstract provider selection in DI registration via `appsettings.json` `"DatabaseProvider": "SqlServer"|"Oracle"`
3. Create separate EF Core migration sets per provider (`Migrations/SqlServer/`, `Migrations/Oracle/`)
4. Handle SQL dialect differences in raw SQL queries (replace `GETDATE()` with `SYSDATE`, `NEWID()` with `SYS_GUID()`, `NVARCHAR` with `NVARCHAR2`, etc.)
5. ValueConverter for Guid columns -- Oracle uses RAW(16), not uniqueidentifier

**Known EF Core + Oracle pitfalls:**
- Oracle column names are case-sensitive by default (uppercase) -- use `.HasColumnName("ColumnName")` or configure naming convention
- Oracle has 128-char identifier limit (was 30 before 12.2) -- fine for this project
- `string.Contains()` translates to `INSTR()` not `LIKE` on Oracle
- Sequence-based ID generation differs from SQL Server IDENTITY
- DateTime precision differences (Oracle DATE includes time, TIMESTAMP has fractions)

**What NOT to use:**
- Devart.Data.Oracle.EFCore -- commercial license ($350+), Oracle's free official provider is sufficient
- Oracle client (unmanaged) -- use managed-only (`Oracle.ManagedDataAccess.Core`) to avoid native dependency headaches

**Confidence: HIGH** -- Oracle.EntityFrameworkCore 9.23.90 verified on NuGet (June 2025), targets EF Core 9.x.

---

### 5. SNOMED CT Terminology Mapping

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Snowstorm Lite** (Docker) | latest | Lightweight SNOMED CT FHIR terminology server | Small memory footprint, FHIR R4 API, 5-min import, Docker-ready | HIGH |
| **Hl7.Fhir.R4** | 6.0.2 | .NET FHIR R4 SDK | Official Firely SDK for querying Snowstorm Lite FHIR API | HIGH |

**Architecture:**
1. Deploy Snowstorm Lite as Docker container alongside existing services (SQL Server, Redis, Orthanc)
2. Load SNOMED CT International Edition + any Vietnamese extension
3. Query via FHIR API: `GET /fhir/CodeSystem/$lookup?system=http://snomed.info/sct&code=XXX`
4. Create `ISnomedTerminologyService` that wraps Firely SDK calls to Snowstorm Lite
5. Map existing `ClinicalTerms` table (58 terms) to SNOMED CT codes via batch lookup

**Docker compose addition:**
```yaml
snowstorm-lite:
  image: snomedinternational/snowstorm-lite:latest
  ports:
    - "8085:8080"
  volumes:
    - snowstorm-data:/data
```

**SNOMED CT licensing:** Vietnam is NOT yet a member of SNOMED International (as of 2025). Hospital must apply for an Affiliate License through SNOMED International's Member Licensing and Distribution Service (MLDS) to use SNOMED CT.

**Why Snowstorm Lite over full Snowstorm:**
- Full Snowstorm needs Elasticsearch + 8GB RAM minimum
- Snowstorm Lite runs standalone with ~1GB RAM, 5-min import
- Both expose same FHIR Terminology API

**Why NOT to build your own SNOMED lookup:**
- SNOMED CT International Edition has 350K+ concepts, 1.5M+ descriptions
- Subsumption queries ("is-a" relationships) require graph traversal
- Snowstorm Lite handles this efficiently; reimplementing is months of work

**Confidence: HIGH** -- Snowstorm Lite verified on Docker Hub (snomedinternational/snowstorm-lite). Firely SDK Hl7.Fhir.R4 6.0.2 verified on NuGet.

---

### 6. HL7 CDA (Clinical Document Architecture)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Hl7.Fhir.R4** (existing recommendation) | 6.0.2 | FHIR document generation | CDA R2 is being superseded by FHIR Documents; dual output recommended | HIGH |
| `System.Xml.Linq` (built-in) | .NET 9 | CDA XML document generation | CDA documents are XML; no special library needed for generation | HIGH |

**Architecture decision: Build CDA templates, do NOT adopt a full CDA library.**

Rationale:
- The only .NET CDA library found is `AuDigitalHealth/clinical-document-library-dotnet` -- Australian-specific, targets Australian CDA templates, not Vietnamese
- Vietnamese CDA requirements per TT 13/2025 define specific template structures for Vietnamese medical records
- CDA R2 documents are structured XML with a fixed schema -- building templates with `XDocument`/`XElement` is straightforward
- The existing `PdfTemplateHelper` (1094 lines) already generates 38 EMR form templates -- adding CDA XML output per form is incremental

**Implementation:**
1. Create `CdaDocumentBuilder` that takes EMR data and outputs CDA R2 XML
2. Follow HL7 CDA R2 schema: `<ClinicalDocument>` with `<recordTarget>`, `<author>`, `<component>/<structuredBody>`
3. Map ICD-10 codes (already in system) to CDA `<code>` elements
4. Map SNOMED CT codes (from Snowstorm Lite) to CDA `<value>` elements
5. Embed digital signature in CDA `<legalAuthenticator>` section

**What NOT to use:**
- `AuDigitalHealth/clinical-document-library-dotnet` -- Australian-specific templates, not Vietnamese
- Commercial CDA toolkits -- CDA XML structure is simple enough to template manually
- FHIR-to-CDA converters -- risk losing Vietnamese-specific fields in translation

**Confidence: MEDIUM** -- CDA R2 schema is well-documented by HL7. Vietnamese-specific CDA template requirements from TT 13/2025 need to be obtained from the hospital or Bo Y Te.

---

### 7. Online Appointment Booking

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Existing stack (React + ASP.NET Core) | Current | Public-facing booking UI + API | No new packages needed; extend existing Appointment entities | HIGH |
| `publicClient.ts` (existing) | Current | Unauthenticated API client | Already exists for QueueDisplay; reuse for public booking | HIGH |

**Architecture:**
- Backend: Add `AppointmentBookingController` with public endpoints (no JWT required)
- Frontend: Create `/booking` route (outside ProtectedRoute, like `/queue-display`)
- Captcha: Add Google reCAPTCHA v3 for bot prevention (backend: validate token via Google API, frontend: `react-google-recaptcha-v3`)
- Notifications: Use existing `ISmsGateway` for booking confirmation + `IEmailService` for email confirmation

**New frontend package (optional):**

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-google-recaptcha-v3` | ^1.10.1 | reCAPTCHA integration | Bot prevention on public booking form |

**What NOT to use:**
- Separate booking microservice -- overkill for single-hospital deployment
- Third-party scheduling libraries (Calendly, etc.) -- adds external dependency for a simple feature
- WebSocket for booking -- HTTP polling or POST is sufficient for appointment creation

**Confidence: HIGH** -- This is a standard CRUD feature using existing technology.

---

### 8. AI-Assisted Diagnosis Suggestions

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Microsoft.ML.OnnxRuntime** | 1.24.2 | Run pre-trained ICD-10 prediction models | Cross-platform, GPU-optional, mature .NET integration | HIGH |
| **Microsoft.ML** | 4.0.2 | ML.NET for model training/pipeline | If training custom models on hospital data | MEDIUM |

**Architecture: Two-tier approach**

**Tier 1 (Rule-based, implement first):**
- Expand existing `DrugInteraction` checking pattern
- Create `IDiagnosisSuggestionService` with symptom-to-ICD-10 mapping rules
- Use existing `ClinicalTerms` (58 symptom/sign entries) as input vocabulary
- Map symptom combinations to likely ICD-10 codes using weighted scoring
- This can ship quickly and provides immediate value

**Tier 2 (ML-based, implement later):**
- Train or acquire ONNX model for ICD-10 prediction from clinical notes
- Input: clinical text (chief complaint, history, physical exam)
- Output: ranked list of ICD-10 codes with confidence scores
- Load model via `Microsoft.ML.OnnxRuntime` at startup
- Serve predictions via `/api/ai/suggest-diagnosis` endpoint

**Pre-trained models to evaluate:**
- PubMedBERT / BioBERT fine-tuned on ICD-10 coding (available on HuggingFace, export to ONNX)
- Hospital-specific model trained on historical examination data (requires data science work)

**What NOT to use:**
- OpenAI/Claude API for diagnosis -- compliance concerns with sending patient data to external AI services, latency issues, and Vietnamese medical terminology gaps
- TensorFlow.NET -- less mature on .NET than ONNX Runtime, larger footprint
- Custom PyTorch server -- adds Python infrastructure complexity; ONNX avoids this

**Confidence: MEDIUM** -- ONNX Runtime version verified on NuGet. ML model quality for Vietnamese medical text is unverified and likely requires significant training data work. Tier 1 rule-based approach is HIGH confidence.

---

### 9. Face Authentication (Biometric)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **WebAuthn / FIDO2 (browser-native)** | Web API standard | Biometric auth via device hardware | Uses device face/fingerprint sensor, no server-side biometric data storage, privacy-compliant | HIGH |
| **Fido2** (fido2-net-lib) | 4.0.0 | .NET WebAuthn relying party | Battle-tested FIDO2 server library for .NET, attestation + assertion validation | HIGH |

**IMPORTANT: Use WebAuthn/FIDO2, NOT server-side face recognition.**

Rationale:
- WebAuthn leverages the device's built-in biometric hardware (Windows Hello face, fingerprint, mobile FaceID/TouchID)
- No biometric data ever leaves the device -- only a cryptographic assertion is sent to the server
- Eliminates privacy/GDPR concerns of storing face templates on server
- Works on all modern browsers (Chrome 67+, Firefox 60+, Safari 14+, Edge 18+)
- Vietnamese Data Law (No. 2025/QH15) classifies biometric data as sensitive -- WebAuthn avoids server-side processing entirely

**Implementation:**
1. Add `Fido2` NuGet package to HIS.API
2. Create registration endpoint: `/api/auth/fido2/register` (create credential)
3. Create authentication endpoint: `/api/auth/fido2/authenticate` (verify assertion)
4. Store credential public key in Users table (new column `Fido2Credentials JSON`)
5. Frontend: Use `navigator.credentials.create()` / `navigator.credentials.get()`
6. Integrate as optional 2FA factor alongside existing Email OTP

**What NOT to use:**
- FaceRecognitionDotNet / Azure Face API -- requires server-side face template storage, biometric data processing, consent management, and significantly more infrastructure
- Custom face recognition model -- massive development effort, accuracy concerns, maintenance burden
- Any solution that stores biometric templates on server -- privacy law risk

**Confidence: HIGH** -- Fido2 4.0.0 verified on NuGet (Aug 2025). WebAuthn is a W3C standard. ASP.NET Core 10 will have built-in passkey support, but 4.0.0 works with .NET 9.

---

### 10. Smart Card Read/Write (BHYT Insurance)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **PCSC** (pcsc-sharp) | 7.0.1 | PC/SC smart card reader access | Only maintained .NET PC/SC library, cross-platform, no dependencies | HIGH |

**CRITICAL CONTEXT: Vietnam is transitioning away from physical BHYT cards.**

Per Vietnam's implementation of electronic health insurance (effective June 1, 2025):
- Paper BHYT cards are being phased out
- Electronic BHYT via VssID app and VNeID (citizen ID with chip) is now primary
- Chip-embedded citizen ID cards (CCCD gan chip) can be read at hospitals via NFC readers
- 214 million+ successful lookups via CCCD chip as of mid-2025

**Recommended approach:**
1. Implement PCSC-based card reading for CCCD chip cards (NFC/contactless)
2. Also support legacy BHYT magnetic strip cards via PCSC (backward compatibility)
3. Extract citizen ID number from CCCD chip, then call BHXH API to verify insurance status
4. Store extracted data in existing `Patient.InsuranceNumber` field

**Implementation:**
```csharp
// PCSC NuGet package
<PackageReference Include="PCSC" Version="7.0.1" />
```
- Use `PCSC.SCardContext` to enumerate readers
- Use `PCSC.SCardReader` to connect to card and transmit APDUs
- Parse CCCD chip data (APDU commands per Vietnamese CCCD specification)
- Create `ISmartCardService` in HIS.Application

**What NOT to use:**
- Commercial smart card SDKs (SmartCard-API.com at $590) -- PCSC 7.0.1 is free and sufficient
- Browser-based Web Smart Card API -- still experimental, not widely supported
- NFC web APIs -- not available in desktop browsers

**Confidence: HIGH** for PCSC library (verified on NuGet). **LOW** for CCCD chip APDU command specifications -- these are distributed by Vietnamese Ministry of Public Security, not publicly documented. Hospital IT department should have the CCCD reader SDK from their equipment vendor.

---

### 11. DQGVN Health Data Exchange

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `System.Net.Http` (built-in) | .NET 9 | HTTP client for MOH data exchange | REST/JSON API calls to MOH platforms | HIGH |
| **Hl7.Fhir.R4** (shared with #5, #6) | 6.0.2 | FHIR resource formatting | MOH electronic health record platform uses FHIR R4 | MEDIUM |

**Context: "DQGVN" refers to Du lieu Quoc gia Ve Nhan khau / Cong Dan (National Population/Citizen Data) and the broader health data exchange ecosystem.**

Per recent Vietnamese government decisions:
- Decision 4048/QD-BYT (Dec 2025): Deploy shared platforms for remote consultation and electronic health records
- Decree 102/2025/ND-CP: Defines 24 data groups and 4 core groups for National Health Database
- 34 million+ electronic health records integrated with VNeID by Jan 2026

**Implementation:**
1. Create `IHealthDataExchangeService` for MOH platform integration
2. Format data as FHIR R4 resources (Patient, Encounter, Observation, etc.) using Firely SDK
3. Submit to MOH endpoints per integration specification (provided to hospitals by MOH)
4. Support both push (real-time submission) and batch (periodic sync) modes
5. Log all exchanges in AuditLog (already implemented)

**What NOT to use:**
- Custom XML format -- MOH is standardizing on FHIR R4 per TT 13/2025
- Third-party health data exchange middleware -- direct integration with MOH platform is required

**Confidence: LOW** -- MOH API specifications are not publicly documented. The hospital must obtain integration credentials and technical documentation from Bo Y Te (Ministry of Health). The FHIR R4 direction is confirmed by TT 13/2025 and Decision 4048/QD-BYT, but specific endpoint URLs and authentication mechanisms need hospital-level verification.

---

## Complete Installation Plan

### Backend NuGet Packages (HIS.Infrastructure.csproj)

```xml
<!-- PKCS#11 USB Token Digital Signatures -->
<PackageReference Include="Pkcs11Interop" Version="5.3.0" />
<PackageReference Include="Pkcs11Interop.X509Store" Version="0.5.0" />

<!-- Oracle Database Support (dual-provider) -->
<PackageReference Include="Oracle.EntityFrameworkCore" Version="9.23.90" />

<!-- FHIR R4 SDK (SNOMED CT + CDA + Health Exchange) -->
<PackageReference Include="Hl7.Fhir.R4" Version="6.0.2" />

<!-- Smart Card / CCCD Reader -->
<PackageReference Include="PCSC" Version="7.0.1" />

<!-- AI Diagnosis (Phase 2) -->
<PackageReference Include="Microsoft.ML.OnnxRuntime" Version="1.24.2" />

<!-- WebAuthn / FIDO2 Biometric Auth -->
<PackageReference Include="Fido2" Version="4.0.0" />

<!-- WCF Client for BHXH SOAP (if needed) -->
<PackageReference Include="System.ServiceModel.Http" Version="6.2.0" />
```

### Frontend npm Packages (package.json)

```bash
# reCAPTCHA for public appointment booking
npm install react-google-recaptcha-v3@^1.10.1
```

No other new frontend packages needed. WebAuthn uses browser-native `navigator.credentials` API.

### Docker Compose Additions (docker-compose.yml)

```yaml
# SNOMED CT Terminology Server
snowstorm-lite:
  image: snomedinternational/snowstorm-lite:latest
  container_name: his-snowstorm
  ports:
    - "8085:8080"
  volumes:
    - snowstorm-data:/data
  restart: unless-stopped
  mem_limit: 2g
```

### Configuration Additions (appsettings.json)

```json
{
  "DatabaseProvider": "SqlServer",
  "OracleConnection": "User Id=HIS;Password=...;Data Source=...",

  "SmsGateway": {
    "Provider": "eSMS",
    "ApiKey": "",
    "SecretKey": "",
    "Brandname": "BVHUE",
    "BaseUrl": "https://rest.esms.vn/MainService.svc/json"
  },

  "BhxhGateway": {
    "BaseUrl": "https://egw.baohiemxahoi.gov.vn",
    "CertificateThumbprint": "",
    "HospitalCode": ""
  },

  "Pkcs11": {
    "LibraryPath": "C:\\Windows\\System32\\efy-ca_v6.dll",
    "TokenSlot": 0,
    "DefaultHashAlgorithm": "SHA256"
  },

  "SnomedCT": {
    "ServerUrl": "http://localhost:8085/fhir"
  },

  "Fido2": {
    "ServerDomain": "localhost",
    "ServerName": "HIS - Benh vien Truong DH Y Duoc Hue",
    "Origins": ["https://localhost:3001", "http://localhost:3001"]
  },

  "Recaptcha": {
    "SiteKey": "",
    "SecretKey": ""
  }
}
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| SMS Gateway | eSMS.vn | Twilio | International routing, 10x cost, no Vietnamese brandname support |
| SMS Gateway | eSMS.vn | VNPT/Viettel direct API | Requires enterprise carrier contract, harder integration |
| PKCS#11 | Pkcs11Interop | Windows CNG | Cannot supply PIN programmatically; blocks server-side signing |
| PKCS#11 | Pkcs11Interop | GroupDocs.Signature | Commercial license, unnecessary layer over same PKCS#11 calls |
| Oracle EF | Oracle.EntityFrameworkCore | Devart.Data.Oracle.EFCore | $350+ commercial license; Oracle's free provider is sufficient |
| SNOMED CT | Snowstorm Lite | Full Snowstorm | 8GB RAM + Elasticsearch overhead; Lite needs only 1-2GB |
| SNOMED CT | Snowstorm Lite | Self-built lookup table | 350K+ concepts with hierarchy; server handles subsumption queries |
| Face Auth | WebAuthn/FIDO2 | Azure Face API / FaceRecognitionDotNet | Server-side biometric storage violates Vietnamese Data Law; WebAuthn keeps biometrics on device |
| Face Auth | fido2-net-lib | ASP.NET Core 10 built-in | Project is on .NET 9; fido2-net-lib works now |
| CDA | Custom XML builder | AuDigitalHealth CDA library | Australian-specific, not Vietnamese templates |
| AI Diagnosis | ONNX Runtime | OpenAI API | Patient data privacy; latency; Vietnamese text quality concerns |
| AI Diagnosis | ONNX Runtime | TensorFlow.NET | Less mature .NET integration; larger footprint |
| Smart Card | PCSC 7.0.1 | Commercial Smart Card SDK | $590 for features we don't need; PCSC is free and sufficient |
| Booking | Existing React stack | Separate booking microservice | Overkill for single-hospital deployment |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Twilio / Vonage for Vietnamese SMS | International routing = slow + expensive; no VN brandname | eSMS.vn or SpeedSMS |
| Windows CNG/CSP for server signing | Triggers GUI PIN dialog; blocks headless scenarios | Pkcs11Interop direct PKCS#11 |
| Server-side face recognition | Vietnamese Data Law sensitivity; massive infrastructure | WebAuthn/FIDO2 (device biometric) |
| Full Snowstorm (with Elasticsearch) | 8GB+ RAM overhead for a terminology lookup service | Snowstorm Lite (1-2GB, standalone) |
| Third-party BHXH middleware (VNPT-BHXH, eBH) | SaaS for accountants, not developer APIs; adds intermediary | Direct BHXH gateway integration |
| Devart Oracle EF provider | Commercial; Oracle's free provider works fine | Oracle.EntityFrameworkCore (free) |
| OpenAI/Claude API for diagnosis | Patient data privacy; latency; VN medical text gaps | Local ONNX model (no data leaves hospital) |
| Separate booking microservice | Single-hospital deployment; complexity not justified | Extend existing ASP.NET Core API |
| NHapi / Nehta CDA libraries | Outdated, not maintained, or region-specific | Custom CDA XML builder with XDocument |

---

## Version Compatibility Matrix

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Oracle.EntityFrameworkCore 9.23.90 | EF Core 9.0.x, .NET 9 | Must match EF Core major version |
| Pkcs11Interop 5.3.0 | .NET Standard 2.0+ / .NET 9 | Cross-platform |
| Hl7.Fhir.R4 6.0.2 | .NET Standard 2.1+ / .NET 9 | Note: dropped netstandard2.0 in v6 |
| PCSC 7.0.1 | .NET 8+ / .NET Standard 2.0 | No dependencies |
| Fido2 4.0.0 | .NET 8+ / ASP.NET Core | Works with .NET 9 |
| Microsoft.ML.OnnxRuntime 1.24.2 | .NET 9 | Targets net9.0 explicitly |
| iText7 8.0.2 (existing) | Works with Pkcs11Interop via IExternalSignature | Custom adapter class needed |
| System.ServiceModel.Http 6.2.0 | .NET 9 | WCF client only (not server) |
| react-google-recaptcha-v3 1.10.1 | React 19 | Lightweight, hooks-based |

---

## Stack Patterns by Scenario

**If hospital uses Viettel-CA tokens:**
- Set `Pkcs11.LibraryPath` = `C:\Windows\System32\efy-ca_v6.dll`
- Test with Viettel Token Manager installed

**If hospital uses VNPT-CA tokens:**
- Set `Pkcs11.LibraryPath` = `C:\Windows\System32\eTPKCS11.dll`
- Test with VNPT Token Manager installed

**If hospital wants Oracle instead of SQL Server:**
- Set `DatabaseProvider` = `Oracle` in appsettings
- Run Oracle-specific migration set
- Ensure Oracle 19c+ (for long identifier support)

**If hospital has no SNOMED CT license yet:**
- Skip Snowstorm Lite deployment
- Use existing ClinicalTerms table as terminology source
- Add SNOMED CT codes later when license obtained via MLDS

**If hospital needs only SMS OTP (not brandname):**
- Use eSMS type 4 (default brandname "Verify")
- No brandname registration required

---

## Sources

### Verified via NuGet (HIGH confidence)
- [Pkcs11Interop 5.3.0](https://www.nuget.org/packages/Pkcs11Interop) -- Last updated Feb 2025
- [Oracle.EntityFrameworkCore 9.23.90](https://www.nuget.org/packages/Oracle.EntityFrameworkCore/9.23.90) -- Last updated June 2025
- [Hl7.Fhir.R4 6.0.2](https://www.nuget.org/packages/hl7.fhir.r4) -- Firely .NET SDK
- [PCSC 7.0.1](https://www.nuget.org/packages/PCSC/) -- pcsc-sharp
- [Fido2 4.0.0](https://www.nuget.org/packages/Fido2) -- fido2-net-lib, last updated Aug 2025
- [Microsoft.ML.OnnxRuntime 1.24.2](https://www.nuget.org/packages/Microsoft.ML.OnnxRuntime) -- ONNX Runtime

### Verified via Official Documentation (HIGH confidence)
- [iText7 PKCS#11 Signing](https://kb.itextpdf.com/home/it7kb/examples/digital-signing-with-itext-7/part-iii-pkcs-11) -- iText Knowledge Base
- [Snowstorm Lite Docker](https://github.com/IHTSDO/snowstorm-lite) -- SNOMED International
- [Snowstorm Docker Compose](https://github.com/IHTSDO/snowstorm/blob/master/docs/using-docker.md)
- [fido2-net-lib Documentation](https://fido2-net-lib.passwordless.dev/)
- [eSMS.vn API Documentation](https://developers.esms.vn/esms-api/ham-gui-tin/tin-nhan-sms-otp-cskh) -- Vietnamese SMS gateway
- [SpeedSMS API](https://speedsms.vn/sms-api/) -- Alternative Vietnamese SMS gateway
- [Oracle EF Core Documentation](https://docs.oracle.com/en/database/oracle/oracle-database/26/odpnt/ODPEFCore.html)
- [AuDigitalHealth CDA Library .NET](https://github.com/AuDigitalHealth/clinical-document-library-dotnet) -- Evaluated and rejected (AU-specific)

### Vietnamese Government Regulations (MEDIUM confidence)
- [BHXH Electronic Transaction Portal](https://baohiemxahoidientu.vn/)
- [Electronic BHXH/BHYT Implementation](https://www.vietnam.vn/en/chinh-thuc-ap-dung-so-bhxh-the-bhyt-dien-tu-tren-toan-quoc) -- Decree 164/2025/ND-CP
- [CCCD Chip Card BHYT Lookup](https://www.vietnam.vn/en/hon-214-trieu-luot-tra-cuu-thanh-cong-thong-tin-the-bhyt-bang-dinh-danh-ca-nhan-can-cuoc-cong-dan) -- 214M+ lookups
- [MOH Digital Health Transformation](https://vietnamnews.vn/society/1730000/health-ministry-accelerates-progress-on-digital-transformation-and-database-sharing.html)
- [VNPT-CA Downloads](https://vnpt-ca.vn/download-page)
- [Viettel-CA Installation Guide](https://viettelca.vn/huong-dan-cai-dat-phan-mem-chu-ky-so-viettel-token-manager)
- [Vietnam Data Law 2025](https://digitalpolicyalert.org/event/24945-implemented-data-law-no-2025qh15-including-data-localisation-requirement)

### WebSearch Only (LOW confidence -- needs validation)
- BHXH gateway endpoint URLs (`egw.baohiemxahoi.gov.vn`) -- not verified with production credentials
- Vietnamese CA PKCS#11 DLL filenames -- vary by token model and installation version
- DQGVN/MOH API specifications -- not publicly documented; hospital must obtain from MOH
- CCCD chip APDU command specifications -- distributed by Ministry of Public Security, not public

---

*Stack research for: Vietnamese HIS Level 6 Compliance Features*
*Researched: 2026-02-28*
