/**
 * NangCap24 — MIP/MinIP Viewer v2 (port từ mod-mip-minip-viewer.jsx)
 *
 * Cornerstone3D viewer — MIP (Maximum) hoặc MinIP (Minimum) Intensity Projection
 * với slab thickness slider (5–100mm) trên 3 viewport AXIAL/SAGITTAL/CORONAL.
 *
 * FULLSCREEN UI — KHÔNG dùng terminal shell. Top bar #0f172a + toolbar #111827 +
 * 3 viewport bg #000 với DICOM overlay góc + caption dưới giải thích blend mode.
 *
 * Cornerstone init giữ nguyên logic (Volume + BlendMode + Tool group).
 */
import React, { useEffect, useRef, useState } from 'react';
import { message, Spin } from 'antd';
import TermIcon from '../layouts/terminal/Icon';

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

interface Props {
  imageIds: string[];
  height?: number | string;
  defaultMode?: 'MIP' | 'MinIP';
  studyInfo?: {
    patient?: string;
    pid?: string;
    studyDate?: string;
    modality?: string;
    description?: string;
    seriesCount?: number;
  };
}

const RENDER_ID = 'his-mip-engine';
const TG_ID = 'his-mip-toolgroup';
const VP_AXIAL = 'his-mip-axial';
const VP_SAGITTAL = 'his-mip-sagittal';
const VP_CORONAL = 'his-mip-coronal';

const VIEWPORTS = [
  { id: 'axial',    vpId: VP_AXIAL,    label: 'AXIAL',    color: '#dc2626' },
  { id: 'sagittal', vpId: VP_SAGITTAL, label: 'SAGITTAL', color: '#16a34a' },
  { id: 'coronal',  vpId: VP_CORONAL,  label: 'CORONAL',  color: '#0284c7' },
];

type ToolKey = 'wwwc' | 'pan' | 'zoom' | 'scroll';
const TOOLS: { v: ToolKey; l: string; desc?: string }[] = [
  { v: 'wwwc',   l: 'W/L',    desc: 'Window/Level' },
  { v: 'pan',    l: 'Pan',    desc: 'Di chuyển' },
  { v: 'zoom',   l: 'Zoom' },
  { v: 'scroll', l: 'Scroll' },
];

