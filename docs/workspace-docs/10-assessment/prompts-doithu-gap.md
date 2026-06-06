# Prompts cho Claude Code — bù gap đối thủ (P1)

> Nguồn gap: `docs/GAP-DoiThu-2026-06.md`. Mỗi prompt dưới đây paste thẳng vào Claude Code, làm tuần tự.
> Mọi prompt đều: đọc `.claude/SKILL-MAP.md` trước; tuân BUILD-GATE (build sạch mới báo xong); đăng ký DI nếu thêm service/controller; **KHÔNG tự git add/commit/push**; ưu tiên `pages-v2/`.

---

## Prompt 1 — Nội trú: y lệnh thuốc + chỉ định CLS + ra viện (P1 #1,#2,#3)

```
Đọc .claude/SKILL-MAP.md rồi chọn skill phù hợp (his-fe-page-v2, his-fe-api-client). Bối cảnh gap: docs/GAP-DoiThu-2026-06.md mục 3 + mục 9 Đợt 1 (#1,#2,#3).

Làm 3 việc trong module Nội trú, backend ĐÃ CÓ sẵn nên KHÔNG viết lại backend, chỉ nối UI:

1) UI kê y lệnh thuốc nội trú có cấu trúc (thay textarea tự do hiện tại). Dòng thuốc gồm: tên thuốc (tìm qua search-medicines), liều, đường dùng, ngày/lần, lần/viên (số lượng), đối tượng (BHYT/thu phí). Gọi createPrescription / orderByTemplate đã có trong frontend/src/api/inpatient.ts → backend InpatientCompleteController POST prescriptions, prescribe-by-template. Đặt UI trong EmrEditor.tsx (hoặc modal mới) ở khu y lệnh.

2) UI chỉ định CLS nội trú: ô tìm dịch vụ → thêm (F7) và cây danh mục tick nhiều (F6). Gọi createServiceOrder + service-tree / order-by-template (backend InpatientCompleteController đã có). Hiện ClsOrdersModal chỉ hủy/đổi đối tượng → mở rộng hoặc thêm modal tạo mới.

3) Ra viện + tổng kết bệnh án: thêm nút Ra viện trong màn theo dõi điều trị (TreatmentMonitorSection.tsx), gọi pre-discharge-check → POST discharge (+ cancel-discharge); form tổng kết dùng medical-record-archive/summary + billing-statement; nối các nút in: print-discharge-certificate, print-referral-certificate, print-treatment-sheet.

Verify từng việc: cd frontend && npm run build (EXIT 0), npm run dev kiểm tra không lỗi console. KHÔNG commit/push.
```

---

## Prompt 2 — Tiếp đón: cảnh báo BN (CRUD) + đặt khám tại quầy (P1 #7,#8)

```
Đọc .claude/SKILL-MAP.md (his-fe-page-v2, his-fe-api-client). Gap: docs/GAP-DoiThu-2026-06.md mục 1.

1) Cảnh báo BN trong Tiếp đón v2: hiện chỉ READ-ONLY (getReceptionWarnings). Nhúng CRUD cảnh báo (tạo/sửa/xoá + mã màu + ghi chú) vào drawer pages-v2/reception/VisitDrawerBody.tsx, dùng lại component PatientFlagBanner.tsx (đang chỉ ở pages/ cũ) hoặc api/patientFlag.ts. Backend PatientFlagController đã CRUD đầy đủ.

2) Đặt khám tại quầy: trong pages-v2/BookingManagement.tsx, các nút Xác nhận/Nhắc lịch đang là toast giả → nối thật vào confirmBooking / checkInBooking / markNoShow (BookingManagementController đã có). Thêm form tạo/sửa đặt khám tại quầy + endpoint sửa booking (nếu backend chưa có endpoint sửa thì bổ sung trong AppointmentBookingController/BookingManagementController, nhớ đăng ký DI) + in phiếu đặt khám. Thêm picker "Danh sách đặt khám" trong reception/NewVisitModal.tsx để check-in từ đặt khám (register/quick/appointment đã có).

Verify: cd frontend && npm run build EXIT 0; nếu đụng backend thì cd backend/src/HIS.API && dotnet build 0 errors. KHÔNG commit/push.
```

---

## Prompt 3 — Phòng khám: khối Xử trí + toa ngoài F5 (P1 #6 + P2 #9)

