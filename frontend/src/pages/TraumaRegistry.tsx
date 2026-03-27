import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form, InputNumber,
  Descriptions,
} from 'antd';
import {
  ThunderboltOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  EyeOutlined, WarningOutlined, ClockCircleOutlined,
  BarChartOutlined, CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as traumaApi from '../api/traumaRegistry';
import type { TraumaCase, TraumaStats } from '../api/traumaRegistry';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const TRIAGE_LABELS: Record<string, string> = { red: 'Đỏ - Cấp cứu', yellow: 'Vàng - Khẩn', green: 'Xanh - Ổn định', black: 'Đen - Tử vong' };
const TRIAGE_COLORS: Record<string, string> = { red: 'red', yellow: 'gold', green: 'green', black: 'default' };
const OUTCOME_LABELS: Record<string, string> = {
  recovered: 'Hồi phục', improved: 'Cải thiện', unchanged: 'Không đổi',
  worsened: 'Xấu đi', deceased: 'Tử vong', pending: 'Đang ĐT',
};
const OUTCOME_COLORS: Record<string, string> = {
  recovered: 'green', improved: 'cyan', unchanged: 'gold',
  worsened: 'orange', deceased: 'red', pending: 'processing',
};
const STATUS_LABELS: Record<number, string> = { 0: 'Nhập viện', 1: 'ICU', 2: 'Phòng bệnh', 3: 'Xuất viện', 4: 'Tử vong' };
const STATUS_COLORS: Record<number, string> = { 0: 'processing', 1: 'red', 2: 'blue', 3: 'success', 4: 'default' };

const TraumaRegistry: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<TraumaCase[]>([]);
  const [stats, setStats] = useState<TraumaStats>({ totalCasesThisMonth: 0, mortalityRate: 0, avgIssScore: 0, avgLengthOfStay: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [triageFilter, setTriageFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedCase, setSelectedCase] = useState<TraumaCase | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        keyword: keyword || undefined,
        triageCategory: triageFilter || undefined,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        traumaApi.searchCases(params),
        traumaApi.getStats(),
      ]);
      if (results[0].status === 'fulfilled') setCases(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
    } catch {
      message.warning('Không thể tải dữ liệu sổ chấn thương');
    } finally {
      setLoading(false);
    }
  }, [keyword, triageFilter, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      await traumaApi.createCase(values);
      message.success('Đã tạo hồ sơ chấn thương');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo hồ sơ');
    } finally { setSaving(false); }
  };

  const columns: ColumnsType<TraumaCase> = [
    { title: 'Mã HS', dataIndex: 'caseCode', width: 110 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', width: 160 },
    {
      title: 'Phân loại', dataIndex: 'triageCategory', width: 130,
      render: (t: string) => <Tag color={TRIAGE_COLORS[t]}>{TRIAGE_LABELS[t] || t}</Tag>,
    },
    { title: 'Loại chấn thương', dataIndex: 'injuryType', width: 150, ellipsis: true },
    { title: 'Cơ chế', dataIndex: 'injuryMechanism', width: 150, ellipsis: true },
    { title: 'ISS', dataIndex: 'issScore', width: 60 },
    { title: 'RTS', dataIndex: 'rtsScore', width: 60 },
    { title: 'GCS', dataIndex: 'gcsScore', width: 60 },
    {
      title: 'Ngày vào', dataIndex: 'admissionDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Kết quả', dataIndex: 'outcome', width: 110,
      render: (o: string) => <Tag color={OUTCOME_COLORS[o]}>{OUTCOME_LABELS[o] || o}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 100,
      render: (_: unknown, record: TraumaCase) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedCase(record); setIsDetailOpen(true); }}>Xem</Button>
      ),
    },
  ];

  const filteredCases = cases.filter((c) => {
    if (activeTab === 'red') return c.triageCategory === 'red';
    if (activeTab === 'yellow') return c.triageCategory === 'yellow';
    if (activeTab === 'green') return c.triageCategory === 'green';
    return true;
  });

  return (
    <Spin spinning={loading}>
      <div>
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col><Title level={4} style={{ margin: 0 }}><ThunderboltOutlined style={{ marginRight: 8 }} />Sổ chấn thương</Title></Col>
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
              <Select placeholder="Phân loại" allowClear style={{ width: '100%' }} value={triageFilter} onChange={setTriageFilter}
                options={Object.entries(TRIAGE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card><Statistic title="Ca trong tháng" value={stats.totalCasesThisMonth} prefix={<CalendarOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Tỷ lệ tử vong" value={stats.mortalityRate} suffix="%" prefix={<WarningOutlined />} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="ISS trung bình" value={stats.avgIssScore} precision={1} prefix={<BarChartOutlined />} styles={{ content: { color: '#722ed1' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="TB ngày nằm" value={stats.avgLengthOfStay} precision={1} suffix="ngày" prefix={<ClockCircleOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
        </Row>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            { key: 'all', label: `Tất cả (${cases.length})` },
            { key: 'red', label: <span style={{ color: '#ff4d4f' }}>Đỏ ({cases.filter(c => c.triageCategory === 'red').length})</span> },
            { key: 'yellow', label: <span style={{ color: '#faad14' }}>Vàng ({cases.filter(c => c.triageCategory === 'yellow').length})</span> },
            { key: 'green', label: <span style={{ color: '#52c41a' }}>Xanh ({cases.filter(c => c.triageCategory === 'green').length})</span> },
          ]} />
          <Table dataSource={filteredCases} columns={columns} rowKey="id" size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1500 }}
            onRow={(record) => ({
              onDoubleClick: () => { setSelectedCase(record); setIsDetailOpen(true); },
              style: {
                cursor: 'pointer',
                background: record.triageCategory === 'red' ? '#fff1f0' : record.triageCategory === 'yellow' ? '#fffbe6' : undefined,
              },
            })} />
        </Card>

        <Modal title="Chi tiết hồ sơ chấn thương" open={isDetailOpen} onCancel={() => setIsDetailOpen(false)} footer={null} width={700}>
          {selectedCase && (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Mã HS">{selectedCase.caseCode}</Descriptions.Item>
              <Descriptions.Item label="Bệnh nhân">{selectedCase.patientName}</Descriptions.Item>
              <Descriptions.Item label="Phân loại"><Tag color={TRIAGE_COLORS[selectedCase.triageCategory]}>{TRIAGE_LABELS[selectedCase.triageCategory]}</Tag></Descriptions.Item>
              <Descriptions.Item label="Kết quả"><Tag color={OUTCOME_COLORS[selectedCase.outcome]}>{OUTCOME_LABELS[selectedCase.outcome]}</Tag></Descriptions.Item>
              <Descriptions.Item label="Loại CT">{selectedCase.injuryType}</Descriptions.Item>
              <Descriptions.Item label="Cơ chế">{selectedCase.injuryMechanism}</Descriptions.Item>
              <Descriptions.Item label="ISS">{selectedCase.issScore}</Descriptions.Item>
              <Descriptions.Item label="RTS">{selectedCase.rtsScore}</Descriptions.Item>
              <Descriptions.Item label="GCS">{selectedCase.gcsScore}</Descriptions.Item>
              <Descriptions.Item label="Phẫu thuật">{selectedCase.surgeryRequired ? 'Có' : 'Không'}</Descriptions.Item>
              <Descriptions.Item label="Ngày ICU">{selectedCase.icuDays ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày thở máy">{selectedCase.ventilatorDays ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày nằm viện">{selectedCase.lengthOfStay ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="BS điều trị">{selectedCase.attendingDoctor}</Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>{selectedCase.notes || '-'}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        <Modal title="Tạo hồ sơ chấn thương" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleCreate} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={700} destroyOnHidden>
          <Form form={createForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="patientName" label="Bệnh nhân" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="patientCode" label="Mã BN"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="injuryType" label="Loại chấn thương" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input placeholder="Chấn thương sọ não, gãy xương..." /></Form.Item></Col>
              <Col span={12}><Form.Item name="injuryMechanism" label="Cơ chế"><Input placeholder="TNGT, ngã, bạo lực..." /></Form.Item></Col>
              <Col span={8}><Form.Item name="triageCategory" label="Phân loại" rules={[{ required: true, message: 'Chọn' }]}>
                <Select options={Object.entries(TRIAGE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={8}><Form.Item name="gcsScore" label="GCS (3-15)"><InputNumber min={3} max={15} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="issScore" label="ISS (0-75)"><InputNumber min={0} max={75} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={24}><Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default TraumaRegistry;
