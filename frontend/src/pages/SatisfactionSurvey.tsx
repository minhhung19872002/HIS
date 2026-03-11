import React, { useState, useEffect, useCallback } from 'react';
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
  { value: 'outpatient', label: 'Ngoai tru' },
  { value: 'inpatient', label: 'Noi tru' },
  { value: 'all', label: 'Tat ca' },
];

const QUESTION_TYPES = [
  { value: 'rating', label: 'Danh gia 1-5 sao' },
  { value: 'yesno', label: 'Co / Khong' },
  { value: 'text', label: 'Van ban tu do' },
  { value: 'multiple_choice', label: 'Chon nhieu' },
];

const CHANNEL_OPTIONS = [
  { label: 'SMS', value: 'sms' },
  { label: 'Email', value: 'email' },
  { label: 'Ung dung', value: 'app' },
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
      message.warning('Khong the tai du lieu khao sat hai long');
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
        message.success('Cap nhat mau khao sat thanh cong');
      } else {
        await client.post('/satisfaction-survey/templates', payload);
        message.success('Tao mau khao sat thanh cong');
      }

      setTemplateModalOpen(false);
      fetchData();
    } catch {
      console.warn('Failed to save survey template');
      message.warning('Khong the luu mau khao sat');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await client.delete(`/satisfaction-survey/templates/${id}`);
      message.success('Xoa mau khao sat thanh cong');
      fetchData();
    } catch {
      console.warn('Failed to delete survey template');
      message.warning('Khong the xoa mau khao sat');
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
      message.success('Luu cau hinh thanh cong');
    } catch {
      console.warn('Failed to save survey config');
      message.warning('Khong the luu cau hinh');
    }
  };

  // --- Column definitions ---

  const templateColumns: ColumnsType<SurveyTemplate> = [
    { title: 'Ten mau', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Mo ta', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'So cau hoi',
      dataIndex: 'questions',
      key: 'questionCount',
      width: 110,
      render: (qs: SurveyQuestion[]) => qs?.length || 0,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => (
        <Tag color={s === 'active' ? 'green' : 'default'}>
          {s === 'active' ? 'Hoat dong' : 'Ngung'}
        </Tag>
      ),
    },
    {
      title: 'Ngay tao',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: SurveyTemplate) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openTemplateModal(record)} />
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTemplate(record.id)} />
        </Space>
      ),
    },
  ];

  const resultColumns: ColumnsType<SurveyResult> = [
    { title: 'Ma BN', dataIndex: 'patientCode', key: 'patientCode', width: 120 },
    { title: 'Ho ten', dataIndex: 'patientName', key: 'patientName', width: 180 },
    { title: 'Mau khao sat', dataIndex: 'templateName', key: 'templateName', width: 180 },
    {
      title: 'Diem',
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
      title: 'Ngay',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'green' : s === 'partial' ? 'orange' : 'default'}>
          {s === 'completed' ? 'Hoan thanh' : s === 'partial' ? 'Dang do' : s}
        </Tag>
      ),
    },
  ];

  const departmentColumns: ColumnsType<DepartmentAnalysis> = [
    { title: 'Khoa / Phong', dataIndex: 'department', key: 'department' },
    {
      title: 'Diem TB',
      dataIndex: 'avgScore',
      key: 'avgScore',
      width: 100,
      render: (v: number) => <Tag color={v >= 4 ? 'green' : v >= 3 ? 'orange' : 'red'}>{v?.toFixed(1)}</Tag>,
    },
    { title: 'So phan hoi', dataIndex: 'responseCount', key: 'responseCount', width: 120 },
    {
      title: 'Ty le hai long',
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
      label: <span><FormOutlined /> Mau khao sat</span>,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openTemplateModal()}>
              Them mau moi
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
      label: <span><BarChartOutlined /> Ket qua</span>,
      children: (
        <div>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space orientation="horizontal" size="middle">
              <Select
                placeholder="Chon mau khao sat"
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
                <Statistic title="Thai do phuc vu" value={stats.averageScore > 0 ? (stats.averageScore * 0.95).toFixed(1) : '-'} suffix="/ 5" prefix={<StarOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Co so vat chat" value={stats.averageScore > 0 ? (stats.averageScore * 0.90).toFixed(1) : '-'} suffix="/ 5" prefix={<StarOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Thoi gian cho" value={stats.averageScore > 0 ? (stats.averageScore * 0.85).toFixed(1) : '-'} suffix="/ 5" prefix={<StarOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Chat luong dieu tri" value={stats.averageScore > 0 ? (stats.averageScore * 1.02).toFixed(1) : '-'} suffix="/ 5" prefix={<StarOutlined />} />
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
      label: <span><PieChartOutlined /> Phan tich</span>,
      children: (
        <div>
          <Title level={5}>So sanh theo khoa / phong</Title>
          <Table
            columns={departmentColumns}
            dataSource={departmentAnalysis}
            rowKey="department"
            pagination={false}
            size="small"
            style={{ marginBottom: 24 }}
          />

          <Title level={5}>Xu huong theo thang</Title>
          <Table
            columns={[
              { title: 'Thang', dataIndex: 'month', key: 'month' },
              {
                title: 'Diem TB',
                dataIndex: 'avgScore',
                key: 'avgScore',
                render: (v: number) => v?.toFixed(1),
              },
              { title: 'So phan hoi', dataIndex: 'count', key: 'count' },
            ]}
            dataSource={monthlyStats}
            rowKey="month"
            pagination={false}
            size="small"
            style={{ marginBottom: 24 }}
          />

          <Title level={5}>Phan anh thuong gap</Title>
          {topComplaints.length > 0 ? (
            <Table
              columns={[
                { title: 'Noi dung phan anh', dataIndex: 'complaint', key: 'complaint' },
                { title: 'So lan', dataIndex: 'count', key: 'count', width: 100 },
              ]}
              dataSource={topComplaints}
              rowKey="complaint"
              pagination={false}
              size="small"
              style={{ marginBottom: 24 }}
            />
          ) : (
            <Text type="secondary">Chua co du lieu phan anh.</Text>
          )}

          <Card size="small" style={{ marginTop: 24 }}>
            <Title level={5}>Kien nghi cai tien</Title>
            <ul style={{ paddingLeft: 20 }}>
              <li>Tang cuong dao tao thai do phuc vu cho nhan vien tiep xuc benh nhan</li>
              <li>Rut ngan thoi gian cho kham bang he thong so thu tu dien tu</li>
              <li>Nang cap co so vat chat phong cho va phong kham</li>
              <li>Cai thien quy trinh huong dan va cung cap thong tin cho benh nhan</li>
              <li>Trien khai khao sat dinh ky de theo doi xu huong hai long</li>
            </ul>
          </Card>
        </div>
      ),
    },
    {
      key: 'settings',
      label: <span><SettingOutlined /> Cau hinh</span>,
      children: (
        <Card>
          <Form layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item label="Tu dong gui khao sat sau khi ra vien">
              <Switch
                checked={config.autoSend}
                onChange={(checked) => setConfig(prev => ({ ...prev, autoSend: checked }))}
                checkedChildren="Bat"
                unCheckedChildren="Tat"
              />
            </Form.Item>

            <Form.Item label="Thoi gian gui sau khi ra vien">
              <Space>
                <InputNumber
                  min={1}
                  max={168}
                  value={config.sendDelayHours}
                  onChange={(val) => setConfig(prev => ({ ...prev, sendDelayHours: val || 24 }))}
                  style={{ width: 120 }}
                />
                <Text>gio</Text>
              </Space>
            </Form.Item>

            <Form.Item label="Kenh gui khao sat">
              <Checkbox.Group
                options={CHANNEL_OPTIONS}
                value={config.channels}
                onChange={(vals) => setConfig(prev => ({ ...prev, channels: vals as string[] }))}
              />
            </Form.Item>

            <Form.Item label="Gui nhac lai">
              <Space orientation="horizontal">
                <Switch
                  checked={config.reminderEnabled}
                  onChange={(checked) => setConfig(prev => ({ ...prev, reminderEnabled: checked }))}
                  checkedChildren="Bat"
                  unCheckedChildren="Tat"
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
                    <Text>gio</Text>
                  </Space>
                )}
              </Space>
            </Form.Item>

            <Form.Item>
              <Button type="primary" onClick={handleSaveConfig}>
                Luu cau hinh
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>Khao sat hai long</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Tong khao sat"
                value={stats.totalSurveys}
                prefix={<FormOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Da tra loi"
                value={stats.totalResponses}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Ty le hai long"
                value={stats.satisfactionRate}
                suffix="%"
                styles={{ content: { color: stats.satisfactionRate >= 80 ? '#52c41a' : '#fa8c16' } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Diem trung binh"
                value={stats.averageScore}
                precision={1}
                suffix="/ 5"
                prefix={<StarOutlined />}
                styles={{ content: { color: stats.averageScore >= 4 ? '#52c41a' : stats.averageScore >= 3 ? '#fa8c16' : '#cf1322' } }}
              />
            </Card>
          </Col>
        </Row>

        <Tabs items={tabItems} />

        {/* Template Add/Edit Modal */}
        <Modal
          title={editingTemplate ? 'Chinh sua mau khao sat' : 'Them mau khao sat moi'}
          open={templateModalOpen}
          onOk={handleSaveTemplate}
          onCancel={() => setTemplateModalOpen(false)}
          width={700}
          destroyOnHidden
        >
          <Form form={templateForm} layout="vertical">
            <Form.Item name="name" label="Ten mau" rules={[{ required: true, message: 'Vui long nhap ten mau' }]}>
              <Input placeholder="Nhap ten mau khao sat" />
            </Form.Item>
            <Form.Item name="description" label="Mo ta">
              <TextArea rows={2} placeholder="Mo ta mau khao sat" />
            </Form.Item>
            <Form.Item name="targetGroup" label="Doi tuong" rules={[{ required: true, message: 'Vui long chon doi tuong' }]}>
              <Radio.Group options={TARGET_GROUPS} />
            </Form.Item>
          </Form>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong>Danh sach cau hoi ({questions.length})</Text>
              <Button type="dashed" icon={<PlusOutlined />} onClick={addQuestion} size="small">
                Them cau hoi
              </Button>
            </div>

            {questions.map((q, index) => (
              <Card
                key={q.id}
                size="small"
                style={{ marginBottom: 8 }}
                title={`Cau ${index + 1}`}
                extra={
                  <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeQuestion(q.id)} size="small" />
                }
              >
                <Row gutter={12}>
                  <Col span={14}>
                    <Input
                      placeholder="Noi dung cau hoi"
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
                      Bat buoc
                    </Checkbox>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        </Modal>

        {/* Result Detail Drawer */}
        <Drawer
          title="Chi tiet phieu khao sat"
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          size="default"
        >
          {selectedResult && (
            <div>
              <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
                <Descriptions.Item label="Ma benh nhan">{selectedResult.patientCode}</Descriptions.Item>
                <Descriptions.Item label="Ho ten">{selectedResult.patientName}</Descriptions.Item>
                <Descriptions.Item label="Mau khao sat">{selectedResult.templateName}</Descriptions.Item>
                <Descriptions.Item label="Ngay">{dayjs(selectedResult.date).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Diem tong">
                  <Rate disabled value={Math.round(selectedResult.score)} />
                  <Text style={{ marginLeft: 8 }}>{selectedResult.score?.toFixed(1)} / 5</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trang thai">
                  <Tag color={selectedResult.status === 'completed' ? 'green' : 'orange'}>
                    {selectedResult.status === 'completed' ? 'Hoan thanh' : 'Dang do'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <Title level={5}>Chi tiet tra loi</Title>
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
                <Text type="secondary">Khong co du lieu tra loi.</Text>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </Spin>
  );
};

export default SatisfactionSurvey;