```
Đọc .claude/SKILL-MAP.md (his-fe-page-v2). Gap: docs/GAP-DoiThu-2026-06.md mục 2.

1) Thêm khối "Xử trí" trong pages-v2/OpdEditor.tsx (panel phải): nút Nhập viện / Chuyển viện / Hẹn tái khám, gọi các endpoint đã có ở ExaminationCompleteController: request-hospitalization, request-transfer, {examId}/appointment + in giấy nhập viện/chuyển viện tương ứng.

2) Toa nhà thuốc/mua ngoài (F5) trong pages-v2/PrescriptionEditor.tsx: thêm chế độ toa ngoài (tách khỏi toa BHYT F3) + in toa qua endpoint prescriptions/{id}/print-external (đã có).

Verify: cd frontend && npm run build EXIT 0. KHÔNG commit/push.
```

---

## Prompt 4 — EMR: website tra cứu bệnh án công khai bằng CCCD/QR (P1 #4)

```
Đọc .claude/SKILL-MAP.md (his-fe-standalone-portal, his-be-module-scaffold, his-qa-anti-pattern). Gap: docs/GAP-DoiThu-2026-06.md mục 7 #26 + mục 9 Đợt 1 #4.

Xây luồng tra cứu HSBA công khai (không cần đăng nhập), như "Website số hóa bệnh án" của đối thủ:
- Backend: controller mới PublicEmrLookupController, endpoint GET /api/public-emr/lookup?cccd=... ([AllowAnonymous] + rate-limit chống brute force). Tra theo CCCD (+ có thể thêm xác thực ngày sinh/OTP nếu cần) → trả danh sách tài liệu đã ký số của BN (DocumentSignature). Cho phép xem/tải PDF đã ký qua DigitalSignatureController.DownloadSignedPdf. ĐĂNG KÝ DI cho controller/service mới. Validate ở BE, audit log truy cập.
- Frontend: trang standalone công khai (ngoài luồng đăng nhập) cho nhập CCCD hoặc quét QR → liệt kê file → mở PDF.

Lưu ý privacy (P0): chỉ trả tài liệu đã ký/được phép công khai; che thông tin nhạy cảm; rate-limit + log.
Verify: dotnet build 0 errors (đã đăng ký DI), npm run build EXIT 0. KHÔNG commit/push.
```

---

## Prompt 5 — Thanh toán: HDDT thật (P1 #5) — CẦN THÔNG TIN NCC

```
Đọc .claude/SKILL-MAP.md (his-be-payment-gateway, his-be-external-gateway). Gap: docs/GAP-DoiThu-2026-06.md mục 8.1.

Hiện HIS.Infrastructure/Services/PaymentGatewayService.cs (ExportElectronicInvoiceAsync ~dòng 296) đang "Simulate export (VNInvoice/Misa)". Cần tích hợp HDDT THẬT.

TRƯỚC KHI CODE: xác nhận với người dùng nhà cung cấp HDDT (VNPT-Invoice / Viettel S-Invoice / MISA meInvoice / VNInvoice...) và lấy thông tin kết nối (endpoint, tài khoản, mẫu số/ký hiệu hóa đơn, chứng thư số). KHÔNG hardcode secret — đưa vào config/env. Sau khi có thông tin: gọi API NCC thật (phát hành, ký số, lấy mã CQT, LookupUrl), lưu kết quả vào hóa đơn, xử lý lỗi/retry.

Verify: dotnet build 0 errors. KHÔNG commit/push.
```

---

## Sau mỗi đợt — Test (xem mục 10 báo cáo)
```
Đọc .claude/SKILL-MAP.md (his-test-e2e, his-test-api-powershell). Chạy:
- cd backend/src/HIS.API && dotnet build  (0 error) → dotnet run kiểm tra startup/migration/DI.
- cd frontend && npm run build (0 TS error) → npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome (0 console error) → npx playwright test cho trang đã đổi.
- Viết E2E mới cho từng gap P1 (kê y lệnh, chỉ định CLS, ra viện, tra cứu CCCD, xử trí nhập/chuyển viện, cảnh báo BN, đặt khám tại quầy).
Lỗi thì fix tới khi sạch. KHÔNG commit/push trừ khi tôi nói "push".
```

---
---

# ĐỢT 2 — P2 (chưa làm — prompt cho Claude Code)

