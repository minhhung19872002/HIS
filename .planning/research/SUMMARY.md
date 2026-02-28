# Project Research Summary

**Project:** HIS - Hospital Information System Level 6 Upgrade
**Domain:** Vietnamese Healthcare IT (HIS/EMR) -- Government-regulated compliance upgrade
**Researched:** 2026-02-28
**Confidence:** MEDIUM

## Executive Summary

The HIS Level 6 upgrade for Benh vien Truong Dai hoc Y - Duoc Hue is primarily an **external integration challenge**, not a greenfield build. The existing system already has 803+ passing E2E tests, 350+ backend methods, 38 EMR forms, FHIR R4, audit logging, 2FA, queue display, and 34 frontend routes. Research confirms that the remaining work centers on three critical gaps: (1) programmatic USB Token digital signatures via PKCS#11, (2) real BHXH insurance gateway integration with XML 4210 compliance, and (3) Oracle database dual-provider support. Everything else is either already done or is a competitive differentiator that can follow certification.

The recommended approach is to tackle the three certification-blocking features first (digital signatures, BHXH gateway, XML export), then layer on security hardening and CCCD validation to complete Level 6 requirements. Differentiators like SMS notifications, AI-assisted diagnosis, biometric authentication, and SNOMED CT mapping should come after certification is secured. The key risk is **BHXH gateway schema drift** -- the insurance portal's XML format has been amended multiple times, and the hospital must provide current specifications before implementation can begin. A secondary risk is **USB Token vendor fragmentation** -- different Vietnamese CA providers ship incompatible PKCS#11 drivers that require per-vendor configuration and testing.

## Key Findings

### Recommended Stack

The existing stack (React 19, Ant Design v6, ASP.NET Core 9, EF Core 9, SQL Server, Redis, Orthanc PACS, SignalR, iText7) is solid and requires no replacement. Research identified 7 new NuGet packages, 1 new npm package, and 1 new Docker container needed for the remaining features. All recommended additions have been verified for version compatibility with .NET 9 and EF Core 9.

**Core technologies to add:**
- **Pkcs11Interop 5.3.0**: PKCS#11 managed wrapper -- enables programmatic USB Token PIN entry for digital signatures, replacing the current Windows PIN dialog that blocks headless/server-side signing
- **Oracle.EntityFrameworkCore 9.23.90**: Official Oracle EF Core provider -- enables dual SQL Server/Oracle deployment via configuration switch, required by contract
- **Hl7.Fhir.R4 6.0.2**: Firely .NET FHIR SDK -- enables SNOMED CT terminology mapping via Snowstorm Lite and HL7 CDA document generation for DQGVN health data exchange
- **PCSC 7.0.1**: PC/SC smart card reader wrapper -- enables CCCD chip card reading at reception for national ID validation
- **Fido2 4.0.0**: WebAuthn/FIDO2 server library -- enables biometric authentication via device hardware without storing biometric data on server
- **eSMS.vn REST API**: Vietnamese SMS gateway -- domestic carrier routing for OTP, result notifications, and appointment reminders at competitive pricing
- **Snowstorm Lite (Docker)**: Lightweight SNOMED CT terminology server -- FHIR R4 API with ~1GB RAM footprint for clinical terminology mapping

### Expected Features

**Must have (table stakes for Level 6 certification):**
- Digital signature on ALL EMR forms via Pkcs11Interop (currently only Radiology via Windows popup) -- certification fails without this
- BHXH Gateway real integration replacing current mock stubs -- mandatory for all BHYT-billing hospitals
- XML 4210 complete export per QD 130/4750/3176 -- mandatory cost reporting format since Jan 2025
- CCCD/National ID validation linked to patient records -- required by TT 13/2025
- Security hardening to Level 2 per Decree 85/2016 -- CV 365 non-functional requirement

**Should have (competitive differentiators):**
- SMS gateway notifications (SpeedSMS/eSMS) -- reduces no-shows, matches FPT eHospital and VNPT HIS offerings
- Online appointment booking polish -- backend already exists, needs public-facing UI enhancement
- AI/CDSS rule-based expansion -- beyond existing drug interaction checking; FPT touts AI as key differentiator
- Medical record archive management -- natural extension of existing EMR and PDF generation
- HL7 CDA document architecture -- for inter-hospital referral document exchange

