import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Typography,
  Tabs,
  Statistic,
  Descriptions,
  Avatar,
  Timeline,
  Divider,
  message,
  Rate,
  Badge,
  Result,
  Spin,
} from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  CreditCardOutlined,
  StarOutlined,
  BellOutlined,
  HistoryOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAccount,
  getMyAppointments,
  bookAppointment,
  getLabResults,
  getBills,
  getFeedbacks,
  submitFeedback,
  getDashboard,
  getNotifications,
  getDepartments,
  getDoctors,
  markNotificationRead,
} from '../api/patientPortal';
import type {
  PatientAccountDto,
  OnlineAppointmentDto,
  LabResultDto,
  BillSummaryDto,
  FeedbackDto,
  NotificationDto,
  DepartmentInfoDto,
  DoctorInfoDto,
  PatientPortalDashboardDto,
} from '../api/patientPortal';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const PatientPortal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<PatientAccountDto | null>(null);
  const [appointments, setAppointments] = useState<OnlineAppointmentDto[]>([]);
  const [labResults, setLabResults] = useState<LabResultDto[]>([]);
  const [bills, setBills] = useState<BillSummaryDto[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfoDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorInfoDto[]>([]);
  const [dashboard, setDashboard] = useState<PatientPortalDashboardDto | null>(null);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isPatientViewOpen, setIsPatientViewOpen] = useState(false);
  const [appointmentForm] = Form.useForm();
  const [feedbackForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        accountRes,
        appointmentsRes,
        labRes,
        billsRes,
        feedbacksRes,
        dashboardRes,
        notificationsRes,
        departmentsRes,
        doctorsRes,
      ] = await Promise.allSettled([
        getAccount(),
        getMyAppointments(),
        getLabResults(),
        getBills(),
        getFeedbacks(),
        getDashboard(),
        getNotifications(false, 1, 20),
        getDepartments(),
        getDoctors(),
      ]);

      if (accountRes.status === 'fulfilled') {
        setAccount(accountRes.value.data ?? null);
      }
      if (appointmentsRes.status === 'fulfilled') {
        setAppointments(appointmentsRes.value.data ?? []);
      }
      if (labRes.status === 'fulfilled') {
        setLabResults(labRes.value.data ?? []);
      }
      if (billsRes.status === 'fulfilled') {
        setBills(billsRes.value.data ?? []);
      }
      if (feedbacksRes.status === 'fulfilled') {
        setFeedbacks(feedbacksRes.value.data ?? []);
      }
      if (dashboardRes.status === 'fulfilled') {
        setDashboard(dashboardRes.value.data ?? null);
      }
      if (notificationsRes.status === 'fulfilled') {
        const nData = notificationsRes.value.data;
        setNotifications(Array.isArray(nData) ? nData : (nData as any)?.items ?? []);
      }
      if (departmentsRes.status === 'fulfilled') {
        setDepartments(departmentsRes.value.data ?? []);
      }
      if (doctorsRes.status === 'fulfilled') {
        setDoctors(doctorsRes.value.data ?? []);
      }
    } catch {
      message.warning('Khong the tai du lieu cong benh nhan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or computed from local data
  const upcomingAppointments = dashboard?.upcomingAppointments?.length
    ?? appointments.filter((a) => a.status === 1 || a.status === 2).length;
  const pendingResults = dashboard?.pendingLabResults
    ?? labResults.filter((r) => r.status === 'Pending').length;
  const outstandingBalance = dashboard?.outstandingBalance ?? 0;

  const getAccountStatusTag = (status: number) => {
    const config: Record<number, { color: string; text: string }> = {
      1: { color: 'green', text: 'Hoat dong' },
      2: { color: 'red', text: 'Tam khoa' },
      3: { color: 'default', text: 'Vo hieu hoa' },
    };
    const c = config[status] || { color: 'default', text: 'Khong ro' };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleBookAppointment = async (values: any) => {
    try {
      await bookAppointment({
        appointmentType: values.type,
        departmentId: values.departmentId,
        specialtyId: values.specialtyId,
        doctorId: values.doctorId,
        preferredDate: values.date ? dayjs(values.date).format('YYYY-MM-DD') : '',
        preferredTime: values.time || '',
        chiefComplaint: values.notes,
        isFirstVisit: values.type === 'NewVisit',
        insuranceUsed: false,
        notes: values.notes,
      });
      message.success('Da dat lich hen thanh cong');
      setIsAppointmentModalOpen(false);
      appointmentForm.resetFields();
      // Refresh appointments
      try {
        const res = await getMyAppointments();
        setAppointments(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch {
      message.warning('Khong the dat lich hen. Vui long thu lai.');
    }
  };

  const handleSubmitFeedback = async (values: any) => {
    try {
      await submitFeedback({
        feedbackType: 'General',
        category: 'Service',
        departmentId: values.departmentId,
        subject: values.department || 'Danh gia dich vu',
        message: values.comment,
        rating: values.rating,
        visitId: values.visitId,
      });
      message.success('Cam on quy khach da gop y');
      setIsFeedbackModalOpen(false);
      feedbackForm.resetFields();
      // Refresh feedbacks
      try {
        const res = await getFeedbacks();
        setFeedbacks(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch {
      message.warning('Khong the gui danh gia. Vui long thu lai.');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch { /* ignore */ }
  };

  const appointmentColumns: ColumnsType<OnlineAppointmentDto> = [
    {
      title: 'Ngay',
      dataIndex: 'preferredDate',
      key: 'preferredDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Gio',
      dataIndex: 'preferredTime',
      key: 'preferredTime',
    },
    {
      title: 'Bac si',
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (val) => val || '-',
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Loai',
      dataIndex: 'appointmentTypeName',
      key: 'appointmentTypeName',
      render: (val) => val || '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record) => {
        const config: Record<number, { color: string; text: string }> = {
          1: { color: 'blue', text: 'Yeu cau' },
          2: { color: 'green', text: 'Xac nhan' },
          3: { color: 'cyan', text: 'Da check-in' },
          4: { color: 'default', text: 'Hoan thanh' },
          5: { color: 'red', text: 'Da huy' },
          6: { color: 'volcano', text: 'Vang mat' },
        };
        const c = config[status] || { color: 'default', text: record.statusName || 'N/A' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  const labResultColumns: ColumnsType<LabResultDto> = [
    {
      title: 'Ten xet nghiem',
      dataIndex: 'testName',
      key: 'testName',
    },
    {
      title: 'Loai',
      dataIndex: 'testCategory',
      key: 'testCategory',
    },
    {
      title: 'Ngay lam',
      dataIndex: 'testDate',
      key: 'testDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'BS chi dinh',
      dataIndex: 'orderingDoctor',
      key: 'orderingDoctor',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => {
        const color = status === 'Final' ? 'green' : status === 'Partial' ? 'orange' : 'blue';
        return <Tag color={color}>{record.statusName || status}</Tag>;
      },
    },
    {
      title: 'Bat thuong',
      dataIndex: 'isAbnormal',
      key: 'isAbnormal',
      render: (val) => val ? <Tag color="red">Co</Tag> : <Tag color="green">Khong</Tag>,
    },
  ];

  const billColumns: ColumnsType<BillSummaryDto> = [
    {
      title: 'Ma hoa don',
      dataIndex: 'billCode',
      key: 'billCode',
    },
    {
      title: 'Ngay',
      dataIndex: 'billDate',
      key: 'billDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
      render: (val) => val || '-',
    },
    {
      title: 'Tong tien',
      dataIndex: 'subtotal',
      key: 'subtotal',
      render: (val) => `${(val ?? 0).toLocaleString('vi-VN')} VND`,
    },
    {
      title: 'BHYT chi tra',
      dataIndex: 'insuranceCoverage',
      key: 'insuranceCoverage',
      render: (val) => `${(val ?? 0).toLocaleString('vi-VN')} VND`,
    },
    {
      title: 'BN tra',
      dataIndex: 'patientResponsibility',
      key: 'patientResponsibility',
      render: (val) => `${(val ?? 0).toLocaleString('vi-VN')} VND`,
    },
    {
      title: 'Con no',
      dataIndex: 'amountDue',
      key: 'amountDue',
      render: (val) => (
        <Text strong style={{ color: val > 0 ? '#ff4d4f' : '#52c41a' }}>
          {(val ?? 0).toLocaleString('vi-VN')} VND
        </Text>
      ),
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => {
        const color = status === 'Paid' ? 'green' : status === 'Overdue' ? 'red' : status === 'PartialPaid' ? 'orange' : 'blue';
        return <Tag color={color}>{record.statusName || status}</Tag>;
      },
    },
  ];

  const feedbackColumns: ColumnsType<FeedbackDto> = [
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
      render: (val) => val || '-',
    },
    {
      title: 'Loai',
      dataIndex: 'feedbackTypeName',
      key: 'feedbackTypeName',
    },
    {
      title: 'Chu de',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Diem',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => rating ? <Rate disabled defaultValue={rating} /> : '-',
    },
    {
      title: 'Trang thai',
      key: 'status',
      render: (_, record) => {
        const config: Record<number, { color: string; text: string }> = {
          1: { color: 'blue', text: 'Da gui' },
          2: { color: 'orange', text: 'Dang xu ly' },
          3: { color: 'green', text: 'Da giai quyet' },
          4: { color: 'default', text: 'Da dong' },
        };
        const c = config[record.status] || { color: 'default', text: record.statusName || 'N/A' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: 'Phan hoi',
      key: 'response',
      render: (_, record) =>
        record.responseMessage ? (
          <Tag color="green">Da phan hoi</Tag>
        ) : (
          <Tag color="orange">Chua phan hoi</Tag>
        ),
    },
  ];

  // Compute feedback statistics
  const avgRating = feedbacks.length > 0
    ? feedbacks.filter((f) => f.rating).reduce((sum, f) => sum + (f.rating ?? 0), 0) / feedbacks.filter((f) => f.rating).length
    : 0;
  const responseRate = feedbacks.length > 0
    ? Math.round((feedbacks.filter((f) => f.responseMessage).length / feedbacks.length) * 100)
    : 0;

  return (
    <Spin spinning={loading}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Cong benh nhan (Patient Portal)</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Lam moi
          </Button>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tai khoan"
                value={account ? 1 : 0}
                prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
                suffix={account ? <Tag color="green" style={{ marginLeft: 8, fontSize: 12 }}>{account.accountStatusName || 'Active'}</Tag> : undefined}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Lich hen sap toi"
                value={upcomingAppointments}
                prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Ket qua cho tra"
                value={pendingResults}
                prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Cong no"
                value={outstandingBalance}
                prefix={<CreditCardOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: outstandingBalance > 0 ? '#ff4d4f' : '#52c41a' } }}
                formatter={(val) => `${Number(val).toLocaleString('vi-VN')} VND`}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content */}
        <Card>
          <Tabs
            defaultActiveKey="appointments"
            items={[
              {
                key: 'appointments',
                label: 'Lich hen',
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<CalendarOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => setIsAppointmentModalOpen(true)}
                    >
                      Dat lich moi
                    </Button>
                    <Table
                      columns={appointmentColumns}
                      dataSource={appointments}
                      rowKey="id"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: 'Chi tiet lich hen',
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Benh nhan">{record.patientName}</Descriptions.Item>
                                <Descriptions.Item label="Ngay hen">{record.preferredDate ? dayjs(record.preferredDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Gio">{record.preferredTime}</Descriptions.Item>
                                <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                                <Descriptions.Item label="Bac si">{record.doctorName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ly do">{record.chiefComplaint || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trang thai">{record.statusName}</Descriptions.Item>
                                {record.confirmationCode && (
                                  <Descriptions.Item label="Ma xac nhan">{record.confirmationCode}</Descriptions.Item>
                                )}
                                {record.notes && (
                                  <Descriptions.Item label="Ghi chu">{record.notes}</Descriptions.Item>
                                )}
                              </Descriptions>
                            ),
                          });
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </>
                ),
              },
              {
                key: 'labResults',
                label: 'Ket qua xet nghiem',
                children: (
                  <Table
                    columns={labResultColumns}
                    dataSource={labResults}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Ket qua: ${record.testName}`,
                          width: 600,
                          content: (
                            <div style={{ marginTop: 16 }}>
                              <Descriptions bordered size="small" column={2}>
                                <Descriptions.Item label="Ngay lam">{record.testDate ? dayjs(record.testDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trang thai">{record.statusName || record.status}</Descriptions.Item>
                                <Descriptions.Item label="BS chi dinh">{record.orderingDoctor}</Descriptions.Item>
                                <Descriptions.Item label="Bat thuong">{record.isAbnormal ? 'Co' : 'Khong'}</Descriptions.Item>
                                {record.interpretation && (
                                  <Descriptions.Item label="Nhan dinh" span={2}>{record.interpretation}</Descriptions.Item>
                                )}
                              </Descriptions>
                              {record.results && record.results.length > 0 && (
                                <Table
                                  size="small"
                                  style={{ marginTop: 12 }}
                                  dataSource={record.results}
                                  rowKey="testItemName"
                                  pagination={false}
                                  columns={[
                                    { title: 'Chi so', dataIndex: 'testItemName', key: 'testItemName' },
                                    { title: 'Ket qua', dataIndex: 'value', key: 'value', render: (val, row) => (
                                      <Text type={row.isAbnormal ? 'danger' : undefined} strong={row.isAbnormal}>{val} {row.unit || ''}</Text>
                                    )},
                                    { title: 'Tham chieu', dataIndex: 'referenceRange', key: 'referenceRange' },
                                    { title: 'Flag', dataIndex: 'flag', key: 'flag', render: (val) => val ? <Tag color="red">{val}</Tag> : '-' },
                                  ]}
                                />
                              )}
                            </div>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'bills',
                label: 'Hoa don',
                children: (
                  <Table
                    columns={billColumns}
                    dataSource={bills}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Hoa don: ${record.billCode}`,
                          width: 600,
                          content: (
                            <div style={{ marginTop: 16 }}>
                              <Descriptions bordered size="small" column={2}>
                                <Descriptions.Item label="Ngay">{record.billDate ? dayjs(record.billDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trang thai">{record.statusName || record.status}</Descriptions.Item>
                                <Descriptions.Item label="Tong">{(record.subtotal ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                                <Descriptions.Item label="BHYT">{(record.insuranceCoverage ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                                <Descriptions.Item label="BN tra">{(record.patientResponsibility ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                                <Descriptions.Item label="Con no">{(record.amountDue ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                              </Descriptions>
                              {record.items && record.items.length > 0 && (
                                <Table
                                  size="small"
                                  style={{ marginTop: 12 }}
                                  dataSource={record.items}
                                  rowKey="description"
                                  pagination={false}
                                  columns={[
                                    { title: 'Dich vu', dataIndex: 'description', key: 'description' },
                                    { title: 'SL', dataIndex: 'quantity', key: 'quantity' },
                                    { title: 'Don gia', dataIndex: 'unitPrice', key: 'unitPrice', render: (v) => `${(v ?? 0).toLocaleString('vi-VN')}` },
                                    { title: 'Thanh tien', dataIndex: 'amount', key: 'amount', render: (v) => `${(v ?? 0).toLocaleString('vi-VN')}` },
                                    { title: 'BN tra', dataIndex: 'patientPays', key: 'patientPays', render: (v) => `${(v ?? 0).toLocaleString('vi-VN')}` },
                                  ]}
                                />
                              )}
                            </div>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'feedbacks',
                label: 'Danh gia dich vu',
                children: (
                  <>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <Button
                          type="primary"
                          icon={<StarOutlined />}
                          onClick={() => setIsFeedbackModalOpen(true)}
                        >
                          Gui danh gia
                        </Button>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Diem trung binh"
                            value={avgRating ? avgRating.toFixed(1) : 0}
                            suffix="/5"
                            prefix={<StarOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic title="Tong danh gia" value={feedbacks.length} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Ty le phan hoi"
                            value={responseRate}
                            suffix="%"
                          />
                        </Card>
                      </Col>
                    </Row>
                    <Table
                      columns={feedbackColumns}
                      dataSource={feedbacks}
                      rowKey="id"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: 'Chi tiet danh gia',
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Benh nhan">{record.patientName}</Descriptions.Item>
                                <Descriptions.Item label="Loai">{record.feedbackTypeName}</Descriptions.Item>
                                <Descriptions.Item label="Khoa">{record.departmentName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Diem">{record.rating ? `${record.rating}/5` : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Noi dung">{record.message}</Descriptions.Item>
                                <Descriptions.Item label="Phan hoi">{record.responseMessage || 'Chua phan hoi'}</Descriptions.Item>
                                <Descriptions.Item label="Ngay gui">{record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                              </Descriptions>
                            ),
                          });
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </>
                ),
              },
              {
                key: 'features',
                label: 'Tinh nang Portal',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <CalendarOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                          <Title level={5}>Dat lich kham</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Dat lich hen truc tuyen, chon bac si va khung gio phu hop
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <FileTextOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                          <Title level={5}>Xem ket qua</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Tra cuu ket qua xet nghiem, CDHA truc tuyen
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <MedicineBoxOutlined style={{ fontSize: 48, color: '#722ed1' }} />
                          <Title level={5}>Don thuoc</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Xem don thuoc, gui den nha thuoc lien ket
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <CreditCardOutlined style={{ fontSize: 48, color: '#eb2f96' }} />
                          <Title level={5}>Thanh toan</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Thanh toan truc tuyen qua VNPay, Momo, The
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <HistoryOutlined style={{ fontSize: 48, color: '#faad14' }} />
                          <Title level={5}>Lich su kham</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Xem lich su kham benh, ho so suc khoe ca nhan
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <StarOutlined style={{ fontSize: 48, color: '#13c2c2' }} />
                          <Title level={5}>Danh gia</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Gui danh gia, gop y ve chat luong dich vu
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'notifications',
                label: (
                  <Badge count={notifications.filter((n) => !n.isRead).length} size="small" offset={[8, 0]}>
                    Thong bao
                  </Badge>
                ),
                children: (
                  <div>
                    {notifications.length === 0 ? (
                      <Result status="info" title="Khong co thong bao" />
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            padding: '12px 0',
                            borderBottom: '1px solid #f0f0f0',
                            background: item.isRead ? 'transparent' : '#f6ffed',
                            paddingLeft: 8,
                            paddingRight: 8,
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            if (!item.isRead) handleMarkNotificationRead(item.id);
                          }}
                        >
                          <div style={{ marginRight: 16, flexShrink: 0 }}>
                            <Badge dot={!item.isRead}><BellOutlined style={{ fontSize: 24 }} /></Badge>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{item.title}</div>
                            <Space orientation="vertical" size={0}>
                              <Text>{item.message}</Text>
                              <Text type="secondary">
                                {item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : ''}
                              </Text>
                            </Space>
                          </div>
                          {!item.isRead && (
                            <Tag color="blue" style={{ flexShrink: 0 }}>Moi</Tag>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: 'account',
                label: 'Tai khoan',
                children: account ? (
                  <>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Avatar size={100} icon={<UserOutlined />} src={account.avatarUrl} />
                      </Col>
                      <Col span={18}>
                        <Descriptions bordered size="small" column={2}>
                          <Descriptions.Item label="Ho ten">{account.fullName}</Descriptions.Item>
                          <Descriptions.Item label="Trang thai">
                            {getAccountStatusTag(account.accountStatus)}
                          </Descriptions.Item>
                          <Descriptions.Item label="SDT">{account.phone}</Descriptions.Item>
                          <Descriptions.Item label="Email">{account.email || '-'}</Descriptions.Item>
                          <Descriptions.Item label="Ngay sinh">
                            {account.dateOfBirth ? dayjs(account.dateOfBirth).format('DD/MM/YYYY') : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="CCCD">{account.idNumber || '-'}</Descriptions.Item>
                          <Descriptions.Item label="BHYT" span={2}>
                            {account.healthInsurance?.cardNumber || 'Khong co'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Dia chi" span={2}>
                            {account.address || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Lien ket BN">
                            {account.isLinkedToPatient ? (
                              <Tag color="green">Da lien ket ({account.patientCode})</Tag>
                            ) : (
                              <Tag color="orange">Chua lien ket</Tag>
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="2FA">
                            {account.twoFactorEnabled ? (
                              <Tag color="green">Bat</Tag>
                            ) : (
                              <Tag color="default">Tat</Tag>
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="Dang nhap gan nhat">
                            {account.lastLoginAt ? dayjs(account.lastLoginAt).format('DD/MM/YYYY HH:mm') : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="So lan dang nhap">
                            {account.loginCount}
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                    </Row>

                    <Divider>Hoa don chua thanh toan</Divider>

                    {bills.filter((b) => b.status === 'Pending' || b.status === 'Overdue' || b.status === 'PartialPaid').length > 0 ? (
                      <div>
                        {bills
                          .filter((b) => b.status === 'Pending' || b.status === 'Overdue' || b.status === 'PartialPaid')
                          .map((item) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{`Hoa don ${item.billCode}`}</div>
                                <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
                                  {`Ngay: ${item.billDate ? dayjs(item.billDate).format('DD/MM/YYYY') : '-'} | ${item.department || ''}`}
                                </div>
                              </div>
                              <Text strong style={{ color: '#ff4d4f' }}>
                                {(item.amountDue ?? 0).toLocaleString('vi-VN')} VND
                              </Text>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <Result status="success" title="Khong co hoa don chua thanh toan" />
                    )}
                  </>
                ) : (
                  <Result status="info" title="Chua co thong tin tai khoan" />
                ),
              },
            ]}
          />
        </Card>

        {/* Appointment Modal */}
        <Modal
          title="Dat lich hen"
          open={isAppointmentModalOpen}
          onCancel={() => setIsAppointmentModalOpen(false)}
          onOk={() => appointmentForm.submit()}
        >
          <Form form={appointmentForm} layout="vertical" onFinish={handleBookAppointment}>
            <Form.Item name="departmentId" label="Khoa" rules={[{ required: true, message: 'Vui long chon khoa' }]}>
              <Select placeholder="Chon khoa">
                {departments.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="doctorId" label="Bac si">
              <Select placeholder="Chon bac si (khong bat buoc)" allowClear>
                {doctors.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.title ? `${d.title} ${d.name}` : d.name} - {d.specialty}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="date" label="Ngay" rules={[{ required: true, message: 'Vui long chon ngay' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="time" label="Gio" rules={[{ required: true, message: 'Vui long chon gio' }]}>
                  <Select placeholder="Chon gio">
                    <Select.Option value="08:00">08:00</Select.Option>
                    <Select.Option value="08:30">08:30</Select.Option>
                    <Select.Option value="09:00">09:00</Select.Option>
                    <Select.Option value="09:30">09:30</Select.Option>
                    <Select.Option value="10:00">10:00</Select.Option>
                    <Select.Option value="10:30">10:30</Select.Option>
                    <Select.Option value="14:00">14:00</Select.Option>
                    <Select.Option value="14:30">14:30</Select.Option>
                    <Select.Option value="15:00">15:00</Select.Option>
                    <Select.Option value="15:30">15:30</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="type" label="Loai kham" rules={[{ required: true, message: 'Vui long chon loai kham' }]}>
              <Select placeholder="Chon loai kham">
                <Select.Option value="NewVisit">Kham moi</Select.Option>
                <Select.Option value="FollowUp">Tai kham</Select.Option>
                <Select.Option value="HealthCheck">Kham suc khoe</Select.Option>
                <Select.Option value="Telemedicine">Kham tu xa</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="notes" label="Ly do kham / Ghi chu">
              <TextArea rows={2} placeholder="Mo ta trieu chung hoac ly do kham..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Feedback Modal */}
        <Modal
          title="Gui danh gia"
          open={isFeedbackModalOpen}
          onCancel={() => setIsFeedbackModalOpen(false)}
          onOk={() => feedbackForm.submit()}
        >
          <Form form={feedbackForm} layout="vertical" onFinish={handleSubmitFeedback}>
            <Form.Item name="departmentId" label="Khoa">
              <Select placeholder="Chon khoa (khong bat buoc)" allowClear>
                {departments.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="rating" label="Diem danh gia" rules={[{ required: true, message: 'Vui long chon diem' }]}>
              <Rate />
            </Form.Item>
            <Form.Item name="comment" label="Nhan xet" rules={[{ required: true, message: 'Vui long nhap nhan xet' }]}>
              <TextArea rows={4} placeholder="Chia se trai nghiem cua ban..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default PatientPortal;
