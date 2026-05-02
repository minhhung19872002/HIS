import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Form, Input, Select, Modal, Upload } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, Filter, DataTable, StatusBadge, ActBtn,
  DrawerShell, ModalShell, Ico, tk, tw, cf,
  type ColumnDef,
} from './_v2kit';

const DEVICE_TYPES = [
  { v: 'Endoscopy',     l: 'Nội soi' },
  { v: 'Dermatology',   l: 'Da liễu' },
  { v: 'Ophthalmology', l: 'Nhãn khoa' },
  { v: 'Dental',        l: 'Răng Hàm Mặt' },
  { v: 'Pathology',     l: 'Giải phẫu bệnh' },
  { v: 'ENT',           l: 'Tai Mũi Họng' },
  { v: 'Surgery',       l: 'Phẫu thuật (intra-op)' },
  { v: 'Other',         l: 'Khác' },
];

interface StudyListItem {
  id: string; patientName: string; patientCode: string;
  deviceType: string; deviceName?: string;
  capturedAt: string; status: number; imageCount: number; hasConclusion: boolean;
}
interface ImageItem {
  id: string; mediaType: string; fileName: string; filePath: string;
  mimeType?: string; sortOrder: number; annotation?: string; includeInReport: boolean;
}

const NonDicomCaptureV2: React.FC = () => {
  const [studies, setStudies] = useState<StudyListItem[]>([]);
  const [filterType, setFilterType] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [captureModal, setCaptureModal] = useState(false);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [captures, setCaptures] = useState<Array<{ id: string; blob: Blob; url: string; type: 'image' | 'video' }>>([]);
  const [recording, setRecording] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detailStudy, setDetailStudy] = useState<StudyListItem | null>(null);
  const [detailImages, setDetailImages] = useState<ImageItem[]>([]);
  const [createForm] = Form.useForm<{ patientId: string; patientName: string; serviceRequestDetailId?: string; deviceType: string; deviceName?: string; description?: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const loadWorklist = useCallback(async () => {
    try {
      const { data } = await apiClient.get<StudyListItem[]>('/non-dicom/worklist',
        { params: { deviceType: filterType || undefined } });
      setStudies(data);
    } catch { setStudies([]); }
  }, [filterType]);

  useEffect(() => { loadWorklist(); }, [loadWorklist]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = e as any;
      setCameraError(err?.message || 'Không truy cập được camera. Đảm bảo đã cấp quyền.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const submitCreate = async () => {
    try {
      const v = await createForm.validateFields();
      const { data } = await apiClient.post<{ id: string }>('/non-dicom/studies', {
        serviceRequestDetailId: v.serviceRequestDetailId || crypto.randomUUID(),
        patientId: v.patientId || crypto.randomUUID(),
        deviceType: v.deviceType, deviceName: v.deviceName, description: v.description,
      });
      setStudyId(data.id); setCaptures([]);
      setCreateOpen(false); setCaptureModal(true);
      await startCamera();
    } catch { tw('Tạo study thất bại'); }
  };

  const snapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current; const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCaptures((p) => [...p, { id: crypto.randomUUID(), blob, url, type: 'image' }]);
    }, 'image/jpeg', 0.92);
  };

  const startRec = () => {
    if (!streamRef.current) { tw('Chưa mở camera'); return; }
    recordedChunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9' });
    mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setCaptures((p) => [...p, { id: crypto.randomUUID(), blob, url, type: 'video' }]);
    };
    mr.start(); recorderRef.current = mr; setRecording(true);
  };

  const stopRec = () => { recorderRef.current?.stop(); recorderRef.current = null; setRecording(false); };

  const removeCapture = (id: string) => {
    setCaptures((p) => {
      const f = p.find((c) => c.id === id); if (f) URL.revokeObjectURL(f.url);
      return p.filter((c) => c.id !== id);
    });
  };

  const uploadAll = async () => {
    if (!studyId || captures.length === 0) return;
    const fd = new FormData();
    captures.forEach((c, i) => {
      const ext = c.type === 'video' ? 'webm' : 'jpg';
      fd.append('files', c.blob, `capture-${i}.${ext}`);
    });
    try {
      await apiClient.post(`/non-dicom/studies/${studyId}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      tk(`Đã upload ${captures.length} file`);
      captures.forEach((c) => URL.revokeObjectURL(c.url));
      setCaptures([]); stopCamera();
      setCaptureModal(false); setStudyId(null); createForm.resetFields(); loadWorklist();
    } catch { tw('Upload thất bại'); }
  };

  const closeCapture = () => {
    captures.forEach((c) => URL.revokeObjectURL(c.url));
    setCaptures([]); stopCamera();
    setCaptureModal(false); setStudyId(null); createForm.resetFields();
  };

  const openDetail = async (s: StudyListItem) => {
    setDetailStudy(s);
    try {
      const { data } = await apiClient.get<{ images: ImageItem[] }>(`/non-dicom/studies/${s.id}`);
      setDetailImages(data.images);
    } catch { setDetailImages([]); }
  };

  const deleteImage = (id: string) => cf('Xóa ảnh này?', async () => {
    await apiClient.delete(`/non-dicom/image/${id}`);
    setDetailImages((p) => p.filter((x) => x.id !== id));
    tk('Đã xóa');
  }, { tone: 'crit', confirm: 'Xóa' });

  const deviceTypeLabel = useMemo(() => {
    const map = Object.fromEntries(DEVICE_TYPES.map((t) => [t.v, t.l]));
    return (v: string) => map[v] || v;
  }, []);

  const cols: ColumnDef<StudyListItem>[] = [
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode || '—'}</div>
      </div>
    ) },
    { key: 'dev', label: 'Thiết bị', render: (r) => (
      <div>
        <StatusBadge tone="info">{deviceTypeLabel(r.deviceType)}</StatusBadge>
        {r.deviceName && <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>{r.deviceName}</div>}
      </div>
    ) },
    { key: 'cnt', label: 'SL ảnh/video', mono: true, render: (r) => r.imageCount },
    { key: 'concl', label: 'Kết luận', render: (r) => r.hasConclusion ? <StatusBadge tone="ok">Đã có</StatusBadge> : <StatusBadge tone="warn">Chưa</StatusBadge> },
    { key: 'time', label: 'Chụp lúc', mono: true, render: (r) => dayjs(r.capturedAt).format('DD/MM HH:mm') },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng study', val: studies.length, sub: 'tất cả' },
        { lbl: 'Có kết luận', val: studies.filter((s) => s.hasConclusion).length, sub: 'đã đọc', tone: 'ok' },
        { lbl: 'Tổng ảnh/video', val: studies.reduce((s, x) => s + x.imageCount, 0), sub: 'tất cả file', tone: 'info' },
        { lbl: 'Đang chụp', val: captures.length, sub: captureModal ? 'phiên hiện tại' : 'không có phiên', tone: captureModal ? 'crit' : 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Filter value={filterType} onChange={setFilterType} options={DEVICE_TYPES} placeholder="▾ Loại thiết bị" />
        <button className="ab-btn ghost" type="button" onClick={() => setFilterType('')}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={loadWorklist}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => {
          createForm.resetFields();
          createForm.setFieldsValue({ deviceType: 'Endoscopy' });
          setCreateOpen(true);
        }}>
          <Ico name="plus" size={12} /> Chụp mới
        </button>
      </div>

      <DataTable<StudyListItem>
        columns={cols} data={studies} rowKey={(r) => r.id}
        onRowClick={openDetail}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="archive" title="Mở study" onClick={() => openDetail(r)} />
          </div>
        )}
        empty="Chưa có study NON-DICOM"
      />

      <ModalShell open={createOpen} onClose={() => setCreateOpen(false)} size="md" title="Tạo study NON-DICOM mới"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setCreateOpen(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitCreate}><Ico name="qr" size={12} /> Mở camera</button>
        </>}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="patientName" label="Tên BN" rules={[{ required: true }]}>
            <Input placeholder="Họ tên bệnh nhân" />
          </Form.Item>
          <Form.Item name="patientId" label="Mã BN (tùy chọn)"><Input placeholder="Guid BN trong HIS" /></Form.Item>
          <Form.Item name="serviceRequestDetailId" label="Mã chỉ định (tùy chọn)"><Input placeholder="Guid ServiceRequestDetail" /></Form.Item>
          <Form.Item name="deviceType" label="Loại thiết bị" rules={[{ required: true }]}>
            <Select options={DEVICE_TYPES.map((t) => ({ value: t.v, label: t.l }))} />
          </Form.Item>
          <Form.Item name="deviceName" label="Tên thiết bị"><Input placeholder="VD: Olympus CV-190" /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </ModalShell>

      <Modal
        open={captureModal}
        onCancel={closeCapture}
        title="Chụp ảnh / Quay video"
        width={1000}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="ab-btn ghost" onClick={closeCapture}>Hủy</button>
            <button type="button" className="ab-btn primary" onClick={uploadAll} disabled={captures.length === 0}>
              <Ico name="send" size={12} /> Upload {captures.length > 0 ? `(${captures.length})` : ''}
            </button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '14fr 10fr', gap: 16 }}>
          <div>
            {cameraError ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--d-1)', border: '1px solid var(--a-rd-text)', borderRadius: 4, color: 'var(--a-rd-text)' }}>
                <div>{cameraError}</div>
                <button type="button" className="ab-btn ghost" style={{ marginTop: 12 }} onClick={startCamera}>
                  <Ico name="refresh" size={12} /> Thử lại
                </button>
              </div>
            ) : (
              <>
                <div style={{ background: '#000', borderRadius: 4, overflow: 'hidden' }}>
                  <video ref={videoRef} style={{ width: '100%', display: 'block', maxHeight: 480 }} playsInline />
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button type="button" className="ab-btn primary" onClick={snapshot} disabled={!streamRef.current}>
                    <Ico name="qr" size={12} /> Chụp (Space)
                  </button>
                  {!recording ? (
                    <button type="button" className="ab-btn" onClick={startRec} disabled={!streamRef.current}>
                      <Ico name="play" size={12} /> Quay video
                    </button>
                  ) : (
                    <button type="button" className="ab-btn" style={{ color: 'var(--a-rd-text)' }} onClick={stopRec}>
                      <Ico name="x" size={12} /> Dừng quay
                    </button>
                  )}
                  <Upload
                    beforeUpload={(file) => {
                      const url = URL.createObjectURL(file);
                      const type = file.type.startsWith('video') ? 'video' : 'image';
                      setCaptures((p) => [...p, { id: crypto.randomUUID(), blob: file, url, type: type as 'image' | 'video' }]);
                      return false;
                    }}
                    showUploadList={false} multiple
                  >
                    <button type="button" className="ab-btn ghost">
                      <Ico name="archive" size={12} /> Upload file ngoài
                    </button>
                  </Upload>
                </div>
              </>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Đã chụp: {captures.length}</div>
            <div style={{ maxHeight: 480, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {captures.map((c) => (
                <div key={c.id} style={{ position: 'relative', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                  {c.type === 'image'
                    ? <img src={c.url} alt="capture" style={{ width: '100%', display: 'block' }} />
                    : <video src={c.url} style={{ width: '100%', display: 'block' }} controls />}
                  <button type="button" className="ab-iconbtn"
                    style={{ position: 'absolute', top: 4, right: 4, color: 'var(--a-rd-text)' }}
                    onClick={() => removeCapture(c.id)}>
                    <Ico name="trash" size={12} />
                  </button>
                </div>
              ))}
              {captures.length === 0 && (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--t-2)', padding: 24 }}>
                  Chưa có ảnh/video
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <DrawerShell
        open={!!detailStudy}
        onClose={() => { setDetailStudy(null); setDetailImages([]); }}
        size="xl"
        title={detailStudy ? `Study: ${detailStudy.patientName}` : ''}
        sub={detailStudy ? `${deviceTypeLabel(detailStudy.deviceType)} · ${detailStudy.imageCount} file` : ''}
      >
        {detailStudy && (
          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <StatusBadge tone="info">{deviceTypeLabel(detailStudy.deviceType)}</StatusBadge>
              <span style={{ fontSize: 12, color: 'var(--t-2)' }}>
                Chụp lúc: {dayjs(detailStudy.capturedAt).format('DD/MM/YYYY HH:mm')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--t-2)' }}>· {detailStudy.imageCount} file</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {detailImages.map((img) => (
                <div key={img.id} style={{ border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  {img.mediaType === 'image' ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:5106/api'}${img.filePath.replace('/api', '')}`}
                      alt={img.fileName}
                      style={{ width: '100%', display: 'block', cursor: 'zoom-in' }}
                    />
                  ) : (
                    <video
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:5106/api'}${img.filePath.replace('/api', '')}`}
                      controls style={{ width: '100%', display: 'block' }}
                    />
                  )}
                  <button type="button" className="ab-iconbtn"
                    style={{ position: 'absolute', top: 4, right: 4, color: 'var(--a-rd-text)' }}
                    onClick={() => deleteImage(img.id)}>
                    <Ico name="trash" size={12} />
                  </button>
                </div>
              ))}
              {detailImages.length === 0 && (
                <div style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--t-2)', padding: 24 }}>
                  Chưa có ảnh/video trong study
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerShell>
    </div>
  );
};

export default NonDicomCaptureV2;
