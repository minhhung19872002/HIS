# Audit #48 — Persistence/correctness các service "advanced" (static)

> Phương pháp: **static stub-audit** (đọc code + bằng chứng), KHÔNG runtime test (DB local off →
> phần happy/edge PowerShell API theo `his-test-api-powershell` defer khi có env chạy).
> Theo `core-verify-before-assert` + `audit-protocol.md` (no-overstate). Ngày: 2026-06-16.

## Kết luận
Nghi-ngờ "service vỏ/stub" trong issue (dựa trạng thái trước #47) **đã lỗi thời** sau wave campaign:
**5/6 service persist THẬT** (EF `_context` query + `SaveChangesAsync` + Add/Update + aggregate thật).
Còn lại **1 stub ẩn xác nhận** + 1 smell graceful-degrade.

## Bằng chứng per service
| Service | Dòng | SaveChanges | DbAdd/Update | Kết luận |
|---|---|---|---|---|
| ProvincialHealthService | 308 | 2 | 2 | Persist thật **NHƯNG có 2 method stub** (xem dưới) |
| PublicHealthService | 1429 | 22 | 10 | ✅ Persist thật |
| CommunityHealthService | 651 | 8 | 3 | ✅ Persist thật (newList = catch-fallback) |
| AssetManagementService | 1473 | 15 | 8 | ✅ Persist thật |
| EnvironmentalHealthService | 275 | 3 | 2 | ✅ Persist thật (newList = catch-fallback) |
| ForensicService | 360 | 4 | 2 | ✅ Persist thật (`GetStatsAsync` query `ForensicCases` thật) |

## Lỗi ẩn (cần fix — đề xuất tạo bug)
1. **`ProvincialHealthService.GetInfectiousDiseaseReportsAsync` (L156-161) = STUB** — comment rõ
   *"Placeholder: bảng InfectiousDiseaseReports chưa có migration — trả rỗng an toàn"*, luôn `return new List<>()`.
2. **`ProvincialHealthService.SubmitInfectiousReportAsync` (L163+) = STUB** — trả `{ success = true }` giả,
   KHÔNG persist. → Báo cáo bệnh truyền nhiễm (yêu cầu BYT) chưa có thật: cần bảng + migration + impl.
   *(Khớp ghi chú STATUS: "ProvincialReports/GetStats vẫn in-memory" — defer ở #47.)*

## Smell (không chặn, nên cải thiện)
- Catch-block `return new List<>()` ở `EnvironmentalHealthService` (L68,161), `ForensicService` (L68,199),
  `CommunityHealthService` (L77,227,292,513): nuốt exception → trả rỗng, **ẩn lỗi thật thành "không có dữ liệu"**.
  Đề xuất: log đã có (`_logger.LogWarning`) nhưng nên cân nhắc surface lỗi cho caller ở path quan trọng.

## Sweep rộng toàn Services (stub markers) — phát hiện thêm
> Phần lớn "in-memory" là **pattern hợp lệ** (materialize `ToListAsync` rồi map/group in-memory tránh EF-translation) — KHÔNG phải stub. Gap thật:

| # | Vị trí | Loại | Mức |
|---|---|---|---|
| 1 | `ProvincialHealthService.GetInfectiousDiseaseReportsAsync`/`SubmitInfectiousReportAsync` | Stub (chưa bảng/migration, trả rỗng + success giả) | **Cao** (báo cáo BTN — yêu cầu BYT) |
| 2 | `ProcurementService.ApproveRequestAsync` L229 (#108 wave4) | **Gap ủy quyền**: `// TODO: kiểm tra role duyệt` — service không check role; cần verify controller `[Authorize(Roles)]` | **Cao** (duyệt mua sắm = tiền/quyền) |
| 3 | `HospitalReportService` L1282 | Placeholder (cần bảng kế toán chuyên biệt) | TB (chức năng) |
| 4 | `DataManagementService` L52 `DatabaseSizeMB = 512.5m` | Hardcode placeholder | Thấp (cosmetic) |
| 5 | `NationalPrescriptionService.TestConnectionAsync` L185 | Mock luôn `connected=true` | Thấp (có thể chủ ý MockMode) |

> LIS Execute TODO (L240/262/279 "real driver when analyzer available") = **chủ ý**, phụ thuộc phần cứng (#22 blocked) — KHÔNG phải bug.

## DoD #48
- [x] Chọn module rủi ro cao (6 service advanced)
- [x] Audit static happy-path (persistence) — bằng chứng ở bảng trên
- [ ] Runtime happy+edge PowerShell API — **defer** (cần backend+DB chạy)
- [ ] Tạo bug cho stub ProvincialHealth infectious-report — **đề xuất, chờ user duyệt tạo issue**
