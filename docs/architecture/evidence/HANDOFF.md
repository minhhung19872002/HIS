# HANDOFF — Bộ test-task + Evidence viewer (phiên 2026-06-18) ✅ DATA HOÀN TẤT

> Đọc [README.md](README.md) (protocol nguồn-sự-thật) trước. File này = trạng thái bàn giao.

## Bối cảnh / quyết định đã chốt
- **Mục tiêu:** từ roadmap (`his-roadmap/` + `his-data-structure.js` = 5 lớp/38 phân hệ/485 bảng/12 luồng/9+ vai trò)
  → bộ **test-task thực chiến** + **trình xem evidence** HTML.
- **CHƯA chạy test / CHƯA chụp evidence** (lệnh user). Chỉ lập kế hoạch + công cụ. Thư mục module trống (`.gitkeep`).
- **DEDUP GitHub:** board đã có 74 test issue #216–289. Bộ task = bản chi tiết hóa **map vào issue cha**, KHÔNG tạo trùng.
  4 phân hệ chưa phủ → mục "đề xuất issue mới", chờ user duyệt, KHÔNG tự tạo.
- **Cross-machine:** protocol đặt trong repo `evidence/README.md` + pointer `CLAUDE.md` (mục test).

## KẾT QUẢ (đã ghi đầy đủ, verify sạch — CHƯA commit/push)
- **Dữ liệu test-plan** (`data/*.js`, harvest từ journal 2 workflow — KHÔNG mất khi session-limit):
  **38 phân hệ · 12 luồng E2E · 4 cross-cutting · 1415 test-task · 2868 evidence-slot · 4 candidate-issue**.
  Verify: 0 trùng ID · 0 sai category · 0 task thiếu evidence · 2867/2868 đúng convention tên.
- **Viewer:** `index.html` + `assets/viewer.{css,js}` (sidebar, tổng quan coverage, task gom theo loại, thumbnail→lightbox
  next/prev, status pass/fail localStorage, filter/search, dark/light). Tất cả `node --check` OK + assembly verify OK.
- `README.md` (protocol) · `gen-manifest.ps1` + `gen-manifest.mjs` (đã test, 0 ảnh) · `manifest.js` (rỗng).
- 38 thư mục `<layer>-<modid>/` + `flows/` + `cross/` (đều `.gitkeep`).
- Pointer repo `CLAUDE.md` (mục TEST) trỏ `evidence/README.md`. Memory (máy này): `feedback_qa-evidence-viewer-protocol.md`.

## CÁCH MỞ / DÙNG
- Mở trực tiếp `docs/architecture/evidence/index.html` bằng trình duyệt (file://). KHÔNG cần server.
- Khi tới phiên CHẠY test: chụp ảnh theo §2 README → bỏ vào `<layer>-<modid>/` → chạy `gen-manifest` → refresh viewer.

## CÒN LẠI
1. (Tùy chọn) Browser-smoke viewer xác nhận render (verify công cụ, KHÔNG phải test HIS).
2. **Commit + push** (viewer + data + README + generators + pointer CLAUDE.md) → mới cross-machine. **Chờ user duyệt** — KHÔNG tự push.
   Phạm vi: `docs/architecture/evidence/**` + `CLAUDE.md`.
3. 4 candidate-issue mới (Khảo sát hài lòng · Chuyên khoa IVF/Pháp y/YHCT · MCI · Đào tạo/NCKH) → user duyệt có tạo issue không.

## Tái sinh / sửa
- Workflow gốc: `d:\tmp\wf-his-testplan.js` (38 phân hệ) · `d:\tmp\wf-flows-cross.js` (luồng+cross) · harvest `d:\tmp\harvest.py`.
- Sửa nguồn roadmap → chạy lại workflow tương ứng; nếu writer lỗi (truncate/limit) → harvest từ journal như đã làm.
