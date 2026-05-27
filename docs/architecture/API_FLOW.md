# HIS – API Flow Reference

> **Mục đích:** Sequence diagram (ASCII) cho 10 luồng nghiệp vụ chính + auth + realtime, giúp dev mới hiểu API trong vài giờ.
> **Phạm vi:** Toàn bộ flow giữa Frontend ↔ Backend ↔ DB ↔ External.
> **Module liên quan:** Reception, OPD, Pharmacy, Billing, RIS, LIS, Auth, SignalR, AI.
> **Last updated:** 2026-05-16

---

## Mục lục

- [1. Quy ước](#1-quy-ước)
- [2. Authentication](#2-authentication)
- [3. Reception → OPD → Prescription (luồng backbone)](#3-reception--opd--prescription-luồng-backbone)
- [4. Billing + e-Invoice + Payment Gateway](#4-billing--e-invoice--payment-gateway)
- [5. Pharmacy dispensing](#5-pharmacy-dispensing)
- [6. Inpatient admission + treatment sheet](#6-inpatient-admission--treatment-sheet)
- [7. RIS / DICOM upload + AI](#7-ris--dicom-upload--ai)
- [8. LIS / HL7 v2](#8-lis--hl7-v2)
- [9. EMR sharing + ký số](#9-emr-sharing--ký-số)
- [10. SignalR realtime notification](#10-signalr-realtime-notification)
- [11. BHXH XML 4.0 submission](#11-bhxh-xml-40-submission)
- [12. Public flows (không cần đăng nhập)](#12-public-flows-không-cần-đăng-nhập)

---

## 1. Quy ước

- Mọi request từ FE đều có header `Authorization: Bearer <JWT>` trừ public route.
- API base URL prod: `https://his-api-694913628964.asia-southeast1.run.app/api`
- Tất cả response wrapper: `{ success: bool, data: T, message: string }` (qua `ApiResponse<T>`).
- DB schema migration tự apply khi backend cold start qua `ProductionSchemaRepairRunner`.

---

## 2. Authentication

### 2.1 Login với 2FA

```
[User Browser]                 [Frontend]                      [Backend]
                                    │                              │
   username/password ──POST/login──▶│ POST /api/auth/login ───────▶│
                                    │                              │ AuthService.LoginAsync
                                    │                              │ ├─ UserRepository.GetByUsername
                                    │                              │ ├─ BCrypt.Verify(password)
                                    │                              │ └─ if user.IsTwoFactorEnabled:
                                    │                              │     ├─ generate OTP (6 digit)
                                    │                              │     ├─ hash SHA-256 → TwoFactorOtps table
                                    │                              │     └─ EmailService.SendOtpAsync(email)
                                    │ ◀──{success, data:{          │
                                    │     requiresOtp, otpUserId,  │
                                    │     maskedEmail, expiresAt}} │
                                    │                              │
   nhập 6 số OTP ────POST/verify-otp▶│ POST /api/auth/verify-otp ──▶│ AuthService.VerifyOtpAsync
                                    │                              │ ├─ check attempts ≤ 3
                                    │                              │ ├─ check expiresAt > now
                                    │                              │ ├─ check hash match
                                    │                              │ ├─ delete OTP row
                                    │                              │ └─ generate JWT (HS256)
                                    │ ◀──{data:{token, user{       │
                                    │     id, fullName, roles[],   │
                                    │     permissions[]}}}         │
                                    │                              │
   localStorage.setItem(token,user) ◀│                              │
   AuthContext.setUser              │                              │
   Navigate /                       │                              │
```

### 2.2 Token validation lần tiếp theo

```
[Frontend] ──any API call──▶ axios interceptor
                                  │
                                  │ Authorization: Bearer <JWT>
                                  ▼
                          [Backend Pipeline]
                                  │
                                  ▼
                          JwtBearer middleware
                                  │ ValidateLifetime
                                  │ ValidateIssuer
                                  │ ValidateAudience
                                  │ ValidateIssuerSigningKey
                                  ▼
                          if invalid → 401 → FE redirect /login
                          if valid   → Controller
```

---

## 3. Reception → OPD → Prescription (luồng backbone)

### 3.1 Đăng ký BN + cấp số

```
[Lễ tân]
   │
   │ scan CCCD / nhập thông tin
   ▼
Reception.tsx (form)
   │
   │ POST /api/reception/register
   ▼
ReceptionCompleteController.Register
   │
   ▼
ReceptionCompleteService.RegisterPatientAsync
   ├─ Patient (insert/upsert qua CCCD)
   ├─ MedicalRecord (insert)
   ├─ QueueTicket (cấp số STT theo phòng)
   ├─ Insurance check (nếu có BHYT → BhxhGatewayClient)
   └─ SaveChangesAsync
   ▼
return AdmissionDto { id, ticketCode, queueOrder, patient, ... }
```

### 3.2 Khám OPD (gọi số → khám → kê đơn)

```
[Bác sĩ]
   │ Chọn phòng khám trong OPD.tsx
   │ Load queue
   ▼
GET /api/reception/queue?roomId=...
   ▼
ReceptionCompleteService.GetRoomQueueAsync
   ▼
[trả về] danh sách AdmissionDto đang chờ
   │
[Doctor click "Gọi tiếp"]
   ▼
POST /api/reception/call-next?roomId=...
   ▼
ReceptionCompleteService.CallNextAsync
   ├─ QueueTicket.Status = 2 (called)
   ├─ MedicalRecord.Status = 1 (in progress)
   └─ SyncMedicalRecordStatusAsync (đồng bộ MR ↔ ticket)
   ▼
[Doctor khám, nhập vital signs + diagnosis]
   ▼
POST /api/examination/start
   │ body: { medicalRecordId, vitals, mainIcdCode, ... }
   ▼
ExaminationCompleteService.StartExaminationAsync
   ├─ Examination (insert)
   ├─ Vitals (insert)
   ├─ Diagnoses (insert, support multi)
   └─ inherit insurance + allergies from Reception
   ▼
[Doctor kê đơn]
   ▼
POST /api/examination/prescriptions
   │ body: { examinationId, items: [{medicineId, dosage, days}] }
   ▼
ExaminationCompleteService.CreatePrescriptionAsync
   ├─ DrugInteractionService.CheckInteractions  ───┐
   ├─ AllergyService.CheckAllergies                 │ Block save
   ├─ ContraindicationService.CheckContraindications│ nếu severity=4
   ├─ Prescription (insert)                        ─┘
   ├─ PrescriptionItems (insert)
   └─ SaveChanges
   ▼
[Patient → Pharmacy hoặc Billing]
```

### 3.3 Data inheritance

DataInheritanceService kế thừa thông tin xuyên module:

```
GET /api/data-inheritance/opd-context?patientId=...
   ▼
DataInheritanceService.GetOpdContextAsync
   ├─ latest Reception (insurance card, queue)
   ├─ latest Examination (diagnosis, vitals)
   ├─ Patient allergies (drug + food)
   └─ recent Prescription summary
   ▼
return OpdContextDto { insurance, queueTicket, allergies, lastDiagnosis }
```

UI: Inpatient.tsx admission modal auto-fill diagnosis + reason từ context
này.

---

## 4. Billing + e-Invoice + Payment Gateway

### 4.1 Tạo hóa đơn

```
[Cashier]
   │ Search BN
   ▼
GET /api/billing/unpaid?patientId=...
   ▼
BillingCompleteService.GetUnpaidServicesAsync + GetUnpaidMedicinesAsync
   ▼
[Cashier confirm + tạo HĐ]
   ▼
POST /api/billing/invoice
   │ body: { patientId, items: [{serviceId, amount}], paymentMethod }
   ▼
BillingCompleteService.CreateOrUpdateInvoiceAsync
   ├─ split BHYT portion vs patient (rule TT 04/2017)
   ├─ InvoiceSummary (insert)
   ├─ Receipt (insert)
   ├─ ReceiptDetails (insert per item)
   ├─ CashBook entry (theo permission cashbook)
   └─ SaveChanges
   ▼
[option: Payment Gateway QR]
   ▼
POST /api/payment-gateway/momo-qr
   │ body: { receiptId, amount }
   ▼
PaymentGatewayService.BuildMoMoUrl
   ├─ HMAC-SHA256 sign (MoMo v2 spec)
   ├─ return { qrCodeUrl, expireAt }
   └─ MoMo gửi IPN khi BN thanh toán → PaymentGatewayController.MoMoIpn
   ▼
[IPN callback]
   ▼
PaymentGatewayController.MoMoIpn
   ├─ verify signature
   ├─ Receipt.PaymentStatus = 1 (paid)
   ├─ if BHYT eligible:
   │     ├─ create InvoiceSummary entry
   │     └─ AutoIssueElectronicInvoice (Tax authority)
   └─ NotificationHub.SendToUserAsync (cashier nhận realtime)
```

### 4.2 7 báo cáo thanh toán

```
GET /api/payment-reports/{type}?fromDate=...&toDate=...
   types: cashbook-daily | service-revenue | medicine-revenue |
          insurance-summary | refund-summary | discount-summary |
          payment-method-breakdown
```

---

## 5. Pharmacy dispensing

```
[Pharmacist]
   │ Quét QR mã đơn hoặc tìm BN
   ▼
GET /api/warehouse/pending-prescriptions
   ▼
WarehouseCompleteService.GetUnclaimedPrescriptionsAsync
   ▼
[Pharmacist confirm batch + dispensing]
   ▼
POST /api/warehouse/dispense-outpatient
   │ body: { prescriptionId, items: [{medicineId, batchNo, qty}] }
   ▼
WarehouseCompleteService.DispenseOutpatientPrescriptionAsync
   ├─ AutoSelectBatchesAsync (FEFO picker)
   ├─ check stock available
   ├─ StockMovement (out) entry
   ├─ ExportReceipt (insert)
   ├─ Prescription.IsDispensed = true
   └─ SaveChanges
   ▼
[Patient nhận thuốc, print Receipt]
   ▼
GET /api/pdf/dispense-receipt?id=...
   │ (auth qua ?access_token=... query)
   ▼
PdfGenerationService → return application/pdf
```

---

## 6. Inpatient admission + treatment sheet

```
[Doctor click "Nhập viện" trong OPD.tsx]
   ▼
POST /api/inpatient/admit
   │ body: { medicalRecordId, departmentId, roomId, bedId,
   │         admissionType, diagnosis, reason }
   ▼
InpatientCompleteService.AdmitFromDepartmentAsync
   ├─ Admission (insert)
   ├─ Bed.IsOccupied = true
   ├─ TreatmentSheet (Day 1 auto)
   ├─ NursingCareSheet (Day 1 auto)
   └─ inherit OPD context (diagnosis, vitals, allergies)
   ▼
[Daily: doctor + nurse update]
   ▼
POST /api/inpatient/treatment-sheet
   │ body: { admissionId, dayNumber, progress, orders, notes }
   ▼
POST /api/inpatient/nursing-care
   │ body: { admissionId, date, shift, vitals, interventions }
   ▼
[Order labs + imaging]
   ▼
POST /api/inpatient/service-order  → ServiceRequest + ServiceRequestDetails
   ▼
[Discharge]
   ▼
POST /api/inpatient/discharge
   │ body: { admissionId, dischargeDate, finalDiagnosis }
   ▼
InpatientCompleteService.DischargePatientAsync
   ├─ Discharge (insert)
   ├─ Bed.IsOccupied = false
   ├─ Admission.Status = 1 (discharged)
   ├─ Final InvoiceSummary
   └─ Generate EMR forms (38 TT 32/2023)
```

---

## 7. RIS / DICOM upload + AI

### 7.1 Tạo chỉ định + chụp

```
[Doctor in OPD]
   │ Order CT/MRI/X-quang
   ▼
POST /api/examination/service-order
   │ body: { examinationId, serviceIds[], priority }
   ▼
ServiceRequest + ServiceRequestDetails (status=Pending)
   │
[Technician at modality]
   │ Chụp ảnh → modality C-STORE qua port 4242
   ▼
[Orthanc PACS Oracle VM]
   │ receive DICOM → store to R2 bucket
   │ POST /api/RIS/dicom-arrived (notify backend)
   ▼
RISCompleteService.OnDicomArrivedAsync
   ├─ create DicomStudy + DicomSeries + DicomInstance rows
   ├─ link to ServiceRequest qua StudyInstanceUID match
   └─ SignalR push to dispatcher
```

### 7.2 Doctor mở viewer + chạy AI

```
[Radiologist]
   │ Open /radiology/viewer?study=<UID>
   ▼
GET /api/RISComplete/pacs/studies/{uid}
   │
GET /api/RISComplete/pacs/series/{uid}
   │
GET /api/RISComplete/pacs/instances/{id}/file
   │ stream DICOM raw bytes → Cornerstone3D
   ▼
[Click "Phân tích AI"]
   ▼
GET /api/ai-labeling/modalities      → list 3 modality (CR/CT/US)
GET /api/ai-labeling/config?modality=CR → ONNX model URL
GET /api/ai-labeling/model?modality=CR  → stream 94MB ONNX
   ▼
[Browser ONNX runtime]
   │ inference + occlusion heatmap (49 batch samples)
   │ AiOverlayLayer.tsx render bbox + heatmap canvas
   ▼
POST /api/ai-labeling/save
   │ body: { studyInstanceUid, modality, labels[], bbox, heatmap }
   ▼
AiLabelingResult (insert) — labels accept by BS later
   ▼
[Phase 3: export]
   ▼
GET /api/ai-labeling/{id}/export/pdf         → signed PDF
GET /api/ai-labeling/{id}/export/dicom-sr    → DICOM SR (Basic Text SR)
POST /api/ai-labeling/{id}/export/dicom-sr/upload  → push SR vào Orthanc
POST /api/ai-labeling/{id}/merge-to-report   → append AI block vào
                                                RadiologyReport.Findings
```

---

## 8. LIS / HL7 v2

```
[Analyzer]
   │ TCP connect → port 2576
   ▼
[HL7ReceiverService (BackgroundService)]
   │ HL7ConnectionManager.OnMessageReceived
   ▼
LISCompleteService.ProcessHL7MessageAsync
   ├─ parse OBR (order) + OBX (result)
   ├─ match LabRequest by AccessionNumber
   ├─ insert LabResults + flag abnormal (vs reference range)
   ├─ if critical value:
   │     └─ ResultNotificationService.NotifyCriticalValueAsync
   │         (Email + SignalR)
   └─ SaveChanges
   ▼
[Lab reviewer (4-eyes)]
   │ Review trên Laboratory.tsx
   ▼
POST /api/liscomplete/results/{id}/approve   (KTV)
POST /api/liscomplete/results/{id}/final-approve  (Reviewer)
   ▼
ResultNotificationService.NotifyLabResultAsync (Email BS đặt order)
```

---

## 9. EMR sharing + ký số

### 9.1 Share EMR có thời hạn

```
[Doctor → Patient]
POST /api/emr-management/share
   │ body: { medicalRecordId, expiresInMinutes }
   ▼
EmrManagementService.CreateShareAsync
   ├─ EmrShare (insert, generate access token GUID)
   ├─ link mailable: https://his-psi.vercel.app/shared/<token>
   └─ EmrShareAccessLog initialized
   ▼
[Patient mở link không cần đăng nhập]
GET /shared/<token>
   ▼
PublicStudyViewer.tsx
   ▼
GET /api/emr-management/shared/{token}
   ▼
EmrManagementService.GetSharedEmrAsync
   ├─ check expiresAt > now
   ├─ EmrShareAccessLog (insert access record)
   └─ return EMR data
```

### 9.2 Ký số PDF với USB Token

```
[Doctor click "Ký số"]
   ▼
Phase 1: SigningContext lấy session PIN
   ▼
POST /api/digital-signature/sign-pdf
   │ body: { pdfBase64, certificateThumbprint, pin }
   ▼
PdfSignatureService.SignPdfWithUsbTokenAsync
   ├─ Pkcs11SessionManager.GetOrCreateSession(slot, pin)
   ├─ iText7 PdfSigner.SignDetached
   │     subFilter: adbe.pkcs7.detached
   │     PKCS#11 token signs hash
   └─ return signed PDF bytes
   ▼
[FE download PDF → Adobe Reader hiển thị badge "Signed"]
```

---

## 10. SignalR realtime notification

### 10.1 NotificationHub connection

```
[Frontend on app load]
   ▼
new HubConnectionBuilder()
   .withUrl(`/hubs/notifications?access_token=${token}`)
   .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
   .build()
   ▼
[Backend SignalR Auth]
JwtBearerOptions.OnMessageReceived:
   if path startsWith('/hubs') → context.Token = query[access_token]
   ▼
NotificationHub.OnConnectedAsync
   ├─ Groups.AddToGroupAsync(userId)
   └─ Groups.AddToGroupAsync(`role:${roleName}`)
```

### 10.2 Server push

```
[Any backend code]
   ▼
await _hub.Clients.User(userId).SendAsync("ReceiveNotification", payload);
   ▼
[NotificationContext.tsx in FE]
   .on("ReceiveNotification", (n) => {
      setNotifications([n, ...prev]);
      messageApi.info(n.title);
   })
   ▼
NotificationBell badge count++ (Popover dropdown)
```

### 10.3 Polling fallback

Nếu SignalR mất kết nối: NotificationContext fall back
`GET /api/notification/my?unreadOnly=true` every 60s.

---

## 11. BHXH XML 4.0 submission

```
[End-of-month batch]
   ▼
POST /api/insurance/xml/export?month=2026-05
   ▼
InsuranceXmlService.GenerateMonthlyExportAsync
   ├─ query InvoiceSummary với InsuranceCardNumber not null
   ├─ build XML 4 file: XML1 (Hồ sơ), XML2 (Thuốc), XML3 (DV),
   │                    XML4 (CLS), XML5 (Vật tư), XML15 (RaViện)
   ├─ XmlSchemaValidator.Validate (XSD ở wwwroot/xsd/bhxh)
   └─ return zip file
   ▼
[Admin upload lên Cổng Tiếp nhận BHXH]
   ▼
[Optional: gửi qua API]
   ▼
POST /api/insurance/xml/submit
   ▼
BhxhGatewayClient (real HTTP nếu UseMock=false)
   │ Polly retry 3 lần (exponential backoff 2^n giây)
   │ Polly circuit breaker (5 fail in 30s → open)
   ▼
[BHXH server response → log InsuranceActivityLog]
```

---

## 12. Public flows (không cần đăng nhập)

### 12.1 Queue Display LCD

```
[TV hiển thị tại sảnh]
   │ GET /queue-display?roomIds=...
   ▼
QueueDisplay.tsx
   │ Poll every 4s
   ▼
GET /api/reception/queue-display?roomIds=...
   ▼
[AllowAnonymous endpoint]
ReceptionCompleteService.GetQueueDisplayAsync
   ▼
return { currentlyCalling: [...], waiting: [...] }
   │
[FE TTS Web Speech API]
new SpeechSynthesisUtterance("Mời số 042 vào phòng 3")
```

### 12.2 Online Appointment Booking

```
[Public visit /dat-lich]
   ▼
GET /api/appointment-booking/departments      [AllowAnonymous]
GET /api/appointment-booking/doctors?deptId   [AllowAnonymous]
GET /api/appointment-booking/slots?docId,date [AllowAnonymous]
   ▼
POST /api/appointment-booking/book            [AllowAnonymous]
   │ body: { patientName, phone, slotId, ... }
   ▼
AppointmentBookingService.CreateBookingAsync
   ├─ Patient (insert nếu chưa có theo phone)
   ├─ Appointment (insert)
   ├─ SMS confirmation (SmsService)
   └─ return BookingCode
   ▼
[Staff view → /booking-management (cần đăng nhập)]
```

### 12.3 Public study viewer (chia sẻ DICOM)

```
[Patient click link share]
GET /shared/<accessToken>
   ▼
PublicStudyViewer.tsx
   │ GET /api/RISComplete/pacs/shared/<token>/study
   │ GET /api/RISComplete/pacs/shared/<token>/instances/{id}/file
   ▼
[AllowAnonymous + token validation in service]
StudyShareLink.GetByTokenAsync
   ├─ check expiresAt
   ├─ check accessCount ≤ maxAccess
   ├─ log access entry
   └─ return DICOM via Cornerstone3D viewer
```

---

## Liên kết

- **ARCHITECTURE.md** — kiến trúc tổng thể
- **PROJECT_STATUS.md** — trạng thái triển khai
- `architecture/data-flow.md` — 100 luồng nghiệp vụ chi tiết
- `architecture/business-logic-complete.md` — business spec đầy đủ
- Swagger: `http://localhost:5106` (dev) — API doc tự sinh
