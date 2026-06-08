# Audit G-37 — phiếu in DesktopEMR còn lại (7 XN phụ + 3 tờ gây mê)

> **Mục đích:** xác nhận 2 nhóm phiếu handoff 2026-06-05 còn treo ("⏳ 7 tên phiếu XN phụ + 3 tờ gây mê cần xác nhận tên/DTO").
> **Phương pháp (2026-06-06):** đọc registry `PrintTemplateRenderer.tsx` (92 printType) + entity gây mê + `ClinicalFormPrintTemplates.tsx`. **Không** cross-ref được danh sách 47 phiếu DesktopEMR gốc (extract PDF local-only, không có trên máy này) → audit theo **codebase thật**.

## 1. Tổng quan registry
- **92 printType** đã đăng ký trong `PrintTemplateRenderer.tsx` (đã vượt xa baseline "42" trong handoff cũ) — gồm: EMR core (~21), CĐHA/TDCN/XN/LS lâm sàng (~20), điều dưỡng `dd01–dd21` (21), bệnh án chuyên khoa `sp-*` (~30).

## 2. 🔴 Gây mê — 3 phiếu THIẾU print (xác nhận GAP thật)
| Phiếu | Data entity (đã có) | Nhập liệu FE (đã có) | Print component |
|---|---|---|---|
| Khám tiền mê | — | SurgeryFormModals | ✅ `preanesthetic` (PreAnestheticExamPrint) |
| **Phiếu theo dõi gây mê** | `AnesthesiaRecord`+`AnesthesiaMonitor` (Icd.cs, migration 52) | `SurgeryFormModals.tsx` (modal theo dõi gây mê) | ❌ **THIẾU** |
| **Phiếu hồi tỉnh** | `AnesthesiaRecord` (recovery fields) | SurgeryFormModals (modal tiền mê+hồi tỉnh) | ❌ **THIẾU** |
| **Biên bản gây mê** (thuốc/dịch) | `AnesthesiaDrug`+`AnesthesiaFluid` | SurgeryFormModals | ❌ **THIẾU** |

→ **Kết luận:** 3 phiếu gây mê có **đủ data + UI nhập** nhưng **chưa có print component** → gap thật, khớp "3 tờ gây mê còn lại".
→ **✅ ĐÃ THÊM phiên này (2026-06-08, build EXIT 0):** 3 print component (`GaymMonitorPrint`, `GaymRecoveryPrint`, `GaymRecordPrint`) trong `AnesthesiaPrintTemplates.tsx`; đăng ký `gayme-monitor`, `gayme-recovery`, `gayme-record` trong `PrintTemplateRenderer.tsx`. Nút "In phiếu" wired vào `AnesthesiaMonitorModal` (2 nút: In phiếu TD gây mê + In biên bản GM) và `PostAnesthesiaPlanModal` (nút In dùng `printAnesthesiaRecovery`, thay thế raw HTML cũ). **registry: 94 → 97 printType.** Smoke cần browser: mở `/v2/surgery` → modal theo dõi gây mê → "In phiếu TD gây mê".

## 3. 🟢 XN phụ — phủ bằng template generic (KHÔNG phải gap chặn)
- Print XN hiện có: `xn-general` (`GeneralLabReportPrint`) · `xn-hematology` · `xn-biochemistry` · `xn-microbiology`.
- Cả 4 nhận props `record?: Record<string, unknown>` (generic, không bind cứng) → **`xn-general` đóng vai fallback** cho mọi loại XN chưa có template riêng (miễn dịch, nước tiểu, đông máu, khí máu, giải phẫu bệnh, tế bào học, ký sinh trùng…).
- → **Kết luận:** "7 XN phụ" **được phủ chức năng** qua `GeneralLabReportPrint`. Template riêng từng loại = nice-to-have (định dạng đẹp hơn).
- → **✅ ĐÃ THÊM phiên này (2026-06-06, rẻ + build EXIT 0):** **XN-05 Đông máu** (`CoagulationReportPrint`: PT/INR/APTT/Fibrinogen/TT/D-dimer) + **XN-06 Nước tiểu** (`UrinalysisReportPrint`: 10 thông số que thử + cặn lắng) → đăng ký `xn-coagulation` + `xn-urinalysis` trong `PrintTemplateRenderer`. Presentational thuần (nhận `record` generic), KHÔNG đụng BE. **registry: 92 → 94 printType.**
- → **Còn ~5 XN phụ** (miễn dịch/giải phẫu bệnh/tế bào học/ký sinh trùng/khí máu) vẫn dùng generic `xn-general` — thêm template riêng khi có yêu cầu mẫu cụ thể.

## 4. Tổng kết G-37
| Nhóm | Trạng thái | Hành động |
|---|---|---|
| 3 tờ gây mê | ✅ đã thêm 3 print (gayme-monitor/recovery/record, build EXIT 0 2026-06-08) | Smoke: browser /v2/surgery → modal theo dõi gây mê |
| 7 XN phụ | 🟢 phủ bằng generic | ✅ thêm 2 (đông máu XN-05 + nước tiểu XN-06, build EXIT 0); ~5 còn lại dùng generic |

> **Verify gốc:** [`PrintTemplateRenderer.tsx`](../../../frontend/src/components/PrintTemplateRenderer.tsx) · [`Icd.cs`](../../../backend/src/HIS.Core/Entities/Icd.cs) (AnesthesiaRecord 328+) · [`ClinicalFormPrintTemplates.tsx`](../../../frontend/src/components/ClinicalFormPrintTemplates.tsx) (XN 263+).
> Cross-ref: `his-fe-emr-print-form` · handoff 2026-06-05 (G-37) · [[feedback_defer-logic-changing-refactor]] (lý do không add print mù).
