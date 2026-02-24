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
  Timeline,
  Divider,
  message,
  Badge,
  Progress,
  InputNumber,
} from 'antd';
import {
  ToolOutlined,
  AlertOutlined,
  SettingOutlined,
  FileTextOutlined,
  PrinterOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Types
interface Equipment {
  id: string;
  code: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  department: string;
  location: string;
  purchaseDate: string;
  warrantyExpiry?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  status: 'active' | 'maintenance' | 'repair' | 'inactive' | 'disposed';
  riskClass: 'A' | 'B' | 'C' | 'D';
  value: number;
  runtime?: number; // hours
}

interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  maintenanceType: 'preventive' | 'corrective' | 'calibration';
  scheduledDate: string;
  completedDate?: string;
  technician: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  findings?: string;
  actions?: string;
  cost?: number;
  nextDueDate?: string;
}

interface RepairRequest {
  id: string;
  equipmentId: string;
  equipmentName: string;
  department: string;
  reportedBy: string;
  reportedDate: string;
  issueDescription: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'closed';
  assignedTo?: string;
  completedDate?: string;
  repairCost?: number;
}

// Mock data
const mockEquipment: Equipment[] = [
  {
    id: 'EQ001',
    code: 'CT-001',
    name: 'May CT Scanner 128 slice',
    category: 'CDHA',
    manufacturer: 'Siemens',
    model: 'SOMATOM go.Top',
    serialNumber: 'CT2023001',
    department: 'Chan doan hinh anh',
    location: 'Tang 2 - Phong CT',
    purchaseDate: '2021-06-15',
    warrantyExpiry: '2024-06-15',
    lastMaintenanceDate: '2024-01-10',
    nextMaintenanceDate: '2024-04-10',
    lastCalibrationDate: '2024-01-15',
    nextCalibrationDate: '2025-01-15',
    status: 'active',
    riskClass: 'A',
    value: 15000000000,
    runtime: 12500,
  },
  {
    id: 'EQ002',
    code: 'MRI-001',
    name: 'May MRI 1.5T',
    category: 'CDHA',
    manufacturer: 'GE Healthcare',
    model: 'SIGNA Explorer',
    serialNumber: 'MRI2022001',
    department: 'Chan doan hinh anh',
    location: 'Tang 2 - Phong MRI',
    purchaseDate: '2020-03-20',
    lastMaintenanceDate: '2024-02-01',
    nextMaintenanceDate: '2024-05-01',
    status: 'active',
    riskClass: 'A',
    value: 25000000000,
    runtime: 18200,
  },
  {
    id: 'EQ003',
    code: 'XR-002',
    name: 'May X-quang ky thuat so',
    category: 'CDHA',
    manufacturer: 'Carestream',
    model: 'DRX-Evolution Plus',
    serialNumber: 'XR2023002',
    department: 'Chan doan hinh anh',
    location: 'Tang 1 - Phong Xquang',
    purchaseDate: '2023-01-10',
    nextCalibrationDate: '2024-02-15',
    status: 'maintenance',
    riskClass: 'B',
    value: 2500000000,
  },
  {
    id: 'EQ004',
    code: 'VENT-005',
    name: 'May tho cao cap',
    category: 'Ho hap',
    manufacturer: 'Hamilton Medical',
    model: 'Hamilton-C6',
    serialNumber: 'VENT2022005',
    department: 'ICU',
    location: 'ICU - Giuong 5',
    purchaseDate: '2022-08-15',
    lastMaintenanceDate: '2024-01-20',
    nextMaintenanceDate: '2024-03-20',
    status: 'active',
    riskClass: 'A',
    value: 1200000000,
    runtime: 8500,
  },
];

