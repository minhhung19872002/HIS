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
  Typography,
  Tabs,
  Statistic,
  Descriptions,
  Divider,
  message,
  Progress,
  Rate,
  Spin,
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
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getIncidents,
  getQualityIndicators,
  getAudits,
  getDashboard,
  getCAPAs,
  createIncident,
  investigateIncident,
  createAudit,
  getSatisfactionStatistics,
} from '../api/quality';
import type {
  IncidentReportDto,
  QualityIndicatorDto,
  InternalAuditDto,
  QualityDashboardDto,
  CAPADto,
  SatisfactionStatisticsDto,
} from '../api/quality';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Title, Text } = Typography;
const { TextArea } = Input;

const INCIDENT_TYPES = [
  { value: 'MedicationError', label: 'Sai sot thuoc' },
  { value: 'Fall', label: 'Te nga' },
  { value: 'HAI', label: 'Nhiem khuan' },
  { value: 'PatientSafety', label: 'Sai dinh danh' },
  { value: 'Equipment', label: 'Thiet bi hong' },
  { value: 'Other', label: 'Khac' },
];

const SEVERITY_LEVELS = [
  { value: 1, label: 'Suyt xay ra', color: 'blue' },
  { value: 2, label: 'Khong ton thuong', color: 'cyan' },
  { value: 3, label: 'Nhe', color: 'green' },
  { value: 4, label: 'Vua', color: 'orange' },
  { value: 5, label: 'Nang', color: 'red' },
  { value: 6, label: 'Trong yeu', color: 'volcano' },
];

