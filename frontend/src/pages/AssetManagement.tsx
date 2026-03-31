import { useState, useEffect, useCallback } from 'react';
import {
  Card, Tabs, Table, Button, Space, Modal, Form, Input, InputNumber, Select,
  DatePicker, Tag, Statistic, Row, Col, message, Spin, Popconfirm, Tooltip,
  Segmented,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, QrcodeOutlined, CheckOutlined,
  DeleteOutlined, TrophyOutlined, FileTextOutlined, BarChartOutlined,
  SwapOutlined, StopOutlined, PrinterOutlined, EyeOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  getTenders, saveTender, getTenderItems, saveTenderItem, awardTender,
  getAssets, saveAsset, generateQrCode, getHandovers, saveHandover, confirmHandover,
  getDisposals, proposeDisposal, approveDisposal, completeDisposal,
  calculateDepreciation, getDepreciationReport, getAssetDashboard,
  getAssetReportTypes, generateAssetReport, getAssetQrCode,
  type TenderDto, type TenderItemDto, type FixedAssetDto, type AssetHandoverDto,
  type AssetDisposalDto, type DepreciationReportDto, type AssetDashboardDto,
  type AssetReportTypeDto, type AssetQrCodeDto,
} from '../api/assetManagement';

const { Option } = Select;

const TENDER_TYPE: Record<number, string> = { 1: 'Đấu thầu rộng rãi', 2: 'Đấu thầu hạn chế', 3: 'Mua sắm trực tiếp' };
const TENDER_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: 'Nhập', color: 'default' }, 2: { text: 'Đã đăng', color: 'blue' },
  3: { text: 'Đang chấm', color: 'orange' }, 4: { text: 'Đã trao', color: 'green' }, 5: { text: 'Hủy', color: 'red' },
};
const ASSET_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: 'Đang dùng', color: 'green' }, 2: { text: 'Hỏng', color: 'red' },
  3: { text: 'Đang sửa', color: 'orange' }, 4: { text: 'Chờ thanh lý', color: 'volcano' },
  5: { text: 'Đã thanh lý', color: 'default' }, 6: { text: 'Đã chuyển', color: 'purple' },
};
const HANDOVER_TYPE: Record<number, string> = { 1: 'Tiếp nhận', 2: 'Điều chuyển', 3: 'Mượn', 4: 'Trả' };
const DISPOSAL_TYPE: Record<number, string> = { 1: 'Thanh lý', 2: 'Đấu giá', 3: 'Xoá sổ' };
const DISPOSAL_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: 'Đề xuất', color: 'blue' }, 2: { text: 'Duyệt', color: 'orange' },
  3: { text: 'Hoàn thành', color: 'green' }, 4: { text: 'Từ chối', color: 'red' },
};
const PIE_COLORS = ['#52c41a', '#ff4d4f', '#faad14', '#ff7a45', '#bfbfbf', '#722ed1'];
const formatVND = (v: number) => `${(v / 1_000_000).toFixed(1)}M`;

