import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Space, Avatar, Typography } from 'antd';
import { CameraOutlined, RedoOutlined, UserOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface WebcamCaptureProps {
  value?: string; // base64 image data URL
  onChange?: (value: string | undefined) => void;
  width?: number;
  height?: number;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  value,
  onChange,
  width = 160,
  height = 200,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  }, []);

  useEffect(() => {
    return () => { stopStream(); };
  }, [stopStream]);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      setError('Không thể truy cập camera');
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center-crop the video to fit the canvas
    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    const scale = Math.max(width / vw, height / vh);
    const sw = width / scale;
    const sh = height / scale;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;

    ctx.drawImage(videoRef.current, sx, sy, sw, sh, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    onChange?.(dataUrl);
    stopStream();
  };

  const retake = () => {
    onChange?.(undefined);
    startCamera();
  };

  if (value) {
    return (
      <div style={{ textAlign: 'center' }}>
        <img
          src={value}
          alt="Patient photo"
          style={{ width, height, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
        />
        <div style={{ marginTop: 8 }}>
          <Button size="small" icon={<RedoOutlined />} onClick={retake}>Chụp lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {streaming ? (
        <>
          <video
            ref={videoRef}
            style={{ width, height, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9', background: '#000' }}
            muted
            playsInline
          />
          <div style={{ marginTop: 8 }}>
            <Space>
              <Button type="primary" size="small" icon={<CameraOutlined />} onClick={capture}>Chụp</Button>
              <Button size="small" onClick={stopStream}>Hủy</Button>
            </Space>
          </div>
        </>
      ) : (
        <>
          <Avatar
            size={Math.min(width, height)}
            icon={<UserOutlined />}
            style={{ background: '#f0f0f0', color: '#bbb' }}
          />
          <div style={{ marginTop: 8 }}>
            <Button size="small" icon={<CameraOutlined />} onClick={startCamera}>Chụp ảnh</Button>
          </div>
          {error && <Text type="danger" style={{ fontSize: 12 }}>{error}</Text>}
        </>
      )}
    </div>
  );
};

export default WebcamCapture;
