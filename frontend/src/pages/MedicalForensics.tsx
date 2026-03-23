import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form, InputNumber,
  Descriptions, Drawer,
} from 'antd';
import {
  AuditOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  PrinterOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined,
  ClockCircleOutlined, PercentageOutlined, CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as forensicApi from '../api/forensic';
import type { ForensicCase, ForensicStats, ForensicExamination } from '../api/forensic';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const CASE_TYPE_LABELS: Record<string, string> = {
  disability: 'Thương tật',
  driver: 'Lái xe',
  employment: 'Lao động',
  insurance: 'Bảo hiểm',
  court: 'Tòa án',
};

const CASE_TYPE_COLORS: Record<string, string> = {
  disability: 'purple',
  driver: 'blue',
  employment: 'green',
  insurance: 'gold',
  court: 'red',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Chờ giám định',
  1: 'Đang giám định',
  2: 'Hoàn thành',
  3: 'Đã phê duyệt',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
  3: 'blue',
};

const MedicalForensics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<ForensicCase[]>([]);
  const [stats, setStats] = useState<ForensicStats>({ totalCases: 0, pendingCases: 0, completedThisMonth: 0, avgDisabilityPercent: 0 });
  const [activeTab, setActiveTab] = useState('pending');
  const [keyword, setKeyword] = useState('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedCase, setSelectedCase] = useState<ForensicCase | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [examinations, setExaminations] = useState<ForensicExamination[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, number | undefined> = {
        pending: 0, examining: 1, completed: 2, all: undefined,
      };
      const params = {
        keyword: keyword || undefined,
        status: statusMap[activeTab],
        caseType: caseTypeFilter || undefined,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        forensicApi.searchCases(params),
        forensicApi.getStats(),
      ]);
      if (results[0].status === 'fulfilled') setCases(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
    } catch {
      message.warning('Không thể tải dữ liệu giám định y khoa');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, caseTypeFilter, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewDetail = async (record: ForensicCase) => {
    setSelectedCase(record);
    setIsDetailDrawerOpen(true);
    try {
      const exams = await forensicApi.getExaminations(record.id);
      setExaminations(exams);
    } catch {
      setExaminations([]);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await forensicApi.approveCase(id);
      message.success('Đã phê duyệt hồ sơ giám định');
      fetchData();
    } catch {
      message.warning('Không thể phê duyệt');
    }
  };

  const handlePrint = async (id: string) => {
    try {
      const blob = await forensicApi.printCertificate(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      message.warning('Không thể in giấy giám định');
    }
  };

  const handleCreateCase = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      await forensicApi.createCase(values);
      message.success('Đã tạo hồ sơ giám định');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo hồ sơ giám định');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<ForensicCase> = [
    { title: 'Mã hồ sơ', dataIndex: 'caseCode', key: 'caseCode', width: 120 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 160 },
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', width: 100 },
    {
      title: 'Loại GĐ', dataIndex: 'caseType', key: 'caseType', width: 110,
      render: (t: string) => <Tag color={CASE_TYPE_COLORS[t] || 'default'}>{CASE_TYPE_LABELS[t] || t}</Tag>,
    },
    {
      title: 'Cơ quan yêu cầu', dataIndex: 'requestingOrganization', key: 'requestingOrganization', width: 160, ellipsis: true,
    },
    {
      title: 'Ngày YC', dataIndex: 'requestDate', key: 'requestDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: '% Thương tật', dataIndex: 'disabilityPercent', key: 'disabilityPercent', width: 110,
      render: (v?: number) => v != null ? `${v}%` : '-',
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 130,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 200,
      render: (_: unknown, record: ForensicCase) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>Xem</Button>
          {record.status === 2 && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record.id)}>Duyệt</Button>
          )}
          {record.status === 3 && (
            <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record.id)}>In</Button>
          )}
        </Space>
      ),
    },
  ];

  const filteredCases = cases.filter((c) => {
    if (activeTab === 'pending') return c.status === 0;
    if (activeTab === 'examining') return c.status === 1;
    if (activeTab === 'completed') return c.status >= 2;
    return true;
  });

  return (
    <Spin spinning={loading}>
      <div>
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <AuditOutlined style={{ marginRight: 8 }} />
                Giám định Y khoa
              </Title>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>Tạo hồ sơ</Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={8} md={6}>
              <Search placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={fetchData} allowClear prefix={<SearchOutlined />} />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Select placeholder="Loại giám định" allowClear style={{ width: '100%' }} value={caseTypeFilter} onChange={setCaseTypeFilter}
                options={Object.entries(CASE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card><Statistic title="Tổng hồ sơ" value={stats.totalCases} prefix={<AuditOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card><Statistic title="Chờ giám định" value={stats.pendingCases} prefix={<ClockCircleOutlined />} styles={{ content: { color: '#faad14' } }} /></Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card><Statistic title="Hoàn thành tháng" value={stats.completedThisMonth} prefix={<CalendarOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card><Statistic title="TB % thương tật" value={stats.avgDisabilityPercent} suffix="%" prefix={<PercentageOutlined />} styles={{ content: { color: '#722ed1' } }} /></Card>
          </Col>
        </Row>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            { key: 'pending', label: <span><ClockCircleOutlined /> Chờ GĐ ({cases.filter((c) => c.status === 0).length})</span> },
            { key: 'examining', label: <span><EditOutlined /> Đang GĐ ({cases.filter((c) => c.status === 1).length})</span> },
            { key: 'completed', label: <span><CheckCircleOutlined /> Hoàn thành ({cases.filter((c) => c.status >= 2).length})</span> },
            { key: 'all', label: `Tất cả (${cases.length})` },
          ]} />
          <Table dataSource={filteredCases} columns={columns} rowKey="id" size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1200 }}
            onRow={(record) => ({ onDoubleClick: () => handleViewDetail(record), style: { cursor: 'pointer' } })} />
        </Card>

        <Drawer title="Chi tiết hồ sơ giám định" open={isDetailDrawerOpen} onClose={() => setIsDetailDrawerOpen(false)} width={600}>
          {selectedCase && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã hồ sơ">{selectedCase.caseCode}</Descriptions.Item>
                <Descriptions.Item label="Ngày YC">{selectedCase.requestDate ? dayjs(selectedCase.requestDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Bệnh nhân">{selectedCase.patientName}</Descriptions.Item>
                <Descriptions.Item label="Loại"><Tag color={CASE_TYPE_COLORS[selectedCase.caseType]}>{CASE_TYPE_LABELS[selectedCase.caseType]}</Tag></Descriptions.Item>
                <Descriptions.Item label="Cơ quan YC" span={2}>{selectedCase.requestingOrganization}</Descriptions.Item>
                <Descriptions.Item label="Mục đích" span={2}>{selectedCase.purpose || '-'}</Descriptions.Item>
                <Descriptions.Item label="% Thương tật">{selectedCase.disabilityPercent != null ? `${selectedCase.disabilityPercent}%` : '-'}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái"><Tag color={STATUS_COLORS[selectedCase.status]}>{STATUS_LABELS[selectedCase.status]}</Tag></Descriptions.Item>
                <Descriptions.Item label="Kết luận" span={2}>{selectedCase.conclusion || '-'}</Descriptions.Item>
              </Descriptions>
              <Title level={5} style={{ marginTop: 16 }}>Danh sách khám giám định</Title>
              <Table dataSource={examinations} rowKey="id" size="small" pagination={false}
                columns={[
                  { title: 'Loại khám', dataIndex: 'examType', width: 120 },
                  { title: 'Ngày khám', dataIndex: 'examDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                  { title: 'Kết luận', dataIndex: 'conclusion', ellipsis: true },
                  { title: 'BS khám', dataIndex: 'examinerName', width: 140 },
                ]} />
            </>
          )}
        </Drawer>

        <Modal title="Tạo hồ sơ giám định" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleCreateCase} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={createForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientName" label="Tên bệnh nhân" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
                  <Input placeholder="Họ và tên" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="patientCode" label="Mã BN">
                  <Input placeholder="Mã bệnh nhân" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="caseType" label="Loại giám định" rules={[{ required: true, message: 'Vui lòng chọn' }]}>
                  <Select options={Object.entries(CASE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="requestingOrganization" label="Cơ quan yêu cầu">
                  <Input placeholder="Tên cơ quan" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="disabilityPercent" label="% Thương tật">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="purpose" label="Mục đích giám định">
                  <TextArea rows={2} placeholder="Mục đích..." />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="notes" label="Ghi chú">
                  <TextArea rows={2} placeholder="Ghi chú..." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default MedicalForensics;
