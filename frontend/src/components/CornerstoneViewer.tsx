import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Button, Space, Tooltip, message } from 'antd';
import {
  ZoomInOutlined,
  DragOutlined,
  RetweetOutlined,
  ColumnHeightOutlined,
  AimOutlined,
  HighlightOutlined,
  RadiusBottomleftOutlined,
  ReloadOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';

// Cornerstone3D singleton init flag — bootstrap engine only once per page load
let csInitialized = false;
let csInitPromise: Promise<void> | null = null;

async function ensureCornerstoneInit() {
  if (csInitialized) return;
  if (csInitPromise) return csInitPromise;
  csInitPromise = (async () => {
    const cs = await import('@cornerstonejs/core');
    const csTools = await import('@cornerstonejs/tools');
    const csImageLoader = await import('@cornerstonejs/dicom-image-loader');

    // Bootstrap core engine (WebGL + WASM codecs)
    await cs.init();
    // Bootstrap tools framework
    await csTools.init();
    // Bootstrap DICOM image loader (registers wadouri / wadors loaders)
    await csImageLoader.init({ maxWebWorkers: 2 });

    csInitialized = true;
  })();
  return csInitPromise;
}

export type CsToolName = 'WindowLevel' | 'Pan' | 'Zoom' | 'StackScroll' | 'Length' | 'Angle' | 'Probe' | 'Magnify';

export interface WlPreset {
  key: string;
  name: string;
  center: number;
  width: number;
}

export interface CornerstoneViewerHandle {
  applyWlPreset: (p: WlPreset) => void;
  invert: () => void;
  reset: () => void;
  setActiveTool: (t: CsToolName) => void;
}

/** Bounds of the rendered DICOM image inside the canvas, in CSS pixels.
 *  Updated whenever pan/zoom changes so AI overlays can track the image. */
export interface ImageCanvasRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  imageIds: string[];          // wadouri:URL[] — Cornerstone3D image identifiers
  initialIndex?: number;
  height?: number | string;
  onError?: (e: unknown) => void;
  /**
   * Render-prop for overlays (AI bbox/heatmap, annotations) drawn ABOVE the
   * cornerstone canvas. Receives the current viewport size in CSS pixels AND
   * the rendered image bounds (so overlays can follow pan/zoom). `imageRect`
   * is null until the first image renders.
   */
  overlay?: (size: { width: number; height: number }, imageRect: ImageCanvasRect | null) => React.ReactNode;
}

const TOOL_GROUP_ID = 'his-dicom-toolgroup';
const VIEWPORT_ID = 'his-dicom-viewport';
const RENDERING_ENGINE_ID = 'his-dicom-engine';