> Mọi prompt: đọc `.claude/SKILL-MAP.md` trước; BUILD-GATE (FE `npm run build` EXIT 0 · BE `dotnet build` 0 error mới báo xong); đăng ký DI nếu thêm service/controller; ưu tiên `pages-v2/`; KHÔNG tự git push. Endpoint ghi "đã có" = chỉ nối UI; "thêm mới" = viết backend.

## Prompt 6 — Nội trú: hoàn thiện (in tờ điều trị, chẩn đoán kèm theo, phiếu phòng mổ, kế hoạch sau gây mê)

```
Đọc .claude/SKILL-MAP.md (his-fe-page-v2, his-be-module-scaffold). Gap: docs/GAP-DoiThu-2026-06.md mục 3 (các dòng ⚠️) + mục 9 Đợt 2 #10.
1) In tờ điều trị: nối nút In ở mỗi tờ điều trị trong EmrEditor.tsx/TreatmentMonitorSection → printTreatmentSheet(treatmentSheetId) (đã có). Lấy id từ tờ đang chọn.
2) Chẩn đoán kèm theo trên tờ điều trị: hiện chỉ GET diagnosis/{admissionId}. THÊM endpoint POST diagnosis (chẩn đoán chính + nhiều kèm theo) trong InpatientCompleteController + service, đăng ký nếu cần; UI thêm/sửa chẩn đoán kèm theo.
3) Phiếu xuất thuốc/VTYT phòng mổ phân đối tượng (hao phí/thu phí/BHYT KTC): tách phiếu riêng cho phòng mổ (mở rộng từ cabinet-issue của WarehouseCompleteController), phân loại đối tượng theo doc MQ Nội trú.
4) Form "Kế hoạch sau gây mê – phẫu thuật" riêng (hiện gộp trong PreAnesthesiaModal của shared/SurgeryFormModals.tsx) → tách form + lưu.
Verify: npm run build EXIT 0; nếu đụng BE thì dotnet build 0 error (đăng ký DI). KHÔNG push.
```

## Prompt 7 — Xét nghiệm (LIS): hủy nhận mẫu, hẹn lấy mẫu, xem HSBA, tiện ích tồn kho

```
Đọc .claude/SKILL-MAP.md (his-be-module-scaffold, his-fe-page-v2). Gap: docs/GAP-DoiThu-2026-06.md mục 5.
1) Hủy nhận mẫu: THÊM endpoint POST /api/sample-receive/cancel-receive trong SampleReceiveController (đảo ReceiveStatus 1→0, clear ReceivedByUserId/At, Status về 0, audit), đăng ký nếu cần; thêm nút "Hủy nhận" ở pages-v2/SampleReceive.tsx (chỉ khi đã nhận).
2) Hẹn lấy mẫu / tái XN (ngày/tuần/tháng): THÊM bảng/endpoint hẹn trong SampleCollectionController + UI ở SampleSequenceToolbar.tsx (migration idempotent đánh số kế tiếp trong Data/Scripts nếu cần bảng mới).
3) Nút "Xem HSBA": từ màn trả KQ (Laboratory.tsx / phiếu KQ) mở EMR theo patientId/medicalRecordId (route EMR đã có).
4) Panel "Tiện ích" xem tồn tủ trực + tồn hóa chất ngay trên màn XN: gọi API kho (warehouse stock) + LabChemical đã có; hiển thị trong Laboratory.tsx.
Verify: dotnet build 0 error (nếu thêm BE, đăng ký DI + migration), npm run build EXIT 0. KHÔNG push.
```

## Prompt 8 — CĐHA/PACS: tường trình PTTT, sinh thiết, anonymize share, bulk download

```
Đọc .claude/SKILL-MAP.md (his-fe-dicom-viewer, his-be-module-scaffold). Gap: docs/GAP-DoiThu-2026-06.md mục 6 (các dòng ❌/⚠️).
1) Khai báo dịch vụ CĐHA ↔ nhập tường trình PTTT: THÊM mapping (RisCatalogController + UI RisCatalogAdmin.tsx) + nút "Tường trình PTTT" trên màn kết quả Radiology.tsx (nối SurgeryCompleteController/ClinicalNarrative).
2) Nhập sinh thiết / GPB ngay tại màn KQ CĐHA: thêm nút mở luồng PathologyController (đã có) từ Radiology.tsx + in phiếu sinh thiết.
3) Anonymize/ẩn thông tin BN khi chia sẻ: thêm tùy chọn ẩn PHI vào StudyShareController (Create) + UI share.
4) Bulk download theo BN/danh sách + tùy chọn mã hóa/anonymize: mở rộng RISComplete dicom/export (hiện chỉ theo từng study) thành tải nhiều study theo patient/danh sách.
Verify: dotnet build 0 error (đăng ký DI), npm run build EXIT 0. KHÔNG push.
```

