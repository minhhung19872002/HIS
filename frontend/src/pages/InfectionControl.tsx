import React, { useState, useEffect, useCallback } from 'react';
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
  Progress,
  Spin,
} from 'antd';
import {
  BugOutlined,
  AlertOutlined,
  PrinterOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getActiveHAICases,
  getIsolationOrders,
  getHandHygieneObservations,
  getDashboard,
  createHAICase,
  investigateHAICase,
  closeHAICase,
  createIsolationOrder,
  createHandHygieneObservation,
  getOutbreaks,
} from '../api/infectionControl';
import type {
  HAISurveillanceDto,
  IsolationOrderDto,
  HandHygieneObservationDto,
  InfectionControlDashboardDto,
  OutbreakDto,
} from '../api/infectionControl';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Title, Text } = Typography;
const { TextArea } = Input;

const INFECTION_TYPES = [
  { value: 'SSI', label: 'SSI - Nhiem khuan vet mo' },
  { value: 'VAP', label: 'VAP - Viem phoi tho may' },
  { value: 'CAUTI', label: 'CAUTI - NK tiet nieu do sonde' },
  { value: 'CLABSI', label: 'CLABSI - NK huyet do catheter' },
  { value: 'CDI', label: 'CDI - Clostridium difficile' },
  { value: 'Other', label: 'Khac' },
];

const ISOLATION_TYPES = [
  { value: 'Contact', label: 'Cach ly tiep xuc' },
  { value: 'Droplet', label: 'Cach ly giot ban' },
  { value: 'Airborne', label: 'Cach ly khong khi' },
  { value: 'Protective', label: 'Cach ly bao ve' },
];

