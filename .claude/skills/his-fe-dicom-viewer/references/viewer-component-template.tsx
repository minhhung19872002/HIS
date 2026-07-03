// TEMPLATE — HIS Cornerstone3D viewer component (condensed). Copy into components/<Name>Viewer.tsx.
// Reuse the existing CornerstoneViewer.tsx before writing a new one (core-reusable-code).
import React, { useEffect, useRef, useState } from 'react';

// The API origin to prepend for a relative PACS proxy path (avoid resolving to Vercel → 404)
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

// a wadouri imageId pointing to the backend PACS proxy (proxies Orthanc, AllowAnonymous)
const toImageId = (instanceUrl: string) =>
  `wadouri:${instanceUrl.startsWith('http') ? instanceUrl : API_ORIGIN + instanceUrl}`;

interface Props {
  imageUrls: string[];                 // from RISComplete/pacs/series/{uid}/images → instance file/rendered URLs
  overlay?: (size: { w: number; h: number }) => React.ReactNode;  // a slot to draw a bbox/heatmap (if needed)
}

const XViewer: React.FC<Props> = ({ imageUrls, overlay }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (imageUrls.length === 0) { setErr('No DICOM images'); setLoading(false); return; }
    let engine: any;
    (async () => {
      try {
        // dynamic import — the engine is heavy, load only when the viewer opens
        const cs = await import('@cornerstonejs/core');
        const tools = await import('@cornerstonejs/tools');
        await cs.init(); await tools.init();
        const { RenderingEngine, Enums } = cs;
        engine = new RenderingEngine('his-engine');
        const viewportId = 'his-vp';
        engine.enableElement({ viewportId, type: Enums.ViewportType.STACK, element: elRef.current! });
        const vp: any = engine.getViewport(viewportId);
        const imageIds = imageUrls.map(toImageId);
        await vp.setStack(imageIds, 0);
        vp.render();
        // ToolGroup: WindowLevel(left)/Pan(middle)/Zoom(right)/StackScroll(wheel) — see CornerstoneViewer.tsx
        setLoading(false);
      } catch (e: any) {
        setErr('Error loading the DICOM viewer'); setLoading(false);   // core-error-loading-state
      }
    })();
    return () => { try { engine?.destroy?.(); } catch { /* noop */ } };
  }, [imageUrls]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <div ref={elRef} style={{ width: '100%', height: '100%' }} />
      {loading && <div style={{ position: 'absolute', inset: 0, color: '#fff' }}>Loading volume…</div>}
      {err && <div style={{ position: 'absolute', inset: 0, color: '#f66' }}>{err}</div>}
      {overlay && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {overlay({ w: elRef.current?.clientWidth ?? 0, h: elRef.current?.clientHeight ?? 0 })}
      </div>}
    </div>
  );
};
export default XViewer;

/* Notes:
   - MIP/MinIP: VolumeViewport + blendMode (MAXIMUM_INTENSITY_BLEND / MINIMUM_INTENSITY_BLEND).
   - MPR/3D: volumeLoader.createAndCacheVolume → setVolumesForViewports → volume.load() (CORRECT order).
   - Cine: loop over vp.setImageIdIndex on a timer.
   - Mammo: hanging protocol CC/MLO + magnify + invert (viewport.setProperties).
   - vite.config: worker.format:'es' + optimizeDeps.exclude codec + manualChunk vendor-cornerstone. */
