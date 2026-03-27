import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Select,
  DatePicker,
  Typography,
  message,
  Tabs,
  Statistic,
  Badge,
  Tooltip,
  Spin,
  Modal,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PhoneOutlined,
  CalendarOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as examApi from '../api/examination';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const FollowUp: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<examApi.AppointmentListDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [overdueList, setOverdueList] = useState<examApi.AppointmentListDto[]>([]);
  const [activeTab, setActiveTab] = useState('today');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [typeFilter, setTypeFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(), dayjs()]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [selectedAppointment, setSelectedAppointment] = useState<examApi.AppointmentListDto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      let fromDate: string;
      let toDate: string;

      if (activeTab === 'today') {
        fromDate = dayjs().format('YYYY-MM-DD');
        toDate = dayjs().format('YYYY-MM-DD');
      } else if (activeTab === 'upcoming') {
        fromDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
        toDate = dayjs().add(30, 'day').format('YYYY-MM-DD');
      } else if (activeTab === 'all') {
        fromDate = dateRange[0].format('YYYY-MM-DD');
        toDate = dateRange[1].format('YYYY-MM-DD');
      } else {
        fromDate = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
        toDate = dayjs().format('YYYY-MM-DD');
      }

      const results = await Promise.allSettled([
        examApi.searchAppointments({
          fromDate,
          toDate,
          keyword: keyword || undefined,
          status: activeTab === 'overdue' ? undefined : statusFilter,
          appointmentType: typeFilter,
          page: pagination.current,
          pageSize: pagination.pageSize,
        }),
        examApi.getOverdueFollowUps(30),
      ]);

      if (results[0].status === 'fulfilled' && results[0].value.data) {
        setAppointments(results[0].value.data.items || []);
        setTotalCount(results[0].value.data.totalCount || 0);
      }
      if (results[1].status === 'fulfilled' && results[1].value.data) {
        setOverdueList(results[1].value.data || []);
      }
    } catch {
      message.warning('Không thể tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, statusFilter, typeFilter, dateRange, pagination]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleUpdateStatus = async (appointmentId: string, status: number, statusLabel: string) => {
    try {
      await examApi.updateAppointmentStatus(appointmentId, status);
      message.success(`Đã cập nhật: ${statusLabel}`);
      fetchAppointments();
    } catch {
      message.warning('Không thể cập nhật trạng thái');
    }
  };

  const handleViewDetail = (record: examApi.AppointmentListDto) => {
    setSelectedAppointment(record);
    setIsDetailModalOpen(true);
  };

  // Statistics
  const todayAppointments = appointments.filter(a => dayjs(a.appointmentDate).isSame(dayjs(), 'day'));
  const todayConfirmed = todayAppointments.filter(a => a.status === 1).length;
  const todayAttended = todayAppointments.filter(a => a.status === 2).length;
  const todayNoShow = todayAppointments.filter(a => a.status === 3).length;

  const getStatusTag = (status: number) => {
    switch (status) {
      case 0: return <Tag color="default">Chờ xác nhận</Tag>;
      case 1: return <Tag color="blue">Đã xác nhận</Tag>;
      case 2: return <Tag color="green">Đã đến khám</Tag>;
      case 3: return <Tag color="red">Không đến</Tag>;
      case 4: return <Tag color="gray">Đã hủy</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const getTypeTag = (type: number) => {
    switch (type) {
      case 1: return <Tag color="blue">Tái khám</Tag>;
      case 2: return <Tag color="green">Khám mới</Tag>;
      case 3: return <Tag color="orange">KSKD</Tag>;
      default: return <Tag>{type}</Tag>;
    }
  };

  const columns: ColumnsType<examApi.AppointmentListDto> = [
    {
      title: 'Mã hẹn',
      dataIndex: 'appointmentCode',
      key: 'appointmentCode',
      width: 140,
    },
    {
      title: 'Ngày hẹn',
      dataIndex: 'appointmentDate',
      key: 'appointmentDate',
      width: 120,
      render: (date, record) => {
        const isOverdue = record.daysOverdue > 0;
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined, fontWeight: isOverdue ? 'bold' : undefined }}>
            {dayjs(date).format('DD/MM/YYYY')}
            {isOverdue && <Tag color="red" style={{ marginLeft: 4 }}>-{record.daysOverdue}d</Tag>}
          </span>
        );
      },
      sorter: (a, b) => a.appointmentDate.localeCompare(b.appointmentDate),
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 130,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'SĐT',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 120,
      render: (phone) => phone ? (
        <Tooltip title={`Gọi ${phone}`}>
          <a href={`tel:${phone}`}><PhoneOutlined /> {phone}</a>
        </Tooltip>
      ) : '-',
    },
    {
      title: 'Loại',
      dataIndex: 'appointmentType',
      key: 'appointmentType',
      width: 100,
      render: (type) => getTypeTag(type),
    },
    {
      title: 'Phòng',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Chẩn đoán trước',
      dataIndex: 'previousDiagnosis',
      key: 'previousDiagnosis',
      width: 200,
      ellipsis: true,
      render: (diag) => diag || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Nhắc nhở',
      key: 'reminder',
      width: 100,
      render: (_, record) => record.isReminderSent ? (
        <Tooltip title={`Đã gửi: ${record.reminderSentAt ? dayjs(record.reminderSentAt).format('DD/MM HH:mm') : ''}`}>
          <Tag color="green">Đã gửi</Tag>
        </Tooltip>
      ) : <Tag color="default">Chưa gửi</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="Xem chi tiết">
            <Button size="small" icon={<UserOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          {(record.status === 0 || record.status === 1) && (
            <>
              <Tooltip title="Xác nhận đến khám">
                <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                  onClick={() => handleUpdateStatus(record.id, 2, 'Đã đến khám')} />
              </Tooltip>
              <Tooltip title="Đánh dấu không đến">
                <Button size="small" danger icon={<CloseCircleOutlined />}
                  onClick={() => handleUpdateStatus(record.id, 3, 'Không đến')} />
              </Tooltip>
            </>
          )}
          {record.status === 0 && (
            <Tooltip title="Xác nhận lịch hẹn">
              <Button size="small" icon={<CalendarOutlined />}
                onClick={() => handleUpdateStatus(record.id, 1, 'Đã xác nhận')} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const displayData = activeTab === 'overdue' ? overdueList : appointments;

  const tabItems = [
    {
      key: 'today',
      label: (
        <Badge count={todayConfirmed} size="small" offset={[8, -2]}>
          <span>Hôm nay</span>
        </Badge>
      ),
    },
    {
      key: 'upcoming',
      label: 'Sắp tới',
    },
    {
      key: 'overdue',
      label: (
        <Badge count={overdueList.length} size="small" offset={[8, -2]}>
          <span style={{ color: overdueList.length > 0 ? '#ff4d4f' : undefined }}>Quá hạn</span>
        </Badge>
      ),
    },
    {
      key: 'all',
      label: 'Tất cả',
    },
  ];

  return (
    <Spin spinning={loading && appointments.length === 0}>
      <div style={{ padding: 0 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>Theo dõi Tái khám Ngoại trú</Title>
            <Tooltip title="Làm mới">
              <Button icon={<ReloadOutlined />} onClick={fetchAppointments} />
            </Tooltip>
          </div>

          {/* Statistics */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Statistic title="Hôm nay" value={todayAppointments.length} prefix={<CalendarOutlined />} />
            </Col>
            <Col span={4}>
              <Statistic title="Đã xác nhận" value={todayConfirmed} styles={{ content: { color: '#1890ff' } }} prefix={<CheckCircleOutlined />} />
            </Col>
            <Col span={4}>
              <Statistic title="Đã đến khám" value={todayAttended} styles={{ content: { color: '#52c41a' } }} prefix={<UserOutlined />} />
            </Col>
            <Col span={4}>
              <Statistic title="Không đến" value={todayNoShow} styles={{ content: { color: todayNoShow > 0 ? '#ff4d4f' : '#52c41a' } }} prefix={<CloseCircleOutlined />} />
            </Col>
            <Col span={4}>
              <Statistic title="Quá hạn (30 ngày)" value={overdueList.length} styles={{ content: { color: overdueList.length > 0 ? '#ff4d4f' : '#52c41a' } }} prefix={<WarningOutlined />} />
            </Col>
            <Col span={4}>
              <Statistic title="Tổng tìm thấy" value={activeTab === 'overdue' ? overdueList.length : totalCount} prefix={<ClockCircleOutlined />} />
            </Col>
          </Row>

          {/* Filters */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Search
                placeholder="Tìm BN, SĐT, mã hẹn..."
                onSearch={setKeyword}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Trạng thái"
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                style={{ width: '100%' }}
                options={[
                  { label: 'Chờ xác nhận', value: 0 },
                  { label: 'Đã xác nhận', value: 1 },
                  { label: 'Đã đến khám', value: 2 },
                  { label: 'Không đến', value: 3 },
                  { label: 'Đã hủy', value: 4 },
                ]}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Loại hẹn"
                value={typeFilter}
                onChange={setTypeFilter}
                allowClear
                style={{ width: '100%' }}
                options={[
                  { label: 'Tái khám', value: 1 },
                  { label: 'Khám mới', value: 2 },
                  { label: 'Khám sức khỏe', value: 3 },
                ]}
              />
            </Col>
            {activeTab === 'all' && (
              <Col span={6}>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setDateRange([dates[0], dates[1]]);
                    }
                  }}
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                />
              </Col>
            )}
          </Row>

          <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key); setPagination({ current: 1, pageSize: 20 }); }} items={tabItems} />

          <Table
            columns={columns}
            dataSource={displayData}
            rowKey="id"
            size="small"
            loading={loading}
            scroll={{ x: 1800 }}
            pagination={activeTab !== 'overdue' ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} lịch hẹn`,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            } : { pageSize: 50, showTotal: (total) => `${total} BN quá hạn` }}
            onRow={(record) => ({
              onDoubleClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title={`Chi tiết lịch hẹn - ${selectedAppointment?.appointmentCode || ''}`}
          open={isDetailModalOpen}
          onCancel={() => { setIsDetailModalOpen(false); setSelectedAppointment(null); }}
          footer={selectedAppointment && (selectedAppointment.status === 0 || selectedAppointment.status === 1) ? [
            <Button key="cancel" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
            <Button key="noshow" danger onClick={() => { handleUpdateStatus(selectedAppointment.id, 3, 'Không đến'); setIsDetailModalOpen(false); }}>
              Không đến
            </Button>,
            <Button key="confirm" type="primary" onClick={() => { handleUpdateStatus(selectedAppointment.id, 2, 'Đã đến khám'); setIsDetailModalOpen(false); }}>
              Xác nhận đến khám
            </Button>,
          ] : [
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
          ]}
          width={700}
        >
          {selectedAppointment && (
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã hẹn">{selectedAppointment.appointmentCode}</Descriptions.Item>
              <Descriptions.Item label="Ngày hẹn">
                {dayjs(selectedAppointment.appointmentDate).format('DD/MM/YYYY')}
                {selectedAppointment.daysOverdue > 0 && <Tag color="red" style={{ marginLeft: 8 }}>Quá {selectedAppointment.daysOverdue} ngày</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedAppointment.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedAppointment.patientName}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{selectedAppointment.gender === 1 ? 'Nam' : selectedAppointment.gender === 2 ? 'Nữ' : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{selectedAppointment.dateOfBirth ? dayjs(selectedAppointment.dateOfBirth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="SĐT">
                {selectedAppointment.phoneNumber ? (
                  <a href={`tel:${selectedAppointment.phoneNumber}`}><PhoneOutlined /> {selectedAppointment.phoneNumber}</a>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Loại">{getTypeTag(selectedAppointment.appointmentType)}</Descriptions.Item>
              <Descriptions.Item label="Phòng">{selectedAppointment.roomName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Bác sĩ">{selectedAppointment.doctorName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{getStatusTag(selectedAppointment.status)}</Descriptions.Item>
              <Descriptions.Item label="Nhắc nhở">
                {selectedAppointment.isReminderSent ? (
                  <Tag color="green">Đã gửi {selectedAppointment.reminderSentAt ? dayjs(selectedAppointment.reminderSentAt).format('DD/MM HH:mm') : ''}</Tag>
                ) : <Tag color="default">Chưa gửi</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán lần trước" span={2}>
                {selectedAppointment.previousDiagnosis || 'Không có thông tin'}
              </Descriptions.Item>
              <Descriptions.Item label="Lý do hẹn" span={2}>
                {selectedAppointment.reason || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>
                {selectedAppointment.notes || '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default FollowUp;
