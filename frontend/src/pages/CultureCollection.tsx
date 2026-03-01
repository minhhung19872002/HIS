import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, DatePicker, InputNumber,
  Tag, Tabs, message, Spin, Statistic, Row, Col, Descriptions, Badge, Tooltip,
  Timeline, Progress, Alert, Popconfirm,
} from 'antd';
import {
  ExperimentOutlined, PlusOutlined, ReloadOutlined, SearchOutlined,
  WarningOutlined, CheckCircleOutlined, DeleteOutlined, EyeOutlined,
  ScissorOutlined, HistoryOutlined, MedicineBoxOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CultureStock, CultureStockLog, CultureStockStats } from '../api/cultureStock';
import * as stockApi from '../api/cultureStock';

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: 'Hoạt động', color: 'success' },
  1: { text: 'Sắp hết', color: 'warning' },
  2: { text: 'Hết hạn', color: 'error' },
  3: { text: 'Đã hết', color: 'default' },
  4: { text: 'Đã hủy', color: '#999' },
};

const preservationMethodMap: Record<string, string> = {
  glycerol: 'Glycerol stock',
  lyophilization: 'Đông khô',
  cryopreservation: 'Đông lạnh sâu',
  skim_milk: 'Sữa gầy',
};

const actionMap: Record<string, { text: string; color: string }> = {
  store: { text: 'Lưu trữ', color: 'green' },
  retrieve: { text: 'Lấy ra', color: 'blue' },
  viability_check: { text: 'Kiểm tra', color: 'purple' },
  subculture: { text: 'Cấy chuyền', color: 'orange' },
  discard: { text: 'Hủy', color: 'red' },
  note: { text: 'Ghi chú', color: 'default' },
};

