# Feature Research: HIS Level 6 Upgrade

**Domain:** Vietnamese Hospital Information System -- Level 6 Certification (TT 54/2017, TT 32/2023, TT 13/2025)
**Researched:** 2026-02-28
**Confidence:** MEDIUM (regulatory documents partially verified via web; CV 365 PDF not fully extractable)

## Regulatory Context

Vietnamese HIS Level 6 certification is governed by a layered regulatory framework:

| Regulation | Issued | Focus | Status |
|---|---|---|---|
| TT 54/2017/TT-BYT | Dec 2017 | 8 criteria groups for HIS Level 1-7 | Active, Group 8 (EMR) superseded by TT 13/2025 |
| TT 32/2023/TT-BYT | Dec 2023 | Medical record forms, clinical procedures | Active |
| TT 13/2025/TT-BYT | Jun 2025 | EMR implementation guide, digital signatures, deadlines | Active, effective Jul 21, 2025 |
| CV 365/TTYQG | Jun 2025 | Technical requirements for EMR software | Active guidance |
| QD 130/QD-BYT + QD 4750 + QD 3176 | 2023-2024 | XML data output standards (12 tables) for BHXH | Active, mandatory Jan 1, 2025 |

**Level 6 definition:** "EMR integrated with digital signatures, processing entirely within the system, completely eliminating paper" (source: nanosoft.vn, MEDIUM confidence). Level 6 is the **minimum** for hospitals deploying EMR per TT 13/2025.

**Deadline:** Hospitals must complete EMR by September 30, 2025. Other facilities by December 31, 2026.

---

## Feature Landscape

### Table Stakes (Must Have for Level 6 Certification)

Missing any one of these means the hospital **cannot be certified Level 6**. Per TT 54/2017, all criteria at the evaluation level must be met; failing one drops you to the next lower level.

