import React, { useEffect, useRef, useState } from 'react';
import { Button, Segmented, Slider, Space, Spin, Tooltip, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

/**
 * MIP (Maximum Intensity Projection) + MinIP viewer using Cornerstone3D VolumeViewport
 * blend modes. NangCap24 Gap #7 — PACS II.2.4.
 *
 * MIP = chiếu cường độ MAX dọc theo tia → highlight mạch máu, xương dày
 * MinIP = chiếu cường độ MIN → highlight không khí (đường thở), nhu mô phổi
 *
 * Slab thickness slider điều chỉnh độ dày lớp chiếu (5-100mm).
 */

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
}

const RENDER_ID = 'his-mip-engine';
const TG_ID = 'his-mip-toolgroup';
const VP_AXIAL = 'his-mip-axial';
const VP_SAGITTAL = 'his-mip-sagittal';
const VP_CORONAL = 'his-mip-coronal';

const MipMinIpViewer: React.FC<Props> = ({ imageIds, height = '70vh', defaultMode = 'MIP' }) => {
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'MIP' | 'MinIP'>(defaultMode);
  const [slabMm, setSlabMm] = useState(30);
  const [progress, setProgress] = useState(0);

  const volumeId = React.useMemo(
    () => `cornerstoneStreamingImageVolume:his-mip-${imageIds.length}-${imageIds[0]?.slice(-12) || 'empty'}`,
    [imageIds]);

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
        const {
          RenderingEngine, Enums, volumeLoader, setVolumesForViewports,
        } = cs;
        const { ToolGroupManager, addTool, Enums: tEnums,
          WindowLevelTool, PanTool, ZoomTool, StackScrollTool,
        } = csTools;

        addTool(WindowLevelTool); addTool(PanTool); addTool(ZoomTool); addTool(StackScrollTool);

        const volume: any = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });
        if (cancelled) return;

        renderingEngine = new RenderingEngine(RENDER_ID);
        renderingEngine.setViewports([
          { viewportId: VP_AXIAL, element: axialRef.current!, type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.AXIAL, background: [0, 0, 0] } },
          { viewportId: VP_SAGITTAL, element: sagittalRef.current!, type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.SAGITTAL, background: [0, 0, 0] } },
          { viewportId: VP_CORONAL, element: coronalRef.current!, type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.CORONAL, background: [0, 0, 0] } },
        ]);

        volume.load((evt: { numFrames: number; framesProcessed: number }) => {
          if (cancelled || !evt) return;
          setProgress(Math.round((evt.framesProcessed / Math.max(1, evt.numFrames)) * 100));
        });

        await setVolumesForViewports(renderingEngine, [{ volumeId }],
          [VP_AXIAL, VP_SAGITTAL, VP_CORONAL]);

        // Apply blend mode = MAXIMUM_INTENSITY_BLEND or MINIMUM_INTENSITY_BLEND
        applyBlendMode(renderingEngine, mode, slabMm);

        let tg = ToolGroupManager.getToolGroup(TG_ID);
        if (!tg) tg = ToolGroupManager.createToolGroup(TG_ID);
        if (!tg) throw new Error('Failed to create MIP tool group');
        tg.addTool(WindowLevelTool.toolName);
        tg.addTool(PanTool.toolName);
        tg.addTool(ZoomTool.toolName);
        tg.addTool(StackScrollTool.toolName);
        tg.addViewport(VP_AXIAL, RENDER_ID);
        tg.addViewport(VP_SAGITTAL, RENDER_ID);
        tg.addViewport(VP_CORONAL, RENDER_ID);
        tg.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: tEnums.MouseBindings.Primary }] });
        tg.setToolActive(PanTool.toolName, { bindings: [{ mouseButton: tEnums.MouseBindings.Auxiliary }] });
        tg.setToolActive(ZoomTool.toolName, { bindings: [{ mouseButton: tEnums.MouseBindings.Secondary }] });
        tg.setToolActive(StackScrollTool.toolName, { bindings: [{ mouseButton: tEnums.MouseBindings.Wheel }] });

        renderingEngine.renderViewports([VP_AXIAL, VP_SAGITTAL, VP_CORONAL]);
        if (!cancelled) setLoading(false);
      } catch (err) {
        console.warn('[MipMinIpViewer] init failed:', err);
        if (!cancelled) {
          setLoading(false);
          message.error('Không khởi tạo được MIP/MinIP viewer');
        }
      }
    })();

    return () => {
      cancelled = true;
      try { renderingEngine?.destroy(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIds, volumeId]);

  const applyBlendMode = async (
    engine: import('@cornerstonejs/core').RenderingEngine,
    targetMode: 'MIP' | 'MinIP',
    slab: number
  ) => {
    try {
      const cs = await import('@cornerstonejs/core');
      const { Enums } = cs;
      const blendMode = targetMode === 'MIP'
        ? Enums.BlendModes.MAXIMUM_INTENSITY_BLEND
        : Enums.BlendModes.MINIMUM_INTENSITY_BLEND;

      [VP_AXIAL, VP_SAGITTAL, VP_CORONAL].forEach((vpId) => {
        const vp = engine.getViewport(vpId) as any;
        if (!vp) return;
        try {
          vp.setBlendMode(blendMode);
          if (typeof vp.setSlabThickness === 'function') {
            vp.setSlabThickness(slab);
          } else if (typeof vp.setProperties === 'function') {
            vp.setProperties({ slabThickness: slab });
          }
          vp.render();
        } catch (e) {
          console.warn(`Apply blend mode on ${vpId} failed`, e);
        }
      });
    } catch (e) {
      console.warn('applyBlendMode error', e);
    }
  };

  const onModeChange = async (m: 'MIP' | 'MinIP') => {
    setMode(m);
    const cs = await import('@cornerstonejs/core');
    const engine = cs.getRenderingEngine(RENDER_ID);
    if (engine) await applyBlendMode(engine, m, slabMm);
  };

  const onSlabChange = async (value: number) => {
    setSlabMm(value);
    const cs = await import('@cornerstonejs/core');
    const engine = cs.getRenderingEngine(RENDER_ID);
    if (engine) await applyBlendMode(engine, mode, value);
  };

  const reset = async () => {
    try {
      const cs = await import('@cornerstonejs/core');
      const engine = cs.getRenderingEngine(RENDER_ID);
      if (!engine) return;
      [VP_AXIAL, VP_SAGITTAL, VP_CORONAL].forEach((id) => {
        const v = engine.getViewport(id);
        v?.resetCamera();
      });
      engine.renderViewports([VP_AXIAL, VP_SAGITTAL, VP_CORONAL]);
    } catch {}
  };

  if (imageIds.length < 5) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
        Cần ≥10 slice CT/MRI để dựng MIP/MinIP. Series hiện tại có {imageIds.length} ảnh.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="mip-viewer">
      <Space wrap size={8}>
        <span style={{ fontSize: 12, color: '#888' }}>Chế độ chiếu:</span>
        <Segmented
          value={mode}
          onChange={(v) => onModeChange(v as 'MIP' | 'MinIP')}
          options={[
            { label: 'MIP (Maximum)', value: 'MIP' },
            { label: 'MinIP (Minimum)', value: 'MinIP' },
          ]}
          data-testid="mip-mode-toggle"
        />
        <span style={{ fontSize: 12, color: '#888' }}>Slab dày (mm):</span>
        <div style={{ width: 200 }}>
          <Slider
            min={5} max={100} step={5}
            value={slabMm}
            onChange={onSlabChange}
            tooltip={{ formatter: (v) => `${v}mm` }}
          />
        </div>
        <Tooltip title="Reset camera">
          <Button size="small" icon={<ReloadOutlined />} onClick={reset}>Reset</Button>
        </Tooltip>
        {loading && <Spin size="small" />}
        {progress > 0 && progress < 100 && <span style={{ fontSize: 11, color: '#888' }}>Tải volume: {progress}%</span>}
      </Space>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 4,
        background: '#000',
        height,
      }}>
        <div ref={axialRef} style={{ width: '100%', height: '100%' }} />
        <div ref={sagittalRef} style={{ width: '100%', height: '100%' }} />
        <div ref={coronalRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>
        AXIAL • SAGITTAL • CORONAL  —  {mode} với slab {slabMm}mm
        {mode === 'MIP'
          ? ' (Highlight mạch máu, xương dày, tổn thương cường độ cao)'
          : ' (Highlight không khí, đường thở, nhu mô phổi)'}
      </div>
    </div>
  );
};

export default MipMinIpViewer;
