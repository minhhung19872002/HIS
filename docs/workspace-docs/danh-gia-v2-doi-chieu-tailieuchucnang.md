# Đánh giá hệ thống HIS v2 — đối chiếu bộ HDSD MQSoft (`docs/TaiLieuChucNang`)

> **Mục đích:** đối chiếu hệ thống **v2** thực tế (`/v2/*`, TerminalLayout, 130 trang) với bộ
> Hướng Dẫn Sử Dụng (HDSD) của sản phẩm tham chiếu **MQSoft / VRPACS** trong `docs/TaiLieuChucNang`
> (36 PDF), để nắm: v2 **đã làm tốt gì**, **còn thiếu/yếu gì**, và **đề xuất lộ trình phát triển**.
> **Phương pháp:** 7 agent đọc PDF MQSoft theo nhóm module + **đối chiếu code THẬT** (grep/Read
> `frontend/src/pages-v2`, `frontend/src/api`, `backend/src/HIS.Infrastructure/Services`) — chỉ khẳng
> định khi thấy trong code (verify-before-assert), không suy đoán.
> **Ngày:** 2026-05-29. **Người rà:** Claude (theo SKILL-MAP). **Stack:** React+Antd v6+`_v2kit`/ab-* · ASP.NET Clean Arch · SQL Server.

---

## 0. Độ tin cậy & giới hạn đọc tài liệu (đọc trước khi tin số liệu)

| Tài liệu MQSoft | Đọc được? | Ghi chú |
|---|---|---|
| Tiếp đón, Phòng khám (2), XN (5), CĐHA (5), PACS/VRPACS (7), EMR-Web, KTM, CKS, HR, TTB, Thuyết minh giải pháp | ✅ Đọc đủ (text/OCR) | PDF ảnh scan được render PNG → OCR vision |
| `MQ - Nội trú - Bác sĩ.pdf` | ⚠️ Không render được | Scan ảnh, môi trường thiếu `pdftoppm` → phần tính năng **Nội trú MQSoft suy từ cấu trúc `api/inpatient.ts`** (region 3.1–3.8), chưa xác minh trực tiếp từ screenshot. Phần **code v2 vẫn verify trực tiếp = chắc chắn**. |
| `GIỚI THIỆU MQSOFT -Ver1.5.pdf` | ⚠️ Không đọc được | Scan ảnh thuần — có thể còn phân hệ quảng bá chưa nắm. |
| `HDSD_DesktopEMR.pdf` (22MB) | 🟡 Chỉ TOC | Phần lớn là danh mục ~47 phiếu + ~22 mẫu HSBA chuyên khoa; **chưa đối chiếu từng biểu mẫu**. |

> ⚠️ Kết luận về **code v2 (FE+BE)** dựa trên grep/Read trực tiếp → tin cậy cao. Kết luận về **MQSoft**
> tin cậy cao trừ 3 mục trên. Phần độ phủ biểu mẫu chuyên khoa (47 phiếu DesktopEMR) cần rà riêng.

---

## 1. Tóm tắt điều hành (kết luận chính)

**v2 KHÔNG thiếu module.** 130 trang `/v2/*` + 113 API client phủ **≥14/15 phân hệ lõi** MQSoft và
**vượt rất xa** về phạm vi (Telemedicine, HIV/Lao/Methadone, 16 module YTCC, Pathology, IVF, AI chẩn
đoán hình ảnh, HL7 FHIR/CDA, cổng QG/Đề án 06, ký số HSM/VGCA…). Về **EMR, Ký số (CKS), Thanh toán
không tiền mặt (KTM), HR, Tài sản/Thiết bị** → v2 **đạt hoặc vượt** MQSoft.

**Vấn đề KHÔNG nằm ở "thiếu tính năng để xây mới", mà ở 3 dạng nợ:**

1. **🔴 "Vỏ chỉ-xem" — workflow lõi đã convert v2 nhưng cắt mất phần nhập liệu.** Trang v2 của
   **CĐHA (Radiology)** và một phần **Xét nghiệm (Laboratory)**, **Nội trú (Inpatient)** chỉ liệt kê +
   xem; **nhập kết quả / ký số / duyệt / gọi BN** vẫn phải quay về trang **v1 (MainLayout)**. Backend
   đã có đủ hàm — chỉ **chưa wire vào v2**.