| # | Feature | Why Required | Complexity | Current Status | Notes |
|---|---------|-------------|------------|----------------|-------|
| TS-1 | **Digital signature on ALL EMR forms** | TT 13/2025 Art.3: "electronic signatures" mandatory for clinical documents. Level 6 = "paperless with digital signatures" | HIGH | Partial (Radiology only via RSACng popup; PDF via iText7) | Need Pkcs11Interop for programmatic USB Token PIN. Must cover 38 EMR forms + prescriptions + lab results + discharge papers. Three signature types per TT 13: (1) legal e-signatures, (2) biometric, (3) other e-auth |
| TS-2 | **BHXH Gateway real integration** | QD 130/4750/3176 mandate XML data output to BHXH portal. Every hospital doing BHYT billing must connect. Not optional. | HIGH | Mock (ReceptionCompleteService returns stub data) | 12 XML output tables (check-in, summary, prescriptions, services, referral, etc.). Real API at gdbhyt.baohiemxahoi.gov.vn. Must support: card verification, treatment history lookup, cost submission, assessment results |
| TS-3 | **XML 4210 export (QD 130/4750/3176)** | Mandatory data format for BHXH cost reporting since Jan 1, 2025 | HIGH | Partial (InsuranceXmlService exists but incomplete) | 12 standardized tables: check-in status, cost summary, medicines, materials, services, subclinical, blood, transport, referral, sick leave, medical assessment, TB treatment |
| TS-4 | **38 EMR forms per TT 32/2023** | Mandatory clinical documentation forms (17 doctor + 21 nursing) | LOW | DONE -- all 38 forms implemented in EMRPrintTemplates.tsx + EMRNursingPrintTemplates.tsx | Verify forms match exact TT 32/2023 field requirements |
| TS-5 | **Data inheritance between modules** | CV 365 functional requirement; TT 54 Level 6 requires seamless data flow | LOW | DONE -- DataInheritanceController, Reception->OPD->Rx->Billing->Pharmacy->IPD | Already implemented Session 14 |
| TS-6 | **2FA authentication** | TT 13/2025 requires multi-factor auth for EMR access | LOW | DONE -- Email OTP in AuthService | Already implemented Session 9 |
| TS-7 | **Audit logging** | TT 54 Group 7 (security): all access and modifications must be logged | LOW | DONE -- AuditLogMiddleware + AuditController + SystemAdmin UI | Already implemented Session 15 |
| TS-8 | **HL7 FHIR R4** | CV 365: "EMR software must export XML/JSON per HL7 FHIR standards" | LOW | DONE -- FhirController, 8 resources, 22+ endpoints | Already implemented Session 15 |
| TS-9 | **Patient identity linked to national ID (CCCD)** | TT 13/2025 Art.1: "linked with citizen personal identification numbers" | MEDIUM | Partial (Patient entity has CCCD field; no VNeID API integration) | Need: (1) validate CCCD on registration, (2) future VNeID API lookup. For now, storing CCCD number is sufficient |
| TS-10 | **Information security Level 2** (Decree 85/2016) | CV 365 non-functional: minimum security level 2 | MEDIUM | Partial (JWT, 2FA, audit exist; no formal penetration test or security assessment) | Need: access control matrix, data encryption at rest, backup/recovery procedures documentation, security incident response |
| TS-11 | **Reconciliation reports** | TT 54 Level 6: cost reconciliation between departments, pharmacy, billing | LOW | DONE -- 8 reports in ReconciliationReportController | Already implemented Session 14 |
| TS-12 | **Queue display + estimated wait time** | TT 54 Level 6 Group 3 (HIS): patient calling system with LCD display | LOW | DONE -- QueueDisplay.tsx + CalculateEstimatedWaitAsync + TTS | Already implemented Session 9 |
| TS-13 | **CLS location on queue ticket** | TT 54: print location for clinical services on patient ticket | LOW | DONE -- PrintQueueTicketAsync includes CLS room directions | Already implemented Session 16 |
| TS-14 | **Email notifications for results** | Required communication channel for lab/radiology results | LOW | DONE -- ResultNotificationService + EmailService | Already implemented Session 10 |
| TS-15 | **Responsive design** | TT 13/2025 Art.1.2: "usable on all devices" | LOW | DONE -- mobile drawer, tablet collapse, CSS media queries | Already implemented Session 16 |
| TS-16 | **PDF export with digital signature** | TT 13/2025: "HSBA summary as signed PDF" | MEDIUM | DONE (generation) -- PdfGenerationService + PdfTemplateHelper + iText7 | PDF generation works; digital signature on PDF needs USB Token expansion (see TS-1) |
| TS-17 | **Clinical terminology (hospital-defined)** | TT 13/2025 Art.1.5: hospitals define own clinical terms | LOW | DONE -- ClinicalTermSelector + ClinicalTerm entity + 58 seed terms | Already implemented Session 11 |
| TS-18 | **Structured data entry (checklists)** | TT 13/2025 Art.1.6-1.7: checklist-based clinical data entry | LOW | DONE -- ClinicalTermSelector in OPD physical exam sections | Already implemented Session 11 |

### Table Stakes -- NOT YET DONE (Priority Implementation Required)

| # | Feature | Why Required | Complexity | Dependencies | Est. Days |
|---|---------|-------------|------------|--------------|-----------|
| **TS-1** | **Digital signature expansion (Pkcs11Interop)** | Level 6 = paperless + signed. Without this, certification fails. | HIGH | USB Token hardware, Pkcs11Interop NuGet, CA certificate | 7-10 |
| **TS-2** | **BHXH Gateway real integration** | Mandatory for all BHYT-billing hospitals | HIGH | BHXH API credentials, test environment access from hospital IT | 10-15 |
| **TS-3** | **XML 4210 complete export** | Mandatory data reporting format | HIGH | TS-2 (gateway connection), QD 3176 field specifications | 8-10 |
| **TS-9** | **CCCD/National ID validation** | TT 13/2025 requires linkage | MEDIUM | Hospital policy on VNeID adoption timeline | 3-5 |
| **TS-10** | **Security hardening to Level 2** | CV 365 non-functional requirement | MEDIUM | Security assessment tools, documentation | 5-7 |

---

### Differentiators (Competitive Advantage, Not Required for Cert)

