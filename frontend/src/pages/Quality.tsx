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
  { value: 'MedicationError', label: 'Sai sót thuốc' },
  { value: 'Fall', label: 'Té ngã' },
  { value: 'HAI', label: 'Nhiễm khuẩn' },
  { value: 'PatientSafety', label: 'Sai định danh' },
  { value: 'Equipment', label: 'Thiết bị hỏng' },
  { value: 'Other', label: 'Khác' },
];

const SEVERITY_LEVELS = [
  { value: 1, label: 'Suýt xảy ra', color: 'blue' },
  { value: 2, label: 'Không tổn thương', color: 'cyan' },
  { value: 3, label: 'Nhẹ', color: 'green' },
  { value: 4, label: 'Vừa', color: 'orange' },
  { value: 5, label: 'Nặng', color: 'red' },
  { value: 6, label: 'Trọng yếu', color: 'volcano' },
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
        message.warning('Không thể tải danh sách sự cố');
      }

      // Indicators
      if (results[1].status === 'fulfilled') {
        const data = results[1].value?.data;
        if (data) {
          setIndicators(Array.isArray(data) ? data : []);
        }
      } else {
        message.warning('Không thể tải chỉ số chất lượng');
      }

      // Audits
      if (results[2].status === 'fulfilled') {
        const data = results[2].value?.data;
        if (data) {
          setAudits(Array.isArray(data) ? data : []);
        }
      } else {
        message.warning('Không thể tải danh sách audit');
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
      message.warning('Không thể tải dữ liệu chất lượng');
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
    return <Tag color={config?.color || 'default'}>{config?.label || `Cấp ${severity}`}</Tag>;
  };

  const getIncidentStatusTag = (status: number) => {
    const config: Record<number, { color: string; text: string }> = {
      1: { color: 'blue', text: 'Đã báo cáo' },
      2: { color: 'orange', text: 'Đang điều tra' },
      3: { color: 'cyan', text: 'Đã điều tra' },
      4: { color: 'gold', text: 'Chờ xử lý' },
      5: { color: 'green', text: 'Đã đóng' },
    };
    const c = config[status] || { color: 'default', text: `Trạng thái ${status}` };
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
      message.success('Đã báo cáo sự cố');
      fetchData();
    } catch {
      message.warning('Không thể báo cáo sự cố');
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
      message.success('Đã cập nhật kết quả điều tra');
      fetchData();
    } catch {
      message.warning('Không thể cập nhật điều tra');
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
      message.success('Đã lên lịch audit');
      setIsAuditModalOpen(false);
      auditForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể tạo audit');
    }
  };

  const executePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Báo cáo chất lượng</title>
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
          Phòng Quản lý chất lượng
        </div>

        <div class="title">BÁO CÁO CHẤT LƯỢNG THÁNG ${dayjs().format('MM/YYYY')}</div>

        <h3>1. Chỉ số chất lượng</h3>
        <table>
          <tr>
            <th>Chỉ số</th>
            <th>Mục tiêu</th>
            <th>Đánh giá</th>
          </tr>
          ${indicators.map((ind) => `
            <tr>
              <td>${ind.name}</td>
              <td>${ind.targetValue}</td>
              <td>${ind.isActive ? 'Đang theo dõi' : 'Tạm ngưng'}</td>
            </tr>
          `).join('')}
        </table>

        <h3>2. Sự cố y khoa</h3>
        <table>
          <tr>
            <th>Loại</th>
            <th>Số lượng</th>
          </tr>
          <tr>
            <td>Tổng sự cố</td>
            <td>${incidents.length}</td>
          </tr>
          <tr>
            <td>Đã đóng</td>
            <td>${incidents.filter((i) => i.status === 5).length}</td>
          </tr>
          <tr>
            <td>Chưa xử lý</td>
            <td>${incidents.filter((i) => i.status !== 5).length}</td>
          </tr>
        </table>

        <h3>3. Audit</h3>
        <table>
          <tr>
            <th>Tên audit</th>
            <th>Khoa/Phòng</th>
            <th>Ngày</th>
            <th>Trạng thái</th>
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
          <p>Ngày ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Trưởng phòng QLCL</strong></p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const incidentColumns: ColumnsType<IncidentReportDto> = [
    {
      title: 'Mã',
      dataIndex: 'incidentCode',
      key: 'incidentCode',
      width: 100,
    },
    {
      title: 'Ngày',
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
      title: 'Loại sự cố',
      dataIndex: 'incidentTypeName',
      key: 'incidentTypeName',
      render: (val, record) => val || record.incidentType,
    },
    {
      title: 'Mức độ',
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
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Trạng thái',
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
      title: 'Thao tác',
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
          Chi tiết
        </Button>
      ),
    },
  ];

  const auditColumns: ColumnsType<InternalAuditDto> = [
    {
      title: 'Mã',
      dataIndex: 'auditCode',
      key: 'auditCode',
      width: 100,
    },
    {
      title: 'Tên audit',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Loại',
      dataIndex: 'auditType',
      key: 'auditType',
      render: (type, record) => record.auditTypeName || (() => {
        const labels: Record<string, string> = {
          Scheduled: 'Định kỳ',
          Unscheduled: 'Đột xuất',
          FollowUp: 'Theo dõi',
          Surveillance: 'Giám sát',
        };
        return labels[type] || type;
      })(),
    },
    {
      title: 'Khoa/Phòng',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Ngày',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trưởng đoàn',
      dataIndex: 'leadAuditorName',
      key: 'leadAuditorName',
    },
    {
      title: 'Phát hiện',
      dataIndex: 'totalFindings',
      key: 'totalFindings',
      width: 80,
      render: (val) => val ?? '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const config: Record<number, { color: string; text: string }> = {
          1: { color: 'blue', text: 'Đã lên lịch' },
          2: { color: 'orange', text: 'Đang thực hiện' },
          3: { color: 'green', text: 'Hoàn thành' },
          4: { color: 'cyan', text: 'Theo dõi' },
          5: { color: 'default', text: 'Đã đóng' },
        };
        const c = config[status];
        return <Tag color={c?.color || 'default'}>{record.statusName || c?.text || `Trạng thái ${status}`}</Tag>;
      },
    },
  ];

  // CAPA columns
  const capaColumns: ColumnsType<CAPADto> = [
    {
      title: 'Mã',
      dataIndex: 'capaCode',
      key: 'capaCode',
      width: 100,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Nguồn',
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
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (priority, record) => {
        const colors: Record<number, string> = { 1: 'default', 2: 'blue', 3: 'orange', 4: 'red' };
        return <Tag color={colors[priority] || 'default'}>{record.priorityName || `P${priority}`}</Tag>;
      },
    },
    {
      title: 'Người chịu trách nhiệm',
      dataIndex: 'responsiblePersonName',
      key: 'responsiblePersonName',
    },
    {
      title: 'Hạn',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 100,
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trạng thái',
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
        return <Tag color={config[status]?.color || 'default'}>{record.statusName || `Trạng thái ${status}`}</Tag>;
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
            <Title level={4} style={{ margin: 0 }}>Quản lý chất lượng</Title>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
          </Col>
        </Row>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Sự cố chưa xử lý"
                value={openIncidents}
                prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="KPI cảnh báo"
                value={criticalKPIs}
                prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Audit sắp tới"
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
                <Statistic title="Sự cố tháng này" value={dashboard.incidentsThisMonth} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic title="Audit hoàn thành" value={dashboard.auditsCompleted} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="Hài lòng BN"
                  value={dashboard.overallSatisfaction}
                  suffix="%"
                  styles={{ content: { color: dashboard.overallSatisfaction >= 80 ? '#52c41a' : '#faad14' } }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="CAPA quá hạn"
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
                In báo cáo
              </Button>
              <Button
                type="primary"
                danger
                icon={<AlertOutlined />}
                onClick={() => setIsReportModalOpen(true)}
              >
                Báo cáo sự cố
              </Button>
            </Space>
          }
        >
          <Tabs
            defaultActiveKey="kpi"
            items={[
              {
                key: 'kpi',
                label: 'Chỉ số chất lượng (KPI)',
                children: indicators.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    Chưa có chỉ số chất lượng nào
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
                                    <Text type="secondary">Chưa có dữ liệu</Text>
                                  )}
                                </Col>
                                <Col>
                                  <Text type="secondary">Mục tiêu: {ind.targetValue}</Text>
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
                label: `Sự cố y khoa (${openIncidents})`,
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
                      Lên lịch audit
                    </Button>
                    <Table
                      columns={auditColumns}
                      dataSource={audits}
                      rowKey="id"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: `Chi tiết Audit - ${record.auditCode}`,
                            width: 600,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Tiêu đề">{record.title}</Descriptions.Item>
                                <Descriptions.Item label="Khoa/Phòng">{record.departmentName}</Descriptions.Item>
                                <Descriptions.Item label="Loại">{record.auditTypeName || record.auditType}</Descriptions.Item>
                                <Descriptions.Item label="Ngày dự kiến">{record.scheduledDate ? dayjs(record.scheduledDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ngày thực tế">{record.actualDate ? dayjs(record.actualDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trưởng đoàn">{record.leadAuditorName}</Descriptions.Item>
                                <Descriptions.Item label="Phạm vi">{record.scope || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Mục tiêu">{record.objective || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Tổng phát hiện">{record.totalFindings ?? '-'}</Descriptions.Item>
                                <Descriptions.Item label="Nghiêm trọng">{record.criticalFindings ?? '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">{record.statusName}</Descriptions.Item>
                                <Descriptions.Item label="Kết luận">{record.overallConclusion || '-'}</Descriptions.Item>
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
                              <Descriptions.Item label="Tiêu đề">{record.title}</Descriptions.Item>
                              <Descriptions.Item label="Mô tả">{record.description}</Descriptions.Item>
                              <Descriptions.Item label="Vấn đề">{record.problemStatement}</Descriptions.Item>
                              <Descriptions.Item label="Nguyên nhân gốc">{record.rootCauseAnalysis || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Người chịu TN">{record.responsiblePersonName}</Descriptions.Item>
                              <Descriptions.Item label="Hạn">{record.dueDate ? dayjs(record.dueDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{record.statusName}</Descriptions.Item>
                              <Descriptions.Item label="Hành động khắc phục">
                                {record.correctiveActions?.length > 0
                                  ? record.correctiveActions.map(a => a.actionDescription).join('; ')
                                  : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Hành động phòng ngừa">
                                {record.preventiveActions?.length > 0
                                  ? record.preventiveActions.map(a => a.actionDescription).join('; ')
                                  : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Ghi chú">{record.notes || '-'}</Descriptions.Item>
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
                label: 'Tiêu chuẩn',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card title="JCI (Joint Commission International)">
                        <div>
                        {[
                            'IPSG - Mục tiêu an toàn quốc tế',
                            'ACC - Tiếp nhận và liên tục',
                            'PFR - Quyền bệnh nhân',
                            'AOP - Đánh giá bệnh nhân',
                            'COP - Chăm sóc bệnh nhân',
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
                            'Bối cảnh tổ chức',
                            'Lãnh đạo',
                            'Hoạch định',
                            'Hỗ trợ',
                            'Vận hành',
                            'Đánh giá kết quả',
                            'Cải tiến',
                          ].map((item) => (
                          <div key={item} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>{item}</div>
                        ))}
                      </div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="83 Tiêu chí Bộ Y tế">
                        <div>
                        {[
                            'Nhóm A: An toàn người bệnh',
                            'Nhóm B: Tổ chức quản lý',
                            'Nhóm C: Năng lực NVYT',
                            'Nhóm D: Cơ sở hạ tầng',
                            'Nhóm E: Chăm sóc người bệnh',
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
                label: 'Hài lòng BN',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card title="Điểm hài lòng trung bình">
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
                      <Card title="Tỷ lệ phản hồi">
                        <Progress percent={satisfactionStats?.responseRate ?? 0} />
                        <Text type="secondary">
                          {satisfactionStats
                            ? `${satisfactionStats.completedSurveys}/${satisfactionStats.totalSurveys} phiếu thu thập`
                            : dashboard
                            ? `${dashboard.surveysCompleted} phiếu hoàn thành`
                            : 'Chưa có dữ liệu'}
                        </Text>
                      </Card>
                    </Col>
                    {satisfactionStats?.byDepartment && satisfactionStats.byDepartment.length > 0 && (
                      <Col span={24}>
                        <Card title="Theo khoa/phòng" size="small">
                          <Table
                            size="small"
                            dataSource={satisfactionStats.byDepartment}
                            rowKey="departmentId"
                            pagination={false}
                            columns={[
                              { title: 'Khoa/Phòng', dataIndex: 'departmentName', key: 'departmentName' },
                              { title: 'Số phiếu', dataIndex: 'surveyCount', key: 'surveyCount', width: 80 },
                              {
                                title: 'Điểm hài lòng',
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
          title="Báo cáo sự cố y khoa"
          open={isReportModalOpen}
          onCancel={() => setIsReportModalOpen(false)}
          onOk={() => reportForm.submit()}
          width={600}
        >
          <Form form={reportForm} layout="vertical" onFinish={handleReportIncident}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="incidentDate" label="Ngày xảy ra" rules={[{ required: true }]}>
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="departmentId" label="Khoa/Phòng" rules={[{ required: true }]}>
                  <Select placeholder="Chọn khoa/phòng">
                    <Select.Option value="noi-khoa">Nội khoa</Select.Option>
                    <Select.Option value="ngoai-khoa">Ngoại khoa</Select.Option>
                    <Select.Option value="pttt">PTTT</Select.Option>
                    <Select.Option value="cap-cuu">Cấp cứu</Select.Option>
                    <Select.Option value="icu">ICU</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="incidentType" label="Loại sự cố" rules={[{ required: true }]}>
                  <Select placeholder="Chọn loại sự cố">
                    {INCIDENT_TYPES.map((t) => (
                      <Select.Option key={t.value} value={t.value}>
                        {t.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="severity" label="Mức độ" rules={[{ required: true }]}>
                  <Select placeholder="Chọn mức độ">
                    {SEVERITY_LEVELS.map((s) => (
                      <Select.Option key={s.value} value={s.value}>
                        {s.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="locationDescription" label="Vị trí xảy ra">
              <Input placeholder="VD: Phòng bệnh 301, nhà vệ sinh tầng 2..." />
            </Form.Item>
            <Form.Item name="description" label="Mô tả sự cố" rules={[{ required: true }]}>
              <TextArea rows={4} />
            </Form.Item>
            <Form.Item name="immediateActions" label="Xử lý ban đầu">
              <TextArea rows={2} placeholder="Các biện pháp đã thực hiện ngay..." />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientId" label="Mã bệnh nhân (nếu có)">
                  <Input placeholder="BN-XXXX" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="isReportable" label="Báo cáo cơ quan">
                  <Select defaultValue={false}>
                    <Select.Option value={true}>Có</Select.Option>
                    <Select.Option value={false}>Không</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú thêm">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Investigation Modal */}
        <Modal
          title="Chi tiết sự cố"
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
                <Descriptions.Item label="Mã sự cố">
                  {selectedIncident.incidentCode}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày báo cáo">
                  {selectedIncident.reportedDate ? dayjs(selectedIncident.reportedDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày xảy ra">
                  {selectedIncident.incidentDate ? dayjs(selectedIncident.incidentDate).format('DD/MM/YYYY HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Khoa">{selectedIncident.departmentName}</Descriptions.Item>
                <Descriptions.Item label="Loại">{selectedIncident.incidentTypeName || selectedIncident.incidentType}</Descriptions.Item>
                <Descriptions.Item label="Mức độ">
                  {selectedIncident.severityName
                    ? <Tag color={SEVERITY_LEVELS.find(s => s.value === selectedIncident.severity)?.color}>{selectedIncident.severityName}</Tag>
                    : getSeverityTag(selectedIncident.severity)}
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả" span={2}>
                  {selectedIncident.description}
                </Descriptions.Item>
                {selectedIncident.immediateActions && (
                  <Descriptions.Item label="Xử lý ban đầu" span={2}>
                    {selectedIncident.immediateActions}
                  </Descriptions.Item>
                )}
                {selectedIncident.patientName && (
                  <Descriptions.Item label="Bệnh nhân" span={2}>
                    {selectedIncident.patientCode} - {selectedIncident.patientName}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Người báo cáo" span={2}>
                  {selectedIncident.reportedByName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái" span={2}>
                  {getIncidentStatusTag(selectedIncident.status)}
                </Descriptions.Item>
              </Descriptions>

              <Divider>Phân tích nguyên nhân gốc (RCA)</Divider>

              <Form form={investigationForm} layout="vertical" onFinish={handleInvestigation}>
                <Form.Item
                  name="investigationFindings"
                  label="Kết quả điều tra"
                >
                  <TextArea rows={3} placeholder="Kết quả điều tra chi tiết..." />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item
                      name="rootCauseAnalysis"
                      label="Nguyên nhân gốc"
                    >
                      <TextArea rows={3} placeholder="Sử dụng phương pháp 5 Whys, Fishbone..." />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="rcaMethod" label="Phương pháp RCA">
                      <Select placeholder="Chọn">
                        <Select.Option value="5Whys">5 Whys</Select.Option>
                        <Select.Option value="Fishbone">Fishbone</Select.Option>
                        <Select.Option value="FMEA">FMEA</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  name="preventiveMeasures"
                  label="Biện pháp phòng ngừa"
                >
                  <TextArea rows={2} />
                </Form.Item>
                <Form.Item
                  name="lessonLearned"
                  label="Bài học kinh nghiệm"
                >
                  <TextArea rows={2} />
                </Form.Item>
              </Form>

              {/* Existing corrective actions */}
              {selectedIncident.correctiveActions && selectedIncident.correctiveActions.length > 0 && (
                <>
                  <Divider>Hành động khắc phục</Divider>
                  <Table
                    size="small"
                    dataSource={selectedIncident.correctiveActions}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      { title: 'Hành động', dataIndex: 'actionDescription', key: 'actionDescription' },
                      { title: 'Loại', dataIndex: 'actionType', key: 'actionType', width: 100 },
                      { title: 'Người thực hiện', dataIndex: 'responsiblePersonName', key: 'responsiblePersonName' },
                      { title: 'Hạn', dataIndex: 'dueDate', key: 'dueDate', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
                      { title: 'Trạng thái', dataIndex: 'statusName', key: 'statusName', width: 100 },
                    ]}
                  />
                </>
              )}
            </>
          )}
        </Modal>

        {/* Audit Modal */}
        <Modal
          title="Lên lịch audit"
          open={isAuditModalOpen}
          onCancel={() => setIsAuditModalOpen(false)}
          onOk={() => auditForm.submit()}
          width={600}
        >
          <Form form={auditForm} layout="vertical" onFinish={handleAddAudit}>
            <Form.Item name="title" label="Tên audit" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="auditType" label="Loại" rules={[{ required: true }]}>
                  <Select placeholder="Chọn loại audit">
                    <Select.Option value="Scheduled">Định kỳ</Select.Option>
                    <Select.Option value="Unscheduled">Đột xuất</Select.Option>
                    <Select.Option value="FollowUp">Theo dõi</Select.Option>
                    <Select.Option value="Surveillance">Giám sát</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="departmentId" label="Khoa/Phòng" rules={[{ required: true }]}>
                  <Select placeholder="Chọn khoa/phòng">
                    <Select.Option value="toan-vien">Toàn viện</Select.Option>
                    <Select.Option value="noi-khoa">Nội khoa</Select.Option>
                    <Select.Option value="ngoai-khoa">Ngoại khoa</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="scheduledDate" label="Ngày" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="leadAuditorId" label="Trưởng đoàn audit">
                  <Input placeholder="ID người thực hiện" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="scope" label="Phạm vi">
              <TextArea rows={2} placeholder="Phạm vi audit..." />
            </Form.Item>
            <Form.Item name="objective" label="Mục tiêu">
              <TextArea rows={2} placeholder="Mục tiêu audit..." />
            </Form.Item>
            <Form.Item name="criteria" label="Tiêu chí">
              <Input placeholder="VD: ISO 9001:2015, JCI..." />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Quality;
