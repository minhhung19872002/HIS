import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Tag,
  Row,
  Col,
  Select,
  DatePicker,
  Typography,
  message,
  Tabs,
  Statistic,
  Spin,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Divider,
  Progress,
} from 'antd';
import {
  MedicineBoxOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExperimentOutlined,
  CalendarOutlined,
  BarChartOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as methadoneApi from '../api/methadone';
import type { MethadonePatient, DoseRecord, UrineTest, MethadoneStats } from '../api/methadone';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  induction: { label: 'Khởi liều', color: 'blue' },
  stabilization: { label: 'Ổn định', color: 'cyan' },
  maintenance: { label: 'Duy trì', color: 'green' },
  tapering: { label: 'Giảm liều', color: 'orange' },
};

const PATIENT_STATUS_LABELS: Record<number, string> = {
  0: 'Đang điều trị',
  1: 'Tạm ngưng',
  2: 'Đã xuất',
  3: 'Chuyển CSĐT',
};

const PATIENT_STATUS_COLORS: Record<number, string> = {
  0: 'success',
  1: 'warning',
  2: 'default',
  3: 'processing',
};

const DOSE_STATUS_LABELS: Record<number, string> = {
  0: 'Lên lịch',
  1: 'Đã uống',
  2: 'Bỏ liều',
  3: 'Từ chối',
};

const DOSE_STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'success',
  2: 'error',
  3: 'warning',
};

const URINE_RESULT_COLORS: Record<string, string> = {
  positive: 'red',
  negative: 'green',
};

