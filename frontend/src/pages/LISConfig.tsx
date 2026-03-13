import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Modal,
  Form,
  Select,
  InputNumber,
  Typography,
  message,
  Tabs,
  Badge,
  Divider,
  Tooltip,
  Switch,
  Spin,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ApiOutlined,
  SettingOutlined,
  SyncOutlined,
  LinkOutlined,
  UploadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import {
  getAnalyzers,
  createAnalyzer,
  updateAnalyzer,
  deleteAnalyzer,
  testAnalyzerConnection,
  getTestParameters,
  createTestParameter,
  updateTestParameter,
  deleteTestParameter,
  importTestParametersCsv,
  getReferenceRanges,
  createReferenceRange,
  updateReferenceRange,
  deleteReferenceRange,
  getAnalyzerMappings,
  createAnalyzerMapping,
  updateAnalyzerMapping,
  deleteAnalyzerMapping,
  autoMapAnalyzer,
  getLabconnectStatus,
  syncLabconnect,
  getLabconnectHistory,
  retryFailedSyncs,
} from '../api/lisConfig';
import type {
  AnalyzerDto,
  TestParameterDto,
  ReferenceRangeDto,
  AnalyzerMappingDto,
  LabconnectStatusDto,
  LabconnectSyncHistoryDto,
} from '../api/lisConfig';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// ===========================
// Tab 1: Analyzer Config
// ===========================
const AnalyzerConfigTab: React.FC = () => {
  const [analyzers, setAnalyzers] = useState<AnalyzerDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [connectionType, setConnectionType] = useState<string>('HL7');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAnalyzers();
      setAnalyzers(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.warning('Khong the tai danh sach may xet nghiem');
      setAnalyzers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateAnalyzer(editingId, values);
        message.success('Cap nhat may xet nghiem thanh cong');
      } else {
        await createAnalyzer(values);
        message.success('Them may xet nghiem thanh cong');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return; // form validation
      message.warning('Loi khi luu cau hinh may xet nghiem');
    }
  };

  const handleEdit = (record: AnalyzerDto) => {
    setEditingId(record.id);
    setConnectionType(record.connectionType);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xac nhan xoa may xet nghiem?',
      content: 'Thao tac nay khong the hoan tac.',
      okText: 'Xoa',
      cancelText: 'Huy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteAnalyzer(id);
          message.success('Da xoa may xet nghiem');
          fetchData();
        } catch {
          message.warning('Loi khi xoa may xet nghiem');
        }
      },
    });
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await testAnalyzerConnection(id);
      if (res.data?.success) {
        message.success(res.data.message || 'Ket noi thanh cong');
      } else {
        message.warning(res.data?.message || 'Ket noi that bai');
      }
      fetchData();
    } catch {
      message.warning('Khong the ket noi den may xet nghiem');
    } finally {
      setTestingId(null);
    }
  };

  const columns: ColumnsType<AnalyzerDto> = [
    { title: 'Ten may', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Model', dataIndex: 'model', key: 'model', width: 120 },
    { title: 'Hang SX', dataIndex: 'manufacturer', key: 'manufacturer', width: 130 },
    {
      title: 'IP/Port',
      key: 'address',
      width: 150,
      render: (_, r) => r.ipAddress ? `${r.ipAddress}:${r.port || ''}` : '-',
    },
    {
      title: 'Giao thuc',
      dataIndex: 'connectionType',
      key: 'connectionType',
      width: 100,
      render: (val: string) => <Tag color={val === 'HL7' ? 'blue' : val === 'ASTM' ? 'purple' : 'orange'}>{val}</Tag>,
    },
    {
      title: 'Trang thai',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (val: boolean) => val ? <Tag color="green">Hoat dong</Tag> : <Tag color="default">Ngung</Tag>,
    },
    {
      title: 'Ket noi',
      dataIndex: 'connectionStatus',
      key: 'connectionStatus',
      width: 120,
      render: (val: string) => {
        if (val === 'Connected') return <Badge status="success" text="Da ket noi" />;
        if (val === 'Disconnected') return <Badge status="error" text="Mat ket noi" />;
        return <Badge status="default" text="Chua kiem tra" />;
      },
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Test ket noi">
            <Button
              size="small"
              icon={<ApiOutlined />}
              loading={testingId === record.id}
              onClick={() => handleTestConnection(record.id)}
            />
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Lam moi
          </Button>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingId(null);
              setConnectionType('HL7');
              form.resetFields();
              form.setFieldsValue({ isActive: true, connectionType: 'HL7' });
              setIsModalOpen(true);
            }}
          >
            Them may XN
          </Button>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={analyzers}
        rowKey="id"
        size="small"
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{ showSizeChanger: true, showTotal: (t) => `Tong: ${t} may` }}
        locale={{ emptyText: 'Chua co may xet nghiem nao' }}
      />

      <Modal
        title={editingId ? 'Sua may xet nghiem' : 'Them may xet nghiem'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
        okText="Luu"
        cancelText="Huy"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Ten may" rules={[{ required: true, message: 'Nhap ten may' }]}>
                <Input placeholder="VD: Cobas 6000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="Model" rules={[{ required: true, message: 'Nhap model' }]}>
                <Input placeholder="VD: c501/e601" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="manufacturer" label="Hang san xuat" rules={[{ required: true, message: 'Nhap hang SX' }]}>
                <Input placeholder="VD: Roche" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="connectionType" label="Loai ket noi" rules={[{ required: true }]}>
                <Select onChange={(val) => setConnectionType(val)}>
                  <Select.Option value="HL7">HL7</Select.Option>
                  <Select.Option value="ASTM">ASTM</Select.Option>
                  <Select.Option value="Serial">Serial (RS-232)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          {(connectionType === 'HL7' || connectionType === 'ASTM') && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="ipAddress" label="Dia chi IP">
                  <Input placeholder="VD: 192.168.1.100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="port" label="Port">
                  <InputNumber style={{ width: '100%' }} placeholder="VD: 5000" min={1} max={65535} />
                </Form.Item>
              </Col>
            </Row>
          )}
          {connectionType === 'Serial' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="port" label="COM Port">
                  <InputNumber style={{ width: '100%' }} placeholder="VD: 1 (COM1)" min={1} max={99} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="baudRate" label="Baud Rate">
                  <Select placeholder="Chon baud rate">
                    <Select.Option value={9600}>9600</Select.Option>
                    <Select.Option value={19200}>19200</Select.Option>
                    <Select.Option value={38400}>38400</Select.Option>
                    <Select.Option value={57600}>57600</Select.Option>
                    <Select.Option value={115200}>115200</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="protocolVersion" label="Phien ban giao thuc">
                <Input placeholder="VD: 2.5.1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Trang thai" valuePropName="checked">
                <Switch checkedChildren="Hoat dong" unCheckedChildren="Ngung" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mo ta">
            <TextArea rows={2} placeholder="Mo ta them ve may xet nghiem" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ===========================
// Tab 2: Test Parameters
// ===========================
const TestParametersTab: React.FC = () => {
  const [params, setParams] = useState<TestParameterDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getTestParameters();
      setParams(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.warning('Khong the tai danh sach chi so xet nghiem');
      setParams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateTestParameter(editingId, values);
        message.success('Cap nhat chi so thanh cong');
      } else {
        await createTestParameter(values);
        message.success('Them chi so thanh cong');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.warning('Loi khi luu chi so xet nghiem');
    }
  };

  const handleEdit = (record: TestParameterDto) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xac nhan xoa chi so?',
      okText: 'Xoa',
      cancelText: 'Huy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteTestParameter(id);
          message.success('Da xoa chi so');
          fetchData();
        } catch {
          message.warning('Loi khi xoa chi so');
        }
      },
    });
  };

  const handleCsvImport = async (file: File) => {
    try {
      await importTestParametersCsv(file);
      message.success('Import CSV thanh cong');
      fetchData();
    } catch {
      message.warning('Loi khi import CSV');
    }
  };

  const filtered = params.filter(p => {
    if (!searchText) return true;
    const text = searchText.toLowerCase();
    return p.code?.toLowerCase().includes(text) || p.name?.toLowerCase().includes(text);
  });

  const columns: ColumnsType<TestParameterDto> = [
    { title: 'Ma', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Ten chi so', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Don vi', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: 'Tham chieu (Low-High)',
      key: 'reference',
      width: 150,
      render: (_, r) => r.referenceLow != null || r.referenceHigh != null
        ? `${r.referenceLow ?? ''} - ${r.referenceHigh ?? ''}`
        : '-',
    },
    {
      title: 'Nguy hiem (Low-High)',
      key: 'critical',
      width: 150,
      render: (_, r) => r.criticalLow != null || r.criticalHigh != null
        ? <Text type="danger">{`${r.criticalLow ?? ''} - ${r.criticalHigh ?? ''}`}</Text>
        : '-',
    },
    {
      title: 'Kieu du lieu',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space>
            <Search
              placeholder="Tim theo ma, ten chi so..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: 300 }}
              onSearch={(val) => setSearchText(val)}
              onChange={(e) => { if (!e.target.value) setSearchText(''); }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Lam moi
            </Button>
          </Space>
        </Col>
        <Col>
          <Space>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleCsvImport(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingId(null);
                form.resetFields();
                form.setFieldsValue({ isActive: true, dataType: 'Number' });
                setIsModalOpen(true);
              }}
            >
              Them chi so
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        size="small"
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{ showSizeChanger: true, showTotal: (t) => `Tong: ${t} chi so` }}
        locale={{ emptyText: 'Chua co chi so xet nghiem nao' }}
      />

      <Modal
        title={editingId ? 'Sua chi so xet nghiem' : 'Them chi so xet nghiem'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
        okText="Luu"
        cancelText="Huy"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Ma chi so" rules={[{ required: true, message: 'Nhap ma' }]}>
                <Input placeholder="VD: WBC" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="name" label="Ten chi so" rules={[{ required: true, message: 'Nhap ten' }]}>
                <Input placeholder="VD: Bach cau" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Don vi" rules={[{ required: true, message: 'Nhap don vi' }]}>
                <Input placeholder="VD: 10^9/L" />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '8px 0' }}>Dai tham chieu</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="referenceLow" label="Tham chieu thap">
                <InputNumber style={{ width: '100%' }} placeholder="Low" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="referenceHigh" label="Tham chieu cao">
                <InputNumber style={{ width: '100%' }} placeholder="High" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="criticalLow" label="Nguy hiem thap">
                <InputNumber style={{ width: '100%' }} placeholder="Critical Low" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="criticalHigh" label="Nguy hiem cao">
                <InputNumber style={{ width: '100%' }} placeholder="Critical High" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dataType" label="Kieu du lieu" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Number">So (Number)</Select.Option>
                  <Select.Option value="Text">Van ban (Text)</Select.Option>
                  <Select.Option value="Enum">Lua chon (Enum)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortOrder" label="Thu tu sap xep">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isActive" label="Trang thai" valuePropName="checked">
                <Switch checkedChildren="Hoat dong" unCheckedChildren="Ngung" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="enumValues" label="Gia tri Enum (cach nhau boi dau phay)">
            <Input placeholder="VD: Positive,Negative,Trace" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ===========================
