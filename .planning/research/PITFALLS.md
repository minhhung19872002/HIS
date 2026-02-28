# Pitfalls Research

**Domain:** Vietnamese Hospital Information System - Level 6 Upgrade (TT 54/2017, TT 32/2023, TT 13/2025)
**Researched:** 2026-02-28
**Confidence:** MEDIUM (domain-specific patterns verified against codebase; Vietnamese regulatory details from training data + official document references)

---

## Critical Pitfalls

### Pitfall 1: BHXH Gateway XML 4210 Schema Drift and Silent Rejection

**What goes wrong:**
The BHXH (Vietnam Social Insurance) gateway rejects XML claim submissions silently or with cryptic error codes. The hospital submits insurance claims that appear successful but are later flagged during settlement reconciliation. Common causes: (a) BHXH updates the XML schema (QD 4210 -> QD 4750 -> CV 7464 -> QD 130) without announcing to individual hospitals, (b) field validation rules change (e.g., `MaBenhChinh` ICD code format, `MaKhoa` department code mapping), (c) encoding issues with Vietnamese UTF-8 in XML payloads, (d) MA_LK linkage IDs become inconsistent across XML tables 1-5.

**Why it happens:**
The BHXH portal schema has been amended multiple times (QD 4210/2017, QD 4750/2018, CV 7464, QD 130/2021). Each amendment adds or changes fields across 5 XML data tables. The current codebase has DTOs for XML tables 1-5 (`Xml1MedicalRecordDto`, `Xml2MedicineDto`, `Xml3ServiceDto`, etc.) in `InsuranceXmlDTOs.cs` but the `InsuranceXmlService.VerifyInsuranceCardAsync` returns hardcoded mock data. When implementing the real gateway, developers typically build against one version and miss accumulated amendments.

**How to avoid:**
1. Before writing any gateway code, obtain the **current** BHXH technical specification document directly from the provincial BHXH office (So BHXH tinh Thua Thien Hue). Do not rely on publicly available versions of QD 4210 -- they may be outdated.
2. Build a **schema validation layer** that validates outbound XML against an XSD before submission. Store the XSD as a versioned resource so schema changes require only XSD replacement.
3. Implement a **staging/sandbox submission mode** where XML is generated and validated but not sent to the real gateway. Run this for 2 weeks parallel with the existing paper/manual submission process before cutting over.
4. Log every BHXH request/response pair verbatim (XML body + HTTP headers + timestamp) for audit trail and debugging rejected claims.
5. Parse and surface BHXH error codes in the UI -- the gateway returns Vietnamese error messages that need to be mapped to actionable instructions.

**Warning signs:**
- Insurance XML export works in dev but fails in production (different BHXH portal endpoints for test vs production)
- Claims accepted by gateway but rejected during monthly settlement (giam dinh cuoi thang)
- `MA_LK` values don't match between XML tables 1-5 for the same patient visit
- Vietnamese characters appear as mojibake in BHXH portal

**Phase to address:**
Phase 1 (BHXH Gateway Integration). Must be the earliest phase because it affects revenue collection. Require a "parallel run" milestone before go-live.

---

### Pitfall 2: USB Token PKCS#11 Provider Library Fragmentation

**What goes wrong:**
Digital signature implementation works with one USB Token brand (e.g., WINCA/BLUESTAR) but fails with another (VNPT-CA, Viettel-CA, BKAV-CA, FPT-CA). Each Vietnamese CA provider ships a different PKCS#11 DLL with different behaviors around session management, PIN callback, and multi-threaded access. The current codebase uses `X509Store` (Windows CryptoAPI) in `DigitalSignatureService.cs` which triggers a Windows PIN dialog popup -- this blocks headless/server-side signing and is already documented as a known issue ("RSACng doesn't support CSP PIN").

