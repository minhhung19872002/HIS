# RIS/PACS hospital-grade roadmap

> Status date: 2026-08-04. This file is the authoritative implementation status.
> `Implemented` is not the same as `Verified`. A release item is complete only after an
> automated test and a real DICOM peer/vendor provide retained evidence.

## Non-negotiable rule

No PACS operation may synthesize success. `done`, `online`, or HTTP 200 must be backed by an
acknowledgement from the actual DICOM peer/Orthanc job and persisted with the real error on failure.

## Current verified baseline

- [x] Orthanc stores and returns a real CR DICOM instance.
- [x] V2 viewer renders the real pixel data through the authenticated HIS PACS proxy.
- [x] Study ZIP export and anonymized export return real DICOM archives.
- [x] Order/study patient mismatch is rejected instead of silently linking the wrong patient.
- [x] Target image 26.7.0 verified locally: Orthanc 1.12.11, Worklists 0.9.2, DICOMweb 1.23,
  OHIF 1.8; the pre-upgrade study remains present.
- [ ] Real modality/vendor acceptance test; existing data is a development sample.

## Phase 1 — real DICOM workflow

| Capability | Code | Runtime/integration evidence | Release state |
|---|---|---|---|
| Wire C-ECHO SCU via fo-dicom | Implemented | Local real-peer test passed | Vendor acceptance pending |
| Persistent MWL through Orthanc Worklists API | Implemented | REST create + DICOM C-FIND test passed | Vendor acceptance pending |
| MPPS SCP N-CREATE/N-SET + AE whitelist | Implemented | Real fo-dicom association/lifecycle test passed | Vendor acceptance pending |
| Synchronous outbound C-STORE | Implemented | Local real-peer store/count test passed | Remote-vendor landing pending |
| Capture DICOM import | Implemented; PatientID/UID/root checks are fail-closed | Pending real capture-device test | Not complete |
| Auto-send worker, SQL claim, exponential retry | Implemented + stale-claim release | Real store + same-worker dedupe passed; crash-recovery test `scripts/test-autosend-claim-recovery.ps1` 12/12 (7/5 fail before the fix) | Concurrent two-replica race still untested |
| Study Root Query/Retrieve | C-FIND + C-MOVE/C-GET adapter/API implemented | Second-node test passed (`scripts/test-dicom-qr.ps1`, 21/21) | Vendor acceptance pending |
- [x] Integration tests: C-ECHO success/failure, MWL C-FIND, MPPS lifecycle, C-STORE land/verify —
  automated and repeatable through `tools/ModalitySimulator`, which opens real associations rather
  than mocking them:
  - `scripts/test-modality-sim.ps1` (18/18): C-ECHO aborted before the AE is declared and accepted
    after, MWL C-FIND, C-STORE verified on the archive with `Origin=DicomProtocol` and the calling
    AE recorded, and MPPS refused for an AE that is not a registered RIS modality.
  - `scripts/test-mpps-order.ps1` (27/27): the full clinical loop against a **real HIS order** —
    create the request, declare the modality, send the worklist, let the simulator read that
    worklist and acquire, then assert in SQL that MPPS moved the exam 0 → performed with both
    StartTime (only written on the IN PROGRESS branch, so N-CREATE demonstrably applied and was not
    merely overwritten by N-SET) and EndTime set, the request advanced, and the MPPS SOP Instance
    UID was retained as evidence.
- [ ] Same tests against real modality vendors; the simulator proves protocol and RIS wiring, not
  vendor-specific behaviour.
- [x] Query/Retrieve acceptance test against an independent archive node is automated and repeatable:
  `scripts/test-dicom-qr.ps1` seeds a 5-instance study on `orthanc-peer`, drives Study Root C-FIND
  (by PatientID and by StudyInstanceUID), C-MOVE and C-GET through the HIS API, and verifies the
  instance count **directly on the receiving archive** rather than trusting the API response. A
  non-existent StudyInstanceUID must fail with the peer's real error. Found and fixed by this test:
  `QueryStudiesAsync` read the C-FIND answer without `?simplify`, so Orthanc returned tags keyed by
  hex ("0020,000d") and every field — including StudyInstanceUID — was silently empty; studies were
  listed but could never be retrieved from the result.
- [ ] Repeat the same test against each real target PACS (the peer proves protocol handling, not
  vendor-specific behaviour).
- [x] Storage Commitment is implemented as a real N-ACTION plus N-EVENT-REPORT poll; a destination
  with the flag on is only reported delivered when the peer's event report says `Success`, and the
  transaction UID is stored as evidence.
- [x] Storage Commitment verified end-to-end through the HIS send path against the second node: the
  transmission is marked delivered only after the peer's event report returned `Success`, the
  transaction UID is recorded, and the study was independently confirmed present on the peer.
- [ ] Repeat both against the hospital's actual modalities and remote PACS; the peer node proves the
  protocol handling, not vendor-specific behaviour.