// Tab 3: Reference Ranges
// ===========================
const ReferenceRangesTab: React.FC = () => {
  const [ranges, setRanges] = useState<ReferenceRangeDto[]>([]);
  const [testParams, setTestParams] = useState<TestParameterDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterTestId, setFilterTestId] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rangeRes, paramRes] = await Promise.allSettled([
        getReferenceRanges(filterTestId),
        getTestParameters(),
      ]);
      if (rangeRes.status === 'fulfilled') setRanges(Array.isArray(rangeRes.value.data) ? rangeRes.value.data : []);
      if (paramRes.status === 'fulfilled') setTestParams(Array.isArray(paramRes.value.data) ? paramRes.value.data : []);
    } catch {
      message.warning('Khong the tai du lieu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterTestId]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateReferenceRange(editingId, values);
        message.success('Cap nhat thanh cong');
      } else {
        await createReferenceRange(values);
        message.success('Them dai chi so thanh cong');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.warning('Loi khi luu dai chi so');
    }
  };

  const handleEdit = (record: ReferenceRangeDto) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xac nhan xoa dai chi so?',
      okText: 'Xoa',
      cancelText: 'Huy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteReferenceRange(id);
          message.success('Da xoa');
          fetchData();
        } catch {
          message.warning('Loi khi xoa');
        }
      },
    });
  };

  const ageGroupLabels: Record<string, string> = {
    Newborn: 'So sinh (0-28 ngay)',
    Infant: 'Nhu nhi (1-12 thang)',
    Child: 'Tre em (1-12 tuoi)',
    Adolescent: 'Thanh thieu nien (13-17)',
    Adult: 'Nguoi lon (18-64)',
    Elderly: 'Nguoi cao tuoi (>=65)',
  };

  const genderLabels: Record<string, string> = {
    Male: 'Nam',
    Female: 'Nu',
    Both: 'Ca hai',
  };

  const columns: ColumnsType<ReferenceRangeDto> = [
    { title: 'Ma XN', dataIndex: 'testCode', key: 'testCode', width: 100 },
    { title: 'Ten XN', dataIndex: 'testName', key: 'testName', width: 160 },
    {
      title: 'Nhom tuoi',
      dataIndex: 'ageGroup',
      key: 'ageGroup',
      width: 170,
      render: (val: string) => ageGroupLabels[val] || val,
    },
    {
      title: 'Gioi tinh',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (val: string) => genderLabels[val] || val,
    },
    {
      title: 'Tham chieu',
      key: 'range',
      width: 120,
      render: (_, r) => `${r.low ?? ''} - ${r.high ?? ''}`,
    },
    {
      title: 'Nguy hiem',
      key: 'critical',
      width: 120,
      render: (_, r) => r.criticalLow != null || r.criticalHigh != null
        ? <Text type="danger">{`${r.criticalLow ?? ''} - ${r.criticalHigh ?? ''}`}</Text>
        : '-',
    },
    { title: 'Don vi', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: 'Thao tac',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space>
            <Select
              placeholder="Loc theo chi so XN"
              style={{ width: 250 }}
              allowClear
              showSearch
              optionFilterProp="children"
              onChange={(val) => setFilterTestId(val)}
              value={filterTestId}
            >
              {testParams.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.code} - {p.name}</Select.Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Lam moi
            </Button>
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            Them dai chi so
          </Button>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={ranges}
        rowKey="id"
        size="small"
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{ showSizeChanger: true, showTotal: (t) => `Tong: ${t} ban ghi` }}
        locale={{ emptyText: 'Chua co dai chi so nao' }}
      />

      <Modal
        title={editingId ? 'Sua dai chi so' : 'Them dai chi so'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
        okText="Luu"
        cancelText="Huy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="testParameterId" label="Chi so xet nghiem" rules={[{ required: true, message: 'Chon chi so' }]}>
            <Select placeholder="Chon chi so" showSearch optionFilterProp="children">
              {testParams.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.code} - {p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ageGroup" label="Nhom tuoi" rules={[{ required: true, message: 'Chon nhom tuoi' }]}>
                <Select>
                  {Object.entries(ageGroupLabels).map(([key, label]) => (
                    <Select.Option key={key} value={key}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Gioi tinh" rules={[{ required: true, message: 'Chon gioi tinh' }]}>
                <Select>
                  {Object.entries(genderLabels).map(([key, label]) => (
                    <Select.Option key={key} value={key}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '8px 0' }}>Gia tri tham chieu</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="low" label="Low">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="high" label="High">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="criticalLow" label="Critical Low">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="criticalHigh" label="Critical High">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="unit" label="Don vi" rules={[{ required: true, message: 'Nhap don vi' }]}>
            <Input placeholder="VD: mmol/L" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ===========================
// Tab 4: Analyzer Mapping
// ===========================
const AnalyzerMappingTab: React.FC = () => {
  const [mappings, setMappings] = useState<AnalyzerMappingDto[]>([]);
  const [analyzers, setAnalyzers] = useState<AnalyzerDto[]>([]);
  const [testParams, setTestParams] = useState<TestParameterDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterAnalyzerId, setFilterAnalyzerId] = useState<string | undefined>(undefined);
  const [autoMapping, setAutoMapping] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mapRes, analyzerRes, paramRes] = await Promise.allSettled([
        getAnalyzerMappings(filterAnalyzerId),
        getAnalyzers(),
        getTestParameters(),
      ]);
      if (mapRes.status === 'fulfilled') setMappings(Array.isArray(mapRes.value.data) ? mapRes.value.data : []);
      if (analyzerRes.status === 'fulfilled') setAnalyzers(Array.isArray(analyzerRes.value.data) ? analyzerRes.value.data : []);
      if (paramRes.status === 'fulfilled') setTestParams(Array.isArray(paramRes.value.data) ? paramRes.value.data : []);
    } catch {
      message.warning('Khong the tai du lieu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterAnalyzerId]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateAnalyzerMapping(editingId, values);
        message.success('Cap nhat thanh cong');
      } else {
        await createAnalyzerMapping(values);
        message.success('Them anh xa thanh cong');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.warning('Loi khi luu anh xa');
    }
  };

  const handleEdit = (record: AnalyzerMappingDto) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xac nhan xoa anh xa?',
      okText: 'Xoa',
      cancelText: 'Huy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteAnalyzerMapping(id);
          message.success('Da xoa');
          fetchData();
        } catch {
          message.warning('Loi khi xoa');
        }
      },
    });
  };

  const handleAutoMap = async () => {
    if (!filterAnalyzerId) {
      message.warning('Vui long chon may xet nghiem truoc');
      return;
    }
    setAutoMapping(true);
    try {
      const res = await autoMapAnalyzer(filterAnalyzerId);
      message.success(res.data?.message || `Da anh xa tu dong ${res.data?.mappedCount || 0} chi so`);
      fetchData();
    } catch {
      message.warning('Loi khi tu dong anh xa');
    } finally {
      setAutoMapping(false);
    }
  };

  const columns: ColumnsType<AnalyzerMappingDto> = [
    { title: 'May XN', dataIndex: 'analyzerName', key: 'analyzerName', width: 150 },
    { title: 'Ma chi so may', dataIndex: 'analyzerTestCode', key: 'analyzerTestCode', width: 140 },
    { title: 'Ma chi so HIS', dataIndex: 'hisTestCode', key: 'hisTestCode', width: 120 },
    { title: 'Ten chi so HIS', dataIndex: 'hisTestName', key: 'hisTestName', width: 180 },
    {
      title: 'Trang thai',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (val: boolean) => val ? <Tag color="green">Hoat dong</Tag> : <Tag>Ngung</Tag>,
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space>
            <Select
              placeholder="Loc theo may XN"
              style={{ width: 250 }}
              allowClear
              showSearch
              optionFilterProp="children"
              onChange={(val) => setFilterAnalyzerId(val)}
              value={filterAnalyzerId}
            >
              {analyzers.map(a => (
                <Select.Option key={a.id} value={a.id}>{a.name} ({a.model})</Select.Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Lam moi
            </Button>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<ThunderboltOutlined />}
              loading={autoMapping}
              onClick={handleAutoMap}
              disabled={!filterAnalyzerId}
            >
              Tu dong anh xa
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingId(null);
                form.resetFields();
                form.setFieldsValue({ isActive: true, analyzerId: filterAnalyzerId });
                setIsModalOpen(true);
              }}
            >
              Them anh xa
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={mappings}
        rowKey="id"
        size="small"
        loading={loading}
        scroll={{ x: 800 }}
        pagination={{ showSizeChanger: true, showTotal: (t) => `Tong: ${t} anh xa` }}
        locale={{ emptyText: 'Chua co anh xa nao' }}
      />

      <Modal
        title={editingId ? 'Sua anh xa' : 'Them anh xa'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
        okText="Luu"
        cancelText="Huy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="analyzerId" label="May xet nghiem" rules={[{ required: true, message: 'Chon may' }]}>
            <Select placeholder="Chon may" showSearch optionFilterProp="children">
              {analyzers.map(a => (
                <Select.Option key={a.id} value={a.id}>{a.name} ({a.model})</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="analyzerTestCode" label="Ma chi so tren may" rules={[{ required: true, message: 'Nhap ma chi so may' }]}>
            <Input placeholder="VD: WBC, RBC, HGB" />
          </Form.Item>
          <Form.Item name="hisTestParameterId" label="Chi so HIS tuong ung" rules={[{ required: true, message: 'Chon chi so HIS' }]}>
            <Select placeholder="Chon chi so HIS" showSearch optionFilterProp="children">
              {testParams.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.code} - {p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isActive" label="Trang thai" valuePropName="checked">
            <Switch checkedChildren="Hoat dong" unCheckedChildren="Ngung" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ===========================
// Tab 5: Labconnect
// ===========================
const LabconnectTab: React.FC = () => {
  const [status, setStatus] = useState<LabconnectStatusDto | null>(null);
  const [history, setHistory] = useState<LabconnectSyncHistoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.allSettled([
        getLabconnectStatus(),
        getLabconnectHistory(),
      ]);
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data);
      if (historyRes.status === 'fulfilled') setHistory(Array.isArray(historyRes.value.data) ? historyRes.value.data : []);
    } catch {
      message.warning('Khong the tai trang thai Labconnect');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSync = async (direction?: string) => {
    setSyncing(true);
    try {
      const res = await syncLabconnect(direction);
      if (res.data?.success) {
        message.success(res.data.message || `Dong bo thanh cong: ${res.data.syncedCount || 0} ban ghi`);
      } else {
        message.warning(res.data?.message || 'Dong bo that bai');
      }
      fetchData();
    } catch {
      message.warning('Loi khi dong bo');
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const res = await retryFailedSyncs();
      message.success(`Da thu lai ${res.data?.retriedCount || 0} ban ghi`);
      fetchData();
    } catch {
      message.warning('Loi khi thu lai');
    } finally {
      setRetrying(false);
    }
  };

  const historyColumns: ColumnsType<LabconnectSyncHistoryDto> = [
    {
      title: 'Thoi gian',
      dataIndex: 'syncTime',
      key: 'syncTime',
      width: 160,
      render: (val: string) => val ? dayjs(val).format('DD/MM/YYYY HH:mm:ss') : '-',
    },
    {
      title: 'Huong',
      dataIndex: 'direction',
      key: 'direction',
      width: 100,
      render: (val: string) => val === 'Send'
        ? <Tag color="blue">Gui</Tag>
        : <Tag color="green">Nhan</Tag>,
    },
    {
      title: 'So ban ghi',
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 100,
      align: 'center',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (val: string) => {
        if (val === 'Success') return <Tag color="green" icon={<CheckCircleOutlined />}>Thanh cong</Tag>;
        if (val === 'Failed') return <Tag color="red" icon={<CloseCircleOutlined />}>That bai</Tag>;
        return <Tag color="orange" icon={<WarningOutlined />}>Mot phan</Tag>;
      },
    },
    {
      title: 'Thoi gian (ms)',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (val?: number) => val != null ? `${val}ms` : '-',
    },
    {
      title: 'Loi',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (val?: string) => val ? <Text type="danger">{val}</Text> : '-',
    },
  ];

  const failedCount = history.filter(h => h.status === 'Failed').length;

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card size="small">
            <Row gutter={24} align="middle">
              <Col>
                {status?.isConnected ? (
                  <Badge status="success" text={<Text strong style={{ fontSize: 16 }}>Da ket noi Labconnect</Text>} />
                ) : (
                  <Badge status="error" text={<Text strong style={{ fontSize: 16 }}>Chua ket noi Labconnect</Text>} />
                )}
              </Col>
              <Col>
                <Text type="secondary">
                  Dong bo lan cuoi: {status?.lastSyncTime ? dayjs(status.lastSyncTime).format('DD/MM/YYYY HH:mm:ss') : 'Chua co'}
                </Text>
              </Col>
              {status?.serverUrl && (
                <Col>
                  <Text type="secondary">Server: {status.serverUrl}</Text>
                </Col>
              )}
              {status?.version && (
                <Col>
                  <Text type="secondary">Version: {status.version}</Text>
                </Col>
              )}
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Cho gui"
              value={status?.pendingSendCount ?? 0}
              prefix={<SyncOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Cho nhan"
              value={status?.pendingReceiveCount ?? 0}
              prefix={<SyncOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Dong bo loi"
              value={failedCount}
              prefix={<WarningOutlined />}
              styles={{ content: { color: failedCount > 0 ? '#ff4d4f' : '#52c41a' } }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Row gutter={8} style={{ marginBottom: 16 }}>
            <Col>
              <Button type="primary" icon={<SyncOutlined />} loading={syncing} onClick={() => handleSync()}>
                Dong bo
              </Button>
            </Col>
            <Col>
              <Button icon={<SyncOutlined />} loading={syncing} onClick={() => handleSync('Send')}>
                Gui du lieu
              </Button>
            </Col>
            <Col>
              <Button icon={<SyncOutlined />} loading={syncing} onClick={() => handleSync('Receive')}>
                Nhan du lieu
              </Button>
            </Col>
            <Col>
              <Button
                icon={<ReloadOutlined />}
                loading={retrying}
                onClick={handleRetryFailed}
                disabled={failedCount === 0}
                danger
              >
                Thu lai loi ({failedCount})
              </Button>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                Lam moi
              </Button>
            </Col>
          </Row>
        </Col>

        <Col span={24}>
          <Title level={5}>Lich su dong bo</Title>
          <Table
            columns={historyColumns}
            dataSource={history}
            rowKey="id"
            size="small"
            scroll={{ x: 800 }}
            pagination={{ showSizeChanger: true, pageSize: 10, showTotal: (t) => `Tong: ${t} lan dong bo` }}
            locale={{ emptyText: 'Chua co lich su dong bo' }}
          />
        </Col>
      </Row>
    </Spin>
  );
};

// ===========================
// Main LIS Config Page
// ===========================
const LISConfig: React.FC = () => {
  return (
    <div>
      <Title level={4}>Cau hinh he thong xet nghiem (LIS)</Title>

      <Card>
        <Tabs
          items={[
            {
              key: 'analyzers',
              label: (
                <span><SettingOutlined /> Cau hinh may XN</span>
              ),
              children: <AnalyzerConfigTab />,
            },
            {
              key: 'test-params',
              label: (
                <span><ExperimentOutlined /> Chi so xet nghiem</span>
              ),
              children: <TestParametersTab />,
            },
            {
              key: 'reference-ranges',
              label: (
                <span><BarChartOutlined /> Dai chi so</span>
              ),
              children: <ReferenceRangesTab />,
            },
            {
              key: 'mappings',
              label: (
                <span><LinkOutlined /> Anh xa chi so</span>
              ),
              children: <AnalyzerMappingTab />,
            },
            {
              key: 'labconnect',
              label: (
                <span><ApiOutlined /> Ket noi Labconnect</span>
              ),
              children: <LabconnectTab />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default LISConfig;
