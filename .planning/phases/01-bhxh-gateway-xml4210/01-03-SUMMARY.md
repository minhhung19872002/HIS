---
phase: 01-bhxh-gateway-xml4210
plan: 03
subsystem: api
tags: [bhxh, xml4210, xml-export, xsd-validation, utf8, vietnamese, xmlwriter]

# Dependency graph
requires:
  - phase: 01-bhxh-gateway-xml4210 plan 01
    provides: "IBhxhGatewayClient, BhxhGatewayOptions, InsuranceXmlService constructor"
  - phase: 01-bhxh-gateway-xml4210 plan 02
    provides: "15 XML table DTOs, 14 GenerateXmlNDataAsync methods"
provides:
  - "XmlExportService generating BHXH-compliant XML bytes for all 14 tables using XmlWriter"
  - "XmlSchemaValidator validating XML against XSD schemas (graceful skip when none present)"
  - "ExportXmlAsync pipeline: validate -> generate DTOs -> XML bytes -> XSD check -> write files"
  - "PreviewExportAsync showing record counts per table, costs, blocking errors before generating"
  - "DownloadXmlFileAsync creating ZIP archive from exported XML files"
  - "POST /api/insurance/xml/preview endpoint"
  - "XmlExportPreviewDto and XmlTablePreview DTOs"
