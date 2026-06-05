/**
 * G-44 Official Documents — quản lý công văn đến/đi (MVP).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, StatusTabs, DataTable, StatusBadge, ActBtn, Btn,
  tk, tw, cf, type ColumnDef, type StatusTab,
} from './_v2kit';

// ── Types ──────────────────────────────────────────────────────────────────

interface OfficialDocument {
  id: string;
  documentNumber: string;
  documentType: number;
  documentTypeName: string;
  documentDate: string;
  sender?: string;
  receiver?: string;
  summary: string;
  handler?: string;
  deadline?: string;
  isOverdue: boolean;
  status: number;
  statusName: string;
  attachmentPath?: string;
  createdAt: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

type SKey = 'new' | 'processing' | 'done' | 'archived';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'new',        l: 'Mới',        tone: 'info' },
  { v: 'processing', l: 'Đang XL',    tone: 'warn' },
  { v: 'done',       l: 'Hoàn thành', tone: 'ok' },
  { v: 'archived',   l: 'Lưu',        tone: 'info' },
];
const sKey = (n: number): SKey =>
  n === 0 ? 'new' : n === 1 ? 'processing' : n === 2 ? 'done' : 'archived';

const STATUS_TONE: Record<number, 'ok' | 'warn' | 'crit' | 'info'> = {
  0: 'info', 1: 'warn', 2: 'ok', 3: 'info',
};

// ── Component ───────────────────────────────────────────────────────────────

const OfficialDocumentsV2: React.FC = () => {
  const [rows, setRows] = useState<OfficialDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<OfficialDocument[]>('/admin-modules/official-documents');
      setRows(data || []);
    } catch { tw('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({ status: 0, documentType: 0, documentDate: dayjs() });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      await apiClient.post('/admin-modules/official-documents', {
        ...v,
        documentDate: v.documentDate?.toISOString?.() ?? v.documentDate,
        deadline: v.deadline?.toISOString?.() ?? v.deadline,
      });
      tk('Đã lưu'); setModalOpen(false); load();
    } catch { tw('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const del = (r: OfficialDocument) =>
    cf(`Xóa công văn ${r.documentNumber}?`, async () => {
      try { await apiClient.delete(`/admin-modules/official-documents/${r.id}`); tk('Đã xóa'); load(); }
      catch { tw('Xóa thất bại'); }
    }, { tone: 'crit', confirm: 'Xóa' });

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => rows.filter((r) => {
    if (stab !== 'all' && sKey(r.status) !== stab) return false;
    if (filterType && String(r.documentType) !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${r.documentNumber} ${r.summary} ${r.sender || ''} ${r.receiver || ''} ${r.handler || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, stab, filterType, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => { c[s.v] = rows.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [rows]);

  // ── Columns ──────────────────────────────────────────────────────────────

  const columns: ColumnDef<OfficialDocument>[] = [
    { key: 'num',     label: 'Số CV',        code: true, render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.documentNumber}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.documentTypeName}</div>
      </div>
    ) },
    { key: 'date',    label: 'Ngày',         mono: true, render: (r) => new Date(r.documentDate).toLocaleDateString('vi-VN') },
    { key: 'party',   label: 'Nơi gửi/nhận',             render: (r) => r.sender || r.receiver || '—' },
    { key: 'sum',     label: 'Trích yếu',               render: (r) => (
      <span style={{ fontSize: 12 }}>{r.summary}</span>
    ) },
    { key: 'handler', label: 'Người XL',                render: (r) => r.handler || '—' },
    { key: 'dead',    label: 'Hạn XL',       mono: true, render: (r) => (
      r.deadline
        ? <span style={{ color: r.isOverdue ? 'var(--a-rd-text)' : undefined, fontWeight: r.isOverdue ? 700 : undefined }}>
            {new Date(r.deadline).toLocaleDateString('vi-VN')}
            {r.isOverdue && ' !'}
          </span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>
    ) },
    { key: 'status',  label: 'Trạng thái',              render: (r) => (
      <StatusBadge tone={STATUS_TONE[r.status] || 'info'}>{r.statusName}</StatusBadge>
    ) },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng CV',     val: rows.length,                                     sub: 'tất cả' },
        { lbl: 'Quá hạn',     val: rows.filter((r) => r.isOverdue).length,          sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'Đang xử lý', val: rows.filter((r) => r.status === 1).length,        sub: 'in progress', tone: 'warn' },
        { lbl: 'CV đến',      val: rows.filter((r) => r.documentType === 0).length, sub: 'nhận được' },
      ]} />

      <div className="ab-tools" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '8px 0' }}>
        <input
          className="ab-search-input"
          placeholder="Tìm số CV, trích yếu, nơi gửi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', minWidth: 180, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4 }}
        />
        <Select
          style={{ width: 160 }}
          placeholder="Loại CV"
          allowClear
          value={filterType || undefined}
          onChange={(v) => setFilterType(v || '')}
          options={[
            { value: '0', label: 'Công văn đến' },
            { value: '1', label: 'Công văn đi' },
          ]}
        />
        <div style={{ flex: 1 }} />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openAdd}>Thêm công văn</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<OfficialDocument>
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        actions={(r) => (
          <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => del(r)} />
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có công văn nào'}
      />

      <Modal
        open={modalOpen}
        title="Thêm công văn"
        onOk={submit}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="documentNumber" label="Số công văn" rules={[{ required: true }]}>
            <Input placeholder="VD: 123/CV-SYT" />
          </Form.Item>
          <Form.Item name="documentType" label="Loại" rules={[{ required: true }]}>
            <Select options={[{ value: 0, label: 'Công văn đến' }, { value: 1, label: 'Công văn đi' }]} />
          </Form.Item>
          <Form.Item name="documentDate" label="Ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="sender" label="Nơi gửi (CV đến)">
            <Input placeholder="Tên cơ quan gửi" />
          </Form.Item>
          <Form.Item name="receiver" label="Nơi nhận (CV đi)">
            <Input placeholder="Tên cơ quan nhận" />
          </Form.Item>
          <Form.Item name="summary" label="Trích yếu" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Nội dung tóm tắt" />
          </Form.Item>
          <Form.Item name="handler" label="Người xử lý">
            <Input placeholder="Họ tên người phụ trách" />
          </Form.Item>
          <Form.Item name="deadline" label="Hạn xử lý">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={[
              { value: 0, label: 'Mới' },
              { value: 1, label: 'Đang xử lý' },
              { value: 2, label: 'Hoàn thành' },
              { value: 3, label: 'Lưu' },
            ]} />
          </Form.Item>
          <Form.Item name="attachmentPath" label="Đường dẫn file đính kèm">
            <Input placeholder="/uploads/cong-van/..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OfficialDocumentsV2;
