# Rà toàn bộ nút giả (toast-stub) toàn ứng dụng · 2026-06-06

> Quét `frontend/src/pages-v2` + `pages` bằng Grep/Read. Nút giả = handler chỉ `tk()/ti()/message.*` mà KHÔNG gọi API/`window.open(blob)`/`navigate`. Toast SAU `await api...` = nút thật (đã loại).
> **Tổng: 97 nút giả** — P1: 40 · P2: 32 · P3: 25. Phân loại: ~58 [NỐI API có sẵn] · ~26 [CẦN BE] · ~13 [ẨN/navigate].

## P1 — Lâm sàng / Dược / XN / CĐHA / Viện phí / Nội trú (40)
| Trang (file:dòng) | Nút | Đáng lẽ làm | Đề xuất |
|---|---|---|---|
| BillingEditor.tsx:333 | Gửi email | Gửi HĐĐT qua email | [CẦN BE] gửi email HĐĐT |
| BillingEditor.tsx:333 | In | In hoá đơn | [CẦN BE] pdf.printInvoice |
| BillingEditor.tsx:371 | In biên lai | In biên lai | [CẦN BE] pdf.printReceipt |
| DispensingCounter.tsx:173 | Quét barcode | Quét đơn → phát thuốc | [NỐI FE] scanner+lookup |
| Pharmacy.tsx:257 | In nhãn | In nhãn thuốc | [CẦN BE] pdf.printDrugLabel |
| OPD.tsx:121 | In phiếu | In phiếu khám/chỉ định | [NỐI API] pdf.printEmrForm/printPrescription |
| EMR.tsx:242 | In HS | In PDF hồ sơ | [NỐI API] pdf.printMedicalRecord |
| EMR.tsx:290 | Gửi PDF | Xuất PDF bệnh án | [NỐI API] pdf.printMedicalRecord |
| Microbiology.tsx:161 | In phiếu | In KQ vi sinh | [NỐI API] pdf.printLabResult |
| LabQC.tsx:471 | Xuất Excel | Xuất QC | [NỐI API] dataExport/xlsx |
| ReagentManagement.tsx:167 | Mở cảnh báo | Hoá chất sắp hết/hạn | [NỐI API] reagent.getReagentAlerts |
| ReagentManagement.tsx:192 | Mở lịch sử dùng | Lịch sử tiêu hao | [NỐI API] reagent.getReagentUsageHistory |
| CultureCollection.tsx:141 | Lấy ống | Lấy ống chủng | [NỐI API] cultureStock.retrieveAliquot |
| CultureCollection.tsx:165 | Mở cấy chuyền | Cấy chuyền | [NỐI API] cultureStock.subcultureStock |
| CultureCollection.tsx:190 | Mở lịch sử | Lịch sử chủng | [NỐI API] cultureStock.getStockLogs |
| CultureCollection.tsx:196 | Mở KT viability | Kiểm tra sống sót | [NỐI API] cultureStock.recordViabilityCheck |
| SampleStorage.tsx:105 | Lấy mẫu | Lấy mẫu khỏi kho | [NỐI API] sampleStorage.retrieveSample |
| SampleStorage.tsx:130 | Quét QR/barcode | Tra mẫu | [NỐI API] sampleStorage.getSampleByBarcode |
| SampleStorage.tsx:133 | Lưu mẫu mới | Lưu mẫu | [NỐI API] sampleStorage.storeSample |
| SampleStorage.tsx:156 | Lấy mẫu | Lấy mẫu đã chọn | [NỐI API] sampleStorage.retrieveSample |
| SampleStorage.tsx:159 | Hủy mẫu | Huỷ mẫu | [NỐI API] sampleStorage.disposeSample |
| SampleTracking.tsx:101 | Hủy từ chối | Hoàn tác từ chối | [NỐI API] sampleTracking.undoRejection |
| SampleTracking.tsx:102 | Lấy lại mẫu | Lấy lại mẫu | [NỐI API] sampleTracking.reCollectSample |
| SampleTracking.tsx:128 | Báo cáo từ chối | DS mẫu từ chối | [NỐI API] sampleTracking.getSampleRejections |
| Rehabilitation.tsx:214 | In giấy GT | In giấy giới thiệu PHCN | [CẦN BE] print |
| TraditionalMedicine.tsx:172 | Đơn thuốc bắc | Tạo/xem đơn YHCT | [NỐI API] traditionalMedicine |
| MethadoneTreatment.tsx:151 | XN nước tiểu | Ghi/xem XN | [NỐI API] methadone.recordUrineTest |
| MethadoneTreatment.tsx:154 | Cấp liều hôm nay | Cấp liều ngày | [NỐI API] methadone.recordDose |
| MethadoneTreatment.tsx:176 | Lịch sử cấp liều | Lịch sử | [NỐI API] methadone.getDosingHistory |
| MethadoneTreatment.tsx:183 | Cấp liều | Ghi cấp liều | [NỐI API] methadone.recordDose |
| IvfLab.tsx:111 | Quản lý phôi đông | Phôi đông lạnh | [NỐI API] ivfLab |
| Dashboard.tsx:293 | Y lệnh CT STAT | Tạo y lệnh CĐHA | [NỐI API] ris orders |
| Dashboard.tsx:295 | Chuyển ICU | Chuyển BN ICU | [NỐI API] inpatient transfer |
| Dashboard.tsx:304 | Đặt giường | (redirect Nội trú) | [GIỮ] redirect cố ý |
| Dashboard.tsx:315 | In phiếu mổ | In phiếu mổ | [NỐI API] pdf printSurgery |
| Dashboard.tsx:344 | Ack cảnh báo | Ack 1 alert | [NỐI API] businessAlerts ack |
| Dashboard.tsx:355 | Ack tất cả | Ack all | [NỐI API] businessAlerts ack-all |
| EmergencyDisaster.tsx:399 | Thêm ca (demo) | Tiếp nhận ca không MCI | [NỐI API] massCasualty |
| EmergencyDisaster.tsx:465 | Code Blue (diễn tập) | Kích hoạt Code Blue | [CẦN BE] hoặc [ẨN] |
| PaymentTransactions.tsx:134 | Xuất Excel | Xuất giao dịch | [NỐI API] dataExport/xlsx |