**Why it happens:**
Vietnamese hospitals typically have USB Tokens from multiple CA providers (different departments may have purchased from different vendors). Each provider has a different PKCS#11 middleware DLL:
- VNPT-CA: `eps2003csp11.dll` or `vnpt-ca-pkcs11.dll`
- Viettel-CA: `viettel-ca.dll` or `cryptoki.dll`
- BKAV-CA: `BkavCAToken.dll`
- FPT-CA: `fptca-pkcs11.dll`

The DLL paths, PIN handling, session limits, and supported algorithms differ per provider. The current `PdfSignatureService.cs` uses `X509Certificate2Signature` which only works when a user is interactively logged in on Windows with a GUI to handle the PIN dialog.

**How to avoid:**
1. Use `Pkcs11Interop` NuGet package (v5.3.0+) as the abstraction layer. It wraps the vendor-specific PKCS#11 DLLs behind a unified API.
2. Build a **configuration table** mapping CA provider names to their PKCS#11 DLL paths. Make the DLL path configurable per user or per workstation, not hardcoded.
3. Implement PIN handling via `Pkcs11Interop`'s `Session.Login(CKU.CKU_USER, pin)` method. Store the PIN temporarily in memory (never persist to disk) and prompt the user via the frontend only when needed.
4. Test with at least 3 CA providers before declaring the feature complete. The hospital (BV Truong DH Y Duoc Hue) should provide test tokens from each vendor they use.
5. Handle the `CKR_PIN_LOCKED` and `CKR_PIN_INCORRECT` return codes explicitly -- USB Tokens lock after 3-5 wrong PIN attempts and require vendor-specific unlock procedures.
6. PKCS#11 operations are NOT thread-safe. Use a `SemaphoreSlim(1,1)` per token slot to serialize signing operations.

**Warning signs:**
- Signing works on developer's machine but fails on hospital workstations (different CA provider)
- `CryptographicException` with message about "smart card" or "token" on specific machines
- PIN dialog appears on the server instead of the client browser (server-side signing architecture mistake)
- Token sessions time out during long-running batch signing operations (e.g., signing 38 EMR forms at discharge)

**Phase to address:**
Phase 2 (Digital Signature Expansion). Must come after BHXH integration because BHXH XML may also need digital signatures. Build the Pkcs11Interop abstraction first, then expand to all 38 EMR forms.

---

### Pitfall 3: Oracle Dual-Database Support Breaks Existing SQL Server Code

**What goes wrong:**
Adding Oracle support via `Oracle.EntityFrameworkCore` creates cascading breakage across the existing codebase. Three categories of failure: (a) 131 raw SQL calls across `BloodBankCompleteService.cs`, `LISCompleteService.cs`, and `HealthCheckService.cs` use SQL Server-specific syntax (`GETDATE()`, `DATEADD()`, `DATEDIFF()`, `ISNULL()`, `STUFF()`, `FOR XML PATH`), (b) GUID handling differs fundamentally (SQL Server `UNIQUEIDENTIFIER` vs Oracle `RAW(16)` with reversed byte order), (c) the existing `ValueConverter<string?, Guid?>` in `HISDbContext.cs` for CreatedBy/UpdatedBy on 31 tables will behave differently on Oracle.

**Why it happens:**
The project was built SQL Server-first. Raw SQL was used for performance-critical queries (BloodBank has 111 `FromSqlRaw`/`ExecuteSqlRaw` calls). EF Core's LINQ queries are database-agnostic, but raw SQL is not. The Oracle EF Core provider also has specific limitations: `NVARCHAR2(2000)` max length (vs SQL Server's `NVARCHAR(MAX)`), no `UNIQUEIDENTIFIER` type, different pagination syntax (`OFFSET/FETCH` works but `TOP N` does not), and `SYSDATE` instead of `GETDATE()`.