const mockMaintenanceRecords: MaintenanceRecord[] = [
  {
    id: 'MR001',
    equipmentId: 'EQ001',
    equipmentName: 'May CT Scanner 128 slice',
    maintenanceType: 'preventive',
    scheduledDate: '2024-04-10',
    technician: 'Siemens VN',
    status: 'scheduled',
  },
  {
    id: 'MR002',
    equipmentId: 'EQ003',
    equipmentName: 'May X-quang ky thuat so',
    maintenanceType: 'calibration',
    scheduledDate: '2024-02-15',
    technician: 'Carestream VN',
    status: 'overdue',
  },
  {
    id: 'MR003',
    equipmentId: 'EQ002',
    equipmentName: 'May MRI 1.5T',
    maintenanceType: 'preventive',
    scheduledDate: '2024-02-01',
    completedDate: '2024-02-01',
    technician: 'GE Healthcare VN',
    status: 'completed',
    findings: 'Hoat dong binh thuong',
    actions: 'Ve sinh, kiem tra dau',
    cost: 15000000,
    nextDueDate: '2024-05-01',
  },
];

const mockRepairRequests: RepairRequest[] = [
  {
    id: 'RR001',
    equipmentId: 'EQ003',
    equipmentName: 'May X-quang ky thuat so',
    department: 'Chan doan hinh anh',
    reportedBy: 'KTV. Nguyen Van A',
    reportedDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    issueDescription: 'Man hinh bi nhoe, khong hien thi ro anh',
    priority: 'high',
    status: 'assigned',
    assignedTo: 'Carestream VN',
  },
];

const EQUIPMENT_CATEGORIES = [
  { value: 'CDHA', label: 'Chan doan hinh anh' },
  { value: 'XN', label: 'Xet nghiem' },
  { value: 'PTTT', label: 'Phau thuat' },
  { value: 'Ho hap', label: 'Ho hap' },
  { value: 'Tim mach', label: 'Tim mach' },
  { value: 'Khac', label: 'Khac' },
];

