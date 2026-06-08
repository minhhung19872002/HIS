# Audit các LUỒNG PHỤ (ngoài 4 luồng lõi) + prompt FLOW-5 · 2026-06-06

> Sau khi 4 luồng lõi (OPD/Nội trú/CLS/Dược-Viện phí) đã sửa xong, khảo sát 8 luồng phụ. Phát hiện vài luồng còn đứt mạch — đáng kể nhất là PTTT vật tư→viện phí (thất thu) và cấp cứu (UI mock).

## Bảng trạng thái 8 luồng phụ
| Luồng | TT | Gãy ở đâu | Quan trọng |
|---|---|---|---|
| Phẫu thuật/PTTT | ⚠️ | Spine ổn (lịch→duyệt→thực hiện→tường trình→tiền mê→consent). **Gãy:** chỉ định DV (6.4), thuốc/vật tư phòng mổ (6.5), đặt máu PTTT (6.6) đều STUB `Task.FromResult` không ghi DB → **không vào viện phí**. `SurgeryPrescriptionServiceImpl.cs:31-220`, `SurgeryOperationServiceImpl.cs:996-1162` | **Cao** |
| Cấp cứu (thường) | ❌ | UI triage/xử trí v2 chạy **mock seed** `EmergencyDisaster.tsx:126,249` (`buildEmergencySeed`), không persist BE. (MCI/thảm họa thì dùng `/api/mci` thật; ObservationStay riêng thì ổn) | **Cao** |
| Khám sức khỏe | ⚠️ | CreateRecord + IssueCertificate thật; **thiếu** đa-trạm (per-station), KQ gộp `ResultSummary` | TB |
| Ngân hàng máu | ✅ | Nhập→yêu cầu→duyệt→xuất→crossmatch→truyền→hoàn tất→phản ứng đều persist | — |
| Chuyển tuyến/liên viện | ⚠️ | Create→Respond thật nhưng là **log nội bộ** (facility free-text, không integration cơ sở nhận); chưa phải giấy chuyển tuyến BV-21 | TB |
| BHYT giám định→cổng | ⚠️ | XML 1-15 + submit cổng thật; **gãy:** đối soát (`ImportReconciliationResultAsync:1647`, `CalculateReconciliationDifference:1709`) STUB hardcoded | **Cao** (tiền) |
| Tiêm chủng | ✅ gần ổn | Tiêm + phản ứng + lịch thật; **phụ:** Campaign là FE stub (`immunization.ts:238/248`) | TB |
| Lưu trữ HSBA | ✅ | Đóng→lưu trữ→mượn→duyệt→trả đều persist | — |

## PROMPT FLOW-5 (paste cho Claude Code)
```
Đọc .claude/SKILL-MAP.md (his-be-module-scaffold, his-db-migration, his-qa-anti-pattern) + docs/workspace-docs/10-assessment/audit-luong-phu-FLOW5-2026-06-06.md. Đối chiếu TaiLieuDoiThu (MQ_-_Nội_trú_-_Bác_sĩ.txt phần PTTT, MQ_-_Tiếp_đón.txt). Sửa các luồng phụ còn đứt mạch, theo thứ tự ưu tiên. Persist THẬT, nối viện phí, KHÔNG bịa field, KHÔNG commit/push.

=== P1 — PTTT: vật tư/thuốc/dịch vụ phòng mổ → viện phí (thất thu thật) ===
1. SurgeryPrescriptionServiceImpl.cs:31-220 (thuốc + vật tư phòng mổ, đặt máu 6.5/6.6): thay Task.FromResult stub bằng persist thật. Dùng bảng có sẵn (grep SurgeryMedicine/SurgerySupply/cabinet-issue) hoặc ghi vào ServiceRequest/Prescription gắn SurgeryId; trừ kho như phiếu lĩnh; nối vào BillingComplete để vào bảng kê PTTT. Phân đối tượng (hao phí/thu phí/BHYT) như phiếu xuất phòng mổ đã làm ở nội trú.
2. SurgeryOperationServiceImpl.cs:996-1162 (chỉ định DV 6.4): SearchServices/OrderService/GetServiceOrders nối Services + ServiceRequest thật (hiện hardcoded "Viêm ruột thừa cấp"). Bỏ hardcode.
3. Lưu ý: StartSurgeryAsync/CompleteSurgeryAsync (SurgeryOperationServiceImpl.cs:61-73) đang nuốt lỗi "missing table/column" im lặng — rà lại, đừng nuốt lỗi schema (để lộ lỗi thật khi build).

=== P2 — Cấp cứu thường: bỏ mock, persist thật ===
4. EmergencyDisaster.tsx (line 126,249 buildEmergencySeed): màn tiếp nhận→phân loại (triage)→xử trí cấp cứu phải đọc/ghi BE thật. Tái dùng ReceptionComplete (tiếp nhận) + ObservationStay (phòng lưu) đang có; nếu thiếu endpoint triage/disposition thì bổ sung controller + persist. Phân biệt rõ phần MCI/thảm họa (đã dùng /api/mci thật) với cấp cứu thường.

=== P3 — BHYT đối soát ===
5. InsuranceXmlService.cs:1647,1709 (ImportReconciliationResult/CalculateReconciliationDifference): thay DTO hardcoded bằng import file KQ giám định cổng + đối chiếu với hồ sơ nội bộ (tính chênh lệch thật).

=== P4 (tùy chọn — phụ) ===
6. Tiêm chủng campaign (immunization.ts:238/248): implement BE hoặc ẩn UI. Khám sức khỏe đa-trạm + liên viện BV-21: chỉ làm nếu nghiệp vụ cần (ghi roadmap nếu hoãn).

BUILD-GATE: dotnet build 0 error + npm run build EXIT 0 + migration idempotent nếu thêm bảng. Chạy Prompt 12 regression. Báo cáo từng mục. KHÔNG git commit/push trừ khi tôi nói "push".
```

## Đã mạch lạc, KHÔNG cần đụng
Ngân hàng máu, Lưu trữ HSBA, ObservationStay (phòng lưu), spine PTTT (lịch→duyệt→thực hiện→tường trình→tiền mê→consent), tiêm chủng core, 4 luồng lõi (OPD/Nội trú/CLS/Dược-Viện phí).