**Defer (v2+):**
- Oracle DB support -- only when hospital mandates Oracle deployment (high effort, 131 raw SQL queries to abstract)
- Biometric authentication -- wait for VNeID API maturation; WebAuthn/FIDO2 when ready
- Patient mobile app -- separate project scope; responsive web PWA is acceptable alternative
- Speech-to-text for clinical notes -- nice-to-have, not certification-related
- Full SNOMED CT integration -- Vietnam has no national SNOMED license yet

### Architecture Approach

The architecture extends the existing Clean Architecture (HIS.Core -> HIS.Application -> HIS.Infrastructure -> HIS.API) with a new **Integration Gateway Layer** containing external service clients. Each external integration (BHXH, SMS, DQGVN, AI, Face, Smart Card, PKCS#11) is implemented as an Infrastructure service injected into existing workflow services via composition, not as parallel service hierarchies. All external services are behind feature flags in `appsettings.json` so the system degrades gracefully when a service is unavailable.

**Major components:**
1. **BHXH Gateway Client** (`IBhxhGatewayService`) -- SOAP/XML + REST client for insurance verification and claim submission, injected into existing `ReceptionCompleteService` and `InsuranceXmlService`, with Redis caching (24h TTL)
2. **PKCS#11 Signature Service** (`IPkcs11SignatureService`) -- wraps Pkcs11Interop for programmatic USB Token PIN entry, replaces Windows Certificate Store approach in `DigitalSignatureService`, integrates with iText7 `PdfSignatureService` for signed PDF generation with TSA timestamps
3. **Oracle DB Provider** -- configuration-time switch in `DependencyInjection.cs` between `UseSqlServer()` and `UseOracle()`, with `ISqlDialect` helper for the ~131 raw SQL queries that use SQL Server-specific syntax
4. **SMS Gateway Client** (`ISmsGatewayService`) -- REST client for Vietnamese SMS providers, added alongside existing `EmailService` as additional notification channel
5. **DQGVN Health Exchange Client** (`IDqgvnExchangeService`) -- composes existing `FhirService` resource mappers with digital signature service for signed FHIR Bundle submission to the national health portal

### Critical Pitfalls

1. **BHXH Gateway XML schema drift and silent rejection** -- the BHXH portal's XML format has been amended multiple times (QD 4210 -> 4750 -> CV 7464 -> QD 130). Build an XSD validation layer before submission; run a 2-week parallel submission alongside manual processes before cutover. Obtain the **current** specification directly from the provincial BHXH office.

2. **USB Token PKCS#11 provider fragmentation** -- each Vietnamese CA (VNPT-CA, Viettel-CA, BKAV-CA, FPT-CA) ships a different PKCS#11 DLL with different session management and PIN callback behaviors. Build a configuration table mapping CA providers to DLL paths; test with at least 3 providers; use `SemaphoreSlim(1,1)` per token slot since PKCS#11 operations are not thread-safe.

3. **Oracle dual-database support breaks existing raw SQL** -- 131 raw SQL calls across BloodBankCompleteService, LISCompleteService, and HealthCheckService use SQL Server-specific syntax (GETDATE, DATEADD, ISNULL, FOR XML PATH). Create an `ISqlDialect` abstraction rather than if/else branching. Oracle GUID byte-order reversal and NVARCHAR2(2000) max length are additional landmines.

4. **EMR digital signature legal validity** -- current `PdfSignatureService` passes `null` for CRL, OCSP, and TSA parameters, creating signatures without timestamps or revocation checks. Integrate with Vietnamese CA TSA endpoints (VNPT-CA, Viettel-CA) for legally valid Long-Term Validation (LTV) signatures.

5. **SMS brand name registration lead time** -- Vietnamese carrier brand name registration takes 5-15 business days with business document requirements. Start the administrative registration process immediately at project kickoff, independent of technical implementation.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: BHXH Gateway + XML 4210 Export
**Rationale:** Highest operational value -- every patient registration currently uses mock insurance data. BHXH integration affects hospital revenue collection directly. Must be first because DQGVN submission (Phase 4) depends on real insurance data.
**Delivers:** Real insurance card verification, insurance claim XML export (5 tables), claim submission queue with retry, Redis caching for BHXH responses.
**Addresses:** TS-2 (BHXH Gateway), TS-3 (XML 4210 export)
**Avoids:** BHXH schema drift pitfall (via XSD validation layer and parallel run milestone)
**Est. effort:** 15-20 days

### Phase 2: Digital Signature Expansion (Pkcs11Interop + TSA)
**Rationale:** Level 6 = "paperless with digital signatures." Without programmatic USB Token signing, the system cannot sign EMR forms in clinical workflow. Comes after BHXH because BHXH XML may also need digital signatures (D-15).
**Delivers:** Programmatic PIN entry via PKCS#11, TSA timestamped signatures, LTV-enabled PDFs, signing all 38 EMR forms, batch signing session model.
**Uses:** Pkcs11Interop 5.3.0, Pkcs11Interop.X509Store 0.5.0, existing iText7 8.0.2
**Implements:** IPkcs11SignatureService component, expanded PdfSignatureService with TSA/OCSP/CRL
**Avoids:** USB Token vendor fragmentation (via multi-provider config table and testing with 3+ CAs)
**Est. effort:** 7-10 days

### Phase 3: Security Hardening + CCCD Validation
**Rationale:** Required for certification documentation. Lower technical complexity but needed for compliance paperwork.
**Delivers:** Access control matrix, data encryption at rest documentation, CCCD number validation on registration, security incident response procedures.
**Addresses:** TS-9 (CCCD validation), TS-10 (Security Level 2)
**Est. effort:** 5-7 days

### Phase 4: SMS Gateway + Online Booking Polish
**Rationale:** Competitive differentiators that are straightforward to implement. SMS registration should have started in Phase 1 (administrative), so the brand name is ready by now.
**Delivers:** SMS OTP alongside email, result notifications via SMS, appointment confirmation SMS, public booking UI enhancement.
**Uses:** eSMS.vn REST API (no new NuGet packages needed), existing AppointmentBookingService
**Addresses:** D-1 (SMS), D-2 (Online booking)
**Est. effort:** 5-8 days

### Phase 5: Oracle DB Dual-Provider Support
**Rationale:** Contractual requirement but low operational priority. Can be done in parallel with Phase 4 since it touches different files. High effort due to 131 raw SQL queries.
**Delivers:** Oracle deployment target alongside SQL Server, ISqlDialect abstraction, Oracle-specific EF Core migrations.
**Uses:** Oracle.EntityFrameworkCore 9.23.90
**Implements:** Dual-provider configuration in DependencyInjection.cs, ISqlDialect for raw SQL
**Avoids:** Oracle GUID byte-order and NCLOB truncation pitfalls (via explicit type mapping and full test suite verification)
**Est. effort:** 10-15 days

### Phase 6: DQGVN + SNOMED CT + HL7 CDA (Interoperability)
**Rationale:** Requires real patient data (Phase 1) and signed documents (Phase 2). Lower priority than direct patient care workflows.
**Delivers:** FHIR Bundle submission to national health portal, SNOMED CT code mapping on ClinicalTerms, CDA document generation for referrals.
**Uses:** Hl7.Fhir.R4 6.0.2, Snowstorm Lite Docker container
**Implements:** IDqgvnExchangeService, ICdaGenerationService, SNOMED CT code mapping
**Est. effort:** 8-12 days

### Phase 7: AI/CDSS + Biometric Auth + Smart Card (Enhancements)
**Rationale:** Differentiators, not certification requirements. Depend on external services and hardware. Should only proceed after core certification is secured.
**Delivers:** AI diagnosis suggestions, WebAuthn/FIDO2 biometric login, CCCD chip card reading.
**Uses:** Microsoft.ML.OnnxRuntime 1.24.2, Fido2 4.0.0, PCSC 7.0.1
**Est. effort:** 15-20 days

### Phase Ordering Rationale

- **Phases 1-2 are the critical path** -- BHXH and digital signatures are the two biggest competitive gaps vs FPT eHospital, VNPT HIS, and NanoSoft. Without them, the system literally cannot be certified Level 6.
- **Phase 3 follows because** security hardening produces documentation needed for the certification audit, and CCCD validation is a quick win with TT 13/2025 compliance value.
- **Phases 4-5 can run in parallel** -- SMS touches notification services while Oracle touches database infrastructure. No dependency between them.
- **Phase 6 depends on Phases 1+2** -- DQGVN submission needs real insurance data and signed documents.
- **Phase 7 is fully independent** -- all enhancement features can be deferred without impacting certification.
- **SMS brand name registration (administrative)** must start at project kickoff, running in parallel with Phase 1 technical work.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** BHXH gateway API specifications are not publicly documented. The hospital must provide current credentials and technical documentation from the provincial BHXH office before implementation can begin.
- **Phase 2:** Vietnamese CA TSA endpoint URLs need verification with each CA provider. PKCS#11 DLL paths vary by token model and installation version.
- **Phase 5:** Oracle migration requires auditing all 131 raw SQL queries individually. Oracle GUID byte-order behavior needs hands-on testing before committing to an approach.
- **Phase 6:** DQGVN/MOH API specifications are not publicly documented. The hospital must obtain integration credentials from Bo Y Te.

Phases with standard patterns (skip research-phase):
- **Phase 3:** Security hardening follows well-documented NIST/ISO patterns. CCCD validation is straightforward field validation.
- **Phase 4:** SMS gateway APIs (eSMS.vn, SpeedSMS) have public documentation and C# samples. Online booking is standard CRUD.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All NuGet/npm packages verified on registries with .NET 9 compatibility confirmed |
| Features | MEDIUM | Table stakes verified against TT 54/TT 13/CV 365; CV 365 detailed specs not fully extractable from PDF |
| Architecture | HIGH | Based on direct codebase analysis of existing Clean Architecture patterns and 17 sessions of development history |
| Pitfalls | MEDIUM | Domain-specific pitfalls verified against codebase; Vietnamese regulatory details from official documents + secondary sources |

**Overall confidence:** MEDIUM

### Gaps to Address

- **BHXH gateway API specification**: Must be obtained from the hospital's provincial BHXH office before Phase 1 implementation. Cannot rely on publicly available versions of QD 4210 -- they may be outdated.
- **Vietnamese CA PKCS#11 DLL paths**: Vary by token model and installation version. The hospital must provide test tokens from each CA vendor they use for Phase 2 testing.
- **DQGVN/MOH API endpoints**: Not publicly documented. Hospital must obtain integration credentials and technical documentation from Bo Y Te for Phase 6.
- **CCCD chip APDU command specifications**: Distributed by Ministry of Public Security, not publicly documented. Hospital IT should have the CCCD reader SDK from their equipment vendor.
- **Oracle deployment decision**: Unclear if the hospital currently mandates Oracle or accepts SQL Server. This determines whether Phase 5 is critical-path or deferrable.
- **CV 365 detailed technical specifications**: PDF document not fully extractable. Summaries only from secondary sources. Need hospital to provide a clean copy for detailed feature verification.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of `C:/Source/HIS/` -- all 17 sessions of development history, 803+ E2E tests, 350+ backend methods
- [TT 54/2017/TT-BYT](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Thong-tu-54-2017-TT-BYT-Bo-tieu-chi-ung-dung-cong-nghe-thong-tin-tai-cac-co-so-kham-chua-benh-373292.aspx) -- HIS Level criteria
- [TT 13/2025/TT-BYT](https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Thong-tu-13-2025-TT-BYT-huong-dan-trien-khai-ho-so-benh-an-dien-tu-660113.aspx) -- EMR implementation guide
- [QD 3176/QD-BYT 2024](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Quyet-dinh-3176-QD-BYT-2024-sua-doi-Quyet-dinh-4750-QD-BYT-130-QD-BYT-du-lieu-chi-phi-kham-chua-benh-629410.aspx) -- XML output standards
- NuGet package registry -- all 7 packages version-verified (Pkcs11Interop 5.3.0, Oracle.EntityFrameworkCore 9.23.90, Hl7.Fhir.R4 6.0.2, PCSC 7.0.1, Fido2 4.0.0, Microsoft.ML.OnnxRuntime 1.24.2, System.ServiceModel.Http 6.2.0)

### Secondary (MEDIUM confidence)
- [NanoSoft -- HIS Level requirements](https://nanosoft.vn/his-can-dat-muc-nao-de-dap-ung-trien-khai-emr.htm) -- Level 6 definition and competitor analysis
- [FPT eHospital 2.0](https://fpt-is.com/ehospital-2-0/) -- competitor feature comparison
- [eSMS.vn API Documentation](https://developers.esms.vn) -- SMS gateway integration details
- [iText7 PKCS#11 Signing KB](https://kb.itextpdf.com/home/it7kb/examples/digital-signing-with-itext-7/part-iii-pkcs-11) -- PDF signing with USB tokens
- [Oracle EF Core Documentation](https://docs.oracle.com/en/database/oracle/oracle-database/26/odpnt/ODPEFCore.html) -- dual provider support
- [Pkcs11Interop documentation](https://pkcs11interop.net/) -- PKCS#11 .NET wrapper

### Tertiary (LOW confidence)
- BHXH gateway endpoint URLs (`egw.baohiemxahoi.gov.vn`) -- not verified with production credentials
- Vietnamese CA PKCS#11 DLL filenames -- vary by installation version
- DQGVN/MOH API specifications -- not publicly documented
- CCCD chip APDU command specifications -- distributed by Ministry of Public Security, not public
- Vietnam SNOMED CT licensing status -- no evidence of national license

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
