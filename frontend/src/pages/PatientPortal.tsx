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
  Typography,
  Tabs,
  Statistic,
  Descriptions,
  Avatar,
  Timeline,
  Divider,
  message,
  List,
  Rate,
  Badge,
  Result,
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
  QrcodeOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Types
interface PatientAccount {
  id: string;
  patientId: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  address: string;
  idNumber: string;
  insuranceNumber?: string;
  registeredDate: string;
  lastLoginDate?: string;
  status: 'active' | 'inactive' | 'pending';
}

interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  specialty: string;
  appointmentDate: string;
  appointmentTime: string;
  type: 'new' | 'follow_up' | 'telemedicine';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
}

interface LabResult {
  id: string;
  patientId: string;
  testName: string;
  testDate: string;
  resultDate: string;
  status: 'pending' | 'completed';
  downloadUrl?: string;
}

interface Bill {
  id: string;
  patientId: string;
  visitDate: string;
  totalAmount: number;
  paidAmount: number;
  insuranceCovered: number;
  status: 'pending' | 'partial' | 'paid';
  services: string[];
}

interface Feedback {
  id: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  department: string;
  rating: number;
  comment: string;
  submittedDate: string;
  response?: string;
}

// Mock data
const mockPatients: PatientAccount[] = [
  {
    id: 'PA001',
    patientId: 'P001',
    fullName: 'Nguyen Van A',
    phone: '0901234567',
    email: 'nguyenvana@email.com',
    dateOfBirth: '1985-05-15',
    gender: 'male',
    address: '123 Nguyen Hue, Q1, TP.HCM',
    idNumber: '0123456789012',
    insuranceNumber: 'HS123456789',
    registeredDate: '2023-06-15',
    lastLoginDate: dayjs().format('YYYY-MM-DD'),
    status: 'active',
  },
  {
    id: 'PA002',
    patientId: 'P002',
    fullName: 'Tran Thi B',
    phone: '0902345678',
    email: 'tranthib@email.com',
    dateOfBirth: '1990-08-20',
    gender: 'female',
    address: '456 Le Loi, Q3, TP.HCM',
    idNumber: '0234567890123',
    registeredDate: '2024-01-10',
    status: 'active',
  },
];

const mockAppointments: Appointment[] = [
  {
    id: 'APT001',
    patientId: 'P001',
    doctorName: 'BS. Nguyen Van X',
    specialty: 'Noi khoa',
    appointmentDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    appointmentTime: '09:00',
    type: 'follow_up',
    status: 'confirmed',
    notes: 'Tai kham huyet ap',
  },
  {
    id: 'APT002',
    patientId: 'P001',
    doctorName: 'BS. Tran Thi Y',
    specialty: 'Tim mach',
    appointmentDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    appointmentTime: '14:00',
    type: 'new',
    status: 'scheduled',
  },
];

const mockLabResults: LabResult[] = [
  {
    id: 'LR001',
    patientId: 'P001',
    testName: 'Cong thuc mau',
    testDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    resultDate: dayjs().subtract(4, 'day').format('YYYY-MM-DD'),
    status: 'completed',
    downloadUrl: '/results/LR001.pdf',
  },
  {
    id: 'LR002',
    patientId: 'P001',
    testName: 'Sinh hoa mau',
    testDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    resultDate: dayjs().subtract(4, 'day').format('YYYY-MM-DD'),
    status: 'completed',
    downloadUrl: '/results/LR002.pdf',
  },
  {
    id: 'LR003',
    patientId: 'P001',
    testName: 'Xquang nguc',
    testDate: dayjs().format('YYYY-MM-DD'),
    resultDate: '',
    status: 'pending',
  },
];

const mockBills: Bill[] = [
  {
    id: 'BILL001',
    patientId: 'P001',
    visitDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    totalAmount: 1500000,
    paidAmount: 1500000,
    insuranceCovered: 1200000,
    status: 'paid',
    services: ['Kham benh', 'Xet nghiem mau', 'Thuoc'],
  },
  {
    id: 'BILL002',
    patientId: 'P001',
    visitDate: dayjs().format('YYYY-MM-DD'),
    totalAmount: 800000,
    paidAmount: 0,
    insuranceCovered: 0,
    status: 'pending',
    services: ['Xquang nguc'],
  },
];

