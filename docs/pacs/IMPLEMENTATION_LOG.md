# RIS/PACS implementation log

## 2026-08-05 (part 8) — a crashed replica silently stopped a study from ever being sent

Testing the multi-replica claim path found a real defect, not just a missing test.

Auto-send claims a study with a row whose `DeduplicationKey` is protected by a filtered unique
index — sound for the concurrent case: two replicas race, one insert wins, the loser catches the
unique violation and skips. What had no owner was the **crash** case. If the replica that won the
claim stops before finishing (pod restart, kill, power loss), the row stays `Status='sending'`
forever, and:

- the `alreadySent` check sees `sending` and skips that study on every later pass;
- the unique index blocks any re-insert;
- the row never becomes `failed`, so it appears in no error report.

The study is therefore never delivered to the destination PACS and nothing indicates it. A silent
stall is worse than a reported failure — the failure path already retries and surfaces the peer's
error, while this one looks like work still in progress indefinitely.

Fix: `ReleaseStaleClaimsAsync` runs at the top of every auto-send pass and releases claims held in
`sending` past `PACS:AutoSend:ClaimTimeoutMinutes` (default 30, clamped 5–720). Released rows are
marked `failed` — not deleted — with a stated reason, `DeduplicationKey` set to null and
`NextRetryAt` set, so the ordinary retry path takes over **and the attempt still counts toward
MaxRetries**; a study that reliably kills the worker cannot loop forever. Only auto-send claims are
touched (`AutoSendRuleId` and `DeduplicationKey` both non-null), so manual sends are out of scope.

The timeout must stay larger than the slowest legitimate store plus Storage Commitment, or the
reaper would steal an in-flight claim and cause a duplicate send. That risk is asserted, not assumed.

`scripts/test-autosend-claim-recovery.ps1` covers three rows in one pass:

| Row | Meaning | Expected |
|---|---|---|
| A | auto claim, started long ago | released: `failed`, key null, reason + NextRetryAt set |
| B | auto claim, started a minute ago | untouched — proves an in-flight send is not stolen |
| C | manual send, started long ago | untouched — no claim to release |

Evidence both ways: against the pre-fix build the run was **7 pass / 5 fail**, with row A stuck at
`sending` and its key still held. Against the fixed build, **12/12**. `scripts/test-mpps-order.ps1`
re-run afterwards: still 27/27.

## 2026-08-05 (part 7) — dev/seed endpoints proven blocked outside Development

The `[DevelopmentOnly]` attribute was already applied to every dev/seed endpoint; what did not exist
was evidence that it works, or anything that would notice a future endpoint added without it. Both
matter more here than usual: these endpoints are `[AllowAnonymous]` and they write real data — one
assigns real Orthanc StudyInstanceUIDs round-robin across today's requests, another fabricates
DicomStudy rows, others rewrite dates across whole tables.

`scripts/test-dev-endpoints-blocked.ps1` (35/35) starts a second API on port 5107 in **Staging** —
not Development, so the guard applies, and not Production, so the mandatory-secret guards do not
refuse to boot. Two design points:

- **Routes are scanned out of the controller sources, not listed by hand.** Class-level `[Route]`
  (resolving `[controller]`, and carrying across partial-class files that omit it) is joined to each
  write-method attribute, and anything matching the dev/seed naming convention is tested. The
  hand-written list this replaced had 10 routes; the scan finds 27. A new dev endpoint is therefore
  covered the day it is written, which is the only way this stays true over time.
- **Each route is checked twice.** `GET` must return 405 and `POST` must return 404. Without the 405
  check, renaming a route would make the test pass for the wrong reason — 404 because nothing is
  there. The run separately proves the instance is alive (login succeeds, a normal endpoint returns
  200) and that a fabricated route returns 404, so the signal is real.

Found while building it: running `dotnet HIS.API.dll` sets ContentRoot to the current directory, so
the app cannot read `appsettings.json` and dies with "JWT Key not configured". The script sets the
working directory to the build output.

No product defect was found — the guard holds on all 27 routes. What changed is that it is now
verified and self-maintaining rather than assumed.

## 2026-08-05 (part 6) — MPPS proven against a real order

Part 5 left MPPS with protocol-level evidence only. `scripts/test-mpps-order.ps1` (27/27) closes
that: `MppsProcessor` finds the exam by `AccessionNumber`, so nothing short of a real order proves
the messages change anything clinically.

The script creates a radiology request through `POST /api/radiology-ops/add-on`, declares the
simulator as a RIS modality with `SupportsWorklist`/`SupportsMPPS`, sends the worklist with
`POST /api/RISComplete/modalities/worklist/send`, then hands over to the device: the simulator reads
that worklist by C-FIND, sends MPPS `IN PROGRESS`, stores 3 instances, and sends MPPS `COMPLETED`.

Assertions are on state, not on responses:

- Before acquisition the exam is `Status=0` with no MPPS status — so the later transition is real.
- After: `MppsStatus=COMPLETED`, exam `Status=2`, request `Status>=3`, `MppsInstanceUid` retained.
- **`StartTime` is asserted separately from `EndTime`.** `StartTime` is only written on the
  `IN PROGRESS` branch, so its presence proves N-CREATE was applied rather than N-SET alone landing
  and back-filling a completed exam — a modality that crashes mid-exam would otherwise be
  indistinguishable from one that never started.
