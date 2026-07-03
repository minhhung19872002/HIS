# Skill-routes · BE + DB TIER (Backend / Database)

> Sub-map — read it **TOGETHER WITH** `.claude/SKILL-MAP.md`. For the CORE principles (choose when) see (1a) in SKILL-MAP.
> Every chain: **core-* first → his-* after**. Every code-gen INCLUDES `core-reusable-code` + `core-clean-code` + `his-qa-anti-pattern`.
> **★ REUSE-FIRST (MANDATORY):** before creating a new Service/Controller/Entity/DTO/helper/table → **check whether it already exists**
> (grep `HIS.Infrastructure/Services`, `HIS.API/Controllers`, `HIS.Core/Entities`, `Application/DTOs`, `scripts/`).
> Already there → **reuse / extend** the existing service/DTO/table, do NOT duplicate.
> **★ SELF-REVIEW (MANDATORY, before reporting done):** self-review 9 points for BE code — duplicate logic · dead code ·
> hard-code · anti-pattern (forgotten DI / swallowed exception) · too-large service-controller · too-long method · circular
> namespace/project-ref · naming · **stateless** service + correct DI lifetime. Detail: `his-qa-anti-pattern` #30.
> + **BUILD-GATE:** `cd backend && dotnet build HIS.sln` → 0 errors before reporting done (#27).

## BE/DB skills (`his-be-*`, `his-db-*`)

| Skill | Purpose | Choose when the request involves |
|---|---|---|
| `his-be-module-scaffold` | Entity/DTO/Service/Controller + DI | add a module/service/controller |
| `his-db-migration` | SQL Server tables, idempotent `NN_*.sql` script | create/edit/seed a table |
| `his-be-payment-gateway` | VietQR/VNPay/MoMo/ZaloPay + bank confirm + Receipt | payment, EMVCo QR, IPN, `/api/payment/*` |
| `his-be-external-gateway` | external gateway HttpClient + MockMode + retry + config store | integrate the national/BHXH/Zalo/DQGVN/FHIR/SMS gateway |
| `his-be-background-worker` | BackgroundService + scope + interval + idempotent | a worker/background job, retry worker, worklist scanner |
| `his-be-scalability` | load handling: query (pagination/AsNoTracking/N+1/index), Redis cache, Cloud Run autoscale, rate limit | peak-hour overload, slow API when busy, sizing 100 vs 1000 users |

## Prompt → skill chain (BE/DB) + PATH

| When the developer prompts | Skills (core → his, in order) | Files/paths touched |
|---|---|---|
| "add backend module [X]" | `core-architecture-follow` → `core-types-contract` → `core-reusable-code` → `his-be-module-scaffold` → `his-db-migration` → `his-qa-anti-pattern` | `HIS.Core/Entities`, `HIS.Application`, `HIS.Infrastructure/Services` + `DependencyInjection.cs`, `Data/Scripts/NN_*.sql`, `HIS.API/Controllers` |
| "create/edit table [X]" | `core-types-contract` → `his-db-migration` | `Data/Scripts/NN_*.sql` |
| "payment / VietQR QR / bank confirm [X]" | `core-types-contract` → `core-validation-pattern` → `his-be-payment-gateway` (+ `his-fe-page-v2` for UI) | `PaymentGatewayService*.cs`, `/api/payment/*`, `pages-v2/BankPayments.tsx` |
| "integrate national/BHXH/Zalo/SMS/FHIR gateway [X]" | `core-types-contract` → `his-be-external-gateway` (+ `his-be-background-worker` for retry) → `his-qa-anti-pattern` | `HIS.Infrastructure/Services/External/*`, `DependencyInjection.cs`, appsettings (MockMode + env) |
| "background worker/job / auto scan-and-resend [X]" | `core-architecture-follow` → `his-be-background-worker` → `his-qa-anti-pattern` | `HIS.Infrastructure/Services/Workers/*`, `AddHostedService` in `DependencyInjection.cs` |
| "realtime / hub / push notification (BE part)" | `his-fs-realtime-signalr` (Hub + IHubContext + JWT query-string auth) | `HIS.API/Hubs/*`, `Program.cs` (also see fe.md for the client) |
| "load / concurrent users / overload [X]" | `core-impact-analysis` → `his-be-scalability` (+ `his-db-migration` for indexes, `his-ops-deploy` for Cloud Run) | query (Skip/Take/AsNoTracking/Include), Redis catalog cache, `gcloud run` concurrency/min/max, connection string `Max Pool Size` |

## Conflict (BE/DB)
- EF migration vs SQL script: **ALWAYS hand-written SQL script** (`his-db-migration`) — the project IGNOREs pending model changes.
- Generic CRUD vs external gateway vs worker vs payment: route to the right specialized skill (see the "Choose when" column).
- "don't forget DI / don't hardcode": source of truth `his-qa-anti-pattern`.
