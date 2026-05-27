---
name: his-fe-performance
description: Use this skill when optimizing HIS frontend performance — bundle size, code-splitting, render/re-render cost, lazy loading heavy vendors (Cornerstone3D, Ant Design, recharts), and large-table/list responsiveness. Triggers include "tối ưu hiệu năng FE", "giảm bundle / chunk > 500KB", "trang load chậm / lag khi nhiều dòng", fixing the Vite `chunkSizeWarningLimit` warnings, tuning `manualChunks` in `vite.config.ts`, or adding `React.lazy`/`useMemo`/virtualization. Adapts the open-source `vercel-labs/agent-skills` React rules to this project's Vite + React 19 + Antd v6 stack. Do NOT use for backend/load capacity (his-be-scalability), accessibility (core-accessibility-pattern), or building a new page (his-fe-page-v2).
metadata:
  type: project
---

# HIS Frontend Performance (Vite + React 19 + Antd v6)

Giảm bundle + chi phí render cho FE. Dự án có chunk rất nặng đã ghi nhận: `vendor-cornerstone`
~3MB (gzip 830KB), `vendor-antd` ~1.6MB, `vendor-charts` ~398KB → build luôn cảnh báo >500KB.
Skill này chuẩn hoá cách xử lý đúng thay vì để "accepted/deferred".

## Khi nào dùng
- Build cảnh báo chunk > 500KB; trang mở chậm; bảng/list lag khi nhiều dòng.
- Thêm thư viện nặng (viewer DICOM, chart, export Excel/PDF, QR) → phải code-split.
- Trang re-render thừa (typing ô search re-render cả bảng; props đổi liên tục).

## Khi nào KHÔNG dùng
- Chịu tải / nhiều user đồng thời / DB chậm → `his-be-scalability`.
- A11y/WCAG → `core-accessibility-pattern`. Tạo màn hình mới → `his-fe-page-v2`.

## Pattern chuẩn (theo tiền lệ repo)

1. **Route-level code-split** — mọi page nạp qua `React.lazy(() => import(...))` trong `App.tsx`
   (đã là tiền lệ: `const OPDV2 = lazy(...)`). Page mới PHẢI lazy, đừng import tĩnh ở đầu `App.tsx`.
2. **Dynamic import vendor nặng** — Cornerstone3D chỉ nạp khi mở viewer:
   `await import('@cornerstonejs/core')` (xem `components/CornerstoneViewer.tsx`, `MipMinIpViewer.tsx`).
   Áp cùng cách cho `xlsx`/export, `recharts`, `html5-qrcode` — import bên trong handler/effect, không top-level.
3. **`manualChunks` (vite.config.ts)** — tách vendor lớn thành chunk riêng (`vendor-cornerstone`,
   `vendor-antd`, `vendor-charts`, `vendor-qrcode` đã có). Thêm thư viện nặng mới → thêm 1 manualChunk
   để không phình chunk chung. `worker.format: 'es'` BẮT BUỘC giữ (cornerstone codec workers code-split).
4. **Tránh barrel import** — import trực tiếp icon/-component cần dùng, không `import * as Icons`.
   Antd: import component lẻ, không kéo cả `antd`.
5. **Chống re-render** — `useMemo`/`useCallback` cho cột bảng/columns + handler truyền xuống `DataTable`;
   tách ô search thành state cục bộ + `debounce` (đừng filter toàn bảng mỗi keystroke); `React.memo` cho
   row/cell nặng. KPI tính trong `useMemo`, không tính lại mỗi render.
6. **Bảng/list lớn** — phân trang client (`Pager` của `_v2kit`) hoặc server-side; cân nhắc virtualization
   khi > vài trăm dòng. Đừng render 2000 dòng 1 lần.

## Đo lường (không đoán)
- `cd frontend && npm run build` → đọc bảng chunk + dòng cảnh báo >500KB ở cuối.
- Cô lập regression: so kích thước `dist/assets/*` trước/sau. Chỉ tối ưu chunk thật sự lớn.
- React DevTools Profiler để xác minh re-render thừa trước khi memo hoá (đừng memo bừa).

## Pitfalls
- **`tsc -b` strict hơn `tsc --noEmit`** — luôn chạy `npm run build` (Vercel dùng `tsc -b`) trước khi báo xong.
- **Dynamic import sai `worker.format`** — đổi sang `iife` làm vỡ code-split cornerstone (đã dính, xem CLAUDE.md 2026-04-28).
- **Memo hoá bừa** — `useMemo` cho giá trị rẻ làm chậm hơn + khó đọc; chỉ memo khi Profiler chỉ ra điểm nóng (đúng `core-minimal-change`).
- **Lazy nhưng vẫn import tĩnh** ở chỗ khác → vendor vẫn vào chunk chung; grep import tĩnh còn sót.

## Reference
- Nguồn tri thức: `vercel-labs/agent-skills` (React best practices, 64 rule/8 nhóm — open-source).
  Lọc: các rule **Vite-applicable** (bundle-size, re-render, rendering, JS efficiency); BỎ rule Next.js
  (server caching/RSC/async-waterfall) vì dự án dùng Vite + Cloud Run, không phải Next.

## When to update
- Khi đổi bundler/manualChunks, nâng React/Antd major, hoặc thêm vendor nặng mới cần chiến lược split riêng.