## P2 — Admin / HR / Tài chính / Kho / BHXH / Hồ sơ (32)
| Trang (file:dòng) | Nút | Đáng lẽ làm | Đề xuất |
|---|---|---|---|
| BhxhAudit.tsx:145 | Duyệt | Duyệt hồ sơ giám định | [CẦN BE] bhxhAudit |
| BhxhAudit.tsx:148 | Gửi cổng BHXH | Gửi hồ sơ | [CẦN BE] submit cổng |
| BhxhAudit.tsx:174 | Xuất XML | Xuất XML giám định | [NỐI API] insurance XML |
| BhxhAudit.tsx:177 | Gửi cổng (hàng loạt) | Gửi nhiều | [CẦN BE] submit |
| BhxhAudit.tsx:199 | In phiếu giám định | In | [CẦN BE] print |
| Finance.tsx:84 | Xuất CSV | Xuất dòng tiền | [NỐI API] reporting/dataExport |
| Finance.tsx:109 | Xuất Excel | Xuất báo cáo TC | [NỐI API] reporting/dataExport |
| Finance.tsx:112 | Báo cáo tổng hợp tháng | Mở báo cáo | [NỐI API] hospitalReport |
| Finance.tsx:132 | In báo cáo dịch vụ | In | [NỐI API] pdf/reporting |
| Finance.tsx:135 | Gửi báo cáo | Gửi | [CẦN BE] |
| AssetManagement.tsx:176 | Khấu hao | Báo cáo khấu hao | [CẦN BE] depreciation report |
| HR.tsx:400 | Sao chép tuần | Copy lịch trực | [CẦN BE] schedule copy |
| HR.tsx:608 | Sửa lịch (tooltip) | (chỉ hướng dẫn) | [ẨN] nút thừa |
| CentralSigning.tsx:168 | Thêm chứng thư | Thêm cert | [NỐI API] centralSigning.saveCertificate |
| CentralSigning.tsx:208 | Sửa | Sửa cert | [NỐI API] centralSigning.saveCertificate |
| CentralSigning.tsx:243 | Appearance config | Cấu hình hiển thị ký | [NỐI API] centralSigning.getAppearanceConfig |
| CentralSigning.tsx:252 | HSM info | Xem HSM | [NỐI API] centralSigning.getHsmInfo |
| CentralSigning.tsx:255 | Tạo CSR | Tạo CSR | [NỐI API] centralSigning.createCsr |
| CentralSigning.tsx:272 | Chỉnh sửa | Sửa cert | [NỐI API] centralSigning.saveCertificate |
| MedicalRecordArchive.tsx:148 | Tải xuống | Tải file HSBA | [NỐI API] pdf/emrManagement |
| MedicalRecordArchive.tsx:256 | Tải xuống | Tải HSBA | [NỐI API] như trên |
| MedicalRecordArchive.tsx:259 | In HSBA | In | [NỐI API] pdf.printMedicalRecord |
| MedicalRecordPlanning.tsx:106 | Gán BN | Gán mã hồ sơ | [NỐI API] medicalRecordPlanning.assignRecordCode |
| MedicalRecordPlanning.tsx:127 | Cấp dải mã | Cấp dải BA | [CẦN BE] bulk allocate |
| MedicalRecordPlanning.tsx:148 | Gán BN | Gán BN | [NỐI API] assignRecordCode |
| PracticeLicense.tsx:170 | Cảnh báo CCHN | DS sắp hết hạn | [NỐI API] practiceLicense |
| PracticeLicense.tsx:195 | In CCHN | In chứng chỉ | [CẦN BE] print |
| EndpointSecurity.tsx:161 | Sự cố ATTT | Quản lý sự cố | [NỐI API] endpointSecurity |
| TrainingResearch.tsx:134 | Học viên | DS học viên | [NỐI API] trainingResearch |
| TrainingResearch.tsx:157 | NCKH | Điều hướng | [ẨN] navigate |
| pages/Equipment.tsx:419 | Thêm thiết bị | Thêm TB | [NỐI API] equipment create |
| pages/MedicalSupply.tsx:501 | Tạo đề xuất mua | Đề xuất mua | [CẦN BE] procurement |

