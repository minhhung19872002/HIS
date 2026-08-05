# PACS deployment and verification

## Local integration environment

1. Set unique `PACS_USERNAME` and `PACS_PASSWORD` in the ignored root `.env`.
2. Back up `his_orthanc_data` before changing the pinned Orthanc version.
3. Start `docker compose up -d orthanc sqlserver redis`.
4. Configure the API with matching `PACS__Username`, `PACS__Password`, `PACS__IpAddress`,
   `PACS__AETitle`, and `PACS__CallingAETitle` values.
5. Register each test modality in RIS with exact AE Title, IP, port, MWL and MPPS capabilities.
6. Configure `PACS__CaptureAllowedRoots__0...n` to dedicated, access-controlled ingest folders.
   Media outside these roots, non-DICOM media, missing UIDs, and PatientID mismatch are rejected.

Default local bindings expose Orthanc REST only on `127.0.0.1:8043` and DICOM on
`127.0.0.1:4243`, because this workstation already runs a separate native Orthanc service on
8042/4242. Override `ORTHANC_REST_HOST_PORT`/`ORTHANC_DICOM_HOST_PORT`; production must also set
`ORTHANC_DICOM_BIND_IP` to the imaging VLAN interface.

## Mandatory evidence commands

The release record must retain output/log IDs for:

- C-ECHO from HIS to primary PACS and every remote PACS.
- MWL C-FIND from a modality simulator with Scheduled Station AE filtering.
- MPPS N-CREATE (`IN PROGRESS`) and N-SET (`COMPLETED`, `DISCONTINUED`).
- C-STORE of a multi-instance study, followed by destination Study UID and instance-count verification.
- Failed C-STORE proving the transmission log remains `failed` and contains the peer error.
- Concurrent auto-send proving one active/successful transmission per rule/study.
- Backup restore into an isolated environment and pixel-level/viewer verification.

## Production topology requirements

- Keep Orthanc REST private behind the HIS backend/reverse proxy.
- Restrict DICOM ports to modality/PACS addresses at the firewall.
- Use a PostgreSQL Orthanc index and redundant encrypted storage.
- Use DICOM TLS for cross-site transport or an approved mutually authenticated VPN.
- Terminate deployment if production still uses development PACS credentials.
- Do not use sample DICOM data as clinical acceptance evidence.
- Run the DICOM AE services on an on-premises/VM/container host with routable raw TCP to the imaging
  VLAN. Vercel and a web-only Cloud Run service are not substitutes for this DICOM gateway.
- Pin the deployed image by digest, stage upgrades against a copied index/storage volume, and retain
  the image digest plus `/system` output in the release record.

## Current local verification state (2026-08-04)

- Backend Release build: passed with zero compile errors.
- Frontend production TypeScript/Vite build: passed.
- Pre-upgrade Orthanc volume snapshot:
  `backup/orthanc-pre-26.7.0-20260804-234506.tar.gz`.
- Orthanc image `26.7.0`: healthy; runtime Orthanc 1.12.11; Worklists 0.9.2; prior study count 1.
- Passed local automated protocol test: C-ECHO, MWL REST create + DICOM C-FIND, synchronous
  C-STORE with non-zero instance count, and on-arrival auto-send dedupe.
- Passed MPPS protocol test: N-CREATE `IN PROGRESS` then N-SET `COMPLETED`, persisted to exam/request.
- SQL startup repair verified: 8 new columns and both filtered unique indexes exist.
- Remote-vendor Q/R, Storage Commitment, DICOM TLS and multi-replica crash recovery still have no
  retained passing evidence. Do not promote on local-loopback success alone.

See [HOSPITAL_GRADE_ROADMAP.md](HOSPITAL_GRADE_ROADMAP.md) for the current release gate and
[DICOM_CONFORMANCE_STATEMENT.md](DICOM_CONFORMANCE_STATEMENT.md) for declared DICOM behavior.
