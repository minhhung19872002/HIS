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
  Calendar,
  Badge,
  message,
  Divider,
  List,
  Progress,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  ScheduleOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  PrinterOutlined,
  PlusOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Types
interface Employee {
  id: string;
  code: string;
  fullName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  position: string;
  department: string;
  qualification: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  joinDate: string;
  status: 'active' | 'on_leave' | 'resigned';
  phone: string;
  email: string;
  avatar?: string;
  cmeCredits?: number;
  cmeRequired?: number;
}

interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  shiftType: 'morning' | 'afternoon' | 'night' | 'on_call';
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'checked_in' | 'checked_out' | 'absent';
}

interface Training {
  id: string;
  employeeId: string;
  employeeName: string;
  trainingName: string;
  trainingType: 'cme' | 'internal' | 'external' | 'certification';
  startDate: string;
  endDate?: string;
  credits: number;
  status: 'registered' | 'in_progress' | 'completed' | 'cancelled';
  certificate?: string;
}

// Mock data
const mockEmployees: Employee[] = [
  {
    id: 'EMP001',
    code: 'BS001',
    fullName: 'BS. Nguyen Van A',
    gender: 'male',
    dateOfBirth: '1980-05-15',
    position: 'Bac si',
    department: 'Noi khoa',
    qualification: 'Thac si Y khoa',
    licenseNumber: 'CCHN-001234',
    licenseExpiry: '2025-12-31',
    joinDate: '2010-03-01',
    status: 'active',
    phone: '0901234567',
    email: 'nguyenvana@hospital.vn',
    cmeCredits: 36,
    cmeRequired: 48,
  },
  {
    id: 'EMP002',
    code: 'DD002',
    fullName: 'DD. Tran Thi B',
    gender: 'female',
    dateOfBirth: '1990-08-20',
    position: 'Dieu duong truong',
    department: 'Noi khoa',
    qualification: 'Cu nhan Dieu duong',
    licenseNumber: 'CCHN-DD-002345',
    licenseExpiry: '2024-03-15',
    joinDate: '2015-06-01',
    status: 'active',
    phone: '0902345678',
    email: 'tranthib@hospital.vn',
    cmeCredits: 20,
    cmeRequired: 24,
  },
  {
    id: 'EMP003',
    code: 'BS003',
    fullName: 'BS. Le Van C',
    gender: 'male',
    dateOfBirth: '1975-12-10',
    position: 'Truong khoa',
    department: 'Ngoai khoa',
    qualification: 'Tien si Y khoa',
    licenseNumber: 'CCHN-003456',
    licenseExpiry: '2026-06-30',
    joinDate: '2005-09-01',
    status: 'active',
    phone: '0903456789',
    email: 'levanc@hospital.vn',
    cmeCredits: 52,
    cmeRequired: 48,
  },
];

const mockShifts: Shift[] = [
  {
    id: 'SH001',
    employeeId: 'EMP001',
    employeeName: 'BS. Nguyen Van A',
    department: 'Noi khoa',
    date: dayjs().format('YYYY-MM-DD'),
    shiftType: 'morning',
    startTime: '07:00',
    endTime: '14:00',
    status: 'checked_in',
  },
  {
    id: 'SH002',
    employeeId: 'EMP002',
    employeeName: 'DD. Tran Thi B',
    department: 'Noi khoa',
    date: dayjs().format('YYYY-MM-DD'),
    shiftType: 'afternoon',
    startTime: '14:00',
    endTime: '21:00',
    status: 'scheduled',
  },
  {
    id: 'SH003',
    employeeId: 'EMP003',
    employeeName: 'BS. Le Van C',
    department: 'Ngoai khoa',
    date: dayjs().format('YYYY-MM-DD'),
    shiftType: 'night',
    startTime: '21:00',
    endTime: '07:00',
    status: 'scheduled',
  },
];

const mockTrainings: Training[] = [
  {
    id: 'TR001',
    employeeId: 'EMP001',
    employeeName: 'BS. Nguyen Van A',
    trainingName: 'Cap nhat dieu tri benh tim mach',
    trainingType: 'cme',
    startDate: '2024-02-15',
    credits: 8,
    status: 'registered',
  },
  {
    id: 'TR002',
    employeeId: 'EMP002',
    employeeName: 'DD. Tran Thi B',
    trainingName: 'Ky thuat cham soc vet thuong',
    trainingType: 'internal',
    startDate: '2024-01-10',
    endDate: '2024-01-10',
    credits: 4,
    status: 'completed',
  },
];

