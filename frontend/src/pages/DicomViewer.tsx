import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Spin,
  Alert,
  Descriptions,
  Empty,
  message,
  Tag,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  ExpandOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FolderOutlined,
  PictureOutlined,
  SettingOutlined,
  LinkOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  VideoCameraOutlined,
  AppstoreOutlined,
  DiffOutlined,
  BlockOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import risApi from '../api/ris';
import type { DicomSeriesDto, DicomImageDto } from '../api/ris';
import { createRoom, searchRooms, joinRoom } from '../api/videoConsultation';
import AiLabelingModal from '../components/AiLabelingModal';
import { API_ORIGIN } from '../config/api';
import { loadViewerConfig } from '../components/DicomViewerConfig';
import DicomViewerConfig from '../components/DicomViewerConfig';
import CornerstoneViewer, { type CornerstoneViewerHandle } from '../components/CornerstoneViewer';

// Backend returns relative paths like "/api/RISComplete/pacs/instances/.../preview".
// Resolve them against the API origin (Cloud Run) so the browser fetches them
// from the backend instead of the frontend host (Vercel) which has no such route.
function resolveApiUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_ORIGIN) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

const { Title, Text } = Typography;

const ORTHANC_BASE = import.meta.env.VITE_ORTHANC_URL || 'http://localhost:8042';

interface StudyInfo {
  studyInstanceUID: string;
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyDescription?: string;
  modality?: string;
  accessionNumber?: string;
  seriesCount?: number;
  instanceCount?: number;
  orthancStudyId?: string;
}

type DicomViewerError = {
  code?: string;
  message?: string;
};

const DicomViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studyInstanceUID = searchParams.get('study') || '';

  const [loading, setLoading] = useState(true);
  const [pacsAvailable, setPacsAvailable] = useState(false);
  const [studyInfo, setStudyInfo] = useState<StudyInfo | null>(null);
  const [series, setSeries] = useState<DicomSeriesDto[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<DicomSeriesDto | null>(null);
  const [images, setImages] = useState<DicomImageDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // GAP FIX 5: Apply viewer config từ localStorage — W/L presets + shortcuts + overlay
  const [viewerConfig, setViewerConfig] = useState(() => loadViewerConfig());
  const [activeWlPreset, setActiveWlPreset] = useState<string>('');
  const [showOverlay, setShowOverlay] = useState(true);

  // A1: Embedded OHIF iframe mode — MPR, 3D volume, MIP, Mamo sẵn có trong Orthanc plugin
  const [embedOhif, setEmbedOhif] = useState(false);

  // A2: Video conference integration
  const [liveRoomId, setLiveRoomId] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // QW3.3: Compare 2 studies side-by-side
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareUid, setCompareUid] = useState<string>('');
  const [patientStudies, setPatientStudies] = useState<Array<{ studyInstanceUID: string; studyDate?: string; modality?: string; serviceName?: string }>>([]);

  // AI Labeling
  const [aiOpen, setAiOpen] = useState(false);

  // Cornerstone3D viewer toggle + handle for tool/preset commands
  const [useCs, setUseCs] = useState(true); // default to native renderer
  const csRef = useRef<CornerstoneViewerHandle>(null);

  // Build wadouri:URL list from images (raw DICOM proxy through backend)
  // Backend endpoint /pacs/instances/{id}/file streams raw DICOM bytes.
  // imageUrl pattern is `/api/RISComplete/pacs/instances/{instanceId}/preview` —
  // swap /preview → /file to point at raw DICOM. Cornerstone needs `wadouri:` prefix.
  const cornerstoneImageIds = React.useMemo(() => {
    return images
      .map((img) => {
        const raw = img.wadoUrl || img.imageUrl?.replace(/\/preview(\?.*)?$/, '/file') || '';
        if (!raw) return '';
        const abs = resolveApiUrl(raw);
        return abs ? `wadouri:${abs}` : '';
      })
      .filter(Boolean);
  }, [images]);

  useEffect(() => {
    // Global hotkey listener cho W/L presets F1-F10 + shortcuts customizable
    const handler = (e: KeyboardEvent) => {
      // W/L presets F1-F10
      const preset = viewerConfig.wlPresets.find(p => p.key === e.key);
      if (preset) {
        e.preventDefault();
        setActiveWlPreset(preset.key);
        // Apply W/L via Cornerstone3D viewport API
        csRef.current?.applyWlPreset(preset);
        message.info(`Đã áp W/L preset: ${preset.name} (C=${preset.center}, W=${preset.width})`, 1);
        return;
      }

      // Customizable shortcuts
      const sc = viewerConfig.shortcuts.find(s => s.key === e.key);
      if (sc && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Chỉ apply nếu không đang gõ trong input
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        message.info(`Action: ${sc.description}`, 1);
        // TODO: hook vào Cornerstone tool switcher khi nâng cấp engine
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [viewerConfig]);

  const reloadConfig = useCallback(() => {
    setViewerConfig(loadViewerConfig());
    message.success('Đã tải lại cấu hình viewer');
  }, []);


  const loadStudyData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get series list from backend API
      const seriesResponse = await risApi.getSeries(studyInstanceUID);

      if (seriesResponse.data && seriesResponse.data.length > 0) {
        setPacsAvailable(true);
        setSeries(seriesResponse.data);

        // Extract study info from first series
        const firstSeries = seriesResponse.data[0];
        setStudyInfo({
          studyInstanceUID,
          patientName: firstSeries.patientName,
          patientId: firstSeries.patientId,
          studyDate: firstSeries.studyDate || firstSeries.seriesDate,
          studyDescription: firstSeries.studyDescription,
          modality: firstSeries.modality,
          seriesCount: seriesResponse.data.length,
          instanceCount: seriesResponse.data.reduce((sum, s) => sum + (s.instanceCount || s.numberOfImages || 0), 0),
          orthancStudyId: firstSeries.orthancStudyId,
        });

        // Auto-select first series
        setSelectedSeries(firstSeries);
        void loadImages(firstSeries.seriesInstanceUID);
      } else {
        // No series found - PACS may not be configured
        setPacsAvailable(false);
        setStudyInfo({
          studyInstanceUID,
        });
      }
    } catch (err: unknown) {
      const viewerError = err as DicomViewerError;
      console.warn('Error loading study:', err);
      setPacsAvailable(false);
      setStudyInfo({
        studyInstanceUID,
      });

      // Check if it's a connection error
      if (viewerError.code === 'ECONNREFUSED' || viewerError.message?.includes('Network Error')) {
        setError('Không thể kết nối đến PACS Server. Vui lòng kiểm tra cấu hình.');
      }
    } finally {
      setLoading(false);
    }
  }, [studyInstanceUID]);

  // Check PACS availability and load study data
  useEffect(() => {
    if (!studyInstanceUID) {
      setError('Thiếu thông tin Study UID');
      setLoading(false);
      return;
    }

    void loadStudyData();
  }, [studyInstanceUID, loadStudyData]);


  const loadImages = async (seriesUID: string) => {
    try {
      const response = await risApi.getImages(seriesUID);
      setImages(response.data || []);
      // Auto-select first image for large preview
      if (response.data && response.data.length > 0 && response.data[0].imageUrl) {
        setSelectedImageUrl(resolveApiUrl(response.data[0].imageUrl));
      }
    } catch (err) {
      console.warn('Error loading images:', err);
      setImages([]);
    }
  };

  const handleSeriesSelect = (s: DicomSeriesDto) => {
    setSelectedSeries(s);
    setSelectedImageUrl(null);
    loadImages(s.seriesInstanceUID);
  };

  const handleOpenOHIF = () => {
    // Open OHIF Viewer integrated in Orthanc
    const ohifUrl = `${ORTHANC_BASE}/ohif/viewer?StudyInstanceUIDs=${studyInstanceUID}`;
    window.open(ohifUrl, '_blank');
  };

  // A1: Embed OHIF Viewer inline — gives access to MPR 4-quadrant, 3D volume,
  // MIP presets, Mammography layout, Compare studies... all built-in to OHIF 3.x
  // which ships inside Orthanc's OHIF plugin.
  const ohifEmbedUrl = `${ORTHANC_BASE}/ohif/viewer?StudyInstanceUIDs=${studyInstanceUID}`;

  // QW3.3: Load patient's other studies when Compare modal opens
  const openCompareModal = useCallback(async () => {
    setCompareOpen(true);
    if (!studyInfo?.patientId) return;
    try {
      const resp = await risApi.getPatientRadiologyHistory(studyInfo.patientId);
      const raw = (resp?.data ?? []) as unknown as Array<Record<string, unknown>>;
      const list = raw
        .filter((r) => typeof r.studyInstanceUID === 'string' && r.studyInstanceUID !== studyInstanceUID)
        .map((r) => ({
          studyInstanceUID: String(r.studyInstanceUID ?? ''),
          studyDate: r.studyDate as string | undefined,
          modality: r.modality as string | undefined,
          serviceName: r.serviceName as string | undefined,
        }));
      setPatientStudies(list);
    } catch { /* ignore */ }
  }, [studyInfo, studyInstanceUID]);

  const handleCompare = useCallback(() => {
    if (!compareUid.trim()) {
      message.warning('Nhập hoặc chọn Study UID để so sánh');
      return;
    }
    // OHIF hỗ trợ multi-study qua comma-separated StudyInstanceUIDs
    const url = `${ORTHANC_BASE}/ohif/viewer?StudyInstanceUIDs=${studyInstanceUID},${compareUid.trim()}`;
    window.open(url, '_blank', 'noopener');
    setCompareOpen(false);
  }, [compareUid, studyInstanceUID]);

  // QW3.12: Dual monitor — open a cloned viewer on monitor 2
  const handleOpenDualMonitor = useCallback(() => {
    const features = 'width=1400,height=900,resizable=yes,scrollbars=yes';
    // Open same page on another window; user drag to monitor 2.
    // Add ?dual=1 so window title indicates it's the secondary view.
    window.open(`${window.location.pathname}${window.location.search}&dual=1`, 'his-dual-viewer', features);
  }, []);

  // A2: Check if a live consultation room already exists for this study on mount,
  // so the button can offer Join instead of Create.
  useEffect(() => {
    if (!studyInstanceUID) return;
    searchRooms({ status: 1 })
      .then((rooms) => {
        const live = rooms.find((r) => r.studyInstanceUID === studyInstanceUID);
        if (live) setLiveRoomId(live.id);
      })
      .catch(() => {});
  }, [studyInstanceUID]);

  const handleVideoConference = useCallback(async () => {
    if (!studyInstanceUID) return;
    setCreatingRoom(true);
    try {
      if (liveRoomId) {
        // Join existing live room
        const info = await joinRoom(liveRoomId, 'Người dùng HIS');
        window.open(info.jitsiUrl, '_blank', 'noopener,width=1200,height=800');
      } else {
        // Create + auto-start a new room tied to this study
        const room = await createRoom({
          title: `Hội chẩn ca chụp ${studyInstanceUID.slice(-12)}`,
          roomType: 1, // CĐHA
          studyInstanceUID,
          patientId: studyInfo?.patientId ? undefined : undefined,
          isRecorded: false,
        });
        setLiveRoomId(room.id);
        const info = await joinRoom(room.id, 'Người dùng HIS');
        window.open(info.jitsiUrl, '_blank', 'noopener,width=1200,height=800');
        message.success('Đã tạo phòng hội chẩn cho ca chụp này');
      }
    } catch (err) {
      console.warn('video conference error:', err);
      message.error('Không mở được phòng hội chẩn');
    } finally {
      setCreatingRoom(false);
    }
  }, [studyInstanceUID, liveRoomId, studyInfo]);

  const handleOpenOrthancExplorer = () => {
    window.open(`${ORTHANC_BASE}/ui/app/#/filtered-studies?StudyInstanceUID=${studyInstanceUID}`, '_blank');
  };

  const handleDownloadStudy = () => {
    if (studyInfo?.orthancStudyId) {
      window.open(`${ORTHANC_BASE}/studies/${studyInfo.orthancStudyId}/archive`, '_blank');
    } else {
      message.info('Không tìm thấy study trong PACS');
    }
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleExportDicom = async () => {
    if (!studyInfo?.orthancStudyId) {
      message.info('Khong tim thay study de xuat');
      return;
    }
    setExportLoading(true);
    try {
      const archiveUrl = `${ORTHANC_BASE}/studies/${studyInfo.orthancStudyId}/archive`;
      const response = await fetch(archiveUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DICOM_${studyInfo.patientId || 'unknown'}_${studyInstanceUID.slice(-8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Da xuat DICOM thanh cong');
    } catch (err) {
      console.warn('DICOM export error:', err);
      message.warning('Khong the xuat DICOM. Vui long kiem tra ket noi PACS.');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="Đang tải dữ liệu DICOM..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              Quay lại
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              <FileImageOutlined /> Xem ảnh DICOM
            </Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadStudyData}>
              Làm mới
            </Button>
            {pacsAvailable && (
              <>
                <Button
                  type={embedOhif ? 'default' : 'primary'}
                  icon={<AppstoreOutlined />}
                  onClick={() => setEmbedOhif((v) => !v)}
                  data-testid="dicom-mpr-3d-btn"
                >
                  {embedOhif ? 'Ẩn MPR/3D' : 'MPR / 3D / Mamo'}
                </Button>
                <Button
                  icon={<RobotOutlined />}
                  onClick={() => setAiOpen(true)}
                  disabled={!selectedImageUrl}
                  data-testid="dicom-ai-btn"
                >
                  Phân tích AI
                </Button>
                <Button
                  type={liveRoomId ? 'primary' : 'default'}
                  danger={!!liveRoomId}
                  icon={<VideoCameraOutlined />}
                  onClick={handleVideoConference}
                  loading={creatingRoom}
                  data-testid="dicom-video-conf-btn"
                >
                  {liveRoomId ? 'Tham gia hội chẩn (LIVE)' : 'Hội chẩn video'}
                </Button>
                <Button
                  icon={<DiffOutlined />}
                  onClick={openCompareModal}
                  data-testid="dicom-compare-btn"
                >
                  So sánh
                </Button>
                <Button
                  icon={<BlockOutlined />}
                  onClick={handleOpenDualMonitor}
                  data-testid="dicom-dual-monitor-btn"
                >
                  Tách màn hình
                </Button>
                <Button icon={<ExpandOutlined />} onClick={handleOpenOHIF}>
                  Mở OHIF tab mới
                </Button>
                <Button icon={<LinkOutlined />} onClick={handleOpenOrthancExplorer}>
                  Orthanc Explorer
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadStudy}>
                  Tải về
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExportDicom}
                  loading={exportLoading}
                  data-testid="dicom-export-btn"
                >
                  Xuất DICOM
                </Button>
              </>
            )}
          </Space>
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Alert
          title="Lỗi kết nối PACS"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* PACS Not Available Warning */}
      {!pacsAvailable && !error && (
        <Alert
          title="PACS Server chưa được cấu hình"
          description={
            <div>
              <p>Để xem ảnh DICOM, cần có Orthanc PACS Server đang chạy.</p>
              <p>Cấu hình mặc định:</p>
              <ul>
                <li>Orthanc Web: {ORTHANC_BASE}</li>
                <li>DICOM Port: 4242</li>
              </ul>
              <p>
                <strong>Study UID:</strong> {studyInstanceUID}
              </p>
              <Button
                type="link"
                icon={<SettingOutlined />}
                onClick={() => navigate('/radiology')}
                style={{ padding: 0 }}
              >
                Đi tới cấu hình PACS
              </Button>
            </div>
          }
          type="warning"
          icon={<ExclamationCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Study Info */}
      <Card title="Thông tin Study" size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={4} size="small">
          <Descriptions.Item label="Study UID">
            <Text copyable style={{ fontSize: 12 }}>{studyInstanceUID}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Bệnh nhân">
            {studyInfo?.patientName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Mã BN">
            {studyInfo?.patientId || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày chụp">
            {studyInfo?.studyDate || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Mô tả">
            {studyInfo?.studyDescription || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Modality">
            {studyInfo?.modality && <Tag color="blue">{studyInfo.modality}</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Số Series">
            {studyInfo?.seriesCount || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Số ảnh">
            {studyInfo?.instanceCount || 0}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* A1: Embedded OHIF iframe — MPR 4-quadrant, 3D volume, MIP, Mamography, Compare studies */}
      {embedOhif && pacsAvailable && (
        <Card
          title={
            <Space>
              <AppstoreOutlined />
              MPR / 3D / MIP / Mamography Viewer (OHIF)
            </Space>
          }
          extra={
            <Space>
              <Button size="small" icon={<ExpandOutlined />} onClick={handleOpenOHIF}>
                Mở tab mới
              </Button>
              <Button size="small" onClick={() => setEmbedOhif(false)}>
                Đóng
              </Button>
            </Space>
          }
          style={{ marginBottom: 16 }}
          styles={{ body: { padding: 0, height: '75vh' } }}
        >
          <iframe
            title="OHIF MPR 3D Viewer"
            src={ohifEmbedUrl}
            style={{ width: '100%', height: '100%', border: 0 }}
            allow="fullscreen"
            data-testid="dicom-ohif-iframe"
          />
        </Card>
      )}

      {/* Main Content */}
      <Row gutter={16}>
        {/* Series List */}
        <Col xs={24} md={4}>
          <Card
            title={<><FolderOutlined /> Series ({series.length})</>}
            size="small"
            style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}
          >
            {series.length > 0 ? (
              <div>
                {series.map((s) => (
                  <div
                    key={s.seriesInstanceUID}
                    onClick={() => handleSeriesSelect(s)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedSeries?.seriesInstanceUID === s.seriesInstanceUID ? '#e6f7ff' : 'transparent',
                      padding: '8px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <PictureOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                    <div>
                      <div>
                        <Space>
                          <Tag>{s.modality}</Tag>
                          <Text style={{ fontSize: 12 }}>{s.seriesDescription || 'Series'}</Text>
                        </Space>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {s.instanceCount || s.numberOfImages || 0} ảnh
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description="Không có series"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {/* Image Viewer - Large Preview */}
        <Col xs={24} md={14}>
          <Card
            title={
              <Space>
                <PictureOutlined />
                Ảnh DICOM
                {selectedSeries && (
                  <Tag color="blue">{selectedSeries.seriesDescription || selectedSeries.modality}</Tag>
                )}
              </Space>
            }
            size="small"
            style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}
            extra={
              pacsAvailable && selectedSeries && (
                <Button type="primary" size="small" icon={<ExpandOutlined />} onClick={handleOpenOHIF}>
                  Xem toàn màn hình
                </Button>
              )
            }
          >
            {pacsAvailable ? (
              selectedImageUrl ? (
                <div>
                  {/* W/L Preset bar + viewer-mode toggle */}
                  <Space wrap style={{ marginBottom: 8 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>W/L Preset:</Typography.Text>
                    {viewerConfig.wlPresets.map(p => (
                      <Button
                        key={p.key}
                        size="small"
                        type={activeWlPreset === p.key ? 'primary' : 'default'}
                        onClick={() => { setActiveWlPreset(p.key); csRef.current?.applyWlPreset(p); }}
                      >
                        {p.key}: {p.name}
                      </Button>
                    ))}
                    <Button size="small" onClick={() => setShowOverlay(o => !o)}>
                      {showOverlay ? 'Ẩn' : 'Hiện'} overlay
                    </Button>
                    <Button size="small" onClick={reloadConfig} icon={<ReloadOutlined />}>
                      Reload config
                    </Button>
                    <Button
                      size="small"
                      type={useCs ? 'primary' : 'default'}
                      onClick={() => setUseCs((v) => !v)}
                      data-testid="dicom-cs-toggle"
                    >
                      {useCs ? 'Native DICOM' : 'PNG preview'}
                    </Button>
                  </Space>
                  {useCs && cornerstoneImageIds.length > 0 ? (
                    <div style={{ position: 'relative' }}>
                      <CornerstoneViewer
                        ref={csRef}
                        imageIds={cornerstoneImageIds}
                        initialIndex={Math.max(0, images.findIndex((i) => resolveApiUrl(i.imageUrl || '') === selectedImageUrl))}
                        height="calc(100vh - 460px)"
                      />
                      {/* Overlay DICOM tags theo config */}
                      {showOverlay && studyInfo && (
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(pos => {
                            const fields = viewerConfig.overlayFields
                              .filter(f => f.position === pos)
                              .sort((a, b) => a.order - b.order);
                            if (fields.length === 0) return null;
                            const style: React.CSSProperties = {
                              position: 'absolute',
                              color: '#fff',
                              fontFamily: 'monospace',
                              fontSize: 11,
                              textShadow: '1px 1px 2px #000',
                              padding: 8,
                              [pos.includes('top') ? 'top' : 'bottom']: 8,
                              [pos.includes('left') ? 'left' : 'right']: 8,
                              textAlign: pos.includes('right') ? 'right' : 'left',
                            };
                            const tagMap: Record<string, string | undefined> = {
                              PatientName: studyInfo.patientName,
                              PatientID: studyInfo.patientId,
                              StudyDate: studyInfo.studyDate,
                              StudyDescription: studyInfo.studyDescription,
                              Modality: studyInfo.modality,
                              SeriesDescription: selectedSeries?.seriesDescription,
                            };
                            return (
                              <div key={pos} style={style}>
                                {fields.map(f => {
                                  const val = tagMap[f.tag];
                                  return val ? <div key={f.tag}>{f.tag}: {val}</div> : null;
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                  <div style={{ textAlign: 'center', background: '#000', padding: 8, borderRadius: 4, position: 'relative' }}>
                    <img
                      src={selectedImageUrl}
                      alt="DICOM"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 'calc(100vh - 500px)',
                        objectFit: 'contain',
                      }}
                    />
                    {/* Overlay DICOM tags theo config */}
                    {showOverlay && studyInfo && (
                      <>
                        {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(pos => {
                          const fields = viewerConfig.overlayFields
                            .filter(f => f.position === pos)
                            .sort((a, b) => a.order - b.order);
                          if (fields.length === 0) return null;
                          const style: React.CSSProperties = {
                            position: 'absolute',
                            color: '#fff',
                            fontFamily: 'monospace',
                            fontSize: 11,
                            textShadow: '1px 1px 2px #000',
                            padding: 8,
                            [pos.includes('top') ? 'top' : 'bottom']: 8,
                            [pos.includes('left') ? 'left' : 'right']: 8,
                            textAlign: pos.includes('right') ? 'right' : 'left',
                          };
                          const tagMap: Record<string, string | undefined> = {
                            PatientName: studyInfo.patientName,
                            PatientID: studyInfo.patientId,
                            StudyDate: studyInfo.studyDate,
                            StudyDescription: studyInfo.studyDescription,
                            Modality: studyInfo.modality,
                            SeriesDescription: selectedSeries?.seriesDescription,
                          };
                          return (
                            <div key={pos} style={style}>
                              {fields.map(f => {
                                const val = tagMap[f.tag];
                                return val ? <div key={f.tag}>{f.tag}: {val}</div> : null;
                              })}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                  )}
                </div>
              ) : (
                <Empty description="Chọn ảnh để xem" />
              )
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <FileImageOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />
                <Title level={5} type="secondary" style={{ marginTop: 16 }}>
                  PACS Server chưa kết nối
                </Title>
                <Text type="secondary">
                  Vui lòng khởi động Orthanc PACS Server để xem ảnh DICOM
                </Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Image Thumbnails */}
        <Col xs={24} md={6}>
          <Card
            title={<><PictureOutlined /> Thumbnails ({images.length})</>}
            size="small"
            style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}
          >
            {images.length > 0 ? (
              <Row gutter={[4, 4]}>
                {images.map((img, index) => (
                  <Col key={img.sopInstanceUID || index} xs={12}>
                    <Card
                      hoverable
                      size="small"
                      style={{
                        border: selectedImageUrl === resolveApiUrl(img.imageUrl) ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      }}
                      cover={
                        <div
                          style={{
                            height: 80,
                            background: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {img.thumbnailUrl ? (
                            <img
                              src={resolveApiUrl(img.thumbnailUrl)}
                              alt={`Frame ${img.instanceNumber || index + 1}`}
                              style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain' }}
                            />
                          ) : (
                            <PictureOutlined style={{ fontSize: 24, color: '#fff' }} />
                          )}
                        </div>
                      }
                      onClick={() => setSelectedImageUrl(resolveApiUrl(img.imageUrl || img.thumbnailUrl || ''))}
                    >
                      <Card.Meta
                        description={
                          <Text style={{ fontSize: 10 }} type="secondary">
                            Frame {img.instanceNumber || index + 1}
                          </Text>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="Chọn series để xem" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      {/* QW3.3: Compare 2 studies modal */}
      <Modal
        title={<Space><DiffOutlined /> So sánh 2 ca chụp</Space>}
        open={compareOpen}
        onCancel={() => setCompareOpen(false)}
        onOk={handleCompare}
        okText="Mở OHIF so sánh"
        cancelText="Hủy"
        width={700}
        data-testid="dicom-compare-modal"
      >
        <Alert
          type="info"
          showIcon
          title="Chọn ca chụp cũ của cùng BN (hoặc dán Study UID) để mở trong OHIF side-by-side."
          style={{ marginBottom: 12 }}
        />
        <div style={{ marginBottom: 8 }}>
          <strong>Ca chụp hiện tại:</strong>
          <div><Text code>{studyInstanceUID}</Text></div>
        </div>
        {patientStudies.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <strong>Ca chụp trước của BN:</strong>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8, marginTop: 4 }}>
              {patientStudies.map((s) => (
                <div
                  key={s.studyInstanceUID}
                  onClick={() => setCompareUid(s.studyInstanceUID)}
                  style={{
                    padding: 8,
                    cursor: 'pointer',
                    backgroundColor: compareUid === s.studyInstanceUID ? '#e6f4ff' : 'transparent',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div>
                    {s.modality && <Tag color="blue">{s.modality}</Tag>}
                    {s.serviceName}
                    {s.studyDate && <span style={{ marginLeft: 8, color: '#999' }}>{s.studyDate}</span>}
                  </div>
                  <Text code style={{ fontSize: 11 }}>{s.studyInstanceUID}</Text>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <strong>Hoặc dán Study UID:</strong>
          <input
            type="text"
            value={compareUid}
            onChange={(e) => setCompareUid(e.target.value)}
            placeholder="1.2.840.113619.2.55..."
            style={{ width: '100%', padding: 6, marginTop: 4, border: '1px solid #d9d9d9', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
      </Modal>

      {/* AI Labeling */}
      {selectedImageUrl && (
        <AiLabelingModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          studyInstanceUID={studyInstanceUID}
          previewUrl={selectedImageUrl}
          patientId={studyInfo?.patientId}
        />
      )}
    </div>
  );
};

export default DicomViewer;

