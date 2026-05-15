import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Button, Space, Input, Select, Tag, Drawer, Row, Col, Statistic, message, Typography
} from 'antd';
import { ReloadOutlined, PlayCircleOutlined, CheckOutlined, CloseCircleOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  linen,
  type LinenItemDto, type LinenTransactionDto, type SterilizationScheduleDto
} from '../api/nangcap23';

const { Text } = Typography;

const LinenManagement: React.FC = () => (
  <Card title="Quản lý đồ giặt vải & Tiệt trùng phòng">
    <Tabs items={[
      { key: 'items', label: 'Danh mục đồ vải', children: <ItemsTab /> },
      { key: 'tx', label: 'Giao nhận giặt', children: <TxTab /> },
      { key: 'ster', label: 'Lịch tiệt trùng', children: <SterTab /> }
    ]} />
  </Card>
);

const ItemsTab: React.FC = () => {
  const [rows, setRows] = useState<LinenItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await linen.listItems({ keyword: keyword.trim() || undefined, category })); }
    catch { message.error('Lỗi tải'); }
    finally { setLoading(false); }
  }, [keyword, category]);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng danh mục" value={rows.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Tồn dưới mức" value={rows.filter(r => r.isLowStock).length} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đang giặt" value={rows.reduce((s, r) => s + r.inCleaning, 0)} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Hư hỏng" value={rows.reduce((s, r) => s + r.damaged, 0)} /></Card></Col>
      </Row>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="Tìm mã / tên đồ vải..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 320 }} allowClear />
        <Select placeholder="Loại" value={category} onChange={setCategory} allowClear style={{ width: 200 }} options={[
          { value: 'Bedding', label: 'Ga giường' }, { value: 'Clothing', label: 'Quần áo' }, { value: 'Towel', label: 'Khăn' },
          { value: 'Drape', label: 'Khăn trải' }, { value: 'Surgical', label: 'Đồ phẫu thuật' }, { value: 'OperatingRoom', label: 'Phòng mổ' }
        ]} />
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id" dataSource={rows} loading={loading} size="small"
        columns={[
          { title: 'Mã', dataIndex: 'itemCode', width: 110 },
          { title: 'Tên đồ vải', dataIndex: 'itemName' },
          { title: 'Loại', dataIndex: 'category', width: 130 },
          { title: 'Đơn vị', dataIndex: 'unit', width: 80 },
          { title: 'Tồn sạch', dataIndex: 'currentStock', width: 90, render: (v, r) => <Text type={r.isLowStock ? 'danger' : undefined}>{v}</Text> },
          { title: 'Đang giặt', dataIndex: 'inCleaning', width: 90 },
          { title: 'Đang sửa', dataIndex: 'inRepair', width: 90 },
          { title: 'Hư hỏng', dataIndex: 'damaged', width: 90 },
          { title: 'TT', dataIndex: 'isActive', width: 100, render: (v) => v ? <Tag color="success">Hoạt động</Tag> : <Tag>Ngừng</Tag> },
        ]}
      />
    </>
  );
};

const TxTab: React.FC = () => {
  const [rows, setRows] = useState<LinenTransactionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [detail, setDetail] = useState<LinenTransactionDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await linen.searchTransactions({ transactionType: type, status, pageSize: 100 })); }
    catch { message.error('Lỗi tải'); }
    finally { setLoading(false); }
  }, [type, status]);
  useEffect(() => { load(); }, [load]);

  const advance = async (r: LinenTransactionDto, newStatus: number) => {
    try { await linen.updateTransactionStatus(r.id, newStatus); message.success('Đã cập nhật'); load(); }
    catch { message.error('Lỗi'); }
  };

  const STATUS_TAG = (s: number, name: string) => {
    const color = s === 3 ? 'success' : s === 2 ? 'blue' : s === 4 ? 'default' : 'processing';
    return <Tag color={color}>{name}</Tag>;
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng GD" value={rows.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đang ở nhà giặt" value={rows.filter(r => r.status === 1).length} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đã nhận về" value={rows.filter(r => r.status === 2).length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đã đối chiếu" value={rows.filter(r => r.status === 3).length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
      </Row>
      <Space style={{ marginBottom: 12 }}>
        <Select placeholder="Loại giao dịch" value={type} onChange={setType} allowClear style={{ width: 200 }} options={[
          { value: 'Dispatch', label: 'Gửi đi giặt' }, { value: 'Return', label: 'Nhận về' },
          { value: 'Adjust', label: 'Điều chỉnh' }, { value: 'Discard', label: 'Loại bỏ' }
        ]} />
        <Select placeholder="Trạng thái" value={status} onChange={setStatus} allowClear style={{ width: 180 }} options={[
          { value: 0, label: 'Nháp' }, { value: 1, label: 'Đã gửi' }, { value: 2, label: 'Đã nhận' },
          { value: 3, label: 'Đã đối chiếu' }, { value: 4, label: 'Đã hủy' }
        ]} />
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id" dataSource={rows} loading={loading} size="small"
        columns={[
          { title: 'Mã GD', dataIndex: 'transactionCode', width: 200 },
          { title: 'Loại', dataIndex: 'transactionType', width: 110 },
          { title: 'Ngày', dataIndex: 'transactionDate', width: 140, render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm') },
          { title: 'Từ', dataIndex: 'fromDepartmentName', width: 160, render: (v, r) => v || r.vendorName || '—' },
          { title: 'Đến', dataIndex: 'toDepartmentName', width: 160, render: (v, r) => v || r.vendorName || '—' },
          { title: 'SL/Trọng lượng', width: 130, render: (_, r) => `${r.totalItems} / ${r.totalWeightKg}kg` },
          { title: 'Trạng thái', width: 140, render: (_, r) => STATUS_TAG(r.status, r.statusName) },
          {
            title: 'Hành động', width: 200, render: (_, r) => (
              <Space size={4}>
                {r.status === 0 && <Button size="small" icon={<SendOutlined />} onClick={() => advance(r, 1)}>Gửi</Button>}
                {r.status === 1 && <Button size="small" icon={<CheckOutlined />} onClick={() => advance(r, 2)}>Nhận</Button>}
                {r.status === 2 && <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => advance(r, 3)}>Đối chiếu</Button>}
                {r.status !== 4 && <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => advance(r, 4)} />}
              </Space>
            )
          }
        ]}
        onRow={(r) => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
      />
      <Drawer open={!!detail} onClose={() => setDetail(null)} width={680} title={`Giao dịch ${detail?.transactionCode || ''}`}>
        {detail && (
          <>
            <p><b>Trạng thái:</b> {STATUS_TAG(detail.status, detail.statusName)}</p>
            <p><b>Từ:</b> {detail.fromDepartmentName || '—'}</p>
            <p><b>Đến:</b> {detail.toDepartmentName || detail.vendorName || '—'}</p>
            <p><b>Người gửi:</b> {detail.dispatcherName || '—'}</p>
            <p><b>Người nhận:</b> {detail.receiverName || '—'}</p>
            <p><b>Số mục / Trọng lượng:</b> {detail.totalItems} / {detail.totalWeightKg}kg</p>
            <p><b>Ghi chú:</b> {detail.notes || '—'}</p>
            <p><b>Chi tiết:</b></p>
            <pre style={{ fontSize: 11, padding: 12, background: '#f5f5f5', maxHeight: 200, overflow: 'auto' }}>
              {(() => { try { return JSON.stringify(JSON.parse(detail.detailsJson || '[]'), null, 2); } catch { return detail.detailsJson; } })()}
            </pre>
          </>
        )}
      </Drawer>
    </>
  );
};