**How to avoid:**
1. **Do NOT attempt a full Oracle migration.** Instead, build a database abstraction layer that only the services with raw SQL need. This is 3 files: `BloodBankCompleteService.cs`, `LISCompleteService.cs`, `HealthCheckService.cs`.
2. Create a `ISqlDialect` interface with methods like `GetCurrentDate()`, `DateAdd()`, `DateDiff()`, `IsNull()`, `Top()`. Implement `SqlServerDialect` and `OracleDialect`. Inject based on configuration.
3. Replace the 28 SQL script files (`scripts/*.sql`) with database-agnostic migration scripts, or maintain parallel Oracle versions.
4. For GUID handling: Oracle stores GUIDs as `RAW(16)` with reversed byte order by default. Configure the Oracle EF Core provider with `.UseOracleSQLCompatibility("12")` and test GUID round-trips extensively.
5. Vietnamese text in Oracle requires `AL32UTF8` character set on the database level. If the Oracle instance uses `WE8ISO8859P1`, Vietnamese characters will be silently corrupted.
6. Run the full Cypress + Playwright test suite (803+ tests) against BOTH databases before declaring Oracle support complete.

**Warning signs:**
- LINQ queries work but raw SQL fails with `ORA-00904: invalid identifier` (column name case sensitivity in Oracle)
- GUID-based foreign keys return no results (byte-order mismatch between SQL Server and Oracle GUID representation)
- Vietnamese patient names appear corrupted in Oracle but fine in SQL Server
- EF Core migration generates `NVARCHAR2(2000)` for fields that need `NCLOB` (medical notes, descriptions)
- `PdfSignatureService.cs` uses `C:\Windows\Fonts\times.ttf` -- will fail on Linux/Oracle deployment

**Phase to address:**
Phase 4 or later (Oracle Support). This is explicitly low priority per the contract analysis. Consider negotiating with the hospital to defer if they currently run SQL Server.

---

### Pitfall 4: BHXH Gateway Rate Limits and Session Management

**What goes wrong:**
The BHXH portal has undocumented rate limits and session timeout behaviors. Hospitals that submit claims in bulk (end of month) get their sessions terminated or requests throttled. The portal uses SOAP/WCF web services with session-based authentication that expires after inactivity. Batch submissions of 500+ claims at month-end trigger rate limiting.

**Why it happens:**
The BHXH portal was designed for interactive use (one claim at a time). HIS systems that automate bulk submission overwhelm it. The portal's test environment has different limits than production. Developers test with 5-10 claims and miss the issue that manifests with 500+ claims.

**How to avoid:**
1. Implement a **claim queue** with configurable batch sizes (default: 10 claims per batch, 5-second delay between batches).
2. Build session refresh logic -- re-authenticate after every 50 claims or after 10 minutes of inactivity, whichever comes first.
3. Implement exponential backoff with jitter for HTTP 429 or connection timeout responses.
4. Store submission state per claim (`Pending`, `Submitted`, `Accepted`, `Rejected`, `RetryScheduled`). Support resume-from-failure for batch submissions.
5. Schedule bulk submissions during off-peak hours (2-5 AM) via a background job (Hangfire or hosted service).
6. The BHXH test environment (giam dinh thu nghiem) may not enforce rate limits -- always test with production-like volumes in a staging environment.

**Warning signs:**
- Bulk submission succeeds for first 50 claims then starts failing with timeout errors
- BHXH session token expires mid-batch, causing all subsequent claims to return authentication errors
- End-of-month submission consistently fails while daily submissions work fine
- Retry logic causes duplicate claim submissions (no idempotency key)

**Phase to address:**
Phase 1 (BHXH Gateway Integration). Build the queue/retry mechanism from the start, not as an afterthought.

---

### Pitfall 5: EMR Digital Signature Legal Validity

**What goes wrong:**
PDF documents are digitally signed but do not meet the legal requirements for EMR signatures under Vietnamese law (Luat Giao dich dien tu 2023, Nghi dinh 30/2024). The hospital passes a software audit but fails the legal audit because: (a) signatures lack timestamp from a trusted TSA (Time Stamp Authority), (b) signature does not include the signer's role/title, (c) PDF signature field is not positioned per TT 32/2023 template layout, (d) CRL/OCSP revocation check is skipped.