2. **🔴 Backend stub — nút có nhưng không lưu thật.** Một số hàm trả `=> true` / list rỗng: **ảnh key
   PACS, annotation PACS, kết nối máy XN trả KQ tự động, nhập kết quả vi sinh + kháng sinh đồ**.
3. **🟡 Backend có API nhưng 0 UI** (cả v1 lẫn v2): **nhập kho dược từ NCC + kiểm kê**, nhiều phiếu
   theo dõi **nội trú** (sinh hiệu/truyền dịch-máu/chuyển khoa/dinh dưỡng/BK 6556), cảnh báo BN ở tiếp
   đón, giữ giấy tờ, chụp ảnh BN, thẻ BHYT tạm…

> **Định hướng phát triển đề xuất:** ưu tiên **"hoàn thiện chiều sâu"** (wire nốt v2 vào backend sẵn có
> + lấp ~6 stub) **trước** khi mở thêm module. Đây là việc rẻ (backend phần lớn đã xong) nhưng tác động
> trực tiếp tới khả năng dùng thật của BS/KTV.

---

## 2. Phần A — v2 ĐÃ LÀM TỐT (đạt/vượt MQSoft)

| Module | Mức | Điểm mạnh (bằng chứng) |
|---|---|---|
| **Tiếp đón** | ✅ Tốt | ĐK BHYT/viện phí/dịch vụ, tìm BN cũ, xác thực BHYT (thông tuyến/mức hưởng), cấp STT + gọi số LCD, tổng quan/điều phối phòng, đổi phòng, in phiếu (`Reception.tsx` + `reception/`, `reception.ts`) |
| **Phòng khám (OPD)** | ✅ Tốt | Chọn BN hàng đợi, sinh hiệu/bệnh sử/khám LS, chẩn đoán ICD chính+kèm, chỉ định CLS, kê đơn, **kiểm tra tương tác/dị ứng thuốc**, đơn mẫu theo ICD, giấy nghỉ ốm, xử trí (nhập viện/hẹn/chuyển viện), in HSBA ngoại trú (`OpdEditor.tsx`, `examination.ts`) |
| **EMR / Bệnh án điện tử** | ✅ Tốt/Vượt | Xem HSBA theo cây/biểu mẫu, **27 mẫu chuyên khoa**, gáy/bìa BA, tìm kiếm, **chia sẻ/trích lục có watermark**, đóng BA + kiểm tra thiếu sót tự động, **khóa tài liệu**, **chữ ký BN (canvas + WebAuthn)** (`EMR.tsx`, `emrManagement.ts`) |
| **Ký số (CKS)** | ✅ Vượt | USB token/PKCS#11/**HSM**/PAdES, **trình ký lãnh đạo 4-eyes**, ký lô, thu hồi chữ ký, VGCA, WebAuthn sinh trắc (`DigitalSignature.tsx`, `CentralSigning.tsx`, `PdfSignatureService.cs`) |
| **Thanh toán không tiền mặt (KTM)** | ✅ Vượt | VietQR/Napas247 (EMVCo TLV+CRC) 5 NH + **VNPay/MoMo/ZaloPay + IPN/callback**, xác nhận CK thủ công, liên kết phiếu thu + **HĐĐT tự phát hành**, 7 báo cáo (`PaymentGatewayService.VietQR.cs`, `BankPayments.tsx`) |
| **XN (LIS) — khai báo & lấy/nhận mẫu** | ✅ Tốt | Khai báo máy (HL7/ASTM/Serial + test KN), danh mục sổ/nhóm/loại/đơn vị/VSV/kháng sinh/hóa chất, lấy mẫu + in barcode, nhận mẫu + **từ chối mẫu có lý do** + **4-eyes KTV→người duyệt** (`LISConfig.tsx`, `LisCatalogAdmin.tsx`, `SampleReceive.tsx`) |
| **CĐHA (RIS) — danh mục/điều phối/phân quyền** | ✅ Tốt | Mẫu báo cáo theo giới/dịch vụ, **phân quyền chụp (KTV) vs đọc (BS)** 11 flag, điều phối ca + ưu tiên cấp cứu + in phiếu + hủy, xuất thuốc/chỉ định thêm tại phòng (`RisDispatcher.tsx`, `RisAdmin.tsx`, `RadiologyOps.tsx`) |
| **PACS Viewer** | ✅ Tốt/Vượt | 2D (W/L preset, zoom/pan, đo length/angle/probe), **MPR 4-khung + crosshair**, **3D/VR 11 preset**, **MIP/MinIP**, **Mammography hanging protocol**, cine, **chia sẻ link/QR có mật khẩu+hết hạn+ẩn PII**, so sánh 2 ca, export DICOM, C-STORE remote (`CornerstoneViewer/MprViewer/MammoViewer/MipMinIpViewer`, `studyShare.ts`) |
| **Dược — cấp phát & duyệt** | ✅ Tốt | Duyệt cấp/bù thuốc-VTYT (4-eyes), cấp phát ngoại trú, **cấp phát nội trú theo khoa + in phiếu lĩnh**, kiểm tra dược lâm sàng/tương tác/CCĐ, xem tồn + cảnh báo HSD (`PharmacyApproval.tsx`, `DispensingCounter.tsx`, `InpatientDispensing.tsx`, `StockReport.tsx`) |
| **HR / Nhân sự** | ✅ Vượt | Hồ sơ NV 9 tab (tài sản/phụ cấp/công tác/đào tạo/gia đình/khen thưởng/ngân hàng/HĐ/BHXH), CME + CCHN cảnh báo hết hạn, **lịch trực/phân ca/hoán ca**, chấm công/nghỉ phép/tăng ca (`EmployeeProfile.tsx`, `HR.tsx`, `medicalHR.ts`) |
| **Thiết bị / Tài sản / VPP** | ✅ Vượt | Bảo trì + **kiểm định + hiệu chuẩn + sửa chữa**, **tài sản cố định + khấu hao + bàn giao + thanh lý + QR**, duyệt cấp VPP/TTB theo phiếu lĩnh (`Equipment.tsx`, `assetManagement.ts`, `OfficeSupplyApproval.tsx`) |
| **Sổ biên lai** | ✅ Đủ | Khai báo dải số + loại + gán người thu/khoa + kích hoạt + đóng sổ (`ReceiptBookAdmin.tsx`) |
| **Hội chẩn online / Non-DICOM / RIS DICOM** | ✅ Tốt | Jitsi tạo/join/end phòng + QR, capture camera ảnh/video + upload, worklist RIS đầy đủ sync HIS (`VideoConsultation.tsx`, `NonDicomCapture.tsx`, `ris.ts`) |

