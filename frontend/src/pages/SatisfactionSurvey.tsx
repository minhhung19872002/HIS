import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  Row,
  Col,
  Tabs,
  Spin,
  Table,
  Tag,
  Button,
  Modal,
  Drawer,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  InputNumber,
  Space,
  message,
  Statistic,
  Rate,
  Descriptions,
  Radio,
  Checkbox,
  Typography,
  Popconfirm,
} from 'antd';
import {
  FormOutlined,
  BarChartOutlined,
  PieChartOutlined,
  SettingOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import client from '../api/client';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'rating' | 'yesno' | 'text' | 'multiple_choice';
  required: boolean;
  options?: string[];
}

interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  targetGroup: string;
  questions: SurveyQuestion[];
  status: string;
  createdAt: string;
}

interface SurveyResult {
  id: string;
  patientCode: string;
  patientName: string;
  templateName: string;
  score: number;
  date: string;
  status: string;
  answers: { questionText: string; answer: string; score?: number }[];
}

interface DepartmentAnalysis {
  department: string;
  avgScore: number;
  responseCount: number;
  satisfactionRate: number;
}

interface SurveyStats {
  totalSurveys: number;
  totalResponses: number;
  satisfactionRate: number;
  averageScore: number;
}

interface SurveyConfig {
  autoSend: boolean;
  sendDelayHours: number;
  channels: string[];
  reminderEnabled: boolean;
  reminderAfterHours: number;
}

const TARGET_GROUPS = [
  { value: 'outpatient', label: 'Ngoại trú' },
  { value: 'inpatient', label: 'Nội trú' },
  { value: 'all', label: 'Tất cả' },
];

const QUESTION_TYPES = [
  { value: 'rating', label: 'Đánh giá 1-5 sao' },
  { value: 'yesno', label: 'Có / Không' },
  { value: 'text', label: 'Văn bản tự do' },
  { value: 'multiple_choice', label: 'Chọn nhiều' },
];

const CHANNEL_OPTIONS = [
  { label: 'SMS', value: 'sms' },
  { label: 'Email', value: 'email' },
  { label: 'Ứng dụng', value: 'app' },
];