- [x] Canonical Source AE/origin/IP/station metadata is read back from the archive and persisted on
  `DicomStudies` (migration 161); auto-send Source AE/department filters are enabled and match only
  studies whose provenance was actually resolved. Local evidence: a REST-imported study resolves to
  `Origin=RestApi` with a null AE Title and therefore does **not** match an AE-filtered rule.
- [x] The DICOM-association branch is confirmed against a second archive node (`orthanc-peer`,
  compose profile `dicom-test`): a study pushed in with calling AE `CR01` is stored with
  `Origin=DicomProtocol`, and HIS persists `SourceAeTitle=CR01`, the peer IP, StationName and
  department. An auto-send rule filtering `SourceAeTitle=CR01` then matched and delivered — the
  positive side of the filter, not only the fail-closed side.
- [x] HL7 v2 outbound is a real MLLP exchange (`Hl7MllpClient`): send-result, cancel, retry, CDA
  dispatch and connection test now report the peer's actual MSA code. Verified locally against an
  MLLP peer for accept (AA), reject (AE) and peer-down. DoH sync reuses this path and no longer
  fabricates `Success`.
- [x] Radiology consumables (norms + prescriptions, migration 162), the consumption-norm report and
  Excel export are backed by real tables and produce real files; an unsupported report type is
  refused with a named error instead of an empty download.
- [x] All of the above is reachable from the v2 UI: HL7/CDA channel admin, consumable norms,
  the CĐHA report screen and a per-exam consumables modal. Verified by driving a real browser.
- [x] `[DevelopmentOnly]` seed endpoints are proven unreachable outside Development.
  `scripts/test-dev-endpoints-blocked.ps1` (35/35) boots a second API in Staging and fires real
  requests at every dev/seed route. It does not trust a hand-written list: routes are scanned out of
  the controller sources by naming convention, so a **new** dev endpoint that forgets the attribute
  is picked up automatically and fails the run — 27 routes are currently covered. Each route is
  checked twice: `GET` must return 405 (the route genuinely exists, so a renamed route cannot pass by
  returning 404 for the wrong reason) and `POST` must return 404. The run also proves the app is
  alive in that environment, because a dead app would 404 everything.
  These endpoints are all `[AllowAnonymous]` and all write real data, so the attribute is the only
  thing between them and patient records.
- [ ] Remaining RIS stubs outside the DICOM core: capture adapters for Serial/USB and
  vendor-specific device protocols.

## Phase 2 — security and privacy

- [x] Orthanc REST port is configured to bind to loopback in the target compose file.
- [x] Called AE validation/anonymous C-ECHO policy loaded on the upgraded local runtime.
- [x] Persistent modality configuration and exported-resource logging loaded locally.
- [x] API startup rejects the known local PACS password in Production.
- [ ] Configure every modality AE/IP explicitly before commissioning.
- [ ] Install hospital PKI certificates and verify DICOM TLS in both directions.
- [x] Remove JWT from PACS image query strings; Cornerstone and previews use Authorization headers.
- [ ] Central ATNA-compatible audit repository and immutable retention verification.
- [ ] Penetration test, dependency/SBOM scan, secret rotation, least-privilege service accounts.

## Phase 3 — data durability and operations

- [ ] PostgreSQL Orthanc index in the production overlay.
- [ ] Redundant encrypted NAS/object storage with versioned backup.
- [ ] Restore drill proving study, index, RIS links, and audit logs are mutually consistent.
- [ ] Monitoring: ingest queue, failed jobs, disk capacity, DB latency, DICOM association failures.
- [ ] Defined RPO/RTO, disaster-recovery site, downtime acquisition/reconciliation procedure.
- [ ] Retention, legal hold, deletion approval, and media disposal policy approved by the hospital.

## Phase 4 — interoperability and clinical acceptance

- [ ] Complete the DICOM Conformance Statement in this folder with tested SOP Classes/transfer syntaxes.
- [ ] Compare conformance statements for every CR/DX/CT/MR/US/MG/PET device and remote PACS.
- [ ] Vendor matrix tested for Patient ID, Accession, Unicode PN, emergency/unknown patient, merge.
- [ ] Viewer tests: multi-frame, JPEG/JPEG-LS/JPEG 2000/RLE, MONOCHROME1, overlays, GSPS and SR.
- [ ] Diagnostic display QA (GSDF/calibration), radiologist UAT and clinical safety sign-off.
- [ ] Load/soak test at hospital peak ingest and concurrent diagnostic viewing volume.
- [ ] Go-live, rollback and 24/7 incident runbooks rehearsed.

## Go-live gate

The system is **not approved for primary diagnosis** until every Phase 1 item, every applicable
Phase 2/3 item, the vendor matrix, restore drill, and clinical sign-off have evidence attached.

Current decision: **NO-GO for hospital production / primary diagnosis**.