Features that FPT eHospital, VNPT HIS, and NanoSoft offer as selling points. Having these makes the system competitive but is not a certification blocker.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D-1 | **SMS gateway notifications** | Patient convenience; reduces no-shows. FPT eHospital has this. | MEDIUM | SpeedSMS.vn or Viettel/VNPT brandname SMS API. ~500 VND/SMS. Need MOIT registration for promotional SMS. For OTP/notification: simpler. Already have EmailService pattern to extend |
| D-2 | **Online appointment booking (public portal)** | Patient self-service reduces reception workload. MEDPRO, YouMed are popular. | MEDIUM | AppointmentBookingService + AppointmentBooking.tsx already exist in codebase. Need: public-facing UI without auth, time slot management, SMS/email confirmation |
| D-3 | **AI/CDSS clinical decision support** | FPT touts AI as key differentiator. Vietnamese hospitals piloting CDSS in 2025-2026. MOH Resolution 57 roadmap 2026-2030. | HIGH | Drug interaction checking DONE (DrugInteraction entity + 3 endpoints). Can add: ICD-10 suggestion from symptoms, dosage alerts, allergy cross-check. Use rule-based engine first, ML later |
| D-4 | **HL7 CDA document architecture** | International interoperability standard alongside FHIR. Some hospitals require CDA for referral documents. | MEDIUM | FHIR already done. CDA is XML-based clinical document standard. Generate CDA documents from existing EMR data. Less urgent than FHIR -- most Vietnamese hospitals adopting FHIR first |
| D-5 | **SNOMED CT terminology mapping** | International coding system. CV 365 mentions as target standard alongside ICD-10. | MEDIUM | ClinicalTerm entity exists. Need: SNOMED CT code field, mapping table ICD-10 <-> SNOMED CT. Vietnam has no national SNOMED license yet (LOW confidence) -- this is aspirational |
| D-6 | **Biometric authentication (face/fingerprint)** | TT 13/2025 Art.3 lists biometric as one of three valid signature methods. FPT has it. Banks mandate it by Jan 2026. | HIGH | For staff: WebAuthn/FIDO2 for fingerprint, or webcam face recognition. For patients: VNeID integration (future). Camera hardware required. Privacy implications |
| D-7 | **VNeID platform integration** | Government super-app becoming single access point. Hospitals with VNeID integration get regulatory brownie points. | HIGH | VNeID API not publicly documented (LOW confidence). VNPT SmartCA integration for remote signing. NFC chip reading from CCCD cards. Very early ecosystem -- few hospitals have this |
| D-8 | **Speech-to-text for clinical notes** | FPT eHospital has this. Significant time savings for doctors. | MEDIUM | Web Speech API (browser-native, free) for Vietnamese. Accuracy ~70-80% for medical terms. Need custom medical vocabulary. Or commercial: Google Cloud Speech, Viettel AI |
| D-9 | **Oracle DB support** | Contract specifies Oracle. Some government hospitals mandate Oracle. | HIGH | EF Core supports Oracle via Oracle.EntityFrameworkCore provider. Need: test all 350+ queries, handle SQL Server-specific syntax (NEWID, GETDATE, etc.) |
| D-10 | **Smart card read/write (BHYT card)** | Read insurance card data directly. Reduces manual entry errors. | HIGH | PC/SC API, smart card reader hardware. BHYT card format is specific to Vietnam BHXH. Limited documentation (LOW confidence). Few HIS vendors actually implement -- most use barcode/QR |
| D-11 | **Medical record archive management** | TT 13/2025 Art.1.11: "manage storage, loan, return of HSBA (PDF)". Physical+digital archive tracking. | MEDIUM | DB tables for archive location, loan requests, return dates. PDF storage with metadata. Already have PDF generation. |
| D-12 | **Telemedicine integration** | Post-COVID feature. VNPT and FPT offer video consultation. Patient Portal + video call + e-prescription. | MEDIUM | Telemedicine.tsx page exists with API integration. Need: WebRTC video, scheduling, consent forms. Or integrate with existing platforms (Zalo, etc.) |
| D-13 | **Patient mobile app** | FPT has "Patio" app. Patients view records, book appointments, pay online. | HIGH | React Native or Flutter. Separate codebase. Huge scope. Alternative: PWA from existing responsive web |
| D-14 | **ICD-11 support** | WHO recommends transition from ICD-10 to ICD-11. Vietnam has not mandated yet. | LOW | Add ICD-11 code field alongside ICD-10. Mapping table. No Vietnamese ICD-11 translation yet |
| D-15 | **Real-time XML digital signature for BHXH** | CV 4040/BYT-BH (Jun 2025): pilot real-time data sync + XML signing to BHXH gateway | HIGH | Requires TS-1 (digital signature) + TS-2 (BHXH gateway). New requirement as of Jun 2025. Phased rollout |

