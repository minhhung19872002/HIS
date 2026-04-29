import React, { useEffect, useRef, useState } from 'react';
import { Button, Space, Tooltip, message } from 'antd';
import {
  BgColorsOutlined,
  ReloadOutlined,
  RetweetOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';

let csInitialized = false;
let csInitPromise: Promise<void> | null = null;

async function ensureCornerstoneInit() {
  if (csInitialized) return;
  if (csInitPromise) return csInitPromise;
  csInitPromise = (async () => {
    const cs = await import('@cornerstonejs/core');
    const csTools = await import('@cornerstonejs/tools');
    const csImageLoader = await import('@cornerstonejs/dicom-image-loader');
    await cs.init();
    await csTools.init();
    await csImageLoader.init({ maxWebWorkers: 2 });
    csInitialized = true;
  })();
  return csInitPromise;
}

export interface MammoImage {
  imageId: string;          // wadouri:URL
  laterality?: string;      // 'L' | 'R' | 'B' | undefined
  viewPosition?: string;    // 'CC' | 'MLO' | 'ML' | 'LM' | ...
  pixelSpacing?: number;    // mm/pixel — for true-size zoom
  instanceNumber?: number;
}

interface Props {
  images: MammoImage[];
  height?: number | string;
  onError?: (e: unknown) => void;
}

const RENDER_ID = 'his-mammo-engine';
const TG_ID = 'his-mammo-toolgroup';

// Hanging-protocol slot keys. RCC = Right Cranio-Caudal, etc.
// Standard mammo display: right breast on viewer's left (mirroring patient view).
type SlotKey = 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
const SLOTS: SlotKey[] = ['RCC', 'LCC', 'RMLO', 'LMLO'];
const SLOT_LABELS: Record<SlotKey, string> = {
  RCC: 'R-CC',  LCC: 'L-CC',
  RMLO: 'R-MLO', LMLO: 'L-MLO',
};

function buildHangingProtocol(images: MammoImage[]): Record<SlotKey, MammoImage | null> {
  const slots: Record<SlotKey, MammoImage | null> = {
    RCC: null, LCC: null, RMLO: null, LMLO: null,
  };
  for (const img of images) {
    const lat = (img.laterality || '').toUpperCase();
    const vp = (img.viewPosition || '').toUpperCase();
    let key: SlotKey | null = null;
    if (lat === 'R' && vp === 'CC') key = 'RCC';
    else if (lat === 'L' && vp === 'CC') key = 'LCC';
    else if (lat === 'R' && (vp === 'MLO' || vp === 'ML')) key = 'RMLO';
    else if (lat === 'L' && (vp === 'MLO' || vp === 'ML')) key = 'LMLO';
    if (key && !slots[key]) slots[key] = img;
  }
  // If no metadata at all, fall back to instance order: 1=RCC, 2=LCC, 3=RMLO, 4=LMLO.
  const placed = SLOTS.filter((k) => slots[k]).length;
  if (placed === 0 && images.length > 0) {
    SLOTS.forEach((k, i) => { if (images[i]) slots[k] = images[i]; });
  }
  return slots;
}

const MammoViewer: React.FC<Props> = ({ images, height = '78vh', onError }) => {
  const ccRRef = useRef<HTMLDivElement>(null);
  const ccLRef = useRef<HTMLDivElement>(null);
  const mloRRef = useRef<HTMLDivElement>(null);
  const mloLRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [magnifyOn, setMagnifyOn] = useState(false);

  const slots = React.useMemo(() => buildHangingProtocol(images), [images]);
  const slotElementMap: Record<SlotKey, React.RefObject<HTMLDivElement | null>> = {
    RCC: ccRRef, LCC: ccLRef, RMLO: mloRRef, LMLO: mloLRef,
  };

  useEffect(() => {
    if (!images || images.length === 0) return;
    let cancelled = false;
    let renderingEngine: import('@cornerstonejs/core').RenderingEngine | null = null;

    (async () => {
      try {
        await ensureCornerstoneInit();
        if (cancelled) return;

        const cs = await import('@cornerstonejs/core');
        const csTools = await import('@cornerstonejs/tools');

        const { RenderingEngine, Enums } = cs;
        const {
          ToolGroupManager, addTool, Enums: tEnums,
          WindowLevelTool, PanTool, ZoomTool, MagnifyTool,
        } = csTools;

        addTool(WindowLevelTool); addTool(PanTool); addTool(ZoomTool); addTool(MagnifyTool);

        renderingEngine = new RenderingEngine(RENDER_ID);

        // Build a viewport per occupied slot — empty slots stay blank.
        const viewportInputs = SLOTS
          .filter((k) => slots[k] !== null)
          .map((k) => ({
            viewportId: `mammo-${k}`,
            element: slotElementMap[k].current!,
            type: Enums.ViewportType.STACK,
            defaultOptions: { background: [0, 0, 0] as [number, number, number] },
          }));
        if (viewportInputs.length === 0) {
          setReady(false);
          return;
        }
        renderingEngine.setViewports(viewportInputs);

        // Tool group binds to all 4 viewports
        let tg = ToolGroupManager.getToolGroup(TG_ID);
        if (!tg) tg = ToolGroupManager.createToolGroup(TG_ID);
        if (!tg) throw new Error('Failed to create mammo tool group');

        tg.addTool(WindowLevelTool.toolName);
        tg.addTool(PanTool.toolName);
        tg.addTool(ZoomTool.toolName);
        tg.addTool(MagnifyTool.toolName);

        viewportInputs.forEach((v) => {
          tg!.addViewport(v.viewportId, RENDER_ID);
        });

        // Default bindings: WindowLevel = left, Pan = middle, Zoom = right
        tg.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: tEnums.MouseBindings.Primary }] });
        tg.setToolActive(PanTool.toolName,         { bindings: [{ mouseButton: tEnums.MouseBindings.Auxiliary }] });
        tg.setToolActive(ZoomTool.toolName,        { bindings: [{ mouseButton: tEnums.MouseBindings.Secondary }] });

        // Load the assigned imageId into each viewport stack
        for (const k of SLOTS) {
          const img = slots[k];
          if (!img) continue;
          const vp = renderingEngine.getViewport(`mammo-${k}`) as import('@cornerstonejs/core').Types.IStackViewport;
          if (vp) {
            await vp.setStack([img.imageId], 0);
            vp.render();
          }
        }

        if (!cancelled) setReady(true);
      } catch (err) {
        console.warn('[MammoViewer] init failed:', err);
        onError?.(err);
        if (!cancelled) message.error('Không khởi tạo được Mammography viewer');
      }
    })();

    return () => {
      cancelled = true;
      try {
        // toolGroup might still hold viewport handles after engine.destroy()
        import('@cornerstonejs/tools').then((csTools) => {
          try { csTools.ToolGroupManager.destroyToolGroup(TG_ID); } catch { /* ignore */ }
        });
      } catch { /* ignore */ }
      try { if (renderingEngine) renderingEngine.destroy(); } catch { /* ignore */ }
    };
  }, [images, onError]);

  const toggleMagnify = async () => {
    try {
      const csTools = await import('@cornerstonejs/tools');
      const tg = csTools.ToolGroupManager.getToolGroup(TG_ID);
      if (!tg) return;
      if (magnifyOn) {
        try { tg.setToolPassive('Magnify'); } catch { /* ignore */ }
        tg.setToolActive('WindowLevel', { bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }] });
      } else {
        try { tg.setToolPassive('WindowLevel'); } catch { /* ignore */ }
        tg.setToolActive('Magnify', { bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }] });
      }
      setMagnifyOn(!magnifyOn);
    } catch (err) { console.warn('toggleMagnify failed:', err); }
  };

  const invertAll = async () => {
    try {
      const cs = await import('@cornerstonejs/core');
      const engine = cs.getRenderingEngine(RENDER_ID);
      if (!engine) return;
      for (const k of SLOTS) {
        if (!slots[k]) continue;
        const vp = engine.getViewport(`mammo-${k}`) as import('@cornerstonejs/core').Types.IStackViewport | undefined;
        if (!vp) continue;
        const props = vp.getProperties();
        vp.setProperties({ invert: !props.invert });
        vp.render();
      }
    } catch (err) { console.warn('invertAll failed:', err); }
  };

  const resetAll = async () => {
    try {
      const cs = await import('@cornerstonejs/core');
      const engine = cs.getRenderingEngine(RENDER_ID);
      if (!engine) return;
      for (const k of SLOTS) {
        if (!slots[k]) continue;
        const vp = engine.getViewport(`mammo-${k}`);
        vp?.resetCamera();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vp as any)?.resetProperties?.();
        vp?.render();
      }
    } catch { /* ignore */ }
  };

  const fitAll = async () => {
    try {
      const cs = await import('@cornerstonejs/core');
      const engine = cs.getRenderingEngine(RENDER_ID);
      if (!engine) return;
      for (const k of SLOTS) {
        if (!slots[k]) continue;
        const vp = engine.getViewport(`mammo-${k}`);
        vp?.resetCamera();
        vp?.render();
      }
    } catch { /* ignore */ }
  };

  const trueSize = async () => {
    // True-size zoom: 1 pixel on screen = 1 mm on image, using PixelSpacing.
    // Cornerstone3D uses parallel scale = half the height in world units.
    // We approximate: target zoom so 1px screen ~= pixelSpacing × screen DPI ratio.
    try {
      const cs = await import('@cornerstonejs/core');
      const engine = cs.getRenderingEngine(RENDER_ID);
      if (!engine) return;
      let applied = 0;
      for (const k of SLOTS) {
        const img = slots[k];
        if (!img || !img.pixelSpacing) continue;
        const vp = engine.getViewport(`mammo-${k}`);
        if (!vp) continue;
        // 1 mm = 96/25.4 ≈ 3.78 px on a standard 96 DPI display. Scale ratio ~= pxPerMm.
        // Cornerstone setZoom() scales the viewport camera; combine with pixelSpacing.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vpAny = vp as any;
        if (typeof vpAny.setZoom === 'function') {
          // Reset first so zoom is relative
          vp.resetCamera();
          // The default fit zoom is 1.0; "true size" => the image's mm size matches mm on screen.
          // Approximate: zoomTrue = (3.78 * pixelSpacing) ; values >1 zoom in, <1 zoom out.
          const zoomTrue = 3.78 * img.pixelSpacing;
          vpAny.setZoom(zoomTrue);
          vp.render();
          applied++;
        }
      }
      if (applied === 0) message.info('Không có PixelSpacing — không thể áp True-Size');
      else message.success(`Đã áp True-Size cho ${applied} viewport`);
    } catch (err) { console.warn('trueSize failed:', err); }
  };

  const occupied = SLOTS.filter((k) => slots[k]).length;
  if (!images || images.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-3, #999)' }}>
        Không có ảnh để hiển thị mammo.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Space wrap size={8}>
        <Tooltip title="Bật/tắt kính lúp (Magnify)">
          <Button
            size="small"
            type={magnifyOn ? 'primary' : 'default'}
            icon={<RetweetOutlined />}
            onClick={toggleMagnify}
            data-testid="mammo-magnify-btn"
          >
            Kính lúp
          </Button>
        </Tooltip>
        <Tooltip title="Đảo màu cho cả 4 view">
          <Button size="small" icon={<BgColorsOutlined />} onClick={invertAll}>Đảo màu</Button>
        </Tooltip>
        <Tooltip title="Hiển thị kích thước thật (1 px = 1 mm) — cần PixelSpacing">
          <Button size="small" icon={<ExpandOutlined />} onClick={trueSize}>True-Size</Button>
        </Tooltip>
        <Tooltip title="Vừa khung — Zoom-to-fit">
          <Button size="small" icon={<CompressOutlined />} onClick={fitAll}>Vừa khung</Button>
        </Tooltip>
        <Tooltip title="Reset W/L + Camera">
          <Button size="small" icon={<ReloadOutlined />} onClick={resetAll}>Reset</Button>
        </Tooltip>
        <span style={{ marginLeft: 12, fontSize: 11, color: '#888' }}>
          Hanging protocol: {occupied}/4 view · {images.length} ảnh tải
        </span>
        {!ready && <span style={{ fontSize: 11, color: '#888' }}>Đang khởi tạo…</span>}
      </Space>

      {/* 2x2 hanging protocol: top row = CC, bottom = MLO. Right breast on viewer's left. */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
        gap: 4, height, background: '#000', borderRadius: 4, overflow: 'hidden',
      }}>
        {SLOTS.map((k) => (
          <Quadrant
            key={k}
            label={SLOT_LABELS[k]}
            color={k.startsWith('R') ? 'rgb(80, 180, 220)' : 'rgb(220, 160, 80)'}
            elementRef={slotElementMap[k]}
            empty={!slots[k]}
            pixelSpacing={slots[k]?.pixelSpacing}
            testid={`mammo-slot-${k}`}
          />
        ))}
      </div>
    </div>
  );
};

const Quadrant: React.FC<{
  label: string;
  color: string;
  elementRef: React.RefObject<HTMLDivElement | null>;
  empty: boolean;
  pixelSpacing?: number;
  testid?: string;
}> = ({ label, color, elementRef, empty, pixelSpacing, testid }) => (
  <div style={{ position: 'relative', background: '#000', minHeight: 0 }} data-testid={testid}>
    <div ref={elementRef} style={{ width: '100%', height: '100%', background: '#000' }}
         onContextMenu={(e) => e.preventDefault()} />
    <div style={{
      position: 'absolute', top: 6, left: 8,
      color, fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
      textShadow: '0 1px 2px #000', pointerEvents: 'none',
    }}>{label}</div>
    {pixelSpacing != null && (
      <div style={{
        position: 'absolute', bottom: 6, left: 8,
        color: '#aaa', fontFamily: 'monospace', fontSize: 10,
        textShadow: '0 1px 2px #000', pointerEvents: 'none',
      }}>PS: {pixelSpacing.toFixed(3)} mm/px</div>
    )}
    {empty && (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#555', fontSize: 12, fontStyle: 'italic',
      }}>
        (không có {label})
      </div>
    )}
  </div>
);

export default MammoViewer;