## Prompt 9 — EMR & Điều dưỡng: biểu mẫu TT32, phiếu chăm sóc cấp 1/2, app mobile bác sĩ

```
Đọc .claude/SKILL-MAP.md (his-fe-emr-print-form, his-be-module-scaffold). Gap: docs/GAP-DoiThu-2026-06.md mục 7 (#8,#11,#25).
1) Biểu mẫu giấy chuẩn TT32/2023 còn thiếu: giấy chứng nhận PTTT, biên bản kiểm thảo tử vong, phiếu nhận định phân loại cấp cứu, các giấy cam kết, phiếu bàn giao chuyển khoa BS/ĐD. Thêm mẫu in tại frontend/src/components/EMRPrintTemplates/ + sinh PDF tại PdfGenerationService.cs + khai báo document-types (EmrAdminController) để đưa vào luồng ký.
2) Phiếu chăm sóc điều dưỡng TT32 cấp 1/cấp 2 riêng (hiện chỉ nursing-care chung): thêm mẫu cấp 1/cấp 2 trong InpatientCompleteController + print template.
3) App mobile bác sĩ nhập liệu: nâng pages-mobile/DoctorPortalMobile.tsx từ viewer thành nhập tờ điều trị/dự trù thuốc/CLS (gọi treatment-sheets, prescription, service-order API đã có) + in qua wifi.
Verify: dotnet build 0 error (nếu thêm BE), npm run build EXIT 0. KHÔNG push.
```

## Prompt 10 — TTB/VPP: thu hồi phiếu, hoàn trả, kiểm kê tài sản, lịch bảo trì

```
Đọc .claude/SKILL-MAP.md (his-be-module-scaffold, his-fe-page-v2). Gap: docs/GAP-DoiThu-2026-06.md mục 8.4.
1) Thu hồi phiếu yêu cầu VPP: THÊM endpoint requests/{id}/recall (hoặc reject) trong OfficeSupplyController (đảo trạng thái để chỉnh sửa), UI nút Thu hồi.
2) Duyệt hoàn trả VPP: THÊM luồng returns (giống duyệt cấp đảo chiều) trong OfficeSupplyController + UI.
3) Kiểm kê tài sản cố định: THÊM phiếu kiểm kê trong AssetManagementController (tham chiếu BloodBankCompleteController:333 stocktake) + UI ở AssetManagement.tsx/Equipment.tsx.
4) Nối nút "Lên lịch bảo trì" Equipment.tsx (đang stub message.success) → API maintenance/schedules (ExtendedWorkflowControllers đã có).
Verify: dotnet build 0 error (đăng ký DI + migration nếu cần), npm run build EXIT 0. KHÔNG push.
```

---

# ĐỢT 3 — P3 (nhỏ/hoàn thiện — chưa làm)

## Prompt 11 — Gộp P3 (Dược popup, sửa hành chính BN, viewer config, mẫu BA, HR, biên lai)

```
Đọc .claude/SKILL-MAP.md. Gap: docs/GAP-DoiThu-2026-06.md mục 9 Đợt 3 (#15–#19). Làm từng việc nhỏ, build sau mỗi nhóm:
1) [Dược] Popup cảnh báo hạn dùng khi vào module Dược: gọi expiry-alerts/on-login (đã có) hiện modal + acknowledge.
2) [Tiếp đón] Form sửa thông tin hành chính BN trong drawer v2: nối UpdateAdmission (đã có).
3) [CĐHA] User-config phím tắt & W/L preset F1–F10 trong DicomViewerConfig.tsx; "Favorite" ca chụp per-user (mở rộng từ tags RISComplete); gallery key-image (xóa/lưu hàng loạt) trong viewer.
4) [EMR] UI khai báo + áp dụng mẫu HSBA ngoại trú & mẫu tường trình PTTT (ClinicalTemplateController đã có); rà soát bộ lọc form trình ký theo "vai trò người ký" (SigningWorkflow.tsx/CentralSigning.tsx).
5) [HR] Thêm tab "Đoàn thể" + bậc/hệ số lương vào hồ sơ NV (EmployeeProfileController) để liên kết Payroll.
6) [Biên lai] Thêm field "Lý do thu" (CollectionReason) vào ReceiptBook (hiện chỉ Notes chung).
7) [LIS] (tùy chọn) DefaultLabRole per-user để auto-fill KTV/Người duyệt.
Verify: dotnet build 0 error (đăng ký DI + migration nếu cần), npm run build EXIT 0. KHÔNG push.
```

