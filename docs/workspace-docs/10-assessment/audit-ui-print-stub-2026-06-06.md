# Rà soát toàn ứng dụng: row-detail · in/biểu mẫu · nút giả (stub) · 2026-06-06

> Phương pháp: 3 agent QA quét `frontend/src/pages-v2` + `pages` + `components` + `backend Controllers` bằng Grep/Read. Mọi kết luận có file:dòng.
> Bối cảnh: bộ UI v2 mở detail bằng **1 click** vào dòng (`DataTable onRowClick` / `SimpleV2Page drawer`), KHÔNG phải double-click.

## Tóm tắt
- **Row-detail**: 114/126 trang đã mở detail khi bấm dòng. Chỉ **2 trang hỏng thật** + 2 trang lệch chuẩn (detail chỉ qua nút).
- **In/biểu mẫu**: phần lớn template tồn tại; backend print đều thật. Nhưng **điểm in biểu mẫu HSBA của EMR v2 là nút giả**, thiếu 2 template (`partograph`, `drug-reaction`), và nhiều nút "In … → Đã gửi máy in" là toast giả ở các trang lâm sàng.
- **Nút giả/chưa wire**: tập trung ở **HR, Reports, Dashboard, BloodBank, EmergencyDisaster** + nhóm "Xuất Excel" giả rải rác.

---

## A. Trang bấm dòng KHÔNG mở detail
| Trang | Trạng thái | Ghi chú |
|---|---|---|
| `pages-v2/OfficialDocuments.tsx` | ❌ HỎNG | Không có Xem/Sửa; có `attachmentPath` không mở được. Chỉ có Thêm/Xóa. |
| `pages-v2/HrDecisions.tsx` | ❌ HỎNG | Modal "Sửa QĐ" + state `editing` có sẵn nhưng `setEditing` không bao giờ gọi → không xem/sửa được; `content` bị ẩn. |
| `pages-v2/PayrollAdmin.tsx` | ⚠️ lệch chuẩn | Detail mở qua nút `eye`, không bấm dòng. |
| `pages-v2/VppStockCard.tsx` | ⚠️ lệch chuẩn | Thẻ kho mở qua nút `book`, không bấm dòng. |

Các trang ⏭️ N/A (báo cáo/dashboard/editor — không cần detail-dòng): PaymentReports, WorkloadReport, StockReport, QualityDashboardLive, ServiceRequeue, PharmacyStockTake, EmrEditor, BillingEditor.

## B. In ấn / biểu mẫu
**Nút in giả (toast `tk`/`message` thay cho in thật):**
- 🔴 `pages-v2/EmrEditor.tsx:631-634` — drawer **"In biểu mẫu HSBA"** (6 mẫu: MS-01 TTBA ra viện, MS-02 BA tổng quát, MS-03 phiếu điều trị, MS-04 chăm sóc, DD-01 công khai DV-thuốc, BHYT-01). Đây là điểm in HSBA chính của EMR v2 — template ĐÃ CÓ, chỉ thiếu nối `PrintTemplateRenderer`.
- `pages-v2/EMR.tsx:242`, `Consultation.tsx:173/201`, `Dashboard.tsx:313/998`, `EmergencyDisaster.tsx:613/736`, `Insurance.tsx:172`, `OPD.tsx:121`, `Prescription.tsx:97/150`, `Pharmacy.tsx:257` (in nhãn), `BillingEditor.tsx:333`, `EnvironmentalHealth/FoodSafety/HealthCheckup/HealthEducation/InfectionControl/InterHospitalSharing/Nutrition/TreatmentProtocol`, `pages/Screening.tsx:249` ("đang phát triển").

**Biểu mẫu thiếu template render (in ra trống):**
- 🔴 `partograph` (Biểu đồ chuyển dạ — sản khoa, pháp lý) — `PrintTemplateRenderer.tsx` không có case → null.
- 🔴 `drug-reaction` (Thử phản ứng thuốc) — không có case → null.
- Dead code: `components/SpecialtyMedicalRecordPrintTemplates/*` không được import ở đâu.

**Đủ (không cần sửa):** ~110 printType khác trong `PrintTemplateRenderer` đều có component; `pages/EMR.tsx` (v1) nối renderer thật; backend print (PdfController, MultiSpecialtyExam printBill, SpecialtyEmr pdf/xml, InpatientDispensing, Pharmacy stock…) đều trả blob thật; nhiều nút in thật ở Billing v2, Laboratory, Radiology, Reception, Pharmacy stock, DischargeModal, BedLabResult, Surgery modals…

