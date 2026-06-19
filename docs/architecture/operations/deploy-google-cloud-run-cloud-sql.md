# Deploy HIS API to Google Cloud Run + Cloud SQL for SQL Server

This repo is now prepared for the practical topology below:

- Frontend: `Vercel`
- API: `Cloud Run`
- Database: `Cloud SQL for SQL Server`
- Existing data: restore from `backup/HIS.bak`

## Why this path fits this repo

- The backend already targets `SQL Server`.
- The repo already includes a backend Dockerfile at `backend/src/HIS.API/Dockerfile`.
- The repo already includes a database backup at `backup/HIS.bak`.
- The frontend already knows how to proxy HTTP calls through Vercel with `HIS_BACKEND_URL`.

## What was added

- `backend/cloudbuild.yaml`: builds the backend image in Cloud Build from the existing Dockerfile.
- `backend/.gcloudignore`: trims uploaded build context.
- `scripts/deploy-google-cloud.ps1`: creates the main GCP resources and deploys the API.

## Important deployment choices

- `Cloud SQL` is created with a private IP.
- `Cloud Run` uses Direct VPC egress with `private-ranges-only`.

This is intentional:

- The SQL Server host sits on a private RFC1918 address, so Cloud Run can reach it through the VPC.
- External internet calls still go out normally, which avoids needing Cloud NAT for public APIs.

- `PACS` and `HL7` are disabled in Cloud Run via env vars.

This is also intentional:

- `Orthanc` is not being deployed in this path.
- `HL7` opens a raw TCP listener, which is not part of a typical public Cloud Run deployment.

## Prerequisites

- A Google Cloud project with billing enabled.
- `gcloud` installed and authenticated.
- IAM that can create Cloud Run, Cloud SQL, Artifact Registry, Cloud Build, Storage, and VPC private service access resources.

Official references used:

- Cloud SQL instance creation: https://cloud.google.com/sql/docs/sqlserver/create-instance
- Cloud Run with Cloud SQL for SQL Server quickstart: https://cloud.google.com/sql/docs/sqlserver/connect-instance-cloud-run
- Direct VPC egress: https://cloud.google.com/run/docs/configuring/vpc-direct-vpc
- BAK import: https://cloud.google.com/sql/docs/sqlserver/import-export/import-export-bak
- Cloud Run .NET deploy: https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-dotnet-service

## One-command deployment

From the repo root:

```powershell
.\scripts\deploy-google-cloud.ps1 `
  -ProjectId "<your-gcp-project-id>" `
  -FrontendOrigins "https://<your-vercel-domain>" `
  -JwtKey "<long-random-secret-at-least-32-chars>" `
  -SqlPassword "<strong-sqlserver-password>"
```

Defaults:

- Region: `asia-southeast1`
- Network/Subnet: `default`
- Cloud Run service: `his-api`
- Cloud SQL instance: `his-sql`
- Database name: `HIS`
- Backup file: `backup/HIS.bak`

## What the script does

1. Enables the required APIs.
2. Creates the Artifact Registry Docker repository if missing.
3. Allocates private service access on the chosen VPC if missing.
4. Creates a `Cloud SQL for SQL Server 2022 Standard` instance on private IP.
5. Sets the password for the default `sqlserver` login.
6. Uploads `backup/HIS.bak` to Cloud Storage.
7. Grants the Cloud SQL service account read access to that bucket.
8. Imports the BAK into the `HIS` database.
9. Builds and pushes the backend container image with Cloud Build.
10. Deploys Cloud Run with:
   - port `8080`
   - startup probe on `/health/ready`
   - `HL7__Enabled=false`
   - `PACS__Enabled=false`
   - `BhxhGateway__UseMock=true`

## After deployment

Set these variables in Vercel:

```text
HIS_BACKEND_URL=https://<your-cloud-run-url>
VITE_REALTIME_URL=https://<your-cloud-run-url>
```

Keep `VITE_API_URL` unset if you want the current `/api` proxy route on Vercel to stay in use.

## Health checks

Use these endpoints:

- `GET /health`
- `GET /health/ready`

The deploy script configures the Cloud Run startup probe to call:

```text
/health/ready
```

## Notes

- This path restores the existing SQL Server backup instead of relying on EF migrations to recreate every table.
- The deploy script intentionally does not enable SQL Server `require-ssl`. The current app uses a direct TCP connection over the private VPC path. If you want strict SQL Server TLS verification, that needs a follow-up change in the app configuration.
- Cloud SQL for SQL Server is managed, but it is not free beyond trial credits.
