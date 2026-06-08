# FLOW-4 — Việc làm tiếp sau FLOW-1/2/3 · 2026-06-06

> FLOW-1 P0 (6/6) đã verify đúng tận code. FLOW-2/3 phần lớn xong. Phần còn lại Claude Code tự defer "chờ quyết". Prompt dưới đây cho làm tiếp, ưu tiên data-consistency + dọn stub.

## PROMPT FLOW-4 (paste cho Claude Code)
```
Đọc .claude/SKILL-MAP.md (his-be-module-scaffold, his-qa-anti-pattern, his-tech-debt-workflow) + docs/workspace-docs/10-assessment/audit-luong-nghiepvu-2026-06-06.md + flow4-remaining-prompt. Hoàn tất phần còn lại sau FLOW-1/2/3. Nguyên tắc: ServiceRequest/ServiceRequestDetail (model 1) là NGUỒN-SỰ-THẬT cho CLS; KHÔNG đọc/ghi model 2 (LabRequest/LabResults) và model 3 (LabOrder) trong luồng thật.

=== #14b — Trỏ MỌI reader báo cáo/list về model 1 (data-consistency, ưu tiên cao) ===
Grep toàn backend các nơi còn đọc LabResults/LabRequest/LabRequestItem (model 2) hoặc LabOrders/LabOrderItems (model 3) để hiển thị/báo cáo KQ XN (vd báo cáo XN, thống kê, in sổ, worklist KTV, dashboard). Với mỗi nơi: chuyển sang đọc ServiceRequestDetails (RequestType=1) — cùng nguồn billing + màn khám. Liệt kê các file đã đổi. Mục tiêu: không còn báo cáo/màn nào hiển thị trống vì đọc bảng chết.

=== #16 — Stub nghiệp vụ nội trú: implement THẬT hoặc ẩn rõ ràng ===
Các hàm còn stub (Task.FromResult không lưu DB) trong InpatientCompleteService (nutrition/dinh dưỡng, hội chẩn, truyền dịch, truyền máu, ADR/phản ứng thuốc, CheckTransferWarnings, shared-bed, ward-color, service group template...). Với MỖI cái:
- Nếu có entity/bảng sẵn để lưu → persist thật (Add + SaveChanges) + đọc lại đúng.
- CheckTransferWarningsAsync (PatientMgmt.cs:941): implement thật như CheckPreDischarge (đếm đơn chưa cấp / KQ pending / nợ) thay vì luôn CanTransfer=true.
- Nếu chưa có nghiệp vụ/bảng và không kịp làm → ẨN nút/tab tương ứng ở FE (đừng để nút bấm xong mất dữ liệu trông như thật) + đánh dấu TODO rõ trong code. KHÔNG để stub im lặng.
Liệt kê: cái nào đã persist thật, cái nào tạm ẩn.

=== #15 — Prefill sâu form nhập viện ===
Khi chọn BN từ worklist "chờ nhập viện" (getPendingAdmissions) trong Inpatient.tsx Admit modal: auto-điền các field còn lại từ PendingAdmissionDto/phiên khám (ngày sinh, chẩn đoán vào viện, đối tượng BHYT/thu phí, khoa đề nghị). Bổ sung field vào PendingAdmissionDto nếu thiếu. Mục tiêu: chọn BN xong là gần như chỉ bấm Lưu.

=== #14e — KHÔNG gỡ bảng model 2/3 lúc này ===
Chỉ XÁC NHẬN (grep) rằng sau #14b không còn code nào đọc/ghi LabRequest/LabResults/LabOrder trong luồng thật (chỉ seed/migration cũ). Báo cáo danh sách reference còn lại. GIỮ NGUYÊN bảng (không DROP) — việc xóa bảng destructive sẽ chờ tôi duyệt riêng.

BUILD-GATE: dotnet build 0 error + npm run build EXIT 0 + migration idempotent nếu thêm bảng. Chạy Prompt 12 regression. Báo cáo từng mục #14b/#16/#15/#14e. KHÔNG git commit/push trừ khi tôi nói "push".
```

## Ghi chú cho người dùng
- #14e (xóa bảng model 2/3) là **destructive** — giữ bảng lại an toàn hơn, chỉ cần ngừng đọc/ghi. Đừng để Claude Code tự DROP.
- Sau FLOW-4, luồng CLS coi như sạch về 1 nguồn-sự-thật. Các stub bề rộng (#16) nếu chưa có nghiệp vụ thật thì ẩn đi là chấp nhận được — tránh "nút giả mất dữ liệu".
