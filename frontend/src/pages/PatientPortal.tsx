import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
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
  PagedResultDto,
} from '../api/patientPortal';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type AppointmentFormValues = {
  type: string;
  departmentId: string;
  specialtyId?: string;
  doctorId?: string;
  date?: string | Date;
  time?: string;
  notes?: string;
};

type FeedbackFormValues = {
  departmentId?: string;
  department?: string;
  comment: string;
  rating: number;
  visitId?: string;
};

const NumberTicker = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <>{display.toLocaleString('vi-VN')}</>;
};

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
        setNotifications((nData as PagedResultDto<NotificationDto> | undefined)?.items ?? []);
      }
      if (departmentsRes.status === 'fulfilled') {
        setDepartments(departmentsRes.value.data ?? []);
      }
      if (doctorsRes.status === 'fulfilled') {
        setDoctors(doctorsRes.value.data ?? []);
      }
    } catch {
      message.warning('Không thể tải dữ liệu cổng bệnh nhân');
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
      1: { color: 'green', text: 'Hoạt động' },
      2: { color: 'red', text: 'Tạm khóa' },
      3: { color: 'default', text: 'Vô hiệu hóa' },
    };
    const c = config[status] || { color: 'default', text: 'Không rõ' };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleBookAppointment = async (values: AppointmentFormValues) => {
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
      message.success('Đã đặt lịch hẹn thành công');
      setIsAppointmentModalOpen(false);
      appointmentForm.resetFields();
      // Refresh appointments
      try {
        const res = await getMyAppointments();
        setAppointments(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch {
      message.warning('Không thể đặt lịch hẹn. Vui lòng thử lại.');
    }
  };

  const handleSubmitFeedback = async (values: FeedbackFormValues) => {
    try {
      await submitFeedback({
        feedbackType: 'General',
        category: 'Service',
        departmentId: values.departmentId,
        subject: values.department || 'Đánh giá dịch vụ',
        message: values.comment,
        rating: values.rating,
        visitId: values.visitId,
      });
      message.success('Cảm ơn quý khách đã góp ý');
      setIsFeedbackModalOpen(false);
      feedbackForm.resetFields();
      // Refresh feedbacks
      try {
        const res = await getFeedbacks();
        setFeedbacks(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch {
      message.warning('Không thể gửi đánh giá. Vui lòng thử lại.');
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
      title: 'Ngày',
      dataIndex: 'preferredDate',
      key: 'preferredDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Giờ',
      dataIndex: 'preferredTime',
      key: 'preferredTime',
    },
    {
      title: 'Bác sĩ',
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
      title: 'Loại',
      dataIndex: 'appointmentTypeName',
      key: 'appointmentTypeName',
      render: (val) => val || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record) => {
        const config: Record<number, { color: string; text: string }> = {
          1: { color: 'blue', text: 'Yêu cầu' },
          2: { color: 'green', text: 'Xác nhận' },
          3: { color: 'cyan', text: 'Đã check-in' },
          4: { color: 'default', text: 'Hoàn thành' },
          5: { color: 'red', text: 'Đã hủy' },
          6: { color: 'volcano', text: 'Vắng mặt' },
        };
        const c = config[status] || { color: 'default', text: record.statusName || 'N/A' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  const labResultColumns: ColumnsType<LabResultDto> = [
    {
      title: 'Tên xét nghiệm',
      dataIndex: 'testName',
      key: 'testName',
    },
    {
      title: 'Loại',
      dataIndex: 'testCategory',
      key: 'testCategory',
    },
    {
      title: 'Ngày làm',
      dataIndex: 'testDate',
      key: 'testDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'BS chỉ định',
      dataIndex: 'orderingDoctor',
      key: 'orderingDoctor',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => {
        const color = status === 'Final' ? 'green' : status === 'Partial' ? 'orange' : 'blue';
        return <Tag color={color}>{record.statusName || status}</Tag>;
      },
    },
    {
      title: 'Bất thường',
      dataIndex: 'isAbnormal',
      key: 'isAbnormal',
      render: (val) => val ? <Tag color="red">Có</Tag> : <Tag color="green">Không</Tag>,
    },
  ];

  const billColumns: ColumnsType<BillSummaryDto> = [
    {
      title: 'Mã hóa đơn',
      dataIndex: 'billCode',
      key: 'billCode',
    },
    {
      title: 'Ngày',
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
      title: 'Tổng tiền',
      dataIndex: 'subtotal',
      key: 'subtotal',
      render: (val) => `${(val ?? 0).toLocaleString('vi-VN')} VND`,
    },
    {
      title: 'BHYT chi trả',
      dataIndex: 'insuranceCoverage',
      key: 'insuranceCoverage',
      render: (val) => `${(val ?? 0).toLocaleString('vi-VN')} VND`,
    },
    {
      title: 'BN trả',
      dataIndex: 'patientResponsibility',
      key: 'patientResponsibility',
      render: (val) => `${(val ?? 0).toLocaleString('vi-VN')} VND`,
    },
    {
      title: 'Còn nợ',
      dataIndex: 'amountDue',
      key: 'amountDue',
      render: (val) => (
        <Text strong style={{ color: val > 0 ? '#ff4d4f' : '#52c41a' }}>
          {(val ?? 0).toLocaleString('vi-VN')} VND
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
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
      title: 'Bệnh nhân',
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
      title: 'Loại',
      dataIndex: 'feedbackTypeName',
      key: 'feedbackTypeName',
    },
    {
      title: 'Chủ đề',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Điểm',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => rating ? <Rate disabled defaultValue={rating} /> : '-',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        const config: Record<number, { color: string; text: string }> = {
          1: { color: 'blue', text: 'Đã gửi' },
          2: { color: 'orange', text: 'Đang xử lý' },
          3: { color: 'green', text: 'Đã giải quyết' },
          4: { color: 'default', text: 'Đã đóng' },
        };
        const c = config[record.status] || { color: 'default', text: record.statusName || 'N/A' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: 'Phản hồi',
      key: 'response',
      render: (_, record) =>
        record.responseMessage ? (
          <Tag color="green">Đã phản hồi</Tag>
        ) : (
          <Tag color="orange">Chưa phản hồi</Tag>
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
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* Gradient mesh background */}
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Cổng bệnh nhân (Patient Portal)</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
        </div>
        </motion.div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
            <Card style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Tài khoản"
                value={account ? 1 : 0}
                prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
                suffix={account ? <Tag color="green" style={{ marginLeft: 8, fontSize: 12 }}>{account.accountStatusName || 'Active'}</Tag> : undefined}
              />
            </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <Card style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Lịch hẹn sắp tới"
                value={upcomingAppointments}
                formatter={() => <NumberTicker value={upcomingAppointments} />}
                prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <Card style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Kết quả chờ trả"
                value={pendingResults}
                formatter={() => <NumberTicker value={pendingResults} />}
                prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <Card style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Công nợ"
                value={outstandingBalance}
                prefix={<CreditCardOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: outstandingBalance > 0 ? '#ff4d4f' : '#52c41a' } }}
                formatter={(val) => `${Number(val).toLocaleString('vi-VN')} VND`}
              />
            </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Main Content */}
        <Card style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
          <Tabs
            defaultActiveKey="appointments"
            items={[
              {
                key: 'appointments',
                label: 'Lịch hẹn',
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<CalendarOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => setIsAppointmentModalOpen(true)}
                    >
                      Đặt lịch mới
                    </Button>
                    <Table
                      columns={appointmentColumns}
                      dataSource={appointments}
                      rowKey="id"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: 'Chi tiết lịch hẹn',
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
                                <Descriptions.Item label="Ngày hẹn">{record.preferredDate ? dayjs(record.preferredDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Giờ">{record.preferredTime}</Descriptions.Item>
                                <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                                <Descriptions.Item label="Bác sĩ">{record.doctorName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Lý do">{record.chiefComplaint || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">{record.statusName}</Descriptions.Item>
                                {record.confirmationCode && (
                                  <Descriptions.Item label="Mã xác nhận">{record.confirmationCode}</Descriptions.Item>
                                )}
                                {record.notes && (
                                  <Descriptions.Item label="Ghi chú">{record.notes}</Descriptions.Item>
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
                label: 'Kết quả xét nghiệm',
                children: (
                  <Table
                    columns={labResultColumns}
                    dataSource={labResults}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Kết quả: ${record.testName}`,
                          width: 600,
                          content: (
                            <div style={{ marginTop: 16 }}>
                              <Descriptions bordered size="small" column={2}>
                                <Descriptions.Item label="Ngày làm">{record.testDate ? dayjs(record.testDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">{record.statusName || record.status}</Descriptions.Item>
                                <Descriptions.Item label="BS chỉ định">{record.orderingDoctor}</Descriptions.Item>
                                <Descriptions.Item label="Bất thường">{record.isAbnormal ? 'Có' : 'Không'}</Descriptions.Item>
                                {record.interpretation && (
                                  <Descriptions.Item label="Nhận định" span={2}>{record.interpretation}</Descriptions.Item>
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
                                    { title: 'Chỉ số', dataIndex: 'testItemName', key: 'testItemName' },
                                    { title: 'Kết quả', dataIndex: 'value', key: 'value', render: (val, row) => (
                                      <Text type={row.isAbnormal ? 'danger' : undefined} strong={row.isAbnormal}>{val} {row.unit || ''}</Text>
                                    )},
                                    { title: 'Tham chiếu', dataIndex: 'referenceRange', key: 'referenceRange' },
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
                label: 'Hóa đơn',
                children: (
                  <Table
                    columns={billColumns}
                    dataSource={bills}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Hóa đơn: ${record.billCode}`,
                          width: 600,
                          content: (
                            <div style={{ marginTop: 16 }}>
                              <Descriptions bordered size="small" column={2}>
                                <Descriptions.Item label="Ngày">{record.billDate ? dayjs(record.billDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">{record.statusName || record.status}</Descriptions.Item>
                                <Descriptions.Item label="Tổng">{(record.subtotal ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                                <Descriptions.Item label="BHYT">{(record.insuranceCoverage ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                                <Descriptions.Item label="BN trả">{(record.patientResponsibility ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                                <Descriptions.Item label="Còn nợ">{(record.amountDue ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                              </Descriptions>
                              {record.items && record.items.length > 0 && (
                                <Table
                                  size="small"
                                  style={{ marginTop: 12 }}
                                  dataSource={record.items}
                                  rowKey="description"
                                  pagination={false}
                                  columns={[
                                    { title: 'Dịch vụ', dataIndex: 'description', key: 'description' },
                                    { title: 'SL', dataIndex: 'quantity', key: 'quantity' },
                                    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', render: (v) => `${(v ?? 0).toLocaleString('vi-VN')}` },
                                    { title: 'Thành tiền', dataIndex: 'amount', key: 'amount', render: (v) => `${(v ?? 0).toLocaleString('vi-VN')}` },
                                    { title: 'BN trả', dataIndex: 'patientPays', key: 'patientPays', render: (v) => `${(v ?? 0).toLocaleString('vi-VN')}` },
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
                label: 'Đánh giá dịch vụ',
                children: (
                  <>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <Button
                          type="primary"
                          icon={<StarOutlined />}
                          onClick={() => setIsFeedbackModalOpen(true)}
                        >
                          Gửi đánh giá
                        </Button>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Điểm trung bình"
                            value={avgRating ? avgRating.toFixed(1) : 0}
                            suffix="/5"
                            prefix={<StarOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic title="Tổng đánh giá" value={feedbacks.length} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Tỷ lệ phản hồi"
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
                            title: 'Chi tiết đánh giá',
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
                                <Descriptions.Item label="Loại">{record.feedbackTypeName}</Descriptions.Item>
                                <Descriptions.Item label="Khoa">{record.departmentName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Điểm">{record.rating ? `${record.rating}/5` : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Nội dung">{record.message}</Descriptions.Item>
                                <Descriptions.Item label="Phản hồi">{record.responseMessage || 'Chưa phản hồi'}</Descriptions.Item>
                                <Descriptions.Item label="Ngày gửi">{record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
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
                label: 'Tính năng Portal',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <CalendarOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                          <Title level={5}>Đặt lịch khám</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Đặt lịch hẹn trực tuyến, chọn bác sĩ và khung giờ phù hợp
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <FileTextOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                          <Title level={5}>Xem kết quả</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Tra cứu kết quả xét nghiệm, CĐHA trực tuyến
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <MedicineBoxOutlined style={{ fontSize: 48, color: '#722ed1' }} />
                          <Title level={5}>Đơn thuốc</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Xem đơn thuốc, gửi đến nhà thuốc liên kết
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <CreditCardOutlined style={{ fontSize: 48, color: '#eb2f96' }} />
                          <Title level={5}>Thanh toán</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Thanh toán trực tuyến qua VNPay, Momo, Thẻ
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <HistoryOutlined style={{ fontSize: 48, color: '#faad14' }} />
                          <Title level={5}>Lịch sử khám</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Xem lịch sử khám bệnh, hồ sơ sức khỏe cá nhân
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <StarOutlined style={{ fontSize: 48, color: '#13c2c2' }} />
                          <Title level={5}>Đánh giá</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Gửi đánh giá, góp ý về chất lượng dịch vụ
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'news',
                label: 'Tin tức',
                children: (
                  <div>
                    <Row gutter={[16, 16]}>
                      {[
                        { title: 'Hướng dẫn sử dụng cổng bệnh nhân', date: '2026-03-01', category: 'Hướng dẫn', content: 'Tài liệu hướng dẫn cách đăng ký, đặt lịch, xem kết quả xét nghiệm trực tuyến.' },
                        { title: 'Lịch khám chuyên gia tháng 3/2026', date: '2026-02-28', category: 'Thông báo', content: 'Danh sách bác sĩ chuyên gia khám tại bệnh viện trong tháng 3.' },
                        { title: 'Chương trình khám sức khỏe định kỳ', date: '2026-02-25', category: 'Sự kiện', content: 'Chương trình khám sức khỏe tổng quát giảm 30% từ 01/03 đến 31/03/2026.' },
                        { title: 'Quyền lợi BHYT mới nhất 2026', date: '2026-02-20', category: 'Chính sách', content: 'Cập nhật quyền lợi bảo hiểm y tế theo quy định mới của Chính phủ.' },
                        { title: 'Tạm ngừng phòng khám ngoài giờ', date: '2026-02-15', category: 'Thông báo', content: 'Từ ngày 20/02, tạm ngừng phòng khám ngoài giờ để bảo trì hệ thống.' },
                      ].map((item, idx) => (
                        <Col span={24} key={idx}>
                          <Card size="small" hoverable onClick={() => Modal.info({ title: item.title, width: 600, content: (<div><Tag color={item.category === 'Thông báo' ? 'blue' : item.category === 'Hướng dẫn' ? 'green' : item.category === 'Sự kiện' ? 'purple' : 'orange'}>{item.category}</Tag><Text type="secondary" style={{ marginLeft: 8 }}>{dayjs(item.date).format('DD/MM/YYYY')}</Text><Divider /><Paragraph>{item.content}</Paragraph></div>) })}>
                            <Space>
                              <Tag color={item.category === 'Thông báo' ? 'blue' : item.category === 'Hướng dẫn' ? 'green' : item.category === 'Sự kiện' ? 'purple' : 'orange'}>{item.category}</Tag>
                              <Text strong>{item.title}</Text>
                              <Text type="secondary">{dayjs(item.date).format('DD/MM/YYYY')}</Text>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ),
              },
              {
                key: 'notifications',
                label: (
                  <Badge count={notifications.filter((n) => !n.isRead).length} size="small" offset={[8, 0]}>
                    Thông báo
                  </Badge>
                ),
                children: (
                  <div>
                    {notifications.length === 0 ? (
                      <Result status="info" title="Không có thông báo" />
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
                            <Tag color="blue" style={{ flexShrink: 0 }}>Mới</Tag>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: 'account',
                label: 'Tài khoản',
                children: account ? (
                  <>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Avatar size={100} icon={<UserOutlined />} src={account.avatarUrl} />
                      </Col>
                      <Col span={18}>
                        <Descriptions bordered size="small" column={2}>
                          <Descriptions.Item label="Họ tên">{account.fullName}</Descriptions.Item>
                          <Descriptions.Item label="Trạng thái">
                            {getAccountStatusTag(account.accountStatus)}
                          </Descriptions.Item>
                          <Descriptions.Item label="SĐT">{account.phone}</Descriptions.Item>
                          <Descriptions.Item label="Email">{account.email || '-'}</Descriptions.Item>
                          <Descriptions.Item label="Ngày sinh">
                            {account.dateOfBirth ? dayjs(account.dateOfBirth).format('DD/MM/YYYY') : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="CCCD">{account.idNumber || '-'}</Descriptions.Item>
                          <Descriptions.Item label="BHYT" span={2}>
                            {account.healthInsurance?.cardNumber || 'Không có'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Địa chỉ" span={2}>
                            {account.address || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Liên kết BN">
                            {account.isLinkedToPatient ? (
                              <Tag color="green">Đã liên kết ({account.patientCode})</Tag>
                            ) : (
                              <Tag color="orange">Chưa liên kết</Tag>
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="2FA">
                            {account.twoFactorEnabled ? (
                              <Tag color="green">Bật</Tag>
                            ) : (
                              <Tag color="default">Tắt</Tag>
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="Đăng nhập gần nhất">
                            {account.lastLoginAt ? dayjs(account.lastLoginAt).format('DD/MM/YYYY HH:mm') : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Số lần đăng nhập">
                            {account.loginCount}
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                    </Row>

                    <Divider>Hóa đơn chưa thanh toán</Divider>

                    {bills.filter((b) => b.status === 'Pending' || b.status === 'Overdue' || b.status === 'PartialPaid').length > 0 ? (
                      <div>
                        {bills
                          .filter((b) => b.status === 'Pending' || b.status === 'Overdue' || b.status === 'PartialPaid')
                          .map((item) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{`Hóa đơn ${item.billCode}`}</div>
                                <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
                                  {`Ngày: ${item.billDate ? dayjs(item.billDate).format('DD/MM/YYYY') : '-'} | ${item.department || ''}`}
                                </div>
                              </div>
                              <Text strong style={{ color: '#ff4d4f' }}>
                                {(item.amountDue ?? 0).toLocaleString('vi-VN')} VND
                              </Text>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <Result status="success" title="Không có hóa đơn chưa thanh toán" />
                    )}
                  </>
                ) : (
                  <Result status="info" title="Chưa có thông tin tài khoản" />
                ),
              },
            ]}
          />
        </Card>

        {/* Appointment Modal */}
        <Modal
          title="Đặt lịch hẹn"
          open={isAppointmentModalOpen}
          onCancel={() => setIsAppointmentModalOpen(false)}
          onOk={() => appointmentForm.submit()}
        >
          <Form form={appointmentForm} layout="vertical" onFinish={handleBookAppointment}>
            <Form.Item name="departmentId" label="Khoa" rules={[{ required: true, message: 'Vui lòng chọn khoa' }]}>
              <Select placeholder="Chọn khoa">
                {departments.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="doctorId" label="Bác sĩ">
              <Select placeholder="Chọn bác sĩ (không bắt buộc)" allowClear>
                {doctors.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.title ? `${d.title} ${d.name}` : d.name} - {d.specialty}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="date" label="Ngày" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="time" label="Giờ" rules={[{ required: true, message: 'Vui lòng chọn giờ' }]}>
                  <Select placeholder="Chọn giờ">
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
            <Form.Item name="type" label="Loại khám" rules={[{ required: true, message: 'Vui lòng chọn loại khám' }]}>
              <Select placeholder="Chọn loại khám">
                <Select.Option value="NewVisit">Khám mới</Select.Option>
                <Select.Option value="FollowUp">Tái khám</Select.Option>
                <Select.Option value="HealthCheck">Khám sức khỏe</Select.Option>
                <Select.Option value="Telemedicine">Khám từ xa</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="notes" label="Lý do khám / Ghi chú">
              <TextArea rows={2} placeholder="Mô tả triệu chứng hoặc lý do khám..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Feedback Modal */}
        <Modal
          title="Gửi đánh giá"
          open={isFeedbackModalOpen}
          onCancel={() => setIsFeedbackModalOpen(false)}
          onOk={() => feedbackForm.submit()}
        >
          <Form form={feedbackForm} layout="vertical" onFinish={handleSubmitFeedback}>
            <Form.Item name="departmentId" label="Khoa">
              <Select placeholder="Chọn khoa (không bắt buộc)" allowClear>
                {departments.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="rating" label="Điểm đánh giá" rules={[{ required: true, message: 'Vui lòng chọn điểm' }]}>
              <Rate />
            </Form.Item>
            <Form.Item name="comment" label="Nhận xét" rules={[{ required: true, message: 'Vui lòng nhập nhận xét' }]}>
              <TextArea rows={4} placeholder="Chia sẻ trải nghiệm của bạn..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default PatientPortal;