---

## Tình trạng triển khai (cập nhật 2026-06-06)
- **Đợt 1 (P1 + toa F5):** ĐÃ VIẾT CODE + **BUILD GATE PASS** (BE 0 err sau fix `using Microsoft.Extensions.Logging` trong
  `BillingCompleteService.ElectronicInvoices.cs`; FE build EXIT 0) + **runtime OK** (schema-drift 0, smoke public-emr/booking)
  + **Cypress console-errors 81/81 pass**. Chi tiết: `docs/workspace-docs/90-archive/handoffs/session-2026-06-06-doithu-gap-impl.md`.
  - Regression fix kèm theo: `useGlobalAbbreviationExpander` gọi API không token → 401 → interceptor đá `/login`
    làm hỏng MỌI trang public (`/tra-cuu-benh-an`, `/dat-lich`, `/shared/:token`) — đã fix (chỉ load dict khi authenticated).
  - E2E mới: `frontend/e2e/doithu-gap-dot1.spec.ts` (4 luồng P1). Spec cũ `reception-drawer.spec.ts` stale selector
    (`.ant-drawer-content` → `.hui-drawer` DrawerShell) — đã sửa.
- **Đợt 2 (Prompt 6–10):** ✅ XONG 2026-06-07 (5 agent code-change-controller: P6+P7 song song → P8+P10 song song → P9 riêng).
  Build gate pass (BE 0 err — fix 2 lỗi nhỏ: `r.data` envelope ở 4 caller diagnosis P6, `DateTime` non-null P9; FE EXIT 0).
  Regression: migration 61/62/63/65 apply sạch · schema-drift 0 · smoke 5/5 endpoint mới · Cypress 81/81 · Playwright pass
  (trừ 2 spec reception bị chặn bởi bug TZ pre-existing — xem dưới). Defer đáng chú ý: nút "Tường trình PTTT" trên màn KQ CĐHA
  (cần endpoint template theo radiologyServiceId trước), StudyInstanceUID trong RadiologyOrderDto, document-types TT32 cần seed
  qua API sau deploy, mobile PrescriptionForm truyền warehouseId rỗng (cần verify backend default).
- **Đợt 3 (Prompt 11):** ✅ XONG 2026-06-07 (13 file; 5/7 việc done — defer: role-filter trình ký (cần BE entity change),
  DefaultLabRole per-user (cần UserSettings)). Build gate pass sau 2 fix nhỏ (fragment EMR.tsx, StatusTone 'off'→'warn').
  Migration 66 apply sạch · schema-drift 0 · smoke 4/4 (lưu ý route đúng: `GET api/receipt-book`, `api/inpatient/diagnosis`)
  · Cypress 81/81. W/L preset + phím tắt viewer đã có sẵn từ trước (không cần làm).
- **🐛 Bug TZ tiếp đón (P0): ✅ FIX TIER-1 2026-06-07** — helper mới `HIS.Core.Common.VnTime` (NowVn/TodayVn/DayRangeUtc);
  fix 4 site bug class `CreatedAt(UTC) vs ngày local`: `GetTodayAdmissionsAsync` (bảng tiếp đón — verify repro:
  0→4 rows lúc 1h sáng), `MultiSpecialtyExamService` ×2 (queueBase), `HospitalPharmacyService` (doanh số hôm nay).
  Playwright reception 4 passed sau fix. **CÒN LẠI (backlog, task riêng):** subsystem QueueTickets dùng
  `IssueDate = DateTime.Now` (semantics lệch dev/prod) + ~50 site `.Date ==` khác cần phân loại từng chỗ
  (đa số so AppointmentDate user-chọn = KHÔNG bug).
