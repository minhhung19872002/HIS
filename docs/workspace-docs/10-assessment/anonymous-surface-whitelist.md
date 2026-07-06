# Anonymous Surface Whitelist — #366 AUTHZ-0

> Rà soát 2026-07-05. Mọi thay đổi phải cập nhật bảng này + có reviewer.
> Nguyên tắc: `[AllowAnonymous]` là ngoại lệ, phải có lý do rõ ràng.

## Đã đóng (vá trong #366)

| File | Lý do đóng |
|---|---|
| `FrontendCompatController:14` | Không có lý do public — toàn bộ data nghiệp vụ (dược ngoại trú/BHXH/dịch tễ); FE dùng `apiClient` đã đính JWT |
| `LISCompleteController` — `POST dev/update-dates-to-today` | Mass-write tất cả ngày xét nghiệm, thiếu `[DevelopmentOnly]` (so với twin RIS tại `RISCompleteController:138`); thêm `[DevelopmentOnly]` → trả 404 trên prod |

## Whitelist — giữ có chủ đích

### AUTH FLOW (không có token → đương nhiên anonymous)
| Endpoint | File | Lý do |
|---|---|---|
| POST /api/auth/login | `AuthController:23` | Chưa có token |
| POST /api/auth/login-otp | `AuthController:34` | Bước 2 xác thực OTP |
| POST /api/auth/resend-otp | `AuthController:45` | Gửi lại OTP trong luồng đăng nhập |
| POST /api/auth/biometric-challenge | `AuthController:171` | WebAuthn challenge — chưa có token |
| POST /api/auth/biometric-verify | `AuthController:187` | WebAuthn verify — chưa có token |

### MONITORING / INFRA (external probe không có JWT)
| Endpoint | File | Lý do |
|---|---|---|
| GET /health | `HealthController:30,61,82` | Load balancer + uptime probe; không có dữ liệu nhạy |

### KIOSK (máy kiosk public trong phòng chờ — không có browser session)
| Endpoint | File | Lý do |
|---|---|---|
| POST /api/kiosk/issue-ticket | `KioskController:38` | Bệnh nhân lấy số tại quầy |
| POST /api/kiosk/checkin | `KioskController:57` | Check-in bằng CCCD |
| GET /api/kiosk/queue | `KioskController:75` | Hiển thị hàng chờ trên màn hình |
| GET /api/kiosk/ticket/{id} | `KioskController:88` | Tra cứu số thứ tự |

### APPOINTMENT BOOKING (cổng đặt lịch công khai — bệnh nhân chưa có tài khoản)
| File | Lý do |
|---|---|
| `AppointmentBookingController:12` | Toàn controller — đặt lịch không cần login |

### PATIENT PORTAL — register/login
| Endpoint | File | Lý do |
|---|---|---|
| POST /api/portal/register | `PatientPortalController:149` | Bệnh nhân tạo tài khoản portal |
| POST /api/portal/login | `PatientPortalController:158` | Đăng nhập portal BN (riêng PortalPatient) |
| GET /api/portal/doctors | `PatientPortalController:75` | Danh sách bác sĩ cho form đặt lịch |

### PAYMENT GATEWAY (IPN webhook — gọi từ VNPay/MoMo, không có JWT)
| Endpoint | File | Lý do |
|---|---|---|
| POST /api/payment/vnpay-ipn | `PaymentGatewayController:55` | Callback IPN VNPay |
| GET /api/payment/vnpay-return | `PaymentGatewayController:65` | Return URL VNPay |
| POST /api/payment/momo-ipn | `PaymentGatewayController:74` | Callback IPN MoMo |
| GET /api/payment/momo-return | `PaymentGatewayController:82` | Return URL MoMo |
| POST /api/payment/zalopay-callback | `PaymentGatewayController:173` | Callback ZaloPay |
| GET /api/payment/zalopay-return | `PaymentGatewayController:184` | Return URL ZaloPay |

### STUDY SHARE (chia sẻ DICOM qua link có token)
| Endpoint | File | Lý do |
|---|---|---|
| GET /api/study-share/view | `StudyShareController:40` | Xem ảnh bằng share-token (không JWT) |
| GET /api/study-share/download | `StudyShareController:46` | Download bằng share-token |

### PUBLIC EMR LOOKUP (tra cứu kết quả bằng mã — bệnh nhân không cần login)
| File | Lý do |
|---|---|
| `PublicEmrLookupController:14,31,49` | Bệnh nhân tra kết quả bằng mã phiếu — hệ thống tra cứu công khai |

