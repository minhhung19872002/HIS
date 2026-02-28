# Phase 2: Digital Signature Expansion (PKCS#11 + TSA) - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current Windows PIN popup signing with programmatic PKCS#11 USB Token signing via Pkcs11Interop. Add TSA timestamps and OCSP/CRL revocation checks to signed PDFs. Support multiple Vietnamese CA providers (VNPT-CA, Viettel-CA, BKAV-CA, FPT-CA). Enable batch signing workflow for doctors signing multiple documents at once. All 38 EMR forms, prescriptions, lab results, discharge papers, and referral letters can be digitally signed.

</domain>

<decisions>
## Implementation Decisions

### Signing UX Flow
- Doctor enters USB Token PIN in the browser (HTML input field), sent to backend via HTTPS
- Backend uses Pkcs11Interop to open token session with the PIN
- Signing session lasts 30 minutes before requiring PIN re-entry
- If token is removed mid-session: system waits 60 seconds for re-insertion before invalidating session
- All USB Tokens are plugged into the server machine (centralized), not individual workstations
- Doctors can sign from any workstation via browser — no driver installation needed on client machines

### Batch Signing Workflow
- Checkbox selection in document list — select multiple unsigned documents, click "Ky tat ca" (Sign All)
- On partial failure (e.g., 3 of 10 fail): continue signing remaining documents, report failures afterward
- Successful documents shown with green check, failed documents shown with red X and error reason
- Progress bar with counter ("7/10 da ky") updating in real-time during batch signing
- Maximum 50 documents per batch (covers a typical clinic shift of 30-50 patients)

### CA Provider Management
- CA provider DLL paths configured in appsettings.json (not database/UI)
- Auto-detection of CA provider type from token metadata (ATR/label) when token is inserted
- Certificate expiry check before signing: block signing if expired, warn 30 days before expiration
- Error message on expired cert: "Chung chi het han ngay XX. Lien he phong CNTT."
- Multiple tokens on server simultaneously: map token serial number to user account on first use, auto-recognize on subsequent uses

### Signed Document Display
- Visible signature stamp at bottom of printed page: doctor name, signing datetime, certificate serial, CA logo
- Web UI: green shield icon (ShieldCheck) next to signed documents; gray icon for unsigned
- Hover tooltip on shield icon: "Da ky boi BS. [Name], [datetime], [CA provider]"
- Click shield icon opens detailed verification panel: signer info, TSA timestamp, OCSP status (valid/revoked), certificate chain
- Signed documents are fully locked — no editing or deletion allowed
- To modify a signed document: must revoke signature, edit content, then re-sign

### Claude's Discretion
- PKCS#11 session management internals (slot enumeration, mechanism selection)
- TSA server selection and fallback logic
- OCSP/CRL caching strategy
- Signature stamp visual design (exact layout, fonts, positioning)
- USB Hub hardware recommendations
- Backup strategy for server token management

</decisions>

<specifics>
## Specific Ideas

- Current system uses Windows CryptoAPI (RSACng) which triggers PIN popup — this must be completely replaced with PKCS#11
- Known token: WINCA certificate from BLUESTAR (thumbprint: 46F732584971C00EDB8FBEDABB2D68133960B322)
- Existing backend has DigitalSignatureService and PdfSignatureService (iText7) — extend, don't rewrite
- Existing 38 EMR print templates (PdfTemplateHelper) need signature integration
- Token PIN temporary code was added and reverted in Session 8/9 — lessons learned about RSACng limitations

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-digital-signature-expansion-pkcs-11-tsa*
*Context gathered: 2026-02-28*