const CultureCollection: React.FC = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<CultureStock[]>([]);
  const [stats, setStats] = useState<CultureStockStats | null>(null);
  const [searchText, setSearchText] = useState('');
  const [freezerFilter, setFreezerFilter] = useState<string | undefined>();
  const [freezerCodes, setFreezerCodes] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<CultureStock | null>(null);
  const [logs, setLogs] = useState<CultureStockLog[]>([]);

  // Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [retrieveModalOpen, setRetrieveModalOpen] = useState(false);
  const [viabilityModalOpen, setViabilityModalOpen] = useState(false);
  const [subcultureModalOpen, setSubcultureModalOpen] = useState(false);

  const [storeForm] = Form.useForm();
  const [retrieveForm] = Form.useForm();
  const [viabilityForm] = Form.useForm();
  const [subcultureForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stocksRes, statsRes, freezersRes] = await Promise.allSettled([
        stockApi.getCultureStocks({ keyword: searchText || undefined, freezerCode: freezerFilter || undefined }),
        stockApi.getCultureStockStats(),
        stockApi.getFreezerCodes(),
      ]);
      if (stocksRes.status === 'fulfilled') setStocks(stocksRes.value);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (freezersRes.status === 'fulfilled') setFreezerCodes(freezersRes.value);
    } catch {
      message.warning('Không thể tải dữ liệu kho lưu chủng');
    } finally {
      setLoading(false);
    }
  }, [searchText, freezerFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getFilteredStocks = (statusFilter?: number[]) => {
    if (!statusFilter) return stocks;
    return stocks.filter(s => statusFilter.includes(s.status));
  };

  const showDetail = async (record: CultureStock) => {
    setSelectedStock(record);
    setDetailModalOpen(true);
    const logsData = await stockApi.getStockLogs(record.id);
    setLogs(logsData);
  };

  const handleStore = async () => {
    try {
      const values = await storeForm.validateFields();
      if (values.preservationDate) values.preservationDate = values.preservationDate.format('YYYY-MM-DD');
      if (values.expiryDate) values.expiryDate = values.expiryDate.format('YYYY-MM-DD');
      await stockApi.createCultureStock(values);
      message.success('Lưu chủng thành công');
      setStoreModalOpen(false);
      storeForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleRetrieve = async () => {
    if (!selectedStock) return;
    try {
      const values = await retrieveForm.validateFields();
      await stockApi.retrieveAliquot(selectedStock.id, values);
      message.success('Lấy mẫu thành công');
      setRetrieveModalOpen(false);
      retrieveForm.resetFields();
      setDetailModalOpen(false);
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleViabilityCheck = async () => {
    if (!selectedStock) return;
    try {
      const values = await viabilityForm.validateFields();
      await stockApi.recordViabilityCheck(selectedStock.id, values);
      message.success('Ghi nhận kiểm tra viability');
      setViabilityModalOpen(false);
      viabilityForm.resetFields();
      setDetailModalOpen(false);
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleSubculture = async () => {
    if (!selectedStock) return;
    try {
      const values = await subcultureForm.validateFields();
      await stockApi.subcultureStock(selectedStock.id, values);
      message.success('Cấy chuyền thành công');
      setSubcultureModalOpen(false);
      subcultureForm.resetFields();
      setDetailModalOpen(false);
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleDiscard = async (record: CultureStock) => {
    await stockApi.discardStock(record.id, 'Hủy theo quy trình');
    message.success('Đã hủy chủng');
    setDetailModalOpen(false);
    fetchData();
  };

  const columns = [
    { title: 'Mã chủng', dataIndex: 'stockCode', key: 'stockCode', width: 120, render: (v: string) => <strong>{v}</strong> },
    { title: 'Vi khuẩn / Nấm', key: 'organism', width: 200,
      render: (_: unknown, r: CultureStock) => (
        <div>
          <div>{r.organismName}</div>
          {r.scientificName && <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>{r.scientificName}</div>}
        </div>
      ),
    },
    { title: 'Gram', dataIndex: 'gramStain', key: 'gramStain', width: 70,
      render: (v: string) => v === 'positive' ? <Tag color="blue">G(+)</Tag> : v === 'negative' ? <Tag color="red">G(-)</Tag> : '-' },
    { title: 'Vị trí', dataIndex: 'locationDisplay', key: 'location', width: 160 },
    { title: 'PP bảo quản', dataIndex: 'preservationMethod', key: 'method', width: 120,
      render: (v: string) => preservationMethodMap[v] || v },
    { title: 'Nhiệt độ', dataIndex: 'storageTemperature', key: 'temp', width: 80,
      render: (v: string) => v ? `${v}°C` : '-' },
    { title: 'Passage', dataIndex: 'passageNumber', key: 'passage', width: 70,
      render: (v: number) => <Tag>P{v}</Tag> },
    { title: 'Ống còn', key: 'aliquots', width: 100,
      render: (_: unknown, r: CultureStock) => (
        <div>
          <span>{r.remainingAliquots}/{r.aliquotCount}</span>
          <Progress percent={Math.round(r.remainingAliquots / r.aliquotCount * 100)} size="small" showInfo={false}
            strokeColor={r.remainingAliquots <= 2 ? '#ff4d4f' : r.remainingAliquots <= 4 ? '#faad14' : '#52c41a'} />
        </div>
      ),
    },
    { title: 'Ngày lưu', dataIndex: 'preservationDate', key: 'date', width: 100,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    { title: 'Hạn dùng', dataIndex: 'expiryDate', key: 'expiry', width: 100,
      render: (v: string) => {
        if (!v) return '-';
        const d = dayjs(v);
        const isExpiring = d.diff(dayjs(), 'day') <= 30;
        return <span style={{ color: isExpiring ? '#ff4d4f' : undefined }}>{d.format('DD/MM/YYYY')}</span>;
      },
    },
    { title: 'Viability', key: 'viability', width: 90,
      render: (_: unknown, r: CultureStock) => {
        if (r.lastViabilityResult === true) return <Tag color="green">OK</Tag>;
        if (r.lastViabilityResult === false) return <Tag color="red">Fail</Tag>;
        return <Tag color="default">Chưa KT</Tag>;
      },
    },
    { title: 'TT', dataIndex: 'status', key: 'status', width: 90,
      render: (v: number) => { const s = statusMap[v]; return <Tag color={s?.color}>{s?.text}</Tag>; } },
    {
      title: '', key: 'action', width: 60,
      render: (_: unknown, record: CultureStock) => (
        <Tooltip title="Chi tiết"><Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)} /></Tooltip>
      ),
    },
  ];

  const alertCount = (stats?.expiringIn30Days || 0) + (stats?.needViabilityCheck || 0);

  const tabItems = [
    { key: 'active', label: <span><Badge count={stats?.activeCount || 0} size="small" offset={[8, 0]}>Hoạt động</Badge></span>,
      children: <Table columns={columns} dataSource={getFilteredStocks([0])} rowKey="id" size="small" pagination={{ pageSize: 15 }} scroll={{ x: 1400 }} /> },
    { key: 'warning', label: <span><Badge count={stats?.lowStockCount || 0} size="small" offset={[8, 0]} style={{ backgroundColor: '#faad14' }}>Sắp hết</Badge></span>,
      children: <Table columns={columns} dataSource={getFilteredStocks([1])} rowKey="id" size="small" pagination={{ pageSize: 15 }} scroll={{ x: 1400 }} /> },
    { key: 'expired', label: <span><WarningOutlined /> Hết hạn / Đã hết</span>,
      children: <Table columns={columns} dataSource={getFilteredStocks([2, 3])} rowKey="id" size="small" pagination={{ pageSize: 15 }} scroll={{ x: 1400 }} /> },
    { key: 'discarded', label: 'Đã hủy',
      children: <Table columns={columns} dataSource={getFilteredStocks([4])} rowKey="id" size="small" pagination={{ pageSize: 15 }} scroll={{ x: 1400 }} /> },
    { key: 'all', label: `Tất cả (${stocks.length})`,
      children: <Table columns={columns} dataSource={stocks} rowKey="id" size="small" pagination={{ pageSize: 15 }} scroll={{ x: 1400 }} /> },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={<span><ExperimentOutlined /> Kho lưu chủng Vi Sinh (Culture Collection)</span>}
        extra={
          <Space>
            <Input.Search placeholder="Tìm kiếm mã, tên VK..." value={searchText} onChange={e => setSearchText(e.target.value)} onSearch={fetchData} style={{ width: 220 }} allowClear />
            <Select placeholder="Tủ lạnh" value={freezerFilter} onChange={v => setFreezerFilter(v)} allowClear style={{ width: 120 }}
              options={freezerCodes.map(c => ({ value: c, label: c }))} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { storeForm.resetFields(); setStoreModalOpen(true); }}>Lưu chủng</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          </Space>
        }
      >
        {alertCount > 0 && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            title={`${stats?.expiringIn30Days || 0} chủng sắp hết hạn, ${stats?.needViabilityCheck || 0} chủng cần kiểm tra viability`} />
        )}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}><Statistic title="Tổng chủng" value={stats?.totalStocks || 0} prefix={<ExperimentOutlined />} /></Col>
          <Col span={4}><Statistic title="Hoạt động" value={stats?.activeCount || 0} styles={{ content: { color: '#52c41a' } }} /></Col>
          <Col span={4}><Statistic title="Sắp hết ống" value={stats?.lowStockCount || 0} styles={{ content: { color: '#faad14' } }} /></Col>
          <Col span={4}><Statistic title="Hết hạn" value={stats?.expiredCount || 0} styles={{ content: { color: '#ff4d4f' } }} /></Col>
          <Col span={4}><Statistic title="Sắp hết hạn (30d)" value={stats?.expiringIn30Days || 0} styles={{ content: { color: '#fa8c16' } }} /></Col>
          <Col span={4}><Statistic title="Cần KT viability" value={stats?.needViabilityCheck || 0} styles={{ content: { color: '#722ed1' } }} /></Col>
        </Row>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Store New Culture Stock Modal */}
      <Modal title="Lưu chủng vi sinh mới" open={storeModalOpen} onOk={handleStore} onCancel={() => setStoreModalOpen(false)} width={700} destroyOnHidden>
        <Form form={storeForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="organismCode" label="Mã vi khuẩn" rules={[{ required: true }]}><Input placeholder="VD: STAAUR" /></Form.Item></Col>
            <Col span={12}><Form.Item name="organismName" label="Tên vi khuẩn" rules={[{ required: true }]}><Input placeholder="VD: Staphylococcus aureus" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="scientificName" label="Tên khoa học"><Input placeholder="VD: S. aureus" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="gramStain" label="Nhuộm Gram">
                <Select options={[{ value: 'positive', label: 'Gram (+)' }, { value: 'negative', label: 'Gram (-)' }]} allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sourceType" label="Nguồn gốc">
                <Select options={[
                  { value: 'clinical', label: 'Lâm sàng' }, { value: 'environmental', label: 'Môi trường' },
                  { value: 'reference', label: 'Chủng chuẩn' }, { value: 'qc', label: 'QC' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="sourceDescription" label="Mô tả nguồn"><Input placeholder="VD: Blood culture - BN Nguyễn Văn A" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="freezerCode" label="Tủ lạnh" rules={[{ required: true }]}><Input placeholder="TL-01" /></Form.Item></Col>
            <Col span={6}><Form.Item name="rackCode" label="Rack"><Input placeholder="R1" /></Form.Item></Col>
            <Col span={6}><Form.Item name="boxCode" label="Hộp"><Input placeholder="B1" /></Form.Item></Col>
            <Col span={6}><Form.Item name="position" label="Vị trí"><Input placeholder="A1" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="preservationMethod" label="PP bảo quản" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'glycerol', label: 'Glycerol stock' }, { value: 'lyophilization', label: 'Đông khô' },
                  { value: 'cryopreservation', label: 'Đông lạnh sâu' }, { value: 'skim_milk', label: 'Sữa gầy' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="storageTemperature" label="Nhiệt độ (°C)">
                <Select options={[
                  { value: '-80', label: '-80°C' }, { value: '-20', label: '-20°C' },
                  { value: '-196', label: '-196°C (N2 lỏng)' }, { value: '4', label: '4°C' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}><Form.Item name="aliquotCount" label="Số ống"><InputNumber min={1} max={100} defaultValue={1} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="passageNumber" label="Passage"><InputNumber min={1} max={50} defaultValue={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="preservationDate" label="Ngày lưu"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="expiryDate" label="Hạn dùng"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={`Chi tiết chủng - ${selectedStock?.stockCode}`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={900}
        footer={
          selectedStock && selectedStock.status <= 1 ? (
            <Space>
              <Button icon={<MedicineBoxOutlined />} onClick={() => { retrieveForm.resetFields(); setRetrieveModalOpen(true); }}>Lấy mẫu</Button>
              <Button icon={<CheckCircleOutlined />} onClick={() => { viabilityForm.resetFields(); setViabilityModalOpen(true); }}>KT Viability</Button>
              <Button icon={<ScissorOutlined />} onClick={() => { subcultureForm.resetFields(); setSubcultureModalOpen(true); }}>Cấy chuyền</Button>
              <Popconfirm title="Xác nhận hủy chủng này?" onConfirm={() => selectedStock && handleDiscard(selectedStock)}>
                <Button danger icon={<DeleteOutlined />}>Hủy</Button>
              </Popconfirm>
              <Button onClick={() => setDetailModalOpen(false)}>Đóng</Button>
            </Space>
          ) : <Button onClick={() => setDetailModalOpen(false)}>Đóng</Button>
        }
      >
        {selectedStock && (
          <Tabs items={[
            { key: 'info', label: 'Thông tin', children: (
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Mã chủng">{selectedStock.stockCode}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái"><Tag color={statusMap[selectedStock.status]?.color}>{statusMap[selectedStock.status]?.text}</Tag></Descriptions.Item>
                <Descriptions.Item label="Vi khuẩn">{selectedStock.organismName} ({selectedStock.organismCode})</Descriptions.Item>
                <Descriptions.Item label="Gram">{selectedStock.gramStain === 'positive' ? 'Gram (+)' : selectedStock.gramStain === 'negative' ? 'Gram (-)' : '-'}</Descriptions.Item>
                <Descriptions.Item label="Tên khoa học">{selectedStock.scientificName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Nguồn">{selectedStock.sourceType || '-'}</Descriptions.Item>
                <Descriptions.Item label="Mô tả nguồn" span={2}>{selectedStock.sourceDescription || '-'}</Descriptions.Item>
                <Descriptions.Item label="Vị trí lưu trữ">{selectedStock.locationDisplay || '-'}</Descriptions.Item>
                <Descriptions.Item label="Nhiệt độ">{selectedStock.storageTemperature ? `${selectedStock.storageTemperature}°C` : '-'}</Descriptions.Item>
                <Descriptions.Item label="PP bảo quản">{preservationMethodMap[selectedStock.preservationMethod] || selectedStock.preservationMethod}</Descriptions.Item>
                <Descriptions.Item label="Passage">P{selectedStock.passageNumber}</Descriptions.Item>
                <Descriptions.Item label="Số ống còn">{selectedStock.remainingAliquots} / {selectedStock.aliquotCount}</Descriptions.Item>
                <Descriptions.Item label="Ngày lưu">{selectedStock.preservationDate ? dayjs(selectedStock.preservationDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Hạn dùng">{selectedStock.expiryDate ? dayjs(selectedStock.expiryDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Viability cuối">
                  {selectedStock.lastViabilityCheck
                    ? <span>{selectedStock.lastViabilityResult ? <Tag color="green">OK</Tag> : <Tag color="red">Fail</Tag>} ({dayjs(selectedStock.lastViabilityCheck).format('DD/MM/YYYY')})</span>
                    : 'Chưa kiểm tra'}
                </Descriptions.Item>
                <Descriptions.Item label="Ghi chú" span={2}>{selectedStock.notes || '-'}</Descriptions.Item>
              </Descriptions>
            )},
            { key: 'logs', label: <span><HistoryOutlined /> Lịch sử ({logs.length})</span>, children: (
              <Timeline items={logs.map(log => ({
                key: log.id,
                color: actionMap[log.action]?.color || 'gray',
                children: (
                  <div>
                    <Tag color={actionMap[log.action]?.color}>{actionMap[log.action]?.text || log.action}</Tag>
                    <span style={{ color: '#999', fontSize: 12 }}>{dayjs(log.performedAt).format('DD/MM/YYYY HH:mm')}</span>
                    {log.performedBy && <span style={{ marginLeft: 8, fontSize: 12 }}>- {log.performedBy}</span>}
                    {log.aliquotsTaken && <span style={{ marginLeft: 8 }}>({log.aliquotsTaken} ống)</span>}
                    {log.purpose && <div style={{ fontSize: 12, color: '#666' }}>Mục đích: {log.purpose}</div>}
                    {log.result && <div style={{ fontSize: 12 }}>Kết quả: {log.result}</div>}
                    {log.notes && <div style={{ fontSize: 12, color: '#999' }}>{log.notes}</div>}
                  </div>
                ),
              }))} />
            )},
          ]} />
        )}
      </Modal>

      {/* Retrieve Aliquot Modal */}
      <Modal title="Lấy mẫu từ kho" open={retrieveModalOpen} onOk={handleRetrieve} onCancel={() => setRetrieveModalOpen(false)} destroyOnHidden>
        <Form form={retrieveForm} layout="vertical">
          <Form.Item name="aliquotCount" label={`Số ống lấy (còn ${selectedStock?.remainingAliquots || 0} ống)`} rules={[{ required: true }]}>
            <InputNumber min={1} max={selectedStock?.remainingAliquots || 1} defaultValue={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="purpose" label="Mục đích" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Xét nghiệm lâm sàng', label: 'Xét nghiệm lâm sàng' },
              { value: 'QC nội kiểm', label: 'QC nội kiểm' },
              { value: 'Nghiên cứu', label: 'Nghiên cứu' },
              { value: 'Cấy chuyền', label: 'Cấy chuyền' },
              { value: 'Ngoại kiểm', label: 'Ngoại kiểm' },
              { value: 'Khác', label: 'Khác' },
            ]} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Viability Check Modal */}
      <Modal title="Kiểm tra sống (Viability Check)" open={viabilityModalOpen} onOk={handleViabilityCheck} onCancel={() => setViabilityModalOpen(false)} destroyOnHidden>
        <Form form={viabilityForm} layout="vertical">
          <Form.Item name="isViable" label="Kết quả" rules={[{ required: true }]}>
            <Select options={[
              { value: true, label: 'Viable (sống)' },
              { value: false, label: 'Not viable (không sống)' },
            ]} />
          </Form.Item>
          <Form.Item name="method" label="Phương pháp kiểm tra">
            <Select options={[
              { value: 'subculture', label: 'Cấy lại trên đĩa' },
              { value: 'staining', label: 'Nhuộm sống/chết' },
              { value: 'molecular', label: 'PCR / Phân tử' },
            ]} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Subculture Modal */}
      <Modal title={`Cấy chuyền từ ${selectedStock?.stockCode} (P${selectedStock?.passageNumber})`} open={subcultureModalOpen} onOk={handleSubculture} onCancel={() => setSubcultureModalOpen(false)} destroyOnHidden>
        <Form form={subcultureForm} layout="vertical">
          <Alert title={`Passage mới: P${(selectedStock?.passageNumber || 0) + 1}`} type="info" showIcon style={{ marginBottom: 16 }} />
          <Form.Item name="newAliquotCount" label="Số ống mới" rules={[{ required: true }]}>
            <InputNumber min={1} max={50} defaultValue={1} style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="freezerCode" label="Tủ lạnh"><Input placeholder={selectedStock?.freezerCode || 'TL-01'} /></Form.Item></Col>
            <Col span={6}><Form.Item name="rackCode" label="Rack"><Input placeholder={selectedStock?.rackCode || 'R1'} /></Form.Item></Col>
            <Col span={6}><Form.Item name="boxCode" label="Hộp"><Input placeholder={selectedStock?.boxCode || 'B1'} /></Form.Item></Col>
            <Col span={6}><Form.Item name="position" label="Vị trí"><Input placeholder="A2" /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
};

export default CultureCollection;
