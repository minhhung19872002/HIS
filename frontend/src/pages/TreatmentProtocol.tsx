import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Drawer,
  Space,
  Spin,
  Statistic,
  InputNumber,
  Checkbox,
  message,
  Popconfirm,
  Pagination,
  Divider,
  Typography,
  Tooltip,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  PrinterOutlined,
  MinusCircleOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ClockCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as protocolApi from '../api/treatmentProtocol';
import type {
  TreatmentProtocolDto,
  TreatmentProtocolStepDto,
  SaveTreatmentProtocolDto,
} from '../api/treatmentProtocol';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// --- Constants ---

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Ban nhap', color: 'default' },
  1: { label: 'Dang ap dung', color: 'green' },
  2: { label: 'Da thay the', color: 'orange' },
  3: { label: 'Het hieu luc', color: 'red' },
};

const ACTIVITY_TYPES = [
  { value: 'Medication', label: 'Thuoc' },
  { value: 'Lab', label: 'Xet nghiem' },
  { value: 'Imaging', label: 'Chan doan hinh anh' },
  { value: 'Procedure', label: 'Thu thuat' },
  { value: 'Monitoring', label: 'Theo doi' },
  { value: 'Other', label: 'Khac' },
];

const ACTIVITY_COLORS: Record<string, string> = {
  Medication: 'blue',
  Lab: 'green',
  Imaging: 'purple',
  Procedure: 'red',
  Monitoring: 'cyan',
  Other: 'default',
};

const MEDICATION_ROUTES = [
  { value: 'Uong', label: 'Uong' },
  { value: 'Tiem TM', label: 'Tiem TM' },
  { value: 'Tiem duoi da', label: 'Tiem duoi da' },
  { value: 'Tiem bap', label: 'Tiem bap' },
  { value: 'Dat hau mon', label: 'Dat hau mon' },
  { value: 'Khac', label: 'Khac' },
];

// --- Component ---