### WAITING SCREEN / QUEUE DISPLAY (màn hình TV phòng chờ — không có session)
| Endpoint | File | Phân loại |
|---|---|---|
| GET /api/examination/queue-display | `ExaminationCompleteController:135` | ⚠️ MEDIUM — expose tên BN đầy đủ, PatientId, BHYT; `MaskName` đã có ở `PublicEmrLookupService:65-71` → nên dùng → **issue TBD** |
| GET /api/examination/waiting-count | `ExaminationCompleteController:146` | JUSTIFIED — chỉ số đếm |
| GET /api/reception/queue | `ReceptionCompleteController:137,226,237` | ⚠️ MEDIUM — tương tự queue-display → **issue TBD** |
| GET /api/reception/billing-stats | `ReceptionCompleteController.BillingStats:171` | JUSTIFIED — aggregate stats, không PII |
| GET /api/lis/queue-display | `LISCompleteController:49` | ⚠️ MEDIUM — expose tên BN + loại xét nghiệm → **issue TBD** |
| GET /api/lis/specimen-display | `LISCompleteController.SubModules:426` | ⚠️ MEDIUM — tương tự → **issue TBD** |

### RIS VIEWER / SIGNING / REPORTS (link chia sẻ từ PACS — không JWT)
| Endpoint | File | Phân loại |
|---|---|---|
| GET /api/ris/.../viewer | `RISCompleteController:137-185` | JUSTIFIED — DICOM viewer embed đọc bằng studyToken (short-lived token) |
| GET /api/ris/.../report | `RISCompleteController.Reports:227,261,303` | ⚠️ SUSPICIOUS — PDF report không có token check rõ ràng; tên file có timestamp enumerable + path traversal risk → **#402** |
| GET /api/ris/.../sign-pending | `RISCompleteController.Signing:312` | DEV_ONLY_OK → nên thêm `[Authorize]` trong AUTHZ-1 |
| GET /api/ris/.../view | `RISCompleteController.Viewer:300` | JUSTIFIED — studyToken validated |

### PACS PROXY (server-side proxy Orthanc)
| Endpoint | File | Phân loại |
|---|---|---|
| GET /api/pacsProxy/preview/{...} | `PACSController / RISCompleteController` | ⚠️ HIGH-RISK — stream DICOM/preview ảnh bệnh nhân với cred Orthanc phía server; anonymous caller đọc được PHI → **#402** |
| GET /api/pacsProxy/rendered/{...} | Tương tự | Tương tự |
| GET /api/pacsProxy/file/{...} | Tương tự | Tương tự |

### NON-DICOM IMAGE / SPECIMEN IMAGE (chia sẻ bằng token)
| Endpoint | File | Lý do |
|---|---|---|
| GET /api/non-dicom/view/{token} | `NonDicomController:100` | Xem ảnh non-DICOM qua share-token |
| GET /api/specimen-image/view/{token} | `SpecimenImageController:182` | Xem ảnh mẫu qua share-token |

### FHIR (interoperability — external system không JWT)
| Endpoint | File | Lý do |
|---|---|---|
| GET /fhir/* | `FhirController:36` | FHIR R4 endpoint cho tích hợp bên ngoài |

### AI LABELING (internal batch job — token riêng)
| Endpoint | File | Lý do |
|---|---|---|
| POST /api/ai-labeling/batch | `AiLabelingController:126` | Batch job AI từ internal service |

### NANG CAP 23/24 (payment/biometric callbacks)
| Endpoint | File | Phân loại |
|---|---|---|
| `NangCap23Controllers:442` — GET zalo-zns-templates | NEEDS_AUTH → **#401** | Static list template Zalo ZNS; không có PHI nhưng rò thông tin cấu hình; thêm `[Authorize]` |
| `NangCap24Controllers:73` — biometric setup/challenge | JUSTIFIED | WebAuthn bước đầu — chưa có token (đồng kiểu AuthController biometric) |

### DEV/SEED (chỉ chạy được khi `DevelopmentOnlyAttribute` = `ASPNETCORE_ENVIRONMENT=Development`)
| File | Ghi chú |
|---|---|
| `DailySeedController:16` | Verify: `DevelopmentOnlyAttribute` chặn trên prod (trả 404) |
| `PopulateDataController:18` | Tương tự — seed data |
| `DevLinkRadiologyController:18` | Dev fixture |

## Tổng kết phân loại (audit #366, 2026-07-06)

| Phân loại | Số lượng |
|---|---|
| JUSTIFIED (intentional public) | ~30 endpoint |
| DEV_ONLY_OK (DevelopmentOnly guard) | 4 controller |
| ĐÃ VÁ trong #366 | 2 (FrontendCompat + LIS dev endpoint) |
| NEEDS_AUTH → issue mới | 1 (#401 Zalo ZNS templates) |
| HIGH-RISK PACS → issue mới | ~3 endpoint (#402) |
| SUSPICIOUS RIS PDF → issue mới | 1 (#402) |
| MEDIUM queue-display exposure → issue TBD | 4 endpoint (tạo sau phiên) |

## Việc cần làm tiếp

- [ ] **#401** (LOW) — NangCap23 Zalo ZNS templates: thêm `[Authorize]`
- [ ] **#402** (HIGH) — PACS proxy anonymous + RIS PDF path-traversal: auth + validation
- [ ] **(TBD)** (MEDIUM) — Queue display expose full patient name: dùng `MaskName` helper (ExaminationComplete/Reception/LIS queue endpoints)
- [ ] Verify `DevelopmentOnlyAttribute` trả 404 trên prod Cloud Run
- [ ] Đổi mật khẩu admin prod + bật 2FA (ops task)
