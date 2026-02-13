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
  List,
  Empty,
  message,
  Divider,
  Tag,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  ExpandOutlined,
  DownloadOutlined,
  PrinterOutlined,
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
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

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
      // Try to get series list
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
        });

        // Build OHIF/Orthanc viewer URL
        // If Orthanc is available at default port, we can use OHIF viewer
        setViewerUrl(`http://localhost:8042/ohif/viewer?StudyInstanceUIDs=${studyInstanceUID}`);

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
    } catch (err) {
      console.error('Error loading images:', err);
      setImages([]);
    }
  };

  const handleSeriesSelect = (s: DicomSeriesDto) => {
    setSelectedSeries(s);
    loadImages(s.seriesInstanceUID);
  };

  const handleOpenOHIFViewer = () => {
    if (viewerUrl) {
      window.open(viewerUrl, '_blank');
    } else {
      message.warning('OHIF Viewer không khả dụng');
    }
  };

  const handleOpenOrthancViewer = () => {
    const orthancUrl = `http://localhost:8042/app/explorer.html#study?uuid=${studyInstanceUID}`;
    window.open(orthancUrl, '_blank');
  };

  const handleDownloadStudy = () => {
    message.info('Chức năng tải study đang được phát triển');
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
                <Button type="primary" icon={<ExpandOutlined />} onClick={handleOpenOHIFViewer}>
                  Mở OHIF Viewer
                </Button>
                <Button icon={<LinkOutlined />} onClick={handleOpenOrthancViewer}>
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
          message="Lỗi kết nối PACS"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* PACS Not Available Warning */}
      {!pacsAvailable && !error && (
        <Alert
          message="PACS Server chưa được cấu hình"
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
        <Col xs={24} md={6}>
          <Card
            title={<><FolderOutlined /> Series ({series.length})</>}
            size="small"
            style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}
          >
            {series.length > 0 ? (
              <List
                size="small"
                dataSource={series}
                renderItem={(s) => (
                  <List.Item
                    onClick={() => handleSeriesSelect(s)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedSeries?.seriesInstanceUID === s.seriesInstanceUID ? '#e6f7ff' : 'transparent',
                      padding: '8px',
                      borderRadius: 4,
                    }}
                  >
                    <List.Item.Meta
                      avatar={<PictureOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                      title={
                        <Space>
                          <Tag>{s.modality}</Tag>
                          <Text style={{ fontSize: 12 }}>{s.seriesDescription || 'Series'}</Text>
                        </Space>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {s.instanceCount || s.numberOfImages || 0} ảnh
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                description="Không có series"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {/* Image Thumbnails */}
        <Col xs={24} md={18}>
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
                <Button type="primary" size="small" icon={<ExpandOutlined />} onClick={handleOpenOHIFViewer}>
                  Xem toàn màn hình
                </Button>
              )
            }
          >
            {pacsAvailable ? (
              images.length > 0 ? (
                <Row gutter={[8, 8]}>
                  {images.map((img, index) => (
                    <Col key={img.sopInstanceUID || index} xs={12} sm={8} md={6} lg={4}>
                      <Card
                        hoverable
                        size="small"
                        cover={
                          <div
                            style={{
                              height: 100,
                              background: '#000',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Tooltip title="Click để xem trong OHIF Viewer">
                              <PictureOutlined style={{ fontSize: 32, color: '#fff' }} />
                            </Tooltip>
                          </div>
                        }
                        onClick={handleOpenOHIFViewer}
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
                <Empty description="Chọn series để xem ảnh" />
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
                <Divider />
                <Space direction="vertical">
                  <Text>Cài đặt Orthanc:</Text>
                  <Button
                    type="link"
                    href="https://www.orthanc-server.com/download.php"
                    target="_blank"
                  >
                    Tải Orthanc Server
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DicomViewer;
