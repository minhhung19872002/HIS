/**
 * NON-DICOM capture — Sprint 5 Item 2.17.
 * Chụp ảnh / quay video từ camera web, upload lên server.
 * Dùng cho: nội soi, da liễu, nhãn khoa, RHM, pathology (gross)...
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, Row, Col, Button, Select, Input, Space, Table, Tag, message, Modal,
  Drawer, Upload, Divider, Typography, Popconfirm, Form,
} from 'antd';
import {
  CameraOutlined, VideoCameraOutlined, CloudUploadOutlined, DeleteOutlined,
  ReloadOutlined, FolderOpenOutlined, PlusOutlined, StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';

const { Text } = Typography;

const DEVICE_TYPES = [
  { value: 'Endoscopy', label: 'Nội soi' },
  { value: 'Dermatology', label: 'Da liễu' },
  { value: 'Ophthalmology', label: 'Nhãn khoa' },
  { value: 'Dental', label: 'Răng Hàm Mặt' },
  { value: 'Pathology', label: 'Giải phẫu bệnh' },
  { value: 'ENT', label: 'Tai Mũi Họng' },
  { value: 'Surgery', label: 'Phẫu thuật (intra-op)' },
  { value: 'Other', label: 'Khác' },
];

interface StudyListItem {
  id: string;
  patientName: string;
  patientCode: string;
  deviceType: string;
  deviceName?: string;
  capturedAt: string;
  status: number;
  imageCount: number;
  hasConclusion: boolean;
}

interface ImageItem {
  id: string;
  mediaType: string;
  fileName: string;
  filePath: string;
  mimeType?: string;
  sortOrder: number;
  annotation?: string;
  includeInReport: boolean;
}

export default function NonDicomCapture() {
  const [studies, setStudies] = useState<StudyListItem[]>([]);
  const [filterType, setFilterType] = useState<string | undefined>();
  const [captureModal, setCaptureModal] = useState(false);
  const [createForm] = Form.useForm<{
    patientId: string;
    patientName: string;
    serviceRequestDetailId?: string;
    deviceType: string;
    deviceName?: string;
    description?: string;
  }>();
  const [studyId, setStudyId] = useState<string | null>(null);
  const [captures, setCaptures] = useState<Array<{ id: string; blob: Blob; url: string; type: 'image' | 'video' }>>([]);
  const [recording, setRecording] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [detailStudy, setDetailStudy] = useState<StudyListItem | null>(null);
  const [detailImages, setDetailImages] = useState<ImageItem[]>([]);

  const loadWorklist = useCallback(async () => {
    try {
      const { data } = await apiClient.get<StudyListItem[]>('/non-dicom/worklist', {
        params: { deviceType: filterType },
      });
      setStudies(data);
    } catch { setStudies([]); }
  }, [filterType]);

  useEffect(() => { loadWorklist(); }, [loadWorklist]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setCameraError(err?.message || 'Không truy cập được camera. Đảm bảo đã cấp quyền.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const handleOpenCapture = async () => {
    try {
      const values = await createForm.validateFields();
      const { data } = await apiClient.post<{ id: string }>('/non-dicom/studies', {
        serviceRequestDetailId: values.serviceRequestDetailId || crypto.randomUUID(),
        patientId: values.patientId || crypto.randomUUID(),
        deviceType: values.deviceType,
        deviceName: values.deviceName,
        description: values.description,
      });
      setStudyId(data.id);
      setCaptures([]);
      setCaptureModal(true);
      await startCamera();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tạo study thất bại');
    }
  };

  const handleSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCaptures(prev => [...prev, { id: crypto.randomUUID(), blob, url, type: 'image' }]);
    }, 'image/jpeg', 0.92);
  };

  const handleStartRecording = () => {
    if (!streamRef.current) { message.warning('Chưa mở camera'); return; }
    recordedChunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9' });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setCaptures(prev => [...prev, { id: crypto.randomUUID(), blob, url, type: 'video' }]);
    };
    mr.start();
    recorderRef.current = mr;
    setRecording(true);
  };

  const handleStopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const handleRemoveCapture = (id: string) => {
    setCaptures(prev => {
      const found = prev.find(c => c.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter(c => c.id !== id);
    });
  };

  const handleUploadAll = async () => {
    if (!studyId || captures.length === 0) return;
    const fd = new FormData();
    captures.forEach((c, i) => {
      const ext = c.type === 'video' ? 'webm' : 'jpg';
      fd.append('files', c.blob, `capture-${i}.${ext}`);
    });
    try {
      await apiClient.post(`/non-dicom/studies/${studyId}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success(`Đã upload ${captures.length} file`);
      captures.forEach(c => URL.revokeObjectURL(c.url));
      setCaptures([]);
      stopCamera();
      setCaptureModal(false);
      setStudyId(null);
      createForm.resetFields();
      loadWorklist();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Upload thất bại');
    }
  };

  const handleCloseCapture = () => {
    captures.forEach(c => URL.revokeObjectURL(c.url));
    setCaptures([]);
    stopCamera();
    setCaptureModal(false);
    setStudyId(null);
    createForm.resetFields();
  };

  const handleOpenDetail = async (s: StudyListItem) => {
    setDetailStudy(s);
    const { data } = await apiClient.get<{ images: ImageItem[] }>(`/non-dicom/studies/${s.id}`);
    setDetailImages(data.images);
  };

  const deviceTypeLabel = useMemo(() => {
    const map = Object.fromEntries(DEVICE_TYPES.map(t => [t.value, t.label]));
    return (v: string) => map[v] || v;
  }, []);

  return (
    <div>
      <Card
        title={<Space><CameraOutlined /> NON-DICOM Capture (Nội soi / Da liễu / RHM ...)</Space>}
        extra={
          <Space>
            <Select
              placeholder="Lọc theo loại thiết bị"
              allowClear
              value={filterType}
              onChange={setFilterType}
              options={DEVICE_TYPES}
              style={{ width: 200 }}
            />
            <Button icon={<ReloadOutlined />} onClick={loadWorklist}>Làm mới</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                createForm.resetFields();
                createForm.setFieldsValue({ deviceType: 'Endoscopy' });
                Modal.confirm({
                  title: 'Tạo study NON-DICOM mới',
                  width: 580,
                  content: (
                    <Form form={createForm} layout="vertical" style={{ marginTop: 12 }}>
                      <Form.Item name="patientName" label="Tên BN" rules={[{ required: true }]}>
                        <Input placeholder="Họ tên bệnh nhân" />
                      </Form.Item>
                      <Form.Item name="patientId" label="Mã BN (tùy chọn)">
                        <Input placeholder="Guid BN trong HIS" />
                      </Form.Item>
                      <Form.Item name="serviceRequestDetailId" label="Mã chỉ định (tùy chọn)">
                        <Input placeholder="Guid ServiceRequestDetail" />
                      </Form.Item>
                      <Form.Item name="deviceType" label="Loại thiết bị" rules={[{ required: true }]}>
                        <Select options={DEVICE_TYPES} />
                      </Form.Item>
                      <Form.Item name="deviceName" label="Tên thiết bị">
                        <Input placeholder="VD: Olympus CV-190" />
                      </Form.Item>
                      <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </Form>
                  ),
                  onOk: handleOpenCapture,
                  okText: 'Mở camera',
                });
              }}
            >
              Chụp mới
            </Button>
          </Space>
        }
      >
        <Table<StudyListItem>
          rowKey="id"
          dataSource={studies}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'BN', render: (_, r) => `${r.patientCode || ''} ${r.patientName || ''}` },
            {
              title: 'Thiết bị',
              dataIndex: 'deviceType',
              render: (v: string, r) => (
                <Space direction="vertical" size={0}>
                  <Tag color="blue">{deviceTypeLabel(v)}</Tag>
                  {r.deviceName && <Text type="secondary" style={{ fontSize: 11 }}>{r.deviceName}</Text>}
                </Space>
              ),
            },
            { title: 'Số ảnh/video', dataIndex: 'imageCount', width: 100, align: 'right' },
            {
              title: 'Kết luận',
              dataIndex: 'hasConclusion',
              width: 100,
              render: (v: boolean) => v ? <Tag color="green">Đã có</Tag> : <Tag>Chưa</Tag>,
            },
            { title: 'Chụp lúc', dataIndex: 'capturedAt', width: 140, render: (v: string) => dayjs(v).format('DD/MM HH:mm') },
            {
              title: 'Hành động',
              width: 140,
              render: (_, r) => (
                <Button size="small" icon={<FolderOpenOutlined />} onClick={() => handleOpenDetail(r)}>
                  Mở
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {/* Capture Modal */}
      <Modal
        title="Chụp ảnh / Quay video"
        open={captureModal}
        onCancel={handleCloseCapture}
        width={900}
        destroyOnHidden
        footer={[
          <Button key="cancel" onClick={handleCloseCapture}>Hủy</Button>,
          <Button
            key="upload"
            type="primary"
            icon={<CloudUploadOutlined />}
            disabled={captures.length === 0}
            onClick={handleUploadAll}
          >
            Upload {captures.length > 0 ? `(${captures.length})` : ''}
          </Button>,
        ]}
      >
        <Row gutter={16}>
          <Col span={14}>
            {cameraError ? (
              <div style={{ padding: 40, textAlign: 'center', background: '#fff2f0', borderRadius: 4 }}>
                <Text type="danger">{cameraError}</Text>
                <div style={{ marginTop: 12 }}>
                  <Button onClick={startCamera}>Thử lại</Button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ background: '#000', borderRadius: 4, overflow: 'hidden' }}>
                  <video
                    ref={videoRef}
                    style={{ width: '100%', display: 'block', maxHeight: 480 }}
                    playsInline
                  />
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <Space style={{ marginTop: 12 }}>
                  <Button icon={<CameraOutlined />} onClick={handleSnapshot} disabled={!streamRef.current}>
                    Chụp (Space)
                  </Button>
                  {!recording ? (
                    <Button icon={<VideoCameraOutlined />} onClick={handleStartRecording} disabled={!streamRef.current}>
                      Quay video
                    </Button>
                  ) : (
                    <Button danger icon={<StopOutlined />} onClick={handleStopRecording}>
                      Dừng quay
                    </Button>
                  )}
                  <Upload
                    beforeUpload={(file) => {
                      const url = URL.createObjectURL(file);
                      const type = file.type.startsWith('video') ? 'video' : 'image';
                      setCaptures(prev => [...prev, { id: crypto.randomUUID(), blob: file, url, type: type as 'image' | 'video' }]);
                      return false;
                    }}
                    showUploadList={false}
                    multiple
                  >
                    <Button icon={<FolderOpenOutlined />}>Upload file ngoài</Button>
                  </Upload>
                </Space>
              </>
            )}
          </Col>
          <Col span={10}>
            <Text strong>Đã chụp: {captures.length}</Text>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ maxHeight: 480, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {captures.map(c => (
                <div key={c.id} style={{ position: 'relative', border: '1px solid #eee', borderRadius: 4, overflow: 'hidden' }}>
                  {c.type === 'image' ? (
                    <img src={c.url} alt="capture" style={{ width: '100%', display: 'block' }} />
                  ) : (
                    <video src={c.url} style={{ width: '100%', display: 'block' }} controls />
                  )}
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ position: 'absolute', top: 4, right: 4 }}
                    onClick={() => handleRemoveCapture(c.id)}
                  />
                </div>
              ))}
              {captures.length === 0 && (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#999', padding: 24 }}>
                  Chưa có ảnh/video
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Modal>

      {/* Study detail drawer */}
      <Drawer
        title={`Study: ${detailStudy?.patientName}`}
        open={detailStudy !== null}
        onClose={() => { setDetailStudy(null); setDetailImages([]); }}
        width={720}
      >
        {detailStudy && (
          <>
            <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
              <Tag color="blue">{deviceTypeLabel(detailStudy.deviceType)}</Tag>
              <Text>Chụp lúc: {dayjs(detailStudy.capturedAt).format('DD/MM/YYYY HH:mm')}</Text>
              <Text>Số ảnh/video: {detailStudy.imageCount}</Text>
            </Space>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {detailImages.map(img => (
                <div key={img.id} style={{ border: '1px solid #eee', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  {img.mediaType === 'image' ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:5106/api'}${img.filePath.replace('/api', '')}`}
                      alt={img.fileName}
                      style={{ width: '100%', display: 'block', cursor: 'zoom-in' }}
                    />
                  ) : (
                    <video
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:5106/api'}${img.filePath.replace('/api', '')}`}
                      controls
                      style={{ width: '100%', display: 'block' }}
                    />
                  )}
                  <Popconfirm
                    title="Xóa ảnh này?"
                    onConfirm={async () => {
                      await apiClient.delete(`/non-dicom/image/${img.id}`);
                      setDetailImages(prev => prev.filter(x => x.id !== img.id));
                    }}
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      style={{ position: 'absolute', top: 4, right: 4 }}
                    />
                  </Popconfirm>
                </div>
              ))}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
