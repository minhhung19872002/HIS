# HIS RIS/PACS DICOM Conformance Statement

**Document status:** Draft under implementation — not yet a claim of conformance  
**Product:** HIS RIS/PACS V2  
**Document revision:** 0.2 (2026-08-04)

This statement follows the intent of DICOM PS3.2. It records implemented roles separately from
roles that have passed interoperability testing. DICOM conformance does not by itself guarantee
interoperability with a modality; the hospital must compare both vendors' statements and test them.

## Application Entities

| AE | Default port | Role | Status |
|---|---:|---|---|
| `HIS_PACS` | 4242 (container; host 4243 locally) | Orthanc Storage/Q-R/MWL SCP and Storage SCU | Local C-ECHO/MWL/C-STORE passed; remote Q/R pending |
| `HIS_RIS` | dynamic | C-ECHO, Study Root C-FIND, C-MOVE/C-GET and local AE for outbound C-STORE | Local integration passed; vendor test pending |
| `HIS_MPPS` | 11114 | MPPS SCP (N-CREATE, N-SET) | DICOM association/lifecycle test passed; vendor test pending |

AE Titles are configurable and limited to 16 characters. Production associations are accepted only
from configured modalities; Called AE validation is enabled.

## Real-world activities

### Verify DICOM connectivity

`HIS_RIS` opens an association to a configured SCP and sends Verification SOP Class C-ECHO.
Online status is reported only after a successful C-ECHO response.

### Publish a scheduled procedure

The RIS creates a persistent MWL item containing Patient ID/name/birth date/sex, Accession Number,
Requested Procedure, Scheduled Station AE, Modality, scheduled date/time, and referring physician.
The modality queries `HIS_PACS` using Modality Worklist Information Model C-FIND.

### Receive performed-procedure progress

Known modalities associate with `HIS_MPPS`. N-CREATE `IN PROGRESS` starts the linked exam;
N-SET `COMPLETED` or `DISCONTINUED` finishes/fails it. Matching uses Accession Number and then the
persisted MPPS SOP Instance UID. Unknown Calling AE and wrong Called AE are rejected.

### Store acquired images

Modalities C-STORE acquired instances to `HIS_PACS`. The Orthanc stable-study/worklist mechanism
removes completed worklist items. HIS reconciles the returned Study Instance UID using Patient ID
and Accession Number before linking it to the radiology order.

### Export a study to another PACS

Orthanc acts as Storage SCU and sends all instances in one synchronous job. Success is recorded only
after the job succeeds. Optional DICOM TLS and Storage Commitment are destination-specific settings.

## SOP Classes and transfer syntaxes

The target image contains Orthanc 1.12.11, but the local runtime observed on 2026-08-04 is still
Orthanc 1.12.2 because the image upgrade did not complete. Definitive accepted Storage SOP Classes
and transfer syntaxes must be captured from the commissioned runtime `/system`, association logs,
and the vendor acceptance suite before this section is marked final. The application does not yet
claim an untested modality-specific Storage SOP Class.

| Service | SOP Class | Role | Verification |
|---|---|---|---|
| Verification | 1.2.840.10008.1.1 | SCU/SCP | Local automated C-ECHO passed |
| Modality Worklist | 1.2.840.10008.5.1.4.31 | SCP | Local create + C-FIND passed |
| Modality Performed Procedure Step | 1.2.840.10008.3.1.2.3.3 | SCP | Local N-CREATE/N-SET lifecycle passed |
| Storage Commitment Push Model | 1.2.840.10008.1.20.1 | SCU, optional | Pending compatible peer |
| Study Root Q/R | 1.2.840.10008.5.1.4.1.2.2.1/2/3 | SCU; Orthanc SCP | Adapter implemented, remote test pending |
| Storage SOP Classes | modality-dependent | SCP/SCU | Local CR store passed; vendor matrix pending |

## Character set

Vietnamese names require Specific Character Set support. UTF-8 (`ISO_IR 192`) must be verified with
each modality. No transliteration may silently replace the canonical HIS patient identity.

## Security profiles

- REST/DICOMweb stays behind the HIS authorization boundary and is not Internet-facing.
- DICOM TLS is configurable per destination; hospital deployment requires certificates or a
  controlled imaging VLAN/VPN according to the approved threat model.
- User image access and study operations are audited. ATNA message format/central repository is pending.
- Browser image retrieval uses Authorization headers/in-memory blob URLs; bearer tokens are not put in PACS URLs.

## Known limitations

- No hospital/vendor interoperability evidence is attached yet.
- Storage SOP/transfer-syntax matrix is not finalized.
- Query/Retrieve and Storage Commitment acceptance tests are pending.
- Primary-diagnosis viewer and diagnostic display validation are pending.
- Serial/USB capture devices require vendor-specific adapters and currently fail closed.
- This draft is not a vendor interoperability certificate or regulatory approval.