**Why it happens:**
The current `PdfSignatureService.SignPdfWithUSBTokenAsync` passes `null` for CRL, OCSP, and TSA parameters:
```csharp
signer.SignDetached(externalSignature, chain, null, null, null, 0, PdfSigner.CryptoStandard.CMS);
```
This creates a valid PKCS#7 signature but without Long-Term Validation (LTV) data. A signature without TSA timestamp cannot prove when it was signed, which is legally required for medical records.

**How to avoid:**
1. Integrate with a TSA service. Vietnamese CAs provide TSA endpoints:
   - VNPT-CA: `http://tsa.vnpt-ca.vn`
   - Viettel-CA: `http://tsa.viettel-ca.vn`
   - BKAV-CA: `http://tsa.bkav-ca.vn`
2. Enable OCSP checking for certificate revocation verification.
3. Add LTV (Long-Term Validation) information to signed PDFs using iText7's `PdfSigner` with proper TSA client.
4. Include signer metadata (doctor name, title "Bac si", license number, department) in the signature's signed attributes.
5. Position the visible signature field according to TT 32/2023 template specifications (typically bottom-right of the last page).
6. Store the signed PDF with a hash in the database for tamper detection.

**Warning signs:**
- Adobe Reader shows "Signature validity is UNKNOWN" instead of "Valid" on signed PDFs
- Signed PDFs show signature date as the viewer's current time (no TSA timestamp embedded)
- Hospital legal department flags EMR PDFs as not meeting electronic transaction law requirements
- Certificate revocation is not checked -- a revoked certificate's signature is still accepted

**Phase to address:**
Phase 2 (Digital Signature Expansion). Must be resolved before any signed EMR PDF is considered legally binding.

---

### Pitfall 6: SMS Gateway Brand Name Registration Lead Time

**What goes wrong:**
SMS notification implementation is coded and tested, but the SMS gateway cannot send messages because brand name registration with Vietnamese carriers takes 5-15 business days and requires business documents. Hospital goes live without SMS capability, undermining the Level 6 requirement for patient result notification.

**Why it happens:**
Vietnamese carriers (Viettel, VNPT/VinaPhone, Mobifone) require:
1. Business registration certificate of the SMS sending entity
2. Brand name approval (the sender name patients see, e.g., "BVYDHUE")
3. Content template pre-approval for each message type
4. Sending time restrictions (typically 8:00-19:30 on weekdays per carrier)
5. Separate contracts per carrier for nationwide coverage

Developers implement the API integration in days but the administrative registration takes weeks. The lead time is often not factored into the project timeline.

**How to avoid:**
1. Start brand name registration immediately (within first week of project) -- it is non-technical work that runs in parallel with development.
2. Register with a SMS aggregator (SpeedSMS, eSMS, VNPT SMS Gateway) rather than directly with each carrier -- they handle multi-carrier routing.
3. Build the SMS service with a provider abstraction (`ISmsProvider`) so the gateway can be swapped without code changes.
4. Implement fallback: if SMS fails, send via existing Email notification (already implemented in `EmailService.cs`).
5. Respect carrier sending time restrictions in the code -- queue messages outside sending hours for delivery at the next allowed window.
6. Budget for SMS costs in the contract (typically 350-500 VND per SMS).

**Warning signs:**
- Brand name application rejected due to naming conflicts or document issues
- SMS works in test (using personal phone numbers) but fails in production (brand name not approved for that carrier)
- Patients on carrier X receive SMS but patients on carrier Y do not (incomplete multi-carrier registration)
- SMS sent outside allowed hours are silently dropped