---

## 3. Phần B — GAP (phân loại theo mức độ + cách xử lý)

### 🔴 B1. Workflow lõi đã có backend nhưng v2 chỉ là "vỏ chỉ-xem" (phải quay về v1)

> Đây là nhóm **ưu tiên cao nhất**: tốn ít công (backend xong rồi), tác động lớn (BS/KTV không dùng được v2).

| # | Gap | Hiện trạng | Backend đã có |
|---|---|---|---|
| B1.1 | **CĐHA — màn trả kết quả v2 bị rút gọn** | `pages-v2/Radiology.tsx` chỉ list order + hiển thị KQ; **không** nhập mô tả/kết luận theo mẫu, không gọi BN, không bắt đầu/hoàn thành ca, **không ký số**, không bung viết tắt, nút in là `message.success` giả. Nghiệp vụ đầy đủ chỉ ở v1 `pages/Radiology.tsx`. | ✅ `EnterRadiologyResultAsync`, `SignResultAsync`, `FinalApprove`, `ExpandAbbreviations`, `signWithUSBToken`, `printRadiologyResult` |
| B1.2 | **XN — in phiếu KQ + duyệt 2 bước/hủy duyệt v2** | `Laboratory.tsx` nút "In phiếu" chỉ toast; chỉ gọi 1 bước `completeProcessing`; thiếu UI hủy duyệt + sửa phiếu sau duyệt | ✅ `PrintLabResultAsync`, `Preliminary/FinalApproveLabResultAsync`, `CancelApprovalAsync` |
| B1.3 | **XN — nội kiểm QC / Levey-Jennings là nút chết** | `LabQC.tsx` nút "Chạy QC" + "Levey-Jennings" chỉ toast | ✅ `RunQCAsync`, `GetLeveyJenningsChartAsync` |
| B1.4 | **Nội trú — nhập viện v2 chỉ là vỏ** | `Inpatient.tsx` nhập viện = `message.info('Chọn giường…')`; nghiệp vụ thật ở v1 | ✅ `admitFromOpd` (đang dùng ở v1) |
| B1.5 | **Nội trú — phiếu theo dõi điều trị chưa có UI v2** | Sinh hiệu (bảng+biểu đồ), truyền dịch/truyền máu, chuyển khoa/chuyển viện, **chỉ định suất ăn**, **BK viện phí 6556** — **0 trang dùng** | ✅ `createVitalSigns`/`getVitalSignsChart`, `createInfusionRecord`, `createBloodTransfusion`, `transferDepartment`, `createNutritionOrder`, `getBillingStatement6556` |
| B1.6 | **Nội trú — trả KQ XN tại giường** | Chỉ **xem** KQ; không có form **nhập + duyệt KQ tại giường** như MQSoft | 🟡 chỉ có `getLabResults`/`printLabResults` (xem) |
| B1.7 | **Tiếp đón — nhiều API chưa nối UI** | Cảnh báo BN (mã màu lưu ý — **an toàn BN**), thẻ BHYT tạm, chụp ảnh BN, giữ giấy tờ, chỉ định CLS tại tiếp đón, lịch sử khám khi tra BN cũ | ✅ `getReceptionWarnings`, `createTemporaryInsurance`, `uploadPhoto`, `createDocumentHold`, `orderServicesAtReception`, `getPatientVisitHistory` |