const MipMinIpViewer: React.FC<Props> = ({
  imageIds, height = '100vh', defaultMode = 'MIP', studyInfo: studyInfoProp,
}) => {
  const refs = {
    axial:    useRef<HTMLDivElement>(null),
    sagittal: useRef<HTMLDivElement>(null),
    coronal:  useRef<HTMLDivElement>(null),
  };

  const [mode, setMode] = useState<'MIP' | 'MinIP'>(defaultMode);
  const [slab, setSlab] = useState(30);
  const [tool, setTool] = useState<ToolKey>('wwwc');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const sliceCount = imageIds.length;
  const studyInfo = {
    patient: studyInfoProp?.patient ?? '—',
    pid: studyInfoProp?.pid ?? '—',
    studyDate: studyInfoProp?.studyDate ?? '',
    modality: studyInfoProp?.modality ?? 'CT',
    description: studyInfoProp?.description ?? `${sliceCount} slice`,
    seriesCount: studyInfoProp?.seriesCount ?? 1,
  };

  const volumeId = React.useMemo(
    () => `cornerstoneStreamingImageVolume:his-mip-${imageIds.length}-${imageIds[0]?.slice(-12) || 'empty'}`,
    [imageIds]
  );

  useEffect(() => {
    if (imageIds.length < 5) { setLoading(false); return; }
    let cancelled = false;
    let renderingEngine: import('@cornerstonejs/core').RenderingEngine | null = null;

    (async () => {
      try {
        await ensureCornerstoneInit();
        if (cancelled) return;

        const cs = await import('@cornerstonejs/core');
        const csTools = await import('@cornerstonejs/tools');
        const { RenderingEngine, Enums, volumeLoader, setVolumesForViewports } = cs;
        const { ToolGroupManager, addTool, Enums: tEnums,
          WindowLevelTool, PanTool, ZoomTool, StackScrollTool } = csTools;

        addTool(WindowLevelTool); addTool(PanTool); addTool(ZoomTool); addTool(StackScrollTool);

        const volume: any = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });
        if (cancelled) return;

        renderingEngine = new RenderingEngine(RENDER_ID);
        renderingEngine.setViewports([
          { viewportId: VP_AXIAL,    element: refs.axial.current!,    type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.AXIAL,    background: [0, 0, 0] } },
          { viewportId: VP_SAGITTAL, element: refs.sagittal.current!, type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.SAGITTAL, background: [0, 0, 0] } },
          { viewportId: VP_CORONAL,  element: refs.coronal.current!,  type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.CORONAL,  background: [0, 0, 0] } },
        ]);

        volume.load((evt: { numFrames: number; framesProcessed: number }) => {
          if (cancelled || !evt) return;
          setProgress(Math.round((evt.framesProcessed / Math.max(1, evt.numFrames)) * 100));
        });

        await setVolumesForViewports(renderingEngine, [{ volumeId }],
          [VP_AXIAL, VP_SAGITTAL, VP_CORONAL]);

        applyBlend(renderingEngine, mode, slab);

        let tg = ToolGroupManager.getToolGroup(TG_ID);
        if (!tg) tg = ToolGroupManager.createToolGroup(TG_ID);
        if (!tg) throw new Error('Tool group fail');
        tg.addTool(WindowLevelTool.toolName); tg.addTool(PanTool.toolName);
        tg.addTool(ZoomTool.toolName); tg.addTool(StackScrollTool.toolName);
        tg.addViewport(VP_AXIAL, RENDER_ID); tg.addViewport(VP_SAGITTAL, RENDER_ID); tg.addViewport(VP_CORONAL, RENDER_ID);
        applyTool(tg, tEnums, tool);

        renderingEngine.renderViewports([VP_AXIAL, VP_SAGITTAL, VP_CORONAL]);
        if (!cancelled) setLoading(false);
      } catch (err) {
        console.warn('[MipMinIpViewer] init failed:', err);
        if (!cancelled) { setLoading(false); message.error('Không khởi tạo được MIP/MinIP viewer'); }
      }
    })();

    return () => { cancelled = true; try { renderingEngine?.destroy(); } catch { /* */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIds, volumeId]);

  const applyBlend = async (
    engine: import('@cornerstonejs/core').RenderingEngine,
    m: 'MIP' | 'MinIP',
    s: number,
  ) => {
    try {
      const cs = await import('@cornerstonejs/core');
      const { Enums } = cs;
      const blend = m === 'MIP'
        ? Enums.BlendModes.MAXIMUM_INTENSITY_BLEND
        : Enums.BlendModes.MINIMUM_INTENSITY_BLEND;
      [VP_AXIAL, VP_SAGITTAL, VP_CORONAL].forEach(vpId => {
        const vp = engine.getViewport(vpId) as any;
        if (!vp) return;
        try {
          vp.setBlendMode(blend);
          if (typeof vp.setSlabThickness === 'function') vp.setSlabThickness(s);
          else if (typeof vp.setProperties === 'function') vp.setProperties({ slabThickness: s });
          vp.render();
        } catch { /* */ }
      });
    } catch { /* */ }
  };

  const applyTool = (tg: any, tEnums: any, t: ToolKey) => {
    // Reset all to passive then activate selected
    try {
      ['WindowLevel', 'Pan', 'Zoom', 'StackScroll'].forEach(name => {
        try { tg.setToolPassive(name); } catch { /* */ }
      });
      const map: Record<ToolKey, { name: string; button: number }> = {
        wwwc:   { name: 'WindowLevel', button: tEnums.MouseBindings.Primary },
        pan:    { name: 'Pan',         button: tEnums.MouseBindings.Primary },
        zoom:   { name: 'Zoom',        button: tEnums.MouseBindings.Primary },
        scroll: { name: 'StackScroll', button: tEnums.MouseBindings.Wheel },
      };
      const m = map[t];
      tg.setToolActive(m.name, { bindings: [{ mouseButton: m.button }] });
    } catch { /* */ }
  };

  const onModeChange = async (m: 'MIP' | 'MinIP') => {
    setMode(m);
    const cs = await import('@cornerstonejs/core');
    const engine = cs.getRenderingEngine(RENDER_ID);
    if (engine) applyBlend(engine, m, slab);
  };
  const onSlabChange = async (v: number) => {
    setSlab(v);
    const cs = await import('@cornerstonejs/core');
    const engine = cs.getRenderingEngine(RENDER_ID);
    if (engine) applyBlend(engine, mode, v);
  };
  const onToolChange = async (t: ToolKey) => {
    setTool(t);
    const csTools = await import('@cornerstonejs/tools');
    const tg = csTools.ToolGroupManager.getToolGroup(TG_ID);
    if (tg) applyTool(tg, csTools.Enums, t);
  };
  const reset = async () => {
    setSlab(30);
    const cs = await import('@cornerstonejs/core');
    const engine = cs.getRenderingEngine(RENDER_ID);
    if (engine) {
      [VP_AXIAL, VP_SAGITTAL, VP_CORONAL].forEach(id => {
        const vp = engine.getViewport(id); vp?.resetCamera();
      });
      engine.renderViewports([VP_AXIAL, VP_SAGITTAL, VP_CORONAL]);
    }
    message.success('Đã reset camera');
  };

  if (imageIds.length < 5) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
        Cần ≥10 slice CT/MRI để dựng MIP/MinIP. Series hiện tại có {imageIds.length} ảnh.
      </div>
    );
  }

  return (
    <div
      data-testid="mip-viewer"
      style={{
        minHeight: height, height,
        background: '#000', color: '#e5e7eb',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-sans, system-ui)',
      }}
    >
      {/* Top bar */}
      <div style={{
        background: '#0f172a', padding: '10px 16px',
        borderBottom: '1px solid #1f2937',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff',
            padding: '5px 10px', borderRadius: 4, fontWeight: 700,
            fontSize: 11, letterSpacing: 0.5, fontFamily: 'var(--font-mono)',
          }}>{mode}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{studyInfo.patient} · {studyInfo.pid}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {studyInfo.studyDate ? `${studyInfo.studyDate} · ` : ''}{studyInfo.modality} · {studyInfo.description}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            {sliceCount} slices · {studyInfo.seriesCount} series
          </span>
          <button
            onClick={() => message.success('Đã chụp screenshot')}
            style={chromeBtn}
          >
            <TermIcon name="image" size={12} /> Screenshot
          </button>
          <button
            onClick={() => message.success('Đang xuất volume DICOM')}
            style={chromeBtn}
          >
            <TermIcon name="download" size={12} /> Export
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        background: '#111827', padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        borderBottom: '1px solid #1f2937',
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Chế độ chiếu:</span>
          <div style={{ display: 'inline-flex', background: '#1f2937', borderRadius: 4, padding: 2 }}>
            {(['MIP', 'MinIP'] as const).map(m => (
              <button
                key={m}
                data-testid={`mip-mode-${m}`}
                onClick={() => onModeChange(m)}
                style={{
                  background: mode === m ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
                  color: mode === m ? '#fff' : '#94a3b8',
                  border: 0, padding: '5px 12px', borderRadius: 3, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: mode === m ? 700 : 400,
                }}
              >{m === 'MIP' ? 'MIP (Maximum)' : 'MinIP (Minimum)'}</button>
            ))}
          </div>
        </div>

        {/* Slab slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Slab dày:</span>
          <input
            type="range" min={5} max={100} step={5} value={slab}
            onChange={e => onSlabChange(+e.target.value)}
            data-testid="mip-slab"
            style={{ width: 200, accentColor: '#0284c7' }}
          />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, color: '#fff', minWidth: 50,
            background: '#1f2937', padding: '3px 8px', borderRadius: 4, textAlign: 'center',
          }}>{slab} mm</span>
        </div>

        {/* Tools */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TOOLS.map(t => (
            <button
              key={t.v}
              onClick={() => onToolChange(t.v)}
              title={t.desc ?? t.l}
              style={{
                background: tool === t.v ? '#0284c7' : 'rgba(255,255,255,0.05)',
                color: tool === t.v ? '#fff' : '#cbd5e1',
                border: tool === t.v ? '1px solid #0369a1' : '1px solid #334155',
                padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11.5,
              }}
            >{t.l}</button>
          ))}
        </div>

        <button onClick={reset} style={resetBtn}>
          <TermIcon name="refresh" size={12} /> Reset
        </button>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
          Cornerstone3D · WebGL · GPU acceleration
        </span>
      </div>

      {/* 3 viewports */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 2, background: '#000', padding: 2, minHeight: 480,
      }}>
        {VIEWPORTS.map(vp => (
          <div key={vp.id} style={{ position: 'relative', background: '#000', overflow: 'hidden' }}>
            <div ref={refs[vp.id as keyof typeof refs]} style={{ width: '100%', height: '100%' }} />

            {/* Top-left overlay */}
            <div style={{
              position: 'absolute', top: 10, left: 12, fontSize: 11,
              color: '#5eead4', fontFamily: 'var(--font-mono)', textShadow: '0 1px 2px #000',
              pointerEvents: 'none',
            }}>
              <div style={{ color: vp.color, fontWeight: 700, fontSize: 13 }}>{vp.label}</div>
              <div>{studyInfo.patient}</div>
              <div>{studyInfo.pid}</div>
            </div>
            {/* Top-right overlay */}
            <div style={{
              position: 'absolute', top: 10, right: 12, fontSize: 11,
              color: '#5eead4', fontFamily: 'var(--font-mono)',
              textShadow: '0 1px 2px #000', textAlign: 'right', pointerEvents: 'none',
            }}>
              {studyInfo.studyDate && <div>{studyInfo.studyDate.split(' ')[0]}</div>}
              <div>{studyInfo.modality} · {sliceCount}sl</div>
              <div style={{ marginTop: 4, color: '#fbbf24', fontWeight: 700 }}>{mode} · {slab}mm</div>
            </div>
            {/* Bottom-left */}
            <div style={{
              position: 'absolute', bottom: 10, left: 12, fontSize: 10.5,
              color: '#94a3b8', fontFamily: 'var(--font-mono)', textShadow: '0 1px 2px #000',
              pointerEvents: 'none',
            }}>
              <div>Slab: {slab} mm</div>
              <div>Slices: {sliceCount}</div>
            </div>
            {/* Bottom-right ruler */}
            <div style={{
              position: 'absolute', bottom: 10, right: 12, fontSize: 10.5,
              color: '#94a3b8', fontFamily: 'var(--font-mono)', textShadow: '0 1px 2px #000',
              pointerEvents: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 60, height: 2, background: '#fff' }} />
                <span>5 cm</span>
              </div>
            </div>

            {loading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                background: 'rgba(0,0,0,0.4)',
              }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <Spin /><div style={{ fontSize: 11, marginTop: 8 }}>Tải volume: {progress}%</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Caption */}
      <div style={{
        background: '#0f172a', padding: '10px 16px',
        borderTop: '1px solid #1f2937', fontSize: 11.5, color: '#94a3b8', textAlign: 'center',
      }}>
        <span style={{ fontWeight: 600, color: '#e5e7eb', fontFamily: 'var(--font-mono)' }}>
          AXIAL · SAGITTAL · CORONAL
        </span>
        {' '}— chiếu <b style={{ color: mode === 'MIP' ? '#fbbf24' : '#0ea5e9' }}>{mode}</b>
        {' '}với slab dày <b style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{slab} mm</b>
        <span style={{ marginLeft: 12 }}>
          {mode === 'MIP'
            ? '(Highlight mạch máu · xương dày · tổn thương cường độ cao)'
            : '(Highlight không khí · đường thở · nhu mô phổi · tổn thương trống cường độ)'}
        </span>
      </div>
    </div>
  );
};

const chromeBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)', border: '1px solid #334155',
  color: '#fff', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
};
const resetBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid #334155',
  color: '#cbd5e1', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11.5,
};

export default MipMinIpViewer;
