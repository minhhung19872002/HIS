/**
 * Sổ biên lai khai báo — N1.13.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Space, message, Popconfirm, Tag,
  Row, Col, Progress,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, BookOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import systemApi from '../api/system';

interface ReceiptBook {
  id: string; bookCode: string; bookName: string;
  receiptType: number; series?: string; templateCode?: string;
  startNumber: number; endNumber: number; currentNumber: number;
  remaining: number; used: number;
  fiscalYear: number; issueDate: string;
  registeredDate?: string; registrationNumber?: string;
  status: number; closedDate?: string; closedReason?: string;
  departmentId?: string; departmentName?: string; cashierId?: string;
  notes?: string; isActive: boolean;
}

const RECEIPT_TYPE_OPTIONS = [
  { label: 'Biên lai thu tiền', value: 1 },
  { label: 'Biên lai hoàn trả', value: 2 },
  { label: 'HĐĐT sự nghiệp', value: 3 },
  { label: 'HĐĐT dịch vụ', value: 4 },
  { label: 'Biên lai khác', value: 5 },
];

const STATUS_TAGS: Record<number, { color: string; label: string }> = {
  0: { color: 'default', label: 'Đã khai' },
  1: { color: 'green', label: 'Đang dùng' },
  2: { color: 'blue', label: 'Đã đóng' },
  3: { color: 'red', label: 'Mất/Hủy' },
};

export default function ReceiptBookAdmin() {
  const [data, setData] = useState<ReceiptBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<number | undefined>();
  const [filterYear, setFilterYear] = useState<number | undefined>();
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReceiptBook | null>(null);
  const [closeOpen, setCloseOpen] = useState<ReceiptBook | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [closeForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (keyword) params.keyword = keyword;
      if (filterType) params.receiptType = filterType;
      if (filterStatus != null) params.status = filterStatus;
      if (filterYear) params.fiscalYear = filterYear;
      const { data } = await apiClient.get<ReceiptBook[]>('/receipt-book', { params });
      setData(data || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải danh sách thất bại');
    } finally { setLoading(false); }
  }, [keyword, filterType, filterStatus, filterYear]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const d = await systemApi.catalog.getDepartments();
        setDepartments((d as any)?.data || []);
      } catch { /* empty */ }
    })();
  }, []);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      fiscalYear: dayjs().year(),
      issueDate: dayjs(),
      status: 0,
      receiptType: 1,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (row: ReceiptBook) => {
    setEditing(row);
    form.setFieldsValue({
      ...row,
      issueDate: row.issueDate ? dayjs(row.issueDate) : undefined,
      registeredDate: row.registeredDate ? dayjs(row.registeredDate) : undefined,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload = {
      ...(editing ?? {}),
      ...v,
      issueDate: v.issueDate?.toISOString?.() ?? v.issueDate,
      registeredDate: v.registeredDate?.toISOString?.() ?? v.registeredDate,
    };
    try {
      await apiClient.post('/receipt-book', payload);
      message.success(editing ? 'Đã cập nhật' : 'Đã thêm');
      setModalOpen(false);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Lưu thất bại');
    }
  };

  const activate = async (row: ReceiptBook) => {
    try {
      await apiClient.post(`/receipt-book/${row.id}/activate`);
      message.success('Đã kích hoạt sổ');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Thất bại');
    }
  };

  const doClose = async () => {
    if (!closeOpen) return;
    const v = await closeForm.validateFields();
    try {
      await apiClient.post(`/receipt-book/${closeOpen.id}/close`, v);
      message.success('Đã đóng sổ');
      setCloseOpen(null);
      closeForm.resetFields();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Đóng sổ thất bại');
    }
  };

  const remove = async (row: ReceiptBook) => {
    try {
      await apiClient.delete(`/receipt-book/${row.id}`);
      message.success('Đã xóa');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Xóa thất bại');
    }
  };

  const columns: any[] = [
    { title: 'Mã sổ', dataIndex: 'bookCode', width: 120 },
    { title: 'Tên', dataIndex: 'bookName' },
    { title: 'Loại', dataIndex: 'receiptType', width: 150,
      render: (v: number) => RECEIPT_TYPE_OPTIONS.find(o => o.value === v)?.label || String(v) },
    { title: 'Ký hiệu', dataIndex: 'series', width: 110 },
    { title: 'Năm', dataIndex: 'fiscalYear', width: 70 },
    { title: 'Dải số', width: 180,
      render: (_: any, r: ReceiptBook) => `${r.startNumber.toLocaleString('vi-VN')} - ${r.endNumber.toLocaleString('vi-VN')}` },
    { title: 'Đã dùng', width: 180,
      render: (_: any, r: ReceiptBook) => {
        const total = r.endNumber - r.startNumber + 1;
        const used = r.used;
        const pct = total > 0 ? Math.round(used / total * 100) : 0;
        return <Progress percent={pct} size="small" format={() => `${used}/${total}`} />;
      } },
    { title: 'Khoa', dataIndex: 'departmentName' },
    { title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: (s: number) => {
        const t = STATUS_TAGS[s] || { color: 'default', label: String(s) };
        return <Tag color={t.color}>{t.label}</Tag>;
      } },
    { title: 'Thao tác', width: 180,
      render: (_: any, r: ReceiptBook) => <Space size="small">
        <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
        {r.status === 0 && (
          <Button icon={<PlayCircleOutlined />} size="small" type="primary" onClick={() => activate(r)}>Bật</Button>
        )}
        {r.status === 1 && (
          <Button icon={<PauseCircleOutlined />} size="small" danger onClick={() => setCloseOpen(r)}>Đóng</Button>
        )}
        <Popconfirm title="Xóa sổ này?" onConfirm={() => remove(r)}>
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      </Space> },
  ];

  return (
    <div>
      <Card title={<Space><BookOutlined /> Sổ biên lai khai báo (N1.13)</Space>}
        extra={<Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Khai báo sổ mới</Button>
        </Space>}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search placeholder="Tìm mã/tên/series/VB..." value={keyword}
            onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 260 }} allowClear />
          <Select placeholder="Loại biên lai" allowClear style={{ width: 180 }}
            value={filterType} onChange={setFilterType} options={RECEIPT_TYPE_OPTIONS} />
          <Select placeholder="Trạng thái" allowClear style={{ width: 140 }}
            value={filterStatus} onChange={setFilterStatus}
            options={Object.entries(STATUS_TAGS).map(([k, v]) => ({ label: v.label, value: Number(k) }))} />
          <InputNumber placeholder="Năm TC" value={filterYear} onChange={v => setFilterYear(v ?? undefined)} />
        </Space>

        <Table size="small" rowKey="id" dataSource={data} columns={columns}
          loading={loading} pagination={{ pageSize: 20, showSizeChanger: true }} />
      </Card>

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        title={editing ? 'Sửa sổ biên lai' : 'Khai báo sổ mới'}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        width={720}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}><Form.Item label="Mã sổ" name="bookCode" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={16}><Form.Item label="Tên sổ" name="bookName" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="Loại" name="receiptType" rules={[{ required: true }]}>
              <Select options={RECEIPT_TYPE_OPTIONS} />
            </Form.Item></Col>
            <Col span={8}><Form.Item label="Ký hiệu" name="series"><Input placeholder="1C22TAA..." /></Form.Item></Col>
            <Col span={8}><Form.Item label="Mẫu số" name="templateCode"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="Số bắt đầu" name="startNumber" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item></Col>
            <Col span={8}><Form.Item label="Số kết thúc" name="endNumber" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item></Col>
            <Col span={8}><Form.Item label="Số hiện tại" name="currentNumber" tooltip="Để trống = bắt đầu">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item></Col>
            <Col span={8}><Form.Item label="Năm tài chính" name="fiscalYear" rules={[{ required: true }]}>
              <InputNumber min={2000} max={2100} style={{ width: '100%' }} />
            </Form.Item></Col>
            <Col span={8}><Form.Item label="Ngày phát hành" name="issueDate" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item></Col>
            <Col span={8}><Form.Item label="Ngày khai báo TT" name="registeredDate">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item></Col>
            <Col span={8}><Form.Item label="Số văn bản KB" name="registrationNumber"><Input /></Form.Item></Col>
            <Col span={16}><Form.Item label="Khoa" name="departmentId">
              <Select allowClear showSearch optionFilterProp="label"
                options={departments.map(d => ({ label: d.departmentName, value: d.id }))} />
            </Form.Item></Col>
            <Col span={24}><Form.Item label="Ghi chú" name="notes"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Close modal */}
      <Modal
        open={!!closeOpen}
        title={`Đóng sổ ${closeOpen?.bookCode}`}
        onCancel={() => setCloseOpen(null)}
        onOk={doClose}
        okText="Xác nhận đóng"
      >
        <Form form={closeForm} layout="vertical">
          <Form.Item label="Lý do đóng" name="reason"
            rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input.TextArea rows={3} placeholder="VD: hết năm tài chính, hết dải số..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
