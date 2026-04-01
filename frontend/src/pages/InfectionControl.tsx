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
  { value: 'SSI', label: 'SSI - Nhiễm khuẩn vết mổ' },
  { value: 'VAP', label: 'VAP - Viêm phổi thở máy' },
  { value: 'CAUTI', label: 'CAUTI - NK tiết niệu do sonde' },
  { value: 'CLABSI', label: 'CLABSI - NK huyết do catheter' },
  { value: 'CDI', label: 'CDI - Clostridium difficile' },
  { value: 'Other', label: 'Khác' },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ISOLATION_TYPES = [
  { value: 'Contact', label: 'Cách ly tiếp xúc' },
  { value: 'Droplet', label: 'Cách ly giọt bắn' },
  { value: 'Airborne', label: 'Cách ly không khí' },
  { value: 'Protective', label: 'Cách ly bảo vệ' },
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

  type ReportCaseFormValues = {
    admissionId?: string;
    infectionType: string;
    infectionSite: string;
    onsetDate?: dayjs.Dayjs;
    organism?: string;
    isMDRO?: boolean;
    mdroType?: string;
    cultureSource?: string;
    cultureDate?: dayjs.Dayjs;
    cultureResult?: string;
    riskFactors?: string[];
    deviceAssociated?: boolean;
    deviceType?: string;
    deviceDays?: number;
    surgeryRelated?: boolean;
    surgeryId?: string;
    cdcCriteria?: string;
    severity?: number;
    notes?: string;
  };

  type InvestigationFormValues = {
    status?: number;
    outcome?: string;
    statusText?: string;
    notes?: string;
    actions?: string[];
  };

  type AuditFormValues = {
    departmentId?: string;
    unitId?: string;
    auditDate?: dayjs.Dayjs;
    shift?: string;
    staffCategory?: string;
    moment1Before?: number;
    moment1Correct?: number;
    moment2Before?: number;
    moment2Correct?: number;
    moment3After?: number;
    moment3Correct?: number;
    moment4After?: number;
    moment4Correct?: number;
    moment5After?: number;
    moment5Correct?: number;
    productUsed?: string;
    gloveUsage?: string;
    findings?: string;
  };

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
        message.warning('Không thể tải danh sách ca nhiễm khuẩn');
      }

      if (results[1].status === 'fulfilled') {
        setIsolationOrders(results[1].value?.data || []);
      } else {
        message.warning('Không thể tải danh sách cách ly');
      }

      if (results[2].status === 'fulfilled') {
        setHhObservations(results[2].value?.data || []);
      } else {
        message.warning('Không thể tải dữ liệu vệ sinh tay');
      }

      if (results[3].status === 'fulfilled') {
        setDashboard(results[3].value?.data || null);
      } else {
        message.warning('Không thể tải dashboard KSNK');
      }

      if (results[4].status === 'fulfilled') {
        setOutbreaks(results[4].value?.data || []);
      } else {
        message.warning('Không thể tải danh sách dịch');
      }
    } catch {
      message.warning('Lỗi khi tải dữ liệu KSNK');
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
      Other: { color: 'default', text: 'Khác' },
    };
    const c = config[type] || { color: 'default', text: type };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getStatusTag = (status: number, statusName?: string) => {
    const config: Record<number, { color: string; text: string }> = {
      0: { color: 'default', text: 'Mới' },
      1: { color: 'orange', text: 'Nghi ngờ' },
      2: { color: 'red', text: 'Xác nhận' },
      3: { color: 'green', text: 'Đã khỏi' },
      4: { color: 'default', text: 'Loại trừ' },
    };
    const c = config[status] || { color: 'default', text: statusName || `Status ${status}` };
    return <Tag color={c.color}>{statusName || c.text}</Tag>;
  };

  const getIsolationTypeTag = (type?: string) => {
    if (!type) return null;
    const config: Record<string, { color: string; text: string }> = {
      Contact: { color: 'yellow', text: 'Tiếp xúc' },
      Droplet: { color: 'blue', text: 'Giọt bắn' },
      Airborne: { color: 'purple', text: 'Không khí' },
      Protective: { color: 'green', text: 'Bảo vệ' },
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
    return <Tag color={colors[severity] || 'default'}>{severityName || `Mức ${severity}`}</Tag>;
  };

  const handleReportCase = async (values: ReportCaseFormValues) => {
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
      message.success('Đã báo cáo ca nhiễm khuẩn');
      setIsReportModalOpen(false);
      reportForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể báo cáo ca nhiễm khuẩn');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateInvestigation = async (values: InvestigationFormValues) => {
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
      message.success('Đã cập nhật kết quả điều tra');
      setIsInvestigationModalOpen(false);
      investigationForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể cập nhật ca nhiễm khuẩn');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAudit = async (values: AuditFormValues) => {
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
      message.success('Đã lưu kết quả kiểm tra tuân thủ');
      setIsAuditModalOpen(false);
      auditForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể lưu kiểm tra tuân thủ');
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
        <title>Báo cáo KSNK</title>
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
          Khoa Kiểm soát nhiễm khuẩn
        </div>

        <div class="title">BÁO CÁO NHIỄM KHUẨN BỆNH VIỆN</div>
        <p style="text-align: center;">Tháng ${dayjs().format('MM/YYYY')}</p>

        <h3>1. Tổng hợp ca nhiễm khuẩn</h3>
        <table>
          <thead>
            <tr>
              <th>Loại NK</th>
              <th>Số ca</th>
              <th>Tỷ lệ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SSI - Nhiễm khuẩn vết mổ</td>
              <td>${dashboard?.ssiRate != null ? Math.round(dashboard.ssiRate) : haiCases.filter((c) => c.infectionType === 'SSI').length}</td>
              <td>${dashboard?.ssiRate != null ? dashboard.ssiRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
            <tr>
              <td>VAP - Viêm phổi thở máy</td>
              <td>${dashboard?.vapRate != null ? Math.round(dashboard.vapRate) : haiCases.filter((c) => c.infectionType === 'VAP').length}</td>
              <td>${dashboard?.vapRate != null ? dashboard.vapRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
            <tr>
              <td>CAUTI - NK tiết niệu</td>
              <td>${dashboard?.cautiRate != null ? Math.round(dashboard.cautiRate) : haiCases.filter((c) => c.infectionType === 'CAUTI').length}</td>
              <td>${dashboard?.cautiRate != null ? dashboard.cautiRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
            <tr>
              <td>CLABSI - NK huyết</td>
              <td>${dashboard?.clabsiRate != null ? Math.round(dashboard.clabsiRate) : haiCases.filter((c) => c.infectionType === 'CLABSI').length}</td>
              <td>${dashboard?.clabsiRate != null ? dashboard.clabsiRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
          </tbody>
        </table>

        <h3>2. Chi tiết ca nhiễm khuẩn</h3>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Bệnh nhân</th>
              <th>Khoa</th>
              <th>Loại NK</th>
              <th>Trạng thái</th>
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
          <p>Ngày ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Trưởng khoa KSNK</strong></p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const caseColumns: ColumnsType<HAISurveillanceDto> = [
    {
      title: 'Mã ca',
      dataIndex: 'caseCode',
      key: 'caseCode',
      width: 100,
    },
    {
      title: 'Bệnh nhân',
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
      title: 'Loại NK',
      dataIndex: 'infectionType',
      key: 'infectionType',
      width: 100,
      render: (type) => getInfectionTypeTag(type),
    },
    {
      title: 'Vị trí',
      dataIndex: 'infectionSite',
      key: 'infectionSite',
    },
    {
      title: 'Vi khuẩn',
      dataIndex: 'organism',
      key: 'organism',
      render: (text) => text || <Text type="secondary">Chưa xác định</Text>,
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
      title: 'Mức độ',
      key: 'severity',
      width: 100,
      render: (_, record) => getSeverityTag(record.severity, record.severityName),
    },
    {
      title: 'Ngày phát hiện',
      dataIndex: 'diagnosisDate',
      key: 'diagnosisDate',
      width: 120,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      render: (_, record) => getStatusTag(record.status, record.statusName),
    },
    {
      title: 'Cách ly',
      key: 'isolation',
      width: 100,
      render: (_, record) =>
        record.requiresIsolation ? (
          <Tag color="red" icon={<SafetyOutlined />}>
            Có
          </Tag>
        ) : null,
    },
    {
      title: 'Thao tác',
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
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  const isolationColumns: ColumnsType<IsolationOrderDto> = [
    {
      title: 'Mã lệnh',
      dataIndex: 'orderCode',
      key: 'orderCode',
      width: 110,
    },
    {
      title: 'Bệnh nhân',
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
      title: 'Loại cách ly',
      key: 'isolationType',
      width: 120,
      render: (_, record) => getIsolationTypeTag(record.isolationType),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Vi khuẩn',
      dataIndex: 'organism',
      key: 'organism',
      render: (text) => text || '-',
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      render: (_, record) => getStatusTag(record.status, record.statusName),
    },
    {
      title: 'PPE',
      key: 'ppe',
      render: (_, record) =>
        record.ppeRequirements?.length > 0
          ? <Space size={4} wrap>{record.ppeRequirements.map((p, i) => (
              <Tag key={i} color="blue">{p}</Tag>
            ))}</Space>
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
      title: 'Ngày',
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
      title: 'Đối tượng',
      dataIndex: 'staffCategoryName',
      key: 'staffCategoryName',
      width: 100,
    },
    {
      title: 'Tổng cơ hội',
      dataIndex: 'totalOpportunities',
      key: 'totalOpportunities',
      width: 100,
    },
    {
      title: 'Đúng cách',
      dataIndex: 'correctActions',
      key: 'correctActions',
      width: 100,
    },
    {
      title: 'Tỷ lệ tuân thủ',
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
      title: 'Người quan sát',
      dataIndex: 'observedByName',
      key: 'observedByName',
    },
  ];

  const outbreakColumns: ColumnsType<OutbreakDto> = [
    {
      title: 'Mã',
      dataIndex: 'outbreakCode',
      key: 'outbreakCode',
      width: 100,
    },
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Vi khuẩn',
      dataIndex: 'organism',
      key: 'organism',
    },
    {
      title: 'Khoa ảnh hưởng',
      key: 'departments',
      render: (_, record) =>
        record.affectedDepartmentNames?.length > 0
          ? <Space size={4} wrap>{record.affectedDepartmentNames.map((d, i) => (
              <Tag key={i}>{d}</Tag>
            ))}</Space>
          : '-',
    },
    {
      title: 'Số ca',
      key: 'cases',
      width: 100,
      render: (_, record) => (
        <span>
          {record.confirmedCases} XN / {record.totalCases} tổng
        </span>
      ),
    },
    {
      title: 'Mức độ',
      key: 'severity',
      width: 100,
      render: (_, record) => getSeverityTag(record.severity, record.severityName),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      render: (_, record) => getStatusTag(record.status, record.statusName),
    },
    {
      title: 'Ngày bắt đầu',
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
              Kiểm soát nhiễm khuẩn
            </Title>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
            </Button>
          </Col>
        </Row>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Ca đang theo dõi"
                value={activeCasesCount}
                prefix={<BugOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Đã xác nhận"
                value={confirmedCount}
                prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Chờ điều tra"
                value={pendingInvestigation}
                prefix={<AlertOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Đang cách ly"
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
                  title="Vệ sinh tay"
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
                  title="Dịch đang hoạt động"
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
                  title="Cảnh báo"
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
            title="Cảnh báo NKBV"
            description={`Hiện có ${confirmedCount} ca nhiễm khuẩn bệnh viện đã xác nhận cần theo dõi`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {dashboard && dashboard.activeOutbreaks > 0 && (
          <Alert
            title="Cảnh báo dịch"
            description={`Có ${dashboard.activeOutbreaks} dịch đang hoạt động. Vui lòng kiểm tra tab "Quản lý dịch".`}
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
                In báo cáo
              </Button>
              <Button
                type="primary"
                danger
                icon={<AlertOutlined />}
                onClick={() => setIsReportModalOpen(true)}
              >
                Báo cáo ca NK
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
                    Ca nhiễm khuẩn
                  </Badge>
                ),
                children: (
                  <Table
                    columns={caseColumns}
                    dataSource={haiCases}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: 'Không có ca nhiễm khuẩn nào' }}
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
                    Cách ly
                  </Badge>
                ),
                children: (
                  <Table
                    columns={isolationColumns}
                    dataSource={isolationOrders}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: 'Không có lệnh cách ly nào' }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiết cách ly - ${record.patientName}`,
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã lệnh">{record.orderCode}</Descriptions.Item>
                              <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                              <Descriptions.Item label="Phòng">{record.roomName || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Giường">{record.bedNumber || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Loại cách ly">{record.isolationTypeName}</Descriptions.Item>
                              <Descriptions.Item label="Lý do" span={2}>{record.reason}</Descriptions.Item>
                              <Descriptions.Item label="Vi khuẩn">{record.organism || '-'}</Descriptions.Item>
                              <Descriptions.Item label="MDRO">{record.isMDRO ? 'Có' : 'Không'}</Descriptions.Item>
                              <Descriptions.Item label="Ngày bắt đầu">{record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Ngày kết thúc">{record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : 'Chưa kết thúc'}</Descriptions.Item>
                              <Descriptions.Item label="Yêu cầu PPE" span={2}>
                                {record.ppeRequirements?.join(', ') || '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Hạn chế thăm bệnh" span={2}>
                                {record.visitorRestrictions || '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Chỉ dẫn đặc biệt" span={2}>
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
                label: 'Giám sát thường quy',
                children: (
                  <>
                    <Alert
                      title="Tiêu chí giám sát theo CDC"
                      description="SSI: Theo dõi 30 ngày (90 ngày với implant) | VAP: Thở máy > 48h | CAUTI: Sonde > 48h | CLABSI: Catheter TM trung tâm > 48h"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    {dashboard?.haiByDepartment && dashboard.haiByDepartment.length > 0 ? (
                      <Table
                        dataSource={dashboard.haiByDepartment}
                        columns={[
                          { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName' },
                          { title: 'Số ca NK', dataIndex: 'haiCount', key: 'haiCount' },
                          {
                            title: 'Tỷ lệ (/1000 ngày)',
                            dataIndex: 'haiRate',
                            key: 'haiRate',
                            render: (val) => (val != null ? val.toFixed(2) : '-'),
                          },
                          { title: 'Ngày bệnh nhân', dataIndex: 'patientDays', key: 'patientDays' },
                        ]}
                        rowKey="departmentId"
                        pagination={false}
                        locale={{ emptyText: 'Chưa có dữ liệu giám sát' }}
                        onRow={(record) => ({
                          onDoubleClick: () => {
                            Modal.info({
                              title: `Chi tiết giám sát - ${record.departmentName}`,
                              width: 500,
                              content: (
                                <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                  <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                                  <Descriptions.Item label="Số ca NK">{record.haiCount}</Descriptions.Item>
                                  <Descriptions.Item label="Tỷ lệ NK">
                                    {record.haiRate?.toFixed(2) || '-'}/1000 ngày BN
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Ngày bệnh nhân">{record.patientDays}</Descriptions.Item>
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
                          { title: 'Số ca NK', dataIndex: 'haiCount', key: 'haiCount' },
                          { title: 'Tỷ lệ', dataIndex: 'haiRate', key: 'haiRate' },
                        ]}
                        rowKey="departmentId"
                        locale={{ emptyText: 'Chưa có dữ liệu giám sát' }}
                      />
                    )}
                  </>
                ),
              },
              {
                key: 'compliance',
                label: 'Kiểm tra tuân thủ',
                children: (
                  <>
                    <Button
                      type="primary"
                      style={{ marginBottom: 16 }}
                      onClick={() => setIsAuditModalOpen(true)}
                    >
                      Thêm kiểm tra mới
                    </Button>
                    <Table
                      columns={hhColumns}
                      dataSource={hhObservations}
                      rowKey="id"
                      loading={loading}
                      locale={{ emptyText: 'Chưa có dữ liệu kiểm tra' }}
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: 'Chi tiết kiểm tra tuân thủ',
                            width: 600,
                            content: (
                              <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                                <Descriptions.Item label="Ngày">{record.observationDate ? dayjs(record.observationDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Người quan sát">{record.observedByName}</Descriptions.Item>
                                <Descriptions.Item label="Ca">{record.observationShift}</Descriptions.Item>
                                <Descriptions.Item label="Đối tượng">{record.staffCategoryName}</Descriptions.Item>
                                <Descriptions.Item label="Tỷ lệ tuân thủ">{Math.round(record.complianceRate || 0)}%</Descriptions.Item>
                                <Descriptions.Item label="Tổng cơ hội">{record.totalOpportunities}</Descriptions.Item>
                                <Descriptions.Item label="Đúng cách">{record.correctActions}</Descriptions.Item>
                                <Descriptions.Item label="Sản phẩm">{record.productUsed}</Descriptions.Item>
                                <Descriptions.Item label="Găng tay">{record.gloveUsage || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ghi chú" span={2}>{record.notes || '-'}</Descriptions.Item>
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
                    Quản lý dịch
                  </Badge>
                ),
                children: (
                  <Table
                    columns={outbreakColumns}
                    dataSource={outbreaks}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: 'Không có dịch đang hoạt động' }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiết dịch - ${record.name}`,
                          width: 700,
                          content: (
                            <>
                              <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Tên">{record.name}</Descriptions.Item>
                                <Descriptions.Item label="Vi khuẩn">{record.organism}</Descriptions.Item>
                                <Descriptions.Item label="Ngày bắt đầu">{record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ngày kết thúc">{record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : 'Chưa kết thúc'}</Descriptions.Item>
                                <Descriptions.Item label="Tổng ca">{record.totalCases}</Descriptions.Item>
                                <Descriptions.Item label="Xác nhận">{record.confirmedCases}</Descriptions.Item>
                                <Descriptions.Item label="Hồi phục">{record.recoveredCases}</Descriptions.Item>
                                <Descriptions.Item label="Tử vong">{record.deaths}</Descriptions.Item>
                                <Descriptions.Item label="Nguồn">{record.source || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Đường truyền">{record.transmissionMode || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Báo cơ quan" span={2}>
                                  {record.reportedToAuthority ? `Có - ${record.reportedDate ? dayjs(record.reportedDate).format('DD/MM/YYYY') : ''}` : 'Chưa'}
                                </Descriptions.Item>
                              </Descriptions>
                              {record.controlMeasures?.length > 0 && (
                                <>
                                  <Divider>Biện pháp kiểm soát</Divider>
                                  <ul>
                                    {record.controlMeasures.map((m, i) => (
                                      <li key={i}>{m}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                              {record.timeline?.length > 0 && (
                                <>
                                  <Divider>Diễn biến</Divider>
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
                                              <Text type="secondary">Hành động: {t.actionsTaken}</Text>
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
                label: 'Hướng dẫn cách ly',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card
                        title={
                          <span>
                            <Tag color="yellow">Tiếp xúc</Tag> Contact Isolation
                          </span>
                        }
                      >
                        <p>
                          <strong>Chỉ định:</strong>
                        </p>
                        <ul>
                          <li>MDRO (VRE, MRSA, CRE)</li>
                          <li>Clostridium difficile</li>
                          <li>Nhiễm khuẩn da</li>
                        </ul>
                        <p>
                          <strong>Biện pháp:</strong>
                        </p>
                        <ul>
                          <li>Phòng riêng hoặc cohort</li>
                          <li>Găng tay + Áo choàng</li>
                          <li>Dụng cụ riêng</li>
                        </ul>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card
                        title={
                          <span>
                            <Tag color="blue">Giọt bắn</Tag> Droplet Isolation
                          </span>
                        }
                      >
                        <p>
                          <strong>Chỉ định:</strong>
                        </p>
                        <ul>
                          <li>Cúm</li>
                          <li>RSV</li>
                          <li>Ho gà</li>
                        </ul>
                        <p>
                          <strong>Biện pháp:</strong>
                        </p>
                        <ul>
                          <li>Phòng riêng</li>
                          <li>Khẩu trang y tế</li>
                          <li>Khoảng cách 1-2m</li>
                        </ul>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card
                        title={
                          <span>
                            <Tag color="purple">Không khí</Tag> Airborne Isolation
                          </span>
                        }
                      >
                        <p>
                          <strong>Chỉ định:</strong>
                        </p>
                        <ul>
                          <li>Lao phổi</li>
                          <li>Sởi</li>
                          <li>COVID-19</li>
                          <li>Thủy đậu</li>
                        </ul>
                        <p>
                          <strong>Biện pháp:</strong>
                        </p>
                        <ul>
                          <li>Phòng áp lực âm</li>
                          <li>Khẩu trang N95</li>
                          <li>Cửa đóng kín</li>
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
          title="Báo cáo ca nhiễm khuẩn"
          open={isReportModalOpen}
          onCancel={() => setIsReportModalOpen(false)}
          onOk={() => reportForm.submit()}
          confirmLoading={submitting}
          width={700}
        >
          <Alert
            title="Báo cáo trong 24h với sự cố nghiêm trọng"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form form={reportForm} layout="vertical" onFinish={handleReportCase}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="admissionId" label="Mã nhập viện" rules={[{ required: true, message: 'Vui lòng nhập mã nhập viện' }]}>
                  <Input placeholder="Mã nhập viện (Admission ID)" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="infectionType" label="Loại nhiễm khuẩn" rules={[{ required: true, message: 'Vui lòng chọn loại NK' }]}>
                  <Select placeholder="Chọn loại NK">
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
                <Form.Item name="infectionSite" label="Vị trí nhiễm khuẩn">
                  <Input placeholder="VD: Vết mổ bụng, Phổi, Tiết niệu" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="onsetDate" label="Ngày khởi phát" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="organism" label="Vi khuẩn (nếu biết)">
                  <Input placeholder="VD: Staphylococcus aureus" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="severity" label="Mức độ" rules={[{ required: true }]}>
                  <Select placeholder="Chọn mức độ">
                    <Select.Option value={1}>Nhẹ</Select.Option>
                    <Select.Option value={2}>Trung bình</Select.Option>
                    <Select.Option value={3}>Nặng</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="isMDRO" label="MDRO" valuePropName="checked" initialValue={false}>
                  <Select>
                    <Select.Option value={false}>Không</Select.Option>
                    <Select.Option value={true}>Có</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="mdroType" label="Loại MDRO">
                  <Select placeholder="Chọn loại MDRO" allowClear>
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
                <Form.Item name="deviceAssociated" label="Liên quan thiết bị" initialValue={false}>
                  <Select>
                    <Select.Option value={false}>Không</Select.Option>
                    <Select.Option value={true}>Có</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="deviceType" label="Loại thiết bị">
                  <Select placeholder="Chọn loại" allowClear>
                    <Select.Option value="Catheter">Catheter</Select.Option>
                    <Select.Option value="Ventilator">Thở máy</Select.Option>
                    <Select.Option value="CentralLine">Catheter TM trung tâm</Select.Option>
                    <Select.Option value="UrinaryCatheter">Sonde tiểu</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="surgeryRelated" label="Liên quan phẫu thuật" initialValue={false}>
                  <Select>
                    <Select.Option value={false}>Không</Select.Option>
                    <Select.Option value={true}>Có</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cdcCriteria" label="Tiêu chí CDC">
                  <Input placeholder="VD: NHSN SSI criteria" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Mô tả chi tiết">
              <TextArea rows={3} placeholder="Mô tả diễn biến, yếu tố nguy cơ..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Investigation Modal */}
        <Modal
          title="Chi tiết điều tra ca nhiễm khuẩn"
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
                <Descriptions.Item label="Mã ca">{selectedCase.caseCode}</Descriptions.Item>
                <Descriptions.Item label="Bệnh nhân">{selectedCase.patientName}</Descriptions.Item>
                <Descriptions.Item label="Khoa">{selectedCase.departmentName}</Descriptions.Item>
                <Descriptions.Item label="Giường">{selectedCase.bedNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Loại NK">
                  {getInfectionTypeTag(selectedCase.infectionType)}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  {getStatusTag(selectedCase.status, selectedCase.statusName)}
                </Descriptions.Item>
                <Descriptions.Item label="Vị trí">{selectedCase.infectionSite || '-'}</Descriptions.Item>
                <Descriptions.Item label="Vi khuẩn">
                  {selectedCase.organism || 'Chưa xác định'}
                </Descriptions.Item>
                <Descriptions.Item label="MDRO">
                  {selectedCase.isMDRO ? (
                    <Tag color="red">{selectedCase.mdroType || 'Có'}</Tag>
                  ) : (
                    'Không'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Mức độ">
                  {getSeverityTag(selectedCase.severity, selectedCase.severityName)}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày phát hiện">
                  {selectedCase.diagnosisDate ? dayjs(selectedCase.diagnosisDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày khởi phát">
                  {selectedCase.onsetDate ? dayjs(selectedCase.onsetDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Người báo cáo">{selectedCase.reportedByName}</Descriptions.Item>
                <Descriptions.Item label="Ngày báo cáo">
                  {selectedCase.reportedDate ? dayjs(selectedCase.reportedDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                {selectedCase.cultureSource && (
                  <Descriptions.Item label="Nguồn cấy" span={2}>
                    {selectedCase.cultureSource} - {selectedCase.cultureResult || 'Chưa có kết quả'}
                  </Descriptions.Item>
                )}
                {selectedCase.riskFactors?.length > 0 && (
                  <Descriptions.Item label="Yếu tố nguy cơ" span={2}>
                    {selectedCase.riskFactors.join(', ')}
                  </Descriptions.Item>
                )}
                {selectedCase.notes && (
                  <Descriptions.Item label="Ghi chú" span={2}>
                    {selectedCase.notes}
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Divider>Quá trình điều tra</Divider>

              <Timeline
                items={[
                  {
                    color: 'blue',
                    content: (
                      <>
                        {selectedCase.reportedDate
                          ? dayjs(selectedCase.reportedDate).format('DD/MM/YYYY')
                          : '-'}{' '}
                        - Báo cáo ca nghi ngờ bởi {selectedCase.reportedByName}
                      </>
                    ),
                  },
                  ...(selectedCase.organism
                    ? [
                        {
                          color: 'orange' as const,
                          content: (
                            <>
                              Kết quả cấy: {selectedCase.organism}
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
                              Điều tra bởi {selectedCase.investigatedByName}
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
                          content: <>Xác nhận NKBV - {selectedCase.cdcCriteria || 'CDC criteria'}</>,
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

              <Divider>Cập nhật</Divider>

              <Form form={investigationForm} layout="vertical" onFinish={handleUpdateInvestigation}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="status" label="Trạng thái">
                      <Select defaultValue={selectedCase.status}>
                        <Select.Option value={1}>Nghi ngờ</Select.Option>
                        <Select.Option value={2}>Xác nhận</Select.Option>
                        <Select.Option value={3}>Đã khỏi</Select.Option>
                        <Select.Option value={4}>Loại trừ</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="outcome" label="Kết quả">
                      <Input placeholder="VD: Khỏi hoàn toàn, Chuyển viện..." />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="notes" label="Ghi chú điều tra">
                  <TextArea rows={3} placeholder="Mô tả kết quả điều tra, biện pháp đã thực hiện..." />
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>

        {/* Audit / Hand Hygiene Observation Modal */}
        <Modal
          title="Kiểm tra tuân thủ KSNK - Quan sát vệ sinh tay"
          open={isAuditModalOpen}
          onCancel={() => setIsAuditModalOpen(false)}
          onOk={() => auditForm.submit()}
          confirmLoading={submitting}
          width={700}
        >
          <Form form={auditForm} layout="vertical" onFinish={handleCreateAudit}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="departmentId" label="Khoa" rules={[{ required: true, message: 'Chọn khoa' }]}>
                  <Input placeholder="Mã khoa (Department ID)" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="auditDate" label="Ngày quan sát" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="shift" label="Ca" rules={[{ required: true }]}>
                  <Select placeholder="Chọn ca">
                    <Select.Option value="Morning">Sáng</Select.Option>
                    <Select.Option value="Afternoon">Chiều</Select.Option>
                    <Select.Option value="Night">Đêm</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="staffCategory" label="Đối tượng" rules={[{ required: true }]}>
                  <Select placeholder="Chọn đối tượng">
                    <Select.Option value="Doctor">Bác sĩ</Select.Option>
                    <Select.Option value="Nurse">Điều dưỡng</Select.Option>
                    <Select.Option value="Allied">Kỹ thuật viên</Select.Option>
                    <Select.Option value="Support">Hỗ trợ</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="productUsed" label="Sản phẩm sử dụng">
                  <Select placeholder="Chọn sản phẩm">
                    <Select.Option value="ABHR">Dung dịch sát khuẩn tay nhanh</Select.Option>
                    <Select.Option value="Soap">Xà phòng</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider>5 thời điểm vệ sinh tay (WHO)</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment1Before" label="1. Trước tiếp xúc BN - Cơ hội">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment1Correct" label="1. Trước tiếp xúc BN - Đúng cách">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment2Before" label="2. Trước thủ thuật vô khuẩn - Cơ hội">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment2Correct" label="2. Trước thủ thuật vô khuẩn - Đúng cách">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment3After" label="3. Sau phơi nhiễm dịch cơ thể - Cơ hội">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment3Correct" label="3. Sau phơi nhiễm dịch cơ thể - Đúng cách">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment4After" label="4. Sau tiếp xúc BN - Cơ hội">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment4Correct" label="4. Sau tiếp xúc BN - Đúng cách">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="moment5After" label="5. Sau tiếp xúc môi trường BN - Cơ hội">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="moment5Correct" label="5. Sau tiếp xúc môi trường BN - Đúng cách">
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="findings" label="Phát hiện/Khuyến nghị">
              <TextArea rows={3} placeholder="Ghi chú, nhận xét, khuyến nghị..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default InfectionControl;