const POSITIONS = [
  { value: 'doctor', label: 'Bac si' },
  { value: 'nurse', label: 'Dieu duong' },
  { value: 'technician', label: 'Ky thuat vien' },
  { value: 'pharmacist', label: 'Duoc si' },
  { value: 'admin', label: 'Hanh chinh' },
];

const HR: React.FC = () => {
  const [employees] = useState<Employee[]>(mockEmployees);
  const [shifts] = useState<Shift[]>(mockShifts);
  const [trainings] = useState<Training[]>(mockTrainings);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [shiftForm] = Form.useForm();
  const [trainingForm] = Form.useForm();

  // Statistics
  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const licenseExpiringSoon = employees.filter((e) => {
    if (!e.licenseExpiry) return false;
    const daysUntil = dayjs(e.licenseExpiry).diff(dayjs(), 'day');
    return daysUntil > 0 && daysUntil <= 90;
  }).length;
  const cmeIncomplete = employees.filter(
    (e) => e.cmeCredits && e.cmeRequired && e.cmeCredits < e.cmeRequired
  ).length;

  const getStatusTag = (status: Employee['status']) => {
    const config = {
      active: { color: 'green', text: 'Dang lam viec' },
      on_leave: { color: 'orange', text: 'Nghi phep' },
      resigned: { color: 'red', text: 'Da nghi viec' },
    };
    const c = config[status];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getShiftTag = (shiftType: Shift['shiftType']) => {
    const config = {
      morning: { color: 'blue', text: 'Sang' },
      afternoon: { color: 'orange', text: 'Chieu' },
      night: { color: 'purple', text: 'Dem' },
      on_call: { color: 'red', text: 'Truc' },
    };
    const c = config[shiftType];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleAddShift = (values: any) => {
    message.success('Da them lich truc');
    setIsShiftModalOpen(false);
    shiftForm.resetFields();
  };

  const handleAddTraining = (values: any) => {
    message.success('Da dang ky dao tao');
    setIsTrainingModalOpen(false);
    trainingForm.resetFields();
  };

  const executePrintEmployeeCard = () => {
    if (!selectedEmployee) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ho so nhan vien</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; width: 30%; }
          .photo { width: 120px; height: 160px; border: 1px solid #000; float: right; margin-left: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>BENH VIEN DA KHOA</strong><br/>
          Phong To chuc - Nhan su
        </div>

        <div class="title">HO SO NHAN VIEN Y TE</div>

        <div class="photo">Anh 3x4</div>

        <table>
          <tr><th>Ma nhan vien</th><td>${selectedEmployee.code}</td></tr>
          <tr><th>Ho va ten</th><td>${selectedEmployee.fullName}</td></tr>
          <tr><th>Gioi tinh</th><td>${selectedEmployee.gender === 'male' ? 'Nam' : 'Nu'}</td></tr>
          <tr><th>Ngay sinh</th><td>${selectedEmployee.dateOfBirth}</td></tr>
          <tr><th>Chuc vu</th><td>${selectedEmployee.position}</td></tr>
          <tr><th>Khoa/Phong</th><td>${selectedEmployee.department}</td></tr>
          <tr><th>Trinh do</th><td>${selectedEmployee.qualification}</td></tr>
          <tr><th>So CCHN</th><td>${selectedEmployee.licenseNumber || '-'}</td></tr>
          <tr><th>CCHN het han</th><td>${selectedEmployee.licenseExpiry || '-'}</td></tr>
          <tr><th>Ngay vao lam</th><td>${selectedEmployee.joinDate}</td></tr>
          <tr><th>SDT</th><td>${selectedEmployee.phone}</td></tr>
          <tr><th>Email</th><td>${selectedEmployee.email}</td></tr>
        </table>

        <div style="margin-top: 50px; text-align: right;">
          <p>Ngay ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Truong phong Nhan su</strong></p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const employeeColumns: ColumnsType<Employee> = [
    {
      title: 'Nhan vien',
      key: 'employee',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.avatar} />
          <Space orientation="vertical" size={0}>
            <Text strong>{record.fullName}</Text>
            <Text type="secondary">{record.code}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Chuc vu',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Khoa/Phong',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'So CCHN',
      key: 'license',
      render: (_, record) => {
        if (!record.licenseNumber) return '-';
        const daysUntil = record.licenseExpiry
          ? dayjs(record.licenseExpiry).diff(dayjs(), 'day')
          : 999;
        return (
          <Space orientation="vertical" size={0}>
            <Text>{record.licenseNumber}</Text>
            {daysUntil <= 90 && daysUntil > 0 && (
              <Tag color="orange" icon={<WarningOutlined />}>
                Con {daysUntil} ngay
              </Tag>
            )}
            {daysUntil <= 0 && (
              <Tag color="red" icon={<WarningOutlined />}>
                Da het han
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'CME',
      key: 'cme',
      width: 120,
      render: (_, record) => {
        if (!record.cmeCredits || !record.cmeRequired) return '-';
        const percent = (record.cmeCredits / record.cmeRequired) * 100;
        return (
          <Space orientation="vertical" size={0} style={{ width: '100%' }}>
            <Progress
              percent={Math.round(percent)}
              size="small"
              status={percent >= 100 ? 'success' : 'active'}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.cmeCredits}/{record.cmeRequired} tiet
            </Text>
          </Space>
        );
      },
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
      width: 100,
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setSelectedEmployee(record);
            setIsDetailModalOpen(true);
          }}
        >
          Chi tiet
        </Button>
      ),
    },
  ];

  const shiftColumns: ColumnsType<Shift> = [
    {
      title: 'Nhan vien',
      dataIndex: 'employeeName',
      key: 'employeeName',
    },
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Ngay',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Ca',
      dataIndex: 'shiftType',
      key: 'shiftType',
      render: (type) => getShiftTag(type),
    },
    {
      title: 'Thoi gian',
      key: 'time',
      render: (_, record) => `${record.startTime} - ${record.endTime}`,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config: Record<string, { color: string; text: string }> = {
          scheduled: { color: 'blue', text: 'Da len lich' },
          checked_in: { color: 'green', text: 'Da vao ca' },
          checked_out: { color: 'default', text: 'Da ra ca' },
          absent: { color: 'red', text: 'Vang mat' },
        };
        const c = config[status];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  const trainingColumns: ColumnsType<Training> = [
    {
      title: 'Nhan vien',
      dataIndex: 'employeeName',
      key: 'employeeName',
    },
    {
      title: 'Khoa hoc',
      dataIndex: 'trainingName',
      key: 'trainingName',
    },
    {
      title: 'Loai',
      dataIndex: 'trainingType',
      key: 'trainingType',
      render: (type) => {
        const labels: Record<string, string> = {
          cme: 'CME',
          internal: 'Noi bo',
          external: 'Ben ngoai',
          certification: 'Chung chi',
        };
        return labels[type];
      },
    },
    {
      title: 'Ngay',
      dataIndex: 'startDate',
      key: 'startDate',
    },
    {
      title: 'So tiet',
      dataIndex: 'credits',
      key: 'credits',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config: Record<string, { color: string; text: string }> = {
          registered: { color: 'blue', text: 'Da dang ky' },
          in_progress: { color: 'orange', text: 'Dang hoc' },
          completed: { color: 'green', text: 'Hoan thanh' },
          cancelled: { color: 'red', text: 'Da huy' },
        };
        const c = config[status];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayShifts = shifts.filter((s) => s.date === dateStr);
    if (dayShifts.length === 0) return null;

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayShifts.slice(0, 2).map((shift) => (
          <li key={shift.id}>
            <Badge
              status={
                shift.shiftType === 'morning'
                  ? 'processing'
                  : shift.shiftType === 'afternoon'
                  ? 'warning'
                  : 'error'
              }
              text={<Text style={{ fontSize: 10 }}>{shift.employeeName.split(' ').pop()}</Text>}
            />
          </li>
        ))}
        {dayShifts.length > 2 && (
          <li><Text type="secondary" style={{ fontSize: 10 }}>+{dayShifts.length - 2} khac</Text></li>
        )}
      </ul>
    );
  };

  return (
    <div>
      <Title level={4}>Quan ly nhan su y te</Title>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Nhan vien dang lam viec"
              value={activeEmployees}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="CCHN sap het han"
              value={licenseExpiringSoon}
              prefix={<SafetyCertificateOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="CME chua du"
              value={cmeIncomplete}
              prefix={<BookOutlined style={{ color: '#ff4d4f' }} />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            Them nhan vien
          </Button>
        }
      >
        <Tabs
          defaultActiveKey="employees"
          items={[
            {
              key: 'employees',
              label: 'Danh sach nhan vien',
              children: (
                <Table
                  columns={employeeColumns}
                  dataSource={employees}
                  rowKey="id"
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      setSelectedEmployee(record);
                      setIsDetailModalOpen(true);
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
            {
              key: 'schedule',
              label: 'Lich truc',
              children: (
                <Row gutter={16}>
                  <Col span={16}>
                    <Calendar cellRender={dateCellRender} />
                  </Col>
                  <Col span={8}>
                    <Card
                      title="Lich truc hom nay"
                      extra={
                        <Button size="small" onClick={() => setIsShiftModalOpen(true)}>
                          Them
                        </Button>
                      }
                    >
                      <List
                        dataSource={shifts.filter(
                          (s) => s.date === dayjs().format('YYYY-MM-DD')
                        )}
                        renderItem={(item) => (
                          <List.Item>
                            <Space>
                              {getShiftTag(item.shiftType)}
                              <Text>{item.employeeName}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'shifts',
              label: 'Phan ca',
              children: (
                <>
                  <Button
                    type="primary"
                    icon={<ScheduleOutlined />}
                    style={{ marginBottom: 16 }}
                    onClick={() => setIsShiftModalOpen(true)}
                  >
                    Phan ca moi
                  </Button>
                  <Table
                    columns={shiftColumns}
                    dataSource={shifts}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        const emp = employees.find(e => e.id === record.employeeId);
                        if (emp) {
                          setSelectedEmployee(emp);
                          setIsDetailModalOpen(true);
                        }
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'training',
              label: 'Dao tao',
              children: (
                <>
                  <Button
                    type="primary"
                    icon={<BookOutlined />}
                    style={{ marginBottom: 16 }}
                    onClick={() => setIsTrainingModalOpen(true)}
                  >
                    Dang ky dao tao
                  </Button>
                  <Table
                    columns={trainingColumns}
                    dataSource={trainings}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiết đào tạo - ${record.courseName}`,
                          width: 500,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Khóa đào tạo">{record.courseName}</Descriptions.Item>
                              <Descriptions.Item label="Nhân viên">{record.employeeName}</Descriptions.Item>
                              <Descriptions.Item label="Ngày bắt đầu">{record.startDate}</Descriptions.Item>
                              <Descriptions.Item label="Ngày kết thúc">{record.endDate || '-'}</Descriptions.Item>
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
              key: 'licenses',
              label: (
                <Badge count={licenseExpiringSoon} offset={[10, 0]}>
                  Chung chi hanh nghe
                </Badge>
              ),
              children: (
                <Table
                  columns={[
                    { title: 'Nhan vien', dataIndex: 'fullName', key: 'fullName' },
                    { title: 'Chuc vu', dataIndex: 'position', key: 'position' },
                    { title: 'So CCHN', dataIndex: 'licenseNumber', key: 'licenseNumber' },
                    {
                      title: 'Ngay het han',
                      dataIndex: 'licenseExpiry',
                      key: 'licenseExpiry',
                      render: (date) => {
                        if (!date) return '-';
                        const daysUntil = dayjs(date).diff(dayjs(), 'day');
                        const color =
                          daysUntil <= 0 ? 'red' : daysUntil <= 90 ? 'orange' : 'green';
                        return <Tag color={color}>{date}</Tag>;
                      },
                    },
                    {
                      title: 'Trang thai',
                      key: 'status',
                      render: (_, record) => {
                        if (!record.licenseExpiry) return '-';
                        const daysUntil = dayjs(record.licenseExpiry).diff(dayjs(), 'day');
                        if (daysUntil <= 0) {
                          return <Tag color="red">Het han</Tag>;
                        }
                        if (daysUntil <= 90) {
                          return <Tag color="orange">Sap het han</Tag>;
                        }
                        return <Tag color="green">Con hieu luc</Tag>;
                      },
                    },
                  ]}
                  dataSource={employees.filter((e) => e.licenseNumber)}
                  rowKey="id"
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      setSelectedEmployee(record);
                      setIsDetailModalOpen(true);
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chi tiet nhan vien"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={executePrintEmployeeCard}>
            In ho so
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Dong
          </Button>,
        ]}
        width={700}
      >
        {selectedEmployee && (
          <>
            <Row gutter={16}>
              <Col span={6}>
                <Avatar size={100} icon={<UserOutlined />} src={selectedEmployee.avatar} />
              </Col>
              <Col span={18}>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Ma NV">{selectedEmployee.code}</Descriptions.Item>
                  <Descriptions.Item label="Trang thai">
                    {getStatusTag(selectedEmployee.status)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ho ten" span={2}>
                    {selectedEmployee.fullName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Gioi tinh">
                    {selectedEmployee.gender === 'male' ? 'Nam' : 'Nu'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngay sinh">
                    {selectedEmployee.dateOfBirth}
                  </Descriptions.Item>
                  <Descriptions.Item label="Chuc vu">{selectedEmployee.position}</Descriptions.Item>
                  <Descriptions.Item label="Khoa/Phong">
                    {selectedEmployee.department}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trinh do" span={2}>
                    {selectedEmployee.qualification}
                  </Descriptions.Item>
                  <Descriptions.Item label="SDT">{selectedEmployee.phone}</Descriptions.Item>
                  <Descriptions.Item label="Email">{selectedEmployee.email}</Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            <Divider>Chung chi hanh nghe</Divider>

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="So CCHN">
                {selectedEmployee.licenseNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngay het han">
                {selectedEmployee.licenseExpiry || '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedEmployee.cmeCredits && selectedEmployee.cmeRequired && (
              <>
                <Divider>Dao tao lien tuc (CME)</Divider>
                <Progress
                  percent={Math.round(
                    (selectedEmployee.cmeCredits / selectedEmployee.cmeRequired) * 100
                  )}
                  format={() =>
                    `${selectedEmployee.cmeCredits}/${selectedEmployee.cmeRequired} tiet`
                  }
                />
              </>
            )}
          </>
        )}
      </Modal>

      {/* Shift Modal */}
      <Modal
        title="Phan ca truc"
        open={isShiftModalOpen}
        onCancel={() => setIsShiftModalOpen(false)}
        onOk={() => shiftForm.submit()}
      >
        <Form form={shiftForm} layout="vertical" onFinish={handleAddShift}>
          <Form.Item name="employeeId" label="Nhan vien" rules={[{ required: true }]}>
            <Select>
              {employees.map((e) => (
                <Select.Option key={e.id} value={e.id}>
                  {e.fullName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="date" label="Ngay" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="shiftType" label="Ca" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="morning">Ca sang (07:00 - 14:00)</Select.Option>
              <Select.Option value="afternoon">Ca chieu (14:00 - 21:00)</Select.Option>
              <Select.Option value="night">Ca dem (21:00 - 07:00)</Select.Option>
              <Select.Option value="on_call">Truc</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Training Modal */}
      <Modal
        title="Dang ky dao tao"
        open={isTrainingModalOpen}
        onCancel={() => setIsTrainingModalOpen(false)}
        onOk={() => trainingForm.submit()}
      >
        <Form form={trainingForm} layout="vertical" onFinish={handleAddTraining}>
          <Form.Item name="employeeId" label="Nhan vien" rules={[{ required: true }]}>
            <Select>
              {employees.map((e) => (
                <Select.Option key={e.id} value={e.id}>
                  {e.fullName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="trainingName" label="Ten khoa hoc" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="trainingType" label="Loai" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="cme">CME - Dao tao lien tuc</Select.Option>
              <Select.Option value="internal">Dao tao noi bo</Select.Option>
              <Select.Option value="external">Dao tao ben ngoai</Select.Option>
              <Select.Option value="certification">Lay chung chi</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="startDate" label="Ngay bat dau" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="credits" label="So tiet">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HR;
