# Fix: bấm dòng mở chi tiết — bảng tự dựng còn sót · 2026-06-06

> Đợt audit trước chỉ soi `DataTable onRowClick` / `SimpleV2Page drawer` (đều OK). Còn **bảng TỰ DỰNG** (`<table>` + `<tr>` không onClick) bị sót. Rà lại 32 file có `<table` trong pages-v2: đa số là sub-table trong drawer/editor/report. **2 trang main-list bị lỗi bấm-dòng:** EmergencyDisaster, InspectorPortal (cả 2 đã có Drawer/Modal detail + hàm mở sẵn, chỉ thiếu wire onClick lên `<tr>`).

## Trang ❌ (v2)
| Trang | `<tr>` | Hàm mở detail có sẵn | Fix |
|---|---|---|---|
| `pages-v2/EmergencyDisaster.tsx` (~L568) | `<tr key={row.code}>` không onClick; chỉ nút 👁 (L570) `openCase(row)` → `<Drawer>` state `selectedCase` | `openCase(row)` | Thêm `onClick={() => openCase(row)}` + `style={{cursor:'pointer'}}` vào `<tr>`; thêm `e.stopPropagation()` vào nút con |
| `pages-v2/InspectorPortal.tsx` (L315) | `<tr key={r.medicalRecordId}>` không onClick; nút "Xem" (L333) `openDetail(r)` → modal `InspectorDetail` | `openDetail(r)` | Thêm `onClick={() => openDetail(r)}` + `cursor:pointer` vào `<tr>`; `e.stopPropagation()` vào nút "Xem"/"Tải XML" |

> Lưu ý: bản v1 `pages/` (legacy) của các trang tự dựng có thể dính cùng lỗi nhưng route chính là `/v2/*` → ưu tiên v2; v1 chỉ vá nếu route còn dùng.

---

## ⭐ PROMPT cho Claude Code (paste)
```
Đọc .claude/SKILL-MAP.md (his-fe-page-v2) + docs/workspace-docs/10-assessment/fix-rowclick-detail-2026-06-06.md. Lỗi UX: nhiều bảng TỰ DỰNG bấm vào dòng không mở chi tiết (chỉ nút 👁/"Xem" mới mở). Sửa để bấm cả dòng mở detail.

A) Sửa 2 trang đã xác nhận:
1. pages-v2/EmergencyDisaster.tsx: thêm onClick={() => openCase(row)} + style cursor:pointer vào <tr key={row.code}> (~L568). Thêm e.stopPropagation() vào các nút hành động trong dòng (👁 L570 và nút khác) để không double-trigger.
2. pages-v2/InspectorPortal.tsx: thêm onClick={() => openDetail(r)} + cursor:pointer vào <tr key={r.medicalRecordId}> (L315). Thêm e.stopPropagation() vào nút "Xem" và "Tải XML" (L333-334) để "Tải XML" không vô tình mở modal.

B) QUÉT HỆ THỐNG (đảm bảo không sót): rà mọi trang trong pages-v2 (và pages-v2/*/) render LIST CHÍNH bằng bảng tự dựng (<table> + map <tr>) hoặc div-list (.map(r => <div>)) MÀ có sẵn Drawer/Modal detail + hàm mở (setSelectedX/openX/openDetail) nhưng <tr>/<div-row> CHƯA có onClick. Với mỗi trang như vậy: thêm onClick lên dòng gọi đúng hàm mở detail đã có + cursor:pointer + e.stopPropagation() trên các nút con. KHÔNG đụng sub-table trong drawer/editor/report (nơi không có khái niệm detail-từng-dòng), KHÔNG đổi DataTable/SimpleV2Page (đã có onRowClick/drawer).
   Loại trừ rõ: bảng nhập-liệu inline (editor, kiểm kê), worklist checkbox xuất hàng loạt, bảng báo cáo/dashboard.

C) (Tùy chọn, ưu tiên thấp) Nếu route v1 nào còn dùng và bản pages/<Trang>.tsx tự dựng cũng thiếu row-click + có detail → áp cùng fix.

Verify: cd frontend && npm run build EXIT 0. Sau đó chạy Prompt 12 (regression). Báo cáo: danh sách trang đã thêm row-click + hàm mở tương ứng. KHÔNG git commit/push trừ khi tôi nói "push".
```