## P3 — Public-health / Registry / Help / Báo cáo phụ (25)
| Trang (file:dòng) | Nút | Đề xuất |
|---|---|---|
| Help.tsx:160/178/204/241/277/309 | Mở thêm/docs/Sửa/In | [ẨN] hoặc window.open/window.print |
| Help.tsx:190/237 | Xem video | [NỐI] window.open(r.videoUrl) |
| Epidemiology.tsx:162/165 | Ổ dịch / báo cáo ca | [NỐI API] epidemiology |
| Epidemiology.tsx:187 | In báo cáo | [CẦN BE]/pdf |
| EnvironmentalHealth.tsx:140 | Quan trắc | [NỐI API] environmentalHealth |
| PopulationHealth.tsx:159 | Xuất Excel | [NỐI API] dataExport |
| HealthExchange.tsx:162 | Đồng bộ tất cả | [NỐI API] healthExchange sync |
| InfectionControl.tsx:210 | Cách ly | [NỐI API] infectionControl |
| ClinicalGuidance.tsx:166 | Hoạt động | [NỐI API] clinicalGuidance |
| InterHospitalSharing.tsx:112 | Xử lý | [NỐI API] respondToRequest |
| InterHospitalSharing.tsx:133 | Yêu cầu mới | [NỐI API] createRequest |
| TraumaRegistry.tsx:185 | In báo cáo | [CẦN BE]/pdf |
| SatisfactionSurvey.tsx:136 | Liên hệ phản hồi | [CẦN BE] callback |
| SatisfactionSurvey.tsx:162 | Xuất CSV | [NỐI API] dataExport |
| SatisfactionSurvey.tsx:165 | Tạo khảo sát | [NỐI API] satisfactionSurvey |
| SatisfactionSurvey.tsx:210 | In phản hồi | [CẦN BE]/pdf |
| VideoConsultation.tsx:150 | Xuất Excel | [NỐI API] dataExport |
| Dashboard3Cap.tsx:184 | Xuất Excel | [NỐI API] reporting |

---

## ⭐ PROMPT sửa hết nút giả (paste cho Claude Code)
```
Đọc .claude/SKILL-MAP.md (his-fe-page-v2, his-fe-api-client, his-be-module-scaffold) + docs/workspace-docs/10-assessment/audit-stub-buttons-full-2026-06-06.md (danh sách 97 nút giả). Sửa HẾT theo nhóm ưu tiên P1→P2→P3. Nguyên tắc mỗi nút:
- [NỐI API]: gọi hàm có sẵn trong src/api/* (tên đã ghi trong bảng) — thêm loading + message.error khi lỗi + refetch. Verify hàm tồn tại bằng Grep trước khi gọi (đừng bịa).
- [CẦN BE]: nếu backend chưa có endpoint (in hoá đơn/biên lai/nhãn thuốc printInvoice/printReceipt/printDrugLabel, gửi email HĐĐT, duyệt+gửi cổng BHXH, khấu hao tài sản, copy lịch trực, bulk cấp dải mã BA, các print khác): bổ sung controller/service + ĐĂNG KÝ DI + migration nếu cần. Nếu quá lớn cho 1 phiên thì làm trước phần in (pdf) vì ảnh hưởng chứng từ BN.
- [ẨN/navigate]: nút không có nghiệp vụ backing (Help in/sửa, HR:608 tooltip, TrainingResearch NCKH, Dashboard onReserve) → ẩn nút hoặc đổi thành navigate()/window.open/window.print thật.

Thứ tự: P1 (40 nút — lâm sàng/dược/XN/viện phí/nội trú) TRƯỚC, rồi P2 (32), rồi P3 (25). Làm theo từng nhóm, build sạch sau mỗi nhóm.
Sau mỗi nhóm: cd frontend && npm run build (EXIT 0); nếu đụng BE: cd backend && dotnet build (0 error). Xong toàn bộ: chạy Prompt 12 (regression toàn bộ trong prompts-doithu-gap.md). Báo cáo: mỗi nút đã [NỐI API gì]/[BE gì]/[ẨN], + kết quả test. KHÔNG git commit/push trừ khi tôi nói "push".
```