const mockFeedbacks: Feedback[] = [
  {
    id: 'FB001',
    patientId: 'P002',
    patientName: 'Tran Thi B',
    visitDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
    department: 'Noi khoa',
    rating: 4,
    comment: 'Bac si than thien, phong kham sach se. Tuy nhien thoi gian cho kha lau.',
    submittedDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    response: 'Cam on quy khach da gop y. Chung toi se cai thien thoi gian cho.',
  },
];

const PatientPortal: React.FC = () => {
  const [patients] = useState<PatientAccount[]>(mockPatients);
  const [appointments] = useState<Appointment[]>(mockAppointments);
  const [labResults] = useState<LabResult[]>(mockLabResults);
  const [bills] = useState<Bill[]>(mockBills);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(mockFeedbacks);
  const [selectedPatient, setSelectedPatient] = useState<PatientAccount | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isPatientViewOpen, setIsPatientViewOpen] = useState(false);
  const [appointmentForm] = Form.useForm();
  const [feedbackForm] = Form.useForm();

  // Statistics
  const activePatients = patients.filter((p) => p.status === 'active').length;
  const upcomingAppointments = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed').length;
  const pendingResults = labResults.filter((r) => r.status === 'pending').length;

  const getStatusTag = (status: PatientAccount['status']) => {
    const config = {
      active: { color: 'green', text: 'Hoat dong' },
      inactive: { color: 'red', text: 'Tam khoa' },
      pending: { color: 'orange', text: 'Cho xac thuc' },
    };
    const c = config[status];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleBookAppointment = (values: any) => {
    message.success('Da dat lich hen thanh cong');
    setIsAppointmentModalOpen(false);
    appointmentForm.resetFields();
  };

  const handleSubmitFeedback = (values: any) => {
    const newFeedback: Feedback = {
      id: `FB${Date.now()}`,
      patientId: selectedPatient?.patientId || '',
      patientName: selectedPatient?.fullName || '',
      visitDate: values.visitDate.format('YYYY-MM-DD'),
      department: values.department,
      rating: values.rating,
      comment: values.comment,
      submittedDate: dayjs().format('YYYY-MM-DD'),
    };

    setFeedbacks((prev) => [...prev, newFeedback]);
    setIsFeedbackModalOpen(false);
    feedbackForm.resetFields();
    message.success('Cam on quy khach da gop y');
  };

  const patientColumns: ColumnsType<PatientAccount> = [
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <Space orientation="vertical" size={0}>
            <Text strong>{record.fullName}</Text>
            <Text type="secondary">{record.phone}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      render: (num) => num || <Text type="secondary">Khong co</Text>,
    },
    {
      title: 'Ngay dang ky',
      dataIndex: 'registeredDate',
      key: 'registeredDate',
    },
    {
      title: 'Dang nhap gan nhat',
      dataIndex: 'lastLoginDate',
      key: 'lastLoginDate',
      render: (date) => date || '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tac',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setSelectedPatient(record);
            setIsPatientViewOpen(true);
          }}
        >
          Xem
        </Button>
      ),
    },
  ];

  const appointmentColumns: ColumnsType<Appointment> = [
    {
      title: 'Ngay',
      dataIndex: 'appointmentDate',
      key: 'appointmentDate',
    },
    {
      title: 'Gio',
      dataIndex: 'appointmentTime',
      key: 'appointmentTime',
    },
    {
      title: 'Bac si',
      dataIndex: 'doctorName',
      key: 'doctorName',
    },
    {
      title: 'Chuyen khoa',
      dataIndex: 'specialty',
      key: 'specialty',
    },
    {
      title: 'Loai',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const labels: Record<string, string> = {
          new: 'Kham moi',
          follow_up: 'Tai kham',
          telemedicine: 'Tu xa',
        };
        return labels[type];
      },
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config: Record<string, { color: string; text: string }> = {
          scheduled: { color: 'blue', text: 'Da dat' },
          confirmed: { color: 'green', text: 'Xac nhan' },
          completed: { color: 'default', text: 'Hoan thanh' },
          cancelled: { color: 'red', text: 'Da huy' },
          no_show: { color: 'volcano', text: 'Vang mat' },
        };
        const c = config[status];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  const feedbackColumns: ColumnsType<Feedback> = [
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Ngay kham',
      dataIndex: 'visitDate',
      key: 'visitDate',
    },
    {
      title: 'Diem',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => <Rate disabled defaultValue={rating} />,
    },
    {
      title: 'Noi dung',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
    },
    {
      title: 'Da phan hoi',
      key: 'response',
      render: (_, record) =>
        record.response ? (
          <Tag color="green">Da phan hoi</Tag>
        ) : (
          <Tag color="orange">Chua phan hoi</Tag>
        ),
    },
  ];

  return (
    <div>
      <Title level={4}>Cong benh nhan (Patient Portal)</Title>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tai khoan hoat dong"
              value={activePatients}
              prefix={<UserOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Lich hen sap toi"
              value={upcomingAppointments}
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Ket qua cho tra"
              value={pendingResults}
              prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card>
        <Tabs
          defaultActiveKey="patients"
          items={[
            {
              key: 'patients',
              label: 'Tai khoan benh nhan',
              children: (
                <Table
                  columns={patientColumns}
                  dataSource={patients}
                  rowKey="id"
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      setSelectedPatient(record);
                      setIsPatientViewOpen(true);
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
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
                          title: 'Chi tiết lịch hẹn',
                          width: 500,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Ngày hẹn">{record.appointmentDate}</Descriptions.Item>
                              <Descriptions.Item label="Giờ">{record.appointmentTime}</Descriptions.Item>
                              <Descriptions.Item label="Khoa/Phòng">{record.department}</Descriptions.Item>
                              <Descriptions.Item label="Bác sĩ">{record.doctorName || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Lý do">{record.reason || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{record.status}</Descriptions.Item>
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
              key: 'feedbacks',
              label: 'Danh gia dich vu',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title="Diem trung binh"
                          value={4.2}
                          suffix="/5"
                          prefix={<StarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic title="Tong danh gia" value={feedbacks.length} />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title="Ty le phan hoi"
                          value={
                            Math.round(
                              (feedbacks.filter((f) => f.response).length / feedbacks.length) *
                                100
                            ) || 0
                          }
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
                              <Descriptions.Item label="Điểm">{record.rating}/5</Descriptions.Item>
                              <Descriptions.Item label="Nội dung">{record.content}</Descriptions.Item>
                              <Descriptions.Item label="Phản hồi">{record.response || 'Chưa phản hồi'}</Descriptions.Item>
                              <Descriptions.Item label="Ngày">{record.createdDate}</Descriptions.Item>
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
              label: 'Thong bao',
              children: (
                <List
                  itemLayout="horizontal"
                  dataSource={[
                    {
                      title: 'Nhac lich hen',
                      description: 'Ban co lich hen voi BS. Nguyen Van X vao ngay 15/02/2024 luc 09:00',
                      time: '2 gio truoc',
                    },
                    {
                      title: 'Ket qua xet nghiem',
                      description: 'Ket qua xet nghiem Sinh hoa mau cua ban da san sang',
                      time: '1 ngay truoc',
                    },
                    {
                      title: 'Thanh toan',
                      description: 'Ban con hoa don chua thanh toan: 800,000 VND',
                      time: '2 ngay truoc',
                    },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Badge dot><BellOutlined style={{ fontSize: 24 }} /></Badge>}
                        title={item.title}
                        description={
                          <Space orientation="vertical" size={0}>
                            <Text>{item.description}</Text>
                            <Text type="secondary">{item.time}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Patient View Modal */}
      <Modal
        title="Thong tin tai khoan benh nhan"
        open={isPatientViewOpen}
        onCancel={() => setIsPatientViewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsPatientViewOpen(false)}>
            Dong
          </Button>,
        ]}
        width={700}
      >
        {selectedPatient && (
          <>
            <Row gutter={16}>
              <Col span={6}>
                <Avatar size={100} icon={<UserOutlined />} />
              </Col>
              <Col span={18}>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Ho ten">{selectedPatient.fullName}</Descriptions.Item>
                  <Descriptions.Item label="Trang thai">
                    {getStatusTag(selectedPatient.status)}
                  </Descriptions.Item>
                  <Descriptions.Item label="SDT">{selectedPatient.phone}</Descriptions.Item>
                  <Descriptions.Item label="Email">{selectedPatient.email}</Descriptions.Item>
                  <Descriptions.Item label="Ngay sinh">
                    {selectedPatient.dateOfBirth}
                  </Descriptions.Item>
                  <Descriptions.Item label="CCCD">{selectedPatient.idNumber}</Descriptions.Item>
                  <Descriptions.Item label="BHYT" span={2}>
                    {selectedPatient.insuranceNumber || 'Khong co'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Dia chi" span={2}>
                    {selectedPatient.address}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            <Divider>Hoat dong gan day</Divider>

            <Timeline
              items={[
                {
                  color: 'green',
                  content: <>{dayjs().format('DD/MM/YYYY HH:mm')} - Dang nhap he thong</>,
                },
                {
                  color: 'blue',
                  content: <>{dayjs().subtract(5, 'day').format('DD/MM/YYYY')} - Kham benh Noi khoa</>,
                },
                {
                  color: 'blue',
                  content: <>{dayjs().subtract(5, 'day').format('DD/MM/YYYY')} - Xet nghiem mau</>,
                },
              ]}
            />

            <Divider>Hoa don chua thanh toan</Divider>

            {bills.filter((b) => b.patientId === selectedPatient.patientId && b.status === 'pending')
              .length > 0 ? (
              <List
                dataSource={bills.filter(
                  (b) => b.patientId === selectedPatient.patientId && b.status === 'pending'
                )}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`Hoa don ${item.id}`}
                      description={`Ngay: ${item.visitDate} | ${item.services.join(', ')}`}
                    />
                    <Text strong style={{ color: '#ff4d4f' }}>
                      {item.totalAmount.toLocaleString('vi-VN')} VND
                    </Text>
                  </List.Item>
                )}
              />
            ) : (
              <Result status="success" title="Khong co hoa don chua thanh toan" />
            )}
          </>
        )}
      </Modal>

      {/* Appointment Modal */}
      <Modal
        title="Dat lich hen"
        open={isAppointmentModalOpen}
        onCancel={() => setIsAppointmentModalOpen(false)}
        onOk={() => appointmentForm.submit()}
      >
        <Form form={appointmentForm} layout="vertical" onFinish={handleBookAppointment}>
          <Form.Item name="patientId" label="Benh nhan" rules={[{ required: true }]}>
            <Select>
              {patients.map((p) => (
                <Select.Option key={p.patientId} value={p.patientId}>
                  {p.fullName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="specialty" label="Chuyen khoa" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Noi khoa">Noi khoa</Select.Option>
              <Select.Option value="Ngoai khoa">Ngoai khoa</Select.Option>
              <Select.Option value="Tim mach">Tim mach</Select.Option>
              <Select.Option value="Da lieu">Da lieu</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="doctorId" label="Bac si">
            <Select>
              <Select.Option value="D001">BS. Nguyen Van X</Select.Option>
              <Select.Option value="D002">BS. Tran Thi Y</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="date" label="Ngay" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="time" label="Gio" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="08:00">08:00</Select.Option>
                  <Select.Option value="09:00">09:00</Select.Option>
                  <Select.Option value="10:00">10:00</Select.Option>
                  <Select.Option value="14:00">14:00</Select.Option>
                  <Select.Option value="15:00">15:00</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="type" label="Loai kham" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="new">Kham moi</Select.Option>
              <Select.Option value="follow_up">Tai kham</Select.Option>
              <Select.Option value="telemedicine">Kham tu xa</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Ghi chu">
            <TextArea rows={2} />
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
          <Form.Item name="visitDate" label="Ngay kham" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="department" label="Khoa" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Noi khoa">Noi khoa</Select.Option>
              <Select.Option value="Ngoai khoa">Ngoai khoa</Select.Option>
              <Select.Option value="CDHA">Chan doan hinh anh</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="rating" label="Diem danh gia" rules={[{ required: true }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="Nhan xet" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Chia se trai nghiem cua ban..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PatientPortal;
