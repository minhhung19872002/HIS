import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Button, Space, Typography, Alert, Select } from 'antd';
import { CameraOutlined, ScanOutlined } from '@ant-design/icons';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const { Text } = Typography;

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string, format: string) => void;
  title?: string;
  formats?: Html5QrcodeSupportedFormats[];
}

const DEFAULT_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  open,
  onClose,
  onScan,
  title = 'Quét mã vạch / QR Code',
  formats = DEFAULT_FORMATS,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const containerId = 'barcode-scanner-container';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // Already stopped
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (open) {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            const cameraList = devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 8)}` }));
            setCameras(cameraList);
            // Prefer rear camera
            const rear = cameraList.find((c) => /back|rear|environment/i.test(c.label));
            setSelectedCamera(rear?.id || cameraList[0].id);
            setError('');
          } else {
            setError('Không tìm thấy camera. Vui lòng kết nối camera và thử lại.');
          }
        })
        .catch(() => {
          setError('Không thể truy cập camera. Vui lòng cho phép trình duyệt sử dụng camera.');
        });
    }
    return () => {
      stopScanner();
    };
  }, [open, stopScanner]);

  const startScanner = useCallback(async () => {
    if (!selectedCamera) return;
    await stopScanner();

    // Wait for DOM element
    await new Promise((r) => setTimeout(r, 200));
    const el = document.getElementById(containerId);
    if (!el) return;

    const scanner = new Html5Qrcode(containerId, { formatsToSupport: formats, verbose: false });
    scannerRef.current = scanner;

    try {
      await scanner.start(
        selectedCamera,
        { fps: 10, qrbox: { width: 280, height: 180 }, aspectRatio: 1.5 },
        (decodedText, result) => {
          const formatName = result?.result?.format?.formatName || 'UNKNOWN';
          onScan(decodedText, formatName);
          stopScanner();
          onClose();
        },
        () => {
          // QR code not detected in frame - ignore
        }
      );
      setScanning(true);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Không thể khởi động camera');
      setScanning(false);
    }
  }, [selectedCamera, formats, onScan, onClose, stopScanner]);

  const handleClose = useCallback(() => {
    stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={500}
      destroyOnHidden
      afterOpenChange={(visible) => {
        if (visible && selectedCamera) {
          startScanner();
        }
      }}
    >
      {error && (
        <Alert title={error} type="error" showIcon style={{ marginBottom: 12 }} />
      )}

      {cameras.length > 1 && (
        <Space style={{ marginBottom: 12, width: '100%' }}>
          <Text>Camera:</Text>
          <Select
            value={selectedCamera}
            onChange={(val) => {
              setSelectedCamera(val);
              if (scanning) {
                stopScanner().then(() => {
                  setTimeout(() => startScanner(), 300);
                });
              }
            }}
            style={{ width: 300 }}
            options={cameras.map((c) => ({ value: c.id, label: c.label }))}
          />
        </Space>
      )}

      <div
        id={containerId}
        style={{
          width: '100%',
          minHeight: 300,
          border: '2px dashed #d9d9d9',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#000',
        }}
      />

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <Space>
          {!scanning ? (
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={startScanner}
              disabled={!selectedCamera}
            >
              Bắt đầu quét
            </Button>
          ) : (
            <Button icon={<ScanOutlined />} onClick={stopScanner}>
              Dừng quét
            </Button>
          )}
        </Space>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">
            Đưa mã vạch hoặc QR code vào khung hình để quét
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeScanner;
