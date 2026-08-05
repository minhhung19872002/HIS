# RIS/PACS implementation log

## 2026-08-05 (part 3) — second archive node closes the two open verifications

`docker-compose.yml` gains `orthanc-peer` (AET `TEST_PACS`, host ports 4244/8044) behind the
`dicom-test` profile, so a plain `docker compose up -d` does not start it:

```
docker compose --profile dicom-test up -d orthanc-peer
```

It stands in for both a modality and a remote PACS. With it:

- **Calling AE capture.** The peer pushed a study into `his-orthanc` with calling AE `CR01` over a
  real association (peer → node 1 by container DNS, no host NAT). Node 1 recorded
  `Origin=DicomProtocol`, `RemoteAET=CR01`, `RemoteIP=172.18.0.5`, plus StationName and
  InstitutionalDepartmentName. HIS then linked the study to its order and persisted
  `SourceAeTitle=CR01`, `SourceOrigin=DicomProtocol`, `StationName=CR-PHONG1`,
  `DepartmentCode=KHOA CDHA`.
- **Auto-send Source AE filter, positive side.** A rule filtering `SourceAeTitle=CR01` matched that
  study and delivered it (`triggered: 1`). Previously only the fail-closed side had evidence.
- **Storage Commitment.** Sending to the peer with the flag on produced
  `Storage Commitment Success (tx 2.25.1512970698969088018271484214290169883 76)` and the transmission
  was marked `done`. The study was then confirmed on the peer independently, received as
  `Origin=DicomProtocol` from `HIS_RIS`.

Found and fixed while doing this: `appsettings.Development.json` pointed PACS at
`http://localhost:8042` with `admin/orthanc`. That was **not** the compose Orthanc — it is a natively
installed `Orthanc.exe` listening on `0.0.0.0:8042`. Every hardening choice in the compose file
(loopback-only REST, non-default credentials, `DicomCheckCalledAet`, no anonymous C-ECHO) was bypassed
in development, and the archive was reachable from the LAN with default credentials.

The whole `PACS` block was removed from `appsettings.Development.json` so development inherits
`appsettings.json` — the compose node (REST 8043, DICOM 4243, user `his-api`). Removing rather than
restating it is deliberate: the duplicate is what drifted in the first place.

The same root problem appeared in code: the three endpoints that proxy patient images
(`pacs/instances/{id}/preview|rendered|file`) fell back to a hard-coded `http://localhost:8042` when
`PACS:BaseUrl` was missing, which could stream PHI from an unmanaged archive. They now refuse with
`PACS_NOT_CONFIGURED` instead of guessing.

Verified after the change, with no environment overrides: the API probes `http://localhost:8043/system`
on startup; both studies referenced by `DicomStudies` exist on the compose node (which holds 24 studies
against the native install's 2, so nothing became unviewable); and the image proxy returns a real PNG
preview (1.3 MB) and DICOM file (8.2 MB) through HIS.

Note: `appsettings.Docker.json` still points at `localhost:8042`, but it is dead configuration — the
Dockerfile sets `ASPNETCORE_ENVIRONMENT=Production` and nothing selects the `Docker` environment.

All test artifacts (studies on both nodes, the rule, the peer destination, DB rows) were removed and
the peer container stopped.

## 2026-08-05 (part 2) — the v2 screens that make the above reachable

The previous entry made the backend real, but nothing in the v2 UI called it: the radiology
consumables API client had no consumer, no screen configured an HL7 channel, and the registers,
statistics and Excel export existed only on the retiring v1 page. Added:

- **Quản trị RIS › HL7 / CDA** — channel CRUD, a real connection test, and the outbound message log
  with the peer's actual ACK. A warning appears when more than one channel is active without
  `RIS:Hl7:DefaultConfigName`, because sending is then refused rather than guessed.
- **Quản trị RIS › Định mức vật tư** — replaces a tab that only linked elsewhere. Declares the
  consumable norm per radiology service, picking items from the catalogue with live stock.
- **Báo cáo CĐHA** (`/v2/radiology-reports`) — sổ CĐHA / siêu âm / TDCN, statistics, revenue and the
  consumption-norm comparison, each exportable to Excel.
- **Vật tư ca chụp** — a modal on the radiology worklist to prescribe consumables for one exam,
  manually or generated from the service norm.
- `api/ris/integration.ts` HL7 section was rewritten: it had drifted from the controller (wrong
  route for send, DTO field names that do not exist, and seven endpoints missing).

Four defects were found by driving the real browser and fixed:

- Adding rows through a tracked EF collection made EF emit `UPDATE` instead of `INSERT`, so saving a
  norm reported success while writing nothing. Both the norm and prescription update paths now delete
  set-based and insert explicitly.
- Clearing that same collection severed a required relationship and threw on prescription update.
- Newly inserted items were also added manually to the navigation, duplicating every line.
- `Note` and `Unit` were non-nullable in the request DTOs, so the model binder rejected any save that
  left them blank. Same trap as `SaveHL7CDAConfigDto.FilePath`; all are nullable now.
- Deleting a prescription left its lines behind, which would have leaked into the consumption report.

Verified in the browser against the running stack: the norm saves and reloads from the server and the
row is present in SQL; the prescription modal creates, lists and updates; a service with no norm is
refused with a real 400 instead of an empty phantom prescription; the HL7 log shows `AA` as
acknowledged and `AE`/no-answer as failed; connection test returns true for a port that is genuinely
listening and false for one that is not; Excel export downloads a valid workbook.

Gates: `dotnet build` 0 errors · `npm run build` (tsc + vite) exit 0.

## 2026-08-05 — provenance, HL7 transport and RIS registers

Implemented:

- `IDicomPacsGateway.GetStudySourceAsync` reads an archived study's real provenance (Orthanc instance
  metadata `Origin`/`RemoteAET`/`RemoteIP` plus `StationName`/`InstitutionalDepartmentName`). A calling
  AE Title is only reported when the instance actually arrived over a DICOM association.
