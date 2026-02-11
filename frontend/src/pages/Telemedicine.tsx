import React, { useState } from 'react';
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
  List,
  Divider,
  message,
  Alert,
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
  PauseCircleOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Types
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientAvatar?: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number; // minutes
  type: 'video' | 'phone';
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason: string;
  notes?: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  fee: number;
}

interface VideoSession {
  id: string;
  appointmentId: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  recordingUrl?: string;
  status: 'waiting' | 'active' | 'ended';
}

// Mock data
const mockAppointments: Appointment[] = [
  {
    id: 'APT001',
    patientId: 'P001',
    patientName: 'Nguyen Van A',
    patientPhone: '0901234567',
    doctorId: 'D001',
    doctorName: 'BS. Tran Thi B',
    specialty: 'Noi khoa',
    appointmentDate: dayjs().format('YYYY-MM-DD'),
    appointmentTime: '09:00',
    duration: 30,
    type: 'video',
    status: 'waiting',
    reason: 'Tai kham tang huyet ap',
    paymentStatus: 'paid',
    fee: 200000,
  },
  {
    id: 'APT002',
    patientId: 'P002',
    patientName: 'Le Thi C',
    patientPhone: '0902345678',
    doctorId: 'D001',
    doctorName: 'BS. Tran Thi B',
    specialty: 'Noi khoa',
    appointmentDate: dayjs().format('YYYY-MM-DD'),
    appointmentTime: '09:30',
    duration: 30,
    type: 'video',
    status: 'scheduled',
    reason: 'Tu van benh tieu duong',
    paymentStatus: 'paid',
    fee: 200000,
  },
  {
    id: 'APT003',
    patientId: 'P003',
    patientName: 'Pham Van D',
    patientPhone: '0903456789',
    doctorId: 'D002',
    doctorName: 'BS. Nguyen Van E',
    specialty: 'Tim mach',
    appointmentDate: dayjs().format('YYYY-MM-DD'),
    appointmentTime: '10:00',
    duration: 30,
    type: 'phone',
    status: 'in_progress',
    reason: 'Kiem tra ket qua xet nghiem',
    paymentStatus: 'paid',
    fee: 150000,
  },
];

const mockDoctors = [
  { id: 'D001', name: 'BS. Tran Thi B', specialty: 'Noi khoa' },
  { id: 'D002', name: 'BS. Nguyen Van E', specialty: 'Tim mach' },
  { id: 'D003', name: 'BS. Le Van F', specialty: 'Da lieu' },
];

