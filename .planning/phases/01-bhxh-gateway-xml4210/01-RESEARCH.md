# Phase 1: BHXH Gateway + XML 4210 Export - Research

**Researched:** 2026-02-28
**Domain:** Vietnamese Health Insurance (BHXH/BHYT) Gateway Integration + XML 4210 Data Export
**Confidence:** MEDIUM (gateway API specs are not publicly documented; XML schema is well-defined by regulation)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **XML 4210 Target Version:** Primary target QD 4750/2024 (latest amendment, effective Jan 2025). Single format only -- do NOT generate dual-format (old QD 130 + new).
- **Missing Data Handling:** Block export when required XML fields are missing. Show checklist of all missing required fields with record references. Staff must complete missing data before re-attempting export. Do NOT generate XML with placeholder/empty values for required fields.
- **XML Output Format:** Individual XML files per table (not packaged in ZIP). File naming per BHXH convention. Always generate all 12 tables even if some are empty (BHXH portal expects complete set).
- **Batch Export Scope:** Filter by date range + department only. No status filter, patient type filter, or individual patient selection.
- **Vietnamese Text Encoding:** Full Unicode UTF-8 with all Vietnamese diacritics preserved. Do NOT convert to uppercase ASCII or strip diacritics.
- **Export Preview Step:** Table summary preview before generating XML files. Show record counts per table, total costs, date range summary. Staff clicks "Confirm" to generate actual XML files. NOT a full data-level preview.
- **XML Validation:** Validate against official BHXH XSD schema file. Load XSD at runtime, validate generated XML before writing to disk. Show validation errors with line/field references so staff can fix source data.

### Claude's Discretion
- BHXH API connection method (WS-Security, certificate auth, token)
- Gateway failure handling (caching, retry policy, manual override UX)
- Insurance verification UI placement and interaction flow in Reception
- Treatment history display format
- XML file naming convention details
- XSD schema file storage and update mechanism
- Error message wording and UX for gateway timeouts

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BHXH-01 | Real-time insurance card verification via BHXH gateway API | BHXH Gateway Client architecture, IBhxhGatewayClient interface, token-based auth pattern, retry with Polly |
| BHXH-02 | Patient treatment history lookup from BHXH portal | Same gateway client, GetTreatmentHistory endpoint, response DTO mapping |
| BHXH-03 | Insurance cost submission to BHXH gateway | SubmitCostData endpoint via gateway client, batch submission pattern |
| BHXH-04 | Assessment results retrieval from BHXH portal | GetAssessmentResult endpoint, polling pattern for async results |
| BHXH-05 | Error handling for BHXH gateway rate limits, timeouts, schema changes | Polly retry/circuit-breaker, graceful degradation with cached last-known-good data, manual override UX |
| XML-01 | Generate all 12 XML 4210 tables per QD 4750/2024 | XmlWriter with UTF-8, 12 table generator methods, field mapping from HIS entities |
| XML-02 | XML export validation against current BHXH XSD schema | System.Xml.Schema.XmlSchemaSet validation pattern, runtime XSD loading |
| XML-03 | Batch XML export for period settlement | Batch export service, date range + department filter, preview-then-generate workflow |
| XML-04 | XML signing with digital signature before submission | Existing DigitalSignatureService CMS/PKCS#7 signing, applied to generated XML bytes |
</phase_requirements>

## Summary

This phase replaces mock BHXH insurance verification with real gateway integration and implements XML 4210 export per QD 4750/2024. The system already has a comprehensive `IInsuranceXmlService` interface with 60+ methods, `InsuranceXmlService` implementation (currently returning mock/stub data for gateway calls and empty lists for most XML generators), complete API controllers, frontend API client, and frontend Insurance page. The work is primarily replacing mock implementations with real ones.

The BHXH gateway (gdbhyt.baohiemxahoi.gov.vn) uses a **JSON-based web service** (not SOAP/WS-Security as originally hypothesized). Healthcare facilities connect using credentials issued by provincial BHXH offices. The connection uses token-based authentication with OTP for certain sensitive queries (treatment history). The API documentation is not publicly available -- it is distributed directly to healthcare facilities by BHXH Vietnam. This means the implementation must use an **abstraction layer** (IBhxhGatewayClient) so the actual endpoint URLs, auth mechanism, and request format can be configured when the hospital obtains credentials from their provincial BHXH office.

