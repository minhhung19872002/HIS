/**
 * SpecimenImageGallery — component đính ảnh kính hiển vi / upload ảnh vào KQ XN / GPB.
 *
 * Hỗ trợ 3 nguồn (Issues #134 / #133 / #113):
 *   1. Upload file thủ công từ web (bất kỳ ảnh JPEG/PNG/WebP) — DONE
 *   2. Chụp từ webcam qua getUserMedia                         — DONE
 *   3. Camera device-side (SDK máy kính hiển vi)               — DEFER (cần phần cứng)
 *
 * Cách dùng:
 *   <SpecimenImageGallery
 *     pathologyResultId="<guid>"      // hoặc
 *     serviceRequestDetailId="<guid>" // chọn 1
 *     serviceRequestId="<guid>"       // optional — denorm
 *   />
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App as AntdApp, Upload, Input, Modal, Spin, Tooltip, Tag } from 'antd';
import type { RcFile } from 'antd/es/upload';
import {
  deleteSpecimenImage,
  listByPathologyResult,
  listByServiceDetail,
  uploadSpecimenImageBase64,
  uploadSpecimenImageFile,
} from '../../api/specimenImage';
import type { SpecimenImage } from '../../api/specimenImage';
import { Btn, Ico } from '../_v2kit';

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  /** ID kết quả GPB (PathologyResult.Id) */
  pathologyResultId?: string;
  /** ID chi tiết dịch vụ (ServiceRequestDetail.Id) dành cho XN */
  serviceRequestDetailId?: string;
  /** ServiceRequest.Id — denorm, optional */
  serviceRequestId?: string;
  /** Chỉ xem — không cho upload/xóa */
  readOnly?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  microscope: 'Kính hiển vi',
  manual: 'Upload thủ công',
  webcam: 'Webcam',
};

const SOURCE_COLOR: Record<string, string> = {
  microscope: 'purple',
  manual: 'blue',
  webcam: 'cyan',
};

// ─── Component ────────────────────────────────────────────────────