const InfectionControl: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [haiCases, setHaiCases] = useState<HAISurveillanceDto[]>([]);
  const [isolationOrders, setIsolationOrders] = useState<IsolationOrderDto[]>([]);
  const [hhObservations, setHhObservations] = useState<HandHygieneObservationDto[]>([]);
  const [dashboard, setDashboard] = useState<InfectionControlDashboardDto | null>(null);
  const [outbreaks, setOutbreaks] = useState<OutbreakDto[]>([]);
  const [selectedCase, setSelectedCase] = useState<HAISurveillanceDto | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [reportForm] = Form.useForm();
  const [auditForm] = Form.useForm();
  const [investigationForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const results = await Promise.allSettled([
        getActiveHAICases(),
        getIsolationOrders(),
        getHandHygieneObservations(),
        getDashboard(today),
        getOutbreaks(),
      ]);

      if (results[0].status === 'fulfilled') {
        setHaiCases(results[0].value?.data || []);
      } else {
        message.warning('Khong the tai danh sach ca nhiem khuan');
      }

      if (results[1].status === 'fulfilled') {
        setIsolationOrders(results[1].value?.data || []);
      } else {
        message.warning('Khong the tai danh sach cach ly');
      }

      if (results[2].status === 'fulfilled') {
        setHhObservations(results[2].value?.data || []);
      } else {
        message.warning('Khong the tai du lieu ve sinh tay');
      }

      if (results[3].status === 'fulfilled') {
        setDashboard(results[3].value?.data || null);
      } else {
        message.warning('Khong the tai dashboard KSNK');
      }

      if (results[4].status === 'fulfilled') {
        setOutbreaks(results[4].value?.data || []);
      } else {
        message.warning('Khong the tai danh sach dich');
      }
    } catch {
      message.warning('Loi khi tai du lieu KSNK');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or computed from cases
  const activeCasesCount = dashboard?.activeHAICases ?? haiCases.length;
  const confirmedCount = dashboard?.totalHAICases ?? haiCases.filter((c) => c.status === 2).length;
  const pendingInvestigation = haiCases.filter(
    (c) => !c.investigatedBy && c.status < 3
  ).length;
  const activeIsolationsCount = dashboard?.activeIsolations ?? isolationOrders.filter((o) => o.status === 1).length;

  const getInfectionTypeTag = (type: string) => {
    const config: Record<string, { color: string; text: string }> = {
      SSI: { color: 'red', text: 'SSI' },
      VAP: { color: 'orange', text: 'VAP' },
      CAUTI: { color: 'purple', text: 'CAUTI' },
      CLABSI: { color: 'volcano', text: 'CLABSI' },
      CDI: { color: 'cyan', text: 'CDI' },
      Other: { color: 'default', text: 'Khac' },
    };
    const c = config[type] || { color: 'default', text: type };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getStatusTag = (status: number, statusName?: string) => {
    const config: Record<number, { color: string; text: string }> = {
      0: { color: 'default', text: 'Moi' },
      1: { color: 'orange', text: 'Nghi ngo' },
      2: { color: 'red', text: 'Xac nhan' },
      3: { color: 'green', text: 'Da khoi' },
      4: { color: 'default', text: 'Loai tru' },
    };
    const c = config[status] || { color: 'default', text: statusName || `Status ${status}` };
    return <Tag color={c.color}>{statusName || c.text}</Tag>;
  };

  const getIsolationTypeTag = (type?: string) => {
    if (!type) return null;
    const config: Record<string, { color: string; text: string }> = {
      Contact: { color: 'yellow', text: 'Tiep xuc' },
      Droplet: { color: 'blue', text: 'Giot ban' },
      Airborne: { color: 'purple', text: 'Khong khi' },
      Protective: { color: 'green', text: 'Bao ve' },
    };
    const c = config[type];
    if (!c) return <Tag>{type}</Tag>;
    return (
      <Tag color={c.color} icon={<SafetyOutlined />}>
        {c.text}
      </Tag>
    );
  };

  const getSeverityTag = (severity: number, severityName?: string) => {
    const colors: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red' };
    return <Tag color={colors[severity] || 'default'}>{severityName || `Muc ${severity}`}</Tag>;
  };

  const handleReportCase = async (values: any) => {
    setSubmitting(true);
    try {
      await createHAICase({
        admissionId: values.admissionId || '',
        infectionType: values.infectionType,
        infectionSite: values.infectionSite,
        onsetDate: values.onsetDate ? values.onsetDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        organism: values.organism,
        isMDRO: values.isMDRO || false,
        mdroType: values.mdroType,
        cultureSource: values.cultureSource,
        cultureDate: values.cultureDate ? values.cultureDate.format('YYYY-MM-DD') : undefined,
        cultureResult: values.cultureResult,
        riskFactors: values.riskFactors || [],
        deviceAssociated: values.deviceAssociated || false,
        deviceType: values.deviceType,
        deviceDays: values.deviceDays,
        surgeryRelated: values.surgeryRelated || false,
        surgeryId: values.surgeryId,
        cdcCriteria: values.cdcCriteria || '',
        severity: values.severity || 1,
        notes: values.notes,
      });
      message.success('Da bao cao ca nhiem khuan');
      setIsReportModalOpen(false);
      reportForm.resetFields();
      fetchData();
    } catch {
      message.warning('Khong the bao cao ca nhiem khuan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateInvestigation = async (values: any) => {
    if (!selectedCase) return;
    setSubmitting(true);
    try {
      if (values.status === 3 || values.status === 4) {
        // Close/dismiss case
        await closeHAICase(selectedCase.id, values.outcome || values.statusText || '', values.notes);
      } else {
        // Investigate case
        await investigateHAICase(selectedCase.id, values.notes || '', values.actions || []);
      }
      message.success('Da cap nhat ket qua dieu tra');
      setIsInvestigationModalOpen(false);
      investigationForm.resetFields();
      fetchData();
    } catch {
      message.warning('Khong the cap nhat ca nhiem khuan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAudit = async (values: any) => {
    setSubmitting(true);
    try {
      await createHandHygieneObservation({
        departmentId: values.departmentId || '',
        unitId: values.unitId,
        observationDate: values.auditDate ? values.auditDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        observationShift: values.shift || 'Morning',
        staffCategory: values.staffCategory || 'Doctor',
        moment1Before: values.moment1Before || 0,
        moment1Correct: values.moment1Correct || 0,
        moment2Before: values.moment2Before || 0,
        moment2Correct: values.moment2Correct || 0,
        moment3After: values.moment3After || 0,
        moment3Correct: values.moment3Correct || 0,
        moment4After: values.moment4After || 0,
        moment4Correct: values.moment4Correct || 0,
        moment5After: values.moment5After || 0,
        moment5Correct: values.moment5Correct || 0,
        productUsed: values.productUsed || 'ABHR',
        gloveUsage: values.gloveUsage,
        notes: values.findings,
      });
      message.success('Da luu ket qua kiem tra tuan thu');
      setIsAuditModalOpen(false);
      auditForm.resetFields();
      fetchData();
    } catch {
      message.warning('Khong the luu kiem tra tuan thu');
    } finally {
      setSubmitting(false);
    }
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
          <strong>${HOSPITAL_NAME}</strong><br/>
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
              <td>${dashboard?.ssiRate != null ? Math.round(dashboard.ssiRate) : haiCases.filter((c) => c.infectionType === 'SSI').length}</td>
              <td>${dashboard?.ssiRate != null ? dashboard.ssiRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
            <tr>
              <td>VAP - Viem phoi tho may</td>
              <td>${dashboard?.vapRate != null ? Math.round(dashboard.vapRate) : haiCases.filter((c) => c.infectionType === 'VAP').length}</td>
              <td>${dashboard?.vapRate != null ? dashboard.vapRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
            <tr>
              <td>CAUTI - NK tiet nieu</td>
              <td>${dashboard?.cautiRate != null ? Math.round(dashboard.cautiRate) : haiCases.filter((c) => c.infectionType === 'CAUTI').length}</td>
              <td>${dashboard?.cautiRate != null ? dashboard.cautiRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
            <tr>
              <td>CLABSI - NK huyet</td>
              <td>${dashboard?.clabsiRate != null ? Math.round(dashboard.clabsiRate) : haiCases.filter((c) => c.infectionType === 'CLABSI').length}</td>
              <td>${dashboard?.clabsiRate != null ? dashboard.clabsiRate.toFixed(2) + '/1000' : '-'}</td>
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
            ${haiCases.map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${c.patientName}</td>
                <td>${c.departmentName}</td>
                <td>${c.infectionType}</td>
                <td>${c.statusName}</td>
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

  const caseColumns: ColumnsType<HAISurveillanceDto> = [
    {
      title: 'Ma ca',
      dataIndex: 'caseCode',
      key: 'caseCode',
      width: 100,
    },
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">
            {record.departmentName} {record.bedNumber ? `- ${record.bedNumber}` : ''}
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
      title: 'MDRO',
      key: 'mdro',
      width: 80,
      render: (_, record) =>
        record.isMDRO ? (
          <Tag color="red">{record.mdroType || 'MDRO'}</Tag>
        ) : null,
    },
    {
      title: 'Muc do',
      key: 'severity',
      width: 100,
      render: (_, record) => getSeverityTag(record.severity, record.severityName),
    },
    {
      title: 'Ngay phat hien',
      dataIndex: 'diagnosisDate',
      key: 'diagnosisDate',
      width: 120,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trang thai',
      key: 'status',
      width: 100,
      render: (_, record) => getStatusTag(record.status, record.statusName),
    },
    {
      title: 'Cach ly',
      key: 'isolation',
      width: 100,
      render: (_, record) =>
        record.requiresIsolation ? (
          <Tag color="red" icon={<SafetyOutlined />}>
            Co
          </Tag>
        ) : null,
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

  const isolationColumns: ColumnsType<IsolationOrderDto> = [
    {
      title: 'Ma lenh',
      dataIndex: 'orderCode',
      key: 'orderCode',
      width: 110,
    },
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">
            {record.departmentName} {record.bedNumber ? `- ${record.bedNumber}` : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Loai cach ly',
      key: 'isolationType',
      width: 120,
      render: (_, record) => getIsolationTypeTag(record.isolationType),
    },
    {
      title: 'Ly do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Vi khuan',
      dataIndex: 'organism',
      key: 'organism',
      render: (text) => text || '-',
    },
    {
      title: 'Ngay bat dau',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trang thai',
      key: 'status',
      width: 100,
      render: (_, record) => getStatusTag(record.status, record.statusName),
    },
    {
      title: 'PPE',
      key: 'ppe',
      render: (_, record) =>
        record.ppeRequirements?.length > 0
          ? record.ppeRequirements.map((p, i) => (
              <Tag key={i} color="blue">
                {p}
              </Tag>
            ))
          : '-',
    },
  ];

  const hhColumns: ColumnsType<HandHygieneObservationDto> = [
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Ngay',
      dataIndex: 'observationDate',
      key: 'observationDate',
      width: 120,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Ca',
      dataIndex: 'observationShift',
      key: 'observationShift',
      width: 80,
    },
    {
      title: 'Doi tuong',
      dataIndex: 'staffCategoryName',
      key: 'staffCategoryName',
      width: 100,
    },
    {
      title: 'Tong co hoi',
      dataIndex: 'totalOpportunities',
      key: 'totalOpportunities',
      width: 100,
    },
    {
      title: 'Dung cach',
      dataIndex: 'correctActions',
      key: 'correctActions',
      width: 100,
    },
    {
      title: 'Ty le tuan thu',
      dataIndex: 'complianceRate',
      key: 'complianceRate',
      width: 140,
      render: (value) => (
        <Progress
          percent={Math.round(value || 0)}
          size="small"
          status={value >= 80 ? 'success' : value >= 60 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: 'Nguoi quan sat',
      dataIndex: 'observedByName',
      key: 'observedByName',
    },
  ];

  const outbreakColumns: ColumnsType<OutbreakDto> = [
    {
      title: 'Ma',
      dataIndex: 'outbreakCode',
      key: 'outbreakCode',
      width: 100,
    },
    {
      title: 'Ten',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Vi khuan',
      dataIndex: 'organism',
      key: 'organism',
    },
    {
      title: 'Khoa anh huong',
      key: 'departments',
      render: (_, record) =>
        record.affectedDepartmentNames?.map((d, i) => (
          <Tag key={i}>{d}</Tag>
        )) || '-',
    },
    {
      title: 'So ca',
      key: 'cases',
      width: 100,
      render: (_, record) => (
        <span>
          {record.confirmedCases} XN / {record.totalCases} tong
        </span>
      ),
    },
    {
      title: 'Muc do',
      key: 'severity',
      width: 100,
      render: (_, record) => getSeverityTag(record.severity, record.severityName),
    },
    {
      title: 'Trang thai',
      key: 'status',
      width: 100,
      render: (_, record) => getStatusTag(record.status, record.statusName),
    },
    {
      title: 'Ngay bat dau',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Kiem soat nhiem khuan
            </Title>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Lam moi
            </Button>
          </Col>
        </Row>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Ca dang theo doi"
                value={activeCasesCount}
                prefix={<BugOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Da xac nhan"
                value={confirmedCount}
                prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Cho dieu tra"
                value={pendingInvestigation}
                prefix={<AlertOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Dang cach ly"
                value={activeIsolationsCount}
                prefix={<SafetyOutlined style={{ color: '#722ed1' }} />}
                styles={{ content: { color: '#722ed1' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Dashboard metrics */}
        {dashboard && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="MDRO"
                  value={dashboard.mdroCases}
                  styles={{ content: { fontSize: 20 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Ve sinh tay"
                  value={dashboard.hhComplianceRate}
                  suffix="%"
                  styles={{
                    content: {
                      fontSize: 20,
                      color: dashboard.hhComplianceRate >= 80 ? '#52c41a' : '#faad14',
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Dich dang hoat dong"
                  value={dashboard.activeOutbreaks}
                  styles={{
                    content: {
                      fontSize: 20,
                      color: dashboard.activeOutbreaks > 0 ? '#ff4d4f' : '#52c41a',
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Canh bao"
                  value={dashboard.alertsCount}
                  styles={{
                    content: {
                      fontSize: 20,
                      color: dashboard.criticalAlerts > 0 ? '#ff4d4f' : undefined,
                    },
                  }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Alerts */}
        {confirmedCount > 0 && (
          <Alert
            title="Canh bao NKBV"
            description={`Hien co ${confirmedCount} ca nhiem khuan benh vien da xac nhan can theo doi`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {dashboard && dashboard.activeOutbreaks > 0 && (
          <Alert
            title="Canh bao dich"
            description={`Co ${dashboard.activeOutbreaks} dich dang hoat dong. Vui long kiem tra tab "Quan ly dich".`}
            type="error"
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
                  <Badge count={activeCasesCount} offset={[10, 0]}>
                    Ca nhiem khuan
                  </Badge>
                ),
                children: (
                  <Table
                    columns={caseColumns}
                    dataSource={haiCases}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: 'Khong co ca nhiem khuan nao' }}
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
                key: 'isolation',
                label: (
                  <Badge count={activeIsolationsCount} offset={[10, 0]}>
                    Cach ly
                  </Badge>
                ),
                children: (
                  <Table
                    columns={isolationColumns}
                    dataSource={isolationOrders}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: 'Khong co lenh cach ly nao' }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiet cach ly - ${record.patientName}`,
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Ma lenh">{record.orderCode}</Descriptions.Item>
                              <Descriptions.Item label="Benh nhan">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                              <Descriptions.Item label="Phong">{record.roomName || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Giuong">{record.bedNumber || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Loai cach ly">{record.isolationTypeName}</Descriptions.Item>
                              <Descriptions.Item label="Ly do" span={2}>{record.reason}</Descriptions.Item>
                              <Descriptions.Item label="Vi khuan">{record.organism || '-'}</Descriptions.Item>
                              <Descriptions.Item label="MDRO">{record.isMDRO ? 'Co' : 'Khong'}</Descriptions.Item>
                              <Descriptions.Item label="Ngay bat dau">{record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Ngay ket thuc">{record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : 'Chua ket thuc'}</Descriptions.Item>
                              <Descriptions.Item label="Yeu cau PPE" span={2}>
                                {record.ppeRequirements?.join(', ') || '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Han che tham benh" span={2}>
                                {record.visitorRestrictions || '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Chi dan dac biet" span={2}>
                                {record.specialInstructions || '-'}
                              </Descriptions.Item>
                            </Descriptions>
                          ),
                        });
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
                    {dashboard?.haiByDepartment && dashboard.haiByDepartment.length > 0 ? (
                      <Table
                        dataSource={dashboard.haiByDepartment}
                        columns={[
                          { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName' },
                          { title: 'So ca NK', dataIndex: 'haiCount', key: 'haiCount' },
                          {
                            title: 'Ty le (/1000 ngay)',
                            dataIndex: 'haiRate',
                            key: 'haiRate',
                            render: (val) => (val != null ? val.toFixed(2) : '-'),
                          },
                          { title: 'Ngay benh nhan', dataIndex: 'patientDays', key: 'patientDays' },
                        ]}
                        rowKey="departmentId"
                        pagination={false}
                        locale={{ emptyText: 'Chua co du lieu giam sat' }}
                        onRow={(record) => ({
                          onDoubleClick: () => {
                            Modal.info({
                              title: `Chi tiet giam sat - ${record.departmentName}`,
                              width: 500,
                              content: (
                                <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                  <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                                  <Descriptions.Item label="So ca NK">{record.haiCount}</Descriptions.Item>
                                  <Descriptions.Item label="Ty le NK">
                                    {record.haiRate?.toFixed(2) || '-'}/1000 ngay BN
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Ngay benh nhan">{record.patientDays}</Descriptions.Item>
                                </Descriptions>
                              ),
                            });
                          },
                          style: { cursor: 'pointer' },
                        })}
                      />
                    ) : (
                      <Table
                        dataSource={[]}
                        columns={[
                          { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName' },
                          { title: 'So ca NK', dataIndex: 'haiCount', key: 'haiCount' },
                          { title: 'Ty le', dataIndex: 'haiRate', key: 'haiRate' },
                        ]}
                        rowKey="departmentId"
                        locale={{ emptyText: 'Chua co du lieu giam sat' }}
                      />
                    )}
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
                      columns={hhColumns}
                      dataSource={hhObservations}
                      rowKey="id"
                      loading={loading}
                      locale={{ emptyText: 'Chua co du lieu kiem tra' }}
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: 'Chi tiet kiem tra tuan thu',
                            width: 600,
                            content: (
                              <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                                <Descriptions.Item label="Ngay">{record.observationDate ? dayjs(record.observationDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Nguoi quan sat">{record.observedByName}</Descriptions.Item>
                                <Descriptions.Item label="Ca">{record.observationShift}</Descriptions.Item>
                                <Descriptions.Item label="Doi tuong">{record.staffCategoryName}</Descriptions.Item>
                                <Descriptions.Item label="Ty le tuan thu">{Math.round(record.complianceRate || 0)}%</Descriptions.Item>
                                <Descriptions.Item label="Tong co hoi">{record.totalOpportunities}</Descriptions.Item>
                                <Descriptions.Item label="Dung cach">{record.correctActions}</Descriptions.Item>
                                <Descriptions.Item label="San pham">{record.productUsed}</Descriptions.Item>
                                <Descriptions.Item label="Gang tay">{record.gloveUsage || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ghi chu" span={2}>{record.notes || '-'}</Descriptions.Item>
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
                key: 'outbreaks',
                label: (
                  <Badge count={dashboard?.activeOutbreaks || 0} offset={[10, 0]}>
                    Quan ly dich
                  </Badge>
                ),
                children: (
                  <Table
                    columns={outbreakColumns}
                    dataSource={outbreaks}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: 'Khong co dich dang hoat dong' }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiet dich - ${record.name}`,
                          width: 700,
                          content: (
                            <>
                              <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Ten">{record.name}</Descriptions.Item>
                                <Descriptions.Item label="Vi khuan">{record.organism}</Descriptions.Item>
                                <Descriptions.Item label="Ngay bat dau">{record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ngay ket thuc">{record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : 'Chua ket thuc'}</Descriptions.Item>
                                <Descriptions.Item label="Tong ca">{record.totalCases}</Descriptions.Item>
                                <Descriptions.Item label="Xac nhan">{record.confirmedCases}</Descriptions.Item>
                                <Descriptions.Item label="Hoi phuc">{record.recoveredCases}</Descriptions.Item>
                                <Descriptions.Item label="Tu vong">{record.deaths}</Descriptions.Item>
                                <Descriptions.Item label="Nguon">{record.source || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Duong truyen">{record.transmissionMode || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Bao co quan" span={2}>
                                  {record.reportedToAuthority ? `Co - ${record.reportedDate ? dayjs(record.reportedDate).format('DD/MM/YYYY') : ''}` : 'Chua'}
                                </Descriptions.Item>
                              </Descriptions>
                              {record.controlMeasures?.length > 0 && (
                                <>
                                  <Divider>Bien phap kiem soat</Divider>
                                  <ul>
                                    {record.controlMeasures.map((m, i) => (
                                      <li key={i}>{m}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                              {record.timeline?.length > 0 && (
                                <>
                                  <Divider>Dien bien</Divider>
                                  <Timeline
                                    items={record.timeline.map((t) => ({
                                      color: t.eventType === 'Critical' ? 'red' : 'blue',
                                      content: (
                                        <>
                                          <Text strong>{dayjs(t.eventDate).format('DD/MM/YYYY')}</Text>
                                          {' - '}
                                          {t.description}
                                          {t.actionsTaken && (
                                            <div>
                                              <Text type="secondary">Hanh dong: {t.actionsTaken}</Text>
                                            </div>
                                          )}
                                        </>
                                      ),
                                    }))}
                                  />
                                </>
                              )}
                            </>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'guidelines',
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
                        <p>
                          <strong>Chi dinh:</strong>
                        </p>
                        <ul>
                          <li>MDRO (VRE, MRSA, CRE)</li>
                          <li>Clostridium difficile</li>
                          <li>Nhiem khuan da</li>
                        </ul>
                        <p>
                          <strong>Bien phap:</strong>
                        </p>
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
                        <p>
                          <strong>Chi dinh:</strong>
                        </p>
                        <ul>
                          <li>Cum</li>
                          <li>RSV</li>
                          <li>Ho ga</li>
                        </ul>
                        <p>
                          <strong>Bien phap:</strong>
                        </p>
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
                        <p>
                          <strong>Chi dinh:</strong>
                        </p>
                        <ul>
                          <li>Lao phoi</li>
                          <li>Soi</li>
                          <li>COVID-19</li>
                          <li>Thuy dau</li>
                        </ul>
                        <p>
                          <strong>Bien phap:</strong>
                        </p>
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
          confirmLoading={submitting}
          width={700}
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
                <Form.Item name="admissionId" label="Ma nhap vien" rules={[{ required: true, message: 'Vui long nhap ma nhap vien' }]}>
                  <Input placeholder="Ma nhap vien (Admission ID)" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="infectionType" label="Loai nhiem khuan" rules={[{ required: true, message: 'Vui long chon loai NK' }]}>
                  <Select placeholder="Chon loai NK">
                    {INFECTION_TYPES.map((t) => (
                      <Select.Option key={t.value} value={t.value}>
                        {t.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="infectionSite" label="Vi tri nhiem khuan">
                  <Input placeholder="VD: Vet mo bung, Phoi, Tiet nieu" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="onsetDate" label="Ngay khoi phat" rules={[{ required: true, message: 'Vui long chon ngay' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="organism" label="Vi khuan (neu biet)">
                  <Input placeholder="VD: Staphylococcus aureus" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="severity" label="Muc do" rules={[{ required: true }]}>
                  <Select placeholder="Chon muc do">
                    <Select.Option value={1}>Nhe</Select.Option>
                    <Select.Option value={2}>Trung binh</Select.Option>
                    <Select.Option value={3}>Nang</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="isMDRO" label="MDRO" valuePropName="checked" initialValue={false}>
                  <Select>
                    <Select.Option value={false}>Khong</Select.Option>
                    <Select.Option value={true}>Co</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="mdroType" label="Loai MDRO">
                  <Select placeholder="Chon loai MDRO" allowClear>
                    <Select.Option value="MRSA">MRSA</Select.Option>
                    <Select.Option value="VRE">VRE</Select.Option>
                    <Select.Option value="ESBL">ESBL</Select.Option>
                    <Select.Option value="CRE">CRE</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="deviceAssociated" label="Lien quan thiet bi" initialValue={false}>
                  <Select>
                    <Select.Option value={false}>Khong</Select.Option>
                    <Select.Option value={true}>Co</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="deviceType" label="Loai thiet bi">
                  <Select placeholder="Chon loai" allowClear>
                    <Select.Option value="Catheter">Catheter</Select.Option>
                    <Select.Option value="Ventilator">Tho may</Select.Option>
                    <Select.Option value="CentralLine">Catheter TM trung tam</Select.Option>
                    <Select.Option value="UrinaryCatheter">Sonde tieu</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="surgeryRelated" label="Lien quan phau thuat" initialValue={false}>
                  <Select>
                    <Select.Option value={false}>Khong</Select.Option>
                    <Select.Option value={true}>Co</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cdcCriteria" label="Tieu chi CDC">
                  <Input placeholder="VD: NHSN SSI criteria" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Mo ta chi tiet">
              <TextArea rows={3} placeholder="Mo ta dien bien, yeu to nguy co..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Investigation Modal */}
        <Modal
          title="Chi tiet dieu tra ca nhiem khuan"
          open={isInvestigationModalOpen}
          onCancel={() => {
            setIsInvestigationModalOpen(false);
            investigationForm.resetFields();
          }}
          onOk={() => investigationForm.submit()}
          confirmLoading={submitting}
          width={700}
        >
          {selectedCase && (
            <>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Ma ca">{selectedCase.caseCode}</Descriptions.Item>
                <Descriptions.Item label="Benh nhan">{selectedCase.patientName}</Descriptions.Item>
                <Descriptions.Item label="Khoa">{selectedCase.departmentName}</Descriptions.Item>
                <Descriptions.Item label="Giuong">{selectedCase.bedNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Loai NK">
                  {getInfectionTypeTag(selectedCase.infectionType)}
                </Descriptions.Item>
                <Descriptions.Item label="Trang thai">
                  {getStatusTag(selectedCase.status, selectedCase.statusName)}
                </Descriptions.Item>
                <Descriptions.Item label="Vi tri">{selectedCase.infectionSite || '-'}</Descriptions.Item>
                <Descriptions.Item label="Vi khuan">
                  {selectedCase.organism || 'Chua xac dinh'}
                </Descriptions.Item>
                <Descriptions.Item label="MDRO">
                  {selectedCase.isMDRO ? (
                    <Tag color="red">{selectedCase.mdroType || 'Co'}</Tag>
                  ) : (
                    'Khong'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Muc do">
                  {getSeverityTag(selectedCase.severity, selectedCase.severityName)}
                </Descriptions.Item>
                <Descriptions.Item label="Ngay phat hien">
                  {selectedCase.diagnosisDate ? dayjs(selectedCase.diagnosisDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngay khoi phat">
                  {selectedCase.onsetDate ? dayjs(selectedCase.onsetDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Nguoi bao cao">{selectedCase.reportedByName}</Descriptions.Item>
                <Descriptions.Item label="Ngay bao cao">
                  {selectedCase.reportedDate ? dayjs(selectedCase.reportedDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                {selectedCase.cultureSource && (
                  <Descriptions.Item label="Nguon cay" span={2}>
                    {selectedCase.cultureSource} - {selectedCase.cultureResult || 'Chua co ket qua'}
                  </Descriptions.Item>
                )}
                {selectedCase.riskFactors?.length > 0 && (
                  <Descriptions.Item label="Yeu to nguy co" span={2}>
                    {selectedCase.riskFactors.join(', ')}
                  </Descriptions.Item>
                )}
                {selectedCase.notes && (
                  <Descriptions.Item label="Ghi chu" span={2}>
                    {selectedCase.notes}
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Divider>Qua trinh dieu tra</Divider>

              <Timeline
                items={[
                  {
                    color: 'blue',
                    content: (
                      <>
                        {selectedCase.reportedDate
                          ? dayjs(selectedCase.reportedDate).format('DD/MM/YYYY')
                          : '-'}{' '}
                        - Bao cao ca nghi ngo boi {selectedCase.reportedByName}
                      </>
                    ),
                  },
                  ...(selectedCase.organism
                    ? [
                        {
                          color: 'orange' as const,
                          content: (
                            <>
                              Ket qua cay: {selectedCase.organism}
                              {selectedCase.antibioticSensitivity && (
                                <div>
                                  <Text type="secondary">
                                    KSD: {selectedCase.antibioticSensitivity}
                                  </Text>
                                </div>
                              )}
                            </>
                          ),
                        },
                      ]
                    : []),
                  ...(selectedCase.investigatedByName
                    ? [
                        {
                          color: 'green' as const,
                          content: (
                            <>
                              Dieu tra boi {selectedCase.investigatedByName}
                              {selectedCase.investigatedDate && (
                                <> - {dayjs(selectedCase.investigatedDate).format('DD/MM/YYYY')}</>
                              )}
                            </>
                          ),
                        },
                      ]
                    : []),
                  ...(selectedCase.status === 2
                    ? [
                        {
                          color: 'red' as const,
                          content: <>Xac nhan NKBV - {selectedCase.cdcCriteria || 'CDC criteria'}</>,
                        },
                      ]
                    : []),
                  ...(selectedCase.status >= 3
                    ? [
                        {
                          color: selectedCase.status === 3 ? ('green' as const) : ('default' as const),
                          content: <>{selectedCase.outcome || selectedCase.statusName}</>,
                        },
                      ]
                    : []),
                ]}
              />

              <Divider>Cap nhat</Divider>

              <Form form={investigationForm} layout="vertical" onFinish={handleUpdateInvestigation}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="status" label="Trang thai">
                      <Select defaultValue={selectedCase.status}>
                        <Select.Option value={1}>Nghi ngo</Select.Option>
                        <Select.Option value={2}>Xac nhan</Select.Option>
                        <Select.Option value={3}>Da khoi</Select.Option>
                        <Select.Option value={4}>Loai tru</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="outcome" label="Ket qua">
                      <Input placeholder="VD: Khoi hoan toan, Chuyen vien..." />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="notes" label="Ghi chu dieu tra">
                  <TextArea rows={3} placeholder="Mo ta ket qua dieu tra, bien phap da thuc hien..." />
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>

        {/* Audit / Hand Hygiene Observation Modal */}
        <Modal
          title="Kiem tra tuan thu KSNK - Quan sat ve sinh tay"
          open={isAuditModalOpen}
          onCancel={() => setIsAuditModalOpen(false)}
          onOk={() => auditForm.submit()}
          confirmLoading={submitting}
          width={700}
        >
          <Form form={auditForm} layout="vertical" onFinish={handleCreateAudit}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="departmentId" label="Khoa" rules={[{ required: true, message: 'Chon khoa' }]}>
                  <Input placeholder="Ma khoa (Department ID)" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="auditDate" label="Ngay quan sat" rules={[{ required: true, message: 'Chon ngay' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="shift" label="Ca" rules={[{ required: true }]}>
                  <Select placeholder="Chon ca">
                    <Select.Option value="Morning">Sang</Select.Option>
                    <Select.Option value="Afternoon">Chieu</Select.Option>
                    <Select.Option value="Night">Dem</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="staffCategory" label="Doi tuong" rules={[{ required: true }]}>
                  <Select placeholder="Chon doi tuong">
                    <Select.Option value="Doctor">Bac si</Select.Option>
                    <Select.Option value="Nurse">Dieu duong</Select.Option>
                    <Select.Option value="Allied">Ky thuat vien</Select.Option>
                    <Select.Option value="Support">Ho tro</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="productUsed" label="San pham su dung">
                  <Select placeholder="Chon san pham">
                    <Select.Option value="ABHR">Dung dich sat khuan tay nhanh</Select.Option>
                    <Select.Option value="Soap">Xa phong</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider>5 thoi diem ve sinh tay (WHO)</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment1Before" label="1. Truoc tiep xuc BN - Co hoi">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment1Correct" label="1. Truoc tiep xuc BN - Dung cach">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment2Before" label="2. Truoc thu thuat vo khuan - Co hoi">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment2Correct" label="2. Truoc thu thuat vo khuan - Dung cach">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment3After" label="3. Sau phoi nhiem dich co the - Co hoi">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment3Correct" label="3. Sau phoi nhiem dich co the - Dung cach">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment4After" label="4. Sau tiep xuc BN - Co hoi">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment4Correct" label="4. Sau tiep xuc BN - Dung cach">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment5After" label="5. Sau tiep xuc moi truong BN - Co hoi">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment5Correct" label="5. Sau tiep xuc moi truong BN - Dung cach">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="findings" label="Phat hien/Khuyen nghi">
              <TextArea rows={3} placeholder="Ghi chu, nhan xet, khuyen nghi..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default InfectionControl;
