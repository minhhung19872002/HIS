# Khảo sát API HIS hiện có — nền cho App Mobile Hỗ trợ Người bệnh

> **Bước 1 / Phase 0** theo `docs/mobile/PROMPT_HIS_PatientApp_Flutter.md`.
> Mục đích: liệt kê **cái gì HIS đã có** để tái dùng và **cái gì thiếu** phải bổ sung, TRƯỚC khi viết
> dòng code nghiệp vụ đầu tiên. Mọi dòng trỏ `file:line` thật trong repo — không suy đoán.
>
> Ngày khảo sát: **2026-09-08** · nhánh `main` · backend .NET 9, 208 controller.
> 📄 Nguồn yêu cầu: `docs/mobile/NangCapMobileApp.pdf` (HSMT) + `docs/mobile/PROMPT_HIS_PatientApp_Flutter.md`.
> 🔗 Tài liệu liên quan: [`README.md`](README.md) (kế hoạch) · [`acceptance-matrix.md`](acceptance-matrix.md) (bảng nghiệm thu).

---

## 0. Kết luận nhanh (đọc mục này trước)

| Trục | Hiện trạng | Ảnh hưởng tới kế hoạch |
|---|---|---|
| **Cổng bệnh nhân** | **ĐÃ CÓ** portal khá đầy đủ: `PatientPortalController` (~40 route), entity `PortalAccount` / `PortalAppointment` / `FamilyMember` / `MedicineReminder` / `HealthMetric` / `PatientQuestion` (gói "NangCap19"), role `PortalPatient` | App **không xây từ số 0** — bọc & mở rộng portal sẵn có. Tiết kiệm phần lớn Phase 3-5. |
| **Chống IDOR** | ĐÃ CÓ pattern chuẩn `ResolvePatientId`/`ResolveAccountId` — role `PortalPatient` luôn lấy `patientId` từ JWT claim, query param lệch claim → 403 (`PatientPortalController.cs:47-64`) | Tái dùng nguyên pattern cho mọi endpoint mobile. |
| **Xác thực BN** | Login portal chỉ username+password; **token 8h cứng, KHÔNG refresh, KHÔNG OTP, KHÔNG rate-limit ở route** (`PatientPortalController.cs:73-113`) | Phải làm lại tầng auth cho mobile (Phase 1) — rủi ro bảo mật lớn nhất hiện nay. |
| **Đổi mật khẩu lần đầu** | ĐÃ CÓ cho **nhân viên**: `User.MustChangePassword`, `PasswordChangedAt`, claim `pwdChangeRequired`, `PasswordChangeRequiredMiddleware`, migration `183_password_change_policy.sql` | Nhân bản cơ chế sang `PortalAccount` (thêm cột + nhánh middleware). |
| **Thu hồi phiên tức thì** | ĐÃ CÓ `User.SecurityStamp` + `OnTokenValidated` so khớp → token cũ chết ngay | Nền sẵn cho "đăng xuất từ xa thiết bị" (HSMT I.2 #9). |
| **Sinh trắc học** | WebAuthn/FIDO2 đầy đủ nhưng **chỉ gắn `User` (nhân viên)** — bảng `WebAuthnCredentials` khoá `UserId`, không có `AccountId` | Sinh trắc app = `local_auth` mở khoá cục bộ + device-key ký challenge phía server → làm mới. |
| **Push notification** | **KHÔNG CÓ FCM/APNs ở bất kỳ đâu**. Grep `firebase\|Fcm\|PushToken\|DeviceToken` = 0 kết quả. Chỉ SignalR (`/hubs/notifications`) + SMS | Toàn bộ HSMT I.2 #2 "chạy ngầm nhận thông báo" là **làm mới 100%**. |
| **Số thứ tự** | ĐÃ CÓ **hai** hệ song song, không liên thông: `QueueTicket` (lễ tân, **có Priority**) và `KioskTicket` (kiosk, không Priority, đánh số theo Department thay vì Room) | Chọn `QueueTicket` làm nguồn sự thật cho app. |
| **STT ưu tiên qua app** | **THIẾU** — `IssueQueueTicketMobileAsync` hard-code `Priority = 0` (`ReceptionCompleteService.Queue.cs:458`) | Đúng dòng HSMT "lấy STT **ưu tiên** ngoại trú" → bắt buộc sửa. |
| **Realtime hàng đợi** | **KHÔNG CÓ** hub cho queue/booking — chỉ `NotificationHub`, `RisChatHub` (`Program.cs:456-457`) | Thêm hub hàng đợi hoặc poll + push. |
| **Slot đặt khám** | Khung giờ **hard-code** 7:30-11:30 / 13:30-16:30, `maxBookingsPerSlot = 5` cho MỌI bác sĩ; **không đọc bảng `DoctorSchedule`** dù bảng đó đã có CRUD (`AppointmentBookingService.cs:86-92`) | Rủi ro cho đặt lịch vào giờ bác sĩ không trực → phải nối slot vào `DoctorSchedule`. |
| **KQ xét nghiệm cho BN** | DTO `PortalLabResultDto` **có sẵn field** `TestItems`/`ReportUrl` nhưng service **chỉ điền 4 field** (`PatientPortalServiceImpl.cs:409-429`) | App chưa hiển thị được bảng chỉ số → phải điền mapping (đã có sẵn logic ở `ExaminationCompleteService.WaitingList.cs:229-290`). |
| **KQ CĐHA + PACS cho BN** | DTO có `ImageViewerUrl`/`ThumbnailUrls`/`HasImages` nhưng **không bao giờ được set** | Phải sinh URL trỏ route proxy thật `api/RISComplete/pacs/instances/{id}/rendered`. |
| **Kết quả TDCN** | **Không có endpoint patient-facing nào**; kết quả TDCN dùng chung pipeline RIS với CĐHA (`ServiceType`), nhưng route RIS role-restrict staff | Bổ sung endpoint portal cho TDCN. |
| **Nội trú** | **Không có endpoint liệt kê đợt nhập viện của 1 BN**; "công khai thuốc" chỉ có **PDF**, DTO JSON `MedicineDisclosureDto` tồn tại nhưng **không service nào điền** | Phase 4 phải thêm 3-4 endpoint JSON. |
| **STT thực hiện CLS nội trú** | **Không có field STT** trên `ServiceRequest`/`ServiceRequestDetail` | Phải bổ sung (join `RadiologyRoomAssignment.QueueNumber` chỉ phủ CĐHA). |
| **KSK hợp đồng** | Module có (`api/health-checkup/*`) nhưng **chỉ tra theo `campaignId`**, không có theo `patientId`; `CheckupRecordDto.PatientId` nullable | Bổ sung `GetRecordsByPatientAsync`. |
| **iOS 12.0 (HSMT)** | ❌ **Không khả thi với Flutter hiện tại** — Flutter 3.47.2 sinh `IPHONEOS_DEPLOYMENT_TARGET = 15.0` | Rủi ro nghiệm thu — xem §12. |
| **Android 7.2 (HSMT)** | ✅ Đạt — đã đặt `minSdk = 25` (Android 7.1.1); build APK debug **PASS** | Không vấn đề. |

---

## 1. Auth & định danh (nhân viên)

Nguồn: `backend/src/HIS.API/Controllers/AuthController.cs` (base `api/auth`), `MeController.cs`,
`SecurityController.cs`, `HIS.Infrastructure/Services/AuthService.cs`,
`HIS.Core/Constants/JwtClaims.cs`, `HIS.Core/Entities/User.cs`.

| Nghiệp vụ | Route/Method (file:line) | Auth | Trả về gì | Thiếu gì cho app BN |
|---|---|---|---|---|
| Login nhân viên | `POST /api/auth/login` — `AuthController.cs:75-84` | `[AllowAnonymous]` + rate-limit bucket `"login"` | `LoginResponseDto` {Token, RefreshToken, ExpiresAt, User, RequiresOtp, OtpUserId, MaskedEmail} | Là login **nhân viên** (Username), không nhận SĐT/CCCD |
| Xác thực OTP (2FA bước 2) | `POST /api/auth/verify-otp` — `:87-96` | `[AllowAnonymous]` | `LoginResponseDto` | OTP gửi qua **email** (`AuthService.cs:690`), chưa có SMS OTP |
| Gửi lại OTP | `POST /api/auth/resend-otp` — `:100-107` | `[AllowAnonymous]` | `bool` | — |
| Refresh token | `POST /api/auth/refresh` — `:117-132` | `[AllowAnonymous]` + rate-limit `"refresh"`; hỗ trợ httpOnly cookie (`Auth:RefreshCookieEnabled`, mặc định false) | `LoginResponseDto` mới (rotation, reuse-detection) | **Chỉ cho staff** — token `PortalPatient` không có refresh |
| Đăng xuất | `POST /api/auth/logout` — `:137-144` | `[Authorize]` | `bool` | — |
| Đăng xuất theo token (idle) | `POST /api/auth/logout-by-token` — `:156-161` | `[AllowAnonymous]` | `bool` | — |
| Xem/bật/tắt 2FA | `GET /api/auth/2fa-status`, `POST /api/auth/enable-2fa`, `POST /api/auth/disable-2fa` — `:165-200` | `[Authorize]` | `TwoFactorStatusDto` / `bool` | — |
| Đổi mật khẩu | `POST /api/auth/change-password` — `:204-213` | `[Authorize]` | `bool`; **xoay `SecurityStamp` + thu hồi toàn bộ refresh token** (`AuthService.cs:253-264`) | Cơ chế thu hồi tức thì **tái dùng cho "đăng xuất từ xa"** |
| Thông tin tôi | `GET /api/auth/me` — `:217-226` | `[Authorize]` | `UserDto` | Không có SĐT BN / `patientId` |
| Xác thực lại mật khẩu | `POST /api/auth/verify-password` — `:234-241` | `[Authorize]` | `bool valid` | Dùng cho "mở khoá xem bệnh án" |
| WebAuthn: đăng ký / danh sách / xoá | `POST /api/auth/webauthn/register-options`, `POST .../register`, `GET .../credentials`, `DELETE .../credentials/{id}` — `:246-321` | `[Authorize]` | `WebAuthnRegisterOptionsDto`, `WebAuthnCredentialDto` | Bảng `WebAuthnCredentials` khoá `UserId` — **không dùng được cho `PortalAccount`** |
| WebAuthn: đăng nhập | `POST /api/auth/webauthn/authenticate-options`, `POST .../authenticate` — `:279-302` | `[AllowAnonymous]` | `WebAuthnAuthOptionsDto`, `LoginResponseDto` | Idem |
| Quyền của tôi | `GET /api/me/permissions` — `MeController.cs:24-30` | `[Authorize]` | `List<string>` mã quyền | — |

**JWT claims** (`HIS.Core/Constants/JwtClaims.cs`): `fullName` (:11) · `employeeCode` (:14) ·
`permission` (:17 — **không còn phát**, `AuthService.cs:416-420`) · `inspectorType` (:20) ·
**`patientId` (:23 — dùng cho token `PortalPatient`)** · `branchId` (:26) · `departmentId` (:29) ·
`securityStamp` (:32) · `pwdChangeRequired` (:37). Cộng `ClaimTypes.NameIdentifier/Name/Role`.

**Cấu hình** (`backend/src/HIS.API/appsettings.json:5-25`): `Jwt.ExpireMinutes = 30` ·
`Auth.RefreshTokenDays = 14` · `Auth.SecurityStampCacheSeconds = 30` · `Auth.PasswordMaxAgeDays = 90`.

**Khoá tài khoản**: staff bậc thang 5/10/15/20 lần → khoá 5-30 phút (`AuthService.cs:562-569`);
`PortalAccount` 5 lần / 15 phút (`PatientPortalServiceImpl.Health.cs:341-346`).

**Phiên & thiết bị**: entity `UserSession` (`SystemAdmin.cs:18-29`: SessionToken, LoginTime, LogoutTime,
IPAddress, UserAgent, Status) + `RefreshToken.CreatedByIp` — **chỉ staff; không có tên thiết bị / push token**.

---

## 2. Cổng bệnh nhân (Patient Portal) — trọng tâm tái sử dụng

Nguồn: `PatientPortalController.cs` (base `api/portal`), `PublicEmrLookupController.cs`,
`KioskController.cs`, `StudyShareController.cs`.

| Nghiệp vụ | Route/Method (file:line) | Auth | Trả về gì | Thiếu gì cho app BN |
|---|---|---|---|---|
| BN đăng nhập portal | `POST /api/portal/login` — `PatientPortalController.cs:73-90` | `[AllowAnonymous]` | `PortalLoginResponseDto` {Success, Message, Token, Account} | Token tự sinh tại controller (không qua `AuthService`), **hạn 8h cứng** (:110); **không refresh, không OTP, không rate-limit route** |
| Đăng ký tài khoản | `POST /api/portal/register`, `POST /api/portal/account/register` — `:118-119` | `[AllowAnonymous]` | `PortalAccountDto` | **Không OTP xác minh SĐT** trước khi kích hoạt |
| Liên kết account ↔ hồ sơ BN | `POST /api/portal/account/link-record` — `:127-131` | `[AllowAnonymous]` | `{success, message}` | Chỉ đối chiếu SĐT/CCCD/DOB → dễ dò nếu thiếu OTP + rate-limit |
| Thông tin tài khoản | `GET /api/portal/account` — `:136-141` | `[Authorize]` | account | — |
| Hoá đơn / Invoice | `GET /api/portal/bills`, `/api/portal/invoices` — `:145-149, 303-309` | `[Authorize]` | danh sách hoá đơn | — |
| Thanh toán online | `POST /api/portal/payments` — `:313-319` | `[Authorize]` | `OnlinePaymentDto` | Ngoài phạm vi HSMT app mobile |
| Thông báo | `GET /api/portal/notifications` — `:158-166` | `[Authorize]` | danh sách theo `accountId` | Chỉ đọc DB (poll) — **không push thật** |
| Danh mục bác sĩ / khoa | `GET /api/portal/doctors`, `/api/portal/departments` — `:170-177` | `[Authorize]` | danh sách | — |
| Lịch hẹn: xem / slot / đặt | `GET /api/portal/appointments`, `/available-slots`, `POST /api/portal/appointments` — `:181-206` | `[Authorize]` | `PortalAppointmentDto`, `AvailableSlotDto` | Không có đổi lịch (reschedule) |
| Hồ sơ sức khoẻ tổng hợp | `GET /api/portal/health-record(s)` — `:208-215` | `[Authorize]` | `HealthRecordSummaryDto` {Allergies, ChronicConditions, CurrentMedications, RecentVisits[], Immunizations, VitalsTrend[]} (`PatientPortalServiceImpl.cs:161-239`) | ⚠️ `Allergies`/`CurrentMedications`/`Immunizations` **hard-code rỗng**, chưa nối bảng thật |
| Sinh hiệu | `GET /api/portal/vitals` — `:219-230` | `[Authorize]` | `List<VitalsTrendDto>` | — |
| **Danh sách lượt khám** | `GET /api/portal/visits?patientId=&limit=` — `:233-241` | `[Authorize]`, `ResolvePatientId` ép claim (`:48-55`) | `VisitSummaryDto` {VisitId, VisitDate, Department, DoctorName, Diagnosis} (`PatientPortalServiceImpl.cs:241-245`) | Chỉ lấy `Examination` (ngoại trú) — **không join `Admission`** |
| **Chi tiết lượt khám** | `GET /api/portal/visits/{examId}` — `:246-256` | `[Authorize]` + kiểm `exam.MedicalRecord.PatientId == patientId` (`:256-258`) | `PortalVisitDetailDto`: sinh hiệu (Temperature, Pulse, BP, RR, Height, Weight, SpO2), `ChiefComplaint, PresentIllness, PhysicalExamination, InitialDiagnosis, MainDiagnosis, MainIcdCode, SubDiagnosis, ConclusionNote, TreatmentPlan, FollowUpDate`, `Prescriptions[]`, `TreatmentSheets[]`, `Surgeries[]` (`:275-328`) | Không nhúng KQ XN/CĐHA và **không có `ServiceOrders`** |
| Xuất hồ sơ | `GET /api/portal/export-health-record` — `:259-267` | `[Authorize]` | ⚠️ **`text/html`**, không phải PDF (`:331-407`) | App cần PDF thật để lưu/chia sẻ |
| **KQ xét nghiệm** | `GET /api/portal/lab-results?patientId=&fromDate=&toDate=` — `:269-278` | `[Authorize]`, ownership OK | DTO **định nghĩa** {OrderCode, OrderDate, ResultDate, OrderingDoctor, Department, TestCategory, `TestItems: List<LabTestItemDto>{TestName,Result,Unit,NormalRange,Flag,Interpretation}`, Status, IsViewed, ReportUrl} (`PatientPortalDTOs.Part1.cs:260-280`) | ⚠️ **Impl chỉ điền `Id, OrderCode, ResultDate, Status`** (`PatientPortalServiceImpl.cs:409-429`) — `TestItems`/`ReportUrl` luôn null |
| **KQ chẩn đoán hình ảnh** | `GET /api/portal/imaging-results?patientId=&fromDate=&toDate=` — `:280-289` | `[Authorize]`, ownership OK | DTO **định nghĩa** {OrderCode, OrderDate, StudyDate, OrderingDoctor, Department, Modality, BodyPart, StudyDescription, Findings, Impression, ReportingDoctor, Status, `HasImages`, `ImageViewerUrl`, `ThumbnailUrls`, IsViewed} (`PatientPortalDTOs.Part1.cs:295-321`) | ⚠️ **Impl chỉ điền `Id, Modality, StudyDate, Status`** (`:443-449`); `GetImagingResultAsync(id)` có thêm `Findings` nhưng **chưa gắn route**. `ImageViewerUrl` **không bao giờ được set** |
| **Đơn thuốc** | `GET /api/portal/prescriptions?patientId=&activeOnly=` — `:291-299` | `[Authorize]`, ownership OK | `PortalPrescriptionDto` {PrescriptionCode, PrescriptionDate, VisitId, ExaminationId, Diagnosis, DoctorName, DepartmentName, Status, IsDispensed, `Items[]{DrugName, Strength, Quantity, Unit, Dosage, Frequency, DurationDays, Instructions}`} (`PatientPortalDTOs.Part1.cs:328-376`, impl `PatientPortalServiceImpl.Billing.cs:13-58`) | ✅ **Điền đầy đủ** — dùng ngay được. `PrescriptionPdfUrl`/`QRCode`/`CanRefill` chưa set |
| Xin cấp lại đơn / lịch sử | `POST /api/portal/prescriptions/refill` (`:466-473`, có `IsPrescriptionOwnedByPatientAsync`), `GET .../refill-history` (`:475-480`) | `[Authorize]` | `RefillRequestDto` | — |
| Dashboard | `GET /api/portal/dashboard` — `:323-327` | `[Authorize]` | `PatientPortalDashboardDto` | — |
| **Người thân** | `GET/POST/DELETE /api/portal/family-members` — `:332-355` | `[Authorize]` | `List<FamilyMemberDto>` | **Không giới hạn 20**, không phân quyền xem, không quy trình xác minh |
| Nhắc uống thuốc | `GET/POST/DELETE/PUT toggle /api/portal/medicine-reminders` — `:360-392` | `[Authorize]` | `List<MedicineReminderDto>` | Chỉ lưu DB — **không có trigger nhắc thật** |
| Chỉ số sức khoẻ tại nhà | `GET/POST/DELETE /api/portal/health-metrics`, `GET .../trends` — `:397-429` | `[Authorize]` | `HealthMetricDto`, `HealthMetricTrendDto` | — |
| Hỏi-đáp bác sĩ | `GET/POST /api/portal/questions`, `GET .../{id}`, `PUT .../{id}/answer` — `:434-463` | `[Authorize]` | `PatientQuestionDto` | — |
| Phản hồi dịch vụ | `POST /api/portal/feedback`, `GET /api/portal/feedbacks` — `:151-154, 483-487` | mixed | `ServiceFeedbackDto` | — |
| Tra cứu HSBA công khai (CCCD+DOB) | `POST /api/public-emr/lookup` — `PublicEmrLookupController.cs:32-43` | `[AllowAnonymous]` | `PublicEmrLookupResponse` | — |
| **Tải PDF tài liệu đã ký** | `GET /api/public-emr/document/{id}/pdf?token=` — `:50-57` | `[AllowAnonymous]` + token ngắn hạn | file PDF | ⭐ **Mẫu URL ký sẵn — tái dùng cho ví giấy tờ & KQ XN** |
| Chia sẻ ca chụp DICOM (staff tạo) | `POST /api/study-share`, `GET .../my`, `POST .../{id}/revoke` — `StudyShareController.cs:21-34` | `[Authorize]` | `ShareLinkDto` {id, token, url `/shared/{token}`, studyInstanceUID, hasPassword, hideDemographics, expiresAt, maxViews, viewCount, isRevoked} | — |
| Truy cập link chia sẻ (BN xem) | `POST /api/study-share/access/{token}`, `GET .../peek/{token}` — `:39-48` | `[AllowAnonymous]` + mật khẩu | `AccessResultDto` {studyInstanceUID, orthancStudyId, hideDemographics, patientName?, patientCode?, expiresAt, requiresPassword} | Token 24 byte ngẫu nhiên hex, mật khẩu SHA-256 (`StudyShareService.cs:23-34`). ⚠️ `HideDemographics=true` **bị từ chối — chưa implement** (`:41-50`) |

**Entity nền** (`HIS.Core/Entities/ExtendedWorkflowEntities.cs`):
`PortalAccount:1424` (PatientId **nullable**, Username, PasswordHash, Email, Phone, IsEmailVerified,
IsPhoneVerified, IsKYCVerified, KYCDocumentType/Number, Status `Active|Suspended|Locked`, LastLoginAt,
FailedLoginAttempts, LockedUntil, ReceiveEmail/SMSNotifications, PreferredLanguage) ·
`PortalAppointment:1458` · `OnlinePayment:1502` · `FamilyMember:1536` (AccountId, FullName,
Relationship, DateOfBirth, Gender, IdNumber, Phone, InsuranceNumber, LinkedPatientId, IsActive) ·
`MedicineReminder:1553` · `HealthMetric:1571` · `PatientQuestion:1591`.

> ⚠️ `PortalAccount` **chưa có**: `MustChangePassword`, `PasswordChangedAt`, `SecurityStamp`, PIN,
> khoá sinh trắc — và **không có bảng thiết bị / push token**. Đây là schema phải bổ sung ở Phase 1.

---

## 3. Bệnh nhân (danh mục & tra cứu)

| Nghiệp vụ | Route/Method (file:line) | Auth | Trả về gì | Thiếu gì cho app BN |
|---|---|---|---|---|
| Theo Id / mã BN / CCCD / số BHYT | `GET /api/patients/{id}` `:21-29` · `/by-code/{code}` `:31-39` · `/by-identity/{identityNumber}` `:41-49` · `/by-insurance/{insuranceNumber}` `:51-58` | `[Authorize]` (staff) | `PatientDto` | — |
| Tìm kiếm | `POST /api/patients/search` `:61-66` (DTO `PatientDto.cs:62-71`) | `[Authorize]` | `PagedResultDto<PatientDto>` | **Không có `dateOfBirth`** → không tra được "tên + ngày sinh"; **không có route theo SĐT** |
| CRUD bệnh nhân | `POST/PUT/DELETE /api/patients` `:69-105` | `[Authorize]` | `PatientDto` | Staff-only, **không expose thẳng cho app** |

`PatientDto` (`PatientDto.cs:3-25`): Id, PatientCode, FullName, DateOfBirth, YearOfBirth,
Gender/GenderName, IdentityNumber, PhoneNumber, Email, Address, Ward/District/ProvinceName,
InsuranceNumber/ExpireDate/FacilityCode, BloodType, RhFactor, PhotoPath.

---

## 4. Thông báo & realtime

| Nghiệp vụ | Route/Method (file:line) | Auth | Trả về gì | Thiếu gì cho app BN |
|---|---|---|---|---|
| Thông báo của tôi | `GET /api/notification/my?limit=50` — `NotificationController.cs:35-41` | `[Authorize]` (staff) | 50 bản ghi mới nhất | Đọc theo `TargetUserId` (**staff**); BN dùng `GET /api/portal/notifications` (kho khác) |
| Số chưa đọc | `GET /api/notification/unread-count` — `:47-53` | `[Authorize]` | count | — |
| Đánh dấu đã đọc | `PUT /api/notification/{id}/read`, `PUT .../read-all` — `:59-77` | `[Authorize]` | bool | — |
| **Gửi link KQ XN qua SMS** | `POST /api/notification/send-lab-result-link` — `:109-114` | `[Authorize]` | `{AccessUrl, ExpiresAt}` | ⭐ Mẫu one-time-token xem KQ không cần đăng nhập |
| SMS gateway | `GET /api/sms/balance`, `POST /api/sms/test`, `POST /api/sms/send-test`, `GET /api/sms/logs`, `GET /api/sms/stats` — `SmsController.cs:20-59` | `[Authorize]` (admin) | thông tin gateway esms/speedsms | **Không có API OTP SMS công khai** cho đăng ký/đăng nhập app |
| SignalR thông báo | Hub `NotificationHub` map `Program.cs:456` → **`/hubs/notifications`**, group `user_{userId}`, event `ReceiveNotification` (`NotificationHub.cs:6-43`) | `[Authorize]` | push realtime | Group theo **staff userId** — chưa có group cho `PortalAccount` |
| SignalR chat RIS | `RisChatHub` → `/hubs/ris-chat` (`Program.cs:457`) | `[Authorize]` | chat theo ca chụp | Dành cho nhân viên |

**Kho thông báo**: entity `Notification` (`SystemAdmin.cs:69-82`) chỉ có `TargetUserId` → **staff**.
Thông báo BN đi đường riêng trong `IPatientPortalService`. **Hai kho tách rời.**

**FCM/APNs**: grep `firebase|Fcm|PushToken|DeviceToken` toàn backend → **KHÔNG có implementation nào**.
`PortalAccountDto.NotifyByPush` (`PatientPortalDTOs.Part1.cs:35`) chỉ là cờ preference.

---

## 5. Sinh trắc học / WebAuthn

- `AuthController`/`AuthService`/`AuthDto`: WebAuthn/FIDO2 đầy đủ — **bảng `WebAuthnCredentials` khoá
  `UserId` (nhân viên)**, không có `AccountId`/`PatientId`.
- `BiometricSignatureService.cs`: chữ ký số sinh trắc cho **bác sĩ** khi ký hồ sơ — không liên quan.
- **Không tồn tại** WebAuthn/passkey nào gắn `PortalAccount`.

---

## 6. Lấy số thứ tự (STT)

| Nghiệp vụ | Route/Method (file:line) | Auth | Request | Response | Ghi chú |
|---|---|---|---|---|---|
| Cấp số kiosk | `POST /api/kiosk/issue` — `KioskController.cs:37-50` | `[AllowAnonymous]` | `IssueTicketDto` {DepartmentId, RoomId, ServiceType `OPD|LAB|IMAGING|PHARMACY`, PatientName, Note} (`KioskDTOs.cs:8-16`) | `KioskTicketDto` {TicketNumber, SequenceNumber, DepartmentName, RoomName, ServiceType, Status(0-3), StatusLabel, IssuedAt, CalledAt, **PeopleAheadInQueue**} (`KioskDTOs.cs:47-75`) | Số `{Prefix}{NNN}` (A/L/I/P), reset 0h giờ VN theo `DepartmentId`+prefix. **Entity `KioskTicket` KHÔNG có cột Priority** |
| Check-in kiosk CCCD/BHYT | `POST /api/kiosk/checkin` — `:56-69` | `[AllowAnonymous]` | `CheckinByCardDto` {CitizenId, InsuranceCard, DepartmentId, RoomId, ServiceType, Note} | `CheckinResultDto` {Ticket, PatientFound, MaskedPatientName, InsuranceWarning} | Cảnh báo thẻ BHYT sắp hết hạn (`KioskService.cs:130-191`) |
| Hàng chờ kiosk | `GET /api/kiosk/queue?departmentId=&roomId=` — `:74-82` | `[AllowAnonymous]` | — | `QueueStatusDto` {DepartmentId/Name, WaitingCount, CurrentCalledTicket, WaitingTickets[]} | `KioskService.cs:193-224` |
| Xem phiếu kiosk | `GET /api/kiosk/ticket/{id}` — `:87-93` | `[AllowAnonymous]` | — | `KioskTicketDto` | BN tự tra số |
| Gọi số / hoàn tất / huỷ (kiosk) | `POST /api/kiosk/call-next`, `.../ticket/{id}/complete`, `.../ticket/{id}/cancel` — `:100-144` | `[Authorize]` | — | `KioskTicketDto` | FIFO theo `SequenceNumber`, **không ưu tiên** (`KioskService.cs:226-251`) |
| **Cấp STT đầy đủ (lễ tân)** | `POST /api/reception/queue/issue` — `ReceptionCompleteController.cs:137-142` | `[Authorize]` | `IssueQueueTicketDto` {PatientId?, PatientName?, RoomId, QueueType(1-5), **Priority: 0 Thường / 1 Ưu tiên / 2 Cấp cứu**, Source} (`ReceptionCompleteDTOs.Part1.cs:71-79`) | `QueueTicketDto` {TicketCode, QueueNumber, RoomId/Name, QueueType, **Priority/PriorityName**, Status, **EstimatedWaitMinutes**} (`...Part1.cs:84-131`) | Số theo `RoomId`+`QueueType` từ `QueueConfiguration`, reset 0h giờ VN, chặn trùng vé cùng BN/phòng/ngày (`ReceptionCompleteService.Queue.cs:347-443`) |
| **Cấp STT qua di động** | `POST /api/reception/queue/issue-mobile` — `:147-153` | `[AllowAnonymous]` | `MobileQueueTicketDto` {PatientPhone, PatientName?, InsuranceNumber?, RoomId, QueueType} (`...Part1.cs:153-159`) | `QueueTicketDto` | ⚠️ **hard-code `Priority = 0`** (`ReceptionCompleteService.Queue.cs:445-461`) → app không xin được số ưu tiên |
| Gọi số tiếp theo | `POST /api/reception/queue/call-next` — `:158-164` | `[Authorize]` | `CallNextRequestDto` {RoomId, QueueType} | `QueueTicketDto` | Cấp cứu(2) → Ưu tiên(1) → Thường(0) rồi `QueueNumber` tăng dần (`Queue.cs:463-486`) |
| Gọi / gọi lại / bỏ qua / phục vụ / hoàn thành | `POST /api/reception/queue/{ticketId}/{call\|recall\|skip\|start-serving\|complete}` — `:169-218` | `[Authorize]` | — | `QueueTicketDto` | Status: 0 Chờ · 1 Đang gọi · 2 Đang phục vụ · 3 Hoàn thành · 4 Bỏ qua (`Queue.cs:16`) |
| Danh sách chờ theo phòng | `GET /api/reception/queue/waiting/{roomId}?queueType=&date=` — `:223-231` | `[Authorize]` | — | `List<QueueTicketDto>` | Sắp theo Priority rồi QueueNumber (`Queue.cs:571-586`) |
| **Màn hình hàng đợi (public)** | `GET /api/reception/queue/display/{roomId}?queueType=` — `:236-248` | `[AllowAnonymous]` | — | `QueueDisplayDto` {RoomId/Name, DoctorName, **CurrentServing**, CallingList[], WaitingList[] (top 10), **TotalWaiting**, **AverageWaitMinutes**} (`...Part1.cs:136-148`) | ⭐ PII bị che (`MaskTicketPii`, `:236-269`) — **dùng được ngay cho app** |
| Số đang gọi (public) | `GET /api/reception/queue/calling/{roomId}?limit=5` — `:253-260` | `[AllowAnonymous]` | — | `List<QueueTicketDto>` (che PII) | Top N Status=1 |
| Ước tính chờ | nội bộ `CalculateEstimatedWaitAsync` — `ReceptionCompleteService.cs:118-` | — | — | int phút | TB thời gian phục vụ thực tế hôm nay (≥3 vé xong, kẹp 2-30 phút) × số vé chờ trước. **Không có route GET riêng theo `ticketId`** |
| Cấu hình hàng đợi | `GET/POST /api/reception/queue/config[/{roomId}]` — `ReceptionCompleteController.BillingStats.cs:145-169` | `[Authorize]` | `QueueConfigurationDto` | Prefix, StartNumber, MaxPatients, MaxInsurancePatients, StartTime/EndTime | staff |
| Thống kê chờ/ngày | `GET /api/reception/statistics/{room/{roomId}\|daily\|waiting-time\|waiting-phase-analysis}` — `...BillingStats.cs:83-131` | `[Authorize]` | — | `QueueDailyStatisticsDto`, `AverageWaitingTimeDto`, `WaitingPhaseAnalysisDto` | Dùng cho dashboard web quản trị |

**Priority tồn tại thật** ở `QueueTicket` (`Queue.cs:147`) + DTO (`...Part1.cs:77,109-110`), được
`CallNextAsync`/`GetWaitingListAsync` áp dụng đúng thứ tự (`Queue.cs:472-473, 581`) — **nhưng cả hai lối
vào công khai cho di động đều không set được Priority**, và không có trường "lý do ưu tiên"
(người cao tuổi / trẻ em / thai phụ / khuyết tật) gắn với vé.

---

## 7. Đặt khám online

| Nghiệp vụ | Route/Method (file:line) | Auth | Request | Response | Ghi chú |
|---|---|---|---|---|---|
| Danh sách khoa khám | `GET /api/booking/departments` — `AppointmentBookingController.cs:26-31` | `[AllowAnonymous]` (class-level `:13`) | — | `BookingDepartmentDto` {Id, Code, Name, Description, AvailableRooms, AvailableDoctors} (`IAppointmentBookingService.cs:19-27`) | Lọc `DepartmentType == 1` (`AppointmentBookingService.cs:38-56`) |
| Bác sĩ theo khoa | `GET /api/booking/doctors?departmentId=` — `:36-41` | `[AllowAnonymous]` | — | `BookingDoctorDto` {Id, FullName, Title, Specialty, DepartmentId/Name, PhotoUrl (luôn null)} | `Users` với `UserType==2`; **không lọc theo ngày trực** (`:58-82`) |
| **Khung giờ trống** | `GET /api/booking/slots?date=&departmentId=&doctorId=` — `:46-54` | `[AllowAnonymous]` | — | `BookingSlotResult` {Date, DepartmentName, DoctorName, MorningSlots[], AfternoonSlots[], TotalAvailable}; `BookingTimeSlot` {StartTime, EndTime, DisplayTime, IsAvailable, CurrentBookings, MaxBookings} | ⚠️ **hard-code** 7:30-11:30 / 13:30-16:30, slot 30′, `maxBookingsPerSlot = 5` cho MỌI khoa/bác sĩ (`:86-92, 475-503`); **không đọc `DoctorSchedule`** (`Appointment.cs:58-80`) dù bảng đó đã có CRUD |
| Đặt lịch | `POST /api/booking/book` — `:59-67` | `[AllowAnonymous]` | `OnlineBookingDto` {PatientName, PhoneNumber, Email?, DateOfBirth?, Gender?, IdentityNumber?, Address?, AppointmentDate, AppointmentTime?, DepartmentId?, DoctorId?, AppointmentType (1 Tái khám / 2 Khám mới / 3 KSK), Reason?, Notes?, ServiceIds?[]} | `BookingResultDto` {Success, Message, AppointmentCode, AppointmentDate/Time, DepartmentName, DoctorName, RoomName, EstimatedWaitMinutes (hard-code 15)} | Anti-fraud: blacklist SĐT/IP, `MaxPerPhonePerDay`=3 / `MaxPerIpPerDay`=10 qua `SystemConfig`, chặn trùng lịch (`:128-244`). Tạo `Patient` mới nếu chưa có (trừ khi `Booking.OnlyExistingPatient=true`). Email+SMS xác nhận fire-and-forget. ⚠️ **Phòng chọn ngẫu nhiên phòng active đầu tiên trong khoa** (`:262-276`) |
| Tra cứu lịch hẹn | `GET /api/booking/lookup?code=&phone=` — `:72-79` | `[AllowAnonymous]` | — | `List<BookingStatusDto>` (≤20) | `:364-398` |
| BN tự huỷ lịch | `PUT /api/booking/{appointmentCode}/cancel` — `:84-91` | `[AllowAnonymous]` | `CancelBookingDto` {PhoneNumber, Reason?} | `BookingStatusDto` | Xác thực SĐT khớp patient; chặn huỷ khi `Status>=2` (`:400-436`) |
| Dịch vụ khám | `GET /api/booking/services?departmentId=` — `:96-101` | `[AllowAnonymous]` | — | `BookingServiceDto` {Id, Code, Name, Category, Price, EstimatedMinutes} | `ServiceType==1`, ≤100 |
| **[Staff]** Lịch làm việc bác sĩ (CRUD) | `GET/POST/DELETE /api/booking-management/schedules[...]`, `POST .../schedules/{id}/generate` — `BookingManagementController.cs:26-59` | `[Authorize]` | `SaveDoctorScheduleDto` {DoctorId, DepartmentId, RoomId?, ScheduleDate, StartTime, EndTime, MaxPatients, SlotDurationMinutes, ScheduleType, Note, IsRecurring} | `DoctorScheduleListDto` (+ `BookedCount`) | ⭐ **Nguồn lịch trực thật — nhưng `/api/booking/slots` không dùng** |
| **[Staff]** Duyệt / đổi / check-in | `GET /api/booking-management/bookings`, `PUT .../{code}` (update/confirm/checkin/no-show/cancel), `POST .../{code}/reception-checkin` — `:63-144` | `[Authorize]` | `BookingSearchDto`, `UpdateBookingDto`, `StaffCancelBookingDto` | `BookingManagementPagedResult`, `BookingCheckinResultDto` | Check-in gọi `QuickRegisterByAppointmentAsync` → **sinh lượt khám thật + vào hàng đợi lễ tân** (`:84-104`); lỗi bị nuốt (best-effort) |
| **[Staff]** Thống kê đặt lịch | `GET /api/booking-management/stats?date=` — `:120-136` | `[Authorize]` | — | `BookingStatsDto` {Total, Pending, Confirmed, Attended, NoShow, Cancelled, NoShowRate, ByDepartment[]} | Dùng cho dashboard web quản trị |

`Appointment.Status` (`Appointment.cs:32`): 0 Chờ xác nhận · 1 Đã xác nhận · 2 Đã đến khám · 3 Không đến · 4 Đã huỷ.
`AppointmentType`: 1 Tái khám · 2 Khám mới · 3 Khám sức khoẻ.

**Danh mục public dùng được cho app**: chỉ `GET /api/booking/departments` và `/api/booking/doctors`.
Ba route phòng của lễ tân (`/api/reception/rooms/overview`, `/rooms/{roomId}/detail`, `/rooms/available`
— `ReceptionCompleteController.cs:43-96`) đều `[Authorize]` → app chưa đăng nhập không gọi được.

---

## 8. Kết quả KCB ngoại trú

### 8.1 Xét nghiệm

| Nghiệp vụ | Route/Method (file:line) | Auth | Response (key fields) | Ghi chú |
|---|---|---|---|---|
| **[BN]** DS kết quả XN | `GET /api/portal/lab-results` — `PatientPortalController.cs:269-278` | ownership OK | xem §2 | ⚠️ chỉ 4 field được điền |
| **[Staff]** KQ CLS 1 lượt khám, **theo từng chỉ số** | `GET /api/examination/{examinationId}/lab-results` — `ExaminationCompleteController.Services.cs:159-164` | `[Authorize]` **không giới hạn role** (`ExaminationCompleteController.cs:18`) | `PatientLabResultsDto` { `LabResults: List<LabResultSummaryDto>{TestCode,TestName,ResultValue,Unit,ReferenceRange,IsAbnormal,ResultDate,Status, Items: List<LabResultItemDto>{TestName,Result,Unit,ReferenceRange,IsAbnormal,AbnormalType,Flag}}`, `ImagingResults[]` } (`ExaminationCompleteDTOs.Part1.cs:121-184`; impl `ExaminationCompleteService.WaitingList.cs:229-290`) | ⭐ **Endpoint DUY NHẤT trả bảng chỉ số thật** — build từ `ServiceRequestDetailParameters`. **Không kiểm ownership** → xem GAP §11.1 |
| **[Staff]** Chi tiết phiếu XN (LIS) | `GET /api/LISComplete/orders/{orderId}` — `LISCompleteController.cs:332-338` | `[Authorize]` (không role) | `LabOrderDetailDto` {OrderCode, PatientCode/Name, OrderDate, OrderDoctorName, DepartmentName, Diagnosis, ClinicalInfo, `TestItems[]{TestCode,TestName,Result,Unit,ReferenceRange,NormalMin,NormalMax}`, Samples} | — |
| **[Staff]** Lịch sử KQ theo BN (trend) | `GET /api/LISComplete/patients/{patientId}/history?testCode=&lastNMonths=` — `:508-517` | `[Authorize]` (không role) | `LabResultHistoryDto` {OrderId, TestDate, TestCode, TestName, Result, Unit, ReferenceRange, Flag, ApprovedBy} | Không kiểm caller == patient |
| **[Staff]** So sánh KQ | `GET /api/LISComplete/patients/{patientId}/compare?testCode=&lastNTimes=` — `:522-531` | `[Authorize]` | `LabResultComparisonDto` {DataPoints[], TrendPercentage, TrendDirection} | — |
| **PDF phiếu KQ XN** | `GET /api/pdf/lab-result/{requestId}` (`?format=pdf` hoặc `Accept: application/pdf`) — `PdfController.cs:205-217` | `[Authorize]` **không giới hạn role** (`PdfController.cs:18-21`) | `application/pdf`, tự ký nếu có phiên ký | ⭐ **Đây là endpoint "xem file KQ XN"** của HSMT. Không kiểm ownership |
| PDF KQ XN (bản LIS) | `GET /api/LISComplete/orders/{orderId}/print?format=A4` — `:451-465` | `[Authorize]` | `application/pdf`; 400 nếu KQ chưa duyệt | Bộ xuất PDF thứ hai |

### 8.2 Chẩn đoán hình ảnh & PACS

| Nghiệp vụ | Route/Method (file:line) | Auth | Response | Ghi chú |
|---|---|---|---|---|
| **[BN]** DS kết quả CĐHA | `GET /api/portal/imaging-results` — `PatientPortalController.cs:280-289` | ownership OK | xem §2 | ⚠️ chỉ 4 field được điền; `ImageViewerUrl` không bao giờ set |
| **[Staff]** Chi tiết KQ CĐHA | `GET /api/RISComplete/order-items/{orderItemId}/result` — `RISCompleteController.Reports.cs:155-161` | `[Authorize(Roles=Admin,QuanTriHeThong,RadiologistManager,Radiologist,Technician,Doctor)]` | `RadiologyResultDto` {OrderCode, PatientCode/Name, ServiceCode/Name, **ServiceType**, ResultDate, Description, **Conclusion**, Note, TechnicianName, DoctorName, ApprovalStatus, ApprovedTime/By, `Images: List<AttachedImageDto>`, **DicomStudyUID**} (`RISCompleteDTOs.Part1.cs:345-367`) | `ServiceType` phân biệt **CĐHA vs TDCN**. Role không có `PortalPatient` |
| **[Staff]** Lịch sử CĐHA theo BN | `GET /api/RISComplete/patients/{patientId}/history?serviceType=&lastNMonths=` — `:436-445` | staff roles | `List<RadiologyResultDto>` | — |
| **[Staff]** PDF phiếu KQ CĐHA | `GET /api/RISComplete/results/{resultId}/print?format=A4&includeImages=true` — `:398-407` | staff roles | `application/pdf` | — |
| Viewer URL (nội bộ) | `GET /api/RISComplete/viewer/url?studyInstanceUID=` — `RISCompleteController.Viewer.cs:25-31` | staff roles | `ViewerUrlDto` {StudyInstanceUID, ViewerUrl `/radiology/viewer?study={uid}`, WadoRsUrl `/api/radiology/dicom-web/studies/{uid}`, DicomWebUrl `/api/radiology/dicom-web`} (impl `RISCompleteService.CatalogAdmin.cs:26-36`) | ⚠️ **`WadoRsUrl`/`DicomWebUrl` trỏ route KHÔNG TỒN TẠI** — không có controller `radiology/dicom-web` |
| **Ảnh DICOM thật — proxy Orthanc** | `GET /api/RISComplete/pacs/instances/{instanceId}/preview` — `RISCompleteController.Reports.cs:239-267` · `.../rendered?width=` — `:273-310` · `.../file` (`application/dicom`) — `:315-342` | **`[Authorize]` không giới hạn role** (`RISCompleteController.cs:29`) | stream bytes, proxy Basic-Auth tới `PACS:BaseUrl`; 500 `{error:"PACS_NOT_CONFIGURED"}` nếu thiếu cấu hình (`:26-31`) | ⭐ **Đây mới là đường ảnh PACS thật** FE đang dùng (`frontend/src/modules/radiology/pages/DicomViewer.tsx:253-281` build `wadouri:/api/RISComplete/pacs/instances/{id}/...`) |
| Liệt kê study/series/image | `GET /api/RISComplete/pacs/studies?patientId=&fromDate=&toDate=` — `:201-210` · `.../studies/{studyInstanceUID}/series` — `:215-221` · `.../series/{seriesInstanceUID}/images` — `:226-232` | `[Authorize(Roles=Admin,QuanTriHeThong,RadiologistManager,Radiologist,Technician)]` | `DicomStudyDto`/`DicomSeriesDto`/`DicomImageDto` | ⚠️ **Không có route `.../studies/{id}/instances`** dù `frontend/src/pages/PublicStudyViewer.tsx:74` gọi đúng route đó → 404 |
| Ghi đĩa CD/DVD | `GET /api/RISComplete/studies/{studyId}/disc-package/check` — `Viewer.cs:543-545` · `POST .../disc-package` — `:551-556` | `[Authorize]` | `application/zip` | — |
| Ảnh **không DICOM** (siêu âm cầm tay, nội soi) | `POST /api/non-dicom/studies` — `NonDicomController.cs:42-44` · `POST .../studies/{studyId}/upload` (multipart, 500MB) — `:50-97` · `GET /api/non-dicom/image/{studyId}/{fileName}` **`[AllowAnonymous]`** (chống path traversal) — `:99-124` | mixed | `NonDicomImage` {MediaType `image|video|pdf`, FilePath `/api/non-dicom/image/{studyId}/{file}`, FileSize, MimeType} | Phục vụ `.jpg/.png/.webp/.mp4/.webm/.pdf` |

### 8.3 Thăm dò chức năng (TDCN)

| Nghiệp vụ | Route/Method (file:line) | Auth | Ghi chú |
|---|---|---|---|
| Danh mục loại TDCN | `GET /api/functional-diagnostic-catalog/test-types?keyword=` — `FunctionalDiagnosticCatalogController.cs:29-32` | `[Authorize]` | Chỉ danh mục |
| Mẫu kết quả TDCN | `GET /api/functional-diagnostic-catalog/templates?testTypeId=&keyword=` — `:45-48` | `[Authorize]` | Chỉ định nghĩa mẫu |
| **Kết quả TDCN thật** | Dùng chung pipeline RIS: `GET /api/RISComplete/orders?...&serviceType=` (`Reports.cs:38-50`), `GET .../order-items/{orderItemId}/result` (`:155-161`) | staff roles | Region header `8.3 Thực hiện CĐHA, TDCN` (`Reports.cs:33`); sổ TDCN `GET /api/RISComplete/reports/functional-test-register` (`:620-628`) |
| **Endpoint TDCN cho BN** | — | — | ❌ **KHÔNG CÓ** — `api/portal/*` không có route TDCN nào |

### 8.4 Đơn thuốc

| Nghiệp vụ | Route/Method (file:line) | Auth | Ghi chú |
|---|---|---|---|
| **[BN]** DS đơn thuốc | `GET /api/portal/prescriptions` — `PatientPortalController.cs:291-299` | ownership OK | ✅ **Điền đầy đủ** (`PatientPortalServiceImpl.Billing.cs:13-58`) |
| **[Staff]** Đơn theo lượt khám / theo Id | `GET /api/examination/{examinationId}/prescriptions` — `Prescriptions.cs:15-20` · `GET /api/examination/prescriptions/{id}` — `:48-53` | `[Authorize]` (không role) | `PrescriptionFullDto` |
| **PDF đơn thuốc** | `GET /api/examination/prescriptions/{prescriptionId}/print` — `Prescriptions.cs:275-280` · `GET /api/pdf/prescription/{prescriptionId}` — `PdfController.cs:187-199` | `[Authorize]` (không role) | Hai bộ xuất PDF độc lập cho cùng một chứng từ |
| Gửi đơn lên Cổng ĐTQG | `POST /api/national-prescription/submit/{prescriptionId}` — `NationalPrescriptionController.cs:47-49` · `GET .../{id}` — `:37-42` | `[Authorize]` | Tuân thủ BYT, không phải tính năng xem của BN |

### 8.5 Khám sức khoẻ hợp đồng

Module **tồn tại** nhưng là quản trị theo **đợt/hợp đồng cho tổ chức**, tách hoàn toàn khỏi `api/portal/*`.

| Nghiệp vụ | Route/Method (file:line) | Auth | Response | Ghi chú |
|---|---|---|---|---|
| DS đợt khám | `GET /api/health-checkup/campaigns` — `SupplementaryControllers.cs:276-281` | `[Authorize]` | `CampaignListDto` {CampaignCode, CampaignName, OrganizationName, StartDate, EndDate, Status, TotalRegistered, TotalCompleted, CompletionRate} (`SupplementaryDTOs.cs:293-308`) | — |
| Tạo đợt khám | `POST /api/health-checkup/campaign` — `:286-291` | `[Authorize]` | `CreateCampaignDto` (+ `ContractAmount`, `OrganizationName` = phần "hợp đồng") | — |
| KQ khám theo đợt | `GET /api/health-checkup/campaign/{id}/records` — `:296-301` | `[Authorize]` | `CheckupRecordDto` {CampaignId, **PatientId?**, EmployeeName/Code, Department, CheckupDate, ResultSummary, CertificateIssued, CertificateNumber, Classification, DoctorName, BloodPressure, Height, Weight, BMI} (`SupplementaryDTOs.cs:323-344`) | ⚠️ `PatientId` **nullable** |
| Cấp giấy chứng nhận | `PUT /api/health-checkup/record/{id}/certificate` — `:316-321` | `[Authorize]` | `CheckupRecordDto` | **Không có endpoint PDF giấy chứng nhận** |
| Thống kê / Dashboard | `GET /api/health-checkup/statistics`, `.../dashboard` — `:326-341` | `[Authorize]` | `CheckupStatisticsDto`, `CheckupDashboardDto` | — |
| **Tra theo `patientId`** | — | — | — | ❌ **KHÔNG TỒN TẠI** — `IHealthCheckupService` (`ISupplementaryServices.cs:52-72`) chỉ có `GetRecordsByCampaignAsync(campaignId)` |

---

## 9. Kết quả KCB nội trú

| Nghiệp vụ | Route/Method (file:line) | Auth | Response key fields | Ghi chú |
|---|---|---|---|---|
| **Liệt kê đợt nhập viện của 1 BN** | — | — | — | ❌ **KHÔNG CÓ.** `GET /api/portal/visits` chỉ trả `Examination` (OPD); `GET /api/inpatient/patients` (`InpatientCompleteController.cs:112-117`) là worklist khoa và `InpatientSearchDto` (`InpatientCompleteDTOs.Part4.cs:462-475`) **không có field `PatientId`** |
| Chi tiết đợt điều trị | `GET /api/inpatient/{admissionId}/detail` — `InpatientCompleteController.cs:139-146` | `[Authorize]` (staff) | `AdmissionDto` | Không có `PortalPatient` trong policy |
| **KQ xét nghiệm nội trú (bản đầy đủ)** | `GET /api/inpatient/lab-results/{admissionId}` — `:408-413` | `[Authorize]` (staff) | `LabResultItemDto` {TestCode, TestName, Result, Unit, ReferenceRange, IsAbnormal, Status, ResultDate} (`InpatientCompleteDTOs.Part1.cs:563-574`) | ⭐ DTO đầy đủ — **nhưng không expose cho BN** |
| KQ CĐHA nội trú theo `admissionId` | — | — | — | ❌ **KHÔNG CÓ** endpoint riêng |
| KQ TDCN nội trú | — | — | — | ❌ **KHÔNG CÓ** (`RequestType == 3` đã định nghĩa ở `ServiceRequest.cs:36` nhưng không có API) |
| **Công khai thuốc — in PDF** | `GET /api/inpatient/print-medicine-disclosure/{admissionId}` — `InpatientCompleteController.Discharge.cs:80-85` → `InpatientCompleteService.Discharge.cs:337-379` | `[Authorize]` (staff) | **PDF/HTML**, không phải JSON | Mỗi dòng: Ngày kê đơn, Tên thuốc, ĐVT, SL, Đơn giá, Thành tiền, Nguồn (BHYT/Viện phí/Khác); build từ `PrescriptionDetails` where `Prescription.PrescriptionType == 2` |
| Công khai dịch vụ (CLS) — in PDF | `GET /api/inpatient/print-service-disclosure/{admissionId}` — `Discharge.cs:70-75` → `Service.Discharge.cs:293-335` | `[Authorize]` | PDF | Build từ `ServiceRequestDetails` join `ServiceRequest` |
| **DTO công khai thuốc/dịch vụ (JSON)** | `MedicineDisclosureDto` / `ServiceDisclosureDto` — `InpatientCompleteDTOs.Part4.cs:238-298` | — | {Date, Code, Name, Unit, Quantity, UnitPrice, Amount, PaymentSourceName}, TotalAmount, InsuranceAmount, PatientAmount | ⚠️ **DTO tồn tại nhưng KHÔNG service nào điền** — grep xác nhận chỉ xuất hiện tại nơi khai báo |
| Bảng kê chi phí 6556 | `GET /api/inpatient/billing-statement/{admissionId}` — `Discharge.cs:90-95` → `Service.Discharge.cs:381-390` | `[Authorize]` | `BillingStatement6556Dto` | 🚨 **STUB hard-code**: `AdmissionDate = DateTime.Now.AddDays(-7)`, `DaysOfStay = 7` — không đọc DB |
| **Chỉ định CLS nội trú** | `GET /api/inpatient/{admissionId}/service-requests` — `InpatientCompleteController.ServiceOrders.cs:174-180` | `[Authorize]` (staff) | `InpatientServiceRequestItemDto` {Id, RequestCode, RequestDate, ServiceName, Quantity, UnitPrice, TotalAmount, **RequestType** (1 XN / 2 CĐHA / 3 TDCN / 4 PTTT), **Status** (0 Chờ TT … 4 Đã huỷ), PatientType, IsEmergency} (`InpatientCompleteDTOs.Part4.cs:526-564`) | Không có route portal tương đương |
| **STT thực hiện CLS** | — | — | — | ❌ **KHÔNG CÓ field STT** trên `ServiceRequest`/`ServiceRequestDetail` (`ServiceRequest.cs:1-115`). Gần nhất: `RadiologyRoomAssignment.QueueNumber` (`Radiology.cs:383`, chỉ CĐHA) và `Queue.QueueNumber` (`Queue.cs:9`, hàng chờ khám) — **không map ngược vào DTO chỉ định** |
| Đơn thuốc nội trú (staff) | `GET /api/inpatient/prescriptions/{admissionId}` — `ServiceOrders.cs:282-287` | `[Authorize]` | `InpatientPrescriptionDto` | Có thể build "công khai thuốc" từ đây |
| Phát thuốc nội trú (kho dược) | `InpatientDispensingController.cs:29-47` | `[Authorize]` | `BatchDispenseDto` | Nghiệp vụ dược nội bộ |
| Phòng lưu / Observation | `ObservationStayController.cs:26-58` | `[Authorize]` | — | Không có API patient-facing |

---

## 10. Frontend & hạ tầng (nền cho web quản trị + deploy)

### 10.1 Routing v2 — cách thêm module quản trị mới
- Router gốc `frontend/src/router/AppRouter.tsx` → `AppRoutes.tsx`.
- `/v2/*` **data-driven** từ `v2Routes` (`frontend/src/router/routeConfigs/index.ts:15-22`), gộp 6 file
  domain: `common` · `clinical` · `diagnostic` · `financial` · `administration` · `system`.
- Render trong `<Route element={<TerminalLayout />}>` tại `AppRoutes.tsx:360-383` (trừ route có
  `meta.layoutOverride` render "trần" tại `:337-358` — dùng cho viewer fullscreen/print blank).
- **Thêm 1 module quản trị**: (1) tạo page `frontend/src/modules/administration/pages/X.tsx` →
  (2) lazy import ở `frontend/src/router/lazy/administration.lazy.ts:7` →
  (3) thêm `RouteEntry` vào `routeConfigs/administration.routes.ts:15-49` (path **không** có tiền tố
  `/v2/`, `meta: {title, group, permission, workspace, module}` — shape ở `frontend/src/types/route.ts:19-38`) →
  (4) thêm mục menu vào `HIS_GROUPS` trong `frontend/src/services/menu.service.ts:19` (nhóm
  `management` từ dòng `:145-165`). Route và menu **đăng ký độc lập** — phải sửa cả hai; trùng path
  được cảnh báo console ở dev (`routeConfigs/index.ts:24-28`).

### 10.2 `_v2kit` & API client
- `frontend/src/_v2kit.tsx` (345 dòng) — barrel re-export UI primitive + page-glue (`SimpleV2Page`,
  `useListData`, `useTabCounts`, `makeStatus`, `fmt*`, toast `tk/ti/tw/te`). Chuẩn 4 khối:
  `KpiStrip` + `StatusTabs` + `DataTable` + `DrawerShell` (`_v2kit.tsx:18-22`). CSS `ab-module.css`
  import qua `TerminalLayout`.
- **Client thật là `frontend/src/services/apiClient.ts`** (không phải `api/client.ts` — file đó không
  tồn tại; `frontend/src/api/` chỉ có module lẻ `auth.ts`, `pdf.ts`…).
  - axios `baseURL = API_URL`, `timeout: 60_000` (`:51-67`); interceptor gắn Bearer từ
    `localStorage.token` (`:70-79`); **tự unwrap envelope `{success,data}` → trả thẳng `data`** (`:82-89`).
  - 401 → single-flight auto-refresh + replay 1 lần (`:17-47`, `:112-125`); thất bại → xoá session +
    `/login` (`:126-133`); case `SESSION_INVALIDATED` (`:101-111`); ngoại lệ `/inspector-portal` (`:96-98`).
  - 403 body `error: PASSWORD_CHANGE_REQUIRED` → redirect `/change-password` (`:137-143`).
  - 503 → `CustomEvent('his:maintenance')` (`:145-147`).

### 10.3 Docker & deploy
- **`docker-compose.yml`** (repo root, DEV LOCAL, không có service API/FE): `sqlserver` (:2-19) ·
  `orthanc` (`orthancteam/orthanc:26.7.0`, REST chỉ loopback `127.0.0.1:${ORTHANC_REST_HOST_PORT:-8043}`) (:23-52) ·
  `orthanc-peer` (profile `dicom-test`) (:56-83) · `redis` (:87-100). **Không có Caddy/TLS.**
- **`deploy/pacs/`** — PACS production: `orthanc` (storage Cloudflare R2 qua biến `R2_*`, OHIF bật qua
  `ORTHANC__OHIF__ENABLE_VIEWER`) + `caddy` (`caddy:2.8-alpine`, 80/443, Let's Encrypt);
  `deploy/pacs/Caddyfile` reverse_proxy `orthanc:8042` + CORS (`:11-17`).
- **`backend/src/HIS.API/Dockerfile`** multi-stage: (1) build SPA Vite `node:22-alpine`, context =
  **repo root**, `VITE_API_URL=/api`, `VITE_REALTIME_URL=/` (same-origin), build-args
  `VITE_ORTHANC_URL`/`VITE_ACCESS_GATING` → (2) `dotnet publish` .NET 9 → (3) runtime `aspnet:9.0`,
  cài font DejaVu/Liberation cho PDF tiếng Việt, expose 8080, copy SPA vào `./clientapp`.
- **`.github/workflows/deploy-backend.yml`**: trigger push `main` khi đổi `backend/**`/`frontend/**`;
  `dotnet test` GATE → build+push `ghcr.io/minhhung19872002/his-api` → **AWS SSM send-command** vào EC2
  `i-026ea43bb85a2044b` (không mở SSH cho runner): `docker pull` → `docker rm -f his-api` →
  `docker run --network his-net --env-file /home/ec2-user/his-app.env` → prune image >72h → poll
  60×10s. Smoke: login 200 · SPA shell + deep-link `/v2/reception` 200 · unknown `/api` vẫn 404 ·
  `GET /health/migrations` `failedCount == 0`.
- Caddy cho `his.bluestar.com.vn` (API+SPA) **không nằm trong repo** — chạy trực tiếp trên EC2, cùng
  network `his-net`.
- **Migration**: `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql` idempotent, tự áp lúc khởi động.
  Số hiện tại **183** (`183_password_change_policy.sql`) → script kế tiếp là **184**.

---

## 11. GAPS tổng hợp — phải bổ sung vào HIS Core

Đánh số để `README.md` và `acceptance-matrix.md` tham chiếu.

### 11.1 Bảo mật (ưu tiên cao nhất)
1. **IDOR tiềm ẩn xuyên bệnh nhân**: `ExaminationCompleteController` (`:18`), `LISCompleteController`
   (`:25`), `PdfController` (`:20`) chỉ khai `[Authorize]` **không có `Roles=`** → một JWT
   `PortalPatient` hợp lệ **vẫn pass** các route giàu dữ liệu như
   `GET /api/examination/{examinationId}/medical-record`, `GET /api/examination/{id}/lab-results`,
   `GET /api/LISComplete/patients/{patientId}/history`, `GET /api/pdf/lab-result/{requestId}` — và
   **không hề kiểm** id đó có thuộc BN đang đăng nhập hay không. `PatientPortalController` làm đúng
   (`ResolvePatientId`, `IsPrescriptionOwnedByPatientAsync`) nhưng các controller kia thì không.
   👉 **Phải bịt trước khi phát hành app** (app làm lộ bề mặt tấn công này ra Internet).
2. **`POST /api/portal/login` không có rate-limit ở route** (chỉ lockout ở service) — khác với
   `AuthController.Login` đã có bucket `"login"`.
3. **Đăng ký / liên kết hồ sơ không có OTP**, chỉ đối chiếu SĐT/CCCD/DOB → dò được.
4. **`PortalAccount` không có `SecurityStamp`** → không thu hồi token tức thì được (cần cho "đăng xuất
   thiết bị từ xa" của HSMT).
5. **`StudyShareService` từ chối `HideDemographics=true`** (`:41-50`) → nếu dùng share-link cho app,
   tên BN vẫn lộ trong DICOM tag.

### 11.2 Xác thực & thiết bị (HSMT I.2 #2, #9)
6. Không có **refresh token** cho `PortalPatient` (token 8h cứng).
7. Không có **OTP SMS** cho đăng ký/đăng nhập/quên mật khẩu của BN.
8. Không có **`MustChangePassword`** cho `PortalAccount` (đổi MK lần đầu).
9. Không có **PIN / khoá sinh trắc** cho `PortalAccount`.
10. Không có **bảng thiết bị** (tên máy, HĐH, IP, lần cuối hoạt động, push token) + đăng xuất từ xa.

### 11.3 Push notification (HSMT I.2 #2, I.3 #1)
11. **Không có FCM/APNs** ở bất kỳ đâu. Cần: bảng device-token, outbox thông báo, bộ gửi, relay VPS.
12. Kho thông báo staff (`Notification.TargetUserId`) và BN tách rời → cần thống nhất hoặc thêm
    `TargetAccountId`.

### 11.4 Số thứ tự (HSMT I.2 #3)
13. `issue-mobile` **hard-code `Priority = 0`** → không lấy được STT **ưu tiên**.
14. Không có trường **lý do ưu tiên** (cao tuổi / trẻ em / thai phụ / khuyết tật).
15. Không có **GET nhẹ theo `ticketId`** để refresh "còn X người, ~Y phút".
16. **Không có SignalR** cho hàng đợi.
17. Hai hệ thống số (`QueueTicket` vs `KioskTicket`) **không liên thông**.

### 11.5 Đặt khám (HSMT I.2 #4)
18. Slot **không đọc `DoctorSchedule`** → có thể đặt vào giờ bác sĩ không trực.
19. Không gán **phòng theo bác sĩ/slot** (chọn phòng active đầu tiên trong khoa).
20. **Không có endpoint đổi lịch** (reschedule) — chỉ huỷ rồi đặt lại.
21. Không có **BN tự check-in** qua app.

### 11.6 Kết quả ngoại trú (HSMT I.2 #5)
22. `GetLabResultsAsync` / `GetImagingResultsAsync` **bỏ trống hầu hết field** đã khai trong DTO
    (`TestItems`, `ReportUrl`, `ImageViewerUrl`, `ThumbnailUrls`, `HasImages`, `Impression`,
    `ReportingDoctor`, `Department`, `BodyPart`…).
23. **Không có route** `GET /api/portal/lab-results/{id}` và `/imaging-results/{id}` (service method
    có sẵn nhưng chưa gắn route).
24. Không có **cầu nối `portal lab result id` ↔ `requestId`** để app build URL PDF.
25. **Không có endpoint TDCN cho BN.**
26. `imaging-results` **không lọc theo `visitId`** → không xem được "KQ CĐHA của lần khám này".
27. **KSK hợp đồng không tra được theo `patientId`**; không có PDF giấy chứng nhận sức khoẻ.
28. `export-health-record` trả **HTML** thay vì PDF.
29. FE `PublicStudyViewer.tsx:74` gọi route `pacs/studies/{id}/instances` **không tồn tại** (404).
30. `ViewerUrlDto.WadoRsUrl`/`DicomWebUrl` trỏ **route chết** `/api/radiology/dicom-web`.

### 11.7 Kết quả nội trú (HSMT I.2 #6)
31. **Không có endpoint liệt kê đợt nhập viện theo `patientId`.**
32. **Công khai thuốc không có API JSON** (chỉ PDF); `MedicineDisclosureDto` là DTO chết.
33. Không có KQ **CĐHA/TDCN nội trú theo `admissionId`**.
34. **Không có field STT thực hiện** cho chỉ định CLS nội trú.
35. `GetBillingStatement6556Async` là **stub hard-code** — không dùng được.

### 11.8 Gia đình & ví giấy tờ (HSMT I.2 #7, #8)
36. `FamilyMember` **không giới hạn 20**, không có **quy trình xác minh**, không có **phân quyền xem**,
    không có chuyển quyền chủ hộ.
37. **Không có module ví giấy tờ** nào (lưu trữ, mã hoá, hạn mức dung lượng).

### 11.9 Quản trị (HSMT I.3)
38. Không có **web quản trị tài khoản app BN** (khoá/mở, reset mật khẩu, phân quyền xem hồ sơ).
39. Không có **chiến dịch thông báo** (broadcast / theo nhóm / cá nhân / hẹn giờ / mẫu / thống kê đọc).
40. Không có **quản lý nhóm gia đình** phía quản trị.
41. Không có **module tra cứu cho nhân viên CSKH** (trên web và trên app).
42. Không có **audit log truy cập hồ sơ** dạng "ai xem hồ sơ của ai, lúc nào" cho luồng BN.

---

## 12. Rủi ro tuân thủ HSMT

| Dòng HSMT | Rủi ro | Đề xuất xử lý |
|---|---|---|
| "iOS phiên bản **12.0** trở lên" | ❌ **Flutter 3.47.2 sinh project `IPHONEOS_DEPLOYMENT_TARGET = 15.0`** (`mobile/patient_app/ios/Runner.xcodeproj/project.pbxproj:363,490,542`). Flutter đã bỏ hỗ trợ iOS 12 từ lâu; hạ xuống 12 buộc phải dùng Flutter cũ (~3.24, không còn cập nhật bảo mật, nhiều package không cài được) hoặc viết native. | Ba lựa chọn: (a) **giữ Flutter mới, min iOS 15** + văn bản giải trình "iOS 12/13/14 chiếm <1% thiết bị đang hoạt động, Apple đã ngừng hỗ trợ" — cần **chủ đầu tư chấp thuận**; (b) hạ Flutter về bản cũ hỗ trợ iOS 12 — **không khuyến nghị** (rủi ro bảo mật + package); (c) viết native iOS riêng cho iOS 12 — chi phí gấp bội. → **Cần quyết định của anh trước Phase 1.** |
| "Android **7.2** trở lên" | ✅ Đạt. Android 7.2 không tồn tại (7.1.1 = API 25); đã đặt `minSdk = 25` (`android/app/build.gradle.kts:24`), build APK debug **PASS**. | Ghi chú trong tài liệu nghiệm thu: 7.1.1 = API 25 ⊇ "7.2". |
| I.1 "công nghệ nhúng trên nền Linux tích hợp bản quyền HĐH và CSDL **hoặc công nghệ tương đương**" | Cần văn bản đối chiếu. | Docker trên Ubuntu LTS + CSDL mã nguồn mở có giấy phép hợp lệ → viết `docs/architecture/operations/patient-app-equivalent-technology.md`. |
| I.4 "Chứng chỉ số **DV SSL**" | Let's Encrypt là DV SSL hợp lệ; đã dùng sẵn cho `his.bluestar.com.vn` và PACS. | Ghi rõ trong runbook + chụp bằng chứng chứng chỉ. |
| II "VPS Cloud SSD ≥ 15GB, RAM ≥ 2GB, CPU ≥ 2 core" | Stack VPS phải gọn < 1.5GB RAM. | Caddy + relay .NET (hoặc Node) + Redis → khả thi; đo và ghi số thật khi triển khai. |
