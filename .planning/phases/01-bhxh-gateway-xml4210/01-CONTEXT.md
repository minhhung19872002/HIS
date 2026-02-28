# Phase 1: BHXH Gateway + XML 4210 Export - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time BHXH insurance verification during patient registration, treatment history lookup, insurance cost submission, assessment results retrieval, and XML 4210 export per QD 4750/2024. Includes error handling for BHXH gateway failures and batch export for monthly settlement.

</domain>

<decisions>
## Implementation Decisions

### XML 4210 Target Version
- Primary target: **QD 4750/2024** (latest amendment, effective Jan 2025)
- Do NOT generate dual-format (old QD 130 + new). Single format only.

### Missing Data Handling
- **Block export** when required XML fields are missing
- Show a checklist of all missing required fields with record references
- Staff must complete missing data before re-attempting export
- Do NOT generate XML with placeholder/empty values for required fields

### XML Output Format
- **Individual XML files** per table (not packaged in ZIP)
- File naming per BHXH convention
- Always generate **all 12 tables** even if some are empty (BHXH portal expects complete set)

### Batch Export Scope
- Filter by **date range + department** only
- No need for status filter, patient type filter, or individual patient selection
- This covers the standard monthly BHXH settlement workflow

### Vietnamese Text Encoding
- **Full Unicode UTF-8** with all Vietnamese diacritics preserved
- Do NOT convert to uppercase ASCII or strip diacritics

### Export Preview Step
- **Table summary preview** before generating XML files
- Show: record counts per table, total costs, date range summary
- Staff clicks "Confirm" to generate actual XML files
- NOT a full data-level preview (too much detail)

### XML Validation
- Validate against **official BHXH XSD schema file**
- Load XSD at runtime, validate generated XML before writing to disk
- Show validation errors with line/field references so staff can fix source data

### Claude's Discretion
- BHXH API connection method (WS-Security, certificate auth, token)
- Gateway failure handling (caching, retry policy, manual override UX)
- Insurance verification UI placement and interaction flow in Reception
- Treatment history display format
- XML file naming convention details
- XSD schema file storage and update mechanism
- Error message wording and UX for gateway timeouts

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User focused discussion on XML 4210 data mapping; BHXH API integration, error handling, and UX are left to Claude's best judgment based on BHXH portal documentation and Vietnamese HIS conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-bhxh-gateway-xml4210*
*Context gathered: 2026-02-28*