const TreatmentProtocol: React.FC = () => {
  // Data state
  const [protocols, setProtocols] = useState<TreatmentProtocolDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [diseaseGroups, setDiseaseGroups] = useState<string[]>([]);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, draft: 0, expired: 0 });

  // Search filters
  const [keyword, setKeyword] = useState('');
  const [filterIcd, setFilterIcd] = useState('');
  const [filterGroup, setFilterGroup] = useState<string | undefined>();
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | undefined>();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<TreatmentProtocolDto | null>(null);

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [steps, setSteps] = useState<TreatmentProtocolStepDto[]>([]);
  const [saving, setSaving] = useState(false);

  // --- Data fetching ---

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    try {
      const res = await protocolApi.searchProtocols({
        keyword: keyword || undefined,
        icdCode: filterIcd || undefined,
        diseaseGroup: filterGroup,
        department: filterDept || undefined,
        status: filterStatus,
        pageIndex,
        pageSize,
      });
      const data = res.data;
      if (data && Array.isArray(data.items)) {
        setProtocols(data.items);
        setTotalCount(data.totalCount);
        // Compute stats from full result when no filters or from current page
        const items = data.items;
        setStats({
          total: data.totalCount,
          active: items.filter((p) => p.status === 1).length,
          draft: items.filter((p) => p.status === 0).length,
          expired: items.filter((p) => p.status === 3).length,
        });
      } else {
        setProtocols([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.warn('Failed to fetch treatment protocols:', err);
      message.warning('Khong the tai danh sach phac do dieu tri');
      setProtocols([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [keyword, filterIcd, filterGroup, filterDept, filterStatus, pageIndex, pageSize]);

  const fetchDiseaseGroups = useCallback(async () => {
    try {
      const res = await protocolApi.getDiseaseGroups();
      if (res.data && Array.isArray(res.data)) {
        setDiseaseGroups(res.data);
      }
    } catch {
      // Disease groups are optional
    }
  }, []);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  useEffect(() => {
    fetchDiseaseGroups();
  }, [fetchDiseaseGroups]);

  // --- Handlers ---

  const handleRowClick = async (record: TreatmentProtocolDto) => {
    try {
      const res = await protocolApi.getProtocolById(record.id);
      setSelectedProtocol(res.data || record);
    } catch {
      setSelectedProtocol(record);
    }
    setDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingId(undefined);
    form.resetFields();
    setSteps([]);
    setModalOpen(true);
  };

  const handleEdit = (protocol: TreatmentProtocolDto) => {
    setEditingId(protocol.id);
    form.setFieldsValue({
      code: protocol.code,
      name: protocol.name,
      description: protocol.description,
      icdCode: protocol.icdCode,
      icdName: protocol.icdName,
      diseaseGroup: protocol.diseaseGroup,
      department: protocol.department,
      references: protocol.references,
      notes: protocol.notes,
    });
    setSteps(protocol.steps || []);
    setModalOpen(true);
    setDrawerOpen(false);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const dto: SaveTreatmentProtocolDto = {
        id: editingId,
        code: values.code,
        name: values.name,
        description: values.description,
        icdCode: values.icdCode,
        icdName: values.icdName,
        diseaseGroup: values.diseaseGroup,
        department: values.department,
        references: values.references,
        notes: values.notes,
        steps: steps.map((s, i) => ({ ...s, stepOrder: i + 1 })),
      };
      await protocolApi.saveProtocol(dto);
      message.success(editingId ? 'Cap nhat phac do thanh cong' : 'Tao phac do thanh cong');
      setModalOpen(false);
      fetchProtocols();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // form validation
      console.warn('Failed to save protocol:', err);
      message.warning('Khong the luu phac do dieu tri');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await protocolApi.deleteProtocol(id);
      message.success('Da xoa phac do');
      setDrawerOpen(false);
      fetchProtocols();
    } catch (err) {
      console.warn('Failed to delete protocol:', err);
      message.warning('Khong the xoa phac do');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await protocolApi.approveProtocol(id);
      message.success('Da phe duyet phac do');
      setDrawerOpen(false);
      fetchProtocols();
    } catch (err) {
      console.warn('Failed to approve protocol:', err);
      message.warning('Khong the phe duyet phac do');
    }
  };

  const handleNewVersion = async (id: string) => {
    try {
      const res = await protocolApi.newVersion(id);
      message.success('Da tao phien ban moi');
      setDrawerOpen(false);
      fetchProtocols();
      if (res.data) {
        handleEdit(res.data);
      }
    } catch (err) {
      console.warn('Failed to create new version:', err);
      message.warning('Khong the tao phien ban moi');
    }
  };

  // --- Step helpers ---

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        stepOrder: prev.length + 1,
        name: '',
        activityType: 'Medication',
        isOptional: false,
      },
    ]);
  };

  const updateStep = (index: number, field: string, value: unknown) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Table columns ---

  const columns: ColumnsType<TreatmentProtocolDto> = [
    {
      title: 'Ma PD',
      dataIndex: 'code',
      key: 'code',
      width: 110,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Ten phac do',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Ma ICD',
      dataIndex: 'icdCode',
      key: 'icdCode',
      width: 100,
    },
    {
      title: 'Nhom benh',
      dataIndex: 'diseaseGroup',
      key: 'diseaseGroup',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Phien ban',
      dataIndex: 'version',
      key: 'version',
      width: 90,
      align: 'center',
      render: (v: number) => `v${v}`,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: number) => {
        const info = STATUS_MAP[status] || STATUS_MAP[0];
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
      width: 130,
      ellipsis: true,
    },
    {
      title: 'So buoc',
      dataIndex: 'stepCount',
      key: 'stepCount',
      width: 80,
      align: 'center',
    },
    {
      title: 'Ngay ap dung',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 120,
      render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Hanh dong',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: TreatmentProtocolDto) => (
        <Space>
          <Tooltip title="Chinh sua">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(record);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Xoa phac do nay?"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <Tooltip title="Xoa">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // --- Steps table in drawer ---

  const stepColumns: ColumnsType<TreatmentProtocolStepDto> = [
    {
      title: '#',
      dataIndex: 'stepOrder',
      key: 'stepOrder',
      width: 50,
      align: 'center',
    },
    {
      title: 'Ten buoc',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Loai',
      dataIndex: 'activityType',
      key: 'activityType',
      width: 130,
      render: (type: string) => {
        const label = ACTIVITY_TYPES.find((a) => a.value === type)?.label || type;
        return <Tag color={ACTIVITY_COLORS[type] || 'default'}>{label}</Tag>;
      },
    },
    {
      title: 'Thoi gian (ngay)',
      dataIndex: 'durationDays',
      key: 'durationDays',
      width: 120,
      align: 'center',
      render: (d: number | undefined) => d ?? '-',
    },
    {
      title: 'Thuoc / Dich vu',
      key: 'medService',
      width: 200,
      ellipsis: true,
      render: (_: unknown, record: TreatmentProtocolStepDto) => {
        if (record.activityType === 'Medication' && record.medicationName) {
          return `${record.medicationName} ${record.medicationDose || ''} (${record.medicationRoute || ''})`;
        }
        if ((record.activityType === 'Lab' || record.activityType === 'Imaging') && record.serviceName) {
          return record.serviceName;
        }
        return '-';
      },
    },
    {
      title: 'Tuy chon',
      dataIndex: 'isOptional',
      key: 'isOptional',
      width: 80,
      align: 'center',
      render: (val: boolean) => (val ? <Tag>Tuy chon</Tag> : null),
    },
  ];

  // --- Render ---

  return (
    <Spin spinning={loading}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ExperimentOutlined style={{ marginRight: 8 }} />
          Phac do dieu tri
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchProtocols}>
            Lam moi
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Them phac do
          </Button>
        </Space>
      </div>

      {/* Stats cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Tong phac do"
              value={stats.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Dang ap dung"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Ban nhap"
              value={stats.draft}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Het hieu luc"
              value={stats.expired}
              prefix={<StopOutlined />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Search / Filter bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8} md={6}>
            <Search
              placeholder="Tim theo ten, ma..."
              allowClear
              onSearch={(v) => {
                setKeyword(v);
                setPageIndex(0);
              }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Input
              placeholder="Ma ICD"
              allowClear
              value={filterIcd}
              onChange={(e) => {
                setFilterIcd(e.target.value);
                setPageIndex(0);
              }}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Nhom benh"
              allowClear
              style={{ width: '100%' }}
              value={filterGroup}
              onChange={(v) => {
                setFilterGroup(v);
                setPageIndex(0);
              }}
              options={diseaseGroups.map((g) => ({ value: g, label: g }))}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Input
              placeholder="Khoa"
              allowClear
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setPageIndex(0);
              }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Trang thai"
              allowClear
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={(v) => {
                setFilterStatus(v);
                setPageIndex(0);
              }}
              options={Object.entries(STATUS_MAP).map(([k, v]) => ({
                value: Number(k),
                label: v.label,
              }))}
            />
          </Col>
        </Row>
      </Card>

      {/* Main table */}
      <Table
        dataSource={protocols}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
        scroll={{ x: 1100 }}
      />

      {totalCount > pageSize && (
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Pagination
            current={pageIndex + 1}
            pageSize={pageSize}
            total={totalCount}
            showSizeChanger
            showTotal={(t) => `Tong ${t} phac do`}
            onChange={(page, size) => {
              setPageIndex(page - 1);
              setPageSize(size);
            }}
          />
        </div>
      )}

      {/* Detail Drawer */}
      <Drawer
        title={selectedProtocol ? `${selectedProtocol.code} - ${selectedProtocol.name}` : 'Chi tiet phac do'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          selectedProtocol && (
            <Space>
              <Button icon={<EditOutlined />} onClick={() => handleEdit(selectedProtocol)}>
                Sua
              </Button>
              {selectedProtocol.status === 0 && (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove(selectedProtocol.id)}>
                  Phe duyet
                </Button>
              )}
              <Button icon={<CopyOutlined />} onClick={() => handleNewVersion(selectedProtocol.id)}>
                Tao phien ban moi
              </Button>
              <Popconfirm title="Xoa phac do nay?" onConfirm={() => handleDelete(selectedProtocol.id)}>
                <Button danger icon={<DeleteOutlined />}>
                  Xoa
                </Button>
              </Popconfirm>
              <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                In
              </Button>
            </Space>
          )
        }
      >
        {selectedProtocol && (
          <>
            <Row gutter={[16, 8]}>
              <Col span={8}><Text type="secondary">Ma phac do:</Text> <Text strong>{selectedProtocol.code}</Text></Col>
              <Col span={8}><Text type="secondary">Phien ban:</Text> <Text>v{selectedProtocol.version}</Text></Col>
              <Col span={8}>
                <Text type="secondary">Trang thai:</Text>{' '}
                <Tag color={STATUS_MAP[selectedProtocol.status]?.color || 'default'}>
                  {STATUS_MAP[selectedProtocol.status]?.label || 'N/A'}
                </Tag>
              </Col>
              <Col span={8}><Text type="secondary">Ma ICD:</Text> <Text>{selectedProtocol.icdCode || '-'}</Text></Col>
              <Col span={8}><Text type="secondary">Ten ICD:</Text> <Text>{selectedProtocol.icdName || '-'}</Text></Col>
              <Col span={8}><Text type="secondary">Nhom benh:</Text> <Text>{selectedProtocol.diseaseGroup || '-'}</Text></Col>
              <Col span={8}><Text type="secondary">Khoa:</Text> <Text>{selectedProtocol.department || '-'}</Text></Col>
              <Col span={8}>
                <Text type="secondary">Ngay ap dung:</Text>{' '}
                <Text>{selectedProtocol.effectiveDate ? dayjs(selectedProtocol.effectiveDate).format('DD/MM/YYYY') : '-'}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Het han:</Text>{' '}
                <Text>{selectedProtocol.expiryDate ? dayjs(selectedProtocol.expiryDate).format('DD/MM/YYYY') : '-'}</Text>
              </Col>
              {selectedProtocol.approvedBy && (
                <Col span={12}>
                  <Text type="secondary">Nguoi phe duyet:</Text> <Text>{selectedProtocol.approvedBy}</Text>
                  {selectedProtocol.approvedDate && ` (${dayjs(selectedProtocol.approvedDate).format('DD/MM/YYYY')})`}
                </Col>
              )}
            </Row>

            {selectedProtocol.description && (
              <>
                <Divider>Mo ta</Divider>
                <Text>{selectedProtocol.description}</Text>
              </>
            )}

            {selectedProtocol.references && (
              <>
                <Divider>Tai lieu tham khao</Divider>
                <Text>{selectedProtocol.references}</Text>
              </>
            )}

            <Divider>Cac buoc dieu tri ({selectedProtocol.steps?.length || 0})</Divider>
            <Table
              dataSource={selectedProtocol.steps || []}
              columns={stepColumns}
              rowKey={(r) => r.id || String(r.stepOrder)}
              size="small"
              pagination={false}
              scroll={{ x: 700 }}
            />

            {selectedProtocol.notes && (
              <>
                <Divider>Ghi chu</Divider>
                <Text>{selectedProtocol.notes}</Text>
              </>
            )}
          </>
        )}
      </Drawer>

      {/* Add/Edit Modal */}
      <Modal
        title={editingId ? 'Chinh sua phac do' : 'Them phac do moi'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={900}
        okText="Luu"
        cancelText="Huy"
      >
        <Form form={form} layout="vertical" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Ma phac do" rules={[{ required: true, message: 'Nhap ma phac do' }]}>
                <Input placeholder="VD: PD-001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Ten phac do" rules={[{ required: true, message: 'Nhap ten phac do' }]}>
                <Input placeholder="Ten phac do dieu tri" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mo ta">
            <TextArea rows={2} placeholder="Mo ta ngan gon ve phac do" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="icdCode" label="Ma ICD">
                <Input placeholder="VD: J18.9" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="icdName" label="Ten ICD">
                <Input placeholder="Ten benh theo ICD" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="diseaseGroup" label="Nhom benh">
                <Select placeholder="Chon nhom benh" allowClear options={diseaseGroups.map((g) => ({ value: g, label: g }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="department" label="Khoa">
                <Input placeholder="Khoa ap dung" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="references" label="Tai lieu tham khao">
                <TextArea rows={1} placeholder="Link hoac ten tai lieu tham khao" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Ghi chu">
            <TextArea rows={2} placeholder="Ghi chu them" />
          </Form.Item>

          {/* Steps section */}
          <Divider>Cac buoc dieu tri</Divider>

          {steps.map((step, idx) => (
            <Card
              key={idx}
              size="small"
              style={{ marginBottom: 8 }}
              title={`Buoc ${idx + 1}`}
              extra={
                <Button
                  type="link"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeStep(idx)}
                >
                  Xoa
                </Button>
              }
            >
              <Row gutter={12}>
                <Col span={10}>
                  <Input
                    placeholder="Ten buoc"
                    value={step.name}
                    onChange={(e) => updateStep(idx, 'name', e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                </Col>
                <Col span={8}>
                  <Select
                    placeholder="Loai hoat dong"
                    value={step.activityType}
                    onChange={(v) => updateStep(idx, 'activityType', v)}
                    options={ACTIVITY_TYPES}
                    style={{ width: '100%', marginBottom: 8 }}
                  />
                </Col>
                <Col span={4}>
                  <InputNumber
                    placeholder="Ngay"
                    value={step.durationDays}
                    onChange={(v) => updateStep(idx, 'durationDays', v)}
                    min={0}
                    style={{ width: '100%', marginBottom: 8 }}
                    addonAfter="ngay"
                  />
                </Col>
                <Col span={2} style={{ textAlign: 'center', paddingTop: 4 }}>
                  <Checkbox
                    checked={step.isOptional}
                    onChange={(e) => updateStep(idx, 'isOptional', e.target.checked)}
                  >
                    TC
                  </Checkbox>
                </Col>
              </Row>

              {/* Conditional fields for Medication */}
              {step.activityType === 'Medication' && (
                <Row gutter={12}>
                  <Col span={8}>
                    <Input
                      placeholder="Ten thuoc"
                      value={step.medicationName}
                      onChange={(e) => updateStep(idx, 'medicationName', e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                  </Col>
                  <Col span={5}>
                    <Input
                      placeholder="Lieu luong"
                      value={step.medicationDose}
                      onChange={(e) => updateStep(idx, 'medicationDose', e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                  </Col>
                  <Col span={5}>
                    <Select
                      placeholder="Duong dung"
                      value={step.medicationRoute}
                      onChange={(v) => updateStep(idx, 'medicationRoute', v)}
                      options={MEDICATION_ROUTES}
                      style={{ width: '100%', marginBottom: 8 }}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      placeholder="Tan suat"
                      value={step.medicationFrequency}
                      onChange={(e) => updateStep(idx, 'medicationFrequency', e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                  </Col>
                </Row>
              )}

              {/* Conditional fields for Lab / Imaging */}
              {(step.activityType === 'Lab' || step.activityType === 'Imaging') && (
                <Row gutter={12}>
                  <Col span={8}>
                    <Input
                      placeholder="Ma dich vu"
                      value={step.serviceCode}
                      onChange={(e) => updateStep(idx, 'serviceCode', e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                  </Col>
                  <Col span={16}>
                    <Input
                      placeholder="Ten dich vu"
                      value={step.serviceName}
                      onChange={(e) => updateStep(idx, 'serviceName', e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                  </Col>
                </Row>
              )}

              <Row gutter={12}>
                <Col span={12}>
                  <Input
                    placeholder="Dieu kien ap dung"
                    value={step.conditions}
                    onChange={(e) => updateStep(idx, 'conditions', e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                </Col>
                <Col span={12}>
                  <Input
                    placeholder="Ket qua mong doi"
                    value={step.expectedOutcome}
                    onChange={(e) => updateStep(idx, 'expectedOutcome', e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                </Col>
              </Row>
            </Card>
          ))}

          <Button type="dashed" block icon={<PlusOutlined />} onClick={addStep} style={{ marginTop: 8 }}>
            Them buoc dieu tri
          </Button>
        </Form>
      </Modal>
    </Spin>
  );
};

export default TreatmentProtocol;
