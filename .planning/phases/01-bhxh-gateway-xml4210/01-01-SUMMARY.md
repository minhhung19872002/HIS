---
phase: 01-bhxh-gateway-xml4210
plan: 01
subsystem: api
tags: [bhxh, insurance, gateway, polly, resilience, mock-client, http-client]

# Dependency graph
requires: []
provides:
  - IBhxhGatewayClient interface with 7 methods for BHXH portal communication
  - BhxhGatewayClient real HTTP implementation with token management and Polly resilience
  - BhxhGatewayMockClient with realistic Vietnamese test data for development
  - BhxhGatewayOptions configuration POCO bound to appsettings.json
  - BhxhGatewayDTOs request/response types with BHXH date format helper
  - InsuranceXmlService rewired to delegate all gateway calls through IBhxhGatewayClient
  - Graceful degradation on gateway failures (warning log + fallback response)
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added: [Microsoft.Extensions.Http.Polly 9.0.0]
  patterns: [gateway abstraction with mock/real toggle, conditional DI registration, Polly retry + circuit breaker, graceful degradation on external service failure]

key-files:
  created:
    - backend/src/HIS.Application/Services/IBhxhGatewayClient.cs
    - backend/src/HIS.Application/DTOs/Insurance/BhxhGatewayDTOs.cs
    - backend/src/HIS.Infrastructure/Configuration/BhxhGatewayOptions.cs
    - backend/src/HIS.Infrastructure/Services/BhxhGatewayClient.cs
    - backend/src/HIS.Infrastructure/Services/BhxhGatewayMockClient.cs
  modified:
    - backend/src/HIS.Infrastructure/DependencyInjection.cs
    - backend/src/HIS.Infrastructure/Services/InsuranceXmlService.cs
    - backend/src/HIS.Application/Services/IInsuranceXmlService.cs
    - backend/src/HIS.API/appsettings.json
    - backend/src/HIS.Infrastructure/HIS.Infrastructure.csproj

key-decisions:
  - "UseMock=true by default - real client activated only when BHXH credentials are configured"
  - "Polly retry (exponential backoff 3 retries) + circuit breaker (5 failures, 30s open) for real client"
  - "Thread-safe token refresh with SemaphoreSlim and double-check pattern"
  - "Graceful degradation: gateway failure returns fallback response, never blocks patient workflow"
  - "Mock client recognizes special insurance numbers (INVALID, EXPIRED) for edge case testing"

patterns-established:
  - "Gateway Abstraction: external service calls through interface with mock/real toggle via config"
  - "Graceful Degradation: try/catch around gateway calls, log warning, return safe fallback"
  - "BHXH Date Format: use BhxhDateHelper.ToBhxhDate() for yyyyMMddHHmm format"
  - "Conditional DI: check config flag to register mock vs real implementation"

requirements-completed: [BHXH-01, BHXH-02, BHXH-03, BHXH-04, BHXH-05]

# Metrics
duration: 7min
completed: 2026-02-28
---

# Phase 01 Plan 01: BHXH Gateway Client Summary

**IBhxhGatewayClient abstraction with mock/real implementations, Polly resilience, and InsuranceXmlService rewired to delegate all 10 gateway operations through the client**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-28T06:15:19Z
- **Completed:** 2026-02-28T06:22:25Z
- **Tasks:** 2/2
- **Files modified:** 10

## Accomplishments
- Created IBhxhGatewayClient interface with 7 methods (token, verify card, treatment history, submit costs, get assessment, test connection, check-in)
- Created BhxhGatewayClient real HTTP implementation with thread-safe token management, proactive token refresh, and structured logging
- Created BhxhGatewayMockClient returning realistic Vietnamese data (4 hospital visit records, 50 assessment records with 80/20 accept/reject ratio, edge cases for INVALID/EXPIRED cards)
- Configured Polly retry (exponential backoff) and circuit breaker (5-failure threshold) for production resilience
- Rewired all 10 gateway-dependent methods in InsuranceXmlService to delegate through IBhxhGatewayClient
- Added graceful degradation: gateway failures log warnings and return safe fallback responses (never block patient workflow)
- Added optional OTP parameter to GetInsuranceHistoryAsync for BHXH treatment history lookup

## Task Commits

Each task was committed atomically:

1. **Task 1: Create IBhxhGatewayClient interface, DTOs, configuration, and both client implementations** - `3c43b43` (feat)
2. **Task 2: Rewire InsuranceXmlService to use IBhxhGatewayClient for all gateway operations** - `cd6c36f` (feat)

## Files Created/Modified
- `backend/src/HIS.Application/Services/IBhxhGatewayClient.cs` - Gateway abstraction interface with 7 methods
- `backend/src/HIS.Application/DTOs/Insurance/BhxhGatewayDTOs.cs` - Request/response DTOs + BhxhDateHelper utility
- `backend/src/HIS.Infrastructure/Configuration/BhxhGatewayOptions.cs` - Configuration POCO for appsettings.json binding
- `backend/src/HIS.Infrastructure/Services/BhxhGatewayClient.cs` - Real HTTP client with token management (~170 lines)
- `backend/src/HIS.Infrastructure/Services/BhxhGatewayMockClient.cs` - Mock client with realistic Vietnamese data (~210 lines)
- `backend/src/HIS.Infrastructure/DependencyInjection.cs` - Conditional DI registration with Polly policies
- `backend/src/HIS.Infrastructure/Services/InsuranceXmlService.cs` - Rewired 10 methods to use gateway client
- `backend/src/HIS.Application/Services/IInsuranceXmlService.cs` - Added optional OTP parameter
- `backend/src/HIS.API/appsettings.json` - Added BhxhGateway configuration section
- `backend/src/HIS.Infrastructure/HIS.Infrastructure.csproj` - Added Microsoft.Extensions.Http.Polly package

## Decisions Made
- **UseMock=true by default:** Real client activated only when hospital obtains BHXH credentials from provincial office. This allows all frontend development and testing to proceed immediately.
- **Polly configuration:** 3 retries with exponential backoff (2s, 4s, 8s) + circuit breaker (5 consecutive failures opens for 30s). Conservative settings appropriate for external government API.
- **Thread-safe token refresh:** SemaphoreSlim with double-check pattern prevents multiple concurrent token refresh requests under load.
- **Graceful degradation pattern:** Every gateway-dependent method wraps calls in try/catch, logs warning, returns safe fallback. VerifyInsuranceCardAsync returns DuDkKcb=false with explanation message. CheckInsuranceValidityAsync returns true to avoid blocking workflow.
- **Mock edge cases:** Special insurance numbers containing "INVALID" or "EXPIRED" trigger corresponding failure scenarios for comprehensive frontend testing.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- API project DLL build locked by running HIS.API process (PID 23500). Verified code correctness by building Application and Infrastructure projects individually (both 0 errors). The API project build error is a file-lock issue, not a code error.

## User Setup Required

None - UseMock=true by default. When hospital obtains real BHXH credentials:
1. Set `BhxhGateway.UseMock` to `false` in appsettings.json
2. Fill in `Username`, `Password`, `FacilityCode` fields
3. Verify with `POST /api/insurance/test-connection`

## Next Phase Readiness
- IBhxhGatewayClient is available for all downstream plans in Phase 01
- Plan 02 (XML 4210 generation) can use the gateway client for real-time data
- Plan 03 (frontend UI) can test against mock client with realistic data
- Plan 04 (XML signing) can use the submit endpoint for signed XML submission

---
*Phase: 01-bhxh-gateway-xml4210*
*Completed: 2026-02-28*
