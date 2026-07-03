---
name: his-fe-dicom-viewer
description: Use this skill when building or editing HIS DICOM viewer components built on Cornerstone3D — stack/MPR/3D viewport, MIP/MinIP projection, cine playback, mammography viewer. Triggers include editing DicomViewer page or CornerstoneViewer/MprViewer/MipMinIpViewer/CineControls/MammoViewer, loading wadouri imageIds from the PACS proxy, or window/level/zoom/pan tools. Do NOT use for list/detail pages (his-fe-page-v2) or RIS report CRUD.
metadata:
  type: project
---

# HIS DICOM Viewer (Cornerstone3D)

> TIER: **B · PROJECT/HIS** (system). Depends: `core-reusable-code`, `core-error-loading-state`.

A skill for the **DICOM viewer component** using **Cornerstone3D** (full-bleed, not a list/detail page). Includes StackViewport + MPR/3D + MIP/MinIP + Cine + Mammography. Integrated into `pages/DicomViewer.tsx`.

## When to use
- Editing/adding `CornerstoneViewer`, `MprViewer`, `MipMinIpViewer`, `CineControls`, `MammoViewer`, `DicomViewer`.
- Adding a tool (W/L, zoom, pan, length, angle), projection (MIP/MinIP), cine, mammo hanging protocol.
- Loading DICOM images via the PACS proxy → render Cornerstone3D.

## When NOT to use
- A list/detail page (`/v2/*`) → `his-fe-page-v2`.
- Imaging-order / RIS-report CRUD → the normal backend/page skill.
- DICOM auto-send/transmission (sending a study to PACS) → that's backend (`his-be-module-scaffold`/a separate feature), not the viewer.

## Architecture (NangCap24/15)
- Components: `frontend/src/components/{CornerstoneViewer, MprViewer, MipMinIpViewer, CineControls, MammoViewer}.tsx`.
- Integrated into `pages/DicomViewer.tsx` (route `/radiology/viewer` / `/v2/radiology/viewer` — **full-bleed**, keeps its own chrome, does NOT follow the `_v2kit` frame).
- **Image source**: imageIds in `wadouri:` form pointing to the **backend PACS proxy** (`/api/RISComplete/pacs/instances/{id}/file` — AllowAnonymous, proxies Orthanc Basic Auth). The FE prepends `API_ORIGIN` for a relative path.
- Engine: Cornerstone3D 3.x — `RenderingEngine`, `StackViewport`/`VolumeViewport`, `ToolGroupManager`, `volumeLoader`, `setVolumesForViewports`, `CONSTANTS.VIEWPORT_PRESETS`.

## Standard process
1. **Reuse first** (`core-reusable-code`): look at the existing `CornerstoneViewer.tsx`/`MprViewer.tsx` — extend instead of rewriting the engine.
2. **Component**: dynamic `import()` Cornerstone3D (heavy bundle ~830KB gz) so it only loads when the viewer opens; bootstrap the worker; ResizeObserver tracks the size.
3. **Load**: get imageIds (`wadouri:` + PACS proxy URL), `viewport.setStack`/`volumeLoader.createAndCacheVolume` → `setVolumesForViewports` → `volume.load()`.
4. **Tools/projection/cine** via a ToolGroup; MIP/MinIP via blendMode; cine loop via frame index.
5. **State**: volume loading %, empty (study < N slices → fallback message), error (PACS unreachable) — per `core-error-loading-state`.
6. **Verify**: needs a DICOM study on PACS (e.g. ACRIN CT 135 slices on R2). Build `npm run build` (mind the vendor-cornerstone chunk).

## Vite config (exists — don't break it)
- `worker.format: 'es'` (iife breaks the cornerstone worker code-split).
- `optimizeDeps.exclude` for `@cornerstonejs/dicom-image-loader` + codec WASM.
- manualChunk `vendor-cornerstone` splits the engine off the main bundle.

## Pitfalls (hit before)
- **Relative image URL** → `<img>`/loader resolves to Vercel (404) instead of Cloud Run. Prepend `API_ORIGIN`; the regex matches both `/preview` and `/rendered`.
- **worker iife** → broken build. Keep `worker.format:'es'`.
- **volume.load() before setVolumesForViewports** → the 3D preset isn't applied. Order: createVolume → setVolumesForViewports → load.
- **CS3D 3.x layout**: `volumeLoader`/`setVolumesForViewports` export from `@cornerstonejs/core` (different from 2.x). `OrientationAxis` is in `Enums`.
- **Route** is `/radiology/viewer` (App.tsx), easy to mistype as `/dicom-viewer`.
- Antd v6 Button + `data-testid` doesn't forward reliably → E2E uses `getByRole('button',{name})`.

## Reference
- `references/viewer-component-template.tsx` — a Cornerstone3D component frame (StackViewport + tool + overlay slot)

## When to update
- When upgrading a Cornerstone3D major, changing the PACS proxy route, or adding a new viewer mode.
