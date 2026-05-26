---
name: his-fe-dicom-viewer
description: Use this skill when building or editing HIS DICOM viewer components built on Cornerstone3D — stack/MPR/3D viewport, MIP/MinIP projection, cine playback, mammography viewer. Triggers include editing DicomViewer page or CornerstoneViewer/MprViewer/MipMinIpViewer/CineControls/MammoViewer, loading wadouri imageIds from the PACS proxy, or window/level/zoom/pan tools. Do NOT use for list/detail pages (his-fe-page-v2) or RIS report CRUD.
metadata:
  type: project
---

# HIS DICOM Viewer (Cornerstone3D)

> TẦNG: **B · PROJECT/HIS** (system). Depend: `core-reusable-code`, `core-error-loading-state`.

Skill cho **component viewer DICOM** dùng **Cornerstone3D** (full-bleed, không phải page list/detail). Gồm StackViewport + MPR/3D + MIP/MinIP + Cine + Mammography. Tích hợp vào `pages/DicomViewer.tsx`.

## Khi nào dùng
- Sửa/thêm `CornerstoneViewer`, `MprViewer`, `MipMinIpViewer`, `CineControls`, `MammoViewer`, `DicomViewer`.
- Thêm tool (W/L, zoom, pan, length, angle), projection (MIP/MinIP), cine, hanging protocol mammo.
- Load ảnh DICOM qua PACS proxy → render Cornerstone3D.

## Khi nào KHÔNG dùng
- Page list/detail (`/v2/*`) → `his-fe-page-v2`.
- CRUD phiếu CĐHA / kết quả RIS → backend/page skill thường.
- DICOM auto-send/transmission (gửi study sang PACS) → đó là backend (`his-be-module-scaffold`/feature riêng), không phải viewer.

## Kiến trúc (NangCap24/15)
- Component: `frontend/src/components/{CornerstoneViewer, MprViewer, MipMinIpViewer, CineControls, MammoViewer}.tsx`.
- Tích hợp vào `pages/DicomViewer.tsx` (route `/radiology/viewer` / `/v2/radiology/viewer` — **full-bleed**, giữ chrome riêng, KHÔNG theo khuôn `_v2kit`).
- **Lấy ảnh**: imageIds dạng `wadouri:` trỏ về **backend PACS proxy** (`/api/RISComplete/pacs/instances/{id}/file` — AllowAnonymous, proxy Orthanc Basic Auth). FE prepend `API_ORIGIN` cho path tương đối.
- Engine: Cornerstone3D 3.x — `RenderingEngine`, `StackViewport`/`VolumeViewport`, `ToolGroupManager`, `volumeLoader`, `setVolumesForViewports`, `CONSTANTS.VIEWPORT_PRESETS`.

## Quy trình chuẩn
1. **Reuse trước** (`core-reusable-code`): xem `CornerstoneViewer.tsx`/`MprViewer.tsx` đã có — extend thay vì viết lại engine.
2. **Component**: dynamic `import()` Cornerstone3D (bundle nặng ~830KB gz) để chỉ tải khi mở viewer; bootstrap worker; ResizeObserver theo dõi kích thước.
3. **Load**: lấy imageIds (`wadouri:` + PACS proxy URL), `viewport.setStack`/`volumeLoader.createAndCacheVolume` → `setVolumesForViewports` → `volume.load()`.
4. **Tools/projection/cine** qua ToolGroup; MIP/MinIP qua blendMode; cine loop qua frame index.
5. **State**: loading volume %, empty (study <N slice → fallback message), error (PACS unreachable) — theo `core-error-loading-state`.
6. **Verify**: cần study DICOM trên PACS (vd ACRIN CT 135 slice trên R2). Build `npm run build` (chú ý chunk vendor-cornerstone).

## Vite config (đã có — đừng phá)
- `worker.format: 'es'` (iife vỡ code-split worker cornerstone).
- `optimizeDeps.exclude` cho `@cornerstonejs/dicom-image-loader` + codec WASM.
- manualChunk `vendor-cornerstone` tách engine khỏi bundle chính.

## Pitfalls (đã dính)
- **URL ảnh tương đối** → `<img>`/loader resolve về Vercel (404) thay vì Cloud Run. Prepend `API_ORIGIN`; regex match cả `/preview` lẫn `/rendered`.
- **worker iife** → build vỡ. Giữ `worker.format:'es'`.
- **volume.load() trước setVolumesForViewports** → preset 3D không áp. Thứ tự: createVolume → setVolumesForViewports → load.
- **CS3D 3.x layout**: `volumeLoader`/`setVolumesForViewports` export từ `@cornerstonejs/core` (khác 2.x). `OrientationAxis` ở `Enums`.
- **Route** là `/radiology/viewer` (App.tsx), dễ gõ nhầm `/dicom-viewer`.
- Antd v6 Button + `data-testid` không forward ổn → E2E dùng `getByRole('button',{name})`.

## Reference
- `references/viewer-component-template.tsx` — khung component Cornerstone3D (StackViewport + tool + overlay slot)

## When to update
- Khi nâng Cornerstone3D major, đổi PACS proxy route, hoặc thêm chế độ viewer mới.
