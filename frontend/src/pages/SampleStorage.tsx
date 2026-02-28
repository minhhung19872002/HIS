import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Tabs,
  message, Spin, Statistic, Row, Col, Badge, Tooltip, Alert, Descriptions
} from 'antd';
import {
  DatabaseOutlined, PlusOutlined, ReloadOutlined, SearchOutlined,
  WarningOutlined, ScanOutlined, DeleteOutlined, ExportOutlined, EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SampleStorageRecord, StorageLocation, StorageAlert } from '../api/sampleStorage';
import * as storageApi from '../api/sampleStorage';
import BarcodeScanner from '../components/BarcodeScanner';

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: 'Đang lưu', color: 'blue' },
  1: { text: 'Đã lấy ra', color: 'green' },
  2: { text: 'Đã hủy', color: 'red' },
  3: { text: 'Hết hạn', color: 'orange' },
};

const conditionMap: Record<string, string> = {
  room: 'Nhiệt độ phòng',
  refrigerator: 'Tủ lạnh (2-8°C)',
  frozen: 'Đông lạnh (-20°C)',
  deepFrozen: 'Siêu đông (-80°C)',
};

const SampleStorage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stored');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SampleStorageRecord[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [alerts, setAlerts] = useState<StorageAlert[]>([]);
  const [searchText, setSearchText] = useState('');
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SampleStorageRecord | null>(null);
  const [storeForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsRes, locationsRes, alertsRes] = await Promise.allSettled([
        storageApi.getSampleStorageRecords({ keyword: searchText || undefined }),
        storageApi.getStorageLocations(),
        storageApi.getStorageAlerts(),
      ]);
      if (recordsRes.status === 'fulfilled') setRecords(Array.isArray(recordsRes.value) ? recordsRes.value : []);
      if (locationsRes.status === 'fulfilled') setLocations(Array.isArray(locationsRes.value) ? locationsRes.value : []);
      if (alertsRes.status === 'fulfilled') setAlerts(Array.isArray(alertsRes.value) ? alertsRes.value : []);
    } catch {
      message.warning('Không thể tải dữ liệu lưu trữ mẫu');
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStore = async () => {
    try {
      const values = await storeForm.validateFields();
      const locationStr = [values.freezer, values.rack, values.box, values.position].filter(Boolean).join('/');
      await storageApi.storeSample({ ...values, storageLocation: locationStr });
      message.success('Lưu mẫu thành công');
      setStoreModalOpen(false);
      storeForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleRetrieve = async (record: SampleStorageRecord) => {
    Modal.confirm({
      title: 'Lấy mẫu ra',
      content: `Xác nhận lấy mẫu ${record.sampleBarcode} ra khỏi vị trí ${record.storageLocation}?`,
      onOk: async () => {
        try {
          await storageApi.retrieveSample(record.id, { reason: 'Lấy mẫu kiểm tra lại' });
          message.success('Đã lấy mẫu ra');
          fetchData();
        } catch {
          message.warning('Không thể lấy mẫu');
        }
      },
    });
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    setSearchText(code);
    try {
      const data = await storageApi.getSampleByBarcode(code);
      if (data) {
        setSelectedRecord(data);
        setDetailModalOpen(true);
      } else {
        message.info('Không tìm thấy mẫu với barcode này. Bạn có muốn lưu mẫu mới?');
        storeForm.setFieldsValue({ sampleBarcode: code });
        setStoreModalOpen(true);
      }
    } catch {
      storeForm.setFieldsValue({ sampleBarcode: code });
      setStoreModalOpen(true);
    }
  };

  const getFilteredRecords = (statusFilter: number[]) => records.filter(r => statusFilter.includes(r.status));

  const columns = [
    { title: 'Barcode', dataIndex: 'sampleBarcode', key: 'sampleBarcode', width: 120 },
    { title: 'Mã YC', dataIndex: 'requestCode', key: 'requestCode', width: 100 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 140 },
    { title: 'Loại mẫu', dataIndex: 'sampleType', key: 'sampleType', width: 90 },
    { title: 'Ống', dataIndex: 'tubeColor', key: 'tubeColor', width: 70,
      render: (v: string) => <Tag color={v === 'red' ? 'red' : v === 'purple' ? 'purple' : v === 'green' ? 'green' : v === 'blue' ? 'blue' : v === 'yellow' ? 'gold' : 'default'}>{v}</Tag> },
    { title: 'Vị trí', dataIndex: 'storageLocation', key: 'storageLocation', width: 180 },
    { title: 'Điều kiện', dataIndex: 'storageCondition', key: 'storageCondition', width: 120, render: (v: string) => conditionMap[v] || v },
    { title: 'Nhiệt độ', dataIndex: 'temperature', key: 'temperature', width: 80, render: (v: number) => v !== undefined ? `${v}°C` : '-' },
    { title: 'Ngày lưu', dataIndex: 'storedAt', key: 'storedAt', width: 120, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Hạn dùng', dataIndex: 'expiryDate', key: 'expiryDate', width: 100,
      render: (v: string, r: SampleStorageRecord) => v ? <span style={{ color: r.isExpired ? '#f5222d' : undefined }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '-' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 90,
      render: (v: number) => { const s = statusMap[v]; return <Tag color={s?.color}>{s?.text}</Tag>; } },
    {
      title: 'Thao tác', key: 'action', width: 100,
      render: (_: unknown, record: SampleStorageRecord) => (
        <Space>
          <Tooltip title="Chi tiết"><Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedRecord(record); setDetailModalOpen(true); }} /></Tooltip>
          {record.status === 0 && <Tooltip title="Lấy ra"><Button size="small" icon={<ExportOutlined />} onClick={() => handleRetrieve(record)} /></Tooltip>}
        </Space>
      ),
    },
  ];

  const storedCount = records.filter(r => r.status === 0).length;
  const expiredCount = records.filter(r => r.isExpired).length;

  const tabItems = [
    { key: 'stored', label: <span><Badge count={storedCount} size="small" offset={[8, 0]}>Đang lưu</Badge></span>,
      children: <Table columns={columns} dataSource={getFilteredRecords([0])} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'retrieved', label: 'Đã lấy ra',
      children: <Table columns={columns} dataSource={getFilteredRecords([1])} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'expired', label: <span><Badge count={expiredCount} size="small" offset={[8, 0]}><WarningOutlined /> Hết hạn</Badge></span>,
      children: <Table columns={columns} dataSource={getFilteredRecords([3])} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'all', label: 'Tất cả',
      children: <Table columns={columns} dataSource={records} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={<span><DatabaseOutlined /> Lưu trữ mẫu xét nghiệm</span>}
        extra={
          <Space>
            <Input.Search placeholder="Tìm barcode, BN..." value={searchText} onChange={e => setSearchText(e.target.value)} onSearch={fetchData} style={{ width: 220 }} allowClear />
            <Button icon={<ScanOutlined />} onClick={() => setScannerOpen(true)}>Quét QR/Barcode</Button>
            <Button icon={<PlusOutlined />} onClick={() => { storeForm.resetFields(); setStoreModalOpen(true); }}>Lưu mẫu</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          </Space>
        }
      >
        {alerts.length > 0 && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            title={`${alerts.length} cảnh báo lưu trữ`}
            description={alerts.slice(0, 3).map(a => a.message).join(' | ')} />
        )}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Statistic title="Tổng mẫu lưu" value={storedCount} prefix={<DatabaseOutlined />} /></Col>
          <Col span={6}><Statistic title="Đã lấy ra" value={records.filter(r => r.status === 1).length} styles={{ content: { color: '#52c41a' } }} /></Col>
          <Col span={6}><Statistic title="Hết hạn" value={expiredCount} styles={{ content: { color: expiredCount > 0 ? '#cf1322' : '#3f8600' } }} prefix={<WarningOutlined />} /></Col>
          <Col span={6}><Statistic title="Cảnh báo" value={alerts.length} styles={{ content: { color: alerts.length > 0 ? '#fa8c16' : '#3f8600' } }} /></Col>
        </Row>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Store Sample Modal */}
      <Modal title="Lưu mẫu xét nghiệm" open={storeModalOpen} onOk={handleStore} onCancel={() => setStoreModalOpen(false)} width={600} destroyOnHidden>
        <Form form={storeForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="sampleBarcode" label="Barcode mẫu" rules={[{ required: true }]}><Input addonBefore={<ScanOutlined />} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="storageCondition" label="Điều kiện bảo quản" rules={[{ required: true }]}>
                <Select options={Object.entries(conditionMap).map(([k, v]) => ({ value: k, label: v }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="freezer" label="Tủ/Khu" rules={[{ required: true }]}><Input placeholder="VD: Freezer-A" /></Form.Item></Col>
            <Col span={6}><Form.Item name="rack" label="Giá/Rack" rules={[{ required: true }]}><Input placeholder="VD: Rack-2" /></Form.Item></Col>
            <Col span={6}><Form.Item name="box" label="Hộp/Box" rules={[{ required: true }]}><Input placeholder="VD: Box-5" /></Form.Item></Col>
            <Col span={6}><Form.Item name="position" label="Vị trí"><Input placeholder="VD: Pos-12" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="temperature" label="Nhiệt độ (°C)"><Input type="number" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="tubeColor" label="Màu ống">
                <Select options={[
                  { value: 'red', label: 'Đỏ' }, { value: 'purple', label: 'Tím' },
                  { value: 'green', label: 'Xanh lá' }, { value: 'blue', label: 'Xanh dương' },
                  { value: 'yellow', label: 'Vàng' }, { value: 'gray', label: 'Xám' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title={`Chi tiết mẫu - ${selectedRecord?.sampleBarcode}`} open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={600}>
        {selectedRecord && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Barcode">{selectedRecord.sampleBarcode}</Descriptions.Item>
            <Descriptions.Item label="Mã YC">{selectedRecord.requestCode || '-'}</Descriptions.Item>
            <Descriptions.Item label="Bệnh nhân">{selectedRecord.patientName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Loại mẫu">{selectedRecord.sampleType}</Descriptions.Item>
            <Descriptions.Item label="Màu ống"><Tag color={selectedRecord.tubeColor}>{selectedRecord.tubeColor}</Tag></Descriptions.Item>
            <Descriptions.Item label="Điều kiện">{conditionMap[selectedRecord.storageCondition]}</Descriptions.Item>
            <Descriptions.Item label="Vị trí" span={2}>{selectedRecord.storageLocation}</Descriptions.Item>
            <Descriptions.Item label="Nhiệt độ">{selectedRecord.temperature !== undefined ? `${selectedRecord.temperature}°C` : '-'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><Tag color={statusMap[selectedRecord.status]?.color}>{statusMap[selectedRecord.status]?.text}</Tag></Descriptions.Item>
            <Descriptions.Item label="Ngày lưu">{dayjs(selectedRecord.storedAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="Người lưu">{selectedRecord.storedBy}</Descriptions.Item>
            {selectedRecord.retrievedAt && <>
              <Descriptions.Item label="Ngày lấy">{dayjs(selectedRecord.retrievedAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Người lấy">{selectedRecord.retrievedBy}</Descriptions.Item>
            </>}
            <Descriptions.Item label="Hạn dùng">{selectedRecord.expiryDate ? dayjs(selectedRecord.expiryDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú">{selectedRecord.notes || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Barcode Scanner */}
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />
    </Spin>
  );
};

export default SampleStorage;
