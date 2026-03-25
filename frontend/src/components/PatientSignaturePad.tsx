import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button, Space, Card } from 'antd';
import { ClearOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';

interface PatientSignaturePadProps {
  onSave?: (base64: string) => void;
  width?: number;
  height?: number;
  title?: string;
  disabled?: boolean;
}

const PatientSignaturePad: React.FC<PatientSignaturePadProps> = ({
  onSave,
  width = 400,
  height = 200,
  title = 'Chu ky benh nhan',
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return ctx;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw guide line
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 40);
    ctx.lineTo(canvas.width - 20, canvas.height - 40);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasSignature(false);
  }, [getContext]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    clearCanvas();
  }, [width, height, clearCanvas]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    const point = getPoint(e);
    lastPoint.current = point;
    const ctx = getContext();
    if (ctx) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const ctx = getContext();
    if (!ctx) return;
    const point = getPoint(e);
    if (lastPoint.current) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPoint.current = point;
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const base64 = canvas.toDataURL('image/png');
    onSave?.(base64);
  };

  const handleClear = () => {
    clearCanvas();
  };

  return (
    <Card
      size="small"
      title={title}
      styles={{ body: { padding: 8 } }}
      extra={
        <Space orientation="horizontal" size={4}>
          <Button size="small" icon={<UndoOutlined />} onClick={handleClear} disabled={!hasSignature || disabled}>
            Xoa
          </Button>
          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!hasSignature || disabled}>
            Luu chu ky
          </Button>
        </Space>
      }
    >
      <div
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'crosshair',
          touchAction: 'none',
          userSelect: 'none',
          display: 'inline-block',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width, height }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
      </div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
        Su dung chuot hoac cam ung de ky. Nhan "Luu chu ky" khi hoan tat.
      </div>
    </Card>
  );
};

export default PatientSignaturePad;