## C. Nút giả / chưa wire (ngoài in)
| Trang:dòng | Hành động | Loại |
|---|---|---|
| `HR.tsx:284/289` | Duyệt/Từ chối đổi ca | chưa wire (local state) |
| `HR.tsx:366/370/374` | Sao chép lịch tuần / Xuất Excel / Chốt lịch trực | stub toast |
| `HR.tsx:524/528` | Mở hồ sơ NS / Sửa lịch | stub toast |
| `Reports.tsx:411/415/419` | Tạo / Chạy / Tải PDF báo cáo | stub toast |
| `Reports.tsx:612/620/624` | Cấu hình BC / Excel / Gửi email | stub toast |
| `Dashboard.tsx:302/306/315/323` | Đặt giường / Mở hồ sơ / Hoàn tất ca / Tạo PO (random) | giả |
| `BloodBank.tsx:488/489` | Cấp phát / Tiêu huỷ túi máu | chưa wire |
| `EmergencyDisaster.tsx:399/447` | Tiếp nhận ca (demo) / Kích hoạt Code Blue | giả/placeholder |
| `Equipment.tsx:122` | Xem chi tiết thiết bị | stub toast |
| `FollowUp.tsx:211/251/193` | Gọi BN / Xuất Excel | stub toast |
| `Consultation/Insurance/Telemedicine` | "Xuất Excel" | giả (không download) |
| `Radiology.tsx:840` | Mở DICOM Viewer | TODO placeholder |

---

## PROMPT SỬA cho Claude Code (xếp ưu tiên — paste từng đợt)

### Prompt UI-1 (P1 — lâm sàng/pháp lý: in biểu mẫu thật)
```
Đọc .claude/SKILL-MAP.md (his-fe-emr-print-form, his-fe-page-v2) + docs/workspace-docs/10-assessment/audit-ui-print-stub-2026-06-06.md.
1) EmrEditor.tsx (pages-v2) drawer "In biểu mẫu HSBA" (dòng ~631): thay 6 onClick toast tk(...) bằng nối thật tới PrintTemplateRenderer (template MS-01..04/DD-01/BHYT-01 đã có) — mở print preview + window.print() như pages/EMR.tsx:1832 đang làm.
2) Thêm 2 template còn thiếu vào PrintTemplateRenderer.tsx: case 'partograph' (Biểu đồ chuyển dạ) + case 'drug-reaction' (Thử phản ứng thuốc) — tạo component in tương ứng (tham khảo các component EMRPrintTemplates hiện có), lấy dữ liệu từ ClinicalRecordController partograph / drug-reaction.
3) Nối nút in thật ở trang lâm sàng v2 (đang toast giả): Prescription.tsx:97/150 (in đơn → print-external/print blob), OPD.tsx:121 (in phiếu khám → printExaminationForm), Insurance.tsx:172 (phiếu BHYT), Consultation.tsx:173/201 (biên bản hội chẩn → ConsultationRegister print). Dùng pattern blob + window.open như Laboratory printLabResultBlob.
Verify: npm run build EXIT 0. KHÔNG commit/push.
```

### Prompt UI-2 (P1 — hành động nghiệp vụ chưa wire)
```
Đọc .claude/SKILL-MAP.md. Gap C trong audit-ui-print-stub-2026-06-06.md. Nối API thật (bỏ toast giả), validate + loading + message.error khi lỗi:
1) BloodBank.tsx:488/489 — Cấp phát / Tiêu huỷ túi máu: nối BloodBankCompleteController (grep dispense/discard). Đây là thao tác kho máu cốt lõi.
2) Radiology.tsx:840 — "Mở DICOM Viewer (TODO)": mở viewer thật (route DicomViewer / CornerstoneViewer) theo studyId.
3) Equipment.tsx:122 — Xem chi tiết thiết bị: mở drawer/modal detail thật.
4) HR.tsx — duyệt/từ chối đổi ca (284/289), chốt lịch trực (374), mở hồ sơ NS (524): nối API HR thật (EmployeeProfile/roster/swap). Nếu backend chưa có endpoint swap-approve thì bổ sung (đăng ký DI) — backend không build được ở môi trường khác thì ghi rõ.
Verify: npm run build EXIT 0 (+ dotnet build nếu đụng BE). KHÔNG commit/push.
```

### Prompt UI-3 (P2 — row-detail + Xuất Excel thật + báo cáo/dashboard)
```
Đọc .claude/SKILL-MAP.md (his-fe-page-v2). Gap A + Reports/Dashboard trong audit:
1) OfficialDocuments.tsx: thêm onRowClick mở drawer Xem/Sửa công văn + nút mở attachmentPath; HrDecisions.tsx: nối onRowClick → setEditing(r)+mở modal sửa (modal đã có sẵn). Đồng bộ UX: PayrollAdmin.tsx + VppStockCard.tsx thêm onRowClick trỏ tới hàm nút eye/book đang gọi.
2) Các nút "Xuất Excel" giả (Consultation:152, FollowUp:193, Insurance:154, Telemedicine:179): dùng downloadCsv có sẵn (Reports.tsx:400) để tải file thật thay vì toast "Đã xuất N dòng".
3) Reports.tsx (411/415/419/612/620/624): nối Tạo/Chạy/Tải/Gửi báo cáo tới ReportingController thật; Dashboard.tsx callback (302/306/315/323): nối API thật hoặc ẩn nút nếu chưa có nghiệp vụ (đừng để tạo PO bằng random).
Verify: npm run build EXIT 0. KHÔNG commit/push.
```

