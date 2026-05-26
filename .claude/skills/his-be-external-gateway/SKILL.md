---
name: his-be-external-gateway
description: Use this skill when integrating HIS with an external Vietnamese healthcare gateway over HTTP — cổng Đơn thuốc QG / Dược QG / Đề án 06 / Zalo OA / BHXH / DQGVN / HL7 FHIR / SMS. Triggers include "tích hợp cổng [X]", wiring a typed HttpClient via IHttpClientFactory, MockMode dev/prod split, ApiKey/AccessToken qua env var, config lưu trong SystemConfig, retry + circuit breaker, idempotency key, hoặc status Submitted/Acknowledged/Failed. Do NOT use for payment gateways (dùng his-be-payment-gateway) hay generic CRUD service (his-be-module-scaffold).
metadata:
  type: project
---

# HIS External Gateway Integration

Chuẩn hoá cách nối HIS với **cổng ngoài** của ngành y tế VN qua HTTP. Khác `his-be-payment-gateway`
(VietQR/VNPay/MoMo — có flow IPN/QR riêng). Đây là cổng "submit + ack": gửi payload (JSON/XML) →
nhận transaction id hoặc lỗi → lưu trạng thái → retry nếu treo.

## Khi nào dùng
- Thêm/sửa client gọi cổng QG (Đơn thuốc, Dược), Đề án 06 (GCS/GBT/KSK lái xe), Zalo ZNS,
  BHXH, DQGVN, HL7 FHIR/CDA, SMS.
- Cấu hình MockMode, env var key/token, config store, retry worker, circuit breaker.

## Khi nào KHÔNG dùng
- Thanh toán/QR/IPN → `his-be-payment-gateway`.
- Service nghiệp vụ nội bộ thường (không gọi HTTP ngoài) → `his-be-module-scaffold`.

## Vị trí code mẫu (đọc trước khi viết)
- `HIS.Infrastructure/Services/External/NangCap23HttpClients.cs` — `GatewayHttpHelper.PostWithRetryAsync` (chuẩn nhất)
- `HIS.Infrastructure/Services/BhxhGatewayClient.cs`, `DqgvnService.cs`, `SmsService.cs`, `FhirClientService.cs`
- Interface ở `HIS.Application/Services/INangCap23GatewayClients.cs`
- Đăng ký typed HttpClient + `IHttpClientFactory` trong `HIS.Infrastructure/DependencyInjection.cs`

## Pattern chuẩn (bám `NangCap23HttpClients.cs`)
1. **Typed client per cổng** đăng ký qua `services.AddHttpClient<IXxxClient, XxxClient>(c => { c.BaseAddress=...; c.Timeout=...; })`
   để timeout/headers cô lập từng cổng.
2. **`GatewaySubmissionResult`** trả về thống nhất: `{ Acknowledged, TransactionId, RawResponse, ErrorCode, ErrorMessage }`.
3. **Retry**: `maxAttempts` từ config `NationalGateway:RetryCount` (default 3), backoff 1s/2s/4s.
   - **4xx** → KHÔNG retry (cổng từ chối nội dung), `ErrorCode=HTTP_4xx`.
   - **5xx / network / timeout** → retry; `ErrorCode=NETWORK_ERROR`/`TIMEOUT`/`HTTP_5xx`.
4. **`contentFactory: Func<HttpContent>`** — tạo `HttpContent` MỚI mỗi attempt. ⚠️ HttpClient dispose
   content sau attempt 1 → tái dùng content cũ = `ObjectDisposedException`.
5. **Idempotency**: gửi header `X-Idempotency-Key` (cùng business op = cùng key) để cổng dedupe nếu hỗ trợ.
6. **Parse transactionId** linh hoạt: thử `transactionId`/`ticketNumber`/`submissionId`/`messageId`, fallback 40 ký tự đầu.
7. **Truncate** body trước khi lưu DB (`TruncateForStorage`/`TruncateForMessage`).

## MockMode (BẮT BUỘC tách dev/prod)
- `appsettings.json` (prod): `MockMode: false`, URL thật, `ApiKey`/`AccessToken` = **chuỗi rỗng** (điền qua env).
- `appsettings.Development.json`: `MockMode: true` → InMemory fakes, không gọi mạng (E2E test chạy được).
- Trên prod set qua env var: `NationalGateway__MockMode=false`, `NationalGateway__Prescription__ApiKey=...`,
  `Zalo__AccessToken=...`, `Zalo__OaId=...` (xem `his-ops-deploy`). **KHÔNG commit secret vào appsettings** (xem `his-qa-anti-pattern`).

## Config store
- Cấu hình cổng có thể chỉnh runtime → lưu `SystemConfig` với prefix (vd `"BHXH."`), đọc qua
  `INangCap23ConfigStore`/`NangCap23ConfigStore`. Có validator (`Nangcap23ConfigValidator`).

## Trạng thái bản ghi gửi cổng
`Status`: **1=Submitted** (đã gửi, chưa ack — có thể treo) · **2=Acknowledged** · **3=Failed (4xx, không retry)**.
Row treo (Status=1, RetryCount<max) được **Retry Worker** quét lại → dùng kèm `his-be-background-worker`
(`Nangcap23RetryWorker`). Circuit breaker: `ErrorCode=CIRCUIT_OPEN`, config `CircuitBreakerThreshold`/`CircuitBreakerDurationSeconds`.

## Checklist
- [ ] Interface ở `HIS.Application/Services`, impl ở `HIS.Infrastructure/Services/External`
- [ ] `AddHttpClient<>` trong `DependencyInjection.cs` (đừng quên → DI 500, xem `his-qa-anti-pattern`)
- [ ] MockMode true (dev) / false (prod); key/token rỗng trong appsettings, set qua env prod
- [ ] `contentFactory` tạo content mới mỗi attempt; gửi `X-Idempotency-Key`
- [ ] State 1/2/3 + retry worker cho row treo
- [ ] `dotnet build` 0 error; deploy `his-ops-deploy` (Cloud Run thủ công)

## Dependency
`core-types-contract` (DTO request/response) → `his-be-module-scaffold` (DI, layer) →
`his-be-background-worker` (retry) → `his-qa-anti-pattern` (không hardcode secret, không quên DI). Deploy: `his-ops-deploy`.

## When to update
- Khi thêm cổng ngoài mới, đổi cơ chế MockMode/retry, hoặc convention config trong SystemConfig thay đổi.
