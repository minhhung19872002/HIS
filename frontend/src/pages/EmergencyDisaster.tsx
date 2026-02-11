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
  Typography,
  Tabs,
  Statistic,
  Descriptions,
  Timeline,
  Divider,
  message,
  Badge,
  Progress,
  Alert,
  Steps,
  List,
  Avatar,
  Tooltip,
} from 'antd';
import {
  AlertOutlined,
  TeamOutlined,
  UserOutlined,
  PhoneOutlined,
  PrinterOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  BellOutlined,
  MedicineBoxOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Types
interface MCIEvent {
  id: string;
  code: 'yellow' | 'orange' | 'red';
  description: string;
  location: string;
  estimatedVictims: number;
  status: 'active' | 'controlled' | 'ended';
  activatedAt: string;
  activatedBy: string;
  endedAt?: string;
}

interface Victim {
  id: string;
  mciEventId: string;
  tagNumber: string;
  triageCategory: 'red' | 'yellow' | 'green' | 'black';
  name?: string;
  gender?: 'male' | 'female';
  estimatedAge?: number;
  injuries: string;
  currentLocation: string;
  status: 'triage' | 'treatment' | 'surgery' | 'icu' | 'ward' | 'discharged' | 'deceased' | 'transferred';
  assignedDoctor?: string;
  arrivalTime: string;
  familyContacted: boolean;
  familyPhone?: string;
}

interface Resource {
  id: string;
  type: 'bed' | 'blood' | 'or' | 'icu' | 'ventilator' | 'staff';
  name: string;
  total: number;
  available: number;
  reserved: number;
}

interface StaffOnCall {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'available' | 'on_duty' | 'notified' | 'arrived';
  phone: string;
  notifiedAt?: string;
}

// Mock data
const mockMCIEvent: MCIEvent = {
  id: 'MCI001',
  code: 'orange',
  description: 'Tai nan xe bus tren cao toc',
  location: 'Cao toc TP.HCM - Long Thanh, Km 15',
  estimatedVictims: 25,
  status: 'active',
  activatedAt: '2024-01-15 10:30:00',
  activatedBy: 'BS. Nguyen Van A',
};

const mockVictims: Victim[] = [
  {
    id: 'V001',
    mciEventId: 'MCI001',
    tagNumber: 'R001',
    triageCategory: 'red',
    name: 'Chua xac dinh',
    gender: 'male',
    estimatedAge: 35,
    injuries: 'Da chan thuong, gay xuong dui, mat mau nhieu',
    currentLocation: 'Phong mo 1',
    status: 'surgery',
    assignedDoctor: 'BS. Tran Van B',
    arrivalTime: '2024-01-15 10:45:00',
    familyContacted: false,
  },
  {
    id: 'V002',
    mciEventId: 'MCI001',
    tagNumber: 'R002',
    triageCategory: 'red',
    name: 'Nguyen Thi C',
    gender: 'female',
    estimatedAge: 28,
    injuries: 'Chan thuong so nao, bat tinh',
    currentLocation: 'ICU',
    status: 'icu',
    assignedDoctor: 'BS. Le Van D',
    arrivalTime: '2024-01-15 10:50:00',
    familyContacted: true,
    familyPhone: '0901234567',
  },
  {
    id: 'V003',
    mciEventId: 'MCI001',
    tagNumber: 'Y001',
    triageCategory: 'yellow',
    name: 'Pham Van E',
    gender: 'male',
    estimatedAge: 45,
    injuries: 'Gay xuong canh tay, vet thuong o mat',
    currentLocation: 'Khu dieu tri 1',
    status: 'treatment',
    assignedDoctor: 'BS. Hoang Van F',
    arrivalTime: '2024-01-15 11:00:00',
    familyContacted: true,
    familyPhone: '0912345678',
  },
  {
    id: 'V004',
    mciEventId: 'MCI001',
    tagNumber: 'Y002',
    triageCategory: 'yellow',
    injuries: 'Gay xuong suon, kho tho',
    currentLocation: 'Khu dieu tri 2',
    status: 'treatment',
    arrivalTime: '2024-01-15 11:05:00',
    familyContacted: false,
  },
  {
    id: 'V005',
    mciEventId: 'MCI001',
    tagNumber: 'G001',
    triageCategory: 'green',
    name: 'Vo Thi G',
    gender: 'female',
    estimatedAge: 22,
    injuries: 'Xay xat da, dau dau nhe',
    currentLocation: 'Khu cho',
    status: 'treatment',
    arrivalTime: '2024-01-15 11:10:00',
    familyContacted: true,
    familyPhone: '0923456789',
  },
  {
    id: 'V006',
    mciEventId: 'MCI001',
    tagNumber: 'G002',
    triageCategory: 'green',
    injuries: 'Xay xat, soc nhe',
    currentLocation: 'Khu cho',
    status: 'treatment',
    arrivalTime: '2024-01-15 11:15:00',
    familyContacted: false,
  },
  {
    id: 'V007',
    mciEventId: 'MCI001',
    tagNumber: 'B001',
    triageCategory: 'black',
    injuries: 'Tu vong tai hien truong',
    currentLocation: 'Nha xac',
    status: 'deceased',
    arrivalTime: '2024-01-15 11:20:00',
    familyContacted: false,
  },
];

const mockResources: Resource[] = [
  { id: 'R1', type: 'bed', name: 'Giuong cap cuu', total: 20, available: 5, reserved: 8 },
  { id: 'R2', type: 'icu', name: 'Giuong ICU', total: 10, available: 2, reserved: 3 },
  { id: 'R3', type: 'or', name: 'Phong mo', total: 5, available: 1, reserved: 2 },
  { id: 'R4', type: 'ventilator', name: 'May tho', total: 15, available: 4, reserved: 5 },
  { id: 'R5', type: 'blood', name: 'Mau O+ (don vi)', total: 50, available: 35, reserved: 10 },
  { id: 'R6', type: 'blood', name: 'Mau A+ (don vi)', total: 40, available: 25, reserved: 8 },
  { id: 'R7', type: 'staff', name: 'Bac si cap cuu', total: 12, available: 3, reserved: 6 },
  { id: 'R8', type: 'staff', name: 'Dieu duong', total: 30, available: 8, reserved: 15 },
];

const mockStaff: StaffOnCall[] = [
  { id: 'S1', name: 'BS. Nguyen Van X', role: 'BS Cap cuu', department: 'Cap cuu', status: 'arrived', phone: '0901111111', notifiedAt: '2024-01-15 10:32:00' },
  { id: 'S2', name: 'BS. Tran Van Y', role: 'BS Ngoai khoa', department: 'Ngoai', status: 'arrived', phone: '0902222222', notifiedAt: '2024-01-15 10:32:00' },
  { id: 'S3', name: 'BS. Le Thi Z', role: 'BS Gay me', department: 'Gay me', status: 'on_duty', phone: '0903333333', notifiedAt: '2024-01-15 10:32:00' },
  { id: 'S4', name: 'DD. Pham Van W', role: 'Dieu duong truong', department: 'Cap cuu', status: 'arrived', phone: '0904444444', notifiedAt: '2024-01-15 10:33:00' },
  { id: 'S5', name: 'BS. Hoang Van V', role: 'BS Ngoai Than kinh', department: 'Ngoai TK', status: 'notified', phone: '0905555555', notifiedAt: '2024-01-15 10:35:00' },
];

const EmergencyDisaster: React.FC = () => {
  const [mciEvent, setMciEvent] = useState<MCIEvent | null>(mockMCIEvent);
  const [victims, setVictims] = useState<Victim[]>(mockVictims);
  const [resources] = useState<Resource[]>(mockResources);
  const [staff, setStaff] = useState<StaffOnCall[]>(mockStaff);

  const [activateModalVisible, setActivateModalVisible] = useState(false);
  const [addVictimModalVisible, setAddVictimModalVisible] = useState(false);
  const [victimDetailModalVisible, setVictimDetailModalVisible] = useState(false);
  const [selectedVictim, setSelectedVictim] = useState<Victim | null>(null);

  const [form] = Form.useForm();

  // Statistics
  const redCount = victims.filter(v => v.triageCategory === 'red').length;
  const yellowCount = victims.filter(v => v.triageCategory === 'yellow').length;
  const greenCount = victims.filter(v => v.triageCategory === 'green').length;
  const blackCount = victims.filter(v => v.triageCategory === 'black').length;

  const getCodeColor = (code: string) => {
    switch (code) {
      case 'yellow': return '#faad14';
      case 'orange': return '#fa8c16';
      case 'red': return '#f5222d';
      default: return '#1890ff';
    }
  };

  const getCodeLabel = (code: string) => {
    switch (code) {
      case 'yellow': return 'CODE YELLOW (5-10 nan nhan)';
      case 'orange': return 'CODE ORANGE (10-50 nan nhan)';
      case 'red': return 'CODE RED (>50 nan nhan hoac CBRN)';
      default: return code;
    }
  };

  const getTriageColor = (category: string) => {
    switch (category) {
      case 'red': return '#f5222d';
      case 'yellow': return '#faad14';
      case 'green': return '#52c41a';
      case 'black': return '#000000';
      default: return '#1890ff';
    }
  };

  const getTriageLabel = (category: string) => {
    switch (category) {
      case 'red': return 'DO - Cap cuu ngay';
      case 'yellow': return 'VANG - Tri hoan duoc';
      case 'green': return 'XANH - Nhe';
      case 'black': return 'DEN - Tu vong';
      default: return category;
    }
  };

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      triage: { color: 'processing', label: 'Phan loai' },
      treatment: { color: 'blue', label: 'Dieu tri' },
      surgery: { color: 'orange', label: 'Phau thuat' },
      icu: { color: 'red', label: 'ICU' },
      ward: { color: 'cyan', label: 'Buong benh' },
      discharged: { color: 'green', label: 'Xuat vien' },
      deceased: { color: 'default', label: 'Tu vong' },
      transferred: { color: 'purple', label: 'Chuyen vien' },
    };
    const config = configs[status] || { color: 'default', label: status };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const victimColumns: ColumnsType<Victim> = [
    {
      title: 'Tag',
      dataIndex: 'tagNumber',
      key: 'tagNumber',
      render: (tag, record) => (
        <Tag
          color={getTriageColor(record.triageCategory)}
          style={{ fontWeight: 'bold', fontSize: 14 }}
        >
          {tag}
        </Tag>
      ),
    },
    {
      title: 'Phan loai',
      dataIndex: 'triageCategory',
      key: 'triageCategory',
      filters: [
        { text: 'Do', value: 'red' },
        { text: 'Vang', value: 'yellow' },
        { text: 'Xanh', value: 'green' },
        { text: 'Den', value: 'black' },
      ],
      onFilter: (value, record) => record.triageCategory === value,
      render: (category) => (
        <Badge color={getTriageColor(category)} text={getTriageLabel(category)} />
      ),
    },
    {
      title: 'Ho ten',
      dataIndex: 'name',
      key: 'name',
      render: (name) => name || <Text type="secondary">Chua xac dinh</Text>,
    },
    {
      title: 'Thuong tich',
      dataIndex: 'injuries',
      key: 'injuries',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Vi tri',
      dataIndex: 'currentLocation',
      key: 'currentLocation',
      render: (loc) => (
        <Space>
          <EnvironmentOutlined />
          {loc}
        </Space>
      ),
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Bac si',
      dataIndex: 'assignedDoctor',
      key: 'assignedDoctor',
      render: (doc) => doc || '-',
    },
    {
      title: 'Lien lac GD',
      dataIndex: 'familyContacted',
      key: 'familyContacted',
      render: (contacted, record) => (
        contacted ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Da lien lac</Tag>
        ) : (
          <Button
            size="small"
            type="link"
            icon={<PhoneOutlined />}
            onClick={() => message.info('Dang goi...')}
          >
            Lien lac
          </Button>
        )
      ),
    },
    {
      title: 'Thao tac',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setSelectedVictim(record);
              setVictimDetailModalVisible(true);
            }}
          >
            Chi tiet
          </Button>
          <Button type="link">
            Cap nhat
          </Button>
        </Space>
      ),
    },
  ];

  const handleActivateMCI = (values: any) => {
    const newEvent: MCIEvent = {
      id: `MCI${String(Date.now()).slice(-6)}`,
      code: values.code,
      description: values.description,
      location: values.location,
      estimatedVictims: values.estimatedVictims,
      status: 'active',
      activatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      activatedBy: 'BS. Admin',
    };
    setMciEvent(newEvent);
    setActivateModalVisible(false);
    form.resetFields();
    message.success(`Da kich hoat ${getCodeLabel(values.code)}!`);
  };

  const handleAddVictim = (values: any) => {
    const tagPrefix = values.triageCategory.charAt(0).toUpperCase();
    const count = victims.filter(v => v.triageCategory === values.triageCategory).length + 1;

    const newVictim: Victim = {
      id: `V${String(victims.length + 1).padStart(3, '0')}`,
      mciEventId: mciEvent?.id || '',
      tagNumber: `${tagPrefix}${String(count).padStart(3, '0')}`,
      triageCategory: values.triageCategory,
      name: values.name,
      gender: values.gender,
      estimatedAge: values.estimatedAge,
      injuries: values.injuries,
      currentLocation: values.currentLocation,
      status: 'triage',
      arrivalTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      familyContacted: false,
    };
    setVictims([newVictim, ...victims]);
    setAddVictimModalVisible(false);
    form.resetFields();
    message.success('Da them nan nhan moi!');
  };

  const handleEndMCI = () => {
    Modal.confirm({
      title: 'Ket thuc su kien MCI?',
      content: 'Ban chac chan muon ket thuc su kien cap cuu tham hoa nay?',
      onOk: () => {
        if (mciEvent) {
          setMciEvent({
            ...mciEvent,
            status: 'ended',
            endedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          });
          message.success('Da ket thuc su kien MCI');
        }
      },
    });
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && mciEvent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Bao cao Cap cuu Tham hoa</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; color: #f5222d; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              th { background-color: #f0f0f0; }
              .header { text-align: center; margin-bottom: 20px; }
              .stats { display: flex; justify-content: space-around; margin: 20px 0; }
              .stat-box { text-align: center; padding: 10px; border: 1px solid #ddd; }
              .red { color: red; }
              .yellow { color: orange; }
              .green { color: green; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>BENH VIEN CAP CUU</h2>
              <h1>BAO CAO SU KIEN CAP CUU THAM HOA</h1>
            </div>

            <h3>Thong tin su kien</h3>
            <table>
              <tr><td><strong>Ma su kien:</strong></td><td>${mciEvent.id}</td></tr>
              <tr><td><strong>Cap do:</strong></td><td>${getCodeLabel(mciEvent.code)}</td></tr>
              <tr><td><strong>Mo ta:</strong></td><td>${mciEvent.description}</td></tr>
              <tr><td><strong>Dia diem:</strong></td><td>${mciEvent.location}</td></tr>
              <tr><td><strong>Thoi gian kich hoat:</strong></td><td>${mciEvent.activatedAt}</td></tr>
              <tr><td><strong>Nguoi kich hoat:</strong></td><td>${mciEvent.activatedBy}</td></tr>
            </table>

            <h3>Thong ke nan nhan</h3>
            <div class="stats">
              <div class="stat-box"><span class="red">DO: ${redCount}</span></div>
              <div class="stat-box"><span class="yellow">VANG: ${yellowCount}</span></div>
              <div class="stat-box"><span class="green">XANH: ${greenCount}</span></div>
              <div class="stat-box">DEN: ${blackCount}</div>
              <div class="stat-box"><strong>TONG: ${victims.length}</strong></div>
            </div>

            <h3>Danh sach nan nhan</h3>
            <table>
              <tr>
                <th>Tag</th>
                <th>Phan loai</th>
                <th>Ho ten</th>
                <th>Thuong tich</th>
                <th>Vi tri</th>
                <th>Trang thai</th>
              </tr>
              ${victims.map(v => `
                <tr>
                  <td>${v.tagNumber}</td>
                  <td>${getTriageLabel(v.triageCategory)}</td>
                  <td>${v.name || 'Chua xac dinh'}</td>
                  <td>${v.injuries}</td>
                  <td>${v.currentLocation}</td>
                  <td>${v.status}</td>
                </tr>
              `).join('')}
            </table>

            <p style="margin-top: 30px; text-align: right;">
              Ngay in: ${dayjs().format('DD/MM/YYYY HH:mm')}
            </p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <span>
          <AlertOutlined />
          Dashboard
        </span>
      ),
      children: (
        <div>
          {/* Triage Summary */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card style={{ backgroundColor: '#fff1f0', borderColor: '#ffa39e' }}>
                <Statistic
                  title={<span style={{ color: '#cf1322' }}>DO - Cap cuu ngay</span>}
                  value={redCount}
                  valueStyle={{ color: '#cf1322', fontSize: 48 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ backgroundColor: '#fffbe6', borderColor: '#ffe58f' }}>
                <Statistic
                  title={<span style={{ color: '#d48806' }}>VANG - Tri hoan duoc</span>}
                  value={yellowCount}
                  valueStyle={{ color: '#d48806', fontSize: 48 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Statistic
                  title={<span style={{ color: '#389e0d' }}>XANH - Nhe</span>}
                  value={greenCount}
                  valueStyle={{ color: '#389e0d', fontSize: 48 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ backgroundColor: '#f5f5f5', borderColor: '#d9d9d9' }}>
                <Statistic
                  title="DEN - Tu vong"
                  value={blackCount}
                  valueStyle={{ fontSize: 48 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Resources */}
          <Card title="Tai nguyen kha dung" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              {resources.slice(0, 4).map(r => (
                <Col span={6} key={r.id}>
                  <Card size="small">
                    <Statistic
                      title={r.name}
                      value={r.available}
                      suffix={`/ ${r.total}`}
                      valueStyle={{ color: r.available < 3 ? '#cf1322' : '#3f8600' }}
                    />
                    <Progress
                      percent={Math.round((r.available / r.total) * 100)}
                      status={r.available < 3 ? 'exception' : 'normal'}
                      size="small"
                    />
                    <Text type="secondary">Da phan bo: {r.reserved}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Timeline */}
          <Card title="Dien bien su kien">
            <Timeline
              items={[
                {
                  color: 'red',
                  children: (
                    <>
                      <Text strong>10:30 - Kich hoat CODE ORANGE</Text>
                      <br />
                      <Text type="secondary">Tai nan xe bus tren cao toc</Text>
                    </>
                  ),
                },
                {
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>10:32 - Huy dong nhan luc</Text>
                      <br />
                      <Text type="secondary">12 nhan vien duoc thong bao</Text>
                    </>
                  ),
                },
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>10:45 - Nan nhan dau tien den</Text>
                      <br />
                      <Text type="secondary">Tag R001 - Phan loai DO</Text>
                    </>
                  ),
                },
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>11:00 - Cap nhat</Text>
                      <br />
                      <Text type="secondary">Da tiep nhan 7 nan nhan</Text>
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'victims',
      label: (
        <span>
          <UserOutlined />
          Nan nhan ({victims.length})
        </span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddVictimModalVisible(true)}
            >
              Them nan nhan
            </Button>
            <Button icon={<ReloadOutlined />}>
              Lam moi
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrintReport}>
              In bao cao
            </Button>
          </Space>
          <Table
            columns={victimColumns}
            dataSource={victims}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            rowClassName={(record) => {
              if (record.triageCategory === 'red') return 'ant-table-row-red';
              return '';
            }}
          />
        </div>
      ),
    },
    {
      key: 'resources',
      label: (
        <span>
          <MedicineBoxOutlined />
          Tai nguyen
        </span>
      ),
      children: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Giuong & Phong">
                <List
                  dataSource={resources.filter(r => ['bed', 'icu', 'or'].includes(r.type))}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.name}
                        description={`Kha dung: ${item.available} / ${item.total}`}
                      />
                      <Progress
                        percent={Math.round((item.available / item.total) * 100)}
                        status={item.available < 3 ? 'exception' : 'normal'}
                        style={{ width: 100 }}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Mau & Thiet bi">
                <List
                  dataSource={resources.filter(r => ['blood', 'ventilator'].includes(r.type))}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.name}
                        description={`Kha dung: ${item.available} / ${item.total}`}
                      />
                      <Progress
                        percent={Math.round((item.available / item.total) * 100)}
                        status={item.available < 10 ? 'exception' : 'normal'}
                        style={{ width: 100 }}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'staff',
      label: (
        <span>
          <TeamOutlined />
          Nhan su ({staff.length})
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Tinh trang nhan su"
            description={`${staff.filter(s => s.status === 'arrived').length} nhan vien da co mat, ${staff.filter(s => s.status === 'notified').length} dang tren duong`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <List
            grid={{ gutter: 16, column: 3 }}
            dataSource={staff}
            renderItem={(item) => (
              <List.Item>
                <Card size="small">
                  <Card.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={item.name}
                    description={
                      <>
                        <Text>{item.role} - {item.department}</Text>
                        <br />
                        <Tag
                          color={
                            item.status === 'arrived' ? 'success' :
                            item.status === 'on_duty' ? 'processing' :
                            item.status === 'notified' ? 'warning' : 'default'
                          }
                        >
                          {item.status === 'arrived' ? 'Da co mat' :
                           item.status === 'on_duty' ? 'Dang truc' :
                           item.status === 'notified' ? 'Da thong bao' : 'Cho'}
                        </Tag>
                        <br />
                        <PhoneOutlined /> {item.phone}
                      </>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </div>
      ),
    },
    {
      key: 'triage',
      label: (
        <span>
          <AlertOutlined />
          Huong dan START
        </span>
      ),
      children: (
        <Card title="Quy trinh Phan loai START">
          <Steps
            direction="vertical"
            items={[
              {
                title: 'Buoc 1: Di lai duoc?',
                description: 'Co → XANH (Minor). Khong → Tiep tuc',
                status: 'process',
              },
              {
                title: 'Buoc 2: Tu tho?',
                description: 'Khong → Mo duong tho → Van khong tho → DEN (Tu vong)',
                status: 'process',
              },
              {
                title: 'Buoc 3: Nhip tho',
                description: '>30 lan/phut → DO (Immediate)',
                status: 'process',
              },
              {
                title: 'Buoc 4: Mach quay',
                description: 'Khong co mach quay → DO (Immediate)',
                status: 'process',
              },
              {
                title: 'Buoc 5: Lam theo lenh',
                description: 'Khong lam theo lenh don gian → DO. Co → VANG (Delayed)',
                status: 'process',
              },
            ]}
          />
          <Divider />
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#fff1f0' }}>
                <Title level={4} style={{ color: '#cf1322' }}>DO</Title>
                <Text>Cap cuu ngay lap tuc</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#fffbe6' }}>
                <Title level={4} style={{ color: '#d48806' }}>VANG</Title>
                <Text>Co the tri hoan 1-4h</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                <Title level={4} style={{ color: '#389e0d' }}>XANH</Title>
                <Text>Thuong tich nhe</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
                <Title level={4}>DEN</Title>
                <Text>Tu vong/Khong cuu</Text>
              </Card>
            </Col>
          </Row>
        </Card>
      ),
    },
  ];

  return (
    <div>
      {/* Header with MCI Status */}
      {mciEvent && mciEvent.status === 'active' ? (
        <Alert
          message={
            <Space>
              <SoundOutlined />
              <Text strong style={{ fontSize: 18 }}>
                {getCodeLabel(mciEvent.code)} - DANG HOAT DONG
              </Text>
            </Space>
          }
          description={
            <Row gutter={16}>
              <Col span={8}>
                <Text>Mo ta: {mciEvent.description}</Text>
              </Col>
              <Col span={8}>
                <Text>Dia diem: {mciEvent.location}</Text>
              </Col>
              <Col span={8}>
                <Text>Kich hoat: {mciEvent.activatedAt}</Text>
              </Col>
            </Row>
          }
          type="error"
          showIcon
          icon={<AlertOutlined />}
          action={
            <Space direction="vertical">
              <Button danger onClick={handleEndMCI}>
                Ket thuc su kien
              </Button>
              <Button onClick={handlePrintReport} icon={<PrinterOutlined />}>
                Bao cao
              </Button>
            </Space>
          }
          style={{ marginBottom: 24 }}
        />
      ) : (
        <Card style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3} style={{ margin: 0 }}>
                <AlertOutlined /> Cap cuu Tham hoa (MCI)
              </Title>
              <Text type="secondary">Khong co su kien MCI dang hoat dong</Text>
            </Col>
            <Col>
              <Button
                type="primary"
                danger
                size="large"
                icon={<BellOutlined />}
                onClick={() => setActivateModalVisible(true)}
              >
                KICH HOAT MCI
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* Main Content */}
      {mciEvent && mciEvent.status === 'active' && (
        <Card>
          <Tabs items={tabItems} />
        </Card>
      )}

      {/* Activate MCI Modal */}
      <Modal
        title={
          <Space>
            <AlertOutlined style={{ color: '#f5222d' }} />
            <span>Kich hoat Code Cap cuu Tham hoa</span>
          </Space>
        }
        open={activateModalVisible}
        onCancel={() => setActivateModalVisible(false)}
        onOk={() => form.submit()}
        okText="KICH HOAT"
        okButtonProps={{ danger: true }}
        width={600}
      >
        <Alert
          message="Canh bao"
          description="Kich hoat Code MCI se gui thong bao den tat ca nhan vien va khoi dong quy trinh cap cuu tham hoa."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={handleActivateMCI}>
          <Form.Item name="code" label="Cap do" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="yellow">
                <Tag color="yellow">CODE YELLOW</Tag> - 5-10 nan nhan
              </Select.Option>
              <Select.Option value="orange">
                <Tag color="orange">CODE ORANGE</Tag> - 10-50 nan nhan
              </Select.Option>
              <Select.Option value="red">
                <Tag color="red">CODE RED</Tag> - {'>'}50 nan nhan hoac CBRN
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Mo ta su kien" rules={[{ required: true }]}>
            <Input placeholder="VD: Tai nan giao thong, Hoa hoan..." />
          </Form.Item>
          <Form.Item name="location" label="Dia diem" rules={[{ required: true }]}>
            <Input placeholder="VD: Cao toc TP.HCM - Long Thanh" />
          </Form.Item>
          <Form.Item name="estimatedVictims" label="So nan nhan du kien">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Victim Modal */}
      <Modal
        title="Them nan nhan"
        open={addVictimModalVisible}
        onCancel={() => setAddVictimModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAddVictim}>
          <Form.Item
            name="triageCategory"
            label="Phan loai START"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="red">
                <Tag color="red">DO</Tag> - Cap cuu ngay
              </Select.Option>
              <Select.Option value="yellow">
                <Tag color="orange">VANG</Tag> - Tri hoan duoc
              </Select.Option>
              <Select.Option value="green">
                <Tag color="green">XANH</Tag> - Nhe
              </Select.Option>
              <Select.Option value="black">
                <Tag>DEN</Tag> - Tu vong
              </Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Ho ten (neu biet)">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gender" label="Gioi tinh">
                <Select>
                  <Select.Option value="male">Nam</Select.Option>
                  <Select.Option value="female">Nu</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="estimatedAge" label="Tuoi uoc tinh">
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="injuries" label="Mo ta thuong tich" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="currentLocation" label="Vi tri hien tai" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Phong mo 1">Phong mo 1</Select.Option>
              <Select.Option value="Phong mo 2">Phong mo 2</Select.Option>
              <Select.Option value="ICU">ICU</Select.Option>
              <Select.Option value="Khu dieu tri 1">Khu dieu tri 1</Select.Option>
              <Select.Option value="Khu dieu tri 2">Khu dieu tri 2</Select.Option>
              <Select.Option value="Khu cho">Khu cho</Select.Option>
              <Select.Option value="Nha xac">Nha xac</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Victim Detail Modal */}
      <Modal
        title="Chi tiet nan nhan"
        open={victimDetailModalVisible}
        onCancel={() => setVictimDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setVictimDetailModalVisible(false)}>
            Dong
          </Button>,
          <Button key="print" icon={<PrinterOutlined />}>
            In the
          </Button>,
        ]}
        width={700}
      >
        {selectedVictim && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Tag" span={1}>
              <Tag
                color={getTriageColor(selectedVictim.triageCategory)}
                style={{ fontSize: 16, fontWeight: 'bold' }}
              >
                {selectedVictim.tagNumber}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Phan loai" span={1}>
              <Badge
                color={getTriageColor(selectedVictim.triageCategory)}
                text={getTriageLabel(selectedVictim.triageCategory)}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Ho ten" span={1}>
              {selectedVictim.name || 'Chua xac dinh'}
            </Descriptions.Item>
            <Descriptions.Item label="Gioi tinh" span={1}>
              {selectedVictim.gender === 'male' ? 'Nam' : selectedVictim.gender === 'female' ? 'Nu' : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Tuoi uoc tinh" span={1}>
              {selectedVictim.estimatedAge || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Thoi gian den" span={1}>
              {selectedVictim.arrivalTime}
            </Descriptions.Item>
            <Descriptions.Item label="Thuong tich" span={2}>
              {selectedVictim.injuries}
            </Descriptions.Item>
            <Descriptions.Item label="Vi tri hien tai" span={1}>
              {selectedVictim.currentLocation}
            </Descriptions.Item>
            <Descriptions.Item label="Trang thai" span={1}>
              {getStatusTag(selectedVictim.status)}
            </Descriptions.Item>
            <Descriptions.Item label="Bac si phu trach" span={1}>
              {selectedVictim.assignedDoctor || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Lien lac gia dinh" span={1}>
              {selectedVictim.familyContacted ? (
                <Tag color="success">Da lien lac: {selectedVictim.familyPhone}</Tag>
              ) : (
                <Tag color="warning">Chua lien lac</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default EmergencyDisaster;