- The images on the archive carry the exam's AccessionNumber and `RemoteAET=SIM_CR01`.

Everything is removed afterwards: study, worklist entry, Orthanc modality, RIS modality, exam and
request. Verified after the run — the archive is back to its 24 pre-existing studies, no worklist
entries, no test rows.

Two problems in the harness itself were found and fixed:

- `sqlcmd -Q` runs with `QUOTED_IDENTIFIER OFF`, so any `DELETE` against a table carrying a filtered
  index fails with Msg 1934. The cleanup silently left rows behind until the assertion caught it.
  All statements now run with `SET QUOTED_IDENTIFIER ON`.
- `DELETE /api/RISComplete/modalities/{id}` soft-deletes. Soft-deleted rows are inert for MPPS
  (`IsKnownMppsAeAsync` filters on `IsDeleted`/`IsActive`) but accumulate one per run, so the
  cleanup now removes them and asserts none remain.

## 2026-08-05 (part 5) — modality simulator

`tools/ModalitySimulator` is a fo-dicom 5.2.0 console that stands in for a CR/DX console. It is not a
mock: every command opens a real association and speaks the SOP classes a vendor device speaks, so
what it proves is what a modality would experience.

- `echo` — C-ECHO.
- `worklist` — Modality Worklist C-FIND, the query a console fires at shift start.
- `acquire` — MWL C-FIND, MPPS N-CREATE `IN PROGRESS`, C-STORE, MPPS N-SET `COMPLETED`, carrying the
  scheduled StudyInstanceUID and AccessionNumber through so the images land against the HIS order.
  `--no-mpps` isolates the storage path when the MPPS half is not the subject under test.

Verified against the running stack:

- C-ECHO from an **unregistered** AE is aborted by `his-orthanc` (`DicomAlwaysAllowEcho=false` plus
  `DicomCheckCalledAet`). After the AE is declared as a modality it succeeds. The hardening is real,
  and declaring every modality AE explicitly is a commissioning step, not a formality.
- MWL C-FIND returned the scheduled step with its Vietnamese procedure description intact.
- `acquire --images 4` stored 4 instances. Read back **from the archive**: the study carries the
  scheduled StudyInstanceUID, the accession and the patient ID, and its provenance is
  `Origin=DicomProtocol`, `RemoteAET=SIM_CR01` — the same provenance capture the auto-send AE filters
  depend on, now produced by something behaving like a device rather than by a REST upload.
- MPPS against an AE that is not a registered RIS modality is rejected with
  `CallingAENotRecognized`, and the simulator surfaces the rejection instead of continuing.

One defect in the simulator was found by DICOM validation itself and fixed: `PerformedProcedureStepID`
is VR SH (16 characters) and a `yyyyMMddHHmmss` suffix overflowed it.

Still open for a full order-driven loop: the MPPS half needs a real radiology exam to match on
accession (`MppsProcessor` looks the exam up by `AccessionNumber`), so an end-to-end script has to
create the order in HIS and send the worklist through
`POST /api/RISComplete/modalities/worklist/send` first. Until that exists, MPPS has protocol-level
evidence but not order-linkage evidence from the simulator.

Gate: `dotnet build tools/ModalitySimulator` — 0 errors, 0 warnings. All artifacts (study, worklist
entry, Orthanc modality entry) were removed; `his-orthanc` is back to its pre-test 24 studies.

## 2026-08-05 (part 4) — Query/Retrieve acceptance, and the C-FIND bug it exposed

`scripts/test-dicom-qr.ps1` is the first repeatable acceptance test for the last open Phase 1
capability. It uses the `dicom-test` peer as a remote PACS: seeds a 5-instance study there, registers
the return route (`HIS_PACS` on the peer, without which C-MOVE has nowhere to send and C-FIND from an
unknown AE is refused outright — confirmed by observing the abort), then drives the real HIS
endpoints `POST /api/RISComplete/dicom/remote-servers/{id}/query|retrieve`.

What it asserts, and why each one is not redundant:

- C-FIND by PatientID **and** by StudyInstanceUID — the second is the path `RetrieveStudyAsync` takes
  internally, so a passing PatientID query alone would not prove retrieve works.
- The instance count is read back from `his-orthanc` itself after each retrieve, not taken from the
  API response, so an API that reports success without images fails the test.
- C-GET runs after the C-MOVE copy is deleted, so it proves a second, independent transport rather
  than re-observing the first one's result.
- A random StudyInstanceUID must come back 502 with the peer's real error.

Result: 21/21 pass. C-MOVE and C-GET both landed all 5 instances and were verified on the archive.

Defect found and fixed: `DicomPacsGateway.QueryStudiesAsync` read
`queries/{id}/answers/{i}/content` **without `?simplify`**. Orthanc then keys the answer by hex tag
(`"0020,000d"`), while `ReadTag` looks tags up by keyword — so every field came back empty. C-FIND
appeared to succeed and returned the right number of studies, each with a blank PatientID,
AccessionNumber and StudyInstanceUID, which made the found studies impossible to retrieve. The
retrieve path was unaffected because it builds its own query and never parses the answer content,
which is why the bug survived until query and retrieve were tested together.

Gate: `dotnet build` HIS.Infrastructure — 0 errors. All test artifacts (studies on both nodes, the
peer modality entry, the remote-server row) are removed by the script's cleanup step.

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