const Quality: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<IncidentReportDto[]>([]);
  const [indicators, setIndicators] = useState<QualityIndicatorDto[]>([]);
  const [audits, setAudits] = useState<InternalAuditDto[]>([]);
  const [dashboard, setDashboard] = useState<QualityDashboardDto | null>(null);
  const [capas, setCAPAs] = useState<CAPADto[]>([]);
  const [satisfactionStats, setSatisfactionStats] = useState<SatisfactionStatisticsDto | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReportDto | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [reportForm] = Form.useForm();
  const [investigationForm] = Form.useForm();
  const [auditForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

      const results = await Promise.allSettled([
        getIncidents({ page: 1, pageSize: 100 }),
        getQualityIndicators(undefined, undefined, true),
        getAudits(),
        getDashboard(today),
        getCAPAs(),
        getSatisfactionStatistics(monthStart, today),
      ]);

      // Incidents
      if (results[0].status === 'fulfilled') {
        const data = results[0].value?.data;
        if (data) {
          setIncidents(Array.isArray(data) ? data : (data as any).items || []);
        }
      } else {
        message.warning('Khong the tai danh sach su co');
      }

      // Indicators
      if (results[1].status === 'fulfilled') {
        const data = results[1].value?.data;
        if (data) {
          setIndicators(Array.isArray(data) ? data : []);
        }
      } else {
        message.warning('Khong the tai chi so chat luong');
      }

      // Audits
      if (results[2].status === 'fulfilled') {
        const data = results[2].value?.data;
        if (data) {
          setAudits(Array.isArray(data) ? data : []);
        }
      } else {
        message.warning('Khong the tai danh sach audit');
      }

      // Dashboard
      if (results[3].status === 'fulfilled') {
        const data = results[3].value?.data;
        if (data) {
          setDashboard(data);
        }
      } else {
        // Dashboard is supplementary, no warning needed
      }

      // CAPAs
      if (results[4].status === 'fulfilled') {
        const data = results[4].value?.data;
        if (data) {
          setCAPAs(Array.isArray(data) ? data : []);
        }
      } else {
        // CAPAs are supplementary
      }

      // Satisfaction statistics
      if (results[5].status === 'fulfilled') {
        const data = results[5].value?.data;
        if (data) {
          setSatisfactionStats(data);
        }
      } else {
        // Satisfaction stats are supplementary
      }
    } catch {
      message.warning('Khong the tai du lieu chat luong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or computed from local data
  const openIncidents = dashboard?.openIncidents ?? incidents.filter(
    (i) => i.status !== 5 // Not Closed
  ).length;
  const criticalKPIs = dashboard?.indicatorsCritical ?? indicators.filter(
    (i) => i.criticalThreshold != null && i.criticalThreshold > 0
  ).length;
  const upcomingAudits = dashboard?.auditsPlanned ?? audits.filter(
    (a) => a.status === 1 // Planned
  ).length;

  const getSeverityTag = (severity: number) => {
    const config = SEVERITY_LEVELS.find((s) => s.value === severity);
    return <Tag color={config?.color || 'default'}>{config?.label || `Cap ${severity}`}</Tag>;
  };

  const getIncidentStatusTag = (status: number) => {
    const config: Record<number, { color: string; text: string }> = {
      1: { color: 'blue', text: 'Da bao cao' },
      2: { color: 'orange', text: 'Dang dieu tra' },
      3: { color: 'cyan', text: 'Da dieu tra' },
      4: { color: 'gold', text: 'Cho xu ly' },
      5: { color: 'green', text: 'Da dong' },
    };
    const c = config[status] || { color: 'default', text: `Trang thai ${status}` };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleReportIncident = async (values: any) => {
    try {
      await createIncident({
        incidentDate: values.incidentDate.format('YYYY-MM-DD'),
        incidentTime: values.incidentDate.format('HH:mm'),
        departmentId: values.departmentId,
        locationDescription: values.locationDescription || '',
        incidentType: values.incidentType,
        severity: values.severity,
        patientId: values.patientId,
        description: values.description,
        immediateActions: values.immediateActions,
        isReportable: values.isReportable ?? false,
        notes: values.notes,
      });
      setIsReportModalOpen(false);
      reportForm.resetFields();
      message.success('Da bao cao su co');
      fetchData();
    } catch {
      message.warning('Khong the bao cao su co');
    }
  };

  const handleInvestigation = async (values: any) => {
    if (!selectedIncident) return;

    try {
      await investigateIncident({
        incidentId: selectedIncident.id,
        investigationFindings: values.investigationFindings || '',
        rootCauseAnalysis: values.rootCauseAnalysis,
        rcaMethod: values.rcaMethod,
        contributingFactors: values.contributingFactors,
        correctiveActions: values.correctiveActions || [],
        preventiveMeasures: values.preventiveMeasures,
        lessonLearned: values.lessonLearned,
      });
      setIsInvestigationModalOpen(false);
      investigationForm.resetFields();
      message.success('Da cap nhat ket qua dieu tra');
      fetchData();
    } catch {
      message.warning('Khong the cap nhat dieu tra');
    }
  };

  const handleAddAudit = async (values: any) => {
    try {
      await createAudit({
        auditType: values.auditType,
        title: values.title,
        scope: values.scope || '',
        objective: values.objective || '',
        criteria: values.criteria || '',
        departmentId: values.departmentId,
        scheduledDate: values.scheduledDate.format('YYYY-MM-DD'),
        leadAuditorId: values.leadAuditorId || '',
        auditTeam: [],
        notes: values.notes,
      });
      message.success('Da len lich audit');
      setIsAuditModalOpen(false);
      auditForm.resetFields();
      fetchData();
    } catch {
      message.warning('Khong the tao audit');
    }
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
          <strong>${HOSPITAL_NAME}</strong><br/>
          Phong Quan ly chat luong
        </div>

        <div class="title">BAO CAO CHAT LUONG THANG ${dayjs().format('MM/YYYY')}</div>

        <h3>1. Chi so chat luong</h3>
        <table>
          <tr>
            <th>Chi so</th>
            <th>Muc tieu</th>
            <th>Danh gia</th>
          </tr>
          ${indicators.map((ind) => `
            <tr>
              <td>${ind.name}</td>
              <td>${ind.targetValue}</td>
              <td>${ind.isActive ? 'Dang theo doi' : 'Tam ngung'}</td>
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
            <td>Da dong</td>
            <td>${incidents.filter((i) => i.status === 5).length}</td>
          </tr>
          <tr>
            <td>Chua xu ly</td>
            <td>${incidents.filter((i) => i.status !== 5).length}</td>
          </tr>
        </table>

        <h3>3. Audit</h3>
        <table>
          <tr>
            <th>Ten audit</th>
            <th>Khoa/Phong</th>
            <th>Ngay</th>
            <th>Trang thai</th>
          </tr>
          ${audits.map((a) => `
            <tr>
              <td>${a.title}</td>
              <td>${a.departmentName}</td>
              <td>${a.scheduledDate}</td>
              <td>${a.statusName}</td>
            </tr>
          `).join('')}
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

  const incidentColumns: ColumnsType<IncidentReportDto> = [
    {
      title: 'Ma',
      dataIndex: 'incidentCode',
      key: 'incidentCode',
      width: 100,
    },
    {
      title: 'Ngay',
      dataIndex: 'incidentDate',
      key: 'incidentDate',
      width: 100,
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Loai su co',
      dataIndex: 'incidentTypeName',
      key: 'incidentTypeName',
      render: (val, record) => val || record.incidentType,
    },
    {
      title: 'Muc do',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      render: (severity, record) => record.severityName ? (
        <Tag color={SEVERITY_LEVELS.find(s => s.value === severity)?.color || 'default'}>
          {record.severityName}
        </Tag>
      ) : getSeverityTag(severity),
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
      render: (status, record) => record.statusName ? (
        <Tag color={
          status === 1 ? 'blue' : status === 2 ? 'orange' : status === 3 ? 'cyan' : status === 4 ? 'gold' : 'green'
        }>
          {record.statusName}
        </Tag>
      ) : getIncidentStatusTag(status),
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
            investigationForm.setFieldsValue({
              investigationFindings: record.investigationFindings,
              rootCauseAnalysis: record.rootCauseAnalysis,
              preventiveMeasures: record.preventiveMeasures,
              lessonLearned: record.lessonLearned,
            });
            setIsInvestigationModalOpen(true);
          }}
        >
          Chi tiet
        </Button>
      ),
    },
  ];

  const auditColumns: ColumnsType<InternalAuditDto> = [
    {
      title: 'Ma',
      dataIndex: 'auditCode',
      key: 'auditCode',
      width: 100,
    },
    {
      title: 'Ten audit',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Loai',
      dataIndex: 'auditType',
      key: 'auditType',
      render: (type, record) => record.auditTypeName || (() => {
        const labels: Record<string, string> = {
          Scheduled: 'Dinh ky',
          Unscheduled: 'Dot xuat',
          FollowUp: 'Theo doi',
          Surveillance: 'Giam sat',
        };
        return labels[type] || type;
      })(),
    },
    {
      title: 'Khoa/Phong',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Ngay',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Truong doan',
      dataIndex: 'leadAuditorName',
      key: 'leadAuditorName',
    },
    {
      title: 'Phat hien',
      dataIndex: 'totalFindings',
      key: 'totalFindings',
      width: 80,
      render: (val) => val ?? '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const config: Record<number, { color: string; text: string }> = {
          1: { color: 'blue', text: 'Da len lich' },
          2: { color: 'orange', text: 'Dang thuc hien' },
          3: { color: 'green', text: 'Hoan thanh' },
          4: { color: 'cyan', text: 'Theo doi' },
          5: { color: 'default', text: 'Da dong' },
        };
        const c = config[status];
        return <Tag color={c?.color || 'default'}>{record.statusName || c?.text || `Trang thai ${status}`}</Tag>;
      },
    },
  ];

  // CAPA columns
  const capaColumns: ColumnsType<CAPADto> = [
    {
      title: 'Ma',
      dataIndex: 'capaCode',
      key: 'capaCode',
      width: 100,
    },
    {
      title: 'Tieu de',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Nguon',
      dataIndex: 'sourceTypeName',
      key: 'sourceTypeName',
      render: (val, record) => val || record.sourceType,
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Uu tien',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (priority, record) => {
        const colors: Record<number, string> = { 1: 'default', 2: 'blue', 3: 'orange', 4: 'red' };
        return <Tag color={colors[priority] || 'default'}>{record.priorityName || `P${priority}`}</Tag>;
      },
    },
    {
      title: 'Nguoi chiu TN',
      dataIndex: 'responsiblePersonName',
      key: 'responsiblePersonName',
    },
    {
      title: 'Han',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 100,
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const config: Record<number, { color: string }> = {
          1: { color: 'blue' },
          2: { color: 'orange' },
          3: { color: 'gold' },
          4: { color: 'green' },
          5: { color: 'default' },
        };
        return <Tag color={config[status]?.color || 'default'}>{record.statusName || `Trang thai ${status}`}</Tag>;
      },
    },
  ];

  // Compute indicator display values from QualityIndicatorDto
  const getIndicatorStatus = (ind: QualityIndicatorDto): 'good' | 'warning' | 'critical' => {
    // Without actual measured values we rely on thresholds being defined
    if (ind.criticalThreshold != null && ind.criticalThreshold > 0) return 'critical';
    if (ind.warningThreshold != null && ind.warningThreshold > 0) return 'warning';
    return 'good';
  };

  // Use dashboard QI trends to get current values if available
  const getIndicatorCurrentValue = (ind: QualityIndicatorDto): number | null => {
    if (dashboard?.qiTrends) {
      const trend = dashboard.qiTrends.find(t => t.indicatorId === ind.id);
      if (trend) return trend.currentValue;
    }
    return null;
  };

  const getIndicatorTrendStatus = (ind: QualityIndicatorDto): string => {
    if (dashboard?.qiTrends) {
      const trend = dashboard.qiTrends.find(t => t.indicatorId === ind.id);
      if (trend) return trend.trend;
    }
    return 'Stable';
  };

  return (
    <Spin spinning={loading}>
      <div>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>Quan ly chat luong</Title>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Lam moi
            </Button>
          </Col>
        </Row>

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

        {/* Extra dashboard stats row if available */}
        {dashboard && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic title="Su co thang nay" value={dashboard.incidentsThisMonth} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic title="Audit hoan thanh" value={dashboard.auditsCompleted} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="Hai long BN"
                  value={dashboard.overallSatisfaction}
                  suffix="%"
                  styles={{ content: { color: dashboard.overallSatisfaction >= 80 ? '#52c41a' : '#faad14' } }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="CAPA qua han"
                  value={dashboard.overdueCAPAs}
                  styles={{ content: { color: dashboard.overdueCAPAs > 0 ? '#ff4d4f' : '#52c41a' } }}
                />
              </Card>
            </Col>
          </Row>
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
                children: indicators.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    Chua co chi so chat luong nao
                  </div>
                ) : (
                  <Row gutter={[16, 16]}>
                    {indicators.map((ind) => {
                      const currentValue = getIndicatorCurrentValue(ind);
                      const indStatus = dashboard?.qiTrends?.find(t => t.indicatorId === ind.id)?.status || 'Met';
                      const displayStatus = indStatus === 'Met' ? 'good' : indStatus === 'Warning' ? 'warning' : 'critical';
                      return (
                        <Col key={ind.id} xs={24} sm={12} lg={8}>
                          <Card size="small">
                            <Space orientation="vertical" style={{ width: '100%' }}>
                              <Text strong>{ind.name}</Text>
                              <Text type="secondary">{ind.categoryName || ind.category}</Text>
                              <Row justify="space-between" align="middle">
                                <Col>
                                  {currentValue != null ? (
                                    <Statistic
                                      value={currentValue}
                                      styles={{ content: {
                                        color:
                                          displayStatus === 'good'
                                            ? '#52c41a'
                                            : displayStatus === 'warning'
                                            ? '#faad14'
                                            : '#ff4d4f',
                                      } }}
                                    />
                                  ) : (
                                    <Text type="secondary">Chua co du lieu</Text>
                                  )}
                                </Col>
                                <Col>
                                  <Text type="secondary">Muc tieu: {ind.targetValue}</Text>
                                </Col>
                              </Row>
                              {currentValue != null && (
                                <Progress
                                  percent={Math.min(100, (currentValue / ind.targetValue) * 100)}
                                  status={displayStatus === 'critical' ? 'exception' : undefined}
                                  showInfo={false}
                                />
                              )}
                              <Row justify="space-between">
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {ind.collectionFrequency} | {ind.domainName || ind.domain}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {getIndicatorTrendStatus(ind)}
                                </Text>
                              </Row>
                            </Space>
                          </Card>
                        </Col>
                      );
                    })}
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
                        investigationForm.setFieldsValue({
                          investigationFindings: record.investigationFindings,
                          rootCauseAnalysis: record.rootCauseAnalysis,
                          preventiveMeasures: record.preventiveMeasures,
                          lessonLearned: record.lessonLearned,
                        });
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
                            title: `Chi tiet Audit - ${record.auditCode}`,
                            width: 600,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Tieu de">{record.title}</Descriptions.Item>
                                <Descriptions.Item label="Khoa/Phong">{record.departmentName}</Descriptions.Item>
                                <Descriptions.Item label="Loai">{record.auditTypeName || record.auditType}</Descriptions.Item>
                                <Descriptions.Item label="Ngay du kien">{record.scheduledDate ? dayjs(record.scheduledDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ngay thuc te">{record.actualDate ? dayjs(record.actualDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Truong doan">{record.leadAuditorName}</Descriptions.Item>
                                <Descriptions.Item label="Pham vi">{record.scope || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Muc tieu">{record.objective || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Tong phat hien">{record.totalFindings ?? '-'}</Descriptions.Item>
                                <Descriptions.Item label="Nghiem trong">{record.criticalFindings ?? '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trang thai">{record.statusName}</Descriptions.Item>
                                <Descriptions.Item label="Ket luan">{record.overallConclusion || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ghi chu">{record.notes || '-'}</Descriptions.Item>
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
                key: 'capa',
                label: `CAPA (${capas.length})`,
                children: (
                  <Table
                    columns={capaColumns}
                    dataSource={capas}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `CAPA - ${record.capaCode}`,
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Tieu de">{record.title}</Descriptions.Item>
                              <Descriptions.Item label="Mo ta">{record.description}</Descriptions.Item>
                              <Descriptions.Item label="Van de">{record.problemStatement}</Descriptions.Item>
                              <Descriptions.Item label="Nguyen nhan goc">{record.rootCauseAnalysis || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Nguoi chiu TN">{record.responsiblePersonName}</Descriptions.Item>
                              <Descriptions.Item label="Han">{record.dueDate ? dayjs(record.dueDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Trang thai">{record.statusName}</Descriptions.Item>
                              <Descriptions.Item label="Hanh dong khac phuc">
                                {record.correctiveActions?.length > 0
                                  ? record.correctiveActions.map(a => a.actionDescription).join('; ')
                                  : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Hanh dong phong ngua">
                                {record.preventiveActions?.length > 0
                                  ? record.preventiveActions.map(a => a.actionDescription).join('; ')
                                  : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Ghi chu">{record.notes || '-'}</Descriptions.Item>
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
                          ].map((item) => (
                          <div key={item} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>{item}</div>
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
                          ].map((item) => (
                          <div key={item} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>{item}</div>
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
                          ].map((item) => (
                          <div key={item} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>{item}</div>
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
                            <Rate disabled value={satisfactionStats
                              ? Math.round(satisfactionStats.averageSatisfaction / 20)
                              : (dashboard ? Math.round(dashboard.overallSatisfaction / 20) : 4)
                            } />
                          </Col>
                          <Col>
                            <Statistic
                              value={satisfactionStats?.averageSatisfaction ?? dashboard?.overallSatisfaction ?? 0}
                              suffix={satisfactionStats ? '%' : '%'}
                            />
                          </Col>
                        </Row>
                        {satisfactionStats && (
                          <div style={{ marginTop: 12 }}>
                            <Text type="secondary">NPS Score: </Text>
                            <Tag color={satisfactionStats.npsScore >= 50 ? 'green' : satisfactionStats.npsScore >= 0 ? 'orange' : 'red'}>
                              {satisfactionStats.npsScore}
                            </Tag>
                          </div>
                        )}
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card title="Ty le phan hoi">
                        <Progress percent={satisfactionStats?.responseRate ?? 0} />
                        <Text type="secondary">
                          {satisfactionStats
                            ? `${satisfactionStats.completedSurveys}/${satisfactionStats.totalSurveys} phieu thu thap`
                            : dashboard
                            ? `${dashboard.surveysCompleted} phieu hoan thanh`
                            : 'Chua co du lieu'}
                        </Text>
                      </Card>
                    </Col>
                    {satisfactionStats?.byDepartment && satisfactionStats.byDepartment.length > 0 && (
                      <Col span={24}>
                        <Card title="Theo khoa/phong" size="small">
                          <Table
                            size="small"
                            dataSource={satisfactionStats.byDepartment}
                            rowKey="departmentId"
                            pagination={false}
                            columns={[
                              { title: 'Khoa/Phong', dataIndex: 'departmentName', key: 'departmentName' },
                              { title: 'So phieu', dataIndex: 'surveyCount', key: 'surveyCount', width: 80 },
                              {
                                title: 'Diem hai long',
                                dataIndex: 'satisfactionScore',
                                key: 'satisfactionScore',
                                width: 120,
                                render: (val: number) => (
                                  <Tag color={val >= 80 ? 'green' : val >= 60 ? 'orange' : 'red'}>{val}%</Tag>
                                ),
                              },
                              {
                                title: 'NPS',
                                dataIndex: 'npsScore',
                                key: 'npsScore',
                                width: 80,
                              },
                            ]}
                          />
                        </Card>
                      </Col>
                    )}
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
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="departmentId" label="Khoa/Phong" rules={[{ required: true }]}>
                  <Select placeholder="Chon khoa/phong">
                    <Select.Option value="noi-khoa">Noi khoa</Select.Option>
                    <Select.Option value="ngoai-khoa">Ngoai khoa</Select.Option>
                    <Select.Option value="pttt">PTTT</Select.Option>
                    <Select.Option value="cap-cuu">Cap cuu</Select.Option>
                    <Select.Option value="icu">ICU</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="incidentType" label="Loai su co" rules={[{ required: true }]}>
                  <Select placeholder="Chon loai su co">
                    {INCIDENT_TYPES.map((t) => (
                      <Select.Option key={t.value} value={t.value}>
                        {t.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="severity" label="Muc do" rules={[{ required: true }]}>
                  <Select placeholder="Chon muc do">
                    {SEVERITY_LEVELS.map((s) => (
                      <Select.Option key={s.value} value={s.value}>
                        {s.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="locationDescription" label="Vi tri xay ra">
              <Input placeholder="VD: Phong benh 301, nha ve sinh tang 2..." />
            </Form.Item>
            <Form.Item name="description" label="Mo ta su co" rules={[{ required: true }]}>
              <TextArea rows={4} />
            </Form.Item>
            <Form.Item name="immediateActions" label="Xu ly ban dau">
              <TextArea rows={2} placeholder="Cac bien phap da thuc hien ngay..." />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientId" label="Ma benh nhan (neu co)">
                  <Input placeholder="BN-XXXX" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="isReportable" label="Bao cao co quan">
                  <Select defaultValue={false}>
                    <Select.Option value={true}>Co</Select.Option>
                    <Select.Option value={false}>Khong</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chu them">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Investigation Modal */}
        <Modal
          title="Chi tiet su co"
          open={isInvestigationModalOpen}
          onCancel={() => {
            setIsInvestigationModalOpen(false);
            investigationForm.resetFields();
          }}
          onOk={() => investigationForm.submit()}
          width={700}
        >
          {selectedIncident && (
            <>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Ma su co">
                  {selectedIncident.incidentCode}
                </Descriptions.Item>
                <Descriptions.Item label="Ngay bao cao">
                  {selectedIncident.reportedDate ? dayjs(selectedIncident.reportedDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngay xay ra">
                  {selectedIncident.incidentDate ? dayjs(selectedIncident.incidentDate).format('DD/MM/YYYY HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Khoa">{selectedIncident.departmentName}</Descriptions.Item>
                <Descriptions.Item label="Loai">{selectedIncident.incidentTypeName || selectedIncident.incidentType}</Descriptions.Item>
                <Descriptions.Item label="Muc do">
                  {selectedIncident.severityName
                    ? <Tag color={SEVERITY_LEVELS.find(s => s.value === selectedIncident.severity)?.color}>{selectedIncident.severityName}</Tag>
                    : getSeverityTag(selectedIncident.severity)}
                </Descriptions.Item>
                <Descriptions.Item label="Mo ta" span={2}>
                  {selectedIncident.description}
                </Descriptions.Item>
                {selectedIncident.immediateActions && (
                  <Descriptions.Item label="Xu ly ban dau" span={2}>
                    {selectedIncident.immediateActions}
                  </Descriptions.Item>
                )}
                {selectedIncident.patientName && (
                  <Descriptions.Item label="Benh nhan" span={2}>
                    {selectedIncident.patientCode} - {selectedIncident.patientName}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Nguoi bao cao" span={2}>
                  {selectedIncident.reportedByName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Trang thai" span={2}>
                  {getIncidentStatusTag(selectedIncident.status)}
                </Descriptions.Item>
              </Descriptions>

              <Divider>Phan tich nguyen nhan goc (RCA)</Divider>

              <Form form={investigationForm} layout="vertical" onFinish={handleInvestigation}>
                <Form.Item
                  name="investigationFindings"
                  label="Ket qua dieu tra"
                >
                  <TextArea rows={3} placeholder="Ket qua dieu tra chi tiet..." />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item
                      name="rootCauseAnalysis"
                      label="Nguyen nhan goc"
                    >
                      <TextArea rows={3} placeholder="Su dung phuong phap 5 Whys, Fishbone..." />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="rcaMethod" label="Phuong phap RCA">
                      <Select placeholder="Chon">
                        <Select.Option value="5Whys">5 Whys</Select.Option>
                        <Select.Option value="Fishbone">Fishbone</Select.Option>
                        <Select.Option value="FMEA">FMEA</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  name="preventiveMeasures"
                  label="Bien phap phong ngua"
                >
                  <TextArea rows={2} />
                </Form.Item>
                <Form.Item
                  name="lessonLearned"
                  label="Bai hoc kinh nghiem"
                >
                  <TextArea rows={2} />
                </Form.Item>
              </Form>

              {/* Existing corrective actions */}
              {selectedIncident.correctiveActions && selectedIncident.correctiveActions.length > 0 && (
                <>
                  <Divider>Hanh dong khac phuc</Divider>
                  <Table
                    size="small"
                    dataSource={selectedIncident.correctiveActions}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      { title: 'Hanh dong', dataIndex: 'actionDescription', key: 'actionDescription' },
                      { title: 'Loai', dataIndex: 'actionType', key: 'actionType', width: 100 },
                      { title: 'Nguoi thuc hien', dataIndex: 'responsiblePersonName', key: 'responsiblePersonName' },
                      { title: 'Han', dataIndex: 'dueDate', key: 'dueDate', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
                      { title: 'Trang thai', dataIndex: 'statusName', key: 'statusName', width: 100 },
                    ]}
                  />
                </>
              )}
            </>
          )}
        </Modal>

        {/* Audit Modal */}
        <Modal
          title="Len lich audit"
          open={isAuditModalOpen}
          onCancel={() => setIsAuditModalOpen(false)}
          onOk={() => auditForm.submit()}
          width={600}
        >
          <Form form={auditForm} layout="vertical" onFinish={handleAddAudit}>
            <Form.Item name="title" label="Ten audit" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="auditType" label="Loai" rules={[{ required: true }]}>
                  <Select placeholder="Chon loai audit">
                    <Select.Option value="Scheduled">Dinh ky</Select.Option>
                    <Select.Option value="Unscheduled">Dot xuat</Select.Option>
                    <Select.Option value="FollowUp">Theo doi</Select.Option>
                    <Select.Option value="Surveillance">Giam sat</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="departmentId" label="Khoa/Phong" rules={[{ required: true }]}>
                  <Select placeholder="Chon khoa/phong">
                    <Select.Option value="toan-vien">Toan vien</Select.Option>
                    <Select.Option value="noi-khoa">Noi khoa</Select.Option>
                    <Select.Option value="ngoai-khoa">Ngoai khoa</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="scheduledDate" label="Ngay" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="leadAuditorId" label="Truong doan audit">
                  <Input placeholder="ID nguoi thuc hien" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="scope" label="Pham vi">
              <TextArea rows={2} placeholder="Pham vi audit..." />
            </Form.Item>
            <Form.Item name="objective" label="Muc tieu">
              <TextArea rows={2} placeholder="Muc tieu audit..." />
            </Form.Item>
            <Form.Item name="criteria" label="Tieu chi">
              <Input placeholder="VD: ISO 9001:2015, JCI..." />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Quality;