The XML 4210 schema per QD 4750/2024 (amended by QD 3176/2024) defines data in **up to 15 XML tables** (XML1-XML15), though the core 12 tables are: XML1 (medical record summary), XML2 (medicines), XML3 (technical services), XML4 (out-of-catalog medicines), XML5 (prescriptions), XML6 (blood products), XML7 (referral letters), XML8 (transport), XML9 (sick leave certificates), XML10 (assessment results), XML11 (social insurance certificates), and a check-in/checkout table. Additional tables XML13 (referral certificates), XML14 (re-examination appointments), and XML15 (TB treatment) were added by QD 3176/2024.

**Primary recommendation:** Build an `IBhxhGatewayClient` abstraction with mock implementation for development, implement real XML 4210 generation using `XmlWriter` with UTF-8 encoding and `XmlSchemaSet` for XSD validation, and wire the existing `InsuranceXmlService` to use real EF Core queries for data extraction.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| System.Xml (built-in) | .NET 9 | XML generation via `XmlWriter` + XSD validation via `XmlSchemaSet` | Built into .NET, no external dependency, full XSD support |
| System.Net.Http (built-in) | .NET 9 | HTTP client for BHXH gateway REST/JSON calls | Already have `Microsoft.Extensions.Http` in project |
| Microsoft.Extensions.Http | 9.0.0 | `IHttpClientFactory` for gateway HTTP client | Already referenced in HIS.Infrastructure.csproj |
| System.Text.Json (built-in) | .NET 9 | JSON serialization for BHXH gateway requests/responses | Built-in, high-performance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Microsoft.Extensions.Http.Polly | 9.0.x | Retry policies, circuit breaker for BHXH gateway | Add for resilient HTTP calls to external BHXH API |
| System.Security.Cryptography.Pkcs | 10.0.3 | CMS/PKCS#7 signing of XML data | Already referenced, used by existing DigitalSignatureService |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| XmlWriter | XDocument/LINQ to XML | XDocument is simpler for small docs but XmlWriter is better for large batch files (streaming, lower memory) |
| System.Xml.Schema | Third-party XSD validator | No benefit; built-in XmlSchemaSet is fully capable and well-maintained |
| Polly v8+ standalone | Microsoft.Extensions.Http.Polly | Polly v8 has new API but Microsoft.Extensions.Http.Polly integrates directly with IHttpClientFactory |

**Installation:**
```bash
cd backend/src/HIS.Infrastructure
dotnet add package Microsoft.Extensions.Http.Polly --version 9.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
  HIS.Application/
    Services/
      IInsuranceXmlService.cs          # Already exists - extend for missing XML tables
      IBhxhGatewayClient.cs            # NEW - abstraction for BHXH API calls
    DTOs/Insurance/
      InsuranceXmlDTOs.cs              # Already exists - add missing XML table DTOs
      BhxhGatewayDTOs.cs              # NEW - request/response DTOs for gateway
  HIS.Infrastructure/
    Services/
      InsuranceXmlService.cs           # Already exists - replace mocks with real queries
      BhxhGatewayClient.cs            # NEW - real HTTP implementation
      BhxhGatewayMockClient.cs        # NEW - mock for development/testing
      XmlExportService.cs             # NEW - dedicated XML file generation
      XmlSchemaValidator.cs           # NEW - XSD validation wrapper
    Configuration/
      BhxhGatewayOptions.cs           # NEW - config POCO for appsettings.json
  HIS.API/
    Controllers/
      InsuranceXmlController.cs        # Already exists - no changes needed
frontend/src/
  pages/Insurance.tsx                  # Already exists - enhance UI
  api/insurance.ts                     # Already exists - no changes needed
```

### Pattern 1: Gateway Abstraction with Config-Driven Implementation
**What:** Abstract the BHXH gateway behind an interface so the actual API details (URLs, auth) can be configured per hospital deployment without code changes.
**When to use:** Always -- BHXH API specs are obtained per-hospital from provincial BHXH offices.
**Example:**
```csharp
// Source: Clean Architecture pattern for external service integration
public interface IBhxhGatewayClient
{
    Task<BhxhTokenResponse> GetTokenAsync(CancellationToken ct = default);
    Task<InsuranceCardVerificationDto> VerifyCardAsync(string insuranceNumber, string patientName, DateTime dob, CancellationToken ct = default);
    Task<InsuranceHistoryDto> GetTreatmentHistoryAsync(string insuranceNumber, string otp, CancellationToken ct = default);
    Task<BhxhSubmitResponse> SubmitCostDataAsync(string xmlBase64, string batchCode, CancellationToken ct = default);
    Task<BhxhAssessmentResponse> GetAssessmentResultAsync(string transactionId, CancellationToken ct = default);
    Task<bool> TestConnectionAsync(CancellationToken ct = default);
}

// Configuration in appsettings.json
public class BhxhGatewayOptions
{
    public const string SectionName = "BhxhGateway";
    public string BaseUrl { get; set; } = "https://gdbhyt.baohiemxahoi.gov.vn";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FacilityCode { get; set; } = ""; // Ma CSKCB
    public int TimeoutSeconds { get; set; } = 30;
    public bool UseMock { get; set; } = true; // Default to mock until real creds
    public int RetryCount { get; set; } = 3;
    public int CircuitBreakerThreshold { get; set; } = 5;
}
```

