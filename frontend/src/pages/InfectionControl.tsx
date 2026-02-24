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
  Alert,
  Badge,
  Checkbox,
  Progress,
} from 'antd';
import {
  BugOutlined,
  AlertOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  PrinterOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Types
interface InfectionCase {
  id: string;
  patientId: string;
  patientName: string;
  department: string;
  bedNumber: string;
  infectionType: 'ssi' | 'vap' | 'cauti' | 'clabsi' | 'other';
  infectionSite: string;
  organism?: string;
  detectionDate: string;
  onsetDate?: string;
  reportDate: string;
  status: 'suspected' | 'confirmed' | 'resolved' | 'dismissed';
  isolationType?: 'contact' | 'droplet' | 'airborne' | 'none';
  investigationStatus: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

interface SurveillanceData {
  id: string;
  department: string;
  month: string;
  totalPatients: number;
  infectionCount: number;
  catheterDays?: number;
  ventilatorDays?: number;
  centralLineDays?: number;
  ssiCount: number;
  vapCount: number;
  cautiCount: number;
  clabsiCount: number;
}

interface ComplianceAudit {
  id: string;
  department: string;
  auditDate: string;
  auditor: string;
  handHygieneRate: number;
  ppeComplianceRate: number;
  isolationComplianceRate: number;
  overallScore: number;
  findings?: string;
}

// Mock data
const mockCases: InfectionCase[] = [
  {
    id: 'IC001',
    patientId: 'P001',
    patientName: 'Nguyen Van A',
    department: 'Ngoai khoa',
    bedNumber: 'B-301',
    infectionType: 'ssi',
    infectionSite: 'Vet mo bung',
    organism: 'Staphylococcus aureus',
    detectionDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    onsetDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    reportDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    status: 'confirmed',
    isolationType: 'contact',
    investigationStatus: 'completed',
    notes: 'NKBV vet mo ngay thu 5 sau phau thuat',
  },
  {
    id: 'IC002',
    patientId: 'P002',
    patientName: 'Tran Thi B',
    department: 'ICU',
    bedNumber: 'ICU-05',
    infectionType: 'vap',
    infectionSite: 'Phoi',
    organism: 'Pseudomonas aeruginosa',
    detectionDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    reportDate: dayjs().format('YYYY-MM-DD'),
    status: 'suspected',
    isolationType: 'contact',
    investigationStatus: 'in_progress',
    notes: 'Tho may ngay thu 7, sot + dom mu',
  },
  {
    id: 'IC003',
    patientId: 'P003',
    patientName: 'Le Van C',
    department: 'Noi khoa',
    bedNumber: 'A-201',
    infectionType: 'cauti',
    infectionSite: 'Tiet nieu',
    detectionDate: dayjs().format('YYYY-MM-DD'),
    reportDate: dayjs().format('YYYY-MM-DD'),
    status: 'suspected',
    investigationStatus: 'pending',
    notes: 'Dat sonde ngay thu 5, tieu duc + sot',
  },
];

const mockSurveillance: SurveillanceData[] = [
  {
    id: 'SV001',
    department: 'ICU',
    month: '2024-01',
    totalPatients: 45,
    infectionCount: 3,
    ventilatorDays: 280,
    centralLineDays: 320,
    catheterDays: 350,
    ssiCount: 0,
    vapCount: 2,
    cautiCount: 1,
    clabsiCount: 0,
  },
  {
    id: 'SV002',
    department: 'Ngoai khoa',
    month: '2024-01',
    totalPatients: 120,
    infectionCount: 4,
    catheterDays: 450,
    ssiCount: 3,
    vapCount: 0,
    cautiCount: 1,
    clabsiCount: 0,
  },
];

const mockAudits: ComplianceAudit[] = [
  {
    id: 'AU001',
    department: 'ICU',
    auditDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    auditor: 'BS. Nguyen Van X',
    handHygieneRate: 85,
    ppeComplianceRate: 92,
    isolationComplianceRate: 88,
    overallScore: 88,
    findings: 'Can cai thien ve sinh tay truoc khi tiep xuc benh nhan',
  },
  {
    id: 'AU002',
    department: 'Ngoai khoa',
    auditDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    auditor: 'DD. Tran Thi Y',
    handHygieneRate: 78,
    ppeComplianceRate: 85,
    isolationComplianceRate: 90,
    overallScore: 84,
  },
];

const INFECTION_TYPES = [
  { value: 'ssi', label: 'SSI - Nhiem khuan vet mo' },
  { value: 'vap', label: 'VAP - Viem phoi tho may' },
  { value: 'cauti', label: 'CAUTI - NK tiet nieu do sonde' },
  { value: 'clabsi', label: 'CLABSI - NK huyet do catheter' },
  { value: 'other', label: 'Khac' },
];

const ISOLATION_TYPES = [
  { value: 'contact', label: 'Cach ly tiep xuc' },
  { value: 'droplet', label: 'Cach ly giot ban' },
  { value: 'airborne', label: 'Cach ly khong khi' },
  { value: 'none', label: 'Khong can cach ly' },
];

const InfectionControl: React.FC = () => {
  const [cases, setCases] = useState<InfectionCase[]>(mockCases);
  const [selectedCase, setSelectedCase] = useState<InfectionCase | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [reportForm] = Form.useForm();
  const [auditForm] = Form.useForm();

  // Statistics
  const activeCases = cases.filter((c) => c.status !== 'resolved' && c.status !== 'dismissed');
  const confirmedCases = cases.filter((c) => c.status === 'confirmed');
  const pendingInvestigation = cases.filter((c) => c.investigationStatus === 'pending');

  const getInfectionTypeTag = (type: InfectionCase['infectionType']) => {
    const config = {
      ssi: { color: 'red', text: 'SSI' },
      vap: { color: 'orange', text: 'VAP' },
      cauti: { color: 'purple', text: 'CAUTI' },
      clabsi: { color: 'volcano', text: 'CLABSI' },
      other: { color: 'default', text: 'Khac' },
    };
    const c = config[type];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getStatusTag = (status: InfectionCase['status']) => {
    const config = {
      suspected: { color: 'orange', text: 'Nghi ngo' },
      confirmed: { color: 'red', text: 'Xac nhan' },
      resolved: { color: 'green', text: 'Da khoi' },
      dismissed: { color: 'default', text: 'Loai tru' },
    };
    const c = config[status];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getIsolationTag = (type?: InfectionCase['isolationType']) => {
    if (!type || type === 'none') return null;
    const config = {
      contact: { color: 'yellow', text: 'Tiep xuc' },
      droplet: { color: 'blue', text: 'Giot ban' },
      airborne: { color: 'purple', text: 'Khong khi' },
    };
    const c = config[type as keyof typeof config];
    return (
      <Tag color={c.color} icon={<SafetyOutlined />}>
        {c.text}
      </Tag>
    );
  };

  const handleReportCase = (values: any) => {
    const newCase: InfectionCase = {
      id: `IC${Date.now()}`,
      patientId: values.patientId,
      patientName: values.patientName,
      department: values.department,
      bedNumber: values.bedNumber,
      infectionType: values.infectionType,
      infectionSite: values.infectionSite,
      organism: values.organism,
      detectionDate: values.detectionDate.format('YYYY-MM-DD'),
      onsetDate: values.onsetDate?.format('YYYY-MM-DD'),
      reportDate: dayjs().format('YYYY-MM-DD'),
      status: 'suspected',
      isolationType: values.isolationType,
      investigationStatus: 'pending',
      notes: values.notes,
    };

    setCases((prev) => [...prev, newCase]);
    setIsReportModalOpen(false);
    reportForm.resetFields();
    message.success('Da bao cao ca nhiem khuan');
  };

  const handleUpdateInvestigation = (values: any) => {
    if (!selectedCase) return;

    setCases((prev) =>
      prev.map((c) =>
        c.id === selectedCase.id
          ? {
              ...c,
              status: values.status,
              organism: values.organism,
              isolationType: values.isolationType,
              investigationStatus: values.investigationStatus,
              notes: values.notes,
            }
          : c
      )
    );

    setIsInvestigationModalOpen(false);
    message.success('Da cap nhat ket qua dieu tra');
  };

  const handleCreateAudit = (values: any) => {
    message.success('Da luu ket qua kiem tra tuan thu');
    setIsAuditModalOpen(false);
    auditForm.resetFields();
  };

  const executePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bao cao KSNK</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>BENH VIEN DA KHOA</strong><br/>
          Khoa Kiem soat nhiem khuan
        </div>

        <div class="title">BAO CAO NHIEM KHUAN BENH VIEN</div>
        <p style="text-align: center;">Thang ${dayjs().format('MM/YYYY')}</p>

        <h3>1. Tong hop ca nhiem khuan</h3>
        <table>
          <thead>
            <tr>
              <th>Loai NK</th>
              <th>So ca</th>
              <th>Ty le</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SSI - Nhiem khuan vet mo</td>
              <td>${cases.filter((c) => c.infectionType === 'ssi').length}</td>
              <td>-</td>
            </tr>
            <tr>
              <td>VAP - Viem phoi tho may</td>
              <td>${cases.filter((c) => c.infectionType === 'vap').length}</td>
              <td>-</td>
            </tr>
            <tr>
              <td>CAUTI - NK tiet nieu</td>
              <td>${cases.filter((c) => c.infectionType === 'cauti').length}</td>
              <td>-</td>
            </tr>
            <tr>
              <td>CLABSI - NK huyet</td>
              <td>${cases.filter((c) => c.infectionType === 'clabsi').length}</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>

        <h3>2. Chi tiet ca nhiem khuan</h3>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Benh nhan</th>
              <th>Khoa</th>
              <th>Loai NK</th>
              <th>Trang thai</th>
            </tr>
          </thead>
          <tbody>
            ${cases.map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${c.patientName}</td>
                <td>${c.department}</td>
                <td>${c.infectionType.toUpperCase()}</td>
                <td>${c.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 50px; text-align: right;">
          <p>Ngay ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Truong khoa KSNK</strong></p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const caseColumns: ColumnsType<InfectionCase> = [
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">
            {record.department} - {record.bedNumber}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Loai NK',
      dataIndex: 'infectionType',
      key: 'infectionType',
      width: 100,
      render: (type) => getInfectionTypeTag(type),
    },
    {
      title: 'Vi tri',
      dataIndex: 'infectionSite',
      key: 'infectionSite',
    },
    {
      title: 'Vi khuan',
      dataIndex: 'organism',
      key: 'organism',
      render: (text) => text || <Text type="secondary">Chua xac dinh</Text>,
    },
    {
      title: 'Ngay phat hien',
      dataIndex: 'detectionDate',
      key: 'detectionDate',
      width: 120,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Cach ly',
      key: 'isolation',
      width: 100,
      render: (_, record) => getIsolationTag(record.isolationType),
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedCase(record);
              setIsInvestigationModalOpen(true);
            }}
          >
            Chi tiet
          </Button>
        </Space>
      ),
    },
  ];

  const auditColumns: ColumnsType<ComplianceAudit> = [
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Ngay',
      dataIndex: 'auditDate',
      key: 'auditDate',
    },
    {
      title: 'Nguoi kiem tra',
      dataIndex: 'auditor',
      key: 'auditor',
    },
    {
      title: 'Ve sinh tay',
      dataIndex: 'handHygieneRate',
      key: 'handHygieneRate',
      render: (value) => (
        <Progress
          percent={value}
          size="small"
          status={value >= 80 ? 'success' : value >= 60 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: 'PPE',
      dataIndex: 'ppeComplianceRate',
      key: 'ppeComplianceRate',
      render: (value) => (
        <Progress
          percent={value}
          size="small"
          status={value >= 80 ? 'success' : value >= 60 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: 'Diem tong',
      dataIndex: 'overallScore',
      key: 'overallScore',
      render: (value) => (
        <Tag color={value >= 80 ? 'green' : value >= 60 ? 'orange' : 'red'}>
          {value}%
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Kiem soat nhiem khuan</Title>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Ca dang theo doi"
              value={activeCases.length}
              prefix={<BugOutlined style={{ color: '#ff4d4f' }} />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Da xac nhan"
              value={confirmedCases.length}
              prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Cho dieu tra"
              value={pendingInvestigation.length}
              prefix={<AlertOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {confirmedCases.length > 0 && (
        <Alert
          title="Canh bao NKBV"
          description={`Hien co ${confirmedCases.length} ca nhiem khuan benh vien da xac nhan can theo doi`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Main Content */}
      <Card
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={executePrintReport}>
              In bao cao
            </Button>
            <Button
              type="primary"
              danger
              icon={<AlertOutlined />}
              onClick={() => setIsReportModalOpen(true)}
            >
              Bao cao ca NK
            </Button>
          </Space>
        }
      >
        <Tabs
          defaultActiveKey="cases"
          items={[
            {
              key: 'cases',
              label: (
                <Badge count={activeCases.length} offset={[10, 0]}>
                  Ca nhiem khuan
                </Badge>
              ),
              children: (
                <Table
                  columns={caseColumns}
                  dataSource={cases}
                  rowKey="id"
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      setSelectedCase(record);
                      setIsInvestigationModalOpen(true);
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
            {
              key: 'surveillance',
              label: 'Giam sat thuong quy',
              children: (
                <>
                  <Alert
                    title="Tieu chi giam sat theo CDC"
                    description="SSI: Theo doi 30 ngay (90 ngay voi implant) | VAP: Tho may > 48h | CAUTI: Sonde > 48h | CLABSI: Catheter TM trung tam > 48h"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Table
                    dataSource={mockSurveillance}
                    columns={[
                      { title: 'Khoa', dataIndex: 'department', key: 'department' },
                      { title: 'Thang', dataIndex: 'month', key: 'month' },
                      { title: 'Tong BN', dataIndex: 'totalPatients', key: 'totalPatients' },
                      { title: 'Ca NK', dataIndex: 'infectionCount', key: 'infectionCount' },
                      {
                        title: 'Ty le (%)',
                        key: 'rate',
                        render: (_, record) =>
                          ((record.infectionCount / record.totalPatients) * 100).toFixed(2),
                      },
                    ]}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiết giám sát - ${record.department}`,
                          width: 500,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Khoa">{record.department}</Descriptions.Item>
                              <Descriptions.Item label="Tháng">{record.month}</Descriptions.Item>
                              <Descriptions.Item label="Tổng BN">{record.totalPatients}</Descriptions.Item>
                              <Descriptions.Item label="Ca nhiễm khuẩn">{record.infectionCount}</Descriptions.Item>
                              <Descriptions.Item label="Tỷ lệ">
                                {((record.infectionCount / record.totalPatients) * 100).toFixed(2)}%
                              </Descriptions.Item>
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
              key: 'compliance',
              label: 'Kiem tra tuan thu',
              children: (
                <>
                  <Button
                    type="primary"
                    style={{ marginBottom: 16 }}
                    onClick={() => setIsAuditModalOpen(true)}
                  >
                    Them kiem tra moi
                  </Button>
                  <Table
                    columns={auditColumns}
                    dataSource={mockAudits}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: 'Chi tiết kiểm tra tuân thủ',
                          width: 500,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Khoa">{record.department}</Descriptions.Item>
                              <Descriptions.Item label="Ngày kiểm tra">{record.auditDate}</Descriptions.Item>
                              <Descriptions.Item label="Người kiểm tra">{record.auditorName}</Descriptions.Item>
                              <Descriptions.Item label="Điểm">{record.score}</Descriptions.Item>
                              <Descriptions.Item label="Kết quả">{record.result}</Descriptions.Item>
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
              key: 'isolation',
              label: 'Huong dan cach ly',
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card
                      title={
                        <span>
                          <Tag color="yellow">Tiep xuc</Tag> Contact Isolation
                        </span>
                      }
                    >
                      <p><strong>Chi dinh:</strong></p>
                      <ul>
                        <li>MDRO (VRE, MRSA, CRE)</li>
                        <li>Clostridium difficile</li>
                        <li>Nhiem khuan da</li>
                      </ul>
                      <p><strong>Bien phap:</strong></p>
                      <ul>
                        <li>Phong rieng hoac cohort</li>
                        <li>Gang tay + Ao choang</li>
                        <li>Dung cu rieng</li>
                      </ul>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      title={
                        <span>
                          <Tag color="blue">Giot ban</Tag> Droplet Isolation
                        </span>
                      }
                    >
                      <p><strong>Chi dinh:</strong></p>
                      <ul>
                        <li>Cum</li>
                        <li>RSV</li>
                        <li>Ho ga</li>
                      </ul>
                      <p><strong>Bien phap:</strong></p>
                      <ul>
                        <li>Phong rieng</li>
                        <li>Khau trang y te</li>
                        <li>Khoang cach 1-2m</li>
                      </ul>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      title={
                        <span>
                          <Tag color="purple">Khong khi</Tag> Airborne Isolation
                        </span>
                      }
                    >
                      <p><strong>Chi dinh:</strong></p>
                      <ul>
                        <li>Lao phoi</li>
                        <li>Soi</li>
                        <li>COVID-19</li>
                        <li>Thuy dau</li>
                      </ul>
                      <p><strong>Bien phap:</strong></p>
                      <ul>
                        <li>Phong ap luc am</li>
                        <li>Khau trang N95</li>
                        <li>Cua dong kin</li>
                      </ul>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* Report Infection Modal */}
      <Modal
        title="Bao cao ca nhiem khuan"
        open={isReportModalOpen}
        onCancel={() => setIsReportModalOpen(false)}
        onOk={() => reportForm.submit()}
        width={600}
      >
        <Alert
          title="Bao cao trong 24h voi su co nghiem trong"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={reportForm} layout="vertical" onFinish={handleReportCase}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="patientName" label="Ten benh nhan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="patientId" label="Ma benh nhan">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="department" label="Khoa" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="ICU">ICU</Select.Option>
                  <Select.Option value="Ngoai khoa">Ngoai khoa</Select.Option>
                  <Select.Option value="Noi khoa">Noi khoa</Select.Option>
                  <Select.Option value="San khoa">San khoa</Select.Option>
                  <Select.Option value="Nhi khoa">Nhi khoa</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bedNumber" label="Giuong" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="infectionType" label="Loai nhiem khuan" rules={[{ required: true }]}>
                <Select>
                  {INFECTION_TYPES.map((t) => (
                    <Select.Option key={t.value} value={t.value}>
                      {t.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="infectionSite" label="Vi tri nhiem khuan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="detectionDate" label="Ngay phat hien" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="onsetDate" label="Ngay khoi phat">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="organism" label="Vi khuan (neu biet)">
            <Input placeholder="VD: Staphylococcus aureus" />
          </Form.Item>
          <Form.Item name="isolationType" label="Loai cach ly">
            <Select>
              {ISOLATION_TYPES.map((t) => (
                <Select.Option key={t.value} value={t.value}>
                  {t.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Mo ta chi tiet">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Investigation Modal */}
      <Modal
        title="Chi tiet dieu tra ca nhiem khuan"
        open={isInvestigationModalOpen}
        onCancel={() => setIsInvestigationModalOpen(false)}
        onOk={() => handleUpdateInvestigation({})}
        width={700}
      >
        {selectedCase && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Benh nhan">{selectedCase.patientName}</Descriptions.Item>
              <Descriptions.Item label="Giuong">{selectedCase.bedNumber}</Descriptions.Item>
              <Descriptions.Item label="Loai NK">
                {getInfectionTypeTag(selectedCase.infectionType)}
              </Descriptions.Item>
              <Descriptions.Item label="Trang thai">
                {getStatusTag(selectedCase.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Vi tri">{selectedCase.infectionSite}</Descriptions.Item>
              <Descriptions.Item label="Vi khuan">
                {selectedCase.organism || 'Chua xac dinh'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngay phat hien">
                {selectedCase.detectionDate}
              </Descriptions.Item>
              <Descriptions.Item label="Cach ly">
                {getIsolationTag(selectedCase.isolationType) || 'Khong'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Qua trinh dieu tra</Divider>

            <Timeline
              items={[
                {
                  color: 'blue',
                  content: <>{selectedCase.reportDate} - Bao cao ca nghi ngo</>,
                },
                ...(selectedCase.organism ? [{
                  color: 'orange' as const,
                  content: <>Ket qua cay: {selectedCase.organism}</>,
                }] : []),
                ...(selectedCase.status === 'confirmed' ? [{
                  color: 'red' as const,
                  content: <>Xac nhan NKBV</>,
                }] : []),
              ]}
            />

            <Form layout="vertical" style={{ marginTop: 16 }}>
              <Form.Item label="Cap nhat trang thai">
                <Select defaultValue={selectedCase.status}>
                  <Select.Option value="suspected">Nghi ngo</Select.Option>
                  <Select.Option value="confirmed">Xac nhan</Select.Option>
                  <Select.Option value="resolved">Da khoi</Select.Option>
                  <Select.Option value="dismissed">Loai tru</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label="Ghi chu dieu tra">
                <TextArea rows={3} defaultValue={selectedCase.notes} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Audit Modal */}
      <Modal
        title="Kiem tra tuan thu KSNK"
        open={isAuditModalOpen}
        onCancel={() => setIsAuditModalOpen(false)}
        onOk={() => auditForm.submit()}
        width={600}
      >
        <Form form={auditForm} layout="vertical" onFinish={handleCreateAudit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="department" label="Khoa" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="ICU">ICU</Select.Option>
                  <Select.Option value="Ngoai khoa">Ngoai khoa</Select.Option>
                  <Select.Option value="Noi khoa">Noi khoa</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="auditDate" label="Ngay kiem tra" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Ty le tuan thu</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="handHygieneRate" label="Ve sinh tay (%)">
                <Input type="number" min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ppeComplianceRate" label="PPE (%)">
                <Input type="number" min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isolationComplianceRate" label="Cach ly (%)">
                <Input type="number" min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="findings" label="Phat hien/Khuyen nghi">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InfectionControl;