> Lưu ý: ~58 nút chỉ là "chưa wire" (API đã có) → sửa nhanh, rủi ro thấp. 26 nút [CẦN BE] nặng hơn, trong đó nhóm IN (pdf.printInvoice/printReceipt/printDrugLabel/printMedicalRecord) nên ưu tiên vì là chứng từ phát cho BN. `bhxhAudit.ts` gần như rỗng (chỉ getAuditSessions) → cụm BHXH cần BE nhiều nhất.

---

## ✅ TÌNH TRẠNG XỬ LÝ — 2026-06-07 (CHƯA COMMIT/PUSH)

Verify lại trước khi sửa (audit viết 06-06, một phần đã sửa ở UI-ALL 06-07): **81/97 còn stub thật** (6 Dashboard đã sửa, 2 Equipment/MedicalSupply v1 vẫn stub → tổng **83 nút xử lý**). Thực thi fan-out 10 agent (1 BE + 9 FE) theo 3 wave, build-gate tập trung sau mỗi wave (memory `orchestration-parallel-agents`).

### Backend bổ sung (build BE 0 error · migration 75/76 applied local)
- **printDrugLabel** → `GET /api/pharmacy/prescriptions/{id}/print-drug-label` + FE `pharmacy.printDrugLabel`.
- **bhxhAudit** (file cũ gần rỗng) → 5 endpoint: approve · submit-portal (MockMode) · submit-batch · export-xml (blob) · print-form. **Migration 75** (5 cột status/approve/submit trên `BhxhAuditSessions`). FE `bhxhAudit.ts` 6 hàm.
- **copyRoster** → `POST /api/MedicalHR/rosters/copy-week` + FE `medicalHR.copyWeekRoster`.
- **bulkAllocate** → `POST /api/medical-record-planning/record-codes/bulk-allocate` + FE `medicalRecordPlanning.bulkAllocate` (trả dải mã hợp lệ; gán thật vẫn qua `assignRecordCode`).
- **satisfactionSurvey** → createCampaign/getCampaigns/contactCallback/acknowledgeFeedback/exportSurveys. **Migration 76** (2 bảng Campaign + FeedbackCallback). FE rewrite `satisfactionSurvey.ts`.
- **healthExchange syncAll** → `POST /api/HIE/sync-all` + FE `healthExchange.syncAll`.
- *Fix điều phối tập trung*: 2 class trùng `IMedicalHRService`/`IHealthExchangeService` (dead code trong `ExtendedServiceImplementations.cs`) thêm stub method; đổi tên DTO trùng `CreateCampaignDto`→`CreateSurveyCampaignDto` (đụng feature đợt khám sức khỏe).

