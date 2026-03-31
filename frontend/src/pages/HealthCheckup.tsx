import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Select,
  DatePicker,
  Typography,
  message,
  Statistic,
  Spin,
  Modal,
  Form,
  Segmented,
  Descriptions,
  Divider,
  InputNumber,
  Tabs,
  Upload,
  Progress,
  Badge,
} from 'antd';
import {
  FileProtectOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  PrinterOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  CalendarOutlined,
  BarChartOutlined,
  TeamOutlined,
  FileExcelOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as healthCheckupApi from '../api/healthCheckup';
import type { HealthCheckup as HealthCheckupType, HealthCheckupStats, CheckupCampaign, CampaignGroup } from '../api/healthCheckup';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const CHECKUP_TYPE_LABELS: Record<string, string> = {
  general_adult: 'Tổng quát >= 18',
  general_child: 'Tổng quát < 18',
  periodic: 'Định kỳ',
  driver: 'Lái xe',
  student: 'Học sinh',
  elderly: 'Người cao tuổi',
  occupational: 'Nghề nghiệp',
  infant: 'Trẻ < 24th',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Chờ khám',
  1: 'Đang khám',
  2: 'Hoàn thành',
  3: 'Đã cấp GCN',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
  3: 'blue',
};

const CONCLUSION_LABELS: Record<string, { label: string; color: string }> = {
  pass: { label: 'Đạt sức khỏe', color: 'green' },
  fail: { label: 'Không đạt', color: 'red' },
  conditional: { label: 'Đạt có điều kiện', color: 'orange' },
};

const HealthCheckup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HealthCheckupType[]>([]);
  const [stats, setStats] = useState<HealthCheckupStats>({
    totalCheckups: 0,
    todayCount: 0,
    passCount: 0,
    failCount: 0,
  });
  const [keyword, setKeyword] = useState('');
  const [checkupTypeFilter, setCheckupTypeFilter] = useState<string>('general_adult');
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<HealthCheckupType | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formInstance] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [mainTab, setMainTab] = useState('list');

  // Campaign/Group management state
  const [campaigns, setCampaigns] = useState<CheckupCampaign[]>([]);
  const [campaignGroups, setCampaignGroups] = useState<CampaignGroup[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CheckupCampaign | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [campaignFormInstance] = Form.useForm();
  const [groupFormInstance] = Form.useForm();
  const [editCampaign, setEditCampaign] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // Report data - computed from existing data
  const campaignSummary = React.useMemo(() => {
    const groups: Record<string, { company: string; total: number; completed: number; pass: number; fail: number }> = {};
    data.forEach((item) => {
      const key = item.companyName || 'Cá nhân';
      if (!groups[key]) groups[key] = { company: key, total: 0, completed: 0, pass: 0, fail: 0 };
      groups[key].total++;
      if (item.status >= 2) groups[key].completed++;
      if (item.conclusion === 'pass') groups[key].pass++;
      if (item.conclusion === 'fail') groups[key].fail++;
    });
    return Object.values(groups);
  }, [data]);

  const handlePrintResult = (record: HealthCheckupType) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.warning('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }
    const conclusionText = CONCLUSION_LABELS[record.conclusion]?.label || 'Chưa kết luận';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Phiếu KSK - ${record.patientName}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 30px; font-size: 14px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 20px; }
        .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #000; padding: 6px 10px; text-align: left; }
        th { background: #f0f0f0; }
        .conclusion { font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0; padding: 10px; border: 2px solid #000; }
        .signature-row { display: flex; justify-content: space-between; margin-top: 40px; }
        .signature-box { text-align: center; width: 30%; }
        @media print { body { padding: 15px; } }
      </style></head>
      <body>
        <div class="header"><strong>PHIẾU KHÁM SỨC KHỎE</strong></div>
        <div class="title">${CHECKUP_TYPE_LABELS[record.checkupType] || record.checkupType}</div>
        <table>
          <tr><th>Họ tên</th><td>${record.patientName}</td><th>Giới tính</th><td>${record.gender === 1 ? 'Nam' : 'Nữ'}</td></tr>
          <tr><th>Ngày sinh</th><td>${record.dateOfBirth ? dayjs(record.dateOfBirth).format('DD/MM/YYYY') : '-'}</td><th>Ngày khám</th><td>${record.checkupDate ? dayjs(record.checkupDate).format('DD/MM/YYYY') : '-'}</td></tr>
          <tr><th>Công ty</th><td colspan="3">${record.companyName || '-'}</td></tr>
        </table>
        <table>
          <tr><th>Chuyên khoa</th><th>Kết quả</th></tr>
          <tr><td>Nội khoa</td><td>${record.internalMedicine || '-'}</td></tr>
          <tr><td>Ngoại khoa</td><td>${record.surgery || '-'}</td></tr>
          <tr><td>Mắt</td><td>${record.ophthalmology || '-'}</td></tr>
          <tr><td>Tai mũi họng</td><td>${record.entExam || '-'}</td></tr>
          <tr><td>Răng hàm mặt</td><td>${record.dentalExam || '-'}</td></tr>
          <tr><td>Da liễu</td><td>${record.dermatology || '-'}</td></tr>
          <tr><td>Phụ khoa</td><td>${record.gynecology || '-'}</td></tr>
          <tr><td>Tâm thần</td><td>${record.psychiatry || '-'}</td></tr>
          <tr><td>Xét nghiệm</td><td>${record.labResults || '-'}</td></tr>
          <tr><td>X-quang</td><td>${record.xrayResults || '-'}</td></tr>
        </table>
        <div class="conclusion">KẾT LUẬN: ${conclusionText}</div>
        ${record.notes ? `<p><strong>Ghi chú:</strong> ${record.notes}</p>` : ''}
        <div class="signature-row">
          <div class="signature-box"><strong>Người khám</strong><br/><br/><br/>${record.examDoctor || ''}</div>
          <div class="signature-box"><strong>Trưởng khoa</strong><br/><br/><br/></div>
          <div class="signature-box"><strong>Giám đốc BV</strong><br/><br/><br/></div>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        keyword: keyword || undefined,
        checkupType: checkupTypeFilter || undefined,
        status: statusFilter,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        healthCheckupApi.searchHealthCheckups(params),
        healthCheckupApi.getHealthCheckupStats(),
      ]);
      if (results[0].status === 'fulfilled') setData(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
    } catch {
      message.warning('Không thể tải dữ liệu khám sức khỏe');
    } finally {
      setLoading(false);
    }
  }, [keyword, checkupTypeFilter, statusFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = (record: HealthCheckupType) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleCreate = () => {
    setEditMode(false);
    setSelectedRecord(null);
    formInstance.resetFields();
    setIsFormModalOpen(true);
  };

  const handleEdit = (record: HealthCheckupType) => {
    setEditMode(true);
    setSelectedRecord(record);
    formInstance.setFieldsValue({
      ...record,
      checkupDate: record.checkupDate ? dayjs(record.checkupDate) : undefined,
    });
    setIsFormModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await formInstance.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        checkupDate: values.checkupDate?.format('YYYY-MM-DD'),
      };
      if (editMode && selectedRecord) {
        await healthCheckupApi.updateHealthCheckup(selectedRecord.id, payload);
        message.success('Đã cập nhật phiếu khám sức khỏe');
      } else {
        await healthCheckupApi.createHealthCheckup(payload);
        message.success('Đã tạo phiếu khám sức khỏe');
      }
      setIsFormModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể lưu phiếu khám');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (id: string) => {
    window.open(`/api/health-checkup/${id}/print`, '_blank');
  };

  const columns: ColumnsType<HealthCheckupType> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'checkupCode',
      key: 'checkupCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'Giới',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      render: (g: number) => (g === 1 ? 'Nam' : 'Nữ'),
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      width: 100,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Loại khám',
      dataIndex: 'checkupType',
      key: 'checkupType',
      width: 130,
      render: (t: string) => CHECKUP_TYPE_LABELS[t] || t,
    },
    {
      title: 'Công ty',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Ngày khám',
      dataIndex: 'checkupDate',
      key: 'checkupDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'BS khám',
      dataIndex: 'examDoctor',
      key: 'examDoctor',
      width: 130,
    },
    {
      title: 'Kết luận',
      dataIndex: 'conclusion',
      key: 'conclusion',
      width: 120,
      render: (c: string) => {
        const info = CONCLUSION_LABELS[c];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>Chưa KL</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: number) => (
        <Tag color={STATUS_COLORS[s] || 'default'}>
          {STATUS_LABELS[s] || `Status ${s}`}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: HealthCheckupType) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            Xem
          </Button>
          {record.status < 2 && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              Sửa
            </Button>
          )}
          {record.status >= 2 && (
            <>
              <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record.id)}>
                In
              </Button>
              <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => handlePrintResult(record)}>
                In KQ
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  // Campaign management functions
  const fetchCampaigns = useCallback(async () => {
    try {
      const result = await healthCheckupApi.getCampaigns();
      setCampaigns(result);
    } catch {
      console.warn('Failed to fetch campaigns');
    }
  }, []);

  const fetchCampaignGroups = useCallback(async (campaignId: string) => {
    try {
      const result = await healthCheckupApi.getCampaignGroups(campaignId);
      setCampaignGroups(result);
    } catch {
      console.warn('Failed to fetch campaign groups');
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'campaigns') {
      fetchCampaigns();
    }
  }, [mainTab, fetchCampaigns]);

  const handleCreateCampaign = () => {
    setEditCampaign(false);
    campaignFormInstance.resetFields();
    campaignFormInstance.setFieldsValue({ discountPercent: 0, checkupType: 'periodic', startDate: dayjs() });
    setIsCampaignModalOpen(true);
  };

  const handleEditCampaign = (record: CheckupCampaign) => {
    setEditCampaign(true);
    setSelectedCampaign(record);
    campaignFormInstance.setFieldsValue({
      ...record,
      startDate: record.startDate ? dayjs(record.startDate) : undefined,
      endDate: record.endDate ? dayjs(record.endDate) : undefined,
    });
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = async () => {
    try {
      const values = await campaignFormInstance.validateFields();
      const payload = {
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
      };
      setSaving(true);
      if (editCampaign && selectedCampaign) {
        await healthCheckupApi.updateCampaign(selectedCampaign.id, payload);
        message.success('Cập nhật đợt khám thành công');
      } else {
        await healthCheckupApi.createCampaign(payload);
        message.success('Tạo đợt khám mới thành công');
      }
      setIsCampaignModalOpen(false);
      fetchCampaigns();
    } catch {
      message.warning('Vui lòng kiểm tra thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = (record: CheckupCampaign) => {
    Modal.confirm({
      title: 'Xóa đợt khám',
      content: `Xóa đợt khám "${record.campaignName}" của ${record.companyName}?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await healthCheckupApi.deleteCampaign(record.id);
          message.success('Đã xóa đợt khám');
          fetchCampaigns();
        } catch {
          message.warning('Không thể xóa đợt khám');
        }
      },
    });
  };

  const handleViewCampaignDetail = (record: CheckupCampaign) => {
    setSelectedCampaign(record);
    fetchCampaignGroups(record.id);
  };

  const handleCreateGroup = () => {
    groupFormInstance.resetFields();
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!selectedCampaign) return;
    try {
      const values = await groupFormInstance.validateFields();
      await healthCheckupApi.createCampaignGroup(selectedCampaign.id, values);
      message.success('Tạo nhóm thành công');
      setIsGroupModalOpen(false);
      fetchCampaignGroups(selectedCampaign.id);
      fetchCampaigns();
    } catch {
      message.warning('Vui lòng kiểm tra thông tin');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!selectedCampaign) return;
    try {
      await healthCheckupApi.deleteCampaignGroup(selectedCampaign.id, groupId);
      message.success('Đã xóa nhóm');
      fetchCampaignGroups(selectedCampaign.id);
    } catch {
      message.warning('Không thể xóa nhóm');
    }
  };

  const handleImportExcel = async (file: File) => {
    if (!selectedCampaign) {
      message.warning('Vui lòng chọn đợt khám trước khi nhập');
      return;
    }
    setImportLoading(true);
    try {
      const result = await healthCheckupApi.importBatchExcel(selectedCampaign.id, file);
      if (result.errorCount > 0) {
        Modal.info({
          title: `Nhập ${result.successCount}/${result.totalRows} bản ghi`,
          content: (
            <div>
              <p>Thành công: {result.successCount}, Lỗi: {result.errorCount}</p>
              {result.errors.length > 0 && (
                <ul style={{ maxHeight: 200, overflow: 'auto' }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          ),
        });
      } else {
        message.success(`Nhập thành công ${result.successCount} nhân viên từ Excel`);
      }
      fetchCampaigns();
      fetchData();
    } catch {
      message.warning('Lỗi khi nhập file Excel. Vui lòng kiểm tra định dạng file.');
    } finally {
      setImportLoading(false);
    }
  };

  const CAMPAIGN_STATUS_MAP: Record<number, { label: string; color: string }> = {
    0: { label: 'Nháp', color: 'default' },
    1: { label: 'Đang thực hiện', color: 'processing' },
    2: { label: 'Hoàn thành', color: 'success' },
    3: { label: 'Đã hủy', color: 'error' },
  };

  const campaignColumns: ColumnsType<CheckupCampaign> = [
    { title: 'Mã đợt', dataIndex: 'campaignCode', key: 'campaignCode', width: 120 },
    { title: 'Tên đợt khám', dataIndex: 'campaignName', key: 'campaignName', width: 200 },
    { title: 'Công ty / Đơn vị', dataIndex: 'companyName', key: 'companyName', width: 200 },
    {
      title: 'Loại khám', dataIndex: 'checkupType', key: 'checkupType', width: 120,
      render: (v: string) => CHECKUP_TYPE_LABELS[v] || v,
    },
    {
      title: 'Ngày bắt đầu', dataIndex: 'startDate', key: 'startDate', width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Tiến độ', key: 'progress', width: 160,
      render: (_: unknown, r: CheckupCampaign) => {
        const pct = r.totalRegistered > 0 ? Math.round(r.totalCompleted / r.totalRegistered * 100) : 0;
        return (
          <Space orientation="vertical" size={0}>
            <Progress percent={pct} size="small" style={{ width: 100 }} />
            <span style={{ fontSize: 12 }}>{r.totalCompleted}/{r.totalRegistered}</span>
          </Space>
        );
      },
    },
    {
      title: 'Giảm giá', dataIndex: 'discountPercent', key: 'discountPercent', width: 80, align: 'center' as const,
      render: (v: number) => v > 0 ? <Tag color="blue">{v}%</Tag> : '-',
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (v: number) => <Tag color={CAMPAIGN_STATUS_MAP[v]?.color}>{CAMPAIGN_STATUS_MAP[v]?.label}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 150, fixed: 'right' as const,
      render: (_: unknown, record: CheckupCampaign) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewCampaignDetail(record)}>Chi tiết</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditCampaign(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteCampaign(record)} />
        </Space>
      ),
    },
  ];

  const groupColumns: ColumnsType<CampaignGroup> = [
    { title: 'Nhóm', dataIndex: 'groupName', key: 'groupName', width: 200 },
    { title: 'Phòng khám', dataIndex: 'roomAssignment', key: 'roomAssignment', width: 150 },
    { title: 'Tổng NV', dataIndex: 'totalMembers', key: 'totalMembers', width: 100, align: 'center' as const },
    {
      title: 'Đã khám', dataIndex: 'completedMembers', key: 'completedMembers', width: 100, align: 'center' as const,
      render: (v: number, r: CampaignGroup) => (
        <span>{v}/{r.totalMembers}</span>
      ),
    },
    {
      title: '', key: 'action', width: 60,
      render: (_: unknown, r: CampaignGroup) => (
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteGroup(r.id)} />
      ),
    },
  ];

  const segmentOptions = [
    { label: 'Tổng quát >= 18', value: 'general_adult' },
    { label: '< 18', value: 'general_child' },
    { label: 'Định kỳ', value: 'periodic' },
    { label: 'Lái xe', value: 'driver' },
    { label: 'Học sinh', value: 'student' },
    { label: 'Người cao tuổi', value: 'elderly' },
    { label: 'Nghề nghiệp', value: 'occupational' },
    { label: 'Trẻ < 24th', value: 'infant' },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        {/* Header */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <FileProtectOutlined style={{ marginRight: 8 }} />
                Khám sức khỏe tổng quát
              </Title>
            </Col>
            <Col>
              <Space>
                <Upload
                  accept=".xlsx,.xls"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    if (selectedCampaign) {
                      handleImportExcel(file);
                    } else {
                      message.info('Vui lòng vào tab "Đoàn khám" và chọn đợt khám trước khi nhập Excel');
                    }
                    return false;
                  }}
                >
                  <Button icon={<FileExcelOutlined />} loading={importLoading}>Nhập Excel</Button>
                </Upload>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  Tạo phiếu khám
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  Làm mới
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Tổng khám"
                value={stats.totalCheckups}
                prefix={<FileProtectOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Hôm nay"
                value={stats.todayCount}
                prefix={<CalendarOutlined />}
                styles={{ content: { color: '#722ed1' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Đạt SK"
                value={stats.passCount}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Không đạt"
                value={stats.failCount}
                prefix={<CloseCircleOutlined />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
        </Row>

        <Tabs
          activeKey={mainTab}
          onChange={setMainTab}
          items={[
            {
              key: 'list',
              label: <span><FileProtectOutlined /> Danh sách KSK</span>,
              children: (
                <>
                  {/* Segmented control */}
                  <Card style={{ marginBottom: 16 }}>
                    <Segmented
                      options={segmentOptions}
                      value={checkupTypeFilter}
                      onChange={(val) => setCheckupTypeFilter(val as string)}
                      block
                    />
                  </Card>

                  {/* Filters */}
                  <Card style={{ marginBottom: 16 }}>
                    <Row gutter={[16, 12]}>
                      <Col xs={24} sm={8} md={6}>
                        <Search
                          placeholder="Tìm kiếm họ tên, mã phiếu..."
                          value={keyword}
                          onChange={(e) => setKeyword(e.target.value)}
                          onSearch={fetchData}
                          allowClear
                          prefix={<SearchOutlined />}
                        />
                      </Col>
                      <Col xs={12} sm={8} md={4}>
                        <Select
                          placeholder="Trạng thái"
                          allowClear
                          style={{ width: '100%' }}
                          value={statusFilter}
                          onChange={setStatusFilter}
                          options={[
                            { value: 0, label: 'Chờ khám' },
                            { value: 1, label: 'Đang khám' },
                            { value: 2, label: 'Hoàn thành' },
                            { value: 3, label: 'Đã cấp GCN' },
                          ]}
                        />
                      </Col>
                      <Col xs={24} sm={8} md={6}>
                        <RangePicker
                          style={{ width: '100%' }}
                          value={dateRange}
                          onChange={(val) => setDateRange(val as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                          format="DD/MM/YYYY"
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* Table */}
                  <Card>
                    <Table
                      dataSource={data}
                      columns={columns}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
                      scroll={{ x: 1400 }}
                      onRow={(record) => ({
                        onDoubleClick: () => handleViewDetail(record),
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </Card>
                </>
              ),
            },
            {
              key: 'campaigns',
              label: <span><TeamOutlined /> Đoàn khám</span>,
              children: (
                <>
                  <Card style={{ marginBottom: 16 }}>
                    <Row justify="space-between" align="middle">
                      <Col><Typography.Text strong>Quản lý đợt khám sức khỏe theo đoàn</Typography.Text></Col>
                      <Col>
                        <Space>
                          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCampaign}>
                            Tạo đợt khám
                          </Button>
                          <Button icon={<ReloadOutlined />} onClick={fetchCampaigns} />
                        </Space>
                      </Col>
                    </Row>
                  </Card>

                  <Row gutter={16}>
                    <Col xs={24} lg={selectedCampaign ? 14 : 24}>
                      <Card>
                        <Table
                          dataSource={campaigns}
                          columns={campaignColumns}
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          scroll={{ x: 1200 }}
                          onRow={(record) => ({
                            onClick: () => handleViewCampaignDetail(record),
                            style: {
                              cursor: 'pointer',
                              background: selectedCampaign?.id === record.id ? '#e6f7ff' : undefined,
                            },
                          })}
                        />
                      </Card>
                    </Col>

                    {selectedCampaign && (
                      <Col xs={24} lg={10}>
                        <Card
                          title={
                            <Space>
                              <Badge status="processing" />
                              <span>{selectedCampaign.campaignName}</span>
                            </Space>
                          }
                          extra={
                            <Button size="small" onClick={() => setSelectedCampaign(null)}>Đóng</Button>
                          }
                        >
                          <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="Công ty">{selectedCampaign.companyName}</Descriptions.Item>
                            <Descriptions.Item label="Loại khám">{CHECKUP_TYPE_LABELS[selectedCampaign.checkupType] || selectedCampaign.checkupType}</Descriptions.Item>
                            <Descriptions.Item label="Liên hệ">{selectedCampaign.contactPerson || '-'}</Descriptions.Item>
                            <Descriptions.Item label="SĐT">{selectedCampaign.contactPhone || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Giảm giá">{selectedCampaign.discountPercent > 0 ? `${selectedCampaign.discountPercent}%` : 'Không'}</Descriptions.Item>
                            <Descriptions.Item label="Gói DV">{selectedCampaign.servicePackage || 'Mặc định'}</Descriptions.Item>
                          </Descriptions>

                          <Divider>Nhóm khám</Divider>
                          <Space style={{ marginBottom: 12 }}>
                            <Button size="small" icon={<PlusOutlined />} onClick={handleCreateGroup}>Thêm nhóm</Button>
                            <Upload
                              accept=".xlsx,.xls"
                              showUploadList={false}
                              beforeUpload={(file) => { handleImportExcel(file); return false; }}
                            >
                              <Button size="small" icon={<FileExcelOutlined />} loading={importLoading}>Nhập Excel</Button>
                            </Upload>
                          </Space>
                          <Table
                            dataSource={campaignGroups}
                            columns={groupColumns}
                            rowKey="id"
                            size="small"
                            pagination={false}
                          />

                          {selectedCampaign.totalCost > 0 && (
                            <>
                              <Divider>Chi phí</Divider>
                              <Statistic
                                title="Tổng chi phí đoàn"
                                value={selectedCampaign.totalCost}
                                suffix="đ"
                                styles={{ content: { color: '#1890ff' } }}
                              />
                            </>
                          )}
                        </Card>
                      </Col>
                    )}
                  </Row>
                </>
              ),
            },
            {
              key: 'report',
              label: <span><BarChartOutlined /> Báo cáo</span>,
              children: (
                <Card title="Báo cáo tổng hợp KSK theo đợt / công ty">
                  <Table
                    dataSource={campaignSummary}
                    rowKey="company"
                    size="small"
                    pagination={false}
                    columns={[
                      { title: 'Công ty / Đợt', dataIndex: 'company', key: 'company', width: 250 },
                      { title: 'Tổng đăng ký', dataIndex: 'total', key: 'total', width: 120, align: 'center' as const },
                      { title: 'Đã hoàn thành', dataIndex: 'completed', key: 'completed', width: 120, align: 'center' as const },
                      { title: 'Đạt SK', dataIndex: 'pass', key: 'pass', width: 100, align: 'center' as const, render: (v: number) => <Tag color="green">{v}</Tag> },
                      { title: 'Không đạt', dataIndex: 'fail', key: 'fail', width: 100, align: 'center' as const, render: (v: number) => <Tag color="red">{v}</Tag> },
                      {
                        title: 'Tỷ lệ hoàn thành',
                        key: 'rate',
                        width: 130,
                        align: 'center' as const,
                        render: (_: unknown, r: { total: number; completed: number }) => r.total > 0 ? `${Math.round(r.completed / r.total * 100)}%` : '0%',
                      },
                    ]}
                    summary={() => {
                      const totals = campaignSummary.reduce(
                        (acc, r) => ({ total: acc.total + r.total, completed: acc.completed + r.completed, pass: acc.pass + r.pass, fail: acc.fail + r.fail }),
                        { total: 0, completed: 0, pass: 0, fail: 0 }
                      );
                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}><strong>Tổng cộng</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="center"><strong>{totals.total}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="center"><strong>{totals.completed}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="center"><strong>{totals.pass}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="center"><strong>{totals.fail}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="center"><strong>{totals.total > 0 ? `${Math.round(totals.completed / totals.total * 100)}%` : '0%'}</strong></Table.Summary.Cell>
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </Card>
              ),
            },
          ]}
        />

        {/* Detail Modal */}
        <Modal
          title="Chi tiết phiếu khám sức khỏe"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
            selectedRecord && selectedRecord.status >= 2 && (
              <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint(selectedRecord.id)}>
                In giấy chứng nhận
              </Button>
            ),
          ]}
          width={800}
        >
          {selectedRecord && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã phiếu">{selectedRecord.checkupCode}</Descriptions.Item>
                <Descriptions.Item label="Loại khám">{CHECKUP_TYPE_LABELS[selectedRecord.checkupType] || selectedRecord.checkupType}</Descriptions.Item>
                <Descriptions.Item label="Họ tên">{selectedRecord.patientName}</Descriptions.Item>
                <Descriptions.Item label="Giới tính">{selectedRecord.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">{selectedRecord.dateOfBirth ? dayjs(selectedRecord.dateOfBirth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày khám">{selectedRecord.checkupDate ? dayjs(selectedRecord.checkupDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Công ty" span={2}>{selectedRecord.companyName || '-'}</Descriptions.Item>
              </Descriptions>
              <Divider>Kết quả khám</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Nội khoa">{selectedRecord.internalMedicine || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngoại khoa">{selectedRecord.surgery || '-'}</Descriptions.Item>
                <Descriptions.Item label="Mắt">{selectedRecord.ophthalmology || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tai mũi họng">{selectedRecord.entExam || '-'}</Descriptions.Item>
                <Descriptions.Item label="Răng hàm mặt">{selectedRecord.dentalExam || '-'}</Descriptions.Item>
                <Descriptions.Item label="Da liễu">{selectedRecord.dermatology || '-'}</Descriptions.Item>
                <Descriptions.Item label="Phụ khoa">{selectedRecord.gynecology || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tâm thần">{selectedRecord.psychiatry || '-'}</Descriptions.Item>
                <Descriptions.Item label="Xét nghiệm" span={2}>{selectedRecord.labResults || '-'}</Descriptions.Item>
                <Descriptions.Item label="X-quang" span={2}>{selectedRecord.xrayResults || '-'}</Descriptions.Item>
              </Descriptions>
              <Divider>Kết luận</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Kết luận">
                  {selectedRecord.conclusion ? (
                    <Tag color={CONCLUSION_LABELS[selectedRecord.conclusion]?.color}>
                      {CONCLUSION_LABELS[selectedRecord.conclusion]?.label || selectedRecord.conclusion}
                    </Tag>
                  ) : 'Chưa kết luận'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={STATUS_COLORS[selectedRecord.status]}>{STATUS_LABELS[selectedRecord.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="BS khám">{selectedRecord.examDoctor || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ghi chú">{selectedRecord.notes || '-'}</Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Modal>

        {/* Create/Edit Form Modal */}
        <Modal
          title={editMode ? 'Sửa phiếu khám sức khỏe' : 'Tạo phiếu khám sức khỏe'}
          open={isFormModalOpen}
          onCancel={() => setIsFormModalOpen(false)}
          onOk={handleSave}
          okText="Lưu"
          cancelText="Hủy"
          confirmLoading={saving}
          width={900}
          destroyOnHidden
        >
          <Form form={formInstance} layout="vertical">
            <Divider>Thông tin chung</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="patientName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                  <Input placeholder="Họ và tên" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="gender" label="Giới tính">
                  <Select options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="checkupDate" label="Ngày khám">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="checkupType" label="Loại khám" rules={[{ required: true, message: 'Chọn loại khám' }]}>
                  <Select options={Object.entries(CHECKUP_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="companyName" label="Công ty / Đơn vị">
                  <Input placeholder="Tên công ty (nếu khám tập thể)" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="groupName" label="Nhóm / Đợt khám">
                  <Input placeholder="Tên nhóm / đợt khám" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="discountPercent" label="Giảm giá đoàn (%)">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0" addonAfter="%" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Nội khoa</Divider>
            <Form.Item name="internalMedicine"><TextArea rows={2} placeholder="Kết quả khám nội khoa..." /></Form.Item>

            <Divider>Ngoại khoa</Divider>
            <Form.Item name="surgery"><TextArea rows={2} placeholder="Kết quả khám ngoại khoa..." /></Form.Item>

            <Divider>Mắt</Divider>
            <Form.Item name="ophthalmology"><TextArea rows={2} placeholder="Thị lực, nhãn áp, đáy mắt..." /></Form.Item>

            <Divider>Tai Mũi Họng</Divider>
            <Form.Item name="entExam"><TextArea rows={2} placeholder="Kết quả khám TMH..." /></Form.Item>

            <Divider>Răng Hàm Mặt</Divider>
            <Form.Item name="dentalExam"><TextArea rows={2} placeholder="Kết quả khám RHM..." /></Form.Item>

            <Divider>Da liễu</Divider>
            <Form.Item name="dermatology"><TextArea rows={2} placeholder="Kết quả khám da liễu..." /></Form.Item>

            <Divider>Phụ khoa</Divider>
            <Form.Item name="gynecology"><TextArea rows={2} placeholder="Kết quả khám phụ khoa (nếu có)..." /></Form.Item>

            <Divider>Tâm thần</Divider>
            <Form.Item name="psychiatry"><TextArea rows={2} placeholder="Kết quả khám tâm thần..." /></Form.Item>

            <Divider>Xét nghiệm</Divider>
            <Form.Item name="labResults"><TextArea rows={2} placeholder="Kết quả xét nghiệm máu, nước tiểu..." /></Form.Item>

            <Divider>X-quang</Divider>
            <Form.Item name="xrayResults"><TextArea rows={2} placeholder="Kết quả X-quang ngực thẳng..." /></Form.Item>

            <Divider>Kết luận</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="conclusion" label="Phân loại sức khỏe">
                  <Select
                    placeholder="Chọn kết luận"
                    allowClear
                    options={[
                      { value: 'pass', label: 'Đạt sức khỏe' },
                      { value: 'fail', label: 'Không đạt' },
                      { value: 'conditional', label: 'Đạt có điều kiện' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="notes" label="Ghi chú">
                  <TextArea rows={2} placeholder="Ghi chú thêm..." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
        {/* Campaign Modal */}
        <Modal
          title={editCampaign ? 'Sửa đợt khám' : 'Tạo đợt khám theo đoàn'}
          open={isCampaignModalOpen}
          onCancel={() => setIsCampaignModalOpen(false)}
          onOk={handleSaveCampaign}
          okText="Lưu"
          cancelText="Hủy"
          confirmLoading={saving}
          width={700}
          destroyOnHidden
        >
          <Form form={campaignFormInstance} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="campaignName" label="Tên đợt khám" rules={[{ required: true, message: 'Nhập tên đợt khám' }]}>
                  <Input placeholder="VD: Đợt khám định kỳ Q1/2026" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="companyName" label="Công ty / Đơn vị" rules={[{ required: true, message: 'Nhập tên công ty' }]}>
                  <Input placeholder="Tên công ty / đơn vị" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="checkupType" label="Loại khám" rules={[{ required: true }]}>
                  <Select options={Object.entries(CHECKUP_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="startDate" label="Ngày bắt đầu">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="endDate" label="Ngày kết thúc">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="contactPerson" label="Người liên hệ">
                  <Input placeholder="Họ tên người liên hệ" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="contactPhone" label="Số điện thoại">
                  <Input placeholder="0xxx xxx xxx" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="discountPercent" label="Giảm giá đoàn (%)">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="servicePackage" label="Gói dịch vụ khám">
                  <Select
                    placeholder="Chọn gói dịch vụ"
                    allowClear
                    options={[
                      { value: 'basic', label: 'Gói cơ bản (nội, ngoại, TMH, mắt, XN máu, X-quang)' },
                      { value: 'standard', label: 'Gói tiêu chuẩn (+ RHM, da liễu, siêu âm)' },
                      { value: 'premium', label: 'Gói nâng cao (+ phụ khoa, tâm thần, điện tim)' },
                      { value: 'driver', label: 'Gói lái xe (theo QĐ 36)' },
                      { value: 'custom', label: 'Tùy chỉnh' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Trạng thái">
                  <Select
                    options={[
                      { value: 0, label: 'Nháp' },
                      { value: 1, label: 'Đang thực hiện' },
                      { value: 2, label: 'Hoàn thành' },
                      { value: 3, label: 'Đã hủy' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú">
              <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Group Modal */}
        <Modal
          title="Thêm nhóm khám"
          open={isGroupModalOpen}
          onCancel={() => setIsGroupModalOpen(false)}
          onOk={handleSaveGroup}
          okText="Lưu"
          cancelText="Hủy"
          destroyOnHidden
        >
          <Form form={groupFormInstance} layout="vertical">
            <Form.Item name="groupName" label="Tên nhóm" rules={[{ required: true, message: 'Nhập tên nhóm' }]}>
              <Input placeholder="VD: Nhóm 1 - Phòng Kế toán" />
            </Form.Item>
            <Form.Item name="roomAssignment" label="Phòng khám được phân">
              <Input placeholder="VD: Phòng khám số 3" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default HealthCheckup;
