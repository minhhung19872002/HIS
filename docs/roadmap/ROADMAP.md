# HIS – Roadmap

> **Mục đích:** Danh sách công việc tiếp theo, ưu tiên theo Cao / Trung / Thấp với độ khó, rủi ro, dependency và mức ảnh hưởng cụ thể.
> **Phạm vi:** Tính năng còn dở + nâng cấp kiến trúc + integration production.
> **Module liên quan:** Tất cả.
> **Last updated:** 2026-05-16

---

## Mục lục

- [1. Triết lý prioritize](#1-triết-lý-prioritize)
- [2. Ưu tiên CAO (1–4 tuần)](#2-ưu-tiên-cao-1-4-tuần)
- [3. Ưu tiên TRUNG BÌNH (1–3 tháng)](#3-ưu-tiên-trung-bình-1-3-tháng)
- [4. Ưu tiên THẤP (>3 tháng / nice-to-have)](#4-ưu-tiên-thấp-3-tháng--nice-to-have)
- [5. Phụ thuộc bên ngoài (blocker không tự kiểm soát)](#5-phụ-thuộc-bên-ngoài-blocker-không-tự-kiểm-soát)

---

## 1. Triết lý prioritize

| Ưu tiên | Tiêu chí |
|---|---|
| **Cao** | (a) chặn demo / hồ sơ thầu, hoặc (b) đóng tech debt làm chậm dev velocity, hoặc (c) đóng compliance gap ngắn hạn |
| **Trung** | Cải thiện trải nghiệm / scalability / maintainability — đáng làm khi không có blocker |
| **Thấp** | Nice-to-have, hardware-dependent, hoặc đợi vendor / cơ quan công bố sandbox |

---

## 2. Ưu tiên CAO (1–4 tuần)

### H1. Wire 25 v2 button TODO → workflow handler

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | 25 button `message.info('TODO: ...')` ở các page v2 cần wire vào workflow v1 hoặc backend endpoint tương ứng. Ví dụ: `Reception.tsx:402` "TODO: NewVisitWizard" → mở modal đăng ký BN; `Billing.tsx:129` "TODO: Thu tiền" → gọi `POST /api/billing/receipt`. |
| **File ảnh hưởng** | `frontend/src/pages-v2/{Reception,OPD,Inpatient,Prescription,Pharmacy,Surgery,Billing,Laboratory,Radiology,BloodBank,EMR,Consultation,FollowUp,Insurance,Quality,Telemedicine}.tsx` |
| **Độ khó** | Trung bình (mỗi nút ~30 phút wire) |
| **Rủi ro** | Thấp — endpoint backend đã sẵn, modal v1 đã viết |
| **Dependency** | Không |
| **Ảnh hưởng** | Trung — bệnh viện thực sự dùng v2 sẽ thấy không xài được. v1 vẫn full functional. |

### H2. USB Token Pkcs11 end-to-end với hardware

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | Test toàn bộ flow ký số PDF/XML với USB Token vật lý (WINCA, BKAV-CA, FPT-CA, ...). PIN qua browser → backend `Pkcs11SessionManager` → token PKCS#11. Hiện code sẵn sàng nhưng chưa E2E với hardware. |
| **File ảnh hưởng** | `backend/src/HIS.Infrastructure/Services/Pkcs11SessionManager.cs`, `Pkcs11ExternalSignature.cs`, `DigitalSignatureService.cs`, `PdfSignatureService.cs` |
| **Độ khó** | Trung (code đã viết, chỉ test + fix edge case) |
| **Rủi ro** | Trung — vendor token differences về CKM mechanism, PIN policy |
| **Dependency** | Hardware token + driver Windows |
| **Ảnh hưởng** | Cao — block compliance ký số RIS/EMR / e-invoice |

### H3. Production data hydration cho 5 cổng QG mock

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | 5 cổng (Đơn thuốc QG, Dược QG, Đề án 06, Zalo OA, BHXH gateway production mode) hiện mock. Khi BHXH/Cục QLD/Bộ CA công bố sandbox URL + credential, wire HTTP POST. |
| **File ảnh hưởng** | `backend/src/HIS.Infrastructure/Services/NangCap23Services.cs:197,1644`, `BhxhGatewayClient.cs` |
| **Độ khó** | Thấp (HttpClient đã inject sẵn, schema payload đã xây) |
| **Rủi ro** | Trung — schema thực tế có thể khác mock |
| **Dependency** | **Cơ quan ngoài cung cấp credential** |
| **Ảnh hưởng** | Cao — bắt buộc cho compliance HSMT BV đa khoa |

### H4. Refactor React Query — bỏ useEffect + setState pattern

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | `QueryClientProvider` đã setup nhưng đa số page tự `useEffect(() => fetchX(), [])` + `setState`. Đổi sang `useQuery` để có cache + retry + dedup tự động. Bắt đầu từ list page có pagination/filter. |
| **File ảnh hưởng** | 100+ page v1 + v2 — làm dần từng module (Reception → OPD → ...) |
| **Độ khó** | Trung — boilerplate đơn giản nhưng cần test side-effect (modal save → invalidate list) |
| **Rủi ro** | Thấp — backward compat, có thể migrate incremental |
| **Dependency** | Không |
| **Ảnh hưởng** | Trung — giảm boilerplate ~30%, fix một số race condition khi navigate trước fetch |

### H5. Patient Portal `accountId` query-param override

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | ~5 endpoint `ExtendedWorkflowServices.cs` còn filter cứng `AccountId == currentUserId` → admin browse trống. Thêm optional `?accountId=...` query param cho admin. |
| **File ảnh hưởng** | `backend/src/HIS.Infrastructure/Services/ExtendedWorkflowServices.cs` (search regex `AccountId == currentUserId`) |
| **Độ khó** | Thấp |
| **Rủi ro** | Thấp (chỉ Admin role mới dùng query param) |
| **Dependency** | Không |
| **Ảnh hưởng** | Thấp — chỉ ảnh hưởng demo + admin debug |

---

## 3. Ưu tiên TRUNG BÌNH (1–3 tháng)

### M1. Jibri recording cho Telemedicine

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | Self-host Jitsi đã chạy (`161.33.180.17`). Jibri (recording) cần thêm 2 GB RAM → cần Oracle ARM A1 4-OCPU / 24 GB. Đang retry loop Tokyo capacity. |
| **File ảnh hưởng** | `deploy/pacs/oracle/retry_arm_jibri.py`, docker-compose Jitsi |
| **Độ khó** | Trung (provision VM + cấu hình Jibri) |
| **Rủi ro** | Thấp |
| **Dependency** | **Oracle Cloud ARM Tokyo capacity** |
| **Ảnh hưởng** | Trung |

### M2. Schema drift: 12 không-DbSet table trong BAK

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | `schema-drift` báo 0 missing, nhưng có 20 table tồn tại trong BAK không tương ứng DbSet (xem Session 2026-04-21). Hoặc clean up bảng không dùng, hoặc thêm DbSet nếu vẫn truy vấn raw SQL. |
| **File ảnh hưởng** | `HISDbContext.cs`, hoặc script DROP TABLE migration |
| **Độ khó** | Thấp (audit bằng `INFORMATION_SCHEMA.TABLES` minus DbSets) |
| **Rủi ro** | Trung — đừng DROP table còn dùng |
| **Dependency** | Không |
| **Ảnh hưởng** | Thấp (cosmetic) |

### M3. Convert CT/US AI model thật

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | `scripts/convert_ct_model.py` + `convert_us_model.py` đã viết (MONAI EfficientNet-B0 cho CT, ResNet18 cho US). Cần Python env + fine-tuned checkpoint (Apache 2.0 hoặc mua vendor có chứng nhận lâm sàng). Output ONNX upload R2 hoặc `wwwroot/ai-models/`. |
| **File ảnh hưởng** | `backend/src/HIS.API/wwwroot/ai-models/`, env var `AiLabeling__Models__N__ModelUrl` |
| **Độ khó** | Trung (cần Python env + model training data) |
| **Rủi ro** | Trung — model accuracy chưa validated cho lâm sàng |
| **Dependency** | Fine-tuned checkpoint từ vendor |
| **Ảnh hưởng** | Trung — hiện CR (X-quang) đã chạy thật, CT/US chỉ dev placeholder |

### M4. Cloud Run min-instances tránh cold start

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | `gcloud run services update his-api --min-instances=1` → user đầu tiên sau idle không chờ 3-5s. Chi phí thêm ~$10/month. |
| **File ảnh hưởng** | `cloudbuild.yaml` hoặc lệnh deploy |
| **Độ khó** | Thấp |
| **Rủi ro** | Thấp |
| **Dependency** | Không |
| **Ảnh hưởng** | Trung (UX) |

### M5. Realtime push thay polling cho NotificationBell + AiQueueBadge

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | NotificationBell đã có SignalR `ReceiveNotification`. AiQueueBadge vẫn poll 30s. Thêm `IRealtimeNotifier` interface ở Application layer, adapter ở API layer wrap `IHubContext<NotificationHub>`. |
| **File ảnh hưởng** | `HIS.Application/Services/IRealtimeNotifier.cs` (mới), `AiWorklistService.cs`, `NotificationContext.tsx` |
| **Độ khó** | Trung (cross-project ref problem đã document Session 2026-05-12) |
| **Rủi ro** | Thấp |
| **Dependency** | Không |
| **Ảnh hưởng** | Thấp (1 spot, UX nice) |

### M6. Consolidate folder pages/ vs pages-v2/

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | Mỗi feature có 2 file (`pages/X.tsx` + `pages-v2/X.tsx`) → 242 file. Trùng API + types. Sau khi v2 ổn định, deprecate v1 hoặc giữ chỉ entry layout (MainLayout → v2 components). |
| **File ảnh hưởng** | Toàn bộ 242 page file + `App.tsx` routes |
| **Độ khó** | **Cao** (battle test cẩn thận, A/B compare từng page) |
| **Rủi ro** | **Cao** — production demo đang dùng v1, refactor sai → mất feature |
| **Dependency** | Quyết định product: keep both vs pick one |
| **Ảnh hưởng** | Cao — giảm 50% code surface, cải thiện velocity dài hạn |

### M7. Health check Cloud Run + Grafana

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | Endpoint `/health/details` đã có (6 component check: SQL, Redis, PACS, HL7, Disk, Memory). Setup Cloud Monitoring uptime check + alert email khi 1 component down. |
| **File ảnh hưởng** | GCP Cloud Monitoring config (out-of-repo), `HealthCheckService.cs` đã sẵn |
| **Độ khó** | Thấp |
| **Rủi ro** | Thấp |
| **Dependency** | Không |
| **Ảnh hưởng** | Trung (ops) |

---

## 4. Ưu tiên THẤP (>3 tháng / nice-to-have)

### L1. Smart card writing

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | Ghi thông tin BN lên thẻ thông minh BHYT thế hệ mới (gắn chip). |
| **File ảnh hưởng** | `ReceptionCompleteService.cs:2906` stub |
| **Độ khó** | Cao (vendor SDK + bytecode chip) |
| **Rủi ro** | Cao |
| **Dependency** | Hardware + SDK vendor |
| **Ảnh hưởng** | Thấp (BHYT chưa bắt buộc) |

### L2. Fingerprint reader pilot cho HR

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | Chấm công bằng vân tay. Cần chọn SDK (Futronic / ZKTeco / SecuGen) và làm web bridge service. |
| **File ảnh hưởng** | Module mới `backend/src/HIS.API/Controllers/TimekeepingController.cs` |
| **Độ khó** | Cao |
| **Rủi ro** | Cao |
| **Dependency** | Hardware + SDK |
| **Ảnh hưởng** | Trung (HR ops) |

### L3. Mobile native app (NangCap15 #5)

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | iOS + Android native app cho Patient Portal + Doctor Portal. |
| **File ảnh hưởng** | Repo riêng (React Native / Flutter) |
| **Độ khó** | Cao |
| **Rủi ro** | Trung |
| **Dependency** | Quyết định product + ngân sách |
| **Ảnh hưởng** | Cao (UX patient) |

### L4. CDN cho frontend

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | Cloudflare CDN trước Vercel (Vercel có Edge sẵn nhưng latency Asia có thể bottleneck). |
| **Dependency** | Performance bị bottleneck |
| **Ảnh hưởng** | Thấp |

### L5. Cornerstone3D Phase 4 — mammography 4-up advanced

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | Mở rộng `MammoViewer.tsx` thêm hanging protocol auto-arrange CC pair top, MLO pair bottom; magnify glass tool affordance; pixel-pitch-aware zoom. |
| **File ảnh hưởng** | `frontend/src/components/MammoViewer.tsx` |
| **Độ khó** | Trung |
| **Rủi ro** | Thấp |
| **Dependency** | Không |
| **Ảnh hưởng** | Thấp (chỉ MG modality) |

### L6. Microscope hardware connectivity (NangCap20 #28)

Hardware-dependent. Chờ hospital cấp microscope tích hợp Wi-Fi/USB.

### L7. Migrate Cloud SQL → managed PostgreSQL

| Thuộc tính | Giá trị |
|---|---|
| **Mô tả** | SQL Server Cloud SQL ~$200/month. PostgreSQL Cloud SQL rẻ hơn ~40%. EF Core hỗ trợ PostgreSQL native qua Npgsql. |
| **File ảnh hưởng** | `HISDbContext`, 43 migration script (cần port T-SQL → PG syntax), connection string |
| **Độ khó** | **Cao** |
| **Rủi ro** | **Cao** |
| **Dependency** | Không |
| **Ảnh hưởng** | Trung (cost ops) |

---

## 5. Phụ thuộc bên ngoài (blocker không tự kiểm soát)

| Item | Chờ gì |
|---|---|
| BHXH gateway prod | BHXH Vietnam công bố URL sandbox + cấp credential |
| Đơn thuốc QG | Bộ Y Tế / CQLKCB công bố API doc thực tế |
| Dược QG | Cục Quản lý Dược thông báo sandbox |
| Đề án 06 | Bộ Công an cấp credential liên thông |
| Zalo OA | Zalo OA Business approve template |
| Jibri ARM VM | Oracle Cloud Tokyo ARM A1 4-OCPU capacity (đang retry loop) |
| Smart card pilot | Hospital cung cấp thẻ BHYT chip + reader |
| Fingerprint pilot | Hospital cung cấp reader + SDK |
| AI model lâm sàng | Vendor có CE/FDA chứng nhận, hoặc training data + ML team |

---

## Liên kết

- **PROJECT_STATUS.md** — trạng thái hiện tại
- **TECH_DEBT.md** — debt cụ thể
- **ARCHITECTURE.md** — kiến trúc reference
- `CLAUDE.md` — session log
- `roadmap/nangcap-phan-tich.md` — phân tích vs HSMT