---

### Anti-Features (Deliberately NOT Build)

| # | Feature | Why Requested | Why Problematic | Alternative |
|---|---------|---------------|-----------------|-------------|
| AF-1 | **Winform desktop client** | Contract mentions "Web + Winform". Some older doctors prefer desktop apps. | Massive duplicate codebase. React web already works on all platforms. Hospital has agreed web-only is sufficient. | Responsive web with PWA install. Keyboard shortcuts for power users (already done). |
| AF-2 | **Full Oracle migration (replace SQL Server)** | Contract says "Oracle Server". | Replacing a working SQL Server setup is high risk, high cost, zero user benefit. | Support Oracle as alternative deployment target (TS-9 differentiator). Keep SQL Server as primary. |
| AF-3 | **Build own SMS gateway** | "We should own the SMS infrastructure" | Regulatory burden (MOIT registration), carrier agreements, deliverability issues. | Use SpeedSMS.vn or eSMS.vn as managed gateway. REST API integration is trivial. |
| AF-4 | **Build own video consultation platform** | "Telemedicine needs custom video" | WebRTC at scale is extremely complex (STUN/TURN servers, bandwidth, recording). | Integrate with existing platforms (Jitsi Meet self-hosted, or Zalo API). Embed iframe. |
| AF-5 | **Custom AI/ML model training** | "We need our own medical AI" | Requires massive labeled Vietnamese medical datasets, GPU infrastructure, ML expertise. 6-12 month project minimum. | Rule-based CDSS first (drug interactions, dosage checks, allergy alerts). Use GPT API for symptom-to-ICD suggestion as optional enhancement. |
| AF-6 | **Multi-tenant architecture** | "What if we sell to other hospitals?" | Fundamental architecture change. Single hospital contract. Would delay delivery by months. | Keep single-tenant. Extract config (hospital name already done). Multi-tenant is a v3.0 consideration. |
| AF-7 | **Blockchain for medical records** | "Blockchain ensures data integrity" | Massive overkill. Digital signatures + audit log already provide tamper evidence. Adds complexity without regulatory requirement. | Existing audit log middleware + signed PDFs provide sufficient integrity proof for Level 6 certification. |
| AF-8 | **Full SNOMED CT license integration** | "We need complete SNOMED mapping" | Vietnam has no national SNOMED CT license. Cost is significant. No Vietnamese translation exists. No regulatory mandate. | Map common terms only. Keep ICD-10 as primary. Add SNOMED code field for future readiness. |

---

## Feature Dependencies

```
[TS-1: Digital Signature Expansion]
    |
    +-- requires --> [Pkcs11Interop NuGet package]
    +-- requires --> [USB Token hardware + CA certificate]
    +-- enables --> [TS-16: PDF with real digital signature]
    +-- enables --> [D-15: Real-time XML signing for BHXH]
    +-- enables --> [All 38 EMR forms become legally signed]

[TS-2: BHXH Gateway Integration]
    |
    +-- requires --> [BHXH API credentials from hospital]
    +-- requires --> [TS-3: XML 4210 format compliance]
    +-- enables --> [D-15: Real-time XML signing]
    +-- enhances --> [Insurance module (already exists)]

[TS-3: XML 4210 Export]
    |
    +-- requires --> [QD 3176 field specifications]
    +-- enhances --> [TS-2: BHXH Gateway]

[D-1: SMS Gateway]
    |
    +-- requires --> [SMS provider account (SpeedSMS/eSMS)]
    +-- enhances --> [TS-14: Email notifications (add SMS channel)]
    +-- enhances --> [D-2: Online booking (SMS confirmation)]

[D-2: Online Appointment Booking]
    |
    +-- requires --> [Public-facing route without auth]
    +-- enhances --> [TS-12: Queue display (booked patients appear)]
    +-- partially done --> [AppointmentBookingService exists in codebase]

[D-3: AI/CDSS]
    |
    +-- requires --> [ICD-10 database (already exists)]
    +-- enhances --> [OPD examination workflow]
    +-- partially done --> [Drug interaction checking exists]

[D-6: Biometric Auth]
    |
    +-- conflicts with --> [TS-6: 2FA via Email OTP (different auth flow)]
    +-- note: additive, not replacement. Biometric = additional option

[D-9: Oracle DB Support]
    |
    +-- requires --> [Oracle.EntityFrameworkCore NuGet]
    +-- requires --> [All SQL Server-specific syntax abstracted]
    +-- independent of all other features

[D-11: Archive Management]
    |
    +-- requires --> [TS-16: PDF generation (already done)]
    +-- enhances --> [EMR module]
```

