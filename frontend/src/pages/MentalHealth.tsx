import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form,
  Descriptions, Drawer, Progress, Badge,
} from 'antd';
import {
  SmileOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  EyeOutlined, WarningOutlined, CalendarOutlined,
  CheckCircleOutlined, ClockCircleOutlined, AlertOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as mhApi from '../api/mentalHealth';
import type { MentalHealthCase, MentalHealthStats, MentalHealthAssessment } from '../api/mentalHealth';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const CASE_TYPE_LABELS: Record<string, string> = {
  schizophrenia: 'Tâm thần phân liệt', depression: 'Trầm cảm', anxiety: 'Lo âu',
  bipolar: 'Lưỡng cực', ptsd: 'PTSD', substance: 'Nghiện chất',
};
const CASE_TYPE_COLORS: Record<string, string> = {
  schizophrenia: 'red', depression: 'blue', anxiety: 'gold',
  bipolar: 'purple', ptsd: 'orange', substance: 'volcano',
};
const SEVERITY_LABELS: Record<string, string> = { mild: 'Nhẹ', moderate: 'Trung bình', severe: 'Nặng' };
const SEVERITY_COLORS: Record<string, string> = { mild: 'green', moderate: 'gold', severe: 'red' };
const STATUS_LABELS: Record<number, string> = { 0: 'Đang điều trị', 1: 'Ổn định', 2: 'Thuyên giảm', 3: 'Xuất viện' };
const STATUS_COLORS: Record<number, string> = { 0: 'processing', 1: 'success', 2: 'blue', 3: 'default' };
const ADHERENCE_LABELS: Record<string, string> = { good: 'Tốt', moderate: 'Trung bình', poor: 'Kém' };
const ADHERENCE_COLORS: Record<string, string> = { good: 'green', moderate: 'gold', poor: 'red' };

const MentalHealth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<MentalHealthCase[]>([]);
  const [stats, setStats] = useState<MentalHealthStats>({ activeCases: 0, severeCases: 0, overdueFollowUps: 0, assessmentsThisMonth: 0 });
  const [activeTab, setActiveTab] = useState('active');
  const [keyword, setKeyword] = useState('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedCase, setSelectedCase] = useState<MentalHealthCase | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [assessments, setAssessments] = useState<MentalHealthAssessment[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [screeningForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, number | undefined> = {
        active: 0, stable: 1, remission: 2, all: undefined,
      };
      const params = {
        keyword: keyword || undefined,
        status: statusMap[activeTab],
        caseType: caseTypeFilter || undefined,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        mhApi.searchCases(params),
        mhApi.getStats(),
      ]);
      if (results[0].status === 'fulfilled') setCases(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
    } catch {
      message.warning('Không thể tải dữ liệu sức khỏe tâm thần');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, caseTypeFilter, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewDetail = async (record: MentalHealthCase) => {
    setSelectedCase(record);
    setIsDetailDrawerOpen(true);
    try {
      const aList = await mhApi.getAssessments(record.id);
      setAssessments(aList);
    } catch {
      setAssessments([]);
    }
  };

  const handleCreateCase = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      await mhApi.createCase(values);
      message.success('Đã tạo hồ sơ tâm thần');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo hồ sơ');
    } finally { setSaving(false); }
  };

  const handleScreening = async () => {
    try {
      const values = await screeningForm.validateFields();
      setSaving(true);
      const answers = Array.from({ length: 9 }, (_, i) => values[`q${i + 1}`] || 0);
      await mhApi.screenDepression({ patientId: values.patientId || '', answers });
      message.success('Đã hoàn thành sàng lọc PHQ-9');
      setIsScreeningModalOpen(false);
      screeningForm.resetFields();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể thực hiện sàng lọc');
    } finally { setSaving(false); }
  };

  const columns: ColumnsType<MentalHealthCase> = [
    { title: 'Mã HS', dataIndex: 'caseCode', width: 110 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', width: 160 },
    {
      title: 'Loại bệnh', dataIndex: 'caseType', width: 150,
      render: (t: string) => <Tag color={CASE_TYPE_COLORS[t]}>{CASE_TYPE_LABELS[t] || t}</Tag>,
    },
    {
      title: 'Mức độ', dataIndex: 'severity', width: 110,
      render: (s: string) => <Tag color={SEVERITY_COLORS[s]}>{SEVERITY_LABELS[s] || s}</Tag>,
    },
    { title: 'Chẩn đoán', dataIndex: 'diagnosis', width: 200, ellipsis: true },
    {
      title: 'Tuân thủ', dataIndex: 'adherenceLevel', width: 110,
      render: (a: string) => <Badge color={ADHERENCE_COLORS[a]} text={ADHERENCE_LABELS[a] || a} />,
    },
    {
      title: 'Tái khám', dataIndex: 'nextFollowUpDate', width: 110,
      render: (d: string) => {
        if (!d) return '-';
        const isOverdue = dayjs(d).isBefore(dayjs(), 'day');
        return <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>{dayjs(d).format('DD/MM/YYYY')}</span>;
      },
    },
    { title: 'BS điều trị', dataIndex: 'psychiatristName', width: 140 },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 100,
      render: (_: unknown, record: MentalHealthCase) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>Xem</Button>
      ),
    },
  ];

  const filteredCases = cases.filter((c) => {
    if (activeTab === 'active') return c.status === 0;
    if (activeTab === 'stable') return c.status === 1;
    if (activeTab === 'remission') return c.status === 2;
    return true;
  });

  return (
    <Spin spinning={loading}>
      <div>
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col><Title level={4} style={{ margin: 0 }}><SmileOutlined style={{ marginRight: 8 }} />Sức khỏe tâm thần</Title></Col>
            <Col>
              <Space>
                <Button icon={<AlertOutlined />} onClick={() => setIsScreeningModalOpen(true)}>Sàng lọc PHQ-9</Button>
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
              <Select placeholder="Loại bệnh" allowClear style={{ width: '100%' }} value={caseTypeFilter} onChange={setCaseTypeFilter}
                options={Object.entries(CASE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card><Statistic title="Đang điều trị" value={stats.activeCases} prefix={<SmileOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Nặng" value={stats.severeCases} prefix={<WarningOutlined />} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Quá hạn tái khám" value={stats.overdueFollowUps} prefix={<ClockCircleOutlined />} styles={{ content: { color: '#faad14' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Đánh giá tháng" value={stats.assessmentsThisMonth} prefix={<CalendarOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
        </Row>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            { key: 'active', label: <span><ClockCircleOutlined /> Đang ĐT ({cases.filter(c => c.status === 0).length})</span> },
            { key: 'stable', label: <span><CheckCircleOutlined /> Ổn định ({cases.filter(c => c.status === 1).length})</span> },
            { key: 'remission', label: <span><SmileOutlined /> Thuyên giảm ({cases.filter(c => c.status === 2).length})</span> },
            { key: 'all', label: `Tất cả (${cases.length})` },
          ]} />
          <Table dataSource={filteredCases} columns={columns} rowKey="id" size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1400 }}
            onRow={(record) => ({ onDoubleClick: () => handleViewDetail(record), style: { cursor: 'pointer' } })} />
        </Card>

        <Drawer title="Chi tiết hồ sơ tâm thần" open={isDetailDrawerOpen} onClose={() => setIsDetailDrawerOpen(false)} size="large">
          {selectedCase && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã HS">{selectedCase.caseCode}</Descriptions.Item>
                <Descriptions.Item label="Bệnh nhân">{selectedCase.patientName}</Descriptions.Item>
                <Descriptions.Item label="Loại"><Tag color={CASE_TYPE_COLORS[selectedCase.caseType]}>{CASE_TYPE_LABELS[selectedCase.caseType]}</Tag></Descriptions.Item>
                <Descriptions.Item label="Mức độ"><Tag color={SEVERITY_COLORS[selectedCase.severity]}>{SEVERITY_LABELS[selectedCase.severity]}</Tag></Descriptions.Item>
                <Descriptions.Item label="Chẩn đoán" span={2}>{selectedCase.diagnosis}</Descriptions.Item>
                <Descriptions.Item label="Thuốc" span={2}>{selectedCase.medications || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tuân thủ"><Badge color={ADHERENCE_COLORS[selectedCase.adherenceLevel]} text={ADHERENCE_LABELS[selectedCase.adherenceLevel]} /></Descriptions.Item>
                <Descriptions.Item label="BS điều trị">{selectedCase.psychiatristName}</Descriptions.Item>
              </Descriptions>
              <Title level={5} style={{ marginTop: 16 }}>Lịch sử đánh giá</Title>
              <Table dataSource={assessments} rowKey="id" size="small" pagination={false}
                columns={[
                  { title: 'Loại', dataIndex: 'assessmentType', width: 80 },
                  { title: 'Ngày', dataIndex: 'assessmentDate', width: 100, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                  { title: 'Điểm', dataIndex: 'totalScore', width: 60 },
                  { title: 'Nhận xét', dataIndex: 'interpretation', ellipsis: true },
                  { title: 'Người ĐG', dataIndex: 'assessorName', width: 130 },
                ]}
                expandable={{
                  expandedRowRender: (record: MentalHealthAssessment) => (
                    <div>
                      <p><strong>Phát hiện:</strong> {record.findings}</p>
                      <p><strong>Khuyến nghị:</strong> {record.recommendations}</p>
                      {record.assessmentType === 'PHQ9' && (
                        <Progress percent={Math.round((record.totalScore / 27) * 100)} size="small"
                          status={record.totalScore >= 15 ? 'exception' : record.totalScore >= 10 ? 'active' : 'success'} />
                      )}
                    </div>
                  ),
                }} />
            </>
          )}
        </Drawer>

        <Modal title="Tạo hồ sơ tâm thần" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleCreateCase} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={createForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="patientName" label="Bệnh nhân" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="patientCode" label="Mã BN"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="caseType" label="Loại bệnh" rules={[{ required: true, message: 'Vui lòng chọn' }]}>
                <Select options={Object.entries(CASE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="severity" label="Mức độ">
                <Select options={Object.entries(SEVERITY_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={24}><Form.Item name="diagnosis" label="Chẩn đoán" rules={[{ required: true, message: 'Vui lòng nhập' }]}><TextArea rows={2} /></Form.Item></Col>
              <Col span={24}><Form.Item name="medications" label="Thuốc điều trị"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Modal title="Sàng lọc trầm cảm PHQ-9" open={isScreeningModalOpen} onCancel={() => setIsScreeningModalOpen(false)}
          onOk={handleScreening} okText="Hoàn thành" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={screeningForm} layout="vertical">
            <Form.Item name="patientId" label="Mã bệnh nhân"><Input placeholder="Nhập mã BN" /></Form.Item>
            {['Ít hứng thú/vui vẻ', 'Buồn bã/chán nản/tuyệt vọng', 'Khó ngủ/ngủ nhiều', 'Mệt mỏi/ít năng lượng',
              'Kém ăn/ăn nhiều', 'Tự ti/thất bại', 'Khó tập trung', 'Chậm chạp/bồn chồn', 'Nghĩ đến tự tử'].map((q, i) => (
              <Form.Item key={i} name={`q${i + 1}`} label={`${i + 1}. ${q}`} initialValue={0}>
                <Select options={[
                  { value: 0, label: '0 - Không hề' }, { value: 1, label: '1 - Vài ngày' },
                  { value: 2, label: '2 - Hơn nửa' }, { value: 3, label: '3 - Gần như mỗi ngày' },
                ]} />
              </Form.Item>
            ))}
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default MentalHealth;