### Frontend đã wire (build FE EXIT 0 cả 3 wave)
- **P1 lab/mẫu**: SampleStorage (lấy/lưu/quét/hủy) · SampleTracking (hủy TC/lấy lại/báo cáo) · CultureCollection (lấy ống/cấy chuyền/lịch sử/viability) · ReagentManagement (cảnh báo/lịch sử) · Microbiology (in KQ `printLabResult`) · LabQC (Excel).
- **P1 lâm sàng**: Methadone (XN/cấp liều/lịch sử) · TraditionalMedicine (đơn thuốc bắc) · IvfLab (phôi đông).
- **P1 viện phí**: BillingEditor (gửi email HĐĐT `sendElectronicInvoice` · in HĐ `printInvoice` · in biên lai `printPaymentReceipt` — **3 hàm này ĐÃ CÓ SẴN, audit đoán nhầm là CẦN BE**) · PaymentTransactions (Excel).
- **P2**: CentralSigning (cert/appearance/HSM/CSR) · MedicalRecordArchive (in HSBA) · MedicalRecordPlanning (gán BN/cấp dải mã) · PracticeLicense (cảnh báo CCHN) · Finance (CSV/Excel/báo cáo tháng/in) · AssetManagement (khấu hao) · HR (copy tuần · ẩn nút "Sửa lịch" thừa) · EndpointSecurity (sự cố) · TrainingResearch (học viên · ẩn NCKH) · BhxhAudit (5 nút) · Pharmacy (in nhãn) · Equipment v1 (thêm TB) · MedicalSupply v1 (đề xuất mua).
- **P3 public-health**: Help (video→window.open · in→window.print · ẩn nút admin) · Epidemiology (ổ dịch/báo cáo ca) · EnvironmentalHealth (quan trắc) · PopulationHealth (Excel) · HealthExchange (syncAll) · InfectionControl (cách ly) · ClinicalGuidance (hoạt động) · InterHospitalSharing (xử lý/yêu cầu mới) · TraumaRegistry (báo cáo+print) · SatisfactionSurvey (chiến dịch/liên hệ/CSV) · VideoConsultation (Excel) · Dashboard3Cap (Excel).

### ✅ Defer cần BE — ĐÃ LÀM NỐT 2026-06-07 tối (CHƯA PUSH · migration 77 applied local · build 2 tầng 0 err · schema-drift 0)
Fan-out 4 agent vertical-slice (BE+FE api+FE wire), build-gate tập trung. Không cần DI mới (reuse service sẵn). Em fix tập trung: 2 class stub trùng interface (`RehabilitationService`/`MassCasualtyService` dead code) + 1 lỗi Guid-null + 6 lỗi TS FE.
1. **Rehab "In giấy GT"** → `GET /api/rehabilitation/referrals/{id}/print-referral` (HTML giấy GT PHCN) + FE `rehabilitation.printReferral` → wire.
2. **DispensingCounter "Quét barcode"** → `GET /api/examination/prescriptions/search-by-code/{code}` (theo PrescriptionCode, fallback Id) + FE modal nhập/scan → lookup → mở drawer. (404 khi không thấy ✓)
3. **EMR "In HS"/"Gửi PDF"** → thêm `medicalRecordId` vào `EmrRecordDto` BE (`ExaminationCompleteController` + map) + FE → `pdf.printMedicalRecord` (guard).
4. **OPD "In phiếu"** → thêm `examinationId` vào `AdmissionDto` (`ReceptionCompleteService.Queue` load Examinations batch) + FE → `pdf.printEmrForm(examinationId,'kham')`.
5. **PracticeLicense "In CCHN"** → `GET /api/practice-license/licenses/{id}/print` (HTML CCHN) + FE `printLicense` → wire.
6. **Finance "Gửi báo cáo"** → `POST /api/reports/hospital/{reportCode}/send-email` + `IEmailService.SendReportAsync` (MockMode log — verified 368 bytes) + FE modal email. Bỏ disable.
7. **EmergencyDisaster "Code Blue"** → `POST /api/mci/activate-code-blue` tạo `MCIEvent` thật (AlertLevel Red, người KH từ JWT) + **migration 77** (3 bảng MCIEvents/MCIVictims/MCISituationReports) + FE gọi thật (smoke OK: tạo `CODEBLUE...` status Active).
8. **BHXH "Xuất XML hàng loạt"** → `POST /api/bhxh-audit/sessions/export-batch-xml` (ZipArchive nhiều `{SessionCode}.xml`) + FE `exportBatchXml` → tải zip. (400 khi list rỗng ✓)

> Lưu ý nhỏ còn lại: rehab/CCHN print trả 500 (message rõ "Không tìm thấy...") khi id bogus — chạy đúng với id thật từ UI; có thể đổi thành 404 nếu cần (polish). Finance gửi report hiện đính kèm JSON (chưa export PDF/Excel chuẩn) — đủ MVP MockMode, SMTP thật cấu hình qua env khi deploy.

### Build-gate (tập trung)
- BE `dotnet build HIS.sln` **0 errors** · FE `npm run build` **EXIT 0** sau cả 3 wave · migration 75/76 applied local (ApprovedBy + 2 bảng survey).
- **CHƯA chạy** Prompt 12 regression toàn hệ (Cypress/Playwright/API) · **CHƯA git commit/push**.