### Pattern 2: XML Table Generator per Table
**What:** Each XML table (XML1-XML15) has its own generator method that queries HIS data and produces an XElement/XmlWriter output.
**When to use:** For all 12+ XML tables.
**Example:**
```csharp
// Source: Built-in .NET XmlWriter pattern
public async Task<string> GenerateXml1FileAsync(XmlExportConfigDto config)
{
    var records = await GetMedicalRecordsForExport(config);

    var settings = new XmlWriterSettings
    {
        Encoding = new UTF8Encoding(false), // UTF-8 without BOM
        Indent = true,
        IndentChars = "  ",
        NewLineChars = "\n",
        Async = true
    };

    using var stream = new MemoryStream();
    using (var writer = XmlWriter.Create(stream, settings))
    {
        await writer.WriteStartDocumentAsync();
        await writer.WriteStartElementAsync(null, "TONG_HOP", null);

        foreach (var record in records)
        {
            await writer.WriteStartElementAsync(null, "THONG_TIN", null);
            await writer.WriteElementStringAsync(null, "MA_LK", null, record.MaLk);
            await writer.WriteElementStringAsync(null, "STT", null, record.Stt.ToString());
            await writer.WriteElementStringAsync(null, "MA_BN", null, record.MaBn);
            await writer.WriteElementStringAsync(null, "HO_TEN", null, record.HoTen);
            // ... remaining fields
            await writer.WriteEndElementAsync(); // THONG_TIN
        }

        await writer.WriteEndElementAsync(); // TONG_HOP
        await writer.WriteEndDocumentAsync();
    }

    return Encoding.UTF8.GetString(stream.ToArray());
}
```

### Pattern 3: Pre-Export Validation Pipeline
**What:** Before generating XML, validate all records against both business rules (required fields) and XSD schema.
**When to use:** Every export -- per locked decision, block export on missing required fields.
**Example:**
```csharp
// Source: Microsoft Learn - XSD Validation with XmlSchemaSet
public class XmlSchemaValidator
{
    private readonly XmlSchemaSet _schemaSet;
    private readonly List<ValidationError> _errors = new();

    public XmlSchemaValidator(string xsdFolderPath)
    {
        _schemaSet = new XmlSchemaSet();
        // Load all XSD files from folder
        foreach (var xsdFile in Directory.GetFiles(xsdFolderPath, "*.xsd"))
        {
            _schemaSet.Add(null, xsdFile);
        }
        _schemaSet.Compile();
    }

    public List<ValidationError> ValidateXml(string xmlContent)
    {
        _errors.Clear();
        var settings = new XmlReaderSettings
        {
            Schemas = _schemaSet,
            ValidationType = ValidationType.Schema
        };
        settings.ValidationEventHandler += (sender, e) =>
        {
            _errors.Add(new ValidationError
            {
                Severity = e.Severity == XmlSeverityType.Error ? "Error" : "Warning",
                Message = e.Message,
                LineNumber = e.Exception?.LineNumber ?? 0,
                LinePosition = e.Exception?.LinePosition ?? 0
            });
        };

        using var reader = XmlReader.Create(new StringReader(xmlContent), settings);
        while (reader.Read()) { } // Read through to trigger validation

        return _errors;
    }
}
```

### Pattern 4: Resilient Gateway Client with Polly
**What:** HTTP client with retry, circuit breaker, and timeout policies for calling external BHXH API.
**When to use:** All BHXH gateway calls.
**Example:**
```csharp
// Source: Microsoft.Extensions.Http.Polly documentation
// In DependencyInjection.cs:
services.AddHttpClient<IBhxhGatewayClient, BhxhGatewayClient>(client =>
{
    var options = configuration.GetSection(BhxhGatewayOptions.SectionName).Get<BhxhGatewayOptions>();
    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
})
.AddTransientHttpErrorPolicy(p => p.WaitAndRetryAsync(3,
    retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))))
.AddTransientHttpErrorPolicy(p => p.CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));
```