const SterTab: React.FC = () => {
  const [rows, setRows] = useState<SterilizationScheduleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [areaType, setAreaType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await linen.searchSchedules({ areaType, status })); }
    catch { message.error('Lỗi tải'); }
    finally { setLoading(false); }
  }, [areaType, status]);
  useEffect(() => { load(); }, [load]);

  const advance = async (r: SterilizationScheduleDto, newStatus: number, cult?: string) => {
    try { await linen.updateScheduleStatus(r.id, newStatus, cult); message.success('Đã cập nhật'); load(); }
    catch { message.error('Lỗi'); }
  };

  const STER_TAG = (s: number, name: string) => {
    const color = s === 2 ? 'success' : s === 1 ? 'processing' : s === 3 ? 'error' : s === 4 ? 'default' : 'blue';
    return <Tag color={color}>{name}</Tag>;
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng lịch" value={rows.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đã lên lịch" value={rows.filter(r => r.status === 0).length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đang xử lý" value={rows.filter(r => r.status === 1).length} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Hoàn thành" value={rows.filter(r => r.status === 2).length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
      </Row>
      <Space style={{ marginBottom: 12 }}>
        <Select placeholder="Khu vực" value={areaType} onChange={setAreaType} allowClear style={{ width: 200 }} options={[
          { value: 'OperatingRoom', label: 'Phòng mổ' }, { value: 'ICU', label: 'ICU' },
          { value: 'Ward', label: 'Phòng bệnh' }, { value: 'Pharmacy', label: 'Khoa Dược' }, { value: 'Other', label: 'Khác' }
        ]} />
        <Select placeholder="Trạng thái" value={status} onChange={setStatus} allowClear style={{ width: 180 }} options={[
          { value: 0, label: 'Đã lên lịch' }, { value: 1, label: 'Đang xử lý' },
          { value: 2, label: 'Hoàn thành' }, { value: 3, label: 'Thất bại' }
        ]} />
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id" dataSource={rows} loading={loading} size="small"
        columns={[
          { title: 'Mã lịch', dataIndex: 'scheduleCode', width: 180 },
          { title: 'Lúc', dataIndex: 'scheduledAt', width: 140, render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm') },
          { title: 'Khu vực', render: (_, r) => `${r.areaType}${r.roomName ? ' · ' + r.roomName : ''}` },
          { title: 'PP tiệt trùng', dataIndex: 'sterilizationMethod', width: 160 },
          { title: 'Nhân viên', dataIndex: 'assignedStaff', width: 160 },
          { title: 'Cấy KQ', dataIndex: 'cultureResult', width: 100 },
          { title: 'Trạng thái', width: 140, render: (_, r) => STER_TAG(r.status, r.statusName) },
          {
            title: 'Hành động', width: 180, render: (_, r) => (
              <Space size={4}>
                {r.status === 0 && <Button size="small" icon={<PlayCircleOutlined />} onClick={() => advance(r, 1)}>Bắt đầu</Button>}
                {r.status === 1 && <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => advance(r, 2, 'Pass')}>Hoàn thành</Button>}
                {r.status === 1 && <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => advance(r, 3, 'Fail')} />}
              </Space>
            )
          }
        ]}
      />
    </>
  );
};

export default LinenManagement;
