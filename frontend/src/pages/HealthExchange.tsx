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
  Switch,
  Alert,
  Steps,
  Upload,
} from 'antd';
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
  ApiOutlined,
  SafetyOutlined,
  FileTextOutlined,
  PrinterOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  LinkOutlined,
  TeamOutlined,
  SwapOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Types
interface Connection {
  id: string;
  name: string;
  type: 'bhxh' | 'moh' | 'ehr' | 'provincial' | 'hospital';
  endpoint: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  protocol: string;
}

interface Submission {
  id: string;
  type: 'xml_4210' | 'xml_130' | 'referral' | 'consultation' | 'ehr_share' | 'report';
  patientName: string;
  patientId: string;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'error';
  submittedAt: string;
  responseAt?: string;
  errorMessage?: string;
}

interface Referral {
  id: string;
  patientName: string;
  patientId: string;
  fromHospital: string;
  toHospital: string;
  diagnosis: string;
  reason: string;
  status: 'draft' | 'sent' | 'received' | 'accepted' | 'rejected';
  createdAt: string;
  urgency: 'routine' | 'urgent' | 'emergency';
}

interface Consultation {
  id: string;
  patientName: string;
  patientId: string;
  requestingDoctor: string;
  consultingHospital: string;
  specialty: string;
  status: 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt?: string;
  meetingLink?: string;
}

interface PatientConsent {
  id: string;
  patientName: string;
  patientId: string;
  consentType: 'ehr_share' | 'referral' | 'consultation' | 'research';
  status: 'active' | 'revoked';
  grantedAt: string;
  expiresAt?: string;
}

// Mock data
const mockConnections: Connection[] = [
  {
    id: 'CONN001',
    name: 'Cong BHXH VN',
    type: 'bhxh',
    endpoint: 'https://giadinhbhxh.vn/api',
    status: 'connected',
    lastSync: '2024-01-15 10:30:00',
    protocol: 'SOAP/XML',
  },
  {
    id: 'CONN002',
    name: 'Cong Bo Y te',
    type: 'moh',
    endpoint: 'https://moh.gov.vn/api',
    status: 'connected',
    lastSync: '2024-01-15 09:00:00',
    protocol: 'REST/JSON',
  },
  {
    id: 'CONN003',
    name: 'HSSK Quoc gia (EHR)',
    type: 'ehr',
    endpoint: 'https://ehr.gov.vn/fhir',
    status: 'connected',
    lastSync: '2024-01-15 08:00:00',
    protocol: 'HL7 FHIR',
  },
  {
    id: 'CONN004',
    name: 'So Y te TP.HCM',
    type: 'provincial',
    endpoint: 'https://syt.hcm.gov.vn/api',
    status: 'connected',
    lastSync: '2024-01-14 23:00:00',
    protocol: 'REST/JSON',
  },
  {
    id: 'CONN005',
    name: 'BV Cho Ray',
    type: 'hospital',
    endpoint: 'https://his.choray.vn/api',
    status: 'disconnected',
    lastSync: '2024-01-10 15:00:00',
    protocol: 'HL7 v2.5',
  },
];

const mockSubmissions: Submission[] = [
  {
    id: 'SUB001',
    type: 'xml_4210',
    patientName: 'Nguyen Van A',
    patientId: 'BN001',
    status: 'accepted',
    submittedAt: '2024-01-15 09:00:00',
    responseAt: '2024-01-15 09:05:00',
  },
  {
    id: 'SUB002',
    type: 'xml_130',
    patientName: 'Tran Thi B',
    patientId: 'BN002',
    status: 'pending',
    submittedAt: '2024-01-15 10:30:00',
  },
  {
    id: 'SUB003',
    type: 'ehr_share',
    patientName: 'Le Van C',
    patientId: 'BN003',
    status: 'submitted',
    submittedAt: '2024-01-15 11:00:00',
  },
];

const mockReferrals: Referral[] = [
  {
    id: 'REF001',
    patientName: 'Nguyen Van X',
    patientId: 'BN010',
    fromHospital: 'BV Quan 1',
    toHospital: 'BV Cho Ray',
    diagnosis: 'U nao nghi ngo',
    reason: 'Can phau thuat than kinh',
    status: 'accepted',
    createdAt: '2024-01-14 14:00:00',
    urgency: 'urgent',
  },
  {
    id: 'REF002',
    patientName: 'Tran Thi Y',
    patientId: 'BN011',
    fromHospital: 'BV Quan 1',
    toHospital: 'BV Ung Buou',
    diagnosis: 'Ung thu vu giai doan 2',
    reason: 'Dieu tri hoa xa tri',
    status: 'sent',
    createdAt: '2024-01-15 08:00:00',
    urgency: 'routine',
  },
];