### Anti-Patterns to Avoid
- **Hardcoding BHXH API URLs:** The BHXH gateway URL may differ per province. Always use configuration.
- **Generating XML with string concatenation:** Use `XmlWriter` -- string concat leads to encoding bugs with Vietnamese diacritics and XML special characters.
- **Skipping XSD validation:** Per locked decision, validation is mandatory before export.
- **Blocking on gateway timeout during patient registration:** Insurance verification must be non-blocking. If the gateway is down, show a warning and allow manual entry with cached data.
- **Loading XSD on every validation call:** Load XmlSchemaSet once at startup and reuse (it is thread-safe after Compile()).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML generation | String concatenation/interpolation | `System.Xml.XmlWriter` | Vietnamese diacritics, XML entity escaping, encoding declaration, streaming for large files |
| XSD validation | Custom field-by-field checks only | `System.Xml.Schema.XmlSchemaSet` | Covers all schema constraints (types, cardinality, patterns); custom checks are for business rules only |
| HTTP resilience | Manual retry loops | Polly via `Microsoft.Extensions.Http.Polly` | Exponential backoff, circuit breaker, jitter, cancellation token support |
| Date formatting | Manual string format | `DateTime.ToString("yyyyMMddHHmm")` with `CultureInfo.InvariantCulture` | BHXH date format is fixed `yyyyMMddHHmm`; culture-specific formatting would break |
| XML signing | Custom hash+sign | Existing `DigitalSignatureService.SignDataAsync()` | CMS/PKCS#7 signing already implemented and tested with USB Token |
| Ma Lien Thong generation | Random GUID | Deterministic format: `{MaCsKcb}{yyyyMMdd}{sequence}` | BHXH requires traceable, facility-prefixed codes |

**Key insight:** The XML 4210 spec is defined by government regulation with strict field names, formats, and validation rules. Any hand-rolled solution will miss edge cases that XSD validation catches automatically.

## Common Pitfalls

### Pitfall 1: Vietnamese Diacritics Lost in XML
**What goes wrong:** XML output contains garbled Vietnamese characters (e.g., "Nguy?n V?n A" instead of "Nguyen Van A")
**Why it happens:** Using `new UTF8Encoding(true)` (with BOM) or letting StringWriter default to UTF-16, or database returning wrong encoding
**How to avoid:** Always use `new UTF8Encoding(false)` (no BOM) in XmlWriterSettings.Encoding. Verify DB connection string includes `TrustServerCertificate=True` but does NOT force ASCII.
**Warning signs:** First record in export has correct Vietnamese, but bulk export does not.

### Pitfall 2: BHXH Date Format Mismatch
**What goes wrong:** BHXH portal rejects XML because date fields are in wrong format.
**Why it happens:** BHXH uses `yyyyMMddHHmm` (e.g., "202602281430") not ISO 8601 or `dd/MM/yyyy`.
**How to avoid:** Create a helper: `static string ToBhxhDate(DateTime? dt) => dt?.ToString("yyyyMMddHHmm", CultureInfo.InvariantCulture) ?? "";`
**Warning signs:** XSD validation passes (date is valid string) but BHXH portal rejects.

### Pitfall 3: Empty XML Tables Omitted
**What goes wrong:** BHXH portal rejects submission because not all 12 tables are present.
**Why it happens:** Developer skips generating XML file when query returns zero records.
**How to avoid:** Per locked decision, always generate all 12 tables. Empty tables should have the root element with zero child elements.
**Warning signs:** Export works for inpatients (all tables populated) but fails for outpatients (some tables empty).

### Pitfall 4: Gateway Token Expiry During Batch Operation
**What goes wrong:** Card verification works initially but fails mid-batch with 401 Unauthorized.
**Why it happens:** BHXH gateway tokens have limited TTL; batch operations may exceed token lifetime.
**How to avoid:** Implement token refresh logic in `BhxhGatewayClient` -- check expiry before each call, refresh proactively when < 5 minutes remaining.
**Warning signs:** First N API calls succeed, then all subsequent calls fail in same batch.

