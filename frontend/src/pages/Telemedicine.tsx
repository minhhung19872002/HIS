import React, { useState, useCallback, useEffect } from 'react';
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
  TimePicker,
  Typography,
  Tabs,
  Avatar,
  Badge,
  Statistic,
  Divider,
  message,
  Alert,
  Descriptions,
  Spin,
} from 'antd';
import {
  VideoCameraOutlined,
  PhoneOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAppointments,
  getDashboard,
  createAppointment,
  cancelAppointment,
  createVideoSession,
  endSession,
  createConsultation,
  completeConsultation,
  createEPrescription,
} from '../api/telemedicine';
import type {
  TelemedicineAppointmentDto,
  TelemedicineDashboardDto,
  VideoSessionDto,
  TeleconsultationDto,
} from '../api/telemedicine';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Telemedicine: React.FC = () => {
  const [appointments, setAppointments] = useState<TelemedicineAppointmentDto[]>([]);
  const [dashboard, setDashboard] = useState<TelemedicineDashboardDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<TelemedicineAppointmentDto | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<VideoSessionDto | null>(null);
  const [activeConsultation, setActiveConsultation] = useState<TeleconsultationDto | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [form] = Form.useForm();
  const [prescriptionForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const results = await Promise.allSettled([
        getAppointments({ fromDate: today, toDate: today, pageSize: 200 }),
        getDashboard(today),
      ]);

      if (results[0].status === 'fulfilled') {
        const data = results[0].value?.data;
        if (data && data.items) {
          setAppointments(data.items);
        } else if (Array.isArray(data)) {
          setAppointments(data as unknown as TelemedicineAppointmentDto[]);
        } else {
          setAppointments([]);
        }
      } else {
        message.warning('Khong the tai danh sach lich hen');
        setAppointments([]);
      }

      if (results[1].status === 'fulfilled') {
        setDashboard(results[1].value?.data || null);
      } else {
        setDashboard(null);
      }
    } catch {
      message.warning('Loi khi tai du lieu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or derived from appointments
  const todayTotal = dashboard?.totalAppointments ?? appointments.length;
  const waitingCount = dashboard
    ? (dashboard.totalAppointments - dashboard.completedAppointments - dashboard.cancelledAppointments - dashboard.noShowAppointments)
    : appointments.filter((a) => a.status === 1 || a.status === 2).length; // 1=scheduled, 2=waiting
  const completedCount = dashboard?.completedAppointments ?? appointments.filter((a) => a.status === 4).length;
  const inProgressCount = appointments.filter((a) => a.status === 3).length; // 3=in_progress

  // Status mapping: API uses numeric status
  const getStatusTag = (status: number, statusName?: string) => {
    const statusConfig: Record<number, { color: string; text: string }> = {
      0: { color: 'default', text: 'Moi tao' },
      1: { color: 'blue', text: 'Da dat lich' },
      2: { color: 'orange', text: 'Cho kham' },
      3: { color: 'green', text: 'Dang kham' },
      4: { color: 'default', text: 'Hoan thanh' },
      5: { color: 'red', text: 'Da huy' },
      6: { color: 'volcano', text: 'Vang mat' },
    };
    const config = statusConfig[status] || { color: 'default', text: statusName || `Status ${status}` };
    return <Tag color={config.color}>{statusName || config.text}</Tag>;
  };

  const getPaymentStatusTag = (paymentStatus: number, paymentStatusName?: string) => {
    const config: Record<number, { color: string; text: string }> = {
      0: { color: 'warning', text: 'Chua thanh toan' },
      1: { color: 'success', text: 'Da thanh toan' },
      2: { color: 'error', text: 'Da hoan tien' },
    };
    const c = config[paymentStatus] || { color: 'default', text: paymentStatusName || `Payment ${paymentStatus}` };
    return <Tag color={c.color}>{paymentStatusName || c.text}</Tag>;
  };

  const handleStartConsultation = async (appointment: TelemedicineAppointmentDto) => {
    setSelectedAppointment(appointment);
    setSessionLoading(true);
    try {
      // Create video session
      const sessionRes = await createVideoSession({ appointmentId: appointment.id });
      const session = sessionRes?.data;
      if (session) {
        setActiveSession(session);
      }

      // Create consultation record
      const consultRes = await createConsultation({
        sessionId: session?.id || '',
        appointmentId: appointment.id,
        chiefComplaint: appointment.chiefComplaint,
      });
      if (consultRes?.data) {
        setActiveConsultation(consultRes.data);
      }

      // Refresh data to get updated status
      fetchData();
      setIsConsultModalOpen(true);
    } catch {
      message.warning('Khong the bat dau phien kham. Vui long thu lai.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleEndConsultation = async () => {
    try {
      if (activeSession?.id) {
        await endSession(activeSession.id, 'Ket thuc kham');
      }
      if (activeConsultation?.id && selectedAppointment) {
        await completeConsultation({
          consultationId: activeConsultation.id,
          assessment: 'Completed via telemedicine',
          diagnosisMain: activeConsultation.diagnosisMain || '',
          diagnosisMainIcd: activeConsultation.diagnosisMainIcd || '',
          treatmentPlan: activeConsultation.treatmentPlan || '',
        });
      }
      setActiveSession(null);
      setActiveConsultation(null);
      setIsConsultModalOpen(false);
      message.success('Da ket thuc buoi kham');
      fetchData();
    } catch {
      message.warning('Loi khi ket thuc phien kham');
    }
  };

  const handleBookAppointment = async (values: any) => {
    setBookingLoading(true);
    try {
      await createAppointment({
        patientId: values.patientId || '',
        doctorId: values.doctorId || '',
        departmentId: values.departmentId || '',
        appointmentType: values.appointmentType || 2, // default FollowUp
        scheduledDate: values.appointmentDate?.format('YYYY-MM-DD') || '',
        scheduledTime: values.appointmentTime?.format('HH:mm') || '',
        durationMinutes: 30,
        chiefComplaint: values.reason,
        notes: values.notes,
      });
      setIsBookingModalOpen(false);
      form.resetFields();
      message.success('Da dat lich hen thanh cong');
      fetchData();
    } catch {
      message.warning('Khong the dat lich hen. Vui long thu lai.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (appointment: TelemedicineAppointmentDto) => {
    Modal.confirm({
      title: 'Xac nhan huy lich hen',
      content: `Ban co chac muon huy lich hen cua ${appointment.patientName}?`,
      okText: 'Huy lich',
      okType: 'danger',
      cancelText: 'Dong',
      onOk: async () => {
        try {
          await cancelAppointment(appointment.id, 'Huy boi bac si');
          message.success('Da huy lich hen');
          fetchData();
        } catch {
          message.warning('Khong the huy lich hen');
        }
      },
    });
  };

  const handleSavePrescription = async () => {
    try {
      const values = prescriptionForm.getFieldsValue();
      if (!activeConsultation?.id) {
        message.warning('Khong co phien kham de ke don');
        return;
      }
      await createEPrescription({
        consultationId: activeConsultation.id,
        items: (values.medicines || []).map((m: any) => ({
          drugId: m.drugId || '',
          quantity: Number(m.quantity) || 1,
          dosage: m.dosage || '',
          frequency: m.frequency || '',
          route: m.route || 'Oral',
          durationDays: Number(m.durationDays) || 7,
          instructions: m.instruction,
        })),
        instructions: values.advice,
      });
      message.success('Da luu don thuoc');
      setIsPrescriptionModalOpen(false);
    } catch {
      message.warning('Khong the luu don thuoc');
    }
  };

  const handlePrintPrescription = () => {
    const values = prescriptionForm.getFieldsValue();
    const printWindow = window.open('', '_blank');
    if (!printWindow || !selectedAppointment) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Don thuoc dien tu</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .hospital-name { font-size: 18px; font-weight: bold; }
          .title { font-size: 24px; font-weight: bold; margin: 20px 0; }
          .info-row { display: flex; margin-bottom: 10px; }
          .info-label { width: 150px; font-weight: bold; }
          .prescription-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .prescription-table th, .prescription-table td { border: 1px solid #000; padding: 8px; }
          .prescription-table th { background: #f0f0f0; }
          .signature { margin-top: 50px; text-align: right; }
          .digital-signature { color: blue; font-style: italic; margin-top: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital-name">${HOSPITAL_NAME}</div>
          <div>Dia chi: ${HOSPITAL_ADDRESS}</div>
          <div>DT: ${HOSPITAL_PHONE}</div>
        </div>

        <div class="title" style="text-align: center;">DON THUOC DIEN TU</div>
        <div style="text-align: center; margin-bottom: 20px;">(Kham benh tu xa - Telemedicine)</div>

        <div class="info-row">
          <span class="info-label">Ho ten BN:</span>
          <span>${selectedAppointment.patientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">SDT:</span>
          <span>${selectedAppointment.phone}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Chan doan:</span>
          <span>${values.diagnosis || ''}</span>
        </div>

        <table class="prescription-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Ten thuoc</th>
              <th>Lieu dung</th>
              <th>So luong</th>
              <th>Cach dung</th>
            </tr>
          </thead>
          <tbody>
            ${(values.medicines || []).map((m: any, i: number) => `
              <tr>
                <td>${i + 1}</td>
                <td>${m.name || ''}</td>
                <td>${m.dosage || ''}</td>
                <td>${m.quantity || ''}</td>
                <td>${m.instruction || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="info-row">
          <span class="info-label">Loi dan:</span>
          <span>${values.advice || ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tai kham:</span>
          <span>${values.followUp || ''}</span>
        </div>

        <div class="signature">
          <div>Ngay ${dayjs().format('DD')} thang ${dayjs().format('MM')} nam ${dayjs().format('YYYY')}</div>
          <div style="margin-top: 10px; font-weight: bold;">BAC SI KE DON</div>
          <div class="digital-signature">[Chu ky so]</div>
          <div style="margin-top: 30px; font-weight: bold;">${selectedAppointment.doctorName}</div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getTypeTag = (appointmentType: number, appointmentTypeName?: string) => {
    // appointmentType: 1=FirstVisit, 2=FollowUp, 3=SecondOpinion
    const config: Record<number, { icon: React.ReactNode; color: string; text: string }> = {
      1: { icon: <UserOutlined />, color: 'blue', text: 'Kham lan dau' },
      2: { icon: <CalendarOutlined />, color: 'green', text: 'Tai kham' },
      3: { icon: <FileTextOutlined />, color: 'purple', text: 'Hoi y' },
    };
    const c = config[appointmentType] || { icon: <VideoCameraOutlined />, color: 'default', text: appointmentTypeName || `Type ${appointmentType}` };
    return (
      <Tag icon={c.icon} color={c.color}>
        {appointmentTypeName || c.text}
      </Tag>
    );
  };

  // Filter appointments for tabs
  const todayStr = dayjs().format('YYYY-MM-DD');
  const todayAppointments = appointments.filter(
    (a) => a.scheduledDate?.substring(0, 10) === todayStr
  );
  const upcomingAppointments = appointments.filter(
    (a) => a.scheduledDate?.substring(0, 10) > todayStr
  );
  const historyAppointments = appointments.filter(
    (a) => a.status === 4 // completed
  );

  const columns: ColumnsType<TelemedicineAppointmentDto> = [
    {
      title: 'Thoi gian',
      key: 'time',
      width: 100,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.scheduledTime}</Text>
          <Text type="secondary">{record.durationMinutes} phut</Text>
        </Space>
      ),
    },
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <Space orientation="vertical" size={0}>
            <Text strong>{record.patientName}</Text>
            <Text type="secondary">{record.phone}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Bac si',
      key: 'doctor',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text>{record.doctorName}</Text>
          <Text type="secondary">{record.doctorSpecialty || record.departmentName}</Text>
        </Space>
      ),
    },
    {
      title: 'Loai',
      dataIndex: 'appointmentType',
      key: 'appointmentType',
      width: 130,
      render: (type, record) => getTypeTag(type, record.appointmentTypeName),
    },
    {
      title: 'Ly do kham',
      dataIndex: 'chiefComplaint',
      key: 'chiefComplaint',
      ellipsis: true,
    },
    {
      title: 'Thanh toan',
      key: 'payment',
      width: 140,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text>{record.fee?.toLocaleString('vi-VN')}d</Text>
          {getPaymentStatusTag(record.paymentStatus, record.paymentStatusName)}
        </Space>
      ),
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => getStatusTag(status, record.statusName),
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          {(record.status === 1 || record.status === 2) && (
            <>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                size="small"
                loading={sessionLoading}
                onClick={() => handleStartConsultation(record)}
              >
                Bat dau
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleCancelAppointment(record)}
              >
                Huy
              </Button>
            </>
          )}
          {record.status === 3 && (
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              size="small"
              onClick={() => {
                setSelectedAppointment(record);
                setIsConsultModalOpen(true);
              }}
            >
              Tiep tuc
            </Button>
          )}
          {record.status === 4 && (
            <Button size="small" icon={<FileTextOutlined />}>
              Xem HS
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderDetailModal = (record: TelemedicineAppointmentDto) => {
    Modal.info({
      title: 'Chi tiet lich kham tu xa',
      width: 500,
      content: (
        <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
          <Descriptions.Item label="Ma lich hen">{record.appointmentCode}</Descriptions.Item>
          <Descriptions.Item label="Benh nhan">{record.patientName}</Descriptions.Item>
          <Descriptions.Item label="SDT">{record.phone}</Descriptions.Item>
          <Descriptions.Item label="Ngay hen">{record.scheduledDate?.substring(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="Gio">{record.scheduledTime}</Descriptions.Item>
          <Descriptions.Item label="Bac si">{record.doctorName}</Descriptions.Item>
          <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
          <Descriptions.Item label="Ly do">{record.chiefComplaint || '-'}</Descriptions.Item>
          <Descriptions.Item label="Trang thai">{record.statusName || `Status ${record.status}`}</Descriptions.Item>
          <Descriptions.Item label="Phi">{record.fee?.toLocaleString('vi-VN')}d</Descriptions.Item>
          <Descriptions.Item label="Thanh toan">{record.paymentStatusName || '-'}</Descriptions.Item>
          {record.notes && <Descriptions.Item label="Ghi chu">{record.notes}</Descriptions.Item>}
        </Descriptions>
      ),
    });
  };

  return (
    <Spin spinning={loading}>
      <div>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>Kham benh tu xa (Telemedicine)</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Lam moi
          </Button>
        </Space>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Lich hen hom nay"
                value={todayTotal}
                prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Dang cho"
                value={waitingCount}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Dang kham"
                value={inProgressCount}
                prefix={<VideoCameraOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Hoan thanh"
                value={completedCount}
                prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
                styles={{ content: { color: '#722ed1' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Extra dashboard stats if available */}
        {dashboard && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="Thoi gian cho TB"
                  value={dashboard.averageWaitTimeMinutes}
                  suffix="phut"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="Thoi gian kham TB"
                  value={dashboard.averageConsultationDurationMinutes}
                  suffix="phut"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="Doanh thu"
                  value={dashboard.totalRevenue}
                  formatter={(val) => `${Number(val).toLocaleString('vi-VN')}d`}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Main Content */}
        <Card
          title="Danh sach lich hen"
          extra={
            <Button type="primary" onClick={() => setIsBookingModalOpen(true)}>
              Dat lich moi
            </Button>
          }
        >
          <Alert
            title="Luu y"
            description="Chi ap dung cho tai kham, tu van, benh man tinh on dinh. Khong ap dung cho cap cuu, PTTT, thu thuat xam lan."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Tabs
            defaultActiveKey="today"
            items={[
              {
                key: 'today',
                label: `Hom nay (${todayAppointments.length})`,
                children: (
                  <Table
                    columns={columns}
                    dataSource={todayAppointments}
                    rowKey="id"
                    pagination={false}
                    onRow={(record) => ({
                      onDoubleClick: () => renderDetailModal(record),
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'upcoming',
                label: `Sap toi (${upcomingAppointments.length})`,
                children: (
                  <Table
                    columns={columns}
                    dataSource={upcomingAppointments}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => renderDetailModal(record),
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'history',
                label: `Lich su (${historyAppointments.length})`,
                children: (
                  <Table
                    columns={columns}
                    dataSource={historyAppointments}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => renderDetailModal(record),
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
            ]}
          />
        </Card>

        {/* Booking Modal */}
        <Modal
          title="Dat lich kham tu xa"
          open={isBookingModalOpen}
          onCancel={() => setIsBookingModalOpen(false)}
          onOk={() => form.submit()}
          confirmLoading={bookingLoading}
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleBookAppointment}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="patientId"
                  label="Ma benh nhan"
                  rules={[{ required: true, message: 'Vui long nhap ma benh nhan' }]}
                >
                  <Input placeholder="VD: P001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="doctorId"
                  label="Ma bac si"
                  rules={[{ required: true, message: 'Vui long nhap ma bac si' }]}
                >
                  <Input placeholder="VD: D001" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="departmentId"
                  label="Ma khoa"
                  rules={[{ required: true, message: 'Vui long nhap ma khoa' }]}
                >
                  <Input placeholder="VD: DEP001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="appointmentType"
                  label="Loai kham"
                  rules={[{ required: true, message: 'Vui long chon loai kham' }]}
                >
                  <Select placeholder="Chon loai kham">
                    <Select.Option value={1}>Kham lan dau</Select.Option>
                    <Select.Option value={2}>Tai kham</Select.Option>
                    <Select.Option value={3}>Hoi y / Second Opinion</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="appointmentDate"
                  label="Ngay kham"
                  rules={[{ required: true, message: 'Vui long chon ngay' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="appointmentTime"
                  label="Gio kham"
                  rules={[{ required: true, message: 'Vui long chon gio' }]}
                >
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="reason"
              label="Ly do kham"
              rules={[{ required: true, message: 'Vui long nhap ly do kham' }]}
            >
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Consultation Modal */}
        <Modal
          title={
            <Space>
              <Badge status="processing" />
              <span>Phong kham tu xa</span>
            </Space>
          }
          open={isConsultModalOpen}
          onCancel={() => {}}
          footer={null}
          width={900}
          closable={false}
        >
          {selectedAppointment && (
            <Row gutter={16}>
              {/* Video Area */}
              <Col span={16}>
                <Card
                  style={{
                    height: 400,
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Space orientation="vertical" align="center">
                    <Avatar size={100} icon={<UserOutlined />} />
                    <Text style={{ color: '#fff' }}>{selectedAppointment.patientName}</Text>
                    <Text style={{ color: '#999' }}>
                      {activeSession?.status === 1
                        ? 'Dang ket noi...'
                        : 'Cho benh nhan tham gia'}
                    </Text>
                    {selectedAppointment.videoRoomUrl && (
                      <Text style={{ color: '#52c41a', fontSize: 12 }}>
                        Room: {selectedAppointment.videoRoomUrl}
                      </Text>
                    )}
                  </Space>
                </Card>
                <Space style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}>
                  <Button icon={<VideoCameraOutlined />} type="primary">
                    Camera
                  </Button>
                  <Button icon={<PhoneOutlined />}>Mic</Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={handleEndConsultation}
                  >
                    Ket thuc
                  </Button>
                </Space>
              </Col>

              {/* Patient Info & Notes */}
              <Col span={8}>
                <Card title="Thong tin benh nhan" size="small">
                  <Space orientation="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Ho ten:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {selectedAppointment.patientName}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">SDT:</Text>
                      <Text style={{ marginLeft: 8 }}>{selectedAppointment.phone}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Khoa:</Text>
                      <Text style={{ marginLeft: 8 }}>{selectedAppointment.departmentName}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Ly do:</Text>
                      <Text style={{ marginLeft: 8 }}>{selectedAppointment.chiefComplaint}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Phi:</Text>
                      <Text style={{ marginLeft: 8 }}>{selectedAppointment.fee?.toLocaleString('vi-VN')}d</Text>
                    </div>
                  </Space>
                </Card>

                <Card title="Ghi chu kham" size="small" style={{ marginTop: 16 }}>
                  <TextArea rows={6} placeholder="Nhap ghi chu..." />
                </Card>

                <Space style={{ marginTop: 16, width: '100%' }} orientation="vertical">
                  <Button
                    type="primary"
                    icon={<MedicineBoxOutlined />}
                    block
                    onClick={() => setIsPrescriptionModalOpen(true)}
                  >
                    Ke don thuoc
                  </Button>
                  <Button icon={<FileTextOutlined />} block>
                    Xem ho so
                  </Button>
                </Space>
              </Col>
            </Row>
          )}
        </Modal>

        {/* E-Prescription Modal */}
        <Modal
          title="Ke don thuoc dien tu"
          open={isPrescriptionModalOpen}
          onCancel={() => setIsPrescriptionModalOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsPrescriptionModalOpen(false)}>
              Huy
            </Button>,
            <Button key="print" icon={<PrinterOutlined />} onClick={handlePrintPrescription}>
              In don
            </Button>,
            <Button key="save" type="primary" onClick={handleSavePrescription}>
              Luu & Gui
            </Button>,
          ]}
          width={700}
        >
          <Alert
            title="Don thuoc dien tu se duoc ky so va gui den nha thuoc lien ket"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form form={prescriptionForm} layout="vertical">
            <Form.Item name="diagnosis" label="Chan doan" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.List name="medicines">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row gutter={8} key={key}>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          rules={[{ required: true }]}
                        >
                          <Input placeholder="Ten thuoc" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'dosage']}>
                          <Input placeholder="Lieu dung" />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item {...restField} name={[name, 'quantity']}>
                          <Input placeholder="SL" />
                        </Form.Item>
                      </Col>
                      <Col span={9}>
                        <Form.Item {...restField} name={[name, 'instruction']}>
                          <Input placeholder="Cach dung" />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Button danger onClick={() => remove(name)}>
                          Xoa
                        </Button>
                      </Col>
                    </Row>
                  ))}
                  <Button type="dashed" onClick={() => add()} block>
                    Them thuoc
                  </Button>
                </>
              )}
            </Form.List>
            <Divider />
            <Form.Item name="advice" label="Loi dan">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="followUp" label="Hen tai kham">
              <Input placeholder="VD: Sau 2 tuan" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Telemedicine;