const mockConsultations: Consultation[] = [
  {
    id: 'CONS001',
    patientName: 'Pham Van D',
    patientId: 'BN020',
    requestingDoctor: 'BS. Nguyen Van M',
    consultingHospital: 'BV Bach Mai',
    specialty: 'Tim mach',
    status: 'scheduled',
    scheduledAt: '2024-01-16 09:00:00',
    meetingLink: 'https://meet.his.vn/cons001',
  },
];

const mockConsents: PatientConsent[] = [
  {
    id: 'CONSENT001',
    patientName: 'Nguyen Van A',
    patientId: 'BN001',
    consentType: 'ehr_share',
    status: 'active',
    grantedAt: '2024-01-10 10:00:00',
    expiresAt: '2025-01-10 10:00:00',
  },
];

const HealthExchange: React.FC = () => {
  const [connections] = useState<Connection[]>(mockConnections);
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);
  const [referrals, setReferrals] = useState<Referral[]>(mockReferrals);
  const [consultations, setConsultations] = useState<Consultation[]>(mockConsultations);
  const [consents, setConsents] = useState<PatientConsent[]>(mockConsents);

  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [consultationModalVisible, setConsultationModalVisible] = useState(false);
  const [xmlModalVisible, setXmlModalVisible] = useState(false);
  const [consentModalVisible, setConsentModalVisible] = useState(false);

  const [form] = Form.useForm();

  // Statistics
  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
  const activeReferrals = referrals.filter(r => r.status === 'sent').length;

  const getConnectionStatusTag = (status: string) => {
    switch (status) {
      case 'connected':
        return <Tag icon={<CheckCircleOutlined />} color="success">Ket noi</Tag>;
      case 'disconnected':
        return <Tag icon={<ClockCircleOutlined />} color="default">Ngat ket noi</Tag>;
      case 'error':
        return <Tag icon={<ExclamationCircleOutlined />} color="error">Loi</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const getSubmissionStatusTag = (status: string) => {
    switch (status) {
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="processing">Cho xu ly</Tag>;
      case 'submitted':
        return <Tag icon={<SyncOutlined spin />} color="blue">Da gui</Tag>;
      case 'accepted':
        return <Tag icon={<CheckCircleOutlined />} color="success">Chap nhan</Tag>;
      case 'rejected':
        return <Tag icon={<ExclamationCircleOutlined />} color="error">Tu choi</Tag>;
      case 'error':
        return <Tag icon={<ExclamationCircleOutlined />} color="error">Loi</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const getSubmissionTypeLabel = (type: string) => {
    switch (type) {
      case 'xml_4210': return 'XML 4210 (BHXH)';
      case 'xml_130': return 'XML 130 (Thuoc)';
      case 'referral': return 'Chuyen vien';
      case 'consultation': return 'Hoi chan';
      case 'ehr_share': return 'Chia se HSSK';
      case 'report': return 'Bao cao';
      default: return type;
    }
  };

  const connectionColumns: ColumnsType<Connection> = [
    {
      title: 'Ten ket noi',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <ApiOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Loai',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const labels: Record<string, string> = {
          bhxh: 'BHXH',
          moh: 'Bo Y te',
          ehr: 'HSSK QG',
          provincial: 'So Y te',
          hospital: 'Benh vien',
        };
        return <Tag>{labels[type] || type}</Tag>;
      },
    },
    {
      title: 'Giao thuc',
      dataIndex: 'protocol',
      key: 'protocol',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getConnectionStatusTag(status),
    },
    {
      title: 'Dong bo cuoi',
      dataIndex: 'lastSync',
      key: 'lastSync',
    },
    {
      title: 'Thao tac',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<SyncOutlined />}
            onClick={() => message.info('Dang dong bo...')}
          >
            Dong bo
          </Button>
          <Button
            type="link"
            icon={<LinkOutlined />}
            onClick={() => message.info('Kiem tra ket noi...')}
          >
            Test
          </Button>
        </Space>
      ),
    },
  ];

  const submissionColumns: ColumnsType<Submission> = [
    {
      title: 'Ma',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Loai',
      dataIndex: 'type',
      key: 'type',
      render: (type) => getSubmissionTypeLabel(type),
    },
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getSubmissionStatusTag(status),
    },
    {
      title: 'Thoi gian gui',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
    },
    {
      title: 'Phan hoi',
      dataIndex: 'responseAt',
      key: 'responseAt',
      render: (val) => val || '-',
    },
    {
      title: 'Thao tac',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<FileTextOutlined />}>
            Xem
          </Button>
          {record.status === 'rejected' && (
            <Button type="link" icon={<SyncOutlined />}>
              Gui lai
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const referralColumns: ColumnsType<Referral> = [
    {
      title: 'Ma',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Tu BV',
      dataIndex: 'fromHospital',
      key: 'fromHospital',
    },
    {
      title: 'Den BV',
      dataIndex: 'toHospital',
      key: 'toHospital',
    },
    {
      title: 'Chan doan',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
    },
    {
      title: 'Muc do',
      dataIndex: 'urgency',
      key: 'urgency',
      render: (urgency) => {
        const colors: Record<string, string> = {
          routine: 'default',
          urgent: 'orange',
          emergency: 'red',
        };
        const labels: Record<string, string> = {
          routine: 'Thuong quy',
          urgent: 'Khan cap',
          emergency: 'Cap cuu',
        };
        return <Tag color={colors[urgency]}>{labels[urgency]}</Tag>;
      },
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors: Record<string, string> = {
          draft: 'default',
          sent: 'processing',
          received: 'blue',
          accepted: 'success',
          rejected: 'error',
        };
        const labels: Record<string, string> = {
          draft: 'Nhap',
          sent: 'Da gui',
          received: 'BV da nhan',
          accepted: 'Chap nhan',
          rejected: 'Tu choi',
        };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      },
    },
    {
      title: 'Thao tac',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<FileTextOutlined />}>
            Chi tiet
          </Button>
          <Button type="link" icon={<PrinterOutlined />}>
            In
          </Button>
        </Space>
      ),
    },
  ];

  const consultationColumns: ColumnsType<Consultation> = [
    {
      title: 'Ma',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'BS yeu cau',
      dataIndex: 'requestingDoctor',
      key: 'requestingDoctor',
    },
    {
      title: 'BV hoi chan',
      dataIndex: 'consultingHospital',
      key: 'consultingHospital',
    },
    {
      title: 'Chuyen khoa',
      dataIndex: 'specialty',
      key: 'specialty',
    },
    {
      title: 'Lich hen',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (val) => val || '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors: Record<string, string> = {
          requested: 'default',
          scheduled: 'blue',
          in_progress: 'processing',
          completed: 'success',
          cancelled: 'error',
        };
        const labels: Record<string, string> = {
          requested: 'Yeu cau',
          scheduled: 'Da len lich',
          in_progress: 'Dang hoi chan',
          completed: 'Hoan thanh',
          cancelled: 'Huy',
        };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      },
    },
    {
      title: 'Thao tac',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'scheduled' && record.meetingLink && (
            <Button type="primary" size="small">
              Vao phong
            </Button>
          )}
          <Button type="link" icon={<FileTextOutlined />}>
            Chi tiet
          </Button>
        </Space>
      ),
    },
  ];

  const consentColumns: ColumnsType<PatientConsent> = [
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Ma BN',
      dataIndex: 'patientId',
      key: 'patientId',
    },
    {
      title: 'Loai dong y',
      dataIndex: 'consentType',
      key: 'consentType',
      render: (type) => {
        const labels: Record<string, string> = {
          ehr_share: 'Chia se HSSK',
          referral: 'Chuyen vien',
          consultation: 'Hoi chan',
          research: 'Nghien cuu',
        };
        return labels[type] || type;
      },
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Hieu luc' : 'Thu hoi'}
        </Tag>
      ),
    },
    {
      title: 'Ngay cap',
      dataIndex: 'grantedAt',
      key: 'grantedAt',
    },
    {
      title: 'Het han',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (val) => val || 'Vo thoi han',
    },
    {
      title: 'Thao tac',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'active' && (
            <Button type="link" danger>
              Thu hoi
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleCreateReferral = (values: any) => {
    const newReferral: Referral = {
      id: `REF${String(referrals.length + 1).padStart(3, '0')}`,
      patientName: values.patientName,
      patientId: values.patientId,
      fromHospital: 'BV Quan 1',
      toHospital: values.toHospital,
      diagnosis: values.diagnosis,
      reason: values.reason,
      status: 'draft',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      urgency: values.urgency,
    };
    setReferrals([newReferral, ...referrals]);
    setReferralModalVisible(false);
    form.resetFields();
    message.success('Tao phieu chuyen vien thanh cong!');
  };

  const handleCreateConsultation = (values: any) => {
    const newConsultation: Consultation = {
      id: `CONS${String(consultations.length + 1).padStart(3, '0')}`,
      patientName: values.patientName,
      patientId: values.patientId,
      requestingDoctor: 'BS. Nguyen Van M',
      consultingHospital: values.consultingHospital,
      specialty: values.specialty,
      status: 'requested',
    };
    setConsultations([newConsultation, ...consultations]);
    setConsultationModalVisible(false);
    form.resetFields();
    message.success('Gui yeu cau hoi chan thanh cong!');
  };

  const handleSubmitXML = (values: any) => {
    const newSubmission: Submission = {
      id: `SUB${String(submissions.length + 1).padStart(3, '0')}`,
      type: values.xmlType,
      patientName: values.patientName,
      patientId: values.patientId,
      status: 'pending',
      submittedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
    setSubmissions([newSubmission, ...submissions]);
    setXmlModalVisible(false);
    form.resetFields();
    message.success('Gui du lieu XML thanh cong!');
  };

  const handlePrintReferral = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Phieu Chuyen vien</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              .header { text-align: center; margin-bottom: 20px; }
              .footer { margin-top: 30px; }
              .signature { display: flex; justify-content: space-between; margin-top: 50px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>BENH VIEN QUAN 1</h2>
              <h1>PHIEU CHUYEN VIEN</h1>
            </div>
            <table>
              <tr><td><strong>Ho ten BN:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Ma benh nhan:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Chan doan:</strong></td><td>_________________</td></tr>
              <tr><td><strong>BV tiep nhan:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Ly do chuyen:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Tom tat dieu tri:</strong></td><td>_________________</td></tr>
            </table>
            <div class="signature">
              <div style="text-align: center;">
                <p>Bac si dieu tri</p>
                <br/><br/>
                <p>_______________</p>
              </div>
              <div style="text-align: center;">
                <p>Giam doc benh vien</p>
                <br/><br/>
                <p>_______________</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const tabItems = [
    {
      key: 'connections',
      label: (
        <span>
          <ApiOutlined />
          Ket noi ({connectedCount}/{connections.length})
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Trang thai ket noi"
            description={`${connectedCount}/${connections.length} cong ket noi dang hoat dong`}
            type={connectedCount === connections.length ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            columns={connectionColumns}
            dataSource={connections}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'submissions',
      label: (
        <span>
          <CloudUploadOutlined />
          Gui du lieu ({pendingSubmissions} cho)
        </span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setXmlModalVisible(true)}
            >
              Gui XML BHXH
            </Button>
            <Button icon={<SyncOutlined />}>
              Dong bo tat ca
            </Button>
          </Space>
          <Table
            columns={submissionColumns}
            dataSource={submissions}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
    {
      key: 'referrals',
      label: (
        <span>
          <SwapOutlined />
          Chuyen vien ({activeReferrals})
        </span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setReferralModalVisible(true)}
            >
              Tao phieu chuyen
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrintReferral}>
              In mau
            </Button>
          </Space>
          <Table
            columns={referralColumns}
            dataSource={referrals}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
    {
      key: 'consultations',
      label: (
        <span>
          <TeamOutlined />
          Hoi chan tu xa
        </span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setConsultationModalVisible(true)}
            >
              Yeu cau hoi chan
            </Button>
          </Space>
          <Table
            columns={consultationColumns}
            dataSource={consultations}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
    {
      key: 'consent',
      label: (
        <span>
          <SafetyOutlined />
          Dong y BN
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Quy dinh ve dong y benh nhan"
            description="Benh nhan phai dong y truoc khi chia se thong tin suc khoe voi cac co so y te khac hoac HSSK quoc gia."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setConsentModalVisible(true)}
            >
              Ghi nhan dong y
            </Button>
          </Space>
          <Table
            columns={consentColumns}
            dataSource={consents}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>Lien thong Y te (HIE)</Title>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ket noi hoat dong"
              value={connectedCount}
              suffix={`/ ${connections.length}`}
              prefix={<ApiOutlined />}
              valueStyle={{ color: connectedCount === connections.length ? '#3f8600' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Du lieu cho xu ly"
              value={pendingSubmissions}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Chuyen vien hom nay"
              value={referrals.length}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Hoi chan tu xa"
              value={consultations.filter(c => c.status !== 'completed').length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* Referral Modal */}
      <Modal
        title="Tao phieu chuyen vien dien tu"
        open={referralModalVisible}
        onCancel={() => setReferralModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateReferral}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="patientName" label="Ho ten benh nhan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="patientId" label="Ma benh nhan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="toHospital" label="Benh vien tiep nhan" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="BV Cho Ray">BV Cho Ray</Select.Option>
              <Select.Option value="BV Ung Buou">BV Ung Buou</Select.Option>
              <Select.Option value="BV Nhi Dong 1">BV Nhi Dong 1</Select.Option>
              <Select.Option value="BV Bach Mai">BV Bach Mai</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="diagnosis" label="Chan doan" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="reason" label="Ly do chuyen vien" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="urgency" label="Muc do khan cap" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="routine">Thuong quy</Select.Option>
              <Select.Option value="urgent">Khan cap</Select.Option>
              <Select.Option value="emergency">Cap cuu</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Consultation Modal */}
      <Modal
        title="Yeu cau hoi chan tu xa"
        open={consultationModalVisible}
        onCancel={() => setConsultationModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateConsultation}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="patientName" label="Ho ten benh nhan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="patientId" label="Ma benh nhan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="consultingHospital" label="Benh vien hoi chan" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="BV Bach Mai">BV Bach Mai</Select.Option>
              <Select.Option value="BV Viet Duc">BV Viet Duc</Select.Option>
              <Select.Option value="BV K">BV K</Select.Option>
              <Select.Option value="BV TW Hue">BV TW Hue</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="specialty" label="Chuyen khoa" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Tim mach">Tim mach</Select.Option>
              <Select.Option value="Than kinh">Than kinh</Select.Option>
              <Select.Option value="Ung buou">Ung buou</Select.Option>
              <Select.Option value="Nhi khoa">Nhi khoa</Select.Option>
              <Select.Option value="San phu khoa">San phu khoa</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="Ly do hoi chan">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* XML Submit Modal */}
      <Modal
        title="Gui du lieu XML BHXH"
        open={xmlModalVisible}
        onCancel={() => setXmlModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitXML}>
          <Form.Item name="xmlType" label="Loai XML" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="xml_4210">XML 4210 - Ho so BHYT</Select.Option>
              <Select.Option value="xml_130">XML 130 - Thuoc</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="patientName" label="Ho ten benh nhan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="patientId" label="Ma benh nhan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="visitDate" label="Ngay kham">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Consent Modal */}
      <Modal
        title="Ghi nhan dong y benh nhan"
        open={consentModalVisible}
        onCancel={() => setConsentModalVisible(false)}
        onOk={() => {
          message.success('Da ghi nhan dong y cua benh nhan!');
          setConsentModalVisible(false);
        }}
        width={600}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="patientName" label="Ho ten benh nhan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="patientId" label="Ma benh nhan" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="consentType" label="Loai dong y" rules={[{ required: true }]}>
            <Select mode="multiple">
              <Select.Option value="ehr_share">Chia se HSSK voi HSSK quoc gia</Select.Option>
              <Select.Option value="referral">Chia se thong tin khi chuyen vien</Select.Option>
              <Select.Option value="consultation">Hoi chan tu xa</Select.Option>
              <Select.Option value="research">Su dung cho nghien cuu y khoa</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="duration" label="Thoi han">
            <Select>
              <Select.Option value="1year">1 nam</Select.Option>
              <Select.Option value="5years">5 nam</Select.Option>
              <Select.Option value="permanent">Vo thoi han</Select.Option>
            </Select>
          </Form.Item>
          <Alert
            message="Luu y"
            description="Benh nhan co quyen thu hoi dong y bat cu luc nao."
            type="warning"
            showIcon
          />
        </Form>
      </Modal>
    </div>
  );
};

export default HealthExchange;
