import React, { useState, useEffect } from 'react';
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
  Tooltip,
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
} from '@ant-design/icons';
import risApi from '../api/ris';
import type { DicomSeriesDto, DicomImageDto } from '../api/ris';

const { Title, Text } = Typography;

const ORTHANC_BASE = 'http://localhost:8042';

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

  // Check PACS availability and load study data
  useEffect(() => {
    if (!studyInstanceUID) {
      setError('Thiếu thông tin Study UID');
      setLoading(false);
      return;
    }

    loadStudyData();
  }, [studyInstanceUID]);

  const loadStudyData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get series list from backend API
      const seriesResponse = await risApi.getSeries(studyInstanceUID);

      if (seriesResponse.data && seriesResponse.data.length > 0) {
        setPacsAvailable(true);
        setSeries(seriesResponse.data);

        // Extract study info from first series
        const firstSeries = seriesResponse.data[0] as any;
        setStudyInfo({
          studyInstanceUID,
          patientName: firstSeries.patientName,
          patientId: firstSeries.patientId,
          studyDate: firstSeries.studyDate || firstSeries.seriesDate,
          studyDescription: firstSeries.studyDescription,
          modality: firstSeries.modality,
          seriesCount: seriesResponse.data.length,
          instanceCount: seriesResponse.data.reduce((sum: number, s: any) => sum + (s.instanceCount || s.numberOfImages || 0), 0),
          orthancStudyId: firstSeries.orthancStudyId,
        });

        // Auto-select first series
        setSelectedSeries(firstSeries);
        loadImages(firstSeries.seriesInstanceUID);
      } else {
        // No series found - PACS may not be configured
        setPacsAvailable(false);
        setStudyInfo({
          studyInstanceUID,
        });
      }
    } catch (err: any) {
      console.error('Error loading study:', err);
      setPacsAvailable(false);
      setStudyInfo({
        studyInstanceUID,
      });

      // Check if it's a connection error
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        setError('Không thể kết nối đến PACS Server. Vui lòng kiểm tra cấu hình.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async (seriesUID: string) => {
    try {
      const response = await risApi.getImages(seriesUID);
      setImages(response.data || []);
      // Auto-select first image for large preview
      if (response.data && response.data.length > 0 && response.data[0].imageUrl) {
        setSelectedImageUrl(response.data[0].imageUrl);
      }
    } catch (err) {
      console.error('Error loading images:', err);
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
                <Button type="primary" icon={<ExpandOutlined />} onClick={handleOpenOHIF}>
                  Mở OHIF Viewer
                </Button>
                <Button icon={<LinkOutlined />} onClick={handleOpenOrthancExplorer}>
                  Orthanc Explorer
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadStudy}>
                  Tải về
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
                <li>Orthanc Web: http://localhost:8042</li>
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
                        {(s as any).instanceCount || s.numberOfImages || 0} ảnh
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
                <div style={{ textAlign: 'center', background: '#000', padding: 8, borderRadius: 4 }}>
                  <img
                    src={selectedImageUrl}
                    alt="DICOM"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 'calc(100vh - 450px)',
                      objectFit: 'contain',
                    }}
                  />
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
                        border: selectedImageUrl === img.imageUrl ? '2px solid #1890ff' : '1px solid #d9d9d9',
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
                              src={img.thumbnailUrl}
                              alt={`Frame ${img.instanceNumber || index + 1}`}
                              style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain' }}
                            />
                          ) : (
                            <PictureOutlined style={{ fontSize: 24, color: '#fff' }} />
                          )}
                        </div>
                      }
                      onClick={() => setSelectedImageUrl(img.imageUrl || img.thumbnailUrl || '')}
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
    </div>
  );
};

export default DicomViewer;
