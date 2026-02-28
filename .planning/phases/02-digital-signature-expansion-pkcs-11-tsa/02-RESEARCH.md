# Phase 2: Digital Signature Expansion (PKCS#11 + TSA) - Research

**Researched:** 2026-02-28
**Domain:** PKCS#11 USB Token digital signing, PDF/PAdES signatures, TSA timestamping, OCSP/CRL revocation
**Confidence:** HIGH

## Summary

This phase replaces the current Windows CryptoAPI (RSACng) signing -- which triggers a native PIN popup dialog and blocks automation -- with programmatic PKCS#11 signing via the Pkcs11Interop library. The existing codebase already has `DigitalSignatureService`, `PdfSignatureService` (iText7 8.0.2), 38 EMR HTML print templates (`PdfTemplateHelper`/`PdfGenerationService`), and frontend USB Token APIs in `ris.ts`. The key change is: tokens are centralized on the server, doctors enter PIN in the browser, the backend opens a PKCS#11 session with that PIN, signs data, and returns the result. TSA timestamps (RFC 3161) and OCSP/CRL revocation checking are added to embedded PDF signatures via iText7's built-in `TSAClientBouncyCastle`, `OcspClientBouncyCastle`, and `CrlClientOnline` classes.

The project uses iText7 8.0.2 with `itext7.bouncy-castle-adapter` 8.0.2, targeting .NET 9.0. Pkcs11Interop 5.3.0 (released Feb 2, 2025) and Pkcs11Interop.X509Store 1.1.0 (released Feb 5, 2025) are the standard .NET PKCS#11 libraries. The Pkcs11Interop.X509Store library provides a `Pkcs11RsaProvider` that extends .NET's `RSA` class, enabling transparent integration with iText7's `IExternalSignature` pattern. Vietnamese CA providers (VNPT-CA, Viettel-CA, BKAV-CA, FPT-CA) each ship their own PKCS#11 DLLs; the system must load the correct DLL per token type via configurable paths in appsettings.json.

**Primary recommendation:** Use Pkcs11Interop.X509Store 1.1.0 for high-level PKCS#11 certificate access with PIN provider, and implement a custom `IExternalSignature` adapter for iText7 that delegates signing to the `Pkcs11RsaProvider`. Centralize token sessions on the server with 30-minute session caching keyed by user+token serial.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Doctor enters USB Token PIN in the browser (HTML input field), sent to backend via HTTPS
- Backend uses Pkcs11Interop to open token session with the PIN
- Signing session lasts 30 minutes before requiring PIN re-entry
- If token is removed mid-session: system waits 60 seconds for re-insertion before invalidating session
- All USB Tokens are plugged into the server machine (centralized), not individual workstations
- Doctors can sign from any workstation via browser -- no driver installation needed on client machines
- Checkbox selection in document list -- select multiple unsigned documents, click "Ky tat ca" (Sign All)
- On partial failure (e.g., 3 of 10 fail): continue signing remaining documents, report failures afterward
- Successful documents shown with green check, failed documents shown with red X and error reason
- Progress bar with counter ("7/10 da ky") updating in real-time during batch signing
- Maximum 50 documents per batch (covers a typical clinic shift of 30-50 patients)
- CA provider DLL paths configured in appsettings.json (not database/UI)
- Auto-detection of CA provider type from token metadata (ATR/label) when token is inserted
- Certificate expiry check before signing: block signing if expired, warn 30 days before expiration
- Error message on expired cert: "Chung chi het han ngay XX. Lien he phong CNTT."
- Multiple tokens on server simultaneously: map token serial number to user account on first use, auto-recognize on subsequent uses
- Visible signature stamp at bottom of printed page: doctor name, signing datetime, certificate serial, CA logo
- Web UI: green shield icon (ShieldCheck) next to signed documents; gray icon for unsigned
- Hover tooltip on shield icon: "Da ky boi BS. [Name], [datetime], [CA provider]"
- Click shield icon opens detailed verification panel: signer info, TSA timestamp, OCSP status (valid/revoked), certificate chain
- Signed documents are fully locked -- no editing or deletion allowed
- To modify a signed document: must revoke signature, edit content, then re-sign