// ============ ASSETS TAB ============
const AssetsTab = () => {
  const [data, setData] = useState<FixedAssetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<AssetQrCodeDto | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAssets({ keyword: keyword || undefined, status: statusFilter, pageIndex: page, pageSize: 15 });
      setData(res.items); setTotal(res.totalCount);
    } finally { setLoading(false); }
  }, [keyword, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (values.purchaseDate) values.purchaseDate = values.purchaseDate.toISOString();
      await saveAsset(values);
      message.success('Lưu thành công');
      setModalOpen(false); form.resetFields(); fetchData();
    } catch { /* validation */ }
  };

  const handleQr = async (id: string) => {
    await generateQrCode(id);
    message.success('Đã tạo QR code'); fetchData();
  };

  const handleViewQr = async (id: string) => {
    const data = await getAssetQrCode(id);
    if (data) { setQrData(data); setQrModalOpen(true); }
    else { message.warning('Không lấy được dữ liệu QR'); }
  };

  const columns: ColumnsType<FixedAssetDto> = [
    { title: 'Mã TS', dataIndex: 'assetCode', width: 120 },
    { title: 'Tên tài sản', dataIndex: 'assetName', ellipsis: true },
    { title: 'Khoa/Phòng', dataIndex: 'departmentName', width: 150 },
    { title: 'Nguyên giá', dataIndex: 'originalValue', width: 130, render: (v: number) => v?.toLocaleString('vi-VN') },
    { title: 'Giá trị còn lại', dataIndex: 'currentValue', width: 130, render: (v: number) => v?.toLocaleString('vi-VN') },
    { title: 'KH/tháng', dataIndex: 'monthlyDepreciation', width: 110, render: (v: number) => v?.toLocaleString('vi-VN') },
    { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (s: number) => <Tag color={ASSET_STATUS[s]?.color}>{ASSET_STATUS[s]?.text}</Tag> },
    {
      title: '', width: 110, render: (_: unknown, r: FixedAssetDto) => (
        <Space size={4}>
          <Tooltip title="Tạo QR"><Button size="small" icon={<QrcodeOutlined />} onClick={() => handleQr(r.id)} /></Tooltip>
          <Tooltip title="Xem QR"><Button size="small" icon={<EyeOutlined />} onClick={() => handleViewQr(r.id)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search placeholder="Tìm kiếm..." allowClear onSearch={v => { setKeyword(v); setPage(0); }} style={{ width: 250 }} />
        <Select placeholder="Trang thai" allowClear style={{ width: 150 }} onChange={v => { setStatusFilter(v); setPage(0); }}>
          {Object.entries(ASSET_STATUS).map(([k, v]) => <Option key={k} value={Number(k)}>{v.text}</Option>)}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Thêm tài sản</Button>
      </Space>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small"
        pagination={{ current: page + 1, pageSize: 15, total, onChange: p => setPage(p - 1), showSizeChanger: false }} />
      <Modal title="Tài sản cố định" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={640} destroyOnHidden>
        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={12}><Form.Item name="assetCode" label="Mã tài sản" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="assetName" label="Tên tài sản" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="originalValue" label="Nguyên giá"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="usefulLifeMonths" label="Thời gian SD (tháng)"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
            <Col span={8}><Form.Item name="depreciationMethod" label="PP khấu hao" initialValue={1}>
              <Select><Option value={1}>Đường thẳng</Option><Option value={2}>Giảm dần</Option></Select>
            </Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="purchaseDate" label="Ngày mua"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="serialNumber" label="Số serial"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="status" label="Trạng thái" initialValue={1}>
              <Select>{Object.entries(ASSET_STATUS).map(([k, v]) => <Option key={k} value={Number(k)}>{v.text}</Option>)}</Select>
            </Form.Item></Col>
            <Col span={12}><Form.Item name="locationDescription" label="Vị trí"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Thông tin QR Code tài sản" open={qrModalOpen} onCancel={() => setQrModalOpen(false)} footer={[
        <Button key="print" icon={<PrinterOutlined />} onClick={() => {
          const w = window.open('', '_blank');
          if (w && qrData) {
            w.document.write(`<html><head><meta charset="utf-8"/><style>body{font-family:Arial;text-align:center;padding:40px} .qr-box{border:3px solid #333;padding:20px;display:inline-block;margin:20px} .code{font-size:36px;font-weight:bold;letter-spacing:4px;margin:12px 0} table{margin:12px auto;text-align:left} td{padding:4px 12px} @media print{body{margin:0}}</style></head><body><div class="qr-box"><div class="code">${qrData.assetCode}</div><div style="font-size:14px">${qrData.assetName}</div><hr/><table><tr><td><strong>Khoa/Phong:</strong></td><td>${qrData.departmentName || ''}</td></tr><tr><td><strong>Nguyen gia:</strong></td><td>${qrData.originalValue?.toLocaleString('vi-VN')} VND</td></tr><tr><td><strong>Serial:</strong></td><td>${qrData.serialNumber || ''}</td></tr><tr><td><strong>Vi tri:</strong></td><td>${qrData.locationDescription || ''}</td></tr></table><div style="font-size:10px;margin-top:8px;color:#666">QR: ${qrData.qrContent}</div></div></body></html>`);
            w.document.close();
            w.print();
          }
        }}>In nhãn</Button>,
        <Button key="close" onClick={() => setQrModalOpen(false)}>Đóng</Button>,
      ]} width={480}>
        {qrData && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ border: '2px solid #333', padding: 16, display: 'inline-block', borderRadius: 8, margin: '12px 0' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 3, marginBottom: 8 }}>{qrData.assetCode}</div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>{qrData.assetName}</div>
            </div>
            <div style={{ textAlign: 'left', marginTop: 12 }}>
              <Row gutter={[8, 4]}>
                <Col span={8}><strong>Khoa/Phong:</strong></Col><Col span={16}>{qrData.departmentName || '-'}</Col>
                <Col span={8}><strong>Nguyen gia:</strong></Col><Col span={16}>{qrData.originalValue?.toLocaleString('vi-VN')} VND</Col>
                <Col span={8}><strong>Serial:</strong></Col><Col span={16}>{qrData.serialNumber || '-'}</Col>
                <Col span={8}><strong>Vi tri:</strong></Col><Col span={16}>{qrData.locationDescription || '-'}</Col>
              </Row>
            </div>
            <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 11, wordBreak: 'break-all' }}>
              <strong>QR Content:</strong> {qrData.qrContent}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