### Pitfall 5: Decimal Precision in Cost Fields
**What goes wrong:** BHXH rejects claims because cost amounts have too many decimal places.
**Why it happens:** .NET `decimal` has 28-29 significant digits; BHXH expects specific precision.
**How to avoid:** Round all cost fields to appropriate precision before XML generation. Use `Math.Round(value, 2)` for monetary amounts.
**Warning signs:** XSD validation passes but BHXH assessment rejects with "invalid amount" errors.

### Pitfall 6: Blocking UI During Gateway Calls
**What goes wrong:** Reception page freezes for 30+ seconds when BHXH gateway is slow.
**Why it happens:** Insurance verification is called synchronously during patient registration.
**How to avoid:** Make verification async with a loading spinner. Show cached/last-known data immediately, update when gateway responds. Allow registration to proceed with manual insurance data entry if gateway times out.
**Warning signs:** Staff complaints about slow registration during peak hours.

### Pitfall 7: XSD Schema Version Mismatch
**What goes wrong:** XML that was valid last month now fails validation.
**Why it happens:** BHXH updates XSD schemas (QD 4750 -> QD 3176 amendments). Hospital admin doesn't update the XSD files.
**How to avoid:** Store XSD files in a known location (e.g., `wwwroot/xsd/bhxh/`). Provide admin UI to upload new XSD files. Log XSD version with each export batch.
**Warning signs:** All exports suddenly fail validation after a BHXH regulation change.

## Code Examples

### XML File Generation with UTF-8 Vietnamese Support
```csharp
// Source: .NET 9 XmlWriter documentation + BHXH conventions
public static async Task<byte[]> GenerateXmlTableAsync(
    string rootElement,
    string childElement,
    IEnumerable<Dictionary<string, string>> records)
{
    var settings = new XmlWriterSettings
    {
        Encoding = new UTF8Encoding(false), // UTF-8 without BOM
        Indent = true,
        IndentChars = "  ",
        Async = true,
        OmitXmlDeclaration = false
    };

    using var stream = new MemoryStream();
    await using (var writer = XmlWriter.Create(stream, settings))
    {
        await writer.WriteStartDocumentAsync();
        await writer.WriteStartElementAsync(null, rootElement, null);

        foreach (var record in records)
        {
            await writer.WriteStartElementAsync(null, childElement, null);
            foreach (var (key, value) in record)
            {
                if (value != null)
                    await writer.WriteElementStringAsync(null, key, null, value);
            }
            await writer.WriteEndElementAsync();
        }

        await writer.WriteEndElementAsync();
        await writer.WriteEndDocumentAsync();
    }

    return stream.ToArray();
}
```

### XSD Validation Service
```csharp
// Source: Microsoft Learn - XmlSchemaSet validation
public class XmlValidationService
{
    private XmlSchemaSet? _schemaSet;
    private readonly string _xsdFolderPath;

    public XmlValidationService(string xsdFolderPath)
    {
        _xsdFolderPath = xsdFolderPath;
        ReloadSchemas();
    }

    public void ReloadSchemas()
    {
        var schemaSet = new XmlSchemaSet();
        foreach (var file in Directory.GetFiles(_xsdFolderPath, "*.xsd"))
        {
            schemaSet.Add(null, file);
        }
        schemaSet.Compile();
        _schemaSet = schemaSet; // Atomic swap
    }

    public List<XmlValidationError> Validate(byte[] xmlBytes, string tableName)
    {
        if (_schemaSet == null) return new List<XmlValidationError>();

        var errors = new List<XmlValidationError>();
        var readerSettings = new XmlReaderSettings
        {
            Schemas = _schemaSet,
            ValidationType = ValidationType.Schema
        };
        readerSettings.ValidationEventHandler += (_, e) =>
        {
            errors.Add(new XmlValidationError
            {
                TableName = tableName,
                Severity = e.Severity.ToString(),
                Message = e.Message,
                LineNumber = e.Exception?.LineNumber ?? 0,
                LinePosition = e.Exception?.LinePosition ?? 0
            });
        };

        using var stream = new MemoryStream(xmlBytes);
        using var reader = XmlReader.Create(stream, readerSettings);
        try { while (reader.Read()) { } }
        catch (XmlException ex)
        {
            errors.Add(new XmlValidationError
            {
                TableName = tableName,
                Severity = "Error",
                Message = ex.Message,
                LineNumber = ex.LineNumber,
                LinePosition = ex.LinePosition
            });
        }

        return errors;
    }
}
```

