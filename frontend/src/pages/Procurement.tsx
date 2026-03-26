import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form, InputNumber,
  Tooltip, Space, Popconfirm, Progress, Badge,
} from 'antd';
import {
  FileAddOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  CheckOutlined, DeleteOutlined, ShoppingCartOutlined, BarChartOutlined,
  ExclamationCircleOutlined, SendOutlined, BulbOutlined, InboxOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import * as warehouseApi from '../api/warehouse';
import type {
  ProcurementRequestDto,
  ProcurementItemDto,
  AutoProcurementSuggestionDto,
  CreateProcurementRequestDto,
} from '../api/warehouse';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const Procurement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<ProcurementRequestDto[]>([]);
  const [suggestions, setSuggestions] = useState<AutoProcurementSuggestionDto[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [detailModal, setDetailModal] = useState<ProcurementRequestDto | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [createForm] = Form.useForm();
  const [cartItems, setCartItems] = useState<{ itemId: string; itemCode: string; itemName: string; unit: string; currentStock: number; requestedQuantity: number; notes?: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const from = dateRange?.[0]?.format('YYYY-MM-DD');
      const to = dateRange?.[1]?.format('YYYY-MM-DD');
      const res = await warehouseApi.getProcurementRequests(undefined, statusFilter, from, to);
      setRequests(res.data || []);
    } catch (err) {
      console.warn('Load procurement requests:', err);
      message.warning('Khong the tai danh sach de xuat');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateRange]);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (warehouseId?: string) => {
    setSuggestionsLoading(true);
    try {
      const wId = warehouseId || warehouses[0]?.id || '';
      if (wId) {
        const res = await warehouseApi.getAutoProcurementSuggestions(wId);
        setSuggestions(res.data || []);
      }
    } catch (err) {
      console.warn('Load suggestions:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [warehouses]);

  // Fetch warehouses
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const res = await warehouseApi.getWarehouses();
        const wList = (res.data || []).map((w: { id: string; warehouseName: string }) => ({ id: w.id, name: w.warehouseName }));
        setWarehouses(wList);
      } catch (err) { console.warn('Load warehouses:', err); }
    };
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests();
    else if (activeTab === 'suggestions') fetchSuggestions();
  }, [activeTab, fetchRequests, fetchSuggestions]);

  // Approve request
  const handleApprove = async (id: string) => {
    try {
      await warehouseApi.approveProcurementRequest(id);
      message.success('Da duyet de xuat');
      fetchRequests();
    } catch (err) { console.warn('Approve:', err); message.warning('Loi duyet de xuat'); }
  };

  // Create request
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const dto: CreateProcurementRequestDto = {
        warehouseId: values.warehouseId,
        description: values.description,
        items: cartItems.map(item => ({
          itemId: item.itemId,
          requestedQuantity: item.requestedQuantity,
          notes: item.notes,
        })),
      };
      await warehouseApi.createProcurementRequest(dto);
      message.success('Da tao de xuat du tru');
      setCreateModal(false);
      createForm.resetFields();
      setCartItems([]);
      fetchRequests();
    } catch (err) { console.warn('Create procurement:', err); message.warning('Loi tao de xuat'); }
  };

  // Add suggestion to cart
  const addToCart = (item: AutoProcurementSuggestionDto) => {
    if (cartItems.find(c => c.itemId === item.itemId)) return;
    setCartItems(prev => [...prev, {
      itemId: item.itemId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unit: item.unit,
      currentStock: item.currentStock,
      requestedQuantity: Math.max(1, (item.maximumStock || item.minimumStock * 2) - item.currentStock),
    }]);
    message.success(`Da them ${item.itemName}`);
  };

  // Status colors
  const statusColors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'success', 3: 'error' };
  const statusNames: Record<number, string> = { 0: 'Nhap', 1: 'Cho duyet', 2: 'Da duyet', 3: 'Tu choi' };

  // Request columns
  const requestColumns: ColumnsType<ProcurementRequestDto> = [
    { title: 'Ma phieu', dataIndex: 'requestCode', key: 'requestCode', width: 140 },
    { title: 'Ngay tao', dataIndex: 'requestDate', key: 'requestDate', width: 120, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName', width: 160, ellipsis: true },
    { title: 'Mo ta', dataIndex: 'description', key: 'description', width: 200, ellipsis: true },
    { title: 'So mat hang', key: 'itemCount', width: 100, align: 'right', render: (_: unknown, r: ProcurementRequestDto) => r.items?.length || 0 },
    { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 110, render: (s: number) => <Tag color={statusColors[s]}>{statusNames[s] || 'N/A'}</Tag> },
    { title: 'Nguoi tao', dataIndex: 'createdByName', key: 'createdByName', width: 150 },
    {
      title: '', key: 'action', width: 150, render: (_: unknown, r: ProcurementRequestDto) => (
        <Space>
          <Button size="small" onClick={() => setDetailModal(r)}>Xem</Button>
          {r.status <= 1 && (
            <Popconfirm title="Duyet de xuat nay?" onConfirm={() => handleApprove(r.id)}>
              <Button size="small" type="primary" icon={<CheckOutlined />}>Duyet</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Suggestion columns
  const suggestionColumns: ColumnsType<AutoProcurementSuggestionDto> = [
    { title: 'Ma', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
    { title: 'Ten', dataIndex: 'itemName', key: 'itemName', width: 250, ellipsis: true },
    { title: 'DVT', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: 'Ton hien tai', dataIndex: 'currentStock', key: 'currentStock', width: 110, align: 'right',
      render: (v: number, r: AutoProcurementSuggestionDto) => (
        <span style={{ color: v <= r.minimumStock ? '#ff4d4f' : undefined, fontWeight: v <= r.minimumStock ? 'bold' : undefined }}>
          {v}
        </span>
      ),
    },
    { title: 'Ton toi thieu', dataIndex: 'minimumStock', key: 'minimumStock', width: 110, align: 'right' },
    { title: 'Ton toi da', dataIndex: 'maximumStock', key: 'maximumStock', width: 110, align: 'right' },
    { title: 'TB thang', dataIndex: 'averageMonthlyUsage', key: 'avgUsage', width: 100, align: 'right', render: (v: number) => v?.toFixed(1) },
    { title: 'Can nhap', key: 'needed', width: 100, align: 'right',
      render: (_: unknown, r: AutoProcurementSuggestionDto) => {
        const needed = Math.max(0, (r.maximumStock || r.minimumStock * 2) - r.currentStock);
        return needed > 0 ? <Text type="danger" strong>{needed}</Text> : <Text type="secondary">0</Text>;
      },
    },
    { title: '', key: 'action', width: 80, render: (_: unknown, r: AutoProcurementSuggestionDto) => (
      <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => addToCart(r)}
        disabled={!!cartItems.find(c => c.itemId === r.itemId)}>Them</Button>
    )},
  ];

  // Detail item columns
  const detailItemColumns: ColumnsType<ProcurementItemDto> = [
    { title: 'Ma', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
    { title: 'Ten', dataIndex: 'itemName', key: 'itemName', width: 250 },
    { title: 'DVT', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: 'Ton hien tai', dataIndex: 'currentStock', key: 'currentStock', width: 110, align: 'right' },
    { title: 'SL yeu cau', dataIndex: 'requestedQuantity', key: 'requestedQuantity', width: 110, align: 'right' },
    { title: 'SL duyet', dataIndex: 'approvedQuantity', key: 'approvedQuantity', width: 110, align: 'right' },
    { title: 'Ghi chu', dataIndex: 'notes', key: 'notes', width: 150 },
  ];

  // Stats
  const pendingCount = requests.filter(r => r.status <= 1).length;
  const approvedCount = requests.filter(r => r.status === 2).length;
  const belowMinCount = suggestions.filter(s => s.currentStock <= s.minimumStock).length;

  const tabItems = [
    {
      key: 'requests',
      label: <><FileAddOutlined /> De xuat du tru {pendingCount > 0 && <Badge count={pendingCount} size="small" style={{ marginLeft: 4 }} />}</>,
      children: (
        <Spin spinning={loading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={6}>
              <Select placeholder="Trang thai" allowClear style={{ width: '100%' }}
                value={statusFilter} onChange={setStatusFilter}
                options={[{ value: 0, label: 'Nhap' }, { value: 1, label: 'Cho duyet' }, { value: 2, label: 'Da duyet' }, { value: 3, label: 'Tu choi' }]} />
            </Col>
            <Col xs={24} sm={8}>
              <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY"
                value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
            </Col>
            <Col xs={24} sm={10} style={{ textAlign: 'right' }}>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={fetchRequests}>Lam moi</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateModal(true); setActiveTab('suggestions'); }}>
                  Tao de xuat
                </Button>
              </Space>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={8}><Card size="small"><Statistic title="Tong de xuat" value={requests.length} prefix={<FileAddOutlined />} /></Card></Col>
            <Col xs={8}><Card size="small"><Statistic title="Cho duyet" value={pendingCount} valueStyle={{ color: pendingCount > 0 ? '#faad14' : undefined }} /></Card></Col>
            <Col xs={8}><Card size="small"><Statistic title="Da duyet" value={approvedCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
          </Row>
          <Table columns={requestColumns} dataSource={requests} rowKey="id" size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} phieu` }}
            onRow={(r) => ({ onDoubleClick: () => setDetailModal(r) })} />
        </Spin>
      ),
    },
    {
      key: 'suggestions',
      label: <><BulbOutlined /> Goi y nhap hang {belowMinCount > 0 && <Badge count={belowMinCount} size="small" style={{ marginLeft: 4 }} />}</>,
      children: (
        <Spin spinning={suggestionsLoading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Select placeholder="Chon kho" style={{ width: '100%' }}
                onChange={(v: string) => fetchSuggestions(v)}
                options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
            </Col>
            <Col xs={24} sm={16} style={{ textAlign: 'right' }}>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => fetchSuggestions()}>Lam moi</Button>
                {cartItems.length > 0 && (
                  <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => setCreateModal(true)}>
                    Tao de xuat ({cartItems.length} mat hang)
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
          {belowMinCount > 0 && (
            <Card size="small" style={{ marginBottom: 16, background: '#fff7e6', borderColor: '#ffd591' }}>
              <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
              <Text strong>{belowMinCount} mat hang</Text> duoi dinh muc toi thieu. Can nhap bo sung.
            </Card>
          )}
          <Table columns={suggestionColumns} dataSource={suggestions} rowKey="itemId" size="small"
            pagination={{ pageSize: 50 }}
            rowClassName={(r: AutoProcurementSuggestionDto) => r.currentStock <= r.minimumStock ? 'ant-table-row-warning' : ''} />
        </Spin>
      ),
    },
    {
      key: 'summary',
      label: <><BarChartOutlined /> Tong hop</>,
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Tong de xuat thang nay" value={requests.filter(r => dayjs(r.requestDate).isSame(dayjs(), 'month')).length} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Da duyet thang nay" value={requests.filter(r => r.status === 2 && dayjs(r.requestDate).isSame(dayjs(), 'month')).length} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Dang cho xu ly" value={pendingCount} valueStyle={{ color: pendingCount > 0 ? '#faad14' : undefined }} />
            </Card>
          </Col>
          <Col xs={24}>
            <Card title="Trang thai de xuat" size="small">
              <Row gutter={16}>
                {[{ label: 'Nhap', status: 0, color: '#d9d9d9' }, { label: 'Cho duyet', status: 1, color: '#1890ff' }, { label: 'Da duyet', status: 2, color: '#52c41a' }, { label: 'Tu choi', status: 3, color: '#ff4d4f' }].map(s => {
                  const count = requests.filter(r => r.status === s.status).length;
                  const pct = requests.length > 0 ? Math.round(count / requests.length * 100) : 0;
                  return (
                    <Col xs={12} sm={6} key={s.status}>
                      <Text strong>{s.label}</Text>
                      <Progress percent={pct} strokeColor={s.color} format={() => `${count}`} />
                    </Col>
                  );
                })}
              </Row>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 24px', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Title level={4}><InboxOutlined /> De xuat - Du tru</Title>
      </motion.div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* Detail Modal */}
      <Modal title={`Chi tiet de xuat: ${detailModal?.requestCode || ''}`} open={!!detailModal}
        onCancel={() => setDetailModal(null)} footer={null} width={800}>
        {detailModal && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Text type="secondary">Kho:</Text> <Text strong>{detailModal.warehouseName}</Text></Col>
              <Col span={8}><Text type="secondary">Ngay:</Text> <Text>{dayjs(detailModal.requestDate).format('DD/MM/YYYY')}</Text></Col>
              <Col span={8}><Text type="secondary">Trang thai:</Text> <Tag color={statusColors[detailModal.status]}>{statusNames[detailModal.status]}</Tag></Col>
            </Row>
            {detailModal.description && <Text type="secondary">Mo ta: {detailModal.description}</Text>}
            <Table columns={detailItemColumns} dataSource={detailModal.items} rowKey="id" size="small" pagination={false} style={{ marginTop: 16 }} />
          </>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal title="Tao de xuat du tru" open={createModal} onCancel={() => setCreateModal(false)}
        onOk={handleCreate} okText="Tao de xuat" cancelText="Huy" width={700}
        okButtonProps={{ disabled: cartItems.length === 0 }}>
        <Form form={createForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="warehouseId" label="Kho" rules={[{ required: true, message: 'Chon kho' }]}>
                <Select placeholder="Chon kho" options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="Mo ta">
                <Input placeholder="Ly do de xuat" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Text strong>Mat hang ({cartItems.length}):</Text>
        <Table size="small" dataSource={cartItems} rowKey="itemId" pagination={false} style={{ marginTop: 8 }}
          columns={[
            { title: 'Ma', dataIndex: 'itemCode', width: 100 },
            { title: 'Ten', dataIndex: 'itemName', width: 200, ellipsis: true },
            { title: 'DVT', dataIndex: 'unit', width: 60 },
            { title: 'Ton', dataIndex: 'currentStock', width: 80, align: 'right' },
            { title: 'SL yeu cau', key: 'qty', width: 120, render: (_: unknown, r: typeof cartItems[0], idx: number) => (
              <InputNumber size="small" min={1} value={r.requestedQuantity} style={{ width: '100%' }}
                onChange={(v) => { const next = [...cartItems]; next[idx].requestedQuantity = v || 1; setCartItems(next); }} />
            )},
            { title: '', key: 'del', width: 40, render: (_: unknown, __: unknown, idx: number) => (
              <Button size="small" type="text" danger icon={<DeleteOutlined />}
                onClick={() => setCartItems(prev => prev.filter((_, i) => i !== idx))} />
            )},
          ]} />
        {cartItems.length === 0 && <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 16 }}>Chua co mat hang. Chon tu tab "Goi y nhap hang".</Text>}
      </Modal>
    </div>
  );
};

export default Procurement;