const Telemedicine: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<VideoSession | null>(null);
  const [form] = Form.useForm();
  const [prescriptionForm] = Form.useForm();

  // Statistics
  const todayAppointments = appointments.filter(
    (a) => a.appointmentDate === dayjs().format('YYYY-MM-DD')
  );
  const waitingCount = todayAppointments.filter((a) => a.status === 'waiting').length;
  const completedCount = todayAppointments.filter((a) => a.status === 'completed').length;
  const inProgressCount = todayAppointments.filter((a) => a.status === 'in_progress').length;

  const getStatusTag = (status: Appointment['status']) => {
    const statusConfig = {
      scheduled: { color: 'blue', text: 'Da dat lich' },
      waiting: { color: 'orange', text: 'Cho kham' },
      in_progress: { color: 'green', text: 'Dang kham' },
      completed: { color: 'default', text: 'Hoan thanh' },
      cancelled: { color: 'red', text: 'Da huy' },
      no_show: { color: 'volcano', text: 'Vang mat' },
    };
    const config = statusConfig[status];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleStartConsultation = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setActiveSession({
      id: `SES-${Date.now()}`,
      appointmentId: appointment.id,
      status: 'active',
      startTime: dayjs().format('HH:mm:ss'),
    });

    // Update appointment status
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointment.id ? { ...a, status: 'in_progress' } : a
      )
    );

    setIsConsultModalOpen(true);
  };

  const handleEndConsultation = () => {
    if (selectedAppointment) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === selectedAppointment.id ? { ...a, status: 'completed' } : a
        )
      );
    }
    setActiveSession(null);
    setIsConsultModalOpen(false);
    message.success('Da ket thuc buoi kham');
  };

  const handleBookAppointment = (values: any) => {
    const newAppointment: Appointment = {
      id: `APT${Date.now()}`,
      patientId: values.patientId,
      patientName: values.patientName,
      patientPhone: values.patientPhone,
      doctorId: values.doctorId,
      doctorName: mockDoctors.find((d) => d.id === values.doctorId)?.name || '',
      specialty: mockDoctors.find((d) => d.id === values.doctorId)?.specialty || '',
      appointmentDate: values.appointmentDate.format('YYYY-MM-DD'),
      appointmentTime: values.appointmentTime.format('HH:mm'),
      duration: 30,
      type: values.type,
      status: 'scheduled',
      reason: values.reason,
      paymentStatus: 'pending',
      fee: values.type === 'video' ? 200000 : 150000,
    };

    setAppointments((prev) => [...prev, newAppointment]);
    setIsBookingModalOpen(false);
    form.resetFields();
    message.success('Da dat lich hen thanh cong');
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
          <div class="hospital-name">BENH VIEN DA KHOA</div>
          <div>Dia chi: 123 Nguyen Hue, Quan 1, TP.HCM</div>
          <div>DT: 028.1234.5678</div>
        </div>

        <div class="title" style="text-align: center;">DON THUOC DIEN TU</div>
        <div style="text-align: center; margin-bottom: 20px;">(Kham benh tu xa - Telemedicine)</div>

        <div class="info-row">
          <span class="info-label">Ho ten BN:</span>
          <span>${selectedAppointment.patientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">SDT:</span>
          <span>${selectedAppointment.patientPhone}</span>
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
                <td>${m.name}</td>
                <td>${m.dosage}</td>
                <td>${m.quantity}</td>
                <td>${m.instruction}</td>
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

  const columns: ColumnsType<Appointment> = [
    {
      title: 'Thoi gian',
      key: 'time',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.appointmentTime}</Text>
          <Text type="secondary">{record.duration} phut</Text>
        </Space>
      ),
    },
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.patientAvatar} />
          <Space direction="vertical" size={0}>
            <Text strong>{record.patientName}</Text>
            <Text type="secondary">{record.patientPhone}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Bac si',
      key: 'doctor',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.doctorName}</Text>
          <Text type="secondary">{record.specialty}</Text>
        </Space>
      ),
    },
    {
      title: 'Loai',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) =>
        type === 'video' ? (
          <Tag icon={<VideoCameraOutlined />} color="blue">
            Video
          </Tag>
        ) : (
          <Tag icon={<PhoneOutlined />} color="green">
            Phone
          </Tag>
        ),
    },
    {
      title: 'Ly do kham',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          {(record.status === 'waiting' || record.status === 'scheduled') && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              size="small"
              onClick={() => handleStartConsultation(record)}
            >
              Bat dau
            </Button>
          )}
          {record.status === 'in_progress' && (
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
          {record.status === 'completed' && (
            <Button size="small" icon={<FileTextOutlined />}>
              Xem HS
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Kham benh tu xa (Telemedicine)</Title>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Lich hen hom nay"
              value={todayAppointments.length}
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Dang cho"
              value={waitingCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Dang kham"
              value={inProgressCount}
              prefix={<VideoCameraOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hoan thanh"
              value={completedCount}
              prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

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
          message="Luu y"
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
                />
              ),
            },
            {
              key: 'upcoming',
              label: 'Sap toi',
              children: (
                <Table
                  columns={columns}
                  dataSource={appointments.filter(
                    (a) => a.appointmentDate > dayjs().format('YYYY-MM-DD')
                  )}
                  rowKey="id"
                />
              ),
            },
            {
              key: 'history',
              label: 'Lich su',
              children: (
                <Table
                  columns={columns}
                  dataSource={appointments.filter((a) => a.status === 'completed')}
                  rowKey="id"
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
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleBookAppointment}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="patientName"
                label="Ho ten benh nhan"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="patientPhone"
                label="So dien thoai"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="doctorId" label="Bac si" rules={[{ required: true }]}>
                <Select>
                  {mockDoctors.map((d) => (
                    <Select.Option key={d.id} value={d.id}>
                      {d.name} - {d.specialty}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Hinh thuc" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="video">Video Call (200,000d)</Select.Option>
                  <Select.Option value="phone">Phone Call (150,000d)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="appointmentDate"
                label="Ngay kham"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="appointmentTime"
                label="Gio kham"
                rules={[{ required: true }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reason" label="Ly do kham" rules={[{ required: true }]}>
            <TextArea rows={3} />
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
                <Space direction="vertical" align="center">
                  <Avatar size={100} icon={<UserOutlined />} />
                  <Text style={{ color: '#fff' }}>{selectedAppointment.patientName}</Text>
                  <Text style={{ color: '#999' }}>
                    {activeSession?.status === 'active'
                      ? 'Dang ket noi...'
                      : 'Cho benh nhan tham gia'}
                  </Text>
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
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">Ho ten:</Text>
                    <Text strong style={{ marginLeft: 8 }}>
                      {selectedAppointment.patientName}
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary">SDT:</Text>
                    <Text style={{ marginLeft: 8 }}>{selectedAppointment.patientPhone}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Ly do:</Text>
                    <Text style={{ marginLeft: 8 }}>{selectedAppointment.reason}</Text>
                  </div>
                </Space>
              </Card>

              <Card title="Ghi chu kham" size="small" style={{ marginTop: 16 }}>
                <TextArea rows={6} placeholder="Nhap ghi chu..." />
              </Card>

              <Space style={{ marginTop: 16, width: '100%' }} direction="vertical">
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
          <Button key="save" type="primary" onClick={() => {
            message.success('Da luu don thuoc');
            setIsPrescriptionModalOpen(false);
          }}>
            Luu & Gui
          </Button>,
        ]}
        width={700}
      >
        <Alert
          message="Don thuoc dien tu se duoc ky so va gui den nha thuoc lien ket"
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
  );
};

export default Telemedicine;