- `DicomStudies` carries `SourceAeTitle`, `SourceOrigin`, `SourceIpAddress`, `StationName`,
  `DepartmentCode`, `SourceResolvedAt` (migration `161`, filtered indexes on AE/department).
  Provenance is resolved when a study is linked to an order and lazily, in bounded batches, by the
  auto-send pass. Department comes from the HIS room→department of the exam, falling back to (0008,1040).
- Auto-send Source AE / department filters are live; the previous `NotSupportedException` and the
  worker's blanket skip are gone. Unresolved studies stay excluded (fail-closed by null equality).
- `Hl7MllpClient`: real HL7 v2 MLLP framing, ACK frame read-back and MSA parsing. Outbound
  `SendHL7Message`, `SendHL7Result` (a genuine ORU^R01 built from the report), `CancelHL7Result`
  (result status `X`), `RetryHL7Message`, `SendCDADocument` and `TestHL7Connection` all report the
  peer's real answer. `MLLP` and `TCP` are treated as the same socket channel.
- Channel selection refuses to guess: with more than one active HL7 config and no
  `RIS:Hl7:DefaultConfigName`, sending fails with a named error instead of silently posting a
  radiology result into the LIS interface (which the previous "first by name" rule did).
- `SyncResultToDoHAsync` sends through that path; `Success` plus a transaction id only exist when the
  receiver acknowledged.
- RIS registers/statistics/revenue (QĐ4069 sổ CĐHA, siêu âm, TDCN) query real data instead of
  returning empty lists, and turnaround time is measured rather than hard-coded to 30 minutes.
- Radiology consumables (module 8.4) had no tables at all: every endpoint fabricated a response and
  discarded what the user entered. Migration `162` adds service norms and prescriptions; the service
  prices from the real catalogue, picks lots FEFO, skips locked/expired lots, refuses a locked
  warehouse, and the consumption-norm report compares norm×exams against what was actually used.
- Excel export produced a zero-byte "xlsx" that Excel cannot open. `SimpleXlsxWriter` builds real
  OOXML with the BCL only (no new dependency) for six report types; an unknown type now returns
  400 `NOT_SUPPORTED` with the valid list (`NotSupportedException` mapped in `DomainExceptionFilter`).
- Storage Commitment is a real N-ACTION/N-EVENT-REPORT exchange: after a store to a destination with
  the flag on, HIS requests commitment, polls the transaction and only reports the transmission as
  delivered when the peer's event report says `Success`. The transaction UID is recorded on the
  transmission log as evidence.

Verification performed (local, real peers):