**Phase to address:**
Phase 1 (parallel administrative task). Start registration at project kickoff. Technical implementation can be Phase 2 or 3.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Mock BHXH responses (current state in `InsuranceXmlService`) | Unblocks UI development and testing | Technical debt accumulates; mock behavior diverges from real gateway; developers build UI assumptions around mock data | Only during Phase 0 (current). Must replace before any insurance testing. |
| Windows Certificate Store for signing (current `DigitalSignatureService`) | Works immediately on dev machines | Cannot do programmatic PIN entry; blocks batch signing; breaks on Linux/Docker deployment | Never in production. Replace with Pkcs11Interop in Phase 2. |
| Raw SQL in BloodBank/LIS services (131 calls) | 10x faster development for complex queries | Locks the project to SQL Server; every Oracle compatibility change requires touching 131 queries | Acceptable if Oracle support is deferred. Unacceptable if Oracle is required. |
| Hardcoded Windows font paths in `PdfSignatureService` | Works on Windows dev/staging | Fails on Linux deployment (required by TT for Enterprise Linux); fails in Docker | Only during development. Fix in Phase 2 when expanding PDF generation. |
| Single `HISDbContext` for all entities | Simple DI; all services share one context | 400+ entity DbSet registration impacts startup time; Oracle support requires provider-specific configuration | Acceptable. Split only if performance profiling shows > 5s startup. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| BHXH Portal (cong giam dinh) | Using the test endpoint URL in production config | Maintain separate `appsettings.Production.json` with production BHXH URL. Test and production endpoints have different base URLs and different authentication credentials. |
| BHXH Portal | Submitting claims with `MA_LK` generated as `Guid.NewGuid()` | `MA_LK` must follow BHXH format: facility code + year + sequential number (e.g., `01001_2026_000001`). Random GUIDs are rejected. |
| BHXH Portal | Assuming ICD-10 codes match BHXH's code list | BHXH uses a subset of ICD-10 with Vietnamese-specific codes. The hospital's ICD master data must be cross-referenced with BHXH's published code list (danh muc ICD cua BHXH). |
| USB Token (PKCS#11) | Opening multiple PKCS#11 sessions simultaneously | Most Vietnamese USB Tokens support only 1 concurrent session. Queue all signing requests through a single-threaded dispatcher per physical token. |
| USB Token (PKCS#11) | Leaving PKCS#11 sessions open after signing | Call `Session.Logout()` and `Session.CloseSession()` immediately after each signing operation. Leaked sessions lock the token until physically re-inserted. |
| Oracle EF Core | Relying on EF Core migrations to create Oracle schema | EF Core Oracle migrations produce suboptimal DDL. Generate migrations, then review and hand-tune the Oracle SQL before applying. |
| Oracle EF Core | Assuming `string` maps to `NVARCHAR2(MAX)` in Oracle | Oracle has no `NVARCHAR2(MAX)`. Strings > 2000 chars must explicitly use `NCLOB`. Medical notes, descriptions, and XML content fields will truncate silently. |
| SMS Gateway | Sending OTP via SMS without rate limiting | Vietnamese carriers may block numbers that receive > 5 SMS in 5 minutes. Implement per-phone-number cooldown (minimum 30 seconds between OTP sends). |
| DQGVN (National Health Exchange) | Implementing full HL7 CDA without checking which CDA templates DQGVN actually accepts | DQGVN has a specific whitelist of CDA document types. Start with the mandatory templates only (discharge summary, referral letter). |
| Vietnamese SMS | Using Unicode SMS (tieng Viet co dau) without accounting for character limits | Unicode SMS limits to 70 chars per segment (vs 160 for GSM). Vietnamese messages with diacritics cost 2-3x more. Consider transliteration for non-critical messages. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| BHXH XML generation loading entire medical record graph | Claim export for 1000 patients takes > 10 minutes; OOM on large batches | Use projection queries (`Select` only XML-required fields); paginate batch exports; avoid `Include` chains > 2 levels deep | > 200 claims per export batch |
| PDF generation for all 38 EMR forms at discharge | iText7 PDF generation is synchronous and memory-heavy; discharge workflow blocks for 30+ seconds | Generate PDFs in a background queue (Hangfire); return immediately with "generating" status; notify via SignalR when complete | > 10 simultaneous discharges |
| USB Token signing for 38 forms sequentially | Each signing requires PIN entry + crypto operation (~2-3 seconds each); total: 76-114 seconds per discharge | Prompt PIN once, cache the PKCS#11 session for 5 minutes, sign all forms in a single session; UI shows progress bar | > 5 EMR forms per signing session |
| Oracle GUID byte-order conversion on every query | Every `WHERE Id = @id` query requires GUID byte-swapping; noticeable on tables with > 100K rows | Configure Oracle EF Core provider's GUID mapping at the provider level, not per-query; create function-based indexes on GUID columns | > 50K rows per table |
| BHXH real-time insurance verification on every registration | Each verification call takes 2-5 seconds; blocks receptionist workflow during peak hours (7-9 AM) | Cache verification results for 24 hours per insurance card number; only re-verify if card info changed; show cached status with "last verified" timestamp | > 50 registrations per hour |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing PKCS#11 PIN in `appsettings.json` or database | PIN compromise = full access to the doctor's legal signing authority; all EMR documents signed under stolen identity | Never persist PIN. Accept PIN from frontend per signing session. Clear from memory after `Session.Logout()`. Use `SecureString` or pin memory with `GCHandle.Alloc`. |
| BHXH gateway credentials in source code or unencrypted config | Unauthorized claim submission; insurance fraud liability for the hospital | Use ASP.NET Core Secret Manager or Azure Key Vault for BHXH credentials. Rotate credentials quarterly. |
| Signed PDF stored without integrity verification | Tampered PDF could pass as legitimately signed; legal liability | Store SHA-256 hash of the signed PDF alongside the file. Verify hash on every retrieval. Alert on mismatch. |
| SMS OTP sent without expiry enforcement | Intercepted OTP usable indefinitely for 2FA bypass | OTP already has 5-minute expiry in `AuthService.cs`. Verify this is enforced server-side (not just UI countdown). Add used-OTP check to prevent replay. |
| BHXH insurance number exposed in API responses without masking | Patient privacy violation under Vietnam cybersecurity law (Luat An ninh mang 2018) | Mask insurance number in API responses (show only last 4 digits). Full number only in dedicated insurance module endpoints with role-based access. |
| Face authentication biometric data stored as raw images | Biometric data breach; faces cannot be "reset" like passwords | Store only feature vectors (embeddings), not raw images. Encrypt at rest. Comply with Vietnam Personal Data Protection Decree (NĐ 13/2023). |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring USB Token insertion for every form signature | Doctors sign 38 forms at discharge; removing/inserting token repeatedly is slow and damages USB port | "Sign session" model: insert token once, enter PIN once, sign all pending forms, then remove. Show a signature queue with checkboxes. |
| BHXH claim rejection shown as a generic error | Billing staff cannot determine why insurance claim was rejected; calls IT helpdesk | Parse BHXH error codes into Vietnamese explanations with specific correction instructions (e.g., "Ma benh chinh A09 khong nam trong danh muc BHXH. Vui long doi sang A09.0"). |
| Blocking UI during BHXH real-time verification | Receptionist waits 2-5 seconds per patient during morning rush; 200 patients = 10+ minutes wasted | Show "Dang xac minh BHYT..." spinner; allow receptionist to continue filling other fields; update insurance status when verification completes asynchronously. |
| Sending SMS in Vietnamese without diacritics | Message reads "Ket qua xet nghiem da co" instead of "Ket qua xet nghiem da co" -- less professional but more reliable | Offer hospital admin a choice: full Vietnamese (diacritics, costs 2-3x) or simplified (no diacritics, cheaper). Default to full Vietnamese for critical results. |
| Oracle migration forcing UI changes for case-sensitive search | Oracle default is case-sensitive; patient name search "nguyen" won't find "Nguyen" | Always use `UPPER()` or `LOWER()` in Oracle queries for name searches. Or configure Oracle session with `NLS_COMP=LINGUISTIC` and `NLS_SORT=BINARY_CI`. |

## "Looks Done But Isn't" Checklist

- [ ] **BHXH XML Export:** Often missing XML table 4 (CLS results) and table 5 (DVKT chi tiet) -- verify all 5 tables are generated and linked by MA_LK
- [ ] **BHXH XML Export:** Often missing `TienBhyt` calculation per item (uses hospital price, not BHXH reimbursement price) -- verify against BHXH price list
- [ ] **Digital Signature (PDF):** Often missing TSA timestamp -- open signed PDF in Adobe Reader, check signature properties for "embedded timestamp"
- [ ] **Digital Signature (PDF):** Often missing CRL/OCSP data -- signature shows "revocation status unknown" in Adobe
- [ ] **Digital Signature (PDF):** Often missing signer role metadata -- PDF signature should show "BS. Nguyen Van A - Khoa Noi" not just the certificate CN
- [ ] **Oracle Support:** Often missing Vietnamese collation -- run `SELECT * FROM Patients WHERE FullName LIKE N'%nguyen%'` and verify it finds "Nguyen Van A"
- [ ] **Oracle Support:** Often missing GUID round-trip test -- insert a GUID from .NET, read it back, compare byte-for-byte
- [ ] **Oracle Support:** Often missing NCLOB mapping -- check that medical notes fields can store > 2000 Vietnamese characters
- [ ] **SMS Gateway:** Often missing delivery status callback -- verify hospital can see which SMS were actually delivered vs failed
- [ ] **SMS Gateway:** Often missing sending time restriction -- try sending at 20:00 and verify it queues for next morning
- [ ] **2FA (existing):** Often missing brute-force protection on OTP endpoint -- verify max 3 attempts per OTP, then lockout (already implemented, but verify in integration test)
- [ ] **BHXH Connection:** Often missing the `CheckBHXHConnectionAsync` health check -- currently returns `true` unconditionally in `ReceptionCompleteService.cs`

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| BHXH XML schema mismatch (claims rejected) | MEDIUM | 1. Get current XSD from BHXH. 2. Diff against current DTOs. 3. Update DTOs and mapping. 4. Re-submit rejected claims. 5. Add XSD validation to prevent recurrence. |
| USB Token works for one CA but not another | LOW | 1. Get PKCS#11 DLL from the failing CA's vendor. 2. Add DLL path to config. 3. Test sign+verify cycle. 4. Update user's token config in UI. |
| Oracle GUID byte-order mismatch | HIGH | 1. All existing data has wrong GUID byte order. 2. Write migration script to swap bytes on all GUID columns. 3. Update EF Core GUID mapping. 4. Re-run full test suite. Extremely high risk of data corruption -- test extensively on a copy first. |
| SMS brand name rejected | LOW | 1. Resubmit with different brand name. 2. While waiting, route through existing email notification. 3. Consider using SMS aggregator who handles registration. |
| Signed PDFs lack legal validity (no TSA) | MEDIUM | 1. Integrate TSA client. 2. Re-sign all previously signed PDFs (if still within retention period). 3. Or: add a "re-certification" batch job that adds LTV data to existing signatures. |
| Raw SQL breaks on Oracle (131 queries) | HIGH | 1. Catalog all raw SQL calls (3 files identified). 2. For each: either rewrite as LINQ or create Oracle-specific SQL variant. 3. Use `ISqlDialect` pattern. 4. Test each query individually. Estimated: 5-10 days for 131 queries. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| BHXH XML schema drift | Phase 1: BHXH Gateway | XSD validation passes for 100 sample claims; parallel run with manual submission for 2 weeks shows 0 discrepancies |
| BHXH rate limiting | Phase 1: BHXH Gateway | Batch submission of 500+ claims at month-end completes successfully; retry mechanism handles 3 consecutive failures gracefully |
| USB Token provider fragmentation | Phase 2: Digital Signatures | Signing works with 3+ CA providers (VNPT-CA, Viettel-CA, and at least one more); PIN entry is prompted via frontend, not Windows dialog |
| EMR signature legal validity | Phase 2: Digital Signatures | Signed PDF opened in Adobe Reader shows "Signature is VALID" with embedded timestamp and signer identity |
| SMS brand name lead time | Phase 1 (admin) / Phase 3 (code) | Brand name approved by at least 2 carriers before SMS code is deployed to production |
| Oracle GUID byte order | Phase 4: Oracle Support | GUID inserted from .NET, retrieved from Oracle, and compared byte-for-byte matches; all 803+ tests pass against Oracle |
| Oracle NVARCHAR2 truncation | Phase 4: Oracle Support | Insert 5000-character Vietnamese medical note; retrieve and verify no truncation |
| Oracle raw SQL incompatibility | Phase 4: Oracle Support | All 131 raw SQL queries in BloodBank/LIS/HealthCheck execute successfully on Oracle with correct results |
| Windows font path on Linux | Phase 2: PDF Generation | PDF generated on Linux deployment contains correct Vietnamese characters using embedded fonts |
| BHXH credential security | Phase 1: BHXH Gateway | Credentials stored in Secret Manager or Key Vault; not present in any config file in source control |

## Sources

- [QD 4210/QD-BYT - Official specification](https://thuvienphapluat.vn/van-ban/Bao-hiem/Quyet-dinh-4210-QD-BYT-2017-du-lieu-dau-ra-trong-thanh-toan-chi-phi-kham-chua-benh-y-te-361955.aspx) - HIGH confidence (official government document)
- [Pkcs11Interop GitHub - .NET PKCS#11 wrapper](https://pkcs11interop.net/) - HIGH confidence (official library documentation)
- [Pkcs11Interop Issue #147 - PIN pad issues](https://github.com/Pkcs11Interop/Pkcs11Interop/issues/147) - MEDIUM confidence (GitHub issue)
- [Pkcs11Interop Issue #169 - CKU_CONTEXT_SPECIFIC login](https://github.com/Pkcs11Interop/Pkcs11Interop/issues/169) - MEDIUM confidence (GitHub issue)
- [EF Core Multiple Providers - Microsoft Docs](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/providers) - HIGH confidence (official documentation)
- [Oracle EF Core Performance - Oracle Developer Blog](https://medium.com/oracledevs/oracle-entity-framework-core-performance-considerations-7c601542e7dc) - MEDIUM confidence (official vendor blog)
- [ABP.IO - Switch to EF Core Oracle Provider](https://abp.io/docs/latest/framework/data/entity-framework-core/oracle-official) - MEDIUM confidence (framework documentation)
- [Vietnam Digital Health Technology Adoption Assessment](https://pmc.ncbi.nlm.nih.gov/articles/PMC11843058/) - HIGH confidence (peer-reviewed journal)
- [Digital Health Policy Vietnam Scoping Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC8867296/) - HIGH confidence (peer-reviewed journal)
- [SpeedSMS API - Vietnamese SMS Gateway](https://speedsms.vn/sms-api/) - MEDIUM confidence (vendor documentation)
- [Vietnam SMS Features and Restrictions - Vonage](https://api.support.vonage.com/hc/en-us/articles/204017273-Vietnam-SMS-Features-and-Restrictions) - MEDIUM confidence (vendor documentation)
- [Vietnam first digital signature without USB token](https://english.mst.gov.vn/vietnam-announces-first-digital-signature-without-usb-token-197140679.htm) - HIGH confidence (government source)
- Codebase analysis: `InsuranceXmlService.cs`, `DigitalSignatureService.cs`, `PdfSignatureService.cs`, `HISDbContext.cs`, `DependencyInjection.cs`, `ReceptionCompleteService.cs` - HIGH confidence (direct code inspection)

---
*Pitfalls research for: Vietnamese HIS Level 6 Upgrade*
*Researched: 2026-02-28*
