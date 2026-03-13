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
      message.warning('Không thể tải danh sách máy xét nghiệm');
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
        message.success('Cập nhật máy xét nghiệm thành công');
      } else {
        await createAnalyzer(values);
        message.success('Thêm máy xét nghiệm thành công');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return; // form validation
      message.warning('Lỗi khi lưu cấu hình máy xét nghiệm');
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
      title: 'Xác nhận xóa máy xét nghiệm?',
      content: 'Thao tác này không thể hoàn tác.',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteAnalyzer(id);
          message.success('Đã xóa máy xét nghiệm');
          fetchData();
        } catch {
          message.warning('Lỗi khi xóa máy xét nghiệm');
        }
      },
    });
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await testAnalyzerConnection(id);
      if (res.data?.success) {
        message.success(res.data.message || 'Kết nối thành công');
      } else {
        message.warning(res.data?.message || 'Kết nối thất bại');
      }
      fetchData();
    } catch {
      message.warning('Không thể kết nối đến máy xét nghiệm');
    } finally {
      setTestingId(null);
    }
  };

  const columns: ColumnsType<AnalyzerDto> = [
    { title: 'Tên máy', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Model', dataIndex: 'model', key: 'model', width: 120 },
    { title: 'Hãng SX', dataIndex: 'manufacturer', key: 'manufacturer', width: 130 },
    {
      title: 'IP/Port',
      key: 'address',
      width: 150,
      render: (_, r) => r.ipAddress ? `${r.ipAddress}:${r.port || ''}` : '-',
    },
    {
      title: 'Giao thức',
      dataIndex: 'connectionType',
      key: 'connectionType',
      width: 100,
      render: (val: string) => <Tag color={val === 'HL7' ? 'blue' : val === 'ASTM' ? 'purple' : 'orange'}>{val}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (val: boolean) => val ? <Tag color="green">Hoạt động</Tag> : <Tag color="default">Ngừng</Tag>,
    },
    {
      title: 'Kết nối',
      dataIndex: 'connectionStatus',
      key: 'connectionStatus',
      width: 120,
      render: (val: string) => {
        if (val === 'Connected') return <Badge status="success" text="Đã kết nối" />;
        if (val === 'Disconnected') return <Badge status="error" text="Mất kết nối" />;
        return <Badge status="default" text="Chưa kiểm tra" />;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Test kết nối">
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
            Làm mới
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
            Thêm máy XN
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
        pagination={{ showSizeChanger: true, showTotal: (t) => `Tổng: ${t} máy` }}
        locale={{ emptyText: 'Chưa có máy xét nghiệm nào' }}
      />

      <Modal
        title={editingId ? 'Sửa máy xét nghiệm' : 'Thêm máy xét nghiệm'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
        okText="Lưu"
        cancelText="Hủy"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Tên máy" rules={[{ required: true, message: 'Nhập tên máy' }]}>
                <Input placeholder="VD: Cobas 6000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="Model" rules={[{ required: true, message: 'Nhập model' }]}>
                <Input placeholder="VD: c501/e601" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="manufacturer" label="Hãng sản xuất" rules={[{ required: true, message: 'Nhập hãng SX' }]}>
                <Input placeholder="VD: Roche" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="connectionType" label="Loại kết nối" rules={[{ required: true }]}>
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
                <Form.Item name="ipAddress" label="Địa chỉ IP">
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
                  <Select placeholder="Chọn baud rate">
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
              <Form.Item name="protocolVersion" label="Phiên bản giao thức">
                <Input placeholder="VD: 2.5.1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={2} placeholder="Mô tả thêm về máy xét nghiệm" />
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
      message.warning('Không thể tải danh sách chỉ số xét nghiệm');
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
        message.success('Cập nhật chỉ số thành công');
      } else {
        await createTestParameter(values);
        message.success('Thêm chỉ số thành công');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.warning('Lỗi khi lưu chỉ số xét nghiệm');
    }
  };

  const handleEdit = (record: TestParameterDto) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa chỉ số?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteTestParameter(id);
          message.success('Đã xóa chỉ số');
          fetchData();
        } catch {
          message.warning('Lỗi khi xóa chỉ số');
        }
      },
    });
  };

  const handleCsvImport = async (file: File) => {
    try {
      await importTestParametersCsv(file);
      message.success('Import CSV thành công');
      fetchData();
    } catch {
      message.warning('Lỗi khi import CSV');
    }
  };

  const filtered = params.filter(p => {
    if (!searchText) return true;
    const text = searchText.toLowerCase();
    return p.code?.toLowerCase().includes(text) || p.name?.toLowerCase().includes(text);
  });

  const columns: ColumnsType<TestParameterDto> = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Tên chỉ số', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: 'Tham chiếu (Low-High)',
      key: 'reference',
      width: 150,
      render: (_, r) => r.referenceLow != null || r.referenceHigh != null
        ? `${r.referenceLow ?? ''} - ${r.referenceHigh ?? ''}`
        : '-',
    },
    {
      title: 'Nguy hiểm (Low-High)',
      key: 'critical',
      width: 150,
      render: (_, r) => r.criticalLow != null || r.criticalHigh != null
        ? <Text type="danger">{`${r.criticalLow ?? ''} - ${r.criticalHigh ?? ''}`}</Text>
        : '-',
    },
    {
      title: 'Kiểu dữ liệu',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: 'Thao tác',
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
              placeholder="Tìm theo mã, tên chỉ số..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: 300 }}
              onSearch={(val) => setSearchText(val)}
              onChange={(e) => { if (!e.target.value) setSearchText(''); }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
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
              Thêm chỉ số
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
        pagination={{ showSizeChanger: true, showTotal: (t) => `Tổng: ${t} chỉ số` }}
        locale={{ emptyText: 'Chưa có chỉ số xét nghiệm nào' }}
      />

      <Modal
        title={editingId ? 'Sửa chỉ số xét nghiệm' : 'Thêm chỉ số xét nghiệm'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
        okText="Lưu"
        cancelText="Hủy"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Mã chỉ số" rules={[{ required: true, message: 'Nhập mã' }]}>
                <Input placeholder="VD: WBC" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="name" label="Tên chỉ số" rules={[{ required: true, message: 'Nhập tên' }]}>
                <Input placeholder="VD: Bạch cầu" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Đơn vị" rules={[{ required: true, message: 'Nhập đơn vị' }]}>
                <Input placeholder="VD: 10^9/L" />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '8px 0' }}>Dải tham chiếu</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="referenceLow" label="Tham chiếu thấp">
                <InputNumber style={{ width: '100%' }} placeholder="Low" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="referenceHigh" label="Tham chiếu cao">
                <InputNumber style={{ width: '100%' }} placeholder="High" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="criticalLow" label="Nguy hiểm thấp">
                <InputNumber style={{ width: '100%' }} placeholder="Critical Low" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="criticalHigh" label="Nguy hiểm cao">
                <InputNumber style={{ width: '100%' }} placeholder="Critical High" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dataType" label="Kiểu dữ liệu" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Number">Số (Number)</Select.Option>
                  <Select.Option value="Text">Văn bản (Text)</Select.Option>
                  <Select.Option value="Enum">Lựa chọn (Enum)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortOrder" label="Thứ tự sắp xếp">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="enumValues" label="Giá trị Enum (cách nhau bởi dấu phẩy)">
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
      message.warning('Không thể tải dữ liệu');
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
        message.success('Cập nhật thành công');
      } else {
        await createReferenceRange(values);
        message.success('Thêm dải chỉ số thành công');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.warning('Lỗi khi lưu dải chỉ số');
    }
  };

  const handleEdit = (record: ReferenceRangeDto) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa dải chỉ số?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteReferenceRange(id);
          message.success('Đã xóa');
          fetchData();
        } catch {
          message.warning('Lỗi khi xóa');
        }
      },
    });
  };

  const ageGroupLabels: Record<string, string> = {
    Newborn: 'Sơ sinh (0-28 ngày)',
    Infant: 'Nhũ nhi (1-12 tháng)',
    Child: 'Trẻ em (1-12 tuổi)',
    Adolescent: 'Thanh thiếu niên (13-17)',
    Adult: 'Người lớn (18-64)',
    Elderly: 'Người cao tuổi (>=65)',
  };

  const genderLabels: Record<string, string> = {
    Male: 'Nam',
    Female: 'Nữ',
    Both: 'Cả hai',
  };

  const columns: ColumnsType<ReferenceRangeDto> = [
    { title: 'Mã XN', dataIndex: 'testCode', key: 'testCode', width: 100 },
    { title: 'Tên XN', dataIndex: 'testName', key: 'testName', width: 160 },
    {
      title: 'Nhóm tuổi',
      dataIndex: 'ageGroup',
      key: 'ageGroup',
      width: 170,
      render: (val: string) => ageGroupLabels[val] || val,
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (val: string) => genderLabels[val] || val,
    },
    {
      title: 'Tham chiếu',
      key: 'range',
      width: 120,
      render: (_, r) => `${r.low ?? ''} - ${r.high ?? ''}`,
    },
    {
      title: 'Nguy hiểm',
      key: 'critical',
      width: 120,
      render: (_, r) => r.criticalLow != null || r.criticalHigh != null
        ? <Text type="danger">{`${r.criticalLow ?? ''} - ${r.criticalHigh ?? ''}`}</Text>
        : '-',
    },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: 'Thao tác',
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
              placeholder="Lọc theo chỉ số XN"
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
              Làm mới
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
            Thêm dải chỉ số
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
        pagination={{ showSizeChanger: true, showTotal: (t) => `Tổng: ${t} bản ghi` }}
        locale={{ emptyText: 'Chưa có dải chỉ số nào' }}
      />

      <Modal
        title={editingId ? 'Sửa dải chỉ số' : 'Thêm dải chỉ số'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="testParameterId" label="Chỉ số xét nghiệm" rules={[{ required: true, message: 'Chọn chỉ số' }]}>
            <Select placeholder="Chọn chỉ số" showSearch optionFilterProp="children">
              {testParams.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.code} - {p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ageGroup" label="Nhóm tuổi" rules={[{ required: true, message: 'Chọn nhóm tuổi' }]}>
                <Select>
                  {Object.entries(ageGroupLabels).map(([key, label]) => (
                    <Select.Option key={key} value={key}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Giới tính" rules={[{ required: true, message: 'Chọn giới tính' }]}>
                <Select>
                  {Object.entries(genderLabels).map(([key, label]) => (
                    <Select.Option key={key} value={key}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '8px 0' }}>Giá trị tham chiếu</Divider>
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
          <Form.Item name="unit" label="Đơn vị" rules={[{ required: true, message: 'Nhập đơn vị' }]}>
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
      message.warning('Không thể tải dữ liệu');
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
        message.success('Cập nhật thành công');
      } else {
        await createAnalyzerMapping(values);
        message.success('Thêm ánh xạ thành công');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.warning('Lỗi khi lưu ánh xạ');
    }
  };

  const handleEdit = (record: AnalyzerMappingDto) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa ánh xạ?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteAnalyzerMapping(id);
          message.success('Đã xóa');
          fetchData();
        } catch {
          message.warning('Lỗi khi xóa');
        }
      },
    });
  };

  const handleAutoMap = async () => {
    if (!filterAnalyzerId) {
      message.warning('Vui lòng chọn máy xét nghiệm trước');
      return;
    }
    setAutoMapping(true);
    try {
      const res = await autoMapAnalyzer(filterAnalyzerId);
      message.success(res.data?.message || `Đã ánh xạ tự động ${res.data?.mappedCount || 0} chỉ số`);
      fetchData();
    } catch {
      message.warning('Lỗi khi tự động ánh xạ');
    } finally {
      setAutoMapping(false);
    }
  };

  const columns: ColumnsType<AnalyzerMappingDto> = [
    { title: 'Máy XN', dataIndex: 'analyzerName', key: 'analyzerName', width: 150 },
    { title: 'Mã chỉ số máy', dataIndex: 'analyzerTestCode', key: 'analyzerTestCode', width: 140 },
    { title: 'Mã chỉ số HIS', dataIndex: 'hisTestCode', key: 'hisTestCode', width: 120 },
    { title: 'Tên chỉ số HIS', dataIndex: 'hisTestName', key: 'hisTestName', width: 180 },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (val: boolean) => val ? <Tag color="green">Hoạt động</Tag> : <Tag>Ngừng</Tag>,
    },
    {
      title: 'Thao tác',
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
              placeholder="Lọc theo máy XN"
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
              Làm mới
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
              Tự động ánh xạ
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
              Thêm ánh xạ
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
        pagination={{ showSizeChanger: true, showTotal: (t) => `Tổng: ${t} ánh xạ` }}
        locale={{ emptyText: 'Chưa có ánh xạ nào' }}
      />

      <Modal
        title={editingId ? 'Sửa ánh xạ' : 'Thêm ánh xạ'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="analyzerId" label="Máy xét nghiệm" rules={[{ required: true, message: 'Chọn máy' }]}>
            <Select placeholder="Chọn máy" showSearch optionFilterProp="children">
              {analyzers.map(a => (
                <Select.Option key={a.id} value={a.id}>{a.name} ({a.model})</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="analyzerTestCode" label="Mã chỉ số trên máy" rules={[{ required: true, message: 'Nhập mã chỉ số máy' }]}>
            <Input placeholder="VD: WBC, RBC, HGB" />
          </Form.Item>
          <Form.Item name="hisTestParameterId" label="Chỉ số HIS tương ứng" rules={[{ required: true, message: 'Chọn chỉ số HIS' }]}>
            <Select placeholder="Chọn chỉ số HIS" showSearch optionFilterProp="children">
              {testParams.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.code} - {p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
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
      message.warning('Không thể tải trạng thái Labconnect');
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
        message.success(res.data.message || `Đồng bộ thành công: ${res.data.syncedCount || 0} bản ghi`);
      } else {
        message.warning(res.data?.message || 'Đồng bộ thất bại');
      }
      fetchData();
    } catch {
      message.warning('Lỗi khi đồng bộ');
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const res = await retryFailedSyncs();
      message.success(`Đã thử lại ${res.data?.retriedCount || 0} bản ghi`);
      fetchData();
    } catch {
      message.warning('Lỗi khi thử lại');
    } finally {
      setRetrying(false);
    }
  };

  const historyColumns: ColumnsType<LabconnectSyncHistoryDto> = [
    {
      title: 'Thời gian',
      dataIndex: 'syncTime',
      key: 'syncTime',
      width: 160,
      render: (val: string) => val ? dayjs(val).format('DD/MM/YYYY HH:mm:ss') : '-',
    },
    {
      title: 'Hướng',
      dataIndex: 'direction',
      key: 'direction',
      width: 100,
      render: (val: string) => val === 'Send'
        ? <Tag color="blue">Gửi</Tag>
        : <Tag color="green">Nhận</Tag>,
    },
    {
      title: 'Số bản ghi',
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 100,
      align: 'center',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (val: string) => {
        if (val === 'Success') return <Tag color="green" icon={<CheckCircleOutlined />}>Thành công</Tag>;
        if (val === 'Failed') return <Tag color="red" icon={<CloseCircleOutlined />}>Thất bại</Tag>;
        return <Tag color="orange" icon={<WarningOutlined />}>Một phần</Tag>;
      },
    },
    {
      title: 'Thời gian (ms)',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (val?: number) => val != null ? `${val}ms` : '-',
    },
    {
      title: 'Lỗi',
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
                  <Badge status="success" text={<Text strong style={{ fontSize: 16 }}>Đã kết nối Labconnect</Text>} />
                ) : (
                  <Badge status="error" text={<Text strong style={{ fontSize: 16 }}>Chưa kết nối Labconnect</Text>} />
                )}
              </Col>
              <Col>
                <Text type="secondary">
                  Đồng bộ lần cuối: {status?.lastSyncTime ? dayjs(status.lastSyncTime).format('DD/MM/YYYY HH:mm:ss') : 'Chưa có'}
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
              title="Chờ gửi"
              value={status?.pendingSendCount ?? 0}
              prefix={<SyncOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Chờ nhận"
              value={status?.pendingReceiveCount ?? 0}
              prefix={<SyncOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Đồng bộ lỗi"
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
                Đồng bộ
              </Button>
            </Col>
            <Col>
              <Button icon={<SyncOutlined />} loading={syncing} onClick={() => handleSync('Send')}>
                Gửi dữ liệu
              </Button>
            </Col>
            <Col>
              <Button icon={<SyncOutlined />} loading={syncing} onClick={() => handleSync('Receive')}>
                Nhận dữ liệu
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
                Thử lại lỗi ({failedCount})
              </Button>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                Làm mới
              </Button>
            </Col>
          </Row>
        </Col>

        <Col span={24}>
          <Title level={5}>Lịch sử đồng bộ</Title>
          <Table
            columns={historyColumns}
            dataSource={history}
            rowKey="id"
            size="small"
            scroll={{ x: 800 }}
            pagination={{ showSizeChanger: true, pageSize: 10, showTotal: (t) => `Tổng: ${t} lần đồng bộ` }}
            locale={{ emptyText: 'Chưa có lịch sử đồng bộ' }}
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
      <Title level={4}>Cấu hình hệ thống xét nghiệm (LIS)</Title>

      <Card>
        <Tabs
          items={[
            {
              key: 'analyzers',
              label: (
                <span><SettingOutlined /> Cấu hình máy XN</span>
              ),
              children: <AnalyzerConfigTab />,
            },
            {
              key: 'test-params',
              label: (
                <span><ExperimentOutlined /> Chỉ số xét nghiệm</span>
              ),
              children: <TestParametersTab />,
            },
            {
              key: 'reference-ranges',
              label: (
                <span><BarChartOutlined /> Dải chỉ số</span>
              ),
              children: <ReferenceRangesTab />,
            },
            {
              key: 'mappings',
              label: (
                <span><LinkOutlined /> Ánh xạ chỉ số</span>
              ),
              children: <AnalyzerMappingTab />,
            },
            {
              key: 'labconnect',
              label: (
                <span><ApiOutlined /> Kết nối Labconnect</span>
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