- `dotnet build` API + Infrastructure: 0 errors.
- Migration `161` applied twice against SQL Server: idempotent, 6 columns and 2 filtered indexes present.
- Sổ CĐHA returns the 4 performed orders with patient/age/gender/service/doctor; statistics report
  5 exams and a measured TAT of 3604.9 minutes; revenue splits by service type and by doctor.
- Auto-send `trigger-check` against the live Orthanc resolved `Origin=RestApi`, `RemoteIP=127.0.0.1`
  for the PX studies and correctly did not match an `AE=PX01` rule.
- HL7 ORU^R01 delivered to a real MLLP peer: `AA` → message status Acknowledged; `AE` → failure with
  the peer's text; peer stopped → connection test false and the real socket error surfaced.
- Migration `162` applied twice: idempotent, 4 tables. Service norm saved and read back; a
  prescription generated from that norm priced 2 lines at the catalogue price (2×800 + 1×1200 =
  2 800); the consumption report matched norm against actual.
- Excel: sổ CĐHA and statistics workbooks are valid archives whose every part parses as XML, with the
  expected sheets, Vietnamese text and correct date serials.
- Storage Commitment / delivery honesty: sending to a **dead** DICOM port reports `failed` with the
  peer's real TCP error and never claims delivery. Orthanc's own commitment endpoint was confirmed to
  perform a real N-ACTION/N-EVENT-REPORT (`Status: Success`) when both ends are distinct.

Two defects were found by these smokes and fixed: the register query could not be translated by EF
(filter applied after projection), and statistics silently dropped every exam whose modality link was
missing because a required navigation forced an INNER JOIN — which had hidden the only exam with a
measurable turnaround time.

Not yet verified — all three need a second archive node or a real device, because a single Orthanc
storing to itself deduplicates the instance and blocks on its own N-ACTION:

- Calling AE captured from a real modality C-STORE (`Origin=DicomProtocol` → AE persisted).
- Storage Commitment acknowledged end-to-end through the HIS send path.
- Remote-vendor Q/R, DICOM TLS with hospital PKI, PostgreSQL index/HA storage, restore drill, ATNA
  repository, vendor matrix, soak test, radiologist UAT.

Release decision: **NO-GO** until the roadmap evidence gates are complete.

## 2026-08-04 — production networking conversion, in progress

Implemented:

- Real fo-dicom C-ECHO; PACS online state no longer comes from an HTTP `/system` probe.
- Orthanc-backed MWL create path with persistent accession/patient/procedure data.
- MPPS SCP with Called/Calling AE checks and N-CREATE/N-SET state transitions.
- Synchronous outbound C-STORE with actual instance/byte/error results.
- SQL-idempotent auto-send claims, background execution and bounded exponential retry.
- Capture-device checks use DICOM C-ECHO, TCP connect or directory access. Serial/USB without a
  vendor adapter report unsupported instead of online.
- Captured media may be imported only as valid DICOM from configured roots, with mandatory UIDs and
  PatientID equality. Database `sent` fields are updated only after Orthanc returns real IDs.
- Browser PACS image access uses Authorization headers/blob URLs rather than bearer query strings.
- Production refuses the known local PACS password.

Verification performed:

- `dotnet build ... -c Release`: passed, zero errors.
- `npm run build`: passed (TypeScript and Vite production bundle).
- Orthanc data-volume snapshot created before upgrade attempt.

Not yet verified:

- Remote-vendor Q/R and Storage Commitment acceptance tests.
- DICOM TLS with hospital PKI, PostgreSQL index/HA storage, restore drill, ATNA repository.
- Modality vendor matrix, performance/soak test, diagnostic display QA and radiologist UAT.

Release decision: **NO-GO** until the roadmap evidence gates are complete.

Additional evidence completed in the same session:

- Upgraded isolated container is healthy on local host ports 8043/4243; old study persisted.
- Explicit integration test passed C-ECHO, MWL C-FIND, synchronous C-STORE and auto-send dedupe.
- MPPS test passed N-CREATE/N-SET through a real TCP association and verified DB transitions.
- Startup schema repair initially failed due to same-batch SQL compilation; `GO` boundaries were
  added, then all 8 columns and 2 indexes were verified directly in SQL Server.
- Admin V2 now exposes Calling AE, timeout, DICOM TLS, Storage Commitment and real C-ECHO.
- Auto-send V2 no longer claims AES-GCM or cron support; it describes DICOM TLS/on-arrival only.