// ============ TENDERS TAB ============
const TendersTab = () => {
  const [data, setData] = useState<TenderDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [itemsModal, setItemsModal] = useState<string | null>(null);
  const [items, setItems] = useState<TenderItemDto[]>([]);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTenders({ pageIndex: page, pageSize: 15 });
      setData(res.items); setTotal(res.totalCount);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (values.publishDate) values.publishDate = values.publishDate.toISOString();
      if (values.closingDate) values.closingDate = values.closingDate.toISOString();
      await saveTender(values);
      message.success('Lưu thành công');
      setModalOpen(false); form.resetFields(); fetchData();
    } catch { /* validation */ }
  };

  const handleAward = async (id: string) => {
    try {
      await awardTender({ tenderId: id, winnerSupplierId: '00000000-0000-0000-0000-000000000000' });
      message.success('Đã trao thầu'); fetchData();
    } catch { message.warning('Không thể trao thầu'); }
  };

  const openItems = async (tenderId: string) => {
    setItemsModal(tenderId);
    const res = await getTenderItems(tenderId);
    setItems(res);
  };

  const handleSaveItem = async () => {
    try {
      const values = await itemForm.validateFields();
      values.tenderId = itemsModal;
      await saveTenderItem(values);
      message.success('Thêm hạng mục thành công');
      itemForm.resetFields();
      if (itemsModal) openItems(itemsModal);
    } catch { /* validation */ }
  };

  const columns: ColumnsType<TenderDto> = [
    { title: 'Ma', dataIndex: 'tenderCode', width: 120 },
    { title: 'Tên gói thầu', dataIndex: 'tenderName', ellipsis: true },
    { title: 'Loai', dataIndex: 'tenderType', width: 150, render: (v: number) => TENDER_TYPE[v] },
    { title: 'Ngân sách', dataIndex: 'budgetAmount', width: 130, render: (v: number) => v?.toLocaleString('vi-VN') },
    { title: 'Trạng thái', dataIndex: 'status', width: 110, render: (s: number) => <Tag color={TENDER_STATUS[s]?.color}>{TENDER_STATUS[s]?.text}</Tag> },
    { title: 'Hạng mục', dataIndex: 'itemCount', width: 90, align: 'center' },
    {
      title: '', width: 120, render: (_: unknown, r: TenderDto) => (
        <Space size={4}>
          <Tooltip title="Hạng mục"><Button size="small" icon={<FileTextOutlined />} onClick={() => openItems(r.id)} /></Tooltip>
          {r.status < 4 && <Tooltip title="Trao thầu"><Popconfirm title="Xác nhận trao thầu?" onConfirm={() => handleAward(r.id)}><Button size="small" icon={<TrophyOutlined />} /></Popconfirm></Tooltip>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Thêm gói thầu</Button>
      </Space>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small"
        pagination={{ current: page + 1, pageSize: 15, total, onChange: p => setPage(p - 1), showSizeChanger: false }} />
      <Modal title="Gói thầu" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={600} destroyOnHidden>
        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={12}><Form.Item name="tenderCode" label="Mã gói thầu" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="tenderName" label="Tên gói thầu" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="tenderType" label="Loai" initialValue={1}>
              <Select>{Object.entries(TENDER_TYPE).map(([k, v]) => <Option key={k} value={Number(k)}>{v}</Option>)}</Select>
            </Form.Item></Col>
            <Col span={8}><Form.Item name="budgetAmount" label="Ngân sách"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="status" label="Trạng thái" initialValue={1}>
              <Select>{Object.entries(TENDER_STATUS).map(([k, v]) => <Option key={k} value={Number(k)}>{v.text}</Option>)}</Select>
            </Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="publishDate" label="Ngày đăng"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="closingDate" label="Ngày đóng"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Hạng mục gói thầu" open={!!itemsModal} onCancel={() => setItemsModal(null)} footer={null} width={700}>
        <Table dataSource={items} rowKey="id" size="small" pagination={false}
          columns={[
            { title: 'Ten', dataIndex: 'itemName' },
            { title: 'Loai', dataIndex: 'itemType', width: 100, render: (v: number) => v === 1 ? 'TSCD' : v === 2 ? 'CCDC' : 'VT' },
            { title: 'SL', dataIndex: 'quantity', width: 60 },
            { title: 'Đơn giá', dataIndex: 'unitPrice', width: 120, render: (v: number) => v?.toLocaleString('vi-VN') },
          ]} />
        <Card size="small" style={{ marginTop: 12 }} title="Them hang muc">
          <Form form={itemForm} layout="inline" size="small" onFinish={handleSaveItem}>
            <Form.Item name="itemName" rules={[{ required: true }]}><Input placeholder="Ten" /></Form.Item>
            <Form.Item name="itemType" initialValue={1}><Select style={{ width: 100 }}><Option value={1}>TSCD</Option><Option value={2}>CCDC</Option><Option value={3}>VT</Option></Select></Form.Item>
            <Form.Item name="quantity"><InputNumber placeholder="SL" min={1} /></Form.Item>
            <Form.Item name="unitPrice"><InputNumber placeholder="Đơn giá" min={0} /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Them</Button></Form.Item>
          </Form>
        </Card>
      </Modal>
    </>
  );
};

// ============ HANDOVERS TAB ============
const HandoversTab = () => {
  const [data, setData] = useState<AssetHandoverDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHandovers({ pageIndex: page, pageSize: 15 });
      setData(res.items); setTotal(res.totalCount);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (values.handoverDate) values.handoverDate = values.handoverDate.toISOString();
      await saveHandover(values);
      message.success('Lưu thành công');
      setModalOpen(false); form.resetFields(); fetchData();
    } catch { /* validation */ }
  };

  const handleConfirm = async (id: string) => {
    await confirmHandover(id);
    message.success('Đã xác nhận'); fetchData();
  };

  const columns: ColumnsType<AssetHandoverDto> = [
    { title: 'Tài sản', dataIndex: 'assetName', ellipsis: true },
    { title: 'Mã TS', dataIndex: 'assetCode', width: 110 },
    { title: 'Loai', dataIndex: 'handoverType', width: 110, render: (v: number) => HANDOVER_TYPE[v] },
    { title: 'Từ khoa', dataIndex: 'fromDepartmentName', width: 150 },
    { title: 'Đến khoa', dataIndex: 'toDepartmentName', width: 150 },
    { title: 'Ngày BG', dataIndex: 'handoverDate', width: 110, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'TT', dataIndex: 'status', width: 100, render: (s: number) => <Tag color={s === 2 ? 'green' : 'blue'}>{s === 2 ? 'Xac nhan' : 'Cho'}</Tag> },
    {
      title: '', width: 80, render: (_: unknown, r: AssetHandoverDto) => r.status === 1 ? (
        <Popconfirm title="Xác nhận bàn giao?" onConfirm={() => handleConfirm(r.id)}>
          <Button size="small" type="primary" icon={<CheckOutlined />} />
        </Popconfirm>
      ) : null,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        <Button type="primary" icon={<SwapOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Tạo bàn giao</Button>
      </Space>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small"
        pagination={{ current: page + 1, pageSize: 15, total, onChange: p => setPage(p - 1), showSizeChanger: false }} />
      <Modal title="Bàn giao tài sản" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="fixedAssetId" label="ID tài sản" rules={[{ required: true }]}><Input placeholder="ID tài sản" /></Form.Item>
          <Form.Item name="handoverType" label="Loại bàn giao" initialValue={1}>
            <Select>{Object.entries(HANDOVER_TYPE).map(([k, v]) => <Option key={k} value={Number(k)}>{v}</Option>)}</Select>
          </Form.Item>
          <Form.Item name="handoverDate" label="Ngày bàn giao"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ============ DISPOSALS TAB ============
const DisposalsTab = () => {
  const [data, setData] = useState<AssetDisposalDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDisposals({ pageIndex: page, pageSize: 15 });
      setData(res.items); setTotal(res.totalCount);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePropose = async () => {
    try {
      const values = await form.validateFields();
      await proposeDisposal(values);
      message.success('Đã đề xuất thanh lý');
      setModalOpen(false); form.resetFields(); fetchData();
    } catch { /* validation */ }
  };

  const handleApprove = async (id: string) => { await approveDisposal(id); message.success('Đã duyệt'); fetchData(); };
  const handleComplete = async (id: string) => { await completeDisposal(id); message.success('Đã hoàn thành'); fetchData(); };

  const columns: ColumnsType<AssetDisposalDto> = [
    { title: 'Mã TS', dataIndex: 'assetCode', width: 110 },
    { title: 'Tên tài sản', dataIndex: 'assetName', ellipsis: true },
    { title: 'Loai', dataIndex: 'disposalType', width: 100, render: (v: number) => DISPOSAL_TYPE[v] },
    { title: 'Nguyên giá', dataIndex: 'originalValue', width: 120, render: (v: number) => v?.toLocaleString('vi-VN') },
    { title: 'Giá thanh lý', dataIndex: 'disposalValue', width: 120, render: (v: number) => v?.toLocaleString('vi-VN') },
    { title: 'Giá trị còn lại', dataIndex: 'residualValue', width: 120, render: (v: number) => v?.toLocaleString('vi-VN') },
    { title: 'TT', dataIndex: 'status', width: 110, render: (s: number) => <Tag color={DISPOSAL_STATUS[s]?.color}>{DISPOSAL_STATUS[s]?.text}</Tag> },
    {
      title: '', width: 100, render: (_: unknown, r: AssetDisposalDto) => (
        <Space size={4}>
          {r.status === 1 && <Popconfirm title="Duyệt thanh lý?" onConfirm={() => handleApprove(r.id)}><Button size="small" icon={<CheckOutlined />} /></Popconfirm>}
          {r.status === 2 && <Popconfirm title="Hoàn thành?" onConfirm={() => handleComplete(r.id)}><Button size="small" type="primary" icon={<CheckOutlined />} /></Popconfirm>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        <Button type="primary" icon={<DeleteOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Đề xuất thanh lý</Button>
      </Space>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small"
        pagination={{ current: page + 1, pageSize: 15, total, onChange: p => setPage(p - 1), showSizeChanger: false }} />
      <Modal title="Đề xuất thanh lý" open={modalOpen} onOk={handlePropose} onCancel={() => setModalOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="fixedAssetId" label="ID tài sản" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="disposalType" label="Loại thanh lý" initialValue={1}>
            <Select>{Object.entries(DISPOSAL_TYPE).map(([k, v]) => <Option key={k} value={Number(k)}>{v}</Option>)}</Select>
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="disposalValue" label="Giá thanh lý"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={12}><Form.Item name="residualValue" label="Giá trị còn lại"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          </Row>
          <Form.Item name="reason" label="Lý do"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ============ DEPRECIATION TAB ============
const DepreciationTab = () => {
  const [data, setData] = useState<DepreciationReportDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDepreciationReport({ month, year, pageIndex: page, pageSize: 20 });
      setData(res.items); setTotal(res.totalCount);
    } finally { setLoading(false); }
  }, [month, year, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCalculate = async () => {
    try {
      const res = await calculateDepreciation(month, year);
      message.success(`Tính khấu hao: ${res.processedCount} tài sản`);
      fetchData();
    } catch { message.warning('Lỗi tính khấu hao'); }
  };

  const columns: ColumnsType<DepreciationReportDto> = [
    { title: 'Mã TS', dataIndex: 'assetCode', width: 120 },
    { title: 'Tên tài sản', dataIndex: 'assetName', ellipsis: true },
    { title: 'Thang', dataIndex: 'month', width: 70, render: (m: number, r: DepreciationReportDto) => `${m}/${r.year}` },
    { title: 'Giá trị đầu kỳ', dataIndex: 'openingValue', width: 140, render: (v: number) => v?.toLocaleString('vi-VN') },
    { title: 'Khấu hao', dataIndex: 'depreciationAmount', width: 130, render: (v: number) => <span style={{ color: '#ff4d4f' }}>{v?.toLocaleString('vi-VN')}</span> },
    { title: 'Giá trị cuối kỳ', dataIndex: 'closingValue', width: 140, render: (v: number) => v?.toLocaleString('vi-VN') },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Select value={month} onChange={setMonth} style={{ width: 100 }}>
          {Array.from({ length: 12 }, (_, i) => <Option key={i + 1} value={i + 1}>Thang {i + 1}</Option>)}
        </Select>
        <InputNumber value={year} onChange={v => setYear(v || dayjs().year())} min={2020} max={2030} />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        <Button type="primary" icon={<BarChartOutlined />} onClick={handleCalculate}>Tính khấu hao thang {month}/{year}</Button>
      </Space>
      <Table dataSource={data} columns={columns} rowKey={r => `${r.fixedAssetId}-${r.month}-${r.year}`} loading={loading} size="small"
        pagination={{ current: page + 1, pageSize: 20, total, onChange: p => setPage(p - 1), showSizeChanger: false }} />
    </>
  );
};

// ============ DASHBOARD TAB ============
const DashboardTab = () => {
  const [dashboard, setDashboard] = useState<AssetDashboardDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartView, setChartView] = useState<string>('status');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setDashboard(await getAssetDashboard()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !dashboard) return <Spin />;

  return (
    <>
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Tổng tài sản" value={dashboard.totalAssets} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Tổng nguyên giá" value={dashboard.totalOriginalValue} formatter={v => formatVND(Number(v))} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Giá trị còn lại" value={dashboard.totalCurrentValue} formatter={v => formatVND(Number(v))} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="KH/tháng" value={dashboard.monthlyDepreciationTotal} formatter={v => formatVND(Number(v))} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Đang dùng" value={dashboard.inUseCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Hỏng" value={dashboard.brokenCount} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Đang sửa" value={dashboard.underRepairCount} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Chờ thanh lý" value={dashboard.pendingDisposalCount} valueStyle={{ color: '#ff7a45' }} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="BG chờ duyệt" value={dashboard.pendingHandovers} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Gói thầu" value={dashboard.activeTenders} /></Card></Col>
      </Row>
      <Card size="small" style={{ marginTop: 12 }}>
        <Segmented options={[{ label: 'Theo trạng thái', value: 'status' }, { label: 'Xu hướng KH', value: 'trend' }]} value={chartView} onChange={v => setChartView(String(v))} style={{ marginBottom: 12 }} />
        <div style={{ height: 300 }}>
          {chartView === 'status' ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={dashboard.statusBreakdown}
                  dataKey="count"
                  nameKey="statusName"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${String(name ?? '')}: ${Number(value ?? 0)}`}
                >
                  {dashboard.statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer>
              <BarChart data={dashboard.depreciationTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={(m: number, i: number) => `T${m}/${dashboard.depreciationTrends[i]?.year}`} />
                <YAxis tickFormatter={(v: number) => formatVND(v)} />
                <RTooltip formatter={(value) => Number(value ?? 0).toLocaleString('vi-VN')} />
                <Bar dataKey="amount" fill="#ff4d4f" name="Khấu hao" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </>
  );
};

// ============ REPORTS TAB ============
const REPORT_CATEGORIES: Record<string, string> = {
  'Sổ sách': 'blue', 'Biên bản': 'green', 'Khấu hao': 'orange',
  'Kê khai': 'purple', 'Tổng hợp': 'cyan', 'Công khai': 'magenta',
};

const ReportsTab = () => {
  const [reportTypes, setReportTypes] = useState<AssetReportTypeDto[]>([]);
  const [selectedReport, setSelectedReport] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState<number | undefined>();
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [assetGroupCode, setAssetGroupCode] = useState<string | undefined>();

  useEffect(() => {
    getAssetReportTypes().then(setReportTypes);
  }, []);

  const handleGenerate = async () => {
    if (!selectedReport) { message.warning('Vui lòng chọn loại báo cáo'); return; }
    setLoading(true);
    try {
      await generateAssetReport(selectedReport, {
        year, month, fromDate, toDate, assetGroupCode,
      });
    } catch { message.warning('Lỗi xuất báo cáo'); }
    finally { setLoading(false); }
  };

  const grouped = reportTypes.reduce<Record<string, AssetReportTypeDto[]>>((acc, rt) => {
    if (!acc[rt.category]) acc[rt.category] = [];
    acc[rt.category].push(rt);
    return acc;
  }, {});

  return (
    <>
      <Card size="small" style={{ marginBottom: 12 }} title="Bộ lọc báo cáo">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Select
              placeholder="Chọn loại báo cáo"
              value={selectedReport}
              onChange={setSelectedReport}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {Object.entries(grouped).map(([cat, items]) => (
                <Select.OptGroup key={cat} label={cat}>
                  {items.map(rt => (
                    <Option key={rt.code} value={rt.code}>
                      {rt.code}. {rt.name}
                    </Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={3}>
            <InputNumber placeholder="Nam" value={year} onChange={v => setYear(v || dayjs().year())} min={2020} max={2030} style={{ width: '100%' }} />
          </Col>
          <Col xs={12} md={3}>
            <Select placeholder="Thang" allowClear value={month} onChange={setMonth} style={{ width: '100%' }}>
              {Array.from({ length: 12 }, (_, i) => <Option key={i + 1} value={i + 1}>Thang {i + 1}</Option>)}
            </Select>
          </Col>
          <Col xs={12} md={3}>
            <DatePicker placeholder="Tu ngay" onChange={(_, ds) => setFromDate(typeof ds === 'string' ? ds : undefined)} style={{ width: '100%' }} />
          </Col>
          <Col xs={12} md={3}>
            <DatePicker placeholder="Den ngay" onChange={(_, ds) => setToDate(typeof ds === 'string' ? ds : undefined)} style={{ width: '100%' }} />
          </Col>
          <Col xs={24} md={4}>
            <Space>
              <Input placeholder="Nhóm TS" value={assetGroupCode} onChange={e => setAssetGroupCode(e.target.value || undefined)} style={{ width: 120 }} />
              <Button type="primary" icon={<PrinterOutlined />} onClick={handleGenerate} loading={loading}>
                Xuất báo cáo
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Row gutter={[12, 12]}>
        {Object.entries(grouped).map(([cat, items]) => (
          <Col xs={24} md={12} lg={8} key={cat}>
            <Card size="small" title={<Tag color={REPORT_CATEGORIES[cat] || 'default'}>{cat}</Tag>} style={{ height: '100%' }}>
              {items.map(rt => (
                <div key={rt.code} style={{ padding: '4px 0', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                  onClick={() => { setSelectedReport(rt.code); handleGenerate(); }}>
                  <Tooltip title={rt.description}>
                    <Button type="link" size="small" icon={<FileTextOutlined />} style={{ padding: 0 }}>
                      {rt.code}. {rt.name}
                    </Button>
                  </Tooltip>
                </div>
              ))}
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};

// ============ MAIN PAGE ============
const AssetManagement = () => {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>
        <StopOutlined style={{ marginRight: 8 }} />
        Quản lý Tài sản - CCDC
      </h2>
      <Tabs
        defaultActiveKey="assets"
        items={[
          { key: 'assets', label: 'Tài sản', children: <AssetsTab /> },
          { key: 'tenders', label: 'Đấu thầu', children: <TendersTab /> },
          { key: 'handovers', label: 'Bàn giao', children: <HandoversTab /> },
          { key: 'disposals', label: 'Thanh lý', children: <DisposalsTab /> },
          { key: 'depreciation', label: 'Khấu hao', children: <DepreciationTab /> },
          { key: 'reports', label: 'Báo cáo TSCD', children: <ReportsTab /> },
          { key: 'dashboard', label: 'Dashboard', children: <DashboardTab /> },
        ]}
      />
    </div>
  );
};

export default AssetManagement;