/**
 * Compute the rendered DICOM image bounds in canvas CSS pixels.
 * Cornerstone3D doesn't expose this directly — derive it from imageData
 * (origin + spacing + dimensions) + viewport.worldToCanvas().
 * Returns null if viewport has no image data yet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeImageRect(viewport: any): ImageCanvasRect | null {
  try {
    if (!viewport || typeof viewport.worldToCanvas !== 'function') return null;
    const imageData = viewport.getImageData?.();
    if (!imageData) return null;

    // Cornerstone3D 3.x — dimensions/origin/spacing live either at top-level
    // or under vtk-style imageData getters. Try both.
    const dims =
      imageData.dimensions ||
      imageData.imageData?.getDimensions?.() ||
      null;
    const origin =
      imageData.origin ||
      imageData.imageData?.getOrigin?.() ||
      [0, 0, 0];
    const spacing =
      imageData.spacing ||
      imageData.imageData?.getSpacing?.() ||
      [1, 1, 1];
    if (!dims || dims.length < 2) return null;

    const w = dims[0];
    const h = dims[1];
    const tl = viewport.worldToCanvas([origin[0], origin[1], 0]);
    const br = viewport.worldToCanvas([
      origin[0] + spacing[0] * w,
      origin[1] + spacing[1] * h,
      0,
    ]);
    if (!tl || !br) return null;
    return {
      x: Math.min(tl[0], br[0]),
      y: Math.min(tl[1], br[1]),
      w: Math.abs(br[0] - tl[0]),
      h: Math.abs(br[1] - tl[1]),
    };
  } catch {
    return null;
  }
}

const CornerstoneViewer = forwardRef<CornerstoneViewerHandle, Props>(({
  imageIds, initialIndex = 0, height = '60vh', onError, overlay,
}, ref) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveToolState] = useState<CsToolName>('WindowLevel');
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [imageRect, setImageRect] = useState<ImageCanvasRect | null>(null);

  // Track viewport CSS size so overlay can match. ResizeObserver fires on
  // window resize, fullscreen toggle, and on container reflows.
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setViewportSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Init engine + viewport once when element is mounted
  useEffect(() => {
    let cancelled = false;
    let csCore: typeof import('@cornerstonejs/core') | null = null;
    let csTools: typeof import('@cornerstonejs/tools') | null = null;
    let renderingEngine: import('@cornerstonejs/core').RenderingEngine | null = null;

    (async () => {
      try {
        await ensureCornerstoneInit();
        if (cancelled || !elementRef.current) return;

        csCore = await import('@cornerstonejs/core');
        csTools = await import('@cornerstonejs/tools');

        const { RenderingEngine, Enums: csEnums } = csCore;
        const {
          ToolGroupManager,
          WindowLevelTool, PanTool, ZoomTool, StackScrollTool,
          LengthTool, AngleTool, ProbeTool, MagnifyTool,
          addTool, Enums: tEnums,
        } = csTools;

        // Register tools globally (no-op if already registered)
        addTool(WindowLevelTool); addTool(PanTool); addTool(ZoomTool);
        addTool(StackScrollTool); addTool(LengthTool); addTool(AngleTool);
        addTool(ProbeTool); addTool(MagnifyTool);

        renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
        const viewportInput = {
          viewportId: VIEWPORT_ID,
          element: elementRef.current,
          type: csEnums.ViewportType.STACK,
        };
        renderingEngine.enableElement(viewportInput);

        // Tool group: bind to viewport
        let tg = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
        if (!tg) tg = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
        if (!tg) throw new Error('Failed to create cornerstone tool group');

        // Add all tools to group, default WindowLevel active on left mouse
        tg.addTool(WindowLevelTool.toolName);
        tg.addTool(PanTool.toolName);
        tg.addTool(ZoomTool.toolName);
        tg.addTool(StackScrollTool.toolName);
        tg.addTool(LengthTool.toolName);
        tg.addTool(AngleTool.toolName);
        tg.addTool(ProbeTool.toolName);
        tg.addTool(MagnifyTool.toolName);

        // Default: WindowLevel = left, Pan = middle, Zoom = right, StackScroll = wheel
        tg.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: tEnums.MouseBindings.Primary }] });
        tg.setToolActive(PanTool.toolName,         { bindings: [{ mouseButton: tEnums.MouseBindings.Auxiliary }] });
        tg.setToolActive(ZoomTool.toolName,        { bindings: [{ mouseButton: tEnums.MouseBindings.Secondary }] });
        tg.setToolActive(StackScrollTool.toolName, { bindings: [{ mouseButton: tEnums.MouseBindings.Wheel }] });

        tg.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);

        if (!cancelled) setReady(true);
      } catch (err) {
        console.warn('[CornerstoneViewer] init failed:', err);
        onError?.(err);
        if (!cancelled) message.error('Không khởi tạo được DICOM viewer');
      }
    })();

    return () => {
      cancelled = true;
      try {
        if (csTools) {
          const tg = csTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
          if (tg) csTools.ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
        }
        if (renderingEngine) renderingEngine.destroy();
      } catch { /* ignore */ }
    };
  }, [onError]);

  // Load stack when imageIds change (and engine is ready)
  useEffect(() => {
    if (!ready || imageIds.length === 0) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const csCore = await import('@cornerstonejs/core');
        const engine = csCore.getRenderingEngine(RENDERING_ENGINE_ID);
        if (!engine) return;
        const viewport = engine.getViewport(VIEWPORT_ID) as import('@cornerstonejs/core').Types.IStackViewport;
        await viewport.setStack(imageIds, Math.min(initialIndex, imageIds.length - 1));
        viewport.render();
        if (!cancelled) {
          setCurrentIdx(initialIndex);
          setLoading(false);
        }
      } catch (err) {
        console.warn('[CornerstoneViewer] setStack failed:', err);
        onError?.(err);
        if (!cancelled) {
          setLoading(false);
          message.error('Không tải được ảnh DICOM');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [ready, imageIds, initialIndex, onError]);

  // Track current image index via STACK_NEW_IMAGE event for the slice counter
  useEffect(() => {
    if (!ready) return;
    const el = elementRef.current;
    if (!el) return;
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as { imageIdIndex?: number } | undefined;
      if (detail && typeof detail.imageIdIndex === 'number') setCurrentIdx(detail.imageIdIndex);
    };
    // CSE event names — string literal matches Enums.Events.STACK_NEW_IMAGE
    el.addEventListener('CORNERSTONE_STACK_NEW_IMAGE', handler);
    return () => el.removeEventListener('CORNERSTONE_STACK_NEW_IMAGE', handler);
  }, [ready]);

  // Subscribe to camera-modified to update imageRect for AI overlays.
  // CORNERSTONE_CAMERA_MODIFIED fires on every pan/zoom, plus once on initial
  // image render. STACK_NEW_IMAGE handles slice changes (image swap). Listen
  // to both so the overlay tracks the image position regardless of cause.
  useEffect(() => {
    if (!ready) return;
    const el = elementRef.current;
    if (!el) return;
    let rafId: number | null = null;

    const recompute = () => {
      // Coalesce rapid events (pan drag fires 60+ times/sec) via rAF.
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        void (async () => {
          try {
            const csCore = await import('@cornerstonejs/core');
            const engine = csCore.getRenderingEngine(RENDERING_ENGINE_ID);
            if (!engine) return;
            const vp = engine.getViewport(VIEWPORT_ID);
            const rect = computeImageRect(vp);
            setImageRect(rect);
          } catch { /* ignore */ }
        })();
      });
    };

    el.addEventListener('CORNERSTONE_CAMERA_MODIFIED', recompute);
    el.addEventListener('CORNERSTONE_STACK_NEW_IMAGE', recompute);
    el.addEventListener('CORNERSTONE_IMAGE_RENDERED', recompute);

    // Compute once after a delay (first render may not have fired CAMERA_MODIFIED yet).
    const initTimer = setTimeout(recompute, 200);

    return () => {
      el.removeEventListener('CORNERSTONE_CAMERA_MODIFIED', recompute);
      el.removeEventListener('CORNERSTONE_STACK_NEW_IMAGE', recompute);
      el.removeEventListener('CORNERSTONE_IMAGE_RENDERED', recompute);
      clearTimeout(initTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ready]);

  // Also recompute when viewport CSS size changes (window resize, fullscreen).
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      try {
        const csCore = await import('@cornerstonejs/core');
        const engine = csCore.getRenderingEngine(RENDERING_ENGINE_ID);
        if (!engine) return;
        const vp = engine.getViewport(VIEWPORT_ID);
        setImageRect(computeImageRect(vp));
      } catch { /* ignore */ }
    })();
  }, [ready, viewportSize.width, viewportSize.height]);

  useImperativeHandle(ref, () => ({
    applyWlPreset: (p) => {
      void (async () => {
        try {
          const csCore = await import('@cornerstonejs/core');
          const engine = csCore.getRenderingEngine(RENDERING_ENGINE_ID);
          if (!engine) return;
          const viewport = engine.getViewport(VIEWPORT_ID) as import('@cornerstonejs/core').Types.IStackViewport;
          const lower = p.center - p.width / 2;
          const upper = p.center + p.width / 2;
          viewport.setProperties({ voiRange: { lower, upper } });
          viewport.render();
        } catch (err) { console.warn('applyWlPreset failed:', err); }
      })();
    },
    invert: () => {
      void (async () => {
        try {
          const csCore = await import('@cornerstonejs/core');
          const engine = csCore.getRenderingEngine(RENDERING_ENGINE_ID);
          if (!engine) return;
          const viewport = engine.getViewport(VIEWPORT_ID) as import('@cornerstonejs/core').Types.IStackViewport;
          const props = viewport.getProperties();
          viewport.setProperties({ invert: !props.invert });
          viewport.render();
        } catch (err) { console.warn('invert failed:', err); }
      })();
    },
    reset: () => {
      void (async () => {
        try {
          const csCore = await import('@cornerstonejs/core');
          const engine = csCore.getRenderingEngine(RENDERING_ENGINE_ID);
          if (!engine) return;
          const viewport = engine.getViewport(VIEWPORT_ID) as import('@cornerstonejs/core').Types.IStackViewport;
          viewport.resetCamera();
          viewport.resetProperties();
          viewport.render();
        } catch (err) { console.warn('reset failed:', err); }
      })();
    },
    setActiveTool: (t) => switchTool(t),
  }), []);

  const switchTool = async (t: CsToolName) => {
    try {
      const csTools = await import('@cornerstonejs/tools');
      const tg = csTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
      if (!tg) return;
      // Disable all tools that were on left mouse, then set new one active on left
      const TOOLS: CsToolName[] = ['WindowLevel', 'Pan', 'Zoom', 'Length', 'Angle', 'Probe', 'Magnify'];
      TOOLS.forEach((name) => {
        try { tg.setToolPassive(name); } catch { /* tool not added */ }
      });
      tg.setToolActive(t, { bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }] });
      // StackScroll always active on wheel
      try { tg.setToolActive('StackScroll', { bindings: [{ mouseButton: csTools.Enums.MouseBindings.Wheel }] }); } catch { /* ignore */ }
      setActiveToolState(t);
    } catch (err) { console.warn('switchTool failed:', err); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Space wrap size={4}>
        <ToolBtn icon={<ColumnHeightOutlined />}    label="W/L"     active={activeTool === 'WindowLevel'} onClick={() => switchTool('WindowLevel')} />
        <ToolBtn icon={<DragOutlined />}            label="Pan"     active={activeTool === 'Pan'}         onClick={() => switchTool('Pan')} />
        <ToolBtn icon={<ZoomInOutlined />}          label="Zoom"    active={activeTool === 'Zoom'}        onClick={() => switchTool('Zoom')} />
        <ToolBtn icon={<HighlightOutlined />}       label="Đo DT"   active={activeTool === 'Length'}      onClick={() => switchTool('Length')} />
        <ToolBtn icon={<RadiusBottomleftOutlined />} label="Đo góc" active={activeTool === 'Angle'}       onClick={() => switchTool('Angle')} />
        <ToolBtn icon={<AimOutlined />}             label="Probe"   active={activeTool === 'Probe'}       onClick={() => switchTool('Probe')} />
        <ToolBtn icon={<RetweetOutlined />}         label="Magnify" active={activeTool === 'Magnify'}     onClick={() => switchTool('Magnify')} />
        <Tooltip title="Đảo màu (Invert)"><Button size="small" icon={<BgColorsOutlined />} onClick={() => (ref as React.RefObject<CornerstoneViewerHandle>)?.current?.invert()} /></Tooltip>
        <Tooltip title="Reset"><Button size="small" icon={<ReloadOutlined />} onClick={() => (ref as React.RefObject<CornerstoneViewerHandle>)?.current?.reset()} /></Tooltip>
        <span style={{ marginLeft: 12, fontSize: 12, color: '#999', fontFamily: 'monospace' }}>
          {imageIds.length > 0 ? `${currentIdx + 1} / ${imageIds.length}` : '—'}
        </span>
      </Space>
      <div
        ref={elementRef}
        style={{
          width: '100%',
          height,
          background: '#000',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', fontSize: 14 }}>Đang tải DICOM…</div>}
        {overlay && viewportSize.width > 0 && overlay(viewportSize, imageRect)}
      </div>
    </div>
  );
});

const ToolBtn: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <Tooltip title={label}>
    <Button size="small" type={active ? 'primary' : 'default'} icon={icon} onClick={onClick}>
      {label}
    </Button>
  </Tooltip>
);

CornerstoneViewer.displayName = 'CornerstoneViewer';

export default CornerstoneViewer;