### Prompt UI-4 (P3 — dọn dẹp + báo cáo public-health)
```
Đọc .claude/SKILL-MAP.md. Việc nhỏ:
1) Dọn dead code components/SpecialtyMedicalRecordPrintTemplates/* (nối vào renderer hoặc xóa).
2) Nút in/xuất ở nhóm public-health (FoodSafety, InfectionControl, HealthEducation, HealthCheckup, EnvironmentalHealth, InterHospitalSharing, Nutrition, TreatmentProtocol, Screening): nối in/CSV thật hoặc ẩn nếu chưa có dữ liệu.
3) FollowUp "Gọi BN", EmergencyDisaster Code Blue/intake demo: nối thật hoặc đánh dấu rõ là mô phỏng.
Verify: npm run build EXIT 0. KHÔNG commit/push.
```

> Sau mỗi prompt: chạy lại Prompt 12 (test toàn bộ) trong prompts-doithu-gap.md để regression.

---

### ⭐ PROMPT UI-ALL (gộp toàn bộ UI-1→UI-4 + test) — paste 1 lần
```
Đọc .claude/SKILL-MAP.md (his-fe-emr-print-form, his-fe-page-v2, his-fe-api-client, his-be-module-scaffold) + docs/workspace-docs/10-assessment/audit-ui-print-stub-2026-06-06.md. Sửa TẤT CẢ gap UI/in/nút-giả theo thứ tự ưu tiên. Mọi sửa: nối API/in THẬT (bỏ toast giả), validate + loading + message.error khi lỗi, tái dùng pattern có sẵn, KHÔNG bịa endpoint/field (Read/Grep verify). KHÔNG git commit/push.

=== ĐỢT 1 — Lâm sàng / pháp lý (làm trước) ===
1. EmrEditor.tsx (pages-v2) drawer "In biểu mẫu HSBA" (~dòng 631): thay 6 onClick toast tk(...) bằng nối thật tới PrintTemplateRenderer (MS-01..04/DD-01/BHYT-01 đã có), mở preview + window.print() như pages/EMR.tsx:1832.
2. PrintTemplateRenderer.tsx: thêm case 'partograph' (biểu đồ chuyển dạ) + case 'drug-reaction' (thử phản ứng thuốc) — tạo component in, lấy data từ ClinicalRecordController partograph/drug-reaction.
3. Nối in thật (đang toast giả): Prescription.tsx:97/150 (print-external/blob), OPD.tsx:121 (printExaminationForm), Insurance.tsx:172 (phiếu BHYT), Consultation.tsx:173/201 (ConsultationRegister print). Pattern blob+window.open như Laboratory printLabResultBlob.

=== ĐỢT 2 — Hành động nghiệp vụ chưa wire ===
4. BloodBank.tsx:488/489 — Cấp phát / Tiêu huỷ túi máu → BloodBankCompleteController (grep dispense/discard).
5. Radiology.tsx:840 — mở DICOM Viewer thật theo studyId (bỏ TODO).
6. Equipment.tsx:122 — drawer/modal chi tiết thiết bị thật.
7. HR.tsx — duyệt/từ chối đổi ca (284/289), chốt lịch trực (374), mở hồ sơ NS (524): nối API HR thật; thiếu endpoint swap-approve thì bổ sung BE + đăng ký DI.

=== ĐỢT 3 — Row-detail + Excel + báo cáo/dashboard ===
8. OfficialDocuments.tsx: onRowClick mở drawer Xem/Sửa + mở attachmentPath. HrDecisions.tsx: onRowClick → setEditing(r)+mở modal sửa (đã có). PayrollAdmin.tsx + VppStockCard.tsx: thêm onRowClick trỏ hàm nút eye/book.
9. Nút "Xuất Excel" giả (Consultation:152, FollowUp:193, Insurance:154, Telemedicine:179): dùng downloadCsv (Reports.tsx:400) tải file thật.
10. Reports.tsx (411/415/419/612/620/624) → ReportingController thật; Dashboard.tsx callback (302/306/315/323) → API thật hoặc ẩn nút (KHÔNG tạo PO bằng random).

=== ĐỢT 4 — Dọn dẹp ===
11. Dead code components/SpecialtyMedicalRecordPrintTemplates/* (nối renderer hoặc xóa).
12. Nút in/xuất nhóm public-health (FoodSafety/InfectionControl/HealthEducation/HealthCheckup/EnvironmentalHealth/InterHospitalSharing/Nutrition/TreatmentProtocol/Screening): nối in/CSV thật hoặc ẩn.
13. FollowUp "Gọi BN", EmergencyDisaster Code Blue/intake demo: nối thật hoặc ghi rõ là mô phỏng.

=== TEST CUỐI (bắt buộc) ===
Sau khi xong: cd frontend && npm run build (EXIT 0); cd backend && dotnet build HIS.sln (0 error nếu có đụng BE); rồi chạy Prompt 12 (regression toàn bộ trong prompts-doithu-gap.md): Cypress console-errors + Playwright full + API test + luồng lõi. Lỗi thì fix tới khi sạch. Báo cáo từng đợt: file đã sửa + nối API nào + kết quả test. KHÔNG commit/push trừ khi tôi nói "push".
```