### Gateway Client with Token Management
```csharp
// Source: IHttpClientFactory + resilience patterns
public class BhxhGatewayClient : IBhxhGatewayClient
{
    private readonly HttpClient _httpClient;
    private readonly BhxhGatewayOptions _options;
    private readonly ILogger<BhxhGatewayClient> _logger;
    private string? _token;
    private DateTime _tokenExpiry = DateTime.MinValue;

    public BhxhGatewayClient(HttpClient httpClient,
        IOptions<BhxhGatewayOptions> options,
        ILogger<BhxhGatewayClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    private async Task EnsureTokenAsync(CancellationToken ct)
    {
        if (_token != null && DateTime.UtcNow < _tokenExpiry.AddMinutes(-5))
            return; // Token still valid

        var response = await GetTokenAsync(ct);
        _token = response.Token;
        _tokenExpiry = response.ExpiresAt;
        _httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _token);
    }

    public async Task<InsuranceCardVerificationDto> VerifyCardAsync(
        string insuranceNumber, string patientName, DateTime dob,
        CancellationToken ct = default)
    {
        await EnsureTokenAsync(ct);

        var request = new
        {
            maThe = insuranceNumber,
            hoTen = patientName,
            ngaySinh = dob.ToString("yyyyMMdd"),
            maCsKcb = _options.FacilityCode
        };

        var response = await _httpClient.PostAsJsonAsync("/api/egw/nhanHoSo", request, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<BhxhCardResponse>(cancellationToken: ct);
        return MapToVerificationDto(result);
    }
}
```