const MethadoneTreatment: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('patients');
  const [patients, setPatients] = useState<MethadonePatient[]>([]);
  const [doses, setDoses] = useState<DoseRecord[]>([]);
  const [urineTests, setUrineTests] = useState<UrineTest[]>([]);
  const [stats, setStats] = useState<MethadoneStats>({
    activePatients: 0,
    todayDoses: 0,
    monthlyUrineTests: 0,
    missedDoses: 0,
  });
  const [keyword, setKeyword] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string | undefined>();

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isDoseModalOpen, setIsDoseModalOpen] = useState(false);
  const [isUrineModalOpen, setIsUrineModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<MethadonePatient | null>(null);
  const [enrollForm] = Form.useForm();
  const [doseForm] = Form.useForm();
  const [urineForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        methadoneApi.searchMethadonePatients({ keyword: keyword || undefined, phase: phaseFilter }),
        methadoneApi.getDosingHistory({}),
        methadoneApi.getUrineTests({}),
        methadoneApi.getMethadoneStats(),
      ]);
      if (results[0].status === 'fulfilled') setPatients(results[0].value);
      if (results[1].status === 'fulfilled') setDoses(results[1].value);
      if (results[2].status === 'fulfilled') setUrineTests(results[2].value);
      if (results[3].status === 'fulfilled') setStats(results[3].value);
    } catch {
      message.warning('Không thể tải dữ liệu Methadone');
    } finally {
      setLoading(false);
    }
  }, [keyword, phaseFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewPatient = (record: MethadonePatient) => {
    setSelectedPatient(record);
    setIsDetailModalOpen(true);
  };

  const handleEnrollPatient = async () => {
    try {
      const values = await enrollForm.validateFields();
      setSaving(true);
      await methadoneApi.enrollPatient({
        ...values,
        enrollmentDate: values.enrollmentDate?.format('YYYY-MM-DD'),
        dateOfBirth: values.dateOfBirth?.format('YYYY-MM-DD'),
      });
      message.success('Đã đăng ký bệnh nhân Methadone');
      setIsEnrollModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể đăng ký bệnh nhân');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordDose = async () => {
    try {
      const values = await doseForm.validateFields();
      setSaving(true);
      await methadoneApi.recordDose({
        ...values,
        doseDate: values.doseDate?.format('YYYY-MM-DD'),
      });
      message.success('Đã ghi nhận cấp liều');
      setIsDoseModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể ghi nhận cấp liều');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordUrineTest = async () => {
    try {
      const values = await urineForm.validateFields();
      setSaving(true);
      await methadoneApi.recordUrineTest({
        ...values,
        testDate: values.testDate?.format('YYYY-MM-DD'),
      });
      message.success('Đã ghi nhận xét nghiệm nước tiểu');
      setIsUrineModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể ghi nhận xét nghiệm');
    } finally {
      setSaving(false);
    }
  };

  const patientColumns: ColumnsType<MethadonePatient> = [
    { title: 'Họ tên', dataIndex: 'patientName', key: 'patientName', width: 150 },
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', width: 100 },
    { title: 'Giới', dataIndex: 'gender', key: 'gender', width: 60, render: (g: number) => g === 1 ? 'Nam' : 'Nữ' },
    { title: 'Ngày ĐK', dataIndex: 'enrollmentDate', key: 'enrollmentDate', width: 100, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    {
      title: 'Giai đoạn', dataIndex: 'phase', key: 'phase', width: 110,
      render: (p: string) => {
        const info = PHASE_LABELS[p];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>{p}</Tag>;
      },
    },
    { title: 'Liều hiện tại', dataIndex: 'currentDose', key: 'currentDose', width: 100, render: (d: number) => d ? `${d} mg` : '-' },
    { title: 'Hình thức', dataIndex: 'doseType', key: 'doseType', width: 100, render: (t: string) => t === 'witnessed' ? 'Uống tại chỗ' : 'Mang về' },
    { title: 'Liều cuối', dataIndex: 'lastDoseDate', key: 'lastDoseDate', width: 100, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Bỏ liều', dataIndex: 'missedDoses', key: 'missedDoses', width: 70, render: (n: number) => n > 0 ? <Tag color="red">{n}</Tag> : <Tag color="green">0</Tag> },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110,
      render: (s: number) => <Tag color={PATIENT_STATUS_COLORS[s]}>{PATIENT_STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 100,
      render: (_: unknown, record: MethadonePatient) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewPatient(record)}>Xem</Button>
      ),
    },
  ];

  const doseColumns: ColumnsType<DoseRecord> = [
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 150 },
    { title: 'Ngày', dataIndex: 'doseDate', key: 'doseDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Liều (mg)', dataIndex: 'doseAmount', key: 'doseAmount', width: 80 },
    { title: 'Hình thức', dataIndex: 'doseType', key: 'doseType', width: 100, render: (t: string) => t === 'witnessed' ? 'Uống tại chỗ' : 'Mang về' },
    { title: 'Người cấp', dataIndex: 'administeredBy', key: 'administeredBy', width: 130 },
    { title: 'Người chứng kiến', dataIndex: 'witnessedBy', key: 'witnessedBy', width: 130 },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (s: number) => <Tag color={DOSE_STATUS_COLORS[s]}>{DOSE_STATUS_LABELS[s]}</Tag>,
    },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', width: 150, ellipsis: true },
  ];

  const urineColumns: ColumnsType<UrineTest> = [
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 150 },
    { title: 'Ngày XN', dataIndex: 'testDate', key: 'testDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    {
      title: 'Morphine', dataIndex: 'morphine', key: 'morphine', width: 100,
      render: (v: string) => <Tag color={URINE_RESULT_COLORS[v] || 'default'}>{v === 'positive' ? 'Dương tính' : 'Âm tính'}</Tag>,
    },
    {
      title: 'Amphetamine', dataIndex: 'amphetamine', key: 'amphetamine', width: 100,
      render: (v: string) => <Tag color={URINE_RESULT_COLORS[v] || 'default'}>{v === 'positive' ? 'Dương tính' : 'Âm tính'}</Tag>,
    },
    {
      title: 'THC', dataIndex: 'thc', key: 'thc', width: 100,
      render: (v: string) => <Tag color={URINE_RESULT_COLORS[v] || 'default'}>{v === 'positive' ? 'Dương tính' : 'Âm tính'}</Tag>,
    },
    {
      title: 'Benzo', dataIndex: 'benzodiazepine', key: 'benzodiazepine', width: 100,
      render: (v: string) => <Tag color={URINE_RESULT_COLORS[v] || 'default'}>{v === 'positive' ? 'Dương tính' : 'Âm tính'}</Tag>,
    },
    {
      title: 'Methadone', dataIndex: 'methadone', key: 'methadone', width: 100,
      render: (v: string) => <Tag color={v === 'positive' ? 'green' : 'red'}>{v === 'positive' ? 'Dương tính' : 'Âm tính'}</Tag>,
    },
    { title: 'Người thu', dataIndex: 'collectedBy', key: 'collectedBy', width: 130 },
  ];

  const activePatients = patients.filter(p => p.status === 0);
  const complianceRate = patients.length > 0
    ? Math.round((activePatients.filter(p => p.missedDoses === 0).length / Math.max(activePatients.length, 1)) * 100)
    : 0;

  const tabItems = [
    {
      key: 'patients',
      label: (
        <span>
          <MedicineBoxOutlined /> Danh sách BN ({patients.length})
        </span>
      ),
      children: (
        <>
          <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8} md={6}>
              <Search
                placeholder="Tìm họ tên, mã BN..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Giai đoạn"
                allowClear
                style={{ width: '100%' }}
                value={phaseFilter}
                onChange={setPhaseFilter}
                options={Object.entries(PHASE_LABELS).map(([k, v]) => ({ value: k, label: v.label }))}
              />
            </Col>
            <Col flex="auto" style={{ textAlign: 'right' }}>
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => { enrollForm.resetFields(); setIsEnrollModalOpen(true); }}>
                Đăng ký BN mới
              </Button>
            </Col>
          </Row>
          <Table
            dataSource={patients}
            columns={patientColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bệnh nhân` }}
            scroll={{ x: 1200 }}
            onRow={(record) => ({ onDoubleClick: () => handleViewPatient(record), style: { cursor: 'pointer' } })}
          />
        </>
      ),
    },
    {
      key: 'dosing',
      label: (
        <span>
          <CalendarOutlined /> Cấp liều hàng ngày ({doses.length})
        </span>
      ),
      children: (
        <>
          <Row justify="end" style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { doseForm.resetFields(); setIsDoseModalOpen(true); }}>
              Ghi nhận cấp liều
            </Button>
          </Row>
          <Table
            dataSource={doses}
            columns={doseColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} lượt cấp` }}
            scroll={{ x: 1000 }}
          />
        </>
      ),
    },
    {
      key: 'urine',
      label: (
        <span>
          <ExperimentOutlined /> Xét nghiệm nước tiểu ({urineTests.length})
        </span>
      ),
      children: (
        <>
          <Row justify="end" style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { urineForm.resetFields(); setIsUrineModalOpen(true); }}>
              Ghi nhận xét nghiệm
            </Button>
          </Row>
          <Table
            dataSource={urineTests}
            columns={urineColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} xét nghiệm` }}
            scroll={{ x: 1000 }}
          />
        </>
      ),
    },
    {
      key: 'stats',
      label: (
        <span>
          <BarChartOutlined /> Thống kê
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Tuân thủ điều trị">
              <Statistic
                title="Tỷ lệ tuân thủ (không bỏ liều)"
                value={complianceRate}
                suffix="%"
                styles={{ content: { color: complianceRate >= 80 ? '#52c41a' : complianceRate >= 60 ? '#faad14' : '#ff4d4f' } }}
              />
              <Progress
                percent={complianceRate}
                strokeColor={complianceRate >= 80 ? '#52c41a' : complianceRate >= 60 ? '#faad14' : '#ff4d4f'}
                style={{ marginTop: 8 }}
              />
              <Divider />
              <p>BN đang điều trị: <strong>{activePatients.length}</strong></p>
              <p>BN bỏ liều tháng này: <strong style={{ color: '#ff4d4f' }}>{stats.missedDoses}</strong></p>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Phân bố giai đoạn điều trị">
              {Object.entries(PHASE_LABELS).map(([key, info]) => {
                const count = activePatients.filter(p => p.phase === key).length;
                const percent = activePatients.length > 0 ? Math.round((count / activePatients.length) * 100) : 0;
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                      <Col><Tag color={info.color}>{info.label}</Tag></Col>
                      <Col><strong>{count}</strong> ({percent}%)</Col>
                    </Row>
                    <Progress percent={percent} strokeColor={info.color === 'green' ? '#52c41a' : info.color === 'blue' ? '#1890ff' : info.color === 'cyan' ? '#13c2c2' : '#faad14'} size="small" showInfo={false} />
                  </div>
                );
              })}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Kết quả XN nước tiểu gần nhất">
              {urineTests.length > 0 ? (
                <>
                  <p>Morphine dương tính: <strong style={{ color: '#ff4d4f' }}>{urineTests.filter(t => t.morphine === 'positive').length}</strong></p>
                  <p>Amphetamine dương tính: <strong style={{ color: '#ff4d4f' }}>{urineTests.filter(t => t.amphetamine === 'positive').length}</strong></p>
                  <p>THC dương tính: <strong style={{ color: '#ff4d4f' }}>{urineTests.filter(t => t.thc === 'positive').length}</strong></p>
                  <p>Benzo dương tính: <strong style={{ color: '#ff4d4f' }}>{urineTests.filter(t => t.benzodiazepine === 'positive').length}</strong></p>
                  <p>Methadone âm tính: <strong style={{ color: '#ff4d4f' }}>{urineTests.filter(t => t.methadone === 'negative').length}</strong></p>
                </>
              ) : (
                <Typography.Text type="secondary">Chưa có dữ liệu</Typography.Text>
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Liều trung bình theo giai đoạn">
              {Object.entries(PHASE_LABELS).map(([key, info]) => {
                const phasePatients = activePatients.filter(p => p.phase === key);
                const avgDose = phasePatients.length > 0
                  ? Math.round(phasePatients.reduce((sum, p) => sum + (p.currentDose || 0), 0) / phasePatients.length)
                  : 0;
                return (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <Row justify="space-between">
                      <Col><Tag color={info.color}>{info.label}</Tag></Col>
                      <Col><strong>{avgDose} mg</strong> (n={phasePatients.length})</Col>
                    </Row>
                  </div>
                );
              })}
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        {/* Header */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <MedicineBoxOutlined style={{ marginRight: 8 }} />
                Điều trị thay thế nghiện chất (Methadone)
              </Title>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
            </Col>
          </Row>
        </Card>

        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="BN đang điều trị" value={stats.activePatients} prefix={<MedicineBoxOutlined />} styles={{ content: { color: '#1890ff' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Tổng liều hôm nay" value={stats.todayDoses} prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="XN nước tiểu tháng" value={stats.monthlyUrineTests} prefix={<ExperimentOutlined />} styles={{ content: { color: '#722ed1' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Bỏ liều" value={stats.missedDoses} prefix={<WarningOutlined />} styles={{ content: { color: '#ff4d4f' } }} />
            </Card>
          </Col>
        </Row>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </Card>

        {/* Enroll Patient Modal */}
        <Modal
          title="Đăng ký bệnh nhân Methadone"
          open={isEnrollModalOpen}
          onCancel={() => setIsEnrollModalOpen(false)}
          onOk={handleEnrollPatient}
          okText="Đăng ký"
          cancelText="Hủy"
          confirmLoading={saving}
          width={700}
          destroyOnHidden
        >
          <Form form={enrollForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                  <Input placeholder="Họ và tên bệnh nhân" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="gender" label="Giới tính">
                  <Select options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="dateOfBirth" label="Ngày sinh">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="address" label="Địa chỉ">
                  <Input placeholder="Địa chỉ" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="phone" label="Số điện thoại">
                  <Input placeholder="SĐT" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="enrollmentDate" label="Ngày đăng ký" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="currentDose" label="Liều khởi đầu (mg)" rules={[{ required: true, message: 'Nhập liều' }]}>
                  <InputNumber min={5} max={200} style={{ width: '100%' }} placeholder="mg" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="doseType" label="Hình thức uống" rules={[{ required: true, message: 'Chọn hình thức' }]}>
                  <Select options={[
                    { value: 'witnessed', label: 'Uống tại chỗ' },
                    { value: 'takeHome', label: 'Mang về' },
                  ]} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} placeholder="Tiền sử, ghi chú..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Record Dose Modal */}
        <Modal
          title="Ghi nhận cấp liều Methadone"
          open={isDoseModalOpen}
          onCancel={() => setIsDoseModalOpen(false)}
          onOk={handleRecordDose}
          okText="Ghi nhận"
          cancelText="Hủy"
          confirmLoading={saving}
          width={600}
          destroyOnHidden
        >
          <Form form={doseForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientId" label="Bệnh nhân" rules={[{ required: true, message: 'Chọn BN' }]}>
                  <Select
                    placeholder="Chọn bệnh nhân"
                    showSearch
                    optionFilterProp="label"
                    options={activePatients.map(p => ({ value: p.id, label: `${p.patientCode} - ${p.patientName}` }))}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="doseDate" label="Ngày cấp" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="doseAmount" label="Liều (mg)" rules={[{ required: true, message: 'Nhập liều' }]}>
                  <InputNumber min={1} max={200} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="doseType" label="Hình thức" rules={[{ required: true, message: 'Chọn' }]}>
                  <Select options={[
                    { value: 'witnessed', label: 'Uống tại chỗ' },
                    { value: 'takeHome', label: 'Mang về' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="status" label="Kết quả" rules={[{ required: true, message: 'Chọn' }]}>
                  <Select options={[
                    { value: 1, label: 'Đã uống' },
                    { value: 2, label: 'Bỏ liều' },
                    { value: 3, label: 'Từ chối' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="witnessedBy" label="Người chứng kiến">
                  <Input placeholder="Tên người CK" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} placeholder="Ghi chú..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Urine Test Modal */}
        <Modal
          title="Ghi nhận xét nghiệm nước tiểu"
          open={isUrineModalOpen}
          onCancel={() => setIsUrineModalOpen(false)}
          onOk={handleRecordUrineTest}
          okText="Ghi nhận"
          cancelText="Hủy"
          confirmLoading={saving}
          width={600}
          destroyOnHidden
        >
          <Form form={urineForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientId" label="Bệnh nhân" rules={[{ required: true, message: 'Chọn BN' }]}>
                  <Select
                    placeholder="Chọn bệnh nhân"
                    showSearch
                    optionFilterProp="label"
                    options={activePatients.map(p => ({ value: p.id, label: `${p.patientCode} - ${p.patientName}` }))}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="testDate" label="Ngày XN" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Divider>Kết quả</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="morphine" label="Morphine" rules={[{ required: true, message: 'Chọn KQ' }]}>
                  <Select options={[{ value: 'positive', label: 'Dương tính (+)' }, { value: 'negative', label: 'Âm tính (-)' }]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="amphetamine" label="Amphetamine" rules={[{ required: true, message: 'Chọn KQ' }]}>
                  <Select options={[{ value: 'positive', label: 'Dương tính (+)' }, { value: 'negative', label: 'Âm tính (-)' }]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="thc" label="THC (Cần sa)" rules={[{ required: true, message: 'Chọn KQ' }]}>
                  <Select options={[{ value: 'positive', label: 'Dương tính (+)' }, { value: 'negative', label: 'Âm tính (-)' }]} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="benzodiazepine" label="Benzodiazepine" rules={[{ required: true, message: 'Chọn KQ' }]}>
                  <Select options={[{ value: 'positive', label: 'Dương tính (+)' }, { value: 'negative', label: 'Âm tính (-)' }]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="methadone" label="Methadone" rules={[{ required: true, message: 'Chọn KQ' }]}>
                  <Select options={[{ value: 'positive', label: 'Dương tính (+)' }, { value: 'negative', label: 'Âm tính (-)' }]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="otherSubstances" label="Khác">
                  <Input placeholder="Chất khác..." />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} placeholder="Ghi chú..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Patient Detail Modal */}
        <Modal
          title="Chi tiết bệnh nhân Methadone"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={<Button onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>}
          width={700}
        >
          {selectedPatient && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Họ tên">{selectedPatient.patientName}</Descriptions.Item>
                <Descriptions.Item label="Mã BN">{selectedPatient.patientCode}</Descriptions.Item>
                <Descriptions.Item label="Giới tính">{selectedPatient.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">{selectedPatient.dateOfBirth ? dayjs(selectedPatient.dateOfBirth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Địa chỉ" span={2}>{selectedPatient.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="SĐT">{selectedPatient.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày đăng ký">{selectedPatient.enrollmentDate ? dayjs(selectedPatient.enrollmentDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Giai đoạn">
                  <Tag color={PHASE_LABELS[selectedPatient.phase]?.color}>{PHASE_LABELS[selectedPatient.phase]?.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Liều hiện tại">{selectedPatient.currentDose} mg</Descriptions.Item>
                <Descriptions.Item label="Hình thức">{selectedPatient.doseType === 'witnessed' ? 'Uống tại chỗ' : 'Mang về'}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={PATIENT_STATUS_COLORS[selectedPatient.status]}>{PATIENT_STATUS_LABELS[selectedPatient.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Liều cuối">{selectedPatient.lastDoseDate ? dayjs(selectedPatient.lastDoseDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Bỏ liều">{selectedPatient.missedDoses > 0 ? <Tag color="red">{selectedPatient.missedDoses} lần</Tag> : <Tag color="green">0</Tag>}</Descriptions.Item>
                <Descriptions.Item label="BS điều trị">{selectedPatient.attendingDoctor || '-'}</Descriptions.Item>
                <Descriptions.Item label="XN nước tiểu cuối">{selectedPatient.urineTestDate ? dayjs(selectedPatient.urineTestDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Ghi chú" span={2}>{selectedPatient.notes || '-'}</Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default MethadoneTreatment;