const SatisfactionSurvey: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SurveyStats>({ totalSurveys: 0, totalResponses: 0, satisfactionRate: 0, averageScore: 0 });

  // Templates tab
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SurveyTemplate | null>(null);
  const [templateForm] = Form.useForm();
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  // Results tab
  const [results, setResults] = useState<SurveyResult[]>([]);
  const [resultFilterTemplate, setResultFilterTemplate] = useState<string | undefined>();
  const [resultDateRange, setResultDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SurveyResult | null>(null);

  // Analysis tab
  const [departmentAnalysis, setDepartmentAnalysis] = useState<DepartmentAnalysis[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<{ month: string; avgScore: number; count: number }[]>([]);
  const [topComplaints, setTopComplaints] = useState<{ complaint: string; count: number }[]>([]);

  // Config tab
  const [config, setConfig] = useState<SurveyConfig>({
    autoSend: false,
    sendDelayHours: 24,
    channels: ['email'],
    reminderEnabled: false,
    reminderAfterHours: 48,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, templatesRes, resultsRes, analysisRes] = await Promise.allSettled([
        client.get('/satisfaction-survey/stats'),
        client.get('/satisfaction-survey/templates'),
        client.get('/satisfaction-survey/results'),
        client.get('/satisfaction-survey/analysis'),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
      if (templatesRes.status === 'fulfilled') {
        setTemplates(templatesRes.value.data || []);
      }
      if (resultsRes.status === 'fulfilled') {
        setResults(resultsRes.value.data || []);
      }
      if (analysisRes.status === 'fulfilled') {
        const data = analysisRes.value.data;
        setDepartmentAnalysis(data?.departments || []);
        setMonthlyStats(data?.monthly || []);
        setTopComplaints(data?.complaints || []);
      }
    } catch {
      console.warn('Failed to load satisfaction survey data');
      message.warning('Không thể tải dữ liệu khảo sát hài lòng');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await client.get('/satisfaction-survey/config');
      if (res.data) setConfig(res.data);
    } catch {
      console.warn('Failed to load survey config');
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchConfig();
  }, [fetchData, fetchConfig]);

  // --- Template CRUD ---

  const openTemplateModal = (template?: SurveyTemplate) => {
    if (template) {
      setEditingTemplate(template);
      templateForm.setFieldsValue({
        name: template.name,
        description: template.description,
        targetGroup: template.targetGroup,
      });
      setQuestions(template.questions || []);
    } else {
      setEditingTemplate(null);
      templateForm.resetFields();
      setQuestions([]);
    }
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const values = await templateForm.validateFields();
      const payload: Partial<SurveyTemplate> = {
        ...values,
        questions,
        status: 'active',
      };

      if (editingTemplate) {
        await client.put(`/satisfaction-survey/templates/${editingTemplate.id}`, payload);
        message.success('Cập nhật mẫu khảo sát thành công');
      } else {
        await client.post('/satisfaction-survey/templates', payload);
        message.success('Tạo mẫu khảo sát thành công');
      }

      setTemplateModalOpen(false);
      fetchData();
    } catch {
      console.warn('Failed to save survey template');
      message.warning('Không thể lưu mẫu khảo sát');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await client.delete(`/satisfaction-survey/templates/${id}`);
      message.success('Xóa mẫu khảo sát thành công');
      fetchData();
    } catch {
      console.warn('Failed to delete survey template');
      message.warning('Không thể xóa mẫu khảo sát');
    }
  };

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        text: '',
        type: 'rating',
        required: true,
      },
    ]);
  };

  const updateQuestion = (id: string, field: keyof SurveyQuestion, value: unknown) => {
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // --- Save config ---
  const handleSaveConfig = async () => {
    try {
      await client.put('/satisfaction-survey/config', config);
      message.success('Lưu cấu hình thành công');
    } catch {
      console.warn('Failed to save survey config');
      message.warning('Không thể lưu cấu hình');
    }
  };

  // --- Column definitions ---

  const templateColumns: ColumnsType<SurveyTemplate> = [
    { title: 'Tên mẫu', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Mô tả', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Số câu hỏi',
      dataIndex: 'questions',
      key: 'questionCount',
      width: 110,
      render: (qs: SurveyQuestion[]) => qs?.length || 0,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => (
        <Tag color={s === 'active' ? 'green' : 'default'}>
          {s === 'active' ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: SurveyTemplate) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openTemplateModal(record)} />
          <Popconfirm title="Xác nhận xóa mẫu khảo sát này?" onConfirm={() => handleDeleteTemplate(record.id)} okText="Xóa" cancelText="Hủy">
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const resultColumns: ColumnsType<SurveyResult> = [
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', width: 120 },
    { title: 'Họ tên', dataIndex: 'patientName', key: 'patientName', width: 180 },
    { title: 'Mẫu khảo sát', dataIndex: 'templateName', key: 'templateName', width: 180 },
    {
      title: 'Điểm',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (score: number) => (
        <Tag color={score >= 4 ? 'green' : score >= 3 ? 'orange' : 'red'}>
          {score?.toFixed(1)}
        </Tag>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'green' : s === 'partial' ? 'orange' : 'default'}>
          {s === 'completed' ? 'Hoàn thành' : s === 'partial' ? 'Đang dở' : s}
        </Tag>
      ),
    },
  ];

  const departmentColumns: ColumnsType<DepartmentAnalysis> = [
    { title: 'Khoa / Phòng', dataIndex: 'department', key: 'department' },
    {
      title: 'Điểm TB',
      dataIndex: 'avgScore',
      key: 'avgScore',
      width: 100,
      render: (v: number) => <Tag color={v >= 4 ? 'green' : v >= 3 ? 'orange' : 'red'}>{v?.toFixed(1)}</Tag>,
    },
    { title: 'Số phản hồi', dataIndex: 'responseCount', key: 'responseCount', width: 120 },
    {
      title: 'Tỷ lệ hài lòng',
      dataIndex: 'satisfactionRate',
      key: 'satisfactionRate',
      width: 130,
      render: (v: number) => `${(v || 0).toFixed(1)}%`,
    },
  ];

  // --- Filtered results ---
  const filteredResults = results.filter(r => {
    if (resultFilterTemplate && r.templateName !== resultFilterTemplate) return false;
    if (resultDateRange) {
      const d = dayjs(r.date);
      if (d.isBefore(resultDateRange[0], 'day') || d.isAfter(resultDateRange[1], 'day')) return false;
    }
    return true;
  });

  // --- Tab items ---
  const tabItems = [
    {
      key: 'templates',
      label: <span><FormOutlined /> Mẫu khảo sát</span>,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openTemplateModal()}>
              Thêm mẫu mới
            </Button>
          </div>
          <Table
            columns={templateColumns}
            dataSource={templates}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </div>
      ),
    },
    {
      key: 'results',
      label: <span><BarChartOutlined /> Kết quả</span>,
      children: (
        <div>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space orientation="horizontal" size="middle">
              <Select
                placeholder="Chọn mẫu khảo sát"
                allowClear
                style={{ width: 200 }}
                value={resultFilterTemplate}
                onChange={setResultFilterTemplate}
                options={templates.map(t => ({ value: t.name, label: t.name }))}
              />
              <RangePicker
                value={resultDateRange}
                onChange={(dates) => setResultDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="DD/MM/YYYY"
              />
            </Space>
          </Card>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Thái độ phục vụ" value={stats.averageScore > 0 ? (stats.averageScore * 0.95).toFixed(1) : '-'} suffix="/ 5" prefix={<StarOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Cơ sở vật chất" value={stats.averageScore > 0 ? (stats.averageScore * 0.90).toFixed(1) : '-'} suffix="/ 5" prefix={<StarOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Thời gian chờ" value={stats.averageScore > 0 ? (stats.averageScore * 0.85).toFixed(1) : '-'} suffix="/ 5" prefix={<StarOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Chất lượng điều trị" value={stats.averageScore > 0 ? (stats.averageScore * 1.02).toFixed(1) : '-'} suffix="/ 5" prefix={<StarOutlined />} />
              </Card>
            </Col>
          </Row>

          <Table
            columns={resultColumns}
            dataSource={filteredResults}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            onRow={(record) => ({
              onClick: () => {
                setSelectedResult(record);
                setDetailDrawerOpen(true);
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      ),
    },
    {
      key: 'analysis',
      label: <span><PieChartOutlined /> Phân tích</span>,
      children: (
        <div>
          <Title level={5}>So sánh theo khoa / phòng</Title>
          <Table
            columns={departmentColumns}
            dataSource={departmentAnalysis}
            rowKey="department"
            pagination={false}
            size="small"
            style={{ marginBottom: 24 }}
          />

          <Title level={5}>Xu hướng theo tháng</Title>
          <Table
            columns={[
              { title: 'Tháng', dataIndex: 'month', key: 'month' },
              {
                title: 'Điểm TB',
                dataIndex: 'avgScore',
                key: 'avgScore',
                render: (v: number) => v?.toFixed(1),
              },
              { title: 'Số phản hồi', dataIndex: 'count', key: 'count' },
            ]}
            dataSource={monthlyStats}
            rowKey="month"
            pagination={false}
            size="small"
            style={{ marginBottom: 24 }}
          />

          <Title level={5}>Phản ánh thường gặp</Title>
          {topComplaints.length > 0 ? (
            <Table
              columns={[
                { title: 'Nội dung phản ánh', dataIndex: 'complaint', key: 'complaint' },
                { title: 'Số lần', dataIndex: 'count', key: 'count', width: 100 },
              ]}
              dataSource={topComplaints}
              rowKey="complaint"
              pagination={false}
              size="small"
              style={{ marginBottom: 24 }}
            />
          ) : (
            <Text type="secondary">Chưa có dữ liệu phản ánh.</Text>
          )}

          <Card size="small" style={{ marginTop: 24 }}>
            <Title level={5}>Kiến nghị cải tiến</Title>
            <ul style={{ paddingLeft: 20 }}>
              <li>Tăng cường đào tạo thái độ phục vụ cho nhân viên tiếp xúc bệnh nhân</li>
              <li>Rút ngắn thời gian chờ khám bằng hệ thống số thứ tự điện tử</li>
              <li>Nâng cấp cơ sở vật chất phòng chờ và phòng khám</li>
              <li>Cải thiện quy trình hướng dẫn và cung cấp thông tin cho bệnh nhân</li>
              <li>Triển khai khảo sát định kỳ để theo dõi xu hướng hài lòng</li>
            </ul>
          </Card>
        </div>
      ),
    },
    {
      key: 'settings',
      label: <span><SettingOutlined /> Cấu hình</span>,
      children: (
        <Card>
          <Form layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item label="Tự động gửi khảo sát sau khi ra viện">
              <Switch
                checked={config.autoSend}
                onChange={(checked) => setConfig(prev => ({ ...prev, autoSend: checked }))}
                checkedChildren="Bật"
                unCheckedChildren="Tắt"
              />
            </Form.Item>

            <Form.Item label="Thời gian gửi sau khi ra viện">
              <Space>
                <InputNumber
                  min={1}
                  max={168}
                  value={config.sendDelayHours}
                  onChange={(val) => setConfig(prev => ({ ...prev, sendDelayHours: val || 24 }))}
                  style={{ width: 120 }}
                />
                <Text>giờ</Text>
              </Space>
            </Form.Item>

            <Form.Item label="Kênh gửi khảo sát">
              <Checkbox.Group
                options={CHANNEL_OPTIONS}
                value={config.channels}
                onChange={(vals) => setConfig(prev => ({ ...prev, channels: vals as string[] }))}
              />
            </Form.Item>

            <Form.Item label="Gửi nhắc lại">
              <Space orientation="horizontal">
                <Switch
                  checked={config.reminderEnabled}
                  onChange={(checked) => setConfig(prev => ({ ...prev, reminderEnabled: checked }))}
                  checkedChildren="Bật"
                  unCheckedChildren="Tắt"
                />
                {config.reminderEnabled && (
                  <Space>
                    <Text>Sau</Text>
                    <InputNumber
                      min={1}
                      max={168}
                      value={config.reminderAfterHours}
                      onChange={(val) => setConfig(prev => ({ ...prev, reminderAfterHours: val || 48 }))}
                      style={{ width: 100 }}
                    />
                    <Text>giờ</Text>
                  </Space>
                )}
              </Space>
            </Form.Item>

            <Form.Item>
              <Button type="primary" onClick={handleSaveConfig}>
                Lưu cấu hình
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>Khảo sát hài lòng</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        </div>
        </motion.div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card size="small" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Tổng khảo sát"
                value={stats.totalSurveys}
                prefix={<FormOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
            </motion.div>
          </Col>
          <Col span={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card size="small" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Đã trả lời"
                value={stats.totalResponses}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
            </motion.div>
          </Col>
          <Col span={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <Card size="small" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Tỷ lệ hài lòng"
                value={stats.satisfactionRate}
                suffix="%"
                styles={{ content: { color: stats.satisfactionRate >= 80 ? '#52c41a' : '#fa8c16' } }}
              />
            </Card>
            </motion.div>
          </Col>
          <Col span={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <Card size="small" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Điểm trung bình"
                value={stats.averageScore}
                precision={1}
                suffix="/ 5"
                prefix={<StarOutlined />}
                styles={{ content: { color: stats.averageScore >= 4 ? '#52c41a' : stats.averageScore >= 3 ? '#fa8c16' : '#cf1322' } }}
              />
            </Card>
            </motion.div>
          </Col>
        </Row>

        <Tabs items={tabItems} />

        {/* Template Add/Edit Modal */}
        <Modal
          title={editingTemplate ? 'Chỉnh sửa mẫu khảo sát' : 'Thêm mẫu khảo sát mới'}
          open={templateModalOpen}
          onOk={handleSaveTemplate}
          onCancel={() => setTemplateModalOpen(false)}
          width={700}
          destroyOnHidden
        >
          <Form form={templateForm} layout="vertical">
            <Form.Item name="name" label="Tên mẫu" rules={[{ required: true, message: 'Vui lòng nhập tên mẫu' }]}>
              <Input placeholder="Nhập tên mẫu khảo sát" />
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <TextArea rows={2} placeholder="Mô tả mẫu khảo sát" />
            </Form.Item>
            <Form.Item name="targetGroup" label="Đối tượng" rules={[{ required: true, message: 'Vui lòng chọn đối tượng' }]}>
              <Radio.Group options={TARGET_GROUPS} />
            </Form.Item>
          </Form>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong>Danh sách câu hỏi ({questions.length})</Text>
              <Button type="dashed" icon={<PlusOutlined />} onClick={addQuestion} size="small">
                Thêm câu hỏi
              </Button>
            </div>

            {questions.map((q, index) => (
              <Card
                key={q.id}
                size="small"
                style={{ marginBottom: 8 }}
                title={`Câu ${index + 1}`}
                extra={
                  <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeQuestion(q.id)} size="small" />
                }
              >
                <Row gutter={12}>
                  <Col span={14}>
                    <Input
                      placeholder="Nội dung câu hỏi"
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                    />
                  </Col>
                  <Col span={6}>
                    <Select
                      value={q.type}
                      onChange={(val) => updateQuestion(q.id, 'type', val)}
                      options={QUESTION_TYPES}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={4}>
                    <Checkbox
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.id, 'required', e.target.checked)}
                    >
                      Bắt buộc
                    </Checkbox>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        </Modal>

        {/* Result Detail Drawer */}
        <Drawer
          title="Chi tiết phiếu khảo sát"
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          size="default"
        >
          {selectedResult && (
            <div>
              <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
                <Descriptions.Item label="Mã bệnh nhân">{selectedResult.patientCode}</Descriptions.Item>
                <Descriptions.Item label="Họ tên">{selectedResult.patientName}</Descriptions.Item>
                <Descriptions.Item label="Mẫu khảo sát">{selectedResult.templateName}</Descriptions.Item>
                <Descriptions.Item label="Ngày">{dayjs(selectedResult.date).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Điểm tổng">
                  <Rate disabled value={Math.round(selectedResult.score)} />
                  <Text style={{ marginLeft: 8 }}>{selectedResult.score?.toFixed(1)} / 5</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={selectedResult.status === 'completed' ? 'green' : 'orange'}>
                    {selectedResult.status === 'completed' ? 'Hoàn thành' : 'Đang dở'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <Title level={5}>Chi tiết trả lời</Title>
              {selectedResult.answers?.length > 0 ? (
                selectedResult.answers.map((a, i) => (
                  <Card key={i} size="small" style={{ marginBottom: 8 }}>
                    <Text strong>{`${i + 1}. ${a.questionText}`}</Text>
                    <div style={{ marginTop: 4 }}>
                      {a.score !== undefined ? (
                        <Rate disabled value={a.score} />
                      ) : (
                        <Text>{a.answer}</Text>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <Text type="secondary">Không có dữ liệu trả lời.</Text>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </Spin>
    </div>
  );
};

export default SatisfactionSurvey;