### Claude's Discretion
- PKCS#11 session management internals (slot enumeration, mechanism selection)
- TSA server selection and fallback logic
- OCSP/CRL caching strategy
- Signature stamp visual design (exact layout, fonts, positioning)
- USB Hub hardware recommendations
- Backup strategy for server token management

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SIGN-01 | All 38 EMR forms can be digitally signed via USB Token (Pkcs11Interop PKCS#11) | Pkcs11Interop.X509Store + custom IExternalSignature + existing PdfGenerationService generates HTML byte[], convert to PDF via iText7, then sign |
| SIGN-02 | Prescriptions and lab results can be digitally signed by authorized doctors | Same signing pipeline, extend to Prescription and LabResult document types; existing `IPdfGenerationService.GeneratePrescriptionAsync` and `GenerateLabResultAsync` already exist |
| SIGN-03 | Discharge papers and referral letters can be digitally signed | Existing `GenerateDischargeLetterAsync` in IPdfGenerationService; add referral letter generator, apply same signing pipeline |
| SIGN-04 | PDF exports include embedded digital signature with timestamp (TSA) and revocation check (OCSP/CRL) | iText7 8.0.2 PdfSigner.SignDetached with TSAClientBouncyCastle + OcspClientBouncyCastle + CrlClientOnline; configurable TSA URL in appsettings.json |
| SIGN-05 | System supports multiple Vietnamese CA providers (VNPT-CA, Viettel-CA, BKAV-CA, FPT-CA) | Configurable PKCS#11 DLL paths per provider in appsettings.json; auto-detect via token label/manufacturer; known DLL names documented |
| SIGN-06 | Batch signing workflow for doctors signing multiple documents at once | Server-side loop with single PKCS#11 session, max 50 docs, partial failure handling, real-time progress via SignalR |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pkcs11Interop | 5.3.0 | Low-level PKCS#11 wrapper for .NET | Only maintained managed PKCS#11 library for .NET; Apache 2.0; supports .NET Standard 2.0+ |
| Pkcs11Interop.X509Store | 1.1.0 | High-level PKCS#11 X.509 certificate store with RSA provider | Eliminates low-level PKCS#11 complexity; provides `Pkcs11RsaProvider` extending .NET `RSA`; IPinProvider for programmatic PIN |
| itext7 | 8.0.2 (already installed) | PDF generation and PAdES digital signature embedding | Already in project; `PdfSigner.SignDetached` supports TSA, OCSP, CRL natively |
| itext7.bouncy-castle-adapter | 8.0.2 (already installed) | BouncyCastle integration for iText7 crypto | Already in project; provides `TSAClientBouncyCastle`, `OcspClientBouncyCastle`, `CrlClientOnline` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @microsoft/signalr | ^10.0.0 (already installed) | Real-time progress updates for batch signing | Send "X/Y da ky" progress updates during batch signing |
| System.Security.Cryptography.Pkcs | 10.0.3 (already installed) | CMS/PKCS#7 signature verification | Verify existing CMS signatures; fallback verification |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pkcs11Interop.X509Store | Raw Pkcs11Interop only | Lower-level; must manually manage sessions, find keys, build DigestInfo; X509Store wraps all this |
| iText7 PdfSigner | PdfPadesSigner (iText 8.0.3+) | PdfPadesSigner is higher-level PAdES API but requires iText 8.0.3+; current project is on 8.0.2; PdfSigner with SignDetached works fine |
| Server-side tokens | Client-side browser WebCrypto | Requires drivers on every workstation; user decision is centralized tokens on server |

**Installation:**
```bash
cd backend/src/HIS.Infrastructure
dotnet add package Pkcs11Interop --version 5.3.0
dotnet add package Pkcs11Interop.X509Store --version 1.1.0
```

## Architecture Patterns

### Recommended Project Structure
```
backend/src/HIS.Infrastructure/Services/
  DigitalSignatureService.cs      # REWRITE: Replace Windows CryptoAPI with PKCS#11
  PdfSignatureService.cs          # EXTEND: Add TSA/OCSP/CRL to SignDetached
  Pkcs11SessionManager.cs         # NEW: Session caching, token mapping, 30-min expiry
  Pkcs11ExternalSignature.cs      # NEW: IExternalSignature adapter for iText7
  TokenRegistryService.cs         # NEW: Map token serial to user account

backend/src/HIS.Infrastructure/Configuration/
  Pkcs11Configuration.cs          # NEW: Strongly-typed config for CA providers

backend/src/HIS.API/Controllers/
  DigitalSignatureController.cs   # NEW: Centralized signing endpoints (not per-module)

backend/src/HIS.Core/Entities/
  DigitalSignature.cs             # NEW: Cross-module signature entity

backend/src/HIS.Application/DTOs/
  DigitalSignatureDTOs.cs         # NEW: Signing request/response DTOs

frontend/src/api/
  digitalSignature.ts             # NEW: Centralized signing API client

frontend/src/components/
  SignatureStatusIcon.tsx          # NEW: Green/gray shield icon with tooltip
  BatchSigningModal.tsx            # NEW: Batch signing UI with progress bar
  SignatureVerificationPanel.tsx   # NEW: Detailed verification drawer
  PinEntryModal.tsx                # NEW: PIN input modal with session indicator
```

### Pattern 1: PKCS#11 Session Caching
**What:** Cache open PKCS#11 sessions keyed by userId+tokenSerial, auto-expire after 30 minutes, auto-invalidate on token removal.
**When to use:** Every signing operation checks cache before requesting PIN.
**Example:**
```csharp
// Pkcs11SessionManager.cs
public class Pkcs11SessionManager : IDisposable
{
    private readonly ConcurrentDictionary<string, Pkcs11SessionEntry> _sessions = new();
    private readonly ILogger<Pkcs11SessionManager> _logger;

    public class Pkcs11SessionEntry
    {
        public Pkcs11X509Store Store { get; set; }
        public Pkcs11X509Certificate Certificate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string TokenSerial { get; set; }
        public string UserId { get; set; }
    }

    // Key format: "{userId}:{tokenSerial}"
    public async Task<Pkcs11SessionEntry> GetOrCreateSessionAsync(
        string userId, string pin, string pkcs11LibPath)
    {
        var existing = _sessions.Values
            .FirstOrDefault(s => s.UserId == userId && s.ExpiresAt > DateTime.UtcNow);

        if (existing != null)
            return existing;

        // Open new PKCS#11 session with provided PIN
        var pinProvider = new FixedPinProvider(pin);
        var store = new Pkcs11X509Store(pkcs11LibPath, pinProvider);

        // Find first slot with token + certificate with private key
        var cert = store.Slots
            .Where(s => s.Token != null && s.Token.Info.Initialized)
            .SelectMany(s => s.Token.Certificates)
            .FirstOrDefault(c => c.HasPrivateKeyObject);

        if (cert == null)
            throw new InvalidOperationException("No signing certificate found on token");

        var entry = new Pkcs11SessionEntry
        {
            Store = store,
            Certificate = cert,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            TokenSerial = store.Slots.First(s => s.Token != null).Token.Info.SerialNumber,
            UserId = userId
        };

        _sessions.TryAdd($"{userId}:{entry.TokenSerial}", entry);
        return entry;
    }
}
```

### Pattern 2: IExternalSignature Adapter for PKCS#11
**What:** Bridge Pkcs11Interop.X509Store's `Pkcs11RsaProvider` with iText7's `IExternalSignature` interface.
**When to use:** When calling `PdfSigner.SignDetached()` with a PKCS#11-backed key.
**Example:**
```csharp
// Pkcs11ExternalSignature.cs
public class Pkcs11ExternalSignature : IExternalSignature
{
    private readonly Pkcs11X509Certificate _certificate;
    private readonly string _hashAlgorithm;

    public Pkcs11ExternalSignature(Pkcs11X509Certificate certificate, string hashAlgorithm = "SHA-256")
    {
        _certificate = certificate;
        _hashAlgorithm = hashAlgorithm;
    }

    public string GetDigestAlgorithmName() => _hashAlgorithm;
    public string GetSignatureAlgorithmName() => "RSA";
    public ISignatureMechanismParams? GetSignatureMechanismParameters() => null;

    public byte[] Sign(byte[] message)
    {
        // Pkcs11RsaProvider delegates signing to the PKCS#11 token
        // PIN was already provided when the session was opened
        using var rsa = _certificate.GetRSAPrivateKey();
        var hashAlgName = _hashAlgorithm switch
        {
            "SHA-256" => HashAlgorithmName.SHA256,
            "SHA-384" => HashAlgorithmName.SHA384,
            "SHA-512" => HashAlgorithmName.SHA512,
            _ => HashAlgorithmName.SHA256
        };
        return rsa.SignData(message, hashAlgName, RSASignaturePadding.Pkcs1);
    }
}
```

### Pattern 3: PDF Signing with TSA + OCSP + CRL
**What:** Embed digital signature with trusted timestamp and revocation info into PDF.
**When to use:** Every document signing operation.
**Example:**
```csharp
// Enhanced PdfSignatureService.SignPdfWithPkcs11Async
public async Task<PdfSignatureResult> SignPdfWithPkcs11Async(
    byte[] pdfBytes,
    Pkcs11X509Certificate pkcs11Cert,
    Pkcs11Configuration config,
    string reason,
    string location)
{
    // 1. Build certificate chain for iText
    var bouncyCastleCert = new X509CertificateParser()
        .ReadCertificate(pkcs11Cert.Info.ParsedCertificate.RawData);
    var chain = new IX509Certificate[] { new X509CertificateBC(bouncyCastleCert) };

    // 2. Create external signature via PKCS#11
    var externalSignature = new Pkcs11ExternalSignature(pkcs11Cert, "SHA-256");

    // 3. Set up TSA client (with fallback)
    ITSAClient tsaClient = null;
    foreach (var tsaUrl in config.TsaUrls)
    {
        try
        {
            tsaClient = new TSAClientBouncyCastle(tsaUrl);
            break; // Use first working TSA
        }
        catch { continue; }
    }

    // 4. Set up OCSP + CRL clients
    IOcspClient ocspClient = new OcspClientBouncyCastle(null);
    var crlClients = new List<ICrlClient> { new CrlClientOnline(chain) };

    // 5. Sign the PDF
    using var inputStream = new MemoryStream(pdfBytes);
    using var outputStream = new MemoryStream();
    using var reader = new PdfReader(inputStream);
    var signer = new PdfSigner(reader, outputStream, new StampingProperties());

    // Configure visible signature appearance
    var appearance = signer.GetSignatureAppearance();
    appearance
        .SetReason(reason)
        .SetLocation(location)
        .SetContact(pkcs11Cert.Info.ParsedCertificate.Subject)
        .SetSignatureCreator("HIS Digital Signature")
        .SetPageNumber(1)  // Last page
        .SetPageRect(new iText.Kernel.Geom.Rectangle(350, 30, 200, 80));

    signer.SetFieldName($"Sig_{DateTime.Now:yyyyMMddHHmmss}");

    // Sign with TSA + OCSP + CRL
    signer.SignDetached(
        externalSignature,
        chain,
        crlClients,        // CRL revocation data
        ocspClient,        // OCSP revocation data
        tsaClient,         // RFC 3161 timestamp
        0,                 // estimated size (0 = auto)
        PdfSigner.CryptoStandard.CMS);

    return new PdfSignatureResult
    {
        Success = true,
        SignedPdfBytes = outputStream.ToArray(),
        // ... other properties
    };
}
```

### Pattern 4: Batch Signing with SignalR Progress
**What:** Sign multiple documents in a single PKCS#11 session, report progress via SignalR.
**When to use:** When doctor selects multiple unsigned documents and clicks "Ky tat ca".
**Example:**
```csharp
// In DigitalSignatureController
[HttpPost("batch-sign")]
public async Task<ActionResult<BatchSignResult>> BatchSign([FromBody] BatchSignRequest request)
{
    // Validate max 50
    if (request.DocumentIds.Count > 50)
        return BadRequest("Toi da 50 tai lieu moi lan ky");

    var session = await _sessionManager.GetOrCreateSessionAsync(
        userId, request.Pin, pkcs11LibPath);

    var result = new BatchSignResult { Total = request.DocumentIds.Count };

    for (int i = 0; i < request.DocumentIds.Count; i++)
    {
        try
        {
            await SignSingleDocument(request.DocumentIds[i], session);
            result.Succeeded.Add(request.DocumentIds[i]);
        }
        catch (Exception ex)
        {
            result.Failed.Add(new FailedDocument
            {
                DocumentId = request.DocumentIds[i],
                Error = ex.Message
            });
        }

        // Send progress via SignalR
        await _hubContext.Clients.User(userId).SendAsync("SigningProgress", new
        {
            current = i + 1,
            total = request.DocumentIds.Count,
            documentId = request.DocumentIds[i],
            success = result.Failed.All(f => f.DocumentId != request.DocumentIds[i])
        });
    }

    return Ok(result);
}
```

### Anti-Patterns to Avoid
- **Opening a new PKCS#11 session per signing operation:** Extremely slow; the PIN dialog (even programmatic) adds latency. Cache the session for 30 minutes.
- **Storing PIN in database or config:** PIN must only exist in memory during the session; never persist to disk.
- **Using Windows CryptoAPI (RSACng/CNG) with PKCS#11 tokens:** RSACng does NOT support programmatic PIN -- it always triggers the Windows popup. This is the exact problem being solved.
- **Signing synchronously on the HTTP request thread for batch operations:** Use fire-and-forget with SignalR progress for batch > 5 documents to avoid HTTP timeout.
- **Hardcoding PKCS#11 DLL paths:** Vietnamese CA providers update their DLLs; paths must be configurable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PKCS#11 session management | Custom P/Invoke to PKCS#11 C API | Pkcs11Interop 5.3.0 | PKCS#11 C API is complex (64 functions), error-prone, platform-specific |
| X.509 certificate access from tokens | Manual slot/token/object enumeration | Pkcs11Interop.X509Store 1.1.0 | Wraps enumeration, PIN provider, RSA provider in clean API |
| PDF digital signature embedding | Custom PDF byte manipulation | iText7 PdfSigner.SignDetached | PDF signature structure (CMS, CAdES, PAdES) is extremely complex |
| TSA timestamp | Custom RFC 3161 HTTP client | TSAClientBouncyCastle (iText7) | TSA protocol requires ASN.1 encoding/decoding, nonce handling |
| OCSP revocation check | Custom OCSP HTTP client | OcspClientBouncyCastle (iText7) | OCSP protocol requires ASN.1, certificate chain walking |
| CRL download and parsing | Custom CRL fetcher | CrlClientOnline (iText7) | CRL has complex X.509 ASN.1 structure, delta CRL support |
| DigestInfo ASN.1 encoding | Manual byte array construction | Pkcs11RsaProvider.CreatePkcs1DigestInfo | One-byte error = invalid signature |

**Key insight:** Digital signatures touch multiple complex standards (PKCS#11, CMS/PKCS#7, PAdES, RFC 3161, OCSP, X.509). Each has subtle edge cases. The standard libraries handle them; custom code will have subtle bugs that cause signature validation failures in Adobe Reader.

## Common Pitfalls

### Pitfall 1: PKCS#11 Session Not Logged In
**What goes wrong:** Signing operations fail with CKR_USER_NOT_LOGGED_IN even after providing PIN.
**Why it happens:** PKCS#11 sessions have state; if the session object is garbage collected or the token is briefly disconnected, the login state is lost.
**How to avoid:** Check session state before each operation; re-login if needed; wrap in try-catch with automatic re-authentication.
**Warning signs:** Intermittent "access denied" or "user not logged in" errors after some time.

### Pitfall 2: Wrong PKCS#11 Mechanism for Hash Algorithm
**What goes wrong:** Signature created but Adobe Reader shows "signature is invalid."
**Why it happens:** Using CKM_RSA_PKCS with pre-hashed data requires a DigestInfo prefix (ASN.1 encoded hash OID + hash). Using CKM_SHA256_RSA_PKCS expects raw data (the mechanism hashes internally). Mixing them up produces an invalid signature.
**How to avoid:** Use Pkcs11Interop.X509Store's `Pkcs11RsaProvider` which handles DigestInfo construction correctly via `CreatePkcs1DigestInfo`. Or use `CKM_SHA256_RSA_PKCS` which does hashing internally.
**Warning signs:** Signature validates in code but fails in Adobe Reader.

### Pitfall 3: iText7 Estimated Signature Size Too Small
**What goes wrong:** `SignDetached` throws exception about insufficient space for signature.
**Why it happens:** When TSA + OCSP + CRL data is included, the signature container size can exceed the default 8KB estimate. TSA response alone can be 4-6KB.
**How to avoid:** Set estimated size to at least 15000 (15KB) when using TSA + OCSP + CRL: `signer.SignDetached(sig, chain, crls, ocsp, tsa, 15000, CryptoStandard.CMS)`.
**Warning signs:** Works without TSA but fails when TSA is enabled.

### Pitfall 4: Token Removal During Signing
**What goes wrong:** Application crashes or hangs when USB token is removed during a signing operation.
**Why it happens:** PKCS#11 operations become blocking or throw unmanaged exceptions when the token disappears.
**How to avoid:** Wrap all PKCS#11 operations in try-catch for `Pkcs11Exception`; detect CKR_DEVICE_REMOVED/CKR_TOKEN_NOT_PRESENT; invalidate cached session; return user-friendly error.
**Warning signs:** Unhandled exceptions in production logs, especially from unmanaged code.

### Pitfall 5: Certificate Chain Incomplete
**What goes wrong:** Adobe Reader shows "signer's identity is unknown" even with valid signature.
**Why it happens:** The signing certificate's issuer CA certificate is not included in the chain. Vietnamese CA certificates may not be in Adobe's default trust store.
**How to avoid:** Include the full chain (signing cert + intermediate CA + root CA) in the `SignDetached` call. Add Vietnamese CA root certificates to the trust store configuration.
**Warning signs:** Signature shows valid but with "unknown signer" warning.

### Pitfall 6: Concurrent PKCS#11 Access
**What goes wrong:** Two signing operations on the same token conflict, causing CKR_SESSION_HANDLE_INVALID.
**Why it happens:** Some PKCS#11 tokens only support one active session at a time.
**How to avoid:** Use a `SemaphoreSlim(1, 1)` to serialize access per token. Queue batch signing operations. Do not allow parallel signing on the same physical token.
**Warning signs:** Sporadic failures when multiple doctors sign simultaneously.

### Pitfall 7: Vietnamese CA DLL 32-bit vs 64-bit
**What goes wrong:** `DllNotFoundException` or `BadImageFormatException` when loading PKCS#11 DLL.
**Why it happens:** Some Vietnamese CA providers ship only 32-bit DLLs but the .NET app runs as 64-bit. Or vice versa.
**How to avoid:** Ensure the .NET app's platform matches the DLL architecture. Use the 64-bit variant (e.g., `eps2003csp1164.dll` not `eps2003csp11.dll`). Configure per-provider in appsettings.json.
**Warning signs:** Works with one CA provider but not another.

## Code Examples

### Configuration Structure (appsettings.json)
```json
{
  "DigitalSignature": {
    "SessionTimeoutMinutes": 30,
    "TokenRemovalGraceSeconds": 60,
    "MaxBatchSize": 50,
    "DefaultHashAlgorithm": "SHA-256",
    "TsaUrls": [
      "http://timestamp.digicert.com",
      "http://rfc3161.ai.moda",
      "http://timestamp.sectigo.com"
    ],
    "EnableOcsp": true,
    "EnableCrl": true,
    "CaProviders": {
      "VNPT-CA": {
        "Pkcs11LibraryPath": "C:\\Windows\\System32\\vnptca_p11_v8.dll",
        "Label": "VNPT-CA",
        "Description": "VNPT Certificate Authority"
      },
      "Viettel-CA": {
        "Pkcs11LibraryPath": "C:\\Windows\\System32\\eTPKCS11.dll",
        "Label": "Viettel-CA",
        "Description": "Viettel Certificate Authority"
      },
      "BKAV-CA": {
        "Pkcs11LibraryPath": "C:\\Windows\\System32\\bkavca_p11.dll",
        "Label": "BKAV-CA",
        "Description": "BKAV Certificate Authority"
      },
      "FPT-CA": {
        "Pkcs11LibraryPath": "C:\\Windows\\System32\\eps2003csp1164.dll",
        "Label": "FPT-CA",
        "Description": "FPT Certificate Authority"
      }
    },
    "SignatureAppearance": {
      "PagePosition": "bottom-right",
      "Width": 200,
      "Height": 80,
      "FontSize": 8,
      "ShowSignerName": true,
      "ShowDateTime": true,
      "ShowCertificateSerial": true,
      "ShowCALogo": true
    }
  }
}
```

### IPinProvider Implementation for Server-Side PIN
```csharp
// Source: Pkcs11Interop.X509Store Getting Started Guide
// Adapted for server-side use (PIN provided via API, not console)
public class FixedPinProvider : IPinProvider
{
    private readonly byte[] _pin;

    public FixedPinProvider(string pin)
    {
        _pin = Encoding.UTF8.GetBytes(pin);
    }

    public GetPinResult GetTokenPin(
        Pkcs11X509StoreInfo storeInfo,
        Pkcs11SlotInfo slotInfo,
        Pkcs11TokenInfo tokenInfo)
    {
        return new GetPinResult(cancel: false, pin: _pin);
    }

    public GetPinResult GetKeyPin(
        Pkcs11X509StoreInfo storeInfo,
        Pkcs11SlotInfo slotInfo,
        Pkcs11TokenInfo tokenInfo,
        Pkcs11X509CertificateInfo certificateInfo)
    {
        // Key-level PIN (rarely used, same as token PIN for most Vietnamese tokens)
        return new GetPinResult(cancel: false, pin: _pin);
    }
}
```

### Cross-Module Signature Entity
```csharp
// New entity for tracking signatures across all document types
public class DocumentSignature : BaseEntity
{
    public Guid DocumentId { get; set; }         // EMR form, prescription, lab result, etc.
    public string DocumentType { get; set; }      // "EMR", "Prescription", "LabResult", "Discharge", "Referral"
    public string DocumentCode { get; set; }      // Human-readable code

    public Guid SignedByUserId { get; set; }
    public virtual User SignedByUser { get; set; }

    public DateTime SignedAt { get; set; }
    public string CertificateSubject { get; set; }
    public string CertificateIssuer { get; set; }
    public string CertificateSerial { get; set; }
    public DateTime CertificateValidFrom { get; set; }
    public DateTime CertificateValidTo { get; set; }
    public string CaProvider { get; set; }        // "VNPT-CA", "Viettel-CA", etc.
    public string TokenSerial { get; set; }

    public string? TsaTimestamp { get; set; }     // ISO 8601 from TSA
    public string? TsaUrl { get; set; }
    public string? OcspStatus { get; set; }       // "Good", "Revoked", "Unknown"
    public DateTime? OcspCheckedAt { get; set; }

    public string SignatureValue { get; set; }    // Base64 CMS/PKCS#7 signature
    public string? SignedDocumentPath { get; set; } // Path to signed PDF
    public string HashAlgorithm { get; set; } = "SHA-256";

    public int Status { get; set; }               // 0=Active, 1=Revoked
    public string? RevokeReason { get; set; }
    public DateTime? RevokedAt { get; set; }
    public Guid? RevokedByUserId { get; set; }
}
```

### Frontend PIN Entry Component Pattern
```typescript
// PinEntryModal.tsx - Antd Modal with Input.OTP for PIN
interface PinEntryModalProps {
  visible: boolean;
  onSubmit: (pin: string) => Promise<void>;
  onCancel: () => void;
  sessionActive: boolean;  // Show "Phien ky so con hieu luc" if true
  sessionExpiresAt?: string;
}

// SignatureStatusIcon.tsx - Shield icon with tooltip
interface SignatureStatusProps {
  signed: boolean;
  signerName?: string;
  signedAt?: string;
  caProvider?: string;
  onVerifyClick?: () => void;
}
// Use Antd Tooltip + SafetyCertificateOutlined/SafetyCertificateTwoTone icons
```

### Token-User Mapping Entity
```csharp
// Map token serial numbers to user accounts
public class TokenUserMapping : BaseEntity
{
    public string TokenSerial { get; set; }       // From PKCS#11 token info
    public string TokenLabel { get; set; }        // Token label
    public string CaProvider { get; set; }        // Detected CA provider
    public Guid UserId { get; set; }
    public virtual User User { get; set; }
    public DateTime FirstRegisteredAt { get; set; }
    public DateTime LastUsedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Windows CryptoAPI (RSACng) with PIN popup | Pkcs11Interop direct PKCS#11 access | This phase | Eliminates Windows dialog; enables programmatic PIN |
| No timestamp on signatures | TSA RFC 3161 timestamp via TSAClientBouncyCastle | This phase | Proves signing time; required for LTV signatures |
| No revocation checking | OCSP + CRL via iText7 built-in clients | This phase | Adobe Reader validates without warnings |
| Signature per-module (Radiology only) | Cross-module DocumentSignature entity | This phase | All 38 EMR forms + prescriptions + lab results signable |
| Single token per certificate lookup | Multi-token registry with user mapping | This phase | Multiple doctors can have tokens on same server |

**Deprecated/outdated:**
- Pkcs11Interop.PDF (integration layer for iTextSharp): DEPRECATED by author; use Pkcs11Interop.X509Store + custom IExternalSignature instead
- iTextSharp: Replaced by iText7; project already uses itext7 8.0.2
- Windows CryptoAPI for USB tokens: Cannot provide programmatic PIN on RSACng

## Known Vietnamese CA Token Details

| CA Provider | Common Token Hardware | Known PKCS#11 DLL Path (Windows x64) | Default PIN | Confidence |
|-------------|----------------------|---------------------------------------|-------------|------------|
| VNPT-CA | Custom token | `C:\Windows\System32\vnptca_p11_v8.dll` or `vnptca_p11_v8_s.dll` | 12345678 | MEDIUM (from web search, needs validation with real token) |
| Viettel-CA | SafeNet eToken 5110 | `C:\Windows\System32\eTPKCS11.dll` | viettel-ca | MEDIUM (SafeNet DLL confirmed, Viettel default PIN from web) |
| BKAV-CA | Unknown | Likely `bkavca_p11*.dll` or SafeNet variant | Unknown | LOW (needs validation with real token) |
| FPT-CA | Feitian ePass2003 | `C:\Windows\System32\eps2003csp1164.dll` | Unknown | MEDIUM (ePass2003 DLL confirmed via GitHub issues) |

**Important:** The exact DLL paths and PIN defaults must be validated with actual tokens from the hospital. The paths above are best-effort from public sources. The system must support configurable paths precisely because these vary.

## Open Questions

1. **Vietnamese CA TSA Server URLs**
   - What we know: Vietnamese CAs (VNPT, Viettel, BKAV, FPT) likely operate their own TSA servers, but no public URLs were found in research.
   - What's unclear: Whether these CAs require authentication for TSA access, or if they offer public endpoints.
   - Recommendation: Use international public TSA servers (DigiCert, Sectigo) as defaults; add Vietnamese CA TSA URLs to config when obtained from hospital IT. The TSA URL list in appsettings.json supports fallback ordering.

2. **iText7 AGPL License Compliance**
   - What we know: iText7 is AGPL-licensed for open source use; commercial license required for proprietary software.
   - What's unclear: Whether the hospital has a commercial iText license.
   - Recommendation: The project already uses iText7 8.0.2; assume licensing is already handled. Flag for hospital IT if deploying to production.

3. **Token Disconnection Detection**
   - What we know: PKCS#11 CKR_TOKEN_NOT_PRESENT error indicates removal. The user decided 60-second grace period.
   - What's unclear: Whether Pkcs11Interop.X509Store provides automatic reconnection or if manual polling is needed.
   - Recommendation: Implement a background timer that checks token presence every 10 seconds via `slot.Token != null`. On removal, start 60-second countdown. On re-insertion, resume session.

4. **HTML-to-PDF Conversion for EMR Forms**
   - What we know: Current `PdfGenerationService` returns HTML as `byte[]` (UTF-8 encoded HTML string). `PdfSignatureService` works with PDF bytes. A conversion step is needed.
   - What's unclear: Whether to use iText7's HTML-to-PDF conversion (pdfHTML add-on) or a separate library.
   - Recommendation: Use iText7 `pdfhtml` add-on (same vendor, integrates natively) to convert the existing HTML templates to PDF before signing. Alternative: generate PDF directly via iText7 Document API instead of HTML intermediate step. The second approach avoids an extra dependency but requires rewriting PdfTemplateHelper. Given 38 templates already exist as HTML, use pdfhtml add-on.

## Sources

### Primary (HIGH confidence)
- [Pkcs11Interop GitHub](https://github.com/Pkcs11Interop/Pkcs11Interop) - v5.3.0, .NET Standard 2.0+, Apache 2.0
- [Pkcs11Interop.X509Store GitHub](https://github.com/Pkcs11Interop/Pkcs11Interop.X509Store) - v1.1.0, IPinProvider, Pkcs11RsaProvider code
- [Pkcs11Interop.X509Store Getting Started](https://github.com/Pkcs11Interop/Pkcs11Interop.X509Store/blob/master/doc/03_GETTING_STARTED.md) - IPinProvider implementation, store initialization, certificate enumeration
- [Pkcs11RsaProvider source](https://github.com/Pkcs11Interop/Pkcs11Interop.X509Store/blob/master/src/Pkcs11Interop.X509Store/Pkcs11RsaProvider.cs) - SignHash implementation with CKM_RSA_PKCS
- [iText7 PAdES Signing API](https://kb.itextpdf.com/itext/pades-signing-high-level-api) - PdfPadesSigner, TSA, OCSP, CRL integration
- [iText7 Digital Signatures Chapter 3-4](https://kb.itextpdf.com/itext/digital-signatures-chapter-3) - PdfSigner.SignDetached API, IExternalSignature
- [iText7 PKCS#11 Example](https://kb.itextpdf.com/itext/an-iexternalsignature-implementation-for-signing-v) - C# IExternalSignature for PKCS#11
- Existing codebase: `DigitalSignatureService.cs`, `PdfSignatureService.cs`, `PdfGenerationService.cs`, `PdfTemplateHelper.cs`, `ris.ts`

### Secondary (MEDIUM confidence)
- [Pkcs11Interop NuGet](https://www.nuget.org/packages/Pkcs11Interop) - Version 5.3.0 confirmed
- [Pkcs11Interop.X509Store NuGet](https://www.nuget.org/packages/Pkcs11Interop.X509Store/) - Version 1.1.0 confirmed
- [Free RFC 3161 TSA servers list](https://gist.github.com/Manouchehri/fd754e402d98430243455713efada710) - Public TSA URLs
- [SafeNet eToken 5110](https://cpl.thalesgroup.com/access-management/authenticators/pki-usb-authentication/etoken-5110-usb-token) - eTPKCS11.dll path

### Tertiary (LOW confidence)
- Vietnamese CA PKCS#11 DLL paths (VNPT, BKAV, FPT) - from web search, not officially verified
- Vietnamese CA default PINs - from web forums, may vary by version
- Vietnamese TSA server URLs - not found; using international alternatives

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Pkcs11Interop and iText7 are well-documented, verified via NuGet and GitHub
- Architecture: HIGH - Pattern of PKCS#11 session caching + IExternalSignature adapter is well-established in iText KB examples and Pkcs11Interop.PDF (deprecated but pattern validated)
- Pitfalls: HIGH - PKCS#11 pitfalls from official documentation and community discussions; iText7 signature pitfalls from official KB
- Vietnamese CA specifics: MEDIUM - DLL names partially verified; exact paths and TSA URLs need validation with real tokens

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (libraries are stable; Vietnamese CA configs may need updating when real tokens available)