const SpecimenImageGallery: React.FC<Props> = ({
  pathologyResultId,
  serviceRequestDetailId,
  serviceRequestId,
  readOnly = false,
}) => {
  const { message } = AntdApp.useApp();
  const [images, setImages] = useState<SpecimenImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [magnInput, setMagnInput] = useState('');

  // Webcam refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [webcamCapture, setWebcamCapture] = useState<string | null>(null); // base64

  // ─── Load images ────────────────────────────────────────────────

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      let imgs: SpecimenImage[] = [];
      if (pathologyResultId) {
        imgs = await listByPathologyResult(pathologyResultId);
      } else if (serviceRequestDetailId) {
        imgs = await listByServiceDetail(serviceRequestDetailId);
      }
      setImages(imgs);
    } finally {
      setLoading(false);
    }
  }, [pathologyResultId, serviceRequestDetailId]);

  useEffect(() => { loadImages(); }, [loadImages]);

  // ─── File upload (manual) ────────────────────────────────────────

  const handleFileUpload = async (file: RcFile): Promise<boolean> => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp'];
    if (!allowed.includes(file.type)) {
      message.error('Chỉ chấp nhận ảnh JPEG / PNG / WebP / TIFF / BMP');
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      message.error('File ảnh không được vượt 20 MB');
      return false;
    }

    setUploading(true);
    try {
      await uploadSpecimenImageFile({
        file,
        pathologyResultId,
        serviceRequestDetailId,
        serviceRequestId,
        source: 'manual',
      });
      message.success('Đã đính ảnh thành công');
      await loadImages();
    } catch {
      message.error('Không đính được ảnh — kiểm tra kết nối mạng');
    } finally {
      setUploading(false);
    }
    return false; // ngăn antd tự upload
  };

  // ─── Webcam ──────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setWebcamCapture(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setCameraError(err?.message ?? 'Không truy cập được camera. Cần cấp quyền camera cho trang.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setWebcamCapture(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const openWebcam = () => {
    setWebcamOpen(true);
    // camera start sau khi modal mở (useEffect)
  };

  const handleWebcamOpen = () => { startCamera(); };
  const handleWebcamClose = () => {
    stopCamera();
    setWebcamOpen(false);
    setWebcamCapture(null);
    setCameraError(null);
  };

  const submitWebcamCapture = async () => {
    if (!webcamCapture) return;
    setUploading(true);
    try {
      await uploadSpecimenImageBase64({
        base64Data: webcamCapture,
        mimeType: 'image/jpeg',
        pathologyResultId,
        serviceRequestDetailId,
        serviceRequestId,
        caption: captionInput || undefined,
        magnification: magnInput || undefined,
        source: 'webcam',
      });
      message.success('Đã lưu ảnh webcam');
      setWebcamOpen(false);
      setWebcamCapture(null);
      setCaptionInput('');
      setMagnInput('');
      await loadImages();
    } catch {
      message.error('Không lưu được ảnh webcam');
    } finally {
      setUploading(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      await deleteSpecimenImage(id);
      message.success('Đã xóa ảnh');
      setImages((prev) => prev.filter((i) => i.id !== id));
    } catch {
      message.error('Không xóa được ảnh');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="rec-section" style={{ marginTop: 8 }}>
      <h5 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span>HÌNH ẢNH BỆNH PHẨM</span>
        {!readOnly && (
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <Upload
              accept="image/jpeg,image/png,image/webp,image/tiff,image/bmp"
              showUploadList={false}
              beforeUpload={handleFileUpload}
            >
              <Btn size="sm" loading={uploading}>
                <Ico name="upload" size={11} /> Upload ảnh
              </Btn>
            </Upload>
            <Btn size="sm" variant="ghost" onClick={openWebcam}>
              <Ico name="image" size={11} /> Webcam
            </Btn>
          </span>
        )}
      </h5>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}><Spin size="small" /></div>
      ) : images.length === 0 ? (
        <div style={{ color: 'var(--a-muted)', fontSize: 12, padding: '8px 0' }}>
          Chưa có ảnh bệnh phẩm nào.
          {!readOnly && ' Dùng nút "Upload ảnh" hoặc "Webcam" để đính ảnh.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {images.map((img) => (
            <div
              key={img.id}
              style={{
                position: 'relative',
                width: 110,
                borderRadius: 6,
                overflow: 'hidden',
                border: '1px solid var(--a-border)',
                cursor: 'pointer',
              }}
            >
              <img
                src={img.imagePath}
                alt={img.caption ?? img.fileName ?? 'Ảnh bệnh phẩm'}
                style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                onClick={() => setPreviewSrc(img.imagePath)}
              />
              <div style={{ padding: '4px 6px', fontSize: 10 }}>
                <Tag color={SOURCE_COLOR[img.source] ?? 'default'} style={{ fontSize: 9, padding: '0 4px', marginBottom: 2 }}>
                  {SOURCE_LABELS[img.source] ?? img.source}
                </Tag>
                {img.magnification && (
                  <span style={{ fontSize: 9, color: 'var(--a-muted)', display: 'block' }}>
                    x{img.magnification}
                  </span>
                )}
                {img.caption && (
                  <Tooltip title={img.caption}>
                    <div style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 98 }}>
                      {img.caption}
                    </div>
                  </Tooltip>
                )}
              </div>
              {!readOnly && (
                <div
                  style={{
                    position: 'absolute', top: 3, right: 3,
                    background: 'rgba(0,0,0,0.5)', borderRadius: 3,
                    padding: '1px 4px', cursor: 'pointer', fontSize: 11, color: '#fff',
                  }}
                  onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                  title="Xóa ảnh"
                >
                  x
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview lightbox */}
      <Modal
        open={!!previewSrc}
        onCancel={() => setPreviewSrc(null)}
        footer={null}
        width="90vw"
        style={{ maxWidth: 1200 }}
        styles={{ body: { padding: 8, textAlign: 'center' } }}
        destroyOnHidden
      >
        {previewSrc && (
          <img src={previewSrc} alt="Xem ảnh bệnh phẩm" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
        )}
      </Modal>

      {/* Webcam modal */}
      <Modal
        title="Chụp ảnh từ Webcam"
        open={webcamOpen}
        onCancel={handleWebcamClose}
        afterOpenChange={(open) => { if (open) handleWebcamOpen(); }}
        width={700}
        destroyOnHidden
        footer={
          webcamCapture ? [
            <Btn key="retake" variant="ghost" onClick={() => { setWebcamCapture(null); startCamera(); }}>
              Chụp lại
            </Btn>,
            <Btn key="save" loading={uploading} onClick={submitWebcamCapture}>
              Lưu ảnh
            </Btn>,
          ] : [
            <Btn key="capture" onClick={captureFrame} disabled={!!cameraError}>
              Chụp ảnh
            </Btn>,
          ]
        }
      >
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {cameraError && (
          <div style={{ color: 'var(--a-crit)', marginBottom: 8, fontSize: 13 }}>
            {cameraError}
          </div>
        )}

        {webcamCapture ? (
          <div>
            <img src={webcamCapture} alt="Ảnh vừa chụp" style={{ width: '100%', borderRadius: 6 }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <Input
                placeholder="Chú thích ảnh (vd: Tế bào x400)"
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                size="small"
              />
              <Input
                placeholder="Phóng đại (vd: 400)"
                value={magnInput}
                onChange={(e) => setMagnInput(e.target.value)}
                style={{ width: 140 }}
                size="small"
                prefix="x"
              />
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', borderRadius: 6, background: '#000', minHeight: 300 }}
          />
        )}
      </Modal>
    </div>
  );
};

export default SpecimenImageGallery;
