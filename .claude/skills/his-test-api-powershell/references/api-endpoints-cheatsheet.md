# HIS API Endpoints Cheatsheet (verified from existing test-*.ps1)

Base URL: `http://localhost:5106`
Auth: `Authorization: Bearer <token>` (token from `/api/auth/login`)

Response wrapper varies — always pipe through `Get-ResultItems`.

## Auth
| Method | Route | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/login` | `{username, password}` | `{ data: { token, user } }` |

Default admin: `username=admin`, `password=Admin@123`.

## Reception
| Method | Route | Notes |
|---|---|---|
| GET | `/api/reception/rooms/overview` | Wrapper: `data` |
| POST | `/api/reception/register/fee` | Body: `{ newPatient: {...}, serviceType, roomId, isPriority }` |
| GET | `/api/reception/patients/search?keyword=` | Wrapper: any |
| GET | `/api/reception/queue/waiting/{roomId}?queueType=1` | queueType: 1=Exam, 2=Paraclinical |
| GET | `/api/reception/statistics/daily?date=yyyy-MM-dd` | Wrapper: `data` |

`newPatient` DTO fields:
```
fullName, dateOfBirth (yyyy-MM-dd), gender (0=F,1=M),
phoneNumber, address, identityNumber
```

## Inpatient
| Method | Route | Notes |
|---|---|---|
| GET | `/api/inpatient/patients` | List inpatients |
| GET | `/api/inpatient/bed-status` | Bed list with status (0=Avail, 1=Occupied, 2=Maint) |
| GET | `/api/inpatient/ward-layout/{departmentId}` | Department GUID |
| GET | `/api/inpatient/{admissionId}/detail` | Patient detail |
| POST | `/api/inpatient/admit` | Admit new patient |
| POST | `/api/inpatient/{admissionId}/assign-bed` | Body: `{ bedId }` |
| POST | `/api/inpatient/{admissionId}/transfer-bed` | |
| POST | `/api/inpatient/{admissionId}/discharge` | |

Inpatient list item shape: may have `admissionId` OR `id` — fall back:
```powershell
$id = if ($_.PSObject.Properties.Name -contains "admissionId") { $_.admissionId } else { $_.id }
```

## Billing
| Method | Route | Notes |
|---|---|---|
| POST | `/api/billing/cashbook` | Create cash book |
| POST | `/api/billing/deposit` | Deposit / advance |
| GET | `/api/billing/deposit/balance/{patientId}` | |
| POST | `/api/billing/payment` | Payment |
| POST | `/api/billing/refund` | Refund |
| POST | `/api/billing/invoice` | |

## Surgery
| Method | Route | Notes |
|---|---|---|
| GET | `/api/surgery/requests` | |
| POST | `/api/surgery/request` | |
| POST | `/api/surgery/{id}/schedule` | |
| POST | `/api/surgery/{id}/complete` | |

## Pharmacy / Warehouse
| Method | Route | Notes |
|---|---|---|
| POST | `/api/warehouse/supplier-receipt` | Stock-in from supplier |
| POST | `/api/warehouse/stock-receipt/{id}/approve` | |
| POST | `/api/warehouse/dispense/outpatient` | Dispense OPD |
| POST | `/api/warehouse/dispense/inpatient` | |
| POST | `/api/warehouse/stock-take` | Stock take |
| GET | `/api/warehouse/stock` | Stock on hand |

## Ward (Room/Bed)
| Method | Route | Notes |
|---|---|---|
| GET | `/api/inpatient/ward-layout/{departmentId}` | Layout JSON |
| GET | `/api/inpatient/bed-status` | All beds |

## Common DTO conventions

- All IDs: `Guid` (string in JSON, e.g. `"7eeefe81-095d-49b2-959f-2f2b69d0c39b"`).
- Timestamps: ISO 8601 (`yyyy-MM-ddTHH:mm:ss`).
- Enums: integer (gender 0/1, status 0/1/2, paymentMethod 1/2/3/4).
- Pagination wrapper: `{ data: { items: [...], total, page, pageSize } }` for paginated endpoints.

## Master Data GUIDs (seeded — relatively stable)

Rotate these into a discovery step instead of hard-coding when possible. If hard-coded:
- Reception room (general clinic): `bf6b00e9-578b-47fb-aff8-af25fb35a794`
- Sample department: `7EEEFE81-095D-49B2-959F-2F2B69D0C39B`

Verify by querying `/api/master-data/rooms` or `/api/master-data/departments` first to avoid stale GUIDs.

## When an endpoint isn't in this list

1. Check the controller in `backend/src/HIS.API/Controllers/<Module>Controller.cs`
2. Look at `[HttpPost]`, `[HttpGet]`, `[Route(...)]` attributes
3. Match the DTO to `backend/src/HIS.Application/DTOs/<Module>/`
4. Add the verified endpoint to this cheatsheet.