### Batch Export Workflow
```csharp
// Source: Application-level orchestration pattern
public async Task<XmlExportResultDto> ExportXmlBatchAsync(XmlExportConfigDto config)
{
    // Step 1: Validate all records (blocking per locked decision)
    var validationResults = await ValidateBeforeExportAsync(config);
    var blockingErrors = validationResults.Where(r => !r.IsValid).ToList();
    if (blockingErrors.Any())
    {
        return new XmlExportResultDto
        {
            BatchId = Guid.Empty,
            TotalRecords = validationResults.Count,
            FailedRecords = blockingErrors.Count,
            Errors = blockingErrors.SelectMany(r => r.Errors.Select(e => new XmlExportError
            {
                MaLk = r.MaLk,
                ErrorCode = e.ErrorCode,
                ErrorMessage = e.Message
            })).ToList()
        };
    }

    // Step 2: Generate all 12 XML tables (even empty ones)
    var batchId = Guid.NewGuid();
    var batchCode = $"XML-{config.Year}{config.Month:D2}-{DateTime.Now:HHmmss}";
    var outputPath = Path.Combine(_exportBasePath, batchCode);
    Directory.CreateDirectory(outputPath);

    var xml1Bytes = await GenerateXml1FileAsync(config);
    var xml2Bytes = await GenerateXml2FileAsync(config);
    // ... all 12 tables

    // Step 3: XSD validation of generated XML
    var xsdErrors = new List<XmlValidationError>();
    xsdErrors.AddRange(_validator.Validate(xml1Bytes, "XML1"));
    xsdErrors.AddRange(_validator.Validate(xml2Bytes, "XML2"));
    // ... validate all tables

    if (xsdErrors.Any(e => e.Severity == "Error"))
    {
        return new XmlExportResultDto { /* errors */ };
    }

    // Step 4: Write files to disk with BHXH naming convention
    var facilityCode = _options.FacilityCode;
    var period = $"{config.Year}{config.Month:D2}";
    await File.WriteAllBytesAsync(
        Path.Combine(outputPath, $"{facilityCode}_{period}_XML1.xml"), xml1Bytes);
    // ... write all files

    return new XmlExportResultDto
    {
        BatchId = batchId,
        BatchCode = batchCode,
        TotalRecords = validationResults.Count,
        SuccessRecords = validationResults.Count,
        ExportTime = DateTime.Now,
        FilePath = outputPath
    };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| QD 4210/2017 (original 9 tables) | QD 130/2023 -> QD 4750/2023 -> QD 3176/2024 (15 tables) | Jan 2025 mandatory | Must target QD 4750 format; original QD 4210 is obsolete |
| SOAP/WS-Security | JSON-based web service | ~2020 | Simpler HTTP client integration; no WCF/SOAP dependency needed |
| Manual XML file upload | API-based data submission | 2019+ | Real-time check-in/checkout + batch XML submission |
| Per-facility portal login only | Token-based API access | 2019+ | Programmatic access via API credentials from provincial BHXH |

**Deprecated/outdated:**
- QD 4210/2017: Replaced by QD 130/2023 + QD 4750/2023. Only target the latest format.
- SOAP-based BHXH API: The current system uses JSON REST. Do not build SOAP/WCF client.
- XML6 as "blood products": Table naming and structure changed in QD 4750. Use latest field definitions.

## The 12 (15) XML Tables per QD 4750/2024

Based on QD 130/2023 as amended by QD 4750/2023 and QD 3176/2024:

| Table | Vietnamese Name | Purpose | Key Fields |
|-------|----------------|---------|------------|
| XML1 | Tong hop thong tin KCB | Medical record summary (check-in) | MA_LK, MA_BN, HO_TEN, NGAY_SINH, GIOI_TINH, MA_THE, NGAY_VAO, NGAY_RA, MA_BENH_CHINH, TIEN_BHYT |
| XML2 | Chi tiet thuoc | Medicine details | MA_LK, STT, MA_THUOC, TEN_THUOC, SO_LUONG, DON_GIA, THANH_TIEN, TIEN_BHYT |
| XML3 | Chi tiet DVKT | Technical services (lab, imaging, procedures) | MA_LK, STT, MA_DVU, TEN_DVU, SO_LUONG, DON_GIA, THANH_TIEN, TIEN_BHYT |
| XML4 | Thuoc ngoai danh muc (C) | Out-of-catalog medicines | MA_LK, STT, MA_THUOC, TEN_THUOC, SO_LUONG, DON_GIA, THANH_TIEN |
| XML5 | Chi dinh thuoc | Prescriptions | MA_LK, STT, MA_THUOC, TEN_THUOC, LIEU_DUNG, SO_NGAY, NGAY_KE_DON |
| XML6 | Mau va che pham mau | Blood and blood products | MA_LK, STT, MA_MAU, TEN_MAU, THE_TICH, DON_GIA |
| XML7 | Giay chuyen tuyen | Referral letters | MA_LK, SO_HO_SO, MA_CSKB_CHUYEN_DI, NGAY_CHUYEN_DI, LY_DO |
| XML8 | Van chuyen nguoi benh | Patient transport | MA_LK, STT, PHUONG_TIEN, KHOANG_CACH, PHI_VC |
| XML9 | Giay nghi viec huong BHXH | Sick leave certificates | MA_LK, TU_NGAY, DEN_NGAY, SO_NGAY, LY_DO |
| XML10 | Ket qua giam dinh | Assessment results | MA_LK, KET_QUA, GHI_CHU, NGAY_GIAM_DINH |
| XML11 | So BHXH | Social insurance certificate | MA_LK, MA_BHXH, HO_TEN, SO_SO_BHXH |
| XML13 | Giay hen tai kham | Re-examination appointments (QD 3176) | MA_LK, NGAY_HEN, NOI_DUNG |
| XML14 | Phieu chuyen tuyen | Referral certificates (QD 3176) | MA_LK, fields similar to XML7 |
| XML15 | Dieu tri lao | TB treatment details (QD 3176) | MA_LK, PHAC_DO, GIAI_DOAN |

**Note:** XML12 was removed/merged in QD 4750 amendments. The existing DTOs already cover XML1-XML5, XML7. Need to add XML6, XML8-XML11, XML13-XML15.

## BHXH Gateway API Architecture

Based on research findings (MEDIUM confidence -- API spec not public):

| Component | Details |
|-----------|---------|
| Portal URL | `https://gdbhyt.baohiemxahoi.gov.vn` |
| Protocol | HTTPS + JSON (not SOAP) |
| Authentication | Token-based (username/password -> token), OTP for sensitive queries |
| Credential Source | Provincial BHXH office issues per-facility |
| Key Functions | Card verification, treatment history lookup, cost submission, assessment retrieval |
| Data Format | JSON for API calls, XML for batch data submission |
| Rate Limits | Not publicly documented; implement conservative retry |

### BHXH API Flow (Reconstructed)
```
1. Authenticate: POST /api/token { username, password } -> { token, expires }
2. Verify Card: POST /api/egw/nhanHoSo { maThe, hoTen, ngaySinh, maCsKcb } -> { card details }
3. Get History: POST /api/egw/lichSuKcb { maThe, otp } -> { visit history }
4. Submit XML: POST /api/egw/guiHoSo { xmlBase64, batchCode } -> { transactionId }
5. Get Result: GET /api/egw/ketQuaGiamDinh/{transactionId} -> { assessment result }
```

