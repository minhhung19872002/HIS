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
  Progress,
  Rate,
} from 'antd';
import {
  SafetyOutlined,
  AlertOutlined,
  FileSearchOutlined,
  BarChartOutlined,
  PrinterOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Types
interface Incident {
  id: string;
  reportDate: string;
  incidentDate: string;
  department: string;
  incidentType: string;
  severity: 'near_miss' | 'minor' | 'moderate' | 'major' | 'sentinel';
  description: string;
  patientInvolved: boolean;
  patientHarm: boolean;
  reportedBy?: string;
  status: 'reported' | 'investigating' | 'analyzed' | 'resolved' | 'closed';
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
}

interface QualityIndicator {
  id: string;
  name: string;
  category: string;
  target: number;
  current: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

interface Audit {
  id: string;
  auditName: string;
  auditType: 'internal' | 'external' | 'jci' | 'iso';
  department: string;
  scheduledDate: string;
  completedDate?: string;
  auditor: string;
  score?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  findings?: number;
  observations?: number;
}

// Mock data
const mockIncidents: Incident[] = [
  {
    id: 'INC001',
    reportDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    incidentDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    department: 'Noi khoa',
    incidentType: 'Sai sot thuoc',
    severity: 'near_miss',
    description: 'Suyt cap nham thuoc do trung ten benh nhan',
    patientInvolved: true,
    patientHarm: false,
    status: 'investigating',
  },
  {
    id: 'INC002',
    reportDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    incidentDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    department: 'Ngoai khoa',
    incidentType: 'Te nga',
    severity: 'minor',
    description: 'Benh nhan te nga trong nha ve sinh, xuoc da nhe',
    patientInvolved: true,
    patientHarm: true,
    status: 'analyzed',
    rootCause: 'San nha ve sinh tron, thieu tay vin',
    correctiveAction: 'Lap tay vin, thay tham chong tron',
  },
  {
    id: 'INC003',
    reportDate: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
    incidentDate: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
    department: 'PTTT',
    incidentType: 'Khac',
    severity: 'near_miss',
    description: 'Thiet bi mo bi loi, phat hien truoc khi bat dau mo',
    patientInvolved: false,
    patientHarm: false,
    status: 'resolved',
    correctiveAction: 'Kiem tra thiet bi truoc moi ca mo',
  },
];

const mockIndicators: QualityIndicator[] = [
  {
    id: 'KPI001',
    name: 'Ty le nhiem khuan benh vien',
    category: 'An toan nguoi benh',
    target: 5,
    current: 3.2,
    unit: '%',
    trend: 'down',
    status: 'good',
  },
  {
    id: 'KPI002',
    name: 'Ty le te nga',
    category: 'An toan nguoi benh',
    target: 0,
    current: 0.5,
    unit: '%',
    trend: 'stable',
    status: 'warning',
  },
  {
    id: 'KPI003',
    name: 'Ty le sai sot thuoc',
    category: 'An toan thuoc',
    target: 0.1,
    current: 0.08,
    unit: '%',
    trend: 'down',
    status: 'good',
  },
  {
    id: 'KPI004',
    name: 'Thoi gian cho kham trung binh',
    category: 'Trai nghiem BN',
    target: 30,
    current: 42,
    unit: 'phut',
    trend: 'up',
    status: 'critical',
  },
  {
    id: 'KPI005',
    name: 'Diem hai long BN',
    category: 'Trai nghiem BN',
    target: 4.5,
    current: 4.2,
    unit: '/5',
    trend: 'up',
    status: 'good',
  },
];

const mockAudits: Audit[] = [
  {
    id: 'AUD001',
    auditName: 'Audit noi bo Q1/2024',
    auditType: 'internal',
    department: 'Toan vien',
    scheduledDate: '2024-03-15',
    auditor: 'BS. Nguyen Van A',
    status: 'scheduled',
  },
  {
    id: 'AUD002',
    auditName: 'Kiem tra KSNK',
    auditType: 'internal',
    department: 'Noi khoa',
    scheduledDate: '2024-02-01',
    completedDate: '2024-02-01',
    auditor: 'DD. Tran Thi B',
    score: 85,
    status: 'completed',
    findings: 3,
    observations: 5,
  },
];

const INCIDENT_TYPES = [
  'Sai sot thuoc',
  'Te nga',
  'Nhiem khuan',
  'Sai dinh danh',
  'Thiet bi hong',
  'Truyen mau sai',
  'Khac',
];

const SEVERITY_LEVELS = [
  { value: 'near_miss', label: 'Suyt xay ra', color: 'blue' },
  { value: 'minor', label: 'Nhe', color: 'green' },
  { value: 'moderate', label: 'Vua', color: 'orange' },
  { value: 'major', label: 'Nang', color: 'red' },
  { value: 'sentinel', label: 'Trong yeu', color: 'volcano' },
];

const Quality: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
  const [indicators] = useState<QualityIndicator[]>(mockIndicators);
  const [audits] = useState<Audit[]>(mockAudits);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [reportForm] = Form.useForm();
  const [investigationForm] = Form.useForm();
  const [auditForm] = Form.useForm();

  // Statistics
  const openIncidents = incidents.filter(
    (i) => i.status !== 'resolved' && i.status !== 'closed'
  ).length;
  const criticalKPIs = indicators.filter((i) => i.status === 'critical').length;
  const upcomingAudits = audits.filter((a) => a.status === 'scheduled').length;

  const getSeverityTag = (severity: Incident['severity']) => {
    const config = SEVERITY_LEVELS.find((s) => s.value === severity);
    return <Tag color={config?.color}>{config?.label}</Tag>;
  };

  const getStatusTag = (status: Incident['status']) => {
    const config: Record<string, { color: string; text: string }> = {
      reported: { color: 'blue', text: 'Da bao cao' },
      investigating: { color: 'orange', text: 'Dang dieu tra' },
      analyzed: { color: 'cyan', text: 'Da phan tich' },
      resolved: { color: 'green', text: 'Da xu ly' },
      closed: { color: 'default', text: 'Da dong' },
    };
    const c = config[status];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleReportIncident = (values: any) => {
    const newIncident: Incident = {
      id: `INC${Date.now()}`,
      reportDate: dayjs().format('YYYY-MM-DD'),
      incidentDate: values.incidentDate.format('YYYY-MM-DD'),
      department: values.department,
      incidentType: values.incidentType,
      severity: values.severity,
      description: values.description,
      patientInvolved: values.patientInvolved,
      patientHarm: values.patientHarm || false,
      reportedBy: values.reportedBy,
      status: 'reported',
    };

    setIncidents((prev) => [...prev, newIncident]);
    setIsReportModalOpen(false);
    reportForm.resetFields();
    message.success('Da bao cao su co');
  };

  const handleInvestigation = (values: any) => {
    if (!selectedIncident) return;

    setIncidents((prev) =>
      prev.map((i) =>
        i.id === selectedIncident.id
          ? {
              ...i,
              status: 'analyzed',
              rootCause: values.rootCause,
              correctiveAction: values.correctiveAction,
              preventiveAction: values.preventiveAction,
            }
          : i
      )
    );

    setIsInvestigationModalOpen(false);
    investigationForm.resetFields();
    message.success('Da cap nhat ket qua dieu tra');
  };

  const handleAddAudit = (values: any) => {
    message.success('Da len lich audit');
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
        <title>Bao cao chat luong</title>
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
          Phong Quan ly chat luong
        </div>

        <div class="title">BAO CAO CHAT LUONG THANG ${dayjs().format('MM/YYYY')}</div>

        <h3>1. Chi so chat luong</h3>
        <table>
          <tr>
            <th>Chi so</th>
            <th>Muc tieu</th>
            <th>Thuc te</th>
            <th>Danh gia</th>
          </tr>
          ${indicators.map((ind) => `
            <tr>
              <td>${ind.name}</td>
              <td>${ind.target}${ind.unit}</td>
              <td>${ind.current}${ind.unit}</td>
              <td>${ind.status === 'good' ? 'Dat' : ind.status === 'warning' ? 'Canh bao' : 'Khong dat'}</td>
            </tr>
          `).join('')}
        </table>

        <h3>2. Su co y khoa</h3>
        <table>
          <tr>
            <th>Loai</th>
            <th>So luong</th>
          </tr>
          <tr>
            <td>Tong su co</td>
            <td>${incidents.length}</td>
          </tr>
          <tr>
            <td>Da xu ly</td>
            <td>${incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length}</td>
          </tr>
        </table>

        <div style="margin-top: 50px; text-align: right;">
          <p>Ngay ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Truong phong QLCL</strong></p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const incidentColumns: ColumnsType<Incident> = [
    {
      title: 'Ngay',
      dataIndex: 'incidentDate',
      key: 'incidentDate',
      width: 100,
    },
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Loai su co',
      dataIndex: 'incidentType',
      key: 'incidentType',
    },
    {
      title: 'Muc do',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => getSeverityTag(severity),
    },
    {
      title: 'Mo ta',
      dataIndex: 'description',
      key: 'description',
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
      width: 120,
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setSelectedIncident(record);
            setIsInvestigationModalOpen(true);
          }}
        >
          Chi tiet
        </Button>
      ),
    },
  ];

  const auditColumns: ColumnsType<Audit> = [
    {
      title: 'Ten audit',
      dataIndex: 'auditName',
      key: 'auditName',
    },
    {
      title: 'Loai',
      dataIndex: 'auditType',
      key: 'auditType',
      render: (type) => {
        const labels: Record<string, string> = {
          internal: 'Noi bo',
          external: 'Ben ngoai',
          jci: 'JCI',
          iso: 'ISO',
        };
        return labels[type];
      },
    },
    {
      title: 'Khoa/Phong',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Ngay',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
    },
    {
      title: 'Diem',
      dataIndex: 'score',
      key: 'score',
      render: (score) =>
        score ? (
          <Tag color={score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'}>
            {score}%
          </Tag>
        ) : (
          '-'
        ),
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
          cancelled: { color: 'red', text: 'Da huy' },
        };
        const c = config[status];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Title level={4}>Quan ly chat luong</Title>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Su co chua xu ly"
              value={openIncidents}
              prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="KPI canh bao"
              value={criticalKPIs}
              prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Audit sap toi"
              value={upcomingAudits}
              prefix={<FileSearchOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
      </Row>

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
              Bao cao su co
            </Button>
          </Space>
        }
      >
        <Tabs
          defaultActiveKey="kpi"
          items={[
            {
              key: 'kpi',
              label: 'Chi so chat luong (KPI)',
              children: (
                <Row gutter={[16, 16]}>
                  {indicators.map((ind) => (
                    <Col key={ind.id} xs={24} sm={12} lg={8}>
                      <Card size="small">
                        <Space orientation="vertical" style={{ width: '100%' }}>
                          <Text strong>{ind.name}</Text>
                          <Text type="secondary">{ind.category}</Text>
                          <Row justify="space-between" align="middle">
                            <Col>
                              <Statistic
                                value={ind.current}
                                suffix={ind.unit}
                                styles={{ content: {
                                  color:
                                    ind.status === 'good'
                                      ? '#52c41a'
                                      : ind.status === 'warning'
                                      ? '#faad14'
                                      : '#ff4d4f',
                                } }}
                              />
                            </Col>
                            <Col>
                              <Text type="secondary">Muc tieu: {ind.target}{ind.unit}</Text>
                            </Col>
                          </Row>
                          <Progress
                            percent={Math.min(100, (ind.current / ind.target) * 100)}
                            status={ind.status === 'critical' ? 'exception' : undefined}
                            showInfo={false}
                          />
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ),
            },
            {
              key: 'incidents',
              label: `Su co y khoa (${openIncidents})`,
              children: (
                <Table
                  columns={incidentColumns}
                  dataSource={incidents}
                  rowKey="id"
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      setSelectedIncident(record);
                      setIsInvestigationModalOpen(true);
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
            {
              key: 'audits',
              label: 'Audit',
              children: (
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ marginBottom: 16 }}
                    onClick={() => setIsAuditModalOpen(true)}
                  >
                    Len lich audit
                  </Button>
                  <Table
                    columns={auditColumns}
                    dataSource={audits}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiết Audit - ${record.auditCode || record.id}`,
                          width: 500,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Khoa/Phòng">{record.department}</Descriptions.Item>
                              <Descriptions.Item label="Loại">{record.auditType}</Descriptions.Item>
                              <Descriptions.Item label="Ngày">{record.auditDate}</Descriptions.Item>
                              <Descriptions.Item label="Người thực hiện">{record.auditorName}</Descriptions.Item>
                              <Descriptions.Item label="Điểm">{record.score}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{record.status}</Descriptions.Item>
                              <Descriptions.Item label="Ghi chú">{record.notes || '-'}</Descriptions.Item>
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
              key: 'standards',
              label: 'Tieu chuan',
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card title="JCI (Joint Commission International)">
                      <div>
                      {[
                          'IPSG - Muc tieu an toan quoc te',
                          'ACC - Tiep nhan va lien tuc',
                          'PFR - Quyen benh nhan',
                          'AOP - Danh gia benh nhan',
                          'COP - Cham soc benh nhan',
                        ].map((item, idx) => (
                        <div key={idx} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>{item}</div>
                      ))}
                    </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="ISO 9001:2015">
                      <div>
                      {[
                          'Boi canh to chuc',
                          'Lanh dao',
                          'Hoach dinh',
                          'Ho tro',
                          'Van hanh',
                          'Danh gia ket qua',
                          'Cai tien',
                        ].map((item, idx) => (
                        <div key={idx} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>{item}</div>
                      ))}
                    </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="83 Tieu chi Bo Y te">
                      <div>
                      {[
                          'Nhom A: An toan nguoi benh',
                          'Nhom B: To chuc quan ly',
                          'Nhom C: Nang luc NVYT',
                          'Nhom D: Co so ha tang',
                          'Nhom E: Cham soc nguoi benh',
                        ].map((item, idx) => (
                        <div key={idx} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>{item}</div>
                      ))}
                    </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'satisfaction',
              label: 'Hai long BN',
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card title="Diem hai long trung binh">
                      <Row align="middle" gutter={16}>
                        <Col>
                          <Rate disabled defaultValue={4} />
                        </Col>
                        <Col>
                          <Statistic value={4.2} suffix="/5" />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Ty le phan hoi">
                      <Progress percent={65} />
                      <Text type="secondary">650/1000 phieu thu thap</Text>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* Report Incident Modal */}
      <Modal
        title="Bao cao su co y khoa"
        open={isReportModalOpen}
        onCancel={() => setIsReportModalOpen(false)}
        onOk={() => reportForm.submit()}
        width={600}
      >
        <Form form={reportForm} layout="vertical" onFinish={handleReportIncident}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="incidentDate" label="Ngay xay ra" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Khoa/Phong" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Noi khoa">Noi khoa</Select.Option>
                  <Select.Option value="Ngoai khoa">Ngoai khoa</Select.Option>
                  <Select.Option value="PTTT">PTTT</Select.Option>
                  <Select.Option value="Cap cuu">Cap cuu</Select.Option>
                  <Select.Option value="ICU">ICU</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="incidentType" label="Loai su co" rules={[{ required: true }]}>
                <Select>
                  {INCIDENT_TYPES.map((t) => (
                    <Select.Option key={t} value={t}>
                      {t}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="severity" label="Muc do" rules={[{ required: true }]}>
                <Select>
                  {SEVERITY_LEVELS.map((s) => (
                    <Select.Option key={s.value} value={s.value}>
                      {s.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mo ta su co" rules={[{ required: true }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="patientInvolved" label="Lien quan BN">
                <Select>
                  <Select.Option value={true}>Co</Select.Option>
                  <Select.Option value={false}>Khong</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="patientHarm" label="BN bi ton thuong">
                <Select>
                  <Select.Option value={true}>Co</Select.Option>
                  <Select.Option value={false}>Khong</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reportedBy" label="Nguoi bao cao">
            <Input placeholder="Co the an danh" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Investigation Modal */}
      <Modal
        title="Chi tiet su co"
        open={isInvestigationModalOpen}
        onCancel={() => setIsInvestigationModalOpen(false)}
        onOk={() => investigationForm.submit()}
        width={700}
      >
        {selectedIncident && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Ngay xay ra">
                {selectedIncident.incidentDate}
              </Descriptions.Item>
              <Descriptions.Item label="Khoa">{selectedIncident.department}</Descriptions.Item>
              <Descriptions.Item label="Loai">{selectedIncident.incidentType}</Descriptions.Item>
              <Descriptions.Item label="Muc do">
                {getSeverityTag(selectedIncident.severity)}
              </Descriptions.Item>
              <Descriptions.Item label="Mo ta" span={2}>
                {selectedIncident.description}
              </Descriptions.Item>
              <Descriptions.Item label="Trang thai" span={2}>
                {getStatusTag(selectedIncident.status)}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Phan tich nguyen nhan goc (RCA)</Divider>

            <Form form={investigationForm} layout="vertical" onFinish={handleInvestigation}>
              <Form.Item
                name="rootCause"
                label="Nguyen nhan goc"
                initialValue={selectedIncident.rootCause}
              >
                <TextArea rows={3} placeholder="Su dung phuong phap 5 Whys, Fishbone..." />
              </Form.Item>
              <Form.Item
                name="correctiveAction"
                label="Bien phap khac phuc"
                initialValue={selectedIncident.correctiveAction}
              >
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item
                name="preventiveAction"
                label="Bien phap phong ngua"
                initialValue={selectedIncident.preventiveAction}
              >
                <TextArea rows={2} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Audit Modal */}
      <Modal
        title="Len lich audit"
        open={isAuditModalOpen}
        onCancel={() => setIsAuditModalOpen(false)}
        onOk={() => auditForm.submit()}
      >
        <Form form={auditForm} layout="vertical" onFinish={handleAddAudit}>
          <Form.Item name="auditName" label="Ten audit" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="auditType" label="Loai" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="internal">Audit noi bo</Select.Option>
              <Select.Option value="external">Audit ben ngoai</Select.Option>
              <Select.Option value="jci">Audit JCI</Select.Option>
              <Select.Option value="iso">Audit ISO</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="department" label="Khoa/Phong" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Toan vien">Toan vien</Select.Option>
              <Select.Option value="Noi khoa">Noi khoa</Select.Option>
              <Select.Option value="Ngoai khoa">Ngoai khoa</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="scheduledDate" label="Ngay" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="auditor" label="Nguoi thuc hien">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Quality;
