# PROMPT CUỐI — gộp toàn bộ việc còn lại (chạy 1 lần) · 2026-06-06

> Sau khi chạy prompt này thì coi như đã đóng hết các hạng mục audit (gap đối thủ, nút giả, row-click, luồng nghiệp vụ). Tham chiếu: `audit-luong-nghiepvu-2026-06-06.md`, `audit-stub-buttons-full-2026-06-06.md`, `audit-ui-print-stub-2026-06-06.md`.

## ⭐ PROMPT (paste cho Claude Code)
```
Đọc .claude/SKILL-MAP.md (his-be-module-scaffold, his-qa-anti-pattern, his-tech-debt-workflow, his-fe-page-v2, his-fe-emr-print-form) + 3 file audit trong docs/workspace-docs/10-assessment/ (audit-luong-nghiepvu, audit-stub-buttons-full, audit-ui-print-stub). Hoàn tất TẤT CẢ phần còn lại, làm theo thứ tự A→E. Nguyên tắc: ServiceRequest/ServiceRequestDetail (model 1) là nguồn-sự-thật CLS; nối API/persist THẬT (bỏ toast giả); KHÔNG bịa endpoint/field (Grep verify); KHÔNG git commit/push.

=== A. FLOW-4: data-consistency + dọn stub nội trú ===
A1 (#14b) Grep toàn backend các nơi còn ĐỌC LabResults/LabRequest/LabRequestItem (model 2) hoặc LabOrders/LabOrderItems (model 3) để hiển thị/báo cáo/thống kê/in KQ XN → chuyển sang đọc ServiceRequestDetails (RequestType=1). Mục tiêu: không báo cáo/màn nào trống vì đọc bảng chết. Liệt kê file đã đổi.
A2 (#16) Các hàm nội trú còn stub (Task.FromResult không lưu DB): nutrition/dinh dưỡng, hội chẩn, truyền dịch, truyền máu, ADR, shared-bed, ward-color, service group template. Với mỗi cái: nếu có entity/bảng → persist thật (Add+SaveChanges+đọc lại); nếu chưa có → ẨN nút/tab ở FE + đánh dấu TODO (đừng để nút bấm xong mất dữ liệu). CheckTransferWarningsAsync (PatientMgmt.cs:941): implement thật như CheckPreDischarge (đếm đơn chưa cấp/KQ pending/nợ). Liệt kê cái nào persist, cái nào ẩn.
A3 (#15) Inpatient.tsx Admit modal: khi chọn BN từ worklist getPendingAdmissions, auto-điền các field còn lại (ngày sinh, chẩn đoán vào viện, đối tượng BHYT/thu phí, khoa) từ PendingAdmissionDto/phiên khám; bổ sung field vào DTO nếu thiếu.
A4 (#14e) CHỈ xác nhận (grep) sau A1 không còn code đọc/ghi model 2/3 trong luồng thật; báo cáo reference còn lại. GIỮ NGUYÊN bảng — KHÔNG DROP (chờ duyệt riêng).

=== B. Dọn nốt nút in/stub còn sót (nếu còn) ===
Grep lại toàn pages-v2 + pages tìm handler chỉ toast (onClick={() => message.success/info/tk/ti(...)}) không gọi API/window.open(blob)/navigate, đặc biệt các nút IN còn giả: OPD.tsx:121, EMR.tsx:242/290, Pharmacy.tsx:257 (in nhãn), và bất kỳ "Đã gửi máy in"/"Đã in"/"Đã xuất" nào còn lại. Với mỗi cái: nối in/CSV THẬT (blob+window.open như Laboratory printLabResultBlob, hoặc downloadCsv) hoặc ẩn nếu không có nghiệp vụ. HR.tsx:400/608 (sao chép lịch tuần / tooltip): nối API copy lịch hoặc ẩn.

=== C. Kiểm in biểu mẫu HSBA + template ===
Xác nhận drawer "In biểu mẫu HSBA" (EmrEditor.tsx) + case partograph/drug-reaction trong PrintTemplateRenderer render thật (nếu phiên trước đã làm thì bỏ qua). Dọn dead code components/SpecialtyMedicalRecordPrintTemplates/* (nối renderer hoặc xóa).

=== D. BUILD-GATE (bắt buộc) ===
cd frontend && npm run build (EXIT 0); cd backend && dotnet build HIS.sln (0 error). Migration idempotent + đăng ký DI nếu thêm. Khởi động BE kiểm schema-drift = 0.

=== E. REGRESSION TOÀN BỘ (Prompt 12) ===
npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome (0 console error) + npx playwright test (toàn suite, 0 fail) + chạy test-*.ps1 (API suite) + luồng lõi login→tiếp đón→khám→CLS→KQ về màn khám→kê đơn→phát thuốc trừ kho→nội trú (nhập viện từ worklist→y lệnh→CLS giường→sinh hiệu→ra viện)→viện phí gom đủ nợ. Lỗi thì fix tới khi sạch.

Báo cáo cuối: từng mục A/B/C đã làm gì (file:dòng), kết quả build + regression. KHÔNG git commit/push trừ khi tôi nói "push".
```

## Sau prompt này
Coi như đóng toàn bộ backlog audit. Việc duy nhất còn treo chờ bạn quyết riêng: **xóa bảng model 2/3** (#14e — destructive, chỉ làm khi bạn đồng ý).