### 🔴 B2. Backend STUB — tính năng không hoạt động thật (dù UI có thể có)

| # | Gap | Hiện trạng |
|---|---|---|
| B2.1 | **PACS — Ảnh Key (Key Image)** | `MarkKeyImageAsync` **không persist**, `GetKeyImagesAsync` trả rỗng. Thiếu cả luồng crop → **Send to HIS** → duyệt → **chọn mẫu in (in thường/in gộp)**. Trọng yếu cho in phim/ảnh trả BN. |
| B2.2 | **PACS — Annotation** | `SaveAnnotation`/`GetAnnotations` là stub → chú thích/đánh dấu tổn thương **không lưu**. |
| B2.3 | **XN — kết nối máy trả KQ tự động ("Kết quả máy")** | `SendWorklistToAnalyzerAsync`/`ReceiveResultFromAnalyzerAsync` là stub (Success=true/count=0). LIS thật chỉ đang **nhập tay**. |
| B2.4 | **Vi sinh — nhập định danh VSV + kháng sinh đồ** | `EnterCultureResultAsync`/`EnterAntibioticSensitivityAsync` trả `=> true` (không lưu DB); antibiogram chỉ xem → **không nhập được S/I/R**. |

### 🟡 B3. Tính năng thiếu hẳn (cần làm mới — cân nhắc theo nhu cầu)

