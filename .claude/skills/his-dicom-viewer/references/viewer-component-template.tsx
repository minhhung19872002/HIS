// TEMPLATE — HIS Cornerstone3D viewer component (rút gọn). Copy vào components/<Name>Viewer.tsx.
// Reuse CornerstoneViewer.tsx có sẵn trước khi viết mới (core-reusable-code).
import React, { useEffect, useRef, useState } from 'react';

// API origin để prepend cho path PACS proxy tương đối (tránh resolve về Vercel → 404)
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

// imageId wadouri trỏ về backend PACS proxy (proxy Orthanc, AllowAnonymous)
const toImageId = (instanceUrl: string) =>
  `wadouri:${instanceUrl.startsWith('http') ? instanceUrl : API_ORIGIN + instanceUrl}`;

interface Props {
  imageUrls: string[];                 // từ RISComplete/pacs/series/{uid}/images → instance file/rendered URLs
  overlay?: (size: { w: number; h: number }) => React.ReactNode;  // slot vẽ bbox/heatmap (nếu cần)
}

const XViewer: React.FC<Props> = ({ imageUrls, overlay }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (imageUrls.length === 0) { setErr('Không có ảnh DICOM'); setLoading(false); return; }
    let engine: any;
    (async () => {
      try {
        // dynamic import — engine nặng, chỉ tải khi mở viewer
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
        // ToolGroup: WindowLevel(left)/Pan(middle)/Zoom(right)/StackScroll(wheel) — xem CornerstoneViewer.tsx
        setLoading(false);
      } catch (e: any) {
        setErr('Lỗi tải DICOM viewer'); setLoading(false);   // core-error-loading-state
      }
    })();
    return () => { try { engine?.destroy?.(); } catch { /* noop */ } };
  }, [imageUrls]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <div ref={elRef} style={{ width: '100%', height: '100%' }} />
      {loading && <div style={{ position: 'absolute', inset: 0, color: '#fff' }}>Đang tải volume…</div>}
      {err && <div style={{ position: 'absolute', inset: 0, color: '#f66' }}>{err}</div>}
      {overlay && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {overlay({ w: elRef.current?.clientWidth ?? 0, h: elRef.current?.clientHeight ?? 0 })}
      </div>}
    </div>
  );
};
export default XViewer;

/* Lưu ý:
   - MIP/MinIP: VolumeViewport + blendMode (MAXIMUM_INTENSITY_BLEND / MINIMUM_INTENSITY_BLEND).
   - MPR/3D: volumeLoader.createAndCacheVolume → setVolumesForViewports → volume.load() (ĐÚNG thứ tự).
   - Cine: loop qua vp.setImageIdIndex theo timer.
   - Mammo: hanging protocol CC/MLO + magnify + invert (viewport.setProperties).
   - vite.config: worker.format:'es' + optimizeDeps.exclude codec + manualChunk vendor-cornerstone. */