const Equipment: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>(mockEquipment);
  const [maintenanceRecords] = useState<MaintenanceRecord[]>(mockMaintenanceRecords);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>(mockRepairRequests);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [repairForm] = Form.useForm();
  const [maintenanceForm] = Form.useForm();

  // Statistics
  const activeEquipment = equipment.filter((e) => e.status === 'active').length;
  const maintenanceDue = maintenanceRecords.filter(
    (m) => m.status === 'scheduled' || m.status === 'overdue'
  ).length;
  const pendingRepairs = repairRequests.filter(
    (r) => r.status !== 'completed' && r.status !== 'closed'
  ).length;

  const getStatusTag = (status: Equipment['status']) => {
    const config = {
      active: { color: 'green', text: 'Hoat dong' },
      maintenance: { color: 'blue', text: 'Bao tri' },
      repair: { color: 'orange', text: 'Sua chua' },
      inactive: { color: 'default', text: 'Tam dung' },
      disposed: { color: 'red', text: 'Thanh ly' },
    };
    const c = config[status];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getRiskClassTag = (riskClass: Equipment['riskClass']) => {
    const config = {
      A: { color: 'red', text: 'Loai A' },
      B: { color: 'orange', text: 'Loai B' },
      C: { color: 'blue', text: 'Loai C' },
      D: { color: 'default', text: 'Loai D' },
    };
    const c = config[riskClass];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleSubmitRepair = (values: any) => {
    if (!selectedEquipment) return;

    const newRequest: RepairRequest = {
      id: `RR${Date.now()}`,
      equipmentId: selectedEquipment.id,
      equipmentName: selectedEquipment.name,
      department: selectedEquipment.department,
      reportedBy: values.reportedBy,
      reportedDate: dayjs().format('YYYY-MM-DD'),
      issueDescription: values.issueDescription,
      priority: values.priority,
      status: 'pending',
    };

    setRepairRequests((prev) => [...prev, newRequest]);
    setEquipment((prev) =>
      prev.map((e) =>
        e.id === selectedEquipment.id ? { ...e, status: 'repair' } : e
      )
    );

    setIsRepairModalOpen(false);
    repairForm.resetFields();
    message.success('Da gui yeu cau sua chua');
  };

  const handleScheduleMaintenance = (values: any) => {
    message.success('Da len lich bao tri');
    setIsMaintenanceModalOpen(false);
    maintenanceForm.resetFields();
  };

  const executePrintEquipmentCard = () => {
    if (!selectedEquipment) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phieu thiet bi</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; width: 30%; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>BENH VIEN DA KHOA</strong><br/>
          Phong Vat tu - Thiet bi y te
        </div>

        <div class="title">PHIEU LY LICH THIET BI Y TE</div>

        <table>
          <tr><th>Ma thiet bi</th><td>${selectedEquipment.code}</td></tr>
          <tr><th>Ten thiet bi</th><td>${selectedEquipment.name}</td></tr>
          <tr><th>Hang san xuat</th><td>${selectedEquipment.manufacturer}</td></tr>
          <tr><th>Model</th><td>${selectedEquipment.model}</td></tr>
          <tr><th>So seri</th><td>${selectedEquipment.serialNumber}</td></tr>
          <tr><th>Khoa/Phong</th><td>${selectedEquipment.department}</td></tr>
          <tr><th>Vi tri</th><td>${selectedEquipment.location}</td></tr>
          <tr><th>Ngay mua</th><td>${selectedEquipment.purchaseDate}</td></tr>
          <tr><th>Han bao hanh</th><td>${selectedEquipment.warrantyExpiry || 'Het bao hanh'}</td></tr>
          <tr><th>Nhom nguy co</th><td>${selectedEquipment.riskClass}</td></tr>
          <tr><th>Nguyen gia</th><td>${selectedEquipment.value.toLocaleString('vi-VN')} VND</td></tr>
          <tr><th>Trang thai</th><td>${selectedEquipment.status}</td></tr>
        </table>

        <h3>Lich su bao tri</h3>
        <table>
          <tr>
            <th>Ngay</th>
            <th>Loai</th>
            <th>Don vi thuc hien</th>
            <th>Ket qua</th>
          </tr>
          <tr>
            <td>${selectedEquipment.lastMaintenanceDate || '-'}</td>
            <td>Bao tri dinh ky</td>
            <td>-</td>
            <td>Dat</td>
          </tr>
        </table>

        <div style="margin-top: 50px; text-align: right;">
          <p>Ngay ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Truong phong VTYT</strong></p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const equipmentColumns: ColumnsType<Equipment> = [
    {
      title: 'Ma TB',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: 'Ten thiet bi',
      key: 'name',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary">{record.manufacturer} - {record.model}</Text>
        </Space>
      ),
    },
    {
      title: 'Khoa/Phong',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Nhom',
      dataIndex: 'riskClass',
      key: 'riskClass',
      width: 80,
      render: (riskClass) => getRiskClassTag(riskClass),
    },
    {
      title: 'Bao tri tiep',
      dataIndex: 'nextMaintenanceDate',
      key: 'nextMaintenanceDate',
      width: 120,
      render: (date) => {
        if (!date) return '-';
        const daysUntil = dayjs(date).diff(dayjs(), 'day');
        const color = daysUntil < 0 ? 'red' : daysUntil < 30 ? 'orange' : 'green';
        return <Tag color={color}>{date}</Tag>;
      },
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedEquipment(record);
              setIsDetailModalOpen(true);
            }}
          >
            Chi tiet
          </Button>
          <Button
            size="small"
            danger
            onClick={() => {
              setSelectedEquipment(record);
              setIsRepairModalOpen(true);
            }}
          >
            Bao hong
          </Button>
        </Space>
      ),
    },
  ];

  const maintenanceColumns: ColumnsType<MaintenanceRecord> = [
    {
      title: 'Thiet bi',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
    },
    {
      title: 'Loai',
      dataIndex: 'maintenanceType',
      key: 'maintenanceType',
      render: (type) => {
        const labels: Record<string, string> = {
          preventive: 'Phong ngua',
          corrective: 'Sua chua',
          calibration: 'Kiem dinh',
        };
        return labels[type];
      },
    },
    {
      title: 'Ngay len lich',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
    },
    {
      title: 'Don vi',
      dataIndex: 'technician',
      key: 'technician',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config: Record<string, { color: string; text: string }> = {
          scheduled: { color: 'blue', text: 'Da len lich' },
          in_progress: { color: 'orange', text: 'Dang thuc hien' },
          completed: { color: 'green', text: 'Hoan thanh' },
          overdue: { color: 'red', text: 'Qua han' },
        };
        const c = config[status];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  const repairColumns: ColumnsType<RepairRequest> = [
    {
      title: 'Thiet bi',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
    },
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Mo ta loi',
      dataIndex: 'issueDescription',
      key: 'issueDescription',
      ellipsis: true,
    },
    {
      title: 'Uu tien',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => {
        const config: Record<string, { color: string; text: string }> = {
          low: { color: 'default', text: 'Thap' },
          medium: { color: 'blue', text: 'Trung binh' },
          high: { color: 'orange', text: 'Cao' },
          critical: { color: 'red', text: 'Khan cap' },
        };
        const c = config[priority];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: 'Cho xu ly' },
          assigned: { color: 'blue', text: 'Da phan cong' },
          in_progress: { color: 'cyan', text: 'Dang sua' },
          completed: { color: 'green', text: 'Hoan thanh' },
          closed: { color: 'default', text: 'Dong' },
        };
        const c = config[status];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Title level={4}>Quan ly trang thiet bi y te</Title>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Thiet bi hoat dong"
              value={activeEquipment}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a' } }}
              suffix={`/ ${equipment.length}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Can bao tri"
              value={maintenanceDue}
              prefix={<CalendarOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Yeu cau sua chua"
              value={pendingRepairs}
              prefix={<ToolOutlined style={{ color: '#ff4d4f' }} />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            Them thiet bi
          </Button>
        }
      >
        <Tabs
          defaultActiveKey="equipment"
          items={[
            {
              key: 'equipment',
              label: 'Danh sach thiet bi',
              children: (
                <Table
                  columns={equipmentColumns}
                  dataSource={equipment}
                  rowKey="id"
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      setSelectedEquipment(record);
                      setIsDetailModalOpen(true);
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
            {
              key: 'maintenance',
              label: (
                <Badge count={maintenanceDue} offset={[10, 0]}>
                  Lich bao tri
                </Badge>
              ),
              children: (
                <>
                  <Button
                    type="primary"
                    icon={<CalendarOutlined />}
                    style={{ marginBottom: 16 }}
                    onClick={() => setIsMaintenanceModalOpen(true)}
                  >
                    Len lich bao tri
                  </Button>
                  <Table
                    columns={maintenanceColumns}
                    dataSource={maintenanceRecords}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        const eq = equipment.find(e => e.id === record.equipmentId);
                        if (eq) {
                          setSelectedEquipment(eq);
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
              key: 'repairs',
              label: (
                <Badge count={pendingRepairs} offset={[10, 0]}>
                  Yeu cau sua chua
                </Badge>
              ),
              children: (
                <Table
                  columns={repairColumns}
                  dataSource={repairRequests}
                  rowKey="id"
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      const eq = equipment.find(e => e.id === record.equipmentId);
                      if (eq) {
                        setSelectedEquipment(eq);
                        setIsDetailModalOpen(true);
                      }
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
            {
              key: 'calibration',
              label: 'Kiem dinh',
              children: (
                <div>
                  <Title level={5}>Quy dinh kiem dinh</Title>
                  <ul>
                    <li><strong>Nhom A:</strong> Kiem dinh moi 1 nam (X-quang, CT, MRI, may gia toc)</li>
                    <li><strong>Nhom B:</strong> Kiem dinh moi 2 nam</li>
                    <li><strong>Nhom C:</strong> Kiem dinh khi can</li>
                  </ul>
                  <Divider />
                  <Table
                    columns={[
                      { title: 'Thiet bi', dataIndex: 'name', key: 'name' },
                      { title: 'Nhom', dataIndex: 'riskClass', key: 'riskClass', render: (c) => getRiskClassTag(c) },
                      { title: 'Kiem dinh gan nhat', dataIndex: 'lastCalibrationDate', key: 'lastCalibrationDate' },
                      { title: 'Kiem dinh tiep theo', dataIndex: 'nextCalibrationDate', key: 'nextCalibrationDate' },
                    ]}
                    dataSource={equipment.filter((e) => e.riskClass === 'A' || e.riskClass === 'B')}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedEquipment(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chi tiet thiet bi"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={executePrintEquipmentCard}>
            In phieu
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Dong
          </Button>,
        ]}
        width={700}
      >
        {selectedEquipment && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Ma TB">{selectedEquipment.code}</Descriptions.Item>
              <Descriptions.Item label="Trang thai">
                {getStatusTag(selectedEquipment.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Ten" span={2}>
                {selectedEquipment.name}
              </Descriptions.Item>
              <Descriptions.Item label="Hang SX">{selectedEquipment.manufacturer}</Descriptions.Item>
              <Descriptions.Item label="Model">{selectedEquipment.model}</Descriptions.Item>
              <Descriptions.Item label="Serial">{selectedEquipment.serialNumber}</Descriptions.Item>
              <Descriptions.Item label="Nhom">{getRiskClassTag(selectedEquipment.riskClass)}</Descriptions.Item>
              <Descriptions.Item label="Khoa/Phong">{selectedEquipment.department}</Descriptions.Item>
              <Descriptions.Item label="Vi tri">{selectedEquipment.location}</Descriptions.Item>
              <Descriptions.Item label="Ngay mua">{selectedEquipment.purchaseDate}</Descriptions.Item>
              <Descriptions.Item label="Bao hanh">{selectedEquipment.warrantyExpiry || 'Het'}</Descriptions.Item>
              <Descriptions.Item label="Nguyen gia" span={2}>
                {selectedEquipment.value.toLocaleString('vi-VN')} VND
              </Descriptions.Item>
            </Descriptions>

            <Divider>Thong tin bao tri</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="Bao tri">
                  <p><strong>Lan cuoi:</strong> {selectedEquipment.lastMaintenanceDate || '-'}</p>
                  <p><strong>Lan tiep:</strong> {selectedEquipment.nextMaintenanceDate || '-'}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="Kiem dinh">
                  <p><strong>Lan cuoi:</strong> {selectedEquipment.lastCalibrationDate || '-'}</p>
                  <p><strong>Lan tiep:</strong> {selectedEquipment.nextCalibrationDate || '-'}</p>
                </Card>
              </Col>
            </Row>

            {selectedEquipment.runtime && (
              <Card size="small" title="Thoi gian van hanh" style={{ marginTop: 16 }}>
                <Statistic
                  value={selectedEquipment.runtime}
                  suffix="gio"
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            )}
          </>
        )}
      </Modal>

      {/* Repair Modal */}
      <Modal
        title="Bao cao hong"
        open={isRepairModalOpen}
        onCancel={() => setIsRepairModalOpen(false)}
        onOk={() => repairForm.submit()}
      >
        <Form form={repairForm} layout="vertical" onFinish={handleSubmitRepair}>
          <Form.Item label="Thiet bi">
            <Input value={selectedEquipment?.name} disabled />
          </Form.Item>
          <Form.Item name="reportedBy" label="Nguoi bao cao" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="issueDescription" label="Mo ta loi" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="priority" label="Muc do uu tien" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="low">Thap</Select.Option>
              <Select.Option value="medium">Trung binh</Select.Option>
              <Select.Option value="high">Cao</Select.Option>
              <Select.Option value="critical">Khan cap</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Maintenance Modal */}
      <Modal
        title="Len lich bao tri"
        open={isMaintenanceModalOpen}
        onCancel={() => setIsMaintenanceModalOpen(false)}
        onOk={() => maintenanceForm.submit()}
      >
        <Form form={maintenanceForm} layout="vertical" onFinish={handleScheduleMaintenance}>
          <Form.Item name="equipmentId" label="Thiet bi" rules={[{ required: true }]}>
            <Select>
              {equipment.map((e) => (
                <Select.Option key={e.id} value={e.id}>
                  {e.code} - {e.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="maintenanceType" label="Loai bao tri" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="preventive">Bao tri phong ngua</Select.Option>
              <Select.Option value="calibration">Kiem dinh</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="scheduledDate" label="Ngay du kien" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="technician" label="Don vi thuc hien">
            <Input placeholder="VD: Siemens VN, GE Healthcare" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Equipment;
