---
name: his-be-external-gateway
description: Use this skill when integrating HIS with an external Vietnamese healthcare gateway over HTTP — National Prescription / National Pharmacy / De An 06 / Zalo OA / BHXH / DQGVN / HL7 FHIR / SMS gateways. Triggers include "integrate the [X] gateway", wiring a typed HttpClient via IHttpClientFactory, MockMode dev/prod split, ApiKey/AccessToken via env var, config stored in SystemConfig, retry + circuit breaker, idempotency key, or status Submitted/Acknowledged/Failed. Do NOT use for payment gateways (use his-be-payment-gateway) or a generic CRUD service (his-be-module-scaffold).
metadata:
  type: project
---

# HIS External Gateway Integration

Standardizing how to connect HIS to a VN healthcare **external gateway** over HTTP. Different from `his-be-payment-gateway`
(VietQR/VNPay/MoMo — with their own IPN/QR flow). This is a "submit + ack" gateway: send a payload (JSON/XML) →
get a transaction id or an error → store the status → retry if stuck.

## When to use
- Add/edit a client calling a national gateway (Prescription, Pharmacy), De An 06 (driving GCS/GBT/health-check),
  Zalo ZNS, BHXH, DQGVN, HL7 FHIR/CDA, SMS.
- Configuring MockMode, env-var key/token, config store, retry worker, circuit breaker.

## When NOT to use
- Payment/QR/IPN → `his-be-payment-gateway`.
- A normal internal business service (no external HTTP call) → `his-be-module-scaffold`.

## Sample code locations (read before writing)
- `HIS.Infrastructure/Services/External/NangCap23HttpClients.cs` — `GatewayHttpHelper.PostWithRetryAsync` (the best reference)
- `HIS.Infrastructure/Services/BhxhGatewayClient.cs`, `DqgvnService.cs`, `SmsService.cs`, `FhirClientService.cs`
- Interface at `HIS.Application/Services/INangCap23GatewayClients.cs`
- Register the typed HttpClient + `IHttpClientFactory` in `HIS.Infrastructure/DependencyInjection.cs`

## Standard pattern (follow `NangCap23HttpClients.cs`)
1. **A typed client per gateway** registered via `services.AddHttpClient<IXxxClient, XxxClient>(c => { c.BaseAddress=...; c.Timeout=...; })`
   so timeout/headers are isolated per gateway.
2. **`GatewaySubmissionResult`** returns uniformly: `{ Acknowledged, TransactionId, RawResponse, ErrorCode, ErrorMessage }`.
3. **Retry**: `maxAttempts` from config `NationalGateway:RetryCount` (default 3), backoff 1s/2s/4s.
   - **4xx** → do NOT retry (the gateway rejected the content), `ErrorCode=HTTP_4xx`.
   - **5xx / network / timeout** → retry; `ErrorCode=NETWORK_ERROR`/`TIMEOUT`/`HTTP_5xx`.
4. **`contentFactory: Func<HttpContent>`** — create a NEW `HttpContent` each attempt. ⚠️ HttpClient disposes the
   content after attempt 1 → reusing the old content = `ObjectDisposedException`.
5. **Idempotency**: send an `X-Idempotency-Key` header (same business op = same key) so the gateway dedupes if supported.
6. **Parse transactionId** flexibly: try `transactionId`/`ticketNumber`/`submissionId`/`messageId`, fall back to the first 40 chars.
7. **Truncate** the body before storing it in the DB (`TruncateForStorage`/`TruncateForMessage`).

## MockMode (MANDATORY dev/prod split)
- `appsettings.json` (prod): `MockMode: false`, real URL, `ApiKey`/`AccessToken` = an **empty string** (filled via env).
- `appsettings.Development.json`: `MockMode: true` → InMemory fakes, no network calls (E2E tests can run).
- On prod set via env var: `NationalGateway__MockMode=false`, `NationalGateway__Prescription__ApiKey=...`,
  `Zalo__AccessToken=...`, `Zalo__OaId=...` (see `his-ops-deploy`). **Do NOT commit a secret to appsettings** (see `his-qa-anti-pattern`).

## Config store
- Gateway config that can be edited at runtime → store in `SystemConfig` with a prefix (e.g. `"BHXH."`), read via
  `INangCap23ConfigStore`/`NangCap23ConfigStore`. Has a validator (`Nangcap23ConfigValidator`).

## Submission record status
`Status`: **1=Submitted** (sent, not yet acked — may be stuck) · **2=Acknowledged** · **3=Failed (4xx, no retry)**.
A stuck row (Status=1, RetryCount<max) is rescanned by a **Retry Worker** → use it with `his-be-background-worker`
(`Nangcap23RetryWorker`). Circuit breaker: `ErrorCode=CIRCUIT_OPEN`, config `CircuitBreakerThreshold`/`CircuitBreakerDurationSeconds`.

## Checklist
- [ ] Interface in `HIS.Application/Services`, impl in `HIS.Infrastructure/Services/External`
- [ ] `AddHttpClient<>` in `DependencyInjection.cs` (don't forget → DI 500, see `his-qa-anti-pattern`)
- [ ] MockMode true (dev) / false (prod); key/token empty in appsettings, set via env on prod
- [ ] `contentFactory` creates new content each attempt; send `X-Idempotency-Key`
- [ ] State 1/2/3 + retry worker for stuck rows
- [ ] `dotnet build` 0 errors; deploy `his-ops-deploy` (manual Cloud Run)

## Dependency
`core-types-contract` (request/response DTO) → `his-be-module-scaffold` (DI, layer) →
`his-be-background-worker` (retry) → `his-qa-anti-pattern` (no hardcoded secret, don't forget DI). Deploy: `his-ops-deploy`.

## When to update
- When adding a new external gateway, changing the MockMode/retry mechanism, or when the SystemConfig config convention changes.
