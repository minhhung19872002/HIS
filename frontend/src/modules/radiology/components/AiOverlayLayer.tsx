/**
 * AiOverlayLayer — vẽ bounding box + heatmap lên trên DICOM viewport.
 *
 * Đặt absolute trong cùng container `position: relative` với CornerstoneViewer
 * (xem DicomViewer.tsx). pointer-events: none để không chặn tương tác chuột
 * (W/L, Pan, Zoom của Cornerstone vẫn hoạt động bình thường).
 *
 * Phối màu theo severity:
 *   score >= 0.7 → đỏ
 *   0.4–0.7      → cam
 *   < 0.4        → xám (ẩn mặc định)
 *
 * Heatmap render: bilinear interpolation từ grid thô (7×7 hoặc 14×14) lên
 * canvas size, mỗi cell alpha-blend với màu severity. Có thể chồng nhiều label
 * cùng lúc — alpha cộng dồn nên BS nhìn thấy "vùng nóng" overlap.
 */

import { useEffect, useRef } from 'react';
import type { AiLabel, AiBoundingBox, AiHeatmap } from '../api/aiLabeling';

interface Props {
  labels: AiLabel[];
  /** Width and height of the host viewport, in CSS pixels. */
  width: number;
  height: number;
  /**
   * Rendered DICOM image bounds in the canvas (CSS px). When provided,
   * bbox/heatmap follow the image during pan/zoom. When null, overlay
   * falls back to full-viewport drawing (Phase 2 behavior).
   */
  imageRect?: { x: number; y: number; w: number; h: number } | null;
  /** Toggle heatmap layer (BS có thể tắt heatmap mà vẫn giữ bbox). */
  showHeatmap?: boolean;
  /** Toggle bbox layer. */
  showBbox?: boolean;
  /** Hide labels with score < threshold (default 0.4 — bỏ qua các nhãn yếu). */
  minScore?: number;
}

function severityColor(score: number): { r: number; g: number; b: number } {
  if (score >= 0.7) return { r: 220, g: 38, b: 38 };   // red-600
  if (score >= 0.4) return { r: 234, g: 88, b: 12 };   // orange-600
  return { r: 156, g: 163, b: 175 };                   // gray-400
}

/** Bilinear interpolation from a coarse heatmap grid into pixel space.
 *  rect = (offsetX, offsetY, drawW, drawH) — where in the canvas to render. */
function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  hm: AiHeatmap,
  color: { r: number; g: number; b: number },
  rect: { x: number; y: number; w: number; h: number },
): void {
  // Render onto an offscreen canvas at low res then scale up — browser smooths.
  const off = document.createElement('canvas');
  off.width = hm.width;
  off.height = hm.height;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;
  const img = offCtx.createImageData(hm.width, hm.height);
  for (let i = 0; i < hm.width * hm.height; i++) {
    const v = Math.max(0, Math.min(1, hm.data[i] ?? 0));
    img.data[i * 4 + 0] = color.r;
    img.data[i * 4 + 1] = color.g;
    img.data[i * 4 + 2] = color.b;
    // Alpha ramps from 0 (transparent) at v=0 to ~150 at v=1.
    img.data[i * 4 + 3] = Math.round(v * 150);
  }
  offCtx.putImageData(img, 0, 0);
  // Smooth upscale onto main canvas at the image rect.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, rect.x, rect.y, rect.w, rect.h);
}

function drawBbox(
  ctx: CanvasRenderingContext2D,
  bb: AiBoundingBox,
  label: string,
  score: number,
  color: { r: number; g: number; b: number },
  rect: { x: number; y: number; w: number; h: number },
): void {
  const x = rect.x + bb.x * rect.w;
  const y = rect.y + bb.y * rect.h;
  const w = bb.w * rect.w;
  const h = bb.h * rect.h;
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
  ctx.strokeRect(x, y, w, h);

  const text = `${label} ${Math.round(score * 100)}%`;
  ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
  const textW = ctx.measureText(text).width + 8;
  const textH = 16;
  // Label background sits above the box (or below if box near top).
  const ty = y > textH + 2 ? y - textH - 2 : y + 2;
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.85)`;
  ctx.fillRect(x, ty, textW, textH);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x + 4, ty + 12);
}

export default function AiOverlayLayer({
  labels,
  width,
  height,
  imageRect,
  showHeatmap = true,
  showBbox = true,
  minScore = 0.4,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Clip to the visible viewport so overlay never bleeds outside on extreme pan.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    // Pick render rect: use imageRect when provided (Phase 2-follow-pan mode),
    // else fall back to full viewport (backward compat).
    const rect = imageRect && imageRect.w > 0 && imageRect.h > 0
      ? imageRect
      : { x: 0, y: 0, w: width, h: height };

    // Filter + sort: weakest first so strong labels overlay on top.
    const visible = labels
      .filter((l) => l.score >= minScore)
      .sort((a, b) => a.score - b.score);

    if (showHeatmap) {
      for (const l of visible) {
        if (l.heatmap) drawHeatmap(ctx, l.heatmap, severityColor(l.score), rect);
      }
    }
    if (showBbox) {
      for (const l of visible) {
        if (l.bbox) drawBbox(ctx, l.bbox, l.labelVi || l.label, l.score, severityColor(l.score), rect);
      }
    }
    ctx.restore();
  }, [labels, width, height, imageRect, showHeatmap, showBbox, minScore]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="ai-overlay-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
