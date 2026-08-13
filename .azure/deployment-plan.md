# HIS Production Deployment Plan

**Status:** Ready for Validation
**Last Updated:** 2026-08-14 (Asia/Ho_Chi_Minh)

## 1. Objective

Deploy verified NangCap27 fixes to the existing HIS production frontend and backend, then run the complete production regression matrix.

## 2. Existing Environment

- Mode: MODIFY existing production deployment
- Frontend: Vercel Git integration, production alias `https://his-psi.vercel.app`
- Backend: Azure Container Apps `his-api`, FQDN `his-api.thankfulcoast-bd0486a9.southeastasia.azurecontainerapps.io`
- Azure subscription: `Azure subscription 1` (`c8f2432f-6ab7-48df-be40-64ce06bb7ba2`)
- Tenant: `12cecf20-e0d8-49b5-8961-50850c8ef336`
- Resource group / region: `rg-his` / Southeast Asia
- Current backend baseline: revision `his-api--0000029`, image `ghcr.io/minhhung19872002/his-api:20260813-195917-3af1eb3`, provisioning `Succeeded`

## 3. Components and Deployment Recipe

- Frontend recipe: push `main` to `minhhung19872002/HIS`; the existing Vercel Git integration builds and promotes the frontend.
- Backend recipe: push `main`; `.github/workflows/deploy-backend.yml` runs the .NET test gate, builds/pushes a commit-tagged GHCR image, updates the existing Container App, and smoke-tests login.
- Post-deploy recipe: `.github/workflows/e2e-prod-smoke.yml` runs automatically after the Azure workflow succeeds and targets the Azure API plus the Vercel production alias.
- Infrastructure changes: none. No resource, identity, RBAC, network, database schema, SKU, or quota changes are required.
- Quota/capacity validation: not applicable because the deployment only replaces application revisions in existing services.

## 4. Pre-deployment Gates

- [x] Full requirement matrix established: 779 rows across 25 functional groups.
- [x] Production defects reproduced: doctor roster API 404; employee menu reached patient self-service APIs with a staff token.
- [x] Relevant fixes covered by backend and frontend regression tests.
- [x] Frontend production build passes (`npm run build`, 2026-08-14).
- [x] Frontend unit tests pass (40/40, 2026-08-14).
- [x] Backend tests pass (20 passed, 1 DICOM-dependent test skipped, 2026-08-14).
- [x] Deployment configuration and current Azure target inspected.
- [x] User explicitly requested push, production deploy, and post-deploy retest.

## 5. Deployment Steps

1. Commit only the verified application/test/workflow changes; preserve the user-provided requirement document as an untracked source artifact.
2. Push the commit to `origin/main`.
3. Monitor the backend Azure workflow and frontend Vercel deployment to successful completion.
4. Confirm the Container App revision uses the image tagged with the new commit SHA and reports `Succeeded`.
5. Run production health/login, API business regression, all-route UI scan, representative CRUD, and the two repaired portal flows.
6. If a regression is found, fix it and repeat this sequence.

## 6. Post-deployment Verification

- Backend health and login return HTTP 200.
- `GET /api/medicalhr/staff/{loginUserId}/roster?year=2026&month=8` returns HTTP 200 and an array.
- Invalid roster query parameters (for example `month=13`) return HTTP 400, never HTTP 500.
- `/v2/doctor-portal` → `Lịch trực` loads without HTTP 4xx/5xx or page errors.
- Employee portal navigation resolves to `/v2/patient-portal-staff`, not the patient self-service route.
- Existing 106-route conformance scan, 23 representative CRUD interactions, critical API smoke, and NangCap27 print regression remain green.

## 7. Validation Proof

- Read-only Azure discovery succeeded with `az account show` and `az containerapp show` on 2026-08-14.
- Existing target is healthy: provisioning state `Succeeded`; current revision `his-api--0000029`.
- Repository workflow targets `rg-his/his-api`, uses OIDC, tests before deploy, and performs a production login smoke check.
- Local code gates: backend 20/20 runnable tests passed; frontend 40/40 unit tests passed; TypeScript + Vite production build passed.
- Repository-wide lint is not a release gate and currently has 188 pre-existing errors outside these changes. Changed production source files pass targeted lint; no new lint error was introduced.

## 8. Rollback

- Frontend: promote the previous Ready Vercel deployment/commit back to the production alias.
- Backend: activate the previous healthy revision `his-api--0000029` (or update `his-api` back to image tag `20260813-195917-3af1eb3`).
- Data rollback: none required; this change adds a read-only endpoint and corrects navigation only.