**Confidence level for API flow: LOW** -- This is reconstructed from indirect sources. Actual endpoints WILL differ. The `IBhxhGatewayClient` abstraction is critical precisely because we cannot verify these endpoints without real credentials.

## Open Questions

1. **Exact BHXH API endpoint URLs and authentication flow**
   - What we know: JSON-based web service at gdbhyt.baohiemxahoi.gov.vn, token auth, OTP for history
   - What's unclear: Exact URL paths, request/response schemas, error codes, rate limits
   - Recommendation: Build `IBhxhGatewayClient` abstraction with mock implementation. When hospital obtains credentials, implement the real client to match actual API spec. The mock allows all UI and workflow development to proceed now.

2. **Official XSD schema files**
   - What we know: BHXH publishes XSD files; hospitals must validate against them
   - What's unclear: Where to download current XSD files, how often they change
   - Recommendation: Create `wwwroot/xsd/bhxh/` folder with placeholder XSD files. Build admin UI to upload new XSD files. Ship without official XSDs and document that hospital admin must obtain and upload them from their provincial BHXH office.

3. **XML table field changes from QD 3176/2024**
   - What we know: QD 3176 added XML13, XML14, XML15 and modified some fields
   - What's unclear: Exact field-level changes to existing tables (XML1-XML11)
   - Recommendation: Use the existing DTO structures as the base. They already cover the major fields. Add missing tables. Flag specific field additions as TODO when implementing each table generator.

4. **Treatment history OTP mechanism**
   - What we know: Querying patient treatment history requires OTP verification
   - What's unclear: How OTP is generated (sent to hospital admin phone? email? separate portal?)
   - Recommendation: Add OTP field to the treatment history request DTO. In the UI, show an OTP input field. Document that the OTP mechanism depends on hospital's BHXH account setup.

## Sources

### Primary (HIGH confidence)
- Microsoft Learn - XmlSchemaSet XSD Validation: https://learn.microsoft.com/en-us/dotnet/standard/data/xml/xml-schema-xsd-validation-with-xmlschemaset
- Microsoft Learn - XmlWriterSettings.Encoding: https://learn.microsoft.com/en-us/dotnet/api/system.xml.xmlwritersettings.encoding?view=net-8.0
- Existing codebase: `IInsuranceXmlService.cs`, `InsuranceXmlService.cs`, `InsuranceXmlDTOs.cs`, `InsuranceXmlController.cs` (all fully read)

### Secondary (MEDIUM confidence)
- QD 4750/QD-BYT (2023): https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Quyet-dinh-4750-QD-BYT-2023-sua-doi-Quyet-dinh-130-QD-BYT-dinh-dang-du-lieu-kham-benh-593340.aspx
- QD 3176/QD-BYT (2024): https://luatvietnam.vn/y-te/quyet-dinh-3176-qd-byt-2024-sua-doi-quyet-dinh-4750-qd-byt-sua-doi-quy-dinh-chuan-du-lieu-dau-ra-370146-d1.html
- CV 1245/BHXH-CNTT (2024) on XML testing: https://caselaw.vn/van-ban-phap-luat/424092-cong-van-so-1245-bhxh-cntt-ngay-03-05-2024
- BHXH Assessment Portal (gdbhyt): https://gdbhyt.baohiemxahoi.gov.vn/
- BHYT card lookup via API (LuatVietnam): https://luatvietnam.net/vn/thong-tin-the-bhyt-co-the-tra-cuu-qua-ung-dung-api-vbpl90085.html

### Tertiary (LOW confidence -- needs validation)
- BHXH gateway API flow reconstruction (from indirect sources, hospital forum posts, eBH.vn guides)
- XML table field names (from existing codebase DTOs -- may need updates per QD 3176)
- OTP mechanism for treatment history (from BHXH guidance documents -- not technically verified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Built-in .NET XML/HTTP libraries, well-documented, already partially used in project
- Architecture: HIGH - Clean Architecture patterns, existing interface structure guides design
- XML 4210 table structure: MEDIUM - Based on QD 4750 regulation + existing DTOs, but exact field-level changes from QD 3176 need verification
- BHXH gateway API: LOW - API spec is not publicly available; abstraction layer mitigates this risk
- Common pitfalls: MEDIUM - Vietnamese HIS community knowledge + .NET XML best practices

**Research date:** 2026-02-28
**Valid until:** 2026-04-28 (60 days -- XML schema is regulation-stable; gateway API details may change)
