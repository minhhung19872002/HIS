/**
 * M3.5 — Canvas drawing pad cho BS vẽ sơ đồ phẫu thuật.
 *
 * HTML5 native canvas (không dùng react-konva để giữ bundle nhẹ).
 * Pen / eraser tool, 5 màu, 3 độ dày, clear + save base64 PNG.
 * Save callback nhận base64 data URL → backend lưu vào `SurgeryRecord.DiagramImage`
 * hoặc attach vào tường trình PTTT.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Radio, Slider, Space, Tooltip, Tag } from 'antd';
import {
  ClearOutlined,
  SaveOutlined,
  UndoOutlined,
  HighlightOutlined,
  EditOutlined,
} from '@ant-design/icons';

interface Props {
  /** Base64 image to pre-load (edit existing diagram). */
  initialImage?: string | null;
  /** Background image (e.g., anatomy outline PNG placed in public/anatomy/). */
  backgroundImage?: string;
  width?: number;
  height?: number;
  onSave?: (base64: string) => void;
  disabled?: boolean;
}

const COLORS = ['#ff4d4f', '#1677ff', '#52c41a', '#faad14', '#000000'];

type Tool = 'pen' | 'eraser';

export default function SurgeryDrawingPad({
  initialImage,
  backgroundImage,
  width = 600,
  height = 400,
  onSave,
  disabled,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [thickness, setThickness] = useState(3);
  const [hasDrawing, setHasDrawing] = useState(false);

  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    return c ? c.getContext('2d') : null;
  }, []);

  // Initial setup: load bg + initialImage
  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    const drawInitial = () => {
      if (initialImage) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, width, height);
        img.src = initialImage;
      }
    };

    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        bgRef.current = img;
        drawInitial();
      };
      img.onerror = drawInitial;
      img.src = backgroundImage;
    } else {
      drawInitial();
    }
  }, [initialImage, backgroundImage, width, height, getCtx]);

  const pushHistory = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, width, height);
      historyRef.current.push(snap);
      if (historyRef.current.length > 20) historyRef.current.shift();
    } catch {
      // ignore taint errors
    }
  }, [getCtx, width, height]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    pushHistory();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current || disabled) return;
    const ctx = getCtx();
    if (!ctx || !lastPointRef.current) return;
    const pt = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = tool === 'eraser' ? '#fff' : color;
    ctx.lineWidth = tool === 'eraser' ? thickness * 3 : thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPointRef.current = pt;
    setHasDrawing(true);
  };

  const end = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleUndo = () => {
    const ctx = getCtx();
    if (!ctx) return;
    const last = historyRef.current.pop();
    if (last) ctx.putImageData(last, 0, 0);
    if (historyRef.current.length === 0) setHasDrawing(false);
  };

  const handleClear = () => {
    const ctx = getCtx();
    if (!ctx) return;
    pushHistory();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    if (bgRef.current) ctx.drawImage(bgRef.current, 0, 0, width, height);
    setHasDrawing(false);
  };

  const handleSave = () => {
    const c = canvasRef.current;
    if (!c) return;
    onSave?.(c.toDataURL('image/png'));
  };

  return (
    <div data-testid="surgery-drawing-pad">
      <Space style={{ marginBottom: 8 }} wrap>
        <Radio.Group value={tool} onChange={(e) => setTool(e.target.value)} optionType="button" size="small">
          <Radio.Button value="pen"><EditOutlined /> Bút</Radio.Button>
          <Radio.Button value="eraser"><HighlightOutlined /> Tẩy</Radio.Button>
        </Radio.Group>
        <Space size={4}>
          {COLORS.map((c) => (
            <Tooltip key={c} title={c}>
              <div
                onClick={() => { setColor(c); setTool('pen'); }}
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: c,
                  borderRadius: '50%',
                  border: color === c ? '3px solid #333' : '1px solid #ccc',
                  cursor: 'pointer',
                }}
              />
            </Tooltip>
          ))}
        </Space>
        <div style={{ width: 140 }}>
          <Slider min={1} max={10} value={thickness} onChange={setThickness} />
        </div>
        <Tag>Dày: {thickness}</Tag>
        <Button icon={<UndoOutlined />} size="small" onClick={handleUndo}>Hoàn tác</Button>
        <Button icon={<ClearOutlined />} size="small" onClick={handleClear} danger>Xóa hết</Button>
        <Button type="primary" icon={<SaveOutlined />} size="small" onClick={handleSave} disabled={!hasDrawing}>
          Lưu sơ đồ
        </Button>
      </Space>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          maxWidth: width,
          height: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : tool === 'eraser' ? 'cell' : 'crosshair',
          touchAction: 'none',
          backgroundColor: '#fff',
        }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </div>
  );
}