### Dependency Notes

- **TS-1 (Digital Signature) is the critical path blocker.** Without programmatic USB Token signing via Pkcs11Interop, the system cannot sign documents silently. The current RSACng approach requires a Windows popup for PIN entry, which is unusable in a high-volume clinical workflow. Every downstream feature (signed PDFs, signed XML for BHXH, signed EMR forms) depends on solving this.
- **TS-2 + TS-3 (BHXH) require external credentials.** Implementation cannot proceed without the hospital providing BHXH gateway test credentials. This is a coordination dependency, not a technical one.
- **D-9 (Oracle) is fully independent** but high effort. Can be deferred without impacting any other feature.
- **D-1 (SMS) enables D-2 (Booking)** for confirmation messages. SMS can be added incrementally.

---

## MVP Definition

### Launch With (Certification Milestone)

Must-haves for Level 6 certification acceptance:

- [x] 38 EMR forms per TT 32/2023 -- DONE
- [x] 2FA authentication -- DONE
- [x] HL7 FHIR R4 -- DONE
- [x] Audit logging -- DONE
- [x] Data inheritance between modules -- DONE
- [x] Queue display with estimated wait -- DONE
- [x] Clinical terminology checklists -- DONE
- [x] Reconciliation reports -- DONE
- [x] Responsive design -- DONE
- [x] Email notifications -- DONE
- [x] PDF generation -- DONE
- [ ] **TS-1: Digital signature on all EMR forms (Pkcs11Interop)** -- CRITICAL PATH
- [ ] **TS-2: BHXH Gateway real integration** -- MANDATORY for BHYT hospitals
- [ ] **TS-3: XML 4210 complete export** -- MANDATORY for cost reporting
- [ ] **TS-9: CCCD national ID validation** -- Required by TT 13/2025
- [ ] **TS-10: Security hardening** -- Required by CV 365

### Add After Certification (v1.x)

Features to add once Level 6 is secured, to match competitor offerings:

- [ ] D-1: SMS notifications -- Add when SMS provider account is ready
- [ ] D-2: Online appointment booking polish -- AppointmentBookingService already exists
- [ ] D-11: Medical record archive management -- Natural EMR extension
- [ ] D-4: HL7 CDA documents -- For inter-hospital referrals
- [ ] D-3: AI/CDSS rule-based expansion -- Beyond existing drug interactions

### Future Consideration (v2+)

Features to defer until post-certification, post-contract:

- [ ] D-9: Oracle DB support -- Only when hospital mandates Oracle deployment
- [ ] D-6: Biometric authentication -- Wait for VNeID API maturation
- [ ] D-7: VNeID platform integration -- API not publicly available yet
- [ ] D-8: Speech-to-text -- Nice-to-have, not certification-related
- [ ] D-10: Smart card read/write -- Very few hospitals actually use this
- [ ] D-13: Patient mobile app -- Separate project scope entirely
- [ ] D-15: Real-time XML signing to BHXH -- Pilot phase only (CV 4040)

---

## Feature Prioritization Matrix

