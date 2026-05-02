import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Modal } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import systemApi from '../api/system';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, StatusBadge, ActBtn,
  Ico, tk, ti, tw, cf, type ColumnDef,
} from './_v2kit';

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

const RECEIPT_TYPES = [
  { v: '1', l: 'Biên lai thu tiền' },
  { v: '2', l: 'Biên lai hoàn trả' },
  { v: '3', l: 'HĐĐT sự nghiệp' },
  { v: '4', l: 'HĐĐT dịch vụ' },
  { v: '5', l: 'Biên lai khác' },
];

type SKey = 'declared' | 'active' | 'closed' | 'lost';
const STATUS_TABS = [
  { v: 'declared' as SKey, l: 'Đã khai',     tone: 'info' as const },
  { v: 'active' as SKey,   l: 'Đang dùng',   tone: 'ok' as const },
  { v: 'closed' as SKey,   l: 'Đã đóng',     tone: 'warn' as const },
  { v: 'lost' as SKey,     l: 'Mất/Hủy',     tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'declared' : n === 1 ? 'active' : n === 2 ? 'closed' : 'lost';

const STATUS_LABEL: Record<number, string> = { 0: 'Đã khai', 1: 'Đang dùng', 2: 'Đã đóng', 3: 'Mất/Hủy' };

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

const ReceiptBookAdminV2: React.FC = () => {
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [data, setData] = useState<ReceiptBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [fType, setFType] = useState('');
  const [fYear, setFYear] = useState<number | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReceiptBook | null>(null);
  const [closeOpen, setCloseOpen] = useState<ReceiptBook | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [departments, setDepartments] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [closeForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {};
      if (keyword) params.keyword = keyword;
      if (fType) params.receiptType = Number(fType);
      if (stab !== 'all') params.status = STATUS_TABS.findIndex((t) => t.v === stab);
      if (fYear) params.fiscalYear = fYear;
      const { data } = await apiClient.get<ReceiptBook[]>('/receipt-book', { params });
      setData(data || []);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [keyword, fType, stab, fYear]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const d = await systemApi.catalog.getDepartments();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDepartments((d as any)?.data || []);
      } catch { /* empty */ }
    })();
  }, []);

  const openAdd = () => {
    setEditing(null); form.resetFields();
    form.setFieldsValue({ fiscalYear: dayjs().year(), issueDate: dayjs(), status: 0, receiptType: 1, isActive: true });
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
      ...(editing ?? {}), ...v,
      issueDate: v.issueDate?.toISOString?.() ?? v.issueDate,
      registeredDate: v.registeredDate?.toISOString?.() ?? v.registeredDate,
    };
    try { await apiClient.post('/receipt-book', payload); tk(editing ? 'Đã cập nhật' : 'Đã thêm'); setModalOpen(false); load(); }
    catch { tw('Lưu thất bại'); }
  };

  const activate = async (row: ReceiptBook) => {
    try { await apiClient.post(`/receipt-book/${row.id}/activate`); tk('Đã kích hoạt'); load(); }
    catch { tw('Kích hoạt thất bại'); }
  };

  const doClose = async () => {
    if (!closeOpen) return;
    const v = await closeForm.validateFields();
    try {
      await apiClient.post(`/receipt-book/${closeOpen.id}/close`, v);
      tk('Đã đóng sổ'); setCloseOpen(null); closeForm.resetFields(); load();
    } catch { tw('Đóng sổ thất bại'); }
  };

  const remove = (row: ReceiptBook) => cf(`Xóa sổ ${row.bookCode}?`, async () => {
    try { await apiClient.delete(`/receipt-book/${row.id}`); tk('Đã xóa'); load(); }
    catch { tw('Xóa thất bại'); }
  }, { tone: 'crit', confirm: 'Xóa' });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.length };
    STATUS_TABS.forEach((s) => { c[s.v] = data.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [data]);

  const cols: ColumnDef<ReceiptBook>[] = [
    { key: 'code', label: 'Mã sổ', code: true, render: (r) => r.bookCode },
    { key: 'name', label: 'Tên sổ', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.bookName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{RECEIPT_TYPES.find((t) => Number(t.v) === r.receiptType)?.l || '—'}</div>
      </div>
    ) },
    { key: 'series', label: 'Ký hiệu', code: true, render: (r) => r.series || '—' },
    { key: 'year', label: 'Năm', mono: true, render: (r) => r.fiscalYear },
    { key: 'range', label: 'Dải số', mono: true, render: (r) => `${fmt(r.startNumber)}–${fmt(r.endNumber)}` },
    { key: 'used', label: 'Đã dùng', mono: true, render: (r) => {
      const total = r.endNumber - r.startNumber + 1;
      const pct = total > 0 ? Math.round((r.used / total) * 100) : 0;
      const tone = pct >= 90 ? 'var(--a-rd-text)' : pct >= 70 ? 'var(--a-or-text)' : undefined;
      return (
        <div>
          <div style={{ color: tone, fontWeight: 600 }}>{fmt(r.used)}/{fmt(total)}</div>
          <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, marginTop: 2 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: tone || 'var(--a-em-text)', borderRadius: 2 }} />
          </div>
        </div>
      );
    } },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng sổ', val: data.length, sub: 'tất cả' },
        { lbl: 'Đang dùng', val: counts.active || 0, sub: 'sẵn sàng', tone: 'ok' },
        { lbl: 'Đã đóng', val: counts.closed || 0, sub: 'năm cũ', tone: 'warn' },
        { lbl: 'Mất/Hủy', val: counts.lost || 0, sub: 'cần KT', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm mã / tên / series / VB…" />
        <Filter value={fType} onChange={setFType} options={RECEIPT_TYPES} placeholder="▾ Loại" />
        <InputNumber placeholder="Năm TC" value={fYear} onChange={(v) => setFYear(Number(v) || undefined)} size="small" style={{ width: 100 }} />
        <button className="ab-btn ghost" type="button" onClick={() => { setKeyword(''); setFType(''); setFYear(undefined); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={openAdd}>
          <Ico name="plus" size={12} /> Khai báo sổ mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<ReceiptBook>
        columns={cols} data={data} rowKey={(r) => r.id}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
            {r.status === 0 && <ActBtn ic="play" title="Kích hoạt" onClick={() => activate(r)} />}
            {r.status === 1 && <ActBtn ic="x" title="Đóng sổ" tone="warn" onClick={() => setCloseOpen(r)} />}
            <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => remove(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có sổ'}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={editing ? 'Sửa sổ biên lai' : 'Khai báo sổ mới'}
        onOk={submit}
        okText="Lưu"
        cancelText="Hủy"
        width={720}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item label="Mã sổ" name="bookCode" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label="Tên sổ" name="bookName" rules={[{ required: true }]} style={{ gridColumn: 'span 2' }}><Input /></Form.Item>
            <Form.Item label="Loại" name="receiptType" rules={[{ required: true }]}>
              <Select options={RECEIPT_TYPES.map((r) => ({ value: Number(r.v), label: r.l }))} />
            </Form.Item>
            <Form.Item label="Ký hiệu" name="series"><Input placeholder="1C22TAA…" /></Form.Item>
            <Form.Item label="Mẫu số" name="templateCode"><Input /></Form.Item>
            <Form.Item label="Số bắt đầu" name="startNumber" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Số kết thúc" name="endNumber" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Số hiện tại" name="currentNumber"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Năm TC" name="fiscalYear" rules={[{ required: true }]}><InputNumber min={2000} max={2100} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Ngày phát hành" name="issueDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
            <Form.Item label="Ngày khai TT" name="registeredDate"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
            <Form.Item label="Số VB khai báo" name="registrationNumber"><Input /></Form.Item>
            <Form.Item label="Khoa" name="departmentId" style={{ gridColumn: 'span 2' }}>
              <Select allowClear showSearch optionFilterProp="label"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                options={departments.map((d: any) => ({ value: d.id, label: d.departmentName }))} />
            </Form.Item>
            <Form.Item label="Ghi chú" name="notes" style={{ gridColumn: 'span 3' }}><Input.TextArea rows={2} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        open={!!closeOpen}
        onCancel={() => setCloseOpen(null)}
        title={`Đóng sổ ${closeOpen?.bookCode || ''}`}
        onOk={doClose}
        okText="Xác nhận đóng"
        cancelText="Hủy"
      >
        <Form form={closeForm} layout="vertical">
          <Form.Item label="Lý do đóng" name="reason" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input.TextArea rows={3} placeholder="VD: hết năm tài chính, hết dải số…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReceiptBookAdminV2;
