import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select,
  DatePicker, Tag, Tabs, message, Spin, Statistic, Row, Col, Badge,
  Tooltip, Progress, Descriptions
} from 'antd';
import {
  MedicineBoxOutlined, PlusOutlined, ReloadOutlined, WarningOutlined,
  CheckCircleOutlined, ExperimentOutlined, HistoryOutlined, EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Reagent, ReagentUsage, ReagentAlert } from '../api/reagent';
import * as reagentApi from '../api/reagent';

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: 'Sẵn sàng', color: 'green' },
  1: { text: 'Đang dùng', color: 'blue' },
  2: { text: 'Sắp hết', color: 'orange' },
  3: { text: 'Hết hạn', color: 'red' },
  4: { text: 'Đã hủy', color: 'default' },
};

const ReagentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(false);
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [usageHistory, setUsageHistory] = useState<ReagentUsage[]>([]);
  const [alerts, setAlerts] = useState<ReagentAlert[]>([]);
  const [searchText, setSearchText] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [selectedReagent, setSelectedReagent] = useState<Reagent | null>(null);
  const [createForm] = Form.useForm();
  const [usageForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reagentsRes, usageRes, alertsRes] = await Promise.allSettled([
        reagentApi.getReagents({ keyword: searchText || undefined }),
        reagentApi.getReagentUsageHistory(),
        reagentApi.getReagentAlerts(),
      ]);
      if (reagentsRes.status === 'fulfilled') setReagents(Array.isArray(reagentsRes.value) ? reagentsRes.value : []);
      if (usageRes.status === 'fulfilled') setUsageHistory(Array.isArray(usageRes.value) ? usageRes.value : []);
      if (alertsRes.status === 'fulfilled') setAlerts(Array.isArray(alertsRes.value) ? alertsRes.value : []);
    } catch {
      message.warning('Không thể tải dữ liệu hóa chất');
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      if (values.expiryDate) values.expiryDate = values.expiryDate.format('YYYY-MM-DD');
      if (values.receivedDate) values.receivedDate = values.receivedDate.format('YYYY-MM-DD');
      await reagentApi.createReagent(values);
      message.success('Thêm hóa chất thành công');
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleRecordUsage = async () => {
    if (!selectedReagent) return;
    try {
      const values = await usageForm.validateFields();
      values.reagentId = selectedReagent.id;
      await reagentApi.recordReagentUsage(values);
      message.success('Ghi nhận sử dụng thành công');
      setUsageModalOpen(false);
      usageForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const inventoryColumns = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 80 },
    { title: 'Tên hóa chất', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Hãng SX', dataIndex: 'manufacturer', key: 'manufacturer', width: 120 },
    { title: 'Lô', dataIndex: 'lotNumber', key: 'lotNumber', width: 100 },
    { title: 'Máy XN', dataIndex: 'analyzerName', key: 'analyzerName', width: 120 },
    { title: 'Tồn kho', key: 'stock', width: 120,
      render: (_: unknown, r: Reagent) => {
        const pct = r.quantity > 0 ? (r.remainingQuantity / r.quantity) * 100 : 0;
        return <Progress percent={Math.round(pct)} size="small" strokeColor={pct < 20 ? '#f5222d' : pct < 50 ? '#faad14' : '#52c41a'}
          format={() => `${r.remainingQuantity}/${r.quantity}`} />;
      },
    },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', width: 60 },
    { title: 'Hạn dùng', dataIndex: 'expiryDate', key: 'expiryDate', width: 100,
      render: (v: string, r: Reagent) => <span style={{ color: r.isExpired ? '#f5222d' : undefined }}>{v ? dayjs(v).format('DD/MM/YYYY') : '-'}</span> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 90,
      render: (v: number) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag> },
    {
      title: 'Thao tác', key: 'action', width: 130,
      render: (_: unknown, record: Reagent) => (
        <Space>
          <Tooltip title="Chi tiết"><Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedReagent(record); setDetailModalOpen(true); }} /></Tooltip>
          <Tooltip title="Ghi nhận sử dụng"><Button size="small" icon={<ExperimentOutlined />} onClick={() => { setSelectedReagent(record); usageForm.resetFields(); setUsageModalOpen(true); }} /></Tooltip>
        </Space>
      ),
    },
  ];

  const usageColumns = [
    { title: 'Ngày', dataIndex: 'usageDate', key: 'usageDate', width: 140, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Hóa chất', dataIndex: 'reagentName', key: 'reagentName', width: 150 },
    { title: 'Lô', dataIndex: 'lotNumber', key: 'lotNumber', width: 100 },
    { title: 'Xét nghiệm', dataIndex: 'testName', key: 'testName', width: 140 },
    { title: 'Máy XN', dataIndex: 'analyzerName', key: 'analyzerName', width: 120 },
    { title: 'SL sử dụng', dataIndex: 'quantityUsed', key: 'quantityUsed', width: 90 },
    { title: 'Người thực hiện', dataIndex: 'operatorName', key: 'operatorName', width: 120 },
  ];

  const alertColumns = [
    { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Loại', dataIndex: 'type', key: 'type', width: 90,
      render: (v: string) => v === 'lowStock' ? <Tag color="orange">Sắp hết</Tag> : v === 'expired' ? <Tag color="red">Hết hạn</Tag> : <Tag color="gold">Sắp hết hạn</Tag> },
    { title: 'Hóa chất', dataIndex: 'reagentName', key: 'reagentName', width: 150 },
    { title: 'Lô', dataIndex: 'lotNumber', key: 'lotNumber', width: 100 },
    { title: 'Nội dung', dataIndex: 'message', key: 'message' },
  ];

  const lowStockCount = reagents.filter(r => r.isLowStock).length;
  const expiredCount = reagents.filter(r => r.isExpired).length;

  const tabItems = [
    { key: 'inventory', label: <span><MedicineBoxOutlined /> Tồn kho</span>,
      children: <Table columns={inventoryColumns} dataSource={reagents} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'usage', label: <span><HistoryOutlined /> Lịch sử sử dụng</span>,
      children: <Table columns={usageColumns} dataSource={usageHistory} rowKey="id" size="small" pagination={{ pageSize: 20 }} /> },
    { key: 'alerts', label: <span><Badge count={alerts.length} size="small" offset={[8, 0]}><WarningOutlined /> Cảnh báo</Badge></span>,
      children: <Table columns={alertColumns} dataSource={alerts} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={<span><MedicineBoxOutlined /> Quản lý hóa chất xét nghiệm</span>}
        extra={
          <Space>
            <Input.Search placeholder="Tìm hóa chất..." value={searchText} onChange={e => setSearchText(e.target.value)} onSearch={fetchData} style={{ width: 220 }} allowClear />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { createForm.resetFields(); setCreateModalOpen(true); }}>Thêm hóa chất</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Statistic title="Tổng loại HC" value={reagents.length} prefix={<MedicineBoxOutlined />} /></Col>
          <Col span={6}><Statistic title="Đang dùng" value={reagents.filter(r => r.status <= 1).length} styles={{ content: { color: '#52c41a' } }} prefix={<CheckCircleOutlined />} /></Col>
          <Col span={6}><Statistic title="Sắp hết" value={lowStockCount} styles={{ content: { color: lowStockCount > 0 ? '#fa8c16' : '#52c41a' } }} prefix={<WarningOutlined />} /></Col>
          <Col span={6}><Statistic title="Hết hạn" value={expiredCount} styles={{ content: { color: expiredCount > 0 ? '#cf1322' : '#52c41a' } }} /></Col>
        </Row>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Create Reagent Modal */}
      <Modal title="Thêm hóa chất" open={createModalOpen} onOk={handleCreate} onCancel={() => setCreateModalOpen(false)} width={700} destroyOnHidden>
        <Form form={createForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}><Form.Item name="code" label="Mã hóa chất" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={16}><Form.Item name="name" label="Tên hóa chất" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="manufacturer" label="Hãng sản xuất" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="lotNumber" label="Số lô" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="catalogNumber" label="Catalog #"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="quantity" label="Số lượng" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
            <Col span={6}><Form.Item name="unit" label="Đơn vị" rules={[{ required: true }]}><Input placeholder="VD: mL, tests" /></Form.Item></Col>
            <Col span={6}><Form.Item name="minimumStock" label="Tồn kho tối thiểu"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={6}>
              <Form.Item name="storageCondition" label="Bảo quản">
                <Select options={[
                  { value: 'room', label: 'Nhiệt độ phòng' }, { value: 'refrigerator', label: 'Tủ lạnh 2-8°C' },
                  { value: 'frozen', label: 'Đông lạnh -20°C' }, { value: 'deepFrozen', label: 'Siêu đông -80°C' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="receivedDate" label="Ngày nhận"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="expiryDate" label="Hạn dùng" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="stabilityDays" label="Ổn định sau mở (ngày)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Record Usage Modal */}
      <Modal title={`Ghi nhận sử dụng - ${selectedReagent?.name}`} open={usageModalOpen} onOk={handleRecordUsage} onCancel={() => setUsageModalOpen(false)} destroyOnHidden>
        <Form form={usageForm} layout="vertical">
          <Form.Item name="testCode" label="Xét nghiệm" rules={[{ required: true }]}><Input placeholder="Mã xét nghiệm" /></Form.Item>
          <Form.Item name="analyzerId" label="Máy xét nghiệm" rules={[{ required: true }]}><Input placeholder="ID máy" /></Form.Item>
          <Form.Item name="quantityUsed" label="Số lượng sử dụng" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0.01} /></Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title={`Chi tiết hóa chất - ${selectedReagent?.name}`} open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={600}>
        {selectedReagent && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Mã">{selectedReagent.code}</Descriptions.Item>
            <Descriptions.Item label="Tên">{selectedReagent.name}</Descriptions.Item>
            <Descriptions.Item label="Hãng SX">{selectedReagent.manufacturer}</Descriptions.Item>
            <Descriptions.Item label="Số lô">{selectedReagent.lotNumber}</Descriptions.Item>
            <Descriptions.Item label="Tồn kho">
              <Progress percent={selectedReagent.quantity > 0 ? Math.round((selectedReagent.remainingQuantity / selectedReagent.quantity) * 100) : 0}
                size="small" format={() => `${selectedReagent.remainingQuantity} ${selectedReagent.unit}`} />
            </Descriptions.Item>
            <Descriptions.Item label="Đã dùng">{selectedReagent.usedQuantity} {selectedReagent.unit}</Descriptions.Item>
            <Descriptions.Item label="Hạn dùng"><span style={{ color: selectedReagent.isExpired ? '#f5222d' : undefined }}>{dayjs(selectedReagent.expiryDate).format('DD/MM/YYYY')}</span></Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><Tag color={statusMap[selectedReagent.status]?.color}>{statusMap[selectedReagent.status]?.text}</Tag></Descriptions.Item>
            <Descriptions.Item label="Bảo quản">{selectedReagent.storageCondition}</Descriptions.Item>
            <Descriptions.Item label="Máy XN">{selectedReagent.analyzerName || '-'}</Descriptions.Item>
            <Descriptions.Item label="XN áp dụng" span={2}>{selectedReagent.testNames?.join(', ') || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Spin>
  );
};

export default ReagentManagement;