| # | Gap | Ghi chú |
|---|---|---|
| B3.1 | **Dược — nhập kho từ NCC + kiểm kê + xuất chuyển kho** | `createSupplierReceipt`/`getStockReceipts`/`createStockTake`/`createTransferIssue` có backend nhưng **0 trang FE** (v1 lẫn v2) → đứt đầu vào vòng đời kho dược. *(Một phần ranh giới B1 — backend có, hoàn toàn thiếu UI.)* |
| B3.2 | **CĐHA — tường trình PTTT + nhập sinh thiết tại màn CĐHA** | RIS không có biopsy/PTTT; Surgery & Pathology là module rời, **không tích hợp** luồng khám/CĐHA như MQSoft |
| B3.3 | **OPD — PTTT (F6) trong luồng khám + xuất thuốc tủ trực (F10)** | BS ngoại trú không kê/tường trình thủ thuật tại chỗ; Surgery tách rời |
| B3.4 | **EMR — quét/số hóa tài liệu giấy vào HSBA** | `emrAdmin.saveAttachment` có nhưng **không có UI scan → đính kèm**; `NonDicomCapture` chỉ chụp thiết bị, không scan biểu mẫu giấy. Là lõi của "MQ-EMR Website số hóa bệnh án". |
| B3.5 | **App mobile xem bệnh án + in qua wifi** | Chỉ có `MobileHome` PWA launcher; chưa có app xem ảnh phiếu + **in qua wifi**; PACS viewer chưa tối ưu mobile |
| B3.6 | **HR — tính lương / lên bảng lương (payroll)** | Chỉ lưu lịch sử ngạch/bậc/hệ số + chấm công rời; **không tính ra bảng lương** từ chấm công |
| B3.7 | **HR — quản lý quyết định nhân sự + biểu mẫu BHXH** | Tờ khai 01A-TS, QĐ bổ nhiệm/luân chuyển/đi học/thôi việc (MQSoft 22 mục) — chưa có module văn bản |
| B3.8 | **Quản lý công văn / văn thư** | MQSoft "Quản lý chất lượng BV" thực chất là công văn đến/đi/mượn/trả; `Quality.tsx` v2 hướng JCI/sự cố — **không có module công văn** |
| B3.9 | **PACS — đo lường nâng cao + key-image print** | Thiếu ROI vùng (area/HU elip-chữ nhật-tự do), đo thể tích, AvgMIP, clip 3D, in 3D |
| B3.10 | **Đăng ký nhiều phòng khám cho 1 BN** + **sửa đối tượng thuốc/dịch vụ** (BHYT↔thu phí) | Thiếu UI (và một phần backend examination) |
| B3.11 | **Danh mục thiếu trường** | LIS: dải tham chiếu/critical-value UI, đơn vị HL7, khoa/mã BS LIS. RIS: "dược khoa phòng", "quầy thực hiện", số ảnh in/lưu, tên report |

### B4. Phạm vi tổng thể — 15 phân hệ MQSoft ("Thuyết minh giải pháp") vs v2

| Phân hệ MQSoft | v2 | Phân hệ MQSoft | v2 |
|---|---|---|---|
| 1. Tiếp đón | ✅ | 9. Lưu trữ HSBA | ✅ |
| 2. Ngoại trú (PK/khám SK/cấp cứu) | ✅ | 10. Tổng hợp báo cáo | ✅ |
| 3. Nội trú | ✅ (v2 còn nông — xem B1.4-6) | 11. Vật tư/TTB | ✅ |
| 4. Xét nghiệm + kho máu | ✅ | 12. Danh mục | ✅ |
| 5. Chẩn đoán hình ảnh | ✅ (trả KQ v2 nông — B1.1) | 13. Quản lý người dùng | ✅ |
| 6. Dược BV | ✅ (thiếu nhập kho — B3.1) | 14. Nhật ký/audit | ✅ |
| 7. Chỉ định tạm ứng | ✅ | (spec) Nhân sự + **Lương** | 🟡 thiếu payroll |
| 8. Viện phí | ✅ | (spec) **Công văn/văn thư** | ❌ |

> **v2 có RẤT NHIỀU phân hệ MQSoft không nêu** (vượt phạm vi): Telemedicine, HIV/Lao/Methadone, 16
> module YTCC (Epidemiology, Immunization, SchoolHealth, OccupationalHealth, FoodSafety, Population,
> Environmental…), Pathology, Rehabilitation, InfectionControl, IVF, **AI chẩn đoán hình ảnh**, HL7
> FHIR/CDA, cổng QG/Đề án 06/Zalo. → **v2 phủ ≥14/15 lõi + mở rộng gấp nhiều lần.**