| Feature | User Value | Certification Value | Implementation Cost | Priority |
|---------|-----------|--------------------|--------------------|----------|
| TS-1: Digital signature expansion | HIGH | **CRITICAL** | HIGH (7-10 days) | **P0** |
| TS-2: BHXH Gateway | HIGH | **CRITICAL** | HIGH (10-15 days) | **P0** |
| TS-3: XML 4210 export | HIGH | **CRITICAL** | HIGH (8-10 days) | **P0** |
| TS-9: CCCD validation | MEDIUM | HIGH | MEDIUM (3-5 days) | **P1** |
| TS-10: Security hardening | LOW (invisible) | HIGH | MEDIUM (5-7 days) | **P1** |
| D-2: Online booking | HIGH | LOW | LOW (3-5 days, partially built) | **P2** |
| D-1: SMS notifications | MEDIUM | LOW | LOW (2-3 days) | **P2** |
| D-11: Archive management | MEDIUM | MEDIUM | MEDIUM (5-7 days) | **P2** |
| D-3: AI/CDSS expansion | HIGH (doctors love it) | LOW | MEDIUM (5-8 days) | **P2** |
| D-4: HL7 CDA | LOW | LOW | MEDIUM (5-7 days) | **P3** |
| D-5: SNOMED CT mapping | LOW | LOW | MEDIUM (3-5 days) | **P3** |
| D-9: Oracle DB support | LOW | LOW (contract mention) | HIGH (10-15 days) | **P3** |
| D-6: Biometric auth | LOW | LOW | HIGH (7-10 days) | **P3** |
| D-8: Speech-to-text | MEDIUM | NONE | MEDIUM (3-5 days) | **P3** |

**Priority key:**
- P0: Must have for Level 6 certification -- blocks acceptance
- P1: Should have -- supports certification documentation and compliance
- P2: Add when possible -- competitive advantage, customer satisfaction
- P3: Future consideration -- defer unless customer explicitly demands

---

## Competitor Feature Analysis

| Feature | FPT eHospital 2.0 | VNPT HIS | NanoSoft | Our HIS (Current) | Gap |
|---------|-------------------|----------|----------|-------------------|-----|
| EMR forms (TT 32) | Full | Full | Full | 38/38 DONE | None |
| Digital signature | Integrated (MISA eSign) | Integrated | Integrated | Partial (Radiology only) | **GAP: TS-1** |
| BHXH Gateway | Full real integration | Full | Full | Mock stubs | **GAP: TS-2, TS-3** |
| HL7 FHIR | Supported | Supported | Supported | 8 resources, 22+ endpoints | None |
| AI/CDSS | AI + Big Data (key selling point) | Basic rules | Basic rules | Drug interactions + 11 rules | Minor gap |
| SMS notifications | Yes | Yes | Yes | Email only | **GAP: D-1** |
| Online booking | Yes (via Patio app) | Yes | Yes | Backend exists, no public UI | Minor gap |
| Speech-to-text | Yes | No | No | No | Differentiator if added |
| Smart Queue | Yes (branded) | Yes | Yes | QueueDisplay + TTS DONE | None |
| Patient app | Patio mobile app | Yes | No | Responsive web + PWA | Acceptable alternative |
| Real-time notifications | Yes | Yes | Unknown | SignalR WebSocket DONE | None |
| Dashboard charts | Yes | Yes | Yes | recharts (3 chart types) DONE | None |
| Audit logging | Yes | Yes | Yes | Middleware + UI DONE | None |
| Oracle support | Yes | Yes | Unknown | SQL Server only | **GAP: D-9** |
| VNeID integration | Early | Early | No | CCCD field only | Industry-wide gap |

### Key Competitive Gaps

