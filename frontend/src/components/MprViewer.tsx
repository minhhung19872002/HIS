import React, { useEffect, useRef, useState } from 'react';
import { Button, Select, Space, Tooltip, Spin, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

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
  imageIds: string[];      // wadouri:URL[] — must be ≥10 slices for MPR to be meaningful
  height?: number | string;
  onError?: (e: unknown) => void;
}

const MPR_PRESETS = [
  'CT-Bone', 'CT-Lung', 'CT-Soft-Tissue', 'CT-MIP', 'CT-Cardiac',
  'CT-Chest-Contrast-Enhanced', 'CT-Coronary-Arteries', 'CT-Pulmonary-Arteries',
  'MR-Default', 'MR-T1', 'MR-MIP',
];

const RENDER_ID = 'his-mpr-engine';
const TG_ID = 'his-mpr-toolgroup';
const VP_AXIAL = 'his-mpr-axial';
const VP_SAGITTAL = 'his-mpr-sagittal';
const VP_CORONAL = 'his-mpr-coronal';
const VP_3D = 'his-mpr-3d';

const MprViewer: React.FC<Props> = ({ imageIds, height = '70vh', onError }) => {
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const vol3dRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vrPreset, setVrPreset] = useState('CT-Bone');
  const [progress, setProgress] = useState(0);

  // Stable volume ID per imageIds set (so React strict-mode double-init reuses cached volume)
  const volumeId = React.useMemo(() => `cornerstoneStreamingImageVolume:his-vol-${imageIds.length}-${imageIds[0]?.slice(-12) || 'empty'}`, [imageIds]);

  useEffect(() => {
    if (imageIds.length < 5) {
      setLoading(false);
      return;
    }
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
        const {
          ToolGroupManager, addTool, Enums: tEnums,
          WindowLevelTool, PanTool, ZoomTool, StackScrollTool, CrosshairsTool, TrackballRotateTool,
        } = csTools;

        addTool(WindowLevelTool); addTool(PanTool); addTool(ZoomTool);
        addTool(StackScrollTool); addTool(CrosshairsTool); addTool(TrackballRotateTool);

        // Create + cache the volume from imageIds. The streaming loader fetches
        // slices on demand; we wait for the first batch to render before showing.
        const volume: any = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });
        if (cancelled) return;

        renderingEngine = new RenderingEngine(RENDER_ID);
        renderingEngine.setViewports([
          {
            viewportId: VP_AXIAL, element: axialRef.current!,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.AXIAL, background: [0, 0, 0] },
          },
          {
            viewportId: VP_SAGITTAL, element: sagittalRef.current!,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.SAGITTAL, background: [0, 0, 0] },
          },
          {
            viewportId: VP_CORONAL, element: coronalRef.current!,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.CORONAL, background: [0, 0, 0] },
          },
          {
            viewportId: VP_3D, element: vol3dRef.current!,
            type: Enums.ViewportType.VOLUME_3D,
            defaultOptions: { orientation: Enums.OrientationAxis.CORONAL, background: [0, 0, 0] },
          },
        ]);

        // Begin streaming + attach to viewports. load() returns a promise that
        // resolves when *all* slices are loaded — we render after first batch.
        volume.load((evt: { numFrames: number; framesProcessed: number }) => {
          if (cancelled || !evt) return;
          setProgress(Math.round((evt.framesProcessed / Math.max(1, evt.numFrames)) * 100));
        });

        await setVolumesForViewports(
          renderingEngine,
          [{ volumeId }],
          [VP_AXIAL, VP_SAGITTAL, VP_CORONAL, VP_3D],
        );

        // 3D viewport: apply VR preset
        const vp3d = renderingEngine.getViewport(VP_3D) as import('@cornerstonejs/core').VolumeViewport3D;
        try {
          const presets = await import('@cornerstonejs/core');
          const utilities = (presets as any).utilities;
          if (utilities?.applyPreset) {
            const presetList = (presets as any).CONSTANTS?.VIEWPORT_PRESETS || [];
            const preset = presetList.find((p: any) => p.name === vrPreset);
            const actor = vp3d.getDefaultActor();
            if (preset && actor) utilities.applyPreset(actor.actor, preset);
          }
        } catch { /* best effort */ }

        // Tool group
        let tg = ToolGroupManager.getToolGroup(TG_ID);
        if (!tg) tg = ToolGroupManager.createToolGroup(TG_ID);
        if (!tg) throw new Error('Failed to create MPR tool group');

        tg.addTool(WindowLevelTool.toolName);
        tg.addTool(PanTool.toolName);
        tg.addTool(ZoomTool.toolName);
        tg.addTool(StackScrollTool.toolName);
        tg.addTool(CrosshairsTool.toolName, { getReferenceLineColor: (id: string) => ({
          [VP_AXIAL]: 'rgb(200, 0, 0)', [VP_SAGITTAL]: 'rgb(0, 200, 0)', [VP_CORONAL]: 'rgb(0, 0, 220)', [VP_3D]: 'rgb(255, 200, 0)',
        }[id] || 'white') });
        tg.addTool(TrackballRotateTool.toolName);

        // MPR viewports get crosshairs + W/L + scroll; 3D gets trackball rotate.
        // Apply per-viewport tool bindings (toolGroup-level setToolActive applies
        // to every viewport in the group, but Crosshairs-vs-TrackballRotate need
        // to be split by viewport).
        tg.addViewport(VP_AXIAL, RENDER_ID);
        tg.addViewport(VP_SAGITTAL, RENDER_ID);
        tg.addViewport(VP_CORONAL, RENDER_ID);
        tg.addViewport(VP_3D, RENDER_ID);

        tg.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: tEnums.MouseBindings.Primary }] });
        tg.setToolActive(PanTool.toolName,         { bindings: [{ mouseButton: tEnums.MouseBindings.Auxiliary }] });
        tg.setToolActive(ZoomTool.toolName,        { bindings: [{ mouseButton: tEnums.MouseBindings.Secondary }] });
        tg.setToolActive(StackScrollTool.toolName, { bindings: [{ mouseButton: tEnums.MouseBindings.Wheel }] });
        // Crosshairs default: enabled on the MPR viewports — left-mouse W/L wins
        // unless user explicitly switches. Keep it passive to draw reference lines
        // but not steal mouse interaction.
        tg.setToolPassive(CrosshairsTool.toolName);

        renderingEngine.renderViewports([VP_AXIAL, VP_SAGITTAL, VP_CORONAL, VP_3D]);
        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      } catch (err) {
        console.warn('[MprViewer] init failed:', err);
        onError?.(err);
        if (!cancelled) {
          setLoading(false);
          message.error('Không khởi tạo được MPR viewer (cần ≥10 slice CT/MRI)');
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        const csTools = (window as any).cornerstoneTools;
        if (csTools) csTools.ToolGroupManager?.destroyToolGroup?.(TG_ID);
      } catch { /* ignore */ }
      try {
        if (renderingEngine) renderingEngine.destroy();
      } catch { /* ignore */ }
    };
  }, [imageIds, volumeId, onError, vrPreset]);

  const applyPreset = async (presetName: string) => {
    try {
      setVrPreset(presetName);
      const cs = await import('@cornerstonejs/core');
      const engine = cs.getRenderingEngine(RENDER_ID);
      if (!engine) return;
      const vp3d = engine.getViewport(VP_3D) as import('@cornerstonejs/core').VolumeViewport3D;
      const utilities = (cs as any).utilities;
      const presetList = (cs as any).CONSTANTS?.VIEWPORT_PRESETS || [];
      const preset = presetList.find((p: any) => p.name === presetName);
      const actor = vp3d.getDefaultActor();
      if (preset && actor && utilities?.applyPreset) {
        utilities.applyPreset(actor.actor, preset);
        vp3d.render();
      }
    } catch (err) { console.warn('applyPreset failed:', err); }
  };

  const reset = async () => {
    try {
      const cs = await import('@cornerstonejs/core');
      const engine = cs.getRenderingEngine(RENDER_ID);
      if (!engine) return;
      [VP_AXIAL, VP_SAGITTAL, VP_CORONAL, VP_3D].forEach((id) => {
        const v = engine.getViewport(id);
        v?.resetCamera();
        (v as any)?.resetProperties?.();
      });
      engine.renderViewports([VP_AXIAL, VP_SAGITTAL, VP_CORONAL, VP_3D]);
    } catch { /* ignore */ }
  };

  if (imageIds.length < 5) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-3, #999)' }}>
        Cần ≥10 slice CT/MRI để dựng MPR. Series hiện tại chỉ có {imageIds.length} ảnh — dùng chế độ 2D StackViewport.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Space wrap size={8}>
        <span style={{ fontSize: 12, color: '#888' }}>VR preset:</span>
        <Select
          size="small"
          value={vrPreset}
          onChange={applyPreset}
          style={{ width: 220 }}
          options={MPR_PRESETS.map((p) => ({ value: p, label: p }))}
        />
        <Tooltip title="Reset camera + W/L cho 4 viewport"><Button size="small" icon={<ReloadOutlined />} onClick={reset}>Reset</Button></Tooltip>
        {loading && <Spin size="small" />}
        {progress > 0 && progress < 100 && <span style={{ fontSize: 11, color: '#888' }}>Tải volume: {progress}%</span>}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
          {imageIds.length} slice · MPR axial/sagittal/coronal + 3D Volume
        </span>
      </Space>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
        gap: 4, height, background: '#000', borderRadius: 4, overflow: 'hidden',
      }}>
        <Quadrant label="AXIAL" color="rgb(220, 80, 80)" elementRef={axialRef} loading={loading} />
        <Quadrant label="SAGITTAL" color="rgb(80, 200, 80)" elementRef={sagittalRef} loading={loading} />
        <Quadrant label="CORONAL" color="rgb(80, 120, 220)" elementRef={coronalRef} loading={loading} />
        <Quadrant label="VOLUME 3D" color="rgb(255, 200, 0)" elementRef={vol3dRef} loading={loading} />
      </div>
      {!ready && !loading && (
        <div style={{ fontSize: 12, color: '#c33' }}>
          MPR khởi tạo thất bại — fallback dùng OHIF iframe hoặc StackViewport 2D.
        </div>
      )}
    </div>
  );
};

const Quadrant: React.FC<{
  label: string;
  color: string;
  elementRef: React.RefObject<HTMLDivElement | null>;
  loading: boolean;
}> = ({ label, color, elementRef, loading }) => (
  <div style={{ position: 'relative', background: '#000', minHeight: 0 }}>
    <div ref={elementRef} style={{ width: '100%', height: '100%', background: '#000' }}
         onContextMenu={(e) => e.preventDefault()} />
    <div style={{
      position: 'absolute', top: 6, left: 8,
      color, fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
      textShadow: '0 1px 2px #000', pointerEvents: 'none',
    }}>{label}</div>
    {loading && (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#fff', fontSize: 12,
      }}>
        Đang dựng…
      </div>
    )}
  </div>
);

export default MprViewer;