---

## 4. Phần C — Đề xuất lộ trình phát triển (ưu tiên)

> Nguyên tắc: **hoàn thiện chiều sâu trước khi mở rộng** — ưu tiên việc backend đã xong, chỉ thiếu wire.

### 🔴 P0 — Làm ngay (rẻ + tác động lớn, vì backend đã có)
1. **Wire màn trả kết quả CĐHA vào v2** (B1.1): port nhập mô tả/kết luận theo mẫu + gọi BN + bắt
   đầu/hoàn thành ca + **ký số** + bung viết tắt + in thật. *(Đang phải dùng v1.)*
2. **Wire in phiếu KQ + duyệt 2 bước/hủy duyệt XN** (B1.2) và **nút QC/Levey-Jennings** (B1.3) vào v2.
3. **Lấp 4 backend stub** (B2.1–B2.4): ảnh key PACS (+crop+send-to-HIS+in), annotation PACS, kết nối
   máy XN trả KQ, nhập kết quả vi sinh + kháng sinh đồ. *(Không lưu thật = rủi ro dữ liệu lâm sàng.)*
4. **Cảnh báo bệnh nhân ở tiếp đón** (B1.7, phần `getReceptionWarnings`) — chốt **an toàn BN**, API có sẵn.

### 🟠 P1 — Hoàn thiện nghiệp vụ (backend có, thiếu UI)
5. **Nội trú v2 đầy đủ** (B1.4-6): nhập viện thật + sinh hiệu/truyền dịch-máu/chuyển khoa/dinh
   dưỡng/BK 6556 + trả KQ XN tại giường.
6. **Dược — nhập kho từ NCC + kiểm kê + xuất chuyển kho** (B3.1): dựng UI cho backend sẵn có.
7. **Tiếp đón — nối nốt** (B1.7): thẻ BHYT tạm, chụp ảnh BN, giữ giấy tờ, chỉ định CLS, lịch sử khám.

### 🟡 P2 — Cần làm mới (cân nhắc theo nhu cầu bệnh viện)
8. **EMR — quét/số hóa tài liệu giấy vào HSBA** (B3.4) — lõi "số hóa bệnh án".
9. **HR — payroll** (B3.6) + **quyết định nhân sự/BHXH** (B3.7); **công văn/văn thư** (B3.8).
10. **PTTT/sinh thiết tích hợp luồng OPD/CĐHA** (B3.2-3.3); **đăng ký nhiều phòng + sửa đối tượng
    thuốc/DV** (B3.10); **app mobile xem BA + in wifi** (B3.5); đo lường PACS nâng cao (B3.9).
11. Bổ sung trường danh mục LIS/RIS còn thiếu (B3.11).

---

## 5. Phụ lục — nguồn

- **Tài liệu chuẩn:** `docs/TaiLieuChucNang/` (36 PDF: EMR×3, HIS_LIS×21, PACS_RIS×7, tổng quan×5).
  PACS là sản phẩm **VRPACS V.2 (C+)**; HIS/LIS/EMR là **MQSoft**.
- **Code đối chiếu:** `frontend/src/pages-v2/*` (130 trang) · `frontend/src/api/*` (113 client) ·
  `backend/src/HIS.Infrastructure/Services/*CompleteService.cs`.
- **Bảng chi tiết feature-level** (checklist hành động đầy đủ theo 9 module):
  [`danh-gia-v2-chi-tiet-theo-module.md`](./danh-gia-v2-chi-tiet-theo-module.md).
- **Báo cáo liên quan:** [`rule-compliance-audit.md`](./rule-compliance-audit.md) (nợ kỹ thuật coding-rule),
  [`luong_nghiep_vu.md`](./luong_nghiep_vu.md) (25 nhóm nghiệp vụ gốc).
- **Caveat:** chưa đối chiếu từng biểu mẫu trong `HDSD_DesktopEMR` (~47 phiếu); `GIỚI THIỆU MQSOFT` +
  `Nội trú-Bác sĩ` chưa đọc được PDF gốc (xem mục 0).