1. **Digital signature** -- Every competitor has full integration. This is the single biggest gap. Without it, the system literally cannot be called Level 6.
2. **BHXH Gateway** -- Every competitor connects to the real gateway. This is day-to-day operational necessity, not just certification.
3. **SMS** -- Expected by hospital staff and patients. Easy to add.
4. **Oracle** -- Contract mentions it. Low priority unless hospital IT mandates it.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table stakes features | HIGH | Cross-referenced TT 54, TT 13/2025, CV 365 across multiple sources |
| Digital signature requirements | HIGH | Confirmed by TT 13/2025 Art.3, nanosoft.vn Level 6 definition, MISA eSign documentation |
| BHXH Gateway requirements | HIGH | QD 130/4750/3176 widely documented; gdbhyt.baohiemxahoi.gov.vn is the known endpoint |
| CV 365 detailed tech specs | LOW | PDF document not extractable; summaries only from secondary sources |
| VNeID API details | LOW | No public API documentation found. Only high-level VNeID feature descriptions |
| SNOMED CT Vietnam status | LOW | No evidence Vietnam has national SNOMED license. Based on international patterns only |
| Smart card technical specs | LOW | BHYT card format documentation not found publicly |
| Oracle migration effort | MEDIUM | Based on general EF Core Oracle provider experience; no project-specific testing |
| Competitor features | MEDIUM | Based on marketing pages; actual implementations may differ |

---

## Sources

### Regulatory (HIGH confidence)
- [TT 54/2017/TT-BYT - Full text](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Thong-tu-54-2017-TT-BYT-Bo-tieu-chi-ung-dung-cong-nghe-thong-tin-tai-cac-co-so-kham-chua-benh-373292.aspx)
- [TT 13/2025/TT-BYT - EMR implementation guide](https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Thong-tu-13-2025-TT-BYT-huong-dan-trien-khai-ho-so-benh-an-dien-tu-660113.aspx)
- [TT 32/2023/TT-BYT - Medical procedures](https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Thong-tu-32-2023-TT-BYT-huong-dan-Luat-Kham-benh-chua-benh-593360.aspx)
- [QD 3176/QD-BYT 2024 - XML output standards](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Quyet-dinh-3176-QD-BYT-2024-sua-doi-Quyet-dinh-4750-QD-BYT-130-QD-BYT-du-lieu-chi-phi-kham-chua-benh-629410.aspx)
- [CV 365/TTYQG - EMR technical guidance](https://thuvienphapluat.vn/cong-van/Cong-nghe-thong-tin/Cong-van-365-TTYQG-GPQLCL-2025-yeu-cau-ky-thuat-trien-khai-phan-mem-ho-so-benh-an-dien-tu-671468.aspx)
- [Active legal documents for EMR](https://benhandientu.moh.gov.vn/van-bang-phap-ly-co-hieu-luc)

### Industry (MEDIUM confidence)
- [NanoSoft - HIS Level requirements for EMR](https://nanosoft.vn/his-can-dat-muc-nao-de-dap-ung-trien-khai-emr.htm)
- [FPT eHospital 2.0](https://fpt-is.com/ehospital-2-0/)
- [MISA eSign - Digital signatures in EMR](https://esign.misa.vn/9279/chu-ky-so-trong-ho-so-benh-an-dien-tu/)
- [NHIC - EMR implementation solutions](https://nhic.vn/giai-phap-trien-khai-ho-so-benh-an-dien-tu-dong-hanh-vi-mot-nen-y-te-hien-dai-lien-thong-an-toan/)
- [VNPT HIS product page](https://vnpt.com.vn/doanh-nghiep/giai-phap-cntt/y-te-dien-tu)

### Digital Identity (MEDIUM confidence)
- [VNeID upgrades with digital signatures and health records](https://www.biometricupdate.com/202410/vietnam-upgrades-vneid-with-digital-signatures-health-records)
- [Vietnam biometric mandates 2025-2026](https://www.biometricupdate.com/202512/vietnam-has-big-digitalization-and-biometrics-ambitions-for-2026)

### SMS/Communications (MEDIUM confidence)
- [SpeedSMS API](https://speedsms.vn/sms-api/)
- [GSMA Open Gateway - Vietnam operators](https://www.gsma.com/newsroom/press-release/vietnams-leading-mobile-operators-mobifone-viettel-and-vnpt-collaborate-to-drive-innovation-through-gsma-open-gateway/)

### Existing Codebase (HIGH confidence)
- `NangCap_PhanTich.md` -- Detailed gap analysis in project root
- `.planning/PROJECT.md` -- Project context with validated/active/out-of-scope features
- `CLAUDE.md` -- Work log with all 17 sessions of development history

---
*Feature research for: Vietnamese HIS Level 6 Upgrade*
*Researched: 2026-02-28*
