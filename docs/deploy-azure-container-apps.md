# Deploy HIS API to Azure Container Apps

This repo is now prepared to deploy the backend as a Docker container while keeping the frontend on Vercel.

## Recommended topology

- Frontend: `Vercel`
- API: `Azure Container Apps`
- Database: `Azure SQL Database` free offer

This is the most practical fit for the current stack because the backend already uses `SQL Server` via EF Core.

## Why this path

- No database engine migration is needed.
- The backend now persists ASP.NET Data Protection keys in SQL instead of local container storage.
- The backend now respects forwarded headers from a reverse proxy.
- CORS can now be configured with a single env var.
- The Dockerfile is included at `backend/src/HIS.API/Dockerfile`.

## 1. Create the database

Create an `Azure SQL Database` using the Azure portal and make sure the `Free offer applied!` banner appears.

Use the resulting SQL connection string in the API container:

```text
Server=tcp:<sql-server>.database.windows.net,1433;Initial Catalog=<database-name>;Persist Security Info=False;User ID=<sql-admin>;Password=<sql-password>;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

## 2. Build the backend image

From the repo root:

```powershell
docker build -f backend/src/HIS.API/Dockerfile -t his-api:latest backend
```

Push this image to your registry of choice, for example Azure Container Registry.

## 3. Configure the container app

Set the container port to `8080`.

Set these environment variables:

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=<azure-sql-connection-string>
CorsOriginsCsv=https://<your-vercel-domain>
Jwt__Key=<long-random-secret-at-least-32-chars>
Jwt__Issuer=HIS.API
Jwt__Audience=HIS.Client
PACS__Enabled=false
HL7__Enabled=false
```

Notes:

- `CorsOriginsCsv` can contain multiple origins separated by commas.
- `PACS__Enabled=false` is recommended unless you are also deploying Orthanc.
- `HL7__Enabled=false` disables the TCP listener that is not needed for a typical public web deployment.

## 4. Point Vercel to the deployed API

In the Vercel project, set:

```text
HIS_BACKEND_URL=https://<your-api-domain>
VITE_REALTIME_URL=https://<your-api-domain>
```

Keep `VITE_API_URL` unset if you want the existing `/api` proxy route to stay in use.

Important:

- SignalR hubs should connect directly to the backend origin via `VITE_REALTIME_URL`.
- The Vercel `/api` proxy is fine for HTTP API calls, but the realtime connection should not rely on the Vercel proxy path.

## 5. Health check

Use this path for readiness/liveness probes:

```text
/health/ready
```

Basic health endpoint:

```text
/health
```
