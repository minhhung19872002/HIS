import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Modal,
  Form,
  Select,
  Typography,
  message,
  Tabs,
  Badge,
  Descriptions,
  DatePicker,
  Alert,
  Divider,
  Avatar,
  Tooltip,
  Timeline,
  Upload,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  TeamOutlined,
  VideoCameraOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  FileTextOutlined,
  PictureOutlined,
  SendOutlined,
  QrcodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CommentOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import risApi from '../api/ris';
import type {
  ConsultationSessionDto,
  ConsultationCaseDto,
  ConsultationParticipantDto,
  ConsultationDiscussionDto,
  ConsultationMinutesDto,
  SaveConsultationSessionDto,
  SearchConsultationDto,
} from '../api/ris';

const { Title, Text, Paragraph } = Typography;
const { Search, TextArea } = Input;
const { RangePicker } = DatePicker;

const Consultation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState<ConsultationSessionDto[]>([]);
  const [selectedSession, setSelectedSession] = useState<ConsultationSessionDto | null>(null);
  const [discussions, setDiscussions] = useState<ConsultationDiscussionDto[]>([]);
  const [minutes, setMinutes] = useState<ConsultationMinutesDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMinutesModalOpen, setIsMinutesModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [discussionText, setDiscussionText] = useState('');
  const [form] = Form.useForm();
  const [minutesForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<SearchConsultationDto>({
    page: 1,
    pageSize: 20,
  });
  const [totalCount, setTotalCount] = useState(0);

  // Fetch consultation sessions
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await risApi.searchConsultations(searchParams);
      if (response.data) {
        setSessions(response.data.items || []);
        setTotalCount(response.data.totalCount || 0);
      }
    } catch (error) {
      console.warn('Error fetching consultations:', error);
      setSessions([]);
      message.error('Không thể tải danh sách hội chẩn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [searchParams]);

  // Get status tag
  const getStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="blue" icon={<CalendarOutlined />}>Đã lên lịch</Tag>;
      case 1:
        return <Tag color="green" icon={<PlayCircleOutlined />}>Đang diễn ra</Tag>;
      case 2:
        return <Tag color="default" icon={<CheckCircleOutlined />}>Đã kết thúc</Tag>;
      case 3:
        return <Tag color="red" icon={<StopOutlined />}>Đã hủy</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Handle create session
  const handleCreateSession = async (values: any) => {
    try {
      const data: SaveConsultationSessionDto = {
        title: values.title,
        description: values.description,
        scheduledTime: values.scheduledTime.format(),
        meetingUrl: values.meetingUrl,
      };
      await risApi.saveConsultationSession(data);
      message.success('Tạo phiên hội chẩn thành công');
      setIsCreateModalOpen(false);
      form.resetFields();
      fetchSessions();
    } catch (error) {
      message.error('Có lỗi xảy ra khi tạo phiên hội chẩn');
    }
  };

  // Handle start consultation
  const handleStartConsultation = async (sessionId: string) => {
    try {
      await risApi.startConsultation(sessionId);
      message.success('Đã bắt đầu phiên hội chẩn');
      fetchSessions();
    } catch (error) {
      message.error('Có lỗi xảy ra');
    }
  };

  // Handle end consultation
  const handleEndConsultation = async (sessionId: string) => {
    try {
      await risApi.endConsultation(sessionId);
      message.success('Đã kết thúc phiên hội chẩn');
      fetchSessions();
    } catch (error) {
      message.error('Có lỗi xảy ra');
    }
  };

  // Handle join consultation
  const handleJoinConsultation = async (sessionId: string) => {
    try {
      await risApi.joinConsultation(sessionId);
      message.success('Đã tham gia phiên hội chẩn');
      // Open video conference or consultation viewer
      window.open(`/consultation/room/${sessionId}`, '_blank');
    } catch (error) {
      message.error('Có lỗi xảy ra');
    }
  };

  // Handle view session details
  const handleViewSession = async (session: ConsultationSessionDto) => {
    setSelectedSession(session);
    setIsDetailModalOpen(true);

    // Fetch discussions
    if (session.cases && session.cases.length > 0) {
      try {
        const response = await risApi.getConsultationDiscussions(session.cases[0].id);
        setDiscussions(response.data || []);
      } catch (error) {
        setDiscussions([]);
      }
    }

    // Fetch minutes
    try {
      const minutesResponse = await risApi.getConsultationMinutes(session.id);
      setMinutes(minutesResponse.data);
    } catch (error) {
      setMinutes(null);
    }
  };

  // Handle send discussion
  const handleSendDiscussion = async () => {
    if (!discussionText.trim() || !selectedSession?.cases?.[0]) return;

    try {
      await risApi.addConsultationDiscussion({
        consultationCaseId: selectedSession.cases[0].id,
        content: discussionText,
      });
      setDiscussionText('');
      // Refresh discussions
      const response = await risApi.getConsultationDiscussions(selectedSession.cases[0].id);
      setDiscussions(response.data || []);
    } catch (error) {
      message.error('Có lỗi xảy ra khi gửi thảo luận');
    }
  };

  // Handle save minutes
  const handleSaveMinutes = async (values: any) => {
    if (!selectedSession) return;

    try {
      await risApi.saveConsultationMinutes({
        consultationSessionId: selectedSession.id,
        content: values.content,
        conclusion: values.conclusion,
        recommendations: values.recommendations,
      });
      message.success('Đã lưu biên bản hội chẩn');
      setIsMinutesModalOpen(false);
    } catch (error) {
      message.error('Có lỗi xảy ra khi lưu biên bản');
    }
  };

  // Generate QR Code for invitation
  const handleGenerateQR = async (sessionId: string) => {
    try {
      const result = await risApi.generateQRCode({
        dataType: 'ConsultationInvite',
        referenceId: sessionId,
      });
      Modal.info({
        title: 'Mã QR mời tham gia hội chẩn',
        content: (
          <div style={{ textAlign: 'center' }}>
            <img src={result.data.qrCodeImage} alt="QR Code" style={{ maxWidth: 200 }} />
            <p>Quét mã để tham gia phiên hội chẩn</p>
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(result.data.qrData);
                message.success('Đã sao chép link mời');
              }}
            >
              Sao chép link
            </Button>
          </div>
        ),
      });
    } catch (error) {
      message.error('Không thể tạo mã QR');
    }
  };

  // Session columns
  const sessionColumns: ColumnsType<ConsultationSessionDto> = [
    {
      title: 'Mã phiên',
      dataIndex: 'sessionCode',
      key: 'sessionCode',
      width: 130,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Thời gian',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      width: 150,
      render: (time) => dayjs(time).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Số ca',
      dataIndex: 'caseCount',
      key: 'caseCount',
      width: 80,
      align: 'center',
      render: (count) => <Badge count={count} showZero style={{ backgroundColor: '#1890ff' }} />,
    },
    {
      title: 'Người tạo',
      dataIndex: 'createdByUserName',
      key: 'createdByUserName',
      width: 150,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 280,
      render: (_, record) => (
        <Space wrap>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewSession(record)}
          >
            Xem
          </Button>
          {record.status === 0 && (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartConsultation(record.id)}
            >
              Bắt đầu
            </Button>
          )}
          {record.status === 1 && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<VideoCameraOutlined />}
                onClick={() => handleJoinConsultation(record.id)}
              >
                Vào hội chẩn
              </Button>
              <Popconfirm
                title="Xác nhận kết thúc phiên hội chẩn?"
                onConfirm={() => handleEndConsultation(record.id)}
              >
                <Button size="small" danger icon={<StopOutlined />}>
                  Kết thúc
                </Button>
              </Popconfirm>
            </>
          )}
          <Button
            size="small"
            icon={<QrcodeOutlined />}
            onClick={() => handleGenerateQR(record.id)}
          >
            QR
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>
        <TeamOutlined /> Hội chẩn Ca chụp CĐHA
      </Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'sessions',
              label: (
                <span>
                  <CalendarOutlined />
                  Phiên hội chẩn
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <RangePicker
                          format="DD/MM/YYYY"
                          placeholder={['Từ ngày', 'Đến ngày']}
                          onChange={(dates) => {
                            if (dates) {
                              setSearchParams({
                                ...searchParams,
                                fromDate: dates[0]?.format('YYYY-MM-DD'),
                                toDate: dates[1]?.format('YYYY-MM-DD'),
                              });
                            }
                          }}
                        />
                        <Select
                          placeholder="Trạng thái"
                          style={{ width: 150 }}
                          allowClear
                          onChange={(value) => setSearchParams({ ...searchParams, status: value })}
                        >
                          <Select.Option value={0}>Đã lên lịch</Select.Option>
                          <Select.Option value={1}>Đang diễn ra</Select.Option>
                          <Select.Option value={2}>Đã kết thúc</Select.Option>
                          <Select.Option value={3}>Đã hủy</Select.Option>
                        </Select>
                        <Search
                          placeholder="Tìm kiếm..."
                          allowClear
                          style={{ width: 250 }}
                          onSearch={(value) => setSearchParams({ ...searchParams, keyword: value })}
                        />
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchSessions}>
                          Làm mới
                        </Button>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setIsCreateModalOpen(true)}
                        >
                          Tạo phiên mới
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Table
                    columns={sessionColumns}
                    dataSource={sessions}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    pagination={{
                      current: searchParams.page,
                      pageSize: searchParams.pageSize,
                      total: totalCount,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} phiên`,
                      onChange: (page, pageSize) => {
                        setSearchParams({ ...searchParams, page, pageSize });
                      },
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => handleViewSession(record),
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'upcoming',
              label: (
                <span>
                  <ClockCircleOutlined />
                  Sắp diễn ra
                  <Badge count={sessions.filter(s => s.status === 0).length} style={{ marginLeft: 8 }} />
                </span>
              ),
              children: (
                <div>
                  {sessions.filter(s => s.status === 0).map((session) => (
                    <div key={session.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                          <div>
                            <Space>
                              <Text strong>{session.title}</Text>
                              <Tag>{session.sessionCode}</Tag>
                            </Space>
                          </div>
                          <Space orientation="vertical" size={0}>
                            <Text type="secondary">
                              <ClockCircleOutlined /> {dayjs(session.scheduledTime).format('DD/MM/YYYY HH:mm')}
                            </Text>
                            <Text type="secondary">
                              <UserOutlined /> {session.createdByUserName} | {session.caseCount} ca chụp
                            </Text>
                          </Space>
                        </div>
                      </div>
                      <Space>
                        <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStartConsultation(session.id)}>
                          Bắt đầu
                        </Button>
                        <Button icon={<EditOutlined />}>Sửa</Button>
                      </Space>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'ongoing',
              label: (
                <span>
                  <VideoCameraOutlined />
                  Đang diễn ra
                  <Badge count={sessions.filter(s => s.status === 1).length} style={{ marginLeft: 8 }} />
                </span>
              ),
              children: (
                <div>
                  {sessions.filter(s => s.status === 1).map((session) => (
                    <div key={session.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Badge dot status="processing">
                          <Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#52c41a' }} />
                        </Badge>
                        <div>
                          <div>
                            <Space>
                              <Text strong>{session.title}</Text>
                              <Tag color="green">Đang diễn ra</Tag>
                            </Space>
                          </div>
                          <Text type="secondary">
                            Bắt đầu lúc: {dayjs(session.startTime).format('HH:mm')} | {session.caseCount} ca chụp
                          </Text>
                        </div>
                      </div>
                      <Space>
                        <Button type="primary" icon={<VideoCameraOutlined />} onClick={() => handleJoinConsultation(session.id)}>
                          Vào hội chẩn
                        </Button>
                      </Space>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'completed',
              label: (
                <span>
                  <CheckCircleOutlined />
                  Đã hoàn thành
                </span>
              ),
              children: (
                <Table
                  columns={[
                    ...sessionColumns.slice(0, -1),
                    {
                      title: 'Thao tác',
                      key: 'action',
                      width: 200,
                      render: (_, record) => (
                        <Space>
                          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewSession(record)}>
                            Xem chi tiết
                          </Button>
                          <Button size="small" icon={<DownloadOutlined />}>
                            Tải biên bản
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                  dataSource={sessions.filter(s => s.status === 2)}
                  rowKey="id"
                  size="small"
                  onRow={(record) => ({
                    onDoubleClick: () => handleViewSession(record),
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Create Session Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            Tạo phiên hội chẩn mới
          </Space>
        }
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Tạo phiên"
        cancelText="Hủy"
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSession}>
          <Form.Item
            name="title"
            label="Tiêu đề phiên hội chẩn"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="VD: Hội chẩn ca CT ngực nghi ngờ ung thư phổi" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <TextArea rows={3} placeholder="Mô tả chi tiết về phiên hội chẩn..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="scheduledTime"
                label="Thời gian dự kiến"
                rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn thời gian"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="meetingUrl"
                label="Link họp trực tuyến (nếu có)"
              >
                <Input placeholder="https://meet.google.com/..." />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            title="Lưu ý"
            description="Sau khi tạo phiên, bạn có thể thêm ca chụp cần hội chẩn và mời thành viên tham gia."
            type="info"
            showIcon
          />
        </Form>
      </Modal>

      {/* Session Detail Modal */}
      <Modal
        title={
          <Space>
            <TeamOutlined />
            Chi tiết phiên hội chẩn
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedSession(null);
        }}
        footer={[
          <Button key="minutes" icon={<FileTextOutlined />} onClick={() => setIsMinutesModalOpen(true)}>
            Biên bản
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={900}
      >
        {selectedSession && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã phiên">{selectedSession.sessionCode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{getStatusTag(selectedSession.status)}</Descriptions.Item>
              <Descriptions.Item label="Tiêu đề" span={2}>{selectedSession.title}</Descriptions.Item>
              <Descriptions.Item label="Mô tả" span={2}>{selectedSession.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="Thời gian dự kiến">
                {dayjs(selectedSession.scheduledTime).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Người tạo">{selectedSession.createdByUserName}</Descriptions.Item>
              {selectedSession.startTime && (
                <Descriptions.Item label="Thời gian bắt đầu">
                  {dayjs(selectedSession.startTime).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
              )}
              {selectedSession.endTime && (
                <Descriptions.Item label="Thời gian kết thúc">
                  {dayjs(selectedSession.endTime).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider>Ca chụp hội chẩn ({selectedSession.caseCount})</Divider>

            <div>
              {(selectedSession.cases || []).map((caseItem: ConsultationCaseDto) => (
                <div key={caseItem.id || caseItem.patientCode} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar icon={<PictureOutlined />} />
                    <div>
                      <div><Text strong>{`${caseItem.patientName} (${caseItem.patientCode})`}</Text></div>
                      <div>
                        <div><Text type="secondary">{caseItem.serviceName}</Text></div>
                        <div><Text type="secondary">Ly do: {caseItem.reason || 'Chua co'}</Text></div>
                      </div>
                    </div>
                  </div>
                  <Space>
                    <Button size="small" icon={<PictureOutlined />}>Xem anh DICOM</Button>
                  </Space>
                </div>
              ))}
            </div>

            <Divider>Thảo luận</Divider>

            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
              {discussions.length > 0 ? (
                <div>
                  {discussions.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Avatar icon={<UserOutlined />} />
                      <div>
                        <div>
                          <Space>
                            <Text strong>{item.userName}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                            </Text>
                          </Space>
                        </div>
                        <p style={{ margin: 0 }}>{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Chưa có thảo luận</Text>
              )}
            </div>

            <Input.Group compact>
              <Input
                style={{ width: 'calc(100% - 100px)' }}
                placeholder="Nhập nội dung thảo luận..."
                value={discussionText}
                onChange={(e) => setDiscussionText(e.target.value)}
                onPressEnter={handleSendDiscussion}
              />
              <Button type="primary" icon={<SendOutlined />} onClick={handleSendDiscussion}>
                Gửi
              </Button>
            </Input.Group>
          </>
        )}
      </Modal>

      {/* Minutes Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Biên bản hội chẩn
          </Space>
        }
        open={isMinutesModalOpen}
        onCancel={() => setIsMinutesModalOpen(false)}
        onOk={() => minutesForm.submit()}
        okText="Lưu biên bản"
        cancelText="Hủy"
        width={800}
      >
        <Form
          form={minutesForm}
          layout="vertical"
          onFinish={handleSaveMinutes}
          initialValues={minutes || {}}
        >
          <Form.Item
            name="content"
            label="Nội dung cuộc họp"
          >
            <TextArea rows={5} placeholder="Ghi lại nội dung chính của cuộc hội chẩn..." />
          </Form.Item>

          <Form.Item
            name="conclusion"
            label="Kết luận"
          >
            <TextArea rows={3} placeholder="Kết luận của hội đồng hội chẩn..." />
          </Form.Item>

          <Form.Item
            name="recommendations"
            label="Đề xuất / Hướng điều trị"
          >
            <TextArea rows={3} placeholder="Đề xuất hướng điều trị tiếp theo..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Consultation;