- **WAVE DEFER (các prompt còn lại): ✅ XONG 2026-06-07** — 3 agent song song + 2 việc inline:
  - Wave A (P8 defer): endpoint `pttt-service-mappings/by-service/{id}` + nút "Tường trình PTTT" conditional ở drawer
    Radiology + `StudyInstanceUID` thật vào RadiologyOrderDto/luồng share.
  - Wave B (P7+P10 defer): `GET sample-receive/accepted` (dùng VnTime) + tab "Đã nhận hôm nay" + sửa từng dòng
    kiểm kê (`PUT stocktakes/{id}/items/{itemId}`) + in phiếu kiểm kê.
  - Wave C (P11 defer): `SignerRole` filter trình ký + bảng `UserSettings` generic + DefaultLabRole auto-fill KTV
    (migration `67_signer_role_user_settings.sql`).
  - Inline: fix mobile PrescriptionForm (warehouse select + medicine autocomplete thật — trước đó không thể lưu,
    gửi ''/tên vào field Guid) + seed 5 document-types TT32 (migration `68_seed_tt32_document_types.sql`).
  - Verify: build 2 tầng 0 err · migration 67+68 sạch · schema-drift 0 · smoke wave 4/4.
  - Defer còn treo (nhỏ): batch-check mapping PTTT cho row action · prefill narrativeBody vào SurgeryReportModal ·
    UI nhập SignerRole khi tạo trình ký · DefaultKtvId/ApproverId truyền vào API collect.

---
---

# ⭐ PROMPT 12 — TEST TOÀN BỘ (BẮT BUỘC chạy sau khi hoàn tất MỖI prompt 1–11)

> Sau khi làm xong bất kỳ prompt nào ở trên, PHẢI chạy nguyên prompt này để test lại TOÀN BỘ (regression), đảm bảo không vỡ chức năng cũ. Lỗi thì fix tới khi sạch rồi mới sang prompt kế.

```
Đọc .claude/SKILL-MAP.md (his-qa-anti-pattern, his-test-e2e, his-test-api-powershell). Chạy TEST TOÀN BỘ hệ thống HIS (regression đầy đủ), KHÔNG chỉ phần vừa sửa:

1) BUILD GATE:
   - cd frontend && npm install (nếu chưa) && npm run build  → EXIT 0.
   - cd backend && dotnet build HIS.sln  → 0 error, 0 warning mới phát sinh.
   - Khởi động BE (dotnet run) kiểm tra: startup không lỗi, migration tự áp, DI không 500, GET /health/schema-drift → missingCount = 0.

2) E2E TOÀN BỘ (không chỉ trang vừa đổi):
   - cd frontend && npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome  → 0 console error trên TẤT CẢ route.
   - npx playwright test  → chạy toàn bộ suite hiện có (Inpatient, OPD, Reception, Pharmacy, LIS, Radiology, EMR, Billing, HR, TTB...). 0 fail.
   - Bổ sung/chạy E2E cho mọi gap đã làm: kê y lệnh & CLS nội trú, ra viện, xử trí nhập/chuyển viện, toa F5, cảnh báo BN, đặt khám (tạo/sửa/check-in), tra cứu CCCD công khai, + các việc Đợt 2/3 nếu đã làm (hủy nhận mẫu, hẹn lấy mẫu, tường trình PTTT, sinh thiết, biểu mẫu TT32, phiếu chăm sóc cấp 1/2, thu hồi/hoàn trả VPP, kiểm kê tài sản, popup hạn dùng, sửa hành chính BN, mẫu BA, HR, biên lai...).

3) API TEST (regression backend): chạy test-*.ps1 hiện có (test-ipd-flow.ps1, test-reception-full.ps1) + viết thêm kịch bản API cho endpoint mới (cancel-receive, public-emr/lookup, booking update, office-supply recall/returns, asset stocktake, einvoice issue...). Kiểm authz/role đúng.

4) REGRESSION luồng lõi: đăng nhập admin/Admin@123 → tiếp đón → khám → CLS/đơn thuốc → cận lâm sàng → nội trú → ra viện → thanh toán: chạy thông suốt, không vỡ.

5) Báo cáo: liệt kê test pass/fail, lỗi đã fix, lỗi còn lại (nếu có). Lỗi → fix tới khi sạch hết.

KHÔNG git commit/push trừ khi tôi nói "push".
```