affects: [01-04-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [XmlWriter with UTF8Encoding(false) for BOM-less UTF-8, BHXH date format yyyyMMddHHmm, Math.Round decimal precision, preview-then-generate workflow, XSD validation pipeline with graceful degradation]

key-files:
  created:
    - backend/src/HIS.Infrastructure/Services/XmlExportService.cs
    - backend/src/HIS.Infrastructure/Services/XmlSchemaValidator.cs
    - backend/src/HIS.API/wwwroot/xsd/bhxh/README.txt
  modified:
    - backend/src/HIS.Infrastructure/Services/InsuranceXmlService.cs
    - backend/src/HIS.Application/Services/IInsuranceXmlService.cs
    - backend/src/HIS.Application/DTOs/Insurance/InsuranceXmlDTOs.cs
    - backend/src/HIS.API/Controllers/InsuranceXmlController.cs
    - backend/src/HIS.Infrastructure/DependencyInjection.cs

key-decisions:
  - "XmlExportService registered as Singleton (stateless, reusable across requests)"
  - "XmlSchemaValidator uses AppDomain.CurrentDomain.BaseDirectory for XSD path (Infrastructure project cannot reference AspNetCore.Hosting)"
  - "Empty tables always produce root-element-only XML (per locked decision -- all 14 tables generated)"
  - "FacilityCode defaults to '00000' when not configured (allows dev/test without real BHXH credentials)"
  - "DownloadXmlFileAsync finds most recent batch folder by creation time (no DB batch table needed yet)"

patterns-established:
  - "BHXH XML Generation: XmlWriter + UTF8Encoding(false) + yyyyMMddHHmm dates + Math.Round(value, 2) decimals"
  - "Export Pipeline: validate -> generate -> XSD check -> write -> return result"
  - "Preview Workflow: generate all table data, count records, check validation, return preview DTO before committing to file generation"
  - "XSD Graceful Degradation: no schemas loaded -> skip validation with log warning (hospital adds XSD files when available)"

requirements-completed: [XML-02, XML-03]

# Metrics
duration: 6min
completed: 2026-02-28
---

# Phase 01 Plan 03: XML Export Pipeline Summary

**XmlExportService generating BHXH-compliant XML files via XmlWriter with UTF-8 Vietnamese support, XSD validation pipeline, and preview-then-generate workflow producing 14 XML table files on disk**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-28T06:36:13Z
- **Completed:** 2026-02-28T06:42:03Z
- **Tasks:** 2/2
- **Files modified:** 8

## Accomplishments
- Created XmlExportService with 14 GenerateXmlNFileAsync methods (one per BHXH table) using XmlWriter with UTF-8 without BOM
- Created XmlSchemaValidator that loads XSD files from wwwroot/xsd/bhxh/ and validates XML with graceful degradation when no schemas present
- Rewrote ExportXmlAsync with full pipeline: business validation (blocking) -> DTO generation -> XML bytes -> XSD validation -> file writing
- Added PreviewExportAsync returning table counts, cost totals, and blocking errors before committing to file generation
- Rewrote DownloadXmlFileAsync to create ZIP archive from exported XML files
- Added preview endpoint POST /api/insurance/xml/preview
- All 14 tables always generated (even empty ones) with BHXH naming convention: {FacilityCode}_{period}_XML{N}.xml

## Task Commits

Each task was committed atomically:

1. **Task 1: Create XmlExportService and XmlSchemaValidator** - `de1a1d9` (feat)
2. **Task 2: Rewire ExportXmlAsync with preview-then-generate workflow** - `977858c` (feat)

## Files Created/Modified
- `backend/src/HIS.Infrastructure/Services/XmlExportService.cs` - XML file generation for 14 BHXH tables (~560 lines)
- `backend/src/HIS.Infrastructure/Services/XmlSchemaValidator.cs` - XSD schema validation with graceful degradation (~130 lines)
- `backend/src/HIS.API/wwwroot/xsd/bhxh/README.txt` - Instructions for hospital admin to obtain XSD files
- `backend/src/HIS.Infrastructure/Services/InsuranceXmlService.cs` - Rewired ExportXmlAsync + added PreviewExportAsync + DownloadXmlFileAsync
- `backend/src/HIS.Application/Services/IInsuranceXmlService.cs` - Added PreviewExportAsync method signature
- `backend/src/HIS.Application/DTOs/Insurance/InsuranceXmlDTOs.cs` - Added XmlExportPreviewDto and XmlTablePreview
- `backend/src/HIS.API/Controllers/InsuranceXmlController.cs` - Added preview endpoint
- `backend/src/HIS.Infrastructure/DependencyInjection.cs` - Registered XmlExportService and XmlSchemaValidator

## Decisions Made
- **XmlExportService as Singleton:** Stateless service generating XML bytes from DTO lists. No per-request state needed.
- **XSD path from AppDomain.CurrentDomain.BaseDirectory:** Infrastructure project cannot reference Microsoft.AspNetCore.Hosting for IWebHostEnvironment. Using BaseDirectory resolves correctly at runtime.
- **FacilityCode fallback to '00000':** Allows development and testing without real BHXH credentials configured.
- **DownloadXmlFileAsync uses filesystem search:** Finds most recent batch folder rather than requiring a database batch table. Simple and sufficient for current needs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed IWebHostEnvironment reference in DependencyInjection.cs**
- **Found during:** Task 1 (DI registration for XmlSchemaValidator)
- **Issue:** Plan suggested using IWebHostEnvironment to get WebRootPath, but HIS.Infrastructure doesn't reference Microsoft.AspNetCore.Hosting assembly
- **Fix:** Used AppDomain.CurrentDomain.BaseDirectory combined with "wwwroot/xsd/bhxh" relative path instead
- **Files modified:** backend/src/HIS.Infrastructure/DependencyInjection.cs
- **Verification:** Build passes with 0 errors
- **Committed in:** de1a1d9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for compilation. No scope creep. Runtime path resolution is equivalent.

## Issues Encountered
- API project DLL build locked by running HIS.API process (PID 23500). Verified code correctness by building Application and Infrastructure projects individually (both 0 errors). Same file-lock issue as Plan 01-01 and 01-02.

## User Setup Required

None for basic operation. XSD validation is optional:
1. Obtain official BHXH XSD schema files from provincial BHXH office
2. Place .xsd files in `wwwroot/xsd/bhxh/` folder
3. Restart application (schemas loaded at startup)
4. Without XSD files, validation is gracefully skipped with a warning log

## Next Phase Readiness
- XML export pipeline is complete: data extraction (Plan 02) -> XML generation -> validation -> file output
- Plan 04 (frontend UI) can call preview endpoint to show table counts before export
- Plan 04 can call export endpoint and download ZIP of generated files
- XSD validation infrastructure ready for when hospital obtains official schema files

## Self-Check: PASSED

- All 8 created/modified files exist on disk
- Both task commits verified in git log (de1a1d9, 977858c)

---
*Phase: 01-bhxh-gateway-xml4210*
*Completed: 2026-02-28*
